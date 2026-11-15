# ESP32-S3 仕様情報のウェブページ監査および技術的詳細に関する包括的調査報告

## 1. 監査の背景と主題の定義

近年、AIoT（AI × IoT）市場の急速な拡大に伴い、エッジデバイスにおける処理能力と通信機能の統合が極めて重要視されている。その中で、Espressif Systems社が開発した「ESP32-S3」は、強力なニューラルネットワークアクセラレーション機能と豊富なペリフェラルを備えた次世代SoC（System on a Chip）として、産業用機器からホビー用途まで絶大な支持を集めている[cite: 1]。エッジでの機械学習（TinyML）、スマートディスプレイ、AI玩具、音声認識デバイスなど、ローカルで完結する高度な処理が求められる領域において、ESP32-S3は事実上の業界標準となりつつある[cite: 2, 3]。

しかしながら、インターネット上の技術ブログ、開発者フォーラム（Reddit、Espressif公式フォーラム）、コードホスティングサイト（GitHub）、および開発ボード販売サイトの情報を網羅的に監査した結果、ESP32-S3の仕様に関して重大な誤解や不正確な情報が蔓延していることが判明した[cite: 4, 5, 6]。特に、初代ESP32（ESP32-WROOM-32など）との後方互換性に関する「開発者の暗黙の思い込み」や、SoC単体の「データシート・スペック」と開発ボード実装時の「システム・スペック」の混同が、プロジェクトの遅延や致命的な設計ミスを引き起こす根本原因となっている[cite: 4, 7, 8]。

本報告書は、公式データシート（英語版 v2.2 および v1.6等）と、流通している多数のウェブページにおける記載内容を厳密に比較・監査し、ESP32-S3の真の技術仕様を解き明かすとともに、開発コミュニティが陥りやすい技術的トラップを浮き彫りにするものである。

## 2. マイクロコントローラ・ファミリーにおけるESP32-S3の測位

ESP32-S3のアーキテクチャを正確に理解するためには、Espressif社が展開する広範なマイクロコントローラ・ポートフォリオの中での位置づけを明確にする必要がある。ウェブ上の比較記事では、用途に応じたチップの選定基準が多数議論されており、単なるクロック周波数の比較ではなく、統合されている命令セットや無線プロトコルの違いがプロジェクトの成否を分けることが示唆されている[cite: 5, 9, 10]。

| SoCシリーズ | CPUコアアーキテクチャ | 動作周波数 (最大) | 無線規格 (Wi-Fi / Bluetooth / その他) | 主な特徴とターゲット用途 |
| :--- | :--- | :--- | :--- | :--- |
| **ESP32 (初代)** | Xtensa LX6 デュアル/シングル | 240 MHz | Wi-Fi 4 / BT 4.2 Classic + BLE | 汎用IoT、レガシーBluetoothオーディオ[cite: 9, 11] |
| **ESP32-S2** | Xtensa LX7 シングル | 240 MHz | Wi-Fi 4 / なし | USB OTG搭載、Bluetooth非搭載のセキュアIoT[cite: 9, 10, 11] |
| **ESP32-S3** | Xtensa LX7 デュアル | 240 MHz | Wi-Fi 4 / BLE 5.0 | AI/ML拡張命令、USB OTG、高度なHMI・画像・音声処理[cite: 1, 9, 11] |
| **ESP32-C3 / C2** | RISC-V 32-bit シングル | 160 / 120 MHz | Wi-Fi 4 / BLE 5.0 | 低コスト・低消費電力、シンプルなセンサーノード[cite: 9, 12, 13] |
| **ESP32-C6 / C61**| RISC-V 32-bit シングル | 160 MHz | Wi-Fi 6 (2.4GHz) / BLE 5.3 / Thread, Zigbee | Wi-Fi 6対応、Matter/スマートホームハブ[cite: 9, 11, 13, 14] |
| **ESP32-C5** | RISC-V 32-bit デュアル | 240 MHz | Wi-Fi 6 (2.4 & 5GHz) / BLE 5.0 / Thread, Zigbee| 5GHz帯対応による混雑回避と高速通信[cite: 5, 9, 13] |
| **ESP32-H2** | RISC-V 32-bit シングル | 96 MHz | なし / BLE 5.3 / Thread, Zigbee | Wi-Fi非搭載、超低消費電力メッシュネットワーク専用[cite: 9, 10, 11, 13] |
| **ESP32-P4** | RISC-V 32-bit デュアル | 400 MHz | 無線機能なし | H.264エンコード、MIPI CSI/DSI、ハイエンド画像処理専用[cite: 9, 10, 11] |

上記ポートフォリオの比較から明らかなように、ESP32-S3は「演算性能・マルチメディア処理・AI推論」というエッジコンピューティングの要件に極めて特化した設計思想を持っている[cite: 2, 9]。一方で、最新のWi-Fi 6（802.11ax）やIEEE 802.15.4（Thread/Zigbee）が必要なスマートホーム環境（Matter規格等）においてはESP32-C6やH2に道を譲り、純粋なプロセッサ性能やカメラ入力（MIPIインターフェース）が要求される環境においては無線機能を持たないESP32-P4が上位互換となる[cite: 9, 10]。これらの用途の違いを無視して「単なるESP32の新しいバージョン」としてS3を選定すると、後述する通信プロトコルのミスマッチなどの問題に直面することになる。

## 3. コアプロセッサとメモリ・アーキテクチャの監査

### 3.1 Xtensa LX7プロセッサとAI拡張命令（PIE）の実態
ESP32-S3は、低消費電力のXtensa 32-bit LX7 デュアルコアマイクロプロセッサを搭載している[cite: 14, 15]。このプロセッサは最大240MHzのクロック周波数をサポートし、5段パイプラインアーキテクチャ、高いコード密度を提供する16ビット/24ビット命令セット、そして128ビットデータバスを備えている[cite: 16, 17]。さらに、単精度浮動小数点ユニット（FPU）と、32ビット乗算器・除算器をハードウェアレベルで内蔵している[cite: 3, 17]。

ウェブ上の比較記事の中には、クロック周波数（240MHz）が初代ESP32と同一であることから「処理性能に大きな進化はない」と短絡的に結論づけるものが散見されるが、これはアーキテクチャの根本的な進化を見落とした不正確な評価である[cite: 18, 19]。ESP32-S3の最大の技術的飛躍は、ニューラルネットワークの計算や信号処理を高速化するための「プロセッサ命令拡張（PIE: Processor Instruction Extensions）」、すなわちベクトル命令（SIMD: Single Instruction, Multiple Data）が追加されている点にある[cite: 1, 17]。

開発者は、ESP-DSPやESP-NNライブラリを通じてこれらのベクトル命令を直接活用することができる[cite: 1]。このハードウェアアクセラレーションにより、エッジデバイス上での高性能な画像認識、音声のウェイクワード検出、ノイズリダクションといったタスクが、専用のAIチップ（NPU等）を外付けすることなく、SoC単体でリアルタイムに実行可能となった[cite: 1, 2]。スマートスピーカーやAI玩具など、マルチタスク（クラウド通信、音声処理、LED制御、ディスプレイ描画）を同時に処理する必要があるデバイスにおいて、ESP32-S3が極めて高い人気を誇る理由はここにある[cite: 2, 20]。

