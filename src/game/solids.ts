// Round solids a free-ridden bike can't pass (Explore's free ride, Game.ts): tree trunks and palms
// of the campus, the gardens and the ridden route, kept in a grid for quick lookups.
const CELL = 16;
const key = (i: number, j: number) => (i + 4096) * 8192 + (j + 4096);
type Solid = [number, number, number];

/** on while a streamed site is rebuilt (streaming.ts): its solids are already in the grids from its first build */
let MUTED = false;
export const muteSolids = (on: boolean) => { MUTED = on; };
class SolidGrid {
  private cells = new Map<number, Solid[]>();
  add(x: number, z: number, r: number) {
    if (MUTED) return;
    const k = key(Math.floor(x / CELL), Math.floor(z / CELL));
    let c = this.cells.get(k);
    if (!c) this.cells.set(k, (c = []));
    c.push([x, z, r]);
  }
  clear() { this.cells.clear(); }
  /** keeps only the solids keep() says yes to */
  filter(keep: (x: number, z: number) => boolean) { for (const [k, l] of this.cells) this.cells.set(k, l.filter(([x, z]) => keep(x, z))); }
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
/** what stands up on the bridge decks over the Legon Road cutting (the footways' railings and bollards): it stops
 *  someone on the deck, never the traffic on the road passing under the bridge (the owner, 2026-10-16: something
 *  invisible stopped the bike in the middle of the underpass at the main gate) */
export const DECK_SOLIDS = new SolidGrid();

/** open passages through a building's ground floor (no door, no gate: owner), world [x0, x1, z0, z1]: the free-ridden
 *  bike rides through the building's outline there; the passage's own walls and columns lie outside the rectangle */
export const PASSAGES: [number, number, number, number][] = [];
/** passages along a line at any angle (the halls' gateways, gateways.ts): from (x, z) along (ux, uz), a0..a1 metres
 *  along it, half width hw across it */
export const OPASSAGES: { x: number; z: number; ux: number; uz: number; a0: number; a1: number; hw: number }[] = [];
export const inPassage = (x: number, z: number) => PASSAGES.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1)
  || OPASSAGES.some((p) => { const dx = x - p.x, dz = z - p.z, a = dx * p.ux + dz * p.uz, b = -dx * p.uz + dz * p.ux; return a > p.a0 && a < p.a1 && Math.abs(b) < p.hw; });
