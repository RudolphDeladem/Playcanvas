// NSIA Road by the Frank Torto Chemistry Building: the calibration values the reconstruction brief asks to keep
// adjustable (the owner's NSIA Road reconstruction brief, six game/photo pairs and an overhead map). Nothing here is
// surveyed: the photos give relative levels and local edges, not elevations, distances or the road's grade. The terrain
// (relief.ts), the walls, drain, trees and ground cover (nsiaroad.ts), the route's plain stretch (world.ts) and the six
// comparison cameras (tools/preview) all read these numbers, so one change keeps the views consistent.
//
// The map (image 13) matched to the game: NSIA Road runs north-south at x 235 from J.K.M. Hodasi Road (z -162) to the
// Danquah Avenue roundabout (z 115); the Chemistry complex lies west of it (the Frank Torto Building, its car park,
// the chemistry ranges), the cross-shaped Home Science Annex east of it in the north, LECIAD east of it further south.
// Between NSIA Road and the chemistry buildings runs the narrow lane (the "lower corridor", x 210), with the tree belt
// between the lane and NSIA Road; the short connecting road at z -26 joins them.

/** the lane's centre line (x at z), from the map: it bends in from the car park at its north end */
export const laneX = (z: number) => {
  const p: [number, number][] = [[-84, 210], [-48, 211], [-25, 210], [-17, 210], [80, 208]];
  if (z <= p[0][0]) return p[0][1];
  for (let i = 0; i < p.length - 1; i++) if (z <= p[i + 1][0]) return p[i][1] + ((p[i + 1][1] - p[i][1]) * (z - p[i][0])) / (p[i + 1][0] - p[i][0]);
  return p[p.length - 1][1];
};

export const NSIA = {
  /** the lane's own profile (relief.ts keeps the owner's earlier crest: 2.0 m from z -40 to -5) */
  lane: { x0: 206, x1: 216.5, z0: -40, z1: -5, top: 2.0, n: 45, s: 75 },
  /** the retaining wall's face along the lane's east side: this far from the lane's centre (clear of the ridden
   *  route's road, 3.8 m either side), from z0 to z1; its exposed height over the run, falling to `endHeight` over the
   *  last `taper` metres into the corner by the connecting road (pairs 2, 3 and 5) */
  wall: { offset: 4.0, z0: -79, z1: -29.5, exposed: 1.1, taper: 10, endHeight: 0.12, thick: 1.1, coping: 0.12 },
  /** the raised tree belt behind the wall, up to NSIA Road's bank: its north bank falls toward the low building by the
   *  car park (pair 1), its south bank to the connecting road (pair 5) */
  belt: { x1: 231.5, z0: -79, z1: -29.5, north: 3.5, south: 2.0 },
  /** NSIA Road's longitudinal profile, [z, height]: a gentle hump only (the photos show the ground higher than the
   *  road at its edges, not a hill along it); flat south of z 26 past Earth Science, at 0 at Hodasi Road */
  nsiaProfile: <[number, number][]>[[-162, 0], [-150, 0.08], [-130, 0.3], [-110, 0.42], [-95, 0.48], [-77, 0.55], [-55, 1.15], [-26, 1.45], [-5, 1.35], [10, 0.8], [22, 0.1], [30, 0], [114, 0]],
  /** NSIA Road's cut through the higher ground: flat this far either side of its centre, then a bank this wide */
  nsiaHalf: 4.6, nsiaBank: 3.5,
  /** the short retained stretch of NSIA Road's east bank (pair 6, the left of the photo): z from, to, its bank there,
   *  and how far its ends ease back into the full bank */
  eastWall: { z0: -50, z1: -42, bank: 0.25, ease: 4 },
  /** the connecting road from the lane to NSIA Road, [x, z, height] */
  connector: <[number, number, number][]>[[210.5, -25.5, 2.0], [222, -25.8, 1.72], [230.4, -26, 1.45], [235, -26, 1.45]],
  /** the road east from NSIA Road to LECIAD, [x, z, height]: up from NSIA Road's cut to LECIAD's ground at a gentle grade */
  eastRoad: <[number, number, number][]>[[235, -77, 0.55], [239.6, -77, 0.6], [248, -77, 1.3], [259, -77, 2.05], [272, -77, 2.36]],
  eastRoadHalf: 4.0, eastRoadBank: 3,
  connectorHalf: 4.0, connectorBank: 2.5,
  /** the low flat-roofed building by the car park (pair 1) on its own pad, lower than the ground east and south of it,
   *  which a retaining edge holds back: the pad's rectangle, its height and the edge's width */
  lowPad: { x0: 214.8, x1: 223.6, z0: -95.4, z1: -83.4, h: 0.12, bank: 0.3 },
  /** the grated drain along the south edge of the car-park road, before the chemistry range (pair 4: the range's cream
   *  wall and dark red foot on the left, the road on the right, looking west): x from, to; its middle's z (the road's
   *  south edge is at z -89.7) */
  drain: { x0: 166.5, x1: 203.0, z: -89.45, width: 0.45, depth: 0.35, barGap: 0.06 },
  /** the bare-soil verge between that drain and the range (x from, to; z to) and its big tree */
  verge: { x0: 160.5, x1: 203.4, z1: -81.2, tree: [186.5, -85.2] as [number, number] },
  /** the hill's continuation north along NSIA Road to J.K.M. Hodasi Road (the owner's NSIA hillside correction, picture
   *  3: the yellow arrow): its height (estimated from the passage photo, about a low wall's height plus a bank over the
   *  passage floor); east of the low building from the belt's end to the passage end (x0e..x1, z from passEnd to z1e);
   *  north of the passage end, from the east end of the Chemistry Extension's north range (the owner: the wall touches it) to NSIA Road (x0..x1, z from z0 to passEnd); the bank down to Hodasi
   *  Road (n metres long, ending clear of its riding width) */
  north: { h: 1.35, x0: 207.0, x0e: 224.4, x1: 231.5, z0: -150.5, passEnd: -137.4, z1e: -79, n: 6.5, west: 2.4,
    /** its top along it, [z, height]: the low wall's height at the passage's end, rising over the planted slope behind,
     *  then easing down toward Hodasi Road (estimates, calibrated against the passage photo) */
    profile: <[number, number][]>[[-150.5, 1.7], [-145, 2.0], [-141, 1.8], [-137.4, 1.35]] },
  /** where the route draws no pavements, lane paint or decorative trees (the real roads here have none) */
  plain: [150, 262, -165, 30] as [number, number, number, number],
  /** where generic palms and flame trees give way to broadleaf trees (the six views) */
  broadleaf: [140, 275, -165, 40] as [number, number, number, number],
};

