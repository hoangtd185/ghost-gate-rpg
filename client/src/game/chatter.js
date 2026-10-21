// Chọn câu thoại NPC theo ngữ cảnh, không lặp lại câu vừa nói
import { CHATTER, BANTER } from '../data/chatter.js';
import { CLASSES } from '../data/classes.js';
import { STAT_NAMES } from '../data/items.js';
import { questStatus, entryName, lineVisible } from './character.js';

export function isNight() {
  const h = new Date().getHours();
  return h >= 19 || h < 5;
}

// Kiểm tra điều kiện của một câu thoại
export function condOK(ch, c) {
  if (!c) return true;
  if (c.a && questStatus(ch, c.a) !== 'done') return false;
  if (c.b && questStatus(ch, c.b) === 'done') return false;
  if (c.lv && (ch.level < c.lv[0] || ch.level > c.lv[1])) return false;
  if (c.cls && ch.cls !== c.cls) return false;
  if (c.night !== undefined && isNight() !== c.night) return false;
  if (c.pet !== undefined && !!ch.pet !== c.pet) return false;
  if (c.title && !ch.title) return false;
  if (c.weapon && !ch.equip.weapon) return false;
  if (c.enh && (!ch.equip.weapon || (ch.equip.weapon.e || 0) < c.enh)) return false;
  if (c.gem && !Object.values(ch.equip).some((e) => e && e.g && e.g.length)) return false;
  if (c.flag && !lineVisible(ch, c.flag)) return false;
  return true;
}

// Chèn tên người chơi, môn phái… vào câu thoại
export function fillText(text, ch) {
  const c = CLASSES[ch.cls];
  return text
    .replace(/\{name\}/g, ch.name)
    .replace(/\{cls\}/g, c.name)
    .replace(/\{main\}/g, STAT_NAMES[c.main])
    .replace(/\{title\}/g, ch.title || '')
    .replace(/\{lv\}/g, ch.level)
    .replace(/\{weapon\}/g, ch.equip.weapon ? entryName(ch.equip.weapon) : 'Binh khí');
}

const norm = (x) => (Array.isArray(x) ? x : [x, null]);

// "Túi" câu thoại: rút hết các câu hợp lệ rồi mới quay lại câu cũ
const recent = {};
function pickFrom(key, pool, ch) {
  const ok = pool.map(norm).filter(([, c]) => condOK(ch, c)).map(([t]) => t);
  if (!ok.length) return null;
  // câu có điều kiện được ưu tiên hơn câu chung (đúng ngữ cảnh hơn)
  const special = pool.map(norm).filter(([, c]) => c && condOK(ch, c)).map(([t]) => t);
  const used = recent[key] || (recent[key] = []);
  let cand = ok.filter((t) => !used.includes(t));
  if (!cand.length) { used.length = 0; cand = ok; }
  const fresh = special.filter((t) => cand.includes(t));
  const t = fresh.length && Math.random() < 0.6 ? fresh[Math.floor(Math.random() * fresh.length)] : cand[Math.floor(Math.random() * cand.length)];
  used.push(t);
  if (used.length > Math.max(2, ok.length - 1)) used.shift();
  return fillText(t, ch);
}

// kind: 'lines' | 'greet' | 'hi'
export function npcLine(ch, npcId, kind) {
  const d = CHATTER[npcId];
  if (!d || !d[kind]) return null;
  return pickFrom(npcId + ':' + kind, d[kind], ch);
}

// Chọn một đoạn NPC nói chuyện với nhau trên bản đồ, đủ người có mặt
const banterUsed = [];
export function pickBanter(ch, mapId, presentIds) {
  const ok = BANTER.filter((b) => b.map === mapId && condOK(ch, b.when) && b.lines.every(([id]) => presentIds.includes(id)));
  if (!ok.length) return null;
  let cand = ok.filter((b) => !banterUsed.includes(b));
  if (!cand.length) { banterUsed.length = 0; cand = ok; }
  const b = cand[Math.floor(Math.random() * cand.length)];
  banterUsed.push(b);
  return b.lines.map(([id, t]) => [id, fillText(t, ch)]);
}
