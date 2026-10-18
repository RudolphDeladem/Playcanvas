// Numbers for the Diamond Jubilee Hall (diamondjubilee.ts), behind Jean Nelson Aka Hall, from the owner's Diamond
// Jubilee hostel brief (docs/diamond-jubilee/ledger.md). The model frame: x along the hostel's long axis from its north
// end (the map outline's long west edge), z across it, negative toward the front (east, Jean Nelson and Jubilee Link).
// Satellite M01 registered on this frame by the four rooftop tank groups at the outline's corner towers (fit within
// 0.9 m): x = 0.1527 px + 0.2696 py - 181.66, z = -0.2453 px + 0.1415 py + 27.09 (M01 pixels). Game metres.
// (No imports: life.ts, ipsplan.ts and science.ts read these.)

export type P2 = [number, number];
export type R4 = [number, number, number, number];

/** the frame's origin (world) and its x axis */
export const DJ_O: P2 = [-272.6, 1857.6];
export const DJ_AX: P2 = [54.5 / 109.4, 94.9 / 109.4];
export const djWorld = (x: number, z: number): P2 => [DJ_O[0] + x * DJ_AX[0] - z * DJ_AX[1], DJ_O[1] + x * DJ_AX[1] + z * DJ_AX[0]];
export const djLocal = (x: number, z: number): P2 => { const dx = x - DJ_O[0], dz = z - DJ_O[1]; return [dx * DJ_AX[0] + dz * DJ_AX[1], -dx * DJ_AX[1] + dz * DJ_AX[0]]; };

// ---------- the building (the map outline, its two holes the courts) ----------
/** the wings: front (east), rear (west, deeper and longer, as the outline), the north end, the cross-connection, the
 *  south end */
export const WINGS = {
  front: [-51.8, 43.6, -22.3, -13.8] as R4,
  rear: [-60.2, 48.9, 5.6, 19.8] as R4,
  north: [-51.8, -42.4, -13.8, 5.6] as R4,
  cross: [-8.6, -0.5, -13.8, 5.6] as R4,
  south: [33.4, 43.6, -13.8, 5.6] as R4,
};
/** the two open courts (C1 north, C2 south: the outline's holes) */
export const COURTS: R4[] = [[-42.4, -8.6, -13.8, 5.6], [-0.5, 33.4, -13.8, 5.6]];
/** the four corner stair towers (the outline's corner projections; M01's tank groups): rectangle, the outer end face
 *  and outer long face (the fin screen wraps that corner), the named tower (P03, R01-R06) */
export const TOWERS: { r: R4; end: 'x0' | 'x1'; side: 'z0' | 'z1'; named?: boolean }[] = [
  { r: [-54.7, -47.4, -26, -19.6], end: 'x0', side: 'z0', named: true },
  { r: [38.5, 46.9, -25, -19.4], end: 'x1', side: 'z0' },
  { r: [46.1, 53.6, 14.7, 22], end: 'x1', side: 'z1' },
  { r: [-63.4, -56.4, 13.4, 20.2], end: 'x0', side: 'z1' },
];
/** the entrance feature on the front, on the cross-connection's axis (where the mapped side road 366 meets the
 *  frontage): x range, its projection */
export const ENTRANCE = { x: [-9.3, 0.1] as P2, out: 1.0 };

// ---------- the frontage (R01-R12, P03, P06, P07; M01 4) ----------
/** the interlocking-paver forecourt: the parking lane (game road 365) runs through it at z -35.5 */
export const FORECOURT: R4 = [-66, 56, -47.6, -22];
export const NORTH_APRON: R4 = [-66, -52, -22, -4];
/** the kerbed lawn islands: the row before the building and the small squares east of the lane */
export const ISLANDS: R4[] = [[-64, -56.5, -32.4, -27.6], [-20, -11, -32.4, -27.6], [2, 11, -32.4, -27.6], [27, 36, -32.4, -27.6],
  [-46.6, -43.4, -43.4, -39.2], [-26.6, -23.4, -43.4, -39.2], [13.4, 16.6, -43.4, -39.2], [33.4, 36.6, -43.4, -39.2]];
/** the planted strip along the front (gaps: the entrance, the towers) */
export const BED = { z: [-23.9, -22.3] as P2, runs: [[-47, -10.5], [1.3, 38.2]] as P2[] };
/** the grass verge between the forecourt's drain and Jubilee Link, its break at road 366 */
export const VERGE = { z: [-51.0, -47.9] as P2, x: [-66, 56] as P2, gap: [-11, -5.6] as P2 };
/** the drain along the forecourt's outer edge */
export const DRAIN = { z: [-47.9, -47.3] as P2 };
/** the slim lights (R05, R11): along the front walk and the forecourt's outer edge */
export const LIGHTS: P2[] = [[-40, -25.2], [-22, -25.2], [13, -25.2], [31, -25.2], [-60, -46.6], [-36, -46.6], [-14, -46.6], [12, -46.6], [36, -46.6]];
/** the red hydrant-like post on the lawn left of the entrance (R10, R11) */
export const HYDRANT: P2 = [-12.2, -28.4];

// ---------- the rear and the detached pieces (P04, P05; M01 6, 7) ----------
/** the red-earth ground round the rear and the ends; rough grass and scrub beyond */
export const EARTH: R4 = [-80, 72, -22, 46];
export const SCRUB: R4 = [-80, 100, 46, 96];
/** the pale slab west of the hostel with its small roofed structure (M01 6; its use unresolved) */
export const PAD: R4 = [-13, 20, 25, 40];
export const PAD_SHED: R4 = [4, 13, 31, 37];
/** the detached small red-roof building and the black tank group by the lower site edge (M01 7; not a hostel wing) */
export const SHED7: R4 = [88, 98, -5, 1];
export const TANKS7: P2 = [94, 12.3];

/** where this work draws the ground and its pieces (generic trees, kiosks, lamps and painted kerbs stay out) */
export function ownsDj(x: number, z: number) {
  if (Math.abs(x + 250) > 140 || Math.abs(z - 1880) > 140) return false;
  const [lx, lz] = djLocal(x, z);
  return lx > -80 && lx < 100 && lz > -52 && lz < 96;
}
/** the paved forecourt (the mapped lane and the side road are pavers there, not asphalt: science.ts offAsphalt) */
export function inDjForecourt(x: number, z: number) {
  if (Math.abs(x + 260) > 90 || Math.abs(z - 1850) > 90) return false;
  const [lx, lz] = djLocal(x, z), [x0, x1, z0, z1] = FORECOURT;
  return lx > x0 && lx < x1 && lz > z0 && lz < z1;
}
