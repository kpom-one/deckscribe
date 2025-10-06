#!/bin/bash

# Fetch all Lorcana cards from Lorcast API
# This script fetches all sets, then fetches all cards from each set,
# combines them, and saves to data/cards.json

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_DIR/data"

echo "🃏 Fetching Lorcana card data from Lorcast API..."

# Create data directory if it doesn't exist
mkdir -p "$DATA_DIR"

# Fetch all sets
echo "📦 Fetching sets..."
SETS_JSON=$(curl -s 'https://api.lorcast.com/v0/sets')
SET_IDS=$(echo "$SETS_JSON" | jq -r '.results[].id')
SET_COUNT=$(echo "$SET_IDS" | wc -l | tr -d ' ')

echo "   Found $SET_COUNT sets"

# Fetch cards from each set
echo "🎴 Fetching cards from each set..."
TEMP_DIR=$(mktemp -d)
CARD_COUNT=0

for SET_ID in $SET_IDS; do
  SET_NAME=$(echo "$SETS_JSON" | jq -r ".results[] | select(.id == \"$SET_ID\") | .name")
  echo "   - Fetching: $SET_NAME"

  curl -s "https://api.lorcast.com/v0/sets/$SET_ID/cards" > "$TEMP_DIR/$SET_ID.json"

  # Count cards in this set
  COUNT=$(jq 'length' "$TEMP_DIR/$SET_ID.json")
  CARD_COUNT=$((CARD_COUNT + COUNT))
done

echo "   Total cards fetched: $CARD_COUNT"

# Combine all cards into a single array
echo "🔗 Combining all cards..."
jq -s 'add' "$TEMP_DIR"/*.json > "$DATA_DIR/cards.json.tmp"

# Prettify the JSON
echo "✨ Prettifying JSON..."
jq '.' "$DATA_DIR/cards.json.tmp" > "$DATA_DIR/cards.json"

# Cleanup
rm -rf "$TEMP_DIR"
rm "$DATA_DIR/cards.json.tmp"

# Show final stats
FINAL_COUNT=$(jq 'length' "$DATA_DIR/cards.json")
FILE_SIZE=$(du -h "$DATA_DIR/cards.json" | cut -f1)

echo ""
echo "✅ Success!"
echo "   Cards saved: $FINAL_COUNT"
echo "   File size: $FILE_SIZE"
echo "   Location: $DATA_DIR/cards.json"
echo ""
echo "📋 Sample card data:"
jq '.[0] | {name, version, ink, cost, type, rarity, image_uris: .image_uris.digital}' "$DATA_DIR/cards.json"
