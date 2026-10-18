// The PlayCanvas application: one per page. The camera, the sun (with cascaded shadows round the camera), the sky and
// its image-based lighting, fog and tone mapping, set up as the original game had them (Game.ts SKIES: ACES tone
// mapping, linear fog from 70 to 340 m by day, a warm sun, a blue sky over a hazy horizon).
import * as pc from 'playcanvas';
import { buildFlatCubemap, buildHemisphereCubemap, buildSkyCubemap, type SkyLook } from './sky';

/** the original's lighting values (Three.js units), see setLighting */
/** calibration against the original's renders (tools/view look=preview beside the original's preview, colour sampled
 *  on grass, roofs, walls and trees): Three.js's physically based units and its PMREM room environment come out a
 *  little brighter than the straight conversion (intensity / pi), these factors make up the difference */
export const CALIBRATION = { sun: 1.35, hemi: 1.1, env: 1.4 };

export interface LightingOptions { look?: SkyLook; flat?: string; sunPos: [number, number, number]; sun: string; sunI: number; hemiSky: string; hemiGround: string; hemiI: number; env: number; exposure: number; fog: [number, number] | null }

export interface Engine {
  app: pc.Application;
  device: pc.GraphicsDevice;
  camera: pc.Entity;
  sun: pc.Entity;
  /** world-space root for the campus and everything placed on it */
  world: pc.Entity;
  setSky(look: SkyLook): void;
  setLighting(o: LightingOptions): void;
  lowEnd: boolean;
}

let engine: Engine | null = null;
const waiting: (() => void)[] = [];
/** runs fn once the engine exists (now, if it does): materials made at import time are set up then */
export function whenEngine(fn: () => void) { if (engine) fn(); else waiting.push(fn); }

