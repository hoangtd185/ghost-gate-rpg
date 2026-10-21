// Logic nhân vật: chỉ số, kinh nghiệm, túi đồ, trang bị, nhiệm vụ.
// Toàn bộ trạng thái nhân vật là một object JSON thuần để lưu thẳng vào database.
import { CLASSES, SKILLS, SKILL_MAX_LV, PASSIVES, PASSIVE_MAX_LV, passivesOf } from '../data/classes.js';
import { ITEMS, RARITY, ENHANCE_MAX, ENHANCE_RATE, ENHANCE_SAFE, ENHANCE_BONUS, enhanceCost, GEM_KINDS, GEM_SLOTS, GEM_FUSE, gemId, socketCount, socketCost, unsocketCost } from '../data/items.js';
import { ELEMENT_IDS, MAX_RES } from '../data/elements.js';
import { QUESTS, NPCS, RETIRED_QUESTS } from '../data/npcs.js';
import { MAIN_ORDER } from '../data/story.js';
import { makeId, randInt, chance, pick } from '../engine/util.js';

export const INV_SIZE = 36;
export const MAX_LEVEL = 50;

export function expToNext(lv) {
  return Math.floor(22 * Math.pow(lv, 1.85) + 28 * lv);
}

export function newCharacter(name, cls) {
  const c = CLASSES[cls];
  const ch = {
    id: makeId(), name, cls, level: 1, exp: 0, gold: 50,
    hp: 1, mp: 1,
    stats: { ...c.base }, statPoints: 0, skillPoints: 0,
    skills: { [c.skills[0]]: 1 },
    inventory: [], equip: { weapon: null, hat: null, armor: null, acc: null, outfit: null },
    quests: {}, flags: {}, map: 'lang', x: 380,
    createdAt: Date.now(), playTime: 0,
  };
  ch.equip.weapon = makeEntry(`w_${cls}1`, 1, 0, {});
  ch.equip.armor = makeEntry('arm_cloth', 1, 0, {});
  addItem(ch, 'hp_s', 10);
  addItem(ch, 'mp_s', 5);
  const d = calcStats(ch);
  ch.hp = d.maxHp; ch.mp = d.maxMp;
  return ch;
}

// Đảm bảo dữ liệu cũ/thiếu field vẫn chạy (khi load từ DB)
export function normalizeCharacter(ch) {
  const c = CLASSES[ch.cls] || CLASSES.kiem;
  ch.cls = c.id;
  ch.stats = { ...c.base, ...(ch.stats || {}) };
  ch.skills = ch.skills || { [c.skills[0]]: 1 };
  ch.inventory = (ch.inventory || []).filter((e) => e && ITEMS[e.id]);
  ch.equip = { weapon: null, hat: null, armor: null, acc: null, outfit: null, ...(ch.equip || {}) };
  for (const k of Object.keys(ch.equip)) if (ch.equip[k] && !ITEMS[ch.equip[k].id]) ch.equip[k] = null;
  ch.quests = ch.quests || {};
  ch.flags = ch.flags && typeof ch.flags === 'object' ? ch.flags : {};
  for (const qid of Object.keys(ch.quests)) if (!QUESTS[qid] || RETIRED_QUESTS.includes(qid)) delete ch.quests[qid];
  // Tuyến chính được chèn thêm nhiệm vụ: nhân vật đã đi xa hơn thì các bước trước tính là xong
  let last = -1;
  MAIN_ORDER.forEach((qid, i) => { if (ch.quests[qid] && ch.quests[qid].s === 'done') last = i; });
  for (let i = 0; i < last; i++) {
    const qid = MAIN_ORDER[i];
    if (!ch.quests[qid] || ch.quests[qid].s !== 'done') ch.quests[qid] = { s: 'done', p: QUESTS[qid].count };
  }
  for (const e of [...ch.inventory, ...Object.values(ch.equip)]) {
    if (e && e.g) e.g = e.g.filter((id) => ITEMS[id] && ITEMS[id].type === 'gem').slice(0, socketCount(e));
  }
  ch.pet = ch.pet && ch.pet.id ? { id: ch.pet.id, on: ch.pet.on !== false } : null;
  ch.title = ch.title || null;
  ch.level = ch.level || 1; ch.exp = ch.exp || 0; ch.gold = ch.gold || 0;
  ch.statPoints = ch.statPoints || 0; ch.skillPoints = ch.skillPoints || 0;
  ch.map = ch.map || 'lang'; ch.x = ch.x || 380; ch.playTime = ch.playTime || 0;
  return ch;
}

