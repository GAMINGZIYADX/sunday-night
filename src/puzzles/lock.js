import { Puzzle } from './base.js';

// Room 5, puzzle A. Four-digit lock on the garden gate. The code is new every
// game (four random digits); each opened door shows one of them on its memory
// tulip, in room order. Saves keep their code.
export class LockPuzzle extends Puzzle {
  constructor() {
    super('r5a', 4, 'A');
    this.code = '0000';
    this.digits = [0, 0, 0, 0];
    this.attempts = 0;
  }
  newGame(rng) {
    this.code = Array.from({ length: 4 }, () => Math.floor(rng() * 10)).join('');
    this.digits = [0, 0, 0, 0];
    this.attempts = 0;
    this.solved = false;
  }
  setDigit(i, v) {
    if (this.solved || i < 0 || i > 3) return;
    this.digits[i] = (((v | 0) % 10) + 10) % 10;
    this.changed();
  }
  spin(i, dir) {
    this.setDigit(i, this.digits[i] + (dir < 0 ? -1 : 1));
  }
  // The lock only opens when she presses the handle (try), not while spinning.
  check() {
    return !!this._tried && this.digits.join('') === this.code;
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
    return { code: this.code, digits: this.digits.slice(), attempts: this.attempts };
  }
  deserialize(s) {
    // Saves from before the random code keep the new one picked for them.
    if (typeof s.code === 'string' && /^\d{4}$/.test(s.code)) this.code = s.code;
    if (Array.isArray(s.digits) && s.digits.length === 4) this.digits = s.digits.map((v) => (((v | 0) % 10) + 10) % 10);
    this.attempts = s.attempts | 0;
  }
  forceSolve() {
    this.digits = this.code.split('').map(Number);
    this.tryOpen();
  }
  hintVars() {
    return { CODE: this.code.split('').join(' ') };
  }
}
