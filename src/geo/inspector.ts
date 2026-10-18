// Geography inspector: the exact map data the 3D world is built from (src/data/legon-map.json),
// drawn from above over a Sentinel-2 composite so it can be checked against the real campus.
// A debug page only: it lives at /geo/ and nothing in the game links to it.
import raw from '../data/legon-map.json';
import { ACCESS, GATES, PLACES, placeByName, type TravelMode } from '../game/campusmap';
import { exploreRoute, type Route } from '../game/routes';
import { ROUTE_CHECKS } from '../data/route-checks';

interface Data {
  origin: [number, number];
  nodes: number[];
  roads: { c: number; w: number[]; n?: string }[];
  buildings: { p: number[]; h?: number; n?: string; m?: 1; u?: 1; q?: 2 }[];
  areas: { k: string; p: number[] }[];
  places: { n: string; k: string; x: number; z: number; q?: 1 | 2 }[];
  boundary: number[];
  zones: { id: string; n: string; k: string; p: number[] }[];
  landmarks: { id: string; n: string; x: number; z: number; i: number; q?: 1 | 2 }[];
  imagery: { src: string; x0: number; z0: number; x1: number; z1: number; credit: string };
}
const D = raw as unknown as Data;
const [LAT0, LNG0] = D.origin;
const M_LAT = 110574, M_LNG = 111320 * Math.cos((LAT0 * Math.PI) / 180);
const toLatLng = (x: number, z: number): [number, number] => [LAT0 - z / M_LAT, LNG0 + x / M_LNG];
const fromLatLng = (lat: number, lng: number): [number, number] => [(lng - LNG0) * M_LNG, -(lat - LAT0) * M_LAT];

const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;
const canvas = $<HTMLCanvasElement>('#map');
const ctx = canvas.getContext('2d')!;

// ---------- paths in map metres, built once ----------
const ring = (flat: number[]) => { const p = new Path2D(); for (let i = 0; i < flat.length; i += 2) (i ? p.lineTo : p.moveTo).call(p, flat[i] / 10, flat[i + 1] / 10); p.closePath(); return p; };
const node = (i: number): [number, number] => [D.nodes[i * 2] / 10, D.nodes[i * 2 + 1] / 10];
const ROAD_W = [12, 8, 6, 4, 2];
const ROAD_COL = ['#ff8a3d', '#ffc94d', '#ffffff', '#c7ccd8', '#7fe0ff'];
const roadPaths = [0, 1, 2, 3, 4].map(() => new Path2D());
const trailPath = new Path2D(), stepsPath = new Path2D();
for (const r of D.roads as { c: number; w: number[]; k?: number }[]) {
  if (!r.k) continue;
  const p = r.k === 2 ? stepsPath : trailPath;
  r.w.forEach((n, i) => { const [x, z] = node(n); (i ? p.lineTo : p.moveTo).call(p, x, z); });
}
for (const r of D.roads) { const p = roadPaths[r.c]; r.w.forEach((n, i) => { const [x, z] = node(n); (i ? p.lineTo : p.moveTo).call(p, x, z); }); }
const BCOL = { osm: '#ff7a59', osmUnconfirmed: '#ffd166', satellite: '#4cc9f0', low: '#ff4fd8' };
const bPaths = { osm: new Path2D(), osmUnconfirmed: new Path2D(), satellite: new Path2D(), low: new Path2D() };
const bRings = D.buildings.map((b) => ring(b.p));
D.buildings.forEach((b, i) => bPaths[b.q === 2 ? 'low' : b.m ? 'satellite' : b.u ? 'osmUnconfirmed' : 'osm'].addPath(bRings[i]));
const ACOL: Record<string, string> = { grass: 'rgba(120,200,110,0.35)', wood: 'rgba(40,120,50,0.5)', plaza: 'rgba(235,225,205,0.55)', parking: 'rgba(170,175,185,0.55)', pitch: 'rgba(90,190,90,0.6)', track: 'rgba(220,110,80,0.6)', water: 'rgba(70,150,230,0.75)' };
const areaPaths = D.areas.map((a) => ({ k: a.k, p: ring(a.p) }));
const boundary = ring(D.boundary);
const ZCOL = ['#f94144', '#f3722c', '#f8961e', '#f9c74f', '#90be6d', '#43aa8b', '#4d908e', '#577590', '#277da1', '#9b5de5', '#f15bb5', '#00bbf9', '#00f5d4'];
const zones = D.zones.map((z, i) => ({ ...z, path: ring(z.p), col: ZCOL[i % ZCOL.length], c: centre(z.p) }));
function centre(flat: number[]) { let x = 0, z = 0; for (let i = 0; i < flat.length; i += 2) { x += flat[i]; z += flat[i + 1]; } return [x / (flat.length / 2) / 10, z / (flat.length / 2) / 10]; }
const LMCOL = ['#06d6a0', '#ffd166', '#ef476f'];

