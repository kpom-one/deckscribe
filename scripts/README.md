# Scripts

## fetch-cards.sh

Fetches all Lorcana card data from the Lorcast API and saves it to `data/cards.json`.

### Usage

```bash
./scripts/fetch-cards.sh
```

### What it does

1. Fetches all available sets from `https://api.lorcast.com/v0/sets`
2. For each set, fetches all cards from `https://api.lorcast.com/v0/sets/{set_id}/cards`
3. Combines all cards into a single JSON array
4. Prettifies and saves to `data/cards.json`
5. Shows summary statistics and sample card data

### When to run

- **First time setup**: Run once to populate the card database
- **Updates**: Run periodically to get new cards from new sets (monthly or quarterly)
- **After API changes**: Run if the Lorcast API structure changes

### Requirements

- `curl` - for API requests
- `jq` - for JSON processing

### Output

The script creates `data/cards.json` with the following structure:

```json
[
  {
    "name": "Ariel",
    "version": "On Human Legs",
    "ink": "Amber",
    "cost": 4,
    "type": "Character",
    "rarity": "Super Rare",
    "image_uris": {
      "digital": {
        "small": "https://cards.lorcast.io/card/digital/small/...",
        "normal": "https://cards.lorcast.io/card/digital/normal/...",
        "large": "https://cards.lorcast.io/card/digital/large/..."
      }
    },
    ...
  }
]
```

### Notes

- The `data/` directory is gitignored - each developer runs this script locally
- File size is typically 2-3 MB for ~2000 cards
- Script takes ~10-15 seconds to complete

---

## fix-legalities.js

Fixes legality data in `data/cards.json` to properly support Core Constructed and Infinity formats.

### Usage

```bash
node scripts/fix-legalities.js
```

### What it does

1. Backs up `data/cards.json` to `data/cards.json.backup`
2. Sets all cards as Infinity legal (`legalities.infinity = true`)
3. For cards from sets 1-4: removes `legalities.core` (not legal in Core Constructed)
4. For cards from sets 5+: sets `legalities.core = true`
5. For promotional/special sets (D23, P1, P2, cp): removes `legalities.core`
6. Writes the updated data back to `data/cards.json`

### When to run

- **After fetching cards**: The Lorcast API has incomplete/incorrect legality data
- **One-time fix**: Run once after `fetch-cards.sh` to correct legalities
- **After API updates**: Run if legality data is incorrect after fetching new cards

### Requirements

- Node.js
- `data/cards.json` must exist (run `fetch-cards.sh` first)

### Output

Updates card legalities to:

**Sets 1-4 (First Chapter, Rise of the Floodborn, Into the Inklands, Ursula's Return):**
```json
{
  "legalities": {
    "infinity": true
  }
}
```

**Sets 5+ (Shimmering Skies, Azurite Sea, etc.):**
```json
{
  "legalities": {
    "infinity": true,
    "core": true
  }
}
```

### Notes

- Creates automatic backup at `data/cards.json.backup`
- Safe to run multiple times (idempotent)
- Processes ~2000 cards in under 1 second
