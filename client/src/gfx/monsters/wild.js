// Monsters of the forest, fields and swamp: wisp, fox spirit, scarecrow, poison frog
import { shade, rgba, paint, shadeIn, ellipse, rrect, poly, radial, linear, OUTLINE } from '../draw.js';
import { withHurt, cuteEye } from './common.js';

// ---------- Will-o'-wisp: green flame with a face ----------
export const WISP_PAL = {
  wisp: { glow: 'rgba(140,255,230,0.55)', glow0: 'rgba(60,220,190,0)', c0: '#e8fff9', c1: '#8ff4dc', c2: '#2fbfa8', line: '#13524c', shadow: '#0a6a60', eye: '#0e3a38' },
  // Water ghost: blue flame with weeds draped over the head
  water_ghost: { glow: 'rgba(120,180,255,0.5)', glow0: 'rgba(60,120,220,0)', c0: '#eaf4ff', c1: '#8ab8ff', c2: '#3a6ad8', line: '#14285a', shadow: '#1a3a8a', eye: '#0a1838',
    extra(ctx, f, sw) {
      ctx.strokeStyle = '#3a8a5a'; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(10, 11); ctx.quadraticCurveTo(7 + sw, 16, 8 + sw, 21); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(20, 11); ctx.quadraticCurveTo(23 + sw, 15, 22 + sw, 19); ctx.stroke();
      ctx.fillStyle = 'rgba(200,230,255,0.8)'; ctx.beginPath(); ctx.ellipse(15, 30.5 + (f % 2), 1, 1.4, 0, 0, 7); ctx.fill();
    } },
  // Fire spirit: orange-red flame with small flame horns
  fire_spirit: { glow: 'rgba(255,150,60,0.6)', glow0: 'rgba(255,60,20,0)', c0: '#fff6d0', c1: '#ffb04a', c2: '#e0401e', line: '#5a1408', shadow: '#8a1a0a', eye: '#3a0804',
    extra(ctx, f, sw) {
      ctx.fillStyle = '#fff0a0';
      for (const [x, y] of [[9, 8], [21, 8]]) { ctx.beginPath(); ctx.moveTo(x - 1.5, y + 3); ctx.lineTo(x + sw * 0.5, y - 2); ctx.lineTo(x + 1.5, y + 3); ctx.fill(); }
    } },
  // Black dust (event): a sooty cloud with red eyes
  dust: { glow: 'rgba(80,60,90,0.5)', glow0: 'rgba(30,20,40,0)', c0: '#8a7a8a', c1: '#3a2e3e', c2: '#120c16', line: '#06040a', shadow: '#000000', eye: '#ff3a3a' },
  // Blue Flame Core (event): a cold blue fire
  core: { glow: 'rgba(110,170,255,0.7)', glow0: 'rgba(40,90,255,0)', c0: '#ffffff', c1: '#7ab8ff', c2: '#2a50d8', line: '#0a1a5a', shadow: '#0a2a8a', eye: '#04103a' },
};

