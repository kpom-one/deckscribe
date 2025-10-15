// Decks List View

let allDecks = []
let decksViewInitialized = false

// Initialize decks view
async function initDecksView() {
  if (decksViewInitialized) return
  decksViewInitialized = true

  // Load cards cache
  if (!cardsLoaded) {
    await loadAllCards()
  }

  await loadDecks()
  renderDeckList()
}

// Load decks from API
async function loadDecks() {
  try {
    allDecks = await apiGet('/decks')
  } catch (error) {
    console.error('Failed to load decks:', error)
    allDecks = []
  }
}

// Get card image by name
function getCardImageByName(cardName) {
  const normalizedName = cardName.toLowerCase()
  const card = allCardsCache.find(c => {
    const fullName = c.version ? `${c.name} - ${c.version}`.toLowerCase() : c.name.toLowerCase()
    return fullName === normalizedName
  })

  if (card) {
    return card.image_uris?.digital?.large || card.image_uris?.digital?.normal || ''
  }
  return ''
}

// Get ink icon SVG path
function getInkIconPath(color) {
  const colorLower = color.toLowerCase()
  return `/frontend/images/ink-${colorLower}.svg`
}

// Render deck list
async function renderDeckList() {
  const container = document.getElementById('deck-list')
  if (!container) return

  if (allDecks.length === 0) {
    container.innerHTML = '<p class="empty-state">No decks yet. Create one from the Packages page.</p>'
    return
  }

  // Load builds and packages for each deck
  const deckData = await Promise.all(
    allDecks.map(async (deck) => {
      const builds = await loadBuildsForDeck(deck.id)
      const packages = await loadPackagesForDeck(deck)
      const cardImages = getCardImagesFromPackages(packages, 6)

      return {
        deck,
        buildCount: builds.length,
        packageCount: deck.packages.length,
        cardImages
      }
    })
  )

  container.innerHTML = deckData
    .map(({ deck, buildCount, packageCount, cardImages }) => {
      const colors = Array.isArray(deck.ink_identity) ? deck.ink_identity : []
      const colorIcons = colors.map(color => {
        const colorLower = color.toLowerCase()
        return `<img src="img/${colorLower}.png" alt="${color}" class="ink-icon-small" title="${color}">`
      }).join('')

      const cardThumbnails = cardImages.map(img => {
        return img ? `<img src="${img}" alt="Card" class="deck-card-thumbnail">` : ''
      }).join('')

      return `
        <div class="deck-card" onclick="viewDeck('${deck.id}')">
          <div class="deck-header">
            <div class="deck-title">
              <h3 class="deck-name">${deck.name}</h3>
              <p class="deck-date">${formatDate(deck.created_at)}</p>
            </div>
            <div class="deck-colors">${colorIcons}</div>
          </div>
          <div class="deck-thumbnails">
            ${cardThumbnails || '<p class="empty-state-small">No cards</p>'}
          </div>
          <div class="deck-meta">
            <span>${packageCount} packages</span>
            <span>•</span>
            <span>${buildCount} builds</span>
          </div>
        </div>
      `
    })
    .join('')
}

// Load packages for a deck
async function loadPackagesForDeck(deck) {
  try {
    const packageIds = deck.packages || []
    const packages = await Promise.all(
      packageIds.map(id => apiGet(`/packages/${id}`).catch(() => null))
    )
    return packages.filter(p => p !== null)
  } catch (error) {
    console.error('Failed to load packages for deck:', deck.id, error)
    return []
  }
}

// Get card images from packages (rotate through packages until maxCards)
function getCardImagesFromPackages(packages, maxCards = 6) {
  const images = []
  if (packages.length === 0) return images

  let packageIndex = 0
  let cardIndexPerPackage = packages.map(() => 0)

  while (images.length < maxCards) {
    let foundCard = false

    // Try to find a card in any remaining package
    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[packageIndex]
      if (pkg.cards && cardIndexPerPackage[packageIndex] < pkg.cards.length) {
        const cardName = pkg.cards[cardIndexPerPackage[packageIndex]]
        const image = getCardImageByName(cardName)

        if (image) {
          images.push(image)
          foundCard = true
        }

        cardIndexPerPackage[packageIndex]++
        packageIndex = (packageIndex + 1) % packages.length

        if (images.length >= maxCards) break
      } else {
        packageIndex = (packageIndex + 1) % packages.length
      }
    }

    // If no cards found in any package, break
    if (!foundCard) break
  }

  return images
}

// Load builds for a deck
async function loadBuildsForDeck(deckId) {
  try {
    return await apiGet(`/decks/${deckId}/builds`)
  } catch (error) {
    console.error('Failed to load builds for deck:', deckId, error)
    return []
  }
}

// View deck details (placeholder for now)
function viewDeck(deckId) {
  alert(`Deck detail view coming soon! Deck ID: ${deckId}`)
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
