// The campus's ground surfaces corrected from the evidence (the owner's surface brief, 2026-10-18): car parks that
// rendered as grass, walkways and lanes whose OSM surface is pavers, earth, gravel or concrete but which rendered as
// asphalt or as the original's cream footpath concrete. The classification is data (src/data/surfaces.json, made by
// tools/surfaces/classify.mjs from the master geography, the OSM tags, the owner's notes and a top-down audit of how
// each surface rendered); what each class looks like is the table below; the geometry is the mapped footprint (areas)
// or the mapped centre line at its mapped width (lines), laid on the ground's relief. Correcting a class changes only
// this table or the data, never the campus's geometry.
//
// Not drawn: surfaces nothing identifies (an untagged footpath stays as it is, listed for review in the data), car
// parks and plazas that already render as a hard surface (a site of the original models them), and anywhere a site
// models its own ground (roadedges.ts excludedAll).
import * as THREE from '../engine/lite3';
import data from '../data/surfaces.json';
import { groundHeight } from './relief';
import { asphaltTexture, concreteTexture, grassTexture } from './textures';
import { canvasTex, paverTexture, rnd } from './groundtex';
import { excludedAll } from './groundrules';
import { SAT, SAT_CLASSES, loadSatGround, satTriangles } from './satground';

export type SurfaceClass = 'parking' | 'parking-pavers' | 'plaza' | 'pavers-walk' | 'pavers-road' | 'earth' | 'gravel' | 'concrete-walk' | 'concrete-road' | 'asphalt-walk' | 'asphalt-area' | 'grass';
interface Feature { id: string; geom: 'area' | 'line'; cls: SurfaceClass | null; pts: number[]; w?: number }

// ------------------------------------------------------------------------------------------------- what each class is
/** laterite: the red-brown compacted earth of Legon's paths and lanes */
const earthTex = () => canvasTex(256, (g, s) => {
  // dusty red-brown laterite (the owner's satellite pictures of Pent and TF): soft lighter and darker patches, fine grit,
  // a few stones; no bands, so a large field reads as ground, not boards
  g.fillStyle = '#a7714f'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 40; i++) {
    const x = rnd() * s, y = rnd() * s, r = 12 + rnd() * 40, light = rnd() < 0.5;
    for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      gr.addColorStop(0, light ? 'rgba(214,170,128,0.35)' : 'rgba(120,72,46,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  }
  for (let i = 0; i < 9000; i++) { g.fillStyle = ['#94603f', '#b07d58', '#bb8a64', '#8a5839', '#c79b74'][(rnd() * 5) | 0]; const r = 0.6 + rnd() * 1.6; g.fillRect(rnd() * s, rnd() * s, r, r); }
  for (let i = 0; i < 60; i++) { g.fillStyle = ['#cfc3b2', '#8d8478'][(rnd() * 2) | 0]; g.fillRect(rnd() * s, rnd() * s, 2 + rnd() * 2, 2 + rnd() * 2); }
});
const gravelTex = () => canvasTex(256, (g, s) => {
  g.fillStyle = '#8d8478'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 14000; i++) { g.fillStyle = ['#a59c8f', '#776f64', '#b8afa2', '#6a635a', '#9a7a62'][(rnd() * 5) | 0]; const r = 1 + rnd() * 2.5; g.fillRect(rnd() * s, rnd() * s, r, r); }
});
/** a plaza's slabs: 0.6 m light concrete flags */
const slabTex = () => canvasTex(256, (g, s) => {
  g.fillStyle = '#cbc4b6'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 6000; i++) { g.fillStyle = ['#c2baab', '#d4cdc0', '#bdb5a6'][(rnd() * 3) | 0]; g.fillRect(rnd() * s, rnd() * s, 1.5, 1.5); }
  g.fillStyle = '#9d968a';
  const n = 4;
  for (let i = 0; i < n; i++) { g.fillRect((i * s) / n, 0, 2, s); g.fillRect(0, (i * s) / n, s, 2); }
});
const concreteSlabTex = () => canvasTex(256, (g, s) => {
  g.fillStyle = '#b4afa5'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 6000; i++) { g.fillStyle = ['#aaa59b', '#bfbab0', '#a39e94'][(rnd() * 3) | 0]; g.fillRect(rnd() * s, rnd() * s, 1.5, 1.5); }
  g.fillStyle = '#8f8a80'; g.fillRect(0, 0, s, 2);
});

