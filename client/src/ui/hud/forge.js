// GameUI: blacksmith (enhance, gems) and crafting windows.
import { ITEMS, SLOT_NAMES, STAT_NAMES, ENHANCE_MAX, ENHANCE_RATE, ENHANCE_SAFE, enhanceCost, GEM_KINDS, GEM_SLOTS, GEM_FUSE, gemId, socketCount, socketCost, isLookSlot } from '../../../../shared/data/items.js';
import { RECIPES } from '../../../../shared/data/recipes.js';
import { iconForItem } from '../../gfx/icons.js';
import { entryStats, entryName, enhanceEntry, countItem, gemFits, canCraft, craft } from '../../../../shared/rules/character.js';
import { escapeHtml, fmtNum } from '../../../../shared/util.js';
import { $, itemName } from './helpers.js';

export const ForgeUI = {
  // Forge: 3 tabs Enhance / Socket / Fuse
  winForge() {
    const tab = this.forgeTab || 'enh';
    const tabs = [['enh', 'Cường hóa'], ['gem', 'Ép ngọc'], ['fuse', 'Hợp ngọc']]
      .map(([t, l]) => `<button class="${tab === t ? 'on' : ''}" data-act="ftab" data-t="${t}">${l}</button>`).join('');
    const body = tab === 'fuse' ? this.forgeFuse() : this.forgeEquip(tab);
    return `<div class="tabs">${tabs}<span class="gold">Ngân lượng <b>${fmtNum(this.ch.gold)}</b></span></div>${body}
      ${this.forgeMsg ? `<p class="forgemsg ${this.forgeMsg.cls}">${this.forgeMsg.text}</p>` : ''}`;
  },

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
  },

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
  },

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
  },

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
  },

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
  },

  // Crafting: recipe list, materials owned / needed
  winCraft() {
    const ch = this.ch;
    if (!this.craftSel) this.craftSel = RECIPES[0].id;
    const r = RECIPES.find((x) => x.id === this.craftSel);
    const outIt = (rc) => ITEMS[rc.out[0]] || { name: 'Ngọc ngẫu nhiên (Sơ)', icon: 'gem', color: '#ff4a5e', type: 'gem', gem: { g: 1 } };
    const icon = (it) => iconForItem(it).url;
    const list = ['outfit', 'cape', 'use'].map((cat) => `<h4>${{ outfit: 'Ngoại trang', cape: 'Áo choàng', use: 'Đồ dùng' }[cat]}</h4>` + RECIPES.filter((x) => x.cat === cat).map((x) => {
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
        ${isLookSlot(it.slot) ? `<p class="outfit-note">${SLOT_NAMES[it.slot]} · Cấp ${it.lv}</p>` : ''}${stats}
        <h4>Nguyên liệu</h4><ul class="need">${need}<li class="${ch.gold >= r.gold ? 'ok' : ''}"><img src="${iconForItem({ icon: 'gold', color: '#e8c35a' }).url}" alt=""><span>Tiền công</span><b>${fmtNum(r.gold)}</b></li></ul>
        <div class="acts"><button class="forgebtn" data-act="craft" data-n="1" ${err ? 'disabled' : ''}>Chế tạo</button>${r.cat === 'use' ? `<button data-act="craft" data-n="5" ${multi ? '' : 'disabled'}>×5</button>` : ''}</div>
        ${err ? `<p class="muted small">${escapeHtml(err)}</p>` : ''}
        ${this.craftMsg ? `<p class="forgemsg ${this.craftMsg.cls}">${escapeHtml(this.craftMsg.text)}</p>` : ''}</div></div>`;
  },
};
