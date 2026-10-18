// Rideable routes over the real campus road network.
import { PLACES, accessFor, directions, findPath, findPathBetween, isAccessNode, nearestNode, nodeEdges, nodeXZ, placeByName, ROADS, type Place, type PlaceKind, type RoadClass, type Step, type TravelMode } from './campusmap';
import { Track } from './track';
import type { RouteLabel } from './world';
import type { TimeOfDay } from './Game';
import { GUIDE, guideFor, type GuideEntry } from '../data/guide';

export type RouteKind = 'race' | 'explore';

export interface RideStep extends Step {
  /** ride distance (from the start line) where the step happens */
  d: number;
}

export interface Route {
  id: string;
  name: string;
  kind: RouteKind;
  mode: TravelMode;
  /** rideable length in metres, start line to finish line */
  length: number;
  difficulty: number;
  /** lighting for the ride; day when unset */
  time?: TimeOfDay;
  track: Track;
  /** track metres before the start line and after the finish line */
  lead: number;
  tail: number;
  steps: RideStep[];
  labels: RouteLabel[];
  from: Place;
  to: Place;
  /** road class under ride distance d */
  classAt: (d: number) => RoadClass;
  /** destination journeys: where the ride starts and ends relative to the places' entrances */
  access?: { start: [number, number]; end: [number, number]; fromEntrance?: [number, number]; toEntrance?: [number, number]; fromVia?: [number, number][]; toVia?: [number, number][] };
}

const LEAD = 25;
const TAIL = 40;
const LABEL_PRIORITY: Record<PlaceKind, number> = { landmark: 0, hall: 1, academic: 2, food: 3, sport: 3, health: 4, bank: 5, worship: 5, transport: 6, other: 7 };

type XZ = [number, number];
const dist2 = (a: XZ, b: XZ) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/**
 * Builds a ride through the given places, in order.
 * Races keep their original construction (shortest way between the nodes nearest each place, straight
 * run-up and run-out), so race lengths, best times and ghosts stay comparable. Every other ride is a
 * destination journey: it leaves from the origin's access point and stops at the destination's (the
 * network point in front of its entrance, from data/geography/legon-access.geojson), keeps bikes off
 * trails and steps where it can, and runs out toward the destination's entrance.
 */
