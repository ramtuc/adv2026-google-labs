"""Day 19: Live API に声で ESP32-S3 のことを聞き、返事が始まるまでの時間と答えの正しさを測る

スタックチャンにつなぐ前に、PC だけで Live API の性質を調べる。
1. 質問の音声を TTS（gemini-3.8-flash-tts）で作る（results/questions/*.wav、16 kHz に変換したものを送る）
2. Live API に 20 ms ずつ、実際の時間の速さで流す（マイクから話したのと同じ）。話し終わりの後は無音を流し続け、
   自動の発話検出（VAD）で区切らせる
3. 話し終わり → 最初の音声が届くまで（返事の待ち時間）、返事の終わりまで、書き起こし（入力・出力）を記録する
4. 書き起こしから、答えに正しい値が入っているかを判定する

実行: uv run archive/stackchan-live-latency/live_latency.py --models gemini-3.8-live --reps 3
"""

import argparse
import asyncio
import audioop  # Python 3.12 まで。16 kHz への変換に使う
import json
import os
import re
import sys
import time
import wave
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

HERE = Path(__file__).parent
RESULTS = HERE / "results"
QDIR = RESULTS / "questions"
TTS_MODEL = "gemini-3.8-flash-tts"
IN_RATE, OUT_RATE = 16000, 24000  # Live API の入力は 16 kHz、出力は 24 kHz（どちらも 16 bit モノラル）
CHUNK_MS = 20
GRACE = 8  # ターンが終わった後、続きのターンを待つ秒数

# (名前, 質問, 正しい答えに入っているべきもの（正規表現）, 入っていてはいけないもの)
QUESTIONS = [
    ("hello", "こんにちは。今日の調子はどう？", None, None),
    ("sram", "ESP32-S3 の内蔵 SRAM は何キロバイト？", r"512", r"520"),
    # 書き起こしは「2 4 ghz」と点が落ちることがある
    ("wifi5g", "ESP32-S3 の Wi-Fi は 5 GHz に対応してる？", r"2\s*[.．\s]\s*4\s*(g|ギガ)|にてん?よん",
     r"5\s*GHz[^。]*(に|にも)対応して(い)?ます(?!ん)"),
    ("cpu", "ESP32-S3 の CPU は何コアで、最大何メガヘルツ？", r"240|二百四十", None),
    ("sleep", "ESP32-S3 の Deep-sleep 中の消費電流はどれくらい？", r"(?<!\d)(7|８|8)\s*(µ|μ|マイクロ|u)", None),
]

SYSTEM = ("あなたは机の上の小さなロボット「スタックチャン」です。ESP32-S3 で動いています。"
          "日本語で、短く（2文以内で）話してください。")


def make_question_audio():
    """TTS で質問の音声を作る（一度作ったものは使い回す）"""
    QDIR.mkdir(parents=True, exist_ok=True)
    for name, text, _, _ in QUESTIONS:
        path = QDIR / f"{name}.wav"
        if path.exists():
            continue
        r = client.models.generate_content(
            model=TTS_MODEL, contents=text,  # 読み方の指示を書くと、それも読み上げてしまう
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Kore")))))
        pcm24 = r.candidates[0].content.parts[0].inline_data.data
        write_wav(path, pcm24, OUT_RATE)
        print(f"TTS {name}: {len(pcm24) / 2 / OUT_RATE:.1f} s")


def write_wav(path: Path, pcm: bytes, rate: int):
    if pcm[:4] == b"RIFF":  # 2026-11-15 に判明：TTS は audio/wav で返す。ヘッダーごと包むと、頭と末尾が雑音として鳴る
        import io
        with wave.open(io.BytesIO(pcm)) as src:
            pcm, rate = src.readframes(src.getnframes()), src.getframerate()
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm)


def read_as_16k(path: Path) -> bytes:
    with wave.open(str(path)) as w:
        pcm, rate = w.readframes(w.getnframes()), w.getframerate()
    # TTS の音声は最後の 0.2 秒ほどに「プツッ」という雑音が付くので、最後の無音より後ろを切る。
    # 切らないと、話し終わりの時刻が実際より遅れ、返事の待ち時間が短く（ときにマイナスに）出る
    step = rate // 20 * 2  # 50 ms
    quiet = [audioop.rms(pcm[i:i + step], 2) < 500 for i in range(0, len(pcm), step)]
    for k in range(len(quiet) - 1, max(0, len(quiet) - 14), -1):
        if quiet[k] and quiet[k - 1]:
            pcm = pcm[:(k - 1) * step]
            break
    while pcm and audioop.rms(pcm[-step:], 2) < 500:  # 話し終わりの後の無音も切る
        pcm = pcm[:-step]
    if rate != IN_RATE:
        pcm, _ = audioop.ratecv(pcm, 2, 1, rate, IN_RATE, None)
    return pcm


