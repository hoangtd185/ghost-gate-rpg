// Monster simulation shared by the browser (offline play, personal story bosses) and the server (shared monsters
// online). No drawing and no DOM: everything visible leaves as an event that the host turns into effects, chat,
// projectiles or damage (see GameWorld.mobEvent on the client and server/src/mobs.js on the server).
//
// Players are plain objects the host passes in every update:
//   { id, x, y, w, h, cx, cy, vx, facing, standY, onGround, dead }
// A monster's `aggro` is the id of the player it chases.
import { MAPS, GROUND_Y } from '../data/maps.js';
import { MONSTERS, BOSS_RESPAWN } from '../data/monsters.js';
import { NAMED, ELITE_POOL, CHIEF, smartTier, eliteChance } from '../data/affixes.js';
import { GAME } from '../config.js';
import { clamp, rand, randInt, chance, pick } from '../engine/util.js';
import { platformAt } from './physics.js';
import { ELITE_DROPS } from './loot.js';

// ===== One monster's state =====
// Each monster has its own level (varies around the species' base level); stats scale with level.
// opt: { named, elite, chief, lvBonus, affix (fixed list, e.g. from the server), uid }
export class MobState {
  constructor(id, x, standY, range, spawnRef, opt = {}) {
    const base = MONSTERS[id];
    const named = opt.named ? NAMED[opt.named] : null;
    const chief = !named && !base.boss && !!opt.chief;
    const elite = !named && !base.boss && !chief && (opt.elite ?? Math.random() < eliteChance(base.lv));
    const LB = GAME.monsters.levelBonus, PL = GAME.monsters.perLevel, EL = GAME.monsters.elite;
    const bonus = named || base.boss ? 0 : (opt.lvBonus ?? randInt(0, base.lv >= 13 ? LB.maxFromLv13 : LB.max));
    const lv = named ? named.lv : base.lv + bonus;
    const k = lv - base.lv;
    let hp = base.hp * (1 + PL.hp * k), atk = base.atk * (1 + PL.atk * k), df = base.def * (1 + PL.def * k), exp = base.exp * (1 + PL.exp * k);
    let gold = base.gold.map((g) => Math.round(g * (1 + PL.gold * k)));
    let affix = [...(base.affix || [])], drops = base.drops, name = base.name, scale = 1;
    if (elite) {
      hp *= EL.hp; atk *= EL.atk; df *= EL.def; exp *= EL.exp; gold = gold.map((g) => g * EL.gold); scale = EL.scale;
      const pool = ELITE_POOL.filter((a) => !affix.includes(a));
      const n = lv >= 13 ? EL.affixesFromLv13 : EL.affixes;
      for (let i = 0; i < n && pool.length; i++) affix.push(pool.splice(randInt(0, pool.length - 1), 1)[0]);
      drops = [...drops, ...ELITE_DROPS];
    }
    if (chief) {
      hp *= CHIEF.hp; atk *= CHIEF.atk; df *= CHIEF.def; exp *= CHIEF.exp; gold = gold.map((g) => g * CHIEF.gold); scale = CHIEF.scale;
      drops = [...drops, ...CHIEF.drops]; name = 'Đầu Lĩnh ' + base.name;
    }
    if (named) {
      hp *= named.hp; atk *= named.atk; df *= 1.3; exp *= named.hp * 0.7; gold = gold.map((g) => g * 10);
      affix = [...named.affix]; drops = named.drops; name = named.name; scale = named.scale;
    }
    if (Array.isArray(opt.affix)) affix = opt.affix.filter((a) => typeof a === 'string');
    this.id = id; this.uid = opt.uid || 0; this.lvBonus = bonus;
    this.def = { ...base, lv, name, drops, affix, hp: Math.round(hp), atk: Math.round(atk), def: Math.round(df), exp: Math.round(exp), gold };
    this.elite = elite; this.chief = chief; this.named = opt.named || null; this.namedDef = named;
    this.scale = scale; this.tint = named ? named.tint : chief ? 'saturate(1.5) contrast(1.08) brightness(0.96)' : elite ? 'saturate(1.35) brightness(1.08)' : null;
    this.affix = new Set(affix);
    this.tier = smartTier(lv);
    this.w = Math.round(base.w * scale); this.h = Math.round(base.h * scale);
    this.x = x; this.y = standY - this.h; this.standY = standY;
    this.vx = 0; this.vy = 0; this.onGround = true; this.dropTimer = 0;
    this.range = range; // [minX, maxX] patrol range
    this.homeX = x; this.homeY = this.y;
    this.maxHp = this.def.hp; this.hp = this.def.hp;
    this.maxShield = this.affix.has('shield') ? Math.round(this.maxHp * 0.25) : 0; this.shield = this.maxShield; this.shieldT = 0;
    this.facing = Math.random() < 0.5 ? -1 : 1;
    this.animT = Math.random() * 3;
    this.hurtT = 0; this.aggro = null; this.aggroT = 0;
    this.thinkT = rand(0.5, 2); this.atkCd = rand(1, 3);
    this.dead = false; this.hitByPlayer = false;
    this.spawnRef = spawnRef;
    this.floaty = base.behavior === 'float';
    this.phase = 0; this.actT = 0; this.alpha = 0; // fade in when spawning
    this.poison = 0; this.poisonT = 0; this.poisonDmg = 0; this.poisonBy = null;
    this.lastHitT = 0; this.blinkT = rand(3, 6); this.chargeT = rand(3, 5); this.dodgeT = 0;
    this.dmgBy = new Map(); // player id -> damage dealt (EXP and loot shares)
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get enraged() { return this.affix.has('enrage') && this.hp < this.maxHp * 0.35; }
  // What a client needs to build the same monster (server -> client)
  spawnInfo() {
    return { uid: this.uid, mob: this.id, lvBonus: this.lvBonus, elite: this.elite, chief: this.chief, named: this.named, affix: [...this.affix],
      x: Math.round(this.x), y: Math.round(this.y), standY: this.standY, range: this.range, hp: Math.round(this.hp), shield: Math.round(this.shield) };
  }
}

// flying monsters dodge up if there is room, otherwise down
const mobRoomAbove = (m) => m.y > 90;

// ===== The monsters of one map =====
// opts: { make(id, x, standY, range, group, opt) -> monster (default MobState), spawn: spawn the map's groups (default true),
//         fieldBosses: run field-boss timers (default true), poisonTick(m): host-side poison damage (default: absolute) }
export class MobSim {
  constructor(mapId, opts = {}) {
    this.mapId = mapId; this.map = MAPS[mapId];
    this.make = opts.make || ((...a) => new MobState(...a));
    this.poisonTick = opts.poisonTick || ((m) => this.damage(m, m.poisonDmg, m.poisonBy, { poison: true }));
    this.fieldBosses = opts.fieldBosses !== false;
    this.time = 0; this.nextUid = 1;
    this.monsters = []; this.timers = []; this.events = [];
    this.namedT = opts.namedT || {};
    this.groups = this.map.spawns.map((s) => ({ ...s, alive: 0 }));
    if (opts.spawn !== false) for (const g of this.groups) for (let i = 0; i < g.count; i++) this.spawnGroup(g, 0.05 * i);
  }

