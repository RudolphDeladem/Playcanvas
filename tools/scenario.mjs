// The same scripted session on this project or on the original (PORT=5299, read only): the menu scene, an Explore
// ride from the Balme Library to the Great Hall, then a free ride, night, and the fly-over camera; a screenshot of the
// 3D view at each step (UI hidden for the 3D shots) and the console's errors.
// node tools/scenario.mjs <outdir>     (dev server of the page under test must be running)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [, , out] = process.argv, port = process.env.PORT ?? 5320;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const log = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log.push(`${m.type()}: ${m.text().slice(0, 300)}`); });
p.on('pageerror', (e) => log.push('PAGEERROR ' + (e.stack ?? e.message).slice(0, 900)));
await p.addInitScript(() => localStorage.setItem('legonrush.settings.v1', JSON.stringify({ onboarded: true, weather: 'clear', graphics: 'high' })));
const t0 = Date.now(), at = (s) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${s}`);
await p.goto(`http://localhost:${port}/play/`, { timeout: 120000 });
try { await p.click('#guest', { timeout: 20000 }); } catch { /* straight in */ }
await p.waitForFunction(() => performance.getEntriesByName('legonrush:world-ready').length, null, { timeout: 900000, polling: 500 });
at('world ready');
const hideUi = (on) => p.evaluate((on) => { let s = document.getElementById('__hide'); if (!s) { s = document.createElement('style'); s.id = '__hide'; document.head.append(s); } s.textContent = on ? 'body *:not(canvas){visibility:hidden!important}' : ''; }, on);
const shot = async (name, ui = false) => { await hideUi(!ui); await p.screenshot({ path: `${out}/${name}.png` }); await hideUi(false); at(`shot ${name}`); };
const ev = async (js) => { const r = await p.evaluate(js); at(`eval ${JSON.stringify(r).slice(0, 600)}`); return r; };
await p.waitForTimeout(6000);
await shot('menu-ui', true);
await shot('menu');
await ev(`(async () => {
  const r = await import('/src/game/routes.ts'), cm = await import('/src/game/campusmap.ts'), c = await import('/src/data/campus.ts');
  const g = window.__game, route = r.exploreRoute(cm.placeByName('The Balme Library'), cm.placeByName('Great Hall'));
  g.setRoute(route); g.calm = true; g.pickups = false; g.setWeather('clear'); g.start(c.BIKES[0], false);
  return { len: Math.round(route.length), kind: route.kind };
})()`);
await p.waitForTimeout(14000);
await shot('explore');
await ev(`(() => { const g = window.__game; return { xz: g.riderXZ.map(Math.round), riding: g.isRiding }; })()`);
await ev(`(() => { const g = window.__game; g.freeRide(); g.freePedal(); g.freeInput.steer = 0.25; window.__path = []; window.__pt = setInterval(() => window.__path.push(g.riderXZ.map((v) => Math.round(v * 10) / 10)), 500); return g.freeRiding; })()`);
await p.waitForTimeout(10000);
await shot('free');
await ev(`(() => { clearInterval(window.__pt); const g = window.__game; return { path: window.__path.slice(0, 24), state: g.freeState }; })()`);
await ev(`(() => { const g = window.__game; g.freeBrake(true); g.freeBrake(false); g.setTimeOfDay('night'); return 1; })()`);
await p.waitForTimeout(4000);
await shot('night');
await ev(`(() => { const g = window.__game; g.setTimeOfDay('day'); g.cycleCamera(); g.cycleCamera(); return g.cycleCamera(); })()`);
await p.waitForTimeout(5000);
await shot('flyover');
console.log([...new Set(log)].slice(0, 30).join('\n'));
await b.close();
