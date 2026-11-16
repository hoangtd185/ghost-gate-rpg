// Pet sprites (shared/data/pets.js): the imp, a small white ghost with a curly tail, two tiny horns and a red bow,
// and the fox kit, a round three-tailed fox cub. Frames: 4 floating, 2 happy (after a pickup).
import { makeSheet, shade, rgba, paint, ellipse, poly, radial, linear, OUTLINE } from './draw.js';

export const PET_FRAMES = { float: [0, 1, 2, 3], happy: [4, 5] };

// Big cute eyes (or happy arcs), rosy cheeks and a small mouth, shared by every pet
function petFace(ctx, cx, cy, happy, gap, iris) {
  if (happy) {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.1;
    for (const x of [cx - gap, cx + gap]) { ctx.beginPath(); ctx.moveTo(x - 1.8, cy + 0.6); ctx.quadraticCurveTo(x, cy - 1.8, x + 1.8, cy + 0.6); ctx.stroke(); }
  } else {
    for (const x of [cx - gap, cx + gap]) {
      paint(ctx, ellipse(x, cy, 1.9, 2.5), iris, null);
      paint(ctx, ellipse(x - 0.6, cy - 0.9, 0.75, 0.85), '#ffffff', null);
      paint(ctx, ellipse(x + 0.6, cy + 1.1, 0.35, 0.35), rgba('#ffffff', 0.85), null);
    }
  }
  ctx.fillStyle = 'rgba(255,140,170,0.55)';
  ctx.beginPath(); ctx.ellipse(cx - gap - 2.7, cy + 3, 1.8, 1, 0, 0, 7); ctx.ellipse(cx + gap + 2.7, cy + 3, 1.8, 1, 0, 0, 7); ctx.fill();
  const m = new Path2D();
  if (happy) { m.moveTo(cx - 1.6, cy + 3); m.quadraticCurveTo(cx, cy + 6, cx + 1.6, cy + 3); m.closePath(); paint(ctx, m, '#c0405a', OUTLINE, 0.6); }
  else { ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(cx - 1, cy + 3.4); ctx.quadraticCurveTo(cx, cy + 4.4, cx + 1, cy + 3.4); ctx.stroke(); }
}

function drawImp(ctx, f) {
  const happy = f >= 4;
  const k = f % 4;
  const sw = [0, 1.2, 0, -1.2][k];
  const cx = 16, cy = 13;
  // soft glow
  ctx.fillStyle = radial(ctx, cx, cy + 2, 2, 15, [[0, 'rgba(220,210,255,0.45)'], [1, 'rgba(200,180,255,0)']]);
  ctx.fillRect(0, 0, 32, 32);
  // body: round head tapering into a curly tail
  const body = new Path2D();
  body.moveTo(cx - 9, cy);
  body.bezierCurveTo(cx - 9.5, cy - 11, cx + 9.5, cy - 11, cx + 9, cy);
  body.bezierCurveTo(cx + 9, cy + 6, cx + 5, cy + 9, cx + 1 + sw, cy + 12);
  body.bezierCurveTo(cx - 1 + sw, cy + 14, cx - 6 + sw * 1.5, cy + 17, cx - 9 + sw * 1.5, cy + 14.5);
  body.bezierCurveTo(cx - 6 + sw, cy + 14, cx - 4, cy + 11.5, cx - 6, cy + 8.5);
  body.bezierCurveTo(cx - 8.5, cy + 6, cx - 9, cy + 3, cx - 9, cy);
  body.closePath();
  paint(ctx, body, radial(ctx, cx - 2, cy - 4, 1, 16, [[0, '#ffffff'], [0.6, '#f0ecff'], [1, '#c8bce8']]), OUTLINE, 1);
  // two tiny horns
  for (const [x, d] of [[cx - 4.5, -1], [cx + 4.5, 1]]) {
    paint(ctx, poly([[x - 1.8, cy - 7.6], [x + d * 1.2, cy - 12.2], [x + 1.8, cy - 7.4]]), linear(ctx, 0, cy - 12, 0, cy - 7, [[0, '#ffb0c8'], [1, '#ff7aa0']]), OUTLINE, 0.8);
  }
  // little hands
  paint(ctx, ellipse(cx - 9, cy + 3 - sw * 0.4, 2, 1.5, -0.5), '#f4f0ff', OUTLINE, 0.8);
  paint(ctx, ellipse(cx + 9.2, cy + 2.6 + sw * 0.4, 2, 1.5, 0.5), '#f4f0ff', OUTLINE, 0.8);
  petFace(ctx, cx, cy, happy, 3.5, '#2a1630');
  // red bow on the head
  const bx = cx + 6.5, by = cy - 7.5;
  paint(ctx, poly([[bx, by], [bx - 3.2, by - 2.4], [bx - 3, by + 2]]), '#e8404a', OUTLINE, 0.7);
  paint(ctx, poly([[bx, by], [bx + 3.2, by - 2], [bx + 2.8, by + 2.4]]), '#e8404a', OUTLINE, 0.7);
  paint(ctx, ellipse(bx, by, 1, 1), '#ffb0b8', OUTLINE, 0.6);
}

