// The real campus: road network, building footprints and named places from the
// authoritative Legon geography (data/geography/, built by scripts/geography/), plus
// route finding and turn-by-turn directions over the road network.
import raw from '../data/legon-map.json';
import { cutDepth, inTrench } from './cutplan';

export type RoadClass = 0 | 1 | 2 | 3 | 4; // main, through, residential, service lane, footpath
export type PlaceKind = 'hall' | 'academic' | 'landmark' | 'food' | 'bank' | 'transport' | 'worship' | 'sport' | 'health' | 'other';

export interface Place {
  name: string;
  kind: PlaceKind;
  x: number;
  z: number;
  /** trotro lines that stop here */
  lines?: string[];
}
export interface Road {
  name?: string;
  cls: RoadClass;
  /** informal trail (path, track) or steps: campus routing keeps bikes off them where it can */
  surface?: 'trail' | 'steps';
  /** one-way for riders and drivers, in the order of its nodes (the UPSA extension's divided IPS Road and roundabout);
   *  walkers use it both ways */
  oneway?: boolean;
  nodes: number[];
}
export interface Building {
  name?: string;
  height?: number;
  /** footprint, flat x,z pairs in metres */
  pts: Float32Array;
  /** courtyards cut out of the footprint */
  holes: Float32Array[];
  minX: number; maxX: number; minZ: number; maxZ: number;
}
export interface Area {
  kind: 'pitch' | 'track' | 'parking' | 'water' | 'wood' | 'grove' | 'grass' | 'plaza';
  pts: Float32Array;
}

interface RawData {
  attribution: string;
  origin: [number, number];
  nodes: number[];
  roads: { c: number; w: number[]; n?: string; k?: 1 | 2; o?: 1 }[];
  /** m: footprint only seen by satellite (no OSM outline); u: OSM outline no satellite footprint matches; q: 2 low confidence */
  buildings: { p: number[]; h?: number; n?: string; i?: number[][]; m?: 1; u?: 1; q?: 2 }[];
  areas: { k: string; p: number[] }[];
  places: { n: string; k: string; x: number; z: number; l?: string[]; q?: 1 | 2 }[];
  lines: Record<string, string[]>;
  /** destination access registry (data/geography/legon-access.geojson): e entrance (dm), a arrival node, d drop-off node, t type, f facing (deg), q confidence, b secondary entrances (dm) */
  access: { n: string; e: [number, number]; a: number; d?: number; t: string; f: number; q?: 1 | 2; s: string; v?: number[]; fp?: number[]; b?: number[] }[];
  /** nodes that exist only as access points; legacy race routing ignores them */
  accessNodes: number[];
  /** the university's named gates */
  gates: { id: string; n: string; x: number; z: number }[];
  /** campus outline, flat x,z decimetres */
  boundary: number[];
  zones: { id: string; n: string; k: string; p: number[] }[];
  /** curated landmark registry: i importance 1-3, q as above */
  landmarks: { id: string; n: string; x: number; z: number; i: number; q?: 1 | 2 }[];
  /** Sentinel-2 composite laid out in map metres, for the geography inspector */
  imagery: { src: string; x0: number; z0: number; x1: number; z1: number; credit: string };
}
const data = raw as unknown as RawData;

export const ATTRIBUTION = data.attribution;

// local metres <-> latitude/longitude (same projection as scripts/geography/lib.mjs)
const [LAT0, LNG0] = data.origin;
const M_LAT = 110574, M_LNG = 111320 * Math.cos((LAT0 * Math.PI) / 180);
export const toLatLng = (x: number, z: number): [number, number] => [LAT0 - z / M_LAT, LNG0 + x / M_LNG];
/** road graph node positions: x, z pairs in metres */
export const NODE_XZ = Float32Array.from(data.nodes, (v) => v / 10);
export const ROADS: Road[] = data.roads.map((r) => ({ name: r.n, cls: r.c as RoadClass, nodes: r.w, ...(r.k && { surface: r.k === 2 ? 'steps' as const : 'trail' as const }), ...(r.o && { oneway: true }) }));
export const BUILDINGS: Building[] = data.buildings.map((b) => {
  const pts = Float32Array.from(b.p, (v) => v / 10);
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    minX = Math.min(minX, pts[i]); maxX = Math.max(maxX, pts[i]);
    minZ = Math.min(minZ, pts[i + 1]); maxZ = Math.max(maxZ, pts[i + 1]);
  }
  return { name: b.n, height: b.h, pts, holes: (b.i ?? []).map((h) => Float32Array.from(h, (v) => v / 10)), minX, maxX, minZ, maxZ };
});
/** outlines that the map draws over a road's edge, pulled back clear of it (the owner: buildings by the Great Hall standing
 *  on the road): a point inside each; the corners over a road (cls 0-3, at its drawn width) move out to 0.5 m from its
 *  edge, so the building is a little shallower; the mapped roads are kept as they are */
