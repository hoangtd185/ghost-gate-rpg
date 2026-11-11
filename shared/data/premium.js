// Vạn Bảo Các: the premium shop. Everything here costs Nguyên Bảo (ingots), earned in game (see GAME.premium).
// tab: which page of the shop · items: [[item id, quantity]] granted together · price: in ingots
export const PREMIUM_TABS = [
  { id: 'cape', name: 'Áo choàng' },
  { id: 'outfit', name: 'Ngoại trang' },
  { id: 'util', name: 'Tiện ích' },
];

export const PREMIUM_SHOP = [
  // ----- Capes -----
  { id: 'pc_sakura', tab: 'cape', items: [['cape_sakura', 1]], price: 120, tag: 'Mới' },
  { id: 'pc_frost', tab: 'cape', items: [['cape_frost', 1]], price: 150 },
  { id: 'pc_phoenix', tab: 'cape', items: [['cape_phoenix', 1]], price: 180, tag: 'Hot' },
  { id: 'pc_shadow', tab: 'cape', items: [['cape_shadow', 1]], price: 180 },
  { id: 'pc_dragon', tab: 'cape', items: [['cape_dragon', 1]], price: 240, tag: 'Hiếm' },
  // ----- Outfits -----
  { id: 'po_wisp', tab: 'outfit', items: [['out_wisp_hood', 1]], price: 90 },
  { id: 'po_jade', tab: 'outfit', items: [['out_jade_lotus', 1]], price: 320 },
  // ----- Utilities -----
  { id: 'pu_hp', tab: 'util', items: [['hp_l', 20]], price: 6 },
  { id: 'pu_home', tab: 'util', items: [['scroll_home', 5]], price: 3 },
  { id: 'pu_stone', tab: 'util', items: [['stone', 5]], price: 10 },
  { id: 'pu_protect', tab: 'util', items: [['protect', 1]], price: 20 },
  { id: 'pu_dew', tab: 'util', items: [['mat_dew', 1]], price: 45 },
];
