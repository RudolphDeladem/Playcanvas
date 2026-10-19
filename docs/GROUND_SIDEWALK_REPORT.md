# Ground, sidewalk and vegetation correction report (2026-10-19)

The owner's "Full-Campus Ground, Road, Sidewalk & Vegetation Correction Specification" (three in-game screenshots and
a zone-by-zone audit), and their message of the same day: "still on the ground the correction not done ...in the map
use satellite option ...differentiate the various type of grounds". PlayCanvas project only; the original
(legonrush-world) is read, never changed, and the campus's coordinate frame is unchanged.

## 1. Root causes of the three screenshots

### Screenshot 1: bushes on the asphalt

The rounded bushes are the clipped shrubs of the Dr. J.B. Danquah Avenue median (shrubs.ts, roadedges.ts
`medianHedges`). Their spots were tested against the median's own distance field only (inside an island, clear of a
footpath crossing). The asphalt actually drawn is a different field: the main roads' smooth union, whose rounded
junction corners reach into the median where a road crosses it, and side roads crossing at a slant. So at junctions a
shrub could stand on drawn asphalt. 44 of the 606 shrubs did (at x 245-253, -18 to -12, 26-31, 223-228, 655-680 by
z 126-129, and 6.5-7.6 by z 146-151).

Fix: a shrub stands only 1.2 m clear of the main roads' drawn asphalt and of side roads, and 0.9 m clear of footpaths
(a shrub is 0.62 m round). 562 shrubs remain.

The same check now covers every plant in the game (vegrules.ts). A bush or plant up to 3 m tall is tested at its foot
and at eight points round it at its own radius (up to 1.5 m, from its mesh). A tree is tested at its trunk and half a
metre round, since a crown may overhang a road as street trees do. The test is against:

- the map's roads and footpaths at their drawn width;
- the sidewalks and kerbs;
- the corrected car parks, plazas and paths;
- the map's car parks, plazas and pitches;
- the paving read off the satellite picture (section 3).

The decision is taken when a tile's plants are built, so a plant cannot come back when a chunk reloads.

### Screenshot 2: the sidewalk that seemed to follow the rider

The sidewalks are static: one mesh a 128 m tile, built once within 280 m of the camera and kept until 420 m away, in
world coordinates and parented to the scene (not to the rider, the bike or the camera). The campus's levels of detail
switch only tree crowns. The screenshot was taken in the rain, and the rain's puddles were the cause (weatherfx.ts):

- A pool of 48 dark, mirror-like puddle patches is moved onto the roads round the camera as the rider goes.
- The patches were laid 2 cm over the ground, while the main roads' asphalt is drawn 7 cm over it, the sidewalk 12 cm
  and the kerb 20 cm. They were drawn with a strong depth bias (-8, -16) to show anyway.
- A depth bias covers more distance the further away the surface is. So a patch showed through the road edge, the
  kerb and the sidewalk from a distance, and sank back under them close up: a dark band along the sidewalk ahead
  that moved with the rider.
- The patches, up to 3 m across, were placed up to the road's edge, over the kerb and the sidewalk.

Fix:

- Each puddle lies just over the road's own top (7.8 cm on the main roads, 5.8 cm on the original's roads) with a
  slight depth bias (-1, -2).
- Each puddle is placed wholly on the asphalt, 0.3 m short of the edge.
- No puddle goes where a sidewalk, a kerb or a median island is drawn under any part of it.

Checked on a rainy Explore ride from the Balme Library, before and after (tools/rainride.mjs). The stretch of
screenshot 2 (the zebra crossing by the stone wall) is the last pair.

### Screenshot 3: sidewalks stopping at junctions

A sidewalk and its white kerb were drawn only where the nearest road edge was a sidewalked side of a main road.
Where a road without a sidewalk joins, the rounded asphalt corner between them is nearer that road. So the kerb and
the sidewalk stopped where its flare began, on a diagonal, leaving bare asphalt against the grass at the corner (both
marks in the screenshot).

Fix: the kerb and the sidewalk are measured from the asphalt's edge as drawn and carry on round the corner, up to
4 m into the joining road, then end. A corner is wrapped only from a sidewalk that is drawn within 4.5 m, so no stub
of sidewalk appears where a wall or a site's own paving suppresses it.

An island between roads (asphalt on both sides along two axes within 16 m: a roundabout's island, a median's end
where a road crosses it) now gets its white kerb all round and no sidewalk. Before, it had broken pieces of both.

## 2. Road widths and the 1.5 factor

