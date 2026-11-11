// Humanoid body parts: legs, arms, weapons, face, hair, hats
import { shade, rgba, paint, shadeIn, ellipse, rrect, poly, radial, linear, OUTLINE } from '../draw.js';

// ---------------- body parts ----------------
export function drawLeg(ctx, hx, hy, ang, pants, boot, fold) {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(-ang);
  const len = fold ? 9 : 11;
  paint(ctx, rrect(-2.4, -1, 4.8, len, 2), pants, OUTLINE, 0.9);
  shadeIn(ctx, rrect(-2.4, -1, 4.8, len, 2), rrect(-2.4, -1, 1.6, len, 0), rgba('#000000', 0.18));
  // cloth shoes with upturned toes
  const b = new Path2D();
  b.moveTo(-2.8, len - 2.6); b.lineTo(2.6, len - 2.6); b.quadraticCurveTo(5.4, len - 1.6, 5.9, len + 1.1);
  b.lineTo(-2.8, len + 1.5); b.closePath();
  paint(ctx, b, boot, OUTLINE, 0.9);
  ctx.fillStyle = rgba('#ffffff', 0.2); ctx.fillRect(-2, len - 2.1, 4.2, 0.7);
  ctx.restore();
}

export const UPPER = 5.6, FORE = 5.8;

// Elbow and hand position from the shoulder (dir(a) = downward, rotated forward by a)
export function armJoints(sx, sy, a1, a2) {
  const ex = sx + Math.sin(a1) * UPPER, ey = sy + Math.cos(a1) * UPPER;
  const a = a1 + a2;
  const wx = ex + Math.sin(a) * FORE, wy = ey + Math.cos(a) * FORE;
  return { ex, ey, wx, wy, hx: wx + Math.sin(a) * 1.6, hy: wy + Math.cos(a) * 1.6, a };
}

// Two-segment arm: the sleeve follows the arm, flaring slightly at the wrist
export function drawArm(ctx, sx, sy, a1, a2, robe, trim, skin, back) {
  const J = armJoints(sx, sy, a1, a2);
  const n = (ang) => [Math.cos(ang), -Math.sin(ang)]; // normal of the direction (sin, cos)
  const [n1x, n1y] = n(a1), [n2x, n2y] = n(J.a);
  const ne = [(n1x + n2x) / 2, (n1y + n2y) / 2];
  const w0 = 2.5, we = 2.2, ww = 3.1;
  const pts = [
    [sx + n1x * w0, sy + n1y * w0],
    [J.ex + ne[0] * we, J.ey + ne[1] * we],
    [J.wx + n2x * ww, J.wy + n2y * ww],
    [J.wx - n2x * ww, J.wy - n2y * ww],
    [J.ex - ne[0] * we, J.ey - ne[1] * we],
    [sx - n1x * w0, sy - n1y * w0],
  ];
  // hand (drawn first so the sleeve covers the wrist)
  paint(ctx, ellipse(J.hx, J.hy, 1.9, 1.9), back ? shade(skin, -0.14) : skin, OUTLINE, 0.8);
  const sleeve = new Path2D();
  sleeve.moveTo(pts[5][0], pts[5][1]);
  sleeve.quadraticCurveTo(sx - Math.sin(a1) * 1.2, sy - Math.cos(a1) * 1.2 - 0.6, pts[0][0], pts[0][1]);
  sleeve.quadraticCurveTo(pts[1][0], pts[1][1], (pts[1][0] + pts[2][0]) / 2, (pts[1][1] + pts[2][1]) / 2);
  sleeve.lineTo(pts[2][0], pts[2][1]);
  sleeve.quadraticCurveTo(J.wx + Math.sin(J.a) * 0.8, J.wy + Math.cos(J.a) * 0.8, pts[3][0], pts[3][1]);
  sleeve.quadraticCurveTo(pts[4][0], pts[4][1], (pts[4][0] + pts[5][0]) / 2, (pts[4][1] + pts[5][1]) / 2);
  sleeve.closePath();
  const col = back ? shade(robe, -0.25) : robe;
  paint(ctx, sleeve, radial(ctx, J.ex - 1, J.ey - 1.5, 0.5, 8, [[0, shade(col, 0.14)], [1, shade(col, -0.1)]]), OUTLINE, 0.9);
  // cuff trim
  ctx.strokeStyle = back ? shade(trim, -0.25) : trim; ctx.lineWidth = 1.3;
  ctx.beginPath();
  const cbx = J.wx - Math.sin(J.a) * 1.1, cby = J.wy - Math.cos(J.a) * 1.1;
  ctx.moveTo(cbx + n2x * (ww - 0.4), cby + n2y * (ww - 0.4)); ctx.lineTo(cbx - n2x * (ww - 0.4), cby - n2y * (ww - 0.4));
  ctx.stroke();
  // fold at the elbow
  ctx.strokeStyle = rgba(shade(col, -0.5), 0.6); ctx.lineWidth = 0.55;
  ctx.beginPath(); ctx.moveTo(J.ex - ne[0] * 1.2, J.ey - ne[1] * 1.2); ctx.quadraticCurveTo(J.ex + 0.6, J.ey + 0.6, J.ex + ne[0] * 0.8, J.ey + ne[1] * 0.8); ctx.stroke();
  return J;
}

