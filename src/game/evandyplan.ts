// Numbers for Evandy Hostel and its environs (evandy.ts), from the owner's Evandy brief (docs/evandy/): the Apple
// satellite M2 registered on the game map at 3.82 px/m on the hostel's own roofs (x = 470.7 + px / 3.82,
// z = -1413.7 + py / 3.82, no rotation), the drone frames V1-V3, the photographs R02-R18 and the panoramas P01-P06.
// The wings stand on their mapped outlines (OSM, confirmed by Google Open Buildings); the satellite places the two
// roads about 12 m closer to the buildings than the game's roads, which stay as mapped (the routes): the frontage
// between the fence and the wings is that much deeper in the game. Heights from the photographs (R03/R08: ground plus
// three upper tiers). Game metres, x east, z south.

export type P2 = [number, number];
export type R4 = [number, number, number, number];

/** a wing: a mapped quad (world, in ring order) and what its long faces carry */
export interface Wing {
  id: string; quad: [P2, P2, P2, P2]; floors: number;
  /** the long face toward the south (the frontage, a court) and the one toward the north: balconies, galleries, plain */
  south: 'balcony' | 'gallery' | 'plain' | 'vent' | 'end'; north: 'balcony' | 'gallery' | 'plain' | 'vent' | 'end'; ends: 'end' | 'vent' | 'balcony' | 'gallery';
  roof: string; ochre?: boolean; gables?: boolean;
  /** the end the recessed glass-block slot stands near (R18, P03, P04) */
  slot?: 'x0' | 'x1';
}
// (the ring's roof: weathered salmon-orange tiles in the owner's R04, faded pink on the satellite)
// (the audit, EV-021: the ring's roof pinker, its own family apart from the orange of Main and Annex A; I03 and the drone)
const ORANGE = '#c4633a', PINK = '#d68b80';
export const WINGS: Wing[] = [
  // 1 the lower frontage pair: the main block's two wings either side of the entrance bay (R03, R08, P01-P04)
  { id: 'front-w', quad: [[552.8, -1234.9], [555, -1222.4], [593.8, -1229.2], [591.6, -1241.6]], floors: 4, south: 'balcony', north: 'gallery', ends: 'end', roof: ORANGE, ochre: true, gables: true, slot: 'x0' },
  { id: 'front-e', quad: [[603.6, -1241.7], [600.2, -1228.8], [638, -1219.1], [641.3, -1232]], floors: 4, south: 'balcony', north: 'gallery', ends: 'end', roof: ORANGE, ochre: true, gables: true, slot: 'x1' },
  // 2 the inner pair, behind the frontage pair across the narrow inner courts
  { id: 'inner-w', quad: [[556.2, -1266.3], [553.4, -1255.1], [590.2, -1246.1], [592.9, -1257.3]], floors: 4, south: 'gallery', north: 'balcony', ends: 'end', roof: ORANGE, ochre: true, gables: true },
  { id: 'inner-e', quad: [[599.5, -1259], [601.8, -1245.3], [641.5, -1251.9], [639.2, -1265.5]], floors: 4, south: 'gallery', north: 'balcony', ends: 'end', roof: ORANGE, ochre: true, gables: true },
  // 3 the upper pair beside the pink ring: two bent bars, each as its two arms
  { id: 'upper-s-w', quad: [[590.9, -1297.5], [593.6, -1284], [616.9, -1288.6], [616.3, -1302.5]], floors: 4, south: 'balcony', north: 'gallery', ends: 'end', roof: ORANGE, gables: true },
  { id: 'upper-s-e', quad: [[616.3, -1302.5], [616.9, -1288.6], [634.9, -1284.2], [638.1, -1297.1]], floors: 4, south: 'balcony', north: 'gallery', ends: 'end', roof: ORANGE, gables: true },
  { id: 'upper-n-w', quad: [[594.7, -1323], [593.2, -1312.6], [607.4, -1306.7], [608.3, -1321]], floors: 4, south: 'balcony', north: 'plain', ends: 'end', roof: ORANGE },
  { id: 'upper-n-e', quad: [[608.3, -1321], [607.4, -1306.7], [640.5, -1311.6], [638.4, -1325.5]], floors: 4, south: 'balcony', north: 'plain', ends: 'end', roof: ORANGE },
  // the projecting stair / gallery end at the west of the lower group (R04, V2 11.50 s, 23.50 s): stacked small
  // balconies on its end, red perforated-brick ventilation panels on its sides
  { id: 'west-end', quad: [[546.7, -1248.6], [546.7, -1238.6], [559.8, -1238.7], [559.7, -1248.7]], floors: 5, south: 'end', north: 'end', ends: 'balcony', roof: ORANGE },
  // the small link block at the east between the frontage and inner pairs
  // (the audit, C12: its red perforated panels withdrawn; the east range now stands against its east face, its court face
  // plain with a louvred window a bay, provisional)
  { id: 'east-link', quad: [[633.1, -1236.8], [641, -1236.8], [641.1, -1248.3], [633.2, -1248.4]], floors: 4, south: 'plain', north: 'plain', ends: 'gallery', roof: ORANGE },
];
/** 4 the pink-roof courtyard ring (affiliation unresolved: contextual, no name): plain cream walls, pink hipped roofs
 *  round an open court (M2: the court's outline) */
