// The Okponglo junction and its six connecting zones, rebuilt to the owner's strict correction brief of 2026-10-16
// (docs/okponglo-junction/README.md). The approved concept D-01 and the locked lane counts govern: the mapped slip
// roads, the earlier paved core and the uniform 13.7 m carriageways were the before-state, not the target. This module
// is the one source of the road's shape here: the road mesh and its markings (okjunction.ts), the map, the clearance
// tests of the generated props and the ground beside the road all read it. Game metres: x east, z south; D-01's
// page-up is north, its page-left west. Traffic keeps right.
//
// Zone ledger (lanes counted across a section, in the direction of travel):
//   1  N4 southbound north of the junction (west carriageway), toward it:  far 3, near 5 = 4 middle + 1 outer corner
//      lane (the top-left route into zone 6). Widening from the RW-02 red marker.
//   2  N4 northbound north of the junction (east carriageway), away:  near 4 = 3 middle + 1 outer lane joining from
//      zone 3 (the top-right route), tapering to far 3.
//   3  La Bawaleshi Road, the east arm, two-way:  near 5 total = 3 middle (2 toward the junction, 1 away) + 2 outer
//      (the inbound top-right route to zone 2, the outbound bottom-right route from zone 4); far 2 (1 each way).
//   4  N4 northbound south of the junction (east carriageway), toward it:  far 3, near 5 = 4 middle + 1 outer corner
//      lane (the bottom-right route into zone 3). Widening at the RW-04 violet markers.
//   5  N4 southbound south of the junction (west carriageway), away:  4 asphalt = 3 middle + the outer lane from zone 6
//      (the bottom-left route); from the RW-04 red markers 4 asphalt + 1 concrete stopping bay; at the green markers
//      the bay and the outer lane end, and 3 through lanes continue.
//   6  Jubilee Drive, the west arm (the taxi-rank side), two-way:  near 5 total = 3 middle (1 away, 2 toward) + 2 outer
//      (the inbound top-left route from zone 1, the outbound bottom-left route to zone 5); far 2 (1 each way).
// The planted median stays on the N4; both of its junction ends are pulled back (U-01's purple lines, MEDIAN.gap in
// lbplan.ts). No thin raised separator divides a corner lane from the road: the four corners are one asphalt surface
// with a kerbed outer edge, the lanes divided by paint.
//
// Calibrated, not surveyed (D-01 is schematic): lane widths, corner radii, taper lengths and the transition ends, which
// are placed from the owner's marked satellite views by their landmarks (RW-02: the widening begins about 100 m north
// of the junction, by the Ghana Revenue Authority's block; RW-04: the bay from about 80 m south of the junction to
// about 200 m, beyond Leasafric; the zone 4 widening between them).
import { MEDIAN, WIDEN, eastInner, westInner, xEast, xWest } from './lbplan';

