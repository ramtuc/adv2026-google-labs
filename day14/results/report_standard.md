# ESP32-S3 マイクロコントローラの徹底解剖：アーキテクチャ、技術仕様、および市場における誤認の是正

## イントロダクション

モノのインターネット（IoT）およびAIoT（Artificial Intelligence of Things）の急速な普及に伴い、エッジデバイスに求められる処理能力、通信性能、および省電力性の水準はかつてないほど高まっている。Espressif Systems社が開発したESP32シリーズは、その優れたコストパフォーマンスと強力な開発エコシステムにより、業界のデファクトスタンダードとしての地位を確立してきた。2016年に初期モデルであるESP32（Classic ESP32）がリリースされて以降、同社は特定の用途や要求仕様に最適化された多数の派生モデルを市場に投入しており、ESP32-S2、ESP32-C3、ESP32-S3、さらにはWi-Fi 6やThread/ZigbeeをサポートするESP32-C6、ESP32-H2などがラインナップに加わっている[cite: 1, 2, 3]。

これら多様なバリエーションの中でも、ESP32-S3は、デュアルコアプロセッサ、ベクトル命令セットによるAI処理のハードウェアアクセラレーション、ネイティブUSB OTG、および広範なI/O拡張性を備えたフラッグシップモデルとして位置づけられている[cite: 1, 4, 5, 6]。音声認識（ウェイクワード検出）、画像キャプチャ、およびLVGL（Light and Versatile Graphics Library）などを用いたHMI（ヒューマンマシンインターフェース）の制御といった、エッジ側での高度な演算が要求されるプロジェクトにおいて、ESP32-S3は第一選択となる[cite: 4, 7, 8, 9]。

しかしながら、ESP32ファミリーの急速なラインナップ拡充とチップ命名規則の複雑化は、市場における仕様の深刻な混同や誤認を引き起こしている。特に、オンラインリテーラーや一部の技術ブログにおいて、旧世代のESP32のスペック（例：SRAM 520KB、GPIO 34本、クラシックBluetooth対応など）や、別モデルのアーキテクチャ（RISC-V）が、ESP32-S3の仕様として誤って記載されるケースが散見される[cite: 10, 11, 12, 13, 14, 15, 16, 17]。本レポートは、提供された技術文書や公式データシートを基にESP32-S3の真のアーキテクチャと技術仕様を徹底的に解剖し、市場に蔓延する技術的誤認を是正することを目的とする。ハードウェア設計者、ファームウェアエンジニア、およびプロダクトマネージャーが、設計上の致命的なエラーを回避し、デバイスのポテンシャルを最大限に引き出すための包括的な技術リファレンスとして機能する。

## コア・アーキテクチャの真実：Xtensa LX7とRISC-Vの混同

ESP32-S3の演算能力の核となるのは、そのCPUアーキテクチャである。ここで技術者の間でも頻繁に見られる誤認の一つが、「ESP32-S3はRISC-Vアーキテクチャを採用している」というものである[cite: 18, 19, 20, 21]。この誤解が生じた背景には、Espressif社がESP32-C3以降、ライセンス料が不要でカスタマイズの自由度が高いオープンソースのRISC-VアーキテクチャへとメインストリームのIoTチップセットを大きく移行させた事実がある[cite: 1, 19]。また、後継機であるESP32-S31が最大320MHzで動作するデュアルコアRISC-V SoCとして発表されたことも、Sシリーズ全体のアーキテクチャに対する混同を助長している[cite: 22]。

### デュアルコア Xtensa LX7プロセッサの採用

結論から言えば、ESP32-S3のメインCPUは「Xtensa 32-bit LX7」デュアルコアプロセッサであり、RISC-Vではない[cite: 1, 2, 5, 6, 8, 23]。最大240MHzで動作するこのプロセッサは、初期型ESP32に搭載されていたXtensa LX6プロセッサの正統進化版である[cite: 5]。

LX7アーキテクチャの採用により、同一クロック周波数であってもサイクルあたりの命令実行数（IPC）が向上し、エネルギー効率と応答性が大幅に改善されている[cite: 5]。また、ESP32-S3は128ビットのデータバスを備えており、高度なメモリアクセスを実現している[cite: 9]。これにより、FreeRTOSなどのリアルタイムOS環境下において、一方のコアでWi-FiやBluetoothのプロトコルスタックを処理しつつ、もう一方のコアで負荷の高いアプリケーションコード（ディスプレイの描画や音声データのエンコードなど）を遅延なく実行することが可能となっている[cite: 1, 5, 6, 23]。

### AIoTに向けたベクトル命令（PIE）の統合

ESP32-S3が旧モデルやCシリーズ（ESP32-C3やC6など）と一線を画す最大の技術的特徴は、ニューラルネットワーク推論やデジタル信号処理（DSP）を高速化するためのハードウェア・ベクトル命令（PIE：Processor Instruction Extensions）を備えている点である[cite: 1, 6, 8, 9, 23]。

このSIMD（Single Instruction, Multiple Data）指向の命令セットにより、複雑な数学的演算を並列処理できるため、ウェイクワード検出、連続的な音声認識、顔検出といったエッジAIワークロードの実行速度が飛躍的に向上する[cite: 9]。AIエージェントやスマートディスプレイなど、リアルタイムの信号処理が必要なプロジェクトにおいて、ESP32-S3が「最適なESP32」として推奨されるのはこのためである[cite: 4, 6, 8, 24]。対照的に、ESP32-C3やC6のRISC-VコアにはこのようなAI特化のベクトル命令は搭載されていない[cite: 6, 23]。

### ULP RISC-V コプロセッサによる混乱の背景

メインCPUはXtensa LX7であるが、ESP32-S3のシリコンダイには「ULP（Ultra-Low Power）RISC-V コプロセッサ」が内蔵されている[cite: 23, 25, 26, 27]。これが、仕様を混同させる主要因となっている。

ULPプロセッサは、メインCPUがディープスリープモードにある間に、極めて限られた電力でセンサーのポーリング、ADC（アナログ・デジタル変換）による測定、I2C通信などの単純なタスクを実行するための極小のサブプロセッサである[cite: 25, 26]。初期のESP32ではこのULPがFSM（Finite State Machine）ベースであり、専用のアセンブリ言語を必要としたのに対し、ESP32-S3では標準のGNUツールチェーンを用いたC言語でプログラミング可能なRISC-VベースのULPが搭載された[cite: 25, 26]。RV32IMC命令セット（ハードウェア乗算・除算および圧縮命令を含む）に基づくこの32ビット固定小数点コプロセッサの存在が、「ESP32-S3全体がRISC-Vアーキテクチャである」という不正確な情報の拡散を招いたと分析される[cite: 25, 26]。

| チップモデル | メインCPUアーキテクチャ | コア数 | 最大周波数 | ULPコプロセッサ | AIアクセラレーション |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ESP32 (Classic)** | Xtensa LX6 | デュアル/シングル | 240 MHz | ULP FSM | なし |
| **ESP32-S2** | Xtensa LX7 | シングル | 240 MHz | ULP RISC-V | なし |
| **ESP32-C3** | RISC-V (RV32IMC) | シングル | 160 MHz | なし | なし |
| **ESP32-S3** | **Xtensa LX7** | **デュアル** | **240 MHz** | **ULP RISC-V** | **あり (ベクトル命令)** |
| **ESP32-C6** | RISC-V (RV32IMAC) | シングル | 160 MHz | LP RISC-V (20MHz) | なし |

