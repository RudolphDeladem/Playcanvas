// Collision equivalence: the same points tested by the original's run-time free-ride checks (PORT=5299) and by this
// project's baked data (PORT=5320): bike-height mesh raster, round solids, earth tracks. Prints the answers' digest and
// counts; run on both and compare. node tools/collcheck.mjs
import { chromium } from 'playwright';
const port = process.env.PORT ?? 5320;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 400, height: 300 } });
await p.addInitScript(() => localStorage.setItem('legonrush.settings.v1', JSON.stringify({ onboarded: true, weather: 'clear' })));
await p.goto(`http://localhost:${port}/play/`, { timeout: 120000 });
try { await p.click('#guest', { timeout: 15000 }); } catch { /* straight in */ }
await p.waitForFunction(() => performance.getEntriesByName('legonrush:world-ready').length, null, { timeout: 900000, polling: 500 });
const r = await p.evaluate(async (pc) => {
  const mc = pc ? await import('/src/game/collision.ts') : await import('/src/game/meshcollide.ts');
  const so = await import('/src/game/solids.ts'), sc = pc ? mc : await import('/src/game/science.ts');
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  // three areas: Balme Library and the Great Hall's lawns, the Night Market and halls, the engineering school
  const areas = [[-120, 120, -80, 260], [300, 600, -400, -100], [600, 900, -1350, -1150]];
  const bits = { mesh: [], solid: [], earth: [] };
  for (const [x0, x1, z0, z1] of areas) for (let i = 0; i < 1000; i++) {
    const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0);
    bits.mesh.push(mc.meshBlocked(x, z) ? 1 : 0);
    bits.solid.push(so.solidAt(x, z, 0.3) ? 1 : 0);
    bits.earth.push(sc.onEarth(x, z) ? 1 : 0);
  }
  return Object.fromEntries(Object.entries(bits).map(([k, v]) => [k, { set: v.reduce((a, b) => a + b, 0), bits: v.join('') }]));
}, port === 5320 || port === '5320');
console.log(JSON.stringify(r));
await b.close();
