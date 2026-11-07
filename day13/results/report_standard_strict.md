# ESP32-S3 SoCアーキテクチャおよびハードウェア仕様監査計画書

## 1. 監査の基本方針と評価スコープ

本報告書は、Espressif Systems社が提供するWi-FiおよびBluetooth Low Energy (BLE) 統合型マイクロコントローラ（SoC）である「ESP32-S3」の仕様監査計画、およびその技術的評価基準を網羅的に定義するものである。IoT（Internet of Things）エッジデバイス、スマートホーム機器、および産業用自動化機器における高度な演算要求と低消費電力要件の両立が求められる中、ESP32-S3はAIアクセラレーション機能や広範なI/Oインターフェースを実装した次世代プラットフォームとして位置づけられている[cite: 1]。本監査計画の目的は、製品開発やシステムインテグレーションにおいてESP32-S3を採用する際の技術的妥当性、限界、および設計上の潜在的リスクを事前に特定することにある。特に、初代ESP32（ESP32-WROOM-32等）や低コストモデルのESP32-C3などと比較した際の実効性能、メモリ構造の変更、Bluetoothプロトコルの仕様変更、および電源・GPIO管理におけるクリティカルな制約事項を明確化する。これにより、ハードウェア設計者およびファームウェアエンジニアが、設計の初期段階で最適な部品選定とフェイルセーフな回路設計を実施するための包括的なガイドラインを提供する。

## 2. プロセッサ・アーキテクチャと演算スループットの監査

ESP32-S3は、最大240 MHzで動作する32ビットXtensa LX7デュアルコアマイクロプロセッサを搭載している[cite: 1, 2, 3, 4]。従来のESP32が採用していたXtensa LX6からの主要な進化点として、5段パイプラインの採用による命令実行効率の向上と、データパスの最適化が挙げられる[cite: 5]。単精度浮動小数点ユニット（FPU）をサポートし、32ビット乗算器および除算器を備えることで、リアルタイム性の高い処理におけるレイテンシの低減が図られている[cite: 5]。

監査における第一の評価軸は、このアーキテクチャ更新がもたらす処理スループットの向上である。CoreMarkベンチマーク等の評価において、LX7コアはLX6と比較してクロックあたりの処理効率が向上しており、高負荷な演算タスクやリアルタイムOS（RTOS）環境下でのマルチタスク処理において、コンパイルおよびプログラム実行の遅延を大幅に削減していることが確認されている[cite: 6, 7]。監査プロセスにおいては、対象となるアプリケーションがデュアルコアの並列処理能力を適切に活用できるか、特にWi-Fi/BLEのプロトコルスタック処理（通常コア0で処理）とユーザーアプリケーション（コア1で処理）の分離が設計上担保されているかを検証する必要がある[cite: 3, 8]。

さらに、ESP32-S3の最も特筆すべき機能の一つは、ニューラルネットワーク演算およびデジタル信号処理（DSP）を高速化するための128ビットベクトル命令（Processor Instruction Extensions: PIE）のサポートである[cite: 1, 3, 5]。エッジAI用途において、ソフトウェアがESP-DSPやESP-NN、さらにはESP-WHOやESP-Skainetといったライブラリを通じてこれらのベクトル命令を明示的にコールしているかを確認することが重要である[cite: 1, 9]。ベクトル演算を利用することで、従来のMCUでは数百ミリ秒を要していた音声のウェイクワード検出やFFT（高速フーリエ変換）処理を数十ミリ秒単位まで短縮可能である[cite: 9]。ハードウェア監査においては、この処理時間の短縮がシステム全体の省電力化、すなわち演算終了後のディープスリープへの早期移行にどのように寄与するかを定量的に評価するステップを設ける。

## 3. メモリ・サブシステムとストレージ階層の監査

メモリ・アーキテクチャの監査においては、カタログスペックと実際のアロケーション能力の差異を正確に把握することが求められる。ESP32-S3は512 KBの内部SRAMと384 KBのROMを搭載している[cite: 1, 2, 10]。一見すると、初代ESP32の520 KBのSRAMからわずかに容量が減少しているように見えるが、メモリコントローラーとキャッシュ構造の抜本的な再設計により、実効的な利用効率は大幅に向上している[cite: 6, 10]。

内部SRAMは複数のブロック（SRAM 0, 1, 2など）に分割されており、ESP32-S3ではデータ領域用とプログラム領域用のキャッシュ割り当てが最適化されている。具体的には、SRAM 0から16 KiBがプログラム領域用キャッシュとして、SRAM 2から32 KiBがデータ領域用キャッシュとして確保されるアーキテクチャへと変更された[cite: 10]。この構造変更により、ヒープとして連続的に確保できる最大SRAM容量が従来のESP32よりも増加しているケースがある[cite: 10]。ファームウェア開発の監査においては、静的アロケーションと動的アロケーションの配分が新しいメモリマップに適合しているかをソースコードレベルで確認し、メモリオーバーフローのリスクがないことを検証する。

