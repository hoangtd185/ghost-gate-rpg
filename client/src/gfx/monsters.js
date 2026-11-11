// Monsters drawn with curves. Each sheet has one extra "hit" frame (white flash) at the end.
import { WISP_PAL, wisp, FOX_PAL, fox, scarecrow, frog } from './monsters/wild.js';
import { JIANG_PAL, jiangshi, lantern, boss } from './monsters/graveyard.js';
import { yeti, icebat, golem } from './monsters/snow.js';
import { lava, qilin } from './monsters/volcano.js';
import { maskghost, bloodDemon } from './monsters/temple.js';

const monCache = {};

const MAKERS = {
  wisp: () => wisp(), fox: () => fox(), scarecrow, jiangshi: () => jiangshi(), lantern, boss,
  blood_jiangshi: () => jiangshi(JIANG_PAL.blood_jiangshi), maskghost, blood_demon: bloodDemon,
  water_ghost: () => wisp(WISP_PAL.water_ghost), fire_spirit: () => wisp(WISP_PAL.fire_spirit), snowfox: () => fox(FOX_PAL.snowfox),
  frog, yeti, icebat, golem, lava, qilin,
};

export function monsterSheet(id) {
  if (!monCache[id]) monCache[id] = MAKERS[id]();
  return monCache[id];
}
