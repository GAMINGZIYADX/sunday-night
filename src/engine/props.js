import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { COLORS } from '../config.js';
import { mat, rbox, box, cyl, sphere, plane, torus, mesh, group } from './materials.js';
import { woodGrain, fabric, glowTexture, rr, rand, paperTexture, HAND_FONT } from './textures.js';

// A library of cosy, rounded, low-poly props. Every builder returns a Group
// whose origin sits on the floor at its centre, facing +Z (towards the room)
// unless noted.

const C = COLORS;
let _woodTex = null;
let _woodDarkTex = null;
let _woodLightTex = null;
export function woodMat(kind = 'mid') {
  if (kind === 'dark') return mat(0xffffff, { map: (_woodDarkTex ||= woodGrain(C.woodDark)) });
  if (kind === 'light') return mat(0xffffff, { map: (_woodLightTex ||= woodGrain(C.woodLight)) });
  return mat(0xffffff, { map: (_woodTex ||= woodGrain(C.wood)) });
}

// An invisible box that only exists for clicking (covers gaps in a pile, etc).
const _hitMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
export function hitArea(w, h, d) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), _hitMat);
  m.userData.noGlow = true;
  return m;
}

// ------------------------------------------------------------ glow helpers
export function glowSprite(color = C.lamp, size = 0.5, opacity = 0.7) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(),
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  s.scale.setScalar(size);
  s.renderOrder = 5;
  s.raycast = () => {}; // a glow is never what you click on
  return s;
}

export function emissiveMat(color, intensity = 1.5) {
  return mat(color, { emissive: color, ei: intensity, rough: 0.6 });
}

