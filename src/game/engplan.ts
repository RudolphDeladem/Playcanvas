// Numbers for the ground round the School of Engineering Sciences (engground.ts), from the owner's satellite picture
// (docs/engineering-ses/, registered at 4.157 px/m) and the owner's words on it (2026-10-14): sidewalks where the map
// shows them, the track behind the school brown earth, low bush between the building and that track, thick forest
// beyond it up to Evandy. Pure data: science.ts reads the track (offAsphalt) as well as engground.ts.
import { ROADS, NODE_XZ } from './campusmap';

type P2 = [number, number];
const xz = (n: number): P2 => [NODE_XZ[n * 2], NODE_XZ[n * 2 + 1]];
const segDist = (x: number, z: number, [ax, az]: P2, [bx, bz]: P2) => {
  const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz, t = l ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l)) : 0;
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
};

/** the footpath behind the school (mapped, class 4: from the road west of the car park round the back to Annie Jiagge
 *  Road), drawn as brown earth, not the pale path (the owner: "the thin road that passes behind the school is brown") */
export const ENG_TRACK_INDEX = ROADS.findIndex((r) => r.cls === 4 && r.nodes.some((n) => Math.hypot(xz(n)[0] - 419, xz(n)[1] + 485) < 2));
export const ENG_TRACK: P2[] = ENG_TRACK_INDEX >= 0 ? ROADS[ENG_TRACK_INDEX].nodes.map(xz) : [];
export const ENG_TRACK_HALF = 1.2;
/** on the track, short of its ends (where it meets the sealed roads, they keep their surface) */
export function onEngTrack(x: number, z: number) {
  if (ENG_TRACK.length < 2 || x < 355 || x > 506 || z > -425 || z < -545) return false;
  const [s, e] = [ENG_TRACK[0], ENG_TRACK[ENG_TRACK.length - 1]];
  if (Math.hypot(x - s[0], z - s[1]) < 5 || Math.hypot(x - e[0], z - e[1]) < 6) return false;
  for (let i = 1; i < ENG_TRACK.length; i++) if (segDist(x, z, ENG_TRACK[i - 1], ENG_TRACK[i]) < ENG_TRACK_HALF + 0.2) return true;
  return false;
}
/** the track's z at x (it runs west to east), for telling the bush behind the school from the forest beyond */
export function trackZ(x: number) {
  for (let i = 1; i < ENG_TRACK.length; i++) {
    const [ax, az] = ENG_TRACK[i - 1], [bx, bz] = ENG_TRACK[i];
    if (x >= Math.min(ax, bx) && x <= Math.max(ax, bx) && bx !== ax) return az + ((bz - az) * (x - ax)) / (bx - ax);
  }
  return NaN;
}

export const ENG_GROUND = {
  /** low bush between the back of the building and the track */
  bush: { x0: 396, x1: 503, z0: -540, z1: -456 },
  /** trees and bush between the east block and Annie Jiagge Road (the satellite) */
  east: { x0: 495.5, x1: 503, z0: -452, z1: -404 },
  /** the forest: north of the track (west of the track's start, north of z0w), up to Evandy Hostel's latitude, from the
   *  Botanical Gardens side to Annie Jiagge Road (the brief's wider satellite picture, the owner) */
  forest: { x0: 160, x1: 503, z0: -1250, zw: -470 },
  /** the service strip kept clear behind the building (m) */
  strip: 4.5,
  /** sidewalks (the satellite: pale strips along the lawns): which road, which side (1 left of its drawing direction,
   *  -1 right), the stretch (x or z range), and the inner and outer offsets from its centre line (m) */
  walks: [
    { at: [430, -339] as P2, side: 1, along: 'x' as const, range: [349, 505] as P2, off: [3.3, 5.0] as P2 },
    { at: [427, -357] as P2, side: 1, along: 'z' as const, range: [-374, -347] as P2, off: [2.5, 4.0] as P2 },
    { at: [427, -357] as P2, side: -1, along: 'z' as const, range: [-374, -347] as P2, off: [2.5, 4.0] as P2 },
    { at: [344.5, -400] as P2, side: -1, along: 'z' as const, range: [-428, -347] as P2, off: [3.3, 5.0] as P2 },
    { at: [510, -400] as P2, side: 1, along: 'z' as const, range: [-452, -347] as P2, off: [3.3, 5.0] as P2 },
  ],
};
/** the road a sidewalk runs beside: the mapped road nearest the point */
export function roadNear([x, z]: P2) {
  let best = -1, bd = Infinity;
  ROADS.forEach((r, ri) => {
    if (r.cls > 3) return;
    for (let i = 1; i < r.nodes.length; i++) { const d = segDist(x, z, xz(r.nodes[i - 1]), xz(r.nodes[i])); if (d < bd) { bd = d; best = ri; } }
  });
  return best;
}

