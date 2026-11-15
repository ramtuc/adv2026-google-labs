# ESP32-S3アーキテクチャおよびエコシステムの包括的技術解析：次世代AIoTエッジコンピューティングの要件とハードウェア選定ガイド

## エッジコンピューティングの進化とESP32ファミリの系譜

モノのインターネット（IoT）の技術的進化に伴い、エッジデバイスに求められる要件は、「単なるセンサーデータの収集とクラウドへの送信」という受動的な役割から、「端末側での高度なデータ処理、機械学習（AI推論）、および低遅延のヒューマンマシンインターフェース（HMI）の提供」という能動的な役割へと劇的なパラダイムシフトを遂げている。このArtificial Intelligence of Things（AIoT）と呼ばれる領域において、Espressif Systems社が開発したESP32-S3は、従来のESP32が持っていた汎用性をさらに特定の高度な処理領域へと鋭利に特化させたSystem on a Chip（SoC）として設計されている[cite: 1, 2, 3]。

初期のESP8266がシリアル通信を介したWi-Fi接続の民主化をもたらし、その後に登場した初代ESP32がデュアルコア処理とBluetooth/Wi-Fiの統合によってIoT開発のデファクトスタンダードとなった歴史を背景に持つ[cite: 4, 5, 6]。しかし、初代ESP32のアーキテクチャでは、デバイス上でのリアルタイムなAI処理の演算能力、高解像度ディスプレイやカメラモジュールを直接駆動するためのメモリおよびペリフェラルインターフェース、そして現代的なUSBネイティブサポートの面で、物理的なボトルネックが顕在化しつつあった[cite: 2]。

これらの課題に対する直接的なハードウェアレベルの回答がESP32-S3である。ESP32-S3は、エッジデバイス上でのニューラルネットワーク演算、高度なグラフィックス処理、そしてバッテリー駆動デバイスに必須となる厳密な電源管理を両立させるために、シリコンアーキテクチャの根本から再設計が行われている[cite: 1, 7]。同時に、Espressif社は用途に応じたチップの細分化を進めており、超低コストのセンサーノード向けにRISC-Vアーキテクチャを採用したESP32-C3や、最新のWi-Fi 6およびIEEE 802.15.4（Thread/Zigbee）を統合したスマートホーム規格「Matter」向けのESP32-C6といったバリアントを並行して市場に投入している[cite: 8, 9, 10, 11, 12]。これらのチップは単純な上位互換ではなく、要求されるハードウェアバウンダリ（インターフェース、無線プロトコル、処理能力）に応じた水平的な棲み分けがなされている[cite: 11, 13, 14]。



## コアプロセッサとメモリアーキテクチャの革新

ESP32-S3の最も顕著な進化は、プロセッサアーキテクチャの刷新と、それに伴うメモリ階層の最適化にある。これは単なるクロック周波数の向上ではなく、データ処理の性質そのものを変革する意図的な設計である。

### Xtensa LX7コアとベクトル命令（SIMD）の統合

初代ESP32は、Tensilica（現在のCadence）のXtensa LX6コアをデュアルコア構成で採用し、最大240MHzで動作するアーキテクチャを構築していた[cite: 8, 15, 16]。このプロセッサは汎用的な演算処理において十分な性能（最大600 DMIPS）を発揮したが[cite: 4, 5]、複雑な信号処理においてはホストCPUへの負荷が高いという構造的弱点があった。

これに対し、ESP32-S3は後継となるXtensa 32-bit LX7デュアルコアプロセッサを搭載している[cite: 7, 8, 16]。LX7は、5段の命令パイプラインを採用し、LX6と比較して同一のクロック周波数（最大240MHz）であっても命令フェッチやメモリアクセスの効率が大幅に向上している[cite: 2, 17]。このアーキテクチャ上の改良により、命令実行のレイテンシが低減され、クロックあたりの命令実行数（IPC）が改善されているため、FreeRTOSなどのリアルタイムOS環境下における高負荷なマルチタスク処理での応答性が飛躍的に向上している[cite: 2]。

さらに特筆すべき技術的飛躍は、128ビットのSIMD（Single Instruction, Multiple Data）ベクトル命令（Processor Instruction Extension: PIE）のネイティブサポートである[cite: 1, 7, 18, 19]。このベクトル演算ユニットは、デジタル信号処理（DSP）やニューラルネットワークの計算をハードウェアレベルで並列化・高速化するために設計されている[cite: 7]。開発者は、ESP-DSPやESP-NN（Neural Network）といった専用ライブラリを介してこれらのベクトル命令を直接叩くことで、画像認識、音声のウェイクワード検出（Wake-Word Detection）、エッジでの軽量なAIモデル（TensorFlow Lite for Microcontrollersなど）の推論処理を、従来の汎用MCUよりも圧倒的に低い消費電力と極めて短い処理時間で完了させることが可能となる[cite: 1, 7]。

| 仕様項目 | 初代 ESP32 | ESP32-S3 | 影響と設計上の利点 |
| :--- | :--- | :--- | :--- |
| **CPUコアアーキテクチャ** | Xtensa LX6 (デュアル) | Xtensa LX7 (デュアル) | メモリアクセス効率の向上、IPCの改善によるマルチタスク応答性の向上[cite: 2, 16] |
| **最大動作周波数** | 240 MHz | 240 MHz | 効率化されたパイプラインにより同一クロックでの絶対性能が向上[cite: 1, 16] |
| **AI/DSP拡張機能** | 搭載なし | 128-bit SIMD ベクトル命令 | 画像認識・音声処理（ESP-WHO/ESP-Skainet）の大幅な高速化と省電力化[cite: 1, 7, 19] |
| **コプロセッサ (ULP)** | FSM (有限状態機械) | RISC-V アーキテクチャ | ディープスリープ中の複雑なセンサーデータ評価が可能に[cite: 8, 20, 21] |

### SRAM容量のパラドックス：520KBから512KBへの変更の真相

仕様書を精査する際、多くのハードウェアエンジニアが最初に直面するパラドックスが「SRAM容量の減少」である。初代ESP32の内部SRAMが520KBと表記されているのに対し、ESP32-S3のSRAMは512KBと表記されている[cite: 7, 8, 16, 22, 23]。後継機でありながらリソースが減少しているように見えるこの現象は、Espressifによるメモリブロックの構造的な再配置と最適化を理解することで論理的に解決される[cite: 23]。

ESP32およびESP32-S3の内部SRAMは、単一の広大なフラットメモリ空間として存在するのではなく、SRAM0、SRAM1、SRAM2といった複数のブロックに厳格に分割されており、それぞれが命令用（IRAM）やデータ用（DRAM）、あるいはキャッシュ用としての特定の役割を持っている[cite: 23, 24]。初代ESP32では、これらのブロック間の境界により、ユーザープログラムが連続して確保できるメモリ空間に強い制約が存在した[cite: 23]。