// ---------- the legacy map, fetched on demand for comparison ----------
let legacy: { roads: Path2D; buildings: Path2D; places: { n: string; x: number; z: number }[] } | null = null;
async function loadLegacy() {
  if (legacy) return;
  const L = (await (await fetch(`${import.meta.env.BASE_URL}geo/legacy-legon-map.json`)).json()) as Data;
  const roads = new Path2D(), buildings = new Path2D();
  for (const r of L.roads) r.w.forEach((n, i) => { const x = L.nodes[n * 2] / 10, z = L.nodes[n * 2 + 1] / 10; (i ? roads.lineTo : roads.moveTo).call(roads, x, z); });
  for (const b of L.buildings) buildings.addPath(ring(b.p));
  legacy = { roads, buildings, places: L.places.map((p) => ({ n: p.n, x: p.x / 10, z: p.z / 10 })) };
  draw();
}

// ---------- layers ----------
const LAYERS = [
  { id: 'imagery', name: 'Sentinel-2 imagery (10 m)', col: '#3d5a3a', on: true },
  { id: 'boundary', name: 'Campus boundary', col: '#ff3df5', on: true },
  { id: 'zones', name: 'Campus zones', col: '#f8961e', on: false, n: D.zones.length },
  { id: 'areas', name: 'Open spaces, sports, parking, water', col: '#5abe5a', on: true, n: D.areas.length },
  { id: 'roads', name: 'Roads', col: '#ffc94d', on: true, n: D.roads.filter((r) => r.c < 4).length },
  { id: 'paths', name: 'Footpaths', col: '#7fe0ff', on: true, n: D.roads.filter((r) => r.c === 4).length },
  { id: 'buildings', name: 'Buildings: OpenStreetMap', col: BCOL.osm, on: true, n: D.buildings.filter((b) => !b.m && !b.u).length },
  { id: 'bunconf', name: 'Buildings: OSM on campus, no satellite match', col: BCOL.osmUnconfirmed, on: true, n: D.buildings.filter((b) => b.u).length },
  { id: 'bsat', name: 'Buildings: satellite-detected only', col: BCOL.satellite, on: true, n: D.buildings.filter((b) => b.m).length },
  { id: 'landmarks', name: 'Landmark registry', col: '#06d6a0', on: true, n: D.landmarks.length },
  { id: 'places', name: 'Place labels', col: '#c9a7ff', on: false, n: D.places.length },
  { id: 'legacy', name: 'Legacy map (before rebuild)', col: '#ff3b3b', on: false },
  { id: 'access', name: 'Destination access (entrance → arrival)', col: '#ff3df5', on: false, n: ACCESS.size },
  { id: 'gates', name: 'Campus gates', col: '#ffffff', on: true, n: GATES.length },
  { id: 'surface', name: 'Network: trails and steps', col: '#ff9f1c', on: false, n: D.roads.filter((r) => (r as { k?: number }).k).length },
  { id: 'grid', name: '100 m grid', col: '#f5c518', on: false },
] as const;
type LayerId = (typeof LAYERS)[number]['id'];
const on = new Set<LayerId>(LAYERS.filter((l) => l.on).map((l) => l.id));
const layersEl = $('#layers');
for (const l of LAYERS) {
  const el = document.createElement('label');
  el.className = 'layer';
  el.innerHTML = `<input type="checkbox" ${l.on ? 'checked' : ''}/><i style="background:${l.col}"></i>${l.name}${'n' in l ? `<span class="n">${l.n}</span>` : ''}`;
  el.querySelector('input')!.addEventListener('change', (e) => {
    if ((e.target as HTMLInputElement).checked) on.add(l.id); else on.delete(l.id);
    if (l.id === 'legacy') void loadLegacy();
    draw(); saveHash();
  });
  layersEl.append(el);
}
let opacity = 0.85;
$<HTMLInputElement>('#opacity').addEventListener('input', (e) => { opacity = +(e.target as HTMLInputElement).value / 100; draw(); });
$('#credit').textContent = 'Map data © OpenStreetMap contributors (ODbL); Google Open Buildings (CC BY 4.0); Microsoft ML Buildings (ODbL); Overture Maps; UG Campus Map by enkayyy97. ' + D.imagery.credit + '. Details: docs/LEGON_MASTER_GEOGRAPHY.md';
const img = new Image();
img.onload = () => draw();
img.src = `${import.meta.env.BASE_URL}${D.imagery.src}`;