  emit(type, data) { this.events.push({ type, ...data }); }
  drain() { const e = this.events; this.events = []; return e; }
  after(t, fn) { this.timers.push({ t, fn }); }
  add(m) { if (!m.uid) m.uid = this.nextUid++; this.monsters.push(m); this.emit('spawn', { m }); return m; }

  // A regular spawn (now and then a chieftain), at a random spot of its group's patrol range
  spawnGroup(g, delay = 0) {
    g.alive++;
    const make = () => {
      if (!this.groups.includes(g)) return; // the host replaced the groups (tests)
      const def = MONSTERS[g.mob];
      let x1 = g.x1, x2 = g.x2;
      const plat = platformAt(this.map.platforms, (g.x1 + g.x2) / 2, g.y);
      if (plat) { x1 = Math.max(x1, plat.x + 2); x2 = Math.min(x2, plat.x + plat.w - def.w - 2); }
      else x2 -= def.w;
      const x = rand(x1, Math.max(x1, x2));
      const chief = !def.boss && !this.monsters.some((o) => o.chief && !o.dead) && Math.random() < CHIEF.chance;
      const m = this.make(g.mob, x, g.y, [x1, Math.max(x1, x2)], g, { chief });
      if (def.behavior === 'float') { m.y = g.y - m.h - rand(4, 20); m.homeY = m.y; }
      m.x = clamp(m.x, x1, Math.max(x1, x2 + def.w - m.w));
      this.add(m);
      if (m.chief) this.emit('announce', { chat: `♛ ${m.def.name} (Lv.${m.def.lv}) đang lảng vảng ở ${this.map.name}!`, toast: `♛ <b>${m.def.name}</b> xuất hiện!` });
    };
    if (delay <= 0) make(); else this.after(delay, make);
  }

