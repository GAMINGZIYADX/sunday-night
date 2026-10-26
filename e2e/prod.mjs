// Production build check: one self-contained file, no debug code, works from file://.
import { readFileSync, readdirSync } from 'node:fs';
import { launch, fileUrl, openGame } from './lib.mjs';
let ok = true;
const check = (cond, msg) => {
  console.log(`  ${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) ok = false;
};
console.log('Production build (dist/index.html via file://)');
const files = readdirSync('dist');
check(files.length === 1 && files[0] === 'index.html', `dist contains only index.html (${files.join(', ')})`);
const html = readFileSync('dist/index.html', 'utf8');
check(!/<script[^>]+src=/.test(html) && !/<link[^>]+stylesheet/.test(html), 'no external scripts or stylesheets');
for (const word of ['installDebug', 'unlockThrough', 'checkCatGraph', 'window.__game', 'dtmax', 'nolock'])
  check(!html.includes(word), `no debug code: "${word}" absent`);
console.log(`  · size ${(html.length / 1024).toFixed(0)} KB`);

const browser = await launch();
try {
  const { page, problems } = await openGame(browser, fileUrl('dist/index.html', '?debug=1&nolock=1'), { width: 960, height: 540 });
  check(await page.evaluate(() => window.__game === undefined), '?debug=1 does nothing in production');
  // The update check: answer GitHub's releases API with a far-future version.
  let asked = 0;
  await page.route('https://api.github.com/**', (route) => {
    asked++;
    route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{"tag_name":"v99.0.0"}' });
  });
  await page.click('.start-hint');
  const link = await page.waitForSelector('.update-link', { timeout: 10000 }).catch(() => null);
  check(asked === 1 && !!link, 'the main menu asks GitHub once and offers the newer version');
  if (link) check((await link.getAttribute('href')).endsWith('/releases/latest'), 'the download link opens the latest release');
  await page.getByRole('button', { name: 'New game' }).click();
  await page.waitForTimeout(6000);
  // Debug shortcuts must not work: Shift+3 would jump to the kitchen in debug builds.
  await page.keyboard.down('Shift');
  await page.keyboard.press('Digit3');
  await page.keyboard.up('Shift');
  await page.waitForTimeout(500);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('sundayNight.save.v2') || 'null'));
  check(!!saved && saved.version === 2, 'saving works under file://');
  check(saved && saved.player.z > 0, 'Shift+3 did not teleport (debug keys are absent)');
  const shot = await page.screenshot();
  // Not a black screen: count bright-ish pixels in the PNG by decoding with a canvas.
  const bright = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 16) if (d[i] + d[i + 1] + d[i + 2] > 150) n++;
    return n / (d.length / 16);
  }, shot.toString('base64'));
  check(bright > 0.2, `the scene renders (${(bright * 100).toFixed(0)}% lit pixels)`);
  if (process.argv[2]) await page.screenshot({ path: process.argv[2] });
  check(problems.length === 0, 'no console errors or warnings' + (problems.length ? ':\n' + problems.join('\n') : ''));
} catch (e) {
  ok = false;
  console.log('  ✗ ' + e.message);
}
await browser.close();
console.log(ok ? 'PROD PASSED' : 'PROD FAILED');
process.exitCode = ok ? 0 : 1;
