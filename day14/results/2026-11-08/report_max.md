*免責事項：本レポートの情報は、Espressif Systems社が発行する特定のデータシート（ESP32-S3 Series Datasheet v2.2など）に基づいています。半導体の仕様は公式ドキュメントのリビジョンアップ（改訂）やエラッタ（不具合情報）の公開によって後から修正されることがあります。実際の製品設計・開発においては、必ずEspressif公式ウェブサイトから最新のドキュメントを自ら取得し、内容を確認してください。*

# ESP32-S3の主な仕様に関するWeb上の情報と公式データシートの比較・検証レポート

## Executive Summary
本レポートの結論として、ESP32-S3の仕様に関してWeb上で飛び交う不正確な情報の全体像と正解を以下の通り提示する。

*   **SRAM容量の誤り**: 正解は「512 KB」だが、Web記事や動画では初代の「520 KB」と誤記されるケースが多発している。
*   **GPIO本数の誤り**: 正解は「45本」だが、「34本」（初代の仕様、または特定開発ボードの物理的な引き出しピン数）とする誤りが散見される。
*   **Bluetooth対応の誤り**: 正解は「Bluetooth 5 (LE) 専用」だが、「Bluetooth 4.2 (Classic/BLE両対応)」や、別モデルの「Bluetooth 5.3」と誤認されている。
*   **消費電流の誤り**: Deep-sleep時の正解は「7 μA」だが、初代の「10 μA」や、周辺回路の漏れ電流を含む開発ボード全体の実測値（数 mA）と混同されている。
*   **誤りの根本原因**: 初代ESP32の仕様の安易なコピー＆ペースト、チップ単体と開発ボードの物理的制約の混同、そして急増した派生モデル（Cシリーズなど）の最新仕様との情報混線が主な理由である。

---

ESP32-S3に関するWeb上の技術記事、動画プラットフォームでの解説、や商品ページには、公式データシートと合致しない誤った仕様が掲載されているケースが多数確認できる。
特にSRAM容量（520 KB）やGPIO本数（34本）、Deep-sleep消費電流（10 μA）などにおいて、初代ESP32のスペックがESP32-S3のものとして誤用される傾向が非常に強いと推測される。
また、CPUアーキテクチャやBluetooth規格において、ESP32-S3（Xtensa LX7、Bluetooth 5）に対して、別モデルであるESP32-C6（RISC-V、Bluetooth 5.3）などの特徴を誤って帰属させる事例も見受けられる。
さらに、チップ単体が持つGPIOの総数と、特定の開発ボード（ブレッドボード向け基板など）が物理的に引き出しているピン数が混同され、誤った仕様として拡散されている可能性が高い。

Espressif Systems社が開発したESP32シリーズは、IoT（Internet of Things：モノのインターネット）デバイス向けの安価（ベアチップ単体で約2.80ドル〜3ドル台、モジュールで約4.00ドル）で高性能（最大240 MHz駆動、最大600 DMIPSの演算能力）なマイクロコントローラとして、世界中のエンジニアや趣味の電子工作愛好家に広く普及している [cite: 1, 2]。しかし、モデルのバリエーション（2016年の初代ESP32登場から、2020年〜2023年の短期間にESP32-S2、S3、C3、C6、H2、P4などが立て続けに投入され急拡大）が急速に拡大した結果、Web上の解説記事や販売ページにおいて、異なるモデルの仕様が入り混じった不正確な情報が飛び交う事態となっている [cite: 1, 3]。本レポートでは、Espressif社の公式データシートを「正解」と定義した上で、Web上に存在するESP32-S3の仕様に関する記述を網羅的に調査し、どのような誤りが生じているのか、そしてなぜそのような取り違えが発生するのかを体系的に分析する。

## Espressif公式データシートに基づく各モデルの仕様定義

Web上の情報の真偽を判定するためには、まず基準となる公式仕様を正確に把握する必要がある。ESP32シリーズは、基本となるSoC（System on a Chip：システム・オン・チップ）の名称に「S」や「C」などのサフィックス（接尾辞）を付与することで、アーキテクチャやターゲット用途の違いを明確にしている。ここでは、比較の対象となる「ESP32-S3」「初代ESP32」「ESP32-C6」の3モデルについて、SRAM容量、CPU、GPIO本数、Deep-sleep消費電流、Bluetoothの対応状況をデータシートから抽出する。