type P2 = [number, number];
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
/** a smooth 0..1 between a and b (a > b runs it backwards) */
const ramp = (v: number, a: number, b: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

/** the N4's lane width, and the side arms' lanes near the junction and far out (far 2 lanes are the mapped 7.4 m) */
export const LANE = 3.5;
const SL_NEAR = 3.3, SL_FAR = 3.7;

/** the transitions (z along the N4, x along the side arms), from the owner's marked views; see the ledger above */
export const ZONES = {
  1: { far: 3, near: 5, widen: [1090, 1130] as P2 },
  2: { near: 4, far: 3, merge: [1140, 1110] as P2 },
  3: { near: 5, far: 2, taper: [1033, 1055] as P2 },
  4: { far: 3, near: 5, widen: [1340, 1300] as P2 },
  5: { near: 4, far: 3, bay: [1307, 1322, 1407, 1422] as [number, number, number, number], merge: [1422, 1447] as P2 },
  6: { near: 5, far: 2, taper: [950, 928] as P2 },
};
/** the concrete stopping bay's full width */
export const BAY_W = 3;
/** the corners' kerb radius */
export const CORNER_R = 12;
/** the stop lines (z across the N4, x across the arms) and the pedestrian crossings just beyond them */
export const STOP = { n: 1193.5, s: 1243.5, w: 955.5, e: 1031 };
export const ZEBRA = { n: [1194.5, 1197.5] as P2, s: [1239.5, 1242.5] as P2, w: [956.5, 959.5] as P2, e: [1027, 1030] as P2 };

// ---------------------------------------------------------------------------------------------------------------
// the N4
// ---------------------------------------------------------------------------------------------------------------
export const midN4 = (z: number) => (xWest(z) + xEast(z)) / 2;
/** the N4's slope (dx/dz) and the horizontal factor that turns a width across it into an x offset */
const slopeN4 = (z: number) => (midN4(z + 8) - midN4(z - 8)) / 16;
export const hfN4 = (z: number) => Math.hypot(1, slopeN4(z));
const kN4 = (z: number) => clamp01(Math.min((z - WIDEN.z0) / WIDEN.ramp, (WIDEN.z1 - z) / WIDEN.ramp));
export const inGap = (z: number) => z > MEDIAN.gap[0] && z < MEDIAN.gap[1];

// ---------------------------------------------------------------------------------------------------------------
// the side arms: one centre line through the junction (Jubilee Drive west, La Bawaleshi Road east), joining the
// mapped single roads at their nodes (923.2, 1231.9) and (1066.2, 1215.1)
// ---------------------------------------------------------------------------------------------------------------
const CL: P2[] = [[923.2, 1231.9], [945, 1229.8], [966, 1228.0], [994, 1224.5], [1026, 1220.4], [1032.4, 1219.1], [1046.3, 1217.2], [1066.2, 1215.1]];
export const ARM = { x0: CL[0][0], x1: CL[CL.length - 1][0] };
export const clz = (x: number) => {
  for (let i = 0; i < CL.length - 1; i++) { const [ax, az] = CL[i], [bx, bz] = CL[i + 1]; if (x <= bx || i === CL.length - 2) return az + ((bz - az) * (x - ax)) / (bx - ax); }
  return NaN;
};
const hfArm = (x: number) => Math.hypot(1, (clz(x + 3) - clz(x - 3)) / 6);
/** where the arms' centre line crosses the N4's median line */
export const XM = (() => { let x = 994; for (let i = 0; i < 30; i++) x = midN4(clz(x)); return x; })();
export const ZMID = clz(XM);

/** zone 1 (west, north of ZMID) and zone 5 (west, south) */
export const westLanes = (z: number) => z < ZMID ? 3 + 2 * ramp(z, ZONES[1].widen[0], ZONES[1].widen[1]) : 4 - ramp(z, ZONES[5].merge[0], ZONES[5].merge[1]);
/** zone 2 (east, north) and zone 4 (east, south) */
export const eastLanes = (z: number) => z < ZMID ? 3 + ramp(z, ZONES[2].merge[1], ZONES[2].merge[0]) : 3 + 2 * ramp(z, ZONES[4].widen[0], ZONES[4].widen[1]);
/** the carriageways' edges: inner (the median kerb; in the median's gap the median line) and outer (the kerb) */
export const wInner = (z: number) => (inGap(z) ? midN4(z) : westInner(z));
export const eInner = (z: number) => (inGap(z) ? midN4(z) : eastInner(z));
export const wOuter = (z: number) => { const a = xWest(z) - 4.5, b = westInner(z) - westLanes(z) * LANE * hfN4(z); return a + (b - a) * kN4(z); };
export const eOuter = (z: number) => { const a = xEast(z) + 4.5, b = eastInner(z) + eastLanes(z) * LANE * hfN4(z); return a + (b - a) * kN4(z); };
/** the lane lines' spacing across each carriageway (LANE, except over the stretch's end ramps) */
export const wLane = (z: number) => (westInner(z) - wOuter(z)) / westLanes(z);
export const eLane = (z: number) => (eOuter(z) - eastInner(z)) / eastLanes(z);
/** zone 5's concrete stopping bay: its width at z (0 outside it) and its outer edge */
export const bayWidth = (z: number) => { const [a, b, c, d] = ZONES[5].bay; return z <= a || z >= d ? 0 : BAY_W * Math.min(ramp(z, a, b), 1 - ramp(z, c, d)); };
export const bayOuter = (z: number) => wOuter(z) - bayWidth(z) * hfN4(z);
/** the outermost paved edge on the west (the bay's edge along it) */
export const westEdge = (z: number) => Math.min(wOuter(z), bayOuter(z));

const armNear = (x: number) => (x < XM ? ramp(x, ZONES[6].taper[1], ZONES[6].taper[0]) : ramp(x, ZONES[3].taper[1], ZONES[3].taper[0]));
export const armLane = (x: number) => SL_FAR + (SL_NEAR - SL_FAR) * armNear(x);
/** lanes north of the arm's direction divider (westbound) and south of it (eastbound) */
export const armLanes = (x: number): P2 => { const n = armNear(x); return x < XM ? [1 + n, 1 + 2 * n] : [1 + 2 * n, 1 + n]; };
/** the arm's north and south kerbs at x */
export const armEdges = (x: number): P2 => { const [a, b] = armLanes(x), w = armLane(x) * hfArm(x), c = clz(x); return [c - a * w, c + b * w]; };

// ---------------------------------------------------------------------------------------------------------------
// the four corners: the outer kerb rounded between the N4's outer edge and the arm's, one asphalt surface
// ---------------------------------------------------------------------------------------------------------------
export interface Corner {
  key: 'nw' | 'ne' | 'sw' | 'se';
  /** where the two straight kerbs would meet, the arc's centre, its tangent points on the N4 kerb (t1) and the arm's (t2) */
  p: P2; c: P2; t1: P2; t2: P2;
  /** the unit directions from p along the N4 away from the junction (u) and along the arm away from it (v) */
  u: P2; v: P2;
  /** the arc's points from t1 to t2 */
  arc: P2[];
}
function corner(key: Corner['key']): Corner {
  const north = key[0] === 'n', west = key[1] === 'w';
  const n4 = (z: number) => (west ? wOuter(z) : eOuter(z));
  const arm = (x: number) => armEdges(x)[north ? 0 : 1];
  let z = ZMID;
  for (let i = 0; i < 40; i++) z = arm(n4(z));
  const p: P2 = [n4(z), z];
  const d = 0.5, ex = (n4(z + d) - n4(z - d)) / (2 * d), ez = (arm(p[0] + d) - arm(p[0] - d)) / (2 * d);
  const nrm = (a: P2): P2 => { const l = Math.hypot(a[0], a[1]); return [a[0] / l, a[1] / l]; };
  const u = nrm(north ? [-ex, -1] : [ex, 1]), v = nrm(west ? [-1, -ez] : [1, ez]);
  const half = Math.acos(Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1]))) / 2;
  const t = CORNER_R / Math.tan(half), b = nrm([u[0] + v[0], u[1] + v[1]]), cd = CORNER_R / Math.sin(half);
  const t1: P2 = [p[0] + u[0] * t, p[1] + u[1] * t], t2: P2 = [p[0] + v[0] * t, p[1] + v[1] * t], c: P2 = [p[0] + b[0] * cd, p[1] + b[1] * cd];
  let a1 = Math.atan2(t1[1] - c[1], t1[0] - c[0]), a2 = Math.atan2(t2[1] - c[1], t2[0] - c[0]);
  while (a2 - a1 > Math.PI) a2 -= Math.PI * 2;
  while (a1 - a2 > Math.PI) a2 += Math.PI * 2;
  const arc: P2[] = [];
  for (let i = 0; i <= 24; i++) { const a = a1 + ((a2 - a1) * i) / 24; arc.push([c[0] + Math.cos(a) * CORNER_R, c[1] + Math.sin(a) * CORNER_R]); }
  return { key, p, c, t1, t2, u, v, arc };
}
export const CORNERS: Corner[] = (['nw', 'ne', 'sw', 'se'] as const).map(corner);
const inTri = (x: number, z: number, a: P2, b: P2, c: P2) => {
  const s = (p: P2, q: P2) => (q[0] - p[0]) * (z - p[1]) - (q[1] - p[1]) * (x - p[0]);
  const d1 = s(a, b), d2 = s(b, c), d3 = s(c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};
const inCorner = (x: number, z: number, k: Corner) => inTri(x, z, k.p, k.t1, k.t2) && Math.hypot(x - k.c[0], z - k.c[1]) > CORNER_R;

// ---------------------------------------------------------------------------------------------------------------
// queries
// ---------------------------------------------------------------------------------------------------------------
/** the box round everything this module paves */
export const OKJ_BOX = { x0: 915, x1: 1080, z0: WIDEN.z0 - 1, z1: WIDEN.z1 + 1 };
/** what is at (x, z): 0 nothing of this road, 1 asphalt carriageway, 2 the concrete stopping bay */
export function okjSurface(x: number, z: number): 0 | 1 | 2 {
  if (x < OKJ_BOX.x0 - 20 || x > OKJ_BOX.x1 + 20 || z < OKJ_BOX.z0 || z > OKJ_BOX.z1) return 0;
  if (z >= WIDEN.z0 && z <= WIDEN.z1) {
    const wo = wOuter(z);
    if (x >= wo && x <= wInner(z)) return 1;
    if (x >= eInner(z) && x <= eOuter(z)) return 1;
    if (x < wo && x >= bayOuter(z) && bayWidth(z) > 0) return 2;
  }
  if (x > ARM.x0 && x < ARM.x1) { const [a, b] = armEdges(x); if (z >= a && z <= b) return 1; }
  for (const k of CORNERS) if (inCorner(x, z, k)) return 1;
  return 0;
}
export const onOkRoad = (x: number, z: number) => okjSurface(x, z) !== 0;

/** the mapped roads this module replaces: the N4 through the median's stretch, the side roads' pieces in the junction
 *  (the mapped slip roads and connectors included); any other road is cut where it meets this one */
const JUNCTION_NAMES = new Set(['Jubilee Drive', 'La Bawaleshi Road', 'Academic Freedom Road']);
export function okjOwns(r: { cls: number; name?: string }, x: number, z: number) {
  if (r.cls === 0 && r.name === 'J.J. Rawlings Avenue') return z > WIDEN.z0 && z < WIDEN.z1;
  if (r.name && JUNCTION_NAMES.has(r.name) && x > ARM.x0 + 0.05 && x < ARM.x1 - 0.05 && z > 1170 && z < 1265) return true;
  return onOkRoad(x, z);
}
/** a road's line split into the runs it keeps (cut exactly where it meets this road), for the road mesh and the map */
export function okjRuns(r: { cls: number; name?: string }, pts: P2[]): P2[][] {
  const near = pts.some(([x, z]) => x > OKJ_BOX.x0 - 60 && x < OKJ_BOX.x1 + 60 && z > OKJ_BOX.z0 - 60 && z < OKJ_BOX.z1 + 60);
  if (!near) return [pts];
  const own = (p: P2) => okjOwns(r, p[0], p[1]);
  const cut = (a: P2, b: P2): P2 => {
    const ia = own(a);
    let lo = 0, hi = 1;
    for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (own([a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m]) === ia) lo = m; else hi = m; }
    const m = ia ? hi : lo;
    return [a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m];
  };
  const out: P2[][] = [];
  let cur: P2[] = own(pts[0]) ? [] : [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
    // (sampled every metre, so a road crossing this one between two of its nodes is cut too)
    let qa = a, oa = own(a);
    for (let s = 1; s <= steps; s++) {
      const q: P2 = s === steps ? b : [a[0] + ((b[0] - a[0]) * s) / steps, a[1] + ((b[1] - a[1]) * s) / steps], oq = own(q);
      if (oq !== oa) {
        const c = cut(qa, q);
        if (oq) { cur.push(c); if (cur.length >= 2) out.push(cur); cur = []; } else cur = [c];
      }
      if (!oq && s === steps) cur.push(q);
      qa = q; oa = oq;
    }
  }
  if (cur.length >= 2) out.push(cur);
  return out;
}

