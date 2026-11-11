// Humanoid characters (player, bots, NPCs): drawn with curves, with outlines and shading.
// Chibi proportions: big head, big anime eyes, wide-sleeved crossed-collar robe. Facing right.
import { makeSheet, shade, rgba, paint, shadeIn, ellipse, rrect, radial, linear, OUTLINE } from './draw.js';
import { HUM_W, HUM_H, HUM_FEET, SIDE, TOP, POSES, HUM_FRAMES } from './humanoid/frames.js';
import { drawLeg, armJoints, drawArm, drawWeapon, faceShape, drawEye, drawBackHair, drawFrontHair, drawHat } from './humanoid/parts.js';
import { drawCape, drawTail, drawSash, drawPattern, drawFur, drawShoulder, drawHood, drawEars, drawCrown, drawHalfMask } from './humanoid/outfit.js';
export { HUM_W, HUM_H, HUM_FEET, HUM_FRAMES, capeAnchor } from './humanoid/frames.js';

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
  // upper body pitched forward around the hips (run); legs stay upright
  const pitch = () => { if (P.tilt) { ctx.translate(bodyX, hipY); ctx.rotate(P.tilt); ctx.translate(-bodyX, -hipY); } };
  ctx.save(); pitch();
  if (!look.hood) drawBackHair(ctx, look.hairStyle, look.hair, hcx, hcy);
  drawArm(ctx, bodyX - 3.6, bodyY + 1.2, P.b1, P.b2, robe, trim, skin, true);
  if (look.shoulder) drawShoulder(ctx, bodyX - 3.6, bodyY + 1.4, look.shoulder, true);
  ctx.restore();
  drawLeg(ctx, 22.3 + l * 0.3, hipY, P.lb, shade(pants, -0.15), boot, P.fold);
  drawLeg(ctx, 26.6 + l * 0.3, hipY, P.lf, pants, boot, P.fold);
  ctx.save(); pitch();
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
  ctx.restore();
}

const humCache = new Map();

export function humanoidSheet(look) {
  const key = JSON.stringify(look);
  if (!humCache.has(key)) humCache.set(key, makeSheet(HUM_W, HUM_H, POSES.length, (ctx, i) => drawHumanoid(ctx, look, i), HUM_FRAMES));
  return humCache.get(key);
}
