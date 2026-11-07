"""Day 9: 歌詞の字幕と、音に合わせて動く波形を入れた動画を作る

歌詞の文字はもう分かっている（Lyria の output_text、Flow Music のページ）ので、
「どの行が何秒から歌われるか」だけを Gemini に音声を聞かせて答えさせる（書き起こしではなく時刻合わせ）。
結果は results/<曲>_timing.json に残し、2 回目からは API を呼ばない。

背景は make_videos.py が作った静止画（results/video/<曲>.png）を使う。
実行: uv run --with pillow day09/make_videos.py   （先に静止画を作る）
      uv run day09/make_lyric_videos.py auto       （曲を指定。省略すると 4 曲すべて）
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

load_dotenv()

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

ALIGN_MODEL = "gemini-3.1-pro-preview"

HERE = Path(__file__).parent
RESULTS = HERE / "results"
VIDEO = RESULTS / "video"
FONTS = ["C:/Windows/Fonts/BIZ-UDGothicR.ttc", "C:/Windows/Fonts/BIZ-UDGothicB.ttc"]

SONGS = ["auto", "custom", "flow_auto", "flow_custom"]


class LineTiming(BaseModel):
    line: int = Field(description="歌詞の行番号（与えた番号）")
    start: float = Field(description="その行を歌い始める時刻（秒）")
    end: float = Field(description="その行を歌い終わる時刻（秒）")


def lyric_lines(name: str) -> list[str]:
    # API の曲は make_song.py が残した JSON、Flow Music の曲はページからコピーした歌詞
    if name.startswith("flow_"):
        text = (RESULTS / f"{name}_lyrics.txt").read_text(encoding="utf-8")
    else:
        text = json.loads((RESULTS / f"{name}.json").read_text(encoding="utf-8"))["lyrics"]
    lines = []
    for raw in text.splitlines():
        line = re.sub(r"^\[[^\]]*\]\s*", "", raw.strip())  # [:] や [0.0:] を外す
        if not line or re.fullmatch(r"\[\[?[^\]]*\]?\]|\[[A-Za-z0-9 -]+\]", raw.strip()):
            continue  # [[A0]] や [Verse 1] のような区切りの行は飛ばす
        lines.append(line)
    return lines


def align(name: str, lines: list[str]) -> list[LineTiming]:
    cache = RESULTS / f"{name}_timing.json"
    if cache.exists():
        return [LineTiming(**t) for t in json.loads(cache.read_text(encoding="utf-8"))]
    numbered = "\n".join(f"{i}: {line}" for i, line in enumerate(lines))
    response = client.models.generate_content(
        model=ALIGN_MODEL,
        contents=[
            types.Part.from_bytes(data=(RESULTS / f"{name}.mp3").read_bytes(), mime_type="audio/mpeg"),
            "この曲の歌詞は次のとおりです（行番号: 歌詞）。歌詞は書き直さず、各行を歌い始める時刻と歌い終わる時刻を秒で答えてください。"
            "同じ歌詞が繰り返される場合も、行番号の順に、実際に歌われた位置の時刻を答えてください。\n" + numbered,
        ],
        config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=list[LineTiming]),
    )
    timings = sorted(response.parsed, key=lambda t: t.line)
    cache.write_text(json.dumps([t.model_dump() for t in timings], ensure_ascii=False, indent=2), encoding="utf-8")
    return timings


def ass_time(seconds: float) -> str:
    cs = round(seconds * 100)
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def write_ass(path: Path, lines: list[str], timings: list[LineTiming]):
    events = []
    for t in timings:
        if 0 <= t.line < len(lines) and t.end > t.start:
            text = lines[t.line].replace("{", "（").replace("}", "）")
            events.append(f"Dialogue: 0,{ass_time(t.start)},{ass_time(t.end)},Lyric,,0,0,0,,{text}")
    path.write_text(
        "[Script Info]\nScriptType: v4.00+\nPlayResX: 1280\nPlayResY: 720\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
        "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
        # 白い文字に黒い縁。画面の下の方（波形の上）に中央ぞろえで出す
        "Style: Lyric,BIZ UDGothic,46,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,3,0,2,80,80,215,1\n\n"
        "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
        + "\n".join(events) + "\n",
        encoding="utf-8",
    )


def render(name: str, tmp: Path):
    # libass にフォントを渡すため、作業フォルダにフォントと字幕を置き、そこを相対パスで指す
    for font in FONTS:
        shutil.copy(font, tmp)
    filters = (
        "[1:a]aformat=channel_layouts=mono,showwaves=s=1120x100:mode=cline:rate=30:colors=gold:draw=full[w];"
        "[0:v][w]overlay=80:520,subtitles=lyrics.ass:fontsdir=.[v]"
    )
    duration = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(RESULTS / f"{name}.mp3")],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    out = VIDEO / f"{name}_lyrics.mp4"
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-loop", "1", "-framerate", "30", "-i", str(VIDEO / f"{name}.png"),
         "-i", str(RESULTS / f"{name}.mp3"), "-filter_complex", filters, "-map", "[v]", "-map", "1:a",
         "-t", duration, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", str(out)],
        cwd=tmp, check=True,
    )
    print(f"saved {out}")


def main():
    # Windows のコンソール（cp932）でも表示できるように UTF-8 にする
    sys.stdout.reconfigure(encoding="utf-8")
    names = sys.argv[1:] or SONGS
    for name in names:
        lines = lyric_lines(name)
        timings = align(name, lines)
        print(f"{name}: {len(lines)} 行、時刻 {len(timings)} 件")
        for t in timings[:5]:
            print(f"  {t.start:6.1f}-{t.end:6.1f}  {lines[t.line]}")
        with tempfile.TemporaryDirectory() as d:
            tmp = Path(d)
            write_ass(tmp / "lyrics.ass", lines, timings)
            render(name, tmp)


if __name__ == "__main__":
    main()
