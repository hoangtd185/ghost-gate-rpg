// Old-save migration, then chapter 3 end to end: hidden portal, story boss, the bell choice scene, final boss, ending.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, newPage, createCharacter, GAME_FILE, talk, click, runDialog, esc, quest, shot } from './helpers.mjs';

const MAIN_DONE = ['m1', 'm2', 'm3', 'm4', 'st1', 'st2', 'st3', 'st4', 'st4b', 'st5', 'st6', 'st6b', 'st6c', 'st6d', 'st7',
  'st8', 'st8b', 'st9', 'st10', 'st10b', 'st10c', 'st11', 'st11b', 'st11c', 'st12'];

describe('old save migration', { timeout: 120_000 }, () => {
  let browser, page, errors;
  before(async () => { browser = await launch(); ({ page, errors } = await newPage(browser)); });
  after(() => browser?.close());

  it('fills in earlier main quests and removes retired ones', async () => {
    const old = {
      id: 'oldc1', name: 'Lão Làng', cls: 'taoist', level: 15, exp: 0, gold: 900, hp: 300, mp: 100, stats: { str: 4, dex: 4, int: 20, vit: 8 },
      statPoints: 0, skillPoints: 0, skills: { ta_thunder: 1 }, inventory: [], equip: { weapon: { uid: 'w1', id: 'w_taoist3', qty: 1, r: 1, b: {} } },
      quests: { st1: { s: 'done', p: 1 }, st7: { s: 'done', p: 1 }, q_boss: { s: 'done', p: 1 }, q_wisp: { s: 'done', p: 8 }, q_jiang: { s: 'active', p: 3 }, q_pet: { s: 'done', p: 3 } },
      map: 'village', x: 400, playTime: 100,
    };
    await page.goto(GAME_FILE); await page.waitForTimeout(600);
    await page.evaluate((c) => localStorage.setItem('qmq_chars', JSON.stringify({ [c.id]: c })), old);
    await page.reload(); await page.waitForTimeout(900);
    await page.locator('[data-play]').first().click(); await page.waitForTimeout(1200);
    const q = await page.evaluate('Object.fromEntries(Object.entries(__game().ch.quests).map(([k, v]) => [k, v.s]))');
    for (const id of ['m1', 'm4', 'st3', 'st6d']) assert.equal(q[id], 'done', id);
    for (const id of ['q_boss', 'q_wisp', 'q_jiang']) assert.ok(!(id in q), `${id} removed`);
    assert.deepEqual(errors, []);
  });
});

