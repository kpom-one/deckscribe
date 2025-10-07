// Cards & Package Creation
// Sidebar layout: Package draft (left) + Card browser (right)

let packageDraft = {
  cards: [] // Array of card objects { name, image, colors: [] }
}

let cardsViewInitialized = false

// Initialize cards view
async function initCardsView() {
  // Only initialize once
  if (cardsViewInitialized) {
    return
  }
  cardsViewInitialized = true

  // Use global cache from app.js
  if (!cardsLoaded) {
    await loadAllCards()
  }

  renderPackageDraft()

  // Set up query input (only filter on space)
  const queryInput = document.getElementById('card-query')
  if (queryInput) {
    // Load query from URL on init
    const urlParams = new URLSearchParams(window.location.search)
    const queryFromUrl = urlParams.get('q')
    if (queryFromUrl) {
      queryInput.value = queryFromUrl
    }

    // Initial render with URL query or empty
    renderCardBrowser(queryInput.value)
    updateFilterButtonStates(queryInput.value)

    queryInput.addEventListener('keyup', (e) => {
      // Only trigger filter on space or enter
      if (e.key === ' ' || e.key === 'Enter') {
        const query = e.target.value
        renderCardBrowser(query)
        updateFilterButtonStates(query)
        updateUrlQuery(query)
      }
    })
  } else {
    renderCardBrowser()
  }

  // Set up buttons
  const clearBtn = document.getElementById('clear-package-btn')
  const saveBtn = document.getElementById('save-package-btn')

  if (clearBtn) {
    clearBtn.addEventListener('click', clearPackageDraft)
  }
  if (saveBtn) {
    saveBtn.addEventListener('click', savePackage)
  }

  // Set up filter toggle
  const filterToggleBtn = document.getElementById('filter-toggle-btn')
  const filterRow = document.getElementById('filter-row')

  if (filterToggleBtn && filterRow) {
    filterToggleBtn.addEventListener('click', () => {
      const isVisible = filterRow.style.display !== 'none'
      filterRow.style.display = isVisible ? 'none' : 'block'
    })
  }

  // Set up filter buttons (both ink icons and chips)
  const filterBtns = document.querySelectorAll('.filter-ink-btn, .filter-chip')
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter')
      toggleFilterInQuery(filter)
    })
  })

  // Initial filter button state
  updateFilterButtonStates('')
}

// Get full card name (name - version) for storage/matching (lowercase)
function getCardFullName(card) {
  if (card.version) {
    return `${card.name} - ${card.version}`.toLowerCase()
  }
  return card.name.toLowerCase()
}

// Get card display HTML (name with subtitle on new line)
function getCardDisplayHTML(card) {
  if (card.version) {
    return `${card.name}<br><small>${card.version}</small>`
  }
  return card.name
}

// Get card image URL
function getCardImage(card) {
  return card.image_uris?.digital?.large || card.image_uris?.digital?.normal || ''
}

