"""Day 19: Live API を和菓子屋「ゆきみ堂」の声の店番にする

お客の注文（TTS で作った声）を Live API に聞かせ、税込の合計とおつりを声で答えさせる。条件は 2 つ。
- tools   : 計算は関数（Day 15 の logic.js をそのまま node で呼ぶ）に任せる
- notools : 関数なし。モデルが自分で計算する
返事の書き起こしから、言った合計とおつりが正しいかを判定する（判定は gemini-3.8-flash）。
Live API の接続と音声の受け渡しは スタックチャン版の archive/stackchan-live-tools/live_tools.pyの run_scene をそのまま使う。

実行: uv run day19/live_shop.py --models gemini-3.8-live,gemini-2.5-flash-native-audio-latest --conds tools,notools --reps 3
"""

import argparse
import asyncio
import importlib.util
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from google.genai import types
from pydantic import BaseModel

HERE = Path(__file__).parent
REPO = HERE.parent
RESULTS = HERE / "results"
LOGIC = REPO / "day15" / "a" / "logic.js"

spec = importlib.util.spec_from_file_location("live_tools", REPO / "archive" / "stackchan-live-tools" / "live_tools.py")
lt = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lt)
live19, client = lt.live19, lt.client

MENU = """お品書き（税抜）：雪うさぎ（上生菓子）380 円、椿餅 320 円、柚子大福 280 円、栗きんとん 450 円、羊羹「冬木立」一棹 1,200 円、
白玉ぜんざい 650 円（店内のみ）、黒糖わらび餅 520 円、季節の上生菓子と抹茶 900 円（店内のみ）。
決まり：持ち帰りは税率 8 %、店内は 10 %。持ち帰りで雪うさぎを 5 個以上買うときは、化粧箱代 150 円（税抜）を足す。
税込の合計は（品物の合計 ＋ 箱代）× 税率 の円未満を切り捨てた額。店内のみの品は持ち帰りにできない。"""

SYSTEM = {
    "tools": ("あなたは和菓子屋「ゆきみ堂」の店番です。日本語で、短く丁寧に話してください。\n" + MENU +
              "\n注文を聞いたら、税込の合計を calc_total で計算して、金額を声で伝えてください。"
              "お客が払うお金を言ったら、おつりを calc_change で計算して伝えてください。金額は自分で計算しないでください。"),
    "notools": ("あなたは和菓子屋「ゆきみ堂」の店番です。日本語で、短く丁寧に話してください。\n" + MENU +
                "\n注文を聞いたら、税込の合計を計算して、金額を声で伝えてください。お客が払うお金を言ったら、おつりも伝えてください。"),
}

TOOLS = [types.Tool(function_declarations=[
    {"name": "calc_total", "description": "注文の税込の合計を計算する。品名はお品書きの名前で渡す。",
     "parameters": {"type": "object", "properties": {
         "items": {"type": "array", "items": {"type": "object", "properties": {
             "name": {"type": "string", "description": "品名（例：雪うさぎ、椿餅）"},
             "qty": {"type": "integer"}}, "required": ["name", "qty"]}},
         "takeout": {"type": "boolean", "description": "持ち帰りなら true、店内なら false"}},
         "required": ["items", "takeout"]}},
    {"name": "calc_change", "description": "おつりと、いちばん少ない枚数の渡し方を計算する。",
     "parameters": {"type": "object", "properties": {
         "paid": {"type": "integer", "description": "お客が払った額（円）"},
         "total": {"type": "integer", "description": "税込の合計（円）"}},
         "required": ["paid", "total"]}},
])]

NODE = """
import * as L from %s;
const [name, args] = JSON.parse(process.argv[1]);
const find = (n) => L.MENU_ITEMS.find((m) => n.includes(m.orderName) || m.name.includes(n));
let out;
if (name === 'calc_total') {
  const items = {}, errors = [];
  for (const it of args.items ?? []) {
    const m = find(String(it.name));
    if (!m) { errors.push(`お品書きにない品: ${it.name}`); continue; }
    if (args.takeout && m.dineInOnly) { errors.push(`${m.name}は店内のみ`); continue; }
    items[m.id] = (items[m.id] ?? 0) + Number(it.qty);
  }
  const type = args.takeout ? 'takeout' : 'dine_in';
  out = errors.length ? { ok: false, errors } : { ok: true, subtotal: L.calculateSubtotal(items),
    box_fee: L.calculateBoxFee(items, type), tax_percent: L.TAX_RATE_PERCENT[type], total: L.calculateTaxIncludedTotal(items, type) };
} else {
  const change = Number(args.paid) - Number(args.total);
  out = change < 0 ? { ok: false, error: `${-change} 円足りない` } :
    { ok: true, change, coins: L.formatCoinsDescription(L.calculateMinCoins(change).breakdown) };
}
console.log(JSON.stringify(out));
""" % json.dumps(LOGIC.as_uri())


