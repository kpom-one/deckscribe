# Deckscribe

**A smarter way to build, evolve, and organize your Lorcana decks.**  
Deckscribe helps you break decks into reusable components, experiment freely, and track how your ideas change over time.

---

## 🧠 What Is Deckscribe?

Deckscribe is a modular deckbuilding system designed for players who:

- **Brew often** and want to track variations
- **Reuse ideas** across multiple decks
- **Evolve lists** without losing earlier versions
- Want to bring **structure** to their deckbuilding process

Instead of building one flat list at a time, Deckscribe introduces a few core concepts:

---

## 🧱 Core Concepts

| Concept     | Description                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------- |
| **Package** | A reusable set of cards (no quantities). Think of it like an engine, shell, or tech module.  |
| **Deck**    | Built by combining one or more packages and choosing an ink identity.                        |
| **Build**   | A saved version of a deck with explicit card counts. Use builds to snapshot your iterations. |

You can experiment with a new package in multiple decks, track tweaks over time, and revisit old builds to compare.

---

## 🔭 Looking Ahead

Deckscribe is built for **expandability**:

- 💡 **Shared packages**: Once formalized, packages could become a shared vocabulary — “Steel Ramp Shell”, “Ruby Flood Tools”, etc.
- 🧬 **Archetype tooling**: Packages enable automatic tagging, filtering, and even deck clustering.
- 🤝 **Collaborative deckbuilding**: Reuse others' packages, fork builds, remix your way.

The long-term goal is to build a **deckbuilding ecosystem**, not just a tool.

---

## 🖼️ Example Workflow (Screenshots Coming Soon)

1. Create a **package**:  
   → Add cards that represent an idea (e.g. discard engine, draw core)
   <img width="1358" height="808" alt="image" src="https://github.com/user-attachments/assets/26477aab-f83e-49b8-84dc-a60da0a34b67" />


3. Create a **deck**:  
   → Import one or more packages
   <img width="1334" height="790" alt="image" src="https://github.com/user-attachments/assets/61a26c67-d3df-4241-9c16-368eb276cbc2" />


4. Save a **build**:  
   → Add exact counts and snapshot the version you want to test
   <img width="1315" height="745" alt="image" src="https://github.com/user-attachments/assets/c6f7ab1e-16f4-424c-9574-68f06d7b79cd" />



6. Make changes, save another build, compare

---

## 👥 Who It's For

- Competitive players tracking meta shifts
- Creators refining archetypes over time
- Teams sharing shell ideas
- Tinkerers who never settle on a “final list”

---

## ⚙️ Tech Overview

Deckscribe is a local-first tool, currently using:

- Hono (TypeScript) for the backend API
- HTML/JS frontend (no framework)
- Shared types across backend/frontend

Runs on port `1337`.

---

## 🚀 Quick Start (Dev)

```bash
git clone https://github.com/kpom-one/deckscribe.git
cd deckscribe
npm install
npm run dev
```

Open your browser at:  
[http://localhost:1337](http://localhost:1337)

---

## 🗂️ Project Structure

```
deckscribe/
├── backend/         # Hono server with API endpoints
├── frontend/        # Basic UI served from backend
├── shared/          # Common TypeScript types
```

---

## 📌 Status

Deckscribe is in active development.  
Feedback, ideas, and contributions are welcome.
