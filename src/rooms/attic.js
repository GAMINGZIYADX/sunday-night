import * as THREE from 'three';
import { COLORS, PROMPTS, TOASTS, SIDE_ROOMS } from '../config.js';
import { ATTIC, ATTIC_ZONE, ATTIC_HOLE, HATCH, WALL_H, atticRoofY } from '../engine/layout.js';
import { mat, mesh, group, rbox, box, cyl, sphere, plane, torus } from '../engine/materials.js';
import { woodPlanks, nightSky, canvasTexture, makeCanvas, rug, fabric, paperTexture, HAND_FONT } from '../engine/textures.js';
import {
  hitArea,
  woodMat,
  glowSprite,
  stringLights,
  pendantLamp,
  rugMesh,
  cardboardBox,
  pictureFrame,
  candle,
  armchair,
  floorLamp,
  vaseWithTulips,
  cushion,
  blanket,
  bookRow,
} from '../engine/props.js';
import { floorMesh } from './shell.js';
import { foundIt, lampSwitch } from './cozy.js';
import { drawLockPicture, drawFramePicture } from './art.js';
import { photoImage, sizeOf } from './photo.js';
import { pianoOverlay, trunkOverlay, photoOverlay } from '../ui/overlays.js';

// The attic: up the ladder in the bedroom ceiling. An old piano that plays a
// tune to play back (it gives a card with a riddle), and a trunk with a
// picture lock under the round window. Inside the trunk: the photo.
//
// The attic is built apart from the house (see ATTIC in layout.js); the
// ladder fades the player between the two.

const C = COLORS;
const ROOM = ATTIC_ZONE;
const smooth = (k) => k * k * (3 - 2 * k);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Where the ladder leaves you: just off the attic hatch facing the window, and
// at the foot of the ladder in the bedroom facing the room.
export const ATTIC_ARRIVE = { x: -0.1, z: 23.0, yaw: 0 };
export const BEDROOM_ARRIVE = { x: (HATCH.x0 + HATCH.x1) / 2, z: 0.6, yaw: Math.PI };

// A 0..1 value that eases towards `to`; apply(k) runs while it moves.
function tween(ctx, apply, seconds) {
  const s = {
    v: 0,
    to: 0,
    set(v) {
      this.v = this.to = v;
      apply(v);
    },
  };
  ctx.addUpdate((dt) => {
    if (s.v === s.to) return;
    const step = dt / seconds;
    s.v = s.to > s.v ? Math.min(s.to, s.v + step) : Math.max(s.to, s.v - step);
    apply(s.v);
  });
  return s;
}

