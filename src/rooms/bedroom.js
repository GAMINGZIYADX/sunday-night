import * as THREE from 'three';
import { COLORS, CLUES } from '../config.js';
import { mat, mesh, group, rbox, box, cyl, sphere, plane } from '../engine/materials.js';
import { fabric, rug, nightSky, canvasTexture, paperTexture, HAND_FONT, rr } from '../engine/textures.js';
import {
  hitArea,
  woodMat,
  tableLamp,
  floorLamp,
  stringLights,
  rugMesh,
  cushion,
  curtain,
  blanket,
  pictureFrame,
  mug,
  bookshelf,
  pottedPlant,
  cabinet,
  windowFrame,
  armchair,
  vaseWithTulips,
  candle,
  table,
  glowSprite,
  clock,
  wallShelf,
  jar,
  bookRow,
} from '../engine/props.js';
import { buildRoomShell } from './shell.js';
import { Door } from './door.js';
import { drawFramePicture } from './art.js';
import { paintingCanvas, slidingOverlay } from '../ui/overlays.js';
import { FRAME_SOLUTION } from '../puzzles/frames.js';
import { N as SLIDE_N } from '../puzzles/sliding.js';
import { PROMPTS } from '../config.js';
import { placeNote } from './notes.js';
import { lampSwitch, musicBox, openableDrawer, paperStar } from './cozy.js';

const C = COLORS;

