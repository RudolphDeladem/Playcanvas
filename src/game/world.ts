// The ridden route on top of the streamed campus (the original's world.ts buildRouteLayer, ported to the modelling kit):
// the route's road, edge lines and lane dashes for races, its pavements and kerbs, the route-side trees and lamps, the
// labels of the places it passes, the start gate, the finish or destination banner and the beacon over the destination.
// The campus itself (buildings, roads, grounds, the street furniture of every site) is the converted campus
// (engine/campus.ts), not built here.
//
// DECISION (the recreation brief): Explore rides draw no ground route line. The route's own road surface, its painted
// edge lines and lane dashes are drawn for races only; an Explore ride follows the campus's real roads with its
// gate, its destination banner, the place labels and the beacon.
import { destinationBanner, finishBanner } from './banners';
import * as THREE from '../engine/lite3';
import { weathering } from './shading';
import { buildingAt, type Place, type PlaceKind } from './campusmap';
import type { Track } from './track';
import { asphaltTexture, billboardTexture, concreteTexture, labelTexture } from './textures';
import { ROUTE_SOLIDS } from './solids';
import { walkGaps } from './junctions';
import { RELIEF_BOXES, crestHeight, floorHeight, groundHeight, inStairs } from './relief';
import { alongCut, deckAt, inCutBand, inTrench } from './cutplan';
import { NSIA } from './nsia';
import { KQ } from './kuffour';
import { offAsphalt } from './science';
import { ownsEdges } from './ipsplan';
import { addRouteTrees, nightHooks, ROAD_WIDTH } from './life';

export const LANES = [-2.4, 0, 2.4];

