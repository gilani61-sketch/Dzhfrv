#!/usr/bin/env bash
# Mux picture + score into the delivery file.
#   tools/mux.sh [film-name]
set -e
cd "$(dirname "$0")/.."
FILM="${1:-reverse-api-engineer}"
PIC="out/${FILM}.silent.mp4"
SND="out/${FILM}.score.wav"
DST="out/${FILM}.mp4"

[ -f "$PIC" ] || { echo "missing $PIC — run tools/render.mjs first"; exit 1; }
[ -f "$SND" ] || { echo "missing $SND — run the film's sound.py first"; exit 1; }

ffmpeg -y -v error \
  -i "$PIC" -i "$SND" \
  -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -profile:v high -level 4.1 \
  -x264-params "aq-mode=3:psy-rd=1.0,0.15:deblock=-1,-1" -maxrate 20M -bufsize 40M \
  -af "highpass=f=28, acompressor=threshold=0.14:ratio=3:attack=6:release=180, alimiter=limit=0.95, loudnorm=I=-14:TP=-1.0:LRA=11" \
  -c:a aac -b:a 192k -ar 48000 -ac 2 \
  -shortest -movflags +faststart "$DST"

echo "→ $DST"
ffprobe -v error -show_entries format=duration,size,bit_rate \
        -show_entries stream=codec_name,width,height,r_frame_rate \
        -of default=nw=1 "$DST"
