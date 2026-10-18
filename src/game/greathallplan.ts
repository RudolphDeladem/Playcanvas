// The owner's Great Hall correction brief (Great_Hall_Detailed_Claude_Brief.pdf: the aerial A01, the tour R01-R59, the
// game views G01-G10; docs/great-hall/evidence-audit.md): the numbers greathall.ts models, relief.ts levels and the route
// tests check. Game metres, x east, z south. The aerial is registered on the mapped outlines: the hall
// (osm:way/720486436), its two L-shaped wings (osm:way/100307654, 100307636), the transverse gateway building
// (osm:way/100307658) and its two pavilions (osm:way/492099539, 492099524), the building south of the lower court
// (osm:way/492099530), the outer buildings and the roads round the approach (the turning loop, the cross road at x -860,
// the two roads either side of the formal garden). The aerial's top is the hall's west end; its left is south.
// Every level, height, stair count and the spans the map has no outline for are read from the tour and the aerial, not
// measured: each is a number here, to be adjusted when a better reference comes.

/** the hall's long axis through the compound (the gateway's arch, the stairs and the portico stand on it, give or take a
 *  metre where the mapped outlines are a little off it) */
export const AXIS = 128.6;

export const GH = {
  /** the upper court (the hall's forecourt between the wings, R01-R09, R51-R54) and its level */
  upper: { h: 21.0, x0: -994, x1: -934, z0: 92, z1: 165 },
  /** the lower court (between the wings' east arms and the gateway building, R21-R45), lower than the upper court by
   *  the two flights of R46-R50 */
  lower: { h: 19.5, x0: -933.7, x1: -911, z0: 111, z1: 163 },
  /** the hall's floor: its platform under the portico, the portico steps down to the upper court (R54) */
  floor: 21.9,
  platform: { x0: -1001.5, x1: -990.6, z0: 116.5, z1: 141.5 },
  porticoSteps: { x0: -988.2, x1: -990.8, z0: 119.4, z1: 138.4, steps: 5, tread: 0.52 },
  /** the two flights from the lower court up to the upper court, a landing between (R46-R50), in the gap between the
   *  wings' east arms */
  courtStairs: { x0: -925.6, x1: -934.2, z0: 121.6, z1: 133.6, flights: 2, steps: 5, tread: 0.45 },
  /** the gateway building (osm:way/100307658): its passage through the middle (the arch), the passage floor, the
   *  threshold steps either side (R34-R36: red risers, dark edges) */
  gate: { x0: -909.3, x1: -900.9, z0: 117.7, z1: 140.1, arch: [127.1, 130.1] as [number, number], floor: 19.95, pad: [-910.6, -900.0] as [number, number] },
  gateStepsW: { x0: -912.4, x1: -910.4, z0: 127.2, z1: 130.0, steps: 3, tread: 0.5 },
  gateStepsE: { x0: -898.0, x1: -900.2, z0: 127.2, z1: 130.0, steps: 3, tread: 0.5 },
};

/** the ground boxes the compound's own paving covers (the route lays no asphalt, kerbs or roadside props there) */
export const GH_PAVED: [number, number, number, number][] = [[-1001.5, -890.5, 103.5, 153.5]];

/** the access path from the turning loop through the gateway's arch, across the lower court, up the north side flight
 *  past the planter that divides the lower flight (R46, R47), and across the upper court to the portico
 *  (registry/access.json carries the same points) */
export const GH_VIA: [number, number][] = [[-896, 128.6], [-905, 128.6], [-913, 128.4], [-922, 123.6], [-936, 123.6], [-950, 128.4], [-986, 128.8]];

/** the clock tower (A01: at the upper court's south-west corner, in line with the hall's front; R06-R08, R58, R59): a
 *  rectangular white shaft, the parapet under the projecting square clock stage, the lantern stage and the red cap.
 *  Heights from the photographs' proportions, not measured. */
export const TOWER = { x0: -996.5, x1: -991.1, z0: 143.8, z1: 149.2, shaft: 31.0, stage: [32.2, 37.4] as [number, number], lantern: 39.7, top: 42.8 };
/** the side wings' arched gable passages, one in the middle of each long range (R02, R03, R10, R53, R55): x span, the
 *  range's depth, the court face */
export const GABLES = [{ x0: -972, x1: -966, z0: 92.8, z1: 103.6, face: 103.6 }, { x0: -972, x1: -966, z0: 151.6, z1: 164.1, face: 151.6 }];
/** the square white piers with lantern heads and red caps either side of the way down (R11-R20), the black tanks on
 *  open stands at the wings' east arms (R11-R20), the dark rounded object on its white base (R51-R53; function unknown) */
export const PIERS: [number, number][] = [[-935.2, 117.3], [-935.2, 136.7]];
export const TANKS: [number, number][] = [[-939.0, 117.9], [-938.4, 136.1]];
export const OBJECT = { x: -961, z: 104.6 };
/** the portrait busts along the lower court's south walk, west to east (R25-R33, R37-R45). Only plaques legible in the
 *  close-ups carry names; their order along the walk is not established (the shuttered wall behind R28-R33, the barred
 *  windows behind R40-R45). */
export const BUSTS: { x: number; z: number; name?: string }[] = [
  'EBENEZER ODURO OWUSU', 'CLIFFORD NII-BOI TAGOE', 'IVAN ADDAE-MENSAH', undefined, undefined, undefined,
  'DAVID MOWBRAY BALME', undefined, undefined, undefined, 'ASENSO-OKYERE', 'ERNEST ARYEETEY',
].map((name, i) => ({ x: -931.6 + i * 1.75, z: 143.0, ...(name && { name }) }));
