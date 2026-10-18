// Numbers for the Noguchi Memorial Institute for Medical Research and the West African Genetic Medicine Centre
// (nog.ts, the generic finishes in world.ts), from the owner's Noguchi + WAGMC brief (docs/noguchi-wagmc/). The Apple
// satellite views registered on the game map: M1 (close) at 2.617 px/m, x = 192.2 + px / 2.617, z = 1703.3 + py / 2.617;
// M2 (overall) at 2.242 px/m, x = 191.2 + px / 2.242, z = 1703.8 + py / 2.242; no rotation. Two site frames, each on its
// own grid (U along it, V across): Noguchi's (origin the old courtyard ring's centre) and WAGMC's (origin the circular
// island before its entrance). Heights: WAGMC two storeys (the drone frames W01-W49); Noguchi's laboratory relative to its
// photographs N01-N07; the satellite-only buildings provisional (docs/noguchi-wagmc/evidence-ledger.md).

export type P2 = [number, number];
export type R4 = [number, number, number, number];

const frame = (origin: P2, deg: number) => {
  const a = (deg * Math.PI) / 180, ux = Math.cos(a), uz = Math.sin(a);
  return {
    origin, axis: [ux, uz] as P2, yaw: Math.atan2(-uz, ux),
    world: (u: number, v: number): P2 => [origin[0] + ux * u - uz * v, origin[1] + uz * u + ux * v],
    local: (x: number, z: number): P2 => [(x - origin[0]) * ux + (z - origin[1]) * uz, -(x - origin[0]) * uz + (z - origin[1]) * ux],
  };
};
/** Noguchi's frame: origin at the courtyard ring's centre, U along the ring's north side */
export const NG = frame([416.9, 1943.3], -15);
/** WAGMC's frame: origin at the circular island, U from the building toward it */
export const WG = frame([290.3, 1891.2], -27);

// ---------- WAGMC ----------
/** the U: two forward wings, the base with the portal between them, the rear extension, the small flat service
 *  enclosure; two storeys under red-brown hipped roofs with dark fascias (W18, W34, W40-W45) */
export const WAG = {
  north: [-56, -19, -25, -11] as R4, south: [-62, -19, 12, 26] as R4, base: [-50, -36, -11, 12] as R4, rear: [-68, -50, -5, 15] as R4,
  service: [-66, -60, -27, -21] as R4, floors: 2, storey: 3.6,
  /** the thick white portal frame on the base's court face, the pale entry platform, the salmon forecourt */
  portal: [-36, -32.5, -6.5, 6.5] as R4, platform: [-32.5, -29, -5, 5] as R4, forecourt: [-29, -16, -7, 7] as R4,
  /** the low planted plots either side of the forecourt (light kerbs) and the tree in the north one (W18 #5) */
  plots: [[-34, -18, -11, -7.5], [-34, -18, 7.5, 12]] as R4[], tree: [-24, -9.3] as P2,
  /** the circular planted island in its low pale kerb (W40-W45) */
  island: { c: [0, -1.2] as P2, r: 4.6 },
  /** the boundary wall and its openings (the front drive; where the mapped service road crosses: assumption) */
  wall: [-78, 18, -38, 37] as R4, gaps: { north: [-8, 20] as P2, east: [19, 29] as P2, south: [[-41, -27], [3, 14]] as P2[] },
  /** the east side (the owner's correction brief, M1): the boundary is not square to the road; it runs from the road at
   *  u 27.7 to u 17.3 at the south wall, with the red earth strip outside it */
  east: [[27.7, -38], [21.2, -5], [17.3, 37]] as P2[],
  gate: [21, 24.5, -37.4, -33.6] as R4,
  /** the open metal-framed shade structures over the parking beside the wing ends */
  shelters: [[-21, -14, -26, -17], [-21, -14, 17, 26]] as R4[],
  /** the asphalt drive from the main road to the island, and the parking round it */
  drive: [-8, 16, -38, 31] as R4,
  lawn: [-70, -16, -34, -26] as R4,
  lamps: [[-20, -9.5], [-20, 9.6], [7.6, -27], [5.6, -18], [-16, 12]] as P2[],
  /** the owner's correction brief (S02/S18, M1): not one apron round the building but the elongated parking on its
   *  court side, from the gap in the road wall down to the strip along the south-east wing, the drive round the round
   *  island; the strip along the south-east side with its row of angled bays; pale paving along the west wall; lawn
   *  elsewhere (the grass east of the parking, the strip under the road wall) */
  park: [[-8, -38], [27.7, -38], [21.6, -7], [18.5, -8], [14.5, -2], [6.5, 7], [4, 30], [4, 37], [-16, 37], [-16, 21], [-12, 4], [-12, -8], [-11, -28]] as P2[],
  seStrip: [[-66, 26], [4, 26], [4, 37], [-66, 37]] as P2[],
  westPave: [[-77.5, -32], [-70, -32], [-70, 36.5], [-77.5, 36.5]] as P2[],
  /** the kerbed planted strip down the middle of the upper parking (its ends; 3.4 m wide), the rounded end toward the
   *  island; the aisles run with the east boundary, not square to the road */
  midStrip: { a: [8.5, -31] as P2, b: [4, -14] as P2, w: 3.4 },
  /** the grass east of the parking inside the wall */
  eastGrass: [[21.6, -7], [21.2, -5], [17.3, 37], [4.5, 37], [4, 30], [6.5, 7], [14.5, -2], [18.5, -8]] as P2[],
};
export const WAG_OUTLINE: P2[] = [[-56, -25], [-19, -25], [-19, -11], [-36, -11], [-36, 12], [-19, 12], [-19, 26], [-62, 26], [-62, 15], [-68, 15], [-68, -5], [-50, -5], [-50, -11], [-56, -11]];