// --------------------------------------------------------- bedroom ladder
// A hatch in the bedroom ceiling with a cord. Pull it: the hatch swings down
// and a ladder slides out of the attic to the floor. It stays down (saved).
function buildLadder(ctx) {
  const g = ctx.roomGroup(0);
  const gs = ctx.gs;
  const hx = (HATCH.x0 + HATCH.x1) / 2;
  const hw = HATCH.x1 - HATCH.x0;
  const hd = HATCH.z1 - HATCH.z0;
  const y = WALL_H;
  const trim = mat(C.cream, { rough: 0.55 });
  // Trim around the opening.
  g.add(mesh(box(hw + 0.1, 0.03, 0.05), trim, { pos: [hx, y - 0.015, HATCH.z0 - 0.025], cast: false }));
  g.add(mesh(box(hw + 0.1, 0.03, 0.05), trim, { pos: [hx, y - 0.015, HATCH.z1 + 0.025], cast: false }));
  g.add(mesh(box(0.05, 0.03, hd), trim, { pos: [HATCH.x0 - 0.025, y - 0.015, (HATCH.z0 + HATCH.z1) / 2], cast: false }));
  g.add(mesh(box(0.05, 0.03, hd), trim, { pos: [HATCH.x1 + 0.025, y - 0.015, (HATCH.z0 + HATCH.z1) / 2], cast: false }));
  // Above the opening: warm attic light (a small box seen from inside).
  g.add(
    mesh(box(hw, 0.7, hd), mat(0x7a5a44, { emissive: 0xffb36b, ei: 0.45, side: THREE.BackSide, rough: 0.9 }), {
      pos: [hx, y + 0.35, (HATCH.z0 + HATCH.z1) / 2],
      cast: false,
      receive: false,
    }),
  );

  // The hatch door hinges on its north edge and swings down.
  const hinge = group([], { pos: [hx, y, HATCH.z0] });
  hinge.userData.dynamic = true;
  hinge.add(mesh(box(hw - 0.02, 0.03, hd - 0.02), mat(C.cream, { rough: 0.9 }), { pos: [0, -0.016, hd / 2], cast: false }));
  hinge.add(mesh(box(hw - 0.02, 0.025, hd - 0.02), woodMat('light'), { pos: [0, 0.013, hd / 2], cast: false }));
  // The cord with a wooden bead, hanging from the free end.
  const cord = group(
    [
      mesh(cyl(0.004, 0.004, 0.62, 5), mat(0xe8dcc8), { pos: [0, -0.31, 0], cast: false }),
      mesh(sphere(0.035, 12, 8), woodMat('mid'), { pos: [0, -0.64, 0], cast: false }),
    ],
    { pos: [0, -0.03, hd - 0.08] },
  );
  hinge.add(cord);
  g.add(hinge);

  // The ladder runs from the south edge of the hatch down to the floor. It is
  // built along -Y, tilted, and slides along its own length out of the attic.
  const top = new THREE.Vector3(hx, y, HATCH.z1 - 0.05);
  const foot = new THREE.Vector3(hx, 0, 0.05);
  const run = foot.z - top.z;
  const L = Math.hypot(y, run);
  const tilt = group([], { pos: top.toArray(), rot: [-Math.atan2(run, y), 0, 0] });
  const slide = group();
  tilt.add(slide);
  tilt.userData.dynamic = true;
  const wood = woodMat('light');
  for (const sx of [-0.24, 0.24]) slide.add(mesh(box(0.05, L, 0.08), wood, { pos: [sx, -L / 2, 0] }));
  for (let d = 0.3; d < L - 0.1; d += 0.3) slide.add(mesh(box(0.46, 0.035, 0.09), wood, { pos: [0, -d, 0.005] }));
  const ladderHit = hitArea(0.6, L, 0.3);
  ladderHit.position.set(0, -L / 2, 0);
  slide.add(ladderHit);
  g.add(tilt);

  const blocker = ctx.collision.add(hx - 0.3, HATCH.z1 - 0.1, hx + 0.3, foot.z + 0.12, 'ladder');
  blocker.enabled = false;
  const anim = tween(
    ctx,
    (v) => {
      const door = smooth(clamp01(v * 2));
      const down = smooth(clamp01(v * 2 - 1));
      hinge.rotation.x = 1.62 * door;
      cord.visible = door < 0.05;
      slide.position.y = (1 - down) * L;
      slide.visible = v > 0.45;
      blocker.enabled = v > 0;
    },
    1.6,
  );
  ctx.interact.add(cord, {
    zones: [0],
    enabled: () => !gs.data.attic.ladder,
    prompt: PROMPTS.atticCord,
    onUse: () => {
      if (!gs.lowerLadder()) return;
      ctx.audio.slide();
      setTimeout(() => ctx.audio.doorOpen?.(), 250);
      anim.to = 1;
      ctx.hud.toast(TOASTS.ladder, { ms: 2600 });
    },
  });
  ctx.interact.add(slide, {
    zones: [0],
    enabled: () => gs.data.attic.ladder && anim.v === 1,
    prompt: PROMPTS.atticUp,
    onUse: () => ctx.game.travel(ATTIC_ARRIVE.x, ATTIC_ARRIVE.z, ATTIC_ARRIVE.yaw),
  });
  return { sync: () => anim.set(gs.data.attic.ladder ? 1 : 0) };
}

