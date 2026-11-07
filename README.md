# adv2026-google-labs

Qiita「[google-labs-deep-dive Advent Calendar 2026](https://qiita.com/advent-calendar/2026/google-labs-deep-dive)」のサンプルコードです。
Google Labs の実験的AIツールの裏側を、Google GenAI SDK（`google-genai`）で検証・再現します。

## 必要なもの

- [uv](https://docs.astral.sh/uv/)
- Google AI Studio の APIキー（Pro 系モデルを使うので、課金を有効にしたプロジェクトのキーを推奨）

## セットアップ

```bash
git clone https://github.com/ramtuc/adv2026-google-labs
cd adv2026-google-labs
uv sync
cp .env.example .env   # .env を開いて GEMINI_API_KEY を自分のキーに書き換える
```

> Windows の PowerShell 5.1 で `echo ... > .env` のように作ると UTF-16 になり、キーが読めません。`.env` はエディタで UTF-8（BOMなし）で保存してください。

## 実行

```bash
uv run day01/baseline.py
uv run day02/grounded_qa.py

# Day 3（順に実行）
uv run day03/make_script.py       # データシート → 対話台本
uv run day03/synthesize.py        # 台本 → 2人の声の音声
uv run day03/interactive.py       # 割り込みへの応答（台本を書き足す版）
uv run day03/live_interrupt.py    # 割り込みへの応答（Live API 版）
uv run day03/style_experiment.py  # 話し方の指示と事実の誤りの関係

uv run day05/evaluate.py          # System Prompt の比較（コード判定 + LLM 採点）
```

## 使用した資料

| 記事 | 資料 |
| --- | --- |
| Day 2〜Day 4 | [ESP32-S3 Series Datasheet v2.2](https://www.espressif.com/sites/default/files/documentation/esp32-s3_datasheet_en.pdf)（Espressif Systems） |

資料はこのリポジトリには含めていません。各スクリプトは初回実行時に上のURLから `day02/data/`・`day03/data/` へダウンロードします。版が更新されるとページ番号や内容が変わり、`questions.json` の正解と合わなくなることがあります。

## 構成

| パス | 内容 | 記事 |
| --- | --- | --- |
| `day01/baseline.py` | API疎通・モデル一覧・構造化出力の確認 | Day 1: Google Labs総点検 |
| `day02/grounded_qa.py` | データシートだけを根拠にしたQAと引用の検証 | Day 2: Gemini Notebook（旧 NotebookLM）の境界値テスト |
| `day02/questions.json` | Day 2 の質問と正解 | |
| `day03/make_script.py` ほか | 音声解説の台本生成・マルチスピーカーTTS・割り込みの再現 | Day 3: Gemini Notebook（旧 NotebookLM）Audio Overview解剖 |
| `day03/samples/` | Day 3 で作った音声と、比較用の Gemini Notebook の音声解説（MP3） | |
| `day04/samples/` | Day 4 で Gemini Notebook の Studio から書き出したもの（スライド・動画・表・画像） | Day 4: Gemini Notebook（旧 NotebookLM）Studio の機能紹介 |
| `day05/evaluate.py` | 2つの System Prompt をテストケースで比べる評価ハーネス（Stax 風の LLM 採点） | Day 5: LLM の出力を数値で評価する |
| `day05/testcases.json` | Day 5 のテストケース（質問・正解例・必須の語） | |

## 注意

- モデル名は記事執筆時点（2026年11月）のものです。404 になる場合は `day01/baseline.py` が表示するモデル一覧から選び直してください。
- `.env` は `.gitignore` 済みです。APIキーをコミットしないでください。