// ---------- view ----------
let cx = 0, cz = 300, scale = 0.2; // pixels per metre
let W = 0, H = 0, dpr = 1;
function resize() {
  dpr = Math.min(2, devicePixelRatio || 1);
  W = innerWidth; H = innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  draw();
}
const toScreen = (x: number, z: number): [number, number] => [(x - cx) * scale + W / 2, (z - cz) * scale + H / 2];
const toWorld = (sx: number, sy: number): [number, number] => [(sx - W / 2) / scale + cx, (sy - H / 2) / scale + cz];
function fit() {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < D.boundary.length; i += 2) { minX = Math.min(minX, D.boundary[i] / 10); maxX = Math.max(maxX, D.boundary[i] / 10); minZ = Math.min(minZ, D.boundary[i + 1] / 10); maxZ = Math.max(maxZ, D.boundary[i + 1] / 10); }
  cx = (minX + maxX) / 2; cz = (minZ + maxZ) / 2;
  scale = Math.min(W / (maxX - minX), H / (maxZ - minZ)) * 0.92;
}

let frame = 0;
function draw() { if (!frame) frame = requestAnimationFrame(render); }
function render() {
  frame = 0;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0a1020';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, (W / 2 - cx * scale) * dpr, (H / 2 - cz * scale) * dpr);
  const px = 1 / scale; // one screen pixel in metres
  if (on.has('imagery') && img.complete && img.naturalWidth) {
    ctx.globalAlpha = opacity;
    ctx.imageSmoothingEnabled = scale < 0.6;
    const { x0, z0, x1, z1 } = D.imagery;
    ctx.drawImage(img, x0, z0, x1 - x0, z1 - z0);
    ctx.globalAlpha = 1;
  }
  if (on.has('zones')) for (const z of zones) { ctx.fillStyle = z.col + '30'; ctx.fill(z.path); ctx.strokeStyle = z.col; ctx.lineWidth = 2 * px; ctx.setLineDash([8 * px, 5 * px]); ctx.stroke(z.path); ctx.setLineDash([]); }
  if (on.has('areas')) for (const a of areaPaths) { ctx.fillStyle = ACOL[a.k] ?? 'rgba(255,255,255,0.3)'; ctx.fill(a.p); }
  for (let c = 4; c >= 0; c--) {
    if (c === 4 ? !on.has('paths') : !on.has('roads')) continue;
    ctx.strokeStyle = ROAD_COL[c];
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = Math.max(ROAD_W[c], (c === 4 ? 1 : 1.5) * px);
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.stroke(roadPaths[c]);
    ctx.globalAlpha = 1;
  }
  const bLayer: [keyof typeof bPaths, LayerId][] = [['osm', 'buildings'], ['osmUnconfirmed', 'bunconf'], ['satellite', 'bsat'], ['low', 'bunconf']];
  for (const [k, id] of bLayer) {
    if (!on.has(id)) continue;
    ctx.fillStyle = BCOL[k] + '55'; ctx.fill(bPaths[k]);
    ctx.strokeStyle = BCOL[k]; ctx.lineWidth = Math.max(0.4, 1.2 * px); ctx.stroke(bPaths[k]);
  }
  if (on.has('boundary')) { ctx.strokeStyle = '#ff3df5'; ctx.lineWidth = 3 * px; ctx.stroke(boundary); }
  // the legacy map on top: wherever it differs from the rebuilt one, red shows
  if (on.has('legacy') && legacy) { ctx.strokeStyle = 'rgba(255,40,40,0.95)'; ctx.lineWidth = 1.2 * px; ctx.stroke(legacy.roads); ctx.stroke(legacy.buildings); }
  if (on.has('grid')) {
    ctx.strokeStyle = 'rgba(245,197,24,0.35)'; ctx.lineWidth = px;
    const [ax, az] = toWorld(0, 0), [bx, bz] = toWorld(W, H);
    const step = scale < 0.08 ? 500 : 100;
    ctx.beginPath();
    for (let x = Math.ceil(ax / step) * step; x < bx; x += step) { ctx.moveTo(x, az); ctx.lineTo(x, bz); }
    for (let z = Math.ceil(az / step) * step; z < bz; z += step) { ctx.moveTo(ax, z); ctx.lineTo(bx, z); }
    ctx.stroke();
  }
  // labels and markers in screen space
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.textBaseline = 'middle';
  const label = (t: string, x: number, y: number, col: string, size = 12, bold = false) => {
    ctx.font = `${bold ? 700 : 500} ${size}px system-ui, sans-serif`;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(5,8,18,0.9)'; ctx.strokeText(t, x, y);
    ctx.fillStyle = col; ctx.fillText(t, x, y);
  };
  if (on.has('zones')) for (const z of zones) { const [x, y] = toScreen(z.c[0], z.c[1]); ctx.textAlign = 'center'; label(z.n, x, y, z.col, 12, true); }
  ctx.textAlign = 'left';
  if (on.has('places') && scale > 0.35) for (const p of D.places) { const [x, y] = toScreen(p.x / 10, p.z / 10); if (x < -50 || y < -20 || x > W + 50 || y > H + 20) continue; ctx.fillStyle = '#c9a7ff'; ctx.fillRect(x - 2, y - 2, 4, 4); label(p.n, x + 5, y, '#e4d6ff', 11); }
  if (on.has('legacy') && legacy && scale > 0.35) for (const p of legacy.places) { const [x, y] = toScreen(p.x, p.z); ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + 3, y + 3); ctx.moveTo(x + 3, y - 3); ctx.lineTo(x - 3, y + 3); ctx.stroke(); }
  if (on.has('landmarks')) for (const l of [...D.landmarks].sort((a, b) => b.i - a.i)) {
    const [x, y] = toScreen(l.x / 10, l.z / 10);
    const r = l.i === 1 ? 6 : l.i === 2 ? 4.5 : 3.5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = LMCOL[l.q ?? 0]; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#05070f'; ctx.stroke();
    if (l.i === 1 || scale > 0.5 || (l.i === 2 && scale > 0.25)) label(l.n, x + r + 4, y, '#ffffff', l.i === 1 ? 12 : 11, l.i === 1);
  }
  drawRouting(label);
  if (selected) { const [x, y] = toScreen(selected[0], selected[1]); ctx.strokeStyle = '#f5c518'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.stroke(); }
  // scale bar
  const metres = [10, 20, 50, 100, 200, 500, 1000].find((m) => m * scale > 70) ?? 1000;
  ctx.fillStyle = '#e8ecf5'; ctx.fillRect(W - 24 - metres * scale, H - 22, metres * scale, 3);
  ctx.textAlign = 'right'; label(metres >= 1000 ? `${metres / 1000} km` : `${metres} m`, W - 24, H - 32, '#e8ecf5', 11);
}

