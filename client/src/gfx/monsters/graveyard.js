// Monsters of the old graveyard and the Ghost Gate: jiangshi, lantern ghost, Black Ghost King
import { shade, rgba, paint, ellipse, rrect, poly, radial, linear, OUTLINE } from '../draw.js';
import { withHurt, cuteEye } from './common.js';

// ---------- Jiangshi: hops with arms stretched out ----------
export const JIANG_PAL = {
  jiangshi: { robe: '#24525a', robeL: '#3a7a80', skin: '#c6e0c8', glow: '#ff4a4a', tal: '#ffe066', ink: '#c42020' },
  // Blood jiangshi: dark red robe, red talisman with gold script, glowing red eyes
  blood_jiangshi: { robe: '#5a1420', robeL: '#8a2a34', skin: '#d8c4c4', glow: '#ff2a4a', tal: '#d8243a', ink: '#ffe066' },
};

export function jiangshi(pal = JIANG_PAL.jiangshi) {
  return withHurt(38, 46, 3, (ctx, f) => {
    const c = f === 1 ? 2.2 : 0, a = f === 2 ? -1.2 : 0;
    const { robe, robeL, skin } = pal;
    ctx.fillStyle = rgba('#000000', 0.25); ctx.beginPath(); ctx.ellipse(18, 44.5, 8, 1.5, 0, 0, 7); ctx.fill();
    paint(ctx, rrect(12.5, 37 + c, 4.5, 6.5 - c, 1.4), '#141018', OUTLINE, 0.8);
    paint(ctx, rrect(19, 37 + c, 4.5, 6.5 - c, 1.4), '#1e1822', OUTLINE, 0.8);
    const body = new Path2D();
    body.moveTo(12, 20 + c); body.lineTo(25, 20 + c); body.quadraticCurveTo(27, 30 + c, 27.5, 38.5 + c); body.lineTo(9.5, 38.5 + c); body.quadraticCurveTo(10, 30 + c, 12, 20 + c); body.closePath();
    paint(ctx, body, linear(ctx, 9, 0, 28, 0, [[0, shade(robe, -0.2)], [0.5, robe], [1, robeL]]), OUTLINE, 1);
    paint(ctx, rrect(14, 26 + c, 9, 7.5, 1), '#d4a64a', OUTLINE, 0.7);
    paint(ctx, ellipse(18.5, 29.7 + c, 2.4, 2.4), '#a8302a', null);
    ctx.strokeStyle = '#d4a64a'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(9.8, 37.5 + c); ctx.lineTo(27.2, 37.5 + c); ctx.stroke();
    // outstretched arms
    for (const [dy, col] of [[0, shade(robe, -0.25)], [3, robe]]) {
      paint(ctx, rrect(18, 21.5 + c + dy + a, 14, 4, 1.6), col, OUTLINE, 0.8);
      paint(ctx, ellipse(33, 23.5 + c + dy + a, 2.4, 1.9), skin, OUTLINE, 0.7);
      ctx.strokeStyle = '#2a4a3a'; ctx.lineWidth = 0.6;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(35, 22.5 + c + dy + a + i * 0.9); ctx.lineTo(36.6, 22.4 + c + dy + a + i * 1.1); ctx.stroke(); }
    }
    // head
    const face = rrect(11.5, 8 + c, 13, 12.5, 4.5);
    paint(ctx, face, linear(ctx, 0, 8, 0, 21, [[0, shade(skin, 0.1)], [1, shade(skin, -0.12)]]), OUTLINE, 1);
    cuteEye(ctx, 17.5, 14.5 + c, 1.4, 1.5, '#4a0a0a', pal.glow);
    cuteEye(ctx, 22, 14.5 + c, 1.4, 1.5, '#4a0a0a', pal.glow);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(19, 18 + c); ctx.lineTo(19.8, 19.6 + c); ctx.lineTo(20.6, 18 + c); ctx.fill();
    ctx.strokeStyle = '#3a0a0a'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(17.5, 18 + c); ctx.lineTo(22.5, 18 + c); ctx.stroke();
    // official's hat
    paint(ctx, ellipse(18, 8.6 + c, 9.2, 2.4), '#1a1a26', OUTLINE, 0.9);
    paint(ctx, rrect(12, 2 + c, 12, 7, 3.6), linear(ctx, 0, 2, 0, 9, [[0, '#3a3a4a'], [1, '#1a1a26']]), OUTLINE, 0.9);
    paint(ctx, ellipse(18, 1.5 + c, 1.8, 1.8), '#d23a32', OUTLINE, 0.7);
    // talisman
    const tal = new Path2D();
    tal.moveTo(19, 6.5 + c); tal.lineTo(23.5, 6.5 + c); tal.lineTo(24 + a * 0.5, 19 + c); tal.lineTo(19.6 + a * 0.5, 19.4 + c); tal.closePath();
    paint(ctx, tal, pal.tal, OUTLINE, 0.6);
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(20.4, 8.5 + c); ctx.lineTo(22.6, 8.5 + c); ctx.moveTo(21.5, 8 + c); ctx.lineTo(21.7, 17 + c);
    ctx.moveTo(20.2, 11.5 + c); ctx.lineTo(23, 11 + c); ctx.moveTo(20.5, 14 + c); ctx.quadraticCurveTo(22, 15.5 + c, 23.2, 13.8 + c); ctx.stroke();
  }, { idle: [0], walk: [1, 2] });
}

