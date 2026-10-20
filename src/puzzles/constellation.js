import { Puzzle } from './base.js';
import { CONSTELLATION_STARS } from '../config.js';

// Room 5, puzzle B. Connect the numbered stars into a heart.
// Star positions in a unit box (0..1), star 0 is the bottom tip of the heart,
// then up the left side, over the top and down the right.
export function heartStars(count = CONSTELLATION_STARS) {
  const at = (t) => {
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return { x: 0.5 + x / 38, y: 0.5 - (y + 3) / 36 };
  };
  // Walk the curve from the bottom tip (t = PI) up the left side, and place
  // the stars at equal distances along it so the heart reads clearly.
  const N = 720;
  const samples = [];
  let total = 0;
  for (let i = 0; i <= N; i++) {
    const p = at(Math.PI + (i / N) * Math.PI * 2);
    if (i) total += Math.hypot(p.x - samples[i - 1].p.x, p.y - samples[i - 1].p.y);
    samples.push({ p, d: total });
  }
  const pts = [];
  let j = 0;
  for (let k = 0; k < count; k++) {
    const want = (k / count) * total;
    while (j < N && samples[j + 1].d < want) j++;
    pts.push({ ...samples[j].p });
  }
  return pts;
}

export class ConstellationPuzzle extends Puzzle {
  constructor() {
    super('r5b', 4, 'B');
    this.count = CONSTELLATION_STARS;
    this.progress = 0; // how many stars have been connected
  }
  newGame() {
    this.progress = 0;
    this.solved = false;
  }
  // Returns 'ok', 'wrong' or 'done'.
  pick(index) {
    if (this.solved) return 'done';
    if (index !== this.progress) {
      this.changed();
      return 'wrong';
    }
    this.progress++;
    return this.changed() ? 'done' : 'ok';
  }
  check() {
    return this.progress >= this.count;
  }
  serialize() {
    return { progress: this.progress };
  }
  deserialize(s) {
    this.progress = Math.max(0, Math.min(this.count, s.progress | 0));
  }
  forceSolve() {
    this.progress = this.count;
    this.changed();
  }
}
