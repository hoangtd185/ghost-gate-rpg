// Shared monsters (online): one simulation per map that has players on it (client/src/game/mobsim.js, the same
// AI the offline game uses). Players see the same monsters; their hits are applied here; when a monster dies the
// server splits the reward:
//   - EXP: by damage share between "groups" (a party, or a player on their own). A party's share is split evenly
//     between its members on the map; a solo player keeps theirs. Each player's part is adjusted for level gap.
//   - Items and gold: the group that did the most damage. In a party every member on the map gets their own
//     roll (personal loot, only they see it); on their own, that player gets it.
//   - Quest credit: everyone who got EXP.
// Everything here is in memory (one Node process, one event loop: no locks needed). Only picking up an item
// touches the database (see loot.js).
import { NAMED } from '../../client/src/data/affixes.js';
import { SKILLS } from '../../client/src/data/classes.js';
import { MobSim } from '../../client/src/game/mobsim.js';
import { calcStats } from '../../client/src/game/character.js';
import { killExp } from '../../client/src/game/loot.js';
import { hitDamage, skillMult, skillElement, knowsSkill, skillReach } from '../../client/src/game/combat.js';
import { GAME } from '../../client/src/config.js';
import { randInt } from '../../client/src/engine/util.js';

const MB = GAME.net.mobs;
const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);

// The attacker's stats for the damage formula: saved character + active buffs (cached until something changes)
export function statsOf(s, now = Date.now()) {
  const before = (s.buffs || []).length;
  s.buffs = (s.buffs || []).filter((b) => b.until > now);
  if (!s.stats || s.buffs.length !== before) s.stats = calcStats(s.ch, s.buffs);
  return s.stats;
}

function bucket(burst, perSec) {
  let tokens = burst, at = Date.now();
  return () => {
    const now = Date.now();
    tokens = Math.min(burst, tokens + ((now - at) / 1000) * perSec); at = now;
    if (tokens < 1) return false;
    tokens -= 1; return true;
  };
}

// What a client needs per monster 10×/s: [uid, x, y, facing, hp, shield, state bits]
// state: 1 attacking · 2 hurt · 4 charging/winding up · 8 poisoned
const snapOf = (m) => [m.uid, Math.round(m.x), Math.round(m.y), m.facing, Math.round(m.hp), Math.round(m.shield),
  (m.attacking ? 1 : 0) | (m.hurtT > 0 ? 2 : 0) | (m.charging > 0 || m.windup > 0 ? 4 : 0) | (m.poison > 0 ? 8 : 0)];

// Events the clients need (objects replaced by uids)
function publicEvent(e) {
  const { m, by, type, ...rest } = e; // eslint-disable-line no-unused-vars
  if (type === 'shoot' || type === 'slam') return { type, ...rest, src: m ? m.uid : rest.src };
  return { type, ...rest };
}

