// The attic: pull the cord in the bedroom ceiling, climb the ladder, play the
// piano's tune back through its keys, read the card, open the picture lock on
// the trunk with the card's answer, take the photo (the sixth little find),
// check the walls and the hatch with real movement, continue a save made up
// there, and climb back down. Answers come from window.__game.
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
const shot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/attic-${name}.png` });
const prompt = () => ev(() => window.__game.hovered());

// Stand somewhere (optional), look at a point, and check what it offers.
async function look(at, target, expect) {
  let p = null;
  for (let tries = 0; tries < 10; tries++) {
    p = await ev(
      ([at, [x, y, z]]) => {
        const g = window.__game;
        if (at) g.teleport(at[0], at[1]);
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

let ok = false;
try {
  await startNew(page);
  console.log('Attic');

  // ---- the ladder
  await look([1.2, 0.3], [1.6, 2.15, -1.33], 'Pull the cord');
  await use();
  await waitFor(() => window.__game.gs.data.attic.ladder);
  await look([1.6, 1.0], [1.6, 1.4, -0.4], 'Climb up');
  await shot('ladder');
  // The ladder is solid once down: walking north into it stops at its foot.
  const stopped = await ev(() => {
    window.__game.teleport(1.6, 1.0, 0, 0);
    return window.__game.walk(['KeyW'], 90, 1 / 30).z;
  });
  if (stopped < 0.2) fail(`walked through the ladder (z ${stopped.toFixed(2)})`);
  await look([1.6, 1.0], [1.6, 1.4, -0.4], 'Climb up');
  await use();
  await waitFor(() => window.__game.zone() === 6, null, 10000);
  await waitFor(() => !document.querySelector('.fade.on'));
  log('the cord brings the ladder down; climbing it leads to the attic');
  await shot('arrive');

  // ---- walls, eaves and the hatch, with real movement
  const moves = await ev(() => {
    const g = window.__game;
    const out = {};
    g.teleport(0, 21.5, -Math.PI / 2, 0); // facing east
    out.east = g.walk(['KeyW'], 150, 1 / 30).x;
    g.teleport(0, 21.5, Math.PI / 2, 0); // facing west
    out.west = g.walk(['KeyW'], 150, 1 / 30).x;
    g.teleport(-0.6, 20.5, 0, 0); // facing north, past the trunk's side
    out.north = g.walk(['KeyW'], 150, 1 / 30).z;
    g.teleport(0.9, 22.9, Math.PI, 0); // facing south, straight at the hatch
    out.hatch = g.walk(['KeyW'], 120, 1 / 30).z;
    return out;
  });
  if (moves.east > 1.75 || moves.west < -1.75) fail(`walked under the eaves: ${JSON.stringify(moves)}`);
  if (moves.north < 18.1) fail(`walked through the north wall: ${JSON.stringify(moves)}`);
  if (moves.hatch > 23.6) fail(`walked into the hatch: ${JSON.stringify(moves)}`);
  log('walls, eaves and the hatch hold');

  // ---- the piano
  const hint = await ev(() => {
    const g = window.__game;
    g.teleport(-0.5, 21.2, 0, 0);
    g.lookAt(-1.75, 0.95, 21.2);
    g.game.showHint();
    const t = document.querySelector('.hint-card .hd')?.textContent || '';
    g.game.hints.hide();
    return t;
  });
  if (!hint.includes('The old piano')) fail(`H next to the piano gave "${hint}"`);
  await look([-0.5, 21.2], [-1.75, 0.95, 21.2], 'piano');
  await use();
  await waitFor(() => window.__game.modal() === 'piano');
  await shot('piano');
  // Play each part back with the real keys once the piano has played it.
  for (let part = 0; part < 10; part++) {
    await waitFor(() => !document.querySelector('.piano.busy'), null, 20000);
    if (await ev(() => window.__game.gs.puzzles.piano.isSolved())) break;
    const notes = await ev(() => window.__game.gs.puzzles.piano.current());
    // One wrong key first time round: it must only replay, never lose progress.
    if (part === 1) {
      const wrong = (notes[0] + 1) % 7;
      await page.locator(`.pkey[data-key="${wrong}"]`).dispatchEvent('pointerdown');
      const msg = await page.textContent('.pz-msg');
      if (!/Not quite/.test(msg)) fail(`a wrong key said "${msg}"`);
      await page.waitForTimeout(300);
      await waitFor(() => !document.querySelector('.piano.busy'), null, 20000);
      const again = await ev(() => window.__game.gs.puzzles.piano.current().length);
      if (again !== notes.length) fail('a wrong key changed the length of the tune');
    }
    for (const k of notes) await page.locator(`.pkey[data-key="${k}"]`).dispatchEvent('pointerdown');
    await page.waitForTimeout(200);
  }
  if (!(await ev(() => window.__game.gs.puzzles.piano.isSolved()))) fail('the piano was not solved');
  await waitFor(() => window.__game.modal() === 'clue', null, 10000);
  const card = await page.textContent('.paper.clue');
  const riddle = await ev(() => window.__game.gs.puzzles.trunk.riddle);
  if (!card.includes(riddle.split('\n')[0])) fail(`the card says "${card}"`);
  await shot('card');
  await page.getByRole('button', { name: 'Okay' }).click();
  await look([-0.5, 21.2], [-1.75, 1.1, 21.06], 'Read the card');
  log('the piano tune played back key by key gives the card');

  // ---- the trunk
  await look([0, 19.6], [0, 0.3, 18.9], 'Open the old trunk');
  await use();
  await waitFor(() => window.__game.modal() === 'trunk');
  const answer = await ev(() => window.__game.gs.puzzles.trunk.answer);
  await page.getByRole('button', { name: 'Open' }).click();
  if (await ev(() => window.__game.gs.puzzles.trunk.isSolved())) fail('the trunk opened with the wrong pictures');
  for (let i = 0; i < 4; i++) {
    for (let n = 0; n < 6 && (await ev((i) => window.__game.gs.puzzles.trunk.picture(i), i)) !== answer[i]; n++)
      await page.locator('.picture-lock .wheel').nth(i).getByRole('button', { name: '▲' }).click();
  }
  await shot('lock');
  await page.getByRole('button', { name: 'Open' }).click();
  await waitFor(() => window.__game.gs.puzzles.trunk.isSolved());
  await waitFor(() => window.__game.modal() === null, null, 10000);
  await page.waitForTimeout(1600); // the lid lifts
  await look([0, 19.75], [0, 0.28, 18.5], 'Take the photo');
  await use();
  await waitFor(() => window.__game.modal() === 'photo');
  await page.waitForSelector('.photo-pic canvas');
  if (!(await ev(() => window.__game.gs.hasFind('photo')))) fail('the photo was not counted as a find');
  await shot('photo');
  await page.getByRole('button', { name: 'Okay' }).click();
  await look([0, 19.75], [0, 0.28, 18.5], 'Look at the photo');
  log(`the picture lock opens with ${answer.join(', ')}; the photo is the sixth little find`);

  // ---- the journal lists the attic
  const journal = await ev(async () => {
    window.__game.game.openJournal();
    await new Promise((r) => setTimeout(r, 200));
    const t = document.querySelector('.journal').innerText;
    window.__game.closeModals();
    return t;
  });
  if (!/Puzzles\s+2\/12/.test(journal) || !journal.includes('The picture lock') || !journal.includes('A photo')) fail(`journal: ${journal}`);

  // ---- continue a save made in the attic
  await ev(() => {
    window.__game.teleport(-0.2, 22.0, 0.3, 0);
    window.__game.game.saveNow('test');
  });
  await page.reload();
  await page.waitForSelector('.start-hint');
  await page.click('.start-hint');
  await page.getByRole('button', { name: 'Continue' }).click();
  await waitFor(() => window.__game && window.__game.state() === 'playing');
  await page.waitForTimeout(1500);
  const back = await ev(() => ({ zone: window.__game.zone(), z: window.__game.pos().z, ladder: window.__game.gs.data.attic.ladder }));
  if (back.zone !== 6 || Math.abs(back.z - 22) > 0.01 || !back.ladder) fail(`continue: ${JSON.stringify(back)}`);
  await look([0, 19.75], [0, 0.28, 18.5], 'Look at the photo');
  log('a save made in the attic continues there, trunk open');

  // ---- and back down
  await look([0, 23.2], [0.9, 0.1, 24.1], 'Climb down');
  await use();
  await waitFor(() => window.__game.zone() === 0, null, 10000);
  await look(null, [1.6, 1.4, -0.4], 'Climb up');
  log('climbing down lands at the foot of the ladder');

  if (problems.length) fail('console problems:\n' + problems.join('\n'));
  ok = true;
} catch (e) {
  console.log('  ✗ ' + e.message);
  await shot('fail');
}
await browser.close();
console.log(ok ? 'ATTIC PASSED' : 'ATTIC FAILED');
process.exitCode = ok ? 0 : 1;
