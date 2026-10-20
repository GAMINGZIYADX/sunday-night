import * as THREE from 'three';
import { COLORS, CLUES, BOOK_ORDER } from '../config.js';
import { mat, mesh, group, rbox, box, cyl, plane } from '../engine/materials.js';
import { fabric, rug, nightSky, canvasTexture, paperTexture, rr } from '../engine/textures.js';
import {
  woodMat,
  floorLamp,
  stringLights,
  rugMesh,
  cushion,
  curtain,
  pictureFrame,
  mug,
  bookshelf,
  pottedPlant,
  windowFrame,
  notePaper,
  armchair,
  sofa,
  vaseWithTulips,
  candle,
  table,
  glowSprite,
  basket,
  tulip,
  bookRow,
  foldedThrow,
  clock,
} from '../engine/props.js';
import { buildRoomShell } from './shell.js';
import { Door } from './door.js';
import { drawPatternRug, drawRainbowWindow } from './art.js';
import { vasePicker } from '../ui/overlays.js';
import { tulipRule } from '../puzzles/vase.js';
import { ROOMS } from '../engine/layout.js';
import { PROMPTS, TOASTS } from '../config.js';

const C = COLORS;
export const BOOK_PALETTE = {
  red: { hex: 0xd9534f, css: '#d9534f', glow: '#ff9a8f' },
  orange: { hex: 0xf0923a, css: '#f0923a', glow: '#ffc58a' },
  yellow: { hex: 0xf2cf4a, css: '#f2cf4a', glow: '#fff0a0' },
  green: { hex: 0x6fb36a, css: '#6fb36a', glow: '#b8f0b0' },
  blue: { hex: 0x4f8fdf, css: '#4f8fdf', glow: '#a8d0ff' },
  indigo: { hex: 0x4b4fa8, css: '#4b4fa8', glow: '#9a9ef0' },
  violet: { hex: 0x9a5cc0, css: '#9a5cc0', glow: '#dcb0f5' },
  pink: { hex: 0xf08cb4, css: '#f08cb4', glow: '#ffc8de' },
};

