// Ground-surface classification: every mapped surface of the campus given a class from the evidence, written to
// src/data/surfaces.json for the game (src/game/surfaces.ts draws it; the material for each class lives there, apart
// from this file, so correcting a class never moves any geometry).
//
// Evidence, read only from the original project (ORIG, default ../legonrush-world):
//   data/geography/legon-master.geojson   the authoritative geography the game's map is built from: road and path
//                                         lines with their OSM class, width and surface tag; ground areas (car parks,
//                                         plazas, lawns, pitches...) with their source and the owner's notes; the
//                                         owner's corrections already applied (registry/corrections.json)
//   data/legon.osm                        the raw OSM ways, for tags the master leaves out (parking surface, access)
//   tools/surfaces/audit-before.json      (optional) how each surface renders today, measured from above by
//                                         tools/surfaces/audit.html: a car park that renders as grass is corrected
//
// Each entry: { id, geom: 'area' | 'line', cls, pts: [x, z, ...] (game metres), w (lines: width), conf, why, review? }
// conf: 'owner' (the owner's photos or marked aerials), 'tagged' (an OSM surface or feature tag), 'class' (the OSM
// feature type alone), 'unverified' (nothing says what the surface is: left as rendered, listed for review).
// Usage: node tools/surfaces/classify.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const ORIG = resolve(ROOT, process.env.ORIG ?? '../legonrush-world');
const master = JSON.parse(readFileSync(resolve(ORIG, 'data/geography/legon-master.geojson'), 'utf8'));
const LAT0 = 5.6518, LNG0 = -0.1871, M_LAT = 110574, M_LNG = 111320 * Math.cos((LAT0 * Math.PI) / 180);
// (the game's frame, as the original's scripts/geography/lib.mjs, rounded to decimetres as the game's map is)
const local = ([lng, lat]) => [Math.round((lng - LNG0) * M_LNG * 10) / 10, Math.round(-(lat - LAT0) * M_LAT * 10) / 10];

// ---- raw OSM tags by way id
const osmTags = new Map();
{
  const xml = readFileSync(resolve(ORIG, 'data/legon.osm'), 'utf8');
  const re = /<way id="(\d+)"[^>]*>([\s\S]*?)<\/way>/g;
  let m;
  while ((m = re.exec(xml))) {
    const tags = {};
    for (const t of m[2].matchAll(/<tag k="([^"]+)" v="([^"]*)"\s*\/>/g)) tags[t[1]] = t[2];
    osmTags.set(m[1], tags);
  }
}
const tagsOf = (id) => { const m = /^osm:way\/(\d+)$/.exec(id ?? ''); return m ? osmTags.get(m[1]) ?? {} : {}; };

// the render as shipped (audit-before.json: with PlayCanvas's depth-bias flaw, grass through flat layers seen from
// above) and with the converted campus's ground layers lifted apart (audit-lifted.json, campus.ts): the second decides
// what is still wrong; both are kept with each feature for the report
const readAudit = (f) => (existsSync(resolve(HERE, f)) ? JSON.parse(readFileSync(resolve(HERE, f), 'utf8')) : null);
const shipped = readAudit('audit-before.json'), lifted = readAudit('audit-lifted.json');
const audit = lifted ?? shipped;
const auditOf = (id) => audit?.features?.[id];
const shippedOf = (id) => shipped?.features?.[id];

// ---- surface tag -> class, for lines (roads and paths)
const PAVERS = new Set(['paving_stones', 'sett', 'pebblestone', 'concrete:plates', 'unhewn_cobblestone', 'cobblestone']);
const EARTH = new Set(['compacted', 'ground', 'dirt', 'earth', 'sand', 'unpaved', 'mud']);
const GRAVEL = new Set(['gravel', 'fine_gravel']);
const HARD = new Set(['asphalt', 'paved']);
const ROADLIKE = new Set(['service', 'residential', 'unclassified', 'tertiary', 'secondary', 'trunk', 'trunk_link', 'tertiary_link', 'secondary_link', 'track', 'living_street']);

