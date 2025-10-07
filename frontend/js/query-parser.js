// Query Language Parser
// Supports: field:value, operators (=, !=, <, >, <=, >=), negation (-)
// Examples: ink:amber, cost>=4, -type:song, ink:amber ink:ruby

class QueryParser {
  constructor() {
    this.fieldAliases = {
      'n': 'name',
      'i': 'ink',
      'c': 'cost',
      't': 'type',
      's': 'strength',
      'w': 'willpower',
      'l': 'lore',
      'r': 'rarity',
      'o': 'text',
      'k': 'characteristics',
      'f': 'format'
    }

    // Special boolean flags (no colon syntax)
    this.booleanFlags = {
      'inkable': { field: 'inkwell', value: true },
      'noninkable': { field: 'inkwell', value: false },
      'core': { field: 'format', value: 'core' },
      'infinity': { field: 'format', value: 'infinity' },
      'm': { field: 'multicolor', value: true },
      'multi': { field: 'multicolor', value: true },
      'multicolor': { field: 'multicolor', value: true }
    }

    // Ink color aliases
    this.inkAliases = {
      'amber': 'amber',
      'y': 'amber',
      'yellow': 'amber',
      'gold': 'amber',
      'amethyst': 'amethyst',
      'purple': 'amethyst',
      'p': 'amethyst',
      'emerald': 'emerald',
      'e': 'emerald',
      'g': 'emerald',
      'green': 'emerald',
      'ruby': 'ruby',
      'red': 'ruby',
      'r': 'ruby',
      'sapphire': 'sapphire',
      'blue': 'sapphire',
      'b': 'sapphire',
      'u': 'sapphire',
      'steel': 'steel',
      'silver': 'steel'
    }
  }

  normalizeInkColor(color) {
    const lower = color.toLowerCase()
    return this.inkAliases[lower] || lower
  }

  parse(queryString) {
    if (!queryString || !queryString.trim()) {
      return []
    }

    const tokens = this.tokenize(queryString.trim())
    return this.buildFilters(tokens)
  }

  tokenize(str) {
    const tokens = []
    const parts = str.split(/\s+/)

    for (const part of parts) {
      if (!part) continue

      // Check for negation
      const negated = part.startsWith('-')
      const cleaned = negated ? part.substring(1) : part

      // Check for boolean flags first
      if (this.booleanFlags[cleaned.toLowerCase()]) {
        const flag = this.booleanFlags[cleaned.toLowerCase()]
        tokens.push({
          field: flag.field,
          operator: '=',
          value: flag.value,
          negated: negated
        })
        continue
      }

      // Parse field:value or field op value patterns
      if (cleaned.includes(':')) {
        // field:value format
        const [field, ...valueParts] = cleaned.split(':')
        const value = valueParts.join(':') // In case value contains ':'
        const normalizedField = this.normalizeField(field)

        // Special handling for ink field with multi-character values
        if (normalizedField === 'ink' && value.length > 1) {
          const valueLower = value.toLowerCase()
          const hasMulti = valueLower.includes('m')

          // Split into individual characters and normalize each color
          const colorChars = valueLower.replace(/m/g, '').split('')
          const colors = colorChars.map(c => this.normalizeInkColor(c)).filter(c => c)

          // Add token with all colors (OR logic)
          if (colors.length > 0) {
            tokens.push({
              field: 'ink',
              operator: '=',
              value: colors.join('|'), // Pipe-separated for OR
              negated: negated
            })
          }

          // Add multicolor requirement if 'm' was present
          if (hasMulti) {
            tokens.push({
              field: 'multicolor',
              operator: '=',
              value: true,
              negated: negated
            })
          }
        } else {
          tokens.push({
            field: normalizedField,
            operator: '=',
            value: value,
            negated: negated
          })
        }
      } else if (/^(>=|<=|!=|>|<|=)/.test(cleaned)) {
        // Operator at start (error - need field first)
        throw new Error(`Invalid query: operator without field: ${part}`)
      } else {
        // Default: name search
        tokens.push({
          field: 'name',
          operator: '=',
          value: cleaned,
          negated: negated
        })
      }
    }

    // Second pass: look for operators in values (e.g., cost>=4)
    const processedTokens = []
    for (const token of tokens) {
      if (token.field === 'name' && token.value.match(/^([a-z]+)(>=|<=|!=|>|<|=)(.+)$/)) {
        // Something like "cost>=4" parsed as name
        const match = token.value.match(/^([a-z]+)(>=|<=|!=|>|<|=)(.+)$/)
        const field = this.normalizeField(match[1])
        const operator = match[2]
        const value = match[3]

        processedTokens.push({
          field: field,
          operator: operator,
          value: value,
          negated: token.negated
        })
      } else {
        processedTokens.push(token)
      }
    }

    return processedTokens
  }

