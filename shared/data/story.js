// Main story "Huyền Môn Phong Ấn" (The Huyền Môn Seal) + tutorial quests
//
// Each quest has:
//   cat      – 'main' (story), 'tut' (tutorial), 'side' (side), 'daily' (daily)
//   chapter  – chapter shown in the quest log
//   intro    – dialogue on accept, outro – dialogue on turn-in
//              each line is [speaker, text, condition?]
//              speaker: NPC id, 'me' (the player), 'sys' (narration), or a monster id (monster portrait)
//              condition (optional): 'bell=ring' – only shown when story flag bell = ring
//              text may use {name} {cls} {main} {title}
//   type     – 'talk' (go meet NPC target), 'kill', 'collect', 'act' (perform an action: target is the event name)
//   turnIn   – NPC to hand in to (defaults to the quest giver)
//   drop     – quest item dropped by monsters while active: { mob, item, chance }
//   give     – items handed out on accepting the quest
//   hint     – tip shown in the quest log (tutorial quests)
import { GAME } from '../config.js';
import { needExp, EXP_SHARE, BIG } from './story/helpers.js';
import { PROLOGUE } from './story/prologue.js';
import { CHAPTER1 } from './story/chapter1.js';
import { CHAPTER2 } from './story/chapter2.js';
import { CHAPTER3 } from './story/chapter3.js';
export { SCENES } from './story/scenes.js';
export { TUTORIAL_QUESTS } from './story/tutorial.js';
export const SPEAKERS = { boss: 'Hắc Quỷ Vương', qilin: 'Hỏa Kỳ Lân', blood_demon: 'Huyết Ma Huyền Cơ' };

export const CHAPTERS = {
  c0: 'Mở Đầu · Người Đến Từ Màn Sương',
  c1: 'Chương 1 · Mệnh Thuần Âm',
  c2: 'Chương 2 · Huyết Ma Châu',
  c3: 'Chương 3 · Mặt Nạ Trắng',
};

// Main-line order. If an old character finished a later quest, every earlier one counts as done.
export const MAIN_ORDER = [
  'm1', 'm2', 'm3', 'm4',
  'st1', 'st2', 'st3', 'st4', 'st4b', 'st5', 'st6', 'st6b', 'st6c', 'st6d', 'st7',
  'st8', 'st8b', 'st9', 'st10', 'st10b', 'st10c', 'st11', 'st11b', 'st11c', 'st12',
  'st13', 'st14', 'st15', 'st16', 'st16b', 'st17', 'st18',
];

export const STORY_QUESTS = {
  ...PROLOGUE,
  ...CHAPTER1,
  ...CHAPTER2,
  ...CHAPTER3,

  // Tiểu Lan's daily gift (after she is rescued)
  d_gift: {
    cat: 'daily', name: 'Túi Bùa Bình An', npc: 'lan', lv: 1, requires: 'st7', daily: true, type: 'talk', target: 'lan', count: 1,
    text: 'Ghé thăm Tiểu Lan mỗi ngày để nhận quà.',
    intro: [['lan', 'Đại hiệp! Hôm nay em gấp được một túi bùa bình an, tặng đại hiệp nè.']],
    outro: [['lan', 'Ngày mai nhớ ghé em nữa nha!']],
    reward: { exp: 200, gold: 100, items: [['hp_l', 3], ['mp_l', 2], ['stone', 1]], random: [['protect', 0.15], ['orb_thunder', 0.05], ['gem_hp1', 0.2], ['gem_mp1', 0.2]] },
  },
};

for (const id of BIG) {
  STORY_QUESTS[id].reward.exp = Math.round(needExp(STORY_QUESTS[id].lv) * EXP_SHARE.chapterFinale / 10) * 10;
  STORY_QUESTS[id].reward.ingots = GAME.premium.chapterIngots; // Nguyên Bảo for finishing a chapter
}
