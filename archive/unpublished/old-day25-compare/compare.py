"""Day 25: Day 5 の評価ハーネスで、この連載で使った「答え方」を同じ 14 問で比べる

Day 5 の testcases.json（ESP32-S3 の 14 問：基本仕様・計算・前提の誤り・指示の上書きなど）を、次の経路で答えさせる。
- flash-lite : Day 5 と同じ gemini-3.5-flash-lite ＋ System Prompt B（Day 5 の基準）
- flash      : gemini-3.8-flash ＋ System Prompt B
- filesearch : File Search（Day 12 のストア、S3 に絞る）＋ gemini-3.8-flash（Day 12・21）
- live       : Live API（gemini-3.8-live）に文字で聞き、声の書き起こしを答えとする（Day 19〜21）
- gemma      : Gemma 4 31B ＋ System Prompt B、資料なし（Day 24）
- gemma-rag  : Gemma 4 31B ＋ 埋め込みで探したデータシート 6 ページ（Day 24）
採点は Day 5 と同じ（must_include のコード判定と、gemini-3.1-pro-preview の 3 段階の採点）。

実行: uv run day25/compare.py --routes flash-lite,flash,filesearch,live,gemma,gemma-rag
"""

import argparse
import asyncio
import importlib.util
import json
import sys
import time
from datetime import datetime
from pathlib import Path

from google.genai import types

HERE = Path(__file__).parent
REPO = HERE.parent
RESULTS = HERE / "results"


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


day5 = load("day5", REPO / "day05" / "evaluate.py")
day24 = load("day24", REPO / "day24" / "gemma_datasheet.py")
client = day5.client
PROMPT_B = day5.PROMPTS["B"]
STORE = json.loads((REPO / "day12" / "results" / "store.json").read_text(encoding="utf-8"))["name"]


def plain(model: str, q: str) -> str:
    if model.startswith("gemma"):  # Gemma は system_instruction を受け付けない
        r = client.models.generate_content(model=model, contents=f"{PROMPT_B}\n\n{q}")
    else:
        r = client.models.generate_content(model=model, contents=q,
                                           config=types.GenerateContentConfig(system_instruction=PROMPT_B))
    return r.text or ""


def filesearch(q: str) -> str:
    i = client.interactions.create(
        model="gemini-3.8-flash", input=q, system_instruction=PROMPT_B,
        tools=[{"type": "file_search", "file_search_store_names": [STORE], "metadata_filter": 'chip="ESP32-S3"'}])
    return i.output_text or ""


async def live_async(q: str) -> str:
    config = types.LiveConnectConfig(response_modalities=["AUDIO"], system_instruction=PROMPT_B,
                                     output_audio_transcription=types.AudioTranscriptionConfig())
    said = []
    async with client.aio.live.connect(model="gemini-3.8-live", config=config) as session:
        await session.send_realtime_input(text=q)
        async with asyncio.timeout(60):
            async for msg in session.receive():
                sc = msg.server_content
                if sc and sc.output_transcription and sc.output_transcription.text:
                    said.append(sc.output_transcription.text)
                if sc and sc.turn_complete:
                    break
    return "".join(said).strip()


def gemma_rag(q: str, pages, vecs) -> str:
    context, _ = day24.context_for("pages", q, pages, vecs)
    text, _, _ = day24.answer("gemma-4-31b-it", "pages", q, context)
    return text


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--routes", default="flash-lite,flash,filesearch,live,gemma,gemma-rag")
    ap.add_argument("--ids", default="")
    args = ap.parse_args()
    RESULTS.mkdir(exist_ok=True)
    cases = json.loads((REPO / "day05" / "testcases.json").read_text(encoding="utf-8"))
    cases = [c for c in cases if not args.ids or c["id"] in args.ids.split(",")]
    pages, vecs = day24.load_pages(), day24.page_vectors(day24.load_pages())
    routes = {
        "flash-lite": lambda q: plain("gemini-3.5-flash-lite", q),
        "flash": lambda q: plain("gemini-3.8-flash", q),
        "filesearch": filesearch,
        "live": lambda q: asyncio.run(live_async(q)),
        "gemma": lambda q: plain("gemma-4-31b-it", q),
        "gemma-rag": lambda q: gemma_rag(q, pages, vecs),
    }
    out = RESULTS / "runs.jsonl"
    for case in cases:
        for name in args.routes.split(","):
            start = time.perf_counter()
            try:
                output = routes[name](case["input"])
            except Exception as e:
                output = f"ERROR {type(e).__name__}: {e}"[:300]
            secs = round(time.perf_counter() - start, 1)
            j = day5.judge(case, output)
            row = {"time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "id": case["id"], "category": case["category"],
                   "route": name, "output": output, "seconds": secs,
                   "code_check": day5.code_check(output, case["must_include"]) if case["must_include"] else None,
                   "judge": j}
            with out.open("a", encoding="utf-8") as f:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
            print(f"{case['id']} {name:10} {j['category']:5} code={row['code_check']} {secs:5.1f} s  {output[:50]!r}", flush=True)


if __name__ == "__main__":
    main()
