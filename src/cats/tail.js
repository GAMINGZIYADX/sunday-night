import * as THREE from 'three';
import { LIGHT } from '../engine/quality.js';

// A smooth, tapered tail: one tube mesh whose vertices follow a curve through
// the tail's control points every frame (parallel-transported frames, so it
// never twists). Colours are painted per vertex: tabby rings or a white tip.
const SEGMENTS = 28;
const RADIAL = 10;

export class TailTube {
  constructor(look, { base = 0.03, tip = 0.012 } = {}) {
    this.base = base;
    this.tipR = tip;
    const ringCount = SEGMENTS + 1;
    const vCount = ringCount * RADIAL + 1; // + the rounded tip point
    this.positions = new Float32Array(vCount * 3);
    this.normals = new Float32Array(vCount * 3);
    const colors = new Float32Array(vCount * 3);
    const geo = new THREE.BufferGeometry();
    const idx = [];
    for (let s = 0; s < SEGMENTS; s++)
      for (let r = 0; r < RADIAL; r++) {
        const a = s * RADIAL + r;
        const b = s * RADIAL + ((r + 1) % RADIAL);
        const c = (s + 1) * RADIAL + r;
        const d = (s + 1) * RADIAL + ((r + 1) % RADIAL);
        idx.push(a, b, c, b, d, c);
      }
    const tipIndex = ringCount * RADIAL;
    for (let r = 0; r < RADIAL; r++) idx.push(SEGMENTS * RADIAL + r, SEGMENTS * RADIAL + ((r + 1) % RADIAL), tipIndex);
    // Colours along the tail.
    const ringA = new THREE.Color(look.tailRings[0]);
    const ringB = new THREE.Color(look.tailRings[1]);
    const tipC = look.tip ? new THREE.Color(look.tip) : null;
    const col = new THREE.Color();
    for (let s = 0; s <= SEGMENTS; s++) {
      const u = s / SEGMENTS;
      // Soft-edged rings (tabby) or plain fur, then the white tip (tuxedo).
      const ring = 0.5 + 0.5 * Math.sin(u * Math.PI * 9 - 0.6);
      col.copy(ringA).lerp(ringB, THREE.MathUtils.smoothstep(ring, 0.35, 0.65));
      if (tipC) col.lerp(tipC, THREE.MathUtils.smoothstep(u, 0.8, 0.86));
      for (let r = 0; r < RADIAL; r++) col.toArray(colors, (s * RADIAL + r) * 3);
    }
    (tipC || col).toArray(colors, tipIndex * 3);
    geo.setIndex(idx);
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('normal', new THREE.BufferAttribute(this.normals, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry = geo;
    this.material = LIGHT
      ? new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0xffb8c8, emissiveIntensity: 0 })
      : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, emissive: 0xffb8c8, emissiveIntensity: 0 });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false; // it moves every frame; the cat root is culled anyway
    this.curve = new THREE.CatmullRomCurve3([], false, 'centripetal');
    this._p = new THREE.Vector3();
    this._t = new THREE.Vector3();
    this._n = new THREE.Vector3();
    this._b = new THREE.Vector3();
    this._prevT = new THREE.Vector3();
  }

  // points: control points in the cat's local space; plump scales the radius.
  update(points, plump = 1) {
    const pos = this.positions;
    const nrm = this.normals;
    this.curve.points = points;
    const p = this._p;
    const t = this._t;
    const n = this._n;
    const b = this._b;
    for (let s = 0; s <= SEGMENTS; s++) {
      const u = s / SEGMENTS;
      this.curve.getPoint(u, p);
      this.curve.getTangent(Math.min(u, 0.999), t).normalize();
      if (s === 0) {
        // Any vector not parallel to the tangent starts the frame.
        n.set(1, 0, 0);
        if (Math.abs(t.x) > 0.9) n.set(0, 1, 0);
        n.sub(b.copy(t).multiplyScalar(n.dot(t))).normalize();
      } else {
        // Parallel transport: remove the part of the normal along the new tangent.
        n.sub(b.copy(t).multiplyScalar(n.dot(t))).normalize();
      }
      b.crossVectors(t, n).normalize();
      // Taper: a little thicker at the root, then a slow narrowing to the tip.
      const radius = (this.base + (this.tipR - this.base) * Math.pow(u, 0.85)) * plump * (s === 0 ? 0.95 : 1);
      for (let r = 0; r < RADIAL; r++) {
        const a = (r / RADIAL) * Math.PI * 2;
        const cx = Math.cos(a);
        const sy = Math.sin(a);
        const i = (s * RADIAL + r) * 3;
        const nx = n.x * cx + b.x * sy;
        const ny = n.y * cx + b.y * sy;
        const nz = n.z * cx + b.z * sy;
        pos[i] = p.x + nx * radius;
        pos[i + 1] = p.y + ny * radius;
        pos[i + 2] = p.z + nz * radius;
        nrm[i] = nx;
        nrm[i + 1] = ny;
        nrm[i + 2] = nz;
      }
      if (s === SEGMENTS) {
        // Round the tip off just past the last ring.
        const i = (SEGMENTS + 1) * RADIAL * 3;
        pos[i] = p.x + t.x * radius * 0.9;
        pos[i + 1] = p.y + t.y * radius * 0.9;
        pos[i + 2] = p.z + t.z * radius * 0.9;
        nrm[i] = t.x;
        nrm[i + 1] = t.y;
        nrm[i + 2] = t.z;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.normal.needsUpdate = true;
  }
}
