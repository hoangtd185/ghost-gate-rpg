// Basic physics shared by the browser game and the server: gravity + one-way platforms. No drawing here.
import { GROUND_Y } from '../data/maps.js';
import { GAME } from '../config.js';
import { clamp } from '../engine/util.js';

export const GRAVITY = GAME.physics.gravity;

export function stepBody(b, dt, platforms, mapW) {
  b.vy = Math.min(b.vy + GRAVITY * dt * (b.floaty ? 0 : 1), 640);
  b.x = clamp(b.x + b.vx * dt, 0, mapW - b.w);
  const prevBottom = b.y + b.h;
  b.y += b.vy * dt;
  b.onGround = false;
  if (b.dropTimer > 0) b.dropTimer -= dt;
  if (b.vy >= 0) {
    const bottom = b.y + b.h;
    if (bottom >= GROUND_Y) {
      b.y = GROUND_Y - b.h; b.vy = 0; b.onGround = true; b.standY = GROUND_Y; b.plat = null;
      return;
    }
    if (b.dropTimer > 0) return;
    for (const p of platforms) {
      if (prevBottom <= p.y + 1 && bottom >= p.y && b.x + b.w > p.x + 3 && b.x < p.x + p.w - 3) {
        b.y = p.y - b.h; b.vy = 0; b.onGround = true; b.standY = p.y; b.plat = p;
        return;
      }
    }
  }
}

export function platformAt(platforms, x, y) {
  if (y >= GROUND_Y) return null;
  return platforms.find((p) => Math.abs(p.y - y) < 2 && x >= p.x && x <= p.x + p.w) || null;
}
