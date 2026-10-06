## TilesV2 — Spec

> **Status:** standing spec · Built by [[Tiles — Implementation Plan]] (PM-128) · Described in [[SurfacePM]]

Tiles is one core Pommora system beside Views, Pages, Properties, and Connections: in-app windows, floating panes, and picker menus size through one box primitive, while Space and Homepage grids, MarkdownPM embeds, and the SidePane's tabs share one tile mechanism. The Tiles arc built the substrate and stopped. This page holds the decisions that shaped it and what it promises to the work that comes after — the SidePane, the panel kinds, the corpus hosts, the docked-window shape — so each of those arcs starts from the seams as they stand rather than re-deriving them.

**Core value:** a new tile host or a new tile kind is one declaration, not a tour of switch sites, and every surface that sizes by drag reads as the same gesture. **Success criteria, met:** a backlinks or properties tile is one `TILE_KINDS` entry plus its surface; `SurfacePM/` is gone and nothing outside MarkdownPM says "block"; one pointer engine drives every resize and move.

### The Substrate

The tile system is five layers, each with one job, and a consumer enters at the layer that matches its problem.

| Layer               | Owner                                                                                                  | What it promises                                                                                                                                                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The pointer engine  | `Interactions/gesture.ts`                                                                              | Every drag that sizes or moves anything runs here: a module singleton, capture at activation, one abort path for Escape, blur, cancel, and a lost release, a tap for a release before activation, the release after a cancel swallowed as a click.                                                                              |
| The geometry owners | `useResizable` (one box) · `Tiles/Layout/` + `Tiles/TileGrid.tsx` (one tree)              | A box clamps a rect, optionally carrying its origin; a tree negotiates a boundary between neighbors, resolved by `Tiles/Layout/edges.ts` into a divider, a stack pair, a band pair, or a stretch. Two owners by design; they share the engine, the handle classes, the phase vocabulary (`move` · `drop` · `abort`), and the outline tint. |
| The chassis         | `Tiles/tile-base.css`                                                                                  | The one border-and-radius contract every tile and handle keys onto; the Scale ramp on one inherited `--tile-zoom` variable set inline, never a class per step.                                                                                                                                                                  |
| The host binding    | `Tiles/TileHost.tsx` · `Tiles/useTileDoc.ts` · `Core/Tiles/tiles.ts` · `tileHosts.ts` · `tilesFile.ts` · `tileDoc.ts` | A host ref resolves to a folder; the folder's `_tiles.json` is the document; the recipe declares the kinds; the document reloads live.                                                                                                                                                                                          |
| The surfaces        | `Tiles/Surfaces/`                                                                                      | What a tile holds. The embed framework (`PageTile`) is one of them, and three hosts outside the grid render through it.                                                                                                                                                                                                          |

Windows, the glance, the strips, the window side panels, and MarkdownPM's embed tile are boxes. A Space and the Homepage are trees, and a SidePane tab would be one. MarkdownPM's embeds stay CM6 widgets whose layout is the document: they share the chassis, the surfaces, the minimum, the zoom, the warm cache, and the box primitive, and that is the whole intersection. Two hand-rolled captures stay outside the engine on purpose: `TabBar`'s native-window drag, and the DnD engine's own capture, which is its own arc.

### Vocabulary

