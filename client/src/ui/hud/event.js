// GameUI, the server event Xâm Lăng Dương Ác: the keeper's button, the live damage ranking panel and the results
// window (messages ev_state / ev_rank / ev_end, see server/src/dungeon.js and docs/MULTIPLAYER.md).
import { ITEMS } from '../../../../shared/data/items.js';
import { DUNGEONS } from '../../../../shared/data/dungeons.js';
import { GAME } from '../../../../shared/config.js';
import { escapeHtml, fmtNum } from '../../../../shared/util.js';
import { $ } from './helpers.js';

export const EventUI = {
  // The keeper's button: online it says whether the event is open and when it opens next; offline it is practice
  eventButton(id) {
    const d = DUNGEONS[id], st = this.ev?.[id], online = !!this.world?.net;
    const sc = GAME.dungeon.schedule, days = sc.days.map((x) => (x === 0 ? 'Chủ nhật' : 'thứ ' + ['', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy'][x])).join(' và ');
    const when = `${days} ${String(sc.hour).padStart(2, '0')}:${String(sc.minute).padStart(2, '0')}, ${sc.durationMin} phút`;
    let small;
    if (!online) small = `Cấp ${d.lv}+ · luyện tập ngoại tuyến`;
    else if (st?.open) small = `Đang mở · còn ${Math.max(1, Math.ceil(this.evLeft(st) / 60e3))} phút · mọi người chơi cùng vào`;
    else small = `Chưa mở · ${when}`;
    return `<button class="storybtn" data-act="dungeon" data-d="${id}"><em>⚔</em> ${online ? 'Tham chiến' : 'Luyện tập'} · ${escapeHtml(d.name)} <small>${small}</small></button>`;
  },

  // ms left until m.end, corrected for the difference between the server's clock and ours
  evLeft(m) { return m.end ? m.end - m.now - (Date.now() - m.at) : 0; },

  onEvent(m) {
    m = { ...m, at: Date.now() };
    this.ev = this.ev || {};
    const d = DUNGEONS[m.d];
    if (m.t === 'ev_state') {
      const was = this.ev[m.d]?.open;
      this.ev[m.d] = m;
      if (m.open && !was) {
        this.banner(`<small>Sự kiện máy chủ</small>${escapeHtml(d?.name || '')}`);
        this.toast(`${escapeHtml(d?.name || '')} đã mở! Gặp Thủ Ải trong làng để tham chiến`, 'quest');
      }
      if (!m.open) this.evRank = null;
      if (this.open === 'npc') this.renderWin();
    } else if (m.t === 'ev_rank') {
      this.evRank = m;
    } else if (m.t === 'ev_end') {
      this.evRank = null;
      if (m.exp > 0) this.world?.giveExp(m.exp);
      this.evEnd = m;
      this.open = 'evend'; this.renderWin();
    }
    this.renderEvent();
  },

  // Top-right panel while on an event floor: time left, live top 10 by damage and your own place
  renderEvent() {
    const el = $('#hEvent', this.root), w = this.world, r = this.evRank;
    if (!el) return;
    const on = !!(w && w.dg && r);
    this.root.classList.toggle('in-event', on); // the panel takes the quest tracker's place
    if (!on) { if (!el.hidden) { el.hidden = true; el.innerHTML = ''; el._h = ''; } return; }
    const left = Math.max(0, this.evLeft(r)), mm = Math.floor(left / 60e3), ss = Math.floor(left / 1000) % 60;
    const i = w.dg.floors.indexOf(w.mapId);
    const rows = r.top.map((x, k) => `<li class="${k < 3 ? 'p' + (k + 1) : ''}${x.name === this.ch.name ? ' me' : ''}"><i>${k + 1}</i><b>${escapeHtml(x.name)}</b><span>${fmtNum(x.dmg)}</span></li>`).join('');
    const html = `<header><b>${escapeHtml(DUNGEONS[w.dg.dungeon]?.name || '')}</b><span class="t">${mm}:${String(ss).padStart(2, '0')}</span></header>
      <div class="fl">Tầng ${i + 1}/${w.dg.floors.length}</div>
      <ol>${rows || '<li class="none">Chưa ai gây sát thương</li>'}</ol>
      <div class="mine">Hạng của bạn: <b>${r.rank || '—'}</b> · ${fmtNum(r.dmg || 0)} sát thương</div>`;
    if (el._h !== html) { el.innerHTML = html; el._h = html; }
    el.hidden = false;
  },

  winEvEnd() {
    const m = this.evEnd, d = DUNGEONS[m.d];
    const rows = m.top.map((x, k) => `<li class="${k < 3 ? 'p' + (k + 1) : ''}${x.name === this.ch.name ? ' me' : ''}"><i>${k + 1}</i><b>${escapeHtml(x.name)}</b><span>${fmtNum(x.dmg)}</span></li>`).join('');
    const items = m.items.map(([id, q]) => `<span class="evitem">${escapeHtml(ITEMS[id]?.name || id)}${q > 1 ? ' ×' + q : ''}</span>`).join('');
    return `<div class="evend ${m.win ? 'win' : 'lose'}"><small>${escapeHtml(d?.name || '')}</small><h2>${m.win ? 'Chiến thắng!' : 'Sự kiện kết thúc'}</h2>
      <p>${m.win ? 'Ngân Vệ Tướng đã bị đánh bại.' : 'Quỷ Thành vẫn đứng vững… hẹn lần sau.'} Hạng của bạn: <b>${m.rank || '—'}</b> · ${fmtNum(m.dmg)} sát thương</p>
      <h3>Top ${GAME.dungeon.topN} sát thương</h3><ol class="evtop">${rows || '<li class="none">Không ai gây sát thương</li>'}</ol>
      <h3>Phần thưởng</h3><div class="evitems">${items}${m.exp ? `<span class="evitem exp">+${fmtNum(m.exp)} EXP</span>` : ''}</div>
      <button data-act="close">Nhận thưởng</button></div>`;
  },
};