| 項目 | ESP32-S3 (本レポートの検証対象) | 初代 ESP32 | ESP32-C6 |
| :--- | :--- | :--- | :--- |
| **SRAM容量** | 512 KB [cite: 4] | 520 KB [cite: 4] | 512 KB (HP) + 16 KB (LP) [cite: 4] |
| **CPU** | Xtensa 32-bit LX7 デュアルコア (最大240 MHz) [cite: 4] | Xtensa 32-bit LX6 シングル/デュアルコア (最大240 MHz) [cite: 4] | RISC-V 32-bit シングルコア (HP: 最大160 MHz) [cite: 4] |
| **GPIO本数** | 45本 (プログラマブル) [cite: 4] | 34本 (プログラマブル) [cite: 4] | 30本 または 22本 (パッケージに依存) [cite: 4] |
| **Deep-sleep消費電流** | 7 μA [cite: 4] | 10 μA [cite: 4] | 7 μA [cite: 4] |
| **Bluetooth対応** | Bluetooth 5 (LE) [cite: 4] | Bluetooth 4.2 BR/EDR & Bluetooth LE [cite: 4, 5, 6] | Bluetooth 5.3 (LE) [cite: 4] |

公式データシートの記述から、ESP32-S3はAI（人工知能）やDSP（デジタル信号処理）向けのベクトル演算命令を備えた高性能な「Xtensa LX7」コアを採用し、45本という非常に多いGPIO（汎用入出力）ピンを備えていることがわかる [cite: 4]。また、無線通信に関しては、Wi-Fiに加えて省電力なBluetooth 5 (LE)をサポートしている [cite: 4]。

一方で、2016年に登場した初代ESP32は、Xtensa LX6コアを採用し、520 KBのSRAM（Static Random Access Memory: 電源供給中のみデータを保持する高速な作業用メモリ）と34本のGPIOを備え、Classic Bluetooth（BR/EDR）とBLE（Bluetooth Low Energy）の両方（Bluetooth 4.2）をサポートするデュアルモード仕様であった [cite: 4, 6]。近年登場したESP32-C6は、命令セットアーキテクチャをオープン標準のRISC-V（リスク・ファイブ）に刷新し、最新のBluetooth 5.3やZigbee/Threadなどのメッシュネットワーク規格に対応している [cite: 4]。
これら3つのモデルは、世代もターゲットとする市場も異なるが、製品名が酷似していることから、Web記事の執筆者やショップの販売業者、さらには動画解説者が仕様を混同する最大の温床となっている。



## Web記事・動画におけるESP32-S3の記述値と誤りの検証

前項で定義した公式仕様を基準として、Web上のブログ記事、ショップの商品ページ、解説サイト、ならびにYouTube等の動画メディアを調査した。その結果、ESP32-S3の仕様として誤った値を記載している事例が多数確認された。以下の表は、各出典におけるESP32-S3の記述値と、それがどのチップの仕様と取り違えられているか（一致しているか）をまとめたものである。

| 誤りが含まれる項目 | 記事・動画に書かれているESP32-S3の値 | 公式の正解値 | 取り違え元（推測） | 出典URL |
| :--- | :--- | :--- | :--- | :--- |
| **SRAM容量** | 520 KB | 512 KB [cite: 4] | 初代ESP32 (520 KB) [cite: 4] との完全な一致 | https://viewedisplay.com/product/esp32-s3-1-5-inch-amoled-touch-screen-dev-board-uart-smart-display/ [cite: 7] |
| **SRAM容量** | 520 KB | 512 KB [cite: 4] | 初代ESP32 (520 KB) [cite: 4] との完全な一致 | https://www.sheen.bot/store/esp32-s3-round-touch-display-development-board-1-85-ai-voice-wireless-charging [cite: 8] |
| **SRAM容量** | 520 KB | 512 KB [cite: 4] | 初代ESP32 (520 KB) [cite: 4] との完全な一致 | https://thinkrobotics.com/products/esp32-s3-cam-ai-vision-module (動画連動) [cite: 9] |
| **CPU** | Xtensa LX7 RISC-V | Xtensa LX7 [cite: 4] | XtensaとRISC-Vのアーキテクチャ用語の混同、またはCシリーズとの混同 | https://www.luisllamas.es/en/esp32-s3/ [cite: 10] |
| **GPIO本数** | 34 GPIO | 45本 [cite: 4] | 初代ESP32 (34本) [cite: 4]、または特定開発ボードの物理ピン数との混同 | https://microcontrollerslab.com/esp32-pinout-use-gpio-pins/ [cite: 11] |
| **GPIO本数** | 34 GPIO | 45本 [cite: 4] | 同上 | https://circuitpython.org/board/waveshare_esp32_s3_zero/ [cite: 12] |
| **GPIO本数** | 34 GPIO | 45本 [cite: 4] | 同上 | https://www.youtube.com/watch?v=wWu2ZAAvjgo (YouTube動画解説) [cite: 13] |
| **GPIO本数** | 26本 | 45本 [cite: 4] | モジュール内部で消費されたピンを除いた利用可能ピン数との混同 | https://www.elprocus.com/difference-between-esp32-s3-vs-esp32/ [cite: 14] |
| **Deep-sleep** | 10 μA | 7 μA [cite: 4] | 初代ESP32 (10 μA) [cite: 4] との完全な一致 | https://projectech.in/guides/esp32-deep-sleep-battery-projects/ [cite: 15] |
| **Deep-sleep** | 10 μA | 7 μA [cite: 4] | 初代ESP32 (10 μA) [cite: 4] との完全な一致 | https://wiki.icbbuy.com/doku.php?id=developmentboard:esp32-s3-leaf [cite: 16] |
| **Bluetooth** | Bluetooth 4.2 | Bluetooth 5 [cite: 4] | 初代ESP32 (Bluetooth 4.2) [cite: 4] との完全な一致 | https://www.newegg.com/p/3D0-0053-000P0 [cite: 17] |
| **Bluetooth** | Bluetooth 4.2 | Bluetooth 5 [cite: 4] | 初代ESP32 (Bluetooth 4.2) [cite: 4] との完全な一致 | https://www.ebay.com/itm/407233522500 [cite: 18] |
| **Bluetooth** | Bluetooth 4.2 | Bluetooth 5 [cite: 4] | 初代ESP32 (Bluetooth 4.2) [cite: 4] との完全な一致 | https://www.youtube.com/watch?v=Na9w5zA7Rk0 (YouTube動画レビュー) [cite: 19] |
| **複数項目複合** | SRAM 520KB / 34 GPIO | 512 KB / 45本 | 初代ESP32との完全な混同 | https://www.geeky-gadgets.com/esp32-s3-super-mini-guide/ (動画連動記事) [cite: 20] |
| **Bluetooth** | Bluetooth 5.3 | Bluetooth 5 [cite: 4] | ESP32-C6 (Bluetooth 5.3) [cite: 4] との混同 | https://www.antoniadis.com.cy/en/stem-robotics-programming/esp32esp8266-boards/esp32-s3-n16r8-wifi-bluetooth-ble-50-development-board [cite: 21] |

