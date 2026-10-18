// The owner's Commonwealth west tennis court brief (Commonwealth_West_Tennis_Court_Detailed_Claude_Brief.pdf: Pictures
// 1-7, video frames of one hard court; Picture 8, the red-soil courts; Pictures 9-11, the game as it was; Picture 12, the
// circled aerial; docs/tennis-west/evidence-audit.md): the numbers tennis.ts models and relief.ts cuts. The owner calls
// it the TBC; the aerial's map label reads LEGON TENNIS CLUB (LTC); no sign was seen, so none is modelled. Working name:
// the Commonwealth west tennis complex. Game metres, x east, z south.
//
// The footprint is the map's two pitches (osm): the hard court's enclosure on the west one, the two red-soil courts on
// the east one; Picture 12 (registered on the hard court's enclosure, 2.69 px/m) shows the red-soil ground running on
// about 16 m further east to the tree belt, with a line at the courts' edge. The floor is one level terrace cut into the
// hill's slope (its edges set on the half metre, within 0.2 m of the mapped outlines, so that the ground grid's
// vertices fall on them), held by stone retaining walls whose exposed height steps along each side (Pictures 1, 4, 7: about 0.6 to
// 1.6 m, higher at corners, lower along the side runs). Heights, the floor's level and the walls' steps are read from the
// photographs against a player's height (about 1.8 m), not measured; every one is a number here to adjust. No gate,
// stair, ramp or drain is shown by the pictures: none is modelled (the fence closes the complex; access is an open
// question for the owner).
// (No imports: relief.ts reads the terrace from here.)

export type P2 = [number, number];
export type Box = [number, number, number, number];

export const TC = {
  /** the complex's floor (the shared terrace): the hard court's enclosure west, the red-soil ground east */
  x0: -638.5, x1: -570.5, z0: -90.5, z1: -55.5,
  /** the hard court's enclosure (osm pitch), the red-soil ground's two courts (osm pitch) and its east strip */
  hard: [-638.5, -622.5, -90.5, -55.5] as Box,
  red: [-622.5, -570.5, -90.5, -55.5] as Box,
  redCourts: [-622.5, -587.0] as [number, number],
  /** the floor's height (game metres, the hill's own scale): about the natural ground along the north edge */
  floor: 6.2,
  /** the walls' exposed height above the floor, stepping along each side: [from, height] runs (x along the north and south
   *  sides from west to east, z along the west and east sides from north to south) */
  walls: {
    north: [[-638.5, 0.9], [-626.0, 0.7], [-605.0, 0.6], [-584.0, 0.75]] as P2[],
    south: [[-638.5, 1.6], [-634.0, 1.3], [-618.0, 1.4], [-600.0, 1.2], [-586.0, 1.35], [-575.0, 1.55]] as P2[],
    west: [[-90.5, 0.9], [-80.0, 1.1], [-68.0, 1.3], [-60.5, 1.6]] as P2[],
    east: [[-90.5, 0.75], [-78.0, 0.9], [-66.0, 1.2], [-60.5, 1.5]] as P2[],
  },
  /** how far out the ground behind each side eases back to the hill's own slope (north, south, west, east) */
  band: { n: 10, s: 14, w: 10, e: 10 },
  /** the wall's thickness out from the floor's edge (the ground steps up over it, under the stones) */
  wall: 0.5,
  /** the fence: posts just inside the wall's face, every `bay` m, `h` above the floor */
  fence: { inset: 0.18, bay: 3.0, h: 3.4 },
  /** a tennis court: doubles 10.97 by 23.77, singles 8.23, service line 6.40 from the net, net posts 0.914 outside the
   *  doubles lines, the net 1.07 high at the posts and 0.914 in the middle (the game's rules, not a survey of these) */
  court: { len: 23.77, dbl: 10.97, sgl: 8.23, svc: 6.4, post: 0.914, hPost: 1.07, hMid: 0.914 },
  /** the tall slender lattice mast and the elevated chair-like frame by the red-soil courts (Picture 8, left edge): their
   *  side and spot are estimated, their purpose not established (no lamp heads, wires or seats added) */
  mast: [-621.9, -69.0] as P2, chair: [-621.5, -73.0] as P2,
};