/** class -> material (its texture, the metres a picture covers, a colour multiplying it, its height over the ground:
 *  above the converted campus's own ground layers, lifted up to 1.6 cm, campus.ts, below the paving the original lays
 *  3-5 cm over the ground, which wins where the two meet, and below the main roads' asphalt at 7 cm, roadedges.ts) */
interface Look { tex: () => THREE.Texture; scale: number; color?: string; h: number }
export const LOOKS: Record<SurfaceClass, Look> = {
  // car parks: a light, worn asphalt (the original's car-park concrete read as asphalt from the ground); pavers where
  // the owner's photos show them
  // (the same surface as the original's own car parks, world.ts: its concrete texture tinted #b9bbbf, 5 m a picture, the
  // owner, 2026-10-19: "the sidewalk and car park have same design")
  'parking': { tex: concreteTexture, scale: 5, color: '#b9bbbf', h: 0.036 },
  'parking-pavers': { tex: () => paverTexture(['#8f8d87', '#97948d', '#868480', '#9d9a92'], '#5f5d58', ['#b9b2a6', '#4f4c47']), scale: 1.6, h: 0.036 },
  'plaza': { tex: slabTex, scale: 2.4, h: 0.026 },
  // walkways of interlocking pavers: red-brown (the owner: "brown or reddish pedestrian walkways")
  'pavers-walk': { tex: () => paverTexture(['#7f4634', '#8a4f3a', '#74402f', '#915741', '#7a4433'], '#57392c', ['#a87a62', '#4a2a1f']), scale: 1.6, h: 0.032 },
  'pavers-road': { tex: () => paverTexture(['#7f4634', '#8a4f3a', '#74402f', '#915741', '#7a4433'], '#57392c', ['#a87a62', '#4a2a1f']), scale: 1.6, h: 0.032 },
  'earth': { tex: earthTex, scale: 14, h: 0.028 },
  'gravel': { tex: gravelTex, scale: 3, h: 0.028 },
  'concrete-walk': { tex: concreteSlabTex, scale: 1.5, h: 0.032 },
  'concrete-road': { tex: concreteSlabTex, scale: 4, h: 0.032 },
  'asphalt-walk': { tex: () => asphaltTexture(false), scale: 6, color: '#dedede', h: 0.032 },
  // (a drive or lane the map leaves out, the campus roads' own asphalt: the owner's satellite pictures)
  'asphalt-area': { tex: () => asphaltTexture(), scale: 8, color: '#e6e6e6', h: 0.03 },
  'grass': { tex: grassTexture, scale: 8, color: '#e4e0cc', h: 0.032 },
};
let mats: Partial<Record<SurfaceClass, THREE.MeshStandardMaterial>> = {};
export function material(c: SurfaceClass) {
  return (mats[c] ??= new THREE.MeshStandardMaterial({ map: LOOKS[c].tex(), color: LOOKS[c].color ?? '#ffffff', roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 }));
}

// ------------------------------------------------------------------------------------------------- which features
/** the features drawn (the classifier writes only those: lines with a known surface, other than plain asphalt, that
 *  the audit found rendered in another colour; areas the audit found rendered wrong, or whose material the owner's
 *  evidence names) */
export const DRAWN: Feature[] = (data as { features: Feature[] }).features;
/** the hard surfaces drawn (car parks, plazas, paths): nothing grows on them */
const HARD = DRAWN.filter((f) => f.cls !== 'grass');

