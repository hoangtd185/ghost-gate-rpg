# Quỷ Môn Quan (Ghost Gate)

A 2D side-scrolling RPG in the style of Ghost Online / MapleStory, set in an Asian wuxia world full of ghosts and demons.
It plays like an MMO. On the Node server, real players on the same map see each other move and can chat (map chat, or world chat with a leading `!`), each player gets personal loot that only they can see (rolled and saved by the server the moment it is picked up), and players can trade (T). Monsters are shared: everyone on a map fights the same ones; in a party (G) EXP is split evenly and each member gets their own drops, otherwise EXP follows damage and the top damager gets the loot. Bots that pretend to be other players (they hunt, rest, chat, and reply when you talk) keep the maps lively. See [docs/MULTIPLAYER.md](docs/MULTIPLAYER.md).

- **3 classes**: Kiếm Khách (swordsman, melee), Đạo Sĩ (taoist, talismans and elements), Thích Khách (assassin, throwing darts)
- **4 active skills + 4 passive skills per class**, arranged in a skill tree, with a respec option
- **12 maps**, each with its own parallax background and weather (snow, fireflies, embers, blood-moon petals…):
  Làng Trúc Lâm (village) → Rừng Ma Trơi → Cánh Đồng Hoang (→ side branch Đầm Lầy Sương Mù) → Nghĩa Địa Cổ → Quỷ Môn Quan (boss)
  → Tuyết Sơn → Huyền Băng Động → Hỏa Diệm Sơn → Kỳ Lân Đài (boss) · hidden zone Huyền Môn Cổ Tự → Chính Điện (final boss)
- **15 monster types, 3 chapter bosses, 4 story bosses, 5 field bosses**. Monsters scale with their level, get smarter at higher levels, and can roll Elite variants with affixes such as damage reflect, life steal, self-destruct, teleport, slow, poison and shields
- **Elements Fire / Ice / Lightning / Poison**: monsters have weaknesses and resistances, gear gives resistances, element orbs can be socketed into weapons
- **Equipment enhancement +1 → +10** at the blacksmith, with failure chance and protection charms
- **Gem sockets**: 5 gem types × 3 grades, socket, unsocket and fuse gems
- **Crafting** at the embroiderer NPC: outfits and consumables from farmed materials
- **9 outfits (cosmetic slot)** with capes, crowns, fox ears and tails, animated silk ribbons and auras. Rare drops from bosses, some craftable
- **Main story "Huyền Môn Phong Ấn"**: a prologue + 3 chapters (32 quests), voiced-style dialogue with character portraits, an in-story choice that changes the ending, story-gated zones that require leveling up
- Tutorial quests, side quests, daily bounty quests, daily gifts, titles shown above the character
- Context-aware NPC dialogue (story progress, time of day, class, pet, gear…) and NPCs that chat with each other
- A pet ghost (Tiểu Quỷ) that follows you and picks up loot in range, even on high platforms
- Double jump and variable jump height
- Chibi characters with big heads and big eyes. Every graphic is drawn in code; no art from any other game is used
- **Plain JavaScript on a canvas**, with a small Node server (`node:http`, `node:sqlite`, `node:crypto`). One runtime dependency, `ws` (WebSocket, multiplayer), so run `npm install` before starting the server; external libraries are allowed when they earn their place (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md))


> Picking up the project (new developer or AI)? Start with [HANDOFF.md](HANDOFF.md) (content ids, conventions, traps, history, open items) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (stack, why each technology was chosen, saving/queue design, decisions log, multiplayer plan). AI agents also read [CLAUDE.md](CLAUDE.md).

## Quick start on Windows

**Step 1. Install Node.js** (one time only)

Go to https://nodejs.org, download the **LTS** build (22 or 24) and install it like any other program.
Open a new **PowerShell** or **Terminal** window and run:

```powershell
node -v
```

Anything from `v22.13.0` upwards works.

**Step 2. Open a terminal in the project folder**

