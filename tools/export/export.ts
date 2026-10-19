// LEGONRUSH campus converter: builds the ORIGINAL game's campus (read-only import of its source, served at /orig) in a
// headless browser and converts everything it draws into this project's own compact tile format for PlayCanvas:
//
//   public/campus/manifest.json        tiles, materials (day and night states), textures
//   public/campus/tex/<id>.webp        every texture once (deduplicated by content)
//   public/campus/tiles/<i>_<j>.lrz   128 m tiles: per material, welded and simplified (within 6 mm) triangle batches
//                                      with quantised positions, int8 normals, float UVs, uint8 colours; instanced
//                                      batches (trees, crowns) with their per-instance matrices and colours
//   public/campus/collision.lrz        the original's bike-height mesh raster (meshcollide.ts), 42 m tiles, 0.35 m cells
//   public/campus/solids.lrz           round solids (trunks, posts) and open passages
//   public/campus/earth.lrz            the earth tracks (science.ts onEarth) on a 1 m grid
//   public/campus/landmark.lrz         the landmark keep-outs (life.ts inLandmark) on a 0.5 m grid
//
// Nothing here renders: the converter only reads the original's scene graph. Run: tools/export/convert.sh
import { buildCampus, lampGlow } from '/orig/src/game/world.ts';
import { buildLandmarks } from '/orig/src/game/landmarks.ts';
import { inLandmark, setNightLights } from '/orig/src/game/life.ts';
import { SOLIDS, PASSAGES, OPASSAGES } from '/orig/src/game/solids.ts';
import { meshBlocked } from '/orig/src/game/meshcollide.ts';
import { onEarth } from '/orig/src/game/science.ts';
import { mapBounds } from '/orig/src/game/campusmap.ts';
import { loadKenneyCars } from '/orig/src/game/kenneycars.ts';
import { dropHiddenFaces } from '/orig/src/game/memory.ts';
import { MeshoptSimplifier } from 'meshoptimizer';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;
const TILE = 128;
const CHUNK = 4; // tiles per chunk side: geometry is gathered a chunk (512 m) at a time
const SIMPLIFY_ERROR = 0.006; // metres
const log = (...a: unknown[]) => console.log('[x]', ...a);
const q = new URLSearchParams(location.search);
/** a test run over one box only: ?box=x0,x1,z0,z1 */
const BOX = q.get('box')?.split(',').map(Number) as [number, number, number, number] | undefined;
const SKIP = new Set((q.get('skip') ?? '').split(',').filter(Boolean));

async function put(path: string, data: BlobPart, gzip = false) {
  let body: Blob = new Blob([data]);
  if (gzip) body = await new Response(body.stream().pipeThrough(new CompressionStream('gzip'))).blob();
  const r = await fetch(`/__write?path=${encodeURIComponent(path)}`, { method: 'POST', body });
  if (!r.ok) throw new Error(`write ${path}: ${r.status}`);
  return body.size;
}
const yieldNow = () => new Promise((r) => setTimeout(r, 0));

// ---------------------------------------------------------------------------------------------------------------
// textures and materials
// ---------------------------------------------------------------------------------------------------------------
const texIds = new Map<Any, number>();
const texByHash = new Map<string, number>();
const textures: Any[] = [];
let texBytes = 0;
function hashPixels(d: Uint8ClampedArray, w: number, h: number) {
  let a = 2166136261 >>> 0, b = 0x9e3779b9 >>> 0;
  for (let i = 0; i < d.length; i += 1) { a = Math.imul(a ^ d[i], 16777619) >>> 0; if ((i & 63) === 0) b = Math.imul(b ^ a, 2654435761) >>> 0; }
  return `${w}x${h}:${a.toString(16)}:${b.toString(16)}`;
}
async function textureId(t: Any): Promise<number> {
  if (texIds.has(t)) return texIds.get(t)!;
  const img = t.image;
  // (an image texture may still be loading when the campus is built: wait for it)
  if (img && !(img.width > 0) && typeof img.decode === 'function') { try { await img.decode(); } catch { /* reported below */ } }
  if (img && !(img.width > 0) && img.complete === false) await new Promise((r) => { img.onload = r; img.onerror = r; setTimeout(r, 15000); });
  const w = img?.width ?? 0, h = img?.height ?? 0;
  if (!w || !h) { console.log('[x] texture without an image (skipped):', img?.src ?? img?.constructor?.name); texIds.set(t, -1); return -1; }
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const g = cv.getContext('2d', { willReadFrequently: true })!;
  if (img.data) g.putImageData(new ImageData(new Uint8ClampedArray(img.data.buffer, img.data.byteOffset, img.data.byteLength), w, h), 0, 0);
  else g.drawImage(img, 0, 0);
  const px = g.getImageData(0, 0, w, h).data;
  const hash = hashPixels(px, w, h);
  let file = texByHash.get(hash);
  let alpha = false;
  for (let i = 3; i < px.length; i += 4) if (px[i] < 250) { alpha = true; break; }
  if (file === undefined) {
    file = texByHash.size;
    texByHash.set(hash, file);
    const blob: Blob = await new Promise((r) => cv.toBlob((b) => r(b!), 'image/webp', 0.92));
    texBytes += await put(`tex/${file}.webp`, blob);
  }
  const id = textures.length;
  textures.push({
    file, w, h, alpha,
    wrapS: t.wrapS === 1000 ? 'repeat' : t.wrapS === 1002 ? 'mirror' : 'clamp',
    wrapT: t.wrapT === 1000 ? 'repeat' : t.wrapT === 1002 ? 'mirror' : 'clamp',
    repeat: [t.repeat.x, t.repeat.y], offset: [t.offset.x, t.offset.y], rotation: t.rotation, center: [t.center.x, t.center.y],
    flipY: t.flipY, srgb: t.colorSpace === 'srgb', channel: t.channel ?? 0, nearest: t.magFilter === 1003, anisotropy: t.anisotropy ?? 1,
  });
  texIds.set(t, id);
  return id;
}

const matIds = new Map<Any, number>();
const materials: Any[] = [];
/** the shading tweaks the original adds to its materials (onBeforeCompile: weathering, ground shade, near cut, grass
 *  macro variation, overlay detail, stone and concrete textures). Each is run on a skeleton shader to capture exactly
 *  what it injects, and the injected GLSL is translated for PlayCanvas's albedo chunk: its world-position and
 *  world-normal varyings become vPositionW / vNormalW, three's diffuseColor becomes dAlbedo, the view distance comes
 *  from view_position. Uniform textures are exported like any other. */
