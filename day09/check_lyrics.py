"""Day 9: Flow Music の曲の歌声を書き起こし、表示された歌詞の各行が歌われたかを照らす。

書き起こしには歌詞を見せない（答えの候補を見せると引っぱられるため）。
照らすときは、漢字の読みの違いを避けるため、両方をひらがなにしてから似ている度合いを測る。

実行: uv run --with google-genai --with python-dotenv --with pykakasi python day09/check_lyrics.py day09/v2_results/hatsuyuki_A.mp3 day09/v2_results/lyrics_v1.txt
"""
import difflib
import json
import os
import re
import sys
from pathlib import Path

import pykakasi
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
MODEL = "gemini-3.8-flash"
kks = pykakasi.kakasi()


def transcribe(mp3: bytes) -> str:
    r = client.models.generate_content(
        model=MODEL,
        contents=[
            types.Part.from_bytes(data=mp3, mime_type="audio/mpeg"),
            "この歌の歌詞を、聞こえたとおりに日本語で 1 行ずつ書き起こしてください。"
            "繰り返しも省略せず、歌われた順にすべて書いてください。聞き取れないところは（聞き取れない）と書いてください。",
        ],
    )
    return r.text


def kana(s: str) -> str:
    s = re.sub(r"[（(][^）)]*[）)]", "", s)  # 括弧の中（コーラス・聞き取れない）は除く
    s = "".join(x["hira"] for x in kks.convert(s))
    return re.sub(r"[\s、。！？!?「」・ー〜]", "", s)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    mp3_path, lyrics_path = Path(sys.argv[1]), Path(sys.argv[2])
    heard = transcribe(mp3_path.read_bytes())
    heard_kana = kana(heard)
    rows = []
    for line in lyrics_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("[") or re.fullmatch(r"[（(].*[）)]", line):
            continue
        k = kana(line)
        # 書き起こしの中を行と同じ長さの窓でずらし、一番近い部分の一致率を取る
        w = len(k)
        best = max((difflib.SequenceMatcher(None, heard_kana[i:i + w], k, autojunk=False).ratio()
                    for i in range(0, max(len(heard_kana) - w, 0) + 1)), default=0.0)
        rows.append({"line": line, "match": round(best, 2)})
    out = mp3_path.with_suffix(".check.json")
    out.write_text(json.dumps({"model": MODEL, "transcription": heard, "lines": rows},
                              ensure_ascii=False, indent=2), encoding="utf-8")
    for r in rows:
        print(f'{r["match"]:.2f}  {r["line"]}')
    print("---\n" + heard)


if __name__ == "__main__":
    main()
