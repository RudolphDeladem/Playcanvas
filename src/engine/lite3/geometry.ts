// Geometry for the ported model code: buffer geometry with the Three.js-style API (attributes, index, transforms, merge)
// and the primitives the models use, generated exactly as Three.js generates them (vertex order, normals and UV
// layout follow its MIT-licensed generators, so textures such as the bike decals and the helmet map land where they
// did). The result is plain arrays; scene.ts turns it into PlayCanvas meshes.
import { Matrix4, Quaternion, Vector2, Vector3 } from './math';

export class BufferAttribute {
  isBufferAttribute = true;
  count: number;
  needsUpdate = false;
  constructor(public array: Float32Array | Uint16Array | Uint32Array | number[], public itemSize: number, public normalized = false) {
    this.count = array.length / itemSize;
  }
  getX(i: number) { return this.n(this.array[i * this.itemSize]); }
  getY(i: number) { return this.n(this.array[i * this.itemSize + 1]); }
  getZ(i: number) { return this.n(this.array[i * this.itemSize + 2]); }
  getW(i: number) { return this.n(this.array[i * this.itemSize + 3]); }
  private n(v: number) { if (!this.normalized) return v; if (this.array instanceof Uint8Array) return v / 255; if (this.array instanceof Uint16Array) return v / 65535; return v; }
  setX(i: number, v: number) { this.array[i * this.itemSize] = v; return this; }
  setY(i: number, v: number) { this.array[i * this.itemSize + 1] = v; return this; }
  setZ(i: number, v: number) { this.array[i * this.itemSize + 2] = v; return this; }
  setW(i: number, v: number) { this.array[i * this.itemSize + 3] = v; return this; }
  setXY(i: number, x: number, y: number) { this.array[i * this.itemSize] = x; this.array[i * this.itemSize + 1] = y; return this; }
  setXYZ(i: number, x: number, y: number, z: number) { const o = i * this.itemSize; this.array[o] = x; this.array[o + 1] = y; this.array[o + 2] = z; return this; }
  clone() { return new BufferAttribute(this.array.slice(), this.itemSize, this.normalized); }
}
export class Float32BufferAttribute extends BufferAttribute {
  constructor(array: ArrayLike<number>, itemSize: number, normalized = false) { super(new Float32Array(array), itemSize, normalized); }
}

