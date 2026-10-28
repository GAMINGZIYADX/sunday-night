import * as THREE from 'three';
import { COLORS, PROMPTS, TOASTS, FINDS } from '../config.js';
import { fill } from '../engine/text.js';
import { mat, mesh, group, rbox, box, cyl, sphere, torus, cone } from '../engine/materials.js';
import { tulip } from '../engine/props.js';
import { makeCanvas, canvasTexture, drawTulip, hex } from '../engine/textures.js';

// Little things to fiddle with that are not puzzles (lamps, the music box,
// the kettle, a window, drawers, a cushion, the cookie jar...) and the five
// optional "little finds". Each helper registers its own interaction and
// animation; none of them is saved except the finds.

const C = COLORS;
const smooth = (k) => k * k * (3 - 2 * k);

// A 0..1 value that eases towards `to`; apply(k) runs while it moves.
function tween(ctx, apply, seconds = 0.45) {
  const s = { v: 0, to: 0 };
  ctx.addUpdate((dt) => {
    if (s.v === s.to) return;
    const step = dt / seconds;
    s.v = s.to > s.v ? Math.min(s.to, s.v + step) : Math.max(s.to, s.v - step);
    apply(smooth(s.v));
  });
  return s;
}

// Marks a find as found (first time only): sparkle, chime and a toast.
export function foundIt(ctx, id, pos) {
  if (!ctx.gs.addFind(id)) return false;
  celebrateFind(ctx, id, pos);
  return true;
}
// The sparkle, chime and toast of a find (already added to the game state).
export function celebrateFind(ctx, id, pos) {
  const f = FINDS.find((x) => x.id === id);
  ctx.audio.sparkle();
  ctx.audio.smallChime(7);
  ctx.particles.burst(pos.clone(), { kind: 'sparkle', count: 16, color: 0xfff0c0, speed: 0.4, size: 0.05, gravity: -0.1, up: 0.5 });
  ctx.hud.toast(fill(TOASTS.found, { NAME: f.name, N: ctx.gs.data.finds.length, TOTAL: FINDS.length }), { ms: 4500 });
  if (ctx.gs.data.finds.length === FINDS.length) setTimeout(() => ctx.hud.toast(TOASTS.allFound, { ms: 5000 }), 1800);
}

// ----------------------------------------------------------------- lamps
// Click a lamp to switch it off and on. Its own glow goes, and the room
// light nearest to it dims.
export function lampSwitch(ctx, room, lamp) {
  const lit = [];
  lamp.traverse((o) => {
    if (o.isMesh && o.material?.emissive && o.material.emissiveIntensity > 0) {
      o.material = o.material.clone(); // lamps share materials; this one switches alone
      lit.push([o.material, o.material.emissiveIntensity]);
    }
  });
  const glows = [];
  lamp.traverse((o) => o.isSprite && glows.push(o));
  let on = true;
  let point; // the rig light it dims (found on first use)
  const set = () => {
    for (const [m, ei] of lit) m.emissiveIntensity = on ? ei : ei * 0.04;
    for (const sp of glows) sp.visible = on;
    if (point === undefined) {
      point = null;
      const rig = ctx.rooms[room]?.rig;
      const at = lamp.getWorldPosition(new THREE.Vector3()).add(lamp.userData.lightPos || new THREE.Vector3());
      let best = 2.6;
      for (const p of rig?.points || []) {
        const d = at.distanceTo(new THREE.Vector3(...p.pos));
        if (d < best) {
          best = d;
          point = p;
        }
      }
    }
    if (point) point.dim = on ? 1 : 0.35;
  };
  ctx.interact.add(lamp, {
    zones: [room],
    highlight: false, // the glow itself shows what happens
    prompt: () => (on ? PROMPTS.lampOff : PROMPTS.lampOn),
    onUse: () => {
      on = !on;
      set();
      ctx.audio.click();
    },
  });
}

