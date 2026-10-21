// Monster traits (affixes) + named monsters (story bosses, field bosses)

// Traits: species have built-in traits (MONSTERS[x].affix); Elite monsters get extra random ones.
export const AFFIXES = {
  reflect: { name: 'Phản Đòn', color: '#c07bff', desc: 'Dội lại 18% sát thương bạn gây ra (tối đa 7% máu của bạn mỗi đòn).' },
  vampire: { name: 'Hút Huyết', color: '#ff4a5e', desc: 'Đánh trúng bạn thì hồi máu bằng 60% sát thương.' },
  regen: { name: 'Tự Hồi', color: '#7dff9a', desc: 'Không bị đánh 3 giây thì hồi 3% máu mỗi giây.' },
  enrage: { name: 'Cuồng Nộ', color: '#ff7a3a', desc: 'Máu dưới 35%: công +50%, chạy nhanh gấp rưỡi.' },
  explode: { name: 'Tự Bạo', color: '#ffb040', desc: 'Khi chết sẽ nổ tung sau 1 giây. Tránh xa vòng đỏ!' },
  blink: { name: 'Thuấn Di', color: '#9fe0ff', desc: 'Thỉnh thoảng biến mất rồi hiện ra ngay cạnh bạn.' },
  frost: { name: 'Hàn Băng', color: '#8fd8ff', desc: 'Đánh trúng làm bạn chậm 40% trong 2 giây.' },
  poison: { name: 'Kịch Độc', color: '#8fe06a', desc: 'Đánh trúng làm bạn trúng độc, mất máu 3 giây.' },
  shield: { name: 'Hộ Thể', color: '#ffd84a', desc: 'Có lá chắn đỡ 25% máu, tự phục hồi sau 10 giây.' },
};
// Traits that can be rolled onto Elite monsters
export const ELITE_POOL = ['reflect', 'vampire', 'regen', 'enrage', 'explode', 'blink', 'frost', 'poison', 'shield'];

// Smartness tier by monster level
//   0 (lv 1–5): wanders around, only chases after being hit
//   1 (6–12): charges on sight; ranged monsters keep their distance
//   2 (13–20): dodges projectiles, calls nearby allies, charges
//   3 (21+): leads its shots, attacks more often, backs off at low HP
export function smartTier(lv) { return lv >= 21 ? 3 : lv >= 13 ? 2 : lv >= 6 ? 1 : 0; }
// Elite spawn chance by level
export function eliteChance(lv) { return lv >= 21 ? 0.07 : lv >= 13 ? 0.05 : lv >= 5 ? 0.03 : 0; }

