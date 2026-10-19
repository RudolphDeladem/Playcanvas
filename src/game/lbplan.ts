// Legon Road (J.J. Rawlings Avenue, the N4) beside the University of Ghana Sports Stadium, the La Bawaleshie Road
// junction and the neighbourhood east of it (the owner's 19-pair brief "Legon Road and La Bawaleshie"): the numbers
// labawaleshie.ts models and the route tests check. Game metres: x east, z south. Positions come from the mapped roads
// and outlines; the street photographs set appearance, heights and order only, and spots marked "inferred" are read
// from them and the owner's annotated aerial (Additional References 1 and 3), not measured.
import { NODE_XZ, ROADS } from './campusmap';
import { ENG_CARS, sat } from './engplan';
import { ugmcSpots } from './ugmcplan';
import { nogSpots } from './nogplan';
import { evandySpots } from './evandyplan';
import { ogSpots } from './okgateplan';

type Line = [number, number][];
type P2 = [number, number];
const pts = (nodes: number[]): Line => nodes.map((n) => [NODE_XZ[n * 2], NODE_XZ[n * 2 + 1]]);
/** the N4's carriageways through the stretch, joined north to south: the southbound one on the west, the northbound one
 *  on the east (one-way ways, told apart by the way their nodes run) */
function carriageway(south: boolean): Line {
  const out: Line = [];
  for (const r of ROADS) {
    if (r.name !== 'J.J. Rawlings Avenue' || r.cls !== 0) continue;
    const p = pts(r.nodes);
    if (p.every(([, z]) => z < 820 || z > 1700)) continue;
    if ((p[p.length - 1][1] > p[0][1]) !== south) continue;
    out.push(...p);
  }
  out.sort((a, b) => a[1] - b[1]);
  return out.filter((q, i) => i === 0 || q[1] - out[i - 1][1] > 0.05);
}
export const N4_WEST = carriageway(true);
export const N4_EAST = carriageway(false);
/** the line's x at z (lines that run north to south) */
export const xOn = (line: Line, z: number) => {
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i], [bx, bz] = line[i + 1];
    if ((z - az) * (z - bz) <= 0 && az !== bz) return ax + ((bx - ax) * (z - az)) / (bz - az);
  }
  return NaN;
};
export const xWest = (z: number) => xOn(N4_WEST, z);
export const xEast = (z: number) => xOn(N4_EAST, z);
/** the carriageways' half widths (mapped: the southbound 6.6 m, the northbound 9.9 m; the southbound as drawn, 9 m, so
 *  the median stops at its edge instead of covering its inner lane: the owner's junction brief) */
export const W_HALF = 4.5, E_HALF = 4.95;
/** the carriageways widened inward (the owner, with the junction brief v3: the space between the two roads was too big;
 *  each road takes five cars side by side). The outer kerbs stay at the mapped edges; each carriageway reaches in to a
 *  kerbed median MED_HALF either side of the line half way between them, about 13.4 m of road each way, along the
 *  stretch the median runs (tapering back to the mapped width over WIDEN.ramp at its ends) */
