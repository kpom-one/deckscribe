// Cards & Package Creation with Accordion
// Sidebar layout: Package accordion (left) + Card browser (right)

let openPackages = [] // Array of package objects from backend
let selectedFormat = 'core' // Default to core
let cardsViewInitialized = false
let selectedColors = [] // Array of selected color filters (max 2), NOT in query string

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

  // Load packages from backend
  await loadPackagesFromBackend()

  // Render accordion
  renderPackageAccordion()

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

  // Set up new package button
  const newPackageBtn = document.getElementById('new-package-btn')
  const newPackageInput = document.getElementById('new-package-name')

  if (newPackageBtn) {
    newPackageBtn.addEventListener('click', createNewPackage)
  }

  // Allow Enter key to create new package
  if (newPackageInput) {
    newPackageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        createNewPackage()
      }
    })
  }

  // Set up format selector
  const formatCoreBtn = document.getElementById('format-core-btn')
  const formatInfinityBtn = document.getElementById('format-infinity-btn')

  if (formatCoreBtn) {
    formatCoreBtn.addEventListener('click', () => {
      selectedFormat = 'core'
      formatCoreBtn.classList.add('active')
      formatInfinityBtn.classList.remove('active')
      const queryInput = document.getElementById('card-query')
      renderCardBrowser(queryInput ? queryInput.value : '')
    })
  }

  if (formatInfinityBtn) {
    formatInfinityBtn.addEventListener('click', () => {
      selectedFormat = 'infinity'
      formatInfinityBtn.classList.add('active')
      formatCoreBtn.classList.remove('active')
      const queryInput = document.getElementById('card-query')
      renderCardBrowser(queryInput ? queryInput.value : '')
    })
  }

  // Set up color filter icons
  const colorFilterIcons = document.querySelectorAll('.color-filter-icon')
  colorFilterIcons.forEach(icon => {
    icon.addEventListener('click', () => {
      const color = icon.getAttribute('data-color')
      toggleColorFilter(color)
    })
  })

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

// Toggle color filter
function toggleColorFilter(color) {
  const index = selectedColors.indexOf(color)

  if (index !== -1) {
    // Color already selected, remove it
    selectedColors.splice(index, 1)
  } else {
    // Adding new color
    if (selectedColors.length >= 2) {
      // Already have 2 colors, remove the first one
      selectedColors.shift()
    }
    selectedColors.push(color)
  }

  // Update UI
  updateColorFilterUI()

  // Re-render card browser
  const queryInput = document.getElementById('card-query')
  renderCardBrowser(queryInput ? queryInput.value : '')
}

