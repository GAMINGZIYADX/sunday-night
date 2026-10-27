import { Puzzle } from './base.js';
import { PIANO_KEYS, PIANO_START, PIANO_LENGTH, PIANO_TUNE, RANDOMIZE } from '../config.js';

// The attic, first puzzle. The old piano plays the first notes of a tune and
// lights its keys; play them back and it adds one more note, until the whole
// tune is played. A wrong key never loses progress: it just plays that part
// again. Solved, it gives the card with the trunk's riddle.
export const ATTIC = 6; // room index (after the clearing, which is 5)

// A tune of `length` key indexes with no key twice in a row.
export function randomTune(rng, length = PIANO_LENGTH, keys = PIANO_KEYS.length) {
  const tune = [];
  while (tune.length < length) {
    const k = Math.floor(rng() * keys);
    if (k !== tune[tune.length - 1]) tune.push(k);
  }
  return tune;
}

export class PianoPuzzle extends Puzzle {
  constructor() {
    super('piano', ATTIC, 'X');
    this.tune = PIANO_TUNE.slice();
    this.round = PIANO_START;
    this.pos = 0; // keys played so far in this attempt (not saved)
    this.done = false;
  }
  newGame(rng) {
    this.tune = RANDOMIZE ? randomTune(rng) : PIANO_TUNE.slice(0, PIANO_LENGTH);
    this.round = Math.min(PIANO_START, this.tune.length);
    this.pos = 0;
    this.done = false;
    this.solved = false;
  }
  // The notes the piano plays now.
  current() {
    return this.tune.slice(0, this.round);
  }
  restart() {
    this.pos = 0;
  }
  // Returns 'ok' (keep going), 'wrong' (start this part again), 'round' (that
  // part is right, the tune grew by one), 'solved', or 'free' once solved.
  press(key) {
    if (this.solved) return 'free';
    if (key !== this.tune[this.pos]) {
      this.pos = 0;
      return 'wrong';
    }
    this.pos++;
    if (this.pos < this.round) return 'ok';
    this.pos = 0;
    if (this.round >= this.tune.length) {
      this.done = true;
      this.changed();
      return 'solved';
    }
    this.round++;
    this.changed();
    return 'round';
  }
  check() {
    return this.done;
  }
  serialize() {
    return { tune: this.tune.slice(), round: this.round, done: this.done };
  }
  deserialize(s) {
    const ok = (k) => Number.isInteger(k) && k >= 0 && k < PIANO_KEYS.length;
    if (Array.isArray(s.tune) && s.tune.length >= 1 && s.tune.every(ok)) this.tune = s.tune.slice();
    this.round = Math.max(1, Math.min(this.tune.length, s.round | 0 || PIANO_START));
    this.done = !!s.done || !!s.solved;
    this.pos = 0;
  }
  forceSolve() {
    this.round = this.tune.length;
    this.done = true;
    this.changed();
  }
  hintVars() {
    const names = this.tune.map((k) => PIANO_KEYS[k]);
    return { START: names.slice(0, PIANO_START).join(', '), TUNE: names.join(', ') };
  }
}
