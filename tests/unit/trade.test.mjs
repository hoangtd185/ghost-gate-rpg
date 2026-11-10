// Trade offers on the server: only the owner's unequipped items with the shown quantity, and never quest items.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../../server/src/db.js';
import { createTrades } from '../../server/src/trade.js';
import { newCharacter } from '../../client/src/game/character.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qmq-trade-'));
const sent = [];
let db, trades, A, B;
const send = (s, msg) => sent.push({ to: s.id, ...msg });
const last = (to, t) => sent.filter((m) => m.to === to && m.t === t).at(-1);

before(() => {
  db = openDb(path.join(dir, 'game.db'));
  const uid = db.createUser('trader', 'x').id;
  const a = db.createCharacter(uid, newCharacter('Ta', 'swordsman')).id;
  const b = db.createCharacter(uid, newCharacter('Tb', 'taoist')).id;
  const players = new Map();
  A = { id: a, name: 'Ta', map: 'village', x: 100 }; B = { id: b, name: 'Tb', map: 'village', x: 150 };
  players.set(a, A); players.set(b, B);
  trades = createTrades({ db, players, send, pushChanges: () => {} });
  trades.handle(A, { t: 'trade_ask', to: b });
  trades.handle(B, { t: 'trade_answer', from: a, yes: true });
});
after(() => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); });

describe('trade offers', () => {
  it('an own bag item can be offered', () => {
    const hp = db.getCharacter(A.id).inventory.find((e) => e.id === 'hp_s');
    trades.handle(A, { t: 'trade_offer', items: [{ uid: hp.uid, qty: hp.qty }], gold: 0 });
    assert.equal(last(A.id, 'trade_state').me.items.length, 1);
  });

  it('a quest item is refused', () => {
    const q = db.grantItem(A.id, { id: 'q_ribbon', qty: 1, r: 0, b: {} }, { reqId: 'tq:1' }).entry;
    const before = sent.length;
    trades.handle(A, { t: 'trade_offer', items: [{ uid: q.uid, qty: 1 }], gold: 0 });
    const err = sent.slice(before).find((m) => m.t === 'trade_err');
    assert.equal(err?.why, 'sync');
    assert.equal(last(A.id, 'trade_state').me.items.length, 1, 'the previous offer stays');
  });
});
