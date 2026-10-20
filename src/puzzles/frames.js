import { Puzzle, shuffled } from './base.js';

// Room 1, puzzle A. Three frames: far -> closer -> together.
export const FRAME_SOLUTION = ['far', 'closer', 'together'];

export class FramesPuzzle extends Puzzle {
  constructor() {
    super('r1a', 0, 'A');
    this.order = ['together', 'far', 'closer'];
  }
  newGame(rng) {
    let o;
    do o = shuffled(FRAME_SOLUTION, rng);
    while (o.every((v, i) => v === FRAME_SOLUTION[i]));
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
    if (Array.isArray(s.order) && s.order.length === 3 && FRAME_SOLUTION.every((f) => s.order.includes(f))) this.order = s.order.slice();
  }
  forceSolve() {
    this.order = FRAME_SOLUTION.slice();
    this.changed();
  }
}
