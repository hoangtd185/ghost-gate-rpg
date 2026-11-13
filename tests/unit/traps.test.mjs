// Event traps: the shared cycle (off, warn, on), crumbling slabs, falling rocks and rolling fireballs, what hurts,
// per-trap damage, and that every event floor's traps, exit and goal are valid.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAME } from '../../shared/config.js';
import { MAPS, GROUND_Y } from '../../shared/data/maps.js';
import { MONSTERS } from '../../shared/data/monsters.js';
import { cyclePos, trapState, trapBox, solidCrumbles, trapHit, trapDamage, isCycledTrap } from '../../client/src/game/traps.js';

const T = GAME.dungeon.trap, W = T.warn, CW = T.crumbleWarn;
const spikes = { kind: 'spikes', x: 100, y: GROUND_Y, w: 60, period: 3, up: 1 };
const crumble = { kind: 'crumble', x: 300, y: 250, w: 80, period: 4, solid: 2.6 };
const body = (x, y) => ({ x, y, w: 14, h: 32 });
const KINDS = ['spikes', 'flame', 'teeth', 'laser', 'gas', 'wheel', 'crumble', 'drop', 'fireball', 'pit'];

test('spikes are off, then warn, then up at the end of each cycle', () => {
  assert.equal(trapState(spikes, 0), 'off');
  assert.equal(trapState(spikes, 2 - W / 2), 'warn');
  assert.equal(trapState(spikes, 2.5), 'on');
  assert.equal(trapState(spikes, 3.2), 'off', 'the next cycle starts safe');
  assert.equal(trapState({ ...spikes, offset: 1 }, 1.5), 'on', 'an offset shifts the cycle');
  assert.ok(cyclePos(spikes, -0.5) >= 0, 'negative times wrap around');
});

test('a crumbling slab holds, shakes, then is gone until the cycle restarts', () => {
  assert.equal(trapState(crumble, 0.5), 'on');
  assert.equal(trapState(crumble, 2.6 - CW / 2), 'warn');
  assert.equal(trapState(crumble, 3), 'off');
  assert.deepEqual(solidCrumbles([crumble], 0.5), [{ x: 300, y: 250, w: 80 }]);
  assert.deepEqual(solidCrumbles([crumble], 2.6 - CW / 2), [{ x: 300, y: 250, w: 80 }], 'still solid while it shakes');
  assert.deepEqual(solidCrumbles([crumble], 3), []);
});

test('a falling rock drops from the ceiling to the ground, then waits with a warning', () => {
  const rock = { kind: 'drop', x: 400, w: 40, period: 3, fall: 1 };
  const top = trapBox(rock, 0), mid = trapBox(rock, 0.5), low = trapBox(rock, 0.99);
  assert.ok(top.y < 0 && mid.y > top.y && low.y > mid.y, 'it falls');
  assert.ok(low.y + low.h > GROUND_Y - T.rock, 'down to the ground');
  assert.equal(trapState(rock, 0.5), 'on');
  assert.equal(trapState(rock, 1.5), 'off', 'gone once it landed');
  assert.equal(trapState(rock, 3 - W / 2), 'warn', 'a shadow before the next one');
  assert.equal(trapHit([rock], 0.95, body(410, GROUND_Y - 32)), rock, 'hits whoever stands under it');
  assert.equal(trapHit([rock], 0.1, body(410, GROUND_Y - 32)), null, 'not while it is still high up');
});

test('a fireball rolls along its lane once per cycle', () => {
  const ball = { kind: 'fireball', x: 200, y: GROUND_Y, w: 1000, period: 4 };
  assert.equal(trapBox(ball, 0).x, 200);
  assert.ok(trapBox(ball, 2).x > 600 && trapBox(ball, 2).x < 800, 'halfway');
  assert.equal(trapHit([ball], 2, body(trapBox(ball, 2).x, GROUND_Y - 32)), ball);
  assert.equal(trapHit([ball], 0, body(900, GROUND_Y - 32)), null, 'far from the ball');
  assert.equal(trapHit([ball], 2, body(trapBox(ball, 2).x, 150)), null, 'jump over it');
});

