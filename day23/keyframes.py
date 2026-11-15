"""Day 23: 宣伝動画の各カットの最初の 1 枚を Nano Banana で作る

絵コンテ（storyboard.md）のカット 1〜3 と締めの静止画を、Day 12 の Pomelli のブランド（オレンジ #FF8C00、
オニキスブラック #2C2C2C、Inter）で描かせる。カット 3 は実物の LED シールドの写真を渡して、形を保たせる。
16:9・2K。Nano Banana 2.1 と Pro の両方で描き、使う方を人が選ぶ。

実行: uv run day23/keyframes.py --models 2.1,pro
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

HERE = Path(__file__).parent
REPO = HERE.parent
RESULTS = HERE / "results" / "keyframes"
MODELS = {"2.1": "gemini-nano-banana-2.1", "pro": "gemini-3-pro-image"}
SHIELD = REPO / "doc" / "day12" / "v2" / "00_led_shield_real.jpg"

BRAND = ("ブランドの色はオレンジ（#FF8C00）とオニキスブラック（#2C2C2C）。落ち着いた暗めの作業部屋に、オレンジの光が差す。"
         "写真のような実写の質感。文字は入れない。")

CUTS = {
    "cut1": "夜の電子工作の作業机。ブレッドボードとマイコンの開発ボード、ジャンパー線、オレンジの卓上ライト。机を斜め上から見た構図。" + BRAND,
    "cut2": "作業机の上のオシロスコープ。画面に矩形波が映っている。横に英語のデータシートの紙と、オレンジのペン。" + BRAND,
    "cut3": ("渡した写真の基板（Arduino 用の LED シールド）を、作業机の上に置いた商品写真。基板の形、色、LED の数と並び"
             "（6 個・8 個・6 個の 3 つのまとまり）、シルクの絵は写真のとおりに保つ。LED はまだ消えている。" + BRAND),
    "end": ("黒（#2C2C2C）の背景の中央に、オレンジ（#FF8C00）の太い文字で「電子工作でライフハック！」、その下に白の小さな文字で"
            "「electwork.net」。ほかの文字や絵は入れない。シンプルなタイトルカード。"),
}


def draw(model_key: str, cut: str, out: Path) -> dict:
    contents = [CUTS[cut]]
    if cut == "cut3":
        contents = [types.Part.from_bytes(data=SHIELD.read_bytes(), mime_type="image/jpeg"), CUTS[cut]]
    start = time.perf_counter()
    r = client.models.generate_content(
        model=MODELS[model_key], contents=contents,
        config=types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"],
                                           image_config=types.ImageConfig(aspect_ratio="16:9", image_size="2K")))
    for part in r.candidates[0].content.parts:
        if part.inline_data and not part.thought:
            out.write_bytes(part.inline_data.data)
    return {"seconds": round(time.perf_counter() - start, 1), "output_tokens": r.usage_metadata.candidates_token_count}


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", default="2.1,pro")
    ap.add_argument("--cuts", default=",".join(CUTS))
    args = ap.parse_args()
    RESULTS.mkdir(parents=True, exist_ok=True)
    for cut in args.cuts.split(","):
        for m in args.models.split(","):
            out = RESULTS / f"{cut}_{m}.png"
            d = draw(m, cut, out)
            row = {"time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "cut": cut, "model": MODELS[m], "prompt": CUTS[cut], **d}
            with (RESULTS / "runs.jsonl").open("a", encoding="utf-8") as f:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
            print(f"{cut:5} {m:4} {d['seconds']:5.1f} s", flush=True)


if __name__ == "__main__":
    main()
