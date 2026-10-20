import { buildBedroom } from './bedroom.js';
import { buildLiving } from './living.js';
import { buildKitchen } from './kitchen.js';
import { buildStudy } from './study.js';
import { buildGarden } from './garden.js';
import { buildClearing } from './clearing.js';
import { buildHallway } from './shell.js';
import { mergeStatic } from '../engine/merge.js';
import { ROOMS } from '../engine/layout.js';
import { COLORS } from '../config.js';

// Builds the whole house, garden and clearing, and joins the cats' paths
// through every doorway.
export function buildWorld(ctx) {
  const builders = [buildBedroom, buildLiving, buildKitchen, buildStudy, buildGarden, buildClearing];
  builders.forEach((b, i) => (ctx.rooms[i] = b(ctx)));
  const hallColors = [COLORS.sage, COLORS.blush, 0xcfd9e8, COLORS.sage];
  hallColors.forEach((wall, i) => buildHallway(ctx, i, { wall }));
  for (let i = 0; i < 5; i++) ctx.cats.addDoor(i, [0, ROOMS[i].zN + 0.65], [0, ROOMS[i + 1].zS - 0.65]);
  // Batch the static scenery of every room into a few draw calls.
  for (let i = 0; i < ctx.rooms.length; i++) mergeStatic(ctx.roomGroup(i));
}
