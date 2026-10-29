import { Puzzle } from './base.js';
import { CONSTELLATION_LABELS, CONSTELLATION_DECOYS, RANDOMIZE } from '../config.js';

// Room 5, puzzle B. Twelve stars of a heart are labelled with the months'
// first letters (J F M A M J J A S O N D) and a few loose stars carry letters
// too. Letters repeat, so she has to follow the shape: each month's star sits
// next to the one before it. Wrong picks just fade.
//
// Star positions are in a unit box (0..1). Star 0 is the bottom tip of the
// heart, then up the left side, over the top and down the right.
export function heartStars(count = CONSTELLATION_LABELS.length) {
  const at = (t) => {
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return { x: 0.5 + x / 38, y: 0.5 - (y + 3) / 36 };
  };
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

// Loose lettered stars that are not part of the heart: the configured ones,
// or (randomiser) a new scatter each game. Kept away from the heart's outline
// and from each other, and inside the telescope's round view.
export const DECOY_GAP = 0.09; // closest a loose star may be to a heart star
export function decoyStars() {
  return CONSTELLATION_DECOYS.map(([x, y, label]) => ({ x, y, label }));
}
export function randomDecoys(rng = Math.random, count = CONSTELLATION_DECOYS.length) {
  const heart = heartStars();
  const letters = [...new Set(CONSTELLATION_LABELS)];
  const out = [];
  for (let tries = 0; out.length < count && tries < 5000; tries++) {
    const x = 0.04 + rng() * 0.92;
    const y = 0.04 + rng() * 0.92;
    // the view is an ellipse over the canvas (see constellationOverlay)
    const u = (x - 0.5) * 1.32;
    const v = (y - 0.5) * 1.56;
    if (u * u + v * v > 0.78) continue;
    if (heart.some((h) => Math.hypot(h.x - x, h.y - y) < DECOY_GAP + 0.02)) continue;
    if (out.some((d) => Math.hypot(d.x - x, d.y - y) < 0.13)) continue;
    out.push({ x: +x.toFixed(3), y: +y.toFixed(3), label: letters[Math.floor(rng() * letters.length)] });
  }
  return out.length === count ? out : decoyStars();
}

export class ConstellationPuzzle extends Puzzle {
  constructor() {
    super('r5b', 4, 'B');
    this.labels = CONSTELLATION_LABELS.slice();
    this.count = this.labels.length;
    this.progress = 0; // how many stars have been connected
    this.decoys = decoyStars();
  }
  newGame(rng = Math.random) {
    this.decoys = RANDOMIZE ? randomDecoys(rng, this.tune.decoys) : decoyStars().slice(0, this.tune.decoys);
    this.progress = 0;
    this.solved = false;
  }
  // index: a heart star (0..count-1) or -1 for a loose star. 'ok' | 'wrong' | 'done'.
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
    return { progress: this.progress, decoys: this.decoys.map((d) => ({ ...d })) };
  }
  deserialize(s) {
    this.progress = Math.max(0, Math.min(this.count, s.progress | 0));
    const ok =
      Array.isArray(s.decoys) &&
      s.decoys.length > 0 &&
      s.decoys.length <= 12 &&
      s.decoys.every((d) => d && Number.isFinite(d.x) && Number.isFinite(d.y) && /^[A-Z]$/.test(d.label));
    this.decoys = ok ? s.decoys.map(({ x, y, label }) => ({ x, y, label })) : decoyStars();
  }
  forceSolve() {
    this.progress = this.count;
    this.changed();
  }
}
