// SHARED (browser and server): premium shop rules — offers, the daily check-in, where ingots come from.
// Online the server applies them (server/src/premium.js) and the client only shows the result; offline the
// browser applies them to the save directly (the *Local functions).
import { GAME } from '../config.js';
import { ITEMS, isLookSlot } from '../data/items.js';
import { PREMIUM_SHOP } from '../data/premium.js';
import { NAMED } from '../data/affixes.js';
import { QUESTS } from '../data/npcs.js';
import { addItem } from './character.js';

const PREM = GAME.premium;

export const offerById = (id) => PREMIUM_SHOP.find((o) => o.id === id) || null;

// The item entries an offer grants: cosmetics are always Legendary, like crafted ones
export const offerItems = (offer) => offer.items.map(([id, qty]) => ({ id, qty, r: isLookSlot(ITEMS[id]?.slot) ? 3 : 0, b: {} }));

// Bag cells an offer needs in this inventory (a stackable item already in the bag needs none)
export function cellsNeeded(inventory, offer) {
  let n = 0;
  for (const [id, qty] of offer.items) {
    const it = ITEMS[id];
    if (it.type === 'equip') n += qty;
    else if (!inventory.some((e) => e.id === id)) n += 1;
  }
  return n;
}

// The check-in day, the same everywhere: a date at GAME.premium.utcOffsetH ('2026-11-01')
export function premiumDay(now = Date.now()) {
  return new Date(now + PREM.utcOffsetH * 3600e3).toISOString().slice(0, 10);
}
const dayBefore = (day) => new Date(Date.parse(day + 'T00:00:00Z') - 86400e3).toISOString().slice(0, 10);

// prev: { day, streak } of the last check-in (or null). Returns null if already checked in today, otherwise
// { day, streak, ingots }: the streak goes 1..streakDays and starts again; a missed day resets it.
export function checkinReward(prev, day) {
  if (prev && prev.day === day) return null;
  const streak = prev && prev.day === dayBefore(day) ? (prev.streak % PREM.checkin.streakDays) + 1 : 1;
  const ingots = PREM.checkin.ingots + (streak === PREM.checkin.streakDays ? PREM.checkin.streakBonus : 0);
  return { day, streak, ingots };
}

// Ingots for killing a monster (the top damage group gets them): chieftains and field bosses, not story bosses
export function killIngots(m) {
  if (m.chief) return PREM.kill.chief;
  if (m.named && NAMED[m.named] && !NAMED[m.named].quest) return PREM.kill.fieldBoss;
  return 0;
}

// Ingots a quest gives when completed (never for dailies)
export function questIngots(qid) {
  const q = QUESTS[qid];
  return q && !q.daily ? q.reward?.ingots || 0 : 0;
}

// ===== Offline: apply directly to the save =====
// Returns { ok: true } or { ok: false, msg }
export function buyLocal(ch, offerId) {
  const o = offerById(offerId);
  if (!o) return { ok: false, msg: 'Món này không còn bán' };
  if ((ch.ingots || 0) < o.price) return { ok: false, msg: 'Không đủ Nguyên Bảo' };
  if (ch.inventory.length + cellsNeeded(ch.inventory, o) > GAME.player.invSize) return { ok: false, msg: 'Túi đồ đầy' };
  for (const e of offerItems(o)) addItem(ch, e.id, e.qty, e.r, {});
  ch.ingots -= o.price;
  return { ok: true };
}

export function checkinLocal(ch, now = Date.now()) {
  const r = checkinReward(ch.checkin, premiumDay(now));
  if (!r) return null;
  ch.checkin = { day: r.day, streak: r.streak };
  ch.ingots = (ch.ingots || 0) + r.ingots;
  return r;
}
