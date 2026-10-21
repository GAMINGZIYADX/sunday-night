import { Puzzle } from './base.js';
import { CIPHER_SHIFT, CIPHER_SENTENCES, RANDOMIZE } from '../config.js';
import { caesarShift } from './cipherMath.js';

// Room 3, puzzle A. A whole sentence was Caesar-shifted, and nothing says by
// how much. She works the shift out (the one-letter word can only be I or A),
// can try shifts on the turning wheel poster, and spells the last word on the
// fridge. Each new game can pick another sentence (config CIPHER_SENTENCES)
// and another shift.
export class CipherPuzzle extends Puzzle {
  constructor() {
    super('r3a', 2, 'A');
    this.letters = [];
    this.wheel = 0; // how far the poster's inner ring is turned
    this.setVariant(0, CIPHER_SHIFT);
  }
  setVariant(index, shift) {
    this.sentenceIndex = Math.max(0, Math.min(CIPHER_SENTENCES.length - 1, index | 0));
    const [sentence, word] = CIPHER_SENTENCES[this.sentenceIndex];
    this.sentence = sentence.toUpperCase();
    this.word = word.toUpperCase();
    this.shift = (((shift | 0) % 26) + 26) % 26 || CIPHER_SHIFT;
    this.encoded = caesarShift(this.sentence, this.shift);
  }
  get length() {
    return this.word.length;
  }
  newGame(rng = Math.random) {
    if (RANDOMIZE) this.setVariant(Math.floor(rng() * CIPHER_SENTENCES.length), 1 + Math.floor(rng() * 25));
    else this.setVariant(0, CIPHER_SHIFT);
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
    return { letters: this.letters.slice(), wheel: this.wheel, sentence: this.sentenceIndex, shift: this.shift };
  }
  deserialize(s) {
    // Saves from before the randomiser have neither: the first sentence.
    this.setVariant(Number.isInteger(s.sentence) ? s.sentence : 0, Number.isInteger(s.shift) ? s.shift : CIPHER_SHIFT);
    if (Array.isArray(s.letters)) this.letters = s.letters.filter((c) => /^[A-Z]$/.test(c)).slice(0, this.length);
    this.wheel = (((s.wheel | 0) % 26) + 26) % 26;
  }
  forceSolve() {
    this.letters = this.word.split('');
    this.changed();
  }
  hintVars() {
    const lone = this.encoded.split(/\s+/).find((w) => w.length === 1) || this.encoded.charAt(0);
    return {
      SHIFT: String(this.shift),
      WORD: this.word,
      SENTENCE: this.sentence,
      LONE: lone,
      LONEPLAIN: caesarShift(lone, -this.shift),
    };
  }
}