高解像度のLCDディスプレイ制御や、機械学習モデルのロードには内部SRAM（512 KB）だけでは不足するため、ESP32-S3は高速なOctal SPI（8ビットバス幅）をサポートする外部フラッシュメモリおよびPSRAMの接続を可能にしている[cite: 1, 3, 11]。パッケージ内に最大16MBのフラッシュおよび8MBのPSRAMを統合したバリエーション（例：ESP32-S3R8, ESP32-S3-WROOM-1-N16R8など）も存在し、ユーザー定義のデータキャッシュおよび命令キャッシュ構成がサポートされている[cite: 3, 12, 13, 14]。監査のポイントとしては、従来のQuad SPI（4ビット幅）と比較して理論上2倍の帯域幅を提供するOctal SPIを利用する場合、キャッシュミス時のペナルティやアクセスレイテンシがシステムのボトルネックにならないかをプロファイリングツールを用いて評価することが挙げられる[cite: 14, 15]。

## 4. ワイヤレス通信プロトコルとRF特性の監査

通信機能はIoTデバイスの根幹であり、ESP32-S3におけるワイヤレス機能の仕様変更は、レガシー製品からのアーキテクチャ移行において最も重大な影響を及ぼす。

ESP32-S3は、2.4 GHz帯のWi-Fi 4（802.11 b/g/n）をサポートし、最大40 MHzの帯域幅と最大150 Mbpsのデータレートを提供する[cite: 1, 6, 16, 17]。Stationモード、SoftAPモード、および混在モードをサポートし、アンテナダイバーシティ機能も有する[cite: 17, 18]。監査上の留意点として、ESP32-S3は強力な処理能力を持つが、Wi-Fi通信は2.4 GHz帯のみの対応であり、5 GHz帯およびデュアルバンドWi-Fiには一切対応していないことが挙げられる[cite: 3]。産業用IoTや高密度なオフィス環境など、2.4 GHz帯の電波干渉が激しい環境での運用が想定される場合、これが通信の安定性に対するボトルネックとなる。監査計画では、5 GHz対応がプロジェクトの必須要件であるかを再評価し、要件に合致しない場合は採用を見送る判断基準を設ける。また、センサデータを断続的に送信するだけの用途であれば、通信時間の95%以上がTLSハンドシェイクに費やされるため、ESP32-S3の高度な演算能力が必ずしもWi-Fiスループットの体感向上に直結しない点もインテグレーション時に考慮すべきである[cite: 19]。

Bluetooth通信に関しては、ESP32-S3はBluetooth 5.0 Low Energy (BLE) に対応し、Bluetooth Mesh、2 Mbps PHYによる高速通信、およびCoded PHYによるブロードキャスト拡張を用いた長距離通信（Long Range）をサポートする[cite: 1, 3, 14, 16]。ここで極めてクリティカルな監査項目となるのが、ESP32-S3がBluetooth Classic (BR/EDR) をハードウェアレベルでサポートしていない点である[cite: 2, 19, 20, 21, 22]。従来の初代ESP32を使用してSPP（Serial Port Profile）によるシリアル通信やA2DPによるオーディオストリーミング、HIDプロファイルなどをBluetooth Classic経由で実装していたレガシーシステムをESP32-S3に移植する場合、プロトコルスタックの非互換性によりソフトウェアは動作しない[cite: 23, 24, 25]。BLE Audioなどの新規格は後方互換性を持たないため、オーディオストリーミング等を要するプロジェクトでは、初代ESP32の継続利用、あるいは後発のBluetooth Classic対応チップ（ESP32-S31など）の採用を検討するよう、計画書にて厳重な勧告を行う必要がある[cite: 19, 25]。

## 5. ハードウェア・インターフェースとピンアサインの制約監査

ESP32-S3は物理インターフェースの拡張性が大幅に強化されており、ペリフェラル監査はピンアサインの柔軟性と信号整合性、そして致命的な制約事項の両面からアプローチする必要がある。

ESP32-S3は、初代ESP32の34本、ESP32-C3の22本を大きく上回る、45本のプログラマブルGPIOを備えている[cite: 1, 3, 17, 19]。これにより、パラレル接続のLCDインターフェース、DVPカメラモジュール、複数のI2C/SPIセンサー群をマルチプレクサ等の外付け回路なしで単一チップに直接ルーティング可能である[cite: 3]。ESP32シリーズのIO MUX（入力/出力マルチプレクサ）およびGPIOマトリックスの特性により、SPI、I2C、UART、PWMなどの一般的なデジタルペリフェラルは、特定のデフォルトピンに縛られることなく、ソフトウェア設定により任意のGPIOピンに割り当てることが可能である[cite: 5, 26, 27]。14本のGPIOはHMI（ヒューマン・マシン・インターフェース）向けの静電容量式タッチ入力として設定可能である[cite: 1]。監査時には、プリント基板（PCB）設計において、トレース長を最短化しシグナルインテグリティを確保するようなピンの物理的配置がなされているかを回路図レビューを通じて確認する。

