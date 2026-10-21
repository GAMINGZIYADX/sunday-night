// Collision + cat robustness:
//  - with doors closed the bedroom cannot be left, whatever she does;
//  - with every door open, long random walks never leave the house/garden or
//    end up inside furniture;
//  - the cats, fast-forwarded for ~40 simulated minutes, always stay in valid
//    places and keep arriving where they walk to (never stuck).
import { launch, fileUrl, openGame, startNew } from './lib.mjs';
const browser = await launch();
const { page, problems } = await openGame(browser, fileUrl('dist-debug/index.html', '?debug=1&nolock=1&dtmax=0.25&quality=light'), {
  width: 480,
  height: 270,
});
let ok = true;
const check = (cond, msg) => {
  console.log(`  ${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) ok = false;
};
try {
  console.log('Collision and cats');
  await startNew(page);
  const res1 = await page.evaluate(() => {
    const g = window.__game;
    const P = g.game.player;
    const keys = [['KeyW'], ['KeyS'], ['KeyA'], ['KeyD'], ['KeyW', 'KeyA'], ['KeyW', 'KeyD'], ['KeyW', 'ShiftLeft']];
    let escaped = null;
    // Directed pushes into every wall and corner.
    for (let a = 0; a < 32; a++) {
      g.teleport(0.6, 0.3, (a / 32) * Math.PI * 2);
      g.walk(['KeyW'], 240, 1 / 30);
      const p = P.pos;
      if (Math.abs(p.x) > 3.5 - 0.2 || Math.abs(p.z) > 3.5 - 0.2) escaped = { ...p, a };
    }
    // Random walk.
    let s = 7;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    g.teleport(0.6, 0.3, 0);
    for (let i = 0; i < 2500; i++) {
      P.yaw += (rnd() - 0.5) * 1.6;
      g.walk(keys[Math.floor(rnd() * keys.length)], 4, 1 / 30);
      const p = P.pos;
      if (Math.abs(p.x) > 3.5 - 0.2 || Math.abs(p.z) > 3.5 - 0.2) escaped = escaped || { ...p, i };
    }
    return escaped;
  });
  check(res1 === null, 'doors closed: the bedroom cannot be left (32 wall pushes + 2500 random steps)' + (res1 ? ' ' + JSON.stringify(res1) : ''));

  await page.evaluate(() => window.__game.unlockThrough(5));
  const res2 = await page.evaluate(() => {
    const g = window.__game;
    const { ROOMS } = g;
    const P = g.game.player;
    const col = g.game.collision;
    const inside = (x, z) => {
      for (let i = 0; i < 5; i++) {
        const r = ROOMS[i];
        if (x > r.x0 + 0.2 && x < r.x1 - 0.2 && z < r.zS - 0.2 && z > r.zN + 0.2) return true;
        if (Math.abs(x) < 0.85 && z <= r.zS && z >= ROOMS[i + 1].zS - 0.3 && z < r.zN + 0.3) return true; // hallway / gate path
      }
      if (Math.hypot(x, z + 53.8) < 4.9 - 0.15) return true; // clearing
      if (Math.abs(x) < 1.75 && z < -46.4 && z > -49.6) return true; // hedge corridor
      return false;
    };
    let bad = null;
    let inFurniture = null;
    const keys = [['KeyW'], ['KeyW'], ['KeyS'], ['KeyA'], ['KeyD'], ['KeyW', 'KeyA'], ['KeyW', 'KeyD']];
    let s = 11;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const visited = new Set();
    // Walk the whole house: start in each room and wander for a while.
    for (let room = 0; room < 6; room++) {
      const r = ROOMS[room];
      g.teleport(0, r.zS - 1.2, 0);
      if (room === 5) g.teleport(0, -50.5, 0);
      for (let i = 0; i < 900; i++) {
        P.yaw += (rnd() - 0.5) * 1.4;
        g.walk(keys[Math.floor(rnd() * keys.length)], 5, 1 / 30);
        const p = P.pos;
        visited.add(g.zoneAt(p.z));
        if (!inside(p.x, p.z)) bad = bad || { x: +p.x.toFixed(2), z: +p.z.toFixed(2), room, i };
        if (col.hits(p.x, p.z, 0.2)) inFurniture = inFurniture || { x: p.x, z: p.z, room, i };
      }
    }
    return { bad, inFurniture, visited: [...visited].sort() };
  });
  check(
    res2.bad === null,
    'all doors open: 5400 random steps never leave the house, garden or clearing' + (res2.bad ? ' ' + JSON.stringify(res2.bad) : ''),
  );
  check(res2.inFurniture === null, 'never ends up inside furniture' + (res2.inFurniture ? ' ' + JSON.stringify(res2.inFurniture) : ''));
  check(res2.visited.length >= 5, `random walks reached zones ${res2.visited.join(',')}`);

  // Cats: free roam through the open house, fast-forwarded.
  const cats = await page.evaluate(() => {
    const g = window.__game;
    const game = g.game;
    const { ROOMS } = g;
    game.gs.data.finished = false;
    game.cats.mode = 'roam';
    game.cats.cats.forEach((c, i) => {
      c.state = 'idle';
      c.hidden = false;
      c.pending = null;
      c.model.tailHeart = 0;
      game.cats.placeAt(c, game.cats.nearestNode(i ? -2.0 : 1.5, -7.0, new Set([1])), 'sit');
    });
    g.teleport(0, -9.5, 0);
    const validFloor = (x, z) => {
      for (let i = 0; i < 6; i++) {
        const r = ROOMS[i];
        if (x >= r.x0 && x <= r.x1 && z <= r.zS && z >= r.zN) return true;
      }
      return Math.abs(x) < 0.85; // hallways
    };
    const stats = { invalid: 0, arrivals: 0, maxWalk: 0, zones: new Set(), jumps: 0 };
    const walkT = new Map();
    const prevNode = new Map();
    const dt = 0.05;
    for (let i = 0; i < 48000; i++) {
      // Move the player around now and then so cats meet her and move away.
      if (i % 2000 === 0) {
        const r = ROOMS[Math.floor((i / 2000) % 5)];
        g.teleport(0.3, r.cz, 0);
        game.camera.updateMatrixWorld();
      }
      game.cats.update(dt, game.camera);
      for (const c of game.cats.cats) {
        const p = c.model.root.position;
        if (!validFloor(p.x, p.z) || p.y < -0.01 || p.y > 0.9) stats.invalid++;
        stats.zones.add(c.zone);
        // Time spent walking since the last waypoint was reached.
        if (c.state === 'walk') walkT.set(c.id, (walkT.get(c.id) || 0) + dt);
        else walkT.set(c.id, 0);
        if (c.node && prevNode.get(c.id) !== c.node) {
          stats.arrivals++;
          prevNode.set(c.id, c.node);
          walkT.set(c.id, 0);
        }
        stats.maxWalk = Math.max(stats.maxWalk, walkT.get(c.id));
        if (c.jumping) stats.jumps++;
      }
    }
    return { ...stats, zones: [...stats.zones].sort() };
  });
  check(cats.invalid === 0, `cats always on valid floor (${cats.invalid} bad samples)`);
  check(cats.maxWalk < 30, `no cat walked longer than 30 s between waypoints (max ${cats.maxWalk.toFixed(1)} s)`);
  check(cats.arrivals > 60, `cats kept arriving at waypoints (${cats.arrivals} arrivals in 40 simulated minutes)`);
  check(cats.zones.length >= 4, `cats wandered through zones ${cats.zones.join(',')}`);
  check(problems.length === 0, 'no console errors or warnings' + (problems.length ? ':\n' + problems.join('\n') : ''));
} catch (e) {
  ok = false;
  console.log('  ✗ ' + e.message);
}
console.log(ok ? 'COLLISION PASSED' : 'COLLISION FAILED');
process.exitCode = ok ? 0 : 1;
await browser.close();
