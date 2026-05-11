#!/usr/bin/env bash
set -Eeuo pipefail
DIR="$(dirname "$0")/files"
mkdir -p "$DIR"

# Heebo (variable -> static weights extracted in CI; fall back to variable file).
curl -fSL -o "$DIR/Heebo.ttf" \
  "https://github.com/google/fonts/raw/main/ofl/heebo/Heebo%5Bwght%5D.ttf"
curl -fSL -o "$DIR/FrankRuhlLibre.ttf" \
  "https://github.com/google/fonts/raw/main/ofl/frankruhllibre/FrankRuhlLibre%5Bwght%5D.ttf"

# Generate regular/bold via fonttools (optional, only if installed)
if command -v fonttools >/dev/null; then
  for w in 400:Regular 700:Bold; do
    weight="${w%%:*}"; suffix="${w##*:}"
    fonttools varLib.mutator "$DIR/Heebo.ttf"          wght=$weight --output="$DIR/Heebo-$suffix.ttf"
    fonttools varLib.mutator "$DIR/FrankRuhlLibre.ttf" wght=$weight --output="$DIR/FrankRuhlLibre-$suffix.ttf"
  done
fi

echo "[fonts] installed to $DIR"
ls -la "$DIR"