The easiest way is to open the project folder in **VS Code** and press `` Ctrl + ` `` to open the built-in terminal.
Or, in PowerShell:

```powershell
cd path\to\quy-mon-quan
```

**Step 3. Run the game**

```powershell
copy .env.example .env
npm install
npm run dev
```

`npm install` is needed once (and again after pulling changes to `package.json`): the server uses the `ws` package for multiplayer and will not start without it.

When you see `Quỷ Môn Quan đang chạy: http://localhost:3000`, open that address in your browser.
The first time, click "Tạo tài khoản" (create account), pick a name, create a character and play.
Press `Ctrl + C` in the terminal to stop the server.

The line `ExperimentalWarning: SQLite is an experimental feature` is a normal Node warning, not an error.

**Step 4. Edit the game**

- Edit files in `client/src/` → save → press **F5** in the browser.
- Edit files in `server/src/` → the server restarts by itself.

**Step 5. Production build**

```powershell
npm ci --omit=dev
npm run build
npm start
```

`npm ci --omit=dev` installs only the runtime dependencies (`ws`) exactly as pinned in `package-lock.json`.
`npm run build` creates `client/dist/index.html` (a single file containing the whole game).
`npm start` runs the server against the built file. This is also the command hosting platforms run.

## Requirements

- **Node.js 22.13 or newer** (for `node:sqlite`). Check with `node -v`.
- **Run `npm install` (or `npm ci`) before `npm run dev` or `npm start`.** The server needs the `ws` runtime dependency (WebSocket, multiplayer); without it it fails with `Cannot find package 'ws'`. `npm install` also installs `playwright-core` for the tests; run `npm run uat:browser` once after it.
- Opening `client/dist/index.html` straight from disk (single-player, no server) needs no install.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development mode: serves `client/src` directly, restarts the server when `server/src` changes |
| `npm run build` | Bundles the whole client into `client/dist/index.html` |
| `npm start` | Runs the server in production mode, serving the built file |
| `npm run check` | Scans the files that would be committed for leaked secrets |
| `npm run hooks` | Installs a git pre-commit hook that runs `npm run check` on every commit |
| `npm test` | Unit tests (`node --test`): data integrity, character model, config. A few seconds, no browser |
| `npm run uat` | Builds the client and runs every end-to-end acceptance scenario in `tests/e2e/` in headless Chromium (about 3–4 minutes) |
| `npm run uat:browser` | One-time: downloads the Chromium used by the scenarios (after `npm install`) |

## Build

`tools/build.mjs` is a tiny hand-written bundler. It follows the `import`s starting at `client/src/main.js`,
concatenates the modules in dependency order, and inlines the JS and CSS into a single HTML file.
Because everything ends up in one scope, two modules must not declare the same top-level name; the build fails if they do.

`client/dist/index.html` also works when opened directly from disk (no server).
In that case the game saves to the browser's localStorage.

## Where the game saves

`client/src/storage/storage.js` tries, in order:

| Situation | Storage | Login |
|---|---|---|
| A server is running (`npm start`) | SQLite through the REST API | Yes (username + password) |
| Running inside a Claude artifact link | The artifact's database (per Claude account) | No |
| HTML file opened directly | Browser localStorage | No |

## Deployment

The server is a plain Node process that listens on `PORT` and keeps its database in `DATA_DIR`.
**SQLite needs a disk that survives redeploys**, so pick a host with a volume / persistent disk.

### Option 1: VPS (DigitalOcean, Vultr, your own machine…)

```bash
git clone <your repo> quy-mon-quan && cd quy-mon-quan
npm ci --omit=dev
npm run build
cp .env.example .env
# edit .env: NODE_ENV=production, DATA_DIR=/var/lib/quymonquan, TOKEN_SECRET=<random string>, TRUST_PROXY=true if Nginx/Caddy sits in front
node server/src/index.js
```

To keep it running in the background and restart it on boot, use pm2:

```bash
npm i -g pm2
pm2 start server/src/index.js --name quymonquan
pm2 save && pm2 startup
```

For a domain name and HTTPS, put Nginx or Caddy in front and proxy to `localhost:3000`. Multiplayer uses a WebSocket at `/ws` on the same port: Caddy forwards it automatically; Nginx needs the upgrade headers:

```nginx
location /ws {
  proxy_pass http://localhost:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_read_timeout 120s;
}
```

### Option 2: Docker

