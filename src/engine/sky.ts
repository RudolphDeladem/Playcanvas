// The sky, as the original drew it (world.ts buildSky): a gradient from the haze at the horizon to the zenith, a paler
// band just above the horizon, the sun's glow and disc, a far tree line and low hills all round, and clouds projected on
// a layer so they flatten toward the horizon. Here it is painted once per time of day into a cube map, which PlayCanvas
// draws as the skybox and also uses for image-based lighting (in place of the original's hemisphere light and room
// environment). The lower half carries the hemisphere light's ground colour so the ground bounce stays as before.
import * as pc from 'playcanvas';

export type TimeOfDay = 'day' | 'sunset' | 'night';
export interface SkyLook {
  top: string; bottom: string; sun: string; sunI: number; sunPos: [number, number, number];
  cloud: number; cloudCol: string; treeCol: string; hemiSky: string; hemiGround: string; hemiI: number;
  fog: [number, number]; exposure: number; ambient: [number, number, number]; lamps: number; env: number;
}

/** the original's SKIES (Game.ts), unchanged */
export const SKIES: Record<TimeOfDay, SkyLook> = {
  day: { lamps: 0, top: '#3a7bd0', bottom: '#dfe6e6', fog: [70, 340], sun: '#fff1d6', sunI: 2.6, sunPos: [-30, 45, 20], hemiSky: '#cfe3ff', hemiGround: '#5a6b3a', hemiI: 1.1, env: 0.35, exposure: 1.05, cloud: 0.56, cloudCol: '#ffffff', treeCol: '#2f4a2a', ambient: [0.16, 0.17, 0.17] },
  sunset: { lamps: 0.5, top: '#2b3f7a', bottom: '#ff9a4a', fog: [60, 300], sun: '#ffb070', sunI: 2.4, sunPos: [-40, 14, -60], hemiSky: '#ffc59a', hemiGround: '#4a3a2a', hemiI: 0.8, env: 0.3, exposure: 1.0, cloud: 0.6, cloudCol: '#ffc49e', treeCol: '#3a2a2a', ambient: [0.14, 0.11, 0.1] },
  night: { lamps: 1, top: '#03060f', bottom: '#1b2650', fog: [40, 220], sun: '#9fb6ff', sunI: 0.55, sunPos: [20, 40, 10], hemiSky: '#3a4f8a', hemiGround: '#10131c', hemiI: 0.45, env: 0.12, exposure: 1.15, cloud: 0.4, cloudCol: '#26324f', treeCol: '#05070c', ambient: [0.05, 0.06, 0.09] },
};

