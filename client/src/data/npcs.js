// NPCs and quests. Everyday NPC lines live in data/chatter.js
import { STORY_QUESTS, TUTORIAL_QUESTS } from './story.js';

export const NPCS = {
  elder: {
    name: 'Trưởng Làng', title: 'Lão Lý',
    look: { robe: '#5a3d2b', trim: '#c9a24a', pants: '#2b2420', hair: '#d8d4cc', hairStyle: 3, skin: '#e8bd94', beard: true },
    quests: ['m1', 'm2', 'm3', 'st1', 'st14', 'st15', 'st18', 'tut_move', 'tut_stat', 'q_pet'],
  },
  healer: {
    name: 'Thầy Lang', title: 'Bà Tư',
    look: { robe: '#4a6b4a', trim: '#e6dcc4', pants: '#2b3328', hair: '#4a4a4a', hairStyle: 4, skin: '#e8bd94' },
    shop: ['hp_s', 'hp_l', 'mp_s', 'mp_l', 'scroll_home'],
    quests: ['m2', 'st2', 'st3', 'tut_potion', 'tut_shop', 'q_tail'],
  },
  smith: {
    name: 'Thợ Rèn', title: 'Anh Sắt',
    look: { robe: '#6b3a2a', trim: '#2a2420', pants: '#2a2420', hair: '#17110c', hairStyle: 5, skin: '#d9a57a', apron: true },
    forge: true,
    shop: ['stone', 'protect', 'gem_atk1', 'gem_hp1', 'gem_mp1', 'gem_def1', 'gem_crit1',
      'w_swordsman1', 'w_swordsman2', 'w_swordsman3', 'w_taoist1', 'w_taoist2', 'w_taoist3', 'w_assassin1', 'w_assassin2', 'w_assassin3',
      'hat_cloth', 'hat_straw', 'hat_iron', 'hat_daoist', 'arm_cloth', 'arm_leather', 'arm_chain', 'acc_jade', 'acc_bead'],
    quests: ['tut_forge1', 'tut_forge2', 'tut_forge3'],
  },
  constable: {
    name: 'Bộ Khoái', title: 'Bảng Truy Nã',
    look: { robe: '#2a3a5a', trim: '#c84030', pants: '#1a2030', hair: '#17110c', hairStyle: 0, skin: '#e8bd94', hat: 'band', hatColor: '#c84030' },
    quests: ['tut_daily', 'd_hunt1', 'd_hunt2', 'd_hunt3', 'd_hunt4', 'd_hunt5'],
  },
  priest: {
    name: 'Đạo Trưởng', title: 'Huyền Cơ',
    look: { robe: '#2a2a3a', trim: '#e8c35a', pants: '#1b1b26', hair: '#d8d4cc', hairStyle: 1, skin: '#eec39a', beard: true, hat: 'daoist' },
    quests: ['m4', 'st4', 'st4b', 'st5', 'st6b', 'st6c', 'st6d', 'st7', 'tut_skill', 'tut_orb'],
  },
  fisherman: {
    name: 'Ngư Ông', title: 'Lão Chài',
    look: { robe: '#5a6a4a', trim: '#d9c27a', pants: '#2a3020', hair: '#d8d4cc', hairStyle: 3, skin: '#d9a57a', beard: true, hat: 'conical', hatColor: '#d9c27a' },
    shop: ['hp_s', 'hp_l', 'mp_s', 'mp_l', 'scroll_home'],
    quests: ['st6', 'q_frog', 'q_water_ghost'],
  },
  huntress: {
    name: 'Thợ Săn', title: 'A Tuyết',
    look: { robe: '#dce8f4', trim: '#5a7a9a', pants: '#3a4a5a', hair: '#3a2a20', hairStyle: 4, skin: '#f0c8a2', hat: 'helm', hatColor: '#eef2f8' },
    shop: ['hp_l', 'mp_l', 'scroll_home', 'arm_fur', 'hat_fur', 'acc_frost'],
    quests: ['st8b', 'st9', 'st10', 'st10b', 'st10c', 'st11', 'q_yeti', 'q_golem'],
  },
  lan: {
    name: 'Tiểu Lan', title: 'Cháu gái Bà Tư',
    look: { robe: '#f6eef2', trim: '#e86a8a', pants: '#e8d8e0', hair: '#1a1014', hairStyle: 1, skin: '#fadcc4', eye: '#6a3a4a' },
    quests: ['st8', 'st14', 'd_gift'],
  },
  fire_master: {
    name: 'Hỏa Sư', title: 'Liệt Dương',
    look: { robe: '#8a2a1a', trim: '#ffb040', pants: '#2a1410', hair: '#c84030', hairStyle: 5, skin: '#e0a880' },
    shop: ['hp_l', 'mp_l', 'scroll_home', 'hat_flame'],
    quests: ['st11b', 'st11c', 'st12', 'st13', 'q_lava'],
  },
  embroiderer: {
    name: 'Thợ Thêu', title: 'Tú Nương',
    look: { robe: '#f6d6e2', trim: '#c86a8a', pants: '#e8c8d4', hair: '#2a1a1e', hairStyle: 1, skin: '#fadcc4', eye: '#7a3a5a' },
    craft: true,
    quests: ['tut_craft'],
  },
  // Two Huyền Môn disciples who help at the Ancient Temple gate (Chapter 3)
  huntress_temple: {
    name: 'Thợ Săn', title: 'A Tuyết',
    look: { robe: '#dce8f4', trim: '#5a7a9a', pants: '#3a4a5a', hair: '#3a2a20', hairStyle: 4, skin: '#f0c8a2', hat: 'helm', hatColor: '#eef2f8' },
    shop: ['hp_l', 'mp_l', 'scroll_home'],
    quests: ['st16', 'st16b', 'q_mask'],
  },
  fire_master_temple: {
    name: 'Hỏa Sư', title: 'Liệt Dương',
    look: { robe: '#8a2a1a', trim: '#ffb040', pants: '#2a1410', hair: '#c84030', hairStyle: 5, skin: '#e0a880' },
    quests: ['st17'],
  },
  // Only appears in dialogue (portrait)
  old_master: {
    name: 'Vong Hồn Sư Phụ', title: 'Chưởng môn Huyền Môn',
    look: { robe: '#e8eef4', trim: '#9ab0c8', pants: '#c8d0dc', hair: '#f4f4f8', hairStyle: 3, skin: '#e6dcd2', beard: true, hat: 'daoist', hatColor: '#c8d0dc' },
    quests: [],
  },
};

