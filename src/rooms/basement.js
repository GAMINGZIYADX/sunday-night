import * as THREE from 'three';
import { COLORS, PROMPTS, TOASTS, SIDE_ROOMS } from '../config.js';
import { BASEMENT as R, BASEMENT_ZONE, CELLAR_HATCH as H } from '../engine/layout.js';
import { mat, mesh, group, rbox, box, cyl, sphere, cone, capsule, torus } from '../engine/materials.js';
import { brick, woodPlanks, canvasTexture, makeCanvas, rug } from '../engine/textures.js';
import { woodMat, hitArea, glowSprite, pendantLamp, cardboardBox, jar, rugMesh, armchair, blanket, wallShelf } from '../engine/props.js';
import { floorMesh } from './shell.js';
import { foundIt } from './cozy.js';
import { tween, boxIn, smooth } from './side.js';
import { fusesOverlay, pipesOverlay, drawPipes } from '../ui/overlays.js';
import { FN } from '../puzzles/fuses.js';

// The basement: down the hatch in the kitchen floor. It is dark at first.
// The fuse box wants its switches set by the rules on its card (then the
// lights come on); the pipe board wants water led from the tap to the boiler.
// With both done, a little wind-up cat turns up behind the boiler.

const C = COLORS;
const ROOM = BASEMENT_ZONE;
const STAIRS = { x0: R.x0 + 0.05, x1: R.x0 + 1.1, z0: R.zS - 3.6, z1: R.zS - 0.05 };
export const BASEMENT_ARRIVE = { x: (STAIRS.x0 + STAIRS.x1) / 2 + 0.3, z: STAIRS.z0 - 0.6, yaw: 0 };
const KITCHEN_ARRIVE = { x: H.x1 + 0.55, z: (H.z0 + H.z1) / 2, yaw: -Math.PI / 2 };
const FUSE = { x: R.x1 - 0.06, y: 1.35, z: R.cz + 1.2 };
const BOARD = { x: -0.7, y: 1.3, z: R.zN + 0.06 };
const BOILER = { x: R.x1 - 0.75, z: R.zN + 0.7 };

// ------------------------------------------------- the hatch in the kitchen
// A wooden trapdoor in the floor. Lifted once, it stays open (saved).
function buildHatch(ctx) {
  const g = ctx.roomGroup(2);
  const gs = ctx.gs;
  const w = H.x1 - H.x0;
  const d = H.z1 - H.z0;
  const cx = (H.x0 + H.x1) / 2;
  const cz = (H.z0 + H.z1) / 2;
  const trim = woodMat('dark');
  g.add(mesh(box(w + 0.1, 0.012, 0.05), trim, { pos: [cx, 0.006, H.z0 - 0.025], cast: false }));
  g.add(mesh(box(w + 0.1, 0.012, 0.05), trim, { pos: [cx, 0.006, H.z1 + 0.025], cast: false }));
  g.add(mesh(box(0.05, 0.012, d), trim, { pos: [H.x0 - 0.025, 0.006, cz], cast: false }));
  g.add(mesh(box(0.05, 0.012, d), trim, { pos: [H.x1 + 0.025, 0.006, cz], cast: false }));
  // The dark hole and the top steps, shown once the hatch is up.
  const hole = group(
    [
      mesh(box(w, 0.004, d), mat(0x0d0a0c, { basic: true }), { pos: [cx, 0.004, cz], cast: false, receive: false }),
      mesh(box(w - 0.1, 0.006, 0.2), woodMat('mid'), { pos: [cx, 0.008, H.z0 + 0.15], cast: false }),
    ],
    {},
  );
  hole.userData.dynamic = true;
  g.add(hole);
  // The door hinges on its west edge and swings up.
  const hinge = group([], { pos: [H.x0, 0.01, cz] });
  hinge.userData.dynamic = true;
  const door = group([mesh(rbox(w, 0.04, d, 0.01), mat(0xffffff, { map: woodPlanks(0x9a6b4a, { repeat: [1, 1] }) }), { pos: [w / 2, 0.02, 0] })]);
  door.add(mesh(torus(0.05, 0.01, 6, 14), mat(0x5a4636, { metal: 0.6 }), { pos: [w - 0.12, 0.05, 0], rot: [Math.PI / 2, 0, 0], cast: false }));
  hinge.add(door);
  g.add(hinge);
  const blocker = ctx.collision.add(H.x0, H.z0, H.x1, H.z1, 'hatch');
  blocker.enabled = false;
  const anim = tween(
    ctx,
    (v) => {
      hinge.rotation.z = 1.75 * smooth(v);
      hole.visible = v > 0.05;
      blocker.enabled = v > 0;
    },
    1.1,
  );
  const hit = hitArea(w, 0.25, d);
  hit.position.set(cx, 0.1, cz);
  g.add(hit);
  ctx.interact.add(hit, {
    zones: [2],
    prompt: () => (gs.data.cellar ? PROMPTS.cellarDown : PROMPTS.cellarOpen),
    enabled: () => !gs.data.cellar || anim.v === 1,
    onUse: () => {
      if (gs.openCellar()) {
        ctx.audio.doorOpen?.();
        anim.to = 1;
        ctx.hud.toast(TOASTS.cellar, { ms: 2800 });
        return;
      }
      ctx.game.travel(BASEMENT_ARRIVE.x, BASEMENT_ARRIVE.z, BASEMENT_ARRIVE.yaw);
    },
  });
  return { sync: () => anim.set(gs.data.cellar ? 1 : 0) };
}