// Named monsters: based on a species, with multiplied HP/attack, bigger and recolored
//   quest: story boss, only appears while that quest is active (killing it counts for the quest)
//   every: field boss, respawns after [min, max] seconds while you are on that map
export const NAMED = {
  // ----- story bosses -----
  nb_scarecrow: {
    mob: 'scarecrow', name: 'Bù Nhìn Đầu Đàn', lv: 8, hp: 9, atk: 1.5, scale: 1.55, map: 'field', x: 1500, quest: 'st4',
    tint: 'sepia(0.4) saturate(1.8) hue-rotate(-15deg) brightness(0.85)', affix: ['enrage'],
    lines: { appear: 'Kẻ nào dám phá vòng tròn của ta?!', die: 'Rơm… rơm cháy rồi…' },
    drops: [['mat_dew', 0.5], ['W2', 0.5], ['stone', 1], ['GEM1', 1], ['hp_l', 1]],
  },
  nb_lantern: {
    mob: 'lantern', name: 'Lão Đăng Quỷ', lv: 13, hp: 11, atk: 1.6, scale: 1.75, map: 'graveyard', x: 2150, quest: 'st6d',
    tint: 'hue-rotate(250deg) saturate(1.5)', affix: ['regen', 'shield'],
    lines: { appear: 'Hehe… ngọn đèn cuối cùng soi đường xuống âm phủ đây!', die: 'Tắt… tắt rồi…' },
    drops: [['mat_dew', 0.5], ['W3', 0.5], ['stone', 1], ['stone', 1], ['GEM1', 1], ['GEM2', 0.3]],
  },
  nb_icebat: {
    mob: 'icebat', name: 'Băng Dực Vương', lv: 21, hp: 13, atk: 1.6, scale: 1.9, map: 'ice_cave', x: 1750, quest: 'st10c',
    tint: 'hue-rotate(40deg) saturate(1.6) brightness(1.1)', affix: ['frost', 'blink'],
    lines: { appear: 'Kíííí! Lãnh địa của ta, kẻ ấm máu không được bước qua!', die: 'Cánh… cánh ta…' },
    drops: [['out_jade_lotus', 0.08], ['out_rainbow_fairy', 0.02], ['mat_dew', 0.5], ['W5', 0.4], ['stone', 1], ['GEM2', 1], ['protect', 0.4]],
  },
  nb_blood_jiangshi: {
    mob: 'blood_jiangshi', name: 'Huyết Thi Tướng', lv: 29, hp: 14, atk: 1.6, scale: 1.7, map: 'temple', x: 2250, quest: 'st16b',
    tint: 'saturate(1.6) brightness(0.8)', affix: ['vampire', 'reflect'],
    lines: { appear: 'Ta từng là tướng quân… giờ ta chỉ là xác của hắn.', die: 'Cuối cùng… được ngủ rồi…' },
    drops: [['mat_dew', 0.5], ['out_blood_moon', 0.06], ['arm_sect_robe', 0.25], ['hat_blood_helm', 0.25], ['W6', 0.4], ['stone', 1], ['stone', 1], ['GEM2', 1], ['protect', 0.5]],
  },

  // ----- field bosses: spawn on a timer, drop outfits -----
  fb_fox: {
    mob: 'fox', name: 'Cửu Vĩ Hồ Vương', lv: 12, hp: 24, atk: 1.7, scale: 2.1, map: 'forest', x: 1500, every: [240, 420],
    tint: 'hue-rotate(160deg) saturate(1.4) brightness(1.15)', affix: ['blink', 'regen'],
    lines: { appear: 'Chín đuôi rung lên… Cửu Vĩ Hồ Vương đã thức giấc!', die: 'Hồ Vương tan thành chín đốm lửa.' },
    drops: [['out_fox', 0.07], ['out_peach_fairy', 0.02], ['out_wisp_hood', 0.03], ['mat_dew', 1], ['GEM2', 1], ['stone', 1], ['stone', 0.5], ['protect', 0.3], ['acc_bead', 0.4]],
  },
  fb_jiangshi: {
    mob: 'jiangshi', name: 'Cương Thi Vương', lv: 17, hp: 26, atk: 1.7, scale: 2, map: 'graveyard', x: 800, every: [300, 480],
    tint: 'hue-rotate(200deg) saturate(1.3) brightness(0.85)', affix: ['vampire', 'enrage'],
    lines: { appear: 'Mặt đất nứt toác. Cương Thi Vương trồi lên từ mộ cổ!', die: 'Cương Thi Vương đổ xuống, lá bùa trên trán cháy rụi.' },
    drops: [['out_black_dragon', 0.06], ['out_peach_fairy', 0.015], ['mat_dew', 1], ['GEM2', 1], ['stone', 1], ['stone', 1], ['protect', 0.4], ['acc_guard', 0.3]],
  },
  fb_yeti: {
    mob: 'yeti', name: 'Tuyết Sơn Ma Vương', lv: 22, hp: 28, atk: 1.7, scale: 2, map: 'snow_peak', x: 1700, every: [300, 480],
    tint: 'hue-rotate(180deg) saturate(1.2) brightness(1.15)', affix: ['frost', 'shield'],
    lines: { appear: 'Tuyết lở ầm ầm. Tuyết Sơn Ma Vương gầm vang khắp núi!', die: 'Tuyết Sơn Ma Vương ngã xuống, núi tuyết im bặt.' },
    drops: [['out_white_fox', 0.07], ['out_rainbow_fairy', 0.02], ['mat_dew', 1], ['GEM2', 1], ['GEM3', 0.1], ['stone', 1], ['stone', 1], ['protect', 0.5]],
  },
  fb_lava: {
    mob: 'lava', name: 'Nham Ma Hỏa Thú', lv: 27, hp: 28, atk: 1.7, scale: 1.9, map: 'volcano', x: 1600, every: [300, 540],
    tint: 'hue-rotate(-20deg) saturate(1.8) brightness(1.1)', affix: ['explode', 'reflect'],
    lines: { appear: 'Dung nham sôi sục. Nham Ma Hỏa Thú phá đá chui lên!', die: 'Nham Ma Hỏa Thú nguội dần thành đá.' },
    drops: [['out_phoenix', 0.06], ['mat_dew', 1], ['GEM2', 1], ['GEM3', 0.12], ['stone', 1], ['stone', 1], ['protect', 0.5]],
  },
  fb_mask: {
    mob: 'maskghost', name: 'Bạch Diện Quỷ Chủ', lv: 31, hp: 30, atk: 1.7, scale: 2, map: 'temple', x: 1300, every: [360, 600],
    tint: 'saturate(0.3) brightness(1.2)', affix: ['blink', 'poison', 'shield'],
    lines: { appear: 'Trăm chiếc mặt nạ cùng cười. Bạch Diện Quỷ Chủ xuất hiện!', die: 'Những chiếc mặt nạ vỡ vụn như sứ rơi.' },
    drops: [['out_blood_moon', 0.07], ['out_jade_lotus', 0.04], ['out_rainbow_fairy', 0.015], ['mat_dew', 1], ['GEM2', 1], ['GEM3', 0.15], ['stone', 1], ['stone', 1], ['protect', 0.6]],
  },
};