let geoId = 0;
export class BufferGeometry {
  isBufferGeometry = true;
  id = ++geoId;
  /** bumped on every change: scene.ts rebuilds the GPU mesh when it differs */
  version = 0;
  uuid = `g${this.id}`;
  type = 'BufferGeometry';
  attributes: Record<string, BufferAttribute> = {};
  index: BufferAttribute | null = null;
  groups: { start: number; count: number; materialIndex?: number }[] = [];
  drawRange = { start: 0, count: Infinity };
  boundingBox: { min: Vector3; max: Vector3 } | null = null;
  boundingSphere: { center: Vector3; radius: number } | null = null;
  userData: Record<string, unknown> = {};
  setAttribute(n: string, a: BufferAttribute) { this.attributes[n] = a; this.version++; return this; }
  getAttribute(n: string) { return this.attributes[n]; }
  deleteAttribute(n: string) { delete this.attributes[n]; this.version++; return this; }
  hasAttribute(n: string) { return !!this.attributes[n]; }
  setIndex(i: number[] | Uint16Array | Uint32Array | BufferAttribute | null) {
    if (i === null) this.index = null;
    else if (i instanceof BufferAttribute) this.index = i;
    else { const max = Math.max(0, ...Array.from(i as ArrayLike<number>).slice(0, 1)); void max; this.index = new BufferAttribute(Uint32Array.from(i as ArrayLike<number>), 1); }
    this.version++;
    return this;
  }
  addGroup(start: number, count: number, materialIndex = 0) { this.groups.push({ start, count, materialIndex }); }
  clearGroups() { this.groups = []; }
  setDrawRange(start: number, count: number) { this.drawRange = { start, count }; }
  applyMatrix4(m: Matrix4) {
    const p = this.attributes.position;
    const e = m.elements;
    if (p) for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      p.setXYZ(i, e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]);
    }
    const n = this.attributes.normal;
    if (n) {
      // normal matrix: inverse transpose of the upper 3x3
      const inv = m.clone().invert().elements;
      for (let i = 0; i < n.count; i++) {
        const x = n.getX(i), y = n.getY(i), z = n.getZ(i);
        let nx = inv[0] * x + inv[1] * y + inv[2] * z, ny = inv[4] * x + inv[5] * y + inv[6] * z, nz = inv[8] * x + inv[9] * y + inv[10] * z;
        const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        n.setXYZ(i, nx, ny, nz);
      }
    }
    this.boundingBox = this.boundingSphere = null;
    this.version++;
    return this;
  }
  applyQuaternion(q: Quaternion) { return this.applyMatrix4(new Matrix4().makeRotationFromQuaternion(q)); }
  translate(x: number, y: number, z: number) { return this.applyMatrix4(new Matrix4().makeTranslation(x, y, z)); }
  scale(x: number, y: number, z: number) { return this.applyMatrix4(new Matrix4().makeScale(x, y, z)); }
  rotateX(a: number) { return this.applyMatrix4(new Matrix4().makeRotationX(a)); }
  rotateY(a: number) { return this.applyMatrix4(new Matrix4().makeRotationY(a)); }
  rotateZ(a: number) { return this.applyMatrix4(new Matrix4().makeRotationZ(a)); }
  center() { this.computeBoundingBox(); const b = this.boundingBox!; return this.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -(b.min.z + b.max.z) / 2); }
  clone() {
    const g = new BufferGeometry();
    for (const [k, a] of Object.entries(this.attributes)) g.attributes[k] = a.clone();
    g.index = this.index ? this.index.clone() : null;
    g.groups = this.groups.map((x) => ({ ...x }));
    g.drawRange = { ...this.drawRange };
    return g;
  }
  copy(g: BufferGeometry) { const c = g.clone(); this.attributes = c.attributes; this.index = c.index; this.groups = c.groups; this.version++; return this; }
  dispose() { /* GPU meshes are released by scene.ts */ }
  computeBoundingBox() {
    const p = this.attributes.position, min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); min.x = Math.min(min.x, x); min.y = Math.min(min.y, y); min.z = Math.min(min.z, z); max.x = Math.max(max.x, x); max.y = Math.max(max.y, y); max.z = Math.max(max.z, z); }
    this.boundingBox = { min, max };
  }
  computeBoundingSphere() {
    this.computeBoundingBox();
    const b = this.boundingBox!, c = new Vector3((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, (b.min.z + b.max.z) / 2);
    let r = 0; const p = this.attributes.position;
    for (let i = 0; i < p.count; i++) r = Math.max(r, Math.hypot(p.getX(i) - c.x, p.getY(i) - c.y, p.getZ(i) - c.z));
    this.boundingSphere = { center: c, radius: r };
  }
  toNonIndexed() {
    if (!this.index) return this.clone();
    const g = new BufferGeometry(), idx = this.index.array;
    for (const [k, a] of Object.entries(this.attributes)) {
      const out = new Float32Array(idx.length * a.itemSize);
      for (let i = 0; i < idx.length; i++) for (let c = 0; c < a.itemSize; c++) out[i * a.itemSize + c] = a.array[idx[i] * a.itemSize + c];
      g.attributes[k] = new BufferAttribute(out, a.itemSize, a.normalized);
    }
    return g;
  }
  /** smooth normals by face area (Three.js's computeVertexNormals) */
  setFromPoints(points: { x: number; y: number; z?: number }[]) {
    const a = new Float32Array(points.length * 3);
    points.forEach((p, i) => { a[i * 3] = p.x; a[i * 3 + 1] = p.y; a[i * 3 + 2] = p.z ?? 0; });
    return this.setAttribute('position', new BufferAttribute(a, 3));
  }
  normalizeNormals() {
    const n = this.attributes.normal;
    if (!n) return this;
    for (let i = 0; i < n.count; i++) { const x = n.getX(i), y = n.getY(i), z = n.getZ(i), l = Math.hypot(x, y, z) || 1; n.setXYZ(i, x / l, y / l, z / l); }
    this.version++;
    return this;
  }
  computeVertexNormals() {
    const p = this.attributes.position, n = new Float32Array(p.count * 3);
    const tri = (a: number, b: number, c: number) => {
      const ax = p.getX(a), ay = p.getY(a), az = p.getZ(a), bx = p.getX(b) - ax, by = p.getY(b) - ay, bz = p.getZ(b) - az, cx = p.getX(c) - ax, cy = p.getY(c) - ay, cz = p.getZ(c) - az;
      const nx = by * cz - bz * cy, ny = bz * cx - bx * cz, nz = bx * cy - by * cx;
      for (const v of [a, b, c]) { n[v * 3] += nx; n[v * 3 + 1] += ny; n[v * 3 + 2] += nz; }
    };
    if (this.index) { const I = this.index.array; for (let i = 0; i + 2 < I.length; i += 3) tri(I[i], I[i + 1], I[i + 2]); }
    else for (let i = 0; i + 2 < p.count; i += 3) tri(i, i + 1, i + 2);
    for (let i = 0; i < p.count; i++) { const l = Math.hypot(n[i * 3], n[i * 3 + 1], n[i * 3 + 2]) || 1; n[i * 3] /= l; n[i * 3 + 1] /= l; n[i * 3 + 2] /= l; }
    this.setAttribute('normal', new BufferAttribute(n, 3));
  }
}

