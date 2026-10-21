// Draws layered (parallax) backgrounds plus ground/platforms for each map
import { makeHi, shade } from './draw.js';

// Backgrounds are drawn at double resolution for sharpness
export const BG_S = 2;
const bgCanvas = (w, h) => makeHi(w, h, BG_S);
export function drawLayer(ctx, img, x) { ctx.drawImage(img, x, 0, img.width / BG_S, img.height / BG_S); }
import { seeded } from '../engine/util.js';
import { GROUND_Y } from '../data/maps.js';

export const VIEW_W = 640, VIEW_H = 360;

const THEMES = {
  village: { sky: ['#1b1838', '#3d2d5c', '#8a4d6a'], moon: '#ffe9c4', far: '#2b2a4f', mid: '#1c2a2e', ground: '#5a4232', grass: '#4f7a3a', plat: 'wood', fog: 'rgba(255,200,220,0.06)' },
  forest: { sky: ['#07141a', '#0f2a2e', '#1f4a44'], moon: '#d8fff0', far: '#0f2a2a', mid: '#0a1c1c', ground: '#3a3024', grass: '#2f6a42', plat: 'wood', fog: 'rgba(120,255,220,0.07)' },
  field: { sky: ['#1a0f1a', '#5a2a2a', '#c4683a'], moon: '#ffd08a', far: '#3a1f24', mid: '#24141a', ground: '#6a4a2a', grass: '#8a7a3a', plat: 'straw', fog: 'rgba(255,170,90,0.07)' },
  graveyard: { sky: ['#06070f', '#141a2e', '#2e3a52'], moon: '#e8f0ff', far: '#151a2a', mid: '#0c0f1a', ground: '#3a3a40', grass: '#3a4a3a', plat: 'stone', fog: 'rgba(180,200,255,0.09)' },
  hell: { sky: ['#0a0204', '#2a0610', '#6a1018'], moon: '#ff6a4a', far: '#1a0408', mid: '#120206', ground: '#1e1418', grass: '#5a1a1a', plat: 'obsidian', fog: 'rgba(255,60,40,0.08)' },
  swamp: { sky: ['#0a120e', '#1a2a1e', '#3a4a2a'], moon: '#e8f4c8', far: '#16241a', mid: '#0e1a12', ground: '#2e3420', grass: '#4a6a2a', plat: 'moss', fog: 'rgba(170,220,140,0.14)' },
  snow: { sky: ['#0e1a30', '#2a4468', '#7aa0c8'], moon: '#f4f8ff', far: '#3a5478', mid: '#24384e', ground: '#e8f0fa', grass: '#ffffff', plat: 'snow', fog: 'rgba(230,240,255,0.16)', snowcap: true },
  icecave: { sky: ['#040814', '#0a1830', '#143058'], moon: null, far: '#0c1c34', mid: '#0a1428', ground: '#2a4a6a', grass: '#bfe8ff', plat: 'ice', fog: 'rgba(120,200,255,0.12)', cave: true },
  temple: { sky: ['#0c0410', '#2a0a1e', '#6a1a2a'], moon: '#ff5a64', far: '#1e0a18', mid: '#140812', ground: '#3a2c30', grass: '#5a2a30', plat: 'stone', fog: 'rgba(255,80,100,0.1)' },
  volcano: { sky: ['#140404', '#3a0e08', '#a8381a'], moon: '#ffb070', far: '#2a0c08', mid: '#1a0806', ground: '#241614', grass: '#5a1e10', plat: 'obsidian', fog: 'rgba(255,120,40,0.12)', lava: true },
};

export function themeOf(map) { return THEMES[map.theme]; }

