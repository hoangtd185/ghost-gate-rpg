// Realtime connection: our position, other players and chat (stage 1); kill reports, server drops, pickups,
// item changes and trades (stage 2). Only used with the Node server backend (ApiStorage).
// Reconnects automatically with backoff; on reconnect the server replays item changes we missed.
import { GAME } from '../config.js';
import { RemotePlayer } from '../game/entities.js';

const NET = GAME.net;

export class Realtime {
  // storage: ApiStorage (token) · hooks: { chat(name, text, type), online(n), toast(msg, kind) }
  constructor(storage, hooks) {
    this.s = storage; this.hooks = hooks;
    this.world = null; this.ws = null; this.connected = false; this.closed = false;
    this.retry = 0; this.retryT = null; this.sendT = 0; this.last = ''; this.enter = true;
    this.online = 0;
    this.ready = false; // the server knows which map we are on (kills can be reported)
    this.killQueue = []; this.killSeq = 0;
  }

  get url() { return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`; }

  attach(world) {
    this.world = world; this.closed = false;
    world.net = this;
    world.newSim(); // online: the server runs the shared monsters
    this.connect();
  }

  connect() {
    if (this.closed || !this.world || !this.s.token) return;
    let ws;
    try { ws = new WebSocket(this.url); } catch { return this.scheduleReconnect(); }
    this.ws = ws;
    ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', token: this.s.token, char: this.world.ch.id, rev: this.world.ch.itemRev || 0 }));
    ws.onmessage = (e) => { try { this.handle(JSON.parse(e.data)); } catch { /* ignore bad frames */ } };
    ws.onclose = (e) => {
      this.connected = false; this.ready = false; this.ws = null;
      if (this.world) { this.world.remotes.clear(); this.world.netLost(); this.world.clearRemoteMobs(); }
      if (e.code === 4000 || e.code === 4003) { this.closed = true; return; } // played elsewhere / bad auth: do not fight over the session
      this.scheduleReconnect();
    };
    ws.onerror = () => {};
  }

  scheduleReconnect() {
    if (this.closed) return;
    clearTimeout(this.retryT);
    const wait = NET.reconnectMs[Math.min(this.retry++, NET.reconnectMs.length - 1)];
    this.retryT = setTimeout(() => this.connect(), wait);
  }

  disconnect() {
    this.closed = true; clearTimeout(this.retryT);
    if (this.ws) this.ws.close(1000, 'bye');
    if (this.world) { this.world.remotes.clear(); this.world.net = null; }
    this.world = null;
  }

  send(msg) { if (this.connected && this.ws?.readyState === 1) this.ws.send(JSON.stringify(msg)); }

  // Called every frame by the world: send our state at NET.sendHz, only when it changed
  tick(dt) {
    if (!this.connected) return;
    this.sendT -= dt;
    if (this.sendT > 0) return;
    this.sendT = 1 / NET.sendHz;
    const w = this.world, p = w.player;
    // g / sy / d: on the ground, the floor we stand on, dead (the server's monsters use them to chase us)
    // h: HP % (the server's damage formula has a low-HP passive)
    const msg = { t: 'pos', map: w.mapId, x: Math.round(p.x), y: Math.round(p.y), vx: Math.round(p.vx), f: p.facing, a: p.anim, g: p.onGround ? 1 : 0, sy: Math.round(p.standY), d: p.dead ? 1 : 0, h: Math.round((w.ch.hp / Math.max(1, w.stats.maxHp)) * 100) };
    const key = JSON.stringify(msg);
    if (key === this.last && !this.enter) return;
    this.last = key;
    if (this.enter) { msg.enter = 1; this.enter = false; }
    this.send(msg);
  }

  // The world (re)loaded a map and cleared its remote players: the next update asks for a fresh snapshot
  entered() { this.enter = true; this.sendT = 0; this.ready = false; }

  chat(text, channel = 'map') { this.send({ t: 'chat', ch: channel, text }); }

  // A monster we killed: the server rolls its drops. Queued while disconnected (sent once the server knows our map).
  kill(info) {
    const msg = { t: 'kill', k: ++this.killSeq, map: this.world.mapId, ...info };
    if (this.ready) this.send(msg);
    else { this.killQueue.push(msg); if (this.killQueue.length > 40) this.killQueue.shift(); }
    return msg.k;
  }
  // Our skill hit a shared monster: { uid, sid }. The server computes the damage (game/combat.js).
  hit(h) { this.send({ t: 'hit', uid: h.uid, sid: h.sid }); }
  // We used a buff skill: the server's damage formula needs it too
  cast(sid) { this.send({ t: 'cast', sid }); }
  party(type, data = {}) { this.send({ t: 'party_' + type, ...data }); }
  // Pick up a server drop. Returns false if it could not be sent right now.
  pick(id) { if (!this.ready) return false; this.send({ t: 'pick', id }); return true; }
  // Trade
  trade(type, data = {}) { this.send({ t: 'trade_' + type, ...data }); }
  // After a successful save the server re-reads our gear/level/title so others see the change
  saved() { this.send({ t: 'saved' }); }

  handle(m) {
    const w = this.world;
    if (!w) return;
    const R = w.remotes;
    switch (m.t) {
      case 'welcome':
        this.connected = true; this.retry = 0; this.last = ''; this.sendT = 0; this.enter = true;
        this.setOnline(m.online);
        break;
      case 'online': this.setOnline(m.n); break;
      case 'snap':
        if (m.map !== w.mapId) break;
        R.clear();
        for (const p of m.players) R.set(p.id, new RemotePlayer(p));
        this.ready = true;
        // kills made while disconnected (same map only; the server ignores others)
        for (const k of this.killQueue.splice(0)) this.send(k);
        break;
      case 'chg': w.applyChanges(m.list, m.rev); break;
      case 'loot': w.serverLoot(m); break;
      case 'drops': if (m.map === w.mapId) w.serverDrops(m.drops); break;
      case 'pick': w.serverPick(m); break;
      case 'join': if (m.p.id !== w.ch.id) R.set(m.p.id, new RemotePlayer(m.p)); break;
      case 'leave': R.delete(m.id); break;
      case 'st': {
        const now = performance.now();
        for (const [id, x, y, vx, f, a] of m.s) R.get(id)?.push({ x, y, vx, f, a }, now);
        break;
      }
      case 'look': R.get(m.id)?.setAppearance(m); break;
      case 'chat': {
        this.hooks.chat(m.from, m.text, m.ch === 'world' ? 'world' : 'local');
        const r = R.get(m.id);
        if (r && m.ch !== 'world') r.say = { text: m.text, t: 4 };
        break;
      }
      // shared monsters
      case 'mobs': if (m.map === w.mapId) w.serverMobs(m.list); break;
      case 'mspawn': w.mobSpawn(m.m); break;
      case 'ms': w.mobSnap(m.s); break;
      case 'mev': for (const e of m.list) w.mobEvent(e); break;
      case 'mhit': w.mobHit(m); break;
      case 'mdie': w.mobDie(m); break;
      case 'mkill': w.onServerKill(m); break;
      case 'party_ask': case 'party_state': case 'party_err':
        if (this.hooks.party) this.hooks.party(m);
        break;
      case 'trade_ask': case 'trade_open': case 'trade_state': case 'trade_end': case 'trade_err':
        if (this.hooks.trade) this.hooks.trade(m);
        break;
      case 'kicked': this.hooks.toast('Nhân vật này vừa được mở ở nơi khác', 'warn'); break;
      case 'error': if (m.msg === 'chat_rate') this.hooks.toast('Chat chậm lại một chút nhé', 'warn'); break;
    }
  }

  setOnline(n) { this.online = n; this.hooks.online(n); }
}
