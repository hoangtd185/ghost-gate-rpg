// Monsters of the hidden temple: white-masked ghost and Blood Demon Huyền Cơ
import { shade, rgba, paint, shadeIn, ellipse, rrect, poly, radial, linear, OUTLINE } from '../draw.js';
import { withHurt } from './common.js';
import { boss } from './graveyard.js';

// ---------- White-masked ghost: tattered white cloak, porcelain mask ----------
export function maskghost() {
  return withHurt(36, 42, 4, (ctx, f) => {
    const sw = [0, 1.2, 0, -1.2][f], b = [0, -0.6, -1, -0.6][f];
    ctx.fillStyle = radial(ctx, 18, 22, 2, 20, [[0, 'rgba(255,120,140,0.28)'], [1, 'rgba(120,0,40,0)']]);
    ctx.fillRect(0, 0, 36, 42);
    // hooded cloak, torn hem flapping in the wind
    const cloak = new Path2D();
    cloak.moveTo(18, 5 + b);
    cloak.bezierCurveTo(28, 5 + b, 30, 14 + b, 29, 24 + b);
    cloak.bezierCurveTo(29, 31, 28 + sw, 36, 30 + sw * 1.5, 40);
    cloak.lineTo(25 + sw, 35.5); cloak.lineTo(22 + sw * 0.6, 40); cloak.lineTo(19, 35); cloak.lineTo(15 - sw * 0.4, 40);
    cloak.lineTo(12 - sw * 0.6, 35.5); cloak.lineTo(7 - sw, 39.5);
    cloak.bezierCurveTo(8 - sw, 34, 7, 30, 7, 24 + b);
    cloak.bezierCurveTo(6, 14 + b, 8, 5 + b, 18, 5 + b);
    cloak.closePath();
    paint(ctx, cloak, linear(ctx, 0, 5, 0, 40, [[0, '#f4f0ea'], [0.6, '#cfc6bc'], [1, 'rgba(160,150,150,0.6)']]), OUTLINE, 1);
    shadeIn(ctx, cloak, ellipse(10, 28, 7, 14), rgba('#5a4a5a', 0.22));
    // darkness inside the hood
    paint(ctx, ellipse(18, 17 + b, 8, 8.6), '#1a0e16', null);
    // mask
    const mask = new Path2D();
    mask.moveTo(12, 12 + b); mask.quadraticCurveTo(18, 9 + b, 24, 12 + b); mask.quadraticCurveTo(25, 21 + b, 18, 26 + b); mask.quadraticCurveTo(11, 21 + b, 12, 12 + b); mask.closePath();
    paint(ctx, mask, linear(ctx, 0, 9, 0, 26, [[0, '#ffffff'], [1, '#e2dcd2']]), OUTLINE, 0.9);
    for (const [x, d] of [[15, 1], [21, -1]]) {
      paint(ctx, poly([[x - 2 * d, 16 + b], [x + 1.8 * d, 15.2 + b], [x + 1.2 * d, 17.6 + b]]), '#140a10', null);
      ctx.fillStyle = radial(ctx, x, 16.6 + b, 0, 3, [[0, 'rgba(255,60,80,0.9)'], [1, 'rgba(255,0,40,0)']]); ctx.fillRect(x - 3, 13.6 + b, 6, 6);
    }
    ctx.strokeStyle = '#c42030'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(18, 10.5 + b); ctx.lineTo(18, 13.5 + b); ctx.moveTo(16, 22 + b); ctx.quadraticCurveTo(18, 23.4 + b, 20, 22 + b); ctx.stroke();
    ctx.strokeStyle = rgba('#3a2a20', 0.8); ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(22.6, 11.6 + b); ctx.lineTo(21.2, 15 + b); ctx.lineTo(22.4, 18 + b); ctx.stroke();
    // floating sleeves + soul-fire wisps
    for (const [x, d] of [[6, -1], [30, 1]]) {
      paint(ctx, ellipse(x, 26 + b + sw * d * 0.4, 3, 4.5), '#ddd4ca', OUTLINE, 0.8);
      ctx.fillStyle = radial(ctx, x + d * 2, 21 + b, 0, 4, [[0, '#ffd0f0'], [0.4, 'rgba(220,110,255,0.8)'], [1, 'rgba(140,40,255,0)']]);
      ctx.fillRect(x + d * 2 - 4, 17 + b, 8, 8);
    }
  }, { idle: [0, 1, 2, 3], walk: [0, 1, 2, 1] });
}

