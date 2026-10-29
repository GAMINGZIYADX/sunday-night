import * as THREE from 'three';
import { COLORS } from '../config.js';
import { mat, mesh, group, rbox, box, cyl, sphere, plane, torus } from '../engine/materials.js';
import { fabric, rug, nightSky, canvasTexture, paperTexture, magnetTexture, rr, ROUND_FONT, makeCanvas } from '../engine/textures.js';
import {
  woodMat,
  stringLights,
  rugMesh,
  curtain,
  mug,
  pottedPlant,
  hangingPlant,
  windowFrame,
  chair,
  table,
  teapot,
  plate,
  jar,
  pendantLamp,
  wallShelf,
  vaseWithTulips,
} from '../engine/props.js';
import { buildRoomShell } from './shell.js';
import { Door } from './door.js';
import { drawCipherWheel } from './art.js';
import { kettle, openableWindow, cookieJar, catCookie } from './cozy.js';
import { cipherOverlay } from '../ui/overlays.js';
import { ROOMS } from '../engine/layout.js';
import { PROMPTS, TOASTS, WORLD_TEXT } from '../config.js';
import { placeNote } from './notes.js';
import { bakingStation, tableShortcake } from './bake.js';
import { fill } from '../engine/text.js';

const C = COLORS;
const MAGNET_COLORS = [0xe57373, 0x64b5f6, 0xffd54f, 0x81c784, 0xba68c8, 0xffb74d, 0x4db6ac, 0xf48fb1];

// A thin box drawn with one texture, so one draw call instead of six: the +X
// face shows the left 96 pixels of a 128-wide texture, the other faces the
// plain strip on its right.
function faceBox(w, h, d) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    if (i < 4) uv.setX(i, uv.getX(i) * 0.75);
    else uv.setXY(i, 0.875, 0.5);
  }
  geo.clearGroups();
  return geo;
}

