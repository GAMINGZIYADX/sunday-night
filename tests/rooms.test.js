import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../src/puzzles/base.js';
import { WaterPuzzle } from '../src/puzzles/water.js';
import { LampsPuzzle, lampSolution, EFFECT } from '../src/puzzles/lamps.js';
import { FusesPuzzle, settingsFor, FN } from '../src/puzzles/fuses.js';
import { PipesPuzzle, flow, PN } from '../src/puzzles/pipes.js';
import { LanternsPuzzle, cluesOf, countSolutions, pictureCells } from '../src/puzzles/lanterns.js';
import { PairsPuzzle, CARDS } from '../src/puzzles/pairs.js';
import { EXTRA_IDS, SIDE_IDS, ALL_IDS } from '../src/puzzles/index.js';
import { HUNT_SPOT_IDS, huntSpots } from '../src/engine/hunt.js';
import { GameState } from '../src/engine/gamestate.js';
import {
  zoneAt,
  GREENHOUSE,
  BASEMENT,
  BALCONY,
  ATTIC,
  GREENHOUSE_ZONE,
  BASEMENT_ZONE,
  BALCONY_ZONE,
  ATTIC_ZONE,
  ROOMS,
} from '../src/engine/layout.js';
import { HINTS, PUZZLE_NAMES, LANTERN_PICTURES, HUNT_LENGTH, HUNT_COUPON, FINDS, SIDE_ROOMS, WATER_DAYS } from '../src/config.js';

const SEEDS = Array.from({ length: 150 }, (_, i) => i + 1);
const fresh = (P, seed) => {
  const p = new P();
  p.newGame(mulberry32(seed));
  return p;
};
const roundTrip = (P, p) => {
  const q = new P();
  q.newGame(mulberry32(999));
  q.setState(JSON.parse(JSON.stringify(p.getState())));
  return q;
};

describe('side rooms: layout', () => {
  it('each side room has its own zone, apart from the house', () => {
    expect(zoneAt(ATTIC.cz)).toBe(ATTIC_ZONE);
    expect(zoneAt(GREENHOUSE.cz)).toBe(GREENHOUSE_ZONE);
    expect(zoneAt(BASEMENT.cz)).toBe(BASEMENT_ZONE);
    expect(zoneAt(BALCONY.cz)).toBe(BALCONY_ZONE);
    for (const r of [GREENHOUSE, BASEMENT, BALCONY]) {
      expect(zoneAt(r.zN + 0.1)).toBe(zoneAt(r.zS - 0.1));
      expect(r.zN).toBeGreaterThan(ATTIC.zS);
    }
    for (const r of ROOMS) expect(zoneAt(r.cz)).toBeLessThan(ATTIC_ZONE);
  });
  it('every side puzzle has a name, three hints and a room with a banner', () => {
    for (const id of EXTRA_IDS) {
      expect(PUZZLE_NAMES[id]).toBeTruthy();
      expect(HINTS[id]).toHaveLength(3);
    }
    for (const room of Object.keys(SIDE_IDS)) expect(SIDE_ROOMS[room]?.name).toBeTruthy();
    // One find per new side room.
    for (const room of [7, 8, 9]) expect(FINDS.filter((f) => f.room === room)).toHaveLength(1);
  });
  it('hints are filled in from the current game', () => {
    const gs = new GameState();
    gs.reset(mulberry32(3));
    for (const id of EXTRA_IDS) for (let t = 0; t < 3; t++) expect(gs.puzzles[id].hint(t)).not.toMatch(/\{[A-Z_]+\}/);
  });
});

