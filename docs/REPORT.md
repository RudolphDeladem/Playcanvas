# Recreation report

Date: 2026-10-18. Reference: the original at `RudolphDeladem/legonrush-world` `b91e9d0`. All tests were run in this
cloud container: headless Chromium with SwiftShader (software rendering, no GPU), so frame times are only meaningful
**relative to the original measured the same way**; draw calls, load times, memory and collision are not affected.

## The original is unchanged

- No file of the original was edited, added or removed; `git status` in it is clean and its HEAD is still `b91e9d0`.
- Its remote, branches, configuration and deployment were not touched. This project has **no git remote**; it was
  not connected to the original's GitHub repository.
- The original was only *read*: its source imported by the converter (served read-only at `/orig`), and its dev server
  run for side-by-side screenshots and measurements.
- Creating a new GitHub repository from this session was refused (the session's GitHub access is limited to the
  original repository: `403 Resource not accessible by integration`). The project is delivered as a git bundle (see
  the end).

## What works (verified here)

| Check | Result |
|---|---|
| `npm install`, `npm run typecheck` | pass |
| `npm run build` (typecheck + Vite + PWA service worker) | pass; precache 53 entries (4.1 MB); campus tiles cached on demand |
| Production build (`vite preview`) | loads, tutorial ride starts, no console errors ([screenshot](screenshots/pc-production-build.jpg)) |
| Console during the scripted session (menu, Explore ride, free ride, night, fly-over) | no errors, no warnings |
| Menus, onboarding, guest entry, HUD, mini map, tips | the original's UI, working on the new game |
| Tutorial race: countdown, riding, lanes, HUD speed | works |
| Explore ride Balme Library → Great Hall | rides along the campus roads, **no ground route line** ([screenshot](screenshots/pc-explore.jpg)) |
| Free ride: pedal, steer, stop at solids | works; the bike stopped at a real tree trunk ([screenshot](screenshots/pc-free.jpg)) |
| Collision equals the original's | **3,000 / 3,000** sampled points give the same answer as the original's run-time checks, for the bike-height mesh raster (261 blocked), trunks and posts (34), earth tracks (8) in three areas (`tools/collcheck.mjs`) |
| Night (lamps, lit windows, headlight), fly-over camera | work ([night](screenshots/pc-night.jpg), [fly-over](screenshots/pc-flyover.jpg)) |
| Rain | off by default (`settings.weather` defaults to `clear`); the rider can still choose changing or live weather |
| Supabase | same project, publishable key only; guests never load the client; no backend data or configuration changed |

### Side by side with the original

Same moment, same camera, original left, PlayCanvas right:

- Menu scene ([menu-scene.jpg](screenshots/menu-scene.jpg)) and night on the Explore route ([night.jpg](screenshots/night.jpg)):
  buildings, trees, roads, sky, hills, fog, lighting match closely. Differences: walkers are placed at random in both;
  on the Explore route the original draws its route road over the campus, this project shows the campus road itself
  (the brief's "no ground route line").
- Tutorial ride ([tutorial-ride.jpg](screenshots/tutorial-ride.jpg)) and fly-over ([flyover-explore.jpg](screenshots/flyover-explore.jpg))
  were taken **before** the fog and sky fix described below (the PlayCanvas side is hazier there), and while it
  happened to rain in both (the original's default weather).

Two rendering differences were found by these comparisons and fixed: PlayCanvas mixed fog in linear light before
tone mapping (everything far away looked foggier than the original) and tone-mapped the skybox (the original's sky
shader is not tone mapped: the far hills disappeared). Fog is now applied to the final colour and the skybox is not
tone mapped, as in the original.

## Performance (same machine, same session, same page size)

| Measure | Original (Three.js) | PlayCanvas | |
|---|---|---|---|
| Page open → world ready (`legonrush:world-ready`) | 59.0 s (campus built on the device: 38 s build + 16 s upload) | **2.8–3.0 s** (tiles streamed round the start) | 20× faster |
| JS heap while riding | 387 MB | **198–216 MB** | about half |
| Fixed view, route d = 100 m: frame time / draw calls | 3,633 ms / 492 | **1,850 ms** / 456 | 51% |
| Fixed view, d = 400 m | 2,550 ms / 344 | **1,450 ms** / 328 | 57% |
| Fixed view, d = 800 m | 1,033 ms / 239 | **650 ms** / 349 | 63% |
| Download for the first view | the whole campus code (the 3D build runs on the device) | 50 tiles, 5.2 MB | |

Frame times are SwiftShader's (CPU rendering); on a real GPU both are far faster. One measured change came out of this:
PlayCanvas's clustered lighting (its default, for scenes with many lights) cost about 40% of each frame for the game's
two lights and is turned off. Shadows are two cascades of 2048 px within 70 m (the original: one 2048 px map over a
60 m box); turning them off made no measurable difference here.

Where the gains come from: the campus is converted once (welded, simplified within 6 mm, quantised, gzipped,
12.3 M vertices from 42.1 M), streamed (only the tiles within 420 m are in memory), drawn with hardware instancing for
the 180,000 tree parts, and its levels of detail are the original's.

## Not done, or different

| Item | State |
|---|---|
| Kenney Car Kit vehicles | **not applicable**: the original has no Kenney assets (no file, import, document or commit). Its procedural car, taxi and trotro are kept. Nothing was invented. |
| Sky animation | the clouds do not drift (the sky is painted once per time of day into a cube map) |
| Rain greys the sky | not done (fog and light dim, roads darken, puddles appear; the sky keeps its colour) |
| Per-instance colours on the kit's instanced meshes (grass tufts, the Campus Life ambient crowd) | drawn in one tint per batch (the campus's own instanced trees keep their tints: their batches are split by colour) |
| Races against ghosts, friends' runs, live riders, bots | ported, **not exercised** in an automated test |
| Campus Life hangouts | ported, **not exercised** in an automated test |
| Garage camera, photo mode, capture to PNG | ported, **not exercised** in an automated test |
| Gamepad | copied unchanged; like the original, never tested on a physical controller |
| Physical devices (phones, GPUs) | not tested: no device in this environment. Needs a run on the owner's phone and laptop |
| Free-ride check across every site (gates, passages, decks) | the rule and data are the original's (identical answers on 3,000 points); a ride test site by site was not done |
| Explore without the route's road: places where the original's route road covered unfinished ground | seen once, from the fly-over at the Balme forecourt (a plain area beside the road): to be reviewed by the owner |
| Campus updates | the campus is a converted snapshot of `b91e9d0`: a new batch in the original needs `tools/export/convert.sh` again (4 minutes) |

## Risks

- **Two sources of truth for the campus.** Rebuilding sites continues in the original; this project reconverts.
  A batch that adds a new kind of shader tweak would need the converter's translation table extended.
- **The modelling kit** covers what the original's models use; new model code using other Three.js features would
  need the kit extended (it fails loudly when a constructor is missing).
- **Repository size**: `public/campus/` is about 120 MB of binary files. Git LFS, or building it in CI from the
  original, would keep the repository small.
- The Supabase project is the production one: development against it can write real data once signed in. Use
  `VITE_SUPABASE_REF` / `VITE_SUPABASE_KEY` with a staging project.

## Delivery

The project is a git repository (branch `main`) with no remote. A bundle of it is provided; to publish it:

```sh
git clone legonrush-playcanvas.bundle legonrush-playcanvas
cd legonrush-playcanvas
git remote add origin https://github.com/<owner>/legonrush-playcanvas.git   # a NEW repository
git push -u origin main
npm install && npm run dev
```
