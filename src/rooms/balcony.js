import * as THREE from 'three';
import { COLORS, PROMPTS, TOASTS, SIDE_ROOMS } from '../config.js';
import { BALCONY as R, BALCONY_ZONE, BALCONY_DOOR_Z, ROOMS } from '../engine/layout.js';
import { mat, mesh, group, rbox, box, cyl, sphere } from '../engine/materials.js';
import { woodPlanks, canvasTexture, makeCanvas } from '../engine/textures.js';
import { woodMat, hitArea, glowSprite, stringLights, pottedPlant, table, chair, blanket, mug, candle } from '../engine/props.js';
import { floorMesh } from './shell.js';
import { foundIt } from './cozy.js';
import { tween, skyDome, wallDoor, boxIn, smooth } from './side.js';
import { lanternsOverlay, pairsOverlay, drawPairsTable } from '../ui/overlays.js';
import { GN } from '../puzzles/lanterns.js';

// The balcony: through the glass doors in the study, out under the stars.
// A net of paper lanterns that draw a picture when lit right, a little table
// of star cards to match in pairs, and once both are done a last lantern
// waits on the railing for a wish: the little find.

const C = COLORS;
const ROOM = BALCONY_ZONE;
const STUDY = ROOMS[3];
export const BALCONY_ARRIVE = { x: 0, z: R.zS - 0.8, yaw: 0 };
const STUDY_ARRIVE = { x: STUDY.x1 - 1.0, z: BALCONY_DOOR_Z, yaw: Math.PI / 2 };
const NET = { z: R.zN + 0.9, y: 2.1, step: 0.38 };
const CARDS = { x: R.x1 - 1.2, z: R.cz + 0.2 };

// ------------------------------------------------------------- the deck
function buildShell(ctx, g) {
  g.add(floorMesh(R.w, R.d, mat(0xffffff, { map: woodPlanks(0x9c7456, { repeat: [3, 2] }), rough: 0.85 }), { x: 0, z: R.cz }));
  // The house wall behind (south), with warm windows either side of the door.
  const wall = mat(0xd9c2b0, { rough: 0.9 });
  g.add(mesh(box(R.w + 0.4, 3.4, 0.2), wall, { pos: [0, 1.7, R.zS + 0.1] }));
  for (const x of [-1.9, 1.9]) {
    g.add(mesh(box(0.9, 1.1, 0.02), mat(0xffd59a, { basic: true, opacity: 0.85, fog: false }), { pos: [x, 1.55, R.zS - 0.01], cast: false }));
    g.add(mesh(box(1.0, 0.06, 0.08), mat(C.cream), { pos: [x, 0.98, R.zS - 0.04] }));
  }
  // Railing on the other three sides.
  const rail = woodMat('light');
  const railRun = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const ry = Math.atan2(x1 - x0, z1 - z0);
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    g.add(mesh(rbox(0.08, 0.06, len, 0.015), rail, { pos: [cx, 1.0, cz], rot: [0, ry, 0] }));
    g.add(mesh(box(0.04, 0.04, len), rail, { pos: [cx, 0.12, cz], rot: [0, ry, 0], cast: false }));
    const n = Math.round(len / 0.16);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      g.add(mesh(box(0.03, 0.88, 0.03), rail, { pos: [x0 + (x1 - x0) * t, 0.56, z0 + (z1 - z0) * t], cast: false }));
    }
  };
  railRun(R.x0, R.zS, R.x0, R.zN);
  railRun(R.x0, R.zN, R.x1, R.zN);
  railRun(R.x1, R.zN, R.x1, R.zS);
  skyDome(g, [0, -6, R.cz - 6]);
  // A moon low over the railing.
  const moon = mesh(new THREE.CircleGeometry(2.2, 32), mat(0xf6ecc8, { basic: true, fog: false }), { pos: [-9, 9, R.zN - 26], cast: false });
  moon.lookAt(0, 1.6, R.cz);
  g.add(moon);
  const mg = glowSprite(0xf6ecc8, 9, 0.25);
  mg.position.copy(moon.position);
  g.add(mg);
  boxIn(ctx, R);
}

// --------------------------------------------------------------- doors
function buildDoors(ctx, g) {
  const into = wallDoor(ctx, 3, {
    pos: [STUDY.x1 - 0.02, 0, BALCONY_DOOR_Z],
    facing: -Math.PI / 2,
    w: 1.3,
    double: true,
    glass: true,
    glow: 0x7f92d8,
    prompt: PROMPTS.balconyOut,
    onUse: () => ctx.game.travel(BALCONY_ARRIVE.x, BALCONY_ARRIVE.z, BALCONY_ARRIVE.yaw),
  });
  ctx.roomGroup(3).add(into);
  // The study's desk chair stands near; keep the doorway clear of nothing else.
  const out = wallDoor(ctx, ROOM, {
    pos: [0, 0, R.zS - 0.01],
    facing: Math.PI,
    w: 1.3,
    double: true,
    glass: true,
    glow: 0xffd59a,
    prompt: PROMPTS.balconyIn,
    onUse: () => ctx.game.travel(STUDY_ARRIVE.x, STUDY_ARRIVE.z, STUDY_ARRIVE.yaw),
  });
  g.add(out);
}

