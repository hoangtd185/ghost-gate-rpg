// Out-of-game screens: login, character select, character creation
import { CLASSES, SKILLS } from '../data/classes.js';
import { MAPS } from '../data/maps.js';
import { STAT_NAMES } from '../data/items.js';
import { humanoidSheet, HUM_W, HUM_H } from '../gfx/humanoid.js';
import { drawFrame } from '../gfx/draw.js';
import { newCharacter, normalizeCharacter } from '../game/character.js';
import { mergeOutbox } from '../storage/storage.js';
import { lookFor } from '../game/entities.js';
import { escapeHtml } from '../engine/util.js';

export class Screens {
  constructor(root, storage, onPlay) {
    this.root = root; this.s = storage; this.onPlay = onPlay;
    this.previews = [];
    this.anim = 0;
    const loop = () => {
      this.anim += 1 / 60;
      for (const p of this.previews) this.drawPreview(p);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  frame(inner) {
    this.root.hidden = false;
    this.root.innerHTML = `<div class="scr">
      <div class="logo"><span class="seal">鬼門關</span><h1>Quỷ Môn Quan</h1><p>Kiếm hiệp · Ma quái · Một mình một cõi giang hồ</p></div>
      <div class="panel">${inner}</div>
      <p class="where">Lưu dữ liệu: ${escapeHtml(this.s.label)}</p></div>`;
  }

  hide() { this.root.hidden = true; this.root.innerHTML = ''; this.previews = []; }

  async start() {
    if (this.s.needsAuth) return this.showAuth('login');
    return this.showSelect();
  }

  showAuth(mode, err = '') {
    this.previews = [];
    this.frame(`<form id="authF" class="auth">
      <div class="tabs"><button type="button" class="${mode === 'login' ? 'on' : ''}" data-m="login">Đăng nhập</button><button type="button" class="${mode === 'register' ? 'on' : ''}" data-m="register">Tạo tài khoản</button></div>
      <label for="aU">Tên tài khoản</label><input id="aU" autocomplete="username" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_]+" placeholder="vd: kiemthan99">
      <label for="aP">Mật khẩu</label><input id="aP" type="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" required minlength="${mode === 'login' ? 4 : 6}" maxlength="64">
      <p class="err" id="aErr">${escapeHtml(err)}</p>
      <button class="primary" type="submit">${mode === 'login' ? 'Vào game' : 'Tạo tài khoản'}</button></form>`);
    this.root.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => this.showAuth(b.dataset.m)));
    this.root.querySelector('#authF').addEventListener('submit', async (e) => {
      e.preventDefault();
      const u = this.root.querySelector('#aU').value.trim(), p = this.root.querySelector('#aP').value;
      try { await this.s.auth(mode, u, p); this.showSelect(); }
      catch (er) { this.root.querySelector('#aErr').textContent = er.message; }
    });
  }