The factor was `WIDEN = 1.5` in roadedges.ts (commit 7cfaa7f, 2026-10-18), applied to every main road's half-width,
for the owner's "too thin for 2 cars". It was removed on the owner's instruction "everything should use the map as
reference" (commit 7595665). The main roads are drawn at the map's widths by class (life.ts `ROAD_WIDTH`: 9, 7.4, 6.2,
4.6 and 2.6 m), with no multiplier.

The only other widening in the code is the original's own, the N4's dual carriageway past the main gate (lbplan.ts
`WIDEN`, z 905 to 1640), which is real. Centre lines and positions are the map's, and no building moved.

## 3. Ground types from the satellite picture

- **Source:** Esri World Imagery (zoom 18, about 0.6 m a pixel), taken in the rainy season. It separates grass, bare
  laterite and paving much better than the Google imagery, which is a dry-season picture where everything is brown.
  The tiles are resampled north up at 0.5 m a pixel in the game's frame (tools/satellite/mosaic.py) over x -850 to
  1200, z -1800 to 1600. The imagery stays outside the repository: it is a reference only and nothing of it ships.
- **Alignment:** checked against the map's building footprints and roads at Pent, TF and the Legon Hall area. The
  error is a metre or two.
- **Classification** (tools/satellite/classify.py), a metre a cell:
  - bare earth is the orange-red laterite (hue under 42 degrees, saturated, not green);
  - paving is beige-grey with little colour and light.
  - Dark grey is not used: on the picture it is mostly shadow (a stand's, a wall's, a tree's), and the real asphalt is
    the roads, which are drawn already.
  - Specks are cleaned away (earth patches under 120 m², paving under 120 m²), and holes up to 150 m² (a car, a
    shadow) are filled.
- **Only grass is converted.** A straight-down render of the original's campus over the whole frame
  (tools/satellite/gameground.py, 40 renders at 0.46 m a pixel) gives where the game draws grass. Only there does the
  satellite's earth or paving replace it, so the original's own car parks, courtyards and paved sites keep their
  look.
- **Also left out:**
  - buildings, with 5 m round them for earth (roof tiles are the laterite's colour and reach past the mapped
    footprints);
  - the map's roads at their width plus a metre;
  - water, pitches, tracks and the map's car parks and plazas;
  - everything surfaces.json draws or the owner decided;
  - everything waiting on the owner's decision (UPSA's compound, the fountain and the other OWNER The review sheet (tools/satellite/review.py, sent to the owner) marks each place on a zoomed satellite crop and on the
game now.

- **A.** A large hatched structure north-west of the Legon Hall area (about x -120, z 485). The game has open grass
  there, and the satellite reads earth and grey. What is it (shade houses, a yard), and should the game show it?
- **B.** Commonwealth Hall's central courtyard. The satellite reads paving between lawn squares, and the game now lays
  paving patches where it had lawn. Paved courtyard with lawn squares, or lawn?
- **C.** The town east of the N4 by the main gate. Roofs the map leaves out read as paving, so its ground is left
  unclassified. Leave it as it is?
- **D.** Woodland east of the N4 (zone 4). The satellite shows trees and bare earth; the game has lawn with the earth
  now drawn, but no trees. Plant trees there? The original has none, and trees are not invented without the owner's
  word.
- **Still open from before** (docs/surfaces/review-sheet.png): UPSA's compound, the fountain, 702279064 and the
  others. The satellite layer leaves them as they are. items);
  - the town east of the N4 by the main gate, where corrugated roofs the map leaves out read as paving.
- **In the game:** satground.ts loads the class map (public/geo/ground-classes.png, 2050 x 3400 cells) and draws each
  class as a ground layer with smooth edges (marching squares on the cells). It uses surfaces.ts's looks: the
  laterite earth, and the car parks' concrete for paving. The layer follows the relief and is left out where a site
  of the original models its own ground. Satellite paving counts as hard ground for the plants.

## 4. Zones

The campus is divided into the 30 numbered aerial views (docs/aerials). They are a 4 x 6 grid over the main campus,
x -700 to 1000 and z -510 to 910, and six places outside it: New Pent, Evandy, Bani, TF, UPSA and the N4 at the main
gate.

Each zone has a sheet with four panels of the same frame, north up (tools/satellite/zones.py). The sheets carry
satellite imagery, so they were sent to the owner and are not kept in the repository:

- the satellite picture;
- the ground types read off it;
- the game before this round;
- the game after it.

