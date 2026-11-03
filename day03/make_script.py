"""Day 3 (1/3): データシートから2人のホストの対話台本を作る

Gemini Notebook の音声解説（Audio Overview）のように、技術文書を
2人の掛け合いに書き換える。各発言には話し方の指示と根拠ページを付ける。

実行: uv run day03/make_script.py
"""

import json

from common import HOSTS, RESULTS, SCRIPT_MODEL, Script, client, upload_pdf
from google.genai import types

hosts = "\n".join(f"- {name}: {host['role']}" for name, host in HOSTS.items())

SYSTEM_INSTRUCTION = f"""あなたは、技術資料をもとにポッドキャスト番組の台本を書く構成作家です。
与えられた PDF 資料の内容を、次の2人のホストが日本語で話し合う台本にしてください。
{hosts}

- 資料に書かれていることだけを話題にする。数値や仕様は資料どおりに書き、資料にない一般知識で補わない。
- 冒頭で、この資料が何で、聞くと何が分かるのかを短く示す。
- 資料の中から、電子工作で ESP32-S3 を使う人が知っておくべき要点を3〜4個選んで深掘りする。全部を網羅しようとしない。
- 難しい用語や数値は、身近なたとえで言い換える。ただし、たとえであることが分かるように話す。
- 聞き手の相槌や素朴な質問を挟み、一方的な説明が続かないようにする。
- 最後に、話した要点を2〜3文で振り返って締める。
- 全体で 30 ターン前後（読み上げて 4〜6 分程度）にする。
- style には、その発言の話し方（感情・速さ・間）を短く書く。
- pages には、その発言の根拠にした PDF のページ番号を入れる。相槌や雑談なら空にする。"""


def main():
    pdf_file = upload_pdf()
    response = client.models.generate_content(
        model=SCRIPT_MODEL,
        contents=[pdf_file, "この資料の音声解説の台本を作ってください。"],
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.7,
            response_mime_type="application/json",
            response_schema=Script,
        ),
    )
    script: Script = response.parsed

    print(f"# {script.title}\n")
    for i, t in enumerate(script.turns):
        pages = f" (p.{', '.join(map(str, t.pages))})" if t.pages else ""
        print(f"{i:2d} {t.speaker}［{t.style}］{t.text}{pages}")

    out = RESULTS / "script.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(script.model_dump(), ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nsaved {out}")


if __name__ == "__main__":
    main()
