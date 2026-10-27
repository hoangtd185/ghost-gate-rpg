// ============================================================================
//  GAME CONFIG — every tuning number in one place.
//  Change values here; the rest of the code reads them from GAME.
//
//  What lives where:
//    client/src/config.js  (this file)  balance and feel: speeds, rates, multipliers, timers, limits
//    client/src/data/*.js               content: classes, skills, items, monsters, maps, quests, dialogue
//    .env / server/src/config.js        server deployment: port, secrets, rate limits, registration
//
//  The server imports this file too (server/src/index.js, db.js) for the values both sides must
//  agree on: classes, equipment slots, level cap, points per level. Keep it plain data (no DOM).
// ============================================================================

export const GAME = {
  // ----- Character -----
  player: {
    classes: ['swordsman', 'taoist', 'assassin'], // ids in data/classes.js
    equipSlots: ['weapon', 'hat', 'armor', 'acc', 'outfit'],
    maxLevel: 50,
    invSize: 36,
    statPointsPerLevel: 5,
    skillPointsPerLevel: 1,
    startGold: 50,
    skillMaxLv: 10,
    passiveMaxLv: 5,
    maxRes: 75, // elemental resistance cap (%)
    // EXP needed for the next level: a * lv^p + b * lv
    expCurve: { a: 22, p: 1.85, b: 28 },
    deathExpLoss: 0.05, // share of the current level's EXP lost on death
    respawnHpMp: 0.5, // HP/MP after respawning in the village
    // Natural regen per tick: maxHp * hpPct + 1 (×2 in safe maps). Ticks every `every` seconds, faster while sitting
    regen: { hpPct: 0.02, mpPct: 0.03, every: 3, sittingEvery: 1, safeMapMult: 2 },
    baseDodge: 0.04,
    skillDmgPerLv: 0.12, // each skill level above 1 adds +12% damage
  },

  // ----- Movement and physics -----
  physics: {
    gravity: 980,
    moveSpeed: 118,
    jumpV: -330, // initial jump impulse
    jumpHoldTime: 0.2, // how long holding Space keeps pushing up
    jumpHoldAccel: 620,
    doubleJumpMult: 0.95,
    sprintMult: 1.6, // double-tap and hold ← / →
    doubleTapMs: 280,
    dropThroughTime: 0.3, // ↓ + Space / Ctrl + ↓ ignores platforms for this long
    botJumpV: -385,
    botSpeedMult: [0.9, 0.85], // bots walk slightly slower than players (wandering, hunting)
  },

  // ----- Monsters -----
  monsters: {
    // extra levels rolled on spawn: 0..max (higher on later maps)
    levelBonus: { max: 2, maxFromLv13: 3 },
    // per extra level: +12% HP, +7% attack, +5% defense, +15% EXP, +10% gold
    perLevel: { hp: 0.12, atk: 0.07, def: 0.05, exp: 0.15, gold: 0.1 },
    respawnSec: [6, 11], // regular monsters
    bossRespawnSec: 150,
    // smartness tier by monster level (see data/affixes.js for what each tier does)
    smartTierFromLv: [6, 13, 21], // tier 1 from lv 6, tier 2 from lv 13, tier 3 from lv 21
    // elite chance by level: [fromLv, chance], the highest matching row wins
    eliteChance: [[5, 0.03], [13, 0.05], [21, 0.07]],
    elite: { hp: 4, atk: 1.4, def: 1.2, exp: 5, gold: 4, scale: 1.28, affixes: 1, affixesFromLv13: 2, luck: 0.08 },
    // chieftain ("Đầu Lĩnh", mini boss): a regular spawn that rolls this chance, max one per map at a time
    chief: {
      chance: 0.015,
      hp: 7, atk: 1.35, def: 1.25, exp: 6, gold: 6, scale: 1.45, luck: 0.12, minRarity: 1,
      drops: [['stone', 1], ['stone', 0.5], ['GEM1', 0.7], ['hp_l', 0.6], ['mp_l', 0.5], ['protect', 0.08], ['mat_dew', 0.06]],
    },
  },

  // ----- Loot -----
  loot: {
    // rarity roll for equipment drops (minus luck): < r3 → Legendary, < r2 → Rare, < r1 → Fine
    rarity: { r3: 0.02, r2: 0.09, r1: 0.28 },
    dropLifeSec: 60, // items on the ground disappear after this
  },

  // ----- Forge -----
  forge: {
    enhanceMax: 10,
    enhanceRate: [1, 0.95, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.22], // success rate from +n to +(n+1)
    enhanceSafe: 4, // from +5 up, a failure drops one level
    enhanceBonus: 0.1, // each level adds +10% of the base stats
    gemFuse: [{ gold: 300, rate: 1 }, { gold: 1500, rate: 0.75 }], // grade 1→2, grade 2→3
  },

  // ----- Story -----
  story: {
    // reward EXP = EXP needed for the quest's level × share (so players still need to grind)
    expShare: { talk: 0.12, collect: 0.28, kill: 0.3, act: 0.1, namedBoss: 0.45, chapterFinale: 0.65 },
  },

  // ----- Pet -----
  pet: { pickRange: 330, flySpeed: 240 },

  // ----- Saving -----
  save: {
    autosaveSec: 20,
    retryMinMs: 2000, // failed uploads retry with backoff up to retryMaxMs
    retryMaxMs: 30000,
  },

  // ----- Multiplayer (realtime presence + chat, server/src/realtime.js) -----
  net: {
    sendHz: 10, // client position updates per second (only when something changed)
    tickHz: 10, // server state broadcasts per second
    maxPosPerSec: 20, // server drops position updates beyond this
    maxEnterPerSec: 4, // map entries (a fresh snapshot each): extra ones within this window are merged into one
    interpDelayMs: 120, // remote players are drawn this far in the past for smooth movement
    chatMaxLen: 80,
    chatBurst: 5, // chat rate limit: up to 5 messages at once, then one per chatRefillMs
    chatRefillMs: 1500,
    maxPayload: 4096, // bytes per WebSocket message
    helloTimeoutMs: 5000,
    pingMs: 25000,
    reconnectMs: [1000, 2000, 5000, 10000], // client reconnect backoff
  },
};