*(出典: Espressif データシートに基づく各シリーズの比較 [cite: 1, 2, 6, 8, 23])*

## メモリリソースの正確な把握：512KBか、520KBか

プログラマブルなメモリ容量は、組み込みシステムにおいてグラフィカルユーザーインターフェース（GUI）や大規模な配列、バッファリングを実装する際の死活問題となる。ESP32-S3のメモリ仕様についても、市場には根強い誤認が存在する。

### 内蔵SRAM容量の訂正

多くの販売サイトや一部の技術ドキュメントでは、ESP32-S3の内蔵SRAM容量が「520KB」と記載されている[cite: 7, 14, 16, 24, 28, 29, 30, 31]。しかし、厳密なチップシリーズのデータシートによれば、ESP32-S3の内蔵SRAMは「512KB」である[cite: 1, 2, 6, 8, 9, 23]。520KBという数値は、2016年にリリースされた初代ESP32（Xtensa LX6搭載モデル）の固有スペックであり、これが新しい世代のチップに誤ってコピーペーストされ続けている実態がある[cite: 1, 2, 14, 32]。加えて、ESP32-S3は16KBのRTC SRAMを内蔵しており、ディープスリープ時の状態保持やULPコプロセッサ用のメモリとして利用される[cite: 1, 9, 23]。また、ブートおよびコア機能のために384KBのROMを備えている[cite: 2, 23]。

さらに、アプリケーション領域としてプログラマーが利用できるヒープメモリ（Heap）は、512KB全体ではない。ROMコードのデータ、オペレーティングシステム（FreeRTOS）のスタック、Wi-Fi/Bluetoothのベースバンド用バッファ、および命令/データキャッシュ領域として数十KBから100KB以上がシステムによって予約される[cite: 30]。特にESP32-S3では、フラッシュおよびPSRAMへのアクセス用にデータキャッシュと命令キャッシュ（それぞれ4ウェイまたは8ウェイのセットアソシアティブ方式）が動的に割り当てられるため、実際に開発者が `heap_caps_get_free_size(MALLOC_CAP_INTERNAL)` 等で確認できる連続した空きSRAM容量は、初期状態で300KB台〜400KB弱となることが多い[cite: 2, 30]。SRAMが520KBあると前提して限界までメモリを消費するコードを移植すると、ESP32-S3ではメモリ割り当てエラー（Out of Memory）によるクラッシュを引き起こすリスクがある。



### オクタSPI PSRAMによるメモリ拡張とアーキテクチャ上の利点

内蔵SRAMの制約を打破するため、ESP32-S3は外部の疑似SRAM（PSRAM）およびフラッシュメモリとの接続を強力にサポートしている。特に、従来のクアッドSPI（4ビット幅）に加え、より高速なオクタSPI（Octal SPI：8ビット幅）接続に対応したことで、メモリ帯域幅が格段に向上した[cite: 23, 33]。一般的に、ESP32-S3-WROOM-1モジュールなどのバリエーションでは、2MBから最大8MB（製品によっては16MB）のPSRAMがパッケージ内に統合されている[cite: 7, 9, 24, 28, 29]。これにより、チップは最大1GBまでの外部デバイスをアドレス指定可能である[cite: 2]。

この大容量PSRAMは、カメラからの画像キャプチャ、オーディオの重いDSPバッファリング、およびLVGLなどを使用した複雑なタッチディスプレイのフレームバッファとして必須のリソースである[cite: 4, 7, 8]。開発ツールチェイン（ESP-IDF）上で適切に設定すれば、このPSRAM領域はメインのメモリ空間にマッピングされ、通常の動的メモリ確保（malloc）の延長として透過的に利用することが可能になる[cite: 9, 34]。さらに、MicroPython環境などにおいて、不揮発性のフラッシュメモリにはファームウェア本体や「Frozen Modules（組み込みPythonモジュール）」が配置され、揮発性のSRAMにはスタックやヒープが、そして大容量のPSRAMには画像処理などの一時的な作業領域が割り当てられるといった厳密なメモリ管理が行われる[cite: 31]。

| リソース | 初代 ESP32 | ESP32-S3 | ESP32-C3 | ESP32-C6 |
| :--- | :--- | :--- | :--- | :--- |
| **内蔵SRAM** | **520 KB** | **512 KB** | 400 KB | 512 KB |
| **RTC SRAM** | 16 KB | 16 KB | 8 KB | 16 KB |
| **内蔵ROM** | 448 KB | 384 KB | 384 KB | 320 KB |
| **外部PSRAM** | 最大8MBアドレス | 最大1GBアドレス (Octal SPI) | なし | なし |
| **最大動作周波数** | 240 MHz | 240 MHz | 160 MHz | 160 MHz |

*(出典: Espressif データシートに基づくメモリ仕様 [cite: 1, 2, 8, 23])*

## ワイヤレス通信機能とBluetooth仕様の誤解

ESP32シリーズの最大の売りは、ワイヤレスモデムがシリコンダイに統合されている点である。ESP32-S3は、2.4GHz帯の802.11 b/g/n（Wi-Fi 4）をサポートしており、従来のESP32よりもRF（高周波）回路の設計が改善されたことで、受信感度や干渉耐性が向上し、より安定した接続と高いスループットを実現している[cite: 1, 2, 5]。

一方で、Bluetoothの仕様に関しては、極めて深刻な誤認が流通している。

### 「クラシックBluetooth対応」は完全な誤り

Amazon、Kakaku.com、AliExpressなどの電子部品の販売ページや、一部のマニュアルにおいて、ESP32-S3モジュールが「Bluetooth 4.2対応」「クラシックBluetooth対応」「デュアルモード対応」と記載されているケースが後を絶たない[cite: 10, 13, 15, 35, 36, 37, 38, 39, 40, 41, 42]。

これは致命的な誤記である。ESP32-S3は「Bluetooth Low Energy（BLE） 5.0」のみをサポートしており、クラシックBluetooth（BR/EDR）のハードウェア無線モジュールを搭載していない[cite: 1, 2, 6, 8, 23, 43, 44, 45, 46]。

初代ESP32は、確かにBluetooth 4.2仕様に準拠したデュアルモード（Classic + BLE）をサポートしていた[cite: 2, 44, 46, 47]。そのため、ワイヤレスオーディオのストリーミングに用いられるA2DP（Advanced Audio Distribution Profile）や、仮想シリアル通信を提供するSPP（Serial Port Profile）を容易に実装できた[cite: 1, 44, 48]。しかし、IoT市場のトレンドが低消費電力かつ間欠的なデータ転送にシフトしたことを受け、Espressif社はESP32-C3やESP32-S3以降のアーキテクチャから消費電力の大きいクラシックBluetoothのサポートを完全に削除し、BLE 5（およびC6などのモデルではMeshや802.15.4）に特化する方針をとった[cite: 1, 6, 43, 44, 46]。

したがって、レガシーなAndroid端末やWindows PCとSPPで連続的なシリアル通信を行いたい場合や、既存のBluetoothオーディオコントローラ（例：HC-05モジュールを搭載したゲームパッドやPS Vitaコントローラなど）とネイティブにペアリングするプロジェクトにおいて、ESP32-S3を選択すると開発が行き詰まることになる[cite: 1, 43, 44, 48]。このような用途では、現在でも初代の「ESP32（無印）」を選択するか、外部に専用のBluetoothクラシックモジュールを追加するしかない[cite: 4, 8, 32, 43, 44]。