ESP32-S3ではこの内部メモリルーティングが見直され、プログラム領域用およびデータ領域用のキャッシュ割り当て効率が劇的に改善されている[cite: 23]。具体的には、ESP32-S3のアーキテクチャにおいてSRAM0およびSRAM2の比率が意図的に減少され、代わりにSRAM1の連続ブロック領域が大幅に拡張されている[cite: 23]。この構造改革の結果、プログラム実行時に動的にメモリを確保（`heap_caps_malloc`関数等による確保）する際の実質的な連続利用可能領域（Largest Free Block）が増加している[cite: 23]。つまり、「512KB」という数値は名目上の総量が8KB減少した事実を示しているに過ぎず、実際のファームウェア開発（特に大量のデータをバッファリングする処理など）においては、メモリの断片化（フラグメンテーション）リスクが低下し、体感的なメモリ枯渇エラーが発生しにくくなるという実利をもたらしている[cite: 22, 23]。

### PSRAMと外部フラッシュの超高速化（Octal SPIインターフェース）

エッジAIモデルのメモリ展開や、大画面LCD（LVGLなどのGUIフレームワークを使用）のフルカラー・ダブルバッファリングといった用途においては、512KBの内部SRAMでは到底要件を満たすことができない[cite: 1, 25]。この問題を解決するため、ESP32-S3は外部PSRAM（Pseudo SRAM）およびフラッシュメモリへの物理インターフェースを根本的に強化している。

初代ESP32が主にQuad SPI（4ビット幅データバス）を使用して外部メモリと通信していたのに対し、ESP32-S3はOctal SPI（8ビット幅データバス）およびOPI（Octal Peripheral Interface）プロトコルをハードウェアレベルでサポートしている[cite: 1, 8, 18, 19]。これにより、パッケージに統合、あるいは外部接続される大容量のPSRAM（最大32MB、多くのモジュールでは8MBを搭載）とのデータ転送スループットが物理的に倍増している[cite: 1, 18, 26, 27]。この広大な帯域幅は、オーディオのリアルタイムバッファリングや、リッチなグラフィックス描画処理において、目視できるレベルの遅延やティアリング（画面の崩れ）を防止する極めて重要な要素となる[cite: 1, 25, 26]。

## 無線通信能力とプロトコルの刷新：トレンドに合わせた取捨選択

ESP32ファミリの最大の武器であるワイヤレス接続性においても、ESP32-S3は現代のIoT市場のユースケースに合わせた大胆な取捨選択を行っている。

### Wi-Fi仕様の誤解と物理層の真実

Wi-Fi通信機能に関して、ESP32-S3は2.4GHz帯のIEEE 802.11 b/g/n（Wi-Fi 4規格）をサポートし、最大40MHzのチャネル帯域幅で理論値最大150 Mbpsのデータレートを提供する[cite: 7, 8, 19]。
ここで、開発コミュニティに蔓延している重大な技術的誤解を明確に是正する必要がある。一部のレビューやブログ記事において、ESP32-S3が「5GHz帯のWi-Fi」や「Wi-Fi 6（802.11ax）」あるいは「デュアルバンド」に対応しているという情報が散見されるが、これはデータシートに反する誤りである[cite: 19]。ESP32-S3のWi-Fiベースバンドは初代ESP32やESP32-C3と全く同様に、2.4GHz帯域専用のWi-Fi 4モジュールである[cite: 7, 19]。

もしプロジェクトにおいて5GHz帯対応が必要な場合は、市場に投入予定のESP32-C5（デュアルバンドWi-Fi 6対応）などを検討する必要がある[cite: 9, 28]。また、Wi-Fi 6プロトコルによるTWT（Target Wake Time）機能などの高度な省電力制御が必要な場合は、ESP32-C6がその領域を担っている[cite: 9, 29]。
しかし、ESP32-S3のWi-Fiモジュールが進化していないわけではない。通信規格自体はWi-Fi 4のままであるものの、RFモジュールの内部設計とアンテナダイバーシティの最適化によって受信感度と送信出力が向上しており、工場や屋外などの高温・高ノイズ環境下での接続安定性が大幅に改善されている[cite: 7, 8]。さらに、Wi-Fi Multimedia（WMM）のサポートやTX/RX A-MPDU（Aggregated MAC Protocol Data Unit）のハードウェア処理により、メディアストリーミング時のパケット処理効率が高められている[cite: 8, 22]。

### Bluetoothのパラダイムシフト：Classicの廃止とBLE 5.0への完全移行

既存のESP32プロジェクトからESP32-S3へのコードベース移行において、システムアーキテクトが最も警戒すべき「落とし穴」がBluetooth仕様の構造的な変更である。

初代ESP32は、Bluetooth v4.2規格に準拠し、「Bluetooth Classic (BR/EDR)」と「Bluetooth Low Energy (BLE)」の両方をサポートするデュアルモードプロトコルスタックを備えていた[cite: 8, 14, 30, 31]。このアーキテクチャにより、SPP（Serial Port Profile）を用いたレガシーデバイスとの単純な仮想シリアル通信や、A2DP（Advanced Audio Distribution Profile）を用いたスマートフォンからのオーディオストリーミング受信デバイスの開発が極めて容易であった[cite: 14, 31]。

対照的に、**ESP32-S3はBluetooth Classicのハードウェアサポートを完全に切り捨て、Bluetooth 5 (LE) 専用のコントローラへと変貌を遂げている**[cite: 7, 8, 21, 31, 32]。
このドラスティックな設計判断は、最新のIoTデバイスにおける徹底した省電力化と、スマートホーム規格におけるBluetooth Mesh技術の普及を最優先した結果である。ESP32-S3のBluetooth 5 (LE) サブシステムは、レガシーを切り捨てる代わりに以下の高度な物理層機能を提供する。

1.  **2 Mbps PHY:** BLE 4.2の2倍のシンボルレートでの伝送を実現し、OTA（Over-The-Air）ファームウェアアップデートにかかる時間を半減させるほか、データスループットの向上に直接的に寄与する[cite: 7, 19, 31]。
2.  **Coded PHY (Long Rangeモード):** 通信データに誤り訂正符号を重畳することで、物理的なデータ転送レートを引き下げる代わりに、通信エラー耐性を極限まで高める技術である。これにより、従来のBLE（数メートルから数十メートル）の限界を超え、障害物のない環境では数倍の距離（環境によっては200メートル以上）の通信リンクを維持することが可能となる[cite: 7, 19, 31, 33]。
3.  **拡張アドバタイズメント (Extended Advertising):** 一度のブロードキャストパケットに含めることができるペイロードサイズを拡張し、デバイス間で接続（コネクション）を確立することなく、リッチなセンサーデータやステータス情報を周囲のゲートウェイに対して効率的に送信し続けることができる[cite: 7, 31]。

もし、PlayStationコントローラの接続や、車載インフォテインメントシステム向けのレガシーなBluetoothオーディオレシーバーなど、Bluetooth Classicプロトコル（SPP/A2DP）に完全に依存する既存のプロジェクトが存在する場合、ESP32-S3へのファームウェア移植は不可能である[cite: 14, 31, 32]。その場合は、無印の初代ESP32の採用を継続するか（あるいはClassic対応のESP32-S31を待つか）、システム全体の通信要件をBLEのGATT（Generic Attribute Profile）ベースの通信仕様へと完全に再設計する必要がある[cite: 14, 31]。

