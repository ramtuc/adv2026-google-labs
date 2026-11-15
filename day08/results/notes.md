# Day 8 メモ（2026-11-14）

## 入り口（aistudio.google.com/apps）
- モデル表示：Gemini 4 Hydrogen（「Introducing Gemini 4 Hydrogen / Now available for everyone」）
- モード：DEFAULT（Make changes right away）／PLAN／MAX のスライダー
- 例のボタン：Build an Android app、Google Maps、Create a game、Three.js 3D scenes、Build an XR Blocks app
- 足せる機能：Drive・Sheets・Gmail・Calendar・Docs・Slides・Tasks・Chat・Forms・Keep・Meet・Contacts、TTS、音楽生成、DB と認証、SQL、画像生成・編集、声の会話、画像→動画、Google 検索・Maps のデータ、チャットボット、テキスト→動画、画像・動画の解析、文字起こし、high thinking など

## 1 本目：絵本メーカー（DEFAULT）
- 指示（6 行）を 11:45:47 に送信
- 24 秒で停止：「挿絵の画像生成および BGM の音楽生成機能を利用するため、有料 API キーの選択・設定をお願いします」＋「Upgrade to a paid API key」パネル
- 筆者が有料キーをつなぐ → 自動で「Paid API key setup confirmed, continue setting up the app.」 → 3 分 27 秒で完成「ことのは絵本工房」
- 12 ファイル。React + Express（server.ts）。キーはサーバー側（GEMINI_API_KEY、Secrets）
- 使うモデル：文章 gemini-4-hydrogen、挿絵 gemini-3.1-flash-lite-image、TTS gemini-3.8-flash-lite-tts、BGM lyria-3-clip-preview
- エージェントの確認：compile_applet（Vite ビルド）と lint_applet（tsc --noEmit）だけ
- トップの飾りの絵（本と机）はエージェントが生成した画像（src/assets/images/hero_storybook_desk_*.jpg）
- 「雨の日に傘をなくしたカエル」→「あめのひの あかいかさ」約 40 秒
  - 挿絵 4 枚は同じカエル（黄色のレインコート、水玉の長靴）。3 ページの「アリやてんとうむし」も絵にいる
  - 1 ページ目：傘立てに（白っぽい）傘がささっているのに、本文は「どこにもみあたりません」
- エラー：TTS 4 本すべて 400（Unknown name "speechMetadata"／"speechConfig"）、BGM 404（lyria-3-clip-preview is not found for API version v1）
- 画面：理由は出ない。1 ページ表示は「このページをよむ」の代わりに「音声をつくり直す」、BGM は再生ボタンの代わりに「BGMをつくり直す」。一覧表示の「ここからよむ」は押しても何も起きない。narrationError / bgmError は保存されるが表示されない
- 「2 errors running the code」→ Fix → 「Fix the errors in the app」1 分 44 秒。server.ts を 1 つ直す
  - 説明：@google/genai v3.3.0 の既定の API バージョンが v1 → apiVersion 'v1beta' を指定
  - さらに TTS は v1beta+speechMetadata → v1alpha+speechMetadata → v1beta なし、の黙ったフォールバック（ログなし）
  - 確認はまたビルドと型だけ
- 直した後：「音声をつくり直す」で音声ができ、「BGMをつくり直す」で BGM ができた
- check_tts.py：v1 は 400、v1beta / v1alpha は speechMetadata 付きで通る、v1beta なしも通る → 1 段目で成功する。フォールバックは不要

## 2 本目：金魚すくい（DEFAULT と MAX、同じ指示）
- 指示：縁日の金魚すくい。マウス／タッチでポイ、お椀に入れる、水に入れている時間が長いと破れる、60 秒、スマホでも
- DEFAULT：12:04:24 送信 → 3 分 57 秒、8 ファイル（types / sound / engine / renderer / KingyoGame.tsx）。金魚 5 種、ポイ 3 本、効果音、自己ベスト。確認はビルドのみ
- MAX：12:09:47 送信 → 13 分 13 秒、13 ファイル（rules.ts / rules.test.ts を分けた）
  - 途中の表示：Quantifying Frame Render Time、Optimizing Canvas Redrawing、Using browser
  - 「Used browser, took 6 screenshots and recorded 1 video」
  - ユニットテスト 7 件（npx tsx --test rules.test.ts）、ビルド、型
  - Playwright でデスクトップ 1440×900 とモバイル 390×844 を確認、水槽の上枠と HUD の重なり・モバイル HUD の文字の重なりを見つけて直し、再確認
  - 追加：連続キャッチのコンボ、終了時の内訳と縁日ランク、一時停止（P / Esc）、Enter / Space で開始
