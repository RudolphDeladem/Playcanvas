// Rain (off by default; Game.setWeather turns it on): falling streaks round the camera, wet dark roads with a sheen,
// puddles on the roads nearby, closer fog and dimmer light, as the original's weatherfx.ts. On PlayCanvas the streaks
// are one line mesh moved on the CPU each frame (2600 drops), the puddles an instanced mesh, the fog and the sun are
// the engine's own. (The original also greyed its sky shader; the sky here is a painted cube map and keeps its colour.)
import * as pc from 'playcanvas';
import * as THREE from '../engine/lite3';
import type { Engine } from '../engine/app';
import { groundHeight } from './relief';
import { NODE_XZ, ROADS } from './campusmap';
import { setWet } from './world';
import { ROAD_WIDTH } from './life';
import { edgeLift, onMainAsphalt } from './roadedges';

const DROPS = 2600;
const BOX = { x: 44, y: 22, z: 44 };

function puddleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, 128, 128);
  // an irregular blob from a few overlapping soft ellipses
  let seed = 9;
  const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 7; i++) {
    const x = 40 + r() * 48, y = 44 + r() * 40, rx = 16 + r() * 22, ry = 10 + r() * 14;
    const grad = g.createRadialGradient(x, y, 0, x, y, rx);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.save();
    g.translate(x, y);
    g.scale(1, ry / rx);
    g.translate(-x, -y);
    g.beginPath();
    g.arc(x, y, rx, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  return new THREE.CanvasTexture(c);
}

/** Candidate puddle spots on the rideable roads, every few metres. */
function puddleSpots() {
  const out: number[] = [];
  let seed = 31;
  const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (const road of ROADS) {
    if (road.cls > 3) continue;
    const half = ROAD_WIDTH[road.cls] / 2;
    for (let k = 0; k < road.nodes.length - 1; k++) {
      const a = road.nodes[k], b = road.nodes[k + 1];
      const ax = NODE_XZ[a * 2], az = NODE_XZ[a * 2 + 1], bx = NODE_XZ[b * 2], bz = NODE_XZ[b * 2 + 1];
      const len = Math.hypot(bx - ax, bz - az);
      if (len < 1) continue;
      const ux = (bx - ax) / len, uz = (bz - az) / len;
      for (let t = r() * 9; t < len; t += 6 + r() * 12) {
        if (r() < 0.55) continue;
        // puddles gather near the edges more than in the crown of the road, but wholly on the asphalt: a puddle reaches
        // about 0.95 of its size round its middle (1.6 by 1 times its size, turned any way), and stops 0.3 m short of
        // the road's edge (the owner's ground and sidewalk specification, 2026-10-19: puddles lay over the kerb and the
        // sidewalk)
        const rot = r() * Math.PI, size = 0.7 + r() * 1.2, room = half - 0.3 - 0.95 * size;
        if (room <= 0) continue;
        const side = (r() < 0.5 ? -1 : 1) * (room - r() * r() * room);
        const x = ax + ux * t - uz * side, z = az + uz * t + ux * side;
        // (and nowhere a sidewalk, a kerb or a median island is drawn under it, roadedges.ts)
        let clear = true;
        for (let k = 0; k < 8 && clear; k++) { const px = x + Math.cos(k * Math.PI / 4) * size, pz = z + Math.sin(k * Math.PI / 4) * size; if (edgeLift(px, pz) > 0 || (road.cls <= 2 && !onMainAsphalt(px, pz))) clear = false; }
        if (clear) out.push(x, z, rot, size);
      }
    }
  }
  return new Float32Array(out);
}

/** Keeps a value scaled while it rains, and notices when something else resets it. */
class Damp {
  base = 0;
  applied = NaN;
  constructor(private get: () => number, private put: (v: number) => void) {}
  apply(k: number) {
    const now = this.get();
    if (now !== this.applied) this.base = now;
    this.applied = this.base * k;
    this.put(this.applied);
  }
}
export interface WeatherFx {
  set(rain: boolean): void;
  update(dt: number, camera: THREE.Object3D): void;
}

export function createWeatherFx(scene: THREE.Scene, engine: Engine): WeatherFx {
  // --- streaks: one line per drop, its top trailing up and a little sideways with the wind ---
  const seed = new Float32Array(DROPS * 4);
  for (let i = 0; i < DROPS; i++) seed.set([Math.random() * BOX.x, Math.random() * BOX.y, Math.random() * BOX.z, 12 + Math.random() * 6], i * 4);
  const pos = new Float32Array(DROPS * 6), col = new Uint8ClampedArray(DROPS * 8);
  for (let i = 0; i < DROPS; i++) col.set([238, 243, 250, 255, 238, 243, 250, 64], i * 8);
  const mesh = new pc.Mesh(engine.device);
  mesh.setPositions(pos);
  mesh.setColors32(col);
  mesh.update(pc.PRIMITIVE_LINES);
  const rainMat = new pc.StandardMaterial();
  rainMat.useLighting = false; rainMat.useSkybox = false; rainMat.useMetalness = false; rainMat.specular = new pc.Color(0, 0, 0);
  rainMat.diffuse = new pc.Color(0, 0, 0); rainMat.emissive = new pc.Color(0.93, 0.95, 0.98); rainMat.emissiveVertexColor = false;
  rainMat.opacityVertexColor = true; rainMat.opacityMapChannel = 'a';
  rainMat.blendType = pc.BLEND_NORMAL; rainMat.depthWrite = false; rainMat.opacity = 0;
  rainMat.update();
  const streaks = new pc.Entity('rain');
  streaks.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, rainMat)], castShadows: false, receiveShadows: false });
  streaks.render!.meshInstances[0].cull = false;
  streaks.enabled = false;
  scene.entity.addChild(streaks);

  // --- puddles: a pool of mirror-like patches moved onto the roads near the camera ---
  const spots = puddleSpots();
  const POOL = 48;
  const puddleMat = new THREE.MeshStandardMaterial({
    color: '#3a4250', roughness: 0.04, metalness: 0.85, alphaMap: puddleTexture(), transparent: true, opacity: 0,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
  });
  const puddles = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), puddleMat, POOL);
  puddles.count = 0;
  puddles.renderOrder = 1;
  puddles.visible = false;
  scene.add(puddles);
  const placedAt = new THREE.Vector3(1e9, 0, 0);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const placePuddles = (cx: number, cz: number) => {
    let n = 0;
    const near: [number, number][] = [];
    for (let i = 0; i < spots.length; i += 4) {
      const d = Math.hypot(spots[i] - cx, spots[i + 1] - cz);
      if (d < 75) near.push([d, i]);
    }
    near.sort((a, b) => a[0] - b[0]);
    for (const [, i] of near) {
      if (n >= POOL) break;
      const s = spots[i + 3];
      // (just over the road's top: the main roads' asphalt is drawn 7 cm over the ground, roadedges.ts, the other roads
      // are the original's own at 3-5 cm; they were laid at 2 cm with a strong depth bias, which shows them through the
      // road, the kerb and the sidewalk from far off and hides them close up: a dark patch that moved with the rider)
      const y = groundHeight(spots[i], spots[i + 1]) + (onMainAsphalt(spots[i], spots[i + 1]) ? 0.078 : 0.058);
      m.compose(v.set(spots[i], y, spots[i + 1]), q.setFromAxisAngle(up, spots[i + 2]), sc.set(s * 1.6, 1, s));
      puddles.setMatrixAt(n++, m);
    }
    puddles.count = n;
    puddles.instanceMatrix.needsUpdate = true;
  };

  // --- the fog and the light close in while it rains ---
  const sceneFog = engine.app.scene.fog, sun = engine.sun.light!;
  const sunDamp = new Damp(() => sun.intensity, (x) => (sun.intensity = x));
  const fogFar = new Damp(() => sceneFog.end, (x) => (sceneFog.end = x));
  const fogNear = new Damp(() => sceneFog.start, (x) => (sceneFog.start = x));
  const grey = new pc.Color(0.49, 0.53, 0.58), fogBase = new pc.Color(), fogApplied = new pc.Color(NaN, NaN, NaN);

  let raining = false;
  let k = 0; // 0 dry .. 1 full rain, eased
  let t = 0;
  let wasActive = false;
  const cam = new THREE.Vector3();

  return {
    set(rain: boolean) {
      raining = rain;
    },
    update(dt: number, camera: THREE.Object3D) {
      k += ((raining ? 1 : 0) - k) * Math.min(1, dt * 0.8);
      if (!raining && k < 0.01) k = 0;
      const active = k > 0;
      if (!active && !wasActive) return;
      wasActive = active;
      t += dt;
      camera.getWorldPosition(cam);
      streaks.enabled = puddles.visible = active;
      for (let i = 0; i < DROPS; i++) {
        const s = seed[i * 4 + 3], wrap = (a: number, c: number, b: number) => ((((a - c + b / 2) % b) + b) % b) - b / 2 + c;
        const x = wrap(seed[i * 4], cam.x, BOX.x), y = wrap(seed[i * 4 + 1] - t * s, cam.y, BOX.y), z = wrap(seed[i * 4 + 2], cam.z, BOX.z), f = s / 14;
        pos.set([x, y, z, x + 0.15 * f, y + 1.3 * f, z + 0.06 * f], i * 6);
      }
      mesh.setPositions(pos);
      mesh.update(pc.PRIMITIVE_LINES);
      // (a little under the original's 0.8: PlayCanvas draws the GL lines without the original's tonemapped blend)
      rainMat.opacity = 0.55 * k;
      rainMat.update();
      puddleMat.opacity = 0.85 * k;
      if (Math.hypot(cam.x - placedAt.x, cam.z - placedAt.z) > 25) {
        placedAt.copy(cam);
        placePuddles(cam.x, cam.z);
      }
      setWet(k);
      sunDamp.apply(1 - 0.35 * k);
      fogFar.apply(1 - 0.45 * k);
      fogNear.apply(1 - 0.6 * k);
      // night stays dark: grey the fog only as far as it is already bright
      if (!sceneFog.color.equals(fogApplied)) fogBase.copy(sceneFog.color);
      const lum = Math.max(fogBase.r, fogBase.g, fogBase.b), gk = 0.65 * k * Math.min(1, lum * 1.6);
      sceneFog.color = new pc.Color().lerp(fogBase, grey, gk);
      fogApplied.copy(sceneFog.color);
    },
  };
}
