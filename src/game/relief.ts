// Local ground relief on an otherwise flat campus. Everything that stands on the ground asks
// groundHeight(x, z): the ground patch, roads, verges, areas, props, the ridden route, the rider,
// rivals, coins and the camera. It is 0 everywhere outside the zones, so the rest of the campus is
// untouched.
//
// Three kinds of zone:
// - a hollow: a flat floor sunk below the surrounding ground with straight slopes back up (the
//   School of Engineering Sciences, below the road on its south);
// - a terrace: the same raised above it (Volta Hall, up a short flight of steps from its forecourt);
// - Legon Hill: a ridge along the University Avenue axis rising west from the end of the avenue,
//   gently through Commonwealth Hall and on to the Great Hall at the top (the shape of the
//   Copernicus DEM, eased), falling away to the sides.
// Stairways climb from a foot to the ground at their top in flights with landings between; the
// ground in a stairway is its stair surface (Commonwealth's from the gate houses to the drive,
// Volta's from the forecourt to the entrance).
// Over these, two overrides (the owner's NSIA Road brief): a road's own cut or fill (PATHS: its height along it, flat
// across it, easing into the ground beside it over a bank, narrow where a wall holds it), and a flat pad for a building
// standing lower than the ground round it (PADS). A terrace's floor may also follow a function (`top`) and its west edge
// a line (`west`): the tree belt a wall's height above the lane along NSIA Road.
import { NSIA, laneX, northTop } from './nsia';
import { KQ } from './kuffour';
import { EN } from './entrance';
import { CUT, CUT_Z, alongCut, cutDepth, cutDrop, deckAt, inBowl, inTrench, onBowlSlope, wallE, wallW } from './cutplan';
import { GH } from './greathallplan';
import { BANKS, bankFace, bankTop, type Bank } from './okplan';
import { EAST_SCRUB, PLOT, RWALL, eastEdge, eastKerb, tierBack, westKerb } from './lfplan';
import { TC_BOX, TC_WALL_BOX, tcGround } from './tennisplan';

interface Hollow {
  /** hollow: sunk `depth` below the ground; terrace: raised `depth` above it */
  kind: 'hollow' | 'terrace';
  /** the floor: x0..x1, z0..z1 (game metres) and how far below (or above) the ground it is */
  x0: number; x1: number; z0: number; z1: number; depth: number;
  /** length of the slope on each side: west, east, north (z0 side), south (z1 side) */
  w: number; e: number; n: number; s: number;
  /** a floor whose height varies: its height at the nearest point of the floor (instead of `depth`) */
  top?: (x: number, z: number) => number;
  /** a west edge that follows a line (x at z) instead of x0; x0 is then its westmost */
  west?: (z: number) => number;
  /** an east edge that follows a line (x at z) instead of x1; x1 is then its eastmost */
  east?: (z: number) => number;
  /** the ground grid's cell over this zone (default 1 m, 2 m over the big ones): finer where a wall stands on its edge */
  cell?: number;
}
interface Hill {
  kind: 'hill';
  /** height along x (piecewise linear, 0 at both ends) */
  profile: [number, number][];
  /** the ridge line, how far either side it keeps its full height, and how far it then falls away */
  zc: number; full: number; fall: number;
}
/**
 * a stairway: x from the foot (x0) up to the top (x1), z0..z1, in flights of `steps` steps of `tread` m; with
 * `alongZ` it climbs along z instead (x0, x1 are then z values, z0, z1 the x span). It climbs from the ground at its
 * foot to the ground at its top.
 */
interface Stairs { x0: number; x1: number; z0: number; z1: number; flights: number; steps: number; tread: number; alongZ?: boolean;
  /** an uneven stairway instead: its flights in order, each `steps` steps then a level landing of `landing` m (the steps all
   *  of one rise; the last landing runs to the top) */
  plan?: [number, number][] }
type Zone = Hollow | Hill;
/**
 * a road's own cut or fill: along the polyline (x, z, height at each point, linear between) the ground is the road's
 * height for `half` metres either side of it, then eases back to the ground the zones make over `bank` metres
 */
interface Path { pts: [number, number, number][]; half: number; bank: number; bankAt?: (x: number, z: number) => number }

/** a smoothstep-eased terrace's height at x, z (the same shape as the terraces below) */
const easedTop = (q: { x0: number; x1: number; z0: number; z1: number; w?: number; e?: number; n: number; s: number }, top: number, z: number) => {
  const t = Math.min(1, z < q.z0 ? (q.z0 - z) / q.n : z > q.z1 ? (z - q.z1) / q.s : 0);
  return top * (1 - t * t * (3 - 2 * t));
};
/** the lane's height along it (its own terrace, below) */
export const laneHeight = (z: number) => easedTop(NSIA.lane, NSIA.lane.top, z);
/** the retaining wall's exposed height at z along the lane: full over the run, falling into the corner at its south end */
export const wallExposed = (z: number) => {
  const W = NSIA.wall, a = W.z1 - W.taper;
  return z <= a ? W.exposed : W.exposed + ((W.endHeight - W.exposed) * Math.min(1, (z - a) / W.taper));
};
/** the wall's face line along the lane (x at z) */
export const wallX = (z: number) => laneX(z) + NSIA.wall.offset;

/** Legon Hill's height along its axis: the end of the avenue (x -362) at 0; Commonwealth's stairway climbs 9 m to the
 *  drive and the front block (x -464 to -500); the hall rises 6 m more to its west end; the Great Hall's summit about
 *  21 m up; then down again behind it */
const HILL: [number, number][] = [[-1260, 0], [-1160, 11], [-1060, 21], [-960, 21], [-900, 19.5], [-780, 16.5], [-740, 15.5], [-500, 9.3], [-488, 9], [-464, 9], [-372, 0], [-362, 0]];
/** Commonwealth Hall's levels (the owner's Commonwealth and Great Hall brief, S8: four flights, green, with level walks
 *  between them, violet). The first flight is the entrance's broad steps from the drive's parking up to the front
 *  terrace; the front row, the entrance block and the first court (the statue's) stand on that terrace; the other three
 *  climb the walk at the long crossbars and at the stubs beyond them, each court level from its flight to the next.
 *  The rises are read from the brief's diagram and photographs, not measured. */
export const CW_LEVELS = {
  /** the front terrace's edge above the drive (x) and height; the entrance's broad steps down to the parking */
  front: { x1: -489.0, h: 10.5, steps: { x0: -484.0, x1: -489.0, z0: 119.5, z1: 135.5, n: 8 } },
  /** the upper courts: x from (east, the top of its flight), x to, height */
  courts: [[-572.7, -621.0, 11.7], [-623.7, -686.0, 12.9], [-688.7, -723.0, 14.2]] as [number, number, number][],
  /** the flights up the walk between the levels (x foot, x top); a retaining wall across the courts at each foot */
  flights: [[-570.0, -572.7], [-621.0, -623.7], [-686.0, -688.7]] as [number, number][],
  walk: [125, 131] as [number, number],
  /** the levels run under the whole hall (x west end, z), its lanes and crossbars standing on them */
  x0: -723.0,
  z: [72, 186] as [number, number],
};
/** the height of Commonwealth's ground at x: level terraces, each from the foot of its flight (the flights themselves
 *  are modelled stairways; beside them the change of level is a retaining wall) */
