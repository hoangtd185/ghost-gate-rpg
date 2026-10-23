// Data integrity: every id referenced anywhere in the content must exist.
// Catches typos and half-done renames before they reach the game.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAME } from '../../client/src/config.js';
import { CLASSES, SKILLS, PASSIVES } from '../../client/src/data/classes.js';
import { ITEMS, SLOT_NAMES } from '../../client/src/data/items.js';
import { MONSTERS } from '../../client/src/data/monsters.js';
import { MAPS } from '../../client/src/data/maps.js';
import { NPCS, QUESTS } from '../../client/src/data/npcs.js';
import { NAMED, AFFIXES, ELITE_POOL } from '../../client/src/data/affixes.js';
import { RECIPES } from '../../client/src/data/recipes.js';
import { MAIN_ORDER, SCENES, SPEAKERS } from '../../client/src/data/story.js';
import { CHATTER, BANTER } from '../../client/src/data/chatter.js';
import { LEGACY_CLS, LEGACY_MAP, LEGACY_PET, LEGACY_QUEST, legacyItem, legacySkill } from '../../client/src/data/legacy.js';

// Drop/reward tokens: 'W2' = class weapon tier 2, 'GEM1' = random gem grade 1
const itemExists = (id) => !!ITEMS[id] || /^W[1-7]$/.test(id) || /^GEM[1-3]$/.test(id);
const missing = (ids, exists) => [...new Set(ids)].filter((id) => !exists(id));
const speakers = new Set([...Object.keys(NPCS), ...Object.keys(MONSTERS), ...Object.keys(SPEAKERS), 'me', 'sys']);
const linesOf = (q) => [...(q.intro || []), ...(q.outro || [])];

test('config matches the content', () => {
  assert.deepEqual([...GAME.player.classes].sort(), Object.keys(CLASSES).sort());
  assert.deepEqual([...GAME.player.equipSlots].sort(), Object.keys(SLOT_NAMES).sort());
  assert.equal(GAME.forge.enhanceRate.length, GAME.forge.enhanceMax);
});

test('classes reference existing skills and passives', () => {
  for (const [id, c] of Object.entries(CLASSES)) {
    assert.equal(c.id, id);
    assert.deepEqual(missing(c.skills, (s) => SKILLS[s]), [], `class ${id}`);
  }
  for (const [id, p] of Object.entries(PASSIVES)) {
    assert.ok(CLASSES[p.cls], `passive ${id} class`);
    if (p.req) assert.ok(PASSIVES[p.req[0]], `passive ${id} requires ${p.req[0]}`);
  }
});

test('every item in drops, rewards and recipes exists', () => {
  const ids = [];
  for (const m of Object.values(MONSTERS)) ids.push(...(m.drops || []).map((d) => d[0]));
  for (const n of Object.values(NAMED)) ids.push(...(n.drops || []).map((d) => d[0]));
  ids.push(...GAME.monsters.chief.drops.map((d) => d[0]));
  for (const q of Object.values(QUESTS)) {
    ids.push(...(q.reward?.items || []).map((d) => d[0]), ...(q.reward?.random || []).map((d) => d[0]), ...(q.give || []).map((d) => d[0]));
    if (q.drop) ids.push(q.drop.item);
    if (q.type === 'collect') ids.push(q.target);
  }
  for (const r of RECIPES) ids.push(r.out[0], ...r.need.map((d) => d[0]));
  assert.deepEqual(missing(ids, itemExists), []);
});

test('class weapons exist for every tier', () => {
  for (const cls of Object.keys(CLASSES)) for (let t = 1; t <= 7; t++) assert.ok(ITEMS[`w_${cls}${t}`], `w_${cls}${t}`);
});