// ------------------------------------------------------------------------------------------------- geometry
/** ear clipping of a simple polygon (x, z pairs), triangles as index triples */
function triangulate(p: number[]): number[] {
  const n = p.length / 2, idx = Array.from({ length: n }, (_, i) => i), out: number[] = [];
  let area = 0;
  for (let i = 0, j = n - 1; i < n; j = i++) area += p[j * 2] * p[i * 2 + 1] - p[i * 2] * p[j * 2 + 1];
  const ccw = area > 0;
  const cross = (a: number, b: number, c: number) => (p[b * 2] - p[a * 2]) * (p[c * 2 + 1] - p[a * 2 + 1]) - (p[b * 2 + 1] - p[a * 2 + 1]) * (p[c * 2] - p[a * 2]);
  const inside = (a: number, b: number, c: number, q: number) => {
    const s1 = cross(a, b, q), s2 = cross(b, c, q), s3 = cross(c, a, q);
    return ccw ? s1 >= 0 && s2 >= 0 && s3 >= 0 : s1 <= 0 && s2 <= 0 && s3 <= 0;
  };
  let guard = 0;
  while (idx.length > 3 && guard++ < 10000) {
    let cut = false;
    for (let k = 0; k < idx.length; k++) {
      const a = idx[(k + idx.length - 1) % idx.length], b = idx[k], c = idx[(k + 1) % idx.length];
      const conv = ccw ? cross(a, b, c) > 0 : cross(a, b, c) < 0;
      if (!conv) continue;
      if (idx.some((q) => q !== a && q !== b && q !== c && inside(a, b, c, q))) continue;
      out.push(a, b, c);
      idx.splice(k, 1);
      cut = true;
      break;
    }
    if (!cut) break; // (a self-touching outline: what is left is dropped rather than drawn wrong)
  }
  if (idx.length === 3) out.push(idx[0], idx[1], idx[2]);
  return out;
}

/** a flat triangle split until no side is longer than `max` metres, so that laid on the ground it follows the relief */
function split(a: number[], b: number[], c: number[], max: number, out: number[][]) {
  const ab = Math.hypot(a[0] - b[0], a[1] - b[1]), bc = Math.hypot(b[0] - c[0], b[1] - c[1]), ca = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const m = Math.max(ab, bc, ca);
  if (m <= max) { out.push(a, b, c); return; }
  const mid = (u: number[], v: number[]) => [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2];
  if (m === ab) { const p = mid(a, b); split(a, p, c, max, out); split(p, b, c, max, out); }
  else if (m === bc) { const p = mid(b, c); split(a, b, p, max, out); split(a, p, c, max, out); }
  else { const p = mid(c, a); split(a, b, p, max, out); split(p, b, c, max, out); }
}

/** the triangles (flat x, z corners) of a feature's ground: an area's footprint, or a line's strip at its width with
 *  round ends and round joints */
function triangles(f: Feature): number[][] {
  const tris: number[][] = [];
  const p = f.pts;
  if (f.geom === 'area') {
    const t = triangulate(p);
    for (let k = 0; k < t.length; k += 3) split([p[t[k] * 2], p[t[k] * 2 + 1]], [p[t[k + 1] * 2], p[t[k + 1] * 2 + 1]], [p[t[k + 2] * 2], p[t[k + 2] * 2 + 1]], 3, tris);
    return tris;
  }
  const half = Math.max(0.6, (f.w ?? 2) / 2);
  for (let i = 0; i + 3 < p.length; i += 2) {
    const ax = p[i], az = p[i + 1], bx = p[i + 2], bz = p[i + 3], L = Math.hypot(bx - ax, bz - az);
    if (L < 1e-3) continue;
    const nx = (-(bz - az) / L) * half, nz = ((bx - ax) / L) * half;
    const a1 = [ax + nx, az + nz], a2 = [ax - nx, az - nz], b1 = [bx + nx, bz + nz], b2 = [bx - nx, bz - nz];
    split(a1, b1, b2, 3, tris);
    split(a1, b2, a2, 3, tris);
  }
  // round joints and ends: a disc at every point (so bends close and ends are not square cuts across a lawn)
  for (let i = 0; i < p.length; i += 2) {
    const n = 10;
    for (let k = 0; k < n; k++) {
      const t0 = (k / n) * Math.PI * 2, t1 = ((k + 1) / n) * Math.PI * 2;
      tris.push([p[i], p[i + 1]], [p[i] + Math.cos(t0) * half, p[i + 1] + Math.sin(t0) * half], [p[i] + Math.cos(t1) * half, p[i + 1] + Math.sin(t1) * half]);
    }
  }
  return tris;
}

