# Day 12 Pomelli（2026-11-14）

題材：筆者のサイト「電子工作でライフハック！」https://electwork.net/（11-11 に使うことに同意済み）

## 入り口
- labs.google.com/pomelli/about →「Let's get started」→ 別タブで onboarding
- 「Welcome to Pomelli — Generate free and on-brand marketing content with ease」
- 4 機能：1 Build your Business Profile（URL を入れると分析。サイトがなければエージェントが作るのを手伝う）2 Campaign ideas and assets 3 Product Photoshoot 4 Brand Book and Website
- 「Enter your website」→ https://electwork.net/ → 「Generating your Business Profile」（Studying your brand values…）約 1 分

## Business Profile（自動で読み取ったもの）
- 名前：電子工作でライフハック！
- 色：#ff8c00 / #f8f8f8 / #2c2c2c / #ffffff。フォント：Inter
- Tagline：Arduino・ESP32・ESP-IDFを使った電子工作・IoT・DIYの実践ガイド。
- Brand values：実機検証／データ重視／実践的学習
- Brand aesthetic：Prototyping Tactility／Mecha-Anime Graphicism／Approachable Technicality／Methodical Arrangement／Laboratory Warmth
- Tone：Technical／Practical／Analytical／Instructional
- Business overview：「…Arduino、ESP32、STM32などのマイコンを用いた電子工作、IoT、AI活用の実践ガイドを提供するWebメディアです。エンジニアのRamTuckeyが運営し、データシートの検証から基板設計、回路の波形計測まで『作って動かす』プロセスを詳しく解説するほか、オリジナル基板やツールの頒布も行っています。」
- Business details：Social（X、YouTube）、CTA（Shop Online）、住所・営業時間は空
- 「Choose model preferences — Define consistent traits for your AI-generated models across all outputs」
- 右に Pomelli Agent：Create Photoshoot／Create Campaigns／Create Brand Book
- サイトのソースと照合：RamTuckey（about.md）、STM32（トップ、全 13 回の連載）、波形（トップ「回路を組んで、波形を見る」）、頒布（shop/product-01「Arduino UNO用LEDシールド」）→ すべてサイトに書いてある。正確

## Campaigns
- 左メニュー：Business Profile（Overview／Catalog／Assets）、Campaigns、Photoshoot、Brand Book（New）、Website（New）
- 提案 3 つ（サイトは日本語なのに英語）：Built from Data, Proven on Hardware／Built by Hand, Proven by Data／Master Hardware Prototyping This Winter Break
- 「Master Hardware Prototyping This Winter Break」を開く → 20 秒ほどで 4 枚の縦長の素材。色はサイトのオレンジ、文字は英語
  1 MASTER HARDWARE THIS WINTER BREAK：サイトの実際の写真（木の机に基板と赤い線）
  2 Step 1: Design Custom PCBs：AI が描いた LED シールド。実物は LED が 6＋8＋6 のまとまり、絵は 1 列
  3 Step 2: Stack & Verify Signals：サイトの実際の写真（20231203_Arduino-74hc595-board/thumbnail.jpg を切り抜き）
  4 BUILD FUNCTIONAL DIY TECH NOW：AI が描いた絵（ドットマトリクスの記事の写真を元に、作業机の場面に）
  → 実際の写真と AI の絵が混ざり、画面では区別されない
- Catalog：「Failed to generate catalog from your website. Tap to retry.」（製品の一覧は作れなかった）
- Assets：サイトから取り込んだ画像が 45 枚ほど（記事のサムネイル、基板の写真、ロゴ）。Upload／Add from URL／Add from Drive

## Photoshoot
- 「Create a product photoshoot」と「Generate or edit an image」の 2 つ
- 製品の画像：Catalog は空。Assets（サイトから取り込んだ画像）から LED シールドの写真（shop/product-01/thumbnail.jpg と同じもの）を選ぶ
- テンプレートは 6 つまで。Style Inspirations（Cozy Autumn、Harvest Season、On Ice、Fruit Burst、Plastique Pop、Watercolor、In My Bag、Mangacore、Liquid Metal、Amber Hour、Vintage Tea）と Product shots（Studio、Floating、In Use、Contextual、Ingredient、Flatlay、Christmas…）。既定は Cozy Autumn・Harvest Season・Studio・Floating・In Use・Contextual
- 秋の 2 つを外して On Ice・Mangacore にして Generate → 40 秒ほどで 6 枚（9:16）。各画像に Animate（動画にする）、編集、共有
  - Studio：白背景。LED の 3 つのまとまり、左上の赤い POWER、シルク「@RamTuckey Arduino_LED_Sheild v0.0.1」、「3697416A_Y13」まで実物どおり
  - Floating：宙に浮かび、波形の光。並びはおおむね実物どおり
  - In Use：男性が作業机で使う／Contextual：作業マットで手が触れる
  - On Ice：氷の塊にライム・シダと閉じ込める（電子部品には合わない）。赤い LED が 8 個に増え、並びが縦の列に → 実物と違う
  - Mangacore：漫画の絵柄、「ピピピ」「ビビ」の効果音。シルクの絵と文字は保つ
