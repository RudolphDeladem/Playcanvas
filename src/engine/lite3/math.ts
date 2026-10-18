// Small math types with the Three.js-style API the ported model code uses (Vector2/3, Quaternion, Euler, Matrix4,
// Color). Plain numbers; PlayCanvas does the rendering. Only the methods the game's model code calls are here.
/* eslint-disable @typescript-eslint/no-this-alias */

export class Vector2 {
  constructor(public x = 0, public y = 0) {}
  set(x: number, y: number) { this.x = x; this.y = y; return this; }
  clone() { return new Vector2(this.x, this.y); }
  copy(v: Vector2) { this.x = v.x; this.y = v.y; return this; }
  isVector2 = true;
}

export class Vector3 {
  isVector3 = true;
  _onChange: (() => void) | null = null;
  constructor(public x = 0, public y = 0, public z = 0) {}
  private ch() { this._onChange?.(); return this; }
  set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; return this.ch(); }
  setScalar(s: number) { this.x = this.y = this.z = s; return this.ch(); }
  setX(v: number) { this.x = v; return this.ch(); }
  setY(v: number) { this.y = v; return this.ch(); }
  setZ(v: number) { this.z = v; return this.ch(); }
  clone() { return new Vector3(this.x, this.y, this.z); }
  copy(v: { x: number; y: number; z: number }) { this.x = v.x; this.y = v.y; this.z = v.z; return this.ch(); }
  add(v: Vector3) { this.x += v.x; this.y += v.y; this.z += v.z; return this.ch(); }
  addScalar(s: number) { this.x += s; this.y += s; this.z += s; return this.ch(); }
  addVectors(a: Vector3, b: Vector3) { this.x = a.x + b.x; this.y = a.y + b.y; this.z = a.z + b.z; return this.ch(); }
  addScaledVector(v: Vector3, s: number) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this.ch(); }
  sub(v: Vector3) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this.ch(); }
  subVectors(a: Vector3, b: Vector3) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this.ch(); }
  multiplyScalar(s: number) { this.x *= s; this.y *= s; this.z *= s; return this.ch(); }
  multiply(v: Vector3) { this.x *= v.x; this.y *= v.y; this.z *= v.z; return this.ch(); }
  divideScalar(s: number) { return this.multiplyScalar(1 / s); }
  negate() { this.x = -this.x; this.y = -this.y; this.z = -this.z; return this.ch(); }
  dot(v: Vector3) { return this.x * v.x + this.y * v.y + this.z * v.z; }
  cross(v: Vector3) { return this.crossVectors(this, v); }
  crossVectors(a: Vector3, b: Vector3) { const ax = a.x, ay = a.y, az = a.z, bx = b.x, by = b.y, bz = b.z; this.x = ay * bz - az * by; this.y = az * bx - ax * bz; this.z = ax * by - ay * bx; return this.ch(); }
  length() { return Math.hypot(this.x, this.y, this.z); }
  lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
  normalize() { return this.divideScalar(this.length() || 1); }
  setLength(l: number) { return this.normalize().multiplyScalar(l); }
  distanceTo(v: Vector3) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
  distanceToSquared(v: Vector3) { const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z; return dx * dx + dy * dy + dz * dz; }
  lerp(v: Vector3, t: number) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; this.z += (v.z - this.z) * t; return this.ch(); }
  lerpVectors(a: Vector3, b: Vector3, t: number) { this.x = a.x + (b.x - a.x) * t; this.y = a.y + (b.y - a.y) * t; this.z = a.z + (b.z - a.z) * t; return this.ch(); }
  applyMatrix4(m: Matrix4) {
    const x = this.x, y = this.y, z = this.z, e = m.elements;
    const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15] || 1);
    this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w; this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w; this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
    return this.ch();
  }
  applyQuaternion(q: Quaternion) {
    const vx = this.x, vy = this.y, vz = this.z, qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    const tx = 2 * (qy * vz - qz * vy), ty = 2 * (qz * vx - qx * vz), tz = 2 * (qx * vy - qy * vx);
    this.x = vx + qw * tx + qy * tz - qz * ty; this.y = vy + qw * ty + qz * tx - qx * tz; this.z = vz + qw * tz + qx * ty - qy * tx;
    return this.ch();
  }
  applyAxisAngle(axis: Vector3, a: number) { return this.applyQuaternion(new Quaternion().setFromAxisAngle(axis, a)); }
  fromArray(a: ArrayLike<number>, o = 0) { this.x = a[o]; this.y = a[o + 1]; this.z = a[o + 2]; return this.ch(); }
  toArray(a: number[] = [], o = 0) { a[o] = this.x; a[o + 1] = this.y; a[o + 2] = this.z; return a; }
  fromBufferAttribute(attr: { getX(i: number): number; getY(i: number): number; getZ(i: number): number }, i: number) { this.x = attr.getX(i); this.y = attr.getY(i); this.z = attr.getZ(i); return this.ch(); }
  equals(v: Vector3) { return v.x === this.x && v.y === this.y && v.z === this.z; }
}