// ------------------------------------------------------------ music box
export function musicBox(ctx, room, { pos, rotY = 0, color = C.blush }) {
  const g = group([], { pos, rot: [0, rotY, 0] });
  const wood = mat(color, { rough: 0.55 });
  const trim = mat(C.gold, { metal: 0.6, rough: 0.35 });
  // An open-topped box (four walls and a floor) so the lid can open.
  const W = 0.16;
  const D = 0.11;
  const H = 0.07;
  g.add(mesh(box(W, 0.012, D), wood, { pos: [0, 0.006, 0] }));
  for (const sz of [-1, 1]) g.add(mesh(box(W, H, 0.01), wood, { pos: [0, H / 2, (sz * (D - 0.01)) / 2] }));
  for (const sx of [-1, 1]) g.add(mesh(box(0.01, H, D), wood, { pos: [(sx * (W - 0.01)) / 2, H / 2, 0] }));
  g.add(mesh(box(W + 0.004, 0.008, 0.012), trim, { pos: [0, H * 0.55, D / 2 + 0.002] }));
  // The lid hinges along the back edge.
  const hinge = group([], { pos: [0, H, -D / 2] });
  hinge.add(mesh(rbox(W + 0.006, 0.018, D + 0.006, 0.005), wood, { pos: [0, 0.009, D / 2] }));
  hinge.add(mesh(sphere(0.008, 8, 6), trim, { pos: [0, 0.02, D / 2] }));
  g.add(hinge);
  // A tiny tulip that rises and turns while the tune plays.
  const t = tulip('B', { scale: 0.18 });
  const spin = group([t], { pos: [0, 0.012, 0] });
  g.add(spin);
  const lid = tween(ctx, (k) => {
    hinge.rotation.x = -1.9 * k;
    spin.position.y = 0.012 + 0.035 * k;
  });
  let until = 0;
  ctx.addUpdate((dt, time) => {
    if (time < until) spin.rotation.y += dt * 1.6;
    else if (lid.to === 1 && time >= until) lid.to = 0;
  });
  ctx.interact.add(g, {
    zones: [room],
    prompt: () => (lid.to ? PROMPTS.musicBoxPlaying : PROMPTS.musicBox),
    onUse: () => {
      if (lid.to) return;
      const at = g.getWorldPosition(new THREE.Vector3());
      const len = ctx.audio.musicBox(at) || 9;
      lid.to = 1;
      until = ctx.game.time + len;
      ctx.particles.burst(at.setY(at.y + 0.1), { kind: 'sparkle', count: 6, color: 0xfff0c0, speed: 0.15, size: 0.03, gravity: -0.1 });
    },
  });
  g.userData.prop = 'musicBox';
  return g;
}

// ------------------------------------------------------------------ kettle
export function kettle(ctx, room, { pos, color = C.sage }) {
  const m = mat(color, { rough: 0.35, metal: 0.2 });
  const dark = mat(0x3a3438, { rough: 0.4 });
  const g = group([], { pos });
  g.add(mesh(new THREE.SphereGeometry(0.095, 18, 12).scale(1, 0.78, 1).translate(0, 0.072, 0), m));
  g.add(mesh(cyl(0.07, 0.085, 0.02, 16), m, { pos: [0, 0.01, 0] }));
  g.add(mesh(cyl(0.035, 0.04, 0.02, 12), m, { pos: [0, 0.145, 0] }));
  g.add(mesh(sphere(0.014, 8, 6), dark, { pos: [0, 0.162, 0] }));
  const spout = mesh(cone(0.018, 0.12, 10), m, { pos: [0.1, 0.1, 0], rot: [0, 0, -1.0] });
  g.add(spout);
  g.add(mesh(torus(0.06, 0.01, 6, 16, Math.PI), dark, { pos: [0, 0.15, 0], rot: [0, 0, 0] }));
  const tip = new THREE.Vector3(0.16, 0.14, 0);
  let busy = 0;
  let steam = 0;
  ctx.addUpdate((dt) => {
    if (busy > 0) busy -= dt;
    if (steam > 0) {
      steam -= dt;
      g.userData._puff = (g.userData._puff || 0) - dt;
      if (g.userData._puff <= 0) {
        g.userData._puff = 0.12;
        const p = g.localToWorld(tip.clone());
        ctx.particles.burst(p, { kind: 'sparkle', count: 2, color: 0xffffff, speed: 0.12, size: 0.06, gravity: -0.35, life: 1.2, up: 0.8 });
      }
    }
  });
  ctx.interact.add(g, {
    zones: [room],
    prompt: () => (busy > 0 ? PROMPTS.kettleBusy : PROMPTS.kettle),
    onUse: () => {
      if (busy > 0) return;
      busy = 5.2;
      ctx.audio.click();
      ctx.audio.kettle(g.localToWorld(tip.clone()), 2.2, 2.6);
      setTimeout(() => (steam = 2.8), 2000);
    },
  });
  g.userData.prop = 'kettle';
  return g;
}

