// Renders views of this project's pages headlessly: node tools/shoot.mjs <outdir> '[{"name":"x","url":"tools/view/view.html?cam=..."}]'
// (needs `npm run dev -- --port 5320` running). Prints each view's stats.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const out = process.argv[2], views = JSON.parse(process.argv[3]), port = process.env.PORT ?? 5320;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const v of views) {
  const p = await b.newPage({ viewport: { width: v.w ?? 1280, height: v.h ?? 760 } });
  const errors = [];
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text().slice(0, 300)); });
  p.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  await p.goto(`http://localhost:${port}/${v.url}`, { timeout: 600000 });
  await p.waitForFunction(() => window.__done, null, { timeout: 900000, polling: 1000 });
  await p.screenshot({ path: `${out}/${v.name}.png` });
  console.log(v.name, JSON.stringify(await p.evaluate(() => window.__stats ?? null)), errors.length ? `\n  console: ${[...new Set(errors)].slice(0, 8).join('\n  ')}` : '');
  await p.close();
}
await b.close();