```bash
docker build -t quymonquan .
docker run -d -p 3000:3000 -v quymonquan-data:/data -e TOKEN_SECRET=<random-64-char-string> --name quymonquan quymonquan
```

The image runs in production mode, so `TOKEN_SECRET` is required. Do not pass your dev `.env` with `--env-file`, because it would override `DATA_DIR` and `NODE_ENV`.

### Option 3: Railway (easiest for a first deploy)

**3a. Push the code to GitHub**

1. Create an account at https://github.com, click **New repository**, name it, keep it **Private**, click Create.
2. Install Git for Windows from https://git-scm.com.
3. In a terminal in the project folder:

```powershell
git init
npm run hooks
npm run check
git add .
git status
git commit -m "First version"
git branch -M main
git remote add origin https://github.com/<your-name>/<repo-name>.git
git push -u origin main
```

Git opens a GitHub login window on the first push. `git status` must not show `.env` or `data/`.

**3b. Deploy on Railway**

1. Go to https://railway.com and sign in with GitHub.
2. **New Project → Deploy from GitHub repo** → pick your repo. Railway detects the `Dockerfile` and builds it.
3. Open the new service → **Settings → Volumes → Add Volume**, mount path `/data`.
   This step is required. Without a volume, every redeploy wipes all accounts and characters.
4. **Variables** tab: add `NODE_ENV=production`, `TRUST_PROXY=true` and `TOKEN_SECRET` = a random string of at least 32 characters (see the command under Environment variables).
   `DATA_DIR=/data` and `PORT` already come from the Dockerfile; Railway assigns the port.
5. **Settings → Networking → Generate Domain** gives you a link like `your-app.up.railway.app`.

After that, every change is just:

```powershell
git add .
git commit -m "describe the change"
git push
```

Railway rebuilds and redeploys automatically; the data in the volume is kept.

### Option 3b: Render / Fly.io

Same idea as Railway: create a service from the GitHub repo and let the platform pick up the `Dockerfile`.
Without Docker: build command `npm ci --omit=dev && npm run build`, start command `npm start`.
Attach a **Persistent Disk** at `/data` and set `DATA_DIR=/data`, `NODE_ENV=production`, `TRUST_PROXY=true` and `TOKEN_SECRET`.
Note: Render's free tier has no persistent disk, so data is lost on every redeploy.

### Option 4: Static hosting only (no backend)

Upload just `client/dist/index.html` to GitHub Pages, Netlify or Vercel.
The game still works; progress is stored in each player's browser.

## Environment variables (.env)

Copy the template and edit it:

```bash
cp .env.example .env        # Windows: copy .env.example .env
```

The server loads `.env` on startup with Node's built-in `process.loadEnvFile` (no dotenv package). Variables set by the platform (Railway, Docker…) always win over `.env`.

| Variable | Default | Meaning |
|---|---|---|
| `NODE_ENV` | `development` | With `production`, a `TOKEN_SECRET` of 32+ characters is mandatory; the server refuses to start without it |
| `PORT` / `HOST` | `3000` / `0.0.0.0` | Port and address to listen on |
| `DATA_DIR` | `./data` | Folder holding `game.db` |
| `TOKEN_SECRET` | auto-generated in dev | Key used to sign login tokens. Generate one: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `TOKEN_DAYS` | `30` | Login token lifetime in days |
| `ALLOW_REGISTER` | `true` | `false` blocks new account sign-ups (handy when only you play) |
| `MAX_CHARS_PER_USER` | `6` | Characters per account |
| `LOGIN_LIMIT_PER_MIN` | `10` | Max login / register attempts per minute per IP |
| `API_LIMIT_PER_MIN` | `240` | Max API requests per minute per IP |
| `TRUST_PROXY` | `false` | Turn on behind a proxy (Railway, Render, Nginx) so rate limits use the real player IP |
| `CORS_ORIGIN` | empty | Only set when the game page and the API live on different origins |

## Security and publishing to GitHub

**Never committed** (already in `.gitignore`): `.env`, the `data/` folder (player database and `secret.key`), any `*.db`, `*.key`, `*.pem`. Only `.env.example` is committed.

**Before the first push:**

