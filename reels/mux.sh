#!/usr/bin/env bash
# Mux the rendered picture with the generated score and lay down
# Instagram/TikTok-friendly delivery settings.
set -e
ffmpeg -y -v error \
  -i out/reel_silent.mp4 -i out/score.wav \
  -c:v copy \
  -af "highpass=f=28, acompressor=threshold=0.14:ratio=3:attack=6:release=180, alimiter=limit=0.95, loudnorm=I=-14:TP=-1.0:LRA=11" \
  -c:a aac -b:a 192k -ar 48000 -ac 2 \
  -shortest -movflags +faststart \
  out/reverse-api-engineer.mp4
echo "→ out/reverse-api-engineer.mp4"
ffprobe -v error -show_entries format=duration,bit_rate -show_entries stream=codec_name,width,height,r_frame_rate -of default=nw=1 out/reverse-api-engineer.mp4
