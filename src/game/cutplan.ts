// The Legon Road (J.J. Rawlings Avenue, the N4) cutting through the interchange at the main gate (the owner's 30-pair
// brief: pairs 8, 13, 14, 18, 19 and the views over it, 15, 16, 21): both carriageways run below the ground between
// tall patterned retaining walls, under the ring's two bridges; the service roads stay at the top on both sides.
// Pure data and geometry (relief.ts gives the ground, legoncut.ts draws it; no three.js here).
//
// The walls stand between each carriageway's outer edge and the service road beside it (half the gap, at most 3 m
// from the carriageway, at least 0.3 m), sampled every 5 m from the mapped roads. The depth (7 m: a 5.8 m clearance
// under a 1.2 m deck) and where the ramps begin and end are not measured: the photographs show the walls along the
// whole of Map C and both bridges. South of the ring the lowered road runs on to where the east carriageway meets the
// east service road (z 405; the owner's 10-pair brief, pair 9 and its plan: the purple north approach kept, the short
// yellow south approach carried on to the blue arrow's end); the east service road runs right against the carriageway
// there, its wall at the least offset. Adjust CUT.depth, CUT.full and CUT.ramp to refine.

/** [z, west wall x, east wall x, west carriageway centre x, east carriageway centre x, west and east service road centre
 *  x (0 where there is none)] every 5 m */
