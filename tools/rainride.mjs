// A rainy Explore ride from the Balme Library, shots along the way (the puddles against the kerbs and sidewalks, the
// owner's ground and sidewalk specification, screenshot 2): node tools/rainride.mjs <outdir>   (PORT, default 5320)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [, , out] = process.argv, port = process.env.PORT ?? 5320;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
await p.addInitScript(() => localStorage.setItem('legonrush.settings.v1', JSON.stringify({ onboarded: true, weather: 'clear', graphics: 'high' })));
await p.goto(`http://localhost:${port}/play/`, { timeout: 120000 });
try { await p.click('#guest', { timeout: 20000 }); } catch {}
await p.waitForFunction(() => performance.getEntriesByName('legonrush:world-ready').length, null, { timeout: 900000, polling: 500 });
await p.evaluate(`(async () => {
  const r = await import('/src/game/routes.ts'), cm = await import('/src/game/campusmap.ts'), c = await import('/src/data/campus.ts');
  const g = window.__game, route = r.exploreRoute(cm.placeByName('The Balme Library'), cm.placeByName('Great Hall'));
  g.setRoute(route); g.calm = true; g.pickups = false; g.setWeather('rain'); g.start(c.BIKES[0], false);
  window.__unpause = setInterval(() => { g.paused = false; g.sleep = false; }, 100);
})()`);
await p.addStyleTag({ content: 'body *:not(canvas){visibility:hidden!important}' });
for (const d of [40, 90, 140, 190]) {
  await p.waitForFunction(`window.__game.isRiding && window.__game.d > ${d}`, null, { timeout: 900000, polling: 500 });
  await p.waitForTimeout(3000);
  await p.screenshot({ path: `${out}/d${d}.png` });
  console.log(d, await p.evaluate(() => window.__game.riderXZ.map(Math.round)));
}
await b.close();
