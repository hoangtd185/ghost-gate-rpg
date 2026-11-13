// Server event Xâm Lăng Dương Ác (in the style of Ghost Online's Invasion of Yangak).
// Offline: the keeper offers a practice run of the same floors (traps on a shared clock, exits sealed until the
// floor's goal is met, revive where you fell, the Silver Guard at the end). Online (EVENT_ALWAYS_OPEN): every player
// who joins runs the same floors together, the server ranks damage live, and when the run ends everyone gets a reward.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, newPage, openGame, startServer, register, createCharacter, uniqueName, until, shot } from './helpers.mjs';

const KEEPER_X = 1255;
// put the trap clock of the current floor at `t` seconds (traps are pure functions of it)
const setClock = (page, t) => page.evaluate((t) => { __game().dg.t0 = Date.now() - t * 1000; }, t);
const stand = (page, x, y) => page.evaluate(([x, y]) => { const p = __game().player; p.x = x - 7; p.y = y - p.h - 1; p.vy = 0; p.vx = 0; }, [x, y]);
// jump straight to a floor of a practice run (offline only: online the server decides); the Silver Guard stays last
const floor = (page, map) => page.evaluate((m) => { const w = __game(); w.dungeonGo({ inst: 'local', d: 'yangak', floors: w.dg.floors.includes(m) ? w.dg.floors : [...w.dg.floors.slice(0, -1), m, w.dg.floors.at(-1)], map: m, t0: Date.now(), now: Date.now() }); }, map);
const killAll = (page, only = null) => page.evaluate((only) => { const w = __game(); for (const m of [...w.monsters]) if (!only || m.id === only) { m.hitByPlayer = true; w.damageMonster(m, 9999999, 'player'); } }, only);