const geo = (type: string, idx: number[], pos: number[], nrm: number[], uv: number[]) => {
  const g = new BufferGeometry();
  g.type = type;
  g.setIndex(idx);
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  return g;
};

export class BoxGeometry extends BufferGeometry {
  constructor(width = 1, height = 1, depth = 1, ws = 1, hs = 1, ds = 1) {
    super();
    const idx: number[] = [], pos: number[] = [], nrm: number[] = [], uv: number[] = [];
    let nv = 0;
    const plane = (u: number, v: number, w: number, udir: number, vdir: number, W: number, H: number, D: number, gx: number, gy: number) => {
      const sw = W / gx, sh = H / gy, hw = W / 2, hh = H / 2, hd = D / 2, g1 = gx + 1;
      let cnt = 0;
      for (let iy = 0; iy <= gy; iy++) {
        const y = iy * sh - hh;
        for (let ix = 0; ix <= gx; ix++) {
          const x = ix * sw - hw, vec = [0, 0, 0], n = [0, 0, 0];
          vec[u] = x * udir; vec[v] = y * vdir; vec[w] = hd;
          n[w] = D > 0 ? 1 : -1;
          pos.push(...vec); nrm.push(...n); uv.push(ix / gx, 1 - iy / gy);
          cnt++;
        }
      }
      for (let iy = 0; iy < gy; iy++) for (let ix = 0; ix < gx; ix++) {
        const a = nv + ix + g1 * iy, b = nv + ix + g1 * (iy + 1), c = nv + ix + 1 + g1 * (iy + 1), d = nv + ix + 1 + g1 * iy;
        idx.push(a, b, d, b, c, d);
      }
      nv += cnt;
    };
    // x=0 y=1 z=2
    plane(2, 1, 0, -1, -1, depth, height, width, ds, hs);
    plane(2, 1, 0, 1, -1, depth, height, -width, ds, hs);
    plane(0, 2, 1, 1, 1, width, depth, height, ws, ds);
    plane(0, 2, 1, 1, -1, width, depth, -height, ws, ds);
    plane(0, 1, 2, 1, -1, width, height, depth, ws, hs);
    plane(0, 1, 2, -1, -1, width, height, -depth, ws, hs);
    this.copy(geo('BoxGeometry', idx, pos, nrm, uv));
    this.type = 'BoxGeometry';
  }
}

