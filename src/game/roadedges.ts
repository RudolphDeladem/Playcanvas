// The roads' edges, as on the real campus (the owner's corrections, 2026-10-18, with photos of a campus road and its
// sidewalk): smooth asphalt with rounded corners where roads meet and rounded joins where a road bends, then along both
// sides of every main road a concrete lip, an open gutter, a raised white stone kerb and a sidewalk of grey concrete
// pavers in herringbone, with a concrete edging on the far side. The main roads are 1.5 times as wide as the map has
// them. Roads into halls (Pent, Evandy and the others) have no sidewalk; where one of them or
// a service lane joins a main road the sidewalk opens for it; where a footpath meets the road the gutter is bridged.
// Not drawn where a site models its own edges (ownsEdges), on the plain stretches of the NSIA Road and by the Kuffour
// Quadrangle, on earth and brick roads, in the Legon Road cutting, on stairs, or through buildings and walls.
//
// How: the main roads make one distance field, each road its own capsule chain (the distance to its centre line less
// its half width) and the roads combined with a smooth minimum, so that junctions get rounded corners. The field is
// sampled on a 1 m grid a 64 m tile at a time and every band of it (asphalt below 0, lip, gutter, sidewalk) is cut out
// of each grid cell exactly (the cell clipped by the field interpolated along its edges): smooth curves at any angle.
// Cells wholly inside one band are merged into strips, and the raised bands get vertical faces along their outlines.
// Tiles are built round the camera a few milliseconds a frame and dropped behind it.
import * as THREE from '../engine/lite3';
import { AREAS, buildingAt, NODE_XZ, PLACES, ROADS } from './campusmap';
import { ROAD_WIDTH } from './life';
import { groundHeight } from './relief';
import { meshBlocked } from './collision';
import { asphaltTexture } from './textures';
import { canvasTex, paverTexture, rnd } from './groundtex';
import { excludedAll } from './groundrules';
import { unpavedAt } from './surfaces';

// ------------------------------------------------------------------------------------------------- the section
/** across the road edge (m, from the asphalt's edge outward) and heights above the ground */
const LIP = 0.18, GUTTER = 0.78, KERB = 0.96, WALK = 2.96;
const H = { road: 0.07, lip: 0.15, gutter: 0.075, kerb: 0.26, walk: 0.2, edging: -0.05 };
/** the route's road is at least this wide each side on the main roads (the original's ROUTE_EDGE: the ridden lanes) */
const MIN_HALF = 3.9;
/** the main roads 1.5 times as wide as the map's (the owner: "too thin for 2 cars", 2026-10-18) */
const WIDEN = 1.5;
/** how round the corners where roads meet are (the smooth minimum's reach, m) */
const ROUND = 4;
const TILE = 64, CELL = 1, N = TILE / CELL;

// ------------------------------------------------------------------------------------------------- the roads
interface Seg { ax: number; az: number; bx: number; bz: number; w: number; g: number; w0?: number }
const main: Seg[] = [], side: Seg[] = [], path: Seg[] = [];
const GRID = 16, REACH = 12;
const gkey = (i: number, j: number) => (i + 4096) * 8192 + (j + 4096);
const grids = [new Map<number, Seg[]>(), new Map<number, Seg[]>(), new Map<number, Seg[]>()];
let groups = 0;
let built = false;

const HALLS = PLACES.filter((p) => p.kind === 'hall');
/** an unnamed road by a hall is the hall's own (its entrance and yard): no sidewalk */
const intoHall = (x: number, z: number) => HALLS.some((h) => Math.hypot(h.x - x, h.z - z) < 90);

