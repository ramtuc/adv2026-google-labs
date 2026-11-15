"""Day 20: Live API の関数呼び出しで、スタックチャンの表情・首・LED を動かす（PC で本体の代わりをする）

本体のファーム（stack-chan の PLAY）でできることを、そのまま関数にして Live API に渡す。
- set_face(emotion, text)  表情は純正の 6 種類だけ。吹き出しは英数字だけ（日本語のフォントがまだない）
- move_head(yaw_deg, pitch_deg)  左右は ±60 度くらいまで、上下は 5〜85 度（純正の推奨範囲）
- set_led(r, g, b)  各 0〜64（まぶしいので）
声の指示（TTS で作った音声）を渡し、どの関数をどんな引数で呼んだか、範囲を守ったか、返事の音声との順番と待ち時間を記録する。
本体の代わりに、範囲の外の値は範囲に収めて「こう動かした」と返す（ファームと同じ扱い）。

実行: uv run archive/stackchan-live-tools/live_tools.py --reps 3
"""

import argparse
import asyncio
import importlib.util
import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path

from google.genai import types

HERE = Path(__file__).parent
RESULTS = HERE / "results"

# Day 19 の音声の作り方と Live API の接続をそのまま使う
spec = importlib.util.spec_from_file_location("live19", HERE.parent / "stackchan-live-latency" / "live_latency.py")
live19 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(live19)
client, types_ = live19.client, types

EMOTIONS = ["Neutral", "Happy", "Angry", "Sad", "Doubt", "Sleepy"]
TOOLS = [types.Tool(function_declarations=[
    {"name": "set_face", "description": "顔の表情と吹き出しを変える。吹き出しは英数字と記号だけ表示できる（日本語は表示できない）。",
     "parameters": {"type": "object", "properties": {
         "emotion": {"type": "string", "enum": EMOTIONS},
         "text": {"type": "string", "description": "吹き出しの文字。英数字だけ。16文字まで。空なら吹き出しを消す"}},
         "required": ["emotion"]}},
    {"name": "move_head", "description": "首を動かす。yaw は左右（0 が正面、正が自分から見て右、負が左、-60〜60）、pitch は上下（5 がいちばん下、85 がいちばん上、45 が正面）。",
     "parameters": {"type": "object", "properties": {
         "yaw_deg": {"type": "number", "minimum": -60, "maximum": 60},
         "pitch_deg": {"type": "number", "minimum": 5, "maximum": 85}},
         "required": ["yaw_deg", "pitch_deg"]}},
    {"name": "set_led", "description": "胴体の LED の色を変える。各色 0〜64（それより明るくはできない）。全部 0 で消える。",
     "parameters": {"type": "object", "properties": {
         "r": {"type": "integer", "minimum": 0, "maximum": 64},
         "g": {"type": "integer", "minimum": 0, "maximum": 64},
         "b": {"type": "integer", "minimum": 0, "maximum": 64}},
         "required": ["r", "g", "b"]}},
])]

GRACE = 8  # ターンが終わった後、遅れて来る関数呼び出しを待つ秒数

SYSTEM = ("あなたは机の上の小さなロボット「スタックチャン」です。ESP32-S3 で動いています。"
          "日本語で、短く（1〜2文で）話してください。話す内容に合わせて、表情・首・LED を関数で動かしてください。")

# (名前, 声の指示, 確かめること)。確かめることは関数呼び出しの列を受け取り、(合格か, 理由) を返す
def _calls(cs, name):
    return [c["args"] for c in cs if c["name"] == name]


def check_right(cs):
    h = _calls(cs, "move_head")
    return (bool(h) and h[-1].get("yaw_deg", 0) > 10, f"move_head {h}")


def check_happy(cs):
    f = _calls(cs, "set_face")
    return (any(a.get("emotion") == "Happy" for a in f), f"set_face {f}")


def check_behind(cs):
    h = _calls(cs, "move_head")
    ok = bool(h) and all(-60 <= a.get("yaw_deg", 0) <= 60 for a in h)
    return (ok, f"move_head {h}")


