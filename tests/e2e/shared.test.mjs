// Shared monsters and parties through the real server, in two browsers: both players see the same monsters,
// the server computes every hit (the client only says which skill hit), EXP follows damage (or is split evenly in
// a party), loot goes to the top damager (or to every party member, each their own).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, newPage, startServer, register, createCharacter, uniqueName, until, shot } from './helpers.mjs';

describe('shared monsters and parties (online)', { timeout: 240_000 }, () => {
  let browser, server, A, B;
  const errors = [];

  async function player(tag, x) {
    const { page, errors: errs } = await newPage(browser);
    errs.push = (e) => errors.push(e);
    await page.goto(server.url); await page.waitForTimeout(800);
    await register(page, uniqueName('mob'), 'matkhau99');
    await createCharacter(page, 'swordsman', tag + String(Date.now() % 1e4));
    await page.evaluate((x) => {
      const w = __game(); w.player.invuln = 1e9; w.bots.list = []; w.bots.update = () => {};
      w.loadMap('forest', x); w.player.x = x;
      // record our rewards
      w.killLog = []; const f = w.onServerKill.bind(w); w.onServerKill = (k) => { w.killLog.push(k); f(k); };
      w.hitLog = []; const g = w.mobHit.bind(w); w.mobHit = (h) => { w.hitLog.push(h); g(h); };
    }, x);
    assert.ok(await until(page, '__game().net.ready && __game().remoteMobs.size > 0', 6000), 'shared monsters arrived');
    return { page, name: await page.evaluate('__game().ch.name') };
  }
  // a living shared monster both can reach: every hit counts, the amount is chosen by the test
  // the toughest plain monster (so it takes several hits)
  const pickMob = (p) => p.page.evaluate(() => {
    const w = __game();
    const m = [...w.remoteMobs.values()].filter((x) => !x.dead && !x.def.boss && !x.named && x.hp > 0 && !x.affix.has('reflect')).sort((a, b) => b.hp - a.hp)[0];
    return m ? { uid: m.uid, hp: m.hp, x: Math.round(m.cx) } : null;
  });
  const goTo = (p, x) => p.page.evaluate((x) => { const w = __game(); w.player.x = x - 7; }, x);
  // one basic attack on that monster, as our hit detection would report it (the server computes the damage)
  const hit = (p, uid) => p.page.evaluate((uid) => __game().net.hit({ uid, sid: 'sw_basic' }), uid);
  const alive = (p, uid) => p.page.evaluate((uid) => { const m = __game().remoteMobs.get(uid); return !!m && !m.dead; }, uid);
  // basic attacks at the skill's own pace until it dies
  async function killWith(p, uid) {
    for (let i = 0; i < 60 && (await alive(p, uid)); i++) { await hit(p, uid); await p.page.waitForTimeout(450); }
  }
  const kills = (p, uid) => p.page.evaluate((uid) => __game().killLog.filter((k) => k.uid === uid), uid);

  before(async () => {
    server = await startServer();
    browser = await launch();
    A = await player('Alpha', 600); B = await player('Beta', 640);
  });
  after(async () => { await browser?.close(); await server?.stop(); });

  it('both players see the same monsters', async () => {
    const uids = (p) => p.page.evaluate('[...__game().remoteMobs.keys()].sort((a, b) => a - b).join(",")');
    await A.page.waitForTimeout(500);
    assert.equal(await uids(A), await uids(B));
    // and they move the same way (server positions)
    const m = await pickMob(A);
    await A.page.waitForTimeout(600);
    const [xa, xb] = await Promise.all([A, B].map((p) => p.page.evaluate((uid) => Math.round(__game().remoteMobs.get(uid).tx), m.uid)));
    assert.ok(Math.abs(xa - xb) < 40, `same position (${xa} vs ${xb})`);
    await shot(A.page, 'shared-monsters.png');
  });

  it("a hit by A lowers the monster's HP for B too", async () => {
    const m = await pickMob(A);
    await goTo(A, m.x); await goTo(B, m.x);
    await A.page.waitForTimeout(300);
    await hit(A, m.uid);
    assert.ok(await until(B.page, `__game().remoteMobs.get(${m.uid}).hp < ${m.hp}`, 3000));
    // the number comes from the server, the same for both
    assert.ok(await until(A.page, `__game().hitLog.some((h) => h.uid === ${m.uid} && h.dmg > 0)`));
    const [ha, hb] = await Promise.all([A, B].map((p) => p.page.evaluate((uid) => __game().hitLog.find((h) => h.uid === uid).dmg, m.uid)));
    assert.equal(ha, hb);
  });

  it('a real attack (Z) on a shared monster is reported by skill and computed by the server', async () => {
    const m = await pickMob(A);
    await A.page.evaluate((uid) => { const w = __game(), mob = w.remoteMobs.get(uid); w.player.x = mob.x - 12; w.player.y = mob.standY - w.player.h; w.player.facing = 1; }, m.uid);
    await A.page.evaluate(() => { const w = __game(); w.sentHits = []; const f = w.net.hit.bind(w.net); w.net.hit = (h) => { w.sentHits.push(h); f(h); }; });
    for (let i = 0; i < 6 && !(await A.page.evaluate('__game().sentHits.length')); i++) {
      await A.page.evaluate((uid) => { const w = __game(), mob = w.remoteMobs.get(uid); w.player.x = mob.x - 12; }, m.uid);
      await A.page.keyboard.down('KeyZ'); await A.page.waitForTimeout(250); await A.page.keyboard.up('KeyZ');
    }
    const hits = await A.page.evaluate('__game().sentHits');
    assert.ok(hits.length > 0, 'the attack hit a shared monster');
    assert.deepEqual(Object.keys(hits[0]).sort(), ['sid', 'uid'], 'only which skill hit which monster: no damage number');
    assert.equal(hits[0].sid, 'sw_basic');
    assert.ok(await until(A.page, `__game().hitLog.some((h) => h.by === __game().ch.id)`), 'the server answered with the damage');
  });

  it('a damage number sent by the client is ignored', async () => {
    const m = await pickMob(A);
    await goTo(A, m.x); await A.page.waitForTimeout(500);
    await A.page.evaluate((uid) => __game().net.send({ t: 'hit', uid, sid: 'sw_basic', dmg: 999999 }), m.uid);
    assert.ok(await until(A.page, `__game().hitLog.some((h) => h.uid === ${m.uid})`));
    assert.ok(await A.page.evaluate((uid) => __game().remoteMobs.get(uid).hp > 0, m.uid), 'still alive');
  });

  it('no party: EXP by damage share, items and gold only for the top damager', async () => {
    const m = await pickMob(A);
    await goTo(A, m.x); await goTo(B, m.x); await A.page.waitForTimeout(300);
    await hit(B, m.uid); await B.page.waitForTimeout(300); // B: one hit
    await killWith(A, m.uid); // A: all the rest
    assert.ok(await until(A.page, `__game().killLog.some((k) => k.uid === ${m.uid})`, 4000), 'A rewarded');
    assert.ok(await until(B.page, `__game().killLog.some((k) => k.uid === ${m.uid})`, 4000), 'B rewarded');
    const [ka] = await kills(A, m.uid), [kb] = await kills(B, m.uid);
    assert.ok(ka.exp > kb.exp, `A did more damage: ${ka.exp} vs ${kb.exp}`);
    assert.ok(Array.isArray(ka.drops) && ka.gold !== undefined, 'A gets the loot');
    assert.equal(kb.drops, undefined, 'B gets EXP only');
  });

  it('G next to another player invites them to a party', async () => {
    const ax = await A.page.evaluate('__game().player.x');
    await goTo(B, ax + 30); await A.page.waitForTimeout(400);
    await A.page.keyboard.press('KeyG');
    assert.ok(await until(B.page, "!!document.querySelector('#partyAsk')"), 'B is asked');
    await B.page.locator('#partyAsk [data-yes="1"]').click();
    for (const p of [A, B]) assert.ok(await until(p.page, "!document.querySelector('#hParty').hidden && document.querySelectorAll('#hParty .pm').length === 2"), 'both see the party panel');
    assert.match(await B.page.locator('#hParty').innerText(), new RegExp(A.name));
    await shot(A.page, 'party.png');
  });

  it('party: EXP split evenly, each member gets their own drops', async () => {
    const m = await pickMob(A);
    await goTo(A, m.x); await goTo(B, m.x); await A.page.waitForTimeout(300);
    await killWith(A, m.uid); // B does nothing
    assert.ok(await until(B.page, `__game().killLog.some((k) => k.uid === ${m.uid})`, 4000));
    const [ka] = await kills(A, m.uid), [kb] = await kills(B, m.uid);
    assert.equal(ka.exp, kb.exp);
    assert.ok(Array.isArray(ka.drops) && Array.isArray(kb.drops), 'both get their own loot roll');
    assert.ok(ka.drops.every((d) => !kb.drops.some((e) => e.id === d.id)), 'different drops');
  });

  it('leaving the party', async () => {
    await B.page.locator('#hParty [data-pleave]').click();
    for (const p of [A, B]) assert.ok(await until(p.page, "document.querySelector('#hParty').hidden"));
  });

  it('a monster hurts the player that touches it (client-side contact with server positions)', async () => {
    const m = await pickMob(A);
    const before = await A.page.evaluate('__game().ch.hp');
    await A.page.evaluate((uid) => { const w = __game(), mob = w.remoteMobs.get(uid); w.player.invuln = 0; w.player.x = mob.x; w.player.y = mob.y + mob.h - w.player.h; }, m.uid);
    assert.ok(await until(A.page, `__game().ch.hp < ${before}`, 3000));
    await A.page.evaluate('__game().player.invuln = 1e9');
  });

  it('no page errors', () => assert.deepEqual(errors, []));
});