/** the courts' centres: the hard court, the two red-soil courts (the long axes north-south; one net each, at z of the
 *  centre) */
export const COURTS: { x: number; z: number; red: boolean }[] = [
  { x: (TC.hard[0] + TC.hard[1]) / 2, z: (TC.z0 + TC.z1) / 2, red: false },
  { x: TC.redCourts[0] + (TC.redCourts[1] - TC.redCourts[0]) / 4, z: (TC.z0 + TC.z1) / 2, red: true },
  { x: TC.redCourts[0] + ((TC.redCourts[1] - TC.redCourts[0]) * 3) / 4, z: (TC.z0 + TC.z1) / 2, red: true },
];

const stepAt = (runs: P2[], u: number) => { let h = runs[0][1]; for (const [a, v] of runs) if (u >= a) h = v; return h; };
/** the wall's exposed height at a point of the floor's edge (the side nearest) */
export function wallHeight(side: 'north' | 'south' | 'west' | 'east', u: number) { return stepAt(TC.walls[side], u); }

/** the box the terrace and the ground easing back from it cover */
export const TC_BOX: Box = [TC.x0 - TC.band.w - 1, TC.x1 + TC.band.e + 1, TC.z0 - TC.band.n - 1, TC.z1 + TC.band.s + 1];
/** the walls' strip, round the floor (finer ground there) */
export const TC_WALL_BOX: Box = [TC.x0 - 2, TC.x1 + 2, TC.z0 - 2, TC.z1 + 2];

/**
 * The ground of the terrace at x, z, given the hill's own ground there: the floor inside, the wall's top over the wall's
 * thickness round it, then easing back to the hill across the band. Undefined outside the box.
 */
export function tcGround(x: number, z: number, hill: number): number | undefined {
  const [bx0, bx1, bz0, bz1] = TC_BOX;
  if (x < bx0 || x > bx1 || z < bz0 || z > bz1) return undefined;
  const dx = x < TC.x0 ? TC.x0 - x : x > TC.x1 ? x - TC.x1 : 0, dz = z < TC.z0 ? TC.z0 - z : z > TC.z1 ? z - TC.z1 : 0;
  if (dx === 0 && dz === 0) return TC.floor;
  // the side whose band this is (the farther-out direction decides at the corners)
  const cx = Math.min(TC.x1, Math.max(TC.x0, x)), cz = Math.min(TC.z1, Math.max(TC.z0, z));
  let rim: number, band: number;
  if (dz >= dx) { const s = z < TC.z0 ? 'north' : 'south'; rim = wallHeight(s, cx); band = s === 'north' ? TC.band.n : TC.band.s; }
  else { const s = x < TC.x0 ? 'west' : 'east'; rim = wallHeight(s, cz); band = s === 'west' ? TC.band.w : TC.band.e; }
  const top = TC.floor + rim, d = Math.max(dx, dz);
  if (d <= TC.wall) return top;
  const t = Math.min(1, (d - TC.wall) / band), e = t * t * (3 - 2 * t);
  return top + (hill - top) * e;
}

/** inside the complex's fence (nothing generic grows or stands there) */
export const inTcFloor = (x: number, z: number, pad = 0) => x > TC.x0 - pad && x < TC.x1 + pad && z > TC.z0 - pad && z < TC.z1 + pad;
/** the tennis complex's local scene (the brief's adjustment boundary: the clearing, its tree belt and the road edge
 *  south of it), where street trees are the belt's broadleaf trees, not palms or flame trees */
export const TC_LOCAL: Box = [-760, -400, -200, -15];
export const inTcLocal = (x: number, z: number) => x > TC_LOCAL[0] && x < TC_LOCAL[1] && z > TC_LOCAL[2] && z < TC_LOCAL[3];
