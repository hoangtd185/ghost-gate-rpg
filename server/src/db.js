// SQLite database (uses the built-in node:sqlite module, Node >= 22.13, no packages needed)
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { GAME } from '../../client/src/config.js'; // game rules shared with the client
import { ITEMS } from '../../client/src/data/items.js';
import { legacyItem } from '../../client/src/data/legacy.js';
import { isFreeItem, freeItems, questGrants, craftGrants, starterKit } from '../../client/src/game/loot.js';
const isFreeItemId = (id) => freeItems().has(id);

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

-- Every change the server makes to a character's items or gold (drops picked up, trades), plus saves it refused.
-- rev = the character's item_rev after the change; clients replay rows newer than the rev they know.
CREATE TABLE IF NOT EXISTS item_ledger (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  at           INTEGER NOT NULL,
  character_id TEXT NOT NULL,
  rev          INTEGER NOT NULL,
  kind         TEXT NOT NULL,                -- gain | loss | gold | rejected
  item_uid     TEXT,
  item_id      TEXT,
  qty          INTEGER NOT NULL DEFAULT 0,   -- items: quantity; gold: signed amount
  entry        TEXT,                         -- JSON item for gains (what the client adds)
  reason       TEXT NOT NULL,                -- drop | trade | save
  ref          TEXT,                         -- drop id, trade id, partner, why a save was refused
  req_id       TEXT UNIQUE                   -- idempotency key: the same request never applies twice
);
CREATE INDEX IF NOT EXISTS idx_ledger_char ON item_ledger(character_id, rev);
`;

export function openDb(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  // synchronous = FULL: a save that got its "ok" survives a power cut, not only a process crash
  db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA foreign_keys = ON;');
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
  // item_rev: bumped on every server-side item/gold change; saves made from an older rev do not touch items or gold
  if (!cols.includes('item_rev')) db.exec('ALTER TABLE characters ADD COLUMN item_rev INTEGER NOT NULL DEFAULT 0');
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
const EQUIP_SLOTS = new Set(GAME.player.equipSlots);
const INV_SIZE = GAME.player.invSize;
const ELEMENT_IDS = ['fire', 'ice', 'thunder', 'poison'];
export const newUid = () => crypto.randomBytes(6).toString('hex') + Date.now().toString(36).slice(-4);
const isStack = (id) => ITEMS[id] && ITEMS[id].type !== 'equip';

// Item row -> the entry object the client uses
function rowToEntry(it) {
  const e = { uid: it.uid, id: it.item_id, qty: it.qty, r: it.rarity, b: JSON.parse(it.bonus || '{}') };
  if (it.enhance) e.e = it.enhance;
  if (it.el) e.el = it.el;
  const gems = JSON.parse(it.gems || '[]');
  if (gems.length) e.g = gems;
  return e;
}
// Client entry -> clean values for an item row
function cleanEntry(e) {
  return {
    uid: str(e.uid, 40), id: str(e.id, 30), qty: Math.max(1, Math.min(999, int(e.qty, 1))), r: Math.max(0, Math.min(3, int(e.r))),
    b: e.b && typeof e.b === 'object' && !Array.isArray(e.b) ? e.b : {},
    e: Math.max(0, Math.min(GAME.forge.enhanceMax, int(e.e))), el: ELEMENT_IDS.includes(e.el) ? e.el : null,
    g: Array.isArray(e.g) ? e.g.slice(0, 3).map((x) => str(x, 20)) : [],
  };
}
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
      updateChar: db.prepare(`UPDATE characters SET level=?, exp=?, hp=?, mp=?, map=?, x=?,
        stat_str=?, stat_dex=?, stat_int=?, stat_vit=?, stat_points=?, skill_points=?, skills=?, pet=?, title=?, flags=?, play_time=?, updated_at=?
        WHERE id = ? AND user_id = ?`),
      setGold: db.prepare('UPDATE characters SET gold = ? WHERE id = ?'),
      bumpRev: db.prepare('UPDATE characters SET item_rev = item_rev + 1 WHERE id = ? RETURNING item_rev'),
      itemByUid: db.prepare('SELECT * FROM items WHERE uid = ?'),
      invCount: db.prepare('SELECT COUNT(*) AS n FROM items WHERE character_id = ? AND equip_slot IS NULL'),
      hasStack: db.prepare('SELECT 1 AS y FROM items WHERE character_id = ? AND item_id = ? AND equip_slot IS NULL LIMIT 1'),
      maxPos: db.prepare('SELECT COALESCE(MAX(position), 0) AS p FROM items WHERE character_id = ?'),
      moveItem: db.prepare('UPDATE items SET character_id = ?, equip_slot = NULL, position = ? WHERE uid = ?'),
      ledgerAdd: db.prepare('INSERT INTO item_ledger (at, character_id, rev, kind, item_uid, item_id, qty, entry, reason, ref, req_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
      ledgerByReq: db.prepare('SELECT * FROM item_ledger WHERE req_id = ?'),
      ledgerSince: db.prepare("SELECT rev, kind, item_uid, item_id, qty, entry FROM item_ledger WHERE character_id = ? AND rev > ? AND kind IN ('gain', 'loss', 'gold') ORDER BY rev, id"),
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
      inventory: [], equip: { weapon: null, hat: null, armor: null, acc: null, outfit: null }, quests: {},
      createdAt: row.created_at, itemRev: row.item_rev || 0,
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
    // Items, gold and quests: a save made before the client applied the server's latest item changes (a pickup
    // or a trade it had not received yet, an old outbox copy) must not overwrite them. Quests go with the items
    // because quest rewards are checked against quest changes (see reconcileItems).
    const rev = row.item_rev || 0;
    if (int(ch.itemRev) < rev) return { itemRev: rev, stale: true };
    this.q.setGold.run(Math.max(0, int(ch.gold)), id);
    const fixed = this.reconcileItems(id, rev, ch, row.cls, create);
    this.q.clearQuests.run(id);
    for (const [qid, q] of Object.entries(ch.quests || {})) {
      if (q && (q.s === 'active' || q.s === 'done')) this.q.insertQuest.run(id, str(qid, 30), q.s, int(q.p), q.day ? str(q.day, 10) : null);
    }
    const out = { itemRev: rev, stale: false };
    if (fixed) {
      const now = this.getCharacter(id);
      out.items = { inventory: now.inventory, equip: now.equip };
    }
    return out;
  }

  // Replace a character's items with the uploaded ones, under the server's rules:
  //  - an item the server already has keeps its server-side identity (id, rarity, bonus stats); the client
  //    may change quantity, enhancement, element, gems and where it sits (bag or equipment slot)
  //  - an item that now belongs to another character (traded away) is dropped
  //  - "free" items (shops, gems, quest-only items) may be added; any other item may only grow by what this
  //    save earned: quests accepted/completed in it, crafting materials used up, the starter kit of a new
  //    character. Monster drops only ever come from the server. Stacks may be merged or used up.
  // Returns true if anything uploaded was refused or changed.
  reconcileItems(id, rev, ch, cls, create) {
    const have = new Map(this.q.itemsOf.all(id).map((r) => [r.uid, r]));
    const list = [];
    for (const [slot, e] of Object.entries(ch.equip || {})) if (e && EQUIP_SLOTS.has(slot)) list.push([e, slot]);
    for (const e of (ch.inventory || []).slice(0, INV_SIZE + 24)) if (e) list.push([e, null]);
    const keep = [], seen = new Set();
    let fixed = false;
    const log = (uid, itemId, qty, why) => this.q.ledgerAdd.run(Date.now(), id, rev, 'rejected', uid, itemId, qty, null, 'save', why, null);
    for (const [raw, slot] of list) {
      const e = cleanEntry(raw);
      if (!e.uid || seen.has(e.uid)) { fixed = true; continue; }
      seen.add(e.uid);
      const old = have.get(e.uid);
      if (old) {
        const itemId = legacyItem(old.item_id) === e.id ? e.id : old.item_id; // allow renamed ids from data/legacy.js
        if (e.id !== itemId || e.r !== old.rarity || JSON.stringify(e.b) !== old.bonus) fixed = true;
        keep.push({ ...e, id: itemId, r: old.rarity, b: JSON.parse(old.bonus || '{}'), slot });
        continue;
      }
      let why = null;
      if (!ITEMS[e.id]) why = 'unknown';
      else if (this.q.itemByUid.get(e.uid)) why = 'owned_elsewhere';
      else if (isFreeItemId(e.id) && !isFreeItem(e.id, e.r)) why = 'rarity';
      else if (!isFreeItemId(e.id) && e.r > (ITEMS[e.id].type === 'equip' ? 3 : 0)) why = 'rarity';
      if (why) { fixed = true; log(e.uid, e.id, e.qty, why); } else keep.push({ ...e, slot });
    }
    // Quantities of items that are not free: never more than before plus what this save earned
    const total = (rows, idOf, qtyOf) => rows.reduce((m, x) => m.set(idOf(x), (m.get(idOf(x)) || 0) + qtyOf(x)), new Map());
    const before = total([...have.values()], (r) => r.item_id, (r) => r.qty);
    const after = total(keep, (e) => e.id, (e) => e.qty);
    const used = new Map();
    for (const [itemId, n] of before) if ((after.get(itemId) || 0) < n) used.set(itemId, n - (after.get(itemId) || 0));
    const dbQuests = {};
    for (const q of this.q.questsOf.all(id)) dbQuests[q.quest_id] = { s: q.state, p: q.progress, day: q.day };
    const grants = [questGrants(dbQuests, ch.quests, cls), craftGrants(used, cls), create ? starterKit(cls) : new Map()];
    const allowed = (itemId) => grants.reduce((n, m) => n + (m.get(itemId) || 0), 0);
    let final = keep;
    for (const [itemId, n] of after) {
      const grew = n - (before.get(itemId) || 0);
      if (grew <= 0 || isFreeItemId(itemId) || grew <= allowed(itemId)) continue;
      fixed = true;
      log(null, itemId, grew, 'not_earned');
      final = final.filter((e) => e.id !== itemId);
      for (const r of have.values()) if (r.item_id === itemId) final.push({ ...cleanEntry(rowToEntry(r)), slot: r.equip_slot });
    }
    this.q.clearItems.run(id);
    let pos = 0;
    for (const e of final) {
      const slot = e.slot && EQUIP_SLOTS.has(e.slot) ? e.slot : null;
      this.q.insertItem.run(e.uid, id, e.id, e.qty, e.r, JSON.stringify(e.b || {}), slot, pos++, e.e || 0, e.el || null, JSON.stringify(e.g || []));
    }
    return fixed;
  }

  // ===== Server-side item changes (online play) =====
  // Each runs in one transaction and writes a ledger row before the client is told anything.

  // Put a picked-up drop into a character's bag. reqId makes a repeated request a no-op.
  // Returns { rev, entry } | { dup: true } | { full: true } | null (no such character)
  grantItem(charId, item, opts = {}) {
    return this.transaction(() => this.grantItemTx(charId, item, opts));
  }

  // Many grants in ONE transaction (one disk sync for the whole batch: "group commit"). Each grant runs in its
  // own savepoint, so one failing grant does not undo the others. Returns one result per request, in order
  // (a result is { error: true } if that grant threw).
  grantItems(reqs) {
    return this.transaction(() => reqs.map((r, i) => {
      this.db.exec(`SAVEPOINT g${i}`);
      try { const out = this.grantItemTx(r.charId, r.item, r.opts || {}); this.db.exec(`RELEASE g${i}`); return out; }
      catch (e) { this.db.exec(`ROLLBACK TO g${i}`); this.db.exec(`RELEASE g${i}`); console.error('grant failed', e); return { error: true }; }
    }));
  }

  grantItemTx(charId, item, { reason = 'drop', ref = null, reqId = null } = {}) {
    if (reqId && this.q.ledgerByReq.get(reqId)) return { dup: true };
    const row = this.q.charById.get(charId);
    if (!row || !ITEMS[item.id]) return null;
    const stackable = isStack(item.id) && this.q.hasStack.get(charId, item.id);
    if (!stackable && this.q.invCount.get(charId).n >= INV_SIZE) return { full: true };
    const e = cleanEntry({ ...item, uid: newUid() });
    this.q.insertItem.run(e.uid, charId, e.id, e.qty, e.r, JSON.stringify(e.b), null, this.q.maxPos.get(charId).p + 1, e.e, e.el, JSON.stringify(e.g));
    const rev = this.q.bumpRev.get(charId).item_rev;
    const entry = rowToEntry(this.q.itemByUid.get(e.uid));
    this.q.ledgerAdd.run(Date.now(), charId, rev, 'gain', e.uid, e.id, e.qty, JSON.stringify(entry), reason, ref, reqId);
    return { rev, entry };
  }

  // Swap the offers of a trade in one transaction. sides: [{ charId, items: [{ uid, qty }], gold }, …] (two sides).
  // Every item must still belong to its side, unequipped and with the quantity that was shown; gold must be there;
  // both bags must have room. Returns { ok: true, revs: { [charId]: rev } } or { ok: false, why }.
  commitTrade(tradeId, sides) {
    return this.transaction(() => {
      const rows = sides.map((sd) => this.q.charById.get(sd.charId));
      if (rows.some((r) => !r)) return { ok: false, why: 'gone' };
      for (const [i, sd] of sides.entries()) {
        if (int(sd.gold) < 0 || int(sd.gold) > rows[i].gold) return { ok: false, why: 'gold', who: sd.charId };
        for (const o of sd.items) {
          const it = this.q.itemByUid.get(o.uid);
          if (!it || it.character_id !== sd.charId || it.equip_slot || it.qty !== o.qty) return { ok: false, why: 'item', who: sd.charId };
        }
      }
      for (const [i, sd] of sides.entries()) {
        const other = sides[1 - i];
        if (this.q.invCount.get(sd.charId).n - sd.items.length + other.items.length > INV_SIZE) return { ok: false, why: 'full', who: sd.charId };
      }
      const revs = {};
      for (const sd of sides) revs[sd.charId] = this.q.bumpRev.get(sd.charId).item_rev;
      const now = Date.now();
      for (const [i, sd] of sides.entries()) {
        const other = sides[1 - i];
        let pos = this.q.maxPos.get(other.charId).p;
        for (const o of sd.items) {
          const it = this.q.itemByUid.get(o.uid);
          this.q.moveItem.run(other.charId, ++pos, o.uid);
          const entry = rowToEntry(this.q.itemByUid.get(o.uid));
          this.q.ledgerAdd.run(now, sd.charId, revs[sd.charId], 'loss', o.uid, it.item_id, it.qty, null, 'trade', `${tradeId}>${other.charId}`, `trade:${tradeId}:${o.uid}:out`);
          this.q.ledgerAdd.run(now, other.charId, revs[other.charId], 'gain', o.uid, it.item_id, it.qty, JSON.stringify(entry), 'trade', `${tradeId}<${sd.charId}`, `trade:${tradeId}:${o.uid}:in`);
        }
      }
      for (const [i, sd] of sides.entries()) {
        const delta = int(sides[1 - i].gold) - int(sd.gold);
        if (!delta) continue;
        this.q.setGold.run(rows[i].gold + delta, sd.charId);
        this.q.ledgerAdd.run(now, sd.charId, revs[sd.charId], 'gold', null, null, delta, null, 'trade', String(tradeId), `trade:${tradeId}:gold:${sd.charId}`);
      }
      return { ok: true, revs };
    });
  }

  // Item and gold changes after `rev`, oldest first, for the client to replay (after a reconnect, a pickup, a trade)
  changesSince(charId, rev) {
    return this.q.ledgerSince.all(charId, int(rev)).map((r) => ({
      rev: r.rev, kind: r.kind, uid: r.item_uid, id: r.item_id, qty: r.qty, entry: r.entry ? JSON.parse(r.entry) : undefined,
    }));
  }
  itemRev(charId) { return this.q.charById.get(charId)?.item_rev || 0; }
  item(uid) { const r = this.q.itemByUid.get(uid); return r ? { entry: rowToEntry(r), owner: r.character_id, slot: r.equip_slot } : null; }
  ledger(charId) { return this.q.ledgerOf.all(charId); }

  deleteCharacter(userId, id) { return this.q.deleteChar.run(id, userId).changes > 0; }
  leaderboard() { return this.q.top.all(); }
}
