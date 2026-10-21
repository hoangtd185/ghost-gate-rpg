// SQLite database (uses the built-in node:sqlite module, Node >= 22.13, no packages needed)
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  username    TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pass_hash   TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS characters (
  id           TEXT PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  cls          TEXT NOT NULL,
  level        INTEGER NOT NULL DEFAULT 1,
  exp          INTEGER NOT NULL DEFAULT 0,
  gold         INTEGER NOT NULL DEFAULT 0,
  hp           REAL NOT NULL DEFAULT 1,
  mp           REAL NOT NULL DEFAULT 1,
  map          TEXT NOT NULL DEFAULT 'village',
  x            REAL NOT NULL DEFAULT 380,
  stat_str     INTEGER NOT NULL DEFAULT 0,
  stat_dex     INTEGER NOT NULL DEFAULT 0,
  stat_int     INTEGER NOT NULL DEFAULT 0,
  stat_vit     INTEGER NOT NULL DEFAULT 0,
  stat_points  INTEGER NOT NULL DEFAULT 0,
  skill_points INTEGER NOT NULL DEFAULT 0,
  skills       TEXT NOT NULL DEFAULT '{}',   -- JSON: { skillId: level }
  pet          TEXT,                         -- JSON: { id, on }, or NULL if no pet yet
  title        TEXT,                         -- title currently shown
  flags        TEXT NOT NULL DEFAULT '{}',   -- JSON: story choices, e.g. { bell: 'ring' }
  play_time    REAL NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_characters_user ON characters(user_id);

-- One row per item. A non-NULL equip_slot means it is equipped.
CREATE TABLE IF NOT EXISTS items (
  uid          TEXT PRIMARY KEY,
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_id      TEXT NOT NULL,
  qty          INTEGER NOT NULL DEFAULT 1,
  rarity       INTEGER NOT NULL DEFAULT 0,
  bonus        TEXT NOT NULL DEFAULT '{}',   -- JSON bonus stats
  equip_slot   TEXT,                         -- weapon | hat | armor | acc | outfit
  enhance      INTEGER NOT NULL DEFAULT 0,   -- enhancement level +0..+10
  el           TEXT,                         -- socketed element (fire/ice/thunder/poison)
  gems         TEXT NOT NULL DEFAULT '[]',   -- JSON: gems in the sockets, e.g. ["gem_atk1"]
  position     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_items_char ON items(character_id);

CREATE TABLE IF NOT EXISTS quests (
  character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  quest_id     TEXT NOT NULL,
  state        TEXT NOT NULL,                -- active | done
  progress     INTEGER NOT NULL DEFAULT 0,
  day          TEXT,                         -- completion day (daily quests)
  PRIMARY KEY (character_id, quest_id)
);
`;

export function openDb(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  migrate(db);
  return new GameDb(db);
}

// Upgrade older databases: add new columns without losing data
function migrate(db) {
  const cols = db.prepare('PRAGMA table_info(characters)').all().map((c) => c.name);
  if (!cols.includes('pet')) db.exec('ALTER TABLE characters ADD COLUMN pet TEXT');
  if (!cols.includes('title')) db.exec('ALTER TABLE characters ADD COLUMN title TEXT');
  if (!cols.includes('flags')) db.exec("ALTER TABLE characters ADD COLUMN flags TEXT NOT NULL DEFAULT '{}'");
  const icols = db.prepare('PRAGMA table_info(items)').all().map((c) => c.name);
  if (!icols.includes('enhance')) db.exec('ALTER TABLE items ADD COLUMN enhance INTEGER NOT NULL DEFAULT 0');
  if (!icols.includes('el')) db.exec('ALTER TABLE items ADD COLUMN el TEXT');
  if (!icols.includes('gems')) db.exec("ALTER TABLE items ADD COLUMN gems TEXT NOT NULL DEFAULT '[]'");
  const qcols = db.prepare('PRAGMA table_info(quests)').all().map((c) => c.name);
  if (!qcols.includes('day')) db.exec('ALTER TABLE quests ADD COLUMN day TEXT');
  // Class ids were renamed to English. The class is never re-saved, so it is fixed here;
  // everything else (maps, items, skills…) is migrated by the client on load and written back on save.
  const LEGACY_CLS = { kiem: 'swordsman', dao: 'taoist', thich: 'assassin' };
  const fix = db.prepare('UPDATE characters SET cls = ? WHERE cls = ?');
  for (const [from, to] of Object.entries(LEGACY_CLS)) fix.run(to, from);
}

const int = (v, d = 0) => (Number.isFinite(+v) ? Math.floor(+v) : d);
const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
const str = (v, max = 64) => String(v ?? '').slice(0, max);
const EQUIP_SLOTS = new Set(['weapon', 'hat', 'armor', 'acc', 'outfit']);
// Story flags: only keep short string key/value pairs
function cleanFlags(f) {
  const out = {};
  if (f && typeof f === 'object') for (const [k, v] of Object.entries(f).slice(0, 30)) out[str(k, 20)] = str(v, 20);
  return out;
}

class GameDb {
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
      updateChar: db.prepare(`UPDATE characters SET level=?, exp=?, gold=?, hp=?, mp=?, map=?, x=?,
        stat_str=?, stat_dex=?, stat_int=?, stat_vit=?, stat_points=?, skill_points=?, skills=?, pet=?, title=?, flags=?, play_time=?, updated_at=?
        WHERE id = ? AND user_id = ?`),
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
      inventory: [], equip: { weapon: null, hat: null, armor: null, acc: null, outfit: null }, quests: {},
      createdAt: row.created_at,
    };
    for (const it of this.q.itemsOf.all(row.id)) {
      const e = { uid: it.uid, id: it.item_id, qty: it.qty, r: it.rarity, b: JSON.parse(it.bonus || '{}') };
      if (it.enhance) e.e = it.enhance;
      if (it.el) e.el = it.el;
      const gems = JSON.parse(it.gems || '[]');
      if (gems.length) e.g = gems;
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
      this.writeState(userId, ch);
      return this.getCharacter(ch.id);
    });
  }

  saveCharacter(userId, ch) {
    return this.transaction(() => this.writeState(userId, ch));
  }

  writeState(userId, ch) {
    const s = ch.stats || {};
    const r = this.q.updateChar.run(
      int(ch.level, 1), int(ch.exp), int(ch.gold), num(ch.hp, 1), num(ch.mp, 1), str(ch.map || 'village', 20), num(ch.x, 380),
      int(s.str), int(s.dex), int(s.int), int(s.vit), int(ch.statPoints), int(ch.skillPoints),
      JSON.stringify(ch.skills || {}),
      ch.pet && ch.pet.id ? JSON.stringify({ id: str(ch.pet.id, 20), on: ch.pet.on !== false }) : null,
      ch.title ? str(ch.title, 40) : null,
      JSON.stringify(cleanFlags(ch.flags)),
      num(ch.playTime), Date.now(), str(ch.id, 40), userId,
    );
    if (r.changes === 0) return false; // not this user's character
    const id = str(ch.id, 40);
    this.q.clearItems.run(id);
    let pos = 0;
    const putItem = (e, slot) => {
      if (!e || !e.id) return;
      const el = ['fire', 'ice', 'thunder', 'poison'].includes(e.el) ? e.el : null;
      const gems = Array.isArray(e.g) ? e.g.slice(0, 3).map((g) => str(g, 20)) : [];
      this.q.insertItem.run(str(e.uid, 40), id, str(e.id, 30), Math.max(1, int(e.qty, 1)), int(e.r), JSON.stringify(e.b || {}), slot, pos++, Math.max(0, Math.min(10, int(e.e))), el, JSON.stringify(gems));
    };
    for (const [slot, e] of Object.entries(ch.equip || {})) if (EQUIP_SLOTS.has(slot)) putItem(e, slot);
    for (const e of (ch.inventory || []).slice(0, 60)) putItem(e, null);
    this.q.clearQuests.run(id);
    for (const [qid, q] of Object.entries(ch.quests || {})) {
      if (q && (q.s === 'active' || q.s === 'done')) this.q.insertQuest.run(id, str(qid, 30), q.s, int(q.p), q.day ? str(q.day, 10) : null);
    }
    return true;
  }

  deleteCharacter(userId, id) { return this.q.deleteChar.run(id, userId).changes > 0; }
  leaderboard() { return this.q.top.all(); }
}