/** Street-lamp heads and the light they throw on the road; the game turns them up after dark. */
export const lampGlow = {
  head: new THREE.MeshStandardMaterial({ color: '#d9d4c4', emissive: '#ffd98a', emissiveIntensity: 0, roughness: 0.5 }),
  pool: new THREE.MeshBasicMaterial({ color: '#ffcf7a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, visible: false, map: (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.35)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })() }),
};
export const ROAD_HALF = 3.8;

export const KIND_ACCENT: Record<PlaceKind, string> = {
  hall: '#f5c518',
  academic: '#5ec8ff',
  landmark: '#ff7a59',
  food: '#ff9f43',
  bank: '#2ecc71',
  transport: '#a29bfe',
  worship: '#dfe6e9',
  sport: '#55efc4',
  health: '#ff6b81',
  other: '#b2bec3',
};

/**
 * Road surfaces that darken and turn glossy in the rain (see weatherfx.ts).
 * The route layer adds its own and removes them when it is disposed.
 */
const wetMats = new Map<THREE.MeshStandardMaterial, { color: THREE.Color; rough: number }>();
function wettable<T extends THREE.MeshStandardMaterial>(m: T) {
  wetMats.set(m, { color: m.color.clone(), rough: m.roughness });
  m.color.multiplyScalar(1 - wetness * 0.45);
  m.roughness = m.roughness - (m.roughness - 0.28) * wetness;
  return m;
}
let wetness = 0;
/** 0 = dry, 1 = soaked: darker roads and paths with a sheen. */
export function setWet(k: number) {
  wetness = k;
  for (const [m, base] of wetMats) {
    m.color.copy(base.color).multiplyScalar(1 - k * 0.45);
    m.roughness = base.rough - (base.rough - 0.28) * k;
  }
}

/** Seeded random so the campus looks the same every ride. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

/**
 * A flat strip following the road, from lateral a to lateral b (metres, + = right), chunked so UVs stay small; `across`
 * splits it into lanes of vertices so that over relief it follows the ground across its width too.
 */
function ribbon(track: Track, a: number, ya: number, b: number, yb: number, from: number, to: number, uvScale = 8, step = 2, across = 1) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const CHUNK = 200;
  for (let c0 = from; c0 < to; c0 += CHUNK) {
    const c1 = Math.min(to, c0 + CHUNK);
    const base = pos.length / 3;
    let rows = 0;
    const w = across + 1;
    for (let d = c0; ; d = Math.min(c1, d + step)) {
      const v = (d - c0) / uvScale;
      for (let k = 0; k <= across; k++) {
        const f = k / across, p = track.pose(d, a + (b - a) * f);
        pos.push(p.x, ya + (yb - ya) * f, p.z);
        uv.push(f, v);
      }
      rows++;
      if (d >= c1) break;
    }
    for (let r = 0; r < rows - 1; r++) for (let k = 0; k < across; k++) {
      const i = base + r * w + k;
      idx.push(i, i + 1, i + w, i + 1, i + w + 1, i + w);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.computeVertexNormals();
  return geo;
}

/** Flat material drawn over the ground without z-fighting. */
const groundMat = (color: string, layer: number, map?: THREE.Texture) =>
  new THREE.MeshStandardMaterial({ color, ...(map && { map }), roughness: 0.95, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -layer, polygonOffsetUnits: -layer * 2 });

/** Lifts what a layer holds onto the ground: placed objects by their origin, meshes in the relief zones vertex by
 *  vertex, instances by their position (the original's relief.ts applyRelief) */
export function applyRelief(root: THREE.Object3D) {
  const m = new THREE.Matrix4(), v = new THREE.Vector3();
  const identity = (o: THREE.Object3D) => o.position.x === 0 && o.position.y === 0 && o.position.z === 0 && o.rotation.x === 0 && o.rotation.y === 0 && o.rotation.z === 0;
  const visit = (o: THREE.Object3D, fn: (x: number, z: number) => number) => {
    if (o.userData.noRelief) return;
    if (o.userData.heightFn) fn = o.userData.heightFn;
    if (o !== root && !identity(o)) {
      o.getWorldPosition(v);
      const h = fn(o.position.x, o.position.z);
      if (h !== 0) o.position.y += h;
      return;
    }
    const mesh = o as THREE.Mesh;
    if ((mesh as THREE.InstancedMesh).isInstancedMesh) {
      const im = mesh as THREE.InstancedMesh;
      let touched = false;
      for (let i = 0; i < im.count; i++) {
        im.getMatrixAt(i, m);
        const e = m.elements, h = fn(e[12], e[14]);
        if (h !== 0) { e[13] += h; im.setMatrixAt(i, m); touched = true; }
      }
      if (touched) im.instanceMatrix.needsUpdate = true;
    } else if (mesh.isMesh && mesh.geometry) {
      const geo = mesh.geometry;
      geo.computeBoundingBox();
      const bb = geo.boundingBox!;
      if (RELIEF_BOXES.some((b) => bb.max.x > b.x0 && bb.min.x < b.x1 && bb.max.z > b.z0 && bb.min.z < b.z1)) {
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const h = fn(pos.getX(i), pos.getZ(i));
          if (h !== 0) pos.setY(i, pos.getY(i) + h);
        }
        mesh.refresh();
      }
    }
    for (const c of o.children) visit(c, fn);
  };
  visit(root, groundHeight);
}

export interface RouteLabel {
  place: Place;
  /** distance along the track */
  d: number;
}

export interface RouteLayerOptions {
  /** track distance of the start line and the finish line */
  start: number;
  finish: number;
  startText: string;
  finishText: string;
  /** what the finish line is (the owner's banner brief): an explore ride's destination entrance, under a banner with its
   *  name, or a race's end, under the FINISH banner; the start keeps its white gate either way */
  finishKind: 'destination' | 'race';
  labels: RouteLabel[];
  destination?: Place;
  /** the route's own road surface, edge lines, lane dashes and pavements (races; Explore rides draw none: see the top) */
  groundLine: boolean;
}

/** the stretches of [0, length] left between the gaps */
function openRuns(gaps: [number, number][], length: number): [number, number][] {
  const out: [number, number][] = [];
  let at = 0;
  for (const [a, b] of [...gaps].sort((u, v) => u[0] - v[0])) {
    if (a > at + 0.5) out.push([at, Math.min(a, length)]);
    at = Math.max(at, b);
    if (at >= length) break;
  }
  if (at < length - 0.5) out.push([at, length]);
  return out;
}

/**
 * The ridden route on top of the campus: a three-lane road with kerbs and lane
 * markings along the real road line, street trees and lamps, labels for the
 * places it passes, start and finish arches, and a beacon over the destination.
 */
export function buildRouteLayer(track: Track, o: RouteLayerOptions) {
  const group = new THREE.Group();
  // the route's trees are solid for a free ride (solids.ts): the last route's go
  ROUTE_SOLIDS.clear();
  const rand = rng(7);
  const L = track.length;
  const at = (d: number, lateral: number, y = 0) => {
    const p = track.pose(d, lateral);
    return new THREE.Vector3(p.x, y, p.z);
  };
  const yawAt = (d: number) => track.pose(d).yaw;

  // a route that climbs a modelled stair (the GCB Lecture Building's, Commonwealth Hall's) lays no road over the steps,
  // nor over the platform it ends on beyond them (owner: asphalt on the stair)
  const stairs: [number, number][] = [];
  {
    let s0 = -1;
    for (let d = 0; d <= L; d += 0.5) {
      const on = [-ROAD_HALF, 0, ROAD_HALF].some((l) => { const p = track.pose(d, l); return inStairs(p.x, p.z); });
      if (on && s0 < 0) s0 = d;
      if (!on && s0 >= 0) { stairs.push([Math.max(0, s0 - 0.5), d]); s0 = -1; }
    }
    if (s0 >= 0) stairs.push([Math.max(0, s0 - 0.5), L]);
    if (stairs.length && stairs[stairs.length - 1][1] > L - 25) stairs[stairs.length - 1][1] = L;
  }
  // (no asphalt where the science campus brief has the road as earth or brick: sciencesite.ts draws it)
  {
    let s0 = -1;
    for (let d = 0; d <= L; d += 1) {
      const p = track.pose(d), on = offAsphalt(p.x, p.z);
      if (on && s0 < 0) s0 = d;
      if (!on && s0 >= 0) { stairs.push([s0, d]); s0 = -1; }
    }
    if (s0 >= 0) stairs.push([s0, L]);
    stairs.sort((a, b) => a[0] - b[0]);
  }
  const paved = openRuns(stairs, L), onStairs = (d: number) => stairs.some(([a, b]) => d > a && d < b);
  // stretches where the real roads carry no paint and no pavements (the owner's NSIA Road brief): the route's road
  // stays, plain, with no edge lines, centre dashes, pavements or decorative trees
  const plain: [number, number][] = [];
  {
    // (and by the Kuffour Quadrangle: Hodasi Road and Cruise O'Brien Road have their own edges, kuffourgarden.ts)
    const inPlain = (d: number) => { const p = track.pose(d); return [NSIA.plain, ...KQ.plain].some(([px0, px1, pz0, pz1]) => p.x > px0 && p.x < px1 && p.z > pz0 && p.z < pz1); };
    let s0 = -1;
    for (let d = 0; d <= L; d += 1) {
      const on = inPlain(d);
      if (on && s0 < 0) s0 = d;
      if (!on && s0 >= 0) { plain.push([s0, d]); s0 = -1; }
    }
    if (s0 >= 0) plain.push([s0, L]);
  }
  const onPlain = (d: number) => plain.some(([a, b]) => d > a && d < b);
  // stretches whose kerbs, sidewalks, verges, trees and lights a modelled site draws (IPS Road: upsa.ts, ipsroad.ts): the
  // route keeps its road, edge lines and dashes there, but not its generic pavements, trees and lamps over the model's
  // (one list per side: [left, right], tested at the pavement's middle)
  const owned: [number, number][][] = [-1, 1].map((s) => {
    const out: [number, number][] = [];
    let s0 = -1;
    for (let d = 0; d <= L; d += 1) {
      const p = track.pose(d, s * (ROAD_HALF + 0.8)), on = ownsEdges(p.x, p.z);
      if (on && s0 < 0) s0 = d;
      if (!on && s0 >= 0) { out.push([s0, d]); s0 = -1; }
    }
    if (s0 >= 0) out.push([s0, L]);
    return out;
  });
  const onOwned = (d: number, s: number) => owned[s > 0 ? 1 : 0].some(([a, b]) => d > a && d < b);
  const lined = openRuns([...stairs, ...plain].sort((a, b) => a[0] - b[0]), L);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const one = new THREE.Vector3(1, 1, 1);
  if (o.groundLine) {
    const roadTex = asphaltTexture();
    roadTex.repeat.set(2, 1);
    const roadMat = weathering(wettable(groundMat('#ffffff', 5, roadTex)), 'ground', 34, 0.35);
    for (const [d0, d1] of paved) {
      const road = new THREE.Mesh(ribbon(track, -ROAD_HALF, 0, ROAD_HALF, 0, d0, d1, 8, 2, 4), roadMat);
      road.receiveShadow = true;
      group.add(road);
    }
    // (no edge lines, lane dashes or concrete pavements of its own any more: every main road now has its asphalt, dashed
    // centre line, lip, gutter and herringbone sidewalk, roadedges.ts; the owner's corrections, 2026-10-18)
  }

  // trees and lamps along the route, kept off buildings and off the road on tight bends
  const clear = (p: THREE.Vector3, r: number) => track.distanceToRoad(p.x, p.z) > ROAD_HALF + 1.8 + r && !buildingAt(p.x, p.z, r + 0.5) && !inCutBand(p.x, p.z, r + 0.5);
  const spots: THREE.Matrix4[] = [];
  for (let d = 0; d < L; d += 13) {
    for (const s of [-1, 1]) {
      const dd = d + (rand() - 0.5) * 6, p = at(dd, s * (ROAD_HALF + 4 + rand() * 5));
      const sc = 0.8 + rand() * 0.6, spin = rand() * 6.28;
      if (!clear(p, 1.2) || onPlain(dd) || onOwned(dd, s)) continue;
      spots.push(new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromAxisAngle(up, spin), new THREE.Vector3(sc, sc, sc)));
      ROUTE_SOLIDS.add(p.x, p.z, 0.35 * sc);
    }
  }
  addRouteTrees(group, spots, rand);
  const lamps: THREE.Matrix4[] = [];
  for (let d = 0; d < L; d += 36) {
    for (const s of [-1, 1]) {
      const dd = d + (s > 0 ? 18 : 0);
      const p = at(dd, s * (ROAD_HALF + 1.2));
      if (track.distanceToRoad(p.x, p.z) < ROAD_HALF + 1 || buildingAt(p.x, p.z, 0.5) || inCutBand(p.x, p.z, 1) || onOwned(dd, s)) continue;
      lamps.push(new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromAxisAngle(up, yawAt(dd) + (s > 0 ? Math.PI : 0)), one));
    }
  }
  const lampMat = new THREE.MeshStandardMaterial({ color: '#4a4f57', metalness: 0.6, roughness: 0.4 });
  const lampPole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.09, 6, 6).translate(0, 3, 0), lampMat, Math.max(1, lamps.length));
  const lampArm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.12, 0.25).translate(0.45, 6, 0), lampMat, Math.max(1, lamps.length));
  lamps.forEach((mm, k) => { lampPole.setMatrixAt(k, mm); lampArm.setMatrixAt(k, mm); });
  const lampHead = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.1, 0.3).translate(0.75, 5.9, 0), lampGlow.head, Math.max(1, lamps.length));
  const lampPool = new THREE.InstancedMesh(new THREE.PlaneGeometry(8, 8).rotateX(-Math.PI / 2).translate(1.4, 0.04, 0), lampGlow.pool, Math.max(1, lamps.length));
  lamps.forEach((mm, k) => { lampHead.setMatrixAt(k, mm); lampPool.setMatrixAt(k, mm); });
  lampPole.count = lampArm.count = lampHead.count = lampPool.count = lamps.length;
  lampPole.castShadow = true;
  lampPool.renderOrder = 1;
  group.add(lampPole, lampArm, lampHead, lampPool);

  // labels over the places the route passes
  for (const l of o.labels) {
    const { tex, aspect } = labelTexture(l.place.name.toUpperCase(), KIND_ACCENT[l.place.kind]);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, fog: true }));
    const lh = 2.6;
    label.scale.set(lh * aspect, lh, 1);
    const bd = buildingAt(l.place.x, l.place.z);
    label.position.set(l.place.x, (bd?.height ?? (bd ? 8 : 4)) + 3, l.place.z);
    group.add(label);
  }

  // beacon over the destination
  if (o.destination) {
    const { x, z } = o.destination;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 70, 16, 1, true).translate(0, 35, 0), new THREE.MeshBasicMaterial({ color: '#ffd21f', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    beam.position.set(x, 0, z);
    group.add(beam);
    const { tex, aspect } = labelTexture(o.destination.name.toUpperCase(), '#ffd21f');
    const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, depthTest: false, fog: false }));
    sign.scale.set(4.5 * aspect, 4.5, 1);
    sign.position.set(x, 26, z);
    sign.renderOrder = 10;
    group.add(sign);
  }

  // in-world billboards (future ad slots)
  const bbTex = billboardTexture();
  for (let d = o.start + 600, k = 0; d < o.finish - 100; d += 700, k++) {
    const s = k % 2 ? -1 : 1;
    const p = at(d, s * (ROAD_HALF + 8));
    if (!clear(p, 4)) continue;
    group.add(billboard(bbTex, s, p, yawAt(d)));
  }

  // a little way past the start line, so it does not sit over the rider and the HUD at the countdown
  group.add(gate(o.startText, at(o.start + 16, 0), yawAt(o.start + 16)));
  {
    const end = o.finishKind === 'race' ? finishBanner(ROAD_HALF) : destinationBanner(o.finishText, ROAD_HALF);
    end.position.copy(at(o.finish, 0));
    end.rotation.y = yawAt(o.finish);
    group.add(end);
  }
  // over a bridge of the Legon Road cutting the route lies on the deck when it crosses and on the road below when it
  // runs along under it (cutplan.ts): its heading at the nearest point says which
  // (and its edges stay at the level of its middle: a road along the top beside the walls does not droop over them, the
  // lowered road's pavements do not climb them)
  group.userData.heightFn = (x: number, z: number) => {
    if (!inTrench(x, z) && !deckAt(x, z) && !inTrench(x + 6, z) && !inTrench(x - 6, z)) return crestHeight(x, z);
    const p = track.pose(track.project(x, z).d);
    const low = inTrench(p.x, p.z) && (alongCut(p.tx, p.tz) || !deckAt(p.x, p.z));
    return low ? floorHeight(x, z) : crestHeight(x, z);
  };
  applyRelief(group);
  return group;
}

