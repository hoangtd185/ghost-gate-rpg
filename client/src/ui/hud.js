// Giao diện trong game (HUD + các cửa sổ) bằng HTML phủ lên canvas
import { CLASSES, SKILLS, SKILL_MAX_LV, SKILL_KEYS, PASSIVES, PASSIVE_MAX_LV, PASSIVE_NAMES, passivesOf } from '../data/classes.js';
import { ITEMS, RARITY, SLOT_NAMES, STAT_NAMES, ENHANCE_MAX, ENHANCE_RATE, ENHANCE_SAFE, enhanceCost, GEM_KINDS, GEM_GRADES, GEM_SLOTS, GEM_FUSE, gemId, socketCount, socketCost, unsocketCost } from '../data/items.js';
import { ELEMENTS, ELEMENT_IDS } from '../data/elements.js';
import { NPCS, QUESTS } from '../data/npcs.js';
import { SPEAKERS, CHAPTERS, SCENES, MAIN_ORDER } from '../data/story.js';
import { RECIPES } from '../data/recipes.js';
import { npcLine, fillText } from '../game/chatter.js';
import { humanoidSheet, HUM_W } from '../gfx/humanoid.js';
import { monsterSheet } from '../gfx/monsters.js';
import { drawFrame } from '../gfx/draw.js';
import { lookFor } from '../game/entities.js';
import { MAPS, GROUND_Y } from '../data/maps.js';
import { iconForItem } from '../gfx/icons.js';
import {
  expToNext, entryStats, equipEntry, unequip, removeEntry, addItem, sellPrice, canEquip,
  questStatus, questProgress, removeItem, resolveItemId, rollEquip, gainExp, upgradeSkill, addStat, INV_SIZE,
  entryElement, entryName, enhanceEntry, countItem, todayKey, questTurnIn,
  socketGem, unsocketGem, fuseGems, gemFits, lineVisible, passiveBlock, learnPassive, resetSkills, resetCost, canCraft, craft,
} from '../game/character.js';
import { SKILL_GLYPH, SKILL_COLOR } from './skillglyphs.js';
import { escapeHtml, fmtNum } from '../engine/util.js';

const $ = (sel, root = document) => root.querySelector(sel);

function itemName(e) {
  return `<span style="color:${RARITY[e.r || 0].color}">${escapeHtml(entryName(e))}</span>`;
}

function elTag(el) {
  return el ? `<span class="eltag" style="--c:${ELEMENTS[el].color}">${ELEMENTS[el].glyph} ${ELEMENTS[el].name}</span>` : '';
}

// NPC đứng ở bản đồ nào
function npcMapName(npcId) {
  const m = Object.values(MAPS).find((mp) => (mp.npcs || []).some((n) => n.id === npcId));
  return m ? m.name : '';
}

// Bản đồ hợp để luyện cấp: cấp đề nghị cao nhất mà người chơi đã vào được
function grindMap(ch) {
  const opened = (m) => Object.values(MAPS).every((mp) => mp.portals.every((pt) => pt.to !== m || ((!pt.lock || questStatus(ch, pt.lock) === 'done') && (!pt.req || questStatus(ch, pt.req) === 'done'))));
  const list = Object.entries(MAPS).filter(([id, m]) => m.spawns.length && !m.spawns.some((sp) => sp.mob === 'boss' || sp.mob === 'qilin' || sp.mob === 'huyenco') && (m.minLv || 1) <= ch.level + 1 && opened(id));
  list.sort((a, b) => (b[1].minLv || 1) - (a[1].minLv || 1));
  return list.length ? list[0][1].name : null;
}

// Nhiệm vụ cốt truyện kế tiếp chưa xong (theo thứ tự tuyến chính)
const MAIN_COUNT = MAIN_ORDER.length;
function nextMainQuest(ch) {
  return MAIN_ORDER.find((qid) => questStatus(ch, qid) !== 'done') || null;
}

// Nhãn loại nhiệm vụ
const CAT = { main: ['story', 'Cốt truyện'], tut: ['tut', 'Hướng dẫn'], side: ['side', 'Phụ'], daily: ['daily', 'Hằng ngày'] };
const catOf = (q) => q.cat || (q.daily ? 'daily' : 'side');
function catTag(q) { const c = CAT[catOf(q)]; return `<span class="qtag ${c[0]}">${c[1]}</span>`; }

// Mô tả phần thưởng nhiệm vụ
function rewardText(q, cls) {
  const r = q.reward, parts = [];
  if (r.exp) parts.push(`${fmtNum(r.exp)} EXP`);
  if (r.gold) parts.push(`${fmtNum(r.gold)} lượng`);
  for (const [id0, n] of r.items || []) {
    if (/^GEM\d$/.test(id0)) { parts.push(`Ngọc ngẫu nhiên (${GEM_GRADES[+id0[3] - 1]})${n > 1 ? ' ×' + n : ''}`); continue; }
    const id = resolveItemId(id0, cls); parts.push(`${ITEMS[id].name}${n > 1 ? ' ×' + n : ''}`);
  }
  for (const [id] of r.random || []) parts.push(`có thể có ${ITEMS[id].name}`);
  if (r.pet) parts.push('pet Tiểu Quỷ');
  if (r.title) parts.push(`danh hiệu 「${r.title}」`);
  return parts.join(' · ');
}

export class GameUI {
  constructor(root, input, callbacks) {
    this.root = root; this.input = input; this.cb = callbacks; // cb: save, exit, logout, storage
    this.open = null; this.selected = null; this.shopNpc = null;
    this.chatLog = [];
    root.innerHTML = `
      <div class="hud-status">
        <div class="hs-top"><span class="hs-lv" id="hLv"></span><span class="hs-name" id="hName"></span></div>
        <div class="bar hp"><i id="hHp"></i><b id="hHpT"></b></div>
        <div class="bar mp"><i id="hMp"></i><b id="hMpT"></b></div>
        <div class="hs-buffs" id="hBuffs"></div>
      </div>
      <div class="hud-map"><div id="hMap"></div><small id="hOnline"></small></div>
      <canvas class="hud-mini" id="hMini" width="160" height="56"></canvas>
      <div class="hud-chat" id="hChat"><div class="chat-log" id="chatLog"></div>
        <form id="chatForm" autocomplete="off"><input id="chatIn" maxlength="80" placeholder="Enter để chat…" aria-label="Tin nhắn chat"></form></div>
      <div class="hud-bar" id="hSkills"></div>
      <div class="hud-menu">
        <button data-win="inv" title="Túi đồ (I)">Túi đồ<kbd>I</kbd></button>
        <button data-win="char" title="Nhân vật (C)">Nhân vật<kbd>C</kbd></button>
        <button data-win="skill" title="Kỹ năng (K)">Kỹ năng<kbd>K</kbd></button>
        <button data-win="quest" title="Nhiệm vụ (L)">Nhiệm vụ<kbd>L</kbd></button>
        <button data-win="sys" title="Hệ thống (Esc)">☰<kbd>Esc</kbd></button>
      </div>
      <div class="hud-track" id="hTrack"></div>
      <div class="hud-exp"><i id="hExp"></i><b id="hExpT"></b></div>
      <div class="hud-toasts" id="hToasts"></div>
      <div class="hud-banner" id="hBanner"></div>
      <div class="hud-save" id="hSave"></div>
      <div class="win" id="win" hidden></div>
      <div class="touch" id="touch" hidden>
        <div class="tpad"><button data-k="left" aria-label="Trái">◀</button><div class="tcol"><button data-k="up" aria-label="Lên">▲</button><button data-k="down" aria-label="Xuống">▼</button></div><button data-k="right" aria-label="Phải">▶</button></div>
        <div class="tact"><button data-k="jump" class="big">Nhảy</button><button data-k="attack" class="big atk">Đánh</button><button data-k="interact">Nói</button></div>
      </div>`;
    this.bindStatic();
  }

