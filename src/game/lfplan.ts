// The owner's Legon overhead to Okponglo correction brief (Legon_Overhead_to_Okponglo_Detailed_Claude_Brief.pdf: Pairs
// 1-16, the annotated aerials A01-A04, the game map M01; docs/legon-first-total/evidence-audit.md): the numbers
// legonfirst.ts models, relief.ts raises and the route tests check. Game metres, x east, z south. The aerials are
// registered on the mapped outlines and roads; every height, every span the map has no outline for and every plant's
// place is read from the street photographs, not measured, and stays a number here to adjust.
// (No imports: relief.ts reads the raised ground from here.)

export type P2 = [number, number];
export type Line = P2[];
export type Box = [number, number, number, number];
/** the mapped centre lines (legon-map.json): the N4's southbound carriageway (west), its northbound one (east, the
 *  part south of the cutting), the east service road the trading corner, the station and the raised plot face, and
 *  the west service road under the retaining wall */
export const SB: Line = [[778.7, 158.5], [787.8, 208.8], [807.3, 315.6], [812.3, 353.4], [842.4, 494.2], [865.2, 609.6], [890.8, 732.0], [912.5, 830.6]];
export const NB: Line = [[794.0, 154.8], [820.2, 295.8], [828.1, 346.3], [840.3, 408.3], [871.3, 551.6], [891.2, 647.9], [901.6, 692.3], [917.1, 762.4], [947.2, 907.4]];
export const ESVC: Line = [[798.0, 137.4], [801.0, 153.1], [811.0, 204.6], [829.7, 307.5], [831.8, 319.3], [840.4, 367.0], [848.0, 405.7], [855.6, 438.7], [858.0, 448.6], [859.2, 455.7], [868.5, 498.8], [876.3, 535.4], [878.9, 543.9], [886.7, 578.3], [900.3, 647.0], [901.6, 653.1], [901.8, 660.0], [901.6, 692.3]];
export const WSVC: Line = [[764.1, 162.0], [789.8, 301.9], [799.6, 359.5], [808.4, 401.2], [839.8, 550.5], [859.2, 648.4], [864.5, 675.2], [868.4, 693.5], [880.1, 748.3], [893.3, 793.9], [895.1, 799.5], [899.1, 807.2], [905.6, 818.7]];
/** the side lane east from the trading corner (z of its centre line) and the lane behind the kiosk line */
export const SIDE_LANE_Z = 204.3;
export const BACK_LANE: Line = [[824.0, 204.0], [834.7, 240.6], [835.1, 245.7], [841.1, 269.3], [847.4, 283.5]];
/** half widths as drawn (the N4's carriageways 4.95, the service roads 3.1, the lanes 2.3) */
export const N4_HALF = 4.95, SVC_HALF = 3.1, LANE_HALF = 2.3;

export const xAt = (line: Line, z: number) => {
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i], [bx, bz] = line[i + 1];
    if ((z - az) * (z - bz) <= 0 && az !== bz) return ax + ((bx - ax) * (z - az)) / (bz - az);
  }
  return NaN;
};
/** the east service road's outer (east) kerb at z */
export const eastKerb = (z: number) => xAt(ESVC, z) + SVC_HALF;
/** the road's outer east edge at z: the east service road's kerb, and south of where it joins the northbound carriageway
 *  (z 692) that carriageway's east edge */
export const eastEdge = (z: number) => (z <= 692 ? eastKerb(z) : xAt(NB, z) + N4_HALF);
/** the west service road's outer (west) kerb at z */
export const westKerb = (z: number) => xAt(WSVC, z) - SVC_HALF;

/**
 * The trading corner and the kiosk line (Pairs 1-3; A03 arrows 1-3): the brick footway along the east service road from
 * the side lane's mouth south past the long shelter, its kerb curving round the corner into the side lane, the short
 * striped posts on the corner; the stalls on bare red earth behind it. `foot`: the footway's width; `posts`: the
 * corner's posts (from the mouth, metres along the kerb); `strip`: where the stalls stand, metres out from the footway.
 */
export const CORNER = { z0: 208, z1: 312, foot: 2.6, radius: 6, posts: 9, strip: [0.6, 9.5] as [number, number] };
/** the stalls in their order along the frontage (Pairs 1-3), z of each and its kind: an umbrella over a table, an open
 *  stall under a canopy, an enclosed kiosk (the dark green and red one, the light poster-covered shop); sizes w x d, h.
 *  Spots read from the photographs and the aerial's small roofs, not measured. */