const PULL_BACK: [number, number][] = [[-787.0, 104.9], [-823.6, 75.3]];
{
  const HALF = [4.5, 3.7, 3.1, 2.3];
  for (const [px, pz] of PULL_BACK) {
    const b = BUILDINGS.find((o) => px > o.minX && px < o.maxX && pz > o.minZ && pz < o.maxZ);
    if (!b) continue;
    for (let i = 0; i < b.pts.length; i += 2) for (const r of ROADS) {
      if (r.cls > 3) continue;
      for (let k = 0; k < r.nodes.length - 1; k++) {
        const ax = NODE_XZ[r.nodes[k] * 2], az = NODE_XZ[r.nodes[k] * 2 + 1], dx = NODE_XZ[r.nodes[k + 1] * 2] - ax, dz = NODE_XZ[r.nodes[k + 1] * 2 + 1] - az;
        const x = b.pts[i], z = b.pts[i + 1], t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
        const qx = ax + dx * t, qz = az + dz * t, d = Math.hypot(x - qx, z - qz), want = HALF[r.cls] + 0.5;
        if (d < want && d > 1e-3) { b.pts[i] = qx + ((x - qx) / d) * want; b.pts[i + 1] = qz + ((z - qz) / d) * want; }
      }
    }
    b.minX = b.maxX = b.pts[0]; b.minZ = b.maxZ = b.pts[1];
    for (let i = 0; i < b.pts.length; i += 2) { b.minX = Math.min(b.minX, b.pts[i]); b.maxX = Math.max(b.maxX, b.pts[i]); b.minZ = Math.min(b.minZ, b.pts[i + 1]); b.maxZ = Math.max(b.maxZ, b.pts[i + 1]); }
  }
}
export const AREAS: Area[] = data.areas.map((a) => ({ kind: a.k as Area['kind'], pts: Float32Array.from(a.p, (v) => v / 10) }));
export const PLACES: Place[] = data.places.map((p) => ({ name: p.n, kind: p.k as PlaceKind, x: p.x / 10, z: p.z / 10, ...(p.l && { lines: p.l }) }));
/** trotro line ref -> the places it runs between */
export const LINE_ENDS = data.lines;

export const placeByName = (name: string) => PLACES.find((p) => p.name === name);

// ---------- destination access ----------
export type AccessType = 'public entrance' | 'campus gate' | 'pedestrian' | 'vehicle' | 'path access' | 'inferred frontage' | 'point' | 'open space' | 'hall entrance';
const ACCESS_TYPE: Record<string, AccessType> = { e: 'public entrance', g: 'campus gate', p: 'pedestrian', v: 'vehicle', i: 'inferred frontage', o: 'point', s: 'open space', h: 'hall entrance' };
export interface Access {
  /** where you get in: a door, a gate, the edge of an open space (metres) */
  entrance: [number, number];
  /** graph node a rider or walker stops at, in sight of the entrance */
  node: number;
  /** graph node a taxi or the shuttle stops at (a proper road) */
  dropNode: number;
  type: AccessType;
  /** compass bearing from the arrival point to the entrance, degrees */
  facing: number;
  confidence: 'high' | 'medium' | 'low';
  /** verified, partial or unverified for priority destinations; mapped (OSM access) or inferred for the rest */
  status: 'verified' | 'partial' | 'unverified' | 'mapped' | 'inferred';
  /** forecourt waypoints from the arrival point to the entrance (metres) */
  via?: [number, number][];
  /** outline of the building or area the entrance belongs to (priority destinations) */
  footprint?: [number, number][];
  /** other entrances (a hall's back entrance): shown on the map, never routed to */
  secondary?: [number, number][];
}
const STATUS = { v: 'verified', p: 'partial', u: 'unverified', m: 'mapped', i: 'inferred' } as const;
const pairs = (f: number[]) => { const o: [number, number][] = []; for (let i = 0; i < f.length; i += 2) o.push([f[i] / 10, f[i + 1] / 10]); return o; };
export const ACCESS = new Map<string, Access>(data.access.map((a) => [a.n, {
  entrance: [a.e[0] / 10, a.e[1] / 10], node: a.a, dropNode: a.d ?? a.a, type: ACCESS_TYPE[a.t] ?? 'point', facing: a.f, confidence: a.q === 2 ? 'low' : a.q === 1 ? 'medium' : 'high',
  status: STATUS[a.s as keyof typeof STATUS] ?? 'inferred', ...(a.v && { via: pairs(a.v) }), ...(a.fp && { footprint: pairs(a.fp) }), ...(a.b && { secondary: pairs(a.b) }),
}]));
/** How a place is reached: its entrance and the network nodes to stop at. */
export const accessFor = (place: Place) => ACCESS.get(place.name);
/** the university's named gates (Main Gate, North Gate, Link Gate, ...) */
export const GATES = data.gates.map((g) => ({ id: g.id, name: g.n, x: g.x / 10, z: g.z / 10 }));

