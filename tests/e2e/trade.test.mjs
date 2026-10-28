// Player-to-player trade through the real server (Võ Lâm Truyền Kỳ style): ask with T, accept, put items and
// gold in, any change unlocks both, lock, confirm, swap in one transaction. Cancelling moves nothing.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, newPage, startServer, register, createCharacter, uniqueName, until, shot } from './helpers.mjs';

describe('trade (online)', { timeout: 180_000 }, () => {
  let browser, server, A, B;
  const errors = [];

  async function player(tag, x) {
    const { page, errors: errs } = await newPage(browser);
    errs.push = (e) => errors.push(e);
    const user = uniqueName('trade'), pass = 'matkhau99', name = tag + String(Date.now() % 1e4);
    await page.goto(server.url); await page.waitForTimeout(800);
    await register(page, user, pass);
    await createCharacter(page, 'swordsman', name);
    await page.evaluate((x) => { const w = __game(); w.player.invuln = 1e9; w.loadMap('village', x); w.player.x = x; w.ch.gold = 500; w.hooks.save(); }, x);
    assert.ok(await until(page, '__game().net.ready'));
    const token = (await server.api('auth/login', { username: user, password: pass })).token;
    const char = async () => (await server.api('characters', null, token)).characters[0];
    return { page, char, name };
  }
  const stack = (p, id) => p.page.evaluate((id) => __game().ch.inventory.find((e) => e.id === id), id);
  const open = (p) => until(p.page, "!!document.querySelector('#win:not([hidden]).w-trade')");
  const click = (p, sel) => p.page.locator(sel).first().click();

  before(async () => {
    server = await startServer();
    browser = await launch();
    A = await player('Alpha', 600); B = await player('Beta', 660);
    await A.page.waitForTimeout(800); // initial saves (gold) reach the server
    assert.ok(await until(A.page, '__game().remotes.size === 1') && await until(B.page, '__game().remotes.size === 1'));
  });
  after(async () => { await browser?.close(); await server?.stop(); });

  it('T next to another player asks for a trade; the other side accepts', async () => {
    await A.page.keyboard.press('KeyT');
    assert.ok(await until(B.page, "!!document.querySelector('#tradeAsk')"), 'B sees the request');
    assert.match(await B.page.locator('#tradeAsk').innerText(), new RegExp(A.name));
    await click(B, '#tradeAsk [data-yes="1"]');
    assert.ok(await open(A) && await open(B), 'both trade windows open');
  });

  it('items and gold put in show up on the other side', async () => {
    const hp = await stack(A, 'hp_s');
    await click(A, `.tbag [data-uid="${hp.uid}"]`);
    await A.page.fill('#tGold', '120'); await click(A, '[data-act="tgold"]');
    const mp = await stack(B, 'mp_s');
    await click(B, `.tbag [data-uid="${mp.uid}"]`);
    assert.ok(await until(B.page, `__game() && document.querySelectorAll('.tside:nth-child(2) .islot[data-uid]').length === 1 && document.querySelector('.tside:nth-child(2) .gold b').textContent === '120'`), "B sees A's potions and gold");
    assert.ok(await until(A.page, `document.querySelector('.tside:nth-child(2) [data-uid="${mp.uid}"]') !== null`), "A sees B's offer");
    await shot(A.page, 'trade.png');
  });

  it('an item in the trade cannot be sold or used meanwhile', async () => {
    const hp = await stack(A, 'hp_s');
    const before = hp.qty;
    // the same action as clicking "Dùng" in the bag
    await A.page.evaluate((uid) => __ui().act('use', { uid }), hp.uid);
    assert.equal(await A.page.evaluate("__game().ch.inventory.find((e) => e.id === 'hp_s').qty"), before);
  });

  it('changing an offer unlocks both sides', async () => {
    await click(A, '[data-act="tlock"]');
    assert.ok(await until(B.page, "document.querySelector('.tside:nth-child(2)').textContent.includes('Đã khóa')"));
    await click(B, `.tbag [data-uid="${(await stack(B, 'mp_s')).uid}"]`); // B takes its potions out again
    assert.ok(await until(A.page, "!document.querySelector('.tside:nth-child(1)').textContent.includes('Đã khóa')"), 'A was unlocked');
    await click(B, `.tbag [data-uid="${(await stack(B, 'mp_s')).uid}"]`); // and puts them back
    await until(A.page, "document.querySelectorAll('.tside:nth-child(2) .islot[data-uid]').length === 1");
  });

  it('both lock and confirm: items and gold are swapped, in the database too', async () => {
    const hp = await stack(A, 'hp_s'), mp = await stack(B, 'mp_s');
    const count = (p, id) => p.page.evaluate((id) => __game().ch.inventory.filter((e) => e.id === id).reduce((n, e) => n + e.qty, 0), id);
    const mpA = await count(A, 'mp_s'), hpB = await count(B, 'hp_s');
    const goldA = (await A.char()).gold, goldB = (await B.char()).gold;
    await click(A, '[data-act="tlock"]'); await click(B, '[data-act="tlock"]');
    assert.ok(await until(A.page, "!document.querySelector('[data-act=\"tconfirm\"]').disabled"));
    await click(A, '[data-act="tconfirm"]');
    await until(B.page, "!document.querySelector('[data-act=\"tconfirm\"]').disabled");
    await click(B, '[data-act="tconfirm"]');
    assert.ok(await until(A.page, "!document.querySelector('#win:not([hidden]).w-trade')") && await until(B.page, "!document.querySelector('#win:not([hidden]).w-trade')"), 'windows close');
    // received stacks merge into the stacks already in the bag
    assert.ok(await until(A.page, `!__game().ch.inventory.some((e) => e.uid === '${hp.uid}')`), 'A gave the health potions');
    assert.equal(await count(A, 'mp_s'), mpA + mp.qty, 'A got the mana potions');
    assert.equal(await count(B, 'hp_s'), hpB + hp.qty, 'B got the health potions');
    await A.page.waitForTimeout(600); // the merged stacks are saved back
    const a = await A.char(), b = await B.char();
    const total = (c, id) => c.inventory.filter((e) => e.id === id).reduce((n, e) => n + e.qty, 0);
    assert.deepEqual([total(a, 'mp_s'), total(a, 'hp_s'), total(b, 'hp_s')], [mpA + mp.qty, 0, hpB + hp.qty], 'database agrees');
    assert.equal(a.gold, goldA - 120); assert.equal(b.gold, goldB + 120);
    assert.equal(await A.page.evaluate('__game().ch.gold'), goldA - 120);
  });

  it('an old save of A cannot bring the traded potions back', async () => {
    const hp = (await B.char()).inventory.find((e) => e.id === 'hp_s');
    await A.page.evaluate((e) => { const w = __game(); w.ch.inventory.push({ ...e }); w.hooks.save(); }, hp);
    assert.ok(await until(A.page, `!__game().ch.inventory.some((e) => e.uid === '${hp.uid}')`, 5000), 'the server refused it');
    assert.ok((await B.char()).inventory.some((e) => e.uid === hp.uid), 'B still owns them');
  });

  it('cancelling moves nothing and tells the other side', async () => {
    const invA = (await A.char()).inventory.length;
    await A.page.keyboard.press('KeyT');
    await until(B.page, "!!document.querySelector('#tradeAsk')");
    await click(B, '#tradeAsk [data-yes="1"]');
    await open(A);
    await click(A, `.tbag [data-uid="${(await stack(A, 'mp_s')).uid}"]`);
    await A.page.waitForTimeout(300);
    await B.page.keyboard.press('Escape');
    assert.ok(await until(A.page, "!document.querySelector('#win:not([hidden]).w-trade')"));
    assert.ok(await until(A.page, "[...document.querySelectorAll('.toast')].some((t) => t.textContent.includes('hủy'))"));
    assert.equal((await A.char()).inventory.length, invA);
  });

  it('declining a request', async () => {
    await A.page.keyboard.press('KeyT');
    await until(B.page, "!!document.querySelector('#tradeAsk')");
    await click(B, '#tradeAsk [data-yes="0"]');
    assert.ok(await until(A.page, "[...document.querySelectorAll('.toast')].some((t) => t.textContent.includes('từ chối'))"));
  });

  it('too far away: no trade', async () => {
    await B.page.evaluate('__game().player.x = 1300');
    await A.page.waitForTimeout(500);
    await A.page.keyboard.press('KeyT');
    assert.ok(await until(A.page, "[...document.querySelectorAll('.toast')].some((t) => t.textContent.includes('Đứng gần'))"));
  });

  it('no page errors', () => assert.deepEqual(errors, []));
});