describe('greenhouse: watering', () => {
  it('thirstiest first: the pot watered on the earliest day', () => {
    for (const seed of SEEDS.slice(0, 40)) {
      const p = fresh(WaterPuzzle, seed);
      const order = p.order();
      expect(order.map((i) => p.day(i))).toEqual(WATER_DAYS);
      expect(new Set(p.plants).size).toBe(6);
      expect(order).not.toEqual([0, 1, 2, 3, 4, 5]);
    }
  });
  it('a pot out of turn sends everything back; the right order solves it', () => {
    const p = fresh(WaterPuzzle, 7);
    const o = p.order();
    expect(p.water(o[0])).toBe('ok');
    expect(p.water(o[2])).toBe('wrong');
    expect(p.watered).toEqual([]);
    o.slice(0, 5).forEach((i) => expect(p.water(i)).toBe('ok'));
    expect(p.water(o[5])).toBe('solved');
    expect(p.isSolved()).toBe(true);
  });
  it('saves keep the plants, days and progress', () => {
    const p = fresh(WaterPuzzle, 11);
    p.water(p.order()[0]);
    const q = roundTrip(WaterPuzzle, p);
    expect(q.getState()).toEqual(p.getState());
  });
});

describe('greenhouse: grow lamps', () => {
  it('every start can be lit, takes a few switches, and the solver finds the way', () => {
    for (const seed of SEEDS.slice(0, 30)) {
      const p = fresh(LampsPuzzle, seed);
      const sol = lampSolution(p.mask);
      expect(sol).not.toBeNull();
      expect(sol.length).toBeGreaterThanOrEqual(4);
      for (const i of sol) p.flip(i);
      expect(p.isSolved()).toBe(true);
    }
  });
  it('a switch flips itself and its neighbours only', () => {
    expect(EFFECT[0].toString(2).split('1').length - 1).toBe(3); // corner
    expect(EFFECT[5].toString(2).split('1').length - 1).toBe(5); // middle
  });
  it('forceSolve and saves', () => {
    const p = fresh(LampsPuzzle, 4);
    p.flip(3);
    expect(roundTrip(LampsPuzzle, p).getState()).toEqual(p.getState());
    p.forceSolve();
    expect(p.isSolved()).toBe(true);
  });
});

describe('basement: fuse box', () => {
  it('every card allows exactly one setting, and it is the answer', () => {
    for (const seed of SEEDS) {
      const p = fresh(FusesPuzzle, seed);
      expect(settingsFor(p.rules)).toEqual([p.answer]);
      expect(p.answer).toBeGreaterThan(0);
      expect(p.answer).toBeLessThan(1 << FN);
      expect(p.rules.length).toBeLessThanOrEqual(7);
      expect(p.bits).not.toBe(p.answer);
      for (const line of p.card) {
        expect(line).not.toMatch(/[{}]/);
        expect(line.charAt(0)).toBe(line.charAt(0).toUpperCase());
      }
      // No rule can be dropped (the card is as short as it can be).
      for (let i = 0; i < p.rules.length; i++) expect(settingsFor(p.rules.filter((_, j) => j !== i)).length).toBeGreaterThan(1);
    }
  });
  it('only counts when the lever is pulled with the right switches', () => {
    const p = fresh(FusesPuzzle, 5);
    expect(p.pull()).toBe(false);
    for (let i = 0; i < FN; i++) if (p.isOn(i) !== !!(p.answer & (1 << i))) p.toggle(i);
    expect(p.isSolved()).toBe(false);
    expect(p.broken().every((b) => !b)).toBe(true);
    expect(p.pull()).toBe(true);
  });
  it('saves keep the card; a tampered card is ignored', () => {
    const p = fresh(FusesPuzzle, 9);
    expect(roundTrip(FusesPuzzle, p).getState()).toEqual(p.getState());
    const bad = JSON.parse(JSON.stringify(p.getState()));
    bad.answer = (bad.answer + 1) % 32;
    const q = new FusesPuzzle();
    q.newGame(mulberry32(1));
    const before = q.answer;
    q.setState(bad);
    expect(q.answer).toBe(before);
  });
});