export function cwCourtLevel(x: number) {
  const C = CW_LEVELS.courts, F = CW_LEVELS.flights;
  for (let i = F.length - 1; i >= 0; i--) if (x <= F[i][0]) return C[i][2];
  return CW_LEVELS.front.h;
}
/** the levels set against the hill: a terrace where they stand above it, a hollow where below (the hollow's box a little
 *  bigger, so the two grids do not both draw the same ground) */
function cwZones(): Zone[] {
  const hillAt = (x: number) => profileAt(HILL, x);
  const { x0, z } = CW_LEVELS, x1 = CW_LEVELS.front.x1;
  return [
    { kind: 'terrace', x0, x1, z0: z[0], z1: z[1], depth: 0, w: 0.4, e: 0.3, n: 3, s: 3, cell: 1, top: (x) => Math.max(0, cwCourtLevel(x) - hillAt(x)) },
    { kind: 'hollow', x0, x1, z0: z[0], z1: z[1], depth: 0, w: 0.4, e: 0.3, n: 4, s: 4, cell: 1, top: (x) => Math.max(0, hillAt(x) - cwCourtLevel(x)) },
  ];
}

/** the Great Hall's levels (the owner's Great Hall correction brief, greathallplan.ts): the upper court level from the
 *  hall's front to the wings' east arms, the lower court sunk below the hill's slope from there to the gateway building,
 *  the gateway's passage floor on its own pad; the steps between them are stairways (below) */
function ghZones(): Zone[] {
  const hillAt = (x: number) => profileAt(HILL, x), U = GH.upper, Lo = GH.lower, g = GH.gate;
  return [
    { kind: 'terrace', x0: U.x0, x1: U.x1, z0: U.z0, z1: U.z1, depth: 0, w: 0.3, e: 0.3, n: 3, s: 3, cell: 1, top: (x) => Math.max(0, U.h - hillAt(x)) },
    { kind: 'hollow', x0: Lo.x0, x1: Lo.x1, z0: Lo.z0, z1: Lo.z1, depth: 0, w: 0.3, e: 0.3, n: 2, s: 2, cell: 1, top: (x) => Math.max(0, hillAt(x) - Lo.h) },
    { kind: 'terrace', x0: g.pad[0], x1: g.pad[1], z0: g.z0 - 1.7, z1: g.z1 + 1.4, depth: 0, w: 0.3, e: 0.3, n: 0.3, s: 0.3, cell: 0.5, top: (x) => Math.max(0, g.floor - hillAt(x)) },
    // the hall's platform under the portico (R54), above the upper court
    { kind: 'terrace', x0: GH.platform.x0, x1: GH.platform.x1, z0: GH.platform.z0, z1: GH.platform.z1, depth: GH.floor - U.h, w: 0.3, e: 0.3, n: 0.3, s: 0.3, cell: 0.5 },
  ];
}

/** the raised ground on the stadium side of the N4 (the owner's Okponglo brief, okplan.ts BANKS: Pairs 3 and 21): the top
 *  from the stone face behind the roadside path back toward the stadium, climbing a little, easing down at its ends and
 *  at its back; the face itself a short slope under the modelled stone */
function bankZone(b: Bank): Zone {
  const zs: number[] = [];
  for (let z = b.z0; z <= b.z1; z += 2) zs.push(z);
  const face = (z: number) => bankFace(b, z);
  return {
    kind: 'terrace', x0: Math.min(...zs.map(face)) - b.back, x1: Math.max(...zs.map(face)), z0: b.z0, z1: b.z1, depth: 0,
    west: (z) => face(z) - b.back, east: face, top: (x, z) => bankTop(b, x, z), w: b.fall, e: 0.35, n: b.ends, s: b.ends, cell: 1,
  };
}

/** the Legon overhead to Okponglo brief (lfplan.ts, legonfirst.ts): the raised plot behind its stained wall south of the
 *  station, tapering to the sidewalk at its access (Pairs 9, 15, 16); the wooded ground the panelled retaining wall holds
 *  up west of the west service road, stepping down in two tiers at its south end (Pairs 11, 14); the scrub rising
 *  gently east of the east verge (Pair 12). The walls themselves are modelled, so their slopes are short. */
function lfZones(): Zone[] {
  const span = (z0: number, z1: number, f: (z: number) => number) => { const v: number[] = []; for (let z = z0; z <= z1; z += 2) v.push(f(z)); return [Math.min(...v), Math.max(...v)]; };
  // (the raised floor starts a little behind each wall's face, so that the ground before the wall, the sidewalk, stays level)
  const plotFace = (z: number) => eastKerb(Math.min(PLOT.z1, Math.max(PLOT.access[1], z))) + PLOT.wallOff + 0.45;
  const [p0, p1] = span(PLOT.access[1], PLOT.z1, plotFace);
  const wallFace = (z: number) => westKerb(Math.min(RWALL.tiers.z1, Math.max(RWALL.z0, z))) - RWALL.off - 0.45;
  const [w0, w1] = span(RWALL.z0, RWALL.tiers.z1, wallFace);
  const scrubFoot = (z: number) => eastEdge(Math.min(EAST_SCRUB.z1, Math.max(EAST_SCRUB.z0, z))) + 4;
  const sz0 = PLOT.z1 + 8, [s0, s1] = span(sz0, EAST_SCRUB.z1, scrubFoot);
  return [
    { kind: 'terrace', x0: p0, x1: p1 + PLOT.depth, z0: PLOT.access[1] + PLOT.taper, z1: PLOT.z1, depth: PLOT.h, west: plotFace, w: 0.3, e: 6, n: PLOT.taper, s: 4, cell: 0.5 },
    { kind: 'terrace', x0: w0 - RWALL.back, x1: w1, z0: RWALL.z0, z1: RWALL.tiers.z0, depth: RWALL.h, east: wallFace, w: 8, e: 0.3, n: 6, s: 0.3, cell: 0.5 },
    { kind: 'terrace', x0: w0 - RWALL.back, x1: w1, z0: RWALL.tiers.z0, z1: RWALL.tiers.z1, depth: 0, east: wallFace, w: 8, e: 0.3, n: 0.3, s: 6, cell: 0.5,
      top: (x, z) => (x > tierBack(z, wallFace(z) + 0.45) - 0.45 ? RWALL.tiers.h[0] : RWALL.tiers.h[1]) },
    { kind: 'terrace', x0: s0, x1: s1 + EAST_SCRUB.depth, z0: sz0, z1: EAST_SCRUB.z1, depth: 0, west: scrubFoot, w: 2, e: 8, n: 4, s: 12, cell: 1,
      top: (x, z) => EAST_SCRUB.rise * Math.min(1, Math.max(0, (x - scrubFoot(z)) / EAST_SCRUB.depth)) },
  ];
}

/** the rise along Annie Jiagge Road (the owner's 20-picture corrections, Pictures 19-20: the road behind the Jones-Quartey
 *  Building climbs from the Engineering junction toward the Law School, the blue arrow; tops out in a rounded, near-level
 *  crest by International House, the gap between the arrows; then runs down from there past the unfinished foundation and
 *  the Jones-Quartey Building to Danquah Avenue, the green arrow). The ground's height along z, the same across the
 *  precinct between the residential road west of Limbo and La Road (easing to the flat campus outside it). The heights
 *  are not measured: the crest's rise is an estimate that keeps the grades gentle (about 3% up, 1.3% down). */
