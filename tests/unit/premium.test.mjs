// Premium shop (Vạn Bảo Các) and Nguyên Bảo: the shared rules (check-in streak, offers, where ingots come from,
// offline purchases) and the server side (the balance belongs to the server, purchases are all-or-nothing and
// applied once, check-in once a day, quest ingots once).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GAME } from '../../client/src/config.js';
import { ITEMS } from '../../client/src/data/items.js';
import { PREMIUM_SHOP, PREMIUM_TABS } from '../../client/src/data/premium.js';
import { newCharacter } from '../../client/src/game/character.js';
import { checkinReward, premiumDay, killIngots, questIngots, cellsNeeded, offerById, buyLocal, checkinLocal } from '../../client/src/game/premium.js';
import { openDb } from '../../server/src/db.js';
import { createPremium } from '../../server/src/premium.js';

const PG = GAME.premium;

describe('premium rules (shared)', () => {
  it('every offer sells existing items, on a known tab, for a positive price', () => {
    const ids = new Set();
    for (const o of PREMIUM_SHOP) {
      assert.ok(!ids.has(o.id), `unique ${o.id}`); ids.add(o.id);
      assert.ok(PREMIUM_TABS.some((t) => t.id === o.tab), `${o.id}: tab`);
      assert.ok(o.price > 0 && Number.isInteger(o.price), `${o.id}: price`);
      for (const [id, n] of o.items) assert.ok(ITEMS[id] && n > 0, `${o.id}: ${id}`);
    }
    assert.ok(PREMIUM_SHOP.filter((o) => o.tab === 'cape').length >= 5, 'the capes are on sale');
  });

  it('the check-in day starts at midnight Vietnam time', () => {
    assert.equal(premiumDay(Date.parse('2026-11-01T16:59:00Z')), '2026-11-01');
    assert.equal(premiumDay(Date.parse('2026-11-01T17:00:00Z')), '2026-11-02');
  });

  it('check-in: once a day, a streak that pays a bonus on day 7 and resets after a missed day', () => {
    let st = null;
    const days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'];
    const got = days.map((d) => { const r = checkinReward(st, d); st = { day: r.day, streak: r.streak }; return [r.streak, r.ingots]; });
    assert.deepEqual(got.map((x) => x[0]), [1, 2, 3, 4, 5, 6, 7, 1]);
    assert.equal(got[6][1], PG.checkin.ingots + PG.checkin.streakBonus);
    assert.equal(got[0][1], PG.checkin.ingots);
    assert.equal(checkinReward(st, '2026-11-08'), null, 'twice the same day');
    assert.equal(checkinReward({ day: '2026-11-08', streak: 3 }, '2026-11-10').streak, 1, 'a missed day resets');
  });

  it('ingots from kills and quests', () => {
    assert.equal(killIngots({ chief: true }), PG.kill.chief);
    assert.equal(killIngots({ named: 'fb_fox' }), PG.kill.fieldBoss);
    assert.equal(killIngots({ named: 'nb_scarecrow' }), 0, 'story bosses do not give any');
    assert.equal(killIngots({}), 0);
    assert.equal(questIngots('st7'), PG.chapterIngots);
    assert.equal(questIngots('d_hunt1'), 0, 'never for dailies');
  });

  it('bag cells an offer needs', () => {
    assert.equal(cellsNeeded([], offerById('pc_sakura')), 1);
    assert.equal(cellsNeeded([{ id: 'stone' }], offerById('pu_stone')), 0, 'stacks onto stones already in the bag');
  });

  it('offline: buy with ingots, check in', () => {
    const ch = newCharacter('Off', 'taoist');
    assert.equal(ch.ingots, 0);
    assert.equal(buyLocal(ch, 'pc_sakura').ok, false, 'not enough');
    const r = checkinLocal(ch, Date.parse('2026-11-01T03:00:00Z'));
    assert.equal(r.ingots, PG.checkin.ingots);
    assert.equal(checkinLocal(ch, Date.parse('2026-11-01T09:00:00Z')), null);
    ch.ingots = 500;
    assert.ok(buyLocal(ch, 'pc_sakura').ok);
    assert.equal(ch.ingots, 500 - offerById('pc_sakura').price);
    const cape = ch.inventory.find((e) => e.id === 'cape_sakura');
    assert.equal(cape.r, 3, 'cosmetics are Legendary');
    while (ch.inventory.length < GAME.player.invSize) ch.inventory.push({ uid: 'f' + ch.inventory.length, id: 'hat_cloth', qty: 1, r: 0, b: {} });
    assert.equal(buyLocal(ch, 'pc_frost').msg, 'Túi đồ đầy');
    assert.equal(ch.ingots, 500 - offerById('pc_sakura').price, 'nothing taken');
  });
});