def check_bubble_ascii(cs):
    f = _calls(cs, "set_face")
    texts = [a.get("text", "") for a in f if a.get("text")]
    return (bool(texts) and all(t.isascii() and len(t) <= 16 for t in texts), f"text {texts}")


def check_led_cap(cs):
    l = _calls(cs, "set_led")
    return (bool(l) and all(0 <= l_[k] <= 64 for l_ in l for k in "rgb" if k in l_), f"set_led {l}")


def check_sleepy(cs):
    f, l = _calls(cs, "set_face"), _calls(cs, "set_led")
    return (any(a.get("emotion") == "Sleepy" for a in f), f"set_face {f} set_led {l}")


SCENES = [
    ("right", "ねえ、右のほうを見てみて。", check_right),
    ("happy", "聞いて！ 今日、試験に合格したんだ！", check_happy),
    ("behind", "真後ろを振り返ってみて。", check_behind),  # 180 度は回れない。範囲の中で返すか
    ("bubble", "吹き出しに『こんにちは』って出して。", check_bubble_ascii),  # 日本語は表示できない
    ("led_max", "LED をいちばん明るい白にして。", check_led_cap),  # 64 までしか上げられない
    ("sleepy", "もう夜遅いね。そろそろ寝る時間だよ。", check_sleepy),
]


def clamp(name, args):
    a = dict(args)
    if name == "move_head":
        a["yaw_deg"] = max(-60, min(60, a.get("yaw_deg", 0)))
        a["pitch_deg"] = max(5, min(85, a.get("pitch_deg", 45)))
    if name == "set_led":
        for k in "rgb":
            a[k] = max(0, min(64, int(a.get(k, 0))))
    if name == "set_face":
        if a.get("emotion") not in EMOTIONS:
            return {"ok": False, "error": f"emotion は {EMOTIONS} のどれか"}
        t = a.get("text", "")
        if t and not t.isascii():
            return {"ok": False, "error": "吹き出しは英数字だけ表示できる"}
    return {"ok": True, "applied": a}


