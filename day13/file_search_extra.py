"""Day 13: File Search と比べるための、追加の条件

- whole : ESP32-S3 のデータシート（87 ページ）を丸ごとモデルに渡して答える（RAG を使わない）。
          File Search の s3（S3 だけに絞る）と同じ資料の範囲で、検索の有無を比べる
- chunk : チャンクを小さく（200 トークン、重なり 20）したストアを別に作り、絞り込みなし（all と同じ）で答える。
          既定の分割と比べて、取り違えや答えが変わるかを見る

質問、期待する答え、判定のしかたは file_search_qa.py と同じ。

実行: uv run --with google-genai --with python-dotenv --with pydantic python day13/file_search_extra.py whole
      uv run --with google-genai --with python-dotenv --with pydantic python day13/file_search_extra.py chunk
"""

import argparse
import json
import sys
import time

from google.genai import types

import file_search_qa as fs

CHUNK_STORE_JSON = fs.RESULTS / "store_chunk200.json"


def make_chunk_store() -> str:
    if CHUNK_STORE_JSON.exists():
        return json.loads(CHUNK_STORE_JSON.read_text(encoding="utf-8"))["name"]
    store = fs.client.file_search_stores.create(config={"display_name": "adv2026-day13-esp32-sisters-chunk200"})
    for filename, chip in [("esp32_datasheet_en.pdf", "ESP32"), ("esp32-s3_datasheet_en.pdf", "ESP32-S3"),
                           ("esp32-c6_datasheet_en.pdf", "ESP32-C6")]:
        start = time.perf_counter()
        op = fs.client.file_search_stores.upload_to_file_search_store(
            file_search_store_name=store.name, file=fs.HERE / "data" / filename,
            config={"display_name": filename, "custom_metadata": [{"key": "chip", "string_value": chip}],
                    "chunking_config": {"white_space_config": {"max_tokens_per_chunk": 200, "max_overlap_tokens": 20}}},
        )
        while not op.done:
            time.sleep(5)
            op = fs.client.operations.get(op)
        print(f"  {filename}: {time.perf_counter() - start:.0f} s")
    CHUNK_STORE_JSON.write_text(json.dumps({"name": store.name}, indent=2), encoding="utf-8")
    return store.name


def ask_whole(question: str, pdf: bytes):
    start = time.perf_counter()
    response = fs.client.models.generate_content(
        model=fs.MODEL,
        contents=[types.Part.from_bytes(data=pdf, mime_type="application/pdf"), question],
        config=types.GenerateContentConfig(
            system_instruction=fs.SYSTEM_INSTRUCTION.replace("File Search で検索した資料", "渡した資料")),
    )
    usage = response.usage_metadata.model_dump(exclude_none=True) if response.usage_metadata else {}
    return response.text, [], usage, time.perf_counter() - start


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("condition", choices=["whole", "chunk"])
    args = parser.parse_args()
    if args.condition == "chunk":
        store = make_chunk_store()
        print(f"store: {store}")
    else:
        pdf = (fs.HERE / "data" / "esp32-s3_datasheet_en.pdf").read_bytes()

    results = []
    for q in fs.load_questions():
        if args.condition == "chunk":
            expected = fs.EXPECTED_ALL.get(q["id"], q["expected"])  # all と同じ期待
            answer, citations, usage, seconds = fs.ask(q["question"], store, "all")
        else:
            expected = q.get("expected_s3", q["expected"])  # s3 と同じ期待
            answer, citations, usage, seconds = ask_whole(q["question"], pdf)
        verdict = fs.judge(q, expected, answer)
        chips = sorted({c[0] for c in citations})
        print(f"--- {q['id']} [{q['category']}] {verdict.verdict} {seconds:.0f}s 引用 {chips}")
        print(f"    {verdict.reason}")
        results.append({**q, "expected": expected, "condition": args.condition, "answer": answer,
                        "citations": [{"chip": c, "page": p} for c, p in citations],
                        "verdict": verdict.verdict, "reason": verdict.reason,
                        "seconds": round(seconds, 1), "usage": usage})
    path = fs.RESULTS / f"qa_{args.condition}.json"
    path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"saved {path}")


if __name__ == "__main__":
    main()