- 画面の下：「AI コンテンツでブランドをどのように表現するかは、クリエイターが管理できます」

## Brand Book
- Step 1 表紙を選ぶ（写真入り／オレンジ／白／黒／白の 5 案）→ 写真入り。Step 2 載せる写真を 3 枚以上 → Skip
- 「Brand Book not published」、Publish のスイッチ（押していない）、Download PDF、Open in New Tab、Edit
- 表紙：作業机（オシロ、ブレッドボード、基板）の写真に「電子工作でライフハック！ BRAND BOOK」
- 01 Brand Overview：Business Profile の説明とタグライン、色
- 02 Brand Logo：**三日月のアイコン** をロゴとして、Variants（白地・黒地）、Logo Clear Space「5 px on each side」、Minimum Size「0.83 inch / 80 px width」
  - サイトのヘッダーにロゴ画像はない。PaperMod のダークモード切り替え（themes/PaperMod/layouts/partials/header.html の `<svg id="moon">`）がある
  - favicon はヘッドホンのキャラクターの絵 → 使われていない
  - → ダークモードの切り替えボタンをロゴだと思い込んだ（Business Profile の最初の画面の四角にも同じ三日月）
- 03 Typography：Inter
- 04 Color Palette：Marmalade Orange #FF8C00、Chalk White #F8F8F8、Onyx Black #2C2C2C、Pure White #FFFFFF（RGB・CMYK・HSL 付き）
- 05 Brand Voice：Values／Aesthetic／Tone

## Website
- 開くと自動で生成開始「Generating your Website ... This may take a few minutes.」→ 約 2 分半で V1。「Your website is not published」、Publish（押していない）、Regenerate、Preview in New Tab、Edit
- プレビューは別ドメイン（*.scf.usercontent…）の iframe。「This site is not live. Publish it in Pomelli to make it public.」
- 日本語のサイト（Campaigns の素材は英語だったのに）
- ヘッダー：三日月のロゴ＋「電子工作でライフハック！」、メニュー（実機検証の理念／実践ガイド・解説／プロトタイプ・ラボ／オリジナル基板／運営者）、YouTube、BOOTH ボタン
- ヒーロー：「『作って動かす』を、データシートと波形計測で極める。」バッジ「PRACTICAL IoT & HARDWARE MEDIA」「OPERATED BY RamTuckey」。ボタン「オリジナル基板・ツールを入手 (BOOTH)」「実践ガイド・解説を見る」。MCU: Arduino / ESP32 / STM32、ANALYTICS: Oscilloscope / Logic Analyzer、PCB: KiCad Design
- CORE VALUES：実機検証／データ重視／実践的学習の 3 枚
- TECHNICAL MEDIA：記事 4 本のカード（マイコン通信プロトコル／RP2040 ロジックアナライザ／PWM サーボとオシロ／Claude Code & MCP）。サムネイルはサイトの実物。説明文は書き直し
- HARDWARE LAB：6 枚（ESP32-S3 センサー基板、LED シールド、3D プリンターの治具、DIP スイッチのシールド、SMD のハンダ付け、オシロの画面）。うち 2 枚（SMD、オシロ）には ✦ の印 → AI が描いた画像に印が付く
- ORIGINAL HARDWARE SHOP：「実機検証から生まれたオリジナル基板 & 開発ツール頒布」「…カスタムプリント基板、3Dプリント製アタッチメント、開発補助ツールを『BOOTH』にて頒布」
  - 分類：ブレイクアウト基板（ESP32/STM32 等のピンヘッダ配置を最適化）／3D プリントパーツ（基板ホルダーやスマート治具）／計測用アダプター（オシロやロジアナにつなぐ補助具）
  - サイトの実物：shop は 3 つ（Arduino LED シールド、HAKKO フラックス転倒防止スタンド〈3D プリント〉、MCP23017 Arduino 拡張シールド）。すべて BOOTH（shop/_index.md「BOOTHで販売・公開」）
  - → BOOTH は正しい。ブレイクアウト基板・計測用アダプターは売っていない（作り足し）。3D プリントは近い
- ABOUT US：RamTuckey「Engineer & Editor」、TARGET MCUs: Arduino, ESP-IDF, STM32, RP2040、DESIGN TOOLS: KiCad, Fusion360, Python, C/C++、DISTRIBUTION: BOOTH Official Shop（Fusion360 は pc-setup/_index.md に 1 か所）
- フッター：三日月のロゴ、OFFICIAL LINKS（electwork.net、BOOTH、X @RamTuckey、YouTube）、「Report legal issue」
