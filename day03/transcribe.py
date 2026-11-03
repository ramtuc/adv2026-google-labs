"""Day 3: Gemini Notebook の音声解説を文字起こしして、台本の構成を取り出す

ダウンロードした音声解説（m4a など）を Gemini に渡し、話者ごと・タイムスタンプ付きの
文字起こしと、番組の構成（どの話題を何分から何分まで話したか）を JSON で保存する。
make_script.py で作った再現版の台本と比べるのに使う。

実行: uv run day03/transcribe.py <音声ファイル> [出力ファイル名（results/ の下）]
"""

import json
import sys
from pathlib import Path

from common import RESULTS, SCRIPT_MODEL, client
from google.genai import types
from pydantic import BaseModel, Field


class Segment(BaseModel):
    start: str = Field(description="発言の開始時刻（mm:ss）")
    speaker: str = Field(description="話者。声で区別して A または B")
    text: str = Field(description="発言内容（聞こえたとおりに、相槌も含めて）")


class Section(BaseModel):
    start: str = Field(description="この話題の開始時刻（mm:ss）")
    end: str = Field(description="この話題の終了時刻（mm:ss）")
    topic: str = Field(description="話題の要約")


class Speaker(BaseModel):
    name: str = Field(description="A または B")
    description: str = Field(description="声の特徴と、番組内での役割（説明役か、聞き手か）")


class Transcript(BaseModel):
    # dict 型（additionalProperties）は Gemini API の構造化出力では使えないので、リストで持つ
    speakers: list[Speaker]
    sections: list[Section] = Field(description="番組の構成（話題の区切り）")
    segments: list[Segment]


PROMPT = """この音声は、技術資料をもとに2人のホストが話すポッドキャスト形式の音声解説です。
- segments に、話者ごと・発言ごとの文字起こしを、開始時刻付きで入れてください。相槌（「うん」「へえ」など）も1つの発言として残してください。
- sections に、番組の構成を話題ごとに区切って入れてください。
- speakers に、話者 A / B の声の特徴と役割（説明役か、聞き手か）を書いてください。"""


def main():
    audio_path = Path(sys.argv[1])

    # パスを渡すとファイル名がアップロード時の HTTP ヘッダーに入り、日本語のファイル名だとエラーになる。
    # 開いたファイルを渡し、英数字の表示名を付ける
    with audio_path.open("rb") as f:
        audio = client.files.upload(
            file=f, config={"mime_type": "audio/mp4", "display_name": "notebook_overview.m4a"}
        )
    response = client.models.generate_content(
        model=SCRIPT_MODEL,
        contents=[audio, PROMPT],
        config=types.GenerateContentConfig(
            temperature=0.0,
            response_mime_type="application/json",
            response_schema=Transcript,
        ),
    )
    transcript: Transcript = response.parsed

    for s in transcript.speakers:
        print(f"{s.name}: {s.description}")
    print()
    for s in transcript.sections:
        print(f"{s.start}-{s.end} {s.topic}")
    print(f"\n{len(transcript.segments)} 発言")

    # Gemini Notebook の出力をもとにした文字起こしなので、リポジトリには含めない（.gitignore 済み）
    out = RESULTS / (sys.argv[2] if len(sys.argv) > 2 else "notebook_transcript.json")
    out.write_text(json.dumps(transcript.model_dump(), ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"saved {out}")


if __name__ == "__main__":
    main()