const FAKE_VS = '#include <common>\n#include <begin_vertex>\n#include <worldpos_vertex>\n#include <project_vertex>';
const FAKE_FS = '#include <common>\n#include <clipping_planes_fragment>\n#include <map_fragment>\n#include <color_fragment>';
const snippets: string[] = [];
async function captureShader(m: Any) {
  const own = m.onBeforeCompile;
  if (!own || /^onBeforeCompile\s*\(\s*\)\s*\{\s*\}$/.test(own.toString().trim())) return null;
  const sh: Any = { uniforms: {}, vertexShader: FAKE_VS, fragmentShader: FAKE_FS, defines: {} };
  try { own.call(m, sh, {}); } catch (e) { return { error: String(e) }; }
  // the varyings and how the vertex shader fills them
  const vary = new Map<string, string>();
  for (const [, , name] of sh.vertexShader.matchAll(/varying\s+(\w+)\s+(\w+)\s*;/g)) {
    const a = sh.vertexShader.match(new RegExp(`\\b${name}\\s*=\\s*([^;]+);`));
    const expr = a ? a[1] : '';
    let rep = 'vPositionW';
    // (a float attribute of the geometry's own, the soil's coverage: carried in the vertex colour's alpha, see the
    // chunk pass)
    if (/^\s*soil\s*$/.test(expr)) rep = 'vVertexColor.a';
    else if (/objectNormal|normal/.test(expr)) rep = 'normalize(vNormalW)';
    else { const sw = expr.match(/\)\s*\.(xyz|xz|xy|y|x|z)\s*$/) || expr.match(/position\.(xyz|xz|xy|y|x|z)/); rep = sw ? `vPositionW.${sw[1]}` : 'vPositionW'; }
    vary.set(name, rep);
  }
  // (a shader that drops <color_fragment> uses its vertex colours for something else, not as a tint: PlayCanvas's tint
  // undone first)
  const untint = !sh.fragmentShader.includes('#include <color_fragment>') && m.vertexColors ? 'dAlbedo /= max(vVertexColor.rgb, vec3(0.02));\n' : '';
  let code = untint + sh.fragmentShader.split('\n').filter((l: string) => !/^\s*(#include|varying|uniform)\b/.test(l)).join('\n');
  for (const [n, r] of vary) code = code.replace(new RegExp(`\\b${n}\\b`, 'g'), r);
  code = code.replace(/\bvColor\b/g, 'vVertexColor').replace(/diffuseColor\.rgb/g, 'dAlbedo').replace(/\bvViewPosition\b/g, '(vPositionW - view_position)');
  const uniforms: Any = {};
  for (const [n, u] of Object.entries(sh.uniforms) as [string, Any][]) {
    const v = u.value;
    if (v?.isTexture) { const id = await textureId(v); if (id >= 0) uniforms[n] = { tex: id }; }
    else if (typeof v === 'number') uniforms[n] = { f: v };
    else if (v?.isColor) uniforms[n] = { v: [v.r, v.g, v.b] };
    else if (v?.isVector2) uniforms[n] = { v: [v.x, v.y] };
    else if (v?.isVector3) uniforms[n] = { v: [v.x, v.y, v.z] };
  }
  let id = snippets.indexOf(code);
  if (id < 0) { id = snippets.length; snippets.push(code); }
  return { snippet: id, uniforms };
}
async function materialId(m: Any): Promise<number> {
  if (matIds.has(m)) return matIds.get(m)!;
  const tex = async (t: Any) => { if (!t) return null; const id = await textureId(t); return id < 0 ? null : id; };
  const c = (col: Any) => (col ? [col.r, col.g, col.b] : null);
  const d: Any = {
    type: m.type, name: m.name || undefined,
    color: c(m.color), emissive: c(m.emissive), ei: m.emissiveIntensity ?? 0,
    rough: m.roughness ?? 1, metal: m.metalness ?? 0, env: m.envMapIntensity ?? 1,
    opacity: m.opacity, transparent: !!m.transparent, alphaTest: m.alphaTest || 0,
    side: m.side, vc: !!m.vertexColors, flat: !!m.flatShading,
    depthWrite: m.depthWrite, depthTest: m.depthTest, blending: m.blending,
    po: m.polygonOffset ? [m.polygonOffsetFactor, m.polygonOffsetUnits] : null,
    fog: m.fog !== false, toneMapped: m.toneMapped !== false, visible: m.visible,
    map: await tex(m.map), emissiveMap: await tex(m.emissiveMap), alphaMap: await tex(m.alphaMap),
    shade: await captureShader(m), key: m.customProgramCacheKey ? String(m.customProgramCacheKey()).slice(0, 80) : undefined,
    tag: m === lampGlow.head ? 'lampHead' : m === lampGlow.pool ? 'lampPool' : m.userData?.lrTag,
  };
  const id = materials.length;
  materials.push(d);
  matIds.set(m, id);
  return id;
}

// ---------------------------------------------------------------------------------------------------------------
// geometry buckets
// ---------------------------------------------------------------------------------------------------------------
class F32 {
  a = new Float32Array(1024); n = 0;
  push3(x: number, y: number, z: number) { this.need(3); this.a[this.n++] = x; this.a[this.n++] = y; this.a[this.n++] = z; }
  push2(x: number, y: number) { this.need(2); this.a[this.n++] = x; this.a[this.n++] = y; }
  push(v: number) { this.need(1); this.a[this.n++] = v; }
  need(k: number) { if (this.n + k > this.a.length) { const b = new Float32Array(Math.max(this.a.length * 2, this.n + k)); b.set(this.a); this.a = b; } }
  get view() { return this.a.subarray(0, this.n); }
}
interface Soup { kind: 'soup'; tile: string; mat: number; lod: number; ro: number; n: boolean; uv: boolean; uv1: boolean; c: boolean; p: F32; nr: F32; t: F32; t1: F32; cl: F32 }
interface Inst { kind: 'inst'; tile: string; mat: number; lod: number; ro: number; geo: Any; m: F32; cl: F32; hasColor: boolean }
type Bucket = Soup | Inst;

/** the level-of-detail ranges met in the scene (index 0: always drawn) */
const LODS: [number, number][] = [[0, Infinity]];
const lodIndex = (a: number, b: number) => { let i = LODS.findIndex(([x, y]) => x === a && y === b); if (i < 0) { i = LODS.length; LODS.push([a, b]); } return i; };

interface Rec { mesh: Any; lod: number; x0: number; x1: number; z0: number; z1: number }

function normalMatrix(e: Float32Array | number[]) {
  // inverse-transpose of the upper 3x3 of a column-major 4x4
  const a = e[0], b = e[1], c = e[2], d = e[4], f = e[5], g = e[6], h = e[8], i = e[9], j = e[10];
  const A = f * j - g * i, B = -(d * j - g * h), C = d * i - f * h;
  const det = a * A + b * B + c * C || 1;
  const D = -(b * j - c * i), E = a * j - c * h, F = -(a * i - b * h);
  const G = b * g - c * f, H = -(a * g - c * d), I = a * f - b * d;
  // inverse = adj^T / det; its transpose = adj / det (rows of cofactors)
  return [A / det, B / det, C / det, D / det, E / det, F / det, G / det, H / det, I / det];
}

const tileKey = (x: number, z: number) => `${Math.floor(x / TILE)}_${Math.floor(z / TILE)}`;

// ---------------------------------------------------------------------------------------------------------------
// weld, simplify, quantise, write
// ---------------------------------------------------------------------------------------------------------------
await MeshoptSimplifier.ready;
const stats = { soupIn: 0, soupOut: 0, triIn: 0, triOut: 0, inst: 0, tiles: 0, bytes: 0, simplifyMs: 0 };

function weld(b: Soup) {
  const nv = b.p.n / 3;
  const map = new Map<string, number>();
  const idx = new Uint32Array(nv);
  const keep: number[] = [];
  const P = b.p.a, N = b.nr.a, T = b.t.a, T1 = b.t1.a, C = b.cl.a;
  for (let v = 0; v < nv; v++) {
    let k = `${Math.round(P[v * 3] * 2000)},${Math.round(P[v * 3 + 1] * 2000)},${Math.round(P[v * 3 + 2] * 2000)}`;
    if (b.n) k += `|${Math.round(N[v * 3] * 500)},${Math.round(N[v * 3 + 1] * 500)},${Math.round(N[v * 3 + 2] * 500)}`;
    if (b.uv) k += `|${Math.round(T[v * 2] * 4096)},${Math.round(T[v * 2 + 1] * 4096)}`;
    if (b.uv1) k += `|${Math.round(T1[v * 2] * 4096)},${Math.round(T1[v * 2 + 1] * 4096)}`;
    if (b.c) k += `|${Math.round(C[v * 4] * 255)},${Math.round(C[v * 4 + 1] * 255)},${Math.round(C[v * 4 + 2] * 255)},${Math.round(C[v * 4 + 3] * 255)}`;
    let j = map.get(k);
    if (j === undefined) { j = keep.length; keep.push(v); map.set(k, j); }
    idx[v] = j;
  }
  return { idx, keep };
}

function finishSoup(b: Soup) {
  const nv = b.p.n / 3;
  stats.soupIn += nv; stats.triIn += nv / 3;
  const { idx, keep } = weld(b);
  const V = keep.length;
  const pos = new Float32Array(V * 3), nrm = b.n ? new Float32Array(V * 3) : null, uv = b.uv ? new Float32Array(V * 2) : null, uv1 = b.uv1 ? new Float32Array(V * 2) : null, col = b.c ? new Float32Array(V * 4) : null;
  keep.forEach((v, j) => {
    pos.set(b.p.a.subarray(v * 3, v * 3 + 3), j * 3);
    if (nrm) nrm.set(b.nr.a.subarray(v * 3, v * 3 + 3), j * 3);
    if (uv) uv.set(b.t.a.subarray(v * 2, v * 2 + 2), j * 2);
    if (uv1) uv1.set(b.t1.a.subarray(v * 2, v * 2 + 2), j * 2);
    if (col) col.set(b.cl.a.subarray(v * 4, v * 4 + 4), j * 4);
  });
  let index = idx;
  // simplify the large smooth surfaces (ground drapes, terrain-following paths) within a few millimetres; open edges
  // (tile cuts, hard edges, the outline of every flat-shaded box) stay where they are
  if (index.length > 3000) {
    const t0 = performance.now();
    const stride = (nrm ? 3 : 0) + (uv ? 2 : 0) + (col ? 4 : 0);
    const attrs = new Float32Array(Math.max(1, stride) * V);
    const weights: number[] = [];
    if (nrm) weights.push(0.6, 0.6, 0.6);
    if (uv) weights.push(0.02, 0.02);
    if (col) weights.push(1.5, 1.5, 1.5, 1.5);
    for (let j = 0; j < V; j++) {
      let o = j * Math.max(1, stride);
      if (nrm) { attrs[o++] = nrm[j * 3]; attrs[o++] = nrm[j * 3 + 1]; attrs[o++] = nrm[j * 3 + 2]; }
      if (uv) { attrs[o++] = uv[j * 2]; attrs[o++] = uv[j * 2 + 1]; }
      if (col) { attrs[o++] = col[j * 4]; attrs[o++] = col[j * 4 + 1]; attrs[o++] = col[j * 4 + 2]; attrs[o++] = col[j * 4 + 3]; }
    }
    if (!uv1) {
      const [out] = MeshoptSimplifier.simplifyWithAttributes(index, pos, 3, attrs, Math.max(1, stride), stride ? weights : [], null, 0, SIMPLIFY_ERROR, ['LockBorder', 'ErrorAbsolute']);
      if (out.length < index.length * 0.95) index = out as Uint32Array;
    }
    stats.simplifyMs += performance.now() - t0;
  }
  // drop the vertices nothing uses any more
  const remap = new Int32Array(V).fill(-1);
  let n = 0;
  const order: number[] = [];
  for (let i = 0; i < index.length; i++) { const v = index[i]; if (remap[v] < 0) { remap[v] = n++; order.push(v); } }
  const ix = n > 65535 ? new Uint32Array(index.length) : new Uint16Array(index.length);
  for (let i = 0; i < index.length; i++) ix[i] = remap[index[i]];
  // bounds and quantised positions
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (const v of order) { const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z; }
  const sx = Math.max(1e-4, x1 - x0), sy = Math.max(1e-4, y1 - y0), sz = Math.max(1e-4, z1 - z0);
  const qp = new Uint16Array(n * 4);
  const qn = nrm ? new Int8Array(n * 4) : null;
  const fuv = uv ? new Float32Array(n * 2) : null, fuv1 = uv1 ? new Float32Array(n * 2) : null;
  const qc = col ? new Uint8Array(n * 4) : null;
  order.forEach((v, j) => {
    qp[j * 4] = Math.round(((pos[v * 3] - x0) / sx) * 65535); qp[j * 4 + 1] = Math.round(((pos[v * 3 + 1] - y0) / sy) * 65535); qp[j * 4 + 2] = Math.round(((pos[v * 3 + 2] - z0) / sz) * 65535);
    if (qn && nrm) { const a = nrm[v * 3], bb = nrm[v * 3 + 1], c = nrm[v * 3 + 2], l = Math.hypot(a, bb, c) || 1; qn[j * 4] = Math.round((a / l) * 127); qn[j * 4 + 1] = Math.round((bb / l) * 127); qn[j * 4 + 2] = Math.round((c / l) * 127); }
    if (fuv && uv) { fuv[j * 2] = uv[v * 2]; fuv[j * 2 + 1] = uv[v * 2 + 1]; }
    if (fuv1 && uv1) { fuv1[j * 2] = uv1[v * 2]; fuv1[j * 2 + 1] = uv1[v * 2 + 1]; }
    if (qc && col) for (let k = 0; k < 4; k++) qc[j * 4 + k] = Math.max(0, Math.min(255, Math.round(col[v * 4 + k] * 255)));
  });
  stats.soupOut += n; stats.triOut += ix.length / 3;
  return { head: { k: 's', m: b.mat, l: b.lod, ro: b.ro, v: n, i: ix.length, i32: ix instanceof Uint32Array, n: b.n, uv: b.uv, uv1: b.uv1, c: b.c, box: [x0, y0, z0, sx, sy, sz] }, bufs: [qp, qn, fuv, fuv1, qc, ix].filter(Boolean) as ArrayBufferView[] };
}

const geoCache = new Map<string, { head: Any; bufs: ArrayBufferView[] }>();
function instGeometry(geo: Any, mat: Any) {
  // the base geometry of an instanced batch, in its own frame: float positions, int8 normals, colours
  const key = `${geo.uuid}|${matIds.get(mat)}`;
  if (geoCache.has(key)) return geoCache.get(key)!;
  const P = geo.attributes.position, N = geo.attributes.normal, C = mat.vertexColors ? geo.attributes.color : null, T = mat.map ? geo.attributes.uv : null;
  const nv = P.count;
  const pos = new Float32Array(nv * 3), nrm = N ? new Int8Array(nv * 4) : null, col = C ? new Uint8Array(nv * 4) : null, uv = T ? new Float32Array(nv * 2) : null;
  for (let v = 0; v < nv; v++) {
    pos[v * 3] = P.getX(v); pos[v * 3 + 1] = P.getY(v); pos[v * 3 + 2] = P.getZ(v);
    if (nrm) { const a = N.getX(v), b = N.getY(v), c = N.getZ(v), l = Math.hypot(a, b, c) || 1; nrm[v * 4] = Math.round((a / l) * 127); nrm[v * 4 + 1] = Math.round((b / l) * 127); nrm[v * 4 + 2] = Math.round((c / l) * 127); }
    if (col) { col[v * 4] = Math.round(C.getX(v) * 255); col[v * 4 + 1] = Math.round(C.getY(v) * 255); col[v * 4 + 2] = Math.round(C.getZ(v) * 255); col[v * 4 + 3] = C.itemSize > 3 ? Math.round(C.getW(v) * 255) : 255; }
    if (uv) { uv[v * 2] = T.getX(v); uv[v * 2 + 1] = T.getY(v); }
  }
  let ix: Uint16Array | Uint32Array;
  if (geo.index) ix = nv > 65535 ? new Uint32Array(geo.index.array) : new Uint16Array(geo.index.array);
  else { ix = nv > 65535 ? new Uint32Array(nv) : new Uint16Array(nv); for (let i = 0; i < nv; i++) ix[i] = i; }
  const r = { head: { v: nv, i: ix.length, i32: ix instanceof Uint32Array, n: !!nrm, c: !!col, uv: !!uv }, bufs: [pos, nrm, col, uv, ix].filter(Boolean) as ArrayBufferView[] };
  geoCache.set(key, r);
  return r;
}

function finishInst(b: Inst, mat: Any) {
  const g = instGeometry(b.geo, mat);
  const n = b.m.n / 16;
  stats.inst += n;
  const m = new Float32Array(b.m.view);
  const c = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) { for (let k = 0; k < 3; k++) c[i * 4 + k] = Math.max(0, Math.min(255, Math.round((b.hasColor ? b.cl.a[i * 3 + k] : 1) * 255))); c[i * 4 + 3] = 255; }
  // the batch's bounds from its instance positions (plus a generous radius for the crown)
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity, rad = 0;
  const P = b.geo.attributes.position;
  if (!b.geo.boundingSphere) b.geo.computeBoundingSphere();
  rad = b.geo.boundingSphere.radius + Math.hypot(b.geo.boundingSphere.center.x, b.geo.boundingSphere.center.y, b.geo.boundingSphere.center.z);
  void P;
  for (let i = 0; i < n; i++) {
    const s = Math.max(Math.hypot(m[i * 16], m[i * 16 + 1], m[i * 16 + 2]), Math.hypot(m[i * 16 + 4], m[i * 16 + 5], m[i * 16 + 6]), Math.hypot(m[i * 16 + 8], m[i * 16 + 9], m[i * 16 + 10]));
    const x = m[i * 16 + 12], y = m[i * 16 + 13], z = m[i * 16 + 14], r = rad * s;
    x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); y0 = Math.min(y0, y - r); y1 = Math.max(y1, y + r); z0 = Math.min(z0, z - r); z1 = Math.max(z1, z + r);
  }
  return { head: { k: 'i', m: b.mat, l: b.lod, ro: b.ro, n, g: g.head, box: [x0, y0, z0, x1 - x0, y1 - y0, z1 - z0] }, bufs: [...g.bufs, m, c] };
}

