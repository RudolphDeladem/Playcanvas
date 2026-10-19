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

## 3. Sidewalks, kerbs, gutters and verges

The owner's corrections of 2026-10-19 came in three steps:

1. Pictures of the median of Dr. J.B. Danquah Avenue and of University Square, with "remove that from the entire
   game" (the concrete lip and open gutter beside the road) and "sidewalks should not cross roads" (a paved slab
   bridging a road junction).
2. Their map of the main campus roads (the thick, named ones): "add the side walk to all main roads and also the
   white stone that protect the side walk".
3. "Grass separating grass from park, fix it."

What the game draws now:

- **Main roads** (every named main road): the map's width of asphalt, then a raised white stone kerb at its edge,
  then 2 m of grey herringbone paver sidewalk, then the lawn. No lip, gutter or drain anywhere.
- **Where sidewalks stop:** a sidewalk stops where a side road or lane joins, so it never crosses one. Where a
  footpath meets the road the kerb is flush.
- **Medians:** a side facing the other carriageway of the same road gets no sidewalk. That keeps Dr. J.B. Danquah
  Avenue's lawn median as Google's picture shows it, edged only by the original's thin kerb.
- **No sidewalk:** on roads into halls (Pent, Evandy and the others), on unnamed and unpaved roads, inside car parks
  and plazas, or through buildings.
- **Car parks:** where a car park lies within 3.5 m of a main road, the ground between is asphalt, with no strip of
  grass.
- **Verges and drains:** the original's own concrete verges and open drains along the main roads
  (`world.ts buildRoadEdges`) are tagged `verge` at conversion and never drawn.

Code: `roadedges.ts` (`sidewalkSides`, the bands, `nearPark`).

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
- **Balme Library (the owner, 2026-10-19):** the tree groves either side of the forecourt, between the car parks,
  and the tree rows along the lanes past the sunken square are replaced by low shrubs (`shrubs.ts`, three instanced
  shapes). The trees there are left out by `vegrules.ts`: 127 parts (crowns, trunks and far shapes).
- **Excess trees (the owner, 2026-10-19):** outside the mapped woods and groves, a tree over 3 m tall standing within
  6 m of one already kept is left out, so no two crowns crowd into one. Street trees (22–34 m apart), bushes and
  hedges are unaffected. In the test views this removes roughly a fifth to a third of the tall trees (for example 214
  of about 1,000 round the Balme Library).
- **Not done: evidence-based tree placement campus-wide.** The original's street trees are generated along the roads,
  22–34 m apart. No tree survey or high-resolution canopy layer is available to place them one by one. ESA WorldCover
  (10 m) is too coarse for single trees.

## Aerial views for the owner's review

`docs/aerials/01.jpg` … `30.jpg` and `docs/aerials/index.jpg`. Each view is straight down, north up, about
424 m × 252 m, labelled with its number and game-frame centre, with a 50 m bar.

- Views 1–24 are a 4 × 6 grid over the main campus (x −700…1000, z −500…900; row 1 is the north).
- Views 25–30 are New Pent, Evandy, Bani, TF Hostel, UPSA and the N4 at the main gate.
- `docs/aerials/views.json` holds the cameras. Shoot them again with `tools/shoot.mjs` and label them with
  `tools/aerials.py`.

## Needs the owner's decision

`docs/surfaces/review-sheet.png`: each item shows the satellite picture (Sentinel-2, 5 m a pixel) and the game from
above, the feature outlined, north up, with a scale.

1. **UPSA (10 car parks, e.g. 1533364971):** grass and earth between the bays as drawn, or paved?
2. **702279064:** an earth car park as drawn, or paved?
3. **320067568, Balme Library fountain:** are the strips either side of the pool lawn as drawn, or paved?
4. **340246934 and 340246848:** earth streets under an asphalt through road. Earth or asphalt?
5. **634956633:** tagged earth, now drawn as concrete by the original. Which is it?
6. **758602540:** tagged asphalt, now drawn as concrete by the original. Which is it?

Each answer goes into `classify.mjs` (`DECISIONS`, `SYNCED`) as an explicit correction.

Also unverified: 178 footpaths without a surface tag. They are left as the original draws them; the satellite
picture is too coarse to tell paving from earth at 2 m.

## Flicker on paved ground

The original lays some paving 3–5 cm over the ground without a depth bias, the Balme Library's forecourt among them.
The port lifted the original's depth-biased layers (paths, verges, car parks) by up to 6 cm to stop grass showing
through them from above, and a lifted layer then fought that paving at its edges. The lifts are now a few millimetres
a step, at most 1.6 cm, in the same order. The port's own corrected surfaces sit at 2.6–3.2 cm, so the original's
paving wins where they meet. Before/after: `docs/surfaces/edges-trees-before-after.png`.

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
