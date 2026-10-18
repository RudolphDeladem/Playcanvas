// Numbers for the owner's 16-pair brief (agric.ts draws them; pure data). Game metres: x east, z south. Read from the
// annotated aerial registered to the mapped roads; nothing measured.

/** where the models draw a road's edge themselves (x0, x1, z0, z1): the brick footway and open drain on Akuafo Road's west
 *  side (pair 16), the curved brick corner at its junction with Onyaa Road and the worn apron before the low roadside group
 *  (pairs 14, 15), the WACCI forecourt along Onyaa Road (pairs 11, 12), the Child Study Centre's gate (pair 5), the
 *  asphalt along the east block's north side where it leaves E.A. Boateng Road (pair 4). There the campus's generic verges
 *  and drains (life.ts) and a ridden route's generic pavements (world.ts) stay out. */
export const AG_OWNED: [number, number, number, number][] = [
  [225.5, 233.6, 139, 262.5],
  [236.6, 245, 265.2, 296],
  [236.6, 262, 265.6, 272],
  [268, 325, 265.6, 269.5],
  [415, 439, 265.6, 269.5],
  [511, 516.5, 204, 214.5],
  // (not the Agriculture side: the ring road's west arc at the main gate, widened toward the plaza, tenpairs.ts)
  [743.5, 761, 112.5, 143.5],
];
/** J.K.M. Hodasi Road's bend west of the Volta Hall Annex (the owner's Commonwealth and Great Hall brief, pairs 5 to 7;
 *  hodasi.ts draws its brick footway, kerbs and verges): the mapped centreline and how far either side the model owns */
export const HODASI = {
  pts: [[-303.5, -151.5], [-315.6, -146.3], [-332.5, -135.7], [-352.3, -114.2], [-372.9, -85.6], [-378.1, -76], [-386.9, -57.9], [-393.3, -30], [-392.1, 1.4]] as [number, number][],
  half: 3.7, owned: 11,
};
/** the nearest point of a polyline: its distance, the side (+1 left of the line's direction, -1 right) and how far along
 *  the line it is */
export function nearLine(pts: [number, number][], x: number, z: number) {
  let best = Infinity, side = 0, along = 0, acc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (l * l))), d = Math.hypot(ax + dx * t - x, az + dz * t - z);
    if (d < best) { best = d; side = Math.sign(dx * (z - az) - dz * (x - ax)); along = acc + t * l; }
    acc += l;
  }
  return { d: best, side, along };
}
const inHodasi = (x: number, z: number) => x > -405 && x < -290 && z > -160 && z < 8 && nearLine(HODASI.pts, x, z).d < HODASI.owned;
export const agOwns = (x: number, z: number) => AG_OWNED.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1) || inHodasi(x, z);
