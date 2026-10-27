// Realtime layer (multiplayer stage 1): presence and chat over WebSocket.
// Players on the same map see each other move and can chat. The game simulation (monsters, loot, saves)
// is still per client in this stage; see docs/MULTIPLAYER.md for the plan.
//
// Protocol: JSON text frames, `t` = message type.
//   client -> server  hello {token, char} · pos {map,x,y,vx,f,a} · chat {ch:'map'|'world', text} · saved {}
//   server -> client  welcome {id, online} · snap {map, players} · join {p} · leave {id} · st {s:[[id,x,y,vx,f,a]…]}
//                     look {id, look, lv, title} · chat {ch, id, from, text} · online {n} · kicked {reason} · error {msg}
import { WebSocketServer } from 'ws';
import { verifyToken } from './auth.js';
import { MAPS } from '../../client/src/data/maps.js';
import { ITEMS } from '../../client/src/data/items.js';
import { GAME } from '../../client/src/config.js';

const NET = GAME.net;
const ANIMS = new Set(['idle', 'walk', 'run', 'jump', 'atk', 'hurt', 'sit']);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);

// What other players need to draw someone: class, level, title and the ids of visible gear (from the saved character)
function appearanceOf(ch) {
  const look = {};
  for (const slot of ['weapon', 'hat', 'armor', 'outfit']) {
    const id = ch.equip?.[slot]?.id;
    if (id && ITEMS[id]) look[slot] = id;
  }
  return { cls: ch.cls, lv: ch.level, title: ch.title || null, look };
}

// Chat text: trimmed, single line, no control characters, length-capped. HTML escaping happens on the client.
function cleanText(s) {
  return String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, NET.chatMaxLen);
}

