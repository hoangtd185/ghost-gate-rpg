// Pickup commit queue: pickups from many players are written in one batch, answered only after the commit,
// a repeated pickup is never queued twice, and the per-player rate limit answers "busy".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLoot } from '../../server/src/loot.js';
import { GAME } from '../../client/src/config.js';

function setup() {
  const calls = [];
  const db = { grantItems: (reqs) => { calls.push(reqs.length); return reqs.map((r, i) => ({ rev: i + 1, entry: { uid: 'u' + i, id: r.item.id } })); } };
  const loot = createLoot({ db });
  const player = (id) => ({ id, map: 'forest', x: 500, ch: { cls: 'swordsman', quests: {} } });
  // drops with a guaranteed item, so the test controls how many exist
  const dropsFor = (s, n) => Array.from({ length: n }, () => loot.give(s, { mob: 'wisp' }, 500, 250, [['stone', 1]])[0]);
  return { loot, calls, player, dropsFor };
}

test('pickups from several players are committed in one batch, answered after it', async () => {
  const { loot, calls, player, dropsFor } = setup();
  const a = player('a'), b = player('b');
  const answers = [];
  for (const d of dropsFor(a, 3)) loot.pick(a, { id: d.id }, (r) => answers.push(r));
  for (const d of dropsFor(b, 2)) loot.pick(b, { id: d.id }, (r) => answers.push(r));
  assert.equal(answers.length, 0, 'nobody is told before the commit');
  await new Promise((r) => setTimeout(r, GAME.net.loot.commitMs + 30));
  assert.deepEqual(calls, [5], 'one transaction for all five');
  assert.equal(answers.filter((x) => x.ok).length, 5);
  assert.equal(loot.count('a') + loot.count('b'), 0, 'picked drops are gone');
});

test('the same pickup twice is queued once', async () => {
  const { loot, calls, player, dropsFor } = setup();
  const a = player('a');
  const [d] = dropsFor(a, 1);
  const answers = [];
  loot.pick(a, { id: d.id }, (r) => answers.push(r));
  loot.pick(a, { id: d.id }, (r) => answers.push(r));
  await new Promise((r) => setTimeout(r, GAME.net.loot.commitMs + 30));
  assert.deepEqual(calls, [1]);
  assert.equal(answers.length, 1);
});

test('too many pickups at once from one player: the extra ones are answered "busy"', async () => {
  const { loot, player, dropsFor } = setup();
  const a = player('a');
  const answers = [];
  const n = GAME.net.loot.pickBurst + 5;
  for (const d of dropsFor(a, n)) loot.pick(a, { id: d.id }, (r) => answers.push(r));
  assert.equal(answers.filter((x) => x.why === 'busy').length, 5, 'answered at once');
  await new Promise((r) => setTimeout(r, GAME.net.loot.commitMs + 30));
  assert.equal(answers.filter((x) => x.ok).length, GAME.net.loot.pickBurst);
});

test('a drop that is not yours, or too far, is refused without touching the database', () => {
  const { loot, calls, player, dropsFor } = setup();
  const a = player('a'), b = player('b');
  const [d] = dropsFor(a, 1);
  const answers = [];
  loot.pick(b, { id: d.id }, (r) => answers.push(r));
  a.x = 5000;
  loot.pick(a, { id: d.id }, (r) => answers.push(r));
  assert.deepEqual(answers.map((x) => x.why), ['gone', 'far']);
  assert.deepEqual(calls, []);
});

test('kill reports are only accepted for personal story bosses', () => {
  const { loot, player } = setup();
  const a = player('a'); a.map = 'field'; a.x = 1500;
  assert.equal(loot.kill(a, { k: 1, mob: 'scarecrow' }).why, 'shared');
  const ok = loot.kill(a, { k: 2, mob: 'scarecrow', named: 'nb_scarecrow', x: 1500, y: 250 });
  assert.equal(ok.why, undefined);
  assert.ok(ok.drops.length > 0);
});
