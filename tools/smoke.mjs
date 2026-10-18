// Opens a page of this project headlessly, waits, takes a screenshot and prints the console's errors and warnings:
// node tools/smoke.mjs <url path> <out.png> [wait seconds] [js to run after the wait]
// (needs the dev server: npx vite --port 5320)
import { chromium } from 'playwright';
const [, , path, out, wait = '30', js = ''] = process.argv, port = process.env.PORT ?? 5320;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +(process.env.W ?? 1280), height: +(process.env.H ?? 760) } });
const log = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning' || /^\[(T|S)\]/.test(m.text())) log.push(`${m.type()}: ${m.text().slice(0, 400)}`); });
p.on('pageerror', (e) => log.push('PAGEERROR ' + (e.stack ?? e.message).slice(0, 800)));
await p.goto(`http://localhost:${port}/${path}`, { timeout: 120000 });
await p.waitForTimeout(+wait * 1000);
if (js) console.log('eval:', JSON.stringify(await p.evaluate(js)).slice(0, 2000));
await p.screenshot({ path: out });
console.log([...new Set(log)].slice(0, 40).join('\n'));
await b.close();