- 自動操作でのすくいは失敗（0 匹）。遊び心地は人が触って確かめる

## 3 本目：ひとこま（Android、DEFAULT）
- 指示：1 日 1 枚の写真と一言（140 字）、カメラか写真から、カレンダー、端末内だけに保存
- 「Build an Android app — Create a native app with Kotlin and the Android SDK」
- 12:13:32 送信 → 8 分 23 秒、26 ファイル。Kotlin / Jetpack Compose / Room、Photo Picker、allowBackup="false"
- DEFAULT でも gradle :app:testDebugUnitTest（Robolectric）を実行して通した（Web の DEFAULT はビルドだけだった）
- 説明が 2 回続けて出た（「テストの実行完了を待っています」のあと同じ内容をもう一度）
- プレビューはブラウザ内の Android エミュレーター（戻る・ホーム・回転・音量のボタン、Install ボタン）
- エミュレーターの時計は米国太平洋時間：ログは 11-14 03:24（UTC）、画面は 7:24 で、アプリの「今日」は 2026-11-13（金）。日本で試すと「今日」が前日になる
- カメラ：Android の権限ダイアログ（While using the app / Only this time / Don't allow）→ 仮想カメラ（ドット絵の家）で撮影できた
- 文字入力はエミュレーターに遅れて届き、141 文字打って 128 文字しか入らなかった
- 「保存する」を 4 回押しても画面が変わらず、エラーもなし。canSave の条件は満たしている。タップが届いていないのか、アプリの不具合か、決めきれず
- 筆者が遊んだ感想：金魚すくいは「良い感じ」（DEFAULT・MAX の差は要確認）
- 筆者が触っても、ひとこまは写真撮影まではできるが保存に失敗 → アプリの不具合
- 12:5x 頃、Build のチャットに「保存されない。直して。どう確かめたかも教えて」と送る（直し方は書かない）
- 1 回目の送信は「Canceled / The task was canceled.」（原因不明。マウスが Cancel generation の上にあった）→ 同じ文を再送
- 直す作業：5 分 11 秒、4 ファイル（PhotoStorageManager.kt / HitokomaApp.kt / EntryEditorSheet.kt / 新規 CameraSaveCujTest.kt）
  - 原因 1：inJustDecodeBounds = true の BitmapFactory.decodeStream は常に null を返すのに、`?: throw` で失敗扱い → 保存は必ず失敗
  - 原因 2：SnackbarHost が編集画面のオーバーレイの下にあり、エラーが見えなかった
  - 確かめ方：「この開発環境では実機エミュレータや ADB 操作を利用できない」ため Robolectric + Compose UI テスト 2 本（保存の流れ、存在しない URI でエラー表示）とビルド
  - 最初の版の Robolectric テストも「保存・削除の検証が成功」と報告していた → 同じ環境のテストでは保存の失敗が出なかった
- 直した版を筆者が実機（Android）で試して、保存できた

## 公式の説明（2026-11-14 に読んだ）
- https://aistudio.google.com/docs/aistudio-build-mode
  - 公開（Cloud Run）：キーはサーバー側に入り、ブラウザ側のコードには入らない。「The deployed app will use your API key for all users' Gemini API calls.」→ 見た人の生成も持ち主のキー
  - 共有：ほかの人はキーを見られないが使える。「API calls count toward your usage limits.」「If you use paid models, costs may apply.」
  - 有料キーが要る機能（画像・音楽・TTS）の説明はない（アプリの中では 24 秒で求められた）
  - 公開したアプリの振る舞いとデータの責任は持ち主。悪用を防ぐ仕組みは自分で入れる
- https://aistudio.google.com/docs/aistudio-deploying：公開は課金の有効な Cloud プロジェクト。Starter Tier は 2 アプリまで無料（Workspace アカウントなどは対象外）
- https://aistudio.google.com/docs/aistudio-android
  - 実機へは「Install on Device」：WebUSB、USB デバッグ、USB ケーブル。手元に ADB は要らない
  - ブラウザのエミュレーターでは「カメラ・写真の撮影は使えない」と書いてあるが、今回は仮想カメラ（ドット絵の家）で撮影できた → 文書と実物が食い違う
  - Android アプリはクライアント側だけ。Secrets はWeb アプリのみ
- 実機への入れ方：画面右上の「Install」ボタン。スマホを開発者モードにして USB デバッグを ON にした（WebUSB）
