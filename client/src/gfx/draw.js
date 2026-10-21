// Shared drawing tools. Every shape is drawn with curves at high resolution (SS times),
// cached as an image, then scaled down on screen so it looks smooth instead of pixelated.
export const SS = 3;          // sharpness of characters, monsters and icons
export const OUTLINE = '#22141c';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w); c.height = Math.ceil(h);
  const ctx = c.getContext('2d');
  return { c, ctx };
}

// Canvas with logical size w×h but actually s times larger
export function makeHi(w, h, s = SS) {
  const { c, ctx } = makeCanvas(w * s, h * s);
  ctx.scale(s, s);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  return { c, ctx, w, h, s };
}

// Darken (amt < 0) or lighten (amt > 0) a hex color
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1, 7), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

export function rgba(hex, a) {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Fill + stroke a path. fill can be a color or a gradient.
export function paint(ctx, path, fill, line = OUTLINE, lw = 1) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(path); }
  if (line) { ctx.strokeStyle = line; ctx.lineWidth = lw; ctx.stroke(path); }
}

// Inner shadow/highlight for a path (cel shading): draws shape `inner` clipped to `path`
export function shadeIn(ctx, path, inner, color) {
  ctx.save();
  ctx.clip(path);
  ctx.fillStyle = color;
  ctx.fill(inner);
  ctx.restore();
}

export function ellipse(cx, cy, rx, ry, rot = 0) {
  const p = new Path2D();
  p.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
  return p;
}

export function rrect(x, y, w, h, r) {
  const p = new Path2D();
  p.roundRect(x, y, w, h, r);
  return p;
}

// Path from a list of points, optionally smoothed with quadratics through the midpoints
export function poly(pts, smooth = false, close = true) {
  const p = new Path2D();
  if (!smooth) {
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
  } else {
    const n = pts.length;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const start = close ? mid(pts[n - 1], pts[0]) : pts[0];
    p.moveTo(start[0], start[1]);
    for (let i = close ? 0 : 1; i < (close ? n : n - 1); i++) {
      const m = mid(pts[i], pts[(i + 1) % n]);
      p.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
    }
    if (!close) p.lineTo(pts[n - 1][0], pts[n - 1][1]);
  }
  if (close) p.closePath();
  return p;
}

export function radial(ctx, x, y, r0, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

export function linear(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

// A sprite sheet: frames laid out horizontally, each fw×fh logical units
export function makeSheet(fw, fh, count, drawFn, frames) {
  const { c, ctx } = makeHi(fw * count, fh);
  for (let i = 0; i < count; i++) {
    ctx.save();
    ctx.translate(i * fw, 0);
    ctx.beginPath(); ctx.rect(0, 0, fw, fh); ctx.clip();
    drawFn(ctx, i);
    ctx.restore();
  }
  return { img: c, fw, fh, s: SS, frames };
}

// Draws one frame of the sheet at (dx, dy) in logical units, optionally flipped
export function drawFrame(ctx, sheet, f, dx, dy, flip = false) {
  const { img, fw, fh, s } = sheet;
  if (flip) {
    ctx.save();
    ctx.translate(dx + fw, dy); ctx.scale(-1, 1);
    ctx.drawImage(img, f * fw * s, 0, fw * s, fh * s, 0, 0, fw, fh);
    ctx.restore();
  } else {
    ctx.drawImage(img, f * fw * s, 0, fw * s, fh * s, dx, dy, fw, fh);
  }
}
