// Deck Detail View - Single Deck with Builds

let currentDeck = null
let allBuilds = []
let deckDetailViewInitialized = false
let selectedBuildId = null
let currentTab = 'builds' // 'builds' or 'new-build'

// Initialize deck detail view
async function initDeckDetailView() {
  if (deckDetailViewInitialized) return
  deckDetailViewInitialized = true

  // Load cards cache
  if (!cardsLoaded) {
    await loadAllCards()
  }

  // Get deck ID from URL params (e.g., ?deck=abc123)
  const urlParams = new URLSearchParams(window.location.search)
  const deckId = urlParams.get('deck')

  if (!deckId) {
    // No deck specified, show message
    document.getElementById('deck-title').textContent = 'No Deck Selected'
    document.getElementById('builds-list').innerHTML = '<p class="empty-state-small">Please select a deck from the Decks page</p>'
    return
  }

  await loadDeck(deckId)
  await loadBuilds(deckId)
  renderBuildsList()

  // Auto-select most recent build or switch to New Build tab
  if (allBuilds.length > 0) {
    // Select the first build (most recent)
    selectBuild(allBuilds[0].id)
  } else {
    // No builds, switch to New Build tab
    switchBuildTab('new-build')
  }
}

// Load single deck from API
async function loadDeck(deckId) {
  try {
    currentDeck = await apiGet(`/decks/${deckId}`)
    // Update page title
    document.getElementById('deck-title').textContent = currentDeck.name || 'Deck'
  } catch (error) {
    console.error('Failed to load deck:', error)
    document.getElementById('deck-title').textContent = 'Error Loading Deck'
  }
}

// Load builds for current deck
async function loadBuilds(deckId) {
  try {
    allBuilds = await apiGet(`/decks/${deckId}/builds`)
  } catch (error) {
    console.error('Failed to load builds:', error)
    allBuilds = []
  }
}

// Switch between builds and new build tabs
function switchBuildTab(tab) {
  currentTab = tab

  const buildsTab = document.getElementById('builds-tab')
  const newBuildTab = document.getElementById('new-build-tab')
  const buildsView = document.getElementById('builds-view')
  const newBuildView = document.getElementById('new-build-view')

  if (tab === 'builds') {
    buildsTab.classList.add('active')
    newBuildTab.classList.remove('active')
    buildsView.style.display = 'block'
    newBuildView.style.display = 'none'

    // Show build details or empty state
    if (selectedBuildId) {
      renderBuildDetails()
    } else {
      const buildContent = document.getElementById('build-content')
      if (buildContent) {
        buildContent.innerHTML = '<p class="empty-state">Select a build to view details</p>'
      }
    }
  } else {
    buildsTab.classList.remove('active')
    newBuildTab.classList.add('active')
    buildsView.style.display = 'none'
    newBuildView.style.display = 'block'

    // Show new build interface
    renderNewBuildInterface()
  }
}

// Render builds list
function renderBuildsList() {
  const container = document.getElementById('builds-list')
  if (!container) return

  if (allBuilds.length === 0) {
    container.innerHTML = '<div class="empty-state-small">No builds yet. Create one using the "New Build" tab.</div>'
    return
  }

  container.innerHTML = allBuilds
    .map(build => {
      const isSelected = selectedBuildId === build.id
      return `
        <div class="build-sidebar-item ${isSelected ? 'selected' : ''}" onclick="selectBuild('${build.id}')">
          <div class="build-sidebar-name">${build.name}</div>
          <div class="build-sidebar-date">${formatDate(build.created_at)}</div>
        </div>
      `
    })
    .join('')
}

// Select a build
function selectBuild(buildId) {
  selectedBuildId = buildId
  renderBuildsList()
  renderBuildDetails()
}

// Render build details in main content
function renderBuildDetails() {
  const container = document.getElementById('build-content')
  if (!container) return

  if (!selectedBuildId) {
    container.innerHTML = '<p class="empty-state">Select a build to view details</p>'
    return
  }

  const build = allBuilds.find(b => b.id === selectedBuildId)
  if (!build) {
    container.innerHTML = '<p class="empty-state">Build not found</p>'
    return
  }

  // Placeholder for build details
  container.innerHTML = `
    <div class="build-detail-header">
      <h2>${build.name}</h2>
      <p class="build-detail-date">Created ${formatDate(build.created_at)}</p>
    </div>
    <div class="build-detail-content">
      <p class="empty-state">Build details coming soon...</p>
    </div>
  `
}

