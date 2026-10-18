// The science campus brief (the owner's nine game/photo pairs and three annotated maps): the Frank Torto Building's
// south end and the passage past the one-floor building on the lane; the gable-fronted chemistry building east of the
// Chemistry Department (Map 19, circled yellow); the Home Science Annex's laboratory wings, their service canopy, the
// water tanks and the earth corridor south of them to LECIAD (Map 20); the ECOWAS building's entrance and car park (Map
// 20, yellow arrows); the yard behind the Department of Computer Science (Map 21). The adjustable numbers live here;
// nothing is surveyed: the maps give plan relationships, the photos elevations and local ground.
//
// The maps matched to the game: Map 19 at about 4.6 px/m (the Chemistry Department's long range x 149-163, NSIA Road at
// x 235); Map 20 at 4.2 px/m (the Home Science Annex's cross x 265-307, z -133 to -90; Hodasi Road at z -162); Map 21 at
// about 3.8 px/m (the Computer Science range x 350-394, z -301 to -277; the SICS ranges north-east of it).

import { EN } from './entrance';
import { inWestStrip } from './roadsideplan';
import { PAVED_BOXES } from './ipsplan';
import { FS_PAVED } from './fsplan';
import { GH_PAVED } from './greathallplan';
import { onEarthTrack } from './ghlplan';
/** Bani Hostel's paved courts (bani.ts COURTS, copied: the hostel's model itself is part of the converted campus) */
const BANI_COURTS: [number, number, number, number][] = [[770, 815, -1307.2, -1289.6], [772, 815, -1248.2, -1230.8]];
/** in one of Bani Hostel's paved courts (the drive through them is pavers, not asphalt: bani.ts draws them) */
const inBaniCourt = (x: number, z: number) => BANI_COURTS.some(([x0, x1, z0, z1]) => x > x0 && x < x1 + 0.5 && z > z0 && z < z1);
import { inEngForecourt, onEngTrack } from './engplan';
import { onDeckWalk } from './cutplan';
import { inEvandy } from './evandyplan';
import { inDjForecourt } from './djplan';

export const SC = {
  /** pair 1: the asphalt between the lane and the one-floor building's front (x from, z from, to) and the stack of open
   *  landings at the tower's south end (x from, to along the face; their depth) */
  passage: { x1: 216.1, z0: -137.4, z1: -78 },
  landings: { x0: 186.6, x1: 190.6, depth: 2.6 },
  /** pair 2: the one-floor gable-fronted building (x, z; its eaves height and roof pitch; the gable faces east) */
  gable: { x0: 163.4, x1: 197.5, z0: -33.8, z1: -11.2, eave: 6.6, pitch: 0.52, over: 1.1 },
  /** the department's sign before it (pair 2) */
  chemSign: [214.5, -28.4] as [number, number],
  /** pairs 3, 4, 6, 7: the Home Science Annex: its cross of wings (x0, x1, z0, z1), the central court open to the sky;
   *  the parapet's top, the broad concrete edge's projection; the roofs behind it (pitch) */
  annex: {
    arms: [[274.6, 296.2, -133.0, -90.4], [265.2, 307.1, -117.6, -103.4]] as [number, number, number, number][],
    court: [280.2, 290.6, -116.0, -105.0] as [number, number, number, number],
    eave: 4.3, edge: 0.75, roofPitch: 0.16,
  },
  /** pair 6: the service canopy on its raised apron in the corner north of the west wing (x0, x1, z0, z1; apron height) */
  canopy: [266.2, 274.4, -125.2, -117.8] as [number, number, number, number],
  apronH: 0.32,
  /** pair 7: the black water tanks on their plinth against the north wing's face */
  tanks: [[277.1, -134.5], [278.8, -135.0], [280.4, -134.5]] as [number, number][],
  /** pair 5: the earth corridor from NSIA Road east between the annex and LECIAD (centre line, half width) */
  corridor: { pts: [[238, -77], [252, -77.5], [272, -76.5], [292, -77.5], [312, -76]] as [number, number][], half: 3.2 },
  /** its branch north between the annex and the ECOWAS building to the car park (the mapped road there is earth) */
  corridorNorth: [[292, -77.5], [297, -77], [311, -84], [314, -99], [319, -119], [317, -135]] as [number, number][],
  /** where mapped roads are drawn as earth, not asphalt (no kerbs, drains, lamps or route paint): x0, x1, z0, z1 */
  earth: [[239, 322, -82.5, -71.5], [305, 324, -140, -72]] as [number, number, number, number][],
  /** where they are paved in brick instead (pair 8: the forecourt; the asphalt spur there is not supported) */
  brick: [[338, 381, -157, -129]] as [number, number, number, number][],
  /** pair 8: the ECOWAS building, one floor (its eaves; the entrance gable at the middle of its north front), the stone
   *  terrace before the entrance, the brick forecourt */
  ecowas: { eave: 4.0, terrace: [350.5, 360.5, -131.6, -128.9] as [number, number, number, number], terraceH: 0.55 },
  forecourt: [338, 372, -156, -131.6] as [number, number, number, number],
  /** pair 9: the earth yard behind (east of) Computer Science and its tables */
  yard: [393.8, 412, -300, -268] as [number, number, number, number],
};

