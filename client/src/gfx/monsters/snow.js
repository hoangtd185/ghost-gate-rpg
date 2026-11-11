// Monsters of the snow mountain and the ice cave: yeti, ice bat, ice golem
import { shade, rgba, paint, shadeIn, ellipse, rrect, poly, radial, linear, OUTLINE } from '../draw.js';
import { withHurt, cuteEye } from './common.js';

// ---------- Yeti ----------
export function yeti() {
  return withHurt(42, 46, 4, (ctx, f) => {
    const b = [0, -1, 0, -1][f], sw = [0, 1, 0, -1][f];
    const fur = '#f4f8ff', furD = '#b8c8e0', face = '#9ac8e8';
    ctx.fillStyle = rgba('#000000', 0.25); ctx.beginPath(); ctx.ellipse(21, 44.5, 12, 1.8, 0, 0, 7); ctx.fill();
    // legs
    paint(ctx, rrect(12 - sw, 36 + b, 7, 8 - b, 3), furD, OUTLINE, 0.9);
    paint(ctx, rrect(23 + sw, 36 + b, 7, 8 - b, 3), fur, OUTLINE, 0.9);
    // tay sau
    paint(ctx, rrect(6, 20 + b - sw, 7, 16, 3.5), furD, OUTLINE, 0.9);
    // shaggy body
    const body = new Path2D();
    body.moveTo(9, 22 + b);
    for (let i = 0; i <= 10; i++) { const a = Math.PI + (i / 10) * Math.PI; body.lineTo(21 + Math.cos(a) * 14 + (i % 2 ? 1.5 : 0) * Math.cos(a), 24 + b + Math.sin(a) * 15 + (i % 2 ? 1.5 : 0) * Math.sin(a)); }
    body.lineTo(34, 38 + b); body.quadraticCurveTo(21, 42 + b, 8, 38 + b); body.closePath();
    paint(ctx, body, radial(ctx, 18, 16 + b, 2, 20, [[0, '#ffffff'], [1, furD]]), OUTLINE, 1.1);
    shadeIn(ctx, body, ellipse(23, 31 + b, 8, 7), rgba('#c8dcf0', 0.6));
    // blue face
    const fc = ellipse(25, 18 + b, 7.5, 6.5);
    paint(ctx, fc, linear(ctx, 0, 12, 0, 24, [[0, shade(face, 0.2)], [1, face]]), OUTLINE, 0.9);
    cuteEye(ctx, 22.5, 17 + b, 1.5, 1.8, '#0a1a3a');
    cuteEye(ctx, 28, 17 + b, 1.5, 1.8, '#0a1a3a');
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(20.5, 13.6 + b); ctx.lineTo(24, 14.8 + b); ctx.moveTo(30, 13.6 + b); ctx.lineTo(26.5, 14.8 + b); ctx.stroke();
    const m = new Path2D(); m.moveTo(22, 21 + b); m.quadraticCurveTo(25.5, 24 + b, 29, 21 + b); m.closePath(); paint(ctx, m, '#2a3a6a', OUTLINE, 0.6);
    paint(ctx, poly([[23, 21.2 + b], [23.8, 22.8 + b], [24.6, 21.4 + b]]), '#ffffff', null);
    // small horns
    for (const x of [18, 30]) paint(ctx, poly([[x - 1.6, 9 + b], [x + (x < 24 ? -1 : 1), 3 + b], [x + 1.6, 9 + b]]), '#c8d8ec', OUTLINE, 0.8);
    // front arms
    paint(ctx, rrect(29, 21 + b + sw, 7, 15, 3.5), fur, OUTLINE, 0.9);
    paint(ctx, ellipse(32.5, 36 + b + sw, 4, 3), '#dce8f8', OUTLINE, 0.8);
  }, { idle: [0, 1], walk: [0, 1, 2, 3] });
}