// 'W2' trong bảng rơi đồ / phần thưởng = vũ khí bậc 2 đúng môn phái
export function resolveItemId(id, cls) {
  if (/^W\d$/.test(id)) return `w_${cls}${id[1]}`;
  if (/^GEM\d$/.test(id)) return gemId(pick(Object.keys(GEM_KINDS)), +id[3]); // ngọc ngẫu nhiên
  return id;
}

export function makeEntry(id, qty = 1, rarity = 0, bonus = {}) {
  return { uid: makeId(), id, qty, r: rarity, b: bonus };
}

// Đồ rơi từ quái có độ hiếm ngẫu nhiên và chỉ số cộng thêm
export function rollEquip(id, luck = 0) {
  const it = ITEMS[id];
  let r = 0;
  const roll = Math.random() - luck;
  if (roll < 0.02) r = 3; else if (roll < 0.09) r = 2; else if (roll < 0.28) r = 1;
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

// Chỉ số của một món đồ: chỉ số gốc × cường hóa + chỉ số cộng thêm ngẫu nhiên
export function entryStats(e) {
  const it = ITEMS[e.id];
  const mul = 1 + ENHANCE_BONUS * (e.e || 0);
  const out = {};
  for (const [k, v] of Object.entries(it.stats || {})) out[k] = k.startsWith('r_') || k === 'crit' ? v : Math.round(v * mul);
  for (const [k, v] of Object.entries(e.b || {})) out[k] = (out[k] || 0) + v;
  for (const id of e.g || []) {
    const gm = ITEMS[id] && ITEMS[id].gem;
    if (!gm) continue;
    const k = GEM_KINDS[gm.kind];
    out[k.stat] = (out[k.stat] || 0) + k.vals[gm.g - 1];
  }
  return out;
}

// ===== Ép ngọc =====
// Kiểm tra ngọc có hợp với vị trí trang bị không
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

// Hợp 3 viên cùng loại cùng phẩm thành 1 viên phẩm cao hơn
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
  removeItem(ch, from, 1); // thất bại: vỡ 1 viên
  return { ok: true, success: false, id: from };
}

// Hệ nguyên tố của vũ khí: ngọc đã khảm, nếu không thì hệ sẵn có của vũ khí
export function entryElement(e) {
  if (!e) return null;
  return e.el || ITEMS[e.id].el || null;
}

export function entryName(e) {
  const it = ITEMS[e.id];
  return (e.e ? `+${e.e} ` : '') + it.name;
}

// Cường hóa một món. Trả về { ok, msg, before, after }
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

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function rarityColor(e) {
  return RARITY[e.r || 0].color;
}

export function calcStats(ch, buffs = []) {
  const c = CLASSES[ch.cls];
  const s = { ...ch.stats };
  const eq = { atk: 0, def: 0, hp: 0, mp: 0, crit: 0 };
  for (const e of Object.values(ch.equip)) {
    if (!e) continue;
    for (const [k, v] of Object.entries(entryStats(e))) {
      if (k in s) s[k] += v; else eq[k] = (eq[k] || 0) + v;
    }
  }
  const pas = passiveTotals(ch);
  const main = s[c.main];
  const other = s.str + s.dex + s.int - main;
  let atk = eq.atk + main * 1.7 + other * 0.35 + ch.level * 1.2;
  let def = eq.def + s.vit * 0.6 + ch.level * 0.4;
  let atkMul = 1, defMul = 1;
  for (const b of buffs) { atkMul += b.atk || 0; defMul += b.def || 0; }
  atkMul += pas.atkPct / 100; defMul += pas.defPct / 100;
  return {
    ...s,
    maxHp: Math.floor((40 + s.vit * 11 + ch.level * c.hpGrow + eq.hp) * (1 + pas.hpPct / 100)),
    maxMp: Math.floor((16 + s.int * 6 + ch.level * c.mpGrow + eq.mp) * (1 + pas.mpPct / 100)),
    atk: Math.floor(atk * atkMul),
    def: Math.floor(def * defMul),
    crit: Math.min(70, 5 + s.dex * 0.45 + eq.crit + pas.crit),
    res: Object.fromEntries(ELEMENT_IDS.map((el) => [el, Math.min(MAX_RES, (eq['r_' + el] || 0) + pas.resAll)])),
    pas,
    el: entryElement(ch.equip.weapon),
  };
}

