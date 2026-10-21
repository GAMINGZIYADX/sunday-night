// Placement audit (debug build, ?nomerge): lists props that float above their
// support or have furniture passing through them.
import { launch, fileUrl, openGame, startNew } from './lib.mjs';
const browser = await launch();
const { page, problems } = await openGame(browser, fileUrl('dist-debug/index.html', '?debug=1&nolock=1&nomerge&dtmax=0.25'), {
  width: 480,
  height: 270,
});
await startNew(page);
await page.evaluate(() => window.__game.unlockThrough(5));
const bad = await page.evaluate(() => window.__game.checkProps());
for (const b of bad) console.log(JSON.stringify(b));
console.log(bad.length ? `PROPS: ${bad.length} problem(s)` : 'PROPS PASSED');
if (problems.length) console.log(problems.join('\n'));
process.exitCode = bad.length ? 1 : 0;
await browser.close();
