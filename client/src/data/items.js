// Items: consumable (usable), material, equip (equipment)
// equipment slots: weapon, hat, armor, acc
import { GAME } from '../config.js';
export const RARITY = [
  { id: 0, name: 'Thường', color: '#d8d4cc' },
  { id: 1, name: 'Hiếm', color: '#5aa7ff' },
  { id: 2, name: 'Quý', color: '#c07bff' },
  { id: 3, name: 'Huyền Thoại', color: '#ffc23d' },
];

export const ITEMS = {
  // ----- Consumables -----
  hp_s: { name: 'Bình Máu Nhỏ', type: 'use', icon: 'potion', color: '#d2353a', heal: { hp: 60 }, price: 15, desc: 'Hồi 60 máu.' },
  hp_l: { name: 'Bình Máu Lớn', type: 'use', icon: 'potion', color: '#ff4a5e', heal: { hp: 250 }, price: 60, desc: 'Hồi 250 máu.' },
  mp_s: { name: 'Bình Linh Khí', type: 'use', icon: 'potion', color: '#3c6fe0', heal: { mp: 40 }, price: 18, desc: 'Hồi 40 nội lực.' },
  mp_l: { name: 'Đại Linh Đan', type: 'use', icon: 'pill', color: '#5aa7ff', heal: { mp: 160 }, price: 70, desc: 'Hồi 160 nội lực.' },
  scroll_home: { name: 'Hồi Thành Phù', type: 'use', icon: 'scroll', color: '#e8c35a', home: true, price: 40, desc: 'Dịch chuyển về Làng Trúc Lâm.' },

  // ----- Materials -----
  mat_wisp: { name: 'Lửa Ma Trơi', type: 'mat', icon: 'flame', color: '#7ff2d6', price: 4, desc: 'Ngọn lửa xanh lạnh buốt.' },
  mat_tail: { name: 'Đuôi Hồ Ly', type: 'mat', icon: 'tail', color: '#ff9a3c', price: 8, desc: 'Mềm mượt, toả mùi hương lạ.' },
  mat_straw: { name: 'Rơm Ma', type: 'mat', icon: 'straw', color: '#d9b45a', price: 12, desc: 'Rơm khô nhuốm âm khí.' },
  mat_charm: { name: 'Bùa Rách', type: 'mat', icon: 'charm', color: '#ffd84a', price: 18, desc: 'Lá bùa trấn yểm đã rách.' },
  mat_lantern: { name: 'Bấc Đèn Ma', type: 'mat', icon: 'flame', color: '#ff6a3c', price: 22, desc: 'Vẫn còn cháy âm ỉ.' },
  mat_horn: { name: 'Sừng Quỷ Vương', type: 'mat', icon: 'horn', color: '#9b2b3a', price: 500, desc: 'Chiến lợi phẩm hiếm có.' },

  // ----- Swordsman weapons -----
  w_swordsman1: { name: 'Kiếm Gỗ Đào', type: 'equip', slot: 'weapon', cls: 'swordsman', lv: 1, stats: { atk: 8 }, color: '#b07a4a', price: 30 },
  w_swordsman2: { name: 'Thiết Kiếm', type: 'equip', slot: 'weapon', cls: 'swordsman', lv: 5, stats: { atk: 20, str: 2 }, color: '#c9ced6', price: 300 },
  w_swordsman3: { name: 'Huyền Thiết Kiếm', type: 'equip', slot: 'weapon', cls: 'swordsman', lv: 9, stats: { atk: 38, str: 4 }, color: '#7aa0c8', price: 1200 },
  w_swordsman4: { name: 'Trảm Quỷ Đao', type: 'equip', slot: 'weapon', cls: 'swordsman', lv: 13, stats: { atk: 65, str: 8, crit: 5 }, color: '#e04848', price: 0 },
  // ----- Taoist weapons -----
  w_taoist1: { name: 'Phất Trần', type: 'equip', slot: 'weapon', cls: 'taoist', lv: 1, stats: { atk: 7, mp: 10 }, color: '#e8e2d0', price: 30 },
  w_taoist2: { name: 'Đào Mộc Trượng', type: 'equip', slot: 'weapon', cls: 'taoist', lv: 5, stats: { atk: 18, int: 2, mp: 20 }, color: '#a8653a', price: 300 },
  w_taoist3: { name: 'Bát Quái Trượng', type: 'equip', slot: 'weapon', cls: 'taoist', lv: 9, stats: { atk: 34, int: 4, mp: 40 }, color: '#e8c35a', price: 1200 },
  w_taoist4: { name: 'Thiên Sư Ấn Trượng', type: 'equip', slot: 'weapon', cls: 'taoist', lv: 13, stats: { atk: 60, int: 8, mp: 80 }, color: '#ff5a5a', price: 0 },
  // ----- Assassin weapons -----
  w_assassin1: { name: 'Phi Tiêu Sắt', type: 'equip', slot: 'weapon', cls: 'assassin', lv: 1, stats: { atk: 7, crit: 2 }, color: '#9aa3ad', price: 30 },
  w_assassin2: { name: 'Liễu Diệp Tiêu', type: 'equip', slot: 'weapon', cls: 'assassin', lv: 5, stats: { atk: 18, dex: 2, crit: 3 }, color: '#8fd06a', price: 300 },
  w_assassin3: { name: 'Độc Long Tiêu', type: 'equip', slot: 'weapon', cls: 'assassin', lv: 9, stats: { atk: 33, dex: 4, crit: 5 }, color: '#5ae0a8', price: 1200 },
  w_assassin4: { name: 'Ám Ảnh Tiêu', type: 'equip', slot: 'weapon', cls: 'assassin', lv: 13, stats: { atk: 58, dex: 8, crit: 9 }, color: '#b06aff', price: 0 },

  // ----- Hats -----
  hat_cloth: { name: 'Khăn Vải', type: 'equip', slot: 'hat', lv: 1, stats: { def: 2, hp: 10 }, color: '#7c5a3a', look: 'band', price: 25 },
  hat_straw: { name: 'Nón Lá', type: 'equip', slot: 'hat', lv: 4, stats: { def: 5, hp: 25 }, color: '#d9c27a', look: 'conical', price: 150 },
  hat_iron: { name: 'Mũ Giáp Sắt', type: 'equip', slot: 'hat', lv: 8, stats: { def: 10, hp: 50, vit: 2 }, color: '#8b95a3', look: 'helm', price: 700 },
  hat_daoist: { name: 'Mũ Đạo Trưởng', type: 'equip', slot: 'hat', lv: 8, stats: { def: 6, mp: 40, int: 3 }, color: '#2a2a3a', look: 'daoist', price: 700 },

  // ----- Armor -----
  arm_cloth: { name: 'Áo Vải Thô', type: 'equip', slot: 'armor', lv: 1, stats: { def: 3, hp: 15 }, color: '#6b5a48', price: 30 },
  arm_leather: { name: 'Áo Da Hồ Ly', type: 'equip', slot: 'armor', lv: 4, stats: { def: 8, hp: 35, dex: 1 }, color: '#b8642e', price: 200 },
  arm_chain: { name: 'Giáp Lưới Sắt', type: 'equip', slot: 'armor', lv: 8, stats: { def: 16, hp: 70, vit: 2 }, color: '#5c6878', price: 900 },
  arm_ghost: { name: 'Huyết Y Quỷ Vương', type: 'equip', slot: 'armor', lv: 12, stats: { def: 26, hp: 150, str: 3, int: 3, dex: 3 }, color: '#7a1a2a', price: 0 },

  // ----- Accessories -----
  acc_jade: { name: 'Ngọc Bội', type: 'equip', slot: 'acc', lv: 3, stats: { hp: 20, mp: 20 }, color: '#5ad08f', price: 120 },
  acc_bead: { name: 'Chuỗi Hạt Trừ Tà', type: 'equip', slot: 'acc', lv: 7, stats: { def: 4, crit: 3, mp: 30 }, color: '#a8653a', price: 600 },
  acc_guard: { name: 'Hộ Thân Ngọc', type: 'equip', slot: 'acc', lv: 8, stats: { hp: 80, def: 6, vit: 3 }, color: '#7ff2d6', price: 0 },
  acc_demon: { name: 'Nhẫn Quỷ Nhãn', type: 'equip', slot: 'acc', lv: 12, stats: { atk: 15, crit: 6, hp: 60 }, color: '#ff3a5a', price: 0 },
};

