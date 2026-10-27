# Multiplayer and data safety

This document covers what multiplayer does today (stage 1), how other online games keep player data, whether our save mechanism is enough, and the design that makes item loss practically impossible in stage 2. Read [ARCHITECTURE.md](ARCHITECTURE.md) first for the overall picture.

---

## 1. Stage 1: presence and chat (done)

Players on the same map see each other move, see each other's gear, and can chat. Monsters, loot and saves are still per client ("parallel worlds"); bots still fill empty maps.

| Piece | File |
|---|---|
| WebSocket server (`ws`) at `/ws`, on the same HTTP server | `server/src/realtime.js` |
| Client connection, reconnect with backoff | `client/src/net/realtime.js` |
| Other players: buffered snapshots, drawn 120 ms in the past (interpolation) | `RemotePlayer` in `client/src/game/entities.js` |
| Tuning (send rate, limits, timeouts) | `GAME.net` in `client/src/config.js` |
| Acceptance scenario (two browsers) | `tests/e2e/multiplayer.test.mjs` |

Only the Node server backend (ApiStorage) connects; the artifact and file:// builds stay single-player.

### Protocol

JSON text frames, `t` is the message type.

| Direction | Message | Meaning |
|---|---|---|
| C → S | `hello {token, char}` | First message. The server checks the token (same HMAC token as REST) and that the character belongs to that account. |
| C → S | `pos {map, x, y, vx, f, a, enter?}` | Our state, 10×/s and only when it changed. `enter: 1` after loading a map: the client cleared its player list and needs a fresh `snap`. |
| C → S | `chat {ch: 'map'\|'world', text}` | Chat. In the chat box a leading `!` means world channel. |
| C → S | `saved {}` | We just saved. The server re-reads gear/level/title **from the database** and tells the map. |
| S → C | `welcome {id, online}` · `online {n}` | Connected; player count. |
| S → C | `snap {map, players}` · `join {p}` · `leave {id}` | Who is on our map. |
| S → C | `st {s: [[id, x, y, vx, f, a], …]}` | Batched movement, one message per map per tick (10 Hz). |
| S → C | `look {id, cls, lv, title, look}` | Someone's appearance changed. |
| S → C | `chat {ch, id, from, text}` · `kicked {reason}` · `error {msg}` | |

### Safety rules already in place

- Auth at connect; bad token or someone else's character → close code 4003.
- One connection per character: the newest wins, the old one gets `kicked` and close code 4000 (it does not reconnect, so two tabs do not fight).
- Position messages are rate-limited (20/s) and clamped to the map; the map id must exist; the animation name must be known. Map entries (`enter`, which answer with a full snapshot) have their own limit (4/s): extra ones are merged into one, applied when the window opens.
- Chat: token bucket (burst 5, one token per 1.5 s), control characters stripped, 80 characters max. The client escapes HTML when drawing.
- Appearance always comes from the saved character, never from the message, so nobody can show gear they do not own.
- `maxPayload` 4 KB, a 5 s hello timeout, ping every 25 s to drop dead connections.

## 2. How other games keep player data

Public technical write-ups exist for few games; the pattern below is consistent across what is documented.

| Game | What is known | Lesson |
|---|---|---|
| **Genshin Impact** | No save button. Progress is saved on the server as you play; closing the game does not undo spending or pulls. | The server is the only source of truth. The client never "uploads a save". |
| **RuneScape** | Servers save characters periodically; after a crash ("server blackout") players lose the progress since the last save, typically 15–60 minutes. | Periodic snapshots lose data by design. Valuable events must not wait for the next snapshot. |
| **Hearthstone (China, 2017)** | A power outage plus a failed backup forced a rollback of several days. | A database without tested backups is the real single point of failure. |
| **Võ Lâm Truyền Kỳ, Ghost Online, MapleStory** (classic Korean/Chinese MMOs) | No official technical documentation. Their well-known history shows the same model: game server holds state in memory, a database server persists it, and "rollback" and "item duplication" (dupe) incidents come from the gap between the two or from trusting the client. | Write item changes in one transaction and never trust client-reported items. |

Common to all of them: **the server decides** what you got and **commits it** before telling you; the client only shows it.

## 3. Is our current mechanism enough?

**For single-player: yes.** Saves go to a local outbox first (survives Alt+F4, a crash or a lost connection), upload in the background with retries, rare drops save immediately, and on the next login the newest copy wins. Loss only happens if the browser storage itself is wiped before the upload succeeds.

**For a real multiplayer world: no.** Not because of the network, but because of trust:

1. **The client is authoritative.** The browser decides that a monster dropped an item and sends the whole character. Anyone can edit their save in the console and upload a legendary weapon. `sanitizeCharacter` blocks impossible values, not invented items.
2. **Whole-character overwrite.** A save replaces the character. Two tabs, or an old outbox copy, can overwrite newer progress (`playTime` ordering helps, but it is a heuristic).
3. **No history.** If an item disappears we cannot tell when or why, or give it back.

Once players trade or share loot, these become duplication exploits and support tickets. So stage 2 changes *who decides*, not just how saving is transported.

## 4. Design for "items never get lost" (stage 2)

Goal: once the game tells a player "you got X", X exists in the database, even if the network drops, the tab closes, or the server crashes a millisecond later.

