// Monsters of the volcano: lava beast and Fire Qilin
import { shade, rgba, paint, ellipse, rrect, poly, radial, linear, OUTLINE } from '../draw.js';
import { withHurt } from './common.js';
import { boss } from './graveyard.js';

// ---------- Lava beast ----------
export function lava() {
  return withHurt(46, 36, 4, (ctx, f) => {
    const st = [0, 1, 0, -1][f], b = f % 2 ? -0.6 : 0;
    ctx.fillStyle = rgba('#000000', 0.3); ctx.beginPath(); ctx.ellipse(22, 34.5, 15, 1.8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = radial(ctx, 22, 20, 2, 22, [[0, 'rgba(255,120,40,0.35)'], [1, 'rgba(255,80,20,0)']]); ctx.fillRect(0, 0, 46, 36);
    const rock = '#3a2a2a', rockL = '#5a4440';
    const leg = (x, d, c) => paint(ctx, rrect(x + d, 25 + b, 5.5, 8.5, 2), c, OUTLINE, 0.9);
    leg(9, -st, shade(rock, -0.2)); leg(28, st, shade(rock, -0.2));
    // rock shell
    const shell = new Path2D();
    shell.moveTo(5, 27 + b); shell.bezierCurveTo(4, 10 + b, 36, 6 + b, 38, 26 + b); shell.quadraticCurveTo(22, 30 + b, 5, 27 + b); shell.closePath();
    paint(ctx, shell, radial(ctx, 18, 12 + b, 1, 22, [[0, rockL], [1, rock]]), OUTLINE, 1.1);
    // glowing lava cracks
    ctx.save(); ctx.clip(shell);
    ctx.strokeStyle = '#ffb040'; ctx.lineWidth = 1.2; ctx.shadowColor = '#ff6a20'; ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.moveTo(10, 24 + b); ctx.lineTo(14, 17 + b); ctx.lineTo(20, 19 + b); ctx.lineTo(24, 12 + b);
    ctx.moveTo(20, 19 + b); ctx.lineTo(27, 22 + b); ctx.lineTo(32, 16 + b);
    ctx.moveTo(14, 17 + b); ctx.lineTo(12, 12 + b);
    ctx.stroke();
    ctx.restore();
    for (const [x, h] of [[13, 5], [21, 7], [29, 5]]) paint(ctx, poly([[x - 3, 12 + b + (x === 21 ? -3 : 0)], [x, 12 + b - h + (x === 21 ? -3 : 0)], [x + 3, 12 + b + (x === 21 ? -3 : 0)]]), rockL, OUTLINE, 0.8);
    leg(14, st, rock); leg(32, -st, rock);
    // head
    const head = new Path2D();
    head.moveTo(33, 16 + b); head.quadraticCurveTo(44, 14 + b, 44.5, 22 + b); head.quadraticCurveTo(42, 27 + b, 35, 26 + b); head.closePath();
    paint(ctx, head, linear(ctx, 0, 14, 0, 27, [[0, rockL], [1, rock]]), OUTLINE, 1);
    ctx.fillStyle = radial(ctx, 39.5, 19.5 + b, 0, 4, [[0, 'rgba(255,220,100,0.95)'], [1, 'rgba(255,100,20,0)']]); ctx.fillRect(35, 15 + b, 9, 9);
    paint(ctx, ellipse(39.5, 19.5 + b, 1.4, 1.2), '#fff0a0', null);
    ctx.strokeStyle = '#ff8a30'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(38, 24 + b); ctx.lineTo(43.5, 23 + b); ctx.stroke();
  }, { idle: [0], walk: [0, 1, 2, 3] });
}

// ---------- Fire Qilin (boss) ----------
export function qilin() {
  return withHurt(108, 86, 3, (ctx, f) => {
    const b = f === 1 ? 1 : 0, atk = f === 2;
    const gold = '#f0b030', goldD = '#b8701a', red = '#c8301e', scale = '#ffd870';
    ctx.fillStyle = radial(ctx, 54, 48, 8, 54, [[0, 'rgba(255,140,40,0.4)'], [1, 'rgba(255,60,20,0)']]); ctx.fillRect(0, 0, 108, 86);
    ctx.fillStyle = rgba('#000000', 0.3); ctx.beginPath(); ctx.ellipse(54, 84, 34, 3, 0, 0, 7); ctx.fill();
    // flame tail
    const tail = new Path2D();
    tail.moveTo(26, 46 + b); tail.bezierCurveTo(12, 40, 4, 26, 10, 14 + b * 2); tail.bezierCurveTo(12, 22, 16, 26, 18, 24);
    tail.bezierCurveTo(16, 32, 22, 38, 30, 40 + b); tail.closePath();
    paint(ctx, tail, linear(ctx, 8, 14, 28, 46, [[0, '#fff0a0'], [0.5, '#ff9a30'], [1, red]]), '#6a1408', 1);
    // hind legs
    const leg = (x, y, c, d) => {
      paint(ctx, rrect(x + d, y, 7, 20, 3), c, OUTLINE, 1);
      paint(ctx, rrect(x - 1 + d, y + 17, 9, 5, 2), '#3a2418', OUTLINE, 0.9);
      ctx.fillStyle = '#ff9a30'; ctx.beginPath(); ctx.moveTo(x + d, y + 6); ctx.quadraticCurveTo(x - 4 + d, y + 9, x - 2 + d, y + 14); ctx.lineTo(x + 2 + d, y + 9); ctx.fill();
    };
    leg(30, 60, goldD, -1); leg(70, 60, goldD, 1);
    // body
    const body = ellipse(52, 52 + b, 28, 14);
    paint(ctx, body, linear(ctx, 0, 38, 0, 66, [[0, scale], [0.45, gold], [1, goldD]]), OUTLINE, 1.3);
    ctx.save(); ctx.clip(body);
    ctx.strokeStyle = rgba('#8a4a10', 0.5); ctx.lineWidth = 0.7;
    for (let y = 44; y < 64; y += 5) for (let x = 28 + (y % 10 ? 3 : 0); x < 80; x += 6) { ctx.beginPath(); ctx.arc(x, y + b, 3, 0.2, Math.PI - 0.2); ctx.stroke(); }
    ctx.fillStyle = '#ffe8b0'; ctx.beginPath(); ctx.ellipse(54, 62 + b, 22, 5, 0, 0, 7); ctx.fill();
    ctx.restore();
    leg(36, 60, gold, 1); leg(76, 60, gold, -1);
    // flame mane along the back and neck
    const mane = new Path2D();
    mane.moveTo(30, 42 + b);
    const pts = [[34, 30], [40, 38], [46, 28], [52, 37], [58, 24], [64, 33], [70, 18], [74, 28], [80, 14]];
    for (const [x, y] of pts) mane.lineTo(x, y + b);
    mane.lineTo(84, 30 + b); mane.lineTo(76, 44 + b); mane.closePath();
    paint(ctx, mane, linear(ctx, 0, 14, 0, 44, [[0, '#fff0a0'], [0.4, '#ff9a30'], [1, red]]), '#6a1408', 1);
    // neck + dragon head
    const neck = new Path2D();
    neck.moveTo(68, 46 + b); neck.quadraticCurveTo(72, 32 + b, 82, 28 + b); neck.lineTo(88, 36 + b); neck.quadraticCurveTo(80, 42 + b, 78, 52 + b); neck.closePath();
    paint(ctx, neck, linear(ctx, 68, 0, 88, 0, [[0, goldD], [1, gold]]), OUTLINE, 1.1);
    const head = new Path2D();
    head.moveTo(78, 22 + b); head.bezierCurveTo(84, 14 + b, 96, 16 + b, 100, 24 + b);
    head.quadraticCurveTo(106, 26 + b, 105, 31 + b);
    if (atk) { head.lineTo(96, 31 + b); head.lineTo(104, 38 + b); head.quadraticCurveTo(94, 42 + b, 86, 38 + b); }
    else { head.quadraticCurveTo(98, 36 + b, 88, 36 + b); }
    head.quadraticCurveTo(80, 34 + b, 78, 22 + b); head.closePath();
    paint(ctx, head, linear(ctx, 0, 14, 0, 40, [[0, scale], [1, gold]]), OUTLINE, 1.2);
    if (atk) {
      ctx.fillStyle = radial(ctx, 104, 34, 1, 14, [[0, 'rgba(255,250,200,1)'], [0.4, 'rgba(255,150,40,0.9)'], [1, 'rgba(255,60,20,0)']]);
      ctx.fillRect(90, 20, 18, 28);
    }
    // antlers
    for (const [x, d] of [[84, 0], [89, 3]]) {
      ctx.strokeStyle = '#fff2c8'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(x, 18 + b); ctx.quadraticCurveTo(x - 4 - d, 8 + b, x - 10 - d, 4 + b); ctx.moveTo(x - 4 - d, 10 + b); ctx.lineTo(x - 1 - d, 3 + b); ctx.stroke();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.6; ctx.stroke();
    }
    // eyes, whiskers
    ctx.fillStyle = radial(ctx, 92, 23 + b, 0, 6, [[0, 'rgba(255,80,40,0.8)'], [1, 'rgba(255,0,0,0)']]); ctx.fillRect(86, 17 + b, 12, 12);
    paint(ctx, poly([[89, 21 + b], [95, 22.5 + b], [93, 25 + b], [89.5, 24 + b]]), '#ff4a2a', OUTLINE, 0.8);
    paint(ctx, ellipse(92.5, 23.2 + b, 0.9, 1.1), '#fff0a0', null);
    ctx.strokeStyle = '#fff0a0'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(100, 30 + b); ctx.bezierCurveTo(98, 40 + b, 92, 44 + b, 88, 46 + b); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(103, 28 + b); ctx.bezierCurveTo(106, 36 + b, 104, 42 + b, 100, 46 + b); ctx.stroke();
    paint(ctx, ellipse(103.5, 26.5 + b, 0.9, 0.7), '#3a1408', null);
  }, { idle: [0, 1], walk: [0, 1], atk: [2] });
}
