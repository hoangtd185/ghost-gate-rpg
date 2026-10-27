# CLAUDE.md

Quỷ Môn Quan (ghost-gate): a 2D side-scrolling wuxia/ghost RPG in the style of Ghost Online / MapleStory. Multiplayer stage 1 is in (presence, movement, chat over WebSocket); monsters, loot and saves are still per client, and fake-player bots fill maps. Browser canvas client, small Node + SQLite server, one monorepo.

## Read first

1. `HANDOFF.md` — content ids, how systems work, conventions, traps, history, open items.
2. `docs/ARCHITECTURE.md` — stack and *why*, the save queue, the decisions log, the dependency policy, the multiplayer plan.
3. `docs/MULTIPLAYER.md` — realtime protocol, data-safety design for stage 2, why no message broker.
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
