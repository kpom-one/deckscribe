# Deckscribe

A modular deck-building and version-tracking system for Lorcana players.

## Core Concepts

- **Packages**: Reusable collections of cards (without quantities)
- **Decks**: Containers with ink identity that import packages
- **Builds**: Versioned snapshots with specific card quantities

Think of it as "Git for Lorcana decks" - track evolution and experimentation.

## Quick Start

```bash
npm install
npm run dev
```

Visit **http://localhost:1337**

## Project Structure

```
deckscribe/
├── backend/           # Hono server (API + serves frontend)
├── frontend/          # Vanilla HTML/CSS/JS (3 files)
├── shared/            # TypeScript types
└── .kpom.research/    # Documentation, planning, tickets
```

## Development

- `npm run dev` - Start server on port 1337
- `npm run build` - Build TypeScript

## API Endpoints

- `GET /` - Home page
- `GET /api/health` - Health check
- `GET /api/cards` - (Coming soon) Card search
- `GET /api/packages` - (Coming soon) Package CRUD
- `GET /api/decks` - (Coming soon) Deck CRUD
- `GET /api/builds` - (Coming soon) Build CRUD

## Documentation

See `.kpom.research/` for:
- Product vision and concepts
- Technical documentation
- Development tickets
- Design notes
