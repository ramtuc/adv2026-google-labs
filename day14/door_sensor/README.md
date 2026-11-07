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
