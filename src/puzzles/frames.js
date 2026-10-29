import { Puzzle, shuffled } from './base.js';

// Room 1, puzzle A. Five frames. Each shows the two tulips at some distance
// and in some season. Distance alone has ties (two "far", two "closer"), and
// so do the seasons (two winters): only both clues together give one order.
export const FRAME_SOLUTION = ['winter-far', 'spring-far', 'summer-closer', 'autumn-closer', 'winter-together'];

export class FramesPuzzle extends Puzzle {
  constructor() {
    super('r1a', 0, 'A');
    this.order = ['autumn-closer', 'winter-together', 'spring-far', 'winter-far', 'summer-closer'];
  }
  newGame(rng) {
    let o;
    // A real scramble: at most `tune.frames` frames already in their place.
    do o = shuffled(FRAME_SOLUTION, rng);
    while (o.filter((v, i) => v === FRAME_SOLUTION[i]).length > this.tune.frames || o.every((v, i) => v === FRAME_SOLUTION[i]));
    this.order = o;
    this.solved = false;
  }
  swap(i, j) {
    if (this.solved || i === j) return false;
    [this.order[i], this.order[j]] = [this.order[j], this.order[i]];
    return this.changed();
  }
  check() {
    return this.order.every((v, i) => v === FRAME_SOLUTION[i]);
  }
  serialize() {
    return { order: this.order.slice() };
  }
  deserialize(s) {
    if (Array.isArray(s.order) && s.order.length === FRAME_SOLUTION.length && FRAME_SOLUTION.every((f) => s.order.includes(f)))
      this.order = s.order.slice();
  }
  forceSolve() {
    this.order = FRAME_SOLUTION.slice();
    this.changed();
  }
}
