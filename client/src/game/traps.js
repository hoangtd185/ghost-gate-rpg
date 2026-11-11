// Event traps. Plain logic (no drawing), used by the browser and the unit tests.
// Every trap runs on a fixed cycle of one clock that all players on a floor share (seconds since the floor opened
// for this run, see GameWorld.trapTime), so everyone sees the same spikes rise at the same moment without any
// network traffic. Like monster contact, the damage a trap does is applied by each client to its own player.
//
// Trap kinds (map.traps), y = the surface the trap stands on (GROUND_Y or a platform top), dmg = optional share of max
// HP that overrides GAME.dungeon.trapDmg:
//   spikes   { x, y, w, period, up, offset? }        spikes rise for `up` seconds at the end of every `period`
//   flame    { x, y, w, h, period, up, offset? }     a fire column, same cycle, much taller
//   teeth    { x, y, w, h, period, up, offset? }     teeth snap shut from above over the whole column
//   laser    { x, y, w, period, up, offset? }        a beam sweeps a ledge (a glint first)
//   gas      { x, y, w, h, period, up, slow?, offset? }  a poison cloud; `slow` also slows you
//   wheel    { x, y, w, period, up, offset? }        a spinning fire wheel that appears and vanishes
//   crumble  { x, y, w, period, solid, offset? }     a slab that holds for `solid` seconds, then falls away
//   drop     { x, w, period, fall, offset? }         a rock falls from the ceiling during `fall` seconds of each cycle
//   fireball { x, y, w, period, offset? }            a fireball rolls along y from x to x + w once per cycle
//   pit      { x, w }                                sinking ground: always on, sends you back to the floor's start
import { GROUND_Y } from '../../../shared/data/maps.js';
import { overlap } from '../../../shared/util.js';
import { GAME } from '../../../shared/config.js';

const TRAP_CFG = GAME.dungeon.trap;
// kinds that strike on the "up" part of their cycle
const CYCLED = new Set(['spikes', 'flame', 'teeth', 'laser', 'gas', 'wheel']);

// Seconds into the trap's cycle at clock time t (0 <= result < period)
export function cyclePos(tr, t) {
  const c = (t + (tr.offset || 0)) % tr.period;
  return c < 0 ? c + tr.period : c;
}

// 'on' (dangerous / solid), 'warn' (about to strike / about to fall), 'off' (safe / gone)
export function trapState(tr, t) {
  if (tr.kind === 'pit' || tr.kind === 'fireball') return 'on';
  const c = cyclePos(tr, t);
  if (tr.kind === 'crumble') return c >= tr.solid ? 'off' : c >= tr.solid - TRAP_CFG.crumbleWarn ? 'warn' : 'on';
  if (tr.kind === 'drop') return c < tr.fall ? 'on' : c >= tr.period - TRAP_CFG.warn ? 'warn' : 'off';
  const upAt = tr.period - tr.up;
  return c >= upAt ? 'on' : c >= upAt - TRAP_CFG.warn ? 'warn' : 'off';
}

// The area a dangerous trap hurts at time t (moving traps move)
export function trapBox(tr, t = 0) {
  switch (tr.kind) {
    case 'pit': return { x: tr.x, y: GROUND_Y - 4, w: tr.w, h: 8 };
    case 'flame': case 'teeth': case 'gas': return { x: tr.x, y: tr.y - tr.h, w: tr.w, h: tr.h };
    case 'laser': return { x: tr.x, y: tr.y - TRAP_CFG.laserH, w: tr.w, h: TRAP_CFG.laserH };
    case 'wheel': return { x: tr.x, y: tr.y - tr.w, w: tr.w, h: tr.w };
    case 'drop': { // the rock falls from above the screen to the ground
      const r = TRAP_CFG.rock, k = Math.min(1, cyclePos(tr, t) / tr.fall);
      return { x: tr.x + (tr.w - r) / 2, y: -r + k * (GROUND_Y + r) - r, w: r, h: r };
    }
    case 'fireball': {
      const b = TRAP_CFG.ball, k = cyclePos(tr, t) / tr.period;
      return { x: tr.x + k * (tr.w - b), y: tr.y - b, w: b, h: b };
    }
    default: return { x: tr.x, y: tr.y - TRAP_CFG.spikeH, w: tr.w, h: TRAP_CFG.spikeH }; // spikes
  }
}

// Crumbling slabs that can be stood on right now, as platforms ({ x, y, w })
export function solidCrumbles(traps, t) {
  return (traps || []).filter((tr) => tr.kind === 'crumble' && trapState(tr, t) !== 'off').map(({ x, y, w }) => ({ x, y, w }));
}

// The first dangerous trap touching body ({ x, y, w, h }) at time t, or null
export function trapHit(traps, t, body) {
  for (const tr of traps || []) {
    if (tr.kind === 'crumble' || trapState(tr, t) !== 'on') continue;
    if (overlap(trapBox(tr, t), body)) return tr;
  }
  return null;
}

// Share of max HP this trap takes
export const trapDamage = (tr) => tr.dmg ?? GAME.dungeon.trapDmg[tr.kind];

export const isCycledTrap = (tr) => CYCLED.has(tr.kind);
