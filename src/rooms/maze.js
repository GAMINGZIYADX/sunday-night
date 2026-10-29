import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { COLORS, PROMPTS, TOASTS, UI, DIFFICULTY } from '../config.js';
import { mat, mesh, group, rbox, box, cyl, sphere } from '../engine/materials.js';
import { makeCanvas, canvasTexture, glowTexture, paperTexture, grass } from '../engine/textures.js';
import { mulberry32 } from '../puzzles/base.js';
import { fill } from '../engine/text.js';
import { foundIt } from './cozy.js';

// The hedge maze beside the garden: an optional mini-game. A new maze grows
// every new game (from the save's mazeSeed). In the middle is a clearing with
// a bench and a jar of fireflies. The time to the middle is kept (best time).
// Inside, the player carries a soft light; Hint shows a short firefly trail.
//
// Grid: `cols` x `rows` cells of `cell` metres. Column 0 is on the garden
// wall (x0), row 0 on the south side (zTop), rows run towards -Z.

const C = COLORS;
const HEDGE_H = 2.25; // taller than eye height: no peeking over
const HEDGE_T = 0.34;

function hedgeTexture() {
  // Many small overlapping leaves in a few greens, with darker gaps.
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = '#22392a';
  g.fillRect(0, 0, 256, 256);
  const r = mulberry32(7);
  const greens = ['#2f5235', '#3a6240', '#45704a', '#527d52', '#5f8a5a', '#365c3c'];
  for (let i = 0; i < 2600; i++) {
    const x = r() * 256;
    const y = r() * 256;
    const a = r() * Math.PI;
    g.fillStyle = greens[Math.floor(r() * greens.length)];
    // drawn three times across the edges so the texture tiles seamlessly
    for (const [ox, oy] of [
      [0, 0],
      [x > 240 ? -256 : x < 16 ? 256 : 0, 0],
      [0, y > 240 ? -256 : y < 16 ? 256 : 0],
    ]) {
      g.beginPath();
      g.ellipse(x + ox, y + oy, 3 + r() * 3.5, 1.6 + r() * 1.6, a, 0, Math.PI * 2);
      g.fill();
    }
  }
  const t = canvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Recursive-backtracker maze with a 3 x 3 clearing in the middle. Returns
// open[r][c] = { n, s, e, w } passages and the clearing cells.
// A maze whose way to the middle is shorter than this is grown again (from the
// same seed, so one seed is always one maze).
export const MIN_ROUTE = 40;

// `tune` is the difficulty (DIFFICULTY in config.js): mazeRoute is the
// [shortest, longest] way to the middle wanted (MIN_ROUTE on Normal); the try
// closest to it is kept. mazeLoops is how many extra openings.
export function generateMaze(cols, rows, seed, entranceRow, tune = { mazeRoute: [MIN_ROUTE, 999], mazeLoops: 3 }) {
  const [lo, hi] = tune.mazeRoute;
  const off = (m) => Math.max(0, lo - m.route, m.route - hi);
  let best = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    const m = growMaze(cols, rows, (seed + attempt * 7919) >>> 0, entranceRow, tune.mazeLoops);
    if (!best || off(m) < off(best) || (off(m) === off(best) && hi === 999 && m.route > best.route)) best = m;
    if (!off(m)) break;
  }
  return best;
}

