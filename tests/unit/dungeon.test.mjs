// Server event Xâm Lăng Dương Ác: the schedule (Saturday and Sunday 15:00 UTC+7), warnings, one run for the whole
// server, no skipping floors, exits that open only when the floor's goal is met, the live damage ranking, and the
// rewards (everyone who took part, more on a win, more for the top 10 by damage). Also: separate monsters per room.
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDungeons } from '../../server/src/dungeon.js';
import { createMobs } from '../../server/src/mobs.js';
import { DUNGEONS, rollFloors, rankTier, eventWindow, dungeonFloors } from '../../shared/data/dungeons.js';
import { MAPS, GROUND_Y } from '../../shared/data/maps.js';
import { MONSTERS } from '../../shared/data/monsters.js';
import { GAME } from '../../shared/config.js';

const D = DUNGEONS.yangak, S = GAME.dungeon.schedule;
const KEEPER_X = MAPS[D.from].npcs.find((n) => n.id === D.npc).x;
const SAT = Date.UTC(2026, 10, 14, 8); // Saturday 14 Nov 2026, 15:00 in Vietnam (UTC+7)
const MIN = 60e3;

describe('event schedule', () => {
  it('opens on Saturday and Sunday at 15:00 Vietnam time for the configured duration', () => {
    assert.deepEqual([S.days, S.hour, S.minute, S.utcOffset], [[6, 0], 15, 0, 7]);
    const wed = eventWindow(SAT - 3 * 24 * 60 * MIN, S);
    assert.deepEqual(wed, { start: SAT, end: SAT + S.durationMin * MIN, open: false }, 'from Wednesday the next one is Saturday');
    assert.equal(eventWindow(SAT + 5 * MIN, S).open, true);
    assert.equal(eventWindow(SAT + 5 * MIN, S).start, SAT);
    const sun = eventWindow(SAT + S.durationMin * MIN + 1, S);
    assert.equal(sun.start, SAT + 24 * 60 * MIN, 'after Saturday’s window: Sunday');
    const next = eventWindow(sun.end + 1, S);
    assert.equal(new Date(next.start + 7 * 3600e3).getUTCDay(), 6, 'after Sunday: the next Saturday');
    assert.equal(next.start - SAT, 7 * 24 * 60 * MIN);
  });

  it('a run is 3 floors of phase 1 (the jump first), the gate, 3 floors of phase 2, the giants and the Silver Guard', () => {
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 20; i++) {
      const f = rollFloors(D, rnd);
      assert.equal(f.length, 9);
      assert.equal(f[0], 'yg_jump');
      assert.equal(f[3], 'yg_gate');
      assert.deepEqual(f.slice(-2), ['yg_giants', 'yg_silver']);
      assert.equal(new Set(f).size, 9, 'no floor twice');
      assert.ok(f.slice(4, 7).every((x) => D.phases[2].pool.includes(x)));
    }
    assert.equal(dungeonFloors(D).length, 12);
    assert.ok(MONSTERS.yg_silver.final, 'the Silver Guard ends the run');
  });

  it('reward tiers: 1st, 2nd–3rd, 4th–10th, nothing extra after', () => {
    assert.equal(rankTier(D, 1).upTo, 1);
    assert.equal(rankTier(D, 2).upTo, 3);
    assert.equal(rankTier(D, 10).upTo, 10);
    assert.equal(rankTier(D, 11), null);
  });
});

