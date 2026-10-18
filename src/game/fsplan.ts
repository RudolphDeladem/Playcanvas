// Numbers for the owner's Legon Fire Station, Child Lab and E.A. Boateng Road brief (firestation.ts and boateng.ts draw
// them; pure data). Game metres: x east, z south. The outlines are the mapped ones (ids kept); the spots of gates,
// walls, the tank, the canopy, signs and planting are read from the annotated aerials R1-R3 registered to the mapped
// roads and outlines, and from the street photographs (Pairs 1-14). Nothing here is measured.

/** where the models draw a mapped road's surface themselves (science.ts offAsphalt): the stone-paved court and drive of
 *  the R2 cluster (Pairs 9-11, 13) and the worn earth track across the tall grass west of it (Pair 12) */
export const FS_PAVED: [number, number, number, number][] = [
  [405.5, 441, 339.5, 356],
  [434, 456, 341, 376],
  [378, 405.5, 339, 350],
];

// ---------- the fire station (R3; Pairs 3-6, 14) ----------
/** the station's buildings, by a point inside each mapped outline:
 *  - gable A, the east building's north end (osm:way/773861741), the fire-service lettering on its gable, the tank in
 *    front of it (Pairs 3-5);
 *  - gable B, the long west building's north end (osm:way/492099511), behind the railing fence (Pairs 3, 4);
 *  - the small shed beside B (osm:way/603522789);
 *  - the long building beside La Road (osm:way/430197440, Pair 14's right frontage);
 *  - the low office by the car park (osm:way/492099542, Pair 6) */
export const ST = {
  A: [669, 380] as [number, number],
  B: [645, 400] as [number, number],
  shed: [635, 358] as [number, number],
  road: [615, 380] as [number, number],
  office: [651, 310] as [number, number],
};
/** the boundary along the car park: its line, the vehicle opening on the mapped drive with its piers, the solid wall east
 *  of it in front of A (returning south past A's east side), the railing fence on a low wall west of it in front of B and
 *  the shed (returning to the shed's north face) */
export const BOUND = { z: 348.5, gate: [649.8, 655.8] as [number, number], east: 677, west: 631.2, eastReturn: 356, westReturn: 352.9 };
/** the open vehicle canopy over the drive between A and B: its extent, the front and back eaves; the posts stand along
 *  both buildings' walls, clear of the drive */
export const CANOPY = { x0: 651.4, x1: 663.3, z0: 353, z1: 366, front: 5.4, back: 4.7 };
/** the black ribbed water tank on its stand in front of A's east half (Pairs 3-5) */
export const TANK = { x: 671.6, z: 351.2, r: 0.95, h: 2.0, stand: 2.3 };
/** the low red railing across the car park's planting strip in Pair 5's foreground (spot inferred) */
export const RAILING = { x0: 652.5, x1: 661.5, z: 338.2 };
/** the office's frontage (Pair 6): the block-paved strip along its south face, the short painted posts at its edge, the
 *  hedge-lined earth access along its west side, the pole by its east end */
export const OFFICE = { pave: [641, 661, 314, 316.9] as [number, number, number, number], posts: [643.2, 646.8, 650.4, 654, 657.6], postZ: 317.2, hedgeX: [636.4, 640.9] as [number, number], hedgeZ: [303.6, 315.5] as [number, number], pole: [661.6, 316.8] as [number, number] };
/** La Road's east side past the station (Pair 14): the mapped centreline's stretch, the block-paved footway (offsets from
 *  the centreline), the contained drain opening at the kerb, the low pale wall north of the long building */
export const LA_ROAD: [number, number][] = [[626.5, 325.3], [617.9, 349.8], [614.3, 356.2], [602.9, 375.5], [598.7, 381.0]];
export const LA = { half: 3.7, walk: [3.9, 6.1] as [number, number], drain: 362.5, wall: 6.6, wallZ: [336, 355.5] as [number, number] };

// ---------- R1: the courtyard complex west of E.A. Boateng Road and the low long building east of it (Pairs 1, 2) ----------
/** the courtyard's east range (osm:way/492099499; the map's 'Soil Science' name on it is kept as mapped): its north and
 *  south lengths and the narrower link between them with the passage through it */
export const R1 = {
  eastN: [482.2, 491.8, 155.1, 176] as [number, number, number, number],
  eastLink: [484.1, 489.9, 176, 190.3] as [number, number, number, number],
  eastS: [482.8, 491.8, 190.3, 211.2] as [number, number, number, number],
  /** the open court between the ranges: its grass panels split by the walks (R1: two north-south walks, one east-west
   *  walk running on through the link's passage toward the road) */
  court: [411, 482.2, 172.3, 195.7] as [number, number, number, number],
  walksX: [428.5, 455] as number[], walkZ: 183.5, walkW: 2.4, passage: [181.4, 185.6] as [number, number],
  /** the low long building across the road (osm:way/492099547): its main length and the short bay on its west side */
  long: [557.9, 569.9, 152.0, 205.1] as [number, number, number, number],
  longBay: [554.6, 558.2, 157.9, 170.8] as [number, number, number, number],
  /** the solar-style lamp in its garden (Pair 2) */
  lamp: [573.2, 149.4] as [number, number],
};

// ---------- R2: the cluster in E.A. Boateng Road's bend (Pairs 7-13) ----------
/** CEDSA's perforated screen along the cluster's south side toward the road, the gate in its middle under the small
 *  tiled cap, the notice panel east of the gate; the dark forecourt between the screen and the road (Pairs 7, 8) */
