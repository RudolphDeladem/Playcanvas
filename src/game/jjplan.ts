// Numbers for the J.J. Rawlings Avenue corridor corrections (jjyard.ts), from the owner's JJ Rawlings corridor brief
// (docs/jj-rawlings/ledger.md): satellite picture 13 registered on the game map by the walled compound with two roofs
// north-west of the yard (osm outline at x 779, z 684) and the Ghana Revenue Authority block (osm:way/758602538):
// x = 779 + (px - 245) / 2.19, z = 684 + (py - 78) / 2.19, north up. Street View pairs 1-6 (September 2024) for the
// frontages. Game metres, x east, z south. (No imports: life.ts, labawaleshie.ts and okponglo.ts read these.)

export type P2 = [number, number];
export type Box = [number, number, number, number];

const inPoly = (p: P2[], x: number, z: number) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > z) !== (p[j][1] > z) && x < ((p[j][0] - p[i][0]) * (z - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };
const xOn = (l: P2[], z: number) => { for (let i = 1; i < l.length; i++) { const [ax, az] = l[i - 1], [bx, bz] = l[i]; if ((z - az) * (z - bz) <= 0 && az !== bz) return ax + ((bx - ax) * (z - az)) / (bz - az); } return NaN; };

// ---------- the yard west of the avenue (pictures 13, 14, 16; pairs 5, 6) ----------
/** the working yard's bare floor (picture 13 callout 1 and 2), its function unconfirmed: an equipment/material yard */
export const YARD: P2[] = [[765.3, 835.6], [881.7, 833.3], [897, 838], [903, 870], [908, 891], [911, 931.5], [914, 950], [916, 960], [916, 995.4], [858.9, 1013.7], [817.8, 1013.7], [817.8, 949.8], [758.5, 949.8], [756.2, 904.1]];
export const inYard = (x: number, z: number) => inPoly(YARD, x, z);
/** the road-side enclosure: blue-grey sheet panels with grey wall portions (pair 5), along the yard's east edge, behind
 *  the scrub and the narrow walking path along the avenue (the mapped trail 1423) */
export const FENCE: P2[] = [[897, 838], [903, 870], [908, 891], [911, 931.5], [914, 950], [916, 960], [916, 995.4]];
/** the stretches of the enclosure that are grey wall, not panels (pair 5: "adjacent grey wall portions") [DECISION] */
export const WALL_Z: P2[] = [[900, 913], [968, 984]];
/** behind the enclosure, inside the yard's north-south extent: the scrub west of the avenue stops at the fence */
export const behindYardFence = (x: number, z: number) => z > 836 && z < 996 && x < xOn(FENCE, Math.min(995, Math.max(838.5, z))) + 0.6;
/** the grey rows (picture 13 callout 1): stored long elements or low roofed bays, unresolved; simple low masses.
 *  Each group: x0, x1, z0, z1, the rows' direction and spacing */
export const ROWS: { box: Box; along: 'x' | 'z'; step: number }[] = [
  { box: [766, 792, 843, 876], along: 'x', step: 5.5 },
  { box: [800, 832, 878, 904], along: 'z', step: 6 },
  { box: [861, 893, 841, 876], along: 'z', step: 6.4 },
  { box: [852, 902, 893, 927], along: 'z', step: 6.4 },
];
/** the yellow boom machine (pairs 5, 6; picture 13's yellow mark): a mobile crane silhouette, no brand */
export const CRANE: P2 = [843, 897];
/** the green container-like volume by the enclosure (pair 5) */
export const CONTAINER: P2 = [898.5, 920];
/** the yard's red-roof service building (picture 13 callout 2): the mapped outline at x 867-893, z 949-982 */
export const RED_SHED: Box = [866, 894, 948, 983];
/** the bare field west of the yard (picture 13: pale ground, no pitch where the game drew two) */
export const FIELD: P2[] = [[726.5, 954], [817.8, 954], [817.8, 1066.6], [726.5, 1066.6]];
/** the earth track up to the yard from Jubilee Drive and on north (game roads 30 and 1516: earth on every picture), up to
 *  the drive's north footway (not over the drive: the owner's picture 1) */
export const EARTH_BOX: Box = [826, 872, 900, 1235.5];

// ---------- the east frontage across the avenue (pairs 2-4; picture 13 callouts 3, 4) ----------
/** the broad dusty opening off the avenue's east edge: its mouth on the road and the area behind it */
export const OPENING: P2[] = [[928.8, 770], [946, 768], [972, 766], [988, 775], [990, 800], [981, 818], [958, 821], [929.5, 820]];
/** the grey paved walking strip along the avenue's east edge (pairs 3, 4) */
export const STRIP = { z0: 735, z1: 905, w: 2.0 };
/** the one billboard (pairs 2, 3, 4): its pole at the opening's north-west corner, the face turned to the south-west */
export const BOARD = { at: [934.5, 767.5] as P2, w: 5.6, h: 3.6, y: 4.2, face: [-0.35, 0.94] as P2 };
/** the open frame fence along the opening's north edge behind the pots, its framed gate at the east end */
export const FRAME: P2[] = [[936, 765.5], [972, 763.5]];
/** the potted plants and tyre planters (pairs 2, 4): under the trees along the opening's north edge and along the road */
export const POTS: P2[][] = [[[937, 767.2], [971, 765.2]], [[932.5, 742], [933.5, 764]]];
/** the small roadside trees with slender trunks (pair 4) */
export const SMALL_TREES: P2[] = [[936, 742], [937, 750], [938.5, 758], [944, 764], [953, 763], [962, 762], [970, 761], [984, 781]];
/** the hard grey surface by the frontage south of the opening (pair 2's right side) [DECISION: extent] */
export const SOUTH_PAD: Box = [929, 950, 821, 834];

// ---------- the Ghana Revenue Authority frontage (pair 1) ----------
/** the railing on a low wall before the GRA block, with the entrance gap; the grey forecourt between it and the road */
export const GRA = { x: 990, z0: 1006, z1: 1043, gap: [1015.5, 1022.5] as P2, pave: [975.6, 990, 1006, 1043] as Box, sign: [988.6, 1011.5] as P2 };

/** the avenue's east edge (the northbound carriageway's kerb: game road 1095, half 4.95) at z */
export const EAST_EDGE: P2[] = [[917, 762], [947, 907], [951, 930], [960, 976], [964, 997], [974, 1051]];
export const eastKerb = (z: number) => xOn(EAST_EDGE, z) + 4.95;

/** where this work draws the ground and its pieces itself (generic trees, kiosks, lamps and painted kerbs stay out) */
export function ownsJj(x: number, z: number) {
  if (x < 720 || x > 1000 || z < 730 || z > 1070) return false;
  if (inYard(x, z) || inPoly(FIELD, x, z) || inPoly(OPENING, x, z)) return true;
  if (z > STRIP.z0 && z < STRIP.z1) { const e = eastKerb(z); if (x > e - 0.3 && x < e + 12) return true; }
  const [a, b, c, d] = GRA.pave;
  return x > a - 0.3 && x < b + 0.5 && z > c && z < d;
}