/** the six comparison cameras, one per reference photo (eye, look, vertical field of view). Provisional: the photos'
 *  stations, headings and lenses are estimated from matching landmarks, not measured. */
export const NSIA_VIEWS: { name: string; eye: [number, number, number]; look: [number, number, number]; fov: number; note: string }[] = [
  { name: 'pair1', eye: [225, 1.6, -79.5], look: [199, 5.5, -101], fov: 58, note: 'Frank Torto from the raised belt: its south end with the sign, the east face receding, the low building with the grille doors below, the car park on the left' },
  { name: 'pair2', eye: [209.5, 1.2, -82], look: [213.5, 1.0, -62], fov: 55, note: 'down the lane from the bend by the car park: the wall on the left, the range porch on the right' },
  { name: 'pair3', eye: [211.5, 1.2, -58], look: [222, 2.8, -40], fov: 55, note: 'the wall and the raised grove from the lane, the mast among the trees, LECIAD beyond' },
  { name: 'pair4', eye: [201.5, 1.55, -86.4], look: [176, 1.1, -89.9], fov: 60, note: 'the verge under the tree before the chemistry range, looking west along the car-park road: the grated drain, bare soil, the planting strip' },
  { name: 'pair5', eye: [212.2, 1.5, -18.5], look: [214.5, 2.2, -50], fov: 58, note: 'the corner of the lane and the connecting road: the wall tapering into the bank, the worn path' },
  { name: 'pair6', eye: [236.5, 1.2, 14], look: [244, 2.6, -14], fov: 55, note: 'NSIA Road northward: the bank rising on the east to the big tree and the service buildings, LECIAD behind' },
];

/** the hill's top north of the passage at z (NSIA.north.profile, linear between its points) */
export const northTop = (z: number) => {
  const p = NSIA.north.profile;
  if (z <= p[0][0]) return p[0][1];
  for (let i = 0; i < p.length - 1; i++) if (z <= p[i + 1][0]) return p[i][1] + ((p[i + 1][1] - p[i][1]) * (z - p[i][0])) / (p[i + 1][0] - p[i][0]);
  return p[p.length - 1][1];
};