describe('premium on the server', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qmq-premium-'));
  let db, uid, A;
  const load = () => db.getCharacter(A);
  before(() => {
    db = openDb(path.join(dir, 'game.db'));
    uid = db.createUser('rich', 'x').id;
    A = db.createCharacter(uid, newCharacter('Kim', 'swordsman')).id;
  });
  after(() => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); });

  it('a save cannot change the balance', () => {
    const ch = load();
    assert.equal(ch.ingots, 0);
    ch.ingots = 99999; ch.checkin = { day: '2099-01-01', streak: 7 };
    db.saveCharacter(uid, ch);
    assert.equal(load().ingots, 0);
    assert.equal(load().checkin, null);
  });

  it('check-in once a day, as an item change the client replays', () => {
    const now = Date.parse('2026-11-01T03:00:00Z');
    const r = db.checkin(A, now);
    assert.ok(r.ok);
    assert.equal(r.got, PG.checkin.ingots);
    assert.equal(db.checkin(A, now + 3600e3).why, 'done');
    assert.equal(load().ingots, PG.checkin.ingots);
    assert.deepEqual(load().checkin, { day: '2026-11-01', streak: 1 });
    assert.ok(db.changesSince(A, 0).some((c) => c.kind === 'ingots' && c.qty === PG.checkin.ingots));
    assert.equal(db.checkin(A, now + 86400e3).streak, 2, 'the next day continues the streak');
  });

  it('not enough ingots: nothing happens', () => {
    const before = load();
    const r = db.premiumBuy(A, 'pc_dragon', 'prem:t1');
    assert.deepEqual(r, { ok: false, why: 'ingots' });
    assert.equal(load().itemRev, before.itemRev);
  });

  it('a purchase: the item arrives, the ingots go, both in the change replay; a repeat is applied once', () => {
    db.grantIngots(A, 300, 'test', null, 'test:1');
    const rev = load().itemRev;
    const r = db.premiumBuy(A, 'pc_sakura', 'prem:t2');
    assert.ok(r.ok);
    assert.equal(r.ingots, 300 + 2 * PG.checkin.ingots - offerById('pc_sakura').price);
    const ch = load();
    assert.equal(ch.ingots, r.ingots);
    const cape = ch.inventory.find((e) => e.id === 'cape_sakura');
    assert.equal(cape.r, 3);
    const kinds = db.changesSince(A, rev).map((c) => c.kind).sort();
    assert.deepEqual(kinds, ['gain', 'ingots']);
    assert.deepEqual(db.premiumBuy(A, 'pc_sakura', 'prem:t2'), { ok: false, why: 'dup' });
    assert.equal(load().ingots, r.ingots);
    assert.equal(load().inventory.filter((e) => e.id === 'cape_sakura').length, 1);
  });

  it('a full bag: no purchase, no ingots taken', () => {
    const ch = load();
    const ingots = ch.ingots;
    for (let i = 0; ch.inventory.length < GAME.player.invSize; i++) db.grantItem(A, { id: 'hat_cloth', qty: 1, r: 0, b: {} }, { reqId: 'fill:' + i }), ch.inventory.push({});
    assert.deepEqual(db.premiumBuy(A, 'pc_frost', 'prem:t3'), { ok: false, why: 'full' });
    assert.equal(load().ingots, ingots);
  });

  it('quest ingots: only once the quest is done in the saved character, and only once', () => {
    assert.equal(db.claimQuest(A, 'st7').why, 'not_done');
    const ch = load();
    ch.quests.st7 = { s: 'done', p: 1 };
    db.saveCharacter(uid, ch);
    const before = load().ingots;
    const r = db.claimQuest(A, 'st7');
    assert.ok(r.ok);
    assert.equal(load().ingots, before + PG.chapterIngots);
    assert.equal(db.claimQuest(A, 'st7').why, 'dup');
    assert.equal(db.claimQuest(A, 'm1').why, 'none', 'a quest without ingots');
  });

  it('kill rewards are granted by the server', () => {
    const before = load().ingots;
    assert.ok(db.grantIngots(A, PG.kill.fieldBoss, 'kill', 'fox', 'kill:x:1:' + A).rev);
    assert.equal(load().ingots, before + PG.kill.fieldBoss);
  });

  it('the balance never goes below zero: a change that would is refused and leaves no trace', () => {
    const before = load(), rows = db.ledger(A).length;
    assert.throws(() => db.transaction(() => db.addIngotsTx(A, -(before.ingots + 1), 'test', null, 'neg:1')), /cannot apply/);
    const after = load();
    assert.equal(after.ingots, before.ingots, 'balance unchanged');
    assert.equal(after.itemRev, before.itemRev, 'no revision bump');
    assert.equal(db.ledger(A).length, rows, 'no ledger row');
    assert.doesNotThrow(() => db.transaction(() => db.addIngotsTx(A, -before.ingots, 'test', null, 'neg:2')), 'spending everything is fine');
    assert.equal(load().ingots, 0);
    assert.throws(() => db.transaction(() => db.addIngotsTx('nobody', 5, 'test', null, 'neg:3')), 'an unknown character');
  });
});

describe('premium kill rewards (server)', () => {
  it('the key includes the map: the same monster uid on two maps in the same moment pays both', () => {
    const keys = [];
    const prem = createPremium({ db: { grantIngots: (id, n, reason, ref, key) => { keys.push(key); return { rev: 1, ingots: n }; } }, send: () => {}, pushChanges: () => {} });
    const players = [{ id: 'p1' }], mon = { uid: 7, id: 'wisp', chief: true };
    prem.kill(players, mon, 'forest');
    prem.kill(players, mon, 'swamp');
    assert.equal(keys.length, 2);
    assert.notEqual(keys[0], keys[1]);
    assert.ok(keys[0].includes('forest') && keys[1].includes('swamp'));
  });
});