// ------------------------------------------------------------------------------------------------- the layer
const CHUNK = 256;
interface Chunk { cx: number; cz: number; group: THREE.Group }
/** the corrected surfaces: built once (a few hundred features), one mesh a material a 256 m chunk, shown near the
 *  camera */
export class Surfaces {
  readonly group = new THREE.Group();
  private chunks: Chunk[] = [];
  radius = 520;
  constructor() {
    this.group.name = 'surfaces';
    const bins = new Map<string, { pos: number[]; nrm: number[]; uv: number[] }>();
    for (const f of DRAWN) {
      const look = LOOKS[f.cls!];
      const tris = triangles(f);
      for (let k = 0; k < tris.length; k += 3) {
        const t = [tris[k], tris[k + 1], tris[k + 2]];
        const cx = (t[0][0] + t[1][0] + t[2][0]) / 3, cz = (t[0][1] + t[1][1] + t[2][1]) / 3;
        // (where a site of the original models its own ground, it is left to it)
        if (excludedAll(cx, cz)) continue;
        const key = `${Math.floor(cx / CHUNK)},${Math.floor(cz / CHUNK)},${f.cls}`;
        let b = bins.get(key);
        if (!b) bins.set(key, (b = { pos: [], nrm: [], uv: [] }));
        // wound to face up (x east, z south, y up: clockwise seen from above)
        const ccw = (t[1][0] - t[0][0]) * (t[2][1] - t[0][1]) - (t[1][1] - t[0][1]) * (t[2][0] - t[0][0]) > 0;
        for (const v of ccw ? [t[0], t[2], t[1]] : t) {
          b.pos.push(v[0], groundHeight(v[0], v[1]) + look.h, v[1]);
          b.nrm.push(0, 1, 0);
          b.uv.push(v[0] / look.scale, v[1] / look.scale);
        }
      }
    }
    this.addBins(bins);
  }
  private groups = new Map<string, Chunk>();
  /** one mesh a chunk and class from the binned triangles */
  private addBins(bins: Map<string, { pos: number[]; nrm: number[]; uv: number[] }>) {
    for (const [key, b] of bins) {
      const [i, j, cls] = key.split(',');
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nrm, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      const mesh = new THREE.Mesh(g, material(cls as SurfaceClass));
      mesh.receiveShadow = true;
      const ck = `${i},${j}`;
      let c = this.groups.get(ck);
      if (!c) { this.groups.set(ck, (c = { cx: (+i + 0.5) * CHUNK, cz: (+j + 0.5) * CHUNK, group: new THREE.Group() })); this.group.add(c.group); this.chunks.push(c); }
      c.group.add(mesh);
    }
  }
  /** the ground types read off the satellite picture (satground.ts): loaded after the start, then drawn as the rest */
  async addSatellite() {
    const map = await loadSatGround();
    const bins = new Map<string, { pos: number[]; nrm: number[]; uv: number[] }>();
    // (a band of rows at a time between frames: the start does not stall)
    for (let r0 = 0; r0 < SAT.h; r0 += 64) {
    await new Promise((res) => setTimeout(res, 0));
    SAT_CLASSES.forEach((cls, k) => {
      if (!cls) return;
      const look = LOOKS[cls];
      satTriangles(map, k, CHUNK, (ck, tris) => {
        const key = `${ck},${cls}`;
        let b = bins.get(key);
        if (!b) bins.set(key, (b = { pos: [], nrm: [], uv: [] }));
        for (let n = 0; n < tris.length; n += 3) {
          const t = [tris[n], tris[n + 1], tris[n + 2]];
          const ccw = (t[1][0] - t[0][0]) * (t[2][1] - t[0][1]) - (t[1][1] - t[0][1]) * (t[2][0] - t[0][0]) > 0;
          for (const v of ccw ? [t[0], t[2], t[1]] : t) {
            b.pos.push(v[0], groundHeight(v[0], v[1]) + look.h, v[1]);
            b.nrm.push(0, 1, 0);
            b.uv.push(v[0] / look.scale, v[1] / look.scale);
          }
        }
      }, [r0, r0 + 64]);
    });
    }
    this.addBins(bins);
  }
  /** shows the chunks near the camera */
  update(x: number, z: number) {
    for (const c of this.chunks) c.group.visible = Math.hypot(c.cx - x, c.cz - z) < this.radius;
  }
}

