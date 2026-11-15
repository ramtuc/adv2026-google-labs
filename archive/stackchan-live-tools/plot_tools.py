"""Day 20: モデルごとに、話し終わりから「最初の声」と「最初の関数呼び出し」が届くまでの時間を 1 枚にする

点が 1 回分。丸が声、四角が関数呼び出し。声より関数が後なら、「言ってから動く」ことになる。

実行: uv run --with matplotlib archive/stackchan-live-tools/plot_tools.py
"""

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

SURFACE, INK, INK2, GRID = "#fcfcfb", "#0b0b0b", "#52514e", "#e4e3df"
VOICE, CALL = "#2a6fdb", "#e07b00"
ORDER = ["gemini-3.8-live", "gemini-3.8-live-extended-thinking", "gemini-3.1-flash-live-preview",
         "gemini-2.5-flash-native-audio-latest"]


def main():
    rows = [json.loads(l) for l in (RESULTS / "runs.jsonl").read_text(encoding="utf-8").splitlines()]
    by = defaultdict(list)
    for r in rows:
        by[r["model"]].append(r)
    summary = {}
    fig, ax = plt.subplots(figsize=(10, 4.2), facecolor=SURFACE)
    ax.set_facecolor(SURFACE)
    for i, m in enumerate(ORDER):
        rs = by[m]
        voice = [r["first_audio_s"] for r in rs if r.get("first_audio_s") is not None]
        call = [r["first_call_s"] for r in rs if r.get("first_call_s") is not None]
        ax.scatter(voice, [i - 0.12] * len(voice), s=55, marker="o", color=VOICE, alpha=0.5, edgecolor=SURFACE, zorder=3)
        ax.scatter(call, [i + 0.12] * len(call), s=55, marker="s", color=CALL, alpha=0.5, edgecolor=SURFACE, zorder=3)
        mv, mc = statistics.median(voice), statistics.median(call)
        ax.text(8.6, i, f"声 {mv:.2f} 秒 / 関数 {mc:.2f} 秒", va="center", fontsize=9, color=INK)
        summary[m] = {"runs": len(rs), "pass": sum(bool(r["pass"]) for r in rs), "voice_median_s": round(mv, 2),
                      "call_median_s": round(mc, 2),
                      "call_before_voice": sum(1 for r in rs if r.get("first_call_s") is not None
                                               and r.get("first_audio_s") is not None
                                               and r["first_call_s"] < r["first_audio_s"])}
    ax.set_yticks(range(len(ORDER)), ORDER, fontsize=9.5, color=INK)
    ax.invert_yaxis()
    ax.set_xlim(0, 12)
    ax.set_xlabel("話し終わりから届くまで（秒）", fontsize=9, color=INK2)
    ax.grid(axis="x", color=GRID, linewidth=0.8)
    ax.tick_params(length=0, colors=INK2)
    for side in ax.spines.values():
        side.set_visible(False)
    handles = [plt.Line2D([], [], marker="o", linestyle="", color=VOICE, markersize=8),
               plt.Line2D([], [], marker="s", linestyle="", color=CALL, markersize=8)]
    ax.legend(handles, ["最初の声", "最初の関数呼び出し（表情・首・LED）"], loc="lower right", bbox_to_anchor=(1.0, 1.0), ncol=2, fontsize=9, frameon=False)
    fig.suptitle("声と動作、どちらが先に来るか（6 場面 × 3 回、点が 1 回分）", fontsize=12, color=INK, x=0.01, ha="left")
    fig.tight_layout()
    fig.savefig(RESULTS / "voice_vs_call.png", dpi=150, facecolor=SURFACE)
    (RESULTS / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(summary)


if __name__ == "__main__":
    main()
