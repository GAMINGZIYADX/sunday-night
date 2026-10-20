// Mid-game reload: progress made, page reloaded, "Continue" must restore it all.
import { launch, fileUrl, openGame, startNew } from './lib.mjs';
const browser = await launch();
const url = fileUrl('dist-debug/index.html', '?debug=1&nolock=1&dtmax=0.25');
const { page, problems } = await openGame(browser, url, { width: 800, height: 450 });
const ev = (fn, a) => page.evaluate(fn, a);
let ok = true;
const check = (cond, msg) => {
  console.log(`  ${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) ok = false;
};
try {
  console.log('Continue after reload');
  await startNew(page);
  // Progress: room 1 done and its door open, room 2 half done with partial state.
  await ev(() => window.__game.unlockThrough(1));
  await ev(() => {
    const g = window.__game;
    g.gs.puzzles.r2b.forceSolve(); // silver key in room 2
    g.gs.puzzles.r2a.place(6, 'B'); // one vase placed (partial)
    g.gs.puzzles.r2a.place(7, 'W'); // a wrong one too
    g.game.ctx.showNote(1);
    g.closeModals();
    g.teleport(1.6, -7.2, 0.8, -0.1);
  });
  await page.waitForTimeout(800);
  // Pause menu saves (Escape).
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__game.modal() === 'pause');
  const before = await ev(() => window.__game.gs.serialize());
  await page.reload();
  await page.waitForSelector('.start-hint');
  await page.click('.start-hint');
  await page.waitForSelector('.menu .btn');
  check((await page.getByRole('button', { name: 'Continue' }).count()) === 1, 'main menu offers Continue');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForFunction(() => window.__game?.state() === 'playing');
  await page.waitForTimeout(600);
  const after = await ev(() => window.__game.gs.serialize());
  const strip = (s) => ({ ...s, playTime: 0 });
  check(JSON.stringify(strip(after)) === JSON.stringify(strip(before)), 'whole game state identical after reload');
  check(after.doors[0] === true, 'door 1 still open');
  check(after.puzzles.r2a.slots[6] === 'B' && after.puzzles.r2a.slots[7] === 'W', 'partial vase progress kept');
  check(after.notes.includes(1), 'note 2 kept in journal');
  const pos = await ev(() => window.__game.pos());
  check(Math.abs(pos.x - 1.6) < 0.05 && Math.abs(pos.z + 7.2) < 0.05, `player position restored (${pos.x.toFixed(2)}, ${pos.z.toFixed(2)})`);
  check((await ev(() => window.__game.zone())) === 1, 'restored in the living room');
  const doorRot = await ev(() => window.__game.game.doors[0].hinge.rotation.y);
  check(doorRot > 1.5, 'door 1 visibly open after load');
  check((await ev(() => window.__game.game.hud.silverSlot.classList.contains('have'))) === true, 'HUD shows the living room silver key');
  // Backup code round trip through the UI.
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__game.modal() === 'pause');
  await page.getByRole('button', { name: 'Backup code' }).click();
  await page.waitForFunction(() => document.querySelector('textarea.code')?.value.startsWith('SN1'));
  const code = await page.locator('textarea.code').first().inputValue();
  check(code.length > 20 && code.length < 3000, `backup code made (${code.length} chars)`);
  await ev(() => window.__game.closeModals());
  await ev(() => window.__game.gs.puzzles.r2a.forceSolve());
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Backup code' }).click();
  await page.locator('textarea.code').nth(1).fill(code);
  await page.getByRole('button', { name: 'Restore' }).click();
  await page.waitForFunction(() => !window.__game.modal());
  check((await ev(() => window.__game.gs.puzzles.r2a.isSolved())) === false, 'restoring the backup code rolled the game back');
  // Reset save from settings.
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Reset save' }).click();
  await page.getByRole('button', { name: 'Yes' }).click();
  await page.waitForTimeout(500);
  check((await ev(() => localStorage.getItem('sundayNight.save.v1'))) === null, 'reset save erases storage');
  check((await page.getByRole('button', { name: 'Continue' }).count()) === 0, 'menu no longer offers Continue');
  check(problems.length === 0, 'no console errors or warnings' + (problems.length ? ':\n' + problems.join('\n') : ''));
} catch (e) {
  ok = false;
  console.log('  ✗ ' + e.message);
}
console.log(ok ? 'CONTINUE PASSED' : 'CONTINUE FAILED');
process.exitCode = ok ? 0 : 1;
await browser.close();
