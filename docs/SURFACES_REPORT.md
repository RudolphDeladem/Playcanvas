# Synchronisation, ground surfaces, roads, sidewalks and vegetation (2026-10-19)

This report covers three things. First, the PlayCanvas campus is brought up to date with the original game's latest
work (Pent, Evandy, TF, Bani and more). Second, the 1.5× road widening and the sidewalks laid along every main road
are undone. Third, every ground surface and plant is held to the map evidence.

It covers what the evidence covers. **It does not make the whole campus accurate.** Where the evidence is not enough,
the area is left as the original draws it and listed for the owner's decision (see *Needs the owner's decision*).

## 1. Synchronisation with GitHub

| | |
| --- | --- |
| Local clone before | `RudolphDeladem/legonrush-world`, branch `claude/wizardly-fermi-q6virk` at `b91e9d0` (local `main` at `df91173`) |
| Remote used | `origin/main` at `dc022c1` ("Legon look pictures and the game-frame check", 2026-10-18 21:12) |
| Missing commits | 130 commits past `b91e9d0` (2026-10-15 → 10-18), 65 of them on `main` since the local `main`. Every other remote branch (`gifted-clarke`, `nifty-gauss`, `legonrush-buildings-rebuild`, `project-thread`) is already inside `main`. `gh-pages` holds only a publish commit. |
| Local work | No uncommitted changes, no untracked files and no local-only commits, so nothing needed preserving. A backup branch `backup/pre-sync-b91e9d0` was made anyway. |
| Method | Fast-forward of the local `main` to `origin/main`. No conflicts, no merge commit, nothing pushed to the original repository. |
| Files changed by the sync | 494 files, +18,759 / −1,724 lines. Among them 147 source files, the map data (`legon-map.json`, `legon-master.geojson`, `corrections.json`), and the Car Kit models in `public/models/cars/`. |

The restored work includes:

- **Pent:** the New Pent Block A rebuild from the owner's roof plan, plus Blocks B and C. The car parks are asphalt,
  run continuous into the road, and none stands behind Block A. Also the Pent-side blocks, grey paving, the security
  post and the walkway along Pent Road.
- **Evandy:** the full audit (batches 215–221). Basketball court with markings, emblem and hoops; Annex A and B;
  administration building; rear entrance; court tree; the Bani-to-Evandy road through bush.
- **TF:** the north pair joined by the tank section, the open lobby entrance, and the one-storey block.
- **Bani:** brick lane, gate and booth, the service strip and kiosks, red-earth grounds with no asphalt inside.
- **Other:** reused vegetation (one batched draw), Kenney Car Kit cars, the soil ground (`soilground.ts`), the Balme
  Library paving, the Okponglo junction plan.

### Bringing it into PlayCanvas

- **Campus reconverted** with `tools/export/convert.sh` from `dc022c1`. The converter was extended for the original's
  new structures:
  - the batched plants (`BatchedMesh`), now one instanced batch per kind with a near and a far shape;
  - the painted Car Kit cars, with the paint baked into vertex colours;
  - the soil ground's coverage attribute and its vertex-colour use;
  - the halls' angled gateway passages (`opassages.json`);
  - the original's hidden-face drop;
  - material tags for vegetation.
