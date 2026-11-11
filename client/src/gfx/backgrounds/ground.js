// Ground, platforms and decorations of each map
import { shade } from '../draw.js';
import { GROUND_Y } from '../../../../shared/data/maps.js';
import { VIEW_H } from './theme.js';
import { house } from './scenery.js';

export function drawPlatform(ctx, p, t, rnd, isGround) {
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

export function drawDecor(ctx, map, rnd) {
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
