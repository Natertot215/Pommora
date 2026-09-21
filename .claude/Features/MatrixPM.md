## The Matrix

The graph view. A Nexus's relationships live in an index that every other surface reads as paths; the Matrix reads the rows themselves and draws them — Pages, Folders, and Spaces as nodes, their connections and containment as links, laid out by a force simulation Pommora owns. It opens from the ribbon into a tab, or into a floating window under **Open Matrix In**, and both surfaces draw one simulation.

### Node Mechanics

A node is a Page, a Folder, or a Space. A link is one of five kinds: body, citation, and frontmatter carry content ↔ content, space carries a Space relation, and location carries containment.

#### Groups

**Groups** chooses which links the picture is built from, and which nodes appear at all.

- **Connection** draws Pages alone, linked by what they cite and mention.
- **Location** adds each Folder and links every Page to the one that holds it, Folder to parent Folder up the nest.
- **Space** adds each Space, links every Page that tags it, and draws Space ↔ Space relations.

Picking a mode rebuilds the graph and settles it, so the picture answers the click rather than the next thing that moves it. **Unlinked Items** decides whether nodes with nothing attached appear; a Folder or Space is unlinked when it holds no members.

#### Weight

A node's radius follows what it carries, clamped to a ceiling, so the largest hub stays in proportion to the field. A Page grows with the connections that land on it, weighted per kind — a body link counts for more than a citation. A Folder or Space grows with its members, counted through the whole nest beneath it, so a Collection reflects everything it contains rather than only its direct children.

#### Pull

Each link kind pulls at its own strength — body and containment hardest, a citation least — and every link's pull is divided by the smaller of the two nodes' link counts, so it thins as its ends gain neighbours. A leaf Page is therefore held to its Folder more firmly than a hub is held to any one of its citations. Four multipliers — **Gravity**, **Spread**, **Strength**, and **Distance** — scale the forces from the menu's **Link Forces** rows and persist with the Nexus; every other feel number is a constant in the engine rather than a setting.

### The Engine

`Core/Matrix/Engine/` is the physics. It reaches no browser global, no store, and no React, and every module carries its own tests.

#### The Loop

One integration step runs gravity toward the centre, charge-based spread through a Barnes–Hut quadtree, the per-kind link springs, and collision, then measures the energy of the nodes that actually moved. A picture at rest sleeps and costs nothing; a picture in motion keeps its own frames. The quadtree it builds each tick is the same structure the pointer hit-tests against, so finding the node under the cursor is a tree descent rather than a scan.

#### Waking

Work is scoped to what changed. A Page created elsewhere joins among the nodes it already links to and only it moves, while the rest of the picture holds still. A dragged node wakes the graph around it; a released one is carried home by the same spring that followed the pointer, and the loop stays awake until it arrives. A node the layout has never seen is seated on a spiral outside the current extent, so a first open and a growing Nexus both open without overlap.

#### Scale

Every expensive step is bounded: the spread force approximates distant clusters rather than visiting them, labels are culled to one per cell so a dense field prints the largest node's title and drops the rest, and the layout is written once on settle rather than per frame. A bench ticks a synthetic Nexus against a budget as a gate.

### The Surface

The picture is drawn on a `<canvas>`, with one DOM overlay following the node under the pointer. Paint is aliased onto host-scoped `--matrix-*` custom properties and read once through a probe and the host's computed style, so the canvas takes the same tokens the DOM does. The overlay carries the node's icon, title, and location trail, and is where the inline rename field, the icon picker, and the Shift-preview open — each on the surface it was raised from, since a tab and a window can stand at once. Both read one world rectangle and fit it to their own box, so each is centred on the same picture at the scale its box allows.

Hovering a node lights its links, raises its fill from the control tone to the primary one, and eases the rest of the picture down; letting it go returns them on the same curve. A held node carries that emphasis for as long as it is held, whatever the pointer is over, since it trails the cursor on its springs; releasing it lets it settle back. Each kind of node carries its title from a zoom of its own — Spaces first, then Folders, then Pages — fading it in across a band above that zoom rather than printing it whole at a threshold, and the overlay's own title arrives and leaves by the same fade. **Lock** refuses a node drag and stands Shuffle down, **Shuffle** jitters every node and lets the layout re-solve, and **Hide Icons** and **Hide Paths** trim the overlay's glyph and its trail. A right-click answers as a sidebar row does, a node renamed from here keeps its emphasis until the name is committed, and a Page moved in Location mode fades out where it was and in beside its new Folder.

### What Persists

The Matrix's choices travel with the Nexus in `.nexus/matrix.json`, written in four sections — group, filter, forces, and display — each holding only the keys a change wrote, so a device that moved one key never clobbers another's on the merge. A hand edit from outside surfaces live through the file watcher.

The picture's own geometry stays on the machine that made it: every node's place keyed by id, so a rename keeps a node where it was, and the world rectangle the picture is framed on. A row that no longer reads is dropped on its own rather than taking the rest of the layout with it, and a first open with nothing stored fits the graph once it settles.

### Prospects

- **A worker** for the simulation, should a Nexus grow past what a frame affords.
- **Saved arrangements**, a layout kept by name rather than one per Nexus.
- **Selection and multi-node action**, where today a node answers one at a time.
