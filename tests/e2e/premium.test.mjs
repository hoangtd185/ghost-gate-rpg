// Vạn Bảo Các (premium shop) and Nguyên Bảo. Offline: check-in, try-on preview, buy and wear a cape, the merchant,
// a chieftain pays ingots. Online: the server owns the balance (a console edit is ignored), check-in once a day,
// purchases go through the server.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { launch, newPage, openGame, startServer, register, createCharacter, uniqueName, until, shot, talk } from './helpers.mjs';
import { GAME } from '../../shared/config.js';
import { openDb } from '../../server/src/db.js';

const PG = GAME.premium;

describe('premium shop (offline)', { timeout: 120_000 }, () => {
  let browser, page, errors;
  const E = (js) => page.evaluate(js);

  before(async () => {
    browser = await launch();
    ({ page, errors } = await newPage(browser));
    await openGame(page, 'assassin', 'Đại Gia');
    await E('(() => { const w = __game(); w.player.invuln = 1e9; w.bots.list = []; w.bots.update = () => {}; })()');
  });
  after(() => browser?.close());

  it('B opens Vạn Bảo Các with the balance and the check-in', async () => {
    await page.keyboard.press('KeyB'); await page.waitForTimeout(200);
    assert.ok(await page.locator('.w-premium').count());
    assert.equal(await page.locator('#pBal').innerText(), '0');
    await page.click('[data-act="pcheckin"]'); await page.waitForTimeout(200);
    assert.equal(await E('__game().ch.ingots'), PG.checkin.ingots);
    assert.ok(await page.locator('[data-act="pcheckin"]').isDisabled(), 'only once a day');
  });

  it('not enough ingots: the buy button is disabled', async () => {
    await page.click('[data-act="psel"][data-o="pc_sakura"]');
    assert.ok(await page.locator('[data-act="pbuy"]').isDisabled());
  });

  it('a live try-on preview, then buy and wear the cape', async () => {
    await E('__game().ch.ingots = 500');
    await page.click('[data-act="psel"][data-o="pc_phoenix"]'); await page.waitForTimeout(500);
    const painted = await E("(() => { const c = document.getElementById('pPreview'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 200) n++; return n; })()");
    assert.ok(painted > 2000, `the preview draws the character (${painted} px)`);
    await shot(page, 'premium-shop.png');
    await page.click('[data-act="pbuy"][data-o="pc_phoenix"]'); await page.waitForTimeout(200);
    assert.equal(await E('__game().ch.ingots'), 500 - 180);
    const cape = await E("__game().ch.inventory.find((e) => e.id === 'cape_phoenix')");
    assert.equal(cape.r, 3);
    assert.ok(await page.locator('.pcard.sel .pown').count(), 'marked as owned');
    await E(`(() => { const w = __game(); const ui = __ui(); ui.close(); ui.act('equip', { uid: '${cape.uid}' }); })()`);
    assert.equal(await E('__game().player.look.liveCape.hem'), 'flame');
  });

  it('the merchant in the village opens the shop', async () => {
    await talk(page, 'merchant', 'village', 1085);
    await page.click('[data-act="premwin"]'); await page.waitForTimeout(200);
    assert.ok(await page.locator('.w-premium').count());
    await page.keyboard.press('Escape');
  });

  it('a chieftain pays Nguyên Bảo', async () => {
    const before = await E('__game().ch.ingots');
    await E("(() => { const w = __game(); w.giveExp(3000); w.loadMap('forest', 300); })()");
    await page.waitForTimeout(400);
    await E(`(() => { const w = __game(); const g = w.spawnGroups[0]; const r = Math.random; Math.random = () => 0.001;
      try { w.spawnMonster(g); } finally { Math.random = r; }
      const c = w.monsters.find((m) => m.chief); c.hitByPlayer = true; w.damageMonster(c, 999999, 'player'); })()`);
    await page.waitForTimeout(300);
    assert.equal(await E('__game().ch.ingots'), before + PG.kill.chief);
  });

  it('no page errors', () => assert.deepEqual(errors, []));
});

