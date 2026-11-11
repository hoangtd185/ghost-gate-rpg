// Humanoid outfit details: cape, tail, sash, robe patterns, fur, shoulders, hood, ears, crown, half mask
import { shade, rgba, paint, ellipse, rrect, poly, linear, OUTLINE } from '../draw.js';

// ---------------- outfit details ----------------
// Cape on the back, flowing backward while running
export function drawCape(ctx, x, y, cape, sw) {
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
export function drawTail(ctx, x, y, color, sw) {
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
export function drawSash(ctx, x, y, color, sw, t) {
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
export function drawPattern(ctx, x, y, pat, sw) {
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
export function drawFur(ctx, x, y, color) {
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
export function drawShoulder(ctx, x, y, color, back) {
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
export function drawHood(ctx, cx, cy, hood) {
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

export function drawEars(ctx, cx, cy, color, onHood) {
  for (const [ex, tilt, back] of [[cx - 6.5, -0.35, true], [cx + 4.5, 0.25, false]]) {
    ctx.save(); ctx.translate(ex, cy - 9); ctx.rotate(tilt);
    const e = poly([[-3.6, 2], [0, -8.5], [3.6, 2]]);
    paint(ctx, e, back ? shade(color, -0.2) : color, OUTLINE, 0.9);
    paint(ctx, poly([[-1.8, 1], [0, -5.2], [1.8, 1]]), onHood && color === '#ffffff' ? '#ffc8d4' : '#fff1e4', null);
    ctx.restore();
  }
}

// Crown / hairpin
export function drawCrown(ctx, cx, cy, cr) {
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
export function drawHalfMask(ctx, cx, cy) {
  ctx.save(); ctx.translate(cx - 8.5, cy - 5); ctx.rotate(-0.45);
  const m = new Path2D(); m.moveTo(-4, -4); m.quadraticCurveTo(0, -6, 4, -4); m.quadraticCurveTo(4.6, 2.5, 0, 5.5); m.quadraticCurveTo(-4.6, 2.5, -4, -4); m.closePath();
  paint(ctx, m, linear(ctx, 0, -6, 0, 5, [[0, '#ffffff'], [1, '#d8d0c4']]), OUTLINE, 0.8);
  paint(ctx, poly([[-2.8, -1], [-0.6, -1.6], [-1, 0.2]]), '#1a0a0e', null);
  paint(ctx, poly([[2.8, -1], [0.6, -1.6], [1, 0.2]]), '#1a0a0e', null);
  ctx.strokeStyle = '#d8243a'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, -2.6); ctx.moveTo(-1.2, 3); ctx.quadraticCurveTo(0, 3.8, 1.2, 3); ctx.stroke();
  ctx.restore();
}