// ------------------------------------------------------------------ tulips
let _tulipGeo = null;
export function tulipGeometries() {
  if (_tulipGeo) return _tulipGeo;
  // Cup: a lathe profile with a slightly flared crown. Low segment count keeps
  // the faceted, storybook look.
  const prof = [
    [0.0, 0.0],
    [0.016, 0.003],
    [0.028, 0.016],
    [0.033, 0.034],
    [0.031, 0.052],
    [0.024, 0.07],
    [0.027, 0.074],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const head = new THREE.LatheGeometry(prof, 7);
  // Three petal tips.
  const tips = [];
  for (let i = 0; i < 3; i++) {
    const t = new THREE.ConeGeometry(0.014, 0.03, 4);
    const a = (i / 3) * Math.PI * 2;
    t.translate(0, 0.084, 0);
    t.translate(Math.cos(a) * 0.016, 0, Math.sin(a) * 0.016);
    tips.push(t);
  }
  const headGeo = mergeGeometries([head.toNonIndexed(), ...tips.map((t) => t.toNonIndexed())]);
  headGeo.computeVertexNormals();
  // Stem + two leaves.
  const stem = new THREE.CylinderGeometry(0.004, 0.006, 0.3, 5).translate(0, 0.15, 0);
  const leafA = new THREE.SphereGeometry(0.05, 6, 4).scale(0.28, 1.6, 0.06).rotateZ(0.35).translate(-0.022, 0.08, 0);
  const leafB = new THREE.SphereGeometry(0.045, 6, 4).scale(0.28, 1.5, 0.06).rotateZ(-0.4).rotateY(1.8).translate(0.018, 0.07, 0.01);
  const stemGeo = mergeGeometries([stem.toNonIndexed(), leafA.toNonIndexed(), leafB.toNonIndexed()]);
  stemGeo.computeVertexNormals();
  _tulipGeo = { head: headGeo, stem: stemGeo, height: 0.3 };
  return _tulipGeo;
}

export function tulipMat(color, glow = 0) {
  return mat(color === 'B' || color === 'blue' ? C.tulipBlue : color === 'W' || color === 'white' ? C.tulipWhite : color, {
    flat: true,
    rough: 0.55,
    emissive: glow ? (color === 'B' || color === 'blue' ? C.tulipBlue : 0xfff4e0) : 0,
    ei: glow,
  });
}

export function tulip(color = 'B', { scale = 1, glow = 0, lean = 0 } = {}) {
  const g = tulipGeometries();
  const stem = mesh(g.stem, mat(C.stem, { flat: true }), { cast: false });
  const head = mesh(g.head, tulipMat(color, glow), { pos: [0, g.height - 0.005, 0], cast: false });
  const t = group([stem, head], { scale });
  t.rotation.z = lean;
  t.userData.head = head;
  return t;
}

// A bunch of tulips in a vase.
export function vaseWithTulips({ colors = ['B', 'W', 'B', 'W', 'B'], vaseColor = C.cream, h = 0.2 } = {}) {
  const v = new THREE.LatheGeometry(
    [
      [0, 0],
      [0.06, 0.005],
      [0.075, 0.06],
      [0.06, h * 0.75],
      [0.04, h * 0.95],
      [0.048, h],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    14,
  );
  const vase = mesh(v, mat(vaseColor, { rough: 0.35 }));
  const g = group([vase]);
  colors.forEach((c, i) => {
    const a = (i / colors.length) * Math.PI * 2;
    const t = tulip(c, { scale: 1 + rr(-0.08, 0.12) });
    t.position.set(Math.cos(a) * 0.02, h - 0.12, Math.sin(a) * 0.02);
    t.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
    g.add(t);
  });
  g.userData.prop = 'vaseWithTulips';
  return g;
}

// ------------------------------------------------------------------ plants
export function pottedPlant({ potColor = C.blushDeep, size = 1, leaves = 9, leafColor = C.sageDeep } = {}) {
  const pot = mesh(
    new THREE.LatheGeometry(
      [
        [0, 0],
        [0.11, 0],
        [0.14, 0.22],
        [0.155, 0.24],
        [0.15, 0.26],
        [0, 0.26],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      12,
    ),
    mat(potColor, { rough: 0.7 }),
  );
  const soil = mesh(cyl(0.135, 0.135, 0.01, 12), mat(0x4a3426), { pos: [0, 0.25, 0] });
  const g = group([pot, soil]);
  const leafGeo = new THREE.SphereGeometry(0.1, 6, 4).scale(0.45, 1.6, 0.12);
  for (let i = 0; i < leaves; i++) {
    const a = (i / leaves) * Math.PI * 2 + rr(-0.2, 0.2);
    const tilt = rr(0.25, 0.7);
    const leaf = mesh(leafGeo, mat(new THREE.Color(leafColor).offsetHSL(0, 0, rr(-0.06, 0.06)).getHex(), { flat: true }));
    const pivot = group([leaf], { pos: [0, 0.26, 0] });
    leaf.position.y = 0.15;
    pivot.rotation.set(Math.cos(a) * tilt, a, Math.sin(a) * tilt, 'YXZ');
    pivot.rotation.order = 'YXZ';
    pivot.rotation.set(tilt, a, 0);
    g.add(pivot);
  }
  g.scale.setScalar(size);
  g.userData.prop = 'pottedPlant';
  return g;
}

export function hangingPlant({ length = 0.6 } = {}) {
  const pot = mesh(cyl(0.12, 0.09, 0.14, 12), mat(C.cream, { rough: 0.5 }));
  const g = group([pot]);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const rope = mesh(cyl(0.004, 0.004, length, 4), mat(0xc9b28f), { pos: [Math.cos(a) * 0.05, length / 2 + 0.07, Math.sin(a) * 0.05], cast: false });
    rope.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12);
    g.add(rope);
  }
  const leafGeo = sphere(0.035, 6, 4);
  for (let v = 0; v < 7; v++) {
    const a = (v / 7) * Math.PI * 2;
    for (let k = 0; k < 6; k++) {
      const leaf = mesh(leafGeo, mat(k % 2 ? C.sage : C.sageDeep, { flat: true }), {
        pos: [Math.cos(a) * (0.11 + k * 0.01), 0.04 - k * 0.07, Math.sin(a) * (0.11 + k * 0.01)],
        scale: [1, 0.6, 1.4],
        cast: false,
      });
      g.add(leaf);
    }
  }
  return g;
}

// ------------------------------------------------------------------- books
const BOOK_COLORS = [0xc56b6b, 0x6b8fc5, 0xd9b45a, 0x7fa37a, 0xb58ac2, 0xe9d8c0, 0x8a6a4f, 0xe39a8d, 0x5f7f8f];
export function bookRow(width, { height = 0.24, depth = 0.18, colors = BOOK_COLORS, lean = true } = {}) {
  const g = group();
  let x = -width / 2;
  while (x < width / 2 - 0.03) {
    const w = rr(0.025, 0.05);
    if (x + w > width / 2) break;
    const h = height * rr(0.75, 1);
    const color = colors[Math.floor(rand() * colors.length)];
    const b = mesh(rbox(w, h, depth * rr(0.85, 1), 0.006, 1), mat(color, { rough: 0.7 }), { pos: [x + w / 2, h / 2, 0], cast: false });
    g.add(b);
    // little spine band
    if (rand() < 0.5)
      g.add(mesh(box(w + 0.002, 0.012, 0.02), mat(0xf3e2b8, { rough: 0.6 }), { pos: [x + w / 2, h * 0.75, depth / 2 - 0.005], cast: false }));
    x += w + 0.003;
    if (lean && rand() < 0.08 && x < width / 2 - 0.08) {
      const lw = 0.03;
      const lb = mesh(rbox(lw, h * 0.9, depth * 0.9, 0.006, 1), mat(colors[Math.floor(rand() * colors.length)]), {
        pos: [x + 0.04, h * 0.42, 0],
        rot: [0, 0, -0.35],
        cast: false,
      });
      g.add(lb);
      x += 0.075;
    }
  }
  g.userData.prop = 'bookRow';
  return g;
}

export function bookshelf({ w = 1.2, h = 1.8, d = 0.32, shelves = 4, fill = true, wood = 'light' } = {}) {
  const m = woodMat(wood);
  const t = 0.035;
  const g = group();
  g.add(mesh(rbox(t, h, d, 0.01), m, { pos: [-w / 2 + t / 2, h / 2, 0] }));
  g.add(mesh(rbox(t, h, d, 0.01), m, { pos: [w / 2 - t / 2, h / 2, 0] }));
  g.add(mesh(box(w - 2 * t, h - 0.02, 0.015), m, { pos: [0, h / 2, -d / 2 + 0.008] }));
  const gap = (h - t) / shelves;
  for (let i = 0; i <= shelves; i++) {
    g.add(mesh(rbox(w, t, d, 0.01), m, { pos: [0, i * gap + t / 2, 0] }));
    if (fill && i < shelves) {
      const row = bookRow(w - 2 * t - 0.04, { height: Math.min(0.28, gap - 0.06), depth: d * 0.8 });
      row.position.set(0, i * gap + t, 0.01);
      g.add(row);
    }
  }
  g.userData.shelfGap = gap;
  return g;
}

// --------------------------------------------------------------- lighting
export function tableLamp({ shade = C.cream, base = C.blushDeep, h = 0.45 } = {}) {
  const g = group();
  g.add(mesh(new THREE.SphereGeometry(0.08, 14, 10).scale(1, 0.9, 1).translate(0, 0.07, 0), mat(base, { rough: 0.4 })));
  g.add(mesh(cyl(0.012, 0.012, h * 0.45, 8), mat(0xd8c4a0, { metal: 0.3, rough: 0.4 }), { pos: [0, 0.14 + h * 0.2, 0] }));
  const shadeGeo = new THREE.CylinderGeometry(0.09, 0.14, 0.16, 18, 1, true);
  g.add(mesh(shadeGeo, mat(shade, { emissive: C.lamp, ei: 0.9, side: THREE.DoubleSide, rough: 0.9 }), { pos: [0, h - 0.04, 0], cast: false }));
  g.add(mesh(sphere(0.035, 10, 8), emissiveMat(0xfff1c8, 2.5), { pos: [0, h - 0.07, 0], cast: false }));
  const glow = glowSprite(C.lamp, 0.9, 0.55);
  glow.position.set(0, h - 0.05, 0);
  g.add(glow);
  g.userData.lightPos = new THREE.Vector3(0, h - 0.06, 0);
  g.userData.prop = 'tableLamp';
  return g;
}

export function floorLamp({ shade = C.cream, h = 1.55 } = {}) {
  const g = group();
  g.add(mesh(cyl(0.16, 0.18, 0.04, 18), mat(0x5a4a40, { metal: 0.3, rough: 0.5 }), { pos: [0, 0.02, 0] }));
  g.add(mesh(cyl(0.015, 0.015, h, 8), mat(0x5a4a40, { metal: 0.3, rough: 0.5 }), { pos: [0, h / 2, 0] }));
  g.add(
    mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.26, 20, 1, true), mat(shade, { emissive: C.lamp, ei: 0.85, side: THREE.DoubleSide }), {
      pos: [0, h, 0],
      cast: false,
    }),
  );
  g.add(mesh(sphere(0.045, 10, 8), emissiveMat(0xfff1c8, 2.5), { pos: [0, h - 0.04, 0], cast: false }));
  const glow = glowSprite(C.lamp, 1.3, 0.5);
  glow.position.set(0, h, 0);
  g.add(glow);
  g.userData.lightPos = new THREE.Vector3(0, h - 0.05, 0);
  g.userData.prop = 'floorLamp';
  return g;
}