describe('event (offline practice)', { timeout: 180_000 }, () => {
  let browser, page, errors;
  const E = (f, a) => page.evaluate(f, a);
  const open = async () => { await stand(page, KEEPER_X, 296); await page.waitForTimeout(300); await page.keyboard.press('KeyE'); await page.waitForTimeout(300); };
  const up = async () => { await page.waitForTimeout(1100); await page.keyboard.press('ArrowUp'); await page.waitForTimeout(500); };
  const exit = (page) => page.evaluate(() => __game().map.exit);

  before(async () => {
    browser = await launch();
    ({ page, errors } = await newPage(browser));
    await openGame(page, 'swordsman', 'Vượt Ải');
    await E(() => { const w = __game(); w.bots.list = []; w.bots.update = () => {}; });
  });
  after(() => browser?.close());

  it('the keeper offers practice; below the level it refuses, then a run of 9 floors starts at the falling rocks', async () => {
    await open();
    const btn = page.locator('[data-act="dungeon"]');
    assert.ok(await btn.count(), 'the keeper offers the event');
    assert.match(await btn.textContent(), /Luyện tập/);
    await btn.click(); await page.waitForTimeout(300);
    assert.equal(await E(() => __game().mapId), 'village', 'level 1 is too low');
    await E(() => { const w = __game(); w.giveExp(60000); w.player.invuln = 1e9; });
    await open(); await page.click('[data-act="dungeon"]'); await page.waitForTimeout(800);
    assert.equal(await E(() => __game().mapId), 'yg_jump');
    const floors = await E(() => __game().dg.floors);
    assert.equal(floors.length, 9);
    assert.deepEqual([floors[3], floors[7], floors[8]], ['yg_gate', 'yg_giants', 'yg_silver']);
    await shot(page, 'event_jump.png');
  });

  it('a "reach" floor: the gate high up takes you to the next floor', async () => {
    const ex = await exit(page);
    await stand(page, ex.x, ex.y); await up();
    assert.equal(await E(() => __game().mapId), await E(() => __game().dg.floors[1]));
  });

  it('spikes only hurt while they are up', async () => {
    await floor(page, 'yg_white'); await page.waitForTimeout(400);
    await E(() => { const w = __game(); w.sim.monsters.forEach((m) => { m.x = 1400; }); w.player.invuln = 0; w.ch.hp = w.stats.maxHp; });
    await setClock(page, 0.2); await stand(page, 595, 296); await page.waitForTimeout(300);
    const hp = await E(() => __game().ch.hp);
    assert.equal(hp, await E(() => __game().stats.maxHp), 'spikes down: no damage');
    await setClock(page, 2.4); await page.waitForTimeout(300);
    await shot(page, 'event_spikes.png');
    assert.ok((await E(() => __game().ch.hp)) < hp, 'spikes up: hurt');
  });

  it('a "clear" floor stays sealed until every monster is dead, and they do not come back', async () => {
    await E(() => { __game().player.invuln = 1e9; });
    const ex = await exit(page);
    await stand(page, ex.x, ex.y); await up();
    assert.equal(await E(() => __game().mapId), 'yg_white', 'sealed');
    const before = await E(() => [__game().ch.level, __game().ch.exp, __game().ch.gold]);
    await killAll(page); await page.waitForTimeout(600);
    assert.deepEqual(await E(() => [__game().ch.level, __game().ch.exp, __game().ch.gold]), before, 'a practice run gives no EXP or gold');
    assert.equal(await E(() => __game().drops.length), 0, 'and no drops');
    assert.equal(await E(() => __game().monsters.filter((m) => !m.dead).length), 0, 'no respawn');
    await stand(page, ex.x, ex.y); await up();
    assert.notEqual(await E(() => __game().mapId), 'yg_white');
  });

  it('a "break" floor opens once the door is broken, even with the dust still around', async () => {
    await floor(page, 'yg_door'); await page.waitForTimeout(800);
    assert.equal(await E(() => __game().dungeonOpen()), false);
    await killAll(page, 'yg_door'); await page.waitForTimeout(400);
    assert.ok(await E(() => __game().monsters.some((m) => !m.dead && m.id === 'yg_dust')), 'dust alive');
    assert.equal(await E(() => __game().dungeonOpen()), true);
    await shot(page, 'event_door.png');
  });

  it('a rolling fireball takes most of your health; dying in the event costs no EXP and you get up where you fell', async () => {
    await floor(page, 'yg_fireballs'); await page.waitForTimeout(400);
    await E(() => { const w = __game(); w.player.invuln = 0; w.ch.hp = w.stats.maxHp; });
    // the ground lane's first ball is at x 220 at t = 0
    await setClock(page, 0); await stand(page, 226, 296); await page.waitForTimeout(250);
    const [hp, max] = await E(() => [__game().ch.hp, __game().stats.maxHp]);
    assert.ok(hp <= max * 0.2, `hit hard (${hp}/${max})`);
    const exp = await E(() => __game().ch.exp);
    await E(() => { const w = __game(); w.player.invuln = 0; w.ch.hp = 1; w.playerDie(); });
    await page.waitForTimeout(300);
    assert.match(await page.locator('.death').textContent(), /Hồi sinh tại chỗ/);
    assert.equal(await E(() => __game().ch.exp), exp, 'no EXP lost');
    await E(() => { const p = __game().player; p.x = 700 - 7; });
    await page.click('[data-act="respawn"]'); await page.waitForTimeout(300);
    const [map, x, alive] = await E(() => [__game().mapId, __game().player.cx, !__game().player.dead]);
    assert.deepEqual([map, alive], ['yg_fireballs', true]);
    assert.ok(Math.abs(x - 700) < 20, `revived in place (x ${Math.round(x)})`);
  });

  it('the Silver Guard waits at the end; beating it and leaving brings you back to the keeper', async () => {
    await E(() => { __game().player.invuln = 1e9; });
    await floor(page, 'yg_silver'); await page.waitForTimeout(800);
    assert.deepEqual(await E(() => __game().monsters.filter((m) => !m.dead).map((m) => m.id)), ['yg_silver']);
    await shot(page, 'event_silver.png');
    await killAll(page); await page.waitForTimeout(500);
    const ex = await exit(page);
    await stand(page, ex.x, ex.y); await up();
    assert.equal(await E(() => __game().mapId), 'village');
    assert.ok(Math.abs((await E(() => __game().player.cx)) - KEEPER_X) < 40, 'next to the keeper');
  });

  it('the results window keeps a way to get up when you died: a respawn button, otherwise the close button', async () => {
    const end = { t: 'ev_end', d: 'yangak', win: false, top: [], rank: 0, dmg: 0, items: [], queued: 2, exp: 0 };
    await E((m) => { __game().player.dead = true; __ui().onEvent(m); }, end);
    assert.ok(await page.locator('.evend [data-act="respawn"]').count(), 'dead: respawn');
    assert.equal(await page.locator('.evend [data-act="close"]').count(), 0);
    assert.match(await page.locator('.evend').textContent(), /Túi đồ đầy: 2 phần thưởng/, 'queued rewards are explained');
    await page.click('.evend [data-act="respawn"]'); await page.waitForTimeout(300);
    assert.equal(await E(() => __game().player.dead), false, 'on your feet again');
    await E((m) => { __game().player.dead = false; __ui().onEvent(m); }, end);
    assert.ok(await page.locator('.evend [data-act="close"]').count(), 'alive: close');
    await page.click('.evend [data-act="close"]'); await page.waitForTimeout(200);
  });

  it('a save made on an event floor starts in the village', async () => {
    const map = await E(() => { const W = __game().constructor; const ch = { ...__game().ch, map: 'yg_gate' }; const w2 = new W(ch, __game().hooks); return w2.mapId; });
    assert.equal(map, 'village');
  });

  it('no page errors', () => assert.deepEqual(errors, []));
});

