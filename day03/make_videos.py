"""Day 3: 記事に埋め込むため、作った音声を静止画付きの動画（MP4）にする

Qiita の記事には音声を直接埋め込めないので、YouTube に上げて埋め込む。
- overview.mp4: 再現版の音声解説（タイトル画面＋音声）
- interrupts.mp4: 割り込みの応答を、2つの方式で質問ごとに並べたもの

pillow と ffmpeg を使う。
実行: uv run --with pillow day03/make_videos.py
"""

import json
import subprocess
import tempfile
import wave
from pathlib import Path

from common import HERE, RESULTS, SAMPLE_RATE
from PIL import Image, ImageDraw, ImageFont

OUT = RESULTS / "video"
FONT_BOLD = "C:/Windows/Fonts/BIZ-UDGothicB.ttc"
FONT = "C:/Windows/Fonts/BIZ-UDGothicR.ttc"
SIZE = (1280, 720)
BG, FG, SUB, ACCENT = (24, 28, 36), (240, 240, 240), (160, 168, 180), (255, 196, 64)


def wrap(draw, text: str, font, width: int) -> list[str]:
    # 日本語は単語の区切りがないので1文字ずつ詰めて折り返す。英単語の途中では切らず、直前の空白で折り返す
    lines, line = [], ""
    for ch in text:
        if draw.textlength(line + ch, font=font) > width:
            head, space, tail = line.rpartition(" ")
            if space and ch != " " and tail.isascii():
                lines.append(head)
                line = tail + ch
            else:
                lines.append(line)
                line = ch.lstrip()
        else:
            line += ch
    return lines + [line] if line else lines


def card(path: Path, title: str, lines: list[tuple[str, int, tuple]], footer: str = ""):
    """タイトルと本文の行（文字列, 文字サイズ, 色）を並べた静止画を作る"""
    img = Image.new("RGB", SIZE, BG)
    d = ImageDraw.Draw(img)
    y = 90
    title_font = ImageFont.truetype(FONT_BOLD, 52)
    for line in wrap(d, title, title_font, SIZE[0] - 160):
        d.text((80, y), line, font=title_font, fill=ACCENT)
        y += 72
    y += 38
    for text, size, color in lines:
        font = ImageFont.truetype(FONT, size)
        for line in wrap(d, text, font, SIZE[0] - 160):
            d.text((80, y), line, font=font, fill=color)
            y += int(size * 1.5)
        y += 16
    if footer:
        d.text((80, SIZE[1] - 70), footer, font=ImageFont.truetype(FONT, 22), fill=SUB)
    img.save(path)


def silence(path: Path, seconds: float):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(b"\0\0" * int(SAMPLE_RATE * seconds))


def segment(image: Path, audio: Path, out: Path):
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-loop", "1", "-i", str(image), "-i", str(audio),
         "-shortest", "-c:v", "libx264", "-tune", "stillimage", "-r", "10", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-ar", str(SAMPLE_RATE), "-ac", "1", "-b:a", "96k", str(out)],
        check=True,
    )


def concat(parts: list[Path], out: Path, tmp: Path):
    listing = tmp / "list.txt"
    listing.write_text("".join(f"file '{p.as_posix()}'\n" for p in parts), encoding="utf-8")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(listing), "-c", "copy", str(out)], check=True)
    print(f"saved {out}")


FOOTER = "Gemini API で作った再現版の音声です（Gemini Notebook の音声ではありません）"


def overview(tmp: Path):
    script = json.loads((RESULTS / "script.json").read_text(encoding="utf-8"))
    image = tmp / "overview.png"
    card(
        image,
        "再現版：ESP32-S3 データシートの音声解説",
        [
            (script["title"], 34, FG),
            ("台本：gemini-3.1-pro-preview（データシート PDF から 32 ターンの対話を生成）", 26, SUB),
            ("音声：gemini-3.8-flash-tts のマルチスピーカー合成（Aoi = Kore / Ren = Puck）", 26, SUB),
        ],
        FOOTER,
    )
    segment(image, RESULTS / "overview.wav", OUT / "overview.mp4")


def interrupts(tmp: Path):
    slow = {r["id"]: r for r in json.loads((RESULTS / "interrupt.json").read_text(encoding="utf-8"))}
    live = {r["id"]: r for r in json.loads((RESULTS / "live_interrupt.json").read_text(encoding="utf-8"))}
    questions = json.loads((HERE / "interrupt_questions.json").read_text(encoding="utf-8"))
    gap = tmp / "gap.wav"
    silence(gap, 3)

    parts = []
    image = tmp / "intro.png"
    card(
        image,
        "再現版：音声解説への「割り込み」に答える",
        [
            ("同じ質問に、2つの方式で答えた音声を続けて流します。", 30, FG),
            ("① 台本を書き足してから合成（gemini-3.1-pro-preview ＋ gemini-3.8-flash-tts、日本語）", 26, SUB),
            ("② Live API で音声のまま応答（gemini-3.8-live、英語）", 26, SUB),
        ],
        FOOTER,
    )
    segment(image, gap, tmp / "intro.mp4")
    parts.append(tmp / "intro.mp4")

    for q in questions:
        for kind, result, audio, label in [
            ("slow", slow[q["id"]], RESULTS / f"interrupt_{q['id']}.wav", "① 台本を書き足してから合成"),
            ("live", live[q["id"]], RESULTS / f"live_{q['id']}.wav", "② Live API"),
        ]:
            seconds = result["first_audio_seconds"]
            question = q["question"] if kind == "slow" else q["question_en"]
            image = tmp / f"{q['id']}_{kind}.png"
            card(
                image,
                f"{q['id']}（{q['category']}）",
                [
                    (label, 36, FG),
                    (f"質問：{question}", 32, FG),
                    (f"最初の声まで {seconds} 秒", 44, ACCENT),
                ],
                FOOTER,
            )
            # 音声の前に 3 秒の間を置き、画面の文字を読めるようにする
            with_gap = tmp / f"{q['id']}_{kind}.wav"
            with wave.open(str(gap)) as g, wave.open(str(audio)) as a, wave.open(str(with_gap), "wb") as w:
                w.setparams(a.getparams())
                w.writeframes(g.readframes(g.getnframes()) + a.readframes(a.getnframes()))
            segment(image, with_gap, tmp / f"{q['id']}_{kind}.mp4")
            parts.append(tmp / f"{q['id']}_{kind}.mp4")

    concat(parts, OUT / "interrupts.mp4", tmp)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d)
        overview(tmp)
        interrupts(tmp)


if __name__ == "__main__":
    main()