ESP32-S3における最も強力なハードウェア追加要素が、ネイティブのUSB 1.1 OTGコントローラーおよびUSB Serial/JTAGコントローラーの搭載である[cite: 2, 17, 18, 19]。従来のESP32では、PCとの通信やファームウェアの書き込みのために、CP2102やCH340などのUSB-UARTブリッジ変換ICを外部に実装する必要があった。ESP32-S3では、特定のピン（標準的にはGPIO 19および20）を直接USBコネクタのD+/D-に配線するだけで、仮想COMポート（CDC）を介したファームウェアの書き込みやJTAGデバッグが可能である[cite: 2, 19, 27]。さらに、USB OTGのサポートにより、ESP32-S3自身がUSBホストとして機能し、USBディスプレイや外付け機器を制御すること、あるいは自身がHIDデバイス（キーボードやマウスなど）として振る舞うことが可能である[cite: 2, 19, 28, 29]。監査計画では、USBバスパワーの供給能力や、OTG動作時のVBUS制御回路の安全性を検証する項目を組み込む。

設計上最も陥りやすい落とし穴が、ブート設定を決定するストラッピングピン（Strapping Pins）および特定用途に予約されたピンの取り扱いである。ESP32-S3では、起動時（リセット直後）にGPIO 0, 3, 45, 46の電圧レベルを読み取り、ブートモードやフラッシュの動作電圧を決定する[cite: 27, 30, 31]。この中でもGPIO 45は、起動時に「VDD_SPI」の電圧（1.8Vまたは3.3V）を決定するという極めてクリティカルな役割を担う[cite: 27, 32]。基板設計においてGPIO 45を外部プルアップしてスイッチ入力等に使用した場合、起動時にFlash Voltageが1.8Vに設定されてしまう。もし実装されているフラッシュメモリが3.3V駆動用であった場合、フラッシュの読み出しに失敗し、システムが完全に起動不能（ブート失敗）となる[cite: 31, 32]。また、GPIO 35, 36, 37は、Octal SPI搭載の特定モジュールにおいて内部PSRAMとの通信に予約されている場合があり、これらを汎用I/Oとして使用することは致命的なメモリアクセスエラーを引き起こす[cite: 27, 33]。ピンアサインの監査においては、これらのストラッピングピンが起動時の短い期間においてフローティング状態、または不適切な論理レベルに固定されない設計となっているか（適切なプルアップ・プルダウン抵抗の配置）を厳密にチェックするフェーズを必須とする[cite: 31]。



## 6. 電力管理ユニット（PMU）とディープスリープ特性の実証監査

バッテリー駆動のIoTセンサーノードにおいて、消費電流の制御はプロジェクトの成否を分ける極めて重要な要素である。ESP32-S3は高度なPower Management Unit (PMU) を実装しており、Active、Modem-sleep、Light-sleep、Deep-sleepの4つの主要な電力モードをサポートする[cite: 12, 18, 34]。

Espressifの公式データシートによれば、ESP32-S3のDeep-sleepモード時（RTCタイマーおよびRTCメモリが稼働状態）の消費電流は約7 µAから10 µAと規定されている[cite: 3, 16, 34, 35, 36]。しかし、システムレベルでの監査において最も注意すべきは、「データシート上の7 µA」というチップ単体の理論値と「実際の開発ボードにおける消費電流」の著しい乖離である[cite: 9, 35, 37]。市販の開発ボード（DevKitC等）をそのまま使用してバッテリー駆動のプロトタイピングを行った場合、USB-UART変換IC（CP2102N等で2〜5 mA）、電源ステータスLED（2〜3 mA）、および静止電流（Quiescent Current）の大きい安価なLDO電圧レギュレータ（AMS1117等で約5 mA）が基板上に実装されているため、メインチップがDeep-sleepに入っていても、基板全体では5 mAから15 mAもの電力を消費し続ける事態が発生する[cite: 35, 38]。

ハードウェア監査計画においては、低消費電力を謳う最終製品の評価にあたり、開発ボードの測定数値をそのまま信用するアプローチを厳格に排除する。監査手順として、デバッグ用のペリフェラルを極限まで削減したカスタムPCB、または静止電流が数µA以下の高効率なLDO（Low Drop-Out）レギュレータを使用した環境下で、「基板全体の暗電流・リーク電流」を高精度なマルチメーターを用いて測定するフェーズを計画書に盛り込む必要がある[cite: 9, 34, 39]。Deep-sleep中はUSBペリフェラルを含むすべてのデジタル回路の電源がオフになるため、デバッグ出力がシリアルポートから失われる点も、ファームウェア検証計画において留意すべき事項である[cite: 40]。

