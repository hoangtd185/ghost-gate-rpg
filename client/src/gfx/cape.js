// Flowing capes: a small cloth simulation (a chain of points pinned at the shoulders) drawn live every frame,
// behind the character sprite. Used by every humanoid that wears a cape (the player, other players, bots), and by
// outfits that come with their own cape (Hắc Long Bào, Phượng Vũ Y, Huyết Nguyệt Chiến Giáp).
//
// Cape look (`liveCape` in the character's look, from ITEMS[*].cape or an outfit's look.cape):
//   c, c2      top and bottom colors (gradient down the cape)
//   t          trim color (edges, clasp)
//   len, w     length and bottom width in pixels (top width is w * 0.55)
//   hem        'plain' | 'feather' | 'tattered' | 'scallop' | 'flame'
//   motif      'moon' | 'dragon' | 'flower' | 'snow' | 'cloud' | 'eye' (embroidered in the middle), mc = its color
//   alpha      opacity (ghostly capes)
//   lining     inner color, visible where the cape folds over
//   fx         particles shed while moving: { c, shape: 'petal' | 'star' | 'ember' | 'snow' | 'wisp' } (spawned by world.js)
import { GAME } from '../../../shared/config.js';
import { shade, rgba, OUTLINE } from './draw.js';

const C = GAME.cape;

export class CapeCloth {
  constructor() { this.pts = null; this.t = Math.random() * 10; this.acc = 0; }

  reset(ax, ay, facing, len) {
    const n = C.segments, seg = len / (n - 1);
    this.pts = [];
    for (let i = 0; i < n; i++) {
      const x = ax - facing * i * seg * 0.35, y = ay + i * seg * 0.94;
      this.pts.push({ x, y, px: x, py: y });
    }
    this.ax = ax; this.ay = ay; this.acc = 0;
  }

  // anchor (ax, ay): back of the neck in world pixels; vx: the wearer's speed; groundY: where the cape must stop.
  // Runs in fixed steps (GAME.cape.step) whatever the frame rate, moving the anchor smoothly across them.
  update(ax, ay, facing, vx, dt, len, groundY) {
    if (!this.pts || Math.hypot(this.ax - ax, this.ay - ay) > C.resetDist) this.reset(ax, ay, facing, len);
    this.acc = Math.min(this.acc + Math.max(0, dt), C.maxDt);
    const steps = Math.floor(this.acc / C.step);
    if (!steps) return;
    this.acc -= steps * C.step;
    const x0 = this.ax, y0 = this.ay;
    for (let s = 1; s <= steps; s++) this.step(x0 + (ax - x0) * (s / steps), y0 + (ay - y0) * (s / steps), facing, vx, len, groundY);
    this.ax = ax; this.ay = ay;
  }

  step(ax, ay, facing, vx, len, groundY) {
    const h = C.step;
    this.t += h;
    const n = C.segments, seg = len / (n - 1), pts = this.pts;
    const speed = Math.min(1.6, Math.abs(vx) / 120);
    const keep = Math.max(0, 1 - C.airDrag * h); // air drag on the cloth's own motion (the air stands still)
    pts[0].x = pts[0].px = ax; pts[0].y = pts[0].py = ay;
    for (let i = 1; i < n; i++) {
      const p = pts[i], k = i / (n - 1);
      const vxp = (p.x - p.px) * keep, vyp = (p.y - p.py) * keep;
      p.px = p.x; p.py = p.y;
      // forces: gravity, a pull behind the back, and a wave that runs down the cloth (stronger at the tip)
      const wave = Math.sin(this.t * C.flutterFreq - i * 0.9) * (speed * C.flutter * 120 + C.idleSway) * k;
      p.x += vxp - facing * C.backPull * h * h;
      p.y += vyp + (C.gravity + wave) * h * h;
    }
    for (let it = 0; it < C.iterations; it++) {
      for (let i = 1; i < n; i++) {
        const a = pts[i - 1], b = pts[i];
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
        b.x = a.x + (dx / d) * seg; b.y = a.y + (dy / d) * seg;
        // stay behind the body (never further forward than the shoulders) and never rise much above the point before
        if ((b.x - ax) * facing > 1.5) b.x = ax + facing * 1.5;
        if (b.y < a.y - seg * C.maxRise) b.y = a.y - seg * C.maxRise;
        if (b.y > groundY) b.y = groundY;
      }
    }
  }

