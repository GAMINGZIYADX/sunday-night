import { Puzzle, shuffled } from './base.js';
import { HIDING_SPOTS, CATS } from '../config.js';

// Room 4, puzzle A. Two cats hide in two of six spots. Looking in an empty
// spot makes the cats still hiding sneak somewhere else, so guessing does not
// work: she has to listen to where the meows come from and look for a tail or
// ears peeking out.
export class HideSeekPuzzle extends Puzzle {
  constructor() {
    super('r4a', 3, 'A');
    this.spots = { tchobin: 0, zizo: 2 }; // index into HIDING_SPOTS
    this.found = { tchobin: false, zizo: false };
    this.misses = 0;
  }
  newGame(rng) {
    const pick = shuffled([...HIDING_SPOTS.keys()], rng);
    this.spots = { tchobin: pick[0], zizo: pick[1] };
    this.found = { tchobin: false, zizo: false };
    this.misses = 0;
    this.solved = false;
  }
  catAt(spotIndex) {
    for (const cat of Object.keys(this.spots)) if (this.spots[cat] === spotIndex) return cat;
    return null;
  }
  // Returns the cat id found at that spot (new find), or null. A miss moves
  // every unfound cat to a different free spot (never the one just searched).
  search(spotIndex, rng = Math.random) {
    if (this.solved) return null;
    const cat = this.catAt(spotIndex);
    if (cat && !this.found[cat]) {
      this.found[cat] = true;
      this.changed();
      return cat;
    }
    if (!cat) {
      this.misses++;
      this.relocate(rng, spotIndex);
    }
    this.changed();
    return null;
  }
  relocate(rng, avoid) {
    for (const c of Object.keys(this.spots)) {
      if (this.found[c]) continue;
      const taken = new Set(Object.values(this.spots));
      const free = [...HIDING_SPOTS.keys()].filter((i) => !taken.has(i) && i !== avoid);
      if (free.length) this.spots[c] = free[Math.floor(rng() * free.length)];
    }
  }
  check() {
    return this.found.tchobin && this.found.zizo;
  }
  serialize() {
    return { spots: { ...this.spots }, found: { ...this.found }, misses: this.misses };
  }
  deserialize(s) {
    const ok = (v) => Number.isInteger(v) && v >= 0 && v < HIDING_SPOTS.length;
    if (s.spots && ok(s.spots.tchobin) && ok(s.spots.zizo) && s.spots.tchobin !== s.spots.zizo) this.spots = { ...s.spots };
    if (s.found) this.found = { tchobin: !!s.found.tchobin, zizo: !!s.found.zizo };
    this.misses = s.misses | 0;
  }
  forceSolve() {
    this.found = { tchobin: true, zizo: true };
    this.changed();
  }
  hintVars() {
    const parts = Object.keys(this.spots)
      .filter((c) => !this.found[c])
      .map((c) => `${CATS[c].name} is ${HIDING_SPOTS[this.spots[c]].label} right now`);
    return { SPOTS: parts.length ? parts.join('. ') + '.' : 'You found them both.' };
  }
}