### プロトコルスタック：BluedroidとNimBLEの最適化

ESP32-S3上でBLE 5.0を運用する際、開発環境（ESP-IDF）では2つのホストプロトコルスタックを選択できる。一つは「Bluedroid」（Androidのネイティブスタックを修正したもの）、もう一つは「ESP-NimBLE」である[cite: 45, 46, 47]。

Bluedroidはアーキテクチャが明確であり、初代ESP32ではクラシックBluetoothとBLEの両方を処理するために重宝されたが、メモリとファームウェアサイズの消費が大きいという欠点がある[cite: 45, 46, 47]。ESP32-S3はBLE専用であるため、クラシックBTのオーバーヘッドを持たないESP-NimBLEスタックを使用することが強く推奨される。NimBLEはRAMとフラッシュメモリの消費量が少なく、ESP32-S3のメモリリソースをアプリケーション（グラフィックスやAI演算）に大きく残すことができる[cite: 46, 47]。さらに、Wi-Fiの認証情報をBluetoothチャネル経由で安全に渡すための「BluFi」プロトコルもサポートされており、IoTデバイスの初期セットアップを大幅に簡略化できる[cite: 46]。

BLE 5.0へのアップデートにより、ESP32-S3はBLE 4.2と比較して通信範囲の拡大（Long Rangeモード）やデータスループットの向上（2Mbpsモード）の恩恵を受けることができる。BLE 4.2の典型的な通信距離が約60メートルであるのに対し、BLE 5.0は理論上その4倍の最大240メートルまで到達可能である[cite: 49]。これにより、スマートホームにおけるHome AssistantのBluetoothプロキシなど、広範囲なカバレッジが求められる用途において、ESP32-S3（特に外部アンテナを装備したモデル）は優れた中継ノードとして機能する[cite: 49]。

## GPIOとペリフェラルの拡張性

ハードウェアの外部インターフェースを設計する上で、利用可能なピン数と機能の柔軟性は極めて重要である。ここでもまた、ESP32-S3は初代モデルとの混同による「GPIO 34本」という不当な過小評価を受けることがある[cite: 14, 50, 51]。

### 実装された45本のGPIOとペリフェラルルーティング

ESP32-S3は、ユーザーがプログラム可能なGPIOピンを「45本」備えている[cite: 1, 6, 8, 33]。初代ESP32の34本（うち数本は入力専用）、あるいはESP32-C3の22本と比較すると、ESP32-S3は圧倒的なI/Oリソースを提供している[cite: 1, 8, 14]。この豊富なGPIOにより、パラレルインターフェースのLCD、複数のカメラデータライン、マイクロフォンアレイ（I2S）、多数のセンサーを、マルチプレクサやI/Oエクスパンダ（拡張IC）なしで単一のチップに直接接続できる[cite: 1, 6, 8, 24]。

さらに、静電容量式タッチセンサー機能が14本のピンに内蔵されており、機械的な物理ボタンを置き換えるフラットなタッチパネルインターフェースを容易に実装できる[cite: 33, 52, 53, 54]。これはHMIダッシュボードの構築において非常に有利である。また、アナログ信号の処理として、2つの12ビットADC（Analog-to-Digital Converter）ユニットを搭載し、合計20チャンネルの入力をサポートしている[cite: 2, 52]。

初代ESP32を使用していた開発者は、I2C通信と言えば「SDA = 21, SCL = 22」という固定観念を持っていることが多い[cite: 55, 56]。しかし、ESP32-S3は高度なGPIOマトリックスとペリフェラルルーティングを備えており、I2C（2系統）、SPI（4系統）、UART（3系統）、I2S（2系統）などのデジタルペリフェラル信号を、ほぼすべての汎用GPIOピンに内部でマッピングすることが可能である[cite: 6, 44, 52, 55, 56, 57]。例えば、Waveshare社のESP32-S3開発ボードなどでは、ボードのレイアウト最適化のためにI2CピンがデフォルトでGPIO 8と9に割り当てられているケースもある[cite: 57]。ソフトウェア上（Arduino IDEであれば `Wire.begin(SDA_PIN, SCL_PIN)`）でピン番号を定義するだけで、ハードウェアレイアウトに応じた極めて柔軟なルーティングが可能となる[cite: 56, 57]。

### 隠されたトラップ：使用してはならないピン

45本のGPIOが存在するとはいえ、そのすべてをユーザーが自由に使えるわけではない。回路設計時に陥りやすい罠として、内部のSPIフラッシュメモリおよびPSRAMとの通信に予約されているピンの誤使用がある[cite: 20, 22, 54, 56]。

ESP32-S3では、一般的にGPIO 26〜32（チップの実装バージョンやモジュールによっては異なる場合がある）が内部のメモリチップへのバス接続に使用されている[cite: 53, 54, 58]。これらのピンを外部ペリフェラルの接続に使用したり、起動時（Boot）のストラップピン（GPIO 0, 2, 3, 45, 46など）の電圧レベルを誤ってプルアップまたはプルダウンしてしまうと、システムはフラッシュメモリへのアクセスに失敗し、パニック状態に陥るか全く起動しなくなる[cite: 20, 22, 54, 55, 56]。データシートとモジュール仕様書を照らし合わせ、実際に自由に利用可能な「セーフピン」を特定することが設計の第一歩である。

### ネイティブUSBの革新

ESP32-S3のI/Oにおけるもう一つの顕著な革新は、USB OTG（On-The-Go）1.1およびUSB Serial/JTAGコントローラーのチップ内蔵である[cite: 1, 4, 6, 8, 33]。従来のESP32では、PCとのシリアル通信やプログラムの書き込みのために、ボード上に外部のUSB-UART変換チップ（CP2102やCH340など）を搭載する必要があった[cite: 1, 33, 59]。

ESP32-S3（および単一コアのESP32-S2）は、チップ自身が直接USBデータライン（D+ / D-）を制御できるため、USBマスストレージ、仮想キーボード、マウス、MIDIデバイスなどの「USB HID（Human Interface Device）」として振る舞うプロジェクトをネイティブに構築できる[cite: 4, 5, 32]。さらに、外部変換チップを省略できることは、BOM（部品表）コストの削減と基板サイズの縮小に直結し、後述する省電力化にも劇的な効果をもたらす[cite: 33]。

## 省電力設計とディープスリープの罠

IoTエッジノード、特にバッテリー駆動の環境センサーやウェアラブルデバイスにおいて、消費電力の最適化はアーキテクチャ選定における最重要課題である。ESP32-S3は強力なプロセッサを搭載しているため、アクティブモード（Wi-Fi送信中など）ではピーク時に数百mAの電流を消費する[cite: 59, 60, 61]。この状態を維持すれば、標準的なリチウムイオンバッテリーは数日で枯渇してしまう。

解決策は各種のスリープモード（Modem Sleep、Light Sleep、Deep Sleep、Hibernation）の活用である[cite: 60, 62]。Espressifの仕様によれば、ESP32-S3のディープスリープ時の消費電流は、RTC（リアルタイムクロック）タイマーとRTCメモリ（8KBのFastおよびSlowメモリ）をオンにした状態で、わずか約10µA（マイクロアンペア）まで低下する[cite: 33, 59, 60, 61, 63]。ディープスリープ中、メインのデジタルコア、XtensaデュアルコアCPU、Wi-Fi、Bluetoothモジュール、およびほとんどの周辺機器への電源供給は完全に遮断される[cite: 59]。

