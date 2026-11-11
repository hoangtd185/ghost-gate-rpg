// Small helpers shared by the GameUI parts (core in ../hud.js, the windows in this folder)
import { ITEMS, RARITY, GEM_GRADES } from '../../../../shared/data/items.js';
import { ELEMENTS } from '../../../../shared/data/elements.js';
import { QUESTS } from '../../../../shared/data/npcs.js';
import { MAIN_ORDER } from '../../../../shared/data/story.js';
import { MAPS } from '../../../../shared/data/maps.js';
import { questStatus, resolveItemId, entryName } from '../../../../shared/rules/character.js';
import { escapeHtml, fmtNum } from '../../../../shared/util.js';

export const $ = (sel, root = document) => root.querySelector(sel);

export function itemName(e) {
  return `<span style="color:${RARITY[e.r || 0].color}">${escapeHtml(entryName(e))}</span>`;
}

export function elTag(el) {
  return el ? `<span class="eltag" style="--c:${ELEMENTS[el].color}">${ELEMENTS[el].glyph} ${ELEMENTS[el].name}</span>` : '';
}

// Which map an NPC stands on
export function npcMapName(npcId) {
  const m = Object.values(MAPS).find((mp) => (mp.npcs || []).some((n) => n.id === npcId));
  return m ? m.name : '';
}

// Good map to grind on: the highest recommended level the player can already enter
export function grindMap(ch) {
  const opened = (m) => Object.values(MAPS).every((mp) => mp.portals.every((pt) => pt.to !== m || ((!pt.lock || questStatus(ch, pt.lock) === 'done') && (!pt.req || questStatus(ch, pt.req) === 'done'))));
  const list = Object.entries(MAPS).filter(([id, m]) => m.spawns.length && !m.spawns.some((sp) => sp.mob === 'boss' || sp.mob === 'qilin' || sp.mob === 'blood_demon') && (m.minLv || 1) <= ch.level + 1 && opened(id));
  list.sort((a, b) => (b[1].minLv || 1) - (a[1].minLv || 1));
  return list.length ? list[0][1].name : null;
}

// Next unfinished story quest (in main-line order)
export const MAIN_COUNT = MAIN_ORDER.length;
export function nextMainQuest(ch) {
  return MAIN_ORDER.find((qid) => questStatus(ch, qid) !== 'done') || null;
}

// Quest type tag
export const CAT = { main: ['story', 'Cốt truyện'], tut: ['tut', 'Hướng dẫn'], side: ['side', 'Phụ'], daily: ['daily', 'Hằng ngày'], world: ['world', 'Thế giới'] };
export const TONE = { light: ['light', '☀ Vui tươi'], dark: ['dark', '☾ U tối'] };
export const toneTag = (c) => `<span class="qtone ${TONE[c.tone][0]}">${TONE[c.tone][1]}</span>`;
// World quest chain progress. Branch epilogues (needFlag) count as one step: only one of them can be played.
export function chainProgress(ch, c) {
  const total = c.steps.filter((qid) => !QUESTS[qid].needFlag).length + (c.steps.some((qid) => QUESTS[qid].needFlag) ? 1 : 0);
  const done = c.steps.filter((qid) => questStatus(ch, qid) === 'done').length;
  return { done, total };
}
export const catOf = (q) => q.cat || (q.daily ? 'daily' : 'side');
export function catTag(q) { const c = CAT[catOf(q)]; return `<span class="qtag ${c[0]}">${c[1]}</span>`; }

// Quest reward description
export function rewardText(q, cls) {
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
  if (r.ingots && !q.daily) parts.push(`${r.ingots} Nguyên Bảo`);
  return parts.join(' · ');
}

