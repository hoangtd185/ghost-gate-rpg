// Game world: logic updates, combat, monsters, drops, and drawing everything on the canvas
import { MAPS, GROUND_Y } from '../../../shared/data/maps.js';
import { NPCS, QUESTS } from '../../../shared/data/npcs.js';
import { NAMED } from '../../../shared/data/affixes.js';
import { buildMapGraphics, VIEW_W } from '../gfx/backgrounds.js';
import { Player, NPC, MOVE_SPEED } from './entities.js';
import { stepBody } from '../../../shared/rules/physics.js';
import { Pet } from './pet.js';
import { calcStats, questStatus, npcPresent, questEvent } from '../../../shared/rules/character.js';
import { npcLine, pickBanter } from './chatter.js';
import { BotManager } from './bots.js';
import { clamp, rand, overlap, pick } from '../../../shared/util.js';
import { GAME } from '../../../shared/config.js';
import { PH, PLAYER_JUMP, JUMP_HOLD_TIME, JUMP_HOLD_ACCEL, SPRINT_MULT } from './world/helpers.js';
import { NetWorld } from './world/net.js';
import { CombatWorld } from './world/combat.js';
import { DropsWorld } from './world/drops.js';
import { FxWorld } from './world/fx.js';
import { RenderWorld } from './world/render.js';

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

  get monsters() { return this.sim.monsters; }

  set monsters(v) { this.sim.monsters = v; }

  get spawnGroups() { return this.sim.groups; }

  set spawnGroups(v) { this.sim.groups = v; }

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

  // Summon or dismiss the pet
  setPet(on) {
    if (!this.ch.pet) return;
    this.ch.pet.on = on;
    if (on && !this.pet) { this.pet = new Pet(this); this.addFx('poof', this.pet.x, this.pet.y, 0.5, { color: '#e8dcff' }); }
    if (!on && this.pet) { this.addFx('poof', this.pet.x, this.pet.y, 0.5, { color: '#e8dcff' }); this.pet = null; }
  }
}

Object.assign(GameWorld.prototype, NetWorld, CombatWorld, DropsWorld, FxWorld, RenderWorld);
