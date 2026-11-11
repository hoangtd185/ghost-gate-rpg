// GameUI windows: inventory, character, skills, quests, system, death.
import { CLASSES, SKILLS, SKILL_MAX_LV, SKILL_KEYS, PASSIVES, PASSIVE_MAX_LV, PASSIVE_NAMES, passivesOf } from '../../../../shared/data/classes.js';
import { ITEMS, RARITY, SLOT_NAMES, STAT_NAMES, GEM_GRADES, GEM_SLOTS, socketCount, unsocketCost, isLookSlot } from '../../../../shared/data/items.js';
import { ELEMENTS, ELEMENT_IDS } from '../../../../shared/data/elements.js';
import { NPCS, QUESTS } from '../../../../shared/data/npcs.js';
import { CHAPTERS } from '../../../../shared/data/story.js';
import { WORLD_CHAINS } from '../../../../shared/data/world.js';
import { RECIPES } from '../../../../shared/data/recipes.js';
import { fillText } from '../../game/chatter.js';
import { iconForItem } from '../../gfx/icons.js';
import { entryStats, unequip, sellPrice, canEquip, questStatus, questProgress, INV_SIZE, entryElement, questTurnIn, passiveBlock, resetCost } from '../../../../shared/rules/character.js';
import { SKILL_GLYPH, SKILL_COLOR } from '../skillglyphs.js';
import { escapeHtml, fmtNum } from '../../../../shared/util.js';
import { GAME } from '../../../../shared/config.js';
import { $, itemName, elTag, npcMapName, MAIN_COUNT, nextMainQuest, toneTag, chainProgress, catOf, catTag, rewardText } from './helpers.js';

