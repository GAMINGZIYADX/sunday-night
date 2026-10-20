import { Puzzle } from './base.js';
import { SUDOKU_GIVENS } from '../config.js';
import { solve } from './sudokuMath.js';

// Room 4, puzzle B. 4x4 sudoku on the chalkboard.
export class SudokuPuzzle extends Puzzle {
  constructor() {
    super('r4b', 3, 'B');
    this.givens = SUDOKU_GIVENS.slice();
    this.solution = solve(this.givens);
    this.grid = this.givens.slice();
  }
  newGame() {
    this.grid = this.givens.slice();
    this.solved = false;
  }
  isGiven(i) {
    return this.givens[i] !== 0;
  }
  set(i, v) {
    if (this.solved || this.isGiven(i) || i < 0 || i > 15) return false;
    this.grid[i] = v >= 1 && v <= 4 ? v | 0 : 0;
    return this.changed();
  }
  wrongCells() {
    return this.grid.map((v, i) => (v && v !== this.solution[i] ? i : -1)).filter((i) => i >= 0);
  }
  check() {
    return this.grid.every((v, i) => v === this.solution[i]);
  }
  serialize() {
    return { grid: this.grid.slice() };
  }
  deserialize(s) {
    if (Array.isArray(s.grid) && s.grid.length === 16)
      this.grid = s.grid.map((v, i) => (this.isGiven(i) ? this.givens[i] : v >= 1 && v <= 4 ? v | 0 : 0));
  }
  forceSolve() {
    this.grid = this.solution.slice();
    this.changed();
  }
  hintVars() {
    // Tier 3 looks at the actual board: point out a mistake, else reveal a cell.
    const wrong = this.wrongCells();
    const rc = (i) => `row ${Math.floor(i / 4) + 1}, column ${(i % 4) + 1}`;
    if (wrong.length) {
      return {
        SUDOKU: `Are you sure it is stuck? The number at ${rc(wrong[0])} does not fit yet. Clear it and try again.`,
      };
    }
    const empty = this.grid.findIndex((v) => v === 0);
    if (empty === -1) return { SUDOKU: 'Every cell is filled. Press Check.' };
    return {
      SUDOKU: `Are you sure it is stuck? Try ${this.solution[empty]} at ${rc(empty)}. Ask again for the next one.`,
    };
  }
}