// ---------- Lantern ghost ----------
export function lantern() {
  return withHurt(34, 42, 4, (ctx, f) => {
    const sw = [0, 1, 0, -1][f];
    ctx.fillStyle = radial(ctx, 17, 19, 2, 18, [[0, 'rgba(255,150,70,0.5)'], [1, 'rgba(255,90,40,0)']]);
    ctx.fillRect(0, 0, 34, 42);
    ctx.strokeStyle = '#3a2418'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(17, 6); ctx.stroke();
    paint(ctx, rrect(11.5, 5, 11, 3, 1), '#d4a64a', OUTLINE, 0.8);
    const body = ellipse(17, 18, 11, 10.5);
    paint(ctx, body, radial(ctx, 15, 15, 1, 13, [[0, '#ff8a6a'], [0.6, '#e03a32'], [1, '#9a1a1e']]), OUTLINE, 1);
    ctx.save(); ctx.clip(body);
    ctx.strokeStyle = rgba('#6a0a10', 0.55); ctx.lineWidth = 0.7;
    for (const rx of [3.5, 7.5]) { ctx.beginPath(); ctx.ellipse(17, 18, rx, 10.5, 0, 0, 7); ctx.stroke(); }
    ctx.restore();
    paint(ctx, rrect(11.5, 27, 11, 3, 1), '#d4a64a', OUTLINE, 0.8);
    // face
    const blink = f === 3;
    if (blink) { ctx.strokeStyle = '#2a0a0a'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(11.5, 16); ctx.lineTo(14.5, 16); ctx.moveTo(19.5, 16); ctx.lineTo(22.5, 16); ctx.stroke(); }
    else { cuteEye(ctx, 13, 15.5, 1.9, 2.3, '#2a0a0a', '#ffe060'); cuteEye(ctx, 21, 15.5, 1.9, 2.3, '#2a0a0a', '#ffe060'); }
    ctx.strokeStyle = '#2a0a0a'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(10.5, 12); ctx.lineTo(14.5, 13.2); ctx.moveTo(23.5, 12); ctx.lineTo(19.5, 13.2); ctx.stroke();
    const m = new Path2D(); m.moveTo(13, 20.5); m.quadraticCurveTo(17, 25.5, 21, 20.5); m.closePath();
    paint(ctx, m, '#3a0a0a', OUTLINE, 0.7);
    paint(ctx, ellipse(17, 23, 2, 1.6), '#ff7a9a', null);
    // tua
    ctx.strokeStyle = '#e8c35a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(17, 30); ctx.quadraticCurveTo(17 + sw, 34, 17 + sw * 2, 38); ctx.stroke();
    paint(ctx, rrect(15 + sw * 2, 37, 4, 3.5, 1), '#e8c35a', OUTLINE, 0.6);
  }, { idle: [0, 1, 2, 1, 0, 3], walk: [0, 1, 2, 1] });
}

