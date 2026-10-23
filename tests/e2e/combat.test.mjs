// Combat systems: sealed portals, passives and reset, reflect, elites, poison, field boss, outfits, story boss credit.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, newPage, openGame, shot } from './helpers.mjs';

describe('combat systems', { timeout: 300_000 }, () => {
  let browser, page, errors;
  const E = (js, arg) => page.evaluate(js, arg);

  before(async () => {
    browser = await launch();
    ({ page, errors } = await newPage(browser));
    await openGame(page, 'swordsman', 'Thử Quái');
  });
  after(() => browser?.close());

  it('a sealed portal keeps you on the map', async () => {
    await E("(() => { const w = __game(); w.loadMap('forest', 2240); w.player.x = 2240; w.player.y = 250; })()");
    await page.waitForTimeout(500); await page.keyboard.press('ArrowUp'); await page.waitForTimeout(400);
    assert.equal(await E('__game().mapId'), 'forest');
  });

  it('passives raise stats and a reset refunds them', async () => {
    await E('(() => { const w = __game(); w.giveExp(160000); w.ch.gold = 99999; w.player.invuln = 0; })()');
    const hp0 = await E('__game().stats.maxHp');
    await E("__game().loadMap('village', 400)"); await page.waitForTimeout(300);
    await page.keyboard.press('KeyK'); await page.waitForTimeout(200); await page.click('[data-act="stab"][data-t="pas"]');
    for (let i = 0; i < 3; i++) { await page.click('[data-act="pasup"][data-pid="sw_p1"]'); await page.waitForTimeout(80); }
    for (let i = 0; i < 2; i++) { await page.click('[data-act="pasup"][data-pid="sw_p2"]'); await page.waitForTimeout(80); }
    await page.click('[data-act="pasup"][data-pid="sw_p3"]'); await page.waitForTimeout(100);
    await shot(page, 'combat_passives.png');
    assert.ok((await E('__game().stats.maxHp')) > hp0, 'max HP went up');
    await page.click('[data-act="sreset"]'); await page.click('[data-act="sreset"]'); await page.waitForTimeout(100);
    const skills = await E('__game().ch.skills');
    assert.ok(!Object.keys(skills).some((k) => k.startsWith('sw_p')), 'passives cleared');
    await page.keyboard.press('Escape');
  });

  it('ice golems reflect damage', async () => {
    await E("(() => { const w = __game(); w.loadMap('ice_cave', 300); w.player.x = 300; w.player.y = 250; })()"); await page.waitForTimeout(800);
    // A fresh plain golem: a random elite could roll a Guard shield (absorbs the hit, so nothing is reflected)
    // and a random chieftain has more defense. Reflect only depends on the species affix.
    const r = await E(`(() => { const w = __game(), p = w.player, M = window.__Monster;
      const m = new M('golem', p.x + 40, p.standY, [p.x + 38, p.x + 42], null, { elite: false, chief: false, lvBonus: 0 });
      m.alpha = 1; w.monsters.push(m);
      const hp0 = w.ch.hp; w.damageMonster(m, 3, 'player');
      return { hp0, hp1: w.ch.hp, affix: [...m.affix], dealt: m.maxHp - m.hp }; })()`);
    assert.ok(r.affix.includes('reflect') && !r.affix.includes('shield'), JSON.stringify(r));
    assert.ok(r.dealt > 0, `the hit landed: ${JSON.stringify(r)}`);
    assert.ok(r.hp1 < r.hp0, `damage was reflected: ${JSON.stringify(r)}`);
  });

  it('elites get extra affixes', async () => {
    await E("(() => { const w = __game(); const M = window.__Monster; const m = new M('golem', 700, 296, [600, 900], null, { elite: true }); w.monsters.push(m); w.player.x = 600; w.player.y = 250; m.aggro = w.player; m.aggroT = 99; })()");
    await page.waitForTimeout(1500); await shot(page, 'combat_elite.png');
    const elites = await E('__game().monsters.filter((m) => m.elite).map((m) => [...m.affix])');
    assert.ok(elites.some((a) => a.length >= 2), JSON.stringify(elites));
    await E('(() => { const w = __game(); w.player.invuln = 99999; w.player.x = 1200; w.player.y = 250; })()'); await page.waitForTimeout(3000); // let the AI run
  });

  it('poison frogs poison the player', async () => {
    await E("(() => { const w = __game(); w.loadMap('swamp', 900); w.player.invuln = 0; w.player.x = 900; w.player.y = 250; const f = w.monsters.find((m) => m.id === 'frog'); w.hurtPlayer(50, 1, 'poison', f); })()");
    await page.waitForTimeout(700);
    assert.ok((await E('__game().player.poisonT')) > 0);
    await E('__game().player.invuln = 99999');
  });

  it('field boss spawns and drops an outfit that can be worn', async () => {
    await E("(() => { const w = __game(); w.loadMap('snow_peak', 1500); w.player.x = 1400; w.player.y = 250; w.spawnNamed('fb_yeti'); })()");
    await page.waitForTimeout(2500); await shot(page, 'combat_fieldboss.png');
    assert.equal(await E('__game().monsters.filter((m) => m.named).length'), 1);
    await E("(() => { const w = __game(); const m = w.monsters.find((m) => m.named); m.def.drops = [['out_white_fox', 1], ['GEM2', 1]]; m.hitByPlayer = true; w.damageMonster(m, 99999, 'player'); })()");
    await page.waitForTimeout(1500);
    await E('(() => { const w = __game(); for (const d of [...w.drops]) w.pickupDrop(d, 0, 0); })()');
    await page.keyboard.press('KeyI'); await page.waitForTimeout(200);
    await page.locator('.islot[title="Bạch Hồ Cừu"]').first().click(); await page.waitForTimeout(100);
    await page.click('[data-act="equip"]'); await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    assert.equal(await E('(__game().ch.equip.outfit || {}).id'), 'out_white_fox');
  });

  it('a story boss kill counts for its quest', async () => {
    await E("(() => { const w = __game(); for (const q of ['m1','m2','m3','m4','st1','st2','st3']) w.ch.quests[q] = { s: 'done', p: 1 }; w.ch.quests.st4 = { s: 'active', p: 0 }; w.loadMap('field', 1300); w.player.x = 1300; w.player.y = 250; })()");
    await page.waitForTimeout(3000);
    await E("(() => { const w = __game(); const m = w.monsters.find((m) => m.named); m.hitByPlayer = true; w.damageMonster(m, 99999, 'player'); })()"); await page.waitForTimeout(300);
    assert.ok((await E('__game().ch.quests.st4')).p >= 1);
  });

  it('no page errors', () => assert.deepEqual(errors, []));
});
