// Numbers for the University of Ghana Medical Centre precinct (ugmc.ts, ugmcground.ts), from the owner's UGMC brief
// (docs/ugmc/: Google satellite M1 registered on the game map at 2.55 px/m, no rotation: x = -155.5 + px / 2.55,
// z = 1933.7 + py / 2.55; the brief's 47 aerial frames A01-A47 and 42 photographs E01-E42 for heights and finishes).
// The site's own frame: U along the precinct's grid (north-east, the axis below), V across it (south-east), origin
// at the main roundabout (location 11 of the brief). Footprints are traced from M1 on that grid; heights are read
// from the photographs and are provisional (docs/ugmc/evidence-ledger.md). Game metres, x east, z south.

export type P2 = [number, number];
export type R4 = [number, number, number, number];

export const UG = { origin: [156.3, 2068.2] as P2, axis: [0.866025, -0.5] as P2, storey: 4 };
const [OX, OZ] = UG.origin, [AX, AZ] = UG.axis;
/** site frame to world */
export const ugWorld = (u: number, v: number): P2 => [OX + AX * u - AZ * v, OZ + AZ * u + AX * v];
/** world to site frame */
export const ugLocal = (x: number, z: number): P2 => [(x - OX) * AX + (z - OZ) * AZ, -(x - OX) * AZ + (z - OZ) * AX];

/** points on a circular arc (site frame), angles in degrees, from a0 to a1 */
export const arc = (c: P2, r: number, a0: number, a1: number, n: number): P2[] =>
  Array.from({ length: n + 1 }, (_, i) => { const a = ((a0 + (n ? ((a1 - a0) * i) / n : 0)) * Math.PI) / 180; return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)] as P2; });

/** 01 Central Emergency & Diagnostics: the clinical core, its north-east corner cut by the concave curtain wall that
 *  wraps the drop-off loop (M1: the loop and its lawn; A12-A17: the curved dark glass entrance) */
export const CORE = { x0: -93, x1: -26, z0: 12, z1: 79, floors: 4, arc: { c: [-22, 10] as P2, r: 25 } };
const coreArc = (n: number) => {
  const { c, r } = CORE.arc, a0 = (Math.atan2(CORE.z0 - c[1], -Math.sqrt(r * r - (CORE.z0 - c[1]) ** 2)) * 180) / Math.PI;
  const a1 = (Math.atan2(Math.sqrt(r * r - (CORE.x1 - c[0]) ** 2), CORE.x1 - c[0]) * 180) / Math.PI;
  return arc(c, r, a0, a1, n);
};
export const CORE_ARC = coreArc(16);

/** 03 Outpatients & Administration: tan wings round an open lawn court, the bowed curtain wall at the corner facing
 *  the roundabout (M1; A09-A11, E14, E25, E39) */
export const OPD = {
  north: [12, 57.5, 15, 30] as R4, west: [-8, 7, 32, 82.5] as R4, east: [45, 57.5, 30, 82.5] as R4, south: [7, 45, 71, 82.5] as R4,
  court: [7, 45, 30, 71] as R4, floors: 3, bow: { a: [-8, 32] as P2, b: [12, 15] as P2, bulge: -2.5 },
};
/** the bow: the chord from a to b bulging `bulge` m away from the court (toward the roundabout); a negative bulge
 *  recesses the middle into the building. The UGMC audit (UGMC-001; E14, E25, E32, E39): the Outpatients glass is
 *  concave, its middle set back from the line between its ends, so the bulge is negative. */
export const bowPts = (a: P2, b: P2, bulge: number, n = 12): P2[] => {
  const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
  const nx = dz / l, nz = -dx / l; // outward (away from the court, toward the roundabout)
  return Array.from({ length: n + 1 }, (_, i) => { const t = i / n, s = 4 * t * (1 - t) * bulge; return [a[0] + dx * t + nx * s, a[1] + dz * t + nz * s] as P2; });
};
export const OPD_BOW = bowPts(OPD.bow.a, OPD.bow.b, OPD.bow.bulge);