// -------------------------------------------------------------- a window
// Opening it lets the night in: crickets and a breeze, and the curtain stirs.
export function openableWindow(ctx, room, win, curtain = null) {
  let open = false;
  const rest = curtain ? curtain.rotation.z : 0;
  ctx.addUpdate((dt, t) => {
    if (curtain) curtain.rotation.z = rest + (open ? Math.sin(t * 1.3) * 0.05 + Math.sin(t * 3.1) * 0.015 : 0);
  });
  ctx.interact.add(win, {
    zones: [room],
    highlight: false,
    prompt: () => (open ? PROMPTS.windowClose : PROMPTS.windowOpen),
    onUse: () => {
      open = !open;
      ctx.audio.slide();
      ctx.audio.outside(open, win.getWorldPosition(new THREE.Vector3()));
    },
  });
  // Leaving the house for the garden closes it quietly (the sound would follow).
  ctx.addUpdate(() => {
    if (open && Math.abs(ctx.playerZone() - room) > 1) {
      open = false;
      ctx.audio.outside(false);
    }
  });
}

// ------------------------------------------------------- a spinning globe
export function spinningGlobe(ctx, room, globe, ball) {
  let v = 0;
  ctx.addUpdate((dt) => {
    if (Math.abs(v) < 0.01) return;
    ball.rotation.y += v * dt;
    v *= Math.exp(-dt * 0.6);
  });
  ctx.interact.add(globe, {
    zones: [room],
    prompt: PROMPTS.globe,
    onUse: () => {
      v += 7;
      ctx.audio.slide();
    },
  });
}

// ------------------------------------------------------------------ finds
// A drawer of a cabinet() that slides out. The cabinet's own drawer front and
// knob (the top drawer by default) move with a tray behind them.
export function openableDrawer(ctx, room, cab, { find = null, findObject = null } = {}) {
  const info = cab.userData.drawers[cab.userData.drawers.length - 1];
  const dr = group([], { pos: [0, 0, 0] });
  cab.add(dr);
  for (const part of [info.front, info.knob]) {
    cab.remove(part);
    dr.add(part);
  }
  // The tray: a floor and three sides, hidden inside the body when closed.
  const { w, d, y, dh } = info;
  const tm = mat(0xe8dcc8, { rough: 0.8 });
  const tw = w - 0.1;
  const td = d - 0.08;
  const th = dh - 0.06;
  const tz = d / 2 - td / 2 - 0.005;
  const ty = y - dh / 2 + 0.035;
  dr.add(mesh(box(tw, 0.008, td), tm, { pos: [0, ty, tz], cast: false }));
  for (const sx of [-1, 1]) dr.add(mesh(box(0.008, th, td), tm, { pos: [(sx * tw) / 2, ty + th / 2, tz], cast: false }));
  dr.add(mesh(box(tw, th, 0.008), tm, { pos: [0, ty + th / 2, tz - td / 2], cast: false }));
  if (findObject) {
    findObject.position.set(0, ty + 0.006, tz + 0.02);
    dr.add(findObject);
  }
  const slide = tween(ctx, (k) => (dr.position.z = 0.28 * k));
  ctx.interact.add(dr, {
    zones: [room],
    prompt: () => (slide.to ? PROMPTS.drawerClose : PROMPTS.drawerOpen),
    onUse: () => {
      slide.to = slide.to ? 0 : 1;
      ctx.audio.slide();
      if (slide.to && find) setTimeout(() => foundIt(ctx, find, (findObject || dr).getWorldPosition(new THREE.Vector3())), 420);
    },
  });
  return dr;
}