// ------------------------------------------------------------------ shell
// Floor (with the hatch opening), the pitched roof with rafters, the knee
// walls and the two gable ends, the north one with a round window.
function buildShell(ctx, g) {
  const A = ATTIC;
  const occ = ctx.occluders;
  const floorMat = mat(0xffffff, { map: woodPlanks(0xb98a62, { repeat: [1, 1] }), rough: 0.75 });
  const H = ATTIC_HOLE;
  const piece = (x0, x1, z0, z1) => g.add(floorMesh(x1 - x0, z1 - z0, floorMat, { x: (x0 + x1) / 2, z: (z0 + z1) / 2 }));
  piece(A.x0, A.x1, A.zN, H.z0);
  piece(A.x0, A.x1, H.z1, A.zS);
  piece(A.x0, H.x0, H.z0, H.z1);
  piece(H.x1, A.x1, H.z0, H.z1);

  // Roof boards on both slopes, rafters under them, a ridge beam on top.
  const rise = A.ridge - A.knee;
  const slope = Math.atan2(rise, A.x1);
  const len = Math.hypot(rise, A.x1);
  const boards = mat(0xffffff, { map: woodPlanks(0xa77b58, { repeat: [3, 2] }), rough: 0.85, emissive: 0x2a1c14, ei: 1 });
  const beam = mat(0x7a5238, { rough: 0.8 });
  for (const side of [-1, 1]) {
    const cx = (side * A.x1) / 2;
    const cy = A.knee + rise / 2;
    const roof = mesh(box(len, 0.04, A.d), boards, { pos: [cx, cy, A.cz], rot: [0, 0, -side * slope], cast: false });
    g.add(roof);
    occ.push(roof);
    // Rafters hang just under the boards (offset inwards, along the slope's normal).
    const ox = -side * Math.sin(slope) * 0.08;
    const oy = -Math.cos(slope) * 0.08;
    for (let z = A.zN + 0.35; z < A.zS - 0.2; z += 0.85)
      g.add(mesh(box(len, 0.12, 0.08), beam, { pos: [cx + ox, cy + oy, z], rot: [0, 0, -side * slope], cast: false }));
    // Knee wall.
    const knee = mesh(box(0.05, A.knee, A.d), mat(0xe9dcc7, { rough: 0.9 }), { pos: [side * (A.x1 - 0.03), A.knee / 2, A.cz], cast: false });
    g.add(knee);
  }
  g.add(mesh(box(0.16, 0.18, A.d), beam, { pos: [0, A.ridge - 0.1, A.cz], cast: false }));

  // Gable ends: a pentagon of boards; the north one has a round window.
  const WIN = { y: 1.72, r: 0.42 };
  const gable = (z, facing, hole) => {
    const s = new THREE.Shape();
    s.moveTo(A.x0, 0);
    s.lineTo(A.x1, 0);
    s.lineTo(A.x1, A.knee);
    s.lineTo(0, A.ridge);
    s.lineTo(A.x0, A.knee);
    s.closePath();
    if (hole) {
      const h = new THREE.Path();
      h.absarc(0, WIN.y, WIN.r, 0, Math.PI * 2, true);
      s.holes.push(h);
    }
    const geo = new THREE.ShapeGeometry(s, 24);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 1.6, uv.getY(i) / 1.6);
    const m = mesh(geo, mat(0xffffff, { map: woodPlanks(0xc29a74, { repeat: [1, 1] }), rough: 0.85 }), {
      pos: [0, 0, z],
      rot: [0, facing, 0],
      cast: false,
    });
    g.add(m);
    occ.push(m);
  };
  gable(A.zN, 0, true);
  gable(A.zS, Math.PI, false);

  // The round window: night sky behind a cross-barred frame, and a patch of
  // moonlight on the floor in front of it.
  const sky = mesh(new THREE.CircleGeometry(WIN.r + 0.02, 32), mat(0xffffff, { map: nightSky(256, 256), basic: true, fog: false }), {
    pos: [0, WIN.y, A.zN - 0.03],
    cast: false,
  });
  g.add(sky);
  const frame = mat(C.cream, { rough: 0.55 });
  g.add(mesh(torus(WIN.r, 0.045, 10, 40), frame, { pos: [0, WIN.y, A.zN + 0.01], cast: false }));
  g.add(mesh(box(WIN.r * 2, 0.035, 0.03), frame, { pos: [0, WIN.y, A.zN + 0.005], cast: false }));
  g.add(mesh(box(0.035, WIN.r * 2, 0.03), frame, { pos: [0, WIN.y, A.zN + 0.005], cast: false }));
  g.add(
    mesh(plane(1.1, 1.5), mat(0xbfd0ff, { basic: true, opacity: 0.07, depthWrite: false }), {
      rot: [-Math.PI / 2, 0, 0],
      pos: [0, 0.008, A.zN + 1.3],
      cast: false,
      receive: false,
    }),
  );

  // Walls and the low space under the eaves.
  const col = ctx.collision;
  const free = 1.75; // headroom ends here
  col.add(A.x0 - 0.3, A.zN - 0.3, -free, A.zS + 0.3, 'wall');
  col.add(free, A.zN - 0.3, A.x1 + 0.3, A.zS + 0.3, 'wall');
  col.add(A.x0, A.zN - 0.3, A.x1, A.zN + 0.08, 'wall');
  col.add(A.x0, A.zS - 0.08, A.x1, A.zS + 0.3, 'wall');
}

