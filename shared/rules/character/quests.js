// Character rules: quest state, progress, markers and visibility of NPC lines
import { QUESTS, NPCS } from '../../data/npcs.js';
import { todayKey } from './entries.js';
import { countItem } from './inventory.js';

// ===== Quests =====
// locked | available | active | ready | done
export function questStatus(ch, qid) {
  const q = QUESTS[qid];
  const st = ch.quests[qid];
  if (st && st.s === 'done') {
    if (!q.daily || st.day === todayKey()) return 'done';
    // a daily quest from a previous day: can be taken again
    if (ch.level < q.lv) return 'locked';
    return 'available';
  }
  if (st && st.s === 'active') {
    const prog = q.type === 'collect' ? countItem(ch, q.target) : st.p;
    return prog >= q.count ? 'ready' : 'active';
  }
  if (q.requires && questStatus(ch, q.requires) !== 'done') return 'locked';
  if (q.needFlag && !lineVisible(ch, q.needFlag)) return 'locked'; // a branch of a world quest chain ('key=value' story flag)
  if (ch.level < q.lv) return 'locked';
  return 'available';
}

export function questProgress(ch, qid) {
  const q = QUESTS[qid];
  const st = ch.quests[qid];
  if (!st) return 0;
  if (st.s === 'done') return q.count;
  return Math.min(q.count, q.type === 'collect' ? countItem(ch, q.target) : st.p);
}

// NPC that takes the turn-in: "go meet" quests hand in to the person to meet, others to turnIn or the giver
export function questTurnIn(q) {
  return q.type === 'talk' ? q.target : (q.turnIn || q.npc);
}

// Quest items dropped by monsters while a quest that needs them is active
export function questDropsFor(ch, mobId) {
  const out = [];
  for (const [qid, st] of Object.entries(ch.quests)) {
    const q = QUESTS[qid];
    if (!q || !q.drop || st.s !== 'active' || q.drop.mob !== mobId) continue;
    if (countItem(ch, q.drop.item) >= q.count) continue;
    if (Math.random() < q.drop.chance) out.push(q.drop.item);
  }
  return out;
}

// Marker above an NPC: '?' something to hand in, '!' new quest available, null if nothing
export function npcMarker(ch, npcId) {
  for (const qid of Object.keys(ch.quests)) {
    const q = QUESTS[qid];
    if (!q) continue;
    const s = questStatus(ch, qid);
    if (questTurnIn(q) !== npcId) continue;
    if (s === 'ready' || (s === 'active' && q.type === 'talk')) return '?';
  }
  const npc = NPCS[npcId];
  const avail = (npc.quests || []).filter((qid) => questStatus(ch, qid) === 'available').map((qid) => QUESTS[qid]);
  if (avail.some((q) => q.cat === 'main')) return '!!';
  if (avail.some((q) => q.cat === 'tut')) return '!t';
  if (avail.some((q) => q.cat === 'world')) return '!w';
  if (avail.length) return '!';
  return null;
}

// Action events for tutorial quests (type 'act'): djump, potion, buy, stat, skillup, enhance, socket, fuse, orb, daily
export function questEvent(ch, name, n = 1) {
  const changed = [];
  for (const [qid, st] of Object.entries(ch.quests)) {
    const q = QUESTS[qid];
    if (q && st.s === 'active' && q.type === 'act' && q.target === name && st.p < q.count) {
      st.p = Math.min(q.count, st.p + n);
      changed.push(qid);
    }
  }
  return changed;
}

// Condition of a dialogue line: 'bell=ring' → flag bell must be ring
export function lineVisible(ch, cond) {
  if (!cond) return true;
  const [k, v] = cond.split('=');
  return (ch.flags || {})[k] === v;
}

// Whether an NPC is standing on the map (depends on story progress)
export function npcPresent(ch, entry) {
  if (entry.after && questStatus(ch, entry.after) !== 'done') return false;
  if (entry.from && !ch.quests[entry.from]) return false; // appears once that quest is accepted
  if (entry.gone && questStatus(ch, entry.gone) === 'done') return false; // leaves once that quest is done
  if (entry.until && ch.quests[entry.until]) return false;
  if (entry.hideWhile) { const s = questStatus(ch, entry.hideWhile); if (s === 'active' || s === 'ready') return false; }
  return true;
}

export function onKillForQuests(ch, mobId) {
  const changed = [];
  for (const [qid, st] of Object.entries(ch.quests)) {
    const q = QUESTS[qid];
    if (st.s === 'active' && q.type === 'kill' && q.target === mobId && st.p < q.count) {
      st.p++;
      changed.push(qid);
    }
  }
  return changed;
}