async function writeTile(key: string, parts: { head: Any; bufs: ArrayBufferView[] }[]) {
  const heads: Any[] = [];
  let off = 0;
  const views: ArrayBufferView[] = [];
  for (const p of parts) {
    const offs: number[] = [];
    for (const b of p.bufs) { off = (off + 3) & ~3; offs.push(off); views.push(b); off += b.byteLength; }
    heads.push({ ...p.head, o: offs });
  }
  const json = new TextEncoder().encode(JSON.stringify(heads));
  const headLen = (4 + json.byteLength + 3) & ~3;
  const out = new Uint8Array(headLen + off);
  new DataView(out.buffer).setUint32(0, json.byteLength, true);
  out.set(json, 4);
  let o = 0;
  for (const v of views) { o = (o + 3) & ~3; out.set(new Uint8Array(v.buffer, v.byteOffset, v.byteLength), headLen + o); o += v.byteLength; }
  const size = await put(`tiles/${key}.lrz`, out, true);
  stats.tiles++; stats.bytes += size;
  return size;
}

// ---------------------------------------------------------------------------------------------------------------
// the original's batched plants and painted cars, as plain instanced batches
// ---------------------------------------------------------------------------------------------------------------
/** the plants' full shape nearer than this, their simple shape further off (vegetation/instances.ts NEAR_PLANT) */
const NEAR_PLANT = 110;
/** a BatchedMesh's geometry `id` as a geometry of its own (cached per batch) */
const subGeos = new WeakMap<Any, Map<number, Any>>();
function subGeometry(bm: Any, id: number) {
  let cache = subGeos.get(bm);
  if (!cache) subGeos.set(bm, (cache = new Map()));
  if (cache.has(id)) return cache.get(id);
  const src = bm.geometry, r = bm.getGeometryRangeAt(id);
  const g = new src.constructor();
  for (const [name, a] of Object.entries(src.attributes) as [string, Any][]) {
    const s = a.itemSize;
    g.setAttribute(name, new a.constructor(a.array.slice(r.vertexStart * s, (r.vertexStart + r.vertexCount) * s), s, a.normalized));
  }
  const ix = src.index.array.slice(r.indexStart, r.indexStart + r.indexCount);
  for (let i = 0; i < ix.length; i++) ix[i] -= r.vertexStart;
  g.setIndex(new src.index.constructor(ix, 1));
  g.computeBoundingBox(); g.computeBoundingSphere();
  cache.set(id, g);
  return g;
}
/** an instanced batch as the converter reads one (visit, the chunk pass, finishInst): the source's place in the world,
 *  this geometry, material, per-instance matrices and colours */
