// The scene half of the modelling kit: Object3D / Group / Mesh / InstancedMesh as PlayCanvas entities, and materials and
// canvas textures as PlayCanvas materials and textures. The ported model code (rider, bikes, vehicles, people, coins,
// route banners, Campus Life crowds) builds and animates its objects through this Three.js-shaped API; every object is
// a pc.Entity, every mesh a render component, every material a pc.StandardMaterial updated when its properties change.
import * as pc from 'playcanvas';
import { getEngine, whenEngine } from '../app';
import { BufferAttribute, BufferGeometry } from './geometry';
import { Color, Euler, Matrix4, Quaternion, Vector2, Vector3 } from './math';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const FrontSide = 0, BackSide = 1, DoubleSide = 2;
export const NormalBlending = 1, AdditiveBlending = 2;
export const SRGBColorSpace = 'srgb', NoColorSpace = '', LinearSRGBColorSpace = 'srgb-linear';
export const RepeatWrapping = 1000, ClampToEdgeWrapping = 1001, MirroredRepeatWrapping = 1002;
export const NearestFilter = 1003, LinearFilter = 1006;

const device = () => getEngine()!.device;

// ------------------------------------------------------------------------------------------------- textures
export class Texture {
  isTexture = true;
  image: any;
  wrapS = ClampToEdgeWrapping; wrapT = ClampToEdgeWrapping;
  repeat = new Vector2(1, 1); offset = new Vector2(0, 0); rotation = 0; center = new Vector2(0, 0);
  colorSpace = NoColorSpace; anisotropy = 1; flipY = true; magFilter = LinearFilter; channel = 0;
  private pcTex: pc.Texture | null = null;
  private uploaded = -1;
  version = 0;
  constructor(image?: any) { this.image = image; }
  set needsUpdate(v: boolean) { if (v) this.version++; }
  /** the PlayCanvas texture, (re)uploaded when the image changed */
  get pc(): pc.Texture {
    if (!this.pcTex) {
      const addr = (w: number) => (w === RepeatWrapping ? pc.ADDRESS_REPEAT : w === MirroredRepeatWrapping ? pc.ADDRESS_MIRRORED_REPEAT : pc.ADDRESS_CLAMP_TO_EDGE);
      this.pcTex = new pc.Texture(device(), {
        width: this.image?.width ?? 1, height: this.image?.height ?? 1,
        format: this.colorSpace === SRGBColorSpace ? pc.PIXELFORMAT_SRGBA8 : pc.PIXELFORMAT_RGBA8,
        mipmaps: this.magFilter !== NearestFilter, addressU: addr(this.wrapS), addressV: addr(this.wrapT),
        minFilter: this.magFilter === NearestFilter ? pc.FILTER_NEAREST : pc.FILTER_LINEAR_MIPMAP_LINEAR,
        magFilter: this.magFilter === NearestFilter ? pc.FILTER_NEAREST : pc.FILTER_LINEAR,
        anisotropy: Math.min(8, Math.max(1, this.anisotropy)), flipY: this.flipY,
      });
    }
    if (this.uploaded !== this.version && this.image) { this.pcTex.setSource(this.image); this.uploaded = this.version; }
    return this.pcTex;
  }
  clone() { const t = new (this.constructor as any)(this.image); Object.assign(t, { wrapS: this.wrapS, wrapT: this.wrapT, colorSpace: this.colorSpace, anisotropy: this.anisotropy }); t.repeat = this.repeat.clone(); t.offset = this.offset.clone(); return t; }
  dispose() { this.pcTex?.destroy(); this.pcTex = null; }
}
export class CanvasTexture extends Texture {}
export class DataTexture extends Texture {
  constructor(data: Uint8Array, w: number, h: number) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(data.buffer as ArrayBuffer, data.byteOffset, w * h * 4), w, h), 0, 0);
    super(c);
  }
}

// ------------------------------------------------------------------------------------------------- materials
type MatParams = Record<string, any>;
const toSrgbColor = (c: Color) => { const [r, g, b] = c.srgb(); return new pc.Color(r, g, b); };
/** a shading tweak on a material (the original's groundShade and friends), appended to PlayCanvas's albedo chunk */
export interface AlbedoTweak { key: string; code: string; uniforms?: Record<string, number | pc.Texture> }