// ===== Expansion items: new regions, enhancement, elements =====
Object.assign(ITEMS, {
  // Materials from the new regions
  mat_slime: { name: 'Nhớt Ếch Độc', type: 'mat', icon: 'drop', color: '#8fe06a', price: 20, desc: 'Sền sệt, có mùi lá mục.' },
  mat_fur: { name: 'Lông Tuyết Hồ', type: 'mat', icon: 'fur', color: '#e8f4ff', price: 35, desc: 'Mềm và ấm, giữ nhiệt rất tốt.' },
  mat_ice: { name: 'Băng Tinh', type: 'mat', icon: 'crystal', color: '#8fd8ff', price: 45, desc: 'Viên băng không bao giờ tan.' },
  mat_ember: { name: 'Hỏa Tinh Thạch', type: 'mat', icon: 'ember', color: '#ff7a3a', price: 55, desc: 'Đá nóng rực từ lòng núi lửa.' },
  mat_peach: { name: 'Cánh Đào Ma', type: 'mat', icon: 'petal', color: '#ffb8cc', price: 15, desc: 'Cánh hoa đào nhuốm âm khí, không bao giờ héo. Dùng để thêu tiên y.', src: 'Hồ Ly Tinh, Quỷ Rơm, Ma Trơi' },
  mat_icesilk: { name: 'Tơ Băng Tằm', type: 'mat', icon: 'silk', color: '#e8f4ff', price: 40, desc: 'Sợi tơ trắng mảnh như sương, lạnh mà mềm.', src: 'Băng Dực, Tuyết Hồ, Tuyết Yêu' },
  mat_dew: { name: 'Tiên Lộ', type: 'mat', icon: 'drop', color: '#ffd6f0', price: 800, desc: 'Giọt sương đọng trên đài sen tiên giới. Cực hiếm, cần để chế ngoại trang.', src: 'Boss dã ngoại, boss truyện, boss chương, quái Tinh Anh (8%)' },
  mat_scale: { name: 'Vảy Kỳ Lân', type: 'mat', icon: 'scale', color: '#ffb040', price: 2000, desc: 'Chiến lợi phẩm hiếm từ Hỏa Kỳ Lân.' },

  // Story quest items
  q_ribbon: { name: 'Dải Lụa Đỏ', type: 'quest', icon: 'tail', color: '#e04050', price: 0, desc: 'Dải lụa buộc tóc của Tiểu Lan, vương mùi nhang lạ.' },
  q_letter: { name: 'Huyết Thư', type: 'quest', icon: 'charm', color: '#e0b0a0', price: 0, desc: 'Lá thư viết bằng máu, tìm thấy trên người Cương Thi.' },
  q_bloodfur: { name: 'Lông Nhuốm Huyết', type: 'quest', icon: 'fur', color: '#f0a0b0', price: 0, desc: 'Lông Tuyết Yêu nhuốm huyết khí đỏ sẫm.' },
  q_icecore: { name: 'Băng Tâm', type: 'quest', icon: 'crystal', color: '#c8f4ff', price: 0, desc: 'Lõi băng ngàn năm, vẫn còn đập nhè nhẹ.' },

  // Enhancement
  stone: { name: 'Đá Cường Hóa', type: 'mat', icon: 'stone', color: '#9ad0ff', price: 150, desc: 'Mang tới Thợ Rèn để cường hóa trang bị.' },
  protect: { name: 'Bùa Bảo Hộ', type: 'mat', icon: 'protect', color: '#ffd84a', price: 900, desc: 'Khi cường hóa thất bại, trang bị không bị tụt cấp (mất bùa).' },

  // Element orbs: socketed into the wielded weapon
  orb_fire: { name: 'Hỏa Châu', type: 'use', icon: 'orb', color: '#ff6a3a', orb: 'fire', price: 600, desc: 'Khảm vào vũ khí đang cầm: đòn đánh mang hệ Hỏa.' },
  orb_ice: { name: 'Băng Châu', type: 'use', icon: 'orb', color: '#7ad0ff', orb: 'ice', price: 600, desc: 'Khảm vào vũ khí đang cầm: đòn đánh mang hệ Băng.' },
  orb_thunder: { name: 'Lôi Châu', type: 'use', icon: 'orb', color: '#ffe066', orb: 'thunder', price: 600, desc: 'Khảm vào vũ khí đang cầm: đòn đánh mang hệ Lôi.' },
  orb_poison: { name: 'Độc Châu', type: 'use', icon: 'orb', color: '#8fe06a', orb: 'poison', price: 600, desc: 'Khảm vào vũ khí đang cầm: đòn đánh mang hệ Độc.' },

  // Tier-5 weapons (built-in Ice) and tier-6 weapons (built-in Fire)
  w_swordsman5: { name: 'Băng Phách Kiếm', type: 'equip', slot: 'weapon', cls: 'swordsman', lv: 17, el: 'ice', stats: { atk: 90, str: 10, crit: 5 }, color: '#9ad8ff', price: 0 },
  w_taoist5: { name: 'Huyền Băng Trượng', type: 'equip', slot: 'weapon', cls: 'taoist', lv: 17, el: 'ice', stats: { atk: 84, int: 10, mp: 100 }, color: '#9ad8ff', price: 0 },
  w_assassin5: { name: 'Hàn Băng Tiêu', type: 'equip', slot: 'weapon', cls: 'assassin', lv: 17, el: 'ice', stats: { atk: 82, dex: 10, crit: 10 }, color: '#9ad8ff', price: 0 },
  w_swordsman6: { name: 'Kỳ Lân Kiếm', type: 'equip', slot: 'weapon', cls: 'swordsman', lv: 24, el: 'fire', stats: { atk: 140, str: 16, crit: 8 }, color: '#ff9a3c', price: 0 },
  w_taoist6: { name: 'Kỳ Lân Trượng', type: 'equip', slot: 'weapon', cls: 'taoist', lv: 24, el: 'fire', stats: { atk: 130, int: 16, mp: 160 }, color: '#ff9a3c', price: 0 },
  w_assassin6: { name: 'Kỳ Lân Tiêu', type: 'equip', slot: 'weapon', cls: 'assassin', lv: 24, el: 'fire', stats: { atk: 126, dex: 16, crit: 14 }, color: '#ff9a3c', price: 0 },

  // Armor, hats and accessories with resistances
  arm_rain: { name: 'Áo Tơi Ngư Ông', type: 'equip', slot: 'armor', lv: 9, stats: { def: 14, hp: 70, res_poison: 15, res_ice: 10 }, color: '#6a7a4a', price: 1500 },
  arm_fur: { name: 'Áo Lông Tuyết', type: 'equip', slot: 'armor', lv: 14, stats: { def: 24, hp: 130, res_ice: 30 }, color: '#dce8f4', price: 3500 },
  arm_fire: { name: 'Hỏa Long Giáp', type: 'equip', slot: 'armor', lv: 20, stats: { def: 36, hp: 220, res_fire: 35, str: 3, int: 3, dex: 3 }, color: '#b8302a', price: 0 },
  hat_fur: { name: 'Mũ Lông Cáo', type: 'equip', slot: 'hat', lv: 14, stats: { def: 11, hp: 70, res_ice: 15 }, color: '#eef2f8', look: 'helm', price: 2500 },
  hat_flame: { name: 'Mũ Hỏa Vân', type: 'equip', slot: 'hat', lv: 20, stats: { def: 16, hp: 100, res_fire: 20 }, color: '#8a1a1a', look: 'daoist', price: 6000 },
  acc_frost: { name: 'Băng Tâm Ngọc', type: 'equip', slot: 'acc', lv: 16, stats: { mp: 60, crit: 3, res_ice: 20 }, color: '#9ad8ff', price: 4000 },
  acc_flame: { name: 'Hỏa Tâm Ngọc', type: 'equip', slot: 'acc', lv: 21, stats: { atk: 14, res_fire: 20 }, color: '#ff7a3a', price: 0 },
  acc_five_elements: { name: 'Ngũ Hành Bội', type: 'equip', slot: 'acc', lv: 24, stats: { atk: 20, hp: 150, res_fire: 15, res_ice: 15, res_thunder: 15, res_poison: 15 }, color: '#e8c35a', price: 0 },
});

