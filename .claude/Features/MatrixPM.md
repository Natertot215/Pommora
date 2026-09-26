## The Matrix

The graph view. A Nexus's relationships live in an index that every other surface reads as paths; the Matrix reads the rows themselves and draws them — Pages, Folders, and Spaces as nodes, their connections and containment as links, laid out by a force simulation Pommora owns. It opens from the ribbon into a tab, or into a floating window under **Open Matrix In**, and both surfaces draw one simulation.

### Node Mechanics

A node is a Page, a Folder, or a Space. A link is one of five kinds: body, citation, and frontmatter carry content ↔ content, space carries a Space relation, and location carries containment.

#### Groups

**Groups** choose which links build the picture, and which nodes appear at all.

- **Connection** draws Pages alone, linked by what they cite and mention.
- **Location** adds each Folder and links every Page to the one that holds it, Folder to parent Folder up the nest.
- **Space** adds each Space, links every Page that tags it, and draws each Space ↔ Space link once.

Picking a mode rebuilds and settles the graph, so the picture answers the click rather than the next thing that moves it. **Unlinked Items** decides whether nodes with nothing attached appear; a Folder is unlinked when it holds no members, and a Space when it holds no members and links no other Space.

The **Filter** reaches Spaces as well as Pages: a Space is judged on the rules it can answer — a property it holds, its title, its links — and any other rule leaves it in place.

#### Weight

A node's radius follows what it carries, clamped to a ceiling, so the largest hub stays in proportion to the field. A Page grows with the connections that land on it, weighted per kind — a body link counts for more than a citation. A Folder or Space grows with its members, counted through the whole nest beneath it, so a Collection reflects everything it contains rather than only its direct children; a Space grows with the Spaces it links as well.

#### Pull

Each link kind pulls at its own strength — body and containment hardest, a citation least — and every link's pull is divided by the smaller of the two nodes' link counts, so it thins as its ends gain neighbors. A leaf Page is therefore held to its Folder more firmly than a hub is held to any one of its citations. Four multipliers — **Gravity**, **Spread**, **Strength**, and **Distance** — scale the forces from the menu's **Link Forces** rows and persist with the Nexus. Each grouping carries its own set of the four and its own resting values, so the rows read and write the grouping the picture is drawn under, and their values change as it does; every other field number is a constant in the engine, not a setting.

### The Engine

`Core/Matrix/Engine/` is the physics. It reaches no browser global, no store, and no React, and every module carries its own tests.

#### The Loop

One integration step runs gravity toward the center, charge-based spread through a Barnes–Hut quadtree, the per-kind link springs, and collision, then measures the energy of the nodes that actually moved. A picture at rest sleeps and costs nothing; a picture in motion keeps its own frames. The quadtree it builds each tick is the same structure the pointer hit-tests against, so finding the node under the cursor is a tree descent rather than a scan.

#### Waking

Work is scoped to what changed. A save that moves no link and changes no filtered value leaves the picture as it stands. A Page created elsewhere joins among the nodes it already links to, and only it moves, while the rest of the picture holds still. A dragged node wakes the graph around it; a released one is carried home by the same spring that followed the pointer, and the loop stays awake until it arrives. A node the layout has never seen is seated on a spiral outside the current extent, so a first open and a growing Nexus both open without overlap.

#### Scale

Every expensive step is bounded: the spread force approximates distant clusters rather than visiting them, labels are culled to one per cell so a dense field prints the largest node's title and drops the rest, and the layout is written once on settle, for the nodes that moved, rather than per frame. A closed Matrix holds nothing: its graph loads when the first surface opens and is let go with the last. A bench ticks a synthetic Nexus against a budget as a gate.

### The Surface

The picture is drawn on a `<canvas>`, with one DOM overlay following the node under the pointer. Paint is aliased onto host-scoped `--matrix-*` custom properties and read once through a probe and the host's computed style, so the canvas takes the same tokens the DOM does. Every node carries its glyph inside its own circle, at one-third of its diameter across all three kinds, and a Page's arrives at the zoom that reveals Page titles while a Folder's and a Space's stand at any scale. A Space with a color takes it into that circle's fill and glyph, and a Space without one paints as any other node does. The overlay carries the node's icon, title, and location trail, and is where the inline rename field, the icon picker, a Space's color picker, and the Shift-preview open — each on the surface it was raised from, since a tab and a window can stand at once. Both read one world rectangle and fit it to their own box, so each is centered on the same picture at the scale its box allows.

Hovering a node lights its links, raises its fill and its glyph, and eases the rest of the picture down; letting it go returns them on the same curve. A colored Space rises through its own color and lights its links and ring in that color solid, while every other node rises to the primary tone against the accent. A held node carries that emphasis for as long as it is held, whatever the pointer is over, since it trails the cursor on its springs; releasing it lets it settle back. Each kind of node carries its title from a zoom of its own — Spaces first, then Folders, then Pages — fading it in across a band above that zoom rather than printing it whole at a threshold, and the overlay's own title arrives and leaves by the same fade. **Lock** refuses a node drag and stands Shuffle down, **Shuffle** jitters every node and lets the layout re-solve, and **Hide Icons** and **Hide Paths** trim every node's glyph and the overlay's trail. A right-click answers as a sidebar row does, with Change Color on a Space, a node renamed from here keeps its emphasis until the name is committed, and a Page moved in Location mode fades out where it was and in beside its new Folder.

### What Persists

The Matrix's choices travel with the Nexus in `.nexus/matrix.json`, written in four sections — group, filter, forces, and display — merged section by section, so a device that moved one section never clobbers another's; forces holds a block per grouping, merged value by value, so a change to one force writes that value alone. A hand edit from outside surfaces live through the file watcher.

The picture's own geometry stays on the machine that made it: every node's place in a row of its own keyed by id, so a rename keeps a node where it was, and the world rectangle the picture is framed on. A row that no longer reads is dropped on its own rather than taking the rest of the layout with it; a node the Nexus no longer holds is let go when the Matrix opens; and a first open with nothing stored fits the graph once it settles.

### Prospects

- **A worker** for the simulation, should a Nexus grow past what a frame affords.
- **Saved arrangements**, a layout kept by name rather than one per Nexus.
- **Selection and multi-node action**, where today a node answers one at a time.
