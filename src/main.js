import './ui/styles.css';
import { Game } from './engine/game.js';
import { applyDeviceText } from './engine/device.js';
import { updatesEnabled } from './engine/updateCheck.js';
import { bootStored, markBooted } from './engine/selfUpdate.js';

// Bootstrap. Debug tools exist only in debug builds (see vite.config.js) and
// are switched on with ?debug=1.
async function start() {
  // A newer build downloaded with "Update now" replaces this page before the
  // game is created (see selfUpdate.js).
  if (updatesEnabled() && (await bootStored().catch(() => false))) return;
  applyDeviceText(); // touch wording on phones, before any UI exists
  const game = new Game(document.getElementById('app'));
  const params = new URLSearchParams(location.search);
  if (__DEBUG__ && params.has('debug')) {
    const m = await import('./debug.js');
    m.installDebug(game, params);
  }
  game.boot();
  markBooted();
}
start();
