// Personal loot through the real server (personal story bosses report their kills; shared monsters are in
// shared.test.mjs): the server rolls drops for the killer only, a pickup is committed to the
// database before the client hears back, forged items in a save are refused, missed changes are replayed.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, newPage, startServer, register, createCharacter, uniqueName, until, shot } from './helpers.mjs';

describe('personal loot (online)', { timeout: 180_000 }, () => {
  let browser, server, A, B;
  const errors = [];

  async function player(tag) {
    const { page, errors: errs } = await newPage(browser);
    errs.push = (e) => errors.push(e);
    const user = uniqueName('loot'), pass = 'matkhau99';
    await page.goto(server.url); await page.waitForTimeout(800);
    await register(page, user, pass);
    await createCharacter(page, 'swordsman', tag + String(Date.now() % 1e4));
    // a quiet spot on the field: no monsters around, cannot be hurt
    await page.evaluate("(() => { const w = __game(); w.player.invuln = 1e9; w.loadMap('field', 1500); w.monsters = []; w.spawnGroups = []; w.bots.list = []; w.player.x = 1500; })()");
    assert.ok(await until(page, '__game().net.ready'), 'connected and on the map');
    const token = (await server.api('auth/login', { username: user, password: pass })).token;
    const items = async () => (await server.api('characters', null, token)).characters[0].inventory;
    return { page, items };
  }
  // record the server's answers to kill reports
  const recordLoot = (page) => page.evaluate("(() => { const w = __game(); w.lootLog = []; const f = w.serverLoot.bind(w); w.serverLoot = (m) => { w.lootLog.push(m); f(m); }; })()");
  // drops land 200 px away so they are not picked up by standing on them (still within pickup range)
  const killBoss = (page) => page.evaluate("__game().net.kill({ mob: 'scarecrow', named: 'nb_scarecrow', x: 1700, y: 250 })");
  const serverDrops = (page) => page.evaluate("__game().drops.filter((d) => d.sid && !d.taken).map((d) => d.data.id)");
  const pickAll = (page) => page.evaluate("(() => { const w = __game(); for (const d of w.drops.filter((d) => d.sid)) w.pickupDrop(d, w.player.cx, w.player.y); })()");

  before(async () => {
    server = await startServer();
    browser = await launch();
    A = await player('Alpha'); B = await player('Beta');
    await recordLoot(A.page); await recordLoot(B.page);
  });
  after(async () => { await browser?.close(); await server?.stop(); });

  it('a kill report gives drops to the killer only', async () => {
    await killBoss(A.page);
    assert.ok(await until(A.page, '__game().lootLog.length === 1'));
    const ids = await serverDrops(A.page);
    for (const id of ['stone', 'hp_l']) assert.ok(ids.includes(id), `boss always drops ${id}`);
    assert.ok(ids.some((id) => id.startsWith('gem_')), 'and a gem');
    assert.deepEqual(await serverDrops(B.page), [], 'B sees none of them');
    await A.page.waitForTimeout(500);
    await shot(A.page, 'loot-drops.png');
  });

  it('a pickup is in the database before the client is told', async () => {
    await pickAll(A.page); // (some may already have been picked up by walking over them)
    assert.ok(await until(A.page, '__game().ch.itemRev >= 3'), 'three item changes applied');
    const inv = await A.items();
    assert.ok(inv.some((e) => e.id === 'stone') && inv.some((e) => e.id.startsWith('gem_')), 'saved on the server');
    assert.deepEqual(await serverDrops(A.page), []);
  });

  it('the same boss again right away gives nothing (cooldown)', async () => {
    await killBoss(A.page);
    assert.ok(await until(A.page, '__game().lootLog.length === 2'));
    assert.equal(await A.page.evaluate('__game().lootLog[1].why'), 'named_cooldown');
  });

  it('a field boss kill report gives nothing (field bosses are shared: the server rewards them itself)', async () => {
    await A.page.evaluate("__game().net.kill({ mob: 'fox', named: 'fb_fox', x: 1500, y: 250 })");
    assert.ok(await until(A.page, '__game().lootLog.length === 3'));
    assert.equal(await A.page.evaluate('__game().lootLog[2].why'), 'shared');
  });

  it('a kill report for a shared monster is refused (the server saw it die itself)', async () => {
    const mob = await A.page.evaluate("[...new Set(__game().map.spawns.map((s) => s.mob))][0]");
    await A.page.evaluate((mob) => { const w = __game(); for (let i = 0; i < 40; i++) w.net.kill({ mob, x: 1500, y: 250 }); }, mob);
    assert.ok(await until(A.page, '__game().lootLog.length === 43'));
    assert.ok(await A.page.evaluate("__game().lootLog.slice(3).every((m) => m.why === 'shared' && !m.drops.length)"));
    await A.page.evaluate("(() => { const w = __game(); w.drops = []; })()");
  });

  it('closing the tab right after a pickup keeps the item (no client save needed)', async () => {
    await killBoss(B.page);
    assert.ok(await until(B.page, '__game().lootLog.length === 1'));
    // block the client's own saves: only the server-side commit can keep the items
    await B.page.route('**/api/characters/**', (r) => r.abort());
    await pickAll(B.page);
    await B.page.waitForTimeout(400);
    await B.page.close();
    const inv = await B.items();
    assert.ok(inv.some((e) => e.id === 'stone') && inv.some((e) => e.id === 'hp_l'));
  });

  it('an item the client invents is refused by the server and removed', async () => {
    await A.page.evaluate("(() => { const w = __game(), p = w.player; w.pickupDrop({ kind: 'item', data: { id: 'out_phoenix', qty: 1, r: 3, b: {} }, taken: false }, p.cx, p.y); w.hooks.save(); })()");
    assert.ok(await until(A.page, "!__game().ch.inventory.some((e) => e.id === 'out_phoenix')", 5000), 'client corrected after the save');
    assert.ok(!(await A.items()).some((e) => e.id === 'out_phoenix'));
  });

  it('changes missed while disconnected are replayed on reconnect', async () => {
    // pretend the answers for the last pickups never arrived
    const lost = await A.page.evaluate("(() => { const w = __game(); const gems = w.ch.inventory.filter((e) => e.id.startsWith('gem_')); w.ch.inventory = w.ch.inventory.filter((e) => !e.id.startsWith('gem_')); w.ch.itemRev = 0; w.net.ws.close(); return gems.length; })()");
    assert.ok(lost > 0);
    assert.ok(await until(A.page, "__game().ch.inventory.some((e) => e.id.startsWith('gem_')) && __game().ch.itemRev >= 3", 8000));
  });

  it('no page errors', () => assert.deepEqual(errors, []));
});
