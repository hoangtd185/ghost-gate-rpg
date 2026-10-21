// Icon vật phẩm và hình đạn, vẽ bằng đường cong ở độ phân giải cao
import { makeHi, SS, shade, rgba, paint, ellipse, rrect, poly, radial, linear, OUTLINE } from './draw.js';

// ================= ĐẠN =================
const projCache = {};
// Trả về { img, w, h } với w, h là kích thước logic
export function projSprite(kind) {
  if (projCache[kind]) return projCache[kind];
  let w, h, draw;
  if (kind === 'talisman') {
    w = 18; h = 11; draw = (ctx) => {
      ctx.translate(9, 5.5); ctx.rotate(-0.12);
      paint(ctx, rrect(-7.5, -4, 15, 8, 0.8), linear(ctx, 0, -4, 0, 4, [[0, '#fff3a0'], [1, '#f0c840']]), '#7a5a10', 0.7);
      ctx.strokeStyle = '#c42020'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-5, -2); ctx.lineTo(5, -2); ctx.moveTo(-1, -3); ctx.lineTo(-0.5, 3); ctx.moveTo(-4.5, 1); ctx.quadraticCurveTo(0, 3.5, 4.5, 0.5); ctx.stroke();
    };
  } else if (kind === 'dart') {
    w = 13; h = 13; draw = (ctx) => {
      ctx.translate(6.5, 6.5);
      const st = poly([[0, -6], [1.2, -1.2], [6, 0], [1.2, 1.2], [0, 6], [-1.2, 1.2], [-6, 0], [-1.2, -1.2]]);
      paint(ctx, st, radial(ctx, -1, -1, 0.5, 6, [[0, '#ffffff'], [1, '#9aa4b4']]), OUTLINE, 0.7);
      paint(ctx, ellipse(0, 0, 1.3, 1.3), '#2a2a36', null);
    };
  } else if (kind === 'wave') {
    w = 30; h = 42; draw = (ctx) => {
      const p = new Path2D(); p.moveTo(6, 1); p.bezierCurveTo(32, 10, 32, 32, 6, 41); p.bezierCurveTo(20, 30, 20, 12, 6, 1); p.closePath();
      ctx.fillStyle = linear(ctx, 4, 0, 28, 0, [[0, 'rgba(120,190,255,0)'], [0.6, 'rgba(170,220,255,0.85)'], [1, '#ffffff']]);
      ctx.fill(p);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1; ctx.stroke(p);
    };
  } else if (kind === 'fire') {
    w = 40; h = 24; draw = (ctx) => {
      // rồng lửa nhỏ: thân lửa + đầu có mắt
      ctx.fillStyle = radial(ctx, 26, 12, 1, 18, [[0, 'rgba(255,240,180,0.95)'], [0.4, 'rgba(255,150,40,0.9)'], [1, 'rgba(220,40,20,0)']]);
      ctx.fillRect(0, 0, 40, 24);
      const head = new Path2D();
      head.moveTo(20, 6); head.quadraticCurveTo(32, 3, 38, 11); head.quadraticCurveTo(34, 13, 38, 15); head.quadraticCurveTo(30, 21, 20, 18); head.quadraticCurveTo(23, 12, 20, 6); head.closePath();
      paint(ctx, head, linear(ctx, 20, 0, 38, 0, [[0, '#ff7a20'], [1, '#ffe080']]), '#a8300a', 0.8);
      paint(ctx, poly([[24, 6], [22, 1], [27, 5]]), '#ffb040', '#a8300a', 0.6);
      paint(ctx, ellipse(30, 9.5, 1.2, 1.4), '#3a0a0a', null);
      paint(ctx, ellipse(29.7, 9, 0.45, 0.45), '#ffffff', null);
    };
  } else if (kind === 'ghostfire') {
    w = 20; h = 20; draw = (ctx) => {
      ctx.fillStyle = radial(ctx, 10, 10, 0.5, 10, [[0, '#ffffff'], [0.3, '#f0b0ff'], [0.6, 'rgba(180,60,255,0.85)'], [1, 'rgba(90,0,160,0)']]);
      ctx.fillRect(0, 0, 20, 20);
    };
  } else if (kind === 'bloodtalisman') {
    w = 18; h = 12; draw = (ctx) => {
      ctx.fillStyle = radial(ctx, 9, 6, 0.5, 10, [[0, 'rgba(255,90,110,0.55)'], [1, 'rgba(160,0,30,0)']]);
      ctx.fillRect(0, 0, 18, 12);
      ctx.translate(9, 6); ctx.rotate(0.1);
      paint(ctx, rrect(-7, -4, 14, 8, 0.8), linear(ctx, 0, -4, 0, 4, [[0, '#ff6a7a'], [1, '#a8142a']]), '#3a0408', 0.7);
      ctx.strokeStyle = '#fff0c0'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-4.5, -2); ctx.lineTo(4.5, -2); ctx.moveTo(-0.5, -3); ctx.lineTo(0, 3); ctx.moveTo(-4, 1.2); ctx.quadraticCurveTo(0, 3.6, 4, 0.8); ctx.stroke();
    };
  } else if (kind === 'fireball') {
    w = 24; h = 24; draw = (ctx) => {
      ctx.fillStyle = radial(ctx, 12, 12, 0.5, 12, [[0, '#ffffff'], [0.25, '#fff0a0'], [0.55, 'rgba(255,140,40,0.95)'], [1, 'rgba(220,40,20,0)']]);
      ctx.fillRect(0, 0, 24, 24);
    };
  } else if (kind === 'waterbolt') {
    w = 14; h = 14; draw = (ctx) => {
      ctx.fillStyle = radial(ctx, 7, 7, 0.5, 7, [[0, '#ffffff'], [0.35, '#a8d8ff'], [1, 'rgba(60,120,255,0)']]);
      ctx.fillRect(0, 0, 14, 14);
    };
  } else { // ember
    w = 14; h = 14; draw = (ctx) => {
      ctx.fillStyle = radial(ctx, 7, 7, 0.5, 7, [[0, '#fffbe0'], [0.35, '#ffb040'], [1, 'rgba(255,60,20,0)']]);
      ctx.fillRect(0, 0, 14, 14);
    };
  }
  const { c, ctx } = makeHi(w, h);
  draw(ctx);
  projCache[kind] = { img: c, w, h };
  return projCache[kind];
}

