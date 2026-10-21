import { Puzzle } from './base.js';
import { DIAL_SOLUTION } from '../config.js';

// Room 3, puzzle B. Four oven dials 0-9, set from the recipe card's riddle.
// This mirrors DIAL_RECIPE in config.js (the unit tests check it has exactly
// one answer and that the answer is DIAL_SOLUTION).
export function dialRuleHolds([a, b, c, d]) {
  return new Set([a, b, c, d]).size === 4 && a === 2 * d && c % 2 === 1 && b > Math.max(a, c, d) && a + b + c + d === 20;
}

export class DialsPuzzle extends Puzzle {
  constructor() {
    super('r3b', 2, 'B');
    this.values = DIAL_SOLUTION.map(() => 0);
  }
  newGame() {
    this.values = DIAL_SOLUTION.map(() => 0);
    this.solved = false;
  }
  get count() {
    return this.values.length;
  }
  turn(i, dir = 1) {
    if (this.solved || i < 0 || i >= this.count) return false;
    this.values[i] = (this.values[i] + (dir < 0 ? 9 : 1)) % 10;
    return this.changed();
  }
  check() {
    return this.values.every((v, i) => v === DIAL_SOLUTION[i]);
  }
  serialize() {
    return { values: this.values.slice() };
  }
  deserialize(s) {
    if (Array.isArray(s.values) && s.values.length === this.count) this.values = s.values.map((v) => (((v | 0) % 10) + 10) % 10);
  }
  forceSolve() {
    this.values = DIAL_SOLUTION.slice();
    this.changed();
  }
  hintVars() {
    return { DIALS: DIAL_SOLUTION.join(', ') };
  }
}
