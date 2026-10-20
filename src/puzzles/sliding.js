import { Puzzle } from './base.js';

// Room 1, puzzle B. 3x3 sliding picture. Tiles are numbered 1..8, 0 is the
// gap. Solved layout is [1,2,3,4,5,6,7,8,0].
export const N = 3;
export const SOLVED_TILES = [1, 2, 3, 4, 5, 6, 7, 8, 0];

export function neighbours(index) {
  const r = Math.floor(index / N);
  const c = index % N;
  const out = [];
  if (r > 0) out.push(index - N);
  if (r < N - 1) out.push(index + N);
  if (c > 0) out.push(index - 1);
  if (c < N - 1) out.push(index + 1);
  return out;
}

// Standard solvability test for odd-width boards: even number of inversions.
export function isSolvable(tiles) {
  const t = tiles.filter((v) => v !== 0);
  let inv = 0;
  for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) if (t[i] > t[j]) inv++;
  return inv % 2 === 0;
}

// Shuffle by walking random legal moves away from the solved state, so the
// result is always solvable. Never steps straight back.
export function shuffleTiles(rng, moves = 120) {
  let tiles;
  do {
    tiles = SOLVED_TILES.slice();
    let gap = tiles.indexOf(0);
    let prev = -1;
    for (let m = 0; m < moves; m++) {
      const options = neighbours(gap).filter((n) => n !== prev);
      const pick = options[Math.floor(rng() * options.length)];
      tiles[gap] = tiles[pick];
      tiles[pick] = 0;
      prev = gap;
      gap = pick;
    }
  } while (misplaced(tiles) < Math.min(5, moves));
  return tiles;
}

export function misplaced(tiles) {
  return tiles.reduce((n, v, i) => n + (v !== 0 && v !== SOLVED_TILES[i] ? 1 : 0), 0);
}

export class SlidingPuzzle extends Puzzle {
  constructor() {
    super('r1b', 0, 'B');
    this.tiles = [1, 2, 3, 4, 5, 6, 0, 7, 8];
    this.moves = 0;
  }
  newGame(rng) {
    this.tiles = shuffleTiles(rng, 140);
    this.moves = 0;
    this.solved = false;
  }
  // A "gentle shuffle" for when it feels tangled: only a handful of moves.
  gentleShuffle(rng) {
    if (this.solved) return;
    this.tiles = shuffleTiles(rng, 10);
    this.moves = 0;
    this.changed();
  }
  get gap() {
    return this.tiles.indexOf(0);
  }
  canMove(index) {
    return !this.solved && neighbours(this.gap).includes(index);
  }
  move(index) {
    if (!this.canMove(index)) return false;
    const g = this.gap;
    this.tiles[g] = this.tiles[index];
    this.tiles[index] = 0;
    this.moves++;
    this.changed();
    return true;
  }
  // dir: the direction the tile travels ('up' moves the tile below the gap up).
  moveDir(dir) {
    const g = this.gap;
    const r = Math.floor(g / N);
    const c = g % N;
    const from = {
      up: r < N - 1 ? g + N : -1,
      down: r > 0 ? g - N : -1,
      left: c < N - 1 ? g + 1 : -1,
      right: c > 0 ? g - 1 : -1,
    }[dir];
    return from >= 0 ? this.move(from) : false;
  }
  check() {
    return this.tiles.every((v, i) => v === SOLVED_TILES[i]);
  }
  serialize() {
    return { tiles: this.tiles.slice(), moves: this.moves };
  }
  deserialize(s) {
    if (Array.isArray(s.tiles) && s.tiles.length === 9 && [...s.tiles].sort().join() === '0,1,2,3,4,5,6,7,8' && isSolvable(s.tiles))
      this.tiles = s.tiles.slice();
    this.moves = s.moves | 0;
  }
  forceSolve() {
    this.tiles = SOLVED_TILES.slice();
    this.changed();
  }
}