describe('premium shop (online, the server owns the balance)', { timeout: 120_000 }, () => {
  let browser, server, page, errors, db, charId;
  const E = (js) => page.evaluate(js);

  before(async () => {
    server = await startServer();
    browser = await launch();
    ({ page, errors } = await newPage(browser));
    await page.goto(server.url); await page.waitForTimeout(800);
    await register(page, uniqueName('vip'), 'matkhau99');
    await createCharacter(page, 'taoist', 'Vip' + String(Date.now() % 1e4));
    assert.ok(await until(page, '!!__game().net && __game().net.connected', 5000));
    charId = await E('__game().ch.id');
    db = openDb(path.join(server.dataDir, 'game.db'));
  });
  after(async () => { db?.close(); await browser?.close(); await server?.stop(); });

  it('check-in through the server; ingots won elsewhere arrive with it', async () => {
    db.grantIngots(charId, 300, 'test', null, 'e2e:seed'); // as if won from field bosses
    await page.keyboard.press('KeyB'); await page.waitForTimeout(200);
    await page.click('[data-act="pcheckin"]');
    assert.ok(await until(page, `__game().ch.ingots === ${300 + PG.checkin.ingots}`), 'balance from the server');
    assert.ok(await until(page, "document.querySelector('[data-act=\"pcheckin\"]').disabled"));
    await E("__game().net.premium('checkin')"); await page.waitForTimeout(400);
    assert.equal(db.getCharacter(charId).ingots, 300 + PG.checkin.ingots, 'a second check-in the same day is refused');
  });

  it('a balance edited in the console is never saved', async () => {
    await E('(() => { const w = __game(); w.ch.ingots = 999999; w.hooks.save(); })()');
    await page.waitForTimeout(1200);
    assert.equal(db.getCharacter(charId).ingots, 300 + PG.checkin.ingots);
  });

  it('a purchase goes through the server', async () => {
    await E(`__game().ch.ingots = ${300 + PG.checkin.ingots}`);
    await page.click('[data-act="psel"][data-o="pc_shadow"]');
    await page.click('[data-act="pbuy"][data-o="pc_shadow"]');
    assert.ok(await until(page, "__game().ch.inventory.some((e) => e.id === 'cape_shadow')"), 'the cape arrives');
    const left = 300 + PG.checkin.ingots - 180;
    assert.ok(await until(page, `__game().ch.ingots === ${left}`));
    const saved = db.getCharacter(charId);
    assert.equal(saved.ingots, left);
    assert.ok(saved.inventory.some((e) => e.id === 'cape_shadow' && e.r === 3));
  });

  it('a lost answer does not leave the button disabled, and retrying never buys twice', async () => {
    // the first request never reaches the server (a dropped connection); later ones do
    await E(`(() => { const n = __game().net, send = n.send.bind(n); window.__prem = []; window.__drop = true;
      n.send = (m) => { if (m.t === 'prem') { window.__prem.push(m); if (window.__drop) { window.__drop = false; return; } } return send(m); }; })()`);
    const price = 120; // pc_sakura
    const before = db.getCharacter(charId);
    await page.click('[data-act="psel"][data-o="pc_sakura"]');
    await page.click('[data-act="pbuy"][data-o="pc_sakura"]');
    assert.ok(await E("document.querySelector('[data-act=\"pbuy\"]').disabled"), 'disabled while waiting');
    assert.ok(await until(page, "!document.querySelector('[data-act=\"pbuy\"]').disabled", (PG.replyTimeoutSec + 3) * 1000), 'enabled again after the timeout');
    assert.equal(db.getCharacter(charId).ingots, before.ingots, 'nothing was bought yet');
    await page.click('[data-act="pbuy"][data-o="pc_sakura"]');
    assert.ok(await until(page, "__game().ch.inventory.some((e) => e.id === 'cape_sakura')"), 'the retry buys it');
    const sent = await E('window.__prem');
    assert.equal(sent.length, 2);
    assert.equal(sent[0].req, sent[1].req, 'the retry reuses the request id');
    await page.waitForTimeout(300);
    const saved = db.getCharacter(charId);
    assert.equal(saved.ingots, before.ingots - price, 'charged once');
    assert.equal(saved.inventory.filter((e) => e.id === 'cape_sakura').length, 1);
  });

  it('no page errors', () => assert.deepEqual(errors, []));
});
