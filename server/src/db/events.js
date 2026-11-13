// GameDb: server events (Xâm Lăng Dương Ác, see server/src/dungeon.js): which event windows already ran, EXP rewards
// (ledger kind 'exp', replayed to the client like items and gold), and rewards that could not be delivered yet.
import { int } from './helpers.js';

export const EventsDb = {
  // The start times (ms) of this event's windows that already ran. A restart must not start a second run in one.
  eventWindows(dungeon) { return this.q.windowsOf.all(dungeon).map((r) => r.start); },
  markEventWindow(dungeon, start) { this.q.windowAdd.run(dungeon, int(start)); },

  // EXP for a character: a ledger row at a new revision, so it reaches the client exactly once through the change
  // replay (online `chg`, or after a login). Run inside a transaction. Returns { rev } | { dup: true } | null.
  addExpTx(charId, n, reason, ref, reqId) {
    if (reqId && this.q.ledgerByReq.get(reqId)) return { dup: true };
    if (!this.q.charById.get(charId)) return null;
    const rev = this.q.bumpRev.get(charId).item_rev;
    this.q.ledgerAdd.run(Date.now(), charId, rev, 'exp', null, null, int(n), null, reason, ref, reqId);
    return { rev };
  },

  // The rewards of a finished event, in ONE transaction. items: [{ charId, item, opts: { reason, ref, reqId } }],
  // exp: [{ charId, n, ref, reqId }]. An item that cannot be delivered now (full bag, a failing write) is kept in
  // `event_pending` under the same request id instead of being lost; claimPending delivers it later.
  // Returns one status per item, in order: 'ok' | 'queued' | 'lost' (no such character or item).
  grantEventRewards({ items, exp = [] }) {
    return this.transaction(() => {
      const out = items.map((r, i) => {
        this.db.exec(`SAVEPOINT e${i}`);
        let res;
        try { res = this.grantItemTx(r.charId, r.item, r.opts || {}); } catch (e) { console.error('event grant failed', e); this.db.exec(`ROLLBACK TO e${i}`); res = { error: true }; }
        this.db.exec(`RELEASE e${i}`);
        if (res && (res.rev || res.dup)) return 'ok';
        if (res && (res.full || res.error)) {
          this.q.pendingAdd.run(r.opts.reqId, r.charId, JSON.stringify(r.item), r.opts.ref || null, Date.now());
          return 'queued';
        }
        return 'lost';
      });
      for (const x of exp) this.addExpTx(x.charId, x.n, 'event', x.ref, x.reqId);
      return out;
    });
  },

  pendingCount(charId) { return this.q.pendingCount.get(charId).n; },

  // Try again to deliver this character's queued event rewards (bag space may be free now).
  // Returns { delivered: [[item id, qty], …], left }.
  claimPending(charId) {
    const rows = this.q.pendingOf.all(charId);
    if (!rows.length) return { delivered: [], left: 0 };
    return this.transaction(() => {
      const delivered = [];
      let left = 0;
      rows.forEach((row, i) => {
        const item = JSON.parse(row.item);
        this.db.exec(`SAVEPOINT p${i}`);
        let res;
        try { res = this.grantItemTx(charId, item, { reason: 'event', ref: row.ref, reqId: row.req_id }); } catch (e) { console.error('pending grant failed', e); this.db.exec(`ROLLBACK TO p${i}`); res = { error: true }; }
        this.db.exec(`RELEASE p${i}`);
        if (res && (res.rev || res.dup)) { this.q.pendingDel.run(row.req_id); if (res.rev) delivered.push([item.id, item.qty]); } else left++;
      });
      return { delivered, left };
    });
  },
};