// ------------------------------------------------------------- the room
function buildShell(ctx, g) {
  g.add(floorMesh(R.w, R.d, mat(0xffffff, { map: woodPlanks(0x7a5a44, { repeat: [3, 3] }), rough: 0.9 }), { x: 0, z: R.cz }));
  const wallMat = mat(0xffffff, { map: brick(0xa58a7a, [5, 2]), rough: 0.95 });
  const wallMatZ = mat(0xffffff, { map: brick(0xa58a7a, [5, 2]), rough: 0.95 });
  g.add(mesh(box(R.w, R.h, 0.1), wallMat, { pos: [0, R.h / 2, R.zN - 0.05] }));
  g.add(mesh(box(R.w, R.h, 0.1), wallMat, { pos: [0, R.h / 2, R.zS + 0.05] }));
  g.add(mesh(box(0.1, R.h, R.d), wallMatZ, { pos: [R.x0 - 0.05, R.h / 2, R.cz] }));
  g.add(mesh(box(0.1, R.h, R.d), wallMatZ, { pos: [R.x1 + 0.05, R.h / 2, R.cz] }));
  // A plank ceiling on beams, with the opening over the stairs.
  const ceil = mat(0xffffff, { map: woodPlanks(0x8a6a50, { repeat: [3, 1] }), rough: 0.9 });
  g.add(mesh(box(R.w - (STAIRS.x1 - R.x0), 0.05, R.d), ceil, { pos: [(STAIRS.x1 + R.x1) / 2, R.h + 0.025, R.cz], cast: false }));
  g.add(
    mesh(box(STAIRS.x1 - R.x0, 0.05, STAIRS.z0 - R.zN), ceil, { pos: [(R.x0 + STAIRS.x1) / 2, R.h + 0.025, (R.zN + STAIRS.z0) / 2], cast: false }),
  );
  const beam = woodMat('dark');
  for (let z = R.zN + 0.8; z < R.zS; z += 1.4) g.add(mesh(box(R.w, 0.14, 0.12), beam, { pos: [0, R.h - 0.07, z], cast: false }));
  // The stairs up, along the west wall, rising to the south.
  const n = 8;
  const run = (STAIRS.z1 - STAIRS.z0) / n;
  const rise = R.h / n;
  for (let i = 0; i < n; i++) {
    g.add(
      mesh(box(STAIRS.x1 - STAIRS.x0, rise * (i + 1), run), woodMat('mid'), {
        pos: [(STAIRS.x0 + STAIRS.x1) / 2, (rise * (i + 1)) / 2, STAIRS.z0 + run * (i + 0.5)],
      }),
    );
  }
  // Warm light from the kitchen comes down the stairs.
  const up = mesh(box(STAIRS.x1 - STAIRS.x0, 0.6, 1.2), mat(0x6e5040, { emissive: 0xffc48a, ei: 0.5, side: THREE.BackSide }), {
    pos: [(STAIRS.x0 + STAIRS.x1) / 2, R.h + 0.3, STAIRS.z1 - 0.6],
    cast: false,
    receive: false,
  });
  g.add(up);
  ctx.collision.add(STAIRS.x0, STAIRS.z0, STAIRS.x1 + 0.05, STAIRS.z1, 'stairs');
  const stairsHit = hitArea(STAIRS.x1 - STAIRS.x0, 1.4, 1.6);
  stairsHit.position.set((STAIRS.x0 + STAIRS.x1) / 2, 0.9, STAIRS.z0 + 0.8);
  g.add(stairsHit);
  ctx.interact.add(stairsHit, {
    zones: [ROOM],
    highlight: false,
    prompt: PROMPTS.cellarUp,
    onUse: () => ctx.game.travel(KITCHEN_ARRIVE.x, KITCHEN_ARRIVE.z, KITCHEN_ARRIVE.yaw),
  });
  boxIn(ctx, R);
}

