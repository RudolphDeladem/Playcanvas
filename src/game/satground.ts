// The campus's ground types read off the satellite picture (the owner, 2026-10-19: "in the map use satellite option
// ...differentiate the various type of grounds"; the ground and sidewalk specification of the same day): bare earth and
// light concrete paving (yards, car parks, forecourts) that the map leaves out. tools/satellite classifies Esri World
// Imagery a metre a cell in the game's frame, only where the game draws grass, leaving out buildings, roads, water,
// pitches, the map's car parks and plazas, what surfaces.json already draws or the owner decided, what waits on the
// owner's decision and the town by the main gate, and writes public/geo/ground-classes.png (a cell's grey level is its
// class, 0 is grass: left as the campus draws it). Here each class becomes a ground layer with smooth edges (marching squares on the
// cells), in the looks of surfaces.ts, laid on the relief; not where a site of the original models its own ground.
import { groundHeight } from './relief';
import { excludedAll } from './groundrules';
import type { SurfaceClass } from './surfaces';

/** the classified frame (tools/satellite/classify.py): its corner and size in metres, a metre a cell */
export const SAT = { x0: -850, z0: -1800, w: 2050, h: 3400 };
/** a cell's grey level -> the surface drawn */
export const SAT_CLASSES: (SurfaceClass | null)[] = [null, 'earth', 'parking'];

let cells: Uint8Array | null = null;
let loading: Promise<Uint8Array> | null = null;
/** the class map, loaded once */
export function loadSatGround(url = `${import.meta.env.BASE_URL}geo/ground-classes.png`) {
  return (loading ??= (async () => {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, img.width, img.height).data;
    const out = new Uint8Array(img.width * img.height);
    for (let i = 0; i < out.length; i++) out[i] = d[i * 4];
    return (cells = out);
  })());
}
/** the satellite's ground class at (x, z) (null: grass, or outside the frame, or not loaded yet) */
export function satClassAt(x: number, z: number): SurfaceClass | null {
  if (!cells) return null;
  const i = Math.floor(x - SAT.x0), j = Math.floor(z - SAT.z0);
  if (i < 0 || j < 0 || i >= SAT.w || j >= SAT.h) return null;
  return SAT_CLASSES[cells[j * SAT.w + i]] ?? null;
}

/** the triangles (x, z corners, flat) of one class, binned by chunk */
export function satTriangles(map: Uint8Array, k: number, chunk: number, emit: (key: string, t: number[][]) => void, rows: [number, number] = [0, SAT.h]) {
  const { x0, z0, w, h } = SAT;
  const on = (i: number, j: number) => (i >= 0 && j >= 0 && i < w && j < h && map[j * w + i] === k ? 1 : 0);
  // a corner's value: the share of the four cells round it in the class (the contour at a half: smooth edges)
  const v = (i: number, j: number) => (on(i - 1, j - 1) + on(i, j - 1) + on(i - 1, j) + on(i, j)) / 4;
  const keyOf = (x: number, z: number) => `${Math.floor(x / chunk)},${Math.floor(z / chunk)}`;
  const B = 8;
  // a flat quad of B x B metres follows the relief where the ground is about planar under it
  const flat = (x: number, z: number, s: number) => {
    const a = groundHeight(x, z), b = groundHeight(x + s, z), c = groundHeight(x + s, z + s), d = groundHeight(x, z + s);
    const m = groundHeight(x + s / 2, z + s / 2), e1 = groundHeight(x + s / 2, z), e2 = groundHeight(x, z + s / 2);
    return Math.abs(m - (a + b + c + d) / 4) < 0.012 && Math.abs(e1 - (a + b) / 2) < 0.012 && Math.abs(e2 - (a + d) / 2) < 0.012;
  };
  for (let bj = rows[0]; bj < Math.min(rows[1], h); bj += B) for (let bi = 0; bi < w; bi += B) {
    // a block wholly in the class (with a cell's margin, so its corners are whole): one quad
    let any = false, all = true;
    for (let j = bj - 1; j <= bj + B && (all || !any); j++) for (let i = bi - 1; i <= bi + B; i++) {
      const o = on(i, j);
      if (o && j >= bj && j < bj + B && i >= bi && i < bi + B) any = true;
      if (!o) all = false;
    }
    if (!any) continue;
    const bx = x0 + bi, bz = z0 + bj;
    if (all && bi + B <= w && bj + B <= h && flat(bx, bz, B) && !excludedAll(bx + B / 2, bz + B / 2) && !excludedAll(bx, bz) && !excludedAll(bx + B, bz + B) && !excludedAll(bx + B, bz) && !excludedAll(bx, bz + B)) {
      emit(keyOf(bx + B / 2, bz + B / 2), [[bx, bz], [bx + B, bz], [bx + B, bz + B], [bx, bz], [bx + B, bz + B], [bx, bz + B]]);
      continue;
    }
    // otherwise cell by cell: the part of the cell inside the contour, a convex polygon on the cell's outline; whole
    // cells along a row in one strip where the block's ground is about planar
    const even = flat(bx, bz, B);
    for (let j = bj; j < Math.min(bj + B, h + 1); j++) {
      let run = -1;
      const endRun = (i: number) => {
        if (run < 0) return;
        const xa = x0 + run, xb = x0 + i, z = z0 + j;
        emit(keyOf((xa + xb) / 2, z + 0.5), [[xa, z], [xb, z], [xb, z + 1], [xa, z], [xb, z + 1], [xa, z + 1]]);
        run = -1;
      };
      for (let i = bi; i < Math.min(bi + B, w + 1); i++) {
      const c = [v(i, j), v(i + 1, j), v(i + 1, j + 1), v(i, j + 1)];
      if (c[0] < 0.5 && c[1] < 0.5 && c[2] < 0.5 && c[3] < 0.5) { endRun(i); continue; }
      const x = x0 + i, z = z0 + j;
      if (excludedAll(x + 0.5, z + 0.5)) { endRun(i); continue; }
      if (even && c[0] >= 0.5 && c[1] >= 0.5 && c[2] >= 0.5 && c[3] >= 0.5) { if (run < 0) run = i; continue; }
      endRun(i);
      const P = [[x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1]];
      const poly: number[][] = [];
      for (let n = 0; n < 4; n++) {
        const m = (n + 1) % 4, a = c[n], b = c[m];
        if (a >= 0.5) poly.push(P[n]);
        if ((a >= 0.5) !== (b >= 0.5)) {
          const t = (0.5 - a) / (b - a);
          poly.push([P[n][0] + (P[m][0] - P[n][0]) * t, P[n][1] + (P[m][1] - P[n][1]) * t]);
        }
      }
      const tris: number[][] = [];
      for (let n = 1; n + 1 < poly.length; n++) tris.push(poly[0], poly[n], poly[n + 1]);
      if (tris.length) emit(keyOf(x + 0.5, z + 0.5), tris);
      }
      endRun(Math.min(bi + B, w + 1));
    }
  }
}
