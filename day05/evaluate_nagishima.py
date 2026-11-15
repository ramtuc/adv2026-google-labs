"""Day 5: 架空の島「凪島」の資料で、プロンプトの違いを数値で比べる評価ハーネス

Day 2 で Gemini Notebook に聞いた質問を、Gemini API で答えさせて採点する。
資料は Day 2 と同じ 4 つ（文章 2 つ、手書きの写真、音声）を、そのままモデルに渡す。

- System Prompt A（素朴）と B（Day 2 のカスタム設定と同じ「公式か個人か、いつの情報か」を示させる）を比べる
- 同じ質問を GEN_RUNS 回生成し、出力の揺れも見る
- 採点は 2 通り
  - コードによる判定：must_include の語（「|」で区切った別の書き方のどれか）がすべて含まれるか
  - LLM による採点：Stax の Evaluator と同じ「1 行目にカテゴリ、2 行目以降に理由」の形式。
    食い違いのある質問は、食い違いの扱い方も別のカテゴリで採点する。JUDGE_RUNS 回くり返して揺れも見る

実行: uv run day05/evaluate_nagishima.py
"""

import json
import os
import re
import statistics
import sys
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
sys.stdout.reconfigure(encoding="utf-8")

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

TARGET_MODEL = "gemini-3.5-flash"  # 評価される側
# 採点する側。gemini-3.1-pro は 1 日 250 回の上限（Tier 1）にかかったので、別枠の 3.8 Flash にした
JUDGE_MODEL = "gemini-3.8-flash"
GEN_RUNS = 3
JUDGE_RUNS = 3

HERE = Path(__file__).parent
SOURCES = HERE.parent / "day02" / "sources"
RESULTS_DIR = HERE / "results"

PROMPTS = {
    "A": "あなたは凪島の旅行の相談に乗るアシスタントです。渡された資料をもとに、日本語で答えてください。",
    # Day 2 で Gemini Notebook の「チャットを設定 → カスタム」に書いたのと同じ指示
    "B": """あなたは汐見港の観光案内所の係です。渡された資料をもとに、日本語で答えてください。
資料どうしで食い違うときは、それぞれの資料が公式か個人の話か、いつの情報かを示し、資料だけでは確かめられないことは「確かめられない」と言ってください。""",
}

JUDGE_PROMPT = """あなたは、資料にもとづく QA の採点者です。正解例と照らして、回答を採点してください。

# 質問
{input}

# 正解例
{expected_output}

# 回答
{output}

# 評価基準（正確さ）
- 正確: 正解例の要点がすべて含まれ、事実の誤りがない。資料にないことを聞かれたら、資料にないと答えている
- 一部不正確: 要点の一部が欠けている、または本筋ではない小さな誤りがある
- 誤り: 主要な数値や事実が誤っている、または資料にないことを事実として答えている

# 評価基準（食い違いの扱い）{conflict_note}
- 区別した: 食い違う値を両方示し、どちらが公式か個人の話か・いつの情報かを区別したうえで、確かめられない点は確かめられないと言っている
- 並べた: 食い違う値を両方示しているが、資料の立場や日付の区別、確かめられないことの指摘がない
- 片方だけ: 片方の値だけを示している、または片方を確かめずに正しいと言い切っている
- 該当なし: この質問には食い違いがない

# 出力形式
1 行目に正確さのカテゴリ名（正確 / 一部不正確 / 誤り）だけ、2 行目に食い違いの扱いのカテゴリ名（区別した / 並べた / 片方だけ / 該当なし）だけを書き、3 行目に理由を 1 文で書く。"""

ACCURACY = {"正確": 1.0, "一部不正確": 0.5, "誤り": 0.0}
CONFLICT = {"区別した": 1.0, "並べた": 0.5, "片方だけ": 0.0}


def load_sources() -> list:
    # Gemini Notebook に入れたのと同じ 4 つを、そのまま渡す（音声と写真はモデルが直接読む）
    return [
        "# 資料 guide.md（凪島観光ガイド 2026）\n" + (SOURCES / "guide.md").read_text(encoding="utf-8"),
        "# 資料 blog.md（島民ブログ）\n" + (SOURCES / "blog.md").read_text(encoding="utf-8"),
        "# 資料 memo.jpg（手書きのメモの写真）",
        types.Part.from_bytes(data=(SOURCES / "memo.jpg").read_bytes(), mime_type="image/jpeg"),
        "# 資料 okami.wav（民宿のおかみの話の録音）",
        types.Part.from_bytes(data=(SOURCES / "okami.wav").read_bytes(), mime_type="audio/wav"),
    ]


