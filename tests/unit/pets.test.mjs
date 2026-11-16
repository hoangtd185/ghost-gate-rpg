// Pets: the data, the pet field of a character (the one that is out plus the ones owned) through load and save.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PETS, ownedPets, cleanPet } from '../../shared/data/pets.js';
import { QUESTS, NPCS } from '../../shared/data/npcs.js';
import { ITEMS } from '../../shared/data/items.js';
import { newCharacter, normalizeCharacter } from '../../shared/rules/character.js';
import { openDb } from '../../server/src/db.js';

test('every pet has what the game shows and says', () => {
  for (const [id, p] of Object.entries(PETS)) {
    assert.ok(p.name && p.src && /^#[0-9a-f]{6}$/i.test(p.color), `${id} name, source, colour`);
    assert.ok(p.lines.length && p.idle.length && p.call && p.rest, `${id} lines`);
  }
});

test('each pet can be earned: a quest rewards it, and the quest is offered by an NPC', () => {
  for (const id of Object.keys(PETS)) {
    const qid = Object.keys(QUESTS).find((q) => QUESTS[q].reward?.pet === id);
    assert.ok(qid, `a quest gives ${id}`);
    assert.ok(Object.values(NPCS).some((n) => (n.quests || []).includes(qid)), `${qid} is offered`);
    const q = QUESTS[qid];
    if (q.type === 'collect') assert.ok(ITEMS[q.target], `${qid} target`);
  }
});

test('the pet field: known pets only, the active one among the owned, old saves gain the list', () => {
  assert.equal(cleanPet(null), null);
  assert.equal(cleanPet({ id: 'dragon' }), null, 'an unknown pet is dropped');
  assert.deepEqual(cleanPet({ id: 'imp', on: true }), { id: 'imp', on: true, owned: ['imp'] }, 'a save from before pets could be owned');
  assert.deepEqual(cleanPet({ id: 'fox_kit', on: false, owned: ['imp', 'fox_kit', 'dragon', 'imp'] }), { id: 'fox_kit', on: false, owned: ['imp', 'fox_kit'] });
  assert.deepEqual(cleanPet({ id: 'dragon', owned: ['fox_kit'] }), { id: 'fox_kit', on: true, owned: ['fox_kit'] }, 'falls back to one that is owned');
  assert.deepEqual(ownedPets({ id: 'fox_kit' }), ['fox_kit']);
  const ch = normalizeCharacter({ ...newCharacter('Pet', 'taoist'), pet: { id: 'imp', on: false } });
  assert.deepEqual(ch.pet, { id: 'imp', on: false, owned: ['imp'] });
});

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qmq-pets-'));
const db = openDb(path.join(dir, 'game.db'));
after(() => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); });

test('the server keeps the owned pets across a save and drops what it does not know', () => {
  const uid = db.createUser('petowner', 'x').id;
  const ch = db.createCharacter(uid, newCharacter('Chu', 'swordsman'));
  assert.equal(ch.pet, null);
  db.saveCharacter(uid, { ...ch, pet: { id: 'fox_kit', on: true, owned: ['imp', 'fox_kit', 'unicorn'] } });
  assert.deepEqual(db.getCharacter(ch.id).pet, { id: 'fox_kit', on: true, owned: ['imp', 'fox_kit'] });
  db.saveCharacter(uid, { ...ch, pet: { id: 'unicorn', on: true } });
  assert.equal(db.getCharacter(ch.id).pet, null);
});
