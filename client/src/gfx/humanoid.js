// Humanoid characters (player, bots, NPCs): drawn with curves, with outlines and shading.
// Chibi proportions: big head, big anime eyes, wide-sleeved crossed-collar robe. Facing right.
import { makeSheet, shade, rgba, paint, shadeIn, ellipse, rrect, poly, radial, linear, OUTLINE } from './draw.js';

export const HUM_W = 68, HUM_H = 62, HUM_FEET = 60;
const SIDE = 10; // room on both sides for long weapons
const TOP = 6; // room above for hair buns, hats, plumes

// Pose: bob = lower the body, lean = tilt the torso, lf/lb = front/back leg angle,
// a1/a2 = front upper arm / forearm angle (rad, 0 = hanging straight down, positive = forward),
// b1/b2 = back arm, wd = weapon direction (0 = pointing straight ahead), sd = staff direction, eye = eye state
const WALK = [0, 1, 2, 3, 4, 5].map((i) => {
  const p = (i / 6) * Math.PI * 2, s = Math.sin(p);
  return { bob: -Math.abs(s) * 1.1 + 0.6, lean: 0.8, lf: s * 0.6, lb: -s * 0.6, a1: 0.3 - s * 0.2, a2: 1.05, b1: s * 0.45, b2: 0.35, wd: 0.55 + s * 0.08, sd: -1.45, eye: 'open' };
});
const POSES = [
  { bob: 0, lean: 0, lf: 0.2, lb: -0.16, a1: 0.32, a2: 1.08, b1: -0.12, b2: 0.35, wd: 0.5, sd: -1.5, eye: 'open' },          // 0 guard stance
  { bob: 0.6, lean: 0, lf: 0.2, lb: -0.16, a1: 0.34, a2: 1.1, b1: -0.1, b2: 0.38, wd: 0.54, sd: -1.47, eye: 'open' },       // 1 breathing
  { bob: 0.3, lean: 0, lf: 0.2, lb: -0.16, a1: 0.33, a2: 1.09, b1: -0.11, b2: 0.36, wd: 0.52, sd: -1.48, eye: 'closed' },   // 2 blink
  ...WALK,                                                                                                                 // 3-8 walk
  { bob: -1.2, lean: 0.6, lf: 0.75, lb: -0.35, a1: 1.1, a2: 0.9, b1: -0.9, b2: 0.6, wd: -0.55, sd: -1.2, eye: 'open', fold: true }, // 9 jump
  { bob: 0.3, lean: -1.2, lf: 0.4, lb: -0.35, a1: -2.3, a2: 0.5, b1: 0.6, b2: 0.5, wd: -2.35, sd: -2.4, eye: 'focus' },      // 10 wind-up
  { bob: 1, lean: 2, lf: 0.6, lb: -0.5, a1: 1.45, a2: 0.12, b1: -0.7, b2: 0.4, wd: 0.12, sd: -0.45, eye: 'focus' },          // 11 slash
  { bob: 0.8, lean: -2, lf: 0.2, lb: -0.4, a1: -0.5, a2: 0.9, b1: -0.9, b2: 0.5, wd: 2.0, sd: -1.95, eye: 'hurt' },          // 12 hit
  { bob: 6, lean: 0, lf: 1.45, lb: 1.35, a1: 0.45, a2: 1.0, b1: 0.3, b2: 0.6, wd: 0.25, sd: -1.15, eye: 'open', sit: true },  // 13 sit
];
export const HUM_FRAMES = { idle: [0, 1, 0, 1, 0, 2], walk: [3, 4, 5, 6, 7, 8], jump: [9], atk: [10, 11], hurt: [12], sit: [13] };

