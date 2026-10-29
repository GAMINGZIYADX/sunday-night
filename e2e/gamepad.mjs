// Game controller test, with a pretend controller (navigator.getGamepads is
// replaced before the game loads, and the test sets its sticks and buttons).
// Plays the start screen, the menus and the difficulty choice with the
// cursor, then walks, runs and looks with the sticks, opens and closes the
// journal, uses the sliding picture with the D-pad and A, pauses with Start,
// and checks the mouse takes over again.
import { launch, fileUrl, openGame } from './lib.mjs';

const fail = (msg) => {
  throw new Error(msg);
};
const check = (ok, what) => {
  if (!ok) fail(what);
  console.log('  ✓', what);
};

const browser = await launch();
let code = 0;
try {
  console.log('Game controller');
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const problems = [];
  page.on('console', (m) => {
    if (m.text().includes('GPU stall due to ReadPixels')) return;
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`[${m.type()}] ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
  await page.addInitScript(() => {
    const pad = {
      id: 'Test controller (STANDARD GAMEPAD)',
      index: 0,
      connected: true,
      mapping: 'standard',
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
    };
    window.__pad = pad;
    navigator.getGamepads = () => [pad];
  });
  await page.goto(fileUrl('dist-debug/index.html', '?debug=1&dtmax=0.25&touch=0'));
  await page.waitForSelector('.start-hint', { timeout: 30000 });
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const sleep = (ms) => page.waitForTimeout(ms);
  const set = (i, on) => ev(([i, on]) => Object.assign(window.__pad.buttons[i], { pressed: on, value: on ? 1 : 0 }), [i, on]);
  // Software rendering draws few frames a second: hold long enough for the
  // game to see the button go down, then up.
  const press = async (i, hold = 350) => {
    await set(i, true);
    await sleep(hold);
    await set(i, false);
    await sleep(350);
  };
  const axes = (a) => ev((a) => (window.__pad.axes = a), a);
  const A = 0;
  const B = 1;
  const Y = 3;
  const RB = 5;
  const START = 9;
  const DOWN = 13;
  const RIGHT = 15;
  const LEFT = 14;
  const UP = 12;
  const modals = () => ev(() => window.__game.game.modals.stack.map((m) => m.name));

  // Start screen, main menu, difficulty: all with A (the cursor starts on the main button).
  await press(A);
  await page.waitForSelector('.menu .btn');
  check(await ev(() => document.body.classList.contains('pad')), 'pressing a button switches to controller mode');
  await page.waitForSelector('.menu .pad-hot', { timeout: 10000 });
  check(await page.isVisible('.pad-cursor'), 'the cursor shows on the menu');
  const hot = await ev(() => document.querySelector('.pad-hot')?.textContent);
  check(/New game/.test(hot || ''), `the cursor starts on the main button (${hot})`);
  await press(A);
  await page.waitForSelector('.btn.level');
  await press(DOWN); // from Normal (the main one) down to Brainy
  await press(UP); // and back
  check(/Normal/.test(await ev(() => document.querySelector('.pad-hot')?.textContent || '')), 'the D-pad moves between the choices');
  await press(A);
  await page.waitForFunction(() => window.__game.state() === 'playing', null, { timeout: 30000 });
  check((await ev(() => window.__game.gs.data.level)) === 'normal', 'A starts a Normal game');
  await sleep(4000); // wake up
  check(!(await page.isVisible('.pad-cursor')), 'no cursor while walking');
  const controls = await ev(() => document.querySelector('.controls')?.textContent || '');
  check(/Left stick/.test(controls) && /RB/.test(controls), 'the controls card shows the controller');

  // Walk, run, look.
  const walkFor = async (a, ms) => {
    await ev(() => window.__game.teleport(0.6, 2.5, 0));
    await sleep(200);
    const p0 = await ev(() => ({ ...window.__game.pos() }));
    const t0 = await ev(() => window.__game.gs.data.playTime);
    await axes(a);
    await sleep(ms);
    await axes([0, 0, 0, 0]);
    const p1 = await ev(() => ({ ...window.__game.pos() }));
    const t1 = await ev(() => window.__game.gs.data.playTime);
    return Math.hypot(p1.x - p0.x, p1.z - p0.z) / Math.max(0.01, t1 - t0);
  };
  const walk = await walkFor([0, -0.7, 0, 0], 600);
  const run = await walkFor([0, -1, 0, 0], 600);
  check(walk > 0.8, `the left stick walks (${walk.toFixed(2)} m/s)`);
  check(run > walk * 1.3, `a full push runs (${run.toFixed(2)} m/s)`);
  const yaw0 = (await ev(() => window.__game.pos())).yaw;
  await axes([0, 0, 1, 0]);
  await sleep(400);
  await axes([0, 0, 0, 0]);
  const yaw1 = (await ev(() => window.__game.pos())).yaw;
  check(Math.abs(yaw1 - yaw0) > 0.2, `the right stick looks around (${(yaw1 - yaw0).toFixed(2)} rad)`);

  // Journal with Y, closed with B; hint with RB.
  await press(Y);
  check((await modals()).includes('journal'), 'Y opens the journal');
  await press(B);
  check(!(await modals()).length, 'B closes it');
  await press(RB);
  check(await page.isVisible('.hint-card'), 'RB shows a hint');

  // The sliding picture: look at it, A opens it, the D-pad picks a tile, A moves it.
  const opened = await ev(() => {
    const g = window.__game;
    const a = g.game.rooms[0].anchors.r1b;
    g.teleport(a.x + 0.9, a.z, 0);
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      g.teleport(a.x + dx * 1.1, a.z + dz * 1.1, 0);
      if (g.lookAt(a.x, a.y, a.z)) return true;
    }
    return false;
  });
  check(opened, 'the sliding picture is in reach');
  await press(A);
  check((await modals()).length === 1, `A uses it (${await modals()})`);
  await page.waitForSelector('.slide-tile');
  const moves0 = await ev(() => window.__game.gs.puzzles.r1b.moves);
  // Sweep the grid with the D-pad until the cursor is on a tile beside the gap.
  const onMovable = () =>
    ev(() => {
      const t = document.querySelector('.slide-tile.pad-hot');
      if (!t) return false;
      const p = window.__game.gs.puzzles.r1b;
      const i = p.tiles.indexOf(Number(t.querySelector('.num').textContent));
      const g = p.gap;
      return Math.abs((i % 4) - (g % 4)) + Math.abs(Math.floor(i / 4) - Math.floor(g / 4)) === 1;
    });
  // Steer the cursor with the D-pad towards the nearest tile beside the gap.
  const aim = () =>
    ev(() => {
      const p = window.__game.gs.puzzles.r1b;
      const g = p.gap;
      const m = document.querySelector('.pad-cursor').style.transform.match(/([-\d.]+)px, ([-\d.]+)px/);
      const cur = { x: +m[1], y: +m[2] };
      let best = null;
      for (const t of document.querySelectorAll('.slide-tile')) {
        const i = p.tiles.indexOf(Number(t.querySelector('.num').textContent));
        if (Math.abs((i % 4) - (g % 4)) + Math.abs(Math.floor(i / 4) - Math.floor(g / 4)) !== 1) continue;
        const r = t.getBoundingClientRect();
        const d = { x: r.left + r.width / 2 - cur.x, y: r.top + r.height / 2 - cur.y };
        if (!best || Math.hypot(d.x, d.y) < Math.hypot(best.x, best.y)) best = d;
      }
      return best;
    });
  let landed = false;
  for (let k = 0; k < 20 && !(landed = await onMovable()); k++) {
    const d = await aim();
    await press(Math.abs(d.x) > Math.abs(d.y) ? (d.x > 0 ? RIGHT : LEFT) : d.y > 0 ? DOWN : UP, 250);
  }
  check(landed, 'the D-pad reaches a tile beside the gap');
  await press(A);
  const moves1 = await ev(() => window.__game.gs.puzzles.r1b.moves);
  check(moves1 === moves0 + 1, 'A slides it');
  await press(B);
  check(!(await modals()).length, 'B closes the puzzle');

  // Start pauses; B resumes.
  await press(START);
  check((await modals()).includes('pause'), 'Start pauses');
  await press(B);
  check(!(await modals()).length, 'B goes back to the game');

  // The mouse takes over again.
  await page.mouse.move(300, 300);
  await page.mouse.move(400, 360);
  check(!(await ev(() => document.body.classList.contains('pad'))), 'moving the mouse switches back');
  check(/W A S D/.test(await ev(() => document.querySelector('.controls')?.textContent || '')), 'with the mouse words');

  if (problems.length) fail(`console problems:\n${problems.join('\n')}`);
  console.log('GAMEPAD PASSED');
} catch (e) {
  console.error('GAMEPAD FAILED:', e.message);
  code = 1;
} finally {
  await browser.close();
  process.exit(code);
}
