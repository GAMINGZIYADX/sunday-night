import { Puzzle } from './base.js';
import { BASEMENT } from './fuses.js';

// The basement, second puzzle. A 5×5 board of pipe pieces between the water
// tap (left edge) and the boiler (right edge). Turn pieces until the water
// gets through; any way through counts. Every game lays a new winding route,
// fills the rest with spare pieces and turns everything at random.
export const PN = 5;
// A piece is a mask of its open sides.
export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;
const STEP = { [N]: [0, -1], [E]: [1, 0], [S]: [0, 1], [W]: [-1, 0] };
const OPP = { [N]: S, [E]: W, [S]: N, [W]: E };
export const turn = (m) => ((m << 1) | (m >> 3)) & 15; // a quarter turn clockwise
const SPARES = [N | S, E | W, N | E, E | S, S | W, W | N, N | E | S, E | S | W];

// Where the water reaches from the tap (entering cell (0, tapRow) from the
// west). Returns the set of cell indexes, and whether it leaves to the boiler.
export function flow(masks, tapRow, boilerRow) {
  const start = tapRow * PN;
  const seen = new Set();
  if (!(masks[start] & W)) return { cells: seen, through: false };
  const todo = [start];
  seen.add(start);
  while (todo.length) {
    const i = todo.pop();
    const x = i % PN;
    const y = Math.floor(i / PN);
    for (const d of [N, E, S, W]) {
      if (!(masks[i] & d)) continue;
      const nx = x + STEP[d][0];
      const ny = y + STEP[d][1];
      if (nx < 0 || ny < 0 || nx >= PN || ny >= PN) continue;
      const j = ny * PN + nx;
      if (!(masks[j] & OPP[d]) || seen.has(j)) continue;
      seen.add(j);
      todo.push(j);
    }
  }
  const end = boilerRow * PN + PN - 1;
  return { cells: seen, through: seen.has(end) && !!(masks[end] & E) };
}

// A random winding route of at least `min` cells from (0, a) to (PN-1, b).
function route(a, b, rng, min) {
  for (let tries = 0; tries < 400; tries++) {
    const path = [[0, a]];
    const used = new Set([a * PN]);
    let ok = false;
    for (let guard = 0; guard < 60; guard++) {
      const [x, y] = path[path.length - 1];
      if (x === PN - 1 && y === b) {
        ok = path.length >= min;
        break;
      }
      const opts = [N, E, S, W]
        .map((d) => [x + STEP[d][0], y + STEP[d][1]])
        .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < PN && ny < PN && !used.has(ny * PN + nx));
      if (!opts.length) break;
      const [nx, ny] = opts[Math.floor(rng() * opts.length)];
      path.push([nx, ny]);
      used.add(ny * PN + nx);
    }
    if (ok) return path;
  }
  // Fallback, never needed in practice: along the top, then down.
  const p = [];
  for (let x = 0; x < PN; x++) p.push([x, a]);
  for (let y = a; y !== b; y += Math.sign(b - a)) p.push([PN - 1, y + Math.sign(b - a)]);
  return p;
}

const dirTo = ([x, y], [nx, ny]) => (nx > x ? E : nx < x ? W : ny > y ? S : N);

export class PipesPuzzle extends Puzzle {
  constructor() {
    super('pipes', BASEMENT, 'X');
    this.tapRow = 0;
    this.boilerRow = PN - 1;
    this.masks = Array(PN * PN).fill(E | W);
    this.path = [];
    this.moves = 0;
  }
  newGame(rng) {
    this.tapRow = Math.floor(rng() * PN);
    this.boilerRow = Math.floor(rng() * PN);
    const path = route(this.tapRow, this.boilerRow, rng, 9);
    const masks = Array.from({ length: PN * PN }, () => SPARES[Math.floor(rng() * SPARES.length)]);
    path.forEach((c, k) => {
      const into = k === 0 ? W : OPP[dirTo(path[k - 1], c)];
      const out = k === path.length - 1 ? E : dirTo(c, path[k + 1]);
      masks[c[1] * PN + c[0]] = into | out;
    });
    this.path = path.map(([x, y]) => y * PN + x);
    this.solution = masks.slice();
    // Turn every piece at random (but never leave it already flowing).
    do this.masks = masks.map((m) => [0, 1, 2, 3].slice(0, 1 + Math.floor(rng() * 4)).reduce((v, k) => (k ? turn(v) : v), m));
    while (flow(this.masks, this.tapRow, this.boilerRow).through);
    this.moves = 0;
    this.solved = false;
  }
  rotate(i) {
    if (this.solved || i < 0 || i >= PN * PN) return;
    this.masks[i] = turn(this.masks[i]);
    this.moves++;
    this.changed();
  }
  wet() {
    return flow(this.masks, this.tapRow, this.boilerRow).cells;
  }
  check() {
    return flow(this.masks, this.tapRow, this.boilerRow).through;
  }
  serialize() {
    return {
      tapRow: this.tapRow,
      boilerRow: this.boilerRow,
      masks: this.masks.slice(),
      solution: this.solution?.slice(),
      path: this.path.slice(),
      moves: this.moves,
    };
  }
  deserialize(s) {
    const okMasks = (a) => Array.isArray(a) && a.length === PN * PN && a.every((m) => Number.isInteger(m) && m > 0 && m < 16);
    const row = (v) => Number.isInteger(v) && v >= 0 && v < PN;
    if (okMasks(s.masks) && okMasks(s.solution) && row(s.tapRow) && row(s.boilerRow) && flow(s.solution, s.tapRow, s.boilerRow).through) {
      this.masks = s.masks.slice();
      this.solution = s.solution.slice();
      this.tapRow = s.tapRow;
      this.boilerRow = s.boilerRow;
      this.path = Array.isArray(s.path) ? s.path.filter((i) => Number.isInteger(i)) : [];
    }
    this.moves = s.moves | 0;
  }
  forceSolve() {
    for (const i of this.path) while (this.masks[i] !== this.solution[i] && !this.solved) this.rotate(i);
  }
  hintVars() {
    // The route as a list of turns, e.g. "right, right, down, ...".
    const word = { [N]: 'up', [E]: 'right', [S]: 'down', [W]: 'left' };
    const steps = [];
    for (let k = 1; k < this.path.length; k++) {
      const a = this.path[k - 1];
      const b = this.path[k];
      steps.push(word[dirTo([a % PN, Math.floor(a / PN)], [b % PN, Math.floor(b / PN)])]);
    }
    return { ROUTE: steps.join(', '), TAPROW: this.tapRow + 1, BOILERROW: this.boilerRow + 1 };
  }
}
