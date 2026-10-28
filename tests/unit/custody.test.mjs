// Server-side item custody: what a client save may and may not change, server grants, trades and the ledger.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../../server/src/db.js';
import { newCharacter } from '../../client/src/game/character.js';
import { GAME } from '../../client/src/config.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qmq-custody-'));
let db, uid, A, B;
const ids = (ch) => [...ch.inventory, ...Object.values(ch.equip).filter(Boolean)].map((e) => e.id);
const load = (id) => db.getCharacter(id);

before(() => {
  db = openDb(path.join(dir, 'game.db'));
  uid = db.createUser('owner', 'x').id;
  const a = newCharacter('Alpha', 'swordsman'); a.gold = 50;
  const b = newCharacter('Beta', 'taoist');
  A = db.createCharacter(uid, a).id;
  B = db.createCharacter(uid, b).id;
});
after(() => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); });

describe('client saves', () => {
  it('a new character keeps its starter kit', () => {
    const ch = load(A);
    assert.ok(ids(ch).includes('hp_s') && ids(ch).includes('w_swordsman1'));
    assert.equal(ch.itemRev, 0);
  });

  it('shop items the client creates are kept', () => {
    const ch = load(A);
    ch.inventory.push({ uid: 'buy1', id: 'hp_l', qty: 10, r: 0, b: {} });
    const res = db.saveCharacter(uid, ch);
    assert.equal(res.stale, false);
    assert.equal(res.items, undefined, 'nothing refused');
    assert.ok(ids(load(A)).includes('hp_l'));
  });

  it('a monster-only item invented by the client is refused and logged', () => {
    const ch = load(A);
    ch.inventory.push({ uid: 'forged1', id: 'out_phoenix', qty: 1, r: 3, b: {} });
    const res = db.saveCharacter(uid, ch);
    assert.ok(res.items, 'server sends back what it kept');
    assert.ok(!res.items.inventory.some((e) => e.id === 'out_phoenix'));
    assert.ok(!ids(load(A)).includes('out_phoenix'));
    assert.ok(db.ledger(A).some((r) => r.kind === 'rejected' && r.item_id === 'out_phoenix' && r.ref === 'not_earned'));
  });

  it('quest gifts and rewards are allowed in the save that accepts / completes the quest, once', () => {
    let ch = load(A);
    ch.quests.tut_craft = { s: 'active', p: 0 }; // gives 4 fox tails and 4 wisp essences
    ch.inventory.push({ uid: 'give1', id: 'mat_tail', qty: 4, r: 0, b: {} }, { uid: 'give2', id: 'mat_wisp', qty: 4, r: 0, b: {} });
    assert.equal(db.saveCharacter(uid, ch).items, undefined);
    ch = load(A);
    ch.inventory.find((e) => e.uid === 'give1').qty = 8; // the same quest again: nothing more to earn
    assert.ok(db.saveCharacter(uid, ch).items);
    assert.equal(load(A).inventory.find((e) => e.uid === 'give1').qty, 4);
  });

  it('a crafted outfit is allowed only when its materials were used up', () => {
    let ch = load(A);
    ch.inventory.push({ uid: 'craft1', id: 'out_fox', qty: 1, r: 3, b: {} });
    assert.ok(db.saveCharacter(uid, ch).items, 'no materials used: refused');
    ch = load(A);
    ch.inventory = ch.inventory.filter((e) => e.id !== 'mat_tail' && e.id !== 'mat_wisp');
    ch.inventory.push({ uid: 'craft2', id: 'hp_l', qty: 1, r: 0, b: {} });
    assert.equal(db.saveCharacter(uid, ch).items, undefined, 'using materials for potions is fine');
  });

  it('a shop item cannot be saved with a higher rarity than it can have', () => {
    const ch = load(A);
    ch.inventory.push({ uid: 'forged2', id: 'hp_l', qty: 1, r: 3, b: {} });
    db.saveCharacter(uid, ch);
    assert.ok(!load(A).inventory.some((e) => e.uid === 'forged2'));
  });
});