// ---------- Noguchi ----------
/** 03 the old square courtyard complex: the dark pitched-roof ring round an open court, the small central hipped
 *  pavilion, the entry link east to the curved loop (M1, M2; no side elevations: height provisional) */
export const RING = { outer: 44, outerV: [-43, 44] as P2, band: 14, floors: 2, storey: 3.5, pavilion: [-6, 8, -9, 6] as R4, link: [44, 56, -11.7, -5] as R4 };
/** 02 the Advanced Research Laboratories (N01-N07): the long hipped wing with white piers, the white entrance frame at its
 *  west end, the taller signed east end with stairs and balconies, the pale flat service block behind, the west arm */
export const LAB = {
  front: [125.5, 182, -143, -129] as R4, end: [182, 201, -143, -118] as R4, service: [142, 182, -129, -118] as R4, arm: [125.5, 142, -129, -86] as R4,
  storey: 4.2, endFloors: 4,
  /** (the owner's correction brief, S08-S20 on M1) the entrance portal on the west face at its north end, facing the
   *  approach and the sign island: its frame's v span and how far it stands out (to u 121.5) */
  portal: [-141.5, -127.5] as P2, portalOut: 120.5,
  /** the west face's bays south of the portal and the wide blank pier: 12 of 3.25 m, a pier 2.25 m and a slot 1 m */
  bays: { v0: -126, n: 12, w: 3.25, pier: 2.25 },
  /** the signed tower north of the north-west corner (the white roof on M1; S09, S10, S15, S19): four storeys, the sign
   *  on its west face, the stacked landings on its north face with the ground stair; the low block beside it */
  // (the owner's tower brief, 2026-10-14: T01 at this site is the tall slim open-sided tower of their Picture 2, not a
  // broad signed block; B02 beside it the one-floor flat-roofed neighbour; the signed broad face is the east end block)
  tower: [121, 126, -166.2, -159.5] as R4, towerH: 20, low: [127, 139, -166, -152.5] as R4,
  /** the two kerbed lawns before the portal with the pale walk between them to the doors (M1), the monument on the
   *  north lawn's east end (S20) */
  lawns: [[84, 112, -141.6, -133.2], [85, 113, -130, -122.4]] as R4[], walk: [80, 115.4, -133.2, -130] as R4,
  island: [84, 113, -143.5, -121] as R4, sign: [107, -137.2] as P2,
};
export const LAB_OUTLINE: P2[] = [[125.5, -143], [201, -143], [201, -118], [142, -118], [142, -86], [125.5, -86]];
/** 04 the small red courtyard building: a ring round its open green centre (never filled) */
export const RED04 = { outer: [-6, 39.5, -144, -115] as R4, court: [7, 27, -135, -124] as R4 };
/** 17 / 18 the two solar panel fields (the owner confirmed them): repeated dark panels in rows with pale aisles */
export const ARRAYS: { r: R4; rows: number }[] = [
  { r: [160, 221, 66, 116], rows: 9 }, { r: [224, 253, 66, 116], rows: 9 }, { r: [213, 243, 120, 153], rows: 6 }, { r: [110, 157, 121, 196], rows: 13 },
];
/** 21 the small red shed in the open lawn (M2; no mapped outline) */
export const SHED21 = [146, 150, 13, 17] as R4;
/** the block-paved parking north and east of the laboratory (N06: grey-beige blocks, white bays) */
/** a row of bays along a line (site frame): the bays' centres from a to b, a car heading across the row */
export type LineRow = { a: P2; b: P2; tilt?: number };
export const NOG_LOTS: { name: string; ring: P2[]; rows: { v: P2; u: P2; face: 1 | -1 }[]; across?: boolean; fill: number; lines?: LineRow[] }[] = [
  // (the north lot either side of the signed tower: block paving, white bays; S15)
  { name: 'noguchi-lab-north', ring: [[139.5, -168], [236, -168], [236, -155], [139.5, -155]], fill: 0.5, rows: [{ v: [-166, -161], u: [141, 234], face: 1 }] },
  { name: 'noguchi-lab-northwest', ring: [[94, -168], [117.5, -168], [117.5, -155], [94, -155]], fill: 0.45, rows: [{ v: [-166, -161], u: [96, 116], face: 1 }] },
  // (S04: the cars along the loop's outer south and north edges, parked along the kerb)
  { name: 'noguchi-loop-s', ring: [[61, 9.9], [81, 9.9], [81, 14], [61, 14]], fill: 0.7, rows: [], lines: [{ a: [79, 12.8], b: [63, 10.9], tilt: Math.PI / 2 }] },
  { name: 'noguchi-loop-n', ring: [[67, -27], [88, -27], [88, -23.3], [67, -23.3]], fill: 0.6, rows: [], lines: [{ a: [69, -25.6], b: [86, -24.6], tilt: Math.PI / 2 }] },
  { name: 'noguchi-lab-east', ring: [[203, -146], [216.4, -146], [216.4, -100], [203, -100]], fill: 0.45, across: true, rows: [{ v: [-144, -102], u: [204, 209], face: 1 }, { v: [-144, -102], u: [210.6, 215.6], face: -1 }] },
];
export const WAG_LOTS: { name: string; ring: P2[]; rows: { v: P2; u: P2; face: 1 | -1 }[]; across?: boolean; fill: number; lines?: LineRow[] }[] = [
  // (S02: the bays along the parking's east edge, either side of the planted strip, the lower row by the grass, all
  // with the aisles' slant; the angled row along the south-east strip)
  { name: 'wagmc-north', ring: [[-11, -37.5], [27.5, -37.5], [22, -12], [-11, -12]], fill: 0.5, rows: [], lines: [{ a: [24.6, -32], b: [20.1, -13] }, { a: [12.3, -30], b: [8.4, -15] }, { a: [3.9, -32], b: [0, -16] }] },
  { name: 'wagmc-south', ring: [[-2, 11], [7, 11], [7, 30], [-2, 30]], fill: 0.55, rows: [], lines: [{ a: [3.6, 12.5], b: [1.6, 28.5] }] },
  { name: 'wagmc-se', ring: [[-64, 31], [3, 31], [3, 36.8], [-64, 36.8]], fill: 0.45, rows: [], lines: [{ a: [-62, 34], b: [1, 34], tilt: 0.35 }] },
];

