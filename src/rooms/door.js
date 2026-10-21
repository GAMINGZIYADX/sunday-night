import * as THREE from 'three';
import { ROOMS, DOOR_W, DOOR_H, WALL_T } from '../engine/layout.js';
import { COLORS, UI } from '../config.js';
import { mat, mesh, group, rbox, box, sphere, cyl, torus } from '../engine/materials.js';
import { keyMesh } from '../engine/keyfx.js';
import { tulip, glowSprite, woodMat, hitArea } from '../engine/props.js';
import { labelTexture } from '../engine/textures.js';
import { PROMPTS, TOASTS } from '../config.js';
import { fill } from '../engine/text.js';

// A door with two keyholes (gold above, silver below), a memory tulip beside
// it, and the unlock / swing animation. Style 'gate' builds the garden gate.
export class Door {
  constructor(ctx, room, { color = COLORS.sage, style = 'door' } = {}) {
    this.ctx = ctx;
    this.room = room;
    this.style = style;
    const r = ROOMS[room];
    this.z = r.zN - WALL_T / 2;
    const g = ctx.roomGroup(room);
    this.root = group([], { pos: [0, 0, this.z] });
    g.add(this.root);

    const w = DOOR_W - 0.02;
    const h = DOOR_H - 0.01;
    this.hinge = group([], { pos: [-DOOR_W / 2 + 0.01, 0, 0] });
    this.root.add(this.hinge);
    this.leaf = group([], { pos: [w / 2, 0, 0] });
    this.hinge.add(this.leaf);
    if (style === 'gate') this._buildGate(w, h);
    else this._buildDoor(w, h, color);

    // Keyhole plate on the room-facing side (+Z), near the handle.
    const plateX = w / 2 - 0.16;
    const plate = group([], { pos: [plateX, 1.02, 0.045] });
    plate.add(mesh(rbox(0.09, 0.28, 0.015, 0.01), mat(0xe9d7b0, { metal: 0.6, rough: 0.35 }), { cast: false }));
    this.holes = {};
    for (const [type, y] of [
      ['gold', 0.065],
      ['silver', -0.065],
    ]) {
      const ringMat = type === 'gold' ? mat(COLORS.gold, { metal: 0.85, rough: 0.3 }) : mat(COLORS.silver, { metal: 0.9, rough: 0.25 });
      plate.add(mesh(torus(0.024, 0.007, 8, 18), ringMat, { pos: [0, y, 0.01], cast: false }));
      plate.add(mesh(cyl(0.006, 0.006, 0.01, 8), mat(0x1a1410), { pos: [0, y + 0.004, 0.012], rot: [Math.PI / 2, 0, 0], cast: false }));
      plate.add(mesh(box(0.005, 0.014, 0.01), mat(0x1a1410), { pos: [0, y - 0.006, 0.012], cast: false }));
      this.holes[type] = new THREE.Vector3(0, y, 0.02);
    }
    this.plate = plate;
    this.leaf.add(plate);
    // Handle
    const knobMat = mat(0xe6c98a, { metal: 0.75, rough: 0.3 });
    this.leaf.add(mesh(sphere(0.035, 12, 10), knobMat, { pos: [plateX, 0.88, 0.07] }));
    this.leaf.add(mesh(cyl(0.012, 0.012, 0.05, 8), knobMat, { pos: [plateX, 0.88, 0.04], rot: [Math.PI / 2, 0, 0] }));
    this.leaf.add(mesh(sphere(0.035, 12, 10), knobMat, { pos: [plateX, 0.88, -0.07] }));

    // Colliders.
    this.closedBox = ctx.collision.add(-DOOR_W / 2, this.z - WALL_T / 2, DOOR_W / 2, this.z + WALL_T / 2, 'door');
    this.openBox = ctx.collision.add(-DOOR_W / 2 - 0.08, this.z - DOOR_W - 0.05, -DOOR_W / 2 + 0.06, this.z, 'door-open');
    this.openBox.enabled = false;

    // Occlude interactions through a closed door.
    this._occ = [];
    this.leaf.traverse((o) => o.isMesh && this._occ.push(o));
    this._addOccluders();

    // Memory tulip on a little wall bracket beside the door (rooms 1-4).
    if (room < 4) this._buildMemoryTulip(r);

    this.item = ctx.interact.add(this.leaf, {
      zones: [room],
      prompt: () => (ctx.gs.canOpenDoor(room) ? PROMPTS.door : PROMPTS.doorLocked),
      enabled: () => !ctx.gs.isDoorOpen(room) && !this.animating,
      onUse: () => this.tryOpen(),
    });
    this.anim = null;
    this.animating = false;
  }

