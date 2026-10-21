import { Puzzle } from './base.js';
import { VASE_SLOTS, VASE_VARIANTS, RANDOMIZE } from '../config.js';

// Room 2, puzzle A. A growing pattern of blue and white tulips along the vase
// stand. Only a few vases are planted (and the rug shows how it starts); she
// works out the rule and fills the rest. Each new game can pick another
// pattern (config VASE_VARIANTS):
//   'pairs'   1 B, 1 W, 2 B, 2 W, 3 B, 3 W ...
//   'growing' 1 B, 2 W, 3 B, 4 W ...
export function tulipPattern(length, { rule = 'pairs', start = 'B' } = {}) {
  const other = start === 'B' ? 'W' : 'B';
  const out = [];
  let run = 1;
  let colour = start;
  while (out.length < length) {
    for (let i = 0; i < run && out.length < length; i++) out.push(colour);
    if (rule === 'pairs') {
      if (colour === other) run++;
    } else run++;
    colour = colour === start ? other : start;
  }
  return out;
}

// The original rule, kept for the tests and anything else that wants it.
export const tulipRule = (length) => tulipPattern(length, { rule: 'pairs', start: 'B' });

const NAMES = { B: 'blue', W: 'white' };
const WORDS = ['one', 'two', 'three', 'four'];

export class VasePuzzle extends Puzzle {
  constructor() {
    super('r2a', 1, 'A');
    this.setVariant(0);
  }
  setVariant(i) {
    this.variant = Math.max(0, Math.min(VASE_VARIANTS.length - 1, i | 0));
    const v = VASE_VARIANTS[this.variant];
    this.solution = tulipPattern(VASE_SLOTS, v);
    this.given = new Set(v.given);
    this.slots = this.solution.map((c, i) => (this.given.has(i) ? c : null));
  }
  newGame(rng = Math.random) {
    this.setVariant(RANDOMIZE ? Math.floor(rng() * VASE_VARIANTS.length) : 0);
    this.solved = false;
  }
  isFixed(i) {
    return this.given.has(i);
  }
  // color: 'B', 'W' or null to empty the slot.
  place(i, color) {
    if (this.solved || this.isFixed(i) || i < 0 || i >= this.slots.length) return false;
    this.slots[i] = color === 'B' || color === 'W' ? color : null;
    return this.changed();
  }
  check() {
    return this.slots.every((c, i) => c === this.solution[i]);
  }
  serialize() {
    return { slots: this.slots.slice(), variant: this.variant };
  }
  deserialize(s) {
    // Saves from before the randomiser have no variant: the first pattern.
    this.setVariant(Number.isInteger(s.variant) ? s.variant : 0);
    if (Array.isArray(s.slots) && s.slots.length === this.slots.length)
      this.slots = s.slots.map((c, i) => (this.isFixed(i) ? this.solution[i] : c === 'B' || c === 'W' ? c : null));
  }
  forceSolve() {
    this.slots = this.solution.slice();
    this.changed();
  }
  // Words for the start of the pattern, e.g. "Blue, white, blue, blue".
  startWords(count) {
    return this.solution
      .slice(0, count)
      .map((c, i) => (i ? NAMES[c] : NAMES[c][0].toUpperCase() + NAMES[c].slice(1)))
      .join(', ');
  }
  hintVars() {
    const v = VASE_VARIANTS[this.variant];
    const a = NAMES[v.start];
    const b = NAMES[v.start === 'B' ? 'W' : 'B'];
    const RULE =
      v.rule === 'pairs' ? `one ${a}, one ${b}, then two ${a}, two ${b}` : `one ${a}, then two ${b}, then three ${a}, then ${WORDS[3]} ${b}`;
    return { ANSWER: this.solution.map((c) => NAMES[c]).join(', '), RULE };
  }
}