この状態から復帰（ウェイクアップ）するためのソースとして、内蔵のRTCタイマー、特定のRTC GPIOピンの電圧変化（ext0, ext1）、静電容量式タッチセンサーの反応、または前述のULP RISC-Vコプロセッサからの割り込みを利用できる[cite: 59, 62, 63]。復帰プロセスは実質的にデバイスの「再起動」と同義であり、SRAM上のデータは失われるため、状態を保持したい変数はディープスリープ中も給電されるRTCメモリに退避させておく必要がある[cite: 59]。

| 電源モード | 想定される消費電流 | 状態の概要 |
| :--- | :--- | :--- |
| **アクティブ (Active)** | 100 mA 以上 | CPU、Wi-Fi、Bluetooth、ペリフェラルが稼働。 |
| **モデムスリープ (Modem Sleep)** | 約 20〜30 mA | 無線回路のみ停止、CPUは稼働。 |
| **ライトスリープ (Light Sleep)** | 約 800 µA | CPUクロック停止、SRAM保持、迅速な復帰が可能。 |
| **ディープスリープ (Deep Sleep)** | **約 10 µA** | メインCPU・SRAM停止、RTCドメインのみ稼働。 |
| **ハイバネーション (Hibernation)**| 約 5 µA | RTCメモリも停止、極限の省電力状態。 |

*(出典: 消費電力に関する技術資料の統合データ [cite: 59, 60, 62])*

### 開発ボードが引き起こす「数ミリアンペア」の真実

ここでの最大のトラップは、**「チップの仕様が10µAであっても、開発ボード全体の消費電流が10µAになるとは限らない」**ということである[cite: 59]。

多くのエンジニアが市販のESP32-S3開発ボード（DevKitCなど）を購入し、コード内で `esp_deep_sleep_start()` を呼び出したにもかかわらず、テスターで測定すると数mA（数千µA）の電流が流れ続けていることに気づき、フォーラムで助けを求める事態に陥っている[cite: 59, 63]。この現象について、ESP32-S3チップ単体は仕様通り10µAのディープスリープ状態を達成しているものの、標準的な開発ボード上に配置された周辺コンポーネントが数ミリアンペアの電流を消費し続けていることがデータから示されている。具体的には、AMS1117などの一般的な3.3Vリニア電圧レギュレータ（LDO）は、無負荷状態でも約5mAの静止電流を消費する。さらに、USB-to-UARTブリッジチップ（CP2102など）や、基板上で常時点灯している電源確認用のLEDも、マイクロコントローラの省電力モードを迂回してバッテリーを枯渇させる寄生的なドレインとして作用する。これらの要素が、真の低消費電力設計を阻害する「ディープスリープの罠」を形成している[cite: 59, 61, 63]。

ESP32-S3の真の低消費電力能力（10µA）を引き出すためには、これらのレガシーな要素を排除したカスタムPCBを設計するか、低静止電流のLDOを搭載した専用の低電力ボード（ESP32-S3-Leafなど）を選択する必要がある[cite: 33, 59]。また、ESP32-S3が内蔵するネイティブUSBコントローラーを利用すれば、外部のUSB-UART変換チップをハードウェア設計から完全に排除できるため、ディープスリープ時の無駄な電流消費を根本から解決することが可能となる[cite: 33]。

## 開発環境とソフトウェア最適化

ESP32-S3のファームウェア開発は、強力なオープンソースエコシステムによって支えられている。Espressif公式の「ESP-IDF（IoT Development Framework）」は、FreeRTOSを基盤としており、CMakeおよびNinjaビルドシステムを利用して、本番環境レベルの高度なファームウェア開発をサポートする[cite: 22, 45]。ベクトル命令を利用したAI処理や複雑なメモリ管理を行う場合、ESP-IDFの使用が推奨される。

一方で、より迅速なプロトタイピングや教育用途向けには、ArduinoフレームワークやMicroPythonも広く利用されている[cite: 7, 28, 33, 36]。特筆すべきは、オーディオや物理演算などの不要なサブシステムを無効化することでSRAM消費を大幅に削減できる「PixelRoot32」のようなモジュール式コンパイルシステムが存在することである[cite: 64]。DACオーディオ機能を無効化するだけで、約8KBのRAMを節約し、ファームウェアサイズを15〜25%削減できるケースもあり、リソースの限られたエッジ環境におけるソフトウェア最適化の手法として極めて有効である[cite: 64]。また、開発にあたってはオープンソースライセンス（GPL-3.0など）の適用範囲に留意する必要があり、他者のコードを流用して配布する場合には同等のライセンス条件を遵守する法的責任が生じる点も、プロジェクトマネジメントにおいて不可欠な視点である[cite: 65]。

## 結論とハードウェア設計者への推奨事項

ESP32-S3は、初代ESP32から確実な進化を遂げた強力なシステム・オン・チップ（SoC）である。その真の価値は、デュアルコアXtensa LX7の演算能力と、ベクトル命令によるAI・DSPアクセラレーション、そして広範な外部I/O（USB OTGおよび大容量PSRAM対応）が統合されている点にある[cite: 1, 4, 5, 6, 8]。

ハードウェア設計およびファームウェア開発を成功させるためには、市場に溢れる不正確な情報に惑わされず、以下の仕様の真実を正確に理解しておく必要がある。

1.  **アーキテクチャの選定：** ESP32-S3はRISC-Vメインプロセッサではない[cite: 1, 18, 19]。高度なAI演算やディスプレイ描画を必要とする場合はS3（Xtensa LX7）を、シンプルなセンサーノードや低コストのWi-Fi/BLE接続のみを求める場合はC3（RISC-V）を、ThreadやZigbeeなどの802.15.4メッシュネットワークを構築する場合はC6を選択するという厳格な使い分けが必須である[cite: 1, 4, 8]。
2.  **Bluetooth仕様の限界の認識：** ESP32-S3にはクラシックBluetoothが搭載されていない[cite: 1, 43, 44, 45, 46]。レガシーなデバイスとのシリアル通信（SPP）やオーディオ（A2DP）用途には適しておらず、そのような場合は初代ESP32を選択するか、外部モジュールで補完する設計へ変更しなければならない[cite: 4, 8, 32, 44]。
3.  **リソースの正確な把握：** S3のSRAMは512KBであり、520KBではない[cite: 1, 9, 23]。また、45本のGPIOを有するものの、内蔵フラッシュやPSRAM用のピンは使用できない[cite: 1, 54, 56]。メモリを大量に消費するタスク（画像や音声）には、必ず大容量のPSRAMを内蔵したモジュールバリエーションを採用すること。
4.  **真の省電力設計のアプローチ：** 10µAという驚異的なディープスリープ仕様は、チップ単体での理論値である[cite: 59]。バッテリー駆動のIoTデバイスを開発する際は、開発ボードの回路構成に依存せず、漏れ電流の少ない電源回路とネイティブUSBを活用した独自基板の設計を行うことが強く推奨される[cite: 33, 59]。

これらの技術的要件と制約を正しく理解し、適材適所で活用することによってのみ、ESP32-S3は次世代のAIoTエッジデバイスの中核としてその真価を発揮するだろう。設計者はデータシートを一次情報として扱い、オンラインの要約や古いフォーラムの情報に対して常に批判的な視点を持つことが求められる。

