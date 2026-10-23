// Crafting at the embroiderer: tutorial recipe, then a fairy outfit from farmed materials.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, newPage, openGame, runDialog, shot } from './helpers.mjs';

describe('crafting', { timeout: 120_000 }, () => {
  let browser, page, errors;
  const E = (js) => page.evaluate(js);
  const visit = async () => {
    await E('(() => { const w = __game(); w.player.x = 1323; w.player.y = 250; })()');
    await page.waitForTimeout(300); await page.keyboard.press('KeyE'); await page.waitForTimeout(300);
  };

  before(async () => {
    browser = await launch();
    ({ page, errors } = await newPage(browser));
    await openGame(page, 'assassin', 'Thợ Thêu');
    await E("(() => { const w = __game(); w.giveExp(3000); w.ch.quests.m1 = { s: 'done', p: 1 }; w.ch.quests.m2 = { s: 'done', p: 8 }; w.ch.gold = 50000; })()");
  });
  after(() => browser?.close());

  it('tutorial: craft a potion', async () => {
    await visit();
    await page.click('[data-act="qaccept"][data-q="tut_craft"]'); await runDialog(page);
    await page.click('[data-act="craftwin"]'); await page.click('[data-act="csel"][data-r="r_hp"]');
    await page.click('[data-act="craft"][data-n="1"]'); await page.waitForTimeout(200);
    assert.ok(((await E('__game().ch.quests.tut_craft')) || {}).p >= 1);
  });

  it('craft the peach fairy outfit and consume the materials', async () => {
    await E("(() => { const w = __game(); for (const [id, n] of [['mat_peach', 45], ['mat_tail', 20], ['mat_wisp', 20], ['mat_dew', 1], ['mat_icesilk', 12]]) w.ch.inventory.push({ uid: id + 'x', id, qty: n, r: 0, b: {} }); })()");
    await page.click('[data-act="csel"][data-r="r_peach_fairy"]'); await page.click('[data-act="craft"][data-n="1"]'); await page.waitForTimeout(300);
    await shot(page, 'craft_outfit.png');
    assert.ok(await E("__game().ch.inventory.some((e) => e.id === 'out_peach_fairy')"));
    assert.equal(await E("__game().ch.inventory.filter((e) => e.id === 'mat_dew').length"), 0);
  });

  it('no page errors', () => assert.deepEqual(errors, []));
});