export const AJ = { zUp: -328, zCrest0: -235, zCrest1: -165, zDown: 105, rise: 3.5, x0: 420, x1: 640, w: 25, e: 35 };
export function ajProfile(z: number) {
  const s = (t: number) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };
  if (z <= AJ.zUp || z >= AJ.zDown) return 0;
  if (z < AJ.zCrest0) return AJ.rise * s((z - AJ.zUp) / (AJ.zCrest0 - AJ.zUp));
  if (z <= AJ.zCrest1) return AJ.rise;
  return AJ.rise * (1 - s((z - AJ.zCrest1) / (AJ.zDown - AJ.zCrest1)));
}

/** the Jones-Quartey Building's ground (the owner's second corrections, A01-A09): the building's floor level (its lowest
 *  floor, the bookshop's, set where the south front meets the rise); the grass bank along its west wall about a storey
 *  above that floor, falling to it at the south-west corner, where the bookshop's floor shows over its lower paved
 *  approach from the road on the west (A07, A08); a lower bank on the north; the south lawn falling from west to east
 *  along the front (A06); the raised lawn between Annie Jiagge Road and the building, which the red-earth path climbs
 *  (A01, A02). The rises are estimates read from the photographs, not measured. */
export const JQB_GROUND = { box: [505, 600, -96, 30] as [number, number, number, number], bank: 2.2, mound: 1.3 };
const ss = (t: number) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };
export const jqbFloor = () => ajProfile(-34.4);
/** the road along the west of the building and round its south-west, as x at z (the mound and the banks stop short of it) */
const jqbWestRoad = (z: number) => (z > -10 ? 511 : z > -14 ? 511 + (-10 - z) : z > -19 ? 515 + ((-14 - z) * 7) / 5 : z > -28 ? 522 + ((-19 - z) * 6) / 9 : 528);
function jqbTarget(x: number, z: number) {
  const aj = ajProfile(z), F = jqbFloor(), D = JQB_GROUND.bank;
  let v = 0;
  // the west bank: full north of z -48, gone at the corner (z -36) and short of the road along the north (its edge at
  // z -86); across, from the wall over 7.5 m toward the road on the west (on the north the ground is the rise's own,
  // nearly a metre above the floor already)
  if (x < 543.6 && z < -30) v = Math.max(v, (F - aj + D * (1 - ss((z + 48) / 12)) * ss((z + 86) / 6)) * (1 - ss((543.6 - x) / 7.5)));
  // the south lawn: above the floor at its west end, down to it at the stair on the east, easing out southward
  if (z > -34.4 && x > 530) v = Math.max(v, (F - aj + 0.95 * (1 - ss((x - 548) / 40))) * (1 - ss((z + 8) / 14)) * ss((x - 530) / 4));
  // the raised lawn the red-earth path climbs: up from Annie Jiagge Road and the road on the south, falling into the
  // south lawn on the east
  if (z > -34 && z < 16) v = Math.max(v, (JQB_GROUND.mound * ss((12 - z) / 10) + Math.max(0, F - aj) * ss((-z - 8) / 20)) * ss((x - jqbWestRoad(z) - 3) / 11) * (1 - ss((x - 556) / 22)));
  let h = aj + Math.max(0, v);
  // the bookshop's lower paved approach before the west bay (x 541-562.5, to z -26) and on west to the road: at the
  // floor, with a short bank up to the lawn on its south and east
  const pit = (1 - ss((z + 26) / 3.5)) * (1 - ss((x - 562.5) / 2.5)) * (z > -34.6 ? 1 : 0) * (x > jqbWestRoad(z) - 1 ? 1 : 0);
  if (pit > 0) h = h + (F - h) * pit;
  return h;
}

