"""Day 19: Live API のモデルごとに、話し終わりから返事の音が届くまでの時間を 1 枚にする

results/runs.jsonl の 1 回ごとの待ち時間を点で並べ、モデルごとの中央値に印を付ける。
答えの正しさは live_latency.py の judge で判定し直して results/summary.json に書く。

実行: uv run --with matplotlib archive/stackchan-live-latency/plot_latency.py
"""

import importlib.util
import json
import statistics
from collections import defaultdict
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib import font_manager

HERE = Path(__file__).parent
RESULTS = HERE / "results"
FONT = "C:/Windows/Fonts/BIZ-UDGothicR.ttc"
font_manager.fontManager.addfont(FONT)
plt.rcParams["font.family"] = font_manager.FontProperties(fname=FONT).get_name()

spec = importlib.util.spec_from_file_location("live19", HERE / "live_latency.py")
live19 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(live19)
Q = {q[0]: q for q in live19.QUESTIONS}

SURFACE, INK, INK2, GRID, DOT = "#fcfcfb", "#0b0b0b", "#52514e", "#e4e3df", "#2a6fdb"
ORDER = ["gemini-3.8-live", "gemini-3.8-live-extended-thinking", "gemini-3.1-flash-live-preview",
         "gemini-2.5-flash-native-audio-latest"]


def main():
    rows = [json.loads(l) for l in (RESULTS / "runs.jsonl").read_text(encoding="utf-8").splitlines()]
    by = defaultdict(list)
    for r in rows:
        by[r["model"]].append(r)
    summary = {}
    for m in ORDER:
        rs = by.get(m, [])
        lat = [r["latency_s"] for r in rs if r.get("latency_s") is not None]
        summary[m] = {
            "runs": len(rs), "median_s": round(statistics.median(lat), 2) if lat else None,
            "min_s": min(lat, default=None), "max_s": max(lat, default=None),
            "correct": {q: [live19.judge(r.get("said", ""), Q[q][2], Q[q][3]) for r in rs if r["question"] == q]
                        for q in Q if Q[q][2]},
            "multi_turn": sum(1 for r in rs if len(r.get("turns", [])) > 1),
        }
    (RESULTS / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    fig, ax = plt.subplots(figsize=(10, 3.8), facecolor=SURFACE)
    ax.set_facecolor(SURFACE)
    for i, m in enumerate(ORDER):
        lat = [r["latency_s"] for r in by.get(m, []) if r.get("latency_s") is not None]
        ax.scatter(lat, [i] * len(lat), s=60, color=DOT, alpha=0.45, edgecolor=SURFACE, linewidth=1, zorder=3)
        if lat:
            med = statistics.median(lat)
            ax.plot([med, med], [i - 0.28, i + 0.28], color=INK, linewidth=2, zorder=4)
            ax.text(med, i - 0.34, f"中央値 {med:.2f} 秒", ha="center", va="bottom", fontsize=9, color=INK)
    ax.set_yticks(range(len(ORDER)), ORDER, fontsize=9.5, color=INK)
    ax.invert_yaxis()
    ax.set_xlim(0, None)
    ax.set_xlabel("話し終わりから、返事の最初の音が届くまで（秒）", fontsize=9, color=INK2)
    ax.grid(axis="x", color=GRID, linewidth=0.8)
    ax.tick_params(length=0, colors=INK2)
    for side in ax.spines.values():
        side.set_visible(False)
    fig.suptitle("Live API の返事の待ち時間（5 問 × 3 回、点が 1 回分）", fontsize=12, color=INK, x=0.01, ha="left")
    fig.tight_layout()
    fig.savefig(RESULTS / "latency.png", dpi=150, facecolor=SURFACE)
    print(json.dumps(summary, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
