// Loot rules shared by the client (offline / artifact builds) and the server (online play).
// Plain logic over data modules: no DOM, no Node-only imports.
import { MONSTERS } from '../data/monsters.js';
import { ITEMS, GEM_KINDS, gemId } from '../data/items.js';
import { NAMED, CHIEF } from '../data/affixes.js';
import { NPCS, QUESTS } from '../data/npcs.js';
import { RECIPES } from '../data/recipes.js';
import { CLASSES } from '../data/classes.js';
import { GAME } from '../config.js';
import { rollEquip, resolveItemId } from './character.js';
import { chance } from '../engine/util.js';

// Extra drops that every elite carries on top of its species' table
export const ELITE_DROPS = [['GEM1', 0.6], ['stone', 0.7], ['stone', 0.3], ['protect', 0.06], ['out_jade_lotus', 0.004], ['out_wisp_hood', 0.004], ['out_peach_fairy', 0.002], ['mat_dew', 0.08]];

// The drop table of one monster: species table, plus elite / chieftain extras, or the named boss's own table
export function monsterDrops(mobId, { elite = false, chief = false, named = null } = {}) {
  if (named && NAMED[named]) return NAMED[named].drops;
  let drops = MONSTERS[mobId]?.drops || [];
  if (elite) drops = [...drops, ...ELITE_DROPS];
  if (chief) drops = [...drops, ...CHIEF.drops];
  return drops;
}

// Roll the items one kill drops (gold and quest items are handled separately).
// kill: { mob, elite, chief, named }; cls resolves class-specific ids ('W2' = tier-2 weapon of that class).
// table: the drop table to roll (default: the monster's own, see monsterDrops). Returns [{ id, qty, r, b, rare }]
export function rollDrops(kill, cls, table = null) {
  const def = MONSTERS[kill.mob];
  if (!def) return [];
  const named = kill.named && NAMED[kill.named] ? kill.named : null;
  const boss = !!def.boss;
  const elite = !named && !boss && !kill.chief && !!kill.elite;
  const chief = !named && !boss && !!kill.chief;
  const out = [];
  for (const [id0, p] of table || monsterDrops(kill.mob, { elite, chief, named })) {
    if (!chance(p)) continue;
    const id = resolveItemId(id0, cls);
    const it = ITEMS[id];
    if (!it) continue;
    const data = { id, qty: 1, r: 0, b: {} };
    if (it.slot === 'outfit') { data.r = 3; data.rare = true; }
    else if (it.type === 'equip') {
      const strong = boss || named || elite;
      const luck = chief ? CHIEF.luck : strong ? GAME.monsters.elite.luck : 0;
      const minR = boss || named ? 2 : chief ? CHIEF.minRarity : 0;
      const roll = rollEquip(id, luck, minR);
      data.r = roll.r; data.b = roll.bonus;
      if (data.r >= 3) data.rare = true;
    }
    out.push(data);
  }
  return out;
}

// EXP for one kill, adjusted for the level gap (killing far weaker monsters gives little)
export function killExp(baseExp, playerLv, mobLv) {
  const diff = playerLv - mobLv;
  const mul = diff >= 10 ? 0.2 : diff >= 6 ? 0.5 : diff <= -3 ? 1.25 : 1;
  return Math.max(1, Math.round(baseExp * mul));
}

// Every id a class-specific placeholder can stand for ('W2' -> each class's tier-2 weapon, 'GEM1' -> every grade-1 gem)
function expandId(id) {
  if (/^W\d$/.test(id)) return Object.keys(CLASSES).map((c) => `w_${c}${id[1]}`);
  if (/^GEM\d$/.test(id)) return Object.keys(GEM_KINDS).map((k) => gemId(k, +id[3]));
  return [id];
}

// Online play: which items may a client save add by itself?
//  - "free" items: anything sold in a shop, gems (fusing, unsocketing), quest-only items, with a max rarity each
//  - "granted" items: quest gifts and rewards, crafting results; allowed only up to what this save earned
//    (a quest accepted or completed in it, materials used up for a recipe)
//  - everything else (monster materials, outfits, rolled equipment) only comes from the server: drops, trades

// Map: item id -> max rarity of the free items
let freeCache = null;
export function freeItems() {
  if (freeCache) return freeCache;
  const m = new Map();
  const add = (id0, r = 0) => { for (const id of expandId(id0)) if (ITEMS[id] && (m.get(id) ?? -1) < r) m.set(id, r); };
  for (const n of Object.values(NPCS)) for (const id of n.shop || []) add(id, 0);
  for (const k of Object.keys(GEM_KINDS)) for (let g = 1; g <= 3; g++) add(gemId(k, g), 0);
  for (const q of Object.values(QUESTS)) if (q.drop && ITEMS[q.drop.item]?.type === 'quest') add(q.drop.item, 0);
  freeCache = m;
  return m;
}
export function isFreeItem(id, r = 0) {
  const max = freeItems().get(id);
  return max !== undefined && (r || 0) <= max;
}

// The starter kit of a new character (see newCharacter)
export function starterKit(cls) {
  return new Map([[`w_${cls}1`, 1], ['arm_cloth', 1], ['hp_s', 10], ['mp_s', 5]]);
}

const addTo = (m, id, n) => m.set(id, (m.get(id) || 0) + n);
const doneOn = (st) => st && st.s === 'done';

// Items a save may add because quests were accepted or completed in it.
// before / after: { questId: { s, p, day } } (server copy, uploaded copy). Map: item id -> quantity
export function questGrants(before, after, cls) {
  const m = new Map();
  for (const [qid, st] of Object.entries(after || {})) {
    const q = QUESTS[qid], was = before?.[qid];
    if (!q || !st) continue;
    const retaken = q.daily && doneOn(was) && was.day !== st.day;
    const accepted = (st.s === 'active' || st.s === 'done') && (!was || (retaken && st.s === 'active'));
    const completed = st.s === 'done' && (!was || was.s === 'active' || retaken);
    if (accepted) for (const [id, n] of q.give || []) addTo(m, resolveItemId(id, cls), n);
    if (completed) {
      for (const [id, n] of q.reward?.items || []) for (const x of expandId(resolveId(id, cls))) addTo(m, x, n);
      for (const [id] of q.reward?.random || []) addTo(m, id, 1);
    }
  }
  return m;
}
// 'W5' -> this class's weapon; 'GEM1' stays a placeholder (expanded to every gem of that grade)
const resolveId = (id, cls) => (/^W\d$/.test(id) ? `w_${cls}${id[1]}` : id);

// Items a save may add because it used up crafting materials. used: Map item id -> quantity consumed
export function craftGrants(used, cls) {
  const m = new Map();
  for (const r of RECIPES) {
    const n = Math.min(...r.need.map(([id, q]) => Math.floor((used.get(id) || 0) / q)));
    if (n > 0) for (const x of expandId(resolveId(r.out[0], cls))) addTo(m, x, n * r.out[1]);
  }
  return m;
}
