// Crafting recipes at Tú Nương (the embroiderer, Trúc Lâm Village)
// need: [[material id, qty]], gold: crafting fee, out: [id, qty]
// 'GEM1' = one random grade-1 gem
export const RECIPES = [
  // ----- Outfits -----
  { id: 'r_peach_fairy', cat: 'outfit', out: ['out_peach_fairy', 1], gold: 15000,
    need: [['mat_peach', 40], ['mat_tail', 20], ['mat_wisp', 20], ['mat_dew', 1]] },
  { id: 'r_rainbow_fairy', cat: 'outfit', out: ['out_rainbow_fairy', 1], gold: 30000,
    need: [['mat_icesilk', 40], ['mat_fur', 20], ['mat_ice', 15], ['mat_dew', 2]] },
  { id: 'r_fox', cat: 'outfit', out: ['out_fox', 1], gold: 10000,
    need: [['mat_tail', 60], ['mat_peach', 15], ['mat_dew', 1]] },
  // ----- Capes -----
  { id: 'r_cape_traveler', cat: 'cape', out: ['cape_traveler', 1], gold: 500,
    need: [['mat_tail', 10], ['mat_straw', 5]] },
  { id: 'r_cape_moon', cat: 'cape', out: ['cape_moon', 1], gold: 8000,
    need: [['mat_icesilk', 20], ['mat_wisp', 30], ['mat_ice', 8]] },
  // ----- Consumables -----
  { id: 'r_hp', cat: 'use', out: ['hp_l', 5], gold: 80, need: [['mat_tail', 4], ['mat_wisp', 4]] },
  { id: 'r_mp', cat: 'use', out: ['mp_l', 5], gold: 100, need: [['mat_wisp', 6], ['mat_slime', 2]] },
  { id: 'r_stone', cat: 'use', out: ['stone', 1], gold: 200, need: [['mat_charm', 6], ['mat_straw', 6]] },
  { id: 'r_protect', cat: 'use', out: ['protect', 1], gold: 2000, need: [['mat_lantern', 10], ['mat_ice', 5], ['mat_ember', 3]] },
  { id: 'r_gem', cat: 'use', out: ['GEM1', 1], gold: 500, need: [['mat_slime', 10], ['mat_charm', 5]] },
];