// Update color filter icon active states
function updateColorFilterUI() {
  const colorFilterIcons = document.querySelectorAll('.color-filter-icon')
  colorFilterIcons.forEach(icon => {
    const color = icon.getAttribute('data-color')
    if (selectedColors.includes(color)) {
      icon.classList.add('active')
    } else {
      icon.classList.remove('active')
    }
  })
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

// Load packages from backend
async function loadPackagesFromBackend() {
  try {
    const packages = await apiGet('/packages')
    openPackages = packages.map(pkg => ({
      ...pkg,
      // Hydrate card names into full objects with images/colors
      cards: pkg.cards.map(cardName => {
        const fullCard = allCardsCache.find(c => getCardFullName(c) === cardName.toLowerCase())
        if (fullCard) {
          return {
            name: cardName.toLowerCase(),
            image: getCardImage(fullCard),
            colors: getCardColors(fullCard)
          }
        }
        // Card not found in cache, store as minimal object
        return {
          name: cardName.toLowerCase(),
          image: '',
          colors: []
        }
      }),
      isExpanded: false // UI state only, don't persist
    }))
    console.log(`✅ Loaded ${openPackages.length} packages from backend`)
  } catch (error) {
    console.error('Failed to load packages:', error)
    openPackages = []
  }
}

// Create new package
async function createNewPackage() {
  const newPackageInput = document.getElementById('new-package-name')
  const userProvidedName = newPackageInput ? newPackageInput.value.trim().toLowerCase() : ''

  if (!userProvidedName) {
    alert('Please enter a package name')
    return
  }

  if (!validatePackageName(userProvidedName)) {
    alert('Package name must contain only lowercase letters, numbers, and dashes (a-z, 0-9, -)')
    return
  }

  try {
    // Create on backend immediately
    const newPkg = await apiPost('/packages', {
      name: userProvidedName,
      description: '',
      cards: []
    })

    console.log(`✅ Created package "${newPkg.name}" (${newPkg.id})`)

    // Add to local array with UI state
    openPackages.push({
      ...newPkg,
      isExpanded: true
    })

    // Clear input
    if (newPackageInput) newPackageInput.value = ''

    renderPackageAccordion()

    // Re-render card browser to update selected state
    const queryInput = document.getElementById('card-query')
    renderCardBrowser(queryInput ? queryInput.value : '')
  } catch (error) {
    console.error('Failed to create package:', error)
    alert('Failed to create package. Check console for details.')
  }
}

// Toggle package expanded state (only one can be expanded at a time)
function togglePackageExpanded(index) {
  if (index < 0 || index >= openPackages.length) return

  const wasExpanded = openPackages[index].isExpanded

  // Collapse all packages
  openPackages.forEach(pkg => pkg.isExpanded = false)

  // Toggle this package
  openPackages[index].isExpanded = !wasExpanded

  renderPackageAccordion()

  // Re-render card browser to update selected state
  const queryInput = document.getElementById('card-query')
  renderCardBrowser(queryInput ? queryInput.value : '')
}

// Close (delete) package
async function closePackage(index) {
  if (index < 0 || index >= openPackages.length) return

  const pkg = openPackages[index]
  if (!confirm(`Delete package "${pkg.name}"? This cannot be undone.`)) {
    return
  }

  try {
    // Delete from backend
    await apiDelete(`/packages/${pkg.id}`)
    console.log(`✅ Deleted package "${pkg.name}" (${pkg.id})`)

    // Remove from local array
    openPackages.splice(index, 1)
    renderPackageAccordion()

    // Re-render card browser to update selected state
    const queryInput = document.getElementById('card-query')
    renderCardBrowser(queryInput ? queryInput.value : '')
  } catch (error) {
    console.error('Failed to delete package:', error)
    alert('Failed to delete package. Check console for details.')
  }
}

// Get colors from package cards
function getPackageColors(pkg) {
  const colors = new Set()
  pkg.cards.forEach(card => {
    if (card.colors && Array.isArray(card.colors)) {
      card.colors.forEach(c => colors.add(c))
    }
  })
  return Array.from(colors).sort()
}

// Get package colors from its cards
function getPackageColorsForDisplay(pkg) {
  const colors = new Set()

  if (!pkg.cards || pkg.cards.length === 0) {
    return []
  }

  pkg.cards.forEach(card => {
    if (card.colors && Array.isArray(card.colors)) {
      card.colors.forEach(c => colors.add(c))
    }
  })

  return Array.from(colors).sort()
}

// Check if package should be visible based on color filter
function isPackageVisible(pkg) {
  if (selectedColors.length === 0) {
    return true // No filter, show all
  }

  const pkgColors = getPackageColorsForDisplay(pkg)

  // Empty packages should always show up
  if (pkgColors.length === 0) {
    return true
  }

  if (selectedColors.length === 1) {
    // Show packages that contain this color
    return pkgColors.includes(selectedColors[0])
  }

  if (selectedColors.length === 2) {
    // Show packages with exactly these two colors
    const sortedPkgColors = [...pkgColors].sort()
    const filterColors = [...selectedColors].sort()
    return sortedPkgColors.length === 2 &&
           sortedPkgColors[0] === filterColors[0] &&
           sortedPkgColors[1] === filterColors[1]
  }

  return true
}

// Render package accordion
function renderPackageAccordion() {
  const container = document.getElementById('package-accordion')
  if (!container) return

  if (openPackages.length === 0) {
    container.innerHTML = '<div class="package-accordion-empty">No packages yet. Create one below.</div>'
    return
  }

  // Filter packages by color
  const visiblePackages = openPackages.filter((pkg, index) => {
    return isPackageVisible(pkg)
  })

  if (visiblePackages.length === 0) {
    container.innerHTML = '<div class="package-accordion-empty">No packages match current filter.</div>'
    return
  }

  container.innerHTML = visiblePackages
    .map((pkg) => {
      const index = openPackages.indexOf(pkg)
      const isExpanded = pkg.isExpanded
      const displayName = pkg.name || 'Untitled'
      const colors = getPackageColorsForDisplay(pkg)

      // Render ink icons
      const inkIcons = colors.map(color => {
        return `<img class="ink-icon" data-color="${color}" src="img/${color.toLowerCase()}.png" alt="${color}" title="${color}">`
      }).join('')

      // Render cards
      let cardsHTML = ''
      if (pkg.cards.length === 0) {
        cardsHTML = '<div class="package-accordion-empty">Click cards to add</div>'
      } else {
        cardsHTML = `
          <div class="package-accordion-cards">
            ${pkg.cards.map(card => {
              const imageSrc = card.image || ''
              return `
                <div class="package-accordion-card" onclick="removeCardFromPackage('${card.name.replace(/'/g, "\\'")}', ${index})">
                  ${imageSrc ? `<img src="${imageSrc}" alt="${card.name}" onerror="this.style.display='none'">` : `<div class="no-image">${card.name}</div>`}
                  <div class="remove-overlay">×</div>
                </div>
              `
            }).join('')}
          </div>
        `
      }

      return `
        <div class="package-accordion-item">
          <div class="package-accordion-header ${isExpanded ? 'expanded' : ''}" onclick="togglePackageExpanded(${index})">
            <div class="package-accordion-title">
              <span class="package-accordion-chevron">▸</span>
              <div class="package-accordion-inks-inline">${inkIcons}</div>
              ${displayName}
            </div>
            <div class="package-accordion-actions">
              <button class="package-accordion-close" onclick="event.stopPropagation(); closePackage(${index})" title="Close">×</button>
            </div>
          </div>
          <div class="package-accordion-content ${isExpanded ? 'expanded' : ''}">
            <div class="package-accordion-meta">
              <div class="package-accordion-count"><span>${pkg.cards.length}</span> cards</div>
            </div>
            ${cardsHTML}
          </div>
        </div>
      `
    })
    .join('')
}

