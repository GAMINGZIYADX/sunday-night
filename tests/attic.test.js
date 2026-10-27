import { describe, it, expect, beforeEach } from 'vitest';
import { PianoPuzzle, randomTune } from '../src/puzzles/piano.js';
import { TrunkPuzzle, PICTURE_IDS } from '../src/puzzles/trunk.js';
import { mulberry32 } from '../src/puzzles/base.js';
import { GameState } from '../src/engine/gamestate.js';
import { useStorage, saveGame, loadSave } from '../src/engine/save.js';
import { PIANO_KEYS, PIANO_START, PIANO_LENGTH, TRUNK_RIDDLE, TRUNK_ORDER_WORDS, CLUES, FINDS } from '../src/config.js';

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

// Plays the current part of the tune back, key by key; returns the last result.
const playPart = (p) =>
  p
    .current()
    .map((k) => p.press(k))
    .pop();

describe('attic: the old piano', () => {
  it('makes tunes of the right length that never repeat a key twice in a row', () => {
    for (let s = 1; s <= 200; s++) {
      const t = randomTune(mulberry32(s));
      expect(t).toHaveLength(PIANO_LENGTH);
      t.forEach((k, i) => {
        expect(k >= 0 && k < PIANO_KEYS.length).toBe(true);
        if (i) expect(k).not.toBe(t[i - 1]);
      });
    }
  });

  it('grows one note at a time until the whole tune is played', () => {
    const p = new PianoPuzzle();
    p.newGame(mulberry32(5));
    expect(p.current()).toHaveLength(PIANO_START);
    const results = [];
    while (!p.isSolved()) results.push(playPart(p));
    expect(results).toEqual([...Array(PIANO_LENGTH - PIANO_START).fill('round'), 'solved']);
    expect(p.press(0)).toBe('free');
  });

  it('a wrong key replays the same part, never loses progress', () => {
    const p = new PianoPuzzle();
    p.newGame(mulberry32(9));
    playPart(p); // part 1 done: now one note longer
    const len = p.current().length;
    const wrong = (p.tune[0] + 1) % PIANO_KEYS.length;
    expect(p.press(p.tune[0])).toBe('ok');
    expect(p.press(wrong === p.tune[1] ? (wrong + 1) % PIANO_KEYS.length : wrong)).toBe('wrong');
    expect(p.current()).toHaveLength(len);
    expect(playPart(p)).toBe('round');
  });

  it('saves the tune and how far it got', () => {
    const p = new PianoPuzzle();
    p.newGame(mulberry32(3));
    playPart(p);
    const q = new PianoPuzzle();
    q.newGame(mulberry32(99));
    q.setState(JSON.parse(JSON.stringify(p.getState())));
    expect(q.tune).toEqual(p.tune);
    expect(q.round).toBe(p.round);
    expect(q.isSolved()).toBe(false);
  });

  it('the hints name the start and then the whole tune', () => {
    const p = new PianoPuzzle();
    p.newGame(mulberry32(4));
    const names = p.tune.map((k) => PIANO_KEYS[k]);
    expect(p.hint(1)).toContain(names.slice(0, PIANO_START).join(', '));
    expect(p.hint(2)).toContain(names.join(', '));
  });
});

