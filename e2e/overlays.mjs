// Screenshots of every UI screen and puzzle overlay (debug build).
import { launch, fileUrl, openGame } from './lib.mjs';
const out = process.argv[2] || '/tmp/shots';
const W = Number(process.argv[3] || 1280);
const H = Number(process.argv[4] || 720);
const browser = await launch();
const { page, problems } = await openGame(browser, fileUrl('dist-debug/index.html', '?debug=1&nolock=1&dtmax=0.25'), { width: W, height: H });
const ev = (fn, a) => page.evaluate(fn, a);
const snap = async (name, wait = 900) => {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${out}/o-${W}-${name}.png` });
};
await page.click('.start-hint');
await page.waitForSelector('.menu .btn');
await snap('menu');
await page.getByRole('button', { name: 'Settings' }).click();
await snap('settings');
await page.getByRole('button', { name: 'Done' }).click();
await page.getByRole('button', { name: 'New game' }).click();
await page.waitForFunction(() => window.__game?.state() === 'playing');
await page.waitForTimeout(500);
const g = (code) => ev(code);
// Overlays opened through the game's own functions.
const open = async (name, fn, wait) => {
  await ev(fn);
  await snap(name, wait);
  await ev(() => window.__game.closeModals());
};
await open('note', () => window.__game.game.ctx.showNote(0));
await open('clue', () => window.__game.game.ctx.showClue('cipherCard', true));
await ev(() => window.__game.teleport(-2.0, -1.5));
await ev(() => window.__game.lookAt(-2.9, 0.05, -2.4));
await ev(() => window.__game.use());
await page.getByRole('button', { name: 'Numbers' }).click();
await snap('sliding');
await page.getByRole('button', { name: 'Hint (H)' }).click();
await snap('sliding-hint');
await ev(() => {
  window.__game.closeModals();
  window.__game.game.hints.hide();
});
// Later rooms: unlock and use the real interactables.
const useAt = async (at, target) => {
  await ev(
    ([at, target]) => {
      window.__game.teleport(at[0], at[1]);
      window.__game.lookAt(...target);
      window.__game.use();
    },
    [at, target],
  );
};
await ev(() => window.__game.unlockThrough(1));
await useAt([-2.0, -12.3], [-3.35 + 6 * 0.29, 0.82, -13.28]);
await snap('vase');
await ev(() => window.__game.closeModals());
await ev(() => window.__game.unlockThrough(2));
await useAt([-1.95, -20.95], [-2.774, 1.08, -21.23]);
await snap('cipher');
await ev(() => window.__game.closeModals());
await ev(() => window.__game.unlockThrough(3));
await useAt([-2.2, -26.1], [-2.2, 1.5, -24.55]);
await snap('sudoku');
await ev(() => window.__game.closeModals());
await ev(() => window.__game.unlockThrough(4));
await useAt([0.7, -45.6], [0.7, 1.25, -46.39]);
await snap('lock');
await ev(() => window.__game.closeModals());
await useAt([2.4, -41.5], [3.4, 1.1, -42.1]);
await snap('telescope');
await ev(() => window.__game.closeModals());
await page.keyboard.press('Tab');
await snap('journal');
await page.keyboard.press('Tab');
await page.keyboard.press('Escape');
await snap('pause');
await page.getByRole('button', { name: 'Backup code' }).click();
await snap('backup', 1500);
await ev(() => window.__game.closeModals());
await ev(() => window.__game.game.playEnding());
await snap('letter-envelope', 1200);
await page.waitForTimeout(6000);
await snap('letter-lines', 3000);
await page.mouse.click(W / 2, H / 2);
await page.waitForSelector('.the-end.on', { timeout: 120000 });
await snap('letter-end', 2500);
console.log(problems.join('\n') || 'no console problems');
await browser.close();
