// Small helpers and tuning shared by the GameWorld parts (core in ../world.js, the rest in this folder)
import { ITEMS, isLookSlot } from '../../../../shared/data/items.js';
import { Player } from '../entities.js';
import { chance } from '../../../../shared/util.js';
import { GAME } from '../../../../shared/config.js';

export const dist2 = (a, b) => Math.abs(a.cx - b.cx);
// '#rrggbb' + alpha
export const rbg = (hex, a) => rgbaHex(hex, a);
export function rgbaHex(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }

// Player jump: initial impulse, how long holding Space keeps pushing, and the extra push
export const PH = GAME.physics; // tuned in config.js
export const PLAYER_JUMP = PH.jumpV;
export const JUMP_HOLD_TIME = PH.jumpHoldTime;
export const JUMP_HOLD_ACCEL = PH.jumpHoldAccel;
export const SPRINT_MULT = PH.sprintMult;

// Glow behind projectiles: [core color, radius]
export const PROJ_GLOW = {
  talisman: ['rgba(255,220,90,0.55)', 14], fire: ['rgba(255,140,40,0.7)', 26], wave: ['rgba(140,200,255,0.6)', 26],
  dart: ['rgba(220,240,255,0.35)', 9], ember: ['rgba(255,110,40,0.6)', 14], ghostfire: ['rgba(200,80,255,0.6)', 16], thunderorb: ['rgba(140,200,255,0.8)', 18], bloodtalisman: ['rgba(255,40,70,0.6)', 18], fireball: ['rgba(255,140,40,0.7)', 22], waterbolt: ['rgba(110,170,255,0.6)', 14],
};
// Trails: [palette, max particle size, chance per frame]
export const PROJ_TRAIL = {
  talisman: [['#ffe27a', '#fff6c0', '#ff9a3c'], 2.2, 0.6], fire: [['#ffb04a', '#ff6a2a', '#fff0a0'], 3.2, 1],
  wave: [['#bfe6ff', '#ffffff', '#7ab8ff'], 2.6, 0.9], dart: [['#e8f0ff'], 1.4, 0.35],
  ember: [['#ff8a3a', '#ffd06a'], 2, 0.5], ghostfire: [['#d08aff', '#ff9aff', '#8a4aff'], 2.4, 0.7],
  bloodtalisman: [['#ff4a5a', '#ffb0b8', '#a8142a'], 2.4, 0.8],
  fireball: [['#ffb04a', '#ff6a2a', '#fff0a0'], 3.4, 1], thunderorb: [['#bfe0ff', '#ffffff', '#7ab8ff'], 2.2, 1], waterbolt: [['#bfe0ff', '#ffffff'], 2, 0.6],
};
// Main color of each skill (magic circle, particles)
export const SKILL_FX = {
  sw_combo: '#8fd0ff', sw_wave: '#bfe6ff', sw_guard: '#ffd84a',
  ta_thunder: '#a8d4ff', ta_fire: '#ff9a3c', ta_orbs: '#9ad8ff',
  as_triple: '#c8f0a0', as_dash: '#c08aff', as_poison: '#8fe06a',
};

// Drops worth saving immediately: outfits, Rare+ equipment, grade 2+ gems, orbs and protection charms
export function isRareDrop(e) {
  const it = ITEMS[e.id];
  if (!it) return false;
  if (isLookSlot(it.slot)) return true;
  if (it.type === 'equip') return (e.r || 0) >= 2;
  if (it.type === 'gem') return it.gem.g >= 2;
  return e.id.startsWith('orb_') || e.id === 'protect';
}