let matId = 0;
export class Material {
  isMaterial = true;
  type = 'Material';
  readonly uuid = `m${++matId}`;
  name = '';
  readonly pc = new pc.StandardMaterial();
  color = new Color('#ffffff');
  emissive = new Color('#000000');
  private v: MatParams = { roughness: 1, metalness: 0, emissiveIntensity: 1, opacity: 1, transparent: false, side: FrontSide, depthWrite: true, depthTest: true, vertexColors: false, alphaTest: 0, map: null, emissiveMap: null, alphaMap: null, blending: NormalBlending, polygonOffset: false, polygonOffsetFactor: 0, polygonOffsetUnits: 0, visible: true, fog: true, flatShading: false, envMapIntensity: 1, toneMapped: true };
  tweaks: AlbedoTweak[] = [];
  /** the mesh instances drawn with this material (hidden while it is not visible) */
  readonly users = new Set<pc.MeshInstance>();
  userData: Record<string, unknown> = {};
  private pending = false;
  protected unlit = false;
  constructor(params: MatParams = {}) {
    this.color._onChange = this.emissive._onChange = () => this.dirty();
    this.setValues(params);
  }
  setValues(p: MatParams) {
    for (const [k, val] of Object.entries(p)) {
      if (val === undefined) continue;
      if (k === 'color') this.color.set(val);
      else if (k === 'emissive') this.emissive.set(val);
      else (this as any)[k] = val;
    }
    this.dirty();
  }
  protected dirty() {
    if (this.pending) return;
    this.pending = true;
    // (a material made before the engine, at import time, is set up once the engine exists)
    if (!getEngine()) whenEngine(() => this.apply());
    else queueMicrotask(() => this.apply());
  }
  /** copies every property onto the PlayCanvas material now (also done automatically after any change) */
  apply() {
    this.pending = false;
    const m = this.pc, v = this.v;
    if (this.unlit) {
      m.useLighting = false; m.useSkybox = false; m.useMetalness = false; m.specular = new pc.Color(0, 0, 0);
      m.diffuse = new pc.Color(0, 0, 0);
      m.emissive = toSrgbColor(this.color);
      m.emissiveIntensity = 1;
      const lit = this.color.r + this.color.g + this.color.b > 0;
      m.emissiveMap = v.map && lit ? v.map.pc : null;
      if (v.map) { m.emissiveMapTiling = new pc.Vec2(v.map.repeat.x, v.map.repeat.y); m.emissiveMapOffset = new pc.Vec2(v.map.offset.x, v.map.offset.y); }
      m.emissiveVertexColor = !!v.vertexColors;
    } else {
      m.useMetalness = true;
      m.diffuse = toSrgbColor(this.color);
      m.metalness = v.metalness;
      m.gloss = 1 - v.roughness;
      m.emissive = toSrgbColor(this.emissive);
      m.emissiveIntensity = v.emissiveIntensity;
      m.diffuseMap = v.map ? v.map.pc : null;
      if (v.map) { m.diffuseMapTiling = new pc.Vec2(v.map.repeat.x, v.map.repeat.y); m.diffuseMapOffset = new pc.Vec2(v.map.offset.x, v.map.offset.y); }
      m.emissiveMap = v.emissiveMap && this.emissive.r + this.emissive.g + this.emissive.b > 0 ? v.emissiveMap.pc : null;
      m.diffuseVertexColor = !!v.vertexColors;
    }
    m.opacity = v.opacity;
    const alphaFromMap = v.map && (v.transparent || v.alphaTest > 0);
    m.opacityMap = v.alphaMap ? v.alphaMap.pc : alphaFromMap ? v.map.pc : null;
    m.opacityMapChannel = v.alphaMap ? 'g' : 'a';
    if (alphaFromMap && v.map) { m.opacityMapTiling = new pc.Vec2(v.map.repeat.x, v.map.repeat.y); m.opacityMapOffset = new pc.Vec2(v.map.offset.x, v.map.offset.y); }
    // (Three.js's additive blending weighs the source by its alpha: PlayCanvas's ADDITIVEALPHA)
    m.blendType = v.transparent ? (v.blending === AdditiveBlending ? pc.BLEND_ADDITIVEALPHA : pc.BLEND_NORMAL) : v.blending === AdditiveBlending ? pc.BLEND_ADDITIVE : pc.BLEND_NONE;
    m.alphaTest = v.alphaTest;
    m.cull = v.side === DoubleSide ? pc.CULLFACE_NONE : v.side === BackSide ? pc.CULLFACE_FRONT : pc.CULLFACE_BACK;
    m.depthWrite = v.depthWrite;
    m.depthTest = v.depthTest;
    if (v.polygonOffset) { m.slopeDepthBias = v.polygonOffsetFactor; m.depthBias = v.polygonOffsetUnits; } else { m.slopeDepthBias = 0; m.depthBias = 0; }
    m.useFog = v.fog;
    m.useTonemap = v.toneMapped;
    this.applyTweaks();
    for (const mi of this.users) mi.visible = v.visible !== false;
    m.update();
  }
  private tweakKey = '';
  private applyTweaks() {
    const key = this.tweaks.map((t) => t.key).join('|');
    for (const t of this.tweaks) for (const [n, u] of Object.entries(t.uniforms ?? {})) this.pc.setParameter(n, u as any);
    if (key === this.tweakKey) return;
    this.tweakKey = key;
    const chunks = this.pc.getShaderChunks(pc.SHADERLANGUAGE_GLSL);
    if (!this.tweaks.length || this.unlit) { chunks.delete('diffusePS'); return; }
    const base = pc.ShaderChunks.get(device(), pc.SHADERLANGUAGE_GLSL).get('diffusePS') as string;
    const end = base.lastIndexOf('}');
    const decl = this.tweaks.flatMap((t) => Object.entries(t.uniforms ?? {}).map(([n, u]) => (typeof u === 'number' ? `uniform float ${n};` : `uniform sampler2D ${n};`)));
    chunks.set('diffusePS', `${decl.join('\n')}\n${base.slice(0, end)}\n${this.tweaks.map((t) => `{\n${t.code}\n}`).join('\n')}\n${base.slice(end)}`);
    this.pc.shaderChunksVersion = '2.8';
  }
  set needsUpdate(v: boolean) { if (v) this.dirty(); }
  clone(): this { const m = new (this.constructor as any)(); m.v = { ...this.v }; m.color.copy(this.color); m.emissive.copy(this.emissive); m.tweaks = [...this.tweaks]; m.dirty(); return m; }
  dispose() { /* shared materials live as long as the page */ }
  customProgramCacheKey() { return this.tweaks.map((t) => t.key).join('|'); }
}
// the plain properties, each one marking the material for an update
for (const k of ['roughness', 'metalness', 'emissiveIntensity', 'opacity', 'transparent', 'side', 'depthWrite', 'depthTest', 'vertexColors', 'alphaTest', 'map', 'emissiveMap', 'alphaMap', 'blending', 'polygonOffset', 'polygonOffsetFactor', 'polygonOffsetUnits', 'visible', 'fog', 'flatShading', 'envMapIntensity', 'toneMapped']) {
  Object.defineProperty(Material.prototype, k, { get(this: any) { return this.v[k]; }, set(this: any, val) { if (this.v[k] !== val) { this.v[k] = val; this.dirty(); } }, configurable: true });
}
export interface Material {
  roughness: number; metalness: number; emissiveIntensity: number; opacity: number; transparent: boolean; side: number;
  depthWrite: boolean; depthTest: boolean; vertexColors: boolean; alphaTest: number; map: Texture | null;
  emissiveMap: Texture | null; alphaMap: Texture | null; blending: number; polygonOffset: boolean;
  polygonOffsetFactor: number; polygonOffsetUnits: number; visible: boolean; fog: boolean; flatShading: boolean;
  envMapIntensity: number; toneMapped: boolean;
}
export class MeshStandardMaterial extends Material { type = 'MeshStandardMaterial'; }
export class MeshLambertMaterial extends Material { type = 'MeshLambertMaterial'; }
export class MeshBasicMaterial extends Material {
  type = 'MeshBasicMaterial';
  constructor(params: MatParams = {}) { super({}); this.unlit = true; this.setValues(params); }
}
export class LineBasicMaterial extends MeshBasicMaterial {}
export type MeshStandardMaterialParameters = MatParams;