### 3.2 SRAM容量に関する「520KB vs 512KB」の誤解と真実
メモリ仕様に関するウェブ監査において、M5Stackや各種開発ボードのユーザー間で最も頻繁に観察された誤解の一つが「内蔵SRAMのダウングレード説」である。初代ESP32の内蔵SRAMが520KBであったのに対し、ESP32-S3のデータシート上のSRAM容量は512KB（RTC内の16KBを除く）と記載されている[cite: 12, 17, 21]。この単純な数値比較から、「後継機であるにもかかわらずSRAM容量が減少している」と疑問を呈し、性能の劣化を懸念するブログ記事が複数存在する[cite: 21]。

しかし、コンピュータ・アーキテクチャの観点から言えば、ESP32-S3のメモリ管理システムは初代から劇的に洗練されている[cite: 19]。初代ESP32の場合、SRAMの一部が外部メモリ用のキャッシュとして固定的に占有されていた[cite: 21]。対してESP32-S3は、ユーザー定義のデータキャッシュおよび命令キャッシュの柔軟な構成が可能であり、メモリ管理の改善により、動的に確保できるヒープ領域の実効サイズはむしろ増加するケースが多い[cite: 1, 19, 21]。実証コードを用いた検証記事においても、フラグメンテーションを加味して実際に確保できたメモリの最大容量および合計容量の両方で、ESP32-S3が初代ESP32を上回るという結果が報告されている[cite: 21]。

### 3.3 外部フラッシュとPSRAMの拡張性（Octal SPIの恩恵）
ESP32-S3アーキテクチャの真の強みは、内蔵SRAMの容量ではなく、外部メモリ（フラッシュおよびPSRAM）への広帯域アクセス能力にある。チップは高速なOctal SPI（8ビット幅データバス）、Quad SPI、OPIモードをサポートしており、これによって巨大なデータを要求するグラフィック表示（LCD制御）やオーディオバッファリングがボトルネックなしに実行される[cite: 1, 17, 20, 22]。

Espressif社は、チップ単体のみならず、メモリをSiP（System in Package）として封入した多数のバリアントを提供している。監査の結果、開発者はパッケージの命名規則から搭載メモリの仕様を正確に読み取る必要があることが確認された[cite: 15]。

| バリアント / モジュール名 | 内蔵Flash容量 | 内蔵PSRAM容量 | 特記事項 |
| :--- | :--- | :--- | :--- |
| **ESP32-S3** | なし | なし | 外部メモリが必須の基本SoC[cite: 15] |
| **ESP32-S3FN8** | 8 MB (Quad SPI) | なし | エントリー向けのフラッシュ内蔵型[cite: 15] |
| **ESP32-S3R8** | なし | 8 MB (Octal SPI) | 高速PSRAMを内蔵、別途外部フラッシュが必要[cite: 15] |
| **ESP32-S3R16V** | なし | 16 MB (Octal SPI) | 大容量16MB PSRAM (3.3V駆動) を内蔵[cite: 15] |
| **ESP32-S3-WROOM-1** | 4/8/16 MB | 0/2/8 MB | PCBアンテナを備えた最も一般的な汎用モジュール[cite: 11, 12, 23] |
| **ESP32-S3-WROOM-2** | 16/32 MB | 8/16 MB | 大容量メモリ搭載モジュール。ECC有効化により上限温度が85℃に向上（ただしPSRAMの利用可能サイズは1/16減少）[cite: 20] |

AIモデルのパラメータ保持や高解像度ディスプレイのフレームバッファとして、大容量のPSRAM（例えば16MB）は極めて重要である[cite: 2, 5]。しかし、これらの大容量メモリをOctal SPIで駆動する場合、後述するように特定のGPIOピンが内部バスとして占有されるため、ハードウェア設計において重大なトレードオフが発生することを忘れてはならない。

## 4. 無線通信モジュール仕様と通信プロトコルの監査

### 4.1 Bluetooth Classic廃止に伴うコミュニティの混乱と絶望
ウェブ上の開発者コミュニティ（GitHubのIssueトラッカーやReddit等）を監査した結果、ESP32-S3の仕様に関して最も深刻なトラブルとフラストレーションを引き起こしているのが「Bluetoothモジュールの仕様変更」である。

初代ESP32は、Bluetooth v4.2 BR/EDR（Bluetooth Classic）とBluetooth Low Energy（BLE）の両方に対応するデュアルモードチップであった[cite: 10, 11]。これにより、開発者はA2DP（Advanced Audio Distribution Profile）やSPP（Serial Port Profile）を利用したレガシーなBluetoothオーディオストリーミング機器（自作のBluetoothスピーカーやヘッドホン）、あるいは旧型のゲームコントローラー（PS4コントローラー等）との接続を極めて容易に実装することができた[cite: 6, 10, 24]。

しかし、ESP32-S3のデータシートには明確に「Bluetooth 5 (LE) および Bluetooth Meshに対応」と記載されており、**Bluetooth Classicはハードウェアレベルで完全に排除（非対応）**されている[cite: 1, 12, 17]。ウェブ監査では、ESP32-S3を「単なる上位互換の後継機」として購入し、「A2DPによるオーディオストリーミングが機能しない」「Arduino IDEでコンパイル時に `#error Serial Bluetooth not available or not enabled. It is only available for the ESP32 chip.` というエラーが出てビルドが通らない」と訴える開発者の声が世界中で多数確認された[cite: 6, 24, 25]。

一部の開発者は「ESP32-S3はBluetooth Classicをサポートしていないとドキュメントにあるが、一部のライブラリを使えばA2DPが使えるはずだ」と誤った認識をGitHub上で主張し、混乱を助長している[cite: 26]。技術的なメカニズムとして、A2DPはBluetooth Classic専用のプロファイルであり、BLE専用の物理層（PHY）およびリンク層しか持たないESP32-S3では、ソフトウェアによるハックで実装することは物理的に不可能である[cite: 6, 24]。

Bluetooth 5.2以降で導入された次世代規格「LE Audio」が普及すれば、BLE経由での高音質オーディオストリーミングが可能になるが、現状ではプロファイルスタックの実装や対応デバイスが市場に十分に出回っていない[cite: 6]。したがって、レガシーなBluetooth通信（A2DPやSPP）を前提とするオーディオ系プロジェクトやシリアル通信機器においては、ESP32-S3を採用してはならず、初代ESP32を引き続き採用するか、外付けのBluetooth Classicモジュールを併用する必要があるという冷酷な事実が、多くのハードウェア選定ガイドで十分に強調されていない[cite: 12]。

