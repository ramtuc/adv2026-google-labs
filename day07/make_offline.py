"""Day 7: Stitch が書き出した HTML を、インターネットなしで表示できる形にする

Day 6 で調べたとおり、Stitch の HTML は次のものを外部から読み込む。
- Tailwind CSS の CDN（ブラウザ上で CSS を組み立てる）
- Google Fonts（文字のフォントと、アイコン用の Material Symbols）
- ロゴ画像
ESP32 がアクセスポイントのときはどれも読めないので、
- HTML に埋め込まれた tailwind.config を取り出し、Tailwind v3 の CLI で CSS を先に作る
- 文字のフォントはシステムフォントに置き換える
- アイコンは、使っているものだけを切り出した Material Symbols のフォントを CSS に埋め込む
- ロゴ画像は外し、画面どうしのリンクをつなぐ
- ボタンを ESP32 の API（/api/wifi、/api/scan、/api/sleep）につなぐスクリプトを足す
- Stitch の修正が反映されていなかった電池の計算（1200 mAh・15 µA のまま）を直す
として www/stitch/ に書き出す。ESP32 では http://192.168.4.1/stitch/ で開く。

実行: uv run day07/make_offline.py
（先に day07/ui/stitch_offline で npm install しておく）
"""

import base64
import gzip
import json
import re
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE.parent / "day06" / "stitch_export" / "stitch_esp32"
WORK = HERE / "ui" / "stitch_offline"
DIST = HERE / "www" / "stitch"
BASE = "/stitch/"

# Stitch の画面 → ESP32 で配信するときのファイル名
PAGES = {
    "code.html": "index.html",
    "wi_fi/code.html": "wifi.html",
    "deep_sleep/code.html": "sleep.html",
}
# ナビゲーションの data-path → リンク先
NAV = {"dashboard": BASE, "wifi-settings": f"{BASE}wifi.html", "power-sleep": f"{BASE}sleep.html"}

# Stitch にチャットで 3000 mAh・7 µA を伝えたとき、HTML の表示は直ったが JavaScript の計算は古いままだった。
# 書き出したまま開くと「73 日」に戻るので、計算に使う値を直す（84% は 2520 mAh）
BATTERY_FIX = [
    ("dailySleepHours * 0.015", "dailySleepHours * 0.007"),
    ("Math.round(1200 / totalDailyMah)", "Math.round(3000 / totalDailyMah)"),
    ("(1008 / totalDailyMah)", "(2520 / totalDailyMah)"),
]

# ボタンを ESP32 の API につなぐ。Stitch の関数はアニメーションを出すだけなので、前後に通信を足す
BRIDGE = {
    "wifi.html": """<script>
(() => {
  const pwd = document.getElementById("password-input");
  pwd.value = "";  // Stitch が初期値に例のパスワードを入れているので消す
  const showAnimation = window.saveAndReboot;
  window.saveAndReboot = () => {
    const ssid = document.getElementById("ssid-input").value;
    fetch("/api/wifi", {method: "POST", headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({ssid, password: pwd.value})});
    showAnimation();
  };
  window.rescanWifi = async () => {
    const list = document.getElementById("network-list");
    const aps = await (await fetch("/api/scan")).json();
    list.innerHTML = aps.map(ap => `<div class="rounded-xl bg-surface-container p-space-md cursor-pointer hover:bg-surface-bright"
      onclick="selectSSID('${ap.ssid}', '${ap.auth}', '${ap.rssi} dBm')">
      <div class="font-headline-sm text-headline-sm text-on-surface">${ap.ssid}</div>
      <div class="font-label-mono text-label-mono text-on-surface-variant">${ap.rssi} dBm / ${ap.auth}</div></div>`).join("");
  };
})();
</script>""",
    "sleep.html": """<script>
(() => {
  const slider = document.getElementById("sleep-interval-slider");
  fetch("/api/sleep").then(r => r.json()).then(s => {
    slider.value = s.interval_min;
    slider.dispatchEvent(new Event("input"));
  });
  document.getElementById("btn-save-sleep").addEventListener("click", () =>
    fetch("/api/sleep", {method: "POST", headers: {"Content-Type": "application/json"},
                         body: JSON.stringify({interval_min: Number(slider.value)})}));
})();
</script>""",
}

SANS = ["system-ui", "-apple-system", "Segoe UI", "Hiragino Sans", "Meiryo", "sans-serif"]
MONO = ["ui-monospace", "SFMono-Regular", "Consolas", "monospace"]

# Google Fonts は User-Agent を見て形式を変えるので、woff2 を返すブラウザを名乗る
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req) as res:
        return res.read()


