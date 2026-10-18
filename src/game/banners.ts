// Overhead banners at the end of a ride (the owner's finish-line and destination-banner brief): where an explore ride
// arrives, a destination banner with that destination's own name; where a race ends, a FINISH banner on a light truss
// frame over the finish line (the race's completion is the existing finish check, at the same line). The start gate's
// white pillars are not these (world.ts `gate`).
//
// Both span the route's road on two supports outside its kerbs, the board's underside well above the rider and the
// camera, and read from both directions. No crest: the project has no university crest asset, and none is invented.
import * as THREE from '../engine/lite3';

/** the supports' distance from the road's edge: outside the kerbs, clear of the riding lanes */
const OUTSIDE = 1.8;
/** the underside of the board above the road */
export const BANNER_CLEAR = 5.0;

const NAVY = '#14284b', GOLD = '#e0b13a';

/** the destination name on a white board with navy ends and a gold rule; wrapped to two lines when long */
function nameTexture(text: string) {
  const W = 2048, probe = document.createElement('canvas').getContext('2d')!;
  const words = text.toUpperCase().split(/\s+/);
  const font = (px: number) => `800 ${px}px Sora, system-ui, sans-serif`;
  const inner = W - 2 * 210;
  // one line if it fits at a good size, else the best split into two
  let lines = [words.join(' ')], px = 126;
  probe.font = font(px);
  if (probe.measureText(lines[0]).width > inner) {
    let best = lines, bestW = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      const w = Math.max(probe.measureText(a).width, probe.measureText(b).width);
      if (w < bestW) { bestW = w; best = [a, b]; }
    }
    lines = words.length > 1 ? best : lines;
  }
  const H = lines.length > 1 ? 420 : 260;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f7f5ef'; g.fillRect(0, 0, W, H);
  // the navy ends with a gold diagonal, the navy rules top and bottom
  for (const s of [0, 1]) {
    const x0 = s ? W - 170 : 0;
    g.fillStyle = NAVY; g.fillRect(x0, 0, 170, H);
    g.fillStyle = GOLD;
    g.beginPath();
    if (s) { g.moveTo(W - 170, 0); g.lineTo(W - 120, 0); g.lineTo(W - 170, H * 0.55); } else { g.moveTo(170, 0); g.lineTo(120, 0); g.lineTo(170, H * 0.55); }
    g.closePath(); g.fill();
  }
  g.fillStyle = NAVY; g.fillRect(0, 0, W, 22); g.fillRect(0, H - 22, W, 22);
  g.fillStyle = GOLD; g.fillRect(170, H - 34, W - 340, 10);
  // the name, as large as fits
  g.fillStyle = NAVY; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (px = 160; px > 40; px -= 4) { g.font = font(px); if (lines.every((l) => g.measureText(l).width <= inner) && px * lines.length * 1.15 <= H - 80) break; }
  const lh = px * 1.12, y0 = H / 2 - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => g.fillText(l, W / 2, y0 + i * lh));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { tex, aspect: W / H };
}

/** FINISH in red between chequered ends */
function finishTexture() {
  const W = 2048, H = 300, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
  const sq = H / 4;
  for (const x0 of [0, W - 4 * sq * 1.5]) for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
    g.fillStyle = (i + j) % 2 ? '#111111' : '#ffffff';
    g.fillRect(x0 + i * sq, j * sq, sq, sq);
  }
  g.fillStyle = '#d0121b';
  g.font = 'italic 900 210px Sora, system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('FINISH', W / 2, H / 2 + 8);
  g.fillStyle = '#d0121b'; g.fillRect(6 * sq, 0, W - 12 * sq, 14); g.fillRect(6 * sq, H - 14, W - 12 * sq, 14);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { tex, aspect: W / H };
}

/** a board of the given texture, its face on both sides (z out), the frame round it */
function board(tex: THREE.Texture, w: number, h: number, frame: string) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: frame, roughness: 0.6, metalness: 0.2 });
  const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, h + 0.2, 0.2), mat);
  back.castShadow = true;
  g.add(back);
  const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.18 });
  for (const s of [1, -1]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, h), face);
    f.position.z = s * 0.105;
    if (s < 0) f.rotation.y = Math.PI;
    g.add(f);
  }
  return g;
}

/** A destination banner: white columns on stone-clad feet either side of the road, the board with the name between
 *  them under a white beam. Local frame: x across the road, the board's faces along z, the road's surface at y 0. */
