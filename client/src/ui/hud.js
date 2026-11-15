// In-game UI (HUD + windows) as HTML laid over the canvas
import { CLASSES, SKILLS, SKILL_KEYS } from '../../../shared/data/classes.js';
import { ITEMS } from '../../../shared/data/items.js';
import { NPCS, QUESTS } from '../../../shared/data/npcs.js';
import { WORLD_CHAINS } from '../../../shared/data/world.js';
import { GROUND_Y } from '../../../shared/data/maps.js';
import { iconForItem } from '../gfx/icons.js';
import { expToNext, questStatus, questProgress, questTurnIn, craft } from '../../../shared/rules/character.js';
import { SKILL_GLYPH, SKILL_COLOR } from './skillglyphs.js';
import { escapeHtml, fmtNum } from '../../../shared/util.js';
import { PremiumUI } from './premium.js';
import { $, npcMapName, grindMap, nextMainQuest, catOf } from './hud/helpers.js';
import { PanelsUI } from './hud/panels.js';
import { NpcUI } from './hud/npc.js';
import { ForgeUI } from './hud/forge.js';
import { TradeUI } from './hud/trade.js';
import { ActionsUI } from './hud/actions.js';
import { EventUI } from './hud/event.js';

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
      <div class="hud-party" id="hParty" hidden></div>
      <div class="hud-event" id="hEvent" hidden></div>
      <canvas class="hud-mini" id="hMini" width="160" height="56"></canvas>
      <div class="hud-chat" id="hChat"><div class="chat-log" id="chatLog"></div>
        <form id="chatForm" autocomplete="off"><input id="chatIn" maxlength="80" placeholder="Enter để chat · bắt đầu bằng ! để chat kênh thế giới" aria-label="Tin nhắn chat"></form></div>
      <div class="hud-bar" id="hSkills"></div>
      <div class="hud-menu">
        <button data-win="inv" title="Túi đồ (I)">Túi đồ<kbd>I</kbd></button>
        <button data-win="char" title="Nhân vật (C)">Nhân vật<kbd>C</kbd></button>
        <button data-win="skill" title="Kỹ năng (K)">Kỹ năng<kbd>K</kbd></button>
        <button data-win="quest" title="Nhiệm vụ (L)">Nhiệm vụ<kbd>L</kbd></button>
        <button data-win="premium" class="mprem" title="Vạn Bảo Các (B)">Vạn Bảo<kbd>B</kbd></button>
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
      // "!text" goes to the world channel, plain text to everyone on this map
      const world = t.startsWith('!');
      const text = world ? t.slice(1).trim() : t;
      if (!text) return;
      this.addChat(this.world.ch.name, text, world ? 'world' : 'me');
      this.world.player.say = { text, t: 4 };
      if (this.world.net && this.world.net.connected) this.world.net.chat(text, world ? 'world' : 'map');
      this.world.bots.onPlayerChat(text);
    });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Escape') inp.blur(); });
    // Touch buttons
    // Touch buttons only appear once the player actually touches the screen
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
      else if (e.code === 'KeyB') this.toggle('premium');
      else if (e.code === 'KeyT') this.askTrade();
      else if (e.code === 'KeyG') this.askParty();
      else if (e.code === 'Escape') { if (this.open) this.close(); else this.toggle('sys'); }
    };
  }

  attach(world) {
    this.world = world; this.ch = world.ch;
    this.buildSkillbar();
    this.refreshAll();
    $('#hOnline', this.root).textContent = `${world.bots.onlineCount() + 1} người đang online`;
  }

  // Real player count from the multiplayer server (replaces the bot count while connected)
  setOnline(n) { const el = $('#hOnline', this.root); if (el) el.textContent = `${n} người chơi online`; }

  // Leaving the game (character switch, logout): nothing of this session may carry over, including a trade, its
  // pending offer retry (it checks this.trade) and any invitation popup still waiting for an answer
  detach() {
    this.world = null; this.close(); this.party = null; this.renderParty();
    this.premiumIdle(); this.premReq = null; // the shop's pending request (Vạn Bảo Các)
    this.ev = {}; this.evRank = null; this.renderEvent();
    this.trade = null;
    this.root.querySelectorAll('#tradeAsk, #partyAsk').forEach((el) => el.remove());
  }

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

  // Quest tracker in the top right: story first, then tutorials, at most 3 lines
  refreshTracker() {
    const ch = this.ch, el = $('#hTrack', this.root);
    const order = { main: 0, world: 1, tut: 2, side: 3, daily: 4 };
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

  // Called every frame: cooldowns, buffs, minimap
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
    this.renderEvent();
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
    setTimeout(() => this.discoverWorldQuests(), 1800);
    const b = $('#hBanner', this.root);
    b.innerHTML = `<small>${map.safe ? 'Khu an toàn' : 'Cấp đề nghị ' + (map.minLv || 1) + '+'}</small>${escapeHtml(map.name)}`;
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  }

  // Genshin-style discovery: the first time we reach a map where a world quest chain can start, announce it
  discoverWorldQuests() {
    const w = this.world, ch = this.ch;
    if (!w) return;
    for (const [id, c] of Object.entries(WORLD_CHAINS)) {
      const first = QUESTS[c.steps[0]], key = 'wq_' + id;
      if (ch.flags[key] || questStatus(ch, c.steps[0]) !== 'available' || !w.npcs.some((n) => n.id === first.npc)) continue;
      ch.flags[key] = 'seen';
      this.banner(`<small>Phát hiện nhiệm vụ thế giới</small>${escapeHtml(c.name)}`);
      this.toast(`◈ <b>${escapeHtml(c.name)}</b> · ${escapeHtml(c.blurb)} Tìm ${escapeHtml(NPCS[first.npc].name)} (dấu ! tím).`, 'quest');
      this.cb.save();
      return; // one at a time
    }
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
    el.textContent = state === 'saving' ? 'Đang lưu…' : state === 'saved' ? 'Đã lưu' : 'Chưa gửi được: ' + (msg || '');
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

  // ================= WINDOWS =================
  toggle(name) { if (this.open === name) this.close(); else { this.open = name; this.selected = null; this.renderWin(); } }

  close() {
    if (this.open === 'trade' && this.trade && this.world?.net) this.world.net.trade('cancel'); // closing the window cancels the trade
    this.open = null; this.shopNpc = null; this.npcId = null; $('#win', this.root).hidden = true;
  }

  renderWin() {
    const w = $('#win', this.root);
    w.hidden = false;
    const body = {
      inv: () => this.winInventory(), char: () => this.winChar(), skill: () => this.winSkills(), quest: () => this.winQuests(),
      sys: () => this.winSystem(), npc: () => this.winNpc(), craft: () => this.winCraft(), shop: () => this.winShop(), death: () => this.winDeath(), evend: () => this.winEvEnd(), forge: () => this.winForge(), dialog: () => this.winDialog(), trade: () => this.winTrade(),
      premium: () => this.winPremium(),
    }[this.open]();
    const titles = { inv: 'Túi đồ', char: 'Nhân vật', skill: 'Kỹ năng', quest: 'Nhiệm vụ', sys: 'Hệ thống', npc: '', shop: 'Cửa hàng', death: '', evend: '', forge: 'Lò rèn của Anh Sắt', craft: 'Tú Nương · Chế tạo', dialog: '', trade: 'Giao dịch', premium: 'Vạn Bảo Các' };
    const title = this.open === 'npc' ? NPCS[this.npcId].name : this.open === 'shop' ? NPCS[this.shopNpc].name + ' · Cửa hàng' : titles[this.open];
    w.className = 'win w-' + this.open;
    w.innerHTML = (title ? `<header><h2>${escapeHtml(title)}</h2>${this.open === 'death' ? '' : '<button class="x" data-act="close" aria-label="Đóng">✕</button>'}</header>` : '') + `<div class="wb">${body}</div>`;
    w.querySelectorAll('[data-act]').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); this.act(el.dataset.act, el.dataset); }));
    if (this.open === 'dialog') this.drawPortrait();
    if (this.open === 'premium') this.startPreview();
  }
}

// Vạn Bảo Các (premium shop) window and actions
Object.assign(GameUI.prototype, PremiumUI);
Object.assign(GameUI.prototype, PanelsUI, NpcUI, ForgeUI, TradeUI, ActionsUI, EventUI);
