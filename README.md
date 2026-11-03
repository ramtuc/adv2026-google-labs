# adv2026-google-labs

Qiita アドベントカレンダー「25 Days of Google Labs: Dissecting Experimental AI from Specs to Under the Hood」のサンプルコードです。
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
```

## 構成

| パス | 内容 | 記事 |
| --- | --- | --- |
| `day01/baseline.py` | API疎通・モデル一覧・構造化出力の確認 | Day 1: Google Labs総点検 |

## 注意

- モデル名は記事執筆時点（2026年11月）のものです。404 になる場合は `day01/baseline.py` が表示するモデル一覧から選び直してください。
- `.env` は `.gitignore` 済みです。APIキーをコミットしないでください。