// ----------------------------------------------------------- the hatch hole
function buildHole(ctx, g) {
  const H = ATTIC_HOLE;
  const w = H.x1 - H.x0;
  const d = H.z1 - H.z0;
  const cx = (H.x0 + H.x1) / 2;
  const cz = (H.z0 + H.z1) / 2;
  // Looking down: the bedroom's warm light, and the top of the ladder.
  g.add(
    mesh(box(w, 0.9, d), mat(0x6e5040, { emissive: 0xffc48a, ei: 0.4, side: THREE.BackSide, rough: 0.9 }), {
      pos: [cx, -0.45, cz],
      cast: false,
      receive: false,
    }),
  );
  const wood = woodMat('light');
  for (const sx of [-0.24, 0.24]) g.add(mesh(box(0.05, 1.0, 0.08), wood, { pos: [cx + sx, -0.42, H.z1 - 0.22], rot: [0.42, 0, 0] }));
  for (const dy of [0.25, 0.55]) g.add(mesh(box(0.46, 0.035, 0.09), wood, { pos: [cx, -dy, H.z1 - 0.12 - dy * 0.42] }));
  // A little railing on the east and south sides.
  const rail = woodMat('mid');
  const post = (x, z) => g.add(mesh(box(0.05, 0.95, 0.05), rail, { pos: [x, 0.475, z] }));
  post(H.x1 + 0.03, H.z0);
  post(H.x1 + 0.03, H.z1 + 0.03);
  post(H.x0, H.z1 + 0.03);
  g.add(mesh(box(0.05, 0.05, d + 0.08), rail, { pos: [H.x1 + 0.03, 0.95, cz] }));
  g.add(mesh(box(w + 0.08, 0.05, 0.05), rail, { pos: [cx, 0.95, H.z1 + 0.03] }));
  ctx.collision.add(H.x0, H.z0, H.x1 + 0.06, H.z1 + 0.06, 'hole');
  const hit = hitArea(w, 0.4, d);
  hit.position.set(cx, 0.1, cz);
  g.add(hit);
  ctx.interact.add(hit, {
    zones: [ROOM],
    highlight: false,
    prompt: PROMPTS.atticDown,
    onUse: () => ctx.game.travel(BEDROOM_ARRIVE.x, BEDROOM_ARRIVE.z, BEDROOM_ARRIVE.yaw),
  });
}