### 4.1 The server decides

- Monsters, damage, drops, EXP and quest progress run in a server module (per-map tick, 10–20 Hz). Clients send **intents** (`attack`, `cast {skill, facing}`, `pickup {dropId}`), not results.
- Drops exist on the server with an owner and an expiry. A pickup is valid only if the drop exists, the player is close enough and has a free slot.

### 4.2 Commit before acknowledging

Every item or currency change is one SQLite transaction:

```text
BEGIN
  UPDATE inventory ...            -- the new state
  INSERT INTO item_ledger (...)   -- what happened, why, request id
COMMIT
-> only now send "you picked up X" to the client
```

- `synchronous = FULL` (already set): a committed transaction survives a power cut, not only a crash.
- **Write-through** for anything valuable: items, gold, equipment, trades, quest rewards.
- **Write-behind** (batched every few seconds and on logout) for cheap, frequently changing state: position, HP/MP, EXP between levels. Losing 5 seconds of walking is fine; losing an item is not.

### 4.3 Item ledger

```sql
CREATE TABLE item_ledger (
  id INTEGER PRIMARY KEY,
  at INTEGER NOT NULL,            -- ms timestamp
  char_id TEXT NOT NULL,
  item_uid TEXT NOT NULL,
  item_id TEXT NOT NULL,
  delta INTEGER NOT NULL,         -- +qty gained, -qty lost
  reason TEXT NOT NULL,           -- drop, buy, sell, forge, trade, quest, gm
  ref TEXT,                       -- monster/drop id, trade id, recipe id
  req_id TEXT UNIQUE              -- idempotency key from the client
);
```

It answers "where did my item go?", lets support restore an item, and makes duplication visible (the same `item_uid` gained twice).

### 4.4 Idempotent requests

Each intent that changes items carries a client-generated `req` id. If the connection drops after the server committed but before the reply arrived, the client resends after reconnecting; the `UNIQUE req_id` makes the second attempt a no-op that returns the original result. No double pickups, no lost pickups.

### 4.5 Disconnects

- The character stays in the world for a short **grace period** (e.g. 10 s) after the socket closes, then the server saves and removes it. A quick reconnect resumes without a reload.
- Drops a player was about to pick up stay on the ground for their owner until they expire.
- Logout and server shutdown flush write-behind state (the server already closes sockets and the database on SIGTERM).

### 4.6 Backups (the real last line of defence)

- Nightly `VACUUM INTO` snapshot, kept for 14 days, **tested by restoring it** now and then.
- Optional: [Litestream](https://litestream.io/) streams the SQLite WAL to S3-compatible storage continuously, so even losing the disk loses only seconds.

### 4.7 What happens to the local outbox

It stays for settings and the offline/artifact builds. In stage 2 the online client no longer uploads characters; the server is the only writer.

## 5. Message queue, RabbitMQ: do we need it?

**Not for saving data.** The guarantee "the item exists" comes from the **database commit before the ack**. A queue in front of the database does not add safety; it adds a place where the item can exist *only* in the queue, plus another service to run and monitor. If RabbitMQ accepts a message and the consumer crashes, you are back to retries and duplicates, which the transaction + idempotency key above already solve directly.

Where a broker does help, and when to add it:

| Need | Tool | When |
|---|---|---|
| Chat and presence across **several server processes** | Redis pub/sub | When one Node process is not enough (well beyond ~100–200 concurrent players for this game) |
| Background jobs: daily resets, mail, leaderboards, reward payouts | Redis + BullMQ, or a simple `jobs` table polled by the server | When those features exist |
| Feeding analytics or anti-cheat from game events | An **outbox table** (written in the same transaction as the ledger) that a worker forwards to RabbitMQ/Kafka | Only if such a pipeline is ever built |

The outbox-table pattern means a broker can be added later without touching the save path: game code writes the event in the same transaction, a separate worker publishes it.

## 6. Roadmap

| Step | What | Status |
|---|---|---|
| 1 | Presence, movement sync, map/world chat, appearance from DB | Done |
| 2a | `item_ledger` table; log every item change from the current saves (diff old vs new) | Next: gives history and dupe detection even before the server is authoritative |
| 2b | Server-side drops and pickups with idempotent `req` ids; client stops sending items in saves | |
| 2c | Server-side monsters, damage and EXP per map (shared world); bots only where no real players are | |
| 2d | Write-behind for position/HP/EXP; grace period on disconnect; nightly backups (+ Litestream) | |
| 3 | Party, trade (one transaction for both sides), friends, guilds, PvP | |

## Sources

- [Does Genshin Impact auto-save? (Sportskeeda)](https://www.sportskeeda.com/esports/does-genshin-impact-auto-save-progressing-saving-features-explained)
- [Server blackout (RuneScape Wiki)](https://runescape.wiki/w/Server_blackout)
- [Hearthstone China rollback after a power outage (GosuGamers)](https://www.gosugamers.net/hearthstone/news/42983-hearthstone-china-servers-to-be-rolled-back-to-january-14-due-to-a-power-outage)
- [SQLite: PRAGMA synchronous](https://www.sqlite.org/pragma.html#pragma_synchronous) · [SQLite: Write-Ahead Logging](https://www.sqlite.org/wal.html)
- [Litestream](https://litestream.io/)