// Get card by name from cache
function getCardByName(cardName) {
  const normalizedName = cardName.toLowerCase()
  return allCardsCache.find(c => {
    const fullName = c.version ? `${c.name} - ${c.version}`.toLowerCase() : c.name.toLowerCase()
    return fullName === normalizedName
  })
}

// Get card image by name
function getCardImageByName(cardName) {
  const card = getCardByName(cardName)
  if (card) {
    return card.image_uris?.digital?.large || card.image_uris?.digital?.normal || ''
  }
  return ''
}

// Render new build interface
async function renderNewBuildInterface() {
  const container = document.getElementById('build-content')
  if (!container) return

  if (!currentDeck) {
    container.innerHTML = '<p class="empty-state">No deck loaded</p>'
    return
  }

  // Load all packages in this deck
  const packageIds = currentDeck.packages || []
  if (packageIds.length === 0) {
    container.innerHTML = '<div class="build-detail-header"><h2>New Build</h2></div><p class="empty-state">This deck has no packages. Add packages from the Packages page.</p>'
    return
  }

  // Fetch all packages
  let allPackages = []
  try {
    allPackages = await Promise.all(
      packageIds.map(id => apiGet(`/packages/${id}`).catch(() => null))
    )
    allPackages = allPackages.filter(p => p !== null)
  } catch (error) {
    console.error('Failed to load packages:', error)
    container.innerHTML = '<p class="empty-state">Failed to load packages</p>'
    return
  }

  // Collect all cards with their details (deduplicated by name)
  const cardMap = new Map() // Use Map to deduplicate by card name
  allPackages.forEach(pkg => {
    if (pkg.cards && Array.isArray(pkg.cards)) {
      pkg.cards.forEach(cardName => {
        const normalizedName = cardName.toLowerCase()
        // Only add if not already in map (deduplication)
        if (!cardMap.has(normalizedName)) {
          const card = getCardByName(cardName)
          if (card) {
            cardMap.set(normalizedName, {
              name: cardName,
              cost: card.cost || 0,
              image: getCardImageByName(cardName),
              card: card
            })
          }
        }
      })
    }
  })

  // Convert map to array
  const allCards = Array.from(cardMap.values())

  // Store packages for stats display
  currentPackages = allPackages

  // Initialize card counts first
  initializeCardCounts(allCards)

  // Calculate stats (now that counts are initialized)
  const stats = calculateDeckStats(allCards)

  // Group by cost with actual counts for rendering
  const cardsByCost = {}
  allCards.forEach(card => {
    const cardName = card.name.toLowerCase()
    const count = cardCounts[cardName] || 0
    if (count > 0) {
      if (!cardsByCost[card.cost]) {
        cardsByCost[card.cost] = []
      }
      // Add card 'count' times for the cost curve
      for (let i = 0; i < count; i++) {
        cardsByCost[card.cost].push(card)
      }
    }
  })

  // Sort costs
  const costs = Object.keys(cardsByCost).map(Number).sort((a, b) => a - b)

  // Render
  let html = `
    <div class="build-detail-header">
      <input type="text" id="build-name-input" class="build-name-input" value="New Build" placeholder="Build name...">
      <div class="build-card-count" id="build-card-count">${stats.totalCards}/60</div>
    </div>

    <!-- Stats Section -->
    <div class="build-stats-section">
      <div class="build-stats-left">
        <h3>Deck List</h3>
        <div class="deck-list-text" id="deck-list-text">
          ${generateDeckListText(allCards)}
        </div>
      </div>
      <div class="build-stats-right">
        <h3>Statistics</h3>
        <div class="stats-grid">
          ${renderCostCurveChart(cardsByCost, stats)}
          ${renderTypePieChart(stats)}
          ${renderKeywordsList(stats)}
          ${renderInkablePieChart(stats)}
        </div>
      </div>
    </div>

    <div class="build-cards-divider"></div>

    <div class="new-build-card-list">
  `

  costs.forEach(cost => {
    const cards = cardsByCost[cost]
    html += `
      <div class="cost-group-compact">
        <div class="cost-label-compact">${cost}</div>
        <div class="cost-group-cards-compact" id="cost-group-${cost}">
          ${renderCostGroupCards(cards)}
        </div>
      </div>
    `
  })

  html += '</div>'
  container.innerHTML = html

  // Apply initial grouping mode display
  setTimeout(() => updateCardDisplay(), 0)
}