/** sRGB hex to linear rgb */
const lin = (hex: string): [number, number, number] => {
  const c = new pc.Color().fromString(hex);
  const f = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return [f(c.r), f(c.g), f(c.b)];
};
const toSrgb = (v: number) => { v = Math.max(0, Math.min(1, v)); return Math.round((v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255); };
const fract = (x: number) => x - Math.floor(x);
const hash = (x: number, y: number) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
function noise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
const smooth = (e0: number, e1: number, x: number) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

/** the sky's colour (linear) in direction d, as the original's fragment shader computed it */
function skyColor(look: SkyLook, dx: number, dy: number, dz: number, octaves: number): [number, number, number] {
  const top = lin(look.top), bottom = lin(look.bottom), sunCol = lin(look.sun).map((v) => v * (look === SKIES.night ? 0.15 : 1));
  const cloudCol = lin(look.cloudCol), treeCol = lin(look.treeCol);
  const [sx, sy, sz] = look.sunPos, sl = Math.hypot(sx, sy, sz);
  const h = Math.max(0, Math.min(1, dy * 2.2));
  const k = Math.pow(h, 0.7);
  const col = [0, 1, 2].map((i) => bottom[i] + (top[i] - bottom[i]) * k);
  const haze = (1 - smooth(0, 0.18, dy)) * 0.35;
  for (let i = 0; i < 3; i++) col[i] += (bottom[i] * 1.04 - col[i]) * haze;
  const s = Math.max(0, (dx * sx + dy * sy + dz * sz) / sl);
  const glow = Math.pow(s, 6) * 0.18 + Math.pow(s, 64) * 0.45 + smooth(0.9993, 0.9997, s) * 1.4;
  for (let i = 0; i < 3; i++) col[i] += sunCol[i] * glow;
  const az = Math.atan2(dz, dx);
  const ridge = 0.012 + 0.03 * noise(az * 3, 1.7) + 0.012 * noise(az * 19, 4.1) + 0.006 * noise(az * 61, 8.3);
  const tl = (1 - smooth(ridge - 0.002, ridge + 0.002, dy)) * (dy >= -0.02 ? 1 : 0);
  const tm = 0.42 - 0.18 * smooth(0, 0.05, ridge - dy);
  for (let i = 0; i < 3; i++) { const t = bottom[i] + (treeCol[i] - bottom[i]) * tm; col[i] += (t - col[i]) * tl; }
  if (dy > 0 && look.cloud > 0.01) {
    let u = (dx / (dy + 0.12)) * 1.3, v = (dz / (dy + 0.12)) * 1.3, n = 0, a = 0.5;
    for (let i = 0; i < octaves; i++) { n += noise(u, v) * a; u = u * 2.03 + 17; v = v * 2.03 + 17; a *= 0.5; }
    const c = smooth(1 - look.cloud, 1.05 - look.cloud * 0.5, n) * smooth(0, 0.12, dy) * 0.9;
    for (let i = 0; i < 3; i++) { const cc = cloudCol[i] * (0.82 + 0.25 * n) + sunCol[i] * Math.pow(s, 8) * 0.25; col[i] += (cc - col[i]) * c; }
  }
  if (dy < -0.02) {
    // below the horizon: the hemisphere light's ground colour (the lighting's ground bounce; the ground hides it)
    const g = lin(look.hemiGround), t = smooth(-0.02, -0.25, dy);
    for (let i = 0; i < 3; i++) col[i] += (g[i] * 0.9 - col[i]) * t;
  }
  return col as [number, number, number];
}

/** the sky painted into a cube map (sRGB, `size` texels a face) */
export function buildSkyCubemap(device: pc.GraphicsDevice, look: SkyLook, size = 128): pc.Texture {
  const faces: Uint8Array[] = [];
  for (let f = 0; f < 6; f++) {
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = (2 * (x + 0.5)) / size - 1, v = (2 * (y + 0.5)) / size - 1;
      // the GL cube map face directions (+X, -X, +Y, -Y, +Z, -Z)
      let d: [number, number, number];
      if (f === 0) d = [1, -v, -u]; else if (f === 1) d = [-1, -v, u]; else if (f === 2) d = [u, 1, v]; else if (f === 3) d = [u, -1, -v]; else if (f === 4) d = [u, -v, 1]; else d = [-u, -v, -1];
      const l = Math.hypot(d[0], d[1], d[2]);
      const c = skyColor(look, d[0] / l, d[1] / l, d[2] / l, 4);
      const o = (y * size + x) * 4;
      data[o] = toSrgb(c[0]); data[o + 1] = toSrgb(c[1]); data[o + 2] = toSrgb(c[2]); data[o + 3] = 255;
    }
    faces.push(data);
  }
  const tex = new pc.Texture(device, { name: 'sky', cubemap: true, width: size, height: size, format: pc.PIXELFORMAT_SRGBA8, mipmaps: true, levels: [faces], addressU: pc.ADDRESS_CLAMP_TO_EDGE, addressV: pc.ADDRESS_CLAMP_TO_EDGE });
  return tex;
}

/** the original's hemisphere light (and its faint room environment) as a cube map for PlayCanvas's image-based
 *  ambient: sky colour above, ground colour below, blended across the horizon, already in PlayCanvas's units
 *  (Three.js lights its Lambert surfaces with irradiance / pi) */
export function buildHemisphereCubemap(device: pc.GraphicsDevice, sky: string, ground: string, intensity: number, env: number, size = 32): pc.Texture {
  const s = lin(sky), g = lin(ground), k = intensity / Math.PI, room = env * 0.6;
  const faces: Uint8Array[] = [];
  for (let f = 0; f < 6; f++) {
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = (2 * (x + 0.5)) / size - 1, v = (2 * (y + 0.5)) / size - 1;
      let d: [number, number, number];
      if (f === 0) d = [1, -v, -u]; else if (f === 1) d = [-1, -v, u]; else if (f === 2) d = [u, 1, v]; else if (f === 3) d = [u, -1, -v]; else if (f === 4) d = [u, -v, 1]; else d = [-u, -v, -1];
      const w = 0.5 * (d[1] / Math.hypot(d[0], d[1], d[2])) + 0.5;
      const o = (y * size + x) * 4;
      for (let i = 0; i < 3; i++) data[o + i] = toSrgb((g[i] + (s[i] - g[i]) * w) * k + room);
      data[o + 3] = 255;
    }
    faces.push(data);
  }
  return new pc.Texture(device, { name: 'hemisphere', cubemap: true, width: size, height: size, format: pc.PIXELFORMAT_SRGBA8, mipmaps: true, levels: [faces] });
}

/** a plain colour cube map (the original preview pages' flat background) */
export function buildFlatCubemap(device: pc.GraphicsDevice, color: string, size = 8): pc.Texture {
  const c = lin(color), faces: Uint8Array[] = [];
  for (let f = 0; f < 6; f++) { const d = new Uint8Array(size * size * 4); for (let i = 0; i < size * size; i++) { d[i * 4] = toSrgb(c[0]); d[i * 4 + 1] = toSrgb(c[1]); d[i * 4 + 2] = toSrgb(c[2]); d[i * 4 + 3] = 255; } faces.push(d); }
  return new pc.Texture(device, { name: 'flat', cubemap: true, width: size, height: size, format: pc.PIXELFORMAT_SRGBA8, mipmaps: false, levels: [faces] });
}
