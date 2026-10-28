// The little things to fiddle with and the little finds: every one is used
// through the real interaction path (look at it + use) and must react. Also
// checks the cats' petting reactions (purr, slow blink, following you).
// Optional screenshots: node e2e/cozy.mjs <dir>
import { launch, fileUrl, openGame, startNew } from './lib.mjs';

const SHOTS = process.argv[2] || null;
const log = (...a) => console.log('  ·', ...a);
const fail = (msg) => {
  throw new Error(msg);
};

const browser = await launch();
const { page, problems } = await openGame(browser, fileUrl('dist-debug/index.html', '?debug=1&nolock=1&dtmax=0.25&quality=full'), {
  width: 800,
  height: 450,
});
const ev = (fn, arg) => page.evaluate(fn, arg);
const shot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/cozy-${name}.png` });
const finds = () => ev(() => window.__game.gs.data.finds.slice());

async function look(at, target, expect) {
  if (at) await ev(([x, z]) => window.__game.teleport(x, z), at);
  const p = await ev(([x, y, z]) => {
    const h = window.__game.lookAt(x, y, z);
    return h ? (typeof h.prompt === 'function' ? h.prompt() : h.prompt) : null;
  }, target);
  if (!p || !p.includes(expect)) {
    const why = await ev(() => {
      const g = window.__game.game;
      const ray = g.interact.ray;
      ray.setFromCamera(new window.__game.THREE.Vector2(0, 0), g.camera);
      const objs = g.interact.items.map((i) => i.object).concat(g.interact.occluders);
      return ray
        .intersectObjects(objs, true)
        .slice(0, 3)
        .map((h) => {
          const it = h.object.userData.interact;
          return `${h.distance.toFixed(2)} ${it ? (typeof it.prompt === 'function' ? it.prompt() : it.prompt) + (g.interact.active(it) ? '' : ' (inactive)') : 'wall'}`;
        });
    });
    fail(`expected "${expect}" at ${JSON.stringify(target)}, saw "${p}"; ray hits: ${why.join(' | ')}`);
  }
  return p;
}
async function use(at, target, expect, after = null) {
  await look(at, target, expect);
  await ev(() => window.__game.use());
  await page.waitForTimeout(700);
  if (after) await look(null, target, after);
}

try {
  await startNew(page);
  await page.waitForTimeout(3000);

  // ---- bedroom
  await use([2.2, 1.0], [3.15, 1.45, 1.6], 'Switch the lamp off', 'Switch the lamp on');
  const dim = await ev(() => window.__game.game.rooms[0].rig.points.some((p) => p.dim === 0.35));
  if (!dim) fail('switching the lamp off did not dim the room light');
  await use(null, [3.15, 1.45, 1.6], 'Switch the lamp on', 'Switch the lamp off');
  log('bedroom lamp switches off and on (and dims the room)');
  await use([-2.0, -2.0], [-2.02, 0.86, -3.27], 'Wind up the music box', 'Listen');
  await shot('musicbox');
  log('music box plays');
  await use([-1.95, -1.9], [-1.95, 0.66, -3.0], 'Open the drawer', 'Close the drawer');
  if (!(await finds()).includes('star')) fail('the drawer did not give the paper star');
  await shot('drawer');
  await use(null, [-1.95, 0.66, -2.75], 'Close the drawer');
  await look(null, [-1.95, 0.66, -3.0], 'Open the drawer');
  log('drawer opens, paper star found, drawer closes');

  // ---- cats: pet three times -> purr, slow blink, then it follows
  const petResult = await ev(async () => {
    const d = window.__game.game.cats;
    const cat = d.cats[0];
    const out = [];
    for (let i = 0; i < 3; i++) {
      d.onCatClicked(cat);
      out.push({ pets: cat.pets, blink: cat.model.slowBlink || 0 });
      await new Promise((r) => setTimeout(r, 200));
    }
    return { out, follow: cat.follow, id: cat.id };
  });
  if (petResult.out[0].blink > 0 || !(petResult.out[1].blink > 0) || !(petResult.follow > 30)) fail(`petting: ${JSON.stringify(petResult)}`);
  // It walks after the player. A following cat trots to the waypoint nearest
  // the player, so stand on the bedroom floor waypoint furthest from it: that
  // is exactly where it has to come.
  const spot = await ev(() => {
    const d = window.__game.game.cats;
    const c = d.cats[0].model.root.position;
    const far = (n) => Math.hypot(n.x - c.x, n.z - c.z);
    const floor = d.nodes.filter((n) => n.zone === 0 && n.door === undefined && n.y < 0.05).sort((a, b) => far(b) - far(a));
    window.__game.teleport(floor[0].x, floor[0].z, 0, 0);
    return [floor[0].x, floor[0].z];
  });
  const dist = () =>
    ev(([x, z]) => {
      const c = window.__game.game.cats.cats[0].model.root.position;
      return Math.hypot(c.x - x, c.z - z);
    }, spot);
  const before = await dist();
  // Software rendering runs slower than real time, so wait for it to arrive
  // (within 1.5 m it has caught up and stops re-pathing, see catDirector.js).
  const arrived = await page
    .waitForFunction(
      ([x, z]) => {
        const c = window.__game.game.cats.cats[0].model.root.position;
        return Math.hypot(c.x - x, c.z - z) < 1.5;
      },
      spot,
      { timeout: 30000, polling: 250 },
    )
    .then(() => true)
    .catch(() => false);
  const after = await dist();
  if (!(before > 2.0) || !arrived) fail(`the cat did not follow: ${before.toFixed(2)} -> ${after.toFixed(2)} m`);
  log(`petting: meow, then purr + slow blink, then it follows (${before.toFixed(1)} m -> ${after.toFixed(1)} m)`);

  // ---- living room
  await ev(() => window.__game.unlockThrough(1));
  await use([1.7, -10.1], [0.45, 0.72, -10.1], 'Lift the cushion');
  await look(null, [0.5, 0.77, -9.8], 'Put the cushion back'); // set aside along the sofa
  if (!(await finds()).includes('mouse')) fail('no toy mouse under the cushion');
  await shot('cushion');
  await use([2.4, -9.5], [3.7, 0.42, -9.5], 'Poke the fire');
  await shot('fire');
  await use([2.6, -12.0], [3.75, 1.5, -13.05], 'Switch the lamp off', 'Switch the lamp on');
  log('cushion (toy mouse), fire and lamp');

  // ---- kitchen
  await ev(() => window.__game.unlockThrough(2));
  await use([2.0, -18.8], [3.3, 1.0, -18.82], 'Put the kettle on', 'The kettle is on');
  await page.waitForTimeout(2600);
  await shot('kettle');
  await use([2.3, -21.05], [3.36, 0.98, -21.05], 'Peek in the cookie jar');
  if (!(await finds()).includes('cookie')) fail('no cookie in the jar');
  await use([2.3, -16.85], [3.45, 1.6, -16.85], 'Open the window', 'Close the window');
  await use(null, [3.45, 1.6, -16.85], 'Close the window', 'Open the window');
  log('kettle, cookie jar (cookie) and window');

  // ---- study
  await ev(() => window.__game.unlockThrough(3));
  await use([2.7, -29.06], [3.71, 0.8, -29.06], 'Open the little book', 'Close the book');
  if (!(await finds()).includes('tulip')) fail('no pressed tulip in the book');
  await shot('book');
  await use([2.6, -29.2], [3.96, 1.12, -29.1], 'Switch the lamp off', 'Switch the lamp on');
  await use([2.6, -27.9], [3.94, 0.975, -27.95], 'Spin the globe');
  log('study book (pressed tulip), lamp and globe');

  // ---- the journal lists the finds
  await ev(() => window.__game.game.openJournal());
  await page.waitForTimeout(500);
  const j = await page.textContent('.journal');
  if (!/Little finds\s+4\/10/.test(j) || !/A paper star/.test(j) || !/A pressed tulip/.test(j))
    fail('journal does not list the finds: ' + j.slice(0, 400));
  await shot('journal');
  await ev(() => window.__game.closeModals());
  // and the finds survive a save + load
  const kept = await ev(() => {
    const g = window.__game.game;
    const data = g.gs.serialize();
    g.gs.reset();
    g.gs.load(data);
    return g.gs.data.finds.length;
  });
  if (kept !== 4) fail(`finds after reload: ${kept}`);
  log('journal shows 4/10 finds; they are saved');

  if (problems.length) fail('console problems:\n' + problems.join('\n'));
  console.log('COZY PASSED');
} catch (e) {
  await shot('FAIL').catch(() => {});
  console.error('COZY FAILED:', e.message);
  if (problems.length) console.error(problems.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
}
