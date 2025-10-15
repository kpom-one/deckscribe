import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import type { Package, Deck, Build } from '@deckscribe/shared'
import { readFileSync } from 'fs'
import { join } from 'path'
import { packageDb, deckDb, buildDb } from './db'

const app = new Hono()

// Load cards from local JSON file
let allCards: any[] = []
try {
  const cardsPath = join(process.cwd(), '..', 'data', 'cards.json')
  const cardsData = readFileSync(cardsPath, 'utf-8')
  allCards = JSON.parse(cardsData)
  console.log(`✅ Loaded ${allCards.length} cards from data/cards.json`)
} catch (error) {
  console.error('❌ Failed to load cards.json:', error)
  console.error('   Run ./scripts/fetch-cards.sh to download card data')
}

// Serve static files from frontend directory
app.use('/*', serveStatic({ root: '../frontend' }))

// API endpoints

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    message: 'Deckscribe API is running',
    timestamp: new Date().toISOString(),
  })
})

// Cards - Serve from local JSON file
app.get('/api/cards', (c) => {
  if (allCards.length === 0) {
    return c.json({ error: 'No card data available. Run ./scripts/fetch-cards.sh to download.' }, 500)
  }
  return c.json(allCards)
})

// Packages - List all
app.get('/api/packages', (c) => {
  return c.json(packageDb.getAll())
})

// Packages - Get one
app.get('/api/packages/:id', (c) => {
  const id = c.req.param('id')
  const pkg = packageDb.getById(id)
  if (!pkg) {
    return c.json({ error: 'Package not found' }, 404)
  }
  return c.json(pkg)
})

// Packages - Create
app.post('/api/packages', async (c) => {
  const body = await c.req.json()

  const pkg: Package = {
    id: `pkg_${Date.now()}`,
    name: body.name || 'Untitled Package',
    description: body.description || '',
    cards: (body.cards || []).map((card: string) => card.toLowerCase()),
    isImmutable: false, // Packages are mutable by design
    created_at: new Date().toISOString(),
  }

  packageDb.create(pkg)
  return c.json(pkg, 201)
})

// Packages - Update
app.put('/api/packages/:id', async (c) => {
  const id = c.req.param('id')
  const pkg = packageDb.getById(id)

  if (!pkg) {
    return c.json({ error: 'Package not found' }, 404)
  }

  const body = await c.req.json()

  const updates: Partial<Package> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.description !== undefined) updates.description = body.description
  if (body.cards !== undefined) updates.cards = body.cards.map((card: string) => card.toLowerCase())

  const updated = packageDb.update(id, updates)
  return c.json(updated)
})

// Packages - Delete
app.delete('/api/packages/:id', (c) => {
  const id = c.req.param('id')
  const pkg = packageDb.getById(id)

  if (!pkg) {
    return c.json({ error: 'Package not found' }, 404)
  }

  // Check if package is used by any deck
  const deckUsingPackage = deckDb.findByPackage(id)

  if (deckUsingPackage) {
    return c.json({ error: `Package is used by deck: ${deckUsingPackage.name}` }, 400)
  }

  packageDb.delete(id)
  return c.json({ success: true })
})

// Decks - List all
app.get('/api/decks', (c) => {
  return c.json(deckDb.getAll())
})

// Decks - Get one
app.get('/api/decks/:id', (c) => {
  const id = c.req.param('id')
  const deck = deckDb.getById(id)
  if (!deck) {
    return c.json({ error: 'Deck not found' }, 404)
  }
  return c.json(deck)
})

// Decks - Create
app.post('/api/decks', async (c) => {
  const body = await c.req.json()

  const deck: Deck = {
    id: `deck_${Date.now()}`,
    name: body.name || 'Untitled Deck',
    ink_identity: body.ink_identity,
    packages: body.packages || [],
    created_at: new Date().toISOString(),
  }

  deckDb.create(deck)
  return c.json(deck, 201)
})

// Decks - Update
app.put('/api/decks/:id', async (c) => {
  const id = c.req.param('id')
  const deck = deckDb.getById(id)

  if (!deck) {
    return c.json({ error: 'Deck not found' }, 404)
  }

  const body = await c.req.json()

  const updates: Partial<Deck> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.ink_identity !== undefined) updates.ink_identity = body.ink_identity
  if (body.packages !== undefined) updates.packages = body.packages

  const updated = deckDb.update(id, updates)
  return c.json(updated)
})

// Decks - Delete
app.delete('/api/decks/:id', (c) => {
  const id = c.req.param('id')
  const deck = deckDb.getById(id)

  if (!deck) {
    return c.json({ error: 'Deck not found' }, 404)
  }

  deckDb.delete(id)
  return c.json({ success: true })
})

// Builds - List all for a deck
app.get('/api/decks/:deckId/builds', (c) => {
  const deckId = c.req.param('deckId')
  const deck = deckDb.getById(deckId)

  if (!deck) {
    return c.json({ error: 'Deck not found' }, 404)
  }

  const builds = buildDb.getAllByDeck(deckId)
  return c.json(builds)
})

// Builds - Get one
app.get('/api/builds/:id', (c) => {
  const id = c.req.param('id')
  const build = buildDb.getById(id)

  if (!build) {
    return c.json({ error: 'Build not found' }, 404)
  }

  return c.json(build)
})

// Builds - Create
app.post('/api/decks/:deckId/builds', async (c) => {
  const deckId = c.req.param('deckId')
  const deck = deckDb.getById(deckId)

  if (!deck) {
    return c.json({ error: 'Deck not found' }, 404)
  }

  const body = await c.req.json()

  // Get next version number
  const version = buildDb.getNextVersion(deckId)
  const versionName = `v${version}`

  const build: Build = {
    id: `build_${Date.now()}`,
    deck_id: deckId,
    name: versionName,
    card_counts: body.card_counts || {},
    notes: body.notes || '',
    created_at: new Date().toISOString(),
  }

  buildDb.create(build)
  return c.json(build, 201)
})

// Builds - Delete
app.delete('/api/builds/:id', (c) => {
  const id = c.req.param('id')
  const build = buildDb.getById(id)

  if (!build) {
    return c.json({ error: 'Build not found' }, 404)
  }

  buildDb.delete(id)
  return c.json({ success: true })
})

// API info
app.get('/api', (c) => {
  return c.json({
    name: 'Deckscribe API',
    version: '0.1.0',
    endpoints: {
      health: '/api/health',
      cards: '/api/cards',
      packages: '/api/packages',
      decks: '/api/decks',
      builds: '/api/decks/:deckId/builds, /api/builds/:id',
    },
  })
})

const port = Number(process.env.PORT) || 1337

console.log(`🚀 Server running at http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
})
