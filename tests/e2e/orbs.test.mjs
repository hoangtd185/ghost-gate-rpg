// Taoist skill D: 4 homing thunder orbs focus one target (boss > named > elite/chieftain > nearest) and retarget.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, newPage, openGame, shot } from './helpers.mjs';

/* global __game */
// A controlled arena: no spawns, no bots, 4 fresh monsters with narrow patrol ranges in front of the player.
// The farthest one is flagged elite (flag only, no random affixes such as blink or shield).
const PLACE = (hpLast) => { const w = __game(), p = w.player, M = window.__Monster;
  w.timers = []; w.spawnGroups = []; w.projs = []; w.bots.update = () => {}; w.bots.list = [];
  w.monsters = [0, 1, 2, 3].map((i) => { const x = p.x + 60 + i * 35;
    const m = new M('jiangshi', x, p.standY, [x - 2, x + 2], null, { elite: false, chief: false, lvBonus: 0 });
    m.hp = m.maxHp = 99999; m.elite = i === 3; m.alpha = 1; m.vx = 0; return m; });
  w.monsters[3].hp = hpLast; window.__ms = w.monsters; };

describe('homing thunder orbs', { timeout: 120_000 }, () => {
  let browser, page, errors;
  const E = (js) => page.evaluate(js);

  before(async () => {
    browser = await launch();
    ({ page, errors } = await newPage(browser));
    await openGame(page, 'taoist', 'Lôi Sư');
    await E("(() => { const w = __game(); w.player.invuln = 99999; w.giveExp(60000); w.ch.skills.ta_orbs = 1; w.loadMap('graveyard', 300); w.player.x = 300; })()");
    await page.waitForTimeout(600);
    await E('(() => { const w = __game(); w.player.y = w.player.standY - w.player.h; w.player.facing = 1; })()'); await page.waitForTimeout(300);
  });
  after(() => browser?.close());

  it('all four orbs hit the elite, not the closer monsters', async () => {
    await page.evaluate(PLACE, 99999);
    await page.keyboard.press('KeyD'); await page.waitForTimeout(400);
    await shot(page, 'orbs_flight.png');
    await page.waitForTimeout(1500);
    const dmg = await E('window.__ms.map((m) => Math.round(m.maxHp - m.hp))');
    assert.ok(dmg[3] > 0 && dmg.slice(0, 3).every((d) => d === 0), JSON.stringify(dmg));
  });

  it('orbs retarget when the target dies', async () => {
    await E('(() => { __game().player.cooldowns.ta_orbs = 0; __game().player.facing = 1; })()');
    await page.evaluate(PLACE, 1);
    await page.keyboard.press('KeyD'); await page.waitForTimeout(1800);
    const [dead, dmg] = await E('[window.__ms[3].dead, window.__ms.map((m) => Math.round(m.maxHp - m.hp))]');
    assert.ok(dead && dmg.slice(0, 3).some((d) => d > 0), JSON.stringify({ dead, dmg }));
  });

  it('no orbs in a safe map', async () => {
    await E("(() => { const w = __game(); w.player.cooldowns.ta_orbs = 0; w.loadMap('village', 300); })()"); await page.waitForTimeout(300);
    await page.keyboard.press('KeyD'); await page.waitForTimeout(200);
    assert.equal(await E('__game().projs.length'), 0);
  });

  it('no page errors', () => assert.deepEqual(errors, []));
});