export class Euler {
  isEuler = true;
  _onChange: (() => void) | null = null;
  constructor(private _x = 0, private _y = 0, private _z = 0, private _order = 'XYZ') {}
  get x() { return this._x; } set x(v) { this._x = v; this._onChange?.(); }
  get y() { return this._y; } set y(v) { this._y = v; this._onChange?.(); }
  get z() { return this._z; } set z(v) { this._z = v; this._onChange?.(); }
  get order() { return this._order; } set order(v) { this._order = v; this._onChange?.(); }
  set(x: number, y: number, z: number, order = this._order) { this._x = x; this._y = y; this._z = z; this._order = order; this._onChange?.(); return this; }
  copy(e: Euler) { return this.set(e.x, e.y, e.z, e.order); }
  setFromQuaternion(q: Quaternion, order = this._order, update = true) {
    // only the orders the model code uses: XYZ and YXZ
    const m = new Matrix4().makeRotationFromQuaternion(q).elements;
    const m11 = m[0], m12 = m[4], m13 = m[8], m21 = m[1], m22 = m[5], m23 = m[9], m31 = m[2], m32 = m[6], m33 = m[10];
    const c = (v: number) => Math.max(-1, Math.min(1, v));
    if (order === 'YXZ') {
      this._x = Math.asin(-c(m23));
      if (Math.abs(m23) < 0.9999999) { this._y = Math.atan2(m13, m33); this._z = Math.atan2(m21, m22); } else { this._y = Math.atan2(-m31, m11); this._z = 0; }
    } else {
      this._y = Math.asin(c(m13));
      if (Math.abs(m13) < 0.9999999) { this._x = Math.atan2(-m23, m33); this._z = Math.atan2(-m12, m11); } else { this._x = Math.atan2(m32, m22); this._z = 0; }
    }
    this._order = order;
    if (update) this._onChange?.();
    return this;
  }
}

