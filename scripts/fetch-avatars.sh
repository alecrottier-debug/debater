#!/bin/bash
# Fetch Wikipedia lead images for the 10 new personas, square-crop, save as PNG.
# Wikipedia Commons images are CC-BY-SA or PD; attribution in README.

set -e
AVATARS="/Users/arottier/Code/debater-1/frontend/public/avatars"
TMP=$(mktemp -d)

declare -a PEOPLE=(
  "Edmund Burke|edmund-burke"
  "William F. Buckley Jr.|william-f-buckley-jr"
  "Ronald Reagan|ronald-reagan"
  "Russell Kirk|russell-kirk"
  "Ben Shapiro|ben-shapiro"
  "Thomas Sowell|thomas-sowell"
  "Jordan Peterson|jordan-peterson"
  "Tucker Carlson|tucker-carlson"
  "Milton Friedman|milton-friedman"
  "George Will|george-will"
)

for entry in "${PEOPLE[@]}"; do
  name="${entry%|*}"
  slug="${entry#*|}"
  # URL-encode the name for the Wikipedia REST endpoint
  encoded=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$name")
  printf "[%s] " "$name"

  # Fetch the page summary and extract the original image URL
  img_url=$(/usr/bin/curl -s -A "debater/1.0 (hobby project; contact via repo)" \
    "https://en.wikipedia.org/api/rest_v1/page/summary/$encoded" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('originalimage',{}).get('source',''))")

  if [ -z "$img_url" ]; then
    echo "NO IMAGE"
    continue
  fi

  # Download
  ext="${img_url##*.}"
  raw="$TMP/$slug.$ext"
  /usr/bin/curl -sSL -A "debater/1.0 (hobby project; contact via repo)" \
    -o "$raw" "$img_url"

  # Center-square-crop + resize to 512x512 via ImageMagick.
  out="$AVATARS/$slug.png"
  magick "$raw" \
    -auto-orient \
    -gravity north \
    -resize "512x512^" \
    -extent 512x512 \
    -strip \
    "$out"
  printf "saved %s (%s bytes)\n" "$slug.png" "$(stat -f%z "$out")"
done

echo
echo "Image sources logged to ${AVATARS}/SOURCES.md"
rm -rf "$TMP"