// Hand-held weapon. wd: blade angle (0 = straight ahead, positive = pointing down)
export function drawWeapon(ctx, type, color, hx, hy, wd) {
  const lite = shade(color, 0.55), dark = shade(color, -0.35);
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(wd);
  if (type === 'sword') {
    // long sword: long blade with a central ridge, gold guard, wrapped grip, red tassel
    const blade = new Path2D();
    blade.moveTo(2.6, -1.35); blade.lineTo(23.5, -1.1); blade.lineTo(27, 0); blade.lineTo(23.5, 1.1); blade.lineTo(2.6, 1.35); blade.closePath();
    paint(ctx, blade, linear(ctx, 0, -1.4, 0, 1.4, [[0, lite], [0.48, color], [0.52, shade(color, -0.12)], [1, dark]]), OUTLINE, 0.85);
    ctx.strokeStyle = rgba('#ffffff', 0.7); ctx.lineWidth = 0.45; ctx.beginPath(); ctx.moveTo(4, -0.55); ctx.lineTo(23, -0.45); ctx.stroke();
    const guard = new Path2D();
    guard.moveTo(1, -3.6); guard.quadraticCurveTo(3.4, -2, 3, 0); guard.quadraticCurveTo(3.4, 2, 1, 3.6); guard.quadraticCurveTo(1.8, 0, 1, -3.6); guard.closePath();
    paint(ctx, guard, linear(ctx, 0, -3.6, 0, 3.6, [[0, '#fff0b0'], [1, '#c8902a']]), OUTLINE, 0.7);
    paint(ctx, rrect(-4.8, -1, 5.8, 2, 0.9), '#4a2a1e', OUTLINE, 0.7);
    ctx.strokeStyle = rgba('#e2b85c', 0.8); ctx.lineWidth = 0.4;
    for (let i = -4; i < 0.5; i += 1.4) { ctx.beginPath(); ctx.moveTo(i, -0.9); ctx.lineTo(i + 0.8, 0.9); ctx.stroke(); }
    paint(ctx, ellipse(-5.2, 0, 1.1, 1.1), '#e2b85c', OUTLINE, 0.6);
    ctx.strokeStyle = '#d23a32'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-5.6, 0.6); ctx.quadraticCurveTo(-7.2, 3, -6.2, 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-5.4, 0.8); ctx.quadraticCurveTo(-6, 3.4, -4.6, 5.6); ctx.stroke();
  } else if (type === 'staff') {
    // long wooden staff with a cloud-shaped head, a small bell and a red tassel
    paint(ctx, rrect(-13, -0.95, 37, 1.9, 0.95), linear(ctx, 0, -1, 0, 1, [[0, '#c08a58'], [1, '#6a3e22']]), OUTLINE, 0.75);
    paint(ctx, rrect(-1.6, -1.25, 3.2, 2.5, 0.6), '#d23a32', null); // cloth wrap at the grip
    const head = new Path2D();
    head.moveTo(22.5, -1.8);
    head.bezierCurveTo(22, -6.5, 28.5, -7.5, 29.5, -3.2);
    head.bezierCurveTo(32.5, -3.4, 32.8, 2.2, 29.6, 2.4);
    head.bezierCurveTo(29.6, 6.6, 23.2, 6.6, 23, 2.2);
    head.quadraticCurveTo(21.6, 0.2, 22.5, -1.8); head.closePath();
    paint(ctx, head, radial(ctx, 26, -1.5, 0.5, 7, [[0, lite], [0.6, color], [1, dark]]), OUTLINE, 0.85);
    ctx.strokeStyle = rgba(dark, 0.8); ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.arc(26.6, 0, 2.2, -2.4, 2); ctx.stroke();
    paint(ctx, ellipse(26.6, 0, 1, 1), '#e2b85c', null);
    ctx.strokeStyle = '#d23a32'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(21.6, 1.4); ctx.quadraticCurveTo(20.2, 5, 21.6, 8.6); ctx.stroke();
    paint(ctx, ellipse(21.6, 9.2, 1.1, 1.1), '#e2b85c', OUTLINE, 0.5);
  } else if (type === 'dart') {
    // holds 2 darts fanned out in the hand
    for (const [ox, oy, r] of [[5, -2.2, 0.3], [6.2, 2, 0.9]]) {
      ctx.save(); ctx.translate(ox, oy); ctx.rotate(r);
      const st = poly([[0, -5.4], [1.2, -1.2], [5.4, 0], [1.2, 1.2], [0, 5.4], [-1.2, 1.2], [-5.4, 0], [-1.2, -1.2]]);
      paint(ctx, st, radial(ctx, -1, -1, 0.5, 5.5, [[0, lite], [1, color]]), OUTLINE, 0.7);
      paint(ctx, ellipse(0, 0, 1.1, 1.1), '#2a2230', null);
      ctx.restore();
    }
  }
  ctx.restore();
}

