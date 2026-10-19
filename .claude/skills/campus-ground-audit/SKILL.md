---
name: campus-ground-audit
description: Evidence-based audit and correction of the LEGONRUSH PlayCanvas campus ground. Covers surface classification (road, car park, sidewalk, footpath, plaza, lawn, bare earth, entrance), vegetation on hard surfaces, sidewalk stability and junction continuity. Works zone by zone against OpenStreetMap data and satellite imagery, keeping a persistent checklist and decision record. Use when asked to audit, classify, verify or correct the campus ground, roads, sidewalks or roadside plants.
---

# Campus ground audit (LEGONRUSH, PlayCanvas)

A repeatable workflow for making the campus ground match the real University of Ghana, Legon. It runs in two phases:

- **Inspection and report.** No game file changes.
- **Correction.** Zone by zone, each zone verified before the next starts.

When invoked with arguments (for example `/campus-ground-audit zone 18` or `/campus-ground-audit inspect`), limit the run
to what they name. Without arguments, start Phase A.

## Ground rules (never broken)

- **Repositories.** Work only in this repository (`legonrush-playcanvas`, GitHub `RudolphDeladem/Playcanvas`).
  - The original game (`/home/user/legonrush-world`, GitHub `RudolphDeladem/legonrush-world`) is read-only evidence:
    never edit, commit to or push it.
  - Never touch `RudolphDeladem/legonrush` or the live Netlify site.
- **Coordinates.** Keep the campus coordinate frame unchanged: x east, z south, metres from lat 5.6518, lng -0.1871
  (`M_LAT = 110574`, `M_LNG = 111320·cos(lat0)`; tools/surfaces/classify.mjs `local`).
- **Preserve:**
  - building positions and road centre lines;
  - collision, navigation, routes and gameplay;
  - unrelated systems.
- **Road widths.** No universal width change. Widths come from the map by class (src/game/life.ts `ROAD_WIDTH`). Change
  one road only with a measurement from imagery, and record it.
- **Never invent a surface, sidewalk, car park, lawn, earth patch or tree.** Green ground is never a fallback for "unknown".
  - When the evidence is incomplete or conflicting, mark the area `needs_review`.
  - Then ask the owner for a zoomed-in screenshot or reference image.
- **Map tags are evidence, not truth.** A missing OSM `surface` tag proves nothing.
- **A street map is not satellite imagery.** Say which one you used.
  - If imagery cannot be fetched (network policy, quota, licence), report that plainly and work from the map.
  - Never claim to have looked at imagery you did not get.
- **Ask before introducing** any new external imagery source, API key, paid service or licence obligation.
  - Imagery stays out of the repository (it is public). Commit only derived data, such as public/geo/ground-classes.png.
  - Esri World Imagery and Google tiles are references only.
  - Sentinel-2 (public/geo/legon-sentinel2.webp) is free to ship.
- **Do not install** unrelated packages, skills or plugins.
- **Git.** Commit as `-c user.name=RudolphDeladem -c user.email=zikpirudolph9090@gmail.com`, with the session's attribution
  trailer.
  - No model names in commits or code.
  - Never rewrite history or force-push `main`.
  - Push only when the owner wants a deploy. GitHub Pages builds `main` to
    https://rudolphdeladem.github.io/Playcanvas/play/.

## Where things are (read these before changing anything)

| Concern | Files |
|---|---|
| Map data (roads, buildings, areas, places; decimetres) | `src/data/legon-map.json`, `src/game/campusmap.ts` (`AREAS`, `NODE_XZ`, `ROADS`, `buildingAt`) |
| Ground relief | `src/game/relief.ts` (`groundHeight`, `layerHeight`) |
| Converted campus tiles, layer lift, plant drop hook | `src/engine/campus.ts` (`dropInstance`, `liftLayers`, LODs: tree crowns only), `public/campus/` |
| Main-road asphalt, kerbs, sidewalks, median, zebras | `src/game/roadedges.ts` (distance fields `mainField`, `walkField`, `medianAt`, `betweenRoads`; bands; 128 m tiles built round the camera) |
| Sites that model their own ground (left alone) | `src/game/groundrules.ts` (`excludedAll`) |
| Classified surfaces from map, OSM and owner decisions | `tools/surfaces/classify.mjs` (`DECISIONS`, `SYNCED`, `OWNER_AREAS`) → `src/data/surfaces.json`, `tools/surfaces/classification.json`; looks in `src/game/surfaces.ts` (`LOOKS`) |
| Ground types from satellite | `tools/satellite/mosaic.py` → `classify.py` (with `gameground.py` grass mask) → `public/geo/ground-classes.png`; drawn by `src/game/satground.ts` |
| Plant exclusion | `src/game/vegrules.ts` (`vegetationBlocked`: footprint test), `src/game/shrubs.ts` |
| Rain puddles | `src/game/weatherfx.ts` |
| Reports and evidence | `docs/SURFACES_REPORT.md`, `docs/GROUND_SIDEWALK_REPORT.md`, `docs/aerials/` (30 zones), `docs/places/` |

Owner context:

- the handover docs listed in CLAUDE.md;
- `docs/handover/conversation-log-*.md`;
- `docs/LEGON_BUILDINGS.md`.

## Tools for evidence

Start a dev server first:

```
node node_modules/vite/bin/vite.js --port 5320 --strictPort
```

Keep these in mind while it runs:

- Do not edit `src/`, `tools/view/` or `vite.config.ts` while renders or rides run against it. A reload or restart breaks
  them.
- Kill processes by PID, never with `pkill -f`.

