// The graphics test page (?gfxtest, src/gfxtest.js) in the production build:
// every run reports back with a picture, and the results can be copied.
import { launch, fileUrl } from './lib.mjs';

let ok = true;
const check = (cond, msg) => {
  console.log(`  ${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) ok = false;
};
console.log('Graphics test page');

const browser = await launch();
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(fileUrl('dist/index.html', '?gfxtest'));
  await page.waitForSelector('text=Done.', { timeout: 15 * 60000 });
  const results = await page.locator('pre').last().textContent();
  const lines = results.split('\n').filter((l) => /^\d+\./.test(l));
  console.log(lines.map((l) => '  · ' + l).join('\n'));
  check(lines.length === 10, `ten runs reported (${lines.length})`);
  check(!results.includes('no answer'), 'every run answered');
  check(!/WHITE/.test(results), 'none drew a white screen here');
  check(
    /1\. Full, as the game uses it: drawn, .*webgl2, msaa true, shadows true/.test(results),
    'run 1 is the full look with shadows and edge smoothing',
  );
  check(/Full on WebGL 1: drawn, .*webgl1/.test(results), 'the WebGL 1 run really used WebGL 1');
  check(/Light \+ shadows: drawn, .*shadows true/.test(results), 'the flags switch features on in Light too');
  check((await page.locator('img').count()) === 10, 'a picture for every run');
  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
} finally {
  await browser.close();
}
console.log(ok ? 'GFXTEST PASSED' : 'GFXTEST FAILED');
process.exitCode = ok ? 0 : 1;
