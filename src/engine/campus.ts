// The campus, streamed: the tiles the converter wrote (tools/export) are loaded round the camera, nearest first, and
// dropped again far behind it. Each tile is a handful of batches (one per material) built straight into PlayCanvas
// meshes: quantised positions (the batch entity's transform scales them back), int8 normals, float UVs, uint8
// colours; instanced batches (crowns of trees and scrub) use hardware instancing, split by instance colour.
// Materials are made once from the converted records: colours, maps, transparency, depth bias (the original's
// polygon offsets: ground layers drawn over one another), and the original's shader tweaks translated into
// PlayCanvas's albedo chunk. Day and night states (lit windows, lamp glows) switch with setNight().
import * as pc from 'playcanvas';
import type { Engine } from './app';
import { fetchz } from './fetchz';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Rec = any;
export interface TileInfo { i: number; j: number; bytes: number; batches: number; tris: number; box: number[] }
interface Manifest { tile: number; lods: [number, number][]; tiles: TileInfo[]; materials: Rec[]; textures: Rec[]; snippets: string[] }

const srgb = (c: number[] | null | undefined, k = 1): pc.Color => {
  if (!c) return new pc.Color(0, 0, 0);
  const f = (v: number) => { v = Math.max(0, v * k); return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; };
  return new pc.Color(f(c[0]), f(c[1]), f(c[2]));
};

interface LoadedTile { key: string; info: TileInfo; root: pc.Entity; lodNodes: { e: pc.Entity; lod: number; cx: number; cz: number }[]; tris: number }

export class Campus {
  readonly ready: Promise<void>;
  /** called with 0..1 while the first tiles round the start load */
  onProgress?: (p: number) => void;
  manifest!: Manifest;
  private tiles = new Map<string, TileInfo>();
  private loaded = new Map<string, LoadedTile>();
  private loading = new Set<string>();
  private queue: string[] = [];
  private mats: (pc.StandardMaterial | null)[] = [];
  private tinted = new Map<string, pc.StandardMaterial>();
  private textures: (pc.Texture | null)[] = [];
  private texFiles = new Map<number, Promise<HTMLImageElement | ImageBitmap>>();
  private grey!: pc.Texture;
  private night = false;
  private lamps = 0;
  private root = new pc.Entity('campus');
  /** load radius (m): beyond the fog's end the campus is not drawn anyway */
  radius = 420;
  /** tiles further than this are dropped */
  dropRadius = 620;
  private centre = { x: 0, z: 0 };
  stats = { tiles: 0, tris: 0, bytes: 0, loads: 0 };

  constructor(private engine: Engine, private base = `${import.meta.env.BASE_URL}campus/`) {
    engine.world.addChild(this.root);
    this.ready = this.init();
  }

  private async init() {
    const r = await fetch(`${this.base}manifest.json`);
    this.manifest = await r.json();
    for (const t of this.manifest.tiles) this.tiles.set(`${t.i}_${t.j}`, t);
    this.mats = new Array(this.manifest.materials.length).fill(null);
    this.textures = new Array(this.manifest.textures.length).fill(null);
    const g = new pc.Texture(this.engine.device, { width: 1, height: 1, format: pc.PIXELFORMAT_RGBA8, mipmaps: false });
    const px = g.lock(); px.set([128, 128, 128, 255]); g.unlock();
    this.grey = g;
  }

