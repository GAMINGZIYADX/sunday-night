import { Puzzle } from './base.js';
import { DIAL_SOLUTION } from '../config.js';

// Room 3, puzzle B. Three oven dials 0-9.
export function dialRuleHolds([a, b, c]) {
  return a + b + c === 14 && a === 2 * c && b === a - 1;
}

export class DialsPuzzle extends Puzzle {
  constructor() {
    super('r3b', 2, 'B');
    this.values = [0, 0, 0];
  }
  newGame() {
    this.values = [0, 0, 0];
    this.solved = false;
  }
  turn(i, dir = 1) {
    if (this.solved || i < 0 || i > 2) return false;
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
    if (Array.isArray(s.values) && s.values.length === 3) this.values = s.values.map((v) => (((v | 0) % 10) + 10) % 10);
  }
  forceSolve() {
    this.values = DIAL_SOLUTION.slice();
    this.changed();
  }
  hintVars() {
    return { DIALS: DIAL_SOLUTION.join(', ') };
  }
}
