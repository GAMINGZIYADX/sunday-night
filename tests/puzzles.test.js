import { describe, it, expect } from 'vitest';
import { SlidingPuzzle, shuffleTiles, isSolvable, neighbours, SOLVED_TILES, N } from '../src/puzzles/sliding.js';
import { countSolutions, isValidComplete } from '../src/puzzles/sudokuMath.js';
import { caesarEncode, caesarDecode } from '../src/puzzles/cipherMath.js';
import { tulipRule, VasePuzzle } from '../src/puzzles/vase.js';
import { dialRuleHolds, DialsPuzzle } from '../src/puzzles/dials.js';
import { FramesPuzzle, FRAME_SOLUTION } from '../src/puzzles/frames.js';
import { BooksPuzzle, isEven } from '../src/puzzles/books.js';
import { CipherPuzzle } from '../src/puzzles/cipher.js';
import { HideSeekPuzzle } from '../src/puzzles/hideSeek.js';
import { SudokuPuzzle } from '../src/puzzles/sudoku.js';
import { LockPuzzle } from '../src/puzzles/lock.js';
import { ConstellationPuzzle, heartStars, decoyStars } from '../src/puzzles/constellation.js';
import { mulberry32 } from '../src/puzzles/base.js';
import {
  SUDOKU_GIVENS,
  CIPHER_WORD,
  CIPHER_SHIFT,
  CIPHER_ENCODED,
  CIPHER_SENTENCE,
  DIAL_SOLUTION,
  LOCK_CODE,
  HINTS,
  NOTES,
  FINAL_MESSAGE,
  BOOK_ORDER,
  VASE_GIVEN,
  VASE_SLOTS,
  RUG_SHOWN,
  HIDING_SPOTS,
  CONSTELLATION_LABELS,
} from '../src/config.js';