// --------------------------------------------------------- the fuse box
// A metal box on the east wall, door open: five switches, the main lever,
// and the card of rules taped inside the door.
function buildFuses(ctx, g, setLit) {
  const gs = ctx.gs;
  const pz = gs.puzzles.fuses;
  const box0 = group([], { pos: [FUSE.x, FUSE.y, FUSE.z], rot: [0, -Math.PI / 2, 0] });
  const metal = mat(0x7d858c, { metal: 0.5, rough: 0.45 });
  box0.add(mesh(rbox(0.75, 0.6, 0.12, 0.015), metal, { pos: [0, 0, 0.06] }));
  box0.add(mesh(rbox(0.7, 0.55, 0.01, 0.01), mat(0x2c2f33, { rough: 0.6 }), { pos: [0, 0, 0.125], cast: false }));
  // The open door, swung to the left, with the card.
  const door = group([mesh(rbox(0.75, 0.6, 0.02, 0.01), metal, { pos: [-0.375, 0, 0] })], { pos: [-0.375, 0, 0.13], rot: [0, -1.9, 0] });
  door.add(mesh(box(0.42, 0.3, 0.003), mat(0xfbf3e4), { pos: [-0.38, 0.02, 0.012], cast: false }));
  box0.add(door);
  const toggles = [];
  for (let i = 0; i < FN; i++) {
    const x = -0.24 + i * 0.12;
    box0.add(mesh(rbox(0.07, 0.14, 0.03, 0.008), mat(0x1c1e21), { pos: [x, 0.08, 0.14], cast: false }));
    const t = mesh(box(0.025, 0.06, 0.04), mat(0xe9e2d6, { rough: 0.4 }), { pos: [x, 0.08, 0.17], cast: false });
    t.userData.dynamic = true;
    box0.add(t);
    toggles.push(t);
  }
  const lever = group([mesh(cyl(0.015, 0.015, 0.22, 8), mat(0xc0392b), { pos: [0, 0.11, 0] })], { pos: [0.27, -0.17, 0.15] });
  lever.userData.dynamic = true;
  box0.add(lever);
  const lamp = mesh(sphere(0.02, 8, 6), mat(0x55ff88, { emissive: 0x33ff66, ei: 0, unique: true }), { pos: [0.27, 0.2, 0.14], cast: false });
  lamp.userData.dynamic = true;
  box0.add(lamp);
  g.add(box0);
  ctx.collision.add(FUSE.x - 0.25, FUSE.z - 0.5, R.x1, FUSE.z + 0.5, 'fusebox');
  const draw = () => {
    for (let i = 0; i < FN; i++) toggles[i].rotation.x = pz.isOn(i) ? -0.5 : 0.5;
    lever.rotation.x = pz.isSolved() ? -2.4 : 0;
    lamp.material.emissiveIntensity = pz.isSolved() ? 2 : 0;
  };
  ctx.interact.add(box0, {
    zones: [ROOM],
    puzzle: 'fuses',
    prompt: PROMPTS.fuses,
    onUse: () => {
      gs.readClue('fuseCard');
      fusesOverlay(ctx.game, pz);
    },
  });
  pz.onChange((p, just) => {
    draw();
    if (just) {
      ctx.audio.keyTurn?.();
      setTimeout(() => setLit(true), 600);
    }
  });
  draw();
  return { sync: draw, anchor: new THREE.Vector3(FUSE.x - 0.2, FUSE.y, FUSE.z) };
}

