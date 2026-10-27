import { Puzzle, shuffled } from './base.js';
import { ATTIC } from './piano.js';
import { TRUNK_PICTURES, TRUNK_RIDDLE, TRUNK_ORDER_WORDS, TRUNK_ANSWER, RANDOMIZE } from '../config.js';

// The attic, second puzzle. A picture lock on the old trunk: four wheels, each
// with every picture. The card from the piano names four of the little finds
// in some order; set the wheels to them and press Open. Inside is the photo.
export const PICTURE_IDS = TRUNK_PICTURES.map((p) => p.id);
const FINDS_IN_RIDDLE = Object.keys(TRUNK_RIDDLE);

export class TrunkPuzzle extends Puzzle {
  constructor() {
    super('trunk', ATTIC, 'X');
    this.answer = TRUNK_ANSWER.slice();
    this.wheels = [4, 4, 4, 4];
    this.attempts = 0;
  }
  newGame(rng) {
    this.answer = RANDOMIZE ? shuffled(FINDS_IN_RIDDLE, rng) : TRUNK_ANSWER.slice();
    // The wheels start somewhere random, but never already open.
    do this.wheels = this.answer.map(() => Math.floor(rng() * PICTURE_IDS.length));
    while (this.matches());
    this.attempts = 0;
    this.solved = false;
  }
  // The card's text: one line per picture, in the answer's order.
  get riddle() {
    return this.answer.map((id, i) => `${TRUNK_ORDER_WORDS[i]}, ${TRUNK_RIDDLE[id]}.`).join('\n');
  }
  picture(i) {
    return PICTURE_IDS[this.wheels[i]];
  }
  spin(i, dir) {
    if (this.solved || i < 0 || i > 3) return;
    const n = PICTURE_IDS.length;
    this.wheels[i] = (this.wheels[i] + (dir < 0 ? -1 : 1) + n) % n;
    this.changed();
  }
  matches() {
    return this.answer.every((id, i) => PICTURE_IDS[this.wheels[i]] === id);
  }
  // Like the gate lock, it only opens when the handle is tried.
  check() {
    return !!this._tried && this.matches();
  }
  tryOpen() {
    if (this.solved) return true;
    this.attempts++;
    this._tried = true;
    const ok = this.changed();
    this._tried = false;
    return ok;
  }
  serialize() {
    return { answer: this.answer.slice(), wheels: this.wheels.slice(), attempts: this.attempts };
  }
  deserialize(s) {
    const okAnswer = Array.isArray(s.answer) && s.answer.length === 4 && s.answer.every((id) => FINDS_IN_RIDDLE.includes(id));
    if (okAnswer && new Set(s.answer).size === 4) this.answer = s.answer.slice();
    if (Array.isArray(s.wheels) && s.wheels.length === 4)
      this.wheels = s.wheels.map((w) => (((w | 0) % PICTURE_IDS.length) + PICTURE_IDS.length) % PICTURE_IDS.length);
    this.attempts = s.attempts | 0;
  }
  forceSolve() {
    this.wheels = this.answer.map((id) => PICTURE_IDS.indexOf(id));
    this.tryOpen();
  }
  hintVars() {
    const name = (id) => TRUNK_PICTURES.find((p) => p.id === id).name;
    return { ANSWER: this.answer.map(name).join(', ') };
  }
}
