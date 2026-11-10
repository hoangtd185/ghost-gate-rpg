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
      { id: 'yangak_keeper', x: 1080 }, // server event Xâm Lăng Dương Ác
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


// ===== Server event "Xâm Lăng Dương Ác" (Invasion of Yangak, data/dungeons.js). Added after the shift above:
// coordinates are final. Each run picks its floors at random from the pools in data/dungeons.js.
// dungeon: which event the floor belongs to (only reachable through it, see server/src/dungeon.js)
// goal: 'reach' (get to the exit) | 'clear' (kill every monster) | 'break' (destroy the `targets`) | 'boss' (kill everything)
// exit: { x, y } the gate to the next floor, standing on surface y · noRespawn: dead monsters stay dead
// traps: see game/traps.js
const portalOut = { x: 40, to: 'village', toX: 1080, label: 'Rời ải' };
const ygFloor = (m) => ({ minLv: 12, dungeon: 'yangak', noRespawn: true, spawnX: 90, portals: [portalOut], spawns: [], traps: [], ...m });
const teethGates = [0, 1, 2, 4, 5, 6, 8, 9, 10]; // every fourth gate (3, 7, 11) is a safe zone
Object.assign(MAPS, {
  // ----- Phase 1 -----
  // Stone steps up to a gate at the top while rocks fall from the ceiling
  yg_jump: ygFloor({
    name: 'Dương Ác · Bậc Đá Rơi', theme: 'hell', width: 1280, goal: 'reach',
    platforms: [{ x: 170, y: 252, w: 100 }, { x: 320, y: 208, w: 100 }, { x: 470, y: 164, w: 100 }, { x: 620, y: 122, w: 110 }, { x: 790, y: 164, w: 100 }, { x: 940, y: 122, w: 100 }, { x: 1090, y: 84, w: 130 }],
    exit: { x: 1160, y: 84 },
    traps: [
      { kind: 'drop', x: 345, w: 40, period: 2.4, fall: 0.9 },
      { kind: 'drop', x: 495, w: 40, period: 2.4, fall: 0.9, offset: 0.8 },
      { kind: 'drop', x: 655, w: 40, period: 2.4, fall: 0.9, offset: 1.6 },
      { kind: 'drop', x: 820, w: 40, period: 2.8, fall: 0.9, offset: 0.4 },
      { kind: 'drop', x: 965, w: 40, period: 2.8, fall: 0.9, offset: 1.8 },
      { kind: 'drop', x: 1130, w: 40, period: 3, fall: 1, offset: 1 },
    ],
  }),
  // White spear demons: kill them all to open the way
  yg_white: ygFloor({
    name: 'Dương Ác · Bạch Thương Trận', theme: 'graveyard', width: 1500, goal: 'clear',
    platforms: [{ x: 300, y: 240, w: 170 }, { x: 650, y: 190, w: 170 }, { x: 1000, y: 240, w: 170 }],
    exit: { x: 1440, y: GROUND_Y },
    spawns: [{ mob: 'yg_spearman', x1: 250, x2: 1350, y: GROUND_Y, count: 6 }, { mob: 'yg_spearman', x1: 650, x2: 820, y: 190, count: 2 }],
    traps: [{ kind: 'spikes', x: 560, y: GROUND_Y, w: 70, period: 3, up: 1 }, { kind: 'spikes', x: 900, y: GROUND_Y, w: 70, period: 3, up: 1, offset: 1.5 }],
  }),
  // An iron door blocks the way: break it (faster together). Black dust drifts around; climbing the pillar skips them.
  yg_door: ygFloor({
    name: 'Dương Ác · Hắc Trần Môn', theme: 'temple', width: 1400, goal: 'break', targets: ['yg_door'],
    platforms: [{ x: 500, y: 240, w: 80 }, { x: 560, y: 186, w: 80 }, { x: 620, y: 132, w: 80 }, { x: 760, y: 132, w: 260 }],
    exit: { x: 1330, y: GROUND_Y },
    spawns: [{ mob: 'yg_door', x1: 1160, x2: 1160, y: GROUND_Y, count: 1 }, { mob: 'yg_dust', x1: 250, x2: 1100, y: GROUND_Y, count: 5 }],
  }),
  // A maze of rolling fireballs: one touch nearly kills
  yg_fireballs: ygFloor({
    name: 'Dương Ác · Hỏa Cầu Mê Lộ', theme: 'volcano', width: 1500, goal: 'reach',
    platforms: [{ x: 300, y: 236, w: 300 }, { x: 700, y: 196, w: 300 }, { x: 1100, y: 236, w: 250 }],
    exit: { x: 1440, y: GROUND_Y },
    traps: [
      { kind: 'fireball', x: 220, y: GROUND_Y, w: 1180, period: 4.5 },
      { kind: 'fireball', x: 220, y: GROUND_Y, w: 1180, period: 4.5, offset: 1.5 },
      { kind: 'fireball', x: 220, y: GROUND_Y, w: 1180, period: 4.5, offset: 3 },
      { kind: 'fireball', x: 300, y: 236, w: 300, period: 2.6 },
      { kind: 'fireball', x: 700, y: 196, w: 300, period: 2.6, offset: 1.3 },
      { kind: 'fireball', x: 1100, y: 236, w: 250, period: 2.2, offset: 0.6 },
    ],
  }),
  // Phase 1 boss: the Armored Gate. Lasers sweep the ledges (a glint first), gas spills near the gate, and
  // unblockable spears rise from the floor: jump to a ledge.
  yg_gate: ygFloor({
    name: 'Dương Ác · Thiết Giáp Môn', theme: 'hell', width: 1280, goal: 'boss',
    platforms: [{ x: 200, y: 236, w: 150 }, { x: 450, y: 180, w: 150 }, { x: 700, y: 236, w: 150 }, { x: 450, y: 124, w: 150 }],
    exit: { x: 1220, y: GROUND_Y },
    spawns: [{ mob: 'yg_gate', x1: 1020, x2: 1020, y: GROUND_Y, count: 1 }],
    traps: [
      { kind: 'laser', x: 200, y: 236, w: 150, period: 5, up: 0.9 },
      { kind: 'laser', x: 450, y: 180, w: 150, period: 5, up: 0.9, offset: 1.7 },
      { kind: 'laser', x: 700, y: 236, w: 150, period: 5, up: 0.9, offset: 3.3 },
      { kind: 'laser', x: 450, y: 124, w: 150, period: 5, up: 0.9, offset: 2.5 },
      { kind: 'gas', x: 870, y: GROUND_Y, w: 150, h: 90, period: 6, up: 3 },
      { kind: 'spikes', x: 110, y: GROUND_Y, w: 760, period: 7, up: 1.5, offset: 2, dmg: 0.9 },
    ],
  }),
  // ----- Phase 2 -----
  // Monster nursery: rows of teeth snap shut from above (some nearly kill, some bite less), green gas slows,
  // every fourth gate is safe
  yg_teeth: ygFloor({
    name: 'Dương Ác · Ấu Quỷ Sào', theme: 'temple', width: 1700, goal: 'reach',
    platforms: [],
    exit: { x: 1640, y: GROUND_Y },
    traps: [
      ...teethGates.map((i) => ({ kind: 'teeth', x: 200 + i * 125, y: GROUND_Y, w: 50, h: 130, period: 3.2, up: 1, offset: i * 0.45, dmg: i % 2 ? 0.9 : 0.35 })),
      { kind: 'gas', x: 640, y: GROUND_Y, w: 110, h: 70, period: 4, up: 2, slow: true },
      { kind: 'gas', x: 1140, y: GROUND_Y, w: 110, h: 70, period: 4, up: 2, offset: 2, slow: true },
    ],
  }),
  // Hatchery: smash every egg and the half-silver men that guard them
  yg_hatchery: ygFloor({
    name: 'Dương Ác · Noãn Sào', theme: 'swamp', width: 1400, goal: 'clear',
    platforms: [{ x: 300, y: 240, w: 160 }, { x: 650, y: 190, w: 160 }, { x: 1000, y: 240, w: 160 }],
    exit: { x: 1340, y: GROUND_Y },
    spawns: [
      { mob: 'yg_egg', x1: 250, x2: 1250, y: GROUND_Y, count: 4 },
      { mob: 'yg_egg', x1: 650, x2: 800, y: 190, count: 2 },
      { mob: 'yg_halfman', x1: 300, x2: 1250, y: GROUND_Y, count: 4 },
    ],
  }),
  // Climb to the Blue Flame Core at the top and destroy it
  yg_core: ygFloor({
    name: 'Dương Ác · Lam Hỏa Tâm', theme: 'icecave', width: 1280, goal: 'break', targets: ['yg_core'],
    platforms: [{ x: 150, y: 250, w: 110 }, { x: 300, y: 206, w: 110 }, { x: 450, y: 162, w: 110 }, { x: 300, y: 118, w: 110 }, { x: 470, y: 76, w: 220 }],
    exit: { x: 1220, y: GROUND_Y },
    spawns: [{ mob: 'yg_core', x1: 570, x2: 570, y: 76, count: 1 }, { mob: 'water_ghost', x1: 300, x2: 900, y: 162, count: 3 }],
    traps: [{ kind: 'drop', x: 330, w: 40, period: 3, fall: 1 }, { kind: 'drop', x: 480, w: 40, period: 3, fall: 1, offset: 1.5 }],
  }),
  // Demon pillars with huge health that keep calling poisonous black dust: break all three
  yg_pillars: ygFloor({
    name: 'Dương Ác · Quỷ Trụ', theme: 'graveyard', width: 1500, goal: 'break', targets: ['yg_pillar'],
    platforms: [{ x: 600, y: 230, w: 120 }, { x: 950, y: 230, w: 120 }],
    exit: { x: 1440, y: GROUND_Y },
    spawns: [{ mob: 'yg_pillar', x1: 450, x2: 450, y: GROUND_Y, count: 1 }, { mob: 'yg_pillar', x1: 820, x2: 820, y: GROUND_Y, count: 1 }, { mob: 'yg_pillar', x1: 1190, x2: 1190, y: GROUND_Y, count: 1 }],
  }),
  // Spinning fire wheels that appear and vanish: a touch takes 90% of your health
  yg_wheels: ygFloor({
    name: 'Dương Ác · Hỏa Luân Trận', theme: 'volcano', width: 1600, goal: 'reach',
    platforms: [{ x: 380, y: 230, w: 160 }, { x: 760, y: 200, w: 160 }, { x: 1140, y: 230, w: 160 }],
    exit: { x: 1540, y: GROUND_Y },
    traps: [
      ...[260, 600, 980, 1340].map((x, i) => ({ kind: 'wheel', x, y: GROUND_Y, w: 40, period: 3, up: 1.6, offset: i * 0.75 })),
      ...[440, 820, 1200].map((x, i) => ({ kind: 'wheel', x, y: [230, 200, 230][i], w: 40, period: 3.4, up: 1.6, offset: 1.5 + i * 0.6 })),
    ],
  }),
  // ----- Before the end: stone giants, then the Silver Guard -----
  yg_giants: ygFloor({
    name: 'Dương Ác · Thạch Cự Nhân', theme: 'icecave', width: 1400, goal: 'clear',
    platforms: [{ x: 350, y: 236, w: 160 }, { x: 850, y: 236, w: 160 }],
    exit: { x: 1340, y: GROUND_Y },
    spawns: [{ mob: 'yg_giant', x1: 300, x2: 1250, y: GROUND_Y, count: 5 }],
  }),
  yg_silver: ygFloor({
    name: 'Dương Ác · Ngân Vệ Tướng', theme: 'temple', decor: 'altar', width: 1280, goal: 'boss',
    platforms: [{ x: 160, y: 220, w: 160 }, { x: 960, y: 220, w: 160 }, { x: 560, y: 164, w: 160 }],
    exit: { x: 1220, y: GROUND_Y },
    spawns: [{ mob: 'yg_silver', x1: 760, x2: 900, y: GROUND_Y, count: 1 }],
    traps: [{ kind: 'spikes', x: 330, y: GROUND_Y, w: 80, period: 4, up: 1.2 }, { kind: 'spikes', x: 840, y: GROUND_Y, w: 80, period: 4, up: 1.2, offset: 2 }],
  }),
});
