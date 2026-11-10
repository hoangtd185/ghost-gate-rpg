// Server events (data/dungeons.js), in the style of Ghost Online's Invasion of Yangak. At the scheduled times
// (GAME.dungeon.schedule, UTC+7) the event opens for the whole server: one run, every player who joins at the keeper
// is in it, floor after floor (random floors from the event's pools) up to the final boss. Each floor of the run is a
// room (`<map>#<run>`), so everyone in the run shares its monsters (mobs.js) and sees each other.
// The server: opens and closes the event, warns before it opens (world chat), lets players in, checks each exit (the
// floor's goal is met and the player stands at the gate), never lets anyone skip ahead, keeps each floor's clock
// start (traps run in step), counts every player's damage to the event's monsters, sends the live top 10, and when the
// final boss dies or time runs out gives every participant their reward (items committed with a ledger row, EXP).
//   dg_enter { d }  at the keeper -> dg_go { inst, d, floors, map, floor, t0, now } (the highest floor reached)
//   dg_next {}      at a floor's exit -> dg_go for the next floor
//   -> ev_state { open, start, end, now } (on connect, when it opens/closes) · ev_rank { top, rank, dmg, end, now }
//   -> ev_end { win, top, rank, dmg, items, exp } then dg_go { map: from, x, closed: true } for those still inside
//   errors dg_err { why: far | level | closed | not_clear | exit | none | unknown }
import crypto from 'node:crypto';
import { DUNGEONS, rollFloors, rankTier, eventWindow } from '../../client/src/data/dungeons.js';
import { MAPS } from '../../client/src/data/maps.js';
import { GAME } from '../../client/src/config.js';
import { expToNext } from '../../client/src/game/character.js';
import { rewardEntries } from '../../client/src/game/loot.js';

const D = GAME.dungeon;
const keeperX = (d) => (MAPS[d.from].npcs || []).find((n) => n.id === d.npc)?.x ?? MAPS[d.from].spawnX;
const sys = (text) => ({ t: 'chat', ch: 'world', id: 'sys', from: 'Hệ thống', text });

