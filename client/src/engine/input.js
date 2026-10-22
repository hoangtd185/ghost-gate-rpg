// Keyboard + virtual touch buttons
import { GAME } from '../config.js';
const KEY_ACTIONS = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  Space: 'jump', KeyX: 'jump',
  KeyZ: 'attack', KeyJ: 'attack',
  KeyA: 'skill1', KeyS: 'skill2', KeyD: 'skill3',
  Digit1: 'potHp', Digit2: 'potMp',
  KeyE: 'interact',
  ControlLeft: 'ctrl', ControlRight: 'ctrl',
};
const DOUBLE_TAP_MS = GAME.physics.doubleTapMs; // second tap of ← / → within this window starts a sprint

function isTypingTarget(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.onKey = null; // menu keys (I, C, K, L, Enter, Esc) are handled by the UI
    this.sprint = null; // 'left' | 'right' while a double-tapped direction is held
    this.lastTap = { left: 0, right: 0 };
    window.addEventListener('keydown', (e) => {
      if (isTypingTarget(e)) return;
      const a = KEY_ACTIONS[e.code];
      if (a) {
        this.press(a);
        e.preventDefault();
      }
      if (this.onKey) this.onKey(e);
    });
    window.addEventListener('keyup', (e) => {
      const a = KEY_ACTIONS[e.code];
      if (a) this.release(a);
    });
    window.addEventListener('blur', () => { this.down.clear(); this.sprint = null; });
  }
  press(a) {
    if (this.down.has(a)) return; // ignore key repeat
    this.pressed.add(a);
    this.down.add(a);
    if (a === 'left' || a === 'right') {
      const now = performance.now();
      this.sprint = now - this.lastTap[a] < DOUBLE_TAP_MS ? a : null;
      this.lastTap[a] = now;
    }
  }
  release(a) {
    this.down.delete(a);
    if (a === this.sprint) this.sprint = null;
  }
  isDown(a) { return this.down.has(a); }
  wasPressed(a) { return this.pressed.has(a); }
  setVirtual(a, on) {
    if (on) this.press(a);
    else this.release(a);
  }
  clear() { this.down.clear(); this.pressed.clear(); this.sprint = null; }
  endFrame() { this.pressed.clear(); }
}
