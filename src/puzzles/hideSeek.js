import { Puzzle, shuffled } from './base.js';
import { HIDING_SPOTS, CATS } from '../config.js';

// Room 4, puzzle A. Two cats hide in two of four spots (random per new game).
export class HideSeekPuzzle extends Puzzle {
  constructor() {
    super('r4a', 3, 'A');
    this.spots = { tchobin: 0, zizo: 2 }; // index into HIDING_SPOTS
    this.found = { tchobin: false, zizo: false };
  }
  newGame(rng) {
    const pick = shuffled([0, 1, 2, 3], rng);
    this.spots = { tchobin: pick[0], zizo: pick[1] };
    this.found = { tchobin: false, zizo: false };
    this.solved = false;
  }
  catAt(spotIndex) {
    for (const cat of Object.keys(this.spots)) if (this.spots[cat] === spotIndex) return cat;
    return null;
  }
  // Returns the cat id found at that spot (new find), or null.
  search(spotIndex) {
    if (this.solved) return null;
    const cat = this.catAt(spotIndex);
    if (!cat || this.found[cat]) {
      this.changed();
      return null;
    }
    this.found[cat] = true;
    this.changed();
    return cat;
  }
  check() {
    return this.found.tchobin && this.found.zizo;
  }
  serialize() {
    return { spots: { ...this.spots }, found: { ...this.found } };
  }
  deserialize(s) {
    const ok = (v) => Number.isInteger(v) && v >= 0 && v < HIDING_SPOTS.length;
    if (s.spots && ok(s.spots.tchobin) && ok(s.spots.zizo) && s.spots.tchobin !== s.spots.zizo) this.spots = { ...s.spots };
    if (s.found) this.found = { tchobin: !!s.found.tchobin, zizo: !!s.found.zizo };
  }
  forceSolve() {
    this.found = { tchobin: true, zizo: true };
    this.changed();
  }
  hintVars() {
    const parts = Object.keys(this.spots)
      .filter((c) => !this.found[c])
      .map((c) => `${CATS[c].name} is ${HIDING_SPOTS[this.spots[c]].label}`);
    return { SPOTS: parts.length ? parts.join('. ') + '.' : 'You found them both.' };
  }
}
