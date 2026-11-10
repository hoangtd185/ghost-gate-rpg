// Server events in the style of Ghost Online's "Invasion of Yangak": at set times (GAME.dungeon.schedule) a gate
// opens and every player on the server who joins runs the same instance together, floor after floor, up to a final
// boss. Floors are maps in data/maps.js with `dungeon` set; each run picks its floors from the phases below.
// The server ranks everyone by damage dealt; all participants get a reward (win or lose), the top 10 get more.
// Offline the keeper offers a practice run of the same floors (no rewards).
//   from: the map the keeper stands on (also where players come back to) · npc: the keeper (data/npcs.js)
//   lv: minimum level · phases: in order; { pick: n, pool: [...], first? } takes n floors at random (first, if set,
//   always opens the phase), { fixed: [...] } takes all of them in order
//   rewards: all (every participant) · win (extra when the final boss falls) · top (by damage rank, the first tier
//   whose upTo >= the rank). expShare = a share of the EXP needed for the player's next level
export const DUNGEONS = {
  yangak: {
    name: 'Xâm Lăng Dương Ác', lv: 12, from: 'village', npc: 'yangak_keeper',
    phases: [
      { pick: 3, first: 'yg_jump', pool: ['yg_jump', 'yg_white', 'yg_door', 'yg_fireballs'] },
      { fixed: ['yg_gate'] },
      { pick: 3, pool: ['yg_teeth', 'yg_hatchery', 'yg_core', 'yg_pillars', 'yg_wheels'] },
      { fixed: ['yg_giants', 'yg_silver'] },
    ],
    rewards: {
      all: { expShare: 0.25, items: [['stone', 2], ['hp_l', 5]] },
      win: { expShare: 0.25, items: [['GEM2', 1], ['mat_dew', 1]] },
      top: [
        { upTo: 1, items: [['out_black_dragon', 1], ['GEM3', 1], ['protect', 3]] },
        { upTo: 3, items: [['GEM3', 1], ['mat_dew', 2], ['protect', 2]] },
        { upTo: 10, items: [['GEM2', 2], ['protect', 1]] },
      ],
    },
  },
};

// Every floor a dungeon can use (for checks and practice runs)
export const dungeonFloors = (d) => [...new Set(d.phases.flatMap((p) => p.fixed || p.pool))];

// The floors of one run, in order. rnd: a random function (Math.random by default)
export function rollFloors(d, rnd = Math.random) {
  const out = [];
  for (const p of d.phases) {
    if (p.fixed) { out.push(...p.fixed); continue; }
    const pool = p.pool.filter((f) => f !== p.first);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    out.push(...(p.first ? [p.first] : []), ...pool.slice(0, p.pick - (p.first ? 1 : 0)));
  }
  return out;
}

// The reward tier of a damage rank (1-based), or null
export const rankTier = (d, rank) => d.rewards.top.find((t) => rank <= t.upTo) || null;

// The event window that is open at `now`, or the next one: { start, end, open } in ms (null if none within a week).
// s = GAME.dungeon.schedule: weekdays and wall-clock time in UTC+utcOffset.
export function eventWindow(now, s) {
  const off = s.utcOffset * 3600e3, dur = s.durationMin * 60e3;
  const local = new Date(now + off); // read with the UTC getters, this is the wall clock in the event's time zone
  for (let d = -1; d <= 7; d++) {
    const day = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + d, s.hour, s.minute));
    if (!s.days.includes(day.getUTCDay())) continue;
    const start = day.getTime() - off, end = start + dur;
    if (end > now) return { start, end, open: start <= now };
  }
  return null;
}
