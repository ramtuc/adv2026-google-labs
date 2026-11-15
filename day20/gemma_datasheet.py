"""Day 24: Gemma 4（オープンなモデル）に ESP32-S3 のデータシートを渡して、Gemini と同じ質問に答えさせる

スタックチャンをいずれ手元のモデルで動かすための下調べ。Gemma 4 は API（Gemini API の gemma-4-*）で試す。
Gemma は File Search を使えないので、資料の渡し方を 3 つ比べる。
- none  : 資料なし（モデルの知識だけ）
- pages : データシートのページを埋め込み（gemini-embedding-2）で探し、近い 6 ページだけを渡す（小さな機械でも回せる量）
- full  : データシートの全文（pypdf で取り出した文字、約 5 万トークン）を渡す
質問は Day 12 と同じ 15 問（Day 2 の 9 問 ＋ 取り違えを誘う 6 問）。判定も Day 12 と同じ（gemini-3.1-pro-preview）。

実行: uv run day20/gemma_datasheet.py --models gemma-4-31b-it,gemma-4-26b-a4b-it,gemini-3.8-flash --conds none,pages,full
"""

import argparse
import importlib.util
import json
import math
import sys
import time
from datetime import datetime
from pathlib import Path

from google.genai import types
from pypdf import PdfReader

HERE = Path(__file__).parent
REPO = HERE.parent
RESULTS = HERE / "results"
PDF = REPO / "day13" / "data" / "esp32-s3_datasheet_en.pdf"
EMBED = "gemini-embedding-2"
TOP_K = 6

# Day 12 の質問・期待する答え・判定をそのまま使う
spec = importlib.util.spec_from_file_location("qa12", REPO / "day13" / "file_search_qa.py")
qa12 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa12)
client = qa12.client

SYSTEM = """あなたは、渡された資料（ESP32-S3 のデータシート）だけを根拠に答えるアシスタントです。
- 資料に書かれていないことは、推測や一般知識で補わない。その場合は「資料には記載がない」と述べる。
- 質問の前提が資料と食い違う場合は、その食い違いを指摘する。
- 根拠にしたページ番号を書く。
- 日本語で答える。"""


def load_pages() -> list[str]:
    cache = RESULTS / "pages.json"
    if cache.exists():
        return json.loads(cache.read_text(encoding="utf-8"))
    pages = [p.extract_text() or "" for p in PdfReader(PDF).pages]
    cache.write_text(json.dumps(pages, ensure_ascii=False), encoding="utf-8")
    return pages


def embed(texts: list[str], task: str) -> list[list[float]]:
    # gemini-embedding-2 は文字列のリストを 1 つの入力としてまとめてしまうので、1 つずつ送る
    out = []
    for text in texts:
        r = client.models.embed_content(model=EMBED, contents=text, config=types.EmbedContentConfig(task_type=task))
        out.append(r.embeddings[0].values)
    return out


def page_vectors(pages: list[str]) -> list[list[float]]:
    cache = RESULTS / "page_vectors.json"
    if cache.exists():
        return json.loads(cache.read_text(encoding="utf-8"))
    vecs = embed([p[:6000] or " " for p in pages], "RETRIEVAL_DOCUMENT")
    cache.write_text(json.dumps(vecs), encoding="utf-8")
    return vecs


def cos(a, b):
    return sum(x * y for x, y in zip(a, b)) / (math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b)))


def context_for(cond: str, question: str, pages: list[str], vecs) -> tuple[str, list[int]]:
    if cond == "none":
        return "", []
    if cond == "full":
        return "\n".join(f"--- p.{i + 1} ---\n{p}" for i, p in enumerate(pages)), list(range(1, len(pages) + 1))
    q = embed([question], "RETRIEVAL_QUERY")[0]
    top = sorted(range(len(pages)), key=lambda i: -cos(q, vecs[i]))[:TOP_K]
    top.sort()
    return "\n".join(f"--- p.{i + 1} ---\n{pages[i]}" for i in top), [i + 1 for i in top]


def answer(model: str, cond: str, question: str, context: str) -> tuple[str, dict, float]:
    system = SYSTEM if cond != "none" else qa12.NO_SOURCE_INSTRUCTION
    contents = question if cond == "none" else f"資料：\n{context}\n\n質問：{question}"
    # Gemma は system_instruction を受け付けないので、先頭に入れる
    if model.startswith("gemma"):
        contents, config = f"{system}\n\n{contents}", types.GenerateContentConfig(temperature=0.0)
    else:
        config = types.GenerateContentConfig(system_instruction=system, temperature=0.0)
    start = time.perf_counter()
    for attempt in range(3):
        try:
            r = client.models.generate_content(model=model, contents=contents, config=config)
            break
        except Exception as e:  # 混み合いなどは少し待って繰り返す
            if attempt == 2:
                return f"ERROR {type(e).__name__}: {e}"[:300], {}, 0.0
            time.sleep(20)
    u = r.usage_metadata
    return r.text or "", {"input": u.prompt_token_count, "output": u.candidates_token_count}, round(time.perf_counter() - start, 1)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", default="gemma-4-31b-it,gemma-4-26b-a4b-it,gemini-3.8-flash")
    ap.add_argument("--conds", default="none,pages,full")
    ap.add_argument("--ids", default="")
    args = ap.parse_args()
    RESULTS.mkdir(exist_ok=True)
    pages = load_pages()
    vecs = page_vectors(pages)
    questions = [q for q in qa12.load_questions() if not args.ids or q["id"] in args.ids.split(",")]
    out = RESULTS / "runs.jsonl"
    for cond in args.conds.split(","):
        for q in questions:
            context, used = context_for(cond, q["question"], pages, vecs)
            for model in args.models.split(","):
                text, usage, secs = answer(model, cond, q["question"], context)
                v = qa12.judge(q, q["expected"], text)
                row = {"time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "id": q["id"], "category": q["category"],
                       "model": model, "cond": cond, "pages_given": used if cond == "pages" else None,
                       "expected_pages": q.get("pages"), "answer": text, "verdict": v.verdict, "reason": v.reason,
                       "usage": usage, "seconds": secs}
                with out.open("a", encoding="utf-8") as f:
                    f.write(json.dumps(row, ensure_ascii=False) + "\n")
                print(f"{cond:5} {q['id']:3} {model:22} {v.verdict} {secs:5.1f} s  {text[:50]!r}")


if __name__ == "__main__":
    main()
