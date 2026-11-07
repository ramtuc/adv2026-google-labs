"""Day 13: Deep Research の 3 回の実行（通常、通常・厳しい依頼、Max）を比べるグラフ

時間・Web 検索の回数・入力トークンを、同じ並びの 3 つの小さな棒グラフにする（軸は 1 つずつ）。
値は results/report_*.json の usage と seconds から読む。

実行: uv run --with matplotlib day13/plot_runs.py
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

SURFACE, INK, INK2, GRID, BAR = "#fcfcfb", "#0b0b0b", "#52514e", "#e4e3df", "#2a78d6"
RUNS = [("standard", "通常"), ("standard_strict", "通常・\n厳しい依頼"), ("max", "Max")]
# 頼んだ「誤った記事の表」を作ったか（棒の下に書く）
TABLE = {"standard": "表なし", "standard_strict": "表なし", "max": "表あり"}


def main():
    rows = []
    for kind, label in RUNS:
        r = json.loads((RESULTS / f"report_{kind}.json").read_text(encoding="utf-8"))
        u = r["usage"]
        searches = sum(g["count"] for g in u.get("grounding_tool_count", []) if g["type"] == "google_search")
        rows.append((label, r["seconds"] / 60, searches, u["total_input_tokens"] / 1e6, TABLE[kind]))

    metrics = [("時間（分）", 1, "{:.1f}"), ("Web 検索（回）", 2, "{:.0f}"), ("入力（百万トークン）", 3, "{:.2f}")]
    fig, axes = plt.subplots(1, 3, figsize=(10, 4.2), facecolor=SURFACE)
    labels = [r[0] for r in rows]
    for ax, (title, i, fmt) in zip(axes, metrics):
        values = [r[i] for r in rows]
        ax.set_facecolor(SURFACE)
        bars = ax.bar(labels, values, color=BAR, width=0.55)
        for bar, v in zip(bars, values):
            ax.text(bar.get_x() + bar.get_width() / 2, v, fmt.format(v), ha="center", va="bottom",
                    fontsize=10, color=INK)
        ax.set_title(title, fontsize=12, color=INK, loc="left")
        ax.set_ylim(0, max(values) * 1.18)
        ax.tick_params(axis="x", colors=INK, labelsize=10, length=0)
        ax.tick_params(axis="y", colors=INK2, labelsize=9)
        ax.grid(axis="y", color=GRID, linewidth=0.8)
        ax.set_axisbelow(True)
        for side in ("top", "right", "left"):
            ax.spines[side].set_visible(False)
        ax.spines["bottom"].set_color(GRID)
    fig.suptitle("Deep Research の3回の実行（同じテーマ）", fontsize=14, color=INK, x=0.01, ha="left")
    fig.text(0.01, 0.01, "頼んだ「誤った記事の表」：" + "、".join(f"{r[0].replace(chr(10), '')}は{r[4]}" for r in rows),
             fontsize=10, color=INK2)
    fig.tight_layout(rect=(0, 0.05, 1, 0.95))
    fig.savefig(RESULTS / "runs.png", dpi=150, facecolor=SURFACE)
    print("saved runs.png")


if __name__ == "__main__":
    main()
