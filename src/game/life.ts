// Campus life, the parts the game and its menus use at run time: where the roads are (roadClearance, for the free
// ride's rough ground and the grass tufts), the landmark keep-outs (Campus Life), the night switch, the market's
// closeness for the music, and the route-side trees. The street trees, kerbs, lamps, kiosks and crowds the original
// built here at load time are part of the converted campus (public/campus, tools/export) and are streamed with it.
import * as THREE from '../engine/lite3';
import { mergeGeometries, mergeVertices } from '../engine/lite3';
import { groundShade, nearCut } from './shading';
import { NODE_XZ, PLACES, ROADS } from './campusmap';
export { inLandmark } from './collision';

/** real road widths by class: main, through, residential, service lane, footpath */
export const ROAD_WIDTH = [9, 7.4, 6.2, 4.6, 2.6];
/** the ridden route's road and walkway reach this far from its centre line (see world.ts) */
const ROUTE_EDGE = 3.9;

// ---------- where the roads are ----------
interface Seg { ax: number; az: number; bx: number; bz: number; half: number; road: number; cls: number }
const SG = 24;
const segGrid = new Map<number, Seg[]>();
const gkey = (i: number, j: number) => (i + 4096) * 8192 + (j + 4096);
ROADS.forEach((r, ri) => {
  const half = ROAD_WIDTH[r.cls] / 2;
  for (let k = 0; k < r.nodes.length - 1; k++) {
    const a = r.nodes[k], b = r.nodes[k + 1];
    const s: Seg = { ax: NODE_XZ[a * 2], az: NODE_XZ[a * 2 + 1], bx: NODE_XZ[b * 2], bz: NODE_XZ[b * 2 + 1], half, road: ri, cls: r.cls };
    const x0 = Math.floor((Math.min(s.ax, s.bx) - half) / SG), x1 = Math.floor((Math.max(s.ax, s.bx) + half) / SG);
    const z0 = Math.floor((Math.min(s.az, s.bz) - half) / SG), z1 = Math.floor((Math.max(s.az, s.bz) + half) / SG);
    for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) {
      const key = gkey(i, j);
      let l = segGrid.get(key);
      if (!l) segGrid.set(key, (l = []));
      l.push(s);
    }
  }
});
function segDist(s: Seg, x: number, z: number) {
  const dx = s.bx - s.ax, dz = s.bz - s.az, l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / l2));
  return Math.hypot(x - s.ax - dx * t, z - s.az - dz * t);
}
/**
 * Distance from (x, z) to the nearest road edge (negative on the road), looking
 * `reach` metres round; footpaths count only when `paths` is set.
 */
export function roadClearance(x: number, z: number, reach = 12, skipRoad = -1, paths = false) {
  let best = reach;
  const r = Math.ceil(reach / SG);
  const cx = Math.floor(x / SG), cz = Math.floor(z / SG);
  for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) {
    for (const s of segGrid.get(gkey(cx + i, cz + j)) ?? []) {
      if (s.road === skipRoad || (!paths && s.cls === 4)) continue;
      const d = segDist(s, x, z) - Math.max(s.half, s.cls < 3 ? ROUTE_EDGE : 0);
      if (d < best) best = d;
    }
  }
  return best;
}

let nightOn = false;
/** Lit windows, street lamps and kiosk lights after dark. Call from Game.setTimeOfDay. */
export function setNightLights(on: boolean) {
  nightOn = on;
  for (const fn of nightHooks) fn(on);
}
/** the night lights' owners (the streamed campus, the route layer's lamps) register here */
export const nightHooks: ((on: boolean) => void)[] = [];
export const isNight = () => nightOn;

/** How close (x, z) is to the Night Market or a food joint, 0..1, for the ambient music. */
export function marketProximity(x: number, z: number) {
  let best = 0;
  for (const p of PLACES) {
    if (p.kind !== 'food' && p.name !== 'Night Market') continue;
    const r = p.name === 'Night Market' ? 140 : 45;
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < r) best = Math.max(best, (1 - d / r) * (p.name === 'Night Market' ? 1 : 0.4));
  }
  return best;
}


