// The main entrance brief (the owner's 37 game/photo pairs, Map A for pairs 1-3 and the three corrected blue-arrow maps
// for 4-37, four further photographs): the Provost office frontage of the College of Agriculture and Consumer Sciences
// south of Dr J B Danquah Avenue, the main gate precinct east of the La Road roundabout (the gatehouse, its low wings,
// the flag plaza and fountain, the black University of Ghana signs), the Institute of African Studies and its detached
// pavilion north of the avenue, the Jones-Quartey Building and the earth approach to it, the low wings along La Road,
// the Finance Directorate, the School of Performing Arts and the Efua Sutherland Drama Studio. The adjustable numbers
// live here; nothing is surveyed: the aerial maps give plan relationships (matched to the game at about 7 px/m for Map
// 1, 5.9 for Map 2, 5 for Map 3 and 7 for Map A), the photographs elevations and local ground.

export const EN = {
  // ---------- the main gate precinct (pairs 4-17, 25) ----------
  /** the gatehouse: a low through-building spanning north-south across the approach (x0, x1, z0, z1); its eaves; the
   *  portal's width (along z) and clear height; the roof's pitch and overhang */
  gate: { x0: 655.0, x1: 665.0, z0: 116.5, z1: 140.3, mid: 128.8, eave: 6.2, wingEave: 3.7, pier: 3.7, portal: 9.0, clear: 4.6, pitch: 0.42, over: 1.3 },
  /** the low wings north and south of the gate (one storey, white with a red base), x0, x1, z0, z1 */
  wings: [[641.3, 683.1, 97.7, 107.0], [640.8, 681.0, 149.1, 158.4]] as [number, number, number, number][],
  wingEave: 3.4,
  /** the flag plaza east of the gate: its outline (its east end kept back from the ring road, which is wide there: the
   *  owner's correction), the fountain basin, the two flag lines along its long sides */
  plaza: [692.0, 745.5, 114.5, 142.0] as [number, number, number, number],
  basin: [701.0, 732.0, 124.0, 131.5] as [number, number, number, number],
  flags: 9,
  /** the black University of Ghana signs under their tiled canopies at the plaza's east corners (x, z, facing yaw) */
  signs: [[738.5, 138.5, -0.35], [738.0, 119.0, 0.35]] as [number, number, number][],
  /** the blue chain bollards along the brick footway of the gate-side street north of the gate, and round the bend to La
   *  Road (from, to) */
  bollards: [[[641, 109.0], [688, 109.0]], [[636.2, 104.0], [641, 109.0]]] as [number, number][][],
  // ---------- the Institute of African Studies (pairs 18-24, 26) ----------
  /** the Kwame Nkrumah Complex: a cross of two-storey wings; the west front's twin gabled wings, the main (south) entrance
   *  with its porch; eaves and roof pitch */
  ias: { x0: 556.5, x1: 595.5, z0: 53.5, z1: 97.0, eave: 7.4, pitch: 0.5 },
  /** the stepped stone terraces before the south entrance down to the avenue (levels above the road) */
  iasTerrace: [0.45, 0.9, 1.3],
  /** the detached one-storey pavilion south of the avenue (x0, x1, z0, z1; eaves) */
  pavilion: [523.5, 538.5, 155.5, 170.0] as [number, number, number, number],
  pavilionEave: 3.3,
  /** the two-storey white building above the roadside bank east of the Institute (x0, x1, z0, z1) and the bank's rise */
  whiteHouse: [603.5, 619.0, 57.0, 73.0] as [number, number, number, number],
  bank: 1.4,
  // ---------- the Jones-Quartey Building and its surroundings (pairs 27-37) ----------
  /** the JQB: its footprint, its storeys and floor height, the signed core on the south front (x) */
  jqb: { x0: 543.6, x1: 593.3, z0: -82.5, z1: -34.4, floors: 4, fh: 3.6 },
  /** where the mapped paths over the JQB's south lawn are drawn as earth, not concrete (x0, x1, z0, z1) */
  earthBox: [536, 600, -28, 40] as [number, number, number, number],
  /** the red-earth approach from the south lawn to the JQB (centre line, half width) */
  earth: { pts: [[592, 30], [584, 14], [574, 0], [566, -12]] as [number, number][], half: 3.5 },
  /** the mapped footpath from Annie Jiagge Road up across the raised lawn to the JQB, drawn as red earth, not concrete
   *  (the owner's second corrections, A01/A02): its stretch west of earthBox (centre line, half width) */
  earthWest: { pts: [[509.5, 44.4], [532, 35], [537, 32.8]] as [number, number][], half: 1.7 },
  /** the asphalt parking between the JQB's east front and La Road */
  parking: [596.0, 622.0, -84.0, -22.0] as [number, number, number, number],
  /** the Finance Directorate and Student Accounts Office: two low detached wings (x0, x1, z0, z1) */
  finance: [[639.5, 657.0, -77.0, -66.0], [645.0, 672.0, -61.0, -50.0]] as [number, number, number, number][],
  /** the mural court east of La Road: its paved floor and the short white wall with the portrait */
  muralCourt: [639.0, 662.0, 49.0, 66.0] as [number, number, number, number],
  // ---------- the College of Agriculture's Provost office frontage (pairs 1-3) ----------
  /** the oval forecourt (centre, half lengths) and the frontage block (x0, x1, z0, z1) */
  oval: { c: [372.0, 161.5] as [number, number], rx: 11.0, rz: 3.6, loop: 6.0 },
  provost: [348.0, 396.0, 175.0, 189.0] as [number, number, number, number],
  // ---------- the School of Performing Arts and the Efua Sutherland Drama Studio (additional images) ----------
  drama: { c: [596.0, 168.0] as [number, number], r: 17.5 },
};