// Sort cards by specified field
function sortCards(cards, sortBy, reverse = false) {
  const sorted = [...cards]

  switch (sortBy) {
    case 'cost':
    case 'c':
      sorted.sort((a, b) => {
        const costA = a.cost || 0
        const costB = b.cost || 0
        if (costA !== costB) return costA - costB
        return getCardFullName(a).localeCompare(getCardFullName(b))
      })
      break

    case 'color':
    case 'ink':
    case 'i':
      sorted.sort((a, b) => {
        const colorOrder = ['Amber', 'Amethyst', 'Emerald', 'Ruby', 'Sapphire', 'Steel']
        const getColor = (card) => {
          if (card.inks && card.inks.length > 0) return card.inks[0]
          return card.ink || ''
        }
        const colorA = getColor(a)
        const colorB = getColor(b)
        const indexA = colorOrder.indexOf(colorA)
        const indexB = colorOrder.indexOf(colorB)
        if (indexA !== indexB) return indexA - indexB
        return getCardFullName(a).localeCompare(getCardFullName(b))
      })
      break

    case 'type':
    case 't':
      sorted.sort((a, b) => {
        const typeOrder = ['Character', 'Action', 'Item', 'Location', 'Song']
        const typeA = Array.isArray(a.type) ? a.type[0] : (a.type || '')
        const typeB = Array.isArray(b.type) ? b.type[0] : (b.type || '')
        const indexA = typeOrder.indexOf(typeA)
        const indexB = typeOrder.indexOf(typeB)
        if (indexA !== indexB) return indexA - indexB
        return getCardFullName(a).localeCompare(getCardFullName(b))
      })
      break

    case 'set':
    case 'number':
    case 'collector':
      sorted.sort((a, b) => {
        const setA = parseInt(a.set?.code) || 999
        const setB = parseInt(b.set?.code) || 999
        if (setA !== setB) return setA - setB
        const numA = parseInt(a.collector_number) || 0
        const numB = parseInt(b.collector_number) || 0
        return numA - numB
      })
      break

    case 'lore':
    case 'l':
      sorted.sort((a, b) => {
        const loreA = a.lore || a.lore_value || 0
        const loreB = b.lore || b.lore_value || 0
        if (loreA !== loreB) return loreB - loreA // Descending by default
        return getCardFullName(a).localeCompare(getCardFullName(b))
      })
      break

    case 'strength':
    case 'str':
    case 's':
      sorted.sort((a, b) => {
        const strA = a.strength || 0
        const strB = b.strength || 0
        if (strA !== strB) return strB - strA // Descending by default
        return getCardFullName(a).localeCompare(getCardFullName(b))
      })
      break

    case 'willpower':
    case 'will':
    case 'w':
      sorted.sort((a, b) => {
        const willA = a.willpower || 0
        const willB = b.willpower || 0
        if (willA !== willB) return willB - willA // Descending by default
        return getCardFullName(a).localeCompare(getCardFullName(b))
      })
      break

    case 'name':
    case 'n':
    default:
      sorted.sort((a, b) => getCardFullName(a).localeCompare(getCardFullName(b)))
      break
  }

  // Reverse if requested
  if (reverse) {
    sorted.reverse()
  }

  return sorted
}

// Extract colors from a card (Lorcast uses 'inks' array for dual-color, 'ink' for single)
function getCardColors(card) {
  // Use inks array if available (handles dual-color cards)
  if (card.inks && Array.isArray(card.inks) && card.inks.length > 0) {
    return card.inks
  }

  // Fall back to single ink field
  if (card.ink) {
    return [card.ink]
  }

  return []
}

// Render package draft panel
function renderPackageDraft() {
  const container = document.getElementById('package-draft-cards')
  const countEl = document.getElementById('package-card-count')
  const clearBtn = document.getElementById('clear-package-btn')

  if (!container || !countEl) return

  // Update count
  countEl.textContent = packageDraft.cards.length

  // Update ink color indicators
  updateInkIndicators()

  // Show/hide clear button
  if (packageDraft.cards.length > 0) {
    if (clearBtn) clearBtn.style.display = 'inline-block'
  } else {
    if (clearBtn) clearBtn.style.display = 'none'
  }

  // Render cards as images
  if (packageDraft.cards.length === 0) {
    container.innerHTML = '<p class="empty-state-small">Click cards to add</p>'
    return
  }

  container.innerHTML = packageDraft.cards
    .map(card => {
      const imageSrc = card.image || ''
      return `
        <div class="draft-card-image" onclick="removeCardFromDraft('${card.name.replace(/'/g, "\\'")}')">
          ${imageSrc ? `<img src="${imageSrc}" alt="${card.name}" onerror="this.style.display='none'">` : `<div class="no-image">${card.name}</div>`}
          <div class="remove-overlay">×</div>
        </div>
      `
    })
    .join('')
}

// Update ink indicators (display only - read from cards)
function updateInkIndicators() {
  // Get colors from selected cards
  const colors = new Set()
  packageDraft.cards.forEach(card => {
    if (card.colors && Array.isArray(card.colors)) {
      card.colors.forEach(c => colors.add(c))
    }
  })

  // Update UI (display only, not clickable)
  document.querySelectorAll('.ink-icon').forEach(icon => {
    const color = icon.getAttribute('data-color')
    if (colors.has(color)) {
      icon.classList.add('active')
    } else {
      icon.classList.remove('active')
    }
  })
}

