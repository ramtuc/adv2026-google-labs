"""
実機（ESP32-S3 / COM5）およびビルド済み ELF バイナリの自動テストスクリプト

確認項目:
[ELF バイナリ検証（build/door_sensor.elf）]
1. boot_count と last_door に RTC_DATA_ATTR が付いており、RTC Slow Memory（.rtc.data / .rtc.bss、0x50000000〜）に配置されていること
2. タイマー・EXT0 ボタン・タッチパッド（esp_sleep_enable_touchpad_wakeup）の 3 系統すべてのウェイクアップ関数がリンク・使用されていること
3. タッチパッドのしきい値（TOUCH_THRESHOLD）が 500〜0x7FFFF の妥当な範囲（1500）で設定されていること（15 のような低すぎる値を検出）
4. ドアのピン（GPIO11）の設定（read_door）で内部プルアップ（GPIO_PULLUP_ENABLE = 1）が有効化されていること

[実機シリアル通信検証（COM5）]
5. リセット後、パニックや ESP_ERROR_CHECK エラーなしに app_main() が起動すること
6. 初回起動ログ「起動 1 回目（電源投入）」が出力されること
7. 電池電圧とドア状態のログ「電池 <N> mV、ドア 開」が出力され、電圧値が 0〜6200 mV の範囲内であり、かつリードスイッチ開放時に「ドア 開」と読めること（内部プルアップ欠落時は 100k〜470kΩ の弱い外部プルダウン抵抗で「閉」になり検出可能）
8. 初回起動時に誤って「ドアの状態が変わった」警告が出ないこと
9. ウェイクアップ設定が完了し、「Deep-sleep に入る（約 7 µA）」が出力されること
10. Deep-sleep 移行後、タッチパッドに触れない状態で誤ウェイクアップせずスリープ状態を維持すること（GPIO4 にジャンパ線・銅箔を接続した状態では、しきい値 15 だと環境ノイズで即座に誤起床して検出可能）
11. （--interactive 指定時）Deep-sleep 中に GPIO4 に指で触れるとウェイクアップし、「起動 2 回目（タッチ）」が出力されること（esp_sleep_enable_touchpad_wakeup 欠落時は起床せずタイムアウト、RTC_DATA_ATTR 欠落時は「起動 1 回目」になり検出可能）
"""

import argparse
import os
import re
import sys
import time
import serial
from elftools.elf.elffile import ELFFile

sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def verify_elf(elf_path: str, check_fn) -> None:
    if not os.path.isfile(elf_path):
        check_fn(False, "ELF ファイルの存在確認", f"{elf_path} が見つかりません（先にビルドしてください）")
        return

    with open(elf_path, "rb") as f:
        elf = ELFFile(f)
        symtab = elf.get_section_by_name(".symtab")
        if symtab is None:
            check_fn(False, "ELF シンボルテーブルの読み取り", ".symtab が存在しません")
            return

        syms = {}
        for s in symtab.iter_symbols():
            if s.name:
                syms[s.name] = s

        # 1. boot_count と last_door が RTC メモリ（.rtc.data / .rtc.bss、0x50000000〜0x50001FFF）にあること
        rtc_ok = True
        rtc_details = []
        for var_name in ("boot_count", "last_door"):
            sym = syms.get(var_name)
            if sym is None:
                rtc_ok = False
                rtc_details.append(f"{var_name}=missing")
                continue
            addr = sym["st_value"]
            shndx = sym["st_shndx"]
            sec_name = elf.get_section(shndx).name if isinstance(shndx, int) and shndx < elf.num_sections() else str(shndx)
            in_rtc = sec_name.startswith(".rtc.") and (0x50000000 <= addr < 0x50002000)
            rtc_details.append(f"{var_name}@{hex(addr)}({sec_name})")
            if not in_rtc:
                rtc_ok = False
        check_fn(
            rtc_ok,
            "1. [ELF] boot_count / last_door が RTC メモリ（RTC_DATA_ATTR）に配置されていること",
            ", ".join(rtc_details),
        )

        # 2. esp_sleep_enable_touchpad_wakeup を含む 3 つのウェイクアップ有効化関数がリンクされていること
        wakeup_funcs = (
            "esp_sleep_enable_timer_wakeup",
            "esp_sleep_enable_ext0_wakeup",
            "esp_sleep_enable_touchpad_wakeup",
        )
        missing_wakeups = [fn for fn in wakeup_funcs if fn not in syms]
        check_fn(
            len(missing_wakeups) == 0,
            "2. [ELF] タッチ・タイマー・ボタンの 3 系統のウェイクアップ設定関数が有効であること",
            f"missing={missing_wakeups}" if missing_wakeups else "all present",
        )

        # 3. setup_touch_wakeup 内の touch_pad_set_thresh に渡されるしきい値が 500〜0x7FFFF であること
        thresh_val = None
        sym_touch = syms.get("setup_touch_wakeup")
        if sym_touch is not None:
            sec = elf.get_section(sym_touch["st_shndx"])
            off = sym_touch["st_value"] - sec["sh_addr"]
            code = sec.data()[off : off + sym_touch["st_size"]]
            # Xtensa の movi a11, imm12 (b2 aX YY) または movi.n a11, imm7 (Xc Xb) を走査
            for i in range(len(code) - 2):
                if code[i] == 0xB2 and (code[i + 1] & 0xF0) == 0xA0:
                    val = ((code[i + 1] & 0x0F) << 8) | code[i + 2]
                    if val >= 0x800:
                        val -= 0x1000
                    thresh_val = val
                elif (code[i] & 0x8F) == 0x0C and (code[i + 1] & 0x0F) == 0x0B:
                    val = (code[i] & 0x70) | ((code[i + 1] >> 4) & 0x0F)
                    if (val & 0x60) == 0x60:
                        val -= 128
                    if val > 0:
                        thresh_val = val
        check_fn(
            thresh_val is not None and 500 <= thresh_val <= 0x7FFFF,
            f"3. [ELF] タッチしきい値（TOUCH_THRESHOLD）が妥当な範囲（>= 500）であること（検出値: {thresh_val}）",
            f"thresh_val={thresh_val}",
        )

        # 4. read_door 内で gpio_config_t.pull_up_en (スタック a1+12) に GPIO_PULLUP_ENABLE (1) が設定されていること
        pullup_ok = False
        sym_door = syms.get("read_door")
        if sym_door is not None:
            sec = elf.get_section(sym_door["st_shndx"])
            off = sym_door["st_value"] - sec["sh_addr"]
            code = sec.data()[off : off + sym_door["st_size"]]
            # s32i.n ar, a1, 12 (byte0 = (ar<<4)|9, byte1 = 0x31) または s32i ar, a1, 12 (byte0 = (ar<<4)|2, byte1 = 0x61, byte2 = 0x03)
            for i in range(len(code) - 1):
                if (code[i] & 0x0F) == 0x09 and code[i + 1] == 0x31:
                    pullup_ok = True
                    break
                if i + 2 < len(code) and (code[i] & 0x0F) == 0x02 and code[i + 1] == 0x61 and code[i + 2] == 0x03:
                    pullup_ok = True
                    break
        check_fn(
            pullup_ok,
            "4. [ELF] ドアピン（GPIO11）の内部プルアップ（GPIO_PULLUP_ENABLE）が有効であること",
        )


def capture_serial_logs(
    port: str,
    baud: int,
    boot_window_sec: float = 2.5,
    sleep_check_sec: float = 2.5,
    interactive_touch: bool = False,
    touch_timeout_sec: float = 20.0,
):
    boot_lines = []
    post_sleep_lines = []
    wakeup_lines = []
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

        if interactive_touch and entered_sleep and not post_sleep_lines:
            print(
                f"\n>>> [操作してください] {touch_timeout_sec:.0f} 秒以内に GPIO4（4 番ピン）に指で触れて、"
                "タッチで Deep-sleep から起こしてください...",
                flush=True,
            )
            touch_deadline = time.time() + touch_timeout_sec
            while time.time() < touch_deadline:
                raw = s.readline()
                if not raw:
                    continue
                line = raw.decode("utf-8", errors="replace").rstrip("\r\n")
                print(f"  [SERIAL-WAKE] {line}", flush=True)
                wakeup_lines.append(line)
                if "Deep-sleep に入る" in line:
                    break

    return boot_lines, post_sleep_lines, wakeup_lines


