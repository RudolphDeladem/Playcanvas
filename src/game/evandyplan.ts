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
const ORANGE = '#c4633a', PINK = '#cf8466';
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
  { id: 'east-link', quad: [[633.1, -1236.8], [641, -1236.8], [641.1, -1248.3], [633.2, -1248.4]], floors: 4, south: 'vent', north: 'vent', ends: 'gallery', roof: ORANGE },
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
/** the west yard: grey gravel, the green basketball slab (the mapped pitch, V2 1.56 s, 21.16 s) with its hoop */
export const YARD = { box: [506, 551, -1284, -1222] as R4, slab: [[514.5, -1273.1], [513, -1245.4], [530.7, -1244.4], [532.2, -1272.1]] as P2[], hoop: [522.3, -1270.5] as P2 };
/** the big tree in the court below the upper pair (V1, M2) and the trees in the narrow inner courts */
export const TREES: { at: P2; r: number }[] = [{ at: [608, -1279], r: 6.5 }, { at: [596.5, -1250], r: 3.2 }, { at: [575, -1245], r: 2.4 }, { at: [622, -1241], r: 2.4 }];
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
