import * as THREE from 'three';
import { ROOMS, WALL_H, WALL_T, DOOR_W, DOOR_H, HALL_W } from '../engine/layout.js';
import { mat, mesh, box, group } from '../engine/materials.js';
import { woodPlanks, wallpaper } from '../engine/textures.js';
import { glowSprite, emissiveMat } from '../engine/props.js';
import { COLORS } from '../config.js';

// Builds floors, walls (with wainscoting, baseboards and a chair rail),
// ceilings and the hallway north of a room. Walls are planes with world-scaled
// UVs so wallpaper keeps the same size everywhere.

const RAIL_Y = 0.92;

function scaledPlane(w, h, su = 1, sv = 1) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / su), uv.getY(i) * (h / sv));
  return g;
}

// Rectangles for a wall from a to b, with openings [{a, b, top}].
function wallRects(a, b, holes, y0, y1) {
  const rects = [];
  const hs = holes.filter((h) => h.b > a && h.a < b).sort((p, q) => p.a - q.a);
  let x = a;
  for (const h of hs) {
    if (h.a > x) rects.push([x, h.a, y0, y1]);
    if (h.top < y1) rects.push([Math.max(x, h.a), Math.min(b, h.b), Math.max(y0, h.top), y1]);
    x = Math.max(x, h.b);
  }
  if (x < b) rects.push([x, b, y0, y1]);
  return rects.filter((r) => r[1] - r[0] > 0.001 && r[3] - r[2] > 0.001);
}

// side: 'N','S' (walls along X) or 'E','W' (walls along Z). `line` is the
// fixed coordinate; a..b runs along the wall; holes are along the wall axis.
export function buildWall(parent, { side, line, a, b, holes = [], upper, lower, rail = true, height = WALL_H, occluders }) {
  const g = group();
  const bands =
    rail && lower
      ? [
          [0, RAIL_Y, lower],
          [RAIL_Y, height, upper],
        ]
      : [[0, height, upper]];
  for (const [y0, y1, material] of bands) {
    for (const [p, q, r0, r1] of wallRects(a, b, holes, y0, y1)) {
      const w = q - p;
      const h = r1 - r0;
      const m = mesh(scaledPlane(w, h, 1.4, 1.4), material, { cast: false });
      const mid = (p + q) / 2;
      const my = (r0 + r1) / 2;
      if (side === 'N') (m.position.set(mid, my, line), m.rotation.set(0, 0, 0));
      if (side === 'S') (m.position.set(mid, my, line), m.rotation.set(0, Math.PI, 0));
      if (side === 'W') (m.position.set(line, my, mid), m.rotation.set(0, Math.PI / 2, 0));
      if (side === 'E') (m.position.set(line, my, mid), m.rotation.set(0, -Math.PI / 2, 0));
      g.add(m);
      if (occluders) occluders.push(m);
    }
  }
  // Baseboard and chair rail, skipping openings.
  const trim = mat(COLORS.cream, { rough: 0.55 });
  const strips = [];
  for (const [p, q] of wallRects(
    a,
    b,
    holes.map((h) => ({ ...h, top: 99 })),
    0,
    0.12,
  ))
    strips.push([p, q, 0.06, 0.12, 0.025]);
  if (rail && lower)
    for (const [p, q] of wallRects(
      a,
      b,
      holes.map((h) => ({ ...h, top: 99 })),
      0,
      1,
    ))
      strips.push([p, q, RAIL_Y, 0.045, 0.03]);
  for (const [p, q, y, h, d] of strips) {
    const len = q - p;
    const mid = (p + q) / 2;
    const s = mesh(box(len, h, d), trim, { cast: false });
    const off = d / 2;
    if (side === 'N') s.position.set(mid, y, line + off);
    if (side === 'S') s.position.set(mid, y, line - off);
    if (side === 'W') (s.position.set(line + off, y, mid), (s.rotation.y = Math.PI / 2));
    if (side === 'E') (s.position.set(line - off, y, mid), (s.rotation.y = Math.PI / 2));
    g.add(s);
  }
  parent.add(g);
  return g;
}

// Colliders for a wall line with door gaps.
function wallColliders(col, side, line, a, b, holes) {
  const t = WALL_T;
  for (const [p, q] of wallRects(
    a,
    b,
    holes.map((h) => ({ ...h, top: 99 })),
    0,
    1,
  )) {
    if (side === 'N' || side === 'S') col.add(p, line - t / 2, q, line + t / 2, 'wall');
    else col.add(line - t / 2, p, line + t / 2, q, 'wall');
  }
}