function drawSky(t, rnd) {
  const { c, ctx } = bgCanvas(VIEW_W, VIEW_H);
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, t.sky[0]); g.addColorStop(0.55, t.sky[1]); g.addColorStop(1, t.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (t.cave) { // cave ceiling with glowing icicles
    for (let x = 0; x < VIEW_W; x += 14 + rnd() * 20) {
      const h = 20 + rnd() * 70;
      ctx.fillStyle = 'rgba(120,190,255,0.18)';
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 6, h); ctx.lineTo(x + 12, 0); ctx.fill();
    }
    return c;
  }
  // sao
  for (let i = 0; i < 90; i++) {
    ctx.globalAlpha = 0.3 + rnd() * 0.7;
    ctx.fillStyle = '#fff';
    const s = rnd() < 0.1 ? 2 : 1;
    ctx.fillRect(Math.floor(rnd() * VIEW_W), Math.floor(rnd() * VIEW_H * 0.55), s, s);
  }
  ctx.globalAlpha = 1;
  if (!t.moon) return c;
  // moon
  const mx = 470, my = 70;
  const mg = ctx.createRadialGradient(mx, my, 10, mx, my, 90);
  mg.addColorStop(0, shade(t.moon, 0) + '55'); mg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = mg; ctx.fillRect(mx - 90, my - 90, 180, 180);
  ctx.fillStyle = t.moon; ctx.beginPath(); ctx.arc(mx, my, 26, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = shade(t.moon, -0.12);
  ctx.beginPath(); ctx.arc(mx - 8, my - 6, 5, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(mx + 9, my + 8, 4, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(mx + 4, my - 12, 3, 0, 7); ctx.fill();
  return c;
}

function mountainLayer(width, color, rnd, baseY, amp, jag) {
  const { c, ctx } = bgCanvas(width, VIEW_H);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(0, VIEW_H);
  let y = baseY;
  for (let x = 0; x <= width; x += jag) {
    y = baseY - Math.abs(Math.sin(x * 0.006 + rnd() * 0.3)) * amp - rnd() * amp * 0.35;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, VIEW_H); ctx.closePath(); ctx.fill();
  return { c, ctx };
}

function drawFar(map, t, rnd) {
  const w = Math.ceil(VIEW_W + (map.width - VIEW_W) * 0.15) + 4;
  const { c, ctx } = mountainLayer(w, t.far, rnd, 230, 90, 24);
  if (map.theme === 'graveyard') { // old pagoda in the distance
    const px = Math.floor(w * 0.6);
    ctx.fillStyle = shade(t.far, -0.3);
    for (let i = 0; i < 5; i++) {
      const ww = 50 - i * 8, yy = 150 - i * 18;
      ctx.fillRect(px - ww / 2, yy, ww, 14);
      ctx.beginPath(); ctx.moveTo(px - ww / 2 - 10, yy + 2); ctx.lineTo(px + ww / 2 + 10, yy + 2); ctx.lineTo(px + ww / 2, yy - 4); ctx.lineTo(px - ww / 2, yy - 4); ctx.fill();
    }
    ctx.fillRect(px - 1, 50, 2, 20);
  }
  if (map.theme === 'temple') { // ruined curved temple roofs in the distance
    ctx.fillStyle = shade(t.far, -0.35);
    for (const fx of [0.18, 0.5, 0.82]) {
      const px = Math.floor(w * fx), tiers = fx === 0.5 ? 4 : 3;
      for (let i = 0; i < tiers; i++) {
        const ww = 70 - i * 14, yy = 200 - i * 26;
        ctx.fillRect(px - ww / 2 + 6, yy, ww - 12, 18);
        ctx.beginPath(); ctx.moveTo(px - ww / 2 - 16, yy - 2); ctx.quadraticCurveTo(px - ww / 2, yy, px - ww / 2 + 4, yy - 8);
        ctx.lineTo(px + ww / 2 - 4, yy - 8); ctx.quadraticCurveTo(px + ww / 2, yy, px + ww / 2 + 16, yy - 2); ctx.lineTo(px + ww / 2 + 2, yy + 3); ctx.lineTo(px - ww / 2 - 2, yy + 3); ctx.fill();
      }
      ctx.fillRect(px - 1, 200 - tiers * 26 - 18, 2, 22);
    }
  }
  if (map.theme === 'hell') {
    ctx.fillStyle = 'rgba(255,80,40,0.25)';
    ctx.fillRect(0, 300, w, 60);
  }
  if (t.snowcap) { // snow-capped peaks
    ctx.globalCompositeOperation = 'source-atop';
    const g = ctx.createLinearGradient(0, 120, 0, 200);
    g.addColorStop(0, 'rgba(240,248,255,0.95)'); g.addColorStop(1, 'rgba(240,248,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 100, w, 110);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (t.lava) { // volcano spewing smoke
    const px = w * 0.55;
    ctx.fillStyle = shade(t.far, -0.2);
    ctx.beginPath(); ctx.moveTo(px - 160, 300); ctx.lineTo(px - 30, 110); ctx.lineTo(px + 30, 110); ctx.lineTo(px + 160, 300); ctx.fill();
    const g = ctx.createRadialGradient(px, 110, 4, px, 110, 60);
    g.addColorStop(0, 'rgba(255,200,90,0.9)'); g.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = g; ctx.fillRect(px - 60, 50, 120, 120);
    ctx.strokeStyle = 'rgba(255,120,40,0.7)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(px - 10, 112); ctx.quadraticCurveTo(px - 30, 180, px - 60, 260); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px + 12, 112); ctx.quadraticCurveTo(px + 26, 190, px + 70, 270); ctx.stroke();
    ctx.fillStyle = 'rgba(40,20,20,0.55)';
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(px + Math.sin(i) * 20 + i * 6, 90 - i * 14, 18 + i * 5, 0, 7); ctx.fill(); }
  }
  if (t.cave) {
    ctx.fillStyle = shade(t.far, 0.08);
    for (let x = 0; x < w; x += 30 + rnd() * 40) { const h = 40 + rnd() * 110; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 12, h); ctx.lineTo(x + 26, 0); ctx.fill(); }
  }
  return { img: c, factor: 0.15 };
}

function bambooCluster(ctx, x, base, rnd, col) {
  const n = 3 + Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++) {
    const bx = x + i * 7 + rnd() * 4, h = 140 + rnd() * 120;
    ctx.fillStyle = col; ctx.fillRect(bx, base - h, 4, h);
    ctx.fillStyle = shade(col, 0.15);
    for (let y = base - h; y < base; y += 22) ctx.fillRect(bx - 1, y, 6, 2);
    for (let k = 0; k < 4; k++) { // leaves
      const ly = base - h + rnd() * h * 0.6;
      ctx.beginPath(); ctx.ellipse(bx + (rnd() < 0.5 ? -8 : 12), ly, 10, 3, rnd() - 0.5, 0, 7); ctx.fill();
    }
  }
}

