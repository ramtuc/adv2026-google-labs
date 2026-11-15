"""Day 8: 絵本アプリが送っていた TTS のリクエストを、API のバージョンと項目を変えて送り、どれが通るかを確かめる。

実行: uv run --with google-genai --with python-dotenv python day08/check_tts.py
"""
import os

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
TEXT = "しとしと、あめのひがやってきました。"
MODEL = "gemini-3.8-flash-lite-tts"


def tts(api_version, with_meta):
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"],
                          http_options=types.HttpOptions(api_version=api_version))
    part = {"text": TEXT}
    if with_meta:
        part["speechMetadata"] = {"style": "Warm, gentle storyteller"}  # アプリが送っていた項目
    cfg = types.GenerateContentConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Kore"))))
    r = client.models.generate_content(model=MODEL, contents=[{"role": "user", "parts": [part]}], config=cfg)
    data = r.candidates[0].content.parts[0].inline_data
    return f"OK {data.mime_type} {len(data.data)} bytes"


for v, m in [("v1", True), ("v1beta", True), ("v1alpha", True), ("v1beta", False)]:
    try:
        print(v, "speechMetadata" if m else "なし", "->", tts(v, m))
    except Exception as e:
        print(v, "speechMetadata" if m else "なし", "->", str(e)[:160])