- **Ported game files** whose originals changed were updated:
  - unmodified copies replaced: `legon-map.json`, `campusmap.ts`, `evandyplan.ts`, `lbplan.ts`, `okplan.ts`,
    `features/missions.ts`, `features/map/campus.ts`, `ui/mapview.ts`, and the new `okjplan.ts`;
  - adapted ports three-way merged, keeping the PlayCanvas changes: `relief.ts`, `science.ts` (Bani grounds),
    `textures.ts` (compacted asphalt), `solids.ts` (angled passages, deck solids) and `life.ts` (the Okponglo
    junction's road clearance; its build-time conflicts resolved in favour of the port, whose campus is converted).
  - Left out on purpose:
    - the original's walking mode, rooms and residence (`state.ts`);
    - the Car Kit traffic (`models.ts`), which needs the models loaded at run time;
    - the phone and gamepad files that depend on modules not ported.
- **Verified** by the same cameras in both games: `docs/surfaces/original-vs-playcanvas.png` (Pent, Evandy, TF, UPSA).
  Deployed against synced: `docs/surfaces/sync-before-after.png` (Pent, Evandy, TF, Bani).

## 2. Road widths

**Why they became too wide.** `roadedges.ts` widened every main road to `max(map half-width, 3.9 m) × 1.5`. The
3.9 m floor is the ridden route's half-width; together with the 1.5 factor it made every main road at least 11.7 m of
asphalt. The map's widths are 9 m (main), 7.4 m (through) and 6.2 m (residential), so residential and through roads
were nearly doubled. The sidewalk bands were measured from the widened edge, so they moved out by another 2 m a side,
over verges and car-park edges.

**What changed.** The factor and the floor are gone (the owner, 2026-10-19: "everything should use the map as
reference"). Each road is drawn at the map's width for its class, the same width the original game draws. Centre
lines, junction rounding and the centre dashes are unchanged. The walkers beside the route are back at their original
offset.

## 3. Sidewalks

**Before:** a lip, gutter, white kerb and paver sidewalk along both sides of all 3,562 main-road segments (7,124
sides), except hall entrances, earth roads, car parks and buildings.

**Now:** a sidewalk only on a side the map shows one, **140 sides**:

- 92 sides where OSM tags a sidewalk (`sidewalk=both/left/right`). Mostly University Avenue and the N4.
- 48 sides where a mapped footway runs alongside the road, 0.5–6 m off its edge, along at least half the segment.

No sidewalk is drawn on:

- 510 sides tagged `sidewalk=no`, or with the sidewalk mapped as a separate way (the campus already draws that
  footway, so drawing another would duplicate it);
- 328 sides facing a parallel carriageway (a median);
- all remaining sides, which have no evidence.

Evidence map: `docs/surfaces/sidewalk-evidence-map.png`. The owner said on 2026-10-18 that "almost all roads" have
sidewalks, but the map shows few, so this map asks which roads have them. Code: `src/data/sidewalks.json` (from
`tools/roads/sidewalks.mjs`) and `roadedges.ts` (`sidewalkSides`, `walkField`).

## 4. Ground surfaces

The pipeline from the earlier pass is kept and re-run on the synced data:

- `tools/surfaces/classify.mjs` classifies every mapped area and line from the master geography and OSM tags;
- `tools/surfaces/audit.*` measures how each one renders from above, now on the new campus;
- `src/data/surfaces.json` holds only what the game must draw over the campus (107 features);
- `src/game/surfaces.ts` draws them.

| Class | Look | Source |
| --- | --- | --- |
| Asphalt road | campus road | OSM highway class (962 untagged, assumed asphalt; 336 tagged asphalt) |
| Car park | the original's concrete, or asphalt where its sites model it | master parking areas: 53 owner-marked, 4 tagged, 74 by class |
| Car park, pavers | grey herringbone | 4 owner notes, 1 OSM `paving_stones` |
| Plaza / forecourt | concrete slabs | 9 owner, 7 by class |
| Paver lane / walk | red-brown herringbone | OSM `paving_stones/sett/bricks`: 19 lanes and 14 walks drawn |
| Earth | laterite | OSM `ground/dirt/compacted/unpaved`: 50 drawn |
| Gravel, concrete, asphalt walk | as tagged | OSM: 2, 4, 12 drawn |
| Grass | lawn | master lawns and pitches; never used as a filler |

Corrections in this pass:

- **Car parks and other double-sided ground drew dark.** The original winds some flat areas either way and draws them
  double-sided. three.js lights a back face with its normal flipped; PlayCanvas did not (`twoSidedLighting`). So car
  parks, among them every UPSA bay strip, showed as dark asphalt instead of light concrete, and many roofs were dark.
  Fixed in `campus.ts` for every double-sided material.
- **Car parks rendering as grass from above:**
  - shipped: 12 of 136;
  - now: 11, all of them owner-review items: the 10 UPSA lots, which the original deliberately models as grass and
    bare earth with paved bay strips, and 702279064, which it models as earth.
- **Plazas rendering as grass:** 6 shipped, 1 now (the fountain surround, an owner-review item).
- **Lines left to the original's newer drawing:** 634956633 (tagged earth) and 758602540 (tagged asphalt) are now
  drawn as light concrete by the original's update. Our overlays no longer cover them, and both are on the review sheet.
- **The soil ground's shader** failed to compile on the first conversion (`vColor`), which left bare earth wrong. Fixed
  in the converter and at run time.

## 5. Vegetation

- **The grass tufts are gone.** The owner asked for them to be removed entirely (2026-10-18). Removing `tufts.ts`
  removed only the port's own tufts; the converted campus still drew the original's 92,807 tufts. They are now tagged
  at conversion and never drawn.
- **Trees and plants on hard ground are left out** (`src/game/vegrules.ts`), together with their trunks' collision.
  A plant is dropped when its trunk stands:
  - on a road or footpath at its drawn width;
  - on a sidewalk, or a corrected car park, plaza or paved path;
  - inside a mapped car park, plaza or sports pitch;
  - inside a building's footprint.

  Counts per view, as samples:

  | View | Removed |
  | --- | --- |
  | Pent | 57 in car parks, 2 on roads |
  | Balme | 18 in car parks, 4 on roads, 8 in buildings |
  | Car park 702279064 | 73 in car parks, 13 on roads, 12 in buildings |
  | Akuafo | 12 in car parks, 6 on roads, 13 in buildings |
  | Evandy, TF, Bani | 11–16 on roads each |

  Cars, posts and other instanced parts are no longer affected; before, cars on a corrected car park could vanish.
- **Trees beside roads, in lawns and on the sites' planted islands stay** where the original placed them, from the
  owner's photos.
- **Not done: evidence-based tree placement campus-wide.** The original's street trees are generated along the roads,
  22–34 m apart. No tree survey or high-resolution canopy layer is available to place them one by one. ESA WorldCover
  (10 m) is too coarse for single trees.

## Needs the owner's decision

`docs/surfaces/review-sheet.png`: each item shows the satellite picture (Sentinel-2, 5 m a pixel) and the game from
above, the feature outlined, north up, with a scale.

1. **UPSA (10 car parks, e.g. 1533364971):** grass and earth between the bays as drawn, or paved?
2. **702279064:** an earth car park as drawn, or paved?
3. **320067568, Balme Library fountain:** are the strips either side of the pool lawn as drawn, or paved?
4. **340246934 and 340246848:** earth streets under an asphalt through road. Earth or asphalt?
5. **634956633:** tagged earth, now drawn as concrete by the original. Which is it?
6. **758602540:** tagged asphalt, now drawn as concrete by the original. Which is it?
7. **Sidewalks** (`sidewalk-evidence-map.png`): which roads have sidewalks that the map doesn't show?

Each answer goes into `classify.mjs` (`DECISIONS`, `SYNCED`) or `roadedges.ts` as an explicit correction.

Also unverified: 178 footpaths without a surface tag. They are left as the original draws them; the satellite
picture is too coarse to tell paving from earth at 2 m.

## Tests and build

- `npx tsc --noEmit` passes. `BASE_PATH=/Playcanvas/ npm run build` builds (play chunk 741 KB, 250 KB gzip).
- iPhone 13 emulation of the production build: the world loads, the touch controls are present, no console errors.
- Scripted ride (menu, Explore, free ride, night, fly-over): see the run in the commit notes.
- Collision is the original's own raster, re-exported from `dc022c1`, so the synced sites (Pent, Evandy, TF, Bani)
  block the bike as in the original. Dropped trees' trunks are ignored within 1.3 m.
- Draw calls in the test views went from about 250–350 to about 300–540, from the original's new content: per-kind
  plant batches and per-model car batches. Triangles in view went from about 1.0–1.7 M to 1.0–2.5 M.

## Known inaccuracies that remain

- **Car park markings:** none added, because no evidence shows them.
- **Untagged service roads:** assumed asphalt, as the original draws them.
- **Road widths:** the map's class widths, not measured per road. OSM `lanes` and `width` tags exist for about 90 ways
  but disagree with each other (for example 8 lanes on one unclassified road), so they are not used.
- **Outlines:** surface boundaries follow the OSM outlines, which can be several metres off the imagery.
- **Lighting:** the PlayCanvas lighting is a little warmer and foggier than the original's.
