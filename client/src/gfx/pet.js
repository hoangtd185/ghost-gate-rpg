// Pet Tiểu Quỷ: con ma nhỏ màu trắng, đuôi xoắn, hai sừng con, nơ đỏ
import { makeSheet, rgba, paint, ellipse, rrect, poly, radial, linear, OUTLINE } from './draw.js';

export const PET_FRAMES = { float: [0, 1, 2, 3], happy: [4, 5] };

function drawPet(ctx, f) {
  const happy = f >= 4;
  const k = f % 4;
  const sw = [0, 1.2, 0, -1.2][k];
  const cx = 16, cy = 13;
  // hào quang mờ
  ctx.fillStyle = radial(ctx, cx, cy + 2, 2, 15, [[0, 'rgba(220,210,255,0.45)'], [1, 'rgba(200,180,255,0)']]);
  ctx.fillRect(0, 0, 32, 32);
  // thân: đầu tròn thuôn dần thành đuôi xoắn
  const body = new Path2D();
  body.moveTo(cx - 9, cy);
  body.bezierCurveTo(cx - 9.5, cy - 11, cx + 9.5, cy - 11, cx + 9, cy);
  body.bezierCurveTo(cx + 9, cy + 6, cx + 5, cy + 9, cx + 1 + sw, cy + 12);
  body.bezierCurveTo(cx - 1 + sw, cy + 14, cx - 6 + sw * 1.5, cy + 17, cx - 9 + sw * 1.5, cy + 14.5);
  body.bezierCurveTo(cx - 6 + sw, cy + 14, cx - 4, cy + 11.5, cx - 6, cy + 8.5);
  body.bezierCurveTo(cx - 8.5, cy + 6, cx - 9, cy + 3, cx - 9, cy);
  body.closePath();
  paint(ctx, body, radial(ctx, cx - 2, cy - 4, 1, 16, [[0, '#ffffff'], [0.6, '#f0ecff'], [1, '#c8bce8']]), OUTLINE, 1);
  // hai sừng con
  for (const [x, d] of [[cx - 4.5, -1], [cx + 4.5, 1]]) {
    paint(ctx, poly([[x - 1.8, cy - 7.6], [x + d * 1.2, cy - 12.2], [x + 1.8, cy - 7.4]]), linear(ctx, 0, cy - 12, 0, cy - 7, [[0, '#ffb0c8'], [1, '#ff7aa0']]), OUTLINE, 0.8);
  }
  // tay con
  paint(ctx, ellipse(cx - 9, cy + 3 - sw * 0.4, 2, 1.5, -0.5), '#f4f0ff', OUTLINE, 0.8);
  paint(ctx, ellipse(cx + 9.2, cy + 2.6 + sw * 0.4, 2, 1.5, 0.5), '#f4f0ff', OUTLINE, 0.8);
  // mắt
  if (happy) {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.1;
    for (const x of [cx - 3.5, cx + 3.5]) { ctx.beginPath(); ctx.moveTo(x - 1.8, cy + 0.6); ctx.quadraticCurveTo(x, cy - 1.8, x + 1.8, cy + 0.6); ctx.stroke(); }
  } else {
    for (const x of [cx - 3.5, cx + 3.5]) {
      paint(ctx, ellipse(x, cy, 1.9, 2.5), '#2a1630', null);
      paint(ctx, ellipse(x - 0.6, cy - 0.9, 0.75, 0.85), '#ffffff', null);
      paint(ctx, ellipse(x + 0.6, cy + 1.1, 0.35, 0.35), rgba('#ffffff', 0.85), null);
    }
  }
  // má hồng + miệng
  ctx.fillStyle = 'rgba(255,140,170,0.55)';
  ctx.beginPath(); ctx.ellipse(cx - 6.2, cy + 3, 1.8, 1, 0, 0, 7); ctx.ellipse(cx + 6.2, cy + 3, 1.8, 1, 0, 0, 7); ctx.fill();
  const m = new Path2D();
  if (happy) { m.moveTo(cx - 1.6, cy + 3); m.quadraticCurveTo(cx, cy + 6, cx + 1.6, cy + 3); m.closePath(); paint(ctx, m, '#c0405a', OUTLINE, 0.6); }
  else { ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(cx - 1, cy + 3.4); ctx.quadraticCurveTo(cx, cy + 4.4, cx + 1, cy + 3.4); ctx.stroke(); }
  // nơ đỏ trên đầu
  const bx = cx + 6.5, by = cy - 7.5;
  paint(ctx, poly([[bx, by], [bx - 3.2, by - 2.4], [bx - 3, by + 2]]), '#e8404a', OUTLINE, 0.7);
  paint(ctx, poly([[bx, by], [bx + 3.2, by - 2], [bx + 2.8, by + 2.4]]), '#e8404a', OUTLINE, 0.7);
  paint(ctx, ellipse(bx, by, 1, 1), '#ffb0b8', OUTLINE, 0.6);
}

let petCache = null;
export function petSheet() {
  if (!petCache) petCache = makeSheet(32, 32, 6, (ctx, i) => drawPet(ctx, i), PET_FRAMES);
  return petCache;
}