export function pendantLamp({ drop = 0.6, color = C.cream } = {}) {
  const g = group();
  g.add(mesh(cyl(0.006, 0.006, drop, 6), mat(0x3a3030), { pos: [0, -drop / 2, 0], cast: false }));
  const shade = new THREE.SphereGeometry(0.22, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  g.add(mesh(shade, mat(color, { emissive: C.lamp, ei: 0.5, side: THREE.DoubleSide, rough: 0.6 }), { pos: [0, -drop - 0.12, 0], cast: false }));
  g.add(mesh(sphere(0.05, 10, 8), emissiveMat(0xfff1c8, 2.5), { pos: [0, -drop - 0.1, 0], cast: false }));
  const glow = glowSprite(C.lamp, 1.2, 0.45);
  glow.position.set(0, -drop - 0.16, 0);
  g.add(glow);
  return g;
}

// Fairy lights along a list of points (world-ish coordinates, local to group).
export function stringLights(points, { colors = [C.lamp, 0xfff4e0, C.lamp, 0xffd0d0], bulbs = 18, sag = 0.12 } = {}) {
  const g = group();
  const pts = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = new THREE.Vector3(...points[i]);
    const b = new THREE.Vector3(...points[i + 1]);
    for (let k = 0; k < 12; k++) {
      const t = k / 12;
      const p = a.clone().lerp(b, t);
      p.y -= Math.sin(t * Math.PI) * sag;
      pts.push(p);
    }
  }
  pts.push(new THREE.Vector3(...points[points.length - 1]));
  const curve = new THREE.CatmullRomCurve3(pts);
  g.add(mesh(new THREE.TubeGeometry(curve, pts.length * 2, 0.004, 4, false), mat(0x3d3a33), { cast: false, receive: false }));
  const bulbGeo = sphere(0.018, 8, 6);
  // All the glows of one string are a single batch of points (one draw call
  // instead of one per bulb). They twinkle by dimming their colours, which
  // with additive blending is the same as fading them.
  const pos = new Float32Array(bulbs * 3);
  const base = new Float32Array(bulbs * 3);
  const col = new THREE.Color();
  for (let i = 0; i < bulbs; i++) {
    const p = curve.getPointAt((i + 0.5) / bulbs);
    const color = colors[i % colors.length];
    g.add(mesh(bulbGeo, emissiveMat(color, 2.2), { pos: [p.x, p.y - 0.02, p.z], cast: false, receive: false }));
    pos.set([p.x, p.y - 0.02, p.z], i * 3);
    col.set(color).toArray(base, i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const cAttr = new THREE.BufferAttribute(
    base.map((v) => v * 0.65),
    3,
  );
  geo.setAttribute('color', cAttr);
  const glows = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      map: glowTexture(),
      vertexColors: true,
      // Matches a 0.22 m glow sprite: points are sized against the screen
      // height, sprites against the 70 degree field of view.
      size: 0.22 / Math.tan((35 * Math.PI) / 180),
      sizeAttenuation: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  glows.renderOrder = 5;
  g.add(glows);
  g.userData.twinkle = (t) => {
    const c = cAttr.array;
    for (let i = 0; i < bulbs; i++) {
      const k = 0.45 + 0.25 * Math.sin(t * 1.5 + i * 1.7);
      c[i * 3] = base[i * 3] * k;
      c[i * 3 + 1] = base[i * 3 + 1] * k;
      c[i * 3 + 2] = base[i * 3 + 2] * k;
    }
    cAttr.needsUpdate = true;
  };
  return g;
}

export function candle({ h = 0.1, color = C.cream } = {}) {
  const g = group([mesh(cyl(0.025, 0.025, h, 12), mat(color, { rough: 0.6 }), { pos: [0, h / 2, 0] })]);
  const flame = mesh(new THREE.SphereGeometry(0.012, 8, 6).scale(1, 1.8, 1), emissiveMat(0xffc46b, 3), { pos: [0, h + 0.02, 0], cast: false });
  g.add(flame);
  const glow = glowSprite(0xffb050, 0.3, 0.7);
  glow.position.set(0, h + 0.025, 0);
  g.add(glow);
  g.userData.flame = flame;
  g.userData.glow = glow;
  g.userData.prop = 'candle';
  return g;
}

// --------------------------------------------------------------- textiles
export function rugMesh(tex, w, d) {
  const material = mat(0xffffff, { map: tex, rough: 1, unique: true });
  material.alphaTest = 0.5;
  const m = mesh(plane(w, d), material, { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.006, 0], cast: false });
  return m;
}

export function cushion(w = 0.42, h = 0.14, d = 0.42, color = C.blush, tex = null) {
  const geo = new THREE.SphereGeometry(0.5, 14, 10).scale(w, h, d);
  return mesh(geo, tex ? mat(0xffffff, { map: tex }) : mat(color, { rough: 0.95 }));
}

// Curtain: a wavy vertical panel, origin at its top centre.
export function curtain(w, h, color, { folds = 4, depth = 0.035, tieBack = false } = {}) {
  const geo = new THREE.PlaneGeometry(w, h, folds * 8, 16);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const t = (h / 2 - y) / h; // 0 top, 1 bottom
    let z = Math.sin(((x + w / 2) / w) * folds * Math.PI * 2) * depth;
    let nx = x;
    if (tieBack) {
      // Gathered towards a tie-back two thirds of the way down, flaring below.
      const pinch = Math.exp(-Math.pow((t - 0.62) / 0.22, 2));
      nx = x * (1 - pinch * 0.45);
      z *= 1 - pinch * 0.4;
    }
    pos.setXYZ(i, nx, y - h / 2, z);
  }
  geo.computeVertexNormals();
  const tex = fabric(color, { knit: false });
  const m = mesh(geo, mat(0xffffff, { map: tex, side: THREE.DoubleSide, rough: 0.95 }));
  return m;
}

