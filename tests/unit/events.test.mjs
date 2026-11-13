// The server event against a real database: rewards (items and EXP as ledger rows, delivered once, offline too), a bag
// that is full (the rest is kept and delivered later), a window that already ran (also after a restart), reconnecting
// into a run, and what the shared monsters keep or report for it (event floors kept for the run, poison ticks ranked).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GAME } from '../../shared/config.js';
import { DUNGEONS } from '../../shared/data/dungeons.js';
import { MONSTERS } from '../../shared/data/monsters.js';
import { MAPS, GROUND_Y } from '../../shared/data/maps.js';
import { newCharacter, expToNext } from '../../shared/rules/character.js';
import { openDb } from '../../server/src/db.js';
import { createDungeons } from '../../server/src/dungeon.js';
import { createMobs } from '../../server/src/mobs.js';

const D = DUNGEONS.yangak, R = D.rewards, MIN = 60e3;
const KEEPER_X = MAPS[D.from].npcs.find((n) => n.id === D.npc).x;
const SAT = Date.UTC(2026, 10, 14, 8); // Saturday 14 Nov 2026, 15:00 in Vietnam

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qmq-events-'));
const db = openDb(path.join(dir, 'game.db'));
after(() => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); });

let n = 0;
function character(level = 15) {
  const uid = db.createUser('ev' + ++n, 'x').id;
  return db.createCharacter(uid, { ...newCharacter('Ev' + n, 'swordsman'), level });
}

// one event server over the real database; players are plain sessions
function server(opts = {}) {
  let t = opts.t ?? SAT;
  const sent = [], players = new Map(), closed = [];
  const dg = createDungeons({ players, send: (s, m) => sent.push({ to: s.id, ...m }), toAll: () => {}, cleared: () => true, closeRooms: (id) => closed.push(id),
    db, pushChanges: (s) => sent.push({ to: s.id, t: 'pushed' }), now: () => t, ...opts });
  const join = (ch) => {
    const s = { id: ch.id, name: ch.name, ch, map: D.from, room: D.from, x: KEEPER_X - 7, sy: GROUND_Y, dungeon: null };
    players.set(ch.id, s); s.dgAt = 0;
    dg.handle(s, { t: 'dg_enter', d: 'yangak' });
    return s;
  };
  const win = () => { const run = dg.run('yangak'); dg.onDie(`yg_silver#${run.id}`, { def: MONSTERS.yg_silver }); return run; };
  return { dg, sent, players, closed, join, win, set: (x) => { t = x; } };
}
const last = (T, id, type) => T.sent.filter((m) => m.to === id && m.t === type).at(-1);

describe('rewards: items and EXP as ledger rows', () => {
  it('everyone gets them once, an offline participant at the next replay; a second finish changes nothing', () => {
    const T = server({ alwaysOpen: true });
    const a = character(15), b = character(20);
    T.join(a); const sb = T.join(b);
    T.players.delete(sb.id); // B went offline during the run
    const run = T.win();
    const expA = Math.round(expToNext(15) * (R.all.expShare + R.win.expShare));
    const expB = Math.round(expToNext(20) * (R.all.expShare + R.win.expShare));
    for (const [ch, exp] of [[a, expA], [b, expB]]) {
      const changes = db.changesSince(ch.id, 0);
      const rows = changes.filter((c) => c.kind === 'exp');
      assert.deepEqual(rows.map((c) => c.qty), [exp], 'one EXP row, from the stored level');
      assert.ok(changes.some((c) => c.kind === 'gain' && c.id === 'stone'), 'the items too');
    }
    assert.equal(last(T, a.id, 'ev_end').exp, expA);
    const before = db.ledger(a.id).length;
    T.dg.onDie(`yg_silver#${run.id}`, { def: MONSTERS.yg_silver }); // the run is over: nothing is granted again
    assert.equal(db.ledger(a.id).length, before);
    T.dg.close();
  });
});