/** the nine comparison cameras (eye, look: heights above the ground; vertical field of view). Estimated from the maps and
 *  matching landmarks, not measured. */
export const SC_VIEWS: { name: string; eye: [number, number, number]; look: [number, number, number]; fov: number; note: string }[] = [
  { name: 'sc1', eye: [209, 1.5, -79], look: [207, 6, -101], fov: 70, note: 'the Frank Torto tower\'s south end and the passage past the one-floor building' },
  { name: 'sc2', eye: [221.5, 1.6, -24], look: [190, 3.4, -22.5], fov: 46, note: 'the gable-fronted chemistry building from the east' },
  { name: 'sc3', eye: [243, 1.6, -109], look: [265, 2.0, -112], fov: 50, note: 'the annex\'s west wing past the big tree' },
  { name: 'sc4', eye: [245, 1.6, -107], look: [265, 2.0, -113], fov: 50, note: 'the annex\'s projecting corner bay with the tree before it' },
  { name: 'sc5', eye: [244, 1.6, -72], look: [290, 2.4, -74], fov: 48, note: 'the earth corridor east between the annex and LECIAD' },
  { name: 'sc6', eye: [262, 1.6, -132], look: [273, 1.8, -120], fov: 50, note: 'the service canopy on its apron at the annex\'s north-west corner' },
  { name: 'sc7', eye: [286, 1.6, -153], look: [286, 2.2, -133], fov: 48, note: 'the north wing\'s service wall and the water tanks' },
  { name: 'sc8', eye: [356, 1.6, -146], look: [355, 2.4, -128], fov: 48, note: 'the ECOWAS building\'s entrance over its forecourt' },
  { name: 'sc9', eye: [396.2, 1.6, -270.5], look: [402.5, 2.6, -300], fov: 52, note: 'the yard behind Computer Science' },
];

/** a mapped road drawn as earth or brick here, not asphalt */
// (and the worn earth tracks behind the Great Hall and round the tennis complex: ghlplan.ts, ghlandscape.ts paints them)
export const offAsphalt = (x: number, z: number, pad = 0) => [...SC.earth, ...SC.brick, EN.earthBox, ...PAVED_BOXES, ...FS_PAVED, ...GH_PAVED].some(([x0, x1, z0, z1]) => x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad) || inWestStrip(x, z) || (pad === 0 && (inEngForecourt(x, z) || onDeckWalk(x, z) || inEvandy(x, z) || inBaniCourt(x, z) || inDjForecourt(x, z))) || (pad === 0 && (onEarthTrack(x, z) || onEngTrack(x, z) || onEarthWest(x, z)));
/** on the red-earth footpath west of the JQB's south lawn (EN.earthWest) */
export function onEarthWest(x: number, z: number, pad = 0) {
  const E = EN.earthWest;
  if (x < 516 || x > 538 || z < 30 || z > 47) return false;
  for (let i = 0; i < E.pts.length - 1; i++) {
    const [ax, az] = E.pts[i], [bx, bz] = E.pts[i + 1], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    if (Math.hypot(ax + dx * t - x, az + dz * t - z) < E.half + pad) return true;
  }
  return false;
}
/** on the earth tracks (the free ride rolls slower and rougher there) */
export const onEarth = (x: number, z: number) => [...SC.earth, EN.earthBox].some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1) || inWestStrip(x, z) || onEarthTrack(x, z) || onEarthWest(x, z);

/** modelled paved ground where no grass tufts grow (the Frank Torto passage up to its stone wall) */
export const PAVED: [number, number, number, number][] = [[203.5, 223.9, -137.0, -78]];
export const onPaved = (x: number, z: number) => PAVED.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1);
