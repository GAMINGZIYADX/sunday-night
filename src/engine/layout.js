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

export function zoneAt(z) {
  let zone = 0;
  for (const b of ZONE_BOUNDS) if (z < b) zone++;
  return zone;
}

export function inHallway(z) {
  for (let i = 0; i < 5; i++) if (z < ROOMS[i].zN && z > ROOMS[i + 1].zS) return i;
  return -1;
}