export function wisp(pal = WISP_PAL.wisp) {
  return withHurt(30, 32, 4, (ctx, f) => {
    const sw = [0, 1.4, 0, -1.4][f], st = [0, 0.6, 1, 0.6][f];
    ctx.fillStyle = radial(ctx, 15, 19, 2, 15, [[0, pal.glow], [1, pal.glow0]]);
    ctx.fillRect(0, 0, 30, 32);
    const p = new Path2D();
    p.moveTo(15 + sw * 1.6, 2 + st);
    p.bezierCurveTo(17 + sw, 7, 19.5, 6.5, 20 + sw * 0.5, 9.5);
    p.bezierCurveTo(24, 12, 24.5, 17, 24, 21);
    p.bezierCurveTo(23.5, 27, 18.5, 29.5, 15, 29.5);
    p.bezierCurveTo(11.5, 29.5, 6.5, 27, 6, 21);
    p.bezierCurveTo(5.5, 16, 8, 12, 10.5 + sw * 0.4, 9);
    p.bezierCurveTo(11, 11.5, 12.5, 10.5, 12.5 + sw * 0.6, 8);
    p.bezierCurveTo(12.5, 6, 14, 5, 15 + sw * 1.6, 2 + st);
    p.closePath();
    paint(ctx, p, radial(ctx, 15, 22, 1, 13, [[0, pal.c0], [0.45, pal.c1], [1, pal.c2]]), pal.line, 1);
    shadeIn(ctx, p, ellipse(9, 24, 6, 9), rgba(pal.shadow, 0.25));
    cuteEye(ctx, 12, 20.5, 1.7, 2.3, pal.eye);
    cuteEye(ctx, 18.5, 20.5, 1.7, 2.3, pal.eye);
    ctx.strokeStyle = pal.eye; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(14, 24.3); ctx.quadraticCurveTo(14.7, 25.3, 15.3, 24.3); ctx.quadraticCurveTo(15.9, 25.3, 16.6, 24.3); ctx.stroke();
    ctx.fillStyle = 'rgba(255,170,190,0.5)';
    ctx.beginPath(); ctx.ellipse(9.8, 23.8, 1.5, 0.9, 0, 0, 7); ctx.ellipse(20.8, 23.8, 1.5, 0.9, 0, 0, 7); ctx.fill();
    if (pal.extra) pal.extra(ctx, f, sw);
  }, { idle: [0, 1, 2, 3], walk: [0, 1, 2, 3] });
}

// ---------- Fox spirit: two-tailed fox ----------
export const FOX_PAL = {
  fox: { fur: '#f08a3a', furD: '#c45a1e', cream: '#fff1df', ear: '#ffc8b0', eye: '#3a1410' },
  // Snow fox: white-blue fur with a snowflake on the forehead
  snowfox: { fur: '#eef4fc', furD: '#9ab8d8', cream: '#ffffff', ear: '#c8e0ff', eye: '#1a3a6a',
    extra(ctx, f, bob) {
      ctx.strokeStyle = '#7ac8ff'; ctx.lineWidth = 0.7;
      const x = 34, y = 9.5 + bob;
      for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 1.8, y - Math.sin(a) * 1.8); ctx.lineTo(x + Math.cos(a) * 1.8, y + Math.sin(a) * 1.8); ctx.stroke(); }
    } },
};

export function fox(pal = FOX_PAL.fox) {
  return withHurt(44, 32, 4, (ctx, f) => {
    const step = [0, 1, 0, -1][f], bob = f % 2 ? -0.6 : 0;
    const { fur, furD, cream } = pal;
    ctx.fillStyle = rgba('#000000', 0.25); ctx.beginPath(); ctx.ellipse(22, 30.5, 13, 1.6, 0, 0, 7); ctx.fill();
    // two tails
    for (const [ox, oy, r] of [[0, 0, 0], [3, 2, 0.25]]) {
      const t = new Path2D();
      t.moveTo(14 + ox, 19 + oy + bob);
      t.bezierCurveTo(6 + ox, 20 + oy, 1 + ox, 12 + oy, 4 + ox, 5 + oy + r * 4);
      t.bezierCurveTo(7 + ox, 8 + oy, 10 + ox, 11 + oy, 15 + ox, 15 + oy + bob);
      t.closePath();
      paint(ctx, t, linear(ctx, 4, 4, 14, 18, [[0, cream], [0.3, fur], [1, furD]]), OUTLINE, 0.9);
    }
    // hind + front legs
    const leg = (x, d, c) => paint(ctx, rrect(x + d, 23 + bob, 3.2, 6.5 - Math.abs(d) * 0.3, 1.5), c, OUTLINE, 0.8);
    leg(14, -step, furD); leg(27, step, furD);
    // body
    const body = ellipse(21.5, 20 + bob, 10.5, 6.6);
    paint(ctx, body, linear(ctx, 0, 13, 0, 27, [[0, shade(fur, 0.15)], [0.7, fur], [1, furD]]), OUTLINE, 1);
    shadeIn(ctx, body, ellipse(22, 26 + bob, 8, 3.4), cream);
    leg(17, step, fur); leg(29.5, -step, fur);
    // head
    const hx = 33, hy = 14 + bob;
    const ears = [[hx - 4.5, hy - 4, hx - 6, hy - 11, hx - 1, hy - 6], [hx + 1, hy - 5.5, hx + 3, hy - 12, hx + 5, hy - 4.5]];
    for (const [a, b, c, d, e, g] of ears) {
      paint(ctx, poly([[a, b], [c, d], [e, g]]), fur, OUTLINE, 0.9);
      paint(ctx, poly([[a + 1, b - 0.4], [c + 0.4, d + 2.4], [e - 0.6, g - 0.3]]), pal.ear, null);
    }
    const head = new Path2D();
    head.moveTo(hx - 7, hy); head.bezierCurveTo(hx - 7, hy - 7, hx + 5, hy - 8, hx + 6.5, hy - 1.5);
    head.quadraticCurveTo(hx + 11, hy + 1, hx + 10, hy + 3.2); head.quadraticCurveTo(hx + 6, hy + 6.5, hx - 1, hy + 6);
    head.quadraticCurveTo(hx - 7, hy + 5, hx - 7, hy); head.closePath();
    paint(ctx, head, linear(ctx, 0, hy - 7, 0, hy + 6, [[0, shade(fur, 0.2)], [1, fur]]), OUTLINE, 1);
    shadeIn(ctx, head, ellipse(hx + 4, hy + 4.5, 7, 3.5), cream);
    paint(ctx, ellipse(hx + 10, hy + 2.6, 1.1, 0.9), '#2a1014', null);
    cuteEye(ctx, hx + 2.5, hy - 0.5, 1.6, 2.1, pal.eye);
    ctx.fillStyle = 'rgba(255,120,120,0.45)'; ctx.beginPath(); ctx.ellipse(hx + 1, hy + 3, 1.6, 0.9, 0, 0, 7); ctx.fill();
    if (pal.extra) pal.extra(ctx, f, bob);
  }, { idle: [0], walk: [0, 1, 2, 3] });
}