const ZONES: Zone[] = [
  // (first, so that the smaller zones in it are nested inside its box)
  { kind: 'terrace', x0: AJ.x0, x1: AJ.x1, z0: AJ.zUp, z1: AJ.zDown, depth: 0, top: (_x, z) => ajProfile(z), w: AJ.w, e: AJ.e, n: 0.3, s: 0.3, cell: 2 },
  { kind: 'terrace', x0: JQB_GROUND.box[0], x1: JQB_GROUND.box[1], z0: JQB_GROUND.box[2], z1: JQB_GROUND.box[3], depth: 0, top: jqbTarget, w: 0.3, e: 0.3, n: 0.3, s: 0.3, cell: 1 },
  bankZone(BANKS.north), bankZone(BANKS.south), ...lfZones(),
  // The Institute of African Studies (the owner's main entrance brief, pairs 20-24): the building and its upper apron
  // stand on a terrace above the avenue; before the south front a middle terrace, each behind a stone-faced retaining
  // wall; steps up the middle; the west side drops to the brick parking at a low stone wall
  { kind: 'terrace', x0: EN.ias.x0 - 0.5, x1: EN.ias.x1 + 1.0, z0: EN.ias.z0 - 1.5, z1: 101.5, depth: EN.iasTerrace[1], w: 0.3, e: 1.2, n: 1.2, s: 0.3 },
  { kind: 'terrace', x0: 559.5, x1: EN.ias.x1 + 1.0, z0: 101.5, z1: 105.5, depth: EN.iasTerrace[0], w: 0.3, e: 0.3, n: 0.3, s: 0.3 },
  // the pavilion on its stone-faced plinth (pairs 18, 19)
  { kind: 'terrace', x0: EN.pavilion[0], x1: EN.pavilion[1], z0: EN.pavilion[2], z1: EN.pavilion[3], depth: 0.75, w: 0.3, e: 0.3, n: 0.3, s: 0.3 },
  // the white building above the roadside bank (pair 26): the bank rises gently from the lawn by the road
  { kind: 'terrace', x0: EN.whiteHouse[0] - 1.5, x1: EN.whiteHouse[1] + 2.5, z0: EN.whiteHouse[2] - 2, z1: EN.whiteHouse[3] + 2, depth: EN.bank, w: 3, e: 6, n: 3, s: 22 },
  // School of Engineering Sciences: the building, its forecourt and the car park on the floor;
  // the access road from the main road on the south comes down the 23 m slope, which levels out a few metres
  // short of that road and of Annie Jiagge Road on the east, so neither tips into it (owner)
  { kind: 'hollow', x0: 372, x1: 494, z0: -458, z1: -372, depth: 4.5, w: 22, e: 10, n: 20, s: 23 },
  // Legon Hill: the end of the avenue (x -362) at 0; Commonwealth's stairway climbs 9 m to the drive and
  // the front block (x -464 to -500); the hall rises 6 m more to its west end; the Great Hall's summit
  // about 21 m up; then down again behind it
  { kind: 'hill', zc: 128, full: 150, fall: 140, profile: HILL },
  // Commonwealth Hall's levels (the owner's Commonwealth and Great Hall brief, S8 and the stair diagram): the front row
  // stands on a terrace above the drive and its parking, reached by the entrance's broad steps; inside, the courts climb
  // to the end building in level terraces with a flight of steps up the walk between each (the green marks) and level
  // walks between them (the violet arrows), not a continuous slope (CW_LEVELS).
  ...cwZones(),
  // the Great Hall (the owner's Great Hall correction brief): the upper and lower courts, the gateway's floor, the hall's
  // platform (in place of the earlier raised entrance terrace before the portico)
  ...ghZones(),
  // Volta Hall: the hall stands 2.4 m above Volta Hall Road, its east front over a stone retaining
  // wall; the Annex to the north is at road level. Two rectangles over the hall's blocks only (the courts
  // and the east front; the west block), so the lawn corner south-west of the hall and the road round it
  // stay at road level; on the south, toward the Department of History, a rubble-stone wall in two tiers holds the
  // terrace up over Volta Road (owner's second reference PDF, page 30)
  { kind: 'terrace', x0: -336, x1: -258.6, z0: -27, z1: 99.6, depth: 2.4, w: 6, e: 2, n: 10, s: 1.5 },
  { kind: 'terrace', x0: -365, x1: -336, z0: 44, z1: 86, depth: 2.4, w: 5, e: 0.1, n: 5, s: 4 },
  // the building with the porch and balcony at the hall's south-east corner stands up on the same terrace, the stone wall
  // in its two tiers carried on under it along Volta Road and returned up its east side and along the forecourt (the
  // owner's photo from Volta Road and marked satellite view)
  { kind: 'terrace', x0: -258.8, x1: -241.0, z0: 86.6, z1: 99.6, depth: 2.4, w: 0.3, e: 0.3, n: 0.3, s: 1.5 },
  // The Balme Library stands above University Square and the long pool before it (owner's photo from the pool):
  // the pool deck 2.4 m below the road in front of the library, a middle terrace 1.2 m below it, each behind a
  // stone retaining wall, the central stairs climbing from the pool to the road; the side lanes stay up
  // each level drops at its retaining wall (owner: the paving outside runs flat to the wall, no slope)
  // (the owner's Balme and Pentagon brief, pairs 1 and 2: only the pool and its walking strips are down on the deck; the
  // lawns either side stand higher, at the middle terrace's level, behind low stone retaining edges)
  // (the owner's marked aerial, 2026-10-15: no wall across the pool's south end; its slab paving runs on out to the road,
  // so the deck climbs to the footway in one paved slope)
  { kind: 'hollow', x0: 0.7, x1: 15.3, z0: 60.3, z1: 93.5, depth: 2.4, w: 0.3, e: 0.3, n: 0.3, s: 9 },
  { kind: 'hollow', x0: -6.6, x1: 24.6, z0: 60.3, z1: 93.5, depth: 1.2, w: 0.5, e: 0.5, n: 0.3, s: 0.5 },
  { kind: 'hollow', x0: -6.6, x1: 24.6, z0: 49, z1: 60.6, depth: 1.2, w: 0.5, e: 0.5, n: 0.3, s: 0.3 },
  // The Innovation Enclave, south of the engineering school: its six buildings stand up the hill on a terrace 2 m
  // above the road on its north, behind a white retaining wall that three flights of steps climb (owner's photos);
  // the ground falls away gently on the other sides
  { kind: 'terrace', x0: 397, x1: 497, z0: -332.1, z1: -296, depth: 2, w: 6, e: 4, n: 0.3, s: 8 },
  // the paved ground before the RIPS building, between ISSER and Computer Science: downhill from RIPS, seven steps
  // (1.26 m) below the car park north of the Mathematics and Statistics departments (owner); the drive along ISSER's
  // front ramps down into it from the west
  { kind: 'hollow', x0: 321, x1: 349.4, z0: -282, z1: -277.5, depth: 1.26, w: 4, e: 0.3, n: 8, s: 0.3 },
  // the GCB Lecture Building stands up the slope from the road before the New N Block (owner's photos): its ground
  // floor, the deep gallery on its north and the paving round it are 2.4 m above that road behind white retaining walls
  // (north, east, and west of the gallery); the car park on its west is up at the same level; the ground falls to
  // Ebenezer Laing Road on the south. Before the gallery, at road level, the stair and the two ramps climb to it.
  { kind: 'terrace', x0: -160, x1: -117.5, z0: -395, z1: -306, depth: 2.4, w: 0.3, e: 0.3, n: 0.3, s: 2 },
  { kind: 'terrace', x0: -178, x1: -160, z0: -360, z1: -306, depth: 2.4, w: 2, e: 0.3, n: 6, s: 2 },
  // the ISSER Annex, like the engineering school east of it, lies below the road between them (owner's photo from
  // that road): its buildings, the huts' plaza and the car park on a floor 1.2 m down, the slopes up to the road on
  // the east, to the road on the south (short of it) and to the open ground west and north
  { kind: 'hollow', x0: 236, x1: 334, z0: -446, z1: -342, depth: 1.2, w: 4, e: 5, n: 8, s: 3 },
  // the Department of Earth Science stands on ground raised 1.5 m behind rubble-stone retaining walls on its front and
  // sides (owner's photos), a broad stair up to its entrance; behind it the ground falls gently to the road on the north
  // (its west wall stands clear of Nsia Road's pavement: the road and its kerb run flat past it, owner)
  { kind: 'terrace', x0: 241, x1: 356, z0: 28, z1: 99.3, depth: 1.5, w: 0.3, e: 0.3, n: 5, s: 0.3 },
  // the Department of Physics stands up the hill from Danquah Avenue (owner's photos): its ranges 1.5 m up, a grass
  // bank down to a low stone wall along the pavement and to Cruise O'Brien Road; a stone retaining wall on the east
  { kind: 'terrace', x0: 106, x1: 205.3, z0: 52, z1: 106.5, depth: 1.5, w: 5, e: 0.3, n: 5, s: 5.6 },
  // the Faculty of Arts (the French Department) and the Economic Policy Management office stand 1 m above Danquah
  // Avenue (owner's street photo from before Legon Hall): a rubble-stone retaining wall along the road, kept back
  // behind the footway and its pavement, and down the east side; the ground slopes down to the lane on the west
  { kind: 'terrace', x0: -188.5, x1: -101.3, z0: 50.6, z1: 108.0, depth: 1.0, w: 3, e: 0.3, n: 0.3, s: 0.3 },
  // the N Block compound (owner's views 2 and 1, and the photo of the court): the court, the range behind it (the
  // Department of Psychology) and the long range stand at the level of Ebenezer Laing Road; the ground north of them
  // round the K. Folson Building lies 1.2 m lower, below a pitched bank of rubble stone along the north of the range and
  // of the platform with the blue tent (two stairs climb it), and the car park east of the long range falls toward it
  { kind: 'hollow', x0: 13, x1: 104, z0: -418, z1: -391, depth: 1.2, w: 4, e: 6, n: 6, s: 2.8 },
  { kind: 'hollow', x0: 31, x1: 104, z0: -391, z1: -376.8, depth: 1.2, w: 2, e: 6, n: 0.3, s: 2.3 },
  { kind: 'hollow', x0: 86.5, x1: 104, z0: -418, z1: -368, depth: 1.2, w: 2.8, e: 6, n: 6, s: 23 },
  // the Chemistry Department Extension behind the Balme Library (owner's reference PDF, pages 25-29): it stands about
  // 1 m up behind a rubble-stone retaining wall topped by a clipped hedge, along Cruise O'Brien Road on the west and
  // J.K.M. Hodasi Road on the north; the ground falls gently on the east and to the lane on the south
  // (the owner's Kuffour Quadrangle brief, pair 5: the wall set back from Cruise O'Brien Road behind a narrow footway
  // and a grassy rise up to its foot, so that it shows its stone above the grass, not flush with the road)
  { kind: 'terrace', x0: KQ.croEast.wallX + 0.4, x1: 207.5, z0: -153.0, z1: -97.0, depth: 1.0, w: 0.3, e: 4, n: 0.3, s: 3.5 },
  { kind: 'terrace', x0: KQ.croEast.wallX + 0.4, x1: 207.5, z0: KQ.croEast.z0, z1: KQ.croEast.z1, depth: KQ.croEast.rise, w: 3.6, e: 0.3, n: 0.3, s: 0.3 },
  // the Kuffour Quadrangle (the owner's brief, pairs 1 to 3): the garden stands a little above the roads round it,
  // held by the low stone walls along Hodasi Road and the road south of it, where they jog out toward the roads in the
  // middle; on the west and east it falls gently to the paths
  { kind: 'terrace', x0: KQ.garden.x0, x1: KQ.garden.x1, z0: KQ.garden.z0, z1: KQ.garden.z1, depth: KQ.garden.h, w: 1.6, e: 1.6, n: 0.3, s: 0.3, cell: 0.5 },
  { kind: 'terrace', x0: KQ.garden.jx0, x1: KQ.garden.jx1, z0: KQ.garden.nz, z1: KQ.garden.sz, depth: KQ.garden.h, w: 0.3, e: 0.3, n: 0.3, s: 0.3, cell: 0.5 },
  // the back of Akuafo Hall Main: the lawn between the south wings stands 0.45 m up behind a low white concrete edge,
  // above the hexagonal pavers before it (owner's second reference PDF, pages 48-54)
  { kind: 'terrace', x0: 138.6, x1: 174.8, z0: 366.4, z1: 381.6, depth: 0.45, w: 0.15, e: 0.15, n: 0.15, s: 0.15 },
  // Block A's car park between its east side and Pent Road (the owner's Pent PDF, pages 25-27, and the owner's later
  // correction: the photos were taken from Block A's south-east, the road on the rise is Pent Road, not the road between
  // Blocks A and B, which is level): it lies 1.3 m below the road behind a rendered retaining wall with steps up it
  { kind: 'hollow', x0: 597, x1: 618.6, z0: -633, z1: -606, depth: 1.3, w: 5, e: 0.3, n: 4, s: 4, cell: 0.5 },
  // the lane from Physics north to Frank Torto (owner's second reference PDF, pages 21-30): it climbs from Physics to a
  // crest by the turning east to LECIAD, then runs down again to the Chemistry Extension and Frank Torto, which stand
  // low; east of it the ground of LECIAD and its neighbours stands higher still behind a bank of grass and red earth
  { kind: 'terrace', x0: NSIA.lane.x0, x1: NSIA.lane.x1, z0: NSIA.lane.z0, z1: NSIA.lane.z1, depth: NSIA.lane.top, w: 2, e: 3, n: NSIA.lane.n, s: NSIA.lane.s },
  { kind: 'terrace', x0: 219, x1: 345, z0: -72, z1: 2, depth: 2.8, w: 5, e: 10, n: 20, s: 22 },
  // the tree belt between the lane and NSIA Road (the owner's NSIA Road brief, pairs 2, 3 and 5): raised above the lane
  // behind a stone-faced retaining wall along the lane's east side, its top a wall's height over the lane wherever the
  // lane climbs or falls, the wall losing its height into the corner by the connecting road; a bank at its north end
  // toward the low building by the car park (pair 1). Its east side and NSIA Road: the road's cut (PATHS) eases it down
  {
    // (its edge a little behind the wall's face, under the wall's body, so no slope of grass shows in front of the stones)
    kind: 'terrace', x0: Math.min(...[-79, -60, -48, -40, -29.5].map(wallX)) + 0.3, west: (z) => wallX(z) + 0.3, x1: NSIA.belt.x1, z0: NSIA.belt.z0, z1: NSIA.belt.z1,
    depth: 0, top: (_x, z) => laneHeight(z) + wallExposed(z), w: 0.25, e: 0.5, n: NSIA.belt.north, s: NSIA.belt.south, cell: 0.25,
  },
  // the hill's continuation north along NSIA Road to J.K.M. Hodasi Road (the owner's NSIA hillside correction): east of
  // the low building from the belt's end, then across from the Frank Torto tower to NSIA Road's cut north of the passage
  // between them, held at the passage's end by a low stone wall, easing down to Hodasi Road at the junction
  { kind: 'terrace', x0: NSIA.north.x0e, x1: NSIA.north.x1, z0: NSIA.north.passEnd, z1: NSIA.north.z1e, depth: NSIA.north.h, w: 0.6, e: 0.5, n: 0.3, s: 2.5, cell: 0.5 },
  { kind: 'terrace', x0: NSIA.north.x0, x1: NSIA.north.x1, z0: NSIA.north.z0, z1: NSIA.north.passEnd, depth: 0, top: (_x, z) => northTop(z), w: NSIA.north.west, e: 0.5, n: NSIA.north.n, s: 0.25, cell: 0.5 },
  // the lane past the Department of Nutrition and Food Sciences (owner's photo up the lane from J.K.M. Hodasi Road):
  // it runs down a little toward its north end, below the lawn held up behind its rubble-stone wall on the west, and
  // climbs gently back along its leg east to Animal Biology
  { kind: 'hollow', x0: -162, x1: -157, z0: -275, z1: -262, depth: 1.0, w: 0.6, e: 2.5, n: 6, s: 96 },
  { kind: 'hollow', x0: -157, x1: -150, z0: -279, z1: -271, depth: 1.0, w: 0.6, e: 18, n: 4, s: 3 },
  // the Department of Geography and Resource Development (the owner's 30-pair brief, pairs 1-6): the front range stands
  // up its broad stair from the lawn along Danquah Avenue, behind a stone-faced retaining wall; at the east end the
  // ground eases down to the garden before the covered corridor (pair 3). The rise is read from the photographs (two
  // flights of about five steps), not measured.
  { kind: 'terrace', x0: 388.6, x1: 453.4, z0: 84.0, z1: 101.2, depth: 1.4, w: 0.3, e: 4, n: 0.3, s: 0.3, cell: 0.5 },
  // the car park east of the Jones-Quartey Building (the brief's pair 30): it falls gently north from the lane past the
  // building's south-east corner, its low end held below the road along the north by a low retaining edge. The fall
  // (1.2 m over about 24 m) is read from the photograph, not measured.
  { kind: 'hollow', x0: 598.5, x1: 615, z0: -85.5, z1: -72, depth: 1.2, w: 2.5, e: 2.5, n: 0.4, s: 24, cell: 0.5 },
];
const STAIRS: Stairs[] = [
  // the Institute of African Studies: up the middle of the stone court from the walk to the south entrance
  { x0: 108.2, x1: 101.6, z0: 581.4, z1: 585.6, flights: 2, steps: 3, tread: 0.45, alongZ: true },
  // Commonwealth: from the gate houses up Legon Hill to the drive
  // (the owner's Commonwealth and Great Hall brief, pair 2: the lower street steps, a level landing through the gateway
  // between the gate houses, then flights separated by level walks, shorter higher up; the counts are read from the
  // photographs, not measured)
  { x0: -372, x1: -464, z0: 118, z1: 138, flights: 8, steps: 9, tread: 0.4, plan: [[4, 8.4], [9, 11], [9, 10.5], [8, 10], [8, 9.5], [7, 9.5], [7, 9.9], [6, 0]] },
  // Commonwealth's courts: the flights up the walk between the courts' level terraces (the brief's S8 green marks)
  ...CW_LEVELS.flights.map(([a, b]) => ({ x0: a, x1: b, z0: CW_LEVELS.walk[0], z1: CW_LEVELS.walk[1], flights: 1, steps: 6, tread: Math.abs(b - a) / 6 })),
  // the entrance's broad steps from the parking up to the front terrace (pairs 1 and 3; S8's first flight)
  ...[CW_LEVELS.front.steps].map((q) => ({ x0: q.x0, x1: q.x1, z0: q.z0, z1: q.z1, flights: 1, steps: q.n, tread: Math.abs(q.x1 - q.x0) / q.n })),
  // the Great Hall (the owner's Great Hall correction brief): the portico steps (R54); the two flights from the lower
  // court up to the upper court (R46-R50); the gateway's threshold steps either side of its passage (R34-R36)
  ...[GH.porticoSteps, GH.gateStepsW, GH.gateStepsE].map((q) => ({ x0: q.x0, x1: q.x1, z0: q.z0, z1: q.z1, flights: 1, steps: q.steps, tread: q.tread })),
  { ...GH.courtStairs },
  // Volta: from the forecourt up to the entrance
  { x0: -245, x1: -258.6, z0: 60, z1: 72, flights: 3, steps: 5, tread: 0.4 },
  // the Balme Library: from the pool deck up to the middle terrace and on up to the road before the library
  { x0: 61.6, x1: 43, z0: 1.5, z1: 14.5, flights: 2, steps: 8, tread: 0.4, alongZ: true },
  // the Innovation Enclave: up from the road through the retaining wall to the terrace, west, middle and east
  { x0: -333, x1: -328.2, z0: 415, z1: 419, flights: 1, steps: 12, tread: 0.4, alongZ: true },
  { x0: -333, x1: -328.2, z0: 445.5, z1: 451.5, flights: 1, steps: 12, tread: 0.4, alongZ: true },
  { x0: -333, x1: -328.2, z0: 478, z1: 481.5, flights: 1, steps: 12, tread: 0.4, alongZ: true },
  // the small stairs at the end of the drive, from the paved ground before RIPS up to the car park (owner)
  { x0: -277.5, x1: -275.4, z0: 336.6, z1: 339.4, flights: 1, steps: 7, tread: 0.3, alongZ: true },
  // the GCB Lecture Building: the broad stair up the middle between the two ramps, to the gallery (owner)
  { x0: -415, x1: -395, z0: -138.7, z1: -133.7, flights: 4, steps: 4, tread: 0.45, alongZ: true },
  // Earth Science: the broad stair from the lawn up to the entrance, in two flights (owner's photos)
  { x0: 106.5, x1: 99.3, z0: 322.5, z1: 331.5, flights: 2, steps: 5, tread: 0.45, alongZ: true },
  // Physics: the steps from the end of the lane on the east up to its door
  { x0: 207.6, x1: 205.4, z0: 84, z1: 89, flights: 1, steps: 7, tread: 0.3 },
  // the Faculty of Arts: the stairs up through the retaining wall from the footway along Danquah Avenue (owner)
  { x0: 110.0, x1: 107.9, z0: -146.0, z1: -143.0, flights: 1, steps: 6, tread: 0.35, alongZ: true },
  // the N Block compound (owner's view 2): the two stairs between dark red cheek walls up the bank from the ground round
  // the K. Folson Building, one into the lane between the range behind the court and the long range, one before the range
  { x0: -377.1, x1: -374.3, z0: 68.6, z1: 71.0, flights: 1, steps: 8, tread: 0.34, alongZ: true },
  { x0: -377.1, x1: -374.3, z0: 58.8, z1: 61.2, flights: 1, steps: 8, tread: 0.34, alongZ: true },
  // Block A: the steps up the retaining wall from the car park to Pent Road (the owner's Pent PDF, page 26)
  { x0: 616.6, x1: 619.2, z0: -616.4, z1: -614.0, flights: 1, steps: 7, tread: 0.37 },
  // the back of Akuafo Hall Main (owner's second reference PDF, pages 48-54): three steps up from the hexagonal pavers
  // through the white edge of the raised lawn between the south wings
  { x0: 383.0, x1: 381.6, z0: 153.6, z1: 156.6, flights: 1, steps: 3, tread: 0.45, alongZ: true },
  // Geography (pairs 4-6): the broad stair from the lawn up to the entrance, two flights with a landing between
  { x0: 106.8, x1: 101.2, z0: 410.2, z1: 423.8, flights: 2, steps: 5, tread: 0.36, alongZ: true },
];

