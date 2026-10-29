import { HINTS, DIFFICULTY } from '../config.js';

// Every puzzle shares this small interface:
//   getState() / setState(s)  serialise for saves (includes partial progress)
//   isSolved()                true once solved (stays solved)
//   hint(tier)                tier 0..2 -> nudge, bigger nudge, near-answer
//   newGame(rng)              fresh randomised start (as hard as this.tune says)
// Puzzles call this.changed() after any player action. Listeners get
// (puzzle, justSolved).
export class Puzzle {
  constructor(id, room, kind) {
    this.id = id;
    this.room = room; // 0-based room index
    this.kind = kind; // 'A' themed (gold key) or 'B' normal (silver key)
    this.solved = false;
    this.tune = DIFFICULTY.normal; // set by GameState from the chosen difficulty
    this._listeners = [];
  }

  onChange(fn) {
    this._listeners.push(fn);
    return () => (this._listeners = this._listeners.filter((f) => f !== fn));
  }

  changed() {
    let justSolved = false;
    if (!this.solved && this.check()) {
      this.solved = true;
      justSolved = true;
    }
    for (const fn of this._listeners) fn(this, justSolved);
    return justSolved;
  }

  // Subclasses implement check(), serialize(), deserialize(), newGame().
  check() {
    return false;
  }
  serialize() {
    return {};
  }
  deserialize() {}
  newGame() {}

  getState() {
    return { ...this.serialize(), solved: this.solved };
  }

  setState(s) {
    if (!s || typeof s !== 'object') return;
    this.deserialize(s);
    this.solved = !!s.solved || !!this.check();
    for (const fn of this._listeners) fn(this, false);
  }

  isSolved() {
    return this.solved;
  }

  // Forces the puzzle into its solved configuration (debug + tests).
  forceSolve() {}

  hintVars() {
    return {};
  }

  hint(tier) {
    const list = HINTS[this.id] || [];
    const t = Math.max(0, Math.min(list.length - 1, tier | 0));
    const vars = this.hintVars();
    return String(list[t] || '').replace(/\{([A-Z_]+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  }
}

export function shuffled(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Small seeded PRNG for repeatable tests.
export function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
