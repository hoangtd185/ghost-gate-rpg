// Tuning tables in config.js drive the helpers that read them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAME } from '../../client/src/config.js';
import { eliteChance, smartTier, CHIEF } from '../../client/src/data/affixes.js';
import { ENHANCE_MAX, ENHANCE_RATE } from '../../client/src/data/items.js';

test('elite chance follows the config table', () => {
  assert.equal(eliteChance(1), 0);
  for (const [from, p] of GAME.monsters.eliteChance) assert.equal(eliteChance(from), p);
});

test('smartness tier rises at the configured levels', () => {
  assert.equal(smartTier(1), 0);
  GAME.monsters.smartTierFromLv.forEach((from, i) => {
    assert.equal(smartTier(from), i + 1);
    assert.equal(smartTier(from - 1), i);
  });
});

test('aliases read from the config', () => {
  assert.equal(CHIEF, GAME.monsters.chief);
  assert.equal(ENHANCE_MAX, GAME.forge.enhanceMax);
  assert.equal(ENHANCE_RATE, GAME.forge.enhanceRate);
});

test('rates are probabilities', () => {
  for (const r of GAME.forge.enhanceRate) assert.ok(r > 0 && r <= 1);
  assert.ok(GAME.monsters.chief.chance > 0 && GAME.monsters.chief.chance < 1);
  const R = GAME.loot.rarity;
  assert.ok(R.r3 < R.r2 && R.r2 < R.r1 && R.r1 < 1);
});
