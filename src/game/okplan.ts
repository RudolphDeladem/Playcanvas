// The owner's Okponglo to UG Stadium correction brief (Okponglo_UG_Stadium_Detailed_Claude_Brief.pdf: Pairs 1-21, the
// annotated aerials A01-A05, the game-map views M01-M04; docs/okponglo/evidence-audit.md): the numbers okponglo.ts
// models, relief.ts raises and the route tests check. Game metres, x east, z south. The aerials are registered on the
// mapped outlines and roads (the N4's two carriageways, La-Bawaleshi Road, the road the game names Mbabane Avenue
// that the aerials call McDan Drive); every height, every span the map has no outline for and every plant's place is
// read from the street photographs, not measured, and stays a number here to adjust.
// (relief.ts reads the banks from here: the only import is the junction's plan, which imports nothing of the relief.)
import { westEdge } from './okjplan';

type Line = [number, number][];
/** the N4's southbound (west) carriageway's centre line, north and south of the junction (the mapped one-way ways) */
const WEST_N: Line = [[923, 888], [929, 924], [935, 950], [950, 1029], [966, 1123], [973, 1163], [980, 1201]];
const WEST_S: Line = [[989, 1252], [990, 1257], [994, 1279], [1002, 1323], [1012, 1374], [1034, 1491], [1056, 1613]];
const xAt = (line: Line, z: number) => {
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i], [bx, bz] = line[i + 1];
    if ((z - az) * (z - bz) <= 0 && az !== bz) return ax + ((bx - ax) * (z - az)) / (bz - az);
  }
  return z < line[0][1] ? line[0][0] : line[line.length - 1][0];
};
/** the southbound carriageway's half width (as lbplan.ts) */
const W_HALF = 3.3;

/**
 * The raised ground on the stadium side (west of the southbound carriageway), held by a low rough stone retaining face
 * behind the roadside path:
 * - north of the junction (Pair 3; A02 arrow 3): the bank under the dense vegetation, its face behind the worn path,
 *   rising a little farther back;
 * - opposite Leasafric (Pair 21; A01 arrow 21): the verge between the road and the stadium car parks' fence, its face
 *   behind the red brick path, the roadside structures standing on it.
 * `face`: metres from the kerb to the face's top edge (the stone stands a metre nearer the road, at the foot of the
 * slope the relief grid makes there, clear of the path); `h`: the top at the face; `rise`/`riseTo`: how much it climbs over how many
 * metres back from the face; `back`: how far back the top reaches before easing down over `fall`. Heights estimated.
 */
export const BANKS = {
  north: { line: WEST_N, z0: 948, z1: 1178, ends: 9, face: 3.65, h: 1.15, rise: 1.2, riseTo: 14, back: 27, fall: 6 },
  south: { line: WEST_S, z0: 1296, z1: 1418, ends: 8, face: 4.5, h: 0.85, rise: 0.3, riseTo: 10, back: 21, fall: 4 },
};
export type Bank = typeof BANKS.north;
/** the x of a bank's face at z (the kerb of the southbound carriageway less the path). Where the junction's correction
 *  (okjplan.ts, 2026-10-16) puts the kerb farther out (zone 1's widening, zone 5's concrete bay), the face keeps its
 *  distance from the new kerb, so neither the stone nor the raised ground reaches the road */
export const bankFace = (b: Bank, z: number) => Math.min(xAt(b.line, z) - W_HALF - b.face, westEdge(z) - (b.face - 1.2));
/** the bank's top at x, z (on the top: from its face back) */
export const bankTop = (b: Bank, x: number, z: number) => b.h + b.rise * Math.min(1, Math.max(0, bankFace(b, z) - x) / b.riseTo);

/**
 * The N4's median (lbplan.ts MEDIAN): the planting the photographs show instead of the tall, wide-crowned trees
 * (Pairs 1, 2, 4 north of the junction; 13, 14 south of it). Each run is a stretch of the median with what grows on it:
 * - `trees`: compact trees, short visible stems, foliage reaching low, crowns of different sizes, uneven gaps;
 * - `open`: the open stretch (Pairs 13, 14): low shrubs and the odd sapling between the advertising boards.
 * Every plant's place is drawn from a hash, not from a survey; the larger crowns are a few, by `big`.
 */
export const MEDIAN_RUNS: { z0: number; z1: number; kind: 'trees' | 'open'; big: number }[] = [
  { z0: 905, z1: 1190, kind: 'trees', big: 0.14 },
  { z0: 1262, z1: 1432, kind: 'open', big: 0 },
  { z0: 1432, z1: 1640, kind: 'trees', big: 0.1 },
];
/** boards on the median, z (the x is the median's middle): the tall blue pylon opposite the plaza (Pair 2), the wooden
 *  A-frame stands (Pairs 1, 2), the narrow white "INSTANT ADMISSION" pylon (Pair 4), the green KFC board and the visa
 *  board (Pair 14). Spots inferred from the views. */
