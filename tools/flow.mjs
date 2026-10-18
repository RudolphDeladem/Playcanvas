// Plays through the game headlessly: onboarding skipped, in as a guest, then the steps given (JSON list of
// {click: selector} | {wait: seconds} | {eval: js} | {shot: name}); prints console errors and each eval's result.
// node tools/flow.mjs <outdir> '<steps json>'   (needs the dev server on port 5320)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [, , out, stepsJson = '[]'] = process.argv, port = process.env.PORT ?? 5320;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +(process.env.W ?? 1280), height: +(process.env.H ?? 720) } });
const log = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning' || /^\[(T|S)\]/.test(m.text())) log.push(`${m.type()}: ${m.text().slice(0, 300)}`); });
p.on('pageerror', (e) => log.push('PAGEERROR ' + (e.stack ?? e.message).slice(0, 900)));
const t0 = Date.now(), at = (s) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${s}`);
await p.goto(`http://localhost:${port}/play/`, { timeout: 120000 });
try { await p.click('text=Skip', { timeout: 20000 }); } catch { /* no onboarding */ }
await p.waitForTimeout(3000); await p.screenshot({ path: `${out}/after-skip.png` });
if (!process.env.NOGUEST) { try { await p.click('#guest', { timeout: 30000 }); at('guest'); } catch { at('no #guest button'); } }
await p.waitForFunction(() => performance.getEntriesByName('legonrush:world-ready').length, null, { timeout: 300000, polling: 500 }).catch(() => at('world NOT ready')); at('world ready?');
for (const s of JSON.parse(stepsJson)) {
  try {
    if (s.click) { await p.click(s.click, { timeout: 30000 }); at(`click ${s.click}`); }
    if (s.wait) await p.waitForTimeout(s.wait * 1000);
    if (s.eval) at(`eval ${JSON.stringify(await p.evaluate(s.eval)).slice(0, 1500)}`);
    if (s.shot) { await p.screenshot({ path: `${out}/${s.shot}.png` }); at(`shot ${s.shot}`); }
  } catch (e) { at(`step failed ${JSON.stringify(s)}: ${String(e).slice(0, 300)}`); }
}
console.log([...new Set(log)].slice(0, 40).join('\n'));
await b.close();
