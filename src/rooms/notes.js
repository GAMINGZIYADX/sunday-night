import * as THREE from 'three';
import { mat, mesh, group, cyl, plane } from '../engine/materials.js';
import { paperTexture, HAND_FONT } from '../engine/textures.js';
import { glowSprite } from '../engine/props.js';
import { PROMPTS, WORLD_TEXT } from '../config.js';

// The five handwritten notes. Each is a folded letter with a blue tulip wax
// seal, big enough to notice, and it glows softly (with the odd sparkle) until
// it has been read.
//   mode 'stand': propped up on a surface, leaning back a little
//   mode 'flat':  lying on a surface
//   mode 'wall':  pinned flat against a vertical surface (facing +Z locally)
let _cover = null;
function coverTexture() {
  if (_cover) return _cover;
  _cover = paperTexture(WORLD_TEXT.noteCover, { w: 256, h: 320, size: 34, lines: false, font: HAND_FONT, center: true, stain: false });
  return _cover;
}

export function placeNote(ctx, room, index, { pos, rotY = 0, mode = 'stand', w = 0.19, h = 0.24 }) {
  const root = group([], { pos, rot: [0, rotY, 0] });
  const sheet = group();
  const paperMat = mat(0xffffff, { map: coverTexture(), side: THREE.DoubleSide, rough: 0.9 });
  const paper = mesh(plane(w, h), paperMat, { cast: false });
  const back = mesh(plane(w * 0.98, h * 0.98), mat(0xf1e6d2, { side: THREE.DoubleSide }), { pos: [0, 0, -0.002], cast: false });
  const seal = group(
    [
      mesh(cyl(0.024, 0.026, 0.008, 16), mat(0x5b84cf, { rough: 0.35 }), { rot: [Math.PI / 2, 0, 0], cast: false }),
      mesh(cyl(0.012, 0.012, 0.004, 3), mat(0x9fc0ff, { rough: 0.3 }), { pos: [0, 0.002, 0.005], rot: [Math.PI / 2, 0, 0], cast: false }),
    ],
    { pos: [0, -h * 0.28, 0.005] },
  );
  sheet.add(paper, back, seal);
  if (mode === 'stand') {
    // Pivot at the bottom edge, leaning back about 20 degrees.
    paper.position.y = back.position.y = h / 2;
    seal.position.y = h * 0.22;
    sheet.rotation.x = -0.35;
    sheet.position.y = 0.002;
  } else if (mode === 'flat') {
    sheet.rotation.x = -Math.PI / 2;
    sheet.position.y = 0.004;
  } else {
    sheet.position.z = 0.004;
  }
  root.add(sheet);
  const glow = glowSprite(0xfff0c8, 0.55, 0.0);
  glow.position.set(0, mode === 'stand' ? h * 0.6 : mode === 'flat' ? 0.06 : 0, mode === 'wall' ? 0.06 : 0);
  glow.userData.dynamic = true;
  root.add(glow);
  ctx.roomGroup(room).add(root);
  ctx.interact.add(root, { zones: [room], prompt: PROMPTS.readNote, onUse: () => ctx.showNote(index) });

  let sparkleT = 1 + Math.random() * 2;
  const world = new THREE.Vector3();
  ctx.addUpdate((dt, t) => {
    const unread = !ctx.gs.data.notes.includes(index);
    glow.material.opacity = unread ? 0.35 + Math.sin(t * 2.4 + index) * 0.15 : 0;
    if (!unread || ctx.playerZone() !== room) return;
    sparkleT -= dt;
    if (sparkleT < 0) {
      sparkleT = 2.2 + Math.random() * 1.5;
      glow.getWorldPosition(world);
      ctx.particles.burst(world, { count: 3, color: 0xfff6d8, speed: 0.15, life: 1.2, size: 0.035, gravity: 0.05, up: 1 });
    }
  });
  return root;
}
