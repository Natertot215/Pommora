## Tiles V2 — Spec

> **Status:** standing spec · Decided in [[Tiles — Decision Log]] · Built by [[Tiles — Implementation Plan]] (PM-128) · Described in [[TilesPM]]

The Tiles arc built a substrate and stopped. This page holds what that substrate promises to the work that comes after it — the inspector, the panel kinds, the corpus hosts, the docked-window shape — so each of those arcs starts from the seams as they stand rather than re-deriving them, and so the rulings that shaped the seams stay attached to them. Where the decision log records why, this page records what is now true in code and what it was built to admit.

### The Substrate

The tile system is five layers, each with one job, and a consumer enters at the layer that matches its problem.

| Layer | Owner | What it promises |
| --- | --- | --- |
| The pointer engine | `Interactions/gesture.ts` | Every drag that sizes or moves anything runs here: capture at activation, one abort path for Escape, blur, cancel, and a lost release, a tap for a release before activation. |
| The geometry owners | `Interactions/ResizeFrame.tsx` (one box) · `Tiles/Core` + `Tiles/TileGrid.tsx` (one tree) | A box clamps a rect; a tree negotiates a boundary between neighbors. They are two owners by design and share the engine, the handle classes, the phase vocabulary, and the outline tint. |
| The chassis | `Tiles/tile-base.css` | The one border-and-radius contract every tile and handle keys onto, the Scale ramp on one inherited `--tile-zoom` variable. |
| The host binding | `Tiles/TileHost.tsx` · `Tiles/useTileDoc.ts` · `shared/tiles.ts` · `main/tiles.ts` · `main/tileDoc.ts` | A host ref resolves to a folder; the folder's `_tiles.json` is the document; the recipe declares the kinds; the document reloads live. |
| The surfaces | `Tiles/Surfaces/` | What a tile holds. The embed framework (`PageTile`) is one of them and five hosts outside the grid render through it. |

Windows, the glance, the strips, the window side panels, and MarkdownPM's embed tile are boxes. A Space, the Homepage, and an inspector tab are trees. MarkdownPM's embeds stay CM6 widgets whose layout is the document; they share the chassis, the surfaces, the minimum, the zoom, the warm cache, and the box primitive, and that is the whole intersection.

### The Seams

Each seam below is a place a later arc adds one thing. The sites are named so the addition is an enumeration, not a search.