// ------------------------------------------------------- the lantern net
// Two posts by the north railing hold a 5×5 net of paper lanterns.
function buildLanterns(ctx, g) {
  const gs = ctx.gs;
  const pz = gs.puzzles.lanterns;
  const half = ((GN - 1) * NET.step) / 2;
  const wood = woodMat('dark');
  for (const sx of [-1, 1]) g.add(mesh(cyl(0.04, 0.04, NET.y + 0.5, 8), wood, { pos: [sx * (half + 0.35), (NET.y + 0.5) / 2, NET.z] }));
  g.add(mesh(cyl(0.02, 0.02, 2 * half + 0.7, 6), wood, { pos: [0, NET.y + 0.35, NET.z], rot: [0, 0, Math.PI / 2], cast: false }));
  ctx.collision.addCentered(-(half + 0.35), NET.z, 0.2, 0.2);
  ctx.collision.addCentered(half + 0.35, NET.z, 0.2, 0.2);
  const lit = [0xffc46b, 0xff9fb0, 0xfff0c0, 0x9fc4ff].map((c) => mat(0xfff4e0, { emissive: c, ei: 1.8 }));
  const dark = mat(0x8a7f74, { rough: 0.8 });
  const lanterns = [];
  const glows = [];
  for (let r = 0; r < GN; r++)
    for (let c = 0; c < GN; c++) {
      const x = -half + c * NET.step;
      const y = NET.y - r * NET.step;
      g.add(mesh(cyl(0.004, 0.004, NET.step, 4), mat(0x3a3030), { pos: [x, y + NET.step / 2, NET.z], cast: false }));
      const l = mesh(sphere(0.09, 12, 8), dark, { pos: [x, y, NET.z], scale: [1, 1.25, 1], cast: false });
      l.userData.dynamic = true;
      g.add(l);
      lanterns.push(l);
      const gl = glowSprite(0xffd38a, 0.45, 0.5);
      gl.position.set(x, y, NET.z + 0.02);
      g.add(gl);
      glows.push(gl);
    }
  const draw = () => {
    for (let i = 0; i < GN * GN; i++) {
      const on = pz.lit[i] || (pz.isSolved() && pz.target[i]);
      lanterns[i].material = on ? lit[i % lit.length] : dark;
      glows[i].visible = !!on;
    }
  };
  const hit = hitArea(2 * half + 0.6, 2 * half + 0.6, 0.4);
  hit.position.set(0, NET.y - half, NET.z);
  g.add(hit);
  ctx.interact.add(hit, { zones: [ROOM], puzzle: 'lanterns', prompt: PROMPTS.lanterns, onUse: () => lanternsOverlay(ctx.game, pz) });
  pz.onChange((p, just) => {
    draw();
    if (just) ctx.audio.chime();
  });
  draw();
  return { sync: draw, anchor: new THREE.Vector3(0, NET.y - half, NET.z + 0.4) };
}

// ------------------------------------------------- the star-card table
function buildCards(ctx, g) {
  const gs = ctx.gs;
  const pz = gs.puzzles.pairs;
  const t = table({ w: 0.9, d: 0.9, h: 0.72, round: true, wood: 'light' });
  t.position.set(CARDS.x, 0, CARDS.z);
  g.add(t);
  ctx.collision.addCentered(CARDS.x, CARDS.z, 0.95, 0.95);
  const c = makeCanvas(256, 192);
  const tex = canvasTexture(c);
  const top = mesh(box(0.6, 0.004, 0.45), mat(0xffffff, { map: tex, rough: 0.8 }), { pos: [CARDS.x, 0.745, CARDS.z], cast: false });
  top.userData.dynamic = true;
  g.add(top);
  const draw = () => {
    drawPairsTable(c.getContext('2d'), pz, 256, 192);
    tex.needsUpdate = true;
  };
  for (const [dx, ry] of [
    [-0.75, Math.PI / 2],
    [0.0, Math.PI],
  ]) {
    const ch = chair({ color: 0xe9e0d0, cushionColor: C.blush });
    const z = dx ? CARDS.z : CARDS.z + 0.75;
    ch.position.set(CARDS.x + dx, 0, z);
    ch.rotation.y = ry;
    g.add(ch);
    ctx.collision.addCentered(CARDS.x + dx, z, 0.46, 0.46);
  }
  const m = mug(C.sage, { steam: true });
  m.position.set(CARDS.x + 0.32, 0.745, CARDS.z - 0.25);
  g.add(m);
  const cd = candle({ h: 0.1 });
  cd.position.set(CARDS.x - 0.3, 0.745, CARDS.z - 0.28);
  g.add(cd);
  ctx.interact.add(top, { zones: [ROOM], puzzle: 'pairs', prompt: PROMPTS.pairs, onUse: () => pairsOverlay(ctx.game, pz) });
  pz.onChange((p, just) => {
    draw();
    if (just) ctx.audio.chime();
  });
  draw();
  return { sync: draw, anchor: new THREE.Vector3(CARDS.x, 0.9, CARDS.z) };
}