export function blanket(w = 0.9, d = 0.6, color = C.sage, stripes = C.cream) {
  const geo = new THREE.PlaneGeometry(w, d, 16, 10);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, Math.sin(x * 9) * 0.012 + Math.cos(y * 11) * 0.008);
  }
  geo.computeVertexNormals();
  const m = mesh(geo, mat(0xffffff, { map: fabric(color, { stripes, knit: true }), side: THREE.DoubleSide }), { rot: [-Math.PI / 2, 0, 0] });
  return m;
}

// Folded throw draped as a soft box.
export function foldedThrow(w = 0.5, d = 0.32, color = C.sage) {
  return mesh(rbox(w, 0.07, d, 0.03, 3), mat(0xffffff, { map: fabric(color, { stripes: C.cream, knit: true }) }));
}

// ----------------------------------------------------------------- frames
export function pictureFrame(w, h, tex, { frame = C.woodLight, depth = 0.03, border = 0.04, mat2 = 0xfaf3e6 } = {}) {
  const g = group();
  const fm = typeof frame === 'number' ? mat(frame, { rough: 0.6 }) : frame;
  g.add(mesh(rbox(w, border, depth, 0.008, 1), fm, { pos: [0, h / 2 - border / 2, 0] }));
  g.add(mesh(rbox(w, border, depth, 0.008, 1), fm, { pos: [0, -h / 2 + border / 2, 0] }));
  g.add(mesh(rbox(border, h, depth, 0.008, 1), fm, { pos: [-w / 2 + border / 2, 0, 0] }));
  g.add(mesh(rbox(border, h, depth, 0.008, 1), fm, { pos: [w / 2 - border / 2, 0, 0] }));
  g.add(mesh(box(w - border * 1.5, h - border * 1.5, 0.008), mat(mat2), { pos: [0, 0, -0.004], cast: false }));
  const pic = mesh(plane(w - border * 2.6, h - border * 2.6), mat(0xffffff, { map: tex, rough: 0.7 }), { pos: [0, 0, 0.002], cast: false });
  g.add(pic);
  g.userData.picture = pic;
  return g;
}

