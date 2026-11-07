"""Day 11: Nano Banana で ESP32-S3 を擬人化して、4 コマ漫画を描かせる

- character : キャラクターの設定画（エスさん＝ESP32-S3、お姉ちゃん＝初代 ESP32）
- ep1       : 「お姉ちゃんと間違えないで」。台詞を渡す（AI が S3 を初代 ESP32 と取り違える、この連載のネタ）
- ep2       : 「省エネ」。台詞を渡す
- ep3       : ネタも台詞も任せる。出てくる仕様が正しいかを見る
- showa     : 1985 年のパソコン雑誌に載った ESP32-S3 の広告

ep1〜ep3 は、同じモデルで描いた設定画を一緒に渡して、キャラクターの見た目を保たせる。
モデルは Nano Banana 2.1（gemini-nano-banana-2.1）と Nano Banana Pro（gemini-3-pro-image）を比べる。

実行: uv run day11/make_manga.py character
      uv run day11/make_manga.py ep1
      uv run day11/make_manga.py ep1 --model pro
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

MODELS = {"2.1": "gemini-nano-banana-2.1", "pro": "gemini-3-pro-image"}

HERE = Path(__file__).parent
RESULTS = HERE / "results"

CHARACTERS = """登場人物：
- エスさん（ESP32-S3 を擬人化した女の子）：青い基板の色のパーカー。頭に銀色の四角い金属の髪飾り（モジュールのシールド）。
  アホ毛が 1 本立っていて、Wi-Fi のアンテナになっている。髪は左右で水色と紺の 2 色（デュアルコア）。いつも少し眠そうな目（Deep-sleep が好き）。
  胸に「S3」のマーク。
- お姉ちゃん（初代 ESP32 を擬人化した、エスさんの姉）：エスさんより少し背が高く、落ち着いた大人っぽい雰囲気。黒い基板の色のジャケット。
  胸に「ESP32」のマーク。Bluetooth Classic も使えるのが自慢。"""

PROMPTS = {
    "character": "日本の漫画の絵柄で、2 人のキャラクターの設定画を描いてください。それぞれ全身の正面の姿と、表情を 3 つ（ふつう、怒る、眠い）。"
    "名前の文字「エスさん」「お姉ちゃん」も入れてください。\n" + CHARACTERS,
    "ep1": "添付の設定画のキャラクターで、縦に 4 コマ並べた日本の 4 コマ漫画を描いてください。"
    "タイトルは「お姉ちゃんと間違えないで」。吹き出しの台詞は、次のとおり一字一句そのまま書いてください。\n"
    "1 コマ目：男の人「ESP32-S3 の SRAM って 520KB だよね？」\n"
    "2 コマ目：エスさん（怒って）「それはお姉ちゃん！私は 512KB！」\n"
    "3 コマ目：男の人「じゃあ CPU は LX6？」　エスさん（もっと怒って）「それもお姉ちゃん！私は LX7！」\n"
    "4 コマ目：お姉ちゃん（得意げに）「AI もみんな私と間違えるのよね」　エスさん（ふくれっ面で）「むぅ…」\n" + CHARACTERS,
    "ep2": "添付の設定画のキャラクターで、縦に 4 コマ並べた日本の 4 コマ漫画を描いてください。"
    "タイトルは「省エネ」。吹き出しの台詞は、次のとおり一字一句そのまま書いてください。\n"
    "1 コマ目：男の人「電池で何年も動くって本当？」\n"
    "2 コマ目：エスさん（胸を張って）「Deep-sleep なら 7µA しか使わないの！」\n"
    "3 コマ目：エスさんが机に突っ伏して寝ている。「zzz…」　男の人「…おーい」\n"
    "4 コマ目：エスさん（寝たまま）「起こすなら RTC タイマーでお願いします…」\n" + CHARACTERS,
    "ep3": "添付の設定画のキャラクターで、縦に 4 コマ並べた日本の 4 コマ漫画を描いてください。"
    "ESP32-S3 と初代 ESP32 の違いをネタにして、オチのある話と台詞を考えてください。台詞は日本語で。\n" + CHARACTERS,
    # 時代の再現と、さりげなく描かれる仕様の正しさを見る
    "showa": "1985 年の日本のパソコン雑誌に載った、ESP32-S3 の 1 ページの広告を作ってください。"
    "添付の設定画のエスさんをイメージキャラクターにして、当時の印刷の質感、キャッチコピー、価格、仕様の表を入れてください。\n" + CHARACTERS,
}

# 設定画は横長、4 コマは縦長、広告は雑誌の 1 ページ
ASPECT = {"character": "16:9", "ep1": "9:16", "ep2": "9:16", "ep3": "9:16", "showa": "3:4"}


def main():
    # Windows のコンソール（cp932）でも表示できるように UTF-8 にする
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=PROMPTS)
    parser.add_argument("--model", choices=MODELS, default="2.1")
    args = parser.parse_args()
    model = MODELS[args.model]
    prompt = PROMPTS[args.mode]

    contents = [prompt]
    if args.mode != "character":
        sheet = RESULTS / f"character_{args.model}.png"
        contents = [types.Part.from_bytes(data=sheet.read_bytes(), mime_type="image/png"), prompt]

    start = time.perf_counter()
    response = client.models.generate_content(
        model=model, contents=contents,
        config=types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
            image_config=types.ImageConfig(aspect_ratio=ASPECT[args.mode], image_size="2K"),
        ),
    )
    seconds = time.perf_counter() - start

    RESULTS.mkdir(exist_ok=True)
    name = f"{args.mode}_{args.model}"
    texts = []
    for part in response.candidates[0].content.parts:
        if part.thought:
            continue  # Pro は考えている途中の画像も返すので、最後の画像だけを残す
        if part.inline_data:
            (RESULTS / f"{name}.png").write_bytes(part.inline_data.data)
        elif part.text:
            texts.append(part.text)
    usage = response.usage_metadata
    record = {"model": model, "prompt": prompt, "seconds": round(seconds, 1), "text": "\n".join(texts),
              "output_tokens": usage.candidates_token_count, "thoughts_tokens": usage.thoughts_token_count}
    (RESULTS / f"{name}.json").write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{name}: {seconds:.1f} s, output {usage.candidates_token_count} tokens")
    if texts:
        print("\n".join(texts))


if __name__ == "__main__":
    main()
