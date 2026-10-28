import { Emitter } from './emitter.js';
import { createPuzzles, PUZZLE_IDS, ALL_IDS, EXTRA_IDS } from '../puzzles/index.js';
import { NOTES, FINDS, CLUES, RANDOMIZE, HUNT_COUPON, BAKE_STEPS } from '../config.js';
import { BALCONY_ZONE } from './layout.js';
import { huntSpots, HUNT_SPOT_IDS } from './hunt.js';

export const SAVE_VERSION = 2; // 2: harder puzzles (old saves are ignored)
export const ROOM_COUNT = 5;

// The one source of truth for progress. Save/load, the journal and the HUD all
// read from here and listen to its events:
//   'puzzle'        { puzzle, justSolved }   any puzzle change
//   'solved'        { puzzle }               a key puzzle was just solved
//   'sideSolved'    { puzzle }               a side-room puzzle was just solved
//   'ladder'        {}                       the attic ladder came down
//   'hunt'          { step }                 a treasure-hunt note was found
//   'bake'          { step, done }           a baking step was finished
//   'door'          { room }                 a door was opened
//   'digit'         { room, digit }          a memory-tulip digit was collected
//   'note'          { index }                a note was read (first time)
//   'clue'          { id }                   a clue card was read (first time)
//   'find'          { id }                   a little find was found
//   'room'          { room }                 the player entered another room
//   'finished'      {}                       the letter was read
//   'loaded'        {}                       state was replaced from a save
//   'autosave'      { reason }               something worth saving happened
export class GameState extends Emitter {
  constructor() {
    super();
    this.puzzles = createPuzzles();
    for (const id of ALL_IDS) {
      const side = EXTRA_IDS.includes(id);
      this.puzzles[id].onChange((puzzle, justSolved) => {
        this.emit('puzzle', { puzzle, justSolved });
        if (justSolved) {
          // Only the ten room puzzles give keys; the side rooms' are just for fun.
          this.emit(side ? 'sideSolved' : 'solved', { puzzle });
          this.emit('autosave', { reason: 'solved' });
        }
      });
    }
    this.reset();
  }

  reset(rng = Math.random) {
    this.data = {
      version: SAVE_VERSION,
      room: 0,
      player: { x: 0, z: 1.4, yaw: 0, pitch: 0 },
      doors: [false, false, false, false, false],
      visited: [true, false, false, false, false, false, false, false, false, false],
      notes: [],
      clues: [],
      finds: [],
      maze: { best: 0, done: false },
      attic: { ladder: false },
      cellar: false, // the hatch in the kitchen floor is open
      bake: { step: 0 }, // baking steps finished (the shortcake, in the kitchen)
      // The treasure hunt after the letter: where its notes are, in order
      // (new every game), and how many are found.
      hunt: { spots: [], found: 0 },
      hintTier: {},
      finished: false,
      playTime: 0,
    };
    for (const id of ALL_IDS) this.puzzles[id].newGame(rng);
    // The hedge maze is built from this number (the same number, the same maze).
    this.data.mazeSeed = RANDOMIZE ? Math.floor(rng() * 2 ** 31) : 20070;
    this.data.hunt.spots = huntSpots(rng);
    this.syncText();
  }

  // Clue cards read the current puzzles' versions (the randomiser changes them).
  syncText() {
    CLUES.cipherCard.text = this.puzzles.r3a.encoded;
    CLUES.recipe.text = this.puzzles.r3b.recipe;
    CLUES.atticRiddle.text = this.puzzles.trunk.riddle;
    CLUES.fuseCard.text = this.puzzles.fuses.card.join('\n');
  }

  puzzleIdFor(room, kind) {
    return `r${room + 1}${kind === 'gold' || kind === 'A' ? 'a' : 'b'}`;
  }

  // A key counts as collected as soon as its puzzle is solved, so a reload in
  // the middle of a key animation can never lose it.
  hasKey(room, type) {
    return this.puzzles[this.puzzleIdFor(room, type)].isSolved();
  }
  keyUsed(room) {
    return !!this.data.doors[room];
  }

