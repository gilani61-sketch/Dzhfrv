#!/usr/bin/env bash
# Рендер ролика: bash scripts/render.sh <slug> [--wide]
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"
SLUG="${1:?укажи slug проекта, напр: bash scripts/render.sh martin-eden}"
PROJ="$ROOT/projects/$SLUG"
SPEC="$PROJ/scenes.json"

[ -f "$SPEC" ] || { echo "✗ нет $SPEC — сначала: python3 scripts/build_scenes.py projects/$SLUG"; exit 1; }

mkdir -p "$PROJ/out"
OUT="$PROJ/out/$SLUG.mp4"

export REMOTION_BROWSER_EXECUTABLE="${REMOTION_BROWSER_EXECUTABLE:-/opt/pw-browsers/chromium}"

echo "→ рендер $SLUG"
cd "$ROOT/engine"
npx remotion render src/index.ts Reel "$OUT" \
  --props="$SPEC" \
  --codec=h264 --crf=20 --audio-codec=aac \
  2>&1 | grep -vE "Memory reported|docker run|CGroup|inadverten|Using the lower"

# нормализация громкости под требования платформ
if ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$OUT" | grep -q .; then
  echo "→ нормализую звук до −14 LUFS"
  TMP="$PROJ/out/.norm.mp4"
  ffmpeg -v error -i "$OUT" \
    -af loudnorm=I=-14:TP=-1.0:LRA=11 \
    -c:v copy -c:a aac -b:a 192k "$TMP" -y
  mv "$TMP" "$OUT"
fi

echo
echo "✓ $OUT"
ffprobe -v error -show_entries format=duration,size -show_entries stream=width,height,codec_name \
  -of default=nw=1 "$OUT"