Every sheet was inspected. A zone is marked passed when its earth and paving match the satellite picture as far as
the classification can read it, nothing is drawn over the original's own paving, and no sidewalk, kerb or plant fault
shows. In all, 41.5 ha of earth and 6.4 ha of paving were added where the game had lawn: 682 earth and 287 paving
patches before cleaning.

| Zone | Place | Earth added (ha) | Paving added (ha) | Inspected | Result |
|---|---|---|---|---|---|
| 1 | grid row 1, column 1 | 0.39 | 0.10 | satellite, before, after (zone sheet 01.jpg) | passed: open field west: the satellite's bare ground drawn where the game had lawn |
| 2 | grid row 1, column 2 | 0.11 | 0.03 | satellite, before, after (zone sheet 02.jpg) | passed: little bare ground; a few patches by the buildings |
| 3 | grid row 1, column 3 | 0.28 | 0.06 | satellite, before, after (zone sheet 03.jpg) | passed: paving by the buildings to the south-west, earth by the round building to the east |
| 4 | grid row 1, column 4 | 1.38 | 0.08 | satellite, before, after (zone sheet 04.jpg) | passed, review D: bare earth east of the N4 drawn; the woodland there has no trees in the game (review D) |
| 5 | grid row 2, column 1 | 0.21 | 0.08 | satellite, before, after (zone sheet 05.jpg) | passed: paving round the halls to the north-west; the earth track along the forest is a mapped path |
| 6 | grid row 2, column 2 | 0.08 | 0.06 | satellite, before, after (zone sheet 06.jpg) | passed: earth paths and patches south of the centre |
| 7 | grid row 2, column 3 | 0.19 | 0.03 | satellite, before, after (zone sheet 07.jpg) | passed: earth paths between the halls |
| 8 | grid row 2, column 4 | 0.39 | 0.22 | satellite, before, after (zone sheet 08.jpg) | passed: the big car park is the original's own and is left; earth beside the N4 and paving by the houses |
| 9 | grid row 3, column 1 | 0.03 | 0.14 | satellite, before, after (zone sheet 09.jpg) | passed, review B: Commonwealth Hall's courtyard paved from the satellite (review B) |
| 10 | grid row 3, column 2 | 0.05 | 0.09 | satellite, before, after (zone sheet 10.jpg) | passed: little change |
| 11 | grid row 3, column 3 | 0.12 | 0.09 | satellite, before, after (zone sheet 11.jpg) | passed: the Great Hall's courtyard is the original's own and is left; earth patches to the north-east |
| 12 | grid row 3, column 4 | 0.51 | 0.00 | satellite, before, after (zone sheet 12.jpg) | passed: bare earth round the buildings east of the N4 |
| 13 | grid row 4, column 1 | 0.27 | 0.01 | satellite, before, after (zone sheet 13.jpg) | passed: small bare patches in the residential lawns |
| 14 | grid row 4, column 2 | 0.14 | 0.11 | satellite, before, after (zone sheet 14.jpg) | passed: earth by the sports fields; paving to the north-west |
| 15 | grid row 4, column 3 | 0.69 | 0.05 | satellite, before, after (zone sheet 15.jpg) | passed: the red-earth construction site drawn |
| 16 | grid row 4, column 4 | 0.57 | 0.12 | satellite, before, after (zone sheet 16.jpg) | passed: earth patches in the field east of the N4 |
| 17 | grid row 5, column 1 | 0.11 | 0.00 | satellite, before, after (zone sheet 17.jpg) | passed: small bare patches in the residential lawns |
| 18 | grid row 5, column 2 | 0.19 | 0.09 | satellite, before, after (zone sheet 18.jpg) | passed, review A: earth paths; a hatched structure to the north-west is in question (review A) |
| 19 | grid row 5, column 3 | 0.34 | 0.02 | satellite, before, after (zone sheet 19.jpg) | passed: bare ground by the woods and the playing field |
| 20 | grid row 5, column 4 | 0.76 | 0.07 | satellite, before, after (zone sheet 20.jpg) | passed: red earth and a paved yard south-west |
| 21 | grid row 6, column 1 | 0.04 | 0.00 | satellite, before, after (zone sheet 21.jpg) | passed: almost no change |
| 22 | grid row 6, column 2 | 0.22 | 0.03 | satellite, before, after (zone sheet 22.jpg) | passed: earth paths across the lawns |
| 23 | grid row 6, column 3 | 1.22 | 0.01 | satellite, before, after (zone sheet 23.jpg) | passed: earth round the stadium pitch (its stands' shadows are not read as asphalt) |
| 24 | grid row 6, column 4 | 1.65 | 0.00 | satellite, before, after (zone sheet 24.jpg) | passed: earth round the field and in the construction yard |
| 25 | New Pent | 0.26 | 0.02 | satellite, before, after (zone sheet 25.jpg) | passed: New Pent: earth by the roads and the north-east slope; car parks are the original's |
| 26 | Evandy | 0.65 | 0.00 | satellite, before, after (zone sheet 26.jpg) | passed: Evandy: earth patches south and east |
| 27 | Bani | 0.79 | 0.00 | satellite, before, after (zone sheet 27.jpg) | passed: Bani: bare yards round the buildings |
| 28 | TF Hostel | 1.03 | 0.42 | satellite, before, after (zone sheet 28.jpg) | passed: TF: bare ground in the scrub; the paved yard north-east |
| 29 | UPSA | 0.50 | 0.28 | satellite, before, after (zone sheet 29.jpg) | passed, waits on UPSA decision: UPSA's compound waits on the owner's decision and is left; earth along the N4 |
| 30 | N4 at the main gate | 0.25 | 0.05 | satellite, before, after (zone sheet 30.jpg) | passed, review C: the town east of the N4 is not classified (review C); the open ground west of it drawn |

**Not inspected by eye:** the ground outside these 30 frames, which is mostly the woods and open land at the frame's
edges. It is classified by the same rules, but no one has looked at it there.

## 5. Needs the owner's decision

The review sheet (tools/satellite/review.py, sent to the owner) marks each place on a zoomed satellite crop and on the
game now.

- **A.** A large hatched structure north-west of the Legon Hall area (about x -120, z 485). The game has open grass
  there, and the satellite reads earth and grey. What is it (shade houses, a yard), and should the game show it?
- **B.** Commonwealth Hall's central courtyard. The satellite reads paving between lawn squares, and the game now lays
  paving patches where it had lawn. Paved courtyard with lawn squares, or lawn?
- **C.** The town east of the N4 by the main gate. Roofs the map leaves out read as paving, so its ground is left
  unclassified. Leave it as it is?
- **D.** Woodland east of the N4 (zone 4). The satellite shows trees and bare earth; the game has lawn with the earth
  now drawn, but no trees. Plant trees there? The original has none, and trees are not invented without the owner's
  word.
- **Still open from before** (docs/surfaces/review-sheet.png): UPSA's compound, the fountain, 702279064 and the
  others. The satellite layer leaves them as they are.

## 6. Tests, build and performance

- **Typecheck and production build:** pass (`tsc`, `BASE_PATH=/Playcanvas/ npm run build`).
  - The class map, public/geo/ground-classes.png (104 kB), is fetched at the start and cached for offline play once
    fetched.
- **iPhone emulation** (tools/iphone.mjs) on the production build: ready, touch controls present.
- **Scripted session** (tools/scenario.mjs: menu, an Explore ride, free ride, night, fly-over): no console errors.
  - The Explore ride runs.
  - The free-ride step did not get 25 m from its start within its 600 s. Its path is the same as in the runs before
    this round (it bumps at x -26.5, z 100 by the Balme Library and creeps back), and in those runs it passed only
    just inside the limit. So this round did not cause it, but it is a failed check, not a pass.
- **Rainy ride before and after** (tools/rainride.mjs): puddles stay on the asphalt.
- **Junction and island renders before and after**, and the median shrubs before and after: 606 shrubs before, 562
  after, and none left on asphalt.
- **Performance:**
  - The satellite layer is 384,000 triangles over the whole frame, in 126 chunks of 256 m, shown within 520 m of the
    camera.
  - Building it takes about 1.6 s of the CPU in the headless check. It is built 64 rows at a time between frames, so
    the start does not stall.
  - The sidewalk tiles do a little more work per cell near junctions (the corner wrap and the island test); no change
    to what is drawn elsewhere.

## 7. Known inaccuracies that remain

- The satellite classes are read by colour. Paving shows as rounded patches, not the straight edges of a real car
  park, and an earth patch's edge is accurate to a metre or two.
- Under tree canopies the ground cannot be seen. It stays as the game draws it.
- Woods the picture shows have no trees in the game where the original planted none (east of the N4 in zone 4, round
  TF in zone 28). Trees are not invented.
- Where the original models a site's own ground (excludedAll), nothing here changes it.
- The sidewalk wrap round a corner ends on a curve 4 m into the joining road, not on a mapped kerb line. The map
  draws no kerbs.