export const RING = { outer: [533, 588, -1326, -1283] as R4, court: [546.6, 571.4, -1307.7, -1296.6] as R4, floors: 4, roof: PINK };
/** the main entrance bay between the frontage pair (R08, P03): paired columns, the gold-framed glazing, the peaked
 *  pediment with UG EVANDY HALL, MAIN BLOCK over the recessed door */
export const ENTRY = { c: [597, -1235] as P2, w: 8, d: 13 };
/** the two-storey commercial block facing the road at the east end of the frontage (R06, R13; the mapped outline) */
export const SHOPS = { quad: [[622.5, -1215.3], [646.2, -1214.4], [645.9, -1205.4], [622.1, -1206.3]] as [P2, P2, P2, P2] };

// ---------- the frontage and the grounds ----------
/** the compound: the fence along the road (its two openings: the west lane's mouth and the gate), the walls on the
 *  other sides */
export const SITE = { x0: 506, x1: 646.5, z0: -1330, zFence: -1203, westMouth: [524.5, 537] as P2, gate: [612, 621] as P2 };
/** the gatehouse (R02, R11, R18, P05, P06), the notice shelter west of it, the EVANDY HOSTEL sign outside */
export const GATEHOUSE = [606.2, 610.6, -1209.6, -1205.2] as R4;
export const SHELTER = [596.5, 602, -1206.4, -1204.6] as R4;
export const SIGN: P2 = [603, -1201];
/** the oval planting islands in the frontage (R03, R11, R14, P01): centre, half lengths */
export const ISLANDS: { c: P2; a: number; b: number }[] = [{ c: [579, -1214], a: 4, b: 1.8 }, { c: [556, -1212], a: 3.6, b: 1.6 }, { c: [612, -1213.5], a: 3, b: 1.4 }];
/** the west yard: grey gravel, the green basketball slab (the mapped pitch, V2 1.56 s, 21.16 s), a hoop at each end */
export const YARD = { box: [506, 551, -1284, -1222] as R4, slab: [[514.5, -1273.1], [513, -1245.4], [530.7, -1244.4], [532.2, -1272.1]] as P2[] };
/** the big tree in the court below the upper pair (V1, M2) and the trees in the narrow inner courts */
// (the reconstruction audit of 2026-10-18: the tree at 596.5, -1250 stood under the Main core, its trunk in the way through)
export const TREES: { at: P2; r: number }[] = [{ at: [608, -1279], r: 6.5 }, { at: [575, -1245], r: 2.4 }, { at: [622, -1241], r: 2.4 }];
/** 9 the unfinished open frame north of the compound and its red-earth yard (M2, V1 18.00 s; status uncertain) */
export const FRAME = { box: [541.4, 561, -1403, -1336.5] as R4, floors: 4, bay: 5 };
export const RED_YARD = [522, 604, -1415, -1332] as R4;
/** 10 the open sandy / red-earth field east of the compound and the scrub round it (M2) */
export const FIELD = { c: [686, -1305] as P2, rx: 23, rz: 17 };
export const SCRUB = [650, 770, -1350, -1203] as R4;
/** the parked cars along the fence in the frontage (P01, R14) and before the shops (R13): row centre z, x ranges */
// (the owner's eight-pair brief: no cars before the Tropiks shopfront (pairs 2-3) nor before the arcade (pair 8))
export const CAR_ROWS: { z: number; x: P2; yaw: number }[] = [{ z: -1205.6, x: [539, 594], yaw: 0 }];
/** the parking areas (rings) the cars stand in */
export const PARKS: P2[][] = [[[537, -1209], [596, -1209], [596, -1203.2], [537, -1203.2]]];
export const inPark = (x: number, z: number) => PARKS.some((r) => x > r[0][0] && x < r[1][0] && z > r[0][1] && z < r[2][1]);
/** the cars (x, z, heading), deterministic */
export function evandySpots(x: number, z: number): [number, number, number][] | undefined {
  if (!inPark(x, z)) return undefined;
  const out: [number, number, number][] = [];
  let seed = 4242;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (const r of CAR_ROWS) {
    if (!PARKS.some((p) => r.x[0] >= p[0][0] - 1 && r.x[1] <= p[1][0] + 1 && r.z > p[0][1] && r.z < p[2][1]) || !(x > r.x[0] - 60 && x < r.x[1] + 60)) continue;
    for (let px = r.x[0] + 1.3; px < r.x[1] - 1.2; px += 2.7) if (rnd() < 0.6 && !ISLANDS.some((i) => Math.abs(px - i.c[0]) < i.a + 1.5 && Math.abs(r.z - i.c[1]) < 3)) out.push([px, r.z, r.yaw]);
  }
  return out;
}
/** inside the compound (the internal lanes are paved there, not asphalt: science.ts offAsphalt) */
export const inEvandy = (x: number, z: number) => x > SITE.x0 && x < SITE.x1 && z > SITE.z0 && z < SITE.zFence + 0.2;

