// Full playthrough of the debug build: every puzzle is solved through the real
// interaction path (look at it + use, or the overlay UI), every door is opened
// with its keys, the player walks through each doorway, reaches the ending and
// reads the letter. Fails on any console error or warning.
import { launch, fileUrl, openGame, startNew } from './lib.mjs';
import { neighbours, SOLVED_TILES, N as SN } from '../src/puzzles/sliding.js';

const SHOTS = process.argv[2] || null;
const log = (...a) => console.log('  ·', ...a);
const fail = (msg) => {
  throw new Error(msg);
};

const browser = await launch();
const { page, problems } = await openGame(browser, fileUrl('dist-debug/index.html', '?debug=1&nolock=1&dtmax=0.25'), { width: 800, height: 450 });
const ev = (fn, arg) => page.evaluate(fn, arg);
const waitFor = (fn, arg, timeout = 60000) => page.waitForFunction(fn, arg, { timeout, polling: 100 });
const shot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png` });
const modal = () => ev(() => window.__game.modal());

// Teleport (optional), look at a point, check there is something to use, use it.
async function lookUse(at, target, { alt = false, expect = null } = {}) {
  if (at) await ev(([x, z]) => window.__game.teleport(x, z), at);
  const prompt = await ev(([x, y, z]) => {
    const h = window.__game.lookAt(x, y, z);
    return h ? (typeof h.prompt === 'function' ? h.prompt() : h.prompt) : null;
  }, target);
  if (!prompt) fail(`nothing to use at ${JSON.stringify(target)} from ${JSON.stringify(at)}`);
  if (expect && !prompt.includes(expect)) fail(`expected "${expect}" but saw "${prompt}" at ${JSON.stringify(target)}`);
  await ev((alt) => window.__game.use(alt), alt);
  await page.waitForTimeout(120);
  return prompt;
}

async function closeModal(buttonName) {
  await page.getByRole('button', { name: buttonName }).last().click();
  await waitFor(() => !window.__game.modal());
}

async function readNote(at, target) {
  await lookUse(at, target, { expect: 'note' });
  if ((await modal()) !== 'note') fail('note did not open');
  await closeModal('Put it down');
}

async function waitKeys(room) {
  await waitFor((r) => window.__game.gs.hasKey(r, 'gold') && window.__game.gs.hasKey(r, 'silver'), room);
  // The HUD fills once both key animations have landed.
  await waitFor(() => document.querySelectorAll('.keys .slot.have').length === 2);
}

async function openDoorAndWalk(room, zN) {
  await waitKeys(room);
  await lookUse([0, zN + 1.3], [0, 1.0, zN], { expect: 'Use the keys' });
  await waitFor((r) => window.__game.gs.isDoorOpen(r), room);
  // Walk straight through the doorway and hallway with real movement + collision.
  await ev(([z]) => window.__game.teleport(0, z, 0, 0), [zN + 1.0]);
  for (let i = 0; i < 12; i++) {
    const p = await ev(() => window.__game.walk(['KeyW'], 10, 1 / 30));
    if (p.z < zN - 3.2) break;
  }
  // The zone updates on the next rendered frame.
  await waitFor((r) => window.__game.zone() === r + 1, room, 15000).catch(() => {});
  const z = await ev(() => window.__game.zone());
  if (z !== room + 1) fail(`walking through door ${room} ended in zone ${z}`);
  log(`door ${room} opened, walked into zone ${z}`);
}

// IDA* solver for the sliding puzzle (Manhattan distance); returns the tile
// values to click, in order.
function solveSliding(start) {
  const goalPos = new Map(SOLVED_TILES.map((v, i) => [v, i]));
  const h = (t) => {
    let d = 0;
    t.forEach((v, i) => {
      if (!v) return;
      const g = goalPos.get(v);
      d += Math.abs((i % SN) - (g % SN)) + Math.abs(Math.floor(i / SN) - Math.floor(g / SN));
    });
    return d;
  };
  const t = start.slice();
  const path = [];
  let bound = h(t);
  const search = (gap, g, prev) => {
    const hh = h(t);
    if (hh === 0) return true;
    const f = g + hh;
    if (f > bound) return f;
    let min = Infinity;
    for (const n of neighbours(gap)) {
      if (n === prev) continue;
      const v = t[n];
      t[gap] = v;
      t[n] = 0;
      path.push(v);
      const r = search(n, g + 1, gap);
      if (r === true) return true;
      if (r < min) min = r;
      path.pop();
      t[n] = v;
      t[gap] = 0;
    }
    return min;
  };
  for (;;) {
    const r = search(t.indexOf(0), 0, -1);
    if (r === true) return path;
    if (r === Infinity) return null;
    bound = r;
  }
}

// Breadth-first search over book orders reachable by turns: [center, dir][].
function solveBooks(order, goal) {
  const key = (o) => o.join(',');
  const prev = new Map([[key(order), null]]);
  let frontier = [order];
  while (frontier.length) {
    const next = [];
    for (const o of frontier) {
      if (key(o) === key(goal)) {
        const moves = [];
        let k = key(o);
        while (prev.get(k)) {
          const [pk, mv] = prev.get(k);
          moves.unshift(mv);
          k = pk;
        }
        return moves;
      }
      for (let c = 1; c <= o.length - 2; c++)
        for (const dir of [1, -1]) {
          const q = o.slice();
          const t3 = q.slice(c - 1, c + 2);
          q.splice(c - 1, 3, ...(dir > 0 ? [t3[2], t3[0], t3[1]] : [t3[1], t3[2], t3[0]]));
          const k = key(q);
          if (!prev.has(k)) {
            prev.set(k, [key(o), [c, dir]]);
            next.push(q);
          }
        }
    }
    frontier = next;
  }
  return null;
}

try {
  console.log('Playthrough');
  await startNew(page);
  await shot('p00-start');

  // ------------------------------------------------------------- Room 1
  log('room 1: frames (A) then painting (B)');
  await readNote([-0.5, 2.4], [-0.27, 0.69, 3.2]);
  const slots = [-3.0, -2.5, -2.0, -1.5, -1.0];
  const goal = ['winter-far', 'spring-far', 'summer-closer', 'autumn-closer', 'winter-together'];
  for (let i = 0; i < goal.length; i++) {
    const order = await ev(() => window.__game.gs.puzzles.r1a.order.slice());
    const j = order.indexOf(goal[i]);
    if (j === i) continue;
    await lookUse([-2.0, -1.7], [slots[j], 1.66, -3.47], { expect: 'Pick up' });
    await page.waitForTimeout(400);
    await lookUse(null, [slots[i], 1.66, -3.47], { expect: 'Swap' });
    await page.waitForTimeout(700);
  }
  if (!(await ev(() => window.__game.gs.puzzles.r1a.isSolved()))) fail('frames not solved');
  await lookUse([-2.0, -1.5], [-2.85, 0.03, -2.3], { expect: 'painting' });
  if ((await modal()) !== 'sliding') fail('sliding overlay did not open');
  await page.getByRole('button', { name: 'Numbers' }).click();
  await shot('p01-sliding');
  // A real move first, then the hint path to the gentle shuffle (as a stuck
  // player would), then finish with a solver.
  const firstMove = await ev(() => {
    const p = window.__game.gs.puzzles.r1b;
    const g = p.gap;
    const n = [g - 1, g + 1, g - 4, g + 4].find((i) => i >= 0 && i < 16 && p.canMove(i));
    return p.tiles[n];
  });
  await page
    .locator('.slide-tile')
    .nth(firstMove - 1)
    .dispatchEvent('pointerdown');
  if ((await ev(() => window.__game.gs.puzzles.r1b.moves)) !== 1) fail('sliding move did not register');
  for (let k = 0; k < 3; k++) await page.getByRole('button', { name: 'Hint (H)' }).click();
  await page.getByRole('button', { name: 'Gentle shuffle' }).click();
  const tiles = await ev(() => window.__game.gs.puzzles.r1b.tiles.slice());
  const moves = solveSliding(tiles);
  log(`sliding (4x4, after gentle shuffle): ${moves.length} moves`);
  for (const v of moves)
    await page
      .locator('.slide-tile')
      .nth(v - 1)
      .dispatchEvent('pointerdown');
  await waitFor(() => window.__game.gs.puzzles.r1b.isSolved());
  await waitFor(() => !window.__game.modal(), null, 20000);
  await openDoorAndWalk(0, -3.5);

  // ------------------------------------------------------------- Room 2
  log('room 2: books (B) then vases (A)');
  await readNote([2.9, -9.9], [3.73, 1.29, -10.05]);
  const order2 = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet', 'pink'];
  const bookZ = (i) => -9.5 + 0.56 - i * 0.16;
  const startOrder = await ev(() => window.__game.gs.puzzles.r2b.order.slice());
  const turns = solveBooks(startOrder, order2);
  log(`books: ${turns.length} turns needed`);
  for (const [c, dir] of turns) {
    await lookUse([-2.7, -9.5], [-4.01, 1.13, bookZ(c)], { expect: 'Turn', alt: dir < 0 });
    await page.waitForTimeout(550);
  }
  if (!(await ev(() => window.__game.gs.puzzles.r2b.isSolved()))) fail('books not solved');
  await shot('p02-books');
  const vase = await ev(() => {
    const p = window.__game.gs.puzzles.r2a;
    return { sol: p.solution.slice(), fixed: p.slots.map((c, i) => p.isFixed(i)) };
  });
  let firstOpen = true;
  for (let i = 0; i < vase.sol.length; i++) {
    if (vase.fixed[i]) continue;
    const at = [-3.5 + i * 0.235, 0.82, -13.28];
    await lookUse([-2.2, -12.2], at, { expect: 'Plant' });
    if ((await modal()) !== 'vase') fail('vase picker did not open');
    if (firstOpen) {
      // A wrong colour first, then change it.
      await shot('p03-vase');
      await page.getByRole('button', { name: vase.sol[i] === 'B' ? 'White' : 'Blue' }).click();
      await waitFor(() => !window.__game.modal());
      await lookUse(null, at, { expect: 'Change' });
      firstOpen = false;
    }
    await page.getByRole('button', { name: vase.sol[i] === 'B' ? 'Blue' : 'White' }).click();
    await waitFor(() => !window.__game.modal());
  }
  if (!(await ev(() => window.__game.gs.puzzles.r2a.isSolved()))) fail('vases not solved');
  await openDoorAndWalk(1, -13.5);

  // ------------------------------------------------------------- Room 3
  log('room 3: fridge word (A) then dials (B)');
  await readNote([-1.9, -21.0], [-2.776, 0.6, -21.19]);
  // Turn the wheel poster to the right step, as she would to decode the card.
  for (let k = 0; k < 3; k++) await lookUse([-1.8, -20.2], [-3.47, 1.6, -20.2], { expect: 'Turn the wheel' });
  if ((await ev(() => window.__game.gs.puzzles.r3a.wheel)) !== 3) fail('wheel did not turn');
  const word = await ev(() => window.__game.gs.puzzles.r3a.word);
  // Put a wrong letter first and take it off with the eraser magnet.
  const magnet = (ch) => {
    const i = ch.charCodeAt(0) - 65;
    return [-2.78, 1.62 - Math.floor(i / 7) * 0.1, -21.25 + 0.3 - (i % 7) * 0.095];
  };
  await lookUse([-1.95, -20.95], magnet('Q'), { expect: 'Put Q' });
  await lookUse(null, [-2.774, 1.08, -21.25 - 0.345], { expect: 'Take the last' });
  for (const ch of word) await lookUse(null, magnet(ch), { expect: `Put ${ch}` });
  if (!(await ev(() => window.__game.gs.puzzles.r3a.isSolved()))) fail('cipher not solved');
  await shot('p04-fridge');
  const target = [4, 9, 5, 2];
  if ((await ev(() => window.__game.gs.puzzles.r3b.values.length)) !== 4) fail('expected four dials');
  for (let d = 0; d < 4; d++) {
    // Up by clicking, or down with right-click when that is shorter (9 = one step down).
    const up = target[d];
    const down = (10 - target[d]) % 10;
    const alt = down < up;
    for (let k = 0; k < (alt ? down : up); k++)
      await lookUse(d === 0 && k === 0 ? [1.9, -19.0] : null, [2.785, 0.8, -19.0 + (d - 1.5) * 0.18], { expect: `dial ${d + 1}`, alt });
  }
  if (!(await ev(() => window.__game.gs.puzzles.r3b.isSolved()))) fail('dials not solved');
  await openDoorAndWalk(2, -22.5);

  // ------------------------------------------------------------- Room 4
  log('room 4: sudoku (B) then hide and seek (A)');
  await lookUse([-2.2, -26.1], [-2.2, 1.5, -24.55], { expect: 'chalkboard' });
  if ((await modal()) !== 'sudoku') fail('sudoku did not open');
  const sud = await ev(() => ({ grid: window.__game.gs.puzzles.r4b.grid.slice(), sol: window.__game.gs.puzzles.r4b.solution.slice() }));
  if (sud.grid.length !== 36) fail('expected a 6x6 sudoku');
  // One wrong entry first, checked, then corrected.
  const firstEmpty = sud.grid.indexOf(0);
  await page.locator('.sudoku .cell').nth(firstEmpty).dispatchEvent('pointerdown');
  await page
    .locator('.numpad .btn')
    .nth(sud.sol[firstEmpty] % 6)
    .click();
  await page.getByRole('button', { name: 'Check' }).click();
  if (!(await page.locator('.sudoku .cell.wrong').count())) fail('sudoku check did not mark the wrong cell');
  await shot('p05-sudoku');
  for (let i = 0; i < 36; i++) {
    if (sud.grid[i]) continue;
    await page.locator('.sudoku .cell').nth(i).dispatchEvent('pointerdown');
    await page
      .locator('.numpad .btn')
      .nth(sud.sol[i] - 1)
      .click();
  }
  await waitFor(() => window.__game.gs.puzzles.r4b.isSolved());
  await waitFor(() => !window.__game.modal(), null, 20000);
  await readNote([2.6, -28.4], [3.64, 0.88, -28.68]);
  // Hide and seek: wait until both cats have slipped into their spots.
  await ev(() => {
    window.__game.teleport(0.2, -28.3);
    window.__game.lookAt(0.2, 2.8, -28.35); // look up at the ceiling: no hiding spot in view
  });
  await waitFor(() => window.__game.game.cats.cats.every((c) => c.state === 'hidden'));
  const spotView = [
    [
      [2.4, -28.2],
      [3.47, 0.45, -28.3],
    ],
    [
      [-3.1, -27.95],
      [-4.0, 1.2, -27.15],
    ],
    [
      [2.3, -26.3],
      [3.45, 0.32, -25.25],
    ],
    [
      [-2.4, -31.0],
      [-3.35, 0.3, -31.65],
    ],
    [
      [-1.3, -26.2],
      [-2.3, 0.45, -26.95],
    ],
    [
      [-2.7, -25.7],
      [-3.7, 0.35, -24.95],
    ],
  ];
  const before = await ev(() => ({ ...window.__game.gs.puzzles.r4a.spots }));
  const taken = new Set(Object.values(before));
  const empty = [0, 1, 2, 3, 4, 5].find((i) => !taken.has(i));
  await lookUse(...spotView[empty], { expect: 'Look' });
  if (await ev(() => Object.values(window.__game.gs.puzzles.r4a.found).some(Boolean))) fail('empty spot found a cat');
  const after = await ev(() => ({ ...window.__game.gs.puzzles.r4a.spots }));
  if (after.tchobin === before.tchobin && after.zizo === before.zizo) fail('cats did not sneak away after a wrong guess');
  if (Object.values(after).includes(empty)) fail('a cat moved into the spot just searched');
  log(`wrong guess: cats moved ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
  await shot('p06-study-empty-spot');
  // They only sneak while out of sight: look away, then wait for the move.
  await ev(() => {
    window.__game.teleport(0.2, -28.3);
    window.__game.lookAt(0.2, 2.8, -28.35); // look up at the ceiling: no hiding spot in view
  });
  await waitFor(() => window.__game.game.cats.cats.every((c) => !c.pending));
  for (const cat of ['tchobin', 'zizo']) {
    const spot = await ev((c) => window.__game.gs.puzzles.r4a.spots[c], cat);
    await lookUse(...spotView[spot]);
    await page.waitForTimeout(300);
  }
  if (!(await ev(() => window.__game.gs.puzzles.r4a.isSolved()))) fail('hide and seek not solved');
  await page.waitForTimeout(2500);
  await ev(() => window.__game.teleport(1.6, -28.2, -Math.PI / 2, -0.35));
  await page.waitForTimeout(1500);
  await shot('p07-cats-together');
  await openDoorAndWalk(3, -32.5);

  // ------------------------------------------------------------- Room 5
  log('room 5: gate lock (A) then telescope (B)');
  await readNote([-2.5, -39.6], [-3.62, 0.58, -39.6]);
  const digits = await ev(() => window.__game.gs.collectedDigits());
  if (digits.some((d) => d === null)) fail('missing memory digits: ' + digits);
  log(`journal digits: ${digits.join('')}`);
  await page.keyboard.press('Tab');
  await waitFor(() => window.__game.modal() === 'journal');
  await page.waitForTimeout(600);
  await shot('p08-journal');
  await page.keyboard.press('Tab');
  await waitFor(() => !window.__game.modal());
  await lookUse([0.7, -45.6], [0.7, 1.25, -46.39], { expect: 'lock' });
  if ((await modal()) !== 'lock') fail('lock overlay did not open');
  for (const d of '1111') await page.keyboard.press(`Digit${d}`);
  await page.keyboard.press('Enter');
  if (await ev(() => window.__game.gs.puzzles.r5a.isSolved())) fail('wrong code opened the lock');
  for (const d of digits) await page.keyboard.press(`Digit${d}`);
  await shot('p09-lock');
  await page.keyboard.press('Enter');
  await waitFor(() => window.__game.gs.puzzles.r5a.isSolved());
  await waitFor(() => !window.__game.modal(), null, 20000);
  await lookUse([2.4, -41.5], [3.4, 1.1, -42.1], { expect: 'telescope' });
  if ((await modal()) !== 'constellation') fail('telescope overlay did not open');
  const stars = JSON.parse(await page.locator('.sky-wrap canvas').getAttribute('data-stars'));
  const loose = JSON.parse(await page.locator('.sky-wrap canvas').getAttribute('data-loose'));
  const box = await page.locator('.sky-wrap canvas').boundingBox();
  const clickAt = ([x, y]) => page.mouse.click(box.x + x * box.width, box.y + y * box.height);
  await clickAt(stars[5]); // the other J: should just fade
  await clickAt(loose[0]); // a loose J that belongs to no month
  if ((await ev(() => window.__game.gs.puzzles.r5b.progress)) !== 0) fail('wrong star counted');
  for (let i = 0; i < stars.length; i++) {
    await clickAt(stars[i]);
    if (i === 7) await shot('p10-constellation');
  }
  await waitFor(() => window.__game.gs.puzzles.r5b.isSolved());
  await waitFor(() => !window.__game.modal(), null, 20000);
  await waitKeys(4);
  await lookUse([0, -45.4], [0, 1.0, -46.5], { expect: 'Use the keys' });
  await waitFor(() => window.__game.gs.isDoorOpen(4));
  log('gate opened');

  // ------------------------------------------------------------ Ending
  await ev(() => window.__game.teleport(0, -46.0, 0, 0));
  for (let i = 0; i < 10; i++) {
    const p = await ev(() => window.__game.walk(['KeyW'], 10, 1 / 30));
    if (p.z < -51.6) break;
  }
  await waitFor(() => window.__game.zone() === 5, null, 15000).catch(() => {});
  const zEnd = await ev(() => window.__game.zone());
  if (zEnd !== 5) fail(`did not reach the clearing (zone ${zEnd})`);
  await waitFor(() => window.__game.game.cats.cats.every((c) => c.state === 'ending'));
  await ev(() => window.__game.lookAt(0, 0.35, -53.8));
  await waitFor(() => window.__game.game.cats.cats.every((c) => c.model.tailHeart > 0.98), null, 40000);
  await shot('p11-heart');
  await lookUse(null, [0, 0.36, -52.82], { expect: 'envelope' });
  if ((await modal()) !== 'letter') fail('letter did not open');
  await page.waitForTimeout(4500);
  await shot('p12-letter-open');
  // Speed it up, then wait for the end card.
  await page.mouse.click(400, 300);
  await page.waitForSelector('.the-end.on', { timeout: 120000 });
  await page.waitForTimeout(1600);
  await shot('p13-the-end');
  const letterText = await page.locator('.letter').innerText();
  if (!letterText.includes('I love you more than you can imagine.')) fail('letter text missing');
  await page.getByRole('button', { name: 'Keep wandering' }).click();
  await waitFor(() => !window.__game.modal());
  if (!(await ev(() => window.__game.gs.data.finished))) fail('finished flag not set');
  if ((await ev(() => window.__game.gs.solvedCount())) !== 10) fail('not all puzzles solved');
  await page.waitForTimeout(1500);
  const saved = await ev(() => JSON.parse(localStorage.getItem('sundayNight.save.v2')));
  if (!saved?.finished) fail('finished state not saved');
  log('ending reached, letter read, finished state saved');

  if (problems.length) fail('console problems:\n' + problems.join('\n'));
  console.log('PLAYTHROUGH PASSED');
} catch (e) {
  console.log('PLAYTHROUGH FAILED:', e.message);
  if (problems.length) console.log(problems.join('\n'));
  await shot('p-fail');
  process.exitCode = 1;
} finally {
  await browser.close();
}