export function attachRealtime(server, { db, secret }) {
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: NET.maxPayload });
  const players = new Map(); // charId -> session
  const pub = (s) => ({ id: s.id, name: s.name, ...s.app, x: s.x, y: s.y, vx: s.vx, f: s.f, a: s.a });
  const send = (s, msg) => { if (s.ws.readyState === 1) s.ws.send(JSON.stringify(msg)); };
  const inMap = (map, except) => [...players.values()].filter((o) => o.map === map && o !== except);
  const toMap = (map, msg, except) => { const data = JSON.stringify(msg); for (const o of inMap(map, except)) if (o.ws.readyState === 1) o.ws.send(data); };
  const toAll = (msg) => { const data = JSON.stringify(msg); for (const o of players.values()) if (o.ws.readyState === 1) o.ws.send(data); };
  const broadcastOnline = () => toAll({ t: 'online', n: players.size });

  function enterMap(s, map) {
    const same = s.map === map; // re-entering the same map: only the client itself needs the snapshot
    if (s.map && !same) toMap(s.map, { t: 'leave', id: s.id }, s);
    s.map = map;
    send(s, { t: 'snap', map, players: inMap(map, s).map(pub) });
    if (same) s.dirty = true; else toMap(map, { t: 'join', p: pub(s) }, s);
  }

  // Apply a position update that passed its rate limit
  function applyPos(s, m) {
    const map = String(m.map || '');
    if (!MAPS[map]) return;
    s.x = clamp(num(m.x), 0, MAPS[map].width); s.y = clamp(num(m.y), -200, 400);
    s.vx = clamp(num(m.vx), -1000, 1000); s.f = m.f < 0 ? -1 : 1; s.a = ANIMS.has(m.a) ? m.a : 'idle';
    // `enter`: the client (re)loaded the map and cleared its player list, so it needs a fresh snapshot
    if (map !== s.map || m.enter) enterMap(s, map); else s.dirty = true;
  }

  function leave(s) {
    if (players.get(s.id) !== s) return;
    players.delete(s.id);
    if (s.map) toMap(s.map, { t: 'leave', id: s.id }, s);
    broadcastOnline();
  }

  wss.on('connection', (ws) => {
    let s = null;
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    const helloTimer = setTimeout(() => { if (!s) ws.close(4001, 'hello timeout'); }, NET.helloTimeoutMs);

    ws.on('message', (raw, isBinary) => {
      if (isBinary) return;
      let m;
      try { m = JSON.parse(raw.toString()); } catch { return; }
      if (!m || typeof m !== 'object') return;

      if (!s) {
        if (m.t !== 'hello') return;
        let user = null, ch = null;
        try {
          user = verifyToken(secret, String(m.token || ''));
          ch = user && db.listCharacters(user.uid).find((c) => c.id === String(m.char || ''));
        } catch { ch = null; } // malformed hello: treat as a failed login, never let it escape the handler
        if (!ch) { ws.send(JSON.stringify({ t: 'error', msg: 'auth' })); ws.close(4003, 'auth'); return; }
        clearTimeout(helloTimer);
        // one connection per character: the newest wins (e.g. a refreshed tab)
        const old = players.get(ch.id);
        if (old) { send(old, { t: 'kicked', reason: 'elsewhere' }); old.ws.close(4000, 'elsewhere'); leave(old); }
        s = { ws, id: ch.id, uid: user.uid, name: ch.name, app: appearanceOf(ch), map: null, x: 0, y: 0, vx: 0, f: 1, a: 'idle',
          dirty: false, posAt: 0, enterAt: 0, enterTimer: null, pendingEnter: null, chatTokens: NET.chatBurst, chatAt: Date.now() };
        players.set(s.id, s);
        send(s, { t: 'welcome', id: s.id, online: players.size });
        broadcastOnline();
        return;
      }

      if (m.t === 'pos') {
        // Rate limits: plain moves at NET.maxPosPerSec; map entries (each sends a snapshot) at the looser
        // NET.maxEnterPerSec. An entry that comes too soon is not dropped (the client would never get its
        // snapshot): the newest one is kept and applied when its window opens.
        const now = Date.now();
        if (m.enter) {
          const wait = s.enterAt + 1000 / NET.maxEnterPerSec - now;
          if (wait > 0) {
            s.pendingEnter = m;
            if (!s.enterTimer) s.enterTimer = setTimeout(() => {
              s.enterTimer = null;
              const p = s.pendingEnter; s.pendingEnter = null;
              if (p && players.get(s.id) === s) { s.enterAt = Date.now(); applyPos(s, p); }
            }, wait);
            return;
          }
          s.enterAt = now;
        } else {
          if (now - s.posAt < 1000 / NET.maxPosPerSec) return;
          s.posAt = now;
        }
        applyPos(s, m);
      } else if (m.t === 'chat') {
        const now = Date.now();
        s.chatTokens = Math.min(NET.chatBurst, s.chatTokens + (now - s.chatAt) / NET.chatRefillMs); s.chatAt = now;
        if (s.chatTokens < 1) { send(s, { t: 'error', msg: 'chat_rate' }); return; }
        const text = cleanText(m.text);
        if (!text) return;
        s.chatTokens -= 1;
        const msg = { t: 'chat', ch: m.ch === 'world' ? 'world' : 'map', id: s.id, from: s.name, text };
        // the sender already shows its own line locally
        if (msg.ch === 'world') { const data = JSON.stringify(msg); for (const o of players.values()) if (o !== s && o.ws.readyState === 1) o.ws.send(data); }
        else if (s.map) toMap(s.map, msg, s);
      } else if (m.t === 'saved') {
        // the client saved: refresh what others see (gear, level, title) from the database, not from the message
        const ch = db.listCharacters(s.uid).find((c) => c.id === s.id);
        if (!ch) return;
        const app = appearanceOf(ch);
        if (JSON.stringify(app) !== JSON.stringify(s.app)) { s.app = app; if (s.map) toMap(s.map, { t: 'look', id: s.id, ...app }, s); }
      }
    });

    ws.on('close', () => { clearTimeout(helloTimer); if (s) { clearTimeout(s.enterTimer); leave(s); } });
    ws.on('error', () => {});
  });

  // State broadcast: one batched message per map, only for players that moved
  const tick = setInterval(() => {
    const byMap = new Map();
    for (const s of players.values()) {
      if (!s.dirty || !s.map) continue;
      s.dirty = false;
      if (!byMap.has(s.map)) byMap.set(s.map, []);
      byMap.get(s.map).push([s.id, Math.round(s.x), Math.round(s.y), Math.round(s.vx), s.f, s.a]);
    }
    for (const [map, list] of byMap) {
      for (const o of inMap(map)) {
        const s2 = list.filter((e) => e[0] !== o.id);
        if (s2.length) send(o, { t: 'st', s: s2 });
      }
    }
  }, 1000 / NET.tickHz);

  // Heartbeat: drop connections that stopped answering pings
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) { ws.terminate(); continue; }
      ws.isAlive = false;
      ws.ping();
    }
  }, NET.pingMs);

  return {
    online: () => players.size,
    close() { clearInterval(tick); clearInterval(heartbeat); for (const ws of wss.clients) ws.close(1001, 'server shutdown'); wss.close(); },
  };
}
