// Monsters drawn with curves. Each sheet has one extra "hit" frame (white flash) at the end.
import { makeSheet, shade, rgba, paint, shadeIn, ellipse, rrect, poly, radial, linear, OUTLINE } from './draw.js';

function withHurt(fw, fh, n, draw, frames) {
  return makeSheet(fw, fh, n + 1, (ctx, i) => {
    if (i < n) return draw(ctx, i);
    draw(ctx, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(0, 0, fw, fh);
  }, { ...frames, hurt: [n] });
}

// Shared cute eyes: big dark iris + 2 highlights
function cuteEye(ctx, x, y, rx, ry, color = '#1a0e14', glow) {
  if (glow) { ctx.fillStyle = radial(ctx, x, y, 0, rx * 2.6, [[0, rgba(glow, 0.55)], [1, rgba(glow, 0)]]); ctx.fillRect(x - rx * 3, y - ry * 3, rx * 6, ry * 6); }
  paint(ctx, ellipse(x, y, rx, ry), color, null);
  paint(ctx, ellipse(x - rx * 0.35, y - ry * 0.4, rx * 0.42, ry * 0.32), '#ffffff', null);
  paint(ctx, ellipse(x + rx * 0.3, y + ry * 0.45, rx * 0.2, ry * 0.15), rgba('#ffffff', 0.8), null);
}

// ---------- Will-o'-wisp: green flame with a face ----------
const WISP_PAL = {
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
};

function wisp(pal = WISP_PAL.wisp) {
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
const FOX_PAL = {
  fox: { fur: '#f08a3a', furD: '#c45a1e', cream: '#fff1df', ear: '#ffc8b0', eye: '#3a1410' },
  // Snow fox: white-blue fur with a snowflake on the forehead
  snowfox: { fur: '#eef4fc', furD: '#9ab8d8', cream: '#ffffff', ear: '#c8e0ff', eye: '#1a3a6a',
    extra(ctx, f, bob) {
      ctx.strokeStyle = '#7ac8ff'; ctx.lineWidth = 0.7;
      const x = 34, y = 9.5 + bob;
      for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 1.8, y - Math.sin(a) * 1.8); ctx.lineTo(x + Math.cos(a) * 1.8, y + Math.sin(a) * 1.8); ctx.stroke(); }
    } },
};