### 4.2 Wi-Fi機能とLong Rangeモード（長距離通信）の可能性
Wi-Fi機能に関しては、初代ESP32と同様に2.4GHz帯のIEEE 802.11 b/g/n（Wi-Fi 4）をサポートしており、20MHzおよび40MHzの帯域幅、データレートは最大150Mbps（1T1Rモード）に対応している[cite: 1, 17, 27]。また、TX/RX A-MPDU、A-MSDUのフレーム集約機能など、スループットを向上させるためのMAC層の最適化が施されている[cite: 17, 27]。

ESP32-C6やC5といった最新シリーズがWi-Fi 6（802.11ax）や5GHz帯に対応している中、ESP32-S3が2.4GHz帯のWi-Fi 4に留まっている点は、高密度なIoT環境における用途選定の重要な指標となる[cite: 5, 10, 14]。通信の安定性や混雑回避を最優先する産業用ゲートウェイなどの場合、Wi-Fi 6対応チップのほうが有利に働くケースが存在する。

しかし、ESP32-S3はBluetooth 5 (LE)サブシステムにおいて、最大20dBmの高出力送信モードと、125 Kbpsの「Coded PHY（エラー訂正符号付き物理層）」、およびブロードキャスト拡張をサポートしている[cite: 1, 17]。このCoded PHYはBluetoothの長距離通信（Long Rangeモード）を実現する中核技術であり、優れたRF性能と組み合わせることで、見通し環境下で数百メートルからキロメートル級の通信を確立できるポテンシャルを持つ。スマート農業における農地へのセンサーばら撒きや、広大な工場内のビーコン配置など、メッシュネットワーク（Bluetooth Mesh）と組み合わせた広域・低速度のデータ収集インフラの構築において、極めて強力な基盤となる[cite: 1, 17, 28]。

## 5. GPIOとペリフェラル・インターフェースの実装における複雑性

### 5.1 GPIO総数「45ピン」の理想と実利用可能ピンの現実
公式データシート上、ESP32-S3は最大45本のプログラマブルな物理GPIOピン（GPIO0〜GPIO21、GPIO26〜GPIO48）を備えている[cite: 1, 12, 17, 29]。これらはIO MUXおよびGPIOマトリックスを介して、UART、SPI、I2C、I2S、PWM、ADCなどの任意のペリフェラル入力・出力信号を柔軟にルーティング可能である[cite: 16, 29]。

しかし、開発ボードの販売サイト（秋月電子通商など）における仕様欄では、「GPIO: 36」と記載されているケースが見受けられる[cite: 30]。これは誤記ではなく、物理的な引き出しの限界と、システム上の安全性を考慮した実用的な数値である。ウェブ上の技術ブログや基板設計フォーラムの監査から、GPIOの割り当てに関する以下の重大な制限事項が特定された。データシートの「45本」という数字を鵜呑みにしてフルスクラッチで基板を起こすと、不可解な再起動や動作不良に悩まされることになる。

1.  **Octal SPI（フラッシュ/PSRAM）による占有の罠:**
    ESP32-S3-WROOM-1-N16R8のような大容量メモリを内蔵するモジュールを使用する場合、チップ内部でフラッシュメモリおよびPSRAMとの通信にOctal SPI（8ビットデータバス）が使用される。このモードでは、Quad SPI（4ビット）で使用されるピンに加え、**GPIO33、34、35、36、37**が内部の高速メモリバスとして恒久的に占有される[cite: 22, 31]。これらのピンを外部のセンサー入力やLED制御などI/Oとして配線してしまうと、メモリへのアクセスが衝突し、システムが即座にクラッシュするか、起動すら不可能となる[cite: 22, 31]。
2.  **ストラップピン（Strapping Pins）の制約:**
    **GPIO0、GPIO3、GPIO45、GPIO46**の4本は、チップのブートモード（通常起動、シリアルダウンロードモード、USBダウンロードモード等）を決定する極めて重要なストラップピンとして機能する[cite: 17, 22, 32]。システムの電源投入時またはリセット時、チップ内部のラッチ回路がこれらのピンの電圧レベル（HIGH/LOW）をサンプリングする[cite: 16, 32]。例えば、GPIO0がLOWにプルダウンされた状態で起動すると書き込み待機状態（ダウンロードモード）に入ってしまう[cite: 32]。そのため、これらのピンに起動時の電位を不安定にするような外部回路（コンデンサや特定状態のプルアップ/ダウン抵抗）を接続することは厳禁である[cite: 22, 31]。
3.  **USB専用ピンとデフォルトのシリアルピン:**
    **GPIO19、GPIO20**は、デフォルトで内部のUSBシリアル/JTAGコントローラのD-およびD+ラインに割り当てられている[cite: 22]。レジスタとeFuseの設定を変更してこの機能を無効化しない限り、汎用GPIOとして使用することは推奨されない[cite: 16, 22]。また、UART0（ログ出力用）として**GPIO43、44**が予約されているため、開発中のデバッグを考慮するとこれらのピンも事実上使用不可となる[cite: 22]。

さらに、アナログペリフェラルとして2系統の12ビットSAR ADC（最大20チャンネル）、温度センサー、14チャンネルの静電容量式タッチセンサーを備えているが[cite: 16, 17]、一部のデータシート（Heltec製モジュールの中国語データシート等）には「ESP32-S3のタッチセンサーは現在、無線周波数イミュニティテスト（CS）の認証を通過できず、アプリケーションシナリオに制限がある」との注記があり、強い電磁ノイズ環境下でのタッチセンサーの実用性には技術的な課題が残されていることが示唆されている[cite: 3]。また、ADCを使用する際やWi-Fi/Bluetoothをスリープモードで運用する際は、GPIO36およびGPIO39の割り込みを使用しないようESP-IDFの公式ドキュメントで警告されているなど[cite: 29]、ペリフェラルの併用には高度な排他制御の知識が求められる。

実用上、開発者が全くの無制約で自由に利用できるGPIOは30本前後であるという技術的実態を、アーキテクトは設計の初期段階で認識しなければならない。



### 5.2 ネイティブUSBとUSB Serial/JTAGの機能的差異と市場の反応
ESP32-S3のペリフェラルにおける最大の目玉の一つが、USBポートの標準搭載である[cite: 10, 11, 32]。しかし、ウェブ上の技術記事や初心者の質問において、チップが提供する2つの異なるUSB機能（「USB OTG」と「USB Serial/JTAG」）がしばしば混同され、用途を誤ったボード選定が行われているケースが散見される[cite: 5]。

*   **USB Serial/JTAGコントローラ:** この機能は主に開発時のプログラムの書き込み（フラッシング）や、JTAGプロトコルを介したハードウェアデバッグのために提供される専用回路である[cite: 15, 16, 17]。これにより、旧来の開発ボードに必須であったシリアル変換IC（CP2102やCH343など）を基板上に実装しなくても、PCから直接コードを書き込むことが可能となり、BOMコストと実装面積の削減に大きく寄与する[cite: 32]。しかし、これは汎用的なUSB通信を行うためのものではない。
*   **USB OTG (On-The-Go):** ESP32-S3自身がUSBホスト、あるいはUSBデバイスとして振る舞うことを可能にするフルスピード（12 Mbps）のUSBインターフェースである[cite: 9, 10, 17]。これにより、ESP32-S3をPCに接続して自作のUSBマウス、キーボード、MIDIコントローラーといったHIDデバイスとして認識させたり、逆にUSBカメラやUSBメモリなどの外部USBデバイスをESP32-S3に接続（ホスト動作）して制御することが可能になる[cite: 5, 10]。

