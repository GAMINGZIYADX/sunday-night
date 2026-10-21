import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { LIGHT } from './quality.js';

// Shared materials and geometries, cached so the GPU sees as few as possible.
const matCache = new Map();

export function mat(color, o = {}) {
  const key = `${color}|${o.rough ?? ''}|${o.metal ?? ''}|${o.emissive ?? ''}|${o.ei ?? ''}|${o.flat ?? ''}|${o.opacity ?? ''}|${o.side ?? ''}|${o.map?.uuid ?? ''}|${o.basic ?? ''}|${o.transparent ?? ''}|${o.emissiveMap?.uuid ?? ''}|${o.fog ?? ''}|${o.depthWrite ?? ''}`;
  if (!o.unique && matCache.has(key)) return matCache.get(key);
  let m;
  if (o.basic) {
    m = new THREE.MeshBasicMaterial({
      color,
      map: o.map || null,
      transparent: o.opacity !== undefined || !!o.transparent,
      opacity: o.opacity ?? 1,
      side: o.side ?? THREE.FrontSide,
      fog: o.fog ?? true,
      depthWrite: o.depthWrite ?? true,
    });
  } else if (LIGHT) {
    // Light graphics: far cheaper per pixel than the physically based look.
    // Metal (the keys) gets a simple shine so it still reads as metal.
    const shiny = (o.metal ?? 0) >= 0.5;
    const Kind = shiny ? THREE.MeshPhongMaterial : THREE.MeshLambertMaterial;
    m = new Kind({
      color,
      ...(shiny ? { shininess: 60, specular: 0x8a8070 } : {}),
      map: o.map || null,
      emissive: o.emissive ?? 0x000000,
      emissiveIntensity: o.ei ?? 1,
      emissiveMap: o.emissiveMap || null,
      flatShading: !!o.flat,
      transparent: o.opacity !== undefined || !!o.transparent,
      opacity: o.opacity ?? 1,
      side: o.side ?? THREE.FrontSide,
    });
  } else {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: o.rough ?? 0.82,
      metalness: o.metal ?? 0,
      map: o.map || null,
      emissive: o.emissive ?? 0x000000,
      emissiveIntensity: o.ei ?? 1,
      emissiveMap: o.emissiveMap || null,
      flatShading: !!o.flat,
      transparent: o.opacity !== undefined || !!o.transparent,
      opacity: o.opacity ?? 1,
      side: o.side ?? THREE.FrontSide,
    });
  }
  if (!o.unique) matCache.set(key, m);
  return m;
}

const geoCache = new Map();
function cached(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}

export function rbox(w, h, d, r = 0.03, seg = 2) {
  r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  if (r <= 0.002) return cached(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
  return cached(`rb${w},${h},${d},${r},${seg}`, () => new RoundedBoxGeometry(w, h, d, seg, r));
}
export function box(w, h, d) {
  return cached(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
}
export function cyl(rt, rb, h, seg = 16) {
  return cached(`c${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
}
export function sphere(r, ws = 16, hs = 12) {
  return cached(`s${r},${ws},${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
}
export function plane(w, h) {
  return cached(`p${w},${h}`, () => new THREE.PlaneGeometry(w, h));
}
export function torus(r, t, rs = 8, ts = 24, arc = Math.PI * 2) {
  return cached(`t${r},${t},${rs},${ts},${arc}`, () => new THREE.TorusGeometry(r, t, rs, ts, arc));
}
export function cone(r, h, seg = 12) {
  return cached(`co${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg));
}
export function capsule(r, len, cs = 4, rs = 8) {
  return cached(`ca${r},${len},${cs},${rs}`, () => new THREE.CapsuleGeometry(r, len, cs, rs));
}

// Creates a mesh with sensible shadow defaults.
export function mesh(geo, material, { pos, rot, scale, cast = true, receive = true, name } = {}) {
  const m = new THREE.Mesh(geo, material);
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  if (scale !== undefined) {
    if (typeof scale === 'number') m.scale.setScalar(scale);
    else m.scale.set(scale[0], scale[1], scale[2]);
  }
  m.castShadow = cast;
  m.receiveShadow = receive;
  if (name) m.name = name;
  return m;
}

export function group(children = [], { pos, rot, scale } = {}) {
  const g = new THREE.Group();
  for (const c of children) if (c) g.add(c);
  if (pos) g.position.set(pos[0], pos[1], pos[2]);
  if (rot) g.rotation.set(rot[0], rot[1], rot[2]);
  if (scale !== undefined) {
    if (typeof scale === 'number') g.scale.setScalar(scale);
    else g.scale.set(scale[0], scale[1], scale[2]);
  }
  return g;
}