export function floorMesh(w, d, material, { x = 0, z = 0, y = 0 } = {}) {
  const m = mesh(scaledPlane(w, d, 1.6, 1.6), material, { rot: [-Math.PI / 2, 0, 0], pos: [x, y, z], cast: false });
  return m;
}

export function ceilingMesh(w, d, material, { x = 0, z = 0, h = WALL_H } = {}) {
  return mesh(scaledPlane(w, d, 2, 2), material, { rot: [Math.PI / 2, 0, 0], pos: [x, h, z], cast: false, receive: false });
}

// style: { wall, wallAccent, pattern, lower, floor, ceiling, hallWall, ceilingHole: {x0, x1, z0, z1} }
export function buildRoomShell(ctx, index, style) {
  const r = ROOMS[index];
  const g = ctx.roomGroup(index);
  const col = ctx.collision;
  const occ = ctx.occluders;

  const floorTex = woodPlanks(style.floor ?? COLORS.wood, { repeat: [1, 1] });
  const floorMat = mat(0xffffff, { map: floorTex, rough: 0.7 });
  g.add(floorMesh(r.w, r.d, floorMat, { z: r.cz }));
  const ceilMat = mat(style.ceiling ?? COLORS.cream, { rough: 1, emissive: 0x3a2c26, ei: 1 });
  if (style.ceilingHole) {
    // Four pieces around an opening (the attic hatch): north, south, west, east.
    const h = style.ceilingHole;
    const piece = (x0, x1, z0, z1) =>
      x1 - x0 > 0.001 && z1 - z0 > 0.001 && g.add(ceilingMesh(x1 - x0, z1 - z0, ceilMat, { x: (x0 + x1) / 2, z: (z0 + z1) / 2 }));
    piece(r.x0, r.x1, r.zN, h.z0);
    piece(r.x0, r.x1, h.z1, r.zS);
    piece(r.x0, h.x0, h.z0, h.z1);
    piece(h.x1, r.x1, h.z0, h.z1);
  } else g.add(ceilingMesh(r.w, r.d, ceilMat, { z: r.cz }));
  // Ceiling beams for warmth.
  if (style.beams) {
    const bm = mat(COLORS.woodDark, { rough: 0.8 });
    for (let x = -r.w / 2 + 1.2; x < r.w / 2 - 0.5; x += 1.6) g.add(mesh(box(0.14, 0.14, r.d), bm, { pos: [x, WALL_H - 0.07, r.cz], cast: false }));
  }

  const upper = mat(0xffffff, { map: wallpaper(style.wall, style.wallAccent ?? COLORS.cream, style.pattern ?? 'tulips', [1, 1]), rough: 0.95 });
  const lower = mat(style.lower ?? COLORS.creamDark, { rough: 0.8 });
  const door = { a: -DOOR_W / 2, b: DOOR_W / 2, top: DOOR_H };
  const northHoles = [door];
  const southHoles = index > 0 ? [door] : [];

  buildWall(g, { side: 'N', line: r.zN, a: r.x0, b: r.x1, holes: northHoles, upper, lower, occluders: occ });
  buildWall(g, { side: 'S', line: r.zS, a: r.x0, b: r.x1, holes: southHoles, upper, lower, occluders: occ });
  buildWall(g, { side: 'W', line: r.x0, a: r.zN, b: r.zS, holes: style.westHoles ?? [], upper, lower, occluders: occ });
  buildWall(g, { side: 'E', line: r.x1, a: r.zN, b: r.zS, holes: style.eastHoles ?? [], upper, lower, occluders: occ });
  wallColliders(col, 'N', r.zN - WALL_T / 2, r.x0, r.x1, northHoles);
  wallColliders(col, 'S', r.zS + WALL_T / 2, r.x0 - WALL_T, r.x1 + WALL_T, southHoles);
  wallColliders(col, 'W', r.x0 - WALL_T / 2, r.zN, r.zS, []);
  wallColliders(col, 'E', r.x1 + WALL_T / 2, r.zN, r.zS, []);

  // Doorway casing on the room side of the north and south openings.
  const casing = mat(COLORS.cream, { rough: 0.5 });
  const addCasing = (z, dir) => {
    const cz = z + dir * 0.02;
    g.add(mesh(box(0.1, DOOR_H + 0.08, 0.05), casing, { pos: [-DOOR_W / 2 - 0.05, (DOOR_H + 0.08) / 2, cz], cast: false }));
    g.add(mesh(box(0.1, DOOR_H + 0.08, 0.05), casing, { pos: [DOOR_W / 2 + 0.05, (DOOR_H + 0.08) / 2, cz], cast: false }));
    g.add(mesh(box(DOOR_W + 0.3, 0.1, 0.06), casing, { pos: [0, DOOR_H + 0.05, cz], cast: false }));
  };
  addCasing(r.zN, 1);
  if (index > 0) addCasing(r.zS, -1);

  return { group: g, floorMat, upper, lower };
}

