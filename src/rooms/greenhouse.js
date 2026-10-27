import * as THREE from 'three';
import { COLORS, PROMPTS, TOASTS, SIDE_ROOMS } from '../config.js';
import { GREENHOUSE as R, GREENHOUSE_ZONE, GREENHOUSE_DOOR_Z, ROOMS } from '../engine/layout.js';
import { mat, mesh, group, rbox, box, cyl, sphere, cone } from '../engine/materials.js';
import { brick, labelTexture } from '../engine/textures.js';
import { woodMat, hitArea, glowSprite, stringLights, pottedPlant, hangingPlant, table, chair, tulip } from '../engine/props.js';
import { floorMesh } from './shell.js';
import { foundIt } from './cozy.js';
import { tween, skyDome, wallDoor, boxIn, smooth } from './side.js';
import { waterOverlay, lampsOverlay } from '../ui/overlays.js';
import { POTS } from '../puzzles/water.js';
import { LN } from '../puzzles/lamps.js';

// The greenhouse: through the glass door at the side of the garden. Six
// thirsty pots on the potting bench (water them thirstiest first), a 4×4
// grid of grow lamps over the seedlings, and once both are done a tulip
// opens on the middle table: the little find.

const C = COLORS;
const ROOM = GREENHOUSE_ZONE;
const GARDEN = ROOMS[4];
export const GREENHOUSE_ARRIVE = { x: 0, z: R.zS - 0.9, yaw: 0 };
const GARDEN_ARRIVE = { x: GARDEN.x0 + 1.05, z: GREENHOUSE_DOOR_Z, yaw: -Math.PI / 2 };
const BENCH_X = R.x0 + 0.55;
const LAMP_X = R.x1 - 1.05;
const LAMP_Z = 34.0;

// ----------------------------------------------------------- the glass house
function buildShell(ctx, g) {
  g.add(floorMesh(R.w, R.d, mat(0xffffff, { map: brick(0x9a8a7e, [5, 5]), rough: 0.95 }), { x: 0, z: R.cz }));
  const base = mat(0xffffff, { map: brick(0xb27c66, [6, 1]), rough: 0.9 });
  const frame = mat(0xf4efe6, { rough: 0.5 });
  const glass = mat(0xcfe3ff, { basic: true, opacity: 0.1, depthWrite: false, fog: false });
  const baseH = 0.55;
  const eave = 2.3;
  // Low brick walls, glass above, white frames.
  const wall = (len, along, x, z) => {
    const rot = along === 'z' ? [0, Math.PI / 2, 0] : [0, 0, 0];
    g.add(mesh(box(len, baseH, 0.14), base, { pos: [x, baseH / 2, z], rot }));
    g.add(mesh(box(len, eave - baseH, 0.02), glass, { pos: [x, (eave + baseH) / 2, z], rot, cast: false, receive: false }));
    g.add(mesh(box(len, 0.06, 0.08), frame, { pos: [x, eave, z], rot, cast: false }));
    g.add(mesh(box(len, 0.05, 0.08), frame, { pos: [x, baseH + 0.02, z], rot, cast: false }));
    for (let t = -len / 2; t <= len / 2 + 0.01; t += len / Math.round(len / 0.9)) {
      const p = along === 'z' ? [x, (eave + baseH) / 2, z + t] : [x + t, (eave + baseH) / 2, z];
      g.add(mesh(box(0.05, eave - baseH, 0.05), frame, { pos: p, cast: false }));
    }
  };
  wall(R.d, 'z', R.x0, R.cz);
  wall(R.d, 'z', R.x1, R.cz);
  wall(R.w, 'x', 0, R.zN);
  wall(R.w, 'x', 0, R.zS);
  // A pitched glass roof along Z with frame ribs.
  const rise = R.h - eave;
  const slope = Math.atan2(rise, R.x1);
  const len = Math.hypot(rise, R.x1);
  for (const side of [-1, 1]) {
    const cx = (side * R.x1) / 2;
    const cy = eave + rise / 2;
    g.add(mesh(box(len, 0.02, R.d), glass, { pos: [cx, cy, R.cz], rot: [0, 0, -side * slope], cast: false, receive: false }));
    for (let z = R.zN; z <= R.zS + 0.01; z += R.d / 7)
      g.add(mesh(box(len, 0.05, 0.05), frame, { pos: [cx, cy, z], rot: [0, 0, -side * slope], cast: false }));
  }
  g.add(mesh(box(0.08, 0.08, R.d), frame, { pos: [0, R.h, R.cz], cast: false }));
  // The gable ends: glass triangles.
  for (const z of [R.zN, R.zS]) {
    const s = new THREE.Shape();
    s.moveTo(R.x0, eave);
    s.lineTo(R.x1, eave);
    s.lineTo(0, R.h);
    s.closePath();
    g.add(mesh(new THREE.ShapeGeometry(s), glass, { pos: [0, 0, z], cast: false, receive: false }));
  }
  skyDome(g, [0, -4, R.cz]);
  boxIn(ctx, R);
}

