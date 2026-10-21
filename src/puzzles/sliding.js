import { Puzzle } from './base.js';

// Room 1, puzzle B. 4x4 sliding picture (the classic fifteen puzzle). Tiles
// are numbered 1..15, 0 is the gap. Solved layout is [1..15, 0].
export const N = 4;
export const SOLVED_TILES = [...Array(N * N - 1).keys()].map((i) => i + 1).concat(0);

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

function inversions(tiles) {
  const t = tiles.filter((v) => v !== 0);
  let inv = 0;
  for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) if (t[i] > t[j]) inv++;
  return inv;
}

// Solvability: odd width -> inversions even. Even width -> inversions plus the
// gap's row counted from the bottom (1-based) must be odd.
export function isSolvable(tiles) {
  const inv = inversions(tiles);
  if (N % 2 === 1) return inv % 2 === 0;
  const rowFromBottom = N - Math.floor(tiles.indexOf(0) / N);
  return (inv + rowFromBottom) % 2 === 1;
}

export function misplaced(tiles) {
  return tiles.reduce((n, v, i) => n + (v !== 0 && v !== SOLVED_TILES[i] ? 1 : 0), 0);
}

// Shuffle by walking random legal moves away from the solved state, so the
// result is always solvable. Never steps straight back.
export function shuffleTiles(rng, moves = 200) {
  let tiles;
  const want = Math.min(Math.floor(moves / 2), N * N - 3);
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
  } while (misplaced(tiles) < want);
  return tiles;
}

export class SlidingPuzzle extends Puzzle {
  constructor() {
    super('r1b', 0, 'B');
    this.tiles = SOLVED_TILES.slice();
    [this.tiles[14], this.tiles[15]] = [0, 15];
    this.moves = 0;
  }
  newGame(rng) {
    this.tiles = shuffleTiles(rng, 220);
    this.moves = 0;
    this.solved = false;
  }
  // A "gentle shuffle" for when it feels tangled: only a few moves away.
  gentleShuffle(rng) {
    if (this.solved) return;
    this.tiles = shuffleTiles(rng, 14);
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
    const valid = Array.isArray(s.tiles) && s.tiles.length === N * N && [...s.tiles].sort((a, b) => a - b).every((v, i) => v === i);
    if (valid && isSolvable(s.tiles)) this.tiles = s.tiles.slice();
    this.moves = s.moves | 0;
  }
  forceSolve() {
    this.tiles = SOLVED_TILES.slice();
    this.changed();
  }
}