/** 02 Women & Children: the signed parking front, the garden-facing west wing under the raised dark gridded roof,
 *  the east wing, the south block toward the core, an inner low block between courts, and the low portal over the
 *  curved drive on the east (M1; A04-A08, A20-A47, E23, E26, E31) */
export const WC = {
  front: [-90, -22, -70, -56] as R4, west: [-90, -62, -56, -6] as R4, east: [-36, -27, -56, -26] as R4, eastS: [-36, -22, -26, -6] as R4,
  south: [-62, -36, -18, -6] as R4, inner: [-56, -42, -48, -28] as R4, floors: 4,
  /** the raised dark gridded sloped roof over the west wing */
  gridRoof: [-86, -66, -64, -28] as R4,
  /** the dark glazed bay with the sign on the parking front */
  bay: [-60, -50] as P2,
  /** the portal over the drive: its roof and the posts on the drive's far side */
  portal: [-27, -15, -44, -30] as R4,
};

/** 04 Medical Training & Simulation Center (E17-E19, E29; A03) */
export const SIM = { box: [22, 60, -62, -18] as R4, floors: 3, bay: [36, 46] as P2, gridRoof: [33, 51, -53, -36] as R4 };

/** 05 Patient Tower group (E16, E21, E24, E41; A30): wings round courts, tall end masses either side of the low
 *  signed entrance on the east, toward the small roundabout */
export const PT = {
  north: [-92, -36, 92, 104] as R4, west: [-92, -80, 104, 157] as R4, spine: [-71, -60, 104, 157] as R4, south: [-80, -36, 145, 157] as R4,
  towerN: [-48, -36, 104, 117] as R4, towerS: [-48, -36, 132, 145] as R4, mid: [-60, -48, 117, 132] as R4, floors: 4, towerFloors: 6,
  entrance: [-36, -33.6, 117, 132] as R4,
  /** the entrance (the UGMC audit, UGMC-005 to 009 and 013; E16, E24, E41): the low panelled portal against the north
   *  end mass, its closed part (front screen with square openings) and its open part (the drive-in shelter on two slender
   *  round columns, the "5 Patient Tower" sign on its fascia); the dark glazed base and the glazed bay of the block
   *  behind; the mast stands on the south end mass (left of the entrance seen from the drive) */
  portal: { u0: -44, u1: -35, v0: 117, vOpen: 124.5, v1: 129.5, h: 5.8, cols: [[-37.2, 127.6], [-42, 127.6]] as P2[] },
  glassBase: [-48, -44, 124.5, 132] as R4, bay: [121.5, 127.5] as P2, strip: 2.2,
  /** the curved shrub bed with its white pebble border in front of the portal's closed part, the small flowering tree */
  bed: [[-35, 107.5], [-35, 124.2], [-33.3, 124.2], [-31.4, 121.6], [-29.8, 117], [-30.2, 111], [-32, 107.5]] as P2[],
  tree: [-32.2, 114] as P2, bench: [-33.6, 140] as P2,
};

/** 06 the long low-roofed building west of 05 (M1-M3; use unresolved) */
export const LONG = [-150, -111, 72, 163] as R4;

/** the enclosed dark glazed bridges with open ground below (A12-A13, E07-E12): between 02 and 01, and between 01 and 03 */
export const BRIDGES: { r: R4; along: 'x' | 'z'; y0: number; y1: number }[] = [
  { r: [-70, -62, -6, 12], along: 'z', y0: 5, y1: 9.4 },
  { r: [-26, -8, 38, 44], along: 'x', y0: 5, y1: 9.4 },
];

/** the canopy over the west drop-off loop of 01 (M1: the oval loop and the short projecting block) */
export const WEST_CANOPY = [-104.2, -93, 40, 56] as R4;