export class CylinderGeometry extends BufferGeometry {
  constructor(radiusTop = 1, radiusBottom = 1, height = 1, radialSegments = 32, heightSegments = 1, openEnded = false, thetaStart = 0, thetaLength = Math.PI * 2) {
    super();
    radialSegments = Math.floor(radialSegments); heightSegments = Math.floor(heightSegments);
    const idx: number[] = [], pos: number[] = [], nrm: number[] = [], uv: number[] = [];
    let index = 0;
    const rows: number[][] = [], half = height / 2, slope = (radiusBottom - radiusTop) / height;
    for (let y = 0; y <= heightSegments; y++) {
      const row: number[] = [], v = y / heightSegments, r = v * (radiusBottom - radiusTop) + radiusTop;
      for (let x = 0; x <= radialSegments; x++) {
        const u = x / radialSegments, t = u * thetaLength + thetaStart, s = Math.sin(t), c = Math.cos(t);
        pos.push(r * s, -v * height + half, r * c);
        const l = Math.hypot(s, slope, c);
        nrm.push(s / l, slope / l, c / l);
        uv.push(u, 1 - v);
        row.push(index++);
      }
      rows.push(row);
    }
    for (let x = 0; x < radialSegments; x++) for (let y = 0; y < heightSegments; y++) {
      const a = rows[y][x], b = rows[y + 1][x], c = rows[y + 1][x + 1], d = rows[y][x + 1];
      if (radiusTop > 0 || y !== 0) idx.push(a, b, d);
      if (radiusBottom > 0 || y !== heightSegments - 1) idx.push(b, c, d);
    }
    const cap = (top: boolean) => {
      const start = index, r = top ? radiusTop : radiusBottom, sign = top ? 1 : -1;
      for (let x = 1; x <= radialSegments; x++) { pos.push(0, half * sign, 0); nrm.push(0, sign, 0); uv.push(0.5, 0.5); index++; }
      const end = index;
      for (let x = 0; x <= radialSegments; x++) {
        const u = x / radialSegments, t = u * thetaLength + thetaStart, c = Math.cos(t), s = Math.sin(t);
        pos.push(r * s, half * sign, r * c); nrm.push(0, sign, 0); uv.push(c * 0.5 + 0.5, s * 0.5 * sign + 0.5); index++;
      }
      for (let x = 0; x < radialSegments; x++) { const c = start + x, i = end + x; if (top) idx.push(i, i + 1, c); else idx.push(i + 1, i, c); }
    };
    if (!openEnded) { if (radiusTop > 0) cap(true); if (radiusBottom > 0) cap(false); }
    this.copy(geo('CylinderGeometry', idx, pos, nrm, uv));
    this.type = 'CylinderGeometry';
  }
}
export class ConeGeometry extends CylinderGeometry {
  constructor(radius = 1, height = 1, radialSegments = 32, heightSegments = 1, openEnded = false, thetaStart = 0, thetaLength = Math.PI * 2) {
    super(0, radius, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength);
    this.type = 'ConeGeometry';
  }
}

export class SphereGeometry extends BufferGeometry {
  constructor(radius = 1, widthSegments = 32, heightSegments = 16, phiStart = 0, phiLength = Math.PI * 2, thetaStart = 0, thetaLength = Math.PI) {
    super();
    widthSegments = Math.max(3, Math.floor(widthSegments)); heightSegments = Math.max(2, Math.floor(heightSegments));
    const thetaEnd = Math.min(thetaStart + thetaLength, Math.PI);
    const idx: number[] = [], pos: number[] = [], nrm: number[] = [], uv: number[] = [], grid: number[][] = [];
    let index = 0;
    for (let iy = 0; iy <= heightSegments; iy++) {
      const row: number[] = [], v = iy / heightSegments, theta = thetaStart + v * thetaLength, y = radius * Math.cos(theta), rr = Math.sqrt(Math.max(0, radius * radius - y * y));
      let uo = 0;
      if (iy === 0 && thetaStart === 0) uo = 0.5 / widthSegments; else if (iy === heightSegments && thetaEnd === Math.PI) uo = -0.5 / widthSegments;
      for (let ix = 0; ix <= widthSegments; ix++) {
        const u = ix / widthSegments, phi = phiStart + u * phiLength;
        const x = -rr * Math.cos(phi), z = rr * Math.sin(phi);
        pos.push(x, y, z);
        const l = Math.hypot(x, y, z) || 1;
        nrm.push(x / l, y / l, z / l);
        uv.push(u + uo, 1 - v);
        row.push(index++);
      }
      grid.push(row);
    }
    for (let iy = 0; iy < heightSegments; iy++) for (let ix = 0; ix < widthSegments; ix++) {
      const a = grid[iy][ix + 1], b = grid[iy][ix], c = grid[iy + 1][ix], d = grid[iy + 1][ix + 1];
      if (iy !== 0 || thetaStart > 0) idx.push(a, b, d);
      if (iy !== heightSegments - 1 || thetaEnd < Math.PI) idx.push(b, c, d);
    }
    this.copy(geo('SphereGeometry', idx, pos, nrm, uv));
    this.type = 'SphereGeometry';
  }
}