// ------------------------------------------------------------------------------------------------- objects
const gpuMeshes = new WeakMap<BufferGeometry, { version: number; mesh: pc.Mesh }>();
/** the PlayCanvas mesh of a geometry, rebuilt when the geometry changed */
export function gpuMesh(g: BufferGeometry): pc.Mesh {
  const have = gpuMeshes.get(g);
  if (have && have.version === g.version) return have.mesh;
  const m = new pc.Mesh(device());
  const p = g.attributes.position;
  m.setPositions(p.array as ArrayLike<number>, 3, p.count);
  if (g.attributes.normal) m.setNormals(g.attributes.normal.array as ArrayLike<number>, 3, p.count);
  if (g.attributes.uv) m.setUvs(0, g.attributes.uv.array as ArrayLike<number>, 2, p.count);
  if (g.attributes.uv1) m.setUvs(1, g.attributes.uv1.array as ArrayLike<number>, 2, p.count);
  const c = g.attributes.color;
  if (c) {
    const cols = new Float32Array(p.count * 4);
    for (let i = 0; i < p.count; i++) { cols[i * 4] = c.getX(i); cols[i * 4 + 1] = c.getY(i); cols[i * 4 + 2] = c.getZ(i); cols[i * 4 + 3] = c.itemSize > 3 ? c.getW(i) : 1; }
    m.setColors(cols, 4, p.count);
  }
  if (g.index) m.setIndices(p.count > 65535 ? Uint32Array.from(g.index.array as ArrayLike<number>) : Uint16Array.from(g.index.array as ArrayLike<number>));
  m.update(pc.PRIMITIVE_TRIANGLES, true);
  have?.mesh.destroy();
  gpuMeshes.set(g, { version: g.version, mesh: m });
  return m;
}