export function faceShape(cx, cy) {
  // round face, chubby cheeks, small chin shifted forward (3/4 view)
  const p = new Path2D();
  p.moveTo(cx - 9, cy - 1.5);
  p.bezierCurveTo(cx - 9.2, cy - 12.2, cx + 9.6, cy - 12.4, cx + 9.7, cy - 1.5);
  p.bezierCurveTo(cx + 9.8, cy + 3.8, cx + 7.6, cy + 7.6, cx + 4.6, cy + 8.9);
  p.quadraticCurveTo(cx + 2.6, cy + 9.8, cx + 0.6, cy + 9.3);
  p.bezierCurveTo(cx - 4.6, cy + 8.6, cx - 9, cy + 5.2, cx - 9, cy - 1.5);
  p.closePath();
  return p;
}

export function drawEye(ctx, x, y, s, iris, state) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, 1);
  if (state === 'closed') {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-2.4, 0.2); ctx.quadraticCurveTo(0, 2, 2.5, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(2.5, 0); ctx.lineTo(3.2, -0.6); ctx.stroke();
  } else if (state === 'hurt') {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-2, -1.6); ctx.lineTo(1.8, 0.2); ctx.lineTo(-2, 1.9); ctx.stroke();
  } else {
    const h = state === 'focus' ? 2.6 : 3.4;
    // eye white
    paint(ctx, ellipse(0, 0.3, 2.45, h), '#ffffff', null);
    // big iris, dark at the top and lighter toward the bottom
    paint(ctx, ellipse(0.3, 0.6, 1.95, h - 0.25), linear(ctx, 0, -h, 0, h, [[0, '#0e070b'], [0.4, shade(iris, -0.25)], [1, shade(iris, 0.55)]]), null);
    paint(ctx, ellipse(0.35, 0.3, 0.95, 1.45), '#0a0507', null);
    // highlights
    paint(ctx, ellipse(-0.55, -1.1, 0.85, 1), '#ffffff', null);
    paint(ctx, ellipse(1.15, 1.9, 0.45, 0.4), rgba('#ffffff', 0.9), null);
    // thick curved upper lash line with a flick at the end
    const lash = new Path2D();
    lash.moveTo(-2.7, -h * 0.35);
    lash.quadraticCurveTo(-1.6, -h - 0.9, 1, -h - 0.55);
    lash.quadraticCurveTo(2.6, -h - 0.3, 3.5, -h * 0.55);
    lash.lineTo(3.1, -h * 0.25);
    lash.quadraticCurveTo(1.6, -h + 0.2, -0.5, -h + 0.05);
    lash.quadraticCurveTo(-1.8, -h + 0.35, -2.7, -h * 0.35);
    lash.closePath();
    ctx.fillStyle = OUTLINE; ctx.fill(lash);
    // thin lower lash line
    ctx.strokeStyle = rgba('#22141c', 0.55); ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0.4, h + 0.4); ctx.quadraticCurveTo(1.8, h + 0.1, 2.5, h - 0.8); ctx.stroke();
  }
  ctx.restore();
}

