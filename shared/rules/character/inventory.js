// Character rules: bag and equipment
import { CLASSES } from '../../data/classes.js';
import { ITEMS, ENHANCE_MAX, ENHANCE_RATE, ENHANCE_SAFE, enhanceCost } from '../../data/items.js';
import { INV_SIZE, makeEntry } from './entries.js';

// Enhance one item. Returns { ok, msg, before, after }
export function enhanceEntry(ch, e, useProtect) {
  const it = ITEMS[e.id];
  const lv = e.e || 0;
  if (it.type !== 'equip') return { ok: false, msg: 'Chỉ cường hóa được trang bị' };
  if (lv >= ENHANCE_MAX) return { ok: false, msg: `Đã đạt tối đa +${ENHANCE_MAX}` };
  const cost = enhanceCost(it, lv);
  if (countItem(ch, 'stone') < cost.stones) return { ok: false, msg: `Cần ${cost.stones} Đá Cường Hóa` };
  if (ch.gold < cost.gold) return { ok: false, msg: `Cần ${cost.gold} ngân lượng` };
  const protect = useProtect && lv >= ENHANCE_SAFE && countItem(ch, 'protect') > 0;
  removeItem(ch, 'stone', cost.stones);
  ch.gold -= cost.gold;
  const success = Math.random() < ENHANCE_RATE[lv];
  if (success) { e.e = lv + 1; return { ok: true, success: true, before: lv, after: e.e }; }
  if (lv >= ENHANCE_SAFE) {
    if (protect) { removeItem(ch, 'protect', 1); return { ok: true, success: false, protected: true, before: lv, after: lv }; }
    e.e = lv - 1;
    return { ok: true, success: false, before: lv, after: e.e };
  }
  return { ok: true, success: false, before: lv, after: lv };
}

// ===== Inventory =====
export function countItem(ch, id) {
  return ch.inventory.filter((e) => e.id === id).reduce((a, e) => a + e.qty, 0);
}

export function addItem(ch, id, qty = 1, rarity = 0, bonus = {}) {
  const it = ITEMS[id];
  if (!it) return false;
  if (it.type !== 'equip') {
    const ex = ch.inventory.find((e) => e.id === id);
    if (ex) { ex.qty = Math.min(999, ex.qty + qty); return true; }
    if (ch.inventory.length >= INV_SIZE) return false;
    ch.inventory.push(makeEntry(id, qty));
    return true;
  }
  for (let i = 0; i < qty; i++) {
    if (ch.inventory.length >= INV_SIZE) return false;
    ch.inventory.push(makeEntry(id, 1, rarity, bonus));
  }
  return true;
}

export function removeItem(ch, id, qty = 1) {
  let left = qty;
  for (const e of [...ch.inventory]) {
    if (e.id !== id || left <= 0) continue;
    const take = Math.min(e.qty, left);
    e.qty -= take; left -= take;
    if (e.qty <= 0) ch.inventory.splice(ch.inventory.indexOf(e), 1);
  }
  return left === 0;
}

export function removeEntry(ch, uid, qty = 1) {
  const e = ch.inventory.find((x) => x.uid === uid);
  if (!e) return null;
  e.qty -= qty;
  if (e.qty <= 0) ch.inventory.splice(ch.inventory.indexOf(e), 1);
  return e;
}

export function canEquip(ch, e) {
  const it = ITEMS[e.id];
  if (it.type !== 'equip') return 'Không phải trang bị';
  if (it.cls && it.cls !== ch.cls) return `Chỉ ${CLASSES[it.cls].name} dùng được`;
  if ((it.lv || 1) > ch.level) return `Cần cấp ${it.lv}`;
  return null;
}

export function equipEntry(ch, uid) {
  const e = ch.inventory.find((x) => x.uid === uid);
  if (!e) return 'Không tìm thấy';
  const err = canEquip(ch, e);
  if (err) return err;
  const slot = ITEMS[e.id].slot;
  ch.inventory.splice(ch.inventory.indexOf(e), 1);
  if (ch.equip[slot]) ch.inventory.push(ch.equip[slot]);
  ch.equip[slot] = e;
  return null;
}

export function unequip(ch, slot) {
  if (!ch.equip[slot]) return 'Trống';
  if (ch.inventory.length >= INV_SIZE) return 'Túi đồ đầy';
  ch.inventory.push(ch.equip[slot]);
  ch.equip[slot] = null;
  return null;
}

export function sellPrice(e) {
  const it = ITEMS[e.id];
  const base = it.price || Math.max(50, (it.lv || 1) * 60);
  return Math.max(1, Math.floor(base * 0.35 * (1 + (e.r || 0) * 0.8) * (1 + (e.e || 0) * 0.3)));
}
