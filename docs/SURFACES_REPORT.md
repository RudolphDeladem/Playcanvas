# Ground surfaces: classification and correction (2026-10-19)

This pass classifies the campus's mapped ground surfaces and corrects the ones that rendered wrong, such as car parks
that showed as grass and brick-paved lanes that showed as asphalt. It covers only what the evidence covers. **It does
not make the whole campus accurate.** Surfaces nobody has mapped or tagged are left as they were and listed below.

## What changed

| File | What it does |
| --- | --- |
| `tools/surfaces/classify.mjs` | Builds the classification. It reads the original's master geography, the raw OSM tags and the render audits, gives every mapped area and line a class, a confidence and a reason, and records the owner decisions, conflicts and review notes. Output: `tools/surfaces/classification.json` (all 493 features with their evidence and audits) and `src/data/surfaces.json` (only the 108 features the game draws, 20 KB). |
| `src/game/surfaces.ts` | Draws the classes. The material for each class is defined here (`LOOKS`), separately from the geometry, so changing a class's look never moves geometry. Features are triangulated into 256 m chunks with one mesh per class per chunk, and only chunks within 520 m are shown. It also provides `onHardSurface` (no trees or tufts on hard ground) and `unpavedAt` (earth and paver lanes get no asphalt kerbs). |
| `src/game/groundtex.ts`, `src/game/groundrules.ts` | Shared paver and laterite textures, and the shared exclusions (hall courts, stairs, cut bands) used by both the road edges and the surfaces. |
| `src/engine/campus.ts` | **Root-cause fix.** PlayCanvas applies polygon offset mostly by slope, so from straight above the converted campus's coplanar ground layers (car parks, plazas, paths) lost the depth test to the grass under them. Each depth-biased ground layer is now lifted by a few millimetres to centimetres (at most 6 cm) according to its offset. `liftLayers = false` restores the shipped behaviour for comparison. |
| `src/game/roadedges.ts` | Kerbs, gutters and sidewalks are no longer drawn along unpaved roads or inside car parks and plazas. |
| `src/game/Game.ts` | Trees and props on corrected hard surfaces are removed, along with their collision. Surfaces stream with the camera. |
| `tools/surfaces/audit.*` | A top-down orthographic render of every feature with trees and cars clipped out. It measures the colour mix (green, asphalt, concrete, cream, brown) under each feature, in shipped, lifted and corrected modes. |

## Classes and the evidence for each

| Class | Look | Source |
| --- | --- | --- |
| Asphalt road | existing campus road | OSM highway class. Untagged roads are assumed asphalt (962 roads) and 336 are tagged asphalt. Not redrawn. |
| Car park | grey asphalt | Master parking areas: 53 marked by the owner on imagery, 4 OSM-tagged and 74 from the OSM class alone. No bay markings were added, because no source shows them. |
| Car park, pavers | grey herringbone pavers | 4 from the owner's notes and 1 OSM `paving_stones`. |
| Plaza / forecourt | concrete slabs | Master plazas: 9 owner, 7 from the class. |
| Paver lane / walk | red-brown herringbone | OSM `surface=paving_stones/sett/bricks`: 24 lanes and 14 walks. |
| Earth | laterite | OSM `surface=ground/dirt/compacted/unpaved`: 61 ways. |
| Gravel | gravel | OSM `surface=gravel` (2). |
| Concrete lane / walk | concrete | OSM `surface=concrete` (4 lanes, 1 walk). |
| Asphalt walk | asphalt | OSM footways tagged asphalt (18). |
| Grass | existing lawn | Master lawns and pitches (38) and one grass-tagged path. |

ESA WorldCover land cover (330 polygons in the master) was not used to reclassify anything. At 10 m resolution it is
too coarse for paths and car parks.

## How much was corrected

The before figures come from the shipped game and the after figures from this build, both measured from directly
above (`tools/surfaces/audit-*.json`).

| | Shipped | After |
| --- | --- | --- |
| Car parks rendering ≥ 25 % green | 12 | 6 (all are owner decisions or conflicts, see below) |
| Plazas rendering ≥ 25 % green | 6 | 2 (the fountain lawns and the Games Arena, which are real lawns) |
| Tagged lines in the wrong material | 104 | 15 (each one explained in `classification.json`) |

- **Lines:** 89 lines went from the wrong material to the right one. 103 lines are now drawn by the game: 50 earth,
  19 paver lanes, 14 paver walks, 13 asphalt walks, 4 concrete lanes, 2 gravel and 1 grass.
- **Areas:** 7 areas are fixed by the depth fix (5 car parks, the Balme forecourt and the market plaza), and 5 car
  parks are redrawn as pavers.

Examples (share of green from above, shipped → after):

| Surface | Shipped | After |
| --- | --- | --- |
| Balme car park east | 0.97 | 0 |
| Balme car park east 2 | 0.95 | 0 |
| Balme forecourt | 0.82 | 0 |
| Market plaza | 1.0 | 0 |
| Car park 624028493 | 0.98 | 0.04 |

The Akuafo front car park changed from asphalt to pavers, and service lane 1222158828 changed from asphalt to brown
pavers.

Screenshots:

- `docs/surfaces/top-down-before-after.png`: top-down, shipped (left) and corrected (right).
- `docs/surfaces/oblique-before-after-1.png` and `-2.png`: the paver lane, paver walk, earth lane, asphalt walk,
  concrete lane, Balme car park and market plaza at rider height.

## Where the evidence is not enough

- **178 untagged footpaths.** OSM gives no surface for these, so they are left as rendered and listed with
  `conf: "unverified"`.
- **8 owner decisions needed.** Five areas at UPSA (1533364970/71/73/79/80) and the fountain surround (320067568)
  render green, but the imagery is ambiguous. Car park 702279064 may be earth. The Games Arena forecourt (765261443) is
  mostly lawn. None of these was changed, and each has a review note.
- **Conflicts.** Two earth streets (340246934, 340246848) lie under a coincident asphalt through-road, so the map and
  the OSM tags disagree. Footway 623722343 is tagged asphalt, but the owner's photos show grey pavers, so the photos
  were followed.
- **Explained misses.** Some lines still read wrong from above:
  - ways inside sites already modelled by the original (1051207413, 612788010, 614599367, 672764761, 787277212);
  - crossings that run under roads (1192435465/66, 607139873, 601042203);
  - paver ways the original already modelled in light tan.

## Tests and build

- `npx tsc --noEmit` passes. `BASE_PATH=/Playcanvas/ npm run build` builds (play chunk 732 KB, 247 KB gzip).
- iPhone 13 emulation of the production build: the world loads, the touch controls are present and there are no
  console errors.
- The scripted ride (menu, Explore, free ride, night, fly-over) of the road-edge build showed no runtime errors. Collision data is
  unchanged, apart from trees removed from corrected hard surfaces.
- Draw calls: the surfaces add at most one mesh per class per 256 m chunk in view. A typical view has a handful.

## Known inaccuracies that remain

- Untagged service roads and footpaths are assumed to be what the original drew.
- Car parks that already rendered correctly keep their original trees. Trees are removed only on surfaces this pass
  corrected.
- No car park bay markings are drawn, because there is no evidence for them.
- Where a widened main road meets a dual carriageway, the width transition leaves a small kink.
- Surface boundaries follow the OSM outlines, which can be several metres off the imagery.