**Sources:**
1. [infishark.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFZP8OGsLHoBAwcZDKeQABi6LcFLhPjThqW0f-tW0dl2wi5EQMNHWTQKj2ZeC11_r_WReCoLpGry71oJ77EWzQTUba_W1qoRadhiM3xTLbl-qCcDsEXJBQpj19K0KE5wi3rTDHe2iuuRaCLuQw_4l-Pf5sJwsON9RjOUVHWdfBx_HV2SVf50PInyg==)
2. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHpvP9o6rdYZAv8hyiIVz8sO3esff3QUXL0bivqa-2H9IGl7gl0-l1fOaeO0tpi_B3bVbfADn-hifcfhtFG2zp6ipyccvitCPRCQ3GN1JQJzEtzb1oddizG0xiSI_K-A-6dDmg9-lceZmW-bzxxJH8l-s8XJOz1Z-FrL1sgZKmqyrzMUnBDsHhkMMpzkhBDuNcKFTv9e0-eRgW32-U=)
3. [wikipedia.org](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHmekGaRfvH4AtYc4fB7vFhAze3CsfSB_DmbhLIpXIgCpgEGEb9cH8O1vg0_lIkFoPE_6JC-i-GRJsreZ0Emmh-vGyJfizCBZKYNbLkCTj9QkW_9qWA0SmWfQ==)
4. [jrattechworks.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG4Pv1TEIzuE8tM8Bpq2hHoFqthz7hOc8gDBJY-yXaFxBR6mJc2bxWnV9LEIvbA9qyp-Hung1VnYA1YrtcKQtt773p1-JyJ18ZVdL8Hl9iuimdjx8BA90pF5t8v5ouqvg==)
5. [pcbway.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHKJIjHKysmvDdgPIU5YM1NMVsHhNlwqyfy6Hft_hkNqx1lCO6-suZ8RMIYAIcoR7_Za1rzO3TVy0tEuYUmakyW5htsTRh_XhYuaQ42qLIp3WJpVUelzj5x26lr4cYsPjahdNm8rlj-BIdUpsmd2d7LMt5QFgTlsggm008-XKm0t84X5oKvLhyq_DYPsZUd973a-wrdKob6dgm49TCxYeagfd1BSrZPtxSpIVH4cHkoGA==)
6. [circuitlabs.net](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFM0JsIecmSklUIdGU6Xb-eNW1ZqByZUKubf_Ce9ItPqHpdQ76zmDwsDzSXQrGN3IadKezFHZUP5FfGUXgEDB9vQLY9iF1ee6ethalZ_ZSQGnvcgRzY4DhPW9LrZGAr0SgHWORW2GijqiRxXvmhjIweXZ7Y8g==)
7. [sheen.bot](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGw1sqZC9-5SBr-7ZuUUalCf2j8FxfKrYQhIebuBhRkRRypnonY23pMjND6xYQoSw9wsDM8DmX-toet7kMwd99ILeqIngHfiqjY3pJj6pnZGlUxKHRdAahWHrh42ezReG-iHJqK-o6AVa-Qv6PMyXDiuSEvYom1s9ax6Gpq75wb2I1U53sE9iHyyvGcRuhcp7dRdzzHJdwBR1_8Zqf8AG26)
8. [nextpcb.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG_gx1ze3gc84vhau6A6NR3eI0HYXrl9iKQPqxCk2Cc4Vzhhj_eBniml_Fl5ALPAeZjkyy3QDuvLvJyJ0cixVmMASDAR26noOqRQQwkpMVoikOx00WQzK2GKKfOXa2flkrThGIdxSTUg35TltGWYxa5Z1eGyV6Igg==)
9. [ampheo.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFznjNE7LheBGsHNF2tuelR7dcA0qTA9AcgtrE2LxGrgFvQ1nFpmzCSW-jvmSRT75NPIMMOXZdljmTsLfZXGolzb0-dwSchXN5B3SOF4i3ZoUTyZZoIdfkNeomv-hi3V_NKNvLaltvNa3rlHywuNC8jiY2unyZCXwZvQB3WBHip9U2J3KjMx3MPh8BDyDLo0fc=)
10. [manuals.plus](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHLMuMFsLOJbK19Rjiea92XnZoQOnv1LaT-9ZBJBROx5A4X2aRTVuBVNEleljSawqkWZcur3fG5yf94uI_m7QRSq9QMYkUwfAbM7rNIxyJ7pEN1yltzcHJB7o6m47vszoWCE6L_gufTXgqUwohRjT69MuWUbd14MsJhwsyYsDJrcd_UrA==)
11. [reddit.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF2OjOVMzxGpyszTcrzULirk_4Wwp-z6Ku4CwPqhgDt_FF1cQjR-dub2b4I6mW_9gq8jurXfcqxgWSslsuDhKN4iAenuIRnQVN5g-w9tPlF9AK3P23aSYGq788Lq5paoyUcHMBASqBIEXs7s6UWuYHfiulsWPh7nNHSTVIMFdNlWuC3Y3cBX7wDyeU3)
12. [reddit.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH8GKZvxf652F4VNNLM6b7npK_QyocXqmX918k-E_y8--1d2qsZVKBYBrG3dJOpG2JTpjn7cvXJf_11jUeBDmIFx7bKDh4YxSeubYK8LZbfvEjV2FKe2f36pjhMz2T_wm2NBXK59O_uAeNo2MkPuKc77s0P78N2hmJNeWIv7Nnk_F7ckErKGdcKys_W6onuZQXggQEhhTKENglA6sIM)
13. [manuals.plus](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFIkJC6JW-6S6Y137mYBb3DmpMP3M_XCPOKOAtf-IfxlxzoNuOo2MTAKEy2LOV_ksmPBS_sZQ7b6hYO-rzjWtxelNyqTQyzWU9sa6Wu3Ls_A7ssaCrxioSm0FplkD0=)
14. [sensbench.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEQEUqZy6xOV3cPk0pd0EbXyYCJ9lvntwJKSPp20PeXW_PU1F-MsgRMLeEorVgBez-TYfJ3cAm634NuEQydNnZe7tx46qWhmyt_lw0ULGNATAI7bMqoX7o72mDK3ErW8g==)
15. [desertcart.com.au](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFs_BDVVidxQmHucT5mJBja3TgSvTY1xhGEjNZp29B6Y9wLYL9pBiBeABYkKkiCHNNKVYvuiQzQuF4ALZxIUYkBi_Juusrzf1WM05kHZNOxVW6ekqUxJRWERn_jt75l7Lt4JeF56MDc-T6XA1oCo2U3RYL0W20gkxeoXhzIzhxnItfRD1ai7HRyoevUxnBIyN41byVcJtgEmATnbMiNwZg4qoLUhHjjkCvAEmySNNhrKGWUaqXIufe2zJEAKRCdJ8ajccoNVV-ULPg8nUolBTQNUXh1QO1LkqWofocaGA3F5zFdIHW9dExzBMSxh2pAJvDser8EDp9932i0kaqK70dvBg3QX-fyzT8Di5v5gueE1vvXEvN7qXhcmB_SqQ==)
16. [mouser.ca](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGJMtgD1C_DcxJG5vYc4n3RlyYPXBessYq0NmlHZ7zEuO-iR1XBMK84LuzUW43DyHqb_rwSMqmD-Dep_gIKD-oUMXglPT5AAluhlN1fqJKGrFhmLD11XId5IQE7F0nD_um3KZp4roqw4iXxB7_ZI8T-2EGWsU1-Ptkk9p5JWpU=)
17. [robotshop.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHPQ0T_WlnH6OpPG6adIKj1LWZzvz_WDDbgUUhA3t9ry6nRVCI_GQMd59oAf7fpa2qIIhYRqZ2_mNkXWnCAjtRztFLzmonVMkOYQ1WTTCw-Ke6RdH3b1HQBSdB7jdpaNkKvWHnYGu01K3rNpj3nadAbunFs-qB1h9TPfIXXtGErfWw=)
18. [qiita.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFg8PfoLzWQV-Ui8Rh4o4RDDvw9DcNZIwvqjmp2tZtedAjvTAhQ9tlm3xDvWyP_sIizcUpWWT_OK-deb6qI70dsy89r4Ru5r_4k8nn9lBChPDXVa9JOIynrwt-jAGp55zR6TPJMSd2HRiYgaJNRCGr3Rg4=)
19. [fabscene.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGo36y88IHXlFrorXVOgN-EKzQaA5oILa7K9D6eWC9UiYbLdWY83U8HiaSlgkRoeVqgW1KVmKeEXw8xgZABBJe3zRVMNNEs24LnALTkf31CbcWuFQPKPJyDrNV_we5bFA8vq6rfE2HERVUNAIq8XJSgxyXfUvmuwIBoxhEfe9rPyFYn6w==)
20. [dlrow-design.net](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEUzRfbR92wKl0JZFzflIK3fN_rRVnm2g7dQ-cM8N9LyjdJpYVtCFukQkn962r-L9mnv4_9jJOtHjNMAec5ZWhQk3Nbt6RNqTDcJzFMHKn3C_IQyrPlsvt86Tcts77WeF69Tgbkw_bKIbjKSEOjTviycadk4rFW7Ok-Sto75pO3HsBAy7va1raDqwkVAfk6G-lVX0KopErSBw5FPwmiNkMzmUggXRHxmGHTZtPLPwjfDKZIkvmpZjEOQ-aaUGmtpSP6IJG3dARXC_i5PLAVy2ExEmQGsdY8q_41DDyNO2HMI2BAD4shPB2rNH6PAay1uEI5aWVTBo_j5rp5s_Eu9xV_4RhTh19gnS4mIfstEvMNimATDJUk)
21. [jlcpcb.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG-p5pY_FdJyy4yp3lXb7fVKTms0Upv3_ToYO39LsLQ-AGPf8UTefFmqKb8etiEwr-5IxAhGY7NrPJeTtodArkQ5N1MJ3nACtz92lYOE1HHc7K4R_P8TS7afINy_lophQ==)
22. [reddit.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEJ9EthRXHmDr-vTiJeMu6B2V8m8Jjg76ddaztQaexmhnqoY5C2BeJW1jujN3chQQMStfgsdfE_pmCMMQqGRNxIeX-Z-9u-O3hfHu15ZfBzJxJKXQU7FtqgfaCpu5Q9k9itKMMG8NFYHRkVyIGA1z2fMutwsVnmEKUGjBmbu_q1vug=)
23. [esp32learning.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHKa3Skg1EJUkr-SCm4VyJybAaipxXZ3eR6BvMNtwwL7An4zddy88-VXhmkFSdbADDeiQx_M-HJleUW_hlo9ot_pAeNzofQ90IiG6Cv7Z7tujC7kI4dFGjvg1t_Pq3DN4MMTDqldWYPOyUOCEUVBSKYZK-D3HQ-F1vHbtOkDPiwf3Q3yM_Y2-JTgc_u34jLVo4P18NpLWGdSCuL_qE=)
24. [viewedisplay.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEdCtab30nxkN1h9i5PwMYLAqRmR2XE64pHG9y7NAqICEQxDlPXPJEW59FMz8gNpRRTnQe3RzJMgzpJmuAyhWTCx3ICoYdRhPkwjAq0LeFLDRqFq20fK7ofKnCiBGhmxxEAdf10Cogong7jPcx-kc0EZy65b_8fl0zyByPo3N3WFoRNCPNp9f_qLvGrbVha7yZPpNBaOCkD42ie)
25. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGhx15TgK1rzI9YZ4Cg8g4mpPZcJ5z2edK5MD1A4DrTPn6W9dIf-9wLeB2gdxwUVjZPldlJ9ux575_kN1iDxzmWMsnJxrChEvqdj7RFw5DK_5B8j4xUjYMxmMvENDQrBL1IMxBSPz88zC2p0gjmNHvcBlnC5f0WIgo2WQnKh0LvLmY6O9WsOnloNFKRrjzq)
26. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE4DutvFuUCKDp90Y5OnN9NACAWcG8CZ28cbWsrOvrIiAN9BW3iUvOk--Oifzvao_Gqyura_hmcefYQyzB56N7SsZhvqjBhDfQUQ69OLsjcEA61vIdTWXTQ2p9CVlOBVn6kQCrFUpLqNElWOuqFgFNyla1SeY__EWb_RC8XuICvqkX6kUbqumK0oOppTTaU6BqlmwcmpHA5yQ==)
27. [lang-ship.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQES6VSg0aPKaUcJI1xoQMvSINd3hyu7qpldEjiM74I7VuWa2uHdwdR4WgVMkO6fihYaMi_QPmcmcbbjdtM8Nb45VbyNQQZL8hqZC8OSPkxcrvGnaHPT7aijBL3yrB2v3MOEheqqALA=)
28. [dfrobot.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEUydYXIaVV1-JF6QcBe5ENFvK7T6UhT5To9OnbUfvGB_QpbNvVkbz3rTxqun-T-v3boaggbQx86f7Fjy3-ZcSiGQ2Sh-oyvDtEWEsdLRUEVxmHrA8JpY0=)
29. [mouser.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF-olBoka0bx0JGNq7udTTENNDbDncKNQb7UU6KdgSkm_Sq5K-3ESOOimeaWti7wFnvlNF7DZ1Owp3QV7OhcawRT1zslsHqjJypxuQHymeGG1h2lu5Y6-vcp40AGWdXfEkVX3BWlwxX7RaRIVUc41kZHB04bJrvZqD0El00yz0=)
30. [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHGtFbRITydS1_-EaYSKMuxRuYCwXcC5gLGsP5Culez7fpCbN0aVtHQpUCIbqGz7ezIetNXVSQj8-q6qH0Q-MSP3NmneR6_lSxML1-2AbTSzJL9R2lBpU2LevrsVtSgiajExGiwBelw)
31. [zenn.dev](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH_G3SIbUxcLlgAum0zU_0ni9FQfa0KSyXi3yQ7JOt8pmENyfwGC-I0PmbHSkBSBv9_98D151CqjYkPKpz8ELiPlkz0Qt79qU953KhwdY5emKOHCR6IOoIykEf4E2nM9qLkDN7g0g==)
32. [electwork.net](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEYWCcqZi-exMMsRgAxkwgd1-yx_8QtoPrqw4rAQy_FPrTVklmcQqM29oayYueMCl2hRTpsiTmGoy54RavDI3kfE3f9KYXfi4xVFOCMl2WeZItbdwJ7CRHboYolUpuA-gkkA3JYD7JzCTWF)
33. [icbbuy.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEhm0xtSRmZ_CVuqQrU0DR7hvnusgo4u1d_ms9p8y-8kFFhdAwWwYcaZqXzenFe1v50f2PHjhPI-6JplVtI9xpJX1wq2cZZDb7cbMzHDvnZXvQtPJP2lgmNwZ9uNpz7ge_9Av4_Fs5xwAM3fAxCpvdXsjku6we-Ckg=)
34. [note.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGhGOflaaYGy2GVz04ngY8Kfs6kHsd7fZjAmZEc6Ru5f-T2G8l8G7_x8V73v1xCAsiilE5hS2wsNhiebptIdMVmYuat_e-Z9ZvciRjVxDuLHwNGgfUEOBC5vAZj21pZkJM=)
35. [mercadolibre.com.ar](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHbrXyRXymONTwn2AoJn4x7mK_vLXZmqqjYw5g4cpDsIPvieM-NmvmounfxxpP_ENfuhA6G9zBI0n-rBOKiC1yA1xsU_51uEvFEJnyhwZGDRjZdCX20Uxb7GsN2MX-TNYGQrvU4zpsjdhmc44UG3GqSuodMNrVYYc4zVQxnadIBrfDODgpQgysTu5rHhyFgah689ZlcWxmUPoG_pxlCVQ==)
36. [robotshop.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHzbpVCN3N4Yep5kUYs0aZKk7cbgqk5eaEbDkaLLu-1OUf-iw_mmKpW4JyelH6zDE2CrGxZWUYmgeAgvykYR2hFuP6TcnHuaKJeTQuLkaRYtRogOFQOTaDNYZkSbfZfIiBQFhclw7HCcbr4uugH9UI0-1eJPuFqA-ByrqV2SlhrcKWxM6Byx4U0CbmS97oV7PTLyEN-GcjVCwMpWCExybMFMw==)
37. [banggood.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFlEbjcWudO9wrxlF8PGi2ZnnIicQ2HyEJvFryUn2mdCI448LA00bDVjuiGm2Auq30MrO6_hZ_795WbtOW3N_V5JuiWPupLjLVak_IopFVLqRhb5Ci0p0OTOiCZdZ8v0xrg7fN4VQuIklfWONTDhT0cYa_flPf9kKy8-t4a8sNriGnGg17glaw3rVeAGxp8cK8ajvVDmwjFeadk0z7XfA-VB82jrigLPsmon8sQEW5XsO_uJRhXlD7MDU8CptXXdQ==)
38. [greatersandhillsfamilyhealthcare.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEF-XzylFMbXbhrixLnoEygLgW2x_kUD9T7ZrSnntwLBWdLZw67xg1reWlnN14uheYs_gswICg20Dj7SKovmAD8YygPgC98cC8MpLbH8REzGNhQ9OEr32WAj3tl5bR14o2yqNfQ2aM5Wl0ZhUCcksmmTdLn)
39. [m5stack.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHMy9F70Cv7gNgjcMgyb3xDsgIVprMX4d-HZhRyphXvpt2TOl1de_1sEn9_MeCQb93LHz452BBB24HIzigCulVKySwjUc5heqVrv5RQzo05nP4oQBS8cty2F3UjJPHZAqtoC2HfYTiypWLnnCXww4JP398qh57V8zaOPHkSqw==)
40. [kakaku.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHyTKnSfL-OtcbTkKqTrPojO8PPNFJ2envKpNGWGIhZZYA64RLGbyWelk8iRmug-zky5BddRVrrGuYi77NbfY_8od0UhI0Zt_L6ZAViJl_y6mQ5K6H1Vm3tMjIRUnq51026nHCsth6lpGvitonn2Y88yBzPnQ==)
41. [codezine.jp](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGuAhPWWAinOWHWQRH-VbfAvw5ZspoXKS1KsBSCkzJcn-yd7uRcmtT6FfScnc6-OZfi1cbJ7biekzV2etbxkMi_rXLkC8QiOXIX9n3F0G0CgX6I1lOnswUBuiaYDs2B)
42. [calamartajafre.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEQEDfWg0QB7_pSiooW4MRoGCmD0fsvRq8EGBEgNHue_kwtZeNYp_1Myf0QL21LcKacTSCINubUB0k3pjyu74RfiebkadzRb7AdBT48rS-z7WGqEe5jYbI24aZSjSQqQOnGCvorB5tEgfEgdQBgX1NRgIUMvjmK4Q==)
43. [reddit.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHIOl5ofGGndB2z5RG0qr_LxcylA7ICgoPZ8coBc1U8la_WmSHgto3Sz3rgHk45Pk_4yYcpV4AjDvZQlqU9OZCR2qj_g56j3d-KP0ZD7M0Gvkuqg7Xi_pbtOAiD08RTF4vlRDvcX9_h236fIEHo4Zx4Q9eGtBuUeLamQEUCTEaJ0BDEtUu6BwKmNnTnp7XNLV3G3K3hg96hSg==)
44. [sunfounder.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGE8utDgBEQHqGAMxGdkJYhPV02dKCh9dA79oPBzwUeM5RRREQVTEMsYCcAHrpFaFuJgdT9keGoo_KqoIPP4ahxWdlQUJXFHLz0KHZeM5eHscRUwxOVncMpIny623Eek9GTxEG9Czf2sS2heNBuA8EKsvk3lUWwcAiEoNSy_gxStt2VLq9ZQSENExX4BIJvniSbQ9PD_T-lNbkIZNmvS1uH)
45. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGVWbNzMsv0C6_RucQA19_H1qfj-2xlVTp-eIkfDoqWaACfBBMTuweIRLJWn3cNJHyr_fGKjJg7Bc43iNfzHCGP-iC3JnmIk6vHKdEOxjbtkRJVKCtKGG4PgP04hdWR8PZe5ovGMvv5m3SkLpSq18biFVQ9waeNahgbO09xr8Q-TQtpoLPb4S_msTDQ0RILeUpmpxVTv_IiLBwpuJU=)
46. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEN6twGE5PTDTDU0dnoJ3TH7qTzGJZZbMO-iFTfwM793Fs5i28Xy-27425cEncFvBZxJTnt-hbjYuIGdrrsDBIDFaSnQS8tmoTRCuZGywXmGeXT-HdRSkgD_xr0w9mD8EIQgwAHR6lAGAeiKLXDSBXZJ7HYR8pFi1c9f9FXwwmviaDI0_khXx-rRQ==)
47. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHy92Nwz7GCRDHOygpQiv-6cIqp1x7VA312TQp9sJNgJ1iyTD6rKT7Y29gCu4B89MYDmixv-XSOmquRyYN0MhvcpXCyKBCQQbjo_Q6d2Y-S5uKfhZIiI-9f12-I5oqbtCuKFGHYktNYyD_oxVnqM2k-mQRgg2pSXHqJLeJIn_ZG5jGsRqkTt4NI32iP7YGTTGal69uiRDMUCqKH5pYEYD4WoeqTGLpDXbmf9l_z-qX7PaHeVoxt)
48. [luisllamas.es](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFQAYb8JIyW3t3SpBUxfQ5X6Wol8E_M8T9hU7h4VOz4ekBmS6zFflWvHR7awoXwiI5R-OAFedzlSIJbCEK7txmQsrQiqTTqWhoSlT_MWKTZh1kL10ipTAi7VnyYUHWM6DDFDlopcMAKXg4jwA==)
49. [home-assistant.io](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGJbUbvZrIZaQYWYXeGiA45H8vm1UHe9MFMP83-4Zhr6Vp9PSzoq9kGl32CBs7VWfOVZi1ncL9HHPqXu9jjQsRYiU1Eki0HQZCAkTLcr2NlS5xUNKW6AlGshYMf5ptwUJjv-TCyBJnYmb4nQckAPPo5hpJ-UYTwUxOtF_uDLbFOLwAn0TSKIJXh-tJ2OMy1P7qkQWA=)
50. [reddit.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHWABaVTxzqnGn3tzs7FmKqSTIv-Zlkv1JcoVRkRh1zIKEV4tQ0PSne_IjTylklkRb609aOmCBPGrLjP6HFqSfOqElsBz8dheqKbyeZ8d_mIYE9Pe2oyHu8ZCU29cMQBANaHFAX6QcbGdlO9GDo-hdFbSdMkJ3ry7I6HtO2oWFw7iVhfWxXGoDgMm0hnWuusP1A9InEoIErSWEx0mAX)
51. [pc1.co.jp](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFZ7ud3W7IgI-IizJwfM6SpzMRWzHeneziG2YiG7mqJudAGWnFX7NpVBZBuspNKN043zU5SvSOeFqxkxNhHQ_WHhQKN-jS2ag74Odc2n1v9SYm-DP3aRO3wr5KUQ8QiCY_IVyH77Buw_U3MRtcm_8dCFHaEZD0a430SKqyWX0NUqH6EWOJuiBym6voAf5adJBeHtywwQ7iW6Lt7La0n7CxTSXmo2tMAutbhfvQtm6RSlk_qBshVVI-ZsDkPZ6Qk-qrMWBLkzQ==)
52. [esphome.io](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF96aNuPzYlCQvVMEskA9NzniGfDriJsWmYRfkiljCTmLHt7zMjmNl7Rosp-Obga1Fca1wP_rGQBeh6d0yN5SP3hij9QOvVuENavExtMvRlwuTWquBqCmCF2eA=)
53. [randomnerdtutorials.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHVwki1oFog-1_qVkaziBj-F-s-xxa-H61BDw1QwmNALMJqhSL0pQgAMYgvO-piLuWVMyh21_R8BfXKvPP5LV1H0LHEcNjqCnmpo4efHv5EeuHb2a3kXKkNXDe6ick-lSC1FrAo2x7GJoKWOvO6dq8ITTsZTQ==)
54. [luisllamas.es](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGcOLPM8GpMLxfEzEIVsb_3OE6LewckBEPIubVj3Td1gYIt2fd79IosgfkztYJyMnHZSTJk6bpclZVoLPwch40kVf3PTcaxdQgoFMcngDgWWH5egwJjn05s3ZBdlDHUpj2vErh5W4IlULrcZZVAufysI8f1MA==)
55. [randomnerdtutorials.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHrTPiD1QyMADuLWnI9Untp7JwbzBJSbMWA-32jcMZFN88L3Sv2ONqePuLtRDIMN-1HsmJTk_2TsyttO53RbOXnfbpGf3V0t-odNCN4qCIDm4SJ4pBqLlnxqRwjW0B_Y4YsSBUf_UiKiD9EeqcxBpvWtyyX)
56. [core-electronics.com.au](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFLTFu2GGLjQAWuTfHxzGu4TgzqX9Nb6CvRuY6HcQC7wHR35ViEVYt9Q2ci_TU6vlQqAfwWUh90cKSYOrrxr04FxL2eHRCLC65jEhNBl7O0aiOkpAWbV71h4bhEWmQdnKtTb2YDr8KPjohD3W2yu-uGt0x-0RoySL3Q87Uf_aToQlP4OD4l3LhhH65Wiw==)
57. [waveshare.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEEIJ9bu7JLwdSes9jzQWADaOemQ1yWaftTGEGJF-OfJZRX6uGneEjIrCvJIfEHbvx8cbU2V5_LIq17JvHfF_1AuYMc1VQ0725KS905tjZTcJ7vklC_wc_4GcMOAU_hi7JVeOqJf-AyAJRlSlPM3V0ap7EYEk_vXj5x1LDUiewq)
58. [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGXiBPXiofhRTaXU0mlvv6NXGwpNnPMP2za_htP_p4dsYOf1oyem3MMWyISU3iDCU-mq9M5S6qP7WUyjxum-TsOjuhEGt4et1brW53HzG6kqqPYt95Oh2G9tTC9cVQASqxZ6E3X39WbKg8LBHKusUTOeGoy-KC4lt4PFLnsGhke3pFiJHW2h2tiyqNo)
59. [projectech.in](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHyZ2o_vXW4OKr4Inf6aLSuuloq8XWsSc87l5-pRegbcmDO8JYxZgTukEgaRtFPafrzWivtG6xrQOa-vSgOTNzC2mHc68aK-BKjR2E9MeKwU3Mfz3teiAtwS3-WZAbzm7V8DP1Y9vpNembjxOMZB-HdPwPlKBc=)
60. [luisllamas.es](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEmE79SxkaVhkAf4cYJyxIovpb-vE-kI6JoMIU_p4g5pYp1Qj7LbxgDf6cLk8F3xTISiJ9jemkgf2FcUJgcIiXDc9WqPbG8cNXRdBZEuoE_QR5oAtK-8QJ7c8MhNN91OBDmOlP-rGN5Ih78XA==)
61. [reddit.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFfiks26TbNaG3hgZQbS_fNvlM8qEU8DPS89MbgZiBb-jpWw5XkDPB7HKDvD539S4AKg_a0_N54ja6lbq2WNx-Z_yYjhRieMPQEqbrjcqXLsJb2di1bJ8fhhzUEOz-qlQX0e0ScvthTJ_uD0aMnzcq2lJ4zzGx8VXNZWrWA2H264v2XSFbEuUCpLKGEq3_LzwEngISaEN8nOXFU4qZARQ==)
62. [randomnerdtutorials.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEooIrPEumXWzqagJluuvToX4GEo3ynUVuvtc6PIx4LDwZd8aGRclwic3yacbmBNLGssADxvK_APxMEHUX1S8vEfdmSZqFNAavkSP0cewqA3UBbiU5XRNe3kmkoAhSAiyMtMgvT3V1hlIj80vRYoIKNT3Zn2uX2Mmoyt8qSbMAEUq4-qg==)
63. [esp32.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEZab7wEQ1915_wcS3ga_GswdZRp32DtY_DYRtqQajTEN9f5SWljgcPXviNLvf3PQ186ycT_d7ysGghfiG5I6bVyQoLXX5r0Abt3YduQijmBy2OJtJ0la9fbd2RTwE=)
64. [pixelroot32.org](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFo3YX2lWpstiWcexvw0XIgym1k90e_4TttUWPkxyP2_1-UQCzFj9i_nBxyh9SARgyjp1SBqgxKpyLMPCym-XA4nxy3yN27Vj8hm0DOnbWI0mVHw4CdyHVwMr9_Jw3_WInrnKX0Zyg4w0KUSiGS_xI=)
65. [wordpress.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGqR6YJRiQ-o41LZpnh7JBmwTmo07afUu16O9G7eDab-ofR-tSJSNc27BD6zBu8pV1CUrof-R_4O9L2b4aR3ClrouMcRCwIh6tfuofyivqIddDQcxX8Q_g9ITjlPg==)
