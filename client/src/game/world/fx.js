// GameWorld: particles, floating text, weather and cape effects.
import { VIEW_W, VIEW_H } from '../../gfx/backgrounds.js';
import { rand, pick } from '../../../../shared/util.js';
import { PROJ_TRAIL } from './helpers.js';

export const FxWorld = {
  // ================= EFFECTS =================
  addFx(kind, x, y, dur, data) { this.effects.push({ kind, x, y, t: 0, dur, data }); },

  // Particles: o = { vx, vy, life, size, color, grav, drag, shape: 'dot'|'star'|'petal', glow }
  spark(x, y, o = {}) {
    if (this.particles.length > (o.weather ? 260 : 480)) return;
    this.particles.push({ x, y, vx: 0, vy: 0, t: 0, life: 0.6, size: 2, color: '#fff', grav: 0, drag: 0.9, shape: 'dot', glow: true, spin: rand(-6, 6), ...o });
  },

  capeFx(h, dt) {
    const fx = h.look && h.look.liveCape && h.look.liveCape.fx, tip = fx && h.cloth && h.cloth.tip();
    if (!tip || h.dead || Math.random() > dt * (Math.abs(h.vx) > 5 ? 14 : 3)) return;
    const o = { x: tip.x + rand(-4, 4), y: tip.y + rand(-3, 2), c: fx.c };
    if (fx.shape === 'ember') this.spark(o.x, o.y, { vx: rand(-10, 10), vy: rand(-40, -15), color: o.c, size: rand(1, 2), life: rand(0.4, 0.8), drag: 0.97 });
    else if (fx.shape === 'snow') this.spark(o.x, o.y, { vx: rand(-8, 8), vy: rand(6, 20), color: o.c, size: rand(1, 1.8), life: rand(0.8, 1.3), drag: 0.99, glow: false });
    else if (fx.shape === 'wisp') this.spark(o.x, o.y, { vx: rand(-6, 6), vy: rand(-25, -8), color: o.c, size: rand(1.5, 2.6), life: rand(0.6, 1.1), drag: 0.97, shape: 'bubble' });
    else this.spark(o.x, o.y, { vx: rand(-12, 12), vy: rand(-10, 14), color: o.c, size: rand(1.2, 2.4), life: rand(0.6, 1.1), drag: 0.97, shape: fx.shape === 'petal' ? 'petal' : 'star', glow: fx.shape !== 'petal' });
  },

  burst(x, y, color, n = 8, speed = 70, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(speed * 0.4, speed);
      this.spark(x, y, { vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.2, color, life: rand(0.3, 0.6), size: rand(1.5, 3), ...o });
    }
  },

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
  },

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
    // capes with an effect shed particles from their hem while the wearer moves (us and other players)
    for (const h of [p, ...this.remotes.values()]) this.capeFx(h, dt);
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
  },

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
  },

  floatText(x, y, text, color, big = false, small = false, hurt = false) {
    this.texts.push({ x: x + rand(-4, 4), y, text: String(text), color, big, small, hurt, t: 0 });
  },
};
