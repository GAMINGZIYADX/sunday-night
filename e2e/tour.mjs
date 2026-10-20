// Screenshot tour of every room (debug build). Usage: node e2e/tour.mjs <outdir> [room]
import { launch, fileUrl, openGame, startNew } from './lib.mjs';
const out = process.argv[2] || '/tmp/shots';
const only = process.argv[3];
const VIEWS = {
  1: [
    ['10-living-enter', [0.2, -6.2], [0.5, 1.0, -12]],
    ['11-living-fire', [2.0, -7.2], [4.2, 0.7, -9.5]],
    ['12-living-books', [-1.6, -9.5], [-4.2, 1.4, -9.5]],
    ['13-living-stand', [-1.9, -11.4], [-1.9, 0.8, -13.5]],
    ['14-living-rug', [2.1, -7.6], [2.1, 0, -9.5]],
    ['15-living-south', [0.5, -12.5], [0.5, 1.2, -5.5]],
  ],
  2: [
    ['20-kitchen-enter', [0.0, -16.2], [0, 1.0, -21]],
    ['21-kitchen-fridge', [-1.6, -20.0], [-3.5, 1.3, -20.6]],
    ['22-kitchen-stove', [1.8, -19.0], [3.5, 0.9, -19]],
    ['23-kitchen-table', [1.6, -21.5], [-0.6, 0.8, -18.8]],
    ['24-kitchen-poster', [-1.8, -19.0], [-3.5, 1.5, -19.0]],
  ],
  3: [
    ['30-study-enter', [0.0, -25.2], [0, 1.0, -31]],
    ['31-study-desk', [1.6, -28.5], [4.2, 0.6, -28.5]],
    ['32-study-window', [0.5, -28.5], [-4.2, 1.2, -28.3]],
    ['33-study-chalk', [-1.6, -27.4], [-2.2, 1.5, -24.5]],
    ['34-study-nook', [1.4, -27.0], [3.5, 0.3, -25.3]],
    ['35-study-box', [-1.6, -30.2], [-3.35, 0.3, -31.65]],
  ],
  4: [
    ['40-garden-enter', [0.0, -35.4], [0, 1.2, -46]],
    ['41-garden-gate', [0.2, -43.8], [0, 1.2, -46.5]],
    ['42-garden-bench', [-1.0, -39.0], [-3.6, 0.5, -39.9]],
    ['43-garden-scope', [1.3, -41.0], [3.4, 1.0, -42.1]],
    ['44-garden-house', [0.5, -44.5], [0, 1.8, -34.5]],
  ],
  5: [
    ['50-clearing-enter', [0.0, -48.6], [0, 0.4, -53.8]],
    ['51-clearing-cats', [0.0, -51.9], [0, 0.3, -53.8]],
  ],
};
const browser = await launch();
const { page, problems } = await openGame(browser, fileUrl('dist-debug/index.html', '?debug=1&nolock=1'));
await startNew(page);
await page.waitForTimeout(3200);
for (const [room, views] of Object.entries(VIEWS)) {
  if (only && only !== room) continue;
  await page.evaluate((r) => window.__game.unlockThrough(Number(r)), room);
  if (room === '5') await page.evaluate(() => window.__game.game.cats.startEnding(true));
  for (const [name, [x, z], look] of views) {
    await page.evaluate(
      ([x, z, look]) => {
        window.__game.teleport(x, z);
        window.__game.lookAt(...look);
      },
      [x, z, look],
    );
    await page.waitForTimeout(room === '5' ? 14000 : 1200);
    await page.screenshot({ path: `${out}/${name}.png` });
  }
}
console.log(problems.join('\n') || 'no console problems');
await browser.close();
