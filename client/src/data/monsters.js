// affix: built-in traits of the species (see data/affixes.js)
// Monsters. behavior: float (hovering), walk (patrol), hop (hopping), boss
// el: element of the monster's attack; res: elemental resistance (positive = resist, negative = weak)
// drops: [itemId, drop rate]. 'W2' = tier-2 weapon for the player's class.
export const MONSTERS = {
  wisp: {
    name: 'Ma Trơi', lv: 1, hp: 32, atk: 7, def: 0, exp: 9, gold: [1, 4],
    behavior: 'float', w: 18, h: 18, speed: 28, res: { ice: 0.3, fire: -0.3 },
    drops: [['mat_peach', 0.03], ['out_wisp_hood', 0.002], ['mat_wisp', 0.5], ['hp_s', 0.12], ['mp_s', 0.06], ['hat_cloth', 0.02], ['arm_cloth', 0.02]],
  },
  fox: {
    name: 'Hồ Ly Tinh', lv: 3, hp: 75, atk: 12, def: 2, exp: 19, gold: [3, 9],
    behavior: 'walk', w: 28, h: 20, speed: 46,
    drops: [['mat_peach', 0.06], ['mat_tail', 0.45], ['hp_s', 0.14], ['mp_s', 0.08], ['arm_leather', 0.02], ['acc_jade', 0.015], ['W1', 0.03], ['stone', 0.02]],
  },
  scarecrow: {
    name: 'Quỷ Rơm', lv: 5, hp: 150, atk: 19, def: 4, exp: 34, gold: [6, 15],
    behavior: 'walk', w: 24, h: 32, speed: 34, res: { fire: -0.5, poison: 0.3 },
    drops: [['mat_peach', 0.05], ['mat_straw', 0.45], ['hp_s', 0.15], ['mp_s', 0.1], ['hat_straw', 0.025], ['W2', 0.02], ['arm_leather', 0.02], ['stone', 0.03]],
  },
  jiangshi: {
    name: 'Cương Thi', lv: 7, hp: 260, atk: 27, def: 8, exp: 56, gold: [10, 24],
    behavior: 'hop', w: 22, h: 32, speed: 60, res: { poison: 0.5, thunder: -0.4 },
    drops: [['mat_charm', 0.42], ['hp_l', 0.06], ['mp_l', 0.05], ['hp_s', 0.12], ['hat_iron', 0.015], ['hat_daoist', 0.015], ['W2', 0.025], ['acc_bead', 0.012], ['stone', 0.04], ['orb_thunder', 0.006]],
  },
  lantern: {
    name: 'Quỷ Đèn Lồng', lv: 9, hp: 320, atk: 31, def: 6, exp: 72, gold: [14, 30],
    behavior: 'float', ranged: true, w: 22, h: 28, speed: 32, el: 'fire', res: { fire: 0.6, ice: -0.5 },
    drops: [['mat_lantern', 0.4], ['hp_l', 0.08], ['mp_l', 0.08], ['arm_chain', 0.015], ['W3', 0.012], ['acc_bead', 0.012], ['stone', 0.05], ['orb_fire', 0.006]],
  },
  boss: {
    name: 'Hắc Quỷ Vương', lv: 14, hp: 7000, atk: 52, def: 16, exp: 2600, gold: [800, 1500],
    behavior: 'boss', w: 64, h: 76, speed: 40, boss: true, res: { fire: 0.2, ice: 0.2, thunder: 0.2, poison: 0.2 },
    proj: 'ghostfire', summon: 'wisp',
    lines: { aggro: 'Kẻ phàm trần nào dám bước vào Quỷ Môn Quan?!', shoot: ['Quỷ hỏa!', 'Cháy đi!', 'Hahaha!'], summon: 'Âm binh đâu, ra đây!' },
    drops: [['mat_dew', 1], ['out_black_dragon', 0.03], ['mat_horn', 1], ['W4', 0.5], ['arm_ghost', 0.4], ['acc_demon', 0.4], ['hp_l', 1], ['mp_l', 1], ['stone', 1], ['stone', 0.6], ['protect', 0.3]],
  },

  // ===== Misty Swamp =====
  frog: {
    affix: ['poison'],
    name: 'Ếch Độc', lv: 8, hp: 300, atk: 28, def: 7, exp: 62, gold: [12, 26],
    behavior: 'hop', w: 26, h: 20, speed: 70, el: 'poison', res: { poison: 0.6, fire: -0.4 },
    drops: [['mat_slime', 0.45], ['hp_l', 0.05], ['hp_s', 0.12], ['mp_s', 0.1], ['stone', 0.05], ['orb_poison', 0.01], ['arm_chain', 0.01]],
  },
  water_ghost: {
    name: 'Thủy Quỷ', lv: 10, hp: 380, atk: 33, def: 8, exp: 80, gold: [15, 32],
    behavior: 'float', ranged: true, w: 20, h: 22, speed: 34, el: 'ice', res: { ice: 0.5, thunder: -0.5 },
    drops: [['mat_slime', 0.2], ['hp_l', 0.08], ['mp_l', 0.08], ['stone', 0.06], ['W3', 0.01], ['orb_ice', 0.008], ['acc_bead', 0.012]],
  },

  // ===== Snow Peak =====
  snowfox: {
    name: 'Tuyết Hồ', lv: 14, hp: 620, atk: 44, def: 13, exp: 130, gold: [22, 44],
    behavior: 'walk', w: 28, h: 20, speed: 58, el: 'ice', res: { ice: 0.6, fire: -0.5 },
    drops: [['mat_icesilk', 0.05], ['mat_fur', 0.45], ['hp_l', 0.1], ['mp_l', 0.08], ['stone', 0.07], ['hat_fur', 0.012], ['orb_ice', 0.01]],
  },
  yeti: {
    affix: ['enrage'],
    name: 'Tuyết Yêu', lv: 16, hp: 900, atk: 52, def: 16, exp: 175, gold: [28, 56],
    behavior: 'walk', w: 30, h: 34, speed: 36, el: 'ice', res: { ice: 0.5, fire: -0.4, poison: 0.2 },
    drops: [['mat_icesilk', 0.04], ['mat_fur', 0.3], ['hp_l', 0.12], ['mp_l', 0.1], ['stone', 0.09], ['arm_fur', 0.01], ['acc_frost', 0.008], ['W5', 0.006]],
  },

  // ===== Ice Cave =====
  icebat: {
    affix: ['frost'],
    name: 'Băng Dực', lv: 18, hp: 820, atk: 58, def: 14, exp: 200, gold: [30, 60],
    behavior: 'float', w: 24, h: 18, speed: 46, el: 'ice', res: { ice: 0.5, thunder: -0.4 },
    drops: [['mat_icesilk', 0.08], ['mat_ice', 0.35], ['hp_l', 0.12], ['mp_l', 0.12], ['stone', 0.1], ['orb_ice', 0.012], ['acc_frost', 0.01]],
  },
  golem: {
    affix: ['reflect'],
    name: 'Băng Tinh Thạch', lv: 19, hp: 1400, atk: 62, def: 26, exp: 260, gold: [36, 70],
    behavior: 'walk', w: 30, h: 34, speed: 24, el: 'ice', res: { ice: 0.7, fire: -0.6, poison: 0.5 },
    drops: [['mat_ice', 0.5], ['hp_l', 0.14], ['stone', 0.12], ['protect', 0.01], ['W5', 0.012], ['arm_fur', 0.012]],
  },

  // ===== Volcano =====
  fire_spirit: {
    name: 'Hỏa Linh', lv: 21, hp: 1100, atk: 68, def: 18, exp: 290, gold: [40, 80],
    behavior: 'float', ranged: true, w: 18, h: 18, speed: 36, el: 'fire', res: { fire: 0.7, ice: -0.6 },
    drops: [['mat_ember', 0.4], ['hp_l', 0.14], ['mp_l', 0.14], ['stone', 0.12], ['orb_fire', 0.012], ['hat_flame', 0.008]],
  },
  lava: {
    affix: ['explode'],
    name: 'Nham Thạch Thú', lv: 23, hp: 1900, atk: 76, def: 30, exp: 380, gold: [50, 96],
    behavior: 'walk', w: 34, h: 26, speed: 30, el: 'fire', res: { fire: 0.6, ice: -0.5, poison: 0.3 },
    drops: [['mat_ember', 0.45], ['hp_l', 0.16], ['stone', 0.14], ['protect', 0.015], ['arm_fire', 0.008], ['W5', 0.01]],
  },
  qilin: {
    name: 'Hỏa Kỳ Lân', lv: 26, hp: 26000, atk: 95, def: 34, exp: 9000, gold: [3000, 6000],
    behavior: 'boss', w: 72, h: 64, speed: 52, boss: true, el: 'fire', res: { fire: 0.6, ice: -0.4, thunder: 0.1, poison: 0.2 },
    proj: 'fireball', summon: 'fire_spirit',
    lines: { aggro: 'Rầm…! Kẻ nào dám đánh thức ta?', shoot: ['Liệt hỏa!', 'Thiêu rụi!', 'Gầm!!'], summon: 'Hỏa linh, bảo vệ ta!' },
    drops: [['mat_dew', 1], ['out_phoenix', 0.04], ['mat_scale', 1], ['W6', 0.5], ['acc_five_elements', 0.35], ['arm_fire', 0.4], ['hp_l', 1], ['stone', 1], ['stone', 1], ['protect', 0.6], ['orb_fire', 0.5]],
  },

  // ===== Huyền Môn Ancient Temple (Chapter 3) =====
  blood_jiangshi: {
    affix: ['vampire'],
    name: 'Huyết Cương Thi', lv: 25, hp: 2600, atk: 88, def: 34, exp: 470, gold: [60, 110],
    behavior: 'hop', w: 22, h: 32, speed: 66, el: 'poison', res: { poison: 0.5, thunder: -0.4, fire: -0.2 },
    drops: [['hat_blood_helm', 0.008], ['mat_charm', 0.3], ['hp_l', 0.16], ['mp_l', 0.12], ['stone', 0.15], ['protect', 0.015], ['W6', 0.006], ['orb_thunder', 0.01]],
  },
  maskghost: {
    affix: ['blink'],
    name: 'Bạch Diện Quỷ', lv: 26, hp: 2100, atk: 92, def: 26, exp: 500, gold: [60, 120],
    behavior: 'float', ranged: true, proj2: 'ghostfire', w: 22, h: 26, speed: 40, res: { poison: 0.6, ice: 0.2, fire: -0.4 },
    drops: [['arm_sect_robe', 0.008], ['mat_mask', 0.45], ['hp_l', 0.16], ['mp_l', 0.16], ['stone', 0.15], ['protect', 0.015], ['acc_flame', 0.006]],
  },
  blood_demon: {
    name: 'Huyết Ma Huyền Cơ', lv: 32, hp: 52000, atk: 128, def: 44, exp: 18000, gold: [5000, 9000],
    behavior: 'boss', w: 64, h: 80, speed: 50, boss: true, el: 'poison', res: { fire: 0.3, ice: 0.3, poison: 0.4, thunder: -0.3 },
    proj: 'bloodtalisman', summon: 'maskghost',
    lines: {
      aggro: 'Đứa trẻ mang ấn ký… ngươi lớn nhanh thật đấy.',
      shoot: ['Huyết phù!', 'Đừng cản ta!', 'Sư phụ, đợi con!'],
      summon: 'Hồn ta, hiện ra!',
      rage: 'Ba mươi năm… ba mươi năm của ta!!',
    },
    drops: [['mat_dew', 1], ['out_blood_moon', 0.04], ['mat_mask', 1], ['W7', 0.5], ['hp_l', 1], ['mp_l', 1], ['stone', 1], ['stone', 1], ['stone', 0.7], ['protect', 0.6], ['GEM2', 1], ['GEM3', 0.3]],
  },
};

// Random gem drops: GEM1/GEM2/GEM3 = random gem of grade 1/2/3
for (const m of Object.values(MONSTERS)) {
  if (m.boss) { if (!m.drops.some(([id]) => id.startsWith('GEM'))) m.drops.push(['GEM1', 1], ['GEM2', 0.4]); continue; }
  if (m.lv >= 3) m.drops.push(['GEM1', m.lv >= 14 ? 0.02 : 0.012]);
  if (m.lv >= 14) m.drops.push(['GEM2', 0.004]);
}

export const BOSS_RESPAWN = 150; // seconds
