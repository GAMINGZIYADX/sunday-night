import { describe, it, expect } from 'vitest';
import { countSolutions, isValidComplete, shuffleSudoku, shape } from '../src/puzzles/sudokuMath.js';
import { caesarShift } from '../src/puzzles/cipherMath.js';
import { tulipPattern, VasePuzzle } from '../src/puzzles/vase.js';
import { DIAL_RULES, DialsPuzzle } from '../src/puzzles/dials.js';
import { CipherPuzzle } from '../src/puzzles/cipher.js';
import { SudokuPuzzle } from '../src/puzzles/sudoku.js';
import { ConstellationPuzzle, heartStars, randomDecoys, DECOY_GAP } from '../src/puzzles/constellation.js';
import { mulberry32 } from '../src/puzzles/base.js';
import { GameState } from '../src/engine/gamestate.js';
import { CIPHER_SENTENCES, DIAL_RIDDLES, VASE_VARIANTS, VASE_SLOTS, RUG_SHOWN, SUDOKU_GIVENS, CLUES, HINTS } from '../src/config.js';

// Every version the randomiser can pick must be fair: one answer, solvable by
// reasoning, and the clues must point at it.

// Solves a sudoku with naked and hidden singles only (no guessing).
function logicSolves(givens) {
  const g = givens.slice();
  const { n, br, bc } = shape(6);
  const units = [];
  for (let r = 0; r < n; r++) units.push([...Array(n).keys()].map((c) => r * n + c));
  for (let c = 0; c < n; c++) units.push([...Array(n).keys()].map((r) => r * n + c));
  for (let r0 = 0; r0 < n; r0 += br)
    for (let c0 = 0; c0 < n; c0 += bc) units.push([...Array(br).keys()].flatMap((r) => [...Array(bc).keys()].map((c) => (r0 + r) * n + c0 + c)));
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
  return !g.includes(0);
}

describe('randomiser: dial riddles', () => {
  it('every riddle has exactly one answer, and it is the configured one', () => {
    for (const r of DIAL_RIDDLES) {
      const rule = DIAL_RULES[r.id];
      expect(rule, r.id).toBeTypeOf('function');
      const sols = [];
      for (let a = 0; a <= 9; a++)
        for (let b = 0; b <= 9; b++) for (let c = 0; c <= 9; c++) for (let d = 0; d <= 9; d++) if (rule([a, b, c, d])) sols.push([a, b, c, d]);
      expect(sols, r.id).toEqual([r.solution]);
      expect(r.text.split('\n').length).toBeGreaterThanOrEqual(4);
      expect(r.hint.length).toBeGreaterThan(20);
    }
  });
  it('new games use every riddle, and each one solves with its own answer', () => {
    const seen = new Set();
    const rng = mulberry32(5);
    for (let k = 0; k < 60; k++) {
      const p = new DialsPuzzle();
      p.newGame(rng);
      seen.add(p.riddle);
      p.solution.forEach((v, i) => {
        for (let j = 0; j < v; j++) p.turn(i);
      });
      expect(p.isSolved()).toBe(true);
      expect(p.hint(1)).toBe(DIAL_RIDDLES[p.riddle].hint);
    }
    expect(seen.size).toBe(DIAL_RIDDLES.length);
  });
});

describe('randomiser: cipher sentences', () => {
  it('every sentence has a one-letter way in, and its word', () => {
    for (const [sentence, word] of CIPHER_SENTENCES) {
      const words = sentence.split(' ');
      expect(words, sentence).toContain(word);
      expect(
        words.some((w) => w === 'I' || w === 'A'),
        sentence,
      ).toBe(true);
      expect(sentence).toMatch(/^[A-Z ]+$/);
    }
  });
  it('a new game picks a sentence and a non-zero shift; hints decode it', () => {
    const rng = mulberry32(9);
    const shifts = new Set();
    for (let k = 0; k < 80; k++) {
      const p = new CipherPuzzle();
      p.newGame(rng);
      expect(p.shift).toBeGreaterThan(0);
      expect(p.shift).toBeLessThan(26);
      shifts.add(p.shift);
      expect(caesarShift(p.encoded, -p.shift)).toBe(p.sentence);
      expect(p.hint(2)).toContain(p.sentence);
      expect(p.hint(2)).toContain(`${p.shift} steps`);
      for (const ch of p.word) p.addLetter(ch);
      expect(p.isSolved()).toBe(true);
    }
    expect(shifts.size).toBeGreaterThan(10);
  });
});

