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
import { PianoPuzzle } from './piano.js';
import { TrunkPuzzle } from './trunk.js';

// The ten key puzzles (two per room, each gives a gold or silver key).
export const PUZZLE_IDS = ['r1a', 'r1b', 'r2a', 'r2b', 'r3a', 'r3b', 'r4a', 'r4b', 'r5a', 'r5b'];
// The attic's two puzzles: optional, no keys; the trunk keeps the photo.
export const ATTIC_IDS = ['piano', 'trunk'];
export const ALL_IDS = [...PUZZLE_IDS, ...ATTIC_IDS];

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
    new PianoPuzzle(),
    new TrunkPuzzle(),
  ];
  const map = {};
  for (const p of list) map[p.id] = p;
  return map;
}
