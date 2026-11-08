"""
実機（ESP32-S3 / COM5）で動かす自動テストスクリプト

確認項目:
1. リセット後、パニックや ESP_ERROR_CHECK エラーなしに app_main() が起動すること
2. 初回起動ログ「起動 1 回目（電源投入）」が出力されること
3. 電池電圧とドア状態のログ「電池 <N> mV、ドア <開|閉>」が出力され、電圧値が妥当な範囲（0〜6200 mV）にあること
4. 初回起動時に誤って「ドアの状態が変わった」警告が出ないこと
5. タイマー・ボタン（EXT0）・タッチ（Touch V2）のウェイクアップ設定が成功し、「Deep-sleep に入る（約 7 µA）」が出力されること
6. Deep-sleep 移行後に誤ウェイクアップせずスリープ状態を維持すること
"""

import argparse
import re
import sys
import time
import serial

sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def capture_boot_log(port: str, baud: int, boot_window_sec: float = 2.5, sleep_check_sec: float = 2.0):
    boot_lines = []
    post_sleep_lines = []
    entered_sleep = False
    sleep_enter_time = None

    with serial.Serial(port, baud, timeout=0.1) as s:
        s.reset_input_buffer()
        # RTS パルスでリセット（DTR=False で通常起動モード）
        s.dtr = False
        s.rts = True
        time.sleep(0.1)
        s.rts = False

        deadline = time.time() + boot_window_sec + sleep_check_sec
        while time.time() < deadline:
            raw = s.readline()
            if not raw:
                if entered_sleep and (time.time() - sleep_enter_time) >= sleep_check_sec:
                    break
                continue
            line = raw.decode("utf-8", errors="replace").rstrip("\r\n")
            print(f"  [SERIAL] {line}", flush=True)
            if not entered_sleep:
                boot_lines.append(line)
                if "Deep-sleep に入る" in line:
                    entered_sleep = True
                    sleep_enter_time = time.time()
            else:
                if line.strip():
                    post_sleep_lines.append(line)

    return boot_lines, post_sleep_lines


def run_tests(port: str, baud: int) -> int:
    print(f"=== Door Sensor On-Device Tests ({port}) ===", flush=True)
    boot_lines, post_sleep_lines = capture_boot_log(port, baud)
    full_log = "\n".join(boot_lines)

    failures = []

    def check(cond: bool, name: str, detail: str = ""):
        if cond:
            print(f"[PASS] {name}", flush=True)
        else:
            msg = f"[FAIL] {name}" + (f": {detail}" if detail else "")
            print(msg, flush=True)
            failures.append(msg)

    # 1. パニックやアボートが発生していないこと
    has_error = any(
        kw in full_log
        for kw in ("Guru Meditation Error", "abort()", "ESP_ERROR_CHECK failed", "CONFLICT!")
    )
    check(not has_error and len(boot_lines) > 0, "1. エラー・パニックなしでの起動")

    # 2. 起動回数と起動理由のログ
    m_boot = re.search(r"I \(\d+\) door: 起動 (\d+) 回目（(.+?)）", full_log)
    check(
        m_boot is not None and m_boot.group(1) == "1" and m_boot.group(2) == "電源投入",
        "2. 初回起動ログ（起動 1 回目・電源投入）",
        f"match={m_boot.groups() if m_boot else None}",
    )

    # 3. 電池電圧とドア開閉のログ
    m_sensor = re.search(r"I \(\d+\) door: 電池 (\d+) mV、ドア (開|閉)", full_log)
    if m_sensor:
        mv = int(m_sensor.group(1))
        door_str = m_sensor.group(2)
        check(
            0 <= mv <= 6200 and door_str in ("開", "閉"),
            f"3. 電池電圧・ドア状態の読み取り（{mv} mV、ドア {door_str}）",
        )
    else:
        check(False, "3. 電池電圧・ドア状態の読み取り", "ログが見つかりません")

    # 4. 初回起動時に状態変化警告が出ないこと
    check(
        "ドアの状態が変わった" not in full_log,
        "4. 初回起動時のドア状態変化誤検知なし",
    )

    # 5. Deep-sleep 移行ログ
    check(
        "Deep-sleep に入る（約 7 µA）" in full_log,
        "5. ウェイクアップ設定完了・Deep-sleep 移行ログ",
    )

    # 6. Deep-sleep 移行後に誤ウェイクアップしないこと
    spurious_wakeup = any("rst:" in line or "起動" in line for line in post_sleep_lines)
    check(
        not spurious_wakeup,
        "6. Deep-sleep 移行後のスリープ維持（誤ウェイクアップなし）",
        f"post_sleep_lines={post_sleep_lines}",
    )

    print("==========================================", flush=True)
    if not failures:
        print("RESULT: ALL ON-DEVICE TESTS PASSED (6/6)", flush=True)
        return 0
    else:
        print(f"RESULT: {len(failures)} ON-DEVICE TEST(S) FAILED", flush=True)
        return 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("-p", "--port", default="COM5")
    parser.add_argument("-b", "--baud", type=int, default=115200)
    args = parser.parse_args()
    sys.exit(run_tests(args.port, args.baud))