export function routeThrough(stops: Place[], opts: { id: string; name: string; kind: RouteKind; difficulty?: number; mode?: TravelMode; time?: TimeOfDay }): Route | null {
  const mode = opts.mode ?? 'cycle';
  let campus = opts.kind !== 'race';
  const nodeOf = (p: Place) => {
    const a = accessFor(p);
    if (!a) return nearestNode(p.x, p.z, mode);
    return mode === 'drive' ? a.dropNode : a.node;
  };
  const legs = (byAccess: boolean) => {
    const nodes: number[] = [], roads: number[] = [];
    for (let k = 0; k < stops.length - 1; k++) {
      const path = byAccess
        ? findPathBetween(nodeOf(stops[k]), nodeOf(stops[k + 1]), mode)
        : findPath([stops[k].x, stops[k].z], [stops[k + 1].x, stops[k + 1].z], opts.mode);
      if (!path) return null;
      if (path.nodes.length < 2) continue; // two stops at the same access point
      nodes.push(...(nodes.length ? path.nodes.slice(1) : path.nodes)); // legs share their end node
      roads.push(...path.roads);
    }
    return { nodes, roads };
  };
  let way = legs(campus);
  // neighbours that share one frontage (the banks on Banking Square): fall back to the nearest-node way
  if (campus && way && way.nodes.length < 2) { way = legs(false); campus = false; }
  if (!way || way.nodes.length < 2) return null;
  const { nodes, roads } = way;
  // a stop at the end of a side road would mean riding in and turning back: ride past it instead
  for (let i = 1; i < nodes.length - 1; ) {
    if (nodes[i - 1] === nodes[i + 1]) {
      nodes.splice(i, 2);
      roads.splice(i - 1, 2);
      i = Math.max(1, i - 1);
    } else i++;
  }
  if (nodes.length < 2) return null;
  // races ride the original road geometry: drop access points split onto a road segment, so the track is unchanged
  if (!campus) for (let i = nodes.length - 2; i > 0; i--) if (isAccessNode(nodes[i]) && roads[i - 1] === roads[i]) { nodes.splice(i, 1); roads.splice(i, 1); }
  const pts = nodes.map(nodeXZ);
  let pathLength = 0;
  for (let k = 0; k < pts.length - 1; k++) pathLength += dist2(pts[k + 1], pts[k]);
  const steps: Step[] = directions({ nodes, roads, length: pathLength }, stops[stops.length - 1].name);
  const ext = (a: XZ, b: XZ, len: number): XZ => {
    const dx = a[0] - b[0], dz = a[1] - b[1], l = Math.hypot(dx, dz) || 1;
    return [a[0] + (dx / l) * len, a[1] + (dz / l) * len];
  };
  const first = pts[0], last = pts[pts.length - 1];
  let leadPts: XZ[], tailPts: XZ[], leadRoad = roads[0], tailRoad = roads[roads.length - 1];
  let fromEntrance: XZ | undefined, toEntrance: XZ | undefined;
  if (!campus) {
    // straight run-up before the start line and run-out after the finish line
    leadPts = [ext(first, pts[1], LEAD)];
    tailPts = [ext(last, pts[pts.length - 2], TAIL)];
  } else {
    const fa = accessFor(stops[0]), ta = accessFor(stops[stops.length - 1]);
    fromEntrance = fa?.entrance;
    toEntrance = ta?.entrance;
    // run-up: out of the origin's entrance when it is a few metres off the road, else back along the road
    // the walk between the road and the door: arrival -> forecourt waypoints -> 1.5 m short of the entrance
    const outOf = (e: XZ | undefined, at: XZ, via: XZ[] = []) => {
      if (!e || dist2(e, at) < 4) return null;
      const before = via.length ? via[via.length - 1] : at;
      return [...via, ext(e, before, -1.5)];
    };
    const along = (from: number, avoid: number, want: number): { pts: XZ[]; road: number } | null => {
      // follow the network away from `avoid`, always taking the straightest way on, up to `want` metres
      const out: XZ[] = [];
      let prev = avoid, cur = from, len = 0, road = -1;
      for (let guard = 0; guard < 20 && len < want; guard++) {
        const [px, pz] = nodeXZ(prev), [cx, cz] = nodeXZ(cur);
        const hx = cx - px, hz = cz - pz, hl = Math.hypot(hx, hz) || 1;
        let best: { to: number; road: number; len: number } | null = null, bestDot = -0.3;
        for (const e of nodeEdges(cur)) {
          if (e.to === prev) continue;
          const [nx, nz] = nodeXZ(e.to);
          const d = ((nx - cx) * hx + (nz - cz) * hz) / ((Math.hypot(nx - cx, nz - cz) || 1) * hl);
          if (d > bestDot) { bestDot = d; best = e; }
        }
        if (!best) break;
        out.push(nodeXZ(best.to));
        if (road < 0) road = best.road;
        len += best.len;
        prev = cur; cur = best.to;
      }
      return out.length ? { pts: out, road } : null;
    };
    const fromVia = fa?.via ?? [], toVia = ta?.via ?? [];
    const up = outOf(fromEntrance, first, fromVia);
    const runUp = up && up.reverse();
    const back = runUp ? null : along(nodes[0], nodes[1], LEAD);
    leadPts = runUp ?? back?.pts.reverse() ?? [ext(first, pts[1], LEAD)];
    if (back) leadRoad = back.road;
    const runOut = outOf(toEntrance, last, toVia);
    const on = runOut ? null : along(nodes[nodes.length - 1], nodes[nodes.length - 2], TAIL);
    tailPts = runOut ?? on?.pts ?? [ext(last, pts[pts.length - 2], TAIL)];
    if (on) tailRoad = on.road;
  }
  const all = [...leadPts, ...pts, ...tailPts];
  const allTags = [...leadPts.map(() => leadRoad), ...roads, ...tailPts.map(() => tailRoad), tailRoad];
  // destination journeys pass exactly through the start and arrival points (no corner rounding there)
  const track = new Track(all, allTags, 14, campus ? [first, last] : []);
  // the start and finish lines sit on the first and last network points of the way
  const lead = campus ? Math.max(0, Math.round(track.project(first[0], first[1]).d)) : LEAD;
  const finish = campus ? Math.round(track.project(last[0], last[1]).d) : track.length - TAIL;
  const length = Math.round(finish - lead);
  const tail = campus ? Math.max(0, track.length - lead - length) : TAIL;
  const rideD = (x: number, z: number) => Math.max(0, Math.min(length, track.project(x, z).d - lead));
  const rideSteps: RideStep[] = steps.map((s) => ({ ...s, d: s.turn === 'start' ? 0 : s.turn === 'arrive' ? length : rideD(s.x, s.z) }));
  // tours: announce each stop on the way
  stops.slice(1, -1).forEach((stop, k) => {
    const d = rideD(stop.x, stop.z);
    rideSteps.push({ turn: 'stop', text: `Stop ${k + 1}: ${stop.name}`, at: d, x: stop.x, z: stop.z, d });
  });
  rideSteps.sort((a, b) => a.d - b.d || (a.turn === 'start' ? -1 : b.turn === 'start' ? 1 : 0));

  // label the places the route passes, nearest and most useful first, spaced out
  const near: (RouteLabel & { pr: number; dist: number })[] = [];
  for (const place of PLACES) {
    if (place.kind === 'transport' || place.kind === 'other' && !/hall|library|registry|mall/i.test(place.name)) continue;
    const pr = track.project(place.x, place.z);
    if (pr.dist > 55 || pr.d < lead + 5 || pr.d > lead + length) continue;
    near.push({ place, d: pr.d, pr: LABEL_PRIORITY[place.kind], dist: pr.dist });
  }
  near.sort((a, b) => a.pr - b.pr || a.dist - b.dist);
  const labels: RouteLabel[] = stops.slice(1, -1).map((place) => ({ place, d: track.project(place.x, place.z).d }));
  for (const n of near) {
    if (n.place === stops[stops.length - 1]) continue;
    if (labels.some((l) => Math.abs(l.d - n.d) < 45 || l.place.name === n.place.name)) continue;
    labels.push({ place: n.place, d: n.d });
    if (labels.length >= 40) break;
  }

  return {
    ...opts,
    mode,
    difficulty: opts.difficulty ?? 2,
    length,
    track,
    lead,
    tail,
    steps: rideSteps,
    labels,
    from: stops[0],
    to: stops[stops.length - 1],
    classAt: (d: number) => ROADS[track.tagAt(d + lead)]?.cls ?? 2,
    ...(campus && { access: { start: first, end: last, fromEntrance, toEntrance, fromVia: accessFor(stops[0])?.via, toVia: accessFor(stops[stops.length - 1])?.via } }),
  };
}