describe('a full bag', () => {
  it('the rest of the reward is kept, ev_end says so, and it is delivered once there is room', () => {
    const T = server({ alwaysOpen: true });
    const a = character(15);
    const sa = T.join(a);
    for (let i = 0; i < GAME.player.invSize; i++) db.grantItem(a.id, { id: 'hat_cloth', qty: 1, r: 0, b: {} }, { reqId: `fill:${a.id}:${i}` });
    const run = T.win();
    // nobody dealt damage here, so there is no top-10 tier: the base and the win rewards
    const end = last(T, a.id, 'ev_end');
    assert.ok(end.queued > 0, 'some rewards did not fit');
    assert.equal(end.items.length + end.queued, R.all.items.length + R.win.items.length, 'every reward is either delivered or kept');
    assert.equal(db.pendingCount(a.id), end.queued);
    assert.equal(sa.evPending, true);
    assert.equal(T.dg.run('yangak'), null);
    // nothing changes while the bag is still full
    T.dg.claim(sa);
    assert.equal(db.pendingCount(a.id), end.queued);
    // the player makes room and saves: the server delivers what was kept
    const ch = db.getCharacter(a.id);
    ch.inventory = ch.inventory.filter((e) => e.id !== 'hat_cloth').slice(0, 5);
    db.saveCharacter(db.q.charById.get(a.id).user_id, ch);
    T.dg.claim(sa);
    const claim = last(T, a.id, 'ev_claim');
    assert.equal(claim.items.length, end.queued);
    assert.equal(db.pendingCount(a.id), 0);
    assert.equal(sa.evPending, false);
    // each reward exists once
    const stones = db.getCharacter(a.id).inventory.filter((e) => e.id === 'stone').reduce((s, e) => s + e.qty, 0);
    assert.equal(stones, R.all.items.find(([id]) => id === 'stone')[1], 'the stones of the base reward, once');
    T.dg.claim(sa);
    assert.equal(T.sent.filter((m) => m.to === a.id && m.t === 'ev_claim').length, 1, 'delivered once');
    assert.ok(run.done);
    T.dg.close();
  });

  it('queued rewards are found again after a restart (the connect check)', () => {
    const a = character(15);
    db.grantEventRewards({ items: [{ charId: a.id, item: { id: 'stone', qty: 2, r: 0, b: {} }, opts: { reason: 'event', ref: 'r0', reqId: 'ev:r0:' + a.id + ':0' } }] });
    // simulate a full bag by queueing directly
    db.q.pendingAdd.run('ev:r0:' + a.id + ':1', a.id, JSON.stringify({ id: 'hp_l', qty: 3, r: 0, b: {} }), 'r0', Date.now());
    assert.equal(db.pendingCount(a.id), 1);
    const T = server({ alwaysOpen: true });
    const s = { id: a.id, name: a.name, ch: a, map: 'village', room: 'village', dungeon: null };
    T.players.set(a.id, s);
    T.dg.onConnect(s);
    assert.equal(db.pendingCount(a.id), 0);
    assert.deepEqual(last(T, a.id, 'ev_claim').items, [['hp_l', 3]]);
    T.dg.close();
  });
});

describe('a window that already ran', () => {
  it('is saved when its run ends, and a restarted server does not open it again', () => {
    const T = server({ t: SAT + 5 * MIN });
    T.dg.tick();
    assert.ok(T.dg.run('yangak'), 'the window opened a run');
    T.dg.tick(SAT + 31 * MIN); // time is up
    assert.equal(T.dg.run('yangak'), null);
    assert.deepEqual(db.eventWindows('yangak'), [SAT]);
    T.dg.close();
    const T3 = server({ t: SAT + 29 * MIN }); // "restart": a new server over the same database, still inside the window
    T3.dg.tick();
    assert.equal(T3.dg.run('yangak'), null, 'the window was used up before the restart');
    T3.dg.close();
  });
});