function lineClass(p) {
  const s = p.surface, road = ROADLIKE.has(p.class);
  if (s && PAVERS.has(s)) return road ? ['pavers-road', 'tagged', `OSM highway=${p.class} surface=${s}`] : ['pavers-walk', 'tagged', `OSM highway=${p.class} surface=${s}`];
  if (s && EARTH.has(s)) return ['earth', 'tagged', `OSM highway=${p.class} surface=${s}`];
  if (s && GRAVEL.has(s)) return ['gravel', 'tagged', `OSM highway=${p.class} surface=${s}`];
  if (s === 'concrete') return road ? ['concrete-road', 'tagged', `OSM highway=${p.class} surface=concrete`] : ['concrete-walk', 'tagged', `OSM highway=${p.class} surface=concrete`];
  if (s === 'grass') return ['grass', 'tagged', `OSM highway=${p.class} surface=grass`];
  if (s && HARD.has(s)) return road ? ['asphalt', 'tagged', `OSM highway=${p.class} surface=${s}`] : ['asphalt-walk', 'tagged', `OSM highway=${p.class} surface=${s}`];
  // no surface tag: a road is drawn as asphalt (the OSM default for its class), a footway or path is left as it is
  if (road) return ['asphalt', 'class', `OSM highway=${p.class}, no surface tag (asphalt assumed, as before)`];
  return [null, 'unverified', `OSM highway=${p.class}, no surface tag`];
}

// ---- areas
function areaClass(f) {
  const p = f.properties, t = tagsOf(f.id), note = p.note ?? '';
  const owner = (p.src ?? []).includes('owner-imagery') || /owner/i.test(note);
  switch (p.class) {
    case 'parking': {
      const s = t.surface;
      const mat = s && PAVERS.has(s) ? 'parking-pavers' : /pavers?\b/i.test(note) ? 'parking-pavers' : 'parking';
      const why = [owner ? `owner: ${note.slice(0, 160)}` : `OSM amenity=parking${t.parking ? ` parking=${t.parking}` : ''}${s ? ` surface=${s}` : ''}`];
      return [mat, owner ? 'owner' : s ? 'tagged' : 'class', why.join('')];
    }
    case 'plaza': return ['plaza', owner ? 'owner' : 'class', owner ? `owner: ${note.slice(0, 160)}` : `mapped ${p.subclass}${p.name ? ` (${p.name})` : ''}`];
    case 'grass': return ['grass', owner ? 'owner' : 'class', `mapped ${p.subclass}`];
    default: return [null];
  }
}

const out = [];
const counts = {};
const count = (k) => (counts[k] = (counts[k] ?? 0) + 1);
for (const f of master.features) {
  const p = f.properties;
  if (p.game === false) continue;
  if (p.layer === 'road' || p.layer === 'path') {
    if (f.geometry.type !== 'LineString') continue;
    const [cls, conf, why] = lineClass(p);
    count(`line:${cls ?? 'unverified'}:${conf}`);
    // (asphalt roads render as asphalt already: nothing to draw; they are counted, not listed)
    if (cls === 'asphalt') continue;
    // (at least as wide as the strip the game draws for its class, which it covers: ROAD_WIDTH in life.ts)
    const GAME_W = [9, 7.4, 6.2, 4.6, 2.6];
    const la = auditOf(f.id);
    const ls = shippedOf(f.id);
    out.push({ id: f.id, geom: 'line', cls, osm: p.class, gcls: p.cls, ...(la ? { before: la } : {}), ...(ls && lifted ? { shipped: ls } : {}), w: Math.max(p.width ?? 0, GAME_W[p.cls] ?? 0) + 0.2, pts: f.geometry.coordinates.flatMap(local), conf, why, ...(cls ? {} : { review: 'surface unknown: no OSM surface tag; left as rendered' }) });
  } else if (p.layer === 'area') {
    const [cls, conf, why] = areaClass(f);
    if (!cls) continue;
    count(`area:${cls}:${conf}`);
    const ring = f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : null;
    if (!ring) continue;
    const a = auditOf(f.id);
    const sh = shippedOf(f.id);
    out.push({ id: f.id, geom: 'area', cls, sub: p.subclass, pts: ring.slice(0, -1).flatMap(local), conf, why, ...(a ? { before: a } : {}), ...(sh && lifted ? { shipped: sh } : {}) });
  }
}

