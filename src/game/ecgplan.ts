// The owner's ECG area correction brief (ECG_Area_Detailed_Claude_Brief.pdf: Pairs 1-18, the annotated aerials A01-A03,
// the game map M01; docs/ecg-area/evidence-audit.md): the numbers ecg.ts models and the route tests check. Game metres,
// x east, z south. The aerials are registered on the mapped outlines and roads; every height, every span the map has no
// outline for and every plant's place is read from the street photographs, not measured, and stays a number here to
// adjust. (No imports, so that any module can read it.)

export type P2 = [number, number];
export type Line = P2[];
export type Box = [number, number, number, number];

/** the mapped centre lines (legon-map.json): the N4's southbound carriageway (786) and northbound one (443), the east
 *  service road (658), the west service road (617), the frontage road in front of the ECG office and the guesthouse
 *  (176), the Ghana Water access lane (173), the guesthouse's side road (174) and the side access by the stalls (175) */
export const SB: Line = [[725.7, -207.2], [736.3, -308.1], [754.7, -384.8], [775.8, -455.5], [795.8, -509.8]];
export const NB: Line = [[743.7, -206.8], [751.6, -300.8], [771.5, -385.1], [794.1, -458.5], [821.4, -515.4]];
export const ESV: Line = [[757.8, -226.2], [759.5, -249.5], [779.1, -364.0], [791.4, -410.6], [805.4, -449.8], [822.1, -488.5], [823.8, -500.6], [821.4, -515.4]];
export const WSV: Line = [[716.2, -221.3], [726.3, -299.5], [730.0, -333.7], [739.7, -392.1], [748.2, -420.0], [757.0, -440.5], [765.7, -460.9], [770.3, -471.4], [776.5, -485.4], [783.0, -500.1], [789.9, -506.4], [795.8, -509.8]];
export const FRONT: Line = [[730.0, -333.7], [724.7, -355.3], [723.4, -367.4], [726.0, -388.8], [734.9, -423.0], [743.1, -445.6], [749.5, -460.8], [756.3, -470.2], [766.1, -480.5], [776.5, -485.4]];
export const LANE173: Line = [[726.3, -299.5], [679.2, -309.5]];
export const SIDE174: Line = [[734.9, -423.0], [662.3, -427.3]];
export const SIDE175: Line = [[743.1, -445.6], [695.5, -473.4]];
/** half widths as drawn (the N4's carriageways 4.95, the service roads 3.1, the frontage road and lanes 2.3) */
export const N4_HALF = 4.95, SVC_HALF = 3.1, LANE_HALF = 2.3;

/** a polyline's x at z (lines that run north to south); NaN off its ends */
export const xAt = (line: Line, z: number) => {
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i], [bx, bz] = line[i + 1];
    if ((z - az) * (z - bz) <= 0 && az !== bz) return ax + ((bx - ax) * (z - az)) / (bz - az);
  }
  return NaN;
};
/** a west-east line's z at x */
export const zAt = (line: Line, x: number) => {
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i], [bx, bz] = line[i + 1];
    if ((x - ax) * (x - bx) <= 0 && ax !== bx) return az + ((bz - az) * (x - ax)) / (bx - ax);
  }
  return NaN;
};

/**
 * The ECG office (Pairs 4, 12, 13; A03 arrows 12, 13): one building on the mapped outline 317, a taller white slab at
 * its south end (four storeys, a narrow dark glazed recess up its east face, the small ECG marks high on it) and the
 * lower broad wing of blue reflective glass north of it under a pale panelled fascia, its north end rounded. The
 * slab is taken to be the taller plain white block the Ghana Water views (Pairs 2, 6, 9, 11, 18) show behind the blue
 * fence: inferred from the aerials, the photographs agree. `wall`: the low white wall with posts and a railing along the
 * frontage road; `board`: the ECG GOES CASHLESS roadside board.
 */