describe('server grants (drops picked up)', () => {
  let rare;
  it('grantItem stores the item, bumps the revision and writes the ledger', () => {
    const res = db.grantItem(A, { id: 'out_phoenix', qty: 1, r: 3, b: {} }, { reqId: 'drop:d1', ref: 'd1' });
    assert.equal(res.rev, 1);
    rare = res.entry;
    assert.ok(load(A).inventory.some((e) => e.uid === rare.uid));
    const ch = db.changesSince(A, 0);
    assert.deepEqual(ch.map((c) => [c.kind, c.id, c.rev]), [['gain', 'out_phoenix', 1]]);
  });

  it('the same request twice is applied once', () => {
    assert.deepEqual(db.grantItem(A, { id: 'out_phoenix', qty: 1, r: 3, b: {} }, { reqId: 'drop:d1' }), { dup: true });
    assert.equal(load(A).inventory.filter((e) => e.id === 'out_phoenix').length, 1);
  });

  it('a save from before the pickup (old item revision) does not erase it, nor change gold', () => {
    const old = load(A); old.itemRev = 0; old.inventory = old.inventory.filter((e) => e.uid !== rare.uid); old.gold = 999999; old.level = 3;
    const res = db.saveCharacter(uid, old);
    assert.equal(res.stale, true);
    const now = load(A);
    assert.ok(now.inventory.some((e) => e.uid === rare.uid), 'item still there');
    assert.equal(now.gold, 50, 'gold untouched');
    assert.equal(now.level, 3, 'everything else saved');
  });

  it('rarity and bonus stats of a server item cannot be edited', () => {
    const ch = load(A);
    const e = ch.inventory.find((x) => x.uid === rare.uid);
    e.b = { str: 999 }; e.e = 5;
    const res = db.saveCharacter(uid, ch);
    assert.ok(res.items);
    const saved = load(A).inventory.find((x) => x.uid === rare.uid);
    assert.deepEqual(saved.b, {});
    assert.equal(saved.e, 5, 'enhancement is the client\'s business for now');
  });

  it('stacks of monster materials may be merged but not multiplied', () => {
    const g1 = db.grantItem(A, { id: 'mat_tail', qty: 1 }, { reqId: 'drop:t1' });
    const g2 = db.grantItem(A, { id: 'mat_tail', qty: 1 }, { reqId: 'drop:t2' });
    let ch = load(A); ch.itemRev = g2.rev;
    ch.inventory = ch.inventory.filter((e) => e.uid !== g2.entry.uid);
    ch.inventory.find((e) => e.uid === g1.entry.uid).qty = 2;
    assert.equal(db.saveCharacter(uid, ch).items, undefined, 'merging is fine');
    ch = load(A);
    ch.inventory.find((e) => e.id === 'mat_tail').qty = 50;
    assert.ok(db.saveCharacter(uid, ch).items, 'growing is refused');
    assert.equal(load(A).inventory.filter((e) => e.id === 'mat_tail').reduce((n, e) => n + e.qty, 0), 2);
  });

  it('a full bag refuses new items', () => {
    const ch = load(B);
    for (let i = ch.inventory.length; i < GAME.player.invSize; i++) ch.inventory.push({ uid: 'fill' + i, id: 'hat_cloth', qty: 1, r: 0, b: {} });
    db.saveCharacter(uid, ch);
    assert.deepEqual(db.grantItem(B, { id: 'out_fox', qty: 1, r: 3 }, { reqId: 'drop:full' }), { full: true });
    assert.ok(db.grantItem(B, { id: 'hp_s', qty: 1 }, { reqId: 'drop:stack' }).rev, 'a stack that exists still fits');
    const c = load(B); c.inventory = c.inventory.filter((e) => !e.uid.startsWith('fill')); db.saveCharacter(uid, c);
  });
});

