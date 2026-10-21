// Maps. Coordinates are logical pixels (640x360 screen). The ground is at y = GROUND_Y.
// platforms: one-way platforms (stand on them, jump through from below, ↓ + jump to drop down)
// spawns: { mob, x1, x2, y (platform top), count }
// portals: req = only shown once that quest is done; lock = shown but sealed until that quest is done
// npcs: after = only shown after the quest is done; until = gone once the quest is accepted; hideWhile = absent while the quest is active
export const GROUND_Y = 296;
const LIFT = 16; // the platforms below were written for the old ground height (312) and get shifted up to match

export const MAPS = {
  village: {
    name: 'Làng Trúc Lâm', theme: 'village', width: 1500, safe: true,
    platforms: [
      { x: 330, y: 250, w: 140 }, { x: 900, y: 250, w: 150 },
    ],
    portals: [{ x: 1440, to: 'forest', toX: 70, label: 'Rừng Ma Trơi' }],
    npcs: [
      { id: 'elder', x: 220 },
      { id: 'healer', x: 560 },
      { id: 'smith', x: 760 },
      { id: 'constable', x: 980 },
      { id: 'lan', x: 640, after: 'st7', hideWhile: 'st18' }, // appears after being rescued, goes missing again at the end of Chapter 3
      { id: 'priest', x: 1180, until: 'st13' },
      { id: 'embroiderer', x: 1330 }, // leaves the village in Chapter 3
    ],
    spawns: [],
    spawnX: 380,
  },
  forest: {
    name: 'Rừng Ma Trơi', theme: 'forest', width: 2300, minLv: 1,
    platforms: [
      { x: 240, y: 252, w: 180 }, { x: 520, y: 200, w: 160 }, { x: 780, y: 252, w: 200 },
      { x: 1080, y: 196, w: 220 }, { x: 1380, y: 252, w: 180 }, { x: 1620, y: 200, w: 200 },
      { x: 1700, y: 140, w: 140 }, { x: 1940, y: 252, w: 200 }, { x: 860, y: 140, w: 140 },
    ],
    portals: [{ x: 50, to: 'village', toX: 1400, label: 'Làng Trúc Lâm' }, { x: 2250, to: 'field', toX: 70, label: 'Cánh Đồng Hoang', lock: 'm4' }],
    spawns: [
      { mob: 'wisp', x1: 120, x2: 2200, y: GROUND_Y, count: 6 },
      { mob: 'wisp', x1: 520, x2: 1300, y: 196, count: 3 },
      { mob: 'fox', x1: 780, x2: 980, y: 252, count: 2 },
      { mob: 'fox', x1: 1380, x2: 2140, y: GROUND_Y, count: 3 },
      { mob: 'fox', x1: 1620, x2: 1820, y: 200, count: 2 },
    ],
  },
  field: {
    name: 'Cánh Đồng Hoang', theme: 'field', width: 2400, minLv: 4,
    platforms: [
      { x: 200, y: 254, w: 220 }, { x: 500, y: 200, w: 180 }, { x: 760, y: 254, w: 240 },
      { x: 1080, y: 200, w: 200 }, { x: 1180, y: 140, w: 160 }, { x: 1400, y: 254, w: 220 },
      { x: 1700, y: 200, w: 200 }, { x: 1980, y: 254, w: 220 },
    ],
    portals: [{ x: 50, to: 'forest', toX: 2200, label: 'Rừng Ma Trơi' }, { x: 1250, to: 'swamp', toX: 70, label: 'Đầm Lầy Sương Mù', lock: 'st4b' }, { x: 2350, to: 'graveyard', toX: 70, label: 'Nghĩa Địa Cổ', lock: 'st5' }],
    spawns: [
      { mob: 'scarecrow', x1: 150, x2: 2300, y: GROUND_Y, count: 6 },
      { mob: 'scarecrow', x1: 760, x2: 1000, y: 254, count: 2 },
      { mob: 'fox', x1: 1080, x2: 1280, y: 200, count: 2 },
      { mob: 'scarecrow', x1: 1400, x2: 1620, y: 254, count: 2 },
      { mob: 'fox', x1: 1700, x2: 1900, y: 200, count: 2 },
    ],
  },
  graveyard: {
    name: 'Nghĩa Địa Cổ', theme: 'graveyard', width: 2500, minLv: 7,
    platforms: [
      { x: 220, y: 254, w: 200 }, { x: 480, y: 198, w: 200 }, { x: 760, y: 254, w: 220 },
      { x: 1040, y: 198, w: 220 }, { x: 1120, y: 138, w: 160 }, { x: 1360, y: 254, w: 220 },
      { x: 1640, y: 198, w: 220 }, { x: 1920, y: 254, w: 240 }, { x: 2000, y: 190, w: 140 },
    ],
    portals: [{ x: 50, to: 'field', toX: 2300, label: 'Cánh Đồng Hoang' }, { x: 2450, to: 'ghost_gate', toX: 80, label: 'Quỷ Môn Quan', lock: 'st6d' },
      { x: 1310, to: 'temple', toX: 80, label: 'Huyền Môn Cổ Tự', req: 'st15', color: '#ff6a7a' }],
    spawns: [
      { mob: 'jiangshi', x1: 150, x2: 2400, y: GROUND_Y, count: 7 },
      { mob: 'jiangshi', x1: 760, x2: 980, y: 254, count: 2 },
      { mob: 'lantern', x1: 480, x2: 1300, y: 190, count: 3 },
      { mob: 'lantern', x1: 1640, x2: 2160, y: 190, count: 3 },
      { mob: 'jiangshi', x1: 1360, x2: 1580, y: 254, count: 2 },
    ],
  },
  ghost_gate: {
    name: 'Quỷ Môn Quan', theme: 'hell', width: 1280, minLv: 11,
    platforms: [
      { x: 160, y: 236, w: 160 }, { x: 960, y: 236, w: 160 }, { x: 560, y: 180, w: 160 },
    ],
    portals: [{ x: 50, to: 'graveyard', toX: 2400, label: 'Nghĩa Địa Cổ' }, { x: 1230, to: 'snow_peak', toX: 80, label: 'Tuyết Sơn', lock: 'st7' }],
    spawns: [{ mob: 'boss', x1: 760, x2: 900, y: GROUND_Y, count: 1 }],
  },

  // ===== Side branch: Swamp (from the Barren Field) =====
  swamp: {
    name: 'Đầm Lầy Sương Mù', theme: 'swamp', width: 2400, minLv: 8,
    platforms: [
      { x: 300, y: 252, w: 180 }, { x: 560, y: 204, w: 160 }, { x: 820, y: 252, w: 200 },
      { x: 1100, y: 200, w: 200 }, { x: 1150, y: 140, w: 150 }, { x: 1420, y: 252, w: 220 },
      { x: 1700, y: 204, w: 180 }, { x: 1960, y: 252, w: 220 }, { x: 2050, y: 150, w: 140 },
    ],
    portals: [{ x: 50, to: 'field', toX: 1250, label: 'Cánh Đồng Hoang' }],
    npcs: [{ id: 'fisherman', x: 190 }],
    spawns: [
      { mob: 'frog', x1: 400, x2: 2300, y: GROUND_Y, count: 6 },
      { mob: 'frog', x1: 820, x2: 1020, y: 252, count: 2 },
      { mob: 'water_ghost', x1: 560, x2: 1300, y: 200, count: 3 },
      { mob: 'water_ghost', x1: 1700, x2: 2200, y: 200, count: 3 },
      { mob: 'frog', x1: 1420, x2: 1640, y: 252, count: 2 },
    ],
  },

  // ===== Beyond the Ghost Gate =====
  snow_peak: {
    name: 'Tuyết Sơn', theme: 'snow', width: 2600, minLv: 14,
    platforms: [
      { x: 380, y: 252, w: 200 }, { x: 640, y: 200, w: 180 }, { x: 900, y: 252, w: 220 },
      { x: 1180, y: 196, w: 220 }, { x: 1260, y: 136, w: 160 }, { x: 1520, y: 252, w: 220 },
      { x: 1800, y: 200, w: 200 }, { x: 2080, y: 252, w: 220 }, { x: 2150, y: 144, w: 160 },
    ],
    portals: [{ x: 50, to: 'ghost_gate', toX: 1180, label: 'Quỷ Môn Quan' }, { x: 2550, to: 'ice_cave', toX: 80, label: 'Huyền Băng Động', lock: 'st9' }],
    npcs: [{ id: 'huntress', x: 200 }],
    spawns: [
      { mob: 'snowfox', x1: 350, x2: 2450, y: GROUND_Y, count: 6 },
      { mob: 'yeti', x1: 900, x2: 2450, y: GROUND_Y, count: 3 },
      { mob: 'snowfox', x1: 640, x2: 820, y: 200, count: 2 },
      { mob: 'yeti', x1: 1520, x2: 1740, y: 252, count: 2 },
      { mob: 'snowfox', x1: 1800, x2: 2000, y: 200, count: 2 },
    ],
  },
  ice_cave: {
    name: 'Huyền Băng Động', theme: 'icecave', width: 2400, minLv: 17,
    platforms: [
      { x: 220, y: 252, w: 200 }, { x: 500, y: 196, w: 200 }, { x: 780, y: 252, w: 220 },
      { x: 1060, y: 196, w: 240 }, { x: 1100, y: 136, w: 160 }, { x: 1380, y: 252, w: 220 },
      { x: 1660, y: 196, w: 220 }, { x: 1940, y: 252, w: 220 }, { x: 2000, y: 140, w: 150 },
    ],
    portals: [{ x: 50, to: 'snow_peak', toX: 2500, label: 'Tuyết Sơn' }, { x: 2350, to: 'volcano', toX: 80, label: 'Hỏa Diệm Sơn', lock: 'st10c' }],
    spawns: [
      { mob: 'golem', x1: 200, x2: 2250, y: GROUND_Y, count: 5 },
      { mob: 'icebat', x1: 500, x2: 1300, y: 196, count: 4 },
      { mob: 'icebat', x1: 1660, x2: 2160, y: 196, count: 3 },
      { mob: 'golem', x1: 780, x2: 1000, y: 252, count: 2 },
      { mob: 'golem', x1: 1380, x2: 1600, y: 252, count: 2 },
    ],
  },
  volcano: {
    name: 'Hỏa Diệm Sơn', theme: 'volcano', width: 2600, minLv: 20,
    platforms: [
      { x: 360, y: 252, w: 200 }, { x: 620, y: 200, w: 180 }, { x: 880, y: 252, w: 220 },
      { x: 1160, y: 196, w: 220 }, { x: 1220, y: 136, w: 150 }, { x: 1500, y: 252, w: 220 },
      { x: 1780, y: 200, w: 220 }, { x: 2060, y: 252, w: 220 }, { x: 2120, y: 146, w: 150 },
    ],
    portals: [{ x: 50, to: 'ice_cave', toX: 2300, label: 'Huyền Băng Động' }, { x: 2550, to: 'qilin_altar', toX: 80, label: 'Kỳ Lân Đài', lock: 'st11c' }],
    npcs: [{ id: 'fire_master', x: 200 }],
    spawns: [
      { mob: 'fire_spirit', x1: 600, x2: 2400, y: 196, count: 5 },
      { mob: 'lava', x1: 400, x2: 2450, y: GROUND_Y, count: 6 },
      { mob: 'lava', x1: 880, x2: 1100, y: 252, count: 2 },
      { mob: 'fire_spirit', x1: 1500, x2: 2300, y: GROUND_Y, count: 3 },
    ],
  },
  qilin_altar: {
    name: 'Kỳ Lân Đài', theme: 'volcano', decor: 'arena', width: 1280, minLv: 22,
    platforms: [
      { x: 160, y: 236, w: 160 }, { x: 960, y: 236, w: 160 }, { x: 560, y: 180, w: 160 },
    ],
    portals: [{ x: 50, to: 'volcano', toX: 2500, label: 'Hỏa Diệm Sơn' }],
    spawns: [{ mob: 'qilin', x1: 740, x2: 900, y: GROUND_Y, count: 1 }],
  },

  // ===== Chapter 3: hidden path in the Old Graveyard =====
  temple: {
    name: 'Huyền Môn Cổ Tự', theme: 'temple', width: 2600, minLv: 24,
    platforms: [
      { x: 360, y: 252, w: 200 }, { x: 620, y: 198, w: 200 }, { x: 900, y: 252, w: 220 },
      { x: 1180, y: 196, w: 240 }, { x: 1240, y: 136, w: 160 }, { x: 1520, y: 252, w: 220 },
      { x: 1800, y: 198, w: 220 }, { x: 2080, y: 252, w: 220 }, { x: 2140, y: 146, w: 150 },
    ],
    portals: [{ x: 50, to: 'graveyard', toX: 1300, label: 'Nghĩa Địa Cổ' }, { x: 2550, to: 'sanctum', toX: 80, label: 'Chính Điện', lock: 'st16b' }],
    npcs: [{ id: 'huntress_temple', x: 170, after: 'st15' }, { id: 'fire_master_temple', x: 250, after: 'st15' }],
    spawns: [
      { mob: 'blood_jiangshi', x1: 380, x2: 2450, y: GROUND_Y, count: 7 },
      { mob: 'maskghost', x1: 620, x2: 1420, y: 190, count: 3 },
      { mob: 'maskghost', x1: 1800, x2: 2300, y: 190, count: 3 },
      { mob: 'blood_jiangshi', x1: 900, x2: 1120, y: 252, count: 2 },
      { mob: 'blood_jiangshi', x1: 1520, x2: 1740, y: 252, count: 2 },
    ],
  },
  sanctum: {
    name: 'Chính Điện', theme: 'temple', decor: 'altar', width: 1280, minLv: 30,
    platforms: [
      { x: 160, y: 236, w: 160 }, { x: 960, y: 236, w: 160 }, { x: 560, y: 180, w: 160 },
    ],
    portals: [{ x: 50, to: 'temple', toX: 2500, label: 'Huyền Môn Cổ Tự' }],
    spawns: [{ mob: 'blood_demon', x1: 760, x2: 900, y: GROUND_Y, count: 1 }],
  },
};

for (const m of Object.values(MAPS)) {
  for (const p of m.platforms) p.y -= LIFT;
  for (const s of m.spawns) if (s.y !== GROUND_Y) s.y -= LIFT;
}