// ---------- interaction ----------
let selected: [number, number] | null = null;
const ptrs = new Map<number, [number, number]>();
let moved = 0;
canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; canvas.classList.add('drag'); });
canvas.addEventListener('pointermove', (e) => {
  const prev = ptrs.get(e.pointerId);
  if (!prev) { hover(e.clientX, e.clientY); return; }
  if (ptrs.size === 1) { cx -= (e.clientX - prev[0]) / scale; cz -= (e.clientY - prev[1]) / scale; moved += Math.abs(e.clientX - prev[0]) + Math.abs(e.clientY - prev[1]); }
  else if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()];
    const other = a === prev ? b : a;
    const d0 = Math.hypot(prev[0] - other[0], prev[1] - other[1]), d1 = Math.hypot(e.clientX - other[0], e.clientY - other[1]);
    if (d0 > 0) zoomAt((e.clientX + other[0]) / 2, (e.clientY + other[1]) / 2, d1 / d0);
    moved += 99;
  }
  ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  draw();
});
const up = (e: PointerEvent) => { ptrs.delete(e.pointerId); if (!ptrs.size) { canvas.classList.remove('drag'); if (moved < 6) pick(e.clientX, e.clientY); saveHash(); } };
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', up);
function zoomAt(sx: number, sy: number, f: number) {
  const [wx, wz] = toWorld(sx, sy);
  scale = Math.max(0.03, Math.min(12, scale * f));
  cx = wx - (sx - W / 2) / scale; cz = wz - (sy - H / 2) / scale;
}
canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015)); draw(); saveHash(); }, { passive: false });
const statusEl = $('#status');
function hover(sx: number, sy: number) {
  const [x, z] = toWorld(sx, sy);
  const [lat, lng] = toLatLng(x, z);
  const b = buildingAt(x, z);
  statusEl.innerHTML = `x <b>${x.toFixed(0)}</b> z <b>${z.toFixed(0)}</b> m · <b>${lat.toFixed(5)}, ${lng.toFixed(5)}</b>${b ? ` · ${b.n ?? 'building'}` : ''}`;
}
function inside(flat: number[], x: number, z: number) {
  let c = false;
  for (let i = 0, j = flat.length - 2; i < flat.length; j = i, i += 2) {
    const xi = flat[i] / 10, zi = flat[i + 1] / 10, xj = flat[j] / 10, zj = flat[j + 1] / 10;
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
const buildingAt = (x: number, z: number) => D.buildings.find((b) => inside(b.p, x, z));
const CONF = ['high', 'medium', 'low'];
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
function pick(sx: number, sy: number) {
  const [x, z] = toWorld(sx, sy);
  const near = (px: number, pz: number) => Math.hypot(px - x, pz - z) * scale;
  const lm = on.has('landmarks') ? D.landmarks.find((l) => near(l.x / 10, l.z / 10) < 10) : undefined;
  const pl = on.has('places') ? D.places.find((p) => near(p.x / 10, p.z / 10) < 8) : undefined;
  const b = buildingAt(x, z);
  if (lm) return show(lm.n, lm.x / 10, lm.z / 10, `Landmark · importance ${lm.i} · confidence <b>${CONF[lm.q ?? 0]}</b>`);
  if (pl) return show(pl.n, pl.x / 10, pl.z / 10, `Place · ${pl.k} · confidence <b>${CONF[pl.q ?? 0]}</b>`);
  if (b) return show(b.n ?? 'Unnamed building', x, z, `${b.m ? 'Satellite-detected footprint (Google / Microsoft ML)' : b.q === 2 ? 'Flagged as erroneous' : b.u ? 'OpenStreetMap footprint; no Google Open Buildings footprint matches it' : 'OpenStreetMap footprint'}${b.h ? ` · ${b.h} m tall` : ''}`);
  show('Point', x, z, '');
}
function show(name: string, x: number, z: number, detail: string) {
  selected = [x, z];
  const [lat, lng] = toLatLng(x, z);
  const ll = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  $('#infobody').innerHTML = `<h3>${esc(name)}</h3><div>${detail}</div><div class="k" style="margin:6px 0">${ll} · x ${x.toFixed(0)} z ${z.toFixed(0)} m</div>
    <div>Compare: <a target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${lat.toFixed(6)}&mlon=${lng.toFixed(6)}#map=19/${lat.toFixed(6)}/${lng.toFixed(6)}">OpenStreetMap</a><a target="_blank" rel="noopener" href="https://www.google.com/maps/@${ll},180m/data=!3m1!1e3">Google satellite</a><a target="_blank" rel="noopener" href="https://maps.apple.com/?ll=${ll}&t=k&z=18">Apple Maps</a></div>`;
  $('#info').style.display = 'block';
  draw();
}
$('#info button').addEventListener('click', () => { $('#info').style.display = 'none'; selected = null; draw(); });
$('#toggle').addEventListener('click', () => $('#side').classList.toggle('open'));

// landmark finder
const list = $('#lm');
function fillList(q = '') {
  const f = q.trim().toLowerCase();
  const items = [...D.landmarks.map((l) => ({ n: l.n, x: l.x / 10, z: l.z / 10, col: LMCOL[l.q ?? 0], d: `landmark · ${CONF[l.q ?? 0]}` })),
    ...(f ? D.places.map((p) => ({ n: p.n, x: p.x / 10, z: p.z / 10, col: '#c9a7ff', d: `place · ${p.k}` })) : [])]
    .filter((i) => !f || i.n.toLowerCase().includes(f)).slice(0, 80);
  list.innerHTML = '';
  for (const i of items) {
    const li = document.createElement('li');
    li.innerHTML = `<i style="background:${i.col}"></i>${esc(i.n)}`;
    li.title = i.d;
    li.addEventListener('click', () => { cx = i.x; cz = i.z; scale = Math.max(scale, 1.2); show(i.n, i.x, i.z, i.d); saveHash(); });
    list.append(li);
  }
}
$<HTMLInputElement>('#q').addEventListener('input', (e) => fillList((e.target as HTMLInputElement).value));
fillList();

// shareable view: #lat,lng,zoom
function saveHash() { const [lat, lng] = toLatLng(cx, cz); history.replaceState(null, '', `#${lat.toFixed(5)},${lng.toFixed(5)},${scale.toFixed(3)}`); }
addEventListener('resize', resize);
addEventListener('hashchange', () => { const v = location.hash.slice(1).split(',').map(Number); if (v.length === 3 && v.every(Number.isFinite)) { [cx, cz] = fromLatLng(v[0], v[1]); scale = v[2]; draw(); } });
resize();
const h = location.hash.slice(1).split(',').map(Number);
if (h.length === 3 && h.every(Number.isFinite)) { [cx, cz] = fromLatLng(h[0], h[1]); scale = h[2]; } else fit();
statusEl.textContent = `${D.roads.length} roads · ${D.buildings.length} buildings · ${D.areas.length} areas · ${D.landmarks.length} landmarks · ${D.places.length} places`;
draw();

// ---------- routing debug: access points, gates, trails and the route tester ----------
const ACOLOR = { high: '#06d6a0', medium: '#ffd166', low: '#ef476f' };
let route: Route | null = null;
function drawRouting(label: (t: string, x: number, y: number, col: string, size?: number, bold?: boolean) => void) {
  const S = (x: number, z: number) => toScreen(x, z);
  if (on.has('surface')) {
    ctx.save();
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, (W / 2 - cx * scale) * dpr, (H / 2 - cz * scale) * dpr);
    ctx.lineWidth = Math.max(2, 3 / scale); ctx.lineCap = 'round';
    ctx.strokeStyle = '#ff9f1c'; ctx.stroke(trailPath);
    ctx.strokeStyle = '#ff2e2e'; ctx.stroke(stepsPath);
    ctx.restore();
  }
  if (on.has('access') && scale > 0.25) for (const [name, a] of ACCESS) {
    const [ex, ey] = S(a.entrance[0], a.entrance[1]);
    const [ax, ay] = S(D.nodes[a.node * 2] / 10, D.nodes[a.node * 2 + 1] / 10);
    if (Math.max(ex, ax) < -20 || Math.min(ex, ax) > W + 20 || Math.max(ey, ay) < -20 || Math.min(ey, ay) > H + 20) continue;
    ctx.strokeStyle = '#ff3df5'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = ACOLOR[a.confidence]; ctx.beginPath(); ctx.arc(ex, ey, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2ee66b'; ctx.fillRect(ax - 3, ay - 3, 6, 6);
    if (scale > 1.4) label(`${name} · ${a.type}`, ex + 6, ey - 8, '#ffd9fb', 10);
  }
  if (on.has('gates')) for (const g of GATES) {
    const [x, y] = S(g.x, g.z);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#05070f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.rect(x - 5, y - 5, 10, 10); ctx.fill(); ctx.stroke();
    label(g.name, x + 8, y, '#ffffff', 11, true);
  }
  if (route) {
    const r = route;
    const pts = (from: number, to: number) => { const out: [number, number][] = []; for (let d = from; d <= to; d += 2) { const p = r.track.pose(d, 0); out.push(S(p.x, p.z)); } return out; };
    const line = (p: [number, number][], col: string, w: number, dash: number[] = []) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash); ctx.beginPath(); p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.setLineDash([]); };
    line(pts(0, r.lead), '#ffffff', 2, [5, 4]);
    line(pts(r.lead + r.length, r.track.length), '#ff3df5', 2, [5, 4]);
    line(pts(r.lead, r.lead + r.length), '#05070f', 7);
    line(pts(r.lead, r.lead + r.length), '#ff4f81', 4);
    for (const st of r.steps) {
      if (st.turn === 'start' || st.turn === 'arrive') continue;
      const p = r.track.pose(r.lead + st.d, 0), [x, y] = S(p.x, p.z);
      ctx.fillStyle = '#f5c518'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      if (scale > 0.5) label(st.text, x + 6, y, '#fff3c4', 10);
    }
    const s0 = r.track.pose(r.lead, 0);
    const mid = r.track.pose(r.lead + r.length / 2, 0), [mx, my] = S(mid.x, mid.z);
    label('ROUTE', mx + 8, my - 10, '#ff4f81', 12, true);
    drawAccess(r.from.name, label, 'START');
    drawAccess(r.to.name, label, 'ARRIVAL');
    const [sx, sy] = S(s0.x, s0.z); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill(); label('START', sx + 8, sy + 12, '#ffffff', 11, true);
    // where the rider stops, and the way they face
    const end = r.track.pose(r.track.length, 0), [qx, qy] = S(end.x, end.z);
    ctx.strokeStyle = '#f5c518'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(qx + end.tx * 22, qy + end.tz * 22); ctx.stroke();
    label('RIDER STOPS', qx + 8, qy + 14, '#f5c518', 10, true);
  }
  if (focus) drawAccess(focus, label, 'ARRIVAL');
}
const STATUS_COL: Record<string, string> = { verified: '#06d6a0', partial: '#ffd166', unverified: '#ef476f', mapped: '#8ab4f8', inferred: '#9aa6bf' };
/** one destination's access: footprint, ENTRANCE, forecourt path, ARRIVAL with approach direction, DROP-OFF */
function drawAccess(name: string, label: (t: string, x: number, y: number, col: string, size?: number, bold?: boolean) => void, arrivalLabel: string) {
  const a = ACCESS.get(name);
  if (!a) return;
  const S = (x: number, z: number) => toScreen(x, z);
  if (a.footprint) {
    ctx.beginPath(); a.footprint.forEach(([x, z], i) => { const [px, py] = S(x, z); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }); ctx.closePath();
    ctx.fillStyle = 'rgba(255,61,245,0.18)'; ctx.fill(); ctx.strokeStyle = '#ff3df5'; ctx.lineWidth = 2.5; ctx.stroke();
  }
  const node = (i: number): [number, number] => [D.nodes[i * 2] / 10, D.nodes[i * 2 + 1] / 10];
  const arr = node(a.node), drop = node(a.dropNode);
  const leg = [arr, ...(a.via ?? []), a.entrance].map(([x, z]) => S(x, z));
  ctx.strokeStyle = '#ff3df5'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]);
  ctx.beginPath(); leg.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.setLineDash([]);
  if (a.via?.length) { const [x, y] = leg[1]; label('ACCESS PATH', x + 6, y - 8, '#ffb3f9', 10, true); }
  const [ex, ey] = S(a.entrance[0], a.entrance[1]);
  ctx.fillStyle = STATUS_COL[a.status]; ctx.strokeStyle = '#05070f'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(ex, ey - 8); ctx.lineTo(ex + 8, ey); ctx.lineTo(ex, ey + 8); ctx.lineTo(ex - 8, ey); ctx.closePath(); ctx.fill(); ctx.stroke();
  label(`ENTRANCE · ${a.type} · ${a.status}`, ex + 10, ey - 10, STATUS_COL[a.status], 11, true);
  for (const [sx, sz] of a.secondary ?? []) {
    const [px, py] = S(sx, sz);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#05070f'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px, py - 7); ctx.lineTo(px + 7, py); ctx.lineTo(px, py + 7); ctx.lineTo(px - 7, py); ctx.closePath(); ctx.fill(); ctx.stroke();
    label('BACK / SECONDARY ENTRANCE', px + 10, py - 10, '#ffffff', 10, true);
  }
  // arrival, with an arrow along the approach (arrival -> first leg point)
  const [ax, ay] = leg[0], [bx, by] = leg[1];
  ctx.fillStyle = '#2ee66b'; ctx.strokeStyle = '#05070f'; ctx.beginPath(); ctx.rect(ax - 6, ay - 6, 12, 12); ctx.fill(); ctx.stroke();
  const ang = Math.atan2(by - ay, bx - ax), L = 26;
  ctx.strokeStyle = '#2ee66b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + Math.cos(ang) * L, ay + Math.sin(ang) * L);
  ctx.lineTo(ax + Math.cos(ang - 0.5) * (L - 8), ay + Math.sin(ang - 0.5) * (L - 8)); ctx.moveTo(ax + Math.cos(ang) * L, ay + Math.sin(ang) * L); ctx.lineTo(ax + Math.cos(ang + 0.5) * (L - 8), ay + Math.sin(ang + 0.5) * (L - 8)); ctx.stroke();
  label(arrivalLabel === 'START' ? 'EXIT POINT' : 'ARRIVAL', ax + 10, ay + 14, '#2ee66b', 11, true);
  if (a.dropNode !== a.node) {
    const [dx, dy] = S(drop[0], drop[1]);
    ctx.fillStyle = '#ff9f1c'; ctx.beginPath(); ctx.arc(dx, dy, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    label('DROP-OFF', dx + 8, dy + 12, '#ff9f1c', 10, true);
  }
}
// the entrance list: priority destinations by status
let focus: string | null = null;
const PRI = [...ACCESS.entries()].filter(([, a]) => a.status === 'verified' || a.status === 'partial' || a.status === 'unverified').sort((x, y) => ['verified', 'partial', 'unverified'].indexOf(x[1].status) - ['verified', 'partial', 'unverified'].indexOf(y[1].status) || x[0].localeCompare(y[0]));
const entList = $('#entList');
for (const [name, a] of PRI) {
  const li = document.createElement('li');
  li.innerHTML = `<i style="background:${STATUS_COL[a.status]}"></i>${esc(name)} <small style="margin-left:auto;color:var(--muted)">${a.status}</small>`;
  li.addEventListener('click', () => {
    focus = name; route = null;
    const n = a.node; cx = (a.entrance[0] + D.nodes[n * 2] / 10) / 2; cz = (a.entrance[1] + D.nodes[n * 2 + 1] / 10) / 2; scale = Math.max(scale, 3);
    show(name, a.entrance[0], a.entrance[1], `Entrance: ${esc(a.type)} · <b>${a.status}</b> · confidence ${a.confidence}. Details: docs/LEGON_ENTRANCE_VERIFICATION.md`);
    saveHash();
  });
  entList.append(li);
}
const rtFrom = $<HTMLInputElement>('#rtFrom'), rtTo = $<HTMLInputElement>('#rtTo'), rtMode = $<HTMLSelectElement>('#rtMode'), rtOut = $('#rtOut');
$('#rtPlaces').innerHTML = [...PLACES].sort((a, b) => a.name.localeCompare(b.name)).map((p) => `<option value="${esc(p.name)}"></option>`).join('');
const preset = $<HTMLSelectElement>('#rtPreset');
ROUTE_CHECKS.forEach((c, i) => preset.insertAdjacentHTML('beforeend', `<option value="${i}">${esc(c.from)} → ${esc(c.to)}</option>`));
preset.addEventListener('change', () => { const c = ROUTE_CHECKS[+preset.value]; if (!c) return; rtFrom.value = c.from; rtTo.value = c.to; runRoute(c.expect); });
$('#rtGo').addEventListener('click', () => runRoute());
function runRoute(expect?: string) {
  const a = placeByName(rtFrom.value), b = placeByName(rtTo.value);
  if (!a || !b) { rtOut.textContent = 'Pick two places from the list.'; return; }
  route = exploreRoute(a, b, rtMode.value as TravelMode);
  focus = null;
  if (!route) { rtOut.textContent = 'No route.'; draw(); return; }
  const fa = ACCESS.get(a.name), ta = ACCESS.get(b.name);
  rtOut.innerHTML = `<b>${route.length} m</b>, ${route.steps.filter((s) => s.turn !== 'start' && s.turn !== 'arrive').length} turns.<br>Leaves from: ${esc(fa?.type ?? 'nearest road')} (${fa?.status ?? '-'}, ${fa?.confidence ?? '-'}).<br>Arrives at: ${esc(ta?.type ?? 'nearest road')} (${ta?.status ?? '-'}, ${ta?.confidence ?? '-'}).${expect ? `<br><em>Expected: ${esc(expect)}</em>` : ''}`;
  // frame the route
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let d = 0; d <= route.track.length; d += 5) { const p = route.track.pose(d, 0); minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
  cx = (minX + maxX) / 2; cz = (minZ + maxZ) / 2;
  scale = Math.min(12, Math.min((W - 340) / Math.max(60, maxX - minX), H / Math.max(60, maxZ - minZ)) * 0.8);
  cx -= 150 / scale;
  draw(); saveHash();
}
