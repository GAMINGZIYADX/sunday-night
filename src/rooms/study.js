import * as THREE from 'three';
import { COLORS, UI, CATS, HIDING_SPOTS } from '../config.js';
import { mat, mesh, group, rbox, box, cyl, sphere, plane, torus } from '../engine/materials.js';
import { fabric, rug, nightSky, canvasTexture, makeCanvas } from '../engine/textures.js';
import {
  woodMat,
  tableLamp,
  floorLamp,
  stringLights,
  rugMesh,
  cushion,
  curtain,
  blanket,
  mug,
  bookshelf,
  pottedPlant,
  windowFrame,
  armchair,
  table,
  chair,
  cardboardBox,
  clock,
  candle,
  vaseWithTulips,
  bookRow,
} from '../engine/props.js';
import { buildRoomShell } from './shell.js';
import { Door } from './door.js';
import { lampSwitch, pressedFlowerBook, spinningGlobe, globeTexture } from './cozy.js';
import { drawChalkboard } from './art.js';
import { sudokuOverlay } from '../ui/overlays.js';
import { ROOMS } from '../engine/layout.js';
import { PROMPTS, TOASTS } from '../config.js';
import { placeNote } from './notes.js';
import { fill } from '../engine/text.js';

const C = COLORS;

export function buildStudy(ctx) {
  const ROOM = 3;
  const R = ROOMS[ROOM];
  const g = ctx.roomGroup(ROOM);
  const col = ctx.collision;
  const gs = ctx.gs;
  buildRoomShell(ctx, ROOM, { wall: 0xdfe6d4, wallAccent: C.cream, pattern: 'dots', lower: C.woodLight, floor: C.woodDark });
  const cz = R.cz;

  // ------------------------------------------------------------------ desk
  const dx = R.x1 - 0.36;
  const desk = group([], { pos: [dx, 0, cz] });
  const dm = woodMat('mid');
  desk.add(mesh(rbox(0.72, 0.05, 1.6, 0.015), dm, { pos: [0, 0.75, 0] }));
  for (const z of [-0.76, 0.76]) desk.add(mesh(rbox(0.66, 0.73, 0.05, 0.012), dm, { pos: [0, 0.365, z] }));
  desk.add(mesh(box(0.03, 0.5, 1.48), dm, { pos: [0.33, 0.48, 0] }));
  // A blanket draped over the front of the desk: a cosy den underneath.
  const drape = curtain(1.55, 0.5, C.blush, { folds: 5, depth: 0.02 });
  drape.position.set(-0.37, 0.77, 0);
  drape.rotation.y = -Math.PI / 2;
  desk.add(drape);
  g.add(desk);
  col.add(dx - 0.4, cz - 0.82, R.x1, cz + 0.82);
  const dl = tableLamp({ shade: C.sage, base: C.cream, h: 0.42 });
  dl.position.set(dx + 0.12, 0.775, cz - 0.6);
  g.add(dl);
  lampSwitch(ctx, ROOM, dl);
  // A small book by the lamp, with something pressed inside.
  g.add(pressedFlowerBook(ctx, ROOM, { pos: [dx - 0.13, 0.776, cz - 0.56], rotY: Math.PI / 2 - 0.15, find: 'tulip' }));
  const globe = group(
    [
      mesh(sphere(0.1, 20, 14), mat(0xffffff, { map: globeTexture(), rough: 0.5 }), { pos: [0, 0.2, 0] }),
      mesh(torus(0.115, 0.006, 6, 20, Math.PI), mat(C.gold, { metal: 0.6 }), { pos: [0, 0.2, 0], rot: [0, Math.PI / 2, 0.4] }),
      mesh(cyl(0.05, 0.06, 0.08, 12), dm, { pos: [0, 0.04, 0] }),
    ],
    { pos: [dx + 0.1, 0.775, cz + 0.55] },
  );
  g.add(globe);
  spinningGlobe(ctx, ROOM, globe, globe.children[0]);
  const dbooks = bookRow(0.3, { height: 0.22, depth: 0.16 });
  dbooks.position.set(dx + 0.2, 0.775, cz + 0.1);
  dbooks.rotation.y = Math.PI / 2;
  g.add(dbooks);
  // The note stands on the desk, facing the room, right where the cats meet.
  placeNote(ctx, ROOM, 3, { pos: [dx - 0.2, 0.776, cz - 0.18], rotY: -Math.PI / 2 + 0.15, mode: 'stand' });
  const dmug = mug(C.sage, { steam: true });
  dmug.position.set(dx - 0.1, 0.775, cz + 0.32);
  g.add(dmug);
  const dch = chair({ color: woodMat('dark'), cushionColor: C.sage });
  dch.position.set(dx - 0.85, 0, cz - 0.75);
  dch.rotation.y = Math.PI / 2 + 0.5;
  g.add(dch);
  col.addCentered(dx - 0.85, cz - 0.75, 0.48, 0.48);

  // ---------------------------------------------------------- big window
  const wz = cz + 0.2;
  const win = windowFrame(1.8, 1.6, nightSky(512, 512));
  win.position.set(R.x0 + 0.04, 1.5, wz);
  win.rotation.y = Math.PI / 2;
  g.add(win);
  const curtains = [];
  for (const side of [1, -1]) {
    const cur = curtain(0.7, 2.6, C.sage, { folds: 5, depth: 0.05 });
    cur.position.set(R.x0 + 0.2, 2.68, wz + side * 1.15);
    cur.rotation.y = Math.PI / 2;
    g.add(cur);
    curtains.push(cur);
  }
  g.add(mesh(cyl(0.016, 0.016, 3.1, 8), mat(0xd8c4a0, { metal: 0.4 }), { pos: [R.x0 + 0.2, 2.7, wz], rot: [Math.PI / 2, 0, 0] }));

  // ------------------------------------------------------ armchairs etc.
  const a1 = armchair({ color: C.blushDeep, cushionColor: C.cream });
  a1.position.set(-2.3, 0, cz + 1.55);
  a1.rotation.y = Math.PI - 0.6;
  g.add(a1);
  col.addCentered(-2.3, cz + 1.55, 0.95, 0.95);
  const a2 = armchair({ color: C.sage, cushionColor: C.blush });
  a2.position.set(-2.3, 0, cz - 1.3);
  a2.rotation.y = 0.6;
  g.add(a2);
  col.addCentered(-2.3, cz - 1.3, 0.95, 0.95);
  const st = table({ w: 0.5, h: 0.5, round: true, wood: 'light' });
  st.position.set(-2.75, 0, cz + 0.15);
  g.add(st);
  col.addCentered(-2.75, cz + 0.15, 0.5, 0.5);
  const sc = candle({ h: 0.1 });
  sc.position.set(-2.8, 0.5, cz + 0.2);
  g.add(sc);
  const sv = vaseWithTulips({ colors: ['W', 'B', 'W'], vaseColor: C.blush, h: 0.14 });
  sv.position.set(-2.65, 0.5, cz + 0.05);
  g.add(sv);
  const fl = floorLamp({ shade: C.cream });
  fl.position.set(-3.6, 0, cz - 2.1);
  g.add(fl);
  col.addCentered(-3.6, cz - 2.1, 0.36, 0.36);
  const srug = rugMesh(rug(0x7f9c78, C.cream, C.blush), 3.2, 2.4);
  srug.position.set(0.1, 0.006, cz);
  g.add(srug);

  // ------------------------------------- bookshelves + rolling ladder
  for (const x of [-2.45, 2.45]) {
    const bs = bookshelf({ w: 3.0, h: 2.5, d: 0.34, shelves: 6, wood: 'dark' });
    bs.position.set(x, 0, R.zN + 0.18);
    g.add(bs);
    col.add(x - 1.5, R.zN, x + 1.5, R.zN + 0.36);
  }
  const rail = mesh(cyl(0.015, 0.015, 3.0, 8), mat(0xd8c4a0, { metal: 0.6 }), { pos: [2.45, 2.3, R.zN + 0.42], rot: [0, 0, Math.PI / 2] });
  g.add(rail);
  const ladder = group([], { pos: [1.7, 0, R.zN + 0.62], rot: [-0.22, 0, 0] });
  for (const x of [-0.2, 0.2]) ladder.add(mesh(rbox(0.04, 2.4, 0.04, 0.012), woodMat('light'), { pos: [x, 1.2, 0] }));
  for (let i = 0; i < 7; i++)
    ladder.add(mesh(cyl(0.015, 0.015, 0.4, 8), woodMat('light'), { pos: [0, 0.3 + i * 0.32, 0], rot: [0, 0, Math.PI / 2] }));
  for (const x of [-0.2, 0.2]) ladder.add(mesh(cyl(0.035, 0.035, 0.03, 10), mat(0x3a3030), { pos: [x, 0.035, 0.02], rot: [0, 0, Math.PI / 2] }));
  g.add(ladder);
  col.addCentered(1.7, R.zN + 0.6, 0.5, 0.35);

  // --------------------------------------------- cushion corner (cosy)
  const nookX = R.x1 - 0.75;
  const nookZ = R.zS - 0.75;
  const nook = group([], { pos: [nookX, 0, nookZ] });
  nook.add(mesh(rbox(1.3, 0.14, 1.2, 0.06, 3), mat(0xffffff, { map: fabric(C.cream, { checks: C.sage }) }), { pos: [0, 0.07, 0] }));
  const cushionSpecs = [
    [0.4, 0.3, 0.42, 0.45, C.blush, -0.2],
    [-0.35, 0.28, 0.5, 0.4, C.sage, 0.3],
    [0.45, 0.3, -0.1, 0.45, C.tulipBlue, 1.1],
    [-0.1, 0.3, 0.45, 0.45, C.cream, -0.6],
    [0.0, 0.22, -0.4, 0.4, C.blushDeep, 0.2],
    [-0.45, 0.24, -0.3, 0.38, 0xf3e3cf, 0.9],
  ];
  for (const [x, y, z, s, c, r] of cushionSpecs) {
    const cu = cushion(s, 0.18, s * 0.9, c);
    cu.position.set(x, y, z);
    cu.rotation.set(r * 0.3, r, 0.4 * Math.sign(x));
    nook.add(cu);
  }
  const nb = blanket(1.0, 0.7, C.blushDeep, C.cream);
  nb.position.set(-0.1, 0.16, 0.05);
  nook.add(nb);
  g.add(nook);
  col.addCentered(nookX, nookZ, 1.3, 1.2);
  const nookLights = stringLights(
    [
      [R.x1 - 0.05, 2.2, nookZ - 0.9],
      [R.x1 - 0.05, 2.3, R.zS - 0.05],
      [nookX - 0.8, 2.2, R.zS - 0.05],
    ],
    { bulbs: 16, sag: 0.18 },
  );
  g.add(nookLights);

  // --------------------------------------------------- cardboard box
  const boxX = -3.35;
  const boxZ = R.zN + 0.85;
  const cbox = cardboardBox({ w: 0.58, h: 0.4, d: 0.5 });
  cbox.position.set(boxX, 0, boxZ);
  cbox.rotation.y = 0.25;
  g.add(cbox);
  col.addCentered(boxX, boxZ, 0.62, 0.56);

  // ---------------------------------------------------- the chalkboard
  const pzB = gs.puzzles.r4b;
  const cbC = makeCanvas(768, 512);
  const cbTex = canvasTexture(cbC);
  const board = group(
    [
      mesh(plane(1.5, 1.0), mat(0xffffff, { map: cbTex, rough: 0.95 }), { cast: false }),
      mesh(rbox(1.6, 1.1, 0.03, 0.01), woodMat('light'), { pos: [0, 0, -0.02] }),
      mesh(rbox(1.5, 0.04, 0.08, 0.01), woodMat('light'), { pos: [0, -0.54, 0.03] }),
      mesh(rbox(0.08, 0.02, 0.02, 0.005), mat(0xffffff), { pos: [0.4, -0.51, 0.04], cast: false }),
    ],
    { pos: [-2.2, 1.5, R.zS - 0.04], rot: [0, Math.PI, 0] },
  );
  g.add(board);
  const drawBoard = () => {
    drawChalkboard(cbC.getContext('2d'), 768, 512, pzB);
    cbTex.needsUpdate = true;
  };
  pzB.onChange(() => drawBoard());
  ctx.interact.add(board, {
    zones: [ROOM],
    puzzle: 'r4b',
    enabled: () => !pzB.isSolved(),
    prompt: PROMPTS.chalkboard,
    onUse: () => sudokuOverlay(ctx.game, pzB),
  });

  const ck = clock();
  ck.position.set(1.6, 2.2, R.zS - 0.03);
  ck.rotation.y = Math.PI;
  g.add(ck);
  const tallPlant = pottedPlant({ size: 1.25, potColor: C.cream, leaves: 11 });
  tallPlant.position.set(-3.7, 0, R.zS - 0.45);
  g.add(tallPlant);
  col.addCentered(-3.7, R.zS - 0.45, 0.42, 0.42);

  // ------------------------------------------------- hide and seek
  const pzA = gs.puzzles.r4a;
  // Where each cat sits when hidden in a spot, and the path out to the desk.
  const hub = new THREE.Vector3(0.2, 0, cz + 0.2);
  const meet = {
    tchobin: { x: dx - 0.85, z: cz + 0.38, heading: -Math.PI / 2 - 0.15 },
    zizo: { x: dx - 0.85, z: cz - 0.05, heading: -Math.PI / 2 + 0.15 },
  };
  ctx.studyMeet = meet;
  const hideSpots = [
    { id: 'desk', pos: new THREE.Vector3(dx + 0.05, 0, cz + 0.2), heading: -Math.PI / 2, pose: 'sit', route: [] },
    { id: 'curtain', pos: new THREE.Vector3(R.x0 + 0.13, 0, wz + 1.15), heading: Math.PI / 2, pose: 'sit', route: [hub] },
    {
      id: 'cushions',
      pos: new THREE.Vector3(nookX + 0.05, 0.12, nookZ + 0.05),
      heading: -2.4,
      pose: 'sleep',
      route: [new THREE.Vector3(nookX - 0.9, 0, nookZ - 0.9)],
    },
    {
      id: 'box',
      pos: new THREE.Vector3(boxX, 0.012, boxZ),
      heading: 0.25 + Math.PI / 2,
      pose: 'sit',
      route: [new THREE.Vector3(boxX + 0.8, 0, boxZ + 0.6), hub],
    },
    // Tucked behind the pink armchair, tail curled out on the floor beside it.
    { id: 'armchair', pos: new THREE.Vector3(-2.68, 0, cz + 2.06), heading: -0.6, pose: 'sit', route: [new THREE.Vector3(-1.7, 0, cz + 1.0), hub] },
    // In the corner behind the big plant: ears between the leaves.
    { id: 'plant', pos: new THREE.Vector3(-3.95, 0, R.zS - 0.25), heading: 2.2, pose: 'sit', route: [new THREE.Vector3(-3.0, 0, R.zS - 1.1), hub] },
  ];
  ctx.cats.hideSpots = hideSpots;
  // Interactable volumes over each spot (invisible), plus the real objects.
  const spotObjects = [drape, curtains[0], nook, cbox, a1, tallPlant];
  const searchSpot = (i) => {
    if (pzA.isSolved()) return;
    const cat = pzA.catAt(i);
    if (cat && !pzA.found[cat]) {
      ctx.cats.found(cat, hideSpots[i].route);
      pzA.search(i);
      ctx.hud.toast(fill(UI.foundCat, { NAME: CATS[cat].name }), { ms: 2200 });
      if (pzA.isSolved()) ctx.hud.toast(UI.bothFound, { ms: 2600 });
    } else if (cat) {
      ctx.hud.toast(fill(TOASTS.alreadyFound, { NAME: CATS[cat].name }));
    } else {
      ctx.audio.soft();
      pzA.search(i);
      ctx.hud.toast(UI.emptySpot[Math.floor(Math.random() * UI.emptySpot.length)]);
      // They heard that. The cats still hiding sneak to new spots (out of sight).
      ctx.cats.rehide();
    }
  };
  spotObjects.forEach((obj, i) => {
    ctx.interact.add(obj, {
      zones: [ROOM],
      puzzle: 'r4a',
      enabled: () => !pzA.isSolved(),
      prompt: () => fill(PROMPTS.spot, { SPOT: HIDING_SPOTS[i].label }),
      onUse: () => searchSpot(i),
    });
  });
  ctx.onHiddenCatClicked = (catId) => searchSpot(pzA.spots[catId]);

  // When both are found: they sit together, and one pushes the key out.
  let keyPushT = -1;
  pzA.onChange((p, just) => {
    if (just) {
      ctx.cats.bothFound();
      keyPushT = 0;
    }
  });

  ctx.doors[ROOM] = new Door(ctx, ROOM, { color: C.woodDark });

  ctx.cats.addZone(ROOM, [
    [0.2, cz + 0.2],
    [1.8, R.zS - 1.5],
    [-1.0, R.zS - 1.7],
    [-1.2, R.zN + 1.7],
    [1.0, R.zN + 1.5],
    [2.4, cz + 0.9],
  ]);

  ctx.addUpdate((dt, t) => {
    nookLights.userData.twinkle(t);
    sc.userData.glow.material.opacity = 0.6 + Math.sin(t * 9) * 0.08;
    if (keyPushT >= 0) {
      // One of them nudges the gold key out with a paw (a little hop and a meow).
      const before = keyPushT;
      keyPushT += dt;
      if (before < 2.0 && keyPushT >= 2.0) {
        const pusher = ctx.cats.cats[0];
        pusher.model.hop();
        ctx.audio.meow(pusher.pitch, pusher.model.root.position.clone().setY(0.35));
      }
      if (keyPushT > 4) keyPushT = -1;
    }
  });

  return {
    index: ROOM,
    rig: {
      hemi: { sky: 0xffe4cc, ground: 0x3a3030, intensity: 0.8 },
      spot: { pos: [0.3, 2.7, cz], target: [0.6, 0, cz], color: 0xffdcae, intensity: 30, angle: 1.2, penumbra: 0.8 },
      points: [
        { pos: [dx + 0.1, 1.1, cz - 0.6], color: 0xffc98a, intensity: 2.4 },
        { pos: [-3.6, 1.5, cz - 2.1], color: 0xffc98a, intensity: 2.2 },
        { pos: [nookX - 0.2, 1.8, nookZ], color: 0xffd0c0, intensity: 1.6 },
      ],
      fog: { color: 0x2b2130, near: 10, far: 26 },
    },
    anchors: { r4a: new THREE.Vector3(0, 0.5, cz), r4b: new THREE.Vector3(-2.2, 1.5, R.zS - 0.05) },
    keySpawn: (id) =>
      id === 'r4a'
        ? { pos: new THREE.Vector3(dx - 1.25, 0.9, cz + 0.16), from: new THREE.Vector3(dx - 0.95, 0.06, cz + 0.16), delay: 2.2 }
        : new THREE.Vector3(-2.2, 1.3, R.zS - 0.5),
    applyState() {
      drawBoard();
      keyPushT = -1;
    },
  };
}