さらに、ESP32-S3には、メインCPU（LX7）がDeep-sleepモードで完全に停止している間も、独立して自律動作可能な超低消費電力コプロセッサ（ULPコプロセッサ）が搭載されている[cite: 1, 6, 12, 18, 40]。ESP32-S3のULPは、従来のFSM（Finite State Machine）ベースのものに加え、RISC-VアーキテクチャのULPをサポートしており、より柔軟なプログラミングが可能である[cite: 7]。ULPは独自のRTC FAST/SLOWメモリにアクセスし、タイマー、外部GPIOのADC入力、I2Cセンサーなどを極めて低い消費電力で継続的に監視できる[cite: 40, 41]。指定した閾値を超えた場合や特定の外部割り込みが発生した場合のみメインCPUをウェイクアップさせる設計とすることで、バッテリー寿命を劇的に延ばすことが可能である。監査では、ファームウェアアーキテクチャがこのULPを適切に活用する状態遷移モデルとして設計されているか、および不要なGPIOピンがスリープ中にプルアップ電流を消費していないかを検証する。

## 7. 暗号化ハードウェアとシステムセキュリティの監査

IoTデバイスの普及に伴い、エンドポイントでの物理的・論理的なセキュリティ保護要件はかつてなく高まっている。ESP32-S3は、外部からの悪意ある攻撃や脅威からシステムを防御するため、ハードウェアベースの強固な暗号化モジュール群を備えている[cite: 1, 16, 18]。

ESP32-S3は、AES（AES-128/256対応、XTSモード対応）、SHA（FIPS PUB 180-4）、RSA、HMACの各種暗号アルゴリズムをハードウェアレベルで処理するアクセラレータ、および乱数生成器（RNG）、デジタル署名モジュール（RSA_DS）を搭載している[cite: 12, 16, 17, 18]。これにより、TLSハンドシェイク時の公開鍵演算や、データ通信の暗号化・復号処理をメインCPUのリソースを圧迫することなく高速に実行できる[cite: 19]。

特に重要なセキュリティ監査項目として、セキュアブート（Secure Boot）とFlash暗号化（Flash Encryption）の適切な実装運用が挙げられる。セキュアブートは、起動時にファームウェアのデジタル署名をハードウェアレベルで検証し、不正に改ざんされた悪意のあるコードの実行を防止する。Flash暗号化は、外部に接続されたSPIフラッシュメモリおよびPSRAM内のデータ（プログラムコードや平文のクレデンシャル情報）をAES-XTSアルゴリズムを用いて透過的に暗号化する仕組みである[cite: 12, 17, 42]。これにより、攻撃者が基板からフラッシュメモリを物理的に剥がしてダンプする物理攻撃（リバースエンジニアリング）を無効化することが可能となる。

エンタープライズグレードの製品監査においては、生産工程（プロビジョニング段階）においてeFuseへの暗号鍵の書き込み手順が安全に確立されているか、またファームウェアのOTA（Over-The-Air）アップデート機構がセキュアブートのチェーン・オブ・トラスト（信頼の連鎖）を維持したまま実装されているかのプロトコル監査を実施することが不可欠である。eFuseの書き込みは不可逆操作であるため、書き込み手順のエラーハンドリングが生産監査計画において重要なウエイトを占める[cite: 32]。

## 8. ESP32ファミリ内におけるアーキテクチャ競合と選定基準の監査

Espressif Systemsの製品ラインナップは多岐にわたり、用途に応じたチップの選定がプロジェクトのコスト効率と性能を左右する。ESP32-S3の監査計画においては、他モデル（特に初代ESP32、ESP32-C3、ESP32-C6、ESP32-H2など）との比較を通じて、オーバーエンジニアリングやスペック不足が発生していないかを検証することが極めて重要である[cite: 2, 3, 7, 19, 43]。

以下の表は、ESP32ファミリ内の主要なSoCモデルのコアハードウェア仕様を体系的に比較したものである。監査担当者はこの比較マトリクスを参照し、対象プロジェクトが要求する演算能力、メモリ容量、およびI/Oピン数がESP32-S3の仕様と最適に合致しているかを評価する。

| 特徴・仕様 | ESP32 (初代 Classic) | ESP32-C3 | ESP32-S3 | ESP32-C6 |
| :--- | :--- | :--- | :--- | :--- |
| **CPUアーキテクチャ** | Xtensa LX6 デュアルコア | 32-bit RISC-V シングルコア | Xtensa LX7 デュアルコア | 32-bit RISC-V シングルコア |
| **最大クロック周波数** | 240 MHz | 160 MHz | 240 MHz | 160 MHz |
| **内蔵SRAM容量** | 520 KB | 400 KB | 512 KB | 512 KB |
| **利用可能なGPIO数** | 最大 34ピン | 最大 22ピン | 最大 45ピン | 最大 30ピン |
| **Wi-Fi 規格** | Wi-Fi 4 (802.11 b/g/n) | Wi-Fi 4 (802.11 b/g/n) | Wi-Fi 4 (802.11 b/g/n) | Wi-Fi 6 (802.11 ax) |
| **Bluetooth 規格** | BT Classic (BR/EDR) + BLE 4.2 | BLE 5.0 | BLE 5.0 | BLE 5.3 |
| **IEEE 802.15.4** | 非対応 | 非対応 | 非対応 | 対応 (Zigbee/Thread/Matter) |
| **ネイティブUSB機能** | 非対応 | USB Serial / JTAG | USB OTG (Host/Device) | USB Serial / JTAG |
| **特化機能・用途** | 情報量最多、レガシーBluetooth用途 | 低コスト、小型、電池駆動センサ | AIベクトル演算、カメラ、LCD | 最新無線規格、スマートホーム拠点 |