// Initialize card counts (4x each by default)
let cardCounts = {}
let currentGroupingMode = 'cost' // 'cost', 'inkable', 'type', 'keyword'
let currentPackages = [] // Store packages for stats display

function initializeCardCounts(allCards) {
  cardCounts = {}
  allCards.forEach(card => {
    const cardName = card.name.toLowerCase()
    cardCounts[cardName] = 4
  })
}

// Change grouping mode and re-render
function setGroupingMode(mode) {
  currentGroupingMode = mode
  updateCardDisplay()
}

// Update card display based on grouping mode
function updateCardDisplay() {
  // Ban list for characteristics to exclude
  const characteristicBanList = ['Storyborn', 'Floodborn', 'Dreamborn']

  // Get all cards data
  const allCards = []
  document.querySelectorAll('.deck-list-line').forEach(line => {
    const cardName = line.getAttribute('data-card-name')
    const card = getCardByName(cardName)
    if (card) {
      const count = cardCounts[cardName] || 0
      if (count > 0) {
        allCards.push({
          name: cardName,
          cost: card.cost || 0,
          card: card,
          image: getCardImageByName(cardName),
          count: count
        })
      }
    }
  })

  // Pre-calculate stats for characteristic filtering
  const stats = calculateDeckStats(allCards.map(c => ({ name: c.name, card: c.card })))

  // Group cards based on current mode
  const groups = {}

  allCards.forEach(cardData => {
    let groupKeys = []

    switch (currentGroupingMode) {
      case 'cost':
        groupKeys = [cardData.cost]
        break
      case 'inkable':
        groupKeys = [(cardData.card.inkwell || cardData.card.inkable) ? 'Inkable' : 'Non-Inkable']
        break
      case 'type':
        groupKeys = [Array.isArray(cardData.card.type) ? cardData.card.type[0] : (cardData.card.type || 'Unknown')]
        break
      case 'characteristic':
        // For characteristics, card can appear in multiple groups
        if (cardData.card.classifications && Array.isArray(cardData.card.classifications)) {
          const validCharacteristics = cardData.card.classifications
            .filter(characteristic => {
              // Exclude banned characteristics
              if (characteristicBanList.includes(characteristic)) return false
              // Only show characteristics with > 8 total count
              return stats.characteristics[characteristic] > 8
            })

          if (validCharacteristics.length > 0) {
            groupKeys = validCharacteristics
          } else {
            // No valid characteristics - hide this card
            return
          }
        } else {
          // No characteristics at all - hide this card
          return
        }
        break
    }

    // Add card to each group it belongs to (without duplicates)
    groupKeys.forEach(groupKey => {
      if (!groups[groupKey]) groups[groupKey] = []
      // Only add card once with its count
      groups[groupKey].push(cardData)
    })
  })

  // Render the groups
  const cardListContainer = document.querySelector('.new-build-card-list')
  if (!cardListContainer) return

  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (currentGroupingMode === 'cost') return Number(a) - Number(b)
    return a.localeCompare(b)
  })

  let html = ''
  sortedKeys.forEach(key => {
    const cards = groups[key]

    // Remove duplicates by grouping by card name
    const uniqueCardsMap = new Map()
    cards.forEach(cardData => {
      const cardKey = cardData.name.toLowerCase()
      if (!uniqueCardsMap.has(cardKey)) {
        uniqueCardsMap.set(cardKey, cardData)
      }
    })
    const uniqueCards = Array.from(uniqueCardsMap.values())

    // Separate characters from non-characters for cost grouping
    let leftCards = []
    let rightCards = []

    if (currentGroupingMode === 'cost') {
      uniqueCards.forEach(cardData => {
        const cardType = Array.isArray(cardData.card.type) ? cardData.card.type[0] : cardData.card.type
        if (cardType === 'Character') {
          leftCards.push(cardData)
        } else {
          rightCards.push(cardData)
        }
      })
    } else {
      leftCards = uniqueCards
    }

    const renderCardStack = (cardData) => {
      const count = cardData.count
      let stackHtml = `<div class="card-stack" onmouseenter="showCardPreview('${cardData.name.replace(/'/g, "\\'")}', event)" onmouseleave="hideCardPreview()">`
      for (let i = 0; i < count; i++) {
        stackHtml += `
          <div class="build-card-item stacked" style="--stack-index: ${i};">
            ${cardData.image
              ? `<img src="${cardData.image}" alt="${cardData.name}" class="build-card-image">`
              : `<div class="build-card-placeholder">${cardData.name}</div>`
            }
          </div>
        `
      }
      stackHtml += '</div>'
      return stackHtml
    }

    html += `
      <div class="cost-group-compact">
        <div class="cost-label-compact">${key}</div>
        <div class="cost-group-cards-compact">
          ${currentGroupingMode === 'cost' && rightCards.length > 0 ? '<div class="cards-left-group">' : ''}
          ${leftCards.map(cardData => renderCardStack(cardData)).join('')}
          ${currentGroupingMode === 'cost' && rightCards.length > 0 ? '</div><div class="card-divider"></div><div class="cards-right-group">' : ''}
          ${rightCards.map(cardData => renderCardStack(cardData)).join('')}
          ${currentGroupingMode === 'cost' && rightCards.length > 0 ? '</div>' : ''}
        </div>
      </div>
    `
  })

  cardListContainer.innerHTML = html
}

