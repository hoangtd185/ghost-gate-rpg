// Shared monsters on the server: the server computes damage from the skill that hit (the client sends no number),
// hit checks, and who gets what when a monster dies (EXP by damage share, a party splits its share evenly,
// items and gold to the group that did the most damage).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createMobs, statsOf } from '../../server/src/mobs.js';
import { newCharacter } from '../../client/src/game/character.js';
import { killExp } from '../../client/src/game/loot.js';
import { hitDamage, skillMult, skillElement } from '../../client/src/game/combat.js';

const sent = [];
const players = new Map();
const partyOf = new Map(); // charId -> { id, members: Set }
function session(id, lv = 5) {
  const ch = { ...newCharacter('P' + id, 'swordsman'), id, level: lv };
  ch.skills = { ...ch.skills, sw_combo: 1 }; // the test skill: 3 hits × 5 targets per cast, so many hits are allowed
  const s = { id, name: 'P' + id, ch, buffs: [], stats: null, map: 'forest', x: 0, y: 250, vx: 0, f: 1, g: 1, sy: 296, dead: false,
    ws: { readyState: 1, send: (data) => sent.push({ to: id, ...JSON.parse(data) }) } };
  players.set(id, s);
  return s;
}
const send = (s, msg) => sent.push({ to: s.id, ...msg });
const loot = { give: (s) => [{ id: 'd-' + s.id, it: { id: 'stone', qty: 1, r: 0, b: {} }, x: 0, y: 0 }] };
const parties = { partyOf: (id) => partyOf.get(id) || null };
let mobs, A, B, C;

// a fresh, plain monster at a known spot, with enough HP for the shares to be measurable
function target(hp = 100) {
  const sim = mobs.sim('forest');
  const pick = () => sim.monsters.find((x) => !x.dead && !x.def.boss && !x.named);
  for (let i = 0; i < 20 && !pick(); i++) sim.update(5, []); // let spawn and respawn timers run
  const m = pick();
  m.hp = m.maxHp = hp; m.shield = m.maxShield = 0; m.affix = new Set(); m.dmgBy.clear();
  for (const s of players.values()) s.x = Math.round(m.cx) - 7;
  return m;
}
const kills = (uid) => sent.filter((x) => x.t === 'mkill' && x.uid === uid);
// Fixed randomness: no crits, the ±15% roll lands in the middle, so every hit is the same number
const realRandom = Math.random;
const fixed = () => { Math.random = () => 0.5; };
// what one combo hit of a test player does to monster m
const oneHit = (s, m, sid = 'sw_combo') => { fixed(); const st = statsOf(s); return hitDamage(st, skillMult(s.ch, sid), m.def, skillElement(sid, st)).dmg; };
const hit = (s, m, n = 1, sid = 'sw_combo') => { fixed(); for (let i = 0; i < n; i++) mobs.hit(s, { uid: m.uid, sid }); };

before(() => {
  mobs = createMobs({ players, send, loot, parties });
  A = session('a', 5); B = session('b', 5); C = session('c', 5);
  mobs.enter(A, 'forest');
});
after(() => { mobs.close(); Math.random = realRandom; });

