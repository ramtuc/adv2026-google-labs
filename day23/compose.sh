#!/bin/sh
# Day 23: 3 本の動画（Flow）＋締めの静止画（Nano Banana）＋ナレーション（Gemini TTS）＋BGM（Flow Music）を 1 本にする
# 動画の音（Flow が勝手に付けた物音）は使わない。ナレーションは各カットの 0.5 秒後に置き、BGM は小さく敷き（1 回目は 0.35 で、重なった所で音が割れた）、ナレーションは 0.9 倍。
set -e
R=results
ffmpeg -v error -y \
  -i $R/videos/cut1.mp4 -i $R/videos/cut2.mp4 -i $R/videos/cut3.mp4 \
  -loop 1 -t 3 -i $R/keyframes/end_2.1.png \
  -i $R/narration/n1.wav -i $R/narration/n2.wav -i $R/narration/n3.wav \
  -i $R/music/circuit_pulse_27s_edit.mp3 \
  -filter_complex "\
[0:v]trim=0:8,setpts=PTS-STARTPTS,scale=1280:720,fps=24[v0];\
[1:v]trim=0:8,setpts=PTS-STARTPTS,scale=1280:720,fps=24[v1];\
[2:v]trim=0:8,setpts=PTS-STARTPTS,scale=1280:720,fps=24[v2];\
[3:v]scale=1280:720,fps=24,format=yuv420p[v3];\
[v0][v1][v2][v3]concat=n=4:v=1:a=0[v];\
[4:a]volume=0.9,adelay=500|500[a1];[5:a]volume=0.9,adelay=8500|8500[a2];[6:a]volume=0.9,adelay=17500|17500[a3];\
[7:a]lowpass=f=7000,volume=0.15[bgm];\
[a1][a2][a3][bgm]amix=inputs=4:duration=longest:normalize=0,atrim=0:27[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -pix_fmt yuv420p -crf 20 -c:a aac -b:a 192k -t 27 $R/promo.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 $R/promo.mp4
