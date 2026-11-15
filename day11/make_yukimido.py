"""Day 11: Nano Banana で、架空の和菓子屋「ゆきみ堂」の販促物を一式作る

- storefront : 冬の夜の店先（のれん・看板の日本語の文字）
- menu       : お品書き（品名と値段 8 品）。渡した文字と数字を、そのとおりに描けるか
- wagashi    : 上生菓子「雪うさぎ」の商品写真
- pattern    : 包装紙の柄
- giftbox    : wagashi と pattern を渡して、1 枚の贈答用の商品写真にまとめる（複数画像の合成）
- spring     : storefront を渡して、同じ構図のまま春に描き替える（編集）
- chara      : 看板娘「こゆき」の設定画
- manga      : chara を渡して、4 コマ漫画（吹き出しの日本語の台詞）

モデルは Nano Banana 2.1（gemini-nano-banana-2.1）と Nano Banana Pro（gemini-3-pro-image）を比べる。
入力の画像は、同じモデルで描いたものを使う。

実行: uv run --with google-genai --with python-dotenv python day11/make_yukimido.py storefront --model 2.1
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

RESULTS = Path(__file__).parent / "v2_results"

MENU = """お品書き
雪うさぎ（上生菓子）　三八〇円
椿餅　三二〇円
柚子大福　二八〇円
栗きんとん　四五〇円
羊羹「冬木立」一棹　一,二〇〇円
白玉ぜんざい　六五〇円
黒糖わらび餅　五二〇円
季節の上生菓子と抹茶　九〇〇円
※価格はすべて税込です"""

KOYUKI = """看板娘「こゆき」：20 歳くらいの女性。黒髪をまとめてかんざしを 1 本。白地に雪の結晶の柄の着物、えんじ色の前掛けに白い字で「ゆきみ堂」。
いつもにこにこしているが、甘いものに目がない。"""

PROMPTS = {
    "storefront": "日本の古い町並みにある和菓子屋の店先を、冬の夜、雪が降っている写真のように描いてください。"
    "紺色ののれんに白い字で「ゆきみ堂」、軒の上の木の看板に「和菓子 ゆきみ堂」、店先の小さな黒板に「本日の上生菓子 雪うさぎ」と書いてください。"
    "文字は一字一句そのまま、ほかの文字は入れないでください。",
    "menu": "和菓子屋「ゆきみ堂」の店内に掛けるお品書きを、和紙に毛筆で書いたように描いてください。縦書きで、次の文字を一字一句そのまま、すべて書いてください。"
    "ほかの文字や品は足さないでください。\n" + MENU,
    "wagashi": "上生菓子「雪うさぎ」の商品写真。白いうさぎの形の練り切りで、赤い目、緑の葉の耳。黒い漆の小皿にのせ、背景は落ち着いた和室。文字は入れない。",
    "pattern": "和菓子屋の包装紙の柄。紺地に、白い雪輪と小さな白いうさぎが散らばる、正方形に繰り返せる柄。文字は入れない。",
    "giftbox": "1 枚目の上生菓子を 6 個、桐の箱に並べ、箱の外側を 2 枚目の柄の包装紙で包みかけた、贈答用の商品写真を作ってください。"
    "お菓子の形と色、包装紙の柄は、渡した画像のとおりにしてください。文字は入れない。",
    "spring": "この店先の写真を、同じ構図、同じ店の造りのまま、春の昼に描き替えてください。雪は消して、桜を咲かせてください。"
    "のれんの「ゆきみ堂」、看板の「和菓子 ゆきみ堂」は変えず、黒板の文字だけを「本日の上生菓子 桜」に変えてください。",
    "chara": "日本の漫画の絵柄で、キャラクターの設定画を描いてください。全身の正面の姿と、表情を 3 つ（ふつう、驚く、うっとり）。"
    "名前の文字「こゆき」も入れてください。\n" + KOYUKI,
    "manga": "添付の設定画のキャラクターで、縦に 4 コマ並べた日本の 4 コマ漫画を描いてください。タイトルは「味見」。"
    "吹き出しの台詞は、次のとおり一字一句そのまま書いてください。\n"
    "1 コマ目：店主のおじいさん「こゆき、新作の雪うさぎだ。味見してくれ」\n"
    "2 コマ目：こゆき（うっとり）「かわいい…食べるのがもったいない…」\n"
    "3 コマ目：こゆきが目を閉じて、ぱくっと食べる。「でも食べる」\n"
    "4 コマ目：空の小皿が 6 枚並ぶ。店主「…味見は 1 個だ」　こゆき「6 羽ともおいしかったです！」\n" + KOYUKI,
}

ASPECT = {"storefront": "16:9", "menu": "3:4", "wagashi": "1:1", "pattern": "1:1", "giftbox": "4:3",
          "spring": "16:9", "chara": "16:9", "manga": "9:16"}

# 入力に渡す画像（同じモデルで描いたもの）
INPUTS = {"giftbox": ["wagashi", "pattern"], "spring": ["storefront"], "manga": ["chara"]}


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=PROMPTS)
    parser.add_argument("--model", choices=MODELS, default="2.1")
    args = parser.parse_args()
    model = MODELS[args.model]
    prompt = PROMPTS[args.mode]

    contents = [types.Part.from_bytes(data=(RESULTS / f"{src}_{args.model}.png").read_bytes(), mime_type="image/png")
                for src in INPUTS.get(args.mode, [])] + [prompt]

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
    record = {"model": model, "prompt": prompt, "inputs": INPUTS.get(args.mode, []), "seconds": round(seconds, 1),
              "text": "\n".join(texts), "output_tokens": usage.candidates_token_count,
              "thoughts_tokens": usage.thoughts_token_count}
    (RESULTS / f"{name}.json").write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{name}: {seconds:.1f} s, output {usage.candidates_token_count} tokens")
    if texts:
        print("\n".join(texts))


if __name__ == "__main__":
    main()
