// SQLite database (uses the built-in node:sqlite module, Node >= 22.13, no packages needed)
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { QUESTS } from '../../shared/data/npcs.js';
import { todayKey } from '../../shared/rules/character.js';
import { int, num, str, rowToEntry, cleanFlags } from './db/helpers.js';
import { SCHEMA, migrate } from './db/schema.js';

import { ItemsDb } from './db/items.js';
import { PremiumDb } from './db/premium.js';
import { EventsDb } from './db/events.js';

export class GameDb {
  constructor(db) {
    this.db = db;
    this.q = {
      userByName: db.prepare('SELECT * FROM users WHERE username = ?'),
      insertUser: db.prepare('INSERT INTO users (username, pass_hash, created_at) VALUES (?, ?, ?)'),
      charsOfUser: db.prepare('SELECT * FROM characters WHERE user_id = ? ORDER BY level DESC'),
      charById: db.prepare('SELECT * FROM characters WHERE id = ?'),
      charByName: db.prepare('SELECT id FROM characters WHERE name = ?'),
      countChars: db.prepare('SELECT COUNT(*) AS n FROM characters WHERE user_id = ?'),
      insertChar: db.prepare(`INSERT INTO characters (id, user_id, name, cls, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`),
      updateChar: db.prepare(`UPDATE characters SET level=?, exp=?, hp=?, mp=?, map=?, x=?,
        stat_str=?, stat_dex=?, stat_int=?, stat_vit=?, stat_points=?, skill_points=?, skills=?, pet=?, title=?, flags=?, play_time=?, updated_at=?
        WHERE id = ? AND user_id = ?`),
      setGold: db.prepare('UPDATE characters SET gold = ? WHERE id = ?'),
      addIngots: db.prepare('UPDATE characters SET ingots = ingots + ? WHERE id = ? AND ingots + ? >= 0 RETURNING ingots'),
      setCheckin: db.prepare('UPDATE characters SET checkin = ? WHERE id = ?'),
      questState: db.prepare('SELECT state FROM quests WHERE character_id = ? AND quest_id = ?'),
      bagOf: db.prepare('SELECT item_id FROM items WHERE character_id = ? AND equip_slot IS NULL'),
      bumpRev: db.prepare('UPDATE characters SET item_rev = item_rev + 1 WHERE id = ? RETURNING item_rev'),
      itemByUid: db.prepare('SELECT * FROM items WHERE uid = ?'),
      invCount: db.prepare('SELECT COUNT(*) AS n FROM items WHERE character_id = ? AND equip_slot IS NULL'),
      hasStack: db.prepare('SELECT 1 AS y FROM items WHERE character_id = ? AND item_id = ? AND equip_slot IS NULL LIMIT 1'),
      maxPos: db.prepare('SELECT COALESCE(MAX(position), 0) AS p FROM items WHERE character_id = ?'),
      moveItem: db.prepare('UPDATE items SET character_id = ?, equip_slot = NULL, position = ? WHERE uid = ?'),
      ledgerAdd: db.prepare('INSERT INTO item_ledger (at, character_id, rev, kind, item_uid, item_id, qty, entry, reason, ref, req_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
      ledgerByReq: db.prepare('SELECT * FROM item_ledger WHERE req_id = ?'),
      ledgerSince: db.prepare("SELECT rev, kind, item_uid, item_id, qty, entry FROM item_ledger WHERE character_id = ? AND rev > ? AND kind IN ('gain', 'loss', 'gold', 'ingots') ORDER BY rev, id"),
      addEventExp: db.prepare('UPDATE characters SET event_exp = event_exp + ? WHERE id = ? RETURNING event_exp'),
      setExpTaken: db.prepare('UPDATE characters SET event_exp_taken = MAX(0, MIN(?, event_exp)) WHERE id = ?'),
      windowsOf: db.prepare('SELECT start FROM event_windows WHERE dungeon = ?'),
      windowAdd: db.prepare('INSERT OR IGNORE INTO event_windows (dungeon, start) VALUES (?, ?)'),
      pendingAdd: db.prepare('INSERT OR IGNORE INTO event_pending (req_id, character_id, item, ref, at) VALUES (?, ?, ?, ?, ?)'),
      pendingOf: db.prepare('SELECT * FROM event_pending WHERE character_id = ? ORDER BY at, req_id'),
      pendingDel: db.prepare('DELETE FROM event_pending WHERE req_id = ?'),
      pendingCount: db.prepare('SELECT COUNT(*) AS n FROM event_pending WHERE character_id = ?'),
      ledgerOf: db.prepare('SELECT * FROM item_ledger WHERE character_id = ? ORDER BY id'),
      deleteChar: db.prepare('DELETE FROM characters WHERE id = ? AND user_id = ?'),
      itemsOf: db.prepare('SELECT * FROM items WHERE character_id = ? ORDER BY position'),
      clearItems: db.prepare('DELETE FROM items WHERE character_id = ?'),
      insertItem: db.prepare('INSERT INTO items (uid, character_id, item_id, qty, rarity, bonus, equip_slot, position, enhance, el, gems) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
      questsOf: db.prepare('SELECT * FROM quests WHERE character_id = ?'),
      clearQuests: db.prepare('DELETE FROM quests WHERE character_id = ?'),
      insertQuest: db.prepare('INSERT INTO quests (character_id, quest_id, state, progress, day) VALUES (?, ?, ?, ?, ?)'),
      top: db.prepare('SELECT name, cls, level, exp FROM characters ORDER BY level DESC, exp DESC LIMIT 10'),
    };
  }

  transaction(fn) {
    this.db.exec('BEGIN');
    try { const r = fn(); this.db.exec('COMMIT'); return r; }
    catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }

  close() { try { this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); this.db.close(); } catch { /* already closed */ } }

  getUser(username) { return this.q.userByName.get(username); }

  createUser(username, passHash) {
    const r = this.q.insertUser.run(username, passHash, Date.now());
    return { id: Number(r.lastInsertRowid), username };
  }

  // Joins the tables back into the same character object the client uses
  toCharacter(row) {
    const ch = {
      id: row.id, name: row.name, cls: row.cls, level: row.level, exp: row.exp, gold: row.gold,
      hp: row.hp, mp: row.mp, map: row.map, x: row.x,
      stats: { str: row.stat_str, dex: row.stat_dex, int: row.stat_int, vit: row.stat_vit },
      statPoints: row.stat_points, skillPoints: row.skill_points,
      skills: JSON.parse(row.skills || '{}'), playTime: row.play_time,
      pet: row.pet ? JSON.parse(row.pet) : null,
      title: row.title || null,
      flags: JSON.parse(row.flags || '{}'),
      inventory: [], equip: { weapon: null, hat: null, armor: null, acc: null, outfit: null, cape: null }, quests: {},
      createdAt: row.created_at, itemRev: row.item_rev || 0,
      ingots: row.ingots || 0, checkin: row.checkin ? JSON.parse(row.checkin) : null,
      eventExp: row.event_exp || 0, eventExpTaken: row.event_exp_taken || 0,
    };
    for (const it of this.q.itemsOf.all(row.id)) {
      const e = rowToEntry(it);
      if (it.equip_slot) ch.equip[it.equip_slot] = e; else ch.inventory.push(e);
    }
    for (const q of this.q.questsOf.all(row.id)) ch.quests[q.quest_id] = q.day ? { s: q.state, p: q.progress, day: q.day } : { s: q.state, p: q.progress };
    return ch;
  }

  listCharacters(userId) { return this.q.charsOfUser.all(userId).map((r) => this.toCharacter(r)); }

  countCharacters(userId) { return this.q.countChars.get(userId).n; }

  nameTaken(name) { return !!this.q.charByName.get(name); }

  getCharacter(id) { const r = this.q.charById.get(id); return r ? this.toCharacter(r) : null; }

  createCharacter(userId, ch) {
    return this.transaction(() => {
      const now = Date.now();
      this.q.insertChar.run(str(ch.id, 40), userId, str(ch.name, 14), str(ch.cls, 10), now, now);
      this.writeState(userId, { ...ch, itemRev: 0 }, { create: true });
      return this.getCharacter(ch.id);
    });
  }

  // Save a character uploaded by its client. Returns null if it is not this user's character, otherwise
  // { itemRev, stale } and, when the server changed the uploaded items, { items: { inventory, equip } }.
  saveCharacter(userId, ch) {
    return this.transaction(() => this.writeState(userId, ch));
  }

  writeState(userId, ch, { create = false } = {}) {
    const id = str(ch.id, 40);
    const row = this.q.charById.get(id);
    if (!row || row.user_id !== userId) return null;
    const s = ch.stats || {};
    this.q.updateChar.run(
      int(ch.level, 1), int(ch.exp), num(ch.hp, 1), num(ch.mp, 1), str(ch.map || 'village', 20), num(ch.x, 380),
      int(s.str), int(s.dex), int(s.int), int(s.vit), int(ch.statPoints), int(ch.skillPoints),
      JSON.stringify(ch.skills || {}),
      ch.pet && ch.pet.id ? JSON.stringify({ id: str(ch.pet.id, 20), on: ch.pet.on !== false }) : null,
      ch.title ? str(ch.title, 40) : null,
      JSON.stringify(cleanFlags(ch.flags)),
      num(ch.playTime), Date.now(), id, userId,
    );
    // How much event EXP this character took goes with its EXP and level (a save always writes both, stale or not);
    // it can never pass what the server granted, and the total itself is never taken from a save
    this.q.setExpTaken.run(int(ch.eventExpTaken), id);
    // Items, gold and quests: a save made before the client applied the server's latest item changes (a pickup
    // or a trade it had not received yet, an old outbox copy) must not overwrite them. Quests go with the items
    // because quest rewards are checked against quest changes (see reconcileItems).
    const rev = row.item_rev || 0;
    if (int(ch.itemRev) < rev) return { itemRev: rev, stale: true };
    this.q.setGold.run(Math.max(0, int(ch.gold)), id);
    const fixed = this.reconcileItems(id, rev, ch, row.cls, create);
    this.writeQuests(id, ch.quests);
    const out = { itemRev: rev, stale: false };
    if (fixed) {
      const now = this.getCharacter(id);
      out.items = { inventory: now.inventory, equip: now.equip };
    }
    return out;
  }

  // Quests from a save. A quest the database has as done stays done (a save cannot remove or downgrade it), except a
  // daily quest taken again on a later day. The day of a daily completion is the server's date, not the client's.
  writeQuests(id, uploaded) {
    const today = todayKey(), db = {};
    for (const q of this.q.questsOf.all(id)) db[q.quest_id] = q;
    const out = new Map();
    for (const [qid0, q] of Object.entries(uploaded || {})) {
      const qid = str(qid0, 30), old = db[qid], daily = !!QUESTS[qid]?.daily;
      if (!q || (q.s !== 'active' && q.s !== 'done')) continue;
      if (old?.state === 'done' && !(daily && q.s === 'active' && old.day !== today)) { out.set(qid, [old.state, old.progress, old.day]); continue; }
      const day = q.s === 'done' && daily ? (old?.state === 'done' ? old.day : today) : null;
      out.set(qid, [q.s, int(q.p), day]);
    }
    for (const [qid, old] of Object.entries(db)) if (old.state === 'done' && !out.has(qid)) out.set(qid, [old.state, old.progress, old.day]);
    this.q.clearQuests.run(id);
    for (const [qid, [s, p, day]] of out) this.q.insertQuest.run(id, qid, s, p, day);
  }

  deleteCharacter(userId, id) { return this.q.deleteChar.run(id, userId).changes > 0; }

  leaderboard() { return this.q.top.all(); }
}

export function openDb(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  // synchronous = FULL: a save that got its "ok" survives a power cut, not only a process crash
  db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);

  migrate(db);
  return new GameDb(db);
}

Object.assign(GameDb.prototype, ItemsDb, PremiumDb, EventsDb);
