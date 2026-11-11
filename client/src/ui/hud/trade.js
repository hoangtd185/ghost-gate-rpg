// GameUI: parties and player-to-player trades.
import { ITEMS } from '../../../../shared/data/items.js';
import { MAPS } from '../../../../shared/data/maps.js';
import { INV_SIZE } from '../../../../shared/rules/character.js';
import { escapeHtml, fmtNum } from '../../../../shared/util.js';
import { GAME } from '../../../../shared/config.js';
import { $ } from './helpers.js';

export const TradeUI = {
  // ================= ACTIONS =================
  // Items in our trade offer cannot be used, equipped, sold, dropped or forged until the trade ends
  inTrade(uid) { return !!(this.trade && uid && this.trade.offer.some((o) => o.uid === uid)); },

  // ================= PARTY (online) =================
  // G next to another player: invite them (you become the leader if you have no party yet)
  askParty() {
    const w = this.world;
    if (!w || !w.net || !w.net.connected) { this.toast('Tổ đội cần kết nối máy chủ', 'warn'); return; }
    const r = w.nearestRemote();
    if (!r) { this.toast('Đứng gần người chơi khác rồi nhấn G để mời vào tổ đội', 'warn'); return; }
    w.net.party('invite', { to: r.id });
  },

  onParty(m) {
    const w = this.world;
    if (!w) return;
    if (m.t === 'party_ask') {
      this.showAsk('partyAsk', `<b>${escapeHtml(m.name)}</b> mời bạn vào tổ đội`, (yes) => w.net?.party('answer', { from: m.from, yes }), GAME.net.party.inviteTimeoutSec);
    } else if (m.t === 'party_state') {
      const had = !!this.party;
      this.party = m.party; w.party = m.party;
      if (m.party && !had) this.toast('Đã vào tổ đội: EXP chia đều, mỗi người nhận đồ rơi riêng', 'quest');
      if (!m.party && had) this.toast('Đã rời tổ đội');
      this.renderParty();
    } else if (m.t === 'party_err') {
      const msg = { far: 'Đứng gần hơn để mời', nobody: 'Không tìm thấy người chơi', has_party: `${escapeHtml(m.name || 'Người đó')} đã có tổ đội`, not_leader: 'Chỉ đội trưởng mới mời được',
        full: `Tổ đội đã đủ ${GAME.net.party.maxSize} người`, expired: 'Lời mời đã hết hạn', declined: `${escapeHtml(m.name || 'Người kia')} đã từ chối`, invited: `Đã mời <b>${escapeHtml(m.name || '')}</b> vào tổ đội…` }[m.why] || 'Không mời được';
      this.toast(msg, m.why === 'invited' ? '' : 'warn');
    }
  },

  renderParty() {
    const el = $('#hParty', this.root), pt = this.party;
    if (!pt) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    const me = this.ch.id;
    el.innerHTML = `<header><b>Tổ đội</b><button class="ghost" data-pleave title="Rời tổ đội">Rời</button></header>` + pt.members.map((x) => {
      const where = x.map && MAPS[x.map] ? MAPS[x.map].name : '';
      return `<div class="pm${x.id === me ? ' me' : ''}">${x.id === pt.leader ? '♛ ' : ''}<b>${escapeHtml(x.name)}</b> <small>Lv.${x.lv}${where ? ' · ' + escapeHtml(where) : ''}</small></div>`;
    }).join('');
    el.querySelector('[data-pleave]').addEventListener('click', () => this.world?.net?.party('leave'));
  },

  // A yes/no request popup (trade or party invitation); answer(yes) is called once
  showAsk(id, html, answer, timeoutSec) {
    $('#' + id, this.root)?.remove();
    const el = document.createElement('div');
    el.className = 'trade-ask'; el.id = id;
    el.innerHTML = `<p>${html}</p><div class="acts"><button data-yes="1">Đồng ý</button><button class="ghost" data-yes="0">Từ chối</button></div>`;
    let done = false;
    const close = () => { clearTimeout(t); el.remove(); };
    el.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { if (done) return; done = true; answer(b.dataset.yes === '1'); close(); }));
    const t = setTimeout(close, timeoutSec * 1000);
    this.root.appendChild(el);
  },

  // ================= TRADE (online) =================
  // T near another player: ask for a trade. The server checks distance and that nobody is busy.
  askTrade() {
    const w = this.world;
    if (!w || !w.net || !w.net.connected) { this.toast('Giao dịch cần kết nối máy chủ', 'warn'); return; }
    if (this.trade) { this.open = 'trade'; this.renderWin(); return; }
    const r = w.nearestRemote();
    if (!r) { this.toast('Đứng gần người chơi khác rồi nhấn T để giao dịch', 'warn'); return; }
    w.net.trade('ask', { to: r.id });
  },

  // Messages from the server about trades
  onTrade(m) {
    const w = this.world;
    if (!w) return;
    switch (m.t) {
      case 'trade_ask': this.showTradeAsk(m); break;
      case 'trade_open':
        this.hideTradeAsk();
        this.trade = { id: m.id, with: m.with, offer: [], gold: 0, me: null, them: null };
        w.trading = true;
        this.cb.save(); // the server checks offers against the saved bag, so upload it now
        this.open = 'trade'; this.selected = null; this.renderWin();
        break;
      case 'trade_state':
        if (!this.trade || this.trade.id !== m.id) break;
        this.trade.me = m.me; this.trade.them = m.them;
        this.trade.retried = false; // the server accepted an offer: a later 'sync' may retry once again
        if (this.open === 'trade') this.renderWin();
        break;
      case 'trade_end': {
        const t = this.trade;
        this.trade = null; w.trading = false;
        if (this.open === 'trade') { this.open = null; $('#win', this.root).hidden = true; }
        const why = { done: `Giao dịch với <b>${escapeHtml(t?.with.name || '')}</b> thành công`, cancel: m.by ? `${escapeHtml(m.by)} đã hủy giao dịch` : 'Đã hủy giao dịch', moved: 'Giao dịch bị hủy vì rời bản đồ', left: 'Người kia đã rời đi, giao dịch bị hủy' }[m.why]
          || 'Giao dịch thất bại, đồ đạc vẫn giữ nguyên';
        this.toast(why, m.why === 'done' ? 'quest' : 'warn');
        break;
      }
      case 'trade_err': {
        if (m.why === 'sync' && this.trade && !this.trade.retried) {
          // our bag on the server is behind (unsaved changes): save, then offer again, once (until a trade_state)
          const id = this.trade.id;
          this.trade.retried = true; this.cb.save();
          setTimeout(() => {
            const t = this.trade;
            if (!t || t.id !== id || !this.world) return; // that trade is over, or we left the game
            // quantities may have changed since the offer was made (potions used, stacks merged): take them from the bag
            t.offer = t.offer.map((o) => this.ch.inventory.find((e) => e.uid === o.uid)).filter(Boolean).map((e) => ({ uid: e.uid, qty: e.qty }));
            t.gold = Math.min(t.gold, this.ch.gold);
            this.sendOffer();
          }, 1500);
          break;
        }
        const msg = { far: 'Đứng gần hơn để giao dịch', busy: 'Người đó đang bận giao dịch', nobody: 'Không tìm thấy người chơi', expired: 'Lời mời đã hết hạn',
          declined: `${escapeHtml(m.name || 'Người kia')} đã từ chối giao dịch`, asked: `Đã mời <b>${escapeHtml(m.name || '')}</b> giao dịch, chờ trả lời…`,
          locked: 'Mở khóa trước khi đổi đồ', too_many: 'Quá nhiều vật phẩm', not_locked: 'Cả hai cần khóa trước khi xác nhận', sync: 'Túi đồ chưa đồng bộ, thử lại sau giây lát' }[m.why] || 'Không giao dịch được';
        this.toast(msg, m.why === 'asked' ? '' : 'warn');
        break;
      }
    }
  },

  showTradeAsk(m) {
    this.showAsk('tradeAsk', `<b>${escapeHtml(m.name)}</b> mời bạn giao dịch`, (yes) => this.world?.net?.trade('answer', { from: m.from, yes }), GAME.net.trade.askTimeoutSec);
  },

  hideTradeAsk() { $('#tradeAsk', this.root)?.remove(); },

  sendOffer() {
    const t = this.trade;
    if (t) this.world.net.trade('offer', { items: t.offer, gold: t.gold });
  },

  // Trade window actions; returns true if handled
  tradeAct(a, d) {
    const t = this.trade, net = this.world?.net;
    if (!t || !net) return false;
    switch (a) {
      case 'toffer': { // put an item from the bag in, or take it out
        const e = this.ch.inventory.find((x) => x.uid === d.uid);
        if (!e) return true;
        if (t.me?.locked) { this.toast('Mở khóa trước khi đổi đồ', 'warn'); return true; }
        if (ITEMS[e.id].type === 'quest' && !t.offer.some((o) => o.uid === e.uid)) { this.toast('Không giao dịch được vật phẩm nhiệm vụ', 'warn'); return true; }
        if (ITEMS[e.id].type === 'quest') { this.toast('Không giao dịch được vật phẩm nhiệm vụ', 'warn'); return true; }
        const i = t.offer.findIndex((o) => o.uid === e.uid);
        if (i >= 0) t.offer.splice(i, 1);
        else if (t.offer.length >= GAME.net.trade.maxItems) { this.toast('Tối đa ' + GAME.net.trade.maxItems + ' món', 'warn'); return true; }
        else t.offer.push({ uid: e.uid, qty: e.qty });
        this.selected = e.uid;
        this.sendOffer(); this.renderWin();
        return true;
      }
      case 'tgold': {
        const inp = $('#tGold', this.root);
        const g = Math.max(0, Math.min(this.ch.gold, Math.floor(+inp.value || 0)));
        t.gold = g; this.sendOffer();
        return true;
      }
      case 'tlock': net.trade('lock', { on: !t.me?.locked }); return true;
      case 'tconfirm': net.trade('confirm'); return true;
      case 'tcancel': net.trade('cancel'); return true;
      case 'tsel': this.selected = d.uid; this.renderWin(); return true;
    }
    return false;
  },

  winTrade() {
    const t = this.trade, ch = this.ch;
    if (!t) return '<p class="muted">Không có giao dịch.</p>';
    const me = t.me || { items: [], gold: 0 }, them = t.them || { items: [], gold: 0 };
    const cells = (items, act) => {
      const out = items.map((e) => this.slotHtml(e, '', act));
      for (let i = items.length; i < GAME.net.trade.maxItems; i++) out.push(this.slotHtml(null));
      return out.join('');
    };
    const status = (x) => (x.confirmed ? '<b class="ok">✓ Đã xác nhận</b>' : x.locked ? '<b class="ok">🔒 Đã khóa</b>' : '<span class="muted">Đang chọn đồ…</span>');
    const offered = new Set(t.offer.map((o) => o.uid));
    const bag = [];
    for (let i = 0; i < INV_SIZE; i++) {
      const e = ch.inventory[i];
      bag.push(this.slotHtml(e, e && offered.has(e.uid) ? 'intrade' : '', 'toffer'));
    }
    const sel = this.selected && (me.items.concat(them.items).find((e) => e.uid === this.selected) || this.findEntry(this.selected));
    const both = me.locked && them.locked;
    return `<div class="trade">
      <section class="tside"><h3>Bạn</h3><div class="grid tgrid">${cells(me.items, 'toffer')}</div>
        <p class="gold"><span>Ngân lượng</span><input id="tGold" type="number" min="0" max="${ch.gold}" value="${t.gold}" ${me.locked ? 'disabled' : ''}><button class="ghost" data-act="tgold" ${me.locked ? 'disabled' : ''}>Đặt</button></p>
        <p>${status(me)}</p></section>
      <section class="tside"><h3>${escapeHtml(t.with.name)}</h3><div class="grid tgrid">${cells(them.items, 'tsel')}</div>
        <p class="gold"><span>Ngân lượng</span><b>${fmtNum(them.gold || 0)}</b></p><p>${status(them)}</p></section>
      <div class="detail">${sel ? this.itemDetailPlain(sel) : '<p class="muted">Bấm vào một món để xem chi tiết.</p>'}</div>
    </div>
    <p class="muted small">Bấm đồ trong túi để đặt vào hoặc lấy ra. Đổi đồ thì cả hai phải khóa lại. Khi cả hai đã khóa, bấm Giao dịch để xác nhận.</p>
    <div class="grid tbag">${bag.join('')}</div>
    <div class="acts"><button data-act="tlock">${me.locked ? 'Mở khóa' : 'Khóa'}</button>
      <button data-act="tconfirm" ${both && !me.confirmed ? '' : 'disabled'}>Giao dịch</button>
      <button class="ghost" data-act="tcancel">Hủy</button></div>`;
  },
};
