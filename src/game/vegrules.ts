// Where a tree or plant may stand (the owner's ground and vegetation brief, 2026-10-19: no trees on roads, car parks,
// sidewalks, paved plazas or buildings). The converted campus's trees and plants (instanced, tagged 'crown' or 'plant')
// are left out where their trunk stands on hard ground, by the map's evidence only:
// - a road or footpath of the map, at its drawn width (life.ts roadClearance);
// - a sidewalk drawn by roadedges.ts, or a corrected car park, plaza or paved path of surfaces.ts;
// - a mapped car park, plaza or sports pitch (campusmap.ts AREAS);
// - a building's footprint.
// Trees beside the roads, in lawns and in the planted islands the sites model stay where the original put them, except:
// - the Balme Library's tree groves either side of its forecourt and the tree rows along the lanes past the square
//   (the owner, 2026-10-19: "remove excess tree from balme, replace it with short plant"): short shrubs instead
//   (shrubs.ts);
// - the median of a dual road (Dr. J.B. Danquah Avenue, the owner's satellite picture): clipped shrubs only;
// - excess trees (the owner, 2026-10-19): outside the mapped woods, a tree over 3 m tall standing within 6 m of one
//   already kept is left out, so no two crowns crowd into one; street trees (22-34 m apart), bushes and hedges keep.
import { AREAS, buildingAt } from './campusmap';
import { roadClearance } from './life';
import { inMedian, onEdges } from './roadedges';
import { onHardSurface } from './surfaces';

const GRID = 32;
const key = (i: number, j: number) => (i + 4096) * 8192 + (j + 4096);
/** the map's areas of these kinds on a 32 m grid, and whether (x, z) is in one */
function areaTest(kinds: string[]) {
  let areaGrid: Map<number, Float32Array[]> | null = null;
  return (x: number, z: number) => {
  if (!areaGrid) {
    areaGrid = new Map();
    for (const a of AREAS) {
      if (!kinds.includes(a.kind)) continue;
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
  };
}
const inMappedHardArea = areaTest(['parking', 'plaza', 'pitch']);
const inWoods = areaTest(['wood', 'grove']);

/** the Balme Library's groves and lane rows (balme.ts: the leaf-litter beds under them), where shrubs replace the trees */
export const BALME_SHRUB_BEDS: [number, number, number, number][] = [[-46, -12.5, 19.6, 35.5], [22.5, 52, 19.6, 35.5], [-24.5, -15.5, 38.5, 104], [31.5, 37.5, 38.5, 104]];
const inBalmeBeds = (x: number, z: number) => BALME_SHRUB_BEDS.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1);

/** the trees kept so far (for the spacing) and the decision taken at each spot (a tree's crown, trunk and far shape
 *  are separate copies at one spot: the first decides for all) */
const kept = new Map<number, number[]>();
const decided = new Map<number, number[]>();
const ck = (x: number, z: number) => (Math.floor(x / 6) + 4096) * 8192 + (Math.floor(z / 6) + 4096);
function decidedAt(x: number, z: number) {
  const l = decided.get(ck(x, z));
  if (l) for (let k = 0; k < l.length; k += 3) if (Math.abs(l[k] - x) < 0.15 && Math.abs(l[k + 1] - z) < 0.15) return l[k + 2];
  return -1;
}
function decide(x: number, z: number, drop: boolean) {
  const k = ck(x, z); let l = decided.get(k); if (!l) decided.set(k, (l = [])); l.push(x, z, drop ? 1 : 0);
  return drop;
}
function crowded(x: number, z: number) {
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const l = kept.get(ck(x + i * 6, z + j * 6));
    if (l) for (let k = 0; k < l.length; k += 2) if (Math.hypot(l[k] - x, l[k + 1] - z) < 6) return true;
  }
  return false;
}

/** trees and plants left out so far, by reason (the checks) */
export const VEG_DROPS = { road: 0, edge: 0, surface: 0, area: 0, building: 0, balme: 0, median: 0, crowded: 0, kept: 0 };
/** whether a tree or plant standing at (x, z), h metres tall, is left out */
export function vegetationBlocked(x: number, z: number, h = 0) {
  const why = roadClearance(x, z, 6, -1, true) < 0 ? 'road' : onEdges(x, z, 0.4) ? 'edge' : onHardSurface(x, z) ? 'surface' : inMappedHardArea(x, z) ? 'area' : buildingAt(x, z) ? 'building' : inBalmeBeds(x, z) ? 'balme' : inMedian(x, z) ? 'median' : null;
  if (why) { VEG_DROPS[why]++; return true; }
  // the spacing between trees: one decision a spot
  const d = decidedAt(x, z);
  if (d >= 0) return d === 1;
  // (a short plant, or one in the woods, is kept; so are the other parts at its spot, a trunk read before its crown)
  if (h <= 3 || inWoods(x, z)) return decide(x, z, false);
  if (crowded(x, z)) { VEG_DROPS.crowded++; return decide(x, z, true); }
  const k = ck(x, z); let l = kept.get(k); if (!l) kept.set(k, (l = [])); l.push(x, z);
  VEG_DROPS.kept++;
  return decide(x, z, false);
}
