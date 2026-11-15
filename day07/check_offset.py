import datetime as dt, json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome")
    page = b.new_context(viewport={"width": 430, "height": 932}).new_page()
    page.clock.set_fixed_time(dt.datetime(2026, 11, 14, 9, 0))
    page.goto("http://127.0.0.1:8001/"); page.wait_for_timeout(500)
    page.evaluate("document.getElementById('btn-advance-day').click()")
    page.wait_for_timeout(300)
    for day in [14, 20]:
        page.clock.set_fixed_time(dt.datetime(2026, 11, day, 9, 0))
        page.reload(); page.wait_for_timeout(500)
        s = json.loads(page.evaluate("localStorage.getItem('plant_app_state_v1')"))
        rows = page.inner_text("#today-watering-grid").split()
        print(day, "offset", s["settings"].get("dateOffsetDays"), "| today grid:", " ".join(rows)[:120])
    b.close()