// Cộng EXP, trả về số cấp đã lên
export function gainExp(ch, amount) {
  let ups = 0;
  if (ch.level >= MAX_LEVEL) return 0;
  ch.exp += amount;
  while (ch.level < MAX_LEVEL && ch.exp >= expToNext(ch.level)) {
    ch.exp -= expToNext(ch.level);
    ch.level++;
    ch.statPoints += 5;
    ch.skillPoints += 1;
    ups++;
  }
  // Tự học kỹ năng mới khi đủ cấp
  for (const sid of CLASSES[ch.cls].skills) {
    if (!ch.skills[sid] && SKILLS[sid].unlock <= ch.level) ch.skills[sid] = 1;
  }
  return ups;
}

// ===== Chế tạo =====
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
    const ok = it.type === 'equip' ? addItem(ch, oid, 1, it.slot === 'outfit' ? 3 : 1, {}) : addItem(ch, oid, qty);
    if (!ok) return { ok: false, msg: 'Túi đồ đầy', out };
    for (const [id, q] of r.need) removeItem(ch, id, q);
    ch.gold -= r.gold;
    out.push(oid);
  }
  return { ok: true, out };
}

// ===== Nội công (bị động) =====
// Cộng dồn hiệu ứng các nội công đã học
export function passiveTotals(ch) {
  const t = { hpPct: 0, mpPct: 0, atkPct: 0, defPct: 0, crit: 0, critDmg: 0, lifesteal: 0, elemDmg: 0, mpCost: 0, mpRegen: 0, resAll: 0, dodge: 0, speed: 0, killHeal: 0, lowHp: 0 };
  for (const id of passivesOf(ch.cls)) {
    const lv = ch.skills[id] || 0;
    if (!lv) continue;
    for (const [k, v] of Object.entries(PASSIVES[id].per)) t[k] += v * lv;
  }
  return t;
}

// Lý do chưa học/nâng được nội công (null = được)
export function passiveBlock(ch, id) {
  const p = PASSIVES[id], lv = ch.skills[id] || 0;
  if (lv >= PASSIVE_MAX_LV) return 'Đã tối đa';
  if (ch.level < p.unlock) return `Cần cấp ${p.unlock}`;
  if (p.req && (ch.skills[p.req[0]] || 0) < p.req[1]) return `Cần ${PASSIVES[p.req[0]].name} cấp ${p.req[1]}`;
  if (ch.skillPoints <= 0) return 'Hết điểm kỹ năng';
  return null;
}

export function learnPassive(ch, id) {
  if (passiveBlock(ch, id)) return false;
  ch.skills[id] = (ch.skills[id] || 0) + 1;
  ch.skillPoints--;
  return true;
}

// Tẩy điểm: trả lại toàn bộ điểm kỹ năng, chiêu đã mở về cấp 1, quên hết nội công
export function resetCost(ch) { return ch.level * 150; }
export function resetSkills(ch) {
  const cost = resetCost(ch);
  if (ch.gold < cost) return false;
  ch.gold -= cost;
  const skills = {};
  for (const sid of CLASSES[ch.cls].skills) if (ch.skills[sid]) skills[sid] = 1;
  ch.skills = skills;
  ch.skillPoints = ch.level - 1;
  return true;
}

export function upgradeSkill(ch, sid) {
  if (ch.skillPoints <= 0 || !ch.skills[sid] || ch.skills[sid] >= SKILL_MAX_LV) return false;
  ch.skills[sid]++; ch.skillPoints--;
  return true;
}

export function addStat(ch, stat) {
  if (ch.statPoints <= 0) return false;
  ch.stats[stat]++; ch.statPoints--;
  return true;
}

// ===== Túi đồ =====
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