なお、ソフトウェアスタックの観点から見ると、ESP-IDF開発環境はESP32-S3に対して「Bluedroid」と「NimBLE」の両方のホストスタックを提供している[cite: 28, 30]。BluedroidはAndroid由来のプロトコルスタックであり、ClassicとBLEの両方を処理できるよう設計された重厚なアーキテクチャを持つため、メモリフットプリントが大きい[cite: 28]。一方、NimBLEはApache MyNewtプロジェクト由来のBLE専用に極度に最適化されたスタックであり、ヒープメモリとフラッシュ容量の消費を大幅に節約できる[cite: 28, 30]。ESP32-S3はそもそもBLE専用チップであるため、限られたSRAMリソースを有効活用する観点から、開発においてはNimBLEスタックの採用がアーキテクチャ上強く推奨される[cite: 28, 30]。

## ペリフェラル群とGPIOの拡張性：ハードウェア制約からの解放

センサーノードやスマートディスプレイのPCB（プリント基板）を設計するにあたり、I/Oピンの数と電気的柔軟性は、設計の自由度とBOM（部品表）コストを直結して左右する要素である。ESP32-S3は、ピンマルチプレクサ（IO MUX）の設計と物理的なピン数において、過去のESPファミリの制約を完全に打破している。

### 45本のプログラム可能なGPIOと「入力専用ピン」の撤廃

初代ESP32のデータシート上のGPIO総数は34本であったが、そのうち「GPIO 34, 35, 36, 39」の4本はADCブロックに直結された**入力専用ピン（Input-Only Pins）**として設計されていた[cite: 34, 35, 36, 37, 38]。これらのピンはチップ内部にプルアップおよびプルダウン抵抗を備えておらず、デジタル出力（トランジスタをHigh/Lowに駆動して電圧を出力すること）を行う機能が物理的に欠落していた[cite: 36, 37]。この仕様は、Arduino IDE等でコードが正常にコンパイルされるにもかかわらず、リレーの駆動やLEDの点灯が一切行えないという事象を引き起こし、多くのハードウェア設計者を罠に陥れる原因となっていた[cite: 36, 38, 39]。

ESP32-S3では、この混乱を招く仕様が完全に払拭された。プログラム可能なGPIOの総数が45本（QFN56パッケージの場合）へと大幅に増強されただけでなく、アーキテクチャの変更により**全てのGPIOピンが入力および出力の両方をサポートする完全な双方向ピン**として再設計されている[cite: 8, 19, 40]。さらに、ESPファミリ特有の強力なGPIOマトリックス機能により、I2C、SPI、UART、PWMなどのデジタルペリフェラル信号をソフトウェア制御によって任意のGPIOピンに自由にマッピングすることが可能である[cite: 17, 38, 41]。これにより、PCBのルーティング（配線の交差を避けるための引き回し）の自由度が飛躍的に向上し、ピン不足を補うための外部I/Oエキスパンダ（MCP23017など）やシフトレジスタへの依存度が劇的に低下している[cite: 14, 19, 40]。
ただし、内蔵フラッシュメモリやPSRAMとの通信に割り当てられている専用ピン（SPI0/1バスに接続されるGPIO）は、システムがクラッシュする原因となるため、ユーザーアプリケーションからの使用は依然として厳禁である[cite: 8, 17, 38, 41]。

| 機能インターフェース | 初代 ESP32 | ESP32-S3 | 設計上の利点と注意点 |
| :--- | :--- | :--- | :--- |
| **プログラム可能GPIO総数** | 34本 | **45本** | 外部拡張ICなしで大量のセンサーやモーターを直接制御可能[cite: 8, 19, 35] |
| **入力専用ピン (出力不可)** | GPIO 34, 35, 36, 39 | **なし (全て双方向)** | ピンアサインの制約から解放され、LEDやリレーを任意のピンで駆動可能[cite: 36, 40] |
| **ネイティブUSBインターフェース** | なし | **USB 1.1 OTG** | USBデバイスエミュレーション（HID/CDC）が可能、外部変換IC不要[cite: 2, 8, 14] |
| **ディスプレイ/カメラインターフェース** | SPIベースのみ | **RGB/8080/DVP ネイティブ** | 高解像度のLCD画面やカメラモジュールを低遅延で直接駆動可能[cite: 2, 8, 19] |
| **静電容量式タッチチャンネル** | 10チャンネル | **14チャンネル** | 物理ボタンを排除したスマートな筐体設計に寄与[cite: 4, 8, 35, 42] |

### 高度なインターフェースとネイティブUSBの統合

ESP32-S3は、単なる制御マイコンを超え、複雑なヒューマンマシンインターフェース（HMI）を外部の専用コントローラなしで単独駆動するためのリッチなペリフェラルをシリコン内部に統合している。

第一の強みは、**フルスピードUSB 1.1 OTG（On-The-Go）およびSerial/JTAGコントローラのネイティブ実装**である[cite: 2, 8, 19, 21]。従来のESP32では、PCと通信するためには基板上にCP2102やCH340といったUSB-UART変換ICを別途実装する必要があった[cite: 43, 44]。ESP32-S3では、D+およびD-の信号線をチップの特定ピン（通常はGPIO19/20）に直接接続するだけで、PCから仮想COMポートとして認識させ、ファームウェアの書き込みやJTAGによる高度なステップ実行デバッグが可能となる[cite: 21, 43]。さらに、USB OTG機能を活用することで、ESP32-S3自身がUSBマウス、キーボード（USB HID）、あるいはマスストレージクラスとして動作するデバイスを容易に開発できる[cite: 2, 13, 14, 19]。これにより、BOMコストの削減と基板面積の縮小が同時に達成される。

第二の強みは、マルチメディアインターフェースの強化である。パラレルRGBまたはI80/M68インターフェースを介したLCDのハードウェア駆動、および8-bit/16-bit DVPインターフェースを介したカメラモジュールの直接接続をネイティブサポートしている[cite: 2, 8, 19]。これにより、大容量のPSRAMとベクトル命令による画像処理能力を組み合わせることで、ESP32-S3単体で顔認識機能付きのスマートインターホンのようなエッジAIカメラデバイスを構築することが可能である[cite: 26, 45, 46]。

## 電源管理とディープスリープ性能：データシートと実世界の乖離

バッテリー駆動のIoTデバイス（スマート農業センサー、リモート環境モニター、スマートロックなど）において、消費電力の最適化は製品としての成立性を決定づける最重要課題である。Espressif社の公式データシートは、ESP32-S3のディープスリープ時の消費電流を「約7 µA」としているが[cite: 8, 19, 47, 48]、実世界のハードウェア開発において、この数値をそのままシステム全体の消費電流として想定することは極めて危険である。

### スリープモードの階層と超低電力アーキテクチャ

ESP32-S3の電源管理ユニット（PMU）は、要求される復帰レイテンシと保持すべきデータに応じて、段階的なスリープモードを緻密に制御するアーキテクチャを備えている[cite: 8, 17]。

1.  **モデムスリープ（Modem-sleep）:**
    CPUコアとデジタル回路は稼働したまま、電力を最も消費するWi-FiおよびBluetoothのベースバンドとRFモジュールのみを休止させるモードである。通信を行わない待機状態において消費電流を数十mA単位まで抑えることができるが、長期間のバッテリー駆動には依然として不十分である[cite: 8, 20, 48]。
