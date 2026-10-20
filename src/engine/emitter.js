export class Emitter {
  constructor() {
    this._h = new Map();
  }
  on(type, fn) {
    if (!this._h.has(type)) this._h.set(type, new Set());
    this._h.get(type).add(fn);
    return () => this.off(type, fn);
  }
  off(type, fn) {
    this._h.get(type)?.delete(fn);
  }
  emit(type, payload) {
    const set = this._h.get(type);
    if (set) for (const fn of [...set]) fn(payload);
    const all = this._h.get('*');
    if (all) for (const fn of [...all]) fn(type, payload);
  }
}
