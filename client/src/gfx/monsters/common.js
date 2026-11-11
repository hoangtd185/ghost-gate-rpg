// Helpers shared by the monster sprites
import { makeSheet, rgba, paint, ellipse, radial } from '../draw.js';

export function withHurt(fw, fh, n, draw, frames) {
  return makeSheet(fw, fh, n + 1, (ctx, i) => {
    if (i < n) return draw(ctx, i);
    draw(ctx, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(0, 0, fw, fh);
  }, { ...frames, hurt: [n] });
}

// Shared cute eyes: big dark iris + 2 highlights
export function cuteEye(ctx, x, y, rx, ry, color = '#1a0e14', glow) {
  if (glow) { ctx.fillStyle = radial(ctx, x, y, 0, rx * 2.6, [[0, rgba(glow, 0.55)], [1, rgba(glow, 0)]]); ctx.fillRect(x - rx * 3, y - ry * 3, rx * 6, ry * 6); }
  paint(ctx, ellipse(x, y, rx, ry), color, null);
  paint(ctx, ellipse(x - rx * 0.35, y - ry * 0.4, rx * 0.42, ry * 0.32), '#ffffff', null);
  paint(ctx, ellipse(x + rx * 0.3, y + ry * 0.45, rx * 0.2, ry * 0.15), rgba('#ffffff', 0.8), null);
}
