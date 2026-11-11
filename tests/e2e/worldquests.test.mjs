// World quests (Genshin style): discovered on reaching the map, violet marker, chains in the quest log with their
// mood and progress, a choice at the end that sets a story flag and opens one branch, ghost NPCs that come and go,
// Nguyên Bảo rewards (offline right away; online granted by the server once the completion is saved).
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { launch, newPage, openGame, startServer, register, createCharacter, uniqueName, until, shot, talk, runDialog } from './helpers.mjs';
import { openDb } from '../../server/src/db.js';

describe('world quests (offline)', { timeout: 180_000 }, () => {
  let browser, page, errors;
  const E = (js) => page.evaluate(js);
  const set = (quests) => page.evaluate((q) => { const w = __game(); Object.assign(w.ch.quests, q); w.refreshNpcs(); }, quests);
  const npcs = () => E('__game().npcs.map((n) => n.id)');

  before(async () => {
    browser = await launch();
    ({ page, errors } = await newPage(browser));
    await openGame(page, 'swordsman', 'Lữ Khách');
    await E("(() => { const w = __game(); w.player.invuln = 1e9; w.bots.list = []; w.bots.update = () => {}; w.giveExp(400); w.ch.quests.m1 = { s: 'done', p: 1 }; w.ch.quests.m2 = { s: 'done', p: 8 }; })()");
  });
  after(() => browser?.close());

  it('reaching a map where a chain starts announces it, once', async () => {
    await E("__game().loadMap('village', 400)");
    assert.ok(await until(page, "__game().ch.flags.wq_lantern === 'seen'", 5000), 'discovered');
    assert.match(await page.locator('#hBanner').innerText(), /Đêm Hội Rước Đèn/);
  });

  it('the chain is in the quest log with its mood and progress', async () => {
    await page.keyboard.press('KeyL'); await page.waitForTimeout(200);
    const log = await page.locator('.w-quest').innerText();
    assert.match(log, /nhiệm vụ thế giới/i);
    assert.match(log, /Đêm Hội Rước Đèn/);
    assert.match(log, /Vui tươi/);
    assert.match(log, /0\/4/);
    await page.keyboard.press('Escape');
  });

  it('accept from Bé Bin, bring back the lantern: reward with Nguyên Bảo', async () => {
    await talk(page, 'kid_bin', 'village', 440);
    await page.click('[data-act="qaccept"][data-q="wq_lan1"]'); await runDialog(page);
    assert.equal((await E('__game().ch.quests.wq_lan1')).s, 'active');
    await E("__game().ch.inventory.push({ uid: 'lan1', id: 'q_star_lantern', qty: 1, r: 0, b: {} })");
    await page.keyboard.press('Escape');
    await talk(page, 'kid_bin', 'village', 440);
    await page.click('[data-act="qdone"][data-q="wq_lan1"]'); await runDialog(page);
    assert.equal((await E('__game().ch.quests.wq_lan1')).s, 'done');
    assert.equal(await E('__game().ch.ingots'), 5);
  });

  it('the chain finale asks for a choice; the choice is saved as a story flag', async () => {
    await page.keyboard.press('Escape');
    await set({ wq_lan2: { s: 'done', p: 8 }, wq_lan3: { s: 'done', p: 1 }, wq_lan4: { s: 'active', p: 10 } });
    await talk(page, 'kid_bin', 'village', 440);
    await page.click('[data-act="qdone"][data-q="wq_lan4"]');
    for (let i = 0; i < 12 && !(await page.locator('#win:not([hidden]) [data-act="qchoice"]').count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(120); }
    const labels = await page.locator('[data-act="qchoice"]').allInnerTexts();
    assert.equal(labels.length, 2, 'two answers');
    await shot(page, 'world-quest-choice.png');
    await page.click('[data-act="qchoice"][data-i="1"]'); await runDialog(page);
    assert.equal(await E('__game().ch.flags.lantern'), 'gift');
    assert.equal(await E('__game().ch.title'), 'Sứ Giả Trung Thu');
    assert.equal(await E('__game().ch.ingots'), 5 + 20);
  });

  it('dark chain: the ghost appears with her story, the choice opens only its own epilogue, then she is gone', async () => {
    await page.keyboard.press('Escape');
    await E("(() => { const w = __game(); w.giveExp(20000); w.ch.quests.st5 = { s: 'done', p: 1 }; w.loadMap('graveyard', 300); })()");
    await page.waitForTimeout(400);
    assert.ok(!(await npcs()).includes('ghost_girl'), 'no ghost before the story starts');
    await set({ wq_well1: { s: 'done', p: 1 }, wq_well2: { s: 'done', p: 1 }, wq_well3: { s: 'done', p: 1 }, wq_well4: { s: 'active', p: 10 } });
    assert.ok((await npcs()).includes('ghost_girl'), 'she is at the well');
    assert.ok(await E("__game().npcs.find((n) => n.id === 'ghost_girl').npc.ghost"), 'drawn as a ghost');
    await talk(page, 'ghost_girl', 'graveyard', 1180);
    await page.click('[data-act="qdone"][data-q="wq_well4"]');
    for (let i = 0; i < 12 && !(await page.locator('#win:not([hidden]) [data-act="qchoice"]').count()); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(120); }
    await page.click('[data-act="qchoice"][data-i="1"]'); await runDialog(page); // seal the well
    assert.equal(await E('__game().ch.flags.well'), 'seal');
    await page.keyboard.press('Escape');
    await talk(page, 'gravekeeper', 'graveyard', 260);
    assert.ok(await page.locator('[data-act="qaccept"][data-q="wq_well5b"]').count(), 'the sealed-well epilogue is offered');
    assert.equal(await page.locator('[data-act="qaccept"][data-q="wq_well5a"]').count(), 0, 'the other one is not');
    assert.ok(!(await npcs()).includes('ghost_girl'), 'the ghost is gone');
    await page.keyboard.press('Escape');
  });

  it('no page errors', () => assert.deepEqual(errors, []));
});

describe('world quests (online: Nguyên Bảo granted by the server)', { timeout: 120_000 }, () => {
  let browser, server, page, errors, db, charId;
  const E = (js) => page.evaluate(js);

  before(async () => {
    server = await startServer();
    browser = await launch();
    ({ page, errors } = await newPage(browser));
    await page.goto(server.url); await page.waitForTimeout(800);
    await register(page, uniqueName('wq'), 'matkhau99');
    await createCharacter(page, 'swordsman', 'Wq' + String(Date.now() % 1e4));
    assert.ok(await until(page, '!!__game().net && __game().net.connected', 5000));
    charId = await E('__game().ch.id');
    db = openDb(path.join(server.dataDir, 'game.db'));
    await E("(() => { const w = __game(); w.player.invuln = 1e9; w.giveExp(400); w.ch.quests.m1 = { s: 'done', p: 1 }; w.ch.quests.m2 = { s: 'done', p: 8 }; w.hooks.save(); })()");
    await page.waitForTimeout(800);
  });
  after(async () => { db?.close(); await browser?.close(); await server?.stop(); });

  it('a finished world quest: the server adds its Nguyên Bảo once the completion is saved', async () => {
    await talk(page, 'kid_bin', 'village', 440);
    await page.click('[data-act="qaccept"][data-q="wq_lan1"]'); await runDialog(page);
    await page.keyboard.press('Escape');
    await E("__game().ch.inventory.push({ uid: 'lanx', id: 'q_star_lantern', qty: 1, r: 0, b: {} })"); // a quest item: free
    await talk(page, 'kid_bin', 'village', 440);
    await page.click('[data-act="qdone"][data-q="wq_lan1"]'); await runDialog(page);
    assert.ok(await until(page, '__game().ch.ingots === 5', 6000), 'the balance comes back from the server');
    assert.equal(db.getCharacter(charId).ingots, 5);
  });

  it('claiming again (a reconnect) gives nothing more', async () => {
    await E("__game().net.premium('claim', { quest: 'wq_lan1' })"); await page.waitForTimeout(500);
    assert.equal(db.getCharacter(charId).ingots, 5);
  });

  it('no page errors', () => assert.deepEqual(errors, []));
});
