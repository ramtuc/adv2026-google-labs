"""Day 20: Gemma 4 を手元（LM Studio）で動かし、API では渡せなかった全文の条件も含めて答えさせる

day20/gemma_datasheet.py と同じ質問・資料の渡し方・判定を使い、答えるモデルだけを LM Studio の
OpenAI 互換サーバー（http://localhost:1234/v1）に替える。判定は API の gemini-3.1-pro-preview のまま。

実行: uv run day20/gemma_local.py --model google/gemma-4-e4b --conds none,pages,full
"""

import argparse
import importlib.util
import json
import sys
import time
import urllib.request
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location("gd", HERE / "gemma_datasheet.py")
gd = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gd)
qa12 = gd.qa12
URL = "http://localhost:1234/v1/chat/completions"


def answer_local(model: str, cond: str, question: str, context: str) -> tuple[str, dict, float]:
    system = gd.SYSTEM if cond != "none" else qa12.NO_SOURCE_INSTRUCTION
    user = question if cond == "none" else f"資料：\n{context}\n\n質問：{question}"
    body = {"model": model, "temperature": 0.0, "messages": [{"role": "user", "content": f"{system}\n\n{user}"}]}
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    start = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=1800) as r:
            out = json.loads(r.read())
    except Exception as e:
        return f"ERROR {type(e).__name__}: {e}"[:300], {}, 0.0
    u = out.get("usage", {})
    text = out["choices"][0]["message"]["content"] or ""
    return text, {"input": u.get("prompt_tokens"), "output": u.get("completion_tokens")}, round(time.perf_counter() - start, 1)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="google/gemma-4-e4b")
    ap.add_argument("--conds", default="none,pages,full")
    ap.add_argument("--ids", default="")
    args = ap.parse_args()
    pages = gd.load_pages()
    vecs = gd.page_vectors(pages)
    questions = [q for q in qa12.load_questions() if not args.ids or q["id"] in args.ids.split(",")]
    out = gd.RESULTS / "runs_local.jsonl"
    for cond in args.conds.split(","):
        for q in questions:
            context, used = gd.context_for(cond, q["question"], pages, vecs)
            text, usage, secs = answer_local(args.model, cond, q["question"], context)
            v = qa12.judge(q, q["expected"], text)
            row = {"time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "id": q["id"], "category": q["category"],
                   "model": f"local:{args.model}", "cond": cond, "pages_given": used if cond == "pages" else None,
                   "expected_pages": q.get("pages"), "answer": text, "verdict": v.verdict, "reason": v.reason,
                   "usage": usage, "seconds": secs}
            with out.open("a", encoding="utf-8") as f:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
            print(f"{cond:5} {q['id']:3} {args.model:22} {v.verdict} {secs:6.1f} s in {usage.get('input')}  {text[:50]!r}", flush=True)


if __name__ == "__main__":
    main()