// ---------------------------------------- the pipe board and the boiler
// A board on the north wall shows the pipes (drawn from the puzzle); the tap
// on its left, the boiler to its right.
function buildPipes(ctx, g) {
  const gs = ctx.gs;
  const pz = gs.puzzles.pipes;
  const c = makeCanvas(256, 256);
  const tex = canvasTexture(c);
  const board = group([], { pos: [BOARD.x, BOARD.y, BOARD.z] });
  board.add(mesh(rbox(1.3, 1.3, 0.04, 0.01), woodMat('light'), { pos: [0, 0, 0.02] }));
  const face = mesh(box(1.2, 1.2, 0.005), mat(0xffffff, { map: tex, rough: 0.8 }), { pos: [0, 0, 0.045], cast: false });
  face.userData.dynamic = true;
  board.add(face);
  // The tap (a red wheel) and a pipe to the boiler.
  board.add(mesh(torus(0.08, 0.018, 6, 16), mat(0xc0392b, { metal: 0.3 }), { pos: [-0.78, 0, 0.08], cast: false }));
  board.add(mesh(cyl(0.03, 0.03, 0.3, 8), mat(0xb87333, { metal: 0.6, rough: 0.35 }), { pos: [-0.78, -0.2, 0.06], cast: false }));
  g.add(board);
  const copper = mat(0xb87333, { metal: 0.6, rough: 0.35 });
  g.add(
    mesh(cyl(0.035, 0.035, BOILER.x - BOARD.x - 0.95, 8), copper, {
      pos: [(BOARD.x + 0.65 + BOILER.x - 0.3) / 2, BOARD.y, R.zN + 0.12],
      rot: [0, 0, Math.PI / 2],
      cast: false,
    }),
  );
  const boiler = group(
    [
      mesh(cyl(0.42, 0.42, 1.7, 20), mat(0xd9d2c4, { metal: 0.3, rough: 0.4 }), { pos: [0, 0.85, 0] }),
      mesh(sphere(0.42, 20, 10), mat(0xd9d2c4, { metal: 0.3, rough: 0.4 }), { pos: [0, 1.7, 0], scale: [1, 0.4, 1] }),
      mesh(cyl(0.12, 0.12, 0.02, 16), mat(0xffffff), { pos: [0, 1.15, 0.42], rot: [Math.PI / 2, 0, 0], cast: false }),
    ],
    { pos: [BOILER.x, 0, BOILER.z] },
  );
  const flame = mesh(sphere(0.05, 8, 6), mat(0x66aaff, { emissive: 0x3388ff, ei: 0, unique: true }), { pos: [0, 0.35, 0.43], cast: false });
  flame.userData.dynamic = true;
  boiler.add(flame);
  g.add(boiler);
  ctx.collision.addCentered(BOILER.x, BOILER.z, 0.95, 0.95);
  const draw = () => {
    drawPipes(c.getContext('2d'), pz, 256, { wet: pz.wet() });
    tex.needsUpdate = true;
    flame.material.emissiveIntensity = pz.isSolved() ? 2.5 : 0;
  };
  ctx.interact.add(board, { zones: [ROOM], puzzle: 'pipes', prompt: PROMPTS.pipes, onUse: () => pipesOverlay(ctx.game, pz) });
  pz.onChange((p, just) => {
    draw();
    if (just) ctx.audio.chime();
  });
  draw();
  return { sync: draw, anchor: new THREE.Vector3(BOARD.x, BOARD.y, BOARD.z + 0.3) };
}

