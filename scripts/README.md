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