export const MEDIAN_BOARDS: [number, 'bluePylon' | 'aframe' | 'admission' | 'kfc' | 'visa' | 'redBoard'][] = [
  [1151, 'bluePylon'], [1140, 'aframe'], [1166, 'aframe'], [1176, 'admission'], [1184, 'redBoard'],
  [1326, 'kfc'], [1334, 'visa'],
];

/** a footprint's box (the mapped outline's bounds, rounded) */
export type Box = [number, number, number, number];
/** the mapped outlines this work builds itself (the neighbourhood's generic builder in labawaleshie.ts leaves them):
 *  First Eye Plaza, the signed corner shop and the taller block behind it, Leasafric, Pro Vision, Diamed and its blue
 *  neighbour. (A05 at Leasafric's scale puts its green target on the outline south of Pro Vision and its blue target on
 *  the next one; the map's "Diamed Diagnostical" place point sits on Pro Vision's outline and is not followed.) */
export const OK_OUTLINES: Record<string, Box> = {
  plaza: [1010.1, 1033.1, 1128.3, 1167.1], // osm:way/1518873623 (Pairs 1, 2, 5, 6)
  signShop: [1031.1, 1043.7, 1244.0, 1254.6], // osm:way/1289415410 (Pairs 8, 10, 11)
  signBack: [1034.1, 1044.5, 1255.7, 1275.1], // osm:way/758602539 (Pairs 10, 11: the taller mass behind)
  leasafric: [1059.0, 1080.2, 1352.2, 1377.6], // osm:way/1184502304 (Pairs 15, 16)
  proVision: [1065.4, 1099.2, 1390.2, 1415.5], // osm:way/675704403 (Pair 17)
  diamed: [1084.5, 1104.4, 1418.7, 1438.9], // osm:way/1289415419 (Pairs 18, 19; A05 green target)
  blueHouse: [1080.8, 1110.3, 1446.0, 1465.3], // osm:way/1289415420 (Pairs 18, 20; A05 blue target)
};
export const okOwns = (b: { minX: number; maxX: number; minZ: number; maxZ: number }) =>
  Object.values(OK_OUTLINES).some((p) => Math.abs(b.minX - p[0]) < 1.5 && Math.abs(b.maxX - p[1]) < 1.5 && Math.abs(b.minZ - p[2]) < 1.5 && Math.abs(b.maxZ - p[3]) < 1.5);

/**
 * First Eye Plaza (Pairs 5, 6; A02 arrows 5, 6): three levels along the N4, the ground shops behind their grilles, the
 * open gallery recessed behind columns and a railing, the enclosed top floor with discrete windows, the orange roof-edge
 * fascia; the orange tiled central feature with its blue glazed insets where the outline steps forward (the mapped jog
 * on its west face), FIRST EYE PLAZA on top of it.
 */
export const PLAZA = {
  front: 1012.1, north: 1128.4, south: 1166.9, deepZ: 1158.2, back: 1023.4, backDeep: 1033.0,
  feature: { x0: 1010.1, z0: 1145.2, z1: 1149.6, top: 13.4 },
  ground: 3.6, gallery: 3.2, top: 3.2, parapet: 0.9, recess: 1.9,
};
/** the low red-brown roofed structure south of the plaza behind its grille boundary (Pair 7; A02 arrow 7): the roof,
 *  the grille line along the road with its gate, the setback; the taller beige mass behind is the mapped
 *  osm:way/1518873624 */
export const LOWROOF = { x0: 1014.5, x1: 1034.5, z0: 1170.5, z1: 1191.5, eave: 2.7, grille: 1009.6, gate: [1178.5, 1182.5] as [number, number], gz0: 1168.4, gz1: 1193.6 };
/** the ALPHA LED shop at 1 La-Bawaleshi Road (Pair 9; A03): the taller central display stack, the dark near-square
 *  screen, ALPHA LED above it, the recessed green entrance up its steps; the low yellow wing east of it */
export const ALPHA = { x0: 1023.5, x1: 1030.5, z0: 1196.5, z1: 1206.5, wing: [1030.5, 1041.0] as [number, number], wingZ0: 1197.5, steps: 3, recess: 1.4 };
/**
 * The signed corner shop south-east of the junction (Pairs 8, 10, 11; A03 arrows 8, 10, 11): two levels on the mapped
 * outline, the dark fascia with 3D SIGN SHOP on its face to the N4 and the 3D SIGNS letters seen on its face to the
 * fenced gravel forecourt (Pair 8), white-framed windows above, shutters below, the roof overhang; the taller mass
 * behind (osm:way/758602539) three levels. The larger neighbour east of the forecourt (Pair 8) has no outline: its box
 * (clear of the mapped service way along the forecourt's east side). The lattice mast seen behind them from Pairs 8,
 * 10, 11 and 12: x, z, height, its spot where the four views' bearings agree (not measured).
 */