// Breadth-first search over sliding states (bounded): proves a board is solvable.
function bfsSolvable(tiles, maxStates = 400000) {
  const goal = SOLVED_TILES.join();
  const seen = new Set([tiles.join()]);
  let frontier = [tiles];
  while (frontier.length && seen.size < maxStates) {
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

describe('sliding puzzle (4x4)', () => {
  it('is a fifteen puzzle', () => {
    expect(N).toBe(4);
    expect(SOLVED_TILES.length).toBe(16);
  });
  it('shuffles are always solvable (parity) over many seeds, and well mixed', () => {
    for (let seed = 1; seed <= 1500; seed++) {
      const tiles = shuffleTiles(mulberry32(seed), 220);
      expect(isSolvable(tiles)).toBe(true);
      expect([...tiles].sort((a, b) => a - b)).toEqual([...Array(16).keys()]);
    }
  });
  it('the parity test rejects an impossible board', () => {
    const t = SOLVED_TILES.slice();
    [t[13], t[14]] = [t[14], t[13]]; // the famous 14-15 swap
    expect(isSolvable(t)).toBe(false);
    expect(isSolvable(SOLVED_TILES)).toBe(true);
  });
  it('gentle shuffles are solvable by actual search', () => {
    for (let seed = 1; seed <= 8; seed++) expect(bfsSolvable(shuffleTiles(mulberry32(seed * 7), 14))).toBe(true);
  });
  it('a new game is never already solved, and moves work', () => {
    for (let seed = 1; seed < 100; seed++) {
      const p = new SlidingPuzzle();
      p.newGame(mulberry32(seed));
      expect(p.isSolved()).toBe(false);
    }
    const p = new SlidingPuzzle();
    const t = SOLVED_TILES.slice();
    [t[14], t[15]] = [0, 15];
    p.setState({ tiles: t });
    expect(p.move(0)).toBe(false); // not next to the gap
    expect(p.moveDir('left')).toBe(true);
    expect(p.isSolved()).toBe(true);
  });
  it('rejects unsolvable saved boards', () => {
    const p = new SlidingPuzzle();
    const before = p.getState().tiles;
    const t = SOLVED_TILES.slice();
    [t[0], t[1]] = [t[1], t[0]];
    p.setState({ tiles: t });
    expect(p.getState().tiles).toEqual(before);
  });
});

describe('sudoku (6x6)', () => {
  it('configured puzzle has exactly one solution', () => {
    expect(SUDOKU_GIVENS.length).toBe(36);
    const { count, solution } = countSolutions(SUDOKU_GIVENS, 5);
    expect(count).toBe(1);
    expect(isValidComplete(solution)).toBe(true);
  });
  it('is solvable by logic alone (naked + hidden singles, no guessing)', () => {
    const g = SUDOKU_GIVENS.slice();
    const n = 6;
    const units = [];
    for (let r = 0; r < n; r++) units.push([...Array(n).keys()].map((c) => r * n + c));
    for (let c = 0; c < n; c++) units.push([...Array(n).keys()].map((r) => r * n + c));
    for (const br of [0, 2, 4]) for (const bc of [0, 3]) units.push([0, 1].flatMap((r) => [0, 1, 2].map((c) => (br + r) * n + bc + c)));
    const cand = (i) => [1, 2, 3, 4, 5, 6].filter((v) => units.filter((u) => u.includes(i)).every((u) => u.every((j) => g[j] !== v)));
    let progress = true;
    while (progress) {
      progress = false;
      for (let i = 0; i < 36; i++) if (!g[i] && cand(i).length === 1) ((g[i] = cand(i)[0]), (progress = true));
      for (const u of units)
        for (let v = 1; v <= 6; v++) {
          if (u.some((i) => g[i] === v)) continue;
          const spots = u.filter((i) => !g[i] && cand(i).includes(v));
          if (spots.length === 1) ((g[spots[0]] = v), (progress = true));
        }
    }
    expect(g.includes(0)).toBe(false);
  });
  it('counts multiple solutions for an empty board', () => {
    expect(countSolutions(new Array(36).fill(0), 3).count).toBe(3);
  });
  it('tier-3 hints alone always finish it', () => {
    const p = new SudokuPuzzle();
    let guard = 0;
    while (!p.isSolved() && guard++ < 40) {
      const empty = p.grid.findIndex((v) => v === 0);
      expect(p.hint(2)).toMatch(/Try \d at row/);
      p.set(empty, p.solution[empty]);
    }
    expect(p.isSolved()).toBe(true);
    const q = new SudokuPuzzle();
    const free = q.grid.findIndex((v) => v === 0);
    q.set(free, (q.solution[free] % 6) + 1);
    expect(q.hint(2)).toMatch(/does not fit/);
  });
});

describe('oven dials', () => {
  it('the riddle has exactly one answer in 0-9 and it matches config', () => {
    const sols = [];
    for (let a = 0; a <= 9; a++)
      for (let b = 0; b <= 9; b++) for (let c = 0; c <= 9; c++) for (let d = 0; d <= 9; d++) if (dialRuleHolds([a, b, c, d])) sols.push([a, b, c, d]);
    expect(sols).toEqual([DIAL_SOLUTION]);
  });
  it('turning dials solves it', () => {
    const p = new DialsPuzzle();
    expect(p.count).toBe(4);
    DIAL_SOLUTION.forEach((v, i) => {
      for (let k = 0; k < v; k++) p.turn(i);
    });
    expect(p.isSolved()).toBe(true);
  });
});

describe('cipher', () => {
  it('round trips for every shift', () => {
    for (let s = -30; s <= 30; s++) expect(caesarDecode(caesarEncode('THE QUICK BROWN FOX, 123', s), s)).toBe('THE QUICK BROWN FOX, 123');
  });
  it('matches the configured sentence and word', () => {
    expect(caesarEncode('I WAIT FOR SUNDAY', 3)).toBe('L ZDLW IRU VXQGDB');
    expect(CIPHER_ENCODED).toBe(caesarEncode(CIPHER_SENTENCE, CIPHER_SHIFT));
    expect(caesarDecode(CIPHER_ENCODED, CIPHER_SHIFT)).toBe(CIPHER_SENTENCE);
    expect(CIPHER_SENTENCE.split(' ')).toContain(CIPHER_WORD);
    expect(CIPHER_SENTENCE.split(' ').some((w) => w.length === 1)).toBe(true); // the way in
  });
  it('spelling the word solves it; the wheel turns and is saved', () => {
    const p = new CipherPuzzle();
    for (const ch of 'SUNDAX') p.addLetter(ch);
    expect(p.isSolved()).toBe(false);
    p.removeLast();
    p.turnWheel(1);
    p.turnWheel(-1);
    p.turnWheel(-1);
    expect(p.getState().wheel).toBe(25);
    p.addLetter('Y');
    expect(p.isSolved()).toBe(true);
    expect(p.hint(2)).toContain('L is I');
  });
});

describe('tulip pattern', () => {
  it('follows the growing run rule', () => {
    expect(tulipRule(6).join('')).toBe('BWBBWW');
    expect(tulipRule(12).join('')).toBe('BWBBWWBBBWWW');
  });
  it('only a few vases are planted and they agree with the rule', () => {
    expect(VASE_SLOTS).toBe(12);
    expect(VASE_GIVEN.length).toBeLessThan(5);
    expect(RUG_SHOWN).toBeLessThan(6);
    const p = new VasePuzzle();
    expect(p.slots.filter(Boolean).length).toBe(VASE_GIVEN.length);
    expect(p.place(0, 'W')).toBe(false); // planted ones are fixed
    const sol = tulipRule(12);
    sol.forEach((c, i) => !p.isFixed(i) && p.place(i, c === 'B' ? 'W' : 'B'));
    expect(p.isSolved()).toBe(false);
    sol.forEach((c, i) => !p.isFixed(i) && p.place(i, c));
    expect(p.isSolved()).toBe(true);
  });
});

describe('books (turn three at a time)', () => {
  it('a turn rotates a book with its neighbours, both ways', () => {
    const p = new BooksPuzzle();
    const start = BOOK_ORDER.slice();
    [start[5], start[6], start[7]] = [start[7], start[5], start[6]]; // not solved yet
    p.setState({ order: start });
    p.turn(1, 1);
    expect(p.order.slice(0, 3)).toEqual(['yellow', 'red', 'orange']);
    p.turn(1, -1);
    expect(p.order.slice(0, 3)).toEqual(['red', 'orange', 'yellow']);
    p.turn(0, 1); // an end book turns with its two neighbours
    expect(p.order.slice(0, 3)).toEqual(['yellow', 'red', 'orange']);
    p.turn(7, -1); // and so does the other end
    expect(p.order.slice(5)).toEqual(['indigo', 'violet', 'pink']);
  });
  it('every scramble is solvable by turns (search) and needs real thought', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const p = new BooksPuzzle();
      p.newGame(mulberry32(seed));
      expect(isEven(p.order)).toBe(true);
      expect(p.order.filter((b, i) => b === BOOK_ORDER[i]).length).toBeLessThanOrEqual(2);
      // BFS over orders reachable by turns.
      const goal = BOOK_ORDER.join();
      const seen = new Map([[p.order.join(), 0]]);
      let frontier = [p.order.slice()];
      let depth = 0;
      while (frontier.length && !seen.has(goal)) {
        depth++;
        const next = [];
        for (const o of frontier)
          for (let c = 1; c <= 6; c++)
            for (const dir of [1, -1]) {
              const q = new BooksPuzzle();
              q.order = o.slice();
              q._rotate(c, dir);
              const k = q.order.join();
              if (!seen.has(k)) {
                seen.set(k, depth);
                next.push(q.order);
              }
            }
        frontier = next;
      }
      expect(seen.get(goal)).toBeGreaterThanOrEqual(9);
      expect(seen.get(goal)).toBeLessThanOrEqual(11);
    }
  });
  it('refuses impossible (odd) saved orders', () => {
    const p = new BooksPuzzle();
    const before = p.order.slice();
    const odd = BOOK_ORDER.slice();
    [odd[0], odd[1]] = [odd[1], odd[0]];
    p.setState({ order: odd });
    expect(p.order).toEqual(before);
  });
});