表から明らかなように、Web上（動画プラットフォームにおける解説も含む）に存在するESP32-S3の誤情報の多くは、初代ESP32の仕様（520 KBのSRAM、34本のGPIO、10 μAのDeep-sleep、Bluetooth 4.2）と完全に一致している。また、一部の新しい解説記事やショップでは、最新のESP32-C6の仕様（Bluetooth 5.3やRISC-Vアーキテクチャ）がESP32-S3の仕様として誤って割り当てられているケースが存在する。次章では、これらの誤りがなぜ発生し、放置されているのかについて、項目ごとに詳細な分析と理由の推測を行う。

## 項目別の誤りの分析と理由の推測

### SRAM容量における「520 KB」の呪縛
ESP32-S3の公式SRAM容量は512 KBである [cite: 4]。しかし、ディスプレイを搭載した開発ボードの商品ページ [cite: 7, 8]、YouTubeのハードウェア紹介動画 [cite: 9, 20]、マイコンの比較記事 [cite: 14] などにおいて、ESP32-S3のSRAMを「520 KB」と記述する例が多数見受けられる。

この誤りの直接的な原因は、初代ESP32のSRAM容量が520 KBであること（厳密には320 KBのデータRAMと200 KBの命令RAMの合計）に起因していると推測される [cite: 4, 22]。ESP32-S3はアーキテクチャが刷新され、キャッシュメモリやTCM（Tightly Coupled Memory: CPUに直結され、キャッシュを介さず遅延なくアクセスできる専用メモリ）の構成が変更された結果、ユーザーが利用可能なSRAMのベース容量が512 KBとなった [cite: 4]。
しかし、一般的なWebライターや販売業者、さらには動画クリエイターにとって、「520 KB」も「512 KB」も誤差の範囲内として認識されやすい。さらに、初代ESP32に関する技術記事がWeb上に膨大に蓄積されているため、新しいESP32-S3の紹介記事を書く際や、商品ページのスペック表を作成する際に、古いESP32のテンプレートをコピー＆ペーストし、チップ名を「ESP32-S3」に書き換えただけで公開している可能性が高い。

### CPUアーキテクチャにおけるXtensaとRISC-Vの混同
ESP32-S3のメインCPUは「Xtensa 32-bit LX7 デュアルコア」である [cite: 4]。しかし、一部の解説記事において「Xtensa LX7 RISC-V processor」という、本来全く異なる2つの命令セットアーキテクチャを合体させた矛盾する表現が用いられている [cite: 10]。

