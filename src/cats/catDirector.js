import * as THREE from 'three';
import { CatModel } from './catModel.js';
import { CATS } from '../config.js';
import { zoneAt } from '../engine/layout.js';
import { PROMPTS } from '../config.js';
import { fill } from '../engine/text.js';

// Both cats' behaviour. They wander a small waypoint graph (one hub per room
// plus a few spots, joined through open doors), idle, sit, sleep, avoid the
// player, react when clicked, hide in the study and pose for the ending.
//
// Cats have no colliders, so they can never block the player or a puzzle;
// waypoints are placed so straight lines between them avoid furniture.

const WALK_SPEED = 0.42;

export class CatDirector {
  constructor(ctx) {
    this.ctx = ctx;
    this.nodes = []; // {id, x, y, z, zone, links:Set, hub, door}
    this.byZone = new Map();
    this.doorLinks = []; // {room, a, b}
    this.cats = ['tchobin', 'zizo'].map((id) => this._makeCat(id));
    this.mode = 'roam';
    this.frustum = new THREE.Frustum();
    this._m = new THREE.Matrix4();
    this.hideSpots = null; // set by the study
    this.endingSpots = null; // set by the clearing
    this.scriptQueue = [];
  }

  _makeCat(id) {
    const model = new CatModel(id);
    this.ctx.scene.add(model.root);
    const cat = {
      id,
      name: CATS[id].name,
      pitch: CATS[id].meowPitch,
      model,
      node: null,
      path: [],
      wait: 1 + Math.random() * 3,
      state: 'idle',
      zone: 0,
      heading: 0,
      hidden: false,
      pending: null, // teleport target waiting until out of view
    };
    model.root.userData.cat = cat;
    cat.item = this.ctx.interact.add(model.root, {
      prompt: () => fill(this.mode === 'hide' && cat.hidden ? PROMPTS.hiddenCat : PROMPTS.petCat, { NAME: cat.name }),
      onUse: () => this.onCatClicked(cat),
      highlight: false,
    });
    return cat;
  }

  // ------------------------------------------------------------- the graph
  // points: [[x, z], [x, z, y], [x, z, y, via]]; the first point is the room
  // hub. A raised perch (y > 0) links only to the floor point at index `via`
  // and is reached with a little jump.
  addZone(zone, points) {
    const ids = [];
    points.forEach(([x, z, y = 0, via], i) => {
      const n = { id: this.nodes.length, x, y, z, zone, links: new Set(), hub: i === 0, via };
      this.nodes.push(n);
      ids.push(n);
    });
    const hub = ids[0];
    for (const n of ids.slice(1)) {
      if (n.via !== undefined) this.link(n, ids[n.via]);
      else this.link(hub, n);
    }
    this.byZone.set(zone, ids);
    return ids;
  }
  // Link two specific nodes (e.g. a floor spot and a perch above it).
  link(a, b) {
    a.links.add(b.id);
    b.links.add(a.id);
  }
  // A doorway between zone `room` and `room + 1`; usable when the door is open.
  addDoor(room, a, b) {
    const na = { id: this.nodes.length, x: a[0], y: 0, z: a[1], zone: room, links: new Set(), door: room };
    this.nodes.push(na);
    const nb = { id: this.nodes.length, x: b[0], y: 0, z: b[1], zone: room + 1, links: new Set(), door: room };
    this.nodes.push(nb);
    const hubA = this.byZone.get(room)[0];
    const hubB = this.byZone.get(room + 1)[0];
    this.link(hubA, na);
    this.link(nb, hubB);
    this.link(na, nb);
    this.doorLinks.push({ room, a: na, b: nb });
  }

  _passable(from, to) {
    if (from.door !== undefined && to.door !== undefined && from.door === to.door && from.zone !== to.zone) {
      return this.ctx.gs.isDoorOpen(from.door);
    }
    return true;
  }

