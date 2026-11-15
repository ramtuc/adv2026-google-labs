"""Day 23: ナレーションを Gemini TTS で作る（カットごとに 1 本ずつ。あとで ffmpeg で映像の時刻に置く）

実行: uv run day23/narration.py
"""

import io
import os
import sys
import wave
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
OUT = Path(__file__).parent / "results" / "narration"
TTS = "gemini-3.8-flash-tts"
STYLE = ""  # 指示を付けると読み上げる（try1 は日本語、try2 は英語の指示文を読んだ）。本文だけを渡し、声の高さは voice_name で選ぶ
LINES = {"n1": "回路を組んで、", "n2": "波形を見て、データシートで確かめる。", "n3": "作って、動かす。電子工作でライフハック！"}


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    OUT.mkdir(parents=True, exist_ok=True)
    for name, text in LINES.items():
        r = client.models.generate_content(
            model=TTS, contents=STYLE + text,
            config=types.GenerateContentConfig(response_modalities=["AUDIO"], speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Charon")))))
        pcm = r.candidates[0].content.parts[0].inline_data.data
        if pcm[:4] == b"RIFF":  # gemini-3.8-flash-tts は audio/wav で返す。そのまま包むとヘッダーが「プツッ」、末尾が「ジジジ」と鳴る
            with wave.open(io.BytesIO(pcm)) as src:
                pcm = src.readframes(src.getnframes())
        with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
        print(name, f"{len(pcm) / 48000:.2f} s", text)


if __name__ == "__main__":
    main()