describe('reconnecting into a run', () => {
  it('a character that connects again is put back on its floor; one whose run ended is not', () => {
    const T = server({ alwaysOpen: true });
    const a = character(15);
    const s1 = T.join(a);
    const run = T.dg.run('yangak');
    s1.map = run.floors[0]; s1.room = T.dg.room(s1, s1.map);
    s1.sy = MAPS[s1.map].exit.y; s1.x = MAPS[s1.map].exit.x - 7; s1.dgAt = 0;
    T.dg.handle(s1, { t: 'dg_next' }); // to floor 2
    assert.equal(run.at.get(a.id), 1);
    // the connection dropped; the new session starts like a fresh page: in the village
    const s2 = { id: a.id, name: a.name, ch: a, map: null, room: null, dungeon: T.dg.instanceOf(a.id) };
    T.players.set(a.id, s2);
    T.dg.onConnect(s2);
    const go = last(T, a.id, 'dg_go');
    assert.equal(go.map, run.floors[1], 'back on the floor it was on');
    assert.equal(go.inst, run.id);
    assert.equal(s2.dungeon, run.id);
    // after the run ended there is nothing to go back to
    T.win();
    const s3 = { id: a.id, name: a.name, ch: a, map: null, room: null, dungeon: T.dg.instanceOf(a.id) };
    T.dg.onConnect(s3);
    assert.equal(s3.dungeon, null);
    T.dg.close();
  });
});

describe('monsters of an event run', () => {
  const ws = { readyState: 1, send: () => {} };
  const roomPlayers = new Map();
  const dealt = [];
  const mobs = createMobs({ players: roomPlayers, send: () => {}, loot: { give: () => [] }, parties: { partyOf: () => null }, onDamage: (s, n) => dealt.push([s.id, n]) });
  const idle = GAME.net.mobs.idleSec;
  after(() => { mobs.close(); GAME.net.mobs.idleSec = idle; });

  it('an event floor keeps its monsters while nobody is there; a normal map does not; the run ending releases it', async () => {
    GAME.net.mobs.idleSec = 0.05;
    const a = { id: 'ra', map: 'forest', room: 'forest', ws }, b = { id: 'rb', map: 'yg_white', room: 'yg_white#r1', ws };
    roomPlayers.set(a.id, a); roomPlayers.set(b.id, b);
    mobs.enter(a, 'forest'); mobs.enter(b, 'yg_white');
    const sim = mobs.sim('yg_white#r1');
    sim.update(1, []);
    for (const m of [...sim.monsters]) sim.kill(m, null);
    assert.equal(mobs.cleared('yg_white#r1'), true);
    roomPlayers.clear();
    await new Promise((r) => setTimeout(r, 500));
    assert.equal(mobs.sim('forest'), null, 'the normal map was released');
    assert.equal(mobs.cleared('yg_white#r1'), true, 'the cleared floor is still cleared');
    mobs.closeRun('r1');
    assert.equal(mobs.sim('yg_white#r1'), null);
  });

  it('poison ticks count for the ranking too, with the same number the monster credits', () => {
    GAME.net.mobs.idleSec = idle;
    const s = { id: 'rp', map: 'yg_giants', room: 'yg_giants#r2', ws, ch: { level: 20 } };
    roomPlayers.set(s.id, s);
    mobs.enter(s, 'yg_giants');
    const sim = mobs.sim('yg_giants#r2');
    sim.update(1, []);
    const m = sim.monsters.find((x) => !x.dead);
    m.hp = m.maxHp = 1e6; m.shield = 0;
    dealt.length = 0;
    sim.poisonFor(m, 2, 7, { id: 'rp', player: true, cx: 0 });
    sim.update(0.6, []); sim.update(0.6, []);
    const sum = dealt.reduce((t, [, x]) => t + x, 0);
    assert.ok(dealt.length >= 2 && dealt.every(([id, x]) => id === 'rp' && x === 7), 'each tick was reported');
    assert.equal(sum, m.dmgBy.get('rp'), 'the ranking got exactly what dmgBy credited');
  });
});
