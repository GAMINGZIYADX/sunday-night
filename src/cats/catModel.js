import * as THREE from 'three';
import { mat, mesh, group, sphere, cone, capsule, torus, box } from '../engine/materials.js';
import { paint } from '../engine/textures.js';
import { TailTube } from './tail.js';

// Low-poly cats with a tiny procedural rig: breathing, blinking, ear twitches,
// tail sway, walking, sitting, curling up, looking at the player and hopping.
// Local forward is +Z. The root sits on the floor.

const LOOKS = {
  tchobin: {
    base: '#efb26e',
    stripe: '#cf7f3a',
    belly: '#fbeedb',
    eye: 0xd8a63a,
    nose: 0xe89a9a,
    collar: 0x6f9be0,
    tailRings: [0xe9a35e, 0xfbeedb],
    sock: null,
    tip: null,
    muzzle: 0xfbeedb,
    innerEar: 0xf2b8b0,
  },
  zizo: {
    base: '#232129',
    stripe: null,
    belly: '#f7f4ee',
    eye: 0x79d26a,
    nose: 0xe8a0a8,
    collar: 0xf2c4c0,
    tailRings: [0x232129, 0x232129],
    sock: 0xf7f4ee,
    tip: 0xf7f4ee,
    muzzle: 0xf7f4ee,
    innerEar: 0xd89aa0,
  },
};