// Render cost group cards with quantity
function renderCostGroupCards(cards) {
  // Group cards by unique name
  const uniqueCardsMap = new Map()
  cards.forEach(card => {
    const cardName = card.name.toLowerCase()
    if (!uniqueCardsMap.has(cardName)) {
      uniqueCardsMap.set(cardName, {
        ...card,
        count: cardCounts[cardName] || 0
      })
    }
  })
  const uniqueCards = Array.from(uniqueCardsMap.values())

  // Separate characters from non-characters
  const characters = []
  const nonCharacters = []

  uniqueCards.forEach(card => {
    const cardType = Array.isArray(card.card.type) ? card.card.type[0] : card.card.type
    if (cardType === 'Character') {
      characters.push(card)
    } else {
      nonCharacters.push(card)
    }
  })

  const renderCardStack = (card) => {
    const cardName = card.name.toLowerCase()
    const count = card.count
    let stackHtml = `<div class="card-stack" onmouseenter="showCardPreview('${cardName.replace(/'/g, "\\'")}', event)" onmouseleave="hideCardPreview()">`
    for (let i = 0; i < count; i++) {
      stackHtml += `
        <div class="build-card-item stacked" style="--stack-index: ${i};">
          ${card.image
            ? `<img src="${card.image}" alt="${card.name}" class="build-card-image">`
            : `<div class="build-card-placeholder">${card.name}</div>`
          }
        </div>
      `
    }
    stackHtml += '</div>'
    return stackHtml
  }

  let html = ''

  if (nonCharacters.length > 0 && characters.length > 0) {
    // Split layout with groups
    html += '<div class="cards-left-group">'
    html += characters.map(card => renderCardStack(card)).join('')
    html += '</div>'
    html += '<div class="card-divider"></div>'
    html += '<div class="cards-right-group">'
    html += nonCharacters.map(card => renderCardStack(card)).join('')
    html += '</div>'
  } else {
    // No split, just render all cards
    html += characters.map(card => renderCardStack(card)).join('')
    html += nonCharacters.map(card => renderCardStack(card)).join('')
  }

  return html
}

// Generate deck list
function generateDeckListText(allCards) {
  // Sort by cost, then name
  const sorted = [...allCards].sort((a, b) => {
    if (a.cost !== b.cost) return a.cost - b.cost
    return a.name.localeCompare(b.name)
  })

  return sorted.map(card => {
    const cardName = card.name.toLowerCase()
    const fullCard = card.card
    // Format display name with version/subtitle
    const displayName = fullCard.version
      ? `${fullCard.name} - ${fullCard.version}`
      : fullCard.name
    const count = cardCounts[cardName]

    return `<div class="deck-list-line" data-card-name="${cardName}" onmouseenter="showCardPreview('${cardName.replace(/'/g, "\\'")}', event)" onmouseleave="hideCardPreview()"><div class="card-quantity-selector">${[0, 1, 2, 3, 4].map(n => `<button class="quantity-btn ${count === n ? 'selected' : ''}" onclick="setCardCount('${cardName.replace(/'/g, "\\'")}', ${n}, event)">${n}</button>`).join('')}</div><span class="card-name-display">${displayName}</span></div>`
  }).join('')
}

