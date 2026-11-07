# Day 8 Google AI Studio Build モードで作ったアプリ

[`ai_studio_app/`](ai_studio_app/) は、Google AI Studio の Build モード（Antigravity Agent、Gemini 3.8 Flash）が作った「ESP32-S3 Web Serial Log Analyzer」を、Export → Download as .zip で書き出したものです（2026年11月7日）。**AI が生成したコードで、手は加えていません。**

書き出したのは、記事の中で次の2つを直させた **あとの版** です。

| 箇所 | 最初の版 | この版 |
| --- | --- | --- |
| `metadata.json` の `requestFramePermissions` | `[]`（プレビューで Web Serial が使えない） | `["serial"]` |
| `server.ts` の `httpOptions.timeout` | `12000`（Gemini 3.8 Flash の応答が間に合わず 504） | `120000` |
| `server.ts` の Gemini が失敗したとき | 決め打ちの説明（`generateEmbeddedFallback`）に切り替える | エラーを返す（`generateEmbeddedFallback` 関数自体は残っている） |

`generateEmbeddedFallback` の説明には、ESP32-S3 では誤りの `boot:0x13 (SPI_FAST_FLASH_BOOT)`（初代 ESP32 の値。ESP32-S3 では `0x8`）が含まれています。

## 手元で動かす

```bash
cd day08/ai_studio_app
npm install
# .env.local に GEMINI_API_KEY=自分のキー を書く
npm run dev
```

Web Serial は Chrome / Edge（パソコン版）で、`localhost` か HTTPS のページでだけ使えます。