/** Names students use for places, mapped to the place's map name. */
export const ALIASES: Record<string, string> = {
  Vandals: 'Commonwealth Hall',
  'Vandal City': 'Commonwealth Hall',
  Pent: 'New Pent Block A',
  Pentagon: 'New Pent Block A',
  'New Pent': 'New Pent Block A',
  'Old Pent': 'Pent Admin Block',
  'Pent Hostel Block A': 'New Pent Block A',
  'Pentagon Block A': 'New Pent Block A',
  'Pentagon Block B': 'New Pent Block B',
  'Pentagon Block C': 'New Pent Block C',
  'Ghana Hostels': 'Pent Admin Block',
  'Pentagon GHL Admin Office': 'Pent Admin Block',
  Balme: 'The Balme Library',
  Library: 'The Balme Library',
  Sarbah: 'Mensah Sarbah Hall',
  Limann: 'Dr. Hilla Limann Hall',
  Kwapong: 'Alexander Kwapong Hall',
  JNA: 'Jean Nelson Aka Hall',
  Sey: 'Elizabeth Frances Sey Hall',
  Akuafo: 'Akuafo Hall Main',
  Volta: 'Volta Hall',
  JQB: 'Jones Quartey Building, JQB',
  Vikings: 'Mensah Sarbah Hall',
  'African Union Hall': 'New Pent Block A',
  'Africa Union Hall': 'New Pent Block A',
  ISH: 'International Students Hostel 1, ISH 1',
  CBG: 'Consolidated Bank Ghana (near Night Market)',
  UMB: 'UMB',
  'Universal Merchant Bank': 'UMB',
  'Vikings Hostel': 'Mensah Sarbah Vikings Hostel',
  'Sarbah Vikings Hostel': 'Mensah Sarbah Vikings Hostel',
  // HFC Bank became Republic Bank Ghana in 2019
  'HFC Bank': 'Republic Bank (near Night Market)',
  HFC: 'Republic Bank (near Night Market)',
  Valco: 'Valco Trust Hostel Phase 1',
  Bani: 'Bani Hostel',
  'United Nations Hall': 'Bani Hostel',
  TF: 'TF Hostel',
  Evandy: 'Evandy Hostel',
  NNB: 'New N Block, NNB',
  'Main Gate': 'Legon Main Entrance',
  'Legon Hospital': 'University of Ghana Hospital',
  'Law School': 'School of Law',
  'Law Faculty': 'School of Law',
  UGBS: 'University of Ghana Business School',
  Registry: 'University of Ghana Registry',
};

export const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
/** edit distance, capped: stops early once it is past max */
function within(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let low = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      low = Math.min(low, cur[j]);
    }
    if (low > max) return false;
    prev = cur;
  }
  return prev[b.length] <= max;
}

export interface PlaceMatch { place: Place; alias?: string }
const ENTRIES = [
  ...PLACES.map((place) => ({ key: fold(place.name), place, alias: undefined as string | undefined })),
  ...Object.entries(ALIASES).flatMap(([alias, name]) => {
    const place = placeByName(name);
    return place ? [{ key: fold(alias), place, alias }] : [];
  }),
];
const KIND_RANK: Record<PlaceKind, number> = { landmark: 0, hall: 1, academic: 2, food: 3, health: 3, sport: 4, worship: 4, bank: 5, transport: 6, other: 7 };

