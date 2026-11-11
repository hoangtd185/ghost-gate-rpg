// Shared by the story chapter files: EXP rewards as a share of the EXP needed to level up
import { GAME } from '../../config.js';

// Reward EXP = a share of the EXP needed to level up (same formula as expToNext), so players still have to fight to reach the next step's level.
const { a: EA, p: EP, b: EB } = GAME.player.expCurve;
export const needExp = (lv) => Math.floor(EA * Math.pow(lv, EP) + EB * lv);
export const EXP_SHARE = GAME.story.expShare; // tuned in config.js
export const BIG = ['st7', 'st12', 'st18']; // chapter boss kill
export function main(chapter, q) {
  const out = { cat: 'main', chapter, ...q, reward: { ...q.reward } };
  const share = q.target && q.target.startsWith('nb_') ? EXP_SHARE.namedBoss : EXP_SHARE[q.type];
  out.reward.exp = Math.round(needExp(q.lv) * share / 10) * 10;
  return out;
}