// ---------- Scarecrow: a straw man come to life ----------
export function scarecrow() {
  return withHurt(40, 46, 4, (ctx, f) => {
    const b = [0, -2, -3, -2][f];
    ctx.fillStyle = rgba('#000000', 0.25); ctx.beginPath(); ctx.ellipse(20, 44.5, 8, 1.5, 0, 0, 7); ctx.fill();
    paint(ctx, rrect(18.6, 30 + b, 2.8, 14 - b, 1), '#6a4224', OUTLINE, 0.8); // pole
    // tay que ngang
    paint(ctx, rrect(3, 20 + b, 34, 2.6, 1.2), '#7a4e2a', OUTLINE, 0.8);
    for (const x of [3, 36]) for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = i % 2 ? '#e8c46a' : '#c89a40'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(x, 21 + b); ctx.lineTo(x + (x < 10 ? -3 : 3), 17 + i * 2.5 + b); ctx.stroke();
    }
    // patched shirt
    const coat = new Path2D();
    coat.moveTo(13, 19 + b); coat.lineTo(27, 19 + b); coat.lineTo(29, 33 + b); coat.lineTo(11, 33 + b); coat.closePath();
    paint(ctx, coat, linear(ctx, 11, 0, 29, 0, [[0, '#4e3a5e'], [1, '#7a5a8e']]), OUTLINE, 1);
    paint(ctx, rrect(21, 24 + b, 4.5, 4, 0.6), '#b0884a', OUTLINE, 0.6);
    ctx.strokeStyle = '#2a1a2a'; ctx.lineWidth = 0.5; ctx.setLineDash([0.8, 0.8]); ctx.strokeRect(21.6, 24.6 + b, 3.3, 2.8); ctx.setLineDash([]);
    paint(ctx, rrect(12.5, 26.5 + b, 15, 2, 0.8), '#3a2418', null);
    for (let i = 0; i < 7; i++) { ctx.strokeStyle = i % 2 ? '#e8c46a' : '#c89a40'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(12.5 + i * 2.5, 33 + b); ctx.lineTo(12 + i * 2.6, 36.5 + b + (i % 3)); ctx.stroke(); }
    // burlap sack head
    const head = ellipse(20, 12.5 + b, 7.6, 7);
    paint(ctx, head, radial(ctx, 18, 10 + b, 1, 9, [[0, '#ead2a0'], [1, '#c4a46a']]), OUTLINE, 1);
    cuteEye(ctx, 17, 12 + b, 1.6, 1.8, '#ff3a2a', '#ff5a3a');
    cuteEye(ctx, 23, 12 + b, 1.6, 1.8, '#ff3a2a', '#ff5a3a');
    ctx.strokeStyle = '#3a2418'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(16, 16 + b); ctx.quadraticCurveTo(20, 18.5 + b, 24, 16 + b); ctx.stroke();
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(16.8 + i * 1.6, 16 + b + (i ? 0.6 : 0)); ctx.lineTo(16.8 + i * 1.6, 17.6 + b); ctx.stroke(); }
    // torn hat
    const hat = new Path2D();
    hat.moveTo(20, -1 + b); hat.lineTo(31.5, 7 + b); hat.lineTo(28, 8 + b); hat.lineTo(26, 7 + b); hat.lineTo(22, 8.2 + b); hat.lineTo(15, 7.6 + b); hat.lineTo(8.5, 7.2 + b); hat.closePath();
    paint(ctx, hat, linear(ctx, 8, 0, 32, 0, [[0, '#b08a3a'], [0.5, '#f0d488'], [1, '#c8a050']]), OUTLINE, 1);
  }, { idle: [0], walk: [0, 1, 2, 3] });
}

