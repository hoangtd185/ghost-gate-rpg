// Chieftain mini boss ("Đầu Lĩnh"): one per map, much tougher, announced, better drops.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, newPage, openGame, shot } from './helpers.mjs';

describe('chieftain mini boss', { timeout: 120_000 }, () => {
  let browser, page, errors, res;
  const E = (js) => page.evaluate(js);

  before(async () => {
    browser = await launch();
    ({ page, errors } = await newPage(browser));
    await openGame(page, 'swordsman', 'Săn Đầu Lĩnh');
    await E("(() => { const w = __game(); w.player.invuln = 99999; w.giveExp(4000); w.loadMap('forest', 300); })()");
    await page.waitForTimeout(500);
    // force the next spawns to roll a chieftain
    res = await E(`(() => { const w = __game(); const g = w.spawnGroups[0]; const r = Math.random; Math.random = () => 0.001;
      try { for (let i = 0; i < 3; i++) w.spawnMonster(g); } finally { Math.random = r; }
      const chiefs = w.monsters.filter((m) => m.chief); const c = chiefs[0];
      const normal = w.monsters.find((m) => !m.chief && !m.elite && m.id === c.id && m.def.lv === c.def.lv);
      return { chiefs: chiefs.length, name: c.def.name, hp: c.maxHp, atk: c.def.atk, normal: normal ? { hp: normal.maxHp, atk: normal.def.atk } : null }; })()`);
  });
  after(() => browser?.close());

  it('only one chieftain per map, even when forced three times', () => assert.equal(res.chiefs, 1));

  it('is much tougher than a normal monster of the same level', (t) => {
    if (!res.normal) return t.skip('no normal monster of the same level on the map');
    assert.ok(res.hp >= res.normal.hp * 5 && res.atk >= res.normal.atk, JSON.stringify(res));
  });

  it('is announced in chat', async () => {
    const lines = await E("[...document.querySelectorAll('#chatLog div, .chat div')].map((d) => d.textContent).filter((t) => t.includes('Đầu Lĩnh'))");
    assert.ok(lines.length > 0);
  });

  it('drops an enhancement stone', async () => {
    await E('(() => { const w = __game(), p = w.player; const c = w.monsters.find((m) => m.chief); c.x = p.x + 70; c.y = c.standY - c.h; c.aggro = p; c.aggroT = 5; c.alpha = 1; })()');
    await page.waitForTimeout(500); await shot(page, 'chief.png');
    await E("(() => { const w = __game(); const c = w.monsters.find((m) => m.chief); c.hitByPlayer = true; w.damageMonster(c, 999999, 'player'); })()");
    await page.waitForTimeout(400);
    const drops = await E("__game().drops.filter((d) => d.kind === 'item').map((d) => d.data.id)");
    assert.ok(drops.includes('stone'), JSON.stringify(drops));
  });

  it('no page errors', () => assert.deepEqual(errors, []));
});
