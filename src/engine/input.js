// Keyboard + mouse + pointer lock. Gameplay code reads `keys` and consumes
// mouse deltas; discrete actions are delivered through `onAction`.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.dx = 0;
    this.dy = 0;
    this.locked = false;
    this.wasLocked = false;
    this.enabled = false; // gameplay input (movement/look/interact)
    this.handlers = new Map();
    this.lockListeners = [];

    window.addEventListener('keydown', (e) => this._down(e));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    document.addEventListener('mousemove', (e) => {
      if (!this.locked || !this.enabled) return;
      // Ignore the occasional huge spike some browsers emit on lock.
      if (Math.abs(e.movementX) > 300 || Math.abs(e.movementY) > 300) return;
      this.dx += e.movementX;
      this.dy += e.movementY;
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (this.locked) this.wasLocked = true;
      for (const fn of this.lockListeners) fn(this.locked);
    });
    document.addEventListener('pointerlockerror', () => {
      this.locked = false;
      for (const fn of this.lockListeners) fn(false, true);
    });
    canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (!this.locked) {
        this.lock();
        // Without pointer lock (rare), clicks still interact.
        if (!this.lockSupported()) this._emit(e.button === 2 ? 'interactAlt' : 'interact');
        return;
      }
      if (e.button === 0) this._emit('interact');
      if (e.button === 2) this._emit('interactAlt');
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  lockSupported() {
    return 'requestPointerLock' in this.canvas;
  }

  lock() {
    if (this.locked || !this.lockSupported() || this.noLock) return;
    try {
      const p = this.canvas.requestPointerLock();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {
      /* the browser refused (cool-down after Esc); the next click retries */
    }
  }

  unlock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  on(action, fn) {
    if (!this.handlers.has(action)) this.handlers.set(action, []);
    this.handlers.get(action).push(fn);
  }
  onLockChange(fn) {
    this.lockListeners.push(fn);
  }
  _emit(action, e) {
    for (const fn of this.handlers.get(action) || []) fn(e);
  }

  _down(e) {
    const tag = e.target && e.target.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA';
    if (e.code === 'Tab') e.preventDefault();
    if (typing && e.code !== 'Escape') return;
    // The game decides what each key means (modals get first say).
    if (!e.repeat) this._emit('key', e);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    this.keys.add(e.code);
  }

  consumeMouse() {
    const d = { x: this.dx, y: this.dy };
    this.dx = 0;
    this.dy = 0;
    return d;
  }

  axis() {
    const k = this.keys;
    if (!this.enabled) return { f: 0, s: 0, slow: false };
    const f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const s = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    return { f, s, slow: k.has('ShiftLeft') || k.has('ShiftRight') };
  }
}