export class Quaternion {
  isQuaternion = true;
  _onChange: (() => void) | null = null;
  constructor(public x = 0, public y = 0, public z = 0, public w = 1) {}
  private ch() { this._onChange?.(); return this; }
  set(x: number, y: number, z: number, w: number) { this.x = x; this.y = y; this.z = z; this.w = w; return this.ch(); }
  clone() { return new Quaternion(this.x, this.y, this.z, this.w); }
  copy(q: Quaternion) { return this.set(q.x, q.y, q.z, q.w); }
  identity() { return this.set(0, 0, 0, 1); }
  setFromAxisAngle(axis: Vector3, angle: number) { const h = angle / 2, s = Math.sin(h); return this.set(axis.x * s, axis.y * s, axis.z * s, Math.cos(h)); }
  setFromEuler(e: Euler) {
    const c1 = Math.cos(e.x / 2), c2 = Math.cos(e.y / 2), c3 = Math.cos(e.z / 2), s1 = Math.sin(e.x / 2), s2 = Math.sin(e.y / 2), s3 = Math.sin(e.z / 2);
    if (e.order === 'YXZ') return this.set(s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 - s1 * s2 * c3, c1 * c2 * c3 + s1 * s2 * s3);
    if (e.order === 'ZYX') return this.set(s1 * c2 * c3 - c1 * s2 * s3, c1 * s2 * c3 + s1 * c2 * s3, c1 * c2 * s3 - s1 * s2 * c3, c1 * c2 * c3 + s1 * s2 * s3);
    return this.set(s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3);
  }
  setFromUnitVectors(from: Vector3, to: Vector3) {
    let r = from.dot(to) + 1;
    let x: number, y: number, z: number;
    if (r < 1e-8) {
      r = 0;
      if (Math.abs(from.x) > Math.abs(from.z)) { x = -from.y; y = from.x; z = 0; } else { x = 0; y = -from.z; z = from.y; }
    } else { x = from.y * to.z - from.z * to.y; y = from.z * to.x - from.x * to.z; z = from.x * to.y - from.y * to.x; }
    const l = Math.hypot(x, y, z, r) || 1;
    return this.set(x / l, y / l, z / l, r / l);
  }
  multiply(q: Quaternion) { return this.multiplyQuaternions(this, q); }
  premultiply(q: Quaternion) { return this.multiplyQuaternions(q, this); }
  multiplyQuaternions(a: Quaternion, b: Quaternion) {
    const ax = a.x, ay = a.y, az = a.z, aw = a.w, bx = b.x, by = b.y, bz = b.z, bw = b.w;
    return this.set(ax * bw + aw * bx + ay * bz - az * by, ay * bw + aw * by + az * bx - ax * bz, az * bw + aw * bz + ax * by - ay * bx, aw * bw - ax * bx - ay * by - az * bz);
  }
  normalize() { const l = Math.hypot(this.x, this.y, this.z, this.w) || 1; return this.set(this.x / l, this.y / l, this.z / l, this.w / l); }
  invert() { return this.set(-this.x, -this.y, -this.z, this.w); }
  slerp(q: Quaternion, t: number) {
    let cos = this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w, qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    if (cos < 0) { cos = -cos; qx = -qx; qy = -qy; qz = -qz; qw = -qw; }
    if (cos > 0.9995) return this.set(this.x + (qx - this.x) * t, this.y + (qy - this.y) * t, this.z + (qz - this.z) * t, this.w + (qw - this.w) * t).normalize();
    const a = Math.acos(cos), s = Math.sin(a), k0 = Math.sin((1 - t) * a) / s, k1 = Math.sin(t * a) / s;
    return this.set(this.x * k0 + qx * k1, this.y * k0 + qy * k1, this.z * k0 + qz * k1, this.w * k0 + qw * k1);
  }
}