この現象の背景には、Espressif社の最近のプロセッサ戦略の変化がある。初代ESP32やESP32-S2、ESP32-S3までは、Cadence社のXtensaアーキテクチャが採用されていた [cite: 4, 23]。しかし、ライセンス料の削減とエコシステムの恩恵を受けるため、ESP32-C3やESP32-C6といったCシリーズ以降、同社はメインCPUにオープン標準の「RISC-V」を採用するようになった [cite: 4, 23]。
さらに事態を複雑にしているのが、ESP32-S3に内蔵されている「ULP（Ultra-Low-Power）コプロセッサ」の存在である。ESP32-S3は、メインのXtensaコアとは別に、省電力モード（Deep-sleep時）にセンサーの監視などを行うための小さなサブプロセッサを内蔵しており、このULPコプロセッサの1つに「RISC-Vアーキテクチャ」が採用されているのである [cite: 4, 24]。
つまり、「Espressif社はRISC-Vへ移行しつつある（Cシリーズ）」という業界ニュースと、「ESP32-S3にはRISC-V（コプロセッサ）が載っている」という断片的な事実が絡み合い、結果としてメインCPUがRISC-Vである、あるいはXtensaとRISC-Vのハイブリッドであるかのような誤解（例：「Xtensa LX7 RISC-V」）を生み出していると強く推測される。

### GPIO本数におけるチップ仕様とボード仕様の乖離
公式データシートによれば、ESP32-S3チップ本体は45本のプログラマブルGPIOを備えている [cite: 4]。これに対し、初代ESP32のGPIOは34本である [cite: 4]。しかし、Web上ではESP32-S3のGPIOを「34本」と解説する記事や商品ページ、YouTubeチュートリアル動画が散見される [cite: 11, 12, 13]。

この誤りには、2つの複合的な理由が考えられる。第一に、前述のSRAMと同様に、初代ESP32のスペック（34 GPIO）をそのままコピペしたことによる誤謬である [cite: 11]。第二に、そしてより深刻なのが「SoC（チップ）」と「開発ボード」の物理的制約の混同である。チップ単体のSoCとして本来45本のネイティブGPIOを備えていても、実際の開発ボードではフラッシュメモリやPSRAMなどの内部コンポーネントのために複数のピンが内部的に消費（占有）される。そのため、基板外周のエッジヘッダ等でユーザーが物理的にアクセス・利用できるピン数は少なくなるのが実態である。例えば、Waveshare社が販売する「ESP32-S3-Zero」といった極小サイズのエッジデバイス向け開発ボードは、基板の物理的なサイズ制約から、チップが持つ45本のピンすべてを外部に引き出すことができず、実際にユーザーがアクセスできるピン数を「34本」としている [cite: 12, 25]。多くの初心者は、データシートのSoC単体の仕様を読むのではなく、手元にある開発ボードのマニュアルやショップの記述を参考にする。そのため、「開発ボードから引き出されたピン数（34本）」が「ESP32-S3というチップ自体のGPIO数」として誤って一般化され、技術ブログなどに波及していると推測できる。
また、これらフラッシュメモリやPSRAMに内部接続されているピンはユーザーが自由に使えない（これらの専用ピンに外部から電気信号を入力したり出力を割り当てたりすると、内部のメモリ通信と衝突し、システムがクラッシュしたりフラッシュが破損するため）ため、実質的な利用可能ピン数を意図的に減らして記載している比較記事（例：26本と記載）も存在し [cite: 14, 26, 27]、これがさらなる数値のブレを生んでいる。

### Deep-sleep消費電流のカタログスペックと実測値・旧モデルの混同
ESP32シリーズの最大の売りは、バッテリー駆動のIoTデバイスに適したDeep-sleep（ディープスリープ）モードである。公式仕様では、ESP32-S3のDeep-sleep時の消費電流は「7 μA（マイクロアンペア）」である [cite: 4]。一方で初代ESP32は「10 μA」とされている [cite: 4]。Web記事の中には、ESP32-S3の仕様として「10 μA」と記述しているものが複数存在する [cite: 15, 16]。

この誤りも、初代ESP32の仕様の流用である可能性が高い。しかし、消費電流に関する誤解の根本的な理由は、データシートの「チップ単体の理論値」と「市販の開発ボードの実測値」の極端な乖離にある。
公式の7 μAや10 μAという値は、SoC単体を理想的な環境で動作させた場合の数値である [cite: 28]。現実の開発ボードには、USB-UART変換チップ、LDO（低ドロップアウト）電圧レギュレータ、電源LEDなど、チップ以外の電力を消費するコンポーネントが多数実装されている。これらの周辺回路の漏れ電流により、実際のDeep-sleep時の消費電力は数 mA（ミリアンペア：μAの1000倍）に達することが珍しくない [cite: 28, 29]。
このように、実測値がデータシートの理想値から大きくかけ離れているため、記事の執筆者は自ら正確な測定を行うことを諦め、過去の有名な記事（多くは初代ESP32について書かれたもの）の「約10 μA」という数字を、ESP32-S3の記事でも安易に引用してしまう傾向があると考えられる。

### Bluetooth規格の変遷とサポート状況の誤解
通信仕様に関しても、誤解が非常に多い。ESP32-S3は「Bluetooth 5 (LE)（Bluetooth Low Energy）」に対応している [cite: 4]。しかし、一部のショップや記事、動画レビューなどでは「Bluetooth 4.2」[cite: 17, 18, 19] や「Bluetooth 5.3」[cite: 21] と表記されている。

