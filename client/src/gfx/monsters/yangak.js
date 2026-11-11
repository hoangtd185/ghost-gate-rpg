// Objects of the server event Xâm Lăng Dương Ác (shared/data/dungeons.js): iron door, the Armored Gate, demon egg and
// pillar. They never move; the frames only breathe. (The dust and core use the wisp sprite, see WISP_PAL in wild.js.)
import { rgba, paint, ellipse, rrect, poly, radial, linear, OUTLINE } from '../draw.js';
import { withHurt, cuteEye } from './common.js';

// Iron door of the haunted castle: riveted plates, a demon knocker, cracks as it is battered
export function ygDoor() {
  return withHurt(64, 96, 2, (ctx, f) => {
    ctx.fillStyle = rgba('#000000', 0.3); ctx.beginPath(); ctx.ellipse(32, 94, 28, 2.5, 0, 0, 7); ctx.fill();
    const body = rrect(6, 6, 52, 88, 4);
    paint(ctx, body, linear(ctx, 6, 0, 58, 0, [[0, '#2a2630'], [0.5, '#5a5462'], [1, '#2a2630']]), OUTLINE, 1.4);
    ctx.save(); ctx.clip(body);
    ctx.strokeStyle = rgba('#000000', 0.45); ctx.lineWidth = 1.2;
    for (const y of [28, 52, 76]) { ctx.beginPath(); ctx.moveTo(6, y); ctx.lineTo(58, y); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(32, 6); ctx.lineTo(32, 94); ctx.stroke();
    ctx.fillStyle = '#a8a0b0';
    for (const y of [16, 40, 64, 86]) for (const x of [12, 26, 38, 52]) { ctx.beginPath(); ctx.arc(x, y, 1.4, 0, 7); ctx.fill(); }
    ctx.restore();
    // demon knocker with a ring, eyes glow on the second frame
    paint(ctx, ellipse(32, 46, 9, 8), linear(ctx, 0, 38, 0, 54, [[0, '#d8b860'], [1, '#7a5a20']]), OUTLINE, 1);
    cuteEye(ctx, 28.5, 44, 1.4, 1.6, '#3a0a0a', f ? '#ff3a3a' : null); cuteEye(ctx, 35.5, 44, 1.4, 1.6, '#3a0a0a', f ? '#ff3a3a' : null);
    ctx.strokeStyle = '#c8a050'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(32, 56, 4.5, 0, 7); ctx.stroke();
  }, { idle: [0, 0, 1], walk: [0] });
}

// The Armored Gate (Phase 1 boss): a fortress gate with three demon faces; the eyes glow where lasers come from
export function ygGate() {
  return withHurt(124, 156, 2, (ctx, f) => {
    ctx.fillStyle = radial(ctx, 62, 90, 10, 70, [[0, 'rgba(255,60,40,0.3)'], [1, 'rgba(120,0,0,0)']]); ctx.fillRect(0, 0, 124, 156);
    ctx.fillStyle = rgba('#000000', 0.35); ctx.beginPath(); ctx.ellipse(62, 153, 56, 3, 0, 0, 7); ctx.fill();
    // towers on both sides
    for (const x of [4, 98]) {
      paint(ctx, rrect(x, 30, 22, 122, 3), linear(ctx, x, 0, x + 22, 0, [[0, '#1e1a22'], [1, '#4a4452']]), OUTLINE, 1.2);
      paint(ctx, poly([[x - 3, 32], [x + 11, 14], [x + 25, 32]]), '#3a1418', OUTLINE, 1);
    }
    // armored body
    const body = rrect(22, 22, 80, 130, 6);
    paint(ctx, body, linear(ctx, 22, 0, 102, 0, [[0, '#2a2430'], [0.5, '#6a6274'], [1, '#2a2430']]), OUTLINE, 1.6);
    ctx.save(); ctx.clip(body);
    ctx.strokeStyle = rgba('#000000', 0.5); ctx.lineWidth = 1.4;
    for (let y = 42; y < 152; y += 22) { ctx.beginPath(); ctx.moveTo(22, y); ctx.lineTo(102, y); ctx.stroke(); }
    ctx.fillStyle = '#b0a8b8';
    for (let y = 30; y < 152; y += 22) for (let x = 28; x < 100; x += 12) { ctx.beginPath(); ctx.arc(x, y, 1.3, 0, 7); ctx.fill(); }
    ctx.restore();
    // three demon faces stacked on the gate
    const glow = f ? '#ff5a3a' : '#ff2a2a';
    for (const [y, s] of [[48, 1], [88, 1.2], [128, 0.9]]) {
      paint(ctx, ellipse(62, y, 16 * s, 12 * s), linear(ctx, 0, y - 12, 0, y + 12, [[0, '#d8b860'], [1, '#6a4a18']]), OUTLINE, 1.1);
      for (const d of [-1, 1]) paint(ctx, poly([[62 + d * 10 * s, y - 8 * s], [62 + d * 18 * s, y - 20 * s], [62 + d * 15 * s, y - 6 * s]]), '#e8dcc0', OUTLINE, 0.8);
      cuteEye(ctx, 56 * 1 + (1 - s) * 2, y - 2, 2.2 * s, 2 * s, '#2a0606', glow);
      cuteEye(ctx, 68 - (1 - s) * 2, y - 2, 2.2 * s, 2 * s, '#2a0606', glow);
      ctx.fillStyle = '#1a0606'; ctx.beginPath(); ctx.ellipse(62, y + 5 * s, 7 * s, 3 * s, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#f4ecdc'; for (const tx of [-4, 0, 4]) { ctx.beginPath(); ctx.moveTo(62 + tx * s - 1.4, y + 3 * s); ctx.lineTo(62 + tx * s, y + 6 * s); ctx.lineTo(62 + tx * s + 1.4, y + 3 * s); ctx.fill(); }
    }
  }, { idle: [0, 0, 1], walk: [0] });
}

// Demon egg: a pulsing, veined shell
export function ygEgg() {
  return withHurt(30, 32, 2, (ctx, f) => {
    ctx.fillStyle = rgba('#000000', 0.25); ctx.beginPath(); ctx.ellipse(15, 30.5, 10, 1.6, 0, 0, 7); ctx.fill();
    const s = f ? 1.05 : 1;
    const egg = ellipse(15, 18, 10 * s, 12.5 * s);
    paint(ctx, egg, radial(ctx, 12, 13, 1, 14, [[0, '#f4e8d8'], [0.6, '#b8a080'], [1, '#6a5038']]), OUTLINE, 1);
    ctx.save(); ctx.clip(egg);
    ctx.strokeStyle = rgba('#8a1a2a', 0.7); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(8, 10); ctx.quadraticCurveTo(13, 16, 10, 26); ctx.moveTo(20, 8); ctx.quadraticCurveTo(17, 18, 22, 27); ctx.stroke();
    ctx.fillStyle = radial(ctx, 15, 19, 0.5, 6, [[0, f ? 'rgba(255,90,90,0.7)' : 'rgba(255,90,90,0.4)'], [1, 'rgba(255,0,0,0)']]); ctx.fillRect(5, 9, 20, 20);
    ctx.restore();
  }, { idle: [0, 1], walk: [0] });
}

// Demon pillar: carved stone with runes and a glowing eye that calls black dust
export function ygPillar() {
  return withHurt(48, 126, 2, (ctx, f) => {
    ctx.fillStyle = rgba('#000000', 0.3); ctx.beginPath(); ctx.ellipse(24, 123, 22, 2.5, 0, 0, 7); ctx.fill();
    paint(ctx, rrect(2, 112, 44, 12, 2), '#3a3440', OUTLINE, 1);
    paint(ctx, rrect(2, 4, 44, 10, 2), '#3a3440', OUTLINE, 1);
    const col = rrect(6, 12, 36, 102, 2);
    paint(ctx, col, linear(ctx, 6, 0, 42, 0, [[0, '#2a2632'], [0.45, '#6a6474'], [1, '#2a2632']]), OUTLINE, 1.2);
    ctx.save(); ctx.clip(col);
    ctx.fillStyle = f ? 'rgba(200,90,255,0.95)' : 'rgba(170,70,230,0.75)';
    for (const y of [30, 52, 92]) { ctx.fillRect(15, y, 18, 2); ctx.fillRect(23, y - 5, 2, 12); }
    ctx.restore();
    paint(ctx, ellipse(24, 72, 8, 6), '#120a16', OUTLINE, 1);
    cuteEye(ctx, 24, 72, 3, 3.4, '#3a0a4a', f ? '#e07aff' : '#b04aff');
  }, { idle: [0, 0, 1], walk: [0] });
}