一部の先鋭的な開発ボード販売サイト（スイッチサイエンスや創作品モールあるる等で販売されているkohacraft製のESP32-S3開発ボード）では、この2系統のUSBインターフェースを物理的に2つの別々のUSB Type-Cポートとして基板上に引き出している[cite: 33, 34, 35]。一方はデバッグとシリアルモニタリング用（USB Serial/JTAG）、もう一方はアプリケーションのネイティブUSB通信用（USB OTG）として使い分けることで、「デバッグ情報をシリアルで確認しながら、USB HID機器としての動作をプログラミングする」という、通常では困難な並行開発プロセスを極めてスムーズに実現している[cite: 33, 34]。このような意図的なハードウェア設計は、ESP32-S3のデュアルUSB機能を完璧に理解し、現場の開発者のペインポイントを解消したベストプラクティスと言える。

## 6. 電源管理とDeep-sleep消費電流における圧倒的乖離の監査

### 6.1 カタログスペック「7µA」と実測値「15mA」のパラドックス
IoTセンサーノードやウェアラブルデバイスなど、バッテリー（リチウムイオン電池やコイン電池）で長期間駆動させるアプリケーションにおいて、スリープ時の消費電力は製品寿命を決定づける最重要パラメータである。Espressifの公式データシート（セクション 4.1.3.5 PMU等）によれば、ESP32-S3は極めて精緻な電力制御機構（Power Management Unit）を備えており、Deep-sleepモードにおける消費電流は驚異的な約 $7~\mu A$ であると明記されている[cite: 4, 17]。このモードではメインCPU（Xtensa LX7）や大部分のSRAM、Wi-Fi/Bluetoothベースバンドは完全に電源が切断され、RTCコントローラとRTCメモリのみが通電状態を維持する[cite: 4, 17, 36]。さらに、RTCすら停止させたハードウェアレベルの完全なスリープ状態では約 $1~\mu A$ まで低下する[cite: 4]。

しかし、Deep-sleepに関するウェブ上の技術記事やフォーラムを監査すると、「スケッチでDeep-sleepを呼び出しても、マルチメーターで計測すると数mAから数十mAの電流が流れ続けており、バッテリーが数日で枯渇する」という阿鼻叫喚の報告が後を絶たない[cite: 4, 7, 37, 38]。このデータシートと現実の圧倒的なギャップは、ESP32-S3チップ自体の虚偽や欠陥ではなく、開発者が使用している「開発ボードを構成する周辺回路（BOM）」の物理的特性に起因する。

### 6.2 開発ボードにおける寄生電流の正体
ウェブ上のプロフェッショナルなエンジニアリングブログ（Codesprint ConsultingやQoitech等の電流測定レポート）によるオシロスコープや精密マルチメーターを用いた実測データの解析から、ESP32-S3-DevKitC等の標準的な開発ボードにおける消費電力増大の主たる原因が以下の3つのコンポーネントにあることが明確に証明されている[cite: 4, 7, 39]。

| 電力浪費の原因となるコンポーネント | 消費電流の目安 (スリープ時) | メカニズムと技術的背景 |
| :--- | :--- | :--- |
| **LDO（低損失レギュレータ）** | 3 〜 5 mA | USBの5VからESP32-S3が必要とする3.3Vを生成する降圧回路（AMS1117等）。安価なLDOは、負荷がゼロであっても自身の動作を維持するために大きな無効電流（Quiescent Current）を常時消費する[cite: 4]。 |
| **USB-UARTブリッジIC** | 2 〜 5 mA | PCとの通信用シリアル変換チップ（CP2102NやCH340/343等）。USBケーブルが抜かれてPCと通信していない状態でも、基板の3.3V電源レールから通電されている限り、アイドル電流を消費し続ける[cite: 4, 28, 40]。 |
| **電源インジケータLED** | 2 〜 3 mA | 基板に通電されていることを示すためのLED。抵抗を介して3.3VとGNDに直結されているため、バッテリー駆動中もオームの法則に従い物理的に電流を垂れ流す[cite: 4]。 |

すなわち、SoC内部のESP32-S3チップ単体は仕様通り $7~\mu A$ で深く眠っていても、基板上の周囲の部品が合計 $10 \sim 15~\text{mA}$ （$7~\mu A$の約2,000倍）もの電力を浪費しているのが開発ボードの実態である[cite: 4, 37]。バッテリーで数ヶ月から年単位の駆動を目指す製品を設計する場合、標準的な開発ボードをそのまま筐体に組み込むことは素人のアプローチであり、絶対に避けるべきである。解決策としては、ESP32-S3のネイティブUSB（USB Serial/JTAG）を活用してUARTチップを基板上から完全に排除し、超低自己消費電流（1µA以下）を誇るLDO（HT7333やXC6220など）を選定し、不要なLEDを排除した専用のカスタムPCBを設計することが必須要件となる。

一方で、モジュール販売市場においてもこの問題への対応は進んでいる。Seeed Studio製の「XIAO ESP32S3」のような一部の超小型モジュールは、販売元の公称値としてDeep-sleep時消費電流「約 $14~\mu A$」を謳っている[cite: 23, 36]。これは、部品点数を極限まで減らし、電力管理に最適化された電源回路設計を採用しているためであり、市販のモジュール間であっても電源設計の思想によって消費電力に雲泥の差があることが分かる。

### 6.3 ULP（超低消費電力）コプロセッサの高度なアーキテクチャ
ESP32-S3の低消費電力戦略を根底から支え、さらにインテリジェントな動作を可能にするのが、ULP（Ultra-Low-Power）コプロセッサの搭載である[cite: 1, 3, 15, 17]。システム全体をDeep-sleepモードに移行させ、メインのXtensaデュアルコアやWi-Fiモジュールの電源を遮断している間でも、RTC電源ドメインに属するULPコプロセッサは独立して稼働を続けることができる[cite: 16, 17]。

ESP32-S3には、特徴的な2種類のULPコプロセッサがシリコンレベルで内蔵されており、開発者は用途に応じてどちらか一方を選択して使用する（同時稼働は不可）[cite: 16, 17]。

1.  **ULP-RISC-V コプロセッサ:** RV32IMC命令セットアーキテクチャに基づく本格的な32ビットコプロセッサである。32個の汎用レジスタを持ち、ハードウェアによる乗算器と除算器を備えているため、単なるセンサー値の読み取りを超えた、ある程度の複雑なデータ前処理や割り込み制御が可能である[cite: 16, 17]。
2.  **ULP-FSM（有限状態機械）コプロセッサ:** 算術演算、ジャンプ、およびプログラム制御命令を含むシンプルな命令セットで構成されたステートマシンベースのプロセッサである。I2C通信によるセンサーの定期的なポーリングなど、極めて定型的なタスクを限界まで低い電力で実行するよう設計されている[cite: 16, 17]。