function prepare() {
  if (built) return;
  built = true;
  // roads that continue one another (a node where only the two of them meet) are one group: within a group the plain
  // minimum (no bulge at their join), between groups the smooth one (round corners)
  const parent = ROADS.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const ends = new Map<number, number[]>();
  // (a road whose mapped surface is pavers, earth, gravel or concrete, surfaces.ts, keeps that surface: no asphalt or
  // sidewalks laid over it)
  const unpaved = (r: (typeof ROADS)[number]) => {
    let on = 0, n = 0;
    for (let k = 0; k < r.nodes.length - 1; k++) { const a = r.nodes[k], b = r.nodes[k + 1]; n++; if (unpavedAt((NODE_XZ[a * 2] + NODE_XZ[b * 2]) / 2, (NODE_XZ[a * 2 + 1] + NODE_XZ[b * 2 + 1]) / 2)) on++; }
    return n > 0 && on / n >= 0.6;
  };
  const isMain = ROADS.map((r) => r.cls <= 2 && !(r.name == null && r.nodes.some((n) => intoHall(NODE_XZ[n * 2], NODE_XZ[n * 2 + 1]))) && !unpaved(r));
  ROADS.forEach((r, ri) => {
    if (!isMain[ri]) return;
    for (const n of r.nodes) { let l = ends.get(n); if (!l) ends.set(n, (l = [])); l.push(ri); }
  });
  for (const l of ends.values()) if (l.length === 2 && l[0] !== l[1]) parent[find(l[0])] = find(l[1]);
  const gid = new Map<number, number>();
  ROADS.forEach((r, ri) => {
    const list = isMain[ri] ? main : r.cls <= 3 ? side : r.surface === 'steps' ? null : path;
    if (!list) return;
    const half = ROAD_WIDTH[r.cls] / 2;
    const w = isMain[ri] ? Math.max(half, MIN_HALF) * WIDEN : r.cls === 4 ? 1.3 : half;
    let g = -1;
    if (isMain[ri]) { const root = find(ri); g = gid.get(root) ?? gid.set(root, groups++).get(root)!; }
    for (let k = 0; k < r.nodes.length - 1; k++) {
      const a = r.nodes[k], b = r.nodes[k + 1];
      const s: Seg = { ax: NODE_XZ[a * 2], az: NODE_XZ[a * 2 + 1], bx: NODE_XZ[b * 2], bz: NODE_XZ[b * 2 + 1], w, g, w0: w / WIDEN };
      list.push(s);
      const grid = grids[list === main ? 0 : list === side ? 1 : 2];
      const x0 = Math.floor((Math.min(s.ax, s.bx) - REACH) / GRID), x1 = Math.floor((Math.max(s.ax, s.bx) + REACH) / GRID);
      const z0 = Math.floor((Math.min(s.az, s.bz) - REACH) / GRID), z1 = Math.floor((Math.max(s.az, s.bz) + REACH) / GRID);
      for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) { const key = gkey(i, j); let c = grid.get(key); if (!c) grid.set(key, (c = [])); c.push(s); }
    }
  });
  // a dual carriageway keeps its mapped width: widened, its two roads and their sidewalks would close over the median
  // (the lawn between them, as before the Balme Library); so does any road running alongside another this closely
  const narrow = new Set<Seg>();
  for (const s of main) {
    const dx = s.bx - s.ax, dz = s.bz - s.az, L = Math.hypot(dx, dz);
    if (L < 1) continue;
    const mx = (s.ax + s.bx) / 2, mz = (s.az + s.bz) / 2;
    for (const o of grids[0].get(gkey(Math.floor(mx / GRID), Math.floor(mz / GRID))) ?? []) {
      if (o === s) continue;
      const ox = o.bx - o.ax, oz = o.bz - o.az, OL = Math.hypot(ox, oz);
      if (OL < 1 || Math.abs((dx * ox + dz * oz) / (L * OL)) < 0.9) continue;
      // (beside it, not further along the same line: the midpoint falls inside the other segment, off to one side)
      const t = ((mx - o.ax) * ox + (mz - o.az) * oz) / (OL * OL), off = Math.abs((mx - o.ax) * oz - (mz - o.az) * ox) / OL;
      if (t <= 0.02 || t >= 0.98 || off < 3) continue;
      if (off < s.w + o.w + 2 * WALK + 2) { narrow.add(s); narrow.add(o); }
    }
  }
  for (const s of narrow) s.w = s.w0 ?? s.w;
}

