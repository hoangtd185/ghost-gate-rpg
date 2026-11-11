// Sky, far mountains and the mid layer (trees, bamboo, houses) of the backgrounds
import { shade } from '../draw.js';
import { bgCanvas, VIEW_W, VIEW_H } from './theme.js';

export function drawSky(t, rnd) {
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

export function mountainLayer(width, color, rnd, baseY, amp, jag) {
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

export function drawFar(map, t, rnd) {
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

export function bambooCluster(ctx, x, base, rnd, col) {
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

export function tree(ctx, x, base, rnd, col, dead) {
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

export function house(ctx, x, base, col) {
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

export function drawMid(map, t, rnd) {
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
