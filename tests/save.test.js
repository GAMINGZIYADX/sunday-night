import { describe, it, expect, beforeEach } from 'vitest';
import { GameState } from '../src/engine/gamestate.js';
import { useStorage, saveGame, loadSave, hasSave, clearSave, exportCode, importCode } from '../src/engine/save.js';
import { mulberry32 } from '../src/puzzles/base.js';

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

describe('save / load', () => {
  beforeEach(() => useStorage(memoryStorage()));

  it('round trips the whole game state', () => {
    const a = new GameState();
    a.reset(mulberry32(42));
    a.puzzles.r1a.forceSolve();
    a.puzzles.r1b.forceSolve();
    a.openDoor(0);
    a.puzzles.r2a.place(6, 'W'); // partial progress
    a.puzzles.r4b.set(a.puzzles.r4b.grid.indexOf(0), 2);
    a.readNote(0);
    a.readClue('frames');
    a.setRoom(1);
    a.data.player = { x: 0.5, z: -8, yaw: 1.2, pitch: -0.1 };
    a.nextHint('r2a');
    expect(saveGame(a)).toBe(true);
    expect(hasSave()).toBe(true);

    const b = new GameState();
    expect(b.load(loadSave())).toBe(true);
    expect(b.serialize()).toEqual(a.serialize());
    expect(b.isDoorOpen(0)).toBe(true);
    expect(b.hasKey(0, 'gold')).toBe(true);
    expect(b.puzzles.r2a.slots[6]).toBe('W');
    // The lock code is random per game, and the save keeps it.
    expect(b.puzzles.r5a.code).toBe(a.puzzles.r5a.code);
    expect(b.collectedDigits()[0]).toBe(a.puzzles.r5a.code[0]);
    clearSave();
    expect(hasSave()).toBe(false);
  });

  it('rejects garbage and wrong versions', () => {
    const g = new GameState();
    expect(g.load(null)).toBe(false);
    expect(g.load({ version: 999 })).toBe(false);
    expect(g.load({ version: 1 })).toBe(false); // saves from the first version are not loaded
    expect(g.load({ version: 2, doors: [true, true, true, true, true] })).toBe(true);
    expect(g.isDoorOpen(0)).toBe(false); // no keys, so the door cannot be open
  });

  it('survives storage that throws', () => {
    useStorage({
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('full');
      },
      removeItem() {
        throw new Error('blocked');
      },
    });
    const g = new GameState();
    expect(saveGame(g)).toBe(false);
    expect(loadSave()).toBe(null);
    expect(() => clearSave()).not.toThrow();
  });

  it('export / import code round trip', async () => {
    const a = new GameState();
    a.reset(mulberry32(5));
    a.puzzles.r1a.forceSolve();
    const code = await exportCode(a.serialize());
    expect(code).toMatch(/^SN1j?\./);
    const obj = await importCode(code);
    const b = new GameState();
    expect(b.load(obj)).toBe(true);
    expect(b.serialize()).toEqual(a.serialize());
    expect(await importCode('nonsense')).toBe(null);
    expect(await importCode('SN1.@@@')).toBe(null);
  });
});
