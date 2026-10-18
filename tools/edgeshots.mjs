// Fixed views of the road edges (roadedges.ts) along a route, and how long the tiles took to build.
// node tools/edgeshots.mjs <outdir> [route from] [route to] [d,d,...]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [, , out, from = 'Dr. Hilla Limann Hall', to = 'Great Hall', ds = '20,120,260,400'] = process.argv;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const log = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log.push(m.text().slice(0, 300)); });
p.on('pageerror', (e) => log.push('PAGEERROR ' + (e.stack ?? e.message).slice(0, 600)));
await p.addInitScript((up) => { window.__camUp = up; }, process.env.UP ?? '3.2');
await p.addInitScript(() => localStorage.setItem('legonrush.settings.v1', JSON.stringify({ onboarded: true, weather: 'clear' })));
await p.goto(`http://localhost:${process.env.PORT ?? 5320}/play/`, { timeout: 120000 });
try { await p.click('#guest', { timeout: 20000 }); } catch { /* straight in */ }
await p.waitForFunction(() => performance.getEntriesByName('legonrush:world-ready').length, null, { timeout: 600000, polling: 500 });
await p.evaluate(async ([from, to]) => {
  const r = await import('/src/game/routes.ts'), cm = await import('/src/game/campusmap.ts');
  const g = window.__game;
  g.setRoute(from === 'LOOP' ? r.CAMPUS_LOOP : r.exploreRoute(cm.placeByName(from), cm.placeByName(to)));
  document.head.insertAdjacentHTML('beforeend', '<style>body *:not(canvas){visibility:hidden!important}</style>');
}, [from, to]);
for (const d of ds.split(',').map(Number)) {
  const t = await p.evaluate(async (d) => {
    const g = window.__game;
    g.cinematic(d, 1, [0, 0, 6.5], [0, 0, -12]);
    const rel = await import('/src/game/relief.ts');
    // (the chase camera's place: 3.2 m over the ground behind the rider, looking 12 m ahead)
    g.cine.pos.y = rel.groundHeight(g.cine.pos.x, g.cine.pos.z) + (+(window.__camUp ?? 3.2)); g.cine.look.y = rel.groundHeight(g.cine.look.x, g.cine.look.z) + 1.1;
    g.paused = true;
    const t0 = performance.now();
    g.edges.preload(g.riderXZ[0], g.riderXZ[1], 200);
    const pp = g.pose(d); return { buildMs: Math.round(performance.now() - t0), tiles: g.edges.tiles.size, at: [Math.round(pp.x), Math.round(pp.z)] };
  }, d);
  await p.waitForTimeout(12000);
  await p.screenshot({ path: `${out}/d${d}.png` });
  console.log(d, JSON.stringify(t));
}
console.log([...new Set(log)].slice(0, 20).join('\n'));
await b.close();
