// Canvas textures shared by the ground layers (roadedges.ts, surfaces.ts).
import * as THREE from '../engine/lite3';

export function canvasTex(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
let rs = 1234;
export const rnd = () => ((rs = (rs * 1664525 + 1013904223) >>> 0) / 4294967296);
/** concrete pavers, 200 x 100 mm, in herringbone, with the given colours (pavers, joints, the worn patches on top);
 *  1.6 m a picture */
export const paverTexture = (bricks: string[], joint: string, worn: string[]) => canvasTex(512, (g, s) => {
  const u = s / 16; // a brick is 2u x 1u, the pattern repeats every 4u: four repeats a picture
  g.fillStyle = joint;
  g.fillRect(0, 0, s, s);
  const brick = (x: number, y: number, w: number, h: number) => {
    for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) {
      const px = x * u + ox, py = y * u + oy;
      if (px > s || py > s || px + w * u < 0 || py + h * u < 0) continue;
      g.fillStyle = bricks[(rnd() * bricks.length) | 0];
      g.fillRect(px + 1.2, py + 1.2, w * u - 2.4, h * u - 2.4);
      g.globalAlpha = 0.16; g.fillStyle = worn[(rnd() * worn.length) | 0];
      g.fillRect(px + 2 + rnd() * w * u * 0.5, py + 2 + rnd() * h * u * 0.4, w * u * 0.35, h * u * 0.35);
      g.globalAlpha = 1;
    }
  };
  // the herringbone: horizontal bricks at (t, t) and vertical ones at (t, t + 1), the staircase repeated every (2, -2)
  for (let a = -8; a < 24; a++) for (let b = -8; b < 8; b++) {
    const x = a + 2 * b, y = a - 2 * b;
    brick(x, y, 2, 1);
    brick(x, y + 1, 1, 2);
  }
});