// ---------- the owner's revised satellite comparison (batch 134, refs/owner-satellite-3.webp) ----------
/** a point of the owner's close satellite picture (the left half, 1000 x 772 px) in game metres: the picture is the
 *  brief's satellite at x 1.384 / y 1.296 scale (matched on the car park's corner, the shed, the access road's mouth and
 *  the lawns' outer corners), which registers on the map at 4.157 px/m (refs/ registration-overlay.png). Ground features
 *  only: the roofs lean in the picture. */
export const sat = (px: number, py: number): P2 => [344.5 + ((px + 406) / 1.384 - 330) / 4.157, -340 + ((py + 394) / 1.296 - 845) / 4.157];
/** the trees the picture shows round the school (picture px, crown radius m): the car park's middle line and its edges,
 *  the group between the car park and the front block, the group east of the front block, the belt along the east
 *  lawn's east side, and the lawns' scattered trees */
export const ENG_TREES: [number, number, number][] = [
  [335, 190, 3.6], [340, 280, 2.2], [345, 405, 3], [356, 458, 3.2], [487, 430, 3], [560, 378, 2.8], [562, 432, 2.8],
  [742, 382, 3.2], [762, 425, 3.2], [748, 458, 2.6],
  [884, 468, 3.2], [880, 502, 3.4], [882, 534, 3.2], [888, 566, 3], [890, 596, 3], [880, 626, 2.8], [868, 648, 2.4],
  [410, 592, 4.2], [376, 586, 2.6], [446, 590, 2.6], [268, 586, 1.6], [484, 636, 1.6], [612, 596, 1.6], [680, 600, 3.2], [790, 600, 1.8],
  [240, 132, 2.6], [948, 120, 3.4], [955, 300, 3],
];
/** the parked cars the picture shows: picture px, and the cars stand across the bays (length along x) */
export const ENG_CARS: P2[] = [[325, 240], [325, 280], [325, 320], [325, 358], [325, 385], [320, 410], [257, 413], [257, 430], [257, 448]];
/** the bays (game metres): rows of 2.6 m bays 5 m deep down the car park (the west edge, both sides of the tree line),
 *  and the short row south of the west wing; the tree line's planted island */
export const ENG_BAYS = {
  rows: [[377.4, 382.4], [389.6, 394.6], [396.6, 401.6]] as P2[],
  z: [-440, -384] as P2,
  south: { x: [410, 432] as P2, z: [-397, -392] as P2 },
  island: [394.7, 396.5] as P2,
};
/** the forecourt as paved (the picture: one concrete apron from the car park's south edge to the lawns' kerb, the
 *  access road ending in it): the mapped service road along it is not drawn as asphalt there */
export const ENG_FORECOURT: [number, number, number, number] = [376, 490, -381.5, -375];
/** the side road the picture shows from the road west of the car park into the car park's north-west corner (the map's
 *  road stops 14 m short, where the footpath behind the school begins): drawn as a paved strip, not a new route */
export const ENG_SIDE_ROAD: [number, number, number, number] = [361, 377, -435.5, -428.5];
export const inEngForecourt = (x: number, z: number) => x > ENG_FORECOURT[0] && x < ENG_FORECOURT[1] && z > ENG_FORECOURT[2] && z < ENG_FORECOURT[3];