// ------------------------------------------------------------- the piano
// Upright, against the west eave, keyboard facing the room. The card it gives
// appears on the music stand.
function buildPiano(ctx, g) {
  const gs = ctx.gs;
  const pz = gs.puzzles.piano;
  const piano = group([], { pos: [-2.02, 0, 21.2], rot: [0, Math.PI / 2, 0] });
  const dark = woodMat('dark');
  piano.add(mesh(rbox(1.36, 1.2, 0.5, 0.03), dark, { pos: [0, 0.6, -0.03] }));
  piano.add(mesh(rbox(1.4, 0.05, 0.54, 0.015), dark, { pos: [0, 1.225, -0.03] }));
  for (const sx of [-1, 1]) piano.add(mesh(rbox(0.07, 0.78, 0.36, 0.02), dark, { pos: [sx * 0.66, 0.39, 0.33] }));
  piano.add(mesh(rbox(1.26, 0.07, 0.3, 0.015), dark, { pos: [0, 0.7, 0.36] }));
  // The keys: a strip of white keys with the black ones painted in.
  const keys = makeCanvas(512, 64);
  const k = keys.getContext('2d');
  k.fillStyle = '#f6efe2';
  k.fillRect(0, 0, 512, 64);
  const n = 21;
  for (let i = 0; i <= n; i++) {
    k.fillStyle = '#b9ab98';
    k.fillRect((i * 512) / n - 1, 0, 2, 64);
  }
  for (let i = 0; i < n - 1; i++) {
    if ([2, 6].includes(i % 7)) continue;
    k.fillStyle = '#2a2324';
    k.fillRect(((i + 1) * 512) / n - 7, 0, 14, 38);
  }
  piano.add(mesh(box(1.18, 0.02, 0.17), mat(0xffffff, { map: canvasTexture(keys), rough: 0.35 }), { pos: [0, 0.745, 0.42], cast: false }));
  // Fallboard (open), music stand with a sheet of music.
  piano.add(mesh(rbox(1.22, 0.14, 0.02, 0.01), dark, { pos: [0, 0.86, 0.27], rot: [-0.25, 0, 0] }));
  piano.add(mesh(rbox(0.7, 0.04, 0.12, 0.01), dark, { pos: [0, 0.92, 0.25] }));
  const sheet = makeCanvas(256, 192);
  const s = sheet.getContext('2d');
  s.fillStyle = '#f4ead6';
  s.fillRect(0, 0, 256, 192);
  s.strokeStyle = '#7d6a5c';
  s.fillStyle = '#4c3f39';
  for (let st = 0; st < 3; st++) {
    for (let l = 0; l < 5; l++) {
      s.beginPath();
      s.moveTo(14, 28 + st * 58 + l * 7);
      s.lineTo(242, 28 + st * 58 + l * 7);
      s.stroke();
    }
    for (let i = 0; i < 9; i++) {
      s.beginPath();
      s.ellipse(30 + i * 24, 28 + st * 58 + ((i * 5 + st * 3) % 9) * 3.5, 4.5, 3.2, -0.4, 0, Math.PI * 2);
      s.fill();
    }
  }
  piano.add(
    mesh(plane(0.42, 0.3), mat(0xffffff, { map: canvasTexture(sheet), rough: 0.9, side: THREE.DoubleSide }), {
      pos: [0, 1.08, 0.25],
      rot: [-0.1, 0, 0],
      cast: false,
    }),
  );
  // Two candles on top.
  const candles = [candle({ h: 0.14 }), candle({ h: 0.1, color: C.blush })];
  candles[0].position.set(-0.48, 1.25, -0.05);
  candles[1].position.set(0.5, 1.25, -0.02);
  candles.forEach((c) => piano.add(c));
  // The card, once the tune is played back.
  const card = group(
    [
      mesh(
        plane(0.14, 0.1),
        mat(0xffffff, { map: paperTexture('♪', { w: 140, h: 100, size: 40, bg: '#fff6e6', center: true, stain: false }), side: THREE.DoubleSide }),
        { cast: false },
      ),
    ],
    {
      pos: [0.14, 1.1, 0.272],
      rot: [-0.1, 0.12, 0],
    },
  );
  card.userData.dynamic = true;
  piano.add(card);
  g.add(piano);
  // The bench.
  const bench = group([mesh(rbox(0.8, 0.06, 0.34, 0.02), dark, { pos: [0, 0.47, 0] })], { pos: [-1.2, 0, 21.2], rot: [0, Math.PI / 2, 0] });
  for (const [bx, bz] of [
    [-0.34, -0.13],
    [0.34, -0.13],
    [-0.34, 0.13],
    [0.34, 0.13],
  ])
    bench.add(mesh(cyl(0.022, 0.018, 0.44, 8), dark, { pos: [bx, 0.22, bz] }));
  bench.add(mesh(rbox(0.7, 0.05, 0.28, 0.02), mat(C.blushDeep, { map: fabric(C.blushDeep, { knit: true }) }), { pos: [0, 0.525, 0] }));
  g.add(bench);
  ctx.collision.add(-2.32, 20.5, -1.52, 21.9, 'piano');
  ctx.collision.add(-1.4, 20.78, -1.0, 21.62, 'bench');

  ctx.interact.add(piano, {
    zones: [ROOM],
    puzzle: 'piano',
    prompt: PROMPTS.piano,
    onUse: () => pianoOverlay(ctx.game, pz, { onSolved: () => ctx.showClue('atticRiddle') }),
  });
  ctx.interact.add(card, { zones: [ROOM], enabled: () => pz.isSolved(), prompt: PROMPTS.riddleCard, onUse: () => ctx.showClue('atticRiddle') });
  pz.onChange((p, just) => {
    card.visible = p.isSolved();
    if (just) ctx.audio.chime();
  });
  ctx.addUpdate((dt, t) => candles.forEach((c, i) => (c.userData.glow.material.opacity = 0.6 + Math.sin(t * (8 + i) + i) * 0.08)));
  return { sync: () => (card.visible = pz.isSolved()) };
}