  normalizeField(field) {
    const lower = field.toLowerCase()
    return this.fieldAliases[lower] || lower
  }

  buildFilters(tokens) {
    // Group tokens by field
    const filterGroups = {}

    for (const token of tokens) {
      if (!filterGroups[token.field]) {
        filterGroups[token.field] = []
      }
      filterGroups[token.field].push(token)
    }

    // Build filter functions
    const filters = []

    for (const [field, tokens] of Object.entries(filterGroups)) {
      filters.push({
        field: field,
        test: (card) => {
          // OR within same field (any token matches)
          return tokens.some(token => this.testToken(card, token))
        }
      })
    }

    return filters
  }

  testToken(card, token) {
    const fieldValue = this.getCardField(card, token.field)
    const result = this.compareValues(fieldValue, token.operator, token.value, token.field)
    return token.negated ? !result : result
  }

  getCardField(card, field) {
    switch (field) {
      case 'name':
        return card.name || ''
      case 'ink':
        // Handle both inks array (dual) and ink string (single)
        if (card.inks && Array.isArray(card.inks)) {
          return card.inks
        }
        return card.ink ? [card.ink] : []
      case 'cost':
        return card.cost
      case 'type':
        return card.type || ''
      case 'strength':
        return card.strength
      case 'willpower':
        return card.willpower
      case 'lore':
        return card.lore_value || card.lore
      case 'rarity':
        return card.rarity || ''
      case 'text':
        return card.body_text || card.text || ''
      case 'inkwell':
        return card.inkwell || false
      case 'format':
        // Return array of legal formats (for OR matching)
        const formats = []
        if (card.legalities) {
          if (card.legalities.core === true) formats.push('core')
          if (card.legalities.infinity === true) formats.push('infinity')
        }
        return formats
      case 'characteristics':
        // Return array of classifications (Storyborn, Hero, Villain, etc.)
        return card.classifications || []
      case 'multicolor':
        // Return true if card has multiple ink colors
        const cardInks = card.inks && Array.isArray(card.inks) ? card.inks : (card.ink ? [card.ink] : [])
        return cardInks.length > 1
      default:
        return null
    }
  }

  compareValues(cardValue, operator, queryValue, field) {
    // Handle null/undefined
    if (cardValue === null || cardValue === undefined) {
      return false
    }

    // Special handling for arrays (ink colors, format, characteristics)
    if (Array.isArray(cardValue)) {
      // For ink field with pipe-separated colors (OR logic)
      if (field === 'ink' && queryValue.includes('|')) {
        const colors = queryValue.split('|')
        return colors.some(color =>
          cardValue.some(v => v.toLowerCase().includes(color.toLowerCase()))
        )
      }

      // For ink field, normalize color aliases
      let queryToMatch = queryValue.toLowerCase()
      if (field === 'ink') {
        queryToMatch = this.normalizeInkColor(queryToMatch)
      }

      return cardValue.some(v =>
        v.toLowerCase().includes(queryToMatch)
      )
    }

    // Boolean fields
    if (field === 'inkwell' || field === 'multicolor') {
      // Handle both boolean and string values
      let boolValue
      if (typeof queryValue === 'boolean') {
        boolValue = queryValue
      } else {
        boolValue = queryValue === 'true' || queryValue === '1' || queryValue === 'yes'
      }
      return operator === '=' ? cardValue === boolValue : cardValue !== boolValue
    }

    // Numeric comparisons
    if (typeof cardValue === 'number') {
      const numQuery = parseFloat(queryValue)
      if (isNaN(numQuery)) {
        return false
      }

      switch (operator) {
        case '=': return cardValue === numQuery
        case '!=': return cardValue !== numQuery
        case '>': return cardValue > numQuery
        case '<': return cardValue < numQuery
        case '>=': return cardValue >= numQuery
        case '<=': return cardValue <= numQuery
        default: return false
      }
    }

    // String comparisons (fuzzy match for = and !=)
    const cardStr = String(cardValue).toLowerCase()
    const queryStr = queryValue.toLowerCase()

    switch (operator) {
      case '=':
        return cardStr.includes(queryStr)
      case '!=':
        return !cardStr.includes(queryStr)
      default:
        return false
    }
  }
}

// Apply query to card list
function applyQuery(cards, queryString) {
  if (!queryString || !queryString.trim()) {
    return cards
  }

  try {
    const parser = new QueryParser()
    const filters = parser.parse(queryString)

    return cards.filter(card => {
      // AND across different fields
      return filters.every(filter => filter.test(card))
    })
  } catch (error) {
    console.error('Query parse error:', error)
    throw error
  }
}
