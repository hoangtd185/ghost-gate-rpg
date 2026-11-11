// GameDb: item custody. Server-side grants, saves reconciled against what the server holds, trades, and the item ledger.
import { ITEMS } from '../../../shared/data/items.js';
import { legacyItem } from '../../../shared/data/legacy.js';
import { isFreeItem, questGrants, craftGrants, starterKit } from '../../../shared/rules/loot.js';
import { isFreeItemId, int, EQUIP_SLOTS, INV_SIZE, newUid, isStack, rowToEntry, cleanEntry, cleanBonus } from '../db/helpers.js';


export const ItemsDb = {
  // Replace a character's items with the uploaded ones, under the server's rules:
  //  - an item the server already has keeps its server-side identity (id, rarity, bonus stats); the client
  //    may change quantity, enhancement, element, gems and where it sits (bag or equipment slot)
  //  - an item that now belongs to another character (traded away) is dropped
  //  - "free" items (shops, gems, quest-only items) may be added; any other item may only grow by what this
  //    save earned: quests accepted/completed in it, crafting materials used up, the starter kit of a new
  //    character. Monster drops only ever come from the server. Stacks may be merged or used up.
  // Returns true if anything uploaded was refused or changed.
  reconcileItems(id, rev, ch, cls, create) {
    const have = new Map(this.q.itemsOf.all(id).map((r) => [r.uid, r]));
    const list = [];
    for (const [slot, e] of Object.entries(ch.equip || {})) if (e && EQUIP_SLOTS.has(slot)) list.push([e, slot]);
    for (const e of (ch.inventory || []).slice(0, INV_SIZE + 24)) if (e) list.push([e, null]);
    const keep = [], seen = new Set();
    let fixed = false;
    const log = (uid, itemId, qty, why) => this.q.ledgerAdd.run(Date.now(), id, rev, 'rejected', uid, itemId, qty, null, 'save', why, null);
    for (const [raw, slot] of list) {
      const e = cleanEntry(raw);
      if (!e.uid || seen.has(e.uid)) { fixed = true; continue; }
      seen.add(e.uid);
      const old = have.get(e.uid);
      if (old) {
        const itemId = legacyItem(old.item_id) === e.id ? e.id : old.item_id; // allow renamed ids from data/legacy.js
        if (e.id !== itemId || e.r !== old.rarity || JSON.stringify(e.b) !== old.bonus) fixed = true;
        keep.push({ ...e, id: itemId, r: old.rarity, b: JSON.parse(old.bonus || '{}'), slot });
        continue;
      }
      let why = null;
      if (!ITEMS[e.id]) why = 'unknown';
      else if (this.q.itemByUid.get(e.uid)) why = 'owned_elsewhere';
      else if (isFreeItemId(e.id) && !isFreeItem(e.id, e.r)) why = 'rarity';
      else if (!isFreeItemId(e.id) && e.r > (ITEMS[e.id].type === 'equip' ? 3 : 0)) why = 'rarity';
      if (why) { fixed = true; log(e.uid, e.id, e.qty, why); continue; }
      const b = cleanBonus(e.id, e.r, e.b);
      if (JSON.stringify(b) !== JSON.stringify(e.b)) { fixed = true; log(e.uid, e.id, e.qty, 'bonus'); }
      keep.push({ ...e, b, slot });
    }
    // Quantities of items that are not free: never more than before plus what this save earned
    const total = (rows, idOf, qtyOf) => rows.reduce((m, x) => m.set(idOf(x), (m.get(idOf(x)) || 0) + qtyOf(x)), new Map());
    // stored ids from before a rename (data/legacy.js) count as the new id, like the kept entries do
    const before = total([...have.values()], (r) => legacyItem(r.item_id), (r) => r.qty);
    const after = total(keep, (e) => e.id, (e) => e.qty);
    const used = new Map();
    for (const [itemId, n] of before) if ((after.get(itemId) || 0) < n) used.set(itemId, n - (after.get(itemId) || 0));
    const dbQuests = {};
    for (const q of this.q.questsOf.all(id)) dbQuests[q.quest_id] = { s: q.state, p: q.progress, day: q.day };
    const grants = [questGrants(dbQuests, ch.quests, cls), craftGrants(used, cls), create ? starterKit(cls) : new Map()];
    const allowed = (itemId) => grants.reduce((n, m) => n + (m.get(itemId) || 0), 0);
    let final = keep;
    for (const [itemId, n] of after) {
      const grew = n - (before.get(itemId) || 0);
      if (grew <= 0 || isFreeItemId(itemId) || grew <= allowed(itemId)) continue;
      fixed = true;
      log(null, itemId, grew, 'not_earned');
      final = final.filter((e) => e.id !== itemId);
      for (const r of have.values()) if (legacyItem(r.item_id) === itemId) final.push({ ...cleanEntry(rowToEntry(r)), id: itemId, slot: r.equip_slot });
    }
    this.q.clearItems.run(id);
    let pos = 0;
    for (const e of final) {
      // equipped only in its own slot (an item claimed to be in another slot goes back to the bag)
      const slot = e.slot && EQUIP_SLOTS.has(e.slot) && ITEMS[e.id]?.slot === e.slot ? e.slot : null;
      if (slot !== (e.slot || null)) fixed = true; // the client must learn where the item really is
      this.q.insertItem.run(e.uid, id, e.id, e.qty, e.r, JSON.stringify(e.b || {}), slot, pos++, e.e || 0, e.el || null, JSON.stringify(e.g || []));
    }
    return fixed;
  },

  // Put a picked-up drop into a character's bag. reqId makes a repeated request a no-op.
  // Returns { rev, entry } | { dup: true } | { full: true } | null (no such character)
  grantItem(charId, item, opts = {}) {
    return this.transaction(() => this.grantItemTx(charId, item, opts));
  },

  // Many grants in ONE transaction (one disk sync for the whole batch: "group commit"). Each grant runs in its
  // own savepoint, so one failing grant does not undo the others. Returns one result per request, in order
  // (a result is { error: true } if that grant threw).
  grantItems(reqs) {
    return this.transaction(() => reqs.map((r, i) => {
      this.db.exec(`SAVEPOINT g${i}`);
      try { const out = this.grantItemTx(r.charId, r.item, r.opts || {}); this.db.exec(`RELEASE g${i}`); return out; }
      catch (e) { this.db.exec(`ROLLBACK TO g${i}`); this.db.exec(`RELEASE g${i}`); console.error('grant failed', e); return { error: true }; }
    }));
  },

  grantItemTx(charId, item, { reason = 'drop', ref = null, reqId = null } = {}) {
    if (reqId && this.q.ledgerByReq.get(reqId)) return { dup: true };
    const row = this.q.charById.get(charId);
    if (!row || !ITEMS[item.id]) return null;
    const stackable = isStack(item.id) && this.q.hasStack.get(charId, item.id);
    if (!stackable && this.q.invCount.get(charId).n >= INV_SIZE) return { full: true };
    const e = cleanEntry({ ...item, uid: newUid() });
    this.q.insertItem.run(e.uid, charId, e.id, e.qty, e.r, JSON.stringify(e.b), null, this.q.maxPos.get(charId).p + 1, e.e, e.el, JSON.stringify(e.g));
    const rev = this.q.bumpRev.get(charId).item_rev;
    const entry = rowToEntry(this.q.itemByUid.get(e.uid));
    this.q.ledgerAdd.run(Date.now(), charId, rev, 'gain', e.uid, e.id, e.qty, JSON.stringify(entry), reason, ref, reqId);
    return { rev, entry };
  },

  // Swap the offers of a trade in one transaction. sides: [{ charId, items: [{ uid, qty }], gold }, …] (two sides).
  // Every item must still belong to its side, unequipped and with the quantity that was shown; gold must be there;
  // both bags must have room. Returns { ok: true, revs: { [charId]: rev } } or { ok: false, why }.
  commitTrade(tradeId, sides) {
    return this.transaction(() => {
      const rows = sides.map((sd) => this.q.charById.get(sd.charId));
      if (rows.some((r) => !r)) return { ok: false, why: 'gone' };
      for (const [i, sd] of sides.entries()) {
        if (int(sd.gold) < 0 || int(sd.gold) > rows[i].gold) return { ok: false, why: 'gold', who: sd.charId };
        for (const o of sd.items) {
          const it = this.q.itemByUid.get(o.uid);
          if (!it || it.character_id !== sd.charId || it.equip_slot || it.qty !== o.qty) return { ok: false, why: 'item', who: sd.charId };
        }
      }
      for (const [i, sd] of sides.entries()) {
        const other = sides[1 - i];
        if (this.q.invCount.get(sd.charId).n - sd.items.length + other.items.length > INV_SIZE) return { ok: false, why: 'full', who: sd.charId };
      }
      const revs = {};
      for (const sd of sides) revs[sd.charId] = this.q.bumpRev.get(sd.charId).item_rev;
      const now = Date.now();
      for (const [i, sd] of sides.entries()) {
        const other = sides[1 - i];
        let pos = this.q.maxPos.get(other.charId).p;
        for (const o of sd.items) {
          const it = this.q.itemByUid.get(o.uid);
          this.q.moveItem.run(other.charId, ++pos, o.uid);
          const entry = rowToEntry(this.q.itemByUid.get(o.uid));
          this.q.ledgerAdd.run(now, sd.charId, revs[sd.charId], 'loss', o.uid, it.item_id, it.qty, null, 'trade', `${tradeId}>${other.charId}`, `trade:${tradeId}:${o.uid}:out`);
          this.q.ledgerAdd.run(now, other.charId, revs[other.charId], 'gain', o.uid, it.item_id, it.qty, JSON.stringify(entry), 'trade', `${tradeId}<${sd.charId}`, `trade:${tradeId}:${o.uid}:in`);
        }
      }
      for (const [i, sd] of sides.entries()) {
        const delta = int(sides[1 - i].gold) - int(sd.gold);
        if (!delta) continue;
        this.q.setGold.run(rows[i].gold + delta, sd.charId);
        this.q.ledgerAdd.run(now, sd.charId, revs[sd.charId], 'gold', null, null, delta, null, 'trade', String(tradeId), `trade:${tradeId}:gold:${sd.charId}`);
      }
      return { ok: true, revs };
    });
  },

  // Item and gold changes after `rev`, oldest first, for the client to replay (after a reconnect, a pickup, a trade)
  changesSince(charId, rev) {
    return this.q.ledgerSince.all(charId, int(rev)).map((r) => ({
      rev: r.rev, kind: r.kind, uid: r.item_uid, id: r.item_id, qty: r.qty, entry: r.entry ? JSON.parse(r.entry) : undefined,
    }));
  },

  itemRev(charId) { return this.q.charById.get(charId)?.item_rev || 0; },

  item(uid) { const r = this.q.itemByUid.get(uid); return r ? { entry: rowToEntry(r), owner: r.character_id, slot: r.equip_slot } : null; },

  ledger(charId) { return this.q.ledgerOf.all(charId); },
};