  _buildDoor(w, h, color) {
    const m = mat(color, { rough: 0.6 });
    const t = 0.05;
    this.leaf.add(mesh(rbox(w, h, t, 0.02), m, { pos: [0, h / 2, 0] }));
    // Raised panels on both faces.
    const pm = mat(new THREE.Color(color).offsetHSL(0, 0, 0.05).getHex(), { rough: 0.6 });
    for (const side of [1, -1]) {
      for (const [py, ph] of [
        [h * 0.72, h * 0.36],
        [h * 0.28, h * 0.38],
      ]) {
        this.leaf.add(mesh(rbox(w * 0.68, ph, 0.02, 0.008), pm, { pos: [0, py, side * (t / 2 + 0.004)], cast: false }));
      }
    }
    // A small painted tulip near the top of the room side.
    const icon = mesh(new THREE.PlaneGeometry(0.16, 0.16), mat(0xffffff, { map: tulipIcon(), transparent: true }), {
      pos: [0, h * 0.75, t / 2 + 0.016],
      cast: false,
    });
    this.leaf.add(icon);
  }

  _buildGate(w, h) {
    const wood = woodMat('dark');
    const iron = mat(0x2e2a33, { metal: 0.6, rough: 0.45 });
    this.leaf.add(mesh(rbox(w, 0.08, 0.06, 0.02), wood, { pos: [0, 0.18, 0] }));
    this.leaf.add(mesh(rbox(w, 0.08, 0.06, 0.02), wood, { pos: [0, 1.02, 0] }));
    this.leaf.add(mesh(rbox(w, 0.08, 0.06, 0.02), wood, { pos: [0, h - 0.08, 0] }));
    this.leaf.add(mesh(rbox(0.08, h - 0.05, 0.06, 0.02), wood, { pos: [-w / 2 + 0.04, h / 2, 0] }));
    this.leaf.add(mesh(rbox(0.08, h - 0.05, 0.06, 0.02), wood, { pos: [w / 2 - 0.04, h / 2, 0] }));
    for (let i = 1; i < 8; i++) {
      const x = -w / 2 + (i * w) / 8;
      this.leaf.add(mesh(cyl(0.012, 0.012, h - 0.2, 6), iron, { pos: [x, h / 2, 0] }));
      this.leaf.add(mesh(sphere(0.022, 8, 6), iron, { pos: [x, h - 0.02, 0] }));
    }
    // The bars leave gaps: an invisible panel makes the whole gate clickable.
    const hit = hitArea(w, h - 0.1, 0.07);
    hit.position.set(0, h / 2, 0);
    this.leaf.add(hit);
    // A wooden backing board behind the keyholes.
    this.leaf.add(mesh(rbox(0.22, 0.4, 0.04, 0.015), wood, { pos: [w / 2 - 0.16, 1.0, 0.01] }));
    this.leaf.add(mesh(rbox(0.22, 0.12, 0.04, 0.015), wood, { pos: [w / 2 - 0.16, 0.88, 0.01] }));
  }