出典・参考データ: [cite: 2, 3, 7, 19, 43]

この仕様比較に基づく監査のポイントは以下の通りである。
コストに極めて敏感であり、数分おきに少量のセンサデータをWi-Fiで送信するような単純なIoTノードの場合、デュアルコアで240 MHz駆動のESP32-S3は明らかなオーバースペックであり、シングルコアRISC-Vを採用しアイドル消費電力の低いESP32-C3への設計変更を勧告すべきである[cite: 3, 19]。また、MatterプロトコルやZigbee、Threadといったスマートホーム向けのメッシュネットワーク規格を要件に含むプロジェクトであれば、IEEE 802.15.4無線モジュールを統合したESP32-C6が最適な選択肢となる[cite: 19]。一方、パラレル接続のLCDやカメラモジュールを使用し、多数のGPIO（最大45ピン）とUSBデバイスとしての振る舞い、そしてデバイス上での機械学習推論（ベクトル演算）を要するプロジェクトにおいてのみ、ESP32-S3の採用が正当化される[cite: 3, 19]。監査プロセスにおいては、要求仕様書とこの比較基準を照らし合わせ、部品選定の論理的妥当性を証明するステップを組み込む。

## 9. 結論および推奨されるアクション

ESP32-S3は、従来のESP32が築いた資産を継承しつつ、AI処理に向けたベクトル拡張命令の実装、ネイティブUSB OTGコントローラの統合、および45本へのGPIO拡張といったモダンなハードウェア要件に適合させた、極めて強力かつ柔軟なSoCである[cite: 1, 3, 19]。しかし、その恩恵を最大限に享受し、量産段階での致命的な不具合を回避するためには、Bluetooth Classicの完全な非対応、複雑化したSRAMキャッシュ構造と外部PSRAMの利用形態、そしてストラッピングピン（特にGPIO 45）に起因する起動阻害リスクといった「アーキテクチャ特有の制約と癖」を完全に理解し、基板設計およびソフトウェア実装に反映させる必要がある[cite: 10, 23, 32]。

本報告書で定義した監査計画に基づく厳密なハードウェア回路図のピアレビュー、およびディープスリープ時のマイクロアンペア単位での実測検証を実施することで、ESP32-S3を搭載した次世代IoT製品の開発リスクを最小化できる。ファームウェア開発チームおよびハードウェア設計チームは、本監査項目を共通の技術言語として設計の初期段階から認識の擦り合わせを行い、高度な演算処理能力と堅牢なセキュリティ、そして省電力性を両立した信頼性の高いシステム構築を実現することが強く推奨される。