let objId = 0;
export class Object3D {
  isObject3D = true;
  type = 'Object3D';
  id = ++objId;
  name = '';
  readonly entity: pc.Entity;
  parent: Object3D | null = null;
  children: Object3D[] = [];
  readonly position = new Vector3();
  readonly quaternion = new Quaternion();
  readonly rotation = new Euler();
  readonly scale = new Vector3(1, 1, 1);
  userData: Record<string, any> = {};
  matrixAutoUpdate = true;
  frustumCulled = true;
  protected _renderOrder = 0;
  get renderOrder() { return this._renderOrder; }
  set renderOrder(v: number) { this._renderOrder = v; }
  private _visible = true;
  protected _castShadow = false;
  protected _receiveShadow = false;
  constructor(entity?: pc.Entity) {
    this.entity = entity ?? new pc.Entity();
    (this.entity as any).__obj = this;
    this.position._onChange = () => this.entity.setLocalPosition(this.position.x, this.position.y, this.position.z);
    this.scale._onChange = () => this.entity.setLocalScale(this.scale.x, this.scale.y, this.scale.z);
    this.rotation._onChange = () => { this.quaternion._onChange = null; this.quaternion.setFromEuler(this.rotation); this.quaternion._onChange = qch; this.syncRot(); };
    const qch = () => { this.rotation._onChange = null; this.rotation.setFromQuaternion(this.quaternion, this.rotation.order, false); this.rotation._onChange = ech; this.syncRot(); };
    const ech = this.rotation._onChange;
    this.quaternion._onChange = qch;
  }
  private syncRot() { const q = this.quaternion; this.entity.setLocalRotation(q.x, q.y, q.z, q.w); }
  get visible() { return this._visible; }
  set visible(v: boolean) { this._visible = v; this.entity.enabled = v; }
  get castShadow() { return this._castShadow; }
  set castShadow(v: boolean) { this._castShadow = v; }
  get receiveShadow() { return this._receiveShadow; }
  set receiveShadow(v: boolean) { this._receiveShadow = v; }
  add(...objs: Object3D[]) {
    for (const o of objs) {
      if (!o || o === this) continue;
      o.parent?.remove(o);
      o.parent = this;
      this.children.push(o);
      this.entity.addChild(o.entity);
    }
    return this;
  }
  remove(...objs: Object3D[]) {
    for (const o of objs) {
      const i = this.children.indexOf(o);
      if (i < 0) continue;
      this.children.splice(i, 1);
      o.parent = null;
      this.entity.removeChild(o.entity);
    }
    return this;
  }
  removeFromParent() { this.parent?.remove(this); return this; }
  clear() { return this.remove(...this.children); }
  traverse(fn: (o: Object3D) => void) { fn(this); for (const c of [...this.children]) c.traverse(fn); }
  traverseVisible(fn: (o: Object3D) => void) { if (!this._visible) return; fn(this); for (const c of [...this.children]) c.traverseVisible(fn); }
  updateMatrix() { /* PlayCanvas keeps the entity's transform */ }
  updateMatrixWorld(_force?: boolean) { /* (likewise) */ }
  updateWorldMatrix(_parents?: boolean, _children?: boolean) { /* (likewise) */ }
  /** moves along the object's own axis */
  translateOnAxis(axis: Vector3, d: number) { const v = axis.clone().applyQuaternion(this.quaternion); this.position.set(this.position.x + v.x * d, this.position.y + v.y * d, this.position.z + v.z * d); return this; }
  translateX(d: number) { return this.translateOnAxis(new Vector3(1, 0, 0), d); }
  translateY(d: number) { return this.translateOnAxis(new Vector3(0, 1, 0), d); }
  translateZ(d: number) { return this.translateOnAxis(new Vector3(0, 0, 1), d); }
  getWorldPosition(v: Vector3) { const p = this.entity.getPosition(); return v.set(p.x, p.y, p.z); }
  get matrixWorld() { const m = new Matrix4(); m.fromArray(this.entity.getWorldTransform().data); return m; }
  lookAt(x: number | Vector3, y?: number, z?: number) {
    const t = typeof x === 'object' ? new pc.Vec3(x.x, x.y, x.z) : new pc.Vec3(x, y!, z!);
    // Three.js objects (not cameras) turn +Z toward the target
    const p = this.entity.getPosition();
    const back = new pc.Vec3().sub2(p, t).add(p);
    this.entity.lookAt(back);
    const r = this.entity.getLocalRotation();
    this.quaternion._onChange = null; this.quaternion.set(r.x, r.y, r.z, r.w);
    this.rotation.setFromQuaternion(this.quaternion, this.rotation.order, false);
    this.quaternion._onChange = () => { this.rotation.setFromQuaternion(this.quaternion, this.rotation.order, false); this.syncRot(); };
  }
  rotateX(a: number) { this.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), a)); return this; }
  rotateY(a: number) { this.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), a)); return this; }
  rotateZ(a: number) { this.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), a)); return this; }
  applyMatrix4(m: Matrix4) { const p = new Vector3(), q = new Quaternion(), s = new Vector3(); m.decompose(p, q, s); this.position.add(p); this.quaternion.premultiply(q); this.scale.multiply(s); return this; }
  clone(): Object3D { throw new Error('clone is not supported by the modelling kit'); }
}
export class Group extends Object3D { type = 'Group'; isGroup = true; }
export class Scene extends Object3D {
  type = 'Scene';
  /** the engine's linear fog, as Three.js's Fog (near, far) */
  get fog(): { near: number; far: number } | null {
    const f = getEngine()?.app.scene.fog;
    if (!f) return null;
    return { get near() { return f.start; }, set near(v: number) { f.start = v; }, get far() { return f.end; }, set far(v: number) { f.end = v; } };
  }
}