// ---------- Poison frog ----------
export function frog() {
  return withHurt(36, 28, 3, (ctx, f) => {
    const leap = f === 2, crouch = f === 1;
    const sy = crouch ? 1.5 : leap ? -1.5 : 0;
    ctx.fillStyle = rgba('#000000', 0.25); ctx.beginPath(); ctx.ellipse(18, 26.5, 10, 1.5, 0, 0, 7); ctx.fill();
    const skin = '#7ac84a', dark = '#3a7a2a', spot = '#8a4ab8';
    // hind legs
    if (leap) paint(ctx, poly([[8, 20], [1, 25], [3, 26.5], [11, 22]], true), dark, OUTLINE, 0.8);
    else paint(ctx, ellipse(10, 22 + sy * 0.5, 5, 3.4), dark, OUTLINE, 0.8);
    // body
    const body = ellipse(18, 18 + sy, 11.5, 7.5 - sy * 0.4);
    paint(ctx, body, radial(ctx, 16, 14, 1, 13, [[0, shade(skin, 0.3)], [1, skin]]), OUTLINE, 1);
    shadeIn(ctx, body, ellipse(19, 24 + sy, 9, 3.5), '#e8f0a0');
    for (const [x, y, r] of [[12, 15, 1.6], [16, 13, 1.2], [21, 15.5, 1.4], [9, 18, 1]]) paint(ctx, ellipse(x, y + sy, r, r * 0.8), spot, null);
    // front legs
    paint(ctx, ellipse(26, 24 + (leap ? -1 : 0), 3, 1.8), skin, OUTLINE, 0.8);
    // bulging eyes
    for (const x of [14, 23]) {
      paint(ctx, ellipse(x, 10.5 + sy, 4, 3.8), skin, OUTLINE, 0.9);
      paint(ctx, ellipse(x + 0.4, 10.3 + sy, 2.7, 2.7), '#ffffff', null);
      cuteEye(ctx, x + 0.9, 10.5 + sy, 1.5, 1.8, '#1a0a18');
    }
    // wide mouth
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(17, 17.5 + sy); ctx.quadraticCurveTo(23, 20.5 + sy, 29, 16.5 + sy); ctx.stroke();
    ctx.fillStyle = 'rgba(255,130,160,0.5)'; ctx.beginPath(); ctx.ellipse(27, 15 + sy, 1.5, 0.9, 0, 0, 7); ctx.fill();
    // poison drop
    ctx.fillStyle = '#b8ff6a'; ctx.beginPath(); ctx.ellipse(28.5, 19.5 + sy + f, 0.8, 1.2, 0, 0, 7); ctx.fill();
  }, { idle: [0], walk: [1, 2] });
}
