// Classes and skills
// type: melee = slash in front, proj = projectile, strike = lightning on the nearest targets,
//       dash = dash through enemies, cloud = poison area, buff/heal = power up / heal
export const CLASSES = {
  swordsman: {
    id: 'swordsman', name: 'Kiếm Khách', main: 'str',
    desc: 'Cận chiến, máu dày, chém nhiều quái một lúc. Dễ chơi nhất.',
    base: { str: 8, dex: 4, int: 3, vit: 7 },
    hpGrow: 16, mpGrow: 4,
    weapon: 'sword',
    look: { robe: '#2f4f73', trim: '#c9a24a', pants: '#232838', hair: '#17110c', hairStyle: 0, skin: '#f6d2b0', eye: '#2a4a8a' },
    skills: ['sw_basic', 'sw_combo', 'sw_wave', 'sw_guard'],
  },
  taoist: {
    id: 'taoist', name: 'Đạo Sĩ', main: 'int',
    desc: 'Dùng bùa chú đánh xa, sét đánh nhiều mục tiêu, cầu sét truy đuổi dồn sát thương lên một kẻ địch.',
    base: { str: 3, dex: 4, int: 9, vit: 5 },
    hpGrow: 11, mpGrow: 9,
    weapon: 'staff',
    look: { robe: '#e6dcc4', trim: '#a1302a', pants: '#3a3428', hair: '#2a2420', hairStyle: 1, skin: '#f6d2b0', eye: '#7a3a2a' },
    skills: ['ta_basic', 'ta_thunder', 'ta_fire', 'ta_orbs'],
  },
  assassin: {
    id: 'assassin', name: 'Thích Khách', main: 'dex',
    desc: 'Phi tiêu tốc độ cao, chí mạng nhiều, lướt xuyên qua quái.',
    base: { str: 4, dex: 9, int: 3, vit: 5 },
    hpGrow: 12, mpGrow: 5,
    weapon: 'dart',
    look: { robe: '#2b2530', trim: '#6c8f4e', pants: '#1b181f', hair: '#3a1f1a', hairStyle: 2, skin: '#f0c8a2', eye: '#3a7a4a' },
    skills: ['as_basic', 'as_triple', 'as_dash', 'as_poison'],
  },
};

export const SKILLS = {
  // ===== Swordsman =====
  sw_basic: { name: 'Trảm', unlock: 1, mp: 0, cd: 0.42, type: 'melee', range: 38, height: 34, mult: 1.0, hits: 1, maxTargets: 1, fx: 'slash',
    desc: 'Chém thường một mục tiêu.' },
  sw_combo: { name: 'Liên Hoàn Trảm', unlock: 2, mp: 8, cd: 1.1, type: 'melee', range: 52, height: 40, mult: 0.75, hits: 3, maxTargets: 5, fx: 'slash3',
    desc: 'Chém 3 nhát liên tiếp, trúng tối đa 5 quái.' },
  sw_wave: { name: 'Thiên Kiếm Phá', unlock: 6, mp: 22, cd: 4, type: 'proj', proj: 'wave', speed: 280, range: 280, mult: 2.4, maxTargets: 10, pierce: true,
    desc: 'Phóng kiếm khí xuyên thấu mọi quái trên đường.' },
  sw_guard: { name: 'Kim Cương Thể', unlock: 10, mp: 30, cd: 30, type: 'buff', buff: { atk: 0.25, def: 0.5 }, dur: 20,
    desc: 'Tăng 25% công và 50% phòng thủ trong 20 giây.' },

  // ===== Taoist =====
  ta_basic: { name: 'Phù Chú', unlock: 1, mp: 0, cd: 0.5, type: 'proj', proj: 'talisman', speed: 300, range: 250, mult: 1.0, maxTargets: 1,
    desc: 'Phóng lá bùa vàng vào quái.' },
  ta_thunder: { name: 'Lôi Phù', unlock: 2, mp: 10, cd: 1.4, type: 'strike', el: 'thunder', range: 280, mult: 1.5, targets: 3,
    desc: 'Gọi sét đánh 3 quái gần nhất. Hệ Lôi.' },
  ta_fire: { name: 'Hỏa Long Phù', unlock: 6, mp: 24, cd: 3.5, type: 'proj', el: 'fire', proj: 'fire', speed: 230, range: 320, mult: 2.6, maxTargets: 10, pierce: true,
    desc: 'Rồng lửa xuyên thấu, thiêu cháy hàng loạt quái. Hệ Hỏa.' },
  // type 'orbs': homing orbs that all focus one target (boss > named > elite > nearest), retargeting if it dies
  ta_orbs: { name: 'Lôi Cầu Truy Hồn', unlock: 10, mp: 30, cd: 6, type: 'orbs', el: 'thunder', count: 4, speed: 360, range: 340, mult: 1.25, life: 3,
    desc: 'Gọi 4 quả cầu sét lao theo truy bắt cùng một kẻ địch, ưu tiên boss và quái Tinh Anh. Kẻ địch gục giữa chừng thì cầu tự tìm mục tiêu gần nhất. Hệ Lôi.' },

  // ===== Assassin =====
  as_basic: { name: 'Phi Tiêu', unlock: 1, mp: 0, cd: 0.34, type: 'proj', proj: 'dart', speed: 440, range: 280, mult: 0.9, maxTargets: 1,
    desc: 'Ném phi tiêu nhanh như chớp.' },
  as_triple: { name: 'Tam Liên Tiêu', unlock: 2, mp: 8, cd: 0.95, type: 'proj', proj: 'dart', speed: 440, range: 280, mult: 0.8, maxTargets: 1, count: 3,
    desc: 'Ném 3 phi tiêu toả ra cùng lúc.' },
  as_dash: { name: 'Ảnh Sát', unlock: 6, mp: 18, cd: 3, type: 'dash', dist: 130, mult: 2.2, maxTargets: 8,
    desc: 'Lướt xuyên qua quái, chém tất cả trên đường đi.' },
  as_poison: { name: 'Độc Vụ', unlock: 10, mp: 30, cd: 12, type: 'cloud', el: 'poison', radius: 70, dur: 5, tick: 0.5, mult: 0.55,
    desc: 'Thả mây độc gây sát thương liên tục 5 giây. Hệ Độc.' },
};

