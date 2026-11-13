// GameDb: server events (Xâm Lăng Dương Ác, see server/src/dungeon.js): which event windows already ran, EXP rewards
// (a running total plus what the character took, see addExpTx), and rewards that could not be delivered yet.
import { int } from './helpers.js';

export const EventsDb = {
  // The start times (ms) of this event's windows that already ran. A restart must not start a second run in one.
  eventWindows(dungeon) { return this.q.windowsOf.all(dungeon).map((r) => r.start); },
  markEventWindow(dungeon, start) { this.q.windowAdd.run(dungeon, int(start)); },

  // EXP for a character. EXP and level belong to the client's save (the server never edits them: the next save would
  // overwrite it, and an old outbox copy wins over the database), and the item revision only covers items, gold and
  // quests. So the reward is a pair of counters: `event_exp`, a running total only the server raises, and
  // `event_exp_taken`, how much of it the character already applied (saved with its EXP, never above the total). The
  // client applies the difference once, whichever way it learns of it: with the character at login, in `welcome` on a
  // reconnect, or in `ev_end`. A ledger row (kind 'exp', not replayed) keeps the audit trail and makes a repeated
  // request a no-op. Run inside a transaction. Returns { total } | { dup: true, total } | null.
  addExpTx(charId, n, reason, ref, reqId) {
    const row = this.q.charById.get(charId);
    if (!row) return null;
    if (reqId && this.q.ledgerByReq.get(reqId)) return { dup: true, total: row.event_exp || 0 };
    const total = this.q.addEventExp.get(int(n), charId).event_exp;
    this.q.ledgerAdd.run(Date.now(), charId, row.item_rev || 0, 'exp', null, null, int(n), null, reason, ref, reqId);
    return { total };
  },

  // The rewards of a finished event, in ONE transaction. items: [{ charId, item, opts: { reason, ref, reqId } }],
  // exp: [{ charId, n, ref, reqId }]. An item that cannot be delivered now (full bag, a failing write) is kept in
  // `event_pending` under the same request id instead of being lost; claimPending delivers it later.
  // Returns { status: one per item, in order: 'ok' | 'queued' | 'lost' (no such character or item),
  //           expTotal: { [charId]: the character's running event EXP total } }.
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
      const expTotal = {};
      for (const x of exp) { const r = this.addExpTx(x.charId, x.n, 'event', x.ref, x.reqId); if (r) expTotal[x.charId] = r.total; }
      return { status: out, expTotal };
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