  // ------------------------------------------------------------------------------------------------- textures
  private image(file: number) {
    let p = this.texFiles.get(file);
    if (!p) {
      p = new Promise((res, rej) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => res(img);
        img.onerror = () => rej(new Error(`texture ${file}`));
        img.src = `${this.base}tex/${file}.webp`;
      });
      this.texFiles.set(file, p);
    }
    return p;
  }
  private texture(id: number): pc.Texture {
    const have = this.textures[id];
    if (have) return have;
    const t = this.manifest.textures[id];
    const addr = (w: string) => (w === 'repeat' ? pc.ADDRESS_REPEAT : w === 'mirror' ? pc.ADDRESS_MIRRORED_REPEAT : pc.ADDRESS_CLAMP_TO_EDGE);
    const tex = new pc.Texture(this.engine.device, {
      name: `tex${t.file}`, width: t.w, height: t.h, format: t.srgb ? pc.PIXELFORMAT_SRGBA8 : pc.PIXELFORMAT_RGBA8,
      mipmaps: !t.nearest, minFilter: t.nearest ? pc.FILTER_NEAREST : pc.FILTER_LINEAR_MIPMAP_LINEAR, magFilter: t.nearest ? pc.FILTER_NEAREST : pc.FILTER_LINEAR,
      addressU: addr(t.wrapS), addressV: addr(t.wrapT), anisotropy: Math.min(8, Math.max(1, t.anisotropy)), flipY: t.flipY,
    });
    this.textures[id] = tex;
    this.image(t.file).then((img) => tex.setSource(img as HTMLImageElement)).catch((e) => console.warn(e));
    return tex;
  }

  // ------------------------------------------------------------------------------------------------- materials
  material(id: number): pc.StandardMaterial {
    const have = this.mats[id];
    if (have) return have;
    const r = this.manifest.materials[id];
    const m = new pc.StandardMaterial();
    m.name = `m${id}${r.name ? ':' + r.name : ''}`;
    const basic = r.type === 'MeshBasicMaterial';
    const map = r.map != null ? this.texture(r.map) : null;
    const tr = r.map != null ? this.manifest.textures[r.map] : null;
    const setTransform = (pre: 'diffuse' | 'emissive' | 'opacity', t: Rec) => {
      if (!t) return;
      (m as any)[`${pre}MapTiling`] = new pc.Vec2(t.repeat[0], t.repeat[1]);
      (m as any)[`${pre}MapOffset`] = new pc.Vec2(t.offset[0], t.offset[1]);
      if (t.rotation) (m as any)[`${pre}MapRotation`] = (-t.rotation * 180) / Math.PI;
    };
    if (basic) {
      // three's unlit material: the colour (times its map and vertex colours) as it is
      m.useLighting = false;
      m.useSkybox = false;
      m.useMetalness = false;
      m.specular = new pc.Color(0, 0, 0);
      m.diffuse = new pc.Color(0, 0, 0);
      m.emissive = srgb(r.color);
      m.emissiveIntensity = 1;
      // (a black colour times its picture is black: the picture is left off, as PlayCanvas would draw nothing of it)
      const black = m.emissive.r + m.emissive.g + m.emissive.b === 0;
      if (map && !black) { m.emissiveMap = map; setTransform('emissive', tr); }
      if (r.vc) { m.emissiveVertexColor = true; m.emissiveVertexColorChannel = 'rgb'; }
    } else {
      m.diffuse = srgb(r.color);
      if (map) { m.diffuseMap = map; setTransform('diffuse', tr); }
      if (r.vc) { m.diffuseVertexColor = true; m.diffuseVertexColorChannel = 'rgb'; }
      m.useMetalness = true;
      m.metalness = r.metal ?? 0;
      m.gloss = 1 - (r.rough ?? 1);
      m.emissive = srgb(r.emissive);
      m.emissiveIntensity = r.ei ?? 0;
      if (r.emissiveMap != null) {
        m.emissiveMap = this.texture(r.emissiveMap);
        const et = this.manifest.textures[r.emissiveMap];
        m.emissiveMapUv = et.channel === 1 ? 1 : 0;
        setTransform('emissive', et);
      }
    }
    // transparency: the map's alpha (and an alpha map) as opacity
    const mapAlpha = tr?.alpha;
    if (r.transparent || r.alphaTest > 0) {
      m.opacity = r.opacity ?? 1;
      if (r.alphaMap != null) { m.opacityMap = this.texture(r.alphaMap); m.opacityMapChannel = 'g'; setTransform('opacity', this.manifest.textures[r.alphaMap]); }
      else if (map && mapAlpha) { m.opacityMap = map; m.opacityMapChannel = 'a'; setTransform('opacity', tr); }
      if (r.vc && r.transparent) m.opacityVertexColor = false;
      if (r.transparent) m.blendType = r.blending === 2 ? pc.BLEND_ADDITIVE : pc.BLEND_NORMAL;
      if (r.alphaTest > 0) m.alphaTest = r.alphaTest;
    }
    m.cull = r.side === 2 ? pc.CULLFACE_NONE : r.side === 1 ? pc.CULLFACE_FRONT : pc.CULLFACE_BACK;
    m.depthWrite = r.depthWrite !== false;
    m.depthTest = r.depthTest !== false;
    // three's polygonOffset(factor, units) is GL's polygonOffset(factor, units): PlayCanvas's slope and constant bias
    if (r.po) { m.slopeDepthBias = r.po[0]; m.depthBias = r.po[1]; }
    m.useFog = r.fog !== false;
    if (r.toneMapped === false) m.useTonemap = false;
    if (r.shade && r.shade.snippet != null && !basic) this.addSnippet(m, r.shade);
    m.update();
    this.mats[id] = m;
    this.applyState(id, m);
    return m;
  }

  /** the original's onBeforeCompile tweak, translated by the converter, appended to the albedo chunk */
  private addSnippet(m: pc.StandardMaterial, shade: Rec) {
    const code: string = this.manifest.snippets[shade.snippet];
    const decl: string[] = [];
    for (const [name, u] of Object.entries(shade.uniforms ?? {}) as [string, Rec][]) {
      if (u.tex != null) { decl.push(`uniform sampler2D ${name};`); m.setParameter(name, this.texture(u.tex)); }
      else if (u.f != null) { decl.push(`uniform float ${name};`); m.setParameter(name, u.f); }
      else if (u.v) { decl.push(`uniform vec${u.v.length} ${name};`); m.setParameter(name, u.v); }
    }
    const base = pc.ShaderChunks.get(this.engine.device, pc.SHADERLANGUAGE_GLSL).get('diffusePS') as string;
    const end = base.lastIndexOf('}');
    const chunk = `${decl.join('\n')}\n${base.slice(0, end)}\n{\n${code}\n}\n${base.slice(end)}`;
    m.getShaderChunks(pc.SHADERLANGUAGE_GLSL).set('diffusePS', chunk);
    m.shaderChunksVersion = '2.8';
  }

  private applyState(id: number, m: pc.StandardMaterial) {
    const r = this.manifest.materials[id];
    const s = this.night && r.night ? r.night : { ei: r.ei, visible: r.visible, opacity: r.opacity };
    if (r.tag === 'lampHead') m.emissiveIntensity = this.lamps * 2.5;
    else if (r.tag === 'lampPool') { m.opacity = this.lamps * 0.45; m.update(); this.setVisible(id, this.lamps > 0); return; }
    else if (r.type !== 'MeshBasicMaterial') m.emissiveIntensity = s.ei ?? 0;
    if (r.transparent && s.opacity != null) m.opacity = s.opacity;
    m.update();
    this.setVisible(id, s.visible !== false);
  }
  private hidden = new Set<number>();
  private setVisible(id: number, on: boolean) {
    if (on) this.hidden.delete(id); else this.hidden.add(id);
    for (const t of this.loaded.values()) t.root.forEach((e) => { const mi = (e as pc.Entity).render?.meshInstances?.[0] as any; if (mi && mi._matId === id) mi.visible = on; });
  }

  /** night lights (windows lit, glows on) and the street lamps' level (0..1, the original's SKIES lamps) */
  setNight(on: boolean, lamps: number) {
    this.night = on;
    this.lamps = lamps;
    this.mats.forEach((m, id) => { if (m) this.applyState(id, m); });
  }

  // ------------------------------------------------------------------------------------------------- streaming
  /** call every frame with the camera's position: loads what is near, drops what is far, switches levels of detail */
  update(x: number, z: number) {
    if (!this.manifest) return;
    this.centre = { x, z };
    const T = this.manifest.tile, R = this.radius;
    const i0 = Math.floor((x - R) / T), i1 = Math.floor((x + R) / T), j0 = Math.floor((z - R) / T), j1 = Math.floor((z + R) / T);
    const want: [number, string][] = [];
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const k = `${i}_${j}`;
      if (!this.tiles.has(k) || this.loaded.has(k) || this.loading.has(k)) continue;
      const d = Math.hypot((i + 0.5) * T - x, (j + 0.5) * T - z);
      if (d < R + T * 0.7) want.push([d, k]);
    }
    want.sort((a, b) => a[0] - b[0]);
    this.queue = want.map(([, k]) => k);
    while (this.loading.size < 4 && this.queue.length) this.load(this.queue.shift()!);
    for (const [k, t] of this.loaded) {
      const d = Math.hypot((t.info.i + 0.5) * T - x, (t.info.j + 0.5) * T - z);
      if (d > this.dropRadius) this.drop(k);
    }
    // levels of detail (the original's crown LODs: near crowns and trunks, single blobs further out)
    const lods = this.manifest.lods;
    for (const t of this.loaded.values()) for (const n of t.lodNodes) {
      const d = Math.hypot(n.cx - x, n.cz - z), [a, b] = lods[n.lod];
      n.e.enabled = d >= a && d < b;
    }
  }

  /** loads every tile within r of (x, z) and resolves when they are in */
  async preload(x: number, z: number, r = 260) {
    await this.ready;
    const T = this.manifest.tile, keys: string[] = [];
    for (const t of this.manifest.tiles) if (Math.hypot((t.i + 0.5) * T - x, (t.j + 0.5) * T - z) < r + T * 0.7) keys.push(`${t.i}_${t.j}`);
    let done = 0;
    await Promise.all(keys.map(async (k) => { await this.load(k); this.onProgress?.(++done / keys.length); }));
  }

  private loadPromises = new Map<string, Promise<void>>();
  private load(key: string): Promise<void> {
    if (this.loaded.has(key)) return Promise.resolve();
    const have = this.loadPromises.get(key);
    if (have) return have;
    this.loading.add(key);
    const p = (async () => {
      try {
        const buf = await fetchz(`${this.base}tiles/${key}.lrz`);
        this.stats.bytes += this.tiles.get(key)?.bytes ?? 0;
        this.build(key, buf);
      } catch (e) {
        console.warn('LEGONRUSH: tile', key, e);
      } finally {
        this.loading.delete(key);
        this.loadPromises.delete(key);
      }
    })();
    this.loadPromises.set(key, p);
    return p;
  }

  private drop(key: string) {
    const t = this.loaded.get(key);
    if (!t) return;
    this.loaded.delete(key);
    t.root.forEach((e) => { const ent = e as pc.Entity; ent.render?.meshInstances?.forEach((mi) => { mi.mesh?.destroy?.(); (mi as any).instancingData?.vertexBuffer?.destroy?.(); }); });
    t.root.destroy();
    this.stats.tiles--; this.stats.tris -= t.tris;
  }

  private build(key: string, buf: ArrayBuffer) {
    const dv = new DataView(buf);
    const jl = dv.getUint32(0, true);
    const heads: Rec[] = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, jl)));
    const base = (4 + jl + 3) & ~3;
    const dev = this.engine.device;
    const info = this.tiles.get(key)!;
    const root = new pc.Entity(`tile ${key}`);
    const lodNodes: LoadedTile['lodNodes'] = [];
    let tris = 0;
    for (const h of heads) {
      let o = 0;
      const next = <T extends ArrayBufferView>(C: { new (b: ArrayBuffer, o: number, n: number): T; BYTES_PER_ELEMENT: number }, n: number) => { const v = new C(buf, base + h.o[o++], n); return v; };
      const mat = this.material(h.m);
      if (h.k === 's') {
        const V = h.v;
        const pos = next(Uint16Array, V * 4);
        // the stored normals are world normals; the batch's non-uniform scale would bend them, so they are pre-scaled
        const nrm = this.manifest.materials[h.m].type !== 'MeshBasicMaterial' && h.o.length > 1 && this.hasNormals(h) ? next(Int8Array, V * 4) : null;
        const [, , , sx, sy, sz] = h.box;
        if (nrm) for (let v = 0; v < V; v++) {
          const a = nrm[v * 4] * sx, b = nrm[v * 4 + 1] * sy, c = nrm[v * 4 + 2] * sz, l = Math.hypot(a, b, c) || 1;
          nrm[v * 4] = Math.round((a / l) * 127); nrm[v * 4 + 1] = Math.round((b / l) * 127); nrm[v * 4 + 2] = Math.round((c / l) * 127);
        }
        const r = this.manifest.materials[h.m];
        const hasUV = this.flags(h).uv, hasUV1 = this.flags(h).uv1, hasC = this.flags(h).c;
        const uv = hasUV ? next(Float32Array, V * 2) : null;
        const uv1 = hasUV1 ? next(Float32Array, V * 2) : null;
        const col = hasC ? next(Uint8Array, V * 4) : null;
        const idx = h.i32 ? next(Uint32Array, h.i) : next(Uint16Array, h.i);
        const mesh = new pc.Mesh(dev);
        mesh.setVertexStream(pc.SEMANTIC_POSITION, pos, 4, V, pc.TYPE_UINT16, true);
        if (nrm) mesh.setVertexStream(pc.SEMANTIC_NORMAL, nrm, 4, V, pc.TYPE_INT8, true);
        if (uv) mesh.setVertexStream(pc.SEMANTIC_TEXCOORD0, uv, 2, V, pc.TYPE_FLOAT32, false);
        if (uv1) mesh.setVertexStream(pc.SEMANTIC_TEXCOORD1, uv1, 2, V, pc.TYPE_FLOAT32, false);
        if (col) mesh.setVertexStream(pc.SEMANTIC_COLOR, col, 4, V, pc.TYPE_UINT8, true);
        mesh.setIndices(idx);
        mesh.update(pc.PRIMITIVE_TRIANGLES, false);
        mesh.aabb = new pc.BoundingBox(new pc.Vec3(0.5, 0.5, 0.5), new pc.Vec3(0.5, 0.5, 0.5));
        const e = new pc.Entity();
        const [x0, y0, z0] = h.box;
        e.setLocalPosition(x0, y0, z0);
        e.setLocalScale(sx, sy, sz);
        const mi = new pc.MeshInstance(mesh, mat);
        (mi as any)._matId = h.m;
        mi.visible = !this.hidden.has(h.m);
        if (h.ro) mi.drawOrder = h.ro;
        e.addComponent('render', { meshInstances: [mi], castShadows: !r.transparent && r.type !== 'MeshBasicMaterial', receiveShadows: true });
        root.addChild(e);
        tris += h.i / 3;
        if (h.l) lodNodes.push({ e, lod: h.l, cx: x0 + sx / 2, cz: z0 + sz / 2 });
      } else {
        const g = h.g, V = g.v;
        const pos = next(Float32Array, V * 3);
        const nrm = g.n ? next(Int8Array, V * 4) : null;
        const col = g.c ? next(Uint8Array, V * 4) : null;
        const uv = g.uv ? next(Float32Array, V * 2) : null;
        const idx = g.i32 ? next(Uint32Array, g.i) : next(Uint16Array, g.i);
        const mats = next(Float32Array, h.n * 16);
        const icol = next(Uint8Array, h.n * 4);
        // instances grouped by colour (each group a tinted copy of the material): PlayCanvas's instancing carries the
        // matrices only
        const groups = new Map<string, number[]>();
        for (let i = 0; i < h.n; i++) {
          const k = `${icol[i * 4] >> 3},${icol[i * 4 + 1] >> 3},${icol[i * 4 + 2] >> 3}`;
          let l = groups.get(k); if (!l) groups.set(k, (l = [])); l.push(i);
        }
        const mesh = new pc.Mesh(dev);
        mesh.setVertexStream(pc.SEMANTIC_POSITION, pos, 3, V, pc.TYPE_FLOAT32, false);
        if (nrm) mesh.setVertexStream(pc.SEMANTIC_NORMAL, nrm, 4, V, pc.TYPE_INT8, true);
        if (col) mesh.setVertexStream(pc.SEMANTIC_COLOR, col, 4, V, pc.TYPE_UINT8, true);
        if (uv) mesh.setVertexStream(pc.SEMANTIC_TEXCOORD0, uv, 2, V, pc.TYPE_FLOAT32, false);
        mesh.setIndices(idx);
        mesh.update(pc.PRIMITIVE_TRIANGLES, false);
        const [bx, by, bz, bsx, bsy, bsz] = h.box;
        mesh.aabb = new pc.BoundingBox(new pc.Vec3(bx + bsx / 2, by + bsy / 2, bz + bsz / 2), new pc.Vec3(bsx / 2, bsy / 2, bsz / 2));
        const fmt = pc.VertexFormat.getDefaultInstancingFormat(dev);
        for (const list of groups.values()) {
          const i0 = list[0];
          const tint = [icol[i0 * 4] / 255, icol[i0 * 4 + 1] / 255, icol[i0 * 4 + 2] / 255];
          const data = new Float32Array(list.length * 16);
          list.forEach((i, k) => data.set(mats.subarray(i * 16, i * 16 + 16), k * 16));
          const vb = new pc.VertexBuffer(dev, fmt, list.length, { data });
          const mi = new pc.MeshInstance(mesh, this.tint(h.m, tint));
          (mi as any)._matId = h.m;
          mi.setInstancing(vb, true);
          const e = new pc.Entity();
          e.addComponent('render', { meshInstances: [mi], castShadows: true, receiveShadows: true });
          root.addChild(e);
          if (h.l) lodNodes.push({ e, lod: h.l, cx: bx + bsx / 2, cz: bz + bsz / 2 });
        }
        tris += (g.i / 3) * h.n;
      }
    }
    this.root.addChild(root);
    this.loaded.set(key, { key, info, root, lodNodes, tris });
    this.stats.tiles++; this.stats.tris += tris; this.stats.loads++;
    // set the levels of detail for where the camera is now
    const lods = this.manifest.lods;
    for (const n of lodNodes) { const d = Math.hypot(n.cx - this.centre.x, n.cz - this.centre.z), [a, b] = lods[n.lod]; n.e.enabled = d >= a && d < b; }
  }

  /** the material with its diffuse colour multiplied by an instance colour (the original's instanceColor) */
  private tint(id: number, c: number[]) {
    const key = `${id}|${c.map((v) => v.toFixed(2)).join(',')}`;
    let m = this.tinted.get(key);
    if (!m) {
      const src = this.material(id), r = this.manifest.materials[id];
      m = src.clone() as pc.StandardMaterial;
      const col = r.color ?? [1, 1, 1];
      m.diffuse = srgb([col[0] * c[0], col[1] * c[1], col[2] * c[2]]);
      m.update();
      this.tinted.set(key, m);
    }
    return m;
  }

  // the converter writes each soup batch's buffers in a fixed order; which ones are present follows from the material
  // and is recorded in the bucket key; the head's offsets count tells which optional streams are there
  private flagCache = new WeakMap<Rec, { uv: boolean; uv1: boolean; c: boolean }>();
  private flags(h: Rec) {
    let f = this.flagCache.get(h);
    if (f) return f;
    // buffers: pos, [nrm], [uv], [uv1], [col], idx
    const r = this.manifest.materials[h.m];
    const n = h.o.length;
    const hasN = this.hasNormals(h);
    const opt = n - 2 - (hasN ? 1 : 0);
    const wantUV = (r.map != null || r.alphaMap != null || (r.emissiveMap != null && this.manifest.textures[r.emissiveMap].channel === 0));
    const wantUV1 = r.emissiveMap != null && this.manifest.textures[r.emissiveMap].channel === 1;
    const wantC = !!r.vc;
    // the exporter only wrote a stream when the geometry had it: resolve by count, in order uv, uv1, c
    const cand = [wantUV, wantUV1, wantC];
    let left = opt;
    const got = cand.map((w) => { if (w && left > 0) { left--; return true; } return false; });
    f = { uv: got[0], uv1: got[1], c: got[2] };
    this.flagCache.set(h, f);
    return f;
  }
  private hasNormals(h: Rec) {
    if (h.n !== undefined) return !!h.n;
    return this.manifest.materials[h.m].type !== 'MeshBasicMaterial';
  }
}
