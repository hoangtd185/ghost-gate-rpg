// Character logic: stats, experience, inventory, equipment, quests.
// The whole character state is a plain JSON object that is saved straight to the database.
import { CLASSES, SKILLS } from '../data/classes.js';
import { ITEMS, socketCount } from '../data/items.js';
import { ELEMENT_IDS, MAX_RES } from '../data/elements.js';
import { QUESTS, RETIRED_QUESTS } from '../data/npcs.js';
import { MAIN_ORDER } from '../data/story.js';
import { migrateLegacy } from '../data/legacy.js';
import { makeId } from '../util.js';
import { GAME } from '../config.js';
import { MAX_LEVEL, expToNext, makeEntry, entryStats, entryElement } from './character/entries.js';
import { passiveTotals } from './character/passives.js';
import { addItem } from './character/inventory.js';
export { INV_SIZE, MAX_LEVEL, expToNext, resolveItemId, makeEntry, rollEquip, bonusLimits, entryStats, entryElement, entryName, todayKey, rarityColor, luckRoll } from './character/entries.js';
export { gemFits, socketGem, unsocketGem, fuseGems } from './character/gems.js';
export { canCraft, craft } from './character/crafting.js';
export { passiveTotals, passiveBlock, learnPassive, resetCost, resetSkills, upgradeSkill, addStat } from './character/passives.js';
export { countItem, addItem, removeItem, removeEntry, canEquip, equipEntry, unequip, sellPrice, enhanceEntry } from './character/inventory.js';
export { questStatus, questProgress, questTurnIn, questDropsFor, npcMarker, questEvent, lineVisible, npcPresent, onKillForQuests } from './character/quests.js';

export function newCharacter(name, cls) {
  const c = CLASSES[cls];
  const ch = {
    id: makeId(), name, cls, level: 1, exp: 0, gold: GAME.player.startGold,
    hp: 1, mp: 1,
    stats: { ...c.base }, statPoints: 0, skillPoints: 0,
    skills: { [c.skills[0]]: 1 },
    inventory: [], equip: { weapon: null, hat: null, armor: null, acc: null, outfit: null, cape: null },
    quests: {}, flags: {}, map: 'village', x: 380,
    createdAt: Date.now(), playTime: 0,
    ingots: 0, checkin: null, // Nguyên Bảo (premium shop); online the server owns both
    eventExp: 0, eventExpTaken: 0, // EXP from server events: the server's running total / how much of it this character took
  };
  ch.equip.weapon = makeEntry(`w_${cls}1`, 1, 0, {});
  ch.equip.armor = makeEntry('arm_cloth', 1, 0, {});
  addItem(ch, 'hp_s', 10);
  addItem(ch, 'mp_s', 5);
  const d = calcStats(ch);
  ch.hp = d.maxHp; ch.mp = d.maxMp;
  return ch;
}

// Make sure old data / missing fields still work (when loading from the DB)
export function normalizeCharacter(ch) {
  migrateLegacy(ch);
  const c = CLASSES[ch.cls] || CLASSES.swordsman;
  ch.cls = c.id;
  ch.stats = { ...c.base, ...(ch.stats || {}) };
  ch.skills = ch.skills || { [c.skills[0]]: 1 };
  ch.inventory = (ch.inventory || []).filter((e) => e && ITEMS[e.id]);
  ch.equip = { weapon: null, hat: null, armor: null, acc: null, outfit: null, cape: null, ...(ch.equip || {}) };
  for (const k of Object.keys(ch.equip)) if (ch.equip[k] && !ITEMS[ch.equip[k].id]) ch.equip[k] = null;
  ch.quests = ch.quests || {};
  ch.flags = ch.flags && typeof ch.flags === 'object' ? ch.flags : {};
  ch.ingots = Math.max(0, Math.floor(+ch.ingots || 0));
  ch.eventExp = Math.max(0, Math.floor(+ch.eventExp || 0));
  ch.eventExpTaken = Math.max(0, Math.min(ch.eventExp, Math.floor(+ch.eventExpTaken || 0)));
  ch.checkin = ch.checkin && typeof ch.checkin === 'object' ? ch.checkin : null;
  for (const qid of Object.keys(ch.quests)) if (!QUESTS[qid] || RETIRED_QUESTS.includes(qid)) delete ch.quests[qid];
  // The main line gained new quests: if a character is further along, earlier steps count as done
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
  ch.map = ch.map || 'village'; ch.x = ch.x || 380; ch.playTime = ch.playTime || 0;
  return ch;
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
    res: Object.fromEntries(ELEMENT_IDS.map((el) => [el, Math.min(MAX_RES, (eq['res_' + el] || 0) + pas.resAll)])),
    pas,
    el: entryElement(ch.equip.weapon),
  };
}

// Add EXP, returns the number of levels gained
export function gainExp(ch, amount) {
  let ups = 0;
  if (ch.level >= MAX_LEVEL) return 0;
  ch.exp += amount;
  while (ch.level < MAX_LEVEL && ch.exp >= expToNext(ch.level)) {
    ch.exp -= expToNext(ch.level);
    ch.level++;
    ch.statPoints += GAME.player.statPointsPerLevel;
    ch.skillPoints += GAME.player.skillPointsPerLevel;
    ups++;
  }
  // Learn new skills automatically at the right level
  for (const sid of CLASSES[ch.cls].skills) {
    if (!ch.skills[sid] && SKILLS[sid].unlock <= ch.level) ch.skills[sid] = 1;
  }
  return ups;
}