const SAMPLES: [number, number, number, number, number, number, number][] = [[-320,733.14,763.63,739.15,756.13,728.52,771.57],[-315,732.27,762.45,737.96,754.95,727.98,770.71],[-310,731.4,761.27,736.76,753.77,727.44,769.86],[-305,730.73,760.09,735.97,752.59,726.9,769],[-300,730.2,759.03,735.45,751.53,726.35,768.14],[-295,729.62,758.61,734.92,751.11,725.72,767.29],[-290,729.04,758.19,734.4,750.69,725.07,766.43],[-285,728.45,757.77,733.87,750.27,724.43,765.58],[-280,727.86,757.35,733.35,749.85,723.78,764.72],[-275,727.28,756.93,732.82,749.43,723.14,763.87],[-270,726.69,756.51,732.3,749.01,722.49,763.01],[-265,726.11,756.07,731.77,748.59,721.84,762.15],[-260,725.52,755.43,731.25,748.17,721.2,761.3],[-255,724.94,754.8,730.72,747.75,720.55,760.44],[-250,724.35,754.16,730.2,747.33,719.91,759.59],[-245,723.77,753.74,729.67,746.91,719.26,759.17],[-240,723.18,753.35,729.15,746.49,718.62,758.81],[-235,722.59,752.96,728.62,746.07,717.97,758.44],[-230,722.01,752.56,728.1,745.65,717.32,758.08],[-225,721.42,752.23,727.57,745.23,716.68,757.83],[-220,720.9,752.07,727.04,744.81,716.16,757.94],[-215,720.57,751.89,726.52,744.39,716.03,758.05],[-210,720.24,751.47,725.99,743.97,715.89,758.16],[-205,720.06,751.22,725.78,743.72,715.75,758.27],[-200,720.08,751.28,725.95,743.78,715.61,758.37],[-195,720.1,751.34,726.13,743.84,715.47,758.48],[-190,720.12,751.4,726.31,743.9,715.34,758.59],[-185,720.14,751.45,726.48,743.95,715.2,758.7],[-180,720.16,751.51,726.66,744.01,715.06,758.81],[-175,720.18,751.57,726.84,744.07,714.93,758.92],[-170,720.2,751.63,727.01,744.13,714.79,759.03],[-165,720.23,751.69,727.19,744.19,714.66,759.14],[-160,720.26,751.75,727.36,744.25,714.55,759.25],[-155,720.32,751.8,727.54,744.3,714.51,759.36],[-150,720.42,751.86,727.72,744.36,714.52,759.47],[-145,720.51,752.04,727.89,744.54,714.54,759.58],[-140,720.61,752.46,728.07,744.96,714.55,759.69],[-135,720.83,752.88,728.33,745.38,714.56,759.79],[-130,721.31,753.3,728.81,745.8,714.58,759.9],[-125,721.79,753.72,729.29,746.22,714.59,760.52],[-120,722.27,754.14,729.77,746.64,714.85,761.14],[-115,722.75,754.56,730.25,747.06,715.43,761.77],[-110,723.24,754.98,730.74,747.48,716.02,762.4],[-105,723.72,755.4,731.22,747.9,716.6,763.03],[-100,724.2,755.82,731.7,748.32,717.19,763.66],[-95,724.68,756.24,732.18,748.74,717.78,764.29],[-90,725.17,756.66,732.67,749.16,718.36,764.92],[-85,725.65,757.31,733.15,749.81,718.95,765.55],[-80,726.13,758.28,733.63,750.78,719.84,766.17],[-75,726.88,759.25,734.33,751.75,720.83,766.8],[-70,727.87,760.21,735.31,752.71,721.82,767.43],[-65,728.85,761.18,736.29,753.68,722.82,768.06],[-60,729.84,762.15,737.27,754.65,723.81,768.76],[-55,730.83,763.12,738.25,755.62,724.81,769.53],[-50,731.81,764.09,739.23,756.59,725.8,770.31],[-45,732.8,765.02,740.21,757.56,726.79,771.09],[-40,733.79,765.9,741.19,758.53,727.79,771.87],[-35,734.78,766.77,742.17,759.5,728.78,772.64],[-30,735.76,767.64,743.15,760.47,729.78,773.42],[-25,736.75,768.52,744.13,761.44,730.77,774.2],[-20,737.74,769.39,745.12,762.41,731.76,774.97],[-15,738.74,770.26,746.12,763.37,732.76,775.75],[-10,739.73,771.14,747.11,764.34,733.75,776.53],[-5,740.73,772,748.11,765.28,734.74,777.31],[0,741.72,772.81,749.11,766.12,735.74,778.09],[5,742.72,773.62,750.1,766.96,736.73,778.87],[10,743.71,774.43,751.1,767.8,737.73,779.65],[15,744.71,775.23,752.1,768.64,738.72,780.42],[20,745.71,776.03,753.1,769.47,739.71,781.19],[25,746.7,776.84,754.09,770.31,740.71,781.96],[30,747.7,777.64,755.09,771.15,741.7,782.73],[35,748.69,778.45,756.09,771.99,742.7,783.5],[40,749.69,779.25,757.09,772.82,743.69,784.27],[45,750.68,780.05,758.08,773.66,744.68,785.04],[50,751.67,780.86,759.06,774.5,745.68,785.81],[55,752.62,781.7,759.97,775.42,746.67,786.58],[60,753.57,782.52,760.87,776.36,747.67,787.28],[65,754.52,783.34,761.78,777.3,748.66,787.98],[70,755.47,784.16,762.68,778.23,749.65,788.68],[75,756.42,784.97,763.59,779.17,750.65,789.38],[80,757.37,785.79,764.49,780.1,751.64,790.07],[85,758.32,786.61,765.4,781.04,752.64,790.77],[90,759.27,787.42,766.31,781.98,753.63,791.47],[95,760.22,788.22,767.21,782.91,754.62,792.14],[100,761.21,789,768.12,783.84,755.71,792.76],[105,762.3,789.78,769.02,784.77,756.98,793.39],[110,763.39,790.58,769.92,785.69,758.25,794.08],[115,763.33,792.81,770.83,786.62,0,797.6],[120,764.23,794.3,771.73,787.55,0,799.65],[125,765.14,795.18,772.64,788.47,0,800.48],[130,766.04,795.53,773.54,789.4,0,800.26],[135,766.95,795.33,774.45,790.33,0,798.94],[140,767.85,796.06,775.35,791.26,0,798.5],[145,768.76,796.98,776.26,792.18,761.12,799.45],[150,769.66,797.91,777.16,793.11,761.99,800.41],[155,770.57,798.84,778.07,794.04,762.87,801.37],[160,771.47,799.77,778.97,794.97,763.75,802.34],[165,772.38,800.7,779.88,795.9,764.65,803.31],[170,773.28,801.62,780.78,796.82,765.57,804.28],[175,774.19,802.55,781.69,797.75,766.49,805.25],[180,775.09,803.48,782.59,798.68,767.41,806.22],[185,775.99,804.41,783.49,799.61,768.33,807.19],[190,776.9,805.34,784.4,800.54,769.24,808.17],[195,777.8,806.27,785.3,801.47,770.16,809.14],[200,778.71,807.2,786.21,802.4,771.08,810.11],[205,779.61,808.13,787.11,803.33,772,811.07],[210,780.52,809.06,788.02,804.26,772.92,811.98],[215,781.43,809.99,788.93,805.19,773.84,812.89],[220,782.34,810.92,789.84,806.12,774.75,813.8],[225,783.26,811.84,790.76,807.04,775.67,814.71],[230,784.17,812.77,791.67,807.97,776.59,815.62],[235,785.08,813.7,792.58,808.9,777.51,816.52],[240,786,814.63,793.5,809.83,778.43,817.43],[245,786.91,815.56,794.41,810.76,779.35,818.34],[250,787.82,816.49,795.32,811.69,780.27,819.25],[255,788.74,817.42,796.24,812.62,781.18,820.16],[260,789.65,818.35,797.15,813.55,782.1,821.07],[265,790.56,819.28,798.06,814.48,783.02,821.98],[270,791.47,820.21,798.97,815.41,783.94,822.89],[275,792.39,821.14,799.89,816.34,784.86,823.79],[280,793.3,822.06,800.8,817.26,785.78,824.7],[285,794.21,822.99,801.71,818.19,786.7,825.61],[290,795.13,823.92,802.63,819.12,787.61,826.52],[295,796.04,824.85,803.54,820.05,788.53,827.43],[300,796.95,825.66,804.45,820.86,789.45,828.34],[305,797.86,826.44,805.36,821.64,790.33,829.25],[310,798.78,827.22,806.28,822.42,791.18,830.14],[315,799.69,828,807.19,823.2,792.03,831.03],[320,800.38,828.79,807.88,823.99,792.88,831.93],[325,801.04,829.57,808.54,824.77,793.73,832.83],[330,801.7,830.35,809.2,825.55,794.58,833.73],[335,802.37,831.18,809.87,826.33,795.43,834.63],[340,803.03,832.02,810.53,827.11,796.28,835.53],[345,803.69,832.87,811.19,827.9,797.13,836.43],[350,804.35,833.78,811.85,828.83,797.98,837.34],[355,805.14,834.72,812.64,829.81,798.83,838.24],[360,806.21,835.67,813.71,830.8,799.71,839.14],[365,807.28,836.61,814.78,831.78,800.76,840.04],[370,808.35,837.58,815.85,832.76,801.82,840.99],[375,809.42,838.56,816.92,833.75,802.87,841.97],[380,810.49,839.54,817.99,834.73,803.93,842.95],[385,811.56,840.53,819.06,835.72,804.98,843.93],[390,812.62,841.51,820.12,836.7,806.04,844.92],[395,813.69,842.49,821.19,837.68,807.09,845.9],[400,814.76,843.47,822.26,838.67,808.15,846.88],[405,815.83,844.46,823.33,839.65,809.2,847.86],[410,816.9,845.79,824.4,840.99,810.25,848.99],[415,817.97,846.94,825.47,842.14,811.3,850.14],[420,819.04,848.09,826.54,843.29,812.35,851.29]];