describe('attic: the picture lock', () => {
  it('the card names the four finds in the answer order, one per line', () => {
    const t = new TrunkPuzzle();
    t.newGame(mulberry32(12));
    const lines = t.riddle.split('\n');
    expect(lines).toHaveLength(4);
    t.answer.forEach((id, i) => expect(lines[i]).toBe(`${TRUNK_ORDER_WORDS[i]}, ${TRUNK_RIDDLE[id]}.`));
  });

  it('exactly one setting of the wheels opens it, for every game', () => {
    for (let s = 1; s <= 30; s++) {
      const t = new TrunkPuzzle();
      t.newGame(mulberry32(s));
      expect(t.matches()).toBe(false); // never starts open
      let open = 0;
      const n = PICTURE_IDS.length;
      for (let a = 0; a < n ** 4; a++) {
        t.wheels = [a % n, Math.floor(a / n) % n, Math.floor(a / n ** 2) % n, Math.floor(a / n ** 3) % n];
        if (t.matches()) open++;
      }
      expect(open).toBe(1);
    }
  });

  it('only opens when the handle is tried, with the right pictures', () => {
    const t = new TrunkPuzzle();
    t.newGame(mulberry32(21));
    expect(t.tryOpen()).toBe(false);
    t.wheels = t.answer.map((id) => PICTURE_IDS.indexOf(id));
    expect(t.isSolved()).toBe(false);
    expect(t.tryOpen()).toBe(true);
    t.spin(0, 1);
    expect(t.isSolved()).toBe(true);
  });

  it('spinning wraps around both ways', () => {
    const t = new TrunkPuzzle();
    t.newGame(mulberry32(2));
    t.wheels = [0, 0, 0, 0];
    t.spin(0, -1);
    expect(t.wheels[0]).toBe(PICTURE_IDS.length - 1);
    t.spin(0, 1);
    expect(t.wheels[0]).toBe(0);
  });
});

describe('attic: in the game state and saves', () => {
  beforeEach(() => useStorage(memoryStorage()));

  it('attic puzzles never give keys, and do not count as room puzzles', () => {
    const gs = new GameState();
    gs.reset(mulberry32(8));
    const seen = [];
    gs.on('solved', () => seen.push('solved'));
    gs.on('atticSolved', ({ puzzle }) => seen.push(puzzle.id));
    gs.puzzles.piano.forceSolve();
    gs.puzzles.trunk.forceSolve();
    expect(seen).toEqual(['piano', 'trunk']);
    expect(gs.solvedCount()).toBe(0);
  });

  it('the riddle card follows the trunk of this game', () => {
    const gs = new GameState();
    gs.reset(mulberry32(31));
    expect(CLUES.atticRiddle.text).toBe(gs.puzzles.trunk.riddle);
  });

  it('round trips the attic: ladder, puzzles, the photo, and being up there', () => {
    const a = new GameState();
    a.reset(mulberry32(41));
    a.lowerLadder();
    a.puzzles.piano.forceSolve();
    a.puzzles.trunk.forceSolve();
    a.addFind('photo');
    a.setRoom(6);
    a.data.player = { x: 0.2, z: 23.6, yaw: 0, pitch: 0 };
    saveGame(a);
    const b = new GameState();
    b.reset(mulberry32(42));
    expect(b.load(loadSave())).toBe(true);
    expect(b.data.attic.ladder).toBe(true);
    expect(b.puzzles.piano.isSolved()).toBe(true);
    expect(b.puzzles.trunk.isSolved()).toBe(true);
    expect(b.puzzles.trunk.answer).toEqual(a.puzzles.trunk.answer);
    expect(b.hasFind('photo')).toBe(true);
    expect(b.data.room).toBe(6);
    expect(b.data.player.z).toBe(23.6);
  });

  it('a save from before the attic still loads, with a fresh attic', () => {
    const a = new GameState();
    a.reset(mulberry32(51));
    a.puzzles.r1a.forceSolve();
    a.addFind('star');
    const old = a.serialize();
    delete old.attic;
    delete old.puzzles.piano;
    delete old.puzzles.trunk;
    old.visited = old.visited.slice(0, 5);
    const b = new GameState();
    expect(b.load(old)).toBe(true);
    expect(b.puzzles.r1a.isSolved()).toBe(true);
    expect(b.data.attic.ladder).toBe(false);
    expect(b.puzzles.piano.isSolved()).toBe(false);
    expect(b.puzzles.trunk.isSolved()).toBe(false);
    expect(CLUES.atticRiddle.text).toBe(b.puzzles.trunk.riddle);
    expect(b.data.finds).toEqual(['star']);
  });

  it('the photo is the sixth little find', () => {
    expect(FINDS.map((f) => f.id)).toEqual(['star', 'mouse', 'cookie', 'tulip', 'fireflies', 'photo']);
  });
});
