// Character rules: crafting recipes
import { ITEMS, isLookSlot } from '../../data/items.js';
import { resolveItemId } from './entries.js';
import { countItem, addItem, removeItem } from './inventory.js';

// ===== Crafting =====
export function canCraft(ch, r, n = 1) {
  if (ch.gold < r.gold * n) return `Cần ${r.gold * n} ngân lượng`;
  for (const [id, q] of r.need) if (countItem(ch, id) < q * n) return `Thiếu ${ITEMS[id].name}`;
  return null;
}

export function craft(ch, r, n = 1) {
  const err = canCraft(ch, r, n);
  if (err) return { ok: false, msg: err };
  const [oid0, qty] = r.out;
  const out = [];
  for (let k = 0; k < n; k++) {
    const oid = resolveItemId(oid0, ch.cls);
    const it = ITEMS[oid];
    const ok = it.type === 'equip' ? addItem(ch, oid, 1, isLookSlot(it.slot) ? 3 : 1, {}) : addItem(ch, oid, qty);
    if (!ok) return { ok: false, msg: 'Túi đồ đầy', out };
    for (const [id, q] of r.need) removeItem(ch, id, q);
    ch.gold -= r.gold;
    out.push(oid);
  }
  return { ok: true, out };
}