export const CUT = {
  /** depth of the lowered road below the ground along its deep run */
  depth: 7.0,
  /** the deep run, north to south (z) */
  full: [-215, 315] as [number, number],
  /** the length of the ramps back up to the ground at either end */
  ramp: [90, 90] as [number, number],
  /** the ring of the interchange: centre, the radius of its inner edge, and the open bowl between the bridges, where
   *  the west side slopes down to the road over stone pitching instead of standing as a wall (pair 13; on the east the
   *  ring road runs too close to the cutting for a slope: the wall stands there); the slope begins `shelf` m inside the
   *  ring's edge: the level island of stone gravel in front of it (the owner's correction, from the street view) */
  ring: { x: 777, z: 126, r: 19.5, z0: 104, z1: 148, bank: 7.5, shelf: 3.4 },
  /** the direction the cutting runs (for telling a rider passing under a bridge from one crossing it) */
  axis: [0.17, 0.985] as [number, number],
  /** bridge deck thickness (its soffit is this far below the road on it) */
  deck: 1.2,
};

const Z0 = SAMPLES[0][0], DZ = 5;
const sample = (z: number, k: 1 | 2 | 3 | 4 | 5 | 6) => {
  const f = Math.max(0, Math.min(SAMPLES.length - 1.000001, (z - Z0) / DZ)), i = Math.floor(f), t = f - i;
  return SAMPLES[i][k] + (SAMPLES[i + 1][k] - SAMPLES[i][k]) * t;
};
/** the west and east wall faces' x at z */
export const wallW = (z: number) => sample(z, 1);
export const wallE = (z: number) => sample(z, 2);
/** the west and east carriageways' centre x at z */
export const laneW = (z: number) => sample(z, 3);
export const laneE = (z: number) => sample(z, 4);
/** the west and east service roads' centre x at z (0: none there) */
export const serviceW = (z: number) => { const a = Math.floor((z - Z0) / DZ); return SAMPLES[a]?.[5] && SAMPLES[a + 1]?.[5] ? sample(z, 5) : 0; };
export const serviceE = (z: number) => { const a = Math.floor((z - Z0) / DZ); return SAMPLES[a]?.[6] && SAMPLES[a + 1]?.[6] ? sample(z, 6) : 0; };
/** the cutting's north and south ends (where the road is back at the ground) */
export const CUT_Z: [number, number] = [CUT.full[0] - CUT.ramp[0], CUT.full[1] + CUT.ramp[1]];

