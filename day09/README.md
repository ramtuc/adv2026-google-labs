# Day 9 Google Flow Music × Lyria 3.5 API

ESP32-S3 のデータシートの仕様を歌詞にした曲を、Gemini API の Lyria 3.5 と Google Flow Music で作り、歌詞と歌声をデータシートと照らしました。**曲はすべて AI で生成したものです**（歌詞・歌声・伴奏。custom と flow_custom の歌詞の一部は人が書いたもの）。

| ファイル | 内容 |
| --- | --- |
| [make_song.py](make_song.py) | Lyria 3.5 で曲を作り（auto：歌詞を任せる／custom：正しい歌詞を渡す）、歌声を Gemini で書き起こす |
| [make_videos.py](make_videos.py) | 曲を静止画付きの動画にする |
| [make_lyric_videos.py](make_lyric_videos.py) | 歌詞の字幕（各行の時刻を Gemini で合わせる）と、音に合わせて動く波形を入れた動画にする |
| results/auto.mp3 ほか | 生成した曲。auto・custom は Gemini API の lyria-3.5、flow_auto（Deep Sleep Mode）・flow_custom（エクステンサ LX7）は Google Flow Music |
| results/*.json | 生成時の依頼文・歌詞・書き起こし（auto.json、custom.json）、字幕の時刻（*_timing.json） |
| results/flow_*_lyrics.txt | Flow Music のページに表示された歌詞 |

auto の歌詞には「SRAM は 520 KB」という誤りがあります（ESP32-S3 は 512 KB。520 KB は初代 ESP32 の値）。flow_custom には、渡していない「フラッシュは八メガバイト搭載」が足されています。

YouTube（字幕入り）：
[auto](https://youtu.be/cVENWc1Dezo) ／ [custom](https://youtu.be/2eNzIXwSLzo) ／ [flow_auto](https://youtu.be/J1paHFtwuM0) ／ [flow_custom](https://youtu.be/wxutOqVO7xg)