「Bluetooth 4.2」という誤記は、完全に初代ESP32の仕様からの流用である [cite: 4, 5]。ここで注目すべきは、初代ESP32はBluetooth 4.2に準拠しつつ、オーディオ再生などに使われる「Classic Bluetooth (BR/EDR)」と、省電力な「BLE (Bluetooth Low Energy)」の両方をサポートするデュアルモードチップであったという点である [cite: 4, 5, 30]。対照的に、ESP32-S3はIoTセンサー用途に特化するため、Classic Bluetoothのサポートを切り捨て、BLE専用チップとなっている [cite: 4, 5, 30]。この「Classicが使えなくなった」という重要な仕様変更を理解せずに、古い仕様をそのままESP32-S3に当てはめている記事や動画が多い [cite: 19]。
一方で、「Bluetooth 5.3」と誤記しているケースは、新製品であるESP32-C6 [cite: 4] やESP32-C2 [cite: 31] の仕様との混同である。最新のスマートホーム規格に対応したCシリーズの情報を調べたライターが、「最新のESP32＝Bluetooth 5.3」という誤った認識を持ち、ESP32-S3の紹介文にその数値を組み込んでしまったと推測される。

## 誤った仕様情報がもたらす下流への影響（ダウンストリームへの被害）

このような仕様の「誤表記」が放置され、開発者や企業がそれを鵜呑みにした場合、現実のプロジェクトにおいて深刻な時間的・経済的損失（ダウンストリームへの影響）をもたらす。

*   **ソフトウェア移植の失敗**: ESP32-S3が初代ESP32と同様に「Bluetooth 4.2 (Classic対応)」であると誤認して設計を進めた場合、オーディオ再生（A2DP）やレガシーなシリアル通信（SPP）といったClassic Bluetooth専用の既存コードをS3に移植しようとした段階でコンパイルエラーや動作不能に陥る。結果として、プロジェクトの無線プロトコル自体をBLEやWi-Fiへ根本から設計変更する羽目になり、莫大な工数の無駄が生じる [cite: 30, 32]。
*   **ハードウェア設計の手戻り**: GPIOが初代と同じ「34本」しかないと誤認したままESP32-S3の基板設計を行うと、本来はネイティブUSB（USB OTG）やカメラインターフェース、大容量の外部PSRAM等のためにアサインできるはずのピンを活用できず、不要な外部拡張IC（USB-UART変換チップやIOエキスパンダ）をBOM（部品表）に加えてしまう。これにより、製造コストと基板サイズが無駄に増大する [cite: 32, 33]。
*   **メモリ枯渇によるクラッシュ**: 逆に、SRAMが「520 KB」あると信じ込んでギリギリのメモリ設計を行った場合、実際の512 KB（さらに無線スタック等のシステム予約領域を除いた残りのヒープ）に収まらず、量産直前でメモリ不足によるシステムクラッシュが頻発するリスクがある [cite: 32, 34]。

## 公式ドキュメントの正しい歩き方（正確な仕様へのアクセス方法）

本レポートを読んだユーザーは「公式データシートが正解なのはわかったが、Espressifの膨大な公式ドキュメント群のうち、結局どの資料のどの章を見ればハードウェア仕様を最速で正確に確認できるのか？」という疑問を抱くはずである。正しい情報へアクセスするための具体的なナビゲーションは以下の通りである。

1.  **基本仕様とピンアサインの確認（Datasheet）**: チップ単体の正確なSRAM容量、GPIOの総数、消費電流（Deep-sleep時の理論値）、Bluetoothの対応バージョンを確認したい場合は、対象チップの「Datasheet（データシート）」のPDFを開き、冒頭の**「1 ESP32-XX Series Comparison」** または **「Specifications」** の章を最初に確認する。さらに、どのピンが内部でフラッシュメモリ等に占有されているかを知るには、データシート内の「Pin Definitions」や「Strapping Pins」の項目を参照する [cite: 4]。
2.  **内部アーキテクチャの詳細（Technical Reference Manual）**: CPUのTCMの割り当て、割り込み処理の仕組み、周辺回路（I2C, SPI, UART）のレジスタレベルでの挙動や詳細なメモリマップを確認したい場合は、「Technical Reference Manual（TRM）」を参照する。
3.  **基板設計と周辺回路の実装（Hardware Design Guidelines）**: 開発ボードを自作する場合や、USBの差動ペアの配線ルール（インピーダンス整合など）、電源のデカップリングコンデンサの配置、アンテナ周辺のクリアランスなど、物理的な回路設計の正解を知りたい場合は「Hardware Design Guidelines」を参照する [cite: 32]。

Web上の二次情報や販売サイトのスペック表を検索する前に、まずはEspressif社の公式ドキュメントサイト（docs.espressif.com）にアクセスし、これらの一次資料（PDF）の該当章を直接確認することが、誤情報によるプロジェクトの失敗を防ぐための最も確実でタイムロスのないアプローチである。