export function buildLiving(ctx) {
  const ROOM = 1;
  const R = ROOMS[ROOM];
  const g = ctx.roomGroup(ROOM);
  const col = ctx.collision;
  const gs = ctx.gs;
  buildRoomShell(ctx, ROOM, { wall: 0xf3e3cf, wallAccent: C.sage, pattern: 'stripes', lower: C.sage, floor: C.woodLight, beams: true });

  // ------------------------------------------------------------ fireplace
  const fx = R.x1;
  const fz = R.cz;
  const brickM = mat(0xc98f78, { rough: 0.9 });
  const fp = group([], { pos: [fx, 0, fz] });
  // Open firebox: two pillars, a lintel, a sooty back and floor.
  for (const z of [-0.65, 0.65]) fp.add(mesh(rbox(0.5, 1.2, 0.4, 0.04), brickM, { pos: [-0.25, 0.6, z] }));
  fp.add(mesh(rbox(0.5, 0.42, 0.95, 0.04), brickM, { pos: [-0.25, 0.99, 0] }));
  fp.add(mesh(box(0.06, 0.8, 0.95), mat(0x241618, { rough: 1 }), { pos: [-0.05, 0.4, 0] }));
  for (const z of [-0.45, 0.45]) fp.add(mesh(box(0.42, 0.8, 0.02), mat(0x2e1c1c, { rough: 1 }), { pos: [-0.25, 0.4, z] }));
  fp.add(mesh(rbox(0.62, 0.08, 1.95, 0.03), woodMat('dark'), { pos: [-0.3, 1.24, 0] }));
  fp.add(mesh(rbox(0.7, 0.05, 1.3, 0.02), mat(0x8a6a5a), { pos: [-0.4, 0.025, 0] }));
  // logs and embers
  for (const [y, r] of [
    [0.11, 0.35],
    [0.11, -0.35],
    [0.19, 0.05],
  ])
    fp.add(mesh(cyl(0.05, 0.05, 0.6, 8), woodMat('dark'), { pos: [-0.25, y, 0], rot: [Math.PI / 2, 0, r] }));
  const fireMat = mat(0xff9a40, { emissive: 0xff7a20, ei: 2.2, rough: 1 });
  const flames = [];
  for (let i = 0; i < 5; i++) {
    const f = mesh(new THREE.ConeGeometry(0.07, 0.3, 6), fireMat, { pos: [-0.25, 0.36, -0.24 + i * 0.12], cast: false });
    f.userData.dynamic = true;
    fp.add(f);
    flames.push(f);
  }
  const fireGlow = glowSprite(0xff9a50, 1.3, 0.75);
  fireGlow.position.set(-0.3, 0.4, 0);
  fp.add(fireGlow);
  g.add(fp);
  col.add(fx - 0.62, fz - 0.98, fx, fz + 0.98);
  // Mantel things: a big vase with the note under it, candles, a clock.
  const bigVase = vaseWithTulips({ colors: ['B', 'W', 'B', 'W', 'B', 'W', 'B'], vaseColor: C.cream, h: 0.28 });
  bigVase.position.set(fx - 0.3, 1.28, fz - 0.55);
  g.add(bigVase);
  const note2 = notePaper('', { w: 0.13, h: 0.16, tex: paperTexture('...', { size: 30, lines: false }) });
  note2.position.set(fx - 0.22, 1.282, fz - 0.42);
  note2.rotation.y = 0.5;
  g.add(note2);
  ctx.interact.add(note2, { zones: [ROOM], prompt: PROMPTS.slideNote, onUse: () => ctx.showNote(1) });
  for (const z of [0.2, 0.36]) {
    const c = candle({ h: 0.1 + z * 0.2 });
    c.position.set(fx - 0.3, 1.28, fz + z);
    g.add(c);
  }
  const ck = clock();
  ck.scale.setScalar(0.8);
  ck.position.set(fx - 0.02, 1.75, fz);
  ck.rotation.y = -Math.PI / 2;
  g.add(ck);
  const mantelLights = stringLights(
    [
      [fx - 0.3, 1.33, fz - 0.95],
      [fx - 0.3, 1.33, fz + 0.95],
    ],
    { bulbs: 12, sag: 0.08 },
  );
  g.add(mantelLights);

  // -------------------------------------------------------------- seating
  const sf = sofa({ color: C.blushDeep, w: 2.1, cushion: C.cream });
  sf.position.set(0.6, 0, fz);
  sf.rotation.y = Math.PI / 2;
  g.add(sf);
  col.add(0.13, fz - 1.07, 1.07, fz + 1.07);
  for (const [z, color, tex] of [
    [-0.6, C.cream, fabric(C.cream, { stripes: C.tulipBlue })],
    [0.55, C.sage, null],
  ]) {
    const cu = cushion(0.38, 0.14, 0.36, color, tex);
    cu.position.set(0.42, 0.72, fz + z);
    cu.rotation.set(0, Math.PI / 2, -0.45);
    g.add(cu);
  }
  const throwS = foldedThrow(0.55, 0.36, C.sage);
  throwS.position.set(0.75, 0.56, fz + 0.65);
  throwS.rotation.y = 0.3;
  g.add(throwS);
  // Coffee table sits beside the sofa so the patterned rug stays in full view.
  const tableX = 1.15;
  const tableZ = fz - 1.6;
  const coffee = table({ w: 0.8, d: 0.6, h: 0.42, wood: 'mid' });
  coffee.position.set(tableX, 0, tableZ);
  g.add(coffee);
  col.addCentered(tableX, tableZ, 0.84, 0.64);
  const clueTex = paperTexture(CLUES.vase.text, { w: 256, h: 200, size: 26, lines: false, bg: '#efe4cf', color: '#8a7a70', center: true });
  const clue = group([mesh(plane(0.18, 0.14), mat(0xffffff, { map: clueTex }), { rot: [-Math.PI / 2, 0, 0], cast: false })]);
  clue.position.set(tableX + 0.12, 0.425, tableZ + 0.05);
  clue.rotation.y = Math.PI / 2 + 0.2;
  g.add(clue);
  ctx.interact.add(clue, { zones: [ROOM], puzzle: 'r2a', prompt: PROMPTS.vaseClue, onUse: () => ctx.showClue('vase') });
  const cm1 = mug(C.blush, { steam: true });
  cm1.position.set(tableX - 0.22, 0.42, tableZ - 0.12);
  g.add(cm1);
  const cm2 = mug(C.sage);
  cm2.position.set(tableX - 0.08, 0.42, tableZ - 0.2);
  cm2.rotation.y = 2;
  g.add(cm2);
  const cc = candle({ h: 0.07, color: C.blush });
  cc.position.set(tableX + 0.28, 0.42, tableZ - 0.15);
  g.add(cc);
  // The pattern rug.
  const seq = tulipRule(9).slice(0, 6);
  const rugTex = rug(0x8a5f6a, C.cream, C.blush, (x, w, h) => drawPatternRug(x, w, h, seq), [768, 420]);
  const prug = rugMesh(rugTex, 2.7, 1.5);
  const rugG = group([prug], { pos: [2.15, 0, fz], rot: [0, -Math.PI / 2, 0] });
  g.add(rugG);
  const rugItem = ctx.interact.add(rugG, {
    zones: [ROOM],
    puzzle: 'r2a',
    prompt: PROMPTS.rug,
    onUse: () => ctx.hud.toast(TOASTS.rug),
  });
  rugItem.highlight = false;

  const ac = armchair({ color: C.sage, cushionColor: C.blush });
  ac.position.set(2.8, 0, R.zN + 1.15);
  ac.rotation.y = -2.4;
  g.add(ac);
  col.addCentered(2.8, R.zN + 1.15, 0.95, 0.95);
  const fl = floorLamp({ shade: C.cream });
  fl.position.set(3.75, 0, R.zN + 0.45);
  g.add(fl);
  col.addCentered(3.75, R.zN + 0.45, 0.36, 0.36);

  // ------------------------------------------------------------ the window
  const win = windowFrame(1.3, 1.2, nightSky(512, 512, { moon: false }));
  win.position.set(2.6, 1.55, R.zS - 0.04);
  win.rotation.y = Math.PI;
  g.add(win);
  for (const side of [-1, 1]) {
    const cur = curtain(0.5, 2.25, C.blush, { tieBack: true });
    cur.position.set(2.6 + side * 0.9, 2.55, R.zS - 0.1);
    cur.rotation.y = Math.PI;
    g.add(cur);
  }
  g.add(mesh(cyl(0.015, 0.015, 2.3, 8), mat(0xd8c4a0, { metal: 0.4 }), { pos: [2.6, 2.57, R.zS - 0.12], rot: [0, 0, Math.PI / 2] }));
  for (const [x, z, s, pc] of [
    [3.75, R.zS - 0.45, 1.2, C.blushDeep],
    [-3.75, R.zS - 0.45, 1.0, C.cream],
  ]) {
    const p = pottedPlant({ size: s, potColor: pc });
    p.position.set(x, 0, z);
    g.add(p);
    col.addCentered(x, z, 0.42, 0.42);
  }

  // --------------------------------------------- puzzle B: rainbow books
  const shelfX = R.x0 + 0.17;
  const shelf = bookshelf({ w: 1.5, h: 1.45, d: 0.32, shelves: 3, fill: false, wood: 'light' });
  shelf.position.set(shelfX, 0, fz);
  shelf.rotation.y = Math.PI / 2;
  g.add(shelf);
  col.addCentered(shelfX, fz, 0.36, 1.54);
  const gap = shelf.userData.shelfGap;
  // lower shelves get ordinary books
  for (let i = 0; i < 2; i++) {
    const row = bookRow(1.36, { height: Math.min(0.28, gap - 0.06), depth: 0.25 });
    row.position.set(shelfX + 0.02, i * gap + 0.035, fz);
    row.rotation.y = Math.PI / 2;
    g.add(row);
  }
  const pzB = gs.puzzles.r2b;
  const bookY = 2 * gap + 0.035;
  const bookSlots = BOOK_ORDER.map((_, i) => fz + 0.56 - i * 0.16); // left to right as she faces the wall
  const books = {};
  let selB = -1;
  const bookAnim = new Map();
  for (const name of BOOK_ORDER) {
    const h = 0.3 + rr(-0.02, 0.02);
    const bk = group([
      mesh(rbox(0.22, h, 0.12, 0.012, 2), mat(BOOK_PALETTE[name].hex, { rough: 0.6 }), { pos: [0, h / 2, 0] }),
      mesh(box(0.004, 0.02, 0.1), mat(0xf3e2b8), { pos: [0.112, h * 0.78, 0], cast: false }),
      mesh(box(0.004, 0.02, 0.1), mat(0xf3e2b8), { pos: [0.112, h * 0.22, 0], cast: false }),
    ]);
    g.add(bk);
    books[name] = bk;
    ctx.interact.add(bk, {
      zones: [ROOM],
      puzzle: 'r2b',
      enabled: () => !pzB.isSolved(),
      prompt: () => (selB === -1 ? PROMPTS.bookPick : pzB.order[selB] === name ? PROMPTS.bookPutBack : PROMPTS.bookSwap),
      onUse: () => {
        const i = pzB.order.indexOf(name);
        if (selB === -1) {
          selB = i;
          ctx.audio.click();
        } else if (selB === i) {
          selB = -1;
          ctx.audio.soft();
        } else {
          const a = selB;
          selB = -1;
          ctx.audio.slide();
          pzB.swap(a, i);
        }
        layoutBooks(false);
      },
    });
  }
  function layoutBooks(instant) {
    pzB.order.forEach((name, i) => {
      const target = new THREE.Vector3(shelfX + (i === selB ? 0.05 : 0.02), bookY + (i === selB ? 0.07 : 0), bookSlots[i]);
      const b = books[name];
      if (instant) {
        b.position.copy(target);
        bookAnim.delete(name);
      } else bookAnim.set(name, { from: b.position.clone(), to: target, t: 0 });
    });
  }
  // Stained-glass window above the shelf.
  const sg = document.createElement('canvas');
  sg.width = 512;
  sg.height = 200;
  drawRainbowWindow(sg.getContext('2d'), 512, 200, BOOK_ORDER, BOOK_PALETTE);
  const sgTex = canvasTexture(sg);
  const glass = group(
    [
      mesh(plane(1.4, 0.55), mat(0xffffff, { map: sgTex, emissive: 0xffffff, emissiveMap: sgTex, ei: 0.55, rough: 0.3 }), { cast: false }),
      mesh(rbox(1.5, 0.06, 0.06, 0.02), woodMat('dark'), { pos: [0, 0.3, 0] }),
      mesh(rbox(1.5, 0.06, 0.06, 0.02), woodMat('dark'), { pos: [0, -0.3, 0] }),
      mesh(rbox(0.06, 0.66, 0.06, 0.02), woodMat('dark'), { pos: [-0.73, 0, 0] }),
      mesh(rbox(0.06, 0.66, 0.06, 0.02), woodMat('dark'), { pos: [0.73, 0, 0] }),
    ],
    { pos: [R.x0 + 0.02, 2.05, fz], rot: [0, Math.PI / 2, 0] },
  );
  g.add(glass);
  ctx.interact.add(glass, {
    zones: [ROOM],
    puzzle: 'r2b',
    prompt: PROMPTS.glass,
    onUse: () => ctx.hud.toast(TOASTS.glass),
  });
  const glassGlow = glowSprite(0xffe0f0, 1.6, 0.18);
  glassGlow.position.set(R.x0 + 0.3, 2.05, fz);
  g.add(glassGlow);

  // ------------------------------------------- puzzle A: the vase stand
  const pzA = gs.puzzles.r2a;
  const standZ = R.zN + 0.22;
  const standX0 = -3.35;
  const slotX = (i) => standX0 + i * 0.29;
  const stand = group([], { pos: [0, 0, standZ] });
  const standW = 0.29 * 9 + 0.2;
  const sx = slotX(4);
  stand.add(mesh(rbox(standW, 0.05, 0.34, 0.02), woodMat('light'), { pos: [sx, 0.72, 0] }));
  stand.add(mesh(rbox(standW, 0.04, 0.3, 0.02), woodMat('light'), { pos: [sx, 0.22, 0] }));
  for (const x of [sx - standW / 2 + 0.06, sx + standW / 2 - 0.06])
    stand.add(mesh(rbox(0.06, 0.72, 0.3, 0.02), woodMat('light'), { pos: [x, 0.36, 0] }));
  g.add(stand);
  col.add(sx - standW / 2, standZ - 0.2, sx + standW / 2, standZ + 0.2);
  const slots = [];
  for (let i = 0; i < 9; i++) {
    const v = new THREE.LatheGeometry(
      [
        [0, 0],
        [0.05, 0.004],
        [0.06, 0.05],
        [0.04, 0.11],
        [0.032, 0.13],
        [0.038, 0.14],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      12,
    );
    const vm = mat(i < 6 ? C.cream : 0xf6efe2, { rough: 0.3 });
    const vase = mesh(v, vm);
    const tB = tulip('B', { scale: 1.05 });
    const tW = tulip('W', { scale: 1.05 });
    tB.position.y = tW.position.y = 0.06;
    const label = mesh(plane(0.06, 0.04), mat(0xffffff, { map: canvasTexture(numberCanvas(i + 1)), transparent: true }), {
      pos: [0, 0.07, 0.056],
      cast: false,
    });
    const slot = group([vase, tB, tW, label], { pos: [slotX(i), 0.745, standZ] });
    slot.userData = { tB, tW };
    g.add(slot);
    slots.push(slot);
    ctx.interact.add(slot, {
      zones: [ROOM],
      puzzle: 'r2a',
      enabled: () => !pzA.isSolved(),
      prompt: () => (pzA.isFixed(i) ? PROMPTS.vaseFixed : pzA.slots[i] ? PROMPTS.vaseChange : PROMPTS.vaseEmpty),
      onUse: () => {
        if (pzA.isFixed(i)) {
          ctx.audio.soft();
          ctx.hud.toast(TOASTS.vaseFixed);
          return;
        }
        vasePicker(ctx.game, pzA, i);
      },
    });
  }
  function layoutVases() {
    slots.forEach((s, i) => {
      const c = pzA.slots[i];
      s.userData.tB.visible = c === 'B';
      s.userData.tW.visible = c === 'W';
    });
  }
  pzA.onChange(() => layoutVases());
  const bask = basket({ r: 0.22, h: 0.2 });
  bask.position.set(-3.85, 0, R.zN + 0.85);
  for (let i = 0; i < 10; i++) {
    const t = tulip(i % 2 ? 'B' : 'W', { scale: 0.9 });
    t.position.set(rr(-0.1, 0.1), 0.02, rr(-0.1, 0.1));
    t.rotation.set(rr(-0.5, 0.5), rr(0, 6), rr(-0.5, 0.5));
    bask.add(t);
  }
  g.add(bask);
  col.addCentered(-3.85, R.zN + 0.85, 0.48, 0.48);
  ctx.interact.add(bask, {
    zones: [ROOM],
    puzzle: 'r2a',
    prompt: PROMPTS.basket,
    onUse: () => ctx.hud.toast(TOASTS.basket),
  });

  // pictures on the south wall
  const pf = pictureFrame(0.5, 0.4, nightSky(256, 200), { frame: C.woodLight });
  pf.position.set(-2.4, 1.7, R.zS - 0.03);
  pf.rotation.y = Math.PI;
  g.add(pf);

  // ----------------------------------------------------------------- door
  ctx.doors[ROOM] = new Door(ctx, ROOM, { color: C.blushDeep });

  // ------------------------------------------------------------------ cats
  const N = ctx.cats.addZone(ROOM, [
    [-1.4, -8.0],
    [-2.5, -10.8],
    [-2.2, -6.4],
    [1.6, -6.6],
    [3.2, -8.0, 0, 3],
    [3.15, -9.6, 0, 4],
    [0.62, -9.25, 0.47, 7],
    [-0.4, -9.2],
    [-1.0, -12.2],
  ]);
  void N;

  ctx.addUpdate((dt, t) => {
    mantelLights.userData.twinkle(t);
    flames.forEach((f, i) => {
      f.scale.set(1, 0.8 + Math.sin(t * (7 + i) + i * 2) * 0.25 + Math.sin(t * 13 + i) * 0.1, 1);
    });
    fireGlow.material.opacity = 0.65 + Math.sin(t * 9) * 0.08 + Math.sin(t * 15.3) * 0.05;
    const rig = ctx.rooms[ROOM]?.rig;
    if (rig) rig.points[0].flicker = 0.85 + Math.sin(t * 8.3) * 0.1 + Math.sin(t * 13.1) * 0.06;
    for (const [name, a] of bookAnim) {
      a.t = Math.min(1, a.t + dt / 0.35);
      const e = a.t * a.t * (3 - 2 * a.t);
      books[name].position.lerpVectors(a.from, a.to, e);
      books[name].position.x += Math.sin(e * Math.PI) * 0.18;
      if (a.t >= 1) bookAnim.delete(name);
    }
    if (pzA.isSolved()) slots.forEach((s, i) => (s.position.y = 0.745 + Math.max(0, Math.sin(t * 3 - i * 0.6)) * 0.01));
  });
  pzB.onChange((p, just) => {
    if (just) {
      selB = -1;
      layoutBooks(false);
    }
  });

  return {
    index: ROOM,
    rig: {
      hemi: { sky: 0xffe2c8, ground: 0x45323a, intensity: 0.65 },
      spot: { pos: [0.5, 2.7, fz], target: [0.8, 0, fz], color: 0xffdcae, intensity: 24, angle: 1.2, penumbra: 0.8 },
      points: [
        { pos: [fx - 0.7, 0.6, fz], color: 0xff9a50, intensity: 4.5 },
        { pos: [3.75, 1.5, R.zN + 0.45], color: 0xffc98a, intensity: 2.2 },
        { pos: [-2.0, 1.9, R.zN + 1.3], color: 0xffe2c8, intensity: 2.2 },
      ],
      fog: { color: 0x2b2130, near: 10, far: 28 },
    },
    anchors: { r2a: new THREE.Vector3(slotX(4), 0.85, standZ), r2b: new THREE.Vector3(shelfX, 1.2, fz) },
    keySpawn: (id) => (id === 'r2a' ? new THREE.Vector3(slotX(7), 1.2, standZ + 0.4) : new THREE.Vector3(shelfX + 0.5, 1.4, fz)),
    applyState() {
      selB = -1;
      layoutBooks(true);
      layoutVases();
    },
  };
}

function numberCanvas(n) {
  const c = document.createElement('canvas');
  c.width = 96;
  c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(253,247,236,0.95)';
  x.beginPath();
  x.roundRect ? x.roundRect(8, 6, 80, 52, 14) : x.rect(8, 6, 80, 52);
  x.fill();
  x.fillStyle = '#7a665b';
  x.font = 'bold 40px "Segoe UI", sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(String(n), 48, 34);
  return c;
}
