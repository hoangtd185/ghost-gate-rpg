// Personal loot (online play): drops belong to one player, nobody else sees them.
//  - Shared monsters: the server decides who gets drops when one dies (mobs.js) and calls give().
//  - Personal story bosses (simulated by the player's own client): the client reports the kill, the server checks
//    it is plausible and rolls the drops itself (kill()).
// Picking up is the only step that touches the database. Pickups go through a commit queue: requests from all
// players are collected for a few milliseconds and written in ONE transaction (one disk sync for the batch),
// and each player is answered only after that commit. The queue has a hard cap (admission control: beyond it a
// pickup is answered "busy" and the client simply tries again) and each player has a pickup rate limit.
import crypto from 'node:crypto';
import { MAPS } from '../../client/src/data/maps.js';
import { MONSTERS } from '../../client/src/data/monsters.js';
import { NAMED } from '../../client/src/data/affixes.js';
import { rollDrops } from '../../client/src/game/loot.js';
import { GAME } from '../../client/src/config.js';

const L = GAME.net.loot;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);

// Token bucket: `burst` at once, refilled at `perSec`
function bucket(burst, perSec) {
  let tokens = burst, at = Date.now();
  return () => {
    const now = Date.now();
    tokens = Math.min(burst, tokens + ((now - at) / 1000) * perSec); at = now;
    if (tokens < 1) return false;
    tokens -= 1; return true;
  };
}

export function createLoot({ db }) {
  const drops = new Map(); // charId -> Map(dropId -> { id, map, x, y, item, rare, until, pending })
  const limits = new Map(); // charId -> { kill, pick, last: { key: ms } }
  const limitsOf = (charId) => {
    if (!limits.has(charId)) limits.set(charId, { kill: bucket(L.killBurst, L.killPerSec), pick: bucket(L.pickBurst, L.pickPerSec), last: {} });
    return limits.get(charId);
  };
  const dropsOf = (charId) => { if (!drops.has(charId)) drops.set(charId, new Map()); return drops.get(charId); };
  const prune = (charId) => {
    const box = drops.get(charId), now = Date.now();
    if (!box) return;
    for (const [id, d] of box) if (d.until < now && !d.pending) box.delete(id);
  };
  const cooldown = (lim, key, sec) => {
    const now = Date.now(), last = lim.last[key];
    if (last && now - last < sec * 1000) return false;
    lim.last[key] = now; return true;
  };

  // Roll a kill's drops for one player and keep them for that player. Returns what to send: [{ id, it, rare, x, y }]
  function give(s, kill, x, y, table = null) {
    const box = dropsOf(s.id);
    prune(s.id);
    const list = [];
    for (const item of rollDrops(kill, s.ch?.cls || 'swordsman', table)) {
      const id = crypto.randomBytes(5).toString('hex');
      const { rare, ...it } = item;
      box.set(id, { id, map: s.map, x, y, item: it, rare: !!rare, until: Date.now() + (GAME.loot.dropLifeSec + L.dropGraceSec) * 1000 });
      list.push({ id, it, rare: !!rare, x, y });
    }
    while (box.size > L.maxDropsPerPlayer) box.delete(box.keys().next().value);
    return list;
  }

  // Personal story bosses only: is this reported kill plausible? Returns the reason it is not, or null.
  function checkKill(s, k) {
    const n = k.named && NAMED[k.named];
    if (!n || !n.quest) return 'shared'; // everything else is a shared monster: the server saw it die itself
    if (!MONSTERS[k.mob] || !s.map || n.map !== s.map || n.mob !== k.mob) return 'named_map';
    const q = s.ch?.quests?.[n.quest];
    if (q && q.s === 'done') return 'named_done';
    const lim = limitsOf(s.id);
    if (!cooldown(lim, 'named:' + k.named, L.storyBossCooldownSec)) return 'named_cooldown';
    if (!lim.kill()) return 'kill_rate';
    return null;
  }

  // ===== Commit queue for pickups =====
  const queue = []; // { s, d, box, done }
  let flushT = null;
  function flush() {
    flushT = null;
    const batch = queue.splice(0, L.commitBatch);
    if (!batch.length) return;
    let results;
    try {
      results = db.grantItems(batch.map((q) => ({ charId: q.s.id, item: q.d.item, opts: { reason: 'drop', ref: q.d.id, reqId: 'drop:' + q.d.id } })));
    } catch (e) {
      console.error('pickup batch failed', e);
      results = batch.map(() => ({ error: true }));
    }
    batch.forEach((q, i) => {
      const r = results[i];
      q.d.pending = false;
      if (r && (r.rev || r.dup)) { q.box.delete(q.d.id); q.done({ t: 'pick', id: q.d.id, ok: true, rev: r.rev }); }
      else q.done({ t: 'pick', id: q.d.id, ok: false, why: r && r.full ? 'full' : r === null ? 'gone' : 'busy' });
    });
    if (queue.length) flushT = setTimeout(flush, 0);
  }

  return {
    give,

    // { t:'kill', k, mob, x, y, elite, chief, named } -> drops for this player only (personal story bosses)
    kill(s, m) {
      const k = { mob: String(m.mob || ''), named: m.named ? String(m.named) : null, elite: !!m.elite, chief: !!m.chief };
      const why = checkKill(s, k);
      let list = [];
      if (!why) {
        const map = MAPS[s.map];
        list = give(s, k, clamp(num(m.x, s.x), 0, map.width), clamp(num(m.y, s.y), -200, 400));
      }
      return { t: 'loot', k: m.k, map: s.map, drops: list, ...(why ? { why } : {}) };
    },

    // Unpicked drops of this player on a map (resent after a reconnect or when coming back to the map)
    onMap(s, map) {
      prune(s.id);
      return [...(drops.get(s.id)?.values() || [])].filter((d) => d.map === map).map((d) => ({ id: d.id, it: d.item, rare: d.rare, x: d.x, y: d.y }));
    },

    // { t:'pick', id }: checks at once, commits in the next batch, then calls done(answer)
    pick(s, m, done) {
      const id = String(m.id || '');
      const box = drops.get(s.id);
      const d = box?.get(id);
      if (!d) return done({ t: 'pick', id, ok: false, why: 'gone' });
      if (d.map !== s.map || Math.abs(d.x - s.x) > L.pickRange) return done({ t: 'pick', id, ok: false, why: 'far' });
      if (d.pending) return; // already queued: its answer is on the way
      if (!limitsOf(s.id).pick() || queue.length >= L.queueMax) return done({ t: 'pick', id, ok: false, why: 'busy' });
      d.pending = true;
      queue.push({ s, d, box, done });
      if (queue.length >= L.commitBatch) { clearTimeout(flushT); flush(); }
      else if (!flushT) flushT = setTimeout(flush, L.commitMs);
    },

    // Drop expired loot (called periodically so players who left do not keep memory)
    sweep() {
      for (const charId of drops.keys()) { prune(charId); if (!drops.get(charId).size) drops.delete(charId); }
    },
    flush, // tests and shutdown
    // test helpers
    count(charId) { prune(charId); return drops.get(charId)?.size || 0; },
    queued: () => queue.length,
  };
}