2.  **ライトスリープ（Light-sleep）:**
    CPUコアをクロックゲーティング（クロック供給を停止）し、大半のペリフェラルの動作を停止させるが、内蔵RAMの内容とCPUの内部ステータスは完全に保持される[cite: 20, 48, 49]。消費電流は数百µAまで低下し、ウェイクアップ信号を受けた瞬間に（1ミリ秒未満で）停止した行から即座にプログラムの実行を再開できる。キーボードの入力待機や、頻繁なイベント駆動が求められるシナリオに最適である[cite: 20, 48, 49]。
3.  **ディープスリープ（Deep-sleep）:**
    バッテリー寿命を年単位に延ばすための本命モードである。メインCPUコア、メインSRAM、Wi-Fi/Bluetoothモジュールを含む大半のデジタル電源ドメインを完全に遮断する[cite: 20, 47, 49]。電力供給が維持されるのは、独立したRTC（Real-Time Clock）ドメイン内のコントローラ、RTC FAST/SLOWメモリ（各8KB）、およびULP（Ultra-Low Power）コプロセッサのみである[cite: 20, 49, 50]。
    ディープスリープからの復帰時はメインSRAMの内容が消失しているため、事実上のリセットとなり、`setup()`関数からシステムが再起動される[cite: 47, 48, 50, 51]。ただし、再起動を跨いで保持したい変数は、コード上で`RTC_DATA_ATTR`修飾子を付与してRTCメモリ領域に配置することで、ディープスリープ中も安全に保護され、次回起動時に前回の状態からロジックを継続できる[cite: 47, 51]。

ディープスリープ状態からのウェイクアップ（復帰）をトリガーするソースとしては、RTCタイマーによる指定時間での定期起動（Time-stampingプロジェクト等に利用）[cite: 49, 52]、特定のRTC GPIOピンの電圧レベル変化を検知する外部割り込み（ext0/ext1：ボタン押下やドアセンサーの検知）[cite: 49, 51, 52]、または静電容量式タッチセンサーの反応を利用できる[cite: 49, 51, 52]。さらに高度な手法として、メインCPUが完全に沈黙している間に、ULPコプロセッサだけを微小な電流（数十µA）で稼働させ、I2C経由で外部センサーの値を定期的にサンプリングし、測定値が特定の閾値を超えた場合のみメインCPUを叩き起こすという、極限まで最適化されたセンサーハブを構築することも可能である[cite: 20, 49, 50, 51, 52]。

### ハードウェア設計の罠：なぜ市販の開発ボードはディープスリープで数mAを消費するのか

公式データシートが謳う「7 µA」というディープスリープ電流は、ESP32-S3の**ベアチップ（SoC単体）**において、RTCタイマーとRTCメモリのみが最低限の電圧で維持されている状態の極めて理想的な環境での実測値である[cite: 47, 48, 50, 53, 54]。しかし、エンジニアがプロトタイピングの際に市販のESP32-S3開発ボード（XIAO ESP32-S3や各種DevKitなど）にUSBチェッカーやマルチメーターを接続してディープスリープのテストを行うと、130 µA〜3 mAという、データシートの数十倍から数百倍に及ぶ電流が観測されることが一般的である[cite: 47, 50, 51, 55, 56, 57]。

この「期待外れの消費電流」の原因は、ESP32-S3チップ自体の欠陥ではなく、開発ボードを構成する周辺回路（BOM: Bill of Materials）が抱える構造的なリーク電流に起因する[cite: 50, 51]。
その最大の犯人が、**LDO（低損失リニアレギュレータ）の静止電流（Quiescent Current: Iq）**である。低コストな開発ボードに広く採用されているAMS1117などの3.3Vレギュレータは、マイコン側の負荷がゼロ（ディープスリープ状態）であっても、レギュレータ自身が電圧を監視・維持するために数mAの電流を常時消費し続ける[cite: 50, 51]。チップが7 µAしか消費していなくても、レギュレータが5,000 µA（5 mA）を消費していれば、システムの総消費電流は5,007 µAとなってしまう[cite: 50]。
第二の要因が、**USB-UART変換ブリッジIC（CP2102やCH340など）**である。これらの通信チップは、PCのUSBポートから切り離されてバッテリー駆動に切り替わった状態であっても、VCCピンに電圧が印加されている限り電力を消費し続ける仕様を持つものが多い[cite: 44, 50, 51]。ある検証例では、ESP32開発ボードのUSBシリアル変換ICを物理的に取り外すだけで、ディープスリープ時の電流が8.15 mAから10 µA以下へと劇的に低下したことが報告されている[cite: 44]。
さらに、ボード上の電源インジケータLEDを通じた常時放電や、不適切にプルアップ・プルダウンされたGPIOピンを伝う微弱なリーク電流も、μAオーダーの戦いにおいては致命的な損失となる[cite: 50, 51, 54]。

したがって、コイン電池やリチウムイオン電池で数年にわたる長期無人運用を実現するハードウェアプロダクトを設計する場合、市販の開発ボードをそのまま組み込むことは許されない。ESP32-S3のWROOMモジュールを直接搭載したカスタムPCBを設計し、Texas Instruments社やTorex Semiconductor社などが提供する超低静止電流（Iqが数µA以下）のLDOやスイッチングレギュレータを厳選して採用することが不可欠である[cite: 44, 51, 58]。また、ESP32-S3が持つネイティブUSB機能をファームウェア書き込みとシリアルコンソールに流用することで、消費電力の元凶であるUSB-UARTチップをPCBから完全に排除（BOMレス化）することが、究極の電力設計における定石となる[cite: 13, 44, 51]。

## 既知のシリコンエラッタ（バグ）とエコシステムの成熟度

Espressif製品の強力なエコシステム（ESP-IDFおよびArduino-ESP32）は、ESP32-S3においても健在であり、開発者は膨大なオープンソース資産を活用して迅速なプロトタイピングが可能である[cite: 3, 26, 31, 59]。しかし、ハードウェアレベルの複雑化に伴い、いくつかのエッジケースにおいてシリコン特有の挙動（エラッタ）が報告されているため、設計者はこれらを事前に把握しておく必要がある[cite: 60, 61]。

代表的な問題の一つに、PSRAMを利用した大画面LCDの直接駆動時に発生する「DMA描画残像（Afterimage）バグ」が存在する[cite: 62]。ESP32-S3において、LVGLなどのGUIフレームワークを使用し、画面描画用の巨大なフレームバッファを動的にPSRAM上に確保（`ps_malloc`と`free`を反復）しながらDMA（Direct Memory Access）転送でLCDへデータを送り続けると、バスの調停タイミングのズレやキャッシュの一貫性（Cache Coherency）の問題により、画面の一部に前のフレームのピクセルデータが残像として描画されてしまう事象が技術ブログ等で報告されている[cite: 62]。高フレームレートのUIを構築する場合、フレームバッファは静的に確保し、メモリの再割り当てを極力避けるアーキテクチャ設計が求められる。

また、AI音声認識処理に関して、ESP-SRライブラリを使用したカスタムウェイクワード（WakeNetやMultiNet）の学習モデルをロードする場合、その処理負荷とメモリ消費量から、ESP32-S3単体（内部SRAMのみ）では動作が非常に不安定になるか、あるいはコンパイルが拒否されるケースがある[cite: 63]。EspressifのAudio Debuggerドキュメントやトラブルシューティングガイドによれば、高度なAFE（Audio Front-End）とカスタムウェイクワードを併用するソリューションは、**PSRAMを搭載したESP32-S3（およびP4等）のみが正式なサポート対象**とされており、PSRAMを持たない最小構成のモデルでは機能が制限される設計となっている点に留意が必要である[cite: 63]。