/** Places matching what someone typed: exact, then prefix, then word prefix, then contains, then near-misses. */
export function searchPlaces(query: string, limit = 8): PlaceMatch[] {
  const q = fold(query);
  if (!q) return [];
  const qWords = q.split(' ');
  const scored: { m: PlaceMatch; score: number }[] = [];
  for (const e of ENTRIES) {
    let score: number;
    if (e.key === q) score = 0;
    else if (e.key.startsWith(q)) score = 1;
    else if (qWords.every((w) => e.key.split(' ').some((k) => k.startsWith(w)))) score = 2;
    else if (e.key.includes(q)) score = 3;
    else if (q.length >= 4 && qWords.every((w) => e.key.split(' ').some((k) => within(w, k.slice(0, w.length + 1), w.length >= 5 ? 2 : 1)))) score = 4;
    else continue;
    scored.push({ m: { place: e.place, alias: e.alias }, score: score + KIND_RANK[e.place.kind] / 10 + (e.alias ? -0.05 : 0) });
  }
  scored.sort((a, b) => a.score - b.score || a.m.place.name.length - b.m.place.name.length);
  const out: PlaceMatch[] = [];
  for (const { m } of scored) {
    if (out.some((o) => o.place === m.place)) continue;
    out.push(m);
    if (out.length >= limit) break;
  }
  return out;
}

/** The place someone means: an exact name, a nickname, or the best search match. */
export const resolvePlace = (query: string): Place | undefined =>
  placeByName(query.trim()) ?? searchPlaces(query, 1)[0]?.place;

