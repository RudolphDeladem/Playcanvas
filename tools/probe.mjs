// The road-edge fields at points (tools/view ?probe): node tools/probe.mjs "x,z;x,z" [cam]   (dev server on 5320)
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 320, height: 200 } });
await p.goto(`http://localhost:5320/tools/view/view.html?game=1&settle=10&probe=${process.argv[2]}&cam=${process.argv[3] ?? '0,300,0,0,0,1,60'}`, { timeout: 600000 });
await p.waitForFunction(() => window.__done, null, { timeout: 900000, polling: 1000 });
console.log(JSON.stringify(await p.evaluate(() => window.__probe), null, 0));
await b.close();
