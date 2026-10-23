// New player flow: prologue m1–m4, tutorial quests (movement, potions, stats, skills, forge) and NPC chatter.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, newPage, openGame, talk, click, runDialog, esc, quest, shot } from './helpers.mjs';

const NPC_X = { elder: 220, healer: 560, smith: 760, constable: 980, lan: 640, priest: 1180 };

describe('beginner flow', { timeout: 300_000 }, () => {
  let browser, page, errors;
  const visit = (npc) => talk(page, npc, 'village', NPC_X[npc]);
  const accept = async (q, opts) => { await click(page, `[data-act="qaccept"][data-q="${q}"]`); await runDialog(page, opts); };
  const turnIn = async (q, opts) => { await click(page, `[data-act="qdone"][data-q="${q}"]`); await runDialog(page, opts); };
  const talkDone = async (q) => { await click(page, `[data-act="qtalk"][data-q="${q}"]`); await runDialog(page); };
  // Kill `mob` on `map` until the JS condition `until` holds, picking up every drop
  const kill = (mob, map, x, until) => page.evaluate(`(async () => { const w = __game(); w.loadMap('${map}', ${x}); let n = 0;
    while (!(${until}) && n < 60) { const m = w.monsters.find((m) => !m.dead && m.id === '${mob}');
      if (!m) { await new Promise((r) => setTimeout(r, 250)); n++; continue; }
      m.hitByPlayer = true; w.damageMonster(m, 99999, 'player'); n++; await new Promise((r) => setTimeout(r, 500));
      for (const d of [...w.drops]) w.pickupDrop(d, 0, 0); } return n; })()`);

  before(async () => {
    browser = await launch();
    ({ page, errors } = await newPage(browser));
    await openGame(page, 'swordsman', 'Tân Thủ');
    await page.evaluate('__game().player.invuln = 99999');
    await page.waitForTimeout(1500);
    await shot(page, 'beginner_start.png');
  });
  after(() => browser?.close());

  it('tut_move: three double jumps', async () => {
    await visit('elder'); await accept('tut_move'); await esc(page);
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Space'); await page.waitForTimeout(180);
      await page.keyboard.press('Space'); await page.waitForTimeout(900);
    }
    await visit('elder'); await turnIn('tut_move');
    assert.equal((await quest(page, 'tut_move'))?.s, 'done');
  });

  it('m1 and tut_potion at the healer', async () => {
    await accept('m1'); await esc(page);
    await visit('healer'); await talkDone('m1');
    assert.equal((await quest(page, 'm1'))?.s, 'done');
    await accept('tut_potion'); await esc(page);
    await page.waitForTimeout(300); await page.keyboard.press('Digit1'); await page.waitForTimeout(500); await page.keyboard.press('Digit1'); await page.waitForTimeout(300);
    await visit('healer'); await turnIn('tut_potion');
    assert.equal((await quest(page, 'tut_potion'))?.s, 'done');
  });

  it('m2–m4: hunt wisps, find the bell, report back', async () => {
    await accept('m2'); await esc(page);
    await kill('wisp', 'forest', 300, '(w.ch.quests.m2 || {}).p >= 8');
    await visit('elder'); await turnIn('m2');
    assert.equal((await quest(page, 'm2'))?.s, 'done');
    await page.evaluate('(() => { const w = __game(); while (w.ch.level < 3) w.giveExp(200); })()'); // m3 needs level 3; kill EXP alone varies
    await accept('m3'); await esc(page);
    await kill('fox', 'forest', 900, "w.ch.inventory.some((e) => e.id === 'q_bell')");
    await visit('priest'); await turnIn('m3', { shot: 'beginner_bell.png' });
    assert.equal((await quest(page, 'm3'))?.s, 'done');
    await accept('m4'); await esc(page);
    await visit('elder'); await talkDone('m4');
    assert.equal((await quest(page, 'm4'))?.s, 'done');
  });

  it('tut_stat and tut_skill: spend points in the windows', async () => {
    await page.evaluate('__game().giveExp(400)');
    await esc(page); await visit('elder'); await accept('tut_stat'); await esc(page);
    await page.keyboard.press('KeyC'); await page.waitForTimeout(200);
    for (let i = 0; i < 3; i++) await click(page, '[data-act="stat"][data-stat="str"]');
    assert.ok((await quest(page, 'tut_stat')).p >= 3);
    await esc(page);
    await visit('priest'); await accept('tut_skill'); await esc(page);
    await page.keyboard.press('KeyK'); await page.waitForTimeout(200); await click(page, '[data-act="skillup"]');
    assert.ok((await quest(page, 'tut_skill')).p >= 1);
    await esc(page);
  });

  it('forge tutorials: enhance, socket a gem, fuse gems, unsocket', async () => {
    await page.evaluate('(() => { __game().giveExp(4000); __game().ch.gold += 5000; })()');
    await visit('smith'); await accept('tut_forge1');
    await visit('smith'); await click(page, '[data-act="forge"]'); await page.waitForTimeout(200);
    await click(page, '[data-act="enhance"]'); await page.waitForTimeout(200);
    await shot(page, 'beginner_forge.png');
    await visit('smith'); await turnIn('tut_forge1');
    assert.equal((await quest(page, 'tut_forge1'))?.s, 'done');

    await accept('tut_forge2');
    await visit('smith'); await click(page, '[data-act="forge"]'); await click(page, '[data-act="ftab"][data-t="gem"]');
    await click(page, '[data-act="socket"]:not([disabled])'); await page.waitForTimeout(200);
    assert.equal((await page.evaluate('(__game().ch.equip.weapon.g || []).length')), 1, 'gem socketed into the weapon');
    await visit('smith'); await turnIn('tut_forge2');
    assert.equal((await quest(page, 'tut_forge2'))?.s, 'done');

    await page.evaluate('__game().giveExp(9000)');
    await visit('smith'); await accept('tut_forge3');
    await visit('smith'); await click(page, '[data-act="forge"]'); await click(page, '[data-act="ftab"][data-t="fuse"]');
    await click(page, '[data-act="fuse"]:not([disabled])'); await page.waitForTimeout(200);
    assert.ok((await quest(page, 'tut_forge3')).p >= 1, 'gems fused');

    await click(page, '[data-act="ftab"][data-t="gem"]'); await click(page, '[data-act="unsock"]');
    assert.equal(await page.evaluate('(__game().ch.equip.weapon.g || []).length'), 0, 'unsocketing empties the weapon');
    await esc(page);
  });

  it('NPCs talk on their own and greetings vary', async () => {
    await page.evaluate('(() => { const w = __game(); w.player.x = 600; w.player.y = 250; w.banterCd = 0; for (const n of w.npcs) n.chatT = 0.5; })()');
    await page.waitForTimeout(5500);
    await shot(page, 'beginner_chatter.png');
    const chat = await page.evaluate("[...document.querySelectorAll('#chatLog .cl.npc')].map((e) => e.textContent).join(' || ')");
    const bubbles = await page.evaluate("__game().npcs.filter((n) => n.say).map((n) => n.say.text).join(' || ')");
    assert.ok(chat || bubbles, 'NPC chatter or banter');
    const greets = new Set();
    for (let i = 0; i < 6; i++) { await visit('smith'); greets.add(await page.locator('.w-npc blockquote').innerText()); await esc(page); }
    assert.ok(greets.size >= 2, 'smith greetings vary');
  });

  it('no page errors', () => assert.deepEqual(errors, []));
});