  async showSelect(confirmId = null) {
    let chars = [];
    try { chars = mergeOutbox(this.s, await this.s.list()).map(normalizeCharacter); }
    catch (e) { if (this.s.needsAuth) return this.showAuth('login', 'Phiên đăng nhập hết hạn, hãy đăng nhập lại.'); this.frame(`<p class="err">Không tải được nhân vật: ${escapeHtml(e.message)}</p>`); return; }
    if (!chars.length) return this.showCreate(true);
    chars.sort((a, b) => b.level - a.level);
    this.previews = [];
    const cards = chars.map((c) => `
      <li class="card">
        <canvas width="204" height="186" data-ch="${c.id}"></canvas>
        <div class="info"><h3>${escapeHtml(c.name)}</h3><p>Cấp ${c.level} · ${CLASSES[c.cls].name}</p><p class="muted">${MAPS[c.map] ? MAPS[c.map].name : ''}</p></div>
        <div class="btns">${confirmId === c.id
          ? `<span class="warn">Xoá vĩnh viễn?</span><button class="danger" data-del="${c.id}">Xoá</button><button class="ghost" data-cancel>Không</button>`
          : `<button class="primary" data-play="${c.id}">Vào game</button><button class="ghost icon" data-ask="${c.id}" aria-label="Xoá ${escapeHtml(c.name)}">✕</button>`}</div>
      </li>`).join('');
    this.frame(`<h2>Chọn nhân vật</h2><ul class="chars">${cards}</ul>
      ${chars.length < 6 ? '<button class="ghost wide" id="newC">+ Tạo nhân vật mới</button>' : ''}
      ${this.s.kind === 'api' ? `<button class="link" id="logout">Đăng xuất (${escapeHtml(this.s.username || '')})</button>` : ''}`);
    this.root.querySelectorAll('canvas[data-ch]').forEach((cv) => {
      const c = chars.find((x) => x.id === cv.dataset.ch);
      this.previews.push({ cv, look: lookFor(c), walk: false });
    });
    this.root.querySelectorAll('[data-play]').forEach((b) => b.addEventListener('click', () => { const c = chars.find((x) => x.id === b.dataset.play); this.hide(); this.onPlay(c); }));
    this.root.querySelectorAll('[data-ask]').forEach((b) => b.addEventListener('click', () => this.showSelect(b.dataset.ask)));
    this.root.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', () => this.showSelect()));
    this.root.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => { await this.s.remove(b.dataset.del); this.showSelect(); }));
    const n = this.root.querySelector('#newC'); if (n) n.addEventListener('click', () => this.showCreate(false));
    const lo = this.root.querySelector('#logout'); if (lo) lo.addEventListener('click', () => { this.s.logout(); this.showAuth('login'); });
  }

  showCreate(first) {
    let cls = this.pickCls || 'swordsman';
    const render = () => {
      this.previews = [];
      const c = CLASSES[cls];
      const opts = Object.values(CLASSES).map((k) => `<button type="button" class="cls ${k.id === cls ? 'on' : ''}" data-c="${k.id}"><canvas width="204" height="186" data-cls="${k.id}"></canvas><b>${k.name}</b></button>`).join('');
      const skills = c.skills.map((s) => `<li><b>${SKILLS[s].name}</b> <small>cấp ${SKILLS[s].unlock}</small></li>`).join('');
      const nameVal = this.root.querySelector('#cName') ? this.root.querySelector('#cName').value : '';
      this.frame(`<h2>${first ? 'Tạo nhân vật đầu tiên' : 'Tạo nhân vật mới'}</h2>
        <form id="createF" class="create">
          <div class="clsrow">${opts}</div>
          <div class="clsinfo"><p>${c.desc}</p><p class="muted small">Chỉ số khởi đầu: ${Object.entries(c.base).map(([k, v]) => `${STAT_NAMES[k]} ${v}`).join(' · ')}</p><ul class="sk">${skills}</ul></div>
          <label for="cName">Tên nhân vật</label>
          <input id="cName" required minlength="2" maxlength="14" placeholder="vd: Lý Tiêu Dao" value="${escapeHtml(nameVal)}">
          <p class="err" id="cErr"></p>
          <div class="row">${first ? '' : '<button type="button" class="ghost" id="back">Quay lại</button>'}<button class="primary" type="submit">Bắt đầu hành trình</button></div>
        </form>`);
      this.root.querySelectorAll('canvas[data-cls]').forEach((cv) => {
        const k = CLASSES[cv.dataset.cls];
        this.previews.push({ cv, look: { ...k.look, weapon: k.weapon }, walk: cv.dataset.cls === cls });
      });
      this.root.querySelectorAll('.cls').forEach((b) => b.addEventListener('click', () => { cls = b.dataset.c; this.pickCls = cls; render(); }));
      const back = this.root.querySelector('#back'); if (back) back.addEventListener('click', () => this.showSelect());
      this.root.querySelector('#createF').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = this.root.querySelector('#cName').value.trim().replace(/\s+/g, ' ');
        if (name.length < 2) { this.root.querySelector('#cErr').textContent = 'Tên cần ít nhất 2 ký tự'; return; }
        try {
          const ch = newCharacter(name, cls);
          const saved = await this.s.create(ch);
          this.hide();
          this.onPlay(normalizeCharacter(saved || ch), true);
        } catch (er) { this.root.querySelector('#cErr').textContent = er.message; }
      });
    };
    render();
  }

  drawPreview(p) {
    const ctx = p.cv.getContext('2d');
    const sheet = humanoidSheet(p.look);
    const fr = p.walk ? sheet.frames.walk : sheet.frames.idle;
    const f = fr[Math.floor(this.anim * (p.walk ? 8 : 2)) % fr.length];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, p.cv.width, p.cv.height);
    const k = p.cv.width / HUM_W;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    drawFrame(ctx, sheet, f, 0, 0);
  }
}
