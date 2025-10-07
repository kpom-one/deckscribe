// Query Parser Tests
// Run with: node query-parser.test.js

// Load the parser (works in Node via copy-paste or in browser via script tag)
// For Node: we'll inline the relevant parts or require if we export it

// Test helper
function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ FAILED: ${message}`)
  }
  console.log(`✅ PASSED: ${message}`)
}

function assertEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual)
  const expectedStr = JSON.stringify(expected)
  if (actualStr !== expectedStr) {
    throw new Error(`❌ FAILED: ${message}\n  Expected: ${expectedStr}\n  Actual:   ${actualStr}`)
  }
  console.log(`✅ PASSED: ${message}`)
}

// Mock card data
const mockCards = [
  {
    name: 'Elsa',
    version: 'Snow Queen',
    ink: 'Amber',
    inks: ['Amber'],
    cost: 8,
    type: ['Character'],
    strength: 4,
    willpower: 6,
    lore: 3,
    inkwell: true,
    rarity: 'Legendary',
    text: 'Exert to freeze another character',
    characteristics: ['Hero', 'Queen'],
    legalities: { core: true, infinity: true },
    set: { code: '5' },
    collector_number: '123'
  },
  {
    name: 'Mickey Mouse',
    version: 'Brave Little Tailor',
    ink: 'Sapphire',
    inks: ['Sapphire'],
    cost: 4,
    type: ['Character'],
    strength: 3,
    willpower: 4,
    lore: 2,
    inkwell: false,
    rarity: 'Rare',
    text: 'When you play this character, draw 2 cards',
    characteristics: ['Hero', 'Storyborn'],
    legalities: { core: true, infinity: true },
    set: { code: '6' },
    collector_number: '45'
  },
  {
    name: 'Maleficent',
    version: 'Dragon',
    ink: 'Ruby',
    inks: ['Ruby', 'Emerald'],
    cost: 10,
    type: ['Character'],
    strength: 7,
    willpower: 5,
    lore: 1,
    inkwell: false,
    rarity: 'Super',
    text: 'Challenger +5',
    characteristics: ['Villain', 'Dragon'],
    legalities: { infinity: true },
    set: { code: '3' },
    collector_number: '78'
  },
  {
    name: 'Be Prepared',
    version: null,
    ink: 'Ruby',
    inks: ['Ruby'],
    cost: 2,
    type: ['Song'],
    inkwell: true,
    rarity: 'Common',
    text: 'Deal 2 damage to chosen character',
    characteristics: [],
    legalities: { core: true, infinity: true },
    set: { code: '5' },
    collector_number: '12'
  }
]

// Initialize parser (inline for testing)
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

    this.booleanFlags = {
      'inkable': { field: 'inkwell', value: true },
      'noninkable': { field: 'inkwell', value: false },
      'core': { field: 'format', value: 'core' },
      'infinity': { field: 'format', value: 'infinity' },
      'm': { field: 'multicolor', value: true },
      'multicolor': { field: 'multicolor', value: true }
    }

    this.inkAliases = {
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
  }

  normalizeInkColor(colorStr) {
    return this.inkAliases[colorStr.toLowerCase()] || null
  }

  parse(queryString) {
    const parts = queryString.trim().split(/\s+/)
    const tokens = []

    for (const part of parts) {
      if (!part) continue

      const negated = part.startsWith('-')
      const cleanPart = negated ? part.substring(1) : part

      if (cleanPart.includes(':')) {
        const [rawField, ...valueParts] = cleanPart.split(':')
        const value = valueParts.join(':')

        const normalizedField = this.fieldAliases[rawField.toLowerCase()] || rawField.toLowerCase()

        if (normalizedField === 'ink' && value.length > 1) {
          const valueLower = value.toLowerCase()
          const hasMulti = valueLower.includes('m')
          const colorChars = valueLower.replace(/m/g, '').split('')
          const colors = colorChars.map(c => this.normalizeInkColor(c)).filter(c => c)

          if (colors.length > 0) {
            tokens.push({
              field: 'ink',
              operator: '=',
              value: colors.join('|'),
              negated: negated
            })
          }

          if (hasMulti) {
            tokens.push({
              field: 'multicolor',
              operator: '=',
              value: true,
              negated: negated
            })
          }
        } else if (normalizedField === 'ink') {
          const normalized = this.normalizeInkColor(value)
          tokens.push({
            field: normalizedField,
            operator: '=',
            value: normalized || value,
            negated: negated
          })
        } else {
          let operator = '='
          let cleanValue = value

          const opMatch = value.match(/^(>=|<=|>|<|!=|=)(.*)/)
          if (opMatch) {
            operator = opMatch[1]
            cleanValue = opMatch[2]
          }

          tokens.push({
            field: normalizedField,
            operator,
            value: cleanValue,
            negated: negated
          })
        }
      } else {
        const flag = this.booleanFlags[cleanPart.toLowerCase()]
        if (flag) {
          tokens.push({
            field: flag.field,
            operator: '=',
            value: flag.value,
            negated: negated
          })
        } else {
          tokens.push({
            field: 'name',
            operator: '=',
            value: cleanPart,
            negated: negated
          })
        }
      }
    }

    return tokens
  }
}

function applyQuery(cards, queryText) {
  const parser = new QueryParser()
  const tokens = parser.parse(queryText)

  return cards.filter(card => {
    for (const token of tokens) {
      const match = matchesToken(card, token)
      if (!match) return false
    }
    return true
  })
}

function matchesToken(card, token) {
  const { field, operator, value, negated } = token

  let cardValue
  if (field === 'name') {
    cardValue = card.version ? `${card.name} ${card.version}`.toLowerCase() : card.name.toLowerCase()
    const match = cardValue.includes(value.toLowerCase())
    return negated ? !match : match
  } else if (field === 'format') {
    const hasFormat = card.legalities && card.legalities[value] === true
    return negated ? !hasFormat : hasFormat
  } else if (field === 'ink') {
    const cardInks = card.inks || (card.ink ? [card.ink] : [])
    const normalizedCardInks = cardInks.map(i => i.toLowerCase())

    if (value.includes('|')) {
      const targetColors = value.split('|')
      const match = targetColors.some(color => normalizedCardInks.includes(color.toLowerCase()))
      return negated ? !match : match
    } else {
      const match = normalizedCardInks.includes(value.toLowerCase())
      return negated ? !match : match
    }
  } else if (field === 'multicolor') {
    const cardInks = card.inks || (card.ink ? [card.ink] : [])
    const isMulti = cardInks.length > 1
    return negated ? !isMulti : isMulti
  } else if (field === 'inkwell') {
    const boolValue = value === true
    const match = card.inkwell === boolValue
    return negated ? !match : match
  } else if (field === 'type') {
    const cardTypes = Array.isArray(card.type) ? card.type : [card.type]
    const match = cardTypes.some(t => t && t.toLowerCase().includes(value.toLowerCase()))
    return negated ? !match : match
  } else if (field === 'text') {
    const text = (card.text || '').toLowerCase()
    const match = text.includes(value.toLowerCase())
    return negated ? !match : match
  } else if (field === 'characteristics') {
    const chars = card.characteristics || []
    const match = chars.some(c => c.toLowerCase().includes(value.toLowerCase()))
    return negated ? !match : match
  } else if (field === 'rarity') {
    const match = (card.rarity || '').toLowerCase() === value.toLowerCase()
    return negated ? !match : match
  } else {
    cardValue = card[field]
    if (cardValue === undefined || cardValue === null) return negated

    if (operator === '=') {
      const match = String(cardValue).toLowerCase() === String(value).toLowerCase()
      return negated ? !match : match
    } else if (operator === '!=') {
      const match = String(cardValue).toLowerCase() !== String(value).toLowerCase()
      return negated ? !match : match
    } else {
      const numValue = parseFloat(value)
      const numCard = parseFloat(cardValue)
      if (isNaN(numValue) || isNaN(numCard)) return negated

      let match
      if (operator === '>') match = numCard > numValue
      else if (operator === '<') match = numCard < numValue
      else if (operator === '>=') match = numCard >= numValue
      else if (operator === '<=') match = numCard <= numValue
      else match = false

      return negated ? !match : match
    }
  }
}

// ========== TESTS ==========

console.log('\n🧪 Query Parser Tests\n')

// Test 1: Basic name search
let result = applyQuery(mockCards, 'elsa')
assertEqual(result.length, 1, 'Basic name search: elsa')
assertEqual(result[0].name, 'Elsa', 'Found correct card')

// Test 2: Ink color - full name
result = applyQuery(mockCards, 'i:amber')
assertEqual(result.length, 1, 'Ink color by full name: i:amber')
assertEqual(result[0].name, 'Elsa', 'Found Elsa (Amber)')

// Test 3: Ink color - shorthand
result = applyQuery(mockCards, 'i:y')
assertEqual(result.length, 1, 'Ink color by shorthand: i:y')

result = applyQuery(mockCards, 'i:b')
assertEqual(result.length, 1, 'Ink color by shorthand: i:b (Sapphire)')
assertEqual(result[0].name, 'Mickey Mouse', 'Found Mickey (Sapphire)')

// Test 4: Multi-character ink query (OR)
result = applyQuery(mockCards, 'i:yb')
assertEqual(result.length, 2, 'Multi-color OR query: i:yb (Amber OR Sapphire)')

// Test 5: Multicolor flag
result = applyQuery(mockCards, 'm')
assertEqual(result.length, 1, 'Multicolor flag: m')
assertEqual(result[0].name, 'Maleficent', 'Found multicolor card')

// Test 6: Multicolor with specific color
result = applyQuery(mockCards, 'i:rm')
assertEqual(result.length, 1, 'Multicolor with color: i:rm (Ruby multicolor)')
assertEqual(result[0].name, 'Maleficent', 'Found Ruby multicolor')

// Test 7: Cost comparison
result = applyQuery(mockCards, 'c>=8')
assertEqual(result.length, 2, 'Cost >= 8')

result = applyQuery(mockCards, 'c<=4')
assertEqual(result.length, 2, 'Cost <= 4')

result = applyQuery(mockCards, 'c>4')
assertEqual(result.length, 2, 'Cost > 4')

// Test 8: Card type
result = applyQuery(mockCards, 't:character')
assertEqual(result.length, 3, 'Type: character')

result = applyQuery(mockCards, 't:song')
assertEqual(result.length, 1, 'Type: song')
assertEqual(result[0].name, 'Be Prepared', 'Found song')

// Test 9: Inkable/noninkable
result = applyQuery(mockCards, 'inkable')
assertEqual(result.length, 2, 'Inkable cards')

result = applyQuery(mockCards, 'noninkable')
assertEqual(result.length, 2, 'Non-inkable cards')

// Test 10: Format legality
result = applyQuery(mockCards, 'core')
assertEqual(result.length, 3, 'Core legal cards')

result = applyQuery(mockCards, 'infinity')
assertEqual(result.length, 4, 'Infinity legal cards (all)')

// Test 11: Negation
result = applyQuery(mockCards, '-t:song')
assertEqual(result.length, 3, 'Negation: exclude songs')

result = applyQuery(mockCards, '-inkable')
assertEqual(result.length, 2, 'Negation: exclude inkable')

result = applyQuery(mockCards, '-i:ruby')
assertEqual(result.length, 2, 'Negation: exclude ruby')

// Test 12: Text search (oracle text)
result = applyQuery(mockCards, 'o:draw')
assertEqual(result.length, 1, 'Text search: o:draw')
assertEqual(result[0].name, 'Mickey Mouse', 'Found card with "draw" in text')

// Test 13: Characteristics
result = applyQuery(mockCards, 'k:hero')
assertEqual(result.length, 2, 'Characteristics: k:hero')

result = applyQuery(mockCards, 'k:villain')
assertEqual(result.length, 1, 'Characteristics: k:villain')
assertEqual(result[0].name, 'Maleficent', 'Found villain')

// Test 14: Rarity
result = applyQuery(mockCards, 'r:rare')
assertEqual(result.length, 1, 'Rarity: rare')

result = applyQuery(mockCards, 'r:legendary')
assertEqual(result.length, 1, 'Rarity: legendary')

// Test 15: Combined filters (AND logic)
result = applyQuery(mockCards, 'i:b t:character')
assertEqual(result.length, 1, 'Combined: i:b t:character')
assertEqual(result[0].name, 'Mickey Mouse', 'Found Sapphire character')

result = applyQuery(mockCards, 'c>=4 inkable')
assertEqual(result.length, 1, 'Combined: c>=4 inkable')
assertEqual(result[0].name, 'Elsa', 'Found inkable card costing 4+')

result = applyQuery(mockCards, 'i:r -t:song')
assertEqual(result.length, 1, 'Combined: i:r -t:song (Ruby non-songs)')
assertEqual(result[0].name, 'Maleficent', 'Found Ruby character')

// Test 16: Complex query
result = applyQuery(mockCards, 'core t:character c>=4 l>=2')
assertEqual(result.length, 2, 'Complex: core characters, cost 4+, lore 2+')

// Test 17: Strength/Willpower
result = applyQuery(mockCards, 's>=5')
assertEqual(result.length, 1, 'Strength >= 5')
assertEqual(result[0].name, 'Maleficent', 'Found high-strength card')

result = applyQuery(mockCards, 'w>=6')
assertEqual(result.length, 1, 'Willpower >= 6')
assertEqual(result[0].name, 'Elsa', 'Found high-willpower card')

// Test 18: Field aliases
result = applyQuery(mockCards, 'n:mickey')
assertEqual(result.length, 1, 'Field alias: n:mickey (name)')

result = applyQuery(mockCards, 'c:4')
assertEqual(result.length, 1, 'Field alias: c:4 (cost)')

// Test 19: No matches
result = applyQuery(mockCards, 'i:steel')
assertEqual(result.length, 0, 'No matches for steel color')

result = applyQuery(mockCards, 'c>100')
assertEqual(result.length, 0, 'No matches for impossible cost')

// Test 20: Empty query
result = applyQuery(mockCards, '')
assertEqual(result.length, 4, 'Empty query returns all cards')

console.log('\n✅ All tests passed!\n')
