import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import type { Package } from '@deckscribe/shared'
import { readFileSync } from 'fs'
import { join } from 'path'

const app = new Hono()

// In-memory storage
const packages = new Map<string, Package>()

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
  return c.json(Array.from(packages.values()))
})

// Packages - Get one
app.get('/api/packages/:id', (c) => {
  const id = c.req.param('id')
  const pkg = packages.get(id)
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
    notes: body.notes || '',
    isImmutable: false,
    created_at: new Date().toISOString(),
  }

  packages.set(pkg.id, pkg)
  return c.json(pkg, 201)
})

// Packages - Finalize (make immutable)
app.put('/api/packages/:id/finalize', (c) => {
  const id = c.req.param('id')
  const pkg = packages.get(id)

  if (!pkg) {
    return c.json({ error: 'Package not found' }, 404)
  }

  pkg.isImmutable = true
  packages.set(id, pkg)

  return c.json(pkg)
})

// Packages - Delete
app.delete('/api/packages/:id', (c) => {
  const id = c.req.param('id')
  const pkg = packages.get(id)

  if (!pkg) {
    return c.json({ error: 'Package not found' }, 404)
  }

  // TODO: Check if package is used by any deck (Ticket 3)

  packages.delete(id)
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
      decks: '/api/decks (Coming in Ticket 3)',
      builds: '/api/builds (Coming in Ticket 4)',
    },
  })
})

const port = Number(process.env.PORT) || 1337

console.log(`🚀 Server running at http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
})