// ===== Nhiệm vụ =====
// locked | available | active | ready | done
export function questStatus(ch, qid) {
  const q = QUESTS[qid];
  const st = ch.quests[qid];
  if (st && st.s === 'done') {
    if (!q.daily || st.day === todayKey()) return 'done';
    // nhiệm vụ ngày đã sang ngày mới: nhận lại được
    if (ch.level < q.lv) return 'locked';
    return 'available';
  }
  if (st && st.s === 'active') {
    const prog = q.type === 'collect' ? countItem(ch, q.target) : st.p;
    return prog >= q.count ? 'ready' : 'active';
  }
  if (q.requires && questStatus(ch, q.requires) !== 'done') return 'locked';
  if (ch.level < q.lv) return 'locked';
  return 'available';
}

export function questProgress(ch, qid) {
  const q = QUESTS[qid];
  const st = ch.quests[qid];
  if (!st) return 0;
  if (st.s === 'done') return q.count;
  return Math.min(q.count, q.type === 'collect' ? countItem(ch, q.target) : st.p);
}

// NPC nhận trả nhiệm vụ: nhiệm vụ "đi gặp" trả ở người cần gặp, còn lại ở turnIn hoặc người giao
export function questTurnIn(q) {
  return q.type === 'talk' ? q.target : (q.turnIn || q.npc);
}

// Vật phẩm nhiệm vụ rơi từ quái khi đang làm nhiệm vụ cần nó
export function questDropsFor(ch, mobId) {
  const out = [];
  for (const [qid, st] of Object.entries(ch.quests)) {
    const q = QUESTS[qid];
    if (!q || !q.drop || st.s !== 'active' || q.drop.mob !== mobId) continue;
    if (countItem(ch, q.drop.item) >= q.count) continue;
    if (Math.random() < q.drop.chance) out.push(q.drop.item);
  }
  return out;
}

// Dấu trên đầu NPC: '?' có việc cần trả, '!' có nhiệm vụ mới, null nếu không có gì
export function npcMarker(ch, npcId) {
  for (const qid of Object.keys(ch.quests)) {
    const q = QUESTS[qid];
    if (!q) continue;
    const s = questStatus(ch, qid);
    if (questTurnIn(q) !== npcId) continue;
    if (s === 'ready' || (s === 'active' && q.type === 'talk')) return '?';
  }
  const npc = NPCS[npcId];
  const avail = (npc.quests || []).filter((qid) => questStatus(ch, qid) === 'available').map((qid) => QUESTS[qid]);
  if (avail.some((q) => q.cat === 'main')) return '!!';
  if (avail.some((q) => q.cat === 'tut')) return '!t';
  if (avail.length) return '!';
  return null;
}

// Sự kiện thao tác cho nhiệm vụ hướng dẫn (type 'act'): djump, potion, buy, stat, skillup, enhance, socket, fuse, orb, daily
export function questEvent(ch, name, n = 1) {
  const changed = [];
  for (const [qid, st] of Object.entries(ch.quests)) {
    const q = QUESTS[qid];
    if (q && st.s === 'active' && q.type === 'act' && q.target === name && st.p < q.count) {
      st.p = Math.min(q.count, st.p + n);
      changed.push(qid);
    }
  }
  return changed;
}

// Điều kiện của một câu thoại: 'bell=ring' → cờ bell phải là ring
export function lineVisible(ch, cond) {
  if (!cond) return true;
  const [k, v] = cond.split('=');
  return (ch.flags || {})[k] === v;
}

// NPC có đứng trên bản đồ không (theo tiến độ cốt truyện)
export function npcPresent(ch, entry) {
  if (entry.after && questStatus(ch, entry.after) !== 'done') return false;
  if (entry.until && ch.quests[entry.until]) return false;
  if (entry.hideWhile) { const s = questStatus(ch, entry.hideWhile); if (s === 'active' || s === 'ready') return false; }
  return true;
}

export function onKillForQuests(ch, mobId) {
  const changed = [];
  for (const [qid, st] of Object.entries(ch.quests)) {
    const q = QUESTS[qid];
    if (st.s === 'active' && q.type === 'kill' && q.target === mobId && st.p < q.count) {
      st.p++;
      changed.push(qid);
    }
  }
  return changed;
}

export function luckRoll() {
  return chance(0.5) ? 0 : 0.01;
}
