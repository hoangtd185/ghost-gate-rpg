// Player-to-player trade, in the style of Võ Lâm Truyền Kỳ:
//   1. A asks B (standing close, same map); B accepts.
//   2. Both put items (whole stacks) and gold into the shared trade window. Any change unlocks both sides.
//   3. Each side locks its offer; once both are locked, each confirms.
//   4. Both confirmed: the server swaps everything in one database transaction (db.commitTrade) and tells both.
// Leaving the map, disconnecting or cancelling ends the trade; nothing moves until step 4 commits.
import crypto from 'node:crypto';
import { GAME } from '../../client/src/config.js';

const T = GAME.net.trade;
const int = (v) => (Number.isFinite(+v) ? Math.floor(+v) : 0);

export function createTrades({ db, players, send, pushChanges }) {
  const trades = new Map(); // tradeId -> trade
  const byChar = new Map(); // charId -> tradeId
  const asks = new Map(); // target charId -> { from, until }

  const sideOf = (t, s) => (t.a.s === s ? t.a : t.b.s === s ? t.b : null);
  const otherOf = (t, side) => (side === t.a ? t.b : t.a);
  const pub = (side) => ({ items: side.items.map((o) => o.entry), gold: side.gold, locked: side.locked, confirmed: side.confirmed });
  const state = (t) => {
    for (const side of [t.a, t.b]) send(side.s, { t: 'trade_state', id: t.id, me: pub(side), them: pub(otherOf(t, side)) });
  };
  const end = (t, why, by = null) => {
    trades.delete(t.id);
    for (const side of [t.a, t.b]) {
      if (byChar.get(side.s.id) === t.id) byChar.delete(side.s.id);
      send(side.s, { t: 'trade_end', id: t.id, why, by: by && by !== side.s ? by.name : null });
    }
  };
  const near = (a, b) => a.map && a.map === b.map && Math.abs(a.x - b.x) <= T.range;

  function ask(s, m) {
    const target = players.get(String(m.to || ''));
    if (!target || target === s) return send(s, { t: 'trade_err', why: 'nobody' });
    if (!near(s, target)) return send(s, { t: 'trade_err', why: 'far' });
    if (byChar.has(s.id) || byChar.has(target.id)) return send(s, { t: 'trade_err', why: 'busy' });
    asks.set(target.id, { from: s.id, until: Date.now() + T.askTimeoutSec * 1000 });
    send(target, { t: 'trade_ask', from: s.id, name: s.name });
    send(s, { t: 'trade_err', why: 'asked', name: target.name });
  }

  function answer(s, m) {
    const a = asks.get(s.id);
    asks.delete(s.id);
    const from = a && a.from === String(m.from || '') && a.until > Date.now() ? players.get(a.from) : null;
    if (!from) return send(s, { t: 'trade_err', why: 'expired' });
    if (!m.yes) return send(from, { t: 'trade_err', why: 'declined', name: s.name });
    if (!near(s, from)) return send(s, { t: 'trade_err', why: 'far' });
    if (byChar.has(s.id) || byChar.has(from.id)) return send(s, { t: 'trade_err', why: 'busy' });
    const side = (p) => ({ s: p, items: [], gold: 0, locked: false, confirmed: false });
    const t = { id: crypto.randomBytes(5).toString('hex'), a: side(from), b: side(s) };
    trades.set(t.id, t); byChar.set(from.id, t.id); byChar.set(s.id, t.id);
    send(from, { t: 'trade_open', id: t.id, with: { id: s.id, name: s.name } });
    send(s, { t: 'trade_open', id: t.id, with: { id: from.id, name: from.name } });
    state(t);
  }

  const current = (s) => { const t = trades.get(byChar.get(s.id)); return t ? [t, sideOf(t, s)] : [null, null]; };
  const unlockAll = (t) => { for (const x of [t.a, t.b]) { x.locked = false; x.confirmed = false; } };

  // { items: [{ uid, qty }], gold } replaces this side's offer. Items are checked against the database, so the
  // client must have saved first; a mismatch answers 'sync' and the client saves and offers again.
  function offer(s, m) {
    const [t, side] = current(s);
    if (!t) return;
    if (side.locked) return send(s, { t: 'trade_err', why: 'locked' });
    const list = Array.isArray(m.items) ? m.items.slice(0, T.maxItems + 1) : [];
    if (list.length > T.maxItems) return send(s, { t: 'trade_err', why: 'too_many' });
    const items = [], seen = new Set();
    for (const o of list) {
      const uid = String(o?.uid || '');
      if (!uid || seen.has(uid)) continue;
      seen.add(uid);
      const it = db.item(uid);
      if (!it || it.owner !== s.id || it.slot || it.entry.qty !== int(o.qty)) return send(s, { t: 'trade_err', why: 'sync' });
      items.push({ uid, qty: it.entry.qty, entry: it.entry });
    }
    const gold = Math.max(0, int(m.gold));
    const have = db.getCharacter(s.id)?.gold || 0;
    if (gold > have) return send(s, { t: 'trade_err', why: 'sync' });
    side.items = items; side.gold = gold;
    unlockAll(t);
    state(t);
  }

  function lock(s, m) {
    const [t, side] = current(s);
    if (!t) return;
    side.locked = !!m.on;
    if (!side.locked) unlockAll(t);
    for (const x of [t.a, t.b]) x.confirmed = false;
    state(t);
  }

  function confirm(s) {
    const [t, side] = current(s);
    if (!t) return;
    if (!t.a.locked || !t.b.locked) return send(s, { t: 'trade_err', why: 'not_locked' });
    side.confirmed = true;
    if (!(t.a.confirmed && t.b.confirmed)) return state(t);
    const sides = [t.a, t.b].map((x) => ({ charId: x.s.id, items: x.items.map((o) => ({ uid: o.uid, qty: o.qty })), gold: x.gold }));
    let res;
    try { res = db.commitTrade(t.id, sides); } catch (e) { console.error('trade commit failed', e); res = { ok: false, why: 'error' }; }
    if (!res.ok) return end(t, 'failed_' + res.why);
    for (const x of [t.a, t.b]) pushChanges(x.s);
    end(t, 'done');
  }

  function cancel(s, why = 'cancel') {
    const [t] = current(s);
    if (t) end(t, why, s);
    asks.delete(s.id);
  }

  return {
    handle(s, m) {
      switch (m.t) {
        case 'trade_ask': return ask(s, m);
        case 'trade_answer': return answer(s, m);
        case 'trade_offer': return offer(s, m);
        case 'trade_lock': return lock(s, m);
        case 'trade_confirm': return confirm(s);
        case 'trade_cancel': return cancel(s);
      }
    },
    cancel,
    busy: (charId) => byChar.has(charId),
  };
}