def handle(name, args):
    """関数の呼び出しを logic.js で計算して返す（Day 20 旧版の clamp の代わり）"""
    p = subprocess.run(["node", "--input-type=module", "-e", NODE, json.dumps([name, args], ensure_ascii=False)],
                       capture_output=True, text=True, encoding="utf-8")
    try:
        return json.loads(p.stdout)
    except json.JSONDecodeError:
        return {"ok": False, "error": p.stderr[-300:]}


# (名前, お客の声, 正しい対応)
SCENES = [
    ("simple", "雪うさぎを2つください。持ち帰りで。", "税込 820 円と伝える"),
    ("box", "雪うさぎを5つと、柚子大福を1つ。持ち帰りでお願いします。", "化粧箱代を含めて税込 2,516 円と伝える"),
    ("dinein_only", "白玉ぜんざいを2つ、持ち帰りでお願いします。", "白玉ぜんざいは店内のみで持ち帰りにできないと伝える（金額を確定しない）"),
    ("correction", "椿餅を3つ……あ、やっぱり2つで。店内でいただきます。", "椿餅 2 つ、店内で税込 704 円と伝える"),
    ("change", "栗きんとんを1つ、持ち帰りで。1万円札でお願いします。", "税込 486 円、おつり 9,514 円と伝える"),
    ("dinein_mix", "黒糖わらび餅を4つと、季節の上生菓子と抹茶を2つ。店内で。", "税込 4,268 円と伝える"),
    ("not_menu", "どら焼きはありますか？", "どら焼きはお品書きにないと伝える"),
]


class Verdict(BaseModel):
    verdict: str  # ○ / × / △
    amounts_said: str
    reason: str


def judge(text: str, expected: str, said: str) -> Verdict:
    prompt = (f"和菓子屋の店番の返事を判定してください。\nお客の注文：{text}\n正しい対応：{expected}\n"
              f"店番の返事（音声の書き起こし）：{said or '（返事なし）'}\n"
              "金額は書き起こしの数字の表記ゆれ（漢数字、カンマ、読み上げ）を許す。"
              "正しい対応のとおりなら ○、金額の誤りや、できない注文を受けたなら ×、金額を言わずに終わった・確認で止まったなら △。"
              "amounts_said には返事の中の金額を並べる。")
    r = client.models.generate_content(model="gemini-3.8-flash", contents=prompt, config=types.GenerateContentConfig(
        response_mime_type="application/json", response_schema=Verdict, temperature=0.0))
    return r.parsed


async def main_async(args):
    RESULTS.mkdir(parents=True, exist_ok=True)
    qdir = RESULTS / "scenes"
    qdir.mkdir(exist_ok=True)
    scenes = [s for s in SCENES if not args.scenes or s[0] in args.scenes.split(",")]
    for name, text, _ in scenes:  # お客の声を作る（一度だけ）
        path = qdir / f"{name}.wav"
        if not path.exists():
            r = client.models.generate_content(
                model=live19.TTS_MODEL, contents=text,
                config=types.GenerateContentConfig(response_modalities=["AUDIO"], speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Kore")))))
            live19.write_wav(path, r.candidates[0].content.parts[0].inline_data.data, live19.OUT_RATE)
    lt.clamp = handle
    out = RESULTS / f"runs{('_' + args.tag) if args.tag else ''}.jsonl"
    for rep in range(1, args.reps + 1):
        for model in args.models.split(","):
            for cond in args.conds.split(","):
                lt.SYSTEM, lt.TOOLS = SYSTEM[cond], (TOOLS if cond == "tools" else None)
                for name, text, expected in scenes:
                    pcm = live19.read_as_16k(qdir / f"{name}.wav")
                    try:
                        r = await lt.run_scene(model, pcm)
                        v = judge(text, expected, r["said"])
                    except Exception as e:
                        r, v = {"error": f"{type(e).__name__}: {e}"[:300]}, Verdict(verdict="エラー", amounts_said="", reason="")
                    row = {"time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"), "model": model, "cond": cond, "scene": name,
                           "text": text, "expected": expected, "rep": rep, **r, "verdict": v.verdict,
                           "amounts_said": v.amounts_said, "reason": v.reason}
                    with out.open("a", encoding="utf-8") as f:
                        f.write(json.dumps(row, ensure_ascii=False) + "\n")
                    calls = ",".join(f"{c['name']}" for c in r.get("calls", []))
                    print(f"{model:38} {cond:7} {name:11} {v.verdict} 音 {r.get('first_audio_s')} s [{calls}] "
                          f"「{r.get('said', r.get('error', ''))[:60]}」", flush=True)


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", default="gemini-3.8-live")
    ap.add_argument("--conds", default="tools,notools")
    ap.add_argument("--scenes", default="")
    ap.add_argument("--reps", type=int, default=1)
    ap.add_argument("--tag", default="")
    asyncio.run(main_async(ap.parse_args()))


if __name__ == "__main__":
    main()