| Tool | What it does |
|---|---|
| `tools/view/view.html?game=1&look=preview&cam=x,h,z,tx,th,tz,fov` | Any view with the game's own layers. `game=0` shows the original's ground only. |
| `node tools/shoot.mjs <outdir> '<json [{name,url}]>'` | Headless renders. Straight down: `cam=x,H,z+0.1,x,0,z,60`, ground metres a pixel = 2·H·tan30°/760. |
| `node tools/probe.mjs "x,z;x,z" [cam]` | Road-edge field values at points (why a kerb or walk is or is not drawn). |
| `python3 tools/aerials.py`, `tools/satellite/zones.py` | Labelled aerials, and four-panel zone sheets: satellite, classes, before, after. |
| `tools/satellite/review.py` | The owner's review sheet: marked, zoomed satellite and game crops. |
| `node tools/scenario.mjs`, `tools/rainride.mjs`, `tools/iphone.mjs`, `tools/perf.mjs` | Scripted ride, rain ride, phone emulation, performance. |

For before/after comparisons, serve a `git worktree` of the previous commit on another port (`PORT=5330`).

## Persistent records (so decisions survive rebuilds)

- **Checklist:** `docs/ground-audit/ZONES.md`. Create it on the first run from the 30 zones in `docs/aerials/views.json`,
  plus any zone the owner names. Each zone has one row:
  - status: `todo`, `inspecting`, `needs_review`, `fixed` or `verified`;
  - date;
  - evidence used;
  - changes;
  - open questions;
  - screenshot paths.
- **Classification decisions** go in code, never only in a report:
  - owner decisions and evidence-backed overrides in `tools/surfaces/classify.mjs` (`DECISIONS`, `OWNER_AREAS`), with
    the reason and the date;
  - satellite masks and exclusions in `tools/satellite/classify.py`.
  - Re-running the pipeline must reproduce them.
- **Open questions:** keep a `needs_review` list in the checklist, and a review sheet image for the owner. It carries
  imagery, so send it to the owner and do not commit it.

## Phase A: inspection and report (no game file changes)

1. Read the files in the table above. Trace one feature end to end:
   - an OSM way;
   - then `legon-map.json`;
   - then the game-frame coordinates;
   - then the mesh that draws it (campus tile, roadedges band, surfaces or satground);
   - then its material.
2. Gather the evidence:
   - Check that imagery can be fetched: Esri `World_Imagery` tile, `curl -s -o /dev/null -w "%{http_code}"`. Report
     the result.
   - Check that the mosaic is aligned against building footprints, and state the error in metres.
3. For each reported symptom, find the root cause before proposing a fix:
   - **Plants on hard ground:** check the exclusion test (footprint or origin; which surfaces it knows), the time of the
     decision (tile load, chunk reload), and special plant sets (median hedges, shrubs).
   - **Sidewalk that seems to move:** check entity parenting (scene, rider, camera), world versus local coordinates,
     tile build and drop radius, regeneration, depth bias and z-fighting, and camera-relative effects (weather puddles,
     shadows, fog).
   - **Sidewalk gaps and junctions:** check which sides carry a sidewalk, how bands are measured (`own`, the wrap), what
     ends a sidewalk (side road, wall, site exclusion, island), and whether the real campus has a sidewalk there at all.
4. Write a report: findings, root causes with file:line, the proposed plan by zone, risks, and the open questions.
5. Stop and wait for the owner's go-ahead before Phase B, unless they already gave it for this run.

## Phase B: correction, zone by zone

Take one zone at a time, in checklist order. Do not start the next zone until this one is `verified` or `needs_review`.

1. **Inspect.** Render the zone (the aerial frame, plus rider-height views at junctions and entrances). Set the
   satellite crop beside it. List every road, car park, sidewalk, footpath, plaza, lawn, earth patch, entrance and
   plant group.
2. **Classify.** Give each item exactly one category from this list, each backed by evidence:
   - vehicle road;
   - car park;
   - sidewalk;
   - pedestrian footpath;
   - paved plaza or courtyard;
   - lawn;
   - bare earth or dusty ground;
   - building entrance or apron;
   - another category the evidence supports.

   Record the evidence: OSM id or tag, satellite, owner photo, or the original's site model. Mark anything unsupported
   `needs_review`.
3. **Correct the underlying system, not the visible instance:**
   - data: classify.mjs decisions, satellite masks;
   - generation: roadedges bands, satground;
   - material mapping: `LOOKS`;
   - exclusion rules: vegrules, groundrules.

   Keep each change minimal and inside the zone's evidence.
4. **Verify:**
   - before/after renders from above and at rider height;
   - a ride through the zone (in rain too when puddles or wet surfaces matter);
   - plants clear of hard ground;
   - kerbs neither floating nor sinking;
   - no new z-fighting or gaps;
   - the neighbouring zones unchanged.

   A successful build is not verification.
5. **Record.** Update the checklist row: evidence, changes, screenshots, open questions. Set the status to `verified` only
   after looking at the renders.
6. Run `npx tsc --noEmit -p .` after each zone, and the relevant fast checks.

## Completion

- Run `npx tsc --noEmit -p .`, `BASE_PATH=/Playcanvas/ npm run build`, `node tools/scenario.mjs`, and
  `node tools/iphone.mjs` on the production preview.
  - Report every failure with its output. Do not call a failing check a pass, and say when a failure predates the round.
- Report:
  - every zone checked, with its status;
  - the root causes fixed;
  - the surfaces changed, with counts or areas;
  - the evidence and imagery actually used;
  - the remaining uncertainties and the review sheet;
  - any regression, and the performance cost (triangles, build time).
- Do not claim the campus is complete while any zone is `todo` or `needs_review`. Say which areas were not inspected by eye.
