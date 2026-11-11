// Character rules: passive skills (inner arts), skill and stat points
import { CLASSES, SKILL_MAX_LV, PASSIVES, PASSIVE_MAX_LV, passivesOf } from '../../data/classes.js';

// ===== Inner arts (passives) =====
// Sum the effects of all learned passives
export function passiveTotals(ch) {
  const t = { hpPct: 0, mpPct: 0, atkPct: 0, defPct: 0, crit: 0, critDmg: 0, lifesteal: 0, elemDmg: 0, mpCost: 0, mpRegen: 0, resAll: 0, dodge: 0, speed: 0, killHeal: 0, lowHp: 0 };
  for (const id of passivesOf(ch.cls)) {
    const lv = ch.skills[id] || 0;
    if (!lv) continue;
    for (const [k, v] of Object.entries(PASSIVES[id].per)) t[k] += v * lv;
  }
  return t;
}

// Why a passive cannot be learned/raised yet (null = it can)
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

// Reset: refund every skill point, unlocked skills back to level 1, forget all passives
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