type Part = [THREE.BufferGeometry, string | number];
interface Model { pos: Float32Array; nrm: Float32Array; col: Float32Array; slot: Int8Array; idx: Uint32Array; /** light per vertex: foliage is darker underneath and inside, and mottled */ shd: Float32Array }
function model(parts: Part[], foliage = false): Model {
  const pos: number[] = [], nrm: number[] = [], col: number[] = [], slot: number[] = [], idx: number[] = [], shd: number[] = [];
  const c = new THREE.Color();
  for (const [src, color] of parts) {
    // shared corners on rounded parts (crowns, wheels) are stored once
    src.deleteAttribute('uv');
    const geo = mergeVertices(src);
    if (geo !== src) src.dispose();
    const base = pos.length / 3;
    const p = geo.attributes.position, n = geo.attributes.normal;
    if (typeof color === 'string') c.set(color);
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nrm.push(n.getX(i), n.getY(i), n.getZ(i));
      col.push(c.r, c.g, c.b);
      slot.push(typeof color === 'number' ? color : -1);
      // leaves: sunlit tops, shaded undersides, and a little patchiness so crowns don't look plastic
      shd.push(foliage && typeof color === 'number' ? (0.6 + 0.4 * (n.getY(i) * 0.5 + 0.5)) * (0.92 + 0.16 * hash3(p.getX(i), p.getY(i), p.getZ(i))) : 1);
    }
    if (geo.index) for (let i = 0; i < geo.index.count; i++) idx.push(base + geo.index.getX(i));
    else for (let i = 0; i < p.count; i++) idx.push(base + i);
    geo.dispose();
  }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), col: new Float32Array(col), slot: Int8Array.from(slot), idx: Uint32Array.from(idx), shd: new Float32Array(shd) };
}
const box = (w: number, h: number, d: number, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
/** cylinder standing on y (base), open ended unless capped */
const cyl = (rt: number, rb: number, h: number, seg: number, x = 0, y = 0, z = 0, capped = false) =>
  new THREE.CylinderGeometry(rt, rb, h, seg, 1, !capped).translate(x, y + h / 2, z);
/** a rounded lump (tree crowns, heads), smooth-shaded so its corners can be shared */
/** 0..1 from a position, the same for the same point (so shared corners stay shared) */
function hash3(x: number, y: number, z: number) {
  const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return h - Math.floor(h);
}
const blob = (r: number, x: number, y: number, z: number, sy = 0.8, detail = 0, lump = 0) => {
  const g = new THREE.IcosahedronGeometry(r, detail);
  g.setAttribute('normal', g.attributes.position.clone());
  g.normalizeNormals();
  // tree crowns are lumpy, not perfect balls: push each corner in or out a little
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 1 - lump / 2 + lump * hash3(p.getX(i) * 3.1, p.getY(i) * 3.1, p.getZ(i) * 3.1);
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
  }
  return g.scale(1, sy, 1).translate(x, y, z);
};

/**
 * A leafy crown: a cluster of small lumps around a core, like bunches of leaves, lit as one canopy
 * (normals point out from the crown's centre) so it reads soft and round instead of faceted.
 * Fewer triangles than one finely divided ball.
 */
function canopy(r: number, x: number, y: number, z: number, sy = 0.8, n = 9, seed = 0) {
  const parts: THREE.BufferGeometry[] = [new THREE.IcosahedronGeometry(r * 0.78, 0).scale(1, sy, 1)];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const yN = 1 - 1.65 * t;
    const rad = Math.sqrt(Math.max(0, 1 - yN * yN));
    const ang = i * 2.39996 + seed;
    const k = 0.62 + 0.12 * hash3(i, seed, r);
    const rb = r * (0.4 + 0.14 * hash3(seed, i, r));
    parts.push(new THREE.IcosahedronGeometry(rb, 0).scale(1, 0.85, 1).translate(Math.cos(ang) * rad * r * k, yN * r * sy * k, Math.sin(ang) * rad * r * k));
  }
  const g = mergeGeometries(parts.map((p) => p.toNonIndexed()))!;
  for (const p of parts) p.dispose();
  const pos = g.attributes.position;
  const nrm = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    // the ellipsoid's own normal at this point, so the whole crown shades as one shape
    let nx = pos.getX(i), ny = pos.getY(i) / (sy * sy), nz = pos.getZ(i);
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    nrm[i * 3] = nx; nrm[i * 3 + 1] = ny; nrm[i * 3 + 2] = nz;
  }
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  return g.translate(x, y, z);
}
function palmFronds(y: number, n: number, len: number) {
  const out: Part[] = [];
  for (let k = 0; k < n; k++) {
    const f = new THREE.ConeGeometry(0.42, len, 3, 1, true).rotateX(Math.PI / 2).translate(0, 0, len / 2).scale(1, 0.22, 1);
    f.rotateX(0.25 + (k % 3) * 0.22);
    f.rotateY((k / n) * Math.PI * 2 + (k % 2) * 0.2);
    out.push([f.translate(0, y, 0), 0]);
  }
  return out;
}

