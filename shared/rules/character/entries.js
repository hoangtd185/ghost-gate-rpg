// Character rules: item entries (rolling, stats, names, enhancement) and level helpers
import { ITEMS, RARITY, ENHANCE_BONUS, GEM_KINDS, gemId } from '../../data/items.js';
import { makeId, randInt, chance, pick } from '../../util.js';
import { GAME } from '../../config.js';

export const INV_SIZE = GAME.player.invSize;

export const MAX_LEVEL = GAME.player.maxLevel;

export function expToNext(lv) {
  const { a, p, b } = GAME.player.expCurve;
  return Math.floor(a * Math.pow(lv, p) + b * lv);
}

// 'W2' in drop tables / rewards = tier-2 weapon for the player's class
export function resolveItemId(id, cls) {
  if (/^W\d$/.test(id)) return `w_${cls}${id[1]}`;
  if (/^GEM\d$/.test(id)) return gemId(pick(Object.keys(GEM_KINDS)), +id[3]); // random gem
  return id;
}

export function makeEntry(id, qty = 1, rarity = 0, bonus = {}) {
  return { uid: makeId(), id, qty, r: rarity, b: bonus };
}

// Monster drops get a random rarity and bonus stats
// minRarity is applied before the bonuses are rolled, so a guaranteed rarity still gets its bonus stats
export function rollEquip(id, luck = 0, minRarity = 0) {
  const it = ITEMS[id];
  let r = 0;
  const roll = Math.random() - luck;
  const R = GAME.loot.rarity;
  if (roll < R.r3) r = 3; else if (roll < R.r2) r = 2; else if (roll < R.r1) r = 1;
  r = Math.max(r, minRarity);
  const bonus = {};
  const pool = ['str', 'dex', 'int', 'vit', 'hp', 'def', 'crit'];
  for (let i = 0; i < r; i++) {
    const s = pick(pool);
    const scale = Math.max(1, Math.ceil((it.lv || 1) / 3));
    const v = s === 'hp' ? randInt(5, 12) * scale : s === 'crit' ? randInt(1, 2) : randInt(1, 2) * scale;
    bonus[s] = (bonus[s] || 0) + v;
  }
  if (it.slot === 'weapon' && r > 0) bonus.atk = (bonus.atk || 0) + Math.ceil((it.stats.atk || 0) * 0.08 * r);
  return { r, bonus };
}

// The most bonus stats rollEquip can give an item of this rarity: { stat: max total }. Rarity 0 gets none.
// Used by the server to refuse invented bonus stats on items a save adds.
export function bonusLimits(id, r) {
  const it = ITEMS[id];
  if (!it || it.type !== 'equip' || !(r > 0)) return {};
  const scale = Math.max(1, Math.ceil((it.lv || 1) / 3));
  const per = { str: 2 * scale, dex: 2 * scale, int: 2 * scale, vit: 2 * scale, hp: 12 * scale, def: 2 * scale, crit: 2 };
  const out = {};
  for (const [k, v] of Object.entries(per)) out[k] = v * r; // r rolls, possibly all on the same stat
  if (it.slot === 'weapon') out.atk = Math.ceil((it.stats.atk || 0) * 0.08 * r);
  return out;
}

// Stats of one item: base stats × enhancement + random bonus stats
export function entryStats(e) {
  const it = ITEMS[e.id];
  const mul = 1 + ENHANCE_BONUS * (e.e || 0);
  const out = {};
  for (const [k, v] of Object.entries(it.stats || {})) out[k] = k.startsWith('res_') || k === 'crit' ? v : Math.round(v * mul);
  for (const [k, v] of Object.entries(e.b || {})) out[k] = (out[k] || 0) + v;
  for (const id of e.g || []) {
    const gm = ITEMS[id] && ITEMS[id].gem;
    if (!gm) continue;
    const k = GEM_KINDS[gm.kind];
    out[k.stat] = (out[k.stat] || 0) + k.vals[gm.g - 1];
  }
  return out;
}

// Weapon element: the inserted orb, otherwise the weapon's own element
export function entryElement(e) {
  if (!e) return null;
  return e.el || ITEMS[e.id].el || null;
}

export function entryName(e) {
  const it = ITEMS[e.id];
  return (e.e ? `+${e.e} ` : '') + it.name;
}

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function rarityColor(e) {
  return RARITY[e.r || 0].color;
}

export function luckRoll() {
  return chance(0.5) ? 0 : 0.01;
}
