// Simplified five elements: 4 elements. Monsters have resistances (res) per element:
//   res > 0 = resistant (takes less damage), res < 0 = weak (takes more).
// Players get resistance from gear (res_fire, res_ice, ... in %).
export const ELEMENTS = {
  fire: { name: 'Hỏa', color: '#ff7a3a', glyph: '火' },
  ice: { name: 'Băng', color: '#8fd8ff', glyph: '冰' },
  thunder: { name: 'Lôi', color: '#ffe066', glyph: '雷' },
  poison: { name: 'Độc', color: '#8fe06a', glyph: '毒' },
};
export const ELEMENT_IDS = ['fire', 'ice', 'thunder', 'poison'];
export const MAX_RES = 75; // player's resistance cap (%)

// Damage multiplier when hitting a monster with resistance table `res`
export function elementMult(el, res) {
  if (!el || !res || res[el] === undefined) return 1;
  return 1 - res[el];
}
