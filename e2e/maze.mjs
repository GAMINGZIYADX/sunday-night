// The hedge maze: walked from the garden to the middle with real movement and
// collision (no walking through hedges), the time is recorded, Hint shows the
// firefly trail, the jar is the fifth little find, and every new game grows a
// different maze while a reload keeps the same one.
import { launch, fileUrl, openGame, startNew } from './lib.mjs';

const SHOTS = process.argv[2] || null;
const log = (...a) => console.log('  ·', ...a);
const fail = (msg) => {
  throw new Error(msg);
};

const browser = await launch();
const { page, problems } = await openGame(browser, fileUrl('dist-debug/index.html', '?debug=1&nolock=1&dtmax=0.25&quality=light'), {
  width: 800,
  height: 450,
});
const ev = (fn, arg) => page.evaluate(fn, arg);
const shot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/maze-${name}.png` });

// Shortest route through the current maze, as cell centres, from the garden
// side of the gap to the middle of the clearing.
const route = () =>
  ev(() => {
    const m = window.__game.game.rooms[4].maze;
    const { cells } = m.layout;
    const rows = cells.length;
    const cols = cells[0].length;
    const goal = [Math.floor(rows / 2), Math.floor(cols / 2)];
    const prev = new Map([[`${m.entrance.r},0`, null]]);
    const q = [[m.entrance.r, 0]];
    while (q.length) {
      const [r, c] = q.shift();
      if (r === goal[0] && c === goal[1]) break;
      const o = cells[r][c];
      for (const [ok, r2, c2] of [
        [o.n, r + 1, c],
        [o.s, r - 1, c],
        [o.e, r, c + 1],
        [o.w, r, c - 1],
      ]) {
        const k = `${r2},${c2}`;
        if (!ok || prev.has(k)) continue;
        prev.set(k, [r, c]);
        q.push([r2, c2]);
      }
    }
    const out = [];
    for (let at = goal; at; at = prev.get(`${at[0]},${at[1]}`)) out.unshift(m.cellCenter(at[0], at[1]));
    return out;
  });

// Walk with the real controller: face the point, hold W.
async function walkTo(p, label) {
  for (let step = 0; step < 40; step++) {
    const d = await ev(
      ([x, z]) => {
        const g = window.__game;
        const me = g.pos();
        const dx = x - me.x;
        const dz = z - me.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.12) return dist;
        g.game.player.yaw = Math.atan2(-dx, -dz);
        g.walk(['KeyW'], Math.max(1, Math.min(8, Math.round(dist / (2.5 / 60)))), 1 / 60);
        return dist;
      },
      [p.x, p.z],
    );
    if (d < 0.12) return;
    await page.waitForTimeout(30);
  }
  const me = await ev(() => window.__game.pos());
  fail(`could not walk to ${label} (${p.x.toFixed(2)}, ${p.z.toFixed(2)}); stuck at (${me.x.toFixed(2)}, ${me.z.toFixed(2)})`);
}

try {
  await startNew(page);
  await page.waitForTimeout(3500);
  await ev(() => {
    window.__game.unlockThrough(4);
    window.__game.closeModals();
    window.__game.teleport(4.4, -41.3, -Math.PI / 2, 0);
  });
  await page.waitForTimeout(800);
  // The sign by the gap.
  const sign = await ev(() => {
    const h = window.__game.lookAt(5.45, 1.15, -42.25);
    return h ? h.prompt : null;
  });
  if (sign !== 'Read the sign') fail(`sign: ${sign}`);
  await ev(() => window.__game.lookAt(7, 1.5, -41.3));
  await shot('gap');

  // No walking through hedges: push straight into the first hedge we face.
  const path = await route();
  log(`route to the middle: ${path.length} cells`);
  await walkTo({ x: 6.2 - 0.45, z: -41.3 }, 'the gap');
  await walkTo(path[0], 'the first cell');
  const blocked = await ev(() => {
    const g = window.__game;
    const m = g.game.rooms[4].maze;
    const o = m.layout.cells[m.entrance.r][0];
    // pick a closed side of the first cell and walk into it for two seconds
    const dir = !o.n ? [0, -1] : !o.s ? [0, 1] : !o.e ? [1, 0] : null;
    if (!dir) return 'open';
    g.game.player.yaw = Math.atan2(-dir[0], -dir[1]);
    const start = g.pos();
    g.walk(['KeyW'], 120, 1 / 60);
    const end = g.pos();
    const c = m.cellCenter(m.entrance.r, 0);
    return Math.max(Math.abs(end.x - c.x), Math.abs(end.z - c.z)) < 0.6 ? 'held' : `went through: ${JSON.stringify([start, end])}`;
  });
  if (blocked !== 'held' && blocked !== 'open') fail(`hedge did not stop the player: ${blocked}`);
  log(`hedges stop the player (${blocked})`);
  await walkTo(path[0], 'the first cell again');

  // Hint inside the maze: the firefly trail.
  await page.keyboard.press('KeyH');
  await page.waitForTimeout(300);
  const trail = await ev(() =>
    window.__game.game.scene.getObjectsByProperty('type', 'Points').some((p) => p.visible && p.material.opacity > 0 && p.material.size === 0.4),
  );
  if (!trail) fail('Hint did not show the firefly trail in the maze');
  await page.waitForTimeout(600);
  await shot('trail');
  log('Hint shows the firefly trail');

  // Walk the route until standing in the clearing (its bench is in the very middle).
  for (let i = 1; i < path.length; i++) {
    const near = await ev(() => {
      const m = window.__game.game.rooms[4].maze.middle;
      const me = window.__game.pos();
      return Math.hypot(me.x - m.x, me.z - m.z) < 1.3;
    });
    if (near) break;
    await walkTo(path[i], `cell ${i}`);
  }
  await page.waitForTimeout(800);
  const maze = await ev(() => window.__game.gs.data.maze);
  if (!maze.done || !(maze.best > 0)) fail(`reaching the middle was not recorded: ${JSON.stringify(maze)}`);
  log(`walked to the middle (${path.length} cells); time recorded: ${maze.best}s`);
  await shot('middle');

  // The jar of fireflies.
  await ev(() => {
    const m = window.__game.game.rooms[4].maze.middle;
    window.__game.lookAt(m.x + 0.55, 0.85, m.z);
  });
  const jar = await ev(() => window.__game.hovered());
  if (jar !== 'Open the jar of fireflies') fail(`jar prompt: ${jar}`);
  await ev(() => window.__game.use());
  await page.waitForTimeout(600);
  if (!(await ev(() => window.__game.gs.hasFind('fireflies')))) fail('the jar is not a find');
  await shot('jar');
  log('the jar of fireflies is a little find');

  // A reload keeps the maze; a new game grows a different one.
  const sig = () => ev(() => JSON.stringify(window.__game.game.rooms[4].maze.layout.cells));
  const before = await sig();
  await ev(() => {
    const g = window.__game.game;
    const data = g.gs.serialize();
    g.importSave(data);
  });
  if ((await sig()) !== before) fail('reloading the save changed the maze');
  const seeds = new Set();
  const layouts = new Set();
  for (let k = 0; k < 3; k++) {
    await ev(() => window.__game.game.newGame());
    await page.waitForTimeout(300);
    seeds.add(await ev(() => window.__game.gs.data.mazeSeed));
    layouts.add(await sig());
  }
  if (layouts.size < 3 || seeds.size < 3) fail('new games did not grow new mazes');
  log('a reload keeps the maze; each new game grows a new one');

  if (problems.length) fail('console problems:\n' + problems.join('\n'));
  console.log('MAZE PASSED');
} catch (e) {
  await shot('FAIL').catch(() => {});
  console.error('MAZE FAILED:', e.message);
  if (problems.length) console.error(problems.join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
}
