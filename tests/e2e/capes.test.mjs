// Capes: their own equipment slot, worn together with an outfit; a cape replaces an outfit's built-in cape;
// the cloth flows behind the character and trails while running.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, newPage, openGame, runDialog, shot } from './helpers.mjs';

describe('capes', { timeout: 120_000 }, () => {
  let browser, page, errors;
  const E = (js) => page.evaluate(js);
  const wear = (slot, id) => page.evaluate(([slot, id]) => {
    const w = __game();
    w.ch.equip[slot] = id ? { uid: slot + Math.random(), id, qty: 1, r: 3, b: {} } : null;
    w.player.refreshLook();
  }, [slot, id]);

  before(async () => {
    browser = await launch();
    ({ page, errors } = await newPage(browser));
    await openGame(page, 'swordsman', 'Phi Phong');
    await E("(() => { const w = __game(); w.giveExp(3000); w.ch.quests.m1 = { s: 'done', p: 1 }; w.ch.quests.m2 = { s: 'done', p: 8 }; w.ch.gold = 50000; w.player.invuln = 1e9; w.bots.list = []; w.bots.update = () => {}; })()");
  });
  after(() => browser?.close());

  it('craft a cape at the embroiderer', async () => {
    await E('(() => { const w = __game(); w.player.x = 1323; w.player.y = 250; })()');
    await page.waitForTimeout(300); await page.keyboard.press('KeyE'); await page.waitForTimeout(300);
    await page.click('[data-act="qaccept"][data-q="tut_craft"]'); await runDialog(page);
    await E("(() => { const w = __game(); for (const [id, n] of [['mat_tail', 10], ['mat_straw', 5]]) w.ch.inventory.push({ uid: id + 'x', id, qty: n, r: 0, b: {} }); })()");
    const tails = () => E("__game().ch.inventory.filter((e) => e.id === 'mat_tail').reduce((n, e) => n + e.qty, 0)");
    const before = await tails();
    await page.click('[data-act="craftwin"]');
    assert.ok(await page.locator('.w-craft h4', { hasText: 'Áo choàng' }).count(), 'a cape section in the recipe list');
    await page.click('[data-act="csel"][data-r="r_cape_traveler"]'); await page.click('[data-act="craft"][data-n="1"]'); await page.waitForTimeout(300);
    const cape = await E("__game().ch.inventory.find((e) => e.id === 'cape_traveler') || null");
    assert.ok(cape, 'crafted');
    assert.equal(cape.r, 3);
    assert.equal(await tails(), before - 10, 'materials used up');
    await page.keyboard.press('Escape');
  });

  it('a cape goes in its own slot, together with an outfit', async () => {
    await wear('outfit', 'out_fox');
    await page.keyboard.press('KeyI'); await page.waitForTimeout(200);
    const uid = await E("__game().ch.inventory.find((e) => e.id === 'cape_traveler').uid");
    await page.click(`.w-inv .grid [data-uid="${uid}"]`);
    await page.click(`.w-inv [data-act="equip"][data-uid="${uid}"]`); await page.waitForTimeout(200);
    assert.equal(await E('__game().ch.equip.cape?.id'), 'cape_traveler');
    assert.equal(await E('__game().ch.equip.outfit?.id'), 'out_fox', 'the outfit stays on');
    assert.ok(await page.locator('.w-inv .eqs label', { hasText: 'Áo choàng' }).count(), 'cape slot shown in the equipment panel');
    const look = await E('__game().player.look');
    assert.ok(look.tails && look.tails.n === 9 && look.ears, "the outfit's nine tails and ears are still drawn");
    assert.equal(look.liveCape.c, '#8a6a48', 'the cape flows behind');
    await page.keyboard.press('Escape');
  });

  it("a cape replaces an outfit's own cape; without one the outfit's cape flows", async () => {
    await wear('outfit', 'out_black_dragon'); await wear('cape', 'cape_moon');
    let look = await E('__game().player.look');
    assert.equal(look.liveCape.motif, 'moon', 'the equipped cape wins');
    assert.equal(look.cape, undefined, "the outfit's static cape is not drawn as well");
    await wear('cape', null);
    look = await E('__game().player.look');
    assert.equal(look.liveCape.c, '#8a1420', "the outfit's own cape, now flowing");
  });

  it('the cloth hangs behind the back and flies out while running', async () => {
    await wear('cape', 'cape_moon');
    await E("(() => { const w = __game(); w.loadMap(\"forest\", 300); w.monsters = []; w.spawnGroups = []; w.player.invuln = 0; })()");
    await page.waitForTimeout(800);
    // tip of the cape relative to the shoulders: how far behind (along the facing direction) and how far below
    const tip = () => page.evaluate(() => {
      const p = __game().player, c = p.cloth, t = c.tip(), f = p.facing < 0 ? -1 : 1;
      return { back: (c.pts[0].x - t.x) * f, down: t.y - c.pts[0].y };
    });
    // the cloth ripples: average a few looks
    const avg = async () => { let b = 0, d = 0; for (let i = 0; i < 6; i++) { const t = await tip(); b += t.back / 6; d += t.down / 6; await page.waitForTimeout(80); } return { back: b, down: d }; };
    const still = await avg();
    assert.ok(still.back > 0 && still.down > 15, `hangs down behind the back while standing (${JSON.stringify(still)})`);
    await page.keyboard.press('ArrowRight'); await page.keyboard.down('ArrowRight'); await page.waitForTimeout(400);
    const running = await avg();
    await shot(page, 'cape-running.png');
    await page.keyboard.up('ArrowRight');
    assert.ok(running.back > 0, 'still behind while running');
    assert.ok(running.down < still.down - 6, `flies out instead of hanging (${still.down.toFixed(1)} -> ${running.down.toFixed(1)} px below the shoulders)`);
  });

  it('the Nine-Tailed Fox King has a nine-tail sprite of its own, and its robe fans nine tails behind the wearer', async () => {
    const r = await E(`(() => { const w = __game(); w.loadMap('forest', 1380); w.spawnGroups = []; w.monsters = []; w.spawnNamed('fb_fox');
      const king = w.monsters.find((m) => m.named === 'fb_fox'), plain = new window.__Monster('fox', 0, 296, [0, 10]);
      const sheet = window.__humSheet(window.__lookFor({ cls: 'taoist', equip: { outfit: { id: 'out_fox' } } }));
      return { own: !!king && king.sheet !== plain.sheet, frames: king ? king.sheet.frames.walk.length : 0, drawn: sheet.frames.idle.length > 0 }; })()`);
    assert.ok(r.own, 'not the plain fox sheet');
    assert.ok(r.frames > 0 && r.drawn, 'both sheets were built');
    // the robe on the player: the fan is drawn live every frame (Humanoid.drawTails), not baked into the sprite sheet
    await wear('cape', null); await wear('outfit', 'out_fox');
    const live = await page.evaluate(() => new Promise((done) => {
      const p = __game().player, own = p.drawTails;
      const seen = { calls: 0, frames: new Set() };
      p.drawTails = function (ctx, dx, dy, f) { seen.calls++; seen.frames.add(f); return own.call(this, ctx, dx, dy, f); };
      p.vx = 120; p.anim = 'walk'; // walk frames: the fan swings with the legs
      setTimeout(() => { p.drawTails = own; done({ calls: seen.calls, frames: seen.frames.size, tails: p.look.tails?.n }); }, 700);
    }));
    assert.equal(live.tails, 9);
    assert.ok(live.calls >= 3, `drawn live, frame after frame (${live.calls} calls in 0.7 s; headless Chromium draws slowly)`);
    // and nothing is drawn for a character without the robe
    await wear('outfit', null);
    const none = await page.evaluate(() => new Promise((done) => {
      const p = __game().player, own = p.drawTails;
      let calls = 0;
      p.drawTails = function (...a) { calls++; return own.apply(this, a); };
      setTimeout(() => { p.drawTails = own; done(calls); }, 300);
    }));
    assert.equal(none, 0, 'no tails without the robe');
    await wear('outfit', 'out_fox');
    await page.waitForTimeout(600); await shot(page, 'nine_tails.png'); // a preview, not the check
  });

  it('no page errors', () => assert.deepEqual(errors, []));
});