export class CapsuleGeometry extends BufferGeometry {
  constructor(radius = 1, height = 1, capSegments = 4, radialSegments = 8, heightSegments = 1) {
    super();
    height = Math.max(0, height); capSegments = Math.max(1, Math.floor(capSegments)); radialSegments = Math.max(3, Math.floor(radialSegments)); heightSegments = Math.max(1, Math.floor(heightSegments));
    const idx: number[] = [], pos: number[] = [], nrm: number[] = [], uv: number[] = [];
    const half = height / 2, capArc = (Math.PI / 2) * radius, total = 2 * capArc + height, rows = capSegments * 2 + heightSegments, per = radialSegments + 1;
    for (let iy = 0; iy <= rows; iy++) {
      let arc = 0, py = 0, pr = 0, ny = 0;
      if (iy <= capSegments) { const s = iy / capSegments, a = (s * Math.PI) / 2; py = -half - radius * Math.cos(a); pr = radius * Math.sin(a); ny = -radius * Math.cos(a); arc = s * capArc; }
      else if (iy <= capSegments + heightSegments) { const s = (iy - capSegments) / heightSegments; py = -half + s * height; pr = radius; ny = 0; arc = capArc + s * height; }
      else { const s = (iy - capSegments - heightSegments) / capSegments, a = (s * Math.PI) / 2; py = half + radius * Math.sin(a); pr = radius * Math.cos(a); ny = radius * Math.sin(a); arc = capArc + height + s * capArc; }
      const v = Math.max(0, Math.min(1, arc / total));
      const uo = iy === 0 ? 0.5 / radialSegments : iy === rows ? -0.5 / radialSegments : 0;
      for (let ix = 0; ix <= radialSegments; ix++) {
        const u = ix / radialSegments, t = u * Math.PI * 2, s = Math.sin(t), c = Math.cos(t);
        pos.push(-pr * c, py, pr * s);
        const nx = -pr * c, nz = pr * s, l = Math.hypot(nx, ny, nz) || 1;
        nrm.push(nx / l, ny / l, nz / l);
        uv.push(u + uo, v);
      }
      if (iy > 0) {
        const prev = (iy - 1) * per;
        for (let ix = 0; ix < radialSegments; ix++) { const i1 = prev + ix, i2 = prev + ix + 1, i3 = iy * per + ix, i4 = iy * per + ix + 1; idx.push(i1, i2, i3, i2, i4, i3); }
      }
    }
    this.copy(geo('CapsuleGeometry', idx, pos, nrm, uv));
    this.type = 'CapsuleGeometry';
  }
}

export class TorusGeometry extends BufferGeometry {
  constructor(radius = 1, tube = 0.4, radialSegments = 12, tubularSegments = 48, arc = Math.PI * 2, thetaStart = 0, thetaLength = Math.PI * 2) {
    super();
    radialSegments = Math.floor(radialSegments); tubularSegments = Math.floor(tubularSegments);
    const idx: number[] = [], pos: number[] = [], nrm: number[] = [], uv: number[] = [];
    for (let j = 0; j <= radialSegments; j++) {
      const v = thetaStart + (j / radialSegments) * thetaLength;
      for (let i = 0; i <= tubularSegments; i++) {
        const u = (i / tubularSegments) * arc;
        const x = (radius + tube * Math.cos(v)) * Math.cos(u), y = (radius + tube * Math.cos(v)) * Math.sin(u), z = tube * Math.sin(v);
        pos.push(x, y, z);
        const cx = radius * Math.cos(u), cy = radius * Math.sin(u), l = Math.hypot(x - cx, y - cy, z) || 1;
        nrm.push((x - cx) / l, (y - cy) / l, z / l);
        uv.push(i / tubularSegments, j / radialSegments);
      }
    }
    for (let j = 1; j <= radialSegments; j++) for (let i = 1; i <= tubularSegments; i++) {
      const a = (tubularSegments + 1) * j + i - 1, b = (tubularSegments + 1) * (j - 1) + i - 1, c = (tubularSegments + 1) * (j - 1) + i, d = (tubularSegments + 1) * j + i;
      idx.push(a, b, d, b, c, d);
    }
    this.copy(geo('TorusGeometry', idx, pos, nrm, uv));
    this.type = 'TorusGeometry';
  }
}

