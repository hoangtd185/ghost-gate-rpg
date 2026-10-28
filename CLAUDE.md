# CLAUDE.md

Quỷ Môn Quan (ghost-gate): a 2D side-scrolling wuxia/ghost RPG in the style of Ghost Online / MapleStory. Online (Node server): presence, chat, shared monsters run by the server (it also computes every hit's damage), parties, personal loot rolled and committed by the server, and trades; each client does its own hit detection; fake-player bots fill maps (they never hurt shared monsters). Browser canvas client, small Node + SQLite server, one monorepo.

## Read first

1. `HANDOFF.md` — content ids, how systems work, conventions, traps, history, open items.
2. `docs/ARCHITECTURE.md` — stack and *why*, the save queue, the decisions log, the dependency policy, the multiplayer plan.
3. `docs/MULTIPLAYER.md` — realtime protocol, shared monsters and reward rules, parties, personal loot, item custody, trades, database load, why no message broker.
4. `README.md` — setup, scripts, env variables, deployment, API.

Do not re-derive what these files already say. When you change something they describe, update them in the same change.

## Commands

```bash
npm run dev     # server + raw ES modules from client/src (edit and refresh)
npm run build   # bundle to client/dist/index.html and client/dist/artifact.html
npm start       # serve the build (production needs TOKEN_SECRET >= 32 chars)
npm run check   # secret scan
npm test        # unit tests (node --test): data integrity, character model, config, a few seconds
npm run uat     # build + every e2e scenario in headless Chromium (node --test + playwright-core), ~3-4 min
node --test tests/e2e/orbs.test.mjs   # one scenario
npm install && npm run uat:browser    # one-time setup (playwright-core + Chromium)
```

Debug in the browser console (file://, localhost or `?debug`): `__game()` returns the GameWorld (`giveExp`, `loadMap`, `ch`, `player`, `damageMonster`, …).

## Where things go

| Change | Place |
|---|---|
| Balance numbers (speeds, rates, multipliers, timers, limits) | `client/src/config.js` (`GAME`). No magic numbers in logic |
| Content (classes, skills, items, monsters, maps, NPCs, quests, dialogue, recipes, named bosses) | `client/src/data/*.js` |
| Deployment settings, secrets | `.env` (template `.env.example`), read by `server/src/config.js` |
| Renamed an id that can be stored in a save | Add old → new to `client/src/data/legacy.js` |
| New monster sprite | Draw in `client/src/gfx/monsters.js`, register it in `MAKERS` |
| New outfit part | Draw helper in `client/src/gfx/humanoid.js` |
| Monster behaviour (AI, affixes, bosses, spawns) | `client/src/game/mobsim.js` (runs offline and on the server) |
| Damage formulas (player hits, skill multipliers, reach) | `client/src/game/combat.js` (runs offline and on the server) |
| Loot tables and rules (drops, what clients may create) | `client/src/data/*` for tables, `client/src/game/loot.js` for rules, `server/src/loot.js` for kill checks |
| New realtime message | `server/src/realtime.js` + `client/src/net/realtime.js`; document it in the protocol table in `docs/MULTIPLAYER.md` |

`config.js` and `data/*` are imported by the server too, so keep them plain data (no DOM, no browser-only or Node-only imports).

## Conventions

- Code, ids and comments in **English**; player-facing text (dialogue, names, UI, on-screen errors) in **Vietnamese**. Ids are lowercase snake_case.
- External libraries are allowed. Prefer small, maintained packages; pin versions, commit the lockfile, and note the reason (decisions log or PR). See the dependency policy in `docs/ARCHITECTURE.md`.
- Every gameplay change gets an acceptance check in `tests/e2e/*.test.mjs` (one `it(...)` per check, helpers in `helpers.mjs`); new content ids are covered by `tests/unit/data.test.mjs`. `npm test` and `npm run uat` must pass before committing. Scenarios that need exact positions build a controlled arena (no spawns, no bots), because random spawns, bots and chieftains make them flaky.

## Traps

- `tools/build.mjs` concatenates every module into one scope: **top-level names must be unique across modules**. Dev mode uses real ES modules, so a duplicate import in one file breaks dev only. Check both `npm run build` and `npm run dev`.
- `.gitignore` / `.dockerignore` must use `/data/` with the leading slash. A plain `data/` hides `client/src/data/`.
- `storage.js` uses `this.col.doc(...)` (artifact DB API). It is not the old `doc` element id; never rename it.
- After accepting a quest, call `world.refreshNpcs()` (NPCs with `until` / `hideWhile`).
- Realtime: never trust client-sent appearance or items; the server reads them from the database. `world.loadMap` must call `net.entered()` so the server resends the map's players.
- Online, items reach the bag only through the server (`grantItem`, `commitTrade`) or the custody rules in `db.reconcileItems`. A new way for the client to create an item (shop, quest reward, recipe) must be covered by `freeItems` / `questGrants` / `craftGrants` in `game/loot.js`, or saves will refuse it. Any server-side item change must bump `item_rev` and write a ledger row in the same transaction.
- Loot rules live in `game/loot.js` (shared). Do not roll drops anywhere else.
- Monster AI lives in `game/mobsim.js`, shared by the browser and the server: no DOM, no drawing, no direct damage to a player. Anything visible leaves as an event (`world.mobEvent` on the client, `server/src/mobs.js` on the server). `world.monsters` / `world.spawnGroups` are views of `world.sim`.
- Damage to shared monsters is computed by the server: the client sends `net.hit({ uid, sid })`, never a number. Every player hit must carry the skill id (`opts.sid` in `damageMonster`, `sid` on projectiles and zones).
- Hot paths on the server (positions, hits, kills, loot rolls) never read the database: use the session cache `s.ch` (refreshed on `saved`).
- `rollEquip(id, luck, minRarity)`: pass the minimum rarity in. Raising `r` afterwards leaves items without bonus stats.

## Git and PRs

- **Never add AI attribution** (no `Co-Authored-By: Claude`, no session links, no "Generated with …") to commits or PR descriptions.
- Conventional prefixes: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `ci:`. Branches look like `feature/...`, `refactor/...`.
- Ask before anything that rewrites published history (amend/rebase of pushed commits, force push).
- When a change mixes unrelated work, commit only what was asked (stage specific hunks/files).
- Never commit `.env`, `/data/` (game.db, secret.key), `*.db*`, `*.key`, `*.pem`. Run `npm run check`.
- `.claude/` is local-only (gitignored) and may contain local credentials. Never copy its contents into the repo.

## Working through the remote device bridge

The owner's repo lives at `H:\Projects\quy-mon-quan`. The bridge's file-commit tool refuses paths under `.github/`; write CI files through the device shell instead. Git commits there need delete permission for the folder (git removes its own `.lock` files).