describe('shared monsters', () => {
  it('a player entering a map gets its monster list', () => {
    const list = sent.find((x) => x.t === 'mobs' && x.to === 'a');
    assert.ok(list && list.list.length > 0);
  });

  it('the damage comes from the server: a number sent by the client is ignored', () => {
    const m = target(10000);
    const d = oneHit(A, m);
    fixed(); mobs.hit(A, { uid: m.uid, sid: 'sw_combo', dmg: 1e9 });
    assert.equal(m.hp, 10000 - d);
    const told = sent.filter((x) => x.t === 'mhit' && x.uid === m.uid);
    assert.deepEqual(told.map((x) => x.to).sort(), ['a', 'b', 'c'], 'everyone on the map sees the number');
    assert.equal(told[0].dmg, d);
  });

  it('a skill the character has not learned, or from another class, does nothing', () => {
    const m = target(10000);
    hit(A, m, 1, 'sw_wave'); hit(A, m, 1, 'ta_fire');
    assert.equal(m.hp, 10000);
  });

  it('a hit beyond the skill\'s reach is ignored', () => {
    const m = target(10000);
    A.x = m.cx + 2000;
    hit(A, m);
    assert.equal(m.hp, 10000);
  });

  it('each skill can only hit so often (hits per cast and cooldown)', () => {
    const m = target(100000);
    hit(B, m, 6, 'sw_basic'); // 1 hit per cast: only a couple at once
    const d = oneHit(B, m, 'sw_basic');
    assert.equal(m.hp, 100000 - 2 * d);
  });

  it('a buff skill raises the damage while it lasts', () => {
    C.ch.skills.sw_guard = 1;
    const m = target(100000);
    const before = oneHit(C, m);
    mobs.cast(C, { sid: 'sw_guard' });
    const after = oneHit(C, m);
    assert.ok(after > before, `${before} -> ${after}`);
    mobs.cast(C, { sid: 'sw_guard' }); // again during the cooldown: ignored
    assert.equal(C.buffs.length, 1);
    C.buffs = []; C.stats = null; delete C.ch.skills.sw_guard;
  });

  it('alone: all the EXP, the gold and the drops', () => {
    const m = target(1);
    m.hp = m.maxHp = oneHit(A, m) * 2;
    hit(A, m, 2);
    const k = kills(m.uid);
    assert.equal(k.length, 1);
    assert.equal(k[0].to, 'a');
    assert.equal(k[0].exp, killExp(m.def.exp, 5, m.def.lv));
    assert.ok(k[0].gold >= 0 && k[0].drops.length === 1);
  });

  it('no party: EXP by damage share, loot only for the top damager', () => {
    const m = target(1);
    m.hp = m.maxHp = oneHit(A, m) * 4;
    hit(B, m, 1);
    hit(A, m, 3);
    const k = Object.fromEntries(kills(m.uid).map((x) => [x.to, x]));
    assert.equal(k.a.exp, killExp(m.def.exp * 0.75, 5, m.def.lv));
    assert.equal(k.b.exp, killExp(m.def.exp * 0.25, 5, m.def.lv));
    assert.ok(k.a.drops && k.a.gold !== undefined, 'top damager gets the loot');
    assert.equal(k.b.drops, undefined, 'the other one does not');
    assert.equal(k.c, undefined, 'a player who did nothing gets nothing');
  });

  it('party: EXP split evenly between members on the map, each gets their own drops', () => {
    const pt = { id: 'p1', members: new Set(['a', 'b']) };
    partyOf.set('a', pt); partyOf.set('b', pt);
    const m = target(1);
    m.hp = m.maxHp = oneHit(A, m) * 2;
    hit(A, m, 2); // B did nothing, but is in A's party on the same map
    const k = Object.fromEntries(kills(m.uid).map((x) => [x.to, x]));
    assert.equal(k.a.exp, k.b.exp);
    assert.equal(k.a.exp, killExp(m.def.exp / 2, 5, m.def.lv));
    assert.ok(k.a.drops.length === 1 && k.b.drops.length === 1, 'personal drops for each member');
    assert.notEqual(k.a.drops[0].id, k.b.drops[0].id);
  });

  it('party vs a solo player: shares by damage, loot to the party (each member)', () => {
    const m = target(1);
    m.hp = m.maxHp = oneHit(A, m) * 5;
    hit(C, m, 2);
    hit(A, m, 2);
    hit(B, m, 1); // party 3 hits > C 2 hits
    const k = Object.fromEntries(kills(m.uid).map((x) => [x.to, x]));
    assert.equal(k.c.exp, killExp(m.def.exp * 0.4, 5, m.def.lv));
    assert.equal(k.a.exp, killExp(m.def.exp * 0.3, 5, m.def.lv));
    assert.ok(k.a.drops && k.b.drops && !k.c.drops);
  });

  it('a party member on another map gets nothing', () => {
    B.map = 'village';
    const m = target(1);
    m.hp = m.maxHp = oneHit(A, m);
    hit(A, m, 1);
    const k = kills(m.uid);
    assert.deepEqual(k.map((x) => x.to), ['a']);
    assert.equal(k[0].exp, killExp(m.def.exp, 5, m.def.lv));
    B.map = 'forest'; partyOf.clear();
  });

  it('level gap lowers EXP for the stronger player', () => {
    const m = target(1);
    m.hp = m.maxHp = oneHit(A, m) * 2;
    C.ch.level = m.def.lv + 12;
    hit(A, m, 1); hit(C, m, 1);
    const k = Object.fromEntries(kills(m.uid).map((x) => [x.to, x]));
    assert.ok(k.c.exp < k.a.exp);
    C.ch.level = 5;
  });

  it('everyone on the map is told the monster died', () => {
    const m = target(1);
    hit(A, m, 1);
    const told = sent.filter((x) => x.t === 'mdie' && x.uid === m.uid).map((x) => x.to).sort();
    assert.deepEqual(told, ['a', 'b', 'c']);
  });
});