/** the road as capsules (x0, z0, x1, z1, half) for the clearance tests: the carriageways every 2 m, the bay, the arms,
 *  the corners as fans */
export const OKJ_SEGS: [number, number, number, number, number][] = [];
{
  const band = (z: number, a: number, b: number, z2: number, a2: number, b2: number) => { if (b - a > 0.05 && b2 - a2 > 0.05) OKJ_SEGS.push([(a + b) / 2, z, (a2 + b2) / 2, z2, Math.max(b - a, b2 - a2) / 2]); };
  for (let z = WIDEN.z0; z < WIDEN.z1; z += 2) {
    const z2 = Math.min(WIDEN.z1, z + 2);
    if (inGap(z) || inGap(z2)) band(z, wOuter(z), eOuter(z), z2, wOuter(z2), eOuter(z2));
    else { band(z, wOuter(z), westInner(z), z2, wOuter(z2), westInner(z2)); band(z, eastInner(z), eOuter(z), z2, eastInner(z2), eOuter(z2)); }
    if (bayWidth(z) > 0 || bayWidth(z2) > 0) band(z, bayOuter(z), wOuter(z), z2, bayOuter(z2), wOuter(z2));
  }
  for (let x = ARM.x0; x < ARM.x1; x += 2) {
    const x2 = Math.min(ARM.x1, x + 2), [a, b] = armEdges(x), [a2, b2] = armEdges(x2);
    OKJ_SEGS.push([x, (a + b) / 2, x2, (a2 + b2) / 2, Math.max(b - a, b2 - a2) / 2]);
  }
  for (const k of CORNERS) for (let i = 0; i < k.arc.length; i++) OKJ_SEGS.push([k.p[0], k.p[1], k.arc[i][0], k.arc[i][1], 0.5]);
}