export const MED_HALF = 1.2;
export const WIDEN = { z0: 905, z1: 1640, ramp: 30 };
const widenK = (z: number) => Math.max(0, Math.min(1, (z - WIDEN.z0) / WIDEN.ramp, (WIDEN.z1 - z) / WIDEN.ramp));
const midN4 = (z: number) => (xWest(z) + xEast(z)) / 2;
/** the drawn inner edges: the southbound carriageway's east edge, the northbound's west edge */
export const westInner = (z: number) => { const e = xWest(z) + 4.5; return e + Math.max(0, midN4(z) - MED_HALF - e) * widenK(z); };
export const eastInner = (z: number) => { const e = xEast(z) - 4.5; return e - Math.max(0, e - midN4(z) - MED_HALF) * widenK(z); };
/** how far east (+) or west (-) a point on an N4 carriageway's centre line has its inner edge pushed out */
export const n4Widen = (x: number, z: number) => {
  if (z < WIDEN.z0 || z > WIDEN.z1) return 0;
  const w = xWest(z), e = xEast(z);
  if (Math.abs(x - w) < 1.5) return westInner(z) - (w + 4.5);
  if (Math.abs(x - e) < 1.5) return eastInner(z) - (e - 4.5);
  return 0;
};
/** the widening as road pieces (x0, z0, x1, z1, half) for the clearance tests, every 3 m down each carriageway */
export const N4_WIDE: [number, number, number, number, number][] = [];
for (let z = WIDEN.z0; z < WIDEN.z1; z += 3) for (const west of [true, false]) {
  const band = (zz: number): [number, number] => west ? [xWest(zz) + 4.5, westInner(zz)] : [eastInner(zz), xEast(zz) - 4.5];
  const [a0, b0] = band(z), [a1, b1] = band(z + 3);
  if ([a0, b0, a1, b1].some(Number.isNaN) || b0 - a0 < 0.05) continue;
  N4_WIDE.push([(a0 + b0) / 2, z, (a1 + b1) / 2, z + 3, (b0 - a0) / 2 + 0.3]);
}

/** the junction box where La Bawaleshie Road and Jubilee Drive cross the N4 (the road itself is built from its plan,
 *  okjplan.ts; the signal posts stand on its four corner verges and the two median noses, okjIslands there). ISLANDS are
 *  the earlier spots, kept for reference (Pairs 5-7, 10) */
export const JUNCTION = { x0: 958, x1: 1028, z0: 1195, z1: 1262 };
export const ISLANDS: Record<'nw' | 'ne' | 'se' | 'sw' | 'mn' | 'ms', [number, number]> = { nw: [967, 1209], ne: [1019, 1204], se: [1025, 1241], sw: [966, 1243], mn: [987.3, 1185], ms: [997.9, 1242.5] };

/** the signal assemblies (the Okponglo signals brief, pictures 1, 2, 11): per island the unit direction its face looks
 *  (toward the approaching traffic) and, for a mast-arm, the arm's direction over that approach's lanes and its reach.
 *  Heights are calibrated, not measured (no metres in the sources); the reach spans the approach's middle lanes (the
 *  junction brief of 2026-10-16: four on the N4, three on Jubilee Drive) */
export const SIGNAL = { mast: 7.2, pole: 5.4, armY: 6.6, lowY: 2.9, heads: [0.62, 0.92] };
export const SIGNALS = {
  mn: { face: [0, -1] as P2, arm: [-1, 0] as P2, reach: 14 },
  ms: { face: [0, 1] as P2, arm: [1, 0] as P2, reach: 14 },
  sw: { face: [-1, 0] as P2, arm: [0, -1] as P2, reach: 9.5 },
  ne: { face: [1, 0] as P2, arm: [0, 1] as P2, reach: 11 },
  nw: { face: [1, 0] as P2, arm: [0, 0] as P2, reach: 0 },
  se: { face: [-1, 0] as P2, arm: [0, 0] as P2, reach: 0 },
};

/** the median between the carriageways: kerbed patchy grass and red earth, young planted trees (Pairs 1, 2, 4, 9, 13) */
// (the owner, 2026-10-16, on a screenshot: the median's last stretch before the junction on each side taken off, the
// INSTANT ADMISSION pylon and the A-frame with it, the road asphalt there, and each new end a half circle: gap
// [1179.5, 1257] became [1158, 1278.5])
export const MEDIAN = { z0: 905, z1: 1640, gap: [1158, 1278.5] as [number, number], tree: 19 };
/** each junction end of the median: its half circle's centre (the straight edges end there) and radius */
export function medianCap(end: 0 | 1) {
  const z = MEDIAN.gap[end], r = Math.max(0.6, (eastInner(z) - westInner(z)) / 2), zc = end === 0 ? z - r : z + r;
  // (centred on the median's middle where the straight edges end, so the half circle meets them: the owner saw a seam)
  return { zc, r, x: (westInner(zc) + eastInner(zc)) / 2 };
}
/** whether (x, z) is on the median: between its kerbs, outside the junction's gap, inside the half circles at its ends */
export function onMedian(x: number, z: number) {
  if (z < MEDIAN.z0 || z > MEDIAN.z1 || (z > MEDIAN.gap[0] && z < MEDIAN.gap[1])) return false;
  const a = westInner(z), o = eastInner(z);
  if (Number.isNaN(a) || Number.isNaN(o) || x < a || x > o) return false;
  for (const end of [0, 1] as const) {
    const c = medianCap(end);
    if (end === 0 ? z > c.zc : z < c.zc) return Math.hypot(x - c.x, z - c.zc) <= c.r;
  }
  return true;
}