export class Matrix4 {
  isMatrix4 = true;
  elements = new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]) as unknown as number[];
  identity() { this.elements = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; return this; }
  clone() { const m = new Matrix4(); m.elements = Array.from(this.elements); return m; }
  copy(m: Matrix4) { this.elements = Array.from(m.elements); return this; }
  fromArray(a: ArrayLike<number>, o = 0) { this.elements = Array.from({ length: 16 }, (_, i) => a[o + i]); return this; }
  toArray(a: number[] | Float32Array = [], o = 0) { for (let i = 0; i < 16; i++) a[o + i] = this.elements[i]; return a; }
  compose(p: Vector3, q: Quaternion, s: Vector3) {
    const x = q.x, y = q.y, z = q.z, w = q.w, x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
    this.elements = [
      (1 - (yy + zz)) * s.x, (xy + wz) * s.x, (xz - wy) * s.x, 0,
      (xy - wz) * s.y, (1 - (xx + zz)) * s.y, (yz + wx) * s.y, 0,
      (xz + wy) * s.z, (yz - wx) * s.z, (1 - (xx + yy)) * s.z, 0,
      p.x, p.y, p.z, 1,
    ];
    return this;
  }
  makeRotationFromQuaternion(q: Quaternion) { return this.compose(new Vector3(), q, new Vector3(1, 1, 1)); }
  makeTranslation(x: number | Vector3, y?: number, z?: number) { if (typeof x === 'object') { y = x.y; z = x.z; x = x.x; } this.identity(); this.elements[12] = x; this.elements[13] = y!; this.elements[14] = z!; return this; }
  makeScale(x: number, y: number, z: number) { this.elements = [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1]; return this; }
  makeRotationX(t: number) { const c = Math.cos(t), s = Math.sin(t); this.elements = [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; return this; }
  makeRotationY(t: number) { const c = Math.cos(t), s = Math.sin(t); this.elements = [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; return this; }
  makeRotationZ(t: number) { const c = Math.cos(t), s = Math.sin(t); this.elements = [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; return this; }
  multiply(m: Matrix4) { return this.multiplyMatrices(this, m); }
  premultiply(m: Matrix4) { return this.multiplyMatrices(m, this); }
  multiplyMatrices(a: Matrix4, b: Matrix4) {
    const ae = a.elements, be = b.elements, r = new Array(16);
    for (let c = 0; c < 4; c++) for (let rr = 0; rr < 4; rr++) { let s = 0; for (let k = 0; k < 4; k++) s += ae[k * 4 + rr] * be[c * 4 + k]; r[c * 4 + rr] = s; }
    this.elements = r;
    return this;
  }
  decompose(p: Vector3, q: Quaternion, s: Vector3) {
    const e = this.elements;
    let sx = Math.hypot(e[0], e[1], e[2]);
    const sy = Math.hypot(e[4], e[5], e[6]), sz = Math.hypot(e[8], e[9], e[10]);
    const det = e[0] * (e[5] * e[10] - e[9] * e[6]) - e[4] * (e[1] * e[10] - e[9] * e[2]) + e[8] * (e[1] * e[6] - e[5] * e[2]);
    if (det < 0) sx = -sx;
    p.set(e[12], e[13], e[14]);
    const m11 = e[0] / sx, m12 = e[4] / sy, m13 = e[8] / sz, m21 = e[1] / sx, m22 = e[5] / sy, m23 = e[9] / sz, m31 = e[2] / sx, m32 = e[6] / sy, m33 = e[10] / sz;
    const tr = m11 + m22 + m33;
    if (tr > 0) { const S = 0.5 / Math.sqrt(tr + 1); q.set((m32 - m23) * S, (m13 - m31) * S, (m21 - m12) * S, 0.25 / S); }
    else if (m11 > m22 && m11 > m33) { const S = 2 * Math.sqrt(1 + m11 - m22 - m33); q.set(0.25 * S, (m12 + m21) / S, (m13 + m31) / S, (m32 - m23) / S); }
    else if (m22 > m33) { const S = 2 * Math.sqrt(1 + m22 - m11 - m33); q.set((m12 + m21) / S, 0.25 * S, (m23 + m32) / S, (m13 - m31) / S); }
    else { const S = 2 * Math.sqrt(1 + m33 - m11 - m22); q.set((m13 + m31) / S, (m23 + m32) / S, 0.25 * S, (m21 - m12) / S); }
    s.set(sx, sy, sz);
    return this;
  }
  invert() {
    const m = this.elements, inv = new Array(16);
    inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] + m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
    inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] - m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
    inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] + m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
    inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] - m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
    inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] - m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
    inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] + m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
    inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] - m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
    inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] + m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
    inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] + m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
    inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] - m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
    inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] + m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
    inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] - m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
    inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] - m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
    inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] + m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
    inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] - m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
    inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] + m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];
    const det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
    this.elements = inv.map((v) => v / (det || 1));
    return this;
  }
}

