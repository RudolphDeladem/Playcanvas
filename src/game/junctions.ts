// Where the ridden route meets other roads (no DOM: the route tests use it too).
import { NODE_XZ, ROADS } from './campusmap';
import type { Track } from './track';

/**
 * Where the route's pavements must stop: each mapped road (not a footpath) that leaves the route crosses the
 * pavement band on one side. Returns the gaps along the route, [left side, right side], as [from, to] distances.
 */
export function walkGaps(track: Track, ROAD_HALF: number, ROAD_WIDTH: readonly number[]): [number, number][][] {
  const gaps: [number, number][][] = [[], []];
  const bb = track.bounds(), pad = 20, band0 = ROAD_HALF + 0.2, band1 = ROAD_HALF + 3.5;
  for (const r of ROADS) {
    if (r.cls >= 4) continue;
    let state: 'in' | 'out' | null = null, cand: { x: number; z: number; dist: number; dx: number; dz: number } | null = null;
    for (let i = 0; i + 1 < r.nodes.length; i++) {
      const ax = NODE_XZ[r.nodes[i] * 2], az = NODE_XZ[r.nodes[i] * 2 + 1], bx = NODE_XZ[r.nodes[i + 1] * 2], bz = NODE_XZ[r.nodes[i + 1] * 2 + 1];
      if (Math.max(ax, bx) < bb.minX - pad || Math.min(ax, bx) > bb.maxX + pad || Math.max(az, bz) < bb.minZ - pad || Math.min(az, bz) > bb.maxZ + pad) { state = null; cand = null; continue; }
      const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(len / 0.5)), dx = (bx - ax) / (len || 1), dz = (bz - az) / (len || 1);
      for (let k = 0; k <= n; k++) {
        const x = ax + ((bx - ax) * k) / n, z = az + ((bz - az) * k) / n, dist = track.distanceToRoad(x, z);
        const now = dist < band0 ? 'in' : dist > band1 ? 'out' : null;
        if (!now) {
          // inside the pavement band: keep the point nearest the middle of the pavement
          const mid = ROAD_HALF + 0.8;
          if (!cand || Math.abs(dist - mid) < Math.abs(cand.dist - mid)) cand = { x, z, dist, dx, dz };
          continue;
        }
        if (state && now !== state && cand) {
          const p = track.project(cand.x, cand.z), t = track.pose(p.d);
          const sin = Math.abs(cand.dx * t.tz - cand.dz * t.tx);
          const half = ROAD_WIDTH[r.cls] / 2 / Math.max(0.35, sin) + 1.5;
          gaps[p.lateral > 0 ? 1 : 0].push([p.d - half, p.d + half]);
        }
        state = now; cand = null;
      }
    }
  }
  return gaps;
}