// the roads' own cuts (the owner's NSIA Road brief): NSIA Road lies lower than the ground either side of it, the tree belt
// on the west and LECIAD's ground on the east, with a gentle hump of its own along it; the connecting road runs down
// from the lane's crest to it between banks; the road east to LECIAD climbs out of it gently
const nsiaX = (z: number) => (z < -77 ? 236 - ((z + 162) / 85) * 1 : z > 20 ? 235 + ((z - 20) / 94) * 1 : 235);
const PATHS: Path[] = [
  // (on the east, a short stretch held by a retaining wall instead of the bank: pair 6, its ends easing into the bank)
  {
    pts: NSIA.nsiaProfile.map(([z, h]) => [nsiaX(z), z, h]), half: NSIA.nsiaHalf, bank: NSIA.nsiaBank,
    bankAt: (x, z) => {
      const R = NSIA.eastWall;
      if (x < nsiaX(z) || z < R.z0 - R.ease || z > R.z1 + R.ease) return NSIA.nsiaBank;
      const f = z < R.z0 ? (R.z0 - z) / R.ease : z > R.z1 ? (z - R.z1) / R.ease : 0;
      return R.bank + (NSIA.nsiaBank - R.bank) * f;
    },
  },
  { pts: NSIA.connector, half: NSIA.connectorHalf, bank: NSIA.connectorBank },
  { pts: NSIA.eastRoad, half: NSIA.eastRoadHalf, bank: NSIA.eastRoadBank },
];

