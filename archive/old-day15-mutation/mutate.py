"""Day 15: Antigravity が書いたテストに、わざとバグを入れたコード（ミューテーション）を当てる

day14/door_sensor を作業用の場所にコピーし、ミューテーションを 1 つずつ入れて、
- host   : パソコン上のテスト（test/run_host_tests.ps1、MSVC）
- device : 実機のテスト（ビルド → COM5 に書き込み → test/test_device.py）
を走らせ、テストが失敗したか（＝バグを見つけたか）を記録する。

実行: uv run day15/mutate.py host
      uv run day15/mutate.py device --port COM5
      uv run day15/mutate.py host --all --tag round2   （2 回目のテストに 13 個すべてを当てる）
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE.parent / "day14" / "door_sensor"
RESULTS = HERE / "results"

# (名前, ファイル, 置き換える前, 置き換えた後, 説明)
MUTANTS = {
    "host": [
        ("H1", "main/door_sensor.c", 'case DOOR_WAKEUP_EXT0:     return "ボタン";\n    case DOOR_WAKEUP_TOUCHPAD: return "タッチ";',
         'case DOOR_WAKEUP_EXT0:     return "タッチ";\n    case DOOR_WAKEUP_TOUCHPAD: return "ボタン";', "起きた理由の「ボタン」と「タッチ」を入れ替える"),
        ("H2", "main/door_sensor.c", "raw * 3100 / 4095 * 2", "raw * 3100 / 4095", "電池の換算で、分圧の 2 倍を忘れる"),
        ("H3", "main/door_sensor.c", "raw * 3100 / 4095 * 2", "raw * 3300 / 4095 * 2", "電池の換算の満量を 3100 mV から 3300 mV に変える"),
        ("H4", "main/door_sensor.c", 'return door ? "開" : "閉";', 'return door ? "閉" : "開";', "ドアの開と閉を逆に表示する"),
        ("H5", "main/door_sensor.c", "(*last_door >= 0 && normalized != *last_door)", "(normalized != *last_door)", "初回の起動でも「状態が変わった」と言う"),
        ("H6", "main/door_sensor.c", "    *last_door = normalized;\n", "", "前回の状態を保存し忘れる"),
        ("H7", "main/door_sensor.h", "(10ULL * 60 * 1000 * 1000)  // 10 分", "(1ULL * 60 * 1000 * 1000)  // 10 分", "起きる間隔を 10 分から 1 分にする"),
    ],
    "device": [
        ("D1", "main/main.c", "RTC_DATA_ATTR static uint32_t boot_count = 0;", "static uint32_t boot_count = 0;", "起きた回数を RTC メモリに置かない（毎回 1 回目になる）"),
        ("D2", "main/main.c", "esp_sleep_enable_ext0_wakeup(BUTTON_GPIO, 0)", "esp_sleep_enable_ext0_wakeup(BUTTON_GPIO, 1)", "ボタンで起きるレベルを LOW から HIGH に逆にする"),
        ("D3", "main/main.c", "    ESP_ERROR_CHECK(esp_sleep_enable_touchpad_wakeup());\n", "", "タッチで起きる設定を消す"),
        ("D4", "main/door_sensor.h", "#define TOUCH_THRESHOLD    1500", "#define TOUCH_THRESHOLD    15  ", "タッチのしきい値を 1500 から 15 に下げる（敏感すぎる）"),
        ("D5", "main/main.c", "        .pull_up_en = GPIO_PULLUP_ENABLE,\n", "", "ドアのピンの内部プルアップを外す"),
        ("D6", "main/main.c", "    ESP_ERROR_CHECK(rtc_gpio_pullup_en(BUTTON_GPIO));\n", "", "ボタンのピンのプルアップを外す（寝ている間ピンが浮く）"),
    ],
    # Antigravity に見せていない新しいバグ（2 回目のテストが、教わっていない形も捕まえるかを見る）
    "new": [
        ("N1", "main/main.c", "RTC_DATA_ATTR static int last_door = -1;", "static int last_door = -1;", "ドアの前回の状態を RTC メモリに置かない（D1 の別の変数版）"),
        ("N2", "main/main.c", "    ESP_ERROR_CHECK(esp_sleep_enable_timer_wakeup(WAKE_INTERVAL_US));\n", "", "タイマーで起きる設定を消す"),
        ("N3", "main/main.c", "    ESP_ERROR_CHECK(touch_pad_fsm_start());\n", "", "タッチの計測を始める処理を消す"),
        ("N4", "main/main.c", "    ESP_ERROR_CHECK(touch_pad_intr_enable(TOUCH_PAD_INTR_MASK_ACTIVE));\n", "", "タッチの割り込みを有効にする処理を消す"),
        ("N5", "main/main.c", "    ESP_ERROR_CHECK(rtc_gpio_pulldown_dis(BUTTON_GPIO));\n", "", "ボタンのピンのプルダウンを切る処理を消す"),
        ("N6", "main/main.c", "    vTaskDelay(pdMS_TO_TICKS(100));  // ログを出し切る\n", "", "寝る前にログを出し切る待ちを消す"),
    ],
}

IDF = ["powershell", "-NoProfile", "-Command"]


def run(cmd, cwd=None, timeout=900):
    # Git Bash から起動すると MSYSTEM が引き継がれ、idf.py が「MSys/Mingw は非対応」で止まるので外す
    env = {k: v for k, v in os.environ.items() if k != "MSYSTEM"}
    p = subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True, encoding="utf-8", errors="replace",
                       timeout=timeout)
    return p.returncode, p.stdout + p.stderr


def apply(work: Path, file: str, before: str, after: str):
    path = work / file
    text = path.read_text(encoding="utf-8")
    assert before in text, f"{file} に置き換える文字列がない: {before[:40]}"
    path.write_text(text.replace(before, after, 1), encoding="utf-8")


def host_test(work: Path):
    return run(IDF + [f"& '{work / 'test' / 'run_host_tests.ps1'}'"])


def device_test(work: Path, port: str):
    # ESP-IDF の環境を有効にしてビルドし、esptool で書き込み、実機のテストを走らせる
    script = (r". C:\Espressif\tools\Microsoft.v5.5.3.PowerShell_profile.ps1 | Out-Null; "
              f"$b = idf.py -C '{work}' build 2>&1; if ($LASTEXITCODE -ne 0) {{ $b | Select-Object -Last 15; 'BUILD FAILED'; exit 2 }}; "
              f"Set-Location '{work / 'build'}'; python -u -m esptool --chip esp32s3 -p {port} -b 460800 write_flash '@flash_args'; "
              f"if ($LASTEXITCODE -ne 0) {{ 'FLASH FAILED'; exit 3 }}; "
              f"python -u '{work / 'test' / 'test_device.py'}' --port {port}")
    return run(IDF + [script], timeout=1200)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("kind", choices=["host", "device"])
    parser.add_argument("--port", default="COM5")
    parser.add_argument("--only", help="D1,D2 のように一部だけ")
    parser.add_argument("--all", action="store_true", help="H と D の 13 個すべてを当てる")
    parser.add_argument("--new", action="store_true", help="Antigravity に見せていない新しい 6 個（N1〜N6）を当てる")
    parser.add_argument("--tag", default="", help="結果のファイル名に付ける（round2 など）")
    args = parser.parse_args()
    RESULTS.mkdir(exist_ok=True)
    results = []
    with tempfile.TemporaryDirectory() as d:
        base = Path(d) / "door_sensor"
        shutil.copytree(SRC, base, ignore=shutil.ignore_patterns("build", "sdkconfig", "sdkconfig.old"))
        # 元のままでテストが通ることを先に確かめる
        chosen = MUTANTS["host"] + MUTANTS["device"] if args.all else MUTANTS[args.kind]
        if args.new:
            chosen = MUTANTS["new"]
        mutants = [("ORIG", None, None, None, "元のまま")] + chosen
        if args.only:
            mutants = [m for m in mutants if m[0] == "ORIG" or m[0] in args.only.split(",")]
        for name, file, before, after, desc in mutants:
            work = Path(d) / name
            if work.exists():
                shutil.rmtree(work)
            shutil.copytree(base, work)
            if file:
                apply(work, file, before, after)
            code, out = host_test(work) if args.kind == "host" else device_test(work, args.port)
            caught = code != 0
            if name == "ORIG":
                verdict = "通る（基準）" if not caught else "元のままで失敗"
            else:
                verdict = "見つけた" if caught else "見逃した"
            tail = [l for l in out.splitlines() if "FAIL" in l or "RESULT" in l or "FAILED" in l][:6]
            print(f"{name} {verdict:8} {desc}")
            for l in tail:
                print(f"    {l}")
            results.append({"name": name, "kind": args.kind, "desc": desc, "exit": code, "caught": caught,
                            "verdict": verdict, "evidence": tail})
    tag = f"_{args.tag}" if args.tag else ""
    (RESULTS / f"mutants_{args.kind}{tag}.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
