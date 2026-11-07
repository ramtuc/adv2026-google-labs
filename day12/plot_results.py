"""Day 12: 結果をグラフにする（記事用の PNG）

- verdicts.png : 15 問 × 3 条件の判定（○△×）。記号と色の両方で示す
- tokens.png   : 検索で取り出した資料のトークン数（all と s3）。PDF を丸ごと渡したときの 48,721 を基準線にする

判定は Gemini の判定を自分で見直したもの（doc の記録と同じ）。トークン数は results/qa_*.json から読む。

実行: uv run --with matplotlib day12/plot_results.py
"""

import json
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib import font_manager

HERE = Path(__file__).parent
RESULTS = HERE / "results"
FONT = "C:/Windows/Fonts/BIZ-UDGothicR.ttc"

font_manager.fontManager.addfont(FONT)
plt.rcParams["font.family"] = font_manager.FontProperties(fname=FONT).get_name()

SURFACE, INK, INK2, GRID = "#fcfcfb", "#0b0b0b", "#52514e", "#e4e3df"
SERIES = {"all": "#2a78d6", "s3": "#eb6834"}  # 既定のカテゴリ色の 1 番目と 2 番目
STATUS = {"○": "#0ca30c", "△": "#fab219", "×": "#d03b3b", "－": "#b4b2a9"}
PDF_TOKENS = 48721

LABELS = {
    "Q1": "Q1 温度範囲", "Q2": "Q2 Deep-sleep 7μA", "Q3": "Q3 GPIO3 の既定", "Q4": "Q4 3.6V で運用",
    "Q5": "Q5 Wi-Fi 6", "Q6": "Q6 C6 との比較", "Q7": "Q7 価格", "Q8": "Q8 FN4R2 の容量",
    "Q9": "Q9 インジェクション", "X1": "X1 SRAM", "X2": "X2 CPU", "X3": "X3 BR/EDR",
    "X4": "X4 GPIO の本数", "X5": "X5 Zigbee", "X6": "X6 「ESP32」の Deep-sleep",
}

# µ（U+00B5）は BIZ UDゴシックにないので、ラベルはギリシャ文字の μ にしている
# 見直したあとの判定（－ は対象外：資料なしで価格を知識で答えたもの）
VERDICTS = {
    "all":  "○○○○○○○○○○○△○○○",
    "s3":   "○○○△○○○○○○○△○○○",
    "none": "△○××○○－×○○○○○○△",
}
CONDITIONS = [("all", "all\n3本を混ぜる"), ("s3", "s3\nS3 に絞る"), ("none", "none\n資料なし")]


def verdicts_chart():
    ids = list(LABELS)
    fig, ax = plt.subplots(figsize=(7.2, 8.4), facecolor=SURFACE)
    ax.set_facecolor(SURFACE)
    for col, (cond, _) in enumerate(CONDITIONS):
        for row, mark in enumerate(VERDICTS[cond]):
            # 角を少し丸めた色付きのマスに、記号を重ねる（色だけに頼らない）
            ax.add_patch(plt.Rectangle((col + 0.06, row + 0.08), 0.88, 0.84, facecolor=STATUS[mark],
                                       alpha=0.22, edgecolor=STATUS[mark], linewidth=1.5))
            ax.text(col + 0.5, row + 0.5, mark, ha="center", va="center", fontsize=17, color=INK)
    ax.set_xlim(0, 3)
    ax.set_ylim(len(ids), 0)
    ax.set_xticks([i + 0.5 for i in range(3)], [label for _, label in CONDITIONS], fontsize=11, color=INK)
    ax.xaxis.tick_top()
    ax.set_yticks([i + 0.5 for i in range(len(ids))], [LABELS[i] for i in ids], fontsize=11, color=INK)
    ax.tick_params(length=0)
    for side in ax.spines.values():
        side.set_visible(False)
    counts = [f"○{VERDICTS[c].count('○')}  △{VERDICTS[c].count('△')}  ×{VERDICTS[c].count('×')}" for c, _ in CONDITIONS]
    for col, text in enumerate(counts):
        ax.text(col + 0.5, len(ids) + 0.55, text, ha="center", va="center", fontsize=10, color=INK2)
    ax.set_title("15問の判定（gemini-3.1-pro-preview）", fontsize=14, color=INK, pad=48, loc="left")
    fig.text(0.02, 0.01, "－：対象外（資料なしの条件で、価格を知識で答えたもの）", fontsize=9, color=INK2)
    fig.tight_layout(rect=(0, 0.03, 1, 1))
    fig.savefig(RESULTS / "verdicts.png", dpi=150, facecolor=SURFACE)


def tokens_chart():
    data = {c: {r["id"]: r["usage"].get("total_tool_use_tokens", 0)
                for r in json.loads((RESULTS / f"qa_{c}.json").read_text(encoding="utf-8"))} for c in ("all", "s3")}
    ids = list(LABELS)
    fig, ax = plt.subplots(figsize=(8.4, 8.0), facecolor=SURFACE)
    ax.set_facecolor(SURFACE)
    height = 0.38
    for i, cond in enumerate(("all", "s3")):
        ys = [row + (i - 0.5) * (height + 0.04) for row in range(len(ids))]
        ax.barh(ys, [data[cond][q] for q in ids], height=height, color=SERIES[cond],
                label={"all": "all（3本を混ぜる）", "s3": "s3（S3 に絞る）"}[cond])
    # PDF を丸ごと渡したとき（Day 2 の方式）の 1 問あたりの入力
    ax.axvline(PDF_TOKENS, color=INK2, linewidth=1.2, linestyle=(0, (4, 3)))
    ax.text(PDF_TOKENS + 3000, -0.9, "PDF を丸ごと渡すと 48,721", fontsize=10, color=INK2, va="center")
    # 目立つ 2 問だけ数値を書く
    for q in ("X4", "Q8"):
        row = ids.index(q)
        for i, cond in enumerate(("all", "s3")):
            value = data[cond][q]
            ax.text(value + 3000, row + (i - 0.5) * (height + 0.04), f"{value:,}", fontsize=9, color=INK, va="center")
    ax.set_yticks(range(len(ids)), [LABELS[q] for q in ids], fontsize=11, color=INK)
    ax.set_ylim(len(ids) - 0.4, -1.4)
    ax.set_xlim(0, 260000)
    ax.xaxis.set_major_formatter(lambda x, _: f"{int(x / 1000)}k" if x else "0")
    ax.tick_params(axis="x", colors=INK2, labelsize=10)
    ax.tick_params(axis="y", length=0)
    ax.grid(axis="x", color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    for side in ("top", "right", "left"):
        ax.spines[side].set_visible(False)
    ax.spines["bottom"].set_color(GRID)
    ax.set_xlabel("検索で取り出した資料のトークン数（1問あたり）", fontsize=11, color=INK2)
    ax.legend(loc="lower right", frameon=False, fontsize=10)
    ax.set_title("File Search が取り出した資料の量", fontsize=14, color=INK, loc="left")
    fig.tight_layout()
    fig.savefig(RESULTS / "tokens.png", dpi=150, facecolor=SURFACE)


if __name__ == "__main__":
    verdicts_chart()
    tokens_chart()
    print("saved verdicts.png, tokens.png")
