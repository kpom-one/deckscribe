// Cards & Package Creation
// Sidebar layout: Package draft (left) + Card browser (right)

let packageDraft = {
  cards: [], // Array of card objects { name, image, colors: [] }
  colors: new Set(), // Set of ink colors in this package (from cards + manual)
  manualColors: new Set() // Manually selected colors (no cards yet)
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
  renderCardBrowser()

  // Set up search
  const searchInput = document.getElementById('card-search')
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderCardBrowser(e.target.value)
    })
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

// Recalculate colors from cards and update UI
function updateInkIndicators() {
  // Get colors from cards
  const colorsFromCards = new Set()
  packageDraft.cards.forEach(card => {
    if (card.colors && Array.isArray(card.colors)) {
      card.colors.forEach(c => colorsFromCards.add(c))
    }
  })

  // Remove manual colors that now have cards
  packageDraft.manualColors.forEach(color => {
    if (colorsFromCards.has(color)) {
      packageDraft.manualColors.delete(color)
    }
  })

  // Combine: colors from cards + manual colors
  packageDraft.colors = new Set([...colorsFromCards, ...packageDraft.manualColors])

  // Update UI
  document.querySelectorAll('.ink-icon').forEach(icon => {
    const color = icon.getAttribute('data-color')
    if (packageDraft.colors.has(color)) {
      icon.classList.add('active')
      icon.classList.remove('clickable')
    } else {
      icon.classList.remove('active')
      // Make clickable if < 2 colors selected
      if (packageDraft.colors.size < 2) {
        icon.classList.add('clickable')
      } else {
        icon.classList.remove('clickable')
      }
    }
  })
}

// Toggle color manually
function toggleColor(color) {
  if (packageDraft.colors.has(color)) {
    // Try to remove color - only allowed if no cards have this color
    const hasCardsWithColor = packageDraft.cards.some(card =>
      card.colors && card.colors.includes(color)
    )

    if (hasCardsWithColor) {
      alert(`Cannot remove ${color} - there are cards with this color in the package`)
      return
    }

    // Remove from manual colors (it should only be there if no cards have it)
    packageDraft.manualColors.delete(color)
  } else {
    // Try to add color - only allowed if < 2 colors
    if (packageDraft.colors.size >= 2) {
      alert(`Package already has 2 colors: ${Array.from(packageDraft.colors).join(', ')}`)
      return
    }

    // Add to manual colors
    packageDraft.manualColors.add(color)
  }

  // Update UI
  updateInkIndicators()

  // Re-render card browser with new filter
  const searchInput = document.getElementById('card-search')
  renderCardBrowser(searchInput ? searchInput.value : '')
}

// Render card browser (bottom)
function renderCardBrowser(searchTerm = '') {
  const container = document.getElementById('card-grid')
  if (!container) return

  let cardsToShow = allCardsCache

  // Filter by search term
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase()
    cardsToShow = cardsToShow.filter(card => {
      const fullName = getCardFullName(card)
      return fullName.includes(searchLower)
    })
  }

  // Filter by colors if 2 colors are selected (lock to those 2 colors only)
  if (packageDraft.colors.size === 2) {
    const selectedColors = Array.from(packageDraft.colors)
    cardsToShow = cardsToShow.filter(card => {
      const cardColors = getCardColors(card)

      // Skip cards with no color data
      if (cardColors.length === 0) {
        return false
      }

      // With 2 colors locked, only show cards that fit entirely within those 2 colors
      return cardColors.every(c => selectedColors.includes(c))
    })
  }
  // If only 1 color selected, filter out dual-color cards that would create a 3rd color
  else if (packageDraft.colors.size === 1) {
    const selectedColors = Array.from(packageDraft.colors)
    cardsToShow = cardsToShow.filter(card => {
      const cardColors = getCardColors(card)

      // Skip cards with no color data
      if (cardColors.length === 0) {
        return false
      }

      // Allow all single-color cards (any color)
      if (cardColors.length === 1) {
        return true
      }

      // For dual-color cards, at least one color must be in our selected colors
      // This prevents adding a card like "Ruby, Steel" when you only have "Amber"
      return cardColors.some(c => selectedColors.includes(c))
    })
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

  // Sort alphabetically by full name
  cardsToShow.sort((a, b) => getCardFullName(a).localeCompare(getCardFullName(b)))

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

    // Check if this would exceed 2 colors
    const potentialColors = new Set([...packageDraft.colors, ...cardColors])
    if (potentialColors.size > 2) {
      const newColors = cardColors.filter(c => !packageDraft.colors.has(c))
      alert(`Cannot add this card. Package already has ${Array.from(packageDraft.colors).join(', ')}. This card would add: ${newColors.join(', ')}.`)
      return
    }

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

  // Re-render card browser to update selected state and filter
  const searchInput = document.getElementById('card-search')
  renderCardBrowser(searchInput ? searchInput.value : '')
}

// Remove card from draft
function removeCardFromDraft(cardName) {
  const index = packageDraft.cards.findIndex(c => c.name === cardName)
  if (index !== -1) {
    packageDraft.cards.splice(index, 1)
  }

  renderPackageDraft()

  // Re-render card browser to update selected state
  const searchInput = document.getElementById('card-search')
  renderCardBrowser(searchInput ? searchInput.value : '')
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
  packageDraft.colors = new Set()
  packageDraft.manualColors = new Set()

  const nameInput = document.getElementById('package-name')
  const descInput = document.getElementById('package-description')
  const notesInput = document.getElementById('package-notes')

  if (nameInput) nameInput.value = ''
  if (descInput) descInput.value = ''
  if (notesInput) notesInput.value = ''

  renderPackageDraft()

  // Re-render card browser to update selected state and remove filter
  const searchInput = document.getElementById('card-search')
  renderCardBrowser(searchInput ? searchInput.value : '')
}