// A test server: a fake clock, players, a database that records grants
function setup(opts = {}) {
  let t = opts.t ?? SAT - 10 * MIN;
  const sent = [], all = [], grants = [], pushed = [], players = new Map();
  let clear = () => false;
  const db = { grantItems: (reqs) => grants.push(...reqs), getCharacter: () => ({ cls: 'swordsman' }) };
  const dg = createDungeons({ players, send: (s, m) => sent.push({ to: s.id, ...m }), toAll: (m) => all.push(m), cleared: (room, targets) => clear(room, targets),
    db, pushChanges: (s) => pushed.push(s.id), now: () => t, ...opts });
  const session = (id, lv = 20) => {
    const s = { id, name: id, ch: { level: lv, cls: 'swordsman' }, map: D.from, room: D.from, x: KEEPER_X - 7, sy: GROUND_Y, dungeon: null };
    players.set(id, s);
    return s;
  };
  const last = (id) => sent.filter((m) => m.to === id).at(-1);
  const call = (s, type, m = {}) => { s.dgAt = 0; dg.handle(s, { t: type, ...m }); return last(s.id); };
  const arrive = (s, map) => { s.map = map; s.room = dg.room(s, map); };
  const atExit = (s) => { const ex = MAPS[s.map].exit; s.x = ex.x - 7; s.sy = ex.y; };
  return { dg, sent, all, grants, pushed, players, session, last, call, arrive, atExit,
    set: (x) => { t = x; }, at: () => t, setClear: (f) => { clear = f; } };
}