// --------------------------------------------- the wind-up cat (the find)
function windupCat() {
  const body = mat(0xd9b45a, { metal: 0.5, rough: 0.35 });
  const cat = group([
    mesh(capsule(0.05, 0.1, 4, 8), body, { pos: [0, 0.07, 0], rot: [Math.PI / 2, 0, 0] }),
    mesh(sphere(0.055, 12, 10), body, { pos: [0, 0.12, -0.1] }),
    mesh(cone(0.02, 0.04, 4), body, { pos: [-0.03, 0.18, -0.1] }),
    mesh(cone(0.02, 0.04, 4), body, { pos: [0.03, 0.18, -0.1] }),
    mesh(cyl(0.008, 0.008, 0.12, 6), body, { pos: [0, 0.12, 0.11], rot: [0.9, 0, 0] }),
    mesh(cyl(0.005, 0.005, 0.06, 6), mat(0x8a7a6a, { metal: 0.6 }), { pos: [0.07, 0.08, 0.02], rot: [0, 0, Math.PI / 2] }),
    mesh(box(0.012, 0.05, 0.03), mat(0x8a7a6a, { metal: 0.6 }), { pos: [0.1, 0.08, 0.02] }),
  ]);
  return cat;
}
function buildWindup(ctx, g) {
  const gs = ctx.gs;
  const cat = windupCat();
  const holder = group([cat], { pos: [BOILER.x - 0.75, 0, BOILER.z + 0.15], rot: [0, 0.6, 0] });
  holder.userData.dynamic = true;
  g.add(holder);
  const glow = glowSprite(C.lamp, 0.5, 0.45);
  glow.position.set(BOILER.x - 0.75, 0.2, BOILER.z + 0.15);
  g.add(glow);
  let spin = 0;
  ctx.addUpdate((dt) => {
    if (spin <= 0) return;
    spin -= dt;
    holder.rotation.y += dt * 3;
    cat.position.y = Math.abs(Math.sin(spin * 18)) * 0.01;
  });
  const done = () => gs.sideDone(ROOM);
  ctx.interact.add(holder, {
    zones: [ROOM],
    enabled: () => done(),
    prompt: () => (gs.hasFind('windup') ? PROMPTS.windupLook : PROMPTS.windup),
    onUse: () => {
      foundIt(ctx, 'windup', holder.getWorldPosition(new THREE.Vector3()).setY(0.3));
      glow.visible = false;
      spin = 2.5;
      ctx.audio.click();
    },
  });
  const show = () => {
    holder.visible = done();
    glow.visible = done() && !gs.hasFind('windup');
  };
  gs.on('sideSolved', ({ puzzle }) => {
    if (puzzle.room !== ROOM || !done()) return;
    setTimeout(() => {
      show();
      ctx.audio.sparkle();
      ctx.hud.toast(TOASTS.windup, { ms: 3000 });
    }, 1500);
  });
  return { sync: show };
}

// ----------------------------------------------------------- cosy bits
function buildCozy(ctx, g) {
  for (const z of [R.cz - 0.6, R.cz + 0.5]) {
    const sh = wallShelf(1.3, { wood: 'dark' });
    sh.position.set(R.x0 + 0.13, z === R.cz - 0.6 ? 1.2 : 1.65, R.zN + 1.2);
    sh.rotation.y = Math.PI / 2;
    g.add(sh);
  }
  for (let i = 0; i < 5; i++) {
    const j = jar([0xe8c48a, 0xd9826a, 0xb7c98a, 0xe8c48a, 0xc9a0d0][i], 0.14 + (i % 2) * 0.04);
    j.position.set(R.x0 + 0.2, 1.21, R.zN + 0.75 + i * 0.22);
    g.add(j);
  }
  for (const [x, z, w, h, d, ry] of [
    [R.x0 + 0.4, R.zN + 0.45, 0.6, 0.45, 0.5, 0.1],
    [R.x0 + 1.0, R.zN + 0.4, 0.5, 0.35, 0.45, -0.2],
    [R.x0 + 0.45, R.zN + 0.45, 0.45, 0.3, 0.4, 0.4],
  ]) {
    const b = cardboardBox({ w, h, d, open: false });
    b.position.set(x, x === R.x0 + 0.45 ? 0.45 : 0, z);
    b.rotation.y = ry;
    g.add(b);
  }
  ctx.collision.add(R.x0, R.zN, R.x0 + 1.3, R.zN + 0.75, 'boxes');
  const rg = rugMesh(rug(0x8a6a5a, C.blushDeep, C.cream), 2.0, 2.6);
  rg.position.set(0.4, 0.006, R.cz + 0.6);
  g.add(rg);
  const chair = armchair({ color: 0x8a7a6a, cushionColor: C.blush });
  chair.position.set(0.6, 0, R.zS - 0.8);
  chair.rotation.y = Math.PI;
  g.add(chair);
  ctx.collision.addCentered(0.6, R.zS - 0.8, 0.95, 0.95);
  const bl = blanket(0.6, 0.45, C.blushDeep, C.cream);
  bl.position.set(0.6, 0.62, R.zS - 0.85);
  bl.rotation.set(0, Math.PI, 0.2);
  g.add(bl);
}

