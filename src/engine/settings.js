import { readJSON, writeJSON, SETTINGS_KEY } from './save.js';

export const DEFAULT_SETTINGS = {
  master: 0.8,
  music: 0.6,
  sfx: 0.8,
  sensitivity: 1,
  invertY: false,
  headBob: true,
  reducedMotion: false,
  muted: false,
};

export class Settings {
  constructor() {
    this.data = { ...DEFAULT_SETTINGS };
    const saved = readJSON(SETTINGS_KEY);
    if (saved && typeof saved === 'object') {
      for (const k of Object.keys(DEFAULT_SETTINGS)) {
        if (typeof saved[k] === typeof DEFAULT_SETTINGS[k]) this.data[k] = saved[k];
      }
    }
    // Respect the OS setting the first time.
    if (!saved && typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) this.data.reducedMotion = true;
    this.listeners = [];
  }
  set(key, value) {
    this.data[key] = value;
    writeJSON(SETTINGS_KEY, this.data);
    for (const fn of this.listeners) fn(key, value);
  }
  onChange(fn) {
    this.listeners.push(fn);
  }
}