export const CEDSA = { z: 377.6, x0: 405.6, x1: 436.4, gate: [419.6, 422.6] as [number, number], panel: [423.7, 427.9] as [number, number], h: 2.4, back: [370.4, 368] as [number, number] };
/** CEGENSA's gable: the north end of the cluster's east mass (osm:way/439690551), its face and extent (Pair 9) */
export const CEGENSA = { face: 354.55, x0: 425.6, x1: 432.7, eave: 3.3 };
/** the freestanding CEGENSA direction sign by the drive, its arrow pointing along the path to the right (Pair 13) */
export const SIGN: [number, number] = [445.4, 366.2];
/** the sign's facing (radians about y; 0 faces south): toward the road and the path's mouth */
export const SIGN_RY = 0.64;
/** its two posts, either side of the panel's middle */
export const signPosts = (): [number, number][] => [-1, 1].map((s) => [SIGN[0] + s * 0.95 * Math.cos(SIGN_RY), SIGN[1] - s * 0.95 * Math.sin(SIGN_RY)] as [number, number]);
/** the tall conical shrubs along the east mass's east face (Pairs 10, 11) */
export const CONIFERS: [number, number][] = [[434.6, 357.6], [434.8, 361.4], [434.6, 365.0]];
/** the tall unmown grass west of the cluster and the earth track across it (Pair 12) */
export const GRASS = { x0: 382, x1: 404, z0: 327, z1: 343.5 };
/** the worn earth track across it (the mapped footway, drawn as earth here) */
export const TRACK: [number, number][] = [[363, 351.1], [380.3, 347], [404.6, 341.2]];

/** the model's own ground and edges (its footways, verges and aprons): the generic verges, drains and route pavements
 *  stay out (ipsplan.ts ownsEdges): La Road's east side past the station (from the kerb to the low wall), the CEDSA
 *  forecourt and the R2 court and drive */
export const FS_OWNED: [number, number, number, number][] = [
  [404, 437, 338, 393],
  [437, 457, 338, 378],
];
export const ownsFs = (x: number, z: number) => FS_OWNED.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1) || laEast(x, z);
/** on La Road's east side between the kerb and just past the low wall, from the car park's access to the long building */
function laEast(x: number, z: number) {
  if (z < 333 || z > 381 || x < 595 || x > 634) return false;
  const o = laOffset(x, z);
  return o > LA.half - 0.2 && o < LA.wall + 0.8;
}
/** the signed offset of a point from La Road's centreline (+ east of it) */
export function laOffset(x: number, z: number) {
  let best = Infinity, off = 0;
  for (let i = 1; i < LA_ROAD.length; i++) {
    const [ax, az] = LA_ROAD[i - 1], [bx, bz] = LA_ROAD[i], dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz);
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (l * l))), px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz);
    if (d < best) { best = d; off = ((x - px) * (dz / l) - (z - pz) * (dx / l)); }
  }
  return off;
}

/** a point along a polyline offset to its left (+) or right (-) side, by the fraction t of its length */
export function along(pts: [number, number][], t: number, off: number): [number, number] {
  const L: number[] = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const d = Math.max(0, Math.min(1, t)) * L[L.length - 1];
  let i = 1;
  while (i < pts.length - 1 && L[i] < d) i++;
  const [ax, az] = pts[i - 1], [bx, bz] = pts[i], l = L[i] - L[i - 1] || 1, f = (d - L[i - 1]) / l;
  const ux = (bx - ax) / l, uz = (bz - az) / l;
  // the left of a direction (ux, uz) in this frame (x east, z south) is (uz, -ux)
  return [ax + (bx - ax) * f + uz * off, az + (bz - az) * f - ux * off];
}
/** the z where La Road's stretch reaches, as a fraction of its length (for walking the footway) */
export function laT(z: number) {
  const L: number[] = [0];
  for (let i = 1; i < LA_ROAD.length; i++) L.push(L[i - 1] + Math.hypot(LA_ROAD[i][0] - LA_ROAD[i - 1][0], LA_ROAD[i][1] - LA_ROAD[i - 1][1]));
  for (let i = 1; i < LA_ROAD.length; i++) if (z <= LA_ROAD[i][1]) return (L[i - 1] + ((z - LA_ROAD[i - 1][1]) / (LA_ROAD[i][1] - LA_ROAD[i - 1][1])) * (L[i] - L[i - 1])) / L[L.length - 1];
  return 1;
}

/** the solids the models stand beside the ride (posts, piers, the tank's legs, the canopy's posts, the sign), for the
 *  route checks: x, z, radius */
export function fsPosts(): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (const x of [BOUND.gate[0] - 0.4, BOUND.gate[1] + 0.4]) out.push([x, BOUND.z, 0.45]);
  for (const z of [CANOPY.z0 + 0.3, (CANOPY.z0 + CANOPY.z1) / 2, CANOPY.z1 - 0.3]) out.push([CANOPY.x0, z, 0.12], [CANOPY.x1, z, 0.12]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push([TANK.x + sx * 0.75, TANK.z + sz * 0.75, 0.1]);
  for (const x of [RAILING.x0, RAILING.x1]) out.push([x, RAILING.z, 0.06]);
  for (const x of OFFICE.posts) out.push([x, OFFICE.postZ, 0.09]);
  out.push([OFFICE.pole[0], OFFICE.pole[1], 0.15]);
  for (const [x, z] of signPosts()) out.push([x, z, 0.06]);
  out.push([R1.lamp[0], R1.lamp[1], 0.08]);
  out.push([CEDSA.gate[0] - 0.3, CEDSA.z + 0.3, 0.3], [CEDSA.gate[1] + 0.3, CEDSA.z + 0.3, 0.3]);
  return out;
}
