import { PAD } from '../config.js';
import { device, setPadMode } from './device.js';

// Game controllers (the Gamepad API, "standard" Xbox / PlayStation layout).
//
// Walking about, the sticks feed Input (move: `input.pad`, look: the same
// look deltas as the mouse) and the buttons do what their keys do:
//   A use · X turn back · Y journal · RB hint · Start pause · LT/RT or a full
//   push of the left stick run.
// With a card open (menus, the journal, puzzle screens) a small cursor
// appears instead: the left stick moves it, the D-pad jumps it to the next
// button or piece, A presses (held, it stays pressed, for Peek), B goes back
// (Esc), Y and RB still mean journal and hint, the right stick scrolls. The
// cursor sends ordinary pointer events, so every screen works as it does with
// a mouse, without knowing about controllers.

// Standard mapping button numbers.
const A = 0;
const B = 1;
const X = 2;
const Y = 3;
const RB = 5;
const LT = 6;
const RT = 7;
const BACK = 8;
const START = 9;
const L3 = 10;
const UP = 12;
const DOWN = 13;
const LEFT = 14;
const RIGHT = 15;

// What the D-pad can jump to on a card: buttons and pieces, and a drawing
// (canvas) only when it is not part of one (the sliding tiles are drawn).
const PIECES = 'button:not([disabled]), a[href], input, select, .slide-tile, .cell, [data-k]';
const TARGETS = `${PIECES}, canvas`;
const pieceAt = (e) => e?.closest?.(PIECES) || e?.closest?.('canvas') || null;

export class Gamepads {
  constructor(game) {
    this.game = game;
    this.prev = [];
    this.cursor = null; // { x, y } while a card is open and a controller is in use
    this.held = null; // the element A pressed, until A comes up
    this.repeat = { dir: null, t: 0 };
    this.dot = document.createElement('div');
    this.dot.className = 'pad-cursor hidden';
    document.body.appendChild(this.dot);
    this._hot = null;
    // The mouse, keyboard or a finger takes over again.
    const back = (e) => e.isTrusted && device.pad && setPadMode(false);
    document.addEventListener('mousemove', (e) => (Math.abs(e.movementX) + Math.abs(e.movementY) > 2 ? back(e) : null));
    window.addEventListener('keydown', back);
    document.addEventListener('pointerdown', back, true);
  }