// ---------- grounds ----------
/** the main roundabout's planted centre (the game's ring road: centre and the inner edge of its asphalt) */
export const ROUND = { c: [-4, -3.8] as P2, inner: 9.2 };
/** the drop-off loop between 01 and 03: its centre line (the game's road), for the lawn inside it */
export const LOOP: P2[] = [[-15.3, -1.1], [-26.3, -1.0], [-36.1, -0.5], [-39.7, 0.9], [-41.7, 6.5], [-41.0, 20.3], [-36.9, 25.0], [-28.1, 28.7], [-16.1, 29.1], [-8.9, 25.7], [-4.9, 17.0], [-4.4, 7.8], [-7.6, 7.2], [-10.6, 5.8], [-13.1, 3.5], [-14.8, 0.7]];
/** the lawns between 02 and 01 with UGMC planted in them (M1), either side of the bridge */
export const LETTER_LAWNS: { r: R4; text: string }[] = [{ r: [-93, -71, -5, 10], text: 'UG' }, { r: [-61, -44, -5, 10], text: 'MC' }];
/** garden 10 west of 02 (A39-A47, E31; M1): the lawn, the crescent white-stone bed, the curved grey path with benches, the
 *  clipped hedge along the road edges */
export const GARDEN = {
  lawn: [-163, -92, -72, 12] as R4,
  crescent: { c: [-125, -21] as P2, r: 10 },
  path: { c: [-122, -28] as P2, ru: 27, rv: 33, w: 2.4 },
  hedge: [[[-163, -72], [-163, 12]], [[-163, -72], [-92, -72]]] as [P2, P2][],
};
/** the parking fields: lot outline (site frame) and the rows of 2.6 m bays (V from, V to, U from, U to, the way the cars
 *  face: +1 toward +V); gaps across a row where an aisle road runs through it */
export interface Lot { name: string; ring: P2[]; rows: { v: P2; u: P2; face: 1 | -1 }[]; gaps: P2[]; islands: R4[]; fill: number; across?: boolean }
export const LOTS: Lot[] = [
  { name: 'ugmc-07', ring: [[-142, -118], [-30, -118], [-30, -83], [-142, -83]], fill: 0.72,
    rows: [{ v: [-116.5, -111.5], u: [-137, -35], face: 1 }, { v: [-106.3, -101.4], u: [-134, -37], face: 1 }, { v: [-100.6, -95.7], u: [-134, -37], face: -1 }, { v: [-90.3, -85.3], u: [-137, -35], face: -1 }],
    gaps: [[-86, -78]], islands: [[-134, -86, -101.4, -100.6], [-78, -37, -101.4, -100.6]] },
  { name: 'ugmc-08', ring: [[8, 98], [50, 98], [50, 162], [8, 162]], fill: 0.7, across: true,
    rows: [{ v: [104, 158], u: [13, 18], face: 1 }, { v: [104, 158], u: [26.5, 31.5], face: -1 }, { v: [104, 158], u: [34, 39], face: 1 }, { v: [104, 158], u: [39.8, 44.8], face: -1 }],
    gaps: [], islands: [[39, 39.8, 104, 158]] },
  { name: 'ugmc-09', ring: [[-266, 15], [-184, 15], [-184, 82.5], [-266, 82.5]], fill: 0.55,
    rows: [{ v: [18, 23], u: [-262, -188], face: 1 }, { v: [33, 38], u: [-262, -188], face: 1 }, { v: [38.8, 43.8], u: [-262, -188], face: -1 }, { v: [52, 57], u: [-262, -188], face: 1 }, { v: [57.8, 62.8], u: [-262, -188], face: -1 }, { v: [69, 74], u: [-262, -188], face: 1 }, { v: [74.8, 79.8], u: [-262, -188], face: -1 }],
    gaps: [], islands: [[-262, -188, 38, 38.8], [-262, -188, 57, 57.8], [-262, -188, 74, 74.8]] },
];
/** car spots in a lot (site frame): u, v, heading (radians about the vertical in the site frame: 0 lengthwise along V),
 *  deterministic */