// Hallway between room i and room i+1 (inside the house).
export function buildHallway(ctx, i, { wall = COLORS.blush, floor = COLORS.woodLight, sconce = true } = {}) {
  const a = ROOMS[i];
  const b = ROOMS[i + 1];
  const g = ctx.roomGroup(i);
  const z0 = a.zN - WALL_T;
  const z1 = b.zS + WALL_T;
  const len = z0 - z1;
  const cz = (z0 + z1) / 2;
  const hw = HALL_W / 2;
  const floorMat = mat(0xffffff, { map: woodPlanks(floor, { repeat: [1, 1] }), rough: 0.7 });
  g.add(floorMesh(HALL_W, len + WALL_T, floorMat, { z: cz }));
  g.add(ceilingMesh(HALL_W, len + WALL_T, mat(COLORS.cream), { z: cz, h: DOOR_H + 0.25 }));
  const upper = mat(0xffffff, { map: wallpaper(wall, COLORS.cream, 'stripes', [1, 1]), rough: 0.95 });
  const lower = mat(COLORS.creamDark, { rough: 0.8 });
  const H = DOOR_H + 0.25;
  buildWall(g, { side: 'W', line: -hw, a: z1 - 0.1, b: z0 + 0.1, upper, lower, height: H, occluders: ctx.occluders });
  buildWall(g, { side: 'E', line: hw, a: z1 - 0.1, b: z0 + 0.1, upper, lower, height: H, occluders: ctx.occluders });
  // End walls around the door openings (hallway side of the room walls).
  const hole = [{ a: -DOOR_W / 2, b: DOOR_W / 2, top: DOOR_H }];
  buildWall(g, { side: 'S', line: z0 - 0.001, a: -hw, b: hw, holes: hole, upper, lower, height: H });
  buildWall(g, { side: 'N', line: z1 + 0.001, a: -hw, b: hw, holes: hole, upper, lower, height: H });
  // Jamb liners so the wall thickness never shows a gap.
  const liner = mat(COLORS.cream, { rough: 0.5 });
  for (const [za, zb] of [
    [a.zN, z0],
    [z1, b.zS],
  ]) {
    const zc = (za + zb) / 2;
    const d = Math.abs(za - zb) + 0.02;
    for (const sx of [-1, 1]) g.add(mesh(box(0.03, DOOR_H, d), liner, { pos: [sx * (DOOR_W / 2 + 0.015), DOOR_H / 2, zc], cast: false }));
    g.add(mesh(box(DOOR_W + 0.06, 0.03, d), liner, { pos: [0, DOOR_H + 0.015, zc], cast: false }));
  }
  ctx.collision.add(-hw - WALL_T, z1 - 0.2, -hw, z0 + 0.2, 'wall');
  ctx.collision.add(hw, z1 - 0.2, hw + WALL_T, z0 + 0.2, 'wall');
  // Casing on the far side of the next room's opening.
  if (sconce) {
    const s = group([
      mesh(box(0.12, 0.2, 0.04), mat(COLORS.woodDark), {}),
      mesh(new THREE.SphereGeometry(0.07, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), emissiveMat(0xffe2a8, 1.4), {
        pos: [0, 0.04, 0.06],
        rot: [Math.PI, 0, 0],
        cast: false,
      }),
    ]);
    const glow = glowSprite(COLORS.lamp, 0.8, 0.5);
    glow.position.set(0, 0.0, 0.09);
    s.add(glow);
    s.position.set(hw - 0.02, 1.75, cz);
    s.rotation.y = -Math.PI / 2;
    g.add(s);
  }
  return g;
}
