// Imp pet: follows the player and flies over to pick up drops in range
import { petSheet } from '../gfx/pet.js';
import { drawFrame } from '../gfx/draw.js';
import { pick, rand } from '../engine/util.js';
import { GAME } from '../config.js';

export const PET_NAME = 'Tiểu Quỷ';
const PICK_RANGE = GAME.pet.pickRange; // pickup range, measured from the player
const FLY_SPEED = GAME.pet.flySpeed;
const PET_LINES = ['Để em nhặt cho!', 'Của chủ nhân nè~', 'Hihi, lấp lánh quá', 'Đồ rơi kìa!', 'Em giỏi không?'];

export class Pet {
  constructor(world) {
    this.w = world;
    this.sheet = petSheet();
    this.t = 0; this.happyT = 0; this.facing = 1;
    this.target = null; this.say = null; this.chatT = rand(20, 40);
    this.warp();
  }

  // Place the pet next to the player (on map change or when left too far behind)
  warp() {
    const p = this.w.player;
    this.x = p.cx - p.facing * 20; this.y = p.y - 6;
    this.target = null;
  }

  findTarget() {
    const p = this.w.player;
    let best = null, bestD = Infinity;
    for (const d of this.w.drops) {
      if (d.taken || d.t < 0.6 || d.petSkip || !this.w.canTake(d)) continue;
      const dist = Math.hypot(d.x + 6 - p.cx, d.y + 6 - p.cy);
      if (dist > PICK_RANGE) continue;
      const fromPet = Math.hypot(d.x + 6 - this.x, d.y + 6 - this.y);
      if (fromPet < bestD) { bestD = fromPet; best = d; }
    }
    return best;
  }

  update(dt) {
    const p = this.w.player;
    this.t += dt;
    if (this.happyT > 0) this.happyT -= dt;
    if (this.say) { this.say.t -= dt; if (this.say.t <= 0) this.say = null; }
    if (!this.target || this.target.taken || !this.w.drops.includes(this.target)) this.target = p.dead ? null : this.findTarget();

    let tx, ty, speed;
    if (this.target) {
      tx = this.target.x + 6; ty = this.target.y - 2; speed = FLY_SPEED;
    } else {
      tx = p.cx - p.facing * 20; ty = p.y - 4 + Math.sin(this.t * 2.6) * 3; speed = 170;
    }
    const dx = tx - this.x, dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 600) { this.warp(); return; }
    if (dist > 0.5) {
      // smooth flight: slow down near the target
      const step = Math.min(dist, speed * dt * Math.min(1, dist / 30 + 0.35));
      this.x += (dx / dist) * step; this.y += (dy / dist) * step;
      if (Math.abs(dx) > 2) this.facing = dx > 0 ? 1 : -1;
    }
    if (this.target && dist < 10) {
      const ok = this.w.pickupDrop(this.target, this.x, this.y);
      if (ok) {
        this.happyT = 0.6;
        this.w.burst(this.x, this.y, '#f0e0ff', 6, 50, { shape: 'star' });
        if (Math.random() < 0.18) this.say = { text: pick(PET_LINES), t: 2.5 };
      } else this.target.petSkip = true;
      this.target = null;
    }
    // talks now and then
    this.chatT -= dt;
    if (this.chatT <= 0) { this.chatT = rand(30, 60); if (!this.say) this.say = { text: pick(['Chủ nhân cố lên!', 'Đánh quái vui ghê', 'Em đói…', '♪ la la ♪']), t: 2.5 }; }
    // light sparkle
    if (Math.random() < dt * 4) this.w.spark(this.x + rand(-6, 6), this.y + rand(0, 10), { vy: rand(-12, -4), color: '#e8dcff', size: rand(1, 2), life: 0.6, shape: 'star', drag: 0.97 });
  }

  draw(ctx, cam) {
    const s = this.sheet;
    const fr = this.happyT > 0 ? s.frames.happy : s.frames.float;
    const f = fr[Math.floor(this.t * (this.happyT > 0 ? 6 : 5)) % fr.length];
    const bob = Math.sin(this.t * 3.2) * 1.5;
    ctx.save();
    ctx.globalAlpha = 0.95;
    drawFrame(ctx, s, f, this.x - s.fw / 2 - cam, this.y - s.fh / 2 + bob, this.facing < 0);
    ctx.restore();
  }

  drawLabel(ctx, cam) {
    this.w.nameTag(ctx, PET_NAME, this.x - cam, this.y + 19, '#e8dcff', 7);
    if (this.say) this.w.bubble(ctx, this.say.text, this.x - cam, this.y - 14);
  }
}
