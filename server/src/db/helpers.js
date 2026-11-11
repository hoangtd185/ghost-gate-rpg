// Value cleaning and item entry helpers for the database
import crypto from 'node:crypto';
import { GAME } from '../../../shared/config.js';
import { ITEMS } from '../../../shared/data/items.js';
import { bonusLimits } from '../../../shared/rules/character.js';
import { freeItems } from '../../../shared/rules/loot.js';

export const isFreeItemId = (id) => freeItems().has(id);

export const int = (v, d = 0) => (Number.isFinite(+v) ? Math.floor(+v) : d);

export const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);

export const str = (v, max = 64) => String(v ?? '').slice(0, max);

export const EQUIP_SLOTS = new Set(GAME.player.equipSlots);

export const INV_SIZE = GAME.player.invSize;

export const ELEMENT_IDS = ['fire', 'ice', 'thunder', 'poison'];

export const newUid = () => crypto.randomBytes(6).toString('hex') + Date.now().toString(36).slice(-4);

export const isStack = (id) => ITEMS[id] && ITEMS[id].type !== 'equip';

// Item row -> the entry object the client uses
export function rowToEntry(it) {
  const e = { uid: it.uid, id: it.item_id, qty: it.qty, r: it.rarity, b: JSON.parse(it.bonus || '{}') };
  if (it.enhance) e.e = it.enhance;
  if (it.el) e.el = it.el;
  const gems = JSON.parse(it.gems || '[]');
  if (gems.length) e.g = gems;
  return e;
}

// Client entry -> clean values for an item row
export function cleanEntry(e) {
  return {
    uid: str(e.uid, 40), id: str(e.id, 30), qty: Math.max(1, Math.min(999, int(e.qty, 1))), r: Math.max(0, Math.min(3, int(e.r))),
    b: e.b && typeof e.b === 'object' && !Array.isArray(e.b) ? e.b : {},
    e: Math.max(0, Math.min(GAME.forge.enhanceMax, int(e.e))), el: ELEMENT_IDS.includes(e.el) ? e.el : null,
    g: Array.isArray(e.g) ? e.g.slice(0, 3).map((x) => str(x, 20)) : [],
  };
}

// Bonus stats a save may give an item it adds: none at rarity 0, otherwise only stats rollEquip can roll, each
// within what that rarity can reach. Anything else is dropped.
export function cleanBonus(id, r, b) {
  const lim = bonusLimits(id, r), out = {};
  for (const [k, v] of Object.entries(b || {})) if (lim[k] && Number.isInteger(v) && v > 0 && v <= lim[k]) out[k] = v;
  return out;
}

// Story flags: only keep short string key/value pairs
export function cleanFlags(f) {
  const out = {};
  if (f && typeof f === 'object') for (const [k, v] of Object.entries(f).slice(0, 30)) out[str(k, 20)] = str(v, 20);
  return out;
}