function tree(ctx, x, base, rnd, col, dead) {
  const h = 120 + rnd() * 90;
  ctx.fillStyle = col;
  ctx.fillRect(x - 5, base - h, 10, h);
  ctx.fillRect(x - 9, base - 8, 18, 8);
  if (dead) {
    ctx.strokeStyle = col; ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const by = base - h + rnd() * h * 0.6, dir = rnd() < 0.5 ? -1 : 1;
      ctx.beginPath(); ctx.moveTo(x, by); ctx.lineTo(x + dir * (20 + rnd() * 30), by - 10 - rnd() * 25); ctx.stroke();
    }
  } else {
    for (let i = 0; i < 6; i++) {
      ctx.beginPath(); ctx.arc(x + (rnd() - 0.5) * 60, base - h + (rnd() - 0.3) * 40, 22 + rnd() * 18, 0, 7); ctx.fill();
    }
  }
}

function house(ctx, x, base, col) {
  // Curved-roof house in village-hall style
  ctx.fillStyle = shade(col, 0.1); ctx.fillRect(x, base - 60, 90, 60);
  ctx.fillStyle = shade(col, -0.2);
  ctx.beginPath(); ctx.moveTo(x - 22, base - 56); ctx.quadraticCurveTo(x + 45, base - 70, x + 112, base - 56);
  ctx.lineTo(x + 100, base - 64); ctx.lineTo(x + 70, base - 96); ctx.lineTo(x + 20, base - 96); ctx.lineTo(x - 10, base - 64); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 26, base - 52); ctx.lineTo(x - 18, base - 62); ctx.lineTo(x - 12, base - 56); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 116, base - 52); ctx.lineTo(x + 108, base - 62); ctx.lineTo(x + 102, base - 56); ctx.fill();
  ctx.fillStyle = 'rgba(255,190,90,0.55)'; ctx.fillRect(x + 14, base - 44, 14, 16); ctx.fillRect(x + 62, base - 44, 14, 16);
  ctx.fillStyle = shade(col, -0.35); ctx.fillRect(x + 38, base - 40, 14, 40);
}