/** an axis-aligned box (world space) */
export class Box3 {
  min = new Vector3(Infinity, Infinity, Infinity);
  max = new Vector3(-Infinity, -Infinity, -Infinity);
  makeEmpty() { this.min.set(Infinity, Infinity, Infinity); this.max.set(-Infinity, -Infinity, -Infinity); return this; }
  expandByPoint(p: Vector3) { this.min.set(Math.min(this.min.x, p.x), Math.min(this.min.y, p.y), Math.min(this.min.z, p.z)); this.max.set(Math.max(this.max.x, p.x), Math.max(this.max.y, p.y), Math.max(this.max.z, p.z)); return this; }
  /** the world bounds of every mesh under o */
  setFromObject(o: Object3D) {
    this.makeEmpty();
    const v = new Vector3();
    o.traverse((c) => {
      const m = c as Mesh;
      if (!m.isMesh || !m.geometry?.attributes.position) return;
      m.geometry.computeBoundingBox();
      const bb = m.geometry.boundingBox!, w = m.entity.getWorldTransform(), t = new pc.Vec3();
      for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) { w.transformPoint(new pc.Vec3(x, y, z), t); this.expandByPoint(v.set(t.x, t.y, t.z)); }
    });
    return this;
  }
}

/** a plane: normal . p + constant = 0 */
export class Plane {
  constructor(public normal = new Vector3(0, 1, 0), public constant = 0) {}
}
/** picks along a ray from the camera through a point on the screen */
export class Raycaster {
  ray = {
    origin: new Vector3(), direction: new Vector3(0, 0, -1),
    intersectPlane(pl: Plane, target: Vector3): Vector3 | null {
      const n = pl.normal, d = this.direction, den = n.x * d.x + n.y * d.y + n.z * d.z;
      if (Math.abs(den) < 1e-9) return null;
      const t = -(n.x * this.origin.x + n.y * this.origin.y + n.z * this.origin.z + pl.constant) / den;
      if (t < 0) return null;
      return target.set(this.origin.x + d.x * t, this.origin.y + d.y * t, this.origin.z + d.z * t);
    },
  };
  /** ndc: -1..1 across the screen, y up */
  setFromCamera(ndc: Vector2, camera: Object3D) {
    const c = camera.entity.camera!, dev = getEngine()!.device;
    const sx = ((ndc.x + 1) / 2) * dev.clientRect.width, sy = ((1 - ndc.y) / 2) * dev.clientRect.height;
    const a = c.screenToWorld(sx, sy, c.nearClip), b = c.screenToWorld(sx, sy, c.farClip);
    this.ray.origin.set(a.x, a.y, a.z);
    const L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) || 1;
    this.ray.direction.set((b.x - a.x) / L, (b.y - a.y) / L, (b.z - a.z) / L);
  }
}
export class LOD extends Object3D { type = 'LOD'; levels: { distance: number; object: Object3D }[] = []; addLevel(o: Object3D, d = 0) { this.levels.push({ distance: d, object: o }); this.add(o); return this; } }