// ---------------- body parts ----------------
function drawLeg(ctx, hx, hy, ang, pants, boot, fold) {
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

const UPPER = 5.6, FORE = 5.8;
// Elbow and hand position from the shoulder (dir(a) = downward, rotated forward by a)
function armJoints(sx, sy, a1, a2) {
  const ex = sx + Math.sin(a1) * UPPER, ey = sy + Math.cos(a1) * UPPER;
  const a = a1 + a2;
  const wx = ex + Math.sin(a) * FORE, wy = ey + Math.cos(a) * FORE;
  return { ex, ey, wx, wy, hx: wx + Math.sin(a) * 1.6, hy: wy + Math.cos(a) * 1.6, a };
}

// Two-segment arm: the sleeve follows the arm, flaring slightly at the wrist
function drawArm(ctx, sx, sy, a1, a2, robe, trim, skin, back) {
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
function drawWeapon(ctx, type, color, hx, hy, wd) {
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

function faceShape(cx, cy) {
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

function drawEye(ctx, x, y, s, iris, state) {
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
function drawBackHair(ctx, style, hair, cx, cy) {
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
function drawFrontHair(ctx, style, hair, cx, cy) {
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

function drawHat(ctx, hat, color, cx, cy) {
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

// ---------------- outfit details ----------------
// Cape on the back, flowing backward while running
function drawCape(ctx, x, y, cape, sw) {
  const p = new Path2D();
  p.moveTo(x - 3.5, y - 1.5);
  p.quadraticCurveTo(x - 9, y + 4, x - 13 - sw * 0.8, y + 14);
  p.quadraticCurveTo(x - 16 - sw * 1.2, y + 20, x - 17 - sw * 1.4, y + 25);
  if (cape.feather) { // feathered edge
    for (let i = 0; i < 5; i++) {
      const t = i / 5, bx = x - 17 - sw * 1.4 + t * 20, by = y + 25 - t * 1.5;
      p.lineTo(bx + 2, by + 4); p.lineTo(bx + 4, by);
    }
  } else {
    p.quadraticCurveTo(x - 10, y + 23, x - 6 - sw * 0.4, y + 25.5);
    p.quadraticCurveTo(x - 2, y + 22, x + 2, y + 24);
  }
  p.lineTo(x + 3, y + 8); p.quadraticCurveTo(x + 3.5, y + 1, x + 2.5, y - 1.5); p.closePath();
  paint(ctx, p, linear(ctx, x - 17, 0, x + 3, 0, [[0, shade(cape.c, -0.35)], [0.6, cape.c], [1, shade(cape.c, -0.15)]]), OUTLINE, 1);
  ctx.save(); ctx.clip(p);
  ctx.strokeStyle = cape.t; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(x - 3.5, y - 1.5); ctx.quadraticCurveTo(x - 9, y + 4, x - 13 - sw * 0.8, y + 14); ctx.quadraticCurveTo(x - 16 - sw * 1.2, y + 20, x - 17 - sw * 1.4, y + 25); ctx.stroke();
  ctx.strokeStyle = rgba(shade(cape.c, -0.5), 0.5); ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(x - 4, y + 4); ctx.quadraticCurveTo(x - 8, y + 14, x - 10 - sw, y + 25); ctx.stroke();
  if (cape.feather) {
    ctx.fillStyle = rgba(cape.t, 0.55);
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(x - 12 + i * 4 - sw, y + 20 + (i % 2), 1.2, 3.2, 0.4, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}

// Fluffy fox tail with a white tip
function drawTail(ctx, x, y, color, sw) {
  const p = new Path2D();
  p.moveTo(x - 3, y + 13);
  p.bezierCurveTo(x - 12, y + 16, x - 20 - sw, y + 10, x - 20 - sw, y + 1);
  p.bezierCurveTo(x - 20 - sw, y - 5, x - 14 - sw, y - 6, x - 12 - sw * 0.6, y - 2);
  p.bezierCurveTo(x - 14, y + 5, x - 9, y + 9, x - 2, y + 9.5);
  p.closePath();
  paint(ctx, p, linear(ctx, x - 20, y, x - 2, y + 12, [[0, shade(color, 0.15)], [1, shade(color, -0.2)]]), OUTLINE, 1);
  ctx.save(); ctx.clip(p);
  paint(ctx, ellipse(x - 17 - sw, y - 1, 5.5, 5), '#ffffff', null);
  ctx.strokeStyle = rgba(shade(color, -0.45), 0.5); ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(x - 6, y + 11); ctx.quadraticCurveTo(x - 13, y + 11, x - 16 - sw, y + 5); ctx.stroke();
  ctx.restore();
}

// Fairy silk sash looping behind the back, both ends flying
function drawSash(ctx, x, y, color, sw, t) {
  const band = (pts, w) => {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = w + 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); ctx.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); ctx.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]); ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.55); ctx.lineWidth = w * 0.35;
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1] - 0.4); ctx.bezierCurveTo(pts[2], pts[3] - 0.4, pts[4], pts[5] - 0.4, pts[6], pts[7] - 0.4); ctx.stroke();
  };
  band([x + 6, y + 9, x - 4, y - 7, x - 16, y - 2, x - 19 - sw * 1.5, y + 10 + t], 2);
  band([x - 19 - sw * 1.5, y + 10 + t, x - 21 - sw, y + 16, x - 15 - sw * 2, y + 20, x - 22 - sw * 2.2, y + 26], 1.8);
  ctx.lineCap = 'butt';
}

// Pattern on the robe (drawn inside the clipped robe area)
function drawPattern(ctx, x, y, pat, sw) {
  const c = pat.c;
  ctx.save();
  if (pat.kind === 'dragon') { // golden dragon coiling around the robe flap
    ctx.strokeStyle = rgba(c, 0.85); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 9 - sw, y + 21); ctx.bezierCurveTo(x - 6, y + 12, x + 3, y + 22, x + 6, y + 13); ctx.bezierCurveTo(x + 8, y + 9, x + 3, y + 7, x + 1, y + 10); ctx.stroke();
    ctx.lineWidth = 0.6; ctx.strokeStyle = rgba(c, 0.7);
    for (let i = 0; i < 5; i++) { const t = i / 5, px = x - 8 + t * 13, py = y + 19 - Math.sin(t * 3.2) * 4; ctx.beginPath(); ctx.arc(px, py, 1.1, 0, Math.PI); ctx.stroke(); }
    paint(ctx, ellipse(x + 1.6, y + 9.8, 1.3, 1.1), c, null);
    ctx.beginPath(); ctx.moveTo(x + 2.6, y + 9.4); ctx.quadraticCurveTo(x + 6, y + 6, x + 8, y + 7.5); ctx.stroke();
  } else if (pat.kind === 'cloud') { // auspicious clouds
    ctx.strokeStyle = rgba(c, 0.8); ctx.lineWidth = 0.9;
    for (const [cx, cy] of [[x - 6, y + 19], [x + 4, y + 16]]) {
      ctx.beginPath(); ctx.arc(cx, cy, 2, Math.PI * 0.9, Math.PI * 2.4); ctx.arc(cx + 3, cy - 0.6, 1.6, Math.PI, Math.PI * 2.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 3.4, cy + 1.8); ctx.lineTo(cx + 5, cy + 1.8); ctx.stroke();
    }
  } else if (pat.kind === 'lotus') { // lotus flowers at the hem
    for (const [cx, cy, s] of [[x - 5, y + 19.5, 1], [x + 5, y + 18, 0.8]]) {
      for (const a of [-0.9, -0.45, 0, 0.45, 0.9]) {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
        paint(ctx, ellipse(0, -2.2 * s, 1.1 * s, 2.4 * s), rgba(c, 0.85), rgba(shade(c, -0.3), 0.8), 0.4);
        ctx.restore();
      }
      paint(ctx, ellipse(cx, cy + 0.3, 2.4 * s, 0.9 * s), rgba('#4fb88a', 0.8), null);
    }
  } else if (pat.kind === 'flame') { // tongues of flame rising from the hem
    for (let i = 0; i < 5; i++) {
      const fx = x - 9 + i * 4.6 - sw * (1 - i / 4), h = 5 + (i % 2) * 3;
      const f = new Path2D(); f.moveTo(fx - 2, y + 24); f.quadraticCurveTo(fx - 2.4, y + 24 - h * 0.6, fx + 0.4, y + 24 - h); f.quadraticCurveTo(fx + 0.6, y + 24 - h * 0.4, fx + 2, y + 24); f.closePath();
      ctx.fillStyle = linear(ctx, 0, y + 24 - h, 0, y + 24, [[0, rgba('#fff6c0', 0.95)], [1, rgba(c, 0.9)]]); ctx.fill(f);
    }
  } else if (pat.kind === 'snow') { // snowflakes
    ctx.strokeStyle = rgba(c, 0.85); ctx.lineWidth = 0.6;
    for (const [cx, cy, r] of [[x - 5, y + 18, 2], [x + 3, y + 14, 1.5], [x + 6, y + 20, 1.7]]) {
      for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; ctx.beginPath(); ctx.moveTo(cx - Math.cos(a) * r, cy - Math.sin(a) * r); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.stroke(); }
    }
  } else if (pat.kind === 'fairy') { // hem fading to pink + twinkling stars
    ctx.fillStyle = linear(ctx, 0, y + 15, 0, y + 24, [[0, rgba(c, 0)], [1, rgba(c, 0.75)]]);
    ctx.fillRect(x - 14, y + 15, 28, 10);
    ctx.fillStyle = rgba('#ffffff', 0.95);
    for (const [sx2, sy2, r] of [[x - 6, y + 13, 1.3], [x + 2, y + 17, 1], [x - 2, y + 20, 0.9], [x + 6, y + 12, 0.8]]) {
      ctx.beginPath(); ctx.moveTo(sx2, sy2 - r * 1.8); ctx.lineTo(sx2 + r * 0.5, sy2); ctx.lineTo(sx2, sy2 + r * 1.8); ctx.lineTo(sx2 - r * 0.5, sy2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(sx2 - r * 1.8, sy2); ctx.lineTo(sx2, sy2 + r * 0.5); ctx.lineTo(sx2 + r * 1.8, sy2); ctx.lineTo(sx2, sy2 - r * 0.5); ctx.closePath(); ctx.fill();
    }
  } else if (pat.kind === 'moon') { // blood moon on the chest + red streaks
    ctx.fillStyle = rgba(c, 0.9);
    ctx.beginPath(); ctx.arc(x - 1.6, y + 4.6, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = shade(c, -0.6); ctx.beginPath(); ctx.arc(x - 0.6, y + 4, 2.1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgba(c, 0.7); ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(x - 8 - sw, y + 22); ctx.lineTo(x - 4, y + 13); ctx.moveTo(x - 4, y + 23); ctx.lineTo(x - 1, y + 15); ctx.stroke();
  }
  ctx.restore();
}

// Fur collar
function drawFur(ctx, x, y, color) {
  const p = new Path2D();
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI, r = 6.4 + (i % 2) * 1.1;
    const px = x + Math.cos(a) * r * 1.15, py = y + 1 - Math.sin(a) * r * 0.42;
    if (i === 0) p.moveTo(px, py); else p.lineTo(px, py);
  }
  for (let i = n; i >= 0; i--) {
    const a = Math.PI + (i / n) * Math.PI, r = 4.2 + (i % 2) * 1.2;
    p.lineTo(x + Math.cos(a) * r * 1.15, y + 2.4 + Math.sin(a) * -r * 0.2 + 1.4);
  }
  p.closePath();
  paint(ctx, p, linear(ctx, 0, y - 2, 0, y + 4, [[0, '#ffffff'], [1, shade(color, -0.15)]]), OUTLINE, 0.8);
}

// Shoulder pads
function drawShoulder(ctx, x, y, color, back) {
  const c = back ? shade(color, -0.25) : shade(color, 0.25);
  ctx.save(); ctx.translate(x, y); ctx.scale(0.75, 0.75); ctx.translate(-x, -y);
  const p = new Path2D();
  p.moveTo(x - 4, y + 2); p.quadraticCurveTo(x - 3.5, y - 3.2, x + 1.5, y - 3); p.quadraticCurveTo(x + 5.5, y - 1.5, x + 4.6, y + 3.5); p.quadraticCurveTo(x, y + 4.6, x - 4, y + 2); p.closePath();
  paint(ctx, p, linear(ctx, 0, y - 3, 0, y + 4, [[0, shade(c, 0.35)], [1, shade(c, -0.25)]]), OUTLINE, 0.9);
  ctx.strokeStyle = rgba('#e2b85c', 0.9); ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(x - 3, y + 1.6); ctx.quadraticCurveTo(x + 0.5, y + 3.4, x + 4, y + 2.6); ctx.stroke();
  ctx.restore();
}

// Hood (covers the hair, leaves the face). ghost: ghost hood with eyes; ears: with ears
function drawHood(ctx, cx, cy, hood) {
  const c = hood.c;
  if (hood.ears) drawEars(ctx, cx, cy - 1, c, true);
  const p = new Path2D();
  p.ellipse(cx - 0.5, cy - 1.2, 12.2, 12.4, 0, 0, Math.PI * 2);
  p.ellipse(cx + 3.2, cy + 3.4, 8.6, 9.4, 0, 0, Math.PI * 2);
  ctx.save();
  ctx.beginPath(); ctx.rect(cx - 20, cy - 20, 40, 31); ctx.clip();
  ctx.fillStyle = linear(ctx, cx - 12, 0, cx + 12, 0, [[0, shade(c, -0.25)], [0.6, c], [1, shade(c, 0.1)]]);
  ctx.fill(p, 'evenodd');
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.stroke(p);
  ctx.restore();
  // hood flap hanging behind the neck
  const d = new Path2D(); d.moveTo(cx - 11.5, cy + 2); d.quadraticCurveTo(cx - 13, cy + 9, cx - 8, cy + 12); d.lineTo(cx - 4, cy + 10.5); d.quadraticCurveTo(cx - 7, cy + 6, cx - 7.5, cy + 2); d.closePath();
  paint(ctx, d, shade(c, -0.2), OUTLINE, 0.8);
  if (hood.ghost) { // two ghost eyes on top of the hood
    paint(ctx, ellipse(cx - 3.4, cy - 8.6, 1.3, 1.8), '#1a2a28', null);
    paint(ctx, ellipse(cx + 2.4, cy - 9.2, 1.3, 1.8), '#1a2a28', null);
    paint(ctx, ellipse(cx - 3.8, cy - 9.3, 0.5, 0.6), '#ffffff', null);
    paint(ctx, ellipse(cx + 2, cy - 9.9, 0.5, 0.6), '#ffffff', null);
    const t = new Path2D(); t.moveTo(cx - 1, cy - 13.4); t.quadraticCurveTo(cx + 3, cy - 18, cx + 0.5, cy - 20); t.quadraticCurveTo(cx + 1, cy - 16, cx - 3.5, cy - 13); t.closePath();
    paint(ctx, t, c, OUTLINE, 0.8);
  }
}

function drawEars(ctx, cx, cy, color, onHood) {
  for (const [ex, tilt, back] of [[cx - 6.5, -0.35, true], [cx + 4.5, 0.25, false]]) {
    ctx.save(); ctx.translate(ex, cy - 9); ctx.rotate(tilt);
    const e = poly([[-3.6, 2], [0, -8.5], [3.6, 2]]);
    paint(ctx, e, back ? shade(color, -0.2) : color, OUTLINE, 0.9);
    paint(ctx, poly([[-1.8, 1], [0, -5.2], [1.8, 1]]), onHood && color === '#ffffff' ? '#ffc8d4' : '#fff1e4', null);
    ctx.restore();
  }
}

// Crown / hairpin
function drawCrown(ctx, cx, cy, cr) {
  const c = cr.c, hl = shade(c, 0.4), dk = shade(c, -0.35);
  if (cr.kind === 'dragon') {
    paint(ctx, rrect(cx - 7, cy - 11.5, 14, 3.4, 1.2), linear(ctx, 0, cy - 12, 0, cy - 8, [[0, hl], [1, dk]]), OUTLINE, 0.9);
    for (const [hx, d] of [[cx - 5, -1], [cx + 5, 1]]) {
      const h = new Path2D(); h.moveTo(hx, cy - 11); h.quadraticCurveTo(hx + d * 3, cy - 15, hx + d * 2, cy - 19); h.quadraticCurveTo(hx + d * 0.5, cy - 15, hx - d * 1.5, cy - 11.4); h.closePath();
      paint(ctx, h, linear(ctx, 0, cy - 19, 0, cy - 11, [[0, hl], [1, c]]), OUTLINE, 0.8);
    }
    paint(ctx, ellipse(cx, cy - 10, 1.6, 1.6), '#e8243a', OUTLINE, 0.6);
  } else if (cr.kind === 'lotus') {
    for (const a of [-1, -0.5, 0, 0.5, 1]) {
      ctx.save(); ctx.translate(cx - 1, cy - 11); ctx.rotate(a);
      paint(ctx, ellipse(0, -3.2, 1.6, 3.4), linear(ctx, 0, -6.6, 0, 0, [[0, hl], [1, c]]), OUTLINE, 0.6);
      ctx.restore();
    }
    paint(ctx, ellipse(cx - 1, cy - 11, 2, 1.2), '#ffd84a', OUTLINE, 0.5);
    ctx.strokeStyle = '#4fb88a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(cx - 6, cy - 10); ctx.quadraticCurveTo(cx - 10, cy - 8, cx - 12, cy - 3); ctx.stroke();
  } else if (cr.kind === 'fairy') {
    // fairy hairpin: ring of pearls on the bun, a peach blossom beside it, a bead string hanging behind the neck
    ctx.strokeStyle = c; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.arc(cx - 0.5, cy - 4, 9.5, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    for (const a of [1.25, 1.5, 1.75]) paint(ctx, ellipse(cx - 0.5 + Math.cos(Math.PI * a) * 9.5, cy - 4 + Math.sin(Math.PI * a) * 9.5, 1.3, 1.3), '#ffffff', shade(c, -0.3), 0.5);
    for (let k = 0; k < 5; k++) { // 5-petal peach blossom
      const a = k * Math.PI * 0.4 - Math.PI / 2;
      paint(ctx, ellipse(cx - 8 + Math.cos(a) * 1.9, cy - 9 + Math.sin(a) * 1.9, 1.5, 1.5), '#ffc4d8', rgba('#d87a9a', 0.8), 0.4);
    }
    paint(ctx, ellipse(cx - 8, cy - 9, 0.9, 0.9), '#ffe27a', null);
    ctx.strokeStyle = rgba(c, 0.9); ctx.lineWidth = 0.5;
    for (const [dx, len] of [[-10, 9], [-11.6, 7]]) {
      ctx.beginPath(); ctx.moveTo(cx + dx + 1.5, cy - 8); ctx.lineTo(cx + dx, cy - 8 + len); ctx.stroke();
      for (let i = 1; i <= 3; i++) paint(ctx, ellipse(cx + dx + 1.5 - 1.5 * i / 3, cy - 8 + len * i / 3, 0.7, 0.7), i === 3 ? '#ffc4d8' : '#ffffff', null);
    }
  } else if (cr.kind === 'phoenix') {
    // phoenix hairpin: golden bird body, long tail feathers sweeping back
    for (let i = 0; i < 3; i++) {
      const f = new Path2D(); f.moveTo(cx - 2, cy - 12); f.quadraticCurveTo(cx - 10 - i * 2, cy - 18 + i * 3, cx - 17 - i * 2, cy - 12 + i * 4);
      f.quadraticCurveTo(cx - 10, cy - 13 + i * 2, cx - 1, cy - 10.5); f.closePath();
      paint(ctx, f, linear(ctx, cx - 17, 0, cx, 0, [[0, '#ff6a2a'], [1, hl]]), OUTLINE, 0.6);
      paint(ctx, ellipse(cx - 15 - i * 2, cy - 12.5 + i * 4, 1.2, 1.2), '#e8243a', null);
    }
    const b = new Path2D(); b.moveTo(cx - 3, cy - 11); b.quadraticCurveTo(cx + 1, cy - 17, cx + 4, cy - 15); b.lineTo(cx + 6.5, cy - 14.4); b.lineTo(cx + 4, cy - 13.4); b.quadraticCurveTo(cx + 2, cy - 10, cx - 3, cy - 11); b.closePath();
    paint(ctx, b, linear(ctx, 0, cy - 17, 0, cy - 10, [[0, hl], [1, c]]), OUTLINE, 0.8);
    paint(ctx, ellipse(cx + 3.6, cy - 14.6, 0.5, 0.5), '#2a0a0a', null);
  }
}

// White mask worn tilted to the side of the head
function drawHalfMask(ctx, cx, cy) {
  ctx.save(); ctx.translate(cx - 8.5, cy - 5); ctx.rotate(-0.45);
  const m = new Path2D(); m.moveTo(-4, -4); m.quadraticCurveTo(0, -6, 4, -4); m.quadraticCurveTo(4.6, 2.5, 0, 5.5); m.quadraticCurveTo(-4.6, 2.5, -4, -4); m.closePath();
  paint(ctx, m, linear(ctx, 0, -6, 0, 5, [[0, '#ffffff'], [1, '#d8d0c4']]), OUTLINE, 0.8);
  paint(ctx, poly([[-2.8, -1], [-0.6, -1.6], [-1, 0.2]]), '#1a0a0e', null);
  paint(ctx, poly([[2.8, -1], [0.6, -1.6], [1, 0.2]]), '#1a0a0e', null);
  ctx.strokeStyle = '#d8243a'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, -2.6); ctx.moveTo(-1.2, 3); ctx.quadraticCurveTo(0, 3.8, 1.2, 3); ctx.stroke();
  ctx.restore();
}

function drawBody(ctx, x, y, look, hemSwing) {
  const robe = look.robe, trim = look.trim;
  const inner = look.inner || shade(robe, -0.38);
  const sw = hemSwing;
  // ankle-length robe, flaring wide at the hem, the flaps swaying with each step
  const p = new Path2D();
  p.moveTo(x - 3.2, y - 1.2);
  p.quadraticCurveTo(x - 6.2, y - 0.6, x - 6, y + 3);
  p.lineTo(x - 5.2, y + 9);
  p.bezierCurveTo(x - 7.5, y + 13, x - 10 - sw * 0.4, y + 18, x - 10.8 - sw, y + 22.6);
  p.quadraticCurveTo(x - 5, y + 23.8, x + 0.5, y + 23.2);
  p.quadraticCurveTo(x + 6, y + 23.8, x + 11.4 + sw, y + 22);
  p.bezierCurveTo(x + 10.4 + sw * 0.4, y + 17.5, x + 8, y + 13, x + 5.6, y + 9);
  p.lineTo(x + 6, y + 3);
  p.quadraticCurveTo(x + 6.2, y - 0.6, x + 3.2, y - 1.2);
  p.closePath();
  paint(ctx, p, linear(ctx, x - 11, 0, x + 11, 0, [[0, shade(robe, -0.2)], [0.55, robe], [1, shade(robe, 0.15)]]), OUTLINE, 1);
  ctx.save(); ctx.clip(p);
  // split front flap showing the inner robe
  const slit = new Path2D();
  slit.moveTo(x + 4.4, y + 9.5); slit.quadraticCurveTo(x + 5.4 + sw * 0.3, y + 16, x + 6.2 + sw, y + 24);
  slit.lineTo(x + 12 + sw, y + 24); slit.lineTo(x + 12, y + 9.5); slit.closePath();
  ctx.fillStyle = linear(ctx, x + 4, 0, x + 12, 0, [[0, inner], [1, shade(inner, 0.15)]]); ctx.fill(slit);
  ctx.strokeStyle = trim; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(x + 4.4, y + 9.5); ctx.quadraticCurveTo(x + 5.4 + sw * 0.3, y + 16, x + 6.2 + sw, y + 24); ctx.stroke();
  // cloth folds
  ctx.strokeStyle = rgba(shade(robe, -0.5), 0.55); ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(x - 2.5, y + 11); ctx.bezierCurveTo(x - 3.2, y + 15, x - 4.5 - sw * 0.4, y + 19, x - 5.2 - sw * 0.6, y + 23); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 0.8, y + 11.5); ctx.quadraticCurveTo(x + 0.6, y + 17, x + 0.4 + sw * 0.3, y + 23); ctx.stroke();
  ctx.strokeStyle = rgba('#ffffff', 0.16); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(x - 5.4, y + 11); ctx.quadraticCurveTo(x - 7.5, y + 17, x - 9 - sw * 0.7, y + 22); ctx.stroke();
  // crossed-collar robe flap
  ctx.fillStyle = '#f4ecdc';
  ctx.beginPath(); ctx.moveTo(x - 2.6, y - 1.5); ctx.lineTo(x + 2.6, y - 1.5); ctx.lineTo(x, y + 3.5); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = trim; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(x - 3.2, y - 1.6); ctx.quadraticCurveTo(x + 0.5, y + 3, x + 5, y + 7.4); ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(x + 3, y - 1.6); ctx.lineTo(x + 0.6, y + 2.2); ctx.stroke();
  // hem trim
  ctx.strokeStyle = trim; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(x - 11 - sw, y + 22.4); ctx.quadraticCurveTo(x - 5, y + 23.6, x + 0.5, y + 23); ctx.quadraticCurveTo(x + 6, y + 23.6, x + 11.6 + sw, y + 21.8); ctx.stroke();
  if (look.pattern) drawPattern(ctx, x, y, look.pattern, sw);
  if (look.apron) {
    ctx.fillStyle = '#4a3424';
    ctx.beginPath(); ctx.moveTo(x - 2.5, y + 5); ctx.lineTo(x + 6, y + 5); ctx.lineTo(x + 8 + sw, y + 22); ctx.lineTo(x - 3.5, y + 23); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // belt + sash ties
  paint(ctx, rrect(x - 6.4, y + 6.8, 12.8, 2.9, 1.2), shade(trim, -0.1), OUTLINE, 0.8);
  const tail = new Path2D();
  tail.moveTo(x + 2.6, y + 9); tail.bezierCurveTo(x + 3.6 + sw * 0.5, y + 13, x + 2.4 + sw * 0.8, y + 16, x + 2.6 + sw, y + 18.5);
  tail.lineTo(x + 4.6 + sw, y + 18.2); tail.bezierCurveTo(x + 4.4 + sw * 0.8, y + 15.5, x + 5.6 + sw * 0.5, y + 12.5, x + 4.6, y + 9); tail.closePath();
  paint(ctx, tail, trim, OUTLINE, 0.7);
  paint(ctx, ellipse(x + 3.7, y + 8.3, 1.6, 1.4), shade(trim, 0.2), OUTLINE, 0.7);
}

export function drawHumanoid(ctx, look, f) {
  const P = POSES[f];
  const b = P.bob, l = P.lean;
  const skin = look.skin || '#f8d8bc';
  const pants = look.pants || '#2a2a33', boot = shade(pants, -0.35);
  const robe = look.robe, trim = look.trim;
  const hipY = 41 + b;
  const bodyX = 24.5 + l * 0.6, bodyY = 27.5 + b;
  const hcx = 25 + l, hcy = 16.6 + b;
  const iris = look.eye || '#5a3424';
  ctx.translate(SIDE, TOP);
  // shadow under the feet
  ctx.fillStyle = rgba('#000000', 0.28);
  ctx.beginPath(); ctx.ellipse(24.5, HUM_FEET - TOP + 0.4, 9, 1.8, 0, 0, Math.PI * 2); ctx.fill();
  const sw = (P.lf - P.lb) * 1.2;
  // outfit parts behind the body: cape, silk sash, tail
  if (look.cape) drawCape(ctx, bodyX, bodyY, look.cape, sw);
  if (look.sash) drawSash(ctx, bodyX, bodyY, look.sash, sw, b);
  if (look.tail) drawTail(ctx, bodyX, bodyY + 4, look.tail, sw);
  // back hair + back arm + legs
  if (!look.hood) drawBackHair(ctx, look.hairStyle, look.hair, hcx, hcy);
  drawArm(ctx, bodyX - 3.6, bodyY + 1.2, P.b1, P.b2, robe, trim, skin, true);
  if (look.shoulder) drawShoulder(ctx, bodyX - 3.6, bodyY + 1.4, look.shoulder, true);
  drawLeg(ctx, 22.3 + l * 0.3, hipY, P.lb, shade(pants, -0.15), boot, P.fold);
  drawLeg(ctx, 26.6 + l * 0.3, hipY, P.lf, pants, boot, P.fold);
  // torso
  drawBody(ctx, bodyX, bodyY, look, sw);
  if (look.fur) drawFur(ctx, bodyX + 0.5, bodyY - 1, look.fur);
  // front arm + weapon: drawn behind the head when raised high, otherwise in front of the body
  const sx = bodyX + 3.4, sy = bodyY + 1.2;
  const armUp = P.a1 < -1.2;
  const frontArm = () => {
    const J = armJoints(sx, sy, P.a1, P.a2);
    // sword/darts are drawn behind the hand so the hand grips the hilt; same for the staff
    if (look.weapon) drawWeapon(ctx, look.weapon, look.weaponColor || '#c9ced6', J.hx, J.hy, look.weapon === 'staff' ? P.sd : P.wd);
    drawArm(ctx, sx, sy, P.a1, P.a2, robe, trim, skin, false);
    if (look.shoulder) drawShoulder(ctx, sx + 0.8, sy - 1.2, look.shoulder, false);
    // thumb wrapped over the grip
    paint(ctx, ellipse(J.hx + 0.6, J.hy - 0.9, 0.9, 0.8), skin, OUTLINE, 0.6);
  };
  if (armUp) frontArm();
  // chin shadow on the collar (no separate neck, to keep it simple)
  ctx.fillStyle = rgba('#000000', 0.18);
  ctx.beginPath(); ctx.ellipse(hcx + 1.5, hcy + 9.6, 5, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  const face = faceShape(hcx, hcy);
  paint(ctx, face, radial(ctx, hcx + 2, hcy - 1, 2, 12, [[0, shade(skin, 0.08)], [1, skin]]), OUTLINE, 1.05);
  shadeIn(ctx, face, ellipse(hcx - 9, hcy + 2, 4, 9), rgba(shade(skin, -0.4), 0.25));
  // rosy cheeks
  for (const [bx, r] of [[hcx - 3.6, 2.6], [hcx + 8, 2.2]]) {
    ctx.fillStyle = radial(ctx, bx, hcy + 5.2, 0.2, r, [[0, 'rgba(255,125,140,0.6)'], [1, 'rgba(255,125,140,0)']]);
    ctx.fillRect(bx - r, hcy + 5.2 - r, r * 2, r * 2);
  }
  // eyes, eyebrows, mouth
  const ey = hcy + 1.4;
  drawEye(ctx, hcx - 2.4, ey, 0.86, iris, P.eye);
  drawEye(ctx, hcx + 4.8, ey, 1, iris, P.eye);
  ctx.strokeStyle = shade(look.hair, -0.1); ctx.lineWidth = 0.75;
  const browY = P.eye === 'focus' ? ey - 4.3 : ey - 5.3;
  const knit = P.eye === 'focus' ? 0.8 : 0;
  ctx.beginPath(); ctx.moveTo(hcx - 4.4, browY + 0.3); ctx.quadraticCurveTo(hcx - 2.6, browY - 0.5, hcx - 0.8, browY + knit); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(hcx + 2.8, browY + knit); ctx.quadraticCurveTo(hcx + 4.8, browY - 0.6, hcx + 7, browY + 0.2); ctx.stroke();
  ctx.strokeStyle = shade(skin, -0.5); ctx.lineWidth = 0.7;
  ctx.beginPath();
  if (P.eye === 'hurt') { ctx.ellipse(hcx + 3.3, hcy + 6.8, 0.9, 1.1, 0, 0, Math.PI * 2); ctx.fillStyle = '#8a2a32'; ctx.fill(); }
  else if (P.eye === 'focus') { ctx.moveTo(hcx + 2.4, hcy + 6.8); ctx.lineTo(hcx + 4.2, hcy + 6.6); ctx.stroke(); }
  else { ctx.moveTo(hcx + 2.3, hcy + 6.3); ctx.quadraticCurveTo(hcx + 3.3, hcy + 7.3, hcx + 4.3, hcy + 6.3); ctx.stroke(); }
  // tiny nose
  ctx.fillStyle = rgba(shade(skin, -0.4), 0.5); ctx.beginPath(); ctx.ellipse(hcx + 6.2, hcy + 4.2, 0.35, 0.25, 0, 0, Math.PI * 2); ctx.fill();
  if (look.hairStyle === 2) { // face mask
    const m = new Path2D();
    m.moveTo(hcx - 5, hcy + 3.2); m.quadraticCurveTo(hcx + 3, hcy + 2.4, hcx + 9.9, hcy + 2.6);
    m.bezierCurveTo(hcx + 9.8, hcy + 6, hcx + 6.5, hcy + 9.4, hcx + 2.4, hcy + 9.6); m.quadraticCurveTo(hcx - 3, hcy + 9.4, hcx - 5, hcy + 3.2); m.closePath();
    paint(ctx, m, linear(ctx, 0, hcy + 2, 0, hcy + 10, [[0, shade(look.hair, 0.2)], [1, look.hair]]), OUTLINE, 0.9);
  }
  if (look.beard) {
    const bd = new Path2D();
    bd.moveTo(hcx - 2, hcy + 5); bd.quadraticCurveTo(hcx + 4, hcy + 4.5, hcx + 9, hcy + 4);
    bd.quadraticCurveTo(hcx + 8, hcy + 12, hcx + 4, hcy + 17); bd.quadraticCurveTo(hcx + 2, hcy + 12, hcx - 2, hcy + 5); bd.closePath();
    paint(ctx, bd, linear(ctx, 0, hcy + 4, 0, hcy + 17, [[0, look.hair], [1, shade(look.hair, -0.15)]]), OUTLINE, 0.9);
    ctx.strokeStyle = shade(look.hair, -0.1); ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(hcx + 1, hcy + 4.5); ctx.quadraticCurveTo(hcx + 3.5, hcy + 3.8, hcx + 6, hcy + 4.6); ctx.stroke();
  }
  if (look.halfmask) drawHalfMask(ctx, hcx, hcy);
  if (look.hood) drawHood(ctx, hcx, hcy, look.hood);
  else {
    drawFrontHair(ctx, look.hairStyle, look.hair, hcx, hcy);
    if (look.ears) drawEars(ctx, hcx, hcy, look.ears, false);
  }
  if (look.crown) drawCrown(ctx, hcx, hcy, look.crown);
  else if (look.hat && !look.hood) drawHat(ctx, look.hat, look.hatColor || '#2a2a3a', hcx, hcy);
  if (!armUp) frontArm();
}

const humCache = new Map();
export function humanoidSheet(look) {
  const key = JSON.stringify(look);
  if (!humCache.has(key)) humCache.set(key, makeSheet(HUM_W, HUM_H, POSES.length, (ctx, i) => drawHumanoid(ctx, look, i), HUM_FRAMES));
  return humCache.get(key);
}