async def ask(model: str, pcm16: bytes, out_wav: Path) -> dict:
    config = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        system_instruction=SYSTEM,
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        # extended-thinking は考える量を指定しないと 1007 で切られる
        thinking_config=types.ThinkingConfig(thinking_level="LOW") if "thinking" in model else None,
    )
    t = {"connect_start": time.perf_counter()}
    in_text, out_text, audio = [], [], bytearray()
    async with client.aio.live.connect(model=model, config=config) as session:
        t["connected"] = time.perf_counter()
        step = IN_RATE * 2 * CHUNK_MS // 1000
        silence = bytes(step)
        done = asyncio.Event()

        async def sender():
            start = time.perf_counter()
            n = 0
            for i in range(0, len(pcm16), step):
                await session.send_realtime_input(audio=types.Blob(data=pcm16[i:i + step], mime_type="audio/pcm;rate=16000"))
                n += 1
                # 実際の時間の速さで送る（マイクと同じ）
                await asyncio.sleep(max(0, start + n * CHUNK_MS / 1000 - time.perf_counter()))
            t["speech_end"] = time.perf_counter()
            # 話し終わりの後は、返事が終わるまで無音を流し続ける（最大 20 秒）
            while not done.is_set() and time.perf_counter() - t["speech_end"] < 20:
                await session.send_realtime_input(audio=types.Blob(data=silence, mime_type="audio/pcm;rate=16000"))
                n += 1
                await asyncio.sleep(max(0, start + n * CHUNK_MS / 1000 - time.perf_counter()))

        send_task = asyncio.create_task(sender())
        turns = []  # ターンごとの (話し終わりからの秒数, 言ったこと)
        try:
            async with asyncio.timeout(40):
                # receive() は 1 ターンごとに終わる。「調べますね」と一度ターンを終えてから続きを話すモデルが
                # あった（extended-thinking）ので、ターンが終わっても GRACE 秒は次のターンを待つ
                first = True
                while True:
                    try:
                        async with asyncio.timeout(None if first else GRACE):
                            async for msg in session.receive():
                                sc = msg.server_content
                                if not sc:
                                    continue
                                if sc.input_transcription and sc.input_transcription.text:
                                    in_text.append(sc.input_transcription.text)
                                if sc.output_transcription and sc.output_transcription.text:
                                    out_text.append(sc.output_transcription.text)
                                if sc.model_turn:
                                    for part in sc.model_turn.parts or []:
                                        if part.inline_data and part.inline_data.data:
                                            t.setdefault("first_audio", time.perf_counter())
                                            audio.extend(part.inline_data.data)
                                if sc.turn_complete:
                                    t["turn_complete"] = time.perf_counter()
                                    said = "".join(out_text).strip()
                                    turns.append((round(t["turn_complete"] - t.get("speech_end", t["turn_complete"]), 3),
                                                  said[len("".join(x[1] for x in turns)):]))
                                    break
                    except TimeoutError:
                        break
                    first = False
        except TimeoutError:
            t["timeout"] = time.perf_counter()
        done.set()
        await send_task
    write_wav(out_wav, bytes(audio), OUT_RATE)

    def since(a, b):
        return round(t[b] - t[a], 3) if a in t and b in t else None

    return {"connect_s": since("connect_start", "connected"),
            "latency_s": since("speech_end", "first_audio"),  # 話し終わり → 返事の音が届くまで
            "turn_s": since("speech_end", "turn_complete"),
            "reply_audio_s": round(len(audio) / 2 / OUT_RATE, 2),
            "heard": "".join(in_text).strip(), "said": "".join(out_text).strip(),
            "turns": turns, "timeout": "timeout" in t}


def judge(said: str, ok, ng):
    if ok is None:
        return None
    s = said.replace(",", "")
    return bool(re.search(ok, s, re.I)) and not (ng and re.search(ng, s, re.I))


async def main_async(args):
    out_path = RESULTS / f"runs{('_' + args.tag) if args.tag else ''}.jsonl"
    (RESULTS / "replies").mkdir(parents=True, exist_ok=True)
    qs = [q for q in QUESTIONS if not args.questions or q[0] in args.questions.split(",")]
    for rep in range(1, args.reps + 1):
        for model in args.models.split(","):
            for name, text, ok, ng in qs:
                pcm = read_as_16k(QDIR / f"{name}.wav")
                wav = RESULTS / "replies" / f"{model}_{name}_{rep}.wav"
                try:
                    r = await ask(model, pcm, wav)
                except Exception as e:  # モデルが使えないなどを記録して続ける
                    r = {"error": f"{type(e).__name__}: {e}"[:300]}
                row = {"time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "model": model, "question": name,
                       "text": text, "rep": rep, **r, "correct": judge(r.get("said", ""), ok, ng)}
                with out_path.open("a", encoding="utf-8") as f:
                    f.write(json.dumps(row, ensure_ascii=False) + "\n")
                print(f"{model:40} {name:7} 待ち {r.get('latency_s')} s  正しさ {row['correct']}  "
                      f"「{r.get('said', r.get('error', ''))[:60]}」")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", default="gemini-3.8-live")
    ap.add_argument("--questions", default="")
    ap.add_argument("--reps", type=int, default=3)
    ap.add_argument("--tag", default="")
    args = ap.parse_args()
    make_question_audio()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