これにより、例えば「ディープスリープ状態でULP-FSMが1秒に1回ADC（アナログ-デジタル変換器）を読み取り、測定された電圧値が特定のしきい値を超えた場合のみ、メインCPUに割り込みをかけてウェイクアップさせ、Wi-Fiでクラウドにアラートを送信する」といった、イベントドリブン型の超低消費電力アプリケーションが構築可能になる[cite: 16, 20]。ウェブ上のチュートリアルを監査すると、Arduino環境で簡単に動かせるWi-FiやBluetoothのサンプルコードは溢れているものの、このULPコプロセッサをアセンブリ言語や専用ツールチェーンを用いて活用する方法に関する情報はまだ少なく[cite: 12]、ハードウェアの真のポテンシャルが一般の開発者には十分に引き出されていない現状が浮き彫りとなっている。

## 7. 高度なセキュリティ機能とエラッタ（既知の不具合）の監査

### 7.1 エンタープライズ向けIoTを支えるセキュリティ機構
ESP32-S3は、産業用機器やスマートホームデバイスなど、厳格なセキュリティ要件が求められるエンタープライズ領域での採用を強く意識した設計がなされている。SoC内部には、悪意ある攻撃や物理的な改ざんからデバイスを防御するための包括的な暗号化ハードウェアアクセラレータが搭載されている[cite: 1, 3]。

*   **セキュアブート (Secure Boot):** 許可された（署名された）ファームウェアのみが実行されることを保証し、不正なコードの実行をブロックする[cite: 1, 17, 30]。
*   **フラッシュ暗号化 (Flash Encryption):** 外部フラッシュメモリおよびPSRAMに保存されるデータやコードを透過的に暗号化・復号する。これにより、チップから直接フラッシュメモリを取り外して内容をダンプ（物理的抽出）された場合でも、知的財産や機密情報（Wi-FiパスワードやAPIキー）の漏洩を防ぐことができる[cite: 1, 3, 17, 30]。
*   **ハードウェア暗号化エンジン:** AES (FIPS PUB 197)、SHA (FIPS PUB 180-4)、RSA、HMACアクセラレータ、RSAベースのデジタル署名周辺機器 (RSA_DS)、および真の乱数生成器 (RNG) をシリコンに内蔵しており、ソフトウェア処理によるCPU負荷をかけずに高速な暗号化通信（TLS/SSL等）を実現する[cite: 3, 15, 17, 27]。
*   **eFuseコントローラ:** 4096ビットのOTP（One-Time Programmable）メモリ領域を持ち、そのうち最大1792ビットをユーザー領域として利用可能。チップ固有のシリアル番号や暗号化キーを永続的かつ安全に保存する[cite: 3, 15, 17]。

### 7.2 エラッタ（Errata）とシリコンリビジョンに潜む罠
ハードウェア設計のプロフェッショナルとして見落としてはならないのが、Espressifが公式に発行している「ESP32-S3 Series SoC Errata（エラッタ文書）」の存在である[cite: 41, 42]。いかなる最新SoCも発売初期にはシリコンレベルのバグ（意図しない挙動）を内包しており、リビジョンアップによって順次修正されていく。

ウェブ上のトラブルシューティング事例を監査すると、Reddit等のフォーラムで「特定のI2S DAC（TDM8フォーマット等）を使用してオーディオデータを出力すると、数分ごとに金属的なノイズが混入し同期が外れる」という、ソフトウェアでは解決不可能なハードウェアレベルの不具合に遭遇した事例が報告されている[cite: 40]。このような場合、チップの物理的なリビジョン（v0.1, v0.2など）に起因するハードウェア制約である可能性が高く、開発者はeFuseやシリアルブートログからシリコンリビジョンを確認し、公式のErrata文書に記載された回避策（Workaround）を実装するか、最新リビジョンのチップが搭載されたモジュールに切り替えるという高度な判断が求められる[cite: 8, 12, 41]。

また、サプライチェーンの混乱や販売業者の管理不足により、「ESP32-C3を注文したはずなのに、ESP32-S3のチップが届き、シルク印刷も間違っていた」といった、ハードウェア自体のラベル付けのミスやフェイク品の流通もフォーラムで報告されており[cite: 8]、商用製品への組み込みにあたっては信頼できる正規代理店からの調達が必須である。

## 8. 国内主要開発ボードおよびモジュール販売サイトの記載情報評価

日本国内の主要な電子部品販売サイトにおけるESP32-S3関連製品の商品説明ページを監査した結果、総じて公式ドキュメントに準拠した正確な記載がなされているものの、ターゲットとする開発者層に応じた情報の抽象化やアピールポイントの違いが見られた。

### 8.1 秋月電子通商における堅実な仕様提示
Espressif純正開発ボードである「ESP32-S3-DevKitC-1-N8R8」などの販売ページでは、ROM 8MB / RAM 8MB（PSRAM）というメモリ構成や、Wi-Fi (802.11b/g/n) 2.4GHz・Bluetooth (v5.0・BLE) といった通信規格が正確かつ無機質に列挙されている[cite: 30]。前述の通り、GPIOピン数はSoCの最大値である45ではなく、モジュールから引き出し可能な「36」と記載されており[cite: 30]、ブレッドボードでの試作を行う電子工作愛好家やエンジニアにとって、実装の現実を見据えた良心的で実用的な表記と言える。

### 8.2 マルツ / 千石電商における用途特化型のアピール
Seeed Studio XIAO ESP32S3や、Waveshare製ESP32-S3開発ボードを販売している。XIAO ESP32S3の説明では「32ビットデュアルコア、最大240MHz動作のXtensaプロセッサ」という強力なコア性能に触れつつも、同時に「ディープスリープモード時の消費電力は14μA」と記載され、ウェアラブル機器やIoTアプリケーション向けの低消費電力を前面に押し出したマーケティングが行われている[cite: 23]。一方、Waveshare製ボード（千石電商）の説明においては、「AIoTアプリケーション向け」「高性能AI計算機能」といったベクトル命令（SIMD）によるAI処理アクセラレーションの特性が強調されており、カメラ接続や機械学習モデルのエッジデプロイメントを志向する層をターゲットとしている[cite: 28]。

### 8.3 スイッチサイエンス / 創作品モール あるるにおけるニッチな課題解決
サードパーティ（kohacraft等）が独自の設計思想で開発したESP32-S3開発ボードの受託販売を行っている。これらの商品ページでは「ネイティブUSBとUSBシリアルのUSBが2系統あり、USBホストもデバイスも開発できる」という点が主たる特徴として明記されている[cite: 33, 34, 35, 43]。これは、ESP32-S3のUSB OTG機能に着目し、「USB機器を作りながらシリアルデバッグも同時に行いたい」という、標準の開発ボードではジャンパピンの切り替え等で煩雑になりがちなニッチかつ需要の高い要件を、ハードウェアレベルで的確に解決している好例である[cite: 33, 34, 35]。

