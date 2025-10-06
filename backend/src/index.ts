import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'

const app = new Hono()

// Serve static files from frontend directory
app.use('/*', serveStatic({ root: '../frontend' }))

// API endpoints

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    message: 'Deckscribe API is running',
    timestamp: new Date().toISOString(),
  })
})

// API info endpoint
app.get('/api', (c) => {
  return c.json({
    name: 'Deckscribe API',
    version: '0.1.0',
    endpoints: {
      health: '/api/health',
      cards: '/api/cards (Coming in Ticket 2)',
      packages: '/api/packages (Coming in Ticket 3)',
      decks: '/api/decks (Coming in Ticket 4)',
      builds: '/api/builds (Coming in Ticket 5)',
    },
  })
})

const port = Number(process.env.PORT) || 1337

console.log(`🚀 Server running at http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
})
