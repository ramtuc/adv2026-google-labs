"""Day 3 の各スクリプトで共通に使う設定と関数"""

import io
import os
import urllib.request
import wave
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

load_dotenv()

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

SCRIPT_MODEL = "gemini-3.1-pro-preview"
TTS_MODEL = "gemini-3.8-flash-tts"

HERE = Path(__file__).parent
RESULTS = HERE / "results"
PDF_URL = "https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf"
PDF_PATH = HERE / "data" / "esp32-s3_datasheet_en.pdf"

SAMPLE_RATE = 24000

# 2人のホスト。名前は台本の speaker と TTS の speaker の両方で使う
HOSTS = {
    "Aoi": {"voice": "Kore", "role": "解説役。データシートを読み込んでいて、要点を噛み砕いて説明する"},
    "Ren": {"voice": "Puck", "role": "聞き手。電子工作はするがデータシートは苦手。素朴な疑問や驚きを口にする"},
}


class Turn(BaseModel):
    speaker: str = Field(description="話者の名前（Aoi または Ren）")
    text: str = Field(description="話す内容（日本語の話し言葉）")
    style: str = Field(description="話し方の指示（例: 驚いて少し早口で）")
    pages: list[int] = Field(description="この発言の根拠にした PDF のページ番号。雑談や相槌なら空")


class Script(BaseModel):
    title: str = Field(description="この回の音声解説のタイトル")
    turns: list[Turn]


def download_pdf():
    if PDF_PATH.exists():
        return
    PDF_PATH.parent.mkdir(parents=True, exist_ok=True)
    print(f"downloading {PDF_URL}")
    urllib.request.urlretrieve(PDF_URL, PDF_PATH)


def upload_pdf():
    download_pdf()
    return client.files.upload(file=PDF_PATH)


def synthesize(turns: list[Turn], chunk_size: int = 8) -> bytes:
    """台本を TTS で音声にし、16bit / 24kHz / モノラルの PCM を返す"""
    speech_config = types.SpeechConfig(
        multi_speaker_voice_config=types.MultiSpeakerVoiceConfig(
            speaker_voice_configs=[
                types.SpeakerVoiceConfig(
                    speaker=name,
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=host["voice"])
                    ),
                )
                for name, host in HOSTS.items()
            ]
        )
    )
    pcm = b""
    # 長い台本は1回のリクエストに収まらないので、数ターンずつに分けて合成してつなぐ
    for i in range(0, len(turns), chunk_size):
        parts = [
            types.Part(text=t.text, speech_metadata=types.SpeechMetadata(speaker=t.speaker, style=t.style))
            for t in turns[i : i + chunk_size]
        ]
        response = client.models.generate_content(
            model=TTS_MODEL,
            contents=types.Content(role="user", parts=parts),
            config=types.GenerateContentConfig(response_modalities=["AUDIO"], speech_config=speech_config),
        )
        audio = response.candidates[0].content.parts[0].inline_data
        pcm += to_pcm(audio.data, audio.mime_type)
    return pcm


def to_pcm(data: bytes, mime_type: str) -> bytes:
    # gemini-3.8 系の TTS は WAV（ヘッダー付き）、それより前は生の PCM（audio/L16）を返す
    if mime_type.startswith("audio/wav"):
        with wave.open(io.BytesIO(data)) as w:
            return w.readframes(w.getnframes())
    return data


def save_wav(path: Path, pcm: bytes):
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(pcm)
    print(f"saved {path}（{len(pcm) / 2 / SAMPLE_RATE:.1f} 秒）")
