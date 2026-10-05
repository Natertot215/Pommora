## Matrix

The Matrix view: a Nexus's Pages, Folders, and Spaces drawn as nodes on a canvas, their
connections and containment as links, laid out by a force simulation this package owns.
`Engine/` holds the physics, the lens, and the label policy, and reaches no browser global,
no store, and no React; everything above it consumes the engine and none of it changes the
engine.

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
| `Engine/simulation.ts` | The tick, sleep by energy, local wake, the drag spring, Shuffle |
| `Engine/placement.ts` | Seating a node the layout has never carried, on a spiral outside the extent |
| `Engine/viewport.ts` | The lens, its pan and zoom, the zoom clamps, world ↔ screen, and the fit |
| `Engine/labels.ts` | How far each kind is through its zoom reveal, and culling titles to one per cell |
| `Engine/engine.test.ts` | The isolation gate: the engine's import graph and its DOM sweep |
| `Engine/scale.test.ts` | The bench: a synthetic Nexus ticked against a budget |
| `matrixRuntime.ts` | The simulation's one owner — the frame loop, the rebuild guard, the stages, the fade, the layout and lens writes |
| `matrixInput.ts` | The tree walk into a `GraphInput`, and what the filter leaves visible |
| `matrixGraph.ts` | The index read behind `matrix:graph` and the shape of its reply |
| `matrixConfig.ts` | The four sections and their patch |
| `matrixFile.ts`, `handlers.ts` | `.nexus/interface/matrix.json`, its per-key merge, and the channels over it |
| `matrixLayout.ts` | The machine-local positions and lens, and the readers that validate them |
| `matrixKind.ts` | The selection kind, its title, its icon, and a node's record shape |
| `MatrixView.tsx` | What the surface is told: the label's node, the menu, the tap, the drag, and a locked node's carry to the tab strips |
| `MatrixCanvas.tsx` | The canvas, its sizing and observers, the pointer gates |
| `matrixPaint.ts` | The paint read from the kit's tokens, and each frame's links, nodes, glyphs, and titles |
| `MatrixLabel.tsx` | The one overlay: the anchor, the title, the trail, the rename, the picker, the glance |
| `MatrixMenu.tsx` | The pane the toolbar's Settings button shows for a Matrix surface |
| `MatrixWindow.tsx` | The Matrix as a kind of the one floating window slot |
| `matrix.css.ts` | The package's styles |
| `iconCache.ts` | Node glyph images, one per icon and colour at every zoom, for the draw path |
| `useMatrixRuntime.ts` | The runtime's two subscriptions into React |

`handlers.ts`, `matrixFile.ts`, and `matrixGraph.ts` run in the host, and `matrixConfig.ts` and
`matrixLayout.ts` are shared by the host and the interface.