## 結論：次世代プロジェクトにおけるSoC選定の指針

ESP32-S3は、単なるWi-Fi通信モジュールから「AIoT時代のエッジマイクロコンピュータ」へと、ESP32ファミリの役割を一段階引き上げたマイルストーン的SoCである。進化したXtensa LX7コアと128ビットベクトル命令の統合によるAI推論処理の圧倒的な高速化、SRAMブロックの構造的見直しとOctal SPI PSRAMサポートによる広大なメモリ帯域の獲得、そして「入力専用ピン」の撤廃により45本に増強された完全双方向GPIOとネイティブUSBの実装は、これまでのIoT開発においてハードウェアエンジニアを苦しめていた数々の物理的制約から完全に解放するものである[cite: 1, 2, 7, 23, 40]。

しかし、その強力なスペックをシステムレベルで最大限に引き出すためには、技術的トレードオフを正確に理解する深い洞察力が求められる。Bluetooth Classicプロトコルの切り捨てによるレガシーデバイスとの後方互換性の喪失[cite: 31, 32]や、データシート上のディープスリープ値（7 µA）を量産製品レベルで達成するために立ちはだかる電源回路設計のシビアな難易度[cite: 50, 51]など、システムアーキテクトに求められる設計リテラシーは、IoT黎明期と比較して確実により高度なものとなっている。

今後のプロダクトロードマップにおいて、Thread/Zigbee対応やWi-Fi 6のTWT機能を用いた通信レイヤーでの究極の最適化を最優先する場合はESP32-C6が論理的な選択肢となるが[cite: 11, 14, 29]、デバイス側でリッチな高解像度ユーザーインターフェースを提供し、クラウドに依存せずにエッジ側でのデータ処理能力（AI画像認識、音声信号処理）を最大化することがプロジェクトの目的であるならば、ESP32-S3は現在市場で入手可能な最も強力で、かつコストパフォーマンスに優れた支配的なソリューションとして、今後数年にわたり君臨し続けるだろう。