const boxOf = (q: Zone) => q.kind !== 'hill'
  ? { x0: q.x0 - q.w, x1: q.x1 + q.e, z0: q.z0 - q.n, z1: q.z1 + q.s }
  : { x0: Math.min(...q.profile.map((p) => p[0])), x1: Math.max(...q.profile.map((p) => p[0])), z0: q.zc - q.full - q.fall, z1: q.zc + q.full + q.fall };
const pathBox = (p: Path) => {
  const r = p.half + p.bank;
  return { x0: Math.min(...p.pts.map((q) => q[0])) - r, x1: Math.max(...p.pts.map((q) => q[0])) + r, z0: Math.min(...p.pts.map((q) => q[1])) - r, z1: Math.max(...p.pts.map((q) => q[1])) + r };
};
/** a box on the whole metres round it: a fine ground grid over a small zone then meets the coarser grids of the zones it
 *  lies in cell for cell, with no gap between them */
const snap = (b: { x0: number; x1: number; z0: number; z1: number }) => ({ x0: Math.floor(b.x0), x1: Math.ceil(b.x1), z0: Math.floor(b.z0), z1: Math.ceil(b.z1) });
const ZONE_BOXES = ZONES.map((q) => (q.kind !== 'hill' && q.cell ? snap(boxOf(q)) : boxOf(q)));
/** the area each zone touches (the zones, then the roads' cuts) */
export const RELIEF_BOXES = [...ZONE_BOXES, ...PATHS.map((p) => snap(pathBox(p))), snap({ x0: NSIA.lowPad.x0 - NSIA.lowPad.bank, x1: NSIA.lowPad.x1 + NSIA.lowPad.bank, z0: NSIA.lowPad.z0 - NSIA.lowPad.bank, z1: NSIA.lowPad.z1 + NSIA.lowPad.bank })];
// the Legon Road cutting (cutplan.ts): boxes 40 m long along it, the walls and the slope round the ring's bowl inside
for (let z = CUT_Z[0]; z < CUT_Z[1]; z += 40) {
  const z1 = Math.min(CUT_Z[1], z + 40);
  let x0 = Infinity, x1 = -Infinity;
  for (let t = z; t <= z1; t += 2.5) { x0 = Math.min(x0, wallW(t)); x1 = Math.max(x1, wallE(t)); }
  const bowl = z1 > CUT.ring.z0 && z < CUT.ring.z1 ? CUT.ring.bank : 0;
  RELIEF_BOXES.push(snap({ x0: x0 - 3 - bowl, x1: x1 + 3 + bowl, z0: z, z1 }));
}
/** the ground grid's cell over each box */
const BOX_CELL = [...ZONES.map((q) => (q.kind !== 'hill' ? q.cell : undefined)), ...PATHS.map(() => 0.5), 0.25, ...RELIEF_BOXES.slice(ZONES.length + PATHS.length + 1).map(() => 1)];
// the Commonwealth west tennis complex's terrace (tennisplan.ts): the floor cut into the hill's slope and the ground easing
// back from its walls; finer over the walls' strip, where the ground steps up behind the stones
RELIEF_BOXES.push(snap({ x0: TC_BOX[0], x1: TC_BOX[1], z0: TC_BOX[2], z1: TC_BOX[3] }), snap({ x0: TC_WALL_BOX[0], x1: TC_WALL_BOX[1], z0: TC_WALL_BOX[2], z1: TC_WALL_BOX[3] }));
BOX_CELL.push(1, 0.5);

