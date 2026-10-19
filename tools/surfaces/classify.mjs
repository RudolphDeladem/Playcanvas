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
  'osm:way/1533364970': 'UPSA: the OSM car park covers the whole compound; the modelled ground is patchy grass and bare earth with marked bay strips (upsagreen); conflict left for review',
  'osm:way/1533364971': 'UPSA: as above, a marked bay strip inside grass and bare earth',
  'osm:way/1533364973': 'UPSA: as above',
  'osm:way/1533364979': 'UPSA: as above',
  'osm:way/1533364980': 'UPSA: as above',
  'osm:way/320067568': 'Balme Library fountain: the polygon takes in the lawns either side of the pool; the paved surround and the lawns are modelled as they are',
  'osm:way/702279064': 'a bare-earth car park, modelled brown; the green is the lawn at the polygon\'s edges',
  'osm:way/765261443': 'Games Arena: lawns, paved paths and a court, as modelled; the polygon takes them all in',
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
// what the game draws (src/data/surfaces.json: the drawn features only, their class, footprint and width)
const json = { about: 'Ground-surface classification of the campus (tools/surfaces/classify.mjs). Classes are drawn by src/game/surfaces.ts.', generated: new Date().toISOString().slice(0, 10), counts, features: out };
writeFileSync(resolve(HERE, 'classification.json'), JSON.stringify(json, null, 0));
const drawn = out.filter((f) => f.cls && (f.geom === 'line' ? f.fix !== false : f.cls !== 'grass' && (f.fix || f.cls === 'parking-pavers')));
const slim = drawn.map((f) => ({ id: f.id, geom: f.geom, cls: f.cls, ...(f.w ? { w: Math.round(f.w * 10) / 10 } : {}), pts: f.pts }));
writeFileSync(resolve(ROOT, 'src/data/surfaces.json'), JSON.stringify({ about: 'Drawn ground surfaces (see tools/surfaces/classification.json for the evidence)', features: slim }));
console.log('drawn', drawn.length);
console.log(JSON.stringify(counts, null, 1));
console.log('features written', out.length, lifted ? '(with the lifted audit)' : audit ? '(with the shipped audit)' : '(no audit yet)');
