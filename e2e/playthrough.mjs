// Full playthrough of the debug build: every puzzle is solved through the real
// interaction path (look at it + use, or the overlay UI), every door is opened
// with its keys, the player walks through each doorway, reaches the ending and
// reads the letter. Fails on any console error or warning.
import { launch, fileUrl, openGame, startNew } from './lib.mjs';
import { neighbours, SOLVED_TILES } from '../src/puzzles/sliding.js';

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

// BFS solver for the sliding puzzle; returns the indices to click in order.
function solveSliding(start) {
  const key = (t) => t.join('');
  const goal = key(SOLVED_TILES);
  const prev = new Map([[key(start), null]]);
  let frontier = [start];
  while (frontier.length) {
    const next = [];
    for (const t of frontier) {
      if (key(t) === goal) {
        const moves = [];
        let k = goal;
        while (prev.get(k)) {
          const [pk, moved] = prev.get(k);
          moves.unshift(moved);
          k = pk;
        }
        return moves;
      }
      const g = t.indexOf(0);
      for (const n of neighbours(g)) {
        const c = t.slice();
        c[g] = c[n];
        c[n] = 0;
        const k = key(c);
        if (!prev.has(k)) {
          prev.set(k, [key(t), t[n]]);
          next.push(c);
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
  await readNote([-0.4, 2.45], [-0.36, 0.59, 3.08]);
  const slots = [-2.55, -1.95, -1.35];
  const goal = ['far', 'closer', 'together'];
  for (let i = 0; i < 3; i++) {
    const order = await ev(() => window.__game.gs.puzzles.r1a.order.slice());
    const j = order.indexOf(goal[i]);
    if (j === i) continue;
    await lookUse([-1.95, -1.9], [slots[j], 1.62, -3.47], { expect: 'Pick up' });
    await page.waitForTimeout(400);
    await lookUse(null, [slots[i], 1.62, -3.47], { expect: 'Swap' });
    await page.waitForTimeout(700);
  }
  if (!(await ev(() => window.__game.gs.puzzles.r1a.isSolved()))) fail('frames not solved');
  await lookUse([-2.0, -1.5], [-2.9, 0.05, -2.4], { expect: 'painting' });
  if ((await modal()) !== 'sliding') fail('sliding overlay did not open');
  await page.getByRole('button', { name: 'Numbers' }).click();
  await shot('p01-sliding');
  const tiles = await ev(() => window.__game.gs.puzzles.r1b.tiles.slice());
  const moves = solveSliding(tiles);
  log(`sliding: ${moves.length} moves`);
  for (const v of moves)
    await page
      .locator('.slide-tile')
      .nth(v - 1)
      .dispatchEvent('mousedown');
  await waitFor(() => window.__game.gs.puzzles.r1b.isSolved());
  await waitFor(() => !window.__game.modal(), null, 20000);
  await openDoorAndWalk(0, -3.5);

  // ------------------------------------------------------------- Room 2
  log('room 2: books (B) then vases (A)');
  await readNote([2.9, -9.9], [3.98, 1.28, -9.92]);
  const order2 = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet', 'pink'];
  const bookZ = (i) => -9.5 + 0.56 - i * 0.16;
  for (let i = 0; i < 8; i++) {
    const order = await ev(() => window.__game.gs.puzzles.r2b.order.slice());
    const j = order.indexOf(order2[i]);
    if (j === i) continue;
    await lookUse([-2.7, -9.5], [-4.01, 1.13, bookZ(j)], { expect: 'Pick up' });
    await page.waitForTimeout(450);
    await lookUse(null, [-4.01, 1.13, bookZ(i)], { expect: 'Swap' });
    await page.waitForTimeout(700);
  }
  if (!(await ev(() => window.__game.gs.puzzles.r2b.isSolved()))) fail('books not solved');
  await shot('p02-books');
  for (const i of [6, 7, 8]) {
    await lookUse([-2.0, -12.3], [-3.35 + i * 0.29, 0.82, -13.28], { expect: 'Plant' });
    if ((await modal()) !== 'vase') fail('vase picker did not open');
    if (i === 6) await shot('p03-vase');
    // Try a wrong colour first on slot 7, then fix it.
    if (i === 6) {
      await page.getByRole('button', { name: 'White' }).click();
      await waitFor(() => !window.__game.modal());
      await lookUse(null, [-3.35 + i * 0.29, 0.82, -13.28], { expect: 'Change' });
    }
    await page.getByRole('button', { name: 'Blue' }).click();
    await waitFor(() => !window.__game.modal());
  }
  if (!(await ev(() => window.__game.gs.puzzles.r2a.isSolved()))) fail('vases not solved');
  await openDoorAndWalk(1, -13.5);

  // ------------------------------------------------------------- Room 3
  log('room 3: fridge word (A) then dials (B)');
  await readNote([-1.9, -21.0], [-2.77, 0.55, -21.13]);
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
  const turns = [6, 5, 3];
  for (let d = 0; d < 3; d++) {
    for (let k = 0; k < turns[d]; k++)
      await lookUse(d === 0 && k === 0 ? [1.9, -19.0] : null, [2.79, 0.8, -19.24 + d * 0.24], { expect: `dial ${d + 1}` });
  }
  if (!(await ev(() => window.__game.gs.puzzles.r3b.isSolved()))) fail('dials not solved');
  await openDoorAndWalk(2, -22.5);

  // ------------------------------------------------------------- Room 4
  log('room 4: sudoku (B) then hide and seek (A)');
  await lookUse([-2.2, -26.1], [-2.2, 1.5, -24.55], { expect: 'chalkboard' });
  if ((await modal()) !== 'sudoku') fail('sudoku did not open');
  const sud = await ev(() => ({ grid: window.__game.gs.puzzles.r4b.grid.slice(), sol: window.__game.gs.puzzles.r4b.solution.slice() }));
  // One wrong entry first, checked, then corrected.
  const firstEmpty = sud.grid.indexOf(0);
  await page.locator('.sudoku .cell').nth(firstEmpty).dispatchEvent('mousedown');
  await page
    .locator('.numpad .btn')
    .nth(sud.sol[firstEmpty] % 4)
    .click();
  await page.getByRole('button', { name: 'Check' }).click();
  if (!(await page.locator('.sudoku .cell.wrong').count())) fail('sudoku check did not mark the wrong cell');
  await shot('p05-sudoku');
  for (let i = 0; i < 16; i++) {
    if (sud.grid[i]) continue;
    await page.locator('.sudoku .cell').nth(i).dispatchEvent('mousedown');
    await page
      .locator('.numpad .btn')
      .nth(sud.sol[i] - 1)
      .click();
  }
  await waitFor(() => window.__game.gs.puzzles.r4b.isSolved());
  await waitFor(() => !window.__game.modal(), null, 20000);
  await readNote([2.6, -28.4], [3.69, 0.78, -28.65]);
  // Hide and seek: wait until both cats have slipped into their spots.
  await ev(() => window.__game.lookAt(0, 1.5, -20));
  await waitFor(() => window.__game.game.cats.cats.every((c) => c.state === 'hidden'));
  const spots = await ev(() => ({ ...window.__game.gs.puzzles.r4a.spots }));
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
  ];
  const taken = new Set(Object.values(spots));
  const empty = [0, 1, 2, 3].find((i) => !taken.has(i));
  await lookUse(...spotView[empty], { expect: 'Look' });
  if (await ev(() => Object.values(window.__game.gs.puzzles.r4a.found).some(Boolean))) fail('empty spot found a cat');
  await shot('p06-study-empty-spot');
  for (const cat of ['tchobin', 'zizo']) {
    await lookUse(...spotView[spots[cat]]);
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
  await readNote([-2.5, -39.6], [-3.55, 0.48, -39.65]);
  const digits = await ev(() => window.__game.gs.collectedDigits());
  if (digits.some((d) => d === null)) fail('missing memory digits: ' + digits);
  log(`journal digits: ${digits.join('')}`);
  await page.keyboard.press('Tab');
  await waitFor(() => window.__game.modal() === 'journal');
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
  const box = await page.locator('.sky-wrap canvas').boundingBox();
  const clickStar = (i) => page.mouse.click(box.x + stars[i][0] * box.width, box.y + stars[i][1] * box.height);
  await clickStar(5); // wrong first: should just fade
  if ((await ev(() => window.__game.gs.puzzles.r5b.progress)) !== 0) fail('wrong star counted');
  for (let i = 0; i < stars.length; i++) {
    await clickStar(i);
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
  const saved = await ev(() => JSON.parse(localStorage.getItem('sundayNight.save.v1')));
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
