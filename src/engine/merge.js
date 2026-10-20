import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Merges a room's static meshes by material so the GPU draws a few dozen
// batches instead of hundreds of tiny objects. Anything interactive
// (userData.interact) or flagged userData.dynamic is left untouched, together
// with everything inside it. Wall meshes keep working as interaction
// occluders after they are detached, because raycasting only needs their
// (frozen) world matrices.
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  const walk = (obj) => {
    if (obj !== root && (obj.userData.interact || obj.userData.dynamic)) return;
    if (obj.isMesh && !obj.isInstancedMesh && obj.visible && canMerge(obj)) {
      const m = obj.material;
      const key = `${m.uuid}|${obj.castShadow}|${obj.receiveShadow}|${obj.renderOrder}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(obj);
    }
    for (const c of obj.children.slice()) walk(c);
  };
  walk(root);
  let merged = 0;
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const geos = list.map((o) => {
      const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      g.clearGroups(); // single material, so face groups do not matter
      for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
      g.applyMatrix4(o.matrixWorld);
      return g;
    });
    const geo = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!geo) continue;
    const first = list[0];
    const mesh = new THREE.Mesh(geo, first.material);
    mesh.castShadow = first.castShadow;
    mesh.receiveShadow = first.receiveShadow;
    mesh.renderOrder = first.renderOrder;
    mesh.name = 'merged';
    root.add(mesh);
    for (const o of list) o.parent.remove(o);
    merged += list.length;
  }
  return merged;
}

function canMerge(o) {
  const m = o.material;
  if (!m || Array.isArray(m) || m.isShaderMaterial) return false;
  const g = o.geometry;
  if (!g || o.morphTargetInfluences) return false;
  const a = g.attributes;
  return !!(a.position && a.normal && a.uv);
}
