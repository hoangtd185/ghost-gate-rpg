// Game world: logic updates, combat, monsters, drops, and drawing everything on the canvas
import { MAPS, GROUND_Y } from '../data/maps.js';
import { MONSTERS } from '../data/monsters.js';
import { CLASSES, SKILLS } from '../data/classes.js';
import { ITEMS } from '../data/items.js';
import { NPCS, QUESTS } from '../data/npcs.js';
import { AFFIXES, NAMED } from '../data/affixes.js';
import { ELEMENTS } from '../data/elements.js';
import { buildMapGraphics, drawPortal, drawLayer, VIEW_W, VIEW_H } from '../gfx/backgrounds.js';
import { projSprite, itemIcon, iconForItem } from '../gfx/icons.js';
import { Player, Monster, Drop, Projectile, NPC, MOVE_SPEED, JUMP_V, lookFor } from './entities.js';
import { stepBody } from './physics.js';
import { Pet } from './pet.js';
import { rollDrops, killExp } from './loot.js';
import { hitDamage, botDamage } from './combat.js';
import { MobSim } from './mobsim.js';
import {
  calcStats, gainExp, addItem, onKillForQuests, expToNext, countItem, INV_SIZE,
  questDropsFor, npcMarker, questStatus, npcPresent, questEvent, questProgress,
} from './character.js';
import { npcLine, pickBanter } from './chatter.js';
import { BotManager } from './bots.js';
import { clamp, rand, randInt, chance, overlap, centerDist, pick } from '../engine/util.js';
import { GAME } from '../config.js';

const dist2 = (a, b) => Math.abs(a.cx - b.cx);
// '#rrggbb' + alpha
const rbg = (hex, a) => rgbaHex(hex, a);
function rgbaHex(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }

// Player jump: initial impulse, how long holding Space keeps pushing, and the extra push
const PH = GAME.physics; // tuned in config.js
const PLAYER_JUMP = PH.jumpV;
const JUMP_HOLD_TIME = PH.jumpHoldTime;
const JUMP_HOLD_ACCEL = PH.jumpHoldAccel;
const SPRINT_MULT = PH.sprintMult;

// Glow behind projectiles: [core color, radius]
const PROJ_GLOW = {
  talisman: ['rgba(255,220,90,0.55)', 14], fire: ['rgba(255,140,40,0.7)', 26], wave: ['rgba(140,200,255,0.6)', 26],
  dart: ['rgba(220,240,255,0.35)', 9], ember: ['rgba(255,110,40,0.6)', 14], ghostfire: ['rgba(200,80,255,0.6)', 16], thunderorb: ['rgba(140,200,255,0.8)', 18], bloodtalisman: ['rgba(255,40,70,0.6)', 18], fireball: ['rgba(255,140,40,0.7)', 22], waterbolt: ['rgba(110,170,255,0.6)', 14],
};
// Trails: [palette, max particle size, chance per frame]
const PROJ_TRAIL = {
  talisman: [['#ffe27a', '#fff6c0', '#ff9a3c'], 2.2, 0.6], fire: [['#ffb04a', '#ff6a2a', '#fff0a0'], 3.2, 1],
  wave: [['#bfe6ff', '#ffffff', '#7ab8ff'], 2.6, 0.9], dart: [['#e8f0ff'], 1.4, 0.35],
  ember: [['#ff8a3a', '#ffd06a'], 2, 0.5], ghostfire: [['#d08aff', '#ff9aff', '#8a4aff'], 2.4, 0.7],
  bloodtalisman: [['#ff4a5a', '#ffb0b8', '#a8142a'], 2.4, 0.8],
  fireball: [['#ffb04a', '#ff6a2a', '#fff0a0'], 3.4, 1], thunderorb: [['#bfe0ff', '#ffffff', '#7ab8ff'], 2.2, 1], waterbolt: [['#bfe0ff', '#ffffff'], 2, 0.6],
};
// Main color of each skill (magic circle, particles)
const SKILL_FX = {
  sw_combo: '#8fd0ff', sw_wave: '#bfe6ff', sw_guard: '#ffd84a',
  ta_thunder: '#a8d4ff', ta_fire: '#ff9a3c', ta_orbs: '#9ad8ff',
  as_triple: '#c8f0a0', as_dash: '#c08aff', as_poison: '#8fe06a',
};

// Drops worth saving immediately: outfits, Rare+ equipment, grade 2+ gems, orbs and protection charms
function isRareDrop(e) {
  const it = ITEMS[e.id];
  if (!it) return false;
  if (it.slot === 'outfit') return true;
  if (it.type === 'equip') return (e.r || 0) >= 2;
  if (it.type === 'gem') return it.gem.g >= 2;
  return e.id.startsWith('orb_') || e.id === 'protect';
}

export class GameWorld {
  constructor(ch, hooks) {
    this.ch = ch;
    this.hooks = hooks; // toast, chat, openNpc, death, changed, save, mapChanged
    this.time = 0;
    this.player = new Player(ch, ch.x);
    this.player.id = ch.id; // monsters aggro on player ids (see mobsim.js)
    this.bots = new BotManager(this);
    this.remotes = new Map(); // other real players on this map (multiplayer), filled by net/realtime.js
    this.kills = new Map(); // kill report number -> monster name, until the server answers with the drops
    this.pendingPicks = new Map(); // server drop id -> drop, while a pickup waits for the server
    this.net = null;
    this.pet = null;
    this.recalc();
    this.loadMap(ch.map in MAPS ? ch.map : 'village', ch.x);
    if (ch.pet && ch.pet.on) this.pet = new Pet(this);
  }

  recalc() {
    const ch = this.ch;
    this.stats = calcStats(ch, this.player.buffs);
    ch.hp = Math.min(ch.hp, this.stats.maxHp);
    ch.mp = Math.min(ch.mp, this.stats.maxMp);
  }

  loadMap(id, x) {
    const map = MAPS[id];
    this.mapId = id; this.map = map;
    this.ch.map = id;
    this.remotes.clear();
    this.pendingPicks.clear(); // answers still arrive; a picked item comes in as an item change
    this.net?.entered(); // ask the server for this map's players (also when re-entering the same map)
    this.gfx = buildMapGraphics(map);
    const p = this.player;
    p.x = clamp(x ?? map.spawnX ?? 100, 10, map.width - 30); p.y = GROUND_Y - p.h - 40; p.vx = 0; p.vy = 0;
    this.drops = []; this.projs = []; this.effects = []; this.texts = []; this.zones = []; this.timers = []; this.particles = [];
    this.npcs = []; this.banter = null; this.banterCd = rand(12, 25);
    this.namedT = this.namedT || {}; this.namedCheckT = 1.5;
    this.refreshNpcs();
    this.newSim();
    this.bots.onMapLoad(id);
    if (this.pet) this.pet.warp();
    this.camX = clamp(p.cx - VIEW_W / 2, 0, map.width - VIEW_W);
    this.portalCd = 0.6;
    this.hooks.mapChanged && this.hooks.mapChanged(map);
  }

  // Monsters of this map. Offline: every spawn and field boss is simulated here. Online: the server runs the
  // shared monsters (they arrive as remote monsters, see serverMobs); only personal story bosses run here.
  newSim() {
    const online = !!this.net;
    this.sim = new MobSim(this.mapId, {
      make: (...a) => new Monster(...a), spawn: !online, fieldBosses: !online, namedT: this.namedT,
      poisonTick: (m) => this.damageMonster(m, m.poisonDmg, 'player', undefined, undefined, 'poison'),
    });
    this.remoteMobs = new Map(); // uid -> remote monster (online)
  }
  // ===== Shared monsters (online, see server/src/mobs.js) =====
  addRemoteMob(info) {
    if (this.remoteMobs.has(info.uid) || !MONSTERS[info.mob]) return null;
    const m = new Monster(info.mob, info.x, info.standY, info.range, null, { uid: info.uid, lvBonus: info.lvBonus, elite: info.elite, chief: info.chief, named: info.named, affix: info.affix });
    m.remote = true;
    m.x = info.x; m.y = info.y; m.tx = info.x; m.ty = info.y;
    m.hp = info.hp; m.shield = info.shield;
    this.remoteMobs.set(m.uid, m);
    this.sim.monsters.push(m);
    return m;
  }
  clearRemoteMobs() {
    this.sim.monsters = this.sim.monsters.filter((m) => !m.remote);
    this.remoteMobs.clear();
  }
  // The full list when we enter a map
  serverMobs(list) {
    this.clearRemoteMobs();
    for (const info of list) { const m = this.addRemoteMob(info); if (m) m.alpha = 1; }
  }
  mobSpawn(info) { this.addRemoteMob(info); }
  // Positions and state 10×/s: [uid, x, y, facing, hp, shield, state bits]
  mobSnap(list) {
    for (const [uid, x, y, f, hp, sh, st] of list) {
      const m = this.remoteMobs.get(uid);
      if (!m || m.dead) continue;
      m.tx = x; m.ty = y; m.facing = f; m.hp = hp; m.shield = sh;
      m.attacking = !!(st & 1);
      if (st & 2 && !(m.hurtT > 0)) m.hurtT = 0.12;
      m.charging = st & 4 ? 0.1 : 0; m.chargeDir = f;
      m.poison = st & 8 ? 0.5 : 0;
    }
  }
  mobDie({ uid, by }) {
    const m = this.remoteMobs.get(uid);
    if (!m || m.dead) return;
    m.dead = true; m.fadeT = 0.4; m.hp = 0;
    this.addFx('poof', m.cx, m.cy, 0.5, { color: m.def.boss ? '#ff3a5a' : '#c8c8ff', big: m.def.boss });
    if (m.named) { this.shakeT = 0.6; if (NAMED[m.named].every && by) this.hooks.chat('Hệ thống', `${by} đã hạ ${NAMED[m.named].name}!`, 'system'); }
    if (m.def.boss) { this.shakeT = 0.8; this.hooks.chat('Hệ thống', `${by || 'Ai đó'} đã tiêu diệt ${m.def.name}! Thiên hạ chấn động.`, 'system'); }
  }
  // Our reward for a shared monster: EXP (our share), and if we earned the loot, gold and our personal drops
  onServerKill(k) {
    const ch = this.ch, m = this.remoteMobs.get(k.uid);
    const name = m ? m.def.name : (MONSTERS[k.mob] || {}).name;
    if (this.stats.pas.killHeal) {
      const f = this.stats.pas.killHeal / 100;
      ch.hp = Math.min(this.stats.maxHp, ch.hp + this.stats.maxHp * f); ch.mp = Math.min(this.stats.maxMp, ch.mp + this.stats.maxMp * f);
    }
    if (k.exp) this.giveExp(k.exp);
    if (k.gold) this.drops.push(new Drop(k.x - 6, k.y, 'gold', k.gold));
    if (k.drops) this.serverDrops(k.drops, name);
    for (const id of questDropsFor(ch, k.mob)) this.drops.push(new Drop(k.x - 6 + rand(-8, 8), k.y, 'item', { id, qty: 1, r: 0, b: {} }));
    const changed = onKillForQuests(ch, k.mob);
    if (k.named) changed.push(...onKillForQuests(ch, k.named));
    for (const qid of changed) this.hooks.questProgress(qid);
    this.hooks.changed('bars');
  }

  // Shared monsters (online): move toward the server's latest positions, fade out after death
  updateRemoteMobs(dt) {
    for (const m of this.remoteMobs.values()) {
      if (m.dead) { m.fadeT -= dt; if (m.fadeT <= 0) { this.remoteMobs.delete(m.uid); this.sim.monsters = this.sim.monsters.filter((x) => x !== m); } continue; }
      m.animT += dt; m.alpha = Math.min(1, m.alpha + dt * 2);
      if (m.hurtT > 0) m.hurtT -= dt;
      if (m.tx === undefined) continue;
      const k = Math.min(1, dt * 10);
      m.vx = (m.tx - m.x) * 10; // only used to pick the walk/idle animation
      m.x += (m.tx - m.x) * k; m.y += (m.ty - m.y) * k;
    }
  }
  get monsters() { return this.sim.monsters; }
  set monsters(v) { this.sim.monsters = v; }
  get spawnGroups() { return this.sim.groups; }
  set spawnGroups(v) { this.sim.groups = v; }
  spawnMonster(g, delay = 0) { this.sim.spawnGroup(g, delay); this.drainMobEvents(); }
  spawnNamed(id) { const m = this.sim.spawnNamed(id); this.drainMobEvents(); return m; }