// ===== Chapter 3, socket gems =====
Object.assign(ITEMS, {
  q_bell: { name: 'Mảnh Chuông Đồng', type: 'quest', icon: 'bell', color: '#c8a050', price: 0, desc: 'Nửa chiếc chuông đồng vỡ, khắc hoa văn bát quái. Cầm lên thấy ấm tay.' },
  q_bell2: { name: 'Nửa Chuông Còn Lại', type: 'quest', icon: 'bell', color: '#e0c070', price: 0, desc: 'Nửa kia của Chuông Trấn Hồn, lạnh như băng.' },
  mat_mask: { name: 'Mảnh Mặt Nạ', type: 'mat', icon: 'mask', color: '#f0ece4', price: 70, desc: 'Mảnh sứ trắng, vẫn còn nghe tiếng thì thầm.' },
  acc_bell: { name: 'Chuông Trấn Hồn', type: 'equip', slot: 'acc', lv: 26, stats: { atk: 26, hp: 120, mp: 120, crit: 4, res_fire: 10, res_ice: 10, res_thunder: 10, res_poison: 10 }, color: '#e0c070', price: 0 },
  hat_blood_helm: { name: 'Huyết Sát Khôi', type: 'equip', slot: 'hat', lv: 27, stats: { def: 22, hp: 160, str: 3, dex: 3, int: 3, res_poison: 15 }, color: '#5a1420', look: 'helm', price: 0 },
  arm_sect_robe: { name: 'Huyền Môn Đạo Bào', type: 'equip', slot: 'armor', lv: 27, stats: { def: 48, hp: 300, mp: 80, res_fire: 10, res_ice: 10, res_thunder: 10, res_poison: 10 }, color: '#e8e2d0', price: 0 },
  w_swordsman7: { name: 'Trấn Hồn Kiếm', type: 'equip', slot: 'weapon', cls: 'swordsman', lv: 28, el: 'thunder', stats: { atk: 200, str: 22, crit: 10 }, color: '#ffe066', price: 0 },
  w_taoist7: { name: 'Huyền Môn Pháp Trượng', type: 'equip', slot: 'weapon', cls: 'taoist', lv: 28, el: 'thunder', stats: { atk: 186, int: 22, mp: 220 }, color: '#ffe066', price: 0 },
  w_assassin7: { name: 'Bạch Diện Tiêu', type: 'equip', slot: 'weapon', cls: 'assassin', lv: 28, el: 'poison', stats: { atk: 180, dex: 22, crit: 18 }, color: '#f0ece4', price: 0 },
});

