// Packages View - View and edit all packages

let packagesViewInitialized = false
let allDecks = []
let allPackages = []
let selectedDeckId = null
let selectedColors = [] // Array of selected color filters (max 2)

// Initialize packages view
async function initPackagesView() {
  if (packagesViewInitialized) return
  packagesViewInitialized = true

  // Load cards first (for images)
  if (!cardsLoaded) {
    await loadAllCards()
  }

  await loadDecks()
  await loadPackages()
  renderDeckList()
  renderPackageList()

  // Set up new deck button
  const newDeckBtn = document.getElementById('new-deck-btn')
  const newDeckInput = document.getElementById('new-deck-name')

  if (newDeckBtn) {
    newDeckBtn.addEventListener('click', createNewDeck)
  }

  // Allow Enter key to create new deck
  if (newDeckInput) {
    newDeckInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        createNewDeck()
      }
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

// Render deck list in sidebar
function renderDeckList() {
  const container = document.getElementById('deck-list')
  if (!container) return

  if (allDecks.length === 0) {
    container.innerHTML = '<div class="empty-state-small">No decks yet. Create one from the Cards page.</div>'
    return
  }

  // Filter decks by color
  const filteredDecks = allDecks.filter(deck => deckMatchesColorFilter(deck))

  if (filteredDecks.length === 0) {
    container.innerHTML = '<div class="empty-state-small">No decks match the selected colors.</div>'
    return
  }

  container.innerHTML = filteredDecks
    .map(deck => {
      const isSelected = selectedDeckId === deck.id
      // Get colors from packages dynamically
      const deckColors = getDeckColors(deck)
      const inkIcons = deckColors.map(color => {
        return `<img class="ink-icon" src="img/${color.toLowerCase()}.png" alt="${color}" title="${color}">`
      }).join('')

      return `
        <div class="deck-sidebar-item ${isSelected ? 'selected' : ''}" onclick="selectDeck('${deck.id}')">
          <div class="deck-sidebar-name">${deck.name}</div>
          <div class="deck-sidebar-inks">${inkIcons}</div>
        </div>
      `
    })
    .join('')
}

// Select a deck
function selectDeck(deckId) {
  if (selectedDeckId === deckId) {
    selectedDeckId = null
  } else {
    selectedDeckId = deckId
  }
  renderDeckList()
  renderPackageList()
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
  renderDeckList()
  renderPackageList()
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

// Get deck colors from its packages
function getDeckColors(deck) {
  const colors = new Set()

  // Get all packages in this deck
  deck.packages.forEach(packageId => {
    const pkg = allPackages.find(p => p.id === packageId)
    if (pkg) {
      const pkgColors = getPackageColors(pkg)
      pkgColors.forEach(color => colors.add(color))
    }
  })

  return Array.from(colors)
}

// Check if deck matches color filter
function deckMatchesColorFilter(deck) {
  if (selectedColors.length === 0) {
    return true // No filter, show all
  }

  // Get deck colors from its packages (dynamically computed)
  const deckColors = getDeckColors(deck)

  // Empty decks should always show up
  if (deckColors.length === 0) {
    return true
  }

  if (selectedColors.length === 1) {
    // Show decks that contain this color
    return deckColors.includes(selectedColors[0])
  }

  if (selectedColors.length === 2) {
    // Show decks with exactly these two colors
    const sortedDeckColors = [...deckColors].sort()
    const filterColors = [...selectedColors].sort()
    return sortedDeckColors.length === 2 &&
           sortedDeckColors[0] === filterColors[0] &&
           sortedDeckColors[1] === filterColors[1]
  }

  return true
}

// Get package colors from cards
function getPackageColors(pkg) {
  const colors = new Set()

  if (!pkg.cards || pkg.cards.length === 0) {
    return []
  }

  pkg.cards.forEach(cardName => {
    const normalizedName = cardName.toLowerCase()
    const card = allCardsCache.find(c => {
      const fullName = c.version ? `${c.name} - ${c.version}`.toLowerCase() : c.name.toLowerCase()
      return fullName === normalizedName
    })

    if (card) {
      // Get card inks
      if (card.inks && Array.isArray(card.inks)) {
        card.inks.forEach(ink => colors.add(ink))
      } else if (card.ink) {
        colors.add(card.ink)
      }
    }
  })

  return Array.from(colors)
}

// Check if package matches color filter
function packageMatchesColorFilter(pkg) {
  if (selectedColors.length === 0) {
    return true // No filter, show all
  }

  const pkgColors = getPackageColors(pkg)

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

// Toggle package in/out of selected deck
async function togglePackageInDeck(packageId) {
  if (!selectedDeckId) {
    return // No deck selected, do nothing
  }

  const deck = allDecks.find(d => d.id === selectedDeckId)
  if (!deck) {
    console.error('Selected deck not found:', selectedDeckId)
    return
  }

  const packageIndex = deck.packages.indexOf(packageId)

  if (packageIndex === -1) {
    // Add package to deck
    deck.packages.push(packageId)
  } else {
    // Remove package from deck
    deck.packages.splice(packageIndex, 1)
  }

  // Save to backend
  try {
    await apiPut(`/decks/${selectedDeckId}`, {
      name: deck.name,
      ink_identity: deck.ink_identity,
      packages: deck.packages
    })
    console.log(`✅ Updated deck "${deck.name}"`)
    renderPackageList()
  } catch (error) {
    console.error('Failed to update deck:', error)
    alert('Failed to update deck. See console for details.')
    // Revert the change
    if (packageIndex === -1) {
      deck.packages.pop()
    } else {
      deck.packages.splice(packageIndex, 0, packageId)
    }
    renderPackageList()
  }
}

// Render all packages
function renderPackageList() {
  const container = document.getElementById('package-list')
  if (!container) return

  if (allPackages.length === 0) {
    container.innerHTML = '<p class="empty-state">No packages yet. Create one from the Cards page.</p>'
    return
  }

  // Filter packages by color
  const filteredPackages = allPackages.filter(pkg => packageMatchesColorFilter(pkg))

  if (filteredPackages.length === 0) {
    container.innerHTML = '<p class="empty-state">No packages match the selected colors.</p>'
    return
  }

  const selectedDeck = selectedDeckId ? allDecks.find(d => d.id === selectedDeckId) : null

  container.innerHTML = filteredPackages
    .map(pkg => {
      const isInDeck = selectedDeck && selectedDeck.packages.includes(pkg.id)
      return `
        <div class="package-row ${isInDeck ? 'selected' : ''}" data-package-id="${pkg.id}" onclick="togglePackageInDeck('${pkg.id}')">
          <div class="package-info">
            <input
              type="text"
              class="package-name-inline"
              value="${pkg.name}"
              data-package-id="${pkg.id}"
              onblur="savePackageName('${pkg.id}', this.value)"
              onkeypress="if(event.key==='Enter') this.blur()"
              onclick="event.stopPropagation()"
            />
            <input
              type="text"
              class="package-description-inline"
              value="${pkg.description || ''}"
              placeholder="Add description..."
              data-package-id="${pkg.id}"
              onblur="savePackageDescription('${pkg.id}', this.value)"
              onkeypress="if(event.key==='Enter') this.blur()"
              onclick="event.stopPropagation()"
            />
          </div>
          <div class="package-cards">
            ${renderPackageCards(pkg)}
          </div>
        </div>
      `
    })
    .join('')
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
        <div class="package-card-item" onclick="event.stopPropagation()">
          ${imageSrc
            ? `<img src="${imageSrc}" alt="${cardName}" class="package-card-image">`
            : `<div class="package-card-placeholder">${cardName}</div>`
          }
        </div>
      `
    })
    .join('')
}

// Validate package name
function validatePackageName(name) {
  return name && /^[a-z0-9-]+$/.test(name)
}

// Save package name
async function savePackageName(packageId, newName) {
  const trimmedName = newName.trim().toLowerCase()

  // Get current package
  const pkg = allPackages.find(p => p.id === packageId)
  if (!pkg) {
    console.error('Package not found:', packageId)
    return
  }

  // Check if name changed
  if (trimmedName === pkg.name) {
    return
  }

  // Validate name
  if (!validatePackageName(trimmedName)) {
    alert('Package name must contain only lowercase letters, numbers, and dashes (a-z, 0-9, -)')
    // Revert input to original value
    const input = document.querySelector(`.package-name-inline[data-package-id="${packageId}"]`)
    if (input) input.value = pkg.name
    return
  }

  try {
    await apiPut(`/packages/${packageId}`, {
      name: trimmedName,
      description: pkg.description,
      cards: pkg.cards
    })

    // Update local cache
    pkg.name = trimmedName
    console.log(`✅ Updated package name to "${trimmedName}"`)
  } catch (error) {
    console.error('Failed to update package name:', error)
    alert('Failed to update package name. See console for details.')
    // Revert input to original value
    const input = document.querySelector(`.package-name-inline[data-package-id="${packageId}"]`)
    if (input) input.value = pkg.name
  }
}

// Save package description
async function savePackageDescription(packageId, newDescription) {
  const trimmedDescription = newDescription.trim()

  // Get current package
  const pkg = allPackages.find(p => p.id === packageId)
  if (!pkg) {
    console.error('Package not found:', packageId)
    return
  }

  // Check if description changed
  if (trimmedDescription === (pkg.description || '')) {
    return
  }

  try {
    await apiPut(`/packages/${packageId}`, {
      name: pkg.name,
      description: trimmedDescription,
      cards: pkg.cards
    })

    // Update local cache
    pkg.description = trimmedDescription
    console.log(`✅ Updated package description for "${pkg.name}"`)
  } catch (error) {
    console.error('Failed to update package description:', error)
    alert('Failed to update package description. See console for details.')
  }
}

// Validate deck name
function validateDeckName(name) {
  return name && /^[a-z0-9-]+$/.test(name)
}

// Create new deck
async function createNewDeck() {
  const newDeckInput = document.getElementById('new-deck-name')
  const deckName = newDeckInput ? newDeckInput.value.trim().toLowerCase() : ''

  if (!deckName) {
    alert('Please enter a deck name')
    return
  }

  if (!validateDeckName(deckName)) {
    alert('Deck name must contain only lowercase letters, numbers, and dashes (a-z, 0-9, -)')
    return
  }

  try {
    const newDeck = await apiPost('/decks', {
      name: deckName,
      ink_identity: [], // Empty initially, will be inferred from packages
      packages: []
    })

    console.log(`✅ Created deck "${newDeck.name}"`)

    // Clear input
    if (newDeckInput) newDeckInput.value = ''

    // Add to local array and select it
    allDecks.push(newDeck)
    selectedDeckId = newDeck.id

    renderDeckList()
    renderPackageList()
  } catch (error) {
    console.error('Failed to create deck:', error)
    alert('Failed to create deck. See console for details.')
  }
}
