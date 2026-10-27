import * as THREE from 'three';
import { COLORS } from '../config.js';
import { mat, mesh, group, rbox, box, sphere } from '../engine/materials.js';
import { nightSky } from '../engine/textures.js';
import { hitArea } from '../engine/props.js';

// Shared bits of the greenhouse, basement and balcony (built apart from the
// house, like the attic).

const C = COLORS;
export const smooth = (k) => k * k * (3 - 2 * k);

// A 0..1 value that eases towards `to`; apply(k) runs while it moves.
export function tween(ctx, apply, seconds) {
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

// A starry sky all around (seen through glass, or over the balcony).
export function skyDome(g, center, r = 34) {
  const sky = mesh(new THREE.SphereGeometry(r, 24, 14), mat(0xffffff, { map: nightSky(1024, 512), basic: true, fog: false, side: THREE.BackSide }), {
    pos: center,
    cast: false,
    receive: false,
  });
  sky.raycast = () => {};
  g.add(sky);
  return sky;
}

// A door standing flat against a wall, used to travel somewhere else.
// `facing` is the way its front looks (radians, 0 = towards +Z). `glass`
// gives it panes with a soft light behind them.
export function wallDoor(
  ctx,
  room,
  { pos, facing = 0, w = 1.0, h = 2.1, color = C.cream, glass = false, double = false, glow = 0xbcd2ff, prompt, onUse },
) {
  const d = group([], { pos, rot: [0, facing, 0] });
  const frame = mat(color, { rough: 0.55 });
  d.add(mesh(box(w + 0.16, 0.08, 0.06), frame, { pos: [0, h + 0.04, 0.03] }));
  for (const sx of [-1, 1]) d.add(mesh(box(0.08, h, 0.06), frame, { pos: [(sx * (w + 0.08)) / 2, h / 2, 0.03] }));
  const leaves = double ? [-w / 4, w / 4] : [0];
  const lw = double ? w / 2 - 0.01 : w;
  for (const lx of leaves) {
    if (glass) {
      // Frame and four panes with a glow behind.
      d.add(mesh(rbox(lw, h, 0.04, 0.01), frame, { pos: [lx, h / 2, 0.02] }));
      const pane = mat(glow, { basic: true, opacity: 0.55, fog: false });
      for (const [px, py] of [
        [-1, 1],
        [1, 1],
        [-1, -1],
        [1, -1],
      ])
        d.add(mesh(box(lw / 2 - 0.08, h / 2 - 0.12, 0.01), pane, { pos: [lx + (px * lw) / 4, h / 2 + (py * h) / 4, 0.045], cast: false }));
    } else d.add(mesh(rbox(lw, h, 0.05, 0.015), mat(color, { rough: 0.7 }), { pos: [lx, h / 2, 0.025] }));
    d.add(
      mesh(sphere(0.03, 10, 8), mat(C.gold, { metal: 0.6, rough: 0.3 }), {
        pos: [lx + (double ? -Math.sign(lx) : 1) * (lw / 2 - 0.1), h * 0.48, 0.07],
        cast: false,
      }),
    );
  }
  const hit = hitArea(w, h, 0.2);
  hit.position.set(0, h / 2, 0.1);
  d.add(hit);
  ctx.interact.add(d, { zones: [room], prompt, onUse });
  return d;
}

// Walls are just collision boxes around a side room's floor.
export function boxIn(ctx, R) {
  const col = ctx.collision;
  col.add(R.x0 - 0.3, R.zN - 0.3, R.x0 + 0.08, R.zS + 0.3, 'wall');
  col.add(R.x1 - 0.08, R.zN - 0.3, R.x1 + 0.3, R.zS + 0.3, 'wall');
  col.add(R.x0, R.zN - 0.3, R.x1, R.zN + 0.08, 'wall');
  col.add(R.x0, R.zS - 0.08, R.x1, R.zS + 0.3, 'wall');
}
