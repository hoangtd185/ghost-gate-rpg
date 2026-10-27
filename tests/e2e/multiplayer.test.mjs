// Multiplayer stage 1 through the real server: two players see each other, movement syncs,
// map and world chat, gear changes show up for others, map changes and disconnects are handled.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, newPage, startServer, register, createCharacter, uniqueName, shot } from './helpers.mjs';

// Poll a page expression until it is truthy (network timing varies)
async function until(page, expr, ms = 4000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await page.evaluate(expr);
    if (v || Date.now() > end) return v;
    await page.waitForTimeout(100);
  }
}

describe('multiplayer presence and chat', { timeout: 180_000 }, () => {
  let browser, server, A, B, nameA, nameB, idA, idB;
  const errors = [];

  async function player(name) {
    const { context, page, errors: errs } = await newPage(browser);
    errs.push = (e) => errors.push(e); // collect into one list
    await page.goto(server.url); await page.waitForTimeout(800);
    await register(page, uniqueName('mp'), 'matkhau99');
    await createCharacter(page, 'swordsman', name);
    await page.evaluate("(() => { const w = __game(); w.player.invuln = 99999; w.loadMap('village', 400); w.player.x = 400; })()");
    return { context, page };
  }

  before(async () => {
    server = await startServer();
    browser = await launch();
    const tag = String(Date.now() % 1e4);
    nameA = 'Alpha' + tag; nameB = 'Beta' + tag;
    A = await player(nameA);
    B = await player(nameB);
    idA = await A.page.evaluate('__game().ch.id');
    idB = await B.page.evaluate('__game().ch.id');
  });
  after(async () => { await browser?.close(); await server?.stop(); });

  it('both players see each other on the same map', async () => {
    assert.ok(await until(A.page, `__game().remotes.has('${idB}')`), 'A sees B');
    assert.ok(await until(B.page, `__game().remotes.has('${idA}')`), 'B sees A');
    assert.equal(await A.page.evaluate(`__game().remotes.get('${idB}').name`), nameB);
  });

  it('reloading the same map (respawn, teleport) still shows the other player', async () => {
    await B.page.evaluate("__game().loadMap('village', 450)");
    assert.equal(await B.page.evaluate(`__game().remotes.has('${idA}')`), false, 'cleared on load');
    assert.ok(await until(B.page, `__game().remotes.has('${idA}')`), 'fresh snapshot after re-entering');
    assert.ok(await A.page.evaluate(`__game().remotes.has('${idB}')`), 'A never lost B');
  });

  it('the HUD shows the real player count', async () => {
    assert.ok(await until(A.page, "document.querySelector('#hOnline').textContent.includes('2 người chơi')"));
  });

  it('movement is synced', async () => {
    await B.page.evaluate('__game().player.x = 900');
    assert.ok(await until(A.page, `Math.abs(__game().remotes.get('${idB}').x - 900) < 3`), 'A sees B at x=900');
    await A.page.evaluate("(() => { const w = __game(); w.player.x = 860; w.camX = 600; })()");
    await A.page.waitForTimeout(400);
    await shot(A.page, 'multiplayer.png');
  });

  it('map chat reaches the other player with a speech bubble', async () => {
    await B.page.fill('#chatIn', 'xin chào <b>A</b>'); await B.page.press('#chatIn', 'Enter');
    assert.ok(await until(A.page, "[...document.querySelectorAll('#chatLog .cl')].some((e) => e.textContent.includes('xin chào <b>A</b>'))"), 'text arrives, HTML shown as text');
    assert.ok(await A.page.evaluate(`!!__game().remotes.get('${idB}').say`), 'speech bubble above B');
    assert.equal(await A.page.evaluate("document.querySelectorAll('#chatLog b').length > 0 && [...document.querySelectorAll('#chatLog .cl b')].every((b) => !b.textContent.includes('<'))"), true);
  });

  it('gear changes show up for others after a save', async () => {
    await B.page.evaluate("(() => { const w = __game(); w.ch.equip.outfit = { uid: 'mpout1', id: 'out_peach_fairy', qty: 1, r: 3, b: {} }; w.recalc(); w.player.refreshLook(); w.hooks.save(); })()");
    assert.ok(await until(A.page, `!!__game().remotes.get('${idB}').look.ribbons`, 6000), 'A sees the fairy outfit (ribbons) on B');
  });

  it('a player on another map is not shown; world chat still arrives', async () => {
    await B.page.evaluate("__game().loadMap('forest', 300)");
    assert.ok(await until(A.page, `!__game().remotes.has('${idB}')`), 'B left the village');
    assert.equal(await B.page.evaluate(`__game().remotes.has('${idA}')`), false);
    await A.page.fill('#chatIn', '!loa loa toàn server'); await A.page.press('#chatIn', 'Enter');
    assert.ok(await until(B.page, "[...document.querySelectorAll('#chatLog .cl.world')].some((e) => e.textContent.includes('loa loa toàn server'))"));
  });

  it('coming back to the map shows the player again', async () => {
    await B.page.evaluate("__game().loadMap('village', 500)");
    assert.ok(await until(A.page, `__game().remotes.has('${idB}')`));
    assert.ok(await until(B.page, `__game().remotes.has('${idA}')`));
  });

  it('closing the tab removes the player for others', async () => {
    await B.page.close();
    assert.ok(await until(A.page, `!__game().remotes.has('${idB}')`, 6000));
    assert.ok(await until(A.page, "document.querySelector('#hOnline').textContent.includes('1 người chơi')"));
  });

  it('a malformed login on the socket is refused and the server keeps running', async () => {
    const { WebSocket } = await import('ws');
    const ws = new WebSocket(server.url.replace('http', 'ws') + 'ws');
    const reply = await new Promise((resolve, reject) => {
      ws.on('open', () => ws.send(JSON.stringify({ t: 'hello', token: 'abc.' + 'é'.repeat(43), char: 'x' })));
      ws.on('message', (d) => resolve(JSON.parse(d.toString())));
      ws.on('error', reject);
      setTimeout(() => reject(new Error('no answer')), 3000);
    });
    ws.close();
    assert.deepEqual(reply, { t: 'error', msg: 'auth' });
    assert.equal((await server.api('health')).ok, true);
  });

  it('a flood of map entries is throttled, and the last one still gets its snapshot', async () => {
    const { WebSocket } = await import('ws');
    const { newCharacter } = await import('../../client/src/game/character.js');
    const { token } = await server.api('auth/register', { username: uniqueName('flood'), password: 'matkhau99' });
    const ch = (await server.api('characters', { character: newCharacter('Flood' + (Date.now() % 1e4), 'swordsman') }, token)).character;
    const ws = new WebSocket(server.url.replace('http', 'ws') + 'ws');
    const snaps = [];
    ws.on('message', (d) => { const m = JSON.parse(d.toString()); if (m.t === 'snap') snaps.push(m.map); });
    await new Promise((r) => ws.on('open', r));
    ws.send(JSON.stringify({ t: 'hello', token, char: ch.id }));
    await new Promise((r) => setTimeout(r, 300));
    for (let i = 0; i < 60; i++) ws.send(JSON.stringify({ t: 'pos', map: i === 59 ? 'forest' : 'village', x: 100 + i, y: 250, vx: 0, f: 1, a: 'idle', enter: 1 }));
    await new Promise((r) => setTimeout(r, 1200));
    ws.close();
    assert.ok(snaps.length >= 2 && snaps.length <= 4, `60 entries -> ${snaps.length} snapshots`);
    assert.equal(snaps.at(-1), 'forest', 'the newest entry is the one applied');
  });

  it('no page errors', () => assert.deepEqual(errors, []));
});
