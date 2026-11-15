// GameUI: talking to NPCs, dialogue, scenes, quests and the shop.
import { ITEMS, STAT_NAMES, isLookSlot } from '../../../../shared/data/items.js';
import { NPCS, QUESTS } from '../../../../shared/data/npcs.js';
import { SPEAKERS, CHAPTERS, SCENES, MAIN_ORDER } from '../../../../shared/data/story.js';
import { WORLD_CHAINS } from '../../../../shared/data/world.js';
import { npcLine, fillText } from '../../game/chatter.js';
import { humanoidSheet, HUM_W } from '../../gfx/humanoid.js';
import { monsterSheet } from '../../gfx/monsters.js';
import { drawFrame } from '../../gfx/draw.js';
import { lookFor } from '../../game/entities.js';
import { iconForItem } from '../../gfx/icons.js';
import { addItem, questStatus, questProgress, removeItem, resolveItemId, rollEquip, todayKey, questTurnIn, lineVisible } from '../../../../shared/rules/character.js';
import { escapeHtml, fmtNum } from '../../../../shared/util.js';
import { questIngots } from '../../../../shared/rules/premium.js';
import { $, catOf, catTag, rewardText } from './helpers.js';

export const NpcUI = {
  winNpc() {
    const npc = NPCS[this.npcId], ch = this.ch;
    let html = `<p class="npc-title">${escapeHtml(npc.title)}</p>`;
    if (!this.npcGreet) this.npcGreet = npcLine(ch, this.npcId, 'greet') || '…';
    html += `<blockquote>${escapeHtml(this.npcMsg ? fillText(this.npcMsg, ch) : this.npcGreet)}</blockquote>`;
    if (this.npcQuest) html += `<p class="reward">Thưởng: ${rewardText(QUESTS[this.npcQuest], ch.cls)}</p>`;
    html += '<div class="opts">';
    // things to hand in at this NPC (including quests given by someone else)
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
    if (npc.dungeon) html += this.eventButton(npc.dungeon);
    if (npc.craft) html += `<button data-act="craftwin"><em>✿</em> Chế tạo · Thêu ngoại trang</button>`;
    if (npc.premium) html += `<button class="storybtn" data-act="premwin"><em>◆</em> Vạn Bảo Các · Áo choàng, ngoại trang</button>`;
    html += `<button class="ghost" data-act="close">Tạm biệt</button></div>`;
    return html;
  },

  openNpc(id) { if (this.npcId !== id || this.open !== 'npc') this.npcGreet = null; this.npcId = id; this.npcMsg = null; this.npcQuest = null; this.open = 'npc'; this.renderWin(); },

  // ===== Story dialogue =====
  startDialog(lines, opts) {
    // filter lines by story flags and fill in the player's name
    lines = lines.filter((l) => lineVisible(this.ch, l[2])).map(([who, t]) => [who, fillText(t, this.ch)]);
    if (!lines.length) lines = [['sys', '…']];
    this.dlg = { lines, i: 0, ...opts };
    this.open = 'dialog';
    this.renderWin();
  },

  speakerOf(who) {
    if (who === 'me') return { name: this.ch.name, kind: 'me' };
    if (who === 'sys') return { name: '', kind: 'sys' };
    if (NPCS[who]) return { name: NPCS[who].name, kind: 'npc', id: who };
    return { name: SPEAKERS[who] || who, kind: 'mon', id: who };
  },

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
  },

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
      const k = 5.2; // zoom in on the head and shoulders
      ctx.setTransform(k, 0, 0, k, cv.width / 2 - (HUM_W / 2 + 1) * k, -2 * k);
      drawFrame(ctx, sh, 0, 0, 0, sp.kind !== 'me');
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  },

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
  },

  // Story scene when entering a map (shown once), may include choices
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
  },

  acceptQuest(qid) {
    const ch = this.ch, q = QUESTS[qid];
    ch.quests[qid] = { s: 'active', p: 0 };
    const idx = MAIN_ORDER.indexOf(qid);
    if (idx >= 0 && (idx === 0 || QUESTS[MAIN_ORDER[idx - 1]].chapter !== q.chapter)) {
      const [a, b] = CHAPTERS[q.chapter].split(' · ');
      setTimeout(() => this.banner(`<small>${escapeHtml(a)}</small>${escapeHtml(b || a)}`), 400);
    }
    this.toast(`Nhận nhiệm vụ: <b>${q.name}</b>`, 'quest');
    for (const [id, n] of q.give || []) {
      if (addItem(ch, id, n)) this.toast(`Nhận ${ITEMS[id].name}${n > 1 ? ' ×' + n : ''}`);
      else this.toast('Túi đồ đã đầy', 'warn');
    }
    if (q.hint) this.toast(`💡 ${escapeHtml(fillText(q.hint, ch))}`, 'hint');
    if (q.daily) this.world.event('daily');
    this.world.refreshNpcs(); // some NPCs appear/disappear when a quest is accepted
    // "meet yourself" quests (daily gift) complete immediately
    if (q.type === 'talk' && q.target === this.npcId) { ch.quests[qid].p = 1; this.finishQuest(qid); return; }
    this.dlg = null;
    this.openNpc(this.npcId);
    this.npcMsg = q.text; this.npcQuest = qid;
    this.renderWin();
    this.world.recalc(); this.refreshAll(); this.cb.save();
  },

  // Turning in a quest: play the closing dialogue (if any), then give the reward
  finishQuest(qid) {
    const q = QUESTS[qid], npc = this.npcId;
    const done = () => { this.openNpc(npc); this.completeQuest(qid); };
    const outro = q.outro || (q.done ? [[questTurnIn(q), q.done]] : null);
    const chapter = q.chapter ? CHAPTERS[q.chapter] : q.chain ? 'Nhiệm vụ thế giới · ' + WORLD_CHAINS[q.chain].name : '';
    // a choice at the end (world quests): it sets a story flag and plays its own lines before the reward
    const choices = q.choice ? q.choice.options.map((o, i) => ({ act: 'qchoice', label: o.label, big: true, i })) : [{ act: 'dend', label: 'Nhận thưởng' }];
    if (outro) this.startDialog(outro, { chapter, title: q.name, onEnd: done, choices, qid });
    else done();
  },

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
      if (isLookSlot(it.slot)) addItem(ch, id, n, 3, {}); // outfits and capes are always Legendary, no bonus stats
      else if (it.type === 'equip') { const r = rollEquip(id, 0, 1); addItem(ch, id, n, r.r, r.bonus); }
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
    const ingots = questIngots(qid);
    if (ingots) {
      // online the server grants them once this completion is saved (world.claimQuest); offline right away
      if (w.net) w.claimQuest(qid); else ch.ingots = (ch.ingots || 0) + ingots;
      got.push(`${ingots} Nguyên Bảo`);
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
  },
};
