# 話し方の実験の結果

`style_experiment.py` の出力です。

- `accurate_*.json` / `dramatic_*.json`：生成した台本
- `*.factcheck.json`：`fact_check.py`（Gemini）による判定をそのまま保存したもの
- `summary.json`：AI の判定を集計したもの

**`*.factcheck.json` と `summary.json` は、人が確かめる前の AI の判定です。** 記事では、誤りと判定されたものをすべてデータシートで確かめ直し、次のように数え直しています。

- 「消費電力 7 µA」はデータシート p.5 の言い回し（"Power consumption in Deep-sleep mode is 7µA"）どおりで、6本すべての台本に含まれる。AI は一部の台本でだけ誤りと判定していたため、数えない
- `dramatic_1` の「3000 mAh のバッテリーで 400 年以上持つ」は、AI は「資料にない」と判定したが、計算も誤り（正しくは約 49 年）なので中身の誤りとして数える

| 話し方 | 本数 | 事実の主張 | 中身の誤り | 資料の外の比較 |
| --- | --- | --- | --- | --- |
| accurate | 3 | 52 | 0 | 0 |
| dramatic | 3 | 52 | 1 | 2 |