/** the road's outline as polygons for the map: the carriageways, the arms, the corners (asphalt) and the bay (concrete) */
export function okjMapPolys(): { asphalt: P2[][]; bay: P2[][] } {
  const asphalt: P2[][] = [], bay: P2[][] = [];
  const zs: number[] = [];
  for (let z = WIDEN.z0; z <= WIDEN.z1; z += 2) zs.push(z);
  asphalt.push([...zs.map((z): P2 => [wOuter(z), z]), ...zs.slice().reverse().map((z): P2 => [wInner(z), z])]);
  asphalt.push([...zs.map((z): P2 => [eInner(z), z]), ...zs.slice().reverse().map((z): P2 => [eOuter(z), z])]);
  const xs: number[] = [];
  for (let x = ARM.x0; x <= ARM.x1; x += 2) xs.push(x);
  asphalt.push([...xs.map((x): P2 => [x, armEdges(x)[0]]), ...xs.slice().reverse().map((x): P2 => [x, armEdges(x)[1]])]);
  for (const k of CORNERS) asphalt.push([k.p, ...k.arc]);
  const bz = zs.filter((z) => z >= ZONES[5].bay[0] && z <= ZONES[5].bay[3]);
  bay.push([...bz.map((z): P2 => [bayOuter(z), z]), ...bz.slice().reverse().map((z): P2 => [wOuter(z), z])]);
  return { asphalt, bay };
}

/** where the signal posts stand: on each corner's verge behind the middle of its kerb arc (behind the footway there), and on the two median noses
 *  just back from the pulled-back tips (labawaleshie.ts places the posts, the verges' paving and the bollards round them) */
export function okjIslands(): Record<'nw' | 'ne' | 'se' | 'sw' | 'mn' | 'ms', P2> {
  const out = {} as Record<'nw' | 'ne' | 'se' | 'sw' | 'mn' | 'ms', P2>;
  for (const k of CORNERS) { const m = k.arc[12], d = Math.hypot(k.c[0] - m[0], k.c[1] - m[1]); out[k.key] = [m[0] + ((k.c[0] - m[0]) / d) * 3.4, m[1] + ((k.c[1] - m[1]) / d) * 3.4]; }
  out.mn = [midN4(MEDIAN.gap[0] - 1), MEDIAN.gap[0] - 1];
  out.ms = [midN4(MEDIAN.gap[1] + 1), MEDIAN.gap[1] + 1];
  return out;
}