function segDist(s: Seg, x: number, z: number) {
  const dx = s.bx - s.ax, dz = s.bz - s.az, l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / l2));
  return Math.hypot(x - s.ax - dx * t, z - s.az - dz * t);
}
const smin = (a: number, b: number, k: number) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const FAR = 99;
const perGroup = new Map<number, number>();
/** distance from (x, z) to the nearest main road's edge (negative on the road), corners rounded */
function mainField(x: number, z: number) {
  const list = grids[0].get(gkey(Math.floor(x / GRID), Math.floor(z / GRID)));
  if (!list) return FAR;
  perGroup.clear();
  for (const s of list) {
    const d = segDist(s, x, z) - s.w;
    if (d > ROUND + WALK + 2) continue;
    const p = perGroup.get(s.g);
    if (p === undefined || d < p) perGroup.set(s.g, d);
  }
  let f = FAR;
  for (const d of perGroup.values()) f = f === FAR ? d : smin(f, d, ROUND);
  return f;
}
/** distance to the nearest road of another kind (service lanes and hall roads: 1; footpaths: 2), negative on it */
function plainField(kind: 1 | 2, x: number, z: number) {
  const list = grids[kind].get(gkey(Math.floor(x / GRID), Math.floor(z / GRID)));
  let f = FAR;
  if (list) for (const s of list) f = Math.min(f, segDist(s, x, z) - s.w);
  return f;
}

/** inside a mapped car park or plaza (their own paving runs up to the road: no lip, gutter or sidewalk across it) */
const hardGrid = new Map<number, number[][]>();
let hardReady = false;
function inHardArea(x: number, z: number) {
  if (!hardReady) {
    hardReady = true;
    for (const a of AREAS) {
      if (a.kind !== 'parking' && a.kind !== 'plaza') continue;
      const p = Array.from(a.pts);
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (let i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); z0 = Math.min(z0, p[i + 1]); z1 = Math.max(z1, p[i + 1]); }
      for (let i = Math.floor(x0 / GRID); i <= Math.floor(x1 / GRID); i++) for (let j = Math.floor(z0 / GRID); j <= Math.floor(z1 / GRID); j++) { const k = gkey(i, j); let l = hardGrid.get(k); if (!l) hardGrid.set(k, (l = [])); l.push(p); }
    }
  }
  for (const p of hardGrid.get(gkey(Math.floor(x / GRID), Math.floor(z / GRID))) ?? []) {
    let c = false;
    for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) if ((p[i + 1] > z) !== (p[j + 1] > z) && x < ((p[j] - p[i]) * (z - p[i + 1])) / (p[j + 1] - p[i + 1]) + p[i]) c = !c;
    if (c) return true;
  }
  return false;
}

/** no lip, gutter or sidewalk through a building or along a wall (a lamp post or a sign is not a wall: most of the
 *  cell must be blocked) */
const excludedEdge = (x: number, z: number) => !!buildingAt(x, z, 0.3) || inHardArea(x, z) || [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]].filter(([a, b]) => meshBlocked(x + a, z + b, 0)).length >= 3;

// ------------------------------------------------------------------------------------------------- materials
/** the sidewalks' grey concrete pavers, dark joints, a little red dust (the owner's photos) */
const herringbone = () => paverTexture(['#8f8d87', '#97948d', '#868480', '#9d9a92', '#8a877f', '#93908a', '#7f7d78'], '#5f5d58', ['#b9b2a6', '#b9b2a6', '#8c6a55', '#4f4c47']);
/** the gutter's floor: dark, damp concrete with silt */
const gutterTex = () => canvasTex(128, (g, s) => {
  g.fillStyle = '#26241f'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 2500; i++) { g.fillStyle = ['#1e1c19', '#2f2c27', '#3a3129', '#24211d'][(rnd() * 4) | 0]; g.fillRect(rnd() * s, rnd() * s, 1 + rnd() * 2, 1 + rnd() * 2); }
});
/** kerb concrete: weathered grey with a little red dust */
const concreteTex = () => canvasTex(128, (g, s) => {
  g.fillStyle = '#9a948a'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 2500; i++) { g.fillStyle = ['#8a847a', '#a8a298', '#8f7f70', '#b0aaa0'][(rnd() * 4) | 0]; g.fillRect(rnd() * s, rnd() * s, 1 + rnd() * 2, 1 + rnd() * 2); }
});

