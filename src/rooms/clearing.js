import * as THREE from 'three';
import { ENVELOPE_LETTER } from '../config.js';
import { mat, mesh, group, rbox, plane } from '../engine/materials.js';
import { grass, canvasTexture, makeCanvas, rr, rand, HAND_FONT } from '../engine/textures.js';
import { glowSprite, stone, bush } from '../engine/props.js';
import { tulipField, lantern } from './garden.js';
import { ROOMS } from '../engine/layout.js';
import { PROMPTS } from '../config.js';

// The ending clearing beyond the gate: a ring of glowing tulips, the two
// cats with their tails curled into a heart, and the sealed envelope.
export function buildClearing(ctx) {
  const ZONE = 5;
  const R = ROOMS[ZONE];
  const gR = ROOMS[4];
  const g = ctx.roomGroup(ZONE);
  const col = ctx.collision;
  const center = new THREE.Vector3(0, 0, -53.8);
  const RAD = 4.9;

  // Ground.
  const ground = mesh(new THREE.CircleGeometry(RAD + 1.5, 48), mat(0xffffff, { map: grass([5, 5]), rough: 1 }), {
    rot: [-Math.PI / 2, 0, 0],
    pos: [center.x, 0, center.z],
    cast: false,
  });
  g.add(ground);
  const pathGround = mesh(new THREE.PlaneGeometry(2.2, 3.2), mat(0xffffff, { map: grass([1, 2]), rough: 1 }), {
    rot: [-Math.PI / 2, 0, 0],
    pos: [0, 0.001, gR.zN - 1.5],
    cast: false,
  });
  g.add(pathGround);
  // (The sky dome belongs to the garden group, which stays visible from here.)

  // Hedge ring with an opening to the south, and a short hedge corridor.
  const hedgeTex = makeCanvas(256, 256);
  const hx = hedgeTex.getContext('2d');
  hx.fillStyle = '#3f5f40';
  hx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1600; i++) {
    hx.fillStyle = new THREE.Color(0x4f774c).offsetHSL(rr(-0.03, 0.03), rr(-0.1, 0.1), rr(-0.12, 0.1)).getStyle();
    hx.beginPath();
    hx.ellipse(rr(0, 256), rr(0, 256), rr(3, 8), rr(2, 5), rr(0, 3), 0, Math.PI * 2);
    hx.fill();
  }
  const hedgeMat = mat(0xffffff, { map: canvasTexture(hedgeTex, { repeat: [10, 1.5] }), side: THREE.DoubleSide, rough: 1 });
  const opening = 0.36; // radians either side of +Z
  // CylinderGeometry theta 0 points to +Z; leave a gap around it.
  const ring = mesh(new THREE.CylinderGeometry(RAD, RAD, 2.6, 64, 1, true, opening, Math.PI * 2 - opening * 2), hedgeMat, {
    pos: [center.x, 1.3, center.z],
    cast: false,
  });
  g.add(ring);
  const ringOuter = mesh(new THREE.CylinderGeometry(RAD + 0.5, RAD + 0.5, 2.7, 64, 1, true, opening * 0.8, Math.PI * 2 - opening * 1.6), hedgeMat, {
    pos: [center.x, 1.35, center.z],
    cast: false,
  });
  g.add(ringOuter);
  // Colliders: small squares round the ring (none across the opening).
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    if (a < opening + 0.05 || a > Math.PI * 2 - opening - 0.05) continue;
    const x = center.x + Math.sin(a) * (RAD + 0.15);
    const z = center.z + Math.cos(a) * (RAD + 0.15);
    col.addCentered(x, z, 0.7, 0.7, 'hedge');
  }
  // Corridor from the gate into the ring.
  const corrZ0 = gR.zN - 0.2;
  const ringSouth = center.z + RAD * Math.cos(opening);
  const gapHalf = RAD * Math.sin(opening);
  for (const sx of [-1, 1]) {
    const len = corrZ0 - ringSouth + 0.6;
    const wall = mesh(new THREE.BoxGeometry(0.6, 2.5, len), mat(0xffffff, { map: canvasTexture(hedgeTex, { repeat: [len / 2, 1.2] }), rough: 1 }), {
      pos: [sx * (gapHalf + 0.3), 1.25, corrZ0 - len / 2],
      cast: false,
    });
    g.add(wall);
    col.add(sx * gapHalf, corrZ0 - len, sx * (gapHalf + 0.6), corrZ0, 'hedge');
  }
  // The whole area is boxed in as well, so nothing can wander off.
  col.add(R.x0 - 1, R.zN - 1, R.x1 + 1, R.zN, 'bound');
  // Bushes around for softness.
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + 0.12;
    if (a < opening + 0.15 || a > Math.PI * 2 - opening - 0.15) continue;
    const b = bush({ r: 0.55, color: 0x46684a });
    b.position.set(center.x + Math.sin(a) * (RAD - 0.35), 0, center.z + Math.cos(a) * (RAD - 0.35));
    g.add(b);
  }
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    if (a < opening + 0.15 || a > Math.PI * 2 - opening - 0.15) continue;
    col.addCentered(center.x + Math.sin(a) * (RAD - 0.35), center.z + Math.cos(a) * (RAD - 0.35), 0.5, 0.5, 'bush');
  }

  // Circle of glowing tulips (three rows), open towards the entrance.
  const tulips = [];
  for (let row = 0; row < 3; row++) {
    const r = 2.6 + row * 0.28;
    const n = Math.floor((Math.PI * 2 * r) / 0.22);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + row * 0.07;
      if (a < 0.32 || a > Math.PI * 2 - 0.32) continue; // gap for walking in
      tulips.push([center.x + Math.sin(a) * r, center.z + Math.cos(a) * r, (i + row) % 2 ? 'B' : 'W']);
    }
  }
  const field = tulipField(g, tulips, { glow: 0.85, scale: 1.25 });
  // A few loose tulips and lanterns.
  for (const [x, z] of [
    [-2.0, -50.0],
    [2.0, -50.0],
  ]) {
    const l = lantern();
    l.position.set(x, 0, z);
    g.add(l);
    col.addCentered(x, z, 0.2, 0.2);
  }

  // Fireflies.
  const flies = [];
  for (let i = 0; i < 22; i++) {
    const f = glowSprite(0xfff0a0, 0.12, 0.8);
    f.userData.seed = rand() * 100;
    f.userData.base = new THREE.Vector3(center.x + rr(-3.5, 3.5), rr(0.4, 2.0), center.z + rr(-3.5, 3.5));
    g.add(f);
    flies.push(f);
  }

  // ----------------------------------------------- the stone + envelope
  const st = stone({ r: 0.3, color: 0x7d766f, flat: 0.75 });
  st.position.set(center.x, 0.12, center.z + 1.0);
  g.add(st);
  col.addCentered(center.x, center.z + 0.85, 0.75, 1.0);
  const envTex = makeCanvas(256, 170);
  const ex = envTex.getContext('2d');
  ex.fillStyle = '#f3e3c9';
  ex.fillRect(0, 0, 256, 170);
  ex.strokeStyle = 'rgba(150,120,90,0.4)';
  ex.lineWidth = 3;
  ex.beginPath();
  ex.moveTo(0, 0);
  ex.lineTo(128, 96);
  ex.lineTo(256, 0);
  ex.stroke();
  ex.fillStyle = '#c4706c';
  ex.beginPath();
  ex.arc(128, 96, 26, 0, Math.PI * 2);
  ex.fill();
  ex.fillStyle = '#fff6ec';
  ex.font = `bold 34px ${HAND_FONT}`;
  ex.textAlign = 'center';
  ex.textBaseline = 'middle';
  ex.fillText(ENVELOPE_LETTER, 128, 98);
  const envelope = group(
    [
      mesh(rbox(0.3, 0.012, 0.2, 0.004), mat(0xf3e3c9), {}),
      mesh(plane(0.3, 0.2), mat(0xffffff, { map: canvasTexture(envTex) }), { rot: [-Math.PI / 2, 0, 0], pos: [0, 0.007, 0], cast: false }),
    ],
    { pos: [center.x, 0.355, center.z + 0.98], rot: [0, 0.15, 0] },
  );
  g.add(envelope);
  const envGlow = glowSprite(0xffe2b0, 0.9, 0.5);
  envGlow.position.set(center.x, 0.45, center.z + 0.98);
  g.add(envGlow);
  ctx.interact.add(envelope, {
    zones: [ZONE],
    prompt: () => (ctx.gs.data.finished ? PROMPTS.envelopeAgain : PROMPTS.envelope),
    onUse: () => ctx.game.playEnding(),
  });

  // ------------------------------------------ cats + their heart of tails
  // The cats sit with their backs to the entrance, looking at the moon, so the
  // heart their tails make faces her as she walks in.
  const heartZ = center.z + 0.27;
  const heartY0 = 0.1;
  const S = 0.019;
  const heartPoint = (t) => {
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return new THREE.Vector3(center.x + x * S, heartY0 + (y + 17) * S, heartZ);
  };
  // Left cat traces the left half (bottom tip -> top dip), right cat the right.
  const leftTail = (s) => heartPoint(Math.PI + s * Math.PI * 0.98);
  const rightTail = (s) => heartPoint(Math.PI - s * Math.PI * 0.98);
  ctx.cats.endingSpots = {
    tchobin: { pos: new THREE.Vector3(center.x - 0.11, 0, center.z - 0.04), heading: Math.PI - 0.08, tail: leftTail },
    zizo: { pos: new THREE.Vector3(center.x + 0.11, 0, center.z - 0.04), heading: Math.PI + 0.08, tail: rightTail },
  };
  ctx.cats.addZone(ZONE, [
    [0, center.z + 2.2],
    [-1.6, center.z + 0.6],
    [1.6, center.z + 0.4],
    [-1.2, center.z - 1.4, 0, 1],
    [1.3, center.z - 1.6, 0, 2],
    [0, center.z - 1.8, 0, 3],
  ]);
  const heartGlow = glowSprite(0xffb0c0, 1.2, 0);
  heartGlow.position.set(center.x, heartY0 + 0.33, heartZ + 0.03);
  g.add(heartGlow);

  let morph = 0;
  ctx.addUpdate((dt, t) => {
    const k = 0.75 + Math.sin(t * 0.9) * 0.15;
    field.bMesh.material.emissiveIntensity = k;
    field.wMesh.material.emissiveIntensity = k * 0.8;
    envGlow.material.opacity = 0.35 + Math.sin(t * 2.2) * 0.15;
    flies.forEach((f) => {
      const s = f.userData.seed;
      f.position.set(
        f.userData.base.x + Math.sin(t * 0.4 + s) * 0.6,
        f.userData.base.y + Math.sin(t * 0.7 + s * 2) * 0.3,
        f.userData.base.z + Math.cos(t * 0.3 + s) * 0.6,
      );
      f.material.opacity = 0.4 + Math.sin(t * 3 + s) * 0.4;
    });
    // Tails curl into a heart once she is near (and stay that way).
    const cats = ctx.cats;
    const posing = cats.mode === 'ending';
    const near = ctx.playerZone() === ZONE && ctx.playerPos().distanceTo(new THREE.Vector3(center.x, 1.5, center.z)) < 5.2;
    const target = posing && (near || morph > 0.01) ? 1 : 0;
    const speed = ctx.settings.data.reducedMotion ? 1 : 0.33;
    morph += Math.sign(target - morph) * Math.min(Math.abs(target - morph), dt * speed);
    for (const c of cats.cats) c.model.tailHeart = posing ? morph : Math.max(0, c.model.tailHeart - dt * 0.5);
    heartGlow.material.opacity = morph > 0.95 ? 0.35 + Math.sin(t * 2) * 0.1 : 0;
  });

  return {
    index: ZONE,
    rig: {
      hemi: { sky: 0x7c88cc, ground: 0x2b3a2c, intensity: 0.85 },
      spot: { pos: [1.5, 10, center.z + 2], target: [center.x, 0, center.z], color: 0xd8dcff, intensity: 200, angle: 0.62, penumbra: 0.6, far: 30 },
      points: [
        { pos: [center.x, 0.8, center.z], color: 0xb8ccff, intensity: 4 },
        { pos: [center.x, 1.6, center.z + 1.4], color: 0xffd8a8, intensity: 1.6 },
        { pos: [0, 2.0, gR.zN - 1.2], color: 0xffc870, intensity: 2 },
      ],
      fog: { color: 0x151a36, near: 12, far: 36 },
      background: 0x0e1230,
    },
    anchors: {},
    applyState() {
      morph = ctx.gs.data.finished ? 0 : morph;
    },
    center,
  };
}