export type StallKind = 'umbrella' | 'canopy' | 'kiosk' | 'greenKiosk' | 'posterShop';
export const STALLS: [number, StallKind, number, number, number][] = [
  [212.5, 'umbrella', 2.6, 2.6, 2.4], [216.0, 'canopy', 3.4, 3.0, 2.5], [220.5, 'umbrella', 2.4, 2.4, 2.3], [224.5, 'kiosk', 2.6, 2.4, 2.5],
  [229.0, 'canopy', 4.0, 3.2, 2.6], [234.0, 'umbrella', 2.6, 2.6, 2.4], [239.0, 'kiosk', 2.4, 2.4, 2.4], [244.5, 'canopy', 3.6, 3.0, 2.5],
  [251.5, 'greenKiosk', 2.8, 2.6, 2.6], [256.0, 'umbrella', 2.6, 2.6, 2.4], [262.0, 'posterShop', 6.0, 4.0, 3.0], [269.0, 'canopy', 3.0, 3.0, 2.5],
];
/** the long low shelter on its mapped outline (Pair 3; osm ml:23419df5): a shallow roof on narrow supports and grilles */
export const SHELTER: Box = [837.7, 845.4, 279.4, 302.9];
/** the tall narrow roadside board with its red top (Pair 3): z, metres out from the kerb */
export const TALL_BOARD = { z: 276, off: 1.4 };

/**
 * The Legon 1st frame and the open plot south of the kiosk line (Pair 4; A03 arrows 4): the tall dark open frame on thin
 * members with its small pale name panel at the top and nothing below; the rough plot of scrub and bare earth reaching
 * to Family Health; the drain grate at the kerb. x, z of the frame's foot; its height and width.
 */
export const LEGON1ST = { z: 352, off: 5.2, h: 6.4, w: 2.6, grate: 323, plot: { z0: 312, z1: 396, depth: 55 } };

/**
 * The TotalEnergies station (Pairs 5-8, 10; A02, A04): one group.
 * - the takeaway building (the aerial's grey flat roof with two units on it): one low storey, grey, the white fascia with
 *   CHICKEN MAN, pinkberry and DRIVE THRU on its west face, the pizza and bonjour shopfront on its south face;
 * - the canopy (the aerial's square with the pale rim south of it): open, on dark columns, thin pale fascia with the red
 *   edge, TotalEnergies on it, LEGON 2 on its west side; two pump islands under it;
 * - the service strip on its mapped outline (osm ml 137514670): low, pale, its open bays to the forecourt;
 * - the access from the east service road (the mapped drive at z 456), the grass islands with brick crossings and the
 *   striped posts either side, the no-entry discs, STOP on the access, the price pylon south of it and the Chicken Man
 *   and Pizzaman pylons north of it; the low white wall on the south side.
 * Family Health (osm family health shio) stays on its outline as the large pale red-roof neighbour.
 */
export const STATION = {
  takeaway: [890.0, 915.5, 440.0, 452.0] as Box, takeH: 4.0,
  canopy: [884.0, 903.5, 468.0, 483.0] as Box, canopyH: 5.6,
  strip: [925.7, 949.8, 443.4, 480.2] as Box, stripH: 4.6, bays: 5,
  /** the forecourt's hard surface (worn concrete) over the plot, inside these bounds */
  court: [866, 924, 432, 512] as Box,
  /** the access mouth on the east service road: z from, z to */
  mouth: [451.0, 466.5] as [number, number],
  /** the price pylon (south of the access) and the two restaurant pylons (north of it): x, z, height */
  pricePylon: [868.5, 471.5, 7.2] as [number, number, number],
  chickenPylon: [866.5, 446.5, 6.2] as [number, number, number],
  pizzaPylon: [869.0, 444.0, 5.6] as [number, number, number],
  /** the prices on the pylon: the photograph's display (Sep 2024), not current prices; editable */
  prices: ['13.99', '13.45', '16.49'],
  /** the low white wall along the south edge (Pair 10), z */
  southWall: 511.5,
};
/** footprints the map has where the aerials show open forecourt or bare ground (the generic builder leaves them; the
 *  machine-detected outlines 249 and 101 on the station's forecourt, 100, 37 and 67 on the raised plot's
 *  open ground, where Pairs 9, 15 and 16 show only the small white building, the frame and scrub) */