type Mat = 'road' | 'walk' | 'gutter' | 'concrete' | 'paint' | 'kerb';
/** the white stone kerb that lines every sidewalk */
const kerbTex = () => canvasTex(128, (g, s) => {
  g.fillStyle = '#dcd9d0'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 1800; i++) { g.fillStyle = ['#cfcbc1', '#e6e3db', '#c4bfb4', '#d6d2c8'][(rnd() * 4) | 0]; g.fillRect(rnd() * s, rnd() * s, 1 + rnd() * 2, 1 + rnd() * 2); }
  // joints between the kerb stones, every 0.5 m along
  g.fillStyle = '#9d988d';
  for (let x = 0; x < s; x += s / 4) g.fillRect(x, 0, 1.5, s);
});
let mats: Record<Mat, THREE.MeshStandardMaterial> | null = null;
function materials() {
  if (mats) return mats;
  const road = asphaltTexture();
  // (drawn over the campus's own road and its old markings: lifted 7 cm and pulled forward in depth, so that neither
  // flickers through it at any distance)
  const over = { polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 };
  mats = {
    road: new THREE.MeshStandardMaterial({ map: road, roughness: 0.93, color: '#e6e6e6', ...over }),
    walk: new THREE.MeshStandardMaterial({ map: herringbone(), roughness: 0.95 }),
    gutter: new THREE.MeshStandardMaterial({ map: gutterTex(), roughness: 0.9, ...over }),
    concrete: new THREE.MeshStandardMaterial({ map: concreteTex(), roughness: 0.95 }),
    kerb: new THREE.MeshStandardMaterial({ map: kerbTex(), roughness: 0.85 }),
    paint: new THREE.MeshStandardMaterial({ color: '#ecebe4', roughness: 0.8, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -12 }),
  };
  return mats;
}
/** world-space texture scale (m a picture) for each surface */
const UV: Record<string, number> = { road: 8, walk: 1.6, gutter: 2, concrete: 2, paint: 1, kerb: 2 };

// ------------------------------------------------------------------------------------------------- one tile
type Pt = [number, number, number[]]; // x, z, field values
class Soup {
  pos: number[] = []; nrm: number[] = []; uv: number[] = []; idx: number[] = [];
  /** top faces only: their edges, to find the outline for the vertical faces */
  edges = new Map<string, [number, number, number, number, number]>();
  constructor(public name: string, public h: number, public base: number | null) {}
  private v(x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, w: number) {
    this.pos.push(x, y, z); this.nrm.push(nx, ny, nz); this.uv.push(u, w);
    return this.pos.length / 3 - 1;
  }
  /** a flat polygon (x, z outline, clockwise seen from above as the grid cells run) at this soup's height over the ground */
  poly(p: [number, number][]) {
    const s = UV[this.name], base = [] as number[];
    for (const [x, z] of p) base.push(this.v(x, groundHeight(x, z) + this.h, z, 0, 1, 0, x / s, z / s));
    for (let i = 1; i < p.length - 1; i++) this.idx.push(base[0], base[i + 1], base[i]);
    if (this.base === null) return;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      const ka = `${Math.round(a[0] * 1000)},${Math.round(a[1] * 1000)}`, kb = `${Math.round(b[0] * 1000)},${Math.round(b[1] * 1000)}`;
      if (ka === kb) continue;
      const back = `${kb}|${ka}`;
      if (this.edges.has(back)) this.edges.delete(back);
      else this.edges.set(`${ka}|${kb}`, [a[0], a[1], b[0], b[1], 0]);
    }
  }
  /** the vertical faces along the outline, from the top down to the base height (facing out) */
  walls(into: Soup) {
    if (this.base === null) return;
    for (const [ax, az, bx, bz] of this.edges.values()) {
      const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz);
      if (l < 1e-4) continue;
      // the polygons run clockwise seen from above (x east, z south): the outside is on the left of a -> b
      const nx = dz / l, nz = -dx / l;
      const ga = groundHeight(ax, az), gb = groundHeight(bx, bz), s = UV.concrete;
      const along0 = (ax + az) / s, along1 = along0 + l / s;
      const i0 = into.v(ax, ga + this.h, az, nx, 0, nz, along0, this.h / s), i1 = into.v(bx, gb + this.h, bz, nx, 0, nz, along1, this.h / s);
      const i2 = into.v(ax, ga + this.base, az, nx, 0, nz, along0, this.base / s), i3 = into.v(bx, gb + this.base, bz, nx, 0, nz, along1, this.base / s);
      into.idx.push(i0, i1, i2, i1, i3, i2);
    }
  }
  /** another soup's triangles added to this one's */
  append(o: Soup) {
    const base = this.pos.length / 3;
    // (a loop, not a spread: a tile's arrays are too long to pass as arguments)
    for (const v of o.pos) this.pos.push(v);
    for (const v of o.nrm) this.nrm.push(v);
    for (const v of o.uv) this.uv.push(v);
    for (const i of o.idx) this.idx.push(base + i);
  }
  geometry() {
    if (!this.idx.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx);
    return g;
  }
}