/** a colour in linear components (as Three.js keeps them), set from sRGB hex/strings */
const toLin = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const toSrgb = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
const NAMED: Record<string, string> = { white: '#ffffff', black: '#000000', red: '#ff0000', green: '#008000', blue: '#0000ff', yellow: '#ffff00', orange: '#ffa500', gray: '#808080', grey: '#808080' };
export type ColorRepresentation = string | number | Color;
export class Color {
  isColor = true;
  r = 1; g = 1; b = 1;
  _onChange: (() => void) | null = null;
  constructor(c?: ColorRepresentation, g?: number, b?: number) { if (g !== undefined && typeof c === 'number') { this.r = c; this.g = g; this.b = b ?? 0; } else if (c !== undefined) this.set(c); }
  set(c: ColorRepresentation) {
    if (c instanceof Color) { this.r = c.r; this.g = c.g; this.b = c.b; }
    else if (typeof c === 'number') this.setHex(c);
    else this.setStyle(c);
    this._onChange?.();
    return this;
  }
  setHex(h: number) { this.r = toLin(((h >> 16) & 255) / 255); this.g = toLin(((h >> 8) & 255) / 255); this.b = toLin((h & 255) / 255); this._onChange?.(); return this; }
  setStyle(s: string) {
    s = NAMED[s.toLowerCase()] ?? s;
    let m = s.match(/^#([0-9a-f]{6})$/i);
    if (m) return this.setHex(parseInt(m[1], 16));
    m = s.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
    if (m) return this.setHex(parseInt(m[1] + m[1] + m[2] + m[2] + m[3] + m[3], 16));
    m = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (m) { this.r = toLin(+m[1] / 255); this.g = toLin(+m[2] / 255); this.b = toLin(+m[3] / 255); this._onChange?.(); return this; }
    m = s.match(/^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/i);
    if (m) return this.setHSL(+m[1] / 360, +m[2] / 100, +m[3] / 100);
    return this;
  }
  /** h, s, l in sRGB terms (as Three.js's setHSL with its default colour management) */
  setHSL(h: number, s: number, l: number) {
    h = ((h % 1) + 1) % 1;
    const q = l <= 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = (t: number) => { t = ((t % 1) + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * 6 * (2 / 3 - t) : p; };
    this.r = toLin(f(h + 1 / 3)); this.g = toLin(f(h)); this.b = toLin(f(h - 1 / 3));
    this._onChange?.();
    return this;
  }
  setRGB(r: number, g: number, b: number) { this.r = r; this.g = g; this.b = b; this._onChange?.(); return this; }
  setScalar(s: number) { this.r = this.g = this.b = s; this._onChange?.(); return this; }
  clone() { const c = new Color(); c.r = this.r; c.g = this.g; c.b = this.b; return c; }
  copy(c: Color) { this.r = c.r; this.g = c.g; this.b = c.b; this._onChange?.(); return this; }
  multiplyScalar(s: number) { this.r *= s; this.g *= s; this.b *= s; this._onChange?.(); return this; }
  multiply(c: Color) { this.r *= c.r; this.g *= c.g; this.b *= c.b; this._onChange?.(); return this; }
  lerp(c: Color, t: number) { this.r += (c.r - this.r) * t; this.g += (c.g - this.g) * t; this.b += (c.b - this.b) * t; this._onChange?.(); return this; }
  offsetHSL(h: number, s: number, l: number) { const hsl = this.getHSL(); return this.setHSL(hsl.h + h, Math.max(0, Math.min(1, hsl.s + s)), Math.max(0, Math.min(1, hsl.l + l))); }
  getHSL(t = { h: 0, s: 0, l: 0 }) {
    const r = toSrgb(this.r), g = toSrgb(this.g), b = toSrgb(this.b), max = Math.max(r, g, b), min = Math.min(r, g, b), l = (min + max) / 2;
    let h = 0, s = 0;
    if (min !== max) { const d = max - min; s = l <= 0.5 ? d / (max + min) : d / (2 - max - min); h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
    t.h = h; t.s = s; t.l = l; return t;
  }
  getHex() { return (Math.round(Math.max(0, Math.min(1, toSrgb(this.r))) * 255) << 16) | (Math.round(Math.max(0, Math.min(1, toSrgb(this.g))) * 255) << 8) | Math.round(Math.max(0, Math.min(1, toSrgb(this.b))) * 255); }
  getHexString() { return this.getHex().toString(16).padStart(6, '0'); }
  getStyle() { return '#' + this.getHexString(); }
  /** sRGB components for PlayCanvas (whose material colours are sRGB) */
  srgb(): [number, number, number] { return [toSrgb(Math.max(0, this.r)), toSrgb(Math.max(0, this.g)), toSrgb(Math.max(0, this.b))]; }
}

export const MathUtils = {
  lerp: (a: number, b: number, t: number) => a + (b - a) * t,
  clamp: (v: number, a: number, b: number) => Math.max(a, Math.min(b, v)),
  degToRad: (d: number) => (d * Math.PI) / 180,
  radToDeg: (r: number) => (r * 180) / Math.PI,
  smoothstep: (x: number, a: number, b: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); },
};