// Hair behind the head (drawn before the face)
export function drawBackHair(ctx, style, hair, cx, cy) {
  const dk = shade(hair, -0.22);
  if (style === 3) { paint(ctx, ellipse(cx - 2.5, cy + 0.5, 8.5, 8.8), hair, OUTLINE, 0.9); return; }
  // hair mass at the nape, puffed out and hanging down to the chin
  const p = new Path2D();
  p.moveTo(cx - 3, cy - 11.5);
  p.bezierCurveTo(cx - 13, cy - 11.5, cx - 13.5, cy + 1, cx - 11.6, cy + 8.6);
  p.quadraticCurveTo(cx - 9.5, cy + 11, cx - 6.5, cy + 9.6);
  p.lineTo(cx + 2, cy + 2);
  p.bezierCurveTo(cx + 8, cy - 4, cx + 6, cy - 11.6, cx - 3, cy - 11.5);
  p.closePath();
  paint(ctx, p, linear(ctx, cx - 12, 0, cx + 4, 0, [[0, dk], [1, hair]]), OUTLINE, 1);
  if (style === 1) { // long hair falling down the back
    const t = new Path2D();
    t.moveTo(cx - 10.5, cy + 2); t.bezierCurveTo(cx - 14.5, cy + 12, cx - 13, cy + 22, cx - 10.5, cy + 28);
    t.quadraticCurveTo(cx - 8, cy + 29.5, cx - 5.6, cy + 26.5); t.bezierCurveTo(cx - 7, cy + 18, cx - 6.5, cy + 10, cx - 4, cy + 4); t.closePath();
    paint(ctx, t, linear(ctx, cx - 13, 0, cx - 5, 0, [[0, dk], [1, hair]]), OUTLINE, 1);
    ctx.strokeStyle = rgba(shade(hair, 0.4), 0.5); ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(cx - 9, cy + 6); ctx.quadraticCurveTo(cx - 11, cy + 16, cx - 9, cy + 25); ctx.stroke();
    paint(ctx, rrect(cx - 11.2, cy + 8.5, 5.6, 2.3, 1.1), '#d23a32', OUTLINE, 0.7);
  } else if (style === 4) { // bun at the nape
    paint(ctx, ellipse(cx - 11.5, cy - 1.5, 4.8, 4.6), linear(ctx, 0, cy - 6, 0, cy + 3, [[0, shade(hair, 0.2)], [1, hair]]), OUTLINE, 1);
    ctx.strokeStyle = '#e2b85c'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(cx - 18, cy - 3.5); ctx.lineTo(cx - 6, cy + 1); ctx.stroke();
    paint(ctx, ellipse(cx - 18.2, cy - 3.6, 1, 1), '#e2b85c', null);
  } else if (style === 2) { // headband tails flowing behind
    const t = new Path2D();
    t.moveTo(cx - 9, cy - 4); t.quadraticCurveTo(cx - 16, cy - 6, cx - 21, cy - 1.5); t.quadraticCurveTo(cx - 16, cy - 1.5, cx - 9.5, cy); t.closePath();
    paint(ctx, t, shade(hair, 0.15), OUTLINE, 0.8);
  }
}