// ------------------------------------------------- the doors, both sides
function buildDoors(ctx, g) {
  // In the garden's west wall.
  const into = wallDoor(ctx, 4, {
    pos: [GARDEN.x0 + 0.02, 0, GREENHOUSE_DOOR_Z],
    facing: Math.PI / 2,
    glass: true,
    glow: 0xd8f0c8,
    prompt: PROMPTS.greenhouseIn,
    onUse: () => ctx.game.travel(GREENHOUSE_ARRIVE.x, GREENHOUSE_ARRIVE.z, GREENHOUSE_ARRIVE.yaw),
  });
  ctx.roomGroup(4).add(into);
  // Back out: the greenhouse's own door, in its south end.
  const out = wallDoor(ctx, ROOM, {
    pos: [0, 0, R.zS - 0.06],
    facing: Math.PI,
    glass: true,
    glow: 0x9fb4e8,
    prompt: PROMPTS.greenhouseOut,
    onUse: () => ctx.game.travel(GARDEN_ARRIVE.x, GARDEN_ARRIVE.z, GARDEN_ARRIVE.yaw),
  });
  g.add(out);
}

// ------------------------------------------------------- the potting bench
// Six pots in a row along the west wall, each with a day tag; a watering can
// with a note on it at the south end.
function buildBench(ctx, g) {
  const gs = ctx.gs;
  const pz = gs.puzzles.water;
  const wood = woodMat('mid');
  const bench = group([], { pos: [BENCH_X, 0, R.cz] });
  bench.add(mesh(rbox(0.7, 0.05, 5.6, 0.015), wood, { pos: [0, 0.8, 0] }));
  bench.add(mesh(rbox(0.66, 0.04, 5.4, 0.015), wood, { pos: [0, 0.3, 0] }));
  for (const z of [-2.7, 0, 2.7]) for (const x of [-0.3, 0.3]) bench.add(mesh(box(0.05, 0.8, 0.05), wood, { pos: [x, 0.4, z] }));
  g.add(bench);
  ctx.collision.add(BENCH_X - 0.4, R.cz - 2.85, BENCH_X + 0.4, R.cz + 2.85, 'bench');
  const potZ = (i) => R.cz - 2.2 + i * 0.78;
  const plants = [];
  const tags = [];
  for (let i = 0; i < POTS; i++) {
    const holder = group([], { pos: [BENCH_X, 0.825, potZ(i)] });
    holder.userData.dynamic = true;
    g.add(holder);
    plants.push(holder);
    const tagMesh = mesh(box(0.2, 0.1, 0.005), mat(0xffffff, { map: labelTexture('', { w: 256, h: 128 }), unique: true }), {
      pos: [BENCH_X + 0.36, 0.72, potZ(i)],
      rot: [0, Math.PI / 2, 0],
      cast: false,
    });
    tagMesh.userData.dynamic = true;
    g.add(tagMesh);
    tags.push(tagMesh);
  }
  // The plants are drawn from the current game's picks.
  const draw = () => {
    for (let i = 0; i < POTS; i++) {
      const h = plants[i];
      h.clear();
      const kinds = [
        { leafColor: 0x5f8f55, size: 0.55, leaves: 9 },
        { leafColor: 0x7aa86a, size: 0.45, leaves: 6 },
        { leafColor: 0x4f7a4a, size: 0.6, leaves: 11 },
      ];
      const k = kinds[pz.plants[i] % kinds.length];
      const pot = pottedPlant({ potColor: [0xc77b58, 0xd99a6c, 0xb5654a][pz.plants[i] % 3], size: k.size, leaves: k.leaves, leafColor: k.leafColor });
      const wet = pz.isWatered(i) || pz.isSolved();
      pot.scale.setScalar(wet ? 1 : 0.92);
      pot.rotation.z = wet ? 0 : 0.08;
      h.add(pot);
      const tex = labelTexture(pz.day(i).slice(0, 3), { w: 256, h: 128, size: 60, color: '#5a4636', bg: '#f6efe0' });
      tags[i].material.map?.dispose();
      tags[i].material.map = tex;
      tags[i].material.needsUpdate = true;
    }
  };
  // The watering can with its note.
  const can = group(
    [
      mesh(cyl(0.1, 0.11, 0.2, 14), mat(0x7fa6b8, { metal: 0.4, rough: 0.4 }), { pos: [0, 0.1, 0] }),
      mesh(cyl(0.012, 0.02, 0.26, 8), mat(0x7fa6b8, { metal: 0.4, rough: 0.4 }), { pos: [0, 0.16, -0.17], rot: [-0.9, 0, 0] }),
      mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 14, Math.PI), mat(0x7fa6b8, { metal: 0.4 }), { pos: [0, 0.22, 0.04], rot: [0, Math.PI / 2, 0] }),
      mesh(box(0.1, 0.07, 0.003), mat(0xfbf3e4), { pos: [0.105, 0.1, 0], rot: [0, Math.PI / 2, 0], cast: false }),
    ],
    { pos: [BENCH_X, 0.825, R.zS - 0.55] },
  );
  g.add(can);
  ctx.interact.add(can, { zones: [ROOM], prompt: PROMPTS.waterCard, onUse: () => ctx.showClue('waterCard') });
  const hit = hitArea(0.7, 0.6, 5.0);
  hit.position.set(BENCH_X, 1.1, R.cz - 0.25);
  g.add(hit);
  ctx.interact.add(hit, { zones: [ROOM], puzzle: 'water', prompt: PROMPTS.water, onUse: () => waterOverlay(ctx.game, pz) });
  pz.onChange((p, just) => {
    draw();
    if (just) ctx.audio.chime();
  });
  draw();
  return { sync: draw, anchor: new THREE.Vector3(BENCH_X, 1.0, R.cz) };
}

