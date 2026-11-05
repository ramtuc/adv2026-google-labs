# Day 3 再現版の音声サンプル

ESP32-S3 データシート v2.2 をもとに、Gemini API で作った音声です。最後の2件だけは、比較用に Gemini Notebook（旧 NotebookLM）の音声解説をダウンロードしたものです。

| ファイル | 内容 | 作り方 |
| --- | --- | --- |
| [overview.mp3](overview.mp3) | 2人のホスト（Aoi / Ren）による音声解説（日本語、4分36秒） | `make_script.py` で台本 → `synthesize.py` で `gemini-3.8-flash-tts` のマルチスピーカー合成 |
| [interrupt_I1.mp3](interrupt_I1.mp3) | 割り込み I1「Deep-sleep のときってどれくらい電流を食う？」への応答 | `interactive.py`：台本を書き足してから合成（声が出るまで 46.6 秒） |
| [interrupt_I2.mp3](interrupt_I2.mp3) | 割り込み I2「ESP32-C6 と比べたらどっちが省電力？」への応答 | 同上（27.1 秒） |
| [interrupt_I3.mp3](interrupt_I3.mp3) | 割り込み I3「Wi-Fi 6 対応なら TWT で省電力にできる？」への応答 | 同上（34.2 秒） |
| [live_I1.mp3](live_I1.mp3) | I1 の英語版への応答 | `live_interrupt.py`：Live API（`gemini-3.8-live`）で音声のまま応答（0.82 秒） |
| [live_I2.mp3](live_I2.mp3) | I2 の英語版への応答 | 同上（1.16 秒） |
| [live_I3.mp3](live_I3.mp3) | I3 の英語版への応答 | 同上（1.09 秒） |
| [notebook_overview_ja.mp3](notebook_overview_ja.mp3) | Gemini Notebook の音声解説「7マイクロアンペアの極小頭脳ESP32-S3」（日本語・21分39秒） | Gemini Notebook の Studio で作成・ダウンロード（AI が生成したもので、数値に誤りを含むことがあります） |
| [notebook_overview_en.mp3](notebook_overview_en.mp3) | Gemini Notebook の音声解説「Inside the ESP32-S3 Microcontroller Architecture」（英語・22分39秒）。Interactive モードを試した版 | 同上 |

括弧内の秒数は、質問を受けてから最初の声が出るまでの時間です。
`results/` に出力される WAV（Gemini Notebook の2件は m4a）を `ffmpeg -ac 1 -b:a 64k` で MP3 に変換しています。