// ---------- the roads and tracks (the owner's correction brief, 2026-10-14: docs/noguchi-wagmc/correction-ledger.md) ----------
/** S03/S04: the loop beside the old ring is one paved rounded ring round the tree island (west) and the kerbed lawn
 *  (east), entered at its top from the road down from the north (M1, traced on the asphalt); the mapped figure of eight
 *  with the road straight through its middle is replaced: the road ends at the loop's top, an earth track leaves its
 *  bottom on the old line south (no paving there on the satellite). World metres. */
export const NOG_ROADS = {
  north: [[448.4, 1748.4], [460.2, 1782.8], [466.6, 1801.6], [468.7, 1807.8], [475.4, 1827.3], [499.5, 1899.3]] as P2[],
  loop: [[499.5, 1899.3], [509.4, 1897.8], [520.8, 1895.5], [530.4, 1895.5], [534.2, 1900.1], [535.0, 1909.6], [533.0, 1917.3], [524.6, 1920.3], [513.2, 1924.2], [508.4, 1926.4], [501.7, 1929.5], [492.2, 1932.6], [480.7, 1933.7], [473.1, 1930.7], [469.6, 1924.9], [469.2, 1917.3], [471.1, 1908.5], [476.9, 1904.3], [486.4, 1902.4], [496.0, 1900.1], [499.5, 1899.3]] as P2[],
  south: [[508.4, 1926.4], [509.4, 1930.4], [541.2, 2024.7]] as P2[],
  /** S11/S20 on M1: the drive past the portal runs about 3 m west of the mapped line (which ran through the portal frame) */
  portalDrive: [[468.7, 1807.8], [498.6, 1797.2], [498.2, 1793.1], [495.8, 1783.4], [493.8, 1775.2], [495.3, 1771]] as P2[],
  /** the owner (notes on the WAGMC ride): rides to WAGMC stop at its entrance, not at the road gate: the drive in at the
   *  road gap, down the east aisle of the parking, round the island to the forecourt before the portal (WAGMC frame) */
  wagForecourt: [[15, -47.5], [15, -38], [14, -30], [9.5, -14], [5, -7.5], [-6, -7], [-12, -2], [-17, 0]] as P2[],
  /** S18: the second red-earth track of the corridor west of WAGMC, beside the mapped one across the tree belt */
  corridor: [[196.8, 1891.9], [239.6, 1965.8], [253.3, 1992.2], [327.7, 2099.7]] as P2[],
  /** S02/S18: the red earth strip down WAGMC's east side, outside the boundary (the mapped service road ran 6-15 m west
   *  of it, through the compound), on to the cluster */
  strip: [[292.5, 1836], [302.2, 1845.4], [314.5, 1877.2], [323.5, 1903], [330.5, 1923], [328.9, 1947.5]] as P2[],
  /** the drive in from the strip to the south-east strip's parking and out at the south-west gap (the mapped road's
   *  line inside the compound) */
  driveIn: [[323.5, 1903], [308.4, 1907.6]] as P2[],
  driveSE: [[308.4, 1907.6], [303.4, 1918.2], [295.6, 1924.1], [285.8, 1926.2], [277.5, 1933]] as P2[],
  /** out of the south-west gap into the red-roofed cluster: earth */
  cluster: [[277.5, 1933], [275.7, 1955.4], [278.1, 1981.4]] as P2[],
};
/** S02/S17/S18: the tracks that are red earth, not asphalt: the corridor west of WAGMC (both tracks), the strip down
 *  the east side of its compound and its branches into the red-roofed cluster, the track south of the loop */