  // Turn monster events (mobsim.js, or the server's) into effects, chat, projectiles and damage to our player
  drainMobEvents() { for (const e of this.sim.drain()) this.mobEvent(e); }
  mobEvent(e) {
    const p = this.player;
    switch (e.type) {
      case 'announce': this.hooks.chat('Hệ thống', e.chat, 'system'); this.hooks.toast(e.toast, 'rare'); break;
      case 'text': this.floatText(e.x, e.y, e.text, e.color, false, true); break;
      case 'fx': this.addFx(e.kind, e.x, e.y, e.dur, e.data || {}); if (e.shake) this.shakeT = Math.max(this.shakeT || 0, e.shake); break;
      case 'chat': this.hooks.chat(e.name, e.text, e.kind); break;
      case 'shoot': this.projs.push(new Projectile({ owner: 'monster', kind: e.kind, x: e.x, y: e.y, vx: e.vx, vy: e.vy, range: e.range, atk: e.atk, el: e.el, w: e.w, h: e.h, src: e.m || this.remoteMobs.get(e.src) || null })); break;
      case 'slam': {
        this.shakeT = 0.4;
        this.addFx('shock', e.x, GROUND_Y, 0.6, {});
        if (p.onGround && p.standY === GROUND_Y && Math.abs(p.cx - e.x) < e.r) this.hurtPlayer(e.atk, p.cx > e.x ? 1 : -1, e.el, e.m || this.remoteMobs.get(e.src) || null);
        break;
      }
      case 'explode': {
        this.addFx('ring', e.x, e.y, 0.5, { color: '#ffb040', r: e.r });
        this.burst(e.x, e.y, '#ffb040', 30, 160, { shape: 'star' }); this.shakeT = 0.3;
        if (!p.dead && Math.hypot(p.cx - e.x, p.cy - e.y) < e.r) this.hurtPlayer(e.atk, p.cx > e.x ? 1 : -1, e.el, null);
        break;
      }
      case 'die': this.onMobDie(e.m, e.by); break;
    }
  }

  // Story-driven NPCs and portals: some NPCs appear/disappear with quests, some portals open only after a quest
  refreshNpcs() {
    const old = Object.fromEntries((this.npcs || []).map((n) => [n.id, n]));
    this.npcs = (this.map.npcs || []).filter((n) => npcPresent(this.ch, n)).map((n) => {
      const o = old[n.id];
      if (o) return o;
      const npc = new NPC(n.id, NPCS[n.id], n.x);
      npc.chatT = rand(4, 14); npc.hiCd = 0;
      return npc;
    });
    this.portals = this.map.portals.filter((pt) => !pt.req || questStatus(this.ch, pt.req) === 'done');
  }

  // ===== Named monsters: story bosses (while the quest is active) and field bosses (on a timer) =====
  // (field-boss timers run inside the monster simulation)
  updateNamed(dt) {
    this.namedCheckT -= dt;
    if (this.namedCheckT > 0) return;
    this.namedCheckT = 2;
    for (const [id, n] of Object.entries(NAMED)) {
      if (n.map !== this.mapId || !n.quest) continue;
      if (questStatus(this.ch, n.quest) !== 'active') continue;
      if (this.monsters.some((m) => m.named === id)) continue;
      this.spawnNamed(id);
    }
  }

  // Action events for tutorial quests
  event(name, n = 1) {
    for (const qid of questEvent(this.ch, name, n)) this.hooks.questProgress(qid);
  }

  // NPCs talk on their own when the player is near, greet the player on approach, and chat with each other
  updateNpcChatter(dt) {
    const p = this.player, ch = this.ch;
    if (this.banter) {
      this.banter.t -= dt;
      if (this.banter.t <= 0) {
        const line = this.banter.lines.shift();
        if (!line) { this.banter = null; this.banterCd = rand(40, 75); }
        else {
          const [id, text] = line;
          const n = this.npcs.find((x) => x.id === id);
          if (n) { n.say = { text, t: 3.6 }; n.facingOverride = 1.2; this.hooks.chat(NPCS[id].name, text, 'npc'); }
          this.banter.t = 3.2;
        }
      }
    } else {
      this.banterCd = (this.banterCd ?? rand(15, 30)) - dt;
      const near = this.npcs.filter((n) => Math.abs(n.cx - p.cx) < 290);
      if (this.banterCd <= 0 && near.length >= 2) {
        const lines = pickBanter(ch, this.mapId, near.map((n) => n.id));
        if (lines) this.banter = { lines, t: 0 };
        else this.banterCd = rand(30, 50);
      }
    }
    for (const n of this.npcs) {
      const d = Math.abs(n.cx - p.cx);
      n.hiCd -= dt;
      if (d < 70 && n.hiCd <= 0 && !n.say && !this.banter) {
        const t = npcLine(ch, n.id, 'hi');
        if (t) n.say = { text: t, t: 2.8 };
        n.hiCd = rand(50, 90); n.chatT = Math.max(n.chatT, 8);
        continue;
      }
      if (d > 70) n.hiCd = Math.max(n.hiCd, 4); // must walk away and come back before being greeted again
      n.chatT -= dt;
      if (n.chatT <= 0) {
        n.chatT = rand(16, 34);
        if (d < 300 && !n.say && !this.banter) {
          const t = npcLine(ch, n.id, 'lines');
          if (t) n.say = { text: t, t: 4.5 };
        }
      }
    }
  }

  // ================= LOOP =================
  update(dt, input) {
    this.time += dt;
    this.ch.playTime += dt;
    for (const tm of this.timers) tm.t -= dt;
    const due = this.timers.filter((t) => t.t <= 0);
    this.timers = this.timers.filter((t) => t.t > 0);
    due.forEach((t) => t.fn());

    this.updatePlayer(dt, input);
    this.sim.update(dt, this.player.dead ? [] : [this.player], this.projs);
    this.updateRemoteMobs(dt);
    this.drainMobEvents();
    for (const m of this.monsters) if (m.charging > 0 && !m.dead && Math.random() < dt * 30) this.spark(m.cx - m.chargeDir * m.w / 2, m.y + m.h - 2, { vx: -m.chargeDir * 40, vy: rand(-20, 0), color: '#d8c8b0', size: rand(1.5, 2.5), life: 0.4, glow: false });
    this.bots.update(dt);
    for (const r of this.remotes.values()) r.update(dt);
    if (this.net) this.net.tick(dt);
    for (const n of this.npcs) { n.updateAnim(dt); n.facing = this.player.cx < n.cx ? -1 : 1; if (n.say) { n.say.t -= dt; if (n.say.t <= 0) n.say = null; } }
    this.updateNpcChatter(dt);
    this.updateNamed(dt);
    this.updateProjectiles(dt);
    this.updateZones(dt);
    this.updateDrops(dt);
    this.updateParticles(dt);
    for (const e of this.effects) e.t += dt;
    this.effects = this.effects.filter((e) => e.t < e.dur);
    for (const t of this.texts) { t.t += dt; t.y -= dt * 28; }
    this.texts = this.texts.filter((t) => t.t < 1.1);
    if (this.shakeT > 0) this.shakeT -= dt;
    const target = clamp(this.player.cx - VIEW_W / 2, 0, this.map.width - VIEW_W);
    this.camX += (target - this.camX) * Math.min(1, dt * 8);
  }

  updatePlayer(dt, input) {
    const p = this.player, ch = this.ch, st = this.stats;
    for (const k in p.cooldowns) p.cooldowns[k] = Math.max(0, p.cooldowns[k] - dt);
    if (p.invuln > 0) p.invuln -= dt;
    if (p.hurtT > 0) p.hurtT -= dt;
    if (p.atkT > 0) p.atkT -= dt;
    if (this.portalCd > 0) this.portalCd -= dt;
    if (p.say) { p.say.t -= dt; if (p.say.t <= 0) p.say = null; }
    // buff expired
    const before = p.buffs.length;
    p.buffs.forEach((b) => (b.t -= dt));
    p.buffs = p.buffs.filter((b) => b.t > 0);
    if (p.buffs.length !== before) { this.recalc(); this.hooks.changed(); }

    if (p.dead) { p.vx = 0; stepBody(p, dt, this.map.platforms, this.map.width); return; }

    // Dash (Ảnh Sát)
    if (p.dashT > 0) {
      p.dashT -= dt;
      p.vx = p.dashVx; p.vy = 0;
      p.x = clamp(p.x + p.vx * dt, 0, this.map.width - p.w);
      if (p.dashT <= 0) { p.vx = 0; }
      p.updateAnim(dt);
      return;
    }

    // debuffs from monster traits: poison (drains HP, never kills) and slow
    if (p.poisonT > 0) {
      p.poisonT -= dt; p.poisonTick = (p.poisonTick || 0) - dt;
      if (p.poisonTick <= 0) {
        p.poisonTick = 0.5;
        const dmg = Math.min(Math.round(p.poisonDps * 0.5), Math.max(0, Math.ceil(ch.hp) - 1));
        if (dmg > 0) { ch.hp -= dmg; this.floatText(p.cx, p.y - 2, dmg, '#8fe06a', false, true); this.hooks.changed('bars'); }
      }
    }
    if (p.slowT > 0) p.slowT -= dt;
    const spd = (1 + (st.pas ? st.pas.speed : 0) / 100) * (p.slowT > 0 ? 0.6 : 1);
    let move = 0;
    const busy = p.atkT > p.atkDur * 0.4 && p.onGround;
    if (input.isDown('left')) move -= 1;
    if (input.isDown('right')) move += 1;
    // double-tap and hold ← / → to sprint
    p.running = move !== 0 && input.sprint === (move < 0 ? 'left' : 'right');
    p.sitting = false;
    if (p.hurtT > 0.15) { /* knocked back */ }
    else if (busy) p.vx *= 0.7;
    else {
      p.vx = move * MOVE_SPEED * spd * (p.running ? SPRINT_MULT : 1);
      if (move) p.facing = move;
    }
    if (p.running && p.onGround && Math.random() < dt * 22) {
      this.spark(p.cx - move * 8, p.y + p.h - 1, { vx: -move * rand(20, 60), vy: rand(-30, -8), color: pick(['#d8ccb4', '#bfb39a', '#efe6d2']), size: rand(1.5, 2.8), life: rand(0.25, 0.45), glow: false, drag: 0.9 });
    }
    // Jump: tap = short hop, hold = high jump, press again in the air = double jump
    if (p.onGround) p.jumps = 0;
    // Ctrl + ↓ (either order) drops through the platform you stand on, same as ↓ + Space
    const held = (k) => input.isDown(k) || input.wasPressed(k); // a quick tap may press and release within one frame
    const ctrlDrop = (held('ctrl') && input.wasPressed('down')) || (held('down') && input.wasPressed('ctrl'));
    if (ctrlDrop && p.onGround && p.standY < GROUND_Y) { p.dropTimer = PH.dropThroughTime; p.y += 2; p.jumps = 1; }
    else if (input.wasPressed('jump')) {
      if (p.onGround) {
        if (input.isDown('down') && p.standY < GROUND_Y) { p.dropTimer = PH.dropThroughTime; p.y += 2; p.jumps = 1; }
        else { p.vy = PLAYER_JUMP; p.jumps = 1; p.jumpHold = JUMP_HOLD_TIME; }
      } else if ((p.jumps || 1) < 2) {
        p.vy = PLAYER_JUMP * PH.doubleJumpMult; p.jumps = 2; p.jumpHold = JUMP_HOLD_TIME * 0.7;
        this.event('djump');
        this.addFx('ring', p.cx, p.y + p.h, 0.35, { color: '#e8f4ff', r: 14 });
        for (let i = 0; i < 10; i++) this.spark(p.cx + rand(-6, 6), p.y + p.h, { vx: rand(-70, 70), vy: rand(10, 40), color: pick(['#ffffff', '#d8ecff', '#bfe0ff']), size: rand(1.5, 3), life: rand(0.3, 0.5), glow: false, drag: 0.9 });
      }
    }
    if (p.jumpHold > 0) {
      if (input.isDown('jump') && p.vy < 0) { p.vy -= JUMP_HOLD_ACCEL * dt; p.jumpHold -= dt; }
      else {
        if (p.vy < -140) p.vy *= 0.5; // releasing early cuts the jump short
        p.jumpHold = 0;
      }
    }
    if (input.isDown('down') && !input.isDown('ctrl') && p.onGround && !move && p.atkT <= 0) p.sitting = true;
    stepBody(p, dt, this.map.platforms, this.map.width);
    p.updateAnim(dt);

    // Skills
    if (input.isDown('attack')) this.castSkill(0);
    if (input.wasPressed('skill1')) this.castSkill(1);
    if (input.wasPressed('skill2')) this.castSkill(2);
    if (input.wasPressed('skill3')) this.castSkill(3);
    if (input.wasPressed('potHp')) this.usePotion('hp');
    if (input.wasPressed('potMp')) this.usePotion('mp');

    // Portals + NPCs
    this.nearPortal = this.portals.find((pt) => Math.abs(pt.x - p.cx) < 30 && p.standY === GROUND_Y);
    this.nearNpc = this.npcs.find((n) => Math.abs(n.cx - p.cx) < 36 && Math.abs(n.y - p.y) < 20);
    if (input.wasPressed('up') || input.wasPressed('interact')) {
      if (this.nearPortal && this.portalCd <= 0) { this.usePortal(this.nearPortal); return; }
      if (this.nearNpc) { this.hooks.openNpc(this.nearNpc.id); input.clear(); }
    }

    // Natural HP/MP regen (faster while sitting and in safe maps; see GAME.player.regen)
    const RG = GAME.player.regen;
    p.regenT += dt;
    const regenEvery = p.sitting ? RG.sittingEvery : RG.every;
    if (p.regenT >= regenEvery) {
      p.regenT = 0;
      const mul = this.map.safe ? RG.safeMapMult : 1;
      const oldHp = ch.hp, oldMp = ch.mp;
      ch.hp = Math.min(st.maxHp, ch.hp + Math.ceil(st.maxHp * RG.hpPct * mul + 1));
      ch.mp = Math.min(st.maxMp, ch.mp + Math.ceil((st.maxMp * RG.mpPct * mul + 1) * (1 + st.pas.mpRegen / 100)));
      if (oldHp !== ch.hp || oldMp !== ch.mp) this.hooks.changed('bars');
    }

    // Collision with monsters
    if (p.invuln <= 0) {
      for (const m of this.monsters) {
        if (m.dead || m.alpha < 0.8) continue;
        if (overlap(this.hitboxOf(m), p)) { this.hurtPlayer(m.def.atk * (m.enraged ? 1.5 : 1) * (m.charging > 0 ? 1.3 : 1), m.cx < p.cx ? 1 : -1, m.def.el, m); break; }
      }
    }
  }