// ---------- buildings lookup ----------
const BCELL = 50;
const bgrid = new Map<string, number[]>();
BUILDINGS.forEach((b, i) => {
  for (let x = Math.floor(b.minX / BCELL); x <= Math.floor(b.maxX / BCELL); x++)
    for (let z = Math.floor(b.minZ / BCELL); z <= Math.floor(b.maxZ / BCELL); z++) {
      const k = `${x},${z}`;
      let l = bgrid.get(k);
      if (!l) bgrid.set(k, (l = []));
      l.push(i);
    }
});
function inside(pts: Float32Array, x: number, z: number) {
  let c = false;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i], zi = pts[i + 1], xj = pts[j], zj = pts[j + 1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
/** The building whose footprint contains (x, z), padded by `pad` metres on its bounding box. */
export function buildingAt(x: number, z: number, pad = 0): Building | undefined {
  for (const i of bgrid.get(`${Math.floor(x / BCELL)},${Math.floor(z / BCELL)}`) ?? []) {
    const b = BUILDINGS[i];
    if (x < b.minX - pad || x > b.maxX + pad || z < b.minZ - pad || z > b.maxZ + pad) continue;
    if (pad > 0 || (inside(b.pts, x, z) && !b.holes.some((h) => inside(h, x, z)))) return b;
  }
  return undefined;
}
/** distance from (x, z) to a ring's nearest edge */
function ringDist(pts: Float32Array, x: number, z: number) {
  let best = Infinity;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const ax = pts[j], az = pts[j + 1], dx = pts[i] - ax, dz = pts[i + 1] - az, l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
/**
 * The building whose actual outline (x, z) is inside or within `pad` metres of, courtyards excepted.
 * buildingAt's pad widens the whole bounding box, which for a building set at an angle (the Diaspora
 * halls) covers the roads round it; this is the check for something moving (Explore's free ride).
 */
export function buildingNear(x: number, z: number, pad = 0): Building | undefined {
  for (const i of bgrid.get(`${Math.floor(x / BCELL)},${Math.floor(z / BCELL)}`) ?? []) {
    const b = BUILDINGS[i];
    if (x < b.minX - pad || x > b.maxX + pad || z < b.minZ - pad || z > b.maxZ + pad) continue;
    const hole = b.holes.find((h) => inside(h, x, z));
    if (hole) { if (ringDist(hole, x, z) < pad) return b; continue; }
    if (inside(b.pts, x, z) || ringDist(b.pts, x, z) < pad) return b;
  }
  return undefined;
}

// ---------- road graph ----------
export type TravelMode = 'cycle' | 'walk' | 'drive';
/** cost per metre by road class: riders keep to roads, walkers take footpaths and shortcuts */
const COST: Record<TravelMode, Record<RoadClass, number>> = {
  cycle: { 0: 1.05, 1: 1, 2: 1, 3: 1.1, 4: 1.35 },
  walk: { 0: 1.15, 1: 1.05, 2: 1, 3: 1, 4: 0.9 },
  // taxis and the shuttle keep to proper roads
  drive: { 0: 1, 1: 1, 2: 1.05, 3: 1.3, 4: 60 },
};
/** back: against a one-way road's direction (walkers only) */
interface Edge { to: number; len: number; road: number; back?: boolean }
const adj: Edge[][] = Array.from({ length: NODE_XZ.length / 2 }, () => []);
const nx = (i: number) => NODE_XZ[i * 2];
const nz = (i: number) => NODE_XZ[i * 2 + 1];
ROADS.forEach((r, ri) => {
  for (let k = 0; k < r.nodes.length - 1; k++) {
    const a = r.nodes[k], b = r.nodes[k + 1];
    const len = Math.hypot(nx(a) - nx(b), nz(a) - nz(b));
    adj[a].push({ to: b, len, road: ri });
    adj[b].push({ to: a, len, road: ri, ...(r.oneway && { back: true }) });
  }
});
// The Legon Road cutting (cutplan.ts): down in it the N4 shares a few nodes with the footways mapped across it at the
// ground, which now cross on the bridges above. A route on one level never turns onto the other there.
const lowRoad = (ri: number) => ROADS[ri].cls === 0 && ROADS[ri].name === 'J.J. Rawlings Avenue';
const SPLIT = new Set<number>();
adj.forEach((es, i) => {
  if (!es.length || !inTrench(nx(i), nz(i)) || cutDepth(nz(i)) < 1) return;
  if (es.some((e) => lowRoad(e.road)) && es.some((e) => !lowRoad(e.road))) SPLIT.add(i);
});
/** may a route arriving at node v by road `from` (-1: it starts there) leave it by road `to` */
const turnOk = (v: number, from: number, to: number) => from < 0 || !SPLIT.has(v) || lowRoad(from) === lowRoad(to);
export const nodeDegree = (i: number) => adj[i].length;
/** the network edges at a node */
export const nodeEdges = (i: number) => adj[i].map((e) => ({ to: e.to, road: e.road, len: e.len }));

// keep only the largest connected network, so every pair of places has a route
const comp = new Int32Array(adj.length).fill(-1);
let best = 0, bestSize = 0;
for (let s = 0, c = 0; s < adj.length; s++) {
  if (comp[s] >= 0 || !adj[s].length) continue;
  let size = 0;
  const stack = [s];
  comp[s] = c;
  while (stack.length) {
    const v = stack.pop()!;
    size++;
    for (const e of adj[v]) if (comp[e.to] < 0) { comp[e.to] = c; stack.push(e.to); }
  }
  if (size > bestSize) { bestSize = size; best = c; }
  c++;
}
const NCELL = 40;
const ngrid = new Map<string, number[]>();
const ACCESS_ONLY = new Set(data.accessNodes);
/** a node that exists only as a destination access point (a split on an existing road segment) */
export const isAccessNode = (i: number) => ACCESS_ONLY.has(i);
for (let i = 0; i < adj.length; i++) {
  if (comp[i] !== best || ACCESS_ONLY.has(i)) continue;
  const k = `${Math.floor(nx(i) / NCELL)},${Math.floor(nz(i) / NCELL)}`;
  let l = ngrid.get(k);
  if (!l) ngrid.set(k, (l = []));
  l.push(i);
}
const bestClass = (i: number) => Math.min(...adj[i].map((e) => ROADS[e.road].cls));

/** Closest node on the connected network; rideable roads win over footpaths unless much farther. */
export function nearestNode(x: number, z: number, mode: TravelMode = 'cycle') {
  let found = -1, score = Infinity;
  for (let r = 1; r <= 8 && found < 0; r *= 2) {
    const cx = Math.floor(x / NCELL), cz = Math.floor(z / NCELL);
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      for (const i of ngrid.get(`${cx + dx},${cz + dz}`) ?? []) {
        const d = Math.hypot(nx(i) - x, nz(i) - z) + (mode !== 'walk' && bestClass(i) === 4 ? (mode === 'drive' ? 80 : 25) : 0);
        if (d < score) { score = d; found = i; }
      }
    }
  }
  return found;
}

export interface PathResult {
  /** node indices from start to end */
  nodes: number[];
  /** road index of each segment (nodes[k] -> nodes[k+1]) */
  roads: number[];
  length: number;
}

/** Shortest way between two points along the road network (A*), snapping each point to its nearest node. Races use this. */
export function findPath(from: [number, number], to: [number, number], mode: TravelMode = 'cycle'): PathResult | null {
  return search(nearestNode(from[0], from[1], mode), nearestNode(to[0], to[1], mode), mode, false);
}

/**
 * Campus routing between two graph nodes (normally access points): like findPath, but bikes keep
 * off informal trails and steps unless there is no other way, and taxis never use footpaths.
 */
export function findPathBetween(s: number, t: number, mode: TravelMode = 'cycle'): PathResult | null {
  return search(s, t, mode, true);
}
const SURFACE: Record<TravelMode, Record<'trail' | 'steps', number>> = {
  cycle: { trail: 2.2, steps: 25 },
  walk: { trail: 1.05, steps: 1.3 },
  drive: { trail: 60, steps: 1000 },
};

function search(s: number, t: number, mode: TravelMode, campus: boolean): PathResult | null {
  const cost = COST[mode];
  const edgeCost = (road: number) => { const r = ROADS[road]; return cost[r.cls] * (campus && r.surface ? SURFACE[mode][r.surface] : 1); };
  if (s < 0 || t < 0) return null;
  const n = adj.length;
  const g = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const prevRoad = new Int32Array(n).fill(-1);
  const h = (i: number) => Math.hypot(nx(i) - nx(t), nz(i) - nz(t));
  // binary heap of [f, node]
  const heap: [number, number][] = [];
  const push = (f: number, v: number) => {
    heap.push([f, v]);
    for (let i = heap.length - 1; i > 0;) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      for (let i = 0; ;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  g[s] = 0;
  push(h(s), s);
  const done = new Uint8Array(n);
  while (heap.length) {
    const [, v] = pop();
    if (done[v]) continue;
    done[v] = 1;
    if (v === t) break;
    for (const e of adj[v]) {
      if (e.back && mode !== 'walk') continue;
      if (!turnOk(v, v === s ? -1 : prevRoad[v], e.road)) continue;
      const c = g[v] + e.len * edgeCost(e.road);
      if (c < g[e.to]) {
        g[e.to] = c;
        prev[e.to] = v;
        prevRoad[e.to] = e.road;
        push(c + h(e.to), e.to);
      }
    }
  }
  if (s !== t && prev[t] < 0) return null;
  const nodes = [t], roads: number[] = [];
  for (let v = t; v !== s; v = prev[v]) { nodes.push(prev[v]); roads.push(prevRoad[v]); }
  nodes.reverse(); roads.reverse();
  let length = 0;
  for (let k = 0; k < nodes.length - 1; k++) length += Math.hypot(nx(nodes[k]) - nx(nodes[k + 1]), nz(nodes[k]) - nz(nodes[k + 1]));
  return { nodes, roads, length };
}

export const nodeXZ = (i: number): [number, number] => [nx(i), nz(i)];

/** Direction (radians, atan2(dx, dz)) of the road nearest to (x, z), and where on it. */
export function roadAt(x: number, z: number): { x: number; z: number; angle: number } | null {
  const i = nearestNode(x, z);
  if (i < 0 || !adj[i].length) return null;
  const j = adj[i][0].to;
  return { x: nx(i), z: nz(i), angle: Math.atan2(nx(j) - nx(i), nz(j) - nz(i)) };
}

// ---------- directions ----------
export type Turn = 'start' | 'straight' | 'slight-left' | 'slight-right' | 'left' | 'right' | 'sharp-left' | 'sharp-right' | 'arrive' | 'stop';
export interface Step {
  turn: Turn;
  text: string;
  /** distance along the path where the step happens (metres) */
  at: number;
  /** road the step leads onto */
  road?: string;
  /** where the step happens on the map */
  x: number;
  z: number;
}

const roadLabel = (ri: number) => ROADS[ri].name ?? (ROADS[ri].cls === 4 ? 'the footpath' : ROADS[ri].cls === 3 ? 'the lane' : 'the road');
const CARDINAL = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];

/** Turn-by-turn steps for a path, in plain words a fresher can follow on foot too. */
export function directions(path: PathResult, destination: string): Step[] {
  const { nodes, roads } = path;
  const P = nodes.map(nodeXZ);
  const cum = [0];
  for (let k = 1; k < P.length; k++) cum.push(cum[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]));
  // heading over ~12 m either side of node k, so tiny kinks don't count as turns
  const headingAt = (k: number, dir: 1 | -1) => {
    let j = k;
    while (j + dir >= 0 && j + dir < P.length && Math.abs(cum[j] - cum[k]) < 12) j += dir;
    const [ax, az] = dir > 0 ? P[k] : P[j], [bx, bz] = dir > 0 ? P[j] : P[k];
    return Math.atan2(bx - ax, -(bz - az)); // 0 = north, clockwise
  };
  const steps: Step[] = [];
  if (P.length > 1) {
    const h0 = headingAt(0, 1);
    const card = CARDINAL[((Math.round((h0 / (Math.PI * 2)) * 8) % 8) + 8) % 8];
    steps.push({ turn: 'start', text: `Head ${card} on ${roadLabel(roads[0])}`, at: 0, road: ROADS[roads[0]].name, x: P[0][0], z: P[0][1] });
  }
  let groupName = ROADS[roads[0]]?.name ?? `#${roads[0]}`;
  for (let k = 1; k < P.length - 1; k++) {
    const nextName = ROADS[roads[k]].name ?? `#${roads[k]}`;
    let a = headingAt(k, 1) - headingAt(k, -1);
    a = Math.atan2(Math.sin(a), Math.cos(a));
    const deg = (a * 180) / Math.PI;
    const changed = nextName !== groupName;
    const junction = nodeDegree(nodes[k]) >= 3;
    if (!changed && !(junction && Math.abs(deg) > 50)) continue;
    const label = roadLabel(roads[k]);
    let turn: Turn, verb: string;
    if (Math.abs(deg) < 25) { turn = 'straight'; verb = 'Continue onto'; }
    else if (Math.abs(deg) < 60) { turn = deg < 0 ? 'slight-left' : 'slight-right'; verb = `Keep ${deg < 0 ? 'left' : 'right'} onto`; }
    else if (Math.abs(deg) < 145) { turn = deg < 0 ? 'left' : 'right'; verb = `Turn ${deg < 0 ? 'left' : 'right'} onto`; }
    else { turn = deg < 0 ? 'sharp-left' : 'sharp-right'; verb = `Turn sharp ${deg < 0 ? 'left' : 'right'} onto`; }
    // unnamed road straight on is not worth a step
    if (turn === 'straight' && !ROADS[roads[k]].name) continue;
    groupName = nextName;
    // merge steps closer than 15 m: keep the later one
    if (steps.length > 1 && cum[k] - steps[steps.length - 1].at < 15) steps.pop();
    steps.push({ turn, text: `${verb} ${label}`, at: cum[k], road: ROADS[roads[k]].name, x: P[k][0], z: P[k][1] });
  }
  // a short dog-leg off a named road and back onto it reads as "carry on"
  for (let i = 1; i < steps.length - 1; i++) {
    const before = steps[i - 1].road, after = steps[i + 1].road;
    if (!steps[i].road && before && after === before && steps[i + 1].at - steps[i].at < 80) {
      steps.splice(i, 2);
      i--;
    }
  }
  const [ex, ez] = P[P.length - 1];
  steps.push({ turn: 'arrive', text: `Arrive at ${destination}`, at: cum[cum.length - 1], x: ex, z: ez });
  return steps;
}

/** Bounds of the whole map, for the ground and the mini map. */
export function mapBounds() {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < NODE_XZ.length; i += 2) {
    minX = Math.min(minX, NODE_XZ[i]); maxX = Math.max(maxX, NODE_XZ[i]);
    minZ = Math.min(minZ, NODE_XZ[i + 1]); maxZ = Math.max(maxZ, NODE_XZ[i + 1]);
  }
  return { minX, maxX, minZ, maxZ };
}