export function createMobs({ players, send, loot, parties }) {
  const maps = new Map(); // map id -> { sim, empty (ms since nobody is there, or 0), snapT, last: Map uid -> snapshot key }
  const inMap = (map) => [...players.values()].filter((s) => s.map === map);
  const toMap = (map, msg) => { const data = JSON.stringify(msg); for (const s of inMap(map)) if (s.ws.readyState === 1) s.ws.send(data); };

  function ensure(map) {
    let e = maps.get(map);
    if (!e) {
      e = { sim: new MobSim(map, { namedT: {} }), empty: 0, snapT: 0, last: new Map() };
      e.sim.drain(); // initial spawns are sent with the map's monster list
      maps.set(map, e);
    }
    return e;
  }

  // The player as the AI sees it (from the latest position update)
  const asTarget = (s) => ({ id: s.id, x: s.x, y: s.y, w: 14, h: 32, cx: s.x + 7, cy: s.y + 16, vx: s.vx, facing: s.f, standY: s.sy || s.y + 32, onGround: !!s.g, dead: !!s.dead });

  // ===== Rewards =====
  function reward(map, m) {
    const here = inMap(map);
    const byId = new Map(here.map((s) => [s.id, s]));
    // damage per group: a party (members on this map) or a solo player
    const groups = new Map();
    let total = 0;
    for (const [id, dmg] of m.dmgBy) {
      const s = byId.get(id);
      if (!s || dmg <= 0) continue; // left the map: no share
      const pt = parties?.partyOf(id);
      const key = pt ? 'p:' + pt.id : 's:' + id;
      if (!groups.has(key)) groups.set(key, { dmg: 0, members: pt ? here.filter((o) => pt.members.has(o.id)) : [s] });
      groups.get(key).dmg += dmg; total += dmg;
    }
    if (!total) return;
    let top = null;
    for (const g of groups.values()) if (!top || g.dmg > top.dmg) top = g;
    const kill = { mob: m.id, elite: m.elite, chief: m.chief, named: m.named };
    const x = Math.round(m.cx), y = Math.round(m.cy);
    for (const g of groups.values()) {
      const share = (m.def.exp * g.dmg) / total / g.members.length;
      for (const s of g.members) {
        const msg = { t: 'mkill', uid: m.uid, mob: m.id, named: m.named, x, y, exp: killExp(share, s.ch?.level || 1, m.def.lv) };
        if (g === top) {
          msg.gold = randInt(m.def.gold[0], m.def.gold[1]);
          msg.drops = loot.give(s, kill, x, y, m.def.drops);
        }
        send(s, msg);
      }
    }
  }

  function handleEvents(map, e) {
    const out = [];
    for (const ev of e.sim.drain()) {
      if (ev.type === 'spawn') { toMap(map, { t: 'mspawn', m: ev.m.spawnInfo() }); continue; }
      if (ev.type === 'die') {
        const m = ev.m;
        let topName = null, topDmg = 0;
        for (const [id, dmg] of m.dmgBy) if (dmg > topDmg && players.get(id)) { topDmg = dmg; topName = players.get(id).name; }
        toMap(map, { t: 'mdie', uid: m.uid, by: topName });
        reward(map, m);
        continue;
      }
      out.push(publicEvent(ev));
    }
    if (out.length) toMap(map, { t: 'mev', list: out });
  }

  // ===== Loop =====
  let last = Date.now();
  const timer = setInterval(() => {
    const now = Date.now(), dt = Math.min(0.25, (now - last) / 1000); last = now;
    for (const [map, e] of maps) {
      const here = inMap(map);
      if (!here.length) {
        e.empty = e.empty || now;
        if (now - e.empty > MB.idleSec * 1000) maps.delete(map);
        continue;
      }
      e.empty = 0;
      const targets = here.map(asTarget);
      for (let i = 0; i < MB.substeps; i++) e.sim.update(dt / MB.substeps, targets);
      handleEvents(map, e);
      e.snapT -= dt;
      if (e.snapT <= 0) {
        e.snapT = 1 / MB.snapHz;
        const list = [];
        for (const m of e.sim.monsters) {
          if (m.dead) continue;
          const snap = snapOf(m), key = snap.join(',');
          if (e.last.get(m.uid) === key) continue;
          e.last.set(m.uid, key); list.push(snap);
        }
        if (e.last.size > e.sim.monsters.length * 2) for (const uid of e.last.keys()) if (!e.sim.monsters.some((m) => m.uid === uid)) e.last.delete(uid);
        if (list.length) toMap(map, { t: 'ms', s: list });
      }
    }
  }, 1000 / MB.tickHz);

  return {
    // A player arrived on a map: send all its monsters
    enter(s, map) {
      const e = ensure(map);
      send(s, { t: 'mobs', map, list: e.sim.monsters.filter((m) => !m.dead).map((m) => m.spawnInfo()) });
    },

    // { t:'hit', uid, sid }: the player's own hit detection says skill `sid` hit monster `uid`.
    // The server computes the damage itself (game/combat.js) from the saved character, buffs and the skill's level.
    hit(s, m) {
      const e = maps.get(s.map);
      const mob = e && e.sim.monsters.find((x) => x.uid === +m.uid && !x.dead);
      const sid = String(m.sid || '');
      if (!mob || !s.ch || !knowsSkill(s.ch, sid)) return;
      // per-skill rate limit: one cast can only hit so many times (hits × targets), cooldown sets the pace
      const sk = SKILLS[sid], reach = skillReach(sid);
      s.skillBuckets = s.skillBuckets || {};
      if (!s.skillBuckets[sid]) s.skillBuckets[sid] = bucket(reach.hits * 2, reach.hits / Math.max(sk.cd || 0, 0.3));
      if (!s.skillBuckets[sid]()) return;
      // the monster must be within the skill's reach (plus slack for movement and latency)
      if (Math.abs(s.x + 7 - mob.cx) > reach.range + MB.hitSlack + mob.w / 2 || Math.abs(s.y + 16 - mob.cy) > MB.hitRangeY) return;
      const st = statsOf(s);
      const el = skillElement(sid, st), mult = skillMult(s.ch, sid);
      const low = (s.hpPct ?? 100) < 35;
      const { dmg, crit, em } = hitDamage(st, mult, mob.def, el, low);
      const by = { id: s.id, player: true, cx: s.x + 7 };
      const r = e.sim.damage(mob, dmg, by);
      // a poison cloud also poisons: 2 s of ticks at 30% of the skill
      if (sk.type === 'cloud' && !mob.dead) e.sim.poisonFor(mob, 2, hitDamage(st, mult * 0.3, mob.def, 'poison', low).dmg, by);
      toMap(s.map, { t: 'mhit', uid: mob.uid, by: s.id, dmg: r.dealt, ab: r.absorbed, crit, em, el });
      handleEvents(s.map, e);
    },

    // { t:'cast', sid }: a buff skill (it changes the damage formula while it lasts)
    cast(s, m) {
      const sid = String(m.sid || ''), sk = SKILLS[sid];
      if (!s.ch || !knowsSkill(s.ch, sid) || !sk.buff) return;
      const now = Date.now();
      s.castAt = s.castAt || {};
      if (now - (s.castAt[sid] || 0) < sk.cd * 1000 * 0.9) return; // cooldown (a little slack for latency)
      s.castAt[sid] = now;
      s.buffs = (s.buffs || []).filter((b) => b.sid !== sid);
      s.buffs.push({ sid, ...sk.buff, until: now + sk.dur * 1000 });
      s.stats = null;
    },

    // test helpers
    sim: (map) => maps.get(map)?.sim || null,
    close() { clearInterval(timer); },
  };
}

// Is this named boss personal (a story boss, simulated by the player's own client)?
export const isPersonalBoss = (named) => !!(named && NAMED[named] && NAMED[named].quest);