  allowedZones() {
    const gs = this.ctx.gs;
    if (this.mode === 'ending') return new Set([5]);
    if (gs.data.finished) return new Set([4, 5]);
    const z = new Set([0]);
    for (let r = 0; r < 5; r++) {
      if (gs.isDoorOpen(r)) z.add(r + 1);
      else break;
    }
    // The clearing is only for the ending.
    z.delete(5);
    // While hide-and-seek is waiting, the study belongs to the hiders.
    if (!gs.puzzles.r4a.isSolved()) z.delete(3);
    return z;
  }

  _path(from, to) {
    const prev = new Map([[from.id, null]]);
    const q = [from];
    // A cat may always walk out of wherever it is, even a zone it would not
    // normally choose, so it can never be stranded.
    const allowed = this.allowedZones();
    allowed.add(from.zone);
    while (q.length) {
      const n = q.shift();
      if (n === to) break;
      for (const id of n.links) {
        const m = this.nodes[id];
        if (prev.has(m.id) || !allowed.has(m.zone) || !this._passable(n, m)) continue;
        prev.set(m.id, n);
        q.push(m);
      }
    }
    if (!prev.has(to.id)) return null;
    const path = [];
    for (let n = to; n && n !== from; n = prev.get(n.id)) path.unshift(n);
    return path;
  }

  _pickTarget(cat, avoid = null) {
    const allowed = [...this.allowedZones()];
    const playerZone = this.ctx.playerZone();
    const candidates = this.nodes.filter((n) => allowed.includes(n.zone) && n.door === undefined && n !== cat.node);
    if (!candidates.length) return null;
    const other = this.cats.find((c) => c !== cat);
    const scored = candidates.map((n) => {
      let w = Math.random();
      if (n.zone === cat.zone) w += 0.6;
      if (n.zone === playerZone) w += 0.5; // cats like company
      if (other.node === n || other.path.at(-1) === n) w -= 2;
      if (avoid) w += Math.min(2, Math.hypot(n.x - avoid.x, n.z - avoid.z)) * 0.8;
      return [w, n];
    });
    scored.sort((a, b) => b[0] - a[0]);
    return scored[0][1];
  }

  // ------------------------------------------------------------- placement
  placeAt(cat, node, pose = 'sit') {
    cat.node = node;
    cat.zone = node.zone;
    cat.path = [];
    cat.model.root.position.set(node.x, node.y, node.z);
    cat.model.setPose(pose);
    cat.model.pose.sit = cat.model.target.sit;
    cat.model.pose.sleep = cat.model.target.sleep;
    cat.state = 'idle';
    cat.wait = 3 + Math.random() * 6;
  }