function instancedLike(like: Any, geo: Any, mat: Any, mats: Float32Array, cols: Float32Array | null) {
  if (!geo.boundingBox) geo.computeBoundingBox();
  return { lrPlant: !!like.isBatchedMesh, isMesh: true, isInstancedMesh: true, visible: true, children: [], geometry: geo, material: mat, count: mats.length / 16, instanceMatrix: { array: mats }, instanceColor: cols ? { array: cols } : null, matrixWorld: like.matrixWorld, renderOrder: like.renderOrder };
}
/** vegetation/instances.ts draws every plant as one BatchedMesh, switching each between its kind's full and far shape
 *  by distance. Here each kind becomes two instanced batches: the full shape within NEAR_PLANT, the far one beyond.
 *  (flushPlants adds the kinds' full shapes first, one per kind in order, then places each kind's plants in turn in
 *  its far shape: the n-th run of plants is the n-th kind, whose full shape is geometry n.) */
function unbatch(bm: Any): [Any, number][] {
  const n = bm.instanceCount;
  const M = new bm.matrixWorld.constructor(), C = new bm.material.color.constructor();
  const runs: { far: number; near: number; ids: number[] }[] = [];
  for (let id = 0; id < n; id++) {
    const g = bm.getGeometryIdAt(id);
    if (!runs.length || runs[runs.length - 1].far !== g) runs.push({ far: g, near: runs.length, ids: [] });
    runs[runs.length - 1].ids.push(id);
  }
  // (a kind without a far shape uses its full one for both: its run's geometry is its own index)
  const ok = runs.every((r) => r.far >= runs.length || r.far === r.near);
  if (!ok) console.log('[x] plants: unexpected batch layout, far shapes only');
  const near = lodIndex(0, NEAR_PLANT), far = lodIndex(NEAR_PLANT, Infinity);
  const out: [Any, number][] = [];
  for (const r of runs) {
    const mats = new Float32Array(r.ids.length * 16), cols = new Float32Array(r.ids.length * 3);
    r.ids.forEach((id, k) => { bm.getMatrixAt(id, M); mats.set(M.elements, k * 16); bm.getColorAt(id, C); cols[k * 3] = C.r; cols[k * 3 + 1] = C.g; cols[k * 3 + 2] = C.b; });
    if (!ok || r.far === r.near) { out.push([instancedLike(bm, subGeometry(bm, r.far), bm.material, mats, cols), 0]); continue; }
    out.push([instancedLike(bm, subGeometry(bm, r.near), bm.material, mats, cols), near]);
    out.push([instancedLike(bm, subGeometry(bm, r.far), bm.material, mats, cols), far]);
  }
  log('plants', n, 'kinds', runs.length);
  return out;
}
/** kenneycars.ts paints each car's body triangles per instance in its shader (iPaint, paintGain) over the kit's colour
 *  map. Here the paint is baked: per paint, the model's triangles take vertex colours, the map's texel for each, or the
 *  paint shaded by the texel's brightness on the body, exactly as the shader does; drawn with a plain material. */
