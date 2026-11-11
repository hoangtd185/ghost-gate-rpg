// GameWorld: drawing the map, entities, name tags, bubbles and effects on the canvas.
import { GROUND_Y } from '../../../../shared/data/maps.js';
import { ITEMS } from '../../../../shared/data/items.js';
import { AFFIXES } from '../../../../shared/data/affixes.js';
import { drawPortal, drawLayer, VIEW_W, VIEW_H } from '../../gfx/backgrounds.js';
import { projSprite, itemIcon, iconForItem } from '../../gfx/icons.js';
import { npcMarker, questStatus } from '../../../../shared/rules/character.js';
import { rand } from '../../../../shared/util.js';
import { dist2, rbg, rgbaHex, PROJ_GLOW } from './helpers.js';

export const RenderWorld = {
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
    if (this.map.dungeon) this.drawDungeon(ctx, cam, t);

    // poison areas
    for (const z of this.zones) {
      const a = Math.min(1, (z.dur - z.t) * 2) * 0.55;
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = `rgba(110,220,90,${a * 0.5})`;
        ctx.beginPath(); ctx.arc(z.x - cam + Math.sin(t * 2 + i * 1.3) * z.r * 0.5, z.y + Math.cos(t * 1.7 + i) * 10, z.r * 0.45, 0, 7); ctx.fill();
      }
    }
    for (const n of this.npcs) n.draw(ctx, cam, n.npc.ghost ? 0.6 + Math.sin(t * 2.2 + n.x) * 0.12 : 1); // ghosts shimmer
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
    else if (this.nearExit && !p.dead) {
      const ex = this.map.exit;
      this.hint(ctx, !this.dungeonOpen() ? (this.map.goal === 'break' ? '🔒 Phá mục tiêu để mở cổng' : '🔒 Diệt hết quái để mở cổng') : this.lastFloor() ? '↑  Rời ải' : '↑  Tầng tiếp theo', ex.x - cam, ex.y - 66);
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
  },

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
  },

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
  },

  // Seal on a portal that is not open yet
  drawSeal(ctx, x, y) {
    ctx.save();
    ctx.strokeStyle = 'rgba(200,170,120,0.85)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 14, y - 16); ctx.lineTo(x + 14, y + 16); ctx.moveTo(x + 14, y - 16); ctx.lineTo(x - 14, y + 16); ctx.stroke();
    ctx.fillStyle = '#f0d070'; ctx.fillRect(x - 5, y - 9, 10, 18);
    ctx.strokeStyle = '#c42020'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 3, y - 6); ctx.lineTo(x + 3, y - 6); ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 6); ctx.moveTo(x - 3, y + 1); ctx.quadraticCurveTo(x, y + 4, x + 3, y); ctx.stroke();
    ctx.restore();
  },

  // ! marker (new quest, gold; !! = story, red; !w = world quest, violet) and ? (turn in) bouncing above NPCs
  drawMarker(ctx, mk, x, y) {
    const bob = Math.sin(this.time * 4) * 2;
    const story = mk === '!!';
    const col = mk === '?' ? '#7dff9a' : story ? '#ff8a5a' : mk === '!t' ? '#6ae0ff' : mk === '!w' ? '#c8a0ff' : '#ffd84a';
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, 1, 7, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.font = '900 13px "Be Vietnam Pro", system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = '#2a1408';
    const t = mk === '?' ? '?' : '!';
    ctx.strokeText(t, 0, 6); ctx.fillStyle = col; ctx.fillText(t, 0, 6);
    if (mk === '!w') { // world quest: a small diamond frame around the mark
      ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.globalAlpha = 0.75;
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(9, 1); ctx.lineTo(0, 10); ctx.lineTo(-9, 1); ctx.closePath(); ctx.stroke();
    }
    if (story) { ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.globalAlpha = 0.6 + Math.sin(this.time * 6) * 0.3; ctx.beginPath(); ctx.arc(0, 1, 9, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  },

  nameTag(ctx, text, x, y, color, size = 8, bold = false) {
    ctx.font = `${bold ? 700 : 600} ${size}px "Be Vietnam Pro", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    const w = ctx.measureText(text).width + 6;
    ctx.fillStyle = 'rgba(8,6,14,0.62)';
    ctx.fillRect(Math.round(x - w / 2), Math.round(y - size + 1), Math.round(w), size + 3);
    ctx.fillStyle = color;
    ctx.fillText(text, Math.round(x), Math.round(y + 1));
  },

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
  },

  hint(ctx, text, x, y) {
    const a = 0.7 + Math.sin(this.time * 5) * 0.3;
    ctx.globalAlpha = a;
    this.nameTag(ctx, text, x, y, '#bff6ff', 8, true);
    ctx.globalAlpha = 1;
  },

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
  },
};