function drawMid(map, t, rnd) {
  const w = Math.ceil(VIEW_W + (map.width - VIEW_W) * 0.45) + 4;
  const { c, ctx } = bgCanvas(w, VIEW_H);
  const base = 330;
  if (map.theme === 'village') {
    for (let x = 0; x < w; x += 70 + rnd() * 90) bambooCluster(ctx, x, base, rnd, t.mid);
    for (let x = 120; x < w; x += 260 + rnd() * 140) house(ctx, x, base, '#2a2438');
  } else if (map.theme === 'forest') {
    for (let x = 0; x < w; x += 40 + rnd() * 60) tree(ctx, x, base, rnd, t.mid, false);
    for (let x = 0; x < w; x += 80 + rnd() * 80) bambooCluster(ctx, x, base, rnd, shade(t.mid, 0.15));
  } else if (map.theme === 'field') {
    ctx.fillStyle = shade(t.mid, 0.1); ctx.fillRect(0, 290, w, 70);
    for (let x = 0; x < w; x += 6) { ctx.fillStyle = shade(t.mid, 0.25); ctx.fillRect(x, 282 + Math.sin(x * 0.2) * 3, 2, 10); }
    for (let x = 60; x < w; x += 120 + rnd() * 160) tree(ctx, x, base, rnd, t.mid, true);
  } else if (map.theme === 'graveyard') {
    for (let x = 30; x < w; x += 90 + rnd() * 120) tree(ctx, x, base, rnd, t.mid, true);
    ctx.fillStyle = shade(t.mid, 0.1);
    for (let x = 0; x < w; x += 30 + rnd() * 40) { const h = 14 + rnd() * 18; ctx.fillRect(x, 300 - h, 12, h + 30); ctx.beginPath(); ctx.arc(x + 6, 300 - h, 6, Math.PI, 0); ctx.fill(); }
  } else if (map.theme === 'temple') {
    // broken stone pillars, three-entrance gate, talisman ropes strung between pillars
    let last = null;
    for (let x = 30; x < w; x += 70 + rnd() * 90) {
      const h = 80 + rnd() * 130, broken = rnd() < 0.45;
      ctx.fillStyle = t.mid; ctx.fillRect(x - 8, base - h, 16, h);
      ctx.fillStyle = shade(t.mid, 0.12); ctx.fillRect(x - 11, base - h - 6, 22, 7); ctx.fillRect(x - 11, base - 10, 22, 10);
      if (broken) { ctx.clearRect(x - 9, base - h - 8, 18, 10); ctx.fillStyle = t.mid; ctx.beginPath(); ctx.moveTo(x - 8, base - h + 4); ctx.lineTo(x - 2, base - h - 6); ctx.lineTo(x + 3, base - h + 2); ctx.lineTo(x + 8, base - h - 3); ctx.lineTo(x + 8, base - h + 6); ctx.fill(); }
      if (last && x - last.x < 170) {
        const y0 = Math.max(base - last.h, base - h) + 12;
        ctx.strokeStyle = 'rgba(200,150,120,0.55)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(last.x, y0); ctx.quadraticCurveTo((last.x + x) / 2, y0 + 24, x, y0); ctx.stroke();
        for (let k = 1; k < 5; k++) {
          const tx = last.x + (x - last.x) * k / 5, ty = y0 + Math.sin(Math.PI * k / 5) * 18;
          ctx.fillStyle = k % 2 ? 'rgba(230,200,120,0.75)' : 'rgba(210,60,70,0.75)'; ctx.fillRect(tx - 2.5, ty, 5, 11);
        }
      }
      last = { x, h };
    }
    for (let x = 200; x < w; x += 420 + rnd() * 200) { // three-entrance gate
      ctx.fillStyle = shade(t.mid, 0.06);
      ctx.fillRect(x, base - 150, 12, 150); ctx.fillRect(x + 108, base - 150, 12, 150);
      ctx.beginPath(); ctx.moveTo(x - 30, base - 150); ctx.quadraticCurveTo(x - 10, base - 152, x - 6, base - 164); ctx.lineTo(x + 126, base - 164); ctx.quadraticCurveTo(x + 130, base - 152, x + 150, base - 150); ctx.lineTo(x + 130, base - 142); ctx.lineTo(x - 10, base - 142); ctx.fill();
      ctx.fillRect(x - 4, base - 128, 128, 7);
    }
  } else if (map.theme === 'hell') {
    ctx.fillStyle = t.mid;
    for (let x = 0; x < w; x += 30) { const h = 60 + rnd() * 140; ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x + 15, base - h); ctx.lineTo(x + 34, base); ctx.fill(); }
  } else if (map.theme === 'swamp') {
    // mangroves with stilt roots + reeds
    for (let x = 20; x < w; x += 70 + rnd() * 90) {
      const h = 130 + rnd() * 100;
      ctx.fillStyle = t.mid; ctx.fillRect(x - 4, base - h, 8, h - 20);
      ctx.strokeStyle = t.mid; ctx.lineWidth = 3;
      for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x, base - 30); ctx.quadraticCurveTo(x + k * 8, base - 16, x + k * 14, base); ctx.stroke(); }
      ctx.fillStyle = shade(t.mid, 0.12);
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(x + (rnd() - 0.5) * 50, base - h + rnd() * 30, 24 + rnd() * 12, 12, 0, 0, 7); ctx.fill(); }
      // hanging moss
      ctx.strokeStyle = shade(t.grass, -0.35); ctx.lineWidth = 1.2;
      for (let i = 0; i < 4; i++) { const sx = x - 20 + rnd() * 40; ctx.beginPath(); ctx.moveTo(sx, base - h + 10); ctx.lineTo(sx + 1, base - h + 30 + rnd() * 30); ctx.stroke(); }
    }
    ctx.fillStyle = shade(t.mid, 0.2);
    for (let x = 0; x < w; x += 5) ctx.fillRect(x, 290 - rnd() * 18, 1.4, 40);
  } else if (map.theme === 'snow') {
    // snow-covered pine forest
    for (let x = 10; x < w; x += 40 + rnd() * 50) {
      const h = 90 + rnd() * 90, tw = 26 + rnd() * 14;
      ctx.fillStyle = t.mid;
      ctx.fillRect(x - 2, base - 20, 4, 20);
      for (let k = 0; k < 4; k++) {
        const yy = base - 16 - k * (h / 4.5), ww = tw * (1 - k * 0.2);
        ctx.fillStyle = t.mid; ctx.beginPath(); ctx.moveTo(x - ww, yy); ctx.lineTo(x, yy - h / 3); ctx.lineTo(x + ww, yy); ctx.fill();
        ctx.fillStyle = 'rgba(240,248,255,0.85)'; ctx.beginPath(); ctx.moveTo(x - ww * 0.55, yy - h / 6.5); ctx.lineTo(x, yy - h / 3); ctx.lineTo(x + ww * 0.55, yy - h / 6.5); ctx.quadraticCurveTo(x, yy - h / 5, x - ww * 0.55, yy - h / 6.5); ctx.fill();
      }
    }
  } else if (map.theme === 'icecave') {
    // ice pillars + glowing crystals
    for (let x = 30; x < w; x += 90 + rnd() * 110) {
      const h = 120 + rnd() * 120;
      const g = ctx.createLinearGradient(x - 14, 0, x + 14, 0);
      g.addColorStop(0, '#16304e'); g.addColorStop(0.5, '#2a5a8a'); g.addColorStop(1, '#16304e');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 14, base); ctx.lineTo(x - 8, base - h); ctx.lineTo(x + 8, base - h - 10); ctx.lineTo(x + 16, base); ctx.fill();
    }
    for (let x = 0; x < w; x += 50 + rnd() * 60) {
      const h = 20 + rnd() * 40;
      const gl = ctx.createRadialGradient(x, base - h / 2, 1, x, base - h / 2, h);
      gl.addColorStop(0, 'rgba(140,220,255,0.35)'); gl.addColorStop(1, 'rgba(140,220,255,0)');
      ctx.fillStyle = gl; ctx.fillRect(x - h, base - h * 1.5, h * 2, h * 2);
      ctx.fillStyle = 'rgba(160,220,255,0.65)'; ctx.beginPath(); ctx.moveTo(x - 6, base); ctx.lineTo(x, base - h); ctx.lineTo(x + 6, base); ctx.fill();
    }
    ctx.fillStyle = t.mid;
    for (let x = 0; x < w; x += 20 + rnd() * 30) { const h = 10 + rnd() * 50; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 7, h); ctx.lineTo(x + 14, 0); ctx.fill(); }
  } else if (map.theme === 'volcano') {
    // jagged volcanic rock, flowing lava
    ctx.fillStyle = t.mid;
    for (let x = 0; x < w; x += 40 + rnd() * 50) { const h = 50 + rnd() * 120; ctx.beginPath(); ctx.moveTo(x - 10, base); ctx.lineTo(x + 6, base - h); ctx.lineTo(x + 18, base - h + 14); ctx.lineTo(x + 36, base); ctx.fill(); }
    for (let x = 80; x < w; x += 260 + rnd() * 200) {
      const g = ctx.createLinearGradient(0, 160, 0, base);
      g.addColorStop(0, 'rgba(255,200,80,0.9)'); g.addColorStop(1, 'rgba(255,80,20,0.6)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, 160); ctx.quadraticCurveTo(x + 8, 240, x - 4, base); ctx.lineTo(x + 10, base); ctx.quadraticCurveTo(x + 18, 240, x + 6, 160); ctx.fill();
    }
  }
  // fog
  const fg = ctx.createLinearGradient(0, 220, 0, 360);
  fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, t.fog.replace(/[\d.]+\)$/, '0.35)'));
  ctx.fillStyle = fg; ctx.fillRect(0, 220, w, 140);
  return { img: c, factor: 0.45 };
}