/** a quad's oriented box: centre, unit axis along its longer side, length, width */
export function fit(q: P2[]) {
  const cx = q.reduce((s, p) => s + p[0], 0) / q.length, cz = q.reduce((s, p) => s + p[1], 0) / q.length;
  const e = [0, 1, 2, 3].map((i) => [q[(i + 1) % 4][0] - q[i][0], q[(i + 1) % 4][1] - q[i][1]]);
  const a = Math.hypot(e[0][0], e[0][1]) + Math.hypot(e[2][0], e[2][1]) >= Math.hypot(e[1][0], e[1][1]) + Math.hypot(e[3][0], e[3][1]) ? e[0] : e[1];
  let ux = a[0] / Math.hypot(a[0], a[1]), uz = a[1] / Math.hypot(a[0], a[1]);
  if (ux < 0) { ux = -ux; uz = -uz; }
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const [x, z] of q) { const u = (x - cx) * ux + (z - cz) * uz, v = -(x - cx) * uz + (z - cz) * ux; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  return { c: [cx, cz] as P2, axis: [ux, uz] as P2, x0: u0, x1: u1, z0: v0, z1: v1 };
}

// ---------- the reconstruction audit of 2026-10-17 (docs/evandy-audit/) ----------
// The owner's real top view I03 registered on the game map by its roofs (20 wing and ring corners, an affine fit,
// 1.5 m mean residual): x = 516.98 + 0.11408 px + 0.00046 py, z = -1342.12 + 0.0017 px + 0.11138 py.
/** the Main block's central tank-bearing strip (C02, C03): the space the four wings' inner ends enclose, a deck below
 *  the wings' roofs carrying the tanks; I03 traces it as a pinched hexagon from the front entrance (south) to the
 *  rear court, its corners the wings' own: front-w, inner-w, inner-e, front-e (world, ring order) */