export function destinationBanner(name: string, roadHalf: number) {
  const BANNER_SPAN = roadHalf + OUTSIDE;
  const g = new THREE.Group();
  g.name = 'destination-banner';
  const white = new THREE.MeshStandardMaterial({ color: '#f1efe9', roughness: 0.75 });
  const stone = new THREE.MeshStandardMaterial({ color: '#b49b78', roughness: 0.95 });
  const { tex, aspect } = nameTexture(name);
  const w = BANNER_SPAN * 2 - 0.9, h = Math.min(2.6, Math.max(1.5, w / aspect));
  const top = BANNER_CLEAR + h + 0.35;
  for (const s of [-1, 1]) {
    const x = s * BANNER_SPAN;
    // (down into the ground a little: on a slope across the road neither foot floats)
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.1, 0.95), stone);
    foot.position.set(x, 0.25, 0);
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.6, top, 0.6), white);
    col.position.set(x, top / 2, 0);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.22, 0.8), white);
    cap.position.set(x, top + 0.11, 0);
    for (const m of [foot, col, cap]) { m.castShadow = true; g.add(m); }
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(BANNER_SPAN * 2 + 0.6, 0.32, 0.4), white);
  beam.position.y = top - 0.16;
  beam.castShadow = true;
  g.add(beam);
  const b = board(tex, w, h, '#e9e6de');
  b.position.y = BANNER_CLEAR + h / 2;
  g.add(b);
  return g;
}

/** A race's FINISH banner: two light square truss towers with chequered red and white flags down their inner faces, a
 *  truss across the top with the FINISH board hung under it, and the chequered line across the road. */
export function finishBanner(roadHalf: number) {
  const BANNER_SPAN = roadHalf + OUTSIDE;
  const g = new THREE.Group();
  g.name = 'finish-banner';
  const steel = new THREE.MeshStandardMaterial({ color: '#c9ccd1', roughness: 0.4, metalness: 0.7 });
  const top = BANNER_CLEAR + 2.0;
  /** a square truss from a to b (local), 0.5 m across: four chords, rungs and diagonals on each face */
  const truss = (a: THREE.Vector3, b: THREE.Vector3) => {
    const t = new THREE.Group(), d = b.clone().sub(a), len = d.length(), s = 0.25;
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    const rod = (p: THREE.Vector3, r: THREE.Vector3, rad: number) => {
      const v = r.clone().sub(p), m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, v.length(), 6), steel);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize());
      m.position.copy(p.clone().add(r).multiplyScalar(0.5));
      t.add(m);
    };
    const corners = [[-s, -s], [s, -s], [s, s], [-s, s]];
    for (const [cx, cz] of corners) rod(new THREE.Vector3(cx, 0, cz), new THREE.Vector3(cx, len, cz), 0.035);
    const n = Math.max(1, Math.round(len / 0.6));
    for (let i = 0; i <= n; i++) {
      const y = (len * i) / n;
      for (let k = 0; k < 4; k++) {
        const [ax, az] = corners[k], [bx, bz] = corners[(k + 1) % 4];
        rod(new THREE.Vector3(ax, y, az), new THREE.Vector3(bx, y, bz), 0.018);
        if (i < n) rod(new THREE.Vector3(ax, y, az), new THREE.Vector3(bx, (len * (i + 1)) / n, bz), 0.015);
      }
    }
    t.quaternion.copy(q);
    t.position.copy(a);
    g.add(t);
  };
  const X = BANNER_SPAN;
  truss(new THREE.Vector3(-X, -0.6, 0), new THREE.Vector3(-X, top + 0.25, 0));
  truss(new THREE.Vector3(X, -0.6, 0), new THREE.Vector3(X, top + 0.25, 0));
  truss(new THREE.Vector3(-X - 0.25, top, 0), new THREE.Vector3(X + 0.25, top, 0));
  for (const s of [-1, 1]) {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 1.0), steel);
    foot.position.set(s * X, -0.3, 0);
    g.add(foot);
  }
  // the chequered red and white flags down the towers' inner faces
  const c = document.createElement('canvas');
  c.width = 64; c.height = 256;
  const x = c.getContext('2d')!;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? '#d0121b' : '#ffffff'; x.fillRect(i * 32, j * 32, 32, 32); }
  const ft = new THREE.CanvasTexture(c);
  ft.colorSpace = THREE.SRGBColorSpace;
  const flagMat = new THREE.MeshStandardMaterial({ map: ft, roughness: 0.8, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 3.6), flagMat);
    f.rotation.y = Math.PI / 2;
    f.position.set(s * (X - 0.3), 2.6, 0);
    g.add(f);
  }
  const { tex, aspect } = finishTexture();
  const w = X * 2 - 1.2, h = Math.min(1.9, w / aspect);
  const b = board(tex, w, h, '#ffffff');
  b.position.y = top - 0.35 - h / 2;
  g.add(b);
  // the chequered line across the road
  const lc = document.createElement('canvas');
  lc.width = 160; lc.height = 20;
  const l = lc.getContext('2d')!;
  for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { l.fillStyle = (i + j) % 2 ? '#111' : '#fff'; l.fillRect(i * 10, j * 10, 10, 10); }
  const lt = new THREE.CanvasTexture(lc);
  lt.colorSpace = THREE.SRGBColorSpace;
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(roadHalf * 2, 1), new THREE.MeshStandardMaterial({ map: lt }));
  strip.rotation.x = -Math.PI / 2;
  strip.position.y = 0.01;
  g.add(strip);
  return g;
}
