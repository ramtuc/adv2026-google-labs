# Day 14 追加：Gemini アプリの Deep Research（2026-11-14）

- gemini.google.com、モデル表示 Hydrogen、Google AI Pro
- 「+」→「その他のアップロード」→「Notebooks」で、ノートブック「ESP32-S3シリーズ データシート」（1 件のソース、11/3 作成）を添付（API の File Search の代わり。初代・C6 のデータシートは入っていない）
- 「+」→ Deep Research。入力欄の下に「ソース」「ファイル」の設定
- 依頼：API の 1 回目（base）と同じ文。「ファイル検索にある公式データシート（ESP32、S3、C6）」を「添付したノートブックの公式データシート（ESP32-S3）」に変えた
- 計画（約 1〜2 分。画面の表示は「リサーチプランを生成中」のまま止まり、読み込み直すと出ていた）
  題「ESP32-S3仕様のWeb誤記検証」
  (1) ノートブックのデータシート（v2.2）で正解を確定（SRAM の内訳、RTC メモリ、ROM・PSRAM との区別／CPU、ULP／GPIO の総数と内蔵 Flash/PSRAM で占有されるピン／Deep-sleep の条件別の電流／Bluetooth の版、LE 専用か、Mesh）
  (2) 初代 ESP32・ESP32-C6 の公式データシートから比較用の値を集める（S2、C3、モジュール・開発ボードも補助的に）
  (3) 日本語中心に出典を集める（ブログ・Qiita・Zenn、ショップ、比較・入門サイト、動画の概要欄）。タイトル、媒体、実際にアクセスして確かめた URL、値を記録
  (4) 公式値と照合し、「合致」「前提条件の違いによる表記差（開発ボードの露出ピン数、PSRAM との合算、計測条件差）」「明確な誤記」を分ける
  (5) 誤記が初代や C6 と一致するか、どちらでもない誤記の由来（モジュール・ボードの仕様など）を特定し、一覧表のデータを整理
  (6) 誤りの多い項目と理由（テンプレートの流用、型番の紛らわしさ、チップとモジュールの混同、条件の読み違い、翻訳や生成 AI による誤記の連鎖）
  「数分で完了予定」。ボタン：計画を編集／リサーチを開始／Deep Research なしで再試行

## 経過（11-14）

- 17:30:36 リサーチを開始
- 17:38 「リサーチを開始しています…」のまま
- 17:49 ページを読み直しても同じ。「思考の過程を表示」を開いても、読み込み中の仮表示（灰色の帯）だけで、中身が出ない
- 18:09 読み直しても変わらず。約 40 分、検索を一度も始めないまま止まっている。ここで待つのをやめる（やり直すかは人が決める）
- 20 時半ごろ 人の判断で取り消し（「回答を停止」→「リサーチをキャンセルしますか？」→キャンセルする）

## 2 回目（11-14）

- 新しいチャット https://gemini.google.com/app/1d32a879ac5fc1a4
- モデルを「4 Hydrogen（日々の暮らしをサポート、New）」から「詳細なリサーチ 3.1 Pro」に変えた。1 回目は Hydrogen のまま動かしていた
- ノートブック「ESP32-S3シリーズ データシート」を同じく付け、同じ依頼文
- 計画は 7 段で、1 回目（Hydrogen、6 段）より短い。初代 ESP32 と C6 の値は「Google 検索で調べる」と書いている（1 回目は「公式データシートから」）。表記差と誤記の区別は計画に出てこない
- 20:35 リサーチを開始
- 20:40 完了（約 5 分。「最終レポートの作成には最大30分ほど」と途中に出た）。タイトル「ESP32-S3の仕様記述におけるWeb情報の正確性に関する調査報告と分析」

## 2 回目のレポート（3.1 Pro + ノートブック）

### 形
- 序論 → 正解仕様（3 チップの比較表）→ 項目ごとの論考（SRAM、CPU、GPIO、Deep-sleep、Bluetooth）→ 項目ごとの誤記表（URL 付き）→ 誤りが広がる理由 4 つ → 結論
- 出典は「使用」約 65、「参照されたが使用されなかった」約 32（画面の一覧を数えた）
- 頼んだ「出典ごとに URL を付けた表」は、記事ごとの表ではなく、**項目ごとに URL を並べた表**になった。記事ごとの値、何件中何件が誤りかの集計はない
- 正解値（512 KB、LX7 デュアルコア 240 MHz、45 本、7 µA、BLE 5 + Mesh・Classic 非対応）はデータシートと合う
- 「取り違えは C6 ではなく圧倒的に初代」と結論

### 誤りの表に挙がった URL（項目ごと）
- SRAM 520 KB: docs.espressif.com の Chip Series Comparison（v5.0）、lv.mouser.com の DFRobot DFR1221、zenn.dev/iot101、github esp-idf #10281
- CPU LX6: velxio.dev/ja/esp32-simulator
- GPIO 34: geeky-gadgets（S3 Super Mini）、hackaday.io Dendrite-S3、circuitpython.org Waveshare S3-Zero、pcbway blog、forum.arduino.cc、jp.robotshop.com Waveshare AMOLED、velxio.dev、conrad.com Joy-it、marutsu.co.jp/pc/i/6594、esp32.com t=27963
- Deep-sleep 10 µA: wiki.icbbuy.com、dronebotworkshop forum、forum.arduino.cc、reddit AskElectronics、esp32.com t=32177、github arduino-esp32 #11970
- Bluetooth 4.2 / BR/EDR: yahboom.net、ebay.com.au、esp32.com t=23059、docs.espressif.com esp-adf bluetooth-audio、github ESP32-A2DP #420

