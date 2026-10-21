// Điểm khởi động game
import { Input } from './engine/input.js';
import { GameWorld } from './game/world.js';
import { lookFor, Monster } from './game/entities.js';
import { humanoidSheet } from './gfx/humanoid.js';
import { GameUI } from './ui/hud.js';
import { Screens } from './ui/screens.js';
import { createStorage, Saver } from './storage/storage.js';
import { buildMapGraphics, drawLayer, VIEW_W, VIEW_H } from './gfx/backgrounds.js';
import { MAPS } from './data/maps.js';
import { monsterSheet } from './gfx/monsters.js';
import { drawFrame } from './gfx/draw.js';

const stage = document.getElementById('stage');
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hudRoot = document.getElementById('hud');
const screenRoot = document.getElementById('screen');

const input = new Input();
let world = null, ui = null, saver = null, storage = null, autoSaveT = 0;
let scale = 1;

// Giữ tỉ lệ 16:9, canvas nét theo mật độ điểm ảnh
function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  let w = vw, h = (vw * 9) / 16;
  if (h > vh) { h = vh; w = (vh * 16) / 9; }
  stage.style.width = w + 'px'; stage.style.height = h + 'px';
  stage.style.setProperty('--u', (w / VIEW_W).toFixed(4));
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  scale = canvas.width / VIEW_W;
}
window.addEventListener('resize', resize);
resize();

// Nền động cho màn hình tiêu đề
const titleMap = MAPS.nghiadia;
const titleGfx = buildMapGraphics(titleMap);
let titleT = 0;
function renderTitle(dt) {
  titleT += dt;
  const camX = (Math.sin(titleT * 0.05) * 0.5 + 0.5) * (titleMap.width - VIEW_W);
  drawLayer(ctx, titleGfx.sky, 0);
  drawLayer(ctx, titleGfx.far.img, -camX * titleGfx.far.factor);
  drawLayer(ctx, titleGfx.mid.img, -camX * titleGfx.mid.factor);
  drawLayer(ctx, titleGfx.fg, -camX);
  const s = monsterSheet('wisp');
  for (let i = 0; i < 7; i++) {
    const x = ((i * 97 + titleT * (14 + i * 3)) % (VIEW_W + 60)) - 30;
    const y = 120 + Math.sin(titleT * 1.3 + i * 2) * 40 + i * 18;
    const f = Math.floor(titleT * 7 + i) % 4;
    ctx.globalAlpha = 0.85;
    drawFrame(ctx, s, f, x, y);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(8,6,14,0.45)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function doSave() {
  if (!world || !saver) return;
  world.ch.x = Math.round(world.player.x);
  world.ch.savedAt = Date.now();
  saver.save(world.ch);
}

function enterGame(ch, isNew) {
  hudRoot.hidden = false;
  saver = new Saver(storage, (st, msg) => ui && ui.saveStatus(st, msg));
  const hooks = {
    toast: (m, k) => ui.toast(m, k),
    chat: (n, m, t) => ui.addChat(n, m, t),
    openNpc: (id) => ui.openNpc(id),
    death: (loss) => ui.showDeath(loss),
    changed: (what) => { if (!ui.world) return; if (what === 'bars') ui.refreshBars(); else ui.refreshAll(); },
    save: () => doSave(),
    mapChanged: (map) => ui && ui.world && ui.setMap(map),
    levelUp: (lv) => { ui.banner(`<small>Chúc mừng</small>Đạt cấp ${lv}`); ui.toast(`Thăng cấp ${lv}! +5 điểm tiềm năng, +1 điểm kỹ năng`, 'quest'); ui.refreshAll(); },
    questProgress: (q) => ui.questProgress(q),
    gotItem: (d) => ui.gotItem(d),
    useItemById: (id) => ui.useItemById(id),
  };
  world = new GameWorld(ch, hooks);
  ui.attach(world);
  ui.setMap(world.map);
  ui.addChat('Hệ thống', `Chào mừng ${ch.name} đến với Quỷ Môn Quan!`, 'system');
  if (isNew) {
    ui.addChat('Hệ thống', 'Đến gặp Trưởng Làng (bên trái) để nhận nhiệm vụ đầu tiên. Nhấn Esc để xem phím.', 'system');
    world.timers.push({ t: 1.2, fn: () => { const n = world.npcs.find((x) => x.id === 'truonglang'); if (n) n.say = { text: 'Lại đây, người trẻ tuổi!', t: 4 }; } });
  }
}

function exitGame() {
  doSave();
  world = null;
  ui.detach();
  hudRoot.hidden = true;
  screens.showSelect();
}

let screens;
async function boot() {
  storage = await createStorage();
  ui = new GameUI(hudRoot, input, {
    save: (manual) => { doSave(); if (manual === true) ui.toast('Đã lưu tiến trình'); },
    exit: exitGame,
    logout: () => { doSave(); storage.logout(); world = null; ui.detach(); hudRoot.hidden = true; screens.showAuth('login'); },
    storage,
  });
  screens = new Screens(screenRoot, storage, (ch, isNew) => enterGame(ch, isNew));
  screens.start();
  document.getElementById('boot').remove();
}

// Vòng lặp game: cập nhật logic theo bước cố định 1/60 giây
let last = performance.now(), acc = 0;
const STEP = 1 / 60;
function frame(now) {
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.25) dt = 0.25;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (world) {
    acc += dt;
    while (acc >= STEP) { world.update(STEP, input); input.endFrame(); acc -= STEP; }
    world.render(ctx);
    ui.tick();
    autoSaveT += dt;
    if (autoSaveT > 20) { autoSaveT = 0; doSave(); }
  } else {
    renderTitle(dt);
    input.endFrame();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Công cụ thử nghiệm: chỉ bật khi chạy trên máy (file://, localhost) hoặc thêm ?debug vào địa chỉ.
// Mở DevTools gõ __game() để xem/chỉnh thế giới game.
const DEBUG = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || new URLSearchParams(location.search).has('debug');
if (DEBUG) {
  window.__game = () => world;
  window.__lookFor = lookFor; window.__humSheet = humanoidSheet; window.__drawFrame = drawFrame; window.__Monster = Monster;
}

window.addEventListener('beforeunload', doSave);
document.addEventListener('visibilitychange', () => { if (document.hidden) doSave(); });

boot();