  hitboxOf(m) {
    const pad = m.def.boss ? 10 : 3 * m.scale;
    return { x: m.x + pad, y: m.y + pad, w: m.w - pad * 2, h: m.h - pad };
  }

  usePortal(pt) {
    if (pt.lock && questStatus(this.ch, pt.lock) !== 'done') {
      this.hooks.toast(`Cổng bị phong ấn. Cần hoàn thành nhiệm vụ <b>${QUESTS[pt.lock].name}</b>`, 'warn');
      this.portalCd = 1;
      return;
    }
    if (MAPS[pt.to].minLv && this.ch.level < MAPS[pt.to].minLv - 2) {
      this.hooks.toast(`Nơi đó rất nguy hiểm, nên đạt cấp ${MAPS[pt.to].minLv} trước`, 'warn');
    }
    this.hooks.flash && this.hooks.flash();
    this.loadMap(pt.to, pt.toX);
    this.hooks.save();
  }

  goHome() {
    this.loadMap('village', MAPS.village.spawnX);
    this.hooks.save();
  }

  // ================= SKILLS =================
  castSkill(idx) {
    const p = this.player, ch = this.ch;
    if (p.dead || p.dashT > 0) return;
    const sid = CLASSES[ch.cls].skills[idx];
    const sk = SKILLS[sid];
    if (!ch.skills[sid]) { if (idx > 0) this.hooks.toast(`${sk.name}: cần cấp ${sk.unlock}`, 'warn'); return; }
    if ((p.cooldowns[sid] || 0) > 0) return;
    if (idx === 0 && p.atkT > 0) return;
    if (this.map.safe && sk.type !== 'buff' && sk.type !== 'heal') {
      if (idx === 0) { p.cooldowns[sid] = 0.6; p.atkT = p.atkDur; } // still swing the weapon for fun
      return;
    }
    const mpCost = Math.ceil(sk.mp * (1 - this.stats.pas.mpCost / 100));
    if (ch.mp < mpCost) { this.hooks.toast('Không đủ nội lực', 'warn'); p.cooldowns[sid] = 0.4; return; }
    ch.mp -= mpCost;
    p.cooldowns[sid] = sk.cd;
    p.atkT = p.atkDur;
    if (sk.mp > 0 && SKILL_FX[sid]) {
      this.addFx('circle', p.cx, p.y + p.h, 0.55, { color: SKILL_FX[sid], r: sk.type === 'buff' || sk.type === 'heal' ? 30 : 22 });
      for (let i = 0; i < 6; i++) this.spark(p.cx + rand(-14, 14), p.y + p.h - 2, { vy: rand(-60, -30), color: SKILL_FX[sid], size: rand(1.5, 2.5), life: rand(0.4, 0.7), shape: 'star', drag: 0.95 });
    }
    const lvMul = 1 + GAME.player.skillDmgPerLv * ((ch.skills[sid] || 1) - 1);
    const el = sk.el || this.stats.el || null; // skill element: the skill's own element, otherwise the weapon's
    const mult = (sk.mult || 0) * lvMul;
    const dir = p.facing;
    switch (sk.type) {
      case 'melee': {
        for (let i = 0; i < (sk.hits || 1); i++) {
          this.timers.push({ t: 0.06 + i * 0.11, fn: () => {
            const area = { x: dir > 0 ? p.cx - 4 : p.cx - sk.range + 4, y: p.y + p.h - sk.height - 2, w: sk.range, h: sk.height + 4 };
            this.hitArea(area, mult, sk.maxTargets, 'player', undefined, el, sid);
            this.addFx('slash', p.cx + dir * 18, p.cy - 2, 0.2, { dir, big: sk.hits > 1, i, color: el ? ELEMENTS[el].color : SKILL_FX[sid] });
            if (sk.hits > 1) this.burst(p.cx + dir * 30, p.cy - 4, SKILL_FX[sid], 4, 60, { shape: 'star' });
          } });
        }
        break;
      }
      case 'proj': {
        const n = sk.count || 1;
        for (let i = 0; i < n; i++) {
          const ang = n > 1 ? (i - (n - 1) / 2) * 0.16 : 0;
          this.projs.push(new Projectile({
            owner: 'player', kind: sk.proj, x: p.cx + dir * 8 - 6, y: p.cy - 6,
            vx: Math.cos(ang) * sk.speed * dir, vy: Math.sin(ang) * sk.speed, range: sk.range,
            mult, maxTargets: sk.maxTargets, pierce: sk.pierce, dir, el, sid,
            w: sk.proj === 'wave' ? 22 : sk.proj === 'fire' ? 26 : 12, h: sk.proj === 'wave' ? 36 : sk.proj === 'fire' ? 18 : 10,
          }));
        }
        break;
      }
      case 'strike': {
        const targets = this.monsters.filter((m) => !m.dead && Math.abs(m.cx - p.cx) < sk.range && Math.abs(m.cy - p.cy) < 120)
          .sort((a, b) => Math.abs(a.cx - p.cx) - Math.abs(b.cx - p.cx)).slice(0, sk.targets);
        targets.forEach((m, i) => this.timers.push({ t: 0.05 + i * 0.07, fn: () => {
          if (m.dead) return;
          this.addFx('lightning', m.cx, m.y + m.h, 0.3, {});
          this.burst(m.cx, m.y + m.h - 4, '#bfe0ff', 10, 90, { shape: 'star', grav: 200 });
          this.shakeT = Math.max(this.shakeT || 0, 0.08);
          this.damageMonster(m, mult, 'player', undefined, undefined, el, { sid });
        } }));
        if (!targets.length) this.addFx('lightning', p.cx + dir * 60, p.y + p.h, 0.25, {});
        break;
      }
      case 'dash': {
        const startX = p.x;
        const dist = sk.dist;
        p.dashT = 0.14; p.dashVx = (dir * dist) / 0.14; p.invuln = Math.max(p.invuln, 0.5);
        this.addFx('afterimage', p.cx, p.cy, 0.3, { dir, x0: p.cx });
        for (let i = 0; i < 14; i++) this.timers.push({ t: i * 0.01, fn: () => this.spark(p.cx + rand(-4, 4), p.cy + rand(-10, 8), { vx: -dir * rand(10, 40), vy: rand(-20, 10), color: pick(['#c08aff', '#e8c8ff', '#8a5aff']), size: rand(2, 3.5), life: rand(0.4, 0.8), shape: 'petal', drag: 0.94 }) });
        this.timers.push({ t: 0.15, fn: () => {
          const x1 = Math.min(startX, p.x), x2 = Math.max(startX, p.x) + p.w;
          this.hitArea({ x: x1 - 6, y: p.y - 6, w: x2 - x1 + 12, h: p.h + 10 }, mult, sk.maxTargets, 'player', undefined, el, sid);
        } });
        break;
      }
      case 'cloud': {
        this.zones.push({ x: p.cx + dir * 50, y: p.y + p.h - 20, r: sk.radius, t: 0, dur: sk.dur, tick: sk.tick, tickT: 0, mult, owner: 'player', el, sid });
        break;
      }
      case 'buff': {
        if (this.net) this.net.cast(sid); // online the server applies the buff to its damage formula too
        p.buffs = p.buffs.filter((b) => b.sid !== sid);
        p.buffs.push({ sid, ...sk.buff, t: sk.dur, max: sk.dur, name: sk.name });
        this.addFx('aura', p.cx, p.cy, 0.8, { color: '#ffd84a' });
        this.burst(p.cx, p.cy, '#ffe27a', 16, 90, { shape: 'star', drag: 0.9 });
        this.recalc();
        break;
      }
      case 'orbs': {
        const target = this.focusTarget(p.cx, p.cy, sk.range);
        for (let i = 0; i < sk.count; i++) {
          // fan out above and behind the caster, then curve in on the target one after another
          const a = -Math.PI / 2 - dir * (0.35 + i * 0.32);
          this.projs.push(new Projectile({
            owner: 'player', kind: 'thunderorb', x: p.cx - 7, y: p.cy - 14,
            vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, range: 99999, life: sk.life,
            mult, maxTargets: 1, dir, el, sid, w: 14, h: 14,
            homing: true, target, speed: sk.speed, seekAt: 0.1 + i * 0.07, seekRange: sk.range + 120,
          }));
        }
        this.burst(p.cx, p.cy - 10, '#bfe0ff', 12, 80, { shape: 'star', drag: 0.92 });
        break;
      }
      case 'heal': {
        if (this.net) this.net.cast(sid);
        const amt = Math.floor(this.stats.maxHp * sk.heal);
        ch.hp = Math.min(this.stats.maxHp, ch.hp + amt);
        this.floatText(p.cx, p.y - 6, '+' + amt, '#7dff9a');
        p.buffs = p.buffs.filter((b) => b.sid !== sid);
        p.buffs.push({ sid, ...sk.buff, t: sk.dur, max: sk.dur, name: sk.name });
        this.addFx('aura', p.cx, p.cy, 0.9, { color: '#7dff9a' });
        for (let i = 0; i < 14; i++) this.spark(p.cx + rand(-16, 16), p.y + p.h - rand(0, 20), { vy: rand(-50, -20), vx: rand(-10, 10), color: pick(['#9dffb4', '#e0ffe8', '#ffd0e8']), size: rand(2, 3), life: rand(0.7, 1.1), shape: 'petal', drag: 0.96, glow: false });
        this.recalc();
        break;
      }
    }
    this.hooks.changed('bars');
  }

