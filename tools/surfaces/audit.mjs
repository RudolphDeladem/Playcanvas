// Runs the surface audit page headlessly and writes its result: node tools/surfaces/audit.mjs <out.json> [query]
// (dev server on port 5320)
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
const [, , out, query = ''] = process.argv;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 300, height: 300 } });
p.on('console', (m) => { const t = m.text(); if (/^\[S\]/.test(t) || m.type() === 'error') console.log(t.slice(0, 300)); });
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await p.goto(`http://localhost:${process.env.PORT ?? 5320}/tools/surfaces/audit.html${query}`, { timeout: 120000 });
await p.waitForFunction(() => window.__done, null, { timeout: 3600000, polling: 2000 });
const r = await p.evaluate(() => window.__result);
writeFileSync(out, JSON.stringify(r));
const thumbs = await p.evaluate(() => window.__thumbs);
if (thumbs && Object.keys(thumbs).length) {
  const dir = out.replace(/\.json$/, '-thumbs');
  mkdirSync(dir, { recursive: true });
  for (const [id, url] of Object.entries(thumbs)) writeFileSync(`${dir}/${id.replace(/[^a-z0-9]+/gi, '_')}.png`, Buffer.from(url.split(',')[1], 'base64'));
}
console.log('features', Object.keys(r.features ?? {}).length, r.error ?? '');
await b.close();