## 9. 結論およびシステム設計者への提言

ESP32-S3に関する膨大なウェブ情報を監査し、Espressifの公式データシートと照合した結果、以下の結論が導き出された。ESP32-S3は、単なる「クロック周波数の高いマイコン」ではなく、Xtensa LX7コアとAI拡張命令、ネイティブUSB機能、そしてOctal SPIによる広帯域な外部メモリインターフェースを統合した、極めて強力なエッジコンピューティング向けSoCである[cite: 1, 10, 15]。

しかし、初代ESP32の強烈な成功体験と圧倒的な普及率が、現在の開発者コミュニティに「誤った後方互換性の期待」を抱かせている。本報告の監査結果に基づく、ハードウェア技術者およびプロジェクトマネージャーへの重要な提言は以下の3点に集約される。

1.  **Bluetooth仕様の厳格な確認とプロトコルの切り分け:**
    オーディオストリーミング（A2DP）やレガシーなシリアルポートプロファイル（SPP）を必要とするBluetooth Classic前提のプロジェクトに、最新機種だからという理由でESP32-S3を採用してはならない。S3のBluetoothモジュールはBLE専用にハードウェア設計が最適化されている[cite: 1, 12, 17]。レガシー通信が必要な場合は初代ESP32を、次世代のスマートホーム規格（Matter, Thread等）や低消費電力メッシュが必要な場合はESP32-C6やH2などを、要件に応じて適宜使い分けるアーキテクチャ選定の眼を持つべきである[cite: 5, 9, 12]。
2.  **SoC仕様と開発ボード仕様の分離評価に基づく電源・ピン設計:**
    データシート上の「GPIO 45本」や「Deep-sleep 7µA」という輝かしい数値は、SoC単体の物理限界を示すカタログ値に過ぎない[cite: 15, 17]。実際の回路設計においては、Octal SPIメモリによる内部バス占有ピン（GPIO33〜37）、起動時の電位を固定してはならないストラップピン（GPIO0等）、そして安価なLDOやUSB変換ICによるmAクラスの寄生電流を計算に含めた上で、システム全体の要件定義を行う必要がある[cite: 4, 31]。バッテリー駆動デバイスを設計する際は、開発ボードの検証結果を鵜呑みにせず、BOMを見直したカスタム基板の設計が不可避である。
3.  **メモリ管理パラダイムの変化に対する認識のアップデート:**
    「内蔵SRAMが520KBから512KBに減少した」ことをスペックダウンと捉えるのは、ESP32-S3のメモリ管理アーキテクチャを理解していない証拠である[cite: 19, 21]。大容量PSRAMへのキャッシュ管理機構が高度化しており、AIモデルのウェイト保持、高解像度画像のフレームバッファリング、複雑なオーディオDSP処理など、大規模データを扱う最新のワークロードにおいては、外部メモリと協調動作するESP32-S3が初代を凌駕する圧倒的なパフォーマンスを発揮する構造になっていることを深く理解すべきである[cite: 1, 5]。

インターネット上の技術記事には、過去の遺物となった古い情報、新旧製品のアーキテクチャを混同した比較、そして測定条件を欠いた実測データがノイズとして溢れかえっている。ミッションクリティカルなハードウェア設計や量産を前提とするIoTプロジェクトにおいては、第三者のブログ記事を二次ソースとして参照するに留め、必ずメーカーが発行する最新のリファレンスマニュアル、データシート、およびエラッタ文書に立ち返るという、エンジニアリングの最も根源的な原則を徹底することが強く求められる。