function growMaze(cols, rows, seed, entranceRow, loops) {
  const rng = mulberry32(seed >>> 0);
  const cells = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ n: false, s: false, e: false, w: false })));
  const cr = Math.floor(rows / 2) - 1;
  const cc = Math.floor(cols / 2) - 1;
  const inRoom = (r, c) => r >= cr && r < cr + 3 && c >= cc && c < cc + 3;
  const link = (r, c, r2, c2) => {
    if (r2 === r - 1) ((cells[r][c].s = true), (cells[r2][c2].n = true));
    if (r2 === r + 1) ((cells[r][c].n = true), (cells[r2][c2].s = true));
    if (c2 === c + 1) ((cells[r][c].e = true), (cells[r2][c2].w = true));
    if (c2 === c - 1) ((cells[r][c].w = true), (cells[r2][c2].e = true));
  };
  const seen = Array.from({ length: rows }, () => new Array(cols).fill(false));
  // The clearing is open inside.
  for (let r = cr; r < cr + 3; r++)
    for (let c = cc; c < cc + 3; c++) {
      seen[r][c] = true;
      if (r + 1 < cr + 3) link(r, c, r + 1, c);
      if (c + 1 < cc + 3) link(r, c, r, c + 1);
    }
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, 1],
    [0, -1],
  ];
  const stack = [[entranceRow, 0]];
  seen[entranceRow][0] = true;
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const next = dirs.map(([dr, dc]) => [r + dr, c + dc]).filter(([r2, c2]) => r2 >= 0 && r2 < rows && c2 >= 0 && c2 < cols && !seen[r2][c2]);
    if (!next.length) {
      stack.pop();
      continue;
    }
    const [r2, c2] = next[Math.floor(rng() * next.length)];
    link(r, c, r2, c2);
    seen[r2][c2] = true;
    stack.push([r2, c2]);
  }
  // A couple of extra openings make small loops, so one wrong turn is not a
  // long walk back. (Made before the clearing's door is chosen, so they can
  // never turn into a shortcut to the middle.)
  for (let k = 0; k < loops; k++) {
    const r = Math.floor(rng() * rows);
    const c = Math.floor(rng() * (cols - 1));
    if (!inRoom(r, c) && !inRoom(r, c + 1)) link(r, c, r, c + 1);
  }
  // One way into the clearing: from the outside cell furthest along the paths
  // from the entrance (so the middle is earned).
  const dist = distances(cells, rows, cols, entranceRow, 0, inRoom);
  let best = null;
  for (let r = cr; r < cr + 3; r++)
    for (let c = cc; c < cc + 3; c++)
      for (const [dr, dc] of dirs) {
        const r2 = r + dr;
        const c2 = c + dc;
        if (r2 < 0 || r2 >= rows || c2 < 0 || c2 >= cols || inRoom(r2, c2)) continue;
        const d = dist[r2][c2] + rng() * 2;
        if (!best || d > best.d) best = { d, r, c, r2, c2 };
      }
  link(best.r, best.c, best.r2, best.c2);
  // Steps from the entrance to the middle cell of the clearing.
  const route = distances(cells, rows, cols, entranceRow, 0)[cr + 1][cc + 1];
  return { cells, room: { r: cr, c: cc }, inRoom, route };
}

// Steps from (r0, c0) to every cell along open passages.
function distances(cells, rows, cols, r0, c0, skip = () => false) {
  const d = Array.from({ length: rows }, () => new Array(cols).fill(Infinity));
  d[r0][c0] = 0;
  const q = [[r0, c0]];
  while (q.length) {
    const [r, c] = q.shift();
    const o = cells[r][c];
    for (const [ok, r2, c2] of [
      [o.n, r + 1, c],
      [o.s, r - 1, c],
      [o.e, r, c + 1],
      [o.w, r, c - 1],
    ]) {
      if (!ok || d[r2][c2] !== Infinity || skip(r2, c2)) continue;
      d[r2][c2] = d[r][c] + 1;
      q.push([r2, c2]);
    }
  }
  return d;
}

