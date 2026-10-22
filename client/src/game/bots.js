// Bots pretending to be players: hunt monsters, rest, chat, change maps
import { MAPS, GROUND_Y } from '../data/maps.js';
import { CLASSES } from '../data/classes.js';
import { BOT_NAMES, BOT_CHAT, BOT_LOOKS } from '../data/bots.js';
import { Humanoid, Projectile, stepBody, MOVE_SPEED, JUMP_V } from './entities.js';
import { pick, rand, randInt, chance, clamp } from '../engine/util.js';
import { GAME } from '../config.js';

const MAP_ORDER = ['village', 'forest', 'field', 'graveyard', 'ghost_gate', 'snow_peak', 'ice_cave', 'volcano', 'qilin_altar'];

function mapForLevel(lv) {
  if (chance(0.15)) return 'village';
  if (lv < 5) return 'forest';
  if (lv < 8) return chance(0.7) ? 'field' : 'forest';
  if (lv < 11) return pick(['graveyard', 'swamp', 'swamp']);
  if (lv < 14) return pick(['graveyard', 'swamp', 'ghost_gate']);
  if (lv < 18) return pick(['snow_peak', 'snow_peak', 'ice_cave']);
  return pick(['ice_cave', 'volcano', 'volcano', 'qilin_altar']);
}

function makePersona(name) {
  const cls = pick(Object.keys(CLASSES));
  const c = CLASSES[cls];
  const level = chance(0.45) ? randInt(1, 9) : randInt(8, 28);
  const look = {
    ...c.look,
    robe: chance(0.6) ? pick(BOT_LOOKS.robes) : c.look.robe,
    hair: pick(BOT_LOOKS.hairs),
    hairStyle: chance(0.5) ? c.look.hairStyle : randInt(0, 5),
    weapon: c.weapon,
    weaponColor: pick(['#c9ced6', '#7aa0c8', '#e8c35a', '#8fd06a', '#e04848', '#b06aff']),
  };
  if (chance(0.35)) { look.hat = pick(['band', 'conical', 'helm', 'daoist']); look.hatColor = pick(['#d9c27a', '#8b95a3', '#2a2a3a', '#7c5a3a']); }
  const title = level >= 14 && chance(0.4) ? pick(['Trấn Quỷ Sư', 'Kiếm Khách Giang Hồ', 'Đệ Nhất Cày Thuê', 'Vua Nhặt Đồ', 'Lãng Tử']) : null;
  return { name, cls, level, look, title, map: mapForLevel(level), exp: 0 };
}

class Bot extends Humanoid {
  constructor(persona, x) {
    super(x, GROUND_Y - 32, persona.look);
    this.p = persona;
    this.atkDur = 0.3;
    this.cd = rand(0.5, 1.5);
    this.state = 'hunt'; this.stateT = rand(5, 15);
    this.target = null; this.targetT = 0; this.restT = 0;
    this.wanderX = x;
  }
}

export class BotManager {
  constructor(world) {
    this.world = world;
    const names = [...BOT_NAMES].sort(() => Math.random() - 0.5).slice(0, 16);
    this.personas = names.map(makePersona);
    this.list = [];
    this.chatT = rand(4, 8);
    this.moveT = rand(15, 30);
    this.levelT = rand(40, 80);
  }

  onMapLoad(mapId) {
    const map = MAPS[mapId];
    this.list = this.personas.filter((p) => p.map === mapId).map((p) => {
      const b = new Bot(p, rand(60, map.width - 80));
      b.y = rand(40, 200);
      return b;
    });
  }

  say(bot, text) { bot.say = { text, t: 3.5 }; }

  update(dt) {
    const W = this.world;
    for (const b of [...this.list]) this.updateBot(b, dt);
    // world chat
    this.chatT -= dt;
    if (this.chatT <= 0) {
      this.chatT = rand(9, 22);
      const p = pick(this.personas);
      const msg = pick(BOT_CHAT.idle);
      const ent = this.list.find((b) => b.p === p);
      if (ent && chance(0.6)) { this.say(ent, msg); W.hooks.chat(p.name, msg, 'local'); }
      else W.hooks.chat(p.name, msg, 'world');
    }
    // bot changes map
    this.moveT -= dt;
    if (this.moveT <= 0) {
      this.moveT = rand(18, 40);
      const p = pick(this.personas);
      const idx = MAP_ORDER.indexOf(p.map);
      const next = MAP_ORDER[clamp(idx + (chance(0.5) ? 1 : -1), 0, MAP_ORDER.length - 1)];
      if (next !== p.map) this.movePersona(p, next);
    }
    // bot levels up
    this.levelT -= dt;
    if (this.levelT <= 0) {
      this.levelT = rand(50, 110);
      const p = pick(this.personas);
      if (p.level < 40) { p.level++; if (chance(0.5)) W.hooks.chat('Hệ thống', `${p.name} đã đạt cấp ${p.level}!`, 'system'); }
    }
  }