  // Target to focus single-target skills on: boss > named > elite > nearest, within range of (x, y)
  focusTarget(x, y, range) {
    const rank = (m) => (m.def.behavior === 'boss' ? 3 : m.named ? 2 : m.chief || m.elite ? 1 : 0);
    let best = null, bestScore = -Infinity;
    for (const m of this.monsters) {
      if (m.dead) continue;
      const d = Math.hypot(m.cx - x, m.cy - y);
      if (d > range) continue;
      const score = rank(m) * 1000 - d;
      if (score > bestScore) { bestScore = score; best = m; }
    }
    return best;
  }

  // Steer a homing projectile toward its target; picks a new target if the old one died
  steerHoming(pr, dt) {
    if (pr.t < pr.seekAt) { pr.vx *= 0.94; pr.vy *= 0.94; return; }
    const cx = pr.x + pr.w / 2, cy = pr.y + pr.h / 2;
    if (!pr.target || pr.target.dead) pr.target = this.focusTarget(cx, cy, pr.seekRange);
    const speed = Math.min(pr.speed, 140 + (pr.t - pr.seekAt) * 700);
    if (!pr.target) { // nothing to chase: drift forward
      pr.vx += (pr.dir * speed - pr.vx) * Math.min(1, dt * 3); pr.vy *= 0.96;
      return;
    }
    const m = pr.target;
    const ang = Math.atan2(m.cy - cy, m.cx - cx);
    const turn = Math.min(1, dt * (6 + (pr.t - pr.seekAt) * 14)); // turns harder the longer it flies, so it never orbits forever
    pr.vx += (Math.cos(ang) * speed - pr.vx) * turn;
    pr.vy += (Math.sin(ang) * speed - pr.vy) * turn;
  }

  hitArea(area, mult, maxTargets, owner, atk, el, sid) {
    let n = 0;
    const list = this.monsters.filter((m) => !m.dead && overlap(area, m))
      .sort((a, b) => Math.abs(a.cx - this.player.cx) - Math.abs(b.cx - this.player.cx));
    for (const m of list) {
      if (n >= maxTargets) break;
      this.damageMonster(m, mult, owner, atk, undefined, el, { sid });
      n++;
    }
    return n;
  }

  // Damage from our player (or a bot) to a monster, with the shared formulas (game/combat.js).
  //  - our own simulation (offline, personal story bosses): computed here, applied to the simulation
  //  - shared monsters online (m.remote): we only report which skill hit which monster; the SERVER computes the
  //    damage with the same formulas and tells everyone (mobHit). opts.sid is the skill that hit.
  damageMonster(m, mult, owner, botAtk, botName, el, opts = {}) {
    if (m.dead) return;
    const isPlayer = owner === 'player';
    if (m.remote) {
      if (!isPlayer || !opts.sid || !this.net) return; // bots exist only on our screen: they never hurt shared monsters
      this.net.hit({ uid: m.uid, sid: opts.sid });
      m.hurtT = 0.16;
      return;
    }
    let dmg, crit = false, em = 1;
    if (isPlayer) ({ dmg, crit, em } = hitDamage(this.stats, mult, m.def, el, this.ch.hp < this.stats.maxHp * 0.35));
    else dmg = botDamage(botAtk, mult, m.def);
    const by = isPlayer ? { id: this.ch.id, player: true, cx: this.player.cx } : { id: 'bot:' + botName, player: false, name: botName };
    const res = this.sim.damage(m, dmg, by, { show: isPlayer, poison: el === 'poison' && mult === m.poisonDmg });
    if (isPlayer) this.showOwnHit(m, res.dealt, crit, em, el);
    else if (res.dealt > 0) this.floatText(m.cx, m.y - 2, res.dealt, '#b8b8c8', false, true);
    this.drainMobEvents();
  }

  // What our own hit looks like and does to us: element texts, the number, lifesteal, reflect
  showOwnHit(m, dealt, crit, em, el) {
    const st = this.stats, pas = st.pas;
    if (el && (m.elTextT || 0) < this.time) {
      if (em >= 1.25) { this.floatText(m.cx, m.y - 14, 'Yếu ' + ELEMENTS[el].name + '!', ELEMENTS[el].color, false, true); m.elTextT = this.time + 0.8; }
      else if (em <= 0.6) { this.floatText(m.cx, m.y - 14, 'Kháng ' + ELEMENTS[el].name, '#9aa0b0', false, true); m.elTextT = this.time + 0.8; }
    }
    if (el && em > 1) this.burst(m.cx, m.cy, ELEMENTS[el].color, 5, 80, { shape: 'star' });
    if (dealt <= 0) return;
    // lifesteal (passive)
    if (pas.lifesteal) {
      const heal = Math.min(dealt * pas.lifesteal / 100, st.maxHp * 0.04);
      if (heal >= 1) { this.ch.hp = Math.min(st.maxHp, this.ch.hp + heal); this.hooks.changed('bars'); }
    }
    // Reflect: bounce damage back to the player
    if (m.affix.has('reflect')) {
      const r = Math.round(Math.min(dealt * 0.18, st.maxHp * 0.07));
      if (r > 0) this.reflectPlayer(r);
    }
    this.floatText(m.cx, m.y - 2, dealt, crit ? '#ffcf3a' : '#ff9a4a', crit);
    this.burst(m.cx + rand(-4, 4), m.cy + rand(-4, 4), crit ? '#ffe27a' : '#ffffff', crit ? 9 : 4, crit ? 110 : 70, { grav: 160 });
    if (crit) this.addFx('ring', m.cx, m.cy, 0.3, { color: '#ffd84a', r: 20 });
  }

  // The server's result for a hit on a shared monster: { uid, by, dmg, ab, crit, em, el }
  mobHit(h) {
    const m = this.remoteMobs.get(h.uid);
    if (!m) return;
    m.hp = Math.max(0, m.hp - h.dmg); m.shield = Math.max(0, (m.shield || 0) - (h.ab || 0)); m.hurtT = 0.16;
    if (h.by === this.ch.id) {
      if (h.dmg <= 0 && h.ab > 0) { this.floatText(m.cx, m.y - 12, 'Đỡ', '#ffd84a', false, true); return; }
      this.showOwnHit(m, h.dmg, h.crit, h.em, h.el);
    } else if (h.dmg > 0) this.floatText(m.cx, m.y - 2, h.dmg, '#b8b8c8', false, true);
  }

  // Reflected damage: ignores defense and invulnerability frames
  reflectPlayer(r) {
    const p = this.player, ch = this.ch;
    if (p.dead) return;
    ch.hp -= r;
    this.floatText(p.cx + rand(-6, 6), p.y - 8, '-' + r + ' Phản', '#c07bff', false, true);
    this.burst(p.cx, p.cy, '#c07bff', 4, 60, { shape: 'star' });
    if (ch.hp <= 0) this.playerDie();
    this.hooks.changed('bars');
  }

  playerDie() {
    const p = this.player, ch = this.ch;
    ch.hp = 0; p.dead = true; p.poisonT = 0; p.slowT = 0;
    const lose = Math.floor(expToNext(ch.level) * GAME.player.deathExpLoss);
    ch.exp = Math.max(0, ch.exp - lose);
    this.hooks.death(lose);
  }

  killMonster(m, owner, botName) {
    this.sim.kill(m, owner === 'player' ? { id: this.ch.id, player: true } : { id: 'bot:' + botName, player: false, name: botName });
    this.drainMobEvents();
  }

  // A monster of our own simulation died (offline, or a personal story boss online)
  onMobDie(m, by) {
    const botName = by && !by.player ? by.name : null;
    if (m.named) {
      const n = NAMED[m.named];
      this.shakeT = 0.6;
      if (m.hitByPlayer && n.every) this.hooks.chat('Hệ thống', `${this.ch.name} đã hạ ${n.name}!`, 'system');
    }
    this.addFx('poof', m.cx, m.cy, 0.5, { color: m.def.boss ? '#ff3a5a' : '#c8c8ff', big: m.def.boss });
    if (m.def.boss) {
      this.shakeT = 0.8;
      this.hooks.chat('Hệ thống', m.hitByPlayer ? `${this.ch.name} đã tiêu diệt ${m.def.name}! Thiên hạ chấn động.` : `${botName || 'Ai đó'} đã hạ gục ${m.def.name}.`, 'system');
    }
    if (!m.hitByPlayer) return;
    const ch = this.ch;
    if (this.stats.pas.killHeal) {
      const k = this.stats.pas.killHeal / 100;
      ch.hp = Math.min(this.stats.maxHp, ch.hp + this.stats.maxHp * k); ch.mp = Math.min(this.stats.maxMp, ch.mp + this.stats.maxMp * k);
    }
    const exp = killExp(m.def.exp, ch.level, m.def.lv);
    this.giveExp(exp);
    // gold
    const gold = randInt(m.def.gold[0], m.def.gold[1]);
    this.drops.push(new Drop(m.cx - 6, m.cy, 'gold', gold));
    // items: online the server rolls them (personal loot, only we see them); offline they are rolled here
    const kill = { mob: m.id, elite: m.elite, chief: m.chief, named: m.named };
    if (this.net) {
      const k = this.net.kill({ ...kill, x: Math.round(m.cx), y: Math.round(m.cy) });
      this.kills.set(k, m.def.name);
      if (this.kills.size > 60) this.kills.delete(this.kills.keys().next().value);
    } else {
      for (const data of rollDrops(kill, ch.cls, m.def.drops)) {
        if (data.rare) this.announceDrop(data, m.def.name);
        this.drops.push(new Drop(m.cx - 6 + rand(-10, 10), m.cy, 'item', data));
      }
    }
    // quest items
    for (const id of questDropsFor(ch, m.id)) {
      this.drops.push(new Drop(m.cx - 6 + rand(-8, 8), m.cy, 'item', { id, qty: 1, r: 0, b: {} }));
      this.addFx('ring', m.cx, m.cy, 0.5, { color: '#ffd84a', r: 22 });
    }
    const changed = onKillForQuests(ch, m.id);
    if (m.named) changed.push(...onKillForQuests(ch, m.named));
    for (const qid of changed) this.hooks.questProgress(qid);
  }

  // The closest other player within trade range, or null
  nearestRemote() {
    const p = this.player;
    let best = null, bd = GAME.net.trade.range;
    for (const r of this.remotes.values()) { const d = Math.abs(r.cx - p.cx); if (d <= bd) { bd = d; best = r; } }
    return best;
  }

  announceDrop(data, from) {
    const it = ITEMS[data.id];
    this.hooks.chat('Hệ thống', from ? `✦ ${it.name} rơi ra từ ${from}!` : `✦ ${it.name} rơi ra!`, 'system');
    this.hooks.toast(`✦ <b>${it.name}</b> rơi ra!`, 'rare');
  }

