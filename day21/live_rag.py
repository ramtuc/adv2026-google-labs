"""Day 21: File Search × Live API。スタックチャンが声の質問に、データシートを引いて答えられるか

Day 19 では、Live API が Deep-sleep の電流を「数マイクロアンペア程度」とぼかした。そこで、Day 12 のデータシートのストアを
Live API から使う。3 つの条件を比べる。
- none     : 道具なし（Day 19 と同じ）
- native   : Live API の設定に file_search の道具をそのまま入れる
- function : 関数 search_datasheet を渡し、呼ばれたら PC 側で File Search（gemini-3.8-flash、S3 に絞る）に聞いて返す
- cached   : function に、よく聞かれる値の表（データシートで確かめた値）を System Instruction で先に渡す（速くする案 1）
--rag-model で関数の中のモデルを軽いものに替える（速くする案 2）、--live-model で Live のモデルを替える
声の質問は TTS で作り、話し終わり → 最初の音・答えの終わりまでの時間、関数を呼んだか、根拠（grounding・引用）があるかを記録する。

実行: uv run day21/live_rag.py --conds none,native,function --reps 3
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
REPO = HERE.parent
RESULTS = HERE / "results"

spec = importlib.util.spec_from_file_location("live19", REPO / "archive" / "stackchan-live-latency" / "live_latency.py")
live19 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(live19)
client = live19.client

STORE = json.loads((REPO / "day13" / "results" / "store.json").read_text(encoding="utf-8"))["name"]
RAG_MODEL = "gemini-3.8-flash"
LIVE_MODEL = "gemini-3.8-live"

# (名前, 質問, 正しい答えに入っているべきもの, 入っていてはいけないもの)。音声は Day 19 のものも使う
QUESTIONS = [
    ("sram", "ESP32-S3 の内蔵 SRAM は何キロバイト？", r"512", r"520"),
    ("cpu", "ESP32-S3 の CPU は何コアで、最大何メガヘルツ？", r"240", r"160"),
    ("sleep", "ESP32-S3 の Deep-sleep 中の消費電流はどれくらい？", r"(?<![\d.])7\s*(µ|μ|マイクロ|u)", r"0\.\d+\s*(µ|μ|マイクロ)|数マイクロ"),
    ("gpio", "ESP32-S3 の GPIO は何本ある？", r"45", r"34|36"),
    ("classic", "ESP32-S3 で Bluetooth Classic は使える？", r"使えない|使えません|対応していない|対応していません|非対応|LE\s*だけ|LEのみ", None),
]

SYSTEM = ("あなたは机の上の小さなロボット「スタックチャン」です。ESP32-S3 で動いています。日本語で、短く（2文以内で）話してください。")
SYSTEM_TOOL = SYSTEM + ("ESP32-S3 の仕様を聞かれたら、記憶で答えずに、必ずデータシートを調べてから答えてください。"
                        "調べている間は「ちょっと調べるね」と一言だけ言ってください。")

SEARCH_FN = types.Tool(function_declarations=[{
    "name": "search_datasheet",
    "description": "ESP32-S3 のデータシートを検索して、質問の答えとページを返す。仕様の数値はこれで確かめる。",
    "parameters": {"type": "object", "properties": {"question": {"type": "string", "description": "調べたいこと（日本語）"}},
                   "required": ["question"]}}])


def search_datasheet(question: str) -> dict:
    """File Search で ESP32-S3 のデータシートだけを引く（Day 12 の s3 条件と同じ絞り込み）"""
    start = time.perf_counter()
    i = client.interactions.create(
        model=RAG_MODEL, input=question,
        system_instruction="File Search で検索した ESP32-S3 のデータシートだけを根拠に、数値とページを短く答える。載っていなければ「載っていない」と答える。",
        tools=[{"type": "file_search", "file_search_store_names": [STORE], "metadata_filter": 'chip="ESP32-S3"'}])
    pages = set()
    for step in i.steps:
        if step.type != "model_output":
            continue
        for content in step.content:
            for a in getattr(content, "annotations", None) or []:
                if a.type == "file_citation":
                    pages.add(a.page_number)
    return {"answer": i.output_text, "pages": sorted(p for p in pages if p), "seconds": round(time.perf_counter() - start, 1)}


# 速くする案 1：よく聞かれる値を先に持たせる（データシートで確かめた値。表にないことだけ関数で調べる）
CACHED = ("次の表は ESP32-S3 のデータシートで確かめた値です。表にあることは調べずにそのまま答え、表にないことだけ search_datasheet で調べてください。"
          "内蔵 SRAM 512 KB／CPU は Xtensa LX7 デュアルコア、最大 240 MHz／"
          "Deep-sleep の電流 7 µA（RTC メモリだけ電源オン）／GPIO 45 本／Bluetooth は LE だけ、Classic は使えない")


def system_for(cond: str) -> str:
    if cond == "none":
        return SYSTEM
    return SYSTEM_TOOL + (CACHED if cond == "cached" else "")


def tools_for(cond: str):
    if cond == "native":
        return [types.Tool(file_search=types.FileSearch(file_search_store_names=[STORE], metadata_filter='chip="ESP32-S3"'))]
    if cond in ("function", "cached"):
        return [SEARCH_FN]
    return None


async def ask(cond: str, pcm16: bytes) -> dict:
    config = types.LiveConnectConfig(
        response_modalities=["AUDIO"], system_instruction=system_for(cond),
        tools=tools_for(cond),
        input_audio_transcription=types.AudioTranscriptionConfig(),
        output_audio_transcription=types.AudioTranscriptionConfig(),
        # extended-thinking は考える量の指定が要る（指定しないと 1007 で切られる）
        thinking_config=types.ThinkingConfig(thinking_level="LOW") if "thinking" in LIVE_MODEL else None)
    t, said, heard, calls, grounding, audio_bytes = {}, [], [], [], [], 0
    async with client.aio.live.connect(model=LIVE_MODEL, config=config) as session:
        step = live19.IN_RATE * 2 * live19.CHUNK_MS // 1000
        done = asyncio.Event()

        async def sender():
            start, n = time.perf_counter(), 0
            chunks = [pcm16[i:i + step] for i in range(0, len(pcm16), step)]
            while not done.is_set():
                if n == len(chunks):
                    t["speech_end"] = time.perf_counter()
                await session.send_realtime_input(audio=types.Blob(
                    data=chunks[n] if n < len(chunks) else bytes(step), mime_type="audio/pcm;rate=16000"))
                n += 1
                if "speech_end" in t and time.perf_counter() - t["speech_end"] > 50:
                    break
                await asyncio.sleep(max(0, start + n * live19.CHUNK_MS / 1000 - time.perf_counter()))

        task = asyncio.create_task(sender())
        try:
            async with asyncio.timeout(60):
                finished = False
                while not finished:  # receive() は 1 ターンごとに終わるので回し直す
                    async for msg in session.receive():
                        now = time.perf_counter()
                        if msg.tool_call:
                            responses = []
                            for fc in msg.tool_call.function_calls:
                                t.setdefault("first_call", now)
                                # 検索の間も音声の受信を止めないよう、別のスレッドで待つ
                                res = await asyncio.to_thread(search_datasheet, (fc.args or {}).get("question", ""))
                                calls.append({"args": fc.args, **res})
                                responses.append(types.FunctionResponse(id=fc.id, name=fc.name, response=res))
                            t["call_done"] = time.perf_counter()
                            await session.send_tool_response(function_responses=responses)
                        sc = msg.server_content
                        if not sc:
                            continue
                        if sc.grounding_metadata:
                            grounding.append(str(sc.grounding_metadata)[:500])
                        if sc.input_transcription and sc.input_transcription.text:
                            heard.append(sc.input_transcription.text)
                        if sc.output_transcription and sc.output_transcription.text:
                            said.append(sc.output_transcription.text)
                        if sc.model_turn:
                            for part in sc.model_turn.parts or []:
                                if part.inline_data and part.inline_data.data:
                                    t.setdefault("first_audio", now)
                                    if "call_done" in t:
                                        t.setdefault("answer_audio", now)
                                    audio_bytes += len(part.inline_data.data)
                        if sc.turn_complete:
                            t["turn_complete"] = now
                            # 関数を呼んで結果を返した後のターンが終わるまで待つ
                            # native は「ちょっと調べるね」だけでターンを終えることがあるので、続きが来るかも待つ（最大 60 秒）
                            filler_only = cond == "native" and len("".join(said)) < 15
                            if (not calls and not filler_only) or "answer_audio" in t:
                                finished = True
                                break
        except TimeoutError:
            t["timeout"] = True
        done.set()
        await task

    def since(b):
        return round(t[b] - t["speech_end"], 3) if b in t and "speech_end" in t else None

    return {"first_audio_s": since("first_audio"), "answer_audio_s": since("answer_audio"), "turn_s": since("turn_complete"),
            "calls": calls, "grounding": grounding, "heard": "".join(heard).strip(), "said": "".join(said).strip(),
            "reply_audio_s": round(audio_bytes / 2 / live19.OUT_RATE, 2), "timeout": t.get("timeout", False)}


def judge(said: str, ok, ng) -> bool:
    s = said.replace(",", "")
    return bool(re.search(ok, s)) and not (ng and re.search(ng, s))


async def main_async(args):
    qdir = RESULTS / "questions"
    qdir.mkdir(parents=True, exist_ok=True)
    for name, text, _, _ in QUESTIONS:  # Day 19 にない質問の音声を作る
        path = qdir / f"{name}.wav"
        src = live19.QDIR / f"{name}.wav"
        if not path.exists():
            if src.exists():
                path.write_bytes(src.read_bytes())
            else:
                r = client.models.generate_content(
                    model=live19.TTS_MODEL, contents=text,
                    config=types.GenerateContentConfig(response_modalities=["AUDIO"], speech_config=types.SpeechConfig(
                        voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Kore")))))
                live19.write_wav(path, r.candidates[0].content.parts[0].inline_data.data, live19.OUT_RATE)
    out = RESULTS / f"runs{('_' + args.tag) if args.tag else ''}.jsonl"
    qs = [q for q in QUESTIONS if not args.questions or q[0] in args.questions.split(",")]
    for rep in range(1, args.reps + 1):
        for cond in args.conds.split(","):
            for name, text, ok, ng in qs:
                try:
                    r = await ask(cond, live19.read_as_16k(qdir / f"{name}.wav"))
                    correct = judge(r["said"], ok, ng)
                except Exception as e:
                    r, correct = {"error": f"{type(e).__name__}: {e}"[:300]}, None
                row = {"time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "cond": cond, "live_model": LIVE_MODEL,
                       "rag_model": RAG_MODEL, "question": name, "text": text,
                       "rep": rep, **r, "correct": correct}
                with out.open("a", encoding="utf-8") as f:
                    f.write(json.dumps(row, ensure_ascii=False) + "\n")
                print(f"{cond:9} {name:8} {'○' if correct else '×'} 最初の音 {r.get('first_audio_s')} s 答え {r.get('answer_audio_s')} s "
                      f"呼出 {len(r.get('calls', []))} 根拠 {len(r.get('grounding', []))}  「{r.get('said', r.get('error', ''))[:60]}」")


def main():
    global LIVE_MODEL, RAG_MODEL
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--conds", default="none,native,function")
    ap.add_argument("--questions", default="")
    ap.add_argument("--reps", type=int, default=3)
    ap.add_argument("--tag", default="")
    ap.add_argument("--live-model", default=LIVE_MODEL)
    ap.add_argument("--rag-model", default=RAG_MODEL, help="速くする案 2：関数の中で File Search に聞くモデル")
    args = ap.parse_args()
    LIVE_MODEL, RAG_MODEL = args.live_model, args.rag_model
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