// type: kill (kill monsters) | collect (hand in items) | talk | act (tutorial action)
// cat: main | tut | side | daily
// reward: exp, gold, items [[id, qty]], random [[id, chance]], pet, title
const side = (q) => ({ cat: 'side', ...q });

export const QUESTS = {
  ...STORY_QUESTS,
  ...TUTORIAL_QUESTS,

  q_pet: {
    cat: 'tut', name: 'Bạn Đồng Hành Nhỏ', npc: 'elder', lv: 1, requires: 'm1', type: 'collect', target: 'mat_wisp', count: 3,
    text: 'Mang 3 đốm Lửa Ma Trơi về cho Trưởng Làng để dỗ Tiểu Quỷ.',
    hint: 'Ma Trơi ở Rừng Ma Trơi rơi Lửa Ma Trơi. Có pet rồi thì nhấn P để gọi hoặc cất. Pet tự nhặt đồ trong tầm, kể cả đồ trên bục cao.',
    intro: [
      ['elder', 'Mấy hôm nay có một con tiểu quỷ hiền lành lạc vào làng, cứ trốn sau chum nước nhà lão.'],
      ['elder', 'Nó không phá ai, chỉ đói. Mà nó mê Lửa Ma Trơi lắm.'],
      ['elder', 'Mang về ba đốm, lão dỗ nó theo con. Nó sẽ bay đi nhặt đồ giúp con, kể cả đồ rơi trên cao.'],
    ],
    outro: [
      ['sys', 'Tiểu Quỷ ló đầu ra khỏi chum nước, nuốt chửng ba đốm lửa rồi ợ một cái.'],
      ['elder', 'Đấy, nó chịu theo con rồi! Nhấn P để gọi hoặc cất nó.'],
    ],
    reward: { exp: 60, gold: 50, pet: 'imp', items: [] },
  },

  // ===== Side quests =====
  q_tail: side({
    name: 'Thuốc Từ Đuôi Hồ', npc: 'healer', lv: 3, requires: 'm2', type: 'collect', target: 'mat_tail', count: 6,
    text: 'Mang cho Bà Tư 6 Đuôi Hồ Ly.',
    intro: [
      ['healer', 'Dạo này dân làng mất ngủ cả, đêm nào cũng nghe tiếng cáo cười.'],
      ['healer', 'Đuôi Hồ Ly Tinh sắc lên thì an thần tốt lắm. Mang cho bà sáu cái nhé.'],
    ],
    outro: [
      ['healer', 'Đủ rồi. Mẻ thuốc này đủ cho cả làng ngủ ngon một tháng.'],
      ['healer', 'Cái nón này bà tự đan, đội vào cho đỡ sương.'],
    ],
    reward: { exp: 320, gold: 200, items: [['hat_straw', 1], ['hp_s', 5]] },
  }),
  q_frog: side({
    name: 'Ếch Độc Đầm Lầy', npc: 'fisherman', lv: 9, requires: 'st5', type: 'kill', target: 'frog', count: 12,
    text: 'Diệt 12 con Ếch Độc ở Đầm Lầy Sương Mù.',
    intro: [
      ['fisherman', 'Ếch độc nhảy khắp đầm, lão không dám thả lưới.'],
      ['fisherman', 'Diệt giúp lão mười hai con. Chúng sợ lửa, còn đánh bằng độc thì chẳng hề hấn gì đâu.'],
    ],
    outro: [
      ['fisherman', 'Cảm ơn nhé! Mai lão thả lưới được rồi.'],
      ['fisherman', 'Viên Độc Châu này lão vớt được dưới đáy đầm, cầm lấy.'],
    ],
    reward: { exp: 1800, gold: 600, items: [['stone', 3], ['orb_poison', 1]] },
  }),
  q_water_ghost: side({
    name: 'Bóng Ma Dưới Nước', npc: 'fisherman', lv: 10, requires: 'q_frog', type: 'kill', target: 'water_ghost', count: 10,
    text: 'Đánh tan 10 Thủy Quỷ ở Đầm Lầy Sương Mù.',
    intro: [
      ['fisherman', 'Đêm đêm Thủy Quỷ trồi lên kéo chân người qua đường. Thằng cháu lão suýt chết đuối tuần trước.'],
      ['fisherman', 'Đánh tan mười con. Nước gặp sét là toi.'],
    ],
    outro: [
      ['fisherman', 'Đầm lầy yên rồi. Lão già này nợ ngươi một mạng cháu.'],
      ['fisherman', 'Áo tơi của lão đây, chống được hơi độc với cái lạnh.'],
    ],
    reward: { exp: 2600, gold: 900, items: [['arm_rain', 1], ['stone', 2], ['gem_mp1', 1]] },
  }),
  q_yeti: side({
    name: 'Tiếng Gầm Trên Núi', npc: 'huntress', lv: 17, requires: 'st8b', type: 'kill', target: 'yeti', count: 12,
    text: 'Hạ 12 con Tuyết Yêu phá trại săn của A Tuyết.',
    intro: [
      ['huntress', 'Tuyết Yêu phá trại săn của ta, ăn hết thịt khô dự trữ cả mùa đông.'],
      ['huntress', 'Hạ mười hai con. Chúng to xác nhưng sợ lửa lắm.'],
    ],
    outro: [
      ['huntress', 'Ha! Ngươi làm được thật.'],
      ['huntress', 'Băng Châu và cái mũ này là của ngươi.'],
    ],
    reward: { exp: 8000, gold: 2200, items: [['orb_ice', 1], ['hat_fur', 1]] },
  }),
  q_golem: side({
    name: 'Trái Tim Băng', npc: 'huntress', lv: 20, requires: 'q_yeti', type: 'kill', target: 'golem', count: 12,
    text: 'Phá 12 khối Băng Tinh Thạch ở Huyền Băng Động.',
    intro: [
      ['huntress', 'Băng Tinh Thạch canh giữ lòng động. Phá đủ mười hai khối, ta sẽ có đủ băng ngàn năm.'],
      ['huntress', 'Ta sẽ rèn cho ngươi một binh khí băng. Thứ mà thợ dưới xuôi không làm nổi.'],
    ],
    outro: [['huntress', 'Binh khí rèn từ băng ngàn năm, mang sẵn hệ Băng. Gặp quỷ lửa thì cứ thế mà chém.']],
    reward: { exp: 11000, gold: 3000, items: [['W5', 1], ['stone', 4]] },
  }),
  q_lava: side({
    name: 'Nham Thạch Lăn Xuống', npc: 'fire_master', lv: 22, requires: 'st11', type: 'kill', target: 'lava', count: 15,
    text: 'Hạ 15 Nham Thạch Thú ở Hỏa Diệm Sơn.',
    intro: [
      ['fire_master', 'Nham Thạch Thú lăn xuống chân núi, đốt rụi cả một làng.'],
      ['fire_master', 'Hạ mười lăm con. Đá cứng thì phải dùng băng mà làm nứt.'],
    ],
    outro: [['fire_master', 'Làm tốt lắm. Hai viên ngọc này kết từ dung nham nguội, ta không dùng tới.']],
    reward: { exp: 16000, gold: 4200, items: [['gem_atk2', 1], ['gem_def2', 1], ['stone', 4]] },
  }),
  q_mask: side({
    name: 'Mặt Nạ Vô Chủ', npc: 'huntress_temple', lv: 29, requires: 'st16', type: 'collect', target: 'mat_mask', count: 10,
    text: 'Thu 10 Mảnh Mặt Nạ từ Bạch Diện Quỷ để A Tuyết làm phép siêu thoát.',
    intro: [
      ['huntress_temple', 'Mỗi chiếc mặt nạ của lũ Bạch Diện Quỷ giam một mẩu hồn của Thẩm Huyền.'],
      ['huntress_temple', 'Mang về mười mảnh. Dù hắn đã làm gì, ta vẫn muốn hồn hắn được trọn vẹn.'],
    ],
    outro: [
      ['huntress_temple', 'Cảm ơn ngươi. Ta biết ngươi không hiểu, nhưng hắn từng là người cõng ta qua suối mỗi sáng đi học.'],
      ['huntress_temple', 'Mấy viên ngọc này ta luyện từ băng tâm, ngươi giữ lấy.'],
    ],
    reward: { exp: 22000, gold: 5000, items: [['gem_crit2', 1], ['gem_hp2', 1], ['protect', 1]] },
  }),

  // ===== Daily quests (Wanted Board) =====
  d_hunt1: {
    cat: 'daily', name: 'Truy Nã: Hồ Ly', npc: 'constable', lv: 3, daily: true, type: 'kill', target: 'fox', count: 15,
    text: 'Hồ Ly Tinh quấy phá rừng phía đông. Diệt 15 con rồi về lĩnh thưởng.',
    done: 'Thưởng của quan phủ đây. Mai lại ghé nhé.',
    reward: { exp: 300, gold: 200, items: [['stone', 2]], random: [['gem_hp1', 0.25], ['gem_mp1', 0.25]] },
  },
  d_hunt2: {
    cat: 'daily', name: 'Truy Nã: Cương Thi', npc: 'constable', lv: 10, requires: 'st5', daily: true, type: 'kill', target: 'jiangshi', count: 15,
    text: 'Cương Thi ở Nghĩa Địa Cổ lại trồi lên. Diệt 15 con.',
    done: 'Làm tốt lắm. Có khi còn được thêm ngọc quý đấy.',
    reward: { exp: 1500, gold: 600, items: [['stone', 3]], random: [['orb_thunder', 0.3], ['orb_poison', 0.3], ['gem_atk1', 0.3]] },
  },
  d_hunt3: {
    cat: 'daily', name: 'Truy Nã: Tuyết Yêu', npc: 'constable', lv: 16, requires: 'st7', daily: true, type: 'kill', target: 'yeti', count: 12,
    text: 'Đoàn buôn qua Tuyết Sơn bị Tuyết Yêu cướp. Diệt 12 con.',
    done: 'Thưởng hậu hĩnh cho người dám lên núi tuyết.',
    reward: { exp: 5000, gold: 1500, items: [['stone', 4], ['protect', 1]], random: [['gem_def1', 0.4], ['gem_crit1', 0.3]] },
  },
  d_hunt4: {
    cat: 'daily', name: 'Truy Nã: Nham Thạch Thú', npc: 'constable', lv: 23, requires: 'st11', daily: true, type: 'kill', target: 'lava', count: 12,
    text: 'Nham Thạch Thú lăn xuống chân núi đốt nhà dân. Diệt 12 con.',
    done: 'Anh hùng! Đây là phần thưởng đặc biệt.',
    reward: { exp: 9000, gold: 2500, items: [['stone', 5], ['protect', 1]], random: [['orb_fire', 0.35], ['orb_ice', 0.35], ['gem_atk2', 0.15]] },
  },
  d_hunt5: {
    cat: 'daily', name: 'Truy Nã: Huyết Cương Thi', npc: 'constable', lv: 25, requires: 'st16', daily: true, type: 'kill', target: 'blood_jiangshi', count: 15,
    text: 'Huyết Cương Thi lang thang ra tận Nghĩa Địa Cổ. Diệt 15 con.',
    done: 'Quan phủ không biết lấy gì cảm tạ, đành trả bằng ngọc.',
    reward: { exp: 14000, gold: 3500, items: [['stone', 6], ['protect', 1]], random: [['gem_atk2', 0.3], ['gem_hp2', 0.3], ['gem_crit2', 0.2]] },
  },
};

// Old quests merged into the story or removed (cleaned out of old character data)
export const RETIRED_QUESTS = ['q_wisp', 'q_scare', 'q_jiang', 'q_charm', 'q_lantern', 'q_boss', 'q_snowfox', 'q_firesp', 'q_ember', 'q_qilin'];