// Lift a cushion to see what is underneath (shown only while lifted).
export function liftableCushion(ctx, room, cushionMesh, { find, findObject, lift = [0.16, 0.13, 0], tilt = 0.35 }) {
  const base = cushionMesh.position.clone();
  const rz = cushionMesh.rotation.z;
  findObject.visible = false;
  findObject.userData.dynamic = true; // shown and hidden, so never batched with the room
  const up = tween(ctx, (k) => {
    cushionMesh.position.set(base.x + lift[0] * k, base.y + lift[1] * k, base.z + lift[2] * k);
    cushionMesh.rotation.z = rz + tilt * k;
    findObject.visible = k > 0.15;
  });
  ctx.interact.add(cushionMesh, {
    zones: [room],
    prompt: () => (up.to ? PROMPTS.cushionDown : PROMPTS.cushionLift),
    onUse: () => {
      up.to = up.to ? 0 : 1;
      ctx.audio.soft();
      if (up.to) setTimeout(() => foundIt(ctx, find, findObject.getWorldPosition(new THREE.Vector3())), 380);
    },
  });
}

// A jar whose lid lifts; the find pops out, turns, and goes back in.
export function cookieJar(ctx, room, jarGroup, { find, findObject }) {
  const lidMesh = jarGroup.children[2];
  const lidY = lidMesh.position.y;
  findObject.visible = false;
  const top = lidY;
  const anim = { t: -1 };
  ctx.addUpdate((dt) => {
    if (anim.t < 0) return;
    anim.t += dt;
    const k = anim.t < 0.4 ? smooth(anim.t / 0.4) : anim.t < 2.4 ? 1 : 1 - smooth(Math.min(1, (anim.t - 2.4) / 0.4));
    lidMesh.position.y = lidY + 0.09 * k;
    lidMesh.rotation.z = 0.5 * k;
    findObject.visible = k > 0.05;
    findObject.position.y = top - 0.02 + 0.09 * k;
    findObject.rotation.y += dt * 2.4;
    if (anim.t > 2.8) anim.t = -1;
  });
  ctx.interact.add(jarGroup, {
    zones: [room],
    prompt: PROMPTS.cookieJar,
    onUse: () => {
      if (anim.t >= 0) return;
      anim.t = 0;
      ctx.audio.click();
      setTimeout(() => {
        if (!foundIt(ctx, find, findObject.getWorldPosition(new THREE.Vector3()))) ctx.hud.toast(TOASTS.nothingMore, { ms: 1800 });
      }, 450);
    },
  });
  jarGroup.add(findObject);
}

// A small book lying on a table: the cover opens on a pressed tulip.
export function pressedFlowerBook(ctx, room, { pos, rotY = 0, find }) {
  const g = group([], { pos, rot: [0, rotY, 0] });
  const W = 0.15;
  const D = 0.2;
  const cover = mat(0x5f7f9f, { rough: 0.7 });
  const pages = mat(0xf6efe0, { rough: 0.9 });
  g.add(mesh(box(W, 0.006, D), cover, { pos: [0, 0.003, 0] }));
  g.add(mesh(box(W - 0.01, 0.02, D - 0.01), pages, { pos: [0.002, 0.016, 0] }));
  g.add(mesh(box(0.012, 0.03, D), cover, { pos: [-W / 2, 0.015, 0] }));
  // The pressed tulip on the open page.
  const fc = makeCanvas(128, 160);
  const fg = fc.getContext('2d');
  fg.fillStyle = '#f6efe0';
  fg.fillRect(0, 0, 128, 160);
  fg.save();
  fg.translate(64, 52);
  fg.rotate(0.2);
  drawTulip(fg, 0, 0, 46, hex(C.tulipBlue), { stem: true, leaf: true });
  fg.restore();
  const flower = mesh(new THREE.PlaneGeometry(W - 0.02, D - 0.02), mat(0xffffff, { map: canvasTexture(fc), rough: 0.9 }), {
    pos: [0.002, 0.0265, 0],
    rot: [-Math.PI / 2, 0, 0],
    cast: false,
  });
  g.add(flower);
  // The cover hinges along the spine (left edge).
  const hinge = group([], { pos: [-W / 2, 0.027, 0] });
  hinge.add(mesh(box(W, 0.006, D), cover, { pos: [W / 2, 0.003, 0] }));
  hinge.add(mesh(box(W * 0.5, 0.0015, 0.03), mat(C.gold, { metal: 0.6 }), { pos: [W / 2, 0.0068, 0] }));
  g.add(hinge);
  const open = tween(ctx, (k) => (hinge.rotation.z = Math.PI * 0.97 * k), 0.6);
  ctx.interact.add(g, {
    zones: [room],
    prompt: () => (open.to ? PROMPTS.bookClose : PROMPTS.bookOpen),
    onUse: () => {
      open.to = open.to ? 0 : 1;
      ctx.audio.pageFlip();
      if (open.to) setTimeout(() => foundIt(ctx, find, flower.getWorldPosition(new THREE.Vector3())), 600);
    },
  });
  g.userData.prop = 'book';
  return g;
}