// Socket gems: 5 kinds × 3 grades. Inserted into equipment sockets at the Smith.
export const GEM_KINDS = {
  atk: { name: 'Hồng Ngọc', stat: 'atk', vals: [4, 10, 22], color: '#ff4a5e' },
  crit: { name: 'Hoàng Ngọc', stat: 'crit', vals: [1, 2, 4], color: '#ffd23a' },
  hp: { name: 'Lục Ngọc', stat: 'hp', vals: [30, 75, 170], color: '#4fd08a' },
  def: { name: 'Tử Ngọc', stat: 'def', vals: [3, 8, 18], color: '#b47aff' },
  mp: { name: 'Lam Ngọc', stat: 'mp', vals: [20, 50, 110], color: '#4aa0ff' },
};
export const GEM_GRADES = ['Sơ', 'Trung', 'Thượng'];
// Gem kinds each equipment slot accepts
export const GEM_SLOTS = {
  weapon: ['atk', 'crit', 'mp'], hat: ['hp', 'def', 'mp'], armor: ['hp', 'def', 'mp'], acc: ['atk', 'crit', 'hp', 'def', 'mp'], outfit: [],
};
export const GEM_FUSE = GAME.forge.gemFuse; // tuned in config.js
export const gemId = (kind, g) => `gem_${kind}${g}`;
for (const [kind, k] of Object.entries(GEM_KINDS)) {
  for (let g = 1; g <= 3; g++) {
    ITEMS[gemId(kind, g)] = {
      name: `${k.name} (${GEM_GRADES[g - 1]})`, type: 'gem', gem: { kind, g }, icon: 'gem', color: k.color,
      price: [400, 1500, 5000][g - 1],
      desc: `Ép vào trang bị: +${k.vals[g - 1]} ${k.stat === 'crit' ? 'Chí mạng %' : { atk: 'Công', hp: 'Máu', def: 'Thủ', mp: 'Nội lực' }[k.stat]}.`,
    };
  }
}
// Socket count: 1 + (Rare or better) + (enhanced to +7 or more)
export function socketCount(e) {
  if (ITEMS[e.id].slot === 'outfit') return 0; // outfits have no sockets
  return 1 + ((e.r || 0) >= 2 ? 1 : 0) + ((e.e || 0) >= 7 ? 1 : 0);
}
export function socketCost(it, g) { return 60 * g * g + (it.lv || 1) * 12; }
export function unsocketCost(g) { return 150 * g * g; }

