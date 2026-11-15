# Day 9（作り直し）メモ 2026-11-14

## 入り口
- 始め方のカード：気軽に曲を作ろう／動画用の音楽制作／ボーカル曲の制作／未発表曲をリミックス／プラグイン・楽器制作
- 左メニュー：Songs、Playlists、Spaces、Music videos、Projects、Profile、Turntable
- 入力欄の設定：Customize Producer（Progress, memories, and more）、Instrument＝Lyria 3.5、Ghostwriter＝Standard、Producer＝Standard
- 「Grant access to your Google One subscription to use your benefits」の帯 → 筆者が許可。アカウント表示が PLUS に
- 「プラグイン・楽器制作」を押すと、その場で依頼文が自動送信され、Producer が VST/AU の案を 4 つ（Lo-Fi VHS & Cassette Texture、Analog warm overdrive & saturation、80s Cyberwave Poly Synth、808 & Vinyl Drum Engine）

## 1. ボーカル曲「初雪のベンチ」
- 依頼（13:07 頃）：初雪の夜の帰り道をテーマにした、日本語の歌。女性ボーカル、静かに始まってサビで広がる J-POP のバラード
- 1 分ほどで 2 バージョン。題「初雪のベンチ」。Producer の返事「2つのバージョンを生成しましたので、ぜひ聴き比べてみてください！」
- 次の提案ボタン：Make a 15s Shorts video／ストリングスを追加したい／歌詞をもっと切なく／アコースティックバージョンに作り直す
- Sound：J-POP ballad, alternative pop, urban folk-soul, intimate acoustic guitar intro building to a swelling emotional R&B beat, warm bass, soft electric piano, female vocals with conversational breathy verses and soaring emotional chorus, cozy yet bittersweet mood, 76 BPM
- 歌詞は lyrics_v1.txt
- ダウンロード：曲ごとの … → Download → Download video / Get stems / M4A / MP3 / WAV。MP3 は 48 kHz・128 kbps
- A（2 本目の行）165.2 秒、B 166.3 秒
- check_lyrics.py（歌詞を見せずに書き起こし → ひらがなにして各行の一致率）：A・B とも全 29 行を歌っていた。A は全行 0.88 以上。B は「別々の靴底で」0.35（聞き取れない）、「降り積もる雪に」0.56
- テンポ（オンセットの自己相関）：A 76.0、B 73.8/152、のちの Cover 92.3 BPM → Producer の Sound の「76 BPM」と一致

## 直しを頼む
- 「1 つ目のバージョンをもとに、テンポを 92 BPM に上げて、ストリングスを足してください。歌詞は変えないでください。」
- Producer は「Cover」として作り直し（元の音声を入れて作る）。1 本だけ。題「92 BPM Strings Cover」。返事「歌詞はそのままでテンポを92 BPMに引き上げ、華やかなストリングスを加えたアレンジを作成しました」
- Cover の依頼文：Keep the exact lyrics and vocal melody of the first version, but increase the tempo to 92 BPM and add lush emotional strings arrangement throughout, building in the chorus. ＋歌詞全文
- 測定：92.3 BPM（本当に上がった）。長さは 163.4 秒で元とほぼ同じ（同じ歌詞を 92 BPM なら 136 秒ほどになるはず）
- 書き起こし：全 29 行を歌っていた。構成（サビ 3 回）も同じ。ボーカルの stem は 2.2 秒から始まり、全体の 80% で鳴っている → 前奏が延びたのではなく、メロディそのものが拍に対してゆったりになった（テンポは上がったのに、速く聞こえるとは限らない）
- 書き起こしでは「冬空の下で」→「街灯の下で」、「積もる初雪」→「降り積もる雪」と聞こえた（書き起こし側の誤りの可能性もある）
- ジャケット画像は曲ごとに違う。Cover は雪道と缶紅茶（歌詞の「缶紅茶」）

## stems
- Split stems → 1 分ほど。Drums / Bass / Other / Vocals の 4 つ。「その他のパート（ストリングスやキーボード）」→ ストリングスだけは取り出せない
- ダウンロードは zip（m4a 4 本、20 MB）。Drums は 64.7 秒から（後半だけ）、Bass は 39.2 秒から