**Sources:**
1. [leadsintec.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGjHJ4qr3ngtdOuaUy0oyotkGHSd_jHBWm4n1_u0UF3CYTtg7aaNeMpjmTXHIPkpDu7qciwIwWMS7GJya7RsQ4XolQz3SkrnCWWO3nDtLixTET-tOrxlVyKvWoYSKk4HV2W29Cfi6HpIhz_Tn7Ho4xZzHfg0RZEcbFW2x-bfk0oMqe19co7C0FHOm1gDbqgo9hGarPN79Bh2_g=)
2. [pcbway.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF7UpW3xlGL-etoqlGxsj52oTO7vwqoBNvSS22xL278hAsI8XCUP2eFEKnYddCD8Q3N74znNcfVvZT7MlB6sgdeHWYmWvlP0geV60FhLAZq3aiyCVtNVxKoqiB7iztfZaSwO6jgstVNtqrzTrINszBPWSv__pVFZ8HfAsYVguFcGiDolMWRljrWaCqG1F9TFYbdn678myt99Wn5Ej61xdmtJRe2K_vg04JqUeuCchUcF3WaLAnfwaITzcHL3KEFxPg=)
3. [sengoku.co.jp](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF9Zz4BIRzpxKI5XAL72PzWgSTCVNOOWUQRtAWD_pJi5bc1PeeqqUfSDwaIfQPtcu9eidfJ2tgL3vnBL04nWGA0AehEXnrQLgb4CGCQojTdctMC5ItzAr3Vnm9RRBOcPiTvzeH0LNT6jjsh3T6DPKvQ5TVoajOr)
4. [wikipedia.org](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH8cetLq-en69d6nH_C7aNGjzMOv4NcGBLqWR1Cj8yo7glowqzqMWS9wScmr-FQr5BKYQk3oIE84fh7ODrnAlwp6690HENXDLo0plqnMirR4ubXlIfbbiil7A==)
5. [fabscene.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFxf1WmWRovegzwmuqhEKBDkWdj2VgziCznXD_uoxiUkk2U4Lt5Kw3Bg3c1BewOepWlVYYNuImf6Q1hjpn0ytPJXdpqM8P3jsTpx0us3pcTrkIqRYpDV3dxWzwbi6L6BqbdAUhXUdA-ErWjp_TixF4M0eQ5ezOS4tR7z3FQ6okJA9Ei2w==)
6. [lang-ship.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGxjMnvgzBsVXYgc4DW0zY65yad35IniloBF9ITOG7NW1VqziOAB23ZpHQRUC1FUXl4bb6y9_af_Rwu7a-50d_lqTJ-PUDNqOHZ6SS2OmuFPgid2gQK3Jg6xVNDBGI22xuD7Ye8)
7. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEiL27PKwqkoy-6Hl6gbTH0wBEFx1FEyhWLE1ZYi1VbIshTx56qLm0Te_-eX7fGZrTzcTH2flPhUi5TiwwzNodWqOdk-C2iAI4SdYdZUYLt48h8N1Rs2ZxGtLW3WC6zUQp6cjVkayZvXoY3GQE=)
8. esp32-c6_datasheet_en.pdf (fileSearchStores/adv2026day12esp32sisters-ju6vzp26vplv)
9. [nextpcb.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGaWD5x_UPJPsVjBldPtSiGvCnihYo1KedZY_0WWxp7r6qi8oW79CivE0IfxDSb0Po6I5mS7DArWqN-5TP8MkDSMLMOpmxIem2fjjVBD5mLyDMgUV1-EOx02jyNIZOzQrOyUJTNPRL2zbt8ZzXMu4mpkYGsL5WH1g==)
10. [flywing-tech.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEMMXUBJ3GixsozmChmJaUhzKzqoTsb-Co5zs1tH_7ZH1bDsGM5Qw7SB6JIL76rJz2pd14Jh3XXA9t81WgYG4vyHMsNkuX5fRnbrlz2G7q1BjFidmjSVD1xKf8GbkPiIAgcmLkwaoM5ipaJhyUXJIv1bfZ173R889a0ck8Rdv-rlQp1CfS3vxubYz8xX-gciRIiczixoP30)
11. [esp32cube.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHRf0TBNjfM-sFVQbzQlCCJTIhJmc-QYfjyZ8dR60NBm3uhdp6vYpNwNthfuskwCJmC5GeZzzbJdTqiBhr96qGlQzhJ6zc1kA7p7axvO18tLnsy5qSol59Imi7f-QKBerWMm7aws-en8E5nbYxzMYVg457R)
12. [sensbench.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGS8qxGA_x6FYymKJnofv5nARtaaXrNOBdL6w6PXJN7Cw-pSqw2rZYsRKi7JwAsN-mSo2NqiywA0XhCmfO4AXnFCrCcvjSZe_iq3C2KNOxcOdeadNGrA5N_uoS71hHxOaVnytE=)
13. [elecbee.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG4w7xZujTOi0GSSF-B8QEAhtQrxBrI8rQfMtzVVb9M__d6VEr9YMj50Ht4PCqSkh-rEpUJYBB3Y5XxyBSqEWh_IxF8hExPAxrN3Sj0pV3sb1zlrQb9CFtYvnrEVdia56PqOsF0tgZANxHbpsWEhgm96IhKfftKOL0jRqqmXCARCe3EiPTOV0x7s38L)
14. [electwork.net](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEEcmdrBdgCBYjvsEOImhklmQdgxi44oGTWDhgmhFs8OM6Te_dGNZtXjwHiFR6eLhS-hW0x0YCtKZ1_e9bk-hEm-G1QqtBiDRkByLMJDFnEdOUdjdfM7IvUjE6wkSQ3_SK9OA7NlRqdoZm9)
15. [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHVs6nv5uXjSi0p6tG3M_cD0fuukmCDwGyRKGO2jSzDGGYPyMHaMhwegS5rv_ytmJlpWeR846wC9OwGB4MNnl4wv8Gv27bXqELXGDD4k0PLs9GZeCwfl9VpXszSUX5cYO7YW61rRGYj_AaBad3O5TotVoMKazNOqkuEvwvYZEK5)
16. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHmnZnYXWiQysSMSyiJq5SmSup0nWaGYU4fk7vESPj9gbv9veNxx-PXakSSIUVeFGGmoShd0y7tPJ9nSaj-wWIRvNRtUnszqQbBPloJAo-tRv1saBcPAnpdu_Iy5W2Scj6uFeHJnCUt4NWKccnD0HUB2GLndmInfT-Z-QCpWny7OrF8rp3zHh8jR408IOC1eOZzy1zFVD1cuQEdplk=)
17. [qiita.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHp8yyEnBUtM7Y5fukSJJfYtTG-8hIZpiBX5Jkg6xejf6j49QZ1l49NBqkmuAnBiymxAG6mWAkoNk6cGL4ipD8DGwW0Q5IUr8Cxv2vYcOqC_3Gy58WjJn3wsaaBWue8VRbfdjQqUg_H-MHGcEAsuTsuUyo=)
18. [scribd.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFjRGfL_FY2v5zrp6mw3q4fj5j9X_3hmE1lFT4lxH3p8Jrb5PN8nT6Dyo5raXcrzfOl-0wS7WIS0zowg4EyxNJR2QnQI1ciEnDoJUhr2U1SGca-GBV1ycJKJJ2Q53jI4nWg5TOcQ0FTJ_7zxqF9pg3i5anfTf8=)
19. [jlcpcb.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGspqAtPRixfnmN_XYF_HzU7WXp1_MPmptgSolXoEIQ9WrFMNnogbxCJBke70V1zKWBK45jjZofViG8J1j72lH9R8uZAipgZTqNzShEaMjVoLGFLMoCIDYT5kShyDRjiQ==)
20. [deepbluembedded.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFAx6HGUIoJemkcfAxv0VVJI3xE8XpD2QX4x2yfSoqNbNBVOuuaArpbTxNJMkoxoK7xzyPGG2UyphuUnkbuHiwdVlMQrXU_pPvZ4dnzkCAv-Nw6C-hSH8c1K_fPVNq7YSCezJwCxJW4-B13M7e4GRNQ6OGh3mtn)
21. [prtimes.jp](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGYEp9xkMP6jVHWaqUXpPfOGmKvt1mB106RXiU1Rq3adjZ3ZXMNfHOnQKEvLplrX1ztYyLA_UQlNDLxGxviBBlxKBAdtM0fVhRC0yMVywHpA4vlInnzEzLuIDBcQOSSkeAqOgKbXX0-AszKTZfIon3u)
22. [ariat-tech.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGjSklzVfbR0De1dKBeiKlnyZut8_jsCBFoJpxERPE_SdA6DOKjKsmMcnjOJvaFcdbYKJQcHkE8s8owFAnEazeVt75gWIhOJa6gI9hK0igS5WCX3Bz-D3baFtVyYSeexPSOb83tfbQQEloamz3xL-mfV4PY0020N6wq7n8_q123Jfb6aDtWeP8AxTsr4YqWB-rVZEXiwYqTYcaoDSw7HEytkyh1x8KFz0Isa_O0Nw==)
23. [switch-science.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEh2CTHp7qnQntTgDuQwi1TFcn0K_2WnVA94uZn8QkTIJkC6n3c6dO-ooymGojn1A1AgXK80vV2ljl_NfPqfrsbVTU1C8qHDxE1L_duJmA0v9qwCvDFUYAsXQu-hg8TyuS_bB6yMSzZUeu3MiPUbw41b6qT2gxNiAsHZDR48ySo_dvtXg==)
24. [kobesoft.co.jp](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFr5Yi6hWegfCz0cjaJJN2SFQ_bJhNdOsdhUQYLrJmDvYgJvYPy5mlUmUJflR36NKFg3J9_TG2Rk2bcLX3cJO4JZjEWl3O4sjGjwG3-0g46WiV34whS-lGcbk_O4Q9TxmCykBv6L6Y=)
25. [norvi.io](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFx3uyXe8Lk8rzMh4bs318UAKRtdW5Ed7OktxG81HHBJRM7-2LHItcNBQpjUyHE4taWoEcX3Gs2P-QDAXbCzbGhxno8BSEImiy_dzmlIaSplpO406te4p6XPHnGByG2izZmzSFNwUr_WSy9ZFvo0W0X6zmqWjKIYIZkLkA1AIA=)
26. [littlebirdelectronics.com.au](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHVPjzPPkZdS16EPOl8x4q9y6t1qIVE-3UP0DUukcdqp2vP8CybXyNEfQM-V2h_ZH-KckiRnxWRSTeJI93aXOMLkOpavM717SLtfU0JjlNM7wPKNitzPO09Z_szGNfK8yyLPBEHhD7wx_ho5OZg7vOZCHOF-u6aLyTp4VvWSR0Y8lvih6tcElWmi7AN3pd7i7Gne3KsbW-gVPtNgrGXK645FNFe34uZ-h7yuBHoJDesdslD)
27. [grobotronics.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEldb6RjAURgrQi48Afpl2wSGXLrj9NgAJBkO8vTN_m_mQFlipBoCrLEQvAclcZ6cWKOhY8UFlVWiIvKZFDF7zhSRdvmqg8BToRzGOGPwRZvFmKG0HWTd2YTvnam4XsphFyUASmICsUvU8jSunL0a5C2rq1zddZGo-PDn_uZHRsa00FPjD8pwdIhvSf_ibh_vrLJh3a)
28. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF04V-BnRPt3GP6OUee4j_Khnk0wYia2JFbEZBznHE--4jtKxM3KS_5aWTv-WGxV3bEY9QljiH8RVvMkTy3hrQSubCQXdEkI6euf-NcTVFpWVtto3UUq8cvgLuKr6QoQO_NBlcZSxbliX2eN07haCb7_0yMF5B5i-oOuYewePd6Y-tFEdjHIePcvlpoxpjMrtu4x4vLnDujIcwRayiNGlWW608bEsqK5RYEBa0z380uobi_kFZ0)
29. [industrialmonitordirect.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH9nDyzqVtke9ZANU-4B8Ii5Gx6-lH3bSYWja_qvTHze5Bw0KkUmMtD75PillgMgInTTAB1CZ7sVqAqSqDr9H55_-mt6JTQ5FquPf9hNcQT3r5wMOS4ksAi4JRSvDYmfW_i0Zahpv_Xpy7d1YwtKE4GIF4awclDgDa0XWtZxwCSIvyOURYQERpQsR7hJg4Q3_BVYI31lVyavGEG-fEslzqxz-g3-dEo-7MI)
30. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGhhf_ByTv_O5EpPtIuJYzuAZFdBcibIlHa3CchaxOm6jrno1uYQ_D87qGDqorYm17Q8eHVlNw2Gp9ASKtsVw4iZRjmPM5P-0vDS1xJo4-1kUyVTTrckRPCiBzg3wlSnehsTiVkZ5EbpnP-Up9F0gpGiWTMow2r7If9z5PpCZwPaVeCTThzxrlZBg==)
31. [y-ic.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFtfqWeX8PdGOE8061BaP-_SuSgi89CFWSm0GGaDU7TXvfp-ACb2AxZxf02X7rK7n-pFcKPG_p4t8Ls1PvyRI3WLP1c2zdq9enXOjFzndoZ7u3iTTjPWPQv4f1NqoGkH9FlSoOIWaap63b7eKwI6KGz28GAOtv73gf4WsSHNrSyn-WfylHWoTIjlA==)
32. [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGrFPu5ABk01Pa33INbjCi477jemd7pTRbpjMJLfQy4FOo1CNANGPvGNXGbWRSaafW0nmXuTGtfcQR3FvqPMSXVMjkCVHaSRxlIW5xBSiKSwMOlY-MD6ostWjtcAQCO3_uXSN6TO9lXVr6pBKQ=)
33. [home-assistant.io](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFLtiozKrIAki8rYYpdmOuF2D8Gr0Z8nBJbAvzvG9cZIJxKZm2t4TyZWJrohgssCEQer0RUb5cuHt9C2o8mfqHTVf4du5PyAiZibVVpKe-Jsf_FRb0gEw0TdsLewfockW3XPaaE_2qqvHSj1dyxPwqjZDWJc0JJ7LN9y_DU2w7_BqpRsS2-Mq5nGHOv0twOWSYruBI=)
34. [electronicsforu.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFuAWt7gUBbEqvGp0nfoQAqCSng1cWEHPUsSR4wyi-FyuFAlIdVDh_aqYheTDFJSq-qCAV_MSBKLbx9vN4-ovAaxzZ7OsEEHZVZGAUY4JVqymsxjqllKrEgqj6Wdox7-MGhJA61whoFGiZQQ9xC)
35. [esp32pins.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEwRkhOvd8tM4IJimcGUH8NI31NrCCHPmP2T3YlCfNZ9V5TbtacvDg3oIcj5BGOS9VNaYVRn87dj7Rd2gTQV597Gd0YY0Fy7LhDCSCtIBiB7G6ZjfkQUOe81i73Lg==)
36. [learniot.in](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQESOQyYXlNCHDTIvaOs4Ubfmzsuqh1dYDlzCNQ5ND9ga3TGvtygVLkthslnqu7lGNIzzTG_WFJKii9bmmOELzMnWwAZdXBpL2J826S8U5SUCSw_T8rtndH-13a5bYn13SDA)
37. [luisllamas.es](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGcOEZSEVHRUkPgMhAZ7Au3PEQNi-Vwsk0Jh8GMsGiZOrqIVasE_5wX-7jMzpXqk01llUm2wdVb0aNNnlndBdplLnhaOw1IAwGLqGSY3lOL2-PBfdtByKH730y_uxhS-sOIQ1aVhKYdP3lUNXoYD_pbNw==)
38. [prototypeguru.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGs4FuZYIO0RCsHv-oYVxi3vVi8KVctwzqotTOUZB81ya0lWyanfjHem5Ep-yQVDq6dnXbXMQuylpbgSIg2rcVrjz6yLXSbPBkprA1Rd5Jlw1z9CcsO52e5_SvC5Nw=)
39. [sunfounder.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHCTfg0hfAV19u_qVHGIjg0iLT4cnME58sXA6q8kKzJ02YASNcV3T06NEOqSMRryMEvro3Spljkcdg-fk3Bz8oyrClY6ExBHVfB6lzKoeGfBhcEDMlt07eyQDNX5WOdK4fjT4nT3dWWW3g3tAjh8DMgJYdlTSifHb8IihcO7AUOnNfTHKfn_NLkHumUubIIbbx0ES6DM7VzmIlPwKr-GIO20HmMdY8oh0WTXSMCNvL1i1uwh9HjB9ya)
40. [makersdeck.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG0vkKCXbOu28gbvFcmPZbv7Nd3r3VNOif24AnhFSbNLubpHpiueTzwgeI1iMCJ0-Bs4VerZ0nSoLgIRYnGSdfPkUokgFq_gu00kCeACOnpJ_zDqO2-1WTSJ-jwRfYFB94-heRqPaEko9HrGs7Z3Tgo)
41. [randomnerdtutorials.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGHrGAOvMSBL2yxp1yRTz_7eI_zlMp6IcVjNVUfvIXisOGa4Yso6BP1R3Sl31DoP2zhCJ5W3olUHMKsw6g7Rnw818kTBIX64_TaL2B0XZ7HSJGO2DDm_AcxTZ1A5jKSF6oV9rMOPX4pNshNGTv3yV7RNFvf)
42. [luisllamas.es](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGM0ktMxZQmCzy5VLT5Mz5E1PI6GMo-HgR8N21InXMsvhzYstQZcNmCVoCVD0RXPwoJMKkAktGHNdtEijEQHXMzS7aJYp2YtWilcA1wunPu5A1rcyQuu6R9FApAY0b5qbnzGPCmeC7eIvXWfb-dW1QsqV-KnA==)
43. [note.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFeSJzJ4X7jZ5TMRVYNxeRrAlUcvsp6nqc2kHajNerdGc7eeSBAibWwPOr6484ZTTTpuRQtz0ASKrMhzGbYQreHwhpyZUGOrEal0bOFlazSbvnRFkF5-UWRCvUq21Lx)
44. [kohacraft.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHWnxJtRipmhHgw2bmIyh2YK8z_6n1e5HCnR6IwemBPZ9RmAew5A6-KlBYKsVpZPSiHEqw_ShFsW3RWdoJXMOmPa4DcfSnMKPb1Qr62itcMbZIZhUpJa7mAuXJMjxD572DThhC5jlk=)
45. [ebay.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG-b0peC4kccc1TThK1OGxm7LNwyy0gtDZf1kR06RAGwo4P2LbuS0jKdXK6qu0Z1Njns7chsc065DwRo5sVIOGYhUrLpVS88a-P6QeHOir5SX2MyUshX5Y3IVdl)
46. [dfrobot.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH7XPlP7zyhnHmq-4cCp0x9ZoI6BeMwRgTFxJlvREyMC-40sjX45p61Ma8GGRVwZ-TWE8lg53miz8yS5T5hs_aU4f0gJPo6MtlI56vlq-In2CnR9VhWsn26mj1OC-Msyg==)
47. [circuitdigest.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGOzataJmaIX327_IuB1lwdbTdqXd4br8BqfVe6BLu03N3NQaFkF3Y1JcmKMUwA98YJjwcZ_Hr2F-hjil0YKkCJJzoe68WE1TrG2pVm-_0lkAaPBpvgQ1MtBgM39oExDJS_XO-fElI6cQV-vx8EirtNU63BdqNrVsZCRiQvntJGLT-7dB3rmUyA0mtZzTntdqmllDAX1LlFHV7vOsFYsvVH)
48. [engineer-go.net](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEKMtlVwBb-le7CyZo8U0vhxpZNauAztqEsg3v-zwm461mrPJPPnxBaGKiV29G54TItevScnddsPaPIdq2FOaVbGPeYFnzQzNcIq5SvkxEJ4KlT8MQNiJFAK6UrjiqGrlVk4yQyOm91ulSbxQOZE0Bmvpw=)
49. [seeedstudio.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEFUSqnrxA-lJyRh5CYOCT8zbH_-Wp2uNhYEpv57k1nFczrLb7P_8dpIqblfDOAsh3Lw0Lknkxw8-dW8U_qobJyMN_aUv4bx4U6bRJpalflIMhYdHYT_roTfmcID2UuWYvMtnTWcDUGaXMpGmJBQYI=)
50. [projectech.in](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHPR65wqM7h9pqDg21dwpnMMy1pHiUM48Bcus1u7k8Qarh74Ntt5pLuwFg35aSNvikXTJ9Xck3108kqt8IXvAvN-uyD1SZ5nbaWnlDIf67pFIK3vSVSWQ2yPb_09x4BWeBbRHj91DnaAie0h80wRq2M02tldxk=)
51. [balinedge.com.tw](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEQ5PapSkFp713uNTWq9X9n7ByanPKv0-1T2n__xeBD_xBfKJaBkJ6wKFctTgeYJZmx6DMfIzCuQ-5kVzAKFcMU1LxjzVDTWxD6fjKZeD7-KG5am3ekR8p7Y9ADFOOI7g6LRdO3kcMexnr38ExMri1r2NTG)
52. [randomnerdtutorials.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG-OyH9Q_Ggwd4Q_uN_M95asaiF28IdvjiqYSSzdwCy80idKvLvnPuNxPh8-jACkMNGLK6WAENXr-w3b3REYj3oxkQ979VbYh-Akw4tu12__JkGQHhZWdp4Fhi3qoAhAGTeeHYtcbUg4K2kO85Y7WDy0-jcQ2Bf7cQyg7rRiBuT7rTXWg==)
53. [reddit.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGHUwuwbLOSAcCPU2sMLVxLogOmeVwQ6BO4eyn937n9OIuelXo9OYlnj1SZ1SNQfKHTuVH1iGlTO06NOBbLpYR8vyQoORETABsVi1BZhaqzp1A5JCM6Htd_JiYZ-by7kdSKCCLrysZYGYdD55zW6CStPRKxolOnUn127DspT3M0tBNYFpp_XPlyq3_N)
54. [jlcpcb.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFyz0QWhM5IR3leGUY7na0zafqwFdRJQCRYg4SBISFsHK7HJ2nRyT2dmUgahvITw1SyRW7eqQZD3hTyn5-thDvfFZZ-rjdoPz7Hif7IgkTBfPz9VoHZ82ER2DESBhgf6TCj1wafLh9Ins7jBH5L1y0=)
55. [arduino.cc](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEiMRyKszkNHTjDUpF8D9GkvFW70QmZ_n6ENv2bGEsu9urr_Ll36LQA7QP22HHyvEm4depwhZ_bEMeeU0K60R0J6bQ1OnMHIZbAIO_Mh4IP0XWVtckt6NTVTO9cGS08XavS8l44-Z2O3t5ASShwJ2NoUjBB)
56. [lucidar.me](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEwQzW3AKgpolmLyGm2Pebc1Dq25_Rldp5mfAJOaIOjQnXdapFsOptUcrzgQr0THc8i91aY1ZGhS4MfB0jq8qLhiWwgvST3uGpvvSo6-00Kq6rPHpa1fYYDPd1_lbLDls1H0oQNdMYhMlMDWDFY8bjJlJqzwb8MT6Zpuw==)
57. [qoitech.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHD23PjHE52dgtfDnc-OuCbmHWZqwuOZMlu4V6LpM2pTXDJzLOoBLMrA_kII3YyIDbopkA6pk-dO_RE9D5P0csn5Z9RtfD6V3gQ6n3C5DPRQyycHRtd9_261YFrAdK2q_LpeBan8Z9Y1alR7GMZhApQjJu7GVPwEbudVA==)
58. [reddit.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFO38Nw6J0Y0eTHL0xFymjnV3LSXTnZJFb7AaA-3Z4wNoBVWyjQYu14WgLouv6Fn1iiebCLwOKE6Goj0okI7jgFXwJDGm2PCSmKrC4NBNJEAsu_OWXK5bxkZYRqO-soGp_9JT0yRNb_zewKWbJTXQOp5bY9fn8JK-_17D8imUsKaVR1P3yZXp1M3VmKBQ2TZCCJ-dYLhVgjGK951ZK2pA==)
59. [m5stack.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEAqpbxK5L6OUOBq4yP1KR6euvOJAJgEfZxmZuM4aPJG8nTlXp6UWlC5UwvJPdRpNtjiokXVGc4OiptNl3UDiqfm6ACePTvSTbc6OgaUQMLedzkZCFx7B5WfLUHiQZVz-byWjj4ul9R-_lZ5CWpmLaNdIRXAI_NBzz0iXUZxw==)
60. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGvbPP4uMOEdEB-mZDPsnffnXXbw3z25XBHwu0K8onsCMNhe8guuYzfFiNf53SH-fdMRCAmI0oHt2iXsNPHx7BshUR-bHKZjxeoO9R-0kVBrb7KPbE3drE6RX8FB79krcNZDVbvi7uXIoD1oJZUAQZEdmQ13N6SYGw-NgxyncmocUjew-U=)
61. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHY1oxGggYrVqETGLkSt0ivy_M3i5vFiqrltsMm7awbRVhHAE3amII19ntasQdK1nYhPo-ts7WQYRsYMlewcCEJ0ESle0DpphgQLOXDRf1pP1bGeGaIy9mQSrUs21Ufxzz_btcrwACxOsY1K7d0VI9etlNW2se9-bHcbngtsdyopKHL_scB-u8GYw==)
62. [zenn.dev](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHNSVkj1LQytL_K_KAqvtVUPIoQ6dH-oZ7sUsjJr6zr97G4-IbvTX3bQRTFjv_GQg4jbi_aDmgYBv2FQ5RDAXkX7kAw9A1adyKi-HO_X-EXqiQt_j2lO_4CDjHAfQ1V_w959qees7cWEVOh6fz-OJh40QiyJRa6JA==)
63. [xiaozhi.dev](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHDe6deZBxiF0hGKeQN0jMAvy7f7v1kdGF4lSsEXwLeMtsM3I5mNRzeiwA6PErKM02-yJQbywHkkJUTUUuGcHZjfqTV8hbpxsT_cidiJpwCI3ZaVge98JITDWf1UKiwPnnIYQt3EtFPCg==)
