// Simple client-side routing
const API_BASE = '/api'

// View management
function showView(viewName) {
  // Hide all views
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active')
  })

  // Show selected view
  const targetView = document.getElementById(`${viewName}-view`)
  if (targetView) {
    targetView.classList.add('active')
  }

  // Update nav active state
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active')
    if (link.getAttribute('href') === `#${viewName}`) {
      link.classList.add('active')
    }
  })

  // Initialize view-specific logic
  if (viewName === 'cards' && typeof initCardsView === 'function') {
    initCardsView()
  }
}

// Navigation click handler
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault()
    const viewName = link.getAttribute('href').substring(1)
    window.location.hash = viewName
    showView(viewName)
  })
})

// Handle initial route and browser back/forward
function handleRoute() {
  const hash = window.location.hash.substring(1) || 'home'
  showView(hash)
}

window.addEventListener('hashchange', handleRoute)
window.addEventListener('load', handleRoute)

// API helper functions
async function apiGet(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`)
  return response.json()
}

async function apiPost(endpoint, data) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return response.json()
}

async function apiPut(endpoint, data = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  return response.json()
}

async function apiDelete(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'DELETE'
  })
  return response.json()
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
