// Close-up visual audit: many views of props, notes, puzzles and the cats.
// Usage: node e2e/audit.mjs <outdir>
import { launch, fileUrl, openGame, startNew } from './lib.mjs';
const out = process.argv[2] || '/tmp/audit';
const V = {
  0: [
    ['frames', [-2.0, -1.5], [-2.0, 1.65, -3.5]],
    ['note1', [-0.75, 2.25], [-0.35, 0.68, 3.2]],
    ['nightstand2', [-3.1, 2.3], [-3.0, 0.62, 3.28]],
    ['dresser', [-1.9, -2.2], [-1.9, 0.95, -3.3]],
    ['pile', [-1.9, -1.4], [-2.85, 0.02, -2.3]],
    ['sill', [-2.3, -0.3], [-3.4, 1.0, -0.6]],
    ['shelftop', [1.8, -0.1], [3.33, 1.95, -0.1]],
    ['wallshelf', [1.2, 2.3], [1.2, 1.8, 3.45]],
    ['sidetable', [1.0, 2.4], [1.8, 0.55, 3.1]],
  ],
  1: [
    ['mantel', [2.5, -9.9], [3.85, 1.35, -9.9]],
    ['stand', [-2.2, -12.0], [-2.2, 0.85, -13.3]],
    ['books', [-2.7, -9.5], [-4.0, 1.15, -9.5]],
    ['coffee', [1.7, -10.25], [1.15, 0.45, -11.1]],
    ['rug', [2.1, -7.3], [2.1, 0, -9.5]],
    ['basket', [-2.8, -12.0], [-3.85, 0.2, -12.65]],
  ],
  2: [
    ['fridge', [-1.75, -20.3], [-2.8, 1.0, -21.2]],
    ['card', [-1.7, -19.4], [-3.5, 1.6, -19.9]],
    ['stove', [1.9, -19.0], [2.8, 0.8, -19.0]],
    ['recipe', [2.1, -18.4], [3.5, 1.38, -18.38]],
    ['counter', [2.2, -21.0], [3.3, 1.0, -21.3]],
    ['table', [0.9, -17.4], [-0.6, 0.75, -18.8]],
  ],
  3: [
    ['desknote', [2.4, -28.6], [3.6, 0.85, -28.7]],
    ['chalk', [-2.2, -26.1], [-2.2, 1.5, -24.5]],
    ['armchair', [-1.3, -26.1], [-2.6, 0.35, -26.5]],
    ['plant', [-2.7, -25.7], [-3.9, 0.4, -24.8]],
    ['nook', [2.3, -26.3], [3.45, 0.3, -25.25]],
    ['sidetable', [-1.8, -28.5], [-2.75, 0.55, -28.35]],
    ['desktop', [2.6, -27.7], [3.9, 0.9, -27.95]],
    ['box', [-2.4, -31.0], [-3.35, 0.3, -31.65]],
  ],
  4: [
    ['bench', [-2.4, -39.9], [-3.6, 0.6, -39.7]],
    ['telescope', [2.2, -41.4], [3.4, 1.1, -42.1]],
    ['gate', [0.1, -44.6], [0, 1.2, -46.5]],
  ],
};
const browser = await launch();
const { page, problems } = await openGame(browser, fileUrl('dist-debug/index.html', '?debug=1&nolock=1&dtmax=0.25'), { width: 960, height: 540 });
await startNew(page);
await page.evaluate(() => {
  document.querySelector('.controls')?.classList.add('hidden');
});
await page.waitForTimeout(2500);
for (const [room, views] of Object.entries(V)) {
  await page.evaluate((r) => window.__game.unlockThrough(Number(r)), room);
  if (room === '3') await page.evaluate(() => window.__game.game.cats.startHiding(true));
  for (const [name, [x, z], look] of views) {
    await page.evaluate(
      ([x, z, look]) => {
        window.__game.teleport(x, z);
        window.__game.lookAt(...look);
        document.querySelectorAll('.toast').forEach((t) => t.remove());
      },
      [x, z, look],
    );
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}/${room}-${name}.png` });
  }
}
// Cats close up in the bedroom: standing, sitting, sleeping, walking.
await page.evaluate(() => {
  const g = window.__game;
  g.game.cats.mode = 'scripted-test';
  g.teleport(0.6, 0.9, 0, -0.5);
  g.lookAt(0.6, 0.15, -0.45);
  const [a, b] = g.game.cats.cats;
  a.state = b.state = 'ending';
  a.model.root.position.set(0.25, 0, -0.45);
  a.model.root.rotation.y = 1.2;
  b.model.root.position.set(1.0, 0, -0.5);
  b.model.root.rotation.y = -1.9;
  a.model.setPose('stand');
  b.model.setPose('sit');
  a.model.tailHeart = b.model.tailHeart = 0;
  a.model.tailHeartFn = b.model.tailHeartFn = null;
});
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/cats-1.png` });
await page.evaluate(() => {
  const [a, b] = window.__game.game.cats.cats;
  a.model.setPose('sleep');
  b.model.setPose('stand');
  b.model.walk = 1;
  b.model.speed = 0.4;
  a.model.root.rotation.y = -0.6;
  b.model.root.rotation.y = 0.2;
});
await page.waitForTimeout(3000);
await page.screenshot({ path: `${out}/cats-2.png` });
await page.evaluate(() => {
  const g = window.__game;
  g.teleport(0.6, 0.2, 0, -0.5);
  g.lookAt(0.6, 0.12, -0.5);
});
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/cats-3.png` });
console.log(problems.join('\n') || 'no console problems');
await browser.close();
