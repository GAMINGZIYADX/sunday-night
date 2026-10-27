// House layout. The rooms run in a line towards -Z, joined by short hallways.
// Each room's door is in its north wall (zN) at x = 0.
export const WALL_H = 2.8;
export const WALL_T = 0.2;
export const DOOR_W = 1.1;
export const DOOR_H = 2.15;
export const HALL_W = 1.7;
export const PLAYER_R = 0.26;
export const EYE_H = 1.58;

export const ROOMS = [
  { id: 'bedroom', w: 7, zS: 3.5, zN: -3.5 },
  { id: 'living', w: 8.4, zS: -5.5, zN: -13.5 },
  { id: 'kitchen', w: 7, zS: -15.5, zN: -22.5 },
  { id: 'study', w: 8.4, zS: -24.5, zN: -32.5 },
  { id: 'garden', w: 12, zS: -34.5, zN: -46.5, outdoor: true },
  { id: 'clearing', w: 12, zS: -48.5, zN: -59, outdoor: true },
];
for (const r of ROOMS) {
  r.x0 = -r.w / 2;
  r.x1 = r.w / 2;
  r.cz = (r.zS + r.zN) / 2;
  r.d = r.zS - r.zN;
}

// Zone boundaries sit in the middle of each hallway.
export const ZONE_BOUNDS = [0, 1, 2, 3, 4].map((i) => (ROOMS[i].zN + ROOMS[i + 1].zS) / 2);

// The attic is built apart from the house, well south of the bedroom where no
// window looks: the ladder in the bedroom ceiling fades you up into it. Under a
// pitched roof: the ridge runs along Z at x = 0, the roof comes down to short
// knee walls at x0 / x1.
export const ATTIC_ZONE = 6;
export const ATTIC = { id: 'attic', w: 6.4, zS: 25, zN: 18, ridge: 3.0, knee: 0.9 };
ATTIC.x0 = -ATTIC.w / 2;
ATTIC.x1 = ATTIC.w / 2;
ATTIC.cz = (ATTIC.zS + ATTIC.zN) / 2;
ATTIC.d = ATTIC.zS - ATTIC.zN;
// The hatch in the bedroom ceiling (the ladder unfolds from its south edge
// down to the floor), and the opening it comes up through in the attic floor.
export const HATCH = { x0: 1.25, x1: 1.95, z0: -2.25, z1: -1.25 };
export const ATTIC_HOLE = { x0: 0.55, x1: 1.25, z0: 23.6, z1: 24.6 };
// Roof height above the floor at a given x.
export const atticRoofY = (x) => ATTIC.ridge - ((ATTIC.ridge - ATTIC.knee) * Math.abs(x)) / ATTIC.x1;

// The other optional side rooms stand apart like the attic, further south,
// each reached by a short fade (game.travel): the greenhouse through a glass
// door in the garden, the basement down a hatch in the kitchen floor, the
// balcony through the glass doors in the study.
export const GREENHOUSE_ZONE = 7;
export const BASEMENT_ZONE = 8;
export const BALCONY_ZONE = 9;
const sideRoom = (r) => Object.assign(r, { x0: -r.w / 2, x1: r.w / 2, cz: (r.zS + r.zN) / 2, d: r.zS - r.zN });
export const GREENHOUSE = sideRoom({ id: 'greenhouse', w: 7, zS: 38, zN: 31, h: 3.2 });
export const BASEMENT = sideRoom({ id: 'basement', w: 7, zS: 50, zN: 43, h: 2.4 });
export const BALCONY = sideRoom({ id: 'balcony', w: 6, zS: 61, zN: 56 });
export const SIDE_ZONES = [ATTIC_ZONE, GREENHOUSE_ZONE, BASEMENT_ZONE, BALCONY_ZONE];
// The ways in: the greenhouse door in the garden's west wall, the cellar
// hatch in the kitchen floor (south-west corner), the balcony doors in the
// study's east wall.
export const GREENHOUSE_DOOR_Z = -40.0;
export const CELLAR_HATCH = { x0: -3.05, x1: -2.25, z0: -17.4, z1: -16.6 };
export const BALCONY_DOOR_Z = -30.6;
export const isSideZone = (zone) => zone >= ATTIC_ZONE;
// Where each side room starts (z), south of the bedroom.
const SIDE_FROM = [
  [52.5, BALCONY_ZONE],
  [40.5, BASEMENT_ZONE],
  [28, GREENHOUSE_ZONE],
  [12, ATTIC_ZONE],
];

export function zoneAt(z) {
  for (const [from, zone] of SIDE_FROM) if (z > from) return zone;
  let zone = 0;
  for (const b of ZONE_BOUNDS) if (z < b) zone++;
  return zone;
}

export function inHallway(z) {
  for (let i = 0; i < 5; i++) if (z < ROOMS[i].zN && z > ROOMS[i + 1].zS) return i;
  return -1;
}
