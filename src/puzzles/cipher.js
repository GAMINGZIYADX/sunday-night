import { Puzzle } from './base.js';
import { CIPHER_WORD, CIPHER_SHIFT, CIPHER_SENTENCE, CIPHER_ENCODED } from '../config.js';
import { caesarShift } from './cipherMath.js';

// Room 3, puzzle A. A whole sentence was Caesar-shifted, and nothing says by
// how much. She works the shift out (the one-letter word can only be I or A),
// can try shifts on the turning wheel poster, and spells the last word on the
// fridge.
export class CipherPuzzle extends Puzzle {
  constructor() {
    super('r3a', 2, 'A');
    this.word = CIPHER_WORD.toUpperCase();
    this.letters = [];
    this.wheel = 0; // how far the poster's inner ring is turned
  }
  get length() {
    return this.word.length;
  }
  newGame() {
    this.letters = [];
    this.wheel = 0;
    this.solved = false;
  }
  addLetter(ch) {
    ch = String(ch).toUpperCase();
    if (this.solved || !/^[A-Z]$/.test(ch) || this.letters.length >= this.length) return false;
    this.letters.push(ch);
    return this.changed();
  }
  removeLast() {
    if (this.solved || !this.letters.length) return false;
    this.letters.pop();
    this.changed();
    return true;
  }
  setText(text) {
    if (this.solved) return false;
    this.letters = String(text)
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, this.length)
      .split('')
      .filter(Boolean);
    return this.changed();
  }
  turnWheel(dir = 1) {
    this.wheel = (((this.wheel + (dir < 0 ? -1 : 1)) % 26) + 26) % 26;
    this.changed();
  }
  get text() {
    return this.letters.join('');
  }
  check() {
    return this.text === this.word;
  }
  serialize() {
    return { letters: this.letters.slice(), wheel: this.wheel };
  }
  deserialize(s) {
    if (Array.isArray(s.letters)) this.letters = s.letters.filter((c) => /^[A-Z]$/.test(c)).slice(0, this.length);
    this.wheel = (((s.wheel | 0) % 26) + 26) % 26;
  }
  forceSolve() {
    this.letters = this.word.split('');
    this.changed();
  }
  hintVars() {
    const lone = CIPHER_ENCODED.split(/\s+/).find((w) => w.length === 1);
    return {
      SHIFT: String(CIPHER_SHIFT),
      WORD: this.word,
      SENTENCE: CIPHER_SENTENCE.toUpperCase(),
      LONE: lone || CIPHER_ENCODED.charAt(0),
      LONEPLAIN: caesarShift(lone || CIPHER_ENCODED.charAt(0), -CIPHER_SHIFT),
    };
  }
}