  nearestNode(x, z, zones) {
    let best = null;
    let bd = Infinity;
    for (const n of this.nodes) {
      if (n.door !== undefined || (zones && !zones.has(n.zone))) continue;
      const d = Math.hypot(n.x - x, n.z - z);
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
    return best;
  }

  // Called after load / new game: decide where everyone should be.
  resetFromState() {
    const gs = this.ctx.gs;
    this.cats.forEach((c) => {
      c.hidden = false;
      c.pending = null;
      c.model.tailHeart = 0;
      c.model.eyesClosed = false;
      c.model.extraHeadYaw = 0;
      c.model.root.visible = true;
    });
    if (gs.data.finished) {
      this.mode = 'roam';
      const zone = new Set([4, 5]);
      this.cats.forEach((c, i) => this.placeAt(c, this._randomNode(zone, i)));
    } else if (gs.isDoorOpen(4)) {
      this.startEnding(true);
    } else if (gs.isDoorOpen(2) && !gs.puzzles.r4a.isSolved()) {
      this.startHiding(true);
    } else {
      this.mode = 'roam';
      const allowed = this.allowedZones();
      const pz = this.ctx.playerZone();
      const zones = allowed.has(pz) ? new Set([pz]) : allowed;
      const poses = ['sleep', 'sit'];
      this.cats.forEach((c, i) => this.placeAt(c, this._randomNode(zones, i), poses[i]));
    }
  }

  _randomNode(zones, offset = 0) {
    const list = this.nodes.filter((n) => zones.has(n.zone) && n.door === undefined && !n.hub);
    if (!list.length) return this.nodes.find((n) => zones.has(n.zone));
    const taken = new Set(this.cats.map((c) => c.node));
    const free = list.filter((n) => !taken.has(n));
    const pool = free.length ? free : list;
    return pool[(Math.floor(Math.random() * pool.length) + offset) % pool.length];
  }

  // ------------------------------------------------------------ hide & seek
  startHiding(immediate = false) {
    if (!this.hideSpots) return;
    this.mode = 'hide';
    const p = this.ctx.gs.puzzles.r4a;
    for (const cat of this.cats) {
      const spot = this.hideSpots[p.spots[cat.id]];
      if (p.found[cat.id]) {
        cat.hidden = false;
        this._sitFound(cat);
        continue;
      }
      const go = () => {
        cat.hidden = true;
        cat.path = [];
        cat.state = 'hidden';
        cat.zone = 3;
        cat.model.root.position.copy(spot.pos);
        cat.model.root.rotation.y = spot.heading;
        cat.model.setPose(spot.pose || 'sleep');
        cat.model.pose.sit = cat.model.target.sit;
        cat.model.pose.sleep = cat.model.target.sleep;
        cat.model.eyesClosed = false;
        cat.model.lookAt = null;
        cat.meowT = 3 + Math.random() * 4;
      };
      if (immediate) go();
      else cat.pending = go;
    }
  }

  // The study tells us a hiding spot was searched. `route` leads out of the spot.
  found(catId, route = []) {
    const cat = this.cats.find((c) => c.id === catId);
    cat.hidden = false;
    this.ctx.audio.meow(cat.pitch, cat.model.root.position.clone().setY(0.4));
    cat.model.hop();
    this.ctx.particles.burst(cat.model.root.position.clone().setY(0.45), {
      kind: cat.id === 'zizo' ? 'petal' : 'heart',
      count: 7,
      color: cat.id === 'zizo' ? [0x6f9be0, 0xffffff] : 0xff8fa3,
      speed: 0.6,
      size: 0.07,
      gravity: 0.15,
    });
    // Walk out to the meeting place by the desk.
    const meet = this.ctx.studyMeet?.[catId];
    if (meet) {
      cat.state = 'script';
      cat.script = { points: [...route.map((p) => ({ x: p.x, z: p.z })), meet], meet };
      cat.model.setPose('stand');
      cat.model.root.position.y = 0;
    }
  }

  _sitFound(cat) {
    const meet = this.ctx.studyMeet?.[cat.id];
    if (!meet) return;
    cat.model.root.position.set(meet.x, 0, meet.z);
    cat.model.root.rotation.y = meet.heading;
    cat.model.setPose('sit');
    cat.state = 'waitTogether';
  }

  // Both found: they sit together; then they go back to roaming.
  bothFound() {
    this.mode = 'together';
    this.togetherT = 0;
  }

  // ------------------------------------------------------------------ ending
  startEnding(immediate = false) {
    if (!this.endingSpots) return;
    this.mode = 'ending';
    for (const cat of this.cats) {
      const spot = this.endingSpots[cat.id];
      const go = () => {
        cat.hidden = false;
        cat.state = 'ending';
        cat.path = [];
        cat.zone = 5;
        cat.model.root.position.copy(spot.pos);
        cat.model.root.rotation.y = spot.heading;
        cat.model.setPose('sit');
        cat.model.pose.sit = 1;
        cat.model.pose.sleep = 0;
        cat.model.tailHeartFn = spot.tail;
        cat.model.extraHeadYaw = spot.headYaw || 0;
      };
      if (immediate) go();
      else cat.pending = go;
    }
  }

  // After the letter: free roam in the garden and clearing.
  freeRoam() {
    this.mode = 'roam';
    this.cats.forEach((c) => {
      c.state = 'idle';
      c.wait = 4 + Math.random() * 4;
      c.node = this.nearestNode(c.model.root.position.x, c.model.root.position.z, new Set([5]));
      c.zone = 5;
    });
  }

  // ----------------------------------------------------------------- clicks
  onCatClicked(cat) {
    if (this.mode === 'hide' && cat.hidden) {
      if (this.ctx.onHiddenCatClicked) this.ctx.onHiddenCatClicked(cat.id);
      return;
    }
    const pos = cat.model.root.position.clone().setY(0.35);
    this.ctx.audio.meow(cat.pitch, pos);
    cat.model.hop();
    this.ctx.particles.burst(pos.clone().setY(0.5), {
      kind: cat.id === 'zizo' ? 'petal' : 'heart',
      count: 7,
      color: cat.id === 'zizo' ? [0x6f9be0, 0xffffff] : 0xff8fa3,
      speed: 0.55,
      size: 0.07,
      gravity: 0.12,
    });
    if (cat.state === 'idle' && cat.model.target.sleep > 0) cat.model.setPose('sit');
    cat.wait = Math.max(cat.wait, 3);
    cat.likeT = 3;
  }

  // ------------------------------------------------------------------ update
  update(dt, camera) {
    const reduced = this.ctx.settings.data.reducedMotion;
    this._m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this._m);
    const player = camera.position;
    for (const cat of this.cats) {
      const root = cat.model.root;
      // Deferred teleports happen when the cat is out of sight.
      if (cat.pending) {
        const seen = this.frustum.containsPoint(root.position.clone().setY(0.2)) && root.position.distanceTo(player) < 12;
        if (!seen) {
          cat.pending();
          cat.pending = null;
        }
      }
      this._behave(cat, dt, player);
      // Look at the player when close (and awake).
      const d = Math.hypot(root.position.x - player.x, root.position.z - player.z);
      cat.model.lookAt = d < 3.2 && cat.state !== 'hidden' ? player : null;
      cat.model.update(dt, reduced);
      // Visibility: only render cats near the player's part of the house.
      root.visible = Math.abs(zoneAt(root.position.z) - this.ctx.playerZone()) <= 1;
    }
    if (this.mode === 'together') this._together(dt);
  }

