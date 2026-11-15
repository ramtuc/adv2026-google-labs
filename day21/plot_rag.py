"""Day 21: 3 つの条件（道具なし・file_search を直接・関数経由）の答えを、正しい・誤り・答えなしで数えて 1 枚にする

右側に、答えの音が届くまでの時間（中央値）を書く。集計は results/summary.json にも書く。

実行: uv run --with matplotlib day21/plot_rag.py
"""

import importlib.util
import json
import statistics
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib import font_manager

HERE = Path(__file__).parent
RESULTS = HERE / "results"
FONT = "C:/Windows/Fonts/BIZ-UDGothicR.ttc"
font_manager.fontManager.addfont(FONT)
plt.rcParams["font.family"] = font_manager.FontProperties(fname=FONT).get_name()

spec = importlib.util.spec_from_file_location("rag21", HERE / "live_rag.py")
rag21 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rag21)
Q = {q[0]: q for q in rag21.QUESTIONS}

SURFACE, INK, INK2 = "#fcfcfb", "#0b0b0b", "#52514e"
COLORS = {"正しい": "#0ca30c", "誤り": "#d03b3b", "答えなし": "#b4b2a9"}
LABEL = {"none": "道具なし", "native": "file_search を直接", "function": "関数経由で File Search"}


def kind(r):
    # 「ちょっと調べるね」だけで終わったものは答えなし
    said = r.get("said", "").replace("ちょっと調べるね。", "").strip()
    if not said:
        return "答えなし"
    return "正しい" if rag21.judge(r["said"], Q[r["question"]][2], Q[r["question"]][3]) else "誤り"


def main():
    rows = [json.loads(l) for l in (RESULTS / "runs.jsonl").read_text(encoding="utf-8").splitlines()]
    summary = {}
    fig, ax = plt.subplots(figsize=(10, 3.2), facecolor=SURFACE)
    ax.set_facecolor(SURFACE)
    for i, cond in enumerate(LABEL):
        rs = [r for r in rows if r["cond"] == cond]
        counts = {k: sum(1 for r in rs if kind(r) == k) for k in COLORS}
        t = [r["answer_audio_s"] or r["first_audio_s"] for r in rs if kind(r) != "答えなし"]
        med = round(statistics.median(t), 1) if t else None
        summary[cond] = {**counts, "answer_median_s": med}
        left = 0
        for k, n in counts.items():
            if n:
                ax.barh(i, n, left=left, height=0.6, color=COLORS[k], edgecolor=SURFACE, linewidth=2)
                ax.text(left + n / 2, i, str(n), ha="center", va="center", fontsize=10,
                        color="white" if k != "答えなし" else INK)
                left += n
        ax.text(15.4, i, f"答えまで {med} 秒" if med else "答えが来ない（60 秒）", va="center", fontsize=9.5, color=INK)
    ax.set_yticks(range(len(LABEL)), list(LABEL.values()), fontsize=10, color=INK)
    ax.invert_yaxis()
    ax.set_xlim(0, 20)
    ax.set_xticks([0, 5, 10, 15])
    ax.set_xlabel("回数（5 問 × 3 回）", fontsize=9, color=INK2)
    ax.tick_params(length=0, colors=INK2)
    for side in ax.spines.values():
        side.set_visible(False)
    handles = [plt.Rectangle((0, 0), 1, 1, color=c) for c in COLORS.values()]
    ax.legend(handles, ["正しい", "誤り", "答えなし（「ちょっと調べるね」だけ）"], loc="lower right", fontsize=9, frameon=False,
              bbox_to_anchor=(1.0, -0.42), ncol=3)
    fig.suptitle("Live API に声で ESP32-S3 の仕様を聞く（gemini-3.8-live、答えまでは中央値）", fontsize=12, color=INK,
                 x=0.01, ha="left")
    fig.tight_layout()
    fig.savefig(RESULTS / "answers.png", dpi=150, facecolor=SURFACE)
    (RESULTS / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(summary)


if __name__ == "__main__":
    main()
