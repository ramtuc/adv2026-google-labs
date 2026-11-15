"""凪島の民宿のおかみさんの話を TTS で音声にする（Gemini Notebook に音声のソースとして入れる）

ここにしかない情報（民宿の料金、花火の時刻、灯台の定休日）を入れておき、
音声のソースから答えを引けるかを確かめる。
"""

import io
import os
import wave
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

TTS_MODEL = "gemini-3.8-flash-tts"
OUT = Path(__file__).parent / "sources" / "okami.wav"

TEXT = """これは検証のために作った、架空の島の話です。
はい、民宿しおさいの、おかみの浜田です。
うちは港から歩いて5分。お部屋は6つだけの、小さな宿なんですよ。
お値段はね、1泊2食付きで、お一人9,800円。小学生のお子さんは6,500円です。
夏の凪祭りの日は、夜8時半から花火が上がるの。うちの2階の窓から、よーく見えますよ。
それとね、灯台は月曜日がお休みなの。月曜に来る人がよく、がっかりして帰ってくるのよ。
朝ごはんには、島の塩で焼いたアジの干物を出してます。"""


def main():
    response = client.models.generate_content(
        model=TTS_MODEL,
        # 話し方の指示を前に付けると、指示まで読み上げたので本文だけを渡す
        contents=TEXT,
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Sulafat"))
            ),
        ),
    )
    audio = response.candidates[0].content.parts[0].inline_data
    # gemini-3.8 系の TTS は WAV（ヘッダー付き）を返す
    if audio.mime_type.startswith("audio/wav"):
        OUT.write_bytes(audio.data)
    else:
        with wave.open(str(OUT), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(24000)
            w.writeframes(audio.data)
    with wave.open(str(OUT)) as w:
        print(f"saved {OUT}（{w.getnframes() / w.getframerate():.1f} 秒）")


if __name__ == "__main__":
    main()
