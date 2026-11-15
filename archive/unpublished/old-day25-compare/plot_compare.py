"""Day 25: 14 問 × 答え方の採点（正確・一部不正確・誤り）を 1 枚の表にする

列の下に平均点（正確 1.0、一部不正確 0.5、誤り 0.0）と、答えにかかった時間の中央値を書く。

実行: uv run --with matplotlib day25/plot_compare.py
"""

import json
import statistics
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib import font_manager

HERE = Path(__file__).parent
REPO = HERE.parent
RESULTS = HERE / "results"
FONT = "C:/Windows/Fonts/BIZ-UDGothicR.ttc"
font_manager.fontManager.addfont(FONT)
plt.rcParams["font.family"] = font_manager.FontProperties(fname=FONT).get_name()

SURFACE, INK, INK2 = "#fcfcfb", "#0b0b0b", "#52514e"
COLORS = {"正確": "#0ca30c", "一部不正確": "#fab219", "誤り": "#d03b3b"}
MARK = {"正確": "○", "一部不正確": "△", "誤り": "×"}
ROUTES = {"flash-lite": "Flash-Lite\n（Day 5）", "flash": "3.8 Flash", "filesearch": "File Search\n（Day 12）",
          "live": "Live API\n（Day 19）", "gemma": "Gemma 4\n資料なし", "gemma-rag": "Gemma 4\n＋6ページ"}


def main():
    rows = [json.loads(l) for l in (RESULTS / "runs.jsonl").read_text(encoding="utf-8").splitlines()]
    cases = json.loads((REPO / "day05" / "testcases.json").read_text(encoding="utf-8"))
    cell = {(r["id"], r["route"]): r for r in rows}
    fig, ax = plt.subplots(figsize=(10, 7.4), facecolor=SURFACE)
    ax.set_facecolor(SURFACE)
    summary = {}
    for j, route in enumerate(ROUTES):
        for i, c in enumerate(cases):
            r = cell.get((c["id"], route))
            cat = r["judge"]["category"] if r else ""
            color = COLORS.get(cat, "#b4b2a9")
            ax.add_patch(plt.Rectangle((j + 0.04, i + 0.06), 0.92, 0.88, color=color, alpha=0.85, linewidth=0))
            ax.text(j + 0.5, i + 0.5, MARK.get(cat, "－"), ha="center", va="center", fontsize=12, color="white")
        rs = [cell[(c["id"], route)] for c in cases if (c["id"], route) in cell]
        scores = [r["judge"]["score"] for r in rs if r["judge"]["score"] is not None]
        mean, secs = sum(scores) / len(scores), statistics.median(r["seconds"] for r in rs)
        summary[route] = {"score": round(mean, 2), "seconds_median": secs,
                          **{k: sum(1 for r in rs if r["judge"]["category"] == k) for k in COLORS}}
        ax.text(j + 0.5, len(cases) + 0.45, f"{mean:.2f} 点", ha="center", va="center", fontsize=11, color=INK)
        ax.text(j + 0.5, len(cases) + 1.0, f"{secs:.0f} 秒", ha="center", va="center", fontsize=9, color=INK2)
    ax.set_xlim(0, len(ROUTES))
    ax.set_ylim(len(cases) + 1.4, 0)
    ax.set_xticks([j + 0.5 for j in range(len(ROUTES))], list(ROUTES.values()), fontsize=9.5, color=INK)
    ax.xaxis.tick_top()
    ax.set_yticks([i + 0.5 for i in range(len(cases))] + [len(cases) + 0.45, len(cases) + 1.0],
                  [f"{c['id']} {c['category']}" for c in cases] + ["平均点", "時間（中央値）"], fontsize=9.5, color=INK)
    ax.tick_params(length=0)
    for side in ax.spines.values():
        side.set_visible(False)
    handles = [plt.Rectangle((0, 0), 1, 1, color=c) for c in COLORS.values()]
    ax.legend(handles, ["○ 正確", "△ 一部不正確", "× 誤り"], loc="upper center", bbox_to_anchor=(0.5, -0.01), ncol=3,
              fontsize=9.5, frameon=False)
    fig.suptitle("Day 5 の 14 問を、この連載の答え方で解く（採点は gemini-3.1-pro-preview）", fontsize=12, color=INK,
                 x=0.01, ha="left")
    fig.tight_layout()
    fig.savefig(RESULTS / "compare.png", dpi=150, facecolor=SURFACE)
    (RESULTS / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(summary)


if __name__ == "__main__":
    main()
