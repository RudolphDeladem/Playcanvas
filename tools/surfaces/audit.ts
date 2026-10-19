// Surface audit: every classified surface (tools/surfaces/classification.json) seen from straight above, orthographic, with
// everything more than 0.6 m above the ground cut away by the camera's near plane (tree crowns, cars, roofs), and the
// colour of the ground measured inside its footprint (areas: the polygon; lines: the middle of the strip). Classes of
// colour: green (grass), asphalt (dark grey), concrete (light grey), cream (the original's footpath concrete),
// brown (earth, red-brown pavers), other. ?after=1 draws the game's corrected surfaces (src/game/surfaces.ts) too.
// window.__result = { features: { id: { green, asphalt, concrete, cream, brown, other, n } } }; thumbnails of
// chosen ids in window.__thumbs (?thumbs=id,id,...).
import * as pc from 'playcanvas';
import { createEngine } from '../../src/engine/app';
import { Campus } from '../../src/engine/campus';
import { groundHeight } from '../../src/game/relief';
import data from './classification.json';
import * as THREE from '../../src/engine/lite3';
import { Surfaces } from '../../src/game/surfaces';
import { RoadEdges } from '../../src/game/roadedges';
import { loadCollision } from '../../src/game/collision';

const q = new URLSearchParams(location.search);
/** ?n=: the render's size in pixels; ?ctx=: how much ground round the feature it takes in (review sheets) */
const N = +(q.get('n') ?? 256), CTX = +(q.get('ctx') ?? 1);
const e = createEngine(document.getElementById('c') as HTMLCanvasElement, { preserveDrawingBuffer: true });
e.app.autoRender = false;
e.app.setCanvasFillMode(pc.FILLMODE_NONE);
e.app.setCanvasResolution(pc.RESOLUTION_FIXED, N, N);
e.device.maxPixelRatio = 1;
e.setLighting({ flat: '#000000', sunPos: [-90, 160, 70], sun: '#fff1d6', sunI: 2.6, hemiSky: '#cfe3ff', hemiGround: '#5a6b3a', hemiI: 1.1, env: 0.35, exposure: 1.05, fog: null });
e.sun.light!.castShadows = false;
const cam = e.camera.camera!;
cam.projection = pc.PROJECTION_ORTHOGRAPHIC;
cam.clearColor = new pc.Color(0, 0, 0, 1);
const campus = new Campus(e);
// ?nolift=1: the campus's ground layers as shipped (before the fix for grass showing through them from above)
if (q.get('nolift') === '1') campus.liftLayers = false;
type F = { id: string; geom: 'area' | 'line'; cls: string | null; pts: number[]; w?: number };
const feats = (data as { features: F[] }).features.filter((f) => !q.get('only') || q.get('only')!.split(',').includes(f.id));
const thumbs = new Set((q.get('thumbs') ?? '').split(',').filter(Boolean));

const inPoly = (p: number[], x: number, z: number) => {
  let c = false;
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) if ((p[i + 1] > z) !== (p[j + 1] > z) && x < ((p[j] - p[i]) * (z - p[i + 1])) / (p[j + 1] - p[i + 1]) + p[i]) c = !c;
  return c;
};
const distLine = (p: number[], x: number, z: number) => {
  let best = Infinity;
  for (let i = 0; i + 3 < p.length; i += 2) {
    const ax = p[i], az = p[i + 1], dx = p[i + 2] - ax, dz = p[i + 3] - az, l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
};
function colourClass(r: number, g: number, b: number) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), mean = (r + g + b) / 3;
  if (mx < 8) return 'none';
  if (g > r * 1.06 && g > b * 1.04) return 'green';
  if (r > g * 1.1 && r > b * 1.2) return 'brown';
  if (mx - mn < 28) return mean < 115 ? 'asphalt' : 'concrete';
  if (r >= g && g >= b && r - b < 70 && mean > 140) return 'cream';
  return 'other';
}