/** the neighbourhood east of the N4 (Pairs 2, 4, 11, 12, 15-19; Additional References 3 to 6): every footprint here is
 *  built as the local mixed commercial fabric, not the campus template */
export const HOOD = { z0: 958, z1: 1648, x1: 1462, off: 5 };
export const inHood = (x: number, z: number) => z > HOOD.z0 && z < HOOD.z1 && x < HOOD.x1 && x > xEast(Math.max(HOOD.z0 + 1, Math.min(HOOD.z1 - 1, z))) + E_HALF + HOOD.off;
/** the compound beyond the scrub west of the N4 (the background roofs of Pair 3; the aerial's blue and grey roofs) */
export const COMPOUND = { x0: 740, x1: 895, z0: 820, z1: 1078 };
export const inCompound = (x: number, z: number) => x > COMPOUND.x0 && x < COMPOUND.x1 && z > COMPOUND.z0 && z < COMPOUND.z1;

/** a footprint picked out by its box (the mapped outline's bounds, rounded) */
export type Box = [number, number, number, number];
export interface Pick { box: Box; name: string; storeys: number; wall: string; roof: 'flat' | 'metal'; roofColor?: string; accent?: string; note: string }
/** footprints the photographs identify (osm ids for reference). (The Okponglo brief, okponglo.ts, rebuilds the cream
 *  block with the orange accents as First Eye Plaza, the retail corner as the 3D sign shop and the block behind it, the
 *  outline the map calls Diamed as Pro Vision, and the commercial block of the earlier Pair 15: their picks are gone.) */
export const PICKS: Pick[] = [
  { box: [993, 1031, 1017, 1031], name: 'gra', storeys: 4, wall: '#e6d3aa', roof: 'flat', note: 'osm:way/758602538 by the Ghana Revenue Authority: the compact beige institutional block with the tall dark grey face toward the road, few openings (Pairs 1, 2)' },
  { box: [1042, 1053, 1169, 1181], name: 'beigeback', storeys: 3, wall: '#dccaa2', roof: 'flat', note: 'osm:way/1518873624: the taller beige mass behind the low yellow frontage (Pair 11)' },
  { box: [1091, 1106, 1530, 1543], name: 'greengable', storeys: 1, wall: '#7fae5c', roof: 'metal', roofColor: '#3f6e3e', note: 'osm:way/1289415412: the individually shaped green gable-front structure (Pair 16)' },
  { box: [1092, 1111, 1550, 1576], name: 'redtrim', storeys: 1, wall: '#f2eee5', roof: 'metal', roofColor: '#a8443a', accent: '#b9302b', note: 'osm:way/675703101: the pale low building with red trim (Pair 16)' },
];
export const pickOf = (b: { minX: number; maxX: number; minZ: number; maxZ: number }) =>
  PICKS.find((p) => Math.abs(b.minX - p.box[0]) < 1.5 && Math.abs(b.maxX - p.box[1]) < 1.5 && Math.abs(b.minZ - p.box[2]) < 1.5 && Math.abs(b.maxZ - p.box[3]) < 1.5);

/** frontages the photographs and the satellite crop show where the map has no outline: x0, x1, z0, z1, storeys, wall,
 *  roof, accent; each one a guess at its extent (Pairs 11, 17-19, Additional Reference 3). (The Okponglo brief builds the
 *  low yellow frontage as the ALPHA LED shop, and in place of the two frontages along La Bawaleshie Road's south side
 *  the larger neighbour set back behind the open forecourt the aerial A03 shows: okplan.ts.) */
