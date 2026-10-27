import { Puzzle, shuffled } from './base.js';
import { FUSE_NAMES, FUSE_RULES } from '../config.js';

// The basement, first puzzle. The fuse box has five switches, each named for
// something in the house, and a card of rules ("never the kettle and the
// radio together..."). Exactly one setting keeps every rule; set it and pull
// the main lever and the basement lights come on. Every game draws new names,
// a new answer and a new card that has only that one answer.
export const BASEMENT = 8; // room index
export const FN = 5;

// Does the setting `bits` (bit i = switch i on) keep the rule?
export function ruleHolds(r, bits) {
  const a = !!(bits & (1 << r.a));
  const b = !!(bits & (1 << r.b));
  switch (r.kind) {
    case 'on':
      return a;
    case 'off':
      return !a;
    case 'never':
      return !(a && b);
    case 'either':
      return a || b;
    case 'ifThen':
      return !a || b;
    case 'same':
      return a === b;
    case 'differ':
      return a !== b;
    case 'count': {
      let n = 0;
      for (let i = 0; i < FN; i++) if (bits & (1 << i)) n++;
      return n === r.n;
    }
  }
  return false;
}
// Every setting that keeps all the rules.
export function settingsFor(rules) {
  const out = [];
  for (let bits = 0; bits < 1 << FN; bits++) if (rules.every((r) => ruleHolds(r, bits))) out.push(bits);
  return out;
}

// A rule, always with the same four fields (so saves compare equal).
const rule = (kind, a, b, n = 0) => ({ kind, a, b, n });

// A card of rules true for `answer` that only `answer` keeps, kept short.
export function makeRules(answer, rng) {
  const pool = [];
  const pairs = ['never', 'either', 'ifThen', 'same', 'differ'];
  for (let a = 0; a < FN; a++)
    for (let b = 0; b < FN; b++) {
      if (a === b) continue;
      for (const kind of pairs) if ((a < b || kind === 'ifThen') && ruleHolds(rule(kind, a, b), answer)) pool.push(rule(kind, a, b));
    }
  let n = 0;
  for (let i = 0; i < FN; i++) if (answer & (1 << i)) n++;
  pool.push(rule('count', 0, 0, n));
  // A plain "stays on/off" rule is a strong clue: at most one, near the end.
  const single = shuffled([0, 1, 2, 3, 4], rng)[0];
  const plain = rule(answer & (1 << single) ? 'on' : 'off', single, single);
  const rules = [];
  for (const r of [...shuffled(pool, rng), plain]) {
    if (settingsFor(rules).length === 1) break;
    // Only rules that rule something out.
    if (settingsFor([...rules, r]).length < settingsFor(rules).length) rules.push(r);
  }
  // Drop rules the others already imply.
  for (let i = rules.length - 1; i >= 0; i--) {
    const rest = rules.filter((_, j) => j !== i);
    if (settingsFor(rest).length === 1) rules.splice(i, 1);
  }
  return rules;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export class FusesPuzzle extends Puzzle {
  constructor() {
    super('fuses', BASEMENT, 'X');
    this.names = [0, 1, 2, 3, 4];
    this.answer = 0b10110;
    this.rules = [];
    this.bits = 0;
    this.attempts = 0;
  }
  newGame(rng) {
    this.names = shuffled(
      FUSE_NAMES.map((_, i) => i),
      rng,
    ).slice(0, FN);
    do this.answer = Math.floor(rng() * (1 << FN));
    while (this.answer === 0 || this.answer === (1 << FN) - 1);
    this.rules = makeRules(this.answer, rng);
    do this.bits = Math.floor(rng() * (1 << FN));
    while (this.bits === this.answer);
    this.attempts = 0;
    this.solved = false;
  }
  name(i) {
    return FUSE_NAMES[this.names[i]];
  }
  isOn(i) {
    return !!(this.bits & (1 << i));
  }
  toggle(i) {
    if (this.solved || i < 0 || i >= FN) return;
    this.bits ^= 1 << i;
    this.changed();
  }
  // The rule card's lines.
  get card() {
    return this.rules.map((r) => cap(FUSE_RULES[r.kind].replace('{A}', this.name(r.a)).replace('{B}', this.name(r.b)).replace('{N}', r.n)));
  }
  // Which rules the switches break right now (for the overlay).
  broken() {
    return this.rules.map((r) => !ruleHolds(r, this.bits));
  }
  // Like the gate lock, it only counts when the lever is pulled.
  check() {
    return !!this._tried && this.bits === this.answer;
  }
  pull() {
    if (this.solved) return true;
    this.attempts++;
    this._tried = true;
    const ok = this.changed();
    this._tried = false;
    return ok;
  }
  serialize() {
    return {
      names: this.names.slice(),
      answer: this.answer,
      rules: this.rules.map((r) => rule(r.kind, r.a, r.b, r.n)),
      bits: this.bits,
      attempts: this.attempts,
    };
  }
  deserialize(s) {
    const okNames =
      Array.isArray(s.names) &&
      s.names.length === FN &&
      new Set(s.names).size === FN &&
      s.names.every((v) => Number.isInteger(v) && v >= 0 && v < FUSE_NAMES.length);
    const okRules =
      Array.isArray(s.rules) &&
      s.rules.length > 0 &&
      s.rules.every((r) => r && FUSE_RULES[r.kind] && [r.a, r.b].every((v) => Number.isInteger(v) && v >= 0 && v < FN));
    // The answer must be the only setting the saved card allows.
    if (okNames && okRules && Number.isInteger(s.answer) && settingsFor(s.rules).join() === String(s.answer)) {
      this.names = s.names.slice();
      this.rules = s.rules.map((r) => rule(r.kind, r.a, r.b, r.n | 0));
      this.answer = s.answer;
    }
    if (Number.isInteger(s.bits) && s.bits >= 0 && s.bits < 1 << FN) this.bits = s.bits;
    this.attempts = s.attempts | 0;
  }
  forceSolve() {
    this.bits = this.answer;
    this.pull();
  }
  hintVars() {
    const on = [];
    const off = [];
    for (let i = 0; i < FN; i++) (this.answer & (1 << i) ? on : off).push(this.name(i));
    return { ON: on.join(', ') || 'none', OFF: off.join(', ') || 'none' };
  }
}
