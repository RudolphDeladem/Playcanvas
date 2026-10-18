// The owner's Great Hall surrounding landscape brief (Great_Hall_Surrounding_Landscape_Claude_Brief.pdf: Pictures 1 and 2,
// two overlapping aerials, and Picture 3, the game map, each with the work area marked in blue;
// docs/great-hall-landscape/evidence-audit.md): the undeveloped land behind (west of) the Great Hall, from the Legon
// ByPass to the Great Hall's compound and on north to the Research and Innovation compound and the tennis complex's tree
// belt. The game had it all as one mown lawn; the aerials show a mosaic of dense green thickets and tree clusters, low
// green cover, dry olive cover, exposed red-orange soil and narrow worn earth tracks. Game metres, x east, z south.
//
// The ground cover itself is a grid read from the aerials (landcover.ts, made by scripts/landcover/cover.py); this file
// holds the work area, what it leaves alone and which mapped tracks are earth. The blue marks are traced in map
// coordinates through the aerials' registration (the script's header); they are a work boundary, not a surveyed edge.
import { NODE_XZ, ROADS, BUILDINGS } from './campusmap';
import { GH_COVER, TC_COVER, type CoverGrid } from './landcover';
import { nogEarthDist } from './nogplan';
import { EARTH_BOX } from './jjplan';

export type P2 = [number, number];
export type Box = [number, number, number, number];

/** the work area: the union of the three blue marks (Picture 1 round the Great Hall's compound and the Vice Chancellor's
 *  residence, Picture 2 round the tennis complex's belt and the Public Affairs Directorate, Picture 3 along the ByPass) */
export const GHL_SCOPE: P2[] = [
  [-1993, -712], [-1210, -712], [-1203, -690], [-1100, -678], [-1016, -677], [-969, -690], [-950, -710], [-450, -710],
  [-400, -650], [-430, -560], [-455, -436], [-455, -323], [-432, -249], [-427, -178], [-548, -169], [-698, -155],
  [-726, -118], [-731, -62], [-717, -24], [-754, 50], [-1016, 18], [-1053, 32], [-1091, 89], [-1127, 143],
  [-1163, 179], [-1176, 215], [-1163, 251], [-1127, 273], [-1082, 282], [-1019, 278], [-965, 256], [-963, 488],
  [-1993, 488],
];
/** inside the area but developed: the Research and Innovation compound (its three blocks, parking and lawn, Picture 2;
 *  Picture 12 of the tennis brief shows its fence), and the sealed end of the road east of it toward the School of
 *  Graduate Studies (Picture 12: the red dirt turns to grey there) */
export const GHL_EXCLUDE: Box[] = [[-706, -574, -278, -176], [-480, -400, -245, -170]];
/** the area's bounds */
export const GHL_BOX: Box = [-1993, -400, -712, 488];

export const inRing = (r: P2[], x: number, z: number) => {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, zi] = r[i], [xj, zj] = r[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
};
/** inside the landscape's work area */
export const inGhl = (x: number, z: number) =>
  x > GHL_BOX[0] && x < GHL_BOX[1] && z > GHL_BOX[2] && z < GHL_BOX[3] && inRing(GHL_SCOPE, x, z) && !GHL_EXCLUDE.some(([a, b, c, d]) => x > a && x < b && z > c && z < d);

// ---------- the ground cover grids ----------
const decoded = new Map<CoverGrid, Uint8Array>();
function cells(g: CoverGrid) {
  let a = decoded.get(g);
  if (a) return a;
  a = new Uint8Array(g.nx * g.nz);
  let k = 0;
  for (let i = 0; i < g.rle.length;) {
    let j = i;
    while (j < g.rle.length && g.rle.charCodeAt(j) >= 48 && g.rle.charCodeAt(j) <= 57) j++;
    if (j > i && g.rle[j] === '~') { const n = +g.rle.slice(i, j), c = g.rle.charCodeAt(j + 1) - 97; a.fill(c, k, k + n); k += n; i = j + 2; }
    else { a[k++] = g.rle.charCodeAt(i) - 97; i++; }
  }
  decoded.set(g, a);
  return a;
}
/** the cover at a point: class (0 no evidence, 1 dense green, 2 green low cover, 3 dry sparse cover, 4 red-orange
 *  soil, 5 pale bare ground, 6 dark brown ground) and the dense green share of its cell in quarters (0-3) */
export function coverAt(g: CoverGrid, x: number, z: number): [number, number] {
  const i = Math.floor((x - g.x0) / g.cell), j = Math.floor((z - g.z0) / g.cell);
  if (i < 0 || j < 0 || i >= g.nx || j >= g.nz) return [0, 0];
  const v = cells(g)[j * g.nx + i];
  return [v >> 2, v & 3];
}
export const ghCover = (x: number, z: number) => coverAt(GH_COVER, x, z);
export const tcCover = (x: number, z: number) => coverAt(TC_COVER, x, z);
export { GH_COVER, TC_COVER };

// ---------- the earth tracks ----------
/** the tennis complex's surroundings, where the dirt road along the north of the belt (Picture 12) and the end of the
 *  dirt road from the north-west are earth too */
export const TC_EARTH: Box[] = [[-760, -600, -205, -45], [-760, -660, -45, 5]];
/** (and Noguchi and WAGMC's red-earth tracks, nogplan.ts NOG_EARTH: the owner's correction brief, S02/S17/S18) */
const nearNogEarth = (x: number, z: number, r: number) => x > 170 && x < 560 && z > 1820 && z < 2220 && nogEarthDist(x, z) < r;
// (and the earth track to the J.J. Rawlings yard, jjplan.ts EARTH_BOX)
const inEarthArea = (x: number, z: number) => inGhl(x, z) || [...TC_EARTH, EARTH_BOX].some(([a, b, c, d]) => x > a && x < b && z > c && z < d) || nearNogEarth(x, z, 6);
/** a mapped track or service road (classes 3 and 4) that the aerials show as earth where it crosses the area: every
 *  path and track there, and the service roads there (the dirt road from the tennis complex's corner west to the grey
 *  patch, the curve south to the pale rectangle): none is sealed in the aerials */
