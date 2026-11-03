"""Day 3 (2/3): 台本をマルチスピーカー TTS で音声にする

make_script.py が作った results/script.json を読み、2人の声で合成して
results/overview.wav に保存する。

実行: uv run day03/synthesize.py
"""

import json
import time

from common import RESULTS, Script, save_wav, synthesize


def main():
    script = Script.model_validate(json.loads((RESULTS / "script.json").read_text(encoding="utf-8")))
    start = time.perf_counter()
    pcm = synthesize(script.turns)
    print(f"合成にかかった時間: {time.perf_counter() - start:.1f} 秒（{len(script.turns)} ターン）")
    save_wav(RESULTS / "overview.wav", pcm)


if __name__ == "__main__":
    main()
