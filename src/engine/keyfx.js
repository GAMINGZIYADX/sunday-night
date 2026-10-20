import * as THREE from 'three';
import { COLORS } from '../config.js';
import { mat, mesh, group, torus, cyl, box, sphere } from './materials.js';
import { glowSprite } from './props.js';

export function keyMaterial(type) {
  return type === 'gold'
    ? mat(COLORS.gold, { metal: 0.85, rough: 0.28, emissive: 0x6b4a10, ei: 0.6 })
    : mat(COLORS.silver, { metal: 0.9, rough: 0.22, emissive: 0x404858, ei: 0.5 });
}

// A cute old-fashioned key, about 13 cm long, pointing along +X.
export function keyMesh(type) {
  const m = keyMaterial(type);
  const g = group();
  g.add(mesh(torus(0.026, 0.008, 8, 18), m, { pos: [-0.05, 0, 0], cast: false }));
  // little tulip-shaped cut-out in the bow: a tiny sphere accent
  g.add(mesh(sphere(0.008, 8, 6), m, { pos: [-0.05, 0, 0], cast: false }));
  g.add(mesh(cyl(0.006, 0.006, 0.1, 8), m, { pos: [0.02, 0, 0], rot: [0, 0, Math.PI / 2], cast: false }));
  g.add(mesh(box(0.012, 0.022, 0.006), m, { pos: [0.058, -0.012, 0], cast: false }));
  g.add(mesh(box(0.008, 0.016, 0.006), m, { pos: [0.04, -0.01, 0], cast: false }));
  g.add(mesh(torus(0.008, 0.003, 6, 10), m, { pos: [-0.02, 0, 0], rot: [0, Math.PI / 2, 0], cast: false }));
  return g;
}

// Spawns a key that floats up with sparkles, then flies to the HUD.
export class KeyFx {
  constructor(scene, camera, audio, particles, settings) {
    this.scene = scene;
    this.camera = camera;
    this.audio = audio;
    this.particles = particles;
    this.settings = settings;
    this.active = [];
  }

  spawn(type, position, onDone, { delay = 0, from = null } = {}) {
    const key = keyMesh(type);
    key.scale.setScalar(1.6);
    const glow = glowSprite(type === 'gold' ? COLORS.gold : 0xdfe8ff, 0.5, 0.8);
    key.add(glow);
    key.position.copy(from || position);
    key.visible = delay <= 0;
    this.scene.add(key);
    const quick = this.settings.data.reducedMotion;
    this.active.push({ key, type, t: -delay, start: (from || position).clone(), target: position.clone(), onDone, played: false, quick });
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const a = this.active[i];
      a.t += dt;
      if (a.t < 0) continue;
      a.key.visible = true;
      if (!a.played) {
        a.played = true;
        this.audio.keyJingle();
        this.particles.burst(a.start, { count: 18, color: a.type === 'gold' ? [0xffe08a, 0xfff6d0] : [0xe6eeff, 0xffffff], speed: 0.9 });
      }
      const rise = a.quick ? 0.8 : 1.6;
      const fly = 0.55;
      if (a.t < rise) {
        const k = a.t / rise;
        const e = 1 - Math.pow(1 - k, 3);
        a.key.position.lerpVectors(a.start, a.target, Math.min(1, k * 1.6));
        a.key.position.y += e * 0.35;
        a.key.rotation.set(0.3, a.t * 4, 0.2 * Math.sin(a.t * 3));
        if (Math.random() < dt * 14) this.particles.burst(a.key.position, { count: 1, color: 0xfff6d0, speed: 0.2, life: 0.8, size: 0.04 });
        if (!a.hover) a.hover = a.key.position.clone();
        a.hover.copy(a.key.position);
      } else if (a.t < rise + fly) {
        // Fly towards a point just below-right of the view, shrinking.
        const k = (a.t - rise) / fly;
        const e = k * k;
        const target = new THREE.Vector3(0.55, -0.42, -0.9).applyMatrix4(this.camera.matrixWorld);
        a.key.position.lerpVectors(a.hover, target, e);
        a.key.scale.setScalar(1.6 * (1 - e * 0.8));
        a.key.rotation.y += dt * 10;
      } else {
        this.scene.remove(a.key);
        this.active.splice(i, 1);
        if (a.onDone) a.onDone();
      }
    }
  }
}