describe('randomiser: vase patterns', () => {
  // Rules a player might reasonably try. Only the true one may fit the rug
  // and the planted vases.
  const family = [];
  for (const start of ['B', 'W']) {
    const other = start === 'B' ? 'W' : 'B';
    family.push(tulipPattern(VASE_SLOTS, { rule: 'pairs', start }).join(''));
    family.push(tulipPattern(VASE_SLOTS, { rule: 'growing', start }).join(''));
    family.push(Array.from({ length: VASE_SLOTS }, (_, i) => (i % 2 ? other : start)).join('')); // alternate
    family.push(Array.from({ length: VASE_SLOTS }, (_, i) => (Math.floor(i / 2) % 2 ? other : start)).join('')); // pairs
    family.push(Array.from({ length: VASE_SLOTS }, (_, i) => (i % 3 === 0 ? start : other)).join('')); // one, two
    family.push(Array.from({ length: VASE_SLOTS }, (_, i) => (i % 3 === 2 ? other : start)).join('')); // two, one
  }
  it('patterns are as described', () => {
    expect(tulipPattern(12, { rule: 'pairs', start: 'B' }).join('')).toBe('BWBBWWBBBWWW');
    expect(tulipPattern(12, { rule: 'growing', start: 'B' }).join('')).toBe('BWWBBBWWWWBB');
    expect(tulipPattern(12, { rule: 'growing', start: 'W' }).join('')).toBe('WBBWWWBBBBWW');
  });
  it('the rug and the planted vases rule out every other pattern', () => {
    VASE_VARIANTS.forEach((v, i) => {
      const p = new VasePuzzle();
      p.setVariant(i);
      const truth = p.solution.join('');
      const fits = family.filter((f) => f.slice(0, RUG_SHOWN) === truth.slice(0, RUG_SHOWN) && v.given.every((k) => f[k] === truth[k]));
      expect(fits, JSON.stringify(v)).toEqual([truth]);
      expect(v.given.length).toBeLessThan(5);
      expect(p.hint(1)).toMatch(/one (blue|white)/);
      expect(p.startWords(4)).toMatch(/^(Blue|White), /);
    });
  });
  it('the variant is saved; old saves fall back to the first pattern', () => {
    const p = new VasePuzzle();
    p.setVariant(2);
    const s = p.getState();
    const q = new VasePuzzle();
    q.setState(s);
    expect(q.variant).toBe(2);
    expect(q.solution.join('')).toBe(p.solution.join(''));
    const old = new VasePuzzle();
    old.setVariant(3);
    old.setState({ slots: s.slots }); // no variant
    expect(old.variant).toBe(0);
  });
});

describe('randomiser: sudoku reshuffles', () => {
  it('every reshuffle keeps one solution and stays solvable by logic', () => {
    const rng = mulberry32(11);
    const seen = new Set();
    for (let k = 0; k < 40; k++) {
      const g = shuffleSudoku(SUDOKU_GIVENS, rng);
      seen.add(g.join(''));
      const { count, solution } = countSolutions(g, 2);
      expect(count).toBe(1);
      expect(isValidComplete(solution)).toBe(true);
      expect(g.filter(Boolean).length).toBe(SUDOKU_GIVENS.filter(Boolean).length);
      expect(logicSolves(g)).toBe(true);
    }
    expect(seen.size).toBeGreaterThan(35);
  });
  it('the board is saved, and a broken saved board is refused', () => {
    const p = new SudokuPuzzle();
    p.newGame(mulberry32(3));
    const s = p.getState();
    const q = new SudokuPuzzle();
    q.setState(s);
    expect(q.givens).toEqual(p.givens);
    expect(q.solution).toEqual(p.solution);
    const bad = new SudokuPuzzle();
    bad.setState({ ...s, givens: new Array(36).fill(0) });
    expect(bad.givens).toEqual(SUDOKU_GIVENS);
  });
});

