// The sidewalk evidence in the map: every road the OSM data tags with its sidewalks (sidewalk=both/left/right/no/
// separate, sidewalk:left/right/both=...), as game-frame polylines, written to src/data/sidewalks.json for
// src/game/roadedges.ts. A road's sides with "yes" evidence get a sidewalk; "no" and "separate" (the sidewalk is mapped
// as a footway of its own, which the campus draws) get none. The other evidence, a mapped footway running alongside a
// road, is found by roadedges.ts itself from the game map.
// Reads the original project only (ORIG, default ../legonrush-world). Usage: node tools/roads/sidewalks.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ORIG = resolve(ROOT, process.env.ORIG ?? '../legonrush-world');
const master = JSON.parse(readFileSync(resolve(ORIG, 'data/geography/legon-master.geojson'), 'utf8'));
const LAT0 = 5.6518, LNG0 = -0.1871, M_LAT = 110574, M_LNG = 111320 * Math.cos((LAT0 * Math.PI) / 180);
const local = ([lng, lat]) => [Math.round((lng - LNG0) * M_LNG * 10) / 10, Math.round(-(lat - LAT0) * M_LAT * 10) / 10];

const tags = new Map();
const xml = readFileSync(resolve(ORIG, 'data/legon.osm'), 'utf8');
for (const m of xml.matchAll(/<way id="(\d+)"[^>]*>([\s\S]*?)<\/way>/g)) {
  const t = {};
  for (const k of m[2].matchAll(/<tag k="([^"]+)" v="([^"]*)"\s*\/>/g)) t[k[1]] = k[2];
  tags.set(m[1], t);
}
/** one side's evidence from the tags: true (a sidewalk), false (none drawn here), undefined (not tagged) */
function side(t, s) {
  const v = t[`sidewalk:${s}`] ?? t['sidewalk:both'] ?? (t.sidewalk === 'both' || t.sidewalk === s ? 'yes' : t.sidewalk === 'no' || t.sidewalk === 'none' ? 'no' : t.sidewalk === 'separate' ? 'separate' : (t.sidewalk === 'left' || t.sidewalk === 'right') ? 'no' : undefined);
  if (v === undefined) return undefined;
  return v === 'yes' || v === 'both';
}
const out = [];
for (const f of master.features) {
  const p = f.properties;
  if (p.layer !== 'road' || f.geometry.type !== 'LineString') continue;
  const id = String(f.id ?? '').match(/way\/(\d+)/)?.[1];
  const t = id && tags.get(id);
  if (!t) continue;
  const l = side(t, 'left'), r = side(t, 'right');
  if (l === undefined && r === undefined) continue;
  // (left and right as OSM has them, along the way's own direction, which the points keep)
  out.push({ id: +id, l: l ?? null, r: r ?? null, why: Object.entries(t).filter(([k]) => k.startsWith('sidewalk')).map(([k, v]) => `${k}=${v}`).join('; '), pts: f.geometry.coordinates.flatMap(local) });
}
writeFileSync(resolve(ROOT, 'src/data/sidewalks.json'), JSON.stringify({ about: 'OSM sidewalk tags (tools/roads/sidewalks.mjs): l/r true = a sidewalk on that side of the way, false = none drawn (no, or mapped separately), null = not tagged', ways: out }));
console.log('tagged roads', out.length, 'sides with a sidewalk', out.reduce((a, w) => a + (w.l ? 1 : 0) + (w.r ? 1 : 0), 0), 'sides without', out.reduce((a, w) => a + (w.l === false ? 1 : 0) + (w.r === false ? 1 : 0), 0));
for (const w of out) console.log(w.id, 'L', w.l, 'R', w.r, '|', w.why);