// a car park, plaza or path the audit found already drawn right (by a site model of the original) is left to it;
// one rendered as grass (or as the wrong material) is corrected
const GREEN = 0.25;
for (const e of out) {
  const a = e.before;
  if (!a) continue;
  if (e.geom === 'area' && (e.cls === 'parking' || e.cls === 'parking-pavers' || e.cls === 'plaza')) e.fix = a.green >= GREEN;
  if (e.geom === 'area' && e.cls === 'grass') e.fix = false; // the ground is grass already where nothing else is drawn
}
// areas the lifted audit still finds part green, inspected from above one by one (tools/surfaces/audit.html thumbnails,
// 2026-10-18): the map's polygon is broader than the paved part, and the site the original modelled there shows the
// real layout, so they are left as modelled and listed for review (map and model disagree)
const DECISIONS = {
  'osm:way/278303117': 'OWNER: tagged paving stones in OSM, asphalt in the owner\'s satellite picture (aerial view 18): left as the original draws it',
  // UPSA: OSM maps car parks over the whole compound; the original models it (upsagreen, the owner's UPSA evidence
  // audit) as patchy grass and bare earth with marked bay strips: map and model disagree, nothing drawn over the model
  'osm:way/1533364968': 'OWNER REVIEW: UPSA: OSM car park, modelled by the original as grass and bare earth with bay strips',
  'osm:way/1533364969': 'OWNER REVIEW: UPSA: OSM car park, modelled by the original as grass and bare earth with bay strips',
  'osm:way/1533364970': 'OWNER REVIEW: UPSA: OSM car park, modelled by the original as grass and bare earth with bay strips',
  'osm:way/1533364971': 'OWNER REVIEW: UPSA: OSM car park, modelled by the original as grass and bare earth with bay strips',
  'osm:way/1533364972': 'OWNER REVIEW: UPSA: OSM car park, modelled by the original as grass and bare earth with bay strips',
  'osm:way/1533364973': 'OWNER REVIEW: UPSA: OSM car park, modelled by the original as grass and bare earth with bay strips',
  'osm:way/1533364974': 'OWNER REVIEW: UPSA: OSM car park, modelled by the original as grass and bare earth with bay strips',
  'osm:way/1533364978': 'OWNER REVIEW: UPSA: OSM car park, modelled by the original as grass and bare earth with bay strips',
  'osm:way/1533364979': 'OWNER REVIEW: UPSA: OSM car park, modelled by the original as grass and bare earth with bay strips',
  'osm:way/1533364980': 'OWNER REVIEW: UPSA: OSM car park, modelled by the original as grass and bare earth with bay strips',
  'osm:way/320067568': 'OWNER REVIEW: Balme Library fountain: the polygon takes in the lawns either side of the pool; the paved surround and the lawns are modelled as they are',
  'osm:way/702279064': 'OWNER REVIEW: a car park modelled as bare earth; the green is the lawn at the polygon\'s edges',
  'osm:way/765261443': 'Games Arena: lawns, paved paths and a court, as modelled (green 0.58 -> 0.21 after the original\'s update)',
};
/** lines the original's update of 2026-10-18 redrew in another surface than their OSM tag: the newer work (the owner's
 *  briefs) is kept, the conflict listed for review */
const SYNCED = {
  'osm:way/634956633': 'OWNER REVIEW: tagged earth (OSM), now drawn as light concrete by the original\'s update; left as the original draws it',
  'osm:way/758602540': 'OWNER REVIEW: tagged asphalt footway (OSM), now drawn as light concrete by the original\'s update; left as the original draws it',
};
for (const e of out) if (DECISIONS[e.id]) { e.fix = false; e.review = DECISIONS[e.id]; }