export const ECG = {
  slab: [699.0, 717.6, -361.0, -349.3] as Box, slabFloors: 4, storey: 3.5,
  wing: [697.5, 717.0, -378.0, -361.0] as Box, wingH: 8.2,
  wallX: 720.2, wall: [-381, -349.5] as [number, number], wallH: 1.0, gate: [-366.5, -362.5] as [number, number],
  board: [721.4, -346.2] as P2,
};
/** the yellow-green curved roofs behind the office (Pair 13; mapped outlines 849, 850): low halls */
export const VAULTS: Box[] = [[651.4, 666.8, -391.1, -375.6], [667.0, 682.3, -387.9, -373.0]];

/**
 * The guesthouse block on the mapped outline 2669 (Pair 14, the pitched-roof neighbour of Pairs 4 and 12): its east
 * part a white hall under a broad grey gable roof, the gable to the frontage road with a large blue-glazed bay in the
 * middle; its west part lower under a brown roof (the aerial). The split between them is read from the aerial.
 * `huts`: the separate low white entrance structures with pale green roofs (outline 853 and one the map lacks);
 * `sign`: the blue vertical sign; `tank`: the raised stand with two black tanks; `fence`: the low wall and railing.
 */
export const GUEST = {
  hall: [683.0, 714.9, -421.3, -391.0] as Box, hallH: 7.6, ridge: 5.6,
  west: [648.8, 683.0, -421.3, -391.0] as Box,
  huts: [[717.9, 730.6, -442.2, -432.1], [720.0, 726.4, -418.6, -412.4]] as Box[],
  sign: [729.2, -420.4] as P2, tank: [718.6, -393.6] as P2,
  fenceX: 717.6, fence: [-411.5, -390.5] as [number, number],
};

/**
 * The Ghana Water compound (Pairs 2, 6, 9, 10, 11, 18; A02): the blue lower wall and thin blue metal fence along the
 * west service road, open where the access lane (173) passes, the blue gate posts and gate leaves; the detached
 * guardhouse with blue lower walls under a blue hipped sheet roof south of the gate; the stepped white two-level
 * office at the lane's end (outline 316 and the small 851, 852) with its raised flat cap; the light canopy north of
 * it; the hard court, the gravel verge outside with brick paving and short striped posts; the lattice tower on the verge
 * (Pair 11) and the red and white mast behind the guardhouse (Pair 10); the sparse mature tree, banana plants and
 * small palms. The fence line and the gate are read from A02 and Pairs 9, 10, 18.
 */
export const GW = {
  fenceX: 716.4, fence: [-348.0, -283.0] as [number, number], gate: [-306.6, -298.8] as [number, number], fenceH: 2.2, wallH: 0.95,
  guard: [709.6, 715.0, -297.6, -291.6] as Box,
  office: [653.5, 673.8, -331.0, -307.9] as Box, annex: [[673.0, 676.1, -331.6, -322.4], [676.9, 680.7, -334.9, -322.9]] as Box[],
  cap: [658.5, 668.0, -324.5, -314.0] as Box,
  canopy: [675.5, 683.5, -305.8, -300.5] as Box,
  court: [670.0, 716.0, -336.0, -286.0] as Box,
  tower: [721.2, -341.5, 22] as [number, number, number], mast: [703.5, -293.0, 26] as [number, number, number],
  tree: [694.0, -326.0] as P2,
};

/**
 * The low cream building with the red hipped roof and the fenced utility yard (Pairs 3, 5; A01 arrows 3, 5): the
 * mapped outline 2622 lies over the east service road's kerb, so the building is moved 3.4 m east (estimated) behind
 * the sidewalk and the fence; the yard reaches east over the scrub outline 122 (whose generic block it replaces).
 * `fenceOff`: the fence out from the kerb; `small`: the smaller red-roof structure north of it.
 */
export const SUB = {
  house: [785.0, 798.6, -369.6, -345.4] as Box, small: [787.0, 793.5, -381.5, -375.0] as Box,
  fenceOff: 1.8, fence: [-398.0, -336.0] as [number, number], gate: [-360.5, -355.5] as [number, number],
  yard: [800.0, 832.0, -398.0, -336.0] as Box, tank: [813.0, -352.0] as P2,
};

