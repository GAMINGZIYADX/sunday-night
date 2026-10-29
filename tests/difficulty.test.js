import { describe, it, expect } from 'vitest';
import { GameState } from '../src/engine/gamestate.js';
import { mulberry32 } from '../src/puzzles/base.js';
import { isSolvable, misplaced } from '../src/puzzles/sliding.js';
import { turnDistances, isEven } from '../src/puzzles/books.js';
import { FRAME_SOLUTION } from '../src/puzzles/frames.js';
import { countSolutions } from '../src/puzzles/sudokuMath.js';
import { generateMaze } from '../src/rooms/maze.js';
import { DIFFICULTY, LEVELS, SUDOKU_GIVENS, HIDING_SPOTS, UI } from '../src/config.js';

// Cozy, Normal and Brainy change how hard the puzzles start, never how many
// answers they have.

const SEEDS = 40;
const games = (level) =>
  Array.from({ length: SEEDS }, (_, s) => {
    const gs = new GameState();
    gs.reset(mulberry32(1000 + s), level);
    return gs;
  });

describe.each(LEVELS)('difficulty %s', (level) => {
  const t = DIFFICULTY[level];
  const list = games(level);

  it('is saved and named', () => {
    expect(UI.levels[level].name).toBeTruthy();
    for (const gs of list) expect(gs.data.level).toBe(level);
  });

  it('frames start scrambled, at most tune.frames in place', () => {
    for (const gs of list) {
      const o = gs.puzzles.r1a.order;
      const placed = o.filter((v, i) => v === FRAME_SOLUTION[i]).length;
      expect(placed).toBeLessThanOrEqual(t.frames);
      expect(placed).toBeLessThan(FRAME_SOLUTION.length);
      expect(gs.puzzles.r1a.isSolved()).toBe(false);
    }
  });

  it('the sliding picture is solvable and scrambled enough', () => {
    for (const gs of list) {
      const tiles = gs.puzzles.r1b.tiles;
      expect(isSolvable(tiles)).toBe(true);
      expect(misplaced(tiles)).toBeGreaterThanOrEqual(t.sliding[1]);
    }
  });

  it('the books need the right number of turns', () => {
    const dist = turnDistances();
    for (const gs of list) {
      const o = gs.puzzles.r2b.order;
      expect(isEven(o)).toBe(true);
      const d = dist.get(o.join(','));
      expect(d).toBeGreaterThanOrEqual(t.books[0]);
      expect(d).toBeLessThanOrEqual(t.books[1]);
    }
  });

  it('the sudoku has one answer and the right number of givens', () => {
    const base = SUDOKU_GIVENS.filter(Boolean).length;
    for (const gs of list) {
      const p = gs.puzzles.r4b;
      expect(p.givens.filter(Boolean).length).toBe(base + t.sudoku);
      const { count, solution } = countSolutions(p.givens, 2);
      expect(count).toBe(1);
      expect(solution).toEqual(p.solution);
    }
  });

  it('the telescope has the right number of loose stars', () => {
    for (const gs of list) expect(gs.puzzles.r5b.decoys.length).toBe(t.decoys);
  });

  it('the maze way to the middle fits the level', () => {
    for (const gs of list) {
      const m = generateMaze(11, 9, gs.data.mazeSeed, 5, t);
      // The closest of 12 tries: nearly always inside the range.
      if (t.mazeRoute[1] < 999) expect(m.route).toBeLessThanOrEqual(t.mazeRoute[1] + 12);
      else expect(m.route).toBeGreaterThanOrEqual(t.mazeRoute[0]);
    }
  });

  it('the save keeps the level and the puzzles', () => {
    const gs = list[0];
    const copy = new GameState();
    expect(copy.load(gs.serialize())).toBe(true);
    expect(copy.data.level).toBe(level);
    expect(copy.puzzles.r4b.givens).toEqual(gs.puzzles.r4b.givens);
    expect(copy.puzzles.r5b.decoys).toEqual(gs.puzzles.r5b.decoys);
    expect(copy.puzzles.r4a.tune).toBe(t);
  });
});

describe('difficulty details', () => {
  it('saves from before the choice load as Normal', () => {
    const gs = new GameState();
    gs.reset(mulberry32(5), 'brainy');
    const old = gs.serialize();
    delete old.level;
    const copy = new GameState();
    expect(copy.load(old)).toBe(true);
    expect(copy.data.level).toBe('normal');
    const bad = new GameState();
    bad.reset(mulberry32(5), 'impossible');
    expect(bad.data.level).toBe('normal');
  });

  it('Normal is the game as it was', () => {
    expect(DIFFICULTY.normal).toMatchObject({
      frames: 1,
      sliding: [220, 13],
      books: [9, 11],
      sudoku: 0,
      decoys: 5,
      sneakEvery: 1,
      sneakOnFind: false,
      hintWait: 0,
    });
  });

  const emptySpot = (p) => [...HIDING_SPOTS.keys()].find((i) => !Object.values(p.spots).includes(i));

  it('Cozy cats sneak off only every second wrong look', () => {
    const gs = new GameState();
    gs.reset(mulberry32(9), 'cozy');
    const p = gs.puzzles.r4a;
    const before = { ...p.spots };
    p.search(emptySpot(p), mulberry32(1));
    expect(p.spots).toEqual(before);
    p.search(emptySpot(p), mulberry32(1));
    expect(p.misses).toBe(2);
    expect(p.spots).not.toEqual(before);
  });

  it('Brainy: finding one cat sends the other off', () => {
    for (let s = 0; s < 20; s++) {
      const gs = new GameState();
      gs.reset(mulberry32(s), 'brainy');
      const p = gs.puzzles.r4a;
      const zizo = p.spots.zizo;
      expect(p.search(p.spots.tchobin, mulberry32(s))).toBe('tchobin');
      expect(p.spots.zizo).not.toBe(zizo);
      expect(p.spots.zizo).not.toBe(p.spots.tchobin);
      expect(p.search(p.spots.zizo)).toBe('zizo');
      expect(p.isSolved()).toBe(true);
    }
  });

  it('Normal cats stay put when one is found', () => {
    const gs = new GameState();
    gs.reset(mulberry32(3), 'normal');
    const p = gs.puzzles.r4a;
    const zizo = p.spots.zizo;
    p.search(p.spots.tchobin);
    expect(p.spots.zizo).toBe(zizo);
  });

  it('Brainy hints wait between tiers; the others never do', () => {
    const gs = new GameState();
    gs.reset(mulberry32(2), 'brainy');
    gs.data.playTime = 100;
    expect(gs.nextHint('r1a').tier).toBe(0);
    const again = gs.nextHint('r1a');
    expect(again.tier).toBe(0);
    expect(again.wait).toBe(60);
    expect(again.text).toBeTruthy();
    gs.data.playTime = 130;
    expect(gs.hintWait('r1a')).toBe(30);
    gs.data.playTime = 160;
    expect(gs.nextHint('r1a').tier).toBe(1);
    gs.data.playTime = 220;
    expect(gs.nextHint('r1a').tier).toBe(2);
    expect(gs.hintWait('r1a')).toBe(0); // the last tier repeats freely
    // The hint card's first look starts the wait too.
    gs.hintAt('r2a', 0);
    expect(gs.nextHint('r2a').wait).toBe(60);
    for (const level of ['cozy', 'normal']) {
      const g = new GameState();
      g.reset(mulberry32(2), level);
      expect([0, 1, 2].map(() => g.nextHint('r1a').tier)).toEqual([0, 1, 2]);
    }
  });
});
