// IPS Road from the UPSA junction to the UPSA Hostel (the owner's road-corridor and site briefs, 12 October 2026): the
// numbers ipsroad.ts models and the route tests check. Game metres: x east, z south. Everything is placed against the
// mapped roads (IPS Road, osm:way/515974988; the parallel frontage road south of it, osm:way/1499858648; the side roads)
// and the mapped outlines; the photographs set appearance and order only. Spots marked "inferred" are read from the
// photographs and Street View frames, not measured.
import { NODE_XZ, ROADS } from './campusmap';
import { agOwns } from './agplan';
import { ownsLb } from './lbplan';
import { ownsFs } from './fsplan';
import { ownsLf } from './lfplan';
import { ownsEc } from './ecgplan';
import { ownsOg } from './okgateplan';
import { ownsJj } from './jjplan';
import { ownsDj } from './djplan';

type Line = [number, number][];
/** the mapped road whose line passes within a metre of (x, z), of the given class */
function lineThrough(cls: number, x: number, z: number): Line {
  for (const r of ROADS) {
    if (r.cls !== cls) continue;
    const pts = r.nodes.map((n) => [NODE_XZ[n * 2], NODE_XZ[n * 2 + 1]] as [number, number]);
    if (pts.some(([px, pz]) => Math.hypot(px - x, pz - z) < 1)) return pts;
  }
  return [];
}
const zAt = (line: Line, x: number) => {
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i], [bx, bz] = line[i + 1];
    if ((x - ax) * (x - bx) <= 0 && ax !== bx) return az + ((bz - az) * (x - ax)) / (bx - ax);
  }
  return NaN;
};
/** IPS Road (the north carriageway in the map, class 1, 7.4 m) and the frontage road south of it (class 2, 6.2 m) */
export const IPS_LINE = lineThrough(1, 1508.8, -884.1);
export const FRONT_LINE = lineThrough(2, 1589.6, -867.5);
export const zIps = (x: number) => zAt(IPS_LINE, x);
export const zFront = (x: number) => zAt(FRONT_LINE, x);
export const IPS_HALF = 3.7, FRONT_HALF = 3.1;

/** the stretch this work models (west of it the UPSA junction models, upsa.ts, run to x 1300) */
export const CORRIDOR = { x0: 1205, x1: 1845 };

/** the sidewalk along IPS Road's north side (R13-R19: tan pavers laid herringbone between a kerb on the road and a kerb on
 *  the verge): its kerb face this far from the road's centre, its width */
export const NORTH_WALK = { x0: 1205, x1: 1845, from: IPS_HALF + 0.15, width: 2.6 };

/** the Presbyterian Boys' Senior High School (PRESEC) and its worship centre along the north side (IMG-01, IMG-02,
 *  IMG-15, IMG-16; R05-R09): the boundary this far north of IPS Road's centre; the old grey block wall to the west
 *  (R05-R07), the white wall with blue pilasters nearer the gate (R08, R09), the tall green mesh fence of the sports
 *  ground behind it, the arched gate where the school road (osm, x 1739) leaves IPS Road, the signboard (inferred
 *  spots) */
export const PRESEC = {
  wallOff: 9.4,
  oldWall: [1215, 1555] as [number, number],
  whiteWall: [1555, 1845] as [number, number],
  mesh: [1585, 1722] as [number, number],
  gate: { x: 1739.4, half: 4.3, house: 3.4 },
  sign: 1600,
};
/** the open drain along the inside of the north sidewalk where the school road crosses it (IMG-02, IMG-16, R21, R26) */
export const PRESEC_DRAIN = { x0: 1728, x1: 1751 };

/** the red-earth strip between IPS Road and the frontage road (IMG-04, IMG-14, R10-R12): kerbed along both roads, open
 *  where the side roads cross it (the VCG road at x 1663, the hostel and school roads at x 1731-1739) */
export const STRIP = { x0: 1300, x1: 1845, gaps: [[1657.5, 1669.5], [1725.5, 1745.5]] as [number, number][] };

/** the Vice Chancellors Ghana Office Complex compound (IMG-05 to IMG-09): its zig-zag front wall along the frontage
 *  road, the gate where its access road (osm:way/754146795, x 1664) passes the wall, the side walls (inferred) */
export const VCG = { front: -852.6, x0: 1659, x1: 1698.5, back: -790, gate: { x: 1664.8, half: 3.6 } };
/** the UPSA Hostel compound (IMG-03, IMG-04, R29, R30): the white wall-and-railing fence along the frontage road, the
 *  gate where the hostel road (osm:way/794296952, x 1731) passes it, the red-roofed shop building west of the gate
 *  (osm:way/1217291473) standing in the fence line; the fence stops short of the mapped footway to the east */
