import { describe, it, expect } from 'vitest';
import { SlidingPuzzle, shuffleTiles, isSolvable, neighbours, SOLVED_TILES } from '../src/puzzles/sliding.js';
import { countSolutions, isValidComplete } from '../src/puzzles/sudokuMath.js';
import { caesarEncode, caesarDecode } from '../src/puzzles/cipherMath.js';
import { tulipRule, VasePuzzle } from '../src/puzzles/vase.js';
import { dialRuleHolds, DialsPuzzle } from '../src/puzzles/dials.js';
import { FramesPuzzle } from '../src/puzzles/frames.js';
import { BooksPuzzle } from '../src/puzzles/books.js';
import { CipherPuzzle } from '../src/puzzles/cipher.js';
import { HideSeekPuzzle } from '../src/puzzles/hideSeek.js';
import { SudokuPuzzle } from '../src/puzzles/sudoku.js';
import { LockPuzzle } from '../src/puzzles/lock.js';
import { ConstellationPuzzle, heartStars } from '../src/puzzles/constellation.js';
import { mulberry32 } from '../src/puzzles/base.js';
import { SUDOKU_GIVENS, CIPHER_WORD, CIPHER_SHIFT, CIPHER_ENCODED, DIAL_SOLUTION, LOCK_CODE, HINTS, NOTES, FINAL_MESSAGE } from '../src/config.js';

// Breadth-first search over sliding states: proves a board can actually be
// solved (not just that the parity test says so).
function bfsSolvable(tiles) {
  const goal = SOLVED_TILES.join();
  const start = tiles.join();
  const seen = new Set([start]);
  let frontier = [tiles];
  while (frontier.length) {
    const next = [];
    for (const t of frontier) {
      if (t.join() === goal) return true;
      const g = t.indexOf(0);
      for (const n of neighbours(g)) {
        const c = t.slice();
        c[g] = c[n];
        c[n] = 0;
        const k = c.join();
        if (!seen.has(k)) {
          seen.add(k);
          next.push(c);
        }
      }
    }
    frontier = next;
  }
  return false;
}

describe('sliding puzzle', () => {
  it('shuffles are always solvable (parity) over many seeds', () => {
    for (let seed = 1; seed <= 2000; seed++) {
      const tiles = shuffleTiles(mulberry32(seed), 140);
      expect(isSolvable(tiles)).toBe(true);
      expect([...tiles].sort().join()).toBe('0,1,2,3,4,5,6,7,8');
    }
  });
  it('shuffles are solvable by actual search', () => {
    for (let seed = 1; seed <= 6; seed++) expect(bfsSolvable(shuffleTiles(mulberry32(seed * 7), 140))).toBe(true);
  });
  it('a new game is never already solved, and moves work', () => {
    for (let seed = 1; seed < 200; seed++) {
      const p = new SlidingPuzzle();
      p.newGame(mulberry32(seed));
      expect(p.isSolved()).toBe(false);
    }
    const p = new SlidingPuzzle();
    p.setState({ tiles: [1, 2, 3, 4, 5, 6, 7, 0, 8] });
    expect(p.move(0)).toBe(false); // not adjacent
    expect(p.moveDir('left')).toBe(true);
    expect(p.isSolved()).toBe(true);
  });
  it('rejects unsolvable saved boards', () => {
    const p = new SlidingPuzzle();
    const before = p.getState().tiles;
    p.setState({ tiles: [2, 1, 3, 4, 5, 6, 7, 8, 0] });
    expect(p.getState().tiles).toEqual(before);
  });
});

describe('sudoku', () => {
  it('configured puzzle has exactly one solution', () => {
    const { count, solution } = countSolutions(SUDOKU_GIVENS, 5);
    expect(count).toBe(1);
    expect(isValidComplete(solution)).toBe(true);
  });
  it('counts multiple solutions for an empty board', () => {
    expect(countSolutions(new Array(16).fill(0), 3).count).toBe(3);
  });
  it('puzzle solves via set() and hint tier 3 always moves her forward', () => {
    const p = new SudokuPuzzle();
    // Following tier-3 hints alone must finish the puzzle.
    let guard = 0;
    while (!p.isSolved() && guard++ < 20) {
      const empty = p.grid.findIndex((v) => v === 0);
      expect(p.hint(2)).toMatch(/Try \d at row/);
      p.set(empty, p.solution[empty]);
    }
    expect(p.isSolved()).toBe(true);
    const q = new SudokuPuzzle();
    const free = q.grid.findIndex((v) => v === 0);
    q.set(free, (q.solution[free] % 4) + 1);
    expect(q.hint(2)).toMatch(/does not fit/);
  });
});

describe('oven dials', () => {
  it('has a unique solution in 0-9 and it matches config', () => {
    const sols = [];
    for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) for (let c = 0; c <= 9; c++) if (dialRuleHolds([a, b, c])) sols.push([a, b, c]);
    expect(sols).toEqual([[6, 5, 3]]);
    expect(DIAL_SOLUTION).toEqual([6, 5, 3]);
  });
  it('turning dials solves it', () => {
    const p = new DialsPuzzle();
    for (let i = 0; i < 6; i++) p.turn(0);
    for (let i = 0; i < 5; i++) p.turn(1);
    for (let i = 0; i < 7; i++) p.turn(2, -1); // 0 -> 3 going down
    expect(p.values).toEqual([6, 5, 3]);
    expect(p.isSolved()).toBe(true);
  });
});

