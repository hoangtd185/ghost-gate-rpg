// GameUI: click actions from the windows (data-act), item use and pet.
import { PASSIVES } from '../../../../shared/data/classes.js';
import { ITEMS, SLOT_NAMES, isLookSlot } from '../../../../shared/data/items.js';
import { ELEMENTS } from '../../../../shared/data/elements.js';
import { QUESTS } from '../../../../shared/data/npcs.js';
import { CHAPTERS, SCENES } from '../../../../shared/data/story.js';
import { RECIPES } from '../../../../shared/data/recipes.js';
import { equipEntry, unequip, removeEntry, addItem, sellPrice, upgradeSkill, addStat, entryName, socketGem, unsocketGem, fuseGems, learnPassive, resetSkills, craft } from '../../../../shared/rules/character.js';
import { escapeHtml } from '../../../../shared/util.js';
import { $, itemName } from './helpers.js';

export const ActionsUI = {
  act(a, d) {
    if (['use', 'equip', 'drop', 'sell', 'sellall', 'fsel'].includes(a) && this.inTrade(d.uid)) { this.toast('Vật phẩm đang trong giao dịch', 'warn'); return; }
    if (a.startsWith('t') && this.tradeAct(a, d)) return;
    if (a.startsWith('p') && this.premiumAct(a, d)) return;
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
      case 'premwin': this.openPremium(); break;
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
      case 'qchoice': {
        // choice at the end of a quest: set the flag, play its lines, then the reward
        const q = QUESTS[this.dlg.qid], o = q && q.choice && q.choice.options[+d.i];
        if (!o) break;
        ch.flags[o.flag[0]] = o.flag[1];
        const { onEnd, title, chapter } = this.dlg;
        this.startDialog(o.lines, { title, chapter, onEnd, choices: [{ act: 'dend', label: 'Nhận thưởng' }] });
        break;
      }
      case 'dchoice': {
        // choice in a story scene: set the flag, then play its own dialogue
        const sc = SCENES[this.sceneId], c = sc && sc.choices[+d.i];
        if (!c) break;
        ch.flags[c.flag[0]] = c.flag[1];
        const end = this.dlg.onEnd;
        this.startDialog(c.lines, { title: this.dlg.title, chapter: this.dlg.chapter, onEnd: end });
        break;
      }
      case 'dend': { const dd = this.dlg; this.dlg = null; if (dd && dd.onEnd) dd.onEnd(); else this.close(); break; }
      case 'qtalk': {
        ch.quests[d.q].p = 1; // met the right person
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
        if (isLookSlot(it.slot)) { this.banner(`<small>${SLOT_NAMES[it.slot]} mới</small>${escapeHtml(it.name)}`); this.addChat('Hệ thống', `${ch.name} vừa thêu xong ${it.name}!`, 'system'); }
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
  },

  togglePet() {
    const ch = this.ch;
    if (!ch.pet) { this.toast('Chưa có pet. Gặp Trưởng Làng nhận nhiệm vụ Bạn Đồng Hành Nhỏ', 'warn'); return; }
    this.world.setPet(!ch.pet.on);
    this.toast(ch.pet.on ? 'Tiểu Quỷ: "Em đây, chủ nhân!"' : 'Tiểu Quỷ đi nghỉ rồi');
    if (this.open === 'char') this.renderWin();
    this.cb.save();
  },

  useEntry(uid) {
    const ch = this.ch, e = ch.inventory.find((x) => x.uid === uid);
    if (!e) return;
    if (this.inTrade(uid)) { this.toast('Vật phẩm đang trong giao dịch', 'warn'); return; } // also the potion keys
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
  },

  useItemById(id) {
    const e = this.ch.inventory.find((x) => x.id === id);
    if (e) this.useEntry(e.uid);
  },

  gotItem(data) {
    const it = ITEMS[data.id];
    this.toast(`Nhận được ${itemName(data)}${data.qty > 1 ? ' ×' + data.qty : ''}`, data.r >= 2 ? 'rare' : '');
    this.refreshSkillbar();
    if (this.open === 'inv' || this.open === 'quest') this.renderWin();
  },
};
