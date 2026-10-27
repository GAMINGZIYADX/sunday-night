// The graphics test page (?gfxtest, src/gfxtest.js) in the production build:
// every run reports back with a picture, the results can be copied, and after
// a crash (faked here: a run left unfinished) it carries on from the next run.
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
  const url = fileUrl('dist/index.html', '?gfxtest');
  await page.goto(url);
  // As if Chrome had gone down during run 3 after runs 1 and 2 finished.
  await page.evaluate(() =>
    localStorage.setItem(
      'sundayNight.gfxtest.v1',
      JSON.stringify({ results: [{ text: 'drawn (earlier)' }, { text: 'drawn (earlier)' }], running: 2 }),
    ),
  );
  await page.reload();
  await page.waitForSelector('text=Done.', { timeout: 15 * 60000 });
  const results = await page.locator('textarea').inputValue();
  const lines = results.split('\n').filter((l) => /^\d+\./.test(l));
  console.log(lines.map((l) => '  · ' + l).join('\n'));
  check(lines.length === 8, `eight runs reported (${lines.length})`);
  check(/^1\. .*drawn \(earlier\)/.test(lines[0]) && /^2\. .*drawn \(earlier\)/.test(lines[1]), 'runs from before the restart are kept');
  check(/^3\. .*the page closed or crashed during this run/.test(lines[2]), 'the run that was going when the page died is marked as the crash');
  check(
    lines.slice(3).every((l) => /: drawn, /.test(l)),
    'it carried on and every later run drew',
  );
  check(/Full on WebGL 1, no shadows: drawn, .*webgl1/.test(results), 'the WebGL 1 run really used WebGL 1');
  check(/Light \+ shadows: drawn, .*shadows true/.test(results), 'the flags switch features on in Light too');
  check(/\(other phones\): drawn, .*webgl2, msaa true, shadows true/.test(results), 'the last run is the full look with everything');
  check((await page.locator('img').count()) === 5, 'a picture for every run made here');
  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
} finally {
  await browser.close();
}
console.log(ok ? 'GFXTEST PASSED' : 'GFXTEST FAILED');
process.exitCode = ok ? 0 : 1;