// --------------------------------------------------------- the grow lamps
// A seedling table with a frame above it: sixteen little lamps in four rows.
function buildLamps(ctx, g) {
  const gs = ctx.gs;
  const pz = gs.puzzles.lamps;
  const t = table({ w: 1.5, d: 1.5, h: 0.78, wood: 'light' });
  t.position.set(LAMP_X, 0, LAMP_Z);
  g.add(t);
  ctx.collision.addCentered(LAMP_X, LAMP_Z, 1.6, 1.6);
  // Trays of seedlings.
  for (let i = 0; i < LN; i++)
    for (let j = 0; j < LN; j++) {
      const x = LAMP_X - 0.54 + j * 0.36;
      const z = LAMP_Z - 0.54 + i * 0.36;
      g.add(mesh(box(0.3, 0.05, 0.3), mat(0x4a3628, { rough: 1 }), { pos: [x, 0.805, z], cast: false }));
      for (const [dx, dz] of [
        [-0.07, -0.06],
        [0.06, 0.05],
        [0.02, -0.08],
      ])
        g.add(mesh(cone(0.025, 0.08, 5), mat(0x7fb36a), { pos: [x + dx, 0.87, z + dz], cast: false }));
    }
  // The frame and the lamps.
  const frame = mat(0x3a3a3e, { metal: 0.5, rough: 0.4 });
  for (const [x, z] of [
    [-0.7, -0.7],
    [0.7, -0.7],
    [-0.7, 0.7],
    [0.7, 0.7],
  ])
    g.add(mesh(cyl(0.015, 0.015, 0.9, 6), frame, { pos: [LAMP_X + x, 1.23, LAMP_Z + z], cast: false }));
  g.add(mesh(box(1.45, 0.03, 1.45), frame, { pos: [LAMP_X, 1.68, LAMP_Z], cast: false }));
  const on = mat(0xfff1c8, { emissive: 0xffd27a, ei: 2.2 });
  const off = mat(0x6a645c, { rough: 0.5 });
  const bulbs = [];
  const glows = [];
  for (let i = 0; i < LN * LN; i++) {
    const x = LAMP_X - 0.54 + (i % LN) * 0.36;
    const z = LAMP_Z - 0.54 + Math.floor(i / LN) * 0.36;
    g.add(mesh(cone(0.07, 0.06, 10), frame, { pos: [x, 1.63, z], cast: false }));
    const b = mesh(sphere(0.04, 10, 8), off, { pos: [x, 1.58, z], cast: false });
    b.userData.dynamic = true;
    g.add(b);
    bulbs.push(b);
    const gl = glowSprite(0xffd27a, 0.32, 0.5);
    gl.position.set(x, 1.55, z);
    g.add(gl);
    glows.push(gl);
  }
  const draw = () => {
    for (let i = 0; i < LN * LN; i++) {
      const lit = pz.isOn(i);
      bulbs[i].material = lit ? on : off;
      glows[i].visible = lit;
    }
  };
  const hit = hitArea(1.5, 1.0, 1.5);
  hit.position.set(LAMP_X, 1.2, LAMP_Z);
  g.add(hit);
  ctx.interact.add(hit, { zones: [ROOM], puzzle: 'lamps', prompt: PROMPTS.lamps, onUse: () => lampsOverlay(ctx.game, pz) });
  pz.onChange((p, just) => {
    draw();
    if (just) ctx.audio.chime();
  });
  draw();
  return { sync: draw, anchor: new THREE.Vector3(LAMP_X, 1.2, LAMP_Z) };
}

