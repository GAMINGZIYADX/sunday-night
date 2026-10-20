import { Puzzle } from './base.js';
import { CIPHER_WORD, CIPHER_SHIFT, CIPHER_ENCODED } from '../config.js';

// Room 3, puzzle A. Decode the card and spell the word on the fridge.
export class CipherPuzzle extends Puzzle {
  constructor() {
    super('r3a', 2, 'A');
    this.word = CIPHER_WORD.toUpperCase();
    this.letters = [];
  }
  get length() {
    return this.word.length;
  }
  newGame() {
    this.letters = [];
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
  get text() {
    return this.letters.join('');
  }
  check() {
    return this.text === this.word;
  }
  serialize() {
    return { letters: this.letters.slice() };
  }
  deserialize(s) {
    if (Array.isArray(s.letters)) this.letters = s.letters.filter((c) => /^[A-Z]$/.test(c)).slice(0, this.length);
  }
  forceSolve() {
    this.letters = this.word.split('');
    this.changed();
  }
  hintVars() {
    const map = CIPHER_ENCODED.split('')
      .map((c, i) => `${c} becomes ${this.word[i]}`)
      .join(', ');
    return { SHIFT: String(CIPHER_SHIFT), WORD: this.word, MAP: map.charAt(0).toUpperCase() + map.slice(1) };
  }
}
