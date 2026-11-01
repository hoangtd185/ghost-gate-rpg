// Vạn Bảo Các online: the premium shop and Nguyên Bảo (ingots) are owned by the server.
//   { t:'prem', op:'buy', offer, req }  buy an offer (req: the client's request id, a repeat is applied once)
//   { t:'prem', op:'checkin' }           the daily check-in
//   { t:'prem', op:'claim', quest }      ingots for a completed quest (it must be done in the saved character)
// Answer: { t:'prem', op, ok, why?, req?, got?, streak?, quest? }. The balance and the items themselves arrive as
// item changes (chg), like pickups. Kill rewards (chieftains, field bosses) come from mobs.js through `kill`.
import { GAME } from '../../client/src/config.js';
import { killIngots } from '../../client/src/game/premium.js';

const PG = GAME.premium;

export function createPremium({ db, send, pushChanges }) {
  // per-player request budget: PG.opsPerMin, refilled continuously
  const allow = (s) => {
    const now = Date.now();
    s.premTokens = Math.min(PG.opsPerMin, (s.premTokens ?? PG.opsPerMin) + ((now - (s.premAt || now)) / 60000) * PG.opsPerMin);
    s.premAt = now;
    if (s.premTokens < 1) return false;
    s.premTokens -= 1; return true;
  };
  const reply = (s, op, res, extra = {}) => {
    if (res.ok) pushChanges(s);
    send(s, { t: 'prem', op, ok: !!res.ok, ...(res.ok ? {} : { why: res.why }), ...extra, ...(res.got ? { got: res.got } : {}), ...(res.streak ? { streak: res.streak } : {}) });
  };

  return {
    handle(s, m) {
      const op = String(m.op || '');
      if (!allow(s)) return send(s, { t: 'prem', op, ok: false, why: 'rate', req: m.req });
      if (op === 'buy') {
        const req = String(m.req || '').slice(0, 40);
        if (!/^[a-z0-9]{6,40}$/i.test(req)) return send(s, { t: 'prem', op, ok: false, why: 'req' });
        reply(s, op, db.premiumBuy(s.id, String(m.offer || ''), `prem:${s.id}:${req}`), { req, offer: String(m.offer || '') });
      } else if (op === 'checkin') {
        reply(s, op, db.checkin(s.id));
      } else if (op === 'claim') {
        const quest = String(m.quest || '').slice(0, 30);
        reply(s, op, db.claimQuest(s.id, quest), { quest });
      }
    },

    // A shared monster died; group: the players of the top damage group (each party member gets them)
    kill(players, m) {
      const n = killIngots(m);
      if (!n) return;
      const key = `kill:${Date.now().toString(36)}:${m.uid}`; // monster uids restart with each map simulation
      for (const s of players) {
        const r = db.grantIngots(s.id, n, 'kill', m.id, `${key}:${s.id}`);
        if (r && !r.dup) { pushChanges(s); send(s, { t: 'prem', op: 'kill', ok: true, got: n, mob: m.id, named: m.named || null, chief: !!m.chief }); }
      }
    },
  };
}
