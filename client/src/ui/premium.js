// Vạn Bảo Các window (premium shop): Nguyên Bảo balance, daily check-in, offers by tab, a live try-on preview.
// Mixed into GameUI (ui/hud.js). Online every action goes to the server (net.premium) and the result comes back
// as item changes; offline the save is changed directly (game/premium.js).
import { ITEMS, SLOT_NAMES, STAT_NAMES, isLookSlot } from '../data/items.js';
import { PREMIUM_SHOP, PREMIUM_TABS } from '../data/premium.js';
import { GAME } from '../config.js';
import { iconForItem } from '../gfx/icons.js';
import { Humanoid, lookFor } from '../game/entities.js';
import { buyLocal, checkinLocal, checkinReward, premiumDay, offerById } from '../game/premium.js';
import { escapeHtml, fmtNum } from '../engine/util.js';

const PREM_CFG = GAME.premium;
const ingotImg = () => iconForItem({ icon: 'ingot', color: '#f0c040' }).url;
const reqId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const owns = (ch, id) => ch.inventory.some((e) => e.id === id) || Object.values(ch.equip).some((e) => e && e.id === id);

export const PremiumUI = {
  openPremium() { this.open = 'premium'; this.premTab = this.premTab || 'cape'; this.premSel = null; this.renderWin(); },

  online() { return !!(this.world && this.world.net); },

  winPremium() {
    const ch = this.ch, tab = this.premTab || 'cape';
    const list = PREMIUM_SHOP.filter((o) => o.tab === tab);
    if (!this.premSel || !list.some((o) => o.id === this.premSel)) this.premSel = list[0]?.id || null;
    const ci = checkinReward(ch.checkin, premiumDay());
    const nextStreak = ci ? ci.streak : ch.checkin?.streak || 0;
    const tabs = PREMIUM_TABS.map((t) => `<button class="${t.id === tab ? 'on' : ''}" data-act="ptab" data-t="${t.id}">${t.name}</button>`).join('');
    const cards = list.map((o) => {
      const [id, n] = o.items[0], it = ITEMS[id];
      return `<button class="pcard ${o.id === this.premSel ? 'sel' : ''}" data-act="psel" data-o="${o.id}">
        ${o.tag ? `<i class="ptag">${escapeHtml(o.tag)}</i>` : ''}<img src="${iconForItem(it).url}" alt="">
        <span>${escapeHtml(it.name)}${n > 1 ? ' ×' + n : ''}</span>
        <b class="pprice"><img src="${ingotImg()}" alt="">${fmtNum(o.price)}</b>${owns(ch, id) && isLookSlot(it.slot) ? '<em class="pown">Đã có</em>' : ''}</button>`;
    }).join('');
    const o = offerById(this.premSel);
    let detail = '<p class="muted">Chọn một món để xem.</p>';
    if (o) {
      const it = ITEMS[o.items[0][0]];
      const stats = it.stats ? '<ul class="stats">' + Object.entries(it.stats).map(([k, v]) => `<li><span>${STAT_NAMES[k]}</span><b>+${v}</b></li>`).join('') + '</ul>' : '';
      const short = (ch.ingots || 0) < o.price;
      const busy = this.premBusy === o.id;
      detail = `<h3>${escapeHtml(it.name)}${o.items[0][1] > 1 ? ' ×' + o.items[0][1] : ''}</h3>
        ${isLookSlot(it.slot) ? `<canvas class="ppreview" id="pPreview" width="300" height="190"></canvas><p class="tag">${SLOT_NAMES[it.slot]} · Huyền Thoại · mọi cấp</p>` : `<p class="tag"><img src="${iconForItem(it).url}" alt="" class="big"></p>`}
        ${stats}${it.desc ? `<p>${escapeHtml(it.desc)}</p>` : ''}
        ${it.slot === 'cape' ? '<p class="outfit-note">Bay theo chuyển động, mặc cùng ngoại trang được.</p>' : ''}
        <div class="acts"><button class="forgebtn" data-act="pbuy" data-o="${o.id}" ${short || busy ? 'disabled' : ''}>${busy ? 'Đang mua…' : `Mua · <img src="${ingotImg()}" alt="" class="pi">${fmtNum(o.price)}`}</button></div>
        ${short ? `<p class="bad small">Còn thiếu ${fmtNum(o.price - (ch.ingots || 0))} Nguyên Bảo.</p>` : ''}`;
    }
    return `<div class="prem">
      <div class="phead"><p class="pbal"><img src="${ingotImg()}" alt=""><span>Nguyên Bảo</span><b id="pBal">${fmtNum(ch.ingots || 0)}</b></p>
        <button class="pcheck ${ci ? 'ready' : ''}" data-act="pcheckin" ${ci && this.premBusy !== 'checkin' ? '' : 'disabled'}>
          ${ci ? `Điểm danh · +${ci.ingots}` : 'Đã điểm danh hôm nay'}<small>Chuỗi ${nextStreak}/${PREM_CFG.checkin.streakDays} ngày · ngày ${PREM_CFG.checkin.streakDays}: +${PREM_CFG.checkin.streakBonus}</small></button></div>
      <div class="tabs">${tabs}</div>
      <div class="pbody"><div class="pgrid">${cards}</div><div class="detail">${detail}</div></div>
      <p class="muted small">Nguyên Bảo kiếm từ: điểm danh mỗi ngày, hạ Đầu Lĩnh (+${PREM_CFG.kill.chief}) và boss dã ngoại (+${PREM_CFG.kill.fieldBoss}), nhiệm vụ thế giới.${this.online() ? '' : ' Chơi ngoại tuyến: lưu trong máy này.'}</p>
    </div>`;
  },

  // A live try-on: our character wearing the cape / outfit, walking in place, the cloth flowing
  startPreview() {
    const cv = document.getElementById('pPreview');
    if (!cv) return;
    const o = offerById(this.premSel), id = o && o.items[0][0], it = id && ITEMS[id];
    if (!it || !isLookSlot(it.slot)) return;
    const ch = this.ch;
    const look = lookFor({ ...ch, equip: { ...ch.equip, [it.slot]: { id } } });
    const h = new Humanoid(0, 0, look);
    h.onGround = true; h.facing = 1;
    const ctx = cv.getContext('2d'), k = 3;
    let t0 = performance.now();
    const frame = (now) => {
      if (!cv.isConnected || this.open !== 'premium') return;
      const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
      const phase = (now / 2600) % 2; // walk to one side, turn, walk back
      h.facing = phase < 1 ? 1 : -1;
      h.vx = h.facing * GAME.physics.moveSpeed * (Math.sin((phase % 1) * Math.PI) > 0.25 ? 1 : 0);
      h.updateAnim(dt);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      const g = ctx.createRadialGradient(150, 160, 4, 150, 160, 110);
      g.addColorStop(0, 'rgba(255,220,140,0.28)'); g.addColorStop(1, 'rgba(255,220,140,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.setTransform(k, 0, 0, k, 0, 0);
      h.x = 50 - h.w / 2; h.y = 58 - h.h;
      h.draw(ctx, 0);
      this.premRaf = requestAnimationFrame(frame);
    };
    cancelAnimationFrame(this.premRaf);
    this.premRaf = requestAnimationFrame(frame);
  },

  premiumAct(a, d) {
    const ch = this.ch;
    switch (a) {
      case 'ptab': this.premTab = d.t; this.premSel = null; this.renderWin(); return true;
      case 'psel': this.premSel = d.o; this.renderWin(); return true;
      case 'pbuy': {
        const o = offerById(d.o);
        if (!o) return true;
        if (this.online()) {
          if (!this.world.net.premium('buy', { offer: o.id, req: reqId() })) { this.toast('Chưa kết nối máy chủ, thử lại sau', 'warn'); return true; }
          this.premBusy = o.id; this.renderWin();
        } else {
          const r = buyLocal(ch, o.id);
          if (!r.ok) { this.toast(r.msg, 'warn'); return true; }
          this.boughtPremium(o);
          this.world.recalc(); this.refreshAll(); this.cb.save();
        }
        return true;
      }
      case 'pcheckin': {
        if (this.online()) {
          if (!this.world.net.premium('checkin')) { this.toast('Chưa kết nối máy chủ, thử lại sau', 'warn'); return true; }
          this.premBusy = 'checkin'; this.renderWin();
        } else {
          const r = checkinLocal(ch);
          if (r) this.checkedIn(r.ingots, r.streak);
          this.refreshAll(); this.cb.save();
        }
        return true;
      }
    }
    return false;
  },

  boughtPremium(o) {
    const it = ITEMS[o.items[0][0]];
    this.toast(`Đã mua <b>${escapeHtml(it.name)}</b>${o.items[0][1] > 1 ? ' ×' + o.items[0][1] : ''}`, 'quest');
    if (isLookSlot(it.slot)) this.banner(`<small>Vạn Bảo Các</small>${escapeHtml(it.name)}`);
    const w = this.world;
    w.burst(w.player.cx, w.player.cy, '#ffd76a', 20, 100, { shape: 'star' });
  },
  checkedIn(n, streak) {
    this.toast(`Điểm danh ngày ${streak}/${PREM_CFG.checkin.streakDays}: +${n} Nguyên Bảo`, 'quest');
    const w = this.world;
    w.floatText(w.player.cx, w.player.y - 14, `+${n} Nguyên Bảo`, '#ffd76a', false, true);
  },

  // Server answers (online): { op, ok, why?, got?, streak?, offer?, quest? }
  onPremium(m) {
    const ch = this.ch, why = { ingots: 'Không đủ Nguyên Bảo', full: 'Túi đồ đầy', offer: 'Món này không còn bán', rate: 'Thao tác quá nhanh, thử lại sau', done: 'Hôm nay đã điểm danh rồi' };
    if (m.op === 'buy') {
      this.premBusy = null;
      if (m.ok) this.boughtPremium(offerById(m.offer));
      else if (m.why !== 'dup') this.toast(why[m.why] || 'Không mua được', 'warn');
    } else if (m.op === 'checkin') {
      this.premBusy = null;
      if (m.ok) { ch.checkin = { day: premiumDay(), streak: m.streak }; this.checkedIn(m.got, m.streak); }
      else if (m.why === 'done') { ch.checkin = { day: premiumDay(), streak: ch.checkin?.streak || 1 }; this.toast(why.done, 'warn'); }
    } else if (m.op === 'claim') {
      this.world.claimAnswer(m);
      if (m.ok) this.toast(`Nhận ${m.got} Nguyên Bảo từ nhiệm vụ`, 'quest');
    } else if (m.op === 'kill' && m.ok) {
      this.addChat('Hệ thống', `Nhận ${m.got} Nguyên Bảo!`, 'system');
      const w = this.world; w.floatText(w.player.cx, w.player.y - 24, `+${m.got} Nguyên Bảo`, '#ffd76a', false, true);
    }
    if (this.open === 'premium') this.renderWin();
  },
};
