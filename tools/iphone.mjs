// The game as an iPhone sees it (Safari's user agent, a phone screen, touch input, pixel ratio 3), in headless Chromium:
// onboarding skipped by a tap, the tutorial ride, a screenshot, the touch controls found on the page, console errors.
// node tools/iphone.mjs <url> <out.png>
import { chromium, devices } from 'playwright';
const [, , url, out] = process.argv;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ ...devices['iPhone 13'] });
const p = await ctx.newPage();
const log = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') log.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
p.on('pageerror', (e) => log.push('PAGEERROR ' + e.message));
p.on('requestfailed', (r) => log.push(`FAILED ${r.url()} ${r.failure()?.errorText}`));
p.on('response', (r) => { if (r.status() >= 400) log.push(`HTTP ${r.status()} ${r.url()}`); });
await p.goto(url, { timeout: 120000 });
try { await p.tap('text=Skip', { timeout: 20000 }); } catch { log.push('no Skip'); }
await p.waitForFunction(() => performance.getEntriesByName('legonrush:world-ready').length, null, { timeout: 300000, polling: 500 }).catch(() => log.push('world NOT ready'));
await p.waitForTimeout(12000);
await p.screenshot({ path: out });
console.log(JSON.stringify(await p.evaluate(() => ({
  ready: performance.getEntriesByName('legonrush:world-ready').length > 0,
  touchButtons: [...document.querySelectorAll('button, [role=button]')].filter((e) => e.offsetParent && /left|right|jump|boost|pedal|brake|steer/i.test(e.id + ' ' + e.className + ' ' + (e.getAttribute('aria-label') ?? ''))).map((e) => e.id || e.getAttribute('aria-label') || e.className).slice(0, 20),
  viewport: [innerWidth, innerHeight, devicePixelRatio],
  canvas: (() => { const c = document.querySelector('canvas'); return c ? [c.width, c.height] : null; })(),
}))));
console.log([...new Set(log)].slice(0, 20).join('\n'));
await b.close();