/** Explore: the real shortest way from one place to another. */
export const exploreRoute = (from: Place, to: Place, mode: TravelMode = 'cycle') =>
  routeThrough([from, to], { id: 'explore', name: `${from.name} to ${to.name}`, kind: 'explore', difficulty: 1, mode });

const must = (name: string) => {
  const p = placeByName(name);
  if (!p) throw new Error(`missing place ${name}`);
  return p;
};

/** Quick Ride: from Hilla Limann Hall in the south, past Sarbah and Legon Hall, up to the Great Hall. */
export const CAMPUS_LOOP = routeThrough([must('Dr. Hilla Limann Hall'), must('Great Hall')], { id: 'limann-great-hall', name: 'Limann to Great Hall', kind: 'race' })!;

/** The places a new student needs in week one, in an order that rides as one loop up to the Great Hall. */
export const TOUR_STOPS = ['Night Market', 'Central Cafeteria, CC', 'Jones Quartey Building, JQB', 'The Balme Library', 'University of Ghana Business School', 'University of Ghana Registry', 'Great Hall'];
let tour: Route | null = null;
/** Freshers' Tour, built the first time it is asked for. */
export function freshersTour() {
  tour ??= routeThrough(TOUR_STOPS.map(must), { id: 'freshers-tour', name: "Freshers' Tour", kind: 'explore', difficulty: 1 });
  return tour!;
}