function drawPlatform(ctx, p, t, rnd, isGround) {
  const h = isGround ? VIEW_H - p.y : 12;
  const { x, y, w } = p;
  if (t.plat === 'wood') {
    ctx.fillStyle = isGround ? t.ground : '#6b4a2a'; ctx.fillRect(x, y, w, h);
    if (!isGround) {
      ctx.fillStyle = '#8a6438'; ctx.fillRect(x, y + 2, w, 3);
      ctx.fillStyle = '#4a321a'; ctx.fillRect(x, y + h - 3, w, 3);
      for (let i = x + 10; i < x + w; i += 18) { ctx.fillStyle = '#3a2412'; ctx.fillRect(i, y + 2, 1, h - 3); }
      // hanging vines
      ctx.fillStyle = shade(t.grass, -0.1);
      for (let i = x + 6; i < x + w - 4; i += 14 + rnd() * 20) ctx.fillRect(i, y + h, 2, 6 + rnd() * 16);
    }
  } else if (t.plat === 'straw') {
    ctx.fillStyle = isGround ? t.ground : '#a8803a'; ctx.fillRect(x, y, w, h);
    if (!isGround) { ctx.fillStyle = '#d9b45a'; for (let i = x; i < x + w; i += 3) ctx.fillRect(i, y - 1 + (i % 2), 2, 4); ctx.fillStyle = '#6a4a1a'; ctx.fillRect(x, y + h - 3, w, 3); }
  } else if (t.plat === 'stone') {
    ctx.fillStyle = isGround ? t.ground : '#5a5e6a'; ctx.fillRect(x, y, w, h);
    if (!isGround) {
      ctx.fillStyle = '#7a7e8a'; ctx.fillRect(x, y, w, 3);
      ctx.fillStyle = '#3a3e4a'; for (let i = x + 16; i < x + w; i += 24) ctx.fillRect(i, y + 3, 1, h - 3);
      ctx.fillRect(x, y + h - 2, w, 2);
    }
  } else if (t.plat === 'moss') {
    ctx.fillStyle = isGround ? t.ground : '#4a4030'; ctx.fillRect(x, y, w, h);
    if (!isGround) {
      ctx.fillStyle = '#5e5240'; ctx.fillRect(x, y + 2, w, 3);
      ctx.fillStyle = '#2a2418'; ctx.fillRect(x, y + h - 3, w, 3);
      ctx.fillStyle = shade(t.grass, -0.2);
      for (let i = x + 6; i < x + w - 4; i += 10 + rnd() * 14) ctx.fillRect(i, y + h, 1.5, 6 + rnd() * 18);
    } else { // swamp puddles
      ctx.fillStyle = 'rgba(60,90,70,0.6)';
      for (let i = 0; i < w; i += 160 + rnd() * 200) { ctx.beginPath(); ctx.ellipse(x + i, y + 14, 40 + rnd() * 30, 4, 0, 0, 7); ctx.fill(); }
    }
  } else if (t.plat === 'snow') {
    ctx.fillStyle = isGround ? '#9ab0c8' : '#5a6a80'; ctx.fillRect(x, y, w, h);
    if (!isGround) {
      ctx.fillStyle = '#7a8aa0'; ctx.fillRect(x, y + 4, w, 2);
      ctx.fillStyle = 'rgba(200,230,255,0.8)'; // icicles
      for (let i = x + 6; i < x + w - 4; i += 12 + rnd() * 16) { ctx.beginPath(); ctx.moveTo(i, y + h); ctx.lineTo(i + 2, y + h + 4 + rnd() * 8); ctx.lineTo(i + 4, y + h); ctx.fill(); }
    } else {
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, '#f4f8ff'); g.addColorStop(0.25, '#c8d8ec'); g.addColorStop(1, '#8aa0bc');
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    }
  } else if (t.plat === 'ice') {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#c8f0ff'); g.addColorStop(0.3, '#5aa0d8'); g.addColorStop(1, '#1a3a68');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = x + 10; i < x + w; i += 30 + rnd() * 30) ctx.fillRect(i, y + 3, 10 + rnd() * 10, 1);
    if (!isGround) {
      ctx.fillStyle = 'rgba(180,230,255,0.8)';
      for (let i = x + 6; i < x + w - 4; i += 12 + rnd() * 16) { ctx.beginPath(); ctx.moveTo(i, y + h); ctx.lineTo(i + 2, y + h + 5 + rnd() * 9); ctx.lineTo(i + 4, y + h); ctx.fill(); }
    }
  } else { // obsidian
    ctx.fillStyle = isGround ? t.ground : '#2a1a22'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#ff5a2a';
    for (let i = x + 8; i < x + w; i += 20 + rnd() * 30) ctx.fillRect(i, y + 4 + rnd() * (isGround ? 30 : 4), 6 + rnd() * 10, 1);
    if (!isGround) { ctx.fillStyle = '#4a2a34'; ctx.fillRect(x, y, w, 2); }
  }
  // grass / snow on top
  if (t.plat === 'snow' || t.plat === 'ice') {
    ctx.fillStyle = t.plat === 'snow' ? '#ffffff' : '#e8f8ff';
    ctx.beginPath(); ctx.moveTo(x, y + 2);
    for (let i = 0; i <= w; i += 8) ctx.quadraticCurveTo(x + i + 4, y - 3 - rnd() * 2, x + Math.min(w, i + 8), y);
    ctx.lineTo(x + w, y + 3); ctx.lineTo(x, y + 3); ctx.fill();
  } else if (t.plat !== 'obsidian') {
    ctx.fillStyle = t.grass; ctx.fillRect(x, y - 2, w, 3);
    ctx.fillStyle = shade(t.grass, 0.25);
    for (let i = x; i < x + w; i += 4 + Math.floor(rnd() * 4)) ctx.fillRect(i, y - 4, 1, 3);
  }
  if (isGround && t.plat !== 'snow' && t.plat !== 'ice') { // ground with stones
    ctx.fillStyle = shade(t.ground, -0.2);
    for (let i = 0; i < w / 14; i++) ctx.fillRect(x + rnd() * w, y + 8 + rnd() * (h - 12), 4 + rnd() * 6, 2 + rnd() * 3);
    ctx.fillStyle = shade(t.ground, 0.1);
    ctx.fillRect(x, y + 1, w, 3);
  }
}

