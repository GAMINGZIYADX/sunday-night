// The full-graphics self-check (Game._checkPicture): when a driver draws the
// full look as a white screen (a Pixel 10 did), the game steps down by itself:
// shadows off, then edge smoothing off (restart), then light graphics
// (restart), and remembers the step. Here the white screen is faked.
import { launch, fileUrl } from './lib.mjs';

let ok = true;
const check = (cond, msg) => {
  console.log(`  ${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) ok = false;
};
console.log('Graphics self-check');

const browser = await launch();
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const problems = [];
  page.on('pageerror', (e) => problems.push(e.message));
  const url = fileUrl('dist-debug/index.html', '?debug=1&nolock=1&dtmax=0.25');
  await page.goto(url);
  await page.evaluate(() => localStorage.setItem('sundayNight.settings.v1', JSON.stringify({ graphics: 'full' })));
  await page.reload();
  await page.waitForFunction(() => window.__game?.game);
  const ev = (fn) => page.evaluate(fn);
  const look = () =>
    ev(() => {
      const g = window.__game.game;
      const kinds = new Set();
      g.scene.traverse((o) => o.isMesh && o.material && !Array.isArray(o.material) && kinds.add(o.material.type));
      return {
        fix: g.settings.data.gfxFix,
        graphics: g.settings.data.graphics,
        shadows: g.renderer.shadowMap.enabled,
        msaa: g.renderer.getContext().getContextAttributes().antialias,
        standard: kinds.has('MeshStandardMaterial'),
      };
    });
  // A white screen, as the broken driver drew it; the check looks again.
  const breakPicture = () =>
    ev(() => {
      const g = window.__game.game;
      const { THREE } = window.__game;
      g.scene.overrideMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(10, 10, 10) });
      g.scene.background = new THREE.Color(10, 10, 10);
      g.scene.fog = null;
      g._check = { frames: 0 };
    });
  const afterReload = async () => {
    await page.waitForEvent('load', { timeout: 30000 });
    await page.waitForFunction(() => window.__game?.game);
    await page.waitForTimeout(3000); // the check runs (and passes) on the 30th frame
  };

  await page.waitForTimeout(3000);
  let s = await look();
  check(s.fix === 0 && s.shadows && s.msaa && s.standard, 'a normal picture: full graphics stay as they are');

  const reload1 = afterReload();
  await breakPicture();
  await page.waitForFunction(() => window.__game.game.settings.data.gfxFix === 1, null, { timeout: 30000 });
  s = await look();
  check(!s.shadows, 'white screen: shadows go first, without a restart');
  await reload1;
  s = await look();
  check(s.fix === 2 && !s.shadows && !s.msaa && s.standard, 'still white: restarts without edge smoothing, still the full look');
  const fixedNote = await ev(() => window.__game.game.settings.data.gfxFix);
  check(fixedNote === 2, 'the step is remembered for this device');

  const reload2 = afterReload();
  await breakPicture();
  await reload2;
  s = await look();
  check(s.fix === 3 && s.graphics === 'light' && !s.standard, 'still white: restarts with light graphics');
  check(problems.length === 0, `no page errors${problems.length ? ': ' + problems.join(' | ') : ''}`);
} finally {
  await browser.close();
}
console.log(ok ? 'GFXCHECK PASSED' : 'GFXCHECK FAILED');
process.exitCode = ok ? 0 : 1;
