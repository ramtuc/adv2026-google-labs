"""Day 23: Nano Banana でスタックチャンの表情を描き、本体の画面（320×240）に載せる形にする

本体の吹き出しは英数字だけ（日本語のフォントがまだない。Day 20）。そこで、日本語の吹き出しごと表情を画像にする。
- 6 つの表情（純正と同じ Neutral / Happy / Angry / Sad / Doubt / Sleepy）を描かせる
- 1 枚目（Neutral）を見本として 2 枚目以降に渡し、顔の形をそろえさせる
- 吹き出しの日本語が指示どおりか、gemini-3.8-flash に読み取らせて比べる
- 320×240 に縮めて RGB565（本体の画面の形式）にし、大きさを測る

実行: uv run --with pillow day23/faces.py --models 2.1,pro --style flat
"""

import argparse
import io
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image
from pydantic import BaseModel

load_dotenv()
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

HERE = Path(__file__).parent
RESULTS = HERE / "results"
MODELS = {"2.1": "gemini-nano-banana-2.1", "pro": "gemini-3-pro-image"}
READER = "gemini-3.8-flash"
W, H = 320, 240

STYLES = {
    # 1 回目。「画面です」と書いたら、画面の付いた機械の写真（枠や背景入り）を描いた
    "photo": ("小さなロボットの顔の画面です。黒い背景に、白い大きな丸い目が 2 つと、白い線の口だけのシンプルな顔。"
              "画面の下の 1/4 に白い吹き出しがあり、黒い太い文字で日本語の台詞が入っています。横長 4:3、文字は大きく、小さな画面でも読めるように。"),
    # 2 回目。画面に出す画像そのものだと明示する
    "flat": ("320×240 の液晶にそのまま表示する画像を作ってください。画面を撮った写真ではなく、表示する画像そのものです。"
             "画面の枠、機械の本体、背景の部屋、影、光沢は描かない。画像の端から端まで真っ黒の背景。"
             "白い大きな丸い目が 2 つと、白い線の口だけのシンプルな平面の顔。"
             "画像の下の 1/4 に白い吹き出しがあり、黒い太い文字で日本語の台詞が入っています。横長 4:3、文字は大きく。"),
}
FACES = [
    ("Neutral", "ふつうの顔", "こんにちは"),
    ("Happy", "うれしい顔（目を細めて口を大きく開けて笑う）", "やったね！"),
    ("Angry", "怒った顔（眉をつり上げ、口をへの字）", "ぷんぷん！"),
    ("Sad", "悲しい顔（目尻を下げ、涙を 1 粒）", "しょんぼり…"),
    ("Doubt", "首をかしげる顔（片目を細め、口を斜めに）", "えっ、ほんと？"),
    ("Sleepy", "眠い顔（目を閉じて、頭の上に Zzz）", "おやすみ…"),
]


class Reading(BaseModel):
    bubble_text: str
    other_text: list[str]


def draw(model: str, prompt: str, ref: bytes | None) -> tuple[bytes, float]:
    contents = [prompt] if ref is None else [types.Part.from_bytes(data=ref, mime_type="image/png"), prompt]
    start = time.perf_counter()
    r = client.models.generate_content(
        model=model, contents=contents,
        config=types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"],
                                           image_config=types.ImageConfig(aspect_ratio="4:3", image_size="1K")))
    data = None
    for part in r.candidates[0].content.parts:
        if part.inline_data and not part.thought:
            data = part.inline_data.data
    return data, round(time.perf_counter() - start, 1)


def read_bubble(png: bytes) -> Reading:
    r = client.models.generate_content(
        model=READER,
        contents=[types.Part.from_bytes(data=png, mime_type="image/png"),
                  "この画像の吹き出しの中の文字を、書かれているとおりに書き写してください（直さない）。吹き出しの外に文字があれば other_text に。"],
        config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=Reading))
    return r.parsed


def to_rgb565(png: bytes, out_png: Path, out_bin: Path) -> int:
    """320×240 に縮め（はみ出す分は切る）、RGB565（リトルエンディアン）で書き出す"""
    img = Image.open(io.BytesIO(png)).convert("RGB")
    scale = max(W / img.width, H / img.height)
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    left, top = (img.width - W) // 2, (img.height - H) // 2
    img = img.crop((left, top, left + W, top + H))
    img.save(out_png)
    buf = bytearray()
    for r, g, b in img.getdata():
        v = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3)
        buf += v.to_bytes(2, "little")
    out_bin.write_bytes(buf)
    return len(buf)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", default="2.1,pro")
    ap.add_argument("--style", choices=STYLES, default="flat")
    args = ap.parse_args()
    (RESULTS / "screen").mkdir(parents=True, exist_ok=True)
    log = RESULTS / "runs.jsonl"
    for key in args.models.split(","):
        ref = None
        for emotion, look, line in FACES:
            prompt = (f"{STYLES[args.style]}\n表情：{look}。\n吹き出しの台詞（一字一句このまま）：「{line}」"
                      + ("\n添付の画像と同じロボットの顔の形・線の太さ・吹き出しの形にそろえてください。" if ref else ""))
            png, secs = draw(MODELS[key], prompt, ref)
            name = f"{args.style}_{key}_{emotion}"
            (RESULTS / f"{name}.png").write_bytes(png)
            if ref is None:
                ref = png  # 1 枚目を見本にする
            reading = read_bubble(png)
            size = to_rgb565(png, RESULTS / "screen" / f"{name}.png", RESULTS / "screen" / f"{name}.rgb565")
            ok = reading.bubble_text.strip().strip("「」") == line
            row = {"time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "style": args.style, "model": MODELS[key], "emotion": emotion,
                   "line": line, "read": reading.model_dump(), "text_ok": ok, "seconds": secs, "rgb565_bytes": size}
            with log.open("a", encoding="utf-8") as f:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
            print(f"{name:12} {secs:5.1f} s  台詞「{line}」→「{reading.bubble_text}」{'○' if ok else '×'}  他 {reading.other_text}")


if __name__ == "__main__":
    main()
