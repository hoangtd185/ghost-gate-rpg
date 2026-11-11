// Humanoid sprite sheet layout and the walk / run / pose angles of each frame

export const HUM_W = 68, HUM_H = 62, HUM_FEET = 60;

export const SIDE = 10; // room on both sides for long weapons

export const TOP = 6; // room above for hair buns, hats, plumes

// Pose: bob = lower the body, lean = tilt the torso, lf/lb = front/back leg angle,
// a1/a2 = front upper arm / forearm angle (rad, 0 = hanging straight down, positive = forward),
// b1/b2 = back arm, wd = weapon direction (0 = pointing straight ahead), sd = staff direction, eye = eye state,
// tilt = rotate the upper body forward around the hips (rad, used by the run cycle)
export const WALK = [0, 1, 2, 3, 4, 5].map((i) => {
  const p = (i / 6) * Math.PI * 2, s = Math.sin(p);
  return { bob: -Math.abs(s) * 1.1 + 0.6, lean: 0.8, lf: s * 0.6, lb: -s * 0.6, a1: 0.3 - s * 0.2, a2: 1.05, b1: s * 0.45, b2: 0.35, wd: 0.55 + s * 0.08, sd: -1.45, eye: 'open' };
});

// Run: upper body pitched forward, long strides, bent arms pumping opposite to the legs
export const RUN = [0, 1, 2, 3, 4, 5].map((i) => {
  const p = (i / 6) * Math.PI * 2, s = Math.sin(p), c = Math.cos(p);
  return { bob: -Math.abs(s) * 2 + 1.2, lean: 1.5, tilt: 0.32, lf: s * 1.05, lb: -s * 1.05, a1: 0.5 - s * 0.4, a2: 1.15, b1: s * 0.75 - 0.15, b2: 1.3, wd: 1.75 + c * 0.1, sd: -1.68 - s * 0.06, eye: 'focus' };
});

export const POSES = [
  { bob: 0, lean: 0, lf: 0.2, lb: -0.16, a1: 0.32, a2: 1.08, b1: -0.12, b2: 0.35, wd: 0.5, sd: -1.5, eye: 'open' },          // 0 guard stance
  { bob: 0.6, lean: 0, lf: 0.2, lb: -0.16, a1: 0.34, a2: 1.1, b1: -0.1, b2: 0.38, wd: 0.54, sd: -1.47, eye: 'open' },       // 1 breathing
  { bob: 0.3, lean: 0, lf: 0.2, lb: -0.16, a1: 0.33, a2: 1.09, b1: -0.11, b2: 0.36, wd: 0.52, sd: -1.48, eye: 'closed' },   // 2 blink
  ...WALK,                                                                                                                 // 3-8 walk
  { bob: -1.2, lean: 0.6, lf: 0.75, lb: -0.35, a1: 1.1, a2: 0.9, b1: -0.9, b2: 0.6, wd: -0.55, sd: -1.2, eye: 'open', fold: true }, // 9 jump
  { bob: 0.3, lean: -1.2, lf: 0.4, lb: -0.35, a1: -2.3, a2: 0.5, b1: 0.6, b2: 0.5, wd: -2.35, sd: -2.4, eye: 'focus' },      // 10 wind-up
  { bob: 1, lean: 2, lf: 0.6, lb: -0.5, a1: 1.45, a2: 0.12, b1: -0.7, b2: 0.4, wd: 0.12, sd: -0.45, eye: 'focus' },          // 11 slash
  { bob: 0.8, lean: -2, lf: 0.2, lb: -0.4, a1: -0.5, a2: 0.9, b1: -0.9, b2: 0.5, wd: 2.0, sd: -1.95, eye: 'hurt' },          // 12 hit
  { bob: 6, lean: 0, lf: 1.45, lb: 1.35, a1: 0.45, a2: 1.0, b1: 0.3, b2: 0.6, wd: 0.25, sd: -1.15, eye: 'open', sit: true },  // 13 sit
  ...RUN,                                                                                                                  // 14-19 run
];

export const HUM_FRAMES = { idle: [0, 1, 0, 1, 0, 2], walk: [3, 4, 5, 6, 7, 8], jump: [9], atk: [10, 11], hurt: [12], sit: [13], run: [14, 15, 16, 17, 18, 19] };

// Back of the neck in sheet pixels for frame f (where a flowing cape is pinned, see gfx/cape.js)
export function capeAnchor(f) {
  const P = POSES[f] || POSES[0];
  const bodyX = 24.5 + P.lean * 0.6, bodyY = 27.5 + P.bob, hipY = 41 + P.bob;
  let x = bodyX - 2.6, y = bodyY - 0.8;
  if (P.tilt) { // the run cycle pitches the upper body forward around the hips
    const dx = x - bodyX, dy = y - hipY, c = Math.cos(P.tilt), s = Math.sin(P.tilt);
    x = bodyX + dx * c - dy * s; y = hipY + dx * s + dy * c;
  }
  return [x + SIDE, y + TOP];
}