// ------------------------------------------------------------- the trunk
// Under the round window. A picture lock on the front shows its four wheels;
// opened, the lid lifts and the photo is inside, leaning on a folded blanket.
function buildTrunk(ctx, g) {
  const gs = ctx.gs;
  const pz = gs.puzzles.trunk;
  const Z = ATTIC.zN + 0.62;
  const W = 0.96;
  const D = 0.52;
  const Hb = 0.44;
  const trunk = group([], { pos: [0, 0, Z] });
  const wood = mat(0x8a5a3a, { rough: 0.7, map: woodPlanks(0x8a5a3a, { repeat: [1, 1] }) });
  const metal = mat(0x5a4636, { metal: 0.5, rough: 0.45 });
  const t = 0.035;
  // An open box (so the inside shows when the lid lifts).
  trunk.add(mesh(box(W, t, D), wood, { pos: [0, t / 2, 0] }));
  trunk.add(mesh(box(W, Hb, t), wood, { pos: [0, Hb / 2, D / 2 - t / 2] }));
  trunk.add(mesh(box(W, Hb, t), wood, { pos: [0, Hb / 2, -D / 2 + t / 2] }));
  for (const sx of [-1, 1]) trunk.add(mesh(box(t, Hb, D), wood, { pos: [(sx * (W - t)) / 2, Hb / 2, 0] }));
  for (const sx of [-0.3, 0.3]) {
    trunk.add(mesh(box(0.05, Hb + 0.004, 0.012), metal, { pos: [sx, Hb / 2, D / 2 + 0.004] }));
    trunk.add(mesh(box(0.05, Hb + 0.004, 0.012), metal, { pos: [sx, Hb / 2, -D / 2 - 0.004] }));
  }
  // Inside: a soft lining and a folded blanket.
  trunk.add(mesh(box(W - 2 * t, 0.01, D - 2 * t), mat(0x9b4a55, { rough: 0.95 }), { pos: [0, t + 0.005, 0], cast: false }));
  trunk.add(mesh(rbox(W - 0.14, 0.09, D - 0.16, 0.03), mat(0xffffff, { map: fabric(C.cream, { stripes: C.blush }) }), { pos: [0, t + 0.055, 0.02] }));
  // The lid hinges along the back edge.
  const hinge = group([], { pos: [0, Hb, -D / 2] });
  hinge.userData.dynamic = true;
  const lid = group([], { pos: [0, 0, D / 2] });
  lid.add(mesh(rbox(W + 0.02, 0.1, D + 0.02, 0.04), wood, { pos: [0, 0.05, 0] }));
  for (const sx of [-0.3, 0.3]) lid.add(mesh(box(0.05, 0.104, D + 0.026), metal, { pos: [sx, 0.05, 0] }));
  hinge.add(lid);
  trunk.add(hinge);
  // The lock plate: four little windows showing the wheels' pictures.
  const lockCanvas = makeCanvas(256, 80);
  const lockTex = canvasTexture(lockCanvas);
  const drawLock = () => {
    const x = lockCanvas.getContext('2d');
    x.fillStyle = '#c9a256';
    x.fillRect(0, 0, 256, 80);
    for (let i = 0; i < 4; i++) {
      x.fillStyle = '#f6eedd';
      x.fillRect(10 + i * 61, 10, 52, 60);
      drawLockPicture(x, pz.picture(i), 36 + i * 61, 40, 46);
    }
    lockTex.needsUpdate = true;
  };
  const plate = mesh(plane(0.26, 0.08), mat(0xffffff, { map: lockTex, rough: 0.4, metal: 0.3 }), { pos: [0, Hb - 0.08, D / 2 + 0.012], cast: false });
  plate.userData.dynamic = true;
  trunk.add(plate);
  g.add(trunk);
  ctx.collision.addCentered(0, Z, W + 0.1, D + 0.12, 'trunk');

  // The photo, framed, leaning on the blanket against the back of the trunk.
  const holder = group([], { pos: [0, t + 0.1, Z - 0.1], rot: [-0.42, 0, 0] });
  holder.userData.dynamic = true;
  g.add(holder);
  let frame = null;
  let photoItem = null;
  const setFrame = (tex, aspect) => {
    if (frame) holder.remove(frame);
    // Fits under the closed lid: at most 0.34 wide or 0.27 tall.
    const fw = Math.min(0.34, 0.27 * aspect);
    const fh = fw / aspect;
    frame = pictureFrame(fw + 0.05, fh + 0.05, tex, { frame: 0xd9b45a, border: 0.03, depth: 0.02 });
    frame.position.y = (fh + 0.05) / 2;
    holder.add(frame);
    // The frame arrives after the interaction was registered.
    if (photoItem) frame.traverse((o) => (o.userData.interact = photoItem));
  };
  photoImage().then((img) => {
    const [w, h] = sizeOf(img);
    const c = makeCanvas(Math.min(1024, w), Math.round(Math.min(1024, w) * (h / w)));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    setFrame(canvasTexture(c), w / h);
  });

  const lidAnim = tween(ctx, (v) => (hinge.rotation.x = -1.95 * smooth(v)), 1.1);
  ctx.interact.add(trunk, {
    zones: [ROOM],
    puzzle: 'trunk',
    enabled: () => !pz.isSolved(),
    prompt: PROMPTS.trunk,
    onUse: () => trunkOverlay(ctx.game, pz),
  });
  photoItem = ctx.interact.add(holder, {
    zones: [ROOM],
    enabled: () => pz.isSolved() && lidAnim.v > 0.6,
    prompt: () => (gs.hasFind('photo') ? PROMPTS.photoLook : PROMPTS.photoTake),
    onUse: () => {
      foundIt(ctx, 'photo', holder.getWorldPosition(new THREE.Vector3()));
      photoOverlay(ctx.game);
    },
  });
  pz.onChange((p, just) => {
    drawLock();
    if (just) {
      ctx.audio.chime();
      setTimeout(() => (lidAnim.to = 1), 500);
    }
  });
  drawLock();
  return {
    sync: () => {
      drawLock();
      lidAnim.set(pz.isSolved() ? 1 : 0);
      holder.visible = true;
    },
  };
}

