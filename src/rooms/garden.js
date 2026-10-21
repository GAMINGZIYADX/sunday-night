import * as THREE from 'three';
import { LIGHT } from '../engine/quality.js';
import { COLORS, CLUES } from '../config.js';
import { mat, mesh, group, rbox, box, cyl, sphere, plane, cone, torus } from '../engine/materials.js';
import { brick, grass, paperTexture, canvasTexture, makeCanvas, rr, rand } from '../engine/textures.js';
import { woodMat, stringLights, glowSprite, stone, bush, tulipGeometries, pottedPlant, foldedThrow, mug } from '../engine/props.js';
import { buildWall } from './shell.js';
import { Door } from './door.js';
import { lockOverlay, constellationOverlay } from '../ui/overlays.js';
import { ROOMS, WALL_T, DOOR_W, DOOR_H } from '../engine/layout.js';
import { PROMPTS } from '../config.js';
import { placeNote } from './notes.js';
import { buildMaze } from './maze.js';

const C = COLORS;
const WALL_H = 2.5;

// A star-filled sky dome shared by the garden and the clearing.
export function buildSky(parent, center) {
  const skyGeo = new THREE.SphereGeometry(60, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {},
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader:
      'varying vec3 vP; void main(){ float h = clamp(vP.y, -0.2, 1.0); vec3 top = vec3(0.05,0.06,0.17); vec3 mid = vec3(0.16,0.15,0.33); vec3 low = vec3(0.36,0.25,0.38); vec3 c = mix(low, mid, smoothstep(0.0,0.25,h)); c = mix(c, top, smoothstep(0.25,0.9,h)); gl_FragColor = vec4(c,1.0); }',
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.position.copy(center);
  sky.renderOrder = -10;
  parent.add(sky);
  // Stars.
  const n = 1400;
  const pos = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = rand();
    const v = 0.08 + rand() * 0.92;
    const th = u * Math.PI * 2;
    const r = 55;
    const y = v * r;
    const rr2 = Math.sqrt(r * r - y * y);
    pos.set([Math.cos(th) * rr2 + center.x, y + center.y, Math.sin(th) * rr2 + center.z], i * 3);
    const w = 0.7 + rand() * 0.3;
    col.set([w, w * (0.92 + rand() * 0.08), w * (0.85 + rand() * 0.15)], i * 3);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const starTex = makeCanvas(32, 32);
  const sx = starTex.getContext('2d');
  const grd = sx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  sx.fillStyle = grd;
  sx.fillRect(0, 0, 32, 32);
  const stars = new THREE.Points(
    sg,
    new THREE.PointsMaterial({
      size: 0.55,
      map: canvasTexture(starTex),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      fog: false,
      sizeAttenuation: true,
    }),
  );
  stars.renderOrder = -9;
  parent.add(stars);
  // Moon.
  const moon = glowSprite(0xfff3d0, 9, 0.5);
  moon.position.set(center.x - 18, center.y + 26, center.z - 30);
  parent.add(moon);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.6, 32), new THREE.MeshBasicMaterial({ color: 0xfff6dc, fog: false }));
  disc.position.copy(moon.position);
  disc.lookAt(center);
  parent.add(disc);
  return { sky, stars };
}

// Instanced glowing tulips: positions [[x, z, color], ...].
export function tulipField(parent, list, { glow = 0.55, scale = 1 } = {}) {
  const geo = tulipGeometries();
  const blue = list.filter((t) => t[2] === 'B');
  const white = list.filter((t) => t[2] !== 'B');
  const stemMesh = new THREE.InstancedMesh(geo.stem, mat(C.stem, { flat: true, rough: 0.8 }), list.length);
  const mk = (arr, color, em) =>
    new THREE.InstancedMesh(geo.head, mat(color, { flat: true, rough: 0.5, emissive: em, ei: glow }), Math.max(1, arr.length));
  const bMesh = mk(blue, C.tulipBlue, 0x5d8ee8);
  const wMesh = mk(white, C.tulipWhite, 0xfff2dc);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  let bi = 0;
  let wi = 0;
  list.forEach(([x, z, c], i) => {
    const k = scale * (0.85 + rand() * 0.35);
    e.set(rr(-0.15, 0.15), rr(0, 6.28), rr(-0.15, 0.15));
    q.setFromEuler(e);
    s.set(k, k, k);
    p.set(x, 0, z);
    m.compose(p, q, s);
    stemMesh.setMatrixAt(i, m);
    const top = new THREE.Vector3(0, geo.height * k - 0.005, 0).applyQuaternion(q).add(p);
    m.compose(top, q, s);
    if (c === 'B') bMesh.setMatrixAt(bi++, m);
    else wMesh.setMatrixAt(wi++, m);
  });
  bMesh.count = bi;
  wMesh.count = wi;
  for (const im of [stemMesh, bMesh, wMesh]) {
    im.instanceMatrix.needsUpdate = true;
    im.castShadow = false;
    im.receiveShadow = false;
    im.computeBoundingSphere();
    parent.add(im);
  }
  return { stemMesh, bMesh, wMesh };
}

