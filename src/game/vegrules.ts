// Where a tree or plant may stand (the owner's ground and vegetation brief, 2026-10-19: no trees on roads, car parks,
// sidewalks, paved plazas or buildings). The converted campus's trees and plants (instanced, tagged 'crown' or 'plant')
// are left out where their trunk stands on hard ground, by the map's evidence only:
// - a road or footpath of the map, at its drawn width (life.ts roadClearance);
// - a sidewalk drawn by roadedges.ts, or a corrected car park, plaza or paved path of surfaces.ts;
// - a mapped car park, plaza or sports pitch (campusmap.ts AREAS);
// - a building's footprint.
// Trees beside the roads, in lawns and in the planted islands the sites model stay where the original put them.
import { AREAS, buildingAt } from './campusmap';
import { roadClearance } from './life';
import { onEdges } from './roadedges';
import { onHardSurface } from './surfaces';

const GRID = 32;
const key = (i: number, j: number) => (i + 4096) * 8192 + (j + 4096);
let areaGrid: Map<number, Float32Array[]> | null = null;
function inMappedHardArea(x: number, z: number) {
  if (!areaGrid) {
    areaGrid = new Map();
    for (const a of AREAS) {
      if (a.kind !== 'parking' && a.kind !== 'plaza' && a.kind !== 'pitch') continue;
      const p = a.pts;
      let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (let i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); z0 = Math.min(z0, p[i + 1]); z1 = Math.max(z1, p[i + 1]); }
      for (let i = Math.floor(x0 / GRID); i <= Math.floor(x1 / GRID); i++) for (let j = Math.floor(z0 / GRID); j <= Math.floor(z1 / GRID); j++) { const k = key(i, j); let l = areaGrid.get(k); if (!l) areaGrid.set(k, (l = [])); l.push(p); }
    }
  }
  for (const p of areaGrid.get(key(Math.floor(x / GRID), Math.floor(z / GRID))) ?? []) {
    let c = false;
    for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) if ((p[i + 1] > z) !== (p[j + 1] > z) && x < ((p[j] - p[i]) * (z - p[i + 1])) / (p[j + 1] - p[i + 1]) + p[i]) c = !c;
    if (c) return true;
  }
  return false;
}

/** trees and plants left out so far, by reason (the checks) */
export const VEG_DROPS = { road: 0, edge: 0, surface: 0, area: 0, building: 0, kept: 0 };
/** whether a tree or plant standing at (x, z) is on hard ground (and so left out) */
export function vegetationBlocked(x: number, z: number) {
  const why = roadClearance(x, z, 6, -1, true) < 0 ? 'road' : onEdges(x, z, 0.4) ? 'edge' : onHardSurface(x, z) ? 'surface' : inMappedHardArea(x, z) ? 'area' : buildingAt(x, z) ? 'building' : null;
  VEG_DROPS[why ?? 'kept']++;
  return why !== null;
}