// -------------------------------------------------------------- tableware
export function mug(color = C.blush, { steam = false } = {}) {
  const body = new THREE.LatheGeometry(
    [
      [0, 0],
      [0.035, 0],
      [0.04, 0.01],
      [0.04, 0.09],
      [0.036, 0.09],
      [0.036, 0.012],
      [0, 0.012],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    16,
  );
  const g = group([mesh(body, mat(color, { rough: 0.35 }))]);
  g.add(mesh(torus(0.022, 0.006, 6, 12, Math.PI * 1.4), mat(color, { rough: 0.35 }), { pos: [0.042, 0.045, 0], rot: [0, 0, -Math.PI * 0.7] }));
  g.add(mesh(cyl(0.035, 0.035, 0.004, 14), mat(0x6b3f26, { rough: 0.2 }), { pos: [0, 0.075, 0], cast: false }));
  if (steam) {
    for (let i = 0; i < 3; i++) {
      const s = glowSprite(0xffffff, 0.08, 0.12);
      s.position.set(rr(-0.01, 0.01), 0.12 + i * 0.05, 0);
      g.add(s);
    }
  }
  g.userData.prop = 'mug';
  return g;
}

export function teapot(color = C.sage) {
  const g = group([mesh(new THREE.SphereGeometry(0.09, 16, 12).scale(1, 0.8, 1).translate(0, 0.075, 0), mat(color, { rough: 0.35 }))]);
  g.add(mesh(cyl(0.03, 0.04, 0.03, 12), mat(color, { rough: 0.35 }), { pos: [0, 0.15, 0] }));
  g.add(mesh(sphere(0.015, 8, 6), mat(C.cream), { pos: [0, 0.172, 0] }));
  g.add(mesh(cyl(0.012, 0.02, 0.1, 8), mat(color, { rough: 0.35 }), { pos: [0.1, 0.09, 0], rot: [0, 0, -0.9] }));
  g.add(mesh(torus(0.04, 0.009, 6, 12, Math.PI), mat(color, { rough: 0.35 }), { pos: [-0.085, 0.085, 0], rot: [0, 0, Math.PI / 2] }));
  g.userData.prop = 'teapot';
  return g;
}

export function plate(color = C.cream, r = 0.1) {
  const g = group([mesh(cyl(r, r * 0.8, 0.015, 20), mat(color, { rough: 0.3 }), { pos: [0, 0.008, 0] })]);
  g.userData.prop = 'plate';
  return g;
}

export function jar(color = 0xe8c48a, h = 0.16) {
  const g = group([mesh(cyl(0.05, 0.05, h, 14), mat(0xdfeef0, { rough: 0.1, opacity: 0.55 }), { pos: [0, h / 2, 0] })]);
  g.add(mesh(cyl(0.045, 0.045, h * 0.7, 12), mat(color, { rough: 0.8 }), { pos: [0, h * 0.36, 0] }));
  g.add(mesh(cyl(0.052, 0.052, 0.025, 14), mat(C.blushDeep), { pos: [0, h + 0.01, 0] }));
  g.userData.prop = 'jar';
  return g;
}

// ---------------------------------------------------------------- furniture
export function table({ w = 1.2, d = 0.7, h = 0.74, top = 0.045, wood = 'mid', legInset = 0.07, round = false } = {}) {
  const m = woodMat(wood);
  const g = group();
  if (round) g.add(mesh(cyl(w / 2, w / 2, top, 28), m, { pos: [0, h - top / 2, 0] }));
  else g.add(mesh(rbox(w, top, d, 0.018), m, { pos: [0, h - top / 2, 0] }));
  const lx = round ? w * 0.32 : w / 2 - legInset;
  const lz = round ? w * 0.32 : d / 2 - legInset;
  for (const [x, z] of [
    [-lx, -lz],
    [lx, -lz],
    [-lx, lz],
    [lx, lz],
  ])
    g.add(mesh(cyl(0.024, 0.018, h - top, 8), m, { pos: [x, (h - top) / 2, z] }));
  return g;
}

export function chair({ color = C.woodLight, cushionColor = C.blush, h = 0.46 } = {}) {
  const m = typeof color === 'number' ? mat(color, { rough: 0.7 }) : color;
  const g = group();
  g.add(mesh(rbox(0.42, 0.04, 0.42, 0.015), m, { pos: [0, h, 0] }));
  for (const [x, z] of [
    [-0.18, -0.18],
    [0.18, -0.18],
    [-0.18, 0.18],
    [0.18, 0.18],
  ])
    g.add(mesh(cyl(0.018, 0.015, h, 6), m, { pos: [x, h / 2, z] }));
  for (const x of [-0.18, 0.18]) g.add(mesh(cyl(0.016, 0.016, 0.45, 6), m, { pos: [x, h + 0.22, -0.19] }));
  g.add(mesh(rbox(0.42, 0.12, 0.03, 0.012), m, { pos: [0, h + 0.38, -0.19] }));
  g.add(mesh(rbox(0.4, 0.05, 0.38, 0.025, 3), mat(cushionColor, { rough: 0.95 }), { pos: [0, h + 0.04, 0.01] }));
  return g;
}

export function armchair({ color = C.sage, w = 0.85, cushionColor = C.cream } = {}) {
  const m = mat(color, { rough: 0.95 });
  const g = group();
  g.add(mesh(rbox(w, 0.28, 0.8, 0.07, 3), m, { pos: [0, 0.22, 0] }));
  g.add(mesh(rbox(w, 0.62, 0.2, 0.08, 3), m, { pos: [0, 0.5, -0.32] }));
  for (const x of [-w / 2 + 0.09, w / 2 - 0.09]) g.add(mesh(rbox(0.18, 0.36, 0.78, 0.08, 3), m, { pos: [x, 0.43, 0] }));
  g.add(mesh(rbox(w - 0.34, 0.12, 0.6, 0.06, 3), mat(cushionColor, { rough: 0.95 }), { pos: [0, 0.41, 0.05] }));
  for (const [x, z] of [
    [-w / 2 + 0.08, -0.32],
    [w / 2 - 0.08, -0.32],
    [-w / 2 + 0.08, 0.32],
    [w / 2 - 0.08, 0.32],
  ])
    g.add(mesh(cyl(0.025, 0.02, 0.08, 6), woodMat('dark'), { pos: [x, 0.04, z] }));
  return g;
}

export function sofa({ color = C.blushDeep, w = 2.1, cushion = C.cream } = {}) {
  const m = mat(color, { rough: 0.95 });
  const g = group();
  g.add(mesh(rbox(w, 0.3, 0.9, 0.08, 3), m, { pos: [0, 0.24, 0] }));
  g.add(mesh(rbox(w, 0.6, 0.24, 0.1, 3), m, { pos: [0, 0.55, -0.34] }));
  for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) g.add(mesh(rbox(0.22, 0.42, 0.9, 0.1, 3), m, { pos: [x, 0.42, 0] }));
  const seatW = (w - 0.44) / 2;
  for (const x of [-seatW / 2, seatW / 2]) {
    g.add(
      mesh(rbox(seatW - 0.02, 0.14, 0.66, 0.06, 3), mat(new THREE.Color(color).offsetHSL(0, 0, 0.04).getHex(), { rough: 0.95 }), {
        pos: [x, 0.46, 0.06],
      }),
    );
    g.add(
      mesh(rbox(seatW - 0.04, 0.38, 0.14, 0.07, 3), mat(new THREE.Color(color).offsetHSL(0, 0, 0.05).getHex(), { rough: 0.95 }), {
        pos: [x, 0.7, -0.2],
        rot: [-0.18, 0, 0],
      }),
    );
  }
  for (const [x, z] of [
    [-w / 2 + 0.1, -0.36],
    [w / 2 - 0.1, -0.36],
    [-w / 2 + 0.1, 0.36],
    [w / 2 - 0.1, 0.36],
  ])
    g.add(mesh(cyl(0.03, 0.022, 0.1, 6), woodMat('dark'), { pos: [x, 0.05, z] }));
  return g;
}

