// Through the real API server: register, create a character, play and save.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, newPage, startServer, register, createCharacter, uniqueName } from './helpers.mjs';

describe('server round trip', { timeout: 120_000 }, () => {
  let browser, page, errors, server;
  before(async () => { server = await startServer(); browser = await launch(); ({ page, errors } = await newPage(browser)); });
  after(async () => { await browser?.close(); await server?.stop(); });

  it('register, create a character, play and save', async () => {
    await page.goto(server.url); await page.waitForTimeout(1200);
    await register(page, uniqueName('uat'), 'matkhau99');
    await createCharacter(page, 'taoist', 'Thật Sự');
    assert.equal(await page.evaluate('typeof window.__game'), 'function', 'debug tools on localhost');
    await page.evaluate('(() => { const w = __game(); w.giveExp(30000); for (let i = 0; i < 10; i++) { w.ch.stats.int++; w.ch.statPoints--; } w.ch.skills.ta_p1 = 2; w.ch.skillPoints -= 2; w.hooks.save(); })()');
    await page.waitForTimeout(1500);
    assert.equal(await page.locator('#hSave').innerText(), 'Đã lưu');
  });

  it('no page errors', () => assert.deepEqual(errors, []));
});