// Save package to backend
async function savePackage(pkg) {
  try {
    // Filter out any invalid cards and extract names
    const cardNames = pkg.cards
      .filter(c => c && c.name)
      .map(c => c.name)

    await apiPut(`/packages/${pkg.id}`, {
      name: pkg.name,
      description: pkg.description || '',
      cards: cardNames
    })
    console.log(`✅ Saved package "${pkg.name}" (${pkg.id})`)
  } catch (error) {
    console.error(`❌ Failed to save package "${pkg.name}":`, error)
    throw error
  }
}

// Validate package name
function validatePackageName(name) {
  // Must be non-empty lowercase alphanumeric and dashes
  return name && /^[a-z0-9-]+$/.test(name)
}

// Remove card from package
async function removeCardFromPackage(cardName, packageIndex) {
  if (packageIndex < 0 || packageIndex >= openPackages.length) return

  const pkg = openPackages[packageIndex]
  const index = pkg.cards.findIndex(c => c.name === cardName)
  if (index !== -1) {
    pkg.cards.splice(index, 1)
  }

  renderPackageAccordion()

  // Save to backend immediately
  await savePackage(pkg)

  // Re-render card browser to update selected state
  const queryInput = document.getElementById('card-query')
  renderCardBrowser(queryInput ? queryInput.value : '')
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

  // Remove any existing format keywords from user query
  queryText = queryText.replace(/\b(core|infinity)\b/gi, '').trim()

  // Build full query with format filter
  let fullQuery = queryText
  if (selectedFormat) {
    fullQuery = fullQuery ? `${fullQuery} ${selectedFormat}` : selectedFormat
  }

  // #TODO: We need to #dobetter here - if the query string has color filters (i:y, i:p, etc.),
  // those should override the UI color filter buttons. For now, if there are query string color
  // filters, we'll just let those take precedence and the UI buttons won't work as expected.
  // Ideally we should detect query color filters and either:
  // 1. Update the UI buttons to match the query
  // 2. Remove color filters from query and always use UI buttons
  // 3. Show a visual indicator that query is overriding UI

  // Add color filter to query if selected (only if no color filter in query already)
  const hasQueryColorFilter = /\bi[!:]?\w+/i.test(queryText)
  if (!hasQueryColorFilter && selectedColors.length > 0) {
    // Build color filter query
    let colorQuery = ''
    if (selectedColors.length === 1) {
      // One color: show cards that have this color
      colorQuery = `i:${colorToShorthand(selectedColors[0])}`
    } else if (selectedColors.length === 2) {
      // Two colors: show cards with exactly these colors (i!xy means exactly x and y)
      const color1 = colorToShorthand(selectedColors[0])
      const color2 = colorToShorthand(selectedColors[1])
      colorQuery = `i!${color1}${color2}`
    }

    if (colorQuery) {
      fullQuery = fullQuery ? `${fullQuery} ${colorQuery}` : colorQuery
    }
  }

  // Apply query filter
  if (fullQuery) {
    try {
      cardsToShow = applyQuery(cardsToShow, fullQuery)
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

      // Check if card is in the currently expanded package
      let isInPackage = false
      const expandedPkg = openPackages.find(pkg => pkg.isExpanded)
      if (expandedPkg) {
        isInPackage = expandedPkg.cards.some(c => c.name === fullName)
      }

      const imageSrc = getCardImage(card)
      return `
        <div class="card-item ${isInPackage ? 'selected' : ''}" onclick="toggleCardInPackage('${fullName.replace(/'/g, "\\'")}')">
          ${imageSrc ? `<img src="${imageSrc}" alt="${fullName}" class="card-image" onerror="this.style.display='none'">` : ''}
          <div class="card-name">${displayHTML}</div>
          ${isInPackage ? '<div class="selected-badge">✓</div>' : ''}
        </div>
      `
    })
    .join('')
}

