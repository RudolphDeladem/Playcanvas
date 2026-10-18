// Opens a converter page in headless Chromium and waits for window.__done; prints window.__stats (if any).
import { chromium } from 'playwright';
const page = process.argv[2], timeout = +(process.argv[3] ?? 3600000);
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--js-flags=--max-old-space-size=12000'] });
const p = await b.newPage({ viewport: { width: 640, height: 400 } });
p.on('console', (m) => { const t = m.text(); if (/^\[(x|T)\]/.test(t) || m.type() === 'error') console.log(t); });
p.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await p.goto(`http://localhost:5310/${page}`, { timeout });
await p.waitForFunction(() => window.__done, null, { timeout, polling: 2000 });
console.log(JSON.stringify(await p.evaluate(() => window.__stats ?? null)));
await b.close();
