import { Puzzle } from './base.js';
import { DIAL_RIDDLES, RANDOMIZE } from '../config.js';

// Room 3, puzzle B. Four oven dials 0-9, set from the recipe card's riddle.
// Each new game can pick another riddle (config DIAL_RIDDLES). These rules
// mirror the riddle texts; the unit tests check every riddle has exactly one
// answer and that it is the configured one.
const differ = (v) => new Set(v).size === v.length;
export const DIAL_RULES = {
  double: ([a, b, c, d]) => differ([a, b, c, d]) && a === 2 * d && c % 2 === 1 && b > Math.max(a, c, d) && a + b + c + d === 20,
  triple: ([a, b, c, d]) =>
    differ([a, b, c, d]) && ![a, b, c, d].includes(0) && b === 3 * c && a + d === 9 && d > Math.max(a, b, c) && a + b + c + d === 17,
  odd: ([a, b, c, d]) =>
    differ([a, b, c, d]) && [a, b, c, d].every((v) => v % 2 === 1) && d === 1 && a + b === c + d && a > b && c > a && a + b + c + d === 16,
  doubleSecond: ([a, b, c, d]) => differ([a, b, c, d]) && a === 2 * b && c === b + 3 && a + c === d + 10 && d !== 0,
};
// The original riddle's rule (kept for the tests).
export const dialRuleHolds = DIAL_RULES.double;

export class DialsPuzzle extends Puzzle {
  constructor() {
    super('r3b', 2, 'B');
    this.setVariant(0);
  }
  setVariant(i) {
    this.riddle = Math.max(0, Math.min(DIAL_RIDDLES.length - 1, i | 0));
    this.solution = DIAL_RIDDLES[this.riddle].solution.slice();
    this.recipe = DIAL_RIDDLES[this.riddle].text;
    this.values = this.solution.map(() => 0);
  }
  newGame(rng = Math.random) {
    this.setVariant(RANDOMIZE ? Math.floor(rng() * DIAL_RIDDLES.length) : 0);
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
    return this.values.every((v, i) => v === this.solution[i]);
  }
  serialize() {
    return { values: this.values.slice(), riddle: this.riddle };
  }
  deserialize(s) {
    // Saves from before the randomiser have no riddle: the first one.
    this.setVariant(Number.isInteger(s.riddle) ? s.riddle : 0);
    if (Array.isArray(s.values) && s.values.length === this.count) this.values = s.values.map((v) => (((v | 0) % 10) + 10) % 10);
  }
  forceSolve() {
    this.values = this.solution.slice();
    this.changed();
  }
  hintVars() {
    return { DIALS: this.solution.join(', '), RIDDLEHINT: DIAL_RIDDLES[this.riddle].hint };
  }
}
