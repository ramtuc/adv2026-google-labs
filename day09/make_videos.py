"""Day 9: 記事に埋め込むため、生成した曲を静止画付きの動画（MP4）にする

Qiita の記事には音声を直接埋め込めないので、YouTube に上げて埋め込む。
画面には、どう作った曲かと、AI で生成したものであることを書く。
（YouTube に上げるときは「改変または合成されたコンテンツ」の開示も「はい」にする）

pillow と ffmpeg を使う。
実行: uv run --with pillow day09/make_videos.py
"""

import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
RESULTS = HERE / "results"
OUT = RESULTS / "video"
FONT_BOLD = "C:/Windows/Fonts/BIZ-UDGothicB.ttc"
FONT = "C:/Windows/Fonts/BIZ-UDGothicR.ttc"
SIZE = (1280, 720)
BG, FG, SUB, ACCENT, WARN = (24, 28, 36), (240, 240, 240), (160, 168, 180), (255, 196, 64), (255, 120, 120)

PROMPT_AUTO = "依頼：ESP32-S3 のデータシートの仕様（CPU、メモリ、Wi-Fi と Bluetooth、Deep-sleep の電流）を歌詞にした歌（歌詞は AI に任せた）"
PROMPT_CUSTOM = "依頼：データシートどおりの歌詞（LX7、240 MHz、SRAM 512 KB、GPIO 45 本、7 マイクロアンペア、49 年…）を渡して「そのまま歌って」"

SONGS = [
    {
        "audio": "auto.mp3",
        "title": "Lyria 3.5（Gemini API）：歌詞を任せた曲",
        "lines": [(PROMPT_AUTO, 28, FG), ("歌詞の誤り：SRAM 520 KB（正しくは 512 KB。520 KB は初代 ESP32 の値）", 30, WARN)],
        "footer": "AI 生成：Gemini API の lyria-3.5 で生成した曲です（歌詞・歌声・伴奏とも）",
    },
    {
        "audio": "custom.mp3",
        "title": "Lyria 3.5（Gemini API）：正しい歌詞を渡した曲",
        "lines": [(PROMPT_CUSTOM, 28, FG), ("返ってきた歌詞の文字は渡したとおり。歌声の数字や英字は聞き取りにくい", 30, ACCENT)],
        "footer": "AI 生成：Gemini API の lyria-3.5 で生成した曲です（歌声・伴奏）",
    },
    {
        "audio": "flow_auto.mp3",
        "title": "Flow Music：歌詞を任せた曲「Deep Sleep Mode」",
        "lines": [(PROMPT_AUTO, 28, FG), ("歌詞の数字は正しい（240 MHz、2.4 GHz、Bluetooth 5、512）。恋の歌に仕立てた", 30, ACCENT)],
        "footer": "AI 生成：Google Flow Music（Lyria 3.5）で生成した曲です（歌詞・歌声・伴奏とも）",
    },
    {
        "audio": "flow_custom.mp3",
        "title": "Flow Music：歌詞を渡した曲「エクステンサ LX7」",
        "lines": [(PROMPT_CUSTOM, 28, FG), ("構成を作り替え、渡していない「フラッシュは八メガバイト搭載」を足した", 30, WARN)],
        "footer": "AI 生成：Google Flow Music（Lyria 3.5）で生成した曲です（歌声・伴奏、歌詞の一部）",
    },
]


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


def card(path: Path, title: str, lines: list[tuple[str, int, tuple]], footer: str):
    """タイトルと本文の行（文字列, 文字サイズ, 色）を並べた静止画を作る"""
    img = Image.new("RGB", SIZE, BG)
    d = ImageDraw.Draw(img)
    y = 90
    title_font = ImageFont.truetype(FONT_BOLD, 48)
    for line in wrap(d, title, title_font, SIZE[0] - 160):
        d.text((80, y), line, font=title_font, fill=ACCENT)
        y += 66
    y += 38
    for text, size, color in lines:
        font = ImageFont.truetype(FONT, size)
        for line in wrap(d, text, font, SIZE[0] - 160):
            d.text((80, y), line, font=font, fill=color)
            y += int(size * 1.5)
        y += 20
    footer_font = ImageFont.truetype(FONT, 24)
    d.text((80, SIZE[1] - 80), footer, font=footer_font, fill=SUB)
    img.save(path)


def duration(audio: Path) -> str:
    return subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(audio)],
        capture_output=True, text=True, check=True,
    ).stdout.strip()


def video(image: Path, audio: Path, out: Path):
    # 曲はステレオのまま、音質を落としすぎないよう 192 kbps の AAC にする。
    # -shortest だけだと静止画の側が数秒長くなるので、曲の長さで切る
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-loop", "1", "-i", str(image), "-i", str(audio),
         "-t", duration(audio), "-c:v", "libx264", "-tune", "stillimage", "-r", "10", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "192k", str(out)],
        check=True,
    )
    print(f"saved {out}")


def main():
    # Windows のコンソール（cp932）でも表示できるように UTF-8 にする
    sys.stdout.reconfigure(encoding="utf-8")
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as d:
        for song in SONGS:
            name = Path(song["audio"]).stem
            image = Path(d) / f"{name}.png"
            card(image, song["title"], song["lines"], song["footer"])
            image_copy = OUT / f"{name}.png"
            image_copy.write_bytes(image.read_bytes())
            video(image, RESULTS / song["audio"], OUT / f"{name}.mp4")


if __name__ == "__main__":
    main()