  movePersona(p, next) {
    const W = this.world;
    const ent = this.list.find((b) => b.p === p);
    if (ent) {
      const portal = W.map.portals.find((pt) => pt.to === next);
      if (portal) { ent.state = 'leave'; ent.portal = portal; ent.nextMap = next; return; }
    }
    const from = p.map;
    p.map = next;
    if (next === W.mapId) {
      const portal = W.map.portals.find((pt) => pt.to === from) || W.map.portals[0];
      const b = new Bot(p, portal ? portal.x - 7 : 100);
      b.y = GROUND_Y - b.h;
      b.alpha = 0;
      this.list.push(b);
    }
  }

  updateBot(b, dt) {
    const W = this.world;
    b.cd -= dt;
    if (b.atkT > 0) b.atkT -= dt;
    if (b.say) { b.say.t -= dt; if (b.say.t <= 0) b.say = null; }
    b.alpha = Math.min(1, (b.alpha ?? 1) + dt * 2);
    b.sitting = false;
    if (b.state === 'leave') {
      const dx = b.portal.x - b.cx;
      if (Math.abs(dx) < 8 && b.standY === GROUND_Y) {
        b.p.map = b.nextMap;
        this.list.splice(this.list.indexOf(b), 1);
        return;
      }
      this.walkTo(b, b.portal.x, GROUND_Y);
    } else if (W.map.safe) {
      this.updateTown(b, dt);
    } else {
      this.updateHunt(b, dt);
    }
    stepBody(b, dt, W.map.platforms, W.map.width);
    b.updateAnim(dt);
  }

  walkTo(b, x, floorY) {
    const dx = x - b.cx;
    b.vx = Math.abs(dx) < 4 ? 0 : Math.sign(dx) * MOVE_SPEED * GAME.physics.botSpeedMult[0];
    if (b.vx) b.facing = Math.sign(b.vx);
    if (b.onGround && b.standY < floorY - 2) { b.dropTimer = 0.3; b.y += 2; }
  }

  updateTown(b, dt) {
    b.stateT -= dt;
    if (b.stateT <= 0) {
      b.state = chance(0.5) ? 'sit' : 'walk';
      b.stateT = b.state === 'sit' ? rand(6, 16) : rand(3, 7);
      b.wanderX = rand(80, this.world.map.width - 100);
      if (chance(0.25)) this.say(b, pick(BOT_CHAT.idle));
    }
    if (b.state === 'sit') { b.vx = 0; b.sitting = b.onGround; return; }
    this.walkTo(b, b.wanderX, GROUND_Y);
    if (Math.abs(b.wanderX - b.cx) < 6) { b.vx = 0; }
  }

  updateHunt(b, dt) {
    const W = this.world;
    if (b.restT > 0) { b.restT -= dt; b.vx = 0; b.sitting = b.restT > 1 && b.onGround; return; }
    b.targetT -= dt;
    if (!b.target || b.target.dead || b.targetT <= 0) {
      const alive = W.monsters.filter((m) => !m.dead && !m.def.boss);
      const boss = W.monsters.find((m) => !m.dead && m.def.boss);
      const sameFloor = alive.filter((m) => Math.abs(m.y + m.h - (b.y + b.h)) < 40);
      const pool = boss && b.p.level >= 11 ? [boss] : sameFloor.length ? sameFloor : alive;
      b.target = pool.sort((x, y) => Math.abs(x.cx - b.cx) - Math.abs(y.cx - b.cx))[chance(0.7) ? 0 : randInt(0, Math.min(2, pool.length - 1))] || null;
      b.targetT = rand(8, 14);
      if (!b.target) { b.restT = rand(2, 5); return; }
    }
    const t = b.target;
    const dx = t.cx - b.cx;
    const melee = b.p.cls === 'swordsman';
    const range = melee ? 26 + t.w / 2 : 150;
    const vdiff = (t.y + t.h) - (b.y + b.h);
    if (Math.abs(dx) < range && Math.abs(vdiff) < (melee ? 30 : 46)) {
      b.vx = 0; b.facing = dx > 0 ? 1 : -1;
      if (b.cd <= 0) this.attack(b, t);
      return;
    }
    b.vx = Math.sign(dx) * MOVE_SPEED * GAME.physics.botSpeedMult[1]; b.facing = Math.sign(dx) || 1;
    if (!b.onGround) return;
    const plats = W.map.platforms;
    if (vdiff < -30) {
      const above = plats.filter((p) => p.y < b.standY - 20 && p.y > b.standY - 75);
      const here = above.find((p) => b.cx > p.x + 6 && b.cx < p.x + p.w - 6);
      if (here) b.vy = JUMP_V;
      else if (above.length) {
        const c = above.sort((p, q) => Math.abs(p.x + p.w / 2 - b.cx) - Math.abs(q.x + q.w / 2 - b.cx))[0];
        b.vx = Math.sign(c.x + c.w / 2 - b.cx) * MOVE_SPEED * GAME.physics.botSpeedMult[1];
      }
    } else if (vdiff > 30 && b.standY < GROUND_Y) {
      b.dropTimer = 0.3; b.y += 2;
    }
    if (chance(dt * 0.15)) b.vy = JUMP_V; // jump now and then to look human
  }