/** a polygon clipped to f(p) >= 0, f linear along each edge (values carried per vertex) */
function clip(poly: Pt[], f: (p: Pt) => number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a);
    if ((fa >= 0) !== (fb >= 0)) {
      // (the crossing computed the same way from either side, so neighbouring cells share their vertices exactly)
      const [p, q, fp, fq] = fa < fb ? [a, b, fa, fb] : [b, a, fb, fa];
      const t = fp / (fp - fq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2].map((v, k) => v + (q[2][k] - v) * t)]);
    }
  }
  return out;
}

interface Band { soup: string; test: ((v: number[]) => number)[] }
/** v = [main field, side-road field, footpath field] */
const BANDS: Band[] = [
  { soup: 'road', test: [(v) => -v[0]] },
  { soup: 'lip', test: [(v) => v[0], (v) => LIP - v[0], (v) => v[1] - 0.6] },
  { soup: 'gutter', test: [(v) => v[0] - LIP, (v) => GUTTER - v[0], (v) => v[1] - 0.6, (v) => v[2]] },
  // (a footpath crossing the gutter: paved over, a slab at the sidewalk's height)
  { soup: 'walk', test: [(v) => v[0] - LIP, (v) => GUTTER - v[0], (v) => v[1] - 0.6, (v) => -v[2]] },
  // (the white stone kerb along the sidewalk's road side, a little higher; flush where a footpath crosses)
  { soup: 'kerb', test: [(v) => v[0] - GUTTER, (v) => KERB - v[0], (v) => v[1] - 0.6, (v) => v[2]] },
  { soup: 'walk', test: [(v) => v[0] - GUTTER, (v) => KERB - v[0], (v) => v[1] - 0.6, (v) => -v[2]] },
  { soup: 'walk', test: [(v) => v[0] - KERB, (v) => WALK - v[0], (v) => v[1] - 0.6] },
];