  // ===== Online loot (see net/realtime.js and server/src/loot.js) =====
  // Drops the server rolled for one of our kills
  serverLoot(m) {
    const from = this.kills.get(m.k);
    this.kills.delete(m.k);
    if (m.map === this.mapId) this.serverDrops(m.drops, from); // otherwise they wait on the server until we come back
  }
  // Our server drops on this map (after a kill, a reconnect, or coming back to the map)
  serverDrops(list, from) {
    for (const x of list || []) {
      if (this.drops.some((d) => d.sid === x.id) || this.pendingPicks.has(x.id)) continue;
      const d = new Drop(x.x - 6 + rand(-10, 10), x.y, 'item', x.it);
      d.sid = x.id;
      if (from === undefined) { d.vy = 0; d.t = 0.5; } // re-sent drop: already on the ground, no pop
      this.drops.push(d);
      if (x.rare && from !== undefined) this.announceDrop(x.it, from);
    }
  }
  // Answer to a pickup. On success the item itself arrives as an item change (applyChanges).
  serverPick(m) {
    const d = this.pendingPicks.get(m.id);
    this.pendingPicks.delete(m.id);
    if (m.ok || !d) return;
    if (m.why === 'gone') return; // expired, or already ours (the change replay brings it)
    d.taken = false; d.petSkip = m.why === 'full';
    if (m.why === 'busy') d.retryAt = this.time + 0.6; // the server is busy: try again shortly
    if (m.why === 'full' && !d.warned) { d.warned = true; this.hooks.toast('Túi đồ đã đầy', 'warn'); }
    this.drops.push(d);
  }
  // Connection lost: pickups in flight are put back on the ground (the server may still have committed them;
  // then the change replay on reconnect adds the item and the drop is gone on the server)
  netLost() {
    for (const d of this.pendingPicks.values()) { d.taken = false; this.drops.push(d); }
    this.pendingPicks.clear();
  }
  // Apply item and gold changes made by the server (pickups, trades), oldest first. rev = the server's revision.
  applyChanges(list, rev) {
    const ch = this.ch, got = [];
    for (const c of list || []) {
      if (c.rev <= (ch.itemRev || 0)) continue;
      if (c.kind === 'gain' && c.entry) {
        const has = ch.inventory.some((e) => e.uid === c.uid) || Object.values(ch.equip).some((e) => e && e.uid === c.uid);
        if (has) continue;
        const it = ITEMS[c.entry.id];
        const stack = it && it.type !== 'equip' && ch.inventory.find((e) => e.id === c.entry.id);
        if (stack) stack.qty = Math.min(999, stack.qty + c.entry.qty); else ch.inventory.push({ ...c.entry });
        got.push(c.entry);
      } else if (c.kind === 'loss') {
        const i = ch.inventory.findIndex((e) => e.uid === c.uid);
        if (i >= 0) ch.inventory.splice(i, 1);
        for (const [slot, e] of Object.entries(ch.equip)) if (e && e.uid === c.uid) ch.equip[slot] = null;
      } else if (c.kind === 'gold') ch.gold = Math.max(0, ch.gold + c.qty);
    }
    ch.itemRev = Math.max(ch.itemRev || 0, rev || 0);
    for (const e of got) this.hooks.gotItem(e);
    this.recalc();
    this.hooks.changed('inv');
    this.hooks.save(); // write the merged state back soon
  }

  giveExp(exp) {
    const ch = this.ch;
    this.floatText(this.player.cx, this.player.y - 14, `+${exp} EXP`, '#bfa7ff', false, true);
    const ups = gainExp(ch, exp);
    if (ups > 0) {
      this.recalc();
      ch.hp = this.stats.maxHp; ch.mp = this.stats.maxMp;
      this.addFx('levelup', this.player.cx, this.player.y + this.player.h, 1.4, {});
      for (let i = 0; i < 30; i++) this.spark(this.player.cx + rand(-16, 16), this.player.y + this.player.h - rand(0, 10), { vy: rand(-110, -40), vx: rand(-20, 20), color: pick(['#ffe27a', '#fff6c0', '#ffb84a', '#ffd0f0']), size: rand(1.5, 3), life: rand(0.8, 1.4), shape: 'star', drag: 0.97 });
      this.hooks.levelUp(ch.level);
      this.bots.onPlayerLevel(ch.level);
      this.hooks.save();
    }
    this.hooks.changed('bars');
  }

  hurtPlayer(rawAtk, dir, el, src) {
    const p = this.player, ch = this.ch, st = this.stats;
    if (p.dead || p.invuln > 0) return;
    let def = st.def;
    if (st.pas.lowHp && ch.hp < st.maxHp * 0.35) def *= 1 + st.pas.lowHp / 100;
    let dmg = rawAtk * rand(0.9, 1.1) - def * 0.6;
    if (el) dmg *= 1 - (this.stats.res[el] || 0) / 100; // elemental resistance from gear
    dmg = Math.max(1, Math.round(dmg));
    if (chance(GAME.player.baseDodge + st.pas.dodge / 100)) { this.floatText(p.cx, p.y - 4, 'NÉ', '#e8e8f8'); p.invuln = 0.6; return; }
    ch.hp -= dmg;
    // attacker's traits
    if (src && src.affix && !src.dead) {
      if (src.affix.has('vampire')) { const h = Math.round(dmg * 0.6); src.hp = Math.min(src.maxHp, src.hp + h); this.floatText(src.cx, src.y - 6, '+' + h, '#ff6a7a', false, true); }
      if (src.affix.has('frost')) { p.slowT = 2; this.burst(p.cx, p.cy, '#bfe8ff', 8, 60, { shape: 'star' }); }
      if (src.affix.has('poison')) { p.poisonT = 3; p.poisonDps = Math.max(2, src.def.atk * 0.12); }
    }
    p.invuln = 1.1; p.hurtT = 0.3;
    p.vx = dir * 150; p.vy = -170;
    this.floatText(p.cx, p.y - 4, dmg, '#c86aff', false, false, true);
    this.shakeT = 0.15;
    if (ch.hp <= 0) this.playerDie();
    this.hooks.changed('bars');
  }

  respawn() {
    const p = this.player;
    p.dead = false; p.invuln = 2;
    this.ch.hp = Math.floor(this.stats.maxHp * GAME.player.respawnHpMp);
    this.ch.mp = Math.floor(this.stats.maxMp * GAME.player.respawnHpMp);
    this.loadMap('village', MAPS.village.spawnX);
    this.hooks.changed();
    this.hooks.save();
  }

  usePotion(kind) {
    const ch = this.ch, p = this.player;
    if (p.dead || (p.cooldowns._pot || 0) > 0) return;
    const st = this.stats;
    let ids = kind === 'hp' ? ['hp_s', 'hp_l'] : ['mp_s', 'mp_l'];
    const missing = kind === 'hp' ? st.maxHp - ch.hp : st.maxMp - ch.mp;
    if (missing > (kind === 'hp' ? 150 : 100)) ids = ids.reverse();
    const id = ids.find((x) => countItem(ch, x) > 0);
    if (!id) { this.hooks.toast(kind === 'hp' ? 'Hết bình máu' : 'Hết bình linh khí', 'warn'); p.cooldowns._pot = 0.5; return; }
    this.hooks.useItemById(id);
    p.cooldowns._pot = 0.35;
  }

  applyConsumable(it) {
    const ch = this.ch, p = this.player, st = this.stats;
    if (it.heal) {
      if (it.heal.hp) { ch.hp = Math.min(st.maxHp, ch.hp + it.heal.hp); this.floatText(p.cx, p.y - 4, '+' + it.heal.hp, '#ff7a8a'); }
      if (it.heal.mp) { ch.mp = Math.min(st.maxMp, ch.mp + it.heal.mp); this.floatText(p.cx, p.y - 4, '+' + it.heal.mp, '#7ab0ff'); }
      this.addFx('aura', p.cx, p.cy, 0.4, { color: it.heal.hp ? '#ff7a8a' : '#7ab0ff', small: true });
    }
    if (it.home) this.timers.push({ t: 0.2, fn: () => this.goHome() });
  }

  // ================= PROJECTILES / AREAS / DROPS =================
  updateProjectiles(dt) {
    const p = this.player;
    for (const pr of this.projs) {
      pr.t += dt;
      if (pr.homing) this.steerHoming(pr, dt);
      if (pr.life && pr.t > pr.life) { pr.alive = false; continue; }
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      pr.dist = (pr.dist || 0) + Math.hypot(pr.vx, pr.vy) * dt;
      if (pr.dist > pr.range || pr.x < -40 || pr.x > this.map.width + 40 || pr.y > GROUND_Y + 10) { pr.alive = false; continue; }
      if (pr.owner === 'monster') {
        if (!p.dead && overlap(pr, p)) { this.hurtPlayer(pr.atk, pr.vx > 0 ? 1 : -1, pr.el, pr.src); pr.alive = false; }
        continue;
      }
      for (const m of this.monsters) {
        if (m.dead || pr.hit.has(m) || !overlap(pr, m)) continue;
        if (pr.homing && pr.target && m !== pr.target) continue; // homing orbs only hit what they chase
        pr.hit.add(m);
        this.damageMonster(m, pr.mult, pr.owner, pr.atk, pr.botName, pr.el, { sid: pr.sid });
        if (pr.kind === 'thunderorb') {
          this.addFx('lightning', m.cx, m.y + m.h, 0.18, {});
          this.burst(pr.x + pr.w / 2, pr.y + pr.h / 2, '#bfe0ff', 8, 90, { shape: 'star', drag: 0.9 });
          this.shakeT = Math.max(this.shakeT || 0, 0.05);
        }
        this.addFx('spark', pr.x + pr.w / 2, pr.y + pr.h / 2, 0.2, { color: pr.kind === 'fire' ? '#ffa02a' : '#fff2a0' });
        if (!pr.pierce || pr.hit.size >= pr.maxTargets) { pr.alive = false; break; }
      }
    }
    this.projs = this.projs.filter((x) => x.alive);
  }

  updateZones(dt) {
    for (const z of this.zones) {
      z.t += dt; z.tickT -= dt;
      if (z.tickT <= 0) {
        z.tickT = z.tick;
        for (const m of this.monsters) {
          if (m.dead) continue;
          if (Math.hypot(m.cx - z.x, m.cy - z.y) < z.r + m.w / 2) {
            if (m.remote) this.damageMonster(m, z.mult, 'player', undefined, undefined, z.el || 'poison', { sid: z.sid }); // the server adds the poison
            else {
              this.damageMonster(m, z.mult, 'player', undefined, undefined, z.el || 'poison');
              if (!m.dead) { m.poison = 2; m.poisonDmg = z.mult * 0.3; }
            }
          }
        }
      }
    }
    this.zones = this.zones.filter((z) => z.t < z.dur);
  }

  updateDrops(dt) {
    const p = this.player;
    for (const d of this.drops) {
      d.t += dt;
      if (!d.onGround) { stepBody(d, dt, this.map.platforms, this.map.width); if (d.onGround) d.vx = 0; }
      if (d.t > 0.45 && !p.dead && !d.taken && overlap({ x: p.x - 6, y: p.y, w: p.w + 12, h: p.h }, d)) this.pickupDrop(d, p.cx, p.y);
    }
    if (this.pet) this.pet.update(dt);
    this.drops = this.drops.filter((d) => !d.taken && d.t < d.life);
  }

  // Is there room in the bag for this drop?
  canTake(d) {
    if (d.kind === 'gold') return true;
    const it = ITEMS[d.data.id];
    if (it.type !== 'equip' && this.ch.inventory.some((e) => e.id === d.data.id)) return true;
    return this.ch.inventory.length < INV_SIZE;
  }

