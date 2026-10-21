import { TOUCH_TEXT } from '../config.js';
import * as config from '../config.js';

// Phones and tablets get touch controls. The choice is made once at startup:
// a coarse primary pointer (a finger) means touch. `?touch=1` / `?touch=0`
// force it either way (used by the tests and handy on odd devices).
function detectTouch() {
  const p = new URLSearchParams(location.search).get('touch');
  if (p === '1') return true;
  if (p === '0') return false;
  try {
    if (window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(pointer: fine)').matches) return true;
  } catch {
    /* very old browser */
  }
  return false;
}

export const TOUCH = detectTouch();

// Swap keyboard/mouse wording for touch wording (all of it lives in
// config.js under TOUCH_TEXT). Runs before any UI is built.
export function applyDeviceText() {
  if (!TOUCH) return;
  for (const [group, entries] of Object.entries(TOUCH_TEXT)) {
    const target = config[group];
    if (!target) continue;
    for (const [k, v] of Object.entries(entries)) {
      // { 2: 'text' } replaces one entry of a list (used for hints).
      if (Array.isArray(target[k]) && v && !Array.isArray(v) && typeof v === 'object') {
        for (const [i, t] of Object.entries(v)) target[k][Number(i)] = t;
      } else target[k] = v;
    }
  }
  document.body.classList.add('touch');
}

// Full screen + landscape. Both need a tap to be allowed, and both are
// best-effort: if the browser says no, the game still works.
export function enterFullscreen() {
  if (!TOUCH) return;
  const de = document.documentElement;
  const lock = () => {
    try {
      const p = screen.orientation?.lock?.('landscape');
      if (p && p.catch) p.catch(() => {});
    } catch {
      /* not supported */
    }
  };
  if (document.fullscreenElement) return lock();
  try {
    const p = de.requestFullscreen?.({ navigationUI: 'hide' });
    if (p && p.then) p.then(lock, () => {});
  } catch {
    /* not allowed */
  }
}

export function isFullscreen() {
  return !!document.fullscreenElement;
}