// a line is redrawn unless it already renders in its surface's colour (a site model of the original drew it)
const LOOKS_RIGHT = { 'earth': ['brown'], 'pavers-walk': ['brown'], 'pavers-road': ['brown'], 'gravel': ['concrete', 'other'], 'concrete-walk': ['concrete', 'cream'], 'concrete-road': ['concrete', 'cream'], 'asphalt-walk': ['asphalt'], 'grass': ['green'] };
for (const e of out) {
  if (e.geom !== 'line' || !e.cls) continue;
  const a = e.before;
  if (!a || a.n < 30) { e.fix = true; continue; }
  const dom = ['green', 'asphalt', 'concrete', 'cream', 'brown', 'other'].reduce((m, k) => (a[k] > a[m] ? k : m), 'green');
  e.fix = !LOOKS_RIGHT[e.cls].includes(dom);
  // (pavers a site already draws, light tan beside red-brown: left to the site, not painted over in another colour)
  if ((e.cls === 'pavers-road' || e.cls === 'pavers-walk') && a.brown >= 0.2) e.fix = false;
}
// lines that coincide with another mapped road, whose drawing wins: listed for review
const CONFLICTS = {
  'osm:way/340246934': 'drawn over by a class-1 through road mapped on the same line (no surface tag, asphalt): two OSM ways, two surfaces',
  'osm:way/340246848': 'as osm:way/340246934: under a through road mapped on the same line',
};
for (const e of out) if (CONFLICTS[e.id]) e.review = CONFLICTS[e.id];
for (const e of out) if (SYNCED[e.id]) { e.fix = false; e.review = SYNCED[e.id]; }
// the rest of what still renders in another colour after correction (tools/surfaces/audit-after.json), each looked at
const NOTES = {
  'osm:way/1533364968': 'UPSA: OSM car park over the compound; modelled as bare earth and bay strips (upsagreen): map and model disagree',
  'osm:way/1533364972': 'UPSA: as osm:way/1533364968',
  'osm:way/1533364974': 'UPSA: as osm:way/1533364968',
  'osm:way/1233989747': 'inside a site that models its own ground (ownsEdges): left to the site, which draws it as light concrete; OSM says paving stones',
  'osm:way/1226363011': 'runs into a forecourt the site already paves with light-tan pavers: left to the site',
  'osm:way/1226363012': 'as osm:way/1226363011',
  'osm:way/601016708': 'as osm:way/1226363011',
  'osm:way/1051207413': 'inside a site that models its own ground (ownsEdges): left to the site',
  'osm:way/612788010': 'inside a site that models its own ground: left to the site',
  'osm:way/614599367': 'inside a site that models its own ground: left to the site',
  'osm:way/672764761': 'inside a site that models its own ground: left to the site',
  'osm:way/787277212': 'inside a site that models its own ground: left to the site',
  'osm:way/1192435465': 'a footway crossing a dual carriageway: on the roads it is the road; pavers show on the median',
  'osm:way/1192435466': 'as osm:way/1192435465',
  'osm:way/607139873': 'as osm:way/1192435465',
  'osm:way/601042203': 'a footway (surface grass) mapped along a road median: mostly under the roads',
  'osm:way/623722343': 'a footway (surface asphalt) along a main road: it is that road\'s sidewalk, now the owner\'s grey herringbone sidewalk (the owner\'s photos over the OSM tag)',
};
for (const e of out) if (NOTES[e.id]) e.review = NOTES[e.id];