**Sources:**
1. [fabscene.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHkDgFUNUEw_VsEAg8isU2XdBU7ge_uW39ak4YYkfLaA_MC9BJ8x-3PTSJM-TcmtiwBo_ffeqzIBv6HqswTqxE4E9eAEOJRs711gKM0QOoFmXvL34rjY7Xq6Y_cQXj75UQ2bLfe3PHXFO-XO1e3evE3CVIfpRdUGtGZOR4O07nWrltnVg==)
2. [otronic.nl](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFznD1jxSCg-eb_hTUeUA-dJnA9NfnKFveVSzuFlMYhRL8qVoSyK9TWxSDtVstVs9lsg5isD1neOeIYnc0K4dmqPSzy8Vl28LZP1Gkn-xWrW4XVZJEXC6cnIwqcwcVhElIyOTVKUDm6xn3oZeJKHptWa7G-zAMCc8m1pwqZ3heRlJtd6n8agBh_DtM=)
3. [ampheo.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH0ss2fQ4AbNu51EED6G7lhr7GOaauYJQlMOjyiNF7exHqrV_u5wcF-Nx8nKJ9kQEQTrASKTDtbqJIbIWWj1CCAzbWuU0GKwtL8PsWJCnbz1w_UC_0btiy2LsdTpB4D-J804sB4uJrqdf69t1cHdj7fkPp6r6YxqfS_N-b7ZS9X4IRGoMtqA8zTgfFTg-GE1yk=)
4. esp32-s3_datasheet_en.pdf (fileSearchStores/adv2026day12esp32sisters-ju6vzp26vplv)
5. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF600iie6ql2kBZoySj7FArKctENGAi0IFv0lHKWvoNzFFWw9AqMvvd7zrPyEFupcads0oB0ANhFALUIrJRjwYdTiSbO2CI0JTHCpT_ck1Q-5nw9zQgdUzcfu29GgvsZn2LQjV9eOLMDkBt991prrMwlssvZQpl95f9H1ke591PQFAFWObfXM231Q==)
6. [youtube.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEYFD3m_6tguihHGPTBHxHgRKyRTGe-BKwNMqwB624x66JTvXewpLBd5ubiNyv7i6iAffUjnbLwpWS5aRLEpQlEEsgWP9wk6oY-YU-ZJuBv8vsH18rlRcZOBJk4EPG8rJ2Z)
7. [viewedisplay.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGTfOxslPBwVnpCRqvkHo3GmkuX0N5d3ToF7hMY5f_zNmVujpxZf1Mtu64FV3hkJajEDnDGdelIdmLlbXNo5i-SZpQ0lQ3t_2ZR7VXDj6lIN19CLsWEGh7nOZDbiUmZS7A3X3VRgYdZ8aHr39Gl5XR9wVazYNGKNW5RmxmIF1E7t3TyQUeWyKqth_EeB8kOIf1V5u4cjvE1DAJL)
8. [sheen.bot](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFyXl3K8aBCSWdZ8WmDuZ8l_K8gdqbkGE3nZdhvBhU9ZGDvQFRWt1rdZIJ4qmP_BBSuRD7el422tvq-ok_gbTn1QkUjX5YB2tZGVAAW6_H_9JDwzF0o2s0KcWknM4_ca9ax-TZKMmJlag-B0hrU_GixfQZxZVPtVo-cEWkUou8u4dW5Z4lBvU2l2UsG2EPThfgyCmuAyCvjG5wZqj2NO7RO)
9. [thinkrobotics.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFJqaz7rsOWU4N8RmjHmLnymSxDbjUPqIKXQFN3wkSxzKLVQpqpEfV7qEAJzPm9ymEewXvOq1-XOcOR7wlp_U1d6g81MZeKu3y7lMNrLDiII6KY8kpfjGhuIpqt8U3zmZ-gYjsAqCoq63S8PokqZX_ue3FHHh5FMMYARDgjZcCV-NO3UPPtaYLAngT3JfjVaNXgyBs=)
10. [luisllamas.es](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGKbjgAvqvXiuJ8ztCUrX-zm28PHotlclC54E_uKRlGGkWN8MYZNZAvkz72X45b7yvlOlfBTK1D_dV2bSgVpyk1MuQwMEp5tl75UdI9hFSMeka8HcfkP0YndyeN4g==)
11. [microcontrollerslab.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGVadWy80KNeUNgVAtYDOAkeTAHJ-JISjSwxHH-yOIOkS3hOeSmwkuyi4Awm1KglzgW7BVWbtu8cSDa3KOwz8fPwji7dwiipWtxNYwtFIvEaRjUrgYlk2ALgyBSIDiKZayBe9UfHhvzitgnMyhC-xQelQ==)
12. [circuitpython.org](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE6r2ePkeBQAXMfkxQwtfOsXec-41j7ccKHe6GaSkRETg4dllmV6j0jjOzWQq_PFP5jmctXU2zhmuy6h6Z9sjhDQzz3u9GSWsXcXDtku4N8kWhS1ct1Ez1ndcwLpQAqH1IwVv20_druynAgI8Li6g==)
13. [youtube.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHd18uslqAMIZiVs43In3qtIRWwTxHdLK3M-GYyaYaEgcrUg9W1me9j6uIqPhU5Uw1sNbE2eDqEaiPzqGS44KJS-87wermWTjA1TBnF5_1KfFHOiKhoPQreu_QOLFvloT_C)
14. [elprocus.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEjrpiGHjhKlsx4MATlAKz2Z60oI1fsi27oYeCqt_fYu5_TlOFkhBewXYxOclqgba48CXWPGiALXq7uKBqtqmQrX5CaBJcwvFBc6TINWzJhGYJOZ9WAl3xUhhSCNV44RZV31pMju6NKW7G_ecgFHk6w7BoqeA==)
15. [projectech.in](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGs_Ugds-rN-Ju_l6M1qtaPqalK2ksho5Yy6Y2dlQ-g6Hq78wDkDQMEHrf9OZIlkfgBRlYovhClS5Tb3zSSUuibla8Hj_BjqTL7aNe2BrXm83uVVxD3BZd9JtphGACZoBJMFX4gnOrdndPOCM3bhXV-gmdkabU=)
16. [icbbuy.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF3EWCRmUHEAT-d0a45G8AhcfZJD-qaUr0N0ddOSWp4bc-mBRcaQoUEPLyJ6AQkpZ94kO0xO2jgk9UE28KqOlKqyrbgcnKxRpkWGcOFsH_qJizipaR2cheqsA_XVrUb2Q0dw1WNJxSqIbwYUZGOT5iJrS9WWuAqxEY=)
17. [newegg.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHo-cCaWDet2iuF-U-IoULe9vNATLDo-UwQEp-PMOFSpQr6vDW_5eudnsbIvjbesQaiSnLJmk0P5-gu1fQtb0yfLpY9HR_6atHY3AQ2rBwgKxBjMQtqAr5vc1aB4Pk=)
18. [ebay.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHjMOFs7rY4xBfd3DdOTeFXyEbslsiqlXqh0VIQOuF3CS6bobVBP2YWt_mpmTnYGJvlZwqnh--jFSQXZH7TxJKRI9Zvp_yUgjfde-DrdPKlcOYq9K5AGB1Ba8Xd)
19. [youtube.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHBj1c5iQqNysQ9aABBRj59LK6EILt2AqHxTJOYvmlNt86SEgpk8p1WnC8rKEwqn8bBq1cGucFxDSeAZokkNnwNYOdYF-O0g5mZsxAvgE9SrU4fNBbNcEGDykUDv57EE7LM)
20. [geeky-gadgets.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGAhbp44_AvVIoXym_M-RRLd8fjcQQInQdcX4QFRe_Y50oNTrnQC3yLQWQ7ceNu2H7GSjrVqBwpZN4LizzryCHa4uj6G1n2DvwME4xxKeusmCyms7qElxB9p4_vK1tqltM65Govke8OolsLkg2SMg==)
21. [antoniadis.com.cy](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFVgyYIcFbioz0v2i56owSE_-DOPhmC_J4vlS0FpnVpHHSlFceSGoBQF8Jkmn3G6s0smjbRZ2Y9RP_ZzZkybGi8fP91sn5mGUVKidVXOxDebMhaFlDZedMNO8_WhFLUs-luQTrteLsuSW6QFPJ3XmsA0sGb8bTn6pNmGeS4KFsbtfnPV6DLPDqClVD7FNG4l1ugla6GpKyQk8xrcUGt4fk02dR03rAXAYkD1DZlmBX_MF1SzMrPM0kdx5I5Hw==)
22. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHAnzmQLIX52hNziBzR4gm2iHLyIGkmY-hiLSlnNWbHtj_usyA5wpMd62oxiK-YzCgX267YDCs1IiHkKVS8hMx_-Q-LliZ6c8aes68e-SbofJ2STvYyd8UDmhlRQEaG_R-6ZjYhAeIrJBvv7LsDqG5-xhK49NEon2uLxQIMp6a7IkY6z_NxSE3oYCreuY4E)
23. [i-programmer.info](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGW9O3qx_7JEAxsgV_t8wavniIxagHlTpLT6zFLwpkl8hRHsrWC7edy1CRqbSmNegDFu7ozgsJcNUofyitXYFeBZnbLyNtCMI0EHE6Xh3oF4jucn6Ggu0Z9GP1sXnJ1hQ_X5q1vHCWRAMSYrZsGHsj4v76JG30yi0iDauC4knAbm48vIG2cXbF2guxstmp8Pk6FhkpDrhHD024Npg==)
24. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHRgIoKyuvMi2aULCibWcDSPz7lq2ftrZB71XKW1s1aNLN3S0vpEnfOy9r-YzePodi7w0KNdjxZlgXGeCNpaK0El_x53REsn9RKQ4GpGmtrPExgS0qLCHqjwQWDVNs2Uuo3D4VGPOIE8SH7SkHOgEzqtC9en9INhuoMD80TEdO0Yjms3yzxzoNWo2FSQYwgWIngEMDv_fI=)
25. [mikroelectron.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFr1GGZK7DhTkdwVI1ob47w9k2AzJ3diI_ymoDHrsYlV3m5Vs-r9Jt_yraRxsk543gRtvNahgdaGyh6jo-g6COxlvg8_PIw674tYTef1vWa85VSrpxcpD02zBiPwHbgius=)
26. [tecnoyfoto.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHVaV2R7qKVNz1a6XzpPTdelZJDSoEXWz0ZKapIcvigGoTzsGYtPCMAzBKBYmsVJvvys6UQvHfGUNd1955DzAEcJjcTTIruXS3ng5eCE5m5bHxtmScDs6CWyA==)
27. [teamzlab.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGr_iHILTqPOzAY3z-LSIiv74s8isVM7eV203Ai_qNgmwj1lbAzUqXrYw7IbVpl2T4q3Hx6VsAd7ighGhxMcXFGLqADzaccCKQ1ezgqmOG6rcHJkrZN-Nzuyvt_3ZP0X-plMuIJTSAjL5DObw==)
28. [hubble.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEVR--ButZ8ik6wTQV6S9nl7Be2AD8jPLlBCCERfmqoBqsd5rW41eMDQoEqzBrP-_WKGgUyEWZKgTlpsNKDfmry2xH9R5lc7cubydfiTqbh7q8-davlhLeVR71r8O2NAmlVNkpkArvSFA4vmZ4TtOa7nftInnC2nZcr50DyxeKmcffy8GBYFTM=)
29. [industrialmonitordirect.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE5u08KQbRRYUAkilS_Sv0kpHup4VFQtbYMmmMu_zemDdi53W5Ko6XpSZLvgtJsgg9CTVfLaa2Tkmyfhlya1YL86nZ-4E6qEgMIrz33_WBlv9uLXJcHmaHToTYAZSaRAu2l9IOU6Mb2O7e7o8RzjV1gKN8XE8O7XNtWmrJ284cqrF7Np3XOFEnpTf1NrmwJpFm5y1TdwROpMysPih4BqHScVuWZi8pqEA==)
30. [infishark.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE3Ipb7hQReesXv6SvwcBFTIDJ2uGvqVREsrr2gZBlHNOnkYHV8NCf0mVFPV_zaMroL8A7m_0zYOB1YLBY5PdpbWeH8TLzM6jCUQVLMgTL_D1ROZXf5RG_6Lihppe3ffGKa3iZCraRKam3B-omAxgx-fdLzXHp3qsWNFrHPXJ1q0In8UDQwQtEDsw==)
31. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHV3EQIEvxL4_1NxxtPN67rZq53QsZuCK4Q913ES2jFvkOpD7JbcfvTCJPSaoMxvSZOlOFZWQMp88uQuwPmNgUdUTP77RZeQA361A7vL338Bi1JWUf3fbVjxHJW-h2xvumIBHBqlOrTysbRqXvBXsArdUfP6BFxtHYIp9P7YPQjhGbP6PmbOrnC_pGFqSvBnQgQnpKn8mIyAoUZPoe17IzL3RURIcBVP_wFShhqoN3jT9JM6FfB)
32. [pcbpit.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF9hnJ1XUyztzG-F3_rwC0QsDDFkYK5AoerSxuoH7MAgGq-DILcGV9NF8JW-UVTnwF803u7hpRWAwf6eTSJ8Krglt8-mTAhm9Kh9CvA_DRzPbOKpaHXdgw9hyc=)
33. [pcbway.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFbDYfsMbQl6fPHj-w5NJJHbi4Cf4h5f0pWhKvRwnd5E8ok0dLRLBZu1eXTKFK6vU0MEtuxDbYDSAI-Fuw4U3T-xCOh05z_DL3BsCtXokh9kEvlh04JhPM3s0H_CPQ9VC2KXH81unoEdFQKMl7Mvctw4NHkH9dTy-kdNow2dyzCi7nZ8Sq2znrYTsr9KveAlx5fW9olpdPBhrGs5Nh3DkhlaJJoHZbg60eh5MCo5j6W7w==)
34. [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE8oYYam6SmPt9ukHBzSY6lB2B8kHF8qA9I_RNiZXhjla-PKXoc6PtEc14WIWyT7pZYXvhuVEnuaB0VWE8T2M_AGNTiXSTMLWG1biVKwOntxMwb76ZCmaXhHB0YfPo=)