function drawDecor(ctx, map, rnd) {
  const gy = GROUND_Y;
  const lantern = (x, y) => {
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x, y, 2, gy - y);
    ctx.fillRect(x - 6, y, 14, 2);
    const g = ctx.createRadialGradient(x + 7, y + 10, 1, x + 7, y + 10, 20);
    g.addColorStop(0, 'rgba(255,170,80,0.5)'); g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 15, y - 10, 44, 44);
    ctx.fillStyle = '#d23a2a'; ctx.fillRect(x + 3, y + 3, 9, 12); ctx.fillStyle = '#ffcf6a'; ctx.fillRect(x + 5, y + 6, 5, 6);
  };
  if (map.theme === 'village') {
    for (let x = 100; x < map.width; x += 230) lantern(x, gy - 46);
    // village gate
    const gx = 40;
    ctx.fillStyle = '#5a3a2a'; ctx.fillRect(gx, gy - 90, 8, 90); ctx.fillRect(gx + 70, gy - 90, 8, 90);
    ctx.fillStyle = '#3a2420'; ctx.fillRect(gx - 12, gy - 100, 102, 12);
    ctx.fillStyle = '#c9a24a'; ctx.fillRect(gx + 22, gy - 86, 34, 12);
  } else if (map.theme === 'graveyard') {
    for (let x = 80; x < map.width; x += 60 + rnd() * 90) {
      const h = 18 + rnd() * 12;
      ctx.fillStyle = '#6a6e78'; ctx.fillRect(x, gy - h, 14, h);
      ctx.fillStyle = '#4a4e58'; ctx.fillRect(x - 2, gy - 3, 18, 3);
      ctx.fillStyle = '#3a3e48'; ctx.fillRect(x + 4, gy - h + 4, 6, 1); ctx.fillRect(x + 6, gy - h + 3, 2, 8);
      if (rnd() < 0.4) { ctx.fillStyle = '#c84a2a'; ctx.fillRect(x + 16, gy - 8, 1, 8); ctx.fillRect(x + 18, gy - 9, 1, 9); }
    }
  } else if (map.theme === 'field') {
    for (let x = 140; x < map.width; x += 200 + rnd() * 160) {
      ctx.fillStyle = '#4a3a20'; ctx.fillRect(x, gy - 40, 3, 40); ctx.fillRect(x - 12, gy - 30, 27, 2);
    }
  } else if (map.theme === 'hell') {
    // The Ghost Gate
    const gx = map.width / 2 - 110;
    ctx.fillStyle = '#1a0a0e'; ctx.fillRect(gx, gy - 170, 26, 170); ctx.fillRect(gx + 194, gy - 170, 26, 170);
    ctx.fillStyle = '#2a0e14'; ctx.fillRect(gx - 30, gy - 196, 280, 30);
    ctx.beginPath(); ctx.moveTo(gx - 50, gy - 190); ctx.lineTo(gx - 30, gy - 210); ctx.lineTo(gx + 250, gy - 210); ctx.lineTo(gx + 270, gy - 190); ctx.fill();
    ctx.fillStyle = '#8a1a1a'; ctx.fillRect(gx + 70, gy - 192, 80, 22);
    ctx.fillStyle = '#e8c35a'; ctx.font = 'bold 13px serif'; ctx.textAlign = 'center'; ctx.fillText('鬼門關', gx + 110, gy - 176);
    for (let x = 60; x < map.width; x += 140) lantern(x, gy - 50);
  } else if (map.theme === 'swamp') {
    for (let x = 60; x < map.width; x += 90 + rnd() * 120) { // reeds + water lilies
      ctx.strokeStyle = '#6a7a3a'; ctx.lineWidth = 1.2;
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + k * 3, gy); ctx.quadraticCurveTo(x + k * 3 + 3, gy - 20, x + k * 4 + 2, gy - 30 - rnd() * 14); ctx.stroke(); }
      ctx.fillStyle = '#5a3a20'; ctx.fillRect(x + 7, gy - 38, 3, 9);
    }
    for (let x = 200; x < map.width; x += 260 + rnd() * 200) { // fisherman's stilt house
      ctx.fillStyle = '#3a3020'; ctx.fillRect(x, gy - 34, 4, 34); ctx.fillRect(x + 56, gy - 34, 4, 34);
      ctx.fillStyle = '#4a3c28'; ctx.fillRect(x - 6, gy - 40, 72, 6);
      ctx.fillStyle = '#6a5a3a'; ctx.beginPath(); ctx.moveTo(x - 10, gy - 40); ctx.lineTo(x + 30, gy - 66); ctx.lineTo(x + 70, gy - 40); ctx.fill();
      break;
    }
  } else if (map.theme === 'snow') {
    for (let x = 80; x < map.width; x += 140 + rnd() * 160) { // snow pile
      ctx.fillStyle = '#f4f8ff'; ctx.beginPath(); ctx.ellipse(x, gy, 18 + rnd() * 14, 7, 0, Math.PI, 0); ctx.fill();
    }
    // hunter's tent
    const lx = 120;
    ctx.fillStyle = '#8a5a3a'; ctx.beginPath(); ctx.moveTo(lx, gy); ctx.lineTo(lx + 40, gy - 54); ctx.lineTo(lx + 80, gy); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(lx + 22, gy - 30); ctx.lineTo(lx + 40, gy - 56); ctx.lineTo(lx + 58, gy - 30); ctx.quadraticCurveTo(lx + 40, gy - 36, lx + 22, gy - 30); ctx.fill();
    ctx.fillStyle = '#3a2418'; ctx.beginPath(); ctx.moveTo(lx + 32, gy); ctx.lineTo(lx + 40, gy - 22); ctx.lineTo(lx + 48, gy); ctx.fill();
    const fg = ctx.createRadialGradient(lx + 100, gy - 6, 1, lx + 100, gy - 6, 26); fg.addColorStop(0, 'rgba(255,170,60,0.7)'); fg.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = fg; ctx.fillRect(lx + 74, gy - 32, 52, 40);
    ctx.fillStyle = '#ff9a3a'; ctx.beginPath(); ctx.moveTo(lx + 95, gy); ctx.quadraticCurveTo(lx + 100, gy - 16, lx + 105, gy); ctx.fill();
  } else if (map.theme === 'icecave') {
    for (let x = 60; x < map.width; x += 100 + rnd() * 130) {
      const h = 12 + rnd() * 22;
      ctx.fillStyle = 'rgba(170,230,255,0.85)';
      ctx.beginPath(); ctx.moveTo(x - 5, gy); ctx.lineTo(x - 1, gy - h); ctx.lineTo(x + 4, gy); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 2, gy); ctx.lineTo(x + 7, gy - h * 0.6); ctx.lineTo(x + 10, gy); ctx.fill();
    }
  } else if (map.theme === 'volcano') {
    for (let x = 60; x < map.width; x += 120 + rnd() * 160) { // lava cracks
      const g = ctx.createRadialGradient(x, gy, 1, x, gy, 24); g.addColorStop(0, 'rgba(255,140,40,0.55)'); g.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 24, gy - 24, 48, 30);
    }
    if (map.decor === 'arena') { // Qilin Altar: stone platform with two fire pillars
      const cx = map.width / 2;
      ctx.fillStyle = '#2a1410'; ctx.fillRect(cx - 200, gy - 14, 400, 14);
      ctx.fillStyle = '#3a1c14'; ctx.fillRect(cx - 190, gy - 18, 380, 4);
      for (const px of [cx - 230, cx + 214]) {
        ctx.fillStyle = '#2a1410'; ctx.fillRect(px, gy - 140, 16, 140);
        ctx.fillStyle = '#e8c35a'; ctx.fillRect(px - 4, gy - 146, 24, 6);
        const g = ctx.createRadialGradient(px + 8, gy - 160, 2, px + 8, gy - 160, 30); g.addColorStop(0, 'rgba(255,220,120,0.95)'); g.addColorStop(1, 'rgba(255,80,20,0)');
        ctx.fillStyle = g; ctx.fillRect(px - 22, gy - 196, 60, 60);
      }
      ctx.fillStyle = '#e8c35a'; ctx.font = 'bold 13px serif'; ctx.textAlign = 'center'; ctx.fillText('麒麟臺', cx, gy - 150);
    }
  } else if (map.theme === 'temple') {
    // stone lanterns and incense burner
    for (let x = 90; x < map.width; x += 170 + rnd() * 140) {
      ctx.fillStyle = '#4a3c40'; ctx.fillRect(x, gy - 30, 6, 30); ctx.fillRect(x - 6, gy - 34, 18, 5); ctx.fillRect(x - 4, gy - 4, 14, 4);
      ctx.fillStyle = '#5a4a50'; ctx.fillRect(x - 3, gy - 46, 12, 12);
      ctx.beginPath(); ctx.moveTo(x - 8, gy - 46); ctx.lineTo(x + 3, gy - 54); ctx.lineTo(x + 14, gy - 46); ctx.fill();
      const g = ctx.createRadialGradient(x + 3, gy - 40, 1, x + 3, gy - 40, 18); g.addColorStop(0, 'rgba(255,90,100,0.7)'); g.addColorStop(1, 'rgba(255,40,60,0)');
      ctx.fillStyle = g; ctx.fillRect(x - 15, gy - 58, 36, 36);
      ctx.fillStyle = '#ffb0a0'; ctx.fillRect(x, gy - 43, 6, 6);
    }
    for (let x = 300; x < map.width; x += 520 + rnd() * 200) { // three-legged incense burner
      ctx.fillStyle = '#6a5030'; ctx.beginPath(); ctx.ellipse(x, gy - 14, 16, 10, 0, 0, Math.PI); ctx.fill();
      ctx.fillRect(x - 18, gy - 16, 36, 4); ctx.fillRect(x - 12, gy - 6, 3, 6); ctx.fillRect(x + 9, gy - 6, 3, 6);
      ctx.strokeStyle = 'rgba(220,200,210,0.35)'; ctx.lineWidth = 2;
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x + k * 5, gy - 18); ctx.bezierCurveTo(x + k * 5 - 8, gy - 40, x + k * 5 + 10, gy - 60, x + k * 4, gy - 84); ctx.stroke(); }
      ctx.fillStyle = '#ff7a5a'; for (let k = -1; k <= 1; k++) ctx.fillRect(x + k * 5 - 0.5, gy - 24, 1.4, 8);
    }
    if (map.decor === 'altar') { // altar in the main hall
      const cx = map.width / 2;
      ctx.fillStyle = '#2a1418'; ctx.fillRect(cx - 220, gy - 16, 440, 16);
      ctx.fillStyle = '#3a1c22'; ctx.fillRect(cx - 200, gy - 20, 400, 5);
      ctx.fillStyle = '#4a2028'; ctx.fillRect(cx - 70, gy - 52, 140, 34);
      ctx.fillStyle = '#6a2a34'; ctx.fillRect(cx - 80, gy - 56, 160, 6);
      for (let k = 0; k < 9; k++) { // nine Soul-Guiding Incense sticks
        const ix = cx - 64 + k * 16;
        ctx.fillStyle = '#c84a3a'; ctx.fillRect(ix, gy - 72, 1.6, 16);
        const g = ctx.createRadialGradient(ix + 1, gy - 73, 0.5, ix + 1, gy - 73, 6); g.addColorStop(0, 'rgba(255,200,140,0.95)'); g.addColorStop(1, 'rgba(255,80,40,0)');
        ctx.fillStyle = g; ctx.fillRect(ix - 5, gy - 79, 12, 12);
      }
      for (const px of [cx - 260, cx + 240]) { // red banners
        ctx.fillStyle = '#2a1418'; ctx.fillRect(px, gy - 170, 6, 170);
        ctx.fillStyle = '#a8142a'; ctx.beginPath(); ctx.moveTo(px + 6, gy - 166); ctx.lineTo(px + 26, gy - 166); ctx.lineTo(px + 26, gy - 70); ctx.lineTo(px + 16, gy - 80); ctx.lineTo(px + 6, gy - 70); ctx.fill();
        ctx.fillStyle = '#e8c35a'; ctx.fillRect(px + 13, gy - 156, 6, 60);
      }
      ctx.fillStyle = '#e8c35a'; ctx.font = 'bold 13px serif'; ctx.textAlign = 'center'; ctx.fillText('玄門', cx, gy - 30);
    }
  } else if (map.theme === 'forest') {
    for (let x = 60; x < map.width; x += 120 + rnd() * 120) {
      ctx.fillStyle = '#2a4a2a';
      ctx.beginPath(); ctx.ellipse(x, gy - 4, 16 + rnd() * 10, 8, 0, Math.PI, 0); ctx.fill();
    }
  }
}

export function buildMapGraphics(map) {
  const t = THEMES[map.theme];
  const rnd = seeded(map.width * 7 + map.theme.length * 131);
  const sky = drawSky(t, rnd);
  const far = drawFar(map, t, rnd);
  const mid = drawMid(map, t, rnd);
  const { c, ctx } = bgCanvas(map.width, VIEW_H);
  drawDecor(ctx, map, rnd);
  drawPlatform(ctx, { x: 0, y: GROUND_Y, w: map.width }, t, rnd, true);
  for (const p of map.platforms) drawPlatform(ctx, p, t, rnd, false);
  return { sky, far, mid, fg: c, theme: t };
}

export function drawPortal(ctx, x, y, time, color = '#8af0ff') {
  const pulse = Math.sin(time * 4) * 0.15 + 0.85;
  const g = ctx.createRadialGradient(x, y - 22, 2, x, y - 22, 30);
  g.addColorStop(0, `rgba(220,255,255,${0.8 * pulse})`); g.addColorStop(0.5, color + '88'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 30, y - 56, 60, 60);
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.ellipse(x, y - 22, 10 + i * 4, 22 + i * 3, 0, time * (2 + i) + i, time * (2 + i) + i + 4); ctx.stroke();
  }
}