export const MAIN_DECK: P2[] = [[593.8, -1229.2], [591.6, -1241.6], [590.2, -1246.1], [592.9, -1257.3], [599.5, -1259], [601.8, -1245.3], [603.6, -1241.7], [600.2, -1228.8]];
/** the tanks on it, each where I03 shows a separate circle (r: the two small ones) */
export const MAIN_TANKS: [number, number, number][] = [
  [595.3, -1255.4, 0.9], [598.0, -1255.0, 0.9], [595.5, -1252.0, 0.9], [598.2, -1252.2, 0.9], [595.8, -1249.6, 0.9], [598.5, -1249.5, 0.9],
  [596.0, -1246.7, 0.9], [598.8, -1246.3, 0.9], [592.1, -1243.7, 0.55], [594.7, -1243.7, 0.9], [598.4, -1243.5, 0.9], [601.2, -1243.8, 0.55],
  [593.8, -1240.4, 0.9], [598.0, -1240.5, 0.9], [600.6, -1240.7, 0.9], [594.8, -1238.1, 0.85], [594.8, -1236.2, 0.85], [597.7, -1236.2, 0.9],
  [594.3, -1232.9, 0.9], [599.0, -1233.6, 0.9],
];
/** the Main block's east range facing Bani (C12, I13 BLUE): the pale flat-roofed range I03 shows along the east ends
 *  of the wings, joining them; its outer face slightly faceted (I03), its inner side on the wing ends and the east link.
 *  Outer edge north to south, then the inner edge south to north */
export const EAST_RANGE: P2[] = [[643.3, -1269.5], [644.2, -1259.5], [644.0, -1251.2], [643.5, -1243.3], [644.1, -1234.5], [643.0, -1223.4], [638.9, -1223.4], [640.8, -1231.8], [640.6, -1236.9], [640.6, -1248.3], [641.0, -1252.2], [638.7, -1265.3], [639.1, -1269.5]];
// (the inner corners set a little inside the wings and the east link they meet, so no two faces coincide)
/** Annex A's central tank-bearing connection between its two bent bars (C04, C05; I03: eight tanks in two rows) */
export const A_DECK = { x0: 604, x1: 623 };
export const A_TANKS: P2[] = [611.0, 613.8, 617.0, 620.1].flatMap((x) => [[x, 0], [x, 1]] as P2[]);
/** Annex B's tank-bearing seams (C07; I03): the narrow lower strip splitting the north range, and the seam between the
 *  south range and the courtyard's west and east ranges; the tanks along them */
export const B_SEAM = { x0: 559.5, x1: 562.5 };
export const B_TANKS: P2[] = [[560.9, -1322.2], [560.9, -1319.8], [560.4, -1312.3], [560.4, -1309.6], [541.4, -1296.6], [543.4, -1296.6], [545.3, -1296.6], [574.3, -1296.6], [576.6, -1296.6], [580.3, -1296.6], [582.2, -1296.6], [584.5, -1296.6]];
/** the low market-style building replacing the generic block on map outline #17 by the basketball slab (C15, C16): its
 *  box and the half width of its open aisle (east to west through the middle) */
export const MKT = { x0: 514.8, x1: 525.9, z0: -1284.5, z1: -1273.4, aisle: 1.5 };
/** the ground before the aisle's two mouths, kept clear of the generated hedges */
export const inMarketMouth = (x: number, z: number) => Math.abs(z - (MKT.z0 + MKT.z1) / 2) < MKT.aisle + 1 && x > MKT.x0 - 3.5 && x < MKT.x1 + 3.5;
/** on the basketball court (its slab and a metre round it): no generated hedges there */
export const onEvandyCourt = (x: number, z: number) => { const xs = YARD.slab.map((p) => p[0]), zs = YARD.slab.map((p) => p[1]); return x > Math.min(...xs) - 1 && x < Math.max(...xs) + 1 && z > Math.min(...zs) - 1 && z < Math.max(...zs) + 1; };
