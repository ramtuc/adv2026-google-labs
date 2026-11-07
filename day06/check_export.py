"""Day 6: Stitch が書き出した HTML を、ESP32 から配信できるかの観点で調べる

書き出した .zip を展開したフォルダを渡すと、HTML ごとに
- ファイルの大きさ
- 外部から読み込んでいるもの（CDN・フォント・画像）
- onclick で呼ぶ関数と、ESP32 に何かを送る処理（fetch / XMLHttpRequest / WebSocket）があるか
を表示する。ESP32 がアクセスポイントのときはインターネットにつながらないので、
外部から読み込むものはすべて表示されなくなる。

実行: uv run day06/check_export.py day06/stitch_export
"""

import re
import sys
from pathlib import Path

EXTERNAL = re.compile(r'(?:src|href)="(https?://[^"]+)"')
ONCLICK = re.compile(r'onclick="([A-Za-z_]\w*)\(')
NETWORK = re.compile(r"\bfetch\(|XMLHttpRequest|new WebSocket|EventSource")


def check(html_path: Path):
    text = html_path.read_text(encoding="utf-8")
    external = sorted(set(EXTERNAL.findall(text)))
    handlers = sorted(set(ONCLICK.findall(text)))
    print(f"== {html_path}  ({html_path.stat().st_size:,} bytes)")
    print("  外部から読み込むもの:")
    for url in external:
        # 長い画像の URL は途中で切る
        print(f"    {url[:90]}{'...' if len(url) > 90 else ''}")
    print(f"  onclick の関数: {', '.join(handlers) or 'なし'}")
    print(f"  ESP32 に送る処理（fetch など）: {len(NETWORK.findall(text))} 件")


def main():
    # Windows のコンソール（cp932）でも表示できるように UTF-8 にする
    sys.stdout.reconfigure(encoding="utf-8")
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "day06/stitch_export")
    for html_path in sorted(root.rglob("*.html")):
        check(html_path)


if __name__ == "__main__":
    main()
