// A camera view of the converted campus for comparisons with the original (the same ?cam=x,h,z,tx,th,tz,fov as the
// original's preview tools: heights above the ground). Sets window.__done when every tile in view has loaded.
import * as pc from 'playcanvas';
import { createEngine } from '../../src/engine/app';
import { SKIES, type TimeOfDay } from '../../src/engine/sky';
import { Campus } from '../../src/engine/campus';
import { groundHeight } from '../../src/game/relief';
import * as THREE from '../../src/engine/lite3';
import { Surfaces, onHardSurface } from '../../src/game/surfaces';
import { RoadEdges, onEdges } from '../../src/game/roadedges';
import { loadCollision } from '../../src/game/collision';

const q = new URLSearchParams(location.search);
const [x, h, z, tx, th, tz, fov] = (q.get('cam') ?? '0,60,120,0,0,0,55').split(',').map(Number);
const e = createEngine(document.getElementById('c') as HTMLCanvasElement, { preserveDrawingBuffer: true });
const tod = (q.get('time') ?? 'day') as TimeOfDay;
// look=preview: the original's preview pages (tools/preview/halls.html): no fog, a flat sky, the sun from (-90, 160, 70)
const sunK = +(q.get('sunK') ?? 1), ambK = +(q.get('ambK') ?? 1), envK = +(q.get('envK') ?? 1);
if (q.get('look') === 'preview') e.setLighting({ flat: '#9fc3e6', sunPos: [-90, 160, 70], sun: '#fff1d6', sunI: 2.6 * sunK, hemiSky: '#cfe3ff', hemiGround: '#5a6b3a', hemiI: 1.1 * ambK, env: 0.35 * envK, exposure: 1.05, fog: null });
else e.setSky(SKIES[tod]);
if (q.get('look') === 'preview') { e.sun.light!.shadowDistance = 400; }
const campus = new Campus(e);
// ?nolift=1: the ground layers as first converted (before the fix for grass showing through them from above)
if (q.get('nolift') === '1') campus.liftLayers = false;
// ?game=1: the game's own ground layers too (the corrected surfaces and the road edges), trees cleared as in the game
const game = q.get('game') === '1';
let surfaces: Surfaces | null = null, edges: RoadEdges | null = null;
if (game) {
  const scene = new THREE.Scene();
  e.world.addChild(scene.entity);
  surfaces = new Surfaces();
  edges = new RoadEdges();
  scene.add(surfaces.group, edges.group);
  campus.dropInstance = (x, z) => onEdges(x, z, 0.4) || onHardSurface(x, z);
}
const cam = e.camera;
cam.camera!.fov = fov || 55;
cam.setPosition(x, groundHeight(x, z) + h, z);
cam.lookAt(new pc.Vec3(tx, groundHeight(tx, tz) + th, tz));
e.app.on('update', () => {
  const p = cam.getPosition();
  campus.update(p.x, p.z);
  surfaces?.update(p.x, p.z);
  // the sun's shadows round the camera's target
});
(async () => {
  await campus.ready;
  if (game) { await loadCollision(); edges!.preload(tx, tz, 300); }
  if (tod !== 'day') campus.setNight(tod === 'night', SKIES[tod].lamps);
  const r = Math.max(260, Math.hypot(tx - x, tz - z) + 150);
  await campus.preload(x, z, Math.min(r, campus.radius));
  // let textures arrive and a few frames draw
  await new Promise((res) => setTimeout(res, +(q.get('settle') ?? 2500)));
  (window as any).__stats = { ...campus.stats, drawCalls: (e.app as any).stats?.drawCalls?.total, fps: e.app.stats.frame.fps };
  (window as any).__done = true;
})();
