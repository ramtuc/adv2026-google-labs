"""Day 3 (3/3): 音声解説の途中でリスナーが割り込んで質問したときの応答を再現する

Gemini Notebook の Interactive モード（再生中に「参加」して質問できる機能）のように、
台本の途中で質問を受け、ホスト2人が資料に基づいて答えてから本題に戻る掛け合いを作る。
質問は interrupt_questions.json から読み、応答の台本と音声、かかった時間を保存する。

実行: uv run day03/interactive.py [割り込む位置のターン番号]
"""

import json
import sys
import time

from common import HOSTS, RESULTS, SCRIPT_MODEL, HERE, Script, Turn, client, save_wav, synthesize, upload_pdf
from google.genai import types
from pydantic import BaseModel, Field

hosts = "\n".join(f"- {name}: {host['role']}" for name, host in HOSTS.items())

SYSTEM_INSTRUCTION = f"""あなたは、技術資料をもとにしたポッドキャスト番組の台本を、生放送中に書き足す構成作家です。
ホストは次の2人です。
{hosts}

番組の途中で、リスナーが割り込んで質問しました。ホスト2人がその質問に答え、元の話題に戻るまでの台本を書いてください。
- 最初の発言で、リスナーの質問を受け止める（「いい質問ですね」のような一言と、質問の言い直し）。
- 答えは、与えられた PDF 資料に書かれていることだけを根拠にする。資料にないことは推測や一般知識で補わず、「この資料には載っていない」と言う。
- 質問の前提が資料と食い違う場合は、やんわりと訂正する。
- 答えは 2〜5 ターンで簡潔に。
- 最後のターンで、割り込まれる直前の話題に自然に戻る（次に話す予定だった内容につなげる）。
- answered_from_source は、資料に答えの根拠があったかどうか。"""


class InterruptResponse(BaseModel):
    turns: list[Turn]
    answered_from_source: bool = Field(description="資料の中に答えの根拠があったか")


def context_text(script: Script, position: int) -> str:
    done = "\n".join(f"{t.speaker}: {t.text}" for t in script.turns[:position])
    upcoming = script.turns[position]
    return (
        f"## ここまでの台本\n{done}\n\n"
        f"## 割り込まれなければ次に話す予定だった発言\n{upcoming.speaker}: {upcoming.text}"
    )


def respond(pdf_file, script: Script, position: int, question: str) -> InterruptResponse:
    response = client.models.generate_content(
        model=SCRIPT_MODEL,
        contents=[pdf_file, context_text(script, position), f"## リスナーの質問\n{question}"],
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.7,
            response_mime_type="application/json",
            response_schema=InterruptResponse,
        ),
    )
    return response.parsed


def main():
    script = Script.model_validate(json.loads((RESULTS / "script.json").read_text(encoding="utf-8")))
    position = int(sys.argv[1]) if len(sys.argv) > 1 else len(script.turns) // 2
    questions = json.loads((HERE / "interrupt_questions.json").read_text(encoding="utf-8"))
    pdf_file = upload_pdf()

    print(f"割り込む位置: {position} ターン目の直前")
    print(f"  {script.turns[position - 1].speaker}: {script.turns[position - 1].text}\n")

    results = []
    for q in questions:
        print(f"--- {q['id']} [{q['category']}] {q['question']}")
        start = time.perf_counter()
        answer = respond(pdf_file, script, position, q["question"])
        text_seconds = time.perf_counter() - start
        # 最初の1ターンだけ先に合成し、「質問してから声が返り始めるまで」の時間を測る
        first_audio = synthesize(answer.turns[:1])
        first_audio_seconds = time.perf_counter() - start
        rest_audio = synthesize(answer.turns[1:]) if len(answer.turns) > 1 else b""

        for t in answer.turns:
            pages = f" (p.{', '.join(map(str, t.pages))})" if t.pages else ""
            print(f"  {t.speaker}［{t.style}］{t.text}{pages}")
        print(f"  answered_from_source={answer.answered_from_source}")
        print(f"  台本の生成: {text_seconds:.1f} 秒 / 最初の声まで: {first_audio_seconds:.1f} 秒")

        save_wav(RESULTS / f"interrupt_{q['id']}.wav", first_audio + rest_audio)
        results.append(
            {
                **q,
                "position": position,
                "turns": [t.model_dump() for t in answer.turns],
                "answered_from_source": answer.answered_from_source,
                "text_seconds": round(text_seconds, 1),
                "first_audio_seconds": round(first_audio_seconds, 1),
            }
        )

    out = RESULTS / "interrupt.json"
    out.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nsaved {out}")


if __name__ == "__main__":
    main()
