// Shared damage formulas (used by the browser offline and by the server online)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hitDamage, skillMult, knowsSkill, skillReach } from '../../client/src/game/combat.js';
import { newCharacter, calcStats } from '../../client/src/game/character.js';
import { GAME } from '../../client/src/config.js';

const withRandom = (v, fn) => { const r = Math.random; Math.random = () => v; try { return fn(); } finally { Math.random = r; } };
const ch = newCharacter('Test', 'taoist');
const st = calcStats(ch);

test('skill multiplier grows with the skill level', () => {
  const lv1 = skillMult({ skills: { ta_fire: 1 } }, 'ta_fire');
  const lv3 = skillMult({ skills: { ta_fire: 3 } }, 'ta_fire');
  assert.ok(Math.abs(lv3 / lv1 - (1 + 2 * GAME.player.skillDmgPerLv)) < 1e-9);
});

test('only learned skills of your own class count', () => {
  assert.equal(knowsSkill(ch, 'ta_basic'), true);
  assert.equal(knowsSkill(ch, 'ta_fire'), false, 'not learned');
  assert.equal(knowsSkill({ ...ch, skills: { sw_basic: 1 } }, 'sw_basic'), false, 'another class');
});

test('the formula: attack × multiplier − defence, weaknesses and resistances', () => {
  const mob = { def: 4, res: {} };
  const plain = withRandom(0.5, () => hitDamage(st, 2, mob, null));
  assert.equal(plain.dmg, Math.round(st.atk * 2 - 4 * 0.8));
  assert.equal(plain.crit, false);
  const weak = withRandom(0.5, () => hitDamage(st, 2, { def: 4, res: { fire: -0.5 } }, 'fire'));
  const strong = withRandom(0.5, () => hitDamage(st, 2, { def: 4, res: { fire: 0.5 } }, 'fire'));
  assert.ok(weak.dmg > plain.dmg && strong.dmg < plain.dmg && weak.em > 1 && strong.em < 1);
  assert.equal(withRandom(0.5, () => hitDamage(st, 0.01, { def: 999, res: {} }, null)).dmg, 1, 'never below 1');
});

test('a critical hit multiplies the damage', () => {
  const mob = { def: 0, res: {} };
  const crit = withRandom(0, () => hitDamage(st, 1, mob, null));
  const normal = withRandom(0.999, () => hitDamage(st, 1, mob, null));
  assert.equal(crit.crit, true);
  assert.ok(crit.dmg > normal.dmg);
});

test('every skill has a reach the server can check', () => {
  for (const sid of ['sw_basic', 'sw_combo', 'ta_orbs', 'as_dash', 'as_poison', 'ta_thunder']) {
    const r = skillReach(sid);
    assert.ok(r.hits >= 1 && r.range > 0, sid);
  }
});