// ------------------------------------------------------- the rest of it
function buildCozy(ctx, g) {
  const A = ATTIC;
  // Rug, an old armchair with a lamp, boxes and suitcases under the eaves.
  const rg = rugMesh(rug(0xd9c2a6, C.blushDeep, C.sage), 2.3, 3.2);
  rg.position.set(0, 0.006, 21.4);
  g.add(rg);
  const chair = armchair({ color: 0xc9a39a, cushionColor: C.cream });
  chair.position.set(1.15, 0, 19.75);
  chair.rotation.y = -0.75;
  g.add(chair);
  ctx.collision.addCentered(1.15, 19.75, 0.95, 0.95);
  const throwB = blanket(0.6, 0.45, C.sage, C.cream);
  throwB.position.set(1.1, 0.62, 19.8);
  throwB.rotation.set(0, -0.75, 0.2);
  g.add(throwB);
  const lamp = floorLamp({ shade: C.cream, h: 1.45 });
  lamp.position.set(1.62, 0, 20.75);
  g.add(lamp);
  lampSwitch(ctx, ROOM, lamp);
  ctx.collision.addCentered(1.62, 20.75, 0.3, 0.3);
  for (const [x, z, w, h, d, ry] of [
    [2.25, 20.9, 0.55, 0.4, 0.45, 0.1],
    [2.3, 21.7, 0.5, 0.36, 0.42, -0.15],
    [2.2, 22.5, 0.6, 0.42, 0.46, 0.05],
  ]) {
    const b = cardboardBox({ w, h, d, open: false });
    b.position.set(x, 0, z);
    b.rotation.y = ry;
    g.add(b);
  }
  // Two old suitcases and a stack of books on the west side, by the hatch.
  const sc = [
    [0.7, 0.2, 0.45, 0x6f8fa8, 0.1],
    [0.6, 0.18, 0.4, 0xc28a6a, 0.29],
  ];
  sc.forEach(([w, h, d, color, y], i) => {
    g.add(mesh(rbox(w, h, d, 0.03), mat(color, { rough: 0.6 }), { pos: [-2.2, y, 23.6], rot: [0, 0.15 - i * 0.2, 0] }));
    g.add(mesh(box(0.12, 0.03, 0.02), mat(0x3a2e28), { pos: [-2.2, y + h / 2 + 0.015, 23.6], rot: [0, 0.15 - i * 0.2, 0] }));
  });
  const books = bookRow(0.4, { height: 0.22, depth: 0.16, lean: false });
  books.position.set(-2.15, 0, 22.7);
  books.rotation.y = Math.PI / 2;
  g.add(books);
  // A picture leaning on the knee wall.
  const art = makeCanvas(256, 320);
  drawFramePicture(art.getContext('2d'), 256, 320, 'spring');
  const fr = pictureFrame(0.4, 0.5, canvasTexture(art), { frame: C.woodLight });
  fr.position.set(-2.6, 0.26, 22.1);
  fr.rotation.order = 'YXZ';
  fr.rotation.set(-0.2, Math.PI / 2, 0);
  g.add(fr);
  // The cats' old bed, with a knitted blanket.
  const bed = group([mesh(cyl(0.34, 0.3, 0.12, 20), mat(C.blush, { map: fabric(C.blush, { knit: true }) }), { pos: [0, 0.06, 0] })], {
    pos: [1.35, 0, 22.55],
  });
  const pillow = cushion(0.42, 0.08, 0.42, C.cream, fabric(C.cream, { checks: C.sage }));
  pillow.position.set(0, 0.13, 0);
  bed.add(pillow);
  g.add(bed);
  ctx.collision.addCentered(1.35, 22.55, 0.6, 0.6);
  // Dried tulips by the trunk.
  const v = vaseWithTulips({ colors: ['B', 'W', 'B'], vaseColor: C.cream, h: 0.2 });
  v.position.set(0.75, 0, A.zN + 0.45);
  g.add(v);

  // Lights: a bulb under the ridge and fairy lights along both slopes.
  const bulb = pendantLamp({ drop: 0.22, color: C.cream });
  bulb.position.set(0, A.ridge - 0.1, 21.5);
  g.add(bulb);
  const strings = [-1, 1].map((side) => {
    const x = side * 1.15;
    const y = atticRoofY(x) - 0.12;
    const sl = stringLights(
      [
        [x, y, A.zN + 0.3],
        [x, y, A.cz],
        [x, y, A.zS - 0.3],
      ],
      { bulbs: 22, sag: 0.14 },
    );
    g.add(sl);
    return sl;
  });
  const glow = glowSprite(C.lamp, 1.4, 0.3);
  glow.position.set(0, A.ridge - 0.5, 21.5);
  g.add(glow);
  ctx.addUpdate((dt, t) => strings.forEach((sl) => sl.userData.twinkle(t)));
}

