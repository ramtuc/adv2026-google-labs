import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (req, res) => {
  const hasApiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  res.json({
    status: 'ok',
    hasApiKey,
    timestamp: new Date().toISOString(),
  });
});

// Expert rule-based embedded diagnostics fallback
function generateEmbeddedFallback(logLine: string, contextLines: string[] = []): string {
  const fullText = `${logLine}\n${contextLines.join('\n')}`;

  if (/LoadProhibited/i.test(fullText)) {
    return `### 1. 🔍 エラーの意味（要約）
**Guru Meditation Error: LoadProhibited (CPU Panic)**
CPU (Xtensa / RISC-V) が**読み取り不可能なメモリアドレス**からデータを読み取ろうとしたため、致命的例外が発生しました。
レジスタダンプの \`EXCVADDR\` (例外仮想アドレス) が \`0x00000000\` または小さなオフセットの場合、**未初期化のNULLポインタ**へのデリファレンスが直接の原因です。

---

### 2. ⚠️ 考えられる主な原因
- **NULLポインタ参照**: \`malloc()\` や構造体取得関数の戻り値チェックを行わず、NULLのままメンバアクセス (\`ptr->field\`) した。
- **解放済みメモリの参照 (Use-After-Free)**: \`free()\` 済みのポインタを再度アクセスした。
- **配列の境界外読み取り (Buffer Over-read)**: ループインデックスのオーバーラン。
- **ポインタ変数の未初期化**: ローカル変数がスタック上のゴミ値を保持したままアクセスされた。

---

### 3. 🛠️ 具体的な対処法・デバッグ手順
1. **ポインタのNULLチェックを追加:**
   \`\`\`c
   if (telemetry_buffer == NULL) {
       ESP_LOGE(TAG, "Buffer pointer is NULL!");
       return ESP_ERR_NO_MEM;
   }
   \`\`\`
2. **バックトレースのアドレス特定:**
   シリアルログの \`Backtrace: 0x4200845a:0x3fc9b120 ...\` を確認し、ESP-IDFのモニタツールでクラッシュ行を特定します:
   \`\`\`bash
   idf.py monitor
   # または addr2line ツールで逆引き
   xtensa-esp32s3-elf-addr2line -pfia -e build/my_app.elf 0x4200845a
   \`\`\`
3. **Core Dump の活用 (menuconfig):**
   \`menuconfig\` -> \`Component config\` -> \`ESP32-specific\` -> \`Core dump to Flash\` を有効化すると、クラッシュ時の全スタックを後からGDBで完全解析可能です。

---

### 4. 💡 予防とベストプラクティス
- ポインタ宣言時は必ず \`NULL\` で初期化する (\`void *ptr = NULL;\`)。
- \`free(ptr);\` 直後に \`ptr = NULL;\` を代入するガード習慣をつける。`;
  }

  if (/StoreProhibited/i.test(fullText)) {
    return `### 1. 🔍 エラーの意味（要約）
**Guru Meditation Error: StoreProhibited (CPU Panic)**
CPU が**書き込み禁止領域**（Flash ROMのコード領域、constデータ領域、または未マッピングアドレス）へデータを書き込もうとしたため例外が発生しました。

---

### 2. ⚠️ 考えられる主な原因
- **constポインタの強制キャスト書き込み**: FlashやROM上の読み取り専用定数文字列を直接書き換えようとした。
- **NULLポインタへの書き込み**: \`ptr->val = 10;\` で \`ptr\` が NULL だった場合。
- **スタックポインタの破壊**: 配列オーバーフローでスタックフレームが破壊され、戻り先やポインタが不正値になった。

---

### 3. 🛠️ 具体的な対処法
1. 書き込み先バッファがヒープ(\`malloc\`)または書き込み可能RAMに配置されているか確認。
2. 文字列リテラル (\`char *s = "hello";\`) への直接書き込みを行わず、\`char s[] = "hello";\` または \`strdup()\` を使用する。
3. \`idf.py monitor\` を用いてクラッシュ発生元のファイルと行番号を特定。`;
  }

  if (/Stack canary watchpoint/i.test(fullText) || /stack overflow/i.test(fullText)) {
    return `### 1. 🔍 エラーの意味（要約）
**Guru Meditation Error: Stack canary watchpoint got triggered**
FreeRTOSタスクの**スタック領域が溢れ（スタックオーバーフロー）**、スタック末尾に配置されたカナリア値（保護ワード）が上書きされたため、セーフティ機構が作動してCPUを停止させました。

---

### 2. ⚠️ 考えられる主な原因
- **タスク作成時のスタックサイズ不足**: \`xTaskCreate()\` の \`usStackDepth\` が小さすぎる（特にWiFi, TLS, JSONパース, printfを呼ぶタスクは最低4KB〜8KB必要）。
- **大きなローカル変数のスタック確保**: 関数内で \`char buf[4096];\` などの巨大なバッファをスタックに定義している。
- **深い再帰呼び出し**: 再帰が想定より深く実行された。

---

### 3. 🛠️ 具体的な対処法
1. **タスクのスタックサイズを拡張する:**
   \`\`\`c
   // 変更前: 2048 (2KB) -> 変更後: 4096 (4KB) または 8192 (8KB)
   xTaskCreate(my_task, "my_task", 4096, NULL, 5, NULL);
   \`\`\`
2. **スタック残り容量の監視:**
   \`uxTaskGetStackHighWaterMark(NULL)\` を定期的にログ出力し、最小空きワード数が512以上を保っているか監視する。
3. **巨大バッファをヒープに移動:**
   \`char *buf = malloc(4096);\` を使用し、処理終了後に \`free(buf);\` する。
4. **menuconfig 設定:**
   \`CONFIG_ESP_MAIN_TASK_STACK_SIZE\` を \`4096\` または \`8192\` に増やす。`;
  }

  if (/BROWNOUT_RESET|Brownout detector/i.test(fullText) || /rst:0xf/i.test(fullText)) {
    return `### 1. 🔍 エラーの意味（要約）
**電源電圧低下リセット (Brownout Detector Reset / rst:0xf)**
ESP32-S3の内部Brownout検出回路が、Vdd電源ピンの電圧が安全動作閾値（通常約 2.43V 〜 2.8V）を下回ったことを検知し、CPUの暴走を防ぐためにハードウェアリセットをトリガーしました。

---

### 2. ⚠️ 考えられる主な原因
- **WiFi / Bluetooth 送信時の突入電流**: 電波送信開始時に瞬間的に 300mA 〜 500mA 以上のピーク電流が流れます。
- **細い・長いUSBケーブル**: 導線抵抗による電圧降下（IRドロップ）。
- **PCの非給電USBハブ**: 電流供給能力が不足している。
- **デカップリングコンデンサの容量不足**: ESP32モジュールの 3.3V-GND 間のパスコンが不足。

---

### 3. 🛠️ 具体的な対処法
1. **ハードウェア対策 (最も効果的):**
   - 3.3V と GND ピンの直近に **100µF 〜 470µF の電解コンデンサ** または低ESRセラミックコンデンサを追加する。
   - USBケーブルを太く短い高品質なデータケーブルに変更する。
   - セルフパワー（ACアダプタ付き）のUSBハブや外部安定化電源（3.3V 1A以上）を使用する。
2. **ファームウェア対策 (一時回避):**
   - WiFi送信出力を一時的に下げる: \`esp_wifi_set_max_tx_power(50);\` (50 = 12.5dBm)
   - \`menuconfig\` -> \`Component config\` -> \`ESP32S3-specific\` -> \`Hardware Brownout Reset\` の検知電圧レベルを下げる（※根本解決ではないためハードウェア改善を推奨）。`;
  }

  if (/TG0WDT_SYS_RESET|task_wdt|rst:0x7/i.test(fullText)) {
    return `### 1. 🔍 エラーの意味（要約）
**Task Watchdog Timer タイムアウト (TWDT Reset / rst:0x7)**
FreeRTOSの優先度が高いタスクがCPUを長時間占有し続け、Watchdogの定期リセット（犬の餌やり）またはIDLEタスクの実行がタイムアウト（デフォルト5秒）以内に完了しなかったため、強制リセットされました。

---

### 2. ⚠️ 考えられる主な原因
- **無限ループ内に待機処理がない**: \`while(1) { ... }\` ループ内に \`vTaskDelay()\` やセマフォ待ちがない。
- **重い暗号処理や計算**: ビジーウェイトでCPUをCore 0/1で100%消費している。
- **デッドロック**: 複数のタスクがミューテックスを互いに待機し合っている。

---

### 3. 🛠️ 具体的な対処法
1. ループ内に最低 1 tick の遅延を挿入し、IDLEタスクにCPU権を譲渡する:
   \`\`\`c
   while (1) {
       process_data();
       vTaskDelay(pdMS_TO_TICKS(10)); // 10ms遅延
   }
   \`\`\`
2. 必要に応じてタスク内で明示的にWDTをリセットする:
   \`esp_task_wdt_reset();\`
3. \`menuconfig\` -> \`ESP System Settings\` -> \`Initialize Task Watchdog Timer\` でタイムアウト秒数を調整。`;
  }

  if (/rst:0x1/i.test(fullText)) {
    return `### 1. 🔍 ログの意味（要約）
**POWERON_RESET (電源投入リセット / rst:0x1)**
ESP32に電源が投入されたこと、またはENピンがリセット解除されたことによる**正常な起動**ログです。エラーではありません。

---

### 2. 💡 ポイント
- \`boot:0x13 (SPI_FAST_FLASH_BOOT)\`: 通常のSPI Flashからのアプリケーション起動モードを示しています。
- ダウンロードモードで起動したい場合は、IO0 (DTR) を LOW に保持したまま EN (RTS) を立ち上げます (\`boot:0x3\`)。`;
  }

  if (/esp_tls|SSL_HANDSHAKE|0x2700/i.test(fullText)) {
    return `### 1. 🔍 エラーの意味（要約）
**TLS/SSL ハンドシェイク失敗 (ESP_ERR_MBEDTLS_SSL_HANDSHAKE_FAILED)**
MQTT(S) や HTTPS 接続時の TLS 暗号化ハンドシェイクにおいて、サーバー証明書の検証失敗または暗号スイートの不一致が発生しました。

---

### 2. ⚠️ 考えられる主な原因
- **ESP32の内部時計 (SNTP) が未同期**: 証明書の有効期限（Not Before / Not After）を検証する際、ESP32の時刻が1970年（UNIXエポック）のままだと期限外として拒絶されます。
- **CAルート証明書の不一致**: サーバーのCA証明書が古い、またはコード内に埋め込んだPEM証明書と合致していない。
- **メモリ不足**: TLSハンドシェイクには通常30KB〜50KB以上の空きヒープが必要です。

---

### 3. 🛠️ 具体的な対処法
1. TLS接続を行う前に必ず **SNTP 時刻同期** を完了させる:
   \`\`\`c
   esp_sntp_setoperatingmode(SNTP_OPMODE_POLL);
   esp_sntp_setservername(0, "pool.ntp.org");
   esp_sntp_init();
   \`\`\`
2. サーバーの最新ルートCA証明書をPEM形式でプロジェクトの \`main/certs/\` に配置し、CMakeLists.txt の \`EMBED_TXTFILES\` で埋め込む。`;
  }

  // General fallback
  return `### 1. 🔍 ログ・エラーの分析
対象ログ: \`${logLine}\`

ESP32-S3 / ESP-IDF のログ出力を検知しました。

### 2. ⚠️ 推奨される確認項目
- **ESP-IDF エラーコード検索**: \`0x3000\` 番台は WiFi/TCP、\`0x2000\` 番台は TLS/暗号、\`0x100\` 番台は基本システムエラー (\`ESP_ERR_NO_MEM: 0x101\`, \`ESP_ERR_INVALID_ARG: 0x102\`) です。
- **Backtrace の有無**: パニック発生時は \`Backtrace: 0x4...\` 行を \`idf.py monitor\` または \`addr2line\` でソースコードの行番号に変換してください。
- **空きヒープの監視**: \`esp_get_free_heap_size()\` を確認してください。`;
}

