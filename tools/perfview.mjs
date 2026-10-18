// Render cost of identical fixed views in this project and the original (PORT=5299): the Explore route from the Balme
// Library to the Great Hall, the game's own cinematic camera at three points of it (behind the rider, 6 m back and 3 m
// up), each timed over nine of the game's own frames (median time between frames). Draw calls and triangles from the
// engine's own counters where it keeps them. SwiftShader draws on the CPU: compare the two games, not absolute values.
import { chromium } from 'playwright';
const port = process.env.PORT ?? 5320;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.addInitScript(() => localStorage.setItem('legonrush.settings.v1', JSON.stringify({ onboarded: true, weather: 'clear', graphics: 'high' })));
await p.goto(`http://localhost:${port}/play/`, { timeout: 120000 });
try { await p.click('#guest', { timeout: 20000 }); } catch { /* straight in */ }
await p.waitForFunction(() => performance.getEntriesByName('legonrush:world-ready').length, null, { timeout: 900000, polling: 250 });
await p.evaluate(async () => {
  const r = await import('/src/game/routes.ts'), cm = await import('/src/game/campusmap.ts');
  const g = window.__game;
  g.setRoute(r.exploreRoute(cm.placeByName('The Balme Library'), cm.placeByName('Great Hall')));
  g.setWeather('clear');
});
const out = [];
for (const d of [100, 400, 800]) {
  await p.evaluate((d) => { const g = window.__game; g.cinematic(d, 1, [0, 3, 6], [0, 1, -12]); g.paused = true; }, d);
  // let the streamed campus load round the new view
  await p.waitForTimeout(port == 5320 ? 15000 : 3000);
  out.push(await p.evaluate(async (d) => {
    // the game's own frames on the fixed view: the time between animation frames
    const g = window.__game, t = [];
    await new Promise((res) => { let last = 0, n = 0; const tick = (now) => { if (last) t.push(now - last); last = now; if (++n < 10) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
    t.sort((a, b) => a - b);
    const stats = g.engine ? { calls: g.engine.app.stats.drawCalls.total } : { calls: g.renderer.info.render.calls, tris: g.renderer.info.render.triangles };
    return { d, medianMs: Math.round(t[Math.floor(t.length / 2)]), ...stats };
  }, d));
}
console.log(JSON.stringify(out));
await b.close();