describe('the event on the server', () => {
  const T = setup();
  after(() => T.dg.close());
  const sys = () => T.all.filter((m) => m.t === 'chat' && m.id === 'sys').map((m) => m.text);

  it('closed before its time: the keeper turns players away; clients learn when it opens', () => {
    T.dg.tick();
    const a = T.session('a');
    assert.equal(T.call(a, 'dg_enter', { d: 'yangak' }).why, 'closed');
    const st = T.dg.stateFor()[0];
    assert.deepEqual([st.t, st.open, st.start], ['ev_state', false, SAT]);
  });

  it('warns the whole server 5 and 1 minutes before, once each', () => {
    T.set(SAT - 5 * MIN); T.dg.tick(); T.dg.tick();
    T.set(SAT - 1 * MIN); T.dg.tick();
    const w = sys();
    assert.equal(w.length, 2);
    assert.ok(w[0].includes('5 phút') && w[1].includes('1 phút'));
  });

  it('opens at 15:00 for everyone', () => {
    T.set(SAT); T.dg.tick();
    assert.ok(T.dg.run('yangak'), 'a run started');
    assert.ok(sys().at(-1).includes('đã mở'));
    const st = T.all.filter((m) => m.t === 'ev_state').at(-1);
    assert.deepEqual([st.open, st.start, st.end], [true, SAT, SAT + S.durationMin * MIN]);
  });

  it('the keeper checks distance and level', () => {
    const far = T.session('far'); far.x = 100;
    assert.equal(T.call(far, 'dg_enter', { d: 'yangak' }).why, 'far');
    assert.equal(T.call(T.session('low', D.lv - 1), 'dg_enter', { d: 'yangak' }).why, 'level');
    assert.equal(T.call(T.session('nod'), 'dg_enter', { d: 'nope' }).why, 'unknown');
  });

  it('every player joins the same run, with one clock per floor', () => {
    const ga = T.call(T.players.get('a'), 'dg_enter', { d: 'yangak' });
    const gb = T.call(T.session('b'), 'dg_enter', { d: 'yangak' });
    const gc = T.call(T.session('c'), 'dg_enter', { d: 'yangak' });
    assert.equal(ga.map, 'yg_jump');
    assert.equal(ga.inst, gb.inst); assert.equal(gb.inst, gc.inst);
    assert.equal(ga.t0, gc.t0);
    assert.deepEqual(ga.floors, T.dg.run('yangak').floors);
    for (const id of ['a', 'b', 'c']) T.arrive(T.players.get(id), 'yg_jump');
    assert.equal(T.players.get('a').room, `yg_jump#${ga.inst}`);
    assert.equal(T.players.get('a').room, T.players.get('c').room);
  });

  it('no skipping ahead', () => {
    const a = T.players.get('a'), f = T.dg.run('yangak').floors;
    assert.equal(T.dg.allows(a, f[0]), true);
    assert.equal(T.dg.allows(a, f[1]), false);
    assert.equal(T.dg.allows(T.session('outsider'), f[0]), false);
    assert.equal(T.dg.allows(a, 'forest'), true);
  });

  it('exits: at the gate, and only once the floor’s goal is met (break floors count only their targets)', () => {
    const run = T.dg.run('yangak'), a = T.players.get('a');
    a.x = 100;
    assert.equal(T.call(a, 'dg_next').why, 'exit');
    T.atExit(a);
    assert.equal(T.call(a, 'dg_next').map, run.floors[1], 'the jump floor only needs the exit');
    T.arrive(a, run.floors[1]); T.atExit(a);
    const goal = MAPS[run.floors[1]].goal;
    let asked = null;
    T.setClear((room, targets) => { asked = targets; return false; });
    if (goal !== 'reach') {
      assert.equal(T.call(a, 'dg_next').why, 'not_clear');
      assert.deepEqual(asked, goal === 'break' ? MAPS[run.floors[1]].targets : null);
    }
    T.setClear(() => true);
    assert.equal(T.call(a, 'dg_next').map, run.floors[2]);
    assert.equal(T.dg.allows(T.players.get('b'), run.floors[2]), true, 'the others may follow');
  });

  it('a late player starts at the highest floor reached', () => {
    const run = T.dg.run('yangak');
    assert.equal(T.call(T.session('late'), 'dg_enter', { d: 'yangak' }).map, run.floors[2]);
  });

  it('damage to the event’s monsters is ranked; players inside get the live top 10', () => {
    const [a, b, c] = ['a', 'b', 'c'].map((id) => T.players.get(id));
    T.dg.onDamage(a, 500); T.dg.onDamage(b, 900); T.dg.onDamage(a, 600); T.dg.onDamage(c, 0);
    T.dg.onDamage(T.session('nobody'), 9999); // not in the run: does not count
    T.set(SAT + 10e3); T.dg.tick();
    const r = T.last('a');
    assert.equal(r.t, 'ev_rank');
    assert.deepEqual(r.top.map((x) => x.name), ['a', 'b']);
    assert.deepEqual([r.rank, r.dmg], [1, 1100]);
    assert.deepEqual([T.last('c').rank, T.last('c').dmg], [0, 0], 'no damage, no place');
  });

  it('the Silver Guard’s death ends the run as a victory: everyone is rewarded, the best get more', () => {
    const run = T.dg.run('yangak');
    T.players.delete('late'); // went offline: still rewarded, in their bag on the next login
    T.dg.onDie(`yg_silver#${run.id}`, { def: { final: false } });
    assert.ok(T.dg.run('yangak'), 'another monster does not end it');
    T.dg.onDie(`yg_silver#${run.id}`, { def: MONSTERS.yg_silver });
    assert.equal(T.dg.run('yangak'), null, 'over');
    const per = (id) => T.grants.filter((g) => g.charId === id);
    const n = (list) => list.length;
    const base = n(D.rewards.all.items) + n(D.rewards.win.items);
    assert.equal(per('a').length, base + n(rankTier(D, 1).items), '1st place');
    assert.equal(per('b').length, base + n(rankTier(D, 2).items), '2nd place');
    assert.equal(per('c').length, base, 'took part without damage');
    assert.equal(per('late').length, base, 'offline participants too');
    assert.ok(per('a').some((g) => g.item.id === 'out_black_dragon'), 'the top damage dealer gets the outfit');
    assert.ok(T.grants.every((g) => g.opts.reason === 'event' && g.opts.reqId.startsWith(`ev:${run.id}:${g.charId}:`)), 'idempotent request ids');
    assert.equal(new Set(T.grants.map((g) => g.opts.reqId)).size, T.grants.length);
    const end = T.sent.find((m) => m.to === 'a' && m.t === 'ev_end');
    assert.deepEqual([end.win, end.rank, end.dmg], [true, 1, 1100]);
    assert.ok(end.exp > 0 && end.items.length === per('a').length);
    assert.ok(T.pushed.includes('a') && !T.pushed.includes('late'));
    assert.deepEqual([T.last('a').t, T.last('a').closed, T.last('a').map], ['dg_go', true, D.from], 'sent back to the keeper');
    assert.equal(T.players.get('a').dungeon, null);
    assert.ok(sys().at(-1).includes('đánh bại'));
  });

  it('no second run in the same window', () => {
    T.set(SAT + 12 * MIN); T.dg.tick();
    assert.equal(T.dg.run('yangak'), null);
    const a = T.players.get('a');
    T.arrive(a, D.from); a.x = KEEPER_X - 7;
    assert.equal(T.call(a, 'dg_enter', { d: 'yangak' }).why, 'closed');
  });
});

