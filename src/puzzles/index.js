import { FramesPuzzle } from './frames.js';
import { SlidingPuzzle } from './sliding.js';
import { VasePuzzle } from './vase.js';
import { BooksPuzzle } from './books.js';
import { CipherPuzzle } from './cipher.js';
import { DialsPuzzle } from './dials.js';
import { HideSeekPuzzle } from './hideSeek.js';
import { SudokuPuzzle } from './sudoku.js';
import { LockPuzzle } from './lock.js';
import { ConstellationPuzzle } from './constellation.js';

export const PUZZLE_IDS = ['r1a', 'r1b', 'r2a', 'r2b', 'r3a', 'r3b', 'r4a', 'r4b', 'r5a', 'r5b'];

export function createPuzzles() {
  const list = [
    new FramesPuzzle(),
    new SlidingPuzzle(),
    new VasePuzzle(),
    new BooksPuzzle(),
    new CipherPuzzle(),
    new DialsPuzzle(),
    new HideSeekPuzzle(),
    new SudokuPuzzle(),
    new LockPuzzle(),
    new ConstellationPuzzle(),
  ];
  const map = {};
  for (const p of list) map[p.id] = p;
  return map;
}
