"""Day 4: Gemini Notebook の動画解説を、ナレーションと画面の文字に分けて書き起こす

ナレーション（話した言葉）と、画面に出た文字・図の中身を、時刻付きで取り出す。
資料と照らし合わせるのに使う（固有名詞はナレーションと画面で別々に確かめたいので分ける）。

実行: uv run day04/transcribe_video.py day04/nagishima/video.mp4
"""

import json
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

load_dotenv()
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
MODEL = "gemini-3.1-pro-preview"


class Scene(BaseModel):
    start: str = Field(description="場面の開始時刻（mm:ss）")
    narration: str = Field(description="この場面のナレーションを、聞こえたとおりに一字一句")
    on_screen: str = Field(description="画面に出ている文字（見出し、数字、表、ラベル）を、書いてあるとおりに")
    visual: str = Field(description="映っている絵・写真・図の説明（短く）")


class Transcript(BaseModel):
    scenes: list[Scene]


PROMPT = """この動画は、資料をもとに作られた解説動画です。場面ごとに、ナレーション・画面の文字・映っているものを書き起こしてください。
- 固有名詞（店や宿の名前、地名）は、ナレーションで聞こえたとおり、画面に書いてあるとおりに。推測で直さない
- 画面の文字は、読みにくくても書いてあるとおりに"""


def main():
    path = Path(sys.argv[1])
    with path.open("rb") as f:
        video = client.files.upload(file=f, config={"mime_type": "video/mp4", "display_name": "notebook_video.mp4"})
    # 動画は処理が終わるまで使えない
    while video.state.name == "PROCESSING":
        time.sleep(5)
        video = client.files.get(name=video.name)
    response = client.models.generate_content(
        model=MODEL,
        contents=[video, PROMPT],
        config=types.GenerateContentConfig(
            temperature=0.0, response_mime_type="application/json", response_schema=Transcript
        ),
    )
    transcript: Transcript = response.parsed
    for s in transcript.scenes:
        print(f"[{s.start}] {s.narration}\n    画面: {s.on_screen}\n    絵: {s.visual}")
    out = path.parent.parent / "results" / (path.stem + "_transcript.json")
    out.write_text(json.dumps(transcript.model_dump(), ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"saved {out}")


if __name__ == "__main__":
    main()
