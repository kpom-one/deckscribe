// API helper functions
const API_BASE = '/api'

async function apiGet(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

async function apiPost(endpoint, data) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

async function apiPut(endpoint, data = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

async function apiDelete(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'DELETE'
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

// Global card cache
let allCardsCache = []
let cardsLoaded = false

// Load all cards on startup
async function loadAllCards() {
  if (cardsLoaded) {
    return allCardsCache
  }

  try {
    allCardsCache = await apiGet('/cards')
    cardsLoaded = true
    return allCardsCache
  } catch (error) {
    console.error('❌ Failed to load cards:', error)
    return []
  }
}

// Test API connection and load cards on startup
async function initializeApp() {
  try {
    await apiGet('/health')
  } catch (error) {
    console.error('❌ API connection failed:', error)
  }

  // Load all cards on startup
  await loadAllCards()
}

initializeApp()