const smooth = (t: number) => t * t * (3 - 2 * t);
/** how far the road is below the ground at z (0 beyond the ramps) */
export function cutDepth(z: number) {
  const [a, b] = CUT.full;
  if (z >= a && z <= b) return CUT.depth;
  if (z < a) return z <= CUT_Z[0] ? 0 : CUT.depth * smooth((z - CUT_Z[0]) / CUT.ramp[0]);
  return z >= CUT_Z[1] ? 0 : CUT.depth * smooth((CUT_Z[1] - z) / CUT.ramp[1]);
}
/** between the walls of the cutting */
export const inTrench = (x: number, z: number) => z > CUT_Z[0] && z < CUT_Z[1] && x > wallW(z) && x < wallE(z);
/** in the open bowl inside the ring between its bridges (its sloping west side and the road below it) */
export const inBowl = (x: number, z: number) => z > CUT.ring.z0 && z < CUT.ring.z1 && Math.hypot(x - CUT.ring.x, z - CUT.ring.z) < CUT.ring.r && x < (wallW(z) + wallE(z)) / 2;
/** on the bowl's slope (outside the west wall line) */
export const onBowlSlope = (x: number, z: number) => inBowl(x, z) && x <= wallW(z);
/** the ground's drop below the surrounding ground at x, z: the road's depth between the walls, a slope down to it in the
 *  bowl, 0 elsewhere */
export function cutDrop(x: number, z: number) {
  if (z <= CUT_Z[0] || z >= CUT_Z[1]) return 0;
  const w = wallW(z), e = wallE(z), D = cutDepth(z);
  if (x > w && x < e) return D;
  if (!inBowl(x, z) || x >= e) return 0;
  // the slope reaches the ground at the ring's inner edge (steeper toward the bridges, where the ring closes in)
  const R = CUT.ring, ri = R.r - R.shelf, edge = R.x - Math.sqrt(Math.max(0, ri * ri - (z - R.z) ** 2));
  const d = w - x, t = d / Math.max(0.8, Math.min(R.bank, w - edge));
  return t >= 1 ? 0 : D * (1 - smooth(t));
}

