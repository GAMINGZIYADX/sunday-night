import * as THREE from 'three';

// Center-of-screen interaction (on touch screens also at the tapped point).
// Objects register with a prompt and a callback;
// walls register as occluders so nothing can be used through them.
export class Interactions {
  constructor(camera) {
    this.camera = camera;
    this.items = [];
    this.occluders = [];
    this.ray = new THREE.Raycaster();
    this.ray.far = 2.7;
    this.hover = null;
    this.zone = 0;
    this._center = new THREE.Vector2(0, 0);
    this._hiCache = new Map();
  }

  // opts: { prompt, onUse(alt), enabled(), zones: [..], puzzle: id, highlight }
  add(object, opts) {
    const item = { object, highlight: true, zones: null, ...opts };
    object.traverse((o) => (o.userData.interact = item));
    this.items.push(item);
    return item;
  }
  remove(item) {
    this.items = this.items.filter((i) => i !== item);
    if (this.hover === item) this.setHover(null);
  }
  addOccluder(mesh) {
    this.occluders.push(mesh);
  }

  active(item) {
    if (item.zones && !item.zones.includes(this.zone)) return false;
    if (item.enabled && !item.enabled()) return false;
    let o = item.object;
    while (o) {
      if (!o.visible) return false;
      o = o.parent;
    }
    return true;
  }

  update() {
    const found = this._cast(this._center);
    if (found !== this.hover) this.setHover(found);
    return this.hover;
  }

  // What a tap at this screen point would use (touch screens).
  pickAt(clientX, clientY) {
    // The canvas fills the window.
    const ndc = new THREE.Vector2((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    return this._cast(ndc);
  }

  _cast(ndc) {
    const list = [];
    for (const it of this.items) if (this.active(it)) list.push(it.object);
    if (!list.length) return null;
    this.ray.setFromCamera(ndc, this.camera);
    const hits = this.ray.intersectObjects(list.concat(this.occluders), true);
    for (const h of hits) {
      if (!h.object.visible) continue;
      const it = h.object.userData.interact;
      return it && this.active(it) ? it : null;
    }
    return null;
  }

  setHover(item) {
    if (this.hover) this._glow(this.hover, false);
    this.hover = item;
    if (item) this._glow(item, true);
  }

  refreshGlow() {
    if (this.hover) this._glow(this.hover, true);
  }

  // Soft glow: swap each mesh to a brightened clone of its material(s).
  _glow(item, on) {
    if (!item.highlight) return;
    item.object.traverse((o) => {
      if (!o.isMesh || o.userData.noGlow) return;
      if (on) {
        if (o.userData.baseMat && o.material === o.userData.hiMat) return;
        const base = o.material;
        const hi = Array.isArray(base) ? base.map((m) => this._hi(m)) : this._hi(base);
        o.userData.baseMat = base;
        o.userData.hiMat = hi;
        o.material = hi;
      } else if (o.userData.baseMat) {
        // Only restore if nobody swapped the material while it was glowing.
        if (o.material === o.userData.hiMat) o.material = o.userData.baseMat;
        o.userData.baseMat = null;
        o.userData.hiMat = null;
      }
    });
  }

  _hi(base) {
    let hi = this._hiCache.get(base);
    if (hi) return hi;
    hi = base.clone();
    if (hi.emissive) {
      // Textured surfaces glow through their own texture so they stay readable.
      hi.emissive = new THREE.Color(0xffe6b8);
      if (base.map) {
        hi.emissiveMap = base.map;
        hi.emissiveIntensity = 0.28;
      } else hi.emissiveIntensity = Math.max(base.emissiveIntensity * (base.emissive?.getHex() ? 1 : 0), 0) + 0.12;
    } else if (hi.color) hi.color.multiplyScalar(1.25);
    this._hiCache.set(base, hi);
    return hi;
  }

  // Forget cached glow materials for objects whose material just changed.
  invalidate(material) {
    this._hiCache.delete(material);
  }
}