// Bangs + front hair (drawn after the face)
export function drawFrontHair(ctx, style, hair, cx, cy) {
  const hl = shade(hair, 0.38), dk = shade(hair, -0.25);
  const fill = linear(ctx, 0, cy - 12, 0, cy + 4, [[0, hl], [0.3, hair], [1, dk]]);
  if (style === 3) { // old man: silver hair combed back, small topknot
    const p = new Path2D();
    p.moveTo(cx - 9.4, cy + 1); p.bezierCurveTo(cx - 10, cy - 10.5, cx + 7, cy - 12.5, cx + 8.8, cy - 5.5);
    p.quadraticCurveTo(cx + 2, cy - 7.8, cx - 4, cy - 5.2); p.quadraticCurveTo(cx - 6.5, cy - 2, cx - 6, cy + 2); p.closePath();
    paint(ctx, p, fill, OUTLINE, 0.9);
    paint(ctx, ellipse(cx - 2, cy - 11, 2.8, 2.4), hair, OUTLINE, 0.9);
    return;
  }
  // bangs: individual locks curving forward
  const roots = [[cx + 9.4, cy - 3], [cx + 6.6, cy - 5.6], [cx + 3.4, cy - 6.4], [cx + 0.2, cy - 6.2], [cx - 3, cy - 5.4]];
  const tips = [[cx + 9.3, cy + 3.2], [cx + 6, cy + 1.6], [cx + 2.6, cy + 2.4], [cx - 0.8, cy + 1.2], [cx - 4.2, cy + 0.6]];
  const p = new Path2D();
  p.moveTo(cx - 9.6, cy + 4);
  p.bezierCurveTo(cx - 11.2, cy - 8, cx - 3, cy - 13.6, cx + 2.5, cy - 12.4);
  p.bezierCurveTo(cx + 9, cy - 11.4, cx + 11.2, cy - 6, cx + 10.2, cy - 1);
  p.quadraticCurveTo(cx + 10.4, cy + 2, cx + 9.3, cy + 5.6); // sideburns in front of the face
  for (let i = 0; i < tips.length; i++) {
    const [rx, ry] = roots[i], [tx, ty] = tips[i];
    if (i > 0) p.bezierCurveTo(rx + 1.2, ry + 1.6, tx + 1.6, ty - 2.6, tx, ty); // down to the tip of the lock
    else p.lineTo(tx, ty);
    const [nx, ny] = roots[i + 1] || [cx - 5.6, cy - 4.4];
    p.bezierCurveTo(tx - 0.2, ty - 2.2, nx + 0.8, ny + 2.2, nx, ny); // up to the root of the next lock
  }
  // long sideburn by the ear
  p.bezierCurveTo(cx - 6.2, cy + 1, cx - 5.4, cy + 6, cx - 5.6, cy + 10.4);
  p.quadraticCurveTo(cx - 8.4, cy + 8.6, cx - 9.6, cy + 4);
  p.closePath();
  paint(ctx, p, fill, OUTLINE, 1);
  // arc-shaped highlight (anime style)
  ctx.save(); ctx.clip(p);
  ctx.strokeStyle = rgba('#ffffff', 0.42); ctx.lineWidth = 1.3; ctx.setLineDash([2.6, 1.2]);
  ctx.beginPath(); ctx.ellipse(cx + 0.5, cy - 1.5, 8, 7.6, 0, Math.PI * 1.08, Math.PI * 1.62); ctx.stroke();
  ctx.setLineDash([]);
  // lines between locks
  ctx.strokeStyle = rgba(shade(hair, -0.45), 0.55); ctx.lineWidth = 0.55;
  for (const [rx, ry] of roots.slice(1)) { ctx.beginPath(); ctx.moveTo(rx, ry); ctx.quadraticCurveTo(rx + 0.6, ry - 3, rx - 1.5, ry - 6); ctx.stroke(); }
  ctx.restore();
  if (style === 0) { // topknot + red string
    paint(ctx, ellipse(cx - 1.5, cy - 13, 3.8, 3.4), linear(ctx, 0, cy - 17, 0, cy - 9, [[0, shade(hair, 0.3)], [1, hair]]), OUTLINE, 1);
    paint(ctx, rrect(cx - 4.6, cy - 11, 6.2, 1.7, 0.85), '#d23a32', OUTLINE, 0.6);
  } else if (style === 5) { // spiky hair
    for (const [x, y, r] of [[-5, -10.5, -0.5], [-0.5, -12.5, 0], [4, -11, 0.5]]) {
      const s = poly([[cx + x - 2.4, cy + y + 3], [cx + x + r * 3, cy + y - 3], [cx + x + 2.4, cy + y + 3]]);
      paint(ctx, s, hair, OUTLINE, 0.8);
    }
  }
}