let carMat: Any = null;
const paintGeos = new WeakMap<Any, Map<string, Any>>();
let carPx: { d: Uint8ClampedArray; w: number; h: number } | null = null;
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function unpaint(im: Any): Any[] {
  const mat = im.material, geo = im.geometry;
  carMat ??= new mat.constructor({ vertexColors: true, roughness: mat.roughness, metalness: mat.metalness, name: 'kenney-car' });
  if (!carPx) {
    const img = mat.map.image, cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const g = cv.getContext('2d', { willReadFrequently: true })!;
    g.drawImage(img, 0, 0);
    carPx = { d: g.getImageData(0, 0, cv.width, cv.height).data, w: cv.width, h: cv.height };
  }
  const px = carPx;
  const texel = (u: number, v: number) => {
    const x = Math.min(px.w - 1, Math.max(0, Math.floor(u * px.w))), y = Math.min(px.h - 1, Math.max(0, Math.floor(v * px.h))), i = (y * px.w + x) * 4;
    return [lin(px.d[i] / 255), lin(px.d[i + 1] / 255), lin(px.d[i + 2] / 255)];
  };
  const paint = geo.attributes.iPaint.array as Float32Array;
  const groups = new Map<string, number[]>();
  for (let i = 0; i < im.count; i++) { const k = `${paint[i * 3]},${paint[i * 3 + 1]},${paint[i * 3 + 2]}`; const l = groups.get(k) ?? []; l.push(i); groups.set(k, l); }
  const out: Any[] = [];
  for (const [key, ids] of groups) {
    let byPaint = paintGeos.get(geo.attributes.position);
    if (!byPaint) paintGeos.set(geo.attributes.position, (byPaint = new Map()));
    let g = byPaint.get(key);
    if (!g) {
      const [pr, pg, pb] = key.split(',').map(Number);
      const P = geo.attributes.position, N = geo.attributes.normal, UV = geo.attributes.uv, PG = geo.attributes.paintGain;
      const col = new Float32Array(P.count * 3);
      for (let t = 0; t < P.count / 3; t++) {
        const u = (UV.getX(t * 3) + UV.getX(t * 3 + 1) + UV.getX(t * 3 + 2)) / 3, v = (UV.getY(t * 3) + UV.getY(t * 3 + 1) + UV.getY(t * 3 + 2)) / 3;
        let c = texel(u, v);
        const gain = PG.getX(t * 3);
        if (gain > 0 && pr >= 0) { const s = Math.min(1.35, Math.max(0.55, (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) * gain)); c = [Math.min(1, pr * s), Math.min(1, pg * s), Math.min(1, pb * s)]; }
        for (let k = 0; k < 3; k++) col.set(c, (t * 3 + k) * 3);
      }
      g = new geo.constructor();
      g.setAttribute('position', P);
      g.setAttribute('normal', N);
      g.setAttribute('color', new P.constructor(col, 3));
      g.computeBoundingBox(); g.computeBoundingSphere();
      byPaint.set(key, g);
    }
    const mats = new Float32Array(ids.length * 16);
    ids.forEach((i, k) => mats.set(im.instanceMatrix.array.subarray(i * 16, i * 16 + 16), k * 16));
    out.push(instancedLike(im, g, carMat, mats, null));
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// the run
// ---------------------------------------------------------------------------------------------------------------
async function run() {
  const T0 = performance.now();
  // (the parked cars are the Car Kit's models: loaded first, so the campus build draws them at once)
  log('car models', await loadKenneyCars());
  log('building the original campus');
  const roots = [buildCampus(), buildLandmarks()];
  for (const r of roots) r.updateMatrixWorld(true);
  // (the faces lying on the ground, turned down, as the game drops them: memory.ts)
  log('built in', Math.round(performance.now() - T0), 'ms; hidden faces dropped', dropHiddenFaces(roots[0]));

  // every drawn mesh, its level-of-detail range and world bounds
  const recs: Rec[] = [];
  const v3 = (e: Any, x: number, y: number, z: number) => [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]];
  const visit = (o: Any, lod: number) => {
    if (!o.visible) return;
    // (the batched plants and the painted cars become plain instanced batches first: see unbatch, unpaint)
    if (o.isBatchedMesh) { for (const [im, l] of unbatch(o)) visit(im, l); return; }
    if (o.isInstancedMesh && o.geometry.attributes.iPaint) { for (const im of unpaint(o)) visit(im, lod); return; }
    if (o.isLOD) {
      o.levels.forEach((l: Any, i: number) => visit(l.object, lodIndex(l.distance, o.levels[i + 1]?.distance ?? Infinity)));
      return;
    }
    if (o.isMesh) {
      const g = o.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      const e = o.matrixWorld.elements, bb = g.boundingBox;
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      if (o.isInstancedMesh) {
        const a = o.instanceMatrix.array;
        const r = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
        for (let i = 0; i < o.count; i++) {
          const [x, , z] = v3(e, a[i * 16 + 12], a[i * 16 + 13], a[i * 16 + 14]);
          x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); z0 = Math.min(z0, z - r); z1 = Math.max(z1, z + r);
        }
      } else {
        for (const cx of [bb.min.x, bb.max.x]) for (const cy of [bb.min.y, bb.max.y]) for (const cz of [bb.min.z, bb.max.z]) {
          const [x, , z] = v3(e, cx, cy, cz);
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
        }
      }
      if (!BOX || (x1 > BOX[0] && x0 < BOX[1] && z1 > BOX[2] && z0 < BOX[3])) recs.push({ mesh: o, lod, x0, x1, z0, z1 });
    }
    if (o.type === 'LineSegments' || o.type === 'Line' || o.type === 'Points') return;
    for (const c of o.children) visit(c, lod);
  };
  for (const r of roots) visit(r, 0);
  log('meshes', recs.length);
  // (the vegetation's materials tagged for the game: 'crown' and 'plant' are kept off hard ground, 'tuft' is the grass
  // tufts the owner had removed, 2026-10-18; crowns.ts draws its crowns, trunks and tufts under an LOD named 'crowns')
  for (const r of recs) {
    const m = r.mesh;
    if (m.material?.name === 'kenney-car') continue;
    if (m.lrPlant) m.material.userData.lrTag = 'plant';
    else if (m.isInstancedMesh && m.parent?.parent?.name === 'crowns') m.material.userData.lrTag = m.material.side === 2 ? 'tuft' : 'crown';
  }
  if (q.get('only') === 'passages') { await exportPassages(); (window as Any).__stats = { ms: Math.round(performance.now() - T0) }; (window as Any).__done = true; return; }
  if (q.get('only') === 'landmark') { await exportLandmark(); (window as Any).__stats = { ms: Math.round(performance.now() - T0) }; (window as Any).__done = true; return; }

  // materials (day state), then their night state
  const mats = new Set<Any>();
  for (const r of recs) for (const m of Array.isArray(r.mesh.material) ? r.mesh.material : [r.mesh.material]) mats.add(m);
  for (const m of mats) await materialId(m);
  setNightLights(true);
  for (const [m, id] of matIds) materials[id].night = { ei: m.emissiveIntensity ?? 0, visible: m.visible, opacity: m.opacity };
  setNightLights(false);
  log('materials', materials.length, 'textures', textures.length, 'files', texByHash.size, 'bytes', texBytes);

  // geometry, a chunk at a time
  const b0 = mapBounds();
  const cx0 = Math.floor((BOX ? BOX[0] : b0.minX - 400) / (TILE * CHUNK)), cx1 = Math.floor((BOX ? BOX[1] : b0.maxX + 400) / (TILE * CHUNK));
  const cz0 = Math.floor((BOX ? BOX[2] : b0.minZ - 400) / (TILE * CHUNK)), cz1 = Math.floor((BOX ? BOX[3] : b0.maxZ + 400) / (TILE * CHUNK));
  const tileIndex: Any[] = [];
  const pa = new Float32Array(3), pb = new Float32Array(3), pc = new Float32Array(3);
  for (let ci = cx0; ci <= cx1; ci++) for (let cj = cz0; cj <= cz1; cj++) {
    const X0 = ci * TILE * CHUNK, X1 = X0 + TILE * CHUNK, Z0 = cj * TILE * CHUNK, Z1 = Z0 + TILE * CHUNK;
    const buckets = new Map<string, Bucket>();
    const inChunk = (x: number, z: number) => x >= X0 && x < X1 && z >= Z0 && z < Z1;
    for (const r of recs) {
      if (r.x1 < X0 || r.x0 >= X1 || r.z1 < Z0 || r.z0 >= Z1) continue;
      const o = r.mesh, g = o.geometry, e = o.matrixWorld.elements;
      const ro = o.renderOrder | 0;
      if (o.isInstancedMesh) {
        const mat = o.material, mid = matIds.get(mat)!;
        const a = o.instanceMatrix.array, ic = o.instanceColor?.array;
        for (let i = 0; i < o.count; i++) {
          // world matrix = matrixWorld * instanceMatrix_i (column-major)
          const m = new Float32Array(16);
          for (let col = 0; col < 4; col++) for (let row = 0; row < 4; row++) {
            let s = 0;
            for (let k = 0; k < 4; k++) s += e[k * 4 + row] * a[i * 16 + col * 4 + k];
            m[col * 4 + row] = s;
          }
          if (!inChunk(m[12], m[14])) continue;
          const tk = tileKey(m[12], m[14]);
          const key = `${tk}|i|${g.uuid}|${mid}|${r.lod}|${ro}`;
          let bk = buckets.get(key) as Inst | undefined;
          if (!bk) buckets.set(key, (bk = { kind: 'inst', tile: tk, mat: mid, lod: r.lod, ro, geo: g, m: new F32(), cl: new F32(), hasColor: !!ic }));
          for (let k = 0; k < 16; k++) bk.m.push(m[k]);
          if (ic) bk.cl.push3(ic[i * 3], ic[i * 3 + 1], ic[i * 3 + 2]);
        }
        continue;
      }
      const P = g.attributes.position, N = g.attributes.normal, UV = g.attributes.uv, UV1 = g.attributes.uv1, C = g.attributes.color;
      const nm = normalMatrix(e);
      const index = g.index;
      const start = g.drawRange.start, count = Math.min(g.drawRange.count, index ? index.count : P.count);
      const ranges: { s: number; c: number; m: Any }[] = [];
      if (Array.isArray(o.material)) for (const gr of g.groups) { const s = Math.max(start, gr.start), en = Math.min(start + count, gr.start + gr.count); if (en > s && o.material[gr.materialIndex]) ranges.push({ s, c: en - s, m: o.material[gr.materialIndex] }); }
      else ranges.push({ s: start, c: count, m: o.material });
      for (const rg of ranges) {
        const mat = rg.m, mid = matIds.get(mat)!;
        const needUV = !!(mat.map || mat.alphaMap || (mat.emissiveMap && (mat.emissiveMap.channel ?? 0) === 0)) && !!UV;
        const needUV1 = !!(mat.emissiveMap && mat.emissiveMap.channel === 1) && !!UV1;
        const hasN = !!N && mat.type !== 'MeshBasicMaterial';
        const hasC = !!mat.vertexColors && !!C;
        // (the soil's coverage, a float attribute, rides in the colour's alpha: soilground.ts)
        const SOIL = g.attributes.soil;
        for (let t = rg.s; t + 2 < rg.s + rg.c; t += 3) {
          const i0 = index ? index.getX(t) : t, i1 = index ? index.getX(t + 1) : t + 1, i2 = index ? index.getX(t + 2) : t + 2;
          for (const [v, out] of [[i0, pa], [i1, pb], [i2, pc]] as [number, Float32Array][]) {
            const x = P.getX(v), y = P.getY(v), z = P.getZ(v);
            out[0] = e[0] * x + e[4] * y + e[8] * z + e[12]; out[1] = e[1] * x + e[5] * y + e[9] * z + e[13]; out[2] = e[2] * x + e[6] * y + e[10] * z + e[14];
          }
          const mx = (pa[0] + pb[0] + pc[0]) / 3, mz = (pa[2] + pb[2] + pc[2]) / 3;
          if (!inChunk(mx, mz)) continue;
          const tk = tileKey(mx, mz);
          const key = `${tk}|s|${mid}|${r.lod}|${ro}|${+hasN}${+needUV}${+needUV1}${+hasC}`;
          let bk = buckets.get(key) as Soup | undefined;
          if (!bk) buckets.set(key, (bk = { kind: 'soup', tile: tk, mat: mid, lod: r.lod, ro, n: hasN, uv: needUV, uv1: needUV1, c: hasC, p: new F32(), nr: new F32(), t: new F32(), t1: new F32(), cl: new F32() }));
          const pts = [pa, pb, pc];
          [i0, i1, i2].forEach((v, k) => {
            bk!.p.push3(pts[k][0], pts[k][1], pts[k][2]);
            if (hasN) { const x = N.getX(v), y = N.getY(v), z = N.getZ(v); bk!.nr.push3(nm[0] * x + nm[3] * y + nm[6] * z, nm[1] * x + nm[4] * y + nm[7] * z, nm[2] * x + nm[5] * y + nm[8] * z); }
            if (needUV) bk!.t.push2(UV.getX(v), UV.getY(v));
            if (needUV1) bk!.t1.push2(UV1.getX(v), UV1.getY(v));
            if (hasC) { bk!.cl.push3(C.getX(v), C.getY(v), C.getZ(v)); bk!.cl.push(SOIL ? SOIL.getX(v) : C.itemSize > 3 ? C.getW(v) : 1); }
          });
        }
      }
    }
    // finish this chunk's tiles
    const byTile = new Map<string, Bucket[]>();
    for (const b of buckets.values()) { const l = byTile.get(b.tile) ?? []; l.push(b); byTile.set(b.tile, l); }
    const matList = [...matIds.keys()];
    for (const [tk, list] of byTile) {
      const parts = list.map((b) => (b.kind === 'soup' ? finishSoup(b) : finishInst(b, matList[b.mat])));
      let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
      for (const p of parts) { const [a, b, c, sx, sy, sz] = p.head.box; x0 = Math.min(x0, a); y0 = Math.min(y0, b); z0 = Math.min(z0, c); x1 = Math.max(x1, a + sx); y1 = Math.max(y1, b + sy); z1 = Math.max(z1, c + sz); }
      const size = await writeTile(tk, parts);
      const [i, j] = tk.split('_').map(Number);
      tileIndex.push({ i, j, bytes: size, batches: parts.length, tris: parts.reduce((s, p) => s + (p.head.k === 's' ? p.head.i / 3 : (p.head.g.i / 3) * p.head.n), 0), box: [x0, y0, z0, x1, y1, z1] });
    }
    buckets.clear();
    log(`chunk ${ci},${cj}: tiles ${byTile.size}; total tiles ${stats.tiles}, ${Math.round(stats.bytes / 1e6)} MB, verts ${stats.soupIn} -> ${stats.soupOut}, instances ${stats.inst}`);
    await yieldNow();
  }

  const manifest = { version: 1, tile: TILE, snippets, lods: LODS.map(([a, b]) => [a, b === Infinity ? 1e9 : b]), tiles: tileIndex, materials, textures, built: new Date().toISOString(), source: 'legonrush-world (Three.js) campus, converted by tools/export' };
  await put('manifest.json', JSON.stringify(manifest));
  log('geometry done', JSON.stringify(stats));

  if (!SKIP.has('data')) await exportData(recs);
  (window as Any).__stats = { ...stats, materials: materials.length, textures: textures.length, texFiles: texByHash.size, texBytes, ms: Math.round(performance.now() - T0) };
  (window as Any).__done = true;
}