export const NOG_EARTH: P2[][] = [
  [[361.9, 2206.3], [341.4, 2157.3], [317.3, 2105.7], [242.9, 1998.2], [229.2, 1971.8], [186.4, 1898]],
  NOG_ROADS.corridor,
  NOG_ROADS.strip,
  NOG_ROADS.cluster,
  [[308.4, 1907.6], [328.9, 1947.5]],
  NOG_ROADS.south,
];
/** S02's red outline: the red-roofed cluster's mixed earth and scrub ground between WAGMC and the old ring (M1) */
/** the cluster's mapped outlines reshaped onto their roof patches (M1, world): id, roof */
export const CLUSTER_RINGS: [string, string, P2[]][] = [
  ['osm:way/1180697052', 'the red T, north part', [[294.9, 1938.3], [311.8, 1933.7], [316.6, 1959.5], [300.1, 1963.1]]],
  ['osm:way/565376793', 'the red T, south part', [[303.0, 1963.1], [319.3, 1960.3], [323.6, 1984.2], [307.8, 1985.6]]],
  ['ml:644aecfb-ad42-4bae-958c-6537eb9a8619', 'the weathered grey roof', [[311.8, 1933.7], [325.9, 1931.8], [329.8, 1957.4], [316.6, 1959.5]]],
  ['osm:way/1180697051', 'the pink pair', [[328.8, 1943.1], [339.8, 1941.2], [344.1, 1959.3], [332.6, 1961.7]]],
  ['osm:way/1114966058', 'the small teal roof', [[286.8, 1958.8], [293.0, 1957.9], [294.6, 1971.3], [288.2, 1972.2]]],
];
/** the cluster's roofs without a mapped outline (Noguchi frame): the small salmon roof west of the T, the long salmon
 *  roof and the dark grey roof at its east edge (M1) */