  _buildMemoryTulip(r) {
    const g = group([], { pos: [DOOR_W / 2 + 0.55, 1.25, r.zN + 0.02] });
    g.add(mesh(rbox(0.26, 0.03, 0.16, 0.01), woodMat('light'), { pos: [0, 0, 0.08] }));
    g.add(mesh(box(0.02, 0.1, 0.12), woodMat('dark'), { pos: [0, -0.06, 0.06] }));
    g.add(mesh(cyl(0.05, 0.04, 0.08, 12), mat(COLORS.cream, { rough: 0.4 }), { pos: [0, 0.055, 0.08] }));
    this.memTulip = tulip('W', { scale: 0.9 });
    this.memTulip.position.set(0, 0.09, 0.08);
    g.add(this.memTulip);
    this.memGlow = glowSprite(0xbcd6ff, 0.6, 0);
    this.memGlow.position.set(0, 0.36, 0.08);
    g.add(this.memGlow);
    this.memDigit = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: labelTexture(this.ctx.gs.digit(this.room), { color: '#fff6dc', size: 92, w: 128, h: 128 }),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: false,
      }),
    );
    this.memDigit.scale.setScalar(0.22);
    this.memDigit.position.set(0, 0.55, 0.08);
    g.add(this.memDigit);
    this.memGroup = g;
    this.ctx.roomGroup(this.room).add(g);
    // Dim, sleepy tulip until the door opens.
    this.memTulip.userData.head.material = mat(0xd8d4cc, { flat: true, rough: 0.6 });
    this.ctx.interact.add(g, {
      zones: [this.room],
      prompt: () => (this.ctx.gs.isDoorOpen(this.room) ? fill(PROMPTS.memoryLit, { D: this.ctx.gs.digit(this.room) }) : PROMPTS.memorySleepy),
      onUse: () => {
        if (this.ctx.gs.isDoorOpen(this.room)) {
          this.ctx.hud.toast(fill(UI.memoryTulip, { D: this.ctx.gs.digit(this.room) }));
          this.memDigitT = 0;
        } else this.ctx.hud.toast(TOASTS.memoryWaiting);
      },
    });
  }

  _addOccluders() {
    for (const o of this._occ) if (!this.ctx.occluders.includes(o)) this.ctx.occluders.push(o);
  }

  // Match the GameState instantly (new game / load).
  sync() {
    this.anim = null;
    this.animating = false;
    if (this.ctx.gs.isDoorOpen(this.room)) return this.setOpen();
    this.hinge.rotation.y = 0;
    this.closedBox.enabled = true;
    this.openBox.enabled = false;
    this._addOccluders();
    if (this.keys) {
      for (const k of Object.values(this.keys)) this.plate.remove(k);
      this.keys = null;
    }
    if (this.memTulip) {
      this.memTulip.userData.head.material = mat(0xd8d4cc, { flat: true, rough: 0.6 });
      this.memGlow.material.opacity = 0;
      this.memDigit.material.opacity = 0;
      this.memDigitT = undefined;
    }
  }

  // Instantly show the open state (used when loading a save).
  setOpen() {
    this.hinge.rotation.y = Math.PI * 0.53;
    this.closedBox.enabled = false;
    this.openBox.enabled = true;
    this._removeOccluders();
    this._lightMemory(false);
    for (const type of ['gold', 'silver']) this._placeKey(type, Math.PI / 2).children[0].position.z = 0;
  }

  _removeOccluders() {
    const set = new Set(this._occ);
    const occ = this.ctx.occluders;
    for (let i = occ.length - 1; i >= 0; i--) if (set.has(occ[i])) occ.splice(i, 1);
  }

  _placeKey(type, turn) {
    if (!this.keys) this.keys = {};
    if (!this.keys[type]) {
      const k = keyMesh(type);
      k.rotation.y = Math.PI / 2; // tip points into the door
      const pivot = group([k]);
      k.position.set(0, 0, 0.05);
      pivot.position.copy(this.holes[type]);
      this.plate.add(pivot);
      this.keys[type] = pivot;
    }
    this.keys[type].rotation.z = turn;
    return this.keys[type];
  }

  _lightMemory(animate) {
    if (!this.memTulip) return;
    this.memTulip.userData.head.material = mat(0xeaf2ff, { flat: true, rough: 0.5, emissive: 0x9fc0ff, ei: 0.9 });
    this.memGlow.material.opacity = 0.75;
    if (animate) this.memDigitT = 0;
  }

  tryOpen() {
    const gs = this.ctx.gs;
    const room = this.room;
    if (gs.isDoorOpen(room) || this.animating) return;
    const g = gs.hasKey(room, 'gold');
    const s = gs.hasKey(room, 'silver');
    if (!(g && s)) {
      this.ctx.audio.soft();
      if (this.style === 'gate' && !g && !s) this.ctx.hud.toast(UI.gateLocked);
      else this.ctx.hud.toast(!g && !s ? UI.doorMissingBoth : !g ? UI.doorMissingGold : UI.doorMissingSilver);
      return;
    }
    this.animating = true;
    this.anim = { t: 0, phase: 0 };
    this.ctx.interact.setHover(null);
    if (this.onOpening) this.onOpening();
  }

  update(dt) {
    if (this.memDigitT !== undefined && this.memDigit) {
      this.memDigitT += dt;
      const t = this.memDigitT;
      this.memDigit.material.opacity = t < 0.4 ? t / 0.4 : t < 3 ? 1 : Math.max(0, 1 - (t - 3));
      this.memDigit.position.y = 0.45 + Math.min(t, 1) * 0.12;
      if (t > 4) this.memDigitT = undefined;
    }
    if (this.memGlow && this.ctx.gs.isDoorOpen(this.room)) this.memGlow.material.opacity = 0.6 + 0.15 * Math.sin(performance.now() / 600);
    if (!this.anim) return;
    const a = this.anim;
    a.t += dt;
    const audio = this.ctx.audio;
    // Phase timings: gold key in+turn, silver key in+turn, swing.
    const steps = [
      [0.0, () => this._placeKey('gold', 0)],
      [0.55, () => audio.keyTurn()],
      [0.9, () => this._placeKey('silver', 0)],
      [1.45, () => audio.keyTurn()],
      [1.9, () => audio.doorOpen()],
    ];
    while (a.phase < steps.length && a.t >= steps[a.phase][0]) steps[a.phase++][1]();
    const turn = (start) => Math.min(1, Math.max(0, (a.t - start) / 0.3));
    if (this.keys?.gold) {
      this.keys.gold.rotation.z = turn(0.35) * (Math.PI / 2);
      this.keys.gold.children[0].position.z = 0.05 * (1 - Math.min(1, a.t / 0.3));
    }
    if (this.keys?.silver) {
      this.keys.silver.rotation.z = turn(1.25) * (Math.PI / 2);
      this.keys.silver.children[0].position.z = 0.05 * (1 - Math.min(1, (a.t - 0.9) / 0.3));
    }
    if (a.t > 1.9) {
      const k = Math.min(1, (a.t - 1.9) / 1.4);
      const e = 1 - Math.pow(1 - k, 3);
      this.hinge.rotation.y = e * Math.PI * 0.53;
      if (k > 0.25 && this.closedBox.enabled) {
        this.closedBox.enabled = false;
        this._removeOccluders();
      }
      if (k >= 1) {
        this.openBox.enabled = true;
        this.anim = null;
        this.animating = false;
        this._lightMemory(true);
        this.ctx.gs.openDoor(this.room);
      }
    }
  }
}

let _tulipIcon = null;
function tulipIcon() {
  if (_tulipIcon) return _tulipIcon;
  _tulipIcon = labelTexture('', { w: 64, h: 64 });
  const c = _tulipIcon.image.getContext('2d');
  c.fillStyle = '#f7ecd9';
  c.beginPath();
  c.moveTo(18, 18);
  c.lineTo(25, 28);
  c.lineTo(32, 14);
  c.lineTo(39, 28);
  c.lineTo(46, 18);
  c.quadraticCurveTo(48, 40, 32, 40);
  c.quadraticCurveTo(16, 40, 18, 18);
  c.fill();
  c.strokeStyle = '#f7ecd9';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(32, 40);
  c.lineTo(32, 56);
  c.stroke();
  _tulipIcon.needsUpdate = true;
  return _tulipIcon;
}
