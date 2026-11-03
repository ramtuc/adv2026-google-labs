"""Day 3: 台本や文字起こしに含まれる事実の主張を、データシートと照らし合わせて判定する

台本（make_script.py や style_experiment.py の出力）や、Gemini Notebook の音声解説の
文字起こし（transcribe.py の出力）を受け取り、ESP32-S3 についての事実の主張を抜き出して
「正しい / 誤り / 資料にない」に分ける。判定には Gemini と PDF を使う。

実行: uv run day03/fact_check.py <台本または文字起こしの JSON> [...]
"""

import json
import sys
from enum import Enum
from pathlib import Path

from common import SCRIPT_MODEL, client, upload_pdf
from google.genai import types
from pydantic import BaseModel, Field


class Verdict(str, Enum):
    correct = "correct"
    incorrect = "incorrect"
    not_in_source = "not_in_source"


class Claim(BaseModel):
    quote: str = Field(description="主張を含む発言の該当部分（そのまま写す）")
    claim: str = Field(description="主張の要約")
    verdict: Verdict = Field(description="correct: 資料どおり / incorrect: 資料と食い違う / not_in_source: 資料に書かれていない")
    page: int | None = Field(description="判定の根拠にした PDF のページ番号。not_in_source なら null")
    note: str = Field(description="判定の理由（incorrect なら資料の正しい内容）")


class FactCheck(BaseModel):
    claims: list[Claim]


SYSTEM_INSTRUCTION = """あなたは技術資料のファクトチェッカーです。
与えられた PDF（ESP32-S3 のデータシート）を正として、番組の台本や文字起こしに含まれる「ESP32-S3 についての事実の主張」をすべて抜き出し、判定してください。
- 対象は、数値・仕様・機能・動作についての主張。チップ以外の一般論（例: スマホの充電器は 2A）は、ESP32-S3 と比べる形で使われている場合だけ含める。
- たとえ話でも、事実の関係を言い切っている場合は含める（例:「ULP は 7 µA で動き続ける」）。純粋な感想や意見は含めない。
- 同じ主張が何度も出てくる場合は、内容が同じなら1つにまとめる。言い方が違って判定が変わるなら別々に挙げる。
- 単位の取り違え（電流を「電力」と呼ぶなど）は incorrect とする。
- 資料に書かれていないが一般には正しい内容も、not_in_source とする。"""


def load_text(path: Path) -> str:
    data = json.loads(path.read_text(encoding="utf-8"))
    if "turns" in data:  # 再現版の台本
        return "\n".join(f"{t['speaker']}: {t['text']}" for t in data["turns"])
    return "\n".join(f"[{s['start']}] {s['speaker']}: {s['text']}" for s in data["segments"])  # 文字起こし


def fact_check(pdf_file, text: str) -> FactCheck:
    response = client.models.generate_content(
        model=SCRIPT_MODEL,
        contents=[pdf_file, f"## 判定する台本\n{text}"],
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.0,
            response_mime_type="application/json",
            response_schema=FactCheck,
        ),
    )
    return response.parsed


def summarize(result: FactCheck) -> dict:
    counts = {v.value: sum(c.verdict == v for c in result.claims) for v in Verdict}
    total = len(result.claims)
    return {
        "claims": total,
        **counts,
        "incorrect_rate": round(counts["incorrect"] / total, 3) if total else 0,
        "not_in_source_rate": round(counts["not_in_source"] / total, 3) if total else 0,
    }


def main():
    pdf_file = upload_pdf()
    for name in sys.argv[1:]:
        path = Path(name)
        result = fact_check(pdf_file, load_text(path))
        summary = summarize(result)
        print(f"--- {path.name}: {summary}")
        for c in result.claims:
            if c.verdict != Verdict.correct:
                print(f"  [{c.verdict.value}] {c.quote[:80]} → {c.note[:80]}")
        out = path.with_name(path.stem + ".factcheck.json")
        out.write_text(
            json.dumps({"summary": summary, **result.model_dump(mode="json")}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )


if __name__ == "__main__":
    main()