export const SKILL_MAX_LV = 10;
export const SKILL_KEYS = ['Z', 'A', 'S', 'D'];

// ===== Inner arts (passive skills) =====
// Each class has 4 passives in a tree: a lower tier needs the tier above at the required level (req).
// per: effect per level. Shares skill points with active skills.
//   hpPct/mpPct/atkPct/defPct: % of the stat   crit: +% crit chance   critDmg: +% crit damage
//   lifesteal: % of damage healed   elemDmg: +% damage for elemental hits   mpCost: −% MP cost
//   mpRegen: +% MP regen   resAll: +% all resistances   dodge: +% dodge   speed: +% move speed
//   killHeal: heal % HP and MP on each kill   lowHp: +% attack and defense below 35% HP
export const PASSIVE_MAX_LV = 5;
export const PASSIVES = {
  // Swordsman
  sw_p1: { cls: 'swordsman', name: 'Thiết Bố Sam', glyph: '鐵', unlock: 5, per: { hpPct: 4, defPct: 3 }, desc: 'Luyện da thịt cứng như vải sắt.' },
  sw_p2: { cls: 'swordsman', name: 'Kiếm Ý', glyph: '意', unlock: 10, req: ['sw_p1', 2], per: { atkPct: 3, critDmg: 4 }, desc: 'Ý theo kiếm đi, kiếm theo ý tới.' },
  sw_p3: { cls: 'swordsman', name: 'Huyết Chiến', glyph: '血', unlock: 16, req: ['sw_p2', 2], per: { lifesteal: 1.2 }, desc: 'Càng chém càng hăng, máu địch thành máu ta.' },
  sw_p4: { cls: 'swordsman', name: 'Bất Khuất', glyph: '魂', unlock: 22, req: ['sw_p3', 3], per: { lowHp: 7 }, desc: 'Khi máu dưới 35%, ý chí bùng lên.' },
  // Taoist
  ta_p1: { cls: 'taoist', name: 'Tĩnh Tâm Quyết', glyph: '靜', unlock: 5, per: { mpPct: 6, mpRegen: 15 }, desc: 'Tâm tĩnh thì khí đầy.' },
  ta_p2: { cls: 'taoist', name: 'Ngũ Hành Tinh Thông', glyph: '五', unlock: 10, req: ['ta_p1', 2], per: { elemDmg: 5 }, desc: 'Thấu hiểu tương sinh tương khắc.' },
  ta_p3: { cls: 'taoist', name: 'Thái Cực Tâm Pháp', glyph: '太', unlock: 16, req: ['ta_p2', 2], per: { mpCost: 5, critDmg: 3 }, desc: 'Lấy ít địch nhiều, lấy nhu chế cương.' },
  ta_p4: { cls: 'taoist', name: 'Bát Quái Hộ Thể', glyph: '卦', unlock: 22, req: ['ta_p3', 3], per: { resAll: 3, hpPct: 3 }, desc: 'Bát quái xoay quanh thân, tà khí khó xâm.' },
  // Assassin
  as_p1: { cls: 'assassin', name: 'Khinh Thân Thuật', glyph: '輕', unlock: 5, per: { dodge: 1.5, speed: 3 }, desc: 'Thân nhẹ như yến.' },
  as_p2: { cls: 'assassin', name: 'Ám Sát Thuật', glyph: '暗', unlock: 10, req: ['as_p1', 2], per: { crit: 2 }, desc: 'Nhìn ra chỗ hở chỉ trong một chớp mắt.' },
  as_p3: { cls: 'assassin', name: 'Nhất Kích Tất Sát', glyph: '殺', unlock: 16, req: ['as_p2', 2], per: { critDmg: 10 }, desc: 'Đã ra tay là không để địch đứng dậy.' },
  as_p4: { cls: 'assassin', name: 'Thừa Thắng', glyph: '勝', unlock: 22, req: ['as_p3', 3], per: { killHeal: 1.5 }, desc: 'Mỗi lần hạ địch, khí lực lại dâng.' },
};
export const PASSIVE_NAMES = {
  hpPct: ['Máu tối đa', '%'], mpPct: ['Nội lực tối đa', '%'], atkPct: ['Công', '%'], defPct: ['Thủ', '%'],
  crit: ['Chí mạng', '%'], critDmg: ['Sát thương chí mạng', '%'], lifesteal: ['Hút máu', '%'], elemDmg: ['Sát thương hệ', '%'],
  mpCost: ['Giảm nội lực tốn', '%'], mpRegen: ['Hồi nội lực', '%'], resAll: ['Kháng mọi hệ', '%'], dodge: ['Né tránh', '%'],
  speed: ['Tốc chạy', '%'], killHeal: ['Hồi khi hạ quái', '%'], lowHp: ['Công & Thủ khi máu < 35%', '%'],
};
export function passivesOf(cls) { return Object.keys(PASSIVES).filter((id) => PASSIVES[id].cls === cls); }
