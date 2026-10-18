# LEGONRUSH on PlayCanvas

LEGONRUSH, the browser cycling game on the real University of Ghana, Legon campus, recreated on the
[PlayCanvas engine](https://playcanvas.com) (TypeScript, Vite, PWA, Supabase). This is an independent project: the
original Three.js game (`RudolphDeladem/legonrush-world`) is its reference and source of assets, and was not changed.

- What exists and how far each part is recreated: [`docs/FEATURE_INVENTORY.md`](docs/FEATURE_INVENTORY.md)
- How it is built (engine, streamed campus, modelling kit, converter, data formats): [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Tests, performance, comparison with the original, what remains: [`docs/REPORT.md`](docs/REPORT.md)

## Run it

Node 20 or later.

```sh
npm install
npm run dev          # http://localhost:5320/play/  (the game); / is the landing page, /geo/ the map inspector
npm run build        # typecheck, then the production build in dist/ (with the service worker)
npm run preview      # serves dist/
```

The converted campus is in `public/campus/` (about 120 MB: tiles, textures, collision data) and is served as static
files. A static host serving `dist/` is all that is needed; the `.lrz` files are gzip streams the game inflates itself,
so no server configuration is required.

## Rebuild the campus from the original

The campus is converted from the original game's own code. With the original checked out next to this project
(`../legonrush-world`, or `ORIG=/path/to/it`) and its dependencies installed:

```sh
sh tools/export/convert.sh                         # everything, about 4 minutes; replaces public/campus/
QUERY='?only=landmark' sh tools/export/convert.sh  # one part only (keeps the rest)
```

It runs the original's campus build in headless Chromium (Playwright; set `CHROMIUM` to a Chromium binary if
Playwright's own is not installed) and writes `public/campus/`. Nothing is written to the original.

## Checks

```sh
npm run dev &                                              # the dev server the scripts use (port 5320)
node tools/scenario.mjs /tmp/shots                          # menu, Explore, free ride, night, fly-over: screenshots + console errors
PORT=5299 node tools/scenario.mjs /tmp/shots-original       # the same on the original (its dev server on 5299)
node tools/shoot.mjs /tmp/views '[{"name":"balme","url":"tools/view/view.html?cam=-60,60,40,-20,0,-60,55"}]'
```

## Backend

Accounts, cloud saves, leaderboards and live channels use the original's Supabase project (publishable key only; the
database rules decide what it can do). To develop against another project, put `VITE_SUPABASE_REF` and
`VITE_SUPABASE_KEY` in `.env.local` (ignored by git). Never put a service-role or payment secret in this repository.