  bindStatic() {
    this.root.querySelectorAll('.hud-menu button').forEach((b) => b.addEventListener('click', () => this.toggle(b.dataset.win)));
    const form = $('#chatForm', this.root), inp = $('#chatIn', this.root);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const t = inp.value.trim();
      inp.value = ''; inp.blur();
      if (!t || !this.world) return;
      this.addChat(this.world.ch.name, t, 'me');
      this.world.player.say = { text: t, t: 4 };
      this.world.bots.onPlayerChat(t);
    });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Escape') inp.blur(); });
    // Nút cảm ứng
    // Nút cảm ứng chỉ hiện khi người chơi chạm màn hình thật
    window.addEventListener('touchstart', () => { $('#touch', this.root).hidden = false; }, { once: true, passive: true });
    this.root.querySelectorAll('#touch button').forEach((b) => {
      const k = b.dataset.k;
      const on = (e) => { e.preventDefault(); this.input.setVirtual(k, true); b.classList.add('on'); };
      const off = (e) => { e.preventDefault(); this.input.setVirtual(k, false); b.classList.remove('on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
    });
    this.input.onKey = (e) => {
      if (!this.world) return;
      if (this.open === 'dialog' && (e.code === 'Enter' || e.code === 'KeyE' || e.code === 'Space')) { e.preventDefault(); this.input.clear(); this.act('dnext', {}); return; }
      if (e.code === 'Enter') { e.preventDefault(); $('#chatIn', this.root).focus(); }
      else if (e.code === 'KeyI') this.toggle('inv');
      else if (e.code === 'KeyC') this.toggle('char');
      else if (e.code === 'KeyK') this.toggle('skill');
      else if (e.code === 'KeyL') this.toggle('quest');
      else if (e.code === 'KeyP') this.togglePet();
      else if (e.code === 'Escape') { if (this.open) this.close(); else this.toggle('sys'); }
    };
  }

  attach(world) {
    this.world = world; this.ch = world.ch;
    this.buildSkillbar();
    this.refreshAll();
    $('#hOnline', this.root).textContent = `${world.bots.onlineCount() + 1} người đang online`;
  }
  detach() { this.world = null; this.close(); }

  // ================= HUD =================
  buildSkillbar() {
    const ch = this.ch;
    const cls = CLASSES[ch.cls];
    const slots = cls.skills.map((sid, i) => `
      <button class="slot skill" style="--c:${SKILL_COLOR[sid]}" data-i="${i}" data-sid="${sid}" title="${escapeHtml(SKILLS[sid].name)}">
        <span class="glyph" style="color:${SKILL_COLOR[sid]}">${SKILL_GLYPH[sid]}</span><kbd>${SKILL_KEYS[i]}</kbd><span class="cd"></span><span class="lock"></span></button>`).join('');
    const pots = ['hp_s', 'mp_s'].map((id, i) => `
      <button class="slot pot" data-pot="${i ? 'mp' : 'hp'}" title="${ITEMS[id].name}"><img src="${iconForItem(ITEMS[id]).url}" alt=""><kbd>${i + 1}</kbd><span class="qty"></span><span class="cd"></span></button>`).join('');
    const bar = $('#hSkills', this.root);
    bar.innerHTML = slots + '<span class="sep"></span>' + pots;
    const actions = ['attack', 'skill1', 'skill2', 'skill3'];
    bar.querySelectorAll('.skill').forEach((b) => {
      const k = actions[+b.dataset.i];
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.input.setVirtual(k, true); });
      const up = () => this.input.setVirtual(k, false);
      b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up);
    });
    bar.querySelectorAll('.pot').forEach((b) => b.addEventListener('click', () => this.world.usePotion(b.dataset.pot)));
  }

  refreshAll() { this.refreshBars(); this.refreshSkillbar(); this.refreshTracker(); if (this.open) this.renderWin(); }

  // Bảng theo dõi nhiệm vụ góc phải: cốt truyện trước, rồi hướng dẫn, tối đa 3 dòng
  refreshTracker() {
    const ch = this.ch, el = $('#hTrack', this.root);
    const order = { main: 0, tut: 1, side: 2, daily: 3 };
    const act = Object.keys(ch.quests).filter((qid) => QUESTS[qid] && ['active', 'ready'].includes(questStatus(ch, qid)))
      .sort((a, b) => order[catOf(QUESTS[a])] - order[catOf(QUESTS[b])]);
    const hasMain = act.some((qid) => catOf(QUESTS[qid]) === 'main');
    act.length = Math.min(act.length, hasMain ? 3 : 2);
    let html = act.map((qid) => {
      const q = QUESTS[qid], s = questStatus(ch, qid);
      const goal = s === 'ready' ? `<em class="good">Xong · gặp ${NPCS[questTurnIn(q)].name}</em>`
        : q.type === 'talk' ? `<em>Gặp ${NPCS[q.target].name} · ${npcMapName(q.target)}</em>`
        : `<em>${questProgress(ch, qid)} / ${q.count}</em>`;
      return `<li class="${catOf(q)}"><b>${escapeHtml(q.name)}</b>${goal}</li>`;
    }).join('');
    if (!hasMain) {
      const next = nextMainQuest(ch);
      if (next) {
        const nq = QUESTS[next], st = questStatus(ch, next);
        const g = st === 'locked' && ch.level < nq.lv ? grindMap(ch) : null;
        const sub = st === 'available' ? 'Gặp ' + NPCS[nq.npc].name + ' · ' + npcMapName(nq.npc) : `Cần cấp ${nq.lv}${g ? ' · luyện ở ' + g : ''}`;
        html = `<li class="main hint"><b>${escapeHtml(nq.name)}</b><em>${sub}</em></li>` + html;
      }
    }
    if (el._h !== html) { el.innerHTML = html ? `<ul>${html}</ul>` : ''; el._h = html; }
  }

  refreshBars() {
    const ch = this.ch, st = this.world.stats;
    $('#hLv', this.root).textContent = 'Lv.' + ch.level;
    $('#hName', this.root).textContent = ch.name + ' · ' + CLASSES[ch.cls].name;
    $('#hHp', this.root).style.width = (100 * ch.hp / st.maxHp) + '%';
    $('#hMp', this.root).style.width = (100 * ch.mp / st.maxMp) + '%';
    $('#hHpT', this.root).textContent = `${Math.ceil(ch.hp)} / ${st.maxHp}`;
    $('#hMpT', this.root).textContent = `${Math.ceil(ch.mp)} / ${st.maxMp}`;
    const need = expToNext(ch.level);
    $('#hExp', this.root).style.width = (100 * ch.exp / need) + '%';
    $('#hExpT', this.root).textContent = `EXP ${fmtNum(ch.exp)} / ${fmtNum(need)}  (${(100 * ch.exp / need).toFixed(1)}%)`;
  }

  refreshSkillbar() {
    const ch = this.ch;
    this.root.querySelectorAll('.slot.skill').forEach((b) => {
      const sid = b.dataset.sid;
      const learned = !!ch.skills[sid];
      b.classList.toggle('locked', !learned);
      $('.lock', b).textContent = learned ? '' : 'Lv' + SKILLS[sid].unlock;
    });
    this.root.querySelectorAll('.slot.pot').forEach((b) => {
      const ids = b.dataset.pot === 'hp' ? ['hp_s', 'hp_l'] : ['mp_s', 'mp_l'];
      const n = ch.inventory.filter((e) => ids.includes(e.id)).reduce((a, e) => a + e.qty, 0);
      $('.qty', b).textContent = n;
      b.classList.toggle('empty', n === 0);
    });
  }

  // Gọi mỗi frame: hồi chiêu, buff, minimap
  tick() {
    const w = this.world; if (!w) return;
    const p = w.player, ch = this.ch;
    this.root.querySelectorAll('.slot.skill').forEach((b) => {
      const sk = SKILLS[b.dataset.sid];
      const left = p.cooldowns[b.dataset.sid] || 0;
      const k = sk.cd > 0.6 ? left / sk.cd : 0;
      $('.cd', b).style.background = k > 0 ? `conic-gradient(rgba(8,6,12,.72) ${k * 360}deg, transparent 0)` : 'none';
      b.classList.toggle('nomp', ch.mp < sk.mp);
    });
    const bf = $('#hBuffs', this.root);
    const html = p.buffs.map((b) => `<span title="${escapeHtml(b.name)}">${SKILL_GLYPH[b.sid]}<small>${Math.ceil(b.t)}</small></span>`).join('');
    if (bf._h !== html) { bf.innerHTML = html; bf._h = html; }
    this.drawMinimap();
  }

  drawMinimap() {
    const w = this.world, c = $('#hMini', this.root), ctx = c.getContext('2d');
    const sx = c.width / w.map.width, sy = c.height / 360;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(10,8,16,0.72)'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#5e4a2c';
    ctx.fillRect(0, GROUND_Y * sy, c.width, 2);
    for (const pl of w.map.platforms) ctx.fillRect(pl.x * sx, pl.y * sy, Math.max(2, pl.w * sx), 2);
    ctx.fillStyle = '#8af0ff';
    for (const pt of w.portals) ctx.fillRect(pt.x * sx - 2, GROUND_Y * sy - 6, 4, 6);
    ctx.fillStyle = '#ffd36a';
    for (const n of w.npcs) ctx.fillRect(n.cx * sx - 1.5, n.y * sy, 3, 4);
    ctx.fillStyle = '#e8443a';
    for (const m of w.monsters) if (!m.dead) ctx.fillRect(m.cx * sx - 1, m.cy * sy - 1, m.def.boss ? 5 : 2, m.def.boss ? 5 : 2);
    ctx.fillStyle = '#9fe0ff';
    for (const b of w.bots.list) ctx.fillRect(b.cx * sx - 1, b.y * sy, 2, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(w.player.cx * sx - 2, w.player.y * sy - 1, 4, 5);
  }

  setMap(map) {
    $('#hMap', this.root).textContent = map.name;
    setTimeout(() => this.checkScenes(), 900);
    const b = $('#hBanner', this.root);
    b.innerHTML = `<small>${map.safe ? 'Khu an toàn' : 'Cấp đề nghị ' + (map.minLv || 1) + '+'}</small>${escapeHtml(map.name)}`;
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  }

  banner(html) {
    const b = $('#hBanner', this.root);
    b.innerHTML = html;
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  }

  toast(msg, kind = '') {
    const box = $('#hToasts', this.root);
    const el = document.createElement('div');
    el.className = 'toast ' + kind; el.innerHTML = msg;
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3200);
  }

  saveStatus(state, msg) {
    const el = $('#hSave', this.root);
    el.textContent = state === 'saving' ? 'Đang lưu…' : state === 'saved' ? 'Đã lưu' : 'Lưu thất bại: ' + (msg || '');
    el.className = 'hud-save show ' + state;
    clearTimeout(this._saveT);
    if (state !== 'saving') this._saveT = setTimeout(() => (el.className = 'hud-save'), 1800);
  }

  addChat(name, msg, type) {
    const log = $('#chatLog', this.root);
    const el = document.createElement('div');
    el.className = 'cl ' + type;
    const tag = type === 'world' ? '[Thế giới] ' : type === 'system' ? '[Hệ thống] ' : type === 'npc' ? '[NPC] ' : '';
    el.innerHTML = type === 'system' ? `${tag}${escapeHtml(msg)}` : `${tag}<b>${escapeHtml(name)}</b>: ${escapeHtml(msg)}`;
    log.appendChild(el);
    while (log.children.length > 40) log.firstChild.remove();
    log.scrollTop = log.scrollHeight;
  }

  // ================= CỬA SỔ =================
  toggle(name) { if (this.open === name) this.close(); else { this.open = name; this.selected = null; this.renderWin(); } }
  close() { this.open = null; this.shopNpc = null; this.npcId = null; $('#win', this.root).hidden = true; }

  renderWin() {
    const w = $('#win', this.root);
    w.hidden = false;
    const body = {
      inv: () => this.winInventory(), char: () => this.winChar(), skill: () => this.winSkills(), quest: () => this.winQuests(),
      sys: () => this.winSystem(), npc: () => this.winNpc(), craft: () => this.winCraft(), shop: () => this.winShop(), death: () => this.winDeath(), forge: () => this.winForge(), dialog: () => this.winDialog(),
    }[this.open]();
    const titles = { inv: 'Túi đồ', char: 'Nhân vật', skill: 'Kỹ năng', quest: 'Nhiệm vụ', sys: 'Hệ thống', npc: '', shop: 'Cửa hàng', death: '', forge: 'Lò rèn của Anh Sắt', craft: 'Tú Nương · Chế tạo', dialog: '' };
    const title = this.open === 'npc' ? NPCS[this.npcId].name : this.open === 'shop' ? NPCS[this.shopNpc].name + ' · Cửa hàng' : titles[this.open];
    w.className = 'win w-' + this.open;
    w.innerHTML = (title ? `<header><h2>${escapeHtml(title)}</h2>${this.open === 'death' ? '' : '<button class="x" data-act="close" aria-label="Đóng">✕</button>'}</header>` : '') + `<div class="wb">${body}</div>`;
    w.querySelectorAll('[data-act]').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); this.act(el.dataset.act, el.dataset); }));
    if (this.open === 'dialog') this.drawPortrait();
  }

  slotHtml(e, extraCls = '', act = 'sel') {
    if (!e) return `<div class="islot empty ${extraCls}"></div>`;
    const it = ITEMS[e.id];
    const sel = this.selected === e.uid ? ' sel' : '';
    return `<button class="islot r${e.r || 0}${sel} ${extraCls}" data-act="${act}" data-uid="${e.uid}" title="${escapeHtml(it.name)}">
      <img src="${iconForItem(it).url}" alt="">${e.qty > 1 ? `<small>${e.qty}</small>` : ''}${e.e ? `<i class="plusn">+${e.e}</i>` : ''}${entryElement(e) ? `<i class="eldot" style="background:${ELEMENTS[entryElement(e)].color}"></i>` : ''}${e.g && e.g.length ? `<i class="gemdots">${e.g.map((id) => `<b style="background:${ITEMS[id].color}"></b>`).join('')}</i>` : ''}</button>`;
  }

  itemDetail(e, mode) {
    if (!e) return '<p class="muted">Chọn một món để xem chi tiết.</p>';
    const it = ITEMS[e.id], ch = this.ch;
    const stats = it.type === 'equip' ? entryStats(e) : null;
    const err = it.type === 'equip' ? canEquip(ch, e) : null;
    const equipped = Object.values(ch.equip).some((x) => x && x.uid === e.uid);
    let html = `<h3>${itemName(e)}</h3>`;
    html += `<p class="tag">${it.type === 'equip' ? `${SLOT_NAMES[it.slot]} · ${RARITY[e.r || 0].name}${it.cls ? ' · ' + CLASSES[it.cls].name : ''} · Cấp ${it.lv || 1}` : it.type === 'use' ? 'Tiêu hao' : it.type === 'quest' ? 'Vật phẩm nhiệm vụ' : it.type === 'gem' ? `Ngọc khảm · Phẩm ${GEM_GRADES[it.gem.g - 1]}` : 'Nguyên liệu'}</p>`;
    if (it.slot === 'weapon') html += `<p>Hệ: ${elTag(entryElement(e)) || '<span class="muted">Không (dùng ngọc nguyên tố để khảm)</span>'}</p>`;
    if (stats) html += '<ul class="stats">' + Object.entries(stats).map(([k, v]) => `<li><span>${STAT_NAMES[k]}</span><b>+${v}</b></li>`).join('') + '</ul>';
    if (it.type === 'equip' && it.slot !== 'outfit') html += `<p class="sockets">Lỗ khảm: ${this.socketHtml(e)}</p>`;
    if (it.slot === 'outfit') html += `<p class="outfit-note">Ngoại trang thay đổi diện mạo nhân vật${it.look && it.look.aura ? ', có hào quang' : ''}.</p>${it.src ? `<p class="muted small">Nguồn: ${escapeHtml(it.src)}</p>` : ''}`;
    if (it.type === 'gem') html += `<p class="muted small">Ép được vào: ${Object.entries(GEM_SLOTS).filter(([, ks]) => ks.includes(it.gem.kind)).map(([sl]) => SLOT_NAMES[sl]).join(', ')}. Ép ở Thợ Rèn.</p>`;
    if (it.desc) html += `<p>${escapeHtml(it.desc)}</p>`;
    if (it.src && it.type !== 'equip') html += `<p class="muted small">Rơi từ: ${escapeHtml(it.src)}</p>`;
    if (it.type === 'mat' && RECIPES.some((r) => r.need.some(([id]) => id === it.id))) html += `<p class="muted small">Dùng để chế tạo ở Tú Nương (Làng Trúc Lâm).</p>`;
    if (err && !equipped) html += `<p class="bad">${escapeHtml(err)}</p>`;
    html += '<div class="acts">';
    if (mode === 'sell') {
      if (it.type === 'quest') html += '<span class="muted small">Không bán được vật phẩm nhiệm vụ.</span>';
      else if (!equipped) html += `<button data-act="sell" data-uid="${e.uid}">Bán 1 · ${sellPrice(e)} lượng</button>` + (e.qty > 1 ? `<button data-act="sellall" data-uid="${e.uid}">Bán hết · ${sellPrice(e) * e.qty}</button>` : '');
    } else if (equipped) html += `<button data-act="unequip" data-slot="${it.slot}">Tháo ra</button>`;
    else {
      if (it.type === 'use') html += `<button data-act="use" data-uid="${e.uid}">Dùng</button>`;
      if (it.type === 'equip') html += `<button data-act="equip" data-uid="${e.uid}" ${err ? 'disabled' : ''}>Trang bị</button>`;
      html += `<button class="ghost" data-act="drop" data-uid="${e.uid}">Vứt bỏ</button>`;
    }
    return html + '</div>';
  }

  // Lỗ khảm: viên ngọc đã ép hoặc ô trống
  socketHtml(e, act) {
    const n = socketCount(e), out = [];
    for (let i = 0; i < n; i++) {
      const id = (e.g || [])[i];
      if (id) {
        const g = ITEMS[id];
        out.push(act ? `<button class="sock full" data-act="${act}" data-i="${i}" title="Gỡ ${escapeHtml(g.name)} · ${fmtNum(unsocketCost(g.gem.g))} lượng" style="--c:${g.color}"><img src="${iconForItem(g).url}" alt=""></button>`
          : `<span class="sock full" style="--c:${g.color}" title="${escapeHtml(g.name)}"><img src="${iconForItem(g).url}" alt=""></span>`);
      } else out.push(`<span class="sock" title="Lỗ trống"></span>`);
    }
    return out.join('');
  }

  findEntry(uid) {
    const ch = this.ch;
    return ch.inventory.find((x) => x.uid === uid) || Object.values(ch.equip).find((x) => x && x.uid === uid) || null;
  }

  winInventory(mode = 'inv') {
    const ch = this.ch;
    const eq = ['weapon', 'hat', 'armor', 'acc', 'outfit'].map((s) => `<div class="eqs"><label>${SLOT_NAMES[s]}</label>${this.slotHtml(ch.equip[s])}</div>`).join('');
    const cells = [];
    for (let i = 0; i < INV_SIZE; i++) cells.push(this.slotHtml(ch.inventory[i]));
    const sel = this.selected && this.findEntry(this.selected);
    return `<div class="inv">
      ${mode === 'inv' ? `<div class="equip">${eq}</div>` : ''}
      <div><div class="grid">${cells.join('')}</div><p class="gold"><span>Ngân lượng</span><b>${fmtNum(ch.gold)}</b></p><p class="muted small">${ch.inventory.length}/${INV_SIZE} ô</p></div>
      <div class="detail">${this.itemDetail(sel, mode)}</div></div>`;
  }

  winChar() {
    const ch = this.ch, st = this.world.stats, c = CLASSES[ch.cls];
    const row = (k, label, help) => `<li><span>${label}<small>${help}</small></span><b>${st[k]}</b>${ch.statPoints > 0 ? `<button class="plus" data-act="stat" data-stat="${k}" aria-label="Cộng ${label}">+</button>` : ''}</li>`;
    const h = Math.floor(ch.playTime / 3600), m = Math.floor((ch.playTime % 3600) / 60);
    return `<div class="char">
      <div><p class="cls">${c.name}<small>Chỉ số chính: ${STAT_NAMES[c.main]}</small></p>
      <ul class="stats big">${row('str', 'Sức', 'Công Kiếm Khách')}${row('dex', 'Nhanh', 'Công Thích Khách, chí mạng')}${row('int', 'Trí', 'Công Đạo Sĩ, nội lực')}${row('vit', 'Thể', 'Máu, phòng thủ')}</ul>
      <p class="pts">Điểm tiềm năng còn lại: <b>${ch.statPoints}</b></p></div>
      <div><ul class="stats">
        <li><span>Cấp</span><b>${ch.level}</b></li><li><span>Công</span><b>${st.atk}</b></li><li><span>Thủ</span><b>${st.def}</b></li>
        <li><span>Máu tối đa</span><b>${st.maxHp}</b></li><li><span>Nội lực tối đa</span><b>${st.maxMp}</b></li>
        <li><span>Chí mạng</span><b>${st.crit.toFixed(1)}%</b></li><li><span>Ngân lượng</span><b>${fmtNum(ch.gold)}</b></li>
        <li><span>Thời gian chơi</span><b>${h}g ${m}p</b></li></ul>
      <div class="resrow"><span class="muted small">Hệ vũ khí</span>${elTag(st.el) || '<span class="muted small">Không</span>'}</div>
      <div class="resrow">${ELEMENT_IDS.map((el) => `<span class="res" style="--c:${ELEMENTS[el].color}" title="Kháng ${ELEMENTS[el].name}">${ELEMENTS[el].glyph}<b>${st.res[el]}%</b></span>`).join('')}</div>
      ${ch.title ? `<p class="titlep">Danh hiệu: <b>「${escapeHtml(ch.title)}」</b></p>` : ''}
      <div class="petbox">${ch.pet
        ? `<p><b>Tiểu Quỷ</b> <span class="muted small">${ch.pet.on ? 'đang theo bạn, tự nhặt đồ trong tầm' : 'đang nghỉ'}</span></p><button data-act="pet">${ch.pet.on ? 'Cất Tiểu Quỷ' : 'Gọi Tiểu Quỷ'} <kbd>P</kbd></button>`
        : '<p class="muted small">Chưa có pet. Làm nhiệm vụ <b>Bạn Đồng Hành Nhỏ</b> ở Trưởng Làng để nhận Tiểu Quỷ, con ma nhỏ nhặt đồ giúp bạn.</p>'}</div></div></div>`;
  }

  winSkills() {
    const ch = this.ch, tab = this.skillTab || 'act';
    const head = `<div class="tabs"><button class="${tab === 'act' ? 'on' : ''}" data-act="stab" data-t="act">Chiêu thức</button><button class="${tab === 'pas' ? 'on' : ''}" data-act="stab" data-t="pas">Nội công <small>(bị động)</small></button>
      <span class="gold">Điểm kỹ năng <b>${ch.skillPoints}</b></span></div>`;
    return head + (tab === 'act' ? this.skillsActive() : this.skillsPassive());
  }

  skillsActive() {
    const ch = this.ch, pas = this.world.stats.pas;
    const list = CLASSES[ch.cls].skills.map((sid, i) => {
      const sk = SKILLS[sid], lv = ch.skills[sid];
      const can = lv && ch.skillPoints > 0 && lv < SKILL_MAX_LV;
      const mp = Math.ceil(sk.mp * (1 - pas.mpCost / 100));
      return `<li class="${lv ? '' : 'locked'}" style="--c:${SKILL_COLOR[sid]}"><span class="glyph" style="color:${SKILL_COLOR[sid]}">${SKILL_GLYPH[sid]}</span>
        <div><h3>${sk.name} <kbd>${SKILL_KEYS[i]}</kbd> ${lv ? `<small>Cấp ${lv}/${SKILL_MAX_LV}</small>` : `<small>Mở ở cấp ${sk.unlock}</small>`}</h3>
        <p>${sk.desc}</p><p class="muted small">Nội lực ${mp} · Hồi chiêu ${sk.cd}s${sk.mult ? ` · Sát thương ${Math.round(sk.mult * (1 + 0.12 * ((lv || 1) - 1)) * 100)}%${lv && lv < SKILL_MAX_LV ? ` → ${Math.round(sk.mult * (1 + 0.12 * lv) * 100)}%` : ''}` : ''}</p></div>
        ${can ? `<button class="plus" data-act="skillup" data-sid="${sid}" aria-label="Nâng ${sk.name}">+</button>` : ''}</li>`;
    }).join('');
    return `<p class="muted small">+1 điểm mỗi cấp. Mỗi cấp chiêu +12% sát thương. Điểm dùng chung với Nội công.</p><ul class="skills">${list}</ul>`;
  }

  // Cây nội công: 4 tầng nối nhau, tầng dưới cần tầng trên đạt cấp yêu cầu
  skillsPassive() {
    const ch = this.ch;
    const fx = (per, lv) => Object.entries(per).map(([k, v]) => `${PASSIVE_NAMES[k][0]} +${+(v * lv).toFixed(1)}${PASSIVE_NAMES[k][1]}`).join(', ');
    const nodes = passivesOf(ch.cls).map((id, i) => {
      const ps = PASSIVES[id], lv = ch.skills[id] || 0;
      const block = passiveBlock(ch, id);
      const locked = ch.level < ps.unlock || (ps.req && (ch.skills[ps.req[0]] || 0) < ps.req[1]);
      const pips = Array.from({ length: PASSIVE_MAX_LV }, (_, k) => `<i class="${k < lv ? 'on' : ''}"></i>`).join('');
      return `${i ? `<div class="pt-link ${locked ? '' : 'open'}"><span>${ps.req ? `${PASSIVES[ps.req[0]].name} ≥ ${ps.req[1]} · Cấp ${ps.unlock}` : ''}</span></div>` : ''}
        <div class="pt-node ${locked ? 'locked' : ''} ${lv ? 'learned' : ''}">
          <span class="pt-glyph">${ps.glyph}</span>
          <div class="pt-body"><h3>${ps.name} <small>${lv}/${PASSIVE_MAX_LV}</small></h3>
            <div class="pips">${pips}</div>
            <p class="muted small">${escapeHtml(ps.desc)}</p>
            <p class="small">${lv ? `Hiện tại: <b>${fx(ps.per, lv)}</b>` : `Mở ở cấp ${ps.unlock}`}</p>
            ${lv < PASSIVE_MAX_LV ? `<p class="small next">Cấp ${lv + 1}: ${fx(ps.per, lv + 1)}</p>` : ''}
          </div>
          ${block ? `<span class="pt-why">${escapeHtml(block)}</span>` : `<button class="plus" data-act="pasup" data-pid="${id}" aria-label="Học ${ps.name}">+</button>`}
        </div>`;
    }).join('');
    const cost = resetCost(ch);
    return `<div class="ptree">${nodes}</div>
      <div class="reset"><span class="muted small">Tẩy điểm: trả lại toàn bộ điểm kỹ năng để cộng lại từ đầu.</span>
      <button class="ghost" data-act="sreset" ${ch.gold < cost ? 'disabled' : ''}>Tẩy điểm · ${fmtNum(cost)} lượng</button></div>`;
  }

  winQuests() {
    const ch = this.ch;
    const groups = { active: [], main: [], tut: [], side: [], daily: [], done: [] };
    const order = { main: 0, tut: 1, side: 2, daily: 3 };
    const ids = Object.keys(QUESTS).sort((a, b) => order[catOf(QUESTS[a])] - order[catOf(QUESTS[b])]);
    for (const qid of ids) {
      const s = questStatus(ch, qid), q = QUESTS[qid];
      const tags = catTag(q) + (q.chapter ? ` <span class="chap">${escapeHtml(CHAPTERS[q.chapter])}</span>` : '');
      if (s === 'active' || s === 'ready') {
        const prog = q.type === 'talk' ? `<p class="muted small">Đến gặp ${NPCS[q.target].name} ở ${npcMapName(q.target)}.</p>`
          : `<div class="prog"><i style="width:${100 * questProgress(ch, qid) / q.count}%"></i><b>${questProgress(ch, qid)} / ${q.count}</b></div>`;
        groups.active.push(`<li class="${s} c-${catOf(q)}"><h3>${q.name} ${tags}</h3><p>${escapeHtml(fillText(q.text, ch))}</p>${prog}
          ${q.hint ? `<p class="qhint">💡 ${escapeHtml(fillText(q.hint, ch))}</p>` : ''}
          <p class="reward">Thưởng: ${rewardText(q, ch.cls)}</p>
          ${s === 'ready' ? `<p class="good">Đã xong! Đến gặp ${NPCS[questTurnIn(q)].name} (${npcMapName(questTurnIn(q))}).</p>` : ''}</li>`);
      } else if (s === 'available') {
        groups[catOf(q)].push(`<li class="c-${catOf(q)}"><h3>${q.name} ${tags}</h3><p class="muted">Gặp ${NPCS[q.npc].name} ở ${npcMapName(q.npc)}. Cấp ${q.lv}+</p><p class="reward">Thưởng: ${rewardText(q, ch.cls)}</p></li>`);
      } else if (s === 'done' && catOf(q) === 'main') groups.done.push(`<li class="done"><h3>${q.name} <span class="chap">${escapeHtml(CHAPTERS[q.chapter])}</span></h3></li>`);
    }
    const next = nextMainQuest(ch);
    const nextMsg = next && questStatus(ch, next) === 'locked' ? `<li class="muted">Cốt truyện tiếp theo: <b>${QUESTS[next].name}</b> mở ở cấp ${QUESTS[next].lv}.</li>` : '';
    const sec = (title, arr, empty) => `<h4>${title}</h4><ul class="quests">${arr.join('') || (empty ? `<li class="muted">${empty}</li>` : '')}</ul>`;
    const nMain = MAIN_COUNT, nDone = Object.keys(QUESTS).filter((id) => catOf(QUESTS[id]) === 'main' && questStatus(ch, id) === 'done').length;
    return `<p class="muted small">Tiến độ cốt truyện: <b>${nDone}/${nMain}</b></p>`
      + sec('Đang làm', groups.active, 'Chưa nhận nhiệm vụ nào.')
      + sec('Cốt truyện', groups.main.length ? groups.main : nextMsg ? [nextMsg] : [], nDone >= nMain ? 'Bạn đã đi hết cốt truyện hiện có.' : 'Hoàn thành nhiệm vụ đang làm để mở tiếp.')
      + (groups.tut.length ? sec('Hướng dẫn', groups.tut) : '')
      + (groups.side.length ? sec('Nhiệm vụ phụ', groups.side) : '')
      + (groups.daily.length ? sec('Hằng ngày', groups.daily) : '')
      + (groups.done.length ? `<details><summary>Cốt truyện đã qua (${groups.done.length})</summary><ul class="quests">${groups.done.join('')}</ul></details>` : '');
  }

  winSystem() {
    const s = this.cb.storage;
    return `<div class="sys">
      <p class="muted">Dữ liệu được lưu tại: <b>${s.label}</b>${s.username ? ` · tài khoản <b>${escapeHtml(s.username)}</b>` : ''}. Game tự lưu mỗi 20 giây.</p>
      <div class="acts col"><button data-act="save">Lưu ngay</button><button data-act="switch">Đổi nhân vật</button>${s.kind === 'api' ? '<button data-act="logout" class="ghost">Đăng xuất</button>' : ''}</div>
      <h4>Phím điều khiển</h4>
      <table class="keys"><tr><td><kbd>←</kbd><kbd>→</kbd></td><td>Di chuyển</td><td><kbd>Space</kbd> / <kbd>X</kbd></td><td>Nhảy (giữ = cao hơn, nhấn 2 lần = nhảy đôi)</td></tr>
      <tr><td><kbd>↓</kbd>+<kbd>Space</kbd></td><td>Nhảy xuống bục</td><td><kbd>↓</kbd></td><td>Ngồi nghỉ (hồi nhanh)</td></tr>
      <tr><td><kbd>Z</kbd> / <kbd>J</kbd></td><td>Đánh thường (giữ)</td><td><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></td><td>Kỹ năng</td></tr>
      <tr><td><kbd>1</kbd> <kbd>2</kbd></td><td>Bình máu / linh khí</td><td><kbd>↑</kbd> / <kbd>E</kbd></td><td>Qua cổng, nói chuyện</td></tr>
      <tr><td><kbd>I</kbd><kbd>C</kbd><kbd>K</kbd><kbd>L</kbd></td><td>Các cửa sổ</td><td><kbd>Enter</kbd></td><td>Chat</td></tr>
      <tr><td><kbd>P</kbd></td><td>Gọi / cất pet Tiểu Quỷ</td><td></td><td></td></tr></table></div>`;
  }

  winNpc() {
    const npc = NPCS[this.npcId], ch = this.ch;
    let html = `<p class="npc-title">${escapeHtml(npc.title)}</p>`;
    if (!this.npcGreet) this.npcGreet = npcLine(ch, this.npcId, 'greet') || '…';
    html += `<blockquote>${escapeHtml(this.npcMsg ? fillText(this.npcMsg, ch) : this.npcGreet)}</blockquote>`;
    if (this.npcQuest) html += `<p class="reward">Thưởng: ${rewardText(QUESTS[this.npcQuest], ch.cls)}</p>`;
    html += '<div class="opts">';
    // việc cần trả ở NPC này (kể cả nhiệm vụ do người khác giao)
    for (const [qid, q] of Object.entries(QUESTS)) {
      if (questTurnIn(q) !== this.npcId) continue;
      const s = questStatus(ch, qid);
      const tag = catOf(q) === 'side' ? '' : catTag(q) + ' ';
      if (s === 'ready') html += `<button class="good" data-act="qdone" data-q="${qid}"><em>?</em> ${tag}Hoàn thành: ${q.name}</button>`;
      else if (s === 'active' && q.type === 'talk' && q.npc !== this.npcId) html += `<button class="good" data-act="qtalk" data-q="${qid}"><em>▸</em> ${tag}${q.name}</button>`;
    }
    for (const qid of npc.quests || []) {
      const s = questStatus(ch, qid), q = QUESTS[qid];
      const tag = catOf(q) === 'side' ? '' : catTag(q) + ' ';
      if (s === 'available') html += `<button class="${catOf(q) === 'main' ? 'storybtn' : catOf(q) === 'tut' ? 'tutbtn' : ''}" data-act="qaccept" data-q="${qid}"><em>!</em> ${tag}${q.name} <small>Cấp ${q.lv}</small></button>`;
      else if (s === 'active' && !(q.type === 'talk' && q.target === this.npcId)) html += `<button class="ghost" data-act="qinfo" data-q="${qid}">${q.name} · ${q.type === 'talk' ? 'gặp ' + NPCS[q.target].name : questProgress(ch, qid) + '/' + q.count}</button>`;
    }
    if (npc.shop) html += `<button data-act="shop">Mua bán</button>`;
    if (npc.forge) html += `<button data-act="forge"><em>✦</em> Lò rèn · Cường hóa, ép ngọc</button>`;
    if (npc.craft) html += `<button data-act="craftwin"><em>✿</em> Chế tạo · Thêu ngoại trang</button>`;
    html += `<button class="ghost" data-act="close">Tạm biệt</button></div>`;
    return html;
  }

  // ===== Hội thoại cốt truyện =====
  startDialog(lines, opts) {
    // lọc câu theo cờ cốt truyện và chèn tên người chơi
    lines = lines.filter((l) => lineVisible(this.ch, l[2])).map(([who, t]) => [who, fillText(t, this.ch)]);
    if (!lines.length) lines = [['sys', '…']];
    this.dlg = { lines, i: 0, ...opts };
    this.open = 'dialog';
    this.renderWin();
  }

  speakerOf(who) {
    if (who === 'me') return { name: this.ch.name, kind: 'me' };
    if (who === 'sys') return { name: '', kind: 'sys' };
    if (NPCS[who]) return { name: NPCS[who].name, kind: 'npc', id: who };
    return { name: SPEAKERS[who] || who, kind: 'mon', id: who };
  }

  winDialog() {
    const d = this.dlg;
    const [who, text] = d.lines[d.i];
    const sp = this.speakerOf(who);
    const last = d.i >= d.lines.length - 1;
    const actions = last
      ? (d.choices || [{ act: 'dend', label: 'Tiếp tục' }]).map((c, i) => `<button class="${c.ghost ? 'ghost' : 'primary'}${c.big ? ' choice' : ''}" data-act="${c.act}" data-i="${i}">${c.label}</button>`).join('')
      : '<button class="primary" data-act="dnext">Tiếp ▸</button>';
    return `<div class="dlg ${sp.kind}">
      ${d.chapter ? `<p class="dlg-chap">${escapeHtml(d.chapter)}</p>` : ''}
      ${d.title ? `<h3 class="dlg-title">${escapeHtml(d.title)}</h3>` : ''}
      <div class="dlg-row">
        ${sp.kind === 'sys' ? '' : '<canvas class="dlg-face" width="192" height="192"></canvas>'}
        <div class="dlg-text">${sp.name ? `<b>${escapeHtml(sp.name)}</b>` : ''}<p>${escapeHtml(text)}</p></div>
      </div>
      <div class="dlg-foot"><span class="muted small">${d.i + 1}/${d.lines.length} · Enter / E để tiếp</span><div class="acts">${actions}</div></div>
    </div>`;
  }

  drawPortrait() {
    const cv = this.root.querySelector('.dlg-face');
    if (!cv) return;
    const [who] = this.dlg.lines[this.dlg.i];
    const sp = this.speakerOf(who);
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.imageSmoothingQuality = 'high';
    if (sp.kind === 'mon') {
      const sh = monsterSheet(sp.id);
      const k = Math.min(cv.width / sh.fw, cv.height / sh.fh) * 0.95;
      ctx.setTransform(k, 0, 0, k, (cv.width - sh.fw * k) / 2, (cv.height - sh.fh * k) / 2);
      drawFrame(ctx, sh, 0, 0, 0, true);
    } else {
      const look = sp.kind === 'me' ? lookFor(this.ch) : NPCS[sp.id].look;
      const sh = humanoidSheet(look);
      const k = 5.2; // phóng to phần đầu và vai
      ctx.setTransform(k, 0, 0, k, cv.width / 2 - (HUM_W / 2 + 1) * k, -2 * k);
      drawFrame(ctx, sh, 0, 0, 0, sp.kind !== 'me');
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  winShop() {
    const npc = NPCS[this.shopNpc], ch = this.ch;
    const tab = this.shopTab || 'buy';
    let body;
    if (tab === 'buy') {
      const list = npc.shop.filter((id) => !ITEMS[id].cls || ITEMS[id].cls === ch.cls);
      body = '<ul class="shop">' + list.map((id) => {
        const it = ITEMS[id];
        const usable = !it.cls || it.cls === ch.cls;
        const multi = it.type === 'use';
        return `<li class="${usable ? '' : 'dim'}"><img src="${iconForItem(it).url}" alt=""><div><b>${it.name}</b><small>${it.type === 'equip' ? `Cấp ${it.lv} · ` + Object.entries(it.stats).map(([k, v]) => `${STAT_NAMES[k]} +${v}`).join(', ') : it.desc}</small></div>
          <span class="price">${fmtNum(it.price)}</span><button data-act="buy" data-id="${id}" data-n="1" ${ch.gold < it.price ? 'disabled' : ''}>Mua</button>
          ${multi ? `<button data-act="buy" data-id="${id}" data-n="10" ${ch.gold < it.price * 10 ? 'disabled' : ''}>×10</button>` : ''}</li>`;
      }).join('') + '</ul>';
    } else body = this.winInventory('sell');
    return `<div class="tabs"><button class="${tab === 'buy' ? 'on' : ''}" data-act="tab" data-t="buy">Mua</button><button class="${tab === 'sell' ? 'on' : ''}" data-act="tab" data-t="sell">Bán</button><span class="gold">Ngân lượng <b>${fmtNum(ch.gold)}</b></span></div>${body}`;
  }

  // Lò rèn: 3 tab Cường hóa / Ép ngọc / Hợp ngọc
  winForge() {
    const tab = this.forgeTab || 'enh';
    const tabs = [['enh', 'Cường hóa'], ['gem', 'Ép ngọc'], ['fuse', 'Hợp ngọc']]
      .map(([t, l]) => `<button class="${tab === t ? 'on' : ''}" data-act="ftab" data-t="${t}">${l}</button>`).join('');
    const body = tab === 'fuse' ? this.forgeFuse() : this.forgeEquip(tab);
    return `<div class="tabs">${tabs}<span class="gold">Ngân lượng <b>${fmtNum(this.ch.gold)}</b></span></div>${body}
      ${this.forgeMsg ? `<p class="forgemsg ${this.forgeMsg.cls}">${this.forgeMsg.text}</p>` : ''}`;
  }

  forgeEquip(tab) {
    const ch = this.ch;
    const list = [...Object.values(ch.equip).filter(Boolean), ...ch.inventory.filter((e) => ITEMS[e.id].type === 'equip')];
    if (!this.forgeSel || !list.find((e) => e.uid === this.forgeSel)) this.forgeSel = list[0] && list[0].uid;
    const e = list.find((x) => x.uid === this.forgeSel);
    const cells = list.map((x) => this.slotHtml(x, (Object.values(ch.equip).includes(x) ? 'worn ' : '') + (x.uid === this.forgeSel ? 'sel' : ''), 'fsel')).join('');
    let detail = '<p class="muted">Bạn chưa có trang bị nào.</p>';
    if (e && tab === 'enh') detail = this.forgeEnhance(e);
    if (e && tab === 'gem') detail = this.forgeGem(e);
    const tip = tab === 'enh' ? 'Mua Đá Cường Hóa và Bùa Bảo Hộ ở mục Mua bán của Thợ Rèn, hoặc nhặt từ quái và nhận từ nhiệm vụ.'
      : 'Đồ thường 1 lỗ, đồ Quý trở lên 2 lỗ, cường hóa tới +7 mở thêm 1 lỗ. Bấm vào ngọc đã ép để gỡ ra (ngọc còn nguyên).';
    return `<div class="forge"><div><p class="muted small">Chọn trang bị (viền vàng = đang mặc)</p><div class="grid">${cells}</div>
      <p class="muted small">${tip}</p></div><div class="detail">${detail}</div></div>`;
  }

  forgeEnhance(e) {
    const ch = this.ch, it = ITEMS[e.id], lv = e.e || 0;
    const stones = countItem(ch, 'stone'), prot = countItem(ch, 'protect');
    const now = entryStats(e), next = entryStats({ ...e, e: Math.min(ENHANCE_MAX, lv + 1) });
    const cost = enhanceCost(it, lv);
    const maxed = lv >= ENHANCE_MAX, risky = lv >= ENHANCE_SAFE;
    const okStone = stones >= cost.stones, okGold = ch.gold >= cost.gold;
    return `<h3>${itemName(e)}</h3>
      <ul class="stats cmp">${Object.keys(now).map((k) => `<li><span>${STAT_NAMES[k]}</span><b>+${now[k]}</b>${!maxed && next[k] !== now[k] ? `<i>→ +${next[k]}</i>` : ''}</li>`).join('')}</ul>
      ${maxed ? '<p class="good">Đã cường hóa tối đa.</p>' : `
      <p class="rate">Tỉ lệ thành công <b>${Math.round(ENHANCE_RATE[lv] * 100)}%</b></p>
      <p class="${risky ? 'bad' : 'muted'} small">${risky ? 'Thất bại sẽ tụt 1 cấp.' : 'Thất bại không mất cấp.'}${lv === 6 ? ' Lên +7 mở thêm 1 lỗ khảm.' : ''}</p>
      <p class="cost">Cần: <span class="${okStone ? '' : 'bad'}">${cost.stones} Đá Cường Hóa <small class="muted">(đang có ${stones})</small></span> · <span class="${okGold ? '' : 'bad'}">${fmtNum(cost.gold)} lượng</span></p>
      ${risky ? `<label class="chk"><input type="checkbox" id="useProtect" ${this.useProtect && prot ? 'checked' : ''} ${prot ? '' : 'disabled'}> Dùng Bùa Bảo Hộ (còn ${prot})</label>` : ''}
      <div class="acts"><button class="forgebtn" data-act="enhance" ${okStone && okGold ? '' : 'disabled'}>Cường hóa lên +${lv + 1}</button></div>`}`;
  }

  forgeGem(e) {
    const ch = this.ch, it = ITEMS[e.id];
    const n = socketCount(e), used = (e.g || []).length;
    const gems = ch.inventory.filter((x) => ITEMS[x.id].type === 'gem');
    const fit = gems.filter((x) => gemFits(e, x.id)), unfit = gems.filter((x) => !gemFits(e, x.id));
    const now = entryStats(e);
    const gemBtn = (x, ok) => {
      const g = ITEMS[x.id], cost = socketCost(it, g.gem.g);
      const dis = !ok || used >= n || ch.gold < cost;
      return `<button class="gemopt ${ok ? '' : 'dim'}" data-act="socket" data-id="${x.id}" ${dis ? 'disabled' : ''}>
        <img src="${iconForItem(g).url}" alt=""><span><b style="color:${g.color}">${escapeHtml(g.name)}</b><small>${escapeHtml(g.desc.replace('Ép vào trang bị: ', ''))} · có ${x.qty}</small></span>
        <em>${ok ? fmtNum(cost) + ' lượng' : 'Không hợp'}</em></button>`;
    };
    return `<h3>${itemName(e)}</h3>
      <p class="sockets big">${this.socketHtml(e, 'unsock')}</p>
      <p class="muted small">${used}/${n} lỗ đã dùng · ${SLOT_NAMES[it.slot]} nhận: ${GEM_SLOTS[it.slot].map((k) => `<span style="color:${GEM_KINDS[k].color}">${GEM_KINDS[k].name}</span>`).join(', ')}</p>
      <ul class="stats">${Object.entries(now).map(([k, v]) => `<li><span>${STAT_NAMES[k]}</span><b>+${v}</b></li>`).join('')}</ul>
      <div class="gemlist">${fit.map((x) => gemBtn(x, true)).join('') + unfit.map((x) => gemBtn(x, false)).join('') || '<p class="muted small">Túi chưa có viên ngọc nào. Ngọc rơi từ quái, nhận từ nhiệm vụ, hoặc mua ở Thợ Rèn.</p>'}</div>`;
  }

  forgeFuse() {
    const ch = this.ch;
    const rows = [];
    for (const [kind, k] of Object.entries(GEM_KINDS)) {
      for (let g = 1; g <= 2; g++) {
        const have = countItem(ch, gemId(kind, g));
        if (!have) continue;
        const rule = GEM_FUSE[g - 1], from = ITEMS[gemId(kind, g)], to = ITEMS[gemId(kind, g + 1)];
        const ok = have >= 3 && ch.gold >= rule.gold;
        rows.push(`<li><img src="${iconForItem(from).url}" alt=""><span><b style="color:${k.color}">${escapeHtml(from.name)}</b> <small>có ${have}</small></span>
          <i>3 → 1</i><img src="${iconForItem(to).url}" alt=""><span><b>${escapeHtml(to.name)}</b><small>${escapeHtml(to.desc.replace('Ép vào trang bị: ', ''))}</small></span>
          <span class="rate small">${Math.round(rule.rate * 100)}% · ${fmtNum(rule.gold)} lượng</span>
          <button data-act="fuse" data-k="${kind}" data-g="${g}" ${ok ? '' : 'disabled'}>Hợp</button></li>`);
      }
    }
    return `<p class="muted small">Ba viên cùng loại, cùng phẩm hợp thành một viên phẩm cao hơn. Sơ → Trung luôn thành công. Trung → Thượng có 75%, thất bại vỡ mất 1 viên.</p>
      <ul class="fuselist">${rows.join('') || '<li class="muted">Túi chưa có ngọc nào để hợp.</li>'}</ul>`;
  }

  // Chế tạo: danh sách công thức, nguyên liệu có / cần
  winCraft() {
    const ch = this.ch;
    if (!this.craftSel) this.craftSel = RECIPES[0].id;
    const r = RECIPES.find((x) => x.id === this.craftSel);
    const outIt = (rc) => ITEMS[rc.out[0]] || { name: 'Ngọc ngẫu nhiên (Sơ)', icon: 'gem', color: '#ff4a5e', type: 'gem', gem: { g: 1 } };
    const icon = (it) => iconForItem(it).url;
    const list = ['outfit', 'use'].map((cat) => `<h4>${cat === 'outfit' ? 'Ngoại trang' : 'Đồ dùng'}</h4>` + RECIPES.filter((x) => x.cat === cat).map((x) => {
      const it = outIt(x), ok = !canCraft(ch, x);
      return `<button class="rcp ${x.id === this.craftSel ? 'sel' : ''} ${ok ? 'ready' : ''}" data-act="csel" data-r="${x.id}"><img src="${icon(it)}" alt=""><span>${escapeHtml(it.name)}${x.out[1] > 1 ? ' ×' + x.out[1] : ''}</span>${ok ? '<i>✓</i>' : ''}</button>`;
    }).join('')).join('');
    const it = outIt(r);
    const stats = it.stats ? '<ul class="stats">' + Object.entries(it.stats).map(([k, v]) => `<li><span>${STAT_NAMES[k]}</span><b>+${v}</b></li>`).join('') + '</ul>' : `<p class="muted small">${escapeHtml(it.desc || '')}</p>`;
    const need = r.need.map(([id, q]) => {
      const m = ITEMS[id], have = countItem(ch, id);
      return `<li class="${have >= q ? 'ok' : ''}" title="${escapeHtml(m.src ? 'Rơi từ: ' + m.src : m.desc || '')}"><img src="${icon(m)}" alt=""><span>${escapeHtml(m.name)}<small>${escapeHtml(m.src || '')}</small></span><b>${fmtNum(have)} / ${q}</b></li>`;
    }).join('');
    const err = canCraft(ch, r);
    const multi = r.cat === 'use' && !canCraft(ch, r, 5);
    return `<div class="craft"><div class="rlist">${list}</div>
      <div class="detail"><h3><img src="${icon(it)}" alt="" class="big"> ${escapeHtml(it.name)}</h3>
        ${it.slot === 'outfit' ? `<p class="outfit-note">Ngoại trang · Cấp ${it.lv}</p>` : ''}${stats}
        <h4>Nguyên liệu</h4><ul class="need">${need}<li class="${ch.gold >= r.gold ? 'ok' : ''}"><img src="${iconForItem({ icon: 'gold', color: '#e8c35a' }).url}" alt=""><span>Tiền công</span><b>${fmtNum(r.gold)}</b></li></ul>
        <div class="acts"><button class="forgebtn" data-act="craft" data-n="1" ${err ? 'disabled' : ''}>Chế tạo</button>${r.cat === 'use' ? `<button data-act="craft" data-n="5" ${multi ? '' : 'disabled'}>×5</button>` : ''}</div>
        ${err ? `<p class="muted small">${escapeHtml(err)}</p>` : ''}
        ${this.craftMsg ? `<p class="forgemsg ${this.craftMsg.cls}">${escapeHtml(this.craftMsg.text)}</p>` : ''}</div></div>`;
  }

  winDeath() {
    return `<div class="death"><h2>Bạn đã gục ngã</h2><p>Mất ${fmtNum(this.deathLoss || 0)} điểm kinh nghiệm.</p><button data-act="respawn">Hồi sinh tại làng</button></div>`;
  }

  openNpc(id) { if (this.npcId !== id || this.open !== 'npc') this.npcGreet = null; this.npcId = id; this.npcMsg = null; this.npcQuest = null; this.open = 'npc'; this.renderWin(); }

  // Cảnh cốt truyện khi vào bản đồ (chiếu một lần), có thể có lựa chọn
  checkScenes() {
    const w = this.world, ch = this.ch;
    if (!w || this.open === 'dialog') return;
    for (const [id, sc] of Object.entries(SCENES)) {
      if (sc.map !== w.mapId || ch.flags['seen_' + id]) continue;
      if (sc.quest && questStatus(ch, sc.quest) !== 'active') continue;
      this.sceneId = id;
      this.startDialog(sc.lines, {
        title: QUESTS[sc.quest] ? QUESTS[sc.quest].name : '', chapter: QUESTS[sc.quest] && CHAPTERS[QUESTS[sc.quest].chapter],
        choices: sc.choices ? sc.choices.map((c) => ({ act: 'dchoice', label: c.label, big: true })) : [{ act: 'dend', label: 'Tiếp tục' }],
        onEnd: () => { ch.flags['seen_' + id] = '1'; this.cb.save(); this.close(); },
      });
      return;
    }
  }

  showDeath(loss) { this.deathLoss = loss; this.open = 'death'; this.renderWin(); }

  // ================= HÀNH ĐỘNG =================
  act(a, d) {
    const ch = this.ch, w = this.world;
    const changed = () => { w.recalc(); w.player.refreshLook(); this.refreshAll(); this.cb.save(); };
    switch (a) {
      case 'close': this.close(); break;
      case 'sel': this.selected = d.uid; this.renderWin(); break;
      case 'use': this.useEntry(d.uid); break;
      case 'equip': { const err = equipEntry(ch, d.uid); if (err) this.toast(err, 'warn'); changed(); break; }
      case 'unequip': { const err = unequip(ch, d.slot); if (err) this.toast(err, 'warn'); changed(); break; }
      case 'drop': { removeEntry(ch, d.uid, Infinity); this.selected = null; changed(); break; }
      case 'sell': case 'sellall': {
        const e = ch.inventory.find((x) => x.uid === d.uid);
        if (!e) break;
        const n = a === 'sellall' ? e.qty : 1;
        ch.gold += sellPrice(e) * n;
        removeEntry(ch, d.uid, n);
        if (!ch.inventory.find((x) => x.uid === d.uid)) this.selected = null;
        changed(); break;
      }
      case 'buy': {
        const it = ITEMS[d.id], n = +d.n;
        if (ch.gold < it.price * n) { this.toast('Không đủ ngân lượng', 'warn'); break; }
        if (!addItem(ch, d.id, n)) { this.toast('Túi đồ đã đầy', 'warn'); break; }
        ch.gold -= it.price * n;
        this.toast(`Đã mua ${it.name}${n > 1 ? ' ×' + n : ''}`);
        w.event('buy');
        changed(); break;
      }
      case 'tab': this.shopTab = d.t; this.selected = null; this.renderWin(); break;
      case 'shop': this.shopNpc = this.npcId; this.shopTab = 'buy'; this.open = 'shop'; this.renderWin(); break;
      case 'stat': if (addStat(ch, d.stat)) { w.event('stat'); changed(); } break;
      case 'skillup': if (upgradeSkill(ch, d.sid)) { w.event('skillup'); changed(); } break;
      case 'stab': this.skillTab = d.t; this.renderWin(); break;
      case 'pasup': if (learnPassive(ch, d.pid)) { w.event('skillup'); this.toast(`Nội công <b>${PASSIVES[d.pid].name}</b> lên cấp ${ch.skills[d.pid]}`, 'quest'); changed(); } break;
      case 'sreset': {
        if (this.confirmReset !== true) { this.confirmReset = true; this.toast('Bấm Tẩy điểm lần nữa để xác nhận', 'warn'); setTimeout(() => { this.confirmReset = false; }, 3000); break; }
        this.confirmReset = false;
        if (resetSkills(ch)) { this.toast('Đã tẩy điểm. Cộng lại kỹ năng theo ý bạn nhé.', 'quest'); changed(); }
        break;
      }
      case 'qaccept': {
        const q = QUESTS[d.q];
        const intro = q.intro || [[q.npc, q.text]];
        {
          this.startDialog(intro, { chapter: q.chapter && CHAPTERS[q.chapter], title: q.name, qid: d.q, npc: this.npcId,
            choices: [{ act: 'daccept', label: 'Nhận nhiệm vụ' }, { act: 'dlater', label: 'Để sau', ghost: true }] });
        }
        break;
      }
      case 'dnext': if (this.dlg && this.dlg.i < this.dlg.lines.length - 1) { this.dlg.i++; this.renderWin(); } else if (this.dlg && !(this.dlg.choices || []).some((c) => c.big)) this.act((this.dlg.choices || [{ act: 'dend' }])[0].act, {}); break;
      case 'daccept': { const { qid, npc } = this.dlg; this.npcId = npc; this.acceptQuest(qid); break; }
      case 'dlater': { const { npc } = this.dlg; this.dlg = null; this.openNpc(npc); break; }
      case 'dchoice': {
        // lựa chọn trong cảnh cốt truyện: đặt cờ rồi chiếu đoạn thoại riêng
        const sc = SCENES[this.sceneId], c = sc && sc.choices[+d.i];
        if (!c) break;
        ch.flags[c.flag[0]] = c.flag[1];
        const end = this.dlg.onEnd;
        this.startDialog(c.lines, { title: this.dlg.title, chapter: this.dlg.chapter, onEnd: end });
        break;
      }
      case 'dend': { const dd = this.dlg; this.dlg = null; if (dd && dd.onEnd) dd.onEnd(); else this.close(); break; }
      case 'qtalk': {
        ch.quests[d.q].p = 1; // đã gặp đúng người
        this.finishQuest(d.q);
        break;
      }
      case 'qinfo': this.npcMsg = QUESTS[d.q].text; this.npcQuest = d.q; this.renderWin(); break;
      case 'qdone': this.finishQuest(d.q); break;
      case 'save': this.cb.save(true); break;
      case 'switch': this.cb.exit(); break;
      case 'logout': this.cb.logout(); break;
      case 'respawn': this.close(); w.respawn(); break;
      case 'pet': this.togglePet(); break;
      case 'forge': this.open = 'forge'; this.forgeMsg = null; this.renderWin(); break;
      case 'craftwin': this.open = 'craft'; this.craftMsg = null; this.renderWin(); break;
      case 'csel': this.craftSel = d.r; this.craftMsg = null; this.renderWin(); break;
      case 'craft': {
        const r = RECIPES.find((x) => x.id === this.craftSel), n = +d.n || 1;
        const res = craft(ch, r, n);
        if (!res.out || !res.out.length) { this.toast(res.msg, 'warn'); break; }
        const it = ITEMS[res.out[0]];
        this.craftMsg = { cls: 'good', text: `Chế tạo thành công: ${it.name}${res.out.length > 1 ? ' ×' + res.out.length : r.out[1] > 1 ? ' ×' + r.out[1] : ''}` };
        if (it.slot === 'outfit') { this.banner(`<small>Ngoại trang mới</small>${escapeHtml(it.name)}`); this.addChat('Hệ thống', `${ch.name} vừa thêu xong ${it.name}!`, 'system'); }
        w.burst(w.player.cx, w.player.cy, '#ffc8dc', 24, 110, { shape: 'petal' });
        w.event('craft'); changed(); break;
      }
      case 'ftab': this.forgeTab = d.t; this.forgeMsg = null; this.renderWin(); break;
      case 'fsel': this.forgeSel = d.uid; this.forgeMsg = null; this.renderWin(); break;
      case 'enhance': this.doEnhance(); break;
      case 'socket': {
        const e = this.findEntry(this.forgeSel);
        if (!e) break;
        const r = socketGem(ch, e, d.id);
        if (!r.ok) { this.toast(r.msg, 'warn'); break; }
        this.forgeMsg = { cls: 'good', text: `Đã ép ${ITEMS[d.id].name} vào ${entryName(e)}.` };
        w.burst(w.player.cx, w.player.cy - 6, ITEMS[d.id].color, 18, 100, { shape: 'star' });
        w.event('socket'); changed(); break;
      }
      case 'unsock': {
        const e = this.findEntry(this.forgeSel);
        if (!e) break;
        const r = unsocketGem(ch, e, +d.i);
        if (!r.ok) { this.toast(r.msg, 'warn'); break; }
        this.forgeMsg = { cls: '', text: `Đã gỡ ${ITEMS[r.id].name} về túi.` };
        changed(); break;
      }
      case 'fuse': {
        const r = fuseGems(ch, d.k, +d.g);
        if (!r.ok) { this.toast(r.msg, 'warn'); break; }
        if (r.success) {
          this.forgeMsg = { cls: 'good', text: `Hợp thành công: ${ITEMS[r.id].name}!` };
          w.burst(w.player.cx, w.player.cy - 6, ITEMS[r.id].color, 24, 120, { shape: 'star' });
          this.toast(`Hợp ngọc thành công: <b>${ITEMS[r.id].name}</b>`, +d.g >= 2 ? 'rare' : 'quest');
        } else {
          this.forgeMsg = { cls: 'bad', text: `Thất bại… vỡ mất 1 viên ${ITEMS[r.id].name}.` };
          this.toast('Hợp ngọc thất bại', 'warn');
        }
        w.event('fuse'); changed(); break;
      }
    }
  }

  acceptQuest(qid) {
    const ch = this.ch, q = QUESTS[qid];
    ch.quests[qid] = { s: 'active', p: 0 };
    const idx = MAIN_ORDER.indexOf(qid);
    if (idx >= 0 && (idx === 0 || QUESTS[MAIN_ORDER[idx - 1]].chapter !== q.chapter)) {
      const [a, b] = CHAPTERS[q.chapter].split(' · ');
      setTimeout(() => this.banner(`<small>${escapeHtml(a)}</small>${escapeHtml(b || a)}`), 400);
    }
    this.toast(`Nhận nhiệm vụ: <b>${q.name}</b>`, 'quest');
    for (const [id, n] of q.give || []) { addItem(ch, id, n); this.toast(`Nhận ${ITEMS[id].name}${n > 1 ? ' ×' + n : ''}`); }
    if (q.hint) this.toast(`💡 ${escapeHtml(fillText(q.hint, ch))}`, 'hint');
    if (q.daily) this.world.event('daily');
    this.world.refreshNpcs(); // có NPC biến mất/xuất hiện khi nhận nhiệm vụ
    // nhiệm vụ "gặp chính mình" (quà hằng ngày) xong ngay
    if (q.type === 'talk' && q.target === this.npcId) { ch.quests[qid].p = 1; this.finishQuest(qid); return; }
    this.dlg = null;
    this.openNpc(this.npcId);
    this.npcMsg = q.text; this.npcQuest = qid;
    this.renderWin();
    this.world.recalc(); this.refreshAll(); this.cb.save();
  }

  // Trả nhiệm vụ: chiếu đoạn hội thoại kết (nếu có) rồi mới trao thưởng
  finishQuest(qid) {
    const q = QUESTS[qid], npc = this.npcId;
    const done = () => { this.openNpc(npc); this.completeQuest(qid); };
    const outro = q.outro || (q.done ? [[questTurnIn(q), q.done]] : null);
    if (outro) this.startDialog(outro, { chapter: q.chapter && CHAPTERS[q.chapter], title: q.name, onEnd: done, choices: [{ act: 'dend', label: 'Nhận thưởng' }] });
    else done();
  }

  doEnhance() {
    const ch = this.ch, w = this.world;
    const e = this.findEntry(this.forgeSel);
    if (!e) return;
    const cb = this.root.querySelector('#useProtect');
    this.useProtect = !!(cb && cb.checked);
    const r = enhanceEntry(ch, e, this.useProtect);
    if (!r.ok) { this.toast(r.msg, 'warn'); return; }
    const p = w.player;
    if (r.success) {
      this.forgeMsg = { cls: 'good', text: `Thành công! ${entryName(e)}` };
      w.addFx('ring', p.cx, p.cy, 0.5, { color: '#ffd84a', r: 30 });
      w.burst(p.cx, p.cy - 6, '#ffe27a', 24, 120, { shape: 'star' });
      this.toast(`Cường hóa thành công: <b>${escapeHtml(entryName(e))}</b>`, r.after >= 7 ? 'rare' : 'quest');
      if (r.after >= 7) this.addChat('Hệ thống', `${ch.name} đã cường hóa ${entryName(e)} thành công!`, 'system');
    } else {
      const text = r.protected ? 'Thất bại, nhưng Bùa Bảo Hộ đã giữ lại cấp cường hóa.' : r.after < r.before ? `Thất bại… trang bị tụt xuống +${r.after}.` : 'Thất bại, trang bị giữ nguyên cấp.';
      this.forgeMsg = { cls: 'bad', text };
      w.burst(p.cx, p.cy - 6, '#8a8a9a', 12, 60, { glow: false });
      this.toast(text, 'warn');
    }
    w.event('enhance');
    w.recalc(); this.refreshAll(); this.cb.save();
  }

  togglePet() {
    const ch = this.ch;
    if (!ch.pet) { this.toast('Chưa có pet. Gặp Trưởng Làng nhận nhiệm vụ Bạn Đồng Hành Nhỏ', 'warn'); return; }
    this.world.setPet(!ch.pet.on);
    this.toast(ch.pet.on ? 'Tiểu Quỷ: "Em đây, chủ nhân!"' : 'Tiểu Quỷ đi nghỉ rồi');
    if (this.open === 'char') this.renderWin();
    this.cb.save();
  }

  useEntry(uid) {
    const ch = this.ch, e = ch.inventory.find((x) => x.uid === uid);
    if (!e) return;
    const it = ITEMS[e.id];
    if (it.type !== 'use') return;
    if (it.orb) {
      const wpn = ch.equip.weapon;
      if (!wpn) { this.toast('Hãy cầm vũ khí trước khi khảm ngọc', 'warn'); return; }
      removeEntry(ch, uid, 1);
      wpn.el = it.orb;
      this.world.recalc();
      this.world.burst(this.world.player.cx, this.world.player.cy, ELEMENTS[it.orb].color, 18, 90, { shape: 'star' });
      this.toast(`${entryName(wpn)} giờ mang hệ <b style="color:${ELEMENTS[it.orb].color}">${ELEMENTS[it.orb].name}</b>`, 'quest');
      this.world.event('orb');
      if (!ch.inventory.find((x) => x.uid === uid)) this.selected = null;
      this.refreshAll(); this.cb.save();
      return;
    }
    removeEntry(ch, uid, 1);
    this.world.applyConsumable(it);
    if (it.heal) this.world.event('potion');
    if (!ch.inventory.find((x) => x.uid === uid)) this.selected = null;
    this.refreshAll();
  }

  useItemById(id) {
    const e = this.ch.inventory.find((x) => x.id === id);
    if (e) this.useEntry(e.uid);
  }

  completeQuest(qid) {
    const ch = this.ch, q = QUESTS[qid], w = this.world;
    if (questStatus(ch, qid) !== 'ready') return;
    if (q.type === 'collect') removeItem(ch, q.target, q.count);
    ch.quests[qid] = q.daily ? { s: 'done', p: q.count, day: todayKey() } : { s: 'done', p: q.count };
    ch.gold += q.reward.gold || 0;
    const got = [];
    for (const [id0, n] of q.reward.items || []) {
      const id = resolveItemId(id0, ch.cls);
      const it = ITEMS[id];
      if (it.type === 'equip') { const r = rollEquip(id); addItem(ch, id, n, Math.max(1, r.r), r.bonus); }
      else addItem(ch, id, n);
      got.push(`${it.name}${n > 1 ? ' ×' + n : ''}`);
    }
    for (const [id, p] of q.reward.random || []) {
      if (Math.random() < p) { addItem(ch, id, 1); got.push(`<b>${ITEMS[id].name}</b>`); }
    }
    if (q.reward.title) {
      ch.title = q.reward.title;
      got.push(`danh hiệu 「${q.reward.title}」`);
      this.banner(`<small>Danh hiệu mới</small>${escapeHtml(q.reward.title)}`);
    }
    if (q.reward.pet && !ch.pet) {
      ch.pet = { id: q.reward.pet, on: false };
      w.setPet(true);
      got.push('pet Tiểu Quỷ');
      this.banner('<small>Bạn đồng hành mới</small>Tiểu Quỷ');
    }
    this.npcMsg = q.done || null;
    w.refreshNpcs();
    this.toast(`Hoàn thành <b>${q.name}</b>: +${fmtNum(q.reward.exp)} EXP, +${fmtNum(q.reward.gold)} lượng${got.length ? ', ' + got.join(', ') : ''}`, 'quest');
    w.giveExp(q.reward.exp);
    w.recalc();
    this.refreshAll();
    this.cb.save();
  }

  questProgress(qid) {
    const q = QUESTS[qid], ch = this.ch;
    const n = questProgress(ch, qid);
    this.toast(`${q.name}: ${n}/${q.count}${n >= q.count ? ' · <b>Xong!</b>' : ''}`, n >= q.count ? 'quest' : '');
    this.refreshTracker();
    if (this.open === 'quest') this.renderWin();
  }

  gotItem(data) {
    const it = ITEMS[data.id];
    this.toast(`Nhận được ${itemName(data)}${data.qty > 1 ? ' ×' + data.qty : ''}`, data.r >= 2 ? 'rare' : '');
    this.refreshSkillbar();
    if (this.open === 'inv' || this.open === 'quest') this.renderWin();
  }
}