  // Story bosses (the host decides when: quest active) and field bosses (on a timer, see updateNamed)
  spawnNamed(id) {
    const n = NAMED[id], base = MONSTERS[n.mob];
    const x = clamp(n.x, 60, this.map.width - 100);
    const m = this.make(n.mob, x, GROUND_Y, [Math.max(30, x - 320), Math.min(this.map.width - 80, x + 320)], null, { named: id });
    if (base.behavior === 'float') { m.y = GROUND_Y - m.h - 60; m.homeY = m.y; }
    this.add(m);
    this.emit('fx', { kind: 'poof', x: m.cx, y: m.cy, dur: 0.8, data: { color: '#ff6a5a', big: true }, shake: 0.5 });
    if (n.lines && n.lines.appear) this.emit('chat', { name: n.name, text: n.lines.appear, kind: 'boss' });
    if (n.every) this.emit('announce', { chat: `${n.name} (Lv.${n.lv}) đã xuất hiện ở ${this.map.name}!`, toast: `⚠ <b>${n.name}</b> đã xuất hiện!` });
    return m;
  }

  updateNamed(dt) {
    if (!this.fieldBosses) return;
    for (const [id, n] of Object.entries(NAMED)) {
      if (n.map !== this.mapId || !n.every) continue;
      if (this.namedT[id] === undefined) this.namedT[id] = rand(45, 120); // first visit to the map
      if (this.monsters.some((m) => m.named === id && !m.dead)) continue;
      this.namedT[id] -= dt;
      if (this.namedT[id] <= 0) { this.namedT[id] = rand(n.every[0], n.every[1]); this.spawnNamed(id); }
    }
  }

  // threats: player projectiles that smart monsters dodge ({ x, y, vx, owner, pierce }), optional
  update(dt, players, threats = []) {
    this.time += dt;
    for (const tm of this.timers) tm.t -= dt;
    const due = this.timers.filter((t) => t.t <= 0);
    this.timers = this.timers.filter((t) => t.t > 0);
    due.forEach((t) => t.fn());
    for (const m of this.monsters) if (!m.remote) this.updateMonster(m, dt, players, threats);
    this.monsters = this.monsters.filter((m) => !(m.dead && m.fadeT <= 0));
    this.updateNamed(dt);
  }

  // The player this monster is after (aggro), or the nearest living one
  targetOf(m, players) {
    if (m.aggro && typeof m.aggro === 'object') m.aggro = m.aggro.id ?? null; // a player object instead of its id
    if (m.aggro) {
      const p = players.find((x) => x.id === m.aggro && !x.dead);
      if (p) return p;
      m.aggro = null;
    }
    let best = null, bd = Infinity;
    for (const p of players) { if (p.dead) continue; const d = Math.abs(p.cx - m.cx); if (d < bd) { bd = d; best = p; } }
    return best;
  }

  text(m, text, color, dy = 8) { this.emit('text', { x: m.cx, y: m.y - dy, text, color, small: true }); }