```bash
git init
npm run hooks      # install the pre-commit hook: every commit is scanned for secrets
npm run check      # scan right now
git add .
git status         # double-check: no .env, no data/
git commit -m "Quỷ Môn Quan"
```

`npm run check` (`tools/check-secrets.mjs`) blocks `.env` files, databases, key files, and content that looks like GitHub / AWS / Google / OpenAI tokens, private keys, or `SECRET=` / `PASSWORD=` assignments with a value. GitHub Actions (`.github/workflows/ci.yml`) runs the same scan, builds the client and boots the server on every push, runs the unit tests, then the end-to-end acceptance scenarios (`npm run uat`) in headless Chromium; screenshots are uploaded as the `uat-screenshots` artifact.

**If a secret was pushed by mistake:** deleting it in a new commit is not enough, because git history still has it. Rotate `TOKEN_SECRET` immediately (players just have to log in again), then clean the history.

**What the server already does:**

- Passwords hashed with salted scrypt and compared in constant time. Login tokens signed with HMAC-SHA256 and expiring.
- Rate limits on login / register and on total API requests per IP.
- Security headers: Content-Security-Policy (no scripts from other origins), `nosniff`, framing restricted, HSTS in production.
- JSON-only request bodies, 256 KB limit per request, header and request timeouts against slow-connection attacks.
- Static files: `../` path traversal and all dotfiles (`.env`, `.git`…) are blocked.
- Save validation: rejects level > 50, negative or absurd gold, stat or skill points above what the level allows, and malformed items. An account can only modify its own characters.
- The Docker image runs as a non-root user.

**Limits to keep in mind:**

- Client code (`client/`) is always visible in the browser, even if the repo is private. Never put secrets in client code.
- Game logic runs in the browser and the result is sent to the server, so the server rejects impossible values but cannot fully prevent cheating. Online, drops, pickups and trades are decided by the server, and uploaded saves cannot add monster-only items or change item stats (see docs/MULTIPLAYER.md).
- The `__game()` debug helpers are only exposed on `localhost`, when opening the file locally, or with `?debug` in the URL.
- To keep the source private, set the GitHub repo to **Private**. If you make it public, add a LICENSE file stating how others may use the code.

## Project structure

```
client/
  index.html            dev page (loads src/main.js as an ES module)
  src/
    main.js             startup, game loop, wires the UI to the game world
    config.js           GAME: every balance / tuning number in one place (also read by the server)
    engine/             keyboard / touch input, utilities
    data/               GAME DATA: classes, skills, items, monsters, maps, NPCs, quests, bots
      story.js          main story, tutorial quests, scenes with choices
      chatter.js        everyday NPC lines and NPC-to-NPC conversations
      affixes.js        monster affixes, intelligence tiers, elites, story and field bosses
      recipes.js        crafting recipes
      legacy.js         old (pre-English) id map, migrates saves made before the rename
    gfx/
      draw.js           drawing toolkit: hi-res canvases, outlines, shading, gradients
      humanoid.js       chibi characters (hair, eyes, robes, hats, weapons, outfit parts, 14 frames)
      monsters.js       monster and boss sprites
      icons.js          item icons and projectiles
      backgrounds.js    layered backgrounds for every map
    game/
      character.js      stats, EXP, inventory, equipment, gems, crafting, passives, quest state
      entities.js       physics (gravity, one-way platforms), player, monsters, projectiles
      world.js          core logic: combat, drops, rendering
      mobsim.js         monster AI, spawns, bosses (shared with the server)
      physics.js        gravity and platforms (shared with the server)
      combat.js         damage formulas (shared with the server)
      bots.js           fake-player bot AI and chat
      chatter.js        picks context-aware NPC lines without repeating
    ui/                 HUD, inventory / skills / quests / shop / forge / crafting windows, login screens
    storage/            the 3 storage backends (API / Claude / browser)
    net/realtime.js     WebSocket client: position sync, other players, chat, loot, trades, reconnect
    style.css
server/src/
  index.js              HTTP server, API routing, security headers, rate limits, static files
  realtime.js           WebSocket server at /ws: presence, movement, chat, loot, trades
  mobs.js               shared monsters: one simulation per map, hits, rewards
  party.js              parties
  loot.js               personal loot: drops, pickup commit queue
  trade.js              player-to-player trades
  config.js             reads environment variables and .env
  db.js                 SQLite schema, migrations, character read / write
  auth.js               password hashing (scrypt), login tokens (HMAC)
tools/
  build.mjs             bundles the client into one HTML file
  check-secrets.mjs     secret scanner used by `npm run check` and the pre-commit hook
.env.example            configuration template
Dockerfile              production image
```