// ---------- Ice bat ----------
export function icebat() {
  return withHurt(38, 30, 4, (ctx, f) => {
    const flap = [0, -1, 0, 1][f];
    ctx.fillStyle = radial(ctx, 19, 15, 1, 16, [[0, 'rgba(160,220,255,0.45)'], [1, 'rgba(120,180,255,0)']]); ctx.fillRect(0, 0, 38, 30);
    for (const d of [-1, 1]) {
      const w = new Path2D();
      const tipY = 8 + flap * 6;
      w.moveTo(19 + d * 4, 14);
      w.quadraticCurveTo(19 + d * 10, tipY - 3, 19 + d * 17, tipY);
      w.quadraticCurveTo(19 + d * 14, tipY + 4, 19 + d * 13, tipY + 7);
      w.quadraticCurveTo(19 + d * 10, tipY + 5, 19 + d * 9, tipY + 9);
      w.quadraticCurveTo(19 + d * 7, 16, 19 + d * 4, 18);
      w.closePath();
      paint(ctx, w, linear(ctx, 19, 0, 19 + d * 17, 0, [[0, '#5a7ac8'], [1, '#a8d4ff']]), OUTLINE, 0.9);
    }
    const body = ellipse(19, 15.5, 6, 6.2);
    paint(ctx, body, radial(ctx, 18, 13, 0.5, 7, [[0, '#e8f4ff'], [1, '#7aa8e8']]), OUTLINE, 1);
    for (const d of [-1, 1]) paint(ctx, poly([[19 + d * 2, 10.5], [19 + d * 4.6, 5], [19 + d * 5, 11]]), '#9ac0f0', OUTLINE, 0.8);
    cuteEye(ctx, 16.8, 14.5, 1.4, 1.7, '#0a1a3a');
    cuteEye(ctx, 21.2, 14.5, 1.4, 1.7, '#0a1a3a');
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(17.6, 18); ctx.lineTo(18.2, 19.8); ctx.lineTo(18.8, 18); ctx.moveTo(19.2, 18); ctx.lineTo(19.8, 19.8); ctx.lineTo(20.4, 18); ctx.fill();
    ctx.fillStyle = 'rgba(255,150,190,0.5)'; ctx.beginPath(); ctx.ellipse(14.8, 17, 1.2, 0.7, 0, 0, 7); ctx.ellipse(23.2, 17, 1.2, 0.7, 0, 0, 7); ctx.fill();
  }, { idle: [0, 1, 2, 3], walk: [0, 1, 2, 3] });
}

// ---------- Ice golem ----------
export function golem() {
  return withHurt(42, 46, 4, (ctx, f) => {
    const b = [0, -1, 0, -1][f], sw = [0, 1.5, 0, -1.5][f];
    const ice = (x0, y0, x1, y1) => linear(ctx, x0, y0, x1, y1, [[0, '#e8f8ff'], [0.5, '#8acff5'], [1, '#3a7ab8']]);
    ctx.fillStyle = rgba('#000000', 0.25); ctx.beginPath(); ctx.ellipse(21, 44.5, 12, 1.8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = radial(ctx, 21, 26, 2, 22, [[0, 'rgba(140,220,255,0.35)'], [1, 'rgba(140,220,255,0)']]); ctx.fillRect(0, 0, 42, 46);
    // blocky legs
    paint(ctx, poly([[12 - sw, 35 + b], [19 - sw, 35 + b], [18 - sw, 44], [11 - sw, 44]]), ice(11, 35, 19, 44), OUTLINE, 0.9);
    paint(ctx, poly([[23 + sw, 35 + b], [30 + sw, 35 + b], [31 + sw, 44], [24 + sw, 44]]), ice(23, 35, 31, 44), OUTLINE, 0.9);
    // tay
    paint(ctx, poly([[5, 20 + b], [11, 18 + b], [12, 32 + b + sw], [4, 33 + b + sw]]), ice(4, 18, 12, 33), OUTLINE, 0.9);
    // crystal body
    const body = poly([[10, 16 + b], [17, 9 + b], [27, 10 + b], [33, 18 + b], [32, 33 + b], [21, 37 + b], [10, 33 + b]]);
    paint(ctx, body, ice(10, 9, 33, 37), OUTLINE, 1.1);
    ctx.save(); ctx.clip(body);
    ctx.strokeStyle = rgba('#ffffff', 0.55); ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(17, 9 + b); ctx.lineTo(20, 22 + b); ctx.lineTo(10, 33 + b); ctx.moveTo(20, 22 + b); ctx.lineTo(33, 18 + b); ctx.moveTo(20, 22 + b); ctx.lineTo(21, 37 + b); ctx.stroke();
    ctx.restore();
    // ice spikes on the back
    for (const [x, h] of [[13, 7], [18, 10], [24, 8]]) paint(ctx, poly([[x - 2.5, 13 + b], [x, 13 + b - h], [x + 2.5, 13 + b]]), ice(x, 13 - h, x, 13), OUTLINE, 0.8);
    // glowing eyes
    for (const x of [21, 27]) {
      ctx.fillStyle = radial(ctx, x, 20 + b, 0, 4, [[0, 'rgba(160,255,255,0.9)'], [1, 'rgba(80,200,255,0)']]); ctx.fillRect(x - 4, 16 + b, 8, 8);
      paint(ctx, poly([[x - 2, 19 + b], [x + 2, 19.5 + b], [x + 1.5, 21.5 + b], [x - 1.8, 21 + b]]), '#e8ffff', OUTLINE, 0.6);
    }
    // front arms
    paint(ctx, poly([[30, 19 + b], [37, 21 + b], [38, 33 + b - sw], [30, 32 + b - sw]]), ice(30, 19, 38, 33), OUTLINE, 0.9);
  }, { idle: [0], walk: [0, 1, 2, 3] });
}