  // Pick up an item (player or pet). Returns true if it was picked up.
  pickupDrop(d, tx, ty) {
    if (d.taken) return false;
    if (d.sid) {
      // a server drop: ask the server; it commits the item and sends it back as an item change
      if (d.retryAt && this.time < d.retryAt) return false;
      if (!this.canTake(d)) { if (!d.warned) { d.warned = true; this.hooks.toast('Túi đồ đã đầy', 'warn'); } return false; }
      if (!this.net || !this.net.pick(d.sid)) return false;
      d.taken = true;
      this.pendingPicks.set(d.sid, d);
      return true;
    }
    if (d.kind === 'gold') {
      this.ch.gold += d.data;
      this.floatText(tx, ty - 8, `+${d.data} lượng`, '#ffd84a', false, true);
      d.taken = true;
    } else {
      const ok = addItem(this.ch, d.data.id, d.data.qty, d.data.r, d.data.b);
      if (ok) {
        d.taken = true; this.hooks.gotItem(d.data);
        if (isRareDrop(d.data)) this.hooks.save(); // valuable loot is saved right away (queued, in the background)
      }
      else if (!d.warned) { d.warned = true; this.hooks.toast('Túi đồ đã đầy', 'warn'); }
    }
    if (d.taken) this.hooks.changed('inv');
    return d.taken;
  }

  // Summon or dismiss the pet
  setPet(on) {
    if (!this.ch.pet) return;
    this.ch.pet.on = on;
    if (on && !this.pet) { this.pet = new Pet(this); this.addFx('poof', this.pet.x, this.pet.y, 0.5, { color: '#e8dcff' }); }
    if (!on && this.pet) { this.addFx('poof', this.pet.x, this.pet.y, 0.5, { color: '#e8dcff' }); this.pet = null; }
  }

  // ================= EFFECTS =================
  addFx(kind, x, y, dur, data) { this.effects.push({ kind, x, y, t: 0, dur, data }); }

  // Particles: o = { vx, vy, life, size, color, grav, drag, shape: 'dot'|'star'|'petal', glow }
  spark(x, y, o = {}) {
    if (this.particles.length > (o.weather ? 260 : 480)) return;
    this.particles.push({ x, y, vx: 0, vy: 0, t: 0, life: 0.6, size: 2, color: '#fff', grav: 0, drag: 0.9, shape: 'dot', glow: true, spin: rand(-6, 6), ...o });
  }

