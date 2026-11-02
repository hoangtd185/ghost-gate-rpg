// Damage formulas shared by the browser and the server. Online, the server computes every hit on a shared
// monster with these (the client only says which skill hit which monster); offline and for personal story
// bosses the browser uses the same functions, so numbers follow the same rules everywhere.
import { SKILLS, CLASSES } from '../data/classes.js';
import { elementMult } from '../data/elements.js';
import { GAME } from '../config.js';
import { rand } from '../engine/util.js';

// Damage multiplier of a skill at the character's level of it
export function skillMult(ch, sid) {
  const sk = SKILLS[sid];
  if (!sk) return 0;
  return (sk.mult || 0) * (1 + GAME.player.skillDmgPerLv * ((ch.skills?.[sid] || 1) - 1));
}

// The skill's element, otherwise the weapon's (st.el from calcStats)
export const skillElement = (sid, st) => (SKILLS[sid] && SKILLS[sid].el) || st.el || null;

// Can this character use this skill at all (own class, learned)?
export function knowsSkill(ch, sid) {
  return !!(SKILLS[sid] && CLASSES[ch.cls] && CLASSES[ch.cls].skills.includes(sid) && (ch.skills?.[sid] || 0) > 0);
}

// One hit of a player on a monster.
// st: calcStats(ch, buffs) · mult: skill multiplier · mob: monster def ({ def, res }) · el: element or null
// lowHp: the attacker is below 35% HP (the "last stand" passive)
// Returns { dmg, crit, em } (em: element multiplier, > 1 weak, < 1 resists)
export function hitDamage(st, mult, mob, el, lowHp = false) {
  const pas = st.pas;
  let atk = st.atk;
  if (pas.lowHp && lowHp) atk *= 1 + pas.lowHp / 100;
  let dmg = atk * mult * rand(0.85, 1.15) - mob.def * 0.8;
  let crit = false;
  if (Math.random() * 100 < st.crit) { dmg *= 1.6 + pas.critDmg / 100; crit = true; }
  if (el) dmg *= 1 + pas.elemDmg / 100;
  const em = elementMult(el, mob.res);
  dmg *= em;
  return { dmg: Math.max(1, Math.round(dmg)), crit, em };
}

// A bot's hit (offline decoration): flat attack, no crit or elements
export function botDamage(atk, mult, mob) {
  return Math.max(1, Math.round(atk * mult * rand(0.85, 1.15) - mob.def * 0.8));
}

// How many separate hits one cast of a skill can produce, and how far from the caster they can land.
// The server uses this to rate-limit hit reports per skill.
export function skillReach(sid) {
  const sk = SKILLS[sid];
  if (!sk) return { hits: 0, range: 0 };
  const targets = sk.maxTargets || sk.targets || 1;
  let hits = (sk.hits || 1) * targets * (sk.count || 1);
  if (sk.type === 'cloud') hits = Math.ceil(sk.dur / sk.tick) * 6; // ticks × monsters in the cloud
  const range = sk.type === 'orbs' ? sk.range + 120 : sk.type === 'cloud' ? 50 + sk.radius : sk.type === 'dash' ? sk.dist + 40 : sk.range || 60;
  return { hits, range };
}