export interface RaceDef {
  id: string;
  name: string;
  blurb: string;
  stops: string[];
  difficulty: number;
  time: TimeOfDay;
  /** player level that opens the race */
  level: number;
}

/** Races on real campus roads, opened one by one as the player levels up. */
export const RACES: RaceDef[] = [
  { id: 'engineering-run', name: 'Engineering Run', blurb: 'Limann Hall, out past the Main Gate, to the School of Engineering Sciences.', stops: ['Dr. Hilla Limann Hall', 'Legon Main Entrance', 'School of Engineering Sciences'], difficulty: 3, time: 'day', level: 1 },
  { id: 'sunset-route', name: 'Sunset Route', blurb: 'Commonwealth Hall past the Athletic Oval and the Night Market to the Sports Complex, at golden hour.', stops: ['Commonwealth Hall', 'Athletic Oval', 'Night Market', 'Sports Complex'], difficulty: 3, time: 'sunset', level: 2 },
  { id: 'night-circuit', name: 'Night Circuit', blurb: 'From the Sports Complex through the Night Market and Bush Canteen to Legon Hospital, after dark.', stops: ['Sports Complex', 'Night Market', 'Bush Canteen (near Department of Music)', 'University of Ghana Hospital'], difficulty: 4, time: 'night', level: 3 },
];

const races = new Map<string, Route>();
/** A race's route, built the first time it is asked for. */
export function raceRoute(def: RaceDef) {
  if (!races.has(def.id)) races.set(def.id, routeThrough(def.stops.map(must), { id: def.id, name: def.name, kind: 'race', difficulty: def.difficulty, time: def.time })!);
  return races.get(def.id)!;
}

const KIND_WORD: Record<PlaceKind, string> = {
  hall: 'A hall of residence', academic: 'A teaching and research building', landmark: 'A landmark', food: 'A place to eat', bank: 'A bank',
  transport: 'A transport stop', worship: 'A place of worship', sport: 'A sports facility', health: 'A health facility', other: 'A place',
};
/** what the guide says about a place: its entry, or for a place it has no entry for, a plain one from the map */
export const guideOrPlain = (place: Place): GuideEntry =>
  guideFor(place.name) ?? { place: place.name, title: place.name, intro: `${KIND_WORD[place.kind]} on the University of Ghana campus.`, doHere: [] };

/** A place the guided Explore ride stops at, with what the guide says there. */
export interface GuideStop {
  /** ride distance where the rider stops */
  d: number;
  place: Place;
  entry: GuideEntry;
}

/**
 * Explore's guided ride: the places along the way the ride pauses at to introduce.
 * The start and every tour stop when the guide knows them, plus guide places close to the road on
 * the way, spaced out so the ride isn't stop-start; and always the destination, last (the arrived
 * card, with the drone view and riding it yourself, is shown there whatever the place: one the guide
 * has no entry for gets a plain one, see guideOrPlain).
 */
export function guideStops(route: Route): GuideStop[] {
  const out: GuideStop[] = [];
  const add = (place: Place, d: number) => {
    const entry = guideFor(place.name);
    if (entry && !out.some((s) => s.entry === entry)) out.push({ d: Math.max(2, Math.min(route.length - 2, d)), place, entry });
  };
  add(route.from, 2);
  for (const s of route.steps) if (s.turn === 'stop') { const p = PLACES.find((q) => q.x === s.x && q.z === s.z); if (p) add(p, s.d); }
  const dest = guideOrPlain(route.to);
  // a destination sharing a guide entry with the start keeps its own arrival stop
  if (route.to !== route.from) out.push({ d: Math.max(2, route.length - 2), place: route.to, entry: dest });
  for (const g of GUIDE) {
    const place = placeByName(g.place);
    if (!place || out.some((s) => s.entry === g)) continue;
    const pr = route.track.project(place.x, place.z);
    const d = pr.d - route.lead;
    if (pr.dist > 80 || d < 30 || d > route.length - 30) continue;
    if (out.some((s) => Math.abs(s.d - d) < 70)) continue;
    add(place, d);
  }
  return out.sort((a, b) => a.d - b.d);
}

export { EVENTS, eventStatus, type EventDef } from '../data/events';
