"""Day 11: Nano Banana に間違い探しを作らせ、Gemini に解かせる

1. make  : ボードの写真（day10/input/board.jpg）から「ちょうど 7 か所違う」画像を作らせ、変えた場所も文章で答えさせる
2. diff  : 2 枚の画像の差を画素で取り、違う場所を赤枠で囲む
           （生成画像は全体が描き直されて少しずれるので、文字の小さな変化は拾えない。答え合わせは目で行った）
3. solve : Gemini に 2 枚を見せて、違いを全部探させる

実行: uv run --with pillow --with numpy --with scipy day11/spot_the_difference.py make
      uv run --with pillow --with numpy --with scipy day11/spot_the_difference.py diff
      uv run --with pillow --with numpy --with scipy day11/spot_the_difference.py solve
      （--model pro で Nano Banana Pro）
"""

import argparse
import io
import json
import os
import sys
import time
from pathlib import Path

import numpy as np
from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

load_dotenv()

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

MODELS = {"2.1": "gemini-nano-banana-2.1", "pro": "gemini-3-pro-image"}
SOLVER = "gemini-3.1-pro-preview"

HERE = Path(__file__).parent
RESULTS = HERE / "results"
PHOTO = HERE.parent / "day10" / "input" / "board.jpg"

MAKE_PROMPT = ("この写真をもとに、間違い探しの「間違いのある方」の画像を作ってください。"
               "写真との違いはちょうど 7 か所にしてください（部品や文字を変える、消す、足す、色を変えるなど）。"
               "それ以外は写真とまったく同じにしてください。"
               "最後に、変えた 7 か所を、場所と内容が分かるように番号付きで書いてください。")

SOLVE_PROMPT = ("1 枚目が元の写真、2 枚目が間違い探しの「間違いのある方」です。"
                "2 枚の違いをすべて見つけて、番号付きで、場所（画像のどのあたりか）と内容を答えてください。"
                "いくつあるかは教えません。")


def make(key: str):
    start = time.perf_counter()
    response = client.models.generate_content(
        model=MODELS[key],
        contents=[types.Part.from_bytes(data=PHOTO.read_bytes(), mime_type="image/jpeg"), MAKE_PROMPT],
        config=types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"],
                                           image_config=types.ImageConfig(aspect_ratio="4:3", image_size="2K")),
    )
    seconds = time.perf_counter() - start
    texts = []
    for part in response.candidates[0].content.parts:
        if part.thought:
            continue
        if part.inline_data:
            (RESULTS / f"spot_{key}.png").write_bytes(part.inline_data.data)
        elif part.text:
            texts.append(part.text)
    record = {"model": MODELS[key], "prompt": MAKE_PROMPT, "seconds": round(seconds, 1), "claimed": "\n".join(texts)}
    (RESULTS / f"spot_{key}.json").write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"spot_{key}: {seconds:.1f} s")
    print("\n".join(texts))


def diff(key: str):
    # 生成画像は大きさが変わるので、元の写真の大きさにそろえてから比べる
    original = Image.open(PHOTO).convert("RGB")
    edited = Image.open(RESULTS / f"spot_{key}.png").convert("RGB").resize(original.size, Image.LANCZOS)
    a = np.asarray(original.filter(ImageFilter.GaussianBlur(3)), dtype=np.int16)
    b = np.asarray(edited.filter(ImageFilter.GaussianBlur(3)), dtype=np.int16)
    delta = np.abs(a - b).max(axis=2)
    mask = ndimage.binary_opening(delta > 60, iterations=2)
    mask = ndimage.binary_dilation(mask, iterations=15)  # 近い画素どうしを 1 か所にまとめる
    labels, count = ndimage.label(mask)
    boxes = []
    for i, sl in enumerate(ndimage.find_objects(labels), 1):
        area = int((labels[sl] == i).sum())
        if area < 3000:
            continue  # 小さすぎるもの（JPEG のノイズなど）は数えない
        y, x = sl
        boxes.append({"x0": x.start, "y0": y.start, "x1": x.stop, "y1": y.stop, "area": area})
    # 違う場所を赤い枠で囲んだ画像を残す（答えの図）
    marked = edited.copy()
    draw = ImageDraw.Draw(marked)
    for n, box in enumerate(boxes, 1):
        draw.rectangle((box["x0"], box["y0"], box["x1"], box["y1"]), outline=(255, 0, 0), width=8)
        draw.text((box["x0"] + 10, box["y0"] + 5), str(n), fill=(255, 0, 0), font_size=60)
    marked.save(RESULTS / f"spot_{key}_answer.png")
    (RESULTS / f"spot_{key}_diff.json").write_text(json.dumps(boxes, indent=2), encoding="utf-8")
    print(f"spot_{key}: 画素で違う場所 {len(boxes)} か所")
    for n, box in enumerate(boxes, 1):
        print(f"  {n}: x {box['x0']}-{box['x1']}, y {box['y0']}-{box['y1']}, area {box['area']}")


def solve(key: str):
    edited = Image.open(RESULTS / f"spot_{key}.png").convert("RGB").resize(Image.open(PHOTO).size, Image.LANCZOS)
    buf = io.BytesIO()
    edited.save(buf, format="JPEG", quality=95)
    start = time.perf_counter()
    response = client.models.generate_content(
        model=SOLVER,
        contents=[types.Part.from_bytes(data=PHOTO.read_bytes(), mime_type="image/jpeg"),
                  types.Part.from_bytes(data=buf.getvalue(), mime_type="image/jpeg"), SOLVE_PROMPT],
    )
    seconds = time.perf_counter() - start
    (RESULTS / f"spot_{key}_solve.json").write_text(
        json.dumps({"model": SOLVER, "prompt": SOLVE_PROMPT, "seconds": round(seconds, 1), "answer": response.text},
                   ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"solve spot_{key}: {seconds:.1f} s")
    print(response.text)


def main():
    # Windows のコンソール（cp932）でも表示できるように UTF-8 にする
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("step", choices=["make", "diff", "solve"])
    parser.add_argument("--model", choices=MODELS, default="2.1")
    args = parser.parse_args()
    RESULTS.mkdir(exist_ok=True)
    {"make": make, "diff": diff, "solve": solve}[args.step](args.model)


if __name__ == "__main__":
    main()
