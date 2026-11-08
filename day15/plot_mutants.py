"""Day 15: わざと入れたバグ（19 個）を、1 回目と 2 回目のテストが見つけたかを 1 枚の表にする

列：1 回目（パソコン上・実機）、2 回目（パソコン上・実機の自動モード）
○＝見つけた、×＝見逃した、－＝当てていない（1 回目のパソコン上のテストは main.c を試せないなど）

実行: uv run --with matplotlib day15/plot_mutants.py
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

SURFACE, INK, INK2 = "#fcfcfb", "#0b0b0b", "#52514e"
STATUS = {"○": "#0ca30c", "×": "#d03b3b", "－": "#b4b2a9"}

COLUMNS = [
    ("1回目\nパソコン上", ["mutants_host.json"]),
    ("1回目\n実機", ["mutants_device.json"]),
    ("2回目\nパソコン上", ["mutants_host_round2.json", "mutants_host_round2_new.json"]),
    ("2回目\n実機（自動）", ["mutants_device_round2.json", "mutants_device_round2_new.json"]),
]


def load(files):
    marks = {}
    for f in files:
        for r in json.loads((RESULTS / f).read_text(encoding="utf-8")):
            if r["name"] != "ORIG":
                marks[r["name"]] = ("○" if r["caught"] else "×", r["desc"])
    return marks


def main():
    cols = [(title, load(files)) for title, files in COLUMNS]
    descs = {}
    for _, marks in cols:
        descs.update({k: v[1] for k, v in marks.items()})
    rows = [f"H{i}" for i in range(1, 8)] + [f"D{i}" for i in range(1, 7)] + [f"N{i}" for i in range(1, 7)]

    fig, ax = plt.subplots(figsize=(11, 10.5), facecolor=SURFACE)
    ax.set_facecolor(SURFACE)
    for c, (_, marks) in enumerate(cols):
        for r, name in enumerate(rows):
            mark = marks.get(name, ("－",))[0]
            ax.add_patch(plt.Rectangle((c + 0.06, r + 0.1), 0.88, 0.8, facecolor=STATUS[mark], alpha=0.22,
                                       edgecolor=STATUS[mark], linewidth=1.2))
            ax.text(c + 0.5, r + 0.5, mark, ha="center", va="center", fontsize=15, color=INK)
    ax.set_xlim(0, len(cols))
    ax.set_ylim(len(rows), 0)
    ax.set_xticks([i + 0.5 for i in range(len(cols))], [t for t, _ in cols], fontsize=11, color=INK)
    ax.xaxis.tick_top()
    ax.set_yticks([i + 0.5 for i in range(len(rows))], [f"{n} {descs[n]}" for n in rows], fontsize=10, color=INK)
    ax.tick_params(length=0)
    for side in ax.spines.values():
        side.set_visible(False)
    # 区切り：H（判定の処理）、D（ハードウェア。2 回目に Antigravity へ伝えたのは D1・D3・D4・D5）、N（伝えていない）
    for y in (7, 13):
        ax.axhline(y, color=INK2, linewidth=0.8)
    ax.set_title("わざと入れたバグを、テストは見つけたか", fontsize=14, color=INK, loc="left", pad=52)
    fig.text(0.01, 0.01, "○ 見つけた　× 見逃した　－ 当てていない（1回目のパソコン上のテストは main.c を試せない）。"
             "2回目の前に Antigravity へ伝えたのは D1・D3・D4・D5。N は伝えていない", fontsize=9, color=INK2)
    fig.tight_layout(rect=(0, 0.03, 1, 1))
    fig.savefig(RESULTS / "mutants.png", dpi=150, facecolor=SURFACE)
    print("saved mutants.png")


if __name__ == "__main__":
    main()
