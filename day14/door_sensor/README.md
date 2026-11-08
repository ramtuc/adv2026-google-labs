# 電池で動くドアセンサー（ESP-IDF）

ESPr Developer S3 Type-C（ESP32-S3-WROOM-1-N16R8）で動く、Deep-sleep で電池を長持ちさせるドアセンサーです。

- 10 分ごと、呼び出しボタン、ドアノブのタッチで起きる
- 起きたら電池の電圧とドアの開閉を読み、ログに出してまた寝る
- 起きた回数とドアの前回の状態は RTC メモリに残す

## 配線（ESPr Developer S3 Type-C / ESP32-S3-WROOM-1-N16R8）

| 部品 | ピン | メモ |
| --- | --- | --- |
| 呼び出しボタン | GPIO10 | 押すと LOW（RTC GPIO、EXT0 ウェイクアップ・内部プルアップ） |
| ドアのリードスイッチ | GPIO11 | 10kΩ で 3.3V に外部プルアップ（内部プルアップ併用）。閉じると LOW |
| 電池の電圧 | GPIO8（ADC1_CH7） | 100kΩ ＋ 100kΩ で 1/2 に分圧 |
| タッチパッド | GPIO4（T4） | ドアノブに貼った銅箔につなぐ（TOUCH_PAD_NUM4） |

- ESP32-S3-WROOM-1-N16R8 では GPIO33〜37 が内蔵 Octal PSRAM で使用されているため使用不可
- ESP32-S3 の RTC GPIO（EXT0 ウェイクアップ対応）は GPIO0〜21、ADC1 は GPIO1〜10、タッチパッドは GPIO1〜14（T1〜T14、T0 は内部デノイズ専用）

## ビルド

ESP-IDF v5.5.3 で確認しています。

```
idf.py set-target esp32s3
idf.py build
idf.py -p COM5 flash monitor
```

## テスト

PC 上で動くホスト単体テストと、実機（ESP32-S3 / COM5）およびビルド済み ELF バイナリを検証するテストの 2 種類を用意しています。

### 1. ホスト単体テスト（PC 上で実行・実機不要）

`door_sensor.c` の純粋関数・設定検査に加え、ESP-IDF モック環境（`test/mocks/`）で `main.c`（`app_main`）を直接コンパイル・実行し、以下を検査します。

- 起動理由の判定、電池電圧への換算、ドア開閉状態の変化判定
- ESP32-S3（N16R8）向けピン・定数の妥当性（タッチしきい値が `15` のように低すぎる設定の拒否を含む）
- `boot_count` と `last_door` に `RTC_DATA_ATTR` が付与され、Deep-sleep からの起床後に `起動 2 回目（タッチ）`・`起動 3 回目（ボタン）` とカウントアップすること（`RTC_DATA_ATTR` が外れて毎回 `1 回目` に戻るバグの検出）
- ドアピン（`GPIO11`）の内部プルアップ（`GPIO_PULLUP_ENABLE`）が有効化されていること
- タイマー・EXT0 ボタン・タッチパッド（`esp_sleep_enable_touchpad_wakeup`）の 3 系統すべてが Deep-sleep 前に有効化されていること

```powershell
powershell -ExecutionPolicy Bypass -File test\run_host_tests.ps1
```

### 2. 実機・ELF バイナリテスト（COM5 に接続した ESP32-S3 で実行）

ビルド済み `build/door_sensor.elf` の構造・シンボル・機械語検査（4 項目）と、実機のシリアル出力検査（6〜7 項目）を実行します。

```powershell
# 自動モード（ELF 検査 4 項目 ＋ 実機シリアル検査 6 項目）
C:\Espressif\tools\python\v5.5.3\venv\Scripts\python.exe test\test_device.py -p COM5

# 対話モード（上記 10 項目に加え、Deep-sleep 中に GPIO4 を指で触って「起動 2 回目（タッチ）」を確認）
C:\Espressif\tools\python\v5.5.3\venv\Scripts\python.exe test\test_device.py -p COM5 --interactive
```

#### 実機の物理動作だけで 4 つのバグをすべて検出するための配線と操作手順

`test_device.py` は ELF 解析によって無配線・無操作でも 4 つのバグを自動検出しますが、**実機の物理的な電気・センサー挙動だけ**でも確実に検出するには、以下の配線と操作を行ってください。

1. **ドアのピン（`GPIO11`）の内部プルアップ外れを実機で検出する配線**
   - **`GPIO11`（11 番ピン）と `GND` の間に `100 kΩ〜470 kΩ`（例: `220 kΩ`）の抵抗**をつなぎます（リードスイッチは開いた状態にします）。
   - **理由**: ピンが完全に未接続（フローティング）だと、内部プルアップを外しても残留電荷で偶然 `HIGH（開）` と読めることがあります。ESP32-S3 の内部プルアップ（約 `45 kΩ`）が有効なら分圧により約 `2.7 V`（`HIGH` = `ドア 開`）になりますが、内部プルアップが外れると `220 kΩ` 抵抗によって `0 V`（`LOW` = `ドア 閉`）に引かれ、テスト項目 7（`ドア 開` の確認）が FAIL します。
2. **タッチしきい値の低下（`1500` → `15`）を実機で検出する配線**
   - **`GPIO4`（4 番ピン）に `15〜30 cm` 程度のジャンパ線（またはドアノブ用の銅箔）**をつなぎ、最初は手を触れずに離しておきます。
   - **理由**: 基板のピン単体では寄生容量が小さくノイズ変動が `15` 未満に収まることがありますが、実運用と同じく配線（アンテナ）がつながっていると環境ノイズでカウントが `15` 以上変動し、Deep-sleep 直後に触っていないのに誤起床してテスト項目 10（非接触時の誤ウェイクアップなし）が FAIL します。
3. **`esp_sleep_enable_touchpad_wakeup` 削除・`boot_count` の `RTC_DATA_ATTR` 外れを実機で検出する操作**
   - `--interactive` を付けて実行し、`>>> [操作してください] ... GPIO4（4 番ピン）に指で触れて、タッチで Deep-sleep から起こしてください...` と表示されたら、**20 秒以内に `GPIO4` のジャンパ線（または 4 番ピン）に指で触れます**。
   - **理由**:
     - `esp_sleep_enable_touchpad_wakeup()` が消されていると、触っても Deep-sleep から起きずタイムアウトしてテスト項目 11 が FAIL します。
     - `boot_count` から `RTC_DATA_ATTR` が外れていると、Deep-sleep から起きたときのログが `起動 2 回目（タッチ）` ではなく `起動 1 回目（タッチ）` になり、テスト項目 11 が FAIL します。
