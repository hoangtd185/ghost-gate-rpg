# Multiplayer and data safety

What online play does today, how items are kept safe, how other games do it, and what comes next. Read [ARCHITECTURE.md](ARCHITECTURE.md) first for the overall picture.

| Stage | What | Status |
|---|---|---|
| 1 | Presence, movement, map/world chat, appearance from the database | Done |
| 2 | Personal loot rolled and committed by the server, item custody on saves, item ledger, trades; shared monsters run by the server; parties with EXP and loot rules; pickup commit queue | Done |
| 3 | Forge/shop/quests as server actions; write-behind for position/HP; backups; guilds, PvP | Next (see §9) |

Only the Node server backend (ApiStorage) goes online. The artifact and file:// builds stay single-player and roll their own loot.

---

## 1. Presence and chat (stage 1)

Players on the same map see each other move, see each other's gear, and chat (`!text` = world channel). Bots still fill empty maps.

| Piece | File |
|---|---|
| WebSocket server (`ws`) at `/ws`, on the same HTTP server | `server/src/realtime.js` |
| Client connection, reconnect with backoff | `client/src/net/realtime.js` |
| Other players: buffered snapshots, drawn 120 ms in the past (interpolation) | `RemotePlayer` in `client/src/game/entities.js` |
| Tuning (send rate, limits, timeouts, loot and trade rules) | `GAME.net` in `client/src/config.js` |

Safety rules:

- Auth at connect; bad token or someone else's character → close code 4003.
- One connection per character: the newest wins, the old one gets `kicked` and close code 4000 (it does not reconnect, so two tabs do not fight).
- Position messages are rate-limited (20/s) and clamped to the map; the map id must exist; the animation name must be known. Map entries (`enter`, which answer with a full snapshot) have their own limit (4/s): extra ones are merged into one, applied when the window opens.
- Chat: token bucket (burst 5, one token per 1.5 s), control characters stripped, 80 characters max. The client escapes HTML when drawing.
- Appearance always comes from the saved character, never from the message, so nobody can show gear they do not own.
- `maxPayload` 4 KB, a 5 s hello timeout, ping every 25 s to drop dead connections.

## 2. Shared monsters and parties

**Monsters are shared, items are personal.** Everyone on a map fights the same monsters; when one dies, each player gets their own reward, and drops are seen only by whoever they belong to.

### Who runs the monsters

`server/src/mobs.js` runs one simulation per map that has players on it, using `client/src/game/mobsim.js`: the **same AI code** the offline game runs in the browser (smartness tiers, affixes, bosses, summons, field-boss timers). It ticks at 20 Hz (3 sub-steps each) and sends positions at 10 Hz, only for monsters that changed. Clients draw the server's monsters and interpolate them. A map nobody is on stops after 30 s.

| Who | Does what |
|---|---|
| Server | Spawns, AI, HP and shields, aggro, regeneration, poison, deaths, respawns, field bosses, **every damage number on a shared monster**, rewards |
| Each client | Its own hit detection (which skill touched which monster) → `hit {uid, sid}`; contact damage, monster projectiles and slams on **its own** player (from server positions and events); effects and text |

### Damage is computed by the server

The formula lives in `client/src/game/combat.js` and is shared: the offline game and personal story bosses use it in the browser, the server uses it for shared monsters. The client never sends a number:

```text
client: "skill sw_combo hit monster 42"   ──▶  hit {uid: 42, sid: 'sw_combo'}
server: knowsSkill? in reach? rate OK?
        stats = calcStats(saved character, active buffs)          (cached per session)
        dmg   = hitDamage(stats, skillMult(skill level), monster def/resistances, element, low HP?)
        sim.damage(monster, dmg, player)                          (shield, HP, aggro, EXP shares)
◀── mhit {uid, by, dmg, ab, crit, em, el}  to everyone on the map (the attacker also applies lifesteal / reflect)
```

