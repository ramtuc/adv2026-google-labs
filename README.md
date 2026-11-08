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
uv run day06/check_export.py day06/stitch_export  # Stitch の書き出しの外部依存を調べる

# Day 7（Stitch の書き出しのオフライン化は、先に day07/ui/stitch_offline で npm install）
uv run day07/make_offline.py      # Stitch の書き出し → day07/www/stitch/
uv run day07/generate_ui.py       # SDK で画面を作る → day07/www/index.html
uv run day07/mock_server.py       # ESP32 の代わりに画面と /api を返す（http://127.0.0.1:8080/）
uv run day07/firmware/pack_www.py # 画面を gzip にしてファームウェアに埋め込む
# ファームウェアは ESP-IDF v5.5 で: idf.py -C day07/firmware set-target esp32s3 build flash

# Day 9
uv run day09/make_song.py auto              # Lyria 3.5 に歌詞を任せて作曲（custom で正しい歌詞を渡す）
uv run --with pillow day09/make_videos.py   # 曲を静止画付きの動画に
uv run day09/make_lyric_videos.py           # 歌詞の字幕と波形を入れた動画に

# Day 10
uv run day10/make_video.py text             # Gemini Omni 1.2 Flash で動画（image で写真から、edit で image を編集）

# Day 11
uv run day11/make_manga.py character         # Nano Banana 2.1 で設定画（ep1〜ep3 で4コマ、showa で昭和の広告、--model pro で Pro）
uv run --with pillow --with numpy --with scipy day11/spot_the_difference.py make   # 間違い探しを作る（diff で差分、solve で Gemini が解く）

# Day 12
uv run day12/make_store.py                  # File Search のストアを作り、3姉妹のデータシートを入れる（data/ に PDF を置く）
uv run day12/file_search_qa.py all          # 15 問に答える（s3 で ESP32-S3 に絞る、none で資料なし）
uv run --with matplotlib day12/plot_results.py   # 判定とトークン数のグラフ

# Day 13
uv run day13/deep_research.py plan           # Deep Research に計画を出させる（run で承認して実行、--max で Max、--strict で厳しい依頼）
uv run day13/check_sources.py                 # 出典のリダイレクト先を読む（出典のサイトには直接アクセスしない）
uv run --with matplotlib day13/plot_runs.py   # 3 回の実行を比べるグラフ

# Day 14（ESP-IDF v5.5.3。Antigravity が S3 用に直したもの）
idf.py -C day14/door_sensor set-target esp32s3
idf.py -C day14/door_sensor -p <ポート> flash monitor

# Day 15（day14/door_sensor のテストに、わざとバグを入れたコードを当てる）
powershell -File day14/door_sensor/test/run_host_tests.ps1   # パソコン上のテスト（MSVC）
uv run day15/mutate.py host --all             # ミューテーション（device --port <ポート> で実機、--new で N1〜N6）
uv run --with matplotlib day15/plot_mutants.py

# Day 16（Antigravity の Automations の合間に、day14/door_sensor をこっそり変える）
uv run day16/plant.py E1                      # E1〜E5 を入れる。restore で元に戻す
uv run --with matplotlib day16/plot_runs.py
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
| `day06/check_export.py` | Stitch が書き出した HTML の外部依存と、ボタンの処理を調べる | Day 6: Stitch(1) 自然言語から UI を作る |
| `day06/stitch_export/` | Stitch から .zip で書き出したもの（HTML・画面の画像・DESIGN.md）。AI が生成したもので、数値には誤りを含む | |
| `day07/make_offline.py` | Stitch の書き出しをインターネットなしで表示できる形にする（Tailwind の CSS を先に作る、アイコンを切り出す、ボタンを API につなぐ） | Day 7: Stitch(2) 書き出した UI を ESP32-S3 で動かす |
| `day07/generate_ui.py` | 同じ画面を gemini-3.8-flash で、ESP32 から配信する前提で作る | |
| `day07/mock_server.py` | ESP32 と同じ API を仮の値で返す確認用のサーバー | |
| `day07/www/` | ESP32 で配信する画面（`index.html` = SDK 版、`stitch/` = Stitch 版） | |
| `day07/firmware/` | ESP32-S3 のファームウェア（SoftAP、esp_http_server、/api/*、NVS） | |
| `day08/ai_studio_app/` | Google AI Studio の Build モードが作った ESP32-S3 のシリアルログ解析アプリ（書き出したまま。[説明](day08/README.md)） | Day 8: Google AI Studio Build モード |
| `day09/` | Lyria 3.5（Gemini API）と Google Flow Music で作った ESP32-S3 の歌と、字幕入りの動画を作るスクリプト（[説明](day09/README.md)） | Day 9: Google Flow Music × Lyria 3.5 API |
| `day10/` | Gemini Omni 1.2 Flash（Gemini API）で ESP32-S3 の紹介動画を作るスクリプトと、Google Flow で作った動画 | Day 10: Google Flow × Gemini Omni API |
| `day11/` | Nano Banana 2.1 と Pro で ESP32-S3 を擬人化した設定画・4コマ漫画・昭和の広告と、間違い探しを作って解かせるスクリプト | Day 11: Nano Banana で ESP32-S3 を擬人化 |
| `day12/` | File Search（Gemini API の RAG）に ESP32・ESP32-S3・ESP32-C6 のデータシートを入れ、Day 2 の質問と取り違えを誘う質問に答えさせるスクリプト | Day 12: File Search API |
| `day13/` | Deep Research（通常・Max）に Web の ESP32-S3 の仕様の誤りを調べさせ、出典を確かめるスクリプト | Day 13: Deep Research API |
| `day14/` | 初代 ESP32 向けのドアセンサー（door_sensor_original_esp32）と、Antigravity が ESP32-S3 用に直したもの（door_sensor）、差分と実機のログ | Day 14: Google Antigravity (1) |
| `day15/` | Antigravity が書いた door_sensor のテスト（1 回目は round1_tests、2 回目は day14/door_sensor/test）に、わざとバグを入れたコード 19 個を当てるスクリプトと結果 | Day 15: Google Antigravity (2) |
| `day16/` | Antigravity の Automations に渡した夜間当番の指示、当番の合間にコードを変えるスクリプト、当番が書いた log.csv とアラート、実行の記録 | Day 16: Google Antigravity (3) |

## 注意

- モデル名は記事執筆時点（2026年11月）のものです。404 になる場合は `day01/baseline.py` が表示するモデル一覧から選び直してください。
- `.env` は `.gitignore` 済みです。APIキーをコミットしないでください。