/** the 37 comparison cameras (eye, look: heights above the ground; vertical field of view), set along the owner's
 *  arrows (Map A for 1-3, the corrected maps for 4-37), then moved to where each photograph was evidently taken (the
 *  footway, the terrace, the verge) without turning against the arrow; estimated, not measured */
export const EN_VIEWS: { name: string; eye: [number, number, number]; look: [number, number, number]; fov: number; note: string }[] = [
  { name: 'en1', eye: [368, 1.6, 140], look: [372, 4.5, 178], fov: 60, note: 'the Provost office frontage across Danquah Avenue' },
  { name: 'en2', eye: [375, 1.6, 148.5], look: [375, 4.5, 182], fov: 55, note: 'the central entrance and the oval forecourt' },
  { name: 'en3', eye: [396.5, 1.6, 160], look: [378, 3.0, 174], fov: 58, note: 'the admission side and the College sign' },
  { name: 'en4', eye: [612, 1.6, 127], look: [660, 4.0, 128], fov: 45, note: 'the gate from the axial approach' },
  { name: 'en5', eye: [611, 1.6, 100], look: [659, 4.0, 127], fov: 60, note: 'the gate from the left-curving approach' },
  { name: 'en6', eye: [760, 1.6, 149], look: [735, 2.0, 128], fov: 60, note: 'the black University of Ghana sign from the south-east' },
  { name: 'en7', eye: [752, 2.2, 132], look: [690, 4.0, 127], fov: 62, note: 'the flag plaza and fountain toward the gate' },
  { name: 'en8', eye: [699, 1.6, 134], look: [660, 4.0, 129], fov: 55, note: 'the gatehouse front between palms' },
  { name: 'en9', eye: [742, 2.0, 125], look: [680, 3.5, 115], fov: 58, note: 'the plaza toward the flag line and the gate wing' },
  { name: 'en10', eye: [720, 1.6, 97], look: [682, 2.5, 124], fov: 60, note: 'the gate-side wing across the open grass' },
  { name: 'en11', eye: [759, 1.6, 224], look: [687, 3.0, 227], fov: 55, note: 'the long low wing and service wall' },
  { name: 'en12', eye: [760, 1.6, 253], look: [719, 3.0, 282], fov: 55, note: 'the service edge with the speed sign' },
  { name: 'en13', eye: [766, 1.6, 130], look: [715, 3.0, 129], fov: 55, note: 'the paved walk to the gate-side court' },
  { name: 'en14', eye: [690, 1.6, 108.4], look: [650, 2.0, 110], fov: 62, note: 'the tree-lined road and brick verge near the gate' },
  { name: 'en15', eye: [693, 1.6, 104], look: [668, 2.5, 106], fov: 62, note: 'the gate-side street with bollards' },
  { name: 'en16', eye: [686, 1.6, 108.6], look: [645, 2.0, 108], fov: 60, note: 'the service approach along the gate wing' },
  { name: 'en17', eye: [697, 1.6, 138], look: [660, 4.0, 131], fov: 55, note: 'the gate portal from the south side of the island' },
  { name: 'en18', eye: [561, 1.6, 130], look: [528, 2.0, 153], fov: 55, note: 'the low pavilion from the Institute roadway' },
  { name: 'en19', eye: [514, 1.6, 141], look: [528, 2.0, 160], fov: 55, note: 'the pavilion approach and the Institute sign' },
  { name: 'en20', eye: [540, 1.6, 76], look: [560, 5.0, 76], fov: 62, note: 'the Kwame Nkrumah Complex frontal gables' },
  { name: 'en21', eye: [600, 1.6, 113], look: [585, 5.0, 100], fov: 60, note: 'the Institute main elevation and stepped stone court' },
  { name: 'en22', eye: [588, 1.6, 118.5], look: [583, 4.5, 99], fov: 60, note: 'the Institute frontage across the roadway' },
  { name: 'en23', eye: [535, 1.6, 63], look: [553, 5.0, 65], fov: 55, note: 'the Institute end gable and brick apron' },
  { name: 'en24', eye: [560, 1.6, 111], look: [568, 3.5, 98], fov: 60, note: 'the Institute entrance with the sculptures' },
  { name: 'en25', eye: [652, 1.6, 109], look: [637, 1.5, 121], fov: 60, note: 'the road bend and the blue chain bollards' },
  { name: 'en26', eye: [619, 1.6, 103], look: [605, 4.0, 86], fov: 55, note: 'the white building above the roadside bank' },
  { name: 'en27', eye: [626, 1.6, 56.5], look: [645, 2.0, 55], fov: 62, note: 'the tree-shaded court and the mural wall' },
  { name: 'en28', eye: [627, 1.6, 47], look: [645, 2.0, 53], fov: 62, note: 'the mural court close' },
  { name: 'en29', eye: [633.5, 1.6, 24], look: [640, 2.5, -2], fov: 62, note: 'the tree-lined road beside the low office wing' },
  { name: 'en30', eye: [594, 1.6, 19], look: [574, 6.0, -2], fov: 60, note: 'the JQB from the roadside through long grass' },
  { name: 'en31', eye: [568, 1.6, 36], look: [564, 6.0, -7], fov: 60, note: 'the earth approach to the JQB' },
  { name: 'en32', eye: [560, 1.6, 4], look: [568, 7.0, -30], fov: 62, note: 'the JQB signed end and the kiosk' },
  { name: 'en33', eye: [522, 1.6, -28], look: [546, 6.0, -52], fov: 60, note: 'the JQB blind side wall' },
  { name: 'en34', eye: [545, 1.6, -24], look: [556, 7.0, -36], fov: 65, note: 'the JQB lightwell and fins' },
  { name: 'en35', eye: [626, 1.6, -24], look: [597, 5.0, -55], fov: 60, note: 'the JQB parking edge' },
  { name: 'en36', eye: [628, 1.6, -48], look: [645, 3.0, -55], fov: 60, note: 'the Finance Directorate junction' },
  { name: 'en37', eye: [611, 1.6, -27], look: [594, 6.5, -50], fov: 60, note: 'the JQB long finned frontage' },
];
