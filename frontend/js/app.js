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

async function apiPut(endpoint, data) {
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

// Test API connection on load
async function testApi() {
  try {
    const result = await apiGet('/health')
    console.log('✅ API connected:', result)
  } catch (error) {
    console.error('❌ API connection failed:', error)
  }
}

testApi()
