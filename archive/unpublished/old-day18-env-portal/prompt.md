Stitch の MCP から、プロジェクト「ESP32 環境センサー管理画面」の 3 つの画面（ダッシュボード、Wi-Fi 設定、省電力設定）を取ってきて、このフォルダのファームウェアに管理画面として組み込んでください。

この画面は ESP32-S3 のフラッシュに入れ、ESP32 自身がアクセスポイント（http://192.168.4.1/）として配信します。スマートフォンはインターネットにつながりません。

守ること
- Stitch の MCP は、読むだけの道具（list_projects、list_screens、get_screen、download_file）だけを使う。画面を作り直したり、デザインシステムを変えたり、プロジェクトを消したりしない
- 見た目（配色、配置、部品）は Stitch のデザインに合わせる
- 外部のものを一切読み込まない（CDN、Web フォント、外部画像、アイコンフォントを含む）
- 画面のファイルは www/ に置く。firmware/pack_www.py で gzip にし、firmware/main/CMakeLists.txt と firmware/main/main.c に登録する
- 表示する値は ESP32 の API から取る（API の形は firmware/main/main.c と mock_server.py にある）。値を HTML に直接書かない
- 電池は 3000 mAh、Deep-sleep 中の消費電流は 7 µA（ESP32-S3 データシートの値）。省電力設定の画面に、Deep-sleep のまま眠り続けた場合に電池が何年もつかを表示する
- 確かめは `uv run mock_server.py www` で行う（http://127.0.0.1:8080/）
- コミット、push はしない。ESP32 への書き込みもしない
