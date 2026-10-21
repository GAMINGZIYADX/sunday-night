// Graphics quality: 'auto' picks light graphics on a weak (here: software)
// graphics chip; switching in the settings restarts the page and carries on
// exactly where the player was; the "switch to light?" offer works both ways;
// cancelling changes nothing.
import { launch, fileUrl, openGame, startNew } from './lib.mjs';

const log = (...a) => console.log('  ·', ...a);
const fail = (msg) => {
  throw new Error(msg);
};

const browser = await launch();
const { page, problems } = await openGame(browser, fileUrl('dist-debug/index.html', '?debug=1&nolock=1&dtmax=0.25'), { width: 960, height: 540 });
const ev = (fn, arg) => page.evaluate(fn, arg);
const look = () =>
  ev(() => {
    const g = window.__game.game;
    const kinds = new Set();
    g.scene.traverse((o) => o.isMesh && o.material && !Array.isArray(o.material) && kinds.add(o.material.type));
    return {
      lambert: kinds.has('MeshLambertMaterial'),
      standard: kinds.has('MeshStandardMaterial'),
      shadows: g.renderer.shadowMap.enabled,
      setting: g.settings.data.graphics,
    };
  });
const modal = () => ev(() => window.__game.modal());
const click = async (name) => {
  await page.getByRole('button', { name, exact: true }).last().click();
  await page.waitForTimeout(150);
};
// After a graphics restart: tap to start, and the game continues by itself.
async function afterReload() {
  await page.waitForSelector('.start-hint', { timeout: 30000 });
  await page.waitForFunction(() => window.__game);
  await page.click('.start-hint');
  await page.waitForFunction(() => window.__game.state() === 'playing', null, { timeout: 30000 });
  await page.waitForTimeout(400);
}
async function openGraphics() {
  await ev(() => window.__game.closeModals());
  await page.keyboard.press('Escape');
  await page.waitForSelector('.screen .card');
  if ((await modal()) !== 'pause') fail(`Esc opened ${await modal()}`);
  await click('Settings');
  await page.waitForSelector('.seg');
}
const selected = () => page.textContent('.seg-b.on');
const choose = async (v) => {
  await page.click(`.seg-b[data-v="${v}"]`);
  await page.waitForTimeout(150);
};

try {
  // --- auto on a software renderer = light.
  let q = await look();
  if (!q.lambert || q.standard || q.shadows || q.setting !== 'auto') fail(`auto did not choose light: ${JSON.stringify(q)}`);
  log('auto picked light graphics on a weak graphics chip');

  await startNew(page);
  await ev(() => window.__game.teleport(-1.1, 0.6, 1.0, 0.1));
  await page.waitForTimeout(300);
  await ev(() => window.__game.game.saveNow('test'));

  // --- cancelling keeps everything as it was.
  await openGraphics();
  if (!/Auto \(Light\)/.test(await selected())) fail(`settings show "${await selected()}"`);
  await choose('full');
  if ((await modal()) !== 'confirm') fail('no restart question');
  await click('Cancel');
  if ((await selected()) !== 'Auto (Light)') fail(`after cancel: "${await selected()}"`);
  if ((await look()).setting !== 'auto') fail('cancel still changed the setting');
  log('cancel changes nothing');

  // --- full: restart, and carry on in the same spot.
  await choose('full');
  await click('Yes');
  await afterReload();
  q = await look();
  if (!q.standard || q.lambert || !q.shadows || q.setting !== 'full') fail(`full did not apply: ${JSON.stringify(q)}`);
  const p = await ev(() => window.__game.pos());
  if (Math.abs(p.x + 1.1) > 0.05 || Math.abs(p.z - 0.6) > 0.05) fail(`did not resume in place: ${JSON.stringify(p)}`);
  log('switched to full, resumed where the player stood');

  // --- the offer when full is too slow: "keep" remembers the choice...
  await ev(() => {
    const g = window.__game.game;
    g.headless = false;
    g.settings.set('graphics', 'auto');
    g._offerLight();
  });
  if ((await modal()) !== 'confirm') fail('no offer shown');
  await click('Keep full');
  if ((await look()).setting !== 'full') fail('"Keep full" not remembered');
  await ev(() => window.__game.game._offerLight());
  if (await modal()) fail('offered twice');
  log('"Keep full" is remembered and not asked again');

  // ...and "switch" restarts in light graphics.
  await ev(() => {
    const g = window.__game.game;
    g._offered = false;
    g.settings.set('graphics', 'auto');
    g._offerLight();
  });
  await click('Switch to light');
  await afterReload();
  q = await look();
  if (!q.lambert || q.standard || q.shadows || q.setting !== 'light') fail(`switch did not apply light: ${JSON.stringify(q)}`);
  log('"Switch to light" restarts in light graphics and continues');

  // --- back to auto: already light here, so no restart is needed.
  await openGraphics();
  await choose('auto');
  if ((await modal()) !== 'settings') fail('auto asked to restart although nothing changes');
  if ((await look()).setting !== 'auto') fail('auto not saved');
  log('back to auto without a restart');

  if (problems.length) fail('console problems:\n' + problems.join('\n'));
  console.log('QUALITY PASSED');
} catch (e) {
  console.error('QUALITY FAILED:', e.message);
  if (problems.length) console.error(problems.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
}