## 2. 動画用の音楽（凪島の動画、Day 4 の video.mp4、6 分 55 秒）
- 「+」で添付できるのは Live の Recording、Upload の Audio（max 40mb）と Image だけ。動画は添付できない
- 「動画用の音楽制作」カード：依頼文「動画クリエイターです。制作中の動画に合うBGMの音楽を作りたいです。」が自動送信 → Producer が選択式の質問 2 つ（ジャンル：テック／Vlog／シネマティック・旅、曲調：アップテンポ／チル・ローファイ／静かでドラマチック）
- 「シネマティック・旅動画」「落ち着いたチル・ローファイ系」を選ぶ → 「Crafting lyrics...」→ 「Tracing Droplets」2 本。英語の歌詞（雨の窓、温かいカップ、秋）、女性のハミング入りのチルホップ 75 BPM。動画の中身は知らないので、選択肢だけから想像
- 動画の中身（凪島の観光案内、ナレーション入り、6 分 55 秒、港・灯台・民宿・海沿いのバス）と「歌なし、同じ長さ」を伝える → 「凪島の記憶」2 本。Sound の末尾に「[End - 6:55]」、返事は「6分55秒の尺に合わせた」
- 実際の長さ：A 181.0 秒、B 179.8 秒（3 分）。Gemini に聞くと声なし
- 「3 分 1 秒だった、6 分 55 秒にできるか」→ Advanced Edit「Extend the track to a total duration of 6 minutes and 55 seconds (415 seconds)...」→ 1 分ほどで「Extended Lo-Fi Track」。返事は「生成後のトラックを確認したところ、約6分51秒（411秒）」→ 実測 411.0 秒（今度は正直）
- 延ばした曲の最初の 181 秒は元の A と同じ（相関 1.00）。後半は前半のどことも似ていない（相関 0.08〜0.13）→ ループではなく、続きを新しく作った
- Day 4 の動画にナレーションの下で重ねた：nagishima_video_with_bgm.mp4（BGM 0.18 倍、最後 6 秒フェード、43 MB）

## そのほか
- 左のセッション一覧に「2 new French-touch disc...（Made by your producer）」が勝手に増えた（14:00 頃）
- 中身：「While you were away, I took the 92 BPM Strings Cover song ... reimagined it as a nostalgic French-touch disco-house dance track at 118 BPM. I wrapped her original emotional vocal line ... 2 fresh variations ... I create ideas like this for you while you're away! If you don't like this, I can turn it off anytime, or you can turn it off in user settings. No credits are charged for these generations.」
- 2 本：French-Touch Disco House Flip (Analog Warmth) 1 / (Vintage Tape Drive) 2。「Want to keep this session?（Remove / Keep session）」→ どちらも押していない
- Flip 1：117.5 BPM（説明どおり）、162.5 秒（元とほぼ同じ長さ）。歌詞は全 29 行が残る（一致率 0.70〜1.00）。歌声は Cover のものをそのまま使う → 実質リミックス

## 3. プラグイン（VST Plugin Ideas のセッション）
- 「Lo-Fi VHS & Cassette Texture を作ってください。」→ 「Coding...」→ 1 分ほどで「Lo-Fi Tape Texture」。版は V4（会話の裏で 4 回作り直し。v4 の説明「Use bit-shift for 2^bits quantization in processor.wasm.ts」）
- 右側にそのまま動く操作画面「RETRO TAPE & VHS TEXTURE」：Wow SPD/DPT、Flut SPD/DPT、Drive、Tone、Degrade（12）、Hiss、Dropouts、Output、Dry/Wet、波形とピークメーター
- 返事：「DAW用のVST3/AUとしてエクスポートしてそのまま使えます」
- 「Use in DAW」：1. Install the plugin (one-time)「Flow Effect and Flow Instrument: VST3 & AU for macOS. Your instruments and effects run inside them.」→ Download plugin、2. 「Drag the downloaded file onto Flow Effect in your DAW.」→ Download Lo-Fi Tape Texture (V4)
- → 作ったプラグインそのものが VST3 になるのではなく、Flow Effect / Flow Instrument という入れ物のプラグインの中で動く。しかも macOS 用だけ。筆者は Windows なので DAW では試していない（ダウンロードもしていない）
- 右上に Publish もある

## 4. Turntable と Music videos
- Turntable：「Find your sound on the Turntable — Vote for the sample that better matches the prompt. Rating boosts your personalization, improves our models, and earns you credits.」同じ依頼文の Side A / Side B（歌詞は同じ）を聞き比べて投票。1 回 10 本（0 / 10）、それぞれ 10 秒以上聞かないと投票できない。キーボード操作（Space、←→、Return、Z で取り消し、X で飛ばす）。投票はしていない
- Music videos：「New music video」→「Create your music video」：ハイライトか曲全体、好きな曲を選ぶ、主役の画像（subject image）と雰囲気の参考画像（style reference image）を上げる、「Credits are required to generate music videos. They can be expensive. Upgrade to Member for a free video.」→ 作っていない
- 「Grant access to your Google One subscription」の帯が、別のページでまた出ていた