**A host** (`TileHostRef` in `shared/tiles.ts`). The union enumerates its current consumers, the Homepage and Spaces. A new member is seven named sites: the union entry, `tileHostKey`, `coerceTileHost`, main's `hostDir` arm and `listTileHosts` entry, and the watcher's ignore arm and classifier (`watchPatch.ts`'s `tiles-leaf`). A host is a folder; that is the document's identity. The seam admits the inspector's shapes without pre-plumbing them: a reserved tab per Collection holding its own configuration, one Pages tab every page shares with selection-aware tiles, and capped user-made tabs.

**A corpus host.** A Collection folder is corpus: a bare `<ulid>.md` there is adopted as a page. A Collection tab's bodies therefore live in a `_`-prefixed subfolder the walk refuses; the Pages tab and each custom tab get a folder under `.nexus/inspector/`. The Homepage already works this way under `.nexus/homepage/`.

**A kind** (the recipe). Three arms keyed by one `TileType`: `TILE_KINDS` in `shared/tiles.ts` (schema, `fileBacked`, `menuRows`), `TILE_SURFACES` in `Tiles/tileKinds.tsx` (render, `sourceInfo`), and `TILE_COPY` in `main/tiles.ts` for a kind with something to re-mint on copy. `knownTile` parses through the table's own schemas, so a kind absent from the shared table does not parse. The host's render, both menu presenters, the menu model, the Space seed, and main's lifecycle read the tables; no kind comparison survives outside them. A panel kind, a list kind, or webpage as a surface kind is one shared entry, one renderer entry, a copy arm if it needs one, and its component. A kind with no backing file has no arm in main.

**The document** (`_tiles.json` in the host's folder). One locked read-modify-write through `writeTileDocAt`; reads are read-only by construction; corrupt bytes are quarantined by the writer under a `.bad-` name, never adjudicated by a read. Unknown entries and foreign keys ride through every read and write untouched. The watcher names the file and pushes `tiles:changed`; the open host flushes the save it owes, re-reads, and shows the file. Most recent wins, and a completed local drag never silently reverts. A busy gesture holds the push from the press itself until the settle.

**The configuration** (`state.json`). The inspector's nexus-wide configuration, the Pages tab and the custom tabs, has one reserved key, `INSPECTOR_STATE_KEY`, and one cap, `MAX_INSPECTOR_TABS` (six), both declared in `shared/tiles.ts` and unread. The guard lives at the create channel when it exists; a foreign file over the cap reads inert rather than failing. The moment the key gains a writer, the watcher needs a `state-leaf` arm, since every change to that file is a full re-walk today.

**Warmth** (`Tiles/tileCache.ts`). Per-tab warmth for the inspector, the folds, scrolls, and editor state, is per-machine and in memory through the existing warm seam keyed by the tab's host chain, capped by the same `capSet` the active-tab cache uses and sized by the existing Active Tab Cache setting. No second cache, no second setting, nothing persisted. This is the inspector arc's first task.

### The Inspector

The shape is decided; nothing of it is built.

- `InspectorPane` hosts a tab strip and one `TileHost` per tab, on the `WindowTabStrip` precedent. The Collection tab shows for a selected Collection or its pages alongside the Pages tab; custom tabs always. Selection-aware kinds read the store's selection themselves; the host binding does not thread it.
- Inside a 240–420px pane the grid is a vertical stack: bands of full-width tiles with absolute heights, north edges negotiating through the band pair. The model already handles it.
- The document is Nexus content, cross-device, never `local_state`. Custom tabs are user-created and capped; the Collection and Pages tabs are reserved.
- A **panel** tile is a menu surface (`menu-base`) standing on a tile: a properties panel, a backlinks panel, a list. The recipe takes it as a kind whose surface is a menu. A backlinks kind reads the content index's `mentions` table, the seam Linked-From was gated on.
- The Page Window's frontmatter inspector (`PagePanel`, properties only) and the shell inspector stay distinct until a properties kind exists; then the Page Window's could become a one-tile panel.

The vocabulary, from Nathan's own usage: a **pane** is a glass region of the shell or a window; a **tab** is one configured tile host inside the inspector; a **panel** is a menu surface, standing alone or on a tile. "Surface" stays the glass material and a tile's content.

### Sequenced Work

- The inspector itself: the tab strip, the reserved and custom tabs, the create and remove flow, the `state-leaf` watcher arm, per-tab warmth through the warm seam.
- Panel kinds (properties, backlinks, list) and webpage as a surface kind.
- Live body reload: markdown tile bodies sync with `.nexus/` but are not watched, so a synced body shows its old text until ⌘R while the layout beside it reloads live. One watcher arm plus a `replaceBody`-style push, the same mechanism the page editor's external-edit reload needs; it rides that arc.
- The host-lock toggle: `setHostLocked` in `Store/cacheSlice.ts` writes through `tiles:save` outside `useTileDoc`, so a toggle inside a reload's window can blink off and back until its own echo re-seeds it. Routing it through the hook or dropping the optimistic set are each a few lines; the ruling is on the toggle's immediacy.
- A Space folder whose sidecar syncs in before its `_tiles.json`: the open-time re-mint gates on the document's presence, so a document arriving later keeps the source's view-config ids. The sync arc decides whether a folder lands ordered; if not, the re-mint needs a second trigger on the document's arrival.
- Retiring `tilesMigrate.ts` and the `blockDoc` scope once every device has opened the Nexus on this build; the lift leaves no code behind.
- The two hand-rolled captures still outside the engine: `TabBar`'s native-window drag stays by design; the DnD engine's own capture is its own arc.

### Prospects

- **Panels as docked windows.** Each inspector panel a `WindowBase` docked to the right edge, so window and panel are one thing sized by one primitive and docking is a clamp; move, undock, and a footer come free. The cost is that the shell's inspector is a `paneSlide` on `--io` with a content clearance the whole interface reads, and windows deliberately redeclare `--io` so the shell's cannot leak in. Sound once panels exist.
- **The shell as a WindowBase shape.** Sidebar and inspector as the shell's left and right panels, unifying `paneSlide`, the strips, `--io`, and width persistence under one owner. The deepest collapse on offer; it touches every consumer of the two clearance variables.
- Tile conversions both ways, the background Insert menu, embed banners, widget tiles, auto-grow markdown tiles, layout undo, root-level hosts — [[TilesPM]]'s own Pending and Prospects.

### Rejected

- **Free placement.** A canvas of `ResizeFrame` rects with collision loses the row-fills-surface invariant a narrow pane depends on and reintroduces compaction. The split tree stands, and `Canvas/` as a name would imply otherwise.
- **Tile edges through `ResizeFrame`.** A boundary between neighbors is not a box; the tree ops are the geometry.
- **A "resizable" prop on PickerMenu.** A centered picker resizes by mounting the frame's handles as its children; a prop would be a passer.
- **The document in the identity sidecar.** `_space.json` and `homepage.json` have no schema, four writers rebuild them whole, two write them unlocked, and the layout debounce would make the document the hottest writer on the file the watcher's echo window hides.

### Lessons Carried

- Two geometry problems, one gesture vocabulary: fold engines and handles, never owners.
- A hold-the-push rule keyed on gesture state covers the whole gesture, the press before activation and the reads a reload has in flight when the gesture begins.
- A "bytes are identical" skip needs the writer's own serializer on both sides (`shared/stableJson.ts`).
- A per-machine row is acceptable for chrome; a layout is content and migrates.
