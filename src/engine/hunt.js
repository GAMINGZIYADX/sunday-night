import { HUNT_RIDDLES, HUNT_LENGTH } from '../config.js';
import { shuffled } from '../puzzles/base.js';

// The treasure hunt after the letter. Its notes hide by puzzles around the
// house (a spot is named after the puzzle it sits by). Every game picks
// HUNT_LENGTH of them in a new order: the note by the envelope tells where the
// first is, each note tells where the next is, and the last spot keeps the
// coupon. The notes themselves are built in rooms/hunt.js.
export const HUNT_SPOT_IDS = Object.keys(HUNT_RIDDLES);

export function huntSpots(rng) {
  return shuffled(HUNT_SPOT_IDS, rng).slice(0, HUNT_LENGTH);
}
