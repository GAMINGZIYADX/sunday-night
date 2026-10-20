import * as THREE from 'three';
import { glowTexture, heartTexture, petalTexture } from './textures.js';

// Tiny sprite particle system for sparkles, hearts and petal puffs.
export class Particles {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.pool = [];
  }
  _sprite(tex, color, blending) {
    let s = this.pool.find((p) => p.material.map === tex && p.material.blending === blending);
    if (s) this.pool.splice(this.pool.indexOf(s), 1);
    else {
      s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending, fog: false }));
      s.renderOrder = 10;
    }
    s.material.color.set(color);
    s.visible = true;
    this.scene.add(s);
    return s;
  }
  burst(pos, { kind = 'sparkle', count = 14, color = 0xfff0c0, speed = 0.8, life = 1.1, size = 0.06, gravity = -0.3, spread = 1, up = 0.6 } = {}) {
    const tex = kind === 'heart' ? heartTexture() : kind === 'petal' ? petalTexture() : glowTexture();
    const blending = kind === 'sparkle' ? THREE.AdditiveBlending : THREE.NormalBlending;
    for (let i = 0; i < count; i++) {
      const s = this._sprite(tex, Array.isArray(color) ? color[i % color.length] : color, blending);
      s.position.copy(pos);
      const a = Math.random() * Math.PI * 2;
      const v = new THREE.Vector3(Math.cos(a) * spread, up + Math.random() * 0.6, Math.sin(a) * spread)
        .normalize()
        .multiplyScalar(speed * (0.4 + Math.random() * 0.6));
      this.list.push({
        s,
        v,
        t: 0,
        life: life * (0.7 + Math.random() * 0.5),
        size: size * (0.7 + Math.random() * 0.6),
        gravity,
        spin: (Math.random() - 0.5) * 4,
      });
    }
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t += dt;
      const k = p.t / p.life;
      if (k >= 1) {
        this.scene.remove(p.s);
        this.pool.push(p.s);
        this.list.splice(i, 1);
        continue;
      }
      p.v.y += p.gravity * dt;
      p.v.multiplyScalar(1 - dt * 1.2);
      p.s.position.addScaledVector(p.v, dt);
      p.s.material.opacity = Math.min(1, (1 - k) * 2) * Math.min(1, p.t * 8);
      p.s.material.rotation += p.spin * dt;
      p.s.scale.setScalar(p.size * (1 + k * 0.4));
    }
  }
}