// ------------------------------------------------- the tulip (the find)
// On a little round table in the middle: a bud, which opens once both
// puzzles are done.
function buildBloom(ctx, g) {
  const gs = ctx.gs;
  const X = 0.3;
  const Z = R.zN + 1.3;
  const t = table({ w: 0.7, d: 0.7, h: 0.7, round: true, wood: 'light' });
  t.position.set(X, 0, Z);
  g.add(t);
  ctx.collision.addCentered(X, Z, 0.75, 0.75);
  g.add(mesh(cyl(0.1, 0.08, 0.16, 14), mat(0xd99a6c), { pos: [X, 0.78, Z] }));
  const bud = group(
    [
      mesh(cyl(0.006, 0.006, 0.26, 6), mat(C.stem), { pos: [0, 0.13, 0] }),
      mesh(sphere(0.035, 10, 8), mat(0x7fa86a), { pos: [0, 0.28, 0], scale: [1, 1.6, 1] }),
    ],
    {
      pos: [X, 0.84, Z],
    },
  );
  bud.userData.dynamic = true;
  g.add(bud);
  const flower = tulip('B', { scale: 1.3, glow: 0.4 });
  const holder = group([flower], { pos: [X, 0.84, Z] });
  holder.userData.dynamic = true;
  g.add(holder);
  const glow = glowSprite(C.tulipBlue, 0.6, 0.45);
  glow.position.set(X, 1.15, Z);
  g.add(glow);
  const open = tween(
    ctx,
    (v) => {
      const k = smooth(v);
      holder.visible = v > 0;
      holder.scale.setScalar(0.3 + 0.7 * k);
      bud.visible = v < 0.5;
      glow.visible = v > 0 && !gs.hasFind('bloom');
    },
    1.6,
  );
  const done = () => gs.sideDone(ROOM);
  ctx.interact.add(holder, {
    zones: [ROOM],
    enabled: () => done(),
    prompt: () => (gs.hasFind('bloom') ? PROMPTS.bloomLook : PROMPTS.bloom),
    onUse: () => {
      if (foundIt(ctx, 'bloom', holder.getWorldPosition(new THREE.Vector3()).setY(1.1))) glow.visible = false;
    },
  });
  gs.on('sideSolved', ({ puzzle }) => {
    if (puzzle.room !== ROOM || !done()) return;
    setTimeout(() => {
      open.to = 1;
      ctx.audio.sparkle();
      ctx.hud.toast(TOASTS.bloom, { ms: 3200 });
    }, 1400);
  });
  return { sync: () => open.set(done() ? 1 : 0) };
}

