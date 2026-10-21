import { Puzzle } from './base.js';
import { VASE_SLOTS, VASE_GIVEN } from '../config.js';

// Room 2, puzzle A. Growing runs of alternating colours:
// 1 B, 1 W, 2 B, 2 W, 3 B, 3 W ...
// Only a few vases are planted; she has to work out the rule and fill the rest.
export function tulipRule(length) {
  const out = [];
  let run = 1;
  while (out.length < length) {
    for (let i = 0; i < run && out.length < length; i++) out.push('B');
    for (let i = 0; i < run && out.length < length; i++) out.push('W');
    run++;
  }
  return out;
}

export class VasePuzzle extends Puzzle {
  constructor() {
    super('r2a', 1, 'A');
    this.solution = tulipRule(VASE_SLOTS);
    this.given = new Set(VASE_GIVEN);
    this.slots = this.solution.map((c, i) => (this.given.has(i) ? c : null));
  }
  newGame() {
    this.slots = this.solution.map((c, i) => (this.given.has(i) ? c : null));
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
    return { slots: this.slots.slice() };
  }
  deserialize(s) {
    if (Array.isArray(s.slots) && s.slots.length === this.slots.length)
      this.slots = s.slots.map((c, i) => (this.isFixed(i) ? this.solution[i] : c === 'B' || c === 'W' ? c : null));
  }
  forceSolve() {
    this.slots = this.solution.slice();
    this.changed();
  }
  hintVars() {
    const name = (c) => (c === 'B' ? 'blue' : 'white');
    return { ANSWER: this.solution.map(name).join(', ') };
  }
}