  // ===== Damage (the host computes the number from the attacker's stats) =====
  // by: { id, player: true/false, cx } · opts: { show (small "Đỡ" text), poison }
  // Returns { dealt, absorbed, killed, broke } (broke: the shield just broke)
  damage(m, dmg, by, opts = {}) {
    const res = { dealt: 0, absorbed: 0, killed: false, broke: false };
    if (m.dead) return res;
    dmg = Math.max(1, Math.round(dmg));
    if (m.shield > 0) {
      const ab = Math.min(m.shield, dmg);
      m.shield -= ab; dmg -= ab; m.shieldT = 0; res.absorbed = ab;
      if (m.shield <= 0) { res.broke = true; this.emit('fx', { kind: 'ring', x: m.cx, y: m.cy, dur: 0.4, data: { color: '#ffd84a', r: m.w } }); this.text(m, 'Vỡ khiên!', '#ffd84a', 12); }
      else if (opts.show && (m.shTextT || 0) < this.time) { this.text(m, 'Đỡ', '#ffd84a', 12); m.shTextT = this.time + 0.5; }
      if (dmg <= 0) { m.hurtT = 0.08; return res; }
    }
    m.hp -= dmg; res.dealt = dmg;
    m.hurtT = 0.16;
    m.lastHitT = this.time;
    if (by && by.player) {
      m.dmgBy.set(by.id, (m.dmgBy.get(by.id) || 0) + dmg);
      const first = !m.aggro;
      m.hitByPlayer = true;
      if (!opts.poison || !m.aggro) { m.aggro = by.id; m.aggroT = 8; }
      // smart monsters call nearby allies
      if (first && m.tier >= 2) {
        for (const o of this.monsters) if (o !== m && !o.dead && !o.aggro && !o.def.boss && Math.abs(o.cx - m.cx) < 220) { o.aggro = by.id; o.aggroT = 8; this.text(o, '!', '#ffdd55', 10); }
      }
      if (!m.def.boss && m.def.behavior !== 'float' && by.cx !== undefined && !opts.poison) m.knock = (m.cx < by.cx ? -1 : 1) * 60;
    }
    if (m.hp <= 0) { this.kill(m, by); res.killed = true; }
    return res;
  }

  // Poison from a player's skill: ticks every 0.5 s for `dur` seconds
  poisonFor(m, dur, dmg, by) { m.poison = dur; m.poisonDmg = dmg; m.poisonBy = by; }

  kill(m, by) {
    if (m.dead) return;
    m.dead = true; m.fadeT = 0.4; m.hp = 0;
    // Self-destruct: red warning ring, then explodes
    if (m.affix.has('explode')) {
      const bx = m.cx, by2 = m.cy, r = 64 * Math.max(1, m.scale * 0.8), atk = m.def.atk * 1.8, el = m.def.el;
      this.emit('fx', { kind: 'danger', x: bx, y: by2, dur: 1, data: { r } });
      this.after(1, () => this.emit('explode', { x: bx, y: by2, r, atk, el }));
    }
    if (m.named) {
      const n = NAMED[m.named];
      if (n.lines && n.lines.die) this.emit('chat', { name: n.name, text: n.lines.die, kind: 'boss' });
    }
    const g = m.spawnRef;
    if (g) {
      g.alive--;
      const delay = m.def.boss ? BOSS_RESPAWN : rand(...GAME.monsters.respawnSec);
      this.after(delay, () => { if (this.groups.includes(g)) this.spawnGroup(g); });
    }
    this.emit('die', { m, by });
  }

