// GameWorld, drawing the traps and exit gate of server event floors (logic in event.js and game/traps.js).
import { GROUND_Y } from '../../../../shared/data/maps.js';
import { drawPortal, VIEW_W, VIEW_H } from '../../gfx/backgrounds.js';
import { trapState, trapBox } from '../traps.js';
import { rand, pick } from '../../../../shared/util.js';
import { GAME } from '../../../../shared/config.js';

export const EventGfxWorld = {
  // Event floor: traps on the floor's shared clock, then the exit gate (gold when open, sealed otherwise)
  drawDungeon(ctx, cam, t) {
    const tt = this.trapTime();
    for (const tr of this.map.traps || []) {
      const x = tr.x - cam;
      if (x + tr.w < -20 || x > VIEW_W + 20) continue;
      const st = trapState(tr, tt);
      switch (tr.kind) {
        case 'pit': this.drawPit(ctx, x, tr.w, t); break;
        case 'crumble': this.drawCrumble(ctx, x, tr, st, t); break;
        case 'spikes': this.drawSpikes(ctx, x, tr, st); break;
        case 'teeth': this.drawTeeth(ctx, x, tr, st); break;
        case 'laser': this.drawLaser(ctx, x, tr, st, t); break;
        case 'gas': this.drawGas(ctx, x, tr, st, t); break;
        case 'wheel': this.drawWheel(ctx, x, tr, st, t); break;
        case 'drop': this.drawRock(ctx, cam, tr, st, tt); break;
        case 'fireball': this.drawFireball(ctx, cam, tr, tt, t); break;
        default: this.drawFlame(ctx, x, tr, st, t);
      }
    }
    const ex = this.map.exit;
    if (ex) {
      const open = this.dungeonOpen();
      drawPortal(ctx, ex.x - cam, ex.y, t, open ? '#ffd36a' : '#8a6a6a');
      if (!open) this.drawSeal(ctx, ex.x - cam, ex.y - 22);
    }
  },

  // Teeth snapping shut from above: gums at the top while open, a glint before they bite, a full jaw while shut
  drawTeeth(ctx, x, tr, st) {
    const top = tr.y - tr.h, n = Math.max(3, Math.round(tr.w / 9)), sw = tr.w / n;
    const reach = st === 'on' ? tr.h - 4 : st === 'warn' ? 14 : 8; // how far the upper teeth come down
    ctx.save();
    ctx.fillStyle = '#5a1420'; ctx.fillRect(x, top - 6, tr.w, 8); // gum
    const g = ctx.createLinearGradient(0, top, 0, top + reach);
    g.addColorStop(0, '#f4ecdc'); g.addColorStop(1, '#b8a890');
    ctx.fillStyle = g; ctx.strokeStyle = '#3a1a14'; ctx.lineWidth = 0.6; ctx.beginPath();
    for (let i = 0; i < n; i++) { const sx = x + i * sw; ctx.moveTo(sx + 1, top); ctx.lineTo(sx + sw / 2, top + reach); ctx.lineTo(sx + sw - 1, top); ctx.closePath(); }
    ctx.fill(); ctx.stroke();
    if (st === 'on') { // the lower jaw meets them
      ctx.beginPath();
      for (let i = 0; i < n; i++) { const sx = x + i * sw + sw / 2; ctx.moveTo(sx - sw / 2 + 1, tr.y); ctx.lineTo(sx, tr.y - 14); ctx.lineTo(sx + sw / 2 - 1, tr.y); ctx.closePath(); }
      ctx.fill(); ctx.stroke();
    }
    if (st === 'warn') { ctx.fillStyle = `rgba(255,60,60,${0.4 + Math.sin(this.time * 30) * 0.25})`; ctx.fillRect(x, top + 2, tr.w, 2); }
    if ((tr.dmg ?? 0) >= 0.8) { ctx.fillStyle = 'rgba(255,40,40,0.18)'; ctx.fillRect(x, top, tr.w, tr.h); } // the deadly ones look it
    ctx.restore();
  },

  // Laser along a ledge: a round start-up icon blinks at its end before the beam fires
  drawLaser(ctx, x, tr, st, t) {
    const y = tr.y - GAME.dungeon.trap.laserH / 2;
    ctx.save();
    if (st === 'warn') {
      const a = 0.5 + Math.sin(t * 28) * 0.4;
      ctx.strokeStyle = `rgba(255,80,80,${a})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x - 6, y, 6, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(x - 6, y, 2.5, 0, 7); ctx.fillStyle = `rgba(255,200,200,${a})`; ctx.fill();
      ctx.strokeStyle = 'rgba(255,80,80,0.25)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + tr.w, y); ctx.stroke();
    } else if (st === 'on') {
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, y - 6, 0, y + 6);
      g.addColorStop(0, 'rgba(255,40,40,0)'); g.addColorStop(0.5, 'rgba(255,220,220,0.95)'); g.addColorStop(1, 'rgba(255,40,40,0)');
      ctx.fillStyle = g; ctx.fillRect(x, y - 6, tr.w, 12);
      ctx.fillStyle = 'rgba(255,90,60,0.5)'; ctx.fillRect(x, y - 1, tr.w, 2);
    } else { ctx.fillStyle = '#4a1a1a'; ctx.beginPath(); ctx.arc(x - 6, y, 3, 0, 7); ctx.fill(); }
    ctx.restore();
  },

  // Gas: wisps at the vents before it spills, then a heaving cloud (green slows you, purple only burns)
  drawGas(ctx, x, tr, st, t) {
    if (st === 'off') return;
    const c = tr.slow ? [120, 220, 90] : [170, 80, 220], top = tr.y - tr.h;
    ctx.save();
    const a = st === 'on' ? 0.32 : 0.12, n = st === 'on' ? 7 : 3;
    for (let i = 0; i < n; i++) {
      const cx = x + ((i + 0.5) * tr.w) / n + Math.sin(t * 1.6 + i) * 6;
      const cy = st === 'on' ? top + tr.h * 0.55 + Math.cos(t * 1.3 + i * 2) * tr.h * 0.25 : tr.y - 6;
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`;
      ctx.beginPath(); ctx.arc(cx, cy, st === 'on' ? tr.w / 3.2 : 6, 0, 7); ctx.fill();
    }
    ctx.restore();
  },

  // Fire wheel: spins while it is there, a faint flickering ring before it appears
  drawWheel(ctx, x, tr, st, t) {
    const r = tr.w / 2, cx = x + r, cy = tr.y - r;
    ctx.save();
    if (st === 'off') { ctx.globalAlpha = 0.15; ctx.strokeStyle = '#ff9a3a'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); ctx.restore(); return; }
    if (st === 'warn') ctx.globalAlpha = 0.35 + Math.sin(t * 30) * 0.25;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, r + 6);
    g.addColorStop(0, 'rgba(255,240,180,0.9)'); g.addColorStop(0.6, 'rgba(255,120,40,0.7)'); g.addColorStop(1, 'rgba(255,40,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, 7); ctx.fill();
    ctx.translate(cx, cy); ctx.rotate(t * 9);
    ctx.strokeStyle = '#fff0a0'; ctx.lineWidth = 2.2;
    for (let k = 0; k < 6; k++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(r * 0.6, -r * 0.3, r, 0); ctx.stroke(); }
    ctx.strokeStyle = '#ff7a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
    ctx.restore();
  },

  // Falling rock: a shadow on the ground grows while it falls; a dusty crack in the ceiling shortly before
  drawRock(ctx, cam, tr, st, tt) {
    const r = GAME.dungeon.trap.rock, cx = tr.x + tr.w / 2 - cam;
    ctx.save();
    if (st === 'warn') { ctx.fillStyle = 'rgba(160,140,110,0.6)'; ctx.fillRect(cx - 8, 0, 16, 4); ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(cx, GROUND_Y, r * 0.4, 2, 0, 0, 7); ctx.fill(); }
    if (st === 'on') {
      const b = trapBox(tr, tt), k = Math.max(0, (b.y + r) / GROUND_Y);
      ctx.fillStyle = `rgba(0,0,0,${0.15 + k * 0.3})`; ctx.beginPath(); ctx.ellipse(cx, GROUND_Y, r * (0.4 + k * 0.5), 2.5, 0, 0, 7); ctx.fill();
      const g = ctx.createRadialGradient(b.x - cam + r * 0.35, b.y + r * 0.3, 1, b.x - cam + r / 2, b.y + r / 2, r * 0.7);
      g.addColorStop(0, '#ffb060'); g.addColorStop(0.4, '#6a4a3a'); g.addColorStop(1, '#2a1a14');
      ctx.fillStyle = g; ctx.strokeStyle = '#140a06'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(b.x - cam + r / 2, b.y + r / 2, r / 2, 0, 7); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  },

  // Rolling fireball with a short glowing trail
  drawFireball(ctx, cam, tr, tt, t) {
    const b = trapBox(tr, tt), cx = b.x + b.w / 2 - cam, cy = b.y + b.h / 2;
    if (cx < -30 || cx > VIEW_W + 30) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 3; i >= 0; i--) {
      const g = ctx.createRadialGradient(cx - i * 6, cy, 1, cx - i * 6, cy, b.w * (0.9 - i * 0.15));
      g.addColorStop(0, i ? 'rgba(255,160,60,0.4)' : 'rgba(255,250,210,1)'); g.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx - i * 6, cy, b.w * (0.9 - i * 0.15), 0, 7); ctx.fill();
    }
    if (Math.random() < 0.3) this.spark(b.x + b.w / 2, cy, { vy: rand(-40, -10), vx: rand(-20, 0), color: pick(['#ffb040', '#ffe27a']), size: rand(1, 2), life: 0.4 });
    ctx.restore();
  },

  // Sinking mud: a dark, slowly heaving surface with bubbles
  drawPit(ctx, x, w, t) {
    const y = GROUND_Y - 3;
    ctx.save();
    const g = ctx.createLinearGradient(0, y, 0, VIEW_H);
    g.addColorStop(0, '#4a3a22'); g.addColorStop(0.25, '#2a2014'); g.addColorStop(1, '#120c06');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x, VIEW_H); ctx.lineTo(x, y);
    for (let i = 0; i <= w; i += 10) ctx.lineTo(x + i, y + Math.sin(t * 2 + i * 0.15) * 1.2);
    ctx.lineTo(x + w, VIEW_H); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 0.8;
    for (let i = 0; i < w / 45; i++) {
      const bx = x + ((i * 97) % w), k = (t * 0.6 + i * 0.37) % 1;
      ctx.strokeStyle = `rgba(170,150,100,${0.55 * (1 - k)})`;
      ctx.beginPath(); ctx.arc(bx, y + 7 - k * 5, 1 + k * 3, Math.PI, 0); ctx.stroke();
    }
    ctx.restore();
  },

  // Crumbling stone slab: shakes and cracks before it falls away, a faint outline while it is gone
  drawCrumble(ctx, x, tr, st, t) {
    const y = tr.y, h = 9;
    ctx.save();
    if (st === 'off') {
      ctx.globalAlpha = 0.22; ctx.strokeStyle = '#c8b89a'; ctx.setLineDash([3, 3]); ctx.strokeRect(x, y, tr.w, h);
      ctx.restore(); return;
    }
    if (st === 'warn') {
      ctx.translate(Math.sin(t * 70) * 1.2, 0);
      if (Math.random() < 0.25) this.spark(tr.x + rand(0, tr.w), y + h, { vy: rand(20, 60), vx: rand(-10, 10), color: '#a89878', size: rand(1, 2), life: 0.5, glow: false, grav: 300 });
    }
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#9a8a74'); g.addColorStop(1, '#4a3e34');
    ctx.fillStyle = g; ctx.fillRect(x, y, tr.w, h);
    ctx.fillStyle = '#c0b098'; ctx.fillRect(x, y, tr.w, 2);
    ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 0.8; ctx.strokeRect(x, y, tr.w, h);
    ctx.strokeStyle = st === 'warn' ? '#1a1008' : 'rgba(40,30,20,0.6)'; ctx.beginPath();
    const n = st === 'warn' ? 4 : 2;
    for (let i = 1; i <= n; i++) { const cx = x + (tr.w * i) / (n + 1); ctx.moveTo(cx, y + 1); ctx.lineTo(cx + 3, y + 4); ctx.lineTo(cx - 1, y + h); }
    ctx.stroke();
    ctx.restore();
  },

  // Spikes: slots in the floor, a red glint before they strike, a row of steel spikes while up
  drawSpikes(ctx, x, tr, st) {
    const y = tr.y, H = GAME.dungeon.trap.spikeH, h = st === 'on' ? H : st === 'warn' ? 3 : 0;
    ctx.save();
    ctx.fillStyle = 'rgba(20,12,16,0.75)'; ctx.fillRect(x, y - 1, tr.w, 3);
    if (h > 0) {
      const n = Math.max(2, Math.round(tr.w / 8)), sw = tr.w / n;
      const g = ctx.createLinearGradient(0, y - h, 0, y);
      g.addColorStop(0, '#f4f0f8'); g.addColorStop(1, '#5a5a6a');
      ctx.fillStyle = g; ctx.strokeStyle = '#22141c'; ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (let i = 0; i < n; i++) { const sx = x + i * sw; ctx.moveTo(sx + 1, y); ctx.lineTo(sx + sw / 2, y - h); ctx.lineTo(sx + sw - 1, y); ctx.closePath(); }
      ctx.fill(); ctx.stroke();
    }
    if (st === 'warn') { ctx.fillStyle = `rgba(255,70,50,${0.4 + Math.sin(this.time * 30) * 0.25})`; ctx.fillRect(x, y - 2, tr.w, 2); }
    ctx.restore();
  },

  // Fire column: embers at the vent before it erupts, then a flickering pillar of flame
  drawFlame(ctx, x, tr, st, t) {
    const y = tr.y, cx = x + tr.w / 2;
    ctx.save();
    ctx.fillStyle = '#2a1a14'; ctx.fillRect(x + 4, y - 3, tr.w - 8, 3);
    if (st === 'warn') {
      const g = ctx.createRadialGradient(cx, y - 2, 1, cx, y - 2, 14);
      g.addColorStop(0, `rgba(255,150,60,${0.6 + Math.sin(this.time * 25) * 0.25})`); g.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - 14, y - 16, 28, 18);
    } else if (st === 'on') {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i++) {
        const wob = Math.sin(t * 18 + i * 2) * 3, w = tr.w * (0.95 - i * 0.25), h = tr.h * (1 - i * 0.2);
        const g = ctx.createLinearGradient(0, y - h, 0, y);
        g.addColorStop(0, 'rgba(255,90,30,0)'); g.addColorStop(0.45, i ? 'rgba(255,200,90,0.8)' : 'rgba(255,110,40,0.75)'); g.addColorStop(1, i === 2 ? 'rgba(255,250,210,0.95)' : 'rgba(255,160,60,0.9)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(cx - w / 2, y);
        ctx.quadraticCurveTo(cx - w / 2 + wob, y - h * 0.6, cx + wob, y - h);
        ctx.quadraticCurveTo(cx + w / 2 + wob, y - h * 0.6, cx + w / 2, y);
        ctx.closePath(); ctx.fill();
      }
      if (Math.random() < 0.4) this.spark(tr.x + tr.w / 2 + rand(-6, 6), y - rand(10, tr.h), { vy: rand(-60, -20), vx: rand(-15, 15), color: pick(['#ffb040', '#ffe27a', '#ff6a2a']), size: rand(1, 2.2), life: rand(0.3, 0.6) });
    }
    ctx.restore();
  },
};
