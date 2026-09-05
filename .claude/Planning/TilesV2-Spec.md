## TilesV2 — Spec

> **Status:** standing spec · Built by [[Tiles — Implementation Plan]] (PM-128) · Described in [[SurfacePM]]

Tiles is one core Pommora system beside Views, Pages, Properties, and Connections: in-app windows, floating panes, and picker menus size through one box primitive, while Space and Homepage grids, MarkdownPM embeds, and the inspector's tabs share one tile mechanism. The Tiles arc built the substrate and stopped. This page holds the decisions that shaped it and what it promises to the work that comes after — the inspector, the panel kinds, the corpus hosts, the docked-window shape — so each of those arcs starts from the seams as they stand rather than re-deriving them.

**Core value:** a new tile host or a new tile kind is one declaration, not a tour of switch sites, and every surface that sizes by drag reads as the same gesture. **Success criteria, met:** an inspector tab can mount a tile grid through the same host binding a Space uses, from a document stored in the Nexus; a backlinks or properties tile is one kind entry plus its body; `SurfacePM/` is gone and nothing outside MarkdownPM says "block"; one pointer engine drives every resize and move.

### The Substrate

The tile system is five layers, each with one job, and a consumer enters at the layer that matches its problem.

| Layer               | Owner                                                                                                  | What it promises                                                                                                                                                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The pointer engine  | `Interactions/gesture.ts`                                                                              | Every drag that sizes or moves anything runs here: a module singleton, capture at activation, one abort path for Escape, blur, cancel, and a lost release, a tap for a release before activation, the release after a cancel swallowed as a click.                                                                              |
| The geometry owners | `Interactions/ResizeFrame.tsx` (one box) · `Tiles/Core` + `Tiles/TileGrid.tsx` (one tree)              | A box clamps a rect, optionally carrying its origin; a tree negotiates a boundary between neighbors, resolved by `Core/edges` into a divider, a stack pair, a band pair, or a stretch. Two owners by design; they share the engine, the handle classes, the phase vocabulary (`move` · `drop` · `abort`), and the outline tint. |
| The chassis         | `Tiles/tile-base.css`                                                                                  | The one border-and-radius contract every tile and handle keys onto; the Scale ramp on one inherited `--tile-zoom` variable set inline, never a class per step.                                                                                                                                                                  |
| The host binding    | `Tiles/TileHost.tsx` · `Tiles/useTileDoc.ts` · `shared/tiles.ts` · `main/tiles.ts` · `main/tileDoc.ts` | A host ref resolves to a folder; the folder's `_tiles.json` is the document; the recipe declares the kinds; the document reloads live.                                                                                                                                                                                          |
| The surfaces        | `Tiles/Surfaces/`                                                                                      | What a tile holds. The embed framework (`PageTile`) is one of them, and five hosts outside the grid render through it.                                                                                                                                                                                                          |

Windows, the glance, the strips, the window side panels, and MarkdownPM's embed tile are boxes. A Space, the Homepage, and an inspector tab are trees. MarkdownPM's embeds stay CM6 widgets whose layout is the document: they share the chassis, the surfaces, the minimum, the zoom, the warm cache, and the box primitive, and that is the whole intersection. Two hand-rolled captures stay outside the engine on purpose: `TabBar`'s native-window drag, and the DnD engine's own capture, which is its own arc.

### Vocabulary

