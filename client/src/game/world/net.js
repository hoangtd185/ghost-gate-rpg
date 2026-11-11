// GameWorld: online glue. Shared monsters from the server (snapshots, kills, events) and quest ingot claims.
import { GROUND_Y } from '../../../../shared/data/maps.js';
import { MONSTERS } from '../../../../shared/data/monsters.js';
import { questIngots } from '../../../../shared/rules/premium.js';
import { NAMED } from '../../../../shared/data/affixes.js';
import { Monster, Drop, Projectile } from '../entities.js';
import { MobSim } from '../../../../shared/rules/mobsim.js';
import { onKillForQuests, questDropsFor } from '../../../../shared/rules/character.js';
import { rand, pick } from '../../../../shared/util.js';
import { GAME } from '../../../../shared/config.js';


export const NetWorld = {
  // Monsters of this map. Offline: every spawn and field boss is simulated here. Online: the server runs the
  // shared monsters (they arrive as remote monsters, see serverMobs); only personal story bosses run here.
  newSim() {
    const online = !!this.net;
    this.sim = new MobSim(this.mapId, {
      make: (...a) => new Monster(...a), spawn: !online, fieldBosses: !online, namedT: this.namedT,
      poisonTick: (m) => this.damageMonster(m, m.poisonDmg, 'player', undefined, undefined, 'poison'),
    });
    this.remoteMobs = new Map(); // uid -> remote monster (online)
  },

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
  },

  clearRemoteMobs() {
    this.sim.monsters = this.sim.monsters.filter((m) => !m.remote);
    this.remoteMobs.clear();
  },

  // The full list when we enter a map
  serverMobs(list) {
    this.clearRemoteMobs();
    for (const info of list) { const m = this.addRemoteMob(info); if (m) m.alpha = 1; }
  },

  mobSpawn(info) { this.addRemoteMob(info); },

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
  },

  mobDie({ uid, by }) {
    const m = this.remoteMobs.get(uid);
    if (!m || m.dead) return;
    m.dead = true; m.fadeT = 0.4; m.hp = 0;
    this.addFx('poof', m.cx, m.cy, 0.5, { color: m.def.boss ? '#ff3a5a' : '#c8c8ff', big: m.def.boss });
    if (m.named) { this.shakeT = 0.6; if (NAMED[m.named].every && by) this.hooks.chat('Hệ thống', `${by} đã hạ ${NAMED[m.named].name}!`, 'system'); }
    if (m.def.boss) { this.shakeT = 0.8; this.hooks.chat('Hệ thống', `${by || 'Ai đó'} đã tiêu diệt ${m.def.name}! Thiên hạ chấn động.`, 'system'); }
  },

  // Our reward for a shared monster: EXP (our share), and if we earned the loot, gold and our personal drops
  onServerKill(k) {
    const ch = this.ch, m = this.remoteMobs.get(k.uid);
    const name = m ? m.def.name : (MONSTERS[k.mob] || {}).name;
    if (this.stats.pas.killHeal) {
      const f = this.stats.pas.killHeal / 100;
      ch.hp = Math.min(this.stats.maxHp, ch.hp + this.stats.maxHp * f); ch.mp = Math.min(this.stats.maxMp, ch.mp + this.stats.maxMp * f);
    }
    if (k.exp) this.giveExp(k.exp);
    // things that land at the monster's spot only make sense on its map: after a map change the gold goes straight
    // to the purse, and the server keeps our drops on that map (they come back with 'drops' when we return)
    const here = !k.map || k.map === this.mapId;
    if (k.gold) { if (here) this.drops.push(new Drop(k.x - 6, k.y, 'gold', k.gold)); else ch.gold += k.gold; }
    if (k.drops && here) this.serverDrops(k.drops, name);
    if (here) for (const id of questDropsFor(ch, k.mob)) this.drops.push(new Drop(k.x - 6 + rand(-8, 8), k.y, 'item', { id, qty: 1, r: 0, b: {} }));
    const changed = onKillForQuests(ch, k.mob);
    if (k.named) changed.push(...onKillForQuests(ch, k.named));
    for (const qid of changed) this.hooks.questProgress(qid);
    this.hooks.changed('bars');
  },

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
  },

  spawnMonster(g, delay = 0) { this.sim.spawnGroup(g, delay); this.drainMobEvents(); },

  spawnNamed(id) { const m = this.sim.spawnNamed(id); this.drainMobEvents(); return m; },

  // Turn monster events (mobsim.js, or the server's) into effects, chat, projectiles and damage to our player
  drainMobEvents() { for (const e of this.sim.drain()) this.mobEvent(e); },

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
  },

  // ===== Nguyên Bảo from quests (online) =====
  // The server grants them once the completion is in the saved character: completions wait in claims until a
  // save went through, then are sent; a 'not_done' answer keeps them for the next save. On every (re)connect all
  // completed quests with Nguyên Bảo are claimed again; the server gives each one only once.
  claimQuest(qid) { (this.claims ||= new Set()).add(qid); },

  claimPending() {
    if (!this.net || !this.claims) return;
    for (const qid of this.claims) this.net.premium('claim', { quest: qid });
  },

  claimAnswer(m) { if (this.claims && m.why !== 'not_done' && m.why !== 'rate') this.claims.delete(m.quest); },

  claimAllQuests() {
    for (const [qid, st] of Object.entries(this.ch.quests)) if (st.s === 'done' && questIngots(qid)) this.claimQuest(qid);
    this.claimPending();
  },

  // The closest other player within trade range, or null
  nearestRemote() {
    const p = this.player;
    let best = null, bd = GAME.net.trade.range;
    for (const r of this.remotes.values()) { const d = Math.abs(r.cx - p.cx); if (d <= bd) { bd = d; best = r; } }
    return best;
  },

  // Connection lost: pickups in flight are put back on the ground (the server may still have committed them;
  // then the change replay on reconnect adds the item and the drop is gone on the server)
  netLost() {
    for (const d of this.pendingPicks.values()) { d.taken = false; this.drops.push(d); }
    this.pendingPicks.clear();
  },
};