describe('basement: pipes', () => {
  it('every board has a way through, but does not start with one', () => {
    for (const seed of SEEDS) {
      const p = fresh(PipesPuzzle, seed);
      expect(flow(p.solution, p.tapRow, p.boilerRow).through).toBe(true);
      expect(p.isSolved()).toBe(false);
      expect(p.path.length).toBeGreaterThanOrEqual(9);
      expect(p.masks).toHaveLength(PN * PN);
    }
  });
  it('turning the route pieces solves it; saves keep the board', () => {
    const p = fresh(PipesPuzzle, 21);
    p.rotate(p.path[0]);
    expect(roundTrip(PipesPuzzle, p).getState()).toEqual(p.getState());
    p.forceSolve();
    expect(p.isSolved()).toBe(true);
    expect(p.hint(2)).toMatch(/right|left|up|down/);
  });
});

describe('balcony: lanterns', () => {
  it('every picture, mirrored or not, has exactly one answer', () => {
    for (const pic of LANTERN_PICTURES) for (const m of [false, true]) expect(countSolutions(cluesOf(pictureCells(pic, m)), 3)).toBe(1);
  });
  it('the solver does notice pictures with two answers', () => {
    const two = [true, false, false, false, false, false, true, false, false, false, ...Array(15).fill(false)];
    expect(countSolutions(cluesOf(two), 3)).toBe(2);
  });
  it('lighting the picture solves it; saves keep it', () => {
    const p = fresh(LanternsPuzzle, 2);
    p.toggle(0);
    expect(roundTrip(LanternsPuzzle, p).getState()).toEqual(p.getState());
    p.forceSolve();
    expect(p.isSolved()).toBe(true);
    const pics = new Set(SEEDS.slice(0, 40).map((s) => fresh(LanternsPuzzle, s).picture));
    expect(pics.size).toBeGreaterThan(3);
  });
});

describe('balcony: star cards', () => {
  it('six pairs, a miss turns both back, the last pair is done', () => {
    const p = fresh(PairsPuzzle, 8);
    expect(p.cards).toHaveLength(CARDS);
    for (const c of new Set(p.cards)) expect(p.cards.filter((d) => d === c)).toHaveLength(2);
    const a = 0;
    const miss = p.cards.findIndex((c, k) => k !== a && c !== p.cards[a]);
    expect(p.pick(a)).toBe('first');
    expect(p.pick(miss)).toBe('miss');
    expect(p.isUp(a)).toBe(false);
    p.forceSolve();
    expect(p.isSolved()).toBe(true);
    const q = fresh(PairsPuzzle, 8);
    q.pick(0);
    q.pick(q.cards.findIndex((c, k) => k !== 0 && c === q.cards[0]));
    expect(roundTrip(PairsPuzzle, q).getState()).toEqual(q.getState());
  });
});

describe('the treasure hunt', () => {
  it('picks a new order of real spots every game', () => {
    for (const id of HUNT_SPOT_IDS) expect(ALL_IDS).toContain(id);
    const orders = new Set();
    for (const seed of SEEDS.slice(0, 20)) {
      const s = huntSpots(mulberry32(seed));
      expect(s).toHaveLength(HUNT_LENGTH);
      expect(new Set(s).size).toBe(HUNT_LENGTH);
      orders.add(s.join());
    }
    expect(orders.size).toBeGreaterThan(15);
  });
  it('stays closed until the letter is read and the coupon has words', () => {
    const gs = new GameState();
    gs.reset(mulberry32(5));
    const saved = HUNT_COUPON.text;
    try {
      HUNT_COUPON.text = 'Good for one test.';
      expect(gs.huntNext()).toBe(null);
      gs.finish();
      const spots = gs.data.hunt.spots;
      expect(gs.huntNext()).toBe(spots[0]);
      expect(gs.findHuntNote(spots[1])).toBe(false); // out of order
      spots.forEach((s) => expect(gs.findHuntNote(s)).toBe(true));
      expect(gs.huntDone()).toBe(true);
      const b = new GameState();
      b.load(JSON.parse(JSON.stringify(gs.serialize())));
      expect(b.data.hunt).toEqual(gs.data.hunt);
      HUNT_COUPON.text = '';
      expect(b.huntOpen()).toBe(false);
    } finally {
      HUNT_COUPON.text = saved;
    }
  });
});
