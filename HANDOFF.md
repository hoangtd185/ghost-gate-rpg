# HANDOFF — Quỷ Môn Quan (ghost-gate)

This file lets a person or another AI pick up the project from zero: what the game is, how the code is organized, what has been built so far, the decisions behind it, the traps to avoid and what is planned next. Read it together with `README.md`, which covers setup, deployment, the env variables and the API.

Last updated: 2026-10-28.

---

## 1. What this is

- A hobby 2D side-scrolling RPG that looks like an MMO (Ghost Online / MapleStory style) and is **moving to online play**: with the Node server, real players on the same map see each other and chat, monsters are shared (run by the server), parties split EXP (G to invite), each player gets personal loot rolled and committed by the server, and players can trade (T). Fake-player bots fill empty maps. The theme is Asian wuxia mixed with ghost folklore.
- The UI and all game text are **Vietnamese**. Code, ids and comments are **English**.
- **One runtime dependency, `ws`** (WebSocket), plus `playwright-core` for tests. Plain Node (>= 22.13, for `node:sqlite`) and the browser canvas otherwise. Run `npm install` before `npm run dev` / `npm start`. **External libraries are allowed** (decision 6 in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)); see the dependency policy there before adding one.
- **Why it is built this way** (stack, saving queue vs. RabbitMQ/Kafka/Redis, decisions log, multiplayer plan): [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Everything online (protocol, shared monsters, reward rules, server-side damage, parties, personal loot, item custody, trades, database load, what is still client-side): [docs/MULTIPLAYER.md](docs/MULTIPLAYER.md).
- Online and offline run the **same game code**: monster AI (`game/mobsim.js`), damage (`game/combat.js`), loot (`game/loot.js`) and physics (`game/physics.js`) are shared modules that the server imports. Offline (file:// or the Claude artifact) the browser runs them; online the server does.
- All graphics are drawn in code (canvas curves, cached as sprite sheets). There are no image files.
- Repo: `https://github.com/hoangtd185/ghost-gate-rpg`. Local copy on the owner's PC: `H:\Projects\quy-mon-quan`.
- Playable web build: a Claude artifact (the `client/dist/artifact.html` build, saved through the artifact database).

## 2. Run, build, test

```bash
npm run dev      # server + raw ES modules from client/src (edit and refresh)
npm run build    # bundles to client/dist/index.html and client/dist/artifact.html
npm start        # serves the build (production mode needs TOKEN_SECRET, see .env.example)
npm run check    # scans files for leaked secrets
npm run hooks    # installs the pre-commit secret scan
```

You can also open `client/dist/index.html` directly in a browser. It then saves to localStorage.

**Debug console** (only on file://, localhost, or with `?debug` in the URL): `__game()` returns the `GameWorld`. Useful calls:
- `giveExp(n)` gives EXP; `loadMap(id, x)` teleports.
- `ch` is the raw character object; `player.invuln = 9999` makes the player invulnerable.
- `damageMonster(m, mult, 'player')` hits a monster with damage multiplier `mult` (offline / personal monsters). Shared monsters online: `net.hit({ uid, sid })`, the server computes the damage.
- `remoteMobs` (shared monsters online), `remotes` (other players), `net` (the realtime connection), `party`.

Also exposed: `__ui()` (the GameUI), `__lookFor`, `__humSheet`, `__drawFrame` and `__Monster`.

**Tests** run on Node's built-in runner (`node --test`). The only dev dependency is `playwright-core` (headless Chromium driver). One-time setup: `npm install` then `npm run uat:browser`.

- `npm test`: **unit tests** (`tests/unit/*.test.mjs`, a few seconds, no browser).
  - `data.test.mjs`: every id referenced anywhere in the content exists. This covers items in drops, rewards and recipes; quest NPCs and targets; dialogue speakers; portals, spawns and NPCs on maps; named bosses; affixes; legacy id targets. It also checks that `config.js` agrees with the content.
  - `character.test.mjs`: EXP curve, level-up points, `rollEquip` minimum rarity and thresholds, old-save migration, normalization.
  - `config.test.mjs`: elite chance and smartness tier tables, aliases, rate sanity.
  - `combat.test.mjs`: the shared damage formula (multiplier, defence, weakness/resistance, crit, minimum 1), skill level scaling, learned-skill check, skill reach.
  - `mobs.test.mjs`: shared monsters on the server: damage computed by the server (a client number is ignored), unknown skill / out of reach / rate limit, buffs, EXP shares, party split, loot to the top group, level gap, death broadcast.
  - `custody.test.mjs`: what an uploaded save may change (free / earned / server-only items, revisions, ownership after trades), `grantItem`, batched `grantItems`, `commitTrade`, the ledger.
  - `lootqueue.test.mjs`: pickup commit queue (one batch for many players, answered after the commit, no double queueing, per-player rate limit → `busy`), kill reports only for story bosses.
  - `auth.test.mjs`: login tokens; malformed tokens are rejected without throwing.
- `npm run uat`: **end-to-end acceptance scenarios** (`tests/e2e/*.test.mjs`, about 5 minutes). It builds the client, then drives the real game in headless Chromium, one file at a time (the scenarios are timing-sensitive). Each `it(...)` is one acceptance check, and every file ends with a "no page errors" check. Server scenarios start their own throwaway server (free port, temp database) through `startServer()` in `helpers.mjs`.

| File | Covers |
|---|---|
| `beginner.test.mjs` | create character, prologue m1–m4, tutorial quests, forge (enhance/socket/fuse/unsocket), NPC chatter and greetings |
| `chapter3.test.mjs` | old-save migration, chapter 3: hidden portal, story boss, Tiểu Lan absent during st18, the bell choice, final boss, ending |
| `combat.test.mjs` | sealed portals, passives + reset, reflect, elites, poison, field boss, outfit drop and equip, story boss credit |
| `orbs.test.mjs` | Taoist skill D: the 4 homing orbs focus the elite, retarget when it dies, no cast in safe maps |
| `chief.test.mjs` | forced chieftain spawn (only one at a time), stats vs a normal monster, chat announcement, drops |
| `movement.test.mjs` | walk vs double-tap sprint (and the run animation), slow double tap, Ctrl + ↓ (either order), plain ↓ sits |
| `craft.test.mjs` | the embroiderer: tutorial recipe, fairy outfit, materials consumed |
| `server.test.mjs` | register → create → play → save through the real API |
| `multiplayer.test.mjs` | two browsers on the server: see each other, re-entering a map, movement sync, player count, map chat + bubble (HTML shown as text), gear change visible after save, an invented outfit refused, other map hidden, world chat (`!`), leaving, malformed login, map-entry flood throttled, `saved` throttled |
| `loot.test.mjs` | personal story-boss loot: only the killer gets drops, pickup committed before the answer, boss cooldown, kill reports for shared monsters / field bosses refused, Alt+F4 right after a pickup, invented item refused, missed changes replayed on reconnect |
| `shared.test.mjs` | two browsers: same monsters and positions, a hit shows for both with the server's number, a real attack (Z) is reported by skill id only, a client damage number is ignored, EXP by damage + loot to the top damager, G invites to a party, party EXP split evenly + own drops each, leave party, contact damage from server monsters |
| `trade.test.mjs` | ask with T, accept, items + gold shown to the other side, offered items locked, any change unlocks both, lock + confirm swaps (database too), an old save cannot bring traded items back, cancel, decline, too far |
| `save-queue.test.mjs` | client-side changes (shop purchases): saved at once; upload blocked and tab closed → the outbox restores them on the next login; close right after buying (keepalive) |

Run a single file with `node --test tests/e2e/orbs.test.mjs`. Screenshots go to `tests/e2e/out/` (gitignored, uploaded by CI as `uat-screenshots`). CI runs `npm test` in the `check` job and `npm run uat` in the `uat` job. Scenarios that need precise positions build a controlled arena (no spawns, no bots), because random spawns, bots and chieftains would otherwise make them flaky. Pass real functions, not strings, to `page.evaluate(fn, arg)` when you need an argument.

## 3. Architecture

```
client/src/
  main.js            boot, fixed-step loop (1/60 s), autosave, save results, debug globals
  config.js          GAME: all tuning numbers (physics, player, monsters, loot, forge, story EXP, pet, saving,
                     net: realtime limits, server loot, shared monsters, parties, trades)
  data/              ALL CONTENT (pure data, no logic): classes, items, monsters, maps, npcs, story,
                     chatter, affixes, recipes, elements, bots, legacy (old id migration)
  engine/            input (keyboard, touch, double-tap sprint), util
  game/character.js  the character model: stats (calcStats), EXP, inventory, equip, gems, crafting, passives,
                     quest state, normalizeCharacter (runs on every load)
  game/mobsim.js     SHARED: MobState (monster stats) + MobSim (AI, bosses, spawns, field bosses, damage,
                     deaths); emits events, never draws
  game/combat.js     SHARED: damage formula (hitDamage), skill multipliers, reach, learned-skill check
  game/loot.js       SHARED: drop tables (rollDrops), killExp, what a client save may add (free / earned items)
  game/physics.js    SHARED: gravity and one-way platforms
  game/world.js      GameWorld: map loading, player, skills, hit detection, drops, effects, rendering;
                     turns monster events into effects and damage to our player; online glue (remote monsters,
                     server drops, item changes)
  game/entities.js   Player / Monster (MobState + sprite) / NPC / Drop / Projectile / RemotePlayer, lookFor
  game/bots.js       fake players (hunt, chat, change maps, reply to the player)
  game/chatter.js    context-aware NPC lines (no repeats) and NPC-to-NPC banter
  game/pet.js        the imp pet that picks up drops
  gfx/               canvas drawing: humanoid.js (chibi characters + outfit parts), monsters.js,
                     backgrounds.js, icons.js, pet.js, draw.js (toolkit)
  ui/hud.js          GameUI: HUD, all windows (inventory, skills, quests, shop, forge, craft, dialogue,
                     scenes, trade), party panel, quest tracker
  ui/screens.js      login / character select / create
  storage/storage.js ApiStorage (server) | CloudStorage (Claude artifact db) | LocalStore; SaveQueue + outbox
  net/realtime.js    WebSocket client: hello, position 10×/s, remote players, chat, shared monsters, hits,
                     buffs, kill reports (story bosses), pickups, item changes, parties, trades, reconnect
server/src/
  index.js           HTTP, REST API, security headers, rate limits, static files
  realtime.js        WebSocket server at /ws: auth, sessions (character cache), rooms per map, movement,
                     chat, rate limits; wires the modules below
  mobs.js            shared monsters: one MobSim per occupied map, server-side damage, rewards (EXP shares, loot)
  party.js           parties (invite, answer, leave)
  loot.js            per-player drops, story-boss kill checks, pickup commit queue (group commit, admission control)
  trade.js           trade sessions: ask, offer, lock, confirm → db.commitTrade
  db.js              SQLite schema + migrations, character read/write, item custody (reconcileItems),
                     item_ledger, grantItem(s), commitTrade, changesSince
  auth.js            scrypt passwords, HMAC tokens · config.js reads .env
tools/               build.mjs (custom bundler), check-secrets.mjs
tests/unit/          node --test unit tests
tests/e2e/           node --test + playwright-core acceptance scenarios (helpers.mjs)
```

**Data flow:**
1. Storage loads the raw character JSON.
2. `normalizeCharacter` runs `migrateLegacy`, fills missing fields, removes retired quests, fills forward the main line and cleans up gems.
3. `GameWorld` runs the game and `GameUI` renders the windows.
4. The game saves through `SaveQueue` (`storage/storage.js`):
   - **When:** autosave every 20 s; on map change, level up, death and quest or forge actions; offline, **right away when a rare drop is picked up** (`isRareDrop` in `world.js`); on tab hide or close (`pagehide` / `beforeunload` / `visibilitychange`). Online, monster drops do not depend on this: the server commits them at pickup.
   - **How:** each save is written synchronously to a localStorage **outbox** (`qmq_outbox:<kind>:<user>`), then uploaded in the background. Only the newest snapshot is kept in the queue and only one upload runs at a time. An entry leaves the outbox only after the server confirms it.
   - **Failures:** a failed upload retries with backoff (2 → 30 s) and right away on the browser `online` event. The HUD shows "Chưa gửi được: đã giữ trên máy…".
   - **Closing the page:** also sends a `fetch(..., { keepalive: true })` upload that outlives the page (body ≤ 64 KB).
   - **On the next character list load,** `mergeOutbox` uses any unsent copy whose `playTime` ≥ the server's copy and re-uploads it.
   - LocalStore (file:// mode) skips the outbox, since it already writes synchronously.
   - Items lying on the ground are never saved. Offline they exist only in the browser; online the server keeps a player's drops in memory (60 s + grace) and resends them after a reconnect.
   - Online, the PUT answer tells the client what the server did (`{itemRev, stale, items?}`), and the WebSocket replays item and gold changes the client missed (`chg`). See docs/MULTIPLAYER.md §3.

**The character is one plain JSON object.** The client keeps it as that object. The server splits it into the `characters`, `items` and `quests` tables and rebuilds it on read (`db.js`).

**Server-side checks.** `sanitizeCharacter` rejects impossible values in uploaded saves (level, gold, stat/skill point totals, item ids, quantities, enhancement). On top of that, online:
- **Items**: `reconcileItems` (item custody): a save cannot invent monster-only items, change an item's rarity or bonus stats, undo a pickup or bring back a traded item.
- **Monsters and damage**: the server runs the shared monsters and computes every hit's damage (`combat.js`); clients only report which skill hit which monster.
- Still decided by the client: hit detection, damage taken, EXP/level and gold totals (bounded), forging, shop purchases, quests. Details and next steps: docs/MULTIPLAYER.md §9.

**Controls added later:** double-tap and hold ← / → to sprint (`Input.sprint`, `SPRINT_MULT = 1.6`, dust particles). Sprinting plays its own `run` cycle (humanoid frames 14–19): the upper body pitches forward around the hips via the `tilt` pose field, with longer strides and pumping arms. Ctrl + ↓ drops through a platform, the same as ↓ + Space.

## 4. Content inventory (current)

- **Classes** (`data/classes.js`): `swordsman` (str, melee), `taoist` (int, talismans, chain lightning, fire dragon, homing thunder orbs `ta_orbs` that focus one target; the old heal `ta_heal` is migrated to it in `legacy.js`), `assassin` (dex, darts, dash, poison).
  - Skills are `sw_*`, `ta_*` and `as_*`: 4 active skills plus 4 passives (`*_p1`..`p4`) per class.
  - The passives form a tree, with a max level of 5, and share skill points with the active skills.
- **Elements**: `fire`, `ice`, `thunder`, `poison`.
  - Monster `res` tables; player resistance comes from `res_*` stats, capped at 75%.
  - Element orbs `orb_*` set the element of the wielded weapon.
- **Maps (12):**

| Id | Name | Min. level |
|---|---|---|
| village | Làng Trúc Lâm | 1 |
| forest | Rừng Ma Trơi | 1 |
| field | Cánh Đồng Hoang | 4 |
| graveyard | Nghĩa Địa Cổ | 7 |
| swamp | Đầm Lầy Sương Mù | 8 |
| ghost_gate | Quỷ Môn Quan | 11 |
| snow_peak | Tuyết Sơn | 14 |
| ice_cave | Huyền Băng Động | 17 |
| volcano | Hỏa Diệm Sơn | 20 |
| qilin_altar | Kỳ Lân Đài | 22 |
| temple | Huyền Môn Cổ Tự | 24 |
| sanctum | Chính Điện | 30 |

  - Portals have `req` (hidden until a quest is done) or `lock` (visible but sealed). The hidden path graveyard→temple needs st15.
- **NPCs**:

| Id | Name | Role |
|---|---|---|
| elder | Trưởng Làng | |
| healer | Thầy Lang | shop |
| smith | Thợ Rèn | forge |
| constable | Bộ Khoái | wanted board / dailies |
| priest | Đạo Trưởng Huyền Cơ | becomes the final villain; gone from st13 |
| fisherman | Ngư Ông | |
| huntress, huntress_temple | Thợ Săn | |
| lan | Tiểu Lan | rescued in st7, missing during st18 |
| fire_master, fire_master_temple | Hỏa Sư | |
| embroiderer | Thợ Thêu / Tú Nương | crafting |
| old_master | Vong Hồn Sư Phụ | dialogue portrait only |

  Map entries support `after`, `until` and `hideWhile` (quest ids).
- **Monsters (18):**
  - Field monsters: wisp, fox, scarecrow, jiangshi, lantern, frog, water_ghost, snowfox, yeti, icebat, golem, fire_spirit, lava, blood_jiangshi, maskghost.
  - Bosses: `boss` (Black Ghost King, ghost_gate), `qilin` (qilin_altar), `blood_demon` (Huyết Ma Huyền Cơ, sanctum, final boss).
- **Named monsters** (`data/affixes.js` → `NAMED`):
  - Story bosses (only spawn while their quest is active): `nb_scarecrow` (st4), `nb_lantern` (st6d), `nb_icebat` (st10c), `nb_blood_jiangshi` (st16b).
  - Field bosses on timers: `fb_fox`, `fb_jiangshi`, `fb_yeti`, `fb_lava`, `fb_mask`.
- **Chieftains (mini bosses, `CHIEF` in `data/affixes.js`):**
  - Each regular spawn has a 1.5% chance to become "Đầu Lĩnh <name>", at most one per map at a time. Bosses never roll it, and a chieftain is never also an elite.
  - Stats: ×7 HP, ×1.35 attack, ×1.25 defense, ×6 EXP and gold, 1.45× size, orange glow, ♛ name tag, boss HP bar when aggroed.
  - Drops: the species' normal drops plus stones, a gem, potions, a chance at protection charms and `mat_dew`. Equipment rolls with extra luck and is at least Common+1.
  - It is announced in chat and with a toast, and kills count for the species' quests.
- **Affixes**: reflect, vampire, regen, enrage, explode, blink, frost, poison, shield.
  - A species has built-in affixes, and elites roll extra ones.
  - Smartness tier by level (`smartTier`): 0 wander → 1 aggro/kite → 2 dodge, call allies, charge → 3 lead shots, retreat.
- **Quests (57):**
  - 32 main, 12 tutorial, 7 side, 6 daily (5 wanted-board hunts + Tiểu Lan's daily gift).
  - Main order (`MAIN_ORDER`, with the recommended level after each id):

    ```
    m1:1 m2:1 m3:3 m4:3 | st1:4 st2:4 st3:5 st4:7 st4b:8 st5:9 st6:10 st6b:11 st6c:12 st6d:13 st7:15 |
    st8:16 st8b:16 st9:17 st10:19 st10b:20 st10c:21 st11:22 st11b:23 st11c:24 st12:26 |
    st13:27 st14:27 st15:28 st16:28 st16b:29 st17:30 st18:32
    ```

  - Chapters: c0 prologue, c1 "Mệnh Thuần Âm", c2 "Huyết Ma Châu", c3 "Mặt Nạ Trắng".
  - Story EXP is a share of the EXP needed for that level (`EXP_SHARE`), so players must grind between steps. The chapter finales st7/st12/st18 give 0.65.
  - The scene `sc_altar` (entering the sanctum during st18) has a choice that sets flag `bell = ring | refuse`, which changes the ending lines.
- **Items (100)**:
  - 7 weapon tiers per class (`w_<cls><n>`), hats, armor and accessories, materials, quest items.
  - Gems `gem_<kind><grade>`: 5 kinds × 3 grades, socketed at the smith and fused 3→1.
  - Enhancement goes up to +10 (from +5 a failure drops one level; protection scrolls exist).
- **Outfits (9, 5th equip slot)**:

| Id | Name |
|---|---|
| out_wisp_hood | Ma Trơi Tinh Nghịch |
| out_fox | Hồ Ly Y |
| out_black_dragon | Hắc Long Bào |
| out_jade_lotus | Thanh Liên Tiên Y |
| out_rainbow_fairy | Nghê Thường Tiên Y |
| out_peach_fairy | Đào Hoa Tiên Y |
| out_white_fox | Bạch Hồ Cừu |
| out_phoenix | Phượng Vũ Y |
| out_blood_moon | Huyết Nguyệt Chiến Giáp |

  - Outfits drop at about 1.5–4% from bosses and elites.
  - Three can be crafted at the embroiderer: `r_peach_fairy`, `r_rainbow_fairy`, `r_fox`. The fairy robes need `mat_dew`, `mat_peach` and `mat_icesilk`.
  - An outfit's `look` draws extra parts in `gfx/humanoid.js`. The fairy `ribbons` and the `aura` are animated in `world.js`.
- **Pet**: `imp` (Tiểu Quỷ), from side quest `q_pet`. It picks up drops.

## 5. Conventions and rules

- **Tuning numbers go in `client/src/config.js` (`GAME`), never as magic numbers in logic.** Content goes in `client/src/data/`, deployment settings in `.env`. The server imports `client/src/config.js` for shared rules (classes, equip slots, level cap, points per level, enhance max), so keep that file plain data with no DOM or browser APIs. Old exported names (`INV_SIZE`, `ENHANCE_RATE`, `MAX_RES`, `CHIEF`, …) are kept as aliases that read from `GAME`.
- **English for code, ids and comments; Vietnamese only for player-facing text** (dialogue, names, UI, error messages shown to players).
  - Ids are lowercase snake_case.
  - Dev-facing logs (server, build, check-secrets) are English.
- **Renaming a stored id?** Add the old → new mapping to `client/src/data/legacy.js`. `migrateLegacy` runs first inside `normalizeCharacter` and on the character list screen. It covers class, map, pet, skills, items (including `w_*`, `orb_*`, outfits), item element, `r_*` → `res_*` bonus keys and quest ids.
  - The server also rewrites old class ids in `db.js` → `migrate()`, because `cls` is never re-saved.
- **Content changes are data edits** in `client/src/data/`.
  - A new monster also needs a draw function registered in `MAKERS` (`gfx/monsters.js`).
  - A new outfit part needs a draw helper in `gfx/humanoid.js`.
- **Story lines** are `[speaker, text, cond?]`:
  - The speaker is an NPC id, `me`, `sys`, or a monster id (for its portrait).
  - `cond` looks like `'bell=ring'`.
  - Text placeholders: `{name} {cls} {main} {title} {lv} {weapon}`.
- **Quest types**: `talk`, `kill`, `collect`, `act`.
  - For `act`, the target is an event fired via `questEvent` / `world.event`: djump, potion, buy, stat, skillup, enhance, socket, fuse, orb, daily.

## 6. Traps (read before editing)

1. **Custom bundler** (`tools/build.mjs`): every module is concatenated into one scope.
   - Two modules cannot declare the same top-level name; the build prints "Duplicate top-level name" and fails.
   - Keep helper names unique, or make them non-exported locals inside functions.
2. **Dev mode uses real ES modules**, so a duplicate `import` of the same name in one file is a SyntaxError in dev even though the bundle works. Test with `npm run dev` too.
3. **`.gitignore` must use `/data/`** (with the leading slash). A plain `data/` also hides `client/src/data/`, which happened once and left the GitHub repo without its game data. The same applies to `.dockerignore`.
4. `storage.js` calls `this.col.doc(...)`, a Firestore-like artifact API. Do not "rename" `doc` there; `doc` was the old poison element id.
5. Monster ids `boss` and `lava` double as behavior/theme words. Map ids and theme ids are separate namespaces: the `temple` map uses the `temple` theme, and `ghost_gate` uses `hell`.
6. **Dialogue tests**: hidden dialogs stay in the DOM, so select `#win:not([hidden]) .dlg`. The character select play button is `[data-play]`. Enter must not auto-pick a scene choice (guarded by `c.big`).
7. After accepting a quest, call `world.refreshNpcs()`, because NPCs with `until` / `hideWhile` must appear or disappear.
8. Never commit `.env`, `data/` (game.db, secret.key), `*.db*`, `*.key` or `*.pem`.
   - Production refuses to start without `TOKEN_SECRET` of at least 32 characters.
   - Run `npm run check` before pushing.
9. On the owner's PC, the bridge's file-commit tool refuses `.github/`. Write CI files through the device shell instead (e.g. copy a staged file into `.github/workflows/`).
10. **Shared modules** (`mobsim.js`, `combat.js`, `loot.js`, `physics.js`, `character.js`, `config.js`, `data/*`) are imported by the server: no DOM, no canvas, no `window`. `Monster` in `entities.js` adds the sprite on top of `MobState`; the server only ever uses `MobState`.
11. `world.monsters` and `world.spawnGroups` are getters/setters over `world.sim` (tests assign them). Online, shared monsters are in the same list with `m.remote = true`; the local simulation skips them.
12. Every player hit must carry its skill id (`opts.sid` in `damageMonster`, `sid` on projectiles and zones), or it never reaches the server. Never send a damage number.
13. A new way for the client to create an item (shop, quest reward, recipe) must be allowed in `freeItems` / `questGrants` / `craftGrants` (`game/loot.js`), or online saves will refuse the item. Any server-side item change bumps `item_rev` and writes a ledger row in the same transaction.
14. Server hot paths (positions, hits, kills, loot rolls) never read the database: use the session cache `s.ch` / `statsOf(s)` (refreshed on `saved` and when buffs change).

## 7. History: what was built, in order

1. **Base game**:
   - 3 classes, 9 maps, monsters, bosses, drops, shop, inventory/equipment, quests, bots, pet.
   - Login and the 3 storage backends; SQLite server with REST API.
2. **Story and tutorials**:
   - Connected main story (prologue + chapters 1–3).
   - Tutorial quests for movement, potions, shop, stats, skills, dailies, forge (enhance/socket/fuse), crafting and orbs.
   - Context-aware NPC chatter plus NPC-to-NPC banter instead of random lines.
3. **Depth**:
   - Passive skill tree and reset.
   - Monsters scale with level and get smarter (AI tiers).
   - Elites with affixes such as damage reflect; story bosses and field bosses.
   - Main quests gated by level and EXP so the player must grind.
   - Portals sealed by story progress.
4. **Outfits**:
   - Ghost Online-style outfits as rare boss drops.
   - Fairy robes in white and pink with animated silk ribbons; fairy drop rates lowered to about 1–2%.
   - Fairy robes made craftable at the embroiderer from farmed materials.
5. **Security for GitHub**:
   - `.env` support (`config.js`), with a strong `TOKEN_SECRET` required in production.
   - Security headers/CSP, rate limits, a JSON-only API, a static file traversal guard, server-side save sanity checks.
   - Non-root Docker, the secret scanner + pre-commit hook, GitHub Actions CI.
6. **Repo decisions**:
   - Repo name `ghost-gate`.
   - Stay a **single monorepo** (client + server + tools); no split and no microservices at this size.
   - README rewritten in English.
7. **English pass**:
   - All ids renamed to English, with `legacy.js` migration (verified on old DB rows and on localStorage saves).
   - About 640 comments, the dev logs, `.env.example`, the Dockerfile and CI translated.
   - Fixed the `.gitignore` / `.dockerignore` `data/` bug.
   - Added `tests/e2e/` and this handoff.
8. **Gameplay and save updates (2026-10-22):**
   - Taoist skill D is now `ta_orbs` (homing thunder orbs).
   - Durable save queue with a local outbox, keepalive uploads and immediate saves on rare drops.
   - Double-tap sprint (with a forward-leaning run animation) and Ctrl + ↓ drop.
   - Chieftain mini bosses.
   - Central tuning config `client/src/config.js`, shared with the server.
   - Tests moved from Python to Node: `node --test` unit tests plus `playwright-core` e2e scenarios, both in CI.
9. **Online play (2026-10-23 → 2026-10-28):**
   1. *Stage 1*: WebSocket (`ws`) presence, movement sync, map/world chat (`!` prefix), real player count; SQLite `synchronous = FULL`. CI installs runtime deps (`npm ci --omit=dev`).
   2. *Hardening (review fixes, committed)*: malformed tokens never crash the server; map-entry frames have their own rate limit; `saved` refreshes throttled to 1/s and read only the session's character.
   3. *Personal loot*: drops rolled by the server, only their owner sees them; pickups committed (item + ledger row) before the answer; `item_ledger`, `item_rev`, change replay (`chg`, `GET /changes`).
   4. *Item custody*: uploaded saves keep the server's item identity; free / earned / server-only rules; stale saves skip items, gold and quests.
   5. *Trades* (T), Võ Lâm style: shared window, any change unlocks both, lock + confirm, one transaction.
   6. *Shared monsters*: monster AI extracted from `world.js` into `game/mobsim.js`, run by the server per occupied map; clients render and interpolate them.
   7. *Parties* (G) and reward rules: EXP by damage share between groups, a party splits evenly, loot to the top group (each party member gets their own roll).
   8. *Database load*: pickup commit queue (group commit ≤ 25 ms / 200 pickups), admission control (`busy`), per-player rate limits, session cache (no DB reads on hot paths).
   9. *Server-side damage*: `game/combat.js` shared formulas; clients send `hit {uid, sid}`, buffs via `cast {sid}`; results broadcast as `mhit`.

## 8. Status: done, not done, open items

**Git state (2026-10-28, branch `feat/multiplayer-phase-1` on the owner's PC):**
- Committed (not yet pushed when this was written): stage 1 and three review fixes (`f37d4a0`, `3673ef0`, `0cea5b9`).
- **Not committed yet** (already staged with `git add`, except `HANDOFF.md`): everything from step 9.3 onwards (personal loot, custody, trades, shared monsters, parties, commit queue, server-side damage) and this `HANDOFF.md` (untracked: add it too). All tests pass on it: `npm test` 64/64, `npm run uat` 91/91. Suggested message: `feat: shared monsters, server-side damage, parties, personal loot, trades and pickup commit queue (multiplayer phase 2)`.

**Done (online):** presence and chat · shared monsters run by the server · server-side damage · parties and reward rules · personal loot committed at pickup · item ledger, revisions, change replay · item custody on saves · trades · pickup commit queue, admission control, rate limits · hardening of the realtime server.

**Not done yet** (in rough priority order; details in docs/MULTIPLAYER.md §9):
1. **EXP, level and gold owned by the server.** The server already tells each client its EXP share, but the client still uploads level and gold (only bounded by `sanitizeCharacter`).
2. **Damage to players on the server.** Contact damage, monster projectiles and slams are still applied by each client to itself.
3. **Server-side hit detection.** Clients decide which skill touched which monster (the server checks skill, reach and rate). Doing it on the server needs player projectiles there and lag compensation.
4. **Forge, shop and quests as server actions** (enhance success, sockets, fusing, purchases, quest rewards are client-decided, bounded by the custody rules).
5. **Write-behind** for position/HP/EXP and a grace period on disconnect.
6. **Backups**: nightly `VACUUM INTO`, tested restores, optionally Litestream.
7. Online gaps that are accepted for now: smart monsters do not dodge projectiles online (the server does not see them); bots never hurt shared monsters; story bosses are personal (each player's own client runs them).
8. **Social**: friends, guilds, party loot options (round robin, leader decides), PvP, a real leaderboard page.
9. **Scaling past one process** (only when needed): maps as shards in separate processes, Redis for chat/parties/trades across them, PostgreSQL instead of SQLite.

**Other ideas, not started:**
- Gameplay: more chapters after st18, more outfits and recipes, sound (none yet).
- Maintainability: a `saveVersion` field so migrations run by version instead of by detection; JSDoc or TypeScript types for the character object and network messages; message validation (`zod`/`valibot`); Vite instead of the custom bundler.
- The owner's pushes to GitHub were slow once: the repo is small, so it was network, auth or drive related (Git Credential Manager prompt, H: being a network/sync drive, proxy).

## 9. Recovering if the source is lost

- The GitHub repo is the source of truth (once `client/src/data/` has been pushed).
- The playable artifact contains the full bundled client (all data and logic in one file), but not the server.
- To rebuild from nothing, this file plus `README.md` describe every system, id and decision. The data files in `client/src/data/` are the most valuable part, since they hold the story, dialogue, balance numbers and content.
