"""Day 7: ESP32 から配信できる管理画面を google-genai で作る

Day 6 で Stitch に渡したのと同じ依頼文に、ESP32-S3 のアクセスポイントから配信するための
条件（外部ファイルを読み込まない、1 ファイル、ESP32 の API を呼ぶ）を System Instruction で足し、
Stitch の Balanced と同じ gemini-3.8-flash に HTML を書かせる。

実行: uv run day07/generate_ui.py
"""

import gzip
import os
import re
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

MODEL = "gemini-3.8-flash"  # Stitch の Balanced と同じモデル

HERE = Path(__file__).parent
OUT_PATH = HERE / "www" / "index.html"

# Day 6 で Stitch に渡した2つの依頼をまとめたもの
USER_PROMPT = """ESP32-S3 で動く環境センサー（温度・湿度・CO2）の Web 管理画面を作ってください。ESP32 本体が Wi-Fi のアクセスポイントになって、スマートフォンのブラウザにこの画面を配信します。画面は3つです。(1) ダッシュボード：現在の温度・湿度・CO2 と、過去24時間のグラフ。(2) Wi-Fi 設定：つなぎに行くアクセスポイントの SSID とパスワード。(3) 省電力設定：Deep-sleep で眠る間隔と、電池がどれくらいもつかの予測。日本語の画面にしてください。
電池は 3000 mAh です。Deep-sleep 中の消費電流は 7 µA です（ESP32-S3 データシートの値）。省電力設定の画面に、Deep-sleep のまま眠り続けた場合に電池が何年もつかを表示してください。"""

# ESP32 から配信するための条件。Stitch の書き出しで足りなかったところを明示する
SYSTEM_INSTRUCTION = """あなたは組み込み機器の Web UI を作るフロントエンドエンジニアです。
この画面は ESP32-S3 のフラッシュに入れ、ESP32 自身がアクセスポイントとして配信します。スマートフォンはインターネットにつながりません。

# 守ること
- 1 つの HTML ファイルで完結させる。CSS と JavaScript はすべて HTML の中に書く
- 外部のものを一切読み込まない（CDN、Web フォント、外部画像、アイコンフォントを使わない）。フォントはシステムフォント、アイコンが必要ならインライン SVG にする
- 3 つの画面は 1 ファイルの中でタブなどで切り替える
- gzip で圧縮して 20 KB 以下を目安にする
- 表示する値は、次の ESP32 の API から取る。値を HTML に直接書かない
  - GET /api/status → {"temp_c": 数値, "humidity": 数値, "co2_ppm": 数値, "history": [{"t": UNIX秒, "temp_c": 数値, "humidity": 数値, "co2_ppm": 数値}, ...], "battery_mv": 数値, "uptime_s": 数値}
  - GET /api/scan → [{"ssid": 文字列, "rssi": 数値, "auth": 文字列}, ...]
  - POST /api/wifi に {"ssid": 文字列, "password": 文字列} を JSON で送る
  - GET /api/sleep → {"interval_min": 数値}、POST /api/sleep に {"interval_min": 数値} を送る
- グラフは canvas か SVG で自分で描く（ライブラリを使わない）

# 出力
HTML だけを出力する。説明やコードフェンスは付けない。"""


def main():
    # Windows のコンソール（cp932）でも表示できるように UTF-8 にする
    sys.stdout.reconfigure(encoding="utf-8")
    start = time.perf_counter()
    response = client.models.generate_content(
        model=MODEL,
        contents=USER_PROMPT,
        config=types.GenerateContentConfig(system_instruction=SYSTEM_INSTRUCTION),
    )
    elapsed = time.perf_counter() - start

    html = response.text.strip()
    # 指示してもコードフェンスが付くことがあるので外す
    html = re.sub(r"^```(?:html)?\s*|\s*```$", "", html)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(html, encoding="utf-8")
    size = len(html.encode("utf-8"))
    gz_size = len(gzip.compress(html.encode("utf-8")))
    print(f"{MODEL}: {elapsed:.1f} s, 出力トークン {response.usage_metadata.candidates_token_count}")
    print(f"saved {OUT_PATH}  {size:,} bytes（gzip {gz_size:,} bytes）")


if __name__ == "__main__":
    main()