- **Checks**: the skill must be of the player's class and learned; the monster within the skill's reach (`skillReach`) + 160 px slack; one rate limit per skill: a cast can only hit `hits × targets` times, and the cooldown sets the refill.
- **Buffs** (`cast {sid}`): the server checks the skill and its cooldown and applies the buff to its own formula for its duration.
- **Low-HP passive**: the client reports its HP % in `pos`; the server uses it for that bonus only.
- Poison clouds: each tick is a hit; the server adds 2 s of poison at 30% itself.

**Story bosses stay personal**: they only exist while *your* quest is active, so your client simulates them for you alone and reports the kill (`kill`), as before. A kill report for anything else is refused (`why: 'shared'`).

### Rewards when a shared monster dies

```text
damage per group  =  a party (its members on this map)  or  a player on their own
EXP               =  monster EXP × group damage / total damage
                     party: split evenly between members on the map · solo: all of it
                     then each player's part is adjusted for level gap (killExp)
items + gold      =  the group with the most damage
                     party: every member on the map gets their OWN roll (personal drops)
                     solo: that player
quest credit      =  everyone who got EXP
```

A player who left the map before the kill gets nothing. Parties: press **G** next to someone to invite them (up to 4, leader invites); the party panel shows members, level and map; *Rời* leaves.

### Picking up

```text
client                    server (server/src/loot.js)                         database
◀── mkill {exp, drops}    drops kept in memory for that player only (60 s + grace)
pick {id} ────────────▶  ours? same map? in range? rate limit? queue full?
                          into the commit queue (≤ 25 ms or 200 pickups)
                          one transaction for the whole batch ─────────────▶ COMMIT
◀── chg {list, rev}       only now: "you got X"
◀── pick {id, ok}
```

- **Drops** are rolled with the same function the offline game uses (`rollDrops`), so rates and rarity rules are identical. Gold and quest items are still handled by the client.
- **Pickups** are idempotent: the drop id is the ledger `req_id`, so a repeated request never gives the item twice.
- **The pet** picks up through the same path.
- Unpicked drops are resent when the player comes back to the map or reconnects (`drops`).

## 3. Item custody: what a client save may change

The client still uploads the whole character (EXP, position, quests, shop purchases, forging…). The server now applies rules before writing items (`reconcileItems` in `server/src/db.js`):

1. **Revisions.** Every server-side change (pickup, trade) bumps the character's `item_rev`. A save made from an older revision (an upload in flight, an old outbox copy, a tab that missed a change) **does not touch items, gold or quests**; everything else is saved. The answer says `stale: true`.
2. **Identity.** An item the server already has keeps its id, rarity and bonus stats. The client may change quantity, enhancement, element, gems and where it sits (bag or equipment).
3. **Ownership.** An item that now belongs to another character (traded away) is dropped from the upload.
4. **What the client may add:**
   - *free items*: anything sold in a shop, gems (fusing, unsocketing), quest-only items (`freeItems()` in `client/src/game/loot.js`);
   - *earned items*: quest gifts and rewards for quests accepted or completed **in that save**, crafting results whose **materials were used up in that save**, the starter kit of a new character (`questGrants`, `craftGrants`, `starterKit`);
   - nothing else: monster materials, outfits and rolled equipment only come from the server.
5. **Quantities.** For items that are not free, the total may not grow beyond what the save earned. Stacks may be merged or used up.

Refused items are written to the ledger as `rejected` (with the reason), and the answer includes `items` so the client replaces its bag with what the server kept.

How the client keeps up:

- `chg {list, rev}` over WebSocket after each pickup or trade, and on reconnect for everything after the revision the client sent in `hello`.
- Without a WebSocket (blocked proxy), a `stale` save answer makes the client fetch `GET /api/characters/:id/changes?since=rev`.
- `mergeOutbox`: an outbox copy older than the server's `item_rev` takes items, gold and quests from the server copy.

## 4. Trade

Like Võ Lâm Truyền Kỳ: both players put items into a shared window, lock, confirm, and only then does anything move (`server/src/trade.js`).