- **Tiles/** is a plain-noun sibling of `Views/`, `Windows/`, `Tables/`, `Cards/`. "Surface" is the glass material and Nathan's word for any UI surface, so it cannot name the module; "Canvas" implies free placement, which the model rejects.
- **Block** is MarkdownPM's word for its CM6 blocks (`blockModel`, `blockHandles`, `blockDrag`, `blockMoveChanges`) and nothing else's. Storage and channels included: the channels are `tiles:*` and the document's entries are `tiles`.
- A **pane** is a glass region of the shell or a window (inspector, sidebar, a window's side pane); a **tab** is one configured tile host inside the inspector; a **panel** is a menu surface — properties, backlinks — whether it stands alone or sits on a tile. "Surface" stays the glass material and a tile's content.

### The Seams

Each seam is a place a later arc adds one thing; the sites are named so the addition is an enumeration, not a search.

**A host** (`TileHostRef` in `shared/tiles.ts`). The union enumerates its current consumers, the Homepage and Spaces. A new member is seven named sites: the union entry, `tileHostKey`, `coerceTileHost`, main's `hostDir` arm and `listTileHosts` entry, and the watcher's ignore arm and classifier (`watchPatch.ts`'s `tiles-leaf`). A host is a folder; that is the document's identity. The seam admits the inspector's shapes without pre-plumbing them: a reserved tab per Collection holding its own configuration, one Pages tab every page shares with selection-aware tiles, and capped user-made tabs.

**A corpus host.** A Collection folder is corpus: a bare `<ulid>.md` there is adopted as a page. A Collection tab's bodies therefore live in a `_`-prefixed subfolder the walk refuses; the Pages tab and each custom tab get a folder under `.nexus/inspector/`. The Homepage already works this way under `.nexus/homepage/`.

**A kind** (the recipe). Three arms keyed by one `TileType`: `TILE_KINDS` in `shared/tiles.ts` (schema, `fileBacked`, `menuRows`), `TILE_SURFACES` in `Tiles/tileKinds.tsx` (render, `sourceInfo`), and `TILE_COPY` in `main/tiles.ts` for a kind with something to re-mint on copy — three arms because `shared/` compiles under the node project with no React, and `newId` lives in main. `knownTile` parses through the table's own schemas, so a kind absent from the shared table does not parse. The host's render, both menu presenters, the menu model, the Space seed, and main's lifecycle read the tables; no kind comparison survives outside them. The two menu presenters (`TileHandleMenu` in-app, `popNativeMenu` native) stay two presenters over the one `tileMenuModel`; the table feeds the model, never a presenter. A panel kind, a list kind, or webpage as a surface kind is one shared entry, one renderer entry, a copy arm if it needs one, and its component. A kind with no backing file has no arm in main.

**The document** (`_tiles.json` in the host's folder). One locked read-modify-write through `writeTileDocAt`; reads are read-only by construction; corrupt bytes are quarantined by the writer under a `.bad-` name, never adjudicated by a read. Unknown entries and foreign keys ride through every read and write untouched. The watcher names the file and pushes `tiles:changed`; the open host flushes the save it owes, re-reads, and shows the file — most recent wins, and a completed local drag never silently reverts. Identical bytes change nothing, compared through the writer's own serializer. A busy gesture holds the push from the press itself until the settle.

**The configuration** (`state.json`). The inspector's nexus-wide configuration, the Pages tab and the custom tabs, has one reserved key, `INSPECTOR_STATE_KEY`, and one cap, `MAX_INSPECTOR_TABS` (six), both declared in `shared/tiles.ts` and unread. The guard belongs at the create channel when it exists; a foreign file over the cap reads inert rather than failing. The moment the key gains a writer, the watcher needs a `state-leaf` arm, since every change to that file is a full re-walk today.

**Warmth** (`Tiles/tileCache.ts`). Per-tab warmth for the inspector — folds, scrolls, editor state — is per-machine and in memory through the existing warm seam keyed by the tab's host chain, capped by the same `capSet` the active-tab cache uses and sized by the existing Active Tab Cache setting (`personalization.tabCache`). No second cache, no second setting, nothing persisted. This is the inspector arc's first task.

### The Inspector

The shape is decided; nothing of it is built.

- `InspectorPane` hosts a tab strip and one `TileHost` per tab, on the `WindowTabStrip` precedent. The Collection tab shows for a selected Collection or its pages alongside the Pages tab; custom tabs always. Selection-aware kinds read the store's selection themselves; the host binding does not thread it.
- Inside a 240–420px pane the grid is a vertical stack: bands of full-width tiles with absolute heights, north edges negotiating through the band pair. The model already handles it; the ratio row is available but rarely useful at that width.
- The document is Nexus content, cross-device, never `local_state`. Custom tabs are user-created and capped; the Collection and Pages tabs are reserved.
- A **panel** tile is a menu surface (`menu-base`) standing on a tile: a properties panel, a backlinks panel, a list. The recipe takes it as a kind whose surface is a menu. A backlinks kind reads the content index's `mentions` table, the seam Linked-From was gated on.
- The Page Window's frontmatter inspector (`PagePanel`, properties only) and the shell inspector stay distinct until a properties kind exists; then the Page Window's could become a one-tile panel.

### Why the Document Is a File of Its Own

The document left the identity sidecar in July 2026 to retire a whole-file lost update between a debounced layout save and a banner write, and an interim `_blocks.json` was reverted for "one file, one entity" once write-echo suppression landed. It returned as a file because cross-device is required and `nexus.db` is device-local; it returned as its own file because `_space.json` and `homepage.json` have no schema, four writers rebuild them whole, two write them unlocked, and the layout debounce would make the document the hottest writer on the file the watcher's echo window hides. The per-machine rows that held each layout were moved into the files once on the Mac's first open and the row family retired; a machine that never opened the Nexus on that build arranges its layouts again, or copies them by hand from its `nexus.db` into the host's `_tiles.json`.

### Sequenced Work

- The inspector itself: the tab strip, the reserved and custom tabs, the create and remove flow, the `state-leaf` watcher arm, per-tab warmth through the warm seam.
- Panel kinds (properties, backlinks, list) and webpage as a surface kind (`type: 'webpage'`; the surface exists as MarkdownPM's embed).
- Live body reload: markdown tile bodies sync with `.nexus/` but are not watched, so a synced body shows its old text until ⌘R while the layout beside it reloads live. One watcher arm plus a `replaceBody`-style push, the same mechanism the page editor's external-edit reload needs; it rides that arc.
- The host-lock toggle: `setHostLocked` in `Store/cacheSlice.ts` writes through `tiles:save` outside `useTileDoc`, so a toggle inside a reload's window can blink off and back until its own echo re-seeds it. Routing it through the hook or dropping the optimistic set are each a few lines; the ruling is on the toggle's immediacy.
- A webpage embed tile sized taller than the current window renders at the window's fit cap, and a drag on its strip persists the capped height over the stored one. Seeding the press from the stored height keeps the store but makes the live drag stop tracking the pointer inside a short window; the ruling is whether the cap speaks only about display.
- A Space folder whose sidecar syncs in before its `_tiles.json`: the open-time re-mint gates on the document's presence, so a document arriving later keeps the source's view-config ids. The sync arc decides whether a folder lands ordered; if not, the re-mint needs a second trigger on the document's arrival.

### Prospects

- **Panels as docked windows.** Each inspector panel a `WindowBase` docked to the right edge, so window and panel are one thing sized by one primitive and docking is a clamp; move, undock, and a footer come free. The cost is that the shell's inspector is a `paneSlide` on `--io` with a content clearance the whole interface reads, and windows deliberately redeclare `--io` so the shell's cannot leak in. Sound once panels exist.
- **The shell as a WindowBase shape.** Sidebar and inspector as the shell's left and right panels, unifying `paneSlide`, the strips, `--io`, and width persistence under one owner. The deepest collapse on offer; it touches every consumer of the two clearance variables.
- **PickerMenu resizing** needs no plumbing: a centered picker resizes by mounting the frame's handles as its children.
- Tile conversions both ways, the background Insert menu, embed banners, widget tiles, auto-grow markdown tiles, layout undo, root-level hosts — [[SurfacePM]]'s own Pending and Prospects.

### Rejected

- **Free placement.** A canvas of `ResizeFrame` rects with collision loses the row-fills-surface invariant a narrow pane depends on and reintroduces compaction. The split tree stands.
- **Tile edges through `ResizeFrame`.** A boundary between neighbors is not a box; the tree ops are the geometry.
- **A "resizable" prop on PickerMenu.** The host mounts the frame directly; a prop would be a passer.
- **MarkdownPM embeds becoming tree-driven.** The document is their layout.
- **Disk wins over a pending local save on a live-reload push.** It discards the user's own last action; the local write lands first and disk is then read.

### Lessons Carried

- Two geometry problems, one gesture vocabulary: fold engines and handles, never owners.
- A hold-the-push rule keyed on gesture state covers the whole gesture — the press before activation and the reads a reload has in flight when the gesture begins.
- A "bytes are identical" skip needs the writer's own serializer on both sides (`shared/stableJson.ts`).
- A decision made at a drop and committed at the settle's end must also commit when the surface unmounts in between.
- A recipe's schema field needs a reader, or a fourth kind compiles clean and parses to null; `knownTile` derives from the table for that reason.
- A per-machine row is acceptable for chrome; a layout is content and migrates.