export interface Mass { r: Box; storeys: number; wall: string; roof: 'flat' | 'metal'; roofColor?: string; accent?: string; shopFace: 'z0' | 'z1' | 'x0' | 'x1'; display?: boolean; note: string }
export const MASSES: Mass[] = [
  { r: [1043.5, 1051, 1198, 1207], storeys: 1, wall: '#d7d2c4', roof: 'metal', roofColor: '#8f969a', shopFace: 'z1', note: 'small metal-roofed shop (Pair 17)' },
  { r: [1052.5, 1061.5, 1197.5, 1206.5], storeys: 1, wall: '#c8dbe6', roof: 'metal', roofColor: '#8a5a3c', shopFace: 'z1', note: 'small metal-roofed shop (Pair 17)' },
  { r: [1070, 1086, 1195, 1205.5], storeys: 2, wall: '#ecdcb4', roof: 'flat', accent: '#3a78b8', shopFace: 'z1', note: 'cream two-level shop block with a gallery (Pair 18)' },
];

/** the lattice communications mast behind the beige block (Pairs 1, 2; spot inferred): x, z, height */
export const MAST: [number, number, number] = [1040, 1037, 42];
/** roadside structures placed off a carriageway's outer edge: z, side ('W' west of the southbound carriageway, 'E' east
 *  of the northbound one), metres out from the edge, kind. Tall panels on single steel posts (Pairs 2, 9, 13, 15),
 *  empty steel frames (Pair 14), the slender lattice mast in the stadium-side verge (Pair 14). Spots inferred; no
 *  advertisement is copied. */
export type Side = 'W' | 'E';
export const ROADSIDE: [number, Side, number, 'panel' | 'tall' | 'frame' | 'mast'][] = [
  [1045, 'E', 9, 'tall'], [1296, 'W', 8, 'panel'], [1350, 'W', 10, 'frame'], [1362, 'W', 17, 'mast'], [1395, 'W', 8, 'panel'],
  [1452, 'W', 9, 'frame'], [1478, 'E', 8, 'tall'],
];
/** a point `off` metres out from a carriageway's outer edge at z, pushed farther out past any footway it would stand on */
export const offEdge = (z: number, side: Side, off: number): [number, number] => {
  for (let o = off; o < off + 14; o += 1) {
    const p: [number, number] = side === 'W' ? [xWest(z) - W_HALF - o, z] : [xEast(z) + E_HALF + o, z];
    if (edgeClearance(p[0], p[1], true) > 1.2) return p;
  }
  return side === 'W' ? [xWest(z) - W_HALF - off, z] : [xEast(z) + E_HALF + off, z];
};
/** the half width a road is drawn at (the N4's carriageways at their mapped widths) */
export const halfOf = (r: { cls: number; name?: string }) => (r.cls === 0 && r.name === 'J.J. Rawlings Avenue' ? 4.95 : [9, 7.4, 6.2, 4.6, 2.6][r.cls] / 2);
/** distance from (x, z) to the nearest road edge (footways too with `paths`), looking about 20 m round */
export function edgeClearance(x: number, z: number, paths = false) {
  let best = 20;
  for (const r of ROADS) {
    if (r.cls === 4 && !paths) continue;
    const h = halfOf(r);
    for (let i = 0; i < r.nodes.length - 1; i++) {
      const ax = NODE_XZ[r.nodes[i] * 2], az = NODE_XZ[r.nodes[i] * 2 + 1], bx = NODE_XZ[r.nodes[i + 1] * 2], bz = NODE_XZ[r.nodes[i + 1] * 2 + 1];
      if (Math.min(ax, bx) > x + 20 || Math.max(ax, bx) < x - 20 || Math.min(az, bz) > z + 20 || Math.max(az, bz) < z - 20) continue;
      const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
      best = Math.min(best, Math.hypot(ax + dx * t - x, az + dz * t - z) - h);
    }
  }
  for (const [ax, az, bx, bz, h] of N4_WIDE) {
    if (Math.abs(az - z) > 6) continue;
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(ax + dx * t - x, az + dz * t - z) - h);
  }
  return best;
}
/** the utility cabinet and the short bollards at the north-west corner (Pair 6) */
export const CABINET: [number, number] = [962.5, 1205];

