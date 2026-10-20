import { Puzzle } from './base.js';
import { LOCK_CODE } from '../config.js';

// Room 5, puzzle A. Four-digit lock on the garden gate.
export class LockPuzzle extends Puzzle {
  constructor() {
    super('r5a', 4, 'A');
    this.code = String(LOCK_CODE).replace(/\D/g, '').padEnd(4, '0').slice(0, 4);
    this.digits = [0, 0, 0, 0];
    this.attempts = 0;
  }
  newGame() {
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
    return { digits: this.digits.slice(), attempts: this.attempts };
  }
  deserialize(s) {
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
