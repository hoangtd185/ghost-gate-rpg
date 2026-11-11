// GameDb: Nguyên Bảo (ingots): balance changes, shop purchases, daily check-in and quest claims.
import { offerById, offerItems, cellsNeeded, checkinReward, premiumDay, questIngots } from '../../../shared/rules/premium.js';
import { int, str, INV_SIZE } from '../db/helpers.js';


export const PremiumDb = {
  // ===== Nguyên Bảo (premium currency) =====
  // The balance changes only here, each change with a ledger row (kind 'ingots') at a new item revision, so the
  // client gets it through the same change replay as pickups. Uploaded saves never touch it.
  // Run inside a transaction. A change that would take the balance below zero (or an unknown character) throws, so
  // the whole transaction is undone: no ledger row, no revision bump.
  addIngotsTx(charId, n, reason, ref, reqId) {
    if (reqId && this.q.ledgerByReq.get(reqId)) return { dup: true };
    const delta = int(n);
    const now = this.q.addIngots.get(delta, charId, delta);
    if (!now) throw new Error(`ingots: cannot apply ${delta} to ${charId}`);
    const rev = this.q.bumpRev.get(charId).item_rev;
    this.q.ledgerAdd.run(Date.now(), charId, rev, 'ingots', null, null, delta, null, reason, ref, reqId);
    return { rev, ingots: now.ingots };
  },

  // Ingots won outside the shop (field bosses, chieftains). Returns { rev, ingots } | { dup: true } | null
  grantIngots(charId, n, reason, ref, reqId) {
    return this.transaction(() => (this.q.charById.get(charId) ? this.addIngotsTx(charId, n, reason, ref, reqId) : null));
  },

  // Buy a premium offer: items into the bag and ingots taken, together or not at all. reqId: the client's request id.
  // Returns { ok: true, rev, ingots } | { ok: false, why: 'offer' | 'ingots' | 'full' | 'dup' | 'gone' }
  premiumBuy(charId, offerId, reqId) {
    return this.transaction(() => {
      const row = this.q.charById.get(charId), o = offerById(offerId);
      if (!row) return { ok: false, why: 'gone' };
      if (!o) return { ok: false, why: 'offer' };
      if (this.q.ledgerByReq.get(reqId)) return { ok: false, why: 'dup' };
      if (row.ingots < o.price) return { ok: false, why: 'ingots' };
      const bag = this.q.bagOf.all(charId).map((r) => ({ id: r.item_id }));
      if (bag.length + cellsNeeded(bag, o) > INV_SIZE) return { ok: false, why: 'full' };
      offerItems(o).forEach((item, i) => {
        const g = this.grantItemTx(charId, item, { reason: 'premium', ref: o.id, reqId: `${reqId}:${i}` });
        if (!g || !g.entry) throw new Error('premium grant failed');
      });
      const r = this.addIngotsTx(charId, -o.price, 'premium', o.id, reqId);
      return { ok: true, rev: r.rev, ingots: r.ingots };
    });
  },

  // The daily check-in. Returns { ok: true, rev, ingots, got, streak } | { ok: false, why: 'done' | 'gone' }
  checkin(charId, now = Date.now()) {
    return this.transaction(() => {
      const row = this.q.charById.get(charId);
      if (!row) return { ok: false, why: 'gone' };
      const r = checkinReward(row.checkin ? JSON.parse(row.checkin) : null, premiumDay(now));
      if (!r) return { ok: false, why: 'done' };
      this.q.setCheckin.run(JSON.stringify({ day: r.day, streak: r.streak }), charId);
      const g = this.addIngotsTx(charId, r.ingots, 'checkin', r.day, `checkin:${charId}:${r.day}`);
      return { ok: true, rev: g.rev, ingots: g.ingots, got: r.ingots, streak: r.streak };
    });
  },

  // Ingots for a completed quest, once. The quest must be done in the saved character.
  // Returns { ok: true, rev, ingots, got } | { ok: false, why: 'none' | 'not_done' | 'dup' | 'gone' }
  claimQuest(charId, qid) {
    return this.transaction(() => {
      if (!this.q.charById.get(charId)) return { ok: false, why: 'gone' };
      const n = questIngots(qid);
      if (!n) return { ok: false, why: 'none' };
      if (this.q.questState.get(charId, str(qid, 30))?.state !== 'done') return { ok: false, why: 'not_done' };
      const g = this.addIngotsTx(charId, n, 'quest', qid, `quest:${charId}:${qid}`);
      return g.dup ? { ok: false, why: 'dup' } : { ok: true, rev: g.rev, ingots: g.ingots, got: n };
    });
  },
};
