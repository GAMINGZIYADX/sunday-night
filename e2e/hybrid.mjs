// 2-in-1 PC (a laptop with a touchscreen): it starts with mouse controls,
// switches to touch controls when the screen is touched, and back again when
// the mouse is used. Wording, the prompt style and the on-screen buttons follow.
import { launch, fileUrl } from './lib.mjs';

const log = (...a) => console.log('  ·', ...a);
const fail = (msg) => {
  throw new Error(msg);
};

const browser = await launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true });
const page = await context.newPage();
const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') problems.push(`[${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
const cdp = await context.newCDPSession(page);
const ev = (fn, arg) => page.evaluate(fn, arg);
const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], i) => ({ x, y, id: i + 1 })) });
const state = () =>
  ev(() => ({
    touch: document.body.classList.contains('touch'),
    bar: !!document.querySelector('.touch-bar:not(.hidden)'),
    controls: document.querySelector('.controls').textContent,
    kbd: !!document.querySelector('.prompt kbd'),
    puse: !!document.querySelector('.prompt .puse'),
  }));
const lookAtNote = async () => {
  await ev(() => {
    window.__game.teleport(-0.5, 2.4);
    window.__game.lookAt(-0.27, 0.69, 3.2);
  });
  await page.waitForTimeout(600);
};

try {
  await page.goto(fileUrl('dist-debug/index.html', '?debug=1&nolock=1&dtmax=0.25'));
  await page.waitForSelector('.start-hint');
  await page.mouse.click(640, 400);
  await page.waitForSelector('.menu .btn');
  await page.getByRole('button', { name: 'New game' }).click();
  await page.waitForFunction(() => window.__game.state() === 'playing');
  await page.waitForTimeout(3000);
  let s = await state();
  if (s.touch || s.bar || !/W A S D/.test(s.controls)) fail(`did not start with mouse controls: ${JSON.stringify(s)}`);
  await lookAtNote();
  if (!(await state()).kbd) fail('mouse prompt should show the E key');
  log('starts with mouse controls');

  // A finger on the screen: touch controls.
  await page.touchscreen.tap(900, 300);
  await page.waitForTimeout(600);
  s = await state();
  if (!s.touch || !s.bar || !/thumb/i.test(s.controls)) fail(`touch did not switch controls: ${JSON.stringify(s)}`);
  await lookAtNote();
  s = await state();
  if (!s.puse || s.kbd) fail(`prompt did not become a button: ${JSON.stringify(s)}`);
  // The thumb stick works straight away.
  await ev(() => window.__game.teleport(-0.25, 1.55, 0, 0));
  const p0 = await ev(() => window.__game.pos());
  await touch('touchStart', [[200, 600]]);
  await touch('touchMove', [[200, 540]]);
  await page.waitForTimeout(1200);
  await touch('touchEnd', []);
  const p1 = await ev(() => window.__game.pos());
  if (!(p0.z - p1.z > 0.3)) fail('thumb stick did not walk after switching');
  // Touch wording in the menus.
  await page.locator('.touch-bar .tbtn[aria-label="Pause"]').tap();
  await page.getByRole('button', { name: 'Settings' }).tap();
  if (!/Look sensitivity/.test(await page.textContent('.screen:last-of-type .card'))) fail('settings still say mouse');
  await page.getByRole('button', { name: 'Done' }).tap();
  await page.getByRole('button', { name: 'Resume' }).tap();
  log('touching the screen switches to touch controls, stick and wording');

  // The mouse again: back to mouse controls and wording.
  await page.mouse.click(900, 300);
  await page.waitForTimeout(600);
  s = await state();
  if (s.touch || s.bar || !/W A S D/.test(s.controls)) fail(`mouse did not switch back: ${JSON.stringify(s)}`);
  await lookAtNote();
  if (!(await state()).kbd) fail('prompt did not go back to the E key');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  if ((await ev(() => window.__game.modal())) !== 'pause') await ev(() => window.__game.game.openJournal());
  await ev(() => window.__game.closeModals());
  log('using the mouse switches back');

  if (problems.length) fail('console problems:\n' + problems.join('\n'));
  console.log('HYBRID PASSED');
} catch (e) {
  console.error('HYBRID FAILED:', e.message);
  if (problems.length) console.error(problems.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
}