describe('frames (distance + seasons)', () => {
  it('start scrambled and solve by swapping', () => {
    for (let s = 1; s < 50; s++) {
      const p = new FramesPuzzle();
      p.newGame(mulberry32(s));
      expect(p.isSolved()).toBe(false);
      for (let i = 0; i < FRAME_SOLUTION.length; i++) {
        const j = p.order.indexOf(FRAME_SOLUTION[i]);
        if (j !== i) p.swap(i, j);
      }
      expect(p.isSolved()).toBe(true);
    }
  });
  it('neither clue alone is enough', () => {
    const dist = { far: 0, closer: 1, together: 2 };
    const season = { winter: 0, spring: 1, summer: 2, autumn: 3 };
    const parts = FRAME_SOLUTION.map((f) => f.split('-'));
    const distances = parts.map((p) => dist[p[1]]);
    const seasons = parts.map((p) => season[p[0]]);
    expect(new Set(distances).size).toBeLessThan(FRAME_SOLUTION.length); // ties in distance
    expect(new Set(seasons).size).toBeLessThan(FRAME_SOLUTION.length); // ties in season
    expect(distances).toEqual([...distances].sort((a, b) => a - b)); // the answer is consistent with both
  });
});

describe('other puzzles', () => {
  it('hide and seek: six spots, wrong guesses move the cats, both needed', () => {
    expect(HIDING_SPOTS.length).toBe(6);
    const p = new HideSeekPuzzle();
    p.newGame(mulberry32(9));
    const empty = [...HIDING_SPOTS.keys()].find((i) => p.catAt(i) === null);
    const before = { ...p.spots };
    expect(p.search(empty, mulberry32(4))).toBe(null);
    expect(p.misses).toBe(1);
    expect(Object.values(p.spots)).not.toContain(empty); // never into the spot just checked
    expect(p.spots).not.toEqual(before);
    expect(p.spots.tchobin).not.toBe(p.spots.zizo);
    expect(p.search(p.spots.tchobin)).toBe('tchobin');
    expect(p.isSolved()).toBe(false);
    expect(p.hint(2)).toMatch(/Zizo is/);
    const z = p.spots.zizo;
    // a miss now only moves Zizo
    const free = [...HIDING_SPOTS.keys()].find((i) => p.catAt(i) === null);
    const tSpot = p.spots.tchobin;
    p.search(free);
    expect(p.spots.tchobin).toBe(tSpot);
    expect(p.spots.zizo === z || p.spots.zizo !== free).toBe(true);
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
  it('constellation: month letters, repeated letters and decoys', () => {
    const p = new ConstellationPuzzle();
    expect(CONSTELLATION_LABELS.join('')).toBe('JFMAMJJASOND');
    expect(p.pick(5)).toBe('wrong'); // the other J
    expect(p.pick(-1)).toBe('wrong'); // a loose star
    for (let i = 0; i < p.count - 1; i++) expect(p.pick(i)).toBe('ok');
    expect(p.pick(p.count - 1)).toBe('done');
    const stars = heartStars();
    expect(stars.length).toBe(12);
    for (const s of stars) {
      expect(s.x).toBeGreaterThan(0.02);
      expect(s.x).toBeLessThan(0.98);
    }
    // Loose stars stay clear of the heart so the shape still reads.
    for (const d of decoyStars()) for (const s of stars) expect(Math.hypot(d.x - s.x, d.y - s.y)).toBeGreaterThan(0.09);
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