**Sources:**
1. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGZKxlsgAKenpUDgyjZ6XtbYcP9cS05CHJAQ9FUA7Jv8ygkMN-GGfBeMGmpOvIyYsd5Td2RG01gkgKH38mvXlKyI61_2fNwbQKSnPO8fbrHJAPLmUfYDpRQxUKcRu78Ao4zpCvy1kOJccR8NSk=)
2. [hatenablog.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFK0rWyy70qTepQyVB_bxVjFm2FGDG5wUCjS0eufdK0pO7WNI5B7eTspCaLltjREHNlMh-axR9yujKeZG0z0vlWOOeVwnToTjlP1kEcqV_GckxLoBEOF2_4nPTA6_RV5OOmBQop4S01ZpZRvzBcpVME)
3. [jlcpcb.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHy6xxtw6YVNNuH13UxOfdprjG8Vqzey9gUDBkb9NcRzuggxhGgu-gYaU6OgO5cG42uQLwN5Pkmad3GsWcnLCj0k4ceGoxyxD3EowwTAGBgVGxFYXyDFdshJjvyq6srTw==)
4. [coocan.jp](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHQ3XkxkATYXcA_m8jM5Yqr5IHgW0KiSIbeveKmmMM_2dQxcjhCu56tbqubvkQKVk3x0FVnCpalW1BMQZrF50NJu9jbvXT9FDdjJhQVf1XSaEegP-sjOvPe1Pg3N2995OZbrrg=)
5. [qiita.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFjvq01A_9qhfQMTPYyNrdIRngpvurkXcmV9Lg2nZ4jsX857jrA9meJ_k2Jwh-EM8nH9_J2n2grsAvJExQkteCdrNox1ggTNdYZ0i5YIJ7pk-u9SmYDcLb4JYNMYdUi_s7PYV3nyibZk7DZM43uPGnXEJg=)
6. [ariat-tech.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEUmaVsQHm1INmNyE_2xfIKGgmeRGYoYrIW7kLKlp11VRDCBcpF2RF4JtWarH-TgGTqrDsYn9ipeRxBfdt8YtzZmi-luyQ0b8VCgiF9IY44GScaZATKMi073go76EIdB9FSWM4qzc5upeAZrfsDmJDyTM7rz3859ZlygEpwc37XFYX1kJHYRkD6fLa9Vd1F2wGDJ614eF5L4dEQrVxeK0nPEe0kTvaFHRifzzlvzw==)
7. [lang-ship.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGwUC3b6rV1nqL63M7iVfZxuyCRGc7FZrRvEP40Mg-NumJofI2E-tE4voQ_VzhKl0gBPPc6Dp_YbtbPsk2k7XRctMBLAu3bIQzzCjaLyqKrV5tHuATTwxaZK8Ybsf0P6Fz95jhU)
8. [note.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFxMFBJePHXFeFOkadYEFHzluVv9DheDevSJrjmUA45jjDXOUvayIBkHr7etG2YbjnY6noj81Uo7Krt7kYU254vn-uq5yV0L9HZl0ZQ_qqiy6Bf07GCB4Mcw7LfQTULzRHJyBTZA_Aj)
9. [jisaku.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFbjiSPklBhSW-WfG_qabcgeYhvGPDI1RpMUeFDPz2B3cOOb3Qis8j5qxIJ4fw-SHl8fqtGg-MNCiM1v2twVkg5-RMqtwWQ8eA3zw9UsfYUpAt8PoyOMmkybqqIXxJMsgMTW0Hl0A==)
10. [switch-science.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHgl9DkpKMV3GuG7HQWdIp-8E_NoemY1uN9r0l2BpoTodcGIZ35Wvv8JJd3eFo2F9uT6eyYYdX_yDYLIkES_6VZnXNAlfoqbE9feBJhgQ8T3-vnpYxMoYHBHwrD9LwFBrxxKf-eb6EElsCkzzhvLQqCu3bNDtFLhqqbc2LkHqvBd-IAsA==)
11. [manuals.plus](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH7oQshNdeGAxhieCnzsYVCH-OZYXFdpDYvpnwG_vHb37RuntO8DHnO44pS6jsBeYfS-NdLnx9-WY3AAWBdzy8RHrJfH0pGnGSAfPGwBkcKJlhH0UWJIkjAtEZC_Cc=)
12. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGZBALsZ12Nne_gXR5t7p6y6xX3miXeJeEWRobW_DeoEdvRlFWPJ_A3PX2R1I5pWBUnPiy3Wt3-STA81IChVYIH8h7VwZjppnjYtbyyYIi_FD7biTbzw6qx_1fxR0lzQmhDo6mdO6W6aqqH8-wySzRbCd-4)
13. [akizukidenshi.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF5qkRBuigM5h3dk6hiOVwyHI5w0-yjdBRdXxU60XP2qCGFIU3WdI6EJ03JgOH4oRTfebJpQyOAyt0J2ofZvZh6yRCRTdS7szIzQnHa3RuRyDuz52SS2M_yEJDBahGQbbaKGQ==)
14. [52pi.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFpO65Ts6WOagnhZhl_tuWF1xkCp3_DBiu4zndmb4xYez_tCGL8UQc-w88XzOwro7ZIzmLpSlh_a1cmiUNiXcB2knVNieyJPR1D0zWCQnPcQ4LKb8tlayLuc_xBmnQ_9ATtUZQ=)
15. [switch-science.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFmVdqrVKHX-Cqjl3BMswSIxbaKU3uA4OafE2q6KckLTYMmFO2osb3rKNpnJ6MJPBTL6J-mT2863-hZAi1nVzgGRI47xAo3EBR19S7vzSskOixKBGiwU9RniychE2Tr_nsQ5DJFuRWQexoKyKYD1ufpdt7sTHbOpzG8ETB8cu1-2vq8LjU-A6be4Fd9CdEbnKs=)
16. esp32-s3_datasheet_en.pdf (fileSearchStores/adv2026day12esp32sisters-ju6vzp26vplv)
17. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGnjFC4NkOpFiWvirjsPinfPhMHGs2sPQpB1GsiwI6CNS7GvQF-LMjBs6vpSCm9Sg1Z_linNueom1VaTRorfg3puZnjyU2bHZwa0cy7fEtD0c1ymo5ZnqoaTOu_J6dNM1P6D3kWzbz8PWNtBIAzS0Ebj7oD)
18. [adafruit.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQExoysWzTTFRUnqMp2jgXux0vPOR4JW38Ho016VFJh3HN6ufO40V_wTrZ1WT3uLA5CqYijlunkeVNrtw8ukSzLx6g8nbE1T8nvplaqN7YjpxrWGxXmE5as1tVpUwBAxTilSoJ_KG5rvsvhu13VZWaOWpIicobDFCuktba_xsLAS3Q==)
19. [electwork.net](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGwFJzVf0gXx4GRCJccIoMaysIrf7gdEacNVUE_v57WunwRCRoeXpxF29U60UxewqWzAXpD5F5aKbeQh94bsrk7y5G9w83cSSOHVeV2AqNG6B8Mq0aiFJRPkcAUwV0N7RZhSVXGAe05HfAt)
20. [jisaku.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG3-wwNYOYK7E5nzE7dDAkj2smuWrq0FLLtMmv1Is_drA1wpY5bPxds5SzioAGeJgBFQvrwLwDkEbRBXE6LG722cNwzlEb7JXMTB4JniCCk29JXURwiIo5E04QV0mD-jyALukhwYlE=)
21. [sensbench.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGlFd83hS0EKAtUqYS_0O28sBKyvpje2MVRSXuPkYQEaRyQV54npepttpKdXdlRh4HqU1d0qGkfVhlsIgxI10ngH425asNt1A9cFoiL8dv9IVaig6dOa6YngbYsa4NyHg==)
22. [seeedstudio.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHOPVYGEczQVD8kxbeERo0iGV04Obnari7Dp0DddbtOeX9GvqVmesqNgz4Mm8k7XOltMA3TnLkkTawB6qvSco1Y6MOgYugZay2bpPAHPB-lFYVCnUeiDwESu2fJnuswYHUwxmFX1oOH-u-247FG)
23. [espressif.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFxorxAsFMBioTp-IUVcYGliL1SA3txMuh0tWQjZaA9lbj7Nvy6HDuZTvXry2y50Ocj6StOSSWCAhhOAmjUom21XIJojeaxXosOC51IedFE5YH-K-WeFKQ3iiVg-h0gtTAfv9Hu0Ngah0R95WeCTZbt03F3Aox_ZeXRQ5s-jmdgSxn5csMNcwPtdYH11fI=)
24. [reddit.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEfMrm5Gd_3QhplkRtaX3qJfH-OXQYsn6ZjqG1RaJQmKkmpKnGoLLIKcV5Xd1kjZzwwZ3Diz03isvYpiYQMUYuDo67GOfWalBUgiZMGcvMqUE4uPeLSiV2eZY3H589WSshE1AYb3oi08FufKcw_g1TOT2rwlDiUIWLqoUnqnMR4Q9YnWGTZq8QyWsNASdYtovOuH-tL_L5Dyif57laY1g==)
25. [reddit.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFL7Mq2xMCt2mynGoQ5JXdme9wyMXiK616MWE2gyeNfzahUS5Du8rbFC3rmwtNocFiDpMH_MD_rJdxG1RYRMIwUgk4d7No6gibQLfU_ossQEj9lpaCyla1UvSLlSQQCrdD5i0ZxYDhsI-mXqE1HPRPQ01B0IsD-WbHc9B3QcaxSmFI4_asRlPsNsQ6sE_asQ7b7yOXxEN37E3Bs)
26. [digick.jp](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGWJ4CLEnXQ705QBviR79F2vIa7nuwW3Gh1oJzx-Bt6CA6WQX_-Nb1lMDkF-bHXfkkqNgDNt2dx7coc0V3tZBI8JQUSOQIesi3ltUQCxHiR_noxrLl-w6GigC-uZeQJblerKJmPqoM_feduUw7f5dTksRcY-BJCF_xF)
27. [hatakekara.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFt6mIXPdRzXjsDeSJIQmTkUH727akrmdyiXhscRQxBuBrZmLdvah5393VrJMshGPA9x9hxtFs4P6TGeMBNwB-B0P8Hh-pW05lhVezaDQEzlLLT9k1rehWr)
28. [lang-ship.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGawGM3MTnQP5W3xhZNaoM42YyRGvV1oAbw-LcpH1cqbvmes-X4PfQXkINDF2gu_jsVYuYelNnJ9PTF9q56aUi1wPSRFcYMqCAufAt5oB4UCWXBikvpWvnF9oPeRhXkwK9vAi59sY4=)
29. [lang-ship.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEijh7EeX-XBy5isHdV3KSyNwSl7psz0CBuTTWhMaRsf_2JOiG6LTCk_1J4T26MW0pi4TAIDZIyDSlmuGj70a_8q1VAAJUV58ZUmzvpz7fqLUkgRGQsxY8fRun641H1YQd8XDwMS6k=)
30. [randomnerdtutorials.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFegR7o345pF8dBoyNJ47azzk1dX5dD7Wgs0OcuiYB4SM0xVb41bJNQIDPGVna0ax_7hz6y3vMqlfsbBPH-gnWuM4yu-s0aLXHwm0vGqDcGy7keYH0GJo7LYJucVmFwCpQAdkszfO3OokvVAYeMofk-PICx7w==)
31. [pcbcool.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEUDYUoJXyUjjE_EVd2nPTITgBCCRdI_QlMsEWo7Sq4_zWdDhacNl1t99b_k1VOPdS6i_gxnm6kQjU6w5sWSM-DAwin5IUvH44LxuLStyToecVAwavJ1yHbbmbpwrVVknqtd1wuR6hDULTnKeChoOMHsSw4dXxy)
32. [note.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGjP4-NABvTUVqixDcOhG3-smnZK-2fsE3VnfBh9m2peOHAAMPrRgaJP68YBQ52ac1O59ZpnEOBE9Z50QGj9B_vi3anNJ5yBXuNsiNHSenn_4ALIZvMJeGtbOyHTN8=)
33. [reddit.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGKbrL0qpS8-rLgJ97UuY0V5A5rBGWli2j0axXvCsJZ6tRhZe2XJPkCFVphRnBKomnpywghofVpvofu25ytYHei7qITkkRzvHfY373wId5AG43r_MCc2AIqPtq7M6xoUixgRWNE_E01ULjOYkLElxaHFmQsA_IVBgpLaL7riiE=)
34. [engineer-go.net](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGUHjhS0YuEqD0kKuwqTTJl5zvwfHJXXSPFnf5V-xNn8ciJi0BMQi7PPdLKg74IQO9looQcGhBaRIynbABzhNtI9WOeSummplIoXJF6tLEMUqX7DSY6GLTRyjfuX4nlNE7P2ap2j8PorrL2I_NghooG2Ws=)
35. [codesprintconsulting.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHrZRTQ0ifLAM-8OSVc1nIBaJjQd7IAqBIDnV8aSobbzeHgflIYGkTs02R1wVpqSqDxR_joUuL9sgl-4KRfi8y2sOJLg_HQEiWs7DWriqZtsjUByQE3kJJmE34rrApyLAzJCTZwQZ0bzvcWL8FBgIx9_DB8SVlBK0gjIqUUW3R2gQrn)
36. [banana-pi.org](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFjeIzaWEZ2q0RzlHYn9tRdDAgAGuS4qUfdGToqNvTQqTzH3WkJTQb9rGpXQ3-9O3xi-CwuHxVkP_PB8hIzuvCTxAL0OpQd-W7HYy9X9XiXv6lcTKNiq0Z6Stc27NR47i7IJ_iyqTm22vNUgiqjK6iJCh02Ew==)
37. [reddit.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF96iVra3qz1wq6Vucxo629fHXyRkFX0kIMo-wITGuYUiSnAR_mISS_6GU0ljTv8z7NOW9K2aL3o3zv7WPHaDdFuEh6oQw5NXfXpO9Gj16ZxFeZUqPha56fYc4y9UC2nYHdXRUKasAmqDaat-XnMrz0lR2AQIpeGqi5IL9eHl-6-uPkm7rIMO0Re8mChdLoFCRl2p1O-sTjvvGxS6LG6w==)
38. [cat-one.net](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHXi7EM0JB7BxzHrUIjB3C6JyYHb9C81kHiGtVd1MhJOW_ndGgTxE6Kc6RSREGojOEWHYe-yuy1AVlEAey1yuyNkidRBEk9VhiVaDdHa0UPscWf2UBDQ3HNcyHBAeUCbKm3KXPXvX204p_QJrg8mlVpf_6K3MQWvmc5z7Ze8Zvat4YhnSpulHm_fubB4xlwQ7kZ8Ix4rRV6Ww==)
39. [lucidar.me](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFnjUMQCOyprotXfHxiAq0eINhVwxOQTp5ak8EhbfbG_aKtjQKgAtd-s03QrebYPIoQ7SPlvfm4RZPmPT_UsmhsFBTSKBKn1-9zDHUafjzshgSMGUd2YRYYcR6dh98Rco33lsnxA5q4lz5nM8kjIuI8JQSosmOUTGby5A==)
40. [seeedstudio.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFPA-PDkNqltCqDXxnkZg2QwNGYoMqOjckMfi76Jw8PJ5B0V-dXkE9-eH-pHXiKEmFShmTJkX6Y1txCD06ECKxWLn1X0AVzvmLDOLB0Y17dHKu0ZjycpDhdQ28819jJqdTWZeRN_bCy9mZ2xHb8pto=)
41. [lang-ship.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHimFgSqATI5Knz59UGqN5Y4ZtK22iISenAJP-XooFiVrB-HysHJlxEkA3UZApLcbht_AfnCNmm5EDmD0Cyvch3O9o6dg2jTkUUoR4L1wLqwzBgNyPm-B8yMS1ZaIF_EcrnS-sPZ9tN)
42. [ipros.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGljtDIb5yZU332H-vLD5LVyaR182rSCuSbkg3Zu96ji1OZc2mTiGeDNyD4hE_IGJkhO1_IjQmc-yO6ZCGq2wqQUK3vKTYHq8-SKDFkARbV7RIn_zKk6rHvfA9BumdeIPBi03--1qjL)
43. [tatepro.com](https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGyQ_qG8ATWDEV5_jAMGOsK0eKbI5QI-gM3LNA15-k9T7EJ5Zu2lSZO1LI0NjPurdBQ8Bx7CxNm95Mzdl3m0cgxs_QZ21GeSm6DUFPEt4A59eUWu1ZLsrYOOe3KL1SacA==)
