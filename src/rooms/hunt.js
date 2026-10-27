import * as THREE from 'three';
import { CLUES, HUNT_COUPON, HUNT_TEXT, HUNT_RIDDLES, PROMPTS, TOASTS } from '../config.js';
import { mat, mesh, group, box } from '../engine/materials.js';
import { glowSprite, hitArea } from '../engine/props.js';
import { HUNT_SPOT_IDS } from '../engine/hunt.js';
import { ROOMS, ATTIC, GREENHOUSE, BASEMENT, BALCONY } from '../engine/layout.js';

const BOUNDS = [...ROOMS, ATTIC, GREENHOUSE, BASEMENT, BALCONY];
import { fill } from '../engine/text.js';
import { couponOverlay } from '../ui/overlays.js';

// The treasure hunt's notes (see engine/hunt.js for how the spots are
// picked). After the letter, a folded note waits by the envelope; each note
// sits by a puzzle around the house and says where the next one is; the
// last spot has an envelope with the coupon. Only the note to find next is
// out. Its text is kept as the 'hunt' clue, so the journal can show it again.

function foldedNote() {
  const paper = mat(0xfbf3e4, { rough: 0.9 });
  return group([
    mesh(box(0.12, 0.002, 0.08), paper, { pos: [-0.028, 0.012, 0], rot: [0, 0, 0.35], cast: false }),
    mesh(box(0.12, 0.002, 0.08), paper, { pos: [0.028, 0.012, 0], rot: [0, 0, -0.35], cast: false }),
  ]);
}
function envelope() {
  return group([
    mesh(box(0.2, 0.01, 0.14), mat(0xf3e3c9, { rough: 0.85 }), { pos: [0, 0.005, 0], cast: false }),
    mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.004, 16), mat(0xc4706c), { pos: [0, 0.012, 0.01], cast: false }),
  ]);
}

export function buildHunt(ctx) {
  const gs = ctx.gs;
  CLUES.hunt = { title: HUNT_TEXT.startTitle, text: '' };
  CLUES.coupon = { title: HUNT_COUPON.title, text: HUNT_COUPON.text };
  // The clue after `k` notes found (k = 0: the note by the envelope).
  const write = (k) => {
    const spots = gs.data.hunt.spots;
    const last = k === spots.length - 1;
    CLUES.hunt.title = k === 0 ? HUNT_TEXT.startTitle : fill(HUNT_TEXT.noteTitle, { N: k });
    CLUES.hunt.text = fill(k === 0 ? HUNT_TEXT.start : last ? HUNT_TEXT.lastNote : HUNT_TEXT.note, { RIDDLE: HUNT_RIDDLES[spots[k]] || '' });
  };
  const show = () => {
    write(Math.min(gs.data.hunt.found, gs.data.hunt.spots.length - 1));
    ctx.showClue('hunt');
  };

  // A note (or the coupon's envelope) by every spot: on the floor, about a
  // step in front of its puzzle (towards the middle of the room), where the
  // puzzle's own click area does not reach.
  const items = [];
  ctx.game.huntNotes = {};
  const place = (holder, room, at) => {
    const cz = BOUNDS[room]?.cz ?? at.z;
    const toMid = new THREE.Vector3(-at.x, 0, cz - at.z);
    if (toMid.lengthSq() > 0.01) toMid.normalize().multiplyScalar(1.0);
    holder.position.set(at.x + toMid.x, 0.005, at.z + toMid.z);
    ctx.roomGroup(room).add(holder);
  };
  for (const id of HUNT_SPOT_IDS) {
    const p = gs.puzzles[id];
    const at = ctx.rooms[p.room]?.anchors?.[id];
    if (!at) continue;
    const note = foldedNote();
    const env = envelope();
    const glow = glowSprite(0xffe9b0, 0.55, 0.6);
    glow.position.y = 0.1;
    const hit = hitArea(0.4, 0.3, 0.4);
    hit.position.y = 0.12;
    const holder = group([note, env, glow, hit]);
    holder.userData.dynamic = true;
    place(holder, p.room, at);
    ctx.interact.add(holder, {
      zones: [p.room],
      enabled: () => gs.huntNext() === id,
      prompt: () => (isLast(id) ? PROMPTS.huntCoupon : PROMPTS.huntNote),
      onUse: () => {
        if (!gs.findHuntNote(id)) return;
        ctx.audio.sparkle();
        refresh();
        if (gs.huntDone()) {
          gs.readClue('coupon');
          couponOverlay(ctx.game);
        } else {
          ctx.hud.toast(TOASTS.huntFound, { ms: 1800 });
          show();
        }
      },
    });
    items.push({ id, holder, note, env });
    ctx.game.huntNotes[id] = holder;
  }
  const isLast = (id) => {
    const s = gs.data.hunt.spots;
    return s[s.length - 1] === id;
  };

  // The first note, tucked by the envelope in the clearing.
  const clearing = ctx.rooms[5];
  const start = group([foldedNote(), glowSprite(0xffe9b0, 0.45, 0.5), hitArea(0.25, 0.2, 0.25)]);
  start.userData.dynamic = true;
  const c = clearing.center;
  start.position.set(c.x + 0.3, 0.36, c.z + 1.12);
  ctx.roomGroup(5).add(start);
  ctx.interact.add(start, {
    zones: [5],
    enabled: () => gs.huntOpen() && !gs.huntDone(),
    prompt: PROMPTS.huntNote,
    onUse: () => {
      ctx.audio.pageFlip();
      write(0);
      ctx.showClue('hunt');
    },
  });

  // Only the note to find next is out; checked whenever progress changes.
  let sig = '';
  const refresh = () => {
    const next = gs.huntNext();
    for (const it of items) {
      const on = next === it.id;
      it.holder.visible = on;
      it.note.visible = !isLast(it.id);
      it.env.visible = isLast(it.id);
    }
    start.visible = gs.huntOpen() && !gs.huntDone();
    CLUES.coupon.text = HUNT_COUPON.text;
    write(Math.min(gs.data.hunt.found, Math.max(0, gs.data.hunt.spots.length - 1)));
  };
  ctx.addUpdate(() => {
    const s = `${gs.huntOpen()}|${gs.data.hunt.found}|${gs.data.hunt.spots.join()}`;
    if (s !== sig) {
      sig = s;
      refresh();
    }
  });
  refresh();
}
