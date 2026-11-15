Stitch の MCP から、プロジェクト「Sketch to App UI」の画面「我が家の植物 - 水やり管理」を取ってきて、このフォルダに、実際に動く Web アプリとして作ってください。

守ること
- Stitch の MCP は、読むだけの道具（list_projects、list_screens、get_screen、download_file）だけを使う。画面を作り直したり、デザインシステムを変えたり、プロジェクトを消したりしない
- 見た目（配色、配置、部品）は Stitch のデザインに合わせる
- 外部のものを一切読み込まない（CDN、Web フォント、外部画像、アイコンフォントを含む）
- ファイルは www/ に置く。HTML・CSS・JavaScript だけで作り、ビルドの道具は使わない
- データはブラウザの localStorage に保存する
- 確かめは `uv run python -m http.server -d www 8000` で行う（http://127.0.0.1:8000/）
- コミット、push はしない