export function buildBedroom(ctx) {
  const ROOM = 0;
  const g = ctx.roomGroup(ROOM);
  const col = ctx.collision;
  const gs = ctx.gs;
  buildRoomShell(ctx, ROOM, { wall: C.blush, wallAccent: C.cream, pattern: 'tulips', lower: 0xe9d3c0, floor: C.wood });

  // ---------------------------------------------------------------- the bed
  const bed = group([], { pos: [-1.6, 0, 2.45] });
  const frameM = woodMat('light');
  bed.add(mesh(rbox(1.7, 0.3, 2.1, 0.04), frameM, { pos: [0, 0.2, 0] }));
  bed.add(mesh(rbox(1.62, 0.22, 2.0, 0.08, 3), mat(0xfbf6ee, { rough: 0.95 }), { pos: [0, 0.44, -0.02] }));
  // headboard with soft scallops
  bed.add(mesh(rbox(1.8, 1.05, 0.1, 0.05), frameM, { pos: [0, 0.6, 1.02] }));
  for (let i = 0; i < 4; i++) bed.add(mesh(cyl(0.22, 0.22, 0.1, 18), frameM, { pos: [-0.66 + i * 0.44, 1.12, 1.02], rot: [Math.PI / 2, 0, 0] }));
  bed.add(mesh(rbox(1.62, 0.5, 0.06, 0.03), mat(C.blushDeep, { rough: 0.9 }), { pos: [0, 0.75, 0.96] }));
  bed.add(mesh(rbox(1.8, 0.55, 0.08, 0.04), frameM, { pos: [0, 0.35, -1.04] }));
  // quilt with stripes, folded back at the top
  const quilt = mesh(rbox(1.68, 0.08, 1.45, 0.04, 3), mat(0xffffff, { map: fabric(C.sage, { checks: C.cream }) }), { pos: [0, 0.57, -0.3] });
  bed.add(quilt);
  bed.add(mesh(rbox(1.68, 0.1, 0.25, 0.05, 3), mat(0xffffff, { map: fabric(C.cream, { stripes: C.blush }) }), { pos: [0, 0.6, 0.45] }));
  // pillows
  for (const x of [-0.42, 0.42]) {
    const p = cushion(0.62, 0.17, 0.38, 0xfffaf2);
    p.position.set(x, 0.66, 0.72);
    p.rotation.x = -0.25;
    bed.add(p);
  }
  const heart = cushion(0.32, 0.12, 0.3, C.blush);
  heart.position.set(0.05, 0.7, 0.45);
  heart.rotation.set(-0.5, 0.2, 0);
  bed.add(heart);
  const throwB = blanket(0.9, 0.6, C.blushDeep, C.cream);
  throwB.position.set(0.25, 0.63, -0.6);
  throwB.rotation.z = 0.15;
  bed.add(throwB);
  g.add(bed);
  col.add(-2.48, 1.37, -0.72, 3.5);

  // ----------------------------------------------------------- nightstands
  const ns = cabinet({ w: 0.5, h: 0.58, d: 0.42, color: woodMat('light'), drawers: 2 });
  ns.position.set(-0.4, 0, 3.22);
  ns.rotation.y = Math.PI;
  g.add(ns);
  col.addCentered(-0.4, 3.22, 0.54, 0.48);
  const lamp = tableLamp({ shade: C.cream, base: C.blushDeep });
  lamp.position.set(-0.47, 0.58, 3.32);
  g.add(lamp);
  const m1 = mug(C.sage);
  m1.position.set(-0.24, 0.58, 3.3);
  g.add(m1);
  // The heavy note, propped up on the nightstand facing the room, and the clue card.
  placeNote(ctx, ROOM, 0, { pos: [-0.27, 0.58, 3.16], rotY: Math.PI + 0.2, mode: 'stand' });
  const clueTex = paperTexture(CLUES.frames.text, { w: 320, h: 240, size: 22, lines: false, bg: '#fff6e6', center: true, stain: false });
  // A small card standing on the nightstand, leaning on the lamp.
  const clue = group([mesh(plane(0.17, 0.13), mat(0xffffff, { map: clueTex, side: THREE.DoubleSide }), { pos: [0, 0.065, 0], cast: false })], {
    pos: [-0.56, 0.582, 3.13],
  });
  clue.rotation.order = 'YXZ';
  clue.rotation.set(-0.3, Math.PI - 0.35, 0);
  g.add(clue);
  ctx.interact.add(clue, { zones: [ROOM], prompt: PROMPTS.framesClue, puzzle: 'r1a', onUse: () => ctx.showClue('frames') });

  const ns2 = cabinet({ w: 0.45, h: 0.55, d: 0.4, color: woodMat('light'), drawers: 1 });
  ns2.position.set(-2.95, 0, 3.22);
  ns2.rotation.y = Math.PI;
  g.add(ns2);
  col.addCentered(-2.95, 3.22, 0.5, 0.46);
  const c1 = candle({ h: 0.12 });
  c1.position.set(-3.1, 0.55, 3.34);
  g.add(c1);
  const books = bookRow(0.25, { height: 0.2, depth: 0.15, lean: false });
  books.rotation.z = Math.PI / 2;
  books.position.set(-2.82, 0.55 + 0.12, 3.2);
  books.rotation.set(0, 0, Math.PI / 2);
  g.add(books);

  // ------------------------------------------------------------ the window
  const win = windowFrame(1.45, 1.3, nightSky(512, 512));
  win.position.set(-3.45, 1.55, -0.35);
  win.rotation.y = Math.PI / 2;
  g.add(win);
  for (const side of [-1, 1]) {
    const cur = curtain(0.55, 2.3, C.cream, { tieBack: true });
    cur.position.set(-3.4, 2.55, -0.35 + side * 0.98);
    cur.rotation.y = Math.PI / 2;
    g.add(cur);
  }
  g.add(mesh(cyl(0.015, 0.015, 2.5, 8), mat(0xd8c4a0, { metal: 0.4, rough: 0.4 }), { pos: [-3.38, 2.57, -0.35], rot: [Math.PI / 2, 0, 0] }));
  // window-seat cushion + plant on the sill
  const sillPlant = pottedPlant({ size: 0.55, potColor: C.cream });
  sillPlant.position.set(-3.32, 0.917, -0.85);
  g.add(sillPlant);
  // moonlight patch on the floor
  const moon = mesh(plane(1.2, 1.6), mat(0xbfd0ff, { basic: true, opacity: 0.06, depthWrite: false }), {
    rot: [-Math.PI / 2, 0, 0],
    pos: [-2.6, 0.008, -0.35],
    cast: false,
    receive: false,
  });
  g.add(moon);

  // ------------------------------------------------------------- dresser
  const dresser = cabinet({ w: 1.25, h: 0.82, d: 0.46, color: C.cream, drawers: 3, knob: C.gold });
  dresser.position.set(-1.95, 0, -3.25);
  g.add(dresser);
  col.addCentered(-1.95, -3.25, 1.3, 0.5);
  const v1 = vaseWithTulips({ colors: ['B', 'W', 'B'], vaseColor: C.blush });
  v1.position.set(-2.4, 0.82, -3.25);
  g.add(v1);
  const j1 = jar(0xf2c4c0, 0.12);
  j1.position.set(-1.65, 0.82, -3.3);
  g.add(j1);
  const c2 = candle({ h: 0.08, color: C.blush });
  c2.position.set(-1.45, 0.82, -3.18);
  g.add(c2);
  // The top drawer opens (a paper star inside), and a music box plays.
  const star = paperStar();
  star.rotation.y = 0.4;
  openableDrawer(ctx, ROOM, dresser, { find: 'star', findObject: star });
  g.add(musicBox(ctx, ROOM, { pos: [-2.02, 0.82, -3.27] }));

  // ---------------------------------------------- puzzle A: the five frames
  const frames = {};
  const pz = gs.puzzles.r1a;
  const slots = [-3.0, -2.5, -2.0, -1.5, -1.0];
  const frameY = 1.66;
  let selected = -1;
  const frameAnim = new Map();
  for (const kind of FRAME_SOLUTION) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 320;
    drawFramePicture(c.getContext('2d'), 256, 320, kind);
    const f = pictureFrame(0.4, 0.5, canvasTexture(c), { frame: C.woodLight });
    f.userData.kind = kind;
    f.userData.tilt = rr(-0.08, 0.08);
    g.add(f);
    frames[kind] = f;
    ctx.interact.add(f, {
      zones: [ROOM],
      puzzle: 'r1a',
      enabled: () => !pz.isSolved(),
      prompt: () => (selected === -1 ? PROMPTS.framePick : pz.order[selected] === kind ? PROMPTS.framePutBack : PROMPTS.frameSwap),
      onUse: () => {
        const i = pz.order.indexOf(kind);
        if (selected === -1) {
          selected = i;
          ctx.audio.click();
        } else if (selected === i) {
          selected = -1;
          ctx.audio.soft();
        } else {
          const a = selected;
          selected = -1;
          ctx.audio.slide();
          pz.swap(a, i);
        }
        layoutFrames(false);
      },
    });
  }
  // small hooks + string above each slot
  for (const x of slots) g.add(mesh(sphere(0.012, 6, 4), mat(C.gold, { metal: 0.6 }), { pos: [x, frameY + 0.3, -3.49], cast: false }));
  function layoutFrames(instant) {
    pz.order.forEach((kind, i) => {
      const f = frames[kind];
      const target = new THREE.Vector3(slots[i], frameY, -3.47 + (i === selected ? 0.09 : 0));
      const tilt = pz.isSolved() ? 0 : i === selected ? 0 : f.userData.tilt;
      if (instant) {
        f.position.copy(target);
        f.rotation.set(0, 0, tilt);
        frameAnim.delete(kind);
      } else frameAnim.set(kind, { from: f.position.clone(), to: target, t: 0, tilt });
    });
  }
  pz.onChange((p, just) => {
    if (just) {
      selected = -1;
      layoutFrames(false);
      // snap: tiny bounce once they land
      setTimeout(() => FRAME_SOLUTION.forEach((k) => (frames[k].userData.bounce = 0)), 380);
    }
  });

  // ---------------------------------------------- puzzle B: fallen painting
  const art = canvasTexture(paintingCanvas());
  const paintingSpot = new THREE.Vector3(-3.47, 1.55, -2.4);
  const hung = pictureFrame(0.86, 0.86, art, { frame: C.woodDark, border: 0.05 });
  hung.position.copy(paintingSpot);
  hung.userData.dynamic = true;
  hung.rotation.y = Math.PI / 2;
  g.add(hung);
  // An empty nail and a paler square on the wallpaper where it used to hang.
  const ghost = mesh(plane(0.84, 0.84), mat(0xffffff, { basic: true, opacity: 0.05, depthWrite: false }), {
    pos: [-3.495, 1.55, -2.4],
    rot: [0, Math.PI / 2, 0],
    cast: false,
  });
  ghost.userData.dynamic = true;
  g.add(ghost);
  g.add(mesh(sphere(0.012, 6, 4), mat(C.gold, { metal: 0.6 }), { pos: [-3.485, 2.03, -2.4], cast: false }));
  const pieces = group();
  const NP = SLIDE_N;
  const TS = 0.2;
  const tileGeo = (v) => {
    const geo = new THREE.PlaneGeometry(TS, TS);
    const uv = geo.attributes.uv;
    const c = (v - 1) % NP;
    const r = Math.floor((v - 1) / NP);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (c + uv.getX(i)) / NP, 1 - (r + 1 - uv.getY(i)) / NP);
    return geo;
  };
  const pieceMat = mat(0xffffff, { map: art, rough: 0.7 });
  const backing = mat(C.woodDark);
  // Sixteen pieces scattered on the floor by the window, a few overlapping.
  for (let v = 1; v <= NP * NP; v++) {
    const a = v * 2.39996;
    const rad = 0.12 + Math.sqrt(v / (NP * NP)) * 0.5;
    const x = -2.85 + Math.cos(a) * rad * 0.55;
    const z = -2.3 + Math.sin(a) * rad * 0.9;
    const tile = group(
      [
        mesh(tileGeo(v), pieceMat, { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.019, 0], cast: false }),
        mesh(box(TS, 0.016, TS), backing, { pos: [0, 0.008, 0] }),
      ],
      { pos: [x, (v % 4 === 0 ? 0.017 : 0) + 0.001, z], rot: [0, rr(-0.9, 0.9), 0] },
    );
    pieces.add(tile);
  }
  // The empty frame leaning against the wall.
  const emptyFrame = pictureFrame(0.86, 0.86, null, { frame: C.woodDark, border: 0.05 });
  emptyFrame.userData.picture.visible = false;
  emptyFrame.children[4].material = mat(0x5a4038);
  emptyFrame.position.set(-3.38, 0.44, -1.55);
  emptyFrame.rotation.set(0, Math.PI / 2, -0.12);
  emptyFrame.rotation.order = 'YXZ';
  emptyFrame.rotation.set(-0.14, Math.PI / 2, 0);
  pieces.add(emptyFrame);
  const pileHit = hitArea(0.95, 0.12, 1.35);
  pileHit.position.set(-2.9, 0.06, -2.4);
  pieces.add(pileHit);
  g.add(pieces);
  const pzB = gs.puzzles.r1b;
  ctx.interact.add(pieces, {
    zones: [ROOM],
    puzzle: 'r1b',
    enabled: () => !pzB.isSolved(),
    prompt: PROMPTS.painting,
    onUse: () => slidingOverlay(ctx.game, pzB),
  });
  pzB.onChange((p, just) => {
    if (just) hangPainting();
  });
  function hangPainting() {
    pieces.visible = false;
    ghost.visible = false;
    hung.visible = true;
  }

  // ------------------------------------------------------------- east side
  const shelf = bookshelf({ w: 1.2, h: 1.85, d: 0.32, shelves: 4 });
  shelf.position.set(3.33, 0, 0.1);
  shelf.rotation.y = -Math.PI / 2;
  g.add(shelf);
  col.addCentered(3.33, 0.1, 0.36, 1.24);
  const plant2 = pottedPlant({ size: 0.6, potColor: C.sage });
  plant2.position.set(3.33, 1.86, -0.2);
  g.add(plant2);
  const cl = clock();
  cl.position.set(3.48, 2.3, 0.1);
  cl.rotation.y = -Math.PI / 2;
  g.add(cl);
  const chair = armchair({ color: C.sage, cushionColor: C.blush });
  chair.position.set(2.65, 0, 2.6);
  chair.rotation.y = Math.PI + 0.75;
  g.add(chair);
  col.addCentered(2.65, 2.6, 0.95, 0.95);
  const ch2 = cushion(0.34, 0.12, 0.3, C.cream, fabric(C.cream, { stripes: C.tulipBlue }));
  ch2.position.set(2.62, 0.55, 2.62);
  ch2.rotation.set(-0.6, Math.PI + 0.75, 0);
  g.add(ch2);
  const fl = floorLamp({ shade: C.blush });
  fl.position.set(3.15, 0, 1.6);
  g.add(fl);
  lampSwitch(ctx, ROOM, fl);
  col.addCentered(3.15, 1.6, 0.36, 0.36);
  const side = table({ w: 0.45, h: 0.5, round: true, wood: 'light' });
  side.position.set(1.8, 0, 3.1);
  g.add(side);
  col.addCentered(1.8, 3.1, 0.46, 0.46);
  const m2 = mug(C.blush, { steam: true });
  m2.position.set(1.75, 0.5, 3.05);
  g.add(m2);
  const plant3 = pottedPlant({ size: 1.1, potColor: C.blushDeep });
  plant3.position.set(2.95, 0, -3.0);
  g.add(plant3);
  col.addCentered(2.95, -3.0, 0.4, 0.4);
  // above-bed little frames
  const smallArt = (fn) => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    fn(c.getContext('2d'));
    return canvasTexture(c);
  };
  const f1 = pictureFrame(
    0.32,
    0.32,
    smallArt((x) => {
      x.fillStyle = '#a9bf9d';
      x.fillRect(0, 0, 128, 128);
      x.fillStyle = '#fbf7f0';
      x.font = `64px ${HAND_FONT}`;
      x.textAlign = 'center';
      x.fillText('☾', 64, 86);
    }),
    { frame: C.cream },
  );
  f1.position.set(-1.6, 2.15, 3.47);
  f1.rotation.y = Math.PI;
  g.add(f1);
  const shelf2 = wallShelf(0.8);
  shelf2.position.set(1.2, 1.7, 3.38);
  shelf2.rotation.y = Math.PI;
  g.add(shelf2);
  const v2 = vaseWithTulips({ colors: ['W', 'B'], vaseColor: C.cream, h: 0.15 });
  v2.position.set(1.0, 1.72, 3.38);
  g.add(v2);
  const bk = bookRow(0.3, { height: 0.2, depth: 0.15 });
  bk.position.set(1.35, 1.72, 3.4);
  g.add(bk);

  // ------------------------------------------------------------- textiles
  const rugTex = rug(C.cream, C.blushDeep, C.sage, (x, w, h) => {
    x.fillStyle = 'rgba(169,191,157,0.5)';
    x.beginPath();
    x.ellipse(w / 2, h / 2, w * 0.25, h * 0.22, 0, 0, Math.PI * 2);
    x.fill();
  });
  const rg = rugMesh(rugTex, 2.8, 1.9);
  rg.position.set(0.4, 0.006, 0.2);
  g.add(rg);
  const bedRug = rugMesh(rug(C.blush, C.cream, C.cream), 1.2, 0.7);
  bedRug.position.set(-0.1, 0.008, 2.1);
  bedRug.rotation.z = Math.PI / 2;
  g.add(bedRug);

  // ----------------------------------------------------------- lights
  const sl1 = stringLights(
    [
      [-3.4, 2.62, -3.42],
      [-1.2, 2.62, -3.42],
      [1.2, 2.62, -3.42],
      [3.4, 2.62, -3.42],
    ],
    { bulbs: 28, sag: 0.16 },
  );
  g.add(sl1);
  const sl2 = stringLights(
    [
      [-2.5, 2.4, 3.44],
      [-0.7, 2.4, 3.44],
    ],
    { bulbs: 10, sag: 0.12 },
  );
  g.add(sl2);
  const lantern = group(
    [
      mesh(cyl(0.006, 0.006, 0.4, 6), mat(0x3a3030), { pos: [0, -0.2, 0], cast: false }),
      mesh(sphere(0.26, 16, 12), mat(0xfff3e0, { emissive: 0xffd9a0, ei: 0.75, rough: 0.9 }), { pos: [0, -0.62, 0], cast: false }),
    ],
    { pos: [0.3, 2.8, 0.2] },
  );
  const lglow = glowSprite(C.lamp, 1.6, 0.35);
  lglow.position.set(0, -0.62, 0);
  lantern.add(lglow);
  g.add(lantern);

  // --------------------------------------------------------------- door
  const door = new Door(ctx, ROOM, { color: C.sage });
  ctx.doors[ROOM] = door;

  // ----------------------------------------------------------- the cats
  const nodes = ctx.cats.addZone(ROOM, [
    [0.6, 0.4],
    [-0.4, -0.6],
    [2.1, 0.3],
    [-2.5, -0.6],
    [-0.25, 1.05],
    [-1.4, 2.0, 0.56, 4],
    [1.6, 1.6],
    [2.45, 2.45, 0.43, 6],
  ]);
  void nodes;

  ctx.addUpdate((dt, t) => {
    sl1.userData.twinkle(t);
    sl2.userData.twinkle(t);
    c1.userData.glow.material.opacity = 0.6 + Math.sin(t * 9) * 0.08 + Math.sin(t * 13) * 0.05;
    c2.userData.glow.material.opacity = 0.6 + Math.sin(t * 8 + 1) * 0.08;
    for (const [kind, a] of frameAnim) {
      const f = frames[kind];
      a.t = Math.min(1, a.t + dt / 0.35);
      const e = a.t * a.t * (3 - 2 * a.t);
      f.position.lerpVectors(a.from, a.to, e);
      f.position.z += Math.sin(e * Math.PI) * 0.12;
      f.rotation.z += (a.tilt - f.rotation.z) * Math.min(1, dt * 10);
      if (a.t >= 1) frameAnim.delete(kind);
    }
    for (const k of FRAME_SOLUTION) {
      const f = frames[k];
      if (f.userData.bounce !== undefined) {
        f.userData.bounce += dt;
        const b = f.userData.bounce;
        f.scale.setScalar(1 + Math.sin(Math.min(1, b / 0.4) * Math.PI) * 0.06);
        if (b > 0.4) {
          f.scale.setScalar(1);
          f.userData.bounce = undefined;
        }
      }
    }
  });

  return {
    index: ROOM,
    rig: {
      hemi: { sky: 0xffdcc8, ground: 0x4a3038, intensity: 0.7 },
      spot: { pos: [0.3, 2.7, 0.3], target: [0.0, 0, 0.0], color: 0xffd9a8, intensity: 22, angle: 1.15, penumbra: 0.8 },
      points: [
        { pos: [-0.47, 1.0, 3.25], color: 0xffc77a, intensity: 2.2 },
        { pos: [3.1, 1.5, 1.55], color: 0xffc98a, intensity: 2.2 },
        { pos: [-1.2, 2.3, -3.0], color: 0xffd2b8, intensity: 1.8 },
      ],
      fog: { color: 0x2b2130, near: 9, far: 26 },
    },
    anchors: { r1a: new THREE.Vector3(-2.0, 1.5, -3.3), r1b: new THREE.Vector3(-2.9, 0.4, -2.4) },
    keySpawn: (id) => (id === 'r1a' ? new THREE.Vector3(-2.0, 1.2, -2.95) : new THREE.Vector3(-2.75, 0.9, -2.4)),
    applyState() {
      selected = -1;
      layoutFrames(true);
      if (pzB.isSolved()) hangPainting();
      else {
        pieces.visible = true;
        ghost.visible = true;
        hung.visible = false;
      }
    },
  };
}