/** Frees a route layer's GPU memory (shared tree meshes are kept). */
export function disposeLayer(group: THREE.Object3D) {
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.userData.shared) return;
    if (mesh.geometry) mesh.geometry.dispose();
    const mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : [];
    for (const mat of mats) {
      wetMats.delete(mat as THREE.MeshStandardMaterial);
      for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
      mat.dispose();
    }
  });
}

/** the start gate: white posts and beam with the start's name (the owner: keep it as it is) */
function gate(text: string, pos: THREE.Vector3, yaw: number) {
  const g = new THREE.Group();
  const postMat = new THREE.MeshStandardMaterial({ color: '#efe7d6', roughness: 0.7 });
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 0.8), postMat);
    post.position.set(s * (ROAD_HALF + 1.4), 3, 0);
    post.castShadow = true;
    g.add(post);
  }
  const { tex, aspect } = labelTexture(text.toUpperCase(), '#f5c518');
  const beamW = ROAD_HALF * 2 + 3.6;
  const beam = new THREE.Mesh(new THREE.BoxGeometry(beamW, 1.4, 0.6), postMat);
  beam.position.y = 6.2;
  beam.castShadow = true;
  g.add(beam);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(beamW - 1, 1.3 * aspect), 1.3), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  sign.position.set(0, 6.2, 0.31);
  g.add(sign);
  g.position.copy(pos);
  g.rotation.y = yaw;
  return g;
}

function billboard(tex: THREE.Texture, side: number, pos: THREE.Vector3, yaw: number) {
  const g = new THREE.Group();
  const leg = new THREE.MeshStandardMaterial({ color: '#555b63', metalness: 0.5, roughness: 0.5 });
  for (const dx of [-2.5, 2.5]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5, 8), leg);
    p.position.set(dx, 2.5, 0);
    p.castShadow = true;
    g.add(p);
  }
  const panel = new THREE.Mesh(new THREE.BoxGeometry(7, 3.4, 0.3), leg);
  panel.position.y = 6.4;
  panel.castShadow = true;
  g.add(panel);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 3.1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.25 }));
  face.position.set(0, 6.4, 0.16);
  g.add(face);
  // face oncoming riders, angled toward the road
  g.rotation.y = yaw + (side > 0 ? -0.5 : 0.5);
  g.position.copy(pos);
  return g;
}