export function lotSpots(l: Lot): [number, number, number][] {
  const out: [number, number, number][] = [];
  let seed = l.name.length * 977;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (const r of l.rows) {
    if (l.across) {
      // bays along V (cars lie across U)
      for (let v = r.v[0] + 1.3; v < r.v[1] - 1.2; v += 2.6) {
        if (rnd() > l.fill) continue;
        out.push([(r.u[0] + r.u[1]) / 2, v, r.face > 0 ? Math.PI / 2 : -Math.PI / 2]);
      }
      continue;
    }
    for (let u = r.u[0] + 1.3; u < r.u[1] - 1.2; u += 2.6) {
      if (l.gaps.some(([a, b]) => u > a - 1.3 && u < b + 1.3) || rnd() > l.fill) continue;
      out.push([u, (r.v[0] + r.v[1]) / 2, r.face > 0 ? 0 : Math.PI]);
    }
  }
  return out;
}

/** the security posts at the north lot's two entrances (E28, E40: "UGMC SECURITY POST NORTH 1/2"; the owner: North 1
 *  is the one on the side facing WAGMC, the east one; North 2 the other, to the north-west): North 2, North 1 */
export const POSTS: P2[] = [[-155.5, -110.5], [-17, -109.5]];
/** the wayfinding totems (E14 at 03's lawn by the roundabout, E18/E19 on the grass island south of 04) */
export const TOTEMS: P2[] = [[14, 7], [30, -8]];
/** the flagpoles on the loop's lawn before 01 and 03 (E32, E38) */
export const FLAGS: P2[] = [[-30, 12], [-26, 12], [-22, 12], [-18, 12], [-14, 12]];

/** the perimeter fence round the UGMC community (the owner: "there is a fence around the UGMC community"; the drone
 *  frames A37/A38 show it just inside the main road with the two security posts at its gates, E21 beyond the east lot).
 *  [DECISION] its line: inside the main road, outside the east ring road (short of the red earth strip), round Building 7,
 *  along the south road, round the west car park (09) and back up outside the west road; a gap wherever a road crosses */
export const FENCE: P2[] = [[-200, -126], [116, -126], [116.5, -17], [127, 113], [123, 170], [118, 212], [110, 217], [110, 227], [-14, 227], [-14, 177], [-186, 177], [-186, 90], [-273, 90], [-273, 9], [-192, 9], [-200, -126]];

/** the outlines the precinct's models stand on (site frame), for the map's collision rings (corrections.json
 *  reshape) and the props' keep-outs */
export const OUTLINES: Record<string, P2[]> = {
  core: [[CORE.x0, CORE.z0], ...CORE_ARC, [CORE.x1, CORE.z1], [CORE.x0, CORE.z1]],
  wc: [[-90, -70], [-22, -70], [-22, -52], [-27, -52], [-27, -26], [-22, -26], [-22, -6], [-90, -6]],
  opd: [...OPD_BOW, [57.5, 15], [57.5, 82.5], [-8, 82.5]],
  sim: [[22, -62], [60, -62], [60, -18], [22, -18]],
  // the recess between the end masses stays open to the portal's shelter and the doors (the portal's closed part and
  // the dark glazed base are walls)
  pt: [[-92, 92], [-36, 92], [-36, 117], [-35, 117], [-35, 124.5], [-44, 124.5], [-44, 132], [-36, 132], [-36, 157], [-92, 157]],
  long: [[LONG[0], LONG[2]], [LONG[1], LONG[2]], [LONG[1], LONG[3]], [LONG[0], LONG[3]]],
};

/** the frame's rotation about the vertical (a site-frame heading plus this is the world heading) */
export const UG_YAW = Math.atan2(-AZ, AX);
/** the lots' car spots in the world (x, z, heading), for life.ts: the lot whose outline holds the point */
export function ugmcSpots(x: number, z: number): [number, number, number][] | undefined {
  const [u, v] = ugLocal(x, z);
  const l = LOTS.find((o) => { const us = o.ring.map((p) => p[0]), vs = o.ring.map((p) => p[1]); return u > Math.min(...us) && u < Math.max(...us) && v > Math.min(...vs) && v < Math.max(...vs); });
  return l && lotSpots(l).map(([a, b, h]) => { const [wx, wz] = ugWorld(a, b); return [wx, wz, h + UG_YAW]; });
}