// the full classification, with its evidence, the audits and the review list (tools/surfaces/classification.json), and
// surfaces the owner corrected from a satellite picture where no map feature has them (2026-10-19): the beds either
// side of the Balme Library's forecourt, between its car parks and the road, are car parks too (two rows of cars to the
// road in the picture), not the original's tree groves on leaf litter
const OWNER_AREAS = [
  { id: 'owner:balme-front-car-park-west', cls: 'parking', pts: [-46, 18.6, -12.5, 18.6, -12.5, 38, -46, 38] },
  { id: 'owner:balme-front-car-park-east', cls: 'parking', pts: [22.5, 18.6, 52, 18.6, 52, 38, 22.5, 38] },
  // aerial view 16 (the owner's outline, 2026-10-19: "make all ground in the marked area pavement, use same material
  // use for car park"): the yard round the car park and the long sheds west of the tree grove, from the road to the grove
  // Pent and TF (the owner's satellite pictures, 2026-10-19: "redesign the pent ... my focus is on the ground")
  { id: 'owner:pent-earth-field', cls: 'earth', pts: [634, -626, 705, -628, 712, -622, 712, -560, 640, -558, 634, -562], why: "the owner's satellite picture of Pent: bare red earth east of the middle road, south of the tree row" },
  { id: 'owner:pent-earth-field-sand', cls: 'gravel', pts: [640, -616, 650, -623, 668, -624, 675, -619, 662, -610, 645, -609], why: "the owner's satellite picture of Pent: the pale heap of sand or gravel on the earth field" },
  { id: 'owner:pent-bottom-road-parking', cls: 'parking', pts: [634, -557.5, 763, -557.5, 763, -551, 634, -551], why: "the owner's satellite picture of Pent: cars parked along the north side of the bottom road" },
  { id: 'owner:pent-east-car-park', cls: 'parking', pts: [637, -697, 656, -697, 656, -652, 637, -652], why: "the owner's satellite picture of Pent: the east blocks' car park west of them, all asphalt" },
  { id: 'owner:tf-north-yard', cls: 'parking', pts: [512.5, -1691, 606.5, -1691, 606.5, -1669, 512.5, -1669], why: "the owner's satellite picture of TF: the compacted yard north of the north block, a bus parked in it" },
  { id: 'owner:tf-east-strip', cls: 'earth', pts: [597, -1666, 606.5, -1666, 606.5, -1516, 597, -1516], why: "the owner's satellite picture of TF: bare earth inside the east fence" },
  { id: 'owner:tf-south-strip', cls: 'earth', pts: [512.5, -1525, 606.5, -1525, 606.5, -1515.5, 512.5, -1515.5], why: "the owner's satellite picture of TF: bare earth along the south fence" },
  // aerial view 18 (the owner's satellite picture, 2026-10-19): the hall's two round drives with their lanes, its car parks
  // south-west, south and either side of the entrance garden, and the bare red earth field east of the east road
  { id: 'owner:legonhall-west-loop', cls: 'asphalt-area', pts: [-74.2, 639.9, -74.5, 642.6, -75.4, 645.2, -76.8, 647.5, -78.8, 649.5, -81.1, 650.9, -83.7, 651.8, -86.4, 652.1, -89.1, 651.8, -91.7, 650.9, -94.0, 649.5, -96.0, 647.5, -97.4, 645.2, -98.3, 642.6, -98.6, 639.9, -98.3, 637.2, -97.4, 634.6, -96.0, 632.3, -94.0, 630.3, -91.7, 628.9, -89.1, 628.0, -86.4, 627.7, -83.7, 628.0, -81.1, 628.9, -78.8, 630.3, -76.8, 632.3, -75.4, 634.6, -74.5, 637.2], why: "the owner's satellite picture round aerial view 18, 2026-10-19" },
  { id: 'owner:legonhall-west-loop-island', cls: 'grass', pts: [-81.2, 639.9, -81.4, 641.1, -81.7, 642.1, -82.4, 643.1, -83.2, 643.9, -84.2, 644.6, -85.2, 644.9, -86.4, 645.1, -87.5, 644.9, -88.6, 644.6, -89.6, 643.9, -90.4, 643.1, -91.1, 642.1, -91.4, 641.1, -91.6, 639.9, -91.4, 638.8, -91.1, 637.7, -90.4, 636.7, -89.6, 635.9, -88.6, 635.2, -87.5, 634.9, -86.4, 634.7, -85.2, 634.9, -84.2, 635.2, -83.2, 635.9, -82.4, 636.7, -81.7, 637.7, -81.4, 638.8], why: "the owner's satellite picture round aerial view 18, 2026-10-19" },
  { id: 'owner:legonhall-west-lane', cls: 'asphalt-area', pts: [-125.0, 638.0, -96.5, 638.0, -96.5, 642.1, -125.0, 642.1], why: "the owner's satellite picture round aerial view 18, 2026-10-19" },
  { id: 'owner:legonhall-east-loop', cls: 'asphalt-area', pts: [110.3, 640.7, 110.0, 643.4, 109.0, 646.0, 107.6, 648.4, 105.7, 650.3, 103.3, 651.7, 100.7, 652.7, 98.0, 653.0, 95.3, 652.7, 92.7, 651.7, 90.4, 650.3, 88.5, 648.4, 87.0, 646.0, 86.1, 643.4, 85.8, 640.7, 86.1, 638.0, 87.0, 635.4, 88.5, 633.1, 90.4, 631.2, 92.7, 629.7, 95.3, 628.8, 98.0, 628.5, 100.7, 628.8, 103.3, 629.7, 105.7, 631.2, 107.6, 633.1, 109.0, 635.4, 110.0, 638.0], why: "the owner's satellite picture round aerial view 18, 2026-10-19" },
  { id: 'owner:legonhall-east-loop-island', cls: 'grass', pts: [103.2, 640.7, 103.1, 641.9, 102.7, 643.0, 102.1, 643.9, 101.2, 644.8, 100.3, 645.4, 99.2, 645.8, 98.0, 645.9, 96.9, 645.8, 95.8, 645.4, 94.8, 644.8, 94.0, 643.9, 93.4, 643.0, 93.0, 641.9, 92.9, 640.7, 93.0, 639.6, 93.4, 638.5, 94.0, 637.5, 94.8, 636.7, 95.8, 636.1, 96.9, 635.7, 98.0, 635.6, 99.2, 635.7, 100.3, 636.1, 101.2, 636.7, 102.1, 637.5, 102.7, 638.5, 103.1, 639.6], why: "the owner's satellite picture round aerial view 18, 2026-10-19" },
  { id: 'owner:legonhall-east-lane', cls: 'asphalt-area', pts: [108.9, 638.8, 133.4, 638.8, 133.4, 642.9, 108.9, 642.9], why: "the owner's satellite picture round aerial view 18, 2026-10-19" },
  { id: 'owner:legonhall-southwest-car-park', cls: 'parking', pts: [-61.6, 678.3, -31.2, 678.3, -31.2, 699.2, -61.6, 699.2], why: "the owner's satellite picture round aerial view 18, 2026-10-19" },
  { id: 'owner:legonhall-southwest-lane', cls: 'asphalt-area', pts: [-72.5, 688.3, -61.1, 688.3, -61.1, 718.2, -72.5, 718.2], why: "the owner's satellite picture round aerial view 18, 2026-10-19" },
  { id: 'owner:legonhall-south-car-park', cls: 'parking', pts: [-28.5, 747.6, 66.7, 747.6, 66.7, 761.8, -28.5, 761.8], why: "the owner's satellite picture round aerial view 18, 2026-10-19" },
  { id: 'owner:legonhall-south-lane', cls: 'asphalt-area', pts: [-29.0, 731.8, -18.7, 731.8, -18.7, 747.6, -29.0, 747.6], why: "the owner's satellite picture round aerial view 18, 2026-10-19" },
  { id: 'owner:legonhall-forecourt-car-park-west', cls: 'parking', pts: [-29.8, 567.3, -9.4, 567.3, -9.4, 579.5, -29.8, 579.5], why: "the owner's satellite picture round aerial view 18, 2026-10-19" },
  { id: 'owner:legonhall-forecourt-car-park-east', cls: 'parking', pts: [23.2, 567.3, 39.5, 567.3, 39.5, 579.5, 23.2, 579.5], why: "the owner's satellite picture round aerial view 18, 2026-10-19" },
  { id: 'owner:earth-field-east-of-legonhall', cls: 'earth', pts: [144.3, 574.1, 186.7, 574.1, 186.7, 650.2, 144.3, 650.2], why: "the owner's satellite picture round aerial view 18, 2026-10-19" },
  { id: 'owner:view16-paved-yard', cls: 'parking', pts: [637.0, 305.2, 711.3, 299.5, 717.5, 324.2, 714.3, 330.4, 690.8, 334.6, 680.9, 339.0, 676.2, 348.9, 676.0, 425.5, 671.1, 429.9, 635.3, 430.9, 631.5, 425.5, 610.0, 415.6, 591.7, 400.8, 596.7, 393.4, 609.0, 368.7, 617.7, 348.9, 625.1, 330.4, 631.8, 316.8] },
];
for (const o of OWNER_AREAS) out.push({ ...o, geom: 'area', conf: 'owner', why: o.why ?? "the owner's picture or outline, 2026-10-19", fix: true });