export function buildMaze(ctx, { room, x0, zTop, cols = 11, rows = 9, cell = 1.2, entranceRow = 5 }) {
  const g = ctx.roomGroup(room);
  const root = group();
  root.userData.dynamic = true; // rebuilt every new game: never batched
  g.add(root);
  const W = cols * cell;
  const D = rows * cell;
  const zBottom = zTop - D;
  const cx = (c) => x0 + (c + 0.5) * cell;
  const cz = (r) => zTop - (r + 0.5) * cell;
  const cellAt = (x, z) => [Math.floor((zTop - z) / cell), Math.floor((x - x0) / cell)];
  const inside = (p) => p.x > x0 + 0.05 && p.x < x0 + W && p.z < zTop && p.z > zBottom;

  // Ground (always there) and the parts that change per maze.
  const ground = mesh(new THREE.PlaneGeometry(W + 0.6, D + 0.6), mat(0xffffff, { map: grass([5, 4]), rough: 1 }), {
    rot: [-Math.PI / 2, 0, 0],
    pos: [x0 + W / 2, 0.002, zTop - D / 2],
    cast: false,
  });
  g.add(ground);
  const hedgeMat = mat(0xffffff, { map: hedgeTexture(), rough: 1 });
  const puffMat = mat(0x3f6a45, { rough: 1 });
  const puffGeo = new THREE.IcosahedronGeometry(1, 1);
  let built = []; // meshes and colliders of the current maze
  let colliders = [];
  let layout = null;
  let lanterns = [];

  // ---------------------------------------------------- the clearing
  const mid = { x: x0 + (Math.floor(cols / 2) + 0.5) * cell, z: zTop - (Math.floor(rows / 2) + 0.5) * cell };
  const bench = group([], { pos: [mid.x - 0.6, 0, mid.z], rot: [0, Math.PI / 2, 0] });
  const bw = mat(0xc9a27a, { rough: 0.8 });
  for (let i = 0; i < 3; i++) bench.add(mesh(rbox(1.3, 0.04, 0.12, 0.015), bw, { pos: [0, 0.45, -0.15 + i * 0.14] }));
  for (const x of [-0.55, 0.55]) bench.add(mesh(rbox(0.08, 0.45, 0.4, 0.02), mat(0x8a8178, { rough: 0.9 }), { pos: [x, 0.225, 0] }));
  g.add(bench);
  ctx.collision.addCentered(mid.x - 0.6, mid.z, 0.5, 1.4);
  // A stone pedestal with the jar of fireflies.
  const ped = group([mesh(cyl(0.16, 0.2, 0.75, 12), mat(0xb5aca2, { rough: 0.9 }), { pos: [0, 0.375, 0] })], { pos: [mid.x + 0.55, 0, mid.z] });
  const glass = mat(0xdfeef0, { rough: 0.1, opacity: 0.45 });
  const jar = group([mesh(cyl(0.07, 0.07, 0.2, 14), glass, { pos: [0, 0.1, 0], cast: false })], { pos: [0, 0.75, 0] });
  const jarLid = mesh(cyl(0.075, 0.075, 0.03, 14), mat(C.gold, { metal: 0.5, rough: 0.4 }), { pos: [0, 0.215, 0] });
  jar.add(jarLid);
  // Fireflies inside the jar: a few glowing points.
  const inJar = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(3 * 7), 3)),
    new THREE.PointsMaterial({
      map: glowTexture(),
      color: 0xe8ff9a,
      size: 0.05,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  inJar.position.y = 0.1;
  jar.add(inJar);
  ped.add(jar);
  g.add(ped);
  ctx.collision.addCentered(mid.x + 0.55, mid.z, 0.42, 0.42);
  let jarOpen = false;
  ctx.interact.add(jar, {
    zones: [room],
    prompt: () => (jarOpen ? PROMPTS.jarOpened : PROMPTS.jar),
    onUse: () => {
      if (jarOpen) return;
      jarOpen = true;
      jarLid.position.set(0.1, 0.02, 0.12);
      jarLid.rotation.z = 1.2;
      inJar.visible = false;
      const at = jar.getWorldPosition(new THREE.Vector3()).setY(1.0);
      for (let k = 0; k < 3; k++)
        setTimeout(
          () =>
            ctx.particles.burst(at, {
              kind: 'sparkle',
              count: 14,
              color: [0xe8ff9a, 0xfff0a0],
              speed: 0.45,
              size: 0.05,
              gravity: -0.12,
              up: 1,
              life: 2.6,
            }),
          k * 260,
        );
      foundIt(ctx, 'fireflies', at);
    },
  });

  // Fireflies drifting over the hedges (one batch of points).
  const FF = 46;
  const ffPos = new Float32Array(FF * 3);
  const ffSeed = Array.from({ length: FF }, () => [Math.random() * W, Math.random() * D, 0.8 + Math.random() * 2, Math.random() * 10]);
  const ffGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
  const fireflies = new THREE.Points(
    ffGeo,
    new THREE.PointsMaterial({
      map: glowTexture(),
      color: 0xd8ff8a,
      size: 0.12,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  fireflies.frustumCulled = false;
  g.add(fireflies);

  // The hint trail: glowing petals along the way to the middle.
  const TRAIL = 14;
  const trailGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
  const trailMat = new THREE.PointsMaterial({
    map: glowTexture(),
    color: 0xfff0a0,
    size: 0.4,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const trail = new THREE.Points(trailGeo, trailMat);
  trail.frustumCulled = false;
  trail.visible = false;
  g.add(trail);
  let trailT = 0;

  // ------------------------------------------------ build one maze
  function clear() {
    for (const m of built) {
      root.remove(m);
      m.geometry.dispose();
    }
    for (const b of colliders) ctx.collision.remove(b);
    for (const l of lanterns) root.remove(l);
    built = [];
    colliders = [];
    lanterns = [];
  }

  function rebuild(seed) {
    clear();
    layout = generateMaze(cols, rows, seed, entranceRow, DIFFICULTY[ctx.gs.data.level] || DIFFICULTY.normal);
    const { cells } = layout;
    // Wall runs: horizontal lines between rows (and the south/north edges),
    // vertical lines between columns (the west edge is the garden wall).
    const runs = [];
    for (let line = 0; line <= rows; line++) {
      let start = -1;
      for (let c = 0; c <= cols; c++) {
        const closed = c < cols && (line === 0 ? true : line === rows ? true : !cells[line - 1][c].n);
        if (closed && start < 0) start = c;
        if (!closed && start >= 0) {
          runs.push({ x1: x0 + start * cell, x2: x0 + c * cell, z1: zTop - line * cell, z2: zTop - line * cell });
          start = -1;
        }
      }
    }
    for (let line = 1; line <= cols; line++) {
      let start = -1;
      for (let r = 0; r <= rows; r++) {
        const closed = r < rows && (line === cols ? true : !cells[r][line - 1].e);
        if (closed && start < 0) start = r;
        if (!closed && start >= 0) {
          runs.push({ x1: x0 + line * cell, x2: x0 + line * cell, z1: zTop - start * cell, z2: zTop - r * cell });
          start = -1;
        }
      }
    }
    const geos = [];
    const puffs = [];
    const r = mulberry32((seed ^ 0x9e3779b9) >>> 0);
    for (const run of runs) {
      const horiz = run.z1 === run.z2;
      const len = horiz ? run.x2 - run.x1 : run.z1 - run.z2;
      const gx = horiz ? len + HEDGE_T : HEDGE_T;
      const gz = horiz ? HEDGE_T : len + HEDGE_T;
      const mx = (run.x1 + run.x2) / 2;
      const mz = (run.z1 + run.z2) / 2;
      const geo = new THREE.BoxGeometry(gx, HEDGE_H, gz).translate(mx, HEDGE_H / 2, mz);
      // World-space texture coordinates, so leaves are the same size on every run.
      const pos = geo.attributes.position;
      const nor = geo.attributes.normal;
      const uv = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const top = Math.abs(nor.getY(i)) > 0.5;
        const u = top ? pos.getX(i) : pos.getX(i) + pos.getZ(i);
        const v = top ? pos.getZ(i) : pos.getY(i);
        uv.setXY(i, u / 0.7, v / 0.7);
      }
      geos.push(geo);
      colliders.push(ctx.collision.add(mx - gx / 2, mz - gz / 2, mx + gx / 2, mz + gz / 2, 'maze'));
      // Leafy lumps along the top.
      for (let t = 0; t <= len; t += 0.45) {
        const px = horiz ? run.x1 + t : run.x1;
        const pz = horiz ? run.z1 : run.z1 - t;
        puffs.push([px + (r() - 0.5) * 0.12, HEDGE_H - 0.02 + r() * 0.06, pz + (r() - 0.5) * 0.12, 0.17 + r() * 0.08]);
      }
    }
    const hedges = new THREE.Mesh(mergeGeometries(geos), hedgeMat);
    hedges.receiveShadow = false;
    hedges.castShadow = false;
    geos.forEach((gg) => gg.dispose());
    root.add(hedges);
    built.push(hedges);
    const im = new THREE.InstancedMesh(puffGeo, puffMat, puffs.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    puffs.forEach(([px, py, pz, s], i) => {
      q.setFromEuler(new THREE.Euler(r() * 3, r() * 3, r() * 3));
      m4.compose(new THREE.Vector3(px, py, pz), q, new THREE.Vector3(s * 1.2, s * 0.8, s * 1.2));
      im.setMatrixAt(i, m4);
    });
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    root.add(im);
    built.push(im);
    // Lanterns in some dead ends, so the maze has small lights to aim for.
    const dead = [];
    for (let rr = 0; rr < rows; rr++)
      for (let c = 0; c < cols; c++) {
        const o = cells[rr][c];
        if (layout.inRoom(rr, c) || (rr === entranceRow && c === 0)) continue;
        if ([o.n, o.s, o.e, o.w].filter(Boolean).length === 1) dead.push([rr, c]);
      }
    for (let k = dead.length - 1; k > 0; k--) {
      const j = Math.floor(r() * (k + 1));
      [dead[k], dead[j]] = [dead[j], dead[k]];
    }
    for (const [rr, c] of dead.slice(0, 7)) {
      const l = mazeLantern();
      l.position.set(cx(c), 0, cz(rr));
      root.add(l);
      lanterns.push(l);
    }
  }

  // ------------------------------------------------------- updates
  let wasInside = false;
  let startT = 0;
  let timing = false;
  const lantern = new THREE.Vector3();
  const lightHome = new THREE.Vector3();
  ctx.addUpdate((dt, t) => {
    const p = ctx.playerPos();
    const inMaze = ctx.playerZone() === room && inside(p);
    // The player's soft lantern light: borrow one of the garden's lights.
    const pool = ctx.game.lights;
    const rig = ctx.rooms[room]?.rig;
    if (pool.rig === rig && rig) {
      const pl = pool.points[1];
      if (inMaze) {
        lantern.set(p.x, 2.1, p.z);
        pl.position.lerp(lantern, wasInside ? Math.min(1, dt * 6) : 1);
      } else if (wasInside) {
        lightHome.set(...rig.points[1].pos);
        pl.position.copy(lightHome);
      }
    }
    // Timer: from walking in to reaching the middle.
    if (inMaze && !wasInside) {
      timing = true;
      startT = t;
    }
    const atMiddle = Math.hypot(p.x - mid.x, p.z - mid.z) < 1.5;
    if (timing && atMiddle) {
      timing = false;
      reachedMiddle(t - startT);
    }
    if (!inMaze) timing = false;
    wasInside = inMaze;
    // Fireflies drift (only animated while the garden is on screen).
    if (g.visible) {
      for (let i = 0; i < FF; i++) {
        const [fx, fz, fy, ph] = ffSeed[i];
        ffPos[i * 3] = x0 + ((fx + Math.sin(t * 0.3 + ph) * 0.8 + W) % W);
        ffPos[i * 3 + 1] = fy + Math.sin(t * 0.7 + ph * 2) * 0.25;
        ffPos[i * 3 + 2] = zTop - ((fz + Math.cos(t * 0.25 + ph) * 0.8 + D) % D);
      }
      ffGeo.attributes.position.needsUpdate = true;
      fireflies.material.opacity = 0.65 + Math.sin(t * 2.1) * 0.25;
      if (!jarOpen) {
        const a = inJar.geometry.attributes.position;
        for (let i = 0; i < 7; i++) a.setXYZ(i, Math.sin(t * 1.3 + i * 2) * 0.04, Math.sin(t * 0.9 + i) * 0.06, Math.cos(t * 1.1 + i * 3) * 0.04);
        a.needsUpdate = true;
      }
    }
    if (trailT > 0) {
      trailT -= dt;
      trailMat.opacity = Math.min(1, trailT / 2) * (0.75 + Math.sin(t * 6) * 0.2);
      if (trailT <= 0) trail.visible = false;
    }
  });

  function reachedMiddle(seconds) {
    const m = ctx.gs.data.maze || (ctx.gs.data.maze = { best: 0, done: false });
    const first = !m.done;
    const better = !m.best || seconds < m.best;
    m.done = true;
    if (better) m.best = Math.round(seconds);
    const time = fmt(seconds);
    const best = fmt(m.best);
    ctx.audio.chime();
    ctx.hud.toast(fill(first ? TOASTS.mazeFirst : better ? TOASTS.mazeBest : TOASTS.mazeAgain, { TIME: time, BEST: best }), { ms: 5000 });
    ctx.gs.emit('autosave', { reason: 'maze' });
  }

  // Hint: light the next stretch of the way to the middle for a while.
  function showTrail() {
    if (!layout) return false;
    const p = ctx.playerPos();
    const [r0, c0] = cellAt(p.x, p.z);
    if (r0 < 0 || r0 >= rows || c0 < 0 || c0 >= cols) return false;
    // Walk back from the middle to the player along shortest paths.
    const { cells } = layout;
    const d = distances(cells, rows, cols, layout.room.r + 1, layout.room.c + 1);
    const path = [];
    let [r, c] = [r0, c0];
    for (let k = 0; k < TRAIL && d[r][c] > 0 && d[r][c] !== Infinity; k++) {
      const o = cells[r][c];
      const opts = [
        [o.n, r + 1, c],
        [o.s, r - 1, c],
        [o.e, r, c + 1],
        [o.w, r, c - 1],
      ].filter(([ok, r2, c2]) => ok && d[r2][c2] === d[r][c] - 1);
      if (!opts.length) break;
      [, r, c] = opts[0];
      path.push([r, c]);
    }
    const a = trailGeo.attributes.position;
    for (let i = 0; i < TRAIL; i++) {
      const [pr, pc] = path[Math.min(i, path.length - 1)] || [r0, c0];
      a.setXYZ(i, cx(pc), 0.35, cz(pr));
    }
    a.needsUpdate = true;
    trail.visible = true;
    trailT = 14;
    ctx.audio.sparkle();
    ctx.hud.toast(TOASTS.mazeHint, { ms: 3000 });
    return true;
  }

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`;

  // A wooden sign by the way in (on the garden side).
  const signTex = paperTexture(UI.mazeSign, { w: 256, h: 150, size: 30, center: true, lines: false, bg: '#f3e6cf', stain: false });
  const sign = group(
    [
      mesh(cyl(0.03, 0.03, 1.1, 6), mat(0x6b4f3a), { pos: [0, 0.55, 0] }),
      mesh(rbox(0.5, 0.3, 0.04, 0.01), mat(0x8a6a50), { pos: [0, 1.15, 0] }),
      mesh(new THREE.PlaneGeometry(0.44, 0.25), mat(0xffffff, { map: signTex }), { pos: [0, 1.15, 0.022], cast: false }),
    ],
    // north of the gap, clear of the tulip beds, turned towards the path
    { pos: [x0 - 0.75, 0, cz(entranceRow) - 0.95], rot: [0, -Math.PI / 2 - 0.35, 0] },
  );
  g.add(sign);
  ctx.interact.add(sign, {
    zones: [room],
    prompt: PROMPTS.mazeSign,
    onUse: () => {
      const m = ctx.gs.data.maze;
      ctx.hud.toast(m?.best ? fill(TOASTS.mazeSignBest, { BEST: fmt(m.best) }) : TOASTS.mazeSign, { ms: 4200 });
    },
  });

  return {
    rebuild,
    showTrail,
    inMaze: (p) => inside(p),
    middle: mid,
    // For tests: the cell grid and helpers.
    get layout() {
      return layout;
    },
    cellCenter: (r, c) => ({ x: cx(c), z: cz(r) }),
    entrance: { r: entranceRow, c: 0 },
    resetJar() {
      jarOpen = ctx.gs.hasFind('fireflies');
      inJar.visible = !jarOpen;
      if (jarOpen) {
        jarLid.position.set(0.1, 0.02, 0.12);
        jarLid.rotation.z = 1.2;
      } else {
        jarLid.position.set(0, 0.215, 0);
        jarLid.rotation.z = 0;
      }
    },
  };
}

function mazeLantern() {
  const g = group();
  g.add(mesh(cyl(0.018, 0.018, 0.7, 6), mat(0x2e2a33, { metal: 0.5 }), { pos: [0, 0.35, 0], cast: false }));
  g.add(mesh(rbox(0.13, 0.16, 0.13, 0.02), mat(0xfff0c8, { emissive: 0xffc870, ei: 1.6, rough: 0.6 }), { pos: [0, 0.78, 0], cast: false }));
  g.add(mesh(box(0.15, 0.02, 0.15), mat(0x2e2a33, { metal: 0.5 }), { pos: [0, 0.87, 0], cast: false }));
  g.add(mesh(sphere(0.02, 6, 4), mat(0x2e2a33, { metal: 0.5 }), { pos: [0, 0.9, 0], cast: false }));
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(),
      color: 0xffc870,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  glow.scale.setScalar(0.8);
  glow.position.set(0, 0.78, 0);
  glow.raycast = () => {};
  g.add(glow);
  return g;
}