test('maps: portals, spawns and NPCs point at things that exist', () => {
  for (const [id, m] of Object.entries(MAPS)) {
    for (const p of m.portals) {
      assert.ok(MAPS[p.to], `${id} portal -> ${p.to}`);
      if (p.req) assert.ok(QUESTS[p.req], `${id} portal req ${p.req}`);
      if (p.lock) assert.ok(QUESTS[p.lock], `${id} portal lock ${p.lock}`);
    }
    for (const s of m.spawns) assert.ok(MONSTERS[s.mob], `${id} spawn ${s.mob}`);
    for (const n of m.npcs || []) {
      assert.ok(NPCS[n.id], `${id} npc ${n.id}`);
      for (const k of ['after', 'until', 'hideWhile']) if (n[k]) assert.ok(QUESTS[n[k]], `${id} npc ${n.id}.${k}`);
    }
  }
});

test('quests: givers, targets, requirements and dialogue speakers exist', () => {
  for (const [id, q] of Object.entries(QUESTS)) {
    assert.ok(NPCS[q.npc], `${id} giver ${q.npc}`);
    if (q.turnIn) assert.ok(NPCS[q.turnIn], `${id} turnIn ${q.turnIn}`);
    if (q.requires) assert.ok(QUESTS[q.requires], `${id} requires ${q.requires}`);
    if (q.type === 'talk') assert.ok(NPCS[q.target], `${id} talk target ${q.target}`);
    if (q.type === 'kill') assert.ok(MONSTERS[q.target] || NAMED[q.target], `${id} kill target ${q.target}`);
    if (q.drop) assert.ok(MONSTERS[q.drop.mob], `${id} drop mob ${q.drop.mob}`);
    if (q.reward?.pet) assert.ok(q.reward.pet === 'imp', `${id} pet ${q.reward.pet}`);
    assert.deepEqual(missing(linesOf(q).map((l) => l[0]), (s) => speakers.has(s)), [], `${id} speakers`);
  }
  assert.deepEqual(missing(MAIN_ORDER, (q) => QUESTS[q]), [], 'MAIN_ORDER');
});

test('scenes, chatter and banter use existing maps, quests and speakers', () => {
  for (const [id, s] of Object.entries(SCENES)) {
    assert.ok(MAPS[s.map], `${id} map`);
    assert.ok(QUESTS[s.quest], `${id} quest`);
    const lines = [...s.lines, ...(s.choices || []).flatMap((c) => c.lines)];
    assert.deepEqual(missing(lines.map((l) => l[0]), (x) => speakers.has(x)), [], `${id} speakers`);
  }
  assert.deepEqual(missing(Object.keys(CHATTER), (n) => NPCS[n]), [], 'CHATTER npcs');
  for (const b of BANTER) {
    assert.ok(MAPS[b.map], `banter map ${b.map}`);
    assert.deepEqual(missing(b.lines.map((l) => l[0]), (n) => NPCS[n]), [], `banter on ${b.map}`);
  }
});

test('named bosses and affixes are consistent', () => {
  for (const [id, n] of Object.entries(NAMED)) {
    assert.ok(MONSTERS[n.mob], `${id} mob ${n.mob}`);
    assert.ok(MAPS[n.map], `${id} map ${n.map}`);
    if (n.quest) assert.ok(QUESTS[n.quest], `${id} quest ${n.quest}`);
    assert.deepEqual(missing(n.affix, (a) => AFFIXES[a]), [], `${id} affixes`);
  }
  assert.deepEqual(missing(ELITE_POOL, (a) => AFFIXES[a]), []);
  for (const [id, m] of Object.entries(MONSTERS)) assert.deepEqual(missing(m.affix || [], (a) => AFFIXES[a]), [], `${id} affixes`);
});

test('legacy ids migrate to ids that exist', () => {
  for (const to of Object.values(LEGACY_CLS)) assert.ok(CLASSES[to], to);
  for (const to of Object.values(LEGACY_MAP)) assert.ok(MAPS[to], to);
  for (const to of Object.values(LEGACY_QUEST)) assert.ok(QUESTS[to], to);
  assert.deepEqual(Object.values(LEGACY_PET), ['imp']);
  for (const old of ['out_daohoa', 'hat_huyetsat', 'w_kiem3', 'w_dao7', 'orb_hoa', 'acc_wuxing']) assert.ok(ITEMS[legacyItem(old)], old);
  for (const old of ['k_basic', 'd_heal', 't_p4']) assert.ok(SKILLS[legacySkill(old)] || PASSIVES[legacySkill(old)], old);
});
