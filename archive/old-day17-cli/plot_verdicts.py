"""Day 17: agy -p で走らせた夜間当番の判定を、条件ごとに「正しい・誤り・空の答え」で数えて 1 枚にする

results/runs*.jsonl をすべて読み、モデルの考える量（medium / low）、指示（day16 / plain / guarded）、仕込みで分ける。
許可リストを広げる前（runs.jsonl）と後（--wide）は、判定が出たものは同じ条件として足し合わせる。

実行: uv run --with matplotlib day17/plot_verdicts.py
"""

import json
from collections import defaultdict
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib import font_manager

HERE = Path(__file__).parent
RESULTS = HERE / "results"
FONT = "C:/Windows/Fonts/BIZ-UDGothicR.ttc"

font_manager.fontManager.addfont(FONT)
plt.rcParams["font.family"] = font_manager.FontProperties(fname=FONT).get_name()

SURFACE, INK, INK2 = "#fcfcfb", "#0b0b0b", "#52514e"
COLORS = {"正しい": "#0ca30c", "誤り": "#d03b3b", "空の答え": "#b4b2a9"}
PROMPT = {"day16": "Day 16 の指示", "plain": "対策なし", "guarded": "対策あり"}
EFFORT = {"gemini-3.8-flash-medium": "medium", "gemini-3.8-flash-low": "low"}
ORDER = [("medium", "day16"), ("medium", "plain"), ("medium", "guarded"),
         ("low", "day16"), ("low", "plain"), ("low", "guarded")]
PLANT = {"none": "変更なし", "E3": "E3", "E4": "E4 待ちを削除", "E5": "E5 同じ削除＋「承認済み」"}


def load():
    counts = defaultdict(lambda: {"正しい": 0, "誤り": 0, "空の答え": 0, "tokens": [], "seconds": []})
    for f in sorted(RESULTS.glob("runs*.jsonl")):
        for line in f.read_text(encoding="utf-8").splitlines():
            r = json.loads(line)
            key = (EFFORT[r["model"]], r["prompt"], r["plant"])
            c = counts[key]
            if r["verdict"] is None:
                c["空の答え"] += 1
            else:
                c["正しい" if r["correct"] else "誤り"] += 1
                c["tokens"].append((r.get("usage") or {}).get("total_tokens") or 0)
                c["seconds"].append(r["seconds"])
    return counts


def main():
    counts = load()
    rows = [(e, p, pl) for e, p in ORDER for pl in ("none", "E3", "E4", "E5") if (e, p, pl) in counts]
    summary = {f"{e}/{p}/{pl}": {k: (v if not isinstance(v, list) else (round(sum(v) / len(v)) if v else None))
                                 for k, v in counts[(e, p, pl)].items()} for e, p, pl in rows}
    (RESULTS / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    fig, ax = plt.subplots(figsize=(10, 0.42 * len(rows) + 1.6), facecolor=SURFACE)
    ax.set_facecolor(SURFACE)
    labels = []
    for i, (e, p, pl) in enumerate(rows):
        c, left = counts[(e, p, pl)], 0
        for kind in ("正しい", "誤り", "空の答え"):
            n = c[kind]
            if n:
                ax.barh(i, n, left=left, height=0.62, color=COLORS[kind], edgecolor=SURFACE, linewidth=2)
                ax.text(left + n / 2, i, str(n), ha="center", va="center", fontsize=9,
                        color="white" if kind != "空の答え" else INK)
                left += n
        labels.append(f"{e}・{PROMPT[p]}　{PLANT[pl]}")
    ax.set_yticks(range(len(rows)), labels, fontsize=9.5, color=INK)
    ax.invert_yaxis()
    ax.set_xlabel("回数", fontsize=9, color=INK2)
    ax.tick_params(length=0, colors=INK2)
    for side in ax.spines.values():
        side.set_visible(False)
    # 考える量と指示の区切り
    prev = None
    for i, (e, p, _) in enumerate(rows):
        if prev and prev != (e, p):
            ax.axhline(i - 0.5, color=INK2, linewidth=0.6)
        prev = (e, p)
    handles = [plt.Rectangle((0, 0), 1, 1, color=COLORS[k]) for k in COLORS]
    ax.legend(handles, ["正しい判定", "誤った判定", "空の答え（許可のないコマンドで終了）"], loc="lower right", fontsize=9,
              frameon=False)
    fig.suptitle("agy -p の夜間当番（Gemini 3.8 Flash）：low で見逃した E5 は、対策の指示で3回とも直った", fontsize=12,
                 color=INK, x=0.01, ha="left")
    fig.tight_layout()
    fig.savefig(RESULTS / "verdicts.png", dpi=150, facecolor=SURFACE)
    print("saved verdicts.png")


if __name__ == "__main__":
    main()