// ---------- Black Ghost King ----------
export function boss() {
  return withHurt(96, 100, 3, (ctx, f) => {
    const b = f === 1 ? 1 : 0, atk = f === 2;
    const robe = '#5a0e1e', robeL = '#8a1e30', gold = '#e2b85c', skin = '#4a3048';
    ctx.fillStyle = radial(ctx, 48, 56, 8, 50, [[0, 'rgba(200,30,70,0.38)'], [1, 'rgba(80,0,40,0)']]);
    ctx.fillRect(0, 0, 96, 100);
    ctx.fillStyle = rgba('#000000', 0.3); ctx.beginPath(); ctx.ellipse(48, 97, 26, 3, 0, 0, 7); ctx.fill();
    // back cape
    const cape = new Path2D();
    cape.moveTo(28, 38 + b); cape.quadraticCurveTo(12, 60, 10, 96); cape.lineTo(86, 96); cape.quadraticCurveTo(84, 60, 68, 38 + b); cape.closePath();
    paint(ctx, cape, linear(ctx, 0, 40, 0, 96, [[0, '#2a0610'], [1, '#14020a']]), OUTLINE, 1.2);
    // body
    const body = new Path2D();
    body.moveTo(30, 40 + b); body.lineTo(66, 40 + b); body.quadraticCurveTo(72, 70, 74, 95); body.lineTo(22, 95); body.quadraticCurveTo(24, 70, 30, 40 + b); body.closePath();
    paint(ctx, body, linear(ctx, 22, 0, 74, 0, [[0, shade(robe, -0.3)], [0.5, robe], [1, robeL]]), OUTLINE, 1.3);
    paint(ctx, rrect(43, 42 + b, 10, 53, 2), linear(ctx, 0, 40, 0, 95, [[0, gold], [1, shade(gold, -0.3)]]), OUTLINE, 1);
    for (const y of [50, 62, 74, 86]) paint(ctx, ellipse(48, y + b * 0.5, 2.6, 2.6), '#c42030', OUTLINE, 0.7);
    paint(ctx, rrect(28, 56 + b, 40, 5, 2), gold, OUTLINE, 1);
    paint(ctx, ellipse(48, 58.5 + b, 5, 4.2), '#2a0610', OUTLINE, 0.9);
    cuteEye(ctx, 48, 58.5 + b, 1.8, 2.4, '#ff3a3a', '#ff3a3a');
    // shoulder armor
    for (const [x, d] of [[26, -1], [70, 1]]) {
      const sp = new Path2D();
      sp.moveTo(x - 10 * d, 44 + b); sp.quadraticCurveTo(x - 9 * d, 33 + b, x + 6 * d, 34 + b); sp.quadraticCurveTo(x + 10 * d, 40 + b, x + 6 * d, 47 + b); sp.closePath();
      paint(ctx, sp, linear(ctx, 0, 33, 0, 47, [[0, '#8a8a9a'], [1, '#3a3a48']]), OUTLINE, 1.1);
      paint(ctx, poly([[x - 4 * d, 35 + b], [x - 6 * d, 26 + b], [x, 34 + b]]), '#e8e0d0', OUTLINE, 0.9);
    }
    // tay
    if (atk) {
      paint(ctx, rrect(62, 44, 26, 9, 4), robe, OUTLINE, 1);
      paint(ctx, ellipse(89, 48.5, 5, 5), skin, OUTLINE, 1);
      ctx.fillStyle = radial(ctx, 90, 48, 1, 12, [[0, 'rgba(230,140,255,0.9)'], [1, 'rgba(160,40,255,0)']]);
      ctx.fillRect(76, 34, 28, 28);
    } else {
      paint(ctx, rrect(68, 46 + b, 9, 24, 4), robe, OUTLINE, 1);
      paint(ctx, ellipse(72.5, 72 + b, 5, 4.6), skin, OUTLINE, 1);
    }
    paint(ctx, rrect(19, 46 + b, 9, 24, 4), shade(robe, -0.2), OUTLINE, 1);
    paint(ctx, ellipse(23.5, 72 + b, 5, 4.6), shade(skin, -0.15), OUTLINE, 1);
    // head
    for (const [x, d] of [[36, -1], [60, 1]]) {
      const h = new Path2D();
      h.moveTo(x, 18 + b); h.quadraticCurveTo(x + 9 * d, 10 + b, x + 13 * d, -2 + b); h.quadraticCurveTo(x + 4 * d, 7 + b, x - 3 * d, 13 + b); h.closePath();
      paint(ctx, h, linear(ctx, x, 18, x + 13 * d, -2, [[0, '#d8ccb8'], [1, '#fff8ec']]), OUTLINE, 1.1);
    }
    paint(ctx, ellipse(48, 14 + b, 18, 6), '#140810', OUTLINE, 1); // mane
    const face = new Path2D();
    face.moveTo(32, 18 + b); face.bezierCurveTo(32, 6 + b, 64, 6 + b, 64, 18 + b);
    face.bezierCurveTo(64, 30 + b, 56, 38 + b, 48, 38 + b); face.bezierCurveTo(40, 38 + b, 32, 30 + b, 32, 18 + b); face.closePath();
    paint(ctx, face, radial(ctx, 46, 20 + b, 2, 20, [[0, shade(skin, 0.2)], [1, skin]]), OUTLINE, 1.3);
    // glowing red eyes
    for (const [x, d] of [[41, 1], [55, -1]]) {
      ctx.fillStyle = radial(ctx, x, 22 + b, 0, 8, [[0, 'rgba(255,60,60,0.7)'], [1, 'rgba(255,0,0,0)']]);
      ctx.fillRect(x - 8, 14 + b, 16, 16);
      paint(ctx, poly([[x - 4.5 * d, 19.5 + b], [x + 4.5 * d, 22 + b], [x + 3 * d, 25 + b], [x - 4 * d, 24 + b]]), '#ff3030', OUTLINE, 0.9);
      paint(ctx, ellipse(x + 0.5 * d, 22.8 + b, 1.2, 1.5), '#ffe060', null);
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 6 * d, 16.5 + b); ctx.lineTo(x + 5 * d, 19.5 + b); ctx.stroke();
    }
    const mouth = new Path2D(); mouth.moveTo(41, 30 + b); mouth.quadraticCurveTo(48, 35 + b, 55, 30 + b); mouth.quadraticCurveTo(48, 32 + b, 41, 30 + b); mouth.closePath();
    paint(ctx, mouth, '#1a0408', OUTLINE, 0.9);
    paint(ctx, poly([[42.5, 30.4 + b], [44, 34 + b], [45.3, 31 + b]]), '#ffffff', null);
    paint(ctx, poly([[50.7, 31 + b], [52, 34 + b], [53.5, 30.4 + b]]), '#ffffff', null);
    // crown
    const cr = poly([[37, 12 + b], [38, 4 + b], [42, 8 + b], [48, 1 + b], [54, 8 + b], [58, 4 + b], [59, 12 + b]]);
    paint(ctx, cr, linear(ctx, 0, 1, 0, 12, [[0, '#fff0b0'], [1, gold]]), OUTLINE, 1);
    paint(ctx, ellipse(48, 8.5 + b, 1.8, 1.8), '#ff2a3a', OUTLINE, 0.7);
  }, { idle: [0, 1], walk: [0, 1], atk: [2] });
}
