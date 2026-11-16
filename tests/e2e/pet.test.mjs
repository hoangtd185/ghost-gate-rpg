// Pets: the imp from the first quest, the fox kit from the fisherman's quest, switching between them in the
// character window, calling and resting with P.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, newPage, openGame, shot } from './helpers.mjs';

describe('pets', { timeout: 120_000 }, () => {
  let browser, page, errors;
  const E = (f, a) => page.evaluate(f, a);
  // make a collect quest ready to hand in, then hand it in through the UI code
  const finish = (qid, item, n) => E(([qid, item, n]) => {
    const w = __game();
    w.ch.quests[qid] = { s: 'active', p: 0 };
    w.ch.inventory.push({ uid: 'q-' + qid, id: item, qty: n, r: 0, b: {} });
    __ui().completeQuest(qid);
  }, [qid, item, n]);

  before(async () => {
    browser = await launch();
    ({ page, errors } = await newPage(browser));
    await openGame(page, 'taoist', 'Nuôi Pet');
    await E(() => { const w = __game(); w.bots.list = []; w.bots.update = () => {}; w.player.invuln = 1e9; });
  });
  after(() => browser?.close());

  it('the first quest gives the imp, which comes out at once', async () => {
    assert.equal(await E(() => __game().ch.pet), null);
    await finish('q_pet', 'mat_wisp', 3);
    assert.deepEqual(await E(() => __game().ch.pet), { id: 'imp', on: true, owned: ['imp'] });
    assert.equal(await E(() => __game().pet.def.name), 'Tiểu Quỷ');
  });

  it("the fisherman's quest gives the fox kit: it replaces the imp at the player's side, both are owned", async () => {
    await page.keyboard.press('Escape');
    await finish('q_fox_pet', 'mat_slime', 5);
    assert.deepEqual(await E(() => __game().ch.pet), { id: 'fox_kit', on: true, owned: ['imp', 'fox_kit'] });
    assert.equal(await E(() => __game().pet.def.name), 'Tiểu Hồ');
    assert.equal(await E(() => __game().ch.inventory.some((e) => e.id === 'mat_slime')), false, 'the slime was handed in');
    await page.keyboard.press('Escape'); await page.waitForTimeout(600);
    await shot(page, 'pet_fox.png');
  });

  it('the character window switches between owned pets; P sends the pet to rest and calls it back', async () => {
    await page.keyboard.press('KeyC'); await page.waitForTimeout(200);
    assert.match(await page.locator('.petbox').textContent(), /Tiểu Hồ/);
    await page.click('[data-act="petsel"][data-p="imp"]'); await page.waitForTimeout(200);
    assert.deepEqual(await E(() => [__game().ch.pet.id, __game().pet.id]), ['imp', 'imp'], 'the imp is out now');
    assert.ok(await page.locator('[data-act="petsel"][data-p="fox_kit"]').count(), 'and the fox can be chosen again');
    await page.keyboard.press('Escape');
    await page.keyboard.press('KeyP'); await page.waitForTimeout(200);
    assert.deepEqual(await E(() => [__game().ch.pet.on, !!__game().pet]), [false, false], 'resting');
    await page.keyboard.press('KeyC'); await page.waitForTimeout(200);
    await page.click('[data-act="petsel"][data-p="fox_kit"]'); await page.waitForTimeout(200);
    assert.deepEqual(await E(() => [__game().ch.pet.id, !!__game().pet]), ['fox_kit', false], 'chosen while resting: it stays resting');
    await page.keyboard.press('Escape');
    await page.keyboard.press('KeyP'); await page.waitForTimeout(200);
    assert.equal(await E(() => __game().pet?.id), 'fox_kit', 'called back: the fox comes');
  });

  it('a pet picks up drops in range', async () => {
    const before = await E(() => __game().ch.gold);
    await E(() => { const w = __game(); w.loadMap('forest', 400); w.spawnGroups = []; w.monsters = []; });
    await E(() => { const w = __game(), p = w.player; const m = new window.__Monster('wisp', p.x + 60, p.standY || 296, [p.x + 50, p.x + 70], null, { elite: false, chief: false, lvBonus: 0 });
      m.alpha = 1; m.hitByPlayer = true; w.monsters.push(m); w.damageMonster(m, 99999, 'player'); });
    await page.waitForTimeout(3500);
    assert.ok((await E(() => __game().ch.gold)) > before, 'the gold was picked up by the pet');
  });

  it('no page errors', () => assert.deepEqual(errors, []));
});
