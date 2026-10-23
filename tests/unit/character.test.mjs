// Character model: EXP curve, level-up points, equipment rolls, save migration.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAME } from '../../client/src/config.js';
import { ITEMS } from '../../client/src/data/items.js';
import { newCharacter, normalizeCharacter, expToNext, gainExp, rollEquip, calcStats } from '../../client/src/game/character.js';

// Run fn with Math.random returning a fixed value (deterministic rolls)
function withRandom(value, fn) {
  const r = Math.random;
  Math.random = () => value;
  try { return fn(); } finally { Math.random = r; }
}

test('expToNext follows the config curve and grows', () => {
  const { a, p, b } = GAME.player.expCurve;
  for (const lv of [1, 10, 30]) assert.equal(expToNext(lv), Math.floor(a * lv ** p + b * lv));
  for (let lv = 1; lv < GAME.player.maxLevel; lv++) assert.ok(expToNext(lv + 1) > expToNext(lv));
});

test('a new character starts with the class weapon, start gold and full HP/MP', () => {
  for (const cls of GAME.player.classes) {
    const ch = newCharacter('Test', cls);
    assert.equal(ch.level, 1);
    assert.equal(ch.gold, GAME.player.startGold);
    assert.equal(ch.equip.weapon.id, `w_${cls}1`);
    const st = calcStats(ch);
    assert.equal(ch.hp, st.maxHp);
    assert.equal(ch.mp, st.maxMp);
  }
});

test('levelling up grants stat and skill points from the config and stops at the cap', () => {
  const ch = newCharacter('Test', 'swordsman');
  const gained = gainExp(ch, expToNext(1) + expToNext(2));
  assert.equal(gained, 2);
  assert.equal(ch.statPoints, 2 * GAME.player.statPointsPerLevel);
  assert.equal(ch.skillPoints, 2 * GAME.player.skillPointsPerLevel);
  gainExp(ch, 1e12);
  assert.equal(ch.level, GAME.player.maxLevel);
});

test('rollEquip: a guaranteed minimum rarity still rolls bonus stats', () => {
  for (const minRarity of [1, 2, 3]) {
    const roll = withRandom(0.99, () => rollEquip('w_swordsman3', 0, minRarity)); // 0.99 = worst possible roll
    assert.equal(roll.r, minRarity);
    assert.ok(Object.keys(roll.bonus).length > 0, `rarity ${minRarity} has bonuses`);
    assert.ok(roll.bonus.atk > 0, 'weapons get the rarity attack bonus');
  }
});

test('rollEquip: rarity thresholds and luck come from the config', () => {
  const R = GAME.loot.rarity;
  assert.equal(withRandom(R.r3 - 0.001, () => rollEquip('hat_iron')).r, 3);
  assert.equal(withRandom(R.r2 - 0.001, () => rollEquip('hat_iron')).r, 2);
  assert.equal(withRandom(R.r1 - 0.001, () => rollEquip('hat_iron')).r, 1);
  assert.equal(withRandom(R.r1 + 0.01, () => rollEquip('hat_iron')).r, 0);
  assert.equal(withRandom(R.r1 + 0.01, () => rollEquip('hat_iron', 0.05)).r, 1, 'luck lowers the roll');
});

test('normalizeCharacter migrates a pre-English save', () => {
  const ch = normalizeCharacter({
    id: 'x', name: 'Old', cls: 'dao', level: 20, map: 'nghiadia', pet: { id: 'tieuquy', on: true },
    skills: { d_basic: 3, d_heal: 2, d_p1: 2 }, quests: { q_shuigui: { s: 'done' }, st5: { s: 'done' } },
    inventory: [{ uid: 'a', id: 'orb_hoa', qty: 2 }, { uid: 'b', id: 'out_daohoa', qty: 1, r: 1, b: {} }],
    equip: { weapon: { uid: 'c', id: 'w_dao5', qty: 1, el: 'loi', e: 3, b: { r_hoa: 2 } } },
  });
  assert.equal(ch.cls, 'taoist');
  assert.equal(ch.map, 'graveyard');
  assert.equal(ch.pet.id, 'imp');
  assert.deepEqual(ch.skills, { ta_basic: 3, ta_orbs: 2, ta_p1: 2 });
  assert.ok(ch.quests.q_water_ghost);
  assert.equal(ch.quests.m1.s, 'done', 'earlier main quests are filled in');
  assert.deepEqual(ch.inventory.map((e) => e.id), ['orb_fire', 'out_peach_fairy']);
  assert.equal(ch.equip.weapon.id, 'w_taoist5');
  assert.equal(ch.equip.weapon.el, 'thunder');
  assert.deepEqual(ch.equip.weapon.b, { res_fire: 2 });
  assert.equal(calcStats(ch).res.fire, 2 + 0, 'resistance from the migrated bonus counts');
});

test('normalizeCharacter drops unknown items and is idempotent', () => {
  const ch = normalizeCharacter({ id: 'y', name: 'N', cls: 'assassin', inventory: [{ uid: 'z', id: 'no_such_item', qty: 1 }] });
  assert.deepEqual(ch.inventory, []);
  const again = normalizeCharacter(JSON.parse(JSON.stringify(ch)));
  assert.deepEqual(again, ch);
  assert.ok(ITEMS[ch.equip.weapon?.id ?? 'w_assassin1']);
});
