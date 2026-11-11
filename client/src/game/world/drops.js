// GameWorld: loot on the ground (server-rolled drops online), picking up and item changes from the server.
import { ITEMS } from '../../../../shared/data/items.js';
import { Drop } from '../entities.js';
import { stepBody } from '../../../../shared/rules/physics.js';
import { addItem, INV_SIZE } from '../../../../shared/rules/character.js';
import { rand, overlap } from '../../../../shared/util.js';
import { isRareDrop } from './helpers.js';

export const DropsWorld = {
  announceDrop(data, from) {
    const it = ITEMS[data.id];
    this.hooks.chat('Hệ thống', from ? `✦ ${it.name} rơi ra từ ${from}!` : `✦ ${it.name} rơi ra!`, 'system');
    this.hooks.toast(`✦ <b>${it.name}</b> rơi ra!`, 'rare');
  },

  // ===== Online loot (see net/realtime.js and server/src/loot.js) =====
  // Drops the server rolled for one of our kills
  serverLoot(m) {
    const from = this.kills.get(m.k);
    this.kills.delete(m.k);
    if (m.map === this.mapId) this.serverDrops(m.drops, from); // otherwise they wait on the server until we come back
  },

  // Our server drops on this map (after a kill, a reconnect, or coming back to the map)
  serverDrops(list, from) {
    for (const x of list || []) {
      if (this.drops.some((d) => d.sid === x.id) || this.pendingPicks.has(x.id)) continue;
      const d = new Drop(x.x - 6 + rand(-10, 10), x.y, 'item', x.it);
      d.sid = x.id;
      if (from === undefined) { d.vy = 0; d.t = 0.5; } // re-sent drop: already on the ground, no pop
      this.drops.push(d);
      if (x.rare && from !== undefined) this.announceDrop(x.it, from);
    }
  },

  // Answer to a pickup. On success the item itself arrives as an item change (applyChanges).
  serverPick(m) {
    const d = this.pendingPicks.get(m.id);
    this.pendingPicks.delete(m.id);
    if (m.ok || !d) return;
    if (m.why === 'gone') return; // expired, or already ours (the change replay brings it)
    d.taken = false; d.petSkip = m.why === 'full';
    if (m.why === 'busy') d.retryAt = this.time + 0.6; // the server is busy: try again shortly
    if (m.why === 'full' && !d.warned) { d.warned = true; this.hooks.toast('Túi đồ đã đầy', 'warn'); }
    this.drops.push(d);
  },

  // Apply item and gold changes made by the server (pickups, trades), oldest first. rev = the server's revision.
  applyChanges(list, rev) {
    const ch = this.ch, got = [];
    for (const c of list || []) {
      if (c.rev <= (ch.itemRev || 0)) continue;
      if (c.kind === 'gain' && c.entry) {
        const has = ch.inventory.some((e) => e.uid === c.uid) || Object.values(ch.equip).some((e) => e && e.uid === c.uid);
        if (has) continue;
        const it = ITEMS[c.entry.id];
        const stack = it && it.type !== 'equip' && ch.inventory.find((e) => e.id === c.entry.id);
        if (stack) stack.qty = Math.min(999, stack.qty + c.entry.qty); else ch.inventory.push({ ...c.entry });
        got.push(c.entry);
      } else if (c.kind === 'loss') {
        const i = ch.inventory.findIndex((e) => e.uid === c.uid);
        if (i >= 0) ch.inventory.splice(i, 1);
        for (const [slot, e] of Object.entries(ch.equip)) if (e && e.uid === c.uid) ch.equip[slot] = null;
      } else if (c.kind === 'gold') ch.gold = Math.max(0, ch.gold + c.qty);
      else if (c.kind === 'ingots') ch.ingots = Math.max(0, (ch.ingots || 0) + c.qty);
    }
    ch.itemRev = Math.max(ch.itemRev || 0, rev || 0);
    for (const e of got) this.hooks.gotItem(e);
    this.recalc();
    this.hooks.changed('inv');
    this.hooks.save(); // write the merged state back soon
  },

  updateDrops(dt) {
    const p = this.player;
    for (const d of this.drops) {
      d.t += dt;
      if (!d.onGround) { stepBody(d, dt, this.map.platforms, this.map.width); if (d.onGround) d.vx = 0; }
      if (d.t > 0.45 && !p.dead && !d.taken && overlap({ x: p.x - 6, y: p.y, w: p.w + 12, h: p.h }, d)) this.pickupDrop(d, p.cx, p.y);
    }
    if (this.pet) this.pet.update(dt);
    this.drops = this.drops.filter((d) => !d.taken && d.t < d.life);
  },

  // Is there room in the bag for this drop?
  canTake(d) {
    if (d.kind === 'gold') return true;
    const it = ITEMS[d.data.id];
    if (it.type !== 'equip' && this.ch.inventory.some((e) => e.id === d.data.id)) return true;
    return this.ch.inventory.length < INV_SIZE;
  },

  // Pick up an item (player or pet). Returns true if it was picked up.
  pickupDrop(d, tx, ty) {
    if (d.taken) return false;
    if (d.sid) {
      // a server drop: ask the server; it commits the item and sends it back as an item change
      if (d.retryAt && this.time < d.retryAt) return false;
      if (!this.canTake(d)) { if (!d.warned) { d.warned = true; this.hooks.toast('Túi đồ đã đầy', 'warn'); } return false; }
      if (!this.net || !this.net.pick(d.sid)) return false;
      d.taken = true;
      this.pendingPicks.set(d.sid, d);
      return true;
    }
    if (d.kind === 'gold') {
      this.ch.gold += d.data;
      this.floatText(tx, ty - 8, `+${d.data} lượng`, '#ffd84a', false, true);
      d.taken = true;
    } else {
      const ok = addItem(this.ch, d.data.id, d.data.qty, d.data.r, d.data.b);
      if (ok) {
        d.taken = true; this.hooks.gotItem(d.data);
        if (isRareDrop(d.data)) this.hooks.save(); // valuable loot is saved right away (queued, in the background)
      }
      else if (!d.warned) { d.warned = true; this.hooks.toast('Túi đồ đã đầy', 'warn'); }
    }
    if (d.taken) this.hooks.changed('inv');
    return d.taken;
  },
};
