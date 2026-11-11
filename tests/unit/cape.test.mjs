// Capes: the item data (every cape can be drawn) and the cloth simulation (hangs behind the back, trails while
// moving, never flips over the head, restarts after a teleport).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAME } from '../../shared/config.js';
import { ITEMS, GEM_SLOTS, isLookSlot } from '../../shared/data/items.js';
import { CapeCloth } from '../../client/src/gfx/cape.js';

const CAPES = Object.entries(ITEMS).filter(([, it]) => it.slot === 'cape');
const HEMS = ['plain', 'feather', 'tattered', 'scallop', 'flame'];
const MOTIFS = ['moon', 'dragon', 'flower', 'snow', 'cloud', 'eye'];
const FX = ['petal', 'star', 'ember', 'snow', 'wisp'];

test('every cape has a drawable cape look', () => {
  assert.ok(CAPES.length >= 2);
  const hex = /^#[0-9a-f]{6}$/i;
  for (const [id, it] of CAPES) {
    const c = it.cape;
    assert.ok(c, `${id}: cape look`);
    for (const k of ['c', 't']) assert.match(c[k], hex, `${id}.${k}`);
    if (c.c2) assert.match(c.c2, hex, `${id}.c2`);
    assert.ok(c.len >= 14 && c.len <= 40 && c.w >= 8 && c.w <= 24, `${id}: size`);
    assert.ok(HEMS.includes(c.hem), `${id}: hem ${c.hem}`);
    if (c.motif) assert.ok(MOTIFS.includes(c.motif), `${id}: motif ${c.motif}`);
    if (c.fx) assert.ok(FX.includes(c.fx.shape) && hex.test(c.fx.c), `${id}: fx`);
    assert.ok(isLookSlot(it.slot));
  }
});

test('the cape slot exists everywhere equipment slots are listed', () => {
  assert.ok(GAME.player.equipSlots.includes('cape'));
  for (const s of GAME.player.equipSlots) assert.ok(GEM_SLOTS[s], `gem slots for ${s}`);
});

// runs the cloth for `sec` seconds with the anchor moving at vx
function run(cloth, { x = 500, y = 200, facing = 1, vx = 0, sec = 2, len = 24 } = {}) {
  const dt = 1 / 60;
  for (let t = 0; t < sec; t += dt) { x += vx * dt; cloth.update(x, y, facing, vx, dt, len, y + 40); }
  return { x, y, tip: cloth.tip(), pts: cloth.pts };
}

test('standing still: the cape hangs down behind the back', () => {
  for (const facing of [1, -1]) {
    const { x, y, tip } = run(new CapeCloth(), { facing });
    assert.ok(tip.y > y + 12, 'hangs down');
    assert.ok((tip.x - x) * facing < -1, 'behind the wearer');
  }
});

test('moving: the cape trails further behind and stays attached', () => {
  const still = run(new CapeCloth());
  const moving = run(new CapeCloth(), { vx: 190 });
  assert.ok(moving.x - moving.tip.x > still.x - still.tip.x + 3, 'trails behind while running');
  const seg = 24 / (GAME.cape.segments - 1);
  moving.pts.slice(1).forEach((p, i) => {
    const a = moving.pts[i];
    assert.ok(Math.abs(Math.hypot(p.x - a.x, p.y - a.y) - seg) < 0.01, 'segments keep their length');
    assert.ok(p.y >= a.y - seg * GAME.cape.maxRise - 1e-6, 'never rises over the shoulders');
    assert.ok(p.x - moving.x <= 1.5 + 1e-6, 'never in front of the body');
  });
  assert.equal(moving.pts[0].x, moving.x, 'pinned at the anchor');
});

test('a teleport restarts the cloth instead of stretching it across the map', () => {
  const cloth = new CapeCloth();
  run(cloth);
  cloth.update(3000, 200, 1, 0, 1 / 60, 24, 240);
  assert.ok(Math.abs(cloth.tip().x - 3000) < 30);
});