describe('trades', () => {
  let phoenix, potion, revA, revB, goldB;
  before(() => {
    goldB = load(B).gold;
    phoenix = load(A).inventory.find((e) => e.id === 'out_phoenix');
    potion = load(B).inventory.find((e) => e.id === 'hp_s');
    revA = load(A).itemRev; revB = load(B).itemRev;
  });

  it('refuses an offer whose quantity no longer matches', () => {
    const r = db.commitTrade('t0', [{ charId: A, items: [{ uid: phoenix.uid, qty: 1 }], gold: 0 }, { charId: B, items: [{ uid: potion.uid, qty: potion.qty + 5 }], gold: 0 }]);
    assert.deepEqual([r.ok, r.why], [false, 'item']);
  });

  it('refuses gold the player does not have', () => {
    const r = db.commitTrade('t0', [{ charId: A, items: [], gold: 5000 }, { charId: B, items: [], gold: 0 }]);
    assert.deepEqual([r.ok, r.why], [false, 'gold']);
  });

  it('swaps items and gold in one go', () => {
    const r = db.commitTrade('t1', [{ charId: A, items: [{ uid: phoenix.uid, qty: 1 }], gold: 20 }, { charId: B, items: [{ uid: potion.uid, qty: potion.qty }], gold: 0 }]);
    assert.equal(r.ok, true);
    const a = load(A), b = load(B);
    assert.ok(b.inventory.some((e) => e.uid === phoenix.uid) && !a.inventory.some((e) => e.uid === phoenix.uid));
    assert.ok(a.inventory.some((e) => e.uid === potion.uid) && !b.inventory.some((e) => e.uid === potion.uid));
    assert.equal(a.gold, 30); assert.equal(b.gold, goldB + 20);
    assert.equal(a.itemRev, revA + 1); assert.equal(b.itemRev, revB + 1);
    const chA = db.changesSince(A, revA).map((c) => `${c.kind}:${c.id || c.qty}`);
    assert.deepEqual(chA.sort(), ['gain:hp_s', 'gold:-20', 'loss:out_phoenix'].sort());
  });

  it('an old copy of the seller cannot bring the traded item back', () => {
    const stale = load(A); stale.itemRev = revA; stale.inventory.push({ ...phoenix });
    assert.equal(db.saveCharacter(uid, stale).stale, true);
    const fresh = load(A); fresh.inventory.push({ ...phoenix });
    const res = db.saveCharacter(uid, fresh);
    assert.ok(res.items);
    assert.ok(!load(A).inventory.some((e) => e.uid === phoenix.uid));
    assert.equal(db.item(phoenix.uid).owner, B);
  });

  it('a repeated commit of the same trade is refused by the ledger', () => {
    assert.throws(() => db.commitTrade('t1', [{ charId: B, items: [{ uid: phoenix.uid, qty: 1 }], gold: 0 }, { charId: A, items: [], gold: 0 }]));
  });
});

describe('group commit', () => {
  it('many pickups in one transaction: each one applied once, a failing one does not undo the others', () => {
    const rev = load(B).itemRev;
    const res = db.grantItems([
      { charId: B, item: { id: 'stone', qty: 1 }, opts: { reqId: 'drop:batch1' } },
      { charId: B, item: { id: 'stone', qty: 1 }, opts: { reqId: 'drop:batch1' } }, // same request again
      { charId: 'nobody', item: { id: 'stone', qty: 1 }, opts: { reqId: 'drop:batch2' } },
      { charId: B, item: { id: 'gem_atk1', qty: 1 }, opts: { reqId: 'drop:batch3' } },
    ]);
    assert.equal(res[0].rev, rev + 1);
    assert.deepEqual(res[1], { dup: true });
    assert.equal(res[2], null);
    assert.equal(res[3].rev, rev + 2);
    assert.equal(db.changesSince(B, rev).length, 2);
  });
});
