"""Day 12: File Search のストアを作り、ESP32 の 3 姉妹のデータシートを入れる

- 初代 ESP32（esp32_datasheet_en.pdf、v5.3）
- ESP32-S3（esp32-s3_datasheet_en.pdf、v2.2。Day 2 と同じ）
- ESP32-C6（esp32-c6_datasheet_en.pdf、v1.5）

それぞれに custom_metadata の chip を付け、あとで metadata_filter で絞り込めるようにする。
作ったストアの名前は results/store.json に残す。データシートは再配布できないので data/ は git に入れない。

実行: uv run day12/make_store.py
"""

import json
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

HERE = Path(__file__).parent
DATA = HERE / "data"
RESULTS = HERE / "results"

DOCS = [
    ("esp32_datasheet_en.pdf", "ESP32"),
    ("esp32-s3_datasheet_en.pdf", "ESP32-S3"),
    ("esp32-c6_datasheet_en.pdf", "ESP32-C6"),
]


def main():
    # Windows のコンソール（cp932）でも表示できるように UTF-8 にする
    sys.stdout.reconfigure(encoding="utf-8")
    store = client.file_search_stores.create(config={"display_name": "adv2026-day12-esp32-sisters"})
    print(f"store: {store.name}")
    for filename, chip in DOCS:
        start = time.perf_counter()
        operation = client.file_search_stores.upload_to_file_search_store(
            file_search_store_name=store.name,
            file=DATA / filename,
            config={"display_name": filename, "custom_metadata": [{"key": "chip", "string_value": chip}]},
        )
        while not operation.done:
            time.sleep(5)
            operation = client.operations.get(operation)
        print(f"  {filename}（chip={chip}）: {time.perf_counter() - start:.0f} s")
    RESULTS.mkdir(exist_ok=True)
    (RESULTS / "store.json").write_text(json.dumps({"name": store.name}, indent=2), encoding="utf-8")
    for doc in client.file_search_stores.documents.list(parent=store.name):
        print(f"  document: {doc.display_name} {doc.state} {doc.size_bytes} bytes")


if __name__ == "__main__":
    main()