  // Draws the cloth. spec: the cape look. The clasp in front of the body is drawn by drawClasp afterwards.
  // The chain is the cape's inner edge (along the wearer's back); the cloth spreads from it backward, or downward
  // when it flies out horizontally, so it shows beside the body instead of hiding behind it.
  draw(ctx, cam, spec, facing = 1) {
    const pts = this.pts;
    if (!pts) return;
    const n = pts.length, wTop = spec.w * 0.45, wBot = spec.w;
    const L = [], R = [];
    // one side for the whole cape (decided by the overall direction), so the cloth never folds through itself
    const ox = pts[n - 1].x - pts[0].x, oy = pts[n - 1].y - pts[0].y;
    const side = -oy * -facing + ox * 0.8 < 0 ? -1 : 1;
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let tx = b.x - a.x, ty = b.y - a.y; const d = Math.hypot(tx, ty) || 1; tx /= d; ty /= d;
      const nx = -ty * side, ny = tx * side; // normal, on the back/down side
      const k = i / (n - 1), w = wTop + (wBot - wTop) * Math.sqrt(k);
      const ripple = i ? Math.sin(this.t * 5 + i * 1.3) * 0.8 * k : 0;
      L.push([pts[i].x - cam - nx * 1.5, pts[i].y - ny * 1.5]);
      R.push([pts[i].x - cam + nx * (w + ripple), pts[i].y + ny * (w + ripple)]);
    }
    const path = new Path2D();
    path.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < n; i++) {
      const [x0, y0] = L[i - 1], [x1, y1] = L[i];
      path.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
    }
    path.lineTo(L[n - 1][0], L[n - 1][1]);
    hemPath(path, L[n - 1], R[n - 1], spec.hem, this.t);
    for (let i = n - 2; i >= 0; i--) {
      const [x0, y0] = R[i + 1], [x1, y1] = R[i];
      path.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
    }
    path.lineTo(R[0][0], R[0][1]);
    path.closePath();

    ctx.save();
    if (spec.alpha) ctx.globalAlpha *= spec.alpha;
    const top = pts[0], tip = pts[n - 1];
    const g = ctx.createLinearGradient(top.x - cam, top.y, tip.x - cam, tip.y);
    g.addColorStop(0, shade(spec.c, -0.12)); g.addColorStop(0.45, spec.c); g.addColorStop(1, spec.c2 || shade(spec.c, -0.3));
    ctx.fillStyle = g; ctx.fill(path);
    ctx.save(); ctx.clip(path);
    // folds: a darker band down the middle and a light sheen on the side facing the light
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(shade(spec.c, -0.6), 0.3); ctx.lineWidth = spec.w * 0.3;
    strokeEdge(ctx, L);
    ctx.strokeStyle = rgba('#ffffff', 0.12); ctx.lineWidth = spec.w * 0.14;
    strokeEdge(ctx, L.map(([x], i) => [(x + R[i][0]) / 2, (L[i][1] + R[i][1]) / 2]));
    if (spec.lining) { // the lining shows along one edge, like a turned-over hem
      ctx.strokeStyle = spec.lining; ctx.lineWidth = 2.2;
      ctx.beginPath(); R.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    }
    if (spec.motif) drawMotif(ctx, spec.motif, spec.mc || spec.t, L, R, spec.w);
    ctx.restore();
    // trim along the edges, then the outline
    ctx.strokeStyle = spec.t; ctx.lineWidth = 1.3; ctx.stroke(path);
    ctx.strokeStyle = rgba(OUTLINE, 0.85); ctx.lineWidth = 0.7; ctx.stroke(path);
    ctx.restore();
  }

  // Small clasp at the collar, drawn over the body so the cape looks tied on
  drawClasp(ctx, cam, spec, facing) {
    if (!this.pts) return;
    const p = this.pts[0], x = p.x - cam + facing * 4, y = p.y + 0.8;
    ctx.save();
    ctx.fillStyle = spec.t; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.ellipse(x, y, 1.7, 1.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(x - 0.5, y - 0.5, 0.5, 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Where particles leave the cape (its lower edge)
  tip() { return this.pts ? this.pts[this.pts.length - 1] : null; }
}

function strokeEdge(ctx, line) {
  ctx.beginPath();
  line.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
}

// The bottom edge between the two lower corners
function hemPath(path, a, b, hem, t) {
  const [ax, ay] = a, [bx, by] = b;
  const steps = hem === 'feather' ? 5 : hem === 'tattered' ? 6 : hem === 'scallop' ? 4 : hem === 'flame' ? 5 : 1;
  if (steps === 1) { path.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + 2.5, bx, by); return; }
  const dx = (bx - ax) / steps, dy = (by - ay) / steps;
  // outward direction (away from the shoulders): perpendicular to the hem
  let nx = -dy, ny = dx; const d = Math.hypot(nx, ny) || 1; nx /= d; ny /= d;
  if (ny < 0) { nx = -nx; ny = -ny; }
  for (let i = 0; i < steps; i++) {
    const x0 = ax + dx * i, y0 = ay + dy * i, x1 = x0 + dx, y1 = y0 + dy, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    if (hem === 'feather') path.quadraticCurveTo(mx + nx * 6, my + ny * 6, x1, y1);
    else if (hem === 'scallop') path.quadraticCurveTo(mx + nx * 4, my + ny * 4, x1, y1);
    else if (hem === 'tattered') {
      const len = 3 + ((i * 7) % 5) + Math.sin(t * 6 + i) * 1.2;
      path.lineTo(mx + nx * len, my + ny * len); path.lineTo(x1, y1);
    } else { // flame: licking tongues that flicker
      const len = 5 + Math.sin(t * 11 + i * 2) * 2.2;
      path.quadraticCurveTo(x0 + nx * len * 0.4, y0 + ny * len * 0.4, mx + nx * len, my + ny * len);
      path.quadraticCurveTo(x1 + nx * len * 0.3, y1 + ny * len * 0.3, x1, y1);
    }
  }
}

// Embroidery in the middle of the cape, turned with the cloth
function drawMotif(ctx, motif, color, L, R, w) {
  const i = Math.floor(L.length * 0.6);
  const mid = (j) => [(L[j][0] + R[j][0]) / 2, (L[j][1] + R[j][1]) / 2];
  const [x, y] = mid(i), [x0, y0] = mid(i - 1), [x1, y1] = mid(i + 1);
  const ang = Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2;
  const s = w / 18;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 0.9; ctx.lineCap = 'round';
  if (motif === 'moon') {
    ctx.beginPath(); ctx.arc(0, 0, 4.2, 0.6, Math.PI * 2 - 0.6); ctx.arc(1.6, 0, 3.2, Math.PI * 2 - 0.9, 0.9, true); ctx.closePath(); ctx.fill();
    for (const [x, y] of [[4.5, -4], [5.5, 3]]) { ctx.beginPath(); ctx.arc(x, y, 0.6, 0, Math.PI * 2); ctx.fill(); }
  } else if (motif === 'dragon') { // an S-shaped dragon with a few scales
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-4, -6); ctx.bezierCurveTo(5, -5, -5, 1, 3, 2); ctx.bezierCurveTo(7, 3, 2, 7, -2, 6); ctx.stroke();
    ctx.beginPath(); ctx.arc(-4, -6, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 0.6; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(-1 + k * 1.4, -3 + k * 1.8, 0.9, 0, Math.PI); ctx.stroke(); }
  } else if (motif === 'flower') {
    for (let k = 0; k < 5; k++) { const a2 = (k / 5) * Math.PI * 2; ctx.beginPath(); ctx.ellipse(Math.cos(a2) * 2.6, Math.sin(a2) * 2.6, 2.2, 1.3, a2, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(0, 0, 1.2, 0, Math.PI * 2); ctx.fill();
  } else if (motif === 'snow') {
    ctx.lineWidth = 0.8;
    for (let k = 0; k < 3; k++) { ctx.save(); ctx.rotate((k / 3) * Math.PI); ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.moveTo(3, -1.4); ctx.lineTo(4, 0); ctx.lineTo(3, 1.4); ctx.moveTo(-3, -1.4); ctx.lineTo(-4, 0); ctx.lineTo(-3, 1.4); ctx.stroke(); ctx.restore(); }
  } else if (motif === 'cloud') {
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.arc(-2, 0, 2.4, Math.PI * 0.9, Math.PI * 2.1); ctx.arc(2, -0.5, 2.8, Math.PI, Math.PI * 2.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 3, 1.5, Math.PI, Math.PI * 2.4); ctx.stroke();
  } else if (motif === 'eye') { // a staring eye, for the ghost cape
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.quadraticCurveTo(0, -4, 5, 0); ctx.quadraticCurveTo(0, 4, -5, 0); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
