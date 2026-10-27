import './ui/styles.css';
import { Game } from './engine/game.js';
import { applyDeviceText } from './engine/device.js';
import { updatesEnabled } from './engine/updateCheck.js';
import { bootStored, markBooted } from './engine/selfUpdate.js';
import { WEBGL } from './engine/quality.js';
import { UI } from './config.js';

// Bootstrap. Debug tools exist only in debug builds (see vite.config.js) and
// are switched on with ?debug=1.
async function start() {
  // A newer build downloaded with "Update now" replaces this page before the
  // game is created (see selfUpdate.js).
  if (updatesEnabled() && (await bootStored().catch(() => false))) return;
  applyDeviceText(); // touch wording on phones, before any UI exists
  if (!WEBGL) return noWebGL();
  let game;
  try {
    game = new Game(document.getElementById('app'));
  } catch (e) {
    noWebGL();
    throw e;
  }
  const params = new URLSearchParams(location.search);
  if (__DEBUG__ && params.has('debug')) {
    const m = await import('./debug.js');
    m.installDebug(game, params);
  }
  game.boot();
  markBooted();
}

// No 3D graphics here (very old phones, or WebGL switched off): say so
// instead of showing a blank page.
function noWebGL() {
  const box = document.createElement('div');
  box.className = 'no-webgl';
  box.textContent = UI.noWebGL;
  document.getElementById('app').replaceChildren(box);
  markBooted();
}
start();