// opts.alwaysOpen: the event is open all the time, a run starts when someone enters (tests, local play) ·
// opts.runSec: a run lasts this long instead
// of until the window closes (tests)
export function createDungeons({ players, send, toAll, cleared, db, pushChanges, alwaysOpen = false, runSec = 0, now = () => Date.now() }) {
  const runs = new Map(); // dungeon id -> the current run
  const byId = new Map(); // run id -> run
  const announced = new Set(); // `${window start}:${minutes}` warnings already sent
  const finishedAt = new Map(); // dungeon id -> the window start of the last finished run (no second run in it)
  const err = (s, why) => send(s, { t: 'dg_err', why });
  const inside = (run) => [...players.values()].filter((s) => s.dungeon === run.id);

  function windowOf(id, t) {
    const run = runs.get(id);
    if (alwaysOpen) return { start: run?.start ?? t, end: run?.end ?? t + (runSec || D.schedule.durationMin * 60) * 1000, open: true };
    return eventWindow(t, D.schedule);
  }

  function startRun(id, win, t) {
    const d = DUNGEONS[id];
    const run = { id: crypto.randomBytes(5).toString('hex'), d: id, floors: rollFloors(d), reached: 0, t0: {}, members: new Set(),
      joined: new Map(), dmg: new Map(), start: t, end: runSec ? t + runSec * 1000 : win.end, done: false, winStart: win.start };
    runs.set(id, run); byId.set(run.id, run);
    toAll(sys(`${d.name} đã mở! Gặp Thủ Ải ở ${MAPS[d.from].name} để tham gia (cấp ${d.lv}+).`));
    toAll({ t: 'ev_state', d: id, open: true, start: run.start, end: run.end, now: t });
    return run;
  }

  // Send a player to floor i of the run (the clock of a floor starts when its first player arrives)
  function go(s, run, i) {
    const map = run.floors[i];
    run.reached = Math.max(run.reached, i);
    run.t0[map] ??= now();
    run.members.add(s.id);
    if (!run.joined.has(s.id)) run.joined.set(s.id, { name: s.name });
    s.dungeon = run.id;
    send(s, { t: 'dg_go', inst: run.id, d: run.d, floors: run.floors, map, floor: i, t0: run.t0[map], now: now() });
  }

  function ranking(run) {
    return [...run.dmg.entries()].sort((a, b) => b[1] - a[1]).map(([id, dmg]) => ({ id, name: run.joined.get(id)?.name || '?', dmg }));
  }

  // The run is over: everyone who took part gets a reward (win or lose), the top N by damage get more
  function finish(run, win) {
    if (run.done) return;
    run.done = true;
    runs.delete(run.d); byId.delete(run.id);
    finishedAt.set(run.d, run.winStart);
    const d = DUNGEONS[run.d], R = d.rewards, rank = ranking(run), top = rank.slice(0, D.topN);
    const reqs = [], per = new Map();
    for (const [charId] of run.joined) {
      const s = players.get(charId);
      const place = rank.findIndex((r) => r.id === charId) + 1; // 0 = dealt no damage
      const tier = place > 0 && place <= D.topN ? rankTier(d, place) : null;
      const list = [...R.all.items, ...(win ? R.win.items : []), ...(tier ? tier.items : [])];
      const cls = s?.ch?.cls || db.getCharacter(charId)?.cls || 'swordsman';
      const items = rewardEntries(list, cls);
      items.forEach((item, i) => reqs.push({ charId, item, opts: { reason: 'event', ref: run.id, reqId: `ev:${run.id}:${charId}:${i}` } }));
      per.set(charId, { place, items, share: R.all.expShare + (win ? R.win.expShare : 0) });
    }
    try { if (reqs.length) db.grantItems(reqs); } catch (e) { console.error('event rewards failed', e); }
    const topView = top.map(({ name, dmg }) => ({ name, dmg }));
    for (const [charId, r] of per) {
      const s = players.get(charId);
      if (!s) continue; // offline: the items are in their bag, the change replay brings them on the next login
      pushChanges(s);
      send(s, { t: 'ev_end', d: run.d, win, top: topView, rank: r.place, dmg: run.dmg.get(charId) || 0, items: r.items.map((e) => [e.id, e.qty]), exp: Math.round(expToNext(s.ch?.level || 1) * r.share) });
      if (s.dungeon === run.id) { s.dungeon = null; send(s, { t: 'dg_go', map: d.from, x: keeperX(d), closed: true }); }
    }
    toAll(sys(win ? `${d.name}: Ngân Vệ Tướng đã bị đánh bại!${top[0] ? ` Sát thương cao nhất: ${top[0].name}.` : ''}` : `${d.name} đã kết thúc. Quỷ Thành vẫn đứng vững…`));
    toAll({ t: 'ev_state', d: run.d, open: false, now: now() });
  }

  // Every second: warnings before the event, opening, closing at the end of its time, the live ranking
  let rankT = 0;
  function tick(t = now()) {
    for (const id of Object.keys(DUNGEONS)) {
      const win = windowOf(id, t);
      let run = runs.get(id);
      if (!win) continue;
      if (!win.open && !alwaysOpen) {
        for (const m of D.announceMin) {
          const key = `${win.start}:${m}`;
          if (win.start - t <= m * 60e3 && !announced.has(key)) { announced.add(key); toAll(sys(`${DUNGEONS[id].name} sẽ mở sau ${m} phút! Gặp Thủ Ải ở ${MAPS[DUNGEONS[id].from].name}.`)); }
        }
      }
      if (win.open && !run && !alwaysOpen && finishedAt.get(id) !== win.start) run = startRun(id, win, t);
      if (run && t >= run.end) finish(run, false);
    }
    if (t - rankT >= D.rankEverySec * 1000) {
      rankT = t;
      for (const run of runs.values()) {
        const rank = ranking(run), top = rank.slice(0, D.topN).map(({ name, dmg }) => ({ name, dmg }));
        for (const s of inside(run)) {
          const i = rank.findIndex((r) => r.id === s.id);
          send(s, { t: 'ev_rank', d: run.d, top, rank: i + 1, dmg: i >= 0 ? rank[i].dmg : 0, end: run.end, now: t });
        }
      }
    }
  }
  const timer = setInterval(() => tick(), 1000);

  function enter(s, m) {
    const d = DUNGEONS[String(m.d || '')];
    if (!d) return err(s, 'unknown');
    if (s.map !== d.from || Math.abs(s.x + 7 - keeperX(d)) > D.npcRange) return err(s, 'far');
    if ((s.ch?.level || 0) < d.lv) return err(s, 'level');
    // always open (local play, tests): a run starts when the first player comes, so its time counts from then
    const run = runs.get(String(m.d)) || (alwaysOpen ? startRun(String(m.d), windowOf(String(m.d), now()), now()) : null);
    if (!run) return err(s, 'closed');
    go(s, run, run.reached);
  }

  function next(s) {
    const run = byId.get(s.dungeon), map = MAPS[s.map];
    const i = run ? run.floors.indexOf(s.map) : -1;
    if (i < 0) return err(s, 'none');
    if (Math.abs(s.x + 7 - map.exit.x) > D.exitRange || Math.abs((s.sy ?? 0) - map.exit.y) > 8) return err(s, 'exit');
    if (map.goal !== 'reach' && !cleared(s.room, map.goal === 'break' ? map.targets : null)) return err(s, 'not_clear');
    if (i < run.floors.length - 1) return go(s, run, i + 1);
    finish(run, true); // the last floor's exit after its boss (normally the boss's death already ended it)
  }

  return {
    handle(s, m) {
      const t = now();
      if (t - (s.dgAt || 0) < D.minMsgMs) return;
      s.dgAt = t;
      if (m.t === 'dg_enter') enter(s, m);
      else if (m.t === 'dg_next') next(s);
    },

    // The room a player on `map` belongs to: a floor of their run, otherwise the map itself
    room: (s, map) => (MAPS[map]?.dungeon && s.dungeon ? `${map}#${s.dungeon}` : map),

    // May this player be on this map? Event floors only up to what the run reached.
    allows(s, map) {
      if (!MAPS[map]?.dungeon) return true;
      const run = byId.get(s.dungeon);
      const i = run ? run.floors.indexOf(map) : -1;
      return i >= 0 && i <= run.reached;
    },

    // Not allowed on an event floor: send them back (rate limited, the client keeps sending positions)
    sendHome(s, map) {
      const t = now();
      if (t - (s.dgLostAt || 0) < D.lostRetryMs) return;
      s.dgLostAt = t;
      const d = DUNGEONS[MAPS[map].dungeon];
      send(s, { t: 'dg_go', map: d.from, x: keeperX(d), lost: true });
    },

    // The player walked onto a normal map: they left the run (they keep their place in the ranking and rewards)
    left(s) {
      byId.get(s.dungeon)?.members.delete(s.id);
      s.dungeon = null;
    },

    // A reconnecting character goes back into the run it was in
    instanceOf: (charId) => [...byId.values()].find((r) => r.members.has(charId))?.id || null,

    // Damage a player dealt to a monster in their room (mobs.js): counts for the ranking while they are in a run
    onDamage(s, dealt) {
      const run = byId.get(s.dungeon);
      if (run && dealt > 0) run.dmg.set(s.id, (run.dmg.get(s.id) || 0) + dealt);
    },
    // A monster died in a room: the final boss ends the run as a victory
    onDie(room, m) {
      if (!m.def.final) return;
      const run = byId.get(String(room).split('#')[1]);
      if (run) finish(run, true);
    },

    // What a client that just connected needs to know
    stateFor() {
      return Object.keys(DUNGEONS).map((id) => {
        const t = now(), run = runs.get(id), win = windowOf(id, t);
        return { t: 'ev_state', d: id, open: !!run || alwaysOpen, start: run?.start ?? win?.start ?? null, end: run?.end ?? win?.end ?? null, now: t };
      });
    },

    tick, // tests
    run: (id) => runs.get(id) || null, // tests
    close() { clearInterval(timer); },
  };
}
