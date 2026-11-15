"""Day 3: check_nagishima.py が invented とした主張を、「事実として聞こえる作り足し」と「演出・形容」に分ける

「リーズナブル」「絶景」のような演出の言葉まで作り足しに数えると、
聞いた人が島の事実だと受け取る作り足し（発行元、理由、地名、設備など）が埋もれるため。

実行: uv run day03/split_invented.py results/<文字起こし>.check.json
"""

import json
import sys
from pathlib import Path

from common import SCRIPT_MODEL, client
from google.genai import types
from pydantic import BaseModel, Field


class Item(BaseModel):
    index: int = Field(description="入力の番号")
    kind: str = Field(
        description="fact（聞いた人が凪島の事実として受け取る具体的な内容：数字、名前、場所、設備、出来事、発行元や形式、理由や因果の説明）／color（評価や形容、たとえ、演出、聞き手への語りかけ）"
    )


class Split(BaseModel):
    items: list[Item]


PROMPT = """次は、架空の島「凪島」の音声解説で、資料に書かれていなかった主張の一覧です。
それぞれを、fact と color に分けてください。

- fact：聞いた人が「凪島ではそうなのだ」と事実として受け取る具体的な内容。
  例：「ガイドは役場が発行している」「ガイドには写真が載っている」「値上げは中東情勢のせい」「部屋はエアコンが効いている」「工房は浜にある」「冬は閑散期」
- color：評価、形容、たとえ、演出、聞き手への語りかけ。
  例：「リーズナブル」「絶景」「島のシンボル」「究極の VIP 体験」「とんでもない暴露」「インフラが脆い」

{items}"""


def main():
    path = Path(sys.argv[1])
    check = json.loads(path.read_text(encoding="utf-8"))
    invented = [c for c in check["claims"] if c["verdict"] == "invented"]
    items = "\n".join(f"{i}. [{c['time']}] {c['claim']}" for i, c in enumerate(invented))
    response = client.models.generate_content(
        model=SCRIPT_MODEL,
        contents=PROMPT.format(items=items),
        config=types.GenerateContentConfig(
            temperature=0.0, response_mime_type="application/json", response_schema=Split
        ),
    )
    kinds = {item.index: item.kind for item in response.parsed.items}
    for i, c in enumerate(invented):
        c["kind"] = kinds.get(i, "")
    facts = [c for c in invented if c["kind"] == "fact"]
    print(f"{path.name}: invented {len(invented)} 件のうち fact {len(facts)} 件、color {len(invented) - len(facts)} 件")
    for c in facts:
        print(f"  {c['time']} {c['claim']}")
    path.write_text(json.dumps(check, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