function fox(pal = FOX_PAL.fox) {
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
function scarecrow() {
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

// ---------- Jiangshi: hops with arms stretched out ----------
const JIANG_PAL = {
  jiangshi: { robe: '#24525a', robeL: '#3a7a80', skin: '#c6e0c8', glow: '#ff4a4a', tal: '#ffe066', ink: '#c42020' },
  // Blood jiangshi: dark red robe, red talisman with gold script, glowing red eyes
  blood_jiangshi: { robe: '#5a1420', robeL: '#8a2a34', skin: '#d8c4c4', glow: '#ff2a4a', tal: '#d8243a', ink: '#ffe066' },
};
function jiangshi(pal = JIANG_PAL.jiangshi) {
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
function lantern() {
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
function boss() {
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

// ---------- Poison frog ----------
function frog() {
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

// ---------- Yeti ----------
function yeti() {
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
function icebat() {
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
function golem() {
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

// ---------- Lava beast ----------
function lava() {
  return withHurt(46, 36, 4, (ctx, f) => {
    const st = [0, 1, 0, -1][f], b = f % 2 ? -0.6 : 0;
    ctx.fillStyle = rgba('#000000', 0.3); ctx.beginPath(); ctx.ellipse(22, 34.5, 15, 1.8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = radial(ctx, 22, 20, 2, 22, [[0, 'rgba(255,120,40,0.35)'], [1, 'rgba(255,80,20,0)']]); ctx.fillRect(0, 0, 46, 36);
    const rock = '#3a2a2a', rockL = '#5a4440';
    const leg = (x, d, c) => paint(ctx, rrect(x + d, 25 + b, 5.5, 8.5, 2), c, OUTLINE, 0.9);
    leg(9, -st, shade(rock, -0.2)); leg(28, st, shade(rock, -0.2));
    // rock shell
    const shell = new Path2D();
    shell.moveTo(5, 27 + b); shell.bezierCurveTo(4, 10 + b, 36, 6 + b, 38, 26 + b); shell.quadraticCurveTo(22, 30 + b, 5, 27 + b); shell.closePath();
    paint(ctx, shell, radial(ctx, 18, 12 + b, 1, 22, [[0, rockL], [1, rock]]), OUTLINE, 1.1);
    // glowing lava cracks
    ctx.save(); ctx.clip(shell);
    ctx.strokeStyle = '#ffb040'; ctx.lineWidth = 1.2; ctx.shadowColor = '#ff6a20'; ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.moveTo(10, 24 + b); ctx.lineTo(14, 17 + b); ctx.lineTo(20, 19 + b); ctx.lineTo(24, 12 + b);
    ctx.moveTo(20, 19 + b); ctx.lineTo(27, 22 + b); ctx.lineTo(32, 16 + b);
    ctx.moveTo(14, 17 + b); ctx.lineTo(12, 12 + b);
    ctx.stroke();
    ctx.restore();
    for (const [x, h] of [[13, 5], [21, 7], [29, 5]]) paint(ctx, poly([[x - 3, 12 + b + (x === 21 ? -3 : 0)], [x, 12 + b - h + (x === 21 ? -3 : 0)], [x + 3, 12 + b + (x === 21 ? -3 : 0)]]), rockL, OUTLINE, 0.8);
    leg(14, st, rock); leg(32, -st, rock);
    // head
    const head = new Path2D();
    head.moveTo(33, 16 + b); head.quadraticCurveTo(44, 14 + b, 44.5, 22 + b); head.quadraticCurveTo(42, 27 + b, 35, 26 + b); head.closePath();
    paint(ctx, head, linear(ctx, 0, 14, 0, 27, [[0, rockL], [1, rock]]), OUTLINE, 1);
    ctx.fillStyle = radial(ctx, 39.5, 19.5 + b, 0, 4, [[0, 'rgba(255,220,100,0.95)'], [1, 'rgba(255,100,20,0)']]); ctx.fillRect(35, 15 + b, 9, 9);
    paint(ctx, ellipse(39.5, 19.5 + b, 1.4, 1.2), '#fff0a0', null);
    ctx.strokeStyle = '#ff8a30'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(38, 24 + b); ctx.lineTo(43.5, 23 + b); ctx.stroke();
  }, { idle: [0], walk: [0, 1, 2, 3] });
}

// ---------- Fire Qilin (boss) ----------
function qilin() {
  return withHurt(108, 86, 3, (ctx, f) => {
    const b = f === 1 ? 1 : 0, atk = f === 2;
    const gold = '#f0b030', goldD = '#b8701a', red = '#c8301e', scale = '#ffd870';
    ctx.fillStyle = radial(ctx, 54, 48, 8, 54, [[0, 'rgba(255,140,40,0.4)'], [1, 'rgba(255,60,20,0)']]); ctx.fillRect(0, 0, 108, 86);
    ctx.fillStyle = rgba('#000000', 0.3); ctx.beginPath(); ctx.ellipse(54, 84, 34, 3, 0, 0, 7); ctx.fill();
    // flame tail
    const tail = new Path2D();
    tail.moveTo(26, 46 + b); tail.bezierCurveTo(12, 40, 4, 26, 10, 14 + b * 2); tail.bezierCurveTo(12, 22, 16, 26, 18, 24);
    tail.bezierCurveTo(16, 32, 22, 38, 30, 40 + b); tail.closePath();
    paint(ctx, tail, linear(ctx, 8, 14, 28, 46, [[0, '#fff0a0'], [0.5, '#ff9a30'], [1, red]]), '#6a1408', 1);
    // hind legs
    const leg = (x, y, c, d) => {
      paint(ctx, rrect(x + d, y, 7, 20, 3), c, OUTLINE, 1);
      paint(ctx, rrect(x - 1 + d, y + 17, 9, 5, 2), '#3a2418', OUTLINE, 0.9);
      ctx.fillStyle = '#ff9a30'; ctx.beginPath(); ctx.moveTo(x + d, y + 6); ctx.quadraticCurveTo(x - 4 + d, y + 9, x - 2 + d, y + 14); ctx.lineTo(x + 2 + d, y + 9); ctx.fill();
    };
    leg(30, 60, goldD, -1); leg(70, 60, goldD, 1);
    // body
    const body = ellipse(52, 52 + b, 28, 14);
    paint(ctx, body, linear(ctx, 0, 38, 0, 66, [[0, scale], [0.45, gold], [1, goldD]]), OUTLINE, 1.3);
    ctx.save(); ctx.clip(body);
    ctx.strokeStyle = rgba('#8a4a10', 0.5); ctx.lineWidth = 0.7;
    for (let y = 44; y < 64; y += 5) for (let x = 28 + (y % 10 ? 3 : 0); x < 80; x += 6) { ctx.beginPath(); ctx.arc(x, y + b, 3, 0.2, Math.PI - 0.2); ctx.stroke(); }
    ctx.fillStyle = '#ffe8b0'; ctx.beginPath(); ctx.ellipse(54, 62 + b, 22, 5, 0, 0, 7); ctx.fill();
    ctx.restore();
    leg(36, 60, gold, 1); leg(76, 60, gold, -1);
    // flame mane along the back and neck
    const mane = new Path2D();
    mane.moveTo(30, 42 + b);
    const pts = [[34, 30], [40, 38], [46, 28], [52, 37], [58, 24], [64, 33], [70, 18], [74, 28], [80, 14]];
    for (const [x, y] of pts) mane.lineTo(x, y + b);
    mane.lineTo(84, 30 + b); mane.lineTo(76, 44 + b); mane.closePath();
    paint(ctx, mane, linear(ctx, 0, 14, 0, 44, [[0, '#fff0a0'], [0.4, '#ff9a30'], [1, red]]), '#6a1408', 1);
    // neck + dragon head
    const neck = new Path2D();
    neck.moveTo(68, 46 + b); neck.quadraticCurveTo(72, 32 + b, 82, 28 + b); neck.lineTo(88, 36 + b); neck.quadraticCurveTo(80, 42 + b, 78, 52 + b); neck.closePath();
    paint(ctx, neck, linear(ctx, 68, 0, 88, 0, [[0, goldD], [1, gold]]), OUTLINE, 1.1);
    const head = new Path2D();
    head.moveTo(78, 22 + b); head.bezierCurveTo(84, 14 + b, 96, 16 + b, 100, 24 + b);
    head.quadraticCurveTo(106, 26 + b, 105, 31 + b);
    if (atk) { head.lineTo(96, 31 + b); head.lineTo(104, 38 + b); head.quadraticCurveTo(94, 42 + b, 86, 38 + b); }
    else { head.quadraticCurveTo(98, 36 + b, 88, 36 + b); }
    head.quadraticCurveTo(80, 34 + b, 78, 22 + b); head.closePath();
    paint(ctx, head, linear(ctx, 0, 14, 0, 40, [[0, scale], [1, gold]]), OUTLINE, 1.2);
    if (atk) {
      ctx.fillStyle = radial(ctx, 104, 34, 1, 14, [[0, 'rgba(255,250,200,1)'], [0.4, 'rgba(255,150,40,0.9)'], [1, 'rgba(255,60,20,0)']]);
      ctx.fillRect(90, 20, 18, 28);
    }
    // antlers
    for (const [x, d] of [[84, 0], [89, 3]]) {
      ctx.strokeStyle = '#fff2c8'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(x, 18 + b); ctx.quadraticCurveTo(x - 4 - d, 8 + b, x - 10 - d, 4 + b); ctx.moveTo(x - 4 - d, 10 + b); ctx.lineTo(x - 1 - d, 3 + b); ctx.stroke();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.6; ctx.stroke();
    }
    // eyes, whiskers
    ctx.fillStyle = radial(ctx, 92, 23 + b, 0, 6, [[0, 'rgba(255,80,40,0.8)'], [1, 'rgba(255,0,0,0)']]); ctx.fillRect(86, 17 + b, 12, 12);
    paint(ctx, poly([[89, 21 + b], [95, 22.5 + b], [93, 25 + b], [89.5, 24 + b]]), '#ff4a2a', OUTLINE, 0.8);
    paint(ctx, ellipse(92.5, 23.2 + b, 0.9, 1.1), '#fff0a0', null);
    ctx.strokeStyle = '#fff0a0'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(100, 30 + b); ctx.bezierCurveTo(98, 40 + b, 92, 44 + b, 88, 46 + b); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(103, 28 + b); ctx.bezierCurveTo(106, 36 + b, 104, 42 + b, 100, 46 + b); ctx.stroke();
    paint(ctx, ellipse(103.5, 26.5 + b, 0.9, 0.7), '#3a1408', null);
  }, { idle: [0, 1], walk: [0, 1], atk: [2] });
}

// ---------- White-masked ghost: tattered white cloak, porcelain mask ----------
function maskghost() {
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
function bloodDemon() {
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

const monCache = {};
const MAKERS = {
  wisp: () => wisp(), fox: () => fox(), scarecrow, jiangshi: () => jiangshi(), lantern, boss,
  blood_jiangshi: () => jiangshi(JIANG_PAL.blood_jiangshi), maskghost, blood_demon: bloodDemon,
  water_ghost: () => wisp(WISP_PAL.water_ghost), fire_spirit: () => wisp(WISP_PAL.fire_spirit), snowfox: () => fox(FOX_PAL.snowfox),
  frog, yeti, icebat, golem, lava, qilin,
};
export function monsterSheet(id) {
  if (!monCache[id]) monCache[id] = MAKERS[id]();
  return monCache[id];
}