export const SIGNSHOP = { storeys: 2, back: 3, forecourt: { x0: 1013.5, x1: 1043.5, z0: 1229.5, z1: 1243.0 }, neighbour: [1056.0, 1078.0, 1240.0, 1258.5] as Box, mast: [1062, 1284, 36] as [number, number, number] };
/** the long green boundary wall south of the sign shop's block, round the planted plot (Pair 12; A04 arrow 12): its
 *  line along the road (set back from the northbound carriageway's edge), its ends, height; the tall empty frame
 *  beside it (Pairs 12, 13) */
export const GREENWALL = { off: 4.6, z0: 1276.5, z1: 1331.0, h: 2.3, returnTo: 1046.5, frame: 1318 };
/**
 * Leasafric Ghana (Pairs 15, 16; A04): the two-level office on its outline, red framing and white walls under a shallow
 * green roof with broad eaves, LEASAFRIC GHANA along the top of its front; the low wall of white panels between red
 * posts along the road with the vehicle advertisements on some panels, the black vehicle gate, the tall narrow white
 * branding pylon beside it, palms inside the wall.
 */
export const LEASAFRIC = { wallOff: 4.4, z0: 1333.0, z1: 1385.5, gate: [1346.0, 1352.0] as [number, number], pylon: 1344.6, wallH: 1.25 };
/** Pro Vision (Pair 17; A04 arrow 17): the low stone-faced front structure and the taller green gabled building behind
 *  it on the mapped outline, the cream wall with its pillars and the dark security fence over it, the gold-toned
 *  ornate gate at the north end, the Pro Vision Consultants Limited board, the flowerbed, palms and the tall conifer */
export const PROVISION = { wallOff: 4.4, z0: 1391.0, z1: 1416.5, gate: [1392.4, 1397.0] as [number, number], wallH: 2.0, split: 1077.5 };
/**
 * Diamed and its blue neighbour (Pairs 18-20; A05 arrows 18-20): two separate compounds between the N4 and McDan Drive.
 * Diamed (green): the low front volume and the taller green gabled mass with its balcony recess; the green-and-white
 * decorative wall along McDan Drive with its white posts and globe lamps, the hexagonal paving of its drive, the
 * DIAMED signs, the FIBROID / REHABILITATION banner along its wall to the N4. The blue neighbour: blue plaster, a
 * pitched tiled roof, the rounded projecting canopy over the upper balcony on its column, the high blue wall and black
 * gate on McDan Drive, banana plants. `split`: the line between the two plots. Diamed's gate on McDan Drive is where its
 * mapped drive (the service way from McDan Drive) comes in; the white gate to the N4 at its north end (Pair 18).
 * `splitGap`: where the divider between the plots leaves the mapped drive open (x span).
 */
export const DIAMED = { wallOff: 4.4, z0: 1416.5, split: 1445.5, z1: 1473.0, mcdanOff: 3.4, gate: [1434.6, 1444.0] as [number, number], blueGate: [1452.5, 1458.0] as [number, number], n4Gate: [1418.6, 1423.0] as [number, number], blueN4Gate: [1462.0, 1466.0] as [number, number], banner: [1425.0, 1442.5] as [number, number], splitGap: [1076.5, 1096.0] as [number, number] };

/** McDan Drive's centre line (the road the game maps there, which it names Mbabane Avenue; half width 3.1) */
export const MCDAN: [number, number][] = [[1090, 1213], [1115, 1410], [1119, 1438], [1134, 1539]];
export const mcdanX = (z: number) => { for (let i = 0; i < MCDAN.length - 1; i++) { const [ax, az] = MCDAN[i], [bx, bz] = MCDAN[i + 1]; if (z >= az && z <= bz) return ax + ((bx - ax) * (z - az)) / (bz - az); } return NaN; };

/**
 * Pair 21 (A01 arrow 21): on the raised verge opposite Leasafric, the cream roadside structure with its broad top and
 * curved ends and the grey inset panel, the blue structure beside it with its own curve and upper panel, the cluster of
 * signboards and the street light north of them. z of each, metres from the bank's face back. Their function is not
 * established; neither is a bus shelter.
 */
export const P21 = { cream: { z0: 1362.0, z1: 1371.5, back: 2.2, h: 3.1 }, blue: { z0: 1355.0, z1: 1359.6, back: 2.6, h: 3.0 }, signs: [1349.5, 1345.0, 1340.0, 1335.5], lamp: 1352.5 };

/** where this work draws the ground and props itself (the generic trees and lamps stay out): x0, x1, z0, z1 */
export const OK_KEEP: Box[] = [
  [1003, 1036, 1124, 1196], // the plaza's forecourt and the low-roof frontage
  [1012, 1048, 1194, 1246], // the ALPHA LED corner, the forecourt south of La-Bawaleshi Road
  [1006, 1082, 1240, 1338], // the sign shop, its neighbour, the green wall's plot
  [1032, 1126, 1330, 1474], // Leasafric, Pro Vision, Diamed and the blue neighbour
];
export const inOkKeep = (x: number, z: number, pad = 0) => OK_KEEP.some(([a, b, c, d]) => x > a - pad && x < b + pad && z > c - pad && z < d + pad);
