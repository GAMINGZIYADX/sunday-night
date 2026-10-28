// What keeps the frame light: rooms behind a closed door or an off-screen
// doorway are not drawn (Game._cull), the shadow map is only drawn again when
// something on screen moved (engine/shadows.js), and every room stays within
// the draw-call budget, shadow pass included (three.js does not count it).
import { launch, fileUrl, openGame, startNew } from './lib.mjs';

const SHOTS = process.argv[2] || null;
const BUDGET = 450;
const log = (...a) => console.log('  ·', ...a);
const fail = (msg) => {
  throw new Error(msg);
};

const browser = await launch();
const URL = fileUrl('dist-debug/index.html', '?debug=1&nolock=1&dtmax=0.25&quality=full');
const { page, problems } = await openGame(browser, URL, { width: 800, height: 450 });
const ev = (fn, arg) => page.evaluate(fn, arg);
const shot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/perf-${name}.png` });
const shown = () => ev(() => window.__game.game.roomGroups.map((g) => !!g?.visible));
const frames = (n = 4) => page.waitForTimeout(n * 150);
// Stand somewhere and look at a point.
const view = (x, z, at) =>
  ev(
    ([x, z, at]) => {
      window.__game.teleport(x, z, 0, 0);
      window.__game.lookAt(...at);
    },
    [x, z, at],
  );

let ok = false;
try {
  await startNew(page);
  console.log('Performance');
  // Count the shadow pass's draw calls by hand (from the last frame that drew it).
  await ev(() => {
    const R = window.__game.game.renderer;
    const render = R.shadowMap.render;
    let on = false;
    let n = 0;
    window.__shadowCalls = 0;
    R.shadowMap.render = function (...a) {
      on = true;
      n = 0;
      try {
        return render.apply(this, a);
      } finally {
        on = false;
        if (n) window.__shadowCalls = n;
      }
    };
    const rbd = R.renderBufferDirect.bind(R);
    R.renderBufferDirect = (...a) => (on && n++, rbd(...a));
  });

  // ---- rooms out of sight are not drawn
  await view(0, 1.0, [0, 1.3, -10]);
  await frames();
  let v = await shown();
  if (v[1]) fail('the living room is drawn behind the closed bedroom door');
  log('behind a closed door: not drawn');
  await ev(() => window.__game.unlockThrough(4));
  await frames();
  if (!(await shown())[1]) fail('the living room is not drawn through the open bedroom door');
  const hidden = await ev(() => {
    const kids = window.__game.game.roomGroups[1].children;
    return [kids.filter((o) => o.userData.beyond).length, kids.length];
  });
  if (!(hidden[0] > 0 && hidden[0] < hidden[1])) fail(`through the doorway, ${hidden[0]} of ${hidden[1]} living room parts are skipped`);
  await shot('through-door');
  await view(0, 1.0, [0, 1.3, 10]);
  await frames();
  if ((await shown())[1]) fail('the living room is drawn while its doorway is behind the player');
  log('through an open door: drawn only while the doorway is on screen');
  // From the hallway both rooms show, whichever way you look.
  for (const at of [
    [0, 1.3, 10],
    [0, 1.3, -20],
  ]) {
    await view(0, -4.6, at);
    await frames();
    v = await shown();
    if (!v[0] || !v[1]) fail(`from the hallway, looking ${at[2] > 0 ? 'back' : 'ahead'}: rooms shown ${v}`);
  }
  // Looking back from the living room into the hallway.
  await view(0.5, -7, [0, 1.3, 4]);
  await frames();
  if (!(await shown())[0]) fail('the bedroom and hallway are not drawn looking back through the doorway');
  await view(0.5, -7, [0, 1.3, -20]);
  await frames();
  if ((await shown())[0]) fail('the bedroom is drawn while its doorway is behind the player');
  log('looking back, and from the hallway: drawn');
  // A cat in a hidden room is hidden with it.
  await ev(() => {
    const c = window.__game.game.cats;
    c.update = () => {};
    c.cats[0].model.root.position.set(1, 0, 0);
    c.cats[0].model.root.visible = true;
  });
  await frames();
  if (await ev(() => window.__game.game.cats.cats[0].model.root.visible)) fail('a cat in the hidden bedroom is still drawn');
  log('a cat in a hidden room: not drawn');

  // ---- the shadow map is drawn again only when something on screen moves
  await view(0, 1.6, [0, 0.2, -1.2]);
  await ev(() => {
    const [a, b] = window.__game.game.cats.cats;
    a.model.root.position.set(0.6, 0, -1.2);
    a.model.root.visible = true;
    b.model.root.position.set(-2.5, 0, 2.8);
  });
  // Nothing moves: the cats are frozen, and so (for 2 s) is every room's own
  // animation (pendant lamps sway, the attic cord swings). At most the
  // 3-second safety refresh draws it.
  await ev(() => {
    const g = window.__game.game;
    window.__updaters = g.updaters.splice(0);
  });
  await page.waitForTimeout(600);
  const draws = () => ev(() => window.__game.game.shadows.draws);
  let d0 = await draws();
  await page.waitForTimeout(2000);
  const still = (await draws()) - d0;
  await ev(() => window.__game.game.updaters.push(...window.__updaters));
  if (still > 1) fail(`shadow map drawn ${still} times in 2 s with nothing moving`);
  d0 = await draws();
  for (let i = 1; i <= 6; i++) {
    await ev((i) => window.__game.game.cats.cats[0].model.root.position.set(0.6 - i * 0.15, 0, -1.2), i);
    await page.waitForTimeout(120);
  }
  const moving = (await draws()) - d0;
  if (moving < 5) fail(`shadow map drawn only ${moving} times while a cat walked on screen`);
  // Moving off screen does not need it, but coming back does.
  await view(0, 1.6, [0, 1.3, 10]);
  await page.waitForTimeout(400);
  d0 = await draws();
  await ev(() => window.__game.game.cats.cats[0].model.root.position.set(1.4, 0, -2.4));
  await page.waitForTimeout(600);
  const behind = (await draws()) - d0;
  if (behind > 2) fail(`shadow map drawn ${behind} times for a cat behind the player`);
  d0 = await draws();
  await view(0, 1.6, [0, 0.2, -1.2]);
  await page.waitForTimeout(500);
  if ((await draws()) === d0) fail('the shadow map was not redrawn when the moved cat came into view');
  log(`shadows: still +${still}, a cat walking +${moving}, behind the player +${behind}, back in view: redrawn`);

  // ---- every room within the budget (main pass + shadow pass)
  const SPOTS = [
    [0, 2.3],
    [0, -6.7],
    [0, -16.7],
    [0, -25.7],
    [0, -35.7],
    [0, -49.7],
    [0, 24.2],
    [0, 37.2],
    [0, 49.2],
    [0, 60.2],
  ];
  // The worst case: every door open (looking through the next one), and the
  // shadow map drawn in the same frame.
  const rows = [];
  for (const [x, z] of SPOTS) {
    await ev(([x, z]) => window.__game.teleport(x, z, 0, -0.05), [x, z]);
    await page.waitForTimeout(900);
    const r = await ev(() => {
      window.__shadowCalls = 0;
      window.__game.game.shadows.invalidate();
      return new Promise((ok) =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            ok({ zone: window.__game.zone(), main: window.__game.game.renderer.info.render.calls, shadow: window.__shadowCalls }),
          ),
        ),
      );
    });
    rows.push(`${r.zone}:${r.main}+${r.shadow}`);
    if (r.main + r.shadow > BUDGET) fail(`room ${r.zone} draws ${r.main} + ${r.shadow} (shadows) calls, over ${BUDGET}`);
  }
  log(`draw calls by room (main+shadow): ${rows.join(' ')}`);

  if (problems.length) fail(`console problems:\n${problems.join('\n')}`);
  ok = true;
} catch (e) {
  console.error('  ✗', e.message);
  await shot('failure');
} finally {
  await browser.close();
}
console.log(ok ? 'PERF PASSED' : 'PERF FAILED');
process.exitCode = ok ? 0 : 1;