def normalize(text: str) -> str:
    # 全角・半角、空白、桁区切りのカンマの違いを揃えてから比べる
    text = unicodedata.normalize("NFKC", text)
    return re.sub(r"[\s,]", "", text).lower()


def code_check(output: str, must_include: list[str]) -> bool:
    out = normalize(output)
    return all(any(normalize(alt) in out for alt in word.split("|")) for word in must_include)


def call(**kwargs):
    # 混み合って 429・503 になることがあるので、少し待って取り直す
    for wait in (5, 15, 45, 90):
        try:
            return client.models.generate_content(**kwargs)
        except genai.errors.APIError as e:
            if e.code not in (429, 500, 503):
                raise
            time.sleep(wait)
    return client.models.generate_content(**kwargs)


def generate(sources: list, system_prompt: str, user_input: str) -> dict:
    start = time.perf_counter()
    response = call(
        model=TARGET_MODEL,
        contents=sources + ["# 質問\n" + user_input],
        config=types.GenerateContentConfig(system_instruction=system_prompt),
    )
    return {
        "output": response.text,
        "latency_s": round(time.perf_counter() - start, 2),
        "output_tokens": response.usage_metadata.candidates_token_count,
    }


def judge(case: dict, output: str) -> dict:
    note = "" if case["conflict"] else "\nこの質問には資料どうしの食い違いがないので、「該当なし」とする。"
    response = call(
        model=JUDGE_MODEL,
        contents=JUDGE_PROMPT.format(
            input=case["input"], expected_output=case["expected_output"], output=output, conflict_note=note
        ),
    )
    lines = [l.strip(" *#") for l in response.text.strip().splitlines() if l.strip()]
    accuracy = lines[0] if lines else ""
    conflict = lines[1] if len(lines) > 1 else ""
    return {
        "accuracy": accuracy,
        "accuracy_score": ACCURACY.get(accuracy),  # 形式どおりに返さなかったときは None
        "conflict": conflict,
        "conflict_score": CONFLICT.get(conflict),
        "reason": " ".join(lines[2:]),
    }


def run_one(sources: list, case: dict, prompt: str, run: int) -> dict:
    gen = generate(sources, PROMPTS[prompt], case["input"])
    judges = [judge(case, gen["output"]) for _ in range(JUDGE_RUNS)]
    row = {
        "id": case["id"],
        "category": case["category"],
        "prompt": prompt,
        "run": run,
        **gen,
        "code_check": code_check(gen["output"], case["must_include"]) if case["must_include"] else None,
        "judges": judges,
    }
    print(f"{case['id']} [{prompt}#{run}] code={row['code_check']} judge={[j['accuracy'] for j in judges]} {[j['conflict'] for j in judges]}")
    return row


def main():
    cases = json.loads((HERE / "testcases_nagishima.json").read_text(encoding="utf-8"))
    sources = load_sources()
    RESULTS_DIR.mkdir(exist_ok=True)

    # 1 件ずつ追記し、止まっても続きから再開できるようにする
    out = RESULTS_DIR / "evaluate_nagishima.jsonl"
    done = set()
    if out.exists():
        for line in out.read_text(encoding="utf-8").splitlines():
            r = json.loads(line)
            done.add((r["id"], r["prompt"], r["run"]))
    jobs = [
        (case, prompt, run)
        for case in cases
        for prompt in PROMPTS
        for run in range(1, GEN_RUNS + 1)
        if (case["id"], prompt, run) not in done
    ]

    def run_and_save(job):
        row = run_one(sources, *job)
        with out.open("a", encoding="utf-8") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(run_and_save, jobs))
    results = [json.loads(line) for line in out.read_text(encoding="utf-8").splitlines()]

    print("\n=== プロンプトごとの集計 ===")
    for name in PROMPTS:
        rows = [r for r in results if r["prompt"] == name]
        acc = [j["accuracy_score"] for r in rows for j in r["judges"] if j["accuracy_score"] is not None]
        con = [j["conflict_score"] for r in rows for j in r["judges"] if j["conflict_score"] is not None]
        checked = [r["code_check"] for r in rows if r["code_check"] is not None]
        print(
            f"{name}: 正確さ {statistics.mean(acc):.2f} / 食い違いの扱い {statistics.mean(con):.2f} / "
            f"コード判定 {sum(checked)}/{len(checked)} / "
            f"レイテンシ中央値 {statistics.median(r['latency_s'] for r in rows):.1f} s / "
            f"出力トークン平均 {statistics.mean(r['output_tokens'] for r in rows):.0f}"
        )
    print(f"saved {out}")


if __name__ == "__main__":
    main()