export class PlaneGeometry extends BufferGeometry {
  constructor(width = 1, height = 1, ws = 1, hs = 1) {
    super();
    const gx = Math.floor(ws), gy = Math.floor(hs), g1 = gx + 1, sw = width / gx, sh = height / gy;
    const idx: number[] = [], pos: number[] = [], nrm: number[] = [], uv: number[] = [];
    for (let iy = 0; iy <= gy; iy++) { const y = iy * sh - height / 2; for (let ix = 0; ix <= gx; ix++) { const x = ix * sw - width / 2; pos.push(x, -y, 0); nrm.push(0, 0, 1); uv.push(ix / gx, 1 - iy / gy); } }
    for (let iy = 0; iy < gy; iy++) for (let ix = 0; ix < gx; ix++) { const a = ix + g1 * iy, b = ix + g1 * (iy + 1), c = ix + 1 + g1 * (iy + 1), d = ix + 1 + g1 * iy; idx.push(a, b, d, b, c, d); }
    this.copy(geo('PlaneGeometry', idx, pos, nrm, uv));
    this.type = 'PlaneGeometry';
  }
}

export class CircleGeometry extends BufferGeometry {
  constructor(radius = 1, segments = 32, thetaStart = 0, thetaLength = Math.PI * 2) {
    super();
    segments = Math.max(3, segments);
    const idx: number[] = [], pos: number[] = [0, 0, 0], nrm: number[] = [0, 0, 1], uv: number[] = [0.5, 0.5];
    for (let s = 0; s <= segments; s++) {
      const a = thetaStart + (s / segments) * thetaLength, x = radius * Math.cos(a), y = radius * Math.sin(a);
      pos.push(x, y, 0); nrm.push(0, 0, 1); uv.push((x / radius + 1) / 2, (y / radius + 1) / 2);
    }
    for (let i = 1; i <= segments; i++) idx.push(i, i + 1, 0);
    this.copy(geo('CircleGeometry', idx, pos, nrm, uv));
    this.type = 'CircleGeometry';
  }
}

export class RingGeometry extends BufferGeometry {
  constructor(innerRadius = 0.5, outerRadius = 1, thetaSegments = 32, phiSegments = 1, thetaStart = 0, thetaLength = Math.PI * 2) {
    super();
    thetaSegments = Math.max(3, thetaSegments); phiSegments = Math.max(1, phiSegments);
    const idx: number[] = [], pos: number[] = [], nrm: number[] = [], uv: number[] = [];
    let r = innerRadius;
    const step = (outerRadius - innerRadius) / phiSegments;
    for (let j = 0; j <= phiSegments; j++) {
      for (let i = 0; i <= thetaSegments; i++) {
        const a = thetaStart + (i / thetaSegments) * thetaLength, x = r * Math.cos(a), y = r * Math.sin(a);
        pos.push(x, y, 0); nrm.push(0, 0, 1); uv.push((x / outerRadius + 1) / 2, (y / outerRadius + 1) / 2);
      }
      r += step;
    }
    for (let j = 0; j < phiSegments; j++) {
      const lvl = j * (thetaSegments + 1);
      for (let i = 0; i < thetaSegments; i++) { const s = i + lvl, a = s, b = s + thetaSegments + 1, c = s + thetaSegments + 2, d = s + 1; idx.push(a, b, d, b, c, d); }
    }
    this.copy(geo('RingGeometry', idx, pos, nrm, uv));
    this.type = 'RingGeometry';
  }
}

