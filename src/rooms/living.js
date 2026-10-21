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
  hitArea,
} from '../engine/props.js';
import { buildRoomShell } from './shell.js';
import { Door } from './door.js';
import { drawPatternRug, drawRainbowWindow } from './art.js';
import { vasePicker } from '../ui/overlays.js';
import { ROOMS } from '../engine/layout.js';
import { PROMPTS, TOASTS, RUG_SHOWN, VASE_SLOTS } from '../config.js';
import { placeNote } from './notes.js';
import { fill } from '../engine/text.js';
import { lampSwitch, liftableCushion, toyMouse } from './cozy.js';

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
  // Flames: orange outer tongues with smaller yellow hearts in front, soft
  // enough to stay orange instead of glowing white.
  const fireMat = mat(0xff8a30, { emissive: 0xff5a10, ei: 1.25, rough: 1 });
  const coreMat = mat(0xffd27a, { emissive: 0xffb03a, ei: 1.1, rough: 1 });
  const flameGeo = new THREE.ConeGeometry(0.07, 0.3, 7).translate(0, 0.15, 0);
  const coreGeo = new THREE.ConeGeometry(0.04, 0.17, 7).translate(0, 0.085, 0);
  const flames = [];
  for (let i = 0; i < 5; i++) {
    const z = -0.24 + i * 0.12;
    for (const [geo, m, x, s] of [
      [flameGeo, fireMat, -0.25, 1 - Math.abs(i - 2) * 0.14],
      [coreGeo, coreMat, -0.2, 1 - Math.abs(i - 2) * 0.1],
    ]) {
      const f = mesh(geo, m, { pos: [x, 0.21, z], cast: false });
      f.userData.dynamic = true;
      f.userData.base = s;
      fp.add(f);
      flames.push(f);
    }
  }
  const fireGlow = glowSprite(0xff9a50, 1.3, 0.75);
  fireGlow.position.set(-0.3, 0.4, 0);
  fp.add(fireGlow);
  g.add(fp);
  // Poke the fire: sparks, crackles, and it burns brighter for a moment.
  let fireBoost = 0;
  const fireHit = hitArea(0.1, 0.7, 0.85);
  fireHit.position.set(-0.5, 0.42, 0);
  fp.add(fireHit);
  ctx.interact.add(fireHit, {
    zones: [ROOM],
    prompt: PROMPTS.fire,
    onUse: () => {
      fireBoost = 1;
      const at = new THREE.Vector3(fx - 0.3, 0.45, fz);
      ctx.audio.crackle(at);
      ctx.particles.burst(at, {
        kind: 'sparkle',
        count: 22,
        color: [0xffb050, 0xff7a20, 0xffe0a0],
        speed: 0.5,
        size: 0.035,
        gravity: -0.5,
        up: 1.2,
        spread: 0.5,
        life: 1.3,
      });
    },
  });
  col.add(fx - 0.62, fz - 0.98, fx, fz + 0.98);
  // Mantel things: a big vase with the note under it, candles, a clock.
  const bigVase = vaseWithTulips({ colors: ['B', 'W', 'B', 'W', 'B', 'W', 'B'], vaseColor: C.cream, h: 0.28 });
  bigVase.position.set(fx - 0.3, 1.28, fz - 0.55);
  g.add(bigVase);
  // The note is tucked under the big vase and sticks out over the mantel's edge.
  placeNote(ctx, ROOM, 1, { pos: [fx - 0.47, 1.281, fz - 0.55], rotY: -Math.PI / 2 + 0.12, mode: 'flat' });
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
  const sofaCushions = [];
  for (const [z, color, tex] of [
    [-0.6, C.cream, fabric(C.cream, { stripes: C.tulipBlue })],
    [0.55, C.sage, null],
  ]) {
    const cu = cushion(0.38, 0.14, 0.36, color, tex);
    cu.position.set(0.42, 0.72, fz + z);
    cu.rotation.set(0, Math.PI / 2, -0.45);
    g.add(cu);
    sofaCushions.push(cu);
  }
  // Something has been lost under the striped cushion.
  const mouse = toyMouse();
  mouse.position.set(0.52, 0.535, fz - 0.6);
  mouse.rotation.y = 2.2;
  g.add(mouse);
  // Lifted, the cushion is set aside along the sofa so the mouse shows.
  liftableCushion(ctx, ROOM, sofaCushions[0], { find: 'mouse', findObject: mouse, lift: [0.08, 0.05, 0.3], tilt: 0.25 });
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
  // The pattern rug: woven with the start of this game's vase pattern.
  const rugFor = (seq) => rug(0x8a5f6a, C.cream, C.blush, (x, w, h) => drawPatternRug(x, w, h, seq), [768, 420]);
  let rugSeq = gs.puzzles.r2a.solution.slice(0, RUG_SHOWN).join('');
  const prug = rugMesh(rugFor(rugSeq.split('')), 2.7, 1.5);
  prug.material = prug.material.clone(); // its picture changes per game
  const redrawRug = () => {
    const seq = gs.puzzles.r2a.solution.slice(0, RUG_SHOWN).join('');
    if (seq === rugSeq) return;
    rugSeq = seq;
    prug.material.map.dispose();
    prug.material.map = rugFor(seq.split(''));
    prug.material.needsUpdate = true;
    ctx.interact.invalidate(prug.material);
  };
  const rugG = group([prug], { pos: [2.15, 0, fz], rot: [0, -Math.PI / 2, 0] });
  g.add(rugG);
  const rugItem = ctx.interact.add(rugG, {
    zones: [ROOM],
    puzzle: 'r2a',
    prompt: PROMPTS.rug,
    onUse: () => ctx.hud.toast(fill(TOASTS.rug, { SEQ: gs.puzzles.r2a.startWords(RUG_SHOWN) })),
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
  lampSwitch(ctx, ROOM, fl);
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
      prompt: PROMPTS.bookTurn,
      alt: true, // can also turn the other way
      onUse: (alt) => {
        pzB.turn(pzB.order.indexOf(name), alt ? -1 : 1);
        ctx.audio.slide();
        layoutBooks(false);
      },
    });
  }
  function layoutBooks(instant) {
    pzB.order.forEach((name, i) => {
      const target = new THREE.Vector3(shelfX + 0.02, bookY, bookSlots[i]);
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
  const standX0 = -3.5;
  const SP = 0.235;
  const slotX = (i) => standX0 + i * SP;
  const stand = group([], { pos: [0, 0, standZ] });
  const standW = SP * VASE_SLOTS + 0.16;
  const sx = (slotX(0) + slotX(VASE_SLOTS - 1)) / 2;
  stand.add(mesh(rbox(standW, 0.05, 0.34, 0.02), woodMat('light'), { pos: [sx, 0.72, 0] }));
  stand.add(mesh(rbox(standW, 0.04, 0.3, 0.02), woodMat('light'), { pos: [sx, 0.22, 0] }));
  for (const x of [sx - standW / 2 + 0.06, sx + standW / 2 - 0.06])
    stand.add(mesh(rbox(0.06, 0.72, 0.3, 0.02), woodMat('light'), { pos: [x, 0.36, 0] }));
  g.add(stand);
  col.add(sx - standW / 2, standZ - 0.2, sx + standW / 2, standZ + 0.2);
  const plantedVase = mat(C.cream, { rough: 0.3 });
  const emptyVase = mat(0xf6efe2, { rough: 0.3 });
  const slots = [];
  for (let i = 0; i < VASE_SLOTS; i++) {
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
    const vase = mesh(v, pzA.isFixed(i) ? plantedVase : emptyVase);
    const tB = tulip('B', { scale: 1.05 });
    const tW = tulip('W', { scale: 1.05 });
    tB.position.y = tW.position.y = 0.06;
    const label = mesh(plane(0.06, 0.04), mat(0xffffff, { map: canvasTexture(numberCanvas(i + 1)), transparent: true }), {
      pos: [0, 0.07, 0.056],
      cast: false,
    });
    const slot = group([vase, tB, tW, label], { pos: [slotX(i), 0.745, standZ] });
    slot.userData = { tB, tW, vase };
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
      // Planted-from-the-start vases are a warmer cream (they change per game).
      const m = pzA.isFixed(i) ? plantedVase : emptyVase;
      if (s.userData.vase.material !== m && s.userData.vase.material !== s.userData.vase.userData.hiMat) s.userData.vase.material = m;
    });
  }
  pzA.onChange(() => layoutVases());
  const bask = basket({ r: 0.22, h: 0.2 });
  bask.position.set(-3.85, 0, R.zN + 0.85);
  // A bouquet standing in the basket: stems inside, heads above the rim.
  for (let i = 0; i < 11; i++) {
    const t = tulip(i % 2 ? 'B' : 'W', { scale: 0.85 + (i % 3) * 0.06 });
    const a = (i / 11) * Math.PI * 2;
    const rad = i === 0 ? 0 : 0.05 + (i % 2) * 0.05;
    t.position.set(Math.cos(a) * rad, 0.015, Math.sin(a) * rad);
    // lean gently outwards
    t.rotation.set(Math.sin(a) * rad * 2.2, 0, -Math.cos(a) * rad * 2.2);
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
    fireBoost = Math.max(0, fireBoost - dt * 0.4);
    flames.forEach((f, i) => {
      const k = f.userData.base * (1 + fireBoost * 0.35);
      f.scale.set(k, (0.8 + Math.sin(t * (7 + i) + i * 2) * 0.25 + Math.sin(t * 13 + i) * 0.1) * k, k);
    });
    fireGlow.material.opacity = 0.65 + Math.sin(t * 9) * 0.08 + Math.sin(t * 15.3) * 0.05 + fireBoost * 0.2;
    const rig = ctx.rooms[ROOM]?.rig;
    if (rig) rig.points[0].flicker = (0.85 + Math.sin(t * 8.3) * 0.1 + Math.sin(t * 13.1) * 0.06) * (1 + fireBoost * 0.5);
    for (const [name, a] of bookAnim) {
      a.t = Math.min(1, a.t + dt / 0.4);
      const e = a.t * a.t * (3 - 2 * a.t);
      books[name].position.lerpVectors(a.from, a.to, e);
      // Books moving more than one place hop out over the others.
      const far = Math.abs(a.to.z - a.from.z) > 0.2;
      books[name].position.x += Math.sin(e * Math.PI) * (far ? 0.2 : 0.07);
      if (a.t >= 1) bookAnim.delete(name);
    }
    // Show which three books a click will turn: they lift a little.
    const hov = ctx.interact.hover;
    const hi = hov && !pzB.isSolved() ? BOOK_ORDER.find((n) => hov.object === books[n]) : null;
    const center = hi ? pzB.centerFor(pzB.order.indexOf(hi)) : -10;
    pzB.order.forEach((n, i) => {
      if (bookAnim.has(n)) return;
      const lift = Math.abs(i - center) <= 1 ? 0.025 : 0;
      books[n].position.y += (bookY + lift - books[n].position.y) * Math.min(1, dt * 12);
    });
    if (pzA.isSolved()) slots.forEach((s, i) => (s.position.y = 0.745 + Math.max(0, Math.sin(t * 3 - i * 0.6)) * 0.01));
  });
  pzB.onChange((p, just) => {
    if (just) {
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
      layoutBooks(true);
      layoutVases();
      redrawRug();
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
