// What a free-ridden bike can't pass and where the ground is rough, from the data the converter baked out of the
// original game (tools/export: exportData). The original computed these at run time from its Three.js scene graph
// (meshcollide.ts rasterised the drawn meshes at bike height, solids.ts gathered trunks and posts as the models were
// built, science.ts tested the earth-track boxes, life.ts the landmark keep-outs); here they are loaded once:
//
//   collision.lrz  the bike-height raster, 42 m tiles of 0.35 m cells (exactly the original's meshcollide raster)
//   solids.lrz     round solids: x, z, radius (trunks, palms, posts, greenhouse frames)
//   passages.json  open passages through buildings' ground floors
//   opassages.json the halls' gateways: passages along a line at any angle
//   earth.lrz      the earth tracks, 1 m cells in 64 m tiles
//   landmark.lrz   the landmark models' footprints, 0.5 m cells in 64 m tiles
import { fetchz } from '../engine/fetchz';
import { OPASSAGES, PASSAGES, SOLIDS } from './solids';

const tkey = (i: number, j: number) => (i + 4096) * 8192 + (j + 4096);

/** a sparse bit raster: tiles of n x n cells, only the tiles with any cell set */
class Raster {
  private tiles = new Map<number, Uint8Array>();
  constructor(public tile: number, public cell: number) {}
  get n() { return Math.round(this.tile / this.cell); }
  set(i: number, j: number, bits: Uint8Array) { this.tiles.set(tkey(i, j), bits); }
  at(x: number, z: number) {
    const i = Math.floor(x / this.tile), j = Math.floor(z / this.tile), t = this.tiles.get(tkey(i, j));
    if (!t) return false;
    const n = this.n, ci = Math.floor((x - i * this.tile) / this.cell), cj = Math.floor((z - j * this.tile) / this.cell);
    const c = Math.min(n - 1, cj) * n + Math.min(n - 1, ci);
    return (t[c >> 3] & (1 << (c & 7))) !== 0;
  }
  get size() { return this.tiles.size; }
}

let mesh: Raster | null = null, earth: Raster | null = null, landmark: Raster | null = null;

function readRaster(buf: ArrayBuffer, headInts: number, tile: number, cell: number, countAt: number) {
  const head = new Int32Array(buf, 0, headInts);
  const count = head[countAt];
  const list = new Int32Array(buf, headInts * 4, count * 2);
  const r = new Raster(tile, cell), n = r.n, bytes = Math.ceil((n * n) / 8);
  let o = (headInts + count * 2) * 4;
  for (let k = 0; k < count; k++) { r.set(list[k * 2], list[k * 2 + 1], new Uint8Array(buf, o, bytes)); o += bytes; }
  return r;
}

let loading: Promise<void> | null = null;
/** loads every gameplay raster (once); the ride waits for it with the campus */
export function loadCollision(base = `${import.meta.env.BASE_URL}campus/`) {
  return (loading ??= (async () => {
    const [c, s, p, e, l, op] = await Promise.all([
      fetchz(`${base}collision.lrz`),
      fetchz(`${base}solids.lrz`),
      fetch(`${base}passages.json`).then((r) => r.json() as Promise<[number, number, number, number][]>),
      fetchz(`${base}earth.lrz`),
      fetchz(`${base}landmark.lrz`).catch(() => null),
      fetch(`${base}opassages.json`).then((r) => (r.ok ? (r.json() as Promise<typeof OPASSAGES>) : [])).catch(() => []),
    ]);
    {
      const h = new Int32Array(c, 0, 4);
      mesh = readRaster(c, 4, h[0] / 1000, h[1] / 1000, 3);
    }
    const sol = new Float32Array(s);
    SOLIDS.clear();
    for (let i = 0; i + 2 < sol.length; i += 3) SOLIDS.add(sol[i], sol[i + 1], sol[i + 2]);
    PASSAGES.length = 0;
    PASSAGES.push(...p);
    OPASSAGES.length = 0;
    OPASSAGES.push(...op);
    {
      const h = new Int32Array(e, 0, 2);
      earth = readRaster(e, 2, h[0], 1, 1);
    }
    if (l) {
      const h = new Int32Array(l, 0, 3);
      landmark = readRaster(l, 3, h[0], h[1] / 1000, 2);
    }
  })());
}
export const collisionReady = () => !!mesh;

/** some drawn surface at bike height within `pad` of x, z (the original's meshcollide.meshBlocked) */
export function meshBlocked(x: number, z: number, pad = 0.2) {
  if (!mesh) return false;
  const C = mesh.cell, r = Math.ceil(pad / C);
  for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (mesh.at(x + di * C, z + dj * C)) return true;
  return false;
}
/** (the original built its raster tiles lazily round the bike; here they are all loaded already) */
export function warmCollision(_x: number, _z: number) { /* loaded with the campus */ }
export function warmOne(_x: number, _z: number) { /* loaded with the campus */ }

/** on the earth tracks of the science campus brief (rougher, slower free riding): science.ts onEarth */
export const onEarth = (x: number, z: number) => !!earth?.at(x, z);

/** inside a landmark model's footprint, within `pad` metres (life.ts inLandmark) */
export function inLandmark(x: number, z: number, pad = 0) {
  if (!landmark) return false;
  if (landmark.at(x, z)) return true;
  if (pad <= 0) return false;
  // the raster is the footprint itself: the pad is a ring of samples round the point
  const steps = Math.max(1, Math.ceil(pad / landmark.cell));
  for (let s = 1; s <= steps; s++) {
    const r = (pad * s) / steps, n = Math.max(6, Math.ceil((2 * Math.PI * r) / landmark.cell));
    for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; if (landmark.at(x + Math.cos(a) * r, z + Math.sin(a) * r)) return true; }
  }
  return false;
}