describe('randomiser: decoy stars', () => {
  it('stay clear of the heart and of each other, inside the telescope view', () => {
    const heart = heartStars();
    const rng = mulberry32(21);
    for (let k = 0; k < 50; k++) {
      const d = randomDecoys(rng);
      expect(d.length).toBe(5);
      for (const s of d) {
        for (const h of heart) expect(Math.hypot(s.x - h.x, s.y - h.y)).toBeGreaterThan(DECOY_GAP);
        expect(((s.x - 0.5) * 1.32) ** 2 + ((s.y - 0.5) * 1.56) ** 2).toBeLessThan(0.8);
        expect('JFMASOND').toContain(s.label);
      }
      for (let i = 0; i < d.length; i++)
        for (let j = i + 1; j < d.length; j++) expect(Math.hypot(d[i].x - d[j].x, d[i].y - d[j].y)).toBeGreaterThan(0.12);
    }
  });
  it('are saved with the puzzle', () => {
    const p = new ConstellationPuzzle();
    p.newGame(mulberry32(4));
    const q = new ConstellationPuzzle();
    q.setState(p.getState());
    expect(q.decoys).toEqual(p.decoys);
  });
});

describe('randomiser: a whole game', () => {
  it('a new game changes the clue cards; a reload keeps everything', () => {
    const gs = new GameState();
    gs.reset(mulberry32(77));
    expect(CLUES.cipherCard.text).toBe(gs.puzzles.r3a.encoded);
    expect(CLUES.recipe.text).toBe(gs.puzzles.r3b.recipe);
    const saved = gs.serialize();
    const other = new GameState();
    other.reset(mulberry32(1234));
    expect(other.load(saved)).toBe(true);
    for (const id of ['r2a', 'r3a', 'r3b', 'r4b', 'r5b']) expect(other.puzzles[id].getState()).toEqual(gs.puzzles[id].getState());
    expect(other.data.mazeSeed).toBe(gs.data.mazeSeed);
    expect(CLUES.cipherCard.text).toBe(gs.puzzles.r3a.encoded);
  });
  it('hint texts have no leftover placeholders for any version', () => {
    const gs = new GameState();
    for (let k = 0; k < 20; k++) {
      gs.reset(mulberry32(k + 1));
      for (const id of Object.keys(HINTS)) for (let t = 0; t < 3; t++) expect(gs.puzzles[id].hint(t), `${id} ${t}`).not.toMatch(/\{[A-Z_]+\}/);
    }
  });
});

describe('randomiser: the hedge maze', async () => {
  // maze.js is a browser module; give it the few globals it reads at load.
  globalThis.location ||= { search: '' };
  globalThis.document ||= { createElement: () => ({ getContext: () => null }) };
  const { generateMaze, MIN_ROUTE } = await import('../src/rooms/maze.js');
  const walk = (cells, r0, c0) => {
    const d = new Map([[`${r0},${c0}`, 0]]);
    const q = [[r0, c0]];
    while (q.length) {
      const [r, c] = q.shift();
      const o = cells[r][c];
      for (const [ok, r2, c2] of [
        [o.n, r + 1, c],
        [o.s, r - 1, c],
        [o.e, r, c + 1],
        [o.w, r, c - 1],
      ])
        if (ok && !d.has(`${r2},${c2}`)) (d.set(`${r2},${c2}`, d.get(`${r},${c}`) + 1), q.push([r2, c2]));
    }
    return d;
  };
  it('every maze reaches every cell, has a real walk to the middle, and one seed is one maze', () => {
    for (let k = 1; k <= 300; k++) {
      const seed = k * 104729;
      const m = generateMaze(11, 9, seed, 5);
      const d = walk(m.cells, 5, 0);
      expect(d.size).toBe(99); // every cell can be reached
      expect(d.get('4,5')).toBeGreaterThanOrEqual(MIN_ROUTE);
      expect(m.cells[5][0].w).toBe(false); // the way in is the garden-wall gap only
      expect(JSON.stringify(generateMaze(11, 9, seed, 5).cells)).toBe(JSON.stringify(m.cells));
    }
  });
});
