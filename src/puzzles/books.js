import { Puzzle, shuffled } from './base.js';
import { BOOK_ORDER } from '../config.js';

// Room 2, puzzle B. Sort eight books into rainbow order by swapping.
export class BooksPuzzle extends Puzzle {
  constructor() {
    super('r2b', 1, 'B');
    this.order = BOOK_ORDER.slice().reverse();
  }
  newGame(rng) {
    let o;
    // Keep it a real puzzle: at least five books out of place.
    do o = shuffled(BOOK_ORDER, rng);
    while (o.filter((b, i) => b === BOOK_ORDER[i]).length > 3);
    this.order = o;
    this.solved = false;
  }
  swap(i, j) {
    if (this.solved || i === j) return false;
    [this.order[i], this.order[j]] = [this.order[j], this.order[i]];
    return this.changed();
  }
  check() {
    return this.order.every((b, i) => b === BOOK_ORDER[i]);
  }
  serialize() {
    return { order: this.order.slice() };
  }
  deserialize(s) {
    if (Array.isArray(s.order) && s.order.length === BOOK_ORDER.length && BOOK_ORDER.every((b) => s.order.includes(b))) this.order = s.order.slice();
  }
  forceSolve() {
    this.order = BOOK_ORDER.slice();
    this.changed();
  }
}
