// Character rules: socketing, unsocketing and fusing gems
import { ITEMS, GEM_SLOTS, GEM_FUSE, gemId, socketCount, socketCost, unsocketCost } from '../../data/items.js';
import { countItem, addItem, removeItem } from './inventory.js';

// ===== Gem sockets =====
// Checks whether a gem fits that equipment slot
export function gemFits(e, gemItemId) {
  const it = ITEMS[e.id], gm = ITEMS[gemItemId] && ITEMS[gemItemId].gem;
  if (!gm || it.type !== 'equip') return false;
  return GEM_SLOTS[it.slot].includes(gm.kind);
}

export function socketGem(ch, e, gemItemId) {
  const it = ITEMS[e.id];
  e.g = e.g || [];
  if (e.g.length >= socketCount(e)) return { ok: false, msg: 'Trang bị đã hết lỗ khảm' };
  if (!gemFits(e, gemItemId)) return { ok: false, msg: 'Loại ngọc này không hợp với trang bị' };
  if (countItem(ch, gemItemId) < 1) return { ok: false, msg: 'Không có ngọc' };
  const cost = socketCost(it, ITEMS[gemItemId].gem.g);
  if (ch.gold < cost) return { ok: false, msg: `Cần ${cost} ngân lượng tiền công` };
  ch.gold -= cost;
  removeItem(ch, gemItemId, 1);
  e.g.push(gemItemId);
  return { ok: true };
}

export function unsocketGem(ch, e, idx) {
  const id = (e.g || [])[idx];
  if (!id) return { ok: false, msg: 'Lỗ khảm trống' };
  const cost = unsocketCost(ITEMS[id].gem.g);
  if (ch.gold < cost) return { ok: false, msg: `Cần ${cost} ngân lượng tiền công` };
  if (!addItem(ch, id, 1)) return { ok: false, msg: 'Túi đồ đầy' };
  ch.gold -= cost;
  e.g.splice(idx, 1);
  return { ok: true, id };
}

// Fuse 3 gems of the same kind and grade into one gem of the next grade
export function fuseGems(ch, kind, g) {
  const from = gemId(kind, g), to = gemId(kind, g + 1);
  const rule = GEM_FUSE[g - 1];
  if (!rule) return { ok: false, msg: 'Ngọc đã ở phẩm cao nhất' };
  if (countItem(ch, from) < 3) return { ok: false, msg: 'Cần 3 viên cùng loại' };
  if (ch.gold < rule.gold) return { ok: false, msg: `Cần ${rule.gold} ngân lượng` };
  ch.gold -= rule.gold;
  if (Math.random() < rule.rate) {
    removeItem(ch, from, 3);
    addItem(ch, to, 1);
    return { ok: true, success: true, id: to };
  }
  removeItem(ch, from, 1); // failure: one gem breaks
  return { ok: true, success: false, id: from };
}
