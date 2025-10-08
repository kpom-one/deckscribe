// Packages View

let packagesViewInitialized = false
let allPackages = []
let selectedPackages = [] // Array of package IDs

// Initialize packages view
async function initPackagesView() {
  if (packagesViewInitialized) return
  packagesViewInitialized = true

  // Load cards first (for images)
  if (!cardsLoaded) {
    await loadAllCards()
  }

  await loadPackages()
  renderPackageList()
  renderSelectedPackages()

  // Set up deck creation
  const deckNameInput = document.getElementById('deck-name')
  const createDeckBtn = document.getElementById('create-deck-btn')

  if (deckNameInput) {
    deckNameInput.addEventListener('input', updateDeckCreationButton)
  }

  if (createDeckBtn) {
    createDeckBtn.addEventListener('click', createDeck)
  }

  updateDeckCreationButton()
}

// Load packages from API
async function loadPackages() {
  try {
    allPackages = await apiGet('/packages')
  } catch (error) {
    console.error('Failed to load packages:', error)
    allPackages = []
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

// Render package list
function renderPackageList() {
  const container = document.getElementById('package-list')
  if (!container) return

  if (allPackages.length === 0) {
    container.innerHTML = '<p class="empty-state">No packages yet. Create one from the Cards page.</p>'
    return
  }

  container.innerHTML = allPackages
    .map(pkg => {
      const isSelected = selectedPackages.includes(pkg.id)
      return `
        <div class="package-row ${isSelected ? 'selected' : ''}" onclick="togglePackageSelection('${pkg.id}')">
          <div class="package-info">
            <h3 class="package-name">${pkg.name}</h3>
            <p class="package-description">${pkg.description || ''}</p>
          </div>
          <div class="package-cards">
            ${renderPackageCards(pkg)}
          </div>
        </div>
      `
    })
    .join('')
}

// Toggle package selection
function togglePackageSelection(packageId) {
  const index = selectedPackages.indexOf(packageId)

  if (index === -1) {
    // Add package
    selectedPackages.push(packageId)
  } else {
    // Remove package
    selectedPackages.splice(index, 1)
  }

  renderPackageList()
  renderSelectedPackages()
  updateDeckCreationButton()
}

// Render cards for a package (horizontal)
function renderPackageCards(pkg) {
  if (!pkg.cards || pkg.cards.length === 0) {
    return '<p class="empty-state-small">No cards</p>'
  }

  return pkg.cards
    .map(cardName => {
      const imageSrc = getCardImageByName(cardName)
      return `
        <div class="package-card-item">
          ${imageSrc
            ? `<img src="${imageSrc}" alt="${cardName}" class="package-card-image">`
            : `<div class="package-card-placeholder">${cardName}</div>`
          }
        </div>
      `
    })
    .join('')
}

// Render selected packages in sidebar
function renderSelectedPackages() {
  const container = document.getElementById('selected-packages')
  if (!container) return

  if (selectedPackages.length === 0) {
    container.innerHTML = '<p class="empty-state-small">Click packages to select</p>'
    return
  }

  const selectedPkgs = allPackages.filter(pkg => selectedPackages.includes(pkg.id))

  container.innerHTML = selectedPkgs
    .map(pkg => {
      return `
        <div class="selected-package-item">
          <div class="selected-package-header">
            <strong>${pkg.name}</strong>
            <button class="remove-btn" onclick="togglePackageSelection('${pkg.id}')">×</button>
          </div>
          <div class="selected-package-cards">
            ${renderSelectedPackageCards(pkg)}
          </div>
        </div>
      `
    })
    .join('')
}

// Render cards for selected package (smaller)
function renderSelectedPackageCards(pkg) {
  if (!pkg.cards || pkg.cards.length === 0) {
    return '<p class="empty-state-small">No cards</p>'
  }

  return `<div class="selected-cards-grid">${pkg.cards
    .map(cardName => {
      const imageSrc = getCardImageByName(cardName)
      return `
        <div class="selected-card-mini">
          ${imageSrc
            ? `<img src="${imageSrc}" alt="${cardName}" class="selected-card-mini-image">`
            : `<div class="selected-card-mini-placeholder">${cardName}</div>`
          }
        </div>
      `
    })
    .join('')}</div>`
}

// Count total cards across selected packages
function getTotalCardCount() {
  const selectedPkgs = allPackages.filter(pkg => selectedPackages.includes(pkg.id))
  let total = 0

  selectedPkgs.forEach(pkg => {
    if (pkg.cards && Array.isArray(pkg.cards)) {
      total += pkg.cards.length
    }
  })

  return total
}

// Validate deck name (just needs to be non-empty)
function isValidDeckName(name) {
  return name && name.trim().length > 0
}

// Update deck creation button state
function updateDeckCreationButton() {
  const deckNameInput = document.getElementById('deck-name')
  const createDeckBtn = document.getElementById('create-deck-btn')
  const cardCountEl = document.getElementById('deck-card-count')

  if (!deckNameInput || !createDeckBtn || !cardCountEl) return

  const deckName = deckNameInput.value
  const totalCards = getTotalCardCount()

  // Update card count display
  cardCountEl.textContent = totalCards

  // Validation: name must be valid AND at least 15 cards
  const isNameValid = isValidDeckName(deckName)
  const hasEnoughCards = totalCards >= 15

  createDeckBtn.disabled = !(isNameValid && hasEnoughCards)
}

// Get ink colors from selected packages
function getInkIdentity() {
  const selectedPkgs = allPackages.filter(pkg => selectedPackages.includes(pkg.id))
  const colors = new Set()

  selectedPkgs.forEach(pkg => {
    if (pkg.cards && Array.isArray(pkg.cards)) {
      pkg.cards.forEach(cardName => {
        const card = allCardsCache.find(c => {
          const fullName = c.version ? `${c.name} - ${c.version}`.toLowerCase() : c.name.toLowerCase()
          return fullName === cardName.toLowerCase()
        })

        if (card) {
          const cardInks = card.inks || (card.ink ? [card.ink] : [])
          cardInks.forEach(ink => colors.add(ink))
        }
      })
    }
  })

  return Array.from(colors)
}

// Create deck
async function createDeck() {
  const deckNameInput = document.getElementById('deck-name')
  if (!deckNameInput) return

  const deckName = deckNameInput.value.trim()
  const totalCards = getTotalCardCount()

  // Final validation
  if (!isValidDeckName(deckName)) {
    alert('Deck name is required')
    return
  }

  if (totalCards < 15) {
    alert('Deck must contain at least 15 cards')
    return
  }

  // Get ink identity
  const inkColors = getInkIdentity()

  if (inkColors.length !== 2) {
    alert(`Deck must have exactly 2 ink colors. Current deck has ${inkColors.length} colors: ${inkColors.join(', ')}`)
    return
  }

  try {
    const deck = await apiPost('/decks', {
      name: deckName,
      ink_identity: inkColors,
      packages: selectedPackages
    })

    alert(`✅ Deck "${deckName}" created successfully!`)

    // Reset form
    deckNameInput.value = ''
    selectedPackages = []
    renderPackageList()
    renderSelectedPackages()
    updateDeckCreationButton()

  } catch (error) {
    console.error('Failed to create deck:', error)
    alert('❌ Failed to create deck. See console for details.')
  }
}