// what the game draws (src/data/surfaces.json: the drawn features only, their class, footprint and width)
const json = { about: 'Ground-surface classification of the campus (tools/surfaces/classify.mjs). Classes are drawn by src/game/surfaces.ts.', generated: new Date().toISOString().slice(0, 10), counts, features: out };
writeFileSync(resolve(HERE, 'classification.json'), JSON.stringify(json, null, 0));
// (the owner's decisions stand over the audit's: applied again after it)
for (const e of out) if (DECISIONS[e.id]) e.fix = false;
const drawn = out.filter((f) => f.cls && (f.geom === 'line' ? f.fix !== false : (f.cls !== 'grass' || f.conf === 'owner') && (f.fix || f.cls === 'parking-pavers')));
const slim = drawn.map((f) => ({ id: f.id, geom: f.geom, cls: f.cls, ...(f.w ? { w: Math.round(f.w * 10) / 10 } : {}), pts: f.pts }));
writeFileSync(resolve(ROOT, 'src/data/surfaces.json'), JSON.stringify({ about: 'Drawn ground surfaces (see tools/surfaces/classification.json for the evidence)', features: slim }));
console.log('drawn', drawn.length);
console.log(JSON.stringify(counts, null, 1));
console.log('features written', out.length, lifted ? '(with the lifted audit)' : audit ? '(with the shipped audit)' : '(no audit yet)');
