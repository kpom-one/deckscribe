#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const cardsPath = path.join(__dirname, '../data/cards.json');
const backupPath = path.join(__dirname, '../data/cards.json.backup');

console.log('Reading cards.json...');
const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf8'));

console.log(`Processing ${cards.length} cards...`);

let updated = 0;
for (const card of cards) {
  // All cards are infinity legal
  if (!card.legalities) card.legalities = {};
  card.legalities.infinity = true;

  // Parse set code
  const setCode = card.set?.code;
  const setNum = parseInt(setCode);

  // If set code <= 4, remove core
  // If set code >= 5, set core to true
  if (!isNaN(setNum)) {
    if (setNum <= 4) {
      delete card.legalities.core;
    } else {
      card.legalities.core = true;
    }
  }
  // For non-numeric codes (D23, P1, P2, cp), keep existing or remove
  else {
    delete card.legalities.core;
  }

  updated++;
}

console.log(`Creating backup at ${backupPath}...`);
fs.copyFileSync(cardsPath, backupPath);

console.log(`Writing updated cards.json...`);
fs.writeFileSync(cardsPath, JSON.stringify(cards, null, 2));

console.log(`✅ Updated ${updated} cards`);
console.log(`✅ Backup saved to ${backupPath}`);

// Show sample results
console.log('\nSample results:');
const sample1 = cards.find(c => parseInt(c.set?.code) <= 4);
const sample2 = cards.find(c => parseInt(c.set?.code) >= 5);
if (sample1) {
  console.log(`Set ${sample1.set.code}: ${JSON.stringify(sample1.legalities)}`);
}
if (sample2) {
  console.log(`Set ${sample2.set.code}: ${JSON.stringify(sample2.legalities)}`);
}