// Toggle card in package (adds to first expanded package)
async function toggleCardInPackage(cardName) {
  // Find first expanded package
  const expandedIndex = openPackages.findIndex(pkg => pkg.isExpanded)

  if (expandedIndex === -1) {
    alert('Please expand a package first (click on a package name)')
    return
  }

  const pkg = openPackages[expandedIndex]
  const index = pkg.cards.findIndex(c => c.name === cardName)

  if (index === -1) {
    // Adding card - find the full card object
    const fullCard = allCardsCache.find(c => getCardFullName(c) === cardName)
    if (!fullCard) {
      console.error('Card not found in cache:', cardName)
      return
    }

    const cardColors = getCardColors(fullCard)
    const imageSrc = getCardImage(fullCard)

    pkg.cards.push({
      name: cardName,
      image: imageSrc,
      colors: cardColors
    })

    renderPackageAccordion()

    // Save to backend immediately
    await savePackage(pkg)
  } else {
    // Card already in this package, remove it
    await removeCardFromPackage(cardName, expandedIndex)
  }

  // Re-render card browser to update selected state
  const queryInput = document.getElementById('card-query')
  renderCardBrowser(queryInput ? queryInput.value : '')
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
    's': 'steel',
    'steel': 'steel',
    'silver': 'steel'
  }
  return aliases[char.toLowerCase()]
}

// Helper to convert color name to shorthand for query
function colorToShorthand(colorName) {
  const shorthand = {
    'amber': 'y',
    'amethyst': 'p',
    'emerald': 'e',
    'ruby': 'r',
    'sapphire': 'b',
    'steel': 's'
  }
  return shorthand[colorName.toLowerCase()] || colorName.toLowerCase()[0]
}