def tailwind_config(html: str) -> dict:
    config = json.loads(re.search(r"tailwind\.config=(\{.*?\});</script>", html).group(1))
    # Web フォントの名前をシステムフォントに置き換える（等幅は JetBrains Mono の代わり）
    families = config["theme"]["extend"]["fontFamily"]
    for name, value in families.items():
        families[name] = MONO if value == ["JetBrains Mono"] else SANS
    return config


def icon_font_css(icons: list[str]) -> str:
    # icon_names を付けると、そのアイコンだけを含むフォントが返る（名前はアルファベット順）。
    # Stitch の HTML は太さや塗りを変えていないので、可変フォントの軸は既定値に固定して小さくする
    query = urllib.parse.urlencode(
        {"family": "Material Symbols Outlined:opsz,wght,FILL,GRAD@24,400,0,0",
         "icon_names": ",".join(sorted(icons)), "display": "block"}
    )
    css = fetch(f"https://fonts.googleapis.com/css2?{query}").decode()
    woff2_url = re.search(r"url\((https://[^)]+)\)", css).group(1)
    font = base64.b64encode(fetch(woff2_url)).decode()
    return css.replace(woff2_url, f"data:font/woff2;base64,{font}"), len(font) * 3 // 4


def offline_html(html: str) -> str:
    html = re.sub(r'<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*/?>', "", html)
    html = re.sub(r'<script src="https://cdn\.tailwindcss\.com"></script>', "", html)
    html = re.sub(r'<script id="tailwind-config">.*?</script>', "", html, flags=re.S)
    html = re.sub(r'<img[^>]+lh3\.googleusercontent\.com[^>]*/?>', "", html)
    html = html.replace("</head>", f'<link rel="stylesheet" href="{BASE}app.css"/></head>', 1)
    for path, href in NAV.items():
        html = html.replace(f'data-path="{path}" href="#"', f'data-path="{path}" href="{href}"')
    return html


def main():
    # Windows のコンソール（cp932）でも表示できるように UTF-8 にする
    sys.stdout.reconfigure(encoding="utf-8")
    sources = {name: (SRC / src).read_text(encoding="utf-8") for src, name in PAGES.items()}
    DIST.mkdir(parents=True, exist_ok=True)

    # 3 画面とも同じ設定なので、最初の画面から取り出す
    config = tailwind_config(next(iter(sources.values())))
    config["content"] = [str(DIST / "*.html").replace("\\", "/")]
    (WORK / "tailwind.config.js").write_text(f"module.exports = {json.dumps(config, indent=2)};\n", encoding="utf-8")

    # アイコンの名前は、span の中身と、JavaScript で textContent に入れる文字列の両方から集める
    icons = sorted({m for html in sources.values() for m in
                    re.findall(r'<span[^>]*material-symbols-outlined[^>]*>\s*([a-z0-9_]+)\s*</span>', html)
                    + re.findall(r"(?:textContent|innerText)\s*=\s*['\"]([a-z0-9_]+)['\"]", html)})
    font_css, font_bytes = icon_font_css(icons)
    print(f"アイコン {len(icons)} 個、切り出したフォント {font_bytes:,} bytes")

    # Stitch が head に書いていた <style> も CSS にまとめる
    inline_styles = "\n".join(dict.fromkeys(
        s for html in sources.values() for s in re.findall(r"<style>(.*?)</style>", html, flags=re.S)))
    (WORK / "input.css").write_text(
        "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n"
        f"{font_css}\n.material-symbols-outlined{{font-family:'Material Symbols Outlined';font-weight:normal;"
        "font-style:normal;font-size:24px;line-height:1;letter-spacing:normal;text-transform:none;"
        "display:inline-block;white-space:nowrap;word-wrap:normal;direction:ltr;"
        "-webkit-font-feature-settings:'liga';font-feature-settings:'liga';}\n"
        f"{inline_styles}\n",
        encoding="utf-8",
    )

    for name, html in sources.items():
        html = re.sub(r"<style>.*?</style>", "", offline_html(html), flags=re.S)
        for old, new in BATTERY_FIX:
            html = html.replace(old, new)
        html = html.replace("</body>", BRIDGE.get(name, "") + "</body>")
        (DIST / name).write_text(html, encoding="utf-8")

    subprocess.run(
        ["npx", "tailwindcss", "-c", "tailwind.config.js", "-i", "input.css", "-o", str(DIST / "app.css"), "--minify"],
        cwd=WORK, check=True, shell=sys.platform == "win32",
    )

    for path in sorted(DIST.iterdir()):
        data = path.read_bytes()
        print(f"{path.name:12} {len(data):>8,} bytes（gzip {len(gzip.compress(data)):>7,} bytes）")


if __name__ == "__main__":
    main()
