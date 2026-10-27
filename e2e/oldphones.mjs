// Older and mid-range phones: the game on WebGL 1 only (graphics chips from
// before about 2015), the 60 fps cap for 90/120 Hz screens, the puzzle boards
// sized without aspect-ratio (Chrome 80), and a clear message with no WebGL.
import { launch, fileUrl, openGame, startNew } from './lib.mjs';

let ok = true;
const check = (cond, msg) => {
  console.log(`  ${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) ok = false;
};
console.log('Older phones');

let browser = await launch({ webgl1: true });
try {
  const { page, problems } = await openGame(browser, fileUrl('dist-debug/index.html', '?debug=1&nolock=1&dtmax=0.25&touch=1'), { width: 873, height: 393 });
  await startNew(page);
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const g = window.__game.game;
    const kinds = new Set();
    g.scene.traverse((o) => o.isMesh && o.material && !Array.isArray(o.material) && kinds.add(o.material.type));
    return { webgl2: g.renderer.capabilities.isWebGL2, lambert: kinds.has('MeshLambertMaterial'), shadows: g.renderer.shadowMap.enabled };
  });
  check(!info.webgl2, 'the game runs on WebGL 1');
  check(info.lambert && !info.shadows, "'auto' picks light graphics there");
  check(!problems.some((p) => p.includes('resized')), 'card textures keep their full size (no power-of-two shrinking)');

  // 120 Hz and 90 Hz screens: frames are drawn at about 60 a second. (The
  // test's mouse clicks switched to mouse controls; a finger switches back.)
  await page.evaluate(() => document.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch' })));
  check(await page.evaluate(() => document.body.classList.contains('touch')), 'touch controls are on');
  const drawn = await page.evaluate(() => {
    const g = window.__game.game;
    g.renderer.setAnimationLoop(null);
    const frame = g._frame;
    let n = 0;
    g._frame = () => n++;
    const count = (hz) => {
      n = 0;
      g._nextFrame = 0;
      for (let t = 0; t < 2000; t += 1000 / hz) g._tick(t);
      return n / 2;
    };
    const out = { 120: count(120), 90: count(90), 60: count(60) };
    g._frame = frame;
    g.renderer.setAnimationLoop((now) => g._tick(now));
    return out;
  });
  check(drawn[120] >= 59 && drawn[120] <= 61, `120 Hz screen: ${drawn[120]} frames a second`);
  check(drawn[90] >= 59 && drawn[90] <= 61, `90 Hz screen: ${drawn[90]} frames a second`);
  check(drawn[60] >= 59 && drawn[60] <= 61, `60 Hz screen: ${drawn[60]} frames a second`);

  // Boards sized by width and height (older browsers have no aspect-ratio).
  const boards = await page.evaluate(() =>
    ['slide-board', 'sudoku', 'sudoku n6', 'sky-wrap'].map((cls) => {
      const d = document.createElement('div');
      d.className = cls;
      document.body.appendChild(d);
      const r = d.getBoundingClientRect();
      d.remove();
      return { cls, ratio: r.width / r.height, w: r.width };
    }),
  );
  for (const b of boards) {
    const want = b.cls === 'sky-wrap' ? 1.25 : 1;
    check(b.w > 100 && Math.abs(b.ratio - want) < 0.02, `.${b.cls.replace(' ', '.')} is ${b.w.toFixed(0)} px wide, ratio ${b.ratio.toFixed(2)}`);
  }
  check(problems.length === 0, `no console errors or warnings${problems.length ? ': ' + problems.slice(0, 3).join(' | ') : ''}`);
} finally {
  await browser.close();
}

// No WebGL at all: a message instead of a blank page.
browser = await launch({ args: ['--disable-3d-apis'] });
try {
  const page = await browser.newPage({ viewport: { width: 873, height: 393 } });
  await page.goto(fileUrl('dist/index.html'));
  const msg = await page.waitForSelector('.no-webgl', { timeout: 15000 }).catch(() => null);
  check(!!msg && (await msg.textContent()).includes('WebGL'), 'without WebGL the page explains why instead of staying blank');
} finally {
  await browser.close();
}

console.log(ok ? 'OLDPHONES PASSED' : 'OLDPHONES FAILED');
process.exitCode = ok ? 0 : 1;