// Render card browser
function renderCardBrowser(queryText = '') {
  const container = document.getElementById('card-grid')
  if (!container) return

  let cardsToShow = allCardsCache
  let sortBy = 'name' // default

  // Extract sort parameter from query
  let reverse = false
  if (queryText) {
    const sortMatch = queryText.match(/\b(?:sort|s):(-?\w+)\b/)
    if (sortMatch) {
      const sortValue = sortMatch[1].toLowerCase()
      if (sortValue.startsWith('-')) {
        reverse = true
        sortBy = sortValue.substring(1)
      } else {
        sortBy = sortValue
      }
      // Remove sort parameter from query before filtering
      queryText = queryText.replace(/\b(?:sort|s):-?\w+\b/g, '').trim()
    }
  }

  // Apply query filter
  if (queryText) {
    try {
      cardsToShow = applyQuery(cardsToShow, queryText)
    } catch (error) {
      container.innerHTML = `<p class="empty-state">Invalid query: ${error.message}</p>`
      return
    }
  }

  // De-duplicate by full card name (name - version)
  const seenNames = new Set()
  cardsToShow = cardsToShow.filter(card => {
    const fullName = getCardFullName(card)
    if (seenNames.has(fullName)) {
      return false
    }
    seenNames.add(fullName)
    return true
  })

  // Sort cards
  cardsToShow = sortCards(cardsToShow, sortBy, reverse)

  if (cardsToShow.length === 0) {
    container.innerHTML = '<p class="empty-state">No cards found</p>'
    return
  }

  container.innerHTML = cardsToShow
    .map(card => {
      const fullName = getCardFullName(card)
      const displayHTML = getCardDisplayHTML(card)
      const isInDraft = packageDraft.cards.some(c => c.name === fullName)
      const imageSrc = getCardImage(card)
      return `
        <div class="card-item ${isInDraft ? 'selected' : ''}" onclick="toggleCardInDraft('${fullName.replace(/'/g, "\\'")}')">
          ${imageSrc ? `<img src="${imageSrc}" alt="${fullName}" class="card-image" onerror="this.style.display='none'">` : ''}
          <div class="card-name">${displayHTML}</div>
          ${isInDraft ? '<div class="selected-badge">✓</div>' : ''}
        </div>
      `
    })
    .join('')
}

// Toggle card in draft
function toggleCardInDraft(cardName) {
  const index = packageDraft.cards.findIndex(c => c.name === cardName)

  if (index === -1) {
    // Adding card - find the full card object
    const fullCard = allCardsCache.find(c => getCardFullName(c) === cardName)
    if (!fullCard) {
      console.error('Card not found in cache:', cardName)
      return
    }

    const cardColors = getCardColors(fullCard)
    const imageSrc = getCardImage(fullCard)

    packageDraft.cards.push({
      name: cardName,
      image: imageSrc,
      colors: cardColors
    })
  } else {
    // Removing card
    packageDraft.cards.splice(index, 1)
  }

  renderPackageDraft()

  // Re-render card browser to update selected state
  const queryInput = document.getElementById('card-query')
  renderCardBrowser(queryInput ? queryInput.value : '')
}

// Remove card from draft
function removeCardFromDraft(cardName) {
  const index = packageDraft.cards.findIndex(c => c.name === cardName)
  if (index !== -1) {
    packageDraft.cards.splice(index, 1)
  }

  renderPackageDraft()

  // Re-render card browser to update selected state
  const queryInput = document.getElementById('card-query')
  renderCardBrowser(queryInput ? queryInput.value : '')
}

// Save package
async function savePackage() {
  const nameInput = document.getElementById('package-name')
  const descInput = document.getElementById('package-description')
  const notesInput = document.getElementById('package-notes')

  const name = nameInput ? nameInput.value.trim() : ''
  const description = descInput ? descInput.value.trim() : ''
  const notes = notesInput ? notesInput.value.trim() : ''

  // Validate
  if (!name) {
    alert('Package name is required')
    if (nameInput) nameInput.focus()
    return
  }

  if (packageDraft.cards.length === 0) {
    alert('Package must contain at least one card')
    return
  }

  // Validate 2-color rule
  const colors = new Set()
  packageDraft.cards.forEach(card => {
    card.colors.forEach(c => colors.add(c))
  })

  if (colors.size > 2) {
    alert(`Package has ${colors.size} colors: ${Array.from(colors).join(', ')}. Maximum is 2.`)
    return
  }

  try {
    // Create package
    const pkg = await apiPost('/packages', {
      name,
      description,
      cards: packageDraft.cards.map(c => c.name),
      notes
    })

    // Finalize (make immutable)
    await apiPut(`/packages/${pkg.id}/finalize`)

    alert(`Package "${name}" created successfully!`)

    // Reset everything
    clearPackageDraft()
  } catch (error) {
    console.error('Failed to save package:', error)
    alert('Failed to save package. See console for details.')
  }
}