export function createEngine(canvas: HTMLCanvasElement, opts: { preserveDrawingBuffer?: boolean } = {}): Engine {
  if (engine) return engine;
  const lowEnd = (navigator.hardwareConcurrency ?? 4) <= 4 || Math.min(screen.width, screen.height) < 500;
  const app = new pc.Application(canvas, {
    graphicsDeviceOptions: { antialias: !lowEnd || devicePixelRatio < 2, preserveDrawingBuffer: !!opts.preserveDrawingBuffer, powerPreference: 'high-performance' },
  });
  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  // (as the original: up to 1.5 device pixels per CSS pixel; the low graphics setting drops it to 1)
  app.graphicsDevice.maxPixelRatio = Math.min(devicePixelRatio, 1.5);
  addEventListener('resize', () => app.resizeCanvas());
  canvas.addEventListener('webglcontextlost', () => console.warn('LEGONRUSH: WebGL context lost (GPU reset or driver timeout)'));

  // fog as the original had it: Three.js mixes the fog colour into the final, tone-mapped sRGB colour; PlayCanvas mixes
  // it in linear light before tone mapping, which fogs everything visibly more (distant trees and the hills washed out)
  pc.ShaderChunks.get(app.graphicsDevice, pc.SHADERLANGUAGE_GLSL).set('endPS', `
	gl_FragColor.rgb = combineColor(litArgs_albedo, litArgs_sheen_specularity, litArgs_clearcoat_specularity);
	gl_FragColor.rgb += litArgs_emission;
	gl_FragColor.rgb = toneMap(gl_FragColor.rgb);
	gl_FragColor.rgb = gammaCorrectOutput(gl_FragColor.rgb);
	gl_FragColor.rgb = addFog(gl_FragColor.rgb);
`);

  // the sky is drawn as the original drew it: its shader was not tone mapped (a plain ShaderMaterial), so neither is
  // the skybox here (tone mapped, the far hills and the haze washed out)
  {
    const chunks = pc.ShaderChunks.get(app.graphicsDevice, pc.SHADERLANGUAGE_GLSL);
    const sky = chunks.get('skyboxPS') as string;
    chunks.set('skyboxPS', sky.replace('toneMap(processEnvironment(linear))', 'processEnvironment(linear)'));
  }

  const scene = app.scene;
  // two lights (the sun and the bike's headlight): plain forward lighting. Clustered lighting, PlayCanvas's default for
  // many lights, cost about 40% of the frame for nothing here (measured with tools/perf.mjs)
  scene.clusteredLightingEnabled = false;
  scene.fog.type = pc.FOG_LINEAR;
  scene.fog.start = 70;
  scene.fog.end = 340;
  scene.exposure = 1.05;
  scene.skyboxMip = 0;

  const world = new pc.Entity('world');
  app.root.addChild(world);

  const camera = new pc.Entity('camera');
  camera.addComponent('camera', {
    fov: 62, nearClip: 0.3, farClip: 1200,
    clearColor: new pc.Color(0.87, 0.9, 0.9),
    toneMapping: pc.TONEMAP_ACES2, gammaCorrection: pc.GAMMA_SRGB,
  });
  app.root.addChild(camera);

  const sun = new pc.Entity('sun');
  sun.addComponent('light', {
    type: 'directional', color: new pc.Color(1, 0.945, 0.84), intensity: 2.6,
    castShadows: true, shadowDistance: lowEnd ? 45 : 70, numCascades: lowEnd ? 1 : 2, cascadeDistribution: 0.6,
    shadowResolution: lowEnd ? 1024 : 2048, shadowBias: 0.2, normalOffsetBias: 0.05, shadowType: pc.SHADOW_PCF3_32F,
  });
  app.root.addChild(sun);

  let skyTex: pc.Texture | null = null, envTex: pc.Texture | null = null;
  /** lights the scene as the original did: its sun (Three.js intensity, divided by pi for PlayCanvas's units), its
   *  hemisphere light and room environment as image-based ambient, ACES filmic tone mapping at its exposure, its fog;
   *  the sky drawn as `look` paints it (or a flat colour, for the comparison views) */
  const setLighting = (o: LightingOptions) => {
    const sky = o.look ? buildSkyCubemap(app.graphicsDevice, o.look) : buildFlatCubemap(app.graphicsDevice, o.flat ?? '#9fc3e6');
    const env = buildHemisphereCubemap(app.graphicsDevice, o.hemiSky, o.hemiGround, o.hemiI * CALIBRATION.hemi, o.env * CALIBRATION.env);
    const atlas = pc.EnvLighting.generateAtlas(env, {});
    skyTex?.destroy(); envTex?.destroy();
    skyTex = sky; envTex = env;
    scene.envAtlas?.destroy?.();
    scene.envAtlas = atlas;
    scene.skybox = sky;
    scene.skyboxIntensity = 1;
    scene.skyboxLuminance = 0;
    scene.ambientLight = new pc.Color(0, 0, 0);
    if (o.fog) { scene.fog.type = pc.FOG_LINEAR; scene.fog.start = o.fog[0]; scene.fog.end = o.fog[1]; scene.fog.color = new pc.Color().fromString(o.look?.bottom ?? o.flat ?? '#dfe6e6'); }
    else scene.fog.type = pc.FOG_NONE;
    scene.exposure = o.exposure;
    const l = sun.light!;
    l.color = new pc.Color().fromString(o.sun);
    l.intensity = (o.sunI / Math.PI) * CALIBRATION.sun;
    const [x, y, z] = o.sunPos, L = Math.hypot(x, y, z);
    sun.setPosition(0, 0, 0);
    // a directional light shines down its local -Y: aim -Z at the light's direction, then turn -Y onto it
    sun.lookAt(new pc.Vec3(-x / L, -y / L, -z / L));
    sun.rotateLocal(90, 0, 0);
  };
  const setSky = (look: SkyLook) => setLighting({ look, sunPos: look.sunPos, sun: look.sun, sunI: look.sunI, hemiSky: look.hemiSky, hemiGround: look.hemiGround, hemiI: look.hemiI, env: look.env, exposure: look.exposure, fog: look.fog });

  engine = { app, device: app.graphicsDevice, camera, sun, world, setSky, setLighting, lowEnd };
  app.start();
  for (const fn of waiting.splice(0)) fn();
  return engine;
}

export const getEngine = () => engine;