// ------------------------------------------------------------------------------------------------- nothing grows here
const GRID = 32;
let grid: Map<number, Feature[]> | null = null;
const key = (i: number, j: number) => (i + 4096) * 8192 + (j + 4096);
/** on a drawn hard surface (a corrected car park, plaza or path): the campus's trees and shrubs are left out there */
export function onHardSurface(x: number, z: number) {
  if (!grid) {
    grid = new Map();
    for (const f of HARD) {
      const pad = f.geom === 'line' ? (f.w ?? 2) / 2 : 0;
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (let i = 0; i < f.pts.length; i += 2) { x0 = Math.min(x0, f.pts[i]); x1 = Math.max(x1, f.pts[i]); z0 = Math.min(z0, f.pts[i + 1]); z1 = Math.max(z1, f.pts[i + 1]); }
      for (let i = Math.floor((x0 - pad) / GRID); i <= Math.floor((x1 + pad) / GRID); i++) for (let j = Math.floor((z0 - pad) / GRID); j <= Math.floor((z1 + pad) / GRID); j++) { const k = key(i, j); let l = grid.get(k); if (!l) grid.set(k, (l = [])); l.push(f); }
    }
  }
  for (const f of grid.get(key(Math.floor(x / GRID), Math.floor(z / GRID))) ?? []) {
    const p = f.pts;
    if (f.geom === 'area') {
      let c = false;
      for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) if ((p[i + 1] > z) !== (p[j + 1] > z) && x < ((p[j] - p[i]) * (z - p[i + 1])) / (p[j + 1] - p[i + 1]) + p[i]) c = !c;
      if (c) return true;
    } else {
      const half = (f.w ?? 2) / 2;
      for (let i = 0; i + 3 < p.length; i += 2) {
        const ax = p[i], az = p[i + 1], dx = p[i + 2] - ax, dz = p[i + 3] - az, l2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
        if (Math.hypot(x - ax - dx * t, z - az - dz * t) < half) return true;
      }
    }
  }
  return false;
}

/** a road here whose mapped surface is not asphalt (pavers, earth, gravel, concrete): roadedges.ts lays no asphalt or
 *  sidewalks over it */
const LINES = DRAWN.filter((f) => f.geom === 'line' && f.cls !== 'asphalt-walk');
let lineGrid: Map<number, Feature[]> | null = null;
export function unpavedAt(x: number, z: number) {
  if (!lineGrid) {
    lineGrid = new Map();
    for (const f of LINES) for (let i = 0; i < f.pts.length; i += 2) { const k = key(Math.floor(f.pts[i] / GRID), Math.floor(f.pts[i + 1] / GRID)); let l = lineGrid.get(k); if (!l) lineGrid.set(k, (l = [])); if (!l.includes(f)) l.push(f); }
  }
  for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) for (const f of lineGrid.get(key(Math.floor(x / GRID) + di, Math.floor(z / GRID) + dj)) ?? []) {
    const p = f.pts;
    for (let i = 0; i + 3 < p.length; i += 2) {
      const ax = p[i], az = p[i + 1], dx = p[i + 2] - ax, dz = p[i + 3] - az, l2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
      if (Math.hypot(x - ax - dx * t, z - az - dz * t) < 1.2) return true;
    }
  }
  return false;
}
