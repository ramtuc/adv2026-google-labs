"""Day 3: 凪島（架空の島）の音声解説の文字起こしを、4 つの資料と照らし合わせる

凪島は架空の島なので、資料にない話はすべて作り足しになる。
文字起こし（transcribe.py の出力）から、凪島や登場するものについての主張を取り出し、
資料にある／資料と食い違う／資料にない（作り足し）に分ける。
一般的な話（「夕凪とは」「離島の暮らしは」など）は、凪島の事実を述べていなければ別に数える。

実行: uv run day03/check_nagishima.py results/<文字起こし>.json
"""

import json
import sys
from pathlib import Path

from common import SCRIPT_MODEL, client
from google.genai import types
from pydantic import BaseModel, Field

SOURCES = Path(__file__).parent.parent / "day02" / "sources"

# 手書きのメモ（memo.jpg）と、おかみの音声（okami.wav）に書いた・話させた内容
MEMO = """凪島 → 汐見港（帰り）
8:30　12:00　15:40　18:50（最終）
波の高さ 3m 以上は欠航"""

OKAMI = """これは検証のために作った、架空の島の話です。
はい、民宿しおさいの、おかみの浜田です。
うちは港から歩いて5分。お部屋は6つだけの、小さな宿なんですよ。
お値段はね、1泊2食付きで、お一人9,800円。小学生のお子さんは6,500円です。
夏の凪祭りの日は、夜8時半から花火が上がるの。うちの2階の窓から、よーく見えますよ。
それとね、灯台は月曜日がお休みなの。月曜に来る人がよく、がっかりして帰ってくるのよ。
朝ごはんには、島の塩で焼いたアジの干物を出してます。"""


class Claim(BaseModel):
    time: str = Field(description="発言の時刻（mm:ss）")
    claim: str = Field(description="主張の要約（日本語）")
    quote: str = Field(description="文字起こしの該当部分をそのまま")
    verdict: str = Field(
        description="supported（資料にある）／contradicted（資料と食い違う）／invented（凪島や登場するものについて、資料にない事実を述べている）／general（凪島の事実ではない一般論やたとえ）"
    )
    source: str = Field(description="根拠の資料（guide／blog／memo／okami）。invented と general は空")
    note: str = Field(description="判定の理由。contradicted なら資料の正しい値")


class ConflictMention(BaseModel):
    topic: str = Field(description="運賃／灯台の高さ／バスの本数")
    mentioned: bool = Field(description="ガイドとブログで値が違うことに触れたか")
    how: str = Field(description="どう扱ったか（両方を言った、片方だけ言った、新しい方を正とした、など）")


class Check(BaseModel):
    claims: list[Claim]
    conflicts: list[ConflictMention] = Field(description="運賃・灯台の高さ・バスの本数の 3 つすべてについて")
    transcription_errors_used: list[str] = Field(
        description="資料の読み違い（手書きの地名 Kuroshima・Mitomi、音声の書き起こしの『東台』『民宿祭』など）をそのまま話した箇所"
    )


PROMPT = """次の文字起こしは、架空の島「凪島」についての 4 つの資料から Gemini Notebook が作った音声解説です。
資料にない凪島の事実は、すべて作り足しです（凪島は実在しないので、一般知識で正しくなることはない）。

文字起こしから、凪島・島の施設・人・行事・数字についての主張をすべて取り出し、判定してください。
- 数字、時刻、料金、名前、場所、歴史、人の気持ちや行動など、事実として述べたものは 1 つずつ別の主張にする
- 次のものも必ず 1 つずつ取り出す。どれも資料に書いていなければ invented
  - 理由や意図の説明（「〜だから値上げした」「〜を守るために据え置いた」）
  - 資料の発行元・形式・中身の説明（「役場が発行」「PDF」「写真が載っている」）
  - 資料の数字から計算・言い換えた数字（「15% 減った」「1,200 弱」）。計算が合わなければ contradicted
  - 形容や様子（「猛烈な台風」「エアコンの効いた部屋」「閑散期」）
  - 資料の名前や地名の言い換え（似た名前の混同も contradicted）
- 「夕凪とは」のような一般論や、凪島の事実を含まないたとえは general にする
- 資料の値と違えば contradicted、資料にない凪島の事実なら invented
- 相槌や、資料の内容をそのまま言い直しただけのものは取り出さなくてよい

# 資料 guide.md（観光ガイド）
{guide}

# 資料 blog.md（島民ブログ）
{blog}

# 資料 memo.jpg（手書きのメモ）
{memo}

# 資料 okami.wav（民宿のおかみの話）
{okami}

# 文字起こし
{transcript}"""


class Claims(BaseModel):
    claims: list[Claim]


# 20 分の番組を一度に渡すと、主張を数十件しか取り出さず細かい作り足しを見逃した。
# 主張は 25 発言ずつに分けて取り出し、食い違いと読み違いだけは全体で 1 回判定する
CHUNK = 25


def ask(prompt: str, schema):
    for _ in range(3):
        response = client.models.generate_content(
            model=SCRIPT_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.0, response_mime_type="application/json", response_schema=schema
            ),
        )
        if response.parsed is not None:
            return response.parsed
    raise RuntimeError("構造化出力を読めなかった")


def main():
    path = Path(sys.argv[1])
    data = json.loads(path.read_text(encoding="utf-8"))
    lines = [f"[{s['start']}] {s['speaker']}: {s['text']}" for s in data["segments"]]
    sources = dict(
        guide=(SOURCES / "guide.md").read_text(encoding="utf-8"),
        blog=(SOURCES / "blog.md").read_text(encoding="utf-8"),
        memo=MEMO,
        okami=OKAMI,
    )
    claims = []
    for i in range(0, len(lines), CHUNK):
        part = "\n".join(lines[i : i + CHUNK])
        claims += ask(PROMPT.format(transcript=part, **sources), Claims).claims
    whole = ask(PROMPT.format(transcript="\n".join(lines), **sources), Check)
    check = Check(claims=claims, conflicts=whole.conflicts, transcription_errors_used=whole.transcription_errors_used)

    counts = {}
    for c in check.claims:
        counts[c.verdict] = counts.get(c.verdict, 0) + 1
    print(f"{path.name}: {len(data['segments'])} 発言、主張 {len(check.claims)} 件 {counts}")
    for c in check.claims:
        if c.verdict in ("contradicted", "invented"):
            print(f"  [{c.verdict}] {c.time} {c.claim} ／ {c.note}")
    for m in check.conflicts:
        print(f"  食い違い {m.topic}: {'触れた' if m.mentioned else '触れない'} {m.how}")
    for e in check.transcription_errors_used:
        print(f"  読み違いをそのまま: {e}")

    out = path.with_suffix(".check.json")
    out.write_text(json.dumps(check.model_dump(), ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"saved {out}")


if __name__ == "__main__":
    main()
