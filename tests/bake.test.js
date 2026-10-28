import { describe, it, expect } from 'vitest';
import { BAKE_STEPS, BAKE_INGREDIENTS, BAKE_OVEN, BAKE_ITEMS, CLUES, FINDS, LABELS, PROMPTS } from '../src/config.js';
import * as R from '../src/bake/recipe.js';
import { GameState } from '../src/engine/gamestate.js';

const KINDS = ['dial', 'swipe', 'tapEach', 'taps', 'pour', 'scribble', 'drag', 'wait'];

// Plays one task to the end with the same calls the screen makes.
function play(task) {
  const s = R.newTask(task);
  switch (task.kind) {
    case 'dial':
      while (s.value < task.target) R.dialTurn(task, s, 1);
      R.dialRelease(task, s);
      break;
    case 'swipe':
    case 'tapEach':
      for (let i = 0; i < task.count; i++) R.hitOne(task, s, i);
      break;
    case 'taps':
      for (let i = 0; i < R.tapsFor(task); i++) R.tap(task, s);
      break;
    case 'pour':
      R.pourStart(task, s);
      while (s.level < R.pourTarget(task) - task.tolerance / 2) R.pourTick(task, s, 1 / 60);
      R.pourStop(task, s);
      break;
    case 'scribble':
      while (!s.done) R.scribble(task, s, 20, 190);
      break;
    case 'drag':
      for (const id of task.items) R.drop(task, s, id);
      break;
    case 'wait':
      while (!R.waitReady(task, s)) R.waitTick(task, s, 0.1);
      if (task.action) R.waitAct(task, s);
      break;
  }
  return s;
}

describe('baking: the recipe in config.js', () => {
  it('every step has words and tasks of known kinds', () => {
    expect(BAKE_STEPS.length).toBe(11);
    for (const st of BAKE_STEPS) {
      for (const k of ['id', 'title', 'why', 'hint']) expect(typeof st[k], `${st.id}.${k}`).toBe('string');
      expect(st.tasks.length).toBeGreaterThan(0);
      for (const t of st.tasks) {
        expect(KINDS).toContain(t.kind);
        expect(t.label, `${st.id}.${t.id}`).toBeTruthy();
        expect(`${st.title} ${st.why} ${st.hint} ${t.label}`).not.toMatch(/\{[A-Z_]+\}/);
      }
    }
  });

  it('the amounts are the real ones, and every measured thing is an ingredient', () => {
    const byId = Object.fromEntries(BAKE_INGREDIENTS.map((i) => [i.id, i]));
    expect(byId.flour.amount).toBe(250);
    expect(byId.milk.amount).toBe(180);
    expect(byId.cream.amount).toBe(240);
    // 220 °C is the usual 425 °F (428 exactly).
    expect(Math.abs(BAKE_OVEN.f - (BAKE_OVEN.c * 9) / 5 - 32)).toBeLessThan(5);
    for (const t of BAKE_STEPS.flatMap((s) => s.tasks)) {
      if (t.kind === 'pour') {
        expect(byId[t.ingredient]?.amount, t.id).toBeGreaterThan(0);
        expect(t.label).toContain(`${byId[t.ingredient].amount} ${byId[t.ingredient].unit}`);
      }
      if (t.kind === 'taps' && t.ingredient) expect(byId[t.ingredient]?.scoops, t.id).toBeGreaterThan(0);
      if (t.kind === 'drag') for (const id of t.items) expect(BAKE_ITEMS[id], id).toBeTruthy();
      if (t.kind === 'dial') expect(t.target % t.step).toBe(0);
    }
    expect(BAKE_STEPS[0].tasks[0].target).toBe(BAKE_OVEN.c);
  });

  it('the recipe card lists every ingredient and step', () => {
    for (const i of BAKE_INGREDIENTS) expect(CLUES.bake.text).toContain(`${i.metric}`);
    for (const s of BAKE_STEPS) expect(CLUES.bake.text).toContain(s.title);
  });

  it('the cake is a kitchen find, with its words', () => {
    expect(FINDS.find((f) => f.id === 'cake')?.room).toBe(2);
    for (const k of ['bakeStep', 'bakeMore', 'bakeLess', 'bakeScoop', 'bakeRight', 'bakeFirst', 'bakeDone', 'bakeRecipe', 'bakeHelp'])
      expect(LABELS[k], k).toBeTruthy();
    expect(PROMPTS.bake && PROMPTS.bakeDone).toBeTruthy();
  });
});

