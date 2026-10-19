// Short plants in place of the Balme Library's tree groves (the owner, 2026-10-19: "remove excess tree from balme,
// replace it with short plant"). The original plants trees on a grid in four leaf-litter beds before the library
// (balme.ts: either side of the forecourt between the car parks, and along the lanes past the sunken square); those trees
// are left out (vegrules.ts) and a low, rounded shrub stands at each of their places along the lanes instead (the beds
// either side of the forecourt are car parks, surfaces.ts). Three shapes and shades, each one instanced mesh. And the
// clipped round shrubs down the median islands of Dr. J.B. Danquah Avenue (the owner's satellite picture).
import * as THREE from '../engine/lite3';
import { mergeGeometries } from '../engine/lite3';
import { groundHeight } from './relief';
import { BALME_SHRUB_BEDS } from './vegrules';
import { medianHedges } from './roadedges';

/** where the original's trees stood (balme.ts, without its small random offsets) */
function spots(): [number, number][] {
  const out: [number, number][] = [];
  // (the beds either side of the forecourt are car parks, the owner's satellite picture, 2026-10-19: surfaces.ts)
  for (let wz = 43; wz <= 103; wz += 6.5) out.push([-18.5, wz], [-22, wz + 3], [34.8, wz + 1.5]);
  // (only inside the beds, clear of their edges)
  return out.filter(([x, z]) => BALME_SHRUB_BEDS.some(([x0, x1, z0, z1]) => x > x0 + 0.8 && x < x1 - 0.8 && z > z0 + 0.8 && z < z1 - 0.8));
}

/** a low shrub of radius 1 and height 1 on y 0: a few faceted blobs, darker underneath */
function shrubShape(seed: number, leaf: string[]) {
  const parts: THREE.BufferGeometry[] = [];
  const blobs = [[0, 0.45, 0, 0.75], [0.45, 0.38, 0.2, 0.55], [-0.4, 0.4, -0.25, 0.55], [0.1, 0.62, -0.35, 0.45], [-0.2, 0.35, 0.42, 0.5]];
  blobs.forEach(([x, y, z, r], i) => {
    const g = new THREE.IcosahedronGeometry(r, 0).scale(1, 0.85, 1).translate(x * Math.cos(seed) - z * Math.sin(seed), y, x * Math.sin(seed) + z * Math.cos(seed));
    const c = new THREE.Color(leaf[i % leaf.length]), p = g.attributes.position, col = new Float32Array(p.count * 3);
    for (let v = 0; v < p.count; v++) { const k = 0.72 + 0.28 * Math.min(1, Math.max(0, p.getY(v) / 0.9)); col[v * 3] = c.r * k; col[v * 3 + 1] = c.g * k; col[v * 3 + 2] = c.b * k; }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    parts.push(g);
  });
  return mergeGeometries(parts);
}

/** the shrubs, as a group to add to the scene: the Balme Library's and the clipped ones down the median islands of
 *  Dr. J.B. Danquah Avenue (roadedges.ts medianHedges; smaller, rounder, a darker green) */
export function buildBalmeShrubs(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'balme-shrubs';
  group.add(clipped(medianHedges()));
  const all = spots();
  const kinds = [['#3f6b2a', '#4f7d33', '#36602a'], ['#557a2e', '#6a8c38', '#4a6e2a'], ['#2f5a2a', '#3e6b33', '#2a5226']];
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  kinds.forEach((leaf, k) => {
    const mine = all.filter((_, i) => i % kinds.length === k);
    if (!mine.length) return;
    const im = new THREE.InstancedMesh(shrubShape(k * 2.1, leaf), mat, mine.length);
    mine.forEach(([x, z], i) => {
      const h = (x * 7.13 + z * 3.71) % 1, r = 1.0 + Math.abs(h) * 0.5;
      im.setMatrixAt(i, m.compose(p.set(x, groundHeight(x, z), z), q.setFromAxisAngle(Y, x * 1.7 + z), s.set(r, 0.9 + Math.abs(h) * 0.4, r)));
    });
    group.add(im);
  });
  return group;
}

/** clipped round shrubs, about 0.8 m tall, at these spots */
function clipped(at: [number, number][]) {
  const g = new THREE.Group();
  if (!at.length) return g;
  const geo = new THREE.IcosahedronGeometry(1, 1).scale(0.62, 0.5, 0.62).translate(0, 0.42, 0);
  const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color('#2f5b25');
  for (let v = 0; v < p.count; v++) { const k = 0.7 + 0.3 * Math.min(1, Math.max(0, p.getY(v) / 0.85)); col[v * 3] = c.r * k; col[v * 3 + 1] = c.g * k; col[v * 3 + 2] = c.b * k; }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), at.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pp = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  at.forEach(([x, z], i) => im.setMatrixAt(i, m.compose(pp.set(x, groundHeight(x, z), z), q, s)));
  g.add(im);
  return g;
}
