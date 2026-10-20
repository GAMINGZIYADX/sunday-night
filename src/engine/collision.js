// 2D (XZ plane) axis-aligned boxes. The player is a circle; for robustness we
// treat it as a square of the same radius, which feels identical indoors.
export class Collision {
  constructor() {
    this.boxes = [];
  }
  add(minX, minZ, maxX, maxZ, tag = null) {
    const b = {
      minX: Math.min(minX, maxX),
      maxX: Math.max(minX, maxX),
      minZ: Math.min(minZ, maxZ),
      maxZ: Math.max(minZ, maxZ),
      tag,
      enabled: true,
    };
    this.boxes.push(b);
    return b;
  }
  // Box centred at (x, z) with full size w x d.
  addCentered(x, z, w, d, tag) {
    return this.add(x - w / 2, z - d / 2, x + w / 2, z + d / 2, tag);
  }
  remove(box) {
    this.boxes = this.boxes.filter((b) => b !== box);
  }
  hits(x, z, r) {
    for (const b of this.boxes) {
      if (!b.enabled) continue;
      if (x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ) return b;
    }
    return null;
  }
  // Moves (x, z) by (dx, dz), sliding along walls. Large moves are split into
  // small steps so nothing can tunnel through a thin wall.
  move(pos, dx, dz, r) {
    const len = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.ceil(len / (r * 0.5)));
    const sx = dx / steps;
    const sz = dz / steps;
    for (let i = 0; i < steps; i++) {
      if (!this.hits(pos.x + sx, pos.z, r)) pos.x += sx;
      if (!this.hits(pos.x, pos.z + sz, r)) pos.z += sz;
    }
    return pos;
  }
}