export function cabinet({ w = 0.6, h = 0.6, d = 0.45, color = C.cream, drawers = 2, knob = 0xd9b45a } = {}) {
  const g = group();
  const m = typeof color === 'number' ? mat(color, { rough: 0.6 }) : color;
  g.add(mesh(rbox(w, h, d, 0.02), m, { pos: [0, h / 2, 0] }));
  const dh = (h - 0.06) / drawers;
  g.userData.drawers = []; // bottom to top, so a drawer can be made to open
  for (let i = 0; i < drawers; i++) {
    const y = 0.03 + dh * i + dh / 2;
    const front = mesh(rbox(w - 0.06, dh - 0.03, 0.02, 0.008, 1), m, { pos: [0, y, d / 2 + 0.005] });
    const kb = mesh(sphere(0.016, 8, 6), mat(knob, { metal: 0.5, rough: 0.3 }), { pos: [0, y, d / 2 + 0.025] });
    g.add(front, kb);
    g.userData.drawers.push({ front, knob: kb, y, dh, w, d });
  }
  return g;
}

export function basket({ r = 0.2, h = 0.18 } = {}) {
  const g = group();
  const wall = new THREE.CylinderGeometry(r, r * 0.85, h, 18, 3, true);
  const tex = fabric(0xc9a271, { checks: 0x9c7648 });
  g.add(mesh(wall, mat(0xffffff, { map: tex, side: THREE.DoubleSide }), { pos: [0, h / 2, 0] }));
  g.add(mesh(cyl(r * 0.85, r * 0.85, 0.01, 18), mat(0x9c7648), { pos: [0, 0.006, 0] }));
  g.add(mesh(torus(r, 0.012, 6, 24), mat(0xb08a5a), { pos: [0, h, 0], rot: [Math.PI / 2, 0, 0] }));
  g.add(mesh(torus(r * 0.9, 0.012, 6, 20, Math.PI), mat(0xb08a5a), { pos: [0, h, 0] }));
  g.userData.prop = 'basket';
  return g;
}