export class LatheGeometry extends BufferGeometry {
  constructor(points: Vector2[] = [new Vector2(0, -0.5), new Vector2(0.5, 0), new Vector2(0, 0.5)], segments = 12, phiStart = 0, phiLength = Math.PI * 2) {
    super();
    segments = Math.floor(segments);
    phiLength = Math.max(0, Math.min(Math.PI * 2, phiLength));
    const idx: number[] = [], pos: number[] = [], nrm: number[] = [], uv: number[] = [], init: number[] = [];
    let px = 0, py = 0;
    for (let j = 0; j < points.length; j++) {
      if (j === points.length - 1) { init.push(px, py, 0); break; }
      const dx = points[j + 1].x - points[j].x, dy = points[j + 1].y - points[j].y;
      let nx = dy, ny = -dx;
      if (j > 0) { nx += px; ny += py; }
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      init.push(nx, ny, 0);
      px = nx; py = ny;
    }
    for (let i = 0; i <= segments; i++) {
      const phi = phiStart + (i / segments) * phiLength, s = Math.sin(phi), c = Math.cos(phi);
      for (let j = 0; j < points.length; j++) {
        pos.push(points[j].x * s, points[j].y, points[j].x * c);
        uv.push(i / segments, j / (points.length - 1));
        nrm.push(init[3 * j] * s, init[3 * j + 1], init[3 * j] * c);
      }
    }
    for (let i = 0; i < segments; i++) for (let j = 0; j < points.length - 1; j++) {
      const b = j + i * points.length, a = b, bb = b + points.length, c = b + points.length + 1, d = b + 1;
      idx.push(a, bb, d, c, d, bb);
    }
    this.copy(geo('LatheGeometry', idx, pos, nrm, uv));
    this.type = 'LatheGeometry';
  }
}

/** Three.js's PolyhedronGeometry (icosahedron, octahedron): subdivided, on the sphere, flat normals at detail 0 */
class PolyhedronGeometry extends BufferGeometry {
  constructor(vertices: number[], indices: number[], radius = 1, detail = 0) {
    super();
    const buf: number[] = [];
    const sub = (a: number[], b: number[], c: number[], d: number) => {
      const cols = d + 1, v: number[][][] = [];
      for (let i = 0; i <= cols; i++) {
        v[i] = [];
        const aj = a.map((x, k) => x + (c[k] - x) * (i / cols)), bj = b.map((x, k) => x + (c[k] - x) * (i / cols)), rows = cols - i;
        for (let j = 0; j <= rows; j++) v[i][j] = j === 0 && i === cols ? aj : aj.map((x, k) => x + (bj[k] - x) * (j / rows));
      }
      for (let i = 0; i < cols; i++) for (let j = 0; j < 2 * (cols - i) - 1; j++) {
        const k = Math.floor(j / 2);
        if (j % 2 === 0) buf.push(...v[i][k + 1], ...v[i + 1][k], ...v[i][k]);
        else buf.push(...v[i][k + 1], ...v[i + 1][k + 1], ...v[i + 1][k]);
      }
    };
    for (let i = 0; i < indices.length; i += 3) {
      const g = (j: number) => [vertices[indices[j] * 3], vertices[indices[j] * 3 + 1], vertices[indices[j] * 3 + 2]];
      sub(g(i), g(i + 1), g(i + 2), detail);
    }
    for (let i = 0; i < buf.length; i += 3) { const l = Math.hypot(buf[i], buf[i + 1], buf[i + 2]) || 1; buf[i] = (buf[i] / l) * radius; buf[i + 1] = (buf[i + 1] / l) * radius; buf[i + 2] = (buf[i + 2] / l) * radius; }
    const uv: number[] = [];
    for (let i = 0; i < buf.length; i += 3) { const x = buf[i], y = buf[i + 1], z = buf[i + 2]; uv.push(Math.atan2(z, -x) / 2 / Math.PI + 0.5, Math.atan2(-y, Math.hypot(x, z)) / Math.PI + 0.5); }
    this.setAttribute('position', new Float32BufferAttribute(buf, 3));
    this.setAttribute('uv', new Float32BufferAttribute(uv, 2));
    if (detail === 0) this.computeVertexNormals();
    else { const n = buf.map((v) => v / radius); this.setAttribute('normal', new Float32BufferAttribute(n, 3)); }
  }
}
export class IcosahedronGeometry extends PolyhedronGeometry {
  constructor(radius = 1, detail = 0) {
    const t = (1 + Math.sqrt(5)) / 2;
    super([-1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0, 0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1],
      [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1], radius, detail);
    this.type = 'IcosahedronGeometry';
  }
}
export class OctahedronGeometry extends PolyhedronGeometry {
  constructor(radius = 1, detail = 0) {
    super([1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1], [0, 2, 4, 0, 4, 3, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 3, 1, 3, 4, 1, 4, 2], radius, detail);
    this.type = 'OctahedronGeometry';
  }
}

/** a box with rounded edges (Three.js's RoundedBoxGeometry: a segmented box whose vertices are pulled onto rounded
 *  corners, normals from the corner spheres) */
