// The original's shading tweaks on PlayCanvas materials (see lite3 Material.tweaks): appended to the albedo chunk, in
// world space (PlayCanvas passes the fragment's world position as vPositionW).
import * as THREE from '../engine/lite3';

/**
 * Cheap ambient occlusion: surfaces darken as they get close to the ground, the way walls,
 * tree trunks, kerbs and car bodies do in real light. One smoothstep per pixel, no extra pass.
 * `reach` is how high (m) the darkening goes; `strength` how dark it is at the ground.
 */
export function groundShade<T extends THREE.Material>(mat: T, reach = 1.4, strength = 0.38, key = 'gs'): T {
  mat.tweaks.push({ key: `${key}${reach}${strength}`, code: `dAlbedo *= 1.0 - ${strength.toFixed(3)} * (1.0 - smoothstep(0.0, ${reach.toFixed(3)}, vPositionW.y));` });
  mat.needsUpdate = true;
  return mat;
}

/** foliage closer to the camera than `near` metres is not drawn: a chase or free camera passing through a crown otherwise
 *  fills the screen with one huge dark-green face. A short dithered band softens the edge. */
export function nearCut<T extends THREE.Material>(mat: T, near = 2.2): T {
  mat.tweaks.push({ key: `nc${near}`, code: `float ncD = length(vPositionW - view_position), ncN = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);\nif (ncD < ${near.toFixed(2)} + ncN * 0.8) discard;` });
  mat.needsUpdate = true;
  return mat;
}

function macroCanvas(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgb(128,128,128)';
  g.fillRect(0, 0, size, size);
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}
let rnd = 777;
const r = () => ((rnd = (rnd * 1664525 + 1013904223) >>> 0) / 4294967296);
/** draws on a tiling canvas: whatever crosses an edge is drawn again on the far side */
function wrapDraw(s: number, x: number, y: number, w: number, h: number, f: (x: number, y: number) => void) {
  for (const ox of [0, -s, s]) for (const oy of [0, -s, s]) if (x + ox < s && x + ox + w > 0 && y + oy < s && y + oy + h > 0) f(x + ox, y + oy);
}

/** Weathering for walls: grey 128 is no change, darker is grime. Long vertical streaks and blotches. */
const wallGrime = () => macroCanvas(256, (g, s) => {
  for (let i = 0; i < 90; i++) {
    const x = r() * s, y = r() * s, w = 2 + r() * 10, h = 20 + r() * 110;
    const grad = g.createLinearGradient(0, y, 0, y + h);
    const a = 0.08 + r() * 0.2;
    grad.addColorStop(0, `rgba(40,34,28,${a})`);
    grad.addColorStop(1, 'rgba(40,34,28,0)');
    g.fillStyle = grad;
    wrapDraw(s, x, y, w, h, (px, py) => { g.save(); g.translate(px - x, py - y); g.fillRect(x, y, w, h); g.restore(); });
  }
  for (let i = 0; i < 40; i++) {
    const x = r() * s, y = r() * s, rad = 10 + r() * 40, light = r() < 0.4;
    wrapDraw(s, x - rad, y - rad, rad * 2, rad * 2, (px, py) => {
      const cx = px + rad, cy = py + rad;
      const grad = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
      grad.addColorStop(0, light ? 'rgba(255,255,255,0.12)' : 'rgba(60,50,40,0.14)');
      grad.addColorStop(1, 'rgba(128,128,128,0)');
      g.fillStyle = grad;
      g.fillRect(px, py, rad * 2, rad * 2);
    });
  }
});

/** Road wear: dark patched repairs, lighter sun-faded stretches and oil spots. */
const roadWear = () => macroCanvas(256, (g, s) => {
  for (let i = 0; i < 26; i++) {
    const x = r() * s, y = r() * s, w = 8 + r() * 30, h = 6 + r() * 20;
    g.fillStyle = r() < 0.6 ? `rgba(20,20,22,${0.18 + r() * 0.2})` : `rgba(255,255,255,${0.1 + r() * 0.1})`;
    wrapDraw(s, x, y, w, h, (px, py) => g.fillRect(px, py, w, h));
  }
  for (let i = 0; i < 60; i++) {
    const x = r() * s, y = r() * s, rad = 2 + r() * 6;
    wrapDraw(s, x - rad, y - rad, rad * 2, rad * 2, (px, py) => {
      const cx = px + rad, cy = py + rad;
      const grad = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
      grad.addColorStop(0, 'rgba(10,10,12,0.3)');
      grad.addColorStop(1, 'rgba(10,10,12,0)');
      g.fillStyle = grad;
      g.fillRect(px, py, rad * 2, rad * 2);
    });
  }
  // thin cracks
  g.strokeStyle = 'rgba(15,15,15,0.35)';
  g.lineWidth = 0.8;
  for (let i = 0; i < 30; i++) {
    let x = r() * s, y = r() * s;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 14; y += (r() - 0.5) * 14; g.lineTo(x, y); }
    g.stroke();
  }
});

const texCache: Partial<Record<'wall' | 'ground', THREE.Texture>> = {};

/**
 * Large-scale weathering in world space, so repeated textures stop looking copied:
 * 'wall' streaks down walls (x+z along the wall, y up), 'ground' lies flat (x, z).
 */
export function weathering<T extends THREE.Material>(mat: T, kind: 'wall' | 'ground', metres: number, strength: number): T {
  const tex = (texCache[kind] ??= kind === 'wall' ? wallGrime() : roadWear());
  const uv = kind === 'wall' ? `vec2((vPositionW.x + vPositionW.z) / ${metres.toFixed(1)}, -vPositionW.y / ${(metres * 0.5).toFixed(1)})` : `vPositionW.xz / ${metres.toFixed(1)}`;
  mat.tweaks.push({ key: `wx${kind}${metres}${strength}`, code: `dAlbedo *= 1.0 + (texture2D(wxTex, ${uv}).r - 0.5) * ${(strength * 2).toFixed(3)};`, uniforms: { wxTex: tex.pc } });
  mat.needsUpdate = true;
  return mat;
}
