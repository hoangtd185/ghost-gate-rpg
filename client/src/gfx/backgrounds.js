// Draws layered (parallax) backgrounds plus ground/platforms for each map
import { seeded } from '../../../shared/util.js';
import { GROUND_Y } from '../../../shared/data/maps.js';
import { bgCanvas, VIEW_H, THEMES } from './backgrounds/theme.js';
import { drawSky, drawFar, drawMid } from './backgrounds/scenery.js';
import { drawPlatform, drawDecor } from './backgrounds/ground.js';
export { BG_S, VIEW_W, VIEW_H, drawLayer, themeOf } from './backgrounds/theme.js';

export function buildMapGraphics(map) {
  const t = THEMES[map.theme];
  const rnd = seeded(map.width * 7 + map.theme.length * 131);
  const sky = drawSky(t, rnd);
  const far = drawFar(map, t, rnd);
  const mid = drawMid(map, t, rnd);
  const { c, ctx } = bgCanvas(map.width, VIEW_H);
  drawDecor(ctx, map, rnd);
  drawPlatform(ctx, { x: 0, y: GROUND_Y, w: map.width }, t, rnd, true);
  for (const p of map.platforms) drawPlatform(ctx, p, t, rnd, false);
  return { sky, far, mid, fg: c, theme: t };
}

export function drawPortal(ctx, x, y, time, color = '#8af0ff') {
  const pulse = Math.sin(time * 4) * 0.15 + 0.85;
  const g = ctx.createRadialGradient(x, y - 22, 2, x, y - 22, 30);
  g.addColorStop(0, `rgba(220,255,255,${0.8 * pulse})`); g.addColorStop(0.5, color + '88'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 30, y - 56, 60, 60);
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.ellipse(x, y - 22, 10 + i * 4, 22 + i * 3, 0, time * (2 + i) + i, time * (2 + i) + i + 4); ctx.stroke();
  }
}