export const CLUSTER_EXTRA: { r: R4; roof: string }[] = [
  { r: [-128.2, -122.7, -28.3, -20.5], roof: '#c9876b' }, { r: [-66, -61, -6.5, 10.3], roof: '#c8805f' }, { r: [-68.5, -59.5, 10.8, 25], roof: '#5d5f61' },
];
/** WAGMC's compound inside its boundary walls (world), from its frame (the earth is not painted inside it) */
export const WAG_BOUND = (): P2[] => [[WAG.wall[0], WAG.wall[2]], ...WAG.east, [WAG.wall[0], WAG.wall[3]]].map(([u, v]) => WG.world(u, v));
export const NOG_CLUSTER: P2[] = [[282.0, 1934.5], [318.3, 1924.9], [345.0, 1932.6], [357.3, 1955.5], [347.0, 1979.2], [306.8, 1980.3], [283.1, 1968.9]];
const segD = (x: number, z: number, [ax, az]: P2, [bx, bz]: P2) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(ax + dx * t - x, az + dz * t - z); };
/** distance to the nearest of those tracks */
export function nogEarthDist(x: number, z: number) {
  let best = Infinity;
  for (const l of NOG_EARTH) for (let i = 1; i < l.length; i++) best = Math.min(best, segD(x, z, l[i - 1], l[i]));
  return best;
}

/** the owner's notes on the tower brief's renders (2026-10-14): the zone behind the laboratories they circled in red (its
 *  buildings' centres, from the render's camera, hull with a margin; world): every building one storey, with doors */
export const NOG_BACK: P2[] = [[510, 1866], [727, 1676], [785, 1664], [1142, 1646], [1200, 1901], [1212, 2014], [1201, 2124], [1104, 2344], [1062, 2428], [859, 2494], [693, 2461], [552, 2028]];
/** round the back and sides of WAGMC (the owner: the similar small buildings there take doors too; not UGMC): WAGMC's
 *  frame, u and v */
export const WAG_SIDES: R4 = [-150, 45, -70, 100];
/** the two small buildings on the laboratory's north lot the owner circled: built like the one-floor neighbour B02
 *  (nog.ts), Noguchi frame */
export const LOW_LIKE: R4[] = [[183.4, 195.2, -160.1, -153.7], [227.6, 236.4, -143.5, -129.3]];

/** generic finishes for the surrounding small buildings (the brief's register 05-24, roof colours from M1/M2): a point
 *  inside each mapped outline, in Noguchi's frame */