/** a hill's height along its axis */
function profileAt(p: [number, number][], x: number) {
  for (let i = 0; i < p.length - 1; i++) {
    const [ax, ah] = p[i], [bx, bh] = p[i + 1];
    if (x >= ax && x <= bx) return ah + ((bh - ah) * (x - ax)) / (bx - ax || 1);
  }
  return 0;
}
/** a point in a stairway's own terms: how far along its climb (u, the x of an x stairway) and across it */
const along = (s: Stairs, x: number, z: number) => (s.alongZ ? [z, x] : [x, z]);
/** the top of a stairway's tread at u (x, or z): flights of steps going up from its foot toward its top, landings between */
function stairAt(s: Stairs, foot: number, top: number, x: number) {
  const dir = Math.sign(s.x1 - s.x0), len = Math.abs(s.x1 - s.x0), u = (x - s.x0) * dir;
  if (u <= 0) return foot;
  if (u >= len) return top;
  if (s.plan) {
    const n = s.plan.reduce((m, [k]) => m + k, 0), r = (top - foot) / n;
    let a = 0, done = 0;
    for (const [k, land] of s.plan) {
      const fl = k * s.tread;
      if (u < a + fl) return foot + (done + Math.min(k, Math.floor((u - a) / s.tread) + 1)) * r;
      done += k; a += fl;
      if (u < a + land) return foot + done * r;
      a += land;
    }
    return top;
  }
  const seg = len / s.flights, rise = (top - foot) / s.flights, r = rise / s.steps, k = Math.floor(u / seg), w = u - k * seg;
  return foot + k * rise + Math.min(s.steps, Math.floor(w / s.tread) + 1) * r;
}
const inCorridor = (s: Stairs, x: number, z: number) => { const [u, c] = along(s, x, z); return c > s.z0 && c < s.z1 && u < Math.max(s.x0, s.x1) && u > Math.min(s.x0, s.x1); };
/** the ground at the top and at the foot of a stairway */
const endOf = (s: Stairs, u: number) => { const c = (s.z0 + s.z1) / 2; return s.alongZ ? zoneHeight(c, u) : zoneHeight(u, c); };
const topOf = (s: Stairs) => endOf(s, s.x1);
const footOf = (s: Stairs) => endOf(s, s.x0 - Math.sign(s.x1 - s.x0) * 0.5);
/** where the stairways are, the height of their top and foot, and the tread height along the climb */
export function stairsOf() {
  return STAIRS.map((s) => {
    const top = topOf(s), foot = footOf(s);
    // its parts in order along the climb (u from the foot): each step and each landing, with the height of its tread
    const segs: { u0: number; u1: number; h: number; landing: boolean }[] = [], len = Math.abs(s.x1 - s.x0);
    const plan = s.plan ?? Array.from({ length: s.flights }, () => [s.steps, len / s.flights - s.steps * s.tread] as [number, number]);
    const n = plan.reduce((m, [k]) => m + k, 0), r = (top - foot) / n;
    let a = 0, done = 0;
    plan.forEach(([k, land], i) => {
      for (let j = 0; j < k; j++) { segs.push({ u0: a, u1: a + s.tread, h: foot + (done + j + 1) * r, landing: false }); a += s.tread; }
      done += k;
      const l = i === plan.length - 1 ? Math.max(0, len - a) : land;
      if (l > 0.01) { segs.push({ u0: a, u1: a + l, h: foot + done * r, landing: true }); a += l; }
    });
    return { ...s, top, foot, segs, at: (u: number) => stairAt(s, foot, top, u) };
  });
}

/** inside a stairway (its steps are modelled: the ground mesh keeps below them) */
export const inStairs = (x: number, z: number) => STAIRS.some((s) => inCorridor(s, x, z));