export function lantern() {
  const g = group();
  g.add(mesh(cyl(0.02, 0.02, 0.9, 6), mat(0x2e2a33, { metal: 0.5 }), { pos: [0, 0.45, 0] }));
  g.add(mesh(rbox(0.16, 0.2, 0.16, 0.02), mat(0xfff0c8, { emissive: 0xffc870, ei: 1.6, rough: 0.6 }), { pos: [0, 1.0, 0], cast: false }));
  g.add(mesh(cone(0.13, 0.08, 4), mat(0x2e2a33, { metal: 0.5 }), { pos: [0, 1.14, 0], rot: [0, Math.PI / 4, 0] }));
  const gl = glowSprite(0xffc870, 0.9, 0.6);
  gl.position.set(0, 1.0, 0);
  g.add(gl);
  return g;
}

export function buildGarden(ctx) {
  const ROOM = 4;
  const R = ROOMS[ROOM];
  const g = ctx.roomGroup(ROOM);
  const col = ctx.collision;
  const gs = ctx.gs;
  const cz = R.cz;

  // ------------------------------------------------------- ground + walls
  const ground = mesh(new THREE.PlaneGeometry(R.w, R.d), mat(0xffffff, { map: grass([6, 6]), rough: 1 }), {
    rot: [-Math.PI / 2, 0, 0],
    pos: [0, 0, cz],
    cast: false,
  });
  g.add(ground);
  const brickMat = mat(0xffffff, { map: brick(0xa9786a, [1, 1]), rough: 0.95 });
  const topMat = mat(0xc9b8a8, { rough: 0.9 });
  const gate = { a: -DOOR_W / 2, b: DOOR_W / 2, top: DOOR_H };
  // A gap in the east wall leads into the hedge maze (rooms/maze.js).
  const MAZE_Z = -41.3; // the centre of the maze's entrance row
  const mazeGap = { a: MAZE_Z - DOOR_W / 2, b: MAZE_Z + DOOR_W / 2, top: DOOR_H };
  buildWall(g, { side: 'N', line: R.zN, a: R.x0, b: R.x1, holes: [gate], upper: brickMat, rail: false, height: WALL_H, occluders: ctx.occluders });
  buildWall(g, { side: 'W', line: R.x0, a: R.zN, b: R.zS, upper: brickMat, rail: false, height: WALL_H, occluders: ctx.occluders });
  buildWall(g, { side: 'E', line: R.x1, a: R.zN, b: R.zS, holes: [mazeGap], upper: brickMat, rail: false, height: WALL_H, occluders: ctx.occluders });
  // its maze-side face
  buildWall(g, {
    side: 'W',
    line: R.x1 + WALL_T,
    a: R.zN,
    b: R.zS,
    holes: [mazeGap],
    upper: brickMat,
    rail: false,
    height: WALL_H,
    occluders: ctx.occluders,
  });
  // the top of the gap, and its sides
  g.add(mesh(box(WALL_T, WALL_H - DOOR_H, DOOR_W), brickMat, { pos: [R.x1 + WALL_T / 2, (WALL_H + DOOR_H) / 2, MAZE_Z], cast: false }));
  for (const z of [mazeGap.a, mazeGap.b]) g.add(mesh(box(WALL_T, DOOR_H, 0.01), brickMat, { pos: [R.x1 + WALL_T / 2, DOOR_H / 2, z], cast: false }));
  // wall caps
  g.add(mesh(box(R.w + 0.3, 0.1, 0.3), topMat, { pos: [0, WALL_H + 0.05, R.zN - 0.1] }));
  g.add(mesh(box(0.3, 0.1, R.d + 0.3), topMat, { pos: [R.x0 - 0.1, WALL_H + 0.05, cz] }));
  g.add(mesh(box(0.3, 0.1, R.d + 0.3), topMat, { pos: [R.x1 + 0.1, WALL_H + 0.05, cz] }));
  // outer faces of the north wall (seen from the clearing path)
  buildWall(g, { side: 'S', line: R.zN - WALL_T, a: R.x0, b: R.x1, holes: [gate], upper: brickMat, rail: false, height: WALL_H });
  col.add(R.x0, R.zN - WALL_T, -DOOR_W / 2, R.zN, 'wall');
  col.add(DOOR_W / 2, R.zN - WALL_T, R.x1, R.zN, 'wall');
  col.add(R.x0 - WALL_T, R.zN - 0.3, R.x0, R.zS + 0.3, 'wall');
  col.add(R.x1, R.zN - 0.3, R.x1 + WALL_T, mazeGap.a, 'wall');
  col.add(R.x1, mazeGap.b, R.x1 + WALL_T, R.zS + 0.3, 'wall');
  // gate posts
  for (const sx of [-1, 1]) {
    g.add(
      mesh(rbox(0.3, DOOR_H + 0.5, 0.34, 0.03), mat(0xb98a78, { rough: 0.9 }), { pos: [sx * (DOOR_W / 2 + 0.15), (DOOR_H + 0.5) / 2, R.zN - 0.1] }),
    );
    g.add(mesh(sphere(0.14, 12, 8), topMat, { pos: [sx * (DOOR_W / 2 + 0.15), DOOR_H + 0.62, R.zN - 0.1] }));
  }
  // arch of tulip vines over the gate
  const arch = mesh(torus(DOOR_W / 2 + 0.15, 0.05, 6, 24, Math.PI), mat(0x5f7f55, { flat: true }), { pos: [0, DOOR_H + 0.55, R.zN - 0.1] });
  g.add(arch);

  // House back wall (south side), seen from the garden: a warm exterior.
  const houseMat = mat(0xffffff, { map: brick(0xd9b8a0, [1, 1]), rough: 0.95 });
  buildWall(g, { side: 'S', line: R.zS, a: R.x0, b: R.x1, holes: [gate], upper: houseMat, rail: false, height: 4.2, occluders: ctx.occluders });
  col.add(R.x0, R.zS, -DOOR_W / 2, R.zS + WALL_T, 'wall');
  col.add(DOOR_W / 2, R.zS, R.x1, R.zS + WALL_T, 'wall');
  g.add(mesh(box(R.w + 0.6, 0.18, 0.7), mat(0x7a5a52), { pos: [0, 4.25, R.zS - 0.2] }));
  for (const x of [-3.6, 3.6]) {
    const w = group(
      [
        mesh(plane(1.1, 1.0), mat(0xffd59a, { emissive: 0xffb860, ei: 1.1 }), { cast: false }),
        mesh(rbox(1.22, 0.08, 0.08, 0.02), mat(C.cream), { pos: [0, 0.54, 0.02] }),
        mesh(rbox(1.22, 0.08, 0.08, 0.02), mat(C.cream), { pos: [0, -0.54, 0.02] }),
        mesh(box(0.05, 1.0, 0.05), mat(C.cream), { pos: [0, 0, 0.02] }),
        mesh(rbox(1.3, 0.06, 0.2, 0.02), mat(C.cream), { pos: [0, -0.58, 0.08] }),
      ],
      { pos: [x, 1.55, R.zS - 0.01], rot: [0, Math.PI, 0] },
    );
    g.add(w);
    const wg = glowSprite(0xffc070, 2.2, 0.25);
    wg.position.set(x, 1.55, R.zS - 0.3);
    g.add(wg);
    // window boxes with tulips
    g.add(mesh(rbox(1.1, 0.16, 0.22, 0.03), woodMat('dark'), { pos: [x, 0.95, R.zS - 0.14] }));
  }
  // a little porch light over the back door
  const porch = group([mesh(rbox(0.16, 0.22, 0.12, 0.03), mat(0xfff0c8, { emissive: 0xffc870, ei: 1.6 }), { cast: false })], {
    pos: [0.85, 2.35, R.zS - 0.08],
  });
  const pg = glowSprite(0xffc870, 1.0, 0.6);
  porch.add(pg);
  g.add(porch);

  buildSky(g, new THREE.Vector3(0, -6, cz - 8));

  // --------------------------------------------------- path + tulip beds
  const pathPts = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const z = R.zS - 0.6 - t * (R.d - 1.2);
    const x = Math.sin(t * Math.PI * 1.6) * 1.1 * (1 - t * 0.85);
    pathPts.push([x, z]);
    const s = stone({ r: 0.32 + rr(-0.04, 0.05), color: 0xb5aca2, flat: 0.12 });
    s.position.set(x + rr(-0.06, 0.06), 0.01, z);
    s.scale.set(1.1, 1, 0.85);
    s.castShadow = false;
    g.add(s);
  }
  const nearPath = (x, z, d) => pathPts.some(([px, pz]) => Math.hypot(px - x, pz - z) < d);
  const tulips = [];
  const beds = [
    // [x0, x1, z0, z1]
    [-5.6, -2.2, R.zS - 1.5, R.zS - 4.2],
    [2.2, 5.6, R.zS - 1.5, R.zS - 3.6],
    [-5.6, -2.4, cz - 0.6, cz - 4.2],
    [2.0, 5.6, cz + 1.8, cz - 0.2],
    [1.6, 5.6, R.zN + 3.0, R.zN + 0.6],
    [-5.6, -1.6, R.zN + 2.6, R.zN + 0.6],
  ];
  beds.forEach(([x0, x1, z0, z1], b) => {
    // bed border of small stones
    const w = x1 - x0;
    const d = z0 - z1;
    g.add(mesh(rbox(w + 0.2, 0.08, d + 0.2, 0.03), mat(0x4a3628, { rough: 1 }), { pos: [(x0 + x1) / 2, 0.03, (z0 + z1) / 2], cast: false }));
    // Light graphics plants the beds about half as densely.
    const step = LIGHT ? 0.34 : 0.24;
    for (let x = x0 + 0.12; x < x1; x += step)
      for (let z = z1 + 0.12; z < z0; z += step) {
        if (nearPath(x, z, 0.9)) continue;
        const row = Math.round((x - x0) / step);
        tulips.push([x + rr(-0.05, 0.05), z + rr(-0.05, 0.05), (row + b) % 2 ? 'B' : 'W']);
      }
  });
  const field = tulipField(g, tulips, { glow: 0.6, scale: LIGHT ? 1.15 : 1 });
  // bushes along the walls
  for (let z = R.zS - 1; z > R.zN + 0.5; z -= 1.5) {
    for (const x of [R.x0 + 0.45, R.x1 - 0.45]) {
      if (x > 0 && Math.abs(z - MAZE_Z) < 1.3) continue; // keep the way into the maze clear
      const b = bush({ r: 0.55, color: 0x46684a });
      b.position.set(x, 0, z + rr(-0.2, 0.2));
      g.add(b);
    }
  }
  col.add(R.x0, R.zN, R.x0 + 0.75, R.zS, 'bush');
  col.add(R.x1 - 0.75, R.zN, R.x1, mazeGap.a - 0.15, 'bush');
  col.add(R.x1 - 0.75, mazeGap.b + 0.15, R.x1, R.zS, 'bush');

  // ------------------------------------------------------ the hedge maze
  const maze = buildMaze(ctx, { room: ROOM, x0: R.x1 + WALL_T, zTop: -34.7, cols: 11, rows: 9, cell: 1.2, entranceRow: 5 });
  // lanterns along the path
  const lanterns = [];
  [
    [1.4, R.zS - 2.4],
    [-1.5, cz + 1.5],
    [1.3, cz - 2.2],
    [-1.0, R.zN + 1.4],
  ].forEach(([x, z]) => {
    const l = lantern();
    l.position.set(x, 0, z);
    g.add(l);
    lanterns.push(l);
    col.addCentered(x, z, 0.2, 0.2);
  });
  // string lights from the house to the far wall
  const sl1 = stringLights(
    [
      [-5.8, 3.4, R.zS - 0.2],
      [-2, 2.9, cz],
      [1.5, 2.7, R.zN + 0.4],
    ],
    { bulbs: 34, sag: 0.4 },
  );
  const sl2 = stringLights(
    [
      [5.8, 3.4, R.zS - 0.2],
      [2, 3.0, cz - 1],
      [-1.5, 2.7, R.zN + 0.4],
    ],
    { bulbs: 34, sag: 0.4 },
  );
  g.add(sl1, sl2);
  for (const [x, z] of [
    [1.5, R.zN + 0.4],
    [-1.5, R.zN + 0.4],
  ])
    g.add(mesh(cyl(0.03, 0.03, 2.7, 6), woodMat('dark'), { pos: [x, 1.35, z + 0.05] }));

  // ------------------------------------------------- bench with note 5
  const bx = -3.6;
  const bz = cz + 0.6;
  const bench = group([], { pos: [bx, 0, bz], rot: [0, Math.PI / 2, 0] });
  const bw = woodMat('light');
  for (let i = 0; i < 3; i++) bench.add(mesh(rbox(1.5, 0.04, 0.12, 0.015), bw, { pos: [0, 0.45, -0.15 + i * 0.14] }));
  for (let i = 0; i < 2; i++) bench.add(mesh(rbox(1.5, 0.1, 0.035, 0.015), bw, { pos: [0, 0.68 + i * 0.16, -0.24], rot: [-0.12, 0, 0] }));
  for (const x of [-0.65, 0.65]) {
    bench.add(mesh(rbox(0.06, 0.45, 0.4, 0.02), mat(0x2e2a33, { metal: 0.5 }), { pos: [x, 0.225, 0] }));
    bench.add(mesh(rbox(0.06, 0.5, 0.05, 0.02), mat(0x2e2a33, { metal: 0.5 }), { pos: [x, 0.7, -0.24] }));
  }
  const bt = foldedThrow(0.45, 0.32, C.blush);
  bt.position.set(-0.4, 0.5, 0);
  bench.add(bt);
  g.add(bench);
  col.addCentered(bx, bz, 0.6, 1.6);
  // The note stands on the bench seat, leaning on the backrest.
  placeNote(ctx, ROOM, 4, { pos: [bx - 0.02, 0.472, bz + 0.3], rotY: Math.PI / 2, mode: 'stand' });
  const bm = mug(C.cream, { steam: true });
  bm.position.set(bx, 0.47, bz - 0.4);
  g.add(bm);

  // --------------------------------------------- telescope (puzzle B)
  const tx = 3.4;
  const tz = cz - 1.6;
  const pzB = gs.puzzles.r5b;
  const scope = group([], { pos: [tx, 0, tz] });
  const iron = mat(0x3b3442, { metal: 0.5, rough: 0.4 });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = mesh(cyl(0.018, 0.018, 1.2, 6), woodMat('dark'), { pos: [Math.cos(a) * 0.22, 0.56, Math.sin(a) * 0.22] });
    leg.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
    scope.add(leg);
  }
  const tube = group(
    [
      mesh(cyl(0.07, 0.09, 0.9, 16), mat(0xe9d7b0, { metal: 0.6, rough: 0.3 }), { rot: [0, 0, Math.PI / 2] }),
      mesh(cyl(0.095, 0.095, 0.08, 16), iron, { pos: [0.45, 0, 0], rot: [0, 0, Math.PI / 2] }),
      mesh(cyl(0.03, 0.03, 0.12, 10), iron, { pos: [-0.5, 0, 0], rot: [0, 0, Math.PI / 2] }),
      mesh(torus(0.08, 0.012, 6, 16), mat(C.gold, { metal: 0.7 }), { pos: [0.1, 0, 0], rot: [0, Math.PI / 2, 0] }),
    ],
    { pos: [0, 1.18, 0], rot: [0, -0.7, 0.55] },
  );
  scope.add(tube);
  g.add(scope);
  col.addCentered(tx, tz, 0.55, 0.55);
  ctx.interact.add(scope, {
    zones: [ROOM],
    puzzle: 'r5b',
    enabled: () => !pzB.isSolved(),
    prompt: PROMPTS.telescope,
    onUse: () => constellationOverlay(ctx.game, pzB),
  });
  const starGlow = glowSprite(0xfff0d0, 0.5, 0);
  starGlow.position.set(tx + 0.5, 1.5, tz - 0.4);
  g.add(starGlow);

  // ------------------------------------------------ the final gate
  const door = new Door(ctx, ROOM, { style: 'gate' });
  ctx.doors[ROOM] = door;
  const pzA = gs.puzzles.r5a;
  // The 4-digit lock box on the right gate post.
  const lockC = makeCanvas(256, 128);
  const lockTex = canvasTexture(lockC);
  const lockBox = group(
    [
      mesh(rbox(0.26, 0.2, 0.08, 0.02), mat(0xc9a25a, { metal: 0.7, rough: 0.35 }), {}),
      mesh(plane(0.22, 0.1), mat(0xffffff, { map: lockTex }), { pos: [0, 0.01, 0.042], cast: false }),
      mesh(torus(0.05, 0.012, 6, 14, Math.PI), mat(0xd5dbe3, { metal: 0.85, rough: 0.25 }), { pos: [0, 0.1, 0] }),
    ],
    { pos: [DOOR_W / 2 + 0.15, 1.25, R.zN + 0.11] },
  );
  g.add(lockBox);
  const drawLock = () => {
    const x = lockC.getContext('2d');
    x.fillStyle = '#2a2430';
    x.fillRect(0, 0, 256, 128);
    x.font = 'bold 76px "Courier New", monospace';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    pzA.digits.forEach((d, i) => {
      x.fillStyle = pzA.isSolved() ? '#ffe08a' : '#f4e6c8';
      x.fillText(String(d), 40 + i * 58, 68);
    });
    lockTex.needsUpdate = true;
  };
  pzA.onChange(() => drawLock());
  ctx.interact.add(lockBox, {
    zones: [ROOM],
    puzzle: 'r5a',
    enabled: () => !pzA.isSolved(),
    prompt: PROMPTS.lock,
    onUse: () => lockOverlay(ctx.game, pzA),
  });
  // "Remember what each room gave you." pinned to the left post.
  const gn = group(
    [
      mesh(
        plane(0.24, 0.16),
        mat(0xffffff, { map: paperTexture(CLUES.gate.text, { w: 256, h: 170, size: 24, center: true, lines: false, bg: '#fff6e6' }) }),
        { cast: false },
      ),
    ],
    {
      pos: [-DOOR_W / 2 - 0.15, 1.35, R.zN + 0.08],
      rot: [0, 0, 0.05],
    },
  );
  g.add(gn);
  ctx.interact.add(gn, { zones: [ROOM], puzzle: 'r5a', prompt: PROMPTS.gateNote, onUse: () => ctx.showClue('gate') });
  // pots by the gate
  for (const sx of [-1, 1]) {
    const p = pottedPlant({ size: 0.8, potColor: C.blushDeep, leafColor: 0x5f8a52 });
    p.position.set(sx * 1.25, 0, R.zN + 0.55);
    g.add(p);
    col.addCentered(sx * 1.25, R.zN + 0.55, 0.35, 0.35);
  }

  ctx.cats.addZone(ROOM, [
    [0.2, cz],
    [-1.7, cz + 3.5],
    [1.9, cz + 3.2],
    [-1.4, cz - 2.6],
    [2.4, cz - 3.1],
    [-2.9, cz + 0.6],
    [-3.6, cz + 0.6, 0.47, 5],
  ]);

  ctx.addUpdate((dt, t) => {
    sl1.userData.twinkle(t);
    sl2.userData.twinkle(t);
    const k = 0.5 + Math.sin(t * 0.8) * 0.1;
    field.bMesh.material.emissiveIntensity = k;
    field.wMesh.material.emissiveIntensity = k * 0.8;
    starGlow.material.opacity = pzB.isSolved() ? 0.5 + Math.sin(t * 2) * 0.2 : 0;
  });

  return {
    index: ROOM,
    rig: {
      hemi: { sky: 0x7c88cc, ground: 0x2b3a2c, intensity: 0.9 },
      spot: { pos: [-7, 16, cz + 3], target: [0, 0, cz - 1], color: 0xaebeff, intensity: 340, angle: 0.62, penumbra: 0.5, far: 40 },
      points: [
        { pos: [0, 2.6, R.zS - 1.2], color: 0xffc070, intensity: 4 },
        { pos: [0, 2.2, cz - 1], color: 0xffd8a0, intensity: 3.5 },
        { pos: [0, 1.8, R.zN + 1.0], color: 0xffc870, intensity: 3 },
      ],
      fog: { color: 0x151a36, near: 14, far: 42 },
      background: 0x0e1230,
    },
    anchors: { r5a: new THREE.Vector3(DOOR_W / 2 + 0.15, 1.25, R.zN + 0.1), r5b: new THREE.Vector3(tx, 1.2, tz) },
    keySpawn: (id) => (id === 'r5a' ? new THREE.Vector3(0.9, 1.3, R.zN + 0.7) : new THREE.Vector3(tx - 0.4, 1.4, tz + 0.3)),
    maze,
    applyState() {
      drawLock();
      maze.rebuild(gs.data.mazeSeed);
      maze.resetJar();
    },
  };
}