describe('event (online, whole server)', { timeout: 240_000 }, () => {
  const RUN_SEC = 40;
  let browser, server, A, B;
  const errors = [];

  async function player(tag) {
    const { page, errors: errs } = await newPage(browser);
    errs.push = (e) => errors.push(e);
    await page.goto(server.url); await page.waitForTimeout(800);
    await register(page, uniqueName('ev'), 'matkhau99');
    await createCharacter(page, 'swordsman', tag + String(Date.now() % 1e4));
    await page.evaluate(() => { const w = __game(); w.player.invuln = 1e9; w.bots.list = []; w.bots.update = () => {}; w.giveExp(60000); w.hooks.save();
      w.dgErrs = []; const f = w.dungeonErr.bind(w); w.dungeonErr = (why) => { w.dgErrs.push(why); f(why); }; });
    await page.waitForTimeout(1600); // the level reaches the server (saved -> refresh)
    await page.evaluate(() => __game().loadMap('village', 1000));
    return { page, id: await page.evaluate('__game().ch.id') };
  }
  const E = (p, f, a) => p.page.evaluate(f, a);
  const toExit = async (p) => { await E(p, () => { const w = __game(), ex = w.map.exit, pl = w.player; pl.x = ex.x - 7; pl.y = ex.y - pl.h - 1; pl.vy = 0; }); await p.page.waitForTimeout(500); };
  const next = (p) => E(p, () => { __game().portalCd = 0; __game().dungeonNext(); });
  const stones = (p) => E(p, () => __game().ch.inventory.filter((e) => e.id === 'stone').reduce((n, e) => n + (e.qty || 1), 0));

  before(async () => {
    server = await startServer({ EVENT_ALWAYS_OPEN: 'true', EVENT_RUN_SEC: String(RUN_SEC) });
    browser = await launch();
    A = await player('Alpha'); B = await player('Beta');
  });
  after(async () => { await browser?.close(); await server?.stop(); });

  it('clients learn the event is open; the keeper offers to join', async () => {
    assert.ok(await until(A.page, "__game().net.connected"));
    await E(A, () => { const p = __game().player; p.x = 1255 - 7; });
    await A.page.waitForTimeout(300); await A.page.keyboard.press('KeyE'); await A.page.waitForTimeout(300);
    assert.match(await A.page.locator('[data-act="dungeon"]').textContent(), /Tham chiến.*Đang mở/s);
    await A.page.keyboard.press('Escape');
  });

  it('players who are not in a party join the same run and see each other', async () => {
    for (const p of [A, B]) { await E(p, () => { __game().player.x = 1255 - 7; }); }
    await A.page.waitForTimeout(400);
    for (const p of [A, B]) await E(p, () => __game().enterDungeon('yangak'));
    for (const p of [A, B]) assert.ok(await until(p.page, "__game().mapId === 'yg_jump' && __game().net.ready", 6000), 'on the first floor');
    assert.ok(await until(A.page, `__game().remotes.has('${B.id}')`), 'A sees B');
    assert.ok(await until(B.page, `__game().remotes.has('${A.id}')`), 'B sees A');
    const [fa, fb] = await Promise.all([A, B].map((p) => E(p, () => __game().dg.floors.join(','))));
    assert.equal(fa, fb, 'same floors');
    const [ta, tb] = await Promise.all([A, B].map((p) => E(p, () => __game().dg.t0)));
    assert.equal(ta, tb, 'one trap clock');
  });

  it('a reconnecting player (a reloaded page starts in the village) is put back on its floor', async () => {
    const floor = await E(A, () => __game().mapId), inst = await E(A, () => __game().dg.id);
    // the connection drops and the page comes back in the village, as after a reload
    await E(A, () => { const w = __game(); w.net.ws.close(3001); w.loadMap('village', 1255); });
    assert.ok(await until(A.page, `__game().mapId === '${floor}' && __game().net.ready && __game().dg && __game().dg.id === '${inst}'`, 12000), 'back on the floor');
    assert.equal(await E(A, () => __game().dgErrs.length), 0);
    assert.ok(await until(B.page, `__game().remotes.has('${A.id}')`, 6000), 'and B sees A again');
  });

  it('skipping a floor is refused: the client is sent back to the village', async () => {
    await E(B, () => __game().loadMap('yg_silver', 200));
    assert.ok(await until(B.page, "__game().mapId === 'village'", 6000));
  });

  it('damage to the event monsters is ranked live: the panel shows the top 10 and your place', async () => {
    // A goes on until a floor with monsters (one of floors 2 and 3 always has some), then hits one with real hits
    for (let i = 0; i < 3; i++) {
      const has = await until(A.page, '__game().remoteMobs.size > 0', 1500);
      if (has) break;
      await toExit(A); await next(A);
      await until(A.page, `__game().mapId === __game().dg.floors[${i + 1}]`, 5000);
      await A.page.waitForTimeout(600);
    }
    assert.ok(await E(A, () => __game().remoteMobs.size > 0), 'found monsters');
    for (let n = 0; n < 6; n++) {
      const m = await E(A, () => { const m = [...__game().remoteMobs.values()].find((x) => !x.dead); return m && { uid: m.uid, x: Math.round(m.cx) }; });
      if (!m) break;
      await E(A, (m) => { const p = __game().player; p.x = m.x - 7; }, m);
      await A.page.waitForTimeout(150);
      await E(A, (uid) => __game().net.hit({ uid, sid: 'sw_basic' }), m.uid);
      await A.page.waitForTimeout(250);
    }
    assert.ok(await until(A.page, "!document.querySelector('#hEvent').hidden && document.querySelector('#hEvent .mine b').textContent === '1'", 5000), 'A ranks first');
    assert.match(await A.page.locator('#hEvent ol').textContent(), /Alpha/);
    await shot(A.page, 'event_online_rank.png');
  });

  it('when time runs out everyone who took part is rewarded and sent back to the keeper', async () => {
    const before = await Promise.all([A, B].map(stones));
    for (const p of [A, B]) assert.ok(await until(p.page, "!!document.querySelector('.evend')", (RUN_SEC + 15) * 1000), 'results window');
    assert.match(await A.page.locator('.evend').textContent(), /Hạng của bạn: 1/);
    assert.match(await B.page.locator('.evend').textContent(), /Hạng của bạn: —/);
    for (const p of [A, B]) assert.ok(await until(p.page, "__game().mapId === 'village'", 5000), 'back in the village');
    await shot(A.page, 'event_online_end.png');
    for (const [i, p] of [A, B].entries()) {
      assert.ok(await until(p.page, `__game().ch.inventory.filter((e) => e.id === 'stone').reduce((n, e) => n + (e.qty || 1), 0) >= ${before[i] + 2}`, 6000), 'reward items in the bag');
    }
    assert.ok(await until(A.page, "__game().ch.inventory.some((e) => e.id === 'out_black_dragon')", 4000), 'the top damage dealer gets the outfit');
    assert.ok(await until(A.page, "[...document.querySelectorAll('#chatLog .cl.system')].some((e) => e.textContent.includes('kết thúc'))", 4000), 'a server-wide message');
  });

  it('no page errors', () => assert.deepEqual(errors, []));
});
