import { Puzzle, shuffled } from './base.js';
import { WATER_DAYS, WATER_PLANTS } from '../config.js';

// The greenhouse, first puzzle. Six pots, each with a tag saying the day it
// was last watered. Today is Sunday, so the pot watered longest ago (Monday)
// is the thirstiest: water them thirstiest first. A pot out of turn and the
// can comes back up: start again. Every game picks six plants and deals out
// the days anew.
export const GREENHOUSE = 7; // room index
export const POTS = 6;

export class WaterPuzzle extends Puzzle {
  constructor() {
    super('water', GREENHOUSE, 'X');
    this.plants = WATER_PLANTS.slice(0, POTS).map((_, i) => i);
    this.days = [0, 1, 2, 3, 4, 5];
    this.watered = [];
  }
  newGame(rng) {
    this.plants = shuffled(
      WATER_PLANTS.map((_, i) => i),
      rng,
    ).slice(0, POTS);
    do this.days = shuffled([0, 1, 2, 3, 4, 5], rng);
    while (this.days.every((d, i) => d === i)); // never already in pot order
    this.watered = [];
    this.solved = false;
  }
  plant(i) {
    return WATER_PLANTS[this.plants[i]];
  }
  day(i) {
    return WATER_DAYS[this.days[i]];
  }
  // Pots from thirstiest to least thirsty.
  order() {
    return [0, 1, 2, 3, 4, 5].sort((a, b) => this.days[a] - this.days[b]);
  }
  isWatered(i) {
    return this.watered.includes(i);
  }
  // 'ok', 'wrong' (everything waits to be watered again), 'solved' or 'done'.
  water(i) {
    if (this.solved) return 'done';
    if (i < 0 || i >= POTS || this.isWatered(i)) return 'ok';
    if (this.order()[this.watered.length] !== i) {
      this.watered = [];
      this.changed();
      return 'wrong';
    }
    this.watered.push(i);
    return this.changed() ? 'solved' : 'ok';
  }
  check() {
    return this.watered.length === POTS;
  }
  serialize() {
    return { plants: this.plants.slice(), days: this.days.slice(), watered: this.watered.slice() };
  }
  deserialize(s) {
    const perm = (a, n, max) =>
      Array.isArray(a) && a.length === n && new Set(a).size === n && a.every((v) => Number.isInteger(v) && v >= 0 && v < max);
    if (perm(s.plants, POTS, WATER_PLANTS.length)) this.plants = s.plants.slice();
    if (perm(s.days, POTS, POTS)) this.days = s.days.slice();
    if (Array.isArray(s.watered)) {
      // Only a correct start of the order is kept.
      const o = this.order();
      const w = [];
      for (const v of s.watered) if (o[w.length] === v) w.push(v);
      this.watered = w;
    }
  }
  forceSolve() {
    this.watered = [];
    for (const i of this.order()) this.water(i);
  }
  hintVars() {
    const names = this.order().map((i) => this.plant(i).name);
    return { FIRST: names[0], ORDER: names.join(', ') };
  }
}
