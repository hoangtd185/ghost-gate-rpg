// Save queue against the real server, for changes the client makes itself (shop purchases here; monster drops
// are committed by the server at pickup, see loot.test.mjs):
//  1. a save goes out right away (no waiting for the 20 s autosave)
//  2. bought while the server is unreachable -> kept in the local outbox -> restored and uploaded on the next login
//  3. bought and the tab closed at once (like Alt+F4) -> still saved by the keepalive upload
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, startServer, register, createCharacter, uniqueName } from './helpers.mjs';

const USER = uniqueName('queue'), PASS = 'matkhau99';
// what the shop does: add the item and save
const pick = (page, id) => page.evaluate((id) => { const w = __game(); w.ch.inventory.push({ uid: 'buy' + Date.now(), id, qty: 3, r: 0, b: {} }); w.hooks.save(); }, id);

describe('save queue', { timeout: 120_000 }, () => {
  let browser, context, page, server, token;
  const errors = [];
  // Ask the server directly, outside the browser, so the outbox cannot interfere
  const serverItems = async () => {
    token ??= (await server.api('auth/login', { username: USER, password: PASS })).token;
    return (await server.api('characters', null, token)).characters[0].inventory.map((e) => e.id);
  };
  const watch = (p) => p.on('pageerror', (e) => errors.push(String(e)));
  const blockSaves = (route) => route.abort('internetdisconnected');

  before(async () => {
    server = await startServer();
    browser = await launch();
    context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    page = await context.newPage(); watch(page);
    await page.goto(server.url); await page.waitForTimeout(1000);
    await register(page, USER, PASS);
    await createCharacter(page, 'swordsman', 'Hàng Đợi ' + USER.slice(-3));
    await page.waitForTimeout(600);
  });
  after(async () => { await browser?.close(); await server?.stop(); });

  it('a save goes out right away', async () => {
    await pick(page, 'hp_l'); await page.waitForTimeout(600);
    assert.ok((await serverItems()).includes('hp_l'));
  });

  it('while the server is unreachable the save stays in the local outbox', async () => {
    await context.route('**/api/characters/**', blockSaves);
    await pick(page, 'mp_l'); await page.waitForTimeout(800);
    assert.match(await page.locator('#hSave').innerText(), /giữ trên máy/);
    const inOutbox = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('qmq_outbox'))
      .some((k) => Object.values(JSON.parse(localStorage[k])).some((c) => c.inventory.some((e) => e.id === 'mp_l'))));
    assert.ok(inOutbox);
    // a real disconnect would also kill the last keepalive upload; block it so only the outbox can save us
    await page.evaluate(() => { const f = window.fetch; window.fetch = (u, o) => (o && o.keepalive ? Promise.reject(new Error('offline')) : f(u, o)); });
    await page.close({ runBeforeUnload: true });
    await new Promise((r) => setTimeout(r, 500));
    await context.unroute('**/api/characters/**', blockSaves);
    assert.ok(!(await serverItems()).includes('mp_l'), 'server does not have it yet');
  });

  it('the next login restores the item from the outbox and uploads it', async () => {
    page = await context.newPage(); watch(page);
    await page.goto(server.url); await page.waitForTimeout(1500);
    await page.click('[data-play]'); await page.waitForTimeout(1200);
    assert.ok((await page.evaluate('__game().ch.inventory.map((e) => e.id)')).includes('mp_l'));
    assert.ok((await serverItems()).includes('mp_l'));
  });

  it('an item picked right before closing the tab is saved', async () => {
    await pick(page, 'scroll_home');
    await page.close({ runBeforeUnload: true });
    await new Promise((r) => setTimeout(r, 1000));
    assert.ok((await serverItems()).includes('scroll_home'));
  });

  it('no page errors', () => assert.deepEqual(errors, []));
});