// Set card count to exact value
function setCardCount(cardName, count, event) {
  if (event) {
    event.stopPropagation()
  }

  cardCounts[cardName] = count

  // Update the button states
  const line = document.querySelector(`.deck-list-line[data-card-name="${cardName}"]`)
  if (line) {
    const buttons = line.querySelectorAll('.quantity-btn')
    buttons.forEach((btn, index) => {
      if (index === count) {
        btn.classList.add('selected')
      } else {
        btn.classList.remove('selected')
      }
    })
  }

  // Recalculate and update stats
  updateStatsDisplay()
}

// Calculate deck statistics based on current counts
function calculateDeckStats(allCards) {
  const characteristicBanList = ['Storyborn', 'Floodborn', 'Dreamborn']
  const typeBanList = ['Dreamborn']

  const stats = {
    totalCards: 0,
    inkable: 0,
    nonInkable: 0,
    types: {},
    characteristics: {}
  }

  allCards.forEach(cardData => {
    const card = cardData.card
    const cardName = cardData.name.toLowerCase()
    const count = cardCounts[cardName] || 0

    stats.totalCards += count

    // Inkable stats
    if (card.inkwell || card.inkable) {
      stats.inkable += count
    } else {
      stats.nonInkable += count
    }

    // Type stats (excluding banned types)
    const cardType = Array.isArray(card.type) ? card.type[0] : (card.type || 'Unknown')
    if (!typeBanList.includes(cardType)) {
      stats.types[cardType] = (stats.types[cardType] || 0) + count
    }

    // Characteristics (using classifications field, excluding banned ones)
    if (card.classifications && Array.isArray(card.classifications)) {
      card.classifications.forEach(characteristic => {
        if (!characteristicBanList.includes(characteristic)) {
          stats.characteristics[characteristic] = (stats.characteristics[characteristic] || 0) + count
        }
      })
    }
  })

  return stats
}

// Update stats display without re-rendering entire interface
function updateStatsDisplay() {
  // Get current cards data from the rendered interface
  const allCards = []
  document.querySelectorAll('.deck-list-line').forEach(line => {
    const cardName = line.getAttribute('data-card-name')
    const card = getCardByName(cardName)
    if (card) {
      allCards.push({
        name: cardName,
        cost: card.cost || 0,
        card: card,
        image: getCardImageByName(cardName)
      })
    }
  })

  // Recalculate stats
  const stats = calculateDeckStats(allCards)

  // Update cost curve and group by cost
  const cardsByCost = {}
  allCards.forEach(cardData => {
    const count = cardCounts[cardData.name.toLowerCase()] || 0
    if (count > 0) {
      if (!cardsByCost[cardData.cost]) {
        cardsByCost[cardData.cost] = []
      }
      // Add card 'count' times for the cost curve
      for (let i = 0; i < count; i++) {
        cardsByCost[cardData.cost].push(cardData)
      }
    }
  })

  // Re-render stats section
  const statsGrid = document.querySelector('.stats-grid')
  if (statsGrid) {
    statsGrid.innerHTML = `
      ${renderCostCurveChart(cardsByCost, stats)}
      ${renderTypePieChart(stats)}
      ${renderKeywordsList(stats)}
      ${renderInkablePieChart(stats)}
    `
  }

  // Update card count display
  const cardCountDisplay = document.getElementById('build-card-count')
  if (cardCountDisplay) {
    cardCountDisplay.textContent = `${stats.totalCards}/60`
  }

  // Update card display based on current grouping mode
  updateCardDisplay()
}

// Render cost curve chart
function renderCostCurveChart(cardsByCost, stats) {
  const costs = Object.keys(cardsByCost).map(Number).sort((a, b) => a - b)

  if (costs.length === 0) {
    return `
      <div class="stat-box full-width clickable ${currentGroupingMode === 'cost' ? 'active' : ''}" onclick="setGroupingMode('cost')">
        <h4>Cost Curve</h4>
        <div class="cost-curve-chart">
          <em style="color: #9ca3af;">No cards</em>
        </div>
      </div>
    `
  }

  const maxCount = Math.max(...costs.map(c => cardsByCost[c].length))

  const bars = costs.map(cost => {
    const count = cardsByCost[cost].length
    const height = maxCount > 0 ? (count / maxCount) * 100 : 0
    return `
      <div class="chart-bar">
        <div class="chart-bar-count">${count}</div>
        <div class="chart-bar-fill" style="height: ${height}%"></div>
        <div class="chart-bar-label">${cost}</div>
      </div>
    `
  }).join('')

  return `
    <div class="stat-box full-width clickable ${currentGroupingMode === 'cost' ? 'active' : ''}" onclick="setGroupingMode('cost')">
      <h4>Cost Curve</h4>
      <div class="cost-curve-chart">
        ${bars}
      </div>
    </div>
  `
}