// Fox kit: a round head with big ears, a small body with a cream bib, and three fluffy tails with white tips
function drawFoxKit(ctx, f) {
  const happy = f >= 4;
  const k = f % 4;
  const sw = [0, 1, 0, -1][k];
  const fur = '#f59a48', furD = '#cf6a22', cream = '#fff3e2';
  const cx = 17.5, cy = 12.5;
  // warm glow
  ctx.fillStyle = radial(ctx, 16, 17, 2, 15, [[0, 'rgba(255,214,150,0.42)'], [1, 'rgba(255,190,110,0)']]);
  ctx.fillRect(0, 0, 32, 32);
  // three tails behind the body, fanned and swaying
  const tail = (ang, len) => {
    const bx = 11.5, by = 22.5, dx = Math.cos(ang), dy = -Math.sin(ang), nx = -dy, ny = dx, w = 3.1;
    const at = (t, o) => [bx + dx * len * t + nx * o, by + dy * len * t + ny * o];
    const p = new Path2D();
    p.moveTo(...at(0, -w * 0.3));
    p.bezierCurveTo(...at(0.3, -w * 1.1), ...at(0.95, -w), ...at(1, 0));
    p.bezierCurveTo(...at(1, w * 0.9), ...at(0.35, w * 1.05), ...at(0, w * 0.3));
    p.closePath();
    paint(ctx, p, linear(ctx, bx, by, ...at(1, 0), [[0, furD], [0.45, fur], [0.72, shade(fur, 0.15)], [0.84, '#ffffff'], [1, '#ffffff']]), OUTLINE, 0.8);
  };
  tail(3.5 + sw * 0.07, 9.5); tail(2.05 + sw * 0.09, 10); tail(2.78 + sw * 0.08, 11.5);
  // body with a cream bib, tiny paws
  const body = ellipse(16.5, 22.5, 6.2, 5.2);
  paint(ctx, body, linear(ctx, 0, 17, 0, 28, [[0, fur], [1, furD]]), OUTLINE, 0.9);
  ctx.save(); ctx.clip(body); paint(ctx, ellipse(18.2, 24.4, 3.6, 3.6), cream, null); ctx.restore();
  for (const [x, d] of [[13.4, -1], [20.2, 1]]) paint(ctx, ellipse(x, 27.2 + (happy ? -0.8 : sw * d * 0.3), 1.9, 1.5), cream, OUTLINE, 0.7);
  // ears
  for (const d of [-1, 1]) {
    const ex = cx + d * 5.6, ey = cy - 5.2;
    paint(ctx, poly([[ex - 3, ey + 2.2], [ex + d * 1.6, ey - 6.4], [ex + 3, ey + 2.4]]), fur, OUTLINE, 0.9);
    paint(ctx, poly([[ex - 1.5, ey + 1.6], [ex + d * 1.1, ey - 3.8], [ex + 1.6, ey + 1.8]]), '#ffd0c0', null);
  }
  // head: wide and round, cream muzzle
  const head = new Path2D();
  head.moveTo(cx - 9.4, cy + 0.6);
  head.bezierCurveTo(cx - 9.8, cy - 9.4, cx + 9.8, cy - 9.4, cx + 9.4, cy + 0.6);
  head.bezierCurveTo(cx + 9.2, cy + 5.6, cx + 4.5, cy + 7.6, cx, cy + 7.6);
  head.bezierCurveTo(cx - 4.5, cy + 7.6, cx - 9.2, cy + 5.6, cx - 9.4, cy + 0.6);
  head.closePath();
  paint(ctx, head, radial(ctx, cx - 2, cy - 4, 1, 15, [[0, shade(fur, 0.2)], [0.7, fur], [1, furD]]), OUTLINE, 1);
  ctx.save(); ctx.clip(head);
  paint(ctx, ellipse(cx, cy + 6.2, 6.4, 4.6), cream, null);
  paint(ctx, ellipse(cx - 9.5, cy + 4.5, 3.4, 3), cream, null); paint(ctx, ellipse(cx + 9.5, cy + 4.5, 3.4, 3), cream, null);
  ctx.restore();
  petFace(ctx, cx, cy + 0.6, happy, 3.9, '#3a1a10');
  paint(ctx, ellipse(cx, cy + 2.9, 0.9, 0.65), '#5a2a1a', null); // nose
  // a small flame mark on the forehead
  paint(ctx, poly([[cx - 1.2, cy - 3.6], [cx, cy - 6.4], [cx + 1.2, cy - 3.6]]), '#ff5a3a', null);
}

const PET_DRAW = { imp: drawImp, fox_kit: drawFoxKit };
const petCache = {};
export function petSheet(id = 'imp') {
  const key = PET_DRAW[id] ? id : 'imp';
  if (!petCache[key]) petCache[key] = makeSheet(32, 32, 6, (ctx, i) => PET_DRAW[key](ctx, i), PET_FRAMES);
  return petCache[key];
}