async def run_scene(model: str, pcm16: bytes) -> dict:
    config = types.LiveConnectConfig(
        response_modalities=["AUDIO"], system_instruction=SYSTEM, tools=TOOLS,
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        thinking_config=types.ThinkingConfig(thinking_level="LOW") if "thinking" in model else None)
    t, calls, events, said, heard, audio_bytes = {}, [], [], [], [], 0
    async with client.aio.live.connect(model=model, config=config) as session:
        step = live19.IN_RATE * 2 * live19.CHUNK_MS // 1000
        done = asyncio.Event()

        async def sender():
            start, n = time.perf_counter(), 0
            chunks = [pcm16[i:i + step] for i in range(0, len(pcm16), step)]
            while not done.is_set():
                data = chunks[n] if n < len(chunks) else bytes(step)
                if n == len(chunks):
                    t["speech_end"] = time.perf_counter()
                await session.send_realtime_input(audio=types.Blob(data=data, mime_type="audio/pcm;rate=16000"))
                n += 1
                if "speech_end" in t and time.perf_counter() - t["speech_end"] > 25:
                    break
                await asyncio.sleep(max(0, start + n * live19.CHUNK_MS / 1000 - time.perf_counter()))

        task = asyncio.create_task(sender())
        try:
            async with asyncio.timeout(45):
                # receive() は 1 ターンごとに終わるので回し直す。話し終えてから関数を呼ぶモデルもある
                # （extended-thinking はターンの終わりから約 2 秒後）ので、ターンが終わっても GRACE 秒は待つ
                waiting_answer = True
                while True:
                    try:
                        async with asyncio.timeout(None if waiting_answer else GRACE):
                            async for msg in session.receive():
                                now = time.perf_counter()
                                if msg.tool_call:
                                    t.setdefault("first_call", now)
                                    t["last_call"] = now
                                    responses = []
                                    for fc in msg.tool_call.function_calls:
                                        res = clamp(fc.name, fc.args or {})
                                        calls.append({"name": fc.name, "args": fc.args or {}, "result": res})
                                        events.append(("call", fc.name, round(now - t.get("speech_end", now), 3)))
                                        responses.append(types.FunctionResponse(id=fc.id, name=fc.name, response=res))
                                    await session.send_tool_response(function_responses=responses)
                                sc = msg.server_content
                                if not sc:
                                    continue
                                if sc.input_transcription and sc.input_transcription.text:
                                    heard.append(sc.input_transcription.text)
                                if sc.output_transcription and sc.output_transcription.text:
                                    said.append(sc.output_transcription.text)
                                if sc.model_turn:
                                    for part in sc.model_turn.parts or []:
                                        if part.inline_data and part.inline_data.data:
                                            if "first_audio" not in t:
                                                t["first_audio"] = now
                                                events.append(("audio", "", round(now - t.get("speech_end", now), 3)))
                                            t["last_audio"] = now
                                            audio_bytes += len(part.inline_data.data)
                                if sc.turn_complete:
                                    t["turn_complete"] = now
                                    break
                    except TimeoutError:
                        break  # GRACE 秒、何も来なかった
                    # 関数を呼んだ後にまだ話していなければ、関数の結果を受けて話し出すのを待つ
                    waiting_answer = t.get("last_call", 0) > t.get("last_audio", 0)
        except TimeoutError:
            t["timeout"] = True
        done.set()
        await task

    def since(b):
        return round(t[b] - t["speech_end"], 3) if b in t and "speech_end" in t else None

    return {"first_call_s": since("first_call"), "first_audio_s": since("first_audio"), "turn_s": since("turn_complete"),
            "calls": calls, "order": events, "heard": "".join(heard).strip(), "said": "".join(said).strip(),
            "reply_audio_s": round(audio_bytes / 2 / live19.OUT_RATE, 2), "timeout": t.get("timeout", False)}


async def main_async(args):
    RESULTS.mkdir(exist_ok=True)
    qdir = RESULTS / "scenes"
    qdir.mkdir(exist_ok=True)
    scenes = [s for s in SCENES if not args.scenes or s[0] in args.scenes.split(",")]
    for name, text, _ in scenes:  # 指示の音声を作る（一度だけ）
        path = qdir / f"{name}.wav"
        if not path.exists():
            r = client.models.generate_content(
                model=live19.TTS_MODEL, contents=text,
                config=types.GenerateContentConfig(response_modalities=["AUDIO"], speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Kore")))))
            live19.write_wav(path, r.candidates[0].content.parts[0].inline_data.data, live19.OUT_RATE)
    out = RESULTS / f"runs{('_' + args.tag) if args.tag else ''}.jsonl"
    for rep in range(1, args.reps + 1):
        for model in args.models.split(","):
            for name, text, check in scenes:
                pcm = live19.read_as_16k(qdir / f"{name}.wav")
                try:
                    r = await run_scene(model, pcm)
                    ok, why = check(r["calls"])
                except Exception as e:
                    r, ok, why = {"error": f"{type(e).__name__}: {e}"[:300]}, None, ""
                row = {"time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "model": model, "scene": name,
                       "text": text, "rep": rep, **r, "pass": ok, "why": why}
                with out.open("a", encoding="utf-8") as f:
                    f.write(json.dumps(row, ensure_ascii=False) + "\n")
                names = ",".join(c["name"] for c in r.get("calls", []))
                print(f"{model:32} {name:8} {'○' if ok else '×'} 関数 {r.get('first_call_s')} s 音 {r.get('first_audio_s')} s "
                      f"[{names}] {why[:70]}  「{r.get('said', r.get('error', ''))[:40]}」")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", default="gemini-3.8-live")
    ap.add_argument("--scenes", default="")
    ap.add_argument("--reps", type=int, default=3)
    ap.add_argument("--tag", default="")
    asyncio.run(main_async(ap.parse_args()))


if __name__ == "__main__":
    main()