// Sea and a few soft green continents, so a spinning globe looks like one.
let _globeTex = null;
export function globeTexture() {
  if (_globeTex) return _globeTex;
  const c = makeCanvas(256, 128);
  const g = c.getContext('2d');
  g.fillStyle = '#7fb0d8';
  g.fillRect(0, 0, 256, 128);
  g.fillStyle = '#9cc58e';
  for (const [x, y, rx, ry] of [
    [40, 45, 26, 18],
    [55, 80, 14, 22],
    [120, 40, 30, 14],
    [135, 70, 18, 24],
    [190, 50, 34, 20],
    [215, 92, 16, 10],
    [128, 118, 60, 8],
  ]) {
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0.3, 0, Math.PI * 2);
    g.fill();
  }
  _globeTex = canvasTexture(c);
  return _globeTex;
}

// ------------------------------------------------- the little find objects
export function paperStar() {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 ? 0.014 : 0.034;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 1 });
  geo.rotateX(-Math.PI / 2);
  return mesh(geo, mat(0xffe08a, { rough: 0.8, emissive: 0x6b4a10, ei: 0.25 }), { cast: false });
}

export function toyMouse() {
  const grey = mat(0x9a9aa6, { rough: 0.95 });
  const pink = mat(0xf2a6b0, { rough: 0.9 });
  const g = group([
    mesh(new THREE.SphereGeometry(0.035, 12, 8).scale(1, 0.75, 1.5), grey, { pos: [0, 0.026, 0] }),
    mesh(sphere(0.014, 8, 6), pink, { pos: [-0.018, 0.05, 0.03] }),
    mesh(sphere(0.014, 8, 6), pink, { pos: [0.018, 0.05, 0.03] }),
    mesh(sphere(0.006, 6, 4), pink, { pos: [0, 0.028, 0.055] }),
    mesh(torus(0.03, 0.003, 4, 12, Math.PI * 1.2), pink, { pos: [0.02, 0.02, -0.06], rot: [Math.PI / 2, 0, 0.4] }),
  ]);
  return g;
}

export function catCookie() {
  const dough = mat(0xd9a86a, { rough: 0.9 });
  const g = group([
    mesh(cyl(0.032, 0.032, 0.012, 16), dough, { rot: [Math.PI / 2, 0, 0] }),
    mesh(cone(0.012, 0.022, 4), mat(0xa8753e, { rough: 0.9 }), { pos: [-0.02, 0.03, 0], rot: [0, 0, 0.35] }),
    mesh(cone(0.012, 0.022, 4), mat(0xa8753e, { rough: 0.9 }), { pos: [0.02, 0.03, 0], rot: [0, 0, -0.35] }),
    mesh(sphere(0.004, 6, 4), mat(0x3a2a22), { pos: [-0.01, 0.006, 0.007] }),
    mesh(sphere(0.004, 6, 4), mat(0x3a2a22), { pos: [0.01, 0.006, 0.007] }),
  ]);
  return g;
}