/** the scrub west of the N4 north of the junction (Pair 3): dense unmanaged vegetation on uneven ground behind a narrow
 *  worn path and the kerb; how far back from the road it reaches */
export const SCRUB = { z0: 880, z1: 1186, path: [1.2, 2.6] as [number, number], depth: 46 };
/** the verge between the N4's southbound carriageway and the stadium car parks (Pairs 8, 14): the red brick path along
 *  the road, rough grass and earth, the steel fence along the car parks' service road */
export const VERGE_W = { z0: 1262, z1: 1630, path: [1.6, 3.4] as [number, number] };
/** the stadium car parks: paved and marked, mostly empty (the aerial, Pair 8), not a field of cars */
export const STADIUM_PARKS = { x0: 838, x1: 1012, z0: 1228, z1: 1505, fill: 0.1 };
/** the School of Engineering Sciences' car park (the owner's SES brief, its satellite picture): marked bays down the lot
 *  with about fifteen cars in some seventy bays, not a full lot */
export const ENG_PARK = { x0: 376, x1: 441, z0: -446, z1: -381, fill: 0.22 };
export const parkingFill = (cx: number, cz: number) =>
  [STADIUM_PARKS, ENG_PARK].find((p) => cx > p.x0 && cx < p.x1 && cz > p.z0 && cz < p.z1)?.fill;
/** car parks whose cars stand where the owner's pictures show them (x, z, yaw): the School of Engineering Sciences' nine
 *  cars from the owner's close satellite picture (engplan.ts), across the bays; the UGMC lots' bays (ugmcplan.ts); the Okponglo taxi lot's bays (okgateplan.ts) */
export const parkingSpots = (cx: number, cz: number): [number, number, number][] | undefined =>
  cx > ENG_PARK.x0 && cx < ENG_PARK.x1 && cz > ENG_PARK.z0 && cz < ENG_PARK.z1 ? ENG_CARS.map((c) => { const [x, z] = sat(c[0], c[1]); return [x, z, Math.PI / 2]; }) : ugmcSpots(cx, cz) ?? nogSpots(cx, cz) ?? evandySpots(cx, cz) ?? ogSpots(cx, cz);

/** where this work draws the ground beside the roads itself (the generic verge-and-drain strips stay out): the median,
 *  the scrub and the stadium-side verge, the neighbourhood's frontage */
export function ownsLb(x: number, z: number) {
  if (z < 870 || z > 1650) return false;
  const w = xWest(z), e = xEast(z);
  if (Number.isNaN(w) || Number.isNaN(e)) return false;
  if (x > w && x < e) return true;
  if (x <= w && x > w - 14) return true;
  return x >= e && x < e + 16;
}

/** the solids this work puts beside the roads, for the route checks: x, z, radius (the signal posts' exact spots are
 *  chosen in labawaleshie.ts near ISLANDS; the walls of the added frontages are their rectangles, MASSES) */
export function lbPosts(): [number, number, number][] {
  const out: [number, number, number][] = [[MAST[0], MAST[1], 1.6], [CABINET[0], CABINET[1], 0.7], [1051.5, 1239.9, 0.22], [1051.5, 1242.1, 0.22], [1052.7, 1241, 0.5]];
  for (const [z, side, off, kind] of ROADSIDE) {
    const [x, zz] = offEdge(z, side, off);
    if (kind === 'frame') out.push([x, zz - 2.6, 0.3], [x, zz + 2.6, 0.3]);
    else out.push([x, zz, kind === 'mast' ? 1.6 : 0.3]);
  }
  return out;
}
