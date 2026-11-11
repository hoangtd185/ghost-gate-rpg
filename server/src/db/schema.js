// Database schema and migrations for older databases

export const SCHEMA = `
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
  kind         TEXT NOT NULL,                -- gain | loss | gold | ingots | rejected
  item_uid     TEXT,
  item_id      TEXT,
  qty          INTEGER NOT NULL DEFAULT 0,   -- items: quantity; gold, ingots: signed amount
  entry        TEXT,                         -- JSON item for gains (what the client adds)
  reason       TEXT NOT NULL,                -- drop | trade | save | premium | checkin | kill | quest
  ref          TEXT,                         -- drop id, trade id, partner, why a save was refused
  req_id       TEXT UNIQUE                   -- idempotency key: the same request never applies twice
);
CREATE INDEX IF NOT EXISTS idx_ledger_char ON item_ledger(character_id, rev);
`;

// Upgrade older databases: add new columns without losing data
export function migrate(db) {
  const cols = db.prepare('PRAGMA table_info(characters)').all().map((c) => c.name);
  if (!cols.includes('pet')) db.exec('ALTER TABLE characters ADD COLUMN pet TEXT');
  if (!cols.includes('title')) db.exec('ALTER TABLE characters ADD COLUMN title TEXT');
  if (!cols.includes('flags')) db.exec("ALTER TABLE characters ADD COLUMN flags TEXT NOT NULL DEFAULT '{}'");
  // item_rev: bumped on every server-side item/gold change; saves made from an older rev do not touch items or gold
  if (!cols.includes('item_rev')) db.exec('ALTER TABLE characters ADD COLUMN item_rev INTEGER NOT NULL DEFAULT 0');
  // Nguyên Bảo (premium currency) and the last daily check-in ({ day, streak } JSON): only the server changes them
  if (!cols.includes('ingots')) db.exec('ALTER TABLE characters ADD COLUMN ingots INTEGER NOT NULL DEFAULT 0');
  if (!cols.includes('checkin')) db.exec('ALTER TABLE characters ADD COLUMN checkin TEXT');
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