  isDoorOpen(room) {
    return !!this.data.doors[room];
  }
  canOpenDoor(room) {
    return !this.isDoorOpen(room) && this.hasKey(room, 'gold') && this.hasKey(room, 'silver');
  }
  openDoor(room) {
    if (this.isDoorOpen(room)) return false;
    this.data.doors[room] = true;
    this.emit('door', { room });
    if (room < 4) this.emit('digit', { room, digit: this.digit(room) });
    this.emit('autosave', { reason: 'door' });
    return true;
  }

  // Digits for the final lock (new every game): one per opened door, rooms 1-4.
  digit(room) {
    return this.puzzles.r5a.code.charAt(room);
  }
  collectedDigits() {
    return [0, 1, 2, 3].map((r) => (this.isDoorOpen(r) ? this.digit(r) : null));
  }

  setRoom(room) {
    if (room === this.data.room) return;
    this.data.room = room;
    const first = !this.data.visited[room];
    this.data.visited[room] = true;
    this.emit('room', { room, first });
    this.emit('autosave', { reason: 'room' });
  }

  readNote(index) {
    if (index < 0 || index >= NOTES.length) return;
    if (!this.data.notes.includes(index)) {
      this.data.notes.push(index);
      this.data.notes.sort((a, b) => a - b);
      this.emit('note', { index });
      this.emit('autosave', { reason: 'note' });
    }
  }

  readClue(id) {
    if (!this.data.clues.includes(id)) {
      this.data.clues.push(id);
      this.emit('clue', { id });
    }
  }

  // Little finds (optional collectibles). Returns true the first time.
  addFind(id) {
    if (this.data.finds.includes(id) || !FINDS.some((f) => f.id === id)) return false;
    this.data.finds.push(id);
    this.emit('find', { id });
    this.emit('autosave', { reason: 'find' });
    return true;
  }
  hasFind(id) {
    return this.data.finds.includes(id);
  }

  // The attic ladder (pulled down once, it stays down).
  lowerLadder() {
    if (this.data.attic.ladder) return false;
    this.data.attic.ladder = true;
    this.emit('ladder', {});
    this.emit('autosave', { reason: 'ladder' });
    return true;
  }
  // The cellar hatch in the kitchen floor (opened once, it stays open).
  openCellar() {
    if (this.data.cellar) return false;
    this.data.cellar = true;
    this.emit('autosave', { reason: 'cellar' });
    return true;
  }
  // The strawberry shortcake: step `n` (0-based) was just finished. Only the
  // next one counts; the last one bakes the cake (a little find).
  bakeStep(n) {
    if (n !== this.data.bake.step || this.bakeDone()) return false;
    this.data.bake.step++;
    const done = this.bakeDone();
    if (done) this.addFind('cake');
    this.emit('bake', { step: this.data.bake.step, done });
    this.emit('autosave', { reason: 'bake' });
    return true;
  }
  bakeDone() {
    return this.data.bake.step >= BAKE_STEPS.length;
  }
  // Both puzzles of a side room solved (its little find is then out).
  sideDone(room) {
    return ALL_IDS.filter((id) => this.puzzles[id].room === room).every((id) => this.puzzles[id].isSolved());
  }

  // ---- the treasure hunt (after the letter; only once the coupon has words)
  huntOpen() {
    return this.data.finished && !!HUNT_COUPON.text.trim();
  }
  // The spot of the note to find next (null when all are found).
  huntNext() {
    if (!this.huntOpen()) return null;
    return this.data.hunt.spots[this.data.hunt.found] ?? null;
  }
  huntDone() {
    return this.huntOpen() && this.data.hunt.found >= this.data.hunt.spots.length;
  }
  // Found the note at `spot`: true if it was the one to find next.
  findHuntNote(spot) {
    if (this.huntNext() !== spot) return false;
    this.data.hunt.found++;
    this.emit('hunt', { step: this.data.hunt.found });
    this.emit('autosave', { reason: 'hunt' });
    return true;
  }