export const PanelsUI = {
  slotHtml(e, extraCls = '', act = 'sel') {
    if (!e) return `<div class="islot empty ${extraCls}"></div>`;
    const it = ITEMS[e.id];
    const sel = this.selected === e.uid ? ' sel' : '';
    return `<button class="islot r${e.r || 0}${sel} ${extraCls}" data-act="${act}" data-uid="${e.uid}" title="${escapeHtml(it.name)}">
      <img src="${iconForItem(it).url}" alt="">${e.qty > 1 ? `<small>${e.qty}</small>` : ''}${e.e ? `<i class="plusn">+${e.e}</i>` : ''}${entryElement(e) ? `<i class="eldot" style="background:${ELEMENTS[entryElement(e)].color}"></i>` : ''}${e.g && e.g.length ? `<i class="gemdots">${e.g.map((id) => `<b style="background:${ITEMS[id].color}"></b>`).join('')}</i>` : ''}</button>`;
  },

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
    if (it.type === 'equip' && !isLookSlot(it.slot)) html += `<p class="sockets">Lỗ khảm: ${this.socketHtml(e)}</p>`;
    if (it.slot === 'outfit') html += `<p class="outfit-note">Ngoại trang thay đổi diện mạo nhân vật${it.look && it.look.aura ? ', có hào quang' : ''}.</p>`;
    if (it.slot === 'cape') html += `<p class="outfit-note">Áo choàng bay theo chuyển động, mặc cùng ngoại trang được (thay áo choàng có sẵn của ngoại trang).</p>`;
    if (isLookSlot(it.slot) && it.src) html += `<p class="muted small">Nguồn: ${escapeHtml(it.src)}</p>`;
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
  },

  // Item details without action buttons (the other side's items in a trade)
  itemDetailPlain(e) { return this.itemDetail(e, 'view').replace(/<div class="acts">[\s\S]*<\/div>$/, ''); },

  // Socket: the inserted gem or an empty slot
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
  },

  findEntry(uid) {
    const ch = this.ch;
    return ch.inventory.find((x) => x.uid === uid) || Object.values(ch.equip).find((x) => x && x.uid === uid) || null;
  },

  winInventory(mode = 'inv') {
    const ch = this.ch;
    const eq = GAME.player.equipSlots.map((s) => `<div class="eqs"><label>${SLOT_NAMES[s]}</label>${this.slotHtml(ch.equip[s])}</div>`).join('');
    const cells = [];
    for (let i = 0; i < INV_SIZE; i++) cells.push(this.slotHtml(ch.inventory[i]));
    const sel = this.selected && this.findEntry(this.selected);
    return `<div class="inv">
      ${mode === 'inv' ? `<div class="equip">${eq}</div>` : ''}
      <div><div class="grid">${cells.join('')}</div><p class="gold"><span>Ngân lượng</span><b>${fmtNum(ch.gold)}</b></p><p class="muted small">${ch.inventory.length}/${INV_SIZE} ô</p></div>
      <div class="detail">${this.itemDetail(sel, mode)}</div></div>`;
  },

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
  },

  winSkills() {
    const ch = this.ch, tab = this.skillTab || 'act';
    const head = `<div class="tabs"><button class="${tab === 'act' ? 'on' : ''}" data-act="stab" data-t="act">Chiêu thức</button><button class="${tab === 'pas' ? 'on' : ''}" data-act="stab" data-t="pas">Nội công <small>(bị động)</small></button>
      <span class="gold">Điểm kỹ năng <b>${ch.skillPoints}</b></span></div>`;
    return head + (tab === 'act' ? this.skillsActive() : this.skillsPassive());
  },

  skillsActive() {
    const ch = this.ch, pas = this.world.stats.pas;
    const list = CLASSES[ch.cls].skills.map((sid, i) => {
      const sk = SKILLS[sid], lv = ch.skills[sid];
      const can = lv && ch.skillPoints > 0 && lv < SKILL_MAX_LV;
      const mp = Math.ceil(sk.mp * (1 - pas.mpCost / 100));
      return `<li class="${lv ? '' : 'locked'}" style="--c:${SKILL_COLOR[sid]}"><span class="glyph" style="color:${SKILL_COLOR[sid]}">${SKILL_GLYPH[sid]}</span>
        <div><h3>${sk.name} <kbd>${SKILL_KEYS[i]}</kbd> ${lv ? `<small>Cấp ${lv}/${SKILL_MAX_LV}</small>` : `<small>Mở ở cấp ${sk.unlock}</small>`}</h3>
        <p>${sk.desc}</p><p class="muted small">Nội lực ${mp} · Hồi chiêu ${sk.cd}s${sk.mult ? ` · Sát thương ${Math.round(sk.mult * (1 + GAME.player.skillDmgPerLv * ((lv || 1) - 1)) * 100)}%${lv && lv < SKILL_MAX_LV ? ` → ${Math.round(sk.mult * (1 + 0.12 * lv) * 100)}%` : ''}` : ''}</p></div>
        ${can ? `<button class="plus" data-act="skillup" data-sid="${sid}" aria-label="Nâng ${sk.name}">+</button>` : ''}</li>`;
    }).join('');
    return `<p class="muted small">+1 điểm mỗi cấp. Mỗi cấp chiêu +12% sát thương. Điểm dùng chung với Nội công.</p><ul class="skills">${list}</ul>`;
  },

  // Passive tree: 4 linked tiers; a lower tier needs the tier above at the required level
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
  },

  winQuests() {
    const ch = this.ch;
    const groups = { active: [], main: [], tut: [], side: [], daily: [], world: [], done: [] };
    const order = { main: 0, world: 1, tut: 2, side: 3, daily: 4 };
    const ids = Object.keys(QUESTS).sort((a, b) => order[catOf(QUESTS[a])] - order[catOf(QUESTS[b])]);
    for (const qid of ids) {
      const s = questStatus(ch, qid), q = QUESTS[qid];
      const tags = catTag(q) + (q.chapter ? ` <span class="chap">${escapeHtml(CHAPTERS[q.chapter])}</span>` : '') + (q.chain ? ` <span class="chap">${escapeHtml(WORLD_CHAINS[q.chain].name)}</span>` : '');
      if (s === 'active' || s === 'ready') {
        const prog = q.type === 'talk' ? `<p class="muted small">Đến gặp ${NPCS[q.target].name} ở ${npcMapName(q.target)}.</p>`
          : `<div class="prog"><i style="width:${100 * questProgress(ch, qid) / q.count}%"></i><b>${questProgress(ch, qid)} / ${q.count}</b></div>`;
        groups.active.push(`<li class="${s} c-${catOf(q)}"><h3>${q.name} ${tags}</h3><p>${escapeHtml(fillText(q.text, ch))}</p>${prog}
          ${q.hint ? `<p class="qhint">💡 ${escapeHtml(fillText(q.hint, ch))}</p>` : ''}
          <p class="reward">Thưởng: ${rewardText(q, ch.cls)}</p>
          ${s === 'ready' ? `<p class="good">Đã xong! Đến gặp ${NPCS[questTurnIn(q)].name} (${npcMapName(questTurnIn(q))}).</p>` : ''}</li>`);
      } else if (s === 'available' && catOf(q) === 'world') {
        continue; // listed per chain below
      } else if (s === 'available') {
        groups[catOf(q)].push(`<li class="c-${catOf(q)}"><h3>${q.name} ${tags}</h3><p class="muted">Gặp ${NPCS[q.npc].name} ở ${npcMapName(q.npc)}. Cấp ${q.lv}+</p><p class="reward">Thưởng: ${rewardText(q, ch.cls)}</p></li>`);
      } else if (s === 'done' && catOf(q) === 'main') groups.done.push(`<li class="done"><h3>${q.name} <span class="chap">${escapeHtml(CHAPTERS[q.chapter])}</span></h3></li>`);
    }
    // world quest chains: mood, progress, where the next step starts
    for (const [id, c] of Object.entries(WORLD_CHAINS)) {
      const { done, total } = chainProgress(ch, c);
      const nextQ = c.steps.map((qid) => [qid, questStatus(ch, qid)]).find(([, st]) => st === 'available');
      const busy = c.steps.some((qid) => ['active', 'ready'].includes(questStatus(ch, qid)));
      const finished = done >= total;
      if (!nextQ && !busy && !finished && !ch.flags['wq_' + id]) continue; // not found yet
      const where = nextQ ? `Bước tiếp: <b>${QUESTS[nextQ[0]].name}</b> · gặp ${NPCS[QUESTS[nextQ[0]].npc].name} ở ${npcMapName(QUESTS[nextQ[0]].npc)} (cấp ${QUESTS[nextQ[0]].lv}+)` : busy ? 'Đang làm (xem phía trên).' : finished ? 'Đã hoàn thành.' : 'Bước tiếp chưa mở (cần cấp cao hơn).';
      groups.world.push(`<li class="c-world ${finished ? 'done' : ''}"><h3>${escapeHtml(c.name)} ${toneTag(c)} <span class="chap">${done}/${total}</span></h3>
        ${finished ? '' : `<p class="muted small">${escapeHtml(c.blurb)}</p>`}<p class="small">${where}</p></li>`);
    }
    const next = nextMainQuest(ch);
    const nextMsg = next && questStatus(ch, next) === 'locked' ? `<li class="muted">Cốt truyện tiếp theo: <b>${QUESTS[next].name}</b> mở ở cấp ${QUESTS[next].lv}.</li>` : '';
    const sec = (title, arr, empty) => `<h4>${title}</h4><ul class="quests">${arr.join('') || (empty ? `<li class="muted">${empty}</li>` : '')}</ul>`;
    const nMain = MAIN_COUNT, nDone = Object.keys(QUESTS).filter((id) => catOf(QUESTS[id]) === 'main' && questStatus(ch, id) === 'done').length;
    return `<p class="muted small">Tiến độ cốt truyện: <b>${nDone}/${nMain}</b></p>`
      + sec('Đang làm', groups.active, 'Chưa nhận nhiệm vụ nào.')
      + sec('Cốt truyện', groups.main.length ? groups.main : nextMsg ? [nextMsg] : [], nDone >= nMain ? 'Bạn đã đi hết cốt truyện hiện có.' : 'Hoàn thành nhiệm vụ đang làm để mở tiếp.')
      + (groups.world.length ? sec('Nhiệm vụ thế giới', groups.world) : '')
      + (groups.tut.length ? sec('Hướng dẫn', groups.tut) : '')
      + (groups.side.length ? sec('Nhiệm vụ phụ', groups.side) : '')
      + (groups.daily.length ? sec('Hằng ngày', groups.daily) : '')
      + (groups.done.length ? `<details><summary>Cốt truyện đã qua (${groups.done.length})</summary><ul class="quests">${groups.done.join('')}</ul></details>` : '');
  },

  questProgress(qid) {
    const q = QUESTS[qid], ch = this.ch;
    const n = questProgress(ch, qid);
    this.toast(`${q.name}: ${n}/${q.count}${n >= q.count ? ' · <b>Xong!</b>' : ''}`, n >= q.count ? 'quest' : '');
    this.refreshTracker();
    if (this.open === 'quest') this.renderWin();
  },

  winSystem() {
    const s = this.cb.storage;
    return `<div class="sys">
      <p class="muted">Dữ liệu được lưu tại: <b>${s.label}</b>${s.username ? ` · tài khoản <b>${escapeHtml(s.username)}</b>` : ''}. Game tự lưu mỗi ${GAME.save.autosaveSec} giây.</p>
      <div class="acts col"><button data-act="save">Lưu ngay</button><button data-act="switch">Đổi nhân vật</button>${s.kind === 'api' ? '<button data-act="logout" class="ghost">Đăng xuất</button>' : ''}</div>
      <h4>Phím điều khiển</h4>
      <table class="keys"><tr><td><kbd>←</kbd><kbd>→</kbd></td><td>Di chuyển (nhấn đúp rồi giữ = chạy nhanh)</td><td><kbd>Space</kbd> / <kbd>X</kbd></td><td>Nhảy (giữ = cao hơn, nhấn 2 lần = nhảy đôi)</td></tr>
      <tr><td><kbd>↓</kbd>+<kbd>Space</kbd> / <kbd>Ctrl</kbd>+<kbd>↓</kbd></td><td>Nhảy xuống bục</td><td><kbd>↓</kbd></td><td>Ngồi nghỉ (hồi nhanh)</td></tr>
      <tr><td><kbd>Z</kbd> / <kbd>J</kbd></td><td>Đánh thường (giữ)</td><td><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></td><td>Kỹ năng</td></tr>
      <tr><td><kbd>1</kbd> <kbd>2</kbd></td><td>Bình máu / linh khí</td><td><kbd>↑</kbd> / <kbd>E</kbd></td><td>Qua cổng, nói chuyện</td></tr>
      <tr><td><kbd>I</kbd><kbd>C</kbd><kbd>K</kbd><kbd>L</kbd></td><td>Các cửa sổ</td><td><kbd>Enter</kbd></td><td>Chat (gõ <kbd>!</kbd> đầu câu = kênh thế giới)</td></tr>
      <tr><td><kbd>P</kbd></td><td>Gọi / cất pet Tiểu Quỷ</td><td><kbd>T</kbd></td><td>Giao dịch với người chơi đứng gần</td></tr>
      <tr><td><kbd>G</kbd></td><td>Mời người đứng gần vào tổ đội</td><td><kbd>B</kbd></td><td>Vạn Bảo Các (áo choàng, điểm danh)</td></tr></table></div>`;
  },

  winDeath() {
    if (this.world?.dg) return `<div class="death"><h2>Bạn đã gục ngã</h2><p>Trong sự kiện không mất kinh nghiệm.</p><button data-act="respawn">Hồi sinh tại chỗ</button></div>`;
    return `<div class="death"><h2>Bạn đã gục ngã</h2><p>Mất ${fmtNum(this.deathLoss || 0)} điểm kinh nghiệm.</p><button data-act="respawn">Hồi sinh tại làng</button></div>`;
  },

  showDeath(loss) { this.deathLoss = loss; this.open = 'death'; this.renderWin(); },
};