## Database

4 tables (see `server/src/db.js`):

- `users`: accounts and password hashes
- `characters`: stats, level, gold, position, skills (JSON), pet, title, `flags` (JSON: story choices)
- `items`: one row per item; a non-NULL `equip_slot` means equipped; `enhance` is the enhancement level, `el` the socketed element, `gems` (JSON) the socketed gems
- `quests`: progress per quest; `day` is the completion date (for daily quests)

When a new column is added (for example `pet`), `migrate()` in `db.js` runs `ALTER TABLE` on old databases at startup, so existing data is never lost.

To inspect the data, open `data/game.db` with [DB Browser for SQLite](https://sqlitebrowser.org/).

## API

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | `{username, password}` → `{token}` |
| POST | `/api/auth/login` | `{username, password}` → `{token}` |
| GET | `/api/characters` | List characters (token required) |
| POST | `/api/characters` | Create a character `{character}` |
| PUT | `/api/characters/:id` | Save progress `{character}` → `{ok, itemRev, stale, items?}` (see docs/MULTIPLAYER.md §3) |
| GET | `/api/characters/:id/changes?since=rev` | Item and gold changes the server made after `rev` (pickups, trades) |
| DELETE | `/api/characters/:id` | Delete a character |
| GET | `/api/leaderboard` | Top 10 by level |

Send the token in the `Authorization: Bearer <token>` header. Request bodies must be `Content-Type: application/json`.

## Extending the game

**Where to change things:**

| What | File |
|---|---|
| Balance and feel: speeds, jump, sprint, regen, EXP curve, points per level, monster scaling, elite and chieftain rates, drop rarity, enhancement rates, autosave and retry timing | `client/src/config.js` (`GAME`) |
| Content: classes, skills, items, monsters, maps, NPCs, quests, dialogue, recipes, named bosses | `client/src/data/*.js` |
| Server deployment: port, secrets, registration, rate limits, CORS | `.env` (see `.env.example`), read by `server/src/config.js` |

The server imports `client/src/config.js` too, so values both sides must agree on (class ids, equipment slots, level cap, points per level, max enhancement) come from one place.

**Conventions.** Code, ids and comments are in English. Only player-facing text (dialogue, item and map names, UI labels, error messages shown on screen) is Vietnamese. Ids are lowercase snake_case: classes `swordsman` / `taoist` / `assassin`, elements `fire` / `ice` / `thunder` / `poison`, maps such as `village` or `ghost_gate`. If you rename an id that can be stored in a save, add the old name to `client/src/data/legacy.js` so existing characters keep loading.

Almost all content lives in `client/src/data/`, so most changes are data edits:

- **New monster**: add it to `data/monsters.js`, draw it in `gfx/monsters.js` (register the draw function in `MAKERS`), then place it in a map's `spawns`.
- **New map**: add it to `maps.js` (platforms, portals, spawns, NPCs) and pick an existing `theme` (`village`, `forest`, `field`, `graveyard`, `hell`, `swamp`, `snow`, `icecave`, `volcano`, `temple`) or add a theme in `gfx/backgrounds.js`. Remember to add portals in both directions. Weather per theme lives in `updateWeather` (`game/world.js`).
- **New boss**: set `behavior: 'boss'`, `proj` (projectile), `summon` (summoned minion) and `lines` (dialogue) in `data/monsters.js`.
- **New named / field boss**: add an entry to `NAMED` in `data/affixes.js` based on an existing monster, with multipliers, affixes, drops and either a `quest` (story boss) or an `every` respawn timer (field boss).
- **New item**: add it to `items.js`, then to a monster's drop table, an NPC shop in `npcs.js`, or a recipe in `recipes.js`.
- **New quest**: add it to `QUESTS` in `npcs.js` (side quests) or to `story.js` (story, tutorials), then add its id to the NPC's `quests` list.
- **New NPC line**: add it to `data/chatter.js`. Conditional lines are written as `['line', { a: 'st7' }]` (only said after quest st7 is done).
- **Balancing**: stat formulas in `calcStats`, EXP curve in `expToNext` (`game/character.js`), damage in `hitDamage` (`game/combat.js`, used by the browser and the server).

While testing, open DevTools (F12) and type:

```js
__game().giveExp(5000)          // add EXP
__game().ch.gold += 10000       // add gold
__game().loadMap('ghost_gate', 200) // teleport to the first boss
```

## Controls

| Key | Action |
|---|---|
| ← → | Move (double-tap and hold = sprint) |
| Space / X | Jump (hold = higher, press again in the air = double jump) |
| ↓ + Space / Ctrl + ↓ | Drop down through a platform |
| ↓ (standing still) | Sit and rest, regenerates 3× faster |
| Z / J (hold) | Basic attack |
| A S D | Skills |
| 1 / 2 | HP potion / MP potion |
| ↑ / E | Use portal, talk to NPC |
| I C K L | Inventory, Character, Skills, Quests |
| Enter | Chat with players on this map (bots reply); start with `!` for world chat |
| P | Summon / dismiss the pet |
| T | Trade with the player standing next to you (online) |
| G | Invite the player standing next to you to your party (online) |
| Esc | Close window / system menu |

On phones, touch buttons appear automatically the first time you touch the screen.

## Game systems

**Elements** (`data/elements.js`)

- Monsters have a `res` table: positive values resist, negative values are weaknesses. For example the scarecrow's `res: { fire: -0.5 }` takes 50% extra fire damage.
- An attack takes its element from the skill (Lôi Phù = lightning, Hỏa Long Phù = fire, Độc Vụ = poison). Skills without an element use the weapon's element.
- Weapons get an element from a socketed orb (fire / ice / lightning / poison orb, used from the inventory) or have one built in (tier 5 weapons are ice, tier 6 are fire).
- Players get resistances from gear (`res_fire`, `res_ice`…), capped at 75%. See the Character window (C).

**Enhancement** (`data/items.js` → `ENHANCE_*`, `game/character.js` → `enhanceEntry`)

- Each level adds 10% of the item's base stats.
- Success rate drops with level: +1 is 100%, +10 is 22%. From +5 upwards a failure drops the item one level unless a protection charm is used.
- Cost: `1 + level/3` enhancement stones plus gold that scales with item level.

**Daily quests**: quests with `daily: true` store the completion date and can be taken again the next day (local time).

**Titles**: a quest reward `title`, shown above the character's head.

**Passive skills** (`data/classes.js` → `PASSIVES`)

- Each class has 4 passives in a tree, unlocking at levels 5 / 10 / 16 / 22. Each node requires the previous one at a certain level. Max level 5.
- Passives share skill points with active skills (+1 point per level), so you have to choose a build.
- Swordsman: HP/defense → attack/crit damage → life steal → bonus when low on HP. Taoist: MP → elemental damage → lower MP cost → all resistances. Assassin: dodge/move speed → crit chance → crit damage → heal on kill.
- Respec from the Skills window costs `level × 150` gold.

**Monster scaling** (`data/affixes.js`, `game/entities.js` → `Monster`)

- Every monster rolls its own level, 0–3 above its species level. Per level: HP +12%, attack +7%, defense +5%, EXP +15%.
- Intelligence tiers by level: 1–5 only chase after being hit · 6–12 aggro on sight, ranged monsters keep their distance · 13–20 dodge projectiles, call nearby allies, wind up and charge · 21+ lead their shots, attack faster, retreat to heal when low.
- **Elites** (★, gold name, glow): 3–7% depending on zone level. HP ×4, attack ×1.4, 1–2 random affixes, better drops.
- **Affixes**: Reflect (bounces 18% of your damage back), Life Steal, Regeneration, Enrage, Self-Destruct (red warning circle, then explodes), Teleport, Frost (slows you), Poison, Shield. Some species always have one: ice golems reflect, poison frogs poison, lava beasts explode, ice bats slow…

**Chieftains** (`CHIEF` in `data/affixes.js`): now and then (1.5% per spawn, max one per map) a regular monster spawns as a bigger "Đầu Lĩnh" with ×7 HP, harder hits and better drops.

**Named bosses** (`NAMED` in `data/affixes.js`)

- Story bosses: Bù Nhìn Đầu Đàn, Lão Đăng Quỷ, Băng Dực Vương, Huyết Thi Tướng. They only appear while the matching quest is active.
- Field bosses: Cửu Vĩ Hồ Vương (Rừng Ma Trơi), Cương Thi Vương (Nghĩa Địa Cổ), Tuyết Sơn Ma Vương (Tuyết Sơn), Nham Ma Hỏa Thú (Hỏa Diệm Sơn), Bạch Diện Quỷ Chủ (Cổ Tự). They respawn every 4–10 minutes while you are on that map, with an announcement in chat.

**Outfits** (5th equipment slot, `slot: 'outfit'` in `data/items.js`)

| Outfit | Level | Source |
|---|---|---|
| Ma Trơi Tinh Nghịch | 1 | Wisps (extremely rare), Cửu Vĩ Hồ Vương, elites |
| Hồ Ly Y | 10 | Cửu Vĩ Hồ Vương 7%, crafting |
| Hắc Long Bào | 14 | Hắc Quỷ Vương 3%, Cương Thi Vương 6% |
| Nghê Thường Tiên Y (white fairy) | 15 | Crafting · 1.5–2% from Tuyết Sơn Ma Vương, Băng Dực Vương, Bạch Diện Quỷ Chủ |
| Đào Hoa Tiên Y (pink fairy) | 15 | Crafting · 1.5–2% from Cửu Vĩ Hồ Vương, Cương Thi Vương |
| Thanh Liên Tiên Y | 18 | Băng Dực Vương 8%, Bạch Diện Quỷ Chủ 4%, elites 0.4% |
| Bạch Hồ Cừu | 20 | Tuyết Sơn Ma Vương 7% |
| Phượng Vũ Y | 24 | Hỏa Kỳ Lân 4%, Nham Ma Hỏa Thú 6% |
| Huyết Nguyệt Chiến Giáp | 28 | Huyền Cơ 4%, Huyết Thi Tướng 6%, Bạch Diện Quỷ Chủ 7% |

Outfits change the character's look (animated silk ribbons orbiting the body, capes, crowns, fox ears and tails, masks, auras) and add a few stats. Rare drops show a light pillar on the ground and a chat announcement.

**Story pacing**

- Portals to new zones are **sealed** until the matching story step is done (`lock` in `maps.js`), e.g. the swamp needs the fog-clearing incense and the snow mountain needs the first chapter boss.
- Level requirements are spread out and story EXP rewards are only 12–65% of a level (`main()` in `story.js`), so you have to grind between steps. The quest tracker suggests a map to level up on.

**Crafting** (`data/recipes.js`, NPC Tú Nương in the village)

| Item | Materials |
|---|---|
| Đào Hoa Tiên Y | 40 Cánh Đào Ma, 20 Đuôi Hồ Ly, 20 Lửa Ma Trơi, 1 Tiên Lộ, 15,000 gold |
| Nghê Thường Tiên Y | 40 Tơ Băng Tằm, 20 Lông Tuyết Hồ, 15 Băng Tinh, 2 Tiên Lộ, 30,000 gold |
| Hồ Ly Y | 60 Đuôi Hồ Ly, 15 Cánh Đào Ma, 1 Tiên Lộ, 10,000 gold |
| Large HP ×5 / Large MP ×5 / Enhancement Stone / Protection Charm / random grade-1 gem | common monster materials |

Materials: **Cánh Đào Ma** (ghost peach petal: fox spirits 6%, scarecrows 5%, wisps 3%), **Tơ Băng Tằm** (ice silk: ice bats 8%, snow foxes 5%, yetis 4%), **Tiên Lộ** (fairy dew: guaranteed from field and chapter bosses, 50% from story bosses, 8% from elites). A new recipe is one more line in `RECIPES`.

**Gem sockets** (`data/items.js` → `GEM_*`, `game/character.js` → `socketGem`, `fuseGems`)

- 5 gem types: Hồng (attack), Hoàng (crit), Lục (HP), Tử (defense), Lam (MP); each in 3 grades: Sơ / Trung / Thượng.
- Sockets: 1, +1 for Quý (epic) rarity or better, +1 from enhancement +7 (max 3).
- Weapons accept Hồng / Hoàng / Lam, hats and armor accept Lục / Tử / Lam, accessories accept all (`GEM_SLOTS`).
- Fusing: 3 identical gems → 1 gem of the next grade. Sơ → Trung always succeeds, Trung → Thượng 75% (a failure destroys one gem).
- Unsocketing costs a small fee and returns the gem intact. In drop tables, `GEM1` / `GEM2` / `GEM3` mean a random gem of that grade.

**Story** (`data/story.js`)

The main line is a prologue plus 3 chapters (32 quests, level 1 → 32):

- **Prologue · Người Đến Từ Màn Sương**: you wake up with no memory in the village, holding half of a broken soul-summoning bell.
- **Chapter 1 · Mệnh Thuần Âm**: the girl Tiểu Lan is kidnapped; follow the trail to the Ghost Gate and defeat the Black Ghost King.
- **Chapter 2 · Huyết Ma Châu**: two estranged disciples of the Huyền Môn sect, a fire qilin corrupted by a blood pearl.
- **Chapter 3 · Mặt Nạ Trắng**: the truth about the village taoist, the hidden temple, and the choice of whether to ring the bell.

How quests are written:

- Each quest has an `intro` (on accept) and an `outro` (on turn-in). Each line is `[speaker, text, condition?]`; the speaker is an NPC id, `'me'`, `'sys'` (narration) or a monster id. The condition `'bell=ring'` shows the line only if the player chose to ring the bell.
- `type`: `talk` (go meet `target`), `kill`, `collect`, `act` (tutorial action; `target` is an event name: `djump`, `potion`, `buy`, `stat`, `skillup`, `enhance`, `socket`, `fuse`, `orb`, `daily`, `craft`).
- `turnIn`: the NPC that receives the quest; `drop`: a quest item dropped by monsters while active; `give`: items handed out on accept; `hint`: a tip shown in the quest log.
- `SCENES`: cutscenes played when entering a map while a quest is active, optionally with choices (stored in `ch.flags`).
- In `maps.js`, NPCs can have `after` (appear after a quest is done), `until` (disappear once a quest is accepted) and `hideWhile` (absent while a quest is active); portals can have `req` (hidden until a quest is done) and `lock` (visible but sealed).
- When inserting a quest into the main line, add its id to `MAIN_ORDER` in the right place; characters already past that point automatically get it marked as done.

**Tutorial quests**: the village chief (double jump, stat points, pet), the healer (potions, shopping), the taoist (skills, elements), the blacksmith (enhancement, gem sockets, gem fusing), the bounty officer (daily bounties) and the embroiderer (crafting). Marked with a blue **!** above the NPC.

**NPC dialogue** (`data/chatter.js`): each NPC has `lines` (spoken when you stand nearby), `greet` (opening line when you talk to them) and `hi` (said as you walk up). Lines change with story progress, time of day, level, class, pet, title and weapon. `BANTER` holds NPC-to-NPC conversations.

## How the graphics are drawn

The game uses no image files. At startup every character and monster is drawn with Canvas 2D (Bézier curves,
gradients, dark outlines) at 3× resolution into an in-memory sprite sheet; during play the game just copies
frames from the sheet to the screen. Drawing large and scaling down keeps everything smooth instead of pixelated.

To change a class's robe colors, hair style or eye color, edit `look` in `data/classes.js`
(`robe`, `trim`, `hair`, `hairStyle` 0–5, `eye`, `skin`). NPC looks are in `data/npcs.js`.

If you later want hand-drawn PNG art instead of code-drawn sprites, create sheets with the same shape
`{ img, fw, fh, s, frames }` in `gfx/` and the rest of the game keeps working unchanged.