export const NOG_FINISH: { at: P2; roof: string; wall?: string; flat?: boolean; storeys?: number }[] = [
  { at: [-32, -130], roof: '#d48a6a', storeys: 1 },                 // 05 salmon hipped roof
  { at: [-68, -118], roof: '#cdc7bb', storeys: 1 },                 // 06 pale L
  { at: [12, -61], roof: '#7c7f83', storeys: 2 },                   // 07 grey rectangle
  { at: [-22, 70], roof: '#8a8079', storeys: 1 },                   // 09 small hip below the ring
  { at: [20, 83], roof: '#7e8285', storeys: 1 },                    // 10 grey long roof
  { at: [115, -48], roof: '#a9c4a0', storeys: 1 },                  // 12 pale green roof
  { at: [168, -55], roof: '#c27a43', storeys: 1 },                  // 13 orange roof
  { at: [200, -60], roof: '#9a9c9c', storeys: 1 },                  // 13 nearby units
  { at: [190, -50], roof: '#9a9c9c', storeys: 1 },
  { at: [146, -6], roof: '#76716c', storeys: 1 },                   // 14 grey hip by the loop
  { at: [235, -108], roof: '#3e4144', storeys: 1 },                 // 16 slim dark roof
  { at: [-18, 137], roof: '#b0442f', storeys: 1 },                  // 19 lower red roof
  { at: [114, 116], roof: '#b5452f', storeys: 1 },                  // 20 narrow red shed
  { at: [155, 96], roof: '#b5452f', storeys: 1 },                   // 24 shed beside the upper field
  { at: [-48, 96], roof: '#7f98ad', storeys: 1 },                   // 23 small blue / pale / grey roofs
  { at: [-46, 142], roof: '#b9bcbd', storeys: 1 },
  // 08 the red-roofed cluster south of WAGMC (the owner's correction brief, S02/S18 on M1): the big red T in two
  // outlines, the weathered grey roof beside it, the pink pair, the small teal roof; each outline reshaped onto its
  // roof patch (corrections: CLUSTER_RINGS)
  { at: [-108.7, -23.6], roof: '#a8432f', storeys: 1 }, { at: [-107.8, 2.2], roof: '#a14a35', storeys: 1 }, { at: [-93.2, -22.6], roof: '#7d8183', storeys: 1 },
  { at: [-80, -13.2], roof: '#c98f8c', storeys: 1 }, { at: [-127.6, -11.6], roof: '#6f9e95', storeys: 1 },
];

type Lot = (typeof NOG_LOTS)[number];
/** car spots in a lot of a frame (site frame u, v, heading: 0 lengthwise along V) */
function spots(l: Lot): [number, number, number][] {
  const out: [number, number, number][] = [];
  let seed = l.name.length * 613;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (const r of l.lines ?? []) {
    const L = Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1]), du = (r.b[0] - r.a[0]) / L, dv = (r.b[1] - r.a[1]) / L;
    // (heading 0 is lengthwise along V: a car across the row points along its normal)
    const h = Math.atan2(-du, dv) + Math.PI / 2 + (r.tilt ?? 0);
    for (let t = 1.3; t < L - 1.2; t += 2.6) if (rnd() < l.fill) out.push([r.a[0] + du * t, r.a[1] + dv * t, h]);
  }
  for (const r of l.rows) {
    if (l.across) { for (let v = r.v[0] + 1.3; v < r.v[1] - 1.2; v += 2.6) if (rnd() < l.fill) out.push([(r.u[0] + r.u[1]) / 2, v, r.face > 0 ? Math.PI / 2 : -Math.PI / 2]); continue; }
    for (let u = r.u[0] + 1.3; u < r.u[1] - 1.2; u += 2.6) if (rnd() < l.fill) out.push([u, (r.v[0] + r.v[1]) / 2, r.face > 0 ? 0 : Math.PI]);
  }
  return out;
}
const inRect = (ring: P2[], u: number, v: number) => { const us = ring.map((p) => p[0]), vs = ring.map((p) => p[1]); return u > Math.min(...us) && u < Math.max(...us) && v > Math.min(...vs) && v < Math.max(...vs); };
/** the Noguchi and WAGMC lots' car spots in the world (x, z, heading), for life.ts */
export function nogSpots(x: number, z: number): [number, number, number][] | undefined {
  for (const [F, lots] of [[NG, NOG_LOTS], [WG, WAG_LOTS]] as const) {
    const [u, v] = F.local(x, z), l = lots.find((o) => inRect(o.ring, u, v));
    if (l) return spots(l).map(([a, b, h]) => { const [wx, wz] = F.world(a, b); return [wx, wz, h + F.yaw]; });
  }
  return undefined;
}