/** builds one 64 m piece: its surfaces, one soup a material; null when no main road comes near it */
function buildTile(ti: number, tj: number): Record<Mat, Soup> | null {
  prepare();
  const x0 = ti * TILE, z0 = tj * TILE;
  // anything here at all?
  let near = false;
  for (let i = Math.floor((x0 - REACH) / GRID); i <= Math.floor((x0 + TILE + REACH) / GRID) && !near; i++) for (let j = Math.floor((z0 - REACH) / GRID); j <= Math.floor((z0 + TILE + REACH) / GRID) && !near; j++) near = !!grids[0].get(gkey(i, j))?.length;
  if (!near) return null;
  const V = N + 1, fm = new Float32Array(V * V), fs = new Float32Array(V * V), fp = new Float32Array(V * V);
  for (let j = 0; j < V; j++) for (let i = 0; i < V; i++) {
    const x = x0 + i * CELL, z = z0 + j * CELL, k = j * V + i;
    fm[k] = mainField(x, z);
    fs[k] = fm[k] < WALK + 1 ? plainField(1, x, z) : FAR;
    fp[k] = fm[k] < WALK + 1 && fm[k] > -1 ? plainField(2, x, z) : FAR;
  }
  const soups: Record<string, Soup> = {
    road: new Soup('road', H.road, null),
    lip: new Soup('concrete', H.lip, H.road),
    gutter: new Soup('gutter', H.gutter, null),
    walk: new Soup('walk', H.walk, H.edging),
    kerb: new Soup('kerb', H.kerb, H.edging),
    kerbSides: new Soup('kerb', 0, null),
    walls: new Soup('concrete', 0, null),
  };
  // whole cells inside one band, merged along each row
  const runs: Record<string, [number, number, number][]> = { road: [], walk: [] };
  for (let j = 0; j < N; j++) {
    let run: { soup: string; i0: number } | null = null;
    const flush = (i: number) => { if (run) runs[run.soup].push([run.i0, i, j]); run = null; };
    for (let i = 0; i < N; i++) {
      const ks = [j * V + i, j * V + i + 1, (j + 1) * V + i + 1, (j + 1) * V + i];
      const m = ks.map((k) => fm[k]);
      const cx = x0 + (i + 0.5) * CELL, cz = z0 + (j + 0.5) * CELL;
      if (Math.min(...m) > WALK) { flush(i); continue; }
      if (excludedAll(cx, cz)) { flush(i); continue; }
      const edgeOk = !excludedEdge(cx, cz);
      // a whole cell of asphalt, or of sidewalk clear of side roads and footpaths: part of a strip
      const whole = Math.max(...m) < 0 && !buildingAt(cx, cz) ? 'road' : edgeOk && Math.min(...m) >= KERB && Math.max(...m) <= WALK && ks.every((k) => fs[k] >= 0.6) ? 'walk' : null;
      if (whole) {
        if (run && run.soup !== whole) flush(i);
        if (!run) run = { soup: whole, i0: i };
        continue;
      }
      flush(i);
      const cell: Pt[] = ks.map((k, n) => [x0 + (i + (n === 1 || n === 2 ? 1 : 0)) * CELL, z0 + (j + (n >= 2 ? 1 : 0)) * CELL, [fm[k], fs[k], fp[k]]]);
      // (the corners in order: (i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1): clockwise seen from above, x east, z south)
      for (const b of BANDS) {
        if (b.soup !== 'road' && !edgeOk) continue;
        // (the widened asphalt stops at a building's wall)
        if (b.soup === 'road' && buildingAt(cx, cz)) continue;
        let p = cell;
        for (const t of b.test) { p = clip(p, (q) => t(q[2])); if (p.length < 3) break; }
        if (p.length >= 3) soups[b.soup].poly(p.map(([x, z]) => [x, z]));
      }
    }
    flush(N);
  }
  for (const [name, list] of Object.entries(runs)) for (const [i0, i1, j] of list) {
    // a strip, split every 4 m so that it follows the ground's relief
    for (let a = i0; a < i1; a += 4) {
      const b = Math.min(i1, a + 4), outline: [number, number][] = [];
      // (every grid point along the long sides: the outline then matches the neighbouring cells' edges, and only the
      // real outline gets a vertical face)
      for (let i = a; i <= b; i++) outline.push([x0 + i * CELL, z0 + j * CELL]);
      for (let i = b; i >= a; i--) outline.push([x0 + i * CELL, z0 + (j + 1) * CELL]);
      soups[name].poly(outline);
    }
  }
  soups.lip.walls(soups.walls);
  soups.walk.walls(soups.walls);
  soups.kerb.walls(soups.kerbSides);
  soups.walls.append(soups.lip);
  soups.kerb.append(soups.kerbSides);
  const dashes = centreDashes(x0, z0);
  return { road: soups.road, concrete: soups.walls, gutter: soups.gutter, walk: soups.walk, paint: dashes, kerb: soups.kerb };
}

/** the dashed centre line of the main roads (the owner's photo): 3 m dashes, 6 m gaps, kept clear of junctions */
function centreDashes(x0: number, z0: number) {
  const s = new Soup('paint', H.road + 0.004, null);
  const list = new Set<Seg>();
  for (let i = Math.floor(x0 / GRID); i <= Math.floor((x0 + TILE) / GRID); i++) for (let j = Math.floor(z0 / GRID); j <= Math.floor((z0 + TILE) / GRID); j++) for (const sg of grids[0].get(gkey(i, j)) ?? []) list.add(sg);
  for (const sg of list) {
    const dx = sg.bx - sg.ax, dz = sg.bz - sg.az, L = Math.hypot(dx, dz);
    if (L < 2) continue;
    const ux = dx / L, uz = dz / L, nx = -uz * 0.06, nz = ux * 0.06;
    // dashes keep a world rhythm (by distance from the segment's start rounded to the pattern)
    for (let t = 1.5; t + 3 <= L - 1.5; t += 9) {
      const mx = sg.ax + ux * (t + 1.5), mz = sg.az + uz * (t + 1.5);
      if (mx < x0 || mx >= x0 + TILE || mz < z0 || mz >= z0 + TILE) continue;
      // not across a junction: the centre is far from every other group's road, and inside the main field's road
      if (excludedAll(mx, mz) || nearOtherRoad(sg, mx, mz)) continue;
      const ax = sg.ax + ux * t, az = sg.az + uz * t, bx = ax + ux * 3, bz = az + uz * 3;
      s.poly([[ax - nx, az - nz], [bx - nx, bz - nz], [bx + nx, bz + nz], [ax + nx, az + nz]]);
    }
  }
  return s;
}
function nearOtherRoad(own: Seg, x: number, z: number) {
  for (const k of [0, 1] as const) for (const s of grids[k].get(gkey(Math.floor(x / GRID), Math.floor(z / GRID))) ?? []) {
    if (s === own || (k === 0 && s.g === own.g)) continue;
    if (segDist(s, x, z) < s.w + own.w + 2) return true;
  }
  return false;
}