describe('chapter 3', { timeout: 300_000 }, () => {
  let browser, page, errors;
  const accept = async (q) => { await click(page, `[data-act="qaccept"][data-q="${q}"]`); await runDialog(page); };
  const talkDone = async (q, opts) => { await click(page, `[data-act="qtalk"][data-q="${q}"]`); await runDialog(page, opts); };
  const portals = () => page.evaluate('__game().portals.map((p) => p.to)');
  const npcs = () => page.evaluate('__game().npcs.map((n) => n.id)');
  const outro = [];

  before(async () => {
    browser = await launch();
    ({ page, errors } = await newPage(browser));
    await page.goto(GAME_FILE); await page.waitForTimeout(600);
    await createCharacter(page, 'assassin', 'Kết Truyện');
    await page.evaluate((done) => { const w = __game(); w.player.invuln = 99999; w.giveExp(900000); for (const q of done) w.ch.quests[q] = { s: 'done', p: 1 }; w.refreshNpcs(); }, MAIN_DONE);
  });
  after(() => browser?.close());

  it('st13–st14: Tiểu Lan and the diary', async () => {
    await talk(page, 'fire_master', 'volcano', 200); await accept('st13'); await esc(page);
    await talk(page, 'lan', 'village', 640); await talkDone('st13', { shot: 'ch3_lan.png', shotAt: 2 });
    assert.equal((await quest(page, 'st13'))?.s, 'done');
    await accept('st14'); await esc(page);
    await talk(page, 'elder', 'village', 220); await talkDone('st14');
    assert.equal((await quest(page, 'st14'))?.s, 'done');
  });

  it('st15 reveals the hidden portal to the temple', async () => {
    await accept('st15'); await esc(page);
    await page.evaluate("__game().loadMap('graveyard', 1200)");
    assert.ok(!(await portals()).includes('temple'), 'hidden before st15');
    await talk(page, 'huntress', 'snow_peak', 200); await talkDone('st15'); await esc(page);
    assert.equal((await quest(page, 'st15'))?.s, 'done');
    await page.evaluate("__game().loadMap('graveyard', 1200)"); await page.waitForTimeout(500);
    assert.ok((await portals()).includes('temple'), 'shown after st15');
    await page.evaluate('(() => { const w = __game(); w.player.x = 1300; w.player.y = 250; })()'); await page.waitForTimeout(600);
    await page.keyboard.press('ArrowUp'); await page.waitForTimeout(900);
    assert.equal(await page.evaluate('__game().mapId'), 'temple');
  });

  it('st16–st17: temple hunt, story boss, the bell', async () => {
    await talk(page, 'huntress_temple', 'temple', 170); await accept('st16'); await esc(page);
    await page.evaluate('__game().ch.quests.st16.p = 15');
    await talk(page, 'huntress_temple', 'temple', 170); await click(page, '[data-act="qdone"][data-q="st16"]'); await runDialog(page);
    await accept('st16b'); await esc(page);
    await page.waitForTimeout(2500);
    assert.ok((await page.evaluate('__game().monsters.filter((m) => m.named).length')) >= 1, 'story boss spawned');
    await page.evaluate("(() => { const w = __game(); const m = w.monsters.find((m) => m.named === 'nb_blood_jiangshi'); m.hitByPlayer = true; w.damageMonster(m, 9999999, 'player'); })()");
    await page.waitForTimeout(500);
    await talk(page, 'huntress_temple', 'temple', 170); await click(page, '[data-act="qdone"][data-q="st16b"]'); await runDialog(page);
    assert.equal((await quest(page, 'st16'))?.s, 'done');
    assert.equal((await quest(page, 'st16b'))?.s, 'done');
    await talk(page, 'fire_master_temple', 'temple', 250); await accept('st17'); await esc(page);
    await page.evaluate("__game().ch.inventory.push({ uid: 'b2', id: 'q_bell2', qty: 1, r: 0, b: {} })");
    await talk(page, 'smith', 'village', 760); await click(page, '[data-act="qdone"][data-q="st17"]'); await runDialog(page);
    assert.equal((await quest(page, 'st17'))?.s, 'done');
  });

  it('st18: Tiểu Lan is missing, the bell choice sets a story flag', async () => {
    await talk(page, 'elder', 'village', 220); await accept('st18'); await esc(page);
    assert.ok(!(await npcs()).includes('lan'), 'Tiểu Lan absent during st18');
    await page.evaluate("__game().loadMap('sanctum', 80)"); await page.waitForTimeout(1500);
    for (let n = 0; n < 8 && (await page.locator('[data-act="dnext"]').count()); n++) { await page.locator('[data-act="dnext"]').click(); await page.waitForTimeout(100); }
    await shot(page, 'ch3_choice.png');
    assert.equal(await page.locator('.choice').count(), 2);
    await page.locator('.choice').nth(1).click(); await page.waitForTimeout(200);
    await runDialog(page);
    assert.equal((await page.evaluate('__game().ch.flags')).bell, 'refuse');
  });

  it('final boss and ending', async () => {
    await page.evaluate('(() => { const w = __game(); w.player.x = 560; w.player.y = 250; })()'); await page.waitForTimeout(2500);
    await page.evaluate("(() => { const w = __game(); const m = w.monsters.find((m) => m.id === 'blood_demon'); m.hitByPlayer = true; w.damageMonster(m, 999999, 'player'); })()");
    await page.waitForTimeout(600);
    await talk(page, 'elder', 'village', 220);
    await click(page, '[data-act="qdone"][data-q="st18"]'); await runDialog(page, { collect: outro, shot: 'ch3_end.png', shotAt: 3 });
    assert.equal((await quest(page, 'st18'))?.s, 'done');
    assert.ok(outro.length >= 5, 'ending dialogue played');
    assert.ok(await page.evaluate('__game().ch.title'), 'ending title granted');
    assert.ok((await npcs()).includes('lan'), 'Tiểu Lan back in the village');
  });

  it('no page errors', () => assert.deepEqual(errors, []));
});