describe('baking: the gestures', () => {
  const flour = BAKE_STEPS.find((s) => s.id === 'dry').tasks[0];

  it('a dial snaps to its steps and only finishes on the target', () => {
    const t = BAKE_STEPS[0].tasks[0];
    const s = R.newTask(t);
    expect(R.dialSet(t, s, 213)).toBe(210);
    expect(R.dialRelease(t, s)).toBe(false);
    R.dialTurn(t, s, 1);
    expect(R.dialRelease(t, s)).toBe(true);
    expect(R.dialSet(t, R.newTask(t), 999)).toBe(t.max);
  });

  it('each thing is cut once', () => {
    const t = BAKE_STEPS[1].tasks[0];
    const s = R.newTask(t);
    expect(R.hitOne(t, s, 0)).toBe(true);
    expect(R.hitOne(t, s, 0)).toBe(false);
    expect(R.hitOne(t, s, 99)).toBe(false);
    for (let i = 1; i < t.count; i++) R.hitOne(t, s, i);
    expect(s.done).toBe(true);
  });

  it('pouring slows near the mark; too much is spooned out, too little topped up', () => {
    expect(R.pourRate(flour, 250)).toBeLessThan(R.pourRate(flour, 0) / 3);
    const s = R.newTask(flour);
    R.pourStart(flour, s);
    for (let i = 0; i < 30; i++) R.pourTick(flour, s, 0.1);
    expect(R.pourStop(flour, s)).toBe('more');
    R.pourStart(flour, s);
    for (let i = 0; i < 400; i++) R.pourTick(flour, s, 0.1);
    expect(s.level).toBe(R.pourMax(flour)); // it cannot overflow far
    expect(R.pourStop(flour, s)).toBe('less');
    let r = 'less';
    for (let i = 0; i < 10 && r === 'less'; i++) r = R.pourScoop(flour, s);
    expect(r).toBe('right');
    expect(s.done).toBe(true);
    expect(Math.abs(s.level - 250)).toBeLessThanOrEqual(flour.tolerance);
  });

  it('stirring takes the same effort however big the bowl is drawn', () => {
    const t = BAKE_STEPS.find((s) => s.id === 'milk').tasks[1];
    const a = R.newTask(t);
    const b = R.newTask(t);
    R.scribble(t, a, 100, 190);
    R.scribble(t, b, 200, 380);
    expect(a.p).toBeCloseTo(b.p);
    expect(a.done).toBe(false);
    R.scribble(t, a, 190 * 4 * t.amount, 190);
    expect(a.done).toBe(true);
  });

  it('the shortcake is built from the bottom up; a wrong layer just waits', () => {
    const t = BAKE_STEPS.at(-1).tasks[0];
    const s = R.newTask(t);
    expect(R.drop(t, s, 'top')).toBe('first');
    expect(s.next).toBe(0);
    expect(R.drop(t, s, 'bottom')).toBe('ok');
    for (const id of t.items.slice(1)) R.drop(t, s, id);
    expect(s.done).toBe(true);
  });

  it('taking the biscuits out too early only says so', () => {
    const t = BAKE_STEPS.find((s) => s.id === 'bake').tasks[2];
    const s = R.newTask(t);
    R.waitTick(t, s, 1);
    expect(R.waitAct(t, s)).toBe('early');
    expect(s.done).toBe(false);
    R.waitTick(t, s, t.seconds);
    expect(s.done).toBe(false); // waits for her hand
    expect(R.waitAct(t, s)).toBe('done');
  });

  it('a step moves through its tasks in order', () => {
    const st = R.newStep(3);
    let finished = false;
    for (let i = 0; i < 20 && !finished; i++) {
      st.state = play(R.currentTask(st));
      finished = R.advance(st);
    }
    expect(finished).toBe(true);
    expect(st.task).toBe(BAKE_STEPS[3].tasks.length - 1);
  });
});

describe('baking: progress in the game state', () => {
  it('every step can be played to the end, and only then is the cake found', () => {
    const gs = new GameState();
    const events = [];
    gs.on('bake', (e) => events.push(e));
    for (let i = 0; i < BAKE_STEPS.length; i++) {
      expect(gs.hasFind('cake')).toBe(false);
      for (const t of BAKE_STEPS[i].tasks) expect(play(t).done, `${BAKE_STEPS[i].id}.${t.id}`).toBe(true);
      expect(gs.bakeStep(i + 1)).toBe(false); // out of order
      expect(gs.bakeStep(i)).toBe(true);
    }
    expect(gs.bakeDone()).toBe(true);
    expect(gs.hasFind('cake')).toBe(true);
    expect(gs.data.finds.filter((f) => f === 'cake').length).toBe(1);
    expect(gs.bakeStep(BAKE_STEPS.length)).toBe(false);
    expect(events.at(-1)).toEqual({ step: BAKE_STEPS.length, done: true });
  });

  it('finished steps are saved, and odd saves are repaired', () => {
    const a = new GameState();
    a.bakeStep(0);
    a.bakeStep(1);
    const b = new GameState();
    expect(b.load(a.serialize())).toBe(true);
    expect(b.data.bake.step).toBe(2);
    for (const [step, want] of [
      [99, BAKE_STEPS.length],
      [-3, 0],
      ['x', 0],
    ]) {
      const c = new GameState();
      c.load({ ...a.serialize(), bake: { step } });
      expect(c.data.bake.step).toBe(want);
    }
    const d = new GameState();
    const old = a.serialize();
    delete old.bake; // a save from before baking
    d.load(old);
    expect(d.data.bake.step).toBe(0);
  });
});
