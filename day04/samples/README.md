# Day 4 Gemini Notebook（旧 NotebookLM）Studio の出力サンプル

ESP32-S3 データシート v2.2 の PDF 1件だけを入れたノートブックで、Gemini Notebook の Studio から生成・ダウンロードしたものです（2026年11月4日、Google AI Pro、言語は日本語を指定）。
**AI が生成したもので、Espressif の公式資料ではありません。** 数値には誤りを含むことがあります。

| ファイル | 機能 | 内容 | データシートとの照合 |
| --- | --- | --- | --- |
| [datatable_current.xlsx](datatable_current.xlsx) | Data Table | 消費電流の表（Wi-Fi・BLE 動作時、Modem-sleep、Light-sleep、Deep-sleep）。「モード」「条件」「値」「単位」「表番号」の列を指定して作成 | 表 5-7〜5-10 の値はすべて一致 |
| [datatable_variants.xlsx](datatable_variants.xlsx) | Data Table | 型番ごとの内蔵フラッシュ・PSRAM・温度範囲・VDD_SPI・リビジョンの比較表（説明を入れずに作成） | 表 1-1 とすべて一致 |
| [infographic_soc_overview.png](infographic_soc_overview.png) | インフォグラフィック | 「ESP32-S3 SoC 機能概要ガイド」1枚 | 確認した値はすべて一致 |
| [slides_soc_blueprint.pptx](slides_soc_blueprint.pptx) | スライド資料 | 「ESP32-S3 SoC Blueprint」14枚（各スライドは1枚の画像） | 2枚目の「Camera (DVP/MIPI CSI)」は誤り（ESP32-S3 は DVP のみ）。表紙などに描かれたロゴは生成画像の一部。最後のスライドの QR コードは見た目だけで、スマートフォンでも OpenCV でも読み取れない |
| [video_dual_core.mp4](video_dual_core.mp4) | 動画解説（短め） | 「ESP32-S3 のデュアルコアを支える『割込み』の仕組み」1分17秒、縦長 | 割込み信号源 99 種類、CPU ごとに 26 個は p.42 どおり。割込みを「タスク」と呼んでいる点と、CPU0/CPU1 の役割分担の例は資料にない |