**Sources:**
1. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEGW5PbXLGnkwYTzohAz4VUncGKJX9U4vel3dwhmIoDiGE8vgYxakgixjrj9UIoJkOcZ7DtHX9x8Xlq1ZKuijiB8uKldH-rVFrVMhuiXwuZQFk9z5sRncn8jzjU8aM0oQdS03IaTK35m-2IMYQ=)
2. [panoxdisplay.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHqnD61a4cUBpqwIa3yKCaxdsHtVQeFsYxFfnCTUTQHuDn_pfEngwEDHkI-K-AMMj6kPrJeie03IAdNqv2DtvPbn0O_4aGahh6gAHAzB3cgOMqHodj0zTexS0F4IFmzEFtMXnelqQT6OS9b-GlDU_EQXaIFQ0GX-wE8TjmhbVweV43nZmXuX9PtA0wZzG1NtTI2cugf1i_hR9P7kc7fJ1Ebvg==)
3. [heltec.cn](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH1xrtmuiOdDibRyb6QT_DlrA99NVgC-p0uMIcMV08NLdZdiA9IEGf3BP83sSX1JhHZWfuhi4YQ1dQYSXVGnz39PBx6Bjf4aMicwskIYv4q7gwFQJW9G5WKsVaZ37VNMN7B4g4V0lmwPLrAM-dn6NBzhbfXXw5FXgXx8teV_xOVyeOlXAk2)
4. [codesprintconsulting.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGhzR7Uufn5YPT57kyYNfY2D-qSSthwFmPaa1cFnLgyiYU66jTIKqvJDQy7Zd83AlmxzJZEkilErWeNM9ab4lfjpGb7shiGUeVMRZQAqL_em1zUGgPTHlsi7gEVttqIFA_002P8Fodu-X-vcrIQXMh2azLCsIBsrj5DyeN3iIX75RU2)
5. [note.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHBNYQ257KH2FYaRNJVn3MgL0JndmPOF6SJRdYFaeqah-aytnr5wceNKXCLTgjDA-zro0_0NghNqYhAbmso29DXtvNYiRF10DpNen9Sr6MvgXOm_j-HnyFjBdUwxVJdWBPS)
6. [reddit.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH-zTsizpSrh-cv6yVMUg0qnaSokgpbToALnpZy-aHpCpgAQp9OItx-6rED547Q84KAvmMD3pPIeqkekaBCPH73G3sIvouSQYiM5yBsexJs3PTpcCVCJ307xHR6hr_bYnvl65Aw1H3by1FSUPV0fej95yNt_wv9FSu05jyRujIDlvKod8A8bdOwn8xLP_mXMblKQA5pny1xa19u)
7. [cat-one.net](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFyWSIjyvROQDycXYVr-QMSaDsHOixDbUSR1Z7085eVesS-LCwjV8VfqZU3cU4iFbuiOQGpA8_Gzp0iQq4rlYo-RSwq05Flt8HOP25e_AlbjRBVJV8LtBKV3wvfX00FACRg2y7VGe_4kgjq4YijlKPIH8s4yxWVB1qNg-cVSS8xm959YsudoLEe6PpInowJZBOsgD6t3qi1EQ==)
8. [reddit.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHq2W018f1xgME6hoeLEfXISZ4lZro-2DP-K0yD2Xq9nyfADpQcxsjHZVGwH0jxOUvJ9ifajEdWdFUPzXlNgi9v3g__qA3u6vQnUVZmaiT2qLdTdFcLhv4JhZRoqYh48STn4iUKiNCZdZRTo4Do19OsWq57HE2tErbgaxZvV8eXBTr-JN597YVOvwb8OcyL0ZwfacZH8TNs48nU8nvy)
9. [yamadori.app](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGJLciECsBl2pcAA3CQnjXwTB-o2iqu9Z78QsZLF5_ZtkZ-OOGb0m5dWG7Kutx4--acDDykFpw1r-DCtIwQSXAa6m61Ru16CdxeM3sNg2OOmI4oV_3N7cgQJV1SQbkhxB_ZdsYQ)
10. [electwork.net](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEA4TWrAXC53OeGX_az8dIlj9EpGv0cMfNp35ucZzwD0ZT1JPq2ctSsa-oqRcg8ZKh3E_7E4iiPu-qavsRer-G5qO-lHMx0ijs4K1-FhPZeDLtLpa2NeAJP9XfSRG_aUkQhzWppYICQWol3)
11. [pc1.co.jp](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEcMgUxcAk4asa6oxeODRoteC13ZWkzpPYokS0T7aeUVISYZX5UsoSJoMLYXCMNa_h2bE8vYI1bD0siv3JrID-TT7Jd4d1oJNCCToaQSYfJRnk6-twgtgmjXw4KB1_RyPzDcG5UxBWkAgqIthCVDYOq6ACp9txIp9gujJ-k1AxlNxJ05T1x9dG3SSak67tN_i3grvAcajZ31WqVvxRgM9PtbGc-m8qDAHrcdq8ADsaVhXCNgXybBj0EfbSMpg==)
12. [sensbench.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFeMwRCkbXFznpATlWK13YTABJ9A1vfHSLKb-7oltuVHKnozpDJfz1OcCE6B5Jt_3VkSmEcNJVE3yNMC2BqP5WRnql4F1pfvGLjL1KQzLlIKqrbteWU8ee395pff2PL3w==)
13. [macnica.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHhpczr6NegTAXfjeig2oRHGOoeB8J5P1F44y7EucDC4Ot5taCuXrhV7xrOG8z6n_3YGaOTdK287Cd9sjj3m5T1udWbdqg4FC8Ad-qTQTqBdaIl4pD2GneG7JM5x9NPIquT_ZZjjlCspLPK8RZhxq_WNilAPzWVvWS7JrBqsHHmIr0=)
14. [hatenablog.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGiOtGAW_4wNFm57rroJBNfoYzeimcAFMNftSI-o4cYMoARlvObrvSWl391e7hl75Osc9H-F29s14D439KcVxW37rucxkxRwo4h1dJDMdrj972S71dNEEDK2rns5oM5msIRdXF2rQNlzlvdv1B9yqen)
15. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHqIOhFiy6d4GjVCnlnv-8GAA3vQt-zcHCQDwGVngT-qlrD1UfTk1OX4BuQE8rqVev4oToVw4eZbISPO2bu4qHR1VYPYIt-D07lTaUKC-cXxi-3w4GyucQnKafx8HWqfZ_OWGcfQVpNRq-2ApBN32BF6Cmg)
16. [qiita.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHLx1KdWazIGnNC1DDTLpjJPUcaeCRqhWkhKavAe7VW0jZK5tik0lbEii64q9bgb3IC2zseLyWNlsF-HFE4Vs2Qccrzi53VJY_-tstJC3KZoshiTBPEc28vMANaCXk9tr2zIpzK7zmyaYzmi4-wbZspwMk=)
17. esp32-s3_datasheet_en.pdf (fileSearchStores/adv2026day12esp32sisters-ju6vzp26vplv)
18. [tamanegi-digick.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGhUi9C6lNfxqxcJE3_BNRCEKqsfDk8S1xhXs_rDU5pu7zYf1XcgQM50Yl7rpr9daVuhRrGv35tCV6ihlcVNNt47QDRIijItD4kYZffS2rtA6jRJ3DkZ7YyfGOfRh44)
19. [ariat-tech.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFeTnC5p9NLFF5xBYT-uzeOep5stsYGPw7EiK6A74766-nCXTQesfxyRbDKvVMR3tJVkDKSSX3B6U_ClAmV_iAVSY2E4A8_--uysqEi2nRrNkkmGqV1MMYMkY_rA_lqf1qKM6-YRS389raZx3gUFTVc3D0c8m0LPDq3h4KC-zQc9KlwcEOp2QgfpaQx2ct25wDnoM9NRrjkraal46WO7YHJgwD4N98XCG2oVbv5HA==)
20. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEn1MmOz8eymHhFepXvKQ5RTQsTMFJvTiEZjaWRktv8vDVn3OJDXP7BNcWC1_QzoUOeG9vU41fg6c6feNvAsfniix7P1-aTqLKnwQc4FXuodVvIO39mVF2DC0Sq8aS7lpRxrhTp1vZz5IywtIN08bzU85O1VDKai1xDgIU=)
21. [switch-science.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFHbPEYZAmfzvU0mzHbBVSF4q9aS_1osuvVgKA2JymgcwFsTtQlM6gyjOjVZrse1lNp5zLQgn4Jd8gCwdCtb1PBpFXjBBljvNRv20Ay33SO3ZgQ5DA3bBWP_2hRBFun9zIvpuL4G1211jlqinA4Bj3BrpG0B5sieIErdVKZvJYlXh0txw==)
22. [hatakekara.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEv1d6-u4RuMMrzPzu8p_KYXKaA2aOHdcYkprPq2phioqES-exTANTr-2S2BSgPrMAF053RmrewxAQ_C5cZZVcApSOOCZ1sg-6E8JPWeRv6Zh7SW9hybPgi)
23. [marutsu.co.jp](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGTolykxYoUsWoSWw4yTT8poczFzA5Njv4AkzZYjmgZpOUz9e5EeKuB_9CXHUWB8jeuBKasPqwlSK4uAnnfPZHeU37Ob0DjOg-OGqdCpQ9_soo1vuwp9bpZPlAo4Jk=)
24. [csdn.net](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFoI1wtsxV-1G1twpdovFWTCzW3c-m7lYgyY9fwyxDRQF1uXxDNmeVUHdk3pr27IkRDnBWrShTM4g232csGbqrxo1FXqgSfwQNAHP8yrdcPOba34ciMYcoZcBf3XJg7MbMXTz_i6VqsKD5GYEfGs60UNttIWbs=)
25. [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGH4aK_l0hCK-q9k98Mu9sRaeW_ZkH6pcY96QC7EYdp0RJIJSMSb-AO1Rj3P16fosYaKtNu2xeldW2PlMBbNlQHks36FKGAVyKd9VZT_eita--Si9oYttmp-LiZO4etbOm8uhSR2RFk6EEOm64=)
26. [github.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHnh_hSxsH2CEB5DV2H-k2Cee6WJemzn79TM42CvglwkL1_GH3c9-8W8dgT6KuEudqR5NQt3h2n6hirqKI_rlQaRmHHFP3olbsOvtKDlJ4N3d5ZCJvOrCGWr1aqXVEeH7kwWxOTWuB5WFZH)
27. [eeworld.com.cn](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH_IOMJGdjXo_mh0iSO71vm4g8z68LS-w8VpGf-Dr9eUY6sn01GYogCZbHhaDsAyxBgQognSywG2diJbg91HjtQISRfmhBg6UYo8kGzgPc2tqb6vNws_55eMdR2MrDO8HEytTKDphWBeKDQtuBH)
28. [sengoku.co.jp](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFj_BYnMLSQhF6JNwGM0cpBvi9PR8BOAsp-jdUKws30xV_d46fKZ8_SfrjIKEo9hsK0SRVCQqN2T271pphGF8CxIyc7N7tDHPuO6626_pw-q7g7O5xr1fkbi_A3x9RMsxNUzuHusM-R3O41VZz3dZ8Fed1fa3li)
29. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFtzXToZXpOPUZacJhRtrkb5Ak2TFVyQNXuVK4FZeplyp1rD4dez7wv-NkmW7KEbvSBhuDGxpwc4lI6VT0xKmwOpAEy0JQ9jE08zwznTUQJUP9NJLKObM3q2TADsN7bHXDO8mlO_2z-GCh-VPkBJY8PP_tELJSOlY78MPC-OLUoTqM8wbXfh3InFTkQfW-rOPiE7aFLjIwz)
30. [akizukidenshi.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHj61CmvSiPYS_fa0wsJeKjQ2Q8-jJb9bzectph99gz-2kk4nSE8S5_6soKYbgT2VJ4fgNI_z_1H_VIsI0JlSEGXLCPYtk8FRPBFhKqcA7UGpZ8Ylnnvg8pew55JuMtgf9GNw==)
31. [makerspet.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQENPMkEbTfAQmJ9XcYGdPbUy3cGs5yGa6n5jNKRJPwdvvW3N92hTrXIWIsQCxF_E1gcySozOQbzmnIVjGPJT-NYwics9zbmSpYMjHYaB6xZ-MOXvvv-r2-Hlb_WvZQSLr2MtmB8TsHXaQPdyw==)
32. [note.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGnnnrSUESIxDX9zh09ckn2i3tPkiYvvKOQodPTO1-4ZF0hp4WfUsVK2ZzUosZ7LjDZ1AtH7NmXizYPH6jQWY1-iNvPkvaImPExstBORZyGJFrgQ5GfRTgnMuLZBj3V)
33. [alulu.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHBbkIgDb18GgLcpyuzmFuo37uKCY6vN7fGEEV63bod-5vAb6lMhysmOiRCGZiPlaxiSuaiVHSoROFcT7m6vNQnnXhPyTZU_Ohc9NIRyGQIpmmJBZW5c1k-ltHtzE8=)
34. [switch-science.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFTciQSikukGzxZG0CosdkGWZCwUJA7pzLV3Hsp8OfBzNtq9k6LY_VxLvT2hM4l7KvTrD4BBt9R_DtZkZX0cvQy3u8bcaOPsX0xvGvAPZmHXqA5dcXdmJsUwrGyfv_jdm1VUQE=)
35. [kohacraft.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEXYL1zpDoz86RyVbBu9auD6IbY60PuLjC8hsboAq_Yel1iZ6GTgKpyPqCQdPJNE9ho86raVhPWlt3VW3qw6MMxpqbyg3TCzCXpONxkWXsTPGggbvJzHOhE27U5RpmvtzBJe1j2i_Y=)
36. [seeedstudio.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEFTAjHiMx4SreHRXZt0t5acDoXPfmwMFTfHRGaAcqZkLeu69gKyhsJeyZBluHpV1F_6aelL-WOGfGTgGPMUJaRjGsvFCXkeTxxJ_SqHpFoD7xOUoR7nU0EtEq_xv9CDeVfZpEqGJjRTeZPY7qI86Y=)
37. [reddit.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGszns0NZmH1rwiYagq5bj29uiEDYS8jFOJlcNMYX3unjuGkvwUkscFwkKPU3gKkmzcWHSv-5E1uMSa9zW5PmcrJm1yV1dAUG0BGc3-cMQS4_RsvioFC7_qtthjoGuCrzNhZhqJeG3Zt5nJ_JJlWZBkPlp_IjPbrsUfNmMZysTfoFampG_aeqYaTQHzmc2rSSUXNlp9SA_WkLpvoGNPOtMx)
38. [esp32.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGa4GeMZPNEZO5Ytd6E_G-HKdGKpA0A2WwXSSiFjBxPmdd5obYo4pKW0DyYmX1g4lcNYEO8fVRTyXvi8epnc-KN7Ki88OkH73FMheBL6FTP0AFRTUmeQQquuoVTTLE=)
39. [qoitech.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHWTRM9a18l_vmIGuvbdVfMinVcpqtt9OfLYioUsfgqpoSFQhY1mLEjCGmBJ1Quo9dhCtWQq92qJf0HsH9wTuLmCa2HqPbyMfFiUQpcV5Q2pc5pXeJtt42lDKbC_5xj4mO9JOkav8bGbvMMJZf6QjFkixxiYBmClc62KA==)
40. [reddit.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFIMkdpIY-2dvw8qH6TgQ08DbaGtNbjTU_UdfbRnZFzo1W8US81T0xIWnscenDK3XgTeBYq5_c9EAM46aTqOgH-DNni4-1224W4vJ6qn1wU5DpouuMcO9mwf15WCUy5BGroHGX743p_4v2RRWjEhSE5jOcfYGWDGkASZH76TWdYamLaIpvgLXBpUm_smVTpkvOadRkgKShz9wyGvVFl2A==)
41. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEZhDAc2LgA-gaXZypvhxvjq5oIwE6reG8VwABOSmv7-cCtBqeQ3Rg2jgsFypO-MdXUNNf3Q0pUKYImknEDh9vi4_TAedbdg76YdYfBydOoexggzTn0WXOXMXQUUwvAf-an_YdOlG4NX18bNHpKifsMfVSI5rOmbhpzczIzdCM4HIh1k4Q=)
42. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEnLFpqrg0cEwK3z7AlZ2eGeu63VOkCYdLaIpS9y19RAWI9YblIg_SFevjh1sSLhilDchgN661avNhW9ValbabsuxBBNeJ0LnCWx_s-tMPy9w3KrdkQy7yVYHks5XQ8fbj1yfklVl3RSWOaGaDoZsweCgTJLg7gowtTUTIMtQb8n6jnZi-APk-enQ==)
43. [kohacraft.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE6pVXS3Bxusg1jduqsbeuQ1FjmfqqCbjTK_2L5MQQG5-mekU_j-FKBh5eHkD5CdZvrvl23J2xi2YyIw6km8-o0h0z1wOoPVJoYkOSgGwATsoMFgxI7timSPX_yh8Ak8QiTkqWpgfVO)