// ---------- Blood Demon Huyền Cơ (Chapter 3 boss) ----------
export function bloodDemon() {
  return withHurt(100, 108, 3, (ctx, f) => {
    const b = f === 1 ? 1.2 : 0, atk = f === 2;
    const robe = '#3a0a16', robeL = '#6a1426', gold = '#e2b85c', skin = '#e8d8cc';
    // blood aura
    ctx.fillStyle = radial(ctx, 50, 58, 8, 54, [[0, 'rgba(255,40,70,0.42)'], [0.6, 'rgba(160,0,40,0.18)'], [1, 'rgba(60,0,20,0)']]);
    ctx.fillRect(0, 0, 100, 108);
    ctx.fillStyle = rgba('#000000', 0.3); ctx.beginPath(); ctx.ellipse(50, 105, 26, 3, 0, 0, 7); ctx.fill();
    // long silver hair flowing behind
    const hair = new Path2D();
    hair.moveTo(36, 18 + b); hair.bezierCurveTo(20, 30, 16, 52, 8 - b * 2, 70);
    hair.bezierCurveTo(20, 60, 26, 50, 30, 40); hair.bezierCurveTo(28, 56, 22, 70, 18, 82);
    hair.bezierCurveTo(32, 66, 38, 50, 40, 36); hair.closePath();
    paint(ctx, hair, linear(ctx, 8, 20, 40, 80, [[0, '#ffffff'], [1, '#b8b0c0']]), OUTLINE, 1);
    const hair2 = new Path2D();
    hair2.moveTo(64, 18 + b); hair2.bezierCurveTo(78, 30, 84, 48, 92 + b * 2, 62); hair2.bezierCurveTo(80, 56, 74, 46, 68, 38); hair2.closePath();
    paint(ctx, hair2, linear(ctx, 64, 20, 92, 62, [[0, '#ffffff'], [1, '#b8b0c0']]), OUTLINE, 1);
    // Taoist robe flaring as if flying
    const body = new Path2D();
    body.moveTo(34, 40 + b); body.lineTo(66, 40 + b);
    body.bezierCurveTo(74, 60, 82, 84, 88, 102); body.lineTo(70, 98); body.lineTo(60, 103); body.lineTo(50, 97); body.lineTo(40, 103); body.lineTo(30, 98); body.lineTo(12, 102);
    body.bezierCurveTo(18, 84, 26, 60, 34, 40 + b); body.closePath();
    paint(ctx, body, linear(ctx, 12, 0, 88, 0, [[0, shade(robe, -0.3)], [0.5, robeL], [1, robe]]), OUTLINE, 1.3);
    // robe trim + bagua
    ctx.strokeStyle = gold; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(42, 41 + b); ctx.lineTo(50, 60 + b); ctx.lineTo(58, 41 + b); ctx.stroke();
    paint(ctx, rrect(36, 58 + b, 28, 5, 2), gold, OUTLINE, 0.9);
    paint(ctx, ellipse(50, 76 + b * 0.5, 9, 9), '#1a0408', gold, 1.4);
    ctx.fillStyle = '#f4ecdc'; ctx.beginPath(); ctx.arc(50, 76 + b * 0.5, 6, -Math.PI / 2, Math.PI / 2); ctx.arc(50, 79 + b * 0.5, 3, Math.PI / 2, -Math.PI / 2, true); ctx.arc(50, 73 + b * 0.5, 3, Math.PI / 2, -Math.PI / 2); ctx.fill();
    paint(ctx, ellipse(50, 73 + b * 0.5, 1, 1), '#1a0408', null);
    paint(ctx, ellipse(50, 79 + b * 0.5, 1, 1), '#f4ecdc', null);
    // left hand holds a horsetail whisk
    paint(ctx, rrect(22, 44 + b, 10, 24, 4), shade(robe, -0.15), OUTLINE, 1);
    paint(ctx, ellipse(27, 70 + b, 4.6, 4.2), skin, OUTLINE, 0.9);
    ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(27, 70 + b); ctx.lineTo(19, 50 + b); ctx.stroke();
    ctx.strokeStyle = '#f4f0ea'; ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(27, 71 + b); ctx.quadraticCurveTo(26 + i, 82, 24 + i * 2 - b, 94); ctx.stroke(); }
    // right hand: raised while attacking to throw blood talismans
    if (atk) {
      paint(ctx, rrect(64, 44, 28, 10, 4.5), robeL, OUTLINE, 1);
      paint(ctx, ellipse(93, 49, 5, 5), skin, OUTLINE, 1);
      ctx.fillStyle = radial(ctx, 94, 49, 1, 14, [[0, 'rgba(255,220,220,0.95)'], [0.4, 'rgba(255,40,70,0.8)'], [1, 'rgba(160,0,30,0)']]);
      ctx.fillRect(80, 35, 28, 28);
    } else {
      paint(ctx, rrect(68, 44 + b, 10, 24, 4), robeL, OUTLINE, 1);
      paint(ctx, ellipse(73, 70 + b, 4.6, 4.2), skin, OUTLINE, 0.9);
    }
    // head: Taoist hat + cracked white mask
    const face = new Path2D();
    face.moveTo(36, 20 + b); face.bezierCurveTo(36, 8 + b, 64, 8 + b, 64, 20 + b);
    face.bezierCurveTo(64, 32 + b, 57, 40 + b, 50, 40 + b); face.bezierCurveTo(43, 40 + b, 36, 32 + b, 36, 20 + b); face.closePath();
    paint(ctx, face, linear(ctx, 0, 8, 0, 40, [[0, '#ffffff'], [1, '#ddd6cc']]), OUTLINE, 1.2);
    for (const [x, d] of [[44, 1], [56, -1]]) {
      paint(ctx, poly([[x - 4 * d, 21 + b], [x + 4 * d, 20 + b], [x + 3 * d, 24 + b], [x - 3 * d, 24 + b]]), '#140408', null);
      ctx.fillStyle = radial(ctx, x, 22.5 + b, 0, 6, [[0, 'rgba(255,60,80,0.95)'], [1, 'rgba(255,0,40,0)']]); ctx.fillRect(x - 6, 16.5 + b, 12, 12);
      paint(ctx, ellipse(x, 22.5 + b, 1, 1.2), '#ffe0e0', null);
    }
    ctx.strokeStyle = '#c42030'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(50, 12 + b); ctx.lineTo(50, 17 + b); ctx.moveTo(45, 32 + b); ctx.quadraticCurveTo(50, 34.5 + b, 55, 32 + b); ctx.stroke();
    ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(40, 26 + b); ctx.lineTo(42.5, 29 + b); ctx.moveTo(60, 26 + b); ctx.lineTo(57.5, 29 + b); ctx.stroke();
    // crack
    ctx.strokeStyle = '#2a1008'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(58, 11 + b); ctx.lineTo(54.5, 19 + b); ctx.lineTo(57.5, 25 + b); ctx.lineTo(53.5, 33 + b); ctx.stroke();
    ctx.fillStyle = 'rgba(255,40,70,0.75)'; ctx.beginPath(); ctx.moveTo(54.5, 19 + b); ctx.lineTo(56, 20 + b); ctx.lineTo(57.5, 25 + b); ctx.lineTo(56, 24.5 + b); ctx.fill();
    // hat
    paint(ctx, rrect(41, 2 + b, 18, 9, 3), linear(ctx, 0, 2, 0, 11, [[0, '#3a3a4a'], [1, '#14141e']]), OUTLINE, 1);
    paint(ctx, rrect(38, 9 + b, 24, 3.4, 1.4), gold, OUTLINE, 0.9);
    paint(ctx, ellipse(50, 6 + b, 2.2, 2.2), '#ff2a3a', OUTLINE, 0.7);
    // blood talismans circling around
    for (let i = 0; i < 4; i++) {
      const ang = i * Math.PI / 2 + f * 0.5, rx = 44, ry = 16;
      const x = 50 + Math.cos(ang) * rx, y = 54 + Math.sin(ang) * ry;
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.cos(ang) * 0.4);
      paint(ctx, rrect(-2.6, -4.5, 5.2, 9, 0.6), linear(ctx, 0, -4, 0, 5, [[0, '#ff6a7a'], [1, '#a8142a']]), '#3a0408', 0.6);
      ctx.strokeStyle = '#fff0c0'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, 3); ctx.moveTo(-1.5, -1); ctx.lineTo(1.5, -1); ctx.stroke();
      ctx.restore();
    }
  }, { idle: [0, 1], walk: [0, 1], atk: [2] });
}