export function buildBasement(ctx) {
  const g = ctx.roomGroup(ROOM);
  const hatch = buildHatch(ctx);
  buildShell(ctx, g);
  // Bare bulbs: dim until the fuse box is fixed.
  const bulbs = [-1.2, 1.2].map((x) => {
    const b = pendantLamp({ drop: 0.3, color: 0xe9e2d6 });
    b.position.set(x, R.h, R.cz);
    g.add(b);
    const gl = glowSprite(C.lamp, 1.0, 0.35);
    gl.position.set(x, R.h - 0.45, R.cz);
    g.add(gl);
    return gl;
  });
  const rigs = {
    dark: {
      hemi: { sky: 0x5a5470, ground: 0x1a1414, intensity: 0.32 },
      spot: {
        pos: [(STAIRS.x0 + STAIRS.x1) / 2, R.h + 0.2, STAIRS.z1 - 0.4],
        target: [0, 0, R.cz],
        color: 0xffc48a,
        intensity: 9,
        angle: 1.0,
        penumbra: 0.9,
      },
      points: [
        { pos: [FUSE.x - 0.4, FUSE.y, FUSE.z], color: 0xa0b8ff, intensity: 0.9 },
        { pos: [BOARD.x, 1.6, R.zN + 0.6], color: 0xa0b8ff, intensity: 0.7 },
        { pos: [0, 1.0, R.cz], color: 0xffb070, intensity: 0.4 },
      ],
      fog: { color: 0x0e0b0d, near: 4, far: 13 },
    },
    lit: {
      hemi: { sky: 0xffe0c0, ground: 0x2a201c, intensity: 0.6 },
      spot: { pos: [0, R.h - 0.1, R.cz], target: [0, 0, R.cz], color: 0xffd6a0, intensity: 16, angle: 1.25, penumbra: 0.85 },
      points: [
        { pos: [-1.2, R.h - 0.5, R.cz], color: 0xffd38a, intensity: 2.2 },
        { pos: [1.2, R.h - 0.5, R.cz], color: 0xffd38a, intensity: 2.2 },
        { pos: [BOILER.x - 0.5, 0.6, BOILER.z + 0.6], color: 0x88aaff, intensity: 0.9 },
      ],
      fog: { color: 0x1c1416, near: 7, far: 18 },
    },
  };
  const room = {
    index: ROOM,
    name: SIDE_ROOMS[ROOM].name,
    rig: rigs.dark,
    anchors: {},
  };
  const setLit = (on, quiet) => {
    room.rig = on ? rigs.lit : rigs.dark;
    for (const gl of bulbs) gl.visible = on;
    if (!quiet && ctx.playerZone() === ROOM) {
      ctx.game.lights.transition(room.rig);
      ctx.hud.toast(TOASTS.basementLit, { ms: 2800 });
    }
  };
  const fuses = buildFuses(ctx, g, setLit);
  const pipes = buildPipes(ctx, g);
  const windup = buildWindup(ctx, g);
  buildCozy(ctx, g);
  room.anchors = { fuses: fuses.anchor, pipes: pipes.anchor };
  room.applyState = () => {
    hatch.sync();
    fuses.sync();
    pipes.sync();
    windup.sync();
    setLit(ctx.gs.puzzles.fuses.isSolved(), true);
  };
  return room;
}