// ---------------------------------------------------------------------------------------------------------------
// gameplay data: the bike-height collision raster, round solids, passages, earth tracks
// ---------------------------------------------------------------------------------------------------------------
async function exportData(recs: Rec[]) {
  // (meshcollide.ts: 42 m tiles of 0.35 m cells; queried at each cell centre with no pad, exactly the original's raster)
  const CT = 42, CELL = 0.35, N = Math.round(CT / CELL);
  const want = new Set<string>();
  for (const r of recs) {
    for (let i = Math.floor(r.x0 / CT); i <= Math.floor(r.x1 / CT); i++) for (let j = Math.floor(r.z0 / CT); j <= Math.floor(r.z1 / CT); j++) want.add(`${i},${j}`);
  }
  log('collision tiles to scan', want.size);
  const out: number[] = [];
  const bits: Uint8Array[] = [];
  let t = performance.now(), n = 0;
  for (const k of want) {
    const [i, j] = k.split(',').map(Number);
    const b = new Uint8Array(Math.ceil((N * N) / 8));
    let any = false;
    for (let cj = 0; cj < N; cj++) for (let ci = 0; ci < N; ci++) {
      if (meshBlocked(i * CT + (ci + 0.5) * CELL, j * CT + (cj + 0.5) * CELL, 0)) { const c = cj * N + ci; b[c >> 3] |= 1 << (c & 7); any = true; }
    }
    if (any) { out.push(i, j); bits.push(b); }
    if (++n % 200 === 0) { log('collision', n, '/', want.size); }
    if (performance.now() - t > 200) { await yieldNow(); t = performance.now(); }
  }
  const head = new Int32Array([CT * 1000, Math.round(CELL * 1000), N, bits.length, ...out]);
  const body = new Uint8Array(head.byteLength + bits.reduce((s, b) => s + b.length, 0));
  body.set(new Uint8Array(head.buffer));
  let o = head.byteLength;
  for (const b of bits) { body.set(b, o); o += b.length; }
  log('collision bytes', await put('collision.lrz', body, true));

  // round solids and passages
  const sol: number[] = [];
  for (const list of (SOLIDS as Any).cells.values()) for (const [x, z, r] of list) sol.push(x, z, r);
  log('solids', sol.length / 3, 'bytes', await put('solids.lrz', new Float32Array(sol), true));
  await exportPassages();

  // the earth tracks (rougher, slower free riding), 1 m cells in 64 m tiles where any
  const b0 = mapBounds(), ET = 64;
  const eOut: number[] = [], eBits: Uint8Array[] = [];
  for (let i = Math.floor((b0.minX - 100) / ET); i <= Math.floor((b0.maxX + 100) / ET); i++) {
    for (let j = Math.floor((b0.minZ - 100) / ET); j <= Math.floor((b0.maxZ + 100) / ET); j++) {
      const b = new Uint8Array((ET * ET) / 8);
      let any = false;
      for (let cj = 0; cj < ET; cj++) for (let ci = 0; ci < ET; ci++) if (onEarth(i * ET + ci + 0.5, j * ET + cj + 0.5)) { const c = cj * ET + ci; b[c >> 3] |= 1 << (c & 7); any = true; }
      if (any) { eOut.push(i, j); eBits.push(b); }
    }
    await yieldNow();
  }
  const eh = new Int32Array([ET, eBits.length, ...eOut]);
  const eb = new Uint8Array(eh.byteLength + eBits.length * (ET * ET) / 8);
  eb.set(new Uint8Array(eh.buffer));
  eBits.forEach((b, k) => eb.set(b, eh.byteLength + k * b.length));
  log('earth tiles', eBits.length, 'bytes', await put('earth.lrz', eb, true));
  await exportLandmark();
}

