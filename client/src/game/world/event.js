// GameWorld, server event floors (data/dungeons.js): the trap clock, trap hits, exits, entering and moving
// between floors. Online the server decides (server/src/dungeon.js); offline it is a practice run.
import { MAPS, GROUND_Y } from '../../../../shared/data/maps.js';
import { trapDamage } from '../traps.js';
import { DUNGEONS, rollFloors } from '../../../../shared/data/dungeons.js';
import { GAME } from '../../../../shared/config.js';

// Where a dungeon's keeper stands (players come back next to them)
const npcX = (d) => (MAPS[d.from].npcs || []).find((n) => n.id === d.npc)?.x ?? MAPS[d.from].spawnX;

export const EventWorld = {
  // Online the server runs the event for everyone (server/src/dungeon.js): it opens it on schedule, lets players in,
  // checks each exit, sends each floor's clock start, ranks damage and hands out rewards. Offline the keeper offers a
  // practice run of the same floors (no rewards).
  // this.dg = { id (run), dungeon, floors, t0 (ms when this floor opened, server clock online), skew (server - local ms) }

  // Seconds on the floor's shared clock: every trap cycle runs on it
  trapTime() {
    return this.dg ? (Date.now() + (this.dg.skew || 0) - this.dg.t0) / 1000 : this.time;
  },

  // A trap touched our player. A pit always sends us back to the floor's start, even right after another hit.
  trapHurt(tr) {
    const p = this.player, ch = this.ch, D = GAME.dungeon;
    const pit = tr.kind === 'pit';
    if (p.dead || (p.invuln > 0 && !pit)) return;
    if (p.invuln <= 0) {
      const dmg = Math.max(1, Math.round(this.stats.maxHp * trapDamage(tr)));
      ch.hp -= dmg;
      this.floatText(p.cx, p.y - 4, dmg, '#ff6a4a', false, false, true);
      this.shakeT = 0.2;
    }
    p.invuln = 1.1; p.hurtT = 0.3;
    if (tr.slow) p.slowT = D.gasSlowSec;
    if (pit) {
      this.burst(p.cx, p.y + p.h, '#6a5a3a', 14, 70, { glow: false });
      p.x = this.map.spawnX; p.y = GROUND_Y - p.h - 40; p.vx = 0; p.vy = 0;
      this.hooks.toast('Bị đất lún nuốt, quay lại đầu tầng', 'warn');
    } else if (tr.kind !== 'gas') p.vy = -D.trapKnock;
    if (ch.hp <= 0) this.playerDie();
    this.hooks.changed('bars');
  },

  // Is this floor's exit open? (online the server checks again)
  dungeonOpen() {
    const g = this.map.goal;
    return g === 'reach' || this.sim.cleared(g === 'break' ? this.map.targets : null);
  },

  lastFloor() {
    return !!this.dg?.floors && this.dg.floors[this.dg.floors.length - 1] === this.mapId;
  },

  // Talked to the keeper and chose to enter. Online: the event (only while it is open). Offline: a practice run.
  enterDungeon(id) {
    const d = DUNGEONS[id];
    if (!d) return;
    if (this.ch.level < d.lv) { this.hooks.toast(`${d.name}: cần đạt cấp ${d.lv}`, 'warn'); return; }
    if (this.net) {
      if (!this.net.connected) { this.hooks.toast('Sự kiện cần kết nối máy chủ', 'warn'); return; }
      this.net.dungeon('enter', { d: id });
      return;
    }
    const floors = rollFloors(d);
    this.dungeonGo({ inst: 'local', d: id, floors, map: floors[0], t0: Date.now(), now: Date.now() });
  },

  // Up at a floor's exit gate
  dungeonNext() {
    this.portalCd = 1;
    if (!this.dungeonOpen()) { this.hooks.toast(this.map.goal === 'break' ? 'Cổng còn phong ấn: phá mục tiêu trên tầng để mở' : 'Cổng còn phong ấn: diệt hết quái trên tầng để mở', 'warn'); return; }
    if (this.net) { this.net.dungeon('next'); return; }
    const d = DUNGEONS[this.dg.dungeon], floors = this.dg.floors, i = floors.indexOf(this.mapId);
    if (i >= floors.length - 1) { this.dungeonGo({ map: d.from, x: npcX(d), done: true }); return; }
    this.dungeonGo({ ...this.dg, inst: this.dg.id, d: this.dg.dungeon, map: floors[i + 1], t0: Date.now(), now: Date.now() });
  },

  // Move to a floor (or out of the event). Online this is the server's dg_go:
  // { inst, d, floors, map, t0, now } on a floor, { map, x, done | lost | closed } back to the keeper
  dungeonGo(m) {
    const map = MAPS[m.map];
    if (!map) return;
    const was = this.dg && DUNGEONS[this.dg.dungeon];
    if (map.dungeon) {
      this.dg = { id: m.inst, dungeon: m.d, floors: m.floors || this.dg?.floors || [], t0: m.t0, skew: (m.now || Date.now()) - Date.now() };
      this.loadMap(m.map, map.spawnX);
    } else {
      this.loadMap(m.map, m.x ?? map.spawnX);
      if (m.done && was && !this.net) this.hooks.banner?.(`<small>Luyện tập xong</small>${was.name}`);
      else if (m.lost) this.hooks.toast('Sự kiện đã đóng, bạn được đưa về làng', 'warn');
    }
    this.hooks.save();
  },

  // EXP rewarded by server events. The server keeps a running total (ch.eventExp, never taken from a save); the
  // character keeps how much of it it already took (ch.eventExpTaken, saved together with EXP and level). The
  // difference is applied once, whichever way it arrives: with the character at login, in `welcome` after a
  // reconnect, or in `ev_end`; calling it again with the same total does nothing.
  takeEventExp(total) {
    const ch = this.ch;
    ch.eventExp = Math.max(ch.eventExp || 0, Math.floor(+total || 0));
    const owed = ch.eventExp - (ch.eventExpTaken || 0);
    if (owed <= 0) return;
    ch.eventExpTaken = ch.eventExp;
    this.giveExp(owed);
    this.hooks.save();
  },

  dungeonErr(why) {
    const msg = {
      far: 'Đứng gần Thủ Ải hơn', level: 'Chưa đủ cấp để vào', closed: 'Sự kiện chưa mở. Lịch: thứ Bảy và Chủ nhật',
      not_clear: 'Cổng còn phong ấn: hoàn thành tầng để mở', exit: 'Đứng ngay tại cổng rồi nhấn ↑', none: 'Bạn không ở trong sự kiện',
    }[why];
    this.hooks.toast(msg || 'Không vào được sự kiện', 'warn');
  },
};