export function cardboardBox({ w = 0.55, h = 0.4, d = 0.45, open = true } = {}) {
  const g = group();
  const m = mat(0xc49a6c, { rough: 0.9 });
  const t = 0.012;
  g.add(mesh(box(w, t, d), m, { pos: [0, t / 2, 0] }));
  g.add(mesh(box(w, h, t), m, { pos: [0, h / 2, d / 2 - t / 2] }));
  g.add(mesh(box(w, h, t), m, { pos: [0, h / 2, -d / 2 + t / 2] }));
  g.add(mesh(box(t, h, d), m, { pos: [-w / 2 + t / 2, h / 2, 0] }));
  g.add(mesh(box(t, h, d), m, { pos: [w / 2 - t / 2, h / 2, 0] }));
  if (open) {
    const f1 = mesh(box(w, t, d / 2), m, { pos: [0, 0, d / 4] });
    const p1 = group([f1], { pos: [0, h, d / 2], rot: [-2.3, 0, 0] });
    f1.position.set(0, 0, -d / 4);
    g.add(p1);
    const f2 = mesh(box(t, w * 0.45, d), m);
    const p2 = group([f2], { pos: [-w / 2, h, 0], rot: [0, 0, 0.5] });
    f2.position.set(0, w * 0.22, 0);
    g.add(p2);
  }
  // a strip of tape
  g.add(mesh(box(0.08, h * 0.6, 0.004), mat(0xe8d6b8), { pos: [0, h * 0.65, d / 2 + 0.002], cast: false }));
  g.userData.prop = 'cardboardBox';
  return g;
}