describe('the event runs out of time', () => {
  const T = setup({ t: SAT, alwaysOpen: true, runSec: 60 });
  after(() => T.dg.close());

  it('ends as a loss after its time; participants still get the base reward', () => {
    T.dg.tick();
    assert.equal(T.dg.run('yangak'), null, 'no run until someone enters');
    const a = T.session('a');
    assert.equal(T.call(a, 'dg_enter', { d: 'yangak' }).map, 'yg_jump');
    T.dg.onDamage(a, 50);
    T.set(SAT + 61e3); T.dg.tick();
    const end = T.sent.find((m) => m.t === 'ev_end');
    assert.deepEqual([end.win, end.rank], [false, 1]);
    assert.equal(T.grants.length, D.rewards.all.items.length + rankTier(D, 1).items.length, 'no win bonus');
    assert.ok(end.exp > 0);
  });

  it('with alwaysOpen the next run starts when someone enters (local play, tests)', () => {
    T.dg.tick();
    assert.equal(T.dg.run('yangak'), null);
    const a = T.players.get('a');
    T.arrive(a, D.from); a.x = KEEPER_X - 7;
    assert.equal(T.call(a, 'dg_enter', { d: 'yangak' }).map, 'yg_jump');
    assert.equal(T.dg.run('yangak').start, T.at());
  });

  it('a client left on a floor after the run is sent home, not too often', () => {
    const ghost = T.session('ghost');
    const before = T.sent.length;
    T.dg.sendHome(ghost, 'yg_gate'); T.dg.sendHome(ghost, 'yg_gate');
    const homes = T.sent.slice(before).filter((m) => m.lost);
    assert.equal(homes.length, 1);
    assert.equal(homes[0].map, D.from);
  });
});

describe('monsters per room', () => {
  const ws = { readyState: 1, send: () => {} };
  const roomPlayers = new Map();
  const mobs = createMobs({ players: roomPlayers, send: () => {}, loot: { give: () => [] }, parties: { partyOf: () => null } });
  after(() => mobs.close());

  it('two rooms of the same floor have separate monsters; monsters do not respawn on event floors', () => {
    const F = 'yg_white';
    const a = { id: 'ra', map: F, room: F + '#x', ws }, b = { id: 'rb', map: F, room: F + '#y', ws };
    roomPlayers.set(a.id, a); roomPlayers.set(b.id, b);
    mobs.enter(a, F); mobs.enter(b, F);
    const sa = mobs.sim(a.room), sb = mobs.sim(b.room);
    assert.ok(sa && sb && sa !== sb);
    sa.update(1, []); sb.update(1, []);
    assert.equal(mobs.cleared(a.room), false, 'monsters alive');
    for (const m of [...sa.monsters]) sa.kill(m, null);
    assert.equal(mobs.cleared(a.room), true);
    sa.update(30, []);
    assert.equal(mobs.cleared(a.room), true, 'no respawn');
    assert.equal(mobs.cleared(b.room), false, 'the other room still has its monsters');
    assert.equal(mobs.cleared('nobody#room'), false, 'a floor nobody started is not cleared');
  });

  it('a break floor opens when its targets are gone, even if other monsters live', () => {
    const F = 'yg_door', s = { id: 'rd', map: F, room: F + '#z', ws };
    roomPlayers.set(s.id, s);
    mobs.enter(s, F);
    const sim = mobs.sim(s.room);
    sim.update(1, []);
    assert.equal(mobs.cleared(s.room, ['yg_door']), false);
    for (const m of sim.monsters.filter((m) => m.id === 'yg_door')) sim.kill(m, null);
    assert.equal(mobs.cleared(s.room, ['yg_door']), true);
    assert.equal(mobs.cleared(s.room), false, 'the dust is still there');
  });
});
