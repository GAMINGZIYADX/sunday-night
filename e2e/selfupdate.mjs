// Self-update of the production file under file://: "Update now" downloads a
// newer build (faked here), the page reloads into it with the save kept, it
// still runs offline, and a stored build that never boots is thrown away.
import { readFileSync } from 'node:fs';
import { launch, fileUrl, openGame } from './lib.mjs';

let ok = true;
const check = (cond, msg) => {
  console.log(`  ${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) ok = false;
};
console.log('Self-update (dist/index.html via file://)');

const current = JSON.parse(readFileSync('package.json', 'utf8')).version;
const NEXT = '9.9.9';
const html = readFileSync('dist/index.html', 'utf8');
// The newer build: the same game with its version (meta tag and the baked-in
// __APP_VERSION__) changed.
const nextHtml = html.replaceAll(`"${current}"`, `"${NEXT}"`);
let downloads = 0;

const browser = await launch();
try {
  const { page, problems } = await openGame(browser, fileUrl('dist/index.html'), { width: 960, height: 540 });
  await page.route('https://api.github.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: `{"tag_name":"v${NEXT}"}` }),
  );
  await page.route('https://raw.githubusercontent.com/**', (route) => {
    downloads++;
    const right = route.request().url().includes(`/v${NEXT}/dist/index.html`);
    route.fulfill({
      status: right ? 200 : 404,
      contentType: 'text/plain',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: right ? nextHtml : '404',
    });
  });
  const toMenu = async () => {
    await page.waitForSelector('.start-hint', { timeout: 30000 });
    await page.click('.start-hint');
    await page.waitForSelector('.menu .btn');
  };
  const version = () => page.textContent('.version');

  // A game in progress, so there is a save to keep.
  await toMenu();
  await page.getByRole('button', { name: 'New game' }).click();
  await page.click('.btn.level >> nth=1'); // Normal
  await page.waitForTimeout(4000);
  await page.reload();
  await toMenu();
  const update = await page.waitForSelector('button:has-text("Update now")', { timeout: 10000 }).catch(() => null);
  check(!!update, `the main menu offers "Update now" for ${NEXT}`);

  // Update now -> download -> reload into the new build.
  await page.getByRole('button', { name: 'Update now' }).click();
  await page.waitForEvent('load', { timeout: 30000 });
  await toMenu();
  check(downloads === 1, 'the build was downloaded once from the release tag');
  check((await version()).includes(NEXT), `after the update the game runs ${NEXT} (${(await version()).trim()})`);
  check(await page.getByRole('button', { name: 'Continue' }).isVisible(), 'the save is kept (Continue is offered)');
  check(!(await page.locator('button:has-text("Update now")').count()), 'no update offered once up to date');
  check(await page.evaluate(() => localStorage.getItem('sundayNight.update.pending') === null), 'the new build marked itself as booted');

  // Offline: the stored build still runs.
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await page.route(/^https?:/, (route) => route.abort());
  await page.reload();
  await toMenu();
  check((await version()).includes(NEXT), 'offline, the updated build still runs');

  // A stored build that never boots: the launch after it falls back to the file.
  const broken = `<!doctype html><html><head><meta name="sunday-night-version" content="9.9.10"></head><body>broken</body></html>`.padEnd(
    300000,
    ' ',
  );
  await page.evaluate(async (h) => {
    const db = await new Promise((res, rej) => {
      const q = indexedDB.open('sundayNight', 1);
      q.onsuccess = () => res(q.result);
      q.onerror = () => rej(q.error);
    });
    await new Promise((res, rej) => {
      const t = db.transaction('builds', 'readwrite');
      t.objectStore('builds').put({ version: '9.9.10', html: h, at: Date.now() }, 'latest');
      t.oncomplete = res;
      t.onerror = () => rej(t.error);
    });
    db.close();
  }, broken);
  await page.reload();
  await page.waitForTimeout(1500);
  check((await page.textContent('body')).includes('broken'), 'a stored build is used on the next launch');
  await page.reload();
  await toMenu();
  // The file's own build is back: its menu works and offers NEXT again (the
  // update check remembers it), instead of the broken 9.9.10.
  const foot = (await version()).trim();
  check(foot.includes(`(${NEXT}) is ready`) && !foot.includes('9.9.10'), `after it failed to boot, the file's own build runs again ("${foot}")`);
  const left = await page.evaluate(
    () =>
      new Promise((res) => {
        const q = indexedDB.open('sundayNight', 1);
        q.onsuccess = () => {
          const g = q.result.transaction('builds').objectStore('builds').get('latest');
          g.onsuccess = () => res(g.result ?? null);
        };
      }),
  );
  check(left === null, 'and the broken build was thrown away');

  const real = problems.filter((p) => !p.includes('net::ERR_FAILED') && !p.includes('Failed to load resource'));
  check(real.length === 0, 'no console errors or warnings' + (real.length ? ':\n' + real.join('\n') : ''));
} catch (e) {
  ok = false;
  console.log('  ✗ ' + e.message);
}
await browser.close();
console.log(ok ? 'SELFUPDATE PASSED' : 'SELFUPDATE FAILED');
process.exitCode = ok ? 0 : 1;