// ================= ICON VẬT PHẨM (16×16 logic) =================
const iconCache = {};
export function itemIcon(icon, color, slotLook) {
  const key = icon + color + (slotLook || '');
  if (iconCache[key]) return iconCache[key];
  const { c, ctx } = makeHi(16, 16);
  const d = shade(color, -0.35), l = shade(color, 0.5);
  const lw = 0.7;
  switch (icon) {
    case 'potion': {
      paint(ctx, rrect(6, 1, 4, 2.5, 0.8), '#9a6a40', OUTLINE, lw);
      const b = new Path2D(); b.moveTo(6.3, 3.5); b.lineTo(9.7, 3.5); b.lineTo(9.7, 5.5); b.bezierCurveTo(14, 6.5, 14, 14.5, 8, 14.8); b.bezierCurveTo(2, 14.5, 2, 6.5, 6.3, 5.5); b.closePath();
      paint(ctx, b, radial(ctx, 7, 9, 0.5, 7, [[0, l], [0.55, color], [1, d]]), OUTLINE, lw);
      paint(ctx, ellipse(5.8, 9, 1, 2), rgba('#ffffff', 0.55), null);
      break;
    }
    case 'pill':
      paint(ctx, ellipse(8, 8.5, 5.2, 5), radial(ctx, 6.5, 7, 0.5, 6, [[0, l], [1, color]]), OUTLINE, lw);
      paint(ctx, ellipse(6.4, 6.6, 1.4, 1), rgba('#ffffff', 0.8), null);
      break;
    case 'scroll':
      paint(ctx, rrect(3, 3, 10, 10, 0.5), '#f6ead0', OUTLINE, lw);
      paint(ctx, rrect(1.5, 2, 2.5, 12, 1.2), color, OUTLINE, lw); paint(ctx, rrect(12, 2, 2.5, 12, 1.2), color, OUTLINE, lw);
      ctx.strokeStyle = '#c42020'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(5.5, 6); ctx.lineTo(10.5, 6); ctx.moveTo(8, 4.8); ctx.lineTo(8, 11); ctx.moveTo(5.5, 9.5); ctx.lineTo(10.5, 9.5); ctx.stroke();
      break;
    case 'flame': {
      const f = new Path2D(); f.moveTo(8, 1); f.bezierCurveTo(10, 5, 13.5, 7, 12.5, 11); f.bezierCurveTo(12, 14.5, 4, 14.5, 3.5, 11); f.bezierCurveTo(3, 7.5, 6.5, 6, 8, 1); f.closePath();
      paint(ctx, f, radial(ctx, 8, 11, 0.5, 7, [[0, '#ffffff'], [0.4, l], [1, color]]), OUTLINE, lw);
      break;
    }
    case 'tail': {
      const t = new Path2D(); t.moveTo(2.5, 13.5); t.bezierCurveTo(4, 7, 9, 3, 14, 2); t.bezierCurveTo(13, 6, 11, 11, 6, 14.5); t.closePath();
      paint(ctx, t, linear(ctx, 3, 14, 14, 2, [[0, d], [0.6, color], [0.85, '#fff2e2']]), OUTLINE, lw);
      break;
    }
    case 'straw':
      for (let i = 0; i < 7; i++) { ctx.strokeStyle = i % 2 ? color : d; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(4 + i * 1.3, 2); ctx.lineTo(3 + i * 1.6, 14); ctx.stroke(); }
      paint(ctx, rrect(2.5, 7, 11, 2.2, 1), '#7a4e2a', OUTLINE, lw);
      break;
    case 'charm':
      paint(ctx, rrect(4.5, 1, 7, 14, 0.5), linear(ctx, 0, 1, 0, 15, [[0, '#fff3a0'], [1, color]]), OUTLINE, lw);
      ctx.strokeStyle = '#c42020'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(6, 3.5); ctx.lineTo(10, 3.5); ctx.moveTo(8, 2.5); ctx.lineTo(8, 12); ctx.moveTo(6, 7); ctx.lineTo(10, 6.5); ctx.moveTo(6, 10); ctx.quadraticCurveTo(8, 12, 10, 9.5); ctx.stroke();
      ctx.strokeStyle = '#3a2418'; ctx.beginPath(); ctx.moveTo(11, 12); ctx.lineTo(9.5, 15); ctx.stroke();
      break;
    case 'horn': {
      const h = new Path2D(); h.moveTo(3, 14.5); h.quadraticCurveTo(5, 6, 12.5, 1.5); h.quadraticCurveTo(9.5, 8, 8, 14.5); h.closePath();
      paint(ctx, h, linear(ctx, 3, 14, 12, 2, [[0, '#f0e6d4'], [0.7, '#d8ccb8'], [1, color]]), OUTLINE, lw);
      break;
    }
    case 'weapon_sword': {
      ctx.translate(8, 8); ctx.rotate(-Math.PI / 4);
      const bl = poly([[-1, -7.2], [0, -8.6], [1, -7.2], [1, 3], [-1, 3]]);
      paint(ctx, bl, linear(ctx, -1, 0, 1, 0, [[0, l], [1, color]]), OUTLINE, lw);
      paint(ctx, rrect(-3.2, 3, 6.4, 1.4, 0.6), '#e2b85c', OUTLINE, lw);
      paint(ctx, rrect(-0.8, 4.4, 1.6, 3.4, 0.6), '#5a3424', OUTLINE, lw);
      break;
    }
    case 'weapon_staff': {
      ctx.translate(8, 8); ctx.rotate(Math.PI / 5);
      paint(ctx, rrect(-0.8, -4, 1.6, 12, 0.8), '#8a5430', OUTLINE, lw);
      paint(ctx, ellipse(0, -5.5, 3.2, 2.6), radial(ctx, -0.8, -6.2, 0.3, 3, [[0, l], [1, color]]), OUTLINE, lw);
      break;
    }
    case 'weapon_dart': {
      ctx.translate(8, 8); ctx.rotate(0.3);
      const st = poly([[0, -7], [1.5, -1.5], [7, 0], [1.5, 1.5], [0, 7], [-1.5, 1.5], [-7, 0], [-1.5, -1.5]]);
      paint(ctx, st, radial(ctx, -1, -1, 0.5, 7, [[0, l], [1, color]]), OUTLINE, lw);
      paint(ctx, ellipse(0, 0, 1.3, 1.3), '#2a2a36', null);
      break;
    }
    case 'hat':
      if (slotLook === 'conical') {
        const p = new Path2D(); p.moveTo(8, 2.5); p.lineTo(15, 10.5); p.quadraticCurveTo(8, 12.5, 1, 10.5); p.closePath();
        paint(ctx, p, linear(ctx, 1, 0, 15, 0, [[0, d], [0.45, l], [1, color]]), OUTLINE, lw);
      } else if (slotLook === 'daoist') {
        paint(ctx, rrect(3.5, 3, 9, 9, 1.5), linear(ctx, 3, 0, 13, 0, [[0, d], [1, l]]), OUTLINE, lw);
        paint(ctx, rrect(2.5, 10.5, 11, 2.5, 1), l, OUTLINE, lw); paint(ctx, rrect(6.5, 5, 3, 3, 0.6), '#e2b85c', OUTLINE, lw);
      } else if (slotLook === 'helm') {
        const p = new Path2D(); p.moveTo(2, 12); p.bezierCurveTo(2, 2, 14, 2, 14, 12); p.closePath();
        paint(ctx, p, linear(ctx, 0, 3, 0, 12, [[0, l], [1, d]]), OUTLINE, lw);
        paint(ctx, poly([[7.5, 4], [8.5, 0.5], [10, 1], [9, 4.5]]), '#d23a32', OUTLINE, lw);
      } else {
        paint(ctx, rrect(1.5, 6.5, 13, 3, 1.4), linear(ctx, 0, 6, 0, 10, [[0, l], [1, color]]), OUTLINE, lw);
        const t = new Path2D(); t.moveTo(12.5, 9); t.quadraticCurveTo(14, 12, 13, 14.5); t.lineTo(11.5, 12); t.closePath();
        paint(ctx, t, color, OUTLINE, lw);
      }
      break;
    case 'armor': {
      const a = new Path2D();
      a.moveTo(5.5, 2); a.lineTo(10.5, 2); a.lineTo(14.5, 5); a.lineTo(13, 8); a.lineTo(11.5, 7); a.lineTo(12, 14.5); a.lineTo(4, 14.5); a.lineTo(4.5, 7); a.lineTo(3, 8); a.lineTo(1.5, 5); a.closePath();
      paint(ctx, a, linear(ctx, 2, 0, 14, 0, [[0, d], [0.5, color], [1, l]]), OUTLINE, lw);
      ctx.strokeStyle = '#e2b85c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(6, 2.2); ctx.lineTo(10.5, 8); ctx.stroke();
      paint(ctx, rrect(4.3, 8.5, 7.5, 1.6, 0.6), '#e2b85c', OUTLINE, 0.5);
      break;
    }
    case 'acc':
      ctx.strokeStyle = '#e2b85c'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(5, 1.5); ctx.quadraticCurveTo(8, 5, 11, 1.5); ctx.stroke();
      paint(ctx, ellipse(8, 9.5, 4.8, 5), radial(ctx, 6.6, 8, 0.5, 5.5, [[0, l], [0.6, color], [1, d]]), OUTLINE, lw);
      paint(ctx, ellipse(6.5, 7.8, 1.2, 0.9), rgba('#ffffff', 0.7), null);
      ctx.strokeStyle = '#d23a32'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(8, 14.4); ctx.lineTo(8, 16); ctx.stroke();
      break;
    case 'drop': {
      const p = new Path2D(); p.moveTo(8, 1.5); p.bezierCurveTo(10, 6, 13.5, 8.5, 13, 11.2); p.bezierCurveTo(12.5, 15, 3.5, 15, 3, 11.2); p.bezierCurveTo(2.5, 8.5, 6, 6, 8, 1.5); p.closePath();
      paint(ctx, p, radial(ctx, 6.5, 9, 0.5, 7, [[0, l], [1, color]]), OUTLINE, lw);
      paint(ctx, ellipse(6, 9.5, 1, 1.6), rgba('#ffffff', 0.6), null);
      break;
    }
    case 'petal': { // cánh hoa đào
      for (const [a, s2] of [[-0.6, 0.85], [0.5, 1]]) {
        ctx.save(); ctx.translate(8, 9); ctx.rotate(a);
        const p = new Path2D(); p.moveTo(0, 5); p.bezierCurveTo(-5, 1, -4, -5, 0, -6); p.lineTo(0.8, -4.6); p.lineTo(1.6, -6); p.bezierCurveTo(5, -4, 4, 1, 0, 5); p.closePath();
        ctx.scale(s2, s2); paint(ctx, p, linear(ctx, 0, -6, 0, 5, [[0, '#ffffff'], [1, color]]), OUTLINE, lw);
        ctx.restore();
      }
      break;
    }
    case 'silk': { // cuộn tơ
      paint(ctx, rrect(3, 3, 10, 2, 0.8), '#c8a070', OUTLINE, lw * 0.8);
      paint(ctx, rrect(3, 11, 10, 2, 0.8), '#c8a070', OUTLINE, lw * 0.8);
      paint(ctx, rrect(4, 5, 8, 6, 1.5), linear(ctx, 4, 0, 12, 0, [[0, shade(color, -0.15)], [0.5, '#ffffff'], [1, shade(color, -0.1)]]), OUTLINE, lw);
      ctx.strokeStyle = rgba('#9ab8d8', 0.7); ctx.lineWidth = 0.4;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(4.5, 6 + i * 1.3); ctx.lineTo(11.5, 6.6 + i * 1.3); ctx.stroke(); }
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(12, 8); ctx.quadraticCurveTo(15, 10, 13.5, 14.5); ctx.stroke();
      break;
    }
    case 'fur': {
      const p = poly([[2, 11], [4, 6], [7, 8], [8, 3], [10, 7], [13, 4], [14, 9], [12, 13], [4, 14]], true);
      paint(ctx, p, radial(ctx, 7, 7, 0.5, 8, [[0, '#ffffff'], [1, shade(color, -0.15)]]), OUTLINE, lw);
      break;
    }
    case 'crystal': {
      const p = poly([[8, 1], [12.5, 6], [11, 15], [5, 15], [3.5, 6]]);
      paint(ctx, p, linear(ctx, 3, 1, 13, 15, [[0, '#ffffff'], [0.5, color], [1, d]]), OUTLINE, lw);
      ctx.strokeStyle = rgba('#ffffff', 0.7); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(8, 1); ctx.lineTo(8, 15); ctx.moveTo(3.5, 6); ctx.lineTo(8, 9); ctx.lineTo(12.5, 6); ctx.stroke();
      break;
    }
    case 'ember': {
      const p = poly([[4, 4], [11, 2.5], [14, 8], [11, 14], [4, 13.5], [2, 8]]);
      paint(ctx, p, '#3a2a2a', OUTLINE, lw);
      ctx.strokeStyle = color; ctx.lineWidth = 1.1; ctx.shadowColor = color; ctx.shadowBlur = 2;
      ctx.beginPath(); ctx.moveTo(4, 12); ctx.lineTo(7, 8); ctx.lineTo(10, 9); ctx.lineTo(12, 5); ctx.moveTo(7, 8); ctx.lineTo(6, 4); ctx.stroke();
      ctx.shadowBlur = 0;
      break;
    }
    case 'scale': {
      const p = new Path2D(); p.moveTo(8, 1.5); p.quadraticCurveTo(15, 5, 13, 12); p.quadraticCurveTo(8, 15.5, 3, 12); p.quadraticCurveTo(1, 5, 8, 1.5); p.closePath();
      paint(ctx, p, radial(ctx, 6.5, 6, 0.5, 9, [[0, '#fff2c0'], [0.5, color], [1, '#b8601a']]), OUTLINE, lw);
      ctx.strokeStyle = rgba('#8a4a10', 0.6); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(8, 6, 3, 0.3, Math.PI - 0.3); ctx.arc(8, 9.5, 3.5, 0.3, Math.PI - 0.3); ctx.stroke();
      break;
    }
    case 'stone': {
      const p = poly([[3, 6], [7, 2.5], [12.5, 4], [14, 9.5], [10, 14], [4, 13]]);
      paint(ctx, p, linear(ctx, 3, 3, 13, 14, [[0, '#ffffff'], [0.45, color], [1, '#3a6aa8']]), OUTLINE, lw);
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(8, 5.5); ctx.lineTo(9, 8); ctx.lineTo(11.5, 8.6); ctx.lineTo(9, 9.4); ctx.lineTo(8, 12); ctx.lineTo(7, 9.4); ctx.lineTo(4.5, 8.6); ctx.lineTo(7, 8); ctx.closePath(); ctx.fill();
      break;
    }
    case 'protect':
      paint(ctx, rrect(4, 1, 8, 14, 0.6), linear(ctx, 0, 1, 0, 15, [[0, '#fff6c0'], [1, color]]), OUTLINE, lw);
      ctx.strokeStyle = '#c42020'; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.arc(8, 6.5, 2.6, 0, Math.PI * 2); ctx.moveTo(8, 9); ctx.lineTo(8, 13.5); ctx.moveTo(6, 11.5); ctx.lineTo(10, 11.5); ctx.stroke();
      break;
    case 'orb':
      ctx.fillStyle = radial(ctx, 8, 8, 0.5, 8, [[0, rgba(color, 0.5)], [1, rgba(color, 0)]]); ctx.fillRect(0, 0, 16, 16);
      paint(ctx, ellipse(8, 8, 5.2, 5.2), radial(ctx, 6.4, 6.4, 0.5, 6, [[0, '#ffffff'], [0.4, l], [1, d]]), OUTLINE, lw);
      paint(ctx, ellipse(6.3, 6, 1.4, 1), rgba('#ffffff', 0.85), null);
      break;
    case 'gem': { // ngọc khảm: viên giác cắt, số vạch = phẩm
      const g = +slotLook || 1;
      ctx.fillStyle = radial(ctx, 8, 8, 0.5, 8, [[0, rgba(color, 0.35 + g * 0.12)], [1, rgba(color, 0)]]); ctx.fillRect(0, 0, 16, 16);
      const outer = poly([[8, 1.5], [13.5, 5], [13.5, 10.5], [8, 14.5], [2.5, 10.5], [2.5, 5]]);
      paint(ctx, outer, linear(ctx, 3, 2, 13, 14, [[0, '#ffffff'], [0.35, l], [1, d]]), OUTLINE, lw);
      paint(ctx, poly([[8, 4], [11, 6], [11, 9.6], [8, 11.8], [5, 9.6], [5, 6]]), linear(ctx, 5, 4, 11, 12, [[0, l], [1, color]]), rgba('#ffffff', 0.5), 0.5);
      paint(ctx, poly([[5.2, 5.4], [7.6, 4.2], [6.6, 7.2]]), rgba('#ffffff', 0.85), null);
      for (let i = 0; i < g; i++) paint(ctx, ellipse(12.6 - i * 2.6, 14.2, 0.9, 0.9), '#fff6c0', OUTLINE, 0.4);
      break;
    }
    case 'bell': {
      const p = new Path2D(); p.moveTo(4, 12); p.quadraticCurveTo(4, 4, 8, 3); p.quadraticCurveTo(12, 4, 12, 12); p.lineTo(13.5, 13); p.lineTo(2.5, 13); p.closePath();
      paint(ctx, p, linear(ctx, 3, 3, 13, 13, [[0, '#fff0c0'], [0.5, color], [1, '#6a4a10']]), OUTLINE, lw);
      paint(ctx, rrect(7, 1, 2, 2.4, 0.6), color, OUTLINE, 0.6);
      ctx.strokeStyle = rgba('#5a3a08', 0.8); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(5, 9); ctx.lineTo(11, 9); ctx.stroke();
      paint(ctx, ellipse(8, 14, 1.4, 1.2), '#5a3a08', null);
      if (color === '#c8a050') { ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(8.6, 3.5); ctx.lineTo(7.4, 7); ctx.lineTo(9.2, 9.5); ctx.lineTo(8, 13); ctx.stroke(); }
      break;
    }
    case 'mask': {
      const p = new Path2D(); p.moveTo(3, 4); p.quadraticCurveTo(8, 1, 13, 4); p.quadraticCurveTo(13.5, 11, 8, 15); p.quadraticCurveTo(2.5, 11, 3, 4); p.closePath();
      paint(ctx, p, linear(ctx, 0, 2, 0, 15, [[0, '#ffffff'], [1, '#c8c0b4']]), OUTLINE, lw);
      paint(ctx, poly([[4.6, 6.6], [7, 6], [6.6, 7.6]]), '#1a1014', null);
      paint(ctx, poly([[11.4, 6.6], [9, 6], [9.4, 7.6]]), '#1a1014', null);
      ctx.strokeStyle = '#c42030'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(8, 2.5); ctx.lineTo(8, 5); ctx.moveTo(6.5, 11.5); ctx.quadraticCurveTo(8, 12.4, 9.5, 11.5); ctx.stroke();
      ctx.strokeStyle = '#2a1408'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(11, 3.6); ctx.lineTo(9.6, 8.6); ctx.lineTo(10.8, 11); ctx.stroke();
      break;
    }
    case 'gold':
      paint(ctx, ellipse(8, 8.5, 6, 5.6), radial(ctx, 6.5, 7, 0.5, 6.5, [[0, '#fff6c0'], [0.6, '#f0c040'], [1, '#b08010']]), '#6a4a08', lw);
      paint(ctx, rrect(6.4, 7, 3.2, 3.2, 0.3), '#8a6010', null);
      break;
    default:
      paint(ctx, rrect(3, 3, 10, 10, 2), color, OUTLINE, lw);
  }
  const url = c.toDataURL();
  iconCache[key] = { canvas: c, url };
  return iconCache[key];
}

export function iconForItem(it) {
  if (it.type === 'equip') {
    if (it.slot === 'weapon') {
      const w = it.cls === 'dao' ? 'staff' : it.cls === 'thich' ? 'dart' : 'sword';
      return itemIcon('weapon_' + w, it.color);
    }
    if (it.slot === 'hat') return itemIcon('hat', it.color, it.look);
    return itemIcon(it.slot === 'armor' || it.slot === 'outfit' ? 'armor' : 'acc', it.color);
  }
  if (it.type === 'gem') return itemIcon('gem', it.color, String(it.gem.g));
  return itemIcon(it.icon, it.color);
}
