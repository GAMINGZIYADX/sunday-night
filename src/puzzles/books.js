import { Puzzle } from './base.js';
import { BOOK_ORDER } from '../config.js';

// Room 2, puzzle B. The shelf is tight: books can't be swapped freely. Turning
// a book spins it with its two neighbours (three books rotate one place).
// Every reachable order is an even permutation, and the scramble is made by
// turning from the solved order, so it is always solvable.
export class BooksPuzzle extends Puzzle {
  constructor() {
    super('r2b', 1, 'B');
    this.order = BOOK_ORDER.slice();
    this.turns = 0;
  }
  // A fresh scramble that needs `tune.books` turns at best (9 to 11 on
  // Normal: enough to make her think, not enough to be a slog).
  newGame(rng) {
    const pool = ordersNeeding(...this.tune.books);
    this.order = pool[Math.floor(rng() * pool.length)].slice();
    this.turns = 0;
    this.solved = false;
  }
  // The triple a click on book `i` turns (end books turn with their two neighbours).
  centerFor(i) {
    return Math.max(1, Math.min(this.order.length - 2, i));
  }
  _rotate(center, dir) {
    const a = center - 1;
    const t = this.order.slice(a, a + 3);
    const r = dir > 0 ? [t[2], t[0], t[1]] : [t[1], t[2], t[0]];
    this.order.splice(a, 3, ...r);
  }
  // dir +1: the three books move one place right (the right one wraps to the left).
  turn(i, dir = 1) {
    if (this.solved) return false;
    this._rotate(this.centerFor(i), dir);
    this.turns++;
    return this.changed();
  }
  check() {
    return this.order.every((b, i) => b === BOOK_ORDER[i]);
  }
  serialize() {
    return { order: this.order.slice(), turns: this.turns };
  }
  deserialize(s) {
    if (Array.isArray(s.order) && s.order.length === BOOK_ORDER.length && BOOK_ORDER.every((b) => s.order.includes(b)) && isEven(s.order))
      this.order = s.order.slice();
    this.turns = s.turns | 0;
  }
  forceSolve() {
    this.order = BOOK_ORDER.slice();
    this.changed();
  }
}

// True if `order` is an even permutation of BOOK_ORDER (reachable by turns).
export function isEven(order) {
  const idx = order.map((b) => BOOK_ORDER.indexOf(b));
  let inv = 0;
  for (let i = 0; i < idx.length; i++) for (let j = i + 1; j < idx.length; j++) if (idx[i] > idx[j]) inv++;
  return inv % 2 === 0;
}

// Every order reachable by turns, with the fewest turns needed to sort it.
let _dist = null;
export function turnDistances() {
  if (_dist) return _dist;
  const key = (o) => o.join(',');
  _dist = new Map([[key(BOOK_ORDER), 0]]);
  let frontier = [BOOK_ORDER.slice()];
  for (let d = 1; frontier.length; d++) {
    const next = [];
    for (const o of frontier)
      for (let c = 1; c <= o.length - 2; c++)
        for (const dir of [1, -1]) {
          const q = o.slice();
          const t = q.slice(c - 1, c + 2);
          q.splice(c - 1, 3, ...(dir > 0 ? [t[2], t[0], t[1]] : [t[1], t[2], t[0]]));
          const k = key(q);
          if (!_dist.has(k)) {
            _dist.set(k, d);
            next.push(q);
          }
        }
    frontier = next;
  }
  return _dist;
}

const _pools = {};
export function ordersNeeding(min, max) {
  const key = `${min}-${max}`;
  if (_pools[key]) return _pools[key];
  const pool = [];
  for (const [k, d] of turnDistances()) if (d >= min && d <= max) pool.push(k.split(','));
  return (_pools[key] = pool);
}