1. Stand close to someone and press **T** (the hint "T · Giao dịch" appears above the nearest player). They get a request with *Đồng ý / Từ chối* (20 s).
2. Click items in your bag to put them in (whole stacks; quest items and equipped items cannot be traded); type an amount of gold and press *Đặt*. The other side sees your items with full details.
3. **Any change unlocks both sides** (anti-scam). Each side locks; when both are locked, each presses *Giao dịch* to confirm.
4. Both confirmed: `commitTrade` checks every item still belongs to its side with the quantity shown, the gold is there and both bags have room, then moves items and gold and writes ledger rows for both players **in one transaction**. Both clients get `chg` and `trade_end {why: 'done'}`.

Items in your offer cannot be used, equipped, sold, dropped or forged while the trade is open. Closing the window, Esc, changing map or disconnecting cancels it; nothing moves. Offers are checked against the **saved** bag, so the client saves when the window opens; a mismatch answers `trade_err {why: 'sync'}`, the client saves and offers again.

## 5. Protocol

JSON text frames, `t` is the message type.

| Direction | Message | Meaning |
|---|---|---|
| C → S | `hello {token, char, rev}` | First message. Token = the REST token; the character must belong to that account. `rev` = the item revision the client has; newer changes are replayed. |
| C → S | `pos {map, x, y, vx, f, a, g, sy, d, h, enter?}` | Our state, 10×/s and only when it changed. `g` on the ground, `sy` the floor we stand on, `d` dead (the monsters' AI uses them), `h` HP % (low-HP passive). `enter: 1` after loading a map: the client cleared its player list and needs a fresh `snap`. |
| C → S | `chat {ch: 'map'\|'world', text}` | Chat. |
| C → S | `saved {}` | We just saved. The server re-reads gear/level/title **from the database** and tells the map. At most once per second; a later one is applied when the second is up. |
| C → S | `hit {uid, sid}` | Skill `sid` hit shared monster `uid` (our own hit detection). The server computes the damage. |
| C → S | `cast {sid}` | We used a buff skill (the server applies it to its damage formula). |
| C → S | `kill {k, map, mob, x, y, named}` | A **personal story boss** we killed. Queued while disconnected, sent after the next `snap`. |
| C → S | `party_invite {to}` · `party_answer {from, yes}` · `party_leave` | Party. |
| C → S | `pick {id}` | Pick up one of our server drops. |
| C → S | `trade_ask {to}` · `trade_answer {from, yes}` · `trade_offer {items: [{uid, qty}], gold}` · `trade_lock {on}` · `trade_confirm` · `trade_cancel` | Trade. |
| S → C | `welcome {id, online}` · `online {n}` | Connected; player count. |
| S → C | `snap {map, players}` · `join {p}` · `leave {id}` | Who is on our map. |
| S → C | `st {s: [[id, x, y, vx, f, a], …]}` | Batched movement, one message per map per tick (10 Hz). |
| S → C | `look {id, cls, lv, title, look}` | Someone's appearance changed. |
| S → C | `chat {ch, id, from, text}` · `kicked {reason}` · `error {msg}` | |
| S → C | `mobs {map, list}` · `mspawn {m}` | The map's shared monsters (spawn info: id, level, elite/chief/named, affixes, position, HP). |
| S → C | `ms {s: [[uid, x, y, facing, hp, shield, state], …]}` | Monster positions and state, 10×/s, only changed ones. `state` bits: 1 attacking, 2 hurt, 4 charging, 8 poisoned. |
| S → C | `mev {list}` | Monster events: `text`, `fx`, `chat`, `announce`, `shoot` (a projectile: each client checks it against its own player), `slam`, `explode`. |
| S → C | `mhit {uid, by, dmg, ab, crit, em, el}` | A hit on a shared monster, computed by the server: damage dealt, shield absorbed, crit, element multiplier. |
| S → C | `mdie {uid, by}` · `mkill {uid, mob, named, x, y, exp, gold?, drops?}` | A monster died (everyone on the map); our reward (only those who earned one). |
| S → C | `party_ask {from, name}` · `party_state {party}` · `party_err {why}` | Party. |
| S → C | `loot {k, map, drops: [{id, it, rare, x, y}], why?}` | Drops for story-boss kill `k` (empty with `why` if refused). |
| S → C | `drops {map, drops}` | Our unpicked drops on this map (after a reconnect or coming back). |
| S → C | `pick {id, ok, why?}` | Pickup result, after the commit; `why`: `gone`, `far`, `full`, `busy` (rate limit or queue full: try again). The item itself arrives in `chg`. |
| S → C | `chg {list: [{rev, kind, uid, id, qty, entry}], rev}` | Item/gold changes to apply, oldest first. `kind`: `gain` (add `entry`), `loss` (remove `uid`), `gold` (add `qty`). |
| S → C | `trade_ask {from, name}` · `trade_open {id, with}` · `trade_state {id, me, them}` · `trade_end {id, why, by?}` · `trade_err {why}` | Trade. |

REST additions: `PUT /api/characters/:id` answers `{ok, itemRev, stale, items?}`; `GET /api/characters/:id/changes?since=rev` returns `{list, rev}`.

## 6. Load: what touches the database (the "flash sale" question)

A flash sale has thousands of buyers fighting over few items, so it needs admission control, a queue, an atomic "who got it" decision and sharding. Here is where each idea lands in this game:

| Flash-sale technique | Here | Why |
|---|---|---|
| **Rate limit / admission control** | Token buckets per player for positions, map entries, chat, hits, story-boss kills, pickups; `saved` at most once a second; the pickup queue has a hard cap (`queueMax`): beyond it a pickup is answered `busy` and the client simply tries again | Protects the server from spam and bursts |
| **Queue: spread work over time** | The **pickup commit queue**: pickups from all players are collected for ≤ 25 ms and written in **one** transaction (group commit: one disk sync for up to 200 pickups). Players are answered only after the commit, so the "commit before telling" guarantee still holds | Disk syncs are the expensive part of SQLite writes; batching turns N syncs into 1 |
| **Redis atomic: who gets the item** | The game decides in **memory, in one Node process**: monster HP, kills and drop ownership. One event loop runs one message at a time, so every decision is atomic, like a Redis command, without a network hop | There is no contention to resolve: drops are personal (owned by one player from the moment they exist), so two players never race for the same item |
| **Buckets / sharding** | Maps are natural shards: each map has its own simulation and its own players. When one process is not enough, maps move to separate processes, with Redis for what crosses maps (chat, parties, trades) | Not needed yet (see §10) |

What never touches the database: positions, chat, hits and their damage, monster AI, kills, loot rolls (all memory). The session caches the character (class, level, skills, quests) and its computed stats, and refreshes them on `saved` and when a buff starts or ends. What does: pickups (batched), trades (rare, one transaction), uploaded saves (one per player at a time, rate-limited by the API).

## 7. Database

```sql
-- characters.item_rev: bumped on every server-side item/gold change
CREATE TABLE item_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,             -- ms timestamp
  character_id TEXT NOT NULL,
  rev INTEGER NOT NULL,            -- the character's item_rev after the change
  kind TEXT NOT NULL,              -- gain | loss | gold | rejected
  item_uid TEXT, item_id TEXT,
  qty INTEGER NOT NULL DEFAULT 0,  -- items: quantity; gold: signed amount
  entry TEXT,                      -- JSON item for gains (what the client adds)
  reason TEXT NOT NULL,            -- drop | trade | save
  ref TEXT,                        -- drop id, trade id + partner, why a save was refused
  req_id TEXT UNIQUE               -- idempotency key
);
```

It answers "where did my item go?", lets support restore an item, and makes cheating visible (`rejected` rows). `synchronous = FULL`: a committed transaction survives a power cut.

## 8. How other games keep player data

Public technical write-ups exist for few games; the pattern below is consistent across what is documented.

| Game | What is known | Lesson |
|---|---|---|
| **Genshin Impact** | No save button. Progress is saved on the server as you play; closing the game does not undo spending or pulls. | The server is the only source of truth. |
| **RuneScape** | Servers save characters periodically; after a crash ("server blackout") players lose the progress since the last save, typically 15–60 minutes. Drops are visible only to the killer for a while. | Periodic snapshots lose data by design; valuable events must not wait for the next snapshot. |
| **Hearthstone (China, 2017)** | A power outage plus a failed backup forced a rollback of several days. | A database without tested backups is the real single point of failure. |
| **Võ Lâm Truyền Kỳ, Ghost Online, MapleStory** | No official technical documentation. Their history shows the same model: game server holds state, a database persists it, and "rollback" and item duplication incidents come from the gap between the two or from trusting the client. | Write item changes in one transaction; never trust client-reported items. |

## 9. What is still client-side, and the next steps

Stage 2 closes the biggest holes (inventing drops, editing item stats, duplicating through trades, losing a pickup on disconnect, reporting kills that never happened). Still decided by the client, and checked only for plausibility:

- Hit detection (which skill touched which monster; the server checks skill, reach and rate, and computes the number), gold from monsters and shops, EXP and levels (the server tells each client its EXP, but the client still uploads its level; `sanitizeCharacter` limits impossible values).
- Forging (enhancement success, gem sockets, fusing), shop purchases, quest progress and rewards (bounded by the rules in §3).
- Online, smart monsters do not dodge projectiles (the server does not see them) and bots do not hurt shared monsters (they exist only on one screen).

| Step | What |
|---|---|
| 3a | EXP and level owned by the server; damage to players computed on the server too |
| 3b | Forge, shop and quest rewards as server actions |
| 3c | Write-behind for position/HP/EXP; grace period on disconnect |
| 3d | Nightly `VACUUM INTO` backups, tested restores; optional [Litestream](https://litestream.io/) |
| 3e | Friends, guilds, party loot options, PvP |

## 10. Message queue, RabbitMQ: do we need it?

**Not for saving data.** The guarantee "the item exists" comes from the **database commit before the answer**. A queue in front of the database does not add safety; it adds a place where the item can exist *only* in the queue, plus another service to run and monitor. If RabbitMQ accepts a message and the consumer crashes, you are back to retries and duplicates, which the transaction + idempotency key already solve directly.

Where a broker does help, and when to add it:

| Need | Tool | When |
|---|---|---|
| Chat, presence and trades across **several server processes** | Redis pub/sub | When one Node process is not enough (well beyond ~100–200 concurrent players for this game) |
| Background jobs: daily resets, mail, leaderboards, reward payouts | Redis + BullMQ, or a simple `jobs` table polled by the server | When those features exist |
| Feeding analytics or anti-cheat from game events | An **outbox table** written in the same transaction as the ledger, forwarded to RabbitMQ/Kafka by a worker | Only if such a pipeline is ever built |

## Sources

- [Does Genshin Impact auto-save? (Sportskeeda)](https://www.sportskeeda.com/esports/does-genshin-impact-auto-save-progressing-saving-features-explained)
- [Server blackout (RuneScape Wiki)](https://runescape.wiki/w/Server_blackout) · [Dropped items (Old School RuneScape Wiki)](https://oldschool.runescape.wiki/w/Dropped_items)
- [Hearthstone China rollback after a power outage (GosuGamers)](https://www.gosugamers.net/hearthstone/news/42983-hearthstone-china-servers-to-be-rolled-back-to-january-14-due-to-a-power-outage)
- [SQLite: PRAGMA synchronous](https://www.sqlite.org/pragma.html#pragma_synchronous) · [SQLite: Write-Ahead Logging](https://www.sqlite.org/wal.html)
- [Litestream](https://litestream.io/)
