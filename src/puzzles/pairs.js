import { Puzzle, shuffled } from './base.js';
import { BALCONY } from './lanterns.js';
import { PAIR_PICTURES } from '../config.js';

// The balcony, second puzzle. Twelve star cards face down on the little
// table: six pairs. Turn two; a pair stays up, anything else turns back over.
// Every game picks six pictures and deals them anew.
export const CARDS = 12;

export class PairsPuzzle extends Puzzle {
  constructor() {
    super('pairs', BALCONY, 'X');
    this.cards = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
    this.matched = [];
    this.open = null; // the first card of a turn
    this.turns = 0;
  }
  newGame(rng) {
    const pics = shuffled(
      PAIR_PICTURES.map((_, i) => i),
      rng,
    ).slice(0, CARDS / 2);
    this.cards = shuffled([...pics, ...pics], rng);
    this.matched = [];
    this.open = null;
    this.turns = 0;
    this.solved = false;
  }
  picture(i) {
    return PAIR_PICTURES[this.cards[i]];
  }
  isUp(i) {
    return this.matched.includes(i) || this.open === i;
  }
  // 'first', 'pair', 'miss' (both go back over), or 'done' (the last pair).
  pick(i) {
    if (this.solved || i < 0 || i >= CARDS || this.isUp(i)) return null;
    if (this.open === null) {
      this.open = i;
      this.changed();
      return 'first';
    }
    const j = this.open;
    this.open = null;
    this.turns++;
    if (this.cards[i] !== this.cards[j]) {
      this.changed();
      return 'miss';
    }
    this.matched.push(j, i);
    return this.changed() ? 'done' : 'pair';
  }
  check() {
    return this.matched.length === CARDS;
  }
  serialize() {
    return { cards: this.cards.slice(), matched: this.matched.slice(), turns: this.turns };
  }
  deserialize(s) {
    const okCards =
      Array.isArray(s.cards) &&
      s.cards.length === CARDS &&
      s.cards.every((c) => Number.isInteger(c) && c >= 0 && c < PAIR_PICTURES.length && s.cards.filter((d) => d === c).length === 2);
    if (okCards) this.cards = s.cards.slice();
    if (Array.isArray(s.matched)) {
      // Only real pairs stay matched.
      const m = s.matched.filter((i, k, a) => Number.isInteger(i) && i >= 0 && i < CARDS && a.indexOf(i) === k);
      this.matched = m.filter((i) => m.some((j) => j !== i && this.cards[j] === this.cards[i]));
    }
    this.open = null;
    this.turns = s.turns | 0;
  }
  forceSolve() {
    this.open = null;
    for (let i = 0; i < CARDS; i++) {
      if (this.isUp(i)) continue;
      const j = this.cards.findIndex((c, k) => k !== i && c === this.cards[i]);
      this.pick(i);
      this.pick(j);
    }
  }
  hintVars() {
    // The pairs by card position, 1 to 12 (rows of four).
    const seen = new Set();
    const pairs = [];
    for (let i = 0; i < CARDS; i++) {
      if (seen.has(i) || this.matched.includes(i)) continue;
      const j = this.cards.findIndex((c, k) => k !== i && c === this.cards[i]);
      seen.add(i).add(j);
      pairs.push(`${i + 1} & ${j + 1} (${this.picture(i).name})`);
    }
    return { PAIRS: pairs.join(', ') };
  }
}