export const OPEN_OUTLINES: P2[] = [[878.8, 476.8], [887.8, 505.2], [916.8, 585.0], [928.8, 515.0], [927.8, 561.7]];

/**
 * The raised plot south of the station (Pairs 9, 15, 16; A02, A04): the stained concrete wall along the brick
 * sidewalk holding the plot about a metre up, tapering down at the access at its north end; the small white flat-roofed
 * building with the peeling red fascia (osm 1195133819) and the unfinished concrete frame beside it (osm 603522791);
 * worn paving, red earth, weeds, a pile of material; the empty blue billboard skeleton and the separate red frame; the
 * railing and white posts at the access. `wallOff`: the wall's face out from the service road's kerb (past the
 * sidewalk); `h`: the plot's height above the sidewalk; `taper`: the access's ramp length.
 */
export const PLOT = { z0: 508, z1: 604, wallOff: 3.3, h: 0.95, depth: 72, access: [500.5, 508.0] as [number, number], taper: 6,
  white: [901.8, 913.7, 537.4, 545.2] as Box, frame: [913.4, 921.1, 531.4, 542.2] as Box,
  billboard: [896.0, 572.0, 8.5] as [number, number, number], redFrame: [901.5, 600.0, 6.0] as [number, number, number] };

/**
 * The corridor south of the station to Okponglo (Pairs 11-14; A01): the low concrete divider between the carriageways
 * (Pair 14) where the map leaves a median, the grass strip between the southbound carriageway and the west service road
 * with its lamps and small boards (Pairs 11, 14), the long panelled retaining wall behind the west service road holding
 * the wooded ground up (Pair 14), stepping down in tiers where the two small red-roof structures stand (Pair 11); the
 * dense scrub rising behind the east verge with the lattice tower (Pair 12); the planted separation of short-stemmed
 * young trees and shrubs farther south (Pair 13).
 */
export const DIVIDER = { z0: 412, z1: 690, h: 0.85 };
export const RWALL = { z0: 470, z1: 668, off: 1.4, h: 1.7, back: 46, tiers: { z0: 668, z1: 718, h: [0.8, 1.6] as [number, number] } };
/** the two small cream red-roof structures above the tiers (Pair 11; osm 3028 and 2618) */
export const TIER_HOUSES: Box[] = [[838.1, 845.8, 668.4, 681.2], [845.5, 855.5, 681.8, 694.4]];
/** the mapped footway (osm path 1420) along the lower tier: the upper tier's wall stands back behind it, so the path is
 *  never walled across (the tiers' depths are read from Pair 11, the path's line is the map's) */
export const FOOT_W: Line = [[843.2, 615.2], [866.4, 717.9], [879.5, 781.6]];
/** the upper tier wall's line at z, given the lower wall's face there: 4 m back, or further where the footway needs it */
export const tierBack = (z: number, face: number) => { const f = xAt(FOOT_W, z); return Number.isNaN(f) ? face - 4 : Math.min(face - 4, f - 1.3 - 0.9); };
export const EAST_SCRUB = { z0: 560, z1: 700, depth: 50, rise: 1.6 };
/** the lattice towers (Pairs 1, 12): x, z, height; the pole billboard (Pair 13) */
export const TOWERS: [number, number, number][] = [[930, 650, 34], [804, 132, 30]];
export const POLE_BOARD: [number, number] = [938, 765];
export const PLANTED = { z0: 700, z1: 860 };

/** where this work draws the ground and props itself (the generic trees, lamps and verges stay out): x0, x1, z0, z1 */
export const LF_KEEP: Box[] = [
  [790, 905, 200, 312], // the trading corner, the kiosk line (north of the side lane: the police compound, roadside.ts)
  [820, 905, 300, 432], // the Legon 1st plot
  [835, 955, 395, 520], // the station
  [850, 1000, 500, 620], // the raised plot
  [770, 990, 400, 870], // the corridor: divider, strips, wall, scrub
];
export const inLfKeep = (x: number, z: number, pad = 0) => LF_KEEP.some(([a, b, c, d]) => x > a - pad && x < b + pad && z > c - pad && z < d + pad);
/** the zone this work owns beside the roads (the generic verge strips, route-layer trees and lamps stay out) */
export const ownsLf = (x: number, z: number) => z > 140 && z < 870 && x > xAt(WSVC, Math.min(818, Math.max(163, z))) - 60 && x < 1000 && inLfKeep(x, z);