// Render inkable pie chart
function renderInkablePieChart(stats) {
  const total = stats.inkable + stats.nonInkable
  const inkablePercent = total > 0 ? (stats.inkable / total * 100).toFixed(0) : 0

  return `
    <div class="stat-box clickable ${currentGroupingMode === 'inkable' ? 'active' : ''}" onclick="setGroupingMode('inkable')">
      <h4>Inkable</h4>
      <div class="pie-chart-simple">
        <div class="pie-segment inkable" style="width: ${inkablePercent}%">${inkablePercent}%</div>
        <div class="pie-segment non-inkable" style="width: ${100 - inkablePercent}%">${100 - inkablePercent}%</div>
      </div>
      <div class="pie-legend">
        <span class="legend-item"><span class="legend-color inkable"></span> Inkable: ${stats.inkable}</span>
        <span class="legend-item"><span class="legend-color non-inkable"></span> Non-Inkable: ${stats.nonInkable}</span>
      </div>
    </div>
  `
}

// Render type pie chart
function renderTypePieChart(stats) {
  const types = Object.entries(stats.types).sort((a, b) => b[1] - a[1])
  const total = types.reduce((sum, [_, count]) => sum + count, 0)

  const segments = types.map(([type, count]) => {
    const percent = total > 0 ? (count / total * 100).toFixed(0) : 0
    return `<div class="type-item"><strong>${type}:</strong> ${count} (${percent}%)</div>`
  }).join('')

  return `
    <div class="stat-box clickable ${currentGroupingMode === 'type' ? 'active' : ''}" onclick="setGroupingMode('type')">
      <h4>Card Types</h4>
      <div class="type-list">
        ${segments}
      </div>
    </div>
  `
}

// Render characteristics list (>8 occurrences by count)
function renderKeywordsList(stats) {
  const characteristics = Object.entries(stats.characteristics)
    .filter(([_, count]) => count > 8)
    .sort((a, b) => b[1] - a[1])

  if (characteristics.length === 0) {
    return `
      <div class="stat-box clickable ${currentGroupingMode === 'characteristic' ? 'active' : ''}" onclick="setGroupingMode('characteristic')">
        <h4>Characteristics (>8)</h4>
        <div class="keyword-list">
          <em style="color: #9ca3af;">None</em>
        </div>
      </div>
    `
  }

  const items = characteristics.map(([characteristic, count]) => {
    return `<div class="keyword-item">${characteristic}: ${count}</div>`
  }).join('')

  return `
    <div class="stat-box clickable ${currentGroupingMode === 'characteristic' ? 'active' : ''}" onclick="setGroupingMode('characteristic')">
      <h4>Characteristics (>8)</h4>
      <div class="keyword-list">
        ${items}
      </div>
    </div>
  `
}

// Render packages list
function renderPackagesList() {
  if (currentPackages.length === 0) {
    return `
      <div class="stat-box full-width">
        <h4>Packages</h4>
        <div class="packages-list">
          <em style="color: #9ca3af;">No packages</em>
        </div>
      </div>
    `
  }

  const items = currentPackages.map(pkg => {
    const cardCount = pkg.cards ? pkg.cards.length : 0
    return `<div class="package-item"><strong>${pkg.name}</strong> (${cardCount} cards)</div>`
  }).join('')

  return `
    <div class="stat-box full-width">
      <h4>Packages</h4>
      <div class="packages-list">
        ${items}
      </div>
    </div>
  `
}

// Show card preview on hover
function showCardPreview(cardName, event) {
  const card = getCardByName(cardName)
  if (!card) return

  const image = getCardImageByName(cardName)
  if (!image) return

  // Create or update hover preview
  let preview = document.getElementById('card-hover-preview')
  if (!preview) {
    preview = document.createElement('div')
    preview.id = 'card-hover-preview'
    preview.className = 'card-hover-preview-fixed'
    document.body.appendChild(preview)
  }

  preview.innerHTML = `<img src="${image}" alt="${cardName}">`
  preview.style.display = 'block'
}

// Hide card preview
function hideCardPreview() {
  const preview = document.getElementById('card-hover-preview')
  if (preview) {
    preview.style.display = 'none'
  }
}

// Format date helper
function formatDate(isoString) {
  if (!isoString) return 'Unknown'
  const date = new Date(isoString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
