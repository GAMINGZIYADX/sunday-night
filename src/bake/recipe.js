import { BAKE_STEPS, BAKE_INGREDIENTS } from '../config.js';

// The strawberry shortcake's steps, as plain state (no drawing): the baking
// screen (ui/bake.js) feeds it gestures and draws what it says. Each task
// kind is one gesture (see BAKE_STEPS in config.js). Nothing here can fail:
// a wrong move only returns a word for the screen to show.

export const ingredient = (id) => BAKE_INGREDIENTS.find((i) => i.id === id);

// How many taps a 'taps' task wants, and how much a 'pour' task wants.
export const tapsFor = (task) => task.count ?? ingredient(task.ingredient)?.scoops ?? 1;
export const pourTarget = (task) => ingredient(task.ingredient).amount;
export const pourUnit = (task) => ingredient(task.ingredient).unit;

// A fresh state for one task.
export function newTask(task) {
  switch (task.kind) {
    case 'dial':
      return { value: task.min, done: false };
    case 'swipe':
    case 'tapEach':
      return { hit: [], done: false };
    case 'taps':
      return { n: 0, done: false };
    case 'pour':
      return { level: 0, pouring: false, status: '', done: false };
    case 'scribble':
      return { p: 0, done: false };
    case 'drag':
      return { next: 0, done: false };
    case 'wait':
      return { t: 0, done: false };
  }
  throw new Error(`unknown task kind ${task.kind}`);
}

// ---- dial: turn to the target (by steps, or set straight from a drag)
export function dialSet(task, s, value) {
  const v = Math.round((value - task.min) / task.step) * task.step + task.min;
  s.value = Math.max(task.min, Math.min(task.max, v));
  return s.value;
}
export const dialTurn = (task, s, dir) => dialSet(task, s, s.value + dir * task.step);
// Called when the hand lets go (or after an arrow press).
export function dialRelease(task, s) {
  if (s.value === task.target) s.done = true;
  return s.done;
}

// ---- swipe / tapEach: each of `count` things once
export function hitOne(task, s, i) {
  if (s.done || i < 0 || i >= task.count || s.hit.includes(i)) return false;
  s.hit.push(i);
  if (s.hit.length === task.count) s.done = true;
  return true;
}

// ---- taps: a tool, so many times
export function tap(task, s) {
  if (s.done) return false;
  s.n++;
  if (s.n >= tapsFor(task)) s.done = true;
  return true;
}

// ---- pour: hold to pour; let go inside the target's band. Over it, spoon
// some out; under it, pour a little more. It cannot overflow far.
export const pourMax = (task) => pourTarget(task) + task.tolerance * 4;
// Like a careful hand, the pour slows down over the last third.
export function pourRate(task, level) {
  const target = pourTarget(task);
  const k = (target - level) / (target * 0.3);
  return task.rate * Math.max(0.2, Math.min(1, k));
}
export function pourTick(task, s, dt) {
  if (s.done || !s.pouring) return s.level;
  s.level = Math.min(pourMax(task), s.level + pourRate(task, s.level) * dt);
  return s.level;
}
export function pourStart(task, s) {
  if (s.done) return;
  s.pouring = true;
  s.status = '';
}
// Returns 'right', 'more' or 'less'.
export function pourStop(task, s) {
  s.pouring = false;
  if (s.done) return 'right';
  const d = s.level - pourTarget(task);
  s.status = Math.abs(d) <= task.tolerance ? 'right' : d < 0 ? 'more' : 'less';
  if (s.status === 'right') s.done = true;
  return s.status;
}
// One spoonful back out (lands inside the band when just over it).
export function pourScoop(task, s) {
  if (s.done) return 'right';
  s.level = Math.max(0, s.level - task.tolerance * 1.5);
  return pourStop(task, s);
}

// ---- scribble: stir, whisk or rub in. `dist` is how far the hand moved
// inside the bowl, `ref` the bowl's width (same units), so a finger and a
// mouse need the same effort. `amount` is roughly how many bowl-widths x 4.
export function scribble(task, s, dist, ref) {
  if (s.done || !(ref > 0)) return s.p;
  s.p = Math.min(1, s.p + dist / (ref * 4 * task.amount));
  if (s.p >= 1) s.done = true;
  return s.p;
}

// ---- drag: put `items` in their place, in order. Returns 'ok', 'done' or
// 'first' (that one comes later: the next one is task.items[s.next]).
export function drop(task, s, item) {
  if (s.done) return 'done';
  if (item !== task.items[s.next]) return 'first';
  s.next++;
  if (s.next === task.items.length) s.done = true;
  return s.done ? 'done' : 'ok';
}

// ---- wait: time passes; with an action, pressing it early only says so
export const waitReady = (task, s) => s.t >= task.seconds;
export function waitTick(task, s, dt) {
  if (s.done) return;
  s.t = Math.min(task.seconds, s.t + dt);
  if (!task.action && waitReady(task, s)) s.done = true;
}
export function waitAct(task, s) {
  if (s.done) return 'done';
  if (!waitReady(task, s)) return 'early';
  s.done = true;
  return 'done';
}

// ---- a whole step: its tasks one after another
export function newStep(index) {
  const step = BAKE_STEPS[index];
  return { index, step, task: 0, state: newTask(step.tasks[0]) };
}
export const currentTask = (st) => st.step.tasks[st.task];
// Moves on once the current task is done. Returns true when the step is done.
export function advance(st) {
  if (!st.state.done) return false;
  if (st.task + 1 < st.step.tasks.length) {
    st.task++;
    st.state = newTask(st.step.tasks[st.task]);
    return false;
  }
  return true;
}