// ----------------------------------------------------------- cosy bits
function buildCozy(ctx, g) {
  const ch = chair({ color: 0xe9e0d0, cushionColor: C.sage });
  ch.position.set(R.x1 - 0.7, 0, R.zS - 1.2);
  ch.rotation.y = -2.4;
  g.add(ch);
  ctx.collision.addCentered(R.x1 - 0.7, R.zS - 1.2, 0.5, 0.5);
  for (const [x, z, s] of [
    [R.x1 - 0.45, R.zN + 0.45, 1.3],
    [R.x0 + 0.45, R.zN + 0.45, 1.1],
    [R.x1 - 0.45, R.cz + 1.3, 0.9],
  ]) {
    const p = pottedPlant({ potColor: 0xc77b58, size: s, leaves: 12, leafColor: 0x4f7a4a });
    p.position.set(x, 0, z);
    g.add(p);
    ctx.collision.addCentered(x, z, 0.45, 0.45);
  }
  for (const [x, z] of [
    [-1.4, 32.6],
    [1.2, 35.6],
    [-1.0, 36.6],
  ]) {
    const hp = hangingPlant({ length: 0.5 });
    hp.position.set(x, 2.45, z);
    g.add(hp);
  }
  const lights = stringLights(
    [
      [0, R.h - 0.1, R.zN + 0.2],
      [0, R.h - 0.1, R.cz],
      [0, R.h - 0.1, R.zS - 0.2],
    ],
    { bulbs: 24, sag: 0.18 },
  );
  g.add(lights);
  ctx.addUpdate((dt, t) => lights.userData.twinkle(t));
}

export function buildGreenhouse(ctx) {
  const g = ctx.roomGroup(ROOM);
  buildShell(ctx, g);
  buildDoors(ctx, g);
  const bench = buildBench(ctx, g);
  const lamps = buildLamps(ctx, g);
  const bloom = buildBloom(ctx, g);
  buildCozy(ctx, g);
  return {
    index: ROOM,
    name: SIDE_ROOMS[ROOM].name,
    rig: {
      hemi: { sky: 0xbcd0ff, ground: 0x2e3a2c, intensity: 0.75 },
      spot: { pos: [0, R.h - 0.2, R.cz], target: [0, 0, R.cz - 0.5], color: 0xffe2b8, intensity: 18, angle: 1.2, penumbra: 0.9 },
      points: [
        { pos: [LAMP_X, 1.4, LAMP_Z], color: 0xffd27a, intensity: 2.2 },
        { pos: [BENCH_X + 0.6, 1.6, R.cz], color: 0xffd8a0, intensity: 1.8 },
        { pos: [0.3, 1.6, R.zN + 1.3], color: 0xb8c8ff, intensity: 1.4 },
      ],
      fog: { color: 0x1c2230, near: 8, far: 22 },
    },
    anchors: { water: bench.anchor, lamps: lamps.anchor },
    applyState() {
      bench.sync();
      lamps.sync();
      bloom.sync();
    },
  };
}
