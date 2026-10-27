// The greenhouse, basement and balcony, played like a player would: walk up
// to each way in, go through, solve both puzzles on their screens, take the
// little find, and come back. Then the random lock code, and the treasure
// hunt from the envelope to the coupon. Answers come from window.__game.
import { launch, fileUrl, openGame, startNew } from './lib.mjs';

const SHOTS = process.argv[2] || null;
const log = (...a) => console.log('  ·', ...a);
const fail = (msg) => {
  throw new Error(msg);
};

const browser = await launch();
const URL = fileUrl('dist-debug/index.html', '?debug=1&nolock=1&dtmax=0.25&quality=light');
const { page, problems } = await openGame(browser, URL, { width: 800, height: 450 });
const ev = (fn, arg) => page.evaluate(fn, arg);
const waitFor = (fn, arg, timeout = 30000) => page.waitForFunction(fn, arg, { timeout, polling: 100 });
const shot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/side-${name}.png` });
const modal = () => ev(() => window.__game.modal());

// Stand somewhere (optional), look at a point, and check what it offers.
async function look(at, target, expect) {
  let p = null;
  for (let tries = 0; tries < 10; tries++) {
    p = await ev(
      ([at, [x, y, z]]) => {
        const g = window.__game;
        if (at) g.teleport(at[0], at[1], at[2] ?? 0, 0);
        const h = g.lookAt(x, y, z);
        return h ? (typeof h.prompt === 'function' ? h.prompt() : h.prompt) : null;
      },
      [at, target],
    );
    if (p && p.includes(expect)) return p;
    await page.waitForTimeout(400);
  }
  fail(`expected "${expect}" at ${JSON.stringify(target)}, saw "${p}"`);
}
const use = () => ev(() => window.__game.use());
async function go(zone) {
  await waitFor((z) => window.__game.zone() === z, zone, 10000);
  await waitFor(() => !document.querySelector('.fade.on'));
}
async function opened(name) {
  await waitFor((n) => window.__game.modal() === n, name, 8000);
}
async function closedAll() {
  await waitFor(() => !window.__game.modal(), null, 15000);
}
const anchor = (room, id) => ev(([r, i]) => window.__game.game.rooms[r].anchors[i].toArray(), [room, id]);

let ok = false;
try {
  await startNew(page);
  console.log('Side rooms');

  // ---- the random lock code
  const code = await ev(() => window.__game.gs.puzzles.r5a.code);
  if (!/^\d{4}$/.test(code)) fail(`odd lock code ${code}`);
  await ev(() => window.__game.unlockThrough(1));
  const d0 = await ev(() => window.__game.gs.collectedDigits()[0]);
  if (d0 !== code[0]) fail(`the first memory tulip says ${d0}, the code is ${code}`);
  log(`this game's lock code is ${code}; the first memory tulip shows ${d0}`);

  // ---- the greenhouse
  await look([-4.9, -40, -Math.PI / 2], [-5.95, 1.0, -40], 'greenhouse');
  await use();
  await go(7);
  await shot('greenhouse');
  const benchA = await anchor(7, 'water');
  await look([benchA[0] + 1.2, benchA[2], -Math.PI / 2], benchA, 'Water');
  await use();
  await opened('water');
  const order = await ev(() => window.__game.gs.puzzles.water.order());
  // One pot out of turn first: everything waits again.
  await page.locator('.pot').nth(order[1]).click();
  if ((await ev(() => window.__game.gs.puzzles.water.watered.length)) !== 0) fail('a pot out of turn was accepted');
  for (const i of order) await page.locator('.pot').nth(i).click();
  await closedAll();
  if (!(await ev(() => window.__game.gs.puzzles.water.isSolved()))) fail('watering not solved');
  log('watering: out of turn starts again; thirstiest first solves it');
  const lampA = await anchor(7, 'lamps');
  await look([lampA[0] - 1.4, lampA[2], Math.PI / 2], lampA, 'grow lamps');
  await use();
  await opened('lamps');
  const sol = await ev(() => window.__game.gs.puzzles.lamps.solution());
  for (const i of sol) await page.locator('.lamp').nth(i).dispatchEvent('pointerdown');
  await closedAll();
  if (!(await ev(() => window.__game.gs.puzzles.lamps.isSolved()))) fail('lamps not solved');
  log(`grow lamps: lit with ${sol.length} switches`);
  await page.waitForTimeout(2200); // the tulip opens
  await look([0.3, 33.6, 0], [0.3, 1.05, 32.3], 'tulip');
  await use();
  if (!(await ev(() => window.__game.gs.hasFind('bloom')))) fail('the tulip was not found');
  await shot('bloom');
  await look([0, 37, Math.PI], [0, 1.0, 37.94], 'garden');
  await use();
  await go(4);
  log('greenhouse: both puzzles, the tulip, and back to the garden');

  // ---- the basement
  await look([-1.7, -17, Math.PI / 2], [-2.65, 0.05, -17], 'hatch');
  await use();
  await waitFor(() => window.__game.gs.data.cellar);
  await page.waitForTimeout(1400);
  await look([-1.7, -17, Math.PI / 2], [-2.65, 0.05, -17], 'basement');
  await use();
  await go(8);
  if (await ev(() => window.__game.gs.puzzles.fuses.isSolved())) fail('fuses solved already');
  await shot('basement-dark');
  const fuseA = await anchor(8, 'fuses');
  await look([fuseA[0] - 1.2, fuseA[2], Math.PI / 2], fuseA, 'fuse box');
  await use();
  await opened('fuses');
  const fuse = await ev(() => {
    const p = window.__game.gs.puzzles.fuses;
    return { answer: p.answer, bits: p.bits, rules: p.card.length };
  });
  // The lever with the wrong switches does nothing.
  await page.getByRole('button', { name: 'Pull the lever' }).click();
  if (await ev(() => window.__game.gs.puzzles.fuses.isSolved())) fail('the lever worked with the wrong switches');
  for (let i = 0; i < 5; i++) if (!!(fuse.bits & (1 << i)) !== !!(fuse.answer & (1 << i))) await page.locator('.fuse').nth(i).click();
  if (await page.locator('.fuse-card li.broken').count()) fail('rules still marked broken with the right switches');
  await page.getByRole('button', { name: 'Pull the lever' }).click();
  await closedAll();
  await page.waitForTimeout(900);
  const lit = await ev(() => window.__game.game.rooms[8].rig.hemi.intensity);
  if (lit < 0.5) fail('the basement lights did not come on');
  log(`fuse box: ${fuse.rules} rules on the card; the right switches and the lever light the basement`);
  await shot('basement-lit');
  const boardA = await anchor(8, 'pipes');
  await look([boardA[0], boardA[2] + 1.5, 0], boardA, 'pipes');
  await use();
  await opened('pipes');
  // Turn each route piece until it matches the laid route.
  const turns = await ev(() => {
    const p = window.__game.gs.puzzles.pipes;
    const rot = (m) => ((m << 1) | (m >> 3)) & 15;
    return p.path.map((i) => {
      let m = p.masks[i];
      let n = 0;
      while (m !== p.solution[i] && n < 4) ((m = rot(m)), n++);
      return [i, n];
    });
  });
  const box = await page.locator('canvas.pipes').boundingBox();
  const cell = box.width / 6;
  for (const [i, n] of turns)
    for (let k = 0; k < n; k++) {
      if (await ev(() => window.__game.gs.puzzles.pipes.isSolved())) break;
      await page.mouse.click(box.x + cell / 2 + ((i % 5) + 0.5) * cell, box.y + cell / 2 + (Math.floor(i / 5) + 0.5) * cell);
    }
  await closedAll();
  if (!(await ev(() => window.__game.gs.puzzles.pipes.isSolved()))) fail('pipes not solved');
  log('pipes: turned through to the boiler');
  await page.waitForTimeout(2200);
  await look([0.9, 44.6, -Math.PI / 2], [2.0, 0.12, 43.85], 'cat');
  await use();
  if (!(await ev(() => window.__game.gs.hasFind('windup')))) fail('the wind-up cat was not found');
  await look([-1.8, 45.6, Math.PI], [-2.9, 0.9, 47.0], 'kitchen');
  await use();
  await go(2);
  log('basement: both puzzles, the wind-up cat, and back up to the kitchen');

  // ---- the balcony
  await look([3.0, -30.6, -Math.PI / 2], [4.15, 1.1, -30.6], 'balcony');
  await use();
  await go(9);
  await shot('balcony');
  const netA = await anchor(9, 'lanterns');
  await look([netA[0], netA[2] + 1.6, 0], netA, 'lanterns');
  await use();
  await opened('lanterns');
  const target = await ev(() => window.__game.gs.puzzles.lanterns.target);
  for (let i = 0; i < 25; i++) if (target[i]) await page.locator('.lantern').nth(i).dispatchEvent('pointerdown');
  await closedAll();
  if (!(await ev(() => window.__game.gs.puzzles.lanterns.isSolved()))) fail('lanterns not solved');
  log(`lanterns: they draw ${await ev(() => window.__game.gs.puzzles.lanterns.name)}`);
  const cardsA = await anchor(9, 'pairs');
  await look([cardsA[0] - 1.1, cardsA[2] - 0.6, Math.PI / 2 - 0.5], cardsA, 'star cards');
  await use();
  await opened('pairs');
  const deck = await ev(() => window.__game.gs.puzzles.pairs.cards);
  // One miss first, then every pair.
  const miss = deck.findIndex((c) => c !== deck[0]);
  await page.locator('.scard').nth(0).dispatchEvent('pointerdown');
  await page.locator('.scard').nth(miss).dispatchEvent('pointerdown');
  await page.waitForTimeout(1100);
  const done = new Set();
  for (let i = 0; i < 12; i++) {
    if (done.has(i)) continue;
    const j = deck.findIndex((c, k) => k !== i && c === deck[i]);
    done.add(i).add(j);
    await page.locator('.scard').nth(i).dispatchEvent('pointerdown');
    await page.locator('.scard').nth(j).dispatchEvent('pointerdown');
  }
  await closedAll();
  if (!(await ev(() => window.__game.gs.puzzles.pairs.isSolved()))) fail('star cards not solved');
  log('star cards: a miss turns back over; all six pairs found');
  await page.waitForTimeout(2200);
  await look([-1.8, 58.5, Math.PI / 2], [-2.65, 1.17, 58.5], 'lantern go');
  await use();
  if (!(await ev(() => window.__game.gs.hasFind('wish')))) fail('the wish lantern was not found');
  await shot('wish');
  await look([0, 60.0, Math.PI], [0, 1.1, 60.95], 'study');
  await use();
  await go(3);
  log('balcony: both puzzles, the wish lantern, and back to the study');

  await ev(() => window.__game.game.openJournal());
  const heads = await page.locator('.journal h3').allTextContents();
  const pz = heads.find((h) => h.startsWith('Puzzles'));
  if (!pz || !/\/16$/.test(pz.trim())) fail(`journal puzzle count: ${pz}`);
  log(`journal: ${pz.trim()}`);
  await ev(() => window.__game.closeModals());

  // ---- the treasure hunt
  await ev(() => {
    window.__game.setCoupon('Good for one test.');
    window.__game.gs.finish();
  });
  const spots = await ev(() => window.__game.gs.data.hunt.spots);
  log(`hunt order this game: ${spots.join(' → ')}`);
  const where = (id) =>
    ev((id) => {
      const g = window.__game.game;
      const h = g.huntNotes[id];
      const p = h.getWorldPosition(new window.__game.THREE.Vector3());
      const a = g.rooms[g.gs.puzzles[id].room].anchors[id];
      const d = new window.__game.THREE.Vector3(p.x - a.x, 0, p.z - a.z).normalize();
      return { p: [p.x, 0.1, p.z], stand: [p.x + d.x * 1.0, p.z + d.z * 1.0] };
    }, id);
  for (let k = 0; k < spots.length; k++) {
    const id = spots[k];
    const { p, stand } = await where(id);
    await waitFor((id) => window.__game.game.huntNotes[id].visible, id, 5000).catch(() => fail(`note ${k + 1} (${id}) is not out`));
    const last = k === spots.length - 1;
    await look([stand[0], stand[1], Math.atan2(-(p[0] - stand[0]), -(p[2] - stand[1]))], p, last ? 'envelope' : 'note');
    await use();
    if (last) await opened('coupon');
    else await opened('clue');
    const text = await page.locator(last ? '.coupon' : '.paper.clue').textContent();
    if (last && !text.includes('Good for one test.')) fail('the coupon has the wrong words');
    if (!last && !text.includes('The ')) fail(`note ${k + 1} says: ${text}`);
    await ev(() => window.__game.closeModals());
  }
  if (!(await ev(() => window.__game.gs.huntDone()))) fail('the hunt did not finish');
  log('hunt: every note in order, then the coupon');
  // Every place a note can be is reachable (other games pick other ones).
  const all = await ev(() => Object.keys(window.__game.game.huntNotes));
  for (const id of all) {
    await ev((id) => {
      const gs = window.__game.gs;
      gs.data.hunt.spots = [id, ...gs.data.hunt.spots.filter((s) => s !== id)].slice(0, 2);
      gs.data.hunt.found = 0;
    }, id);
    await waitFor((id) => window.__game.game.huntNotes[id].visible, id, 5000);
    const { p, stand } = await where(id);
    await look([stand[0], stand[1], 0], p, 'note');
  }
  log(`every one of the ${all.length} note spots can be reached and read`);

  if (problems.length) fail(`console problems:\n${problems.join('\n')}`);
  ok = true;
} catch (e) {
  console.error('  ✗', e.message);
  await shot('failure');
} finally {
  await browser.close();
}
console.log(ok ? 'SIDEROOMS PASSED' : 'SIDEROOMS FAILED');
process.exitCode = ok ? 0 : 1;