export class Mesh extends Object3D {
  type = 'Mesh';
  isMesh = true;
  private _geometry: BufferGeometry;
  private _material: Material;
  protected mi: pc.MeshInstance;
  constructor(geometry: BufferGeometry = new BufferGeometry(), material: Material = new MeshStandardMaterial()) {
    super();
    this._geometry = geometry;
    this._material = Array.isArray(material) ? material[0] : material;
    this.mi = new pc.MeshInstance(gpuMesh(geometry), this._material.pc);
    this._material.users.add(this.mi);
    this.entity.addComponent('render', { meshInstances: [this.mi], castShadows: false, receiveShadows: true });
    this.mi.visible = this._material.visible !== false;
  }
  get geometry() { return this._geometry; }
  set geometry(g: BufferGeometry) { this._geometry = g; this.mi.mesh = gpuMesh(g); }
  get material(): Material { return this._material; }
  set material(m: Material) { this._material.users.delete(this.mi); this._material = m; m.users.add(this.mi); this.mi.material = m.pc; this.mi.visible = m.visible !== false; }
  set castShadow(v: boolean) { this._castShadow = v; if (this.entity.render) this.entity.render.castShadows = v; }
  get castShadow() { return this._castShadow; }
  set receiveShadow(v: boolean) { this._receiveShadow = v; if (this.entity.render) this.entity.render.receiveShadows = v; }
  get receiveShadow() { return this._receiveShadow; }
  set renderOrder(v: number) { this._renderOrder = v; if (this.mi) this.mi.drawOrder = v; }
  get renderOrder() { return this._renderOrder; }
  /** re-reads the geometry after its arrays were changed in place */
  refresh() { this._geometry.version++; this.mi.mesh = gpuMesh(this._geometry); }
  get meshInstance() { return this.mi; }
}