export class RoundedBoxGeometry extends BoxGeometry {
  constructor(width = 1, height = 1, depth = 1, segments = 2, radius = 0.1) {
    const seg = segments * 2 + 1;
    radius = Math.min(width / 2, height / 2, depth / 2, radius);
    super(width, height, depth, seg, seg, seg);
    this.type = 'RoundedBoxGeometry';
    // each vertex of the segmented box is pulled onto a box of the inner extents grown by the radius: flat faces
    // stay flat, edges and corners round off (normals from the rounding direction)
    const p = this.attributes.position, n = this.attributes.normal;
    const hx = width / 2 - radius, hy = height / 2 - radius, hz = depth / 2 - radius;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const qx = Math.max(-hx, Math.min(hx, x)), qy = Math.max(-hy, Math.min(hy, y)), qz = Math.max(-hz, Math.min(hz, z));
      let dx = x - qx, dy = y - qy, dz = z - qz;
      const l = Math.hypot(dx, dy, dz) || 1;
      dx /= l; dy /= l; dz /= l;
      p.setXYZ(i, qx + dx * radius, qy + dy * radius, qz + dz * radius);
      n.setXYZ(i, dx, dy, dz);
    }
  }
}

/** Three.js's mergeGeometries: the same attributes on every part; index kept (parts made indexed if needed) */
export function mergeGeometries(parts: BufferGeometry[], useGroups = false): BufferGeometry {
  const out = new BufferGeometry();
  const names = Object.keys(parts[0].attributes);
  const indexed = parts.some((g) => g.index);
  const arrays: Record<string, number[]> = {};
  const sizes: Record<string, number> = {};
  for (const n of names) { arrays[n] = []; sizes[n] = parts[0].attributes[n].itemSize; }
  const idx: number[] = [];
  let offset = 0, start = 0;
  parts.forEach((g, gi) => {
    const count = g.attributes.position.count;
    for (const n of names) {
      const a = g.attributes[n];
      if (!a) throw new Error(`mergeGeometries: part ${gi} has no ${n}`);
      for (let i = 0; i < a.count * a.itemSize; i++) arrays[n].push(a.normalized ? (a.array instanceof Uint8Array ? a.array[i] / 255 : a.array[i]) : a.array[i]);
    }
    let n = 0;
    if (indexed) {
      if (g.index) { for (let i = 0; i < g.index.count; i++) idx.push(g.index.array[i] + offset); n = g.index.count; }
      else { for (let i = 0; i < count; i++) idx.push(i + offset); n = count; }
    } else n = count;
    if (useGroups) out.addGroup(start, n, gi);
    start += n;
    offset += count;
  });
  for (const n of names) out.setAttribute(n, new Float32BufferAttribute(arrays[n], sizes[n]));
  if (indexed) out.setIndex(idx);
  return out;
}

export class Shape {
  constructor(public points: Vector2[] = []) {}
}

export class InstancedBufferAttribute extends BufferAttribute {}

/** welds vertices whose every attribute matches (to 4 decimals), as Three.js's BufferGeometryUtils.mergeVertices */
export function mergeVertices(g: BufferGeometry, tolerance = 1e-4): BufferGeometry {
  const names = Object.keys(g.attributes), count = g.attributes.position.count, k = 1 / tolerance;
  const map = new Map<string, number>(), out: Record<string, number[]> = {}, idx: number[] = [];
  for (const n of names) out[n] = [];
  const src = g.index ? Array.from(g.index.array as ArrayLike<number>) : Array.from({ length: count }, (_, i) => i);
  let next = 0;
  for (const i of src) {
    let key = '';
    for (const n of names) { const a = g.attributes[n]; for (let c = 0; c < a.itemSize; c++) key += Math.round(a.array[i * a.itemSize + c] * k) + ','; }
    let j = map.get(key);
    if (j === undefined) {
      j = next++;
      map.set(key, j);
      for (const n of names) { const a = g.attributes[n]; for (let c = 0; c < a.itemSize; c++) out[n].push(a.array[i * a.itemSize + c]); }
    }
    idx.push(j);
  }
  const r = new BufferGeometry();
  for (const n of names) r.setAttribute(n, new BufferAttribute(new Float32Array(out[n]), g.attributes[n].itemSize, g.attributes[n].normalized));
  r.setIndex(idx);
  return r;
}
