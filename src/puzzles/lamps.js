import { Puzzle } from './base.js';
import { GREENHOUSE } from './water.js';

// The greenhouse, second puzzle. A 4×4 grid of grow lamps over the seedlings.
// Switching one flips it and the lamps right next to it (not diagonally).
// Light them all. Every game starts from a new tangle, made by flipping a few
// random lamps of a lit grid, so it can always be undone.
export const LN = 4;
const CELLS = LN * LN;
const ALL = (1 << CELLS) - 1;

// The lamps one switch flips, as a bit mask.
export const EFFECT = Array.from({ length: CELLS }, (_, i) => {
  const x = i % LN;
  const y = Math.floor(i / LN);
  let m = 1 << i;
  if (x > 0) m |= 1 << (i - 1);
  if (x < LN - 1) m |= 1 << (i + 1);
  if (y > 0) m |= 1 << (i - LN);
  if (y < LN - 1) m |= 1 << (i + LN);
  return m;
});

// The fewest switches that light everything from `onMask` (null if none can).
// 2^16 sets of switches, walked in Gray-code order: one flip per step.
export function lampSolution(onMask) {
  const need = ~onMask & ALL;
  let best = null;
  let cur = 0;
  let set = 0;
  for (let g = 0; g < 1 << CELLS; g++) {
    if (g) {
      const bit = 31 - Math.clz32(g & -g);
      set ^= 1 << bit;
      cur ^= EFFECT[bit];
    }
    if (cur === need) {
      const n = popcount(set);
      if (!best || n < best.n) best = { n, set };
    }
  }
  if (!best) return null;
  const out = [];
  for (let i = 0; i < CELLS; i++) if (best.set & (1 << i)) out.push(i);
  return out;
}
const popcount = (v) => {
  let n = 0;
  for (; v; v &= v - 1) n++;
  return n;
};

export class LampsPuzzle extends Puzzle {
  constructor() {
    super('lamps', GREENHOUSE, 'X');
    this.mask = ALL;
    this.moves = 0;
  }
  newGame(rng) {
    do {
      this.mask = ALL;
      const picks = new Set();
      while (picks.size < 5) picks.add(Math.floor(rng() * CELLS));
      for (const i of picks) this.mask ^= EFFECT[i];
    } while (this.mask === ALL || (lampSolution(this.mask)?.length ?? 0) < 4);
    this.moves = 0;
    this.solved = false;
  }
  // The fewest lamps to switch from here (hints, tests).
  solution() {
    return lampSolution(this.mask) || [];
  }
  isOn(i) {
    return !!(this.mask & (1 << i));
  }
  flip(i) {
    if (this.solved || i < 0 || i >= CELLS) return;
    this.mask ^= EFFECT[i];
    this.moves++;
    this.changed();
  }
  check() {
    return this.mask === ALL;
  }
  serialize() {
    return { mask: this.mask, moves: this.moves };
  }
  deserialize(s) {
    if (Number.isInteger(s.mask) && s.mask >= 0 && s.mask <= ALL) this.mask = s.mask;
    this.moves = s.moves | 0;
  }
  forceSolve() {
    for (const i of lampSolution(this.mask) || []) this.flip(i);
  }
  hintVars() {
    const sol = lampSolution(this.mask) || [];
    const name = (i) => `row ${Math.floor(i / LN) + 1} lamp ${(i % LN) + 1}`;
    return { N: sol.length, LAMPS: sol.map(name).join(', ') };
  }
}
