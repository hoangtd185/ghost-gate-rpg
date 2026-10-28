// Parties (tổ đội). Members on the same map split a monster's EXP evenly and each gets their own drops
// (see rewardKill in mobs.js). A party lives while its members are online; leaving or disconnecting removes you,
// and the next member becomes leader. One party per player.
//   party_invite {to} · party_answer {from, yes} · party_leave
//   -> party_ask {from, name} · party_state {id, leader, members: [{id, name, lv, map}]} (null when not in a party) · party_err {why}
import crypto from 'node:crypto';
import { GAME } from '../../client/src/config.js';

const P = GAME.net.party;

export function createParties({ players, send }) {
  const parties = new Map(); // party id -> { id, leader, members: Set<charId> }
  const byChar = new Map(); // charId -> party id
  const invites = new Map(); // invited charId -> { from, until }

  const partyOf = (charId) => parties.get(byChar.get(charId)) || null;
  const view = (pt) => ({
    id: pt.id, leader: pt.leader,
    members: [...pt.members].map((id) => { const s = players.get(id); return { id, name: s?.name || '?', lv: s?.ch?.level || 0, map: s?.map || null }; }),
  });
  const broadcast = (pt) => { const v = view(pt); for (const id of pt.members) { const s = players.get(id); if (s) send(s, { t: 'party_state', party: v }); } };

  function remove(charId) {
    const pt = partyOf(charId);
    if (!pt) return;
    pt.members.delete(charId); byChar.delete(charId);
    const s = players.get(charId);
    if (s) send(s, { t: 'party_state', party: null });
    if (pt.members.size <= 1) { // a party of one is no party
      for (const id of pt.members) { byChar.delete(id); const o = players.get(id); if (o) send(o, { t: 'party_state', party: null }); }
      parties.delete(pt.id);
      return;
    }
    if (pt.leader === charId) pt.leader = pt.members.values().next().value;
    broadcast(pt);
  }

  function invite(s, m) {
    const target = players.get(String(m.to || ''));
    if (!target || target === s) return send(s, { t: 'party_err', why: 'nobody' });
    if (target.map !== s.map || Math.abs(target.x - s.x) > P.inviteRange) return send(s, { t: 'party_err', why: 'far' });
    if (partyOf(target.id)) return send(s, { t: 'party_err', why: 'has_party', name: target.name });
    const mine = partyOf(s.id);
    if (mine && mine.leader !== s.id) return send(s, { t: 'party_err', why: 'not_leader' });
    if (mine && mine.members.size >= P.maxSize) return send(s, { t: 'party_err', why: 'full' });
    invites.set(target.id, { from: s.id, until: Date.now() + P.inviteTimeoutSec * 1000 });
    send(target, { t: 'party_ask', from: s.id, name: s.name });
    send(s, { t: 'party_err', why: 'invited', name: target.name });
  }

  function answer(s, m) {
    const inv = invites.get(s.id);
    invites.delete(s.id);
    const from = inv && inv.from === String(m.from || '') && inv.until > Date.now() ? players.get(inv.from) : null;
    if (!from) return send(s, { t: 'party_err', why: 'expired' });
    if (!m.yes) return send(from, { t: 'party_err', why: 'declined', name: s.name });
    if (partyOf(s.id)) return send(s, { t: 'party_err', why: 'has_party', name: s.name });
    let pt = partyOf(from.id);
    if (!pt) {
      pt = { id: crypto.randomBytes(4).toString('hex'), leader: from.id, members: new Set([from.id]) };
      parties.set(pt.id, pt); byChar.set(from.id, pt.id);
    }
    if (pt.members.size >= P.maxSize) return send(s, { t: 'party_err', why: 'full' });
    pt.members.add(s.id); byChar.set(s.id, pt.id);
    broadcast(pt);
  }

  return {
    handle(s, m) {
      if (m.t === 'party_invite') invite(s, m);
      else if (m.t === 'party_answer') answer(s, m);
      else if (m.t === 'party_leave') remove(s.id);
    },
    leave: remove,
    partyOf,
    // a member changed map or level: refresh what the party sees
    touch(charId) { const pt = partyOf(charId); if (pt) broadcast(pt); },
  };
}