- **Tiles/** is a plain-noun sibling of `Views/`, `Windows/`, `Tables/`, `Cards/`. "Surface" is the glass material and Nathan's word for any UI surface, so it cannot name the module; "Canvas" implies free placement, which the model rejects.
- **Block** is MarkdownPM's word for its CM6 blocks (`blockModel`, `blockHandles`, `blockDrag`) and nothing else's. Storage and channels included: the channels are `tiles:*` and the document's entries are `tiles`.
- A **pane** is a glass region of the shell or a window (SidePane, sidebar, a window's side pane); a **tab** is one configured tile host inside the SidePane; a **panel** is a menu surface — properties, backlinks — whether it stands alone or sits on a tile. "Surface" stays the glass material and a tile's content.

### The Seams

Each seam is a place a later arc adds one thing; the sites are named so the addition is an enumeration, not a search.

**A host** (`TileHostRef` in `Core/Tiles/tiles.ts`). The union enumerates its current consumers, the Homepage and Spaces. A new member is one schema member and one `TILE_HOSTS` arm in `tileHosts.ts`, which gives the host's folder and lists its boards from the held tree; `coerceTileHost`, `tileHostKey`, `hostDir`, `tileHostsOf`, and the watcher's `tiles-leaf` classification in `Nexus/fileEvents.ts` derive from those. Three sites that run before a tree exists name host folders by hand: `normalizeSavedViews`, `ensureConfigLayout`, and the re-mint's Space check in `remint.ts`. A host is a folder; that is the document's identity. The seam admits the SidePane's tabs without pre-plumbing them: one page-wide tab every page shares with selection-aware tiles, and capped user-made tabs.

**An SidePane tab.** Each tab is a folder under `.nexus/tiles/<tab>/`, holding its document and its bodies the way `.nexus/interface/homepage` does; nothing under `.nexus/tiles/` is corpus, so no walk rule is needed.

**A kind** (the recipe). Two tables keyed by one `TileType`: `TILE_KINDS` in `Core/Tiles/tiles.ts` (schema, `fileBacked`, `menuRows`, and an optional `copy` that re-mints what a copy must not share with its source) and `TILE_SURFACES` in `Tiles/tileKinds.tsx` (render, `sourceInfo`). `knownTile` parses through the table's own schemas, so a kind absent from the shared table does not parse. `tiles:create` makes a blank Markdown Tile, or, given a `TilePick`, the entry that pick resolves to, in one write. The host's render, the menu model, the Space seed, and the host-side lifecycle read the tables. The two menu presenters (the in-app `MenuPresenter` and the native menu, both reached through `popMenu`) stay two presenters over the one `tileMenuItems` model; the table feeds the model, never a presenter. A panel kind, a list kind, or webpage as a surface kind is one `TILE_KINDS` entry and one surface, plus a `TilePick` member with its pick-entry and pick-tree arms when a menu creates or converts into it.

**The document** (`_tiles.json` in the host's folder). Every write is a locked read-modify-write; reads are read-only by construction. The board's own writes go through `writeTileDocAt`, which quarantines corrupt bytes under a `.bad-` name, and the configuration passes skip a corrupt file; a read never adjudicates one. Unknown entries and foreign keys ride through every read and write untouched. The watcher names the file and the host's tile files and pushes `tiles:changed`, with the tiles whose text changed, for a change the app did not write itself; the open host flushes the save it owes, reloads, and shows the file, and each named tile merges the change in place — most recent wins, and a completed local drag never silently reverts. A busy gesture holds the document's reload from the press itself until the settle. The host lock lives in the document: a settings surface sets it through the store, which writes the document when the value changes.

**The configuration** (`state.json`). The SidePane's nexus-wide configuration, the page-wide tab and the capped custom tabs, belongs in `state.json`, which the held tree reads into its `config`, so a tab host's board list is read from the tree as every host's is. The cap's guard belongs at the create channel when it exists; a foreign file over the cap reads inert rather than failing.

**Warmth.** Per-tab warmth for the SidePane — folds, scrolls, editor state — is per-machine and in memory through the existing warm seam keyed by the tab's host chain, capped by the same `capSet` the active-tab cache uses and sized by the existing Active Tab Cache setting. No second cache, no second setting, nothing persisted. This is the SidePane arc's first task.

### The SidePane

The shape is decided; nothing of it is built.

- `SidePane` hosts a tab strip and one `TileHost` per tab, on the `WindowTabStrip` precedent: the page-wide tab and the custom tabs. Selection-aware kinds read the store's selection themselves; the host binding does not thread it.
- A 240–420px pane is narrower than the stacking width (480px), so a SidePane board draws as one column and answers no arrangement gesture; it is arranged from a wider surface.
- The document is Nexus content, cross-device, never `local_state`. Custom tabs are user-created and capped; the page-wide tab is reserved.
- A **panel** tile is a menu surface (`MenuSurface`) standing on a tile: a properties panel, a backlinks panel, a list. The recipe takes it as a kind whose surface is a menu. A backlinks kind reads the content index's relationship rows, which carry each link's kind and count, the seam Linked-From was gated on.
- The Page Window's own side pane and the shell SidePane stay distinct until a properties kind exists; then the Page Window's could become a one-tile panel.

### Why the Document Is a File of Its Own

The document left the identity sidecar in July 2026 to retire a whole-file lost update between a debounced layout save and a banner write, and an interim `_blocks.json` was reverted for "one file, one entity" once write-echo suppression landed. It returned as a file because cross-device is required and `nexus.db` is device-local; it returned as its own file because `_space.json` and `homepage.json` have no schema, four writers rebuild them whole, two write them unlocked, and the layout debounce would make the document the hottest writer on the file the watcher's echo window hides. The per-machine rows that held each layout were moved into the files once on the Mac's first open and the row family retired; a machine that never opened the Nexus on that build arranges its layouts again, or copies them by hand from its `nexus.db` into the host's `_tiles.json`.

### Sequenced Work

- The SidePane itself: the tab strip, the reserved and custom tabs, the create and remove flow, per-tab warmth through the warm seam.
- Panel kinds (properties, backlinks, list) and webpage as a surface kind (`type: 'webpage'`; the surface exists as MarkdownPM's embed).
- A webpage embed tile sized taller than the current window renders at the window's fit cap, and a drag on its strip persists the capped height over the stored one. Seeding the press from the stored height keeps the store but makes the live drag stop tracking the pointer inside a short window; the ruling is whether the cap speaks only about display.
- A Space folder whose sidecar syncs in before its `_tiles.json`: the open-time re-mint gates on the document's presence, so a document arriving later keeps the source's view-config ids. The sync arc decides whether a folder lands ordered; if not, the re-mint needs a second trigger on the document's arrival.

### Prospects

- **Panels as docked windows.** Each SidePane panel a `WindowBase` docked to the right edge, so window and panel are one thing sized by one primitive and docking is a clamp; move, undock, and a footer come free. The cost is that the shell's SidePane is a `paneSlide` on `--io` with a content clearance the whole interface reads, and windows deliberately redeclare `--io` so the shell's cannot leak in. Sound once panels exist.
- **The shell as a WindowBase shape.** Sidebar and SidePane as the shell's left and right panels, unifying `paneSlide`, the strips, `--io`, and width persistence under one owner. The deepest collapse on offer; it touches every consumer of the two clearance variables.
- **PickerMenu resizing** needs no plumbing: a centered picker resizes by mounting the frame's handles as its children.
- Tile conversions both ways, embed banners, widget tiles, auto-grow markdown tiles, layout undo, root-level hosts — [[SurfacePM]]'s own Pending and Prospects.

### Rejected

- **Free placement.** A canvas of `useResizable` boxes with collision loses the row-fills-surface invariant a narrow pane depends on and reintroduces compaction. The split tree stands.
- **Tile edges through `useResizable`.** A boundary between neighbors is not a box; the tree ops are the geometry.
- **A "resizable" prop on PickerMenu.** The host mounts the frame directly; a prop would be a passer.
- **MarkdownPM embeds becoming tree-driven.** The document is their layout.
- **Disk wins over a pending local save on a live-reload push.** It discards the user's own last action; the local write lands first and disk is then read.

### Lessons Carried

- Two geometry problems, one gesture vocabulary: fold engines and handles, never owners.
- A hold-the-push rule keyed on gesture state covers the whole gesture — the press before activation and the reads a reload has in flight when the gesture begins.
- A decision made at a drop and committed at the settle's end must also commit when the surface unmounts in between.
- A recipe's schema field needs a reader, or a fourth kind compiles clean and parses to null; `knownTile` derives from the table for that reason.
- A per-machine row is acceptable for chrome; a layout is content and migrates.