// ?after=1: the game's corrected ground drawn too (the surfaces and the road edges)
const after = q.get('after') === '1';
let surfaces: Surfaces | null = null, edges: RoadEdges | null = null;
if (after) {
  const scene = new THREE.Scene();
  e.world.addChild(scene.entity);
  surfaces = new Surfaces();
  edges = new RoadEdges();
  scene.add(surfaces.group, edges.group);
}

(async () => {
  await campus.ready;
  if (after) await loadCollision();
  const result: Record<string, Record<string, number>> = {};
  const shots: Record<string, string> = {};
  let k = 0;
  for (const f of feats) {
    const p = f.pts;
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); z0 = Math.min(z0, p[i + 1]); z1 = Math.max(z1, p[i + 1]); }
    const pad = (f.w ?? 0) + 2, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, half = (Math.max(x1 - x0, z1 - z0) / 2 + pad) * CTX;
    // the ground's range under the footprint: the near plane 0.6 m above its highest point
    let gMin = Infinity, gMax = -Infinity;
    for (let a = 0; a <= 8; a++) for (let b = 0; b <= 8; b++) { const g = groundHeight(x0 + ((x1 - x0) * a) / 8, z0 + ((z1 - z0) * b) / 8); gMin = Math.min(gMin, g); gMax = Math.max(gMax, g); }
    const H = 300;
    e.camera.setPosition(cx, gMax + H, cz);
    e.camera.setEulerAngles(-90, 0, 0);
    cam.orthoHeight = half;
    cam.nearClip = H - +(q.get('clip') ?? 0.6);
    cam.farClip = H + (gMax - gMin) + 5;
    campus.update(cx, cz);
    await campus.preload(cx, cz, half + 40);
    surfaces?.update(cx, cz);
    edges?.update(cx, cz, Infinity, half + 70);
    await new Promise((r) => setTimeout(r, 40));
    e.app.render();
    // (read back through an image of the canvas: PlayCanvas may leave its own framebuffer bound after drawing)
    const url = (e.device as pc.WebglGraphicsDevice).canvas.toDataURL('image/png');
    const img = new Image();
    img.src = url;
    await img.decode();
    const c2 = document.createElement('canvas');
    c2.width = c2.height = N;
    const g2 = c2.getContext('2d')!;
    g2.drawImage(img, 0, 0);
    const top = g2.getImageData(0, 0, N, N).data;
    // (rows from the top here: flipped to the bottom-up order the loop below expects)
    const px = new Uint8Array(N * N * 4);
    for (let j = 0; j < N; j++) px.set(top.subarray((N - 1 - j) * N * 4, (N - j) * N * 4), j * N * 4);
    const tally: Record<string, number> = { green: 0, asphalt: 0, concrete: 0, cream: 0, brown: 0, other: 0, none: 0 };
    let n = 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      // pixel (i, j) from the bottom-left; the camera looks down with -Z up the screen: screen up is world -z
      const wx = cx - half + ((i + 0.5) / N) * 2 * half, wz = cz + half - ((j + 0.5) / N) * 2 * half;
      const inside = f.geom === 'area' ? inPoly(p, wx, wz) : distLine(p, wx, wz) < Math.max(0.5, (f.w ?? 2) * 0.3);
      if (!inside) continue;
      const o = (j * N + i) * 4;
      tally[colourClass(px[o], px[o + 1], px[o + 2])]++;
      n++;
    }
    const seen = n - tally.none;
    const r: Record<string, number> = { n: seen };
    for (const c of ['green', 'asphalt', 'concrete', 'cream', 'brown', 'other']) r[c] = seen ? Math.round((tally[c] / seen) * 100) / 100 : 0;
    result[f.id] = r;
    if (thumbs.has(f.id)) shots[f.id] = url;
    if (++k % 25 === 0) console.log(`[S] ${k}/${feats.length}`);
  }
  (window as any).__result = { features: result };
  (window as any).__thumbs = shots;
  (window as any).__done = true;
})().catch((err) => { console.error(err); (window as any).__result = { error: String(err) }; (window as any).__done = true; });
