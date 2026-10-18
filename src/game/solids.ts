// Round solids a free-ridden bike can't pass (Explore's free ride, Game.ts): tree trunks and palms
// of the campus, the gardens and the ridden route, kept in a grid for quick lookups.
const CELL = 16;
const key = (i: number, j: number) => (i + 4096) * 8192 + (j + 4096);
type Solid = [number, number, number];

class SolidGrid {
  private cells = new Map<number, Solid[]>();
  add(x: number, z: number, r: number) {
    const k = key(Math.floor(x / CELL), Math.floor(z / CELL));
    let c = this.cells.get(k);
    if (!c) this.cells.set(k, (c = []));
    c.push([x, z, r]);
  }
  clear() { this.cells.clear(); }
  /** any solid within its radius (plus pad) of x, z */
  at(x: number, z: number, pad = 0) {
    const i0 = Math.floor((x - 4) / CELL), i1 = Math.floor((x + 4) / CELL), j0 = Math.floor((z - 4) / CELL), j1 = Math.floor((z + 4) / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      for (const [sx, sz, r] of this.cells.get(key(i, j)) ?? []) if (Math.hypot(x - sx, z - sz) < r + pad) return true;
    }
    return false;
  }
}

/** trees and palms of the campus and the modelled gardens (built once) */
export const SOLIDS = new SolidGrid();
/** trees along the current ridden route (rebuilt with each route) */
export const ROUTE_SOLIDS = new SolidGrid();
export const solidAt = (x: number, z: number, pad = 0) => SOLIDS.at(x, z, pad) || ROUTE_SOLIDS.at(x, z, pad);

/** open passages through a building's ground floor (no door, no gate: owner), world [x0, x1, z0, z1]: the free-ridden
 *  bike rides through the building's outline there; the passage's own walls and columns lie outside the rectangle */
export const PASSAGES: [number, number, number, number][] = [];
export const inPassage = (x: number, z: number) => PASSAGES.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1);