/** the open passages through buildings: square ones (solids.ts PASSAGES) and those along a line at any angle (the
 *  halls' gateways, OPASSAGES) */
async function exportPassages() {
  await put('passages.json', JSON.stringify(PASSAGES));
  log('angled passages', OPASSAGES.length, 'bytes', await put('opassages.json', JSON.stringify(OPASSAGES)));
}

/** the landmark models' keep-outs (Campus Life keeps its guests and props off them): 0.5 m cells in 64 m tiles, only
 *  where a coarse pass (4 m, padded) finds any */
async function exportLandmark() {
  const b0 = mapBounds(), LT = 64, LC = 0.5, LN = LT / LC;
  const out: number[] = [], bits: Uint8Array[] = [];
  for (let i = Math.floor((b0.minX - 100) / LT); i <= Math.floor((b0.maxX + 100) / LT); i++) {
    for (let j = Math.floor((b0.minZ - 100) / LT); j <= Math.floor((b0.maxZ + 100) / LT); j++) {
      let hit = false;
      for (let a = 2; a < LT && !hit; a += 4) for (let c = 2; c < LT && !hit; c += 4) hit = inLandmark(i * LT + a, j * LT + c, 3);
      if (!hit) continue;
      const b = new Uint8Array((LN * LN) / 8);
      let any = false;
      for (let cj = 0; cj < LN; cj++) for (let ci = 0; ci < LN; ci++) if (inLandmark(i * LT + (ci + 0.5) * LC, j * LT + (cj + 0.5) * LC, 0)) { const k = cj * LN + ci; b[k >> 3] |= 1 << (k & 7); any = true; }
      if (any) { out.push(i, j); bits.push(b); }
    }
    await yieldNow();
  }
  const h = new Int32Array([LT, Math.round(LC * 1000), bits.length, ...out]);
  const body = new Uint8Array(h.byteLength + bits.length * (LN * LN) / 8);
  body.set(new Uint8Array(h.buffer));
  bits.forEach((b, k) => body.set(b, h.byteLength + k * b.length));
  log('landmark tiles', bits.length, 'bytes', await put('landmark.lrz', body, true));
}

run().catch((e) => { console.error('[x] FAILED', e?.stack ?? e); (window as Any).__stats = { error: String(e?.stack ?? e) }; (window as Any).__done = true; });
