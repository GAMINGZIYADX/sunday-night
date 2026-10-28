import * as THREE from 'three';

// Draws the spot light's shadow map only when it would look different, not
// every frame: most of the time nothing that casts a shadow moves. Each frame
// (before rendering) every visible shadow caster is compared with how it was
// when the map was last drawn; the map is drawn again when the set of casters
// changed (a room shown or hidden, a find appearing), the light moved (a new
// room), or a caster on screen moved more than MOVE. Breathing cats stay under
// it; a walking cat or a swinging door goes over it every frame.
const MOVE = 0.006; // metres a shadow may lag behind its object
const MARGIN = 1.5; // how far from its object a shadow can fall, at most
const REFRESH = 3; // seconds: draw again anyway, in case a change was missed

// Per caster: its world matrix (16), the geometry's position version, and
// three of its vertices (first, middle, last) for geometry that is rebuilt
// in place, like the cats' tails.
const SIZE = 16 + 1 + 9;

export class ShadowCache {
  constructor(renderer, scene, camera, spot) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.spot = spot;
    renderer.shadowMap.autoUpdate = false;
    // three.js draws a shadow only for casters on the camera's layers. Draw
    // them on every layer: the camera skips parts of the next room that its
    // doorway hides (Game._cull), but their shadows stay put.
    const render = renderer.shadowMap.render;
    renderer.shadowMap.render = function (lights, scene, cam) {
      const mask = cam.layers.mask;
      cam.layers.enableAll();
      try {
        return render.call(this, lights, scene, cam);
      } finally {
        cam.layers.mask = mask;
      }
    };
    // update() brings every matrix up to date before rendering, so render()
    // need not do it a second time.
    scene.matrixWorldAutoUpdate = false;
    this.dirty = true;
    this.age = 0;
    this.snaps = new WeakMap();
    this.members = -1;
    this.light = new Float32Array(9);
    this.casters = [];
    this.draws = 0; // shadow map draws so far (for tests)
    this._frustum = new THREE.Frustum();
    this._m = new THREE.Matrix4();
    this._sphere = new THREE.Sphere();
    renderer.domElement.addEventListener('webglcontextrestored', () => this.invalidate());
  }

  invalidate() {
    this.dirty = true;
  }

  // Call once a frame, just before renderer.render().
  update(dt) {
    this.scene.updateMatrixWorld();
    const map = this.renderer.shadowMap;
    if (!map.enabled) return;
    const casters = this.casters;
    casters.length = 0;
    let members = 0;
    this.scene.traverseVisible((o) => {
      if (o.isMesh && o.castShadow) {
        casters.push(o);
        members += o.id * 7919 + 1;
      }
    });
    this.age += dt;
    let draw = this.dirty || this.age > REFRESH || members !== this.members || this._lightMoved();
    if (!draw) {
      this.camera.updateMatrixWorld();
      this._m.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
      this._frustum.setFromProjectionMatrix(this._m);
      for (const o of casters)
        if (this._moved(o)) {
          draw = true;
          break;
        }
    }
    if (!draw) return;
    map.needsUpdate = true;
    this.dirty = false;
    this.age = 0;
    this.members = members;
    this.draws++;
    for (const o of casters) this._snap(o);
  }

  _lightMoved() {
    const s = this.spot;
    const l = this.light;
    const now = [
      s.position.x,
      s.position.y,
      s.position.z,
      s.target.position.x,
      s.target.position.y,
      s.target.position.z,
      s.angle,
      s.shadow.camera.far,
      s.penumbra,
    ];
    let moved = false;
    for (let i = 0; i < 9; i++)
      if (l[i] !== Math.fround(now[i])) {
        l[i] = now[i];
        moved = true;
      }
    return moved;
  }

  // Did this caster move more than MOVE since the map was drawn, where it
  // could show?
  _moved(o) {
    const snap = this.snaps.get(o);
    if (!snap) return true;
    const e = o.matrixWorld.elements;
    const pos = o.geometry.attributes.position;
    const version = (pos?.version ?? 0) + (o.instanceMatrix?.version ?? 0);
    let same = snap[16] === version;
    for (let i = 0; same && i < 16; i++) same = snap[i] === Math.fround(e[i]);
    if (same) return false;
    if (!this._onScreen(o)) return false;
    if (o.isInstancedMesh) return true;
    // How far any point of it moved: the change of position, plus the change
    // of each axis times how far the geometry reaches from its origin.
    const bs = this._bounds(o);
    const reach = bs.center.length() + bs.radius;
    let axis = 0;
    for (let c = 0; c < 3; c++) {
      const i = c * 4;
      axis = Math.max(axis, Math.hypot(e[i] - snap[i], e[i + 1] - snap[i + 1], e[i + 2] - snap[i + 2]));
    }
    let d = Math.hypot(e[12] - snap[12], e[13] - snap[13], e[14] - snap[14]) + axis * reach;
    if (snap[16] !== version && pos) {
      // Rebuilt geometry: how far its sample vertices moved (in local units).
      const scale = Math.hypot(e[0], e[1], e[2]);
      const idx = [0, pos.count >> 1, pos.count - 1];
      for (let k = 0; k < 3; k++) {
        const j = idx[k];
        const dv = Math.hypot(pos.getX(j) - snap[17 + k * 3], pos.getY(j) - snap[18 + k * 3], pos.getZ(j) - snap[19 + k * 3]);
        d = Math.max(d, dv * scale);
      }
    }
    return d > MOVE;
  }

  _bounds(o) {
    const g = o.geometry;
    if (!g.boundingSphere) g.computeBoundingSphere();
    return g.boundingSphere;
  }

  _onScreen(o) {
    const s = this._sphere.copy(o.isInstancedMesh ? (o.boundingSphere ?? (o.computeBoundingSphere(), o.boundingSphere)) : this._bounds(o));
    s.applyMatrix4(o.matrixWorld);
    s.radius += MARGIN;
    return this._frustum.intersectsSphere(s);
  }

  _snap(o) {
    let snap = this.snaps.get(o);
    if (!snap) this.snaps.set(o, (snap = new Float32Array(SIZE)));
    snap.set(o.matrixWorld.elements);
    const pos = o.geometry.attributes.position;
    snap[16] = (pos?.version ?? 0) + (o.instanceMatrix?.version ?? 0);
    if (!pos) return;
    const idx = [0, pos.count >> 1, pos.count - 1];
    for (let k = 0; k < 3; k++) {
      snap[17 + k * 3] = pos.getX(idx[k]);
      snap[18 + k * 3] = pos.getY(idx[k]);
      snap[19 + k * 3] = pos.getZ(idx[k]);
    }
  }
}
