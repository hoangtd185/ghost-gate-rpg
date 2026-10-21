// Game entities: player, monsters, bots, NPCs, drops, projectiles
import { GROUND_Y } from '../data/maps.js';
import { MONSTERS } from '../data/monsters.js';
import { CLASSES } from '../data/classes.js';
import { ITEMS } from '../data/items.js';
import { humanoidSheet, HUM_W, HUM_FEET } from '../gfx/humanoid.js';
import { monsterSheet } from '../gfx/monsters.js';
import { drawFrame } from '../gfx/draw.js';
import { clamp, rand, randInt } from '../engine/util.js';
import { NAMED, ELITE_POOL, smartTier, eliteChance } from '../data/affixes.js';

export const GRAVITY = 980;
export const JUMP_V = -385;
export const MOVE_SPEED = 118;

// Basic physics: gravity + one-way platforms
export function stepBody(b, dt, platforms, mapW) {
  b.vy = Math.min(b.vy + GRAVITY * dt * (b.floaty ? 0 : 1), 640);
  b.x = clamp(b.x + b.vx * dt, 0, mapW - b.w);
  const prevBottom = b.y + b.h;
  b.y += b.vy * dt;
  b.onGround = false;
  if (b.dropTimer > 0) b.dropTimer -= dt;
  if (b.vy >= 0) {
    const bottom = b.y + b.h;
    if (bottom >= GROUND_Y) {
      b.y = GROUND_Y - b.h; b.vy = 0; b.onGround = true; b.standY = GROUND_Y; b.plat = null;
      return;
    }
    if (b.dropTimer > 0) return;
    for (const p of platforms) {
      if (prevBottom <= p.y + 1 && bottom >= p.y && b.x + b.w > p.x + 3 && b.x < p.x + p.w - 3) {
        b.y = p.y - b.h; b.vy = 0; b.onGround = true; b.standY = p.y; b.plat = p;
        return;
      }
    }
  }
}

export function platformAt(platforms, x, y) {
  if (y >= GROUND_Y) return null;
  return platforms.find((p) => Math.abs(p.y - y) < 2 && x >= p.x && x <= p.x + p.w) || null;
}

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
    else if (Math.abs(this.vx) > 5) a = 'walk';
    else a = 'idle';
    if (a !== this.anim) { this.anim = a; this.animT = 0; }
  }
  frameIndex() {
    const fr = this.sheet.frames[this.anim];
    if (this.anim === 'atk') return this.atkT > this.atkDur * 0.55 ? fr[0] : fr[1];
    const speed = this.anim === 'walk' ? 9 : 2.2;
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
// Each monster has its own level (varies around the species' base level); stats scale with level.
// opt: { named: id trong NAMED, elite: true/false, lvBonus }
export class Monster {
  constructor(id, x, standY, range, spawnRef, opt = {}) {
    const base = MONSTERS[id];
    const named = opt.named ? NAMED[opt.named] : null;
    const elite = !named && !base.boss && (opt.elite ?? Math.random() < eliteChance(base.lv));
    const bonus = named || base.boss ? 0 : (opt.lvBonus ?? randInt(0, base.lv >= 13 ? 3 : 2));
    const lv = named ? named.lv : base.lv + bonus;
    const k = lv - base.lv;
    let hp = base.hp * (1 + 0.12 * k), atk = base.atk * (1 + 0.07 * k), df = base.def * (1 + 0.05 * k), exp = base.exp * (1 + 0.15 * k);
    let gold = base.gold.map((g) => Math.round(g * (1 + 0.1 * k)));
    let affix = [...(base.affix || [])], drops = base.drops, name = base.name, scale = 1;
    if (elite) {
      hp *= 4; atk *= 1.4; df *= 1.2; exp *= 5; gold = gold.map((g) => g * 4); scale = 1.28;
      const pool = ELITE_POOL.filter((a) => !affix.includes(a));
      const n = lv >= 13 ? 2 : 1;
      for (let i = 0; i < n && pool.length; i++) affix.push(pool.splice(randInt(0, pool.length - 1), 1)[0]);
      drops = [...drops, ['GEM1', 0.6], ['stone', 0.7], ['stone', 0.3], ['protect', 0.06], ['out_jade_lotus', 0.004], ['out_wisp_hood', 0.004], ['out_peach_fairy', 0.002], ['mat_dew', 0.08]];
    }
    if (named) {
      hp *= named.hp; atk *= named.atk; df *= 1.3; exp *= named.hp * 0.7; gold = gold.map((g) => g * 10);
      affix = [...named.affix]; drops = named.drops; name = named.name; scale = named.scale;
    }
    this.id = id;
    this.def = { ...base, lv, name, drops, affix, hp: Math.round(hp), atk: Math.round(atk), def: Math.round(df), exp: Math.round(exp), gold };
    this.elite = elite; this.named = opt.named || null; this.namedDef = named;
    this.scale = scale; this.tint = named ? named.tint : elite ? 'saturate(1.35) brightness(1.08)' : null;
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
    this.sheet = monsterSheet(id);
    this.animT = Math.random() * 3;
    this.hurtT = 0; this.aggro = null; this.aggroT = 0;
    this.thinkT = rand(0.5, 2); this.atkCd = rand(1, 3);
    this.dead = false; this.hitByPlayer = false;
    this.spawnRef = spawnRef;
    this.floaty = base.behavior === 'float';
    this.phase = 0; this.actT = 0; this.alpha = 0; // fade in when spawning
    this.poison = 0; this.poisonT = 0; this.poisonDmg = 0;
    this.lastHitT = 0; this.blinkT = rand(3, 6); this.chargeT = rand(3, 5); this.dodgeT = 0;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get enraged() { return this.affix.has('enrage') && this.hp < this.maxHp * 0.35; }
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
    if (this.elite || this.named) {
      const col = this.named ? 'rgba(255,90,70,' : 'rgba(255,210,90,';
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
    this.t = 0; this.life = 60;
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