describe('cipher', () => {
  it('round trips for every shift', () => {
    for (let s = -30; s <= 30; s++) expect(caesarDecode(caesarEncode('THE QUICK BROWN FOX, 123', s), s)).toBe('THE QUICK BROWN FOX, 123');
  });
  it('matches the configured word', () => {
    expect(caesarEncode('SUNDAY', 3)).toBe('VXQGDB');
    expect(CIPHER_ENCODED).toBe(caesarEncode(CIPHER_WORD, CIPHER_SHIFT));
    expect(caesarDecode(CIPHER_ENCODED, CIPHER_SHIFT)).toBe(CIPHER_WORD);
  });
  it('spelling the word solves it', () => {
    const p = new CipherPuzzle();
    for (const ch of 'SUNDAX') p.addLetter(ch);
    expect(p.isSolved()).toBe(false);
    p.removeLast();
    p.addLetter('Y');
    expect(p.isSolved()).toBe(true);
    const q = new CipherPuzzle();
    q.setText('sunday');
    expect(q.isSolved()).toBe(true);
  });
});

describe('tulip pattern', () => {
  it('follows the growing run rule', () => {
    expect(tulipRule(6).join('')).toBe('BWBBWW');
    expect(tulipRule(9).join('')).toBe('BWBBWWBBB');
    expect(tulipRule(12).join('')).toBe('BWBBWWBBBWWW');
  });
  it('vase solves only with B B B in the last slots, and wrong ones can change', () => {
    const p = new VasePuzzle();
    expect(p.place(0, 'W')).toBe(false); // pre-filled slots are fixed
    p.place(6, 'W');
    p.place(7, 'B');
    p.place(8, 'B');
    expect(p.isSolved()).toBe(false);
    p.place(6, 'B');
    expect(p.isSolved()).toBe(true);
  });
});

describe('other puzzles', () => {
  it('frames start scrambled and solve by swapping', () => {
    for (let s = 1; s < 50; s++) {
      const p = new FramesPuzzle();
      p.newGame(mulberry32(s));
      expect(p.isSolved()).toBe(false);
      // Selection sort with swaps.
      const goal = ['far', 'closer', 'together'];
      for (let i = 0; i < 3; i++) {
        const j = p.order.indexOf(goal[i]);
        if (j !== i) p.swap(i, j);
      }
      expect(p.isSolved()).toBe(true);
    }
  });
  it('books start scrambled and solve by swapping', () => {
    const p = new BooksPuzzle();
    p.newGame(mulberry32(3));
    expect(p.isSolved()).toBe(false);
    p.forceSolve();
    expect(p.isSolved()).toBe(true);
  });
  it('hide and seek needs both cats', () => {
    const p = new HideSeekPuzzle();
    p.newGame(mulberry32(9));
    const empty = [0, 1, 2, 3].find((i) => p.catAt(i) === null);
    expect(p.search(empty)).toBe(null);
    expect(p.search(p.spots.tchobin)).toBe('tchobin');
    expect(p.isSolved()).toBe(false);
    expect(p.hint(2)).toMatch(/Zizo is/);
    expect(p.search(p.spots.zizo)).toBe('zizo');
    expect(p.isSolved()).toBe(true);
  });
  it('lock opens only with the configured code', () => {
    const p = new LockPuzzle();
    expect(p.tryOpen()).toBe(false);
    String(LOCK_CODE)
      .split('')
      .forEach((d, i) => p.setDigit(i, Number(d)));
    expect(p.isSolved()).toBe(false); // needs the handle
    expect(p.tryOpen()).toBe(true);
  });
  it('constellation requires order, wrong picks cost nothing', () => {
    const p = new ConstellationPuzzle();
    expect(p.pick(3)).toBe('wrong');
    for (let i = 0; i < p.count - 1; i++) expect(p.pick(i)).toBe('ok');
    expect(p.pick(p.count - 1)).toBe('done');
    const stars = heartStars();
    expect(stars.length).toBe(12);
    for (const s of stars) {
      expect(s.x).toBeGreaterThan(0.02);
      expect(s.x).toBeLessThan(0.98);
      expect(s.y).toBeGreaterThan(0.02);
      expect(s.y).toBeLessThan(0.98);
    }
  });
});

describe('config text', () => {
  it('every puzzle has three hint tiers', () => {
    for (const id of Object.keys(HINTS)) expect(HINTS[id].length).toBe(3);
  });
  it('notes and letter are present and unsoftened', () => {
    expect(NOTES.length).toBe(5);
    expect(FINAL_MESSAGE.startsWith('My dear H,')).toBe(true);
    expect(FINAL_MESSAGE).toContain('I love you more than you can imagine.');
    expect(FINAL_MESSAGE.trim().endsWith('— Zizou')).toBe(true);
    expect(FINAL_MESSAGE).not.toMatch(/!/);
  });
});