// AI analysis endpoint for ESP32 serial errors & logs
app.post('/api/analyze-error', async (req, res) => {
  try {
    const { logLine, contextLines = [], detectedType = 'general', customQuestion = '' } = req.body;

    if (!logLine && (!contextLines || contextLines.length === 0)) {
      return res.status(400).json({ error: 'ログ行またはコンテキストが指定されていません。' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const hasValidApiKey = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY');
    console.log('[API] hasValidApiKey:', hasValidApiKey);

    // If Gemini API key is available, call Gemini 3.8 Flash
    if (hasValidApiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
            timeout: 120000,
          },
        });

        const contextFormatted = Array.isArray(contextLines) && contextLines.length > 0
          ? `\n### 前後のシリアルログ (コンテキスト):\n\`\`\`text\n${contextLines.slice(-15).join('\n')}\n\`\`\``
          : '';

        const questionFormatted = customQuestion
          ? `\n### ユーザーからの追加質問:\n${customQuestion}\n`
          : '';

        const prompt = `あなたは組み込み開発およびESP32-S3、ESP-IDF (Espressif IoT Development Framework)、FreeRTOSのシニアエキスパートエンジニアです。
ユーザーがESP32-S3のシリアルログで以下の行・エラーを検出しました。このログについて、エンジニア向けに実践的かつ明確に日本語で解説してください。

### 対象のログ行:
\`\`\`text
${logLine || '(前後のログを参照)'}
\`\`\`
${contextFormatted}
${questionFormatted}

### 回答フォーマット（Markdown形式）:
以下の構成で日本語で具体的に回答してください:
1. **🔍 エラー・ログの意味（要約）**
   - このログが表している現象（CPU panic、Guru Meditation、リセット要因、通信エラー、メモリ不足など）を端的に説明。
2. **⚠️ 考えられる主な原因**
   - ソフトウェア要因（NULLポインタ、スタックオーバーフロー、FreeRTOSタスクのCPU占有/WDT、境界外アクセスなど）
   - ハードウェア・電源要因（Brownout/電圧ドロップ、不適切なプルアップ、ノイズなど）
3. **🛠️ 具体的な対処法・デバッグ手順**
   - ソースコードでのチェック箇所（修正例コードがあれば短く提示）
   - バックトレースの復元手順（\`idf.py monitor\` や \`addr2line\` の使用法）
   - ESP-IDFの \`menuconfig\` での設定見直し項目
4. **💡 予防とベストプラクティス**
`;

        const systemInstruction = `あなたはESP32、ESP32-S3、ESP-IDF、FreeRTOSのファームウェア開発のシニア組み込みエンジニアです。
ESP32特有のエラー（Guru Meditation Error: LoadProhibited/StoreProhibited/Stack canary watchpoint/Interrupt wdt timeout, rst:0x1/0x3/0xf BROWNOUT_RESET/0x7 TG0WDT, esp_err_tコード、Backtraceなど）の内部動作を熟知しています。
専門用語を正確に使いつつ、親切で論理的な日本語で回答してください。`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction,
          },
        });

        const analysis = response.text || '解析結果を取得できませんでした。';

        return res.json({
          success: true,
          analysis,
          detectedType,
          poweredBy: 'gemini-3.8-flash',
        });
      } catch (geminiError: any) {
        console.error('Gemini API call failed:', geminiError);
        return res.status(500).json({
          error: `Gemini API による解析に失敗しました: ${geminiError?.message || geminiError}`,
        });
      }
    }

    return res.status(500).json({
      error: 'GEMINI_API_KEY が設定されていません。AI Studio の Secrets パネルで API キーを設定してください。',
    });
  } catch (error: any) {
    console.error('Analysis endpoint error:', error);
    const message = error?.message || 'エラー解析中に問題が発生しました。';
    return res.status(500).json({ error: message });
  }
});

// Vite middleware in dev, static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
