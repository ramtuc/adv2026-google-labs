"""Day 3: 台本の「盛り上げ方」で事実の正確さが変わるかを試す

同じデータシートから、話し方の指示だけを変えた2種類の台本を作り、それぞれの事実の誤りを
fact_check.py で数えて比べる。資料の範囲を守るルールと台本の長さは、2種類で共通にする。

- accurate: 落ち着いた解説。数値は資料どおりに言う
- dramatic: Gemini Notebook の音声解説のような、つかみ・たとえ・驚き・問いかけの多い語り

実行: uv run day03/style_experiment.py [1種類あたりの本数（既定 3）]
"""

import json
import sys

from common import HOSTS, RESULTS, SCRIPT_MODEL, Script, client, upload_pdf
from fact_check import fact_check, summarize
from google.genai import types

hosts = "\n".join(f"- {name}: {host['role']}" for name, host in HOSTS.items())

COMMON = f"""あなたは、技術資料をもとにポッドキャスト番組の台本を書く構成作家です。
与えられた PDF 資料の内容を、次の2人のホストが日本語で話し合う台本にしてください。
{hosts}

- 資料に書かれていることだけを話題にする。数値や仕様は資料どおりに書き、資料にない一般知識で補わない。
- 全体で 30 ターン前後にする。
- style には、その発言の話し方（感情・速さ・間）を短く書く。
- pages には、その発言の根拠にした PDF のページ番号を入れる。相槌や雑談なら空にする。
"""

STYLES = {
    "accurate": """
## 話し方
- 落ち着いた技術解説番組として書く。
- 要点を3〜4個選び、仕様を正確に紹介する。数値を言うときは、条件（どのモードのときか等）も一緒に言う。
- たとえ話は使ってもよいが、数値の大小関係を崩さない範囲にとどめる。
""",
    "dramatic": """
## 話し方
- 聞き手を引き込むドキュメンタリー風の番組として書く。
- 冒頭は、リスナーの身の回りの場面から入る強いつかみにする。リスナーを「あなた」と呼び、場面を想像させる。
- 話題と話題の間は「でも、それなら〇〇はどうなるの？」という疑問で引っ張り、次の話題につなぐ。
- 数値が出たら、身近なものとの大胆な比較やたとえで、すごさを印象づける。聞き手は大げさに驚く。
- 最後は、技術が社会や未来をどう変えるかという大きな問いかけで締める。
""",
}


def generate(pdf_file, style: str) -> Script:
    response = client.models.generate_content(
        model=SCRIPT_MODEL,
        contents=[pdf_file, "この資料の音声解説の台本を作ってください。"],
        config=types.GenerateContentConfig(
            system_instruction=COMMON + STYLES[style],
            temperature=1.0,
            response_mime_type="application/json",
            response_schema=Script,
        ),
    )
    return response.parsed


def main():
    runs = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    pdf_file = upload_pdf()
    out_dir = RESULTS / "style"
    out_dir.mkdir(parents=True, exist_ok=True)

    rows = []
    for style in STYLES:
        for i in range(runs):
            script = generate(pdf_file, style)
            path = out_dir / f"{style}_{i}.json"
            path.write_text(json.dumps(script.model_dump(), ensure_ascii=False, indent=2), encoding="utf-8")

            result = fact_check(pdf_file, "\n".join(f"{t.speaker}: {t.text}" for t in script.turns))
            summary = summarize(result)
            path.with_name(path.stem + ".factcheck.json").write_text(
                json.dumps({"summary": summary, **result.model_dump(mode="json")}, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            print(f"{style}_{i}: {len(script.turns)} ターン {summary}", flush=True)
            rows.append({"style": style, "run": i, "turns": len(script.turns), **summary})

    print("\n| 話し方 | 本数 | 主張の数 | 誤り | 資料にない | 誤りの率 | 資料にない率 |")
    print("| --- | --- | --- | --- | --- | --- | --- |")
    for style in STYLES:
        r = [row for row in rows if row["style"] == style]
        claims = sum(x["claims"] for x in r)
        incorrect = sum(x["incorrect"] for x in r)
        outside = sum(x["not_in_source"] for x in r)
        print(f"| {style} | {len(r)} | {claims} | {incorrect} | {outside} | {incorrect / claims:.1%} | {outside / claims:.1%} |")

    (out_dir / "summary.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