export function buildAttic(ctx) {
  const g = ctx.roomGroup(ROOM);
  const ladder = buildLadder(ctx);
  buildShell(ctx, g);
  buildHole(ctx, g);
  const piano = buildPiano(ctx, g);
  const trunk = buildTrunk(ctx, g);
  buildCozy(ctx, g);
  return {
    index: ROOM,
    name: SIDE_ROOMS[ROOM].name,
    rig: {
      hemi: { sky: 0xffd9b4, ground: 0x3a2a26, intensity: 0.62 },
      spot: { pos: [0, ATTIC.ridge - 0.5, 21.5], target: [0, 0, 21.0], color: 0xffd6a0, intensity: 18, angle: 1.2, penumbra: 0.85 },
      points: [
        { pos: [-1.75, 1.6, 21.2], color: 0xffc27a, intensity: 1.8 },
        { pos: [1.62, 1.35, 20.75], color: 0xffc98a, intensity: 2.0 },
        { pos: [0, 1.6, ATTIC.zN + 0.7], color: 0xa9bcff, intensity: 1.5 },
      ],
      fog: { color: 0x241a1e, near: 7, far: 18 },
    },
    anchors: { piano: new THREE.Vector3(-1.75, 0.9, 21.2), trunk: new THREE.Vector3(0, 0.4, ATTIC.zN + 0.62) },
    applyState() {
      ladder.sync();
      piano.sync();
      trunk.sync();
    },
  };
}