  _together(dt) {
    this.togetherT += dt;
    if (this.togetherT > 10 && this.cats.every((c) => c.state === 'waitTogether')) {
      this.mode = 'roam';
      this.cats.forEach((c, i) => {
        c.state = 'idle';
        c.wait = 2 + i * 3;
        c.node = this.nearestNode(c.model.root.position.x, c.model.root.position.z, new Set([3]));
        c.zone = 3;
      });
    }
  }

  _behave(cat, dt, player) {
    const m = cat.model;
    const root = m.root;
    if (cat.state === 'hidden') {
      // Positional meows from the hiding spot.
      cat.meowT -= dt;
      if (cat.meowT < 0 && this.ctx.playerZone() === 3) {
        this.ctx.audio.meow(cat.pitch, root.position.clone().setY(0.3), 0.8);
        cat.meowT = 5 + Math.random() * 5;
        m.earTwitch[0] = 1;
      }
      return;
    }
    if (cat.state === 'ending' || cat.state === 'waitTogether') return;
    if (cat.state === 'script') {
      const to = cat.script.points[0];
      if (this._walkTowards(cat, to.x, to.z, dt)) {
        cat.script.points.shift();
        if (!cat.script.points.length) {
          m.walk = 0;
          m.speed = 0;
          m.setPose('sit');
          cat.state = 'turning';
        }
      }
      return;
    }
    if (cat.state === 'turning') {
      const h = cat.script.meet.heading;
      const diff = Math.atan2(Math.sin(h - root.rotation.y), Math.cos(h - root.rotation.y));
      root.rotation.y += diff * Math.min(1, dt * 5);
      if (Math.abs(diff) < 0.02) cat.state = 'waitTogether';
      return;
    }
    if (this.mode !== 'roam') return;

    if (cat.state === 'walk') {
      const next = cat.path[0];
      if (!next) {
        cat.state = 'idle';
        m.walk = 0;
        m.speed = 0;
        const r = Math.random();
        m.setPose(r < 0.45 ? 'sit' : r < 0.75 ? 'sleep' : 'stand');
        cat.wait = m.target.sleep ? 14 + Math.random() * 14 : 5 + Math.random() * 9;
        return;
      }
      const dy = next.y - root.position.y;
      if (Math.abs(dy) > 0.12 || cat.jumping) {
        this._jump(cat, next, dt);
        return;
      }
      if (this._walkTowards(cat, next.x, next.z, dt)) {
        cat.node = next;
        cat.zone = next.zone;
        cat.path.shift();
      }
      return;
    }

    // Idle.
    cat.wait -= dt;
    cat.likeT = Math.max(0, (cat.likeT || 0) - dt);
    const d = Math.hypot(root.position.x - player.x, root.position.z - player.z);
    const tooClose = d < 0.75 && !cat.likeT && root.position.y < 0.1;
    if (tooClose || cat.wait < 0) {
      const target = this._pickTarget(cat, tooClose ? player : null);
      const path = target && cat.node ? this._path(cat.node, target) : null;
      if (path && path.length) {
        cat.path = path;
        cat.state = 'walk';
        m.setPose('stand');
      } else {
        cat.wait = 3 + Math.random() * 4;
      }
    }
  }