  attack(b, t) {
    const W = this.world;
    b.cd = rand(0.8, 1.3);
    b.atkT = b.atkDur;
    const atk = 8 + b.p.level * 4.2;
    const dir = b.facing;
    if (b.p.cls === 'swordsman') {
      W.hitArea({ x: dir > 0 ? b.cx : b.cx - 36, y: b.y - 4, w: 36, h: b.h + 8 }, 1, 2, 'bot', atk);
      W.addFx('slash', b.cx + dir * 16, b.cy - 2, 0.18, { dir });
    } else {
      const kind = b.p.cls === 'taoist' ? 'talisman' : 'dart';
      const ang = Math.atan2(t.cy - b.cy, Math.abs(t.cx - b.cx)) * 0.6;
      W.projs.push(new Projectile({ owner: 'bot', botName: b.p.name, kind, x: b.cx - 6, y: b.cy - 6, vx: Math.cos(ang) * 320 * dir, vy: Math.sin(ang) * 320, range: 220, mult: 1, maxTargets: 1, atk }));
    }
    if (t.hp - atk <= 0 && chance(0.3)) { b.restT = rand(1.5, 5); if (chance(0.15)) this.say(b, pick(BOT_CHAT.kill)); }
  }

  // Bot replies when the player chats
  onPlayerChat(text) {
    const W = this.world;
    const t = text.toLowerCase();
    let pool = null;
    if (/(chào|chao|hello|hi\b|alo|hế lô)/.test(t)) pool = BOT_CHAT.greet;
    else if (/(pt|party|tổ đội|to doi)/.test(t)) pool = BOT_CHAT.party;
    else if (/(bán|ban|mua|trade|giá)/.test(t)) pool = BOT_CHAT.trade;
    else if (/\?|sao|làm sao|ở đâu|o dau/.test(t)) pool = BOT_CHAT.question;
    if (!pool && chance(0.6)) return;
    const near = this.list.length ? this.list : null;
    const n = pool === BOT_CHAT.greet ? randInt(1, 3) : 1;
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const msg = pick(pool || BOT_CHAT.question);
        if (near && chance(0.7)) {
          const b = pick(this.list);
          if (!b) return;
          this.say(b, msg); W.hooks.chat(b.p.name, msg, 'local');
        } else W.hooks.chat(pick(this.personas).name, msg, 'world');
      }, 900 + i * 1200 + Math.random() * 1500);
    }
  }

  onPlayerLevel(lv) {
    if (!chance(0.6)) return;
    setTimeout(() => {
      const b = this.list.length ? pick(this.list) : null;
      const msg = pick(BOT_CHAT.levelUp);
      if (b) { this.say(b, msg); this.world.hooks.chat(b.p.name, msg, 'local'); }
      else this.world.hooks.chat(pick(this.personas).name, msg, 'world');
    }, 1200 + Math.random() * 1500);
  }

  onlineCount() { return this.personas.length; }

  render(ctx, cam) {
    const W = this.world;
    for (const b of this.list) b.draw(ctx, cam, b.alpha ?? 1);
    for (const b of this.list) {
      W.nameTag(ctx, b.p.name, b.cx - cam, b.y + b.h + 10, '#9fe0ff', 8);
      if (b.p.title) W.nameTag(ctx, '「' + b.p.title + '」', b.cx - cam, b.y - 24, '#c8b0ff', 7);
      if (b.say) W.bubble(ctx, b.say.text, b.cx - cam, b.y - (b.p.title ? 34 : 24));
    }
  }
}