export const EARTH_ROADS: number[] = ROADS.flatMap((r, i) => (r.cls >= 3 && (r.nodes.some((n) => inGhl(NODE_XZ[n * 2], NODE_XZ[n * 2 + 1]) || [...TC_EARTH, EARTH_BOX].some(([a, b, c, d]) => NODE_XZ[n * 2] > a && NODE_XZ[n * 2] < b && NODE_XZ[n * 2 + 1] > c && NODE_XZ[n * 2 + 1] < d)) || r.nodes.every((n) => nearNogEarth(NODE_XZ[n * 2], NODE_XZ[n * 2 + 1], 1.5))) ? [i] : []));
/** half width of an earth track as drawn: the worn footpaths narrow, the service tracks a vehicle's width */
export const earthHalf = (ri: number) => (ROADS[ri].cls === 4 ? 0.9 : ROADS[ri].nodes.every((n) => nearNogEarth(NODE_XZ[n * 2], NODE_XZ[n * 2 + 1], 1.5)) ? 2.1 : ROADS[ri].surface === 'trail' ? 1.3 : 1.9);
const SG = 24;
/** the earth tracks' segments, and the other roads' near the area (where a track meets a sealed road, the sealed road
 *  keeps its surface right through the junction) */
const segs: [number, number, number, number, number][] = [];
const sealed: [number, number, number, number, number][] = [];
const sgrid = new Map<string, number[]>(), xgrid = new Map<string, number[]>();
const DRAWN_HALF = [4.5, 3.7, 3.1, 2.3, 1.3];
const file = (grid: Map<string, number[]>, s: number, ax: number, az: number, bx: number, bz: number) => {
  for (let i = Math.floor((Math.min(ax, bx) - 4) / SG); i <= Math.floor((Math.max(ax, bx) + 4) / SG); i++)
    for (let j = Math.floor((Math.min(az, bz) - 4) / SG); j <= Math.floor((Math.max(az, bz) + 4) / SG); j++) {
      const key = `${i},${j}`;
      (grid.get(key) ?? grid.set(key, []).get(key)!).push(s);
    }
};
const earthSet = new Set(EARTH_ROADS);
ROADS.forEach((r, ri) => {
  for (let k = 0; k < r.nodes.length - 1; k++) {
    const ax = NODE_XZ[r.nodes[k] * 2], az = NODE_XZ[r.nodes[k] * 2 + 1], bx = NODE_XZ[r.nodes[k + 1] * 2], bz = NODE_XZ[r.nodes[k + 1] * 2 + 1];
    if (earthSet.has(ri)) { segs.push([ax, az, bx, bz, earthHalf(ri)]); file(sgrid, segs.length - 1, ax, az, bx, bz); continue; }
    if ((Math.max(ax, bx) < GHL_BOX[0] - 20 || Math.min(ax, bx) > GHL_BOX[1] + 20 || Math.max(az, bz) < GHL_BOX[2] - 20 || Math.min(az, bz) > GHL_BOX[3] + 20) && !(nearNogEarth(ax, az, 40) || nearNogEarth(bx, bz, 40))) continue;
    sealed.push([ax, az, bx, bz, DRAWN_HALF[r.cls]]); file(xgrid, sealed.length - 1, ax, az, bx, bz);
  }
});
const segDist = ([ax, az, bx, bz]: number[], x: number, z: number) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(ax + dx * t - x, az + dz * t - z);
};
/** distance to the nearest earth track's centre line (within about 4 m; Infinity further) */
export function earthDist(x: number, z: number) {
  let best = Infinity;
  for (const s of sgrid.get(`${Math.floor(x / SG)},${Math.floor(z / SG)}`) ?? []) best = Math.min(best, segDist(segs[s], x, z));
  return best;
}
/** on a sealed (not earth) road's surface, near the area */
export function onSealed(x: number, z: number, pad = 0) {
  for (const s of xgrid.get(`${Math.floor(x / SG)},${Math.floor(z / SG)}`) ?? []) if (segDist(sealed[s], x, z) < sealed[s][4] + pad) return true;
  return false;
}
/** on one of the earth tracks, inside the area (the map's own road is not drawn as asphalt or concrete there: science.ts
 *  offAsphalt; ghlandscape.ts paints the track), and not on a sealed road it meets */
export function onEarthTrack(x: number, z: number) {
  return earthDist(x, z) < 1.2 && inEarthArea(x, z) && !onSealed(x, z, 0.8);
}
/** the earth tracks as polylines (for the painting) */
export const earthLines = () => EARTH_ROADS.map((ri) => ({ half: earthHalf(ri), pts: ROADS[ri].nodes.map((n) => [NODE_XZ[n * 2], NODE_XZ[n * 2 + 1]] as P2) }));

/** The pale rectangle south-west of the Great Hall (Pictures 1 and 2: a flat pale ground surface, no roof, no shadow): the
 *  map has an outline there (osm, 49 m square; the satellite footprints match nothing), which the game drew as a
 *  49 m red-roofed building. Kept as a pale clearing, its function unconfirmed (no pad, edging or facility added). */
export const PALE_AT: P2 = [-1273, 269];
export const PALE = BUILDINGS.find((b) => PALE_AT[0] > b.minX && PALE_AT[0] < b.maxX && PALE_AT[1] > b.minZ && PALE_AT[1] < b.maxZ && b.maxX - b.minX > 40);
