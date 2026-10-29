// Phone test: an emulated Android phone held sideways (touch only, no mouse,
// no keyboard). Checks the touch controls (thumb stick, drag to look, tap to
// use, the prompt buttons, the top-right buttons), that every screen fits a
// short landscape screen, the portrait "turn your phone" card, and pausing
// when the app goes to the background. Optional screenshots: node e2e/touch.mjs <dir>
import { launch, fileUrl } from './lib.mjs';

const SHOTS = process.argv[2] || null;
const log = (...a) => console.log('  ·', ...a);
const fail = (msg) => {
  throw new Error(msg);
};
const W = 860;
const H = 400;

const browser = await launch();
const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') problems.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
const cdp = await context.newCDPSession(page);
const ev = (fn, arg) => page.evaluate(fn, arg);
const waitFor = (fn, arg, timeout = 30000) => page.waitForFunction(fn, arg, { timeout, polling: 100 });
const shot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/touch-${name}.png` });
const modal = () => ev(() => window.__game.modal());
const tap = (x, y) => page.touchscreen.tap(x, y);
const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], i) => ({ x, y, id: i + 1 })) });
async function tapEl(selector) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) fail(`nothing to tap: ${selector}`);
  await tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(150);
}
async function tapButton(name) {
  const b = page.getByRole('button', { name, exact: true }).last();
  const box = await b.boundingBox();
  if (!box) fail(`no button "${name}"`);
  await tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(150);
}

// Every open card must fit on screen (scrolling inside is allowed only for
// long text, so only the outer box is checked) and its buttons must be big
// enough for a finger.
async function checkFits(name) {
  await page.waitForTimeout(450); // let the card finish fading in
  const r = await ev(() => {
    const top = document.querySelector('.screen:last-of-type');
    const box = top && (top.querySelector('.card, .paper-wrap, .letter') || top.firstElementChild);
    if (!box) return { missing: true };
    const b = box.getBoundingClientRect();
    const small = [...top.querySelectorAll('button')].filter((x) => {
      const q = x.getBoundingClientRect();
      return q.width > 0 && (q.height < 30 || q.width < 30);
    }).length;
    return { l: b.left, t: b.top, r: b.right, b: b.bottom, small, scroll: box.scrollHeight > box.clientHeight + 2 };
  });
  if (r.missing) fail(`${name}: no card on screen`);
  if (r.l < -1 || r.t < -1 || r.r > innerW() + 1 || r.b > H + 1) fail(`${name}: card spills off screen ${JSON.stringify(r)}`);
  if (r.small) fail(`${name}: ${r.small} button(s) too small to tap`);
  await shot(name);
  log(`${name} fits${r.scroll ? ' (scrolls inside)' : ''}`);
  return r;
}
const innerW = () => W;

// Puzzle cards put the board beside its tools on a phone.
async function checkSideBySide(name, board) {
  const r = await ev((sel) => {
    const a = document.querySelector(sel).getBoundingClientRect();
    const s = document.querySelector('.screen:last-of-type .pz-side').getBoundingClientRect();
    return { boardRight: a.right, sideLeft: s.left, boardH: a.height };
  }, board);
  if (r.sideLeft < r.boardRight - 1) fail(`${name}: tools are not beside the board ${JSON.stringify(r)}`);
  if (r.boardH < H * 0.7) fail(`${name}: board only ${Math.round(r.boardH)}px tall on a ${H}px screen`);
}

// Point the camera at a spot (debug API), then tap the middle of the screen.
async function lookTap(at, target, expect) {
  if (at) await ev(([x, z]) => window.__game.teleport(x, z), at);
  const p = await ev(([x, y, z]) => {
    const h = window.__game.lookAt(x, y, z);
    return h ? (typeof h.prompt === 'function' ? h.prompt() : h.prompt) : null;
  }, target);
  if (!p || (expect && !p.includes(expect))) fail(`expected "${expect}" at ${JSON.stringify(target)}, saw "${p}"`);
  await tap(W / 2, H / 2);
  await page.waitForTimeout(250);
}

try {
  await page.goto(fileUrl('dist-debug/index.html', '?debug=1&touch=1&dtmax=0.25'));
  await page.waitForSelector('.start-hint', { timeout: 30000 });
  if (!(await ev(() => document.body.classList.contains('touch')))) fail('touch mode is off');
  const startText = await page.textContent('.start-hint');
  if (!/tap/i.test(startText)) fail(`start screen says "${startText}"`);
  await checkFits('start');
  await tapEl('.start-hint');
  await page.waitForSelector('.menu .btn');
  await checkFits('menu');
  await tapButton('New game');
  const normal = await page.locator('.btn.level').nth(1).boundingBox();
  if (!normal) fail('no difficulty choice after New game');
  await tap(normal.x + normal.width / 2, normal.y + normal.height / 2);
  await waitFor(() => window.__game && window.__game.state() === 'playing');
  await page.waitForTimeout(3600); // wake-up animation
  for (const sel of ['.touch-bar', '.stick-hint', '.controls']) if (!(await page.isVisible(sel))) fail(`${sel} not shown`);
  const ctl = await page.textContent('.controls');
  if (/W A S D|Mouse/.test(ctl) || !/thumb/i.test(ctl)) fail(`controls card is not the touch one: ${ctl}`);
  await shot('playing');
  log('touch HUD shown');

  // --- thumb stick: hold it pushed forward, the player walks forward.
  await ev(() => window.__game.teleport(-0.25, 1.55, 0, 0));
  const p0 = await ev(() => window.__game.pos());
  await touch('touchStart', [[140, 300]]);
  await touch('touchMove', [[140, 280]]);
  await touch('touchMove', [[140, 230]]);
  // (Software rendering is slow, so wait for the next frames to draw.)
  await page.waitForSelector('.stick', { state: 'visible', timeout: 5000 }).catch(() => fail('stick did not appear under the thumb'));
  await page.waitForSelector('.stick-hint', { state: 'hidden', timeout: 5000 }).catch(() => fail('stick hint still shown while the thumb is down'));
  await shot('stick');
  await page.waitForTimeout(1200);
  // --- at the same time, a second finger drags to look.
  const yaw0 = (await ev(() => window.__game.pos())).yaw;
  await touch('touchMove', [
    [140, 230],
    [620, 200],
  ]);
  for (let x = 620; x >= 420; x -= 25)
    await touch('touchMove', [
      [140, 230],
      [x, 200],
    ]);
  await touch('touchMove', [[140, 230]]);
  await touch('touchEnd', []);
  await page.waitForTimeout(200);
  const p1 = await ev(() => window.__game.pos());
  if (!(p0.z - p1.z > 0.4)) fail(`stick did not walk forward: ${JSON.stringify([p0, p1])}`);
  if (!(p1.yaw - yaw0 > 0.3)) fail(`dragging left did not turn left: yaw ${yaw0} -> ${p1.yaw}`);
  await page.waitForSelector('.stick', { state: 'hidden', timeout: 5000 }).catch(() => fail('stick stayed after the thumb lifted'));
  log(`stick walked ${(p0.z - p1.z).toFixed(2)} m; drag turned ${(p1.yaw - yaw0).toFixed(2)} rad`);

  // A small push walks slowly; a full push walks fast.
  const speedAt = async (dy) => {
    await ev(() => window.__game.teleport(-0.25, 1.55, 0, 0));
    await touch('touchStart', [[140, 300]]);
    await touch('touchMove', [[140, 300 - dy]]);
    const a = await ev(() => window.__game.pos());
    const t0 = Date.now();
    await page.waitForTimeout(900);
    const b = await ev(() => window.__game.pos());
    const t = (Date.now() - t0) / 1000;
    await touch('touchEnd', []);
    await page.waitForTimeout(250);
    return (a.z - b.z) / t;
  };
  const slow = await speedAt(18);
  const fast = await speedAt(70);
  if (!(fast > slow * 1.6 && slow > 0.02)) fail(`stick is not analog: slow ${slow}, fast ${fast} m/s`);
  log(`gentle push ${slow.toFixed(2)} m/s, full push ${fast.toFixed(2)} m/s`);

  // --- tap on an object that is NOT in the middle of the screen.
  await ev(() => window.__game.teleport(-0.5, 2.4));
  await ev(() => window.__game.lookAt(-0.27 + 0.32, 0.69 - 0.22, 3.2)); // note above the dot, clear of the prompt button
  const notePt = await ev(() => {
    const g = window.__game.game;
    const v = new window.__game.THREE.Vector3(-0.27, 0.69, 3.2).project(g.camera);
    return [((v.x + 1) / 2) * innerWidth, ((1 - v.y) / 2) * innerHeight];
  });
  if (Math.abs(notePt[0] - W / 2) < 40) fail('note is too close to the middle for this test');
  const under = await ev(([x, y]) => {
    const e = document.elementFromPoint(x, y);
    return e ? e.id || e.className || e.tagName : 'none';
  }, notePt);
  if (under !== 'game-canvas') fail(`something covers the room at the note: ${under}`);
  await tap(notePt[0], notePt[1]);
  await page.waitForTimeout(300);
  if ((await modal()) !== 'note') fail(`tapping the note at ${notePt} did not open it (modal ${await modal()})`);
  await checkFits('note');
  await tapButton('Put it down');
  await waitFor(() => !window.__game.modal());
  log('tap on an off-centre object uses it');

  // A tap on empty wall does nothing.
  await ev(() => window.__game.teleport(0, 0, Math.PI / 2, 0.2));
  await tap(W * 0.7, H * 0.4);
  await page.waitForTimeout(200);
  if (await modal()) fail('tapping nothing opened something');

  // --- the prompt under the dot is a button.
  await ev(() => window.__game.teleport(-0.5, 2.4));
  await ev(() => window.__game.lookAt(-0.27, 0.69, 3.2));
  await page.waitForSelector('.prompt .puse');
  if (await page.isVisible('.prompt kbd')) fail('prompt still shows a keyboard key');
  await shot('prompt');
  await tapEl('.prompt .puse');
  if ((await modal()) !== 'note') fail('the prompt button did not use the note');
  await tapButton('Put it down');
  await waitFor(() => !window.__game.modal());
  log('prompt button works');

  // --- top-right buttons.
  await tapEl('.touch-bar .tbtn[aria-label="Journal"]');
  if ((await modal()) !== 'journal') fail('journal button');
  await checkFits('journal');
  await tapEl('.screen .close-x');
  await waitFor(() => !window.__game.modal());
  await ev(() => window.__game.teleport(-2.0, -1.5));
  await ev(() => window.__game.lookAt(-2.85, 0.03, -2.3));
  await tapEl('.touch-bar .tbtn[aria-label="Hint"]');
  await page.waitForSelector('.hint-card');
  const hintOverlap = await ev(() => {
    const a = document.querySelector('.hint-card').getBoundingClientRect();
    const b = document.querySelector('.touch-bar').getBoundingClientRect();
    return !(a.top >= b.bottom || a.bottom <= b.top || a.left >= b.right || a.right <= b.left);
  });
  if (hintOverlap) fail('hint card covers the touch buttons');
  await shot('hint');
  await tapButton('Thanks');
  await tapEl('.touch-bar .tbtn[aria-label="Pause"]');
  if ((await modal()) !== 'pause') fail('pause button');
  await checkFits('pause');
  await tapButton('Settings');
  await checkFits('settings');
  const sens = await page.textContent('.screen:last-of-type .card');
  if (/Mouse/.test(sens)) fail('settings still say mouse');
  await tapButton('Done');
  await tapButton('Resume');
  await waitFor(() => !window.__game.modal());
  log('journal, hint and pause buttons work');

  // --- the sliding puzzle: side by side, tiles move by tap, Peek is held.
  await lookTap([-2.0, -1.5], [-2.85, 0.03, -2.3], 'painting');
  if ((await modal()) !== 'sliding') fail('painting did not open');
  await checkFits('sliding');
  await checkSideBySide('sliding', '.slide-board');
  const before = await ev(() => window.__game.gs.puzzles.r1b.moves);
  const movable = await ev(() => {
    const p = window.__game.gs.puzzles.r1b;
    const gap = p.tiles.indexOf(0);
    const n = Math.round(Math.sqrt(p.tiles.length));
    const i = gap % n > 0 ? gap - 1 : gap + 1;
    return p.tiles[i];
  });
  const tiles = page.locator('.slide-tile');
  const count = await tiles.count();
  for (let k = 0; k < count; k++) {
    const t = tiles.nth(k);
    if ((await t.locator('.num').textContent()) === String(movable)) {
      const b = await t.boundingBox();
      await tap(b.x + b.width / 2, b.y + b.height / 2);
      break;
    }
  }
  await page.waitForTimeout(250);
  if ((await ev(() => window.__game.gs.puzzles.r1b.moves)) !== before + 1) fail('tapping a tile next to the gap did not move it');
  const peek = await page.getByRole('button', { name: 'Peek' }).boundingBox();
  await touch('touchStart', [[peek.x + peek.width / 2, peek.y + peek.height / 2]]);
  await page.waitForTimeout(200);
  if (!(await ev(() => document.querySelector('.slide-peek').classList.contains('on')))) fail('holding Peek did not show the painting');
  await touch('touchEnd', []);
  await page.waitForTimeout(150);
  if (await ev(() => document.querySelector('.slide-peek').classList.contains('on'))) fail('Peek stayed on after lifting the finger');
  await tapButton('Close');
  await waitFor(() => !window.__game.modal());
  log('sliding puzzle: tap and hold work');

  // --- living room books: the prompt has a second "turn back" button.
  await ev(() => window.__game.unlockThrough(1));
  await ev(() => window.__game.teleport(-2.7, -9.5));
  const bookZ = await ev(() => {
    const g = window.__game.game;
    let z = null;
    g.scene.traverse((o) => {
      if (z === null && o.userData.interact && o.userData.interact.puzzle === 'r2b') {
        const v = new window.__game.THREE.Vector3();
        o.getWorldPosition(v);
        z = v.z;
      }
    });
    return z;
  });
  await ev((z) => window.__game.lookAt(-4.01, 1.13, z), bookZ);
  await page.waitForSelector('.prompt .puse.alt');
  const orderBefore = await ev(() => window.__game.gs.puzzles.r2b.order.join());
  await tapEl('.prompt .puse.alt');
  const orderAfter = await ev(() => window.__game.gs.puzzles.r2b.order.join());
  if (orderBefore === orderAfter) fail('turn back button did nothing');
  await shot('alt-prompt');
  log('turn-back button works');

  // --- kitchen dial: turn back lowers it.
  await ev(() => window.__game.unlockThrough(2));
  await ev(() => window.__game.teleport(1.9, -19.0));
  await ev(() => window.__game.lookAt(2.785, 0.8, -19.0 - 1.5 * 0.18));
  await page.waitForSelector('.prompt .puse.alt');
  const d0 = await ev(() => window.__game.gs.puzzles.r3b.values[0]);
  await tapEl('.prompt .puse.alt');
  const d1 = await ev(() => window.__game.gs.puzzles.r3b.values[0]);
  await tapEl('.prompt .puse:not(.alt)');
  const d2 = await ev(() => window.__game.gs.puzzles.r3b.values[0]);
  if (d1 === d0 || d2 !== d0) fail(`dial: ${d0} -> back ${d1} -> up ${d2}`);
  log('dial turns both ways by touch');

  // Fridge strip: the typing card fits, and a phone keyboard's Enter (which
  // often comes with an empty e.code) submits.
  await ev(() => {
    const g = window.__game.game;
    const it = g.interact.items.find((i) => (typeof i.prompt === 'function' ? i.prompt() : i.prompt) === 'Type the word on the strip');
    it.onUse(false);
  });
  if ((await modal()) !== 'cipher') fail('fridge strip did not open');
  await checkFits('cipher');
  await page.fill('.cipher-input', 'ab');
  await ev(() => document.querySelector('.cipher-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: '', bubbles: true })));
  await page.waitForTimeout(150);
  if (!/letters/.test(await page.textContent('.screen:last-of-type .pz-msg'))) fail('phone Enter did not submit the strip');
  await tapButton('Close');
  await waitFor(() => !window.__game.modal());
  log('fridge strip types and submits');
  // --- sudoku.
  await ev(() => window.__game.unlockThrough(3));
  await lookTap([-2.2, -26.1], [-2.2, 1.5, -24.55], 'chalkboard');
  if ((await modal()) !== 'sudoku') fail('chalkboard did not open');
  await checkFits('sudoku');
  await checkSideBySide('sudoku', '.sudoku');
  const cell = await ev(() => window.__game.gs.puzzles.r4b.grid.findIndex((v, i) => v === 0 && !window.__game.gs.puzzles.r4b.isGiven(i)));
  const cb = await page.locator('.sudoku .cell').nth(cell).boundingBox();
  await tap(cb.x + cb.width / 2, cb.y + cb.height / 2);
  await tapButton('3');
  if ((await ev((i) => window.__game.gs.puzzles.r4b.grid[i], cell)) !== 3) fail('sudoku: tap cell + tap number did not write it');
  await tapButton('Clear');
  await tapButton('Close');
  await waitFor(() => !window.__game.modal());
  log('sudoku works by touch');

  // --- garden: lock and telescope.
  await ev(() => window.__game.unlockThrough(4));
  await lookTap([0.7, -45.6], [0.7, 1.25, -46.39], 'lock');
  if ((await modal()) !== 'lock') fail('lock did not open');
  await checkFits('lock');
  await tapButton('Close');
  await lookTap([2.4, -41.5], [3.4, 1.1, -42.1], 'telescope');
  if ((await modal()) !== 'constellation') fail('telescope did not open');
  await checkFits('telescope');
  await checkSideBySide('telescope', '.sky-wrap');
  // Tap a little off the first star: a finger is not a mouse pointer.
  const star = await ev(() => {
    const c = document.querySelector('.sky-wrap canvas');
    const r = c.getBoundingClientRect();
    const s = JSON.parse(c.dataset.stars)[0];
    return [r.left + s[0] * r.width, r.top + s[1] * r.height];
  });
  await tap(star[0] + 14, star[1] + 10);
  await page.waitForTimeout(200);
  if ((await ev(() => window.__game.gs.puzzles.r5b.progress)) !== 1) fail('tapping near the first star did not pick it');
  await tapButton('Close');
  await waitFor(() => !window.__game.modal());
  log('lock and telescope fit; star picked by a fingertip');

  // --- other cards that can open on a phone.
  await ev(() => window.__game.game.openClue('cipherCard', true));
  await checkFits('clue');
  await ev(() => window.__game.closeModals());

  // --- background: switching apps pauses.
  await ev(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  if ((await modal()) !== 'pause') fail('going to the background did not pause');
  await ev(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    window.__game.closeModals();
  });
  log('backgrounding pauses');

  // --- the ending letter on a short screen.
  await ev(() => window.__game.game.playEnding());
  await page.waitForTimeout(2500);
  for (let i = 0; i < 12; i++) await tap(W / 2, 40);
  await page.waitForSelector('.the-end.on', { timeout: 60000 });
  await page.waitForTimeout(1800); // the letter shrinks to make room
  const end = await ev(() => {
    const l = document.querySelector('.letter').getBoundingClientRect();
    const b = [...document.querySelectorAll('.the-end .btn')].map((x) => x.getBoundingClientRect());
    return { top: l.top, letterBottom: l.bottom, btnBottom: Math.max(...b.map((r) => r.bottom)) };
  });
  if (end.top < -12 || end.btnBottom > H)
    // (the paper is tilted a little) fail(`ending does not fit: ${JSON.stringify(end)}`);
    await shot('ending');
  log('ending letter and buttons fit');

  // --- held upright: ask to turn the phone.
  await page.setViewportSize({ width: H, height: W });
  await page.waitForTimeout(300);
  if (!(await page.isVisible('.rotate'))) fail('portrait: no "turn your phone" card');
  await shot('portrait');
  await page.setViewportSize({ width: W, height: H });
  await page.waitForTimeout(300);
  if (await page.isVisible('.rotate')) fail('landscape: "turn your phone" card still shown');
  log('portrait asks to turn the phone');

  if (problems.length) fail('console problems:\n' + problems.join('\n'));
  console.log('TOUCH PASSED');
} catch (e) {
  await shot('FAIL').catch(() => {});
  console.error('TOUCH FAILED:', e.message);
  if (problems.length) console.error(problems.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
}
