import { device } from './device.js';

const STICK_R = 56; // px a thumb travels for full speed
const RUN_PAST = 1.35; // a thumb this far past the centre (in STICK_R) runs
const TOUCH_LOOK = 1.5; // touch drag pixels -> mouse-like look pixels
const TAP_MOVE = 12; // px a finger may wander and still count as a tap
const TAP_MS = 380;

// Keyboard + mouse + pointer lock, and on touch screens a thumb stick, drag
// to look and tap to use. Gameplay code reads `axis()` and consumes look
// deltas; discrete actions are delivered through `on(action)`.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.dx = 0;
    this.dy = 0;
    this.locked = false;
    this.wasLocked = false;
    this.touch = device.touch; // fingers have no pointer to lock
    this.noLock = false; // tests that drive the camera themselves set this
    this._enabled = false; // gameplay input (movement/look/interact)
    this.stick = null; // { id, ox, oy, x, y } while a thumb is on the stick
    this.looks = new Map(); // pointerId -> drag-to-look finger
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
    this._bindTouch(canvas);
    // Which kind of pointer is in use (anywhere on the page), so 2-in-1 PCs
    // can switch between touch and mouse controls as they are used.
    document.addEventListener('pointerdown', (e) => this._emit('pointerKind', e.pointerType === 'mouse' ? 'mouse' : 'touch'), true);
  }

  get enabled() {
    return this._enabled;
  }
  set enabled(on) {
    this._enabled = on;
    if (!on) this.releaseTouches();
  }

  // Touch: the left part of the screen is a floating thumb stick (it appears
  // where the thumb lands); anywhere else, dragging looks around and a quick
  // tap uses whatever is under the finger.
  _bindTouch(canvas) {
    const isFinger = (e) => e.pointerType === 'touch' || e.pointerType === 'pen';
    canvas.addEventListener(
      'pointerdown',
      (e) => {
        if (!isFinger(e)) return;
        e.preventDefault(); // no emulated mouse clicks after a touch
        if (!this.enabled) return;
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          /* fine without */
        }
        const x = e.clientX;
        const y = e.clientY;
        if (!this.stick && x < window.innerWidth * 0.42) this.stick = { id: e.pointerId, ox: x, oy: y, x, y };
        else this.looks.set(e.pointerId, { x, y, sx: x, sy: y, t: e.timeStamp, moved: 0 });
      },
      { passive: false },
    );
    canvas.addEventListener('pointermove', (e) => {
      if (!isFinger(e) || !this.enabled) return;
      const s = this.stick;
      if (s && s.id === e.pointerId) {
        s.x = e.clientX;
        s.y = e.clientY;
        // Past the rim, the stick follows the thumb so it never feels stuck.
        const dx = s.x - s.ox;
        const dy = s.y - s.oy;
        const d = Math.hypot(dx, dy);
        if (d > STICK_R) {
          s.ox = s.x - (dx / d) * STICK_R;
          s.oy = s.y - (dy / d) * STICK_R;
        }
        return;
      }
      const l = this.looks.get(e.pointerId);
      if (!l) return;
      const dx = e.clientX - l.x;
      const dy = e.clientY - l.y;
      l.x = e.clientX;
      l.y = e.clientY;
      l.moved = Math.max(l.moved, Math.hypot(l.x - l.sx, l.y - l.sy));
      this.dx += dx * TOUCH_LOOK;
      this.dy += dy * TOUCH_LOOK;
    });
    const end = (e) => {
      if (!isFinger(e)) return;
      if (this.stick && this.stick.id === e.pointerId) {
        this.stick = null;
        return;
      }
      const l = this.looks.get(e.pointerId);
      if (!l) return;
      this.looks.delete(e.pointerId);
      // Event times, not now(): a busy frame must not turn a tap into a hold.
      const tap = e.type === 'pointerup' && l.moved < TAP_MOVE && e.timeStamp - l.t < TAP_MS;
      if (tap && this.enabled) this._emit('tap', { x: l.sx, y: l.sy });
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
  }

  releaseTouches() {
    this.stick = null;
    this.looks.clear();
  }

  lockSupported() {
    return !this.touch && 'requestPointerLock' in this.canvas;
  }

  lock() {
    if (this.locked || !this.lockSupported() || this.noLock || this.touch) return;
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

  // f/s are -1..1. Keys give full steps (Shift runs); the thumb stick is
  // analog, a gentle push walks slowly and a push past the ring runs.
  axis() {
    const k = this.keys;
    if (!this.enabled) return { f: 0, s: 0, slow: false, run: false };
    let f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    let s = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    const run = k.has('ShiftLeft') || k.has('ShiftRight');
    const st = this.stickVector();
    if (st && !f && !s) {
      f = -st.y;
      s = st.x;
      return { f, s, slow: st.mag < 0.55, run: st.run, analog: true };
    }
    return { f, s, slow: false, run };
  }

  // The stick as a vector with length 0..1 (0 inside the dead zone).
  stickVector() {
    const t = this.stick;
    if (!t) return null;
    const dx = t.x - t.ox;
    const dy = t.y - t.oy;
    const d = Math.hypot(dx, dy);
    const dead = 0.14;
    const raw = Math.min(1, d / STICK_R);
    if (raw < dead) return { x: 0, y: 0, mag: 0, dx, dy, run: false };
    const mag = (raw - dead) / (1 - dead);
    // Past the ring (the thumb keeps going) is a run.
    return { x: (dx / d) * mag, y: (dy / d) * mag, mag, dx, dy, run: d > STICK_R * RUN_PAST };
  }
}
