"""Day 7: day07/www の画面を gzip にして、ファームウェアに埋め込める形にする

ESP32 は gzip のまま送り、ブラウザに展開してもらう（Content-Encoding: gzip）。
ファイル名の / は _ にする（例: stitch/app.css → stitch_app.css.gz）。

実行: uv run day07/firmware/pack_www.py   （ビルドの前に毎回）
"""

import gzip
import sys
from pathlib import Path

HERE = Path(__file__).parent
WWW = HERE.parent / "www"
OUT = HERE / "main" / "www"


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for path in sorted(WWW.rglob("*")):
        if not path.is_file():
            continue
        name = path.relative_to(WWW).as_posix().replace("/", "_") + ".gz"
        # mtime=0 にして、中身が同じなら同じバイト列になるようにする
        data = gzip.compress(path.read_bytes(), compresslevel=9, mtime=0)
        (OUT / name).write_bytes(data)
        total += len(data)
        print(f"{name:28} {len(data):>7,} bytes")
    print(f"合計 {total:,} bytes")


if __name__ == "__main__":
    main()
