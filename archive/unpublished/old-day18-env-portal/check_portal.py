"""Day 18: Antigravity が Stitch の画面から組み込んだ管理画面を、Day 7 でつまずいた点で確かめる

作業フォルダ（www/ と firmware/ と mock_server.py があるもの）を渡すと、次を表示する。
- 外部から読み込むもの（CDN・フォント・画像・@import）。1 つでもあればオフラインの ESP32 では表示が欠ける
- www/ の各ファイルを gzip にした大きさと、firmware に埋め込まれているか（CMakeLists.txt と main.c）
- 呼んでいる API（/api/status・/api/scan・/api/wifi・/api/sleep）
- パスワード欄に値が入っていないか（Day 7 の Stitch 版は例のパスワードが入っていた）
- mock_server.py で配信し、Chrome（ヘッドレス）で JavaScript を動かした後の表示
  - 電池が何年もつかの表示（正しくは 3000 mAh ÷ 0.007 mA ≒ 48.9 年。Day 7 の Stitch 版は計算が古く「73 日」に戻った）
  - API の値（mock の現在値は 温度 24.0・湿度 54.0・CO2 650）が出ているか
  - 画面の画像（results/<名前>_<ページ>.png、スマートフォンの幅）

実行: uv run day18/check_portal.py E:/tmp/env_portal [名前]
"""

import gzip
import json
import re
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).parent
CHROME = Path("C:/Program Files/Google/Chrome/Application/chrome.exe")
PORT = 8080

EXTERNAL = re.compile(r"""(?:src|href)\s*=\s*["'](https?://[^"']+)|url\(\s*["']?(https?://[^)"']+)|@import\s+["'](https?://[^"']+)""")
API = re.compile(r"/api/(status|scan|wifi|sleep)")
PASSWORD = re.compile(r"<input[^>]*type=[\"']password[\"'][^>]*>", re.I)
YEARS = re.compile(r"(\d+(?:\.\d+)?)\s*年")
DAYS = re.compile(r"(\d[\d,]*)\s*日")
MOCK_NOW = {"温度": "24", "湿度": "54", "CO2": "650"}


def static_checks(work: Path, report: dict):
    www = work / "www"
    files = [p for p in sorted(www.rglob("*")) if p.is_file()]
    cmake = (work / "firmware/main/CMakeLists.txt").read_text(encoding="utf-8")
    main_c = (work / "firmware/main/main.c").read_text(encoding="utf-8")
    report["files"] = []
    total = 0
    for p in files:
        rel = p.relative_to(www).as_posix()
        gz_name = rel.replace("/", "_") + ".gz"
        symbol = re.sub(r"[^A-Za-z0-9]", "_", gz_name)
        size = len(gzip.compress(p.read_bytes(), compresslevel=9, mtime=0))
        total += size
        entry = {"file": rel, "bytes": p.stat().st_size, "gzip": size,
                 "cmake": f"www/{gz_name}" in cmake, "main_c": f"{symbol}_start" in main_c}
        if p.suffix in (".html", ".css", ".js"):
            text = p.read_text(encoding="utf-8", errors="replace")
            entry["external"] = sorted({next(g for g in m if g) for m in EXTERNAL.findall(text)})
            entry["api"] = sorted(set(API.findall(text)))
            entry["password_inputs"] = PASSWORD.findall(text)
        report["files"].append(entry)
    report["gzip_total"] = total


def render(work: Path, report: dict, name: str):
    """mock_server.py で配信し、Chrome で JavaScript を動かした後の DOM と画面の画像を取る"""
    server = subprocess.Popen([sys.executable, "mock_server.py", "www"], cwd=work,
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.5)
    try:
        report["pages"] = []
        for p in sorted((work / "www").rglob("*.html")):
            rel = p.relative_to(work / "www").as_posix()
            url = f"http://127.0.0.1:{PORT}/{'' if rel == 'index.html' else rel}"
            # 注意: ヘッドレスの Chrome は幅 500 未満を指定してもページを幅 500 で組む。
            # 画像は右が切れて見えるので、スマートフォンの幅の見た目はここでは判断しない
            common = [str(CHROME), "--headless=new", "--disable-gpu", "--no-first-run",
                      "--virtual-time-budget=6000", "--window-size=412,1400"]
            dom = subprocess.run(common + ["--dump-dom", url], capture_output=True, text=True,
                                 encoding="utf-8", errors="replace", timeout=60).stdout
            shot = HERE / "results" / f"{name}_{Path(rel).stem}.png"
            subprocess.run(common + [f"--screenshot={shot}", url], capture_output=True, timeout=60)
            text = re.sub(r"<script.*?</script>|<style.*?</style>", " ", dom, flags=re.S)
            text = re.sub(r"<[^>]+>", " ", text)
            text = re.sub(r"\s+", " ", text)
            report["pages"].append({
                "page": rel,
                "years": YEARS.findall(text),
                "days": DAYS.findall(text),
                # 2024 などの一部に当たらないよう、前後が数字でないものだけ数える
                "mock_values_shown": {k: bool(re.search(rf"(?<![\d.]){v}(?:\.0)?(?![\d.])", text))
                                      for k, v in MOCK_NOW.items()},
                "screenshot": shot.name,
                "text": text[:4000],
            })
    finally:
        server.terminate()


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    work = Path(sys.argv[1])
    name = sys.argv[2] if len(sys.argv) > 2 else work.name
    (HERE / "results").mkdir(exist_ok=True)
    report = {"workspace": name}
    static_checks(work, report)
    render(work, report, name)
    out = HERE / "results" / f"check_{name}.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"== {name}  gzip 合計 {report['gzip_total']:,} bytes")
    for f in report["files"]:
        print(f"  {f['file']:24} {f['bytes']:>7,} B  gzip {f['gzip']:>6,} B  "
              f"CMake {'○' if f['cmake'] else '×'}  main.c {'○' if f['main_c'] else '×'}")
        if f.get("external"):
            print(f"    外部: {', '.join(u[:70] for u in f['external'])}")
        if "api" in f:
            print(f"    API: {', '.join(f['api']) or 'なし'}  パスワード欄: {f['password_inputs']}")
    for pg in report["pages"]:
        print(f"  [{pg['page']}] 年: {pg['years']}  日: {pg['days'][:6]}  mock の値: {pg['mock_values_shown']}")
    print(f"saved {out.name}")


if __name__ == "__main__":
    main()