export const HOSTEL = { front: -848.6, x0: 1698.5, x1: 1806, gate: { x: 1731.2, half: 4.6 }, shop: [1698.5, 1710.8] as [number, number] };

/** the compounds' paved courts, drawn by upsahostel.ts: the mapped service roads inside them (the VCG side drive,
 *  osm:way/754146795 and /754146794; the hostel's forecourt loop, osm:way/794296950-794296952) are paved there in
 *  brick (VCG, IMG-06, IMG-07) and grey pavers (the hostel, R29), not asphalt (science.ts offAsphalt) */
export const PAVED_BOXES: [number, number, number, number][] = [[1659.4, 1698.2, -852.3, -790], [1711, 1772, -848.4, -812.5]];

/** the lattice transmission towers continuing east from the junction's (upsaplan.ts TOWERS: x 972, 1290) along the south
 *  side at the same spacing (R14-R16, IMG-14: inferred spots) */
export const TOWERS_E: [number, number][] = [[1608, -855.5], [1893, -856]];
/** wooden distribution poles along the north verge between the sidewalk and the wall (R05-R07, IMG-12, IMG-13;
 *  inferred spacing, uneven as in the photographs) */
export const N_POLES = [1248, 1291, 1337, 1380, 1424, 1471, 1512, 1556, 1601, 1647, 1690, 1782, 1828];
/** streetlights on the north verge, a curved arm over the road (R06, R16, IMG-13; inferred spots) */
export const N_LAMPS = [1268, 1318, 1366, 1404, 1450, 1494, 1538, 1580, 1626, 1668, 1712, 1760, 1806];
export const POLE_OFF = 7.6, LAMP_OFF = 7.0;

/** where a modelled site draws a road's edge itself, tested at a point on that edge: south of IPS Road's centre from the
 *  junction east (upsa.ts: the median and the south sidewalk; this corridor: the strip, the frontage road's verge), and
 *  north of it along this corridor (the sidewalk, the verge, the wall). There the campus's generic verge-and-drain strips
 *  (life.ts) and a ridden route's generic pavements, trees and lamps (world.ts) stay out */
export function ownsEdges(x: number, z: number) {
  // (and the Agriculture side's own footways, drains and aprons: agplan.ts)
  if (agOwns(x, z)) return true;
  // (and Jubilee Drive at the Okponglo entrance: its kerbs, footways, channel, fence and plot, okgate.ts)
  if (ownsOg(x, z)) return true;
  // (and the J.J. Rawlings Avenue yard, east opening and GRA frontage, jjyard.ts)
  if (ownsJj(x, z)) return true;
  // (and the Diamond Jubilee Hall's forecourt, verge and rear ground, diamondjubilee.ts)
  if (ownsDj(x, z)) return true;
  // (and the N4 by the stadium and La Bawaleshie: the median, the scrub, the verges, the frontage: labawaleshie.ts)
  if (ownsLb(x, z)) return true;
  // (and the fire station's La Road frontage and the R2 cluster's forecourt and court, firestation.ts, boateng.ts)
  if (ownsFs(x, z)) return true;
  // (and the N4 from the Legon overhead to Okponglo: the trading corner, the station, the plot, the corridor: legonfirst.ts)
  if (ownsLf(x, z)) return true;
  // (and the N4 by the ECG office: the strips, the divider, the verges, the compounds: ecg.ts)
  if (ownsEc(x, z)) return true;
  // (and on east of the hostel to the UPSA Main Gate: the strip, the roundabout's island, the median and both verges of
  // the divided road, upsacampus.ts)
  if (x >= CORRIDOR.x1 && x <= 2300 && z > -907 && z < -852) return true;
  if (x < 955 || x > CORRIDOR.x1) return false;
  const c = zIps(x);
  if (Number.isNaN(c)) return false;
  if (z > c && z < (Number.isNaN(zFront(x)) ? -846 : zFront(x) + 20)) return true;
  return x > CORRIDOR.x0 && z <= c && z > c - 16;
}

/** every solid the corridor adds outside the buildings and walls, for the route checks: x, z, radius */
export function corridorPosts(): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (const x of N_POLES) out.push([x, zIps(x) - POLE_OFF, 0.2]);
  for (const x of N_LAMPS) out.push([x, zIps(x) - LAMP_OFF, 0.15]);
  for (const [x, z] of TOWERS_E) for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push([x + sx * 3, z + sz * 3, 0.45]);
  for (const s of [-1, 1]) {
    out.push([PRESEC.gate.x + s * (PRESEC.gate.half + 0.4), zIps(PRESEC.gate.x) - PRESEC.wallOff, 0.5]);
    out.push([VCG.gate.x + s * (VCG.gate.half + 0.3), VCG.front, 0.35]);
    out.push([HOSTEL.gate.x + s * (HOSTEL.gate.half + 0.3), HOSTEL.front, 0.35]);
  }
  return out;
}
