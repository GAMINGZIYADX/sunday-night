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

import { WaterPuzzle } from './water.js';
import { LampsPuzzle } from './lamps.js';
import { FusesPuzzle } from './fuses.js';
import { PipesPuzzle } from './pipes.js';
import { LanternsPuzzle } from './lanterns.js';
import { PairsPuzzle } from './pairs.js';

// The ten key puzzles (two per room, each gives a gold or silver key).
export const PUZZLE_IDS = ['r1a', 'r1b', 'r2a', 'r2b', 'r3a', 'r3b', 'r4a', 'r4b', 'r5a', 'r5b'];
// The optional side rooms' puzzles, two each, by room: no keys, a little find
// once both are solved (the attic's trunk keeps the photo).
export const SIDE_IDS = {
  6: ['piano', 'trunk'],
  7: ['water', 'lamps'],
  8: ['fuses', 'pipes'],
  9: ['lanterns', 'pairs'],
};
export const ATTIC_IDS = SIDE_IDS[6];
export const EXTRA_IDS = Object.values(SIDE_IDS).flat();
export const ALL_IDS = [...PUZZLE_IDS, ...EXTRA_IDS];

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
    new WaterPuzzle(),
    new LampsPuzzle(),
    new FusesPuzzle(),
    new PipesPuzzle(),
    new LanternsPuzzle(),
    new PairsPuzzle(),
  ];
  const map = {};
  for (const p of list) map[p.id] = p;
  return map;
}