/** the bridges: each deck's outline (x, z), its road height above the base ground, and the roads it carries */
export interface Deck { name: string; pts: [number, number][]; h: number }
export const DECKS: Deck[] = [
  // the ring's north arc and the footway beside it (pair 8, 13, 14, 18)
  { name: 'north bridge', h: 0, pts: [[758.5, 94.6], [767.5, 94.8], [782.8, 92.6], [792.6, 91.2], [792.6, 113.4], [789.6, 110.9], [784.4, 108.4], [778.9, 107.2], [773.2, 107.3], [767.7, 108.7], [762.7, 111.4], [758.5, 114.0]] },
  // the ring's south arc and the footway beside it
  { name: 'south bridge', h: 0, pts: [[767.5, 144.6], [772.1, 145.4], [778.3, 145.7], [784.3, 144.5], [789.8, 141.8], [794.5, 137.8], [800.0, 135.2], [800.0, 154.8], [794.0, 156.6], [778.7, 160.3], [767.5, 162.9]] },
];
const inPoly = (pts: [number, number][], x: number, z: number) => {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
};
const DECK_BOX = DECKS.map((d) => ({ x0: Math.min(...d.pts.map((p) => p[0])), x1: Math.max(...d.pts.map((p) => p[0])), z0: Math.min(...d.pts.map((p) => p[1])), z1: Math.max(...d.pts.map((p) => p[1])) }));
/** the bridge deck over x, z (only over the cutting: elsewhere the ground is the road) */
export function deckAt(x: number, z: number): Deck | null {
  for (let i = 0; i < DECKS.length; i++) {
    const b = DECK_BOX[i];
    if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) continue;
    if (inPoly(DECKS[i].pts, x, z)) return DECKS[i];
  }
  return null;
}
/** within the cutting or on a bridge, pad metres out: no street trees, lamps, kerbs or verges of the campus roads */
export const inCutBand = (x: number, z: number, pad = 0) =>
  z > CUT_Z[0] - pad && z < CUT_Z[1] + pad && x > wallW(z) - pad - (inBowl(x, z) ? CUT.ring.bank : 0) && x < wallE(z) + pad + (inBowl(x, z) ? CUT.ring.bank : 0)
  || !!deckAt(x, z);
/** heading (unit x, z) along the cutting rather than across it */
export const alongCut = (hx: number, hz: number) => Math.abs(hx * CUT.axis[0] + hz * CUT.axis[1]) > 0.92;

/** the footways along the bridges' outer edges (the mapped footpaths over the decks; the owner's Street View, Sep 2024,
 *  from the north bridge's west end): grey block paving raised on a kerb between the outer parapet and an inner pipe
 *  railing along the road, white bollards across the north bridge's footway at its west end. The outer edge, the side
 *  the footway lies toward (+1: south of the edge), its width. */
export const DECK_WALKS: { outer: [number, number][]; inward: 1 | -1; w: number; bollardsAt?: number }[] = [
  { outer: [[758.5, 94.6], [767.5, 94.8], [782.8, 92.6], [792.6, 91.2]], inward: 1, w: 3.0, bollardsAt: 759.4 },
  { outer: [[767.5, 162.9], [778.7, 160.3], [794.0, 156.6], [800.0, 154.8]], inward: -1, w: 3.0 },
];
/** the outer edge's z at x on a footway (NaN off its run) */
export function walkEdgeZ(wk: (typeof DECK_WALKS)[number], x: number) {
  const p = wk.outer;
  for (let i = 1; i < p.length; i++) if (x >= p[i - 1][0] && x <= p[i][0]) return p[i - 1][1] + ((p[i][1] - p[i - 1][1]) * (x - p[i - 1][0])) / (p[i][0] - p[i - 1][0]);
  return NaN;
}
/** on a bridge footway (the campus path is not drawn there: science.ts offAsphalt; legoncut.ts paves it) */
export function onDeckWalk(x: number, z: number) {
  for (const wk of DECK_WALKS) {
    const e = walkEdgeZ(wk, x);
    if (Number.isNaN(e)) continue;
    const d = (z - e) * wk.inward;
    if (d > -0.5 && d < wk.w + 0.6) return true;
  }
  return false;
}
