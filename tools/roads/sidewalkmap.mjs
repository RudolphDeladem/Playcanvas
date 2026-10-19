// The sidewalk evidence map: every main road segment with the sides that get a sidewalk (roadedges.ts), drawn over
// the Sentinel-2 picture of the campus, for the owner's review. node tools/roads/sidewalkmap.mjs <out.png>
// (dev server on port 5320; python3 with Pillow draws the picture)
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const out = process.argv[2] ?? 'sidewalks.png';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 320, height: 200 } });
await p.goto(`http://localhost:${process.env.PORT ?? 5320}/tools/view/view.html?game=1&sidewalks=1&cam=0,60,120,0,0,0,55`, { timeout: 600000 });
await p.waitForFunction(() => window.__done, null, { timeout: 900000, polling: 1000 });
const segs = await p.evaluate(() => window.__sidewalks);
await b.close();
const json = out.replace(/\.png$/, '.json');
writeFileSync(json, JSON.stringify(segs));
execFileSync('python3', [new URL('./sidewalkmap.py', import.meta.url).pathname, json, out], { stdio: 'inherit' });
