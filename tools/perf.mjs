// Measures a ride on this project or on the original (PORT=5299): time to the world being ready, then over 20 s of an
// Explore ride (Balme Library to Great Hall) the frame time, draw calls, triangles drawn and JS heap, sampled each
// second. Headless Chromium renders with SwiftShader (on the CPU): frame times are only comparable between the two
// games in the same run, not with a real GPU; draw calls and triangles do not depend on the GPU.
// node tools/perf.mjs
import { chromium } from 'playwright';
const port = process.env.PORT ?? 5320;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.addInitScript(() => localStorage.setItem('legonrush.settings.v1', JSON.stringify({ onboarded: true, weather: 'clear', graphics: 'high' })));
const t0 = Date.now();
await p.goto(`http://localhost:${port}/play/`, { timeout: 120000 });
try { await p.click('#guest', { timeout: 20000 }); } catch { /* straight in */ }
await p.waitForFunction(() => performance.getEntriesByName('legonrush:world-ready').length, null, { timeout: 900000, polling: 250 });
const ready = await p.evaluate(() => Math.round(performance.getEntriesByName('legonrush:world-ready')[0].startTime));
console.log(JSON.stringify({ worldReadyMs: ready, wallS: (Date.now() - t0) / 1000 }));
await p.evaluate(async (q) => {
  const r = await import('/src/game/routes.ts'), cm = await import('/src/game/campusmap.ts'), c = await import('/src/data/campus.ts');
  const g = window.__game;
  g.setRoute(r.exploreRoute(cm.placeByName('The Balme Library'), cm.placeByName('Great Hall')));
  g.calm = true; g.pickups = false; g.setWeather('clear'); g.start(c.BIKES[0], false);
  if (q) g.setQuality(q);
  setInterval(() => { g.paused = false; g.sleep = false; }, 100);
  window.__frames = []; let last = performance.now();
  const tick = () => { const n = performance.now(); window.__frames.push(n - last); last = n; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}, process.env.QUALITY ?? '');
if (process.env.EXTRA) await p.evaluate(process.env.EXTRA);
await p.waitForTimeout(4000);
const samples = [];
for (let i = 0; i < 20; i++) {
  await p.waitForTimeout(1000);
  samples.push(await p.evaluate(() => {
    const g = window.__game, f = window.__frames.splice(0), ms = f.length ? f.reduce((a, b) => a + b, 0) / f.length : 0;
    const heap = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
    if (g.engine) { const s = g.engine.app.stats; return { ms, calls: s.drawCalls.total, tris: s.frame.triangles, heap }; }
    const info = g.renderer.info; return { ms, calls: info.render.calls, tris: info.render.triangles, heap, geos: info.memory.geometries, texs: info.memory.textures };
  }));
}
const avg = (k) => Math.round(samples.reduce((a, s) => a + (s[k] ?? 0), 0) / samples.length);
console.log(JSON.stringify({ frameMs: avg('ms'), drawCalls: avg('calls'), triangles: avg('tris'), heapMB: avg('heap'), last: samples.at(-1) }));
await b.close();
