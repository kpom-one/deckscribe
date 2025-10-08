import Database from 'better-sqlite3'
import { join } from 'path'
import type { Package, Deck } from '@deckscribe/shared'

// Initialize database
const dbPath = join(process.cwd(), '..', 'data', 'deckscribe.db')
const db = new Database(dbPath)

// Enable foreign keys
db.pragma('foreign_keys = ON')

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    cards TEXT NOT NULL, -- JSON array of card names
    notes TEXT,
    is_immutable INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS decks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ink_identity TEXT NOT NULL, -- JSON array of 2 colors
    packages TEXT NOT NULL, -- JSON array of package IDs
    created_at TEXT NOT NULL
  );
`)

console.log(`✅ Database initialized at ${dbPath}`)

// Package operations
export const packageDb = {
  getAll(): Package[] {
    const rows = db.prepare('SELECT * FROM packages ORDER BY created_at DESC').all()
    return rows.map(deserializePackage)
  },

  getById(id: string): Package | null {
    const row = db.prepare('SELECT * FROM packages WHERE id = ?').get(id)
    return row ? deserializePackage(row) : null
  },

  create(pkg: Package): Package {
    db.prepare(`
      INSERT INTO packages (id, name, description, cards, notes, is_immutable, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      pkg.id,
      pkg.name,
      pkg.description,
      JSON.stringify(pkg.cards),
      pkg.notes,
      pkg.isImmutable ? 1 : 0,
      pkg.created_at || new Date().toISOString()
    )
    return pkg
  },

  update(id: string, updates: Partial<Package>): Package | null {
    const existing = this.getById(id)
    if (!existing) return null

    const updated = { ...existing, ...updates }
    db.prepare(`
      UPDATE packages
      SET name = ?, description = ?, cards = ?, notes = ?, is_immutable = ?
      WHERE id = ?
    `).run(
      updated.name,
      updated.description,
      JSON.stringify(updated.cards),
      updated.notes,
      updated.isImmutable ? 1 : 0,
      id
    )

    return updated
  },

  delete(id: string): boolean {
    const result = db.prepare('DELETE FROM packages WHERE id = ?').run(id)
    return result.changes > 0
  }
}

// Deck operations
export const deckDb = {
  getAll(): Deck[] {
    const rows = db.prepare('SELECT * FROM decks ORDER BY created_at DESC').all()
    return rows.map(deserializeDeck)
  },

  getById(id: string): Deck | null {
    const row = db.prepare('SELECT * FROM decks WHERE id = ?').get(id)
    return row ? deserializeDeck(row) : null
  },

  create(deck: Deck): Deck {
    db.prepare(`
      INSERT INTO decks (id, name, ink_identity, packages, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      deck.id,
      deck.name,
      JSON.stringify(deck.ink_identity),
      JSON.stringify(deck.packages),
      deck.created_at || new Date().toISOString()
    )
    return deck
  },

  delete(id: string): boolean {
    const result = db.prepare('DELETE FROM decks WHERE id = ?').run(id)
    return result.changes > 0
  },

  // Check if any deck uses a package
  findByPackage(packageId: string): Deck | null {
    const rows = db.prepare('SELECT * FROM decks').all()
    const decks = rows.map(deserializeDeck)
    return decks.find(deck => deck.packages.includes(packageId)) || null
  }
}

// Helper functions to serialize/deserialize
function deserializePackage(row: any): Package {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    cards: JSON.parse(row.cards),
    notes: row.notes || '',
    isImmutable: Boolean(row.is_immutable),
    created_at: row.created_at
  }
}

function deserializeDeck(row: any): Deck {
  return {
    id: row.id,
    name: row.name,
    ink_identity: JSON.parse(row.ink_identity),
    packages: JSON.parse(row.packages),
    created_at: row.created_at
  }
}

export default db