/** the low concrete divider between the carriageways (Pairs 7, 8), dropping to a low kerb toward the cutting (Pair 3) */
export const DIV = { z0: -470, z1: -312, low: -332, h: 0.85, lowH: 0.3 };
/** the planted separation between the northbound carriageway and the east service road (Pairs 3, 4) */
export const PLANT = { z0: -470, z1: -262 };
/** the utility corridor east of the east service road (Pairs 1, 7, 8): the grass verge and the brick sidewalk behind it
 *  (widths), the H-frames' offset from the kerb and spacing, the lattice towers behind */
export const CORR = { z0: -480, z1: -238, verge: 3.5, walk: 2.0, frameOff: 7.6, frameStep: 42, depth: 70 };
export const TOWERS: [number, number, number][] = [[818, -274, 30], [846, -432, 30]];
/** the circular 50 signs (Pairs 6, 7): x, z, the direction their faces look */
export const SIGNS50: [number, number, number][] = [[764.4, -318.0, Math.PI / 2], [734.7, -330.0, Math.PI / 2]];

/**
 * The roadside trading frontage (Pairs 15-17; A03 arrows 15-17): north of the side access (175), west of the frontage
 * road (176), east of the Pent food yard. Each stall's place, kind, front width, depth, height; read from the aerial's
 * small roofs and the photographs, not measured. `pole`: the concrete pole with the advertisement board; `rocks`: the
 * large rough rocks on the earth.
 */
export type StallKind = 'blueCanopy' | 'darkKiosk' | 'shack' | 'kiosk' | 'canopy';
export const STALLS: [number, number, StallKind, number, number, number][] = [
  [742.5, -460.5, 'blueCanopy', 4.2, 3.4, 2.7], [741.0, -466.5, 'blueCanopy', 3.6, 3.0, 2.6], [747.5, -470.0, 'kiosk', 2.6, 2.4, 2.5],
  [736.5, -469.5, 'shack', 3.2, 2.8, 2.4], [743.0, -476.0, 'blueCanopy', 4.6, 3.6, 2.8], [751.0, -480.0, 'darkKiosk', 4.0, 3.0, 2.6],
  [738.0, -480.5, 'blueCanopy', 3.4, 3.0, 2.6], [745.5, -486.5, 'shack', 3.0, 2.6, 2.3], [733.0, -476.0, 'kiosk', 2.4, 2.2, 2.4],
  [740.0, -491.5, 'blueCanopy', 4.0, 3.2, 2.7], [748.5, -494.0, 'canopy', 3.4, 3.0, 2.5], [733.5, -488.0, 'shack', 2.8, 2.6, 2.3],
];
export const TRADE = { pole: [758.6, -478.6] as P2, rocks: [[742.5, -483.0, 1.3], [750.5, -472.8, 0.9], [736.0, -495.0, 1.0]] as [number, number, number][] };

/** where this work draws the ground and props itself (the generic trees, lamps and verges stay out): x0, x1, z0, z1 */
export const EC_KEEP: Box[] = [
  [700, 800, -470, -240], // the N4's strips and median by the office and the compound
  [760, 880, -480, -240], // the utility corridor, the yard
  [648, 731, -350, -280], // the Ghana Water compound, its verge
  [696, 740, -400, -340], // the ECG office, its frontage
  [646, 740, -445, -386], // the guesthouse, its huts
  [727.5, 770, -500, -445], // the stalls
];
export const inEcKeep = (x: number, z: number, pad = 0) => EC_KEEP.some(([a, b, c, d]) => x > a - pad && x < b + pad && z > c - pad && z < d + pad);
/** the zone this work owns beside the roads (the generic verge strips, route-layer trees and lamps stay out) */
export const ownsEc = (x: number, z: number) => z > -500 && z < -240 && x > 640 && x < 880 && inEcKeep(x, z);
