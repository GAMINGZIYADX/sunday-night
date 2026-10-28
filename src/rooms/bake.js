import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PROMPTS } from '../config.js';
import { mat, mesh, group, rbox, box, cyl, cone } from '../engine/materials.js';
import { glowSprite } from '../engine/props.js';
import { bakeOverlay } from '../ui/bake.js';
import { recipeCard } from '../ui/recipeCard.js';
import { celebrateFind } from './cozy.js';

// The kitchen's baking corner: ingredients on the counter open the baking
// screen (ui/bake.js); the finished strawberry shortcake (a little find)
// waits on the table, steaming a little, and the cats come for a look.
// The round things are turned (lathe) profiles, so they stay smooth.

const ROOM = 2;

// A turned shape from [radius, height] points, bottom to top.
const lathe = (pts, segs = 40) =>
  new THREE.LatheGeometry(
    pts.map(([r, y]) => new THREE.Vector2(r, y)),
    segs,
  );
// Many copies of one shape as one mesh (one draw call): [x, y, z, rx, ry, rz, s].
function copies(geo, places) {
  const geos = places.map(([x, y, z, rx = 0, ry = 0, rz = 0, sc = 1]) => {
    const g = geo.clone();
    g.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(x, y, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
        new THREE.Vector3(sc, sc, sc),
      ),
    );
    return g;
  });
  return mergeGeometries(geos, false);
}
// A strawberry, tip down (0 to 0.036 m tall), and its green top.
const BERRY = [
  [0, 0],
  [0.004, 0.002],
  [0.009, 0.008],
  [0.013, 0.016],
  [0.015, 0.024],
  [0.0135, 0.031],
  [0.009, 0.035],
  [0, 0.036],
];
const berryGeo = () => lathe(BERRY, 20);
const calyxGeo = () => new THREE.ConeGeometry(0.012, 0.006, 5, 1).translate(0, 0.038, 0);
// Piped cream: a little swirl kiss.
const KISS = [
  [0, 0],
  [0.012, 0],
  [0.0135, 0.004],
  [0.011, 0.01],
  [0.007, 0.016],
  [0.003, 0.022],
  [0, 0.025],
];

// The ingredients laid out on the counter, at `pos` (the counter top).
export function bakingStation(ctx, pos) {
  const gs = ctx.gs;
  const red = mat(0xe2394c, { rough: 0.35 });
  const leaf = mat(0x5fa043, { rough: 0.7 });
  const g = group([
    mesh(rbox(0.3, 0.02, 0.42, 0.008), mat(0xe2b07a, { rough: 0.7 }), { pos: [0, 0.01, 0] }),
    // A mixing bowl with a mound of flour.
    mesh(
      lathe([
        [0, 0],
        [0.045, 0],
        [0.068, 0.018],
        [0.083, 0.05],
        [0.087, 0.068],
        [0.081, 0.069],
        [0.077, 0.054],
        [0.064, 0.024],
        [0, 0.01],
      ]),
      mat(0xfdf7ec, { rough: 0.35 }),
      { pos: [0, 0.02, 0.06] },
    ),
    mesh(
      lathe([
        [0, 0.028],
        [0.062, 0.028],
        [0.05, 0.042],
        [0.026, 0.052],
        [0, 0.055],
      ]),
      mat(0xfbf8f1, { rough: 0.95 }),
      { pos: [0, 0.02, 0.06], cast: false },
    ),
    mesh(new THREE.TorusGeometry(0.084, 0.0025, 6, 48), mat(0x8fb3e6, { rough: 0.4 }), {
      pos: [0, 0.074, 0.06],
      rot: [Math.PI / 2, 0, 0],
      cast: false,
    }),
    // A paper bag of flour, folded at the top.
    mesh(rbox(0.07, 0.12, 0.05, 0.006), mat(0xf6efe0, { rough: 0.9 }), { pos: [-0.075, 0.08, -0.12], rot: [0, 0.3, 0] }),
    mesh(box(0.0705, 0.035, 0.0505), mat(0x6f9be0), { pos: [-0.075, 0.075, -0.12], rot: [0, 0.3, 0], cast: false }),
    mesh(box(0.06, 0.012, 0.03), mat(0xece2cc, { rough: 0.9 }), { pos: [-0.075, 0.145, -0.12], rot: [0.4, 0.3, 0] }),
    // Butter on its foil.
    mesh(box(0.08, 0.002, 0.05), mat(0xdfe4ea, { rough: 0.3, metal: 0.6 }), { pos: [0.075, 0.021, -0.12], cast: false }),
    mesh(rbox(0.065, 0.026, 0.036, 0.005), mat(0xfbe38c, { rough: 0.5 }), { pos: [0.075, 0.035, -0.12] }),
    // A punnet of strawberries.
    mesh(rbox(0.085, 0.035, 0.065, 0.006), mat(0x7cb36a, { rough: 0.8 }), { pos: [0.065, 0.038, 0.16] }),
    mesh(
      copies(berryGeo(), [
        [0.045, 0.05, 0.145, 1.2, 0, 0.3],
        [0.075, 0.05, 0.17, 1.4, 0.8, -0.2],
        [0.085, 0.05, 0.145, 1.3, -0.5, 0.1],
        [0.055, 0.056, 0.178, 1.1, 0.3, 0.5],
      ]),
      red,
    ),
    mesh(
      copies(calyxGeo(), [
        [0.045, 0.05, 0.145, 1.2, 0, 0.3],
        [0.075, 0.05, 0.17, 1.4, 0.8, -0.2],
        [0.085, 0.05, 0.145, 1.3, -0.5, 0.1],
        [0.055, 0.056, 0.178, 1.1, 0.3, 0.5],
      ]),
      leaf,
      { cast: false },
    ),
    // A carton of cream.
    mesh(rbox(0.045, 0.085, 0.045, 0.004), mat(0xffffff, { rough: 0.5 }), { pos: [-0.09, 0.0625, 0.16] }),
    mesh(new THREE.ConeGeometry(0.032, 0.022, 4, 1).rotateY(Math.PI / 4), mat(0xf1f5fa, { rough: 0.5 }), { pos: [-0.09, 0.116, 0.16] }),
    mesh(box(0.0455, 0.02, 0.0455), mat(0x6f9be0), { pos: [-0.09, 0.06, 0.16], cast: false }),
  ]);
  g.position.copy(pos);
  ctx.roomGroup(ROOM).add(g);
  ctx.interact.add(g, {
    zones: [ROOM],
    prompt: () => (gs.bakeDone() ? PROMPTS.bakeDone : PROMPTS.bake),
    onUse: () => (gs.bakeDone() ? recipeCard(ctx.game) : bakeOverlay(ctx.game)),
  });
  return g;
}

