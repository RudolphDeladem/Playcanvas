// Where the game's ground layers (roadedges.ts, surfaces.ts) draw nothing: a site of the original models its own
// edges and ground there (ownsEdges), the NSIA Road's and the Kuffour Quadrangle's plain stretches, the Legon Road
// cutting, stairs, earth and brick roads.
import { inStairs } from './relief';
import { inCutBand } from './cutplan';
import { ownsEdges } from './ipsplan';
import { offAsphalt } from './science';
import { NSIA } from './nsia';
import { KQ } from './kuffour';

const plain = (x: number, z: number) => [NSIA.plain, ...KQ.plain].some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1);
export const excludedAll = (x: number, z: number) => plain(x, z) || ownsEdges(x, z) || inCutBand(x, z, 1) || inStairs(x, z) || offAsphalt(x, z);
