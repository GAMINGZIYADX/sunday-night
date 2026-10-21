import { TOUCH_TEXT } from '../config.js';
import * as config from '../config.js';

// Phones and tablets get touch controls. The starting choice: a coarse
// primary pointer (a finger) means touch. On 2-in-1 PCs the game then
// follows whatever is used: touching the screen switches to touch controls,
// a mouse or trackpad switches back (see setTouchMode). `?touch=1` / `?touch=0`
// force the start either way (used by the tests and handy on odd devices).
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

// device.touch is read wherever controls or wording depend on it.
export const device = { touch: detectTouch() };

// Touch wording (config.js TOUCH_TEXT) is swapped in and out in place; the
// mouse wording is remembered so switching back restores it exactly.
const originals = [];
let textIsTouch = false;
function setTouchText(on) {
  if (on === textIsTouch) return;
  textIsTouch = on;
  if (!on) {
    for (const [target, key, value] of originals) target[key] = value;
    originals.length = 0;
    return;
  }
  const put = (target, key, value) => {
    originals.push([target, key, target[key]]);
    target[key] = value;
  };
  for (const [group, entries] of Object.entries(TOUCH_TEXT)) {
    const target = config[group];
    if (!target) continue;
    for (const [k, v] of Object.entries(entries)) {
      // { 2: 'text' } replaces one entry of a list (used for hints).
      if (Array.isArray(target[k]) && v && !Array.isArray(v) && typeof v === 'object') {
        for (const [i, t] of Object.entries(v)) put(target[k], Number(i), t);
      } else put(target, k, v);
    }
  }
}

// Runs once before any UI is built.
export function applyDeviceText() {
  setTouchText(device.touch);
  document.body.classList.toggle('touch', device.touch);
}

const listeners = [];
export function onTouchModeChange(fn) {
  listeners.push(fn);
}
export function setTouchMode(on) {
  if (device.touch === on) return;
  device.touch = on;
  setTouchText(on);
  document.body.classList.toggle('touch', on);
  for (const fn of listeners) fn(on);
}

// Full screen + landscape. Both need a tap to be allowed, and both are
// best-effort: if the browser says no, the game still works.
export function enterFullscreen() {
  if (!device.touch) return;
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
