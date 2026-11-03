"""Day 3: Live API で「声の割り込み」に声で答える（低遅延版）

interactive.py は質問のたびに台本を書いてから音声を合成するため、声が返るまで数十秒かかる。
こちらは Live API を使い、リスナーの質問を音声のまま受け取って、音声のまま答えさせる。
質問は interrupt_questions.json の英語版を TTS で読み上げた音声を使う（マイクで話す代わり）。

測るもの:
- 話し終わってから最初の声が返るまでの秒数
- モデルが質問を何と聞き取ったか（入力の文字起こし）
- 何と答えたか（出力の文字起こし）

実行: uv run day03/live_interrupt.py
"""

import array
import asyncio
import io
import json
import time
import wave

from common import HERE, PDF_PATH, RESULTS, SAMPLE_RATE, client, download_pdf, save_wav
from google.genai import types
from pypdf import PdfReader

LIVE_MODEL = "gemini-3.8-live"
QUESTION_VOICE = "Charon"
INPUT_RATE = 16000  # Live API に送る音声は 16kHz

SYSTEM_INSTRUCTION = """You are a host of a podcast that explains the ESP32-S3 datasheet below.
A listener has just interrupted the episode with a question.
- Answer briefly, in a friendly spoken style, in English.
- Use only the datasheet below. If the answer is not in it, say that the datasheet does not cover it.
- If the question has a wrong premise, gently correct it.
- End by saying you will get back to the episode.

# Datasheet
"""


def question_audio(question: str) -> bytes:
    """質問を TTS で読み上げ、Live API に送れる 16kHz の PCM にする"""
    response = client.models.generate_content(
        model="gemini-3.8-flash-tts",
        contents=question,
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=QUESTION_VOICE))
            ),
        ),
    )
    with wave.open(io.BytesIO(response.candidates[0].content.parts[0].inline_data.data)) as w:
        return resample(w.readframes(w.getnframes()), w.getframerate(), INPUT_RATE)


def resample(pcm: bytes, src_rate: int, dst_rate: int) -> bytes:
    # 16bit モノラルを線形補間でサンプリングレート変換する（audioop は Python 3.13 で削除されたため自前で）
    src = array.array("h", pcm)
    n = int(len(src) * dst_rate / src_rate)
    dst = array.array("h", bytes(2 * n))
    for i in range(n):
        x = i * src_rate / dst_rate
        j = int(x)
        k = min(j + 1, len(src) - 1)
        dst[i] = int(src[j] + (src[k] - src[j]) * (x - j))
    return dst.tobytes()


async def ask(datasheet: str, pcm16k: bytes) -> dict:
    config = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        system_instruction=SYSTEM_INSTRUCTION + datasheet,
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
    )
    async with client.aio.live.connect(model=LIVE_MODEL, config=config) as session:
        # マイクから話すのと同じように、0.1 秒ずつ実時間で流し込む
        chunk = INPUT_RATE * 2 // 10
        for i in range(0, len(pcm16k), chunk):
            await session.send_realtime_input(audio=types.Blob(data=pcm16k[i : i + chunk], mime_type=f"audio/pcm;rate={INPUT_RATE}"))
            await asyncio.sleep(0.1)
        await session.send_realtime_input(audio_stream_end=True)

        start = time.perf_counter()
        first_audio = None
        heard, said, audio = "", "", b""
        async for message in session.receive():
            content = message.server_content
            if not content:
                continue
            if content.input_transcription and content.input_transcription.text:
                heard += content.input_transcription.text
            if content.output_transcription and content.output_transcription.text:
                said += content.output_transcription.text
            if content.model_turn:
                for part in content.model_turn.parts:
                    if part.inline_data:
                        if first_audio is None:
                            first_audio = time.perf_counter() - start
                        audio += part.inline_data.data
            if content.turn_complete:
                break
    return {"heard": heard.strip(), "said": said.strip(), "first_audio_seconds": round(first_audio, 2), "audio": audio}


def main():
    download_pdf()
    datasheet = "\n".join(p.extract_text() or "" for p in PdfReader(PDF_PATH).pages)
    questions = json.loads((HERE / "interrupt_questions.json").read_text(encoding="utf-8"))

    results = []
    for q in questions:
        print(f"--- {q['id']} [{q['category']}] {q['question_en']}")
        result = asyncio.run(ask(datasheet, question_audio(q["question_en"])))
        print(f"  聞き取り: {result['heard']}")
        print(f"  答え: {result['said']}")
        print(f"  最初の声まで: {result['first_audio_seconds']} 秒")
        save_wav(RESULTS / f"live_{q['id']}.wav", result.pop("audio"))
        results.append({**q, **result})

    out = RESULTS / "live_interrupt.json"
    out.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nsaved {out}")


if __name__ == "__main__":
    main()