// The shortcake on the table at `pos` (the table top), shown once baked:
// a split biscuit, strawberries, piped cream, the domed top, a strawberry.
export function tableShortcake(ctx, pos, catSpots) {
  const gs = ctx.gs;
  const golden = mat(0xd79b45, { rough: 0.65 });
  const crumb = mat(0xf6e3bb, { rough: 0.9 });
  const cream = mat(0xfffaf0, { rough: 0.55 });
  const red = mat(0xe2394c, { rough: 0.3 });
  const leaf = mat(0x5fa043, { rough: 0.7 });
  const ring = (n, r, y, tilt, sc = 1) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return [Math.cos(a) * r, y, Math.sin(a) * r, 0, -a, tilt, sc];
    });
  const berries = ring(12, 0.064, 0.046, 1.4); // tips out, tops tucked under the cream
  const g = group([
    // The plate.
    mesh(
      lathe(
        [
          [0, 0],
          [0.085, 0],
          [0.095, 0.003],
          [0.112, 0.012],
          [0.116, 0.016],
          [0.113, 0.017],
          [0.094, 0.009],
          [0.082, 0.006],
          [0, 0.006],
        ],
        56,
      ),
      mat(0xffffff, { rough: 0.25 }),
      {},
    ),
    // The bottom half, cut side up.
    mesh(
      lathe([
        [0, 0],
        [0.063, 0],
        [0.067, 0.006],
        [0.068, 0.022],
        [0.065, 0.029],
        [0, 0.03],
      ]),
      golden,
      { pos: [0, 0.009, 0] },
    ),
    mesh(cyl(0.063, 0.063, 0.002, 40), crumb, { pos: [0, 0.04, 0], cast: false }),
    // Strawberries round the edge, and cream piped on top.
    mesh(copies(berryGeo(), berries), red),
    mesh(copies(calyxGeo(), berries), leaf, { cast: false }),
    mesh(
      lathe([
        [0, 0.04],
        [0.05, 0.04],
        [0.056, 0.046],
        [0.055, 0.056],
        [0.05, 0.062],
        [0, 0.062],
      ]),
      cream,
    ),
    mesh(copies(lathe(KISS, 16), ring(8, 0.046, 0.055, 0)), cream),
    // The domed top, then a big swirl and a strawberry, tip up.
    mesh(
      lathe([
        [0, 0],
        [0.062, 0],
        [0.066, 0.006],
        [0.065, 0.016],
        [0.058, 0.028],
        [0.04, 0.037],
        [0.02, 0.041],
        [0, 0.042],
      ]),
      golden,
      { pos: [0, 0.062, 0] },
    ),
    mesh(lathe(KISS, 24), cream, { pos: [0, 0.1, 0], scale: [2.2, 1.5, 2.2] }),
    mesh(berryGeo(), red, { pos: [0, 0.161, 0], rot: [Math.PI, 0, 0], scale: 1.25 }),
    mesh(cone(0.014, 0.006, 6), leaf, { pos: [0, 0.114, 0], cast: false }),
  ]);
  g.position.copy(pos);
  const glow = glowSprite(0xfff0c0, 0.35, 0.35);
  glow.position.y = 0.1;
  glow.raycast = () => {};
  g.add(glow);
  g.userData.dynamic = true;
  ctx.roomGroup(ROOM).add(g);
  let steam = 0;
  let puff = 0;
  const top = new THREE.Vector3(0, 0.17, 0);
  ctx.addUpdate((dt) => {
    g.visible = gs.hasFind('cake');
    if (steam <= 0 || !g.visible) return;
    steam -= dt;
    puff -= dt;
    if (puff <= 0) {
      puff = 0.35;
      ctx.particles.burst(g.localToWorld(top.clone()), {
        kind: 'sparkle',
        count: 1,
        color: 0xffffff,
        speed: 0.06,
        size: 0.05,
        gravity: -0.25,
        life: 1.4,
        up: 0.6,
      });
    }
  });
  gs.on('find', ({ id }) => {
    if (id !== 'cake') return;
    celebrateFind(ctx, 'cake', g.localToWorld(top.clone()));
    steam = 25;
    ctx.cats.visit(catSpots, ROOM);
  });
  return g;
}
