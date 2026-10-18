# Architecture

```
src/
  main.ts, ui/, tabs/, features/, state.ts, cloud.ts, live.ts, audio.ts, gamepad.ts   the original's UI and services, unchanged
  data/                         campus map, places, bikes, events (unchanged)
  engine/
    app.ts                      the PlayCanvas application: camera, sun with cascaded shadows, sky, image-based ambient, fog, ACES
    sky.ts                      the original's sky (gradient, haze, sun, tree line, clouds) painted into a cube map; SKIES
    campus.ts                   the streamed campus: tiles loaded round the camera, PlayCanvas meshes and instancing, LODs, day/night
    fetchz.ts                   fetch + gzip inflate
    lite3/                      the modelling kit: Three.js-shaped API over PlayCanvas entities, meshes and materials
  game/
    Game.ts                     the game (ported): rides, physics, camera, traffic, rivals, photo mode, garage camera
    models.ts, textures.ts, banners.ts      the original's procedural models and canvas textures, on the kit
    world.ts                    the route layer (lanes, gate, banners, labels, beacon, route trees and lamps)
    life.ts                     roads lookup, night switch, market closeness, route-side tree models
    collision.ts                the baked free-ride data (bike-height raster, solids, passages, earth, landmarks)
    tufts.ts, weatherfx.ts, shading.ts      grass tufts, rain, the original's shading tweaks as PlayCanvas chunks
    campusmap.ts, routes.ts, track.ts, relief.ts, cutplan.ts, *plan.ts      pure data and geometry (copied)
tools/
  export/                       the campus converter (runs the original's code headless, writes public/campus/)
  view/                         a free-camera viewer of the streamed campus (tools/view/view.html?cam=...)
  scenario.mjs, flow.mjs, smoke.mjs, shoot.mjs      headless checks and screenshots
public/campus/                  the converted campus
```

## Rendering

Everything drawn is PlayCanvas: `pc.Application`, entities with render components, `pc.StandardMaterial`, a
directional light with two shadow cascades, a skybox cube map and an environment atlas for ambient light. The
original's Three.js renderer is not used or wrapped; Three.js is not a dependency.

Lighting was calibrated against the original's renders (`CALIBRATION` in `app.ts`): Three.js light intensities are
divided by π for PlayCanvas's units, the hemisphere light and room environment become one image-based ambient cube
map, ACES tone mapping at the original's exposure. Three.js material colours (linear) are given to PlayCanvas in sRGB;
vertex colours stay linear. Polygon offsets become PlayCanvas depth biases.

## The streamed campus

`tools/export/export.ts` builds the original's campus exactly as the original does (its `world.ts`, landmarks and
every site module, read from the original checkout), then walks the scene graph:

- **materials**: colour, roughness, metalness, emissive, transparency, side, depth, blending, fog, tone mapping, the
  textures, and the original's shader tweaks (`onBeforeCompile` ground shade, weathering, grass macro, near-cut,
  triplanar concrete) captured and translated to PlayCanvas GLSL snippets; plus each material's night state
- **textures**: every canvas texture once (deduplicated by pixels) as WebP
- **geometry**: per 128 m tile, per material and level of detail: triangles welded, simplified within 6 mm
  (meshoptimizer, borders locked), positions quantised to 16 bits in the batch's box, normals 8 bits, colours 8 bits,
  UVs float; instanced meshes (tree crowns, trunks) as base geometry + per-instance matrices
- **gameplay data**: the original's bike-height collision raster, round solids, passages, earth tracks and landmark
  keep-outs, from the original's own functions

`campus.ts` loads the tiles within 420 m of the camera (nearest first, four at a time), drops them past 620 m, and
switches the crown levels of detail at the original's distances. Instanced batches are split by instance colour (the
default PlayCanvas instancing format carries matrices only) so trees keep the original's tints.

File format (`tiles/<i>_<j>.lrz`, gzip): `u32 json length | json head | padding | 4-aligned buffers`. The head lists
batches: `{k:'s', m, l, ro, v, i, i32, n, uv, uv1, c, box, o}` for triangle soups and `{k:'i', m, l, ro, n, g, box}` for
instanced batches (`o` and `g` give buffer offsets). `manifest.json` lists the tiles, materials, textures, shader
snippets and LOD ranges.

## The modelling kit (`engine/lite3`)

The original's models (rider and bike with every Garage option, cars, taxi, trotro, people, coins, obstacles, banners,
route trees, the Campus Life crowd and stage) are a few thousand lines of construction code. They are kept as they were
and run on a small kit with Three.js's names (`Mesh`, `Group`, `BoxGeometry`, `MeshStandardMaterial`, `Vector3`...):
geometry is built on the CPU as in Three.js, and each object is a `pc.Entity` whose transform, visibility and render
component are kept in step; each material is a `pc.StandardMaterial` updated when a property changes; textures are
`pc.Texture`s uploaded from their canvases; `InstancedMesh` is PlayCanvas hardware instancing; `Sprite` is a quad
turned to the camera each frame; `PerspectiveCamera` is the engine's camera (view offsets through a custom projection).
It is a modelling layer, not a renderer: it has no scene traversal, no draw loop and no shaders of its own.

## Game

`Game.ts` is the original's with the rendering parts replaced: the engine's `update` event drives `frame(dt)`, the game
asks PlayCanvas for a frame only when it has one to show (`autoRender` off), the campus streams round the camera each
frame, the time of day sets the engine's sky and lights and the campus's night state, and `capture()` renders and reads
the canvas in the same task. Its public API (used by `main.ts` and the features) is unchanged.
