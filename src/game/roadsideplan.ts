// Numbers for the roadside plots beside the Legon Road cutting (the owner's 30-pair reconstruction brief; roadside.ts
// draws them). Pure data: the earth tracks are read by science.ts (offAsphalt, onEarth) as well as by the models.

/** the service road west of the cutting (J.J. Rawlings Avenue's west carriageway north of the interchange): x at z */
const WEST_ROAD: [number, number][] = [[162, 764], [302, 790], [360, 800], [401, 808], [551, 840]];
export const westRoadX = (z: number) => {
  for (let i = 0; i < WEST_ROAD.length - 1; i++) {
    const [z0, x0] = WEST_ROAD[i], [z1, x1] = WEST_ROAD[i + 1];
    if (z <= z1) return x0 + ((x1 - x0) * Math.max(0, z - z0)) / (z1 - z0);
  }
  return WEST_ROAD[WEST_ROAD.length - 1][1];
};
/** the planted strip between the boundary wall and that road (pairs 9-12, Map B): its paths are trodden red earth, not
 *  paved; the paved footway along the road (about 10 m in from it) stays paved */
export const WEST_STRIP = { z0: 150, z1: 475, x0: 718, inset: 14 };
export const inWestStrip = (x: number, z: number) => z > WEST_STRIP.z0 && z < WEST_STRIP.z1 && x > WEST_STRIP.x0 && x < westRoadX(z) - WEST_STRIP.inset;

/** the pale boundary wall along the strip's west side (pairs 11, 12), beside the path that follows it; open where the
 *  path west to the houses passes through (z 401-407.5) */
export const STRIP_WALL: [number, number][][] = [
  [[721.0, 340], [722.6, 372], [723.6, 395], [723.8, 401]],
  [[724.0, 407.5], [724.0, 417], [724.6, 435], [727.3, 444], [730.3, 461], [731.0, 470]],
];
