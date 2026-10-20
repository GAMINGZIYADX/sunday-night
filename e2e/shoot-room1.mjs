import { launch, fileUrl, openGame, startNew } from './lib.mjs';
const out = process.argv[2] || '/tmp/shots';
const browser = await launch();
const { page, problems } = await openGame(browser, fileUrl('dist-debug/index.html', '?debug=1&nolock=1'));
await page.screenshot({ path: `${out}/00-start.png` });
await page.click('.start-hint');
await page.waitForSelector('.menu .btn');
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/01-menu.png` });
await page.getByRole('button', { name: 'New game' }).click();
await page.waitForTimeout(4000);
await page.screenshot({ path: `${out}/02-wake.png` });
const views = [
  ['03-north', [0.6, 1.2, 0], [-0.5, 1.4, -3.5]],
  ['04-frames', [-1.95, -1.6, 0], [-1.95, 1.6, -3.5]],
  ['05-west', [1.5, -0.5, 0], [-3.5, 1.2, -1.2]],
  ['06-bed', [1.5, -1.8, 0], [-1.5, 0.7, 2.5]],
  ['07-east', [-1.5, 0.5, 0], [3.4, 1.0, 1.0]],
  ['08-pieces', [-2.0, -1.6, 0], [-3.0, 0.1, -2.4]],
  ['09-night', [-0.4, 2.3, 0], [-0.4, 0.6, 3.2]],
];
for (const [name, [x, z], look] of views) {
  await page.evaluate(
    ([x, z, look]) => {
      window.__game.teleport(x, z);
      window.__game.lookAt(...look);
    },
    [x, z, look],
  );
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/${name}.png` });
}
console.log(problems.join('\n') || 'no console problems');
await browser.close();