/** hardware-instanced copies of one mesh, placed with setMatrixAt (PlayCanvas's default instancing carries matrices only:
 *  per-instance colours are kept but not drawn). Not frustum culled: the copies spread far past the base mesh's bounds. */
export class InstancedMesh extends Mesh {
  type = 'InstancedMesh';
  isInstancedMesh = true;
  private _count: number;
  readonly instanceMatrix: { array: Float32Array; count: number; needsUpdate: boolean; setUsage: () => void };
  instanceColor: { array: Float32Array; needsUpdate: boolean } | null = null;
  private vb: pc.VertexBuffer;
  constructor(geometry: BufferGeometry, material: Material, capacity: number) {
    super(geometry, material);
    const n = Math.max(1, capacity);
    this._count = capacity;
    const arr = new Float32Array(n * 16);
    for (let i = 0; i < n; i++) arr.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], i * 16);
    const self = this;
    this.instanceMatrix = { array: arr, count: n, setUsage() { /* always dynamic */ }, get needsUpdate() { return false; }, set needsUpdate(v: boolean) { if (v) self.vb.setData(arr.buffer as ArrayBuffer); } };
    this.vb = new pc.VertexBuffer(device(), pc.VertexFormat.getDefaultInstancingFormat(device()), n, { data: arr, usage: pc.BUFFER_DYNAMIC });
    this.mi.setInstancing(this.vb, false);
    this.mi.instancingCount = capacity;
    this.mi.cull = false;
  }
  get count() { return this._count; }
  set count(n: number) { this._count = n; if (this.mi) { this.mi.instancingCount = n; this.mi.visible = n > 0 && this.material.visible !== false; } }
  private queued = false;
  setMatrixAt(i: number, m: Matrix4) {
    const e = m.elements;
    for (let k = 0; k < 16; k++) this.instanceMatrix.array[i * 16 + k] = e[k];
    // (Three.js uploads the matrices before the first draw without being asked: so does this)
    if (!this.queued) { this.queued = true; queueMicrotask(() => { this.queued = false; this.vb.setData(this.instanceMatrix.array.buffer as ArrayBuffer); }); }
  }
  getMatrixAt(i: number, m: Matrix4) { m.fromArray(this.instanceMatrix.array, i * 16); }
  setColorAt(i: number, c: Color) { if (!this.instanceColor) this.instanceColor = { array: new Float32Array(this.instanceMatrix.count * 3).fill(1), needsUpdate: false }; this.instanceColor.array.set([c.r, c.g, c.b], i * 3); }
  /** (bounds of the copies: not needed, they are never culled) */
  computeBoundingSphere() { /* never culled */ }
  dispose() { this.vb.destroy(); }
}

/** a polyline (wires, strings of bunting): drawn as GL lines in the material's colour */
export class Line extends Object3D {
  type = 'Line';
  isLine = true;
  geometry: BufferGeometry;
  material: Material;
  constructor(geometry: BufferGeometry = new BufferGeometry(), material: Material = new LineBasicMaterial()) {
    super();
    this.geometry = geometry;
    this.material = material;
    const p = geometry.attributes.position;
    if (!p || p.count < 2) return;
    const m = new pc.Mesh(device());
    m.setPositions(p.array as ArrayLike<number>, 3, p.count);
    const idx: number[] = [];
    if ((this as { isLineSegments?: boolean }).isLineSegments) for (let i = 0; i + 1 < p.count; i += 2) idx.push(i, i + 1);
    else for (let i = 0; i + 1 < p.count; i++) idx.push(i, i + 1);
    m.setIndices(idx);
    m.update(pc.PRIMITIVE_LINES);
    const mi = new pc.MeshInstance(m, material.pc);
    material.users.add(mi);
    this.entity.addComponent('render', { meshInstances: [mi], castShadows: false, receiveShadows: false });
  }
}
export class LineSegments extends Line { isLineSegments = true; }
export class Points extends Object3D { constructor(..._a: unknown[]) { super(); } }