// ===== Outfits: separate equipment slot, replaces the whole look, rare boss drops =====
// look: extra details drawn on the character (see gfx/humanoid.js)
//   cape · shoulder pads · fur collar · pattern on the robe · sash (flying silk sash)
//   tail (fox tail) · ears (fox ears) · hood · crown (dragon/lotus/phoenix) · halfmask
//   aura (drawn in game): glow + particles around the body · wisps: two will-o'-wisps circling around
Object.assign(ITEMS, {
  out_wisp_hood: { name: 'Ma Trơi Tinh Nghịch', type: 'equip', slot: 'outfit', lv: 1, color: '#3fa891', price: 0,
    stats: { hp: 50, mp: 50, crit: 2 }, src: 'Ma Trơi (cực hiếm), Cửu Vĩ Hồ Vương',
    look: { robe: '#3fa891', trim: '#e8fff9', inner: '#2a7a6a', pants: '#1e4a44', hood: { c: '#3fa891', ghost: true }, wisps: '#8ff4dc' } },
  out_fox: { name: 'Hồ Ly Y', type: 'equip', slot: 'outfit', lv: 10, color: '#e8833a', price: 0,
    stats: { hp: 90, atk: 8, crit: 3 }, src: 'Cửu Vĩ Hồ Vương (Rừng Ma Trơi)',
    look: { robe: '#e8833a', trim: '#fff1d8', inner: '#fff1d8', pants: '#5a2a1a', ears: '#e8833a', tail: '#e8833a', fur: '#fff6ea', pattern: { kind: 'cloud', c: '#fff1d8' } } },
  out_black_dragon: { name: 'Hắc Long Bào', type: 'equip', slot: 'outfit', lv: 14, color: '#2a2430', price: 0,
    stats: { atk: 18, def: 10, hp: 130 }, src: 'Hắc Quỷ Vương, Cương Thi Vương (Nghĩa Địa Cổ)',
    look: { robe: '#17131e', trim: '#e2b85c', inner: '#7a1420', pants: '#0e0c12', cape: { c: '#8a1420', t: '#e2b85c' }, shoulder: '#2a2430', pattern: { kind: 'dragon', c: '#e2b85c' }, crown: { kind: 'dragon', c: '#e2b85c' }, aura: '#ffcf6a' } },
  out_jade_lotus: { name: 'Thanh Liên Tiên Y', type: 'equip', slot: 'outfit', lv: 18, color: '#9fe8c8', price: 0,
    stats: { atk: 16, hp: 130, mp: 160, res_fire: 8, res_ice: 8, res_thunder: 8, res_poison: 8 }, src: 'Quái Tinh Anh (rất hiếm), Băng Dực Vương, Bạch Diện Quỷ Chủ',
    look: { robe: '#e2f6ec', trim: '#4fb88a', inner: '#ffffff', pants: '#cfe8dc', sash: '#9fe8c8', pattern: { kind: 'lotus', c: '#ff9ac0' }, crown: { kind: 'lotus', c: '#ff9ac0' }, aura: '#9fffd8' } },
  // Fairy robes: silk ribbons flowing around the body (ribbons, animated in game), fairy hairpin, petal aura
  out_rainbow_fairy: { name: 'Nghê Thường Tiên Y', type: 'equip', slot: 'outfit', lv: 15, color: '#fbf8f4', price: 0,
    stats: { hp: 150, mp: 150, atk: 14, crit: 3 }, src: 'Tuyết Sơn Ma Vương, Băng Dực Vương, Bạch Diện Quỷ Chủ',
    look: { robe: '#fbf8f4', trim: '#f0bcd0', inner: '#ffffff', pants: '#efe6ee', sash: '#ffd6e4', pattern: { kind: 'fairy', c: '#f4b8cc' }, crown: { kind: 'fairy', c: '#f2dca0' }, aura: '#fff0f6', ribbons: { c1: '#ffffff', c2: '#ffc8dc' } } },
  out_peach_fairy: { name: 'Đào Hoa Tiên Y', type: 'equip', slot: 'outfit', lv: 15, color: '#ffd2e2', price: 0,
    stats: { hp: 150, mp: 150, atk: 14, crit: 3 }, src: 'Cửu Vĩ Hồ Vương, Cương Thi Vương, quái Tinh Anh (rất hiếm)',
    look: { robe: '#ffd9e6', trim: '#ffffff', inner: '#fff4f8', pants: '#f6dce6', sash: '#ffffff', pattern: { kind: 'fairy', c: '#ffffff' }, crown: { kind: 'fairy', c: '#ffe2a0' }, aura: '#ffc0d8', ribbons: { c1: '#ffe0ec', c2: '#ffffff' } } },
  out_white_fox: { name: 'Bạch Hồ Cừu', type: 'equip', slot: 'outfit', lv: 20, color: '#f4f6fa', price: 0,
    stats: { hp: 220, def: 16, atk: 12, res_ice: 15 }, src: 'Tuyết Sơn Ma Vương (Tuyết Sơn)',
    look: { robe: '#f4f6fa', trim: '#8aaed0', inner: '#dce8f4', pants: '#5a6a7a', fur: '#ffffff', hood: { c: '#ffffff', ears: true }, tail: '#ffffff', pattern: { kind: 'snow', c: '#9ab8d8' }, aura: '#d8f0ff' } },
  out_phoenix: { name: 'Phượng Vũ Y', type: 'equip', slot: 'outfit', lv: 24, color: '#c8241e', price: 0,
    stats: { atk: 26, hp: 180, crit: 3, res_fire: 20 }, src: 'Hỏa Kỳ Lân, Nham Ma Hỏa Thú (Hỏa Diệm Sơn)',
    look: { robe: '#c8241e', trim: '#ffcf4a', inner: '#ff8a3a', pants: '#4a0e0a', cape: { c: '#ff7a2a', t: '#ffd84a', feather: true }, pattern: { kind: 'flame', c: '#ffcf4a' }, crown: { kind: 'phoenix', c: '#ffcf4a' }, aura: '#ff9a3a' } },
  out_blood_moon: { name: 'Huyết Nguyệt Chiến Giáp', type: 'equip', slot: 'outfit', lv: 28, color: '#8a1428', price: 0,
    stats: { atk: 32, def: 18, hp: 240, crit: 4 }, src: 'Huyết Ma Huyền Cơ, Huyết Thi Tướng, Bạch Diện Quỷ Chủ',
    look: { robe: '#3a0a14', trim: '#d8243a', inner: '#14060a', pants: '#140a0e', shoulder: '#5a1420', cape: { c: '#1a060a', t: '#d8243a' }, pattern: { kind: 'moon', c: '#ff3a4a' }, halfmask: true, aura: '#ff2a4a' } },
});

