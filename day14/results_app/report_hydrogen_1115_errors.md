# Gemini アプリ Deep Research（Hydrogen、11-15）のレポート：誤り・要注意として挙げた出典

チャット https://gemini.google.com/app/ddf6018db703cfe2 、12:57 ごろ開始 → 13:06 完了（約 10 分）。
題「ESP32-S3の主要仕様に関するWeb記載値と公式データシートの照合分析」。出典は「使用」約 75、「使用されなかった」約 120。

## 正解値（レポートの冒頭）

SRAM 512 KB（＋RTC 16 KB）、Xtensa LX7 デュアルコア 240 MHz＋ULP、GPIO 45 本（WROOM-1 は最大 36 本）、Deep-sleep 7 µA（RTC メモリのみ）／8 µA（＋RTC 周辺）、Bluetooth 5（LE）＋Mesh、Classic 非対応。
「C6 との取り違えは確認されなかった」と結論。

## 誤り・要注意として挙げた出典（表から抜粋。判定はレポートの言葉）

| 出典 | URL | 記載値 | レポートの判定 |
| --- | --- | --- | --- |
| Qiita：Bluetooth シリアル通信 | https://qiita.com/nak435/items/cbc6c2d3c969006984da | Bluetooth Classic 対応 | 誤（初代との取り違え） |
| 楽天市場：and-u-online | https://item.rakuten.co.jp/and-u-online/s-b0cjjksn4f-20260605/ | Bluetooth 4.2 (LE) | 誤（初代の 4.2） |
| Yahoo!：zebrand-shop | https://store.shopping.yahoo.co.jp/zebrand-shop/2b6v65vs90.html | Xtensa LX6、Bluetooth 4.2 | 誤（旧テンプレートや別モデル混在の可能性あり） |
| Yahoo!：inter-trade | https://store.shopping.yahoo.co.jp/inter-trade/b0h5bp4j81/free-space/ | 34 GPIO | 要注意／誤 |
| Yahoo!：ymsparts | https://store.shopping.yahoo.co.jp/ymsparts/yms-esp32sets1.html | 520 KB | 誤／要注意 |
| YouTube：ESP32-S3-CAM Guide | https://www.youtube.com/watch?v=6ikHzCx1W-8 | 520 KB | 誤 |
| GitHub：ESP-IDF #10281 | https://github.com/espressif/esp-idf/issues/10281 | 520 KB | 誤 |
| YouTube：ESP32 vs C3 vs S3 | https://www.youtube.com/watch?v=e_J8qkTie4o | 400 KB | 誤（C3 の値） |
| LinuxHint | https://linuxhint.com/difference-between-esp32-s3/ | 45 本／26 本 | 一部誤（自己矛盾） |
| Qiita：ESP32 比較表 | https://qiita.com/makomako0829bump/items/34de0a182a3fa3f24727 | GPIO 44、ROM 512 KB | 一部誤 |
| zbotic.in | https://zbotic.in/esp32-s3-vs-esp32-c3-which-new-esp-chip-to-choose/ | 44 GPIO | 一部誤 |
| YouTube：DevKitC-1 Review | https://www.youtube.com/watch?v=8fwo4vPy_os | 44 GPIO | 一部誤 |
| YouTube Shorts：Waveshare Zero | https://www.youtube.com/shorts/UcwRpC15Zd4 | 24 GPIOs | 一部誤 |
| ESPboards：YD-ESP32-S3 | https://www.espboards.dev/esp32/yd-esp32-s3/ | Bluetooth 5.4 LE | 一部誤 |
| PCBWay Blog | （PCBWay の ESP32 vs ESP32-S3） | around 10 µA、両方 BLE 5 | 一部誤 |
| Zenn：スマートウォッチ電源解析 | https://zenn.dev/maruhana/articles/smartwatch-residual-current-rails | チップ単体 約 10 µA | 不正確 |
| YouTube（3 本） | watch?v=h1GjVY7Oxec、shorts/eNPwcufop4k、watch?v=82UMfU77mq4 | 10 µA | 不正確 |
| Reddit r/esp32 | （Heltec ボードの広告 10 µA） | 10 µA | 不正確／乖離 |

ほかに「ボード実装値」（XIAO の 14 µA：Seeed Wiki、スイッチサイエンス、マルツ、千石、モノタロウ、秋月）と、「正確」とした出典（denshi.club、lang-ship、electwork.net、yamadori.app、Random Nerd Tutorials、Qiita Kurogara、CodeSprint、CircuitState、スイッチサイエンス、千石、YouTube 2 本、Seeed Wiki BT FAQ）を分けて並べている。