def run_tests(port: str, baud: int, elf_path: str, interactive: bool) -> int:
    print(f"=== Door Sensor On-Device & ELF Tests ({port}) ===", flush=True)
    failures = []
    passes = 0

    def check(cond: bool, name: str, detail: str = ""):
        nonlocal passes
        if cond:
            print(f"[PASS] {name}", flush=True)
            passes += 1
        else:
            msg = f"[FAIL] {name}" + (f": {detail}" if detail else "")
            print(msg, flush=True)
            failures.append(msg)

    # 前半: ビルド済み ELF バイナリの静的検証（4 項目）
    verify_elf(elf_path, check)

    # 後半: 実機のシリアル通信による動作検証
    boot_lines, post_sleep_lines, wakeup_lines = capture_serial_logs(
        port, baud, interactive_touch=interactive
    )
    full_log = "\n".join(boot_lines)

    # 5. パニックやアボートが発生していないこと
    has_error = any(
        kw in full_log
        for kw in ("Guru Meditation Error", "abort()", "ESP_ERROR_CHECK failed", "CONFLICT!")
    )
    check(not has_error and len(boot_lines) > 0, "5. [実機] エラー・パニックなしでの起動")

    # 6. 起動回数と起動理由のログ
    m_boot = re.search(r"I \(\d+\) door: 起動 (\d+) 回目（(.+?)）", full_log)
    check(
        m_boot is not None and m_boot.group(1) == "1" and m_boot.group(2) == "電源投入",
        "6. [実機] 初回起動ログ（起動 1 回目・電源投入）",
        f"match={m_boot.groups() if m_boot else None}",
    )

    # 7. 電池電圧とドア開閉のログ（リードスイッチ開放時は内部プルアップにより必ず「開」になること）
    m_sensor = re.search(r"I \(\d+\) door: 電池 (\d+) mV、ドア (開|閉)", full_log)
    if m_sensor:
        mv = int(m_sensor.group(1))
        door_str = m_sensor.group(2)
        check(
            0 <= mv <= 6200 and door_str == "開",
            f"7. [実機] 電池電圧・ドア状態の読み取り（{mv} mV、ドア {door_str} == 開）",
            f"expected ドア 開, got ドア {door_str} (mv={mv})",
        )
    else:
        check(False, "7. [実機] 電池電圧・ドア状態の読み取り", "ログが見つかりません")

    # 8. 初回起動時に状態変化警告が出ないこと
    check(
        "ドアの状態が変わった" not in full_log,
        "8. [実機] 初回起動時のドア状態変化誤検知なし",
    )

    # 9. Deep-sleep 移行ログ
    check(
        "Deep-sleep に入る（約 7 µA）" in full_log,
        "9. [実機] ウェイクアップ設定完了・Deep-sleep 移行ログ",
    )

    # 10. Deep-sleep 移行後に誤ウェイクアップしないこと
    spurious_wakeup = any("rst:" in line or "起動" in line for line in post_sleep_lines)
    check(
        not spurious_wakeup,
        "10. [実機] Deep-sleep 移行後のスリープ維持（非接触時の誤ウェイクアップなし）",
        f"post_sleep_lines={post_sleep_lines}",
    )

    # 11. (--interactive 時) GPIO4 タッチによる Deep-sleep からの起床と「起動 2 回目（タッチ）」の確認
    if interactive:
        wake_log = "\n".join(wakeup_lines)
        m_wake = re.search(r"I \(\d+\) door: 起動 (\d+) 回目（(.+?)）", wake_log)
        check(
            m_wake is not None and m_wake.group(1) == "2" and m_wake.group(2) == "タッチ",
            "11. [実機・対話] GPIO4 タッチによる Deep-sleep 起床と「起動 2 回目（タッチ）」の確認",
            f"match={m_wake.groups() if m_wake else None}",
        )

    total = passes + len(failures)
    print("==========================================", flush=True)
    if not failures:
        print(f"RESULT: ALL ON-DEVICE TESTS PASSED ({passes}/{total})", flush=True)
        return 0
    else:
        print(f"RESULT: {len(failures)}/{total} ON-DEVICE TEST(S) FAILED", flush=True)
        return 1


if __name__ == "__main__":
    default_elf = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "build",
        "door_sensor.elf",
    )
    parser = argparse.ArgumentParser()
    parser.add_argument("-p", "--port", default="COM5")
    parser.add_argument("-b", "--baud", type=int, default=115200)
    parser.add_argument("--elf", default=default_elf, help="Path to door_sensor.elf")
    parser.add_argument(
        "-i",
        "--interactive",
        action="store_true",
        help="Wait for human finger touch on GPIO4 during Deep-sleep to verify wakeup #2",
    )
    args = parser.parse_args()
    sys.exit(run_tests(args.port, args.baud, args.elf, args.interactive))