/** a sprite's material: unlit, its texture's alpha as coverage */
export class SpriteMaterial extends MeshBasicMaterial {
  constructor(params: MatParams = {}) { super({ transparent: true, ...params }); }
}
let spritePlane: BufferGeometry | null = null;
const sprites = new Set<Sprite>();
/** a picture that always faces the camera (labels over places, the destination's sign): a unit square, scaled */
export class Sprite extends Mesh {
  type = 'Sprite';
  isSprite = true;
  constructor(material: Material = new SpriteMaterial()) {
    super((spritePlane ??= planeGeometry()), material);
    sprites.add(this);
  }
  /** turns every sprite to face the camera; called once a frame */
  static face(camera: pc.Entity) {
    const r = camera.getRotation();
    for (const s of sprites) if (s.entity.enabled && s.entity.parent) s.entity.setRotation(r);
  }
  dispose() { sprites.delete(this); }
}
function planeGeometry() {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3));
  g.setAttribute('normal', new BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}

/** the game's camera: the engine's camera entity behind Three.js's camera API (fov, aspect, view offset, lookAt turning
 *  -Z toward the target) */
export class PerspectiveCamera extends Object3D {
  type = 'PerspectiveCamera';
  isCamera = true;
  private view: { fullW: number; fullH: number; x: number; y: number; w: number; h: number } | null = null;
  constructor(public fov = 50, private _aspect = 1, public near = 0.1, public far = 2000, entity?: pc.Entity) {
    super(entity);
    const p = this.entity.getLocalPosition();
    this.position._onChange = null; this.position.set(p.x, p.y, p.z); this.position._onChange = () => this.entity.setLocalPosition(this.position.x, this.position.y, this.position.z);
    this.updateProjectionMatrix();
  }
  /** width over height of the drawing buffer */
  get aspect() { const d = getEngine()?.device; return d && d.height ? d.width / d.height : this._aspect; }
  set aspect(v: number) { this._aspect = v; }
  updateProjectionMatrix() {
    const c = this.entity.camera;
    if (!c) return;
    c.fov = this.fov;
    c.nearClip = this.near;
    c.farClip = this.far;
    const v = this.view;
    if (!v) { (c as any).calculateProjection = null; return; }
    (c as any).calculateProjection = (m: pc.Mat4) => {
      const top0 = this.near * Math.tan((this.fov * Math.PI) / 360), height = 2 * top0, width = this.aspect * height;
      const left = -0.5 * width + (v.x * width) / v.fullW, top = top0 - (v.y * height) / v.fullH;
      m.setFrustum(left, left + (width * v.w) / v.fullW, top - (height * v.h) / v.fullH, top, this.near, this.far);
    };
  }
  setViewOffset(fullW: number, fullH: number, x: number, y: number, w: number, h: number) { this.view = { fullW, fullH, x, y, w, h }; this.updateProjectionMatrix(); }
  clearViewOffset() { this.view = null; this.updateProjectionMatrix(); }
  /** v (world) to normalised device coordinates, in place (Three.js's Vector3.project) */
  projectPoint(v: Vector3) {
    const c = this.entity.camera!.camera as any;
    const vp = new pc.Mat4().mul2(c.projectionMatrix, c.viewMatrix), p = new pc.Vec4(v.x, v.y, v.z, 1);
    vp.transformVec4(p, p);
    const w = p.w || 1e-9;
    v.set(p.x / w, p.y / w, p.z / w);
  }
  /** cameras turn -Z toward the target */
  lookAt(x: number | Vector3, y?: number, z?: number) {
    const t = typeof x === 'object' ? new pc.Vec3(x.x, x.y, x.z) : new pc.Vec3(x, y!, z!);
    this.entity.lookAt(t);
    const r = this.entity.getLocalRotation();
    const cb = this.quaternion._onChange;
    this.quaternion._onChange = null;
    this.quaternion.set(r.x, r.y, r.z, r.w);
    this.quaternion._onChange = cb;
  }
}