  burst(x, y, color, n = 8, speed = 70, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(speed * 0.4, speed);
      this.spark(x, y, { vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.2, color, life: rand(0.3, 0.6), size: rand(1.5, 3), ...o });
    }
  }

  // Weather per region: snowfall, fireflies, embers, ice crystals
  updateWeather(dt) {
    const th = this.map.theme, cx = this.camX;
    const rate = { snow: 34, swamp: 4, forest: 2.5, icecave: 6, volcano: 12, hell: 6, temple: 9 }[th];
    if (!rate) return;
    let n = rate * dt;
    while (n > 0) {
      if (Math.random() >= n) break;
      n -= 1;
      const x = cx + rand(-20, VIEW_W + 20);
      if (th === 'snow') this.spark(x, -6, { vx: rand(-14, 6), vy: rand(22, 42), color: '#ffffff', size: rand(1.2, 2.8), life: 9, glow: false, drag: 1, shape: 'dot', weather: true });
      else if (th === 'swamp' || th === 'forest') this.spark(x, rand(120, 290), { vx: rand(-10, 10), vy: rand(-8, 8), color: th === 'swamp' ? '#d8ff7a' : '#9affd8', size: rand(1.2, 2.2), life: rand(2.5, 4.5), drag: 1, shape: 'dot', weather: true });
      else if (th === 'temple') { // red ash rising and petals falling
        if (Math.random() < 0.4) this.spark(x, -6, { vx: rand(-16, 4), vy: rand(16, 30), color: pick(['#ff8a9a', '#e04a5a', '#ffc0c8']), size: rand(1.6, 2.8), life: 10, glow: false, drag: 1, shape: 'petal', weather: true });
        else this.spark(x, VIEW_H - rand(0, 60), { vx: rand(-8, 8), vy: rand(-36, -18), color: pick(['#ff4a5a', '#ff9aa8']), size: rand(1, 2), life: rand(2.5, 4), drag: 1, shape: 'dot', weather: true });
      }
      else if (th === 'icecave') this.spark(x, rand(40, 290), { vx: 0, vy: rand(-4, 4), color: '#bfe8ff', size: rand(1, 2.4), life: rand(1, 2), drag: 1, shape: 'star', weather: true });
      else this.spark(x, VIEW_H - rand(0, 40), { vx: rand(-10, 10), vy: rand(-50, -25), color: Math.random() < 0.5 ? '#ffb040' : '#ff6a2a', size: rand(1, 2.4), life: rand(2, 4), drag: 1, shape: 'dot', weather: true });
    }
  }

  updateParticles(dt) {
    this.updateWeather(dt);
    for (const p of this.particles) {
      p.t += dt;
      p.vy += p.grav * dt;
      const dr = Math.pow(p.drag, dt * 60);
      p.vx *= dr; p.vy *= dr;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.t < p.life);
    // projectile trails
    for (const pr of this.projs) {
      const tr = PROJ_TRAIL[pr.kind];
      if (!tr || Math.random() > tr[2]) continue;
      this.spark(pr.x + pr.w / 2 + rand(-3, 3), pr.y + pr.h / 2 + rand(-3, 3), {
        vx: -pr.vx * 0.08 + rand(-12, 12), vy: rand(-18, 8), color: pick(tr[0]), size: rand(1, tr[1]), life: rand(0.25, 0.5), shape: pr.kind === 'talisman' ? 'star' : 'dot',
      });
    }
    // sparkles around the player while a buff is active
    const p = this.player;
    const aura = p.look && p.look.aura;
    if (aura && !p.dead && Math.random() < dt * 10) {
      this.spark(p.cx + rand(-12, 12), p.y + p.h - rand(0, 4), { vy: rand(-45, -20), vx: rand(-6, 6), color: aura, size: rand(1, 2.2), life: rand(0.7, 1.2), drag: 0.98, shape: ['#9fffd8', '#ffc0d8', '#fff0f6'].includes(aura) ? 'petal' : 'star' });
    }
    for (const b of p.buffs) {
      if (Math.random() < dt * 9) {
        const col = '#ffe27a';
        this.spark(p.cx + rand(-10, 10), p.y + p.h - rand(0, 6), { vy: rand(-40, -25), vx: rand(-4, 4), color: col, size: rand(1, 2.4), life: rand(0.6, 1), drag: 0.98, shape: 'star' });
      }
    }
    // bubbling poison cloud
    for (const z of this.zones) {
      if (Math.random() < dt * 14) this.spark(z.x + rand(-z.r, z.r) * 0.7, z.y + rand(-6, 10), { vy: rand(-30, -14), color: pick(['#8fe06a', '#c4ff7a', '#5ab84a']), size: rand(1.5, 3.5), life: rand(0.5, 0.9), drag: 0.97, glow: false, shape: 'bubble' });
    }
  }

  drawParticles(ctx, cam) {
    ctx.save();
    for (const p of this.particles) {
      const k = p.t / p.life;
      ctx.globalAlpha = Math.max(0, 1 - k * k);
      ctx.globalCompositeOperation = p.glow ? 'lighter' : 'source-over';
      const x = p.x - cam, y = p.y, s = p.size * (1 - k * 0.5);
      ctx.fillStyle = p.color;
      if (p.shape === 'star') {
        ctx.fillRect(x - s * 1.5, y - 0.5, s * 3, 1); ctx.fillRect(x - 0.5, y - s * 1.5, 1, s * 3);
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      } else if (p.shape === 'bubble') {
        ctx.strokeStyle = p.color; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, s, 0, 7); ctx.stroke();
      } else if (p.shape === 'petal') {
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.t * p.spin);
        ctx.beginPath(); ctx.ellipse(0, 0, s * 1.6, s * 0.7, 0, 0, 7); ctx.fill(); ctx.restore();
      } else {
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
    }
    ctx.restore();
  }
  floatText(x, y, text, color, big = false, small = false, hurt = false) {
    this.texts.push({ x: x + rand(-4, 4), y, text: String(text), color, big, small, hurt, t: 0 });
  }

  // ================= DRAWING =================
  render(ctx) {
    const cam = Math.round(this.camX + (this.shakeT > 0 ? rand(-3, 3) : 0));
    const g = this.gfx;
    drawLayer(ctx, g.sky, 0);
    drawLayer(ctx, g.far.img, -this.camX * g.far.factor);
    drawLayer(ctx, g.mid.img, -this.camX * g.mid.factor);
    drawLayer(ctx, g.fg, -cam);
    const t = this.time;
    for (const pt of this.portals) {
      const locked = pt.lock && questStatus(this.ch, pt.lock) !== 'done';
      drawPortal(ctx, pt.x - cam, GROUND_Y, t, locked ? '#8a6a6a' : pt.color);
      if (locked) this.drawSeal(ctx, pt.x - cam, GROUND_Y - 22);
    }

    // poison areas
    for (const z of this.zones) {
      const a = Math.min(1, (z.dur - z.t) * 2) * 0.55;
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = `rgba(110,220,90,${a * 0.5})`;
        ctx.beginPath(); ctx.arc(z.x - cam + Math.sin(t * 2 + i * 1.3) * z.r * 0.5, z.y + Math.cos(t * 1.7 + i) * 10, z.r * 0.45, 0, 7); ctx.fill();
      }
    }
    for (const n of this.npcs) n.draw(ctx, cam);
    // drops
    for (const d of this.drops) {
      const bob = d.onGround ? Math.sin(t * 4 + d.x) * 1.5 : 0;
      const blink = d.life - d.t < 6 && Math.floor(t * 6) % 2;
      if (blink) continue;
      let ic;
      if (d.kind === 'gold') ic = itemIcon('gold', '#e8c35a').canvas;
      else ic = iconForItem(ITEMS[d.data.id]).canvas;
      if (d.kind === 'item' && d.data.rare) { // light pillar for rare drops
        const bx = d.x + 6 - cam, a = 0.35 + Math.sin(t * 5) * 0.12;
        const g = ctx.createLinearGradient(0, d.y - 90, 0, d.y + 10);
        g.addColorStop(0, 'rgba(255,215,90,0)'); g.addColorStop(1, `rgba(255,215,90,${a})`);
        ctx.fillStyle = g; ctx.fillRect(bx - 7, d.y - 90, 14, 100);
        if (Math.random() < 0.3) this.spark(d.x + 6 + rand(-6, 6), d.y + 4, { vy: rand(-60, -30), vx: 0, color: '#ffe27a', size: rand(1, 2.2), life: 0.9, shape: 'star', drag: 1 });
      }
      if (d.kind === 'item' && d.data.r > 0) {
        const col = ['#fff', '#5aa7ff', '#c07bff', '#ffc23d'][d.data.r];
        ctx.fillStyle = col + '55'; ctx.beginPath(); ctx.arc(d.x + 6 - cam, d.y + 6 + bob, 9, 0, 7); ctx.fill();
      }
      ctx.drawImage(ic, d.x - 2 - cam, d.y - 4 + bob, 16, 16);
    }
    for (const m of this.monsters) m.draw(ctx, cam, t);
    this.bots.render(ctx, cam);
    const tradeHint = this.net && !this.trading ? this.nearestRemote() : null;
    for (const r of this.remotes.values()) {
      r.draw(ctx, cam);
      this.nameTag(ctx, r.name, r.cx - cam, r.y + r.h + 10, '#ffe08a', 8, true);
      if (r === tradeHint) this.nameTag(ctx, this.party && this.party.members.some((x) => x.id === r.id) ? 'T · Giao dịch' : 'T · Giao dịch  ·  G · Mời tổ đội', r.cx - cam, r.y + r.h + 19, '#bfe6ff', 7);
      if (this.party && this.party.members.some((x) => x.id === r.id)) this.nameTag(ctx, '◆ Tổ đội', r.cx - cam, r.y - (r.title ? 34 : 24) + (r.say ? -10 : 0), '#8fe8a0', 7);
      if (r.title) this.nameTag(ctx, '「' + r.title + '」', r.cx - cam, r.y - 24, '#ffd36a', 7);
      if (r.say) this.bubble(ctx, r.say.text, r.cx - cam, r.y - (r.title ? 34 : 24));
    }
    const p = this.player;
    const look = p.look || {};
    if (look.aura && !p.dead) { // outfit aura
      const g = ctx.createRadialGradient(p.cx - cam, p.y + p.h - 2, 2, p.cx - cam, p.y + p.h - 2, 26);
      g.addColorStop(0, rgbaHex(look.aura, 0.35 + Math.sin(t * 3) * 0.1)); g.addColorStop(1, rgbaHex(look.aura, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(p.cx - cam, p.y + p.h - 2, 26, 8, 0, 0, Math.PI * 2); ctx.fill();
    }
    const blinkP = p.invuln > 0 && !p.dead && Math.floor(t * 20) % 2;
    if (look.ribbons && !p.dead && !blinkP) this.drawRibbons(ctx, p, cam, look.ribbons, false);
    if (!blinkP) p.draw(ctx, cam, p.dead ? 0.5 : 1);
    if (look.ribbons && !p.dead && !blinkP) this.drawRibbons(ctx, p, cam, look.ribbons, true);
    if (look.wisps && !p.dead) for (let i = 0; i < 2; i++) { // two will-o'-wisps circling around
      const a = t * 2.2 + i * Math.PI, wx = p.cx - cam + Math.cos(a) * 18, wy = p.cy - 6 + Math.sin(a * 1.3) * 7;
      const g = ctx.createRadialGradient(wx, wy, 0.5, wx, wy, 6);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, rgbaHex(look.wisps, 0.9)); g.addColorStop(1, rgbaHex(look.wisps, 0));
      ctx.fillStyle = g; ctx.fillRect(wx - 6, wy - 6, 12, 12);
    }
    if (p.dashT > 0) { ctx.globalAlpha = 0.3; p.draw(ctx, cam + p.dashVx * 0.03); ctx.globalAlpha = 1; }
    if (this.pet) this.pet.draw(ctx, cam);
    // projectiles: glow behind first, then the sprite
    for (const pr of this.projs) {
      const ps = projSprite(pr.kind);
      const glow = PROJ_GLOW[pr.kind];
      if (glow) {
        const gx = pr.x + pr.w / 2 - cam, gy = pr.y + pr.h / 2;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const rg = ctx.createRadialGradient(gx, gy, 1, gx, gy, glow[1]);
        rg.addColorStop(0, glow[0]); rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg; ctx.fillRect(gx - glow[1], gy - glow[1], glow[1] * 2, glow[1] * 2);
        ctx.restore();
      }
      ctx.save();
      ctx.translate(pr.x + pr.w / 2 - cam, pr.y + pr.h / 2);
      if (pr.kind === 'dart') ctx.rotate(pr.t * 25);
      else if (pr.kind === 'thunderorb') ctx.rotate(pr.t * 9);
      else if (pr.vx < 0) ctx.scale(-1, 1);
      ctx.drawImage(ps.img, -ps.w / 2, -ps.h / 2, ps.w, ps.h);
      ctx.restore();
    }
    for (const e of this.effects) this.drawFx(ctx, e, cam);
    this.drawParticles(ctx, cam);
    // name & HP bar
    ctx.textAlign = 'center';
    for (const m of this.monsters) {
      if (m.dead) continue;
      const showHp = m.hp < m.maxHp || m.aggro;
      if (m.def.boss) continue;
      if (showHp && !m.named) {
        const bw = Math.max(24, m.w);
        ctx.fillStyle = 'rgba(10,6,12,0.75)'; ctx.fillRect(Math.round(m.cx - bw / 2 - cam) - 1, Math.round(m.y - 7), bw + 2, 4);
        ctx.fillStyle = '#e8443a'; ctx.fillRect(Math.round(m.cx - bw / 2 - cam), Math.round(m.y - 6), Math.round(bw * m.hp / m.maxHp), 2);
        if (m.shield > 0) { ctx.fillStyle = '#ffd84a'; ctx.fillRect(Math.round(m.cx - bw / 2 - cam), Math.round(m.y - 7), Math.round(bw * m.shield / m.maxShield), 1); }
      }
      const danger = this.ch.level < m.def.lv - 2;
      const col = m.named ? '#ff9a6a' : m.chief ? '#ffa04a' : m.elite ? '#ffd84a' : danger ? '#ff8a7a' : '#d8d4cc';
      this.nameTag(ctx, `Lv.${m.def.lv} ${m.chief ? '♛ ' : m.elite ? '★ ' : ''}${m.def.name}`, m.cx - cam, m.y + m.h + 9, col, m.named || m.chief ? 8 : 7, m.elite || m.chief || !!m.named);
      if (m.affix.size && (m.elite || m.named || (m.aggro && dist2(m, p) < 220))) this.affixTags(ctx, m, m.cx - cam, m.y + m.h + 18);
    }
    for (const n of this.npcs) {
      this.nameTag(ctx, n.npc.name, n.cx - cam, n.y + n.h + 10, '#ffd36a', 8);
      const mk = npcMarker(this.ch, n.id);
      if (mk && !n.say) this.drawMarker(ctx, mk, n.cx - cam, n.y - 26);
      if (n.say) this.bubble(ctx, n.say.text, n.cx - cam, n.y - 24);
    }
    this.nameTag(ctx, this.ch.name, p.cx - cam, p.y + p.h + 10, '#ffffff', 8, true);
    if (this.ch.title) this.nameTag(ctx, '「' + this.ch.title + '」', p.cx - cam, p.y - 24, '#ffd36a', 7);
    if (this.pet) this.pet.drawLabel(ctx, cam);
    if (p.say) this.bubble(ctx, p.say.text, p.cx - cam, p.y - (this.ch.title ? 34 : 24));
    // interaction hint
    if (this.nearPortal && !p.dead) {
      const lk = this.nearPortal.lock && questStatus(this.ch, this.nearPortal.lock) !== 'done';
      this.hint(ctx, lk ? `🔒 ${this.nearPortal.label} · Phong ấn` : `↑  ${this.nearPortal.label}`, this.nearPortal.x - cam, GROUND_Y - 66);
    }
    else if (this.nearNpc && !p.dead) this.hint(ctx, 'E / ↑  Nói chuyện', this.nearNpc.cx - cam, this.nearNpc.y - 38);
    // damage numbers
    for (const tx of this.texts) {
      const k = tx.t / 1.1;
      ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
      const size = tx.big ? 15 : tx.small ? 8 : 11;
      const sc = tx.t < 0.08 ? 1.5 - tx.t * 6 : 1;
      ctx.font = `900 ${Math.round(size * sc)}px "Be Vietnam Pro", system-ui, sans-serif`;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,8,16,0.9)';
      ctx.strokeText(tx.text, tx.x - cam, tx.y);
      ctx.fillStyle = tx.color; ctx.fillText(tx.text, tx.x - cam, tx.y);
      ctx.globalAlpha = 1;
    }
    // player debuffs
    const sts = [];
    if (p.poisonT > 0) sts.push(['☠ Trúng độc', '#8fe06a']);
    if (p.slowT > 0) sts.push(['❄ Chậm', '#9fd8ff']);
    sts.forEach(([txt, c], i) => this.nameTag(ctx, txt, p.cx - cam, p.y - (this.ch.title ? 44 : 34) - i * 10, c, 7));
    // boss HP bar (named bosses included)
    const boss = this.monsters.find((m) => (m.def.boss || m.named || m.chief) && !m.dead && m.aggro) || this.monsters.find((m) => m.def.boss && !m.dead);
    if (boss && boss.aggro) {
      const bw = 300, bx = (VIEW_W - bw) / 2, by = 74;
      ctx.fillStyle = 'rgba(10,4,8,0.85)'; ctx.fillRect(bx - 3, by - 3, bw + 6, 12);
      ctx.fillStyle = '#3a0a14'; ctx.fillRect(bx, by, bw, 6);
      ctx.fillStyle = '#e8304a'; ctx.fillRect(bx, by, bw * boss.hp / boss.maxHp, 6);
      ctx.fillStyle = '#ff8a9a'; ctx.fillRect(bx, by, bw * boss.hp / boss.maxHp, 1);
      ctx.font = '700 9px "Be Vietnam Pro", system-ui, sans-serif';
      ctx.fillStyle = '#ffd36a'; ctx.textAlign = 'center';
      ctx.fillText(`${boss.named || boss.chief ? 'Lv.' + boss.def.lv + ' ' : ''}${boss.def.name}  ·  ${Math.ceil(boss.hp)} / ${boss.maxHp}`, VIEW_W / 2, by - 6);
      if (boss.shield > 0) { ctx.fillStyle = '#ffd84a'; ctx.fillRect(bx, by + 7, bw * boss.shield / boss.maxShield, 2); }
      if (boss.affix.size) this.affixTags(ctx, boss, VIEW_W / 2, by + 18);
    }
    // dim overlay on death
    if (p.dead) { ctx.fillStyle = 'rgba(20,0,10,0.45)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
  }

  // Trait tags under monster names
  affixTags(ctx, m, x, y) {
    const tags = [...m.affix].map((a) => AFFIXES[a]);
    ctx.font = '700 6.5px "Be Vietnam Pro", system-ui, sans-serif';
    const widths = tags.map((a) => ctx.measureText(a.name).width + 6);
    let cx = x - (widths.reduce((a, b) => a + b, 0) + (tags.length - 1) * 2) / 2;
    ctx.textAlign = 'center';
    tags.forEach((a, i) => {
      const w = widths[i];
      ctx.fillStyle = 'rgba(10,6,12,0.8)'; ctx.fillRect(Math.round(cx), Math.round(y - 6), Math.round(w), 8);
      ctx.fillStyle = a.color; ctx.fillRect(Math.round(cx), Math.round(y - 6), 1, 8);
      ctx.fillText(a.name, cx + w / 2, y);
      cx += w + 2;
    });
  }

  // Fairy ribbons circling the body: back half drawn before the character, front half after, two ribbon tails flowing in the wind
  drawRibbons(ctx, p, cam, rb, front) {
    const t = this.time, cx = p.cx - cam, cy = p.y + p.h * 0.5;
    const moving = Math.abs(p.vx) > 5;
    const pt = (a) => {
      const wave = Math.sin(a * 2 + t * 2.4) * 2.2;
      return [cx + Math.cos(a) * (21 + Math.sin(a * 3 + t * 1.7) * 2), cy + 1 + Math.sin(a) * 6 + wave - Math.cos(a) * 3];
    };
    const band = (a0, a1, w0) => {
      const n = 18;
      const top = [], bot = [];
      for (let i = 0; i <= n; i++) {
        const a = a0 + (a1 - a0) * i / n, [x, y] = pt(a);
        const w = w0 * (0.55 + 0.45 * Math.sin(a * 2 + t * 3) ** 2);
        top.push([x, y - w]); bot.push([x, y + w]);
      }
      const path = new Path2D();
      top.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
      for (let i = bot.length - 1; i >= 0; i--) path.lineTo(bot[i][0], bot[i][1]);
      path.closePath();
      const g = ctx.createLinearGradient(cx - 22, 0, cx + 22, 0);
      g.addColorStop(0, rbg(rb.c1, front ? 0.92 : 0.7)); g.addColorStop(0.5, rbg(rb.c2, front ? 0.95 : 0.72)); g.addColorStop(1, rbg(rb.c1, front ? 0.92 : 0.7));
      ctx.fillStyle = g; ctx.fill(path);
      ctx.strokeStyle = rbg('#d8a0b8', front ? 0.55 : 0.35); ctx.lineWidth = 0.5; ctx.stroke(path);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 0.6) : ctx.moveTo(x, y + 0.6))); ctx.stroke();
    };
    ctx.save();
    // ribbon loop: a ∈ (0, π) is the half in front of the body
    if (front) band(0.05, Math.PI - 0.05, 1.7);
    else {
      // ribbon arch curving behind the head, both ends hanging down to elbow height
      const arch = new Path2D(), sway = Math.sin(t * 1.8) * 1.5;
      arch.moveTo(cx - 17, cy + 4);
      arch.bezierCurveTo(cx - 30 + sway, cy - 46, cx + 30 + sway, cy - 46, cx + 17, cy + 4);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = rbg('#d8a0b8', 0.45); ctx.lineWidth = 3.6; ctx.stroke(arch);
      const ga = ctx.createLinearGradient(0, cy - 34, 0, cy + 4);
      ga.addColorStop(0, rbg(rb.c2, 0.85)); ga.addColorStop(1, rbg(rb.c1, 0.85));
      ctx.strokeStyle = ga; ctx.lineWidth = 2.6; ctx.stroke(arch);
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 0.7; ctx.stroke(arch);
      ctx.restore();
      band(Math.PI + 0.05, Math.PI * 2 - 0.05, 1.5);
      // two ribbon tails flowing behind the back
      const dir = -p.facing;
      for (let k = 0; k < 2; k++) {
        const sx = cx + dir * 14, sy = cy + 2 + k * 5;
        const len = moving ? 34 : 24;
        const path = new Path2D();
        const pts = [];
        for (let i = 0; i <= 12; i++) {
          const u = i / 12;
          pts.push([sx + dir * u * len, sy + u * (moving ? 2 : 14) + Math.sin(u * 5 - t * 5 + k * 1.5) * 3 * u]);
        }
        const wd = (i) => 1.5 * (1 - (i / 12) * 0.6); // ribbon tail tapers off
        pts.forEach(([x, y], i) => (i ? path.lineTo(x, y - wd(i)) : path.moveTo(x, y - wd(i))));
        for (let i = pts.length - 1; i >= 0; i--) path.lineTo(pts[i][0], pts[i][1] + wd(i));
        path.closePath();
        ctx.fillStyle = rbg(k ? rb.c1 : rb.c2, 0.85); ctx.fill(path);
        ctx.strokeStyle = rbg('#d8a0b8', 0.4); ctx.lineWidth = 0.5; ctx.stroke(path);
      }
    }
    ctx.restore();
  }

  // Seal on a portal that is not open yet
  drawSeal(ctx, x, y) {
    ctx.save();
    ctx.strokeStyle = 'rgba(200,170,120,0.85)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 14, y - 16); ctx.lineTo(x + 14, y + 16); ctx.moveTo(x + 14, y - 16); ctx.lineTo(x - 14, y + 16); ctx.stroke();
    ctx.fillStyle = '#f0d070'; ctx.fillRect(x - 5, y - 9, 10, 18);
    ctx.strokeStyle = '#c42020'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 3, y - 6); ctx.lineTo(x + 3, y - 6); ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 6); ctx.moveTo(x - 3, y + 1); ctx.quadraticCurveTo(x, y + 4, x + 3, y); ctx.stroke();
    ctx.restore();
  }

  // ! marker (new quest, gold; !! = story, red) and ? (turn in) bouncing above NPCs
  drawMarker(ctx, mk, x, y) {
    const bob = Math.sin(this.time * 4) * 2;
    const story = mk === '!!';
    const col = mk === '?' ? '#7dff9a' : story ? '#ff8a5a' : mk === '!t' ? '#6ae0ff' : '#ffd84a';
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, 1, 7, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.font = '900 13px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = '#2a1408';
    const t = mk === '?' ? '?' : '!';
    ctx.strokeText(t, 0, 6); ctx.fillStyle = col; ctx.fillText(t, 0, 6);
    if (story) { ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.globalAlpha = 0.6 + Math.sin(this.time * 6) * 0.3; ctx.beginPath(); ctx.arc(0, 1, 9, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }

  nameTag(ctx, text, x, y, color, size = 8, bold = false) {
    ctx.font = `${bold ? 700 : 600} ${size}px "Be Vietnam Pro", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    const w = ctx.measureText(text).width + 6;
    ctx.fillStyle = 'rgba(8,6,14,0.62)';
    ctx.fillRect(Math.round(x - w / 2), Math.round(y - size + 1), Math.round(w), size + 3);
    ctx.fillStyle = color;
    ctx.fillText(text, Math.round(x), Math.round(y + 1));
  }

  bubble(ctx, text, x, y) {
    ctx.font = '600 8px "Be Vietnam Pro", system-ui, sans-serif';
    const words = text.split(' ');
    const lines = []; let line = '';
    for (const w of words) { const t2 = line ? line + ' ' + w : w; if (ctx.measureText(t2).width > 110 && line) { lines.push(line); line = w; } else line = t2; }
    lines.push(line);
    const w = Math.min(120, Math.max(...lines.map((l) => ctx.measureText(l).width))) + 10;
    const h = lines.length * 10 + 6;
    const bx = Math.round(x - w / 2), by = Math.round(y - h - 4);
    ctx.fillStyle = 'rgba(250,246,236,0.95)';
    ctx.fillRect(bx, by, w, h);
    ctx.fillRect(Math.round(x - 2), by + h, 4, 3);
    ctx.fillStyle = '#2a2230'; ctx.textAlign = 'center';
    lines.forEach((l, i) => ctx.fillText(l, Math.round(x), by + 10 + i * 10));
  }

  hint(ctx, text, x, y) {
    const a = 0.7 + Math.sin(this.time * 5) * 0.3;
    ctx.globalAlpha = a;
    this.nameTag(ctx, text, x, y, '#bff6ff', 8, true);
    ctx.globalAlpha = 1;
  }

  drawFx(ctx, e, cam) {
    const k = e.t / e.dur, x = e.x - cam, y = e.y, d = e.data;
    ctx.save();
    switch (e.kind) {
      case 'danger': { // red warning ring before exploding
        const pulse = 0.5 + Math.sin(e.t * 22) * 0.5;
        ctx.fillStyle = `rgba(255,60,40,${0.12 + pulse * 0.16})`;
        ctx.beginPath(); ctx.ellipse(x, y, d.r, d.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(255,120,60,${0.6 + pulse * 0.4})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(x, y, d.r * k, d.r * 0.6 * k, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(x, y, d.r, d.r * 0.6, 0, 0, Math.PI * 2); ctx.stroke();
        break;
      }
      case 'slash': { // crescent-shaped slash trail
        const r = d.big ? 26 : 21;
        const off = ((d.i || 0) % 2 ? -0.5 : 0.35);
        const grow = 0.55 + Math.min(1, k * 4) * 0.45;
        ctx.globalAlpha = (1 - k);
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(x - d.dir * 8, y);
        ctx.scale(d.dir, 1);
        ctx.rotate(off);
        const g = ctx.createLinearGradient(-r, 0, r, 0);
        const col = d.color || (d.big ? '#8fd0ff' : '#ffffff');
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.6, col); g.addColorStop(1, '#ffffff');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, r * grow, -1.25, 1.1);
        ctx.arc(-5, 1, r * grow - 3, 1.1, -1.25, true);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = (1 - k) * 0.35;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(0, 0, r * grow + 3, -1.1, 0.95); ctx.arc(-8, 1, r * grow - 6, 0.95, -1.1, true); ctx.fill();
        break;
      }
      case 'lightning': {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 1 - k;
        if (!d.pts) { d.pts = []; let ly = 0; while (ly < y) { ly = Math.min(y, ly + rand(10, 18)); d.pts.push([x + rand(-9, 9), ly]); } }
        for (const [w, c] of [[7, 'rgba(110,170,255,0.35)'], [3.5, '#a8d4ff'], [1.5, '#ffffff']]) {
          ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineJoin = 'round';
          ctx.beginPath(); ctx.moveTo(x, 0); for (const [px, py] of d.pts) ctx.lineTo(px, py); ctx.stroke();
        }
        const rg = ctx.createRadialGradient(x, y, 1, x, y, 30);
        rg.addColorStop(0, 'rgba(220,240,255,0.9)'); rg.addColorStop(1, 'rgba(120,170,255,0)');
        ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(x, y - 2, 30 * (1 - k * 0.5), 12, 0, 0, 7); ctx.fill();
        break;
      }
      case 'circle': { // magic circle under the feet when casting
        const a = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
        ctx.globalAlpha = a * 0.9;
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(x, y);
        ctx.scale(1, 0.32);
        const R0 = d.r || 26;
        ctx.strokeStyle = d.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, R0, 0, 7); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, R0 - 6, 0, 7); ctx.stroke();
        ctx.rotate(e.t * 2.4);
        ctx.beginPath();
        for (let i = 0; i <= 8; i++) { const ang = (i / 8) * Math.PI * 2; const rr = i % 2 ? R0 - 6 : R0 - 1; ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); }
        ctx.stroke();
        ctx.fillStyle = d.color;
        for (let i = 0; i < 8; i++) { const ang = (i / 8) * Math.PI * 2; ctx.fillRect(Math.cos(ang) * (R0 - 3) - 1.5, Math.sin(ang) * (R0 - 3) - 1.5, 3, 3); }
        break;
      }
      case 'ring': { // light ring bursting out on a heavy hit
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (1 - k) * 0.8;
        ctx.strokeStyle = d.color; ctx.lineWidth = 2 * (1 - k) + 0.5;
        ctx.beginPath(); ctx.arc(x, y, 4 + k * (d.r || 16), 0, 7); ctx.stroke();
        break;
      }
      case 'levelup': {
        ctx.globalAlpha = 1 - k;
        const gr = ctx.createLinearGradient(0, y - 120, 0, y);
        gr.addColorStop(0, 'rgba(255,220,120,0)'); gr.addColorStop(1, 'rgba(255,220,120,0.7)');
        ctx.fillStyle = gr; ctx.fillRect(x - 16, y - 120 * Math.min(1, k * 3), 32, 120 * Math.min(1, k * 3));
        ctx.font = '900 13px "Grenze Gotisch", serif'; ctx.textAlign = 'center';
        ctx.lineWidth = 3; ctx.strokeStyle = '#3a1a0a'; ctx.strokeText('THĂNG CẤP!', x, y - 54 - k * 20);
        ctx.fillStyle = '#ffd84a'; ctx.fillText('THĂNG CẤP!', x, y - 54 - k * 20);
        break;
      }
      case 'aura': {
        ctx.globalAlpha = (1 - k) * 0.8;
        ctx.strokeStyle = d.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x, y + 10, 10 + k * (d.small ? 10 : 22), 4 + k * 6, 0, 0, 7); ctx.stroke();
        for (let i = 0; i < 6; i++) { ctx.fillStyle = d.color; ctx.fillRect(x - 12 + i * 5, y + 10 - k * 30 - (i % 3) * 6, 2, 2); }
        break;
      }
      case 'poof': {
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = d.color;
        const n = d.big ? 16 : 8;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const r = k * (d.big ? 50 : 20);
          ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r - k * 8), 3, 3);
        }
        break;
      }
      case 'spark': {
        ctx.globalAlpha = 1 - k; ctx.fillStyle = d.color;
        for (let i = 0; i < 5; i++) { const a = i * 1.26; ctx.fillRect(x + Math.cos(a) * k * 12, y + Math.sin(a) * k * 12, 2, 2); }
        break;
      }
      case 'shock': {
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = '#ff5a6a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(x, y, 20 + k * 160, 6 + k * 10, 0, Math.PI, 0); ctx.stroke();
        break;
      }
      case 'afterimage': {
        ctx.globalAlpha = (1 - k) * 0.6;
        ctx.fillStyle = '#b06aff';
        const px = this.player.cx - cam, sx = d.x0 - cam;
        ctx.fillRect(Math.min(sx, px), y - 2, Math.abs(px - sx) + 2, 3);
        break;
      }
    }
    ctx.restore();
  }
}