  // ================= AI =================
  // By smartness tier (m.tier, see data/affixes.js) + traits (m.affix)
  updateMonster(m, dt, players, threats) {
    if (m.dead) { m.fadeT -= dt; return; }
    m.animT += dt;
    m.alpha = Math.min(1, m.alpha + dt * 2);
    if (m.hurtT > 0) m.hurtT -= dt;
    if (m.aggroT > 0) { m.aggroT -= dt; if (m.aggroT <= 0) m.aggro = null; }
    const p = this.targetOf(m, players);
    const d = m.def;
    const dist = p ? Math.abs(p.cx - m.cx) : Infinity;
    // poison
    if (m.poison > 0) {
      m.poison -= dt; m.poisonT -= dt;
      if (m.poisonT <= 0) { m.poisonT = 0.5; this.poisonTick(m); if (m.dead) return; }
    }
    // Guard regenerates its shield, Regen heals when not being hit
    if (m.maxShield && m.shield <= 0) { m.shieldT += dt; if (m.shieldT >= 10) { m.shield = m.maxShield; m.shieldT = 0; this.emit('fx', { kind: 'ring', x: m.cx, y: m.cy, dur: 0.5, data: { color: '#ffd84a', r: m.w * 0.8 } }); } }
    if (m.affix.has('regen') && this.time - m.lastHitT > 3 && m.hp < m.maxHp) m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.03 * dt);
    if (d.behavior === 'boss') return this.updateBoss(m, dt, dist, p, players);
    const sameFloor = !!p && Math.abs(p.standY - m.standY) < 12 && p.onGround;
    // charges on sight (tier 1+)
    if (!m.aggro && p && m.tier >= 1 && m.alpha >= 1) {
      const sight = 100 + m.tier * 35;
      const sees = d.behavior === 'float' ? dist < sight + 20 && Math.abs(p.cy - m.cy) < 110 : sameFloor && dist < sight;
      if (sees) { m.aggro = p.id; m.aggroT = 6; this.text(m, '!', '#ffdd55'); }
    }
    const chasing = !!m.aggro && !!p && p.id === m.aggro;
    const fast = (m.enraged ? 1.5 : 1) * (m.tier >= 3 ? 1.1 : 1);
    // backs off to recover at low HP (tier 3)
    if (m.tier >= 3 && !m.retreated && m.hp < m.maxHp * 0.25 && chasing && !m.named) { m.retreated = true; m.retreatT = 2; }
    if (m.retreatT > 0) { m.retreatT -= dt; m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.025 * dt); }
    // Blink: vanishes and reappears next to the player
    if (m.affix.has('blink') && chasing) {
      m.blinkT -= dt;
      if (m.blinkT <= 0 && dist > 50) {
        m.blinkT = rand(4, 7);
        const side = p.facing > 0 ? -1 : 1; // appear behind the player
        const nx = p.cx + side * 34 - m.w / 2;
        const ok = d.behavior === 'float' || (sameFloor && nx >= m.range[0] - 1 && nx <= m.range[1] + 1);
        if (ok) {
          this.emit('fx', { kind: 'poof', x: m.cx, y: m.cy, dur: 0.4, data: { color: '#9fe0ff' } });
          m.x = d.behavior === 'float' ? clamp(nx, 0, this.map.width - m.w) : clamp(nx, m.range[0], m.range[1]);
          if (d.behavior === 'float') m.y = clamp(p.y - 10, 40, GROUND_Y - m.h);
          this.emit('fx', { kind: 'poof', x: m.cx, y: m.cy, dur: 0.4, data: { color: '#9fe0ff' } });
          m.alpha = 0.4;
        }
      }
    }
    // dodge projectiles (tier 2+)
    m.dodgeT -= dt;
    if (m.tier >= 2 && m.dodgeT <= 0 && m.aggro) {
      const threat = threats.find((pr) => pr.owner === 'player' && !pr.pierce && Math.sign(m.cx - pr.x) === Math.sign(pr.vx) && Math.abs(m.cx - pr.x) < 70 && Math.abs(pr.y - m.cy) < m.h);
      if (threat) {
        m.dodgeT = m.tier >= 3 ? 1.8 : 2.6;
        if (chance(m.tier >= 3 ? 0.45 : 0.3)) {
          if (d.behavior === 'float') m.dodgeVy = (mobRoomAbove(m) ? -1 : 1) * 160;
          else if (!(m.jy > 0)) { m.jy = 0.01; m.jvy = 300; }
          this.text(m, 'né', '#cfe8ff');
        }
      }
    }
    if (d.behavior === 'float') {
      if (!m.aggro && d.ranged && p && dist < 170 && Math.abs(p.cy - m.cy) < 100) { m.aggro = p.id; m.aggroT = 6; }
      const aimed = !!m.aggro && !!p && p.id === m.aggro;
      let tx = m.homeX, ty = m.homeY;
      if (m.retreatT > 0 && p) { tx = m.cx < p.cx ? m.homeX - 120 : m.homeX + 120; ty = m.homeY - 20; }
      else if (aimed && Math.abs(m.homeX - p.cx) < 360 + m.tier * 40) {
        // ranged monsters keep their distance; smarter ones stay further away
        const keep = d.ranged ? (m.tier >= 1 ? 110 : 90) : 0;
        tx = p.cx - m.w / 2 + (d.ranged ? (m.cx < p.cx ? -keep : keep) : 0); ty = p.y - (d.ranged ? 30 : 4);
      } else {
        m.thinkT -= dt;
        if (m.thinkT <= 0) { m.thinkT = rand(2, 4); m.wanderX = clamp(m.homeX + rand(-70, 70), m.range[0], m.range[1] + 40); }
        tx = m.wanderX ?? m.homeX; ty = m.homeY + Math.sin(this.time + m.homeX) * 8;
      }
      const sp = d.speed * (m.aggro ? 1.6 : 1) * fast;
      const dx = tx - m.x, dy = ty - m.y;
      m.vx = clamp(dx * 2, -sp, sp);
      m.x = clamp(m.x + m.vx * dt, 0, this.map.width - m.w);
      let vy = clamp(dy * 2, -sp, sp);
      if (m.dodgeVy) { vy = m.dodgeVy; m.dodgeVy *= 0.85; if (Math.abs(m.dodgeVy) < 10) m.dodgeVy = 0; }
      m.y = clamp(m.y + vy * dt, 40, GROUND_Y - m.h);
      if (Math.abs(m.vx) > 2) m.facing = m.vx > 0 ? 1 : -1;
      if (d.ranged && aimed && !(m.retreatT > 0)) {
        m.atkCd -= dt;
        m.facing = p.cx > m.cx ? 1 : -1;
        if (m.atkCd <= 0 && dist < 240 + m.tier * 20) {
          m.atkCd = rand(2.2, 3) * (m.tier >= 3 ? 0.7 : 1) * (m.enraged ? 0.7 : 1);
          // tier 3 leads its shots in the direction the player is running
          const lead = m.tier >= 3 ? (dist / 160) * (p.vx || 0) * 0.8 : 0;
          const ang = Math.atan2(p.cy - m.cy, p.cx + lead - m.cx);
          const sp2 = 150 + m.tier * 12;
          this.emit('shoot', { kind: d.proj2 || (d.el === 'ice' ? 'waterbolt' : 'ember'), x: m.cx - 6, y: m.cy - 6, vx: Math.cos(ang) * sp2, vy: Math.sin(ang) * sp2, range: 300, atk: d.atk * (m.enraged ? 1.5 : 1), el: d.el || null, w: 10, h: 10, src: m.uid, m });
          m.attacking = true; this.after(0.3, () => { m.attacking = false; });
        }
      }
      return;
    }
    // walk / hop: move along its own platform
    if (m.knock) { m.x += m.knock * dt; m.knock *= 0.85; if (Math.abs(m.knock) < 3) m.knock = 0; }
    m.thinkT -= dt;
    let want = 0;
    if (m.retreatT > 0 && p) want = p.cx > m.cx ? -1 : 1;
    else if (chasing && Math.abs(p.standY - m.standY) < 70) {
      want = p.cx > m.cx + 6 ? 1 : p.cx < m.cx - 6 ? -1 : 0;
    } else {
      if (m.thinkT <= 0) { m.thinkT = rand(1.5, 4); m.walkDir = chance(0.35) ? 0 : chance(0.5) ? 1 : -1; }
      want = m.walkDir || 0;
    }
    // charge (tier 2+): pauses as a tell, then rushes in
    if (m.tier >= 2 && chasing && sameFloor && !(m.retreatT > 0)) {
      if (m.windup > 0) {
        m.windup -= dt; want = 0;
        if (m.windup <= 0) { m.charging = 0.45; m.chargeDir = p.cx > m.cx ? 1 : -1; }
      } else if (!(m.charging > 0)) {
        m.chargeT -= dt;
        if (m.chargeT <= 0 && dist > 50 && dist < 170) { m.chargeT = rand(3.5, 5.5) * (m.tier >= 3 ? 0.75 : 1); m.windup = 0.45; this.text(m, '!!', '#ff7a5a', 10); }
      }
    }
    if (m.charging > 0) {
      m.charging -= dt;
      m.vx = m.chargeDir * d.speed * 3.6;
    } else if (d.behavior === 'hop') {
      m.jy = m.jy || 0; m.jvy = m.jvy || 0;
      if (m.jy <= 0) {
        m.vx = 0;
        m.hopT = (m.hopT || 0) - dt;
        if (want && m.hopT <= 0) { m.jvy = 240; m.hopDir = want; m.hopT = m.aggro ? 0.35 / fast : 0.8; }
      }
      if (m.jvy > 0 || m.jy > 0) m.vx = (m.hopDir || 0) * d.speed * (m.aggro ? 1.3 : 0.8) * fast;
    } else {
      m.vx = m.windup > 0 ? 0 : want * d.speed * (m.aggro ? 1.5 : 1) * fast;
    }
    // jump (hopping, or jumping to dodge projectiles)
    if (m.jvy > 0 || m.jy > 0) {
      m.jy += m.jvy * dt; m.jvy -= 900 * dt;
      if (m.jy <= 0) { m.jy = 0; m.jvy = 0; }
    }
    m.y = m.standY - m.h - (m.jy || 0);
    if (m.vx) m.facing = m.vx > 0 ? 1 : -1;
    if (m.windup > 0 && p) m.facing = p.cx > m.cx ? 1 : -1;
    m.x = clamp(m.x + m.vx * dt, m.range[0], m.range[1]);
    if (m.x <= m.range[0] + 0.5 || m.x >= m.range[1] - 0.5) { m.walkDir = -(m.walkDir || 1); if (m.charging > 0) m.charging = 0; }
  }

  updateBoss(m, dt, dist, p) {
    const d = m.def;
    if (!m.aggro && p && dist < 340) { m.aggro = p.id; m.aggroT = 99; this.emit('chat', { name: d.name, text: d.lines.aggro, kind: 'boss' }); }
    if (m.aggro) m.aggroT = 99;
    m.jy = m.jy || 0;
    const rage = m.hp < m.maxHp * 0.5;
    if (rage && !m.raged && d.lines.rage) { m.raged = true; this.emit('chat', { name: d.name, text: d.lines.rage, kind: 'boss' }); this.emit('fx', { kind: 'ring', x: m.cx, y: m.cy, dur: 0.8, data: { color: '#ff3a4a', r: 60 }, shake: 0.5 }); }
    if (m.slamming) {
      m.jy += m.jvy * dt; m.jvy -= 1100 * dt;
      m.x = clamp(m.x + m.vx * dt, 20, this.map.width - m.w - 20);
      if (m.jy <= 0) {
        m.jy = 0; m.slamming = false; m.vx = 0;
        this.emit('slam', { x: m.cx, r: 170, atk: d.atk * 1.2, el: d.el || null, src: m.uid, m });
      }
      m.y = m.standY - m.h - m.jy;
      return;
    }
    m.attacking = false;
    if (!m.aggro || !p) { m.vx = 0; m.y = m.standY - m.h; return; }
    m.facing = p.cx > m.cx ? 1 : -1;
    m.vx = dist > 70 ? m.facing * d.speed * (rage ? 1.5 : 1) : 0;
    m.x = clamp(m.x + m.vx * dt, 20, this.map.width - m.w - 20);
    m.y = m.standY - m.h;
    m.actT = (m.actT || 2) - dt;
    if (m.actT <= 0) {
      m.actT = rage ? rand(1.8, 2.4) : rand(2.8, 3.6);
      const r = Math.random();
      if (r < 0.42) {
        m.attacking = true;
        const n = rage ? 7 : 5;
        const base = Math.atan2(p.cy - m.cy, p.cx - m.cx);
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * 0.22;
          this.emit('shoot', { kind: d.proj, x: m.cx - 8, y: m.cy - 20, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, range: 420, atk: d.atk * 0.8, el: d.el || null, w: 14, h: 14, src: m.uid, m });
        }
        this.emit('chat', { name: d.name, text: pick(d.lines.shoot), kind: 'boss' });
      } else if (r < 0.75) {
        m.slamming = true; m.jvy = 520; m.vx = clamp((p.cx - m.cx) * 1.1, -260, 260);
      } else {
        const minions = this.monsters.filter((x) => !x.dead && x.id === d.summon).length;
        if (minions < 4) for (let i = 0; i < 2; i++) {
          const w = this.make(d.summon, clamp(m.cx + rand(-120, 120), 20, this.map.width - 40), GROUND_Y, [20, this.map.width - 40], null, { elite: false, lvBonus: 0 });
          w.y = m.y + rand(0, 30); w.homeY = GROUND_Y - 80; w.aggro = p.id; w.aggroT = 30;
          this.add(w);
          this.emit('fx', { kind: 'poof', x: w.cx, y: w.cy, dur: 0.5, data: { color: '#7ff2d6' } });
        }
        this.emit('chat', { name: d.name, text: d.lines.summon, kind: 'boss' });
      }
    }
  }
}