test('only active traps hurt, and only what touches them', () => {
  const standing = body(120, GROUND_Y - 32);
  assert.equal(trapHit([spikes], 2.5, standing), spikes);
  assert.equal(trapHit([spikes], 0, standing), null, 'spikes down');
  assert.equal(trapHit([spikes], 2.5, body(300, GROUND_Y - 32)), null, 'not over them');
  assert.equal(trapHit([spikes], 2.5, body(120, GROUND_Y - 120)), null, 'jumping over them');
  const pit = { kind: 'pit', x: 400, w: 200 };
  assert.equal(trapHit([pit], 0, body(450, GROUND_Y - 32)), pit, 'pits are always on');
  assert.equal(trapHit([pit], 0, body(450, 200)), null, 'not while above it');
  assert.equal(trapHit([crumble], 0.5, body(310, 250 - 32)), null, 'slabs never hurt');
  const teeth = { kind: 'teeth', x: 500, y: GROUND_Y, w: 50, h: 130, period: 3, up: 1 };
  assert.equal(trapHit([teeth], 2.5, body(510, GROUND_Y - 100)), teeth, 'teeth close over the whole column');
  const laser = { kind: 'laser', x: 200, y: 236, w: 150, period: 5, up: 1 };
  assert.equal(trapHit([laser], 4.5, body(250, 236 - 32)), laser, 'a laser sweeps its ledge');
  assert.equal(trapHit([laser], 4.5, body(250, GROUND_Y - 32)), null, 'not the ground below');
});

test('damage: a trap may override the default share of max HP', () => {
  assert.equal(trapDamage(spikes), GAME.dungeon.trapDmg.spikes);
  assert.equal(trapDamage({ ...spikes, dmg: 0.9 }), 0.9);
  for (const k of KINDS) if (k !== 'crumble') assert.ok(GAME.dungeon.trapDmg[k] > 0 && GAME.dungeon.trapDmg[k] < 1, `${k} default damage`);
  assert.equal(isCycledTrap(spikes), true);
  assert.equal(isCycledTrap(crumble), false);
});

test('every event floor has a goal, a reachable exit and valid traps', () => {
  const floors = Object.entries(MAPS).filter(([, m]) => m.dungeon);
  assert.ok(floors.length >= 12);
  for (const [id, m] of floors) {
    assert.ok(['clear', 'reach', 'boss', 'break'].includes(m.goal), `${id} goal`);
    assert.ok(m.noRespawn, `${id} monsters do not respawn`);
    assert.ok(m.exit && m.exit.x > 0 && m.exit.x < m.width, `${id} exit`);
    assert.ok(m.exit.y === GROUND_Y || m.platforms.some((p) => p.y === m.exit.y && m.exit.x >= p.x && m.exit.x <= p.x + p.w), `${id} exit stands on something`);
    const mobs = new Set((m.spawns || []).map((s) => s.mob));
    for (const mob of mobs) assert.ok(MONSTERS[mob], `${id} spawns ${mob}`);
    if (m.goal === 'break') {
      assert.ok(m.targets?.length, `${id} break targets`);
      for (const t of m.targets) assert.ok(mobs.has(t), `${id} spawns its target ${t}`);
    }
    if (m.goal === 'boss') assert.ok([...mobs].some((x) => MONSTERS[x].boss), `${id} has a boss`);
    if (m.goal === 'clear') assert.ok(mobs.size > 0, `${id} has monsters to clear`);
    for (const tr of m.traps || []) {
      assert.ok(KINDS.includes(tr.kind), `${id} trap kind ${tr.kind}`);
      assert.ok(tr.x >= 0 && tr.x + tr.w <= m.width, `${id} ${tr.kind} inside the map`);
      if (tr.kind !== 'pit') assert.ok(tr.period > 0, `${id} ${tr.kind} period`);
      if (isCycledTrap(tr)) assert.ok(tr.up > 0 && tr.up + W < tr.period, `${id} ${tr.kind} leaves a safe window`);
      if (tr.kind === 'crumble') assert.ok(tr.solid > CW && tr.solid < tr.period, `${id} crumble timing`);
      if (tr.kind === 'drop') assert.ok(tr.fall > 0 && tr.fall + W < tr.period, `${id} rock timing`);
      if (tr.dmg !== undefined) assert.ok(tr.dmg > 0 && tr.dmg < 1, `${id} ${tr.kind} never kills outright`);
    }
  }
});

test('the teeth room keeps every fourth gate safe', () => {
  const teeth = MAPS.yg_teeth.traps.filter((t) => t.kind === 'teeth');
  const gates = new Set(teeth.map((t) => Math.round((t.x - 200) / 125)));
  for (const safe of [3, 7, 11]) assert.ok(!gates.has(safe), `gate ${safe} is safe`);
});
