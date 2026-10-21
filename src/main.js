import './ui/styles.css';
import { Game } from './engine/game.js';
import { applyDeviceText } from './engine/device.js';

// Bootstrap. Debug tools exist only in debug builds (see vite.config.js) and
// are switched on with ?debug=1.
applyDeviceText(); // touch wording on phones, before any UI exists
const game = new Game(document.getElementById('app'));
const params = new URLSearchParams(location.search);
if (__DEBUG__ && params.has('debug')) {
  import('./debug.js').then((m) => {
    m.installDebug(game, params);
    game.boot();
  });
} else {
  game.boot();
}