// Body texture for a sphere whose poles point along the spine (see below):
// x = around the body (u), y = along the spine from chest (0) to rump (1).
function bodyTexture(look, kind) {
  return paint(256, 256, (g, w, h) => {
    g.fillStyle = look.base;
    g.fillRect(0, 0, w, h);
    // belly / bib around u = 0.25 (the underside)
    const grad = g.createLinearGradient(0, 0, w, 0);
    const bc = look.belly;
    grad.addColorStop(0.0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.1, bc);
    grad.addColorStop(0.4, bc);
    grad.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    if (kind === 'zizo') {
      // Tuxedo: white bib on the chest, white belly, dark back.
      g.beginPath();
      g.moveTo(w * 0.05, 0);
      g.lineTo(w * 0.45, 0);
      g.quadraticCurveTo(w * 0.42, h * 0.45, w * 0.36, h * 0.7);
      g.lineTo(w * 0.14, h * 0.7);
      g.quadraticCurveTo(w * 0.08, h * 0.45, w * 0.05, 0);
      g.fill();
    } else {
      g.fillRect(0, 0, w, h);
      // Tabby rings across the back.
      g.fillStyle = look.stripe;
      for (let i = 0; i < 9; i++) {
        const y = 18 + i * 26;
        g.beginPath();
        g.moveTo(w * 0.48, y);
        for (let x = w * 0.48; x <= w * 1.02; x += 8) g.lineTo(x, y + Math.sin(x * 0.08 + i) * 4);
        for (let x = w * 1.02; x >= w * 0.48; x -= 8) g.lineTo(x, y + 9 + Math.sin(x * 0.08 + i) * 3);
        g.closePath();
        g.fill();
      }
    }
    // fur speckle
    for (let i = 0; i < 1500; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},0.05)`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
}

function headTexture(look, kind) {
  return paint(128, 128, (g, w, h) => {
    g.fillStyle = look.base;
    g.fillRect(0, 0, w, h);
    if (kind === 'tchobin') {
      // forehead "M" stripes near the top of the head
      g.strokeStyle = look.stripe;
      g.lineWidth = 5;
      for (let i = -1; i <= 1; i++) {
        g.beginPath();
        g.moveTo(w * 0.75 + i * 10, h * 0.12);
        g.lineTo(w * 0.75 + i * 12, h * 0.32);
        g.stroke();
      }
    } else {
      // white blaze down the face
      g.fillStyle = look.belly;
      g.beginPath();
      g.moveTo(w * 0.75, h * 0.2);
      g.lineTo(w * 0.8, h * 0.55);
      g.lineTo(w * 0.7, h * 0.55);
      g.closePath();
      g.fill();
    }
  });
}

export class CatModel {
  constructor(kind) {
    this.kind = kind;
    const L = LOOKS[kind];
    this.look = L;
    const baseColor = new THREE.Color(L.base).getHex();
    const furMat = mat(0xffffff, { map: bodyTexture(L, kind), rough: 0.95, unique: true });
    const headMat = mat(0xffffff, { map: headTexture(L, kind), rough: 0.95, unique: true });
    const solid = mat(baseColor, { rough: 0.95 });
    const light = mat(new THREE.Color(L.belly).getHex(), { rough: 0.95 });

    this.root = group();
    this.root.name = `cat-${kind}`;
    this.offset = group(); // hop offset
    this.root.add(this.offset);

    // Hips pivot (sitting tilts the whole torso around here).
    this.hips = group([], { pos: [0, 0.17, -0.1] });
    this.offset.add(this.hips);
    const torsoGeo = new THREE.SphereGeometry(1, 24, 18).rotateX(Math.PI / 2);
    this.torso = mesh(torsoGeo, furMat, { scale: [0.105, 0.1, 0.2], pos: [0, 0.01, 0.1] });
    this.hips.add(this.torso);
    this.chest = mesh(sphere(0.095, 20, 14), kind === 'zizo' ? light : furMat, { pos: [0, 0.015, 0.22], scale: [1, 1.05, 0.9] });
    this.hips.add(this.chest);
    this.haunches = [];
    for (const sx of [-1, 1]) {
      const h = mesh(sphere(0.07, 16, 12), solid, { pos: [sx * 0.05, -0.01, -0.02], scale: [0.8, 1, 1.1] });
      this.hips.add(h);
      this.haunches.push(h);
    }

    // Neck + head.
    this.neck = group([], { pos: [0, 0.08, 0.27] });
    this.hips.add(this.neck);
    this.collar = mesh(torus(0.058, 0.012, 6, 16), mat(L.collar, { rough: 0.5 }), { pos: [0, -0.03, 0.0], rot: [Math.PI / 2 - 0.35, 0, 0] });
    this.neck.add(this.collar);
    this.neck.add(mesh(sphere(0.012, 8, 6), mat(0xf2c14e, { metal: 0.7, rough: 0.3 }), { pos: [0, -0.07, 0.05] }));
    this.head = group([], { pos: [0, 0.05, 0.04] });
    this.neck.add(this.head);
    const headGeo = new THREE.SphereGeometry(0.085, 24, 18);
    this.head.add(mesh(headGeo, headMat, { scale: [1.12, 0.95, 1.0] }));
    this.head.add(mesh(sphere(0.04, 12, 8), mat(L.muzzle, { rough: 0.95 }), { pos: [0, -0.03, 0.065], scale: [1.25, 0.8, 0.8] }));
    if (kind === 'zizo') this.head.add(mesh(sphere(0.05, 12, 8), mat(L.muzzle, { rough: 0.95 }), { pos: [0, -0.05, 0.04], scale: [1.1, 0.7, 0.9] }));
    this.head.add(mesh(new THREE.SphereGeometry(0.011, 8, 6).scale(1.3, 0.8, 0.8), mat(L.nose, { rough: 0.5 }), { pos: [0, -0.012, 0.098] }));
    // Whiskers.
    const wm = mat(0xffffff, { rough: 0.5 });
    for (const sx of [-1, 1])
      for (let i = 0; i < 3; i++) {
        const wsk = mesh(box(0.09, 0.0025, 0.0025), wm, {
          pos: [sx * 0.08, -0.03 + i * 0.008, 0.08],
          rot: [0, sx * 0.25, sx * (i - 1) * 0.15],
          cast: false,
        });
        this.head.add(wsk);
      }
    // Eyes.
    this.eyes = [];
    const irisMat = mat(L.eye, { rough: 0.25, emissive: L.eye, ei: 0.25 });
    const pupilMat = mat(0x0c0a10, { rough: 0.2 });
    for (const sx of [-1, 1]) {
      const eye = group([], { pos: [sx * 0.037, 0.012, 0.072] });
      eye.add(mesh(sphere(0.019, 12, 8), irisMat, { scale: [1, 1, 0.55], cast: false }));
      eye.add(mesh(sphere(0.009, 8, 6), pupilMat, { pos: [0, 0, 0.009], scale: [0.6, 1.4, 0.4], cast: false }));
      eye.add(mesh(sphere(0.004, 6, 4), mat(0xffffff, { emissive: 0xffffff, ei: 0.8 }), { pos: [sx * -0.005, 0.007, 0.012], cast: false }));
      this.head.add(eye);
      this.eyes.push(eye);
    }
    // Ears.
    this.ears = [];
    for (const sx of [-1, 1]) {
      const ear = group([], { pos: [sx * 0.052, 0.068, -0.005], rot: [0, 0, -sx * 0.32] });
      ear.add(mesh(cone(0.034, 0.07, 4), solid, { pos: [0, 0.03, 0], rot: [0, Math.PI / 4, 0] }));
      ear.add(mesh(cone(0.022, 0.05, 4), mat(L.innerEar, { rough: 0.9 }), { pos: [0, 0.025, 0.01], rot: [0, Math.PI / 4, 0], cast: false }));
      this.head.add(ear);
      this.ears.push(ear);
    }

    // Legs: pivots at the top, capsules hanging down, paws at the bottom.
    const legMat = kind === 'zizo' ? solid : furMat;
    const pawMat = L.sock ? mat(L.sock, { rough: 0.95 }) : mat(new THREE.Color(L.base).offsetHSL(0, 0, 0.06).getHex(), { rough: 0.95 });
    const makeLeg = (x, y, z) => {
      const p = group([], { pos: [x, y, z] });
      p.add(mesh(capsule(0.027, 0.1, 3, 8), legMat, { pos: [0, -0.07, 0] }));
      if (L.sock) p.add(mesh(capsule(0.029, 0.03, 3, 8), pawMat, { pos: [0, -0.115, 0] }));
      p.add(mesh(sphere(0.032, 10, 6), pawMat, { pos: [0, -0.14, 0.012], scale: [1, 0.6, 1.25] }));
      return p;
    };
    this.frontLegs = [makeLeg(-0.05, -0.02, 0.24), makeLeg(0.05, -0.02, 0.24)];
    this.backLegs = [makeLeg(-0.055, -0.02, -0.02), makeLeg(0.055, -0.02, -0.02)];
    this.frontLegs.forEach((l) => this.hips.add(l));
    this.backLegs.forEach((l) => this.hips.add(l));

    // Tail: one smooth tapered tube that follows a curve every frame.
    this.tailTube = new TailTube(L, kind === 'zizo' ? { base: 0.029, tip: 0.012 } : { base: 0.031, tip: 0.013 });
    this.root.add(this.tailTube.mesh);
    this.tailMats = [this.tailTube.material];
    this.tailPoints = Array.from({ length: 12 }, () => new THREE.Vector3());

    // State.
    this.t = Math.random() * 10;
    this.pose = { sit: 0, sleep: 0 };
    this.target = { sit: 0, sleep: 0 };
    this.walk = 0; // 0..1 blend
    this.walkPhase = 0;
    this.speed = 0;
    this.blinkT = 2 + Math.random() * 3;
    this.blink = 0;
    this.earT = [1 + Math.random() * 3, 2 + Math.random() * 3];
    this.earTwitch = [0, 0];
    this.hopT = -1;
    this.jump = null;
    this.lookAt = null; // world position or null
    this.headYaw = 0;
    this.headPitch = 0;
    this.extraHeadYaw = 0;
    this.tailHeart = 0; // 0..1 morph to heart curve
    this.tailHeartFn = null; // s -> world Vector3
    this.tailMode = 'auto';
    this._v = new THREE.Vector3();
    this._inv = new THREE.Matrix4();
    this.eyesClosed = false;
  }

  setPose(name) {
    this.target.sit = name === 'sit' ? 1 : 0;
    this.target.sleep = name === 'sleep' ? 1 : 0;
  }

  hop() {
    this.hopT = 0;
  }

  update(dt, reduced = false) {
    this.t += dt;
    const t = this.t;
    const k = 1 - Math.exp(-dt * 4);
    this.pose.sit += (this.target.sit - this.pose.sit) * k;
    this.pose.sleep += (this.target.sleep - this.pose.sleep) * k * 0.7;
    const s = this.pose.sit;
    const l = this.pose.sleep;
    const w = this.walk;
    this.walkPhase += dt * this.speed * 16;

    // Breathing.
    const breath = Math.sin(t * (l > 0.5 ? 1.6 : 2.4)) * 0.02;
    this.torso.scale.set(0.105 * (1 + breath), 0.1 * (1 + breath), 0.2);

    // Body posture.
    const bob = Math.abs(Math.sin(this.walkPhase)) * 0.012 * w;
    this.hips.position.y = THREE.MathUtils.lerp(THREE.MathUtils.lerp(0.17, 0.1, s), 0.075, l) + bob;
    this.hips.position.z = THREE.MathUtils.lerp(-0.1, -0.13, s);
    this.hips.rotation.x = -0.72 * s * (1 - l) + Math.sin(this.walkPhase * 2) * 0.02 * w;
    this.hips.rotation.z = 0;
    const pitch = this.hips.rotation.x;

    // Legs.
    const swing = Math.sin(this.walkPhase) * 0.55 * w;
    this.frontLegs.forEach((leg, i) => {
      const ph = i === 0 ? swing : -swing;
      leg.rotation.x = -pitch * (1 - l) + ph - 1.45 * l;
      // Front legs reach the floor even when the chest is lifted.
      leg.scale.y = THREE.MathUtils.lerp(1, 1.55, s) * (1 - l * 0.45);
    });
    this.backLegs.forEach((leg, i) => {
      const ph = i === 0 ? -swing : swing;
      leg.rotation.x = ph - 1.25 * s * (1 - l) - 1.5 * l;
      leg.scale.y = 1 - 0.3 * l;
    });
    this.haunches.forEach((h) => h.scale.set(0.8 + 0.4 * s, 1 + 0.3 * s, 1.1 + 0.3 * s));

    // Head: compensates the body pitch, looks at things, droops when asleep.
    let yaw = 0;
    let hp = 0;
    if (this.lookAt && l < 0.5) {
      this.root.updateMatrixWorld();
      const p = this._v.copy(this.lookAt);
      this.neck.worldToLocal(p);
      yaw = THREE.MathUtils.clamp(Math.atan2(p.x, p.z), -1.1, 1.1);
      hp = THREE.MathUtils.clamp(-Math.atan2(p.y, Math.hypot(p.x, p.z)), -0.6, 0.5);
    }
    yaw += this.extraHeadYaw;
    const hk = 1 - Math.exp(-dt * 5);
    this.headYaw += (yaw * (1 - l) + 0.7 * l - this.headYaw) * hk;
    this.headPitch += (hp - this.headPitch) * hk;
    this.neck.rotation.set(-pitch * (1 - l) + 0.55 * l + this.headPitch, this.headYaw, 0.25 * l);
    this.neck.position.y = 0.08 - 0.06 * l;

    // Blink.
    this.blinkT -= dt;
    if (this.blinkT < 0) {
      this.blink = 0.16;
      this.blinkT = 2 + Math.random() * 4;
    }
    let eyeY = 1;
    if (this.blink > 0) {
      this.blink -= dt;
      eyeY = 0.15;
    }
    if (l > 0.6 || this.eyesClosed) eyeY = 0.1;
    this.eyes.forEach((e) => (e.scale.y = eyeY));

    // Ear twitches.
    for (let i = 0; i < 2; i++) {
      this.earT[i] -= dt;
      if (this.earT[i] < 0) {
        this.earTwitch[i] = 1;
        this.earT[i] = 2 + Math.random() * 5;
      }
      this.earTwitch[i] = Math.max(0, this.earTwitch[i] - dt * 5);
      const sx = i === 0 ? -1 : 1;
      this.ears[i].rotation.z = -sx * (0.32 + this.earTwitch[i] * 0.4 * Math.sin(this.earTwitch[i] * 12));
      this.ears[i].rotation.x = -0.2 * l;
    }

    // Hop + jump arcs.
    let y = 0;
    if (this.hopT >= 0) {
      this.hopT += dt;
      const h = this.hopT / 0.45;
      y = h < 1 ? Math.sin(h * Math.PI) * (reduced ? 0.04 : 0.1) : 0;
      if (h >= 1) this.hopT = -1;
    }
    this.offset.position.y = y;

    this._updateTail(dt, s, l, w);
  }

  _updateTail(dt, s, l, w) {
    const N = this.tailPoints.length;
    const t = this.t;
    // Tail root: the back of the torso, following the hip pitch.
    const rel = new THREE.Vector3(0, 0.04, -0.08).applyAxisAngle(new THREE.Vector3(1, 0, 0), this.hips.rotation.x);
    const base = new THREE.Vector3(0, this.hips.position.y + rel.y + this.offset.position.y, this.hips.position.z + rel.z);
    const swayK = Math.sin(t * 1.3) * 0.02;
    const sitCurve = this._sitCurve || (this._sitCurve = new THREE.CatmullRomCurve3([0, 1, 2, 3, 4].map(() => new THREE.Vector3())));
    const sc = sitCurve.points;
    sc[0].copy(base);
    sc[1].set(0.03, Math.max(0.03, base.y * 0.35), base.z - 0.07);
    sc[2].set(0.13, 0.026, base.z + 0.0);
    sc[3].set(0.16 + swayK, 0.026, 0.1);
    sc[4].set(0.1 + swayK * 2, 0.026 + Math.max(0, Math.sin(t * 2.2)) * 0.02, 0.21);
    const sleepCurve = this._sleepCurve || (this._sleepCurve = new THREE.CatmullRomCurve3([0, 1, 2, 3, 4].map(() => new THREE.Vector3())));
    const lc = sleepCurve.points;
    lc[0].copy(base);
    lc[1].set(-0.09, 0.04, base.z - 0.08);
    lc[2].set(-0.18, 0.035, 0.0);
    lc[3].set(-0.14, 0.035, 0.17);
    lc[4].set(-0.02 + swayK, 0.035, 0.24);
    const pts = [];
    const tmp = new THREE.Vector3();
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      // Standing / walking: up and back in a soft S, swaying.
      const sway = Math.sin(t * (1.6 + w * 2.5) + u * 2.5) * 0.08 * u;
      const p = new THREE.Vector3(sway, base.y + Math.sin(u * 1.7) * 0.2 - u * u * 0.04, base.z - u * 0.17 - Math.sin(u * 3) * 0.02);
      p.lerp(sitCurve.getPoint(u, tmp), s * (1 - l));
      p.lerp(sleepCurve.getPoint(u, tmp), l);
      pts.push(p);
    }
    // Optional morph to an externally supplied world-space curve (the heart).
    if (this.tailHeart > 0.001 && this.tailHeartFn) {
      this.root.updateMatrixWorld();
      this._inv.copy(this.root.matrixWorld).invert();
      const e = this.tailHeart * this.tailHeart * (3 - 2 * this.tailHeart);
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1);
        const target = this.tailHeartFn(u).applyMatrix4(this._inv);
        // The root of the tail stays on the cat; the rest curls into place.
        pts[i].lerp(target, e * Math.min(1, u / 0.18));
      }
    }
    const glow = this.tailHeart > 0.6 ? (this.tailHeart - 0.6) * 1.1 : 0;
    if (glow !== this._tailGlow) {
      this._tailGlow = glow;
      for (const m of this.tailMats) m.emissiveIntensity = glow;
    }
    // Shape the tube; it plumps up a little while it makes the heart.
    const plump = 1 + 0.35 * Math.min(1, Math.max(0, this.tailHeart));
    for (let i = 0; i < N; i++) this.tailPoints[i].copy(pts[i]);
    this.tailTube.update(this.tailPoints, plump);
  }
}
