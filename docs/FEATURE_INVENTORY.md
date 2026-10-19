# LEGONRUSH: feature inventory and recreation status (Stage A)

The original is `RudolphDeladem/legonrush-world` at `b91e9d0` (Three.js r186, Vite 8, TypeScript, Supabase, PWA). It was
read only; nothing in it was changed. This inventory comes from its source (`src/`), its handover documents
(`docs/migration/*`, `docs/handover/*`) and running it side by side with this project.

Labels: **[VERIFIED]** checked in code and/or run here · **[PARTIAL]** works with a stated difference · **[NOT DONE]**
not recreated yet · **[ORIGINAL: …]** status in the original itself (copied from its own documents).

## How the original is built, and what was recreated how

| Layer | Original | Here |
|---|---|---|
| UI, menus, tabs, social, events, garage screens, map, money UI | DOM + CSS, engine independent (`src/ui`, `src/tabs`, `src/features`, `src/main.ts`) | **copied unchanged** (one exception: `features/life/world.ts`, ported to the modelling kit) |
| Data: campus map, places, routes, tracks, rivals, plan modules | pure TypeScript (`src/data`, `src/game/*plan.ts`, `routes.ts`, `track.ts`, `campusmap.ts`, `relief.ts`) | **copied** (`relief.ts` trimmed of its Three.js part) |
| Supabase (auth, profiles, cloud saves, leaderboards, live channels) and `supabase/` | `src/cloud.ts`, `src/live.ts`, `supabase/schema.sql`, Edge Functions | **copied**; same project, publishable key only; a staging project can be set with `VITE_SUPABASE_REF` / `VITE_SUPABASE_KEY` |
| PWA | vite-plugin-pwa | same plugin; the campus tiles cached on demand (CacheFirst), not precached |
| Renderer, scene, sky, lights, fog, tone mapping | Three.js WebGLRenderer, sky shader, sun + hemisphere + room environment, ACES | **PlayCanvas** application (`src/engine/app.ts`): cascaded-shadow sun, sky painted into a cube map (`sky.ts`, a CPU port of the sky shader) used as skybox and as image-based ambient, ACES tone mapping (`TONEMAP_ACES2`), linear fog; calibrated against the original's renders |
| The campus (≈7,400 meshes, 20 M triangles, 1,143 textures, built procedurally at load in 40–50 s) | `world.ts` + ~150 site modules, built on the device at start | **converted once** by `tools/export` (the original's own code run headless, its scene graph read and written as 1,912 tiles of 128 m: welded, simplified within 6 mm, quantised, gzipped; 1,054 textures as WebP) and **streamed** round the camera by `src/engine/campus.ts` (PlayCanvas meshes, hardware instancing for trees, the original's LODs, day/night material states, the original's shader tweaks translated to PlayCanvas chunks) |
| Models: rider, bikes (Garage styles), cars, taxi, trotro, people, coins, obstacles, banners, route trees, Campus Life crowds | Three.js geometry built in code | **the same construction code** on a small PlayCanvas-native modelling kit (`src/engine/lite3`): every object a `pc.Entity`, every mesh a render component, every material a `pc.StandardMaterial` |
| Game loop, physics, camera, rides | `src/game/Game.ts` | **ported** (`src/game/Game.ts`): same logic, numbers and public API; rendering, streaming and lighting are PlayCanvas |
| Free-ride collision | `meshcollide.ts` rasterised the drawn meshes at bike height at run time; `solids.ts` gathered trunks as models were built | **baked by the converter** from the original's own functions: `collision.lrz` (identical raster), `solids.lrz`, `passages.json`, `earth.lrz`, `landmark.lrz` (`src/game/collision.ts`) |

Kenney Car Kit: **not used by the original** (no file, import, document or commit mentions it). Its vehicles are its
own procedural models (`models.ts` `vehicle`, `taxi`, `trotro`; parked cars in the campus). They are kept as they are;
nothing was invented.

## Riding and world

| Feature | Original | Here |
|---|---|---|
| Real campus: roads, paths, ~1,600 footprints, places, Pent and every reconstructed site (164 batches) | [ORIGINAL: VERIFIED] | [VERIFIED] converted; screenshots match (see REPORT.md) |
| Relief (cut, decks, stairs, hollows) | [ORIGINAL: VERIFIED] | [VERIFIED] baked into the tiles; the bike and camera use the same `relief.ts` |
| Races: lanes, jumps, ramps, bumps, puddles, obstacles, coins, boost, stamina, rhythm, draft, helmets, repair kits, brakes, upgrades, difficulty | [ORIGINAL: VERIFIED] | [VERIFIED] ported logic; tutorial ride runs (HUD, tips, countdown, riding) |
| Rivals: ghost, friends' runs, live riders, bots | [ORIGINAL: VERIFIED] | [PARTIAL] ported; ghosts' see-through material ported; not exercised in a test run |
| Explore: route, guided ride with stops, arrival card, drone view, "Ride it yourself" (free ride) | [ORIGINAL: VERIFIED] | [VERIFIED] ported, Balme Library → Great Hall ridden in a test; **no ground route line in Explore** (the route's own road surface, edge lines, dashes and pavements are drawn for races only: DECISION from the recreation brief) |
| Free ride with collisions (walls, trunks, fences, outlines, water, stairs, passages, decks) | [ORIGINAL: VERIFIED] | [VERIFIED] same rules on the baked rasters: identical answers to the original on 3,000 sampled points; rode and stopped at a trunk in a test; a site-by-site ride test is still to do |
| Camera views (chase, far, close, fly-over), look stick, look behind, camera kept out of buildings, garage camera, photo mode, cinematic | [ORIGINAL: VERIFIED] | [VERIFIED] ported (garage view offset done with a custom projection) |
| Time of day (day, sunset, night: lamps, lit windows, headlight) | [ORIGINAL: VERIFIED] | [PARTIAL] sky, light, fog, exposure, lamp and window states switch; the sky's slow cloud drift is not animated (painted once per time of day) |
| Weather: rain (off by default) | [ORIGINAL: VERIFIED] | [PARTIAL] streaks, puddles, wet roads, fog and light dimming; the sky does not grey (cube map) |
| Grass tufts and flowers round the camera | [ORIGINAL: VERIFIED] | [VERIFIED] ported (one tint per batch: PlayCanvas default instancing has no instance colour) |
| Walkers on the pavements, traffic that brakes, honks and gives way | [ORIGINAL: VERIFIED] | [VERIFIED] ported |
| Campus Life hangouts (crowds, venues, stage, selfies) | [ORIGINAL: VERIFIED] | [PARTIAL] ported to the kit; instance colours of the light crowd are not drawn (one tint); not exercised in a test run |
| Logarithmic depth / flicker fixes | Three.js specific | not needed in the same form: polygon offsets carried as PlayCanvas depth biases |

## Controls, UI, social, economy

| Feature | Original | Here |
|---|---|---|
| Keyboard, touch, gamepad (remapping, dead zones, rumble) | [ORIGINAL: VERIFIED; gamepad simulated only] | [VERIFIED] copied unchanged (input is DOM, not engine) |
| Menus, tabs, map, garage, missions, achievements, challenges, events, community, live channels | [ORIGINAL: VERIFIED present] | copied unchanged; they drive the ported Game through the same API |
| Accounts, cloud saves, leaderboards (Supabase) | [ORIGINAL: VERIFIED present] | copied; guests never load the Supabase library; no backend data or configuration was changed |
| Paystack coins, prize race, wallet | [ORIGINAL: INCOMPLETE, switched off] | same (off) |
| Football and tennis games | [ORIGINAL: NOT implemented, DECISION: separate] | not implemented |
| 10,000+ concurrent players | [ORIGINAL: target only] | target only |

## Corrections in this version (not in the original)

**2026-10-19, synchronised with the original (`dc022c1`) and held to the map's evidence**: the campus reconverted with the original's Pent, Evandy, TF and Bani work; roads back at the map's widths; sidewalks with white stone kerbs along the named main roads and no gutters or drains; the grass tufts gone, no trees on hard ground, shrubs for the Balme Library's tree groves and crowded trees thinned; double-sided ground and roofs lit as in the original. See [`SURFACES_REPORT.md`](SURFACES_REPORT.md).

**2026-10-19, the owner's ground and sidewalk specification**: bare earth and paving read off the satellite picture where the game had lawn; sidewalks and white kerbs turn junction corners, and islands between roads get a kerb; no plant on hard ground, tested on its footprint; the rain's puddles stay on the asphalt (they had shown through the kerbs and sidewalks from afar). See [`GROUND_SIDEWALK_REPORT.md`](GROUND_SIDEWALK_REPORT.md).

**2026-10-19, ground surfaces**: the campus's mapped ground is classified from the evidence (car parks, pavers, earth, gravel, concrete, plazas, lawns), and the car parks that rendered as grass and the paver lanes that rendered as asphalt are corrected. See [`SURFACES_REPORT.md`](SURFACES_REPORT.md).

**2026-10-18, the owner's road corrections** (photos of campus roads and sidewalks) — `src/game/roadedges.ts`:

- **Roads**: the main roads (classes 0–2) are 1.5 times as wide as the map has them (the owner: "too thin for 2
  cars"): at least 5.85 m each side of the centre line. Smooth asphalt with rounded corners where roads meet and
  rounded joins where a road bends; a dashed white centre line kept clear of junctions; the campus's old, narrower
  road and its markings are covered. No grass reaches the road: the asphalt runs up to the gutter.
- **Sidewalks**: along both sides of every main road, from the road out — a concrete lip (0.18 m), an open gutter
  (0.6 m), a white stone kerb a little above the sidewalk (0.18 m), a sidewalk of grey concrete pavers in herringbone
  (2 m), a concrete edging. Where a service lane or a hall's road joins, the sidewalk opens; where a footpath meets
  the road, the gutter is paved over. The sidewalk follows corners round junctions.
- **Not drawn**: on roads into halls (unnamed roads within 90 m of a hall: Pent, Evandy and the others), on service
  lanes (neither widened), where a site models its own edges (Okponglo, IPS Road, the J.J. Rawlings yard and the other
  `ownsEdges` sites), on the NSIA Road's and the Kuffour Quadrangle's plain stretches, on earth and brick roads, in the
  Legon Road cutting, on stairs, and through buildings or walls.
- **Trees** of the converted campus that would stand in the widened roads or their sidewalks are left out (and their
  trunks from the free ride's collision).
- **Races** keep their route road but no longer draw their own concrete pavements, edge lines or lane dashes (the
  roads have their own now). Walkers walk on the sidewalks; a free-ridden bike rides over the roads and sidewalks.
- **Grass tufts** removed from the whole game.
- **Cost**: built round the camera at run time (about 10 ms a 64 m piece, a few milliseconds a frame), merged into
  128 m tiles of one mesh a material: about 6 draw calls a tile, some 15–25 tiles in view.
