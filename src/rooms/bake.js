import * as THREE from 'three';
import { PROMPTS } from '../config.js';
import { mat, mesh, group, rbox, box, cyl, sphere, cone } from '../engine/materials.js';
import { glowSprite } from '../engine/props.js';
import { bakeOverlay } from '../ui/bake.js';
import { celebrateFind } from './cozy.js';

// The kitchen's baking corner: ingredients on the counter open the baking
// screen (ui/bake.js); the finished strawberry shortcake (a little find)
// waits on the table, steaming a little, and the cats come for a look.

const ROOM = 2;

// The ingredients laid out on the counter, at `pos` (the counter top).
export function bakingStation(ctx, pos) {
  const gs = ctx.gs;
  const board = mat(0xe2b07a, { rough: 0.7 });
  const g = group([
    mesh(rbox(0.3, 0.02, 0.42, 0.008), board, { pos: [0, 0.01, 0] }),
    mesh(cyl(0.085, 0.055, 0.07, 18), mat(0xfdf7ec, { rough: 0.4 }), { pos: [0, 0.055, 0.06] }),
    mesh(cyl(0.075, 0.075, 0.004, 18), mat(0xfaf6ee), { pos: [0, 0.088, 0.06], cast: false }),
    mesh(box(0.07, 0.12, 0.05), mat(0xf4ecdc), { pos: [-0.06, 0.08, -0.12], rot: [0, 0.3, 0] }),
    mesh(box(0.071, 0.03, 0.051), mat(0x6f9be0), { pos: [-0.06, 0.08, -0.12], rot: [0, 0.3, 0], cast: false }),
    mesh(box(0.06, 0.025, 0.035), mat(0xf7e08a), { pos: [0.08, 0.03, -0.12] }),
    mesh(box(0.08, 0.035, 0.06), mat(0x7cb36a, { rough: 0.8 }), { pos: [0.06, 0.04, 0.16] }),
    mesh(sphere(0.016, 8, 6), mat(0xe04a5a, { rough: 0.5 }), { pos: [0.045, 0.065, 0.15] }),
    mesh(sphere(0.016, 8, 6), mat(0xe04a5a, { rough: 0.5 }), { pos: [0.075, 0.065, 0.17] }),
    mesh(box(0.045, 0.09, 0.045), mat(0xffffff, { rough: 0.5 }), { pos: [-0.09, 0.065, 0.16] }),
  ]);
  g.position.copy(pos);
  ctx.roomGroup(ROOM).add(g);
  ctx.interact.add(g, {
    zones: [ROOM],
    prompt: () => (gs.bakeDone() ? PROMPTS.bakeDone : PROMPTS.bake),
    onUse: () => (gs.bakeDone() ? ctx.showClue('bake') : bakeOverlay(ctx.game)),
  });
  return g;
}

// The shortcake on the table at `pos` (the table top), shown once baked.
export function tableShortcake(ctx, pos, catSpots) {
  const gs = ctx.gs;
  const pale = mat(0xf1dcae, { rough: 0.8 });
  const golden = mat(0xd79b45, { rough: 0.7 });
  const cream = mat(0xfffaf0, { rough: 0.6 });
  const red = mat(0xe04a5a, { rough: 0.45 });
  const g = group([
    mesh(cyl(0.11, 0.095, 0.012, 24), mat(0xffffff, { rough: 0.3 }), { pos: [0, 0.006, 0] }),
    mesh(cyl(0.065, 0.068, 0.03, 18), pale, { pos: [0, 0.027, 0] }),
    mesh(cyl(0.07, 0.07, 0.014, 18), red, { pos: [0, 0.049, 0] }),
    mesh(cyl(0.072, 0.066, 0.024, 18), cream, { pos: [0, 0.068, 0] }),
    mesh(new THREE.SphereGeometry(0.066, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 1), golden, { pos: [0, 0.08, 0] }),
    mesh(sphere(0.03, 12, 8), cream, { pos: [0, 0.118, 0], scale: [1, 0.7, 1] }),
    mesh(cone(0.016, 0.03, 10), red, { pos: [0, 0.148, 0], rot: [Math.PI, 0, 0] }),
    mesh(cone(0.014, 0.008, 6), mat(0x6aa84f), { pos: [0, 0.166, 0], cast: false }),
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
