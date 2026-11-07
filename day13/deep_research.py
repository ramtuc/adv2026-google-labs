"""Day 13: Deep Research に「Web に ESP32-S3 の仕様がどれくらい間違って書かれているか」を調べさせる

Web の記事・ショップのページから ESP32-S3 の仕様を集め、Day 12 の File Search のストア
（ESP32・ESP32-S3・ESP32-C6 の公式データシート）を正解として照らし合わせ、
誤りが初代 ESP32 や ESP32-C6 の値と一致しているか（取り違え）をまとめさせる。

- plan : collaborative_planning で、調べる前の計画だけを返させる
- run  : 計画を承認して調べさせる（background で走らせ、終わるまで待つ）

実行: uv run day13/deep_research.py plan
      uv run day13/deep_research.py run
      （--max で Deep Research Max、--strict で形を細かく指定した依頼）
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

AGENTS = {"standard": "deep-research-preview-04-2026", "max": "deep-research-max-preview-04-2026"}

HERE = Path(__file__).parent
RESULTS = HERE / "results"
STORE = json.loads((HERE.parent / "day12" / "results" / "store.json").read_text(encoding="utf-8"))["name"]

PROMPT = """ESP32-S3 の主な仕様（SRAM の容量、CPU、GPIO の本数、Deep-sleep の消費電流、Bluetooth の対応）について、
Web 上の記事（ブログ、ショップの商品ページ、解説サイト、動画の説明など）にどのような値が書かれているかを調べてください。

ファイル検索にある Espressif の公式データシート（ESP32、ESP32-S3、ESP32-C6）を正解として、Web の記事の値と照らし合わせてください。
- 誤った値を書いている記事を挙げ、その誤りが初代 ESP32 や ESP32-C6 の値と一致しているか（取り違え）を示す
- 出典ごとに URL を付けた表を入れる
- 誤りが多い項目と、その理由の推測もまとめる
日本語で書いてください。"""

# 通常版が頼んだ形（誤った記事の表）を作らず技術解説を書いたので、形を細かく指定し直したもの
STRICT_PROMPT = """ESP32-S3 の仕様を書いた Web のページ（日本語のブログ、ショップの商品ページ、解説サイト）を 20 件以上調べ、
書かれている値の誤りを監査してください。技術解説は書かないでください。

正解は、ファイル検索にある Espressif の公式データシート（esp32-s3_datasheet_en.pdf）とします。
比べる項目：SRAM の容量（512 KB）、CPU（Xtensa LX7 デュアルコア、最大 240 MHz）、GPIO の本数（45 本）、
Deep-sleep の消費電流（7 µA）、Bluetooth（Bluetooth 5 LE のみ。Classic は非対応）。

出力は次の形だけにしてください。
1. 最初に表：ページごとに 1 行。列は「ページ名」「URL」「項目」「ページに書かれた値」「正しい値」「判定（正しい／誤り）」「誤りの場合、初代 ESP32（520 KB、LX6、34 本、10 µA、Classic 対応）か ESP32-C6（RISC-V、30 本、Wi-Fi 6）の値と一致するか」
2. 次に集計：調べたページ数、誤りのあったページ数、項目ごとの誤りの数
3. 最後に、誤りが多い理由の推測を 5 行以内で
正解の値には、必ずファイル検索のデータシートのページを引用してください。日本語で書いてください。"""

PROMPTS = {"base": PROMPT, "strict": STRICT_PROMPT}

# tools を渡すと、渡したものだけを使う。Web 検索と URL の読み込みに、File Search を足す
TOOLS = [
    {"type": "google_search"},
    {"type": "url_context"},
    {"type": "code_execution"},
    {"type": "file_search", "file_search_store_names": [STORE]},
]


def wait(interaction_id: str):
    start = time.perf_counter()
    while True:
        interaction = client.interactions.get(interaction_id)
        if interaction.status in ("completed", "failed", "cancelled"):
            return interaction, time.perf_counter() - start
        print(f"  {interaction.status} {time.perf_counter() - start:.0f} s", flush=True)
        time.sleep(30)


def dump(interaction) -> dict:
    # 署名（signature）は長いだけなので外して残す
    def strip(o):
        if isinstance(o, dict):
            return {k: strip(v) for k, v in o.items() if k != "signature"}
        if isinstance(o, list):
            return [strip(x) for x in o]
        return o
    return strip(interaction.model_dump(mode="json", exclude_none=True))


def main():
    # Windows のコンソール（cp932）でも表示できるように UTF-8 にする
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("step", choices=["plan", "run"])
    parser.add_argument("--max", action="store_true")
    parser.add_argument("--strict", action="store_true", help="形を細かく指定した依頼にする")
    args = parser.parse_args()
    agent = "max" if args.max else "standard"
    kind = agent + ("_strict" if args.strict else "")
    RESULTS.mkdir(exist_ok=True)

    if args.step == "plan":
        interaction = client.interactions.create(
            input=PROMPTS["strict" if args.strict else "base"], agent=AGENTS[agent], background=True, tools=TOOLS,
            agent_config={"type": "deep-research", "collaborative_planning": True},
        )
        interaction, seconds = wait(interaction.id)
        (RESULTS / f"plan_{kind}.json").write_text(json.dumps(dump(interaction), ensure_ascii=False, indent=2),
                                                   encoding="utf-8")
        print(f"plan: {interaction.status} {seconds:.0f} s id={interaction.id}")
        print(interaction.output_text)
        return

    # 計画を承認して、調べさせる
    plan = json.loads((RESULTS / f"plan_{kind}.json").read_text(encoding="utf-8"))
    interaction = client.interactions.create(
        input="この計画で進めてください。", agent=AGENTS[agent], background=True, tools=TOOLS,
        previous_interaction_id=plan["id"],
        agent_config={"type": "deep-research", "collaborative_planning": False, "thinking_summaries": "auto"},
    )
    interaction, seconds = wait(interaction.id)
    record = dump(interaction)
    record["seconds"] = round(seconds)
    (RESULTS / f"report_{kind}.json").write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
    # output_text には最後の部分しか入らないことがあるので、model_output の文章をすべてつなぐ
    text = "".join(c.get("text", "") for s in record["steps"] if s["type"] == "model_output"
                   for c in s.get("content", []))
    (RESULTS / f"report_{kind}.md").write_text(text, encoding="utf-8")
    print(f"run: {interaction.status} {seconds:.0f} s")
    print(json.dumps(record.get("usage", {}), ensure_ascii=False))


if __name__ == "__main__":
    main()
