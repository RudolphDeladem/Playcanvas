// Phones and small machines (the owner: phones never opened the game): textures drawn at full size are kept at half size
// (a copy, no pixel read-back), so the campus's hundreds of procedural pictures take a quarter of the memory.
export const LITE = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent) || (navigator.hardwareConcurrency ?? 8) <= 4);

/** the picture to upload: on LITE devices a half-size copy of a large canvas */
export function liteCanvas(c: HTMLCanvasElement): HTMLCanvasElement {
  if (!LITE || c.width * c.height < 65536) return c;
  const h = document.createElement('canvas');
  h.width = Math.max(1, c.width >> 1); h.height = Math.max(1, c.height >> 1);
  h.getContext('2d', { willReadFrequently: true })!.drawImage(c, 0, 0, h.width, h.height);
  return h;
}