// ------------------------------------------- the wish lantern (the find)
function buildWish(ctx, g) {
  const gs = ctx.gs;
  const X = R.x0 + 0.35;
  const Z = R.cz;
  const lan = group([mesh(cyl(0.11, 0.08, 0.26, 12, 1), mat(0xfff0d8, { emissive: 0xff9a5a, ei: 1.6 }), { pos: [0, 0.13, 0] })], {
    pos: [X, 1.04, Z],
  });
  lan.userData.dynamic = true;
  g.add(lan);
  const glow = glowSprite(0xffa060, 0.9, 0.6);
  lan.add(glow);
  glow.position.set(0, 0.13, 0);
  const rise = tween(
    ctx,
    (v) => {
      const k = smooth(v);
      lan.position.set(X - k * 6, 1.04 + k * 14, Z - k * 10);
      lan.visible = gs.sideDone(ROOM) && v < 1;
    },
    9,
  );
  const done = () => gs.sideDone(ROOM);
  ctx.interact.add(lan, {
    zones: [ROOM],
    enabled: () => done() && rise.v === 0,
    prompt: PROMPTS.wish,
    onUse: () => {
      foundIt(ctx, 'wish', lan.getWorldPosition(new THREE.Vector3()));
      rise.to = 1;
    },
  });
  const show = () => rise.set(gs.hasFind('wish') ? 1 : 0);
  gs.on('sideSolved', ({ puzzle }) => {
    if (puzzle.room !== ROOM || !done()) return;
    setTimeout(() => {
      show();
      ctx.audio.sparkle();
      ctx.hud.toast(TOASTS.wish, { ms: 3000 });
    }, 1500);
  });
  return { sync: show };
}

// ----------------------------------------------------------- cosy bits
function buildCozy(ctx, g) {
  for (const [x, z, s] of [
    [R.x0 + 0.4, R.zS - 0.5, 1.1],
    [R.x1 - 0.4, R.zS - 0.5, 0.9],
    [R.x0 + 0.4, R.zN + 0.4, 0.8],
  ]) {
    const p = pottedPlant({ potColor: C.blushDeep, size: s, leaves: 10, leafColor: C.sageDeep });
    p.position.set(x, 0, z);
    g.add(p);
    ctx.collision.addCentered(x, z, 0.45, 0.45);
  }
  const bl = blanket(0.7, 0.5, C.sage, C.cream);
  bl.position.set(CARDS.x - 0.75, 0.47, CARDS.z);
  bl.rotation.y = Math.PI / 2;
  g.add(bl);
  const lights = stringLights(
    [
      [R.x0 + 0.05, 2.6, R.zS - 0.1],
      [R.x0 + 0.05, 2.3, R.cz],
      [R.x0 + 0.05, 2.5, R.zN + 0.1],
      [0, 2.3, R.zN + 0.1],
      [R.x1 - 0.05, 2.5, R.zN + 0.1],
      [R.x1 - 0.05, 2.6, R.zS - 0.1],
    ],
    { bulbs: 48, sag: 0.18 },
  );
  g.add(lights);
  ctx.addUpdate((dt, t) => lights.userData.twinkle(t));
}

export function buildBalcony(ctx) {
  const g = ctx.roomGroup(ROOM);
  buildShell(ctx, g);
  buildDoors(ctx, g);
  const lanterns = buildLanterns(ctx, g);
  const cards = buildCards(ctx, g);
  const wish = buildWish(ctx, g);
  buildCozy(ctx, g);
  return {
    index: ROOM,
    name: SIDE_ROOMS[ROOM].name,
    rig: {
      hemi: { sky: 0x8fa2e0, ground: 0x2a2030, intensity: 0.55 },
      spot: { pos: [-6, 12, R.cz - 8], target: [0, 0, R.cz], color: 0xaebeff, intensity: 120, angle: 0.6, penumbra: 0.5, far: 40 },
      points: [
        { pos: [0, 1.7, NET.z + 0.5], color: 0xffc98a, intensity: 2.2 },
        { pos: [CARDS.x, 1.3, CARDS.z], color: 0xffd38a, intensity: 1.8 },
        { pos: [0, 2.0, R.zS - 0.6], color: 0xffd59a, intensity: 1.6 },
      ],
      fog: { color: 0x141a30, near: 10, far: 40 },
    },
    anchors: { lanterns: lanterns.anchor, pairs: cards.anchor },
    applyState() {
      lanterns.sync();
      cards.sync();
      wish.sync();
    },
  };
}