// ------------------------------------------------------------------------------------------------- streaming
/** tiles of 128 m (four pieces): one mesh a material each, so the edges cost a few draw calls round the camera */
const BIG = 128;
interface Big { pieces: (Record<Mat, Soup> | null)[]; next: number; group: THREE.Group | null }
/** builds the road edges round the camera, a few milliseconds a frame, and drops the tiles left behind */
export class RoadEdges {
  readonly group = new THREE.Group();
  private tiles = new Map<number, Big>();
  radius = 280;
  dropRadius = 420;
  constructor() { this.group.name = 'road-edges'; }
  /** builds every tile within r of (x, z) now (the start of a ride, behind the loading bar) */
  preload(x: number, z: number, r = 160) { this.update(x, z, Infinity, r); }
  update(x: number, z: number, budgetMs = 4, r = this.radius) {
    const t0 = performance.now();
    const want: [number, number, number][] = [];
    for (let i = Math.floor((x - r) / BIG); i <= Math.floor((x + r) / BIG); i++) for (let j = Math.floor((z - r) / BIG); j <= Math.floor((z + r) / BIG); j++) {
      const t = this.tiles.get(gkey(i, j));
      if (t && t.next >= 4) continue;
      const d = Math.hypot((i + 0.5) * BIG - x, (j + 0.5) * BIG - z);
      if (d < r + BIG * 0.7) want.push([d, i, j]);
    }
    want.sort((a, b) => a[0] - b[0]);
    for (const [, i, j] of want) {
      let t = this.tiles.get(gkey(i, j));
      if (!t) this.tiles.set(gkey(i, j), (t = { pieces: [], next: 0, group: null }));
      while (t.next < 4 && performance.now() - t0 <= budgetMs) {
        const n = t.next++;
        t.pieces.push(buildTile(i * 2 + (n & 1), j * 2 + (n >> 1)));
      }
      if (t.next >= 4) this.finish(t);
      if (performance.now() - t0 > budgetMs) break;
    }
    for (const [k, t] of this.tiles) {
      const i = Math.floor(k / 8192) - 4096, j = (k % 8192) - 4096;
      if (Math.hypot((i + 0.5) * BIG - x, (j + 0.5) * BIG - z) <= this.dropRadius) continue;
      if (t.group) { this.group.remove(t.group); t.group.traverse((o) => (o as THREE.Mesh).geometry?.dispose?.()); }
      this.tiles.delete(k);
    }
  }
  /** the four pieces' surfaces merged into one mesh a material */
  private finish(t: Big) {
    const m = materials(), group = new THREE.Group();
    for (const name of ['road', 'concrete', 'gutter', 'walk', 'paint', 'kerb'] as Mat[]) {
      const all = new Soup(name, 0, null);
      for (const p of t.pieces) if (p) all.append(p[name]);
      const g = all.geometry();
      if (!g) continue;
      const mesh = new THREE.Mesh(g, m[name]);
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    t.pieces = [];
    if (group.children.length) { t.group = group; this.group.add(group); }
  }
}

/** on a main road's asphalt, gutter or sidewalk drawn here (trees of the converted campus standing in it are left out,
 *  and a free-ridden bike rides over it) */
export function onEdges(x: number, z: number, pad = 0) {
  prepare();
  return mainField(x, z) < WALK + pad && !excludedAll(x, z);
}

/** how far above the ground a free-ridden bike is here: up on a sidewalk or a gutter's lip (m) */
export function edgeLift(x: number, z: number) {
  prepare();
  const m = mainField(x, z);
  if (m < 0 || m > WALK) return 0;
  if (excludedAll(x, z) || excludedEdge(x, z) || plainField(1, x, z) < 0.6) return 0;
  return m < LIP ? H.lip : m < GUTTER ? (plainField(2, x, z) < 0 ? H.walk : H.gutter) : m < KERB && plainField(2, x, z) >= 0 ? H.kerb : H.walk;
}
