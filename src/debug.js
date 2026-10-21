import * as THREE from 'three';
import { ROOMS, zoneAt } from './engine/layout.js';
import { PUZZLE_IDS } from './puzzles/index.js';

// Debug helpers (only in debug builds, with ?debug=1):
//   Shift+1..6  jump to room / clearing
//   Shift+K     solve both puzzles in the current room (grants both keys)
//   Shift+O     open the current room's door
//   window.__game  scripting API for automated tests
export function installDebug(game, params) {
  if (params.has('nolock')) {
    game.headless = true;
    game.input.noLock = true; // automated tests drive the camera directly
  }
  if (params.has('dtmax')) game.maxDt = Number(params.get('dtmax')) || 0.05;
  const api = {
    game,
    gs: game.gs,
    THREE,
    zone: () => game.zone,
    state: () => game.state,
    pos: () => ({ ...game.player.pos, yaw: game.player.yaw, pitch: game.player.pitch }),
    teleport(x, z, yaw = 0, pitch = 0) {
      game.player.place(x, z, yaw, pitch);
      const zone = zoneAt(z);
      if (zone !== game.zone && game.state === 'playing') game._enterZone(zone);
    },
    toRoom(i) {
      const r = ROOMS[i];
      game.player.place(0, r.zS - 1.2, 0, 0);
    },
    lookAt(x, y, z) {
      const c = game.camera.position;
      const dx = x - c.x;
      const dy = y - c.y;
      const dz = z - c.z;
      game.player.yaw = Math.atan2(-dx, -dz);
      game.player.pitch = Math.atan2(dy, Math.hypot(dx, dz));
      game.player.apply();
      game.camera.updateMatrixWorld();
      game.interact.zone = game.zone;
      return game.interact.update();
    },
    hovered() {
      game.camera.updateMatrixWorld();
      const h = game.interact.update();
      return h ? (typeof h.prompt === 'function' ? h.prompt() : h.prompt) : null;
    },
    use(alt = false) {
      game.camera.updateMatrixWorld();
      const h = game.interact.update();
      if (h && h.onUse) {
        h.onUse(alt);
        return true;
      }
      return false;
    },
    solve(id) {
      game.gs.puzzles[id].forceSolve();
    },
    solveRoom(room) {
      for (const id of PUZZLE_IDS) if (game.gs.puzzles[id].room === room) game.gs.puzzles[id].forceSolve();
    },
    openDoor(room) {
      game.doors[room].tryOpen();
    },
    // Instantly solve and open everything before `room` (for screenshots).
    unlockThrough(room) {
      for (let r = 0; r < room; r++) {
        api.solveRoom(r);
        if (!game.gs.isDoorOpen(r)) game.gs.openDoor(r);
        game.doors[r].sync();
      }
      game.keyAnimating.clear();
      game.pendingKeys = [];
      game.keyfx.active.forEach((a) => game.scene.remove(a.key));
      game.keyfx.active = [];
      game.modals.closeAll();
    },
    modal: () => game.modals.top()?.name || null,
    closeModals: () => game.modals.closeAll(),
    // Simulate held keys for n frames of dt (movement + collision only).
    walk(keys, frames = 60, dt = 1 / 60) {
      const before = new Set(game.input.keys);
      game.input.keys.clear();
      keys.forEach((k) => game.input.keys.add(k));
      const enabled = game.input.enabled;
      game.input.enabled = true;
      for (let i = 0; i < frames; i++) game.player.update(dt);
      game.input.enabled = enabled;
      game.input.keys.clear();
      before.forEach((k) => game.input.keys.add(k));
      return api.pos();
    },
    catPositions: () =>
      game.cats.cats.map((c) => ({
        id: c.id,
        x: c.model.root.position.x,
        y: c.model.root.position.y,
        z: c.model.root.position.z,
        state: c.state,
        zone: c.zone,
      })),
    // Every walkable link in the cats' graph must stay clear of colliders.
    checkCatGraph() {
      const bad = [];
      const nodes = game.cats.nodes;
      const col = game.collision;
      for (const a of nodes) {
        for (const id of a.links) {
          const b = nodes[id];
          if (b.id < a.id) continue;
          if (Math.abs(a.y - b.y) > 0.12 || a.y > 0.12 || b.y > 0.12) continue; // jumps onto furniture
          const doorLink = a.door !== undefined && b.door !== undefined && a.zone !== b.zone;
          const len = Math.hypot(b.x - a.x, b.z - a.z);
          for (let t = 0; t <= len; t += 0.05) {
            const x = a.x + ((b.x - a.x) * t) / len;
            const z = a.z + ((b.z - a.z) * t) / len;
            const hit = col.boxes.find(
              (bx) => bx.tag !== 'door' && bx.tag !== 'door-open' && x + 0.1 > bx.minX && x - 0.1 < bx.maxX && z + 0.1 > bx.minZ && z - 0.1 < bx.maxZ,
            );
            if (hit && !(doorLink && hit.tag === 'wall' && Math.abs(x) < 0.45)) {
              bad.push({
                from: [a.x, a.z],
                to: [b.x, b.z],
                at: [+x.toFixed(2), +z.toFixed(2)],
                box: [hit.minX, hit.minZ, hit.maxX, hit.maxZ].map((v) => +v.toFixed(2)),
                tag: hit.tag,
              });
              break;
            }
          }
        }
      }
      return bad;
    },
    // Props that float or have furniture passing through them (run with ?nomerge).
    checkProps() {
      const ray = new THREE.Raycaster();
      const out = [];
      const boxes = [];
      game.roomGroups.forEach((grp, room) => {
        if (!grp) return;
        const solids = [];
        grp.traverse((o) => {
          if (!o.isMesh || o.isInstancedMesh) return;
          const m = Array.isArray(o.material) ? o.material[0] : o.material;
          if (!m || m.colorWrite === false || m.depthWrite === false) return;
          solids.push(o);
        });
        grp.updateMatrixWorld(true);
        grp.traverse((p) => {
          if (!p.userData.prop) return;
          let o = p;
          while (o) {
            if (!o.visible) return;
            o = o.parent;
          }
          const own = new Set();
          p.traverse((c) => own.add(c));
          const box = new THREE.Box3();
          p.traverse((m) => {
            if (!m.isMesh || m.userData.noGlow) return;
            const mm = Array.isArray(m.material) ? m.material[0] : m.material;
            if (mm.depthWrite === false || mm.colorWrite === false) return;
            box.expandByObject(m);
          });
          const c = box.getCenter(new THREE.Vector3());
          const others = solids.filter((s) => !own.has(s));
          const from = new THREE.Vector3(c.x, box.min.y + 0.015, c.z);
          ray.set(from, new THREE.Vector3(0, -1, 0));
          ray.far = 5;
          const down = ray.intersectObjects(others, false)[0];
          const gap = down ? down.distance - 0.015 : Infinity;
          // Upward rays from five points inside the footprint: anything hit
          // before the prop's own top passes through it.
          let up = null;
          const sx = (box.max.x - box.min.x) * 0.3;
          const sz = (box.max.z - box.min.z) * 0.3;
          for (const [dx, dz] of [
            [0, 0],
            [sx, sz],
            [-sx, sz],
            [sx, -sz],
            [-sx, -sz],
          ]) {
            ray.set(new THREE.Vector3(c.x + dx, box.min.y + 0.03, c.z + dz), new THREE.Vector3(0, 1, 0));
            ray.far = Math.max(0.01, box.max.y - box.min.y - 0.05);
            up = up || ray.intersectObjects(others, false)[0];
          }
          // Overlap with other props (e.g. a candle standing inside a stack of books).
          box.userData = { p };
          boxes.push({ p, box, room });
          if (gap > 0.02 || up) {
            out.push({
              room,
              prop: p.userData.prop,
              at: [c.x, box.min.y, c.z].map((v) => +v.toFixed(2)),
              gap: gap === Infinity ? 'none' : +gap.toFixed(3),
              through: up ? { y: +(box.min.y + 0.03 + up.distance).toFixed(2), what: up.object.name || up.object.geometry.type } : null,
            });
          }
        });
      });
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i];
          const b = boxes[j];
          if (a.room !== b.room) continue;
          const inter = a.box.clone().intersect(b.box);
          if (inter.isEmpty()) continue;
          const v = (bx) => {
            const sz = bx.getSize(new THREE.Vector3());
            return sz.x * sz.y * sz.z;
          };
          const frac = v(inter) / Math.min(v(a.box), v(b.box));
          if (frac > 0.08)
            out.push({
              room: a.room,
              overlap: [a.p.userData.prop, b.p.userData.prop],
              at: a.box
                .getCenter(new THREE.Vector3())
                .toArray()
                .map((x) => +x.toFixed(2)),
              frac: +frac.toFixed(2),
            });
        }
      return out;
    },
    zoneAt,
    ROOMS,
  };
  window.__game = api;
  window.addEventListener('keydown', (e) => {
    if (!e.shiftKey || game.state !== 'playing') return;
    const n = /^Digit([1-6])$/.exec(e.code);
    if (n) api.toRoom(Number(n[1]) - 1);
    if (e.code === 'KeyK') api.solveRoom(Math.min(game.zone, 4));
    if (e.code === 'KeyO') api.openDoor(Math.min(game.zone, 4));
  });
  return api;
}
