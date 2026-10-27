import { Puzzle } from './base.js';
import { LANTERN_PICTURES } from '../config.js';

// The balcony, first puzzle. A 5×5 net of paper lanterns strung over the
// balcony, with numbers along a row and down a column: the runs of lit
// lanterns in that line, in order ("2 1" is two lit, a gap, then one). Light
// the right ones and they draw a picture in the night. Every game picks a
// picture, maybe mirrored, from LANTERN_PICTURES (each has one answer only).
export const BALCONY = 9; // room index
export const GN = 5;

export const runs = (line) => {
  const out = [];
  let n = 0;
  for (const v of line) {
    if (v) n++;
    else if (n) (out.push(n), (n = 0));
  }
  if (n) out.push(n);
  return out;
};
const lineOf = (cells, k, col) => Array.from({ length: GN }, (_, j) => cells[col ? j * GN + k : k * GN + j]);
export function cluesOf(cells) {
  return {
    rows: Array.from({ length: GN }, (_, k) => runs(lineOf(cells, k, false))),
    cols: Array.from({ length: GN }, (_, k) => runs(lineOf(cells, k, true))),
  };
}
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// How many pictures fit the clues (stops at `limit`): rows are tried from
// every line that fits their own clue, checking columns as it goes.
export function countSolutions(clues, limit = 2) {
  const lines = [];
  for (let m = 0; m < 1 << GN; m++) lines.push(Array.from({ length: GN }, (_, j) => !!(m & (1 << j))));
  const rowOpts = clues.rows.map((c) => lines.filter((l) => same(runs(l), c)));
  const grid = [];
  let count = 0;
  const colPrefixOk = (rowsDone) => {
    for (let c = 0; c < GN; c++) {
      const col = grid.map((r) => r[c]);
      const want = clues.cols[c];
      const got = runs(col);
      if (rowsDone === GN) {
        if (!same(got, want)) return false;
      } else {
        // The finished runs so far must match the start of the clue.
        const closed = col[col.length - 1] ? got.slice(0, -1) : got;
        if (closed.length > want.length || closed.some((v, i) => v !== want[i])) return false;
        if (col[col.length - 1] && got[got.length - 1] > (want[got.length - 1] ?? 0)) return false;
      }
    }
    return true;
  };
  const place = (r) => {
    if (count >= limit) return;
    if (r === GN) {
      count++;
      return;
    }
    for (const l of rowOpts[r]) {
      grid.push(l);
      if (colPrefixOk(r + 1)) place(r + 1);
      grid.pop();
    }
  };
  place(0);
  return count;
}

export const pictureCells = (p, mirror) => p.rows.flatMap((row) => (mirror ? [...row].reverse() : [...row]).map((ch) => ch === '#'));

export class LanternsPuzzle extends Puzzle {
  constructor() {
    super('lanterns', BALCONY, 'X');
    this.picture = 0;
    this.mirror = false;
    this.lit = Array(GN * GN).fill(false);
  }
  newGame(rng) {
    this.picture = Math.floor(rng() * LANTERN_PICTURES.length);
    this.mirror = rng() < 0.5;
    this.lit = Array(GN * GN).fill(false);
    this.solved = false;
  }
  get target() {
    return pictureCells(LANTERN_PICTURES[this.picture], this.mirror);
  }
  get clues() {
    return cluesOf(this.target);
  }
  get name() {
    return LANTERN_PICTURES[this.picture].name;
  }
  toggle(i) {
    if (this.solved || i < 0 || i >= GN * GN) return;
    this.lit[i] = !this.lit[i];
    this.changed();
  }
  // Rows and columns whose lit lanterns already match their numbers.
  lineDone(k, col) {
    const want = col ? this.clues.cols[k] : this.clues.rows[k];
    return same(runs(lineOf(this.lit, k, col)), want);
  }
  check() {
    const c = cluesOf(this.lit);
    const t = this.clues;
    return c.rows.every((r, k) => same(r, t.rows[k])) && c.cols.every((r, k) => same(r, t.cols[k]));
  }
  serialize() {
    return { picture: this.picture, mirror: this.mirror, lit: this.lit.map((v) => (v ? 1 : 0)) };
  }
  deserialize(s) {
    if (Number.isInteger(s.picture) && s.picture >= 0 && s.picture < LANTERN_PICTURES.length) this.picture = s.picture;
    this.mirror = !!s.mirror;
    if (Array.isArray(s.lit) && s.lit.length === GN * GN) this.lit = s.lit.map((v) => !!v);
  }
  forceSolve() {
    this.lit = this.target.slice();
    this.changed();
  }
  hintVars() {
    const t = this.target;
    const rows = Array.from({ length: GN }, (_, r) => {
      const lit = [];
      for (let c = 0; c < GN; c++) if (t[r * GN + c]) lit.push(c + 1);
      return `row ${r + 1}: ${lit.join(' ') || 'none'}`;
    });
    return { NAME: this.name, ROWS: rows.join('; ') };
  }
}