  // Hints: returns the next tier text for a puzzle (stays on tier 3).
  nextHint(id) {
    const cur = this.data.hintTier[id] ?? -1;
    const tier = Math.min(2, cur + 1);
    this.data.hintTier[id] = tier;
    this.emit('hint', { id, tier });
    return { tier, text: this.puzzles[id].hint(tier) };
  }
  hintAt(id, tier) {
    this.data.hintTier[id] = Math.max(this.data.hintTier[id] ?? -1, tier);
    this.emit('hint', { id, tier: this.data.hintTier[id] });
    return this.puzzles[id].hint(tier);
  }

  finish() {
    if (!this.data.finished) {
      this.data.finished = true;
      this.emit('finished', {});
    }
    this.emit('autosave', { reason: 'finished' });
  }

  solvedCount() {
    return PUZZLE_IDS.filter((id) => this.puzzles[id].isSolved()).length;
  }

  // ---- serialisation ----------------------------------------------------
  serialize() {
    const puzzles = {};
    for (const id of ALL_IDS) puzzles[id] = this.puzzles[id].getState();
    return JSON.parse(JSON.stringify({ ...this.data, puzzles }));
  }

  // Returns true if the save was usable.
  load(obj) {
    if (!obj || typeof obj !== 'object' || obj.version !== SAVE_VERSION) return false;
    this.reset();
    const d = this.data;
    const num = (v, def) => (typeof v === 'number' && Number.isFinite(v) ? v : def);
    d.room = Math.max(0, Math.min(BALCONY_ZONE, num(obj.room, 0) | 0));
    if (obj.player) {
      d.player = {
        x: num(obj.player.x, d.player.x),
        z: num(obj.player.z, d.player.z),
        yaw: num(obj.player.yaw, 0),
        pitch: num(obj.player.pitch, 0),
      };
    }
    if (Array.isArray(obj.doors)) d.doors = d.doors.map((_, i) => !!obj.doors[i]);
    if (Array.isArray(obj.visited)) d.visited = d.visited.map((_, i) => i === 0 || !!obj.visited[i]);
    if (Array.isArray(obj.notes)) d.notes = obj.notes.filter((n) => Number.isInteger(n) && n >= 0 && n < NOTES.length);
    if (Array.isArray(obj.clues)) d.clues = obj.clues.filter((c) => typeof c === 'string');
    if (Array.isArray(obj.finds)) d.finds = obj.finds.filter((f, i, a) => FINDS.some((x) => x.id === f) && a.indexOf(f) === i);
    if (obj.hintTier && typeof obj.hintTier === 'object') d.hintTier = { ...obj.hintTier };
    d.finished = !!obj.finished;
    d.playTime = num(obj.playTime, 0);
    // Saves from before a side room have no puzzles for it: those stay as new.
    for (const id of ALL_IDS) if (obj.puzzles && obj.puzzles[id]) this.puzzles[id].setState(obj.puzzles[id]);
    // Doors can only be open if their keys exist (repairs hand-edited saves).
    d.doors = d.doors.map((open, r) => open && this.hasKey(r, 'gold') && this.hasKey(r, 'silver'));
    // The hedge maze layout (saves from before the maze keep the new one).
    if (Number.isInteger(obj.mazeSeed) && obj.mazeSeed >= 0) d.mazeSeed = obj.mazeSeed;
    if (obj.maze && typeof obj.maze === 'object') d.maze = { best: num(obj.maze.best, 0), done: !!obj.maze.done };
    if (obj.attic && typeof obj.attic === 'object') d.attic = { ladder: !!obj.attic.ladder };
    d.cellar = !!obj.cellar;
    if (obj.bake && typeof obj.bake === 'object') d.bake = { step: Math.max(0, Math.min(BAKE_STEPS.length, num(obj.bake.step, 0) | 0)) };
    // The hunt (saves from before it keep the spots picked for them now).
    const h = obj.hunt;
    if (
      h &&
      Array.isArray(h.spots) &&
      h.spots.length &&
      h.spots.every((s) => HUNT_SPOT_IDS.includes(s)) &&
      new Set(h.spots).size === h.spots.length
    ) {
      d.hunt = { spots: h.spots.slice(), found: Math.max(0, Math.min(h.spots.length, num(h.found, 0) | 0)) };
    }
    this.syncText();
    this.emit('loaded', {});
    return true;
  }
}