  // The first connected controller, if any.
  _pad() {
    const list = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of list) if (p && p.connected) return p;
    return null;
  }

  update(dt) {
    const pad = this._pad();
    const input = this.game.input;
    if (!pad) {
      input.pad = null;
      this._hideCursor();
      return;
    }
    const btn = pad.buttons.map((b) => b.pressed || b.value > 0.5);
    const was = this.prev;
    this.prev = btn;
    const down = (i) => btn[i] && !was[i];
    const up = (i) => !btn[i] && was[i];
    const stick = (x, y) => {
      const m = Math.hypot(x, y);
      if (m < PAD.dead) return { x: 0, y: 0, m: 0 };
      const k = Math.min(1, (m - PAD.dead) / (1 - PAD.dead)) / m;
      return { x: x * k, y: y * k, m: Math.min(1, (m - PAD.dead) / (1 - PAD.dead)) };
    };
    const ax = pad.axes;
    const L = stick(ax[0] || 0, ax[1] || 0);
    const R = stick(ax[2] || 0, ax[3] || 0);
    const busy = L.m > 0 || R.m > 0 || btn.some(Boolean);
    if (busy && !device.pad) setPadMode(true);
    if (!device.pad) {
      input.pad = null;
      return;
    }

    const game = this.game;
    const card = game.modals.open;
    if (!card && game.state === 'playing') {
      this._hideCursor();
      // Walking: the left stick, run with a trigger, a stick click or a full push.
      const run = btn[LT] || btn[RT] || btn[L3] || L.m >= PAD.runAt;
      input.pad = L.m ? { f: -L.y, s: L.x, mag: L.m, run } : null;
      if (input.enabled && R.m) {
        // A curve: small pushes aim finely, a full push turns quickly.
        input.dx += R.x * R.m * PAD.lookSpeed * dt;
        input.dy += R.y * R.m * PAD.lookSpeed * dt;
      }
      if (down(A)) input._emit('interact');
      if (down(X)) input._emit('interactAlt');
      if (down(Y) || down(BACK)) this._key('Tab');
      if (down(RB)) this._key('KeyH');
      if (down(START)) this._key('Escape');
      return;
    }

    // A card is open (or the main menu): the cursor.
    input.pad = null;
    if (!card) return this._hideCursor();
    // A new card (or the cursor's first showing): start on its main button.
    const top = game.modals.top();
    if (!this.cursor || top !== this._card) {
      this._card = top;
      this._showCursor();
    }
    const c = this.cursor;
    if (L.m) {
      c.x = Math.max(0, Math.min(innerWidth - 1, c.x + L.x * L.m * PAD.cursorSpeed * dt));
      c.y = Math.max(0, Math.min(innerHeight - 1, c.y + L.y * L.m * PAD.cursorSpeed * dt));
      this._moved();
    }
    // The D-pad jumps; held, it repeats.
    const dir = btn[UP] ? 'up' : btn[DOWN] ? 'down' : btn[LEFT] ? 'left' : btn[RIGHT] ? 'right' : null;
    if (dir !== this.repeat.dir) {
      this.repeat = { dir, t: 0.4 };
      if (dir) this._jump(dir);
    } else if (dir && (this.repeat.t -= dt) <= 0) {
      this.repeat.t = 0.12;
      this._jump(dir);
    }
    if (R.m) {
      const box = this._scroller(document.elementFromPoint(c.x, c.y));
      if (box) box.scrollTop += R.y * R.m * PAD.scrollSpeed * dt;
    }
    if (down(A)) this._press();
    if (up(A)) this._release();
    if (down(B) || down(START)) this._key('Escape');
    if (down(Y)) this._key('Tab');
    if (down(RB)) this._key('KeyH');
  }

  // A key press, as if typed (the game, the cards and the start screen all
  // listen for keys).
  _key(code) {
    const key = { Tab: 'Tab', Escape: 'Escape', KeyH: 'h' }[code] || code;
    for (const type of ['keydown', 'keyup']) window.dispatchEvent(new KeyboardEvent(type, { code, key, bubbles: true, cancelable: true }));
  }

  _showCursor() {
    if (this.held) this._release();
    // Start on the card's first button (the main one when there is one).
    const first = this._targets().sort((a, b) => b.classList.contains('primary') - a.classList.contains('primary'))[0];
    const r = first?.getBoundingClientRect();
    this.cursor = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 };
    this.dot.classList.remove('hidden');
    this._moved();
  }
  _hideCursor() {
    if (!this.cursor) return;
    if (this.held) this._release();
    this.cursor = null;
    this._card = null;
    this.dot.classList.add('hidden');
    this._setHot(null);
  }

  _targets() {
    const top = this.game.modals.top();
    if (!top) return [];
    return [...top.el.querySelectorAll(TARGETS)].filter((e) => {
      if (e.tagName === 'CANVAS' && e.parentElement?.closest(PIECES)) return false;
      const r = e.getBoundingClientRect();
      return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight && getComputedStyle(e).visibility !== 'hidden';
    });
  }

  // The nearest button or piece that way from the cursor.
  _jump(dir) {
    const c = this.cursor;
    const [vx, vy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
    let best = null;
    let bd = Infinity;
    for (const e of this._targets()) {
      const r = e.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const along = (x - c.x) * vx + (y - c.y) * vy;
      if (along < 6) continue;
      const across = Math.abs((x - c.x) * vy) + Math.abs((y - c.y) * vx);
      const d = along + across * 2.5;
      if (d < bd) {
        bd = d;
        best = { e, x, y };
      }
    }
    if (!best) return;
    c.x = best.x;
    c.y = best.y;
    best.e.scrollIntoView?.({ block: 'nearest' });
    this._moved();
  }

  _moved() {
    const c = this.cursor;
    this.dot.style.transform = `translate(${c.x}px, ${c.y}px)`;
    const under = document.elementFromPoint(c.x, c.y);
    this._setHot(pieceAt(under));
    if (this.held) this._pointer('pointermove', under);
  }
  _setHot(e) {
    if (e === this._hot) return;
    this._hot?.classList.remove('pad-hot');
    this._hot = e;
    e?.classList.add('pad-hot');
  }

  _scroller(e) {
    for (let n = e; n && n !== document.body; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight + 2) return n;
    }
    return null;
  }

  // Pointer events at the cursor, marked so the game does not mistake them
  // for a real mouse.
  _pointer(type, target) {
    if (!target) return;
    const c = this.cursor;
    const opts = { bubbles: true, cancelable: true, composed: true, clientX: c.x, clientY: c.y, button: 0, buttons: type === 'pointerup' ? 0 : 1 };
    const Ptr = window.PointerEvent || MouseEvent;
    const ev = new Ptr(type, { ...opts, pointerId: 1, pointerType: 'mouse', isPrimary: true });
    Object.defineProperty(ev, 'fromPad', { value: true });
    target.dispatchEvent(ev);
    const mouse = { pointerdown: 'mousedown', pointerup: 'mouseup', pointermove: 'mousemove' }[type];
    if (mouse) {
      const m = new MouseEvent(mouse, opts);
      Object.defineProperty(m, 'fromPad', { value: true });
      target.dispatchEvent(m);
    }
  }
  _press() {
    const c = this.cursor;
    const target = document.elementFromPoint(c.x, c.y);
    if (!target) return;
    this.held = target;
    this._pointer('pointerdown', target);
  }
  _release() {
    const pressed = this.held;
    this.held = null;
    if (!pressed || !this.cursor) return;
    const c = this.cursor;
    const target = document.elementFromPoint(c.x, c.y) || pressed;
    this._pointer('pointerup', target);
    // A click, like a mouse: only if it came up where it went down.
    if (pressed.isConnected && (pressed === target || pressed.contains(target) || target.contains(pressed))) {
      const ev = new MouseEvent('click', { bubbles: true, cancelable: true, clientX: c.x, clientY: c.y, button: 0 });
      Object.defineProperty(ev, 'fromPad', { value: true });
      pressed.dispatchEvent(ev);
    }
    // The card may have changed under the cursor.
    if (this.cursor) this._moved();
  }
}