export function buildKitchen(ctx) {
  const ROOM = 2;
  const R = ROOMS[ROOM];
  const g = ctx.roomGroup(ROOM);
  const col = ctx.collision;
  const gs = ctx.gs;
  buildRoomShell(ctx, ROOM, { wall: 0xf6efe0, wallAccent: C.tulipBlue, pattern: 'tiles', lower: 0xbfd3c0, floor: 0xc9a27a });
  const fz = R.cz;

  // -------------------------------------------------------------- counter
  const cx = R.x1 - 0.32;
  const z0 = R.zS - 0.6;
  const z1 = R.zN + 0.45;
  const cab = mat(0xa9c4b0, { rough: 0.6 });
  const top = mat(0xf4efe6, { rough: 0.35 });
  // In two runs either side of the stove: one worktop through it would sit
  // level with the hob and flicker (z-fighting).
  const run = (a, b, grow) => {
    g.add(mesh(rbox(0.62, 0.86, b - a, 0.02), cab, { pos: [cx, 0.43, (a + b) / 2] }));
    g.add(mesh(rbox(0.68, 0.05, b - a + grow, 0.015), top, { pos: [cx - 0.02, 0.885, (a + b) / 2 + (a < fz ? -grow / 2 : grow / 2)] }));
  };
  run(z1, fz - 0.392, 0.02);
  run(fz + 0.392, z0, 0.02);
  col.add(cx - 0.36, z1 - 0.02, R.x1, z0 + 0.02);
  // cupboard doors + knobs
  const doorM = mat(0xb9d2bf, { rough: 0.6 });
  for (let z = z1 + 0.3; z < z0 - 0.2; z += 0.6) {
    if (Math.abs(z - fz) < 0.45) continue; // the stove goes here
    g.add(mesh(rbox(0.02, 0.62, 0.54, 0.01), doorM, { pos: [cx - 0.315, 0.45, z] }));
    g.add(mesh(sphere(0.018, 8, 6), mat(C.gold, { metal: 0.6, rough: 0.3 }), { pos: [cx - 0.335, 0.66, z + 0.2] }));
  }
  // upper cupboards
  for (let z = z1 + 0.35; z < z0 - 0.3; z += 0.7) {
    if (Math.abs(z - fz) < 0.5) continue;
    g.add(mesh(rbox(0.36, 0.6, 0.66, 0.02), cab, { pos: [R.x1 - 0.18, 1.95, z] }));
    g.add(mesh(sphere(0.016, 8, 6), mat(C.gold, { metal: 0.6 }), { pos: [R.x1 - 0.37, 1.72, z + 0.25] }));
  }
  // range hood over the stove
  g.add(
    mesh(new THREE.CylinderGeometry(0.18, 0.42, 0.45, 4, 1).rotateY(Math.PI / 4), mat(0xe9e2d6, { rough: 0.4 }), { pos: [R.x1 - 0.3, 2.15, fz] }),
  );

  // ------------------------------------------------------- stove + dials
  const stove = group([], { pos: [cx, 0, fz] });
  stove.add(mesh(rbox(0.64, 0.88, 0.76, 0.02), mat(0xf2ede4, { rough: 0.35 }), { pos: [0, 0.44, 0] }));
  stove.add(mesh(rbox(0.66, 0.03, 0.78, 0.01), mat(0x3a3438, { rough: 0.3 }), { pos: [0, 0.895, 0] }));
  for (const [x, z] of [
    [-0.12, -0.18],
    [-0.12, 0.18],
    [0.12, -0.18],
    [0.12, 0.18],
  ])
    stove.add(mesh(torus(0.07, 0.01, 6, 18), mat(0x1e1a1c), { pos: [x, 0.915, z], rot: [Math.PI / 2, 0, 0] }));
  const ovenWin = mesh(rbox(0.02, 0.32, 0.5, 0.02), mat(0x2a2224, { emissive: 0xff9a40, ei: 0.0, rough: 0.2 }), {
    pos: [-0.325, 0.4, 0],
    cast: false,
  });
  ovenWin.userData.dynamic = true;
  stove.add(ovenWin);
  stove.add(mesh(cyl(0.012, 0.012, 0.5, 8), mat(0xd8c4a0, { metal: 0.6 }), { pos: [-0.36, 0.63, 0], rot: [Math.PI / 2, 0, 0] }));
  const panel = mesh(rbox(0.04, 0.12, 0.76, 0.01), mat(0xe6ded0), { pos: [-0.33, 0.8, 0] });
  stove.add(panel);
  g.add(stove);
  g.add(kettle(ctx, ROOM, { pos: [cx + 0.12, 0.92, fz + 0.18] }));
  const pzB = gs.puzzles.r3b;
  const dials = [];
  const DIALS = pzB.count;
  for (let i = 0; i < DIALS; i++) {
    const face = makeCanvas(128, 128);
    const tex = canvasTexture(face);
    const knob = group([
      mesh(cyl(0.045, 0.05, 0.035, 20), mat(0xf8f4ec, { rough: 0.3 }), { rot: [0, 0, Math.PI / 2] }),
      mesh(box(0.012, 0.012, 0.07), mat(0x4a3a33), { pos: [-0.02, 0, 0], rot: [0, 0, 0] }),
    ]);
    const faceMesh = mesh(plane(0.1, 0.1), mat(0xffffff, { map: tex, transparent: true }), {
      pos: [-0.02, 0, 0],
      rot: [0, -Math.PI / 2, 0],
      cast: false,
    });
    const pivot = group([knob]);
    const holder = group([pivot, faceMesh], { pos: [cx - 0.375, 0.8, fz + (i - (DIALS - 1) / 2) * 0.18] });
    // the number ring sits on a plate behind the knob
    const ringC = makeCanvas(256, 256);
    const rc = ringC.getContext('2d');
    rc.fillStyle = '#efe6d6';
    rc.beginPath();
    rc.arc(128, 128, 124, 0, Math.PI * 2);
    rc.fill();
    rc.fillStyle = '#5a4a40';
    rc.font = `bold 30px ${ROUND_FONT}`;
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    for (let n = 0; n < 10; n++) {
      const a = -Math.PI / 2 + (n / 10) * Math.PI * 2;
      rc.fillText(String(n), 128 + Math.cos(a) * 98, 128 + Math.sin(a) * 98);
    }
    const ring = mesh(plane(0.16, 0.16), mat(0xffffff, { map: canvasTexture(ringC), transparent: true }), {
      pos: [0.012, 0, 0],
      rot: [0, -Math.PI / 2, 0],
      cast: false,
    });
    holder.add(ring);
    g.add(holder);
    dials.push({ pivot, face, tex, holder, angle: 0 });
    ctx.interact.add(holder, {
      zones: [ROOM],
      puzzle: 'r3b',
      enabled: () => !pzB.isSolved(),
      prompt: () => fill(PROMPTS.dial, { N: i + 1, V: pzB.values[i] }),
      alt: true, // can also turn the other way
      onUse: (alt) => {
        pzB.turn(i, alt ? -1 : 1);
        ctx.audio.click();
      },
    });
  }
  // The knob face: the current number, large.
  function drawDials() {
    dials.forEach((d, i) => {
      const x = d.face.getContext('2d');
      x.clearRect(0, 0, 128, 128);
      x.fillStyle = pzB.isSolved() ? '#e9b640' : '#4a3a33';
      x.font = `bold 64px ${ROUND_FONT}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(String(pzB.values[i]), 64, 34);
      d.tex.needsUpdate = true;
      d.target = (pzB.values[i] / 10) * Math.PI * 2;
    });
    ovenWin.material.emissiveIntensity = pzB.isSolved() ? 1.4 : 0;
  }
  pzB.onChange(() => drawDials());
  // Recipe card on the backsplash.
  // Printed cards whose words change per game (the randomiser): redrawn in applyState.
  const reprint = (cardMesh, make) => {
    let shown = null;
    return (text) => {
      if (text === shown) return;
      shown = text;
      const old = cardMesh.material.map;
      cardMesh.material.map = make(text);
      cardMesh.material.needsUpdate = true;
      if (old) old.dispose();
      ctx.interact.invalidate(cardMesh.material);
    };
  };
  const recipeCard = mesh(plane(0.34, 0.4), mat(0xffffff, { unique: true }), { cast: false });
  const drawRecipe = reprint(recipeCard, (text) =>
    paperTexture(text, { w: 340, h: 400, size: 21, title: WORLD_TEXT.recipeTitle, bg: '#fff7ea', lines: true }),
  );
  drawRecipe(pzB.recipe);
  const recipe = group([recipeCard, mesh(sphere(0.012, 6, 4), mat(0xe57373), { pos: [0, 0.18, 0.01], cast: false })], {
    pos: [R.x1 - 0.02, 1.38, fz + 0.62],
    rot: [0, -Math.PI / 2, 0.04],
  });
  g.add(recipe);
  ctx.interact.add(recipe, { zones: [ROOM], puzzle: 'r3b', prompt: PROMPTS.recipe, onUse: () => ctx.showClue('recipe') });
  // Sink + window.
  const sinkZ = z0 - 0.75;
  g.add(mesh(rbox(0.42, 0.06, 0.55, 0.02), mat(0xd6dde2, { metal: 0.4, rough: 0.3 }), { pos: [cx - 0.04, 0.89, sinkZ] }));
  g.add(mesh(cyl(0.012, 0.012, 0.3, 8), mat(0xd6dde2, { metal: 0.7, rough: 0.2 }), { pos: [R.x1 - 0.12, 1.05, sinkZ] }));
  g.add(mesh(cyl(0.01, 0.01, 0.18, 8), mat(0xd6dde2, { metal: 0.7, rough: 0.2 }), { pos: [R.x1 - 0.2, 1.19, sinkZ], rot: [0, 0, Math.PI / 2] }));
  const win = windowFrame(1.0, 0.9, nightSky(256, 256));
  win.position.set(R.x1 - 0.04, 1.6, sinkZ);
  win.rotation.y = -Math.PI / 2;
  g.add(win);
  const wc = curtain(1.1, 0.35, C.blush, { folds: 3, depth: 0.02 });
  wc.position.set(R.x1 - 0.1, 2.1, sinkZ);
  wc.rotation.y = -Math.PI / 2;
  g.add(wc);
  openableWindow(ctx, ROOM, win, wc);
  // Counter things.
  const tp = teapot(C.sage);
  tp.position.set(cx - 0.05, 0.91, z1 + 0.5);
  g.add(tp);
  for (let i = 0; i < 3; i++) {
    const j = jar([0xe8c48a, 0xf2c4c0, 0xc9e0b8][i], 0.14 + i * 0.03);
    j.position.set(R.x1 - 0.14, 0.91, z1 + 1.0 + i * 0.13);
    g.add(j);
    // The first one is the cookie jar.
    if (i === 0) cookieJar(ctx, ROOM, j, { find: 'cookie', findObject: catCookie() });
  }
  const pl = plate(C.cream, 0.11);
  pl.position.set(cx - 0.05, 0.91, z0 - 0.15);
  g.add(pl);
  const vk = vaseWithTulips({ colors: ['W', 'B', 'W'], vaseColor: C.tulipBlue, h: 0.16 });
  vk.position.set(cx + 0.05, 0.91, sinkZ + 0.5);
  g.add(vk);
  const herb = pottedPlant({ size: 0.45, potColor: C.cream });
  herb.position.set(R.x1 - 0.12, 1.13, sinkZ - 0.3);
  g.add(herb);

  // --------------------------------------------- the fridge and magnets
  const fx = R.x0 + 0.36;
  const fridgeZ = R.zN + 1.25;
  const fridge = group([], { pos: [fx, 0, fridgeZ] });
  const fm = mat(0xf2c4c0, { rough: 0.35 });
  fridge.add(mesh(rbox(0.7, 1.85, 0.78, 0.06, 3), fm, { pos: [0, 0.925, 0] }));
  fridge.add(mesh(box(0.01, 0.012, 0.74), mat(0xd9a39e), { pos: [0.352, 0.85, 0], cast: false }));
  for (const y of [1.35, 0.5]) fridge.add(mesh(rbox(0.04, 0.3, 0.04, 0.015), mat(0xf8f2ea, { metal: 0.3 }), { pos: [0.37, y, 0.3] }));
  g.add(fridge);
  col.addCentered(fx, fridgeZ, 0.74, 0.82);
  const frontX = fx + 0.36;
  // Sticky notes for decoration.
  const stickyColors = [0xfff2a8, 0xc9e8ff, 0xffd6e0];
  WORLD_TEXT.stickyNotes.slice(0, 3).forEach((t, i) => {
    const c = stickyColors[i];
    const tex = paperTexture(t, {
      w: 128,
      h: 128,
      size: 30,
      lines: false,
      bg: '#' + c.toString(16),
      stain: false,
      center: true,
    });
    g.add(
      mesh(plane(0.11, 0.11), mat(0xffffff, { map: tex }), {
        pos: [frontX + 0.004, 1.72 - i * 0.02, fridgeZ - 0.28 + i * 0.12],
        rot: [0, Math.PI / 2, rr(-0.2, 0.2)],
        cast: false,
      }),
    );
  });
  const pzA = gs.puzzles.r3a;
  const magGeo = faceBox(0.012, 0.065, 0.055);
  const letterMats = {};
  const letterMat = (ch) =>
    (letterMats[ch] ||= mat(0xffffff, { map: magnetTexture(ch, MAGNET_COLORS[ch.charCodeAt(0) % MAGNET_COLORS.length]), rough: 0.4 }));
  const magnets = group();
  for (let i = 0; i < 26; i++) {
    const ch = String.fromCharCode(65 + i);
    const row = Math.floor(i / 7);
    const colI = i % 7;
    const mg = mesh(magGeo, letterMat(ch), { cast: false }); // +X face shows the letter
    const z = fridgeZ + 0.3 - colI * 0.095 + rr(-0.012, 0.012);
    const y = 1.62 - row * 0.1 + rr(-0.012, 0.012);
    mg.position.set(frontX + 0.006, y, z);
    mg.rotation.x = rr(-0.25, 0.25);
    magnets.add(mg);
    ctx.interact.add(mg, {
      zones: [ROOM],
      puzzle: 'r3a',
      enabled: () => !pzA.isSolved(),
      prompt: fill(PROMPTS.magnet, { CH: ch }),
      onUse: () => {
        if (pzA.letters.length >= pzA.length) {
          ctx.audio.soft();
          ctx.hud.toast(TOASTS.stripFull);
          return;
        }
        pzA.addLetter(ch);
        ctx.audio.click();
      },
    });
  }
  g.add(magnets);
  // The magnetic strip with six slots.
  const stripC = makeCanvas(512, 96);
  const stripTex = canvasTexture(stripC);
  const stripW = 0.62;
  const strip = mesh(plane(stripW, 0.12), mat(0xffffff, { map: stripTex }), {
    pos: [frontX + 0.006, 1.08, fridgeZ + 0.02],
    rot: [0, Math.PI / 2, 0],
    cast: false,
  });
  g.add(strip);
  ctx.interact.add(strip, {
    zones: [ROOM],
    puzzle: 'r3a',
    enabled: () => !pzA.isSolved(),
    prompt: PROMPTS.strip,
    onUse: () => cipherOverlay(ctx.game, pzA),
  });
  function drawStrip() {
    const x = stripC.getContext('2d');
    x.clearRect(0, 0, 512, 96);
    x.fillStyle = pzA.isSolved() ? '#fff1c4' : '#f7f1e6';
    x.beginPath();
    x.roundRect ? x.roundRect(4, 4, 504, 88, 20) : x.rect(4, 4, 504, 88);
    x.fill();
    const n = pzA.length;
    const cw = 480 / n;
    for (let i = 0; i < n; i++) {
      const ch = pzA.letters[i];
      const sx = 16 + i * cw;
      if (ch) {
        x.fillStyle = '#' + MAGNET_COLORS[ch.charCodeAt(0) % MAGNET_COLORS.length].toString(16).padStart(6, '0');
        x.beginPath();
        x.roundRect ? x.roundRect(sx + 4, 12, cw - 8, 72, 10) : x.rect(sx + 4, 12, cw - 8, 72);
        x.fill();
        x.fillStyle = '#fff';
        x.font = `bold 56px ${ROUND_FONT}`;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText(ch, sx + cw / 2, 52);
      } else {
        x.strokeStyle = 'rgba(120,100,90,0.45)';
        x.setLineDash([8, 6]);
        x.lineWidth = 3;
        x.strokeRect(sx + 6, 14, cw - 12, 68);
        x.setLineDash([]);
      }
    }
    stripTex.needsUpdate = true;
  }
  pzA.onChange(() => {
    drawStrip();
    drawWheel();
  });
  // Eraser magnet: takes the last letter off.
  const eraserC = makeCanvas(128, 96); // see faceBox
  const ex = eraserC.getContext('2d');
  ex.fillStyle = '#9c8b80';
  ex.fillRect(0, 0, 128, 96);
  ex.fillStyle = '#fff';
  ex.font = `bold 58px ${ROUND_FONT}`;
  ex.textAlign = 'center';
  ex.textBaseline = 'middle';
  ex.fillText('←', 48, 52);
  const eraser = mesh(faceBox(0.012, 0.07, 0.07), mat(0xffffff, { map: canvasTexture(eraserC) }), {
    pos: [frontX + 0.006, 1.08, fridgeZ - 0.345],
    cast: false,
  });
  g.add(eraser);
  ctx.interact.add(eraser, {
    zones: [ROOM],
    puzzle: 'r3a',
    enabled: () => !pzA.isSolved() && pzA.letters.length > 0,
    prompt: PROMPTS.eraser,
    onUse: () => {
      pzA.removeLast();
      ctx.audio.slide();
    },
  });
  // The heavy note, held by a magnet on the fridge door.
  placeNote(ctx, ROOM, 2, { pos: [frontX + 0.004, 0.6, fridgeZ + 0.06], rotY: Math.PI / 2, mode: 'wall', w: 0.2, h: 0.26 });
  g.add(mesh(cyl(0.02, 0.02, 0.012, 12), mat(0x64b5f6), { pos: [frontX + 0.012, 0.72, fridgeZ + 0.06], rot: [0, 0, Math.PI / 2], cast: false }));

  // ----------------------------------------- cipher poster + pinned card
  // The wheel poster turns: click to move the inner ring one step, right-click back.
  const wheelC = makeCanvas(400, 480);
  const wheelTex = canvasTexture(wheelC);
  const drawWheel = () => {
    drawCipherWheel(wheelC.getContext('2d'), 400, 480, pzA.wheel);
    wheelTex.needsUpdate = true;
  };
  const poster = group(
    [
      mesh(plane(0.5, 0.6), mat(0xffffff, { map: wheelTex }), { cast: false }),
      mesh(rbox(0.54, 0.64, 0.02, 0.008), woodMat('light'), { pos: [0, 0, -0.012] }),
    ],
    { pos: [R.x0 + 0.03, 1.6, fridgeZ + 1.05], rot: [0, Math.PI / 2, 0] },
  );
  g.add(poster);
  ctx.interact.add(poster, {
    zones: [ROOM],
    puzzle: 'r3a',
    prompt: () => fill(PROMPTS.wheel, { TO: String.fromCharCode(65 + pzA.wheel) }),
    alt: true, // can also turn the other way
    onUse: (alt) => {
      pzA.turnWheel(alt ? -1 : 1);
      ctx.audio.click();
    },
  });
  const cipherCard = mesh(plane(0.46, 0.2), mat(0xffffff, { unique: true }), { cast: false });
  const drawCipherCard = reprint(cipherCard, (text) =>
    paperTexture(text, {
      w: 512,
      h: 224,
      size: text.length > 20 ? 40 : 52,
      font: '"Courier New", ui-monospace, monospace',
      lines: false,
      bg: '#fffaf0',
      center: true,
      stain: false,
    }),
  );
  drawCipherCard(pzA.encoded);
  const ccard = group([cipherCard, mesh(sphere(0.012, 6, 4), mat(0xe57373), { pos: [-0.21, 0.08, 0.01], cast: false })], {
    pos: [R.x0 + 0.03, 1.62, fridgeZ + 1.66],
    rot: [0, Math.PI / 2, -0.04],
  });
  g.add(ccard);
  ctx.interact.add(ccard, { zones: [ROOM], puzzle: 'r3a', prompt: PROMPTS.card, onUse: () => ctx.showClue('cipherCard', true) });

  // ---------------------------------------------------- table and chairs
  const tx = -0.6;
  const tz = fz + 0.2;
  const tbl = table({ w: 1.05, h: 0.74, round: true, wood: 'light' });
  tbl.position.set(tx, 0, tz);
  g.add(tbl);
  col.addCentered(tx, tz, 1.0, 1.0);
  const cloth = mesh(cyl(0.45, 0.45, 0.004, 24), mat(0xffffff, { map: fabric(C.cream, { checks: C.blush }) }), { pos: [tx, 0.745, tz], cast: false });
  g.add(cloth);
  for (const [dx, ry] of [
    [-0.78, Math.PI / 2],
    [0.78, -Math.PI / 2],
  ]) {
    const ch = chair({ color: woodMat('light'), cushionColor: C.blush });
    ch.position.set(tx + dx, 0, tz);
    ch.rotation.y = ry;
    g.add(ch);
    col.addCentered(tx + dx, tz, 0.46, 0.46);
  }
  const mugA = mug(C.tulipBlue, { steam: true });
  mugA.position.set(tx - 0.2, 0.745, tz + 0.05);
  mugA.rotation.y = 0.6;
  g.add(mugA);
  const mugB = mug(0xfbf7f0, { steam: true });
  mugB.position.set(tx + 0.2, 0.745, tz - 0.05);
  mugB.rotation.y = 2.6;
  g.add(mugB);
  const tv = vaseWithTulips({ colors: ['B', 'W'], vaseColor: C.cream, h: 0.13 });
  tv.position.set(tx, 0.745, tz - 0.18);
  g.add(tv);
  const pend = pendantLamp({ drop: 0.75, color: C.cream });
  pend.position.set(tx, 2.8, tz);
  g.add(pend);
  const hp = hangingPlant({ length: 0.55 });
  hp.position.set(R.x0 + 0.8, 2.15, R.zS - 0.8);
  g.add(hp);
  const hp2 = hangingPlant({ length: 0.45 });
  hp2.position.set(1.6, 2.25, R.zS - 0.7);
  g.add(hp2);
  // Baking: the ingredients between the jars and the stove, the finished
  // shortcake on the table (the cats come and sit just south of it).
  bakingStation(ctx, new THREE.Vector3(cx - 0.07, 0.905, fz - 1.1));
  const catSpots = [
    { x: tx - 0.3, z: tz + 0.9 },
    { x: tx + 0.3, z: tz + 0.9 },
  ];
  tableShortcake(ctx, new THREE.Vector3(tx, 0.749, tz + 0.15), catSpots);
  const krug = rugMesh(rug(C.sage, C.cream, C.cream), 2.0, 2.0);
  krug.position.set(tx, 0.006, tz);
  g.add(krug);
  // Shelf with jars on the north wall.
  const ws = wallShelf(1.0);
  ws.position.set(-1.9, 1.75, R.zN + 0.12);
  g.add(ws);
  for (let i = 0; i < 4; i++) {
    const j = jar([0xe8c48a, 0xf2c4c0, 0xc9e0b8, 0xf7ecd9][i], 0.12 + (i % 2) * 0.04);
    j.position.set(-2.25 + i * 0.22, 1.77, R.zN + 0.12);
    g.add(j);
  }
  const sl = stringLights(
    [
      [-3.4, 2.6, R.zS - 0.08],
      [3.0, 2.6, R.zS - 0.08],
    ],
    { bulbs: 22, sag: 0.14 },
  );
  g.add(sl);
  const plant = pottedPlant({ size: 1.0, potColor: C.blush });
  plant.position.set(-3.0, 0, R.zS - 0.45);
  g.add(plant);
  col.addCentered(-3.0, R.zS - 0.45, 0.4, 0.4);

  ctx.doors[ROOM] = new Door(ctx, ROOM, { color: C.tulipBlue });

  ctx.cats.addZone(ROOM, [
    [1.2, -17.2],
    [1.9, -19.4],
    [-2.0, -17.0],
    [-1.9, -20.4, 0, 2],
    [0.9, -21.3],
    [1.9, -16.6],
    // By the table, where they sit to look at the shortcake.
    [tx - 0.3, tz + 0.9],
    [tx + 0.3, tz + 0.9],
  ]);

  ctx.addUpdate((dt, t) => {
    sl.userData.twinkle(t);
    dials.forEach((d) => {
      d.angle += ((d.target ?? 0) - d.angle) * Math.min(1, dt * 12);
      d.pivot.rotation.x = d.angle;
    });
  });

  return {
    index: ROOM,
    rig: {
      hemi: { sky: 0xffeedd, ground: 0x45383a, intensity: 0.7 },
      spot: { pos: [tx, 2.65, tz], target: [tx + 0.3, 0, tz], color: 0xffe0b0, intensity: 22, angle: 1.2, penumbra: 0.8 },
      points: [
        { pos: [R.x1 - 0.7, 1.5, fz], color: 0xffd6a0, intensity: 2.4 },
        { pos: [R.x0 + 1.0, 1.9, fridgeZ + 0.6], color: 0xfff0e0, intensity: 2.0 },
        { pos: [0, 2.2, R.zS - 0.6], color: 0xffd38a, intensity: 1.4 },
      ],
      fog: { color: 0x2b2130, near: 10, far: 26 },
    },
    anchors: { r3a: new THREE.Vector3(frontX, 1.2, fridgeZ), r3b: new THREE.Vector3(cx - 0.36, 0.8, fz) },
    keySpawn: (id) =>
      id === 'r3a'
        ? new THREE.Vector3(frontX + 0.45, 1.25, fridgeZ)
        : { pos: new THREE.Vector3(cx - 0.9, 0.9, fz), from: new THREE.Vector3(cx - 0.3, 0.4, fz) },
    applyState() {
      drawRecipe(pzB.recipe);
      drawCipherCard(pzA.encoded);
      drawStrip();
      drawWheel();
      drawDials();
      dials.forEach((d) => (d.angle = d.target));
    },
  };
}