### こちらで確かめたこと・気づいたこと
- **公式ページを誤りの出典にしている**: docs.espressif.com の Chip Series Comparison（v5.0）は、SRAM が ESP32-S3 列で「512 KB」、ESP32 列で「520 KB」、GPIO は 45 と 34（web-fetch で確認）。S3 を 520 KB とは書いていない。**調べる側が、比較表の初代の列を S3 の値として読んだ**＝API 版（11-08）と同じ形の取り違え
- **関係のないページが出典**: marutsu.co.jp/pc/i/6594 は一覧のタイトルが「フラットケーブル基板コネクター34ピン」。GPIO の「34」と数字が合っただけのページ
- **別のチップのページ**: velxio.dev は「ESP32 Simulator — Xtensa LX6 Emulation」（初代のシミュレータ）。github arduino-esp32 #11970 はタイトルが「ESP32-C6 - high light sleep current」（C6 の light sleep）。それを S3 の Deep-sleep 10 µA の誤記として挙げている
- **質問を誤記として数えている**: esp32.com の「ESP32-S3 dual-mode Bluetooth 5.0 (BR/EDR + BLE)」、ESP32-A2DP #420「ESP32-S3 support Classic Bluetooth」などは、Classic が使えるかを尋ねる側のスレッドに見える（タイトルからの推測。中は開いていない）
- 開発ボードの引き出しピン数（34 ピン）を「チップの誤記」として数え、そのうえで「ボードとチップの混同が原因」と論じている。表記差と誤記を分けていない（1 回目の Hydrogen の計画にはこの区別があった）
- 比較表の C6 の Deep-sleep を「仕様非公開」と書いている。初代の Deep-sleep は表で「約 10 µA」、思考の欄では「5 µA」と揺れている
- 文章は長い論考調（「コピペ・ジャーナリズム」「Datasheet-Driven」など）。設計で起きうる損失の話が多く、照合の件数は出ない
- 出典に electwork.net（筆者のサイト）が入っている（誤りの表には挙がっていない）

## API の Max（11-14）の表 10 行を WebFetch で確かめた結果
- ○ 本物の誤り 3: sheen.bot、wiki.dfrobot.com/dfr1221、viewedisplay（いずれも S3 ボードの説明に「520KB SRAM」）
- △ 2: PCBWay（「ESP32 と S3 の両方とも約 10 μA」）、ExecuTorch discussion #8331（メンテナーの「RISC-V だよね？」という問いかけ、訂正なし）
- × ボードの値 4: espboards.dev RedPill（22 本）、geeky-gadgets Super Mini（34 本）、circuitpython.org S3-Zero（34 端子、同ページに SRAM 512 KB と正しく記載）、ICBbuy S3-Leaf（ボードの Deep-sleep 10uA）
- 確かめられず 1: newegg（403）
- Max は collaborative_planning を無視して plan の段階で最後まで書いた（572 s、検索 117 回）。run でもう一度調べた（539 s、検索 122 回）

## 3 回目（11-15）：Hydrogen でやり直し

- 12:55 新しいチャット、モデル Hydrogen、ノートブック「ESP32-S3シリーズ データシート」を付け、Deep Research をオン。依頼文は 1・2 回目と同じ（改行を空白にした。day13/results_app/app_prompt_hydrogen_retry.txt）
- 計画は 5 段（題「ESP32-S3仕様のWeb誤記調査」）。1 回目の Hydrogen と同じく、Deep-sleep の条件別の値（7・8・18 µA、ULP 稼働時 170・190 µA）、モジュール・ボードとの切り分け、旧版データシートの値まで入れている
- 読み込み直すと、計画のあとに「リサーチを開始」が送られた状態になっていた（私は押していない。自動で始まったか、画面で押されたかは不明）。表示は「リサーチを開始しています...」
- 13:0x ごろ 読み込み直すと、出典を集めている途中（YouTube、ブログなど）。1 回目と違い、検索は始まっている
- 13:06 完了（約 10 分）。レポートの抜粋は report_hydrogen_1115_errors.md
- 誤りとして挙げた 10 件を web-fetch で確かめた（11-15）
  - 本物の S3 の誤り 5：qiita nak435（S3 は Classic 対応）、espboards YD-ESP32-S3（5.4 LE）、linuxhint（26 GPIO。同じ記事に 45 も）、qiita makomako（GPIO 44）、esp-idf #10281（投稿者の「520KB」）
  - 別のチップの商品を S3 の誤りに数えた 3：楽天 and-u-online（ESP32 WROVER の CAM キット）、Yahoo zebrand（ESP-WROOM-32。「LX6」はページにない）、Yahoo ymsparts（ESP-WROOM-32 のセット、520KB）
  - ページに記載がない 1：Yahoo inter-trade（S3 ボードだが取得できた本文に「34 GPIO」がない）
  - ゆるい言い方 1：zenn maruhana（「約 10µA とされる」）
