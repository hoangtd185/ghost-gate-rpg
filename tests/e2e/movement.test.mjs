// Movement: double-tap and hold ← / → to sprint (with the run animation), Ctrl + ↓ to drop through platforms.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, newPage, openGame, shot } from './helpers.mjs';

describe('movement', { timeout: 120_000 }, () => {
  let browser, page, errors;
  const E = (js) => page.evaluate(js);
  let walkVx;
  // Stand on the first raised platform of the map; returns its height
  const onPlatform = () => E('(() => { const w = __game(), p = w.player; const pl = w.map.platforms.find((q) => q.y < 300); p.x = pl.x + pl.w / 2; p.y = pl.y - p.h - 1; p.vy = 0; return pl.y; })()');

  before(async () => {
    browser = await launch();
    ({ page, errors } = await newPage(browser));
    await openGame(page, 'assassin', 'Khinh Công');
    await E("(() => { const w = __game(); w.player.invuln = 99999; w.loadMap('field', 200); })()");
    await page.waitForTimeout(400);
    // empty arena: no monsters, no pending spawns (they would knock the player around)
    await E('(() => { const w = __game(); w.timers = []; w.spawnGroups = []; w.monsters = []; w.projs = []; })()');
    await E('__game().player.invuln = 0'); // invulnerability makes the sprite blink in screenshots
  });
  after(() => browser?.close());

  it('walking speed and animation', async () => {
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(300);
    walkVx = await E('__game().player.vx');
    assert.equal(await E('__game().player.anim'), 'walk');
    await page.keyboard.up('ArrowRight'); await page.waitForTimeout(400);
  });

  it('double-tap and hold sprints faster with the run animation', async () => {
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(60); await page.keyboard.up('ArrowRight'); await page.waitForTimeout(90);
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(300);
    const [vx, running, anim] = await E('[__game().player.vx, __game().player.running, __game().player.anim]');
    await shot(page, 'movement_run.png');
    assert.ok(running && vx > walkVx * 1.4, `sprint ${vx} vs walk ${walkVx}`);
    assert.equal(anim, 'run');
    await page.keyboard.up('ArrowRight'); await page.waitForTimeout(100);
    assert.equal(await E('__game().player.running'), false, 'releasing stops the sprint');
  });

  it('a slow double tap only walks', async () => {
    await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(60); await page.keyboard.up('ArrowLeft'); await page.waitForTimeout(450);
    await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(250);
    const vx = await E('__game().player.vx');
    await page.keyboard.up('ArrowLeft');
    assert.ok(Math.abs(vx) <= Math.abs(walkVx) * 1.05, String(vx));
  });

  it('Ctrl + ↓ drops through the platform', async () => {
    const y = await onPlatform(); await page.waitForTimeout(400);
    await page.keyboard.down('Control'); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(60); await page.keyboard.up('Control');
    await page.waitForTimeout(900);
    assert.ok((await E('__game().player.standY')) > y);
  });

  it('↓ then Ctrl also drops', async () => {
    const y = await onPlatform(); await page.waitForTimeout(400);
    await page.keyboard.down('ArrowDown'); await page.waitForTimeout(100); await page.keyboard.press('Control'); await page.waitForTimeout(60); await page.keyboard.up('ArrowDown');
    await page.waitForTimeout(900);
    assert.ok((await E('__game().player.standY')) > y);
  });

  it('plain ↓ sits and stays on the platform', async () => {
    const y = await onPlatform(); await page.waitForTimeout(400);
    await page.keyboard.down('ArrowDown'); await page.waitForTimeout(500);
    const [standY, sitting] = await E('[__game().player.standY, __game().player.sitting]');
    await page.keyboard.up('ArrowDown');
    assert.equal(standY, y);
    assert.ok(sitting);
  });

  it('no page errors', () => assert.deepEqual(errors, []));
});
