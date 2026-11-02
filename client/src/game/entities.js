// Game entities: player, monsters, bots, NPCs, drops, projectiles
import { GROUND_Y } from '../data/maps.js';
import { MONSTERS } from '../data/monsters.js';
import { CLASSES } from '../data/classes.js';
import { ITEMS } from '../data/items.js';
import { humanoidSheet, HUM_W, HUM_FEET } from '../gfx/humanoid.js';
import { monsterSheet } from '../gfx/monsters.js';
import { drawFrame } from '../gfx/draw.js';
import { clamp, rand, randInt } from '../engine/util.js';
import { GAME } from '../config.js';
import { MobState } from './mobsim.js';

export const JUMP_V = GAME.physics.botJumpV;
export const MOVE_SPEED = GAME.physics.moveSpeed;

// ===== Humanoid characters (shared by player, bots and NPCs) =====
export class Humanoid {
  constructor(x, y, look) {
    this.x = x; this.y = y; this.w = 14; this.h = 32;
    this.vx = 0; this.vy = 0; this.onGround = false; this.facing = 1;
    this.dropTimer = 0; this.standY = GROUND_Y;
    this.anim = 'idle'; this.animT = 0;
    this.atkT = 0; this.hurtT = 0;
    this.setLook(look);
  }
  setLook(look) { this.look = look; this.sheet = humanoidSheet(look); }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  updateAnim(dt) {
    this.animT += dt;
    let a;
    if (this.hurtT > 0) a = 'hurt';
    else if (this.atkT > 0) a = 'atk';
    else if (this.sitting) a = 'sit';
    else if (!this.onGround) a = 'jump';
    else if (Math.abs(this.vx) > 5) a = this.running && this.sheet.frames.run ? 'run' : 'walk';
    else a = 'idle';
    if (a !== this.anim) { this.anim = a; this.animT = 0; }
  }
  frameIndex() {
    const fr = this.sheet.frames[this.anim];
    if (this.anim === 'atk') return this.atkT > this.atkDur * 0.55 ? fr[0] : fr[1];
    const speed = this.anim === 'run' ? 13 : this.anim === 'walk' ? 9 : 2.2;
    return fr[Math.floor(this.animT * speed) % fr.length];
  }
  draw(ctx, camX, alpha = 1) {
    const f = this.frameIndex();
    const dx = this.x + this.w / 2 - HUM_W / 2 - camX;
    const dy = this.y + this.h - HUM_FEET;
    ctx.save();
    if (alpha < 1) ctx.globalAlpha = alpha;
    drawFrame(ctx, this.sheet, f, dx, dy, this.facing < 0);
    ctx.restore();
  }
}

export function lookFor(ch) {
  const c = CLASSES[ch.cls];
  const look = { ...c.look, weapon: c.weapon };
  const w = ch.equip.weapon && ITEMS[ch.equip.weapon.id];
  if (w) look.weaponColor = w.color;
  const hat = ch.equip.hat && ITEMS[ch.equip.hat.id];
  if (hat) { look.hat = hat.look; look.hatColor = hat.color; }
  const arm = ch.equip.armor && ITEMS[ch.equip.armor.id];
  if (arm && arm.lv >= 4) look.robe = arm.color;
  // outfit: recolors the clothes and adds details; a hood/crown/ears hides the normal hat
  const out = ch.equip.outfit && ITEMS[ch.equip.outfit.id];
  if (out && out.look) {
    Object.assign(look, out.look);
    if (out.look.hood || out.look.crown) delete look.hat;
  }
  return look;
}

// ===== Player =====
export class Player extends Humanoid {
  constructor(ch, x) {
    super(x, GROUND_Y - 32, lookFor(ch));
    this.ch = ch;
    this.cooldowns = {};
    this.buffs = [];
    this.invuln = 0;
    this.atkDur = 0.3;
    this.dead = false;
    this.regenT = 0;
  }
  refreshLook() { this.setLook(lookFor(this.ch)); }
}

