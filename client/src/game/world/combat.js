// GameWorld: the player's skills, hits, damage, death, potions, projectiles and skill zones.
import { MAPS, GROUND_Y } from '../../../../shared/data/maps.js';
import { CLASSES, SKILLS } from '../../../../shared/data/classes.js';
import { killIngots } from '../../../../shared/rules/premium.js';
import { NAMED } from '../../../../shared/data/affixes.js';
import { ELEMENTS } from '../../../../shared/data/elements.js';
import { Drop, Projectile } from '../entities.js';
import { rollDrops, killExp } from '../../../../shared/rules/loot.js';
import { hitDamage, botDamage } from '../../../../shared/rules/combat.js';
import { gainExp, onKillForQuests, expToNext, countItem, questDropsFor } from '../../../../shared/rules/character.js';
import { rand, randInt, chance, overlap, pick } from '../../../../shared/util.js';
import { GAME } from '../../../../shared/config.js';
import { SKILL_FX } from './helpers.js';

export const CombatWorld = {
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
  },

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
  },

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
  },

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
  },

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
  },

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
  },

  // The server's result for a hit on a shared monster: { uid, by, dmg, ab, crit, em, el }
  mobHit(h) {
    const m = this.remoteMobs.get(h.uid);
    if (!m) return;
    m.hp = Math.max(0, m.hp - h.dmg); m.shield = Math.max(0, (m.shield || 0) - (h.ab || 0)); m.hurtT = 0.16;
    if (h.by === this.ch.id) {
      if (h.dmg <= 0 && h.ab > 0) { this.floatText(m.cx, m.y - 12, 'Đỡ', '#ffd84a', false, true); return; }
      this.showOwnHit(m, h.dmg, h.crit, h.em, h.el);
    } else if (h.dmg > 0) this.floatText(m.cx, m.y - 2, h.dmg, '#b8b8c8', false, true);
  },

  // Reflected damage: ignores defense and invulnerability frames
  reflectPlayer(r) {
    const p = this.player, ch = this.ch;
    if (p.dead) return;
    ch.hp -= r;
    this.floatText(p.cx + rand(-6, 6), p.y - 8, '-' + r + ' Phản', '#c07bff', false, true);
    this.burst(p.cx, p.cy, '#c07bff', 4, 60, { shape: 'star' });
    if (ch.hp <= 0) this.playerDie();
    this.hooks.changed('bars');
  },

  playerDie() {
    const p = this.player, ch = this.ch;
    ch.hp = 0; p.dead = true; p.poisonT = 0; p.slowT = 0;
    // in an event you get back up on the same floor and lose nothing (see respawn)
    const lose = this.map.dungeon ? 0 : Math.floor(expToNext(ch.level) * GAME.player.deathExpLoss);
    ch.exp = Math.max(0, ch.exp - lose);
    this.hooks.death(lose);
  },

  killMonster(m, owner, botName) {
    this.sim.kill(m, owner === 'player' ? { id: this.ch.id, player: true } : { id: 'bot:' + botName, player: false, name: botName });
    this.drainMobEvents();
  },

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
    // an offline practice run of a server event gives no EXP, gold, drops, Nguyên Bảo or quest credit (the death
    // effects above and the floor state, which the simulation keeps, are already done)
    if (this.dg && !this.net) { this.hooks.changed('bars'); return; }
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
      // chieftains and field bosses give Nguyên Bảo (online the server grants them)
      const ingots = killIngots(m);
      if (ingots) {
        ch.ingots = (ch.ingots || 0) + ingots;
        this.floatText(m.cx, m.y - 18, `+${ingots} Nguyên Bảo`, '#ffd76a', false, true);
        this.hooks.chat('Hệ thống', `Nhận ${ingots} Nguyên Bảo!`, 'system');
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
  },

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
  },

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
  },

  respawn() {
    const p = this.player, D = GAME.dungeon;
    if (this.map.dungeon) { // back on your feet where you fell (a few seconds untouchable): the run goes on
      p.dead = false; p.invuln = D.reviveInvuln;
      this.ch.hp = Math.floor(this.stats.maxHp * D.reviveHp);
      this.ch.mp = Math.floor(this.stats.maxMp * D.reviveHp);
      p.vx = 0; p.vy = 0;
      this.addFx('levelup', p.cx, p.y + p.h, 1, {});
      this.hooks.changed();
      return;
    }
    p.dead = false; p.invuln = 2;
    this.ch.hp = Math.floor(this.stats.maxHp * GAME.player.respawnHpMp);
    this.ch.mp = Math.floor(this.stats.maxMp * GAME.player.respawnHpMp);
    this.loadMap('village', MAPS.village.spawnX);
    this.hooks.changed();
    this.hooks.save();
  },

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
  },

  applyConsumable(it) {
    const ch = this.ch, p = this.player, st = this.stats;
    if (it.heal) {
      if (it.heal.hp) { ch.hp = Math.min(st.maxHp, ch.hp + it.heal.hp); this.floatText(p.cx, p.y - 4, '+' + it.heal.hp, '#ff7a8a'); }
      if (it.heal.mp) { ch.mp = Math.min(st.maxMp, ch.mp + it.heal.mp); this.floatText(p.cx, p.y - 4, '+' + it.heal.mp, '#7ab0ff'); }
      this.addFx('aura', p.cx, p.cy, 0.4, { color: it.heal.hp ? '#ff7a8a' : '#7ab0ff', small: true });
    }
    if (it.home) this.timers.push({ t: 0.2, fn: () => this.goHome() });
  },

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
  },

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
  },
};
