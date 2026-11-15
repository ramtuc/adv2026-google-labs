"""Day 22: Deep Research の調査結果を Nano Banana で図解にして、図の中の数値が正しいかを確かめる

材料は 3 通り（レポートは Day 14 で 2026-11-14 に回し直したもの）。
- facts    : Day 14 の結果を人がデータシートで確かめた後の表（正しい値だけ）
- max      : Deep Research Max のレポートそのまま（正しい値と、Web の誤った値と、推測が混ざる）
- standard : Deep Research（通常版）のレポートそのまま。S3 の Deep-sleep を「約 10 µA」と誤って書いている
これを Nano Banana 2.1 と Pro に渡して「ESP32-S3 と初代 ESP32 の取り違えやすい仕様」の図解を描かせ、
gemini-3.8-flash に図の中の値を読み取らせて、正しい値と比べる（読み取りは人も画像を見て確かめる）。

実行: uv run day22/infographic.py --sources facts,max,standard --models 2.1,pro --reps 2
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel

load_dotenv()
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

HERE = Path(__file__).parent
REPO = HERE.parent
RESULTS = HERE / "results"
MODELS = {"2.1": "gemini-nano-banana-2.1", "pro": "gemini-3-pro-image"}
READER = "gemini-3.8-flash"

FACTS = """ESP32-S3 と初代 ESP32 の、Web でよく取り違えられる仕様（データシートで確かめた値）
| 項目 | ESP32-S3 | 初代 ESP32 | Web でよくある誤り |
| SRAM | 512 KB | 520 KB | S3 を 520 KB と書く |
| CPU | Xtensa LX7 デュアルコア 240 MHz | Xtensa LX6 デュアルコア 240 MHz | S3 を「LX7 RISC-V」と書く |
| GPIO | 45 本 | 34 本 | S3 を 34 本と書く（ボードの引き出しピンの数と混同も） |
| Deep-sleep の電流 | 7 µA | 10 µA | S3 を 10 µA と書く |
| Bluetooth | Bluetooth 5（LE） | Bluetooth 4.2（Classic と BLE） | S3 を 4.2 と書く、C6 の 5.3 と書く |"""

PROMPT = ("次の資料をもとに、「ESP32-S3 と初代 ESP32：よく取り違えられる仕様」という 1 枚の図解（インフォグラフィック）を作ってください。"
          "日本語で、項目ごとに ESP32-S3 と初代 ESP32 の値を並べ、Web でよくある誤りも一言添えてください。\n\n資料：\n")

# 正しい値（読み取った文字列に、この正規表現が当たれば正しい）
TRUTH = {
    "SRAM": (r"512\s*KB", r"520\s*KB"),
    "CPU": (r"LX7", r"LX6"),
    "GPIO": (r"45", r"34"),
    "Deep-sleep": (r"7\s*[µμu]A", r"10\s*[µμu]A"),
    "Bluetooth": (r"5(?!\.\d)", r"4\.2"),
}


class Row(BaseModel):
    item: str
    esp32_s3: str
    esp32: str


class Reading(BaseModel):
    title: str
    rows: list[Row]
    other_numbers: list[str]


def source_text(name: str) -> str:
    if name == "facts":
        return FACTS
    return (REPO / "day14" / "results" / f"report_{name}.md").read_text(encoding="utf-8")


def draw(model_key: str, source: str, out: Path) -> dict:
    start = time.perf_counter()
    r = client.models.generate_content(
        model=MODELS[model_key], contents=PROMPT + source_text(source),
        config=types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"],
                                           image_config=types.ImageConfig(aspect_ratio="3:4", image_size="2K")))
    seconds = time.perf_counter() - start
    texts = []
    for part in r.candidates[0].content.parts:
        if part.thought:
            continue  # Pro は途中の画像も返すので、最後の画像だけを残す
        if part.inline_data:
            out.write_bytes(part.inline_data.data)
        elif part.text:
            texts.append(part.text)
    return {"seconds": round(seconds, 1), "text": "\n".join(texts),
            "input_tokens": r.usage_metadata.prompt_token_count, "output_tokens": r.usage_metadata.candidates_token_count}


def read(image: Path) -> Reading:
    r = client.models.generate_content(
        model=READER,
        contents=[types.Part.from_bytes(data=image.read_bytes(), mime_type="image/png"),
                  "この図解に書かれている内容を読み取ってください。項目ごとに、ESP32-S3 の値と初代 ESP32 の値を、図に書かれている文字のとおりに書き写してください。"
                  "直したり補ったりしないでください。表の外に書かれている数値（電流、容量、本数、バージョンなど）は other_numbers に書き写してください。"],
        config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=Reading))
    return r.parsed


def judge(reading: Reading) -> dict:
    """項目ごとに、S3 と初代の値が正しいか。図に項目がなければ None"""
    out = {}
    for key, (s3_ok, esp32_ok) in TRUTH.items():
        row = next((x for x in reading.rows if key.lower().replace("-", "") in x.item.lower().replace("-", "").replace(" ", "")
                    or (key == "Deep-sleep" and ("スリープ" in x.item or "sleep" in x.item.lower()))), None)
        if row is None:
            out[key] = None
            continue
        out[key] = {"s3": row.esp32_s3, "esp32": row.esp32,
                    "s3_ok": bool(re.search(s3_ok, row.esp32_s3, re.I)), "esp32_ok": bool(re.search(esp32_ok, row.esp32, re.I))}
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--sources", default="facts,max,standard")
    ap.add_argument("--models", default="2.1,pro")
    ap.add_argument("--reps", type=int, default=2)
    args = ap.parse_args()
    RESULTS.mkdir(exist_ok=True)
    log = RESULTS / "runs.jsonl"
    for rep in range(1, args.reps + 1):
        for source in args.sources.split(","):
            for m in args.models.split(","):
                name = f"{source}_{m}_{rep}"
                img = RESULTS / f"{name}.png"
                d = draw(m, source, img)
                reading = read(img)
                j = judge(reading)
                row = {"time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "name": name, "source": source,
                       "model": MODELS[m], "rep": rep, **d, "reading": reading.model_dump(), "judge": j}
                with log.open("a", encoding="utf-8") as f:
                    f.write(json.dumps(row, ensure_ascii=False) + "\n")
                marks = " ".join(f"{k}:{'－' if v is None else ('○' if v['s3_ok'] else '×') + ('○' if v['esp32_ok'] else '×')}"
                                 for k, v in j.items())
                print(f"{name:14} {d['seconds']:5.1f} s  {marks}")


if __name__ == "__main__":
    main()