// ===== Monsters =====
// State and AI live in mobsim.js (shared with the server); this adds the sprite and drawing.
export class Monster extends MobState {
  constructor(id, x, standY, range, spawnRef, opt = {}) {
    super(id, x, standY, range, spawnRef, opt);
    this.sheet = monsterSheet(id);
  }
  draw(ctx, camX, time) {
    const s = this.sheet;
    let frames = s.frames.walk;
    if (this.hurtT > 0) frames = s.frames.hurt;
    else if (this.attacking && s.frames.atk) frames = s.frames.atk;
    else if (Math.abs(this.vx) < 3 && this.def.behavior !== 'float') frames = s.frames.idle;
    const f = frames[Math.floor(this.animT * 7) % frames.length];
    const sc = this.scale;
    const cx = this.cx - camX;
    let by = this.y + this.h + 2;
    if (this.floaty) by += Math.sin(time * 3 + this.homeX) * 3;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    // glow for Elite / named monsters
    if (this.elite || this.named || this.chief) {
      const col = this.named ? 'rgba(255,90,70,' : this.chief ? 'rgba(255,130,40,' : 'rgba(255,210,90,';
      const g = ctx.createRadialGradient(cx, by - this.h / 2, 2, cx, by - this.h / 2, this.h * 0.9);
      g.addColorStop(0, col + (0.28 + Math.sin(time * 4) * 0.08) + ')'); g.addColorStop(1, col + '0)');
      ctx.fillStyle = g; ctx.fillRect(cx - this.h, by - this.h * 1.5, this.h * 2, this.h * 2);
    }
    const filters = [];
    if (this.tint) filters.push(this.tint);
    if (this.poison > 0) filters.push('hue-rotate(80deg) saturate(1.4)');
    if (this.enraged) filters.push('sepia(0.5) saturate(2.4) hue-rotate(-30deg)');
    if (filters.length) ctx.filter = filters.join(' ');
    ctx.translate(cx, by); ctx.scale(sc, sc);
    drawFrame(ctx, s, f, -s.fw / 2, -s.fh, this.facing < 0);
    ctx.restore();
    // Guard shield / Reflect shimmer
    if (this.shield > 0 || this.affix.has('reflect')) {
      ctx.save();
      const ref = this.affix.has('reflect');
      ctx.strokeStyle = this.shield > 0 ? `rgba(255,216,74,${0.35 + 0.4 * this.shield / Math.max(1, this.maxShield)})` : `rgba(192,123,255,${0.25 + Math.sin(time * 5) * 0.15})`;
      ctx.lineWidth = ref && !(this.shield > 0) ? 1 : 1.6;
      ctx.beginPath(); ctx.ellipse(cx, this.cy, this.w * 0.7, this.h * 0.68, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }
}

// ===== Drops =====
export class Drop {
  constructor(x, y, kind, data) {
    this.x = x; this.y = y; this.w = 12; this.h = 12;
    this.vx = rand(-50, 50); this.vy = rand(-240, -170);
    this.onGround = false; this.dropTimer = 0;
    this.kind = kind; // 'item' | 'gold'
    this.data = data; // item: {id, qty, r, b} ; gold: amount of gold
    this.t = 0; this.life = GAME.loot.dropLifeSec;
  }
}

// ===== Projectiles =====
export class Projectile {
  constructor(o) { Object.assign(this, { w: 12, h: 10, t: 0, hit: new Set(), alive: true }, o); }
}

export class NPC extends Humanoid {
  constructor(id, def, x) {
    super(x, GROUND_Y - 32, def.look);
    this.id = id; this.npc = def; this.facing = -1;
    this.atkDur = 0.3;
  }
}

// ===== Other real players (multiplayer) =====
// Positions arrive about 10×/s; they are drawn `interpDelayMs` in the past and interpolated for smooth movement.
export class RemotePlayer extends Humanoid {
  constructor(p) {
    super(p.x, p.y, lookFor({ cls: p.cls, equip: {} }));
    this.id = p.id; this.name = p.name;
    this.buf = [];
    this.setAppearance(p);
    this.push(p);
    this.x = p.x; this.y = p.y;
  }
  // p: { cls, lv, title, look: { weapon, hat, armor, outfit } } (item ids)
  setAppearance(p) {
    this.cls = p.cls; this.lv = p.lv; this.title = p.title || null;
    const equip = {};
    for (const [slot, id] of Object.entries(p.look || {})) equip[slot] = { id };
    this.setLook(lookFor({ cls: p.cls, equip }));
  }
  push(p, now = performance.now()) {
    this.buf.push({ t: now, x: p.x, y: p.y, vx: p.vx || 0, f: p.f || 1, a: p.a || 'idle' });
    if (this.buf.length > 20) this.buf.shift();
  }
  update(dt, now = performance.now()) {
    const t = now - GAME.net.interpDelayMs;
    const b = this.buf;
    let i = b.length - 1;
    while (i > 0 && b[i - 1].t > t) i--;
    const s1 = b[i], s0 = b[i - 1] || s1;
    const k = s1.t === s0.t ? 1 : Math.max(0, Math.min(1, (t - s0.t) / (s1.t - s0.t)));
    this.x = s0.x + (s1.x - s0.x) * k;
    this.y = s0.y + (s1.y - s0.y) * k;
    this.vx = s1.vx; this.facing = s1.f;
    const a = s1.a === 'run' && !this.sheet.frames.run ? 'walk' : s1.a;
    if (a !== this.anim) { this.anim = a; this.animT = 0; } else this.animT += dt;
    if (this.anim === 'atk') { this.atkDur = 0.3; this.atkT = 0.3 - (this.animT % 0.3); } // cycle the swing poses
    if (this.say) { this.say.t -= dt; if (this.say.t <= 0) this.say = null; }
  }
}
