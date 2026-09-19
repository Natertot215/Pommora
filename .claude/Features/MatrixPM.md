## The Matrix

The graph view. A Nexus's relationships live in an index that every other surface reads as paths; the Matrix reads the rows themselves and draws them — Pages, Folders, and Spaces as nodes, their connections and containment as links, laid out by a force simulation Pommora owns. It opens from the ribbon's first icon into a tab, or into a floating window under **Open Matrix In**, and both surfaces draw one simulation.

### The Model

A node is a Page, a Folder, or a Space; a link is one of five kinds — body, citation, and frontmatter for content ↔ content, space for a Space relation, and location for containment. **Groups** chooses which of them the picture carries:

- **Connection** draws Pages alone, linked by what they cite and mention.
- **Location** adds each Folder as a node and links every Page to the one that holds it.
- **Space** adds each Space and links every Page that tags it, alongside Space ↔ Space relations.

A node's size follows its weight: a Page grows with the connections that land on it, a Folder or Space with the members it holds, each clamped to a ceiling. **Unlinked Items** decides whether nodes with nothing attached appear at all.

### The Engine

`Core/Matrix/Engine/` is the physics, and it reaches no browser global and no store — graph building, forces, a quadtree, placement, the viewport, and label culling, each with its own tests.

- **The loop** integrates gravity toward the centre, charge-based spread through a Barnes–Hut quadtree, per-kind link springs, and collision, then sleeps by energy rather than by a fixed tick budget, so a settled picture costs nothing.
- **A local wake** moves only what changed: a Page created elsewhere joins at its Folder's centroid while the rest of the picture holds still.
- **Placement** seats a node the layout has never seen on a spiral outside the current extent, so a first open and a growing Nexus both open without overlap.
- **Four multipliers** — Gravity, Spread, Strength, and Distance — scale the forces from the menu's **Link Forces** rows, and every other feel number is a constant in the engine rather than a setting.

### The Surface

The picture is drawn on a `<canvas>`, the repository's first, with one DOM overlay following the node under the pointer. Paint is aliased onto host-scoped `--matrix-*` custom properties and read once through a probe and the host's computed style, so the canvas takes the same tokens the DOM does. The overlay carries the node's icon, title, and location trail, and is where the inline rename field, the icon picker, and the Shift-preview open.

Hovering a node lights its links and dims the rest; dragging one pulls it toward the pointer through its springs, and releasing it lets the same spring carry it back to where it began. **Lock** holds the layout still, **Shuffle** jitters every node and releases it, and **Hide Icons** and **Hide Paths** trim the overlay. A right-click answers as a sidebar row does, and a Page moved in Location mode fades out where it was and in beside its new Folder.

### What Persists

The Matrix's choices travel with the Nexus in `.nexus/matrix.json`, written in four sections — group, filter, forces, and display — each holding only the keys a change wrote, so a device that moved one key never clobbers another's on the per-key merge. A hand edit from outside surfaces live through the file watcher.

The picture's own geometry stays on the machine that made it, in `local_state`: every node's place keyed by id, so a rename keeps a node where it was, and the viewport's zoom and pan. A first open with nothing stored fits the graph once it settles.

### Prospects

- **A worker** for the simulation, should a Nexus grow past what a frame affords.
- **Saved arrangements**, a layout kept by name rather than one per Nexus.
- **Selection and multi-node action**, where today a node answers one at a time.