// Clear package draft
function clearPackageDraft() {
  packageDraft.cards = []

  const nameInput = document.getElementById('package-name')
  const descInput = document.getElementById('package-description')
  const notesInput = document.getElementById('package-notes')
  const queryInput = document.getElementById('card-query')

  if (nameInput) nameInput.value = ''
  if (descInput) descInput.value = ''
  if (notesInput) notesInput.value = ''
  if (queryInput) queryInput.value = ''

  renderPackageDraft()

  // Re-render card browser with empty query
  renderCardBrowser('')
  updateFilterButtonStates('')
  updateUrlQuery('')
}

// Toggle filter in query
function toggleFilterInQuery(filter) {
  const queryInput = document.getElementById('card-query')
  if (!queryInput) return

  let query = queryInput.value.trim()
  const tokens = query.split(/\s+/).filter(t => t)

  // Check if filter already exists
  const index = tokens.indexOf(filter)

  if (index !== -1) {
    // Remove filter
    tokens.splice(index, 1)
  } else {
    // Add filter
    tokens.push(filter)
  }

  // Update query
  query = tokens.join(' ')
  queryInput.value = query

  // Trigger update
  renderCardBrowser(query)
  updateFilterButtonStates(query)
  updateUrlQuery(query)
}

// Update URL query parameter
function updateUrlQuery(query) {
  const url = new URL(window.location)
  if (query && query.trim()) {
    url.searchParams.set('q', query.trim())
  } else {
    url.searchParams.delete('q')
  }
  window.history.replaceState({}, '', url)
}

// Update filter button active states based on query
function updateFilterButtonStates(query) {
  const tokens = query.trim().split(/\s+/).filter(t => t)

  // Extract active ink colors from query (normalize aliases)
  const activeInkColors = new Set()
  tokens.forEach(token => {
    // Check for ink:color patterns
    if (token.startsWith('i:')) {
      const colorPart = token.substring(2).toLowerCase()

      // Try as full color name first (i:amber, i:yellow, etc.)
      const asFullColor = normalizeInkColorAlias(colorPart)
      if (asFullColor) {
        activeInkColors.add(asFullColor)
      } else {
        // Handle multi-character shorthand (i:yp -> amber, amethyst)
        for (const char of colorPart.replace(/m/g, '')) {
          const normalized = normalizeInkColorAlias(char)
          if (normalized) activeInkColors.add(normalized)
        }
      }
    }
  })

  // Update ink color buttons
  document.querySelectorAll('.filter-ink-btn').forEach(btn => {
    const color = btn.getAttribute('data-color')
    if (activeInkColors.has(color)) {
      btn.classList.add('active')
    } else {
      btn.classList.remove('active')
    }
  })

  // Update other filter chips (exact match)
  document.querySelectorAll('.filter-chip').forEach(btn => {
    const filter = btn.getAttribute('data-filter')
    if (tokens.includes(filter)) {
      btn.classList.add('active')
    } else {
      btn.classList.remove('active')
    }
  })
}

// Helper to normalize ink color alias to full color name
function normalizeInkColorAlias(char) {
  const aliases = {
    'y': 'amber',
    'yellow': 'amber',
    'gold': 'amber',
    'amber': 'amber',
    'p': 'amethyst',
    'purple': 'amethyst',
    'amethyst': 'amethyst',
    'e': 'emerald',
    'g': 'emerald',
    'green': 'emerald',
    'emerald': 'emerald',
    'r': 'ruby',
    'red': 'ruby',
    'ruby': 'ruby',
    'b': 'sapphire',
    'u': 'sapphire',
    'blue': 'sapphire',
    'sapphire': 'sapphire',
    'steel': 'steel',
    'silver': 'steel'
  }
  return aliases[char.toLowerCase()]
}
