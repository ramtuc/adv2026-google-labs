"""Day 9: Lyria 3.5 に ESP32-S3 の仕様を歌わせ、歌詞と歌声をデータシートと照らす

- auto   : 歌詞を Lyria に任せる。歌詞の中の数字がデータシートどおりかを見る
- custom : 正しい歌詞（[Verse] / [Chorus] 付き）を渡す。歌った音声を Gemini で書き起こし、
           歌詞どおりに歌ったかを見る

実行: uv run day09/make_song.py auto
      uv run day09/make_song.py custom
      uv run day09/make_song.py custom --clip   （30 秒のクリップで試す）
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
from google.genai import types

load_dotenv()

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

TRANSCRIBE_MODEL = "gemini-3.8-flash"

HERE = Path(__file__).parent
RESULTS_DIR = HERE / "results"

STYLE = "明るいエレクトロポップ、BPM 128、日本語の女性ボーカル。"

PROMPTS = {
    # 歌詞を任せる。数字は書かず、何を歌うかだけを伝える
    "auto": STYLE + "Espressif のマイコン ESP32-S3 のデータシートに書かれた仕様（CPU と動作周波数、メモリ、Wi-Fi と Bluetooth、Deep-sleep のときの消費電流）を歌詞にした歌。",
    # 正しい歌詞を渡す（数字はデータシート v2.2 の値）
    "custom": STYLE + """次の歌詞をそのまま歌ってください。

[Verse]
エクステンサ LX7 デュアルコア
二百四十メガヘルツで走る
SRAM は五百十二キロバイト
GPIO は四十五本

[Chorus]
眠れば七マイクロアンペア
三千ミリアンペアアワーで四十九年
Wi-Fi は二・四ギガヘルツだけ
Bluetooth は LE だけ
""",
}


def generate(mode: str, clip: bool):
    model = "lyria-3-clip-preview" if clip else "lyria-3.5"
    start = time.perf_counter()
    interaction = client.interactions.create(model=model, input=PROMPTS[mode])
    elapsed = time.perf_counter() - start
    audio = interaction.output_audio
    return model, elapsed, interaction.output_text, audio


def transcribe(mp3: bytes) -> str:
    # 歌声を書き起こす。歌詞を推測で補わせないよう、聞こえたとおりに書かせる
    response = client.models.generate_content(
        model=TRANSCRIBE_MODEL,
        contents=[
            types.Part.from_bytes(data=mp3, mime_type="audio/mpeg"),
            "この歌の歌詞を、聞こえたとおりに日本語で書き起こしてください。数字や英語は聞こえた読み方のまま書き、聞き取れないところは（聞き取れない）と書いてください。",
        ],
    )
    return response.text


def main():
    # Windows のコンソール（cp932）でも表示できるように UTF-8 にする
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=PROMPTS)
    parser.add_argument("--clip", action="store_true")
    args = parser.parse_args()

    model, elapsed, lyrics, audio = generate(args.mode, args.clip)
    mp3 = base64.b64decode(audio.data) if isinstance(audio.data, str) else audio.data
    name = f"{args.mode}{'_clip' if args.clip else ''}"
    RESULTS_DIR.mkdir(exist_ok=True)
    (RESULTS_DIR / f"{name}.mp3").write_bytes(mp3)
    print(f"{model}: {elapsed:.1f} s, {len(mp3):,} bytes, {audio.mime_type} {audio.sample_rate} Hz {audio.channels} ch")
    print("--- Lyria が返した歌詞")
    print(lyrics)

    heard = transcribe(mp3)
    print("--- 歌声の書き起こし")
    print(heard)

    (RESULTS_DIR / f"{name}.json").write_text(
        json.dumps({"model": model, "seconds": round(elapsed, 1), "prompt": PROMPTS[args.mode],
                    "lyrics": lyrics, "transcription": heard}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
