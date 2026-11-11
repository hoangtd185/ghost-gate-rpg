// Background canvas helpers, view size and the colour theme of each map
import { makeHi } from '../draw.js';

// Backgrounds are drawn at double resolution for sharpness
export const BG_S = 2;

export const bgCanvas = (w, h) => makeHi(w, h, BG_S);

export function drawLayer(ctx, img, x) { ctx.drawImage(img, x, 0, img.width / BG_S, img.height / BG_S); }

export const VIEW_W = 640, VIEW_H = 360;

export const THEMES = {
  village: { sky: ['#1b1838', '#3d2d5c', '#8a4d6a'], moon: '#ffe9c4', far: '#2b2a4f', mid: '#1c2a2e', ground: '#5a4232', grass: '#4f7a3a', plat: 'wood', fog: 'rgba(255,200,220,0.06)' },
  forest: { sky: ['#07141a', '#0f2a2e', '#1f4a44'], moon: '#d8fff0', far: '#0f2a2a', mid: '#0a1c1c', ground: '#3a3024', grass: '#2f6a42', plat: 'wood', fog: 'rgba(120,255,220,0.07)' },
  field: { sky: ['#1a0f1a', '#5a2a2a', '#c4683a'], moon: '#ffd08a', far: '#3a1f24', mid: '#24141a', ground: '#6a4a2a', grass: '#8a7a3a', plat: 'straw', fog: 'rgba(255,170,90,0.07)' },
  graveyard: { sky: ['#06070f', '#141a2e', '#2e3a52'], moon: '#e8f0ff', far: '#151a2a', mid: '#0c0f1a', ground: '#3a3a40', grass: '#3a4a3a', plat: 'stone', fog: 'rgba(180,200,255,0.09)' },
  hell: { sky: ['#0a0204', '#2a0610', '#6a1018'], moon: '#ff6a4a', far: '#1a0408', mid: '#120206', ground: '#1e1418', grass: '#5a1a1a', plat: 'obsidian', fog: 'rgba(255,60,40,0.08)' },
  swamp: { sky: ['#0a120e', '#1a2a1e', '#3a4a2a'], moon: '#e8f4c8', far: '#16241a', mid: '#0e1a12', ground: '#2e3420', grass: '#4a6a2a', plat: 'moss', fog: 'rgba(170,220,140,0.14)' },
  snow: { sky: ['#0e1a30', '#2a4468', '#7aa0c8'], moon: '#f4f8ff', far: '#3a5478', mid: '#24384e', ground: '#e8f0fa', grass: '#ffffff', plat: 'snow', fog: 'rgba(230,240,255,0.16)', snowcap: true },
  icecave: { sky: ['#040814', '#0a1830', '#143058'], moon: null, far: '#0c1c34', mid: '#0a1428', ground: '#2a4a6a', grass: '#bfe8ff', plat: 'ice', fog: 'rgba(120,200,255,0.12)', cave: true },
  temple: { sky: ['#0c0410', '#2a0a1e', '#6a1a2a'], moon: '#ff5a64', far: '#1e0a18', mid: '#140812', ground: '#3a2c30', grass: '#5a2a30', plat: 'stone', fog: 'rgba(255,80,100,0.1)' },
  volcano: { sky: ['#140404', '#3a0e08', '#a8381a'], moon: '#ffb070', far: '#2a0c08', mid: '#1a0806', ground: '#241614', grass: '#5a1e10', plat: 'obsidian', fog: 'rgba(255,120,40,0.12)', lava: true },
};

export function themeOf(map) { return THEMES[map.theme]; }
