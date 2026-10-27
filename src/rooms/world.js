import { buildBedroom } from './bedroom.js';
import { buildLiving } from './living.js';
import { buildKitchen } from './kitchen.js';
import { buildStudy } from './study.js';
import { buildGarden } from './garden.js';
import { buildClearing } from './clearing.js';
import { buildAttic } from './attic.js';
import { buildGreenhouse } from './greenhouse.js';
import { buildBasement } from './basement.js';
import { buildBalcony } from './balcony.js';
import { buildHunt } from './hunt.js';
import { buildHallway } from './shell.js';
import { mergeStatic } from '../engine/merge.js';
import { ROOMS } from '../engine/layout.js';
import { COLORS } from '../config.js';

// Builds the whole house, garden and clearing (rooms 0-5), the side rooms
// (attic 6, greenhouse 7, basement 8, balcony 9), the treasure hunt's notes,
// and joins the cats' paths through every doorway.
export function buildWorld(ctx) {
  const builders = [
    buildBedroom,
    buildLiving,
    buildKitchen,
    buildStudy,
    buildGarden,
    buildClearing,
    buildAttic,
    buildGreenhouse,
    buildBasement,
    buildBalcony,
  ];
  builders.forEach((b, i) => (ctx.rooms[i] = b(ctx)));
  const hallColors = [COLORS.sage, COLORS.blush, 0xcfd9e8, COLORS.sage];
  hallColors.forEach((wall, i) => buildHallway(ctx, i, { wall }));
  buildHunt(ctx);
  for (let i = 0; i < 5; i++) ctx.cats.addDoor(i, [0, ROOMS[i].zN + 0.65], [0, ROOMS[i + 1].zS - 0.65]);
  // Batch the static scenery of every room into a few draw calls.
  if (!ctx.game.noMerge) for (let i = 0; i < ctx.rooms.length; i++) mergeStatic(ctx.roomGroup(i));
}
