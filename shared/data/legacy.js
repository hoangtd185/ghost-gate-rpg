// Old (pre-English) ids -> current ids. Used to migrate saves made before the rename.
export const LEGACY_CLS = { kiem: 'swordsman', dao: 'taoist', thich: 'assassin' };
export const LEGACY_EL = { hoa: 'fire', bang: 'ice', loi: 'thunder', doc: 'poison' };
export const LEGACY_MAP = {
  lang: 'village', rung: 'forest', dong: 'field', dam: 'swamp', nghiadia: 'graveyard', quymon: 'ghost_gate',
  tuyetson: 'snow_peak', bangdong: 'ice_cave', hoason: 'volcano', kylan: 'qilin_altar', cotu: 'temple', chinhdien: 'sanctum',
};
export const LEGACY_PET = { tieuquy: 'imp' };
export const LEGACY_QUEST = { q_shuigui: 'q_water_ghost' };

const SKILL_PREFIX = { k_: 'sw_', d_: 'ta_', t_: 'as_' };
const SKILL_NAMES = /^(k_(basic|combo|wave|guard|p[1-4])|d_(basic|thunder|fire|heal|p[1-4])|t_(basic|triple|dash|poison|p[1-4]))$/;
const SKILL_RENAME = { ta_heal: 'ta_orbs' }; // the Taoist heal was replaced by homing thunder orbs
export function legacySkill(id) {
  const out = SKILL_NAMES.test(id) ? SKILL_PREFIX[id.slice(0, 2)] + id.slice(2) : id;
  return SKILL_RENAME[out] || out;
}

const ITEM_RENAME = {
  hat_huyetsat: 'hat_blood_helm', arm_huyenmon: 'arm_sect_robe', acc_wuxing: 'acc_five_elements',
  out_matroi: 'out_wisp_hood', out_holy: 'out_fox', out_haclong: 'out_black_dragon', out_tienlien: 'out_jade_lotus',
  out_nghethuong: 'out_rainbow_fairy', out_daohoa: 'out_peach_fairy', out_bachho: 'out_white_fox',
  out_phuongvu: 'out_phoenix', out_huyetnguyet: 'out_blood_moon',
};
export function legacyItem(id) {
  if (typeof id !== 'string') return id;
  if (ITEM_RENAME[id]) return ITEM_RENAME[id];
  let m = /^w_(kiem|dao|thich)(\d+)$/.exec(id);
  if (m) return `w_${LEGACY_CLS[m[1]]}${m[2]}`;
  m = /^orb_(hoa|bang|loi|doc)$/.exec(id);
  if (m) return `orb_${LEGACY_EL[m[1]]}`;
  return id;
}
const renameKeys = (obj, fn) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) out[fn(k)] = v;
  return out;
};
const legacyStat = (k) => (/^r_(hoa|bang|loi|doc)$/.test(k) ? `res_${LEGACY_EL[k.slice(2)]}` : k);
const fixEntry = (e) => {
  if (!e || typeof e !== 'object') return e;
  e.id = legacyItem(e.id);
  if (e.el && LEGACY_EL[e.el]) e.el = LEGACY_EL[e.el];
  if (e.b) e.b = renameKeys(e.b, legacyStat);
  return e;
};

// Rewrites a stored character in place so that every id uses the current names. Safe to run repeatedly.
export function migrateLegacy(ch) {
  if (!ch || typeof ch !== 'object') return ch;
  if (LEGACY_CLS[ch.cls]) ch.cls = LEGACY_CLS[ch.cls];
  if (LEGACY_MAP[ch.map]) ch.map = LEGACY_MAP[ch.map];
  if (ch.pet && LEGACY_PET[ch.pet.id]) ch.pet.id = LEGACY_PET[ch.pet.id];
  if (ch.skills) ch.skills = renameKeys(ch.skills, legacySkill);
  if (Array.isArray(ch.inventory)) ch.inventory.forEach(fixEntry);
  if (ch.equip) for (const k of Object.keys(ch.equip)) fixEntry(ch.equip[k]);
  if (ch.quests) ch.quests = renameKeys(ch.quests, (k) => LEGACY_QUEST[k] || k);
  return ch;
}
