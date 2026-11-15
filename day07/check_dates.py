"""Day 7: Antigravity が作った植物アプリを、日付を変えて開き直し、表示が変わるかを確かめる。

先に別の端末で `uv run python -m http.server -d www 8000` を起動しておく。
実行: uv run --with playwright python check_dates.py [保存先のサブフォルダ名]
（インストール済みの Chrome を使うので、ブラウザのダウンロードはしない）
"""
import datetime as dt
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

OUT = Path(__file__).parent / "results" / (sys.argv[1] if len(sys.argv) > 1 else "")
OUT.mkdir(exist_ok=True)

with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome")
    ctx = b.new_context(viewport={"width": 430, "height": 932}, device_scale_factor=2)
    page = ctx.new_page()
    # 同じ localStorage のまま、時計だけ 11/14 → 11/15 → 11/17 と進めて開き直す
    for day in [14, 15, 17]:
        page.clock.set_fixed_time(dt.datetime(2026, 11, day, 9, 0))
        page.goto("http://127.0.0.1:8000/")
        page.wait_for_timeout(800)
        page.screenshot(path=OUT / f"app_11{day}.png")
        lines = [l for l in page.inner_text("main, body").splitlines() if l.strip()]
        print(day, " | ".join(lines)[:300])
    b.close()