export const SLOT_NAMES = { weapon: 'Vũ khí', hat: 'Mũ', armor: 'Áo', acc: 'Phụ kiện', outfit: 'Ngoại trang' };
export const STAT_NAMES = {
  atk: 'Công', def: 'Thủ', hp: 'Máu', mp: 'Nội lực', str: 'Sức', dex: 'Nhanh', int: 'Trí', vit: 'Thể', crit: 'Chí mạng %',
  res_fire: 'Kháng Hỏa %', res_ice: 'Kháng Băng %', res_thunder: 'Kháng Lôi %', res_poison: 'Kháng Độc %',
};

// Enhancement: success rate when going from +n to +(n+1)
// Enhancement numbers are tuned in config.js (GAME.forge)
export const ENHANCE_MAX = GAME.forge.enhanceMax;
export const ENHANCE_RATE = GAME.forge.enhanceRate;
export const ENHANCE_SAFE = GAME.forge.enhanceSafe;
export const ENHANCE_BONUS = GAME.forge.enhanceBonus;
export function enhanceCost(it, lv) {
  return { stones: 1 + Math.floor(lv / 3), gold: (lv + 1) * ((it.lv || 1) * 30 + 60) };
}

export function weaponFor(cls, tier) {
  return `w_${cls}${tier}`;
}
