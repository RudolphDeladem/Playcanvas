// The Kuffour Quadrangle behind the Balme Library, J.K.M. Hodasi Road, Cruise O'Brien Road and the Plant and
// Environmental Biology frontage: the calibration values the owner's reconstruction brief asks to keep adjustable (seven
// game/photo pairs and an overhead map). Nothing here is surveyed: the map has no scale bar and the photos give relative
// heights and local edges, not elevations or exact dimensions. The terrain (relief.ts), the garden, its walls and
// monuments (kuffourgarden.ts), the unfinished building and its hoarding (behindbalme.ts), the department's verandas
// (biology.ts), the plain stretches of the route (world.ts) and the seven comparison cameras (tools/preview) read these
// numbers, so one change keeps the views consistent.
//
// The map (image 15) matched to the game at 4.23 px/m, north up: J.K.M. Hodasi Road at z -162 across the top, Cruise
// O'Brien Road at x 97-98 down the right, the road south of the garden at z -88 and the library beyond it; the garden's
// centre circle at (5.7, -124.3).

/** Cruise O'Brien Road's centre line (x at z) */
export const croX = (z: number) => 97 + (-88 - z) / 75;

export const KQ = {
  /** the garden: its outer walls (north and south runs jog out toward the roads between jx0 and jx1), its ground
   *  raised h above the roads round it */
  garden: { x0: -28, x1: 40, z0: -153.6, z1: -94.4, nz: -156.6, sz: -91.8, jx0: -10, jx1: 22.5, h: 0.4 },
  /** the low stone walls: their top above the ground outside, thickness, the pale coping's thickness and overhang */
  wall: { top: 0.62, thick: 0.4, coping: 0.08, over: 0.06 },
  /** the entrances on the axis through the north and south walls: x from, to */
  gate: { x0: 3.8, x1: 7.6 },
  /** the paved square in the middle (the dusty pale paving round the circle) */
  square: { x0: -15, x1: 27, z0: -145.4, z1: -103.6 },
  /** the round fountain at the centre: basin radius; the sculpture's finish (the newer photos show it pale; the owner's
   *  earlier photo shows it blue: the brief asks for the chosen state to be documented) */
  centre: [5.7, -124.3] as [number, number],
  fountain: { r: 5.2, sculpture: 'pale' as 'pale' | 'blue' },
  /** the ring of segmented features round the circle: inner and outer radius; the water basins east, west and south,
   *  the planted bed north; the eight shrub beds between them (angle off the axes, degrees) */
  ring: { r0: 13.2, r1: 17.8, half: 21, northHalf: 15, beds: 31, bedR: 15.6 },
  /** the paths through the lawns: east-west across the garden, north-south from the square to the south gate */
  ewPath: { z0: -127.3, z1: -121.3 },
  /** the memorial approach from Hodasi Road (pair 1): tiled floor between low stone side walls from the road's edge
   *  to the red landing; the landing, its raised red edge; the black portrait memorial on its stepped plinth */
  approach: { z0: -159.6, z1: -154.6 },
  landing: { x0: 1.8, x1: 9.6, z0: -154.6, z1: -147.6, h: 0.1 },
  memorial: [5.7, -151.0] as [number, number],
  /** the dark standing statue on its pedestal (pair 2) and the zebra crossings over Hodasi Road (pair 3: the one on
   *  the approach's axis) */
  statue: [1.0, -148.6] as [number, number],
  zebras: [[5.7, -162], [26.4, -162]] as [number, number][],
  /** Hodasi Road's south edge here (z) and the earth strip between it and the garden wall */
  hodasiEdge: -158.9,
  /** the unfinished building (pair 4, from the map's pale roof at x 70.7-79, z -132-116.5) and its hoarding */
  shell: { x0: 70.6, x1: 81.4, z0: -133.0, z1: -116.4, floors: 2, storey: 3.3, over: 1.3 },
  hoard: { x0: 69.4, x1: 91.0, z0: -155.0, z1: -108.2, h: 2.4 },
  /** the parked pickup on the apron in pair 4: a reference prop the brief allows, not architecture (false removes it) */
  pickup: true,
  /** the brick apron south of the hoarding to the road at z -88, its curved kerb toward Cruise O'Brien Road */
  apron: { z1: -91.6, kerbR: 4.5 },
  /** along Cruise O'Brien Road on the west: the brick strip by the hoarding, the open drain (x from its road edge) */
  croDrain: { out: 0.3, width: 0.45 },
  /** Cruise O'Brien Road's east verge (pair 5): from the road's edge a narrow footway, then a grassy rise to the stone
   *  wall, the hedge on top (x of the wall face; the rise's height at the wall's foot) */
  croEast: { foot: 1.3, wallX: 105.6, rise: 0.42, z0: -153.2, z1: -97.0 },
  /** the department's frontage (pairs 6 and 7): the veranda along the west wing's east face (its wall's x, z from, to);
   *  the narrow concrete edging between the verge and the lawn (seen diagonally in pair 7); the bay with the air
   *  conditioner (x) */
  veranda: { x: 65.6, z0: -189.2, z1: -180.4 },
  strip: [[46, -174], [121, -174]] as [number, number][],
  acBay: 86.4,
  /** stretches of road with no painted edges, generic pavements or drains (the real roads here have their own edges) */
  plain: [[-40, 125, -168, -155], [91, 107, -166, -84]] as [number, number, number, number][],
};

/** the seven comparison cameras, one per reference photo (eye, look: heights above the ground; vertical field of view).
 *  Provisional: the photos' stations, headings and lenses are estimated from matching landmarks, not measured. */
export const KQ_VIEWS: { name: string; eye: [number, number, number]; look: [number, number, number]; fov: number; note: string }[] = [
  { name: 'kq1', eye: [5.7, 1.55, -160.4], look: [5.5, 2.4, -100], fov: 46, note: 'the memorial approach from Hodasi Road toward the library tower: tiles, side walls, red landing, the memorial between two palms' },
  { name: 'kq2', eye: [17.5, 2.4, -170.8], look: [5.15, 18, -25.6], fov: 58, note: 'the quadrangle from the mouth of the road north of Hodasi Road: the stone wall, the statue, the sculpture, the library' },
  { name: 'kq3', eye: [16, 1.6, -166.8], look: [35.3, -1.0, -143.8], fov: 44, note: 'the zebra crossing and the garden\'s north-east wall, the hoarding and its trees beyond' },
  { name: 'kq4', eye: [70, 1.6, -90], look: [82.7, 4.2, -117.2], fov: 44, note: 'the unfinished building in its hoarding from the brick apron' },
  { name: 'kq5', eye: [96.0, 1.6, -159.5], look: [97.6, 1.6, -100], fov: 44, note: 'Cruise O\'Brien Road southward from Hodasi Road: the grassy rise, wall and hedge on the left, the hoarding on the right' },
  { name: 'kq6', eye: [77, 1.5, -167.5], look: [63, 2.2, -193.5], fov: 44, note: 'the department\'s veranda and the inside corner with the west wing' },
  { name: 'kq7', eye: [100, 1.5, -168], look: [86, 2.2, -192], fov: 44, note: 'further east along the frontage under the trees: the veranda, the air conditioner, the concrete strip' },
];
