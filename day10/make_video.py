"""Day 10: Gemini Omni 1.2 Flash で ESP32-S3 の紹介動画を作る

- text  : 文章から動画（日本語のナレーション付き）。チップや基板をどう描くか、仕様の数字を正しく言うか
- image : 実物のボードの写真（input/board.jpg）から動画。刻印や部品の配置を保つか
- edit  : image で作った動画を、やりとりで直す（previous_interaction_id）

Gemini API の Veo 3.1 Preview は 2026-10-22 に終了したので、後継の Gemini Omni Flash を使う。
呼び出しは Day 9 の Lyria と同じ Interactions API。

実行: uv run day10/make_video.py text
      uv run day10/make_video.py image
      uv run day10/make_video.py edit
"""

import argparse
import base64
import json
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

MODEL = "gemini-omni-1.2-flash"

HERE = Path(__file__).parent
RESULTS = HERE / "results"

# 720p・8 秒（1 本あたり約 0.56 ドル）
VIDEO_FORMAT = {"type": "video", "duration": "8s", "resolution": "720p", "aspect_ratio": "16:9"}

PROMPTS = {
    "text": "ESP32-S3 というマイコンの開発ボードを紹介する、8 秒の製品紹介動画。暗い机の上に置かれた青い基板に、カメラがゆっくり寄っていく。"
    "落ち着いた女性の声で、日本語のナレーション：「ESP32-S3。240 メガヘルツのデュアルコアで、眠れば 7 マイクロアンペア。」",
    "image": "この写真の基板を、実写の映像にしてください。基板の部品や文字はそのままで、カメラが基板の上をゆっくり横に動く。"
    "USB-C の近くにある小さな LED が光り、RX と TX の LED が点滅する。音は静かな電子音だけで、ナレーションは入れない。",
    "edit": "基板の右端の USB-C コネクタに、白い USB ケーブルが差し込まれる場面にしてください。それ以外はそのままにしてください。",
}


def save(name: str, interaction, prompt: str, seconds: float, previous: str | None = None):
    video = interaction.output_video
    data = base64.b64decode(video.data) if isinstance(video.data, str) else video.data
    RESULTS.mkdir(exist_ok=True)
    (RESULTS / f"{name}.mp4").write_bytes(data)
    record = {"model": MODEL, "id": interaction.id, "previous_interaction_id": previous,
              "prompt": prompt, "format": VIDEO_FORMAT, "seconds": round(seconds, 1),
              "bytes": len(data), "text": interaction.output_text}
    (RESULTS / f"{name}.json").write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{name}: {seconds:.1f} s, {len(data):,} bytes, id={interaction.id}")
    if interaction.output_text:
        print(interaction.output_text)


def main():
    # Windows のコンソール（cp932）でも表示できるように UTF-8 にする
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=PROMPTS)
    args = parser.parse_args()
    prompt = PROMPTS[args.mode]

    previous = None
    if args.mode == "text":
        request = {"input": prompt}
    elif args.mode == "image":
        photo = base64.b64encode((HERE / "input" / "board.jpg").read_bytes()).decode()
        request = {"input": [{"type": "image", "data": photo, "mime_type": "image/jpeg"},
                             {"type": "text", "text": prompt}]}
    else:
        # image で作った動画を、アップロードし直さずに直す
        previous = json.loads((RESULTS / "image.json").read_text(encoding="utf-8"))["id"]
        request = {"input": prompt, "previous_interaction_id": previous}

    start = time.perf_counter()
    interaction = client.interactions.create(model=MODEL, response_format=VIDEO_FORMAT, **request)
    save(args.mode, interaction, prompt, time.perf_counter() - start, previous)


if __name__ == "__main__":
    main()