export const TREES = {
  /** neem: short trunk, dense round dark crown */
  neem: () => model([
    [cyl(0.15, 0.24, 2.7, 5), '#5b4636'],
    [canopy(2.1, 0, 3.8, 0, 0.78, 10, 1), 0],
  ], true),
  /** mahogany / cedrela: tall straight trunk and a high broad crown */
  mahogany: () => model([
    [cyl(0.22, 0.36, 6, 6), '#6a5442'],
    [cyl(0.08, 0.12, 2.2, 4).rotateZ(0.7).translate(0.2, 4.2, 0), '#6a5442'],
    [canopy(2.9, 0, 7.1, 0, 0.62, 12, 2), 0], [canopy(1.6, 1.6, 6.2, -1.0, 0.7, 5, 3), 0],
  ], true),
  /** flame tree: low split trunk and a wide, flat umbrella crown, red in flower */
  flame: () => model([
    [cyl(0.17, 0.28, 2.6, 5), '#6b5a4a'],
    [canopy(3.1, 0, 3.9, 0, 0.36, 11, 4), 0], [canopy(1.9, 1.3, 4.1, 0.8, 0.4, 6, 5), 1],
  ], true),
  /** woodland tree (the owner: in the woods the stems are short and hidden; the whole tree is leaves down to near the
   *  ground, the stem only seen close to): a short stout stem under a big crown of several masses reaching low */
  woodland: () => model([
    [cyl(0.17, 0.27, 1.7, 5), '#5a4535'],
    [canopy(2.7, 0, 3.4, 0, 0.82, 12, 6), 0], [canopy(2.0, 1.3, 2.1, 0.7, 0.78, 8, 7), 0],
    [canopy(1.9, -1.2, 2.2, -0.8, 0.78, 8, 8), 0], [canopy(1.8, 0.3, 5.0, -0.4, 0.8, 8, 9), 0], [canopy(1.5, -0.6, 1.6, 1.2, 0.75, 6, 10), 0],
  ], true),
  /** bush clump (the owner's 20-picture corrections, Picture 18): leafy masses from the ground up, no trunk, about a
   *  flame tree's height */
  bush: () => model([
    [canopy(2.0, 0, 1.7, 0, 0.9, 10, 11), 0], [canopy(1.6, 1.2, 1.2, 0.6, 0.85, 8, 12), 0],
    [canopy(1.5, -1.1, 1.25, -0.7, 0.85, 8, 13), 0], [canopy(1.3, 0.2, 2.7, -0.3, 0.85, 7, 14), 0],
  ], true),
  /** royal palm: tall smooth grey trunk, green crownshaft, drooping fronds */
  palm: () => model([
    [cyl(0.19, 0.27, 8.6, 6), '#a39886'],
    [cyl(0.2, 0.21, 1.4, 5, 0, 8.6), '#6a8f3c'],
    ...palmFronds(9.9, 7, 3.3),
  ], true),
};
type Species = keyof typeof TREES;
const LEAF: Record<Species, string[][]> = {
  neem: [['#3a6b28'], ['#447a2e'], ['#355f24']],
  mahogany: [['#2f5e22'], ['#386b27'], ['#2b5420']],
  flame: [['#d8431c', '#4f7f2a'], ['#e0582a', '#56862e'], ['#c93a1a', '#4a7a29'], ['#4f7f2a', '#4a7a29']],
  palm: [['#4f8a2f'], ['#5a9435'], ['#467d2a']],
  woodland: [['#2f5e22', '#3a6b28'], ['#34652a', '#2b5420'], ['#3d6f2b', '#305f24']],
  bush: [['#3f6a2a'], ['#4d7a31'], ['#36602a']],
};
/** where the street and route trees are something else (the owner's 20-picture corrections, Pictures 17-18): in front of
 *  foundation A by Annie Jiagge Road and along Limbo's east side the clumps are bushes, not trees on trunks */
export function localSpecies(x: number, z: number): Species | undefined {
  if (x > 511 && x < 553 && z > -182 && z < -55) return 'bush';
  if (x > 484 && x < 509.5 && z > -112 && z < 12) return 'bush';
  return undefined;
}

/** Instanced trees for the ridden route layer: one draw call per species. */
const treeGeoCache = new Map<Species, THREE.BufferGeometry>();
function treeGeometry(s: Species) {
  let g = treeGeoCache.get(s);
  if (g) return g;
  const m = TREES[s]();
  const col = new Float32Array(m.col);
  const leaf = new THREE.Color(LEAF[s][0][0]), leaf2 = new THREE.Color(LEAF[s][0][1] ?? LEAF[s][0][0]);
  for (let i = 0; i < m.slot.length; i++) {
    if (m.slot[i] < 0) continue;
    const c = m.slot[i] === 1 ? leaf2 : leaf;
    const k = m.shd[i];
    col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k;
  }
  g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(m.pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(m.nrm, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(new THREE.BufferAttribute(m.idx, 1));
  treeGeoCache.set(s, g);
  return g;
}
const treeInstMat = nearCut(groundShade(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), 1.6, 0.4, 'tree'));
/** Adds route-side trees: a mix of species, as instanced meshes marked shared. */
export function addRouteTrees(group: THREE.Group, spots: THREE.Matrix4[], rand: () => number) {
  const by: Record<Species, THREE.Matrix4[]> = { neem: [], mahogany: [], flame: [], palm: [], woodland: [], bush: [] };
  const kinds: Species[] = ['neem', 'mahogany', 'flame', 'palm', 'palm', 'neem'];
  for (const m of spots) { const k = kinds[(rand() * kinds.length) | 0]; by[localSpecies(m.elements[12], m.elements[14]) ?? k].push(m); }
  for (const s of Object.keys(by) as Species[]) {
    const list = by[s];
    if (!list.length) continue;
    const im = new THREE.InstancedMesh(treeGeometry(s), treeInstMat, list.length);
    const c = new THREE.Color();
    list.forEach((mm, k) => {
      im.setMatrixAt(k, mm);
      im.setColorAt(k, c.setScalar(0.88 + rand() * 0.2));
    });
    im.castShadow = im.receiveShadow = true;
    im.userData.shared = true;
    group.add(im);
  }
}

