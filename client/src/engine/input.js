// Keyboard + virtual touch buttons
const KEY_ACTIONS = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  Space: 'jump', KeyX: 'jump',
  KeyZ: 'attack', KeyJ: 'attack',
  KeyA: 'skill1', KeyS: 'skill2', KeyD: 'skill3',
  Digit1: 'potHp', Digit2: 'potMp',
  KeyE: 'interact',
};

function isTypingTarget(e) {
  const t = e.target;
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.onKey = null; // menu keys (I, C, K, L, Enter, Esc) are handled by the UI
    window.addEventListener('keydown', (e) => {
      if (isTypingTarget(e)) return;
      const a = KEY_ACTIONS[e.code];
      if (a) {
        if (!this.down.has(a)) this.pressed.add(a);
        this.down.add(a);
        e.preventDefault();
      }
      if (this.onKey) this.onKey(e);
    });
    window.addEventListener('keyup', (e) => {
      const a = KEY_ACTIONS[e.code];
      if (a) this.down.delete(a);
    });
    window.addEventListener('blur', () => this.down.clear());
  }
  isDown(a) { return this.down.has(a); }
  wasPressed(a) { return this.pressed.has(a); }
  setVirtual(a, on) {
    if (on) { if (!this.down.has(a)) this.pressed.add(a); this.down.add(a); }
    else this.down.delete(a);
  }
  clear() { this.down.clear(); this.pressed.clear(); }
  endFrame() { this.pressed.clear(); }
}