export function windowFrame(w, h, skyTex, { frame = C.cream, sill = true, cross = true } = {}) {
  const g = group();
  const fm = mat(frame, { rough: 0.6 });
  const b = 0.07;
  g.add(mesh(plane(w - b, h - b), mat(0xffffff, { map: skyTex, basic: true, fog: false }), { pos: [0, 0, -0.035], cast: false }));
  g.add(mesh(rbox(w, b, 0.08, 0.02), fm, { pos: [0, h / 2 - b / 2, 0] }));
  g.add(mesh(rbox(w, b, 0.08, 0.02), fm, { pos: [0, -h / 2 + b / 2, 0] }));
  g.add(mesh(rbox(b, h, 0.08, 0.02), fm, { pos: [-w / 2 + b / 2, 0, 0] }));
  g.add(mesh(rbox(b, h, 0.08, 0.02), fm, { pos: [w / 2 - b / 2, 0, 0] }));
  if (cross) {
    g.add(mesh(box(0.035, h - b, 0.04), fm, { pos: [0, 0, -0.01] }));
    g.add(mesh(box(w - b, 0.035, 0.04), fm, { pos: [0, 0.05, -0.01] }));
  }
  if (sill) g.add(mesh(rbox(w + 0.16, 0.05, 0.2, 0.02), fm, { pos: [0, -h / 2 - 0.01, 0.08] }));
  // faint glass sheen
  g.add(mesh(plane(w - b, h - b), mat(0xbfd6ff, { opacity: 0.08, rough: 0.05 }), { pos: [0, 0, -0.005], cast: false, receive: false }));
  return g;
}

// A small handwritten note lying flat (or standing) - used for notes & clues.
export function notePaper(text, { w = 0.16, h = 0.2, flat = true, color = '#fbf3e4', size = 22, tex = null, folded = false } = {}) {
  const t = tex || paperTexture(text, { w: 256, h: 320, size, bg: color, font: HAND_FONT });
  const m = mesh(plane(w, h), mat(0xffffff, { map: t, side: THREE.DoubleSide, rough: 0.95 }), { cast: false });
  const g = group([m]);
  if (flat) {
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.003;
  }
  if (folded) {
    // a tiny tent fold for standing cards
    m.rotation.x = -0.25;
    m.position.y = h / 2;
  }
  g.userData.paper = m;
  g.userData.prop = 'notePaper';
  return g;
}

export function stone({ r = 0.3, color = 0x9c958c, flat = 0.45 } = {}) {
  const geo = new THREE.IcosahedronGeometry(r, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 1 + rr(-0.12, 0.12);
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * flat, p.getZ(i) * k);
  }
  geo.computeVertexNormals();
  return mesh(geo, mat(color, { flat: true, rough: 0.95 }));
}

export function bush({ r = 0.5, color = 0x4d7146 } = {}) {
  const g = group();
  for (let i = 0; i < 5; i++) {
    const s = mesh(
      new THREE.IcosahedronGeometry(r * rr(0.5, 0.75), 1),
      mat(new THREE.Color(color).offsetHSL(0, 0, rr(-0.05, 0.05)).getHex(), { flat: true }),
      {
        pos: [rr(-r, r) * 0.5, r * rr(0.45, 0.8), rr(-r, r) * 0.5],
      },
    );
    g.add(s);
  }
  return g;
}

export function wallShelf(w = 0.9, { wood = 'light' } = {}) {
  const g = group([mesh(rbox(w, 0.035, 0.22, 0.01), woodMat(wood), { pos: [0, 0, 0] })]);
  for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) g.add(mesh(box(0.02, 0.12, 0.16), woodMat('dark'), { pos: [x, -0.07, -0.02] }));
  return g;
}

export function clock() {
  const g = group([mesh(cyl(0.16, 0.16, 0.04, 24), mat(C.cream, { rough: 0.5 }), { rot: [Math.PI / 2, 0, 0] })]);
  g.add(mesh(torus(0.16, 0.015, 6, 24), woodMat('dark'), {}));
  g.add(mesh(box(0.012, 0.1, 0.01), mat(0x3a3030), { pos: [0, 0.04, 0.025], cast: false }));
  g.add(mesh(box(0.08, 0.012, 0.01), mat(0x3a3030), { pos: [0.03, 0, 0.026], cast: false }));
  return g;
}