/** the ground the zones make, without the stairways */
function zoneHeight(x: number, z: number) {
  let hill = 0, low = 0, high = 0;
  for (let i = 0; i < ZONES.length; i++) {
    const q = ZONES[i], bx = ZONE_BOXES[i];
    if (x < bx.x0 || x > bx.x1 || z < bx.z0 || z > bx.z1) continue;
    if (q.kind !== 'hill') {
      // how far up (or down) the slope, 0 on the floor, 1 at its foot: the steeper of the two directions wins
      const zc = Math.min(q.z1, Math.max(q.z0, z));
      const x0 = q.west ? q.west(zc) : q.x0, x1 = q.east ? q.east(zc) : q.x1;
      const tx = x < x0 ? (x0 - x) / q.w : x > x1 ? (x - x1) / q.e : 0;
      const tz = z < q.z0 ? (q.z0 - z) / q.n : z > q.z1 ? (z - q.z1) / q.s : 0;
      const t = Math.min(1, Math.max(tx, tz));
      // eased at the top and the foot of the slope: no sharp edge for a road or the ground mesh to cut across
      const e = 1 - t * t * (3 - 2 * t);
      const depth = q.top ? q.top(Math.min(x1, Math.max(x0, x)), zc) : q.depth;
      if (q.kind === 'hollow') low = Math.min(low, -depth * e);
      else high = Math.max(high, depth * e);
    } else {
      const d = Math.abs(z - q.zc), t = d <= q.full ? 1 : d >= q.full + q.fall ? 0 : 1 - (d - q.full) / q.fall;
      hill += profileAt(q.profile, x) * t * t * (3 - 2 * t);
    }
  }
  // (the tennis complex's terrace replaces the hill's slope round it: tennisplan.ts)
  return tcGround(x, z, hill + low + high) ?? hill + low + high;
}

/** a flat pad for a building standing lower than the ground round it (or higher): the ground is `h` over the rectangle
 *  and eases back to the zones' ground over `bank` metres (a short bank is a retaining edge, modelled where it stands) */
interface Pad { x0: number; x1: number; z0: number; z1: number; h: number; bank: number }
const PADS: Pad[] = [
  NSIA.lowPad,
  // the School of Law and its court on the rise along Annie Jiagge Road (the owner's 20-picture corrections): level
  // under the building, its podium and steps, easing back into the slope round it
  { x0: 412, x1: 484, z0: -268, z1: -206, h: 3.35, bank: 7 },
];
const PAD_BOXES = PADS.map((p) => ({ x0: p.x0 - p.bank, x1: p.x1 + p.bank, z0: p.z0 - p.bank, z1: p.z1 + p.bank }));
const PATH_BOXES = PATHS.map(pathBox);
/** a road's cut at x, z: how much it decides the ground there (1 on the road, easing to 0 at the bank's foot) and its height */
function pathAt(p: Path, x: number, z: number): [number, number, number] {
  let best = Infinity, h = 0;
  for (let i = 0; i < p.pts.length - 1; i++) {
    const [ax, az, ah] = p.pts[i], [bx, bz, bh] = p.pts[i + 1], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / l2)), d = Math.hypot(ax + dx * t - x, az + dz * t - z);
    if (d < best) { best = d; h = ah + (bh - ah) * t; }
  }
  const bank = p.bankAt ? p.bankAt(x, z) : p.bank;
  if (best >= p.half + bank) return [0, 0, best];
  if (best <= p.half) return [1, h, best];
  const t = (best - p.half) / bank;
  return [1 - t * t * (3 - 2 * t), h, best];
}

/** Height of the ground at a point (0 on the flat campus, negative in a hollow, positive on a hill or terrace). */
export function groundHeight(x: number, z: number) {
  for (const s of STAIRS) if (inCorridor(s, x, z)) return stairAt(s, footOf(s), topOf(s), along(s, x, z)[0]);
  const base = zoneHeight(x, z);
  // a road's cut decides the ground on it and eases into the ground beside it; where two meet the stronger wins, and on
  // both roads at once (a junction) the one whose line is nearer
  let W = 0, H = 0, D = Infinity;
  for (let i = 0; i < PATHS.length; i++) {
    const b = PATH_BOXES[i];
    if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) continue;
    const [w, h, d] = pathAt(PATHS[i], x, z);
    if (w > W + 1e-9 || (w > 0 && Math.abs(w - W) <= 1e-9 && d < D)) { W = w; H = h; D = d; }
  }
  for (let i = 0; i < PADS.length; i++) {
    const p = PADS[i], b = PAD_BOXES[i];
    if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) continue;
    const d = Math.hypot(Math.max(p.x0 - x, 0, x - p.x1), Math.max(p.z0 - z, 0, z - p.z1)), t = d / p.bank;
    const w = d <= 0 ? 1 : t >= 1 ? 0 : 1 - t * t * (3 - 2 * t);
    if (w > W + 1e-9) { W = w; H = p.h; }
  }
  const g = W > 0 ? base + (H - base) * W : base;
  // the Legon Road cutting (cutplan.ts): its floor, and the slope down to it in the ring's bowl
  return z > CUT_Z[0] && z < CUT_Z[1] ? g - cutDrop(x, z) : g;
}

/**
 * The ground under someone heading (hx, hz) at x, z: on a bridge over the Legon Road cutting, the deck when crossing it
 * and the lowered road when passing along it underneath; groundHeight everywhere else. (Riders on a route ask this:
 * the route's heading says which level it is on.)
 */
export function layerHeight(x: number, z: number, hx: number, hz: number) {
  const d = deckAt(x, z);
  return d && !alongCut(hx, hz) ? zoneHeight(x, z) + d.h : groundHeight(x, z);
}
/** The ground under something last at height y: the deck of a bridge if it was up at the deck, else groundHeight (a free
 *  ride keeps to the level it is on) */
export function groundFrom(x: number, z: number, y: number) {
  const d = deckAt(x, z);
  if (d) { const h = zoneHeight(x, z) + d.h; if (y > h - 2.5) return h; }
  return groundHeight(x, z);
}
/** the ground as if the Legon Road cutting were not there: for what lies at the top (the roads over the bridges, a
 *  service road whose edge overhangs the wall) */
export const crestHeight = (x: number, z: number) => (z > CUT_Z[0] && z < CUT_Z[1] ? groundHeight(x, z) + cutDrop(x, z) : groundHeight(x, z));
/** the cutting's floor, flat across it right up to and past the walls: for what lies down on the lowered road */
export const floorHeight = (x: number, z: number) => (z > CUT_Z[0] && z < CUT_Z[1] ? zoneHeight(x, z) - cutDepth(z) : groundHeight(x, z));

const inBox = (x: number, z: number, pad = 0) => RELIEF_BOXES.some((b) => x > b.x0 - pad && x < b.x1 + pad && z > b.z0 - pad && z < b.z1 + pad);

/** Adds points every `step` metres to the parts of a polyline inside a relief zone, so it can follow the slope. */
export function densify(pts: [number, number][], step = 2): [number, number][] {
  if (pts.length < 2 || !pts.some(([x, z]) => inBox(x, z, 40))) return pts;
  const out: [number, number][] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
    const len = Math.hypot(bx - ax, bz - az);
    const n = inBox(ax, az, 5) || inBox(bx, bz, 5) || inBox((ax + bx) / 2, (az + bz) / 2, 5) ? Math.ceil(len / step) : 1;
    for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  return out;
}

/**
 * Sets the ground under everything in a group: a merged world-space mesh has each vertex dropped
 * by the ground height at its x, z; an instanced mesh each instance by the height under its origin;
 * a placed object (a model, a sign, an arch) as a whole by the height under its position. With `only`, just that child of
 * the root (the campus is lowered a part at a time).
 */
// (applyRelief and reliefGround, the original's build-time helpers that drape Three.js geometry over this relief, are
// not needed here: the converted campus tiles already carry their heights. See tools/export.)
