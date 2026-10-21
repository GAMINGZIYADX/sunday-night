import { Puzzle } from './base.js';
import { SUDOKU_GIVENS, RANDOMIZE } from '../config.js';
import { solve, sizeOf, countSolutions, shuffleSudoku } from './sudokuMath.js';

// Room 4, puzzle B. 6x6 sudoku on the chalkboard (digits 1-6, 2x3 boxes).
// Each new game reshuffles the configured puzzle (same logic, new look).
export class SudokuPuzzle extends Puzzle {
  constructor() {
    super('r4b', 3, 'B');
    this.setGivens(SUDOKU_GIVENS);
  }
  setGivens(givens) {
    this.givens = givens.slice();
    this.n = sizeOf(this.givens);
    this.solution = solve(this.givens);
    this.grid = this.givens.slice();
  }
  newGame(rng = Math.random) {
    this.setGivens(RANDOMIZE ? shuffleSudoku(SUDOKU_GIVENS, rng) : SUDOKU_GIVENS);
    this.solved = false;
  }
  isGiven(i) {
    return this.givens[i] !== 0;
  }
  set(i, v) {
    if (this.solved || this.isGiven(i) || i < 0 || i >= this.grid.length) return false;
    this.grid[i] = v >= 1 && v <= this.n ? v | 0 : 0;
    return this.changed();
  }
  wrongCells() {
    return this.grid.map((v, i) => (v && v !== this.solution[i] ? i : -1)).filter((i) => i >= 0);
  }
  check() {
    return this.grid.every((v, i) => v === this.solution[i]);
  }
  serialize() {
    return { grid: this.grid.slice(), givens: this.givens.slice() };
  }
  deserialize(s) {
    // The saved board, if it is a proper one-solution puzzle; saves from
    // before the randomiser use the configured one.
    const g = s.givens;
    const ok =
      Array.isArray(g) &&
      g.length === SUDOKU_GIVENS.length &&
      g.every((v) => Number.isInteger(v) && v >= 0 && v <= this.n) &&
      g.filter(Boolean).length === SUDOKU_GIVENS.filter(Boolean).length &&
      countSolutions(g, 2).count === 1;
    this.setGivens(ok ? g : SUDOKU_GIVENS);
    if (Array.isArray(s.grid) && s.grid.length === this.grid.length)
      this.grid = s.grid.map((v, i) => (this.isGiven(i) ? this.givens[i] : v >= 1 && v <= this.n ? v | 0 : 0));
  }
  forceSolve() {
    this.grid = this.solution.slice();
    this.changed();
  }
  hintVars() {
    // Tier 3 looks at the actual board: point out a mistake, else reveal a cell.
    const n = this.n;
    const wrong = this.wrongCells();
    const rc = (i) => `row ${Math.floor(i / n) + 1}, column ${(i % n) + 1}`;
    if (wrong.length) return { SUDOKU: `Are you sure it is stuck? The number at ${rc(wrong[0])} does not fit yet. Clear it and try again.` };
    const empty = this.grid.findIndex((v) => v === 0);
    if (empty === -1) return { SUDOKU: 'Every cell is filled. Press Check.' };
    return { SUDOKU: `Are you sure it is stuck? Try ${this.solution[empty]} at ${rc(empty)}. Ask again for the next one.` };
  }
}