export function drawHat(ctx, hat, color, cx, cy) {
  const hl = shade(color, 0.3), dk = shade(color, -0.3);
  if (hat === 'conical') { // conical hat
    const p = new Path2D();
    p.moveTo(cx, cy - 16); p.lineTo(cx + 15.5, cy - 5.2); p.quadraticCurveTo(cx, cy - 1.8, cx - 15.5, cy - 5.2); p.closePath();
    paint(ctx, p, linear(ctx, cx - 15, 0, cx + 15, 0, [[0, dk], [0.45, hl], [1, color]]), OUTLINE, 1);
    ctx.save(); ctx.clip(p); ctx.strokeStyle = rgba('#5a4020', 0.45); ctx.lineWidth = 0.5;
    for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(cx - 16, cy - 16 + i * 2.7); ctx.lineTo(cx + 16, cy - 16 + i * 2.7); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = '#8a3a2a'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(cx + 7, cy - 3.5); ctx.quadraticCurveTo(cx + 8, cy + 4, cx + 5, cy + 9); ctx.stroke();
  } else if (hat === 'helm') {
    const p = new Path2D();
    p.moveTo(cx - 10, cy - 1); p.bezierCurveTo(cx - 10, cy - 14, cx + 10.5, cy - 14, cx + 10.5, cy - 1); p.closePath();
    paint(ctx, p, linear(ctx, 0, cy - 12, 0, cy, [[0, hl], [1, dk]]), OUTLINE, 1);
    paint(ctx, rrect(cx - 10.5, cy - 2.5, 21.5, 2.6, 1.2), shade(color, -0.1), OUTLINE, 0.8);
    paint(ctx, poly([[cx - 1, cy - 12], [cx + 1, cy - 19], [cx + 3.5, cy - 18], [cx + 2, cy - 12]]), '#d23a32', OUTLINE, 0.8);
  } else if (hat === 'daoist') {
    const p = new Path2D();
    p.moveTo(cx - 7, cy - 4); p.lineTo(cx - 6, cy - 15); p.quadraticCurveTo(cx + 1, cy - 17.5, cx + 8, cy - 15); p.lineTo(cx + 8.5, cy - 4); p.closePath();
    paint(ctx, p, linear(ctx, cx - 7, 0, cx + 8, 0, [[0, shade(color, -0.2)], [1, hl]]), OUTLINE, 1);
    paint(ctx, rrect(cx - 8, cy - 6, 17, 2.6, 1.2), hl, OUTLINE, 0.8);
    paint(ctx, rrect(cx - 1.6, cy - 13, 4, 4, 0.8), '#e2b85c', OUTLINE, 0.7);
  } else if (hat === 'band') {
    paint(ctx, rrect(cx - 10, cy - 5.5, 20.5, 2.4, 1.1), color, OUTLINE, 0.8);
    const t = new Path2D(); t.moveTo(cx - 9.5, cy - 4.5); t.quadraticCurveTo(cx - 15, cy - 3, cx - 18, cy + 1); t.lineTo(cx - 15, cy - 1); t.quadraticCurveTo(cx - 13, cy - 3, cx - 9.5, cy - 3.2);
    paint(ctx, t, color, OUTLINE, 0.7);
  }
}
