## Matrix

The graph view: a Nexus's Pages, Folders, and Spaces drawn as nodes on a canvas, their
connections and containment as links, laid out by a force simulation this package owns.
`Engine/` is the physics and reaches no browser global, no store, and no React; everything
above it consumes the engine and none of it changes the engine.

#### Provenance

Built after studying **d3-force**, **d3-quadtree**, **ngraph.forcelayout**,
**vasturiano/force-graph**, **sigma.js**, and **cosmos** for their patterns — velocity
Verlet integration, Barnes–Hut approximation, link-distance normalisation by degree,
quadtree hit-testing — and then written from scratch. The tuning constants and the Barnes–Hut terms follow
d3-force's published defaults, and **no code was copied from any of them**. Two requirements
drove the loop's own shape rather than a library's:

- **Sleep by energy, not by alpha alone.** A settled picture must cost nothing, so the tick
  measures energy per *moving* node and stops. A fixed alpha decay keeps spending frames on
  a graph that has already come to rest.
- **A local reheat.** A Page created elsewhere joins among the nodes it already links to
  while the rest of the picture holds still, which needs the moving set to be a first-class
  input to the wake rather than a global alpha bump.

#### Module Map

| File | What it owns |
| --- | --- |
| `Engine/graph.ts` | Nodes, the five link kinds, the three Group modes, degree, members, radius |
| `Engine/forces.ts` | The force KNOBs, `radiusOf`, gravity, spread, link springs, collision |
| `Engine/quadtree.ts` | The Barnes–Hut tree, built per tick, and the hit test behind it |
| `Engine/simulation.ts` | The tick, sleep by energy, local wake, the drag and return spring, Shuffle |
| `Engine/placement.ts` | Seating a node the layout has never carried, on a spiral outside the extent |
| `Engine/viewport.ts` | Pan, zoom, the zoom clamps, world ↔ screen, and the fit |
| `Engine/labels.ts` | Culling titles to one per cell, largest node winning |
| `Engine/engine.test.ts` | The isolation gate: the engine's import graph and its DOM sweep |
| `Engine/scale.test.ts` | The bench: a synthetic Nexus ticked against a budget |
| `matrixRuntime.ts` | The simulation's one owner — the frame loop, the rebuild guard, the stage, the fade, the layout and viewport writes |
| `matrixInput.ts` | The tree walk into a `GraphInput`, and what the filter leaves visible |
| `matrixGraph.ts` | The index read behind `matrix:graph` and the shape of its reply |
| `matrixConfig.ts` | The four sections, their patch, and the section merge |
| `matrixFile.ts`, `handlers.ts` | `.nexus/matrix.json`, its per-key merge, and the channels over it |
| `matrixLayout.ts` | The machine-local positions and viewport, and the readers that validate them |
| `matrixKind.ts` | The selection kind, its title, its icon, and a node's record shape |
| `MatrixView.tsx` | What the surface is told: the label's node, the menu, the tap, the drag |
| `MatrixCanvas.tsx` | The canvas, its paint read from host-scoped tokens, the pointer gates |
| `MatrixLabel.tsx` | The one overlay: the anchor, the title, the trail, the rename, the picker, the glance |
| `MatrixMenu.tsx` | The pane the toolbar's Settings button shows for a Matrix surface |
| `MatrixWindow.tsx` | The Matrix as a kind of the one floating window slot |
| `matrix.css.ts` | The package's styles and the `--matrix-*` aliases the canvas reads |
| `iconCache.ts` | Node glyphs rasterised once per colour and scale, for the draw path |
| `useMatrixRuntime.ts` | The runtime's two subscriptions into React |