  // Returns true on arrival.
  _walkTowards(cat, x, z, dt) {
    const m = cat.model;
    const root = m.root;
    const dx = x - root.position.x;
    const dz = z - root.position.z;
    const dist = Math.hypot(dx, dz);
    // Wait until standing up before walking off.
    if (m.pose.sit > 0.3 || m.pose.sleep > 0.3) {
      m.setPose('stand');
      return false;
    }
    if (dist < 0.05) return true;
    const want = Math.atan2(dx, dz);
    let diff = want - root.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    root.rotation.y += diff * Math.min(1, dt * 6);
    const facing = Math.cos(diff);
    const speed = WALK_SPEED * Math.max(0, facing);
    const step = Math.min(dist, speed * dt);
    root.position.x += (dx / dist) * step;
    root.position.z += (dz / dist) * step;
    m.walk += (1 - m.walk) * Math.min(1, dt * 6);
    m.speed = speed;
    return false;
  }

  _jump(cat, next, dt) {
    const m = cat.model;
    const root = m.root;
    if (!cat.jumping) {
      if (m.pose.sit > 0.3 || m.pose.sleep > 0.3) {
        m.setPose('stand');
        return;
      }
      // Face the target first.
      const want = Math.atan2(next.x - root.position.x, next.z - root.position.z);
      let diff = Math.atan2(Math.sin(want - root.rotation.y), Math.cos(want - root.rotation.y));
      root.rotation.y += diff * Math.min(1, dt * 6);
      if (Math.abs(diff) > 0.15) return;
      cat.jumping = { t: 0, from: root.position.clone(), to: new THREE.Vector3(next.x, next.y, next.z) };
    }
    const j = cat.jumping;
    j.t += dt / 0.55;
    const k = Math.min(1, j.t);
    root.position.lerpVectors(j.from, j.to, k);
    root.position.y += Math.sin(k * Math.PI) * 0.28;
    m.walk = 0.3;
    if (k >= 1) {
      cat.jumping = null;
      cat.node = next;
      cat.zone = next.zone;
      cat.path.shift();
    }
  }
}
