#!/usr/bin/env bash
# Новый ролик: bash scripts/new_project.sh <slug> "Название" "Автор"
set -euo pipefail
cd "$(dirname "$0")/.."

SLUG="${1:?укажи slug, напр: martin-eden}"
TITLE="${2:-$SLUG}"
AUTHOR="${3:-}"
P="projects/$SLUG"

[ -d "$P" ] && { echo "✗ $P уже есть"; exit 1; }
mkdir -p "$P"/{shots,audio,out}

cat > "$P/script.md" <<EOF
# $TITLE
author: $AUTHOR
mode: cinematic
preset: reel
watermark: @juliapolskayaa

## 01.jpg
- 

## 02.jpg
- 
EOF

cat > "$P/shotlist.md" <<EOF
# Раскадровка — $TITLE

Промпты для генерации кадров. Стиль держать одинаковым во всех:
см. \`docs/visual-prompts.md\`.

## 01.jpg
**Промпт:** 
**Движение:** in

## 02.jpg
**Промпт:** 
**Движение:** left
EOF

echo "✓ $P"
echo
echo "Дальше:"
echo "  1. напиши текст в $P/script.md"
echo "  2. положи кадры в $P/shots/"
echo "  3. python3 scripts/build_scenes.py $P"
echo "  4. bash scripts/render.sh $SLUG"
