import { EYE_H, PLAYER_R } from './layout.js';

// First-person controller: smoothed WASD movement, mouse look, subtle bob.
export class Player {
  constructor(camera, input, collision, settings) {
    this.camera = camera;
    this.input = input;
    this.collision = collision;
    this.settings = settings;
    this.pos = { x: 0, z: 0 };
    this.vel = { x: 0, z: 0 };
    this.yaw = 0;
    this.pitch = 0;
    this.bobPhase = 0;
    this.bobAmount = 0;
    this.stepDist = 0;
    this.onStep = null;
    this.frozen = false;
    this.speed = 2.5;
    this.slowSpeed = 1.15;
    this.eyeOffset = 0; // used for the wake-up / sit-down moments
  }

  place(x, z, yaw = this.yaw, pitch = 0) {
    this.pos.x = x;
    this.pos.z = z;
    this.yaw = yaw;
    this.pitch = pitch;
    this.vel.x = this.vel.z = 0;
    this.apply();
  }

  update(dt) {
    const s = this.settings.data;
    if (!this.frozen) {
      const m = this.input.consumeMouse();
      const sens = 0.0022 * s.sensitivity;
      this.yaw -= m.x * sens;
      this.pitch -= m.y * sens * (s.invertY ? -1 : 1);
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
    } else this.input.consumeMouse();

    const a = this.frozen ? { f: 0, s: 0, slow: false } : this.input.axis();
    const speed = a.slow ? this.slowSpeed : this.speed;
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    // Forward is -Z at yaw 0.
    let wx = -sin * a.f + cos * a.s;
    let wz = -cos * a.f - sin * a.s;
    const len = Math.hypot(wx, wz);
    if (len > 0) {
      wx /= len;
      wz /= len;
    }
    const k = 1 - Math.exp(-dt * 12);
    this.vel.x += (wx * speed - this.vel.x) * k;
    this.vel.z += (wz * speed - this.vel.z) * k;
    const before = { x: this.pos.x, z: this.pos.z };
    this.collision.move(this.pos, this.vel.x * dt, this.vel.z * dt, PLAYER_R);
    const moved = Math.hypot(this.pos.x - before.x, this.pos.z - before.z);
    const moving = moved / Math.max(dt, 1e-4) > 0.3;

    this.bobAmount += ((moving ? 1 : 0) - this.bobAmount) * (1 - Math.exp(-dt * 8));
    this.bobPhase += moved * 5.2;
    this.stepDist += moved;
    const stride = a.slow ? 0.5 : 0.62;
    if (this.stepDist > stride) {
      this.stepDist = 0;
      if (this.onStep) this.onStep(a.slow);
    }
    this.apply();
  }

  apply() {
    const s = this.settings.data;
    const bobOn = s.headBob && !s.reducedMotion;
    const bob = bobOn ? Math.sin(this.bobPhase) * 0.018 * this.bobAmount : 0;
    const sway = bobOn ? Math.cos(this.bobPhase * 0.5) * 0.006 * this.bobAmount : 0;
    this.camera.position.set(this.pos.x, EYE_H + bob + this.eyeOffset, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, sway);
  }
}
