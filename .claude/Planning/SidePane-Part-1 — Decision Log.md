## SidePane Part 1 — Decision Log

### The SidePane

The SidePane is the right-hand pane of the Pommora shell: a docked glass surface that slides in from the window's trailing edge, resizes by a drag on its leading strip, and holds a strip of tabs, each tab one panel. It is the app's persistent secondary surface — what stays beside the content rather than opening over it — and it is the counterpart to the sidebar, which holds the Nexus's structure while the SidePane holds what's true of whatever the content pane currently shows.

Each tab carries a **type**, and the type system is what Part 1 delivers. Types divide into two families. **Standard types** ship with the app under reserved names — pages, CLI, search, and a future AI panel among them — and each may carry its own pre-configured files and templates, so a standard tab's contents can be seeded from something the app provides rather than assembled by the user. **Custom tabs** are user-created and are tile surfaces: the same block-like tile mechanism the Homepage and Spaces already use, mounted through `TileHost` and stored as a tile document, so a custom tab is arranged by the same drag gestures and holds the same tile kinds as any other tile host. Storage keeps the two apart where the distinction requires it. The list of standard types is open by design — adding one is a declaration, not an excursion through the system.

The configuration is nexus-wide and lives in the Nexus, under `.nexus/interface/`: which tabs exist, what each holds, and the documents behind the custom ones. It travels between devices with the rest of the Nexus. What stays with the machine is what is true of the display rather than the Nexus — the pane's width and whether it is open — which remain in the existing per-machine device preferences alongside the sidebar's width.

The pane's chassis already exists and works: it opens, slides, resizes, remembers its width, and reserves its clearance from every content surface. Its body is empty. Part 1 gives it a body.

Alongside that, the word *Inspector* leaves the codebase and the documentation entirely, replaced by *SidePane*, and the watcher stops treating an unrecognized file under `.nexus/` as grounds for re-walking the whole Nexus.

- **Core Value:** a tab-type system for the pane beside the content, where a standard type is one declaration with its own template and a custom tab is a tile surface the user arranges, configured once per Nexus and carried between devices.
- **Success Criteria:** the SidePane opens onto a tab strip carrying both families; a new standard type is added by one declaration and seeds from its template; a custom tab mounts a tile surface from a document under `.nexus/interface/`; the `pages` tab tracks the content pane's selection and shows that page's properties; the word *Inspector* returns nothing in a case-insensitive search of code and documentation; and writing to `.nexus/interface/` never triggers a full Nexus walk.

---

### Sources

- `Core/Interface/SidePane/SidePane.tsx` — the whole current pane: 14 lines, exports `InspectorPane({ open })`, renders a `GlassPane` wrapping an empty `<div className="inspector-body" />`.
- `Core/Interface/SidePane/side-pane.css` — the pane's placement, width, z-index, and the resize strip's band; every selector is `inspector-*`.
- `Core/Interface/App.tsx` — composes the shell; holds `inspectorOpen` as React local state (L54), owns the resize frame (L63-68), sets `--inspector-width` (L113), and mounts the pane (L178).
- `Core/Session/layoutSlice.ts` — `INSPECTOR_WIDTH` bounds 240/300/420 (L35), `inspectorWidth` and its setter, `persistPaneWidths` writing the `panes` device pref (L71-74). `PER_NEXUS` (L42-48) resets these on a Nexus switch.
- `Core/Settings/devicePrefs.ts` — `panes?: { sidebar?: number; inspector?: number }` (L9); the file's opening line states why pane widths are per-machine.
- `Core/Session/nexusSlice.ts` L167-168 — seeds `inspectorWidth` from the stored pref on open.
- `Core/Interface/styles.css` L89-104 — `--inspector-clearance`, `0px` closed, `--app-inset + --inspector-width` open; `--content-start-right` derives from it.
- `Core/Interface/interface.css`, `Core/Interface/Header/content-banner.css`, `Core/Navigation/nav-view.css`, `Core/MarkdownPM/markdown-pm.css`, `Core/Interface/Toolbar/toolbar.css` — the five consumers of `--inspector-clearance` / `--inspector-width`.
- `UIX/Theme/stack.ts` L11-12 and `UIX/Theme/theme-vars.css.ts` L164-165 — the z-order entries and the CSS variables derived from them.
- `Core/Navigation/useNavThumbnails.ts` L14 — carves the pane's rect out of a nav thumbnail by querying the string `'.inspector-glass'`.
- `Core/Interface/Toolbar/Toolbar.tsx` L94 — the toolbar's toggle, `panel-right` icon, title `'Inspector'`.
- `UIX/Windows/WindowActions.tsx` — the floating windows' toggle: `inspectorOpen`, `onToggleInspector`, `title="Inspector"`.
- `Core/Interface/Windows/PageWindow.tsx` L82, L108-112, L163-176 and `Core/Interface/Windows/NavWindow.tsx` L84, L142-176 — the second surface sharing the word: a `WindowBase` `right` slot under `windowId: 'window-inspector'`, mounting `PropertyPanel`.
- `Core/Properties/PropertyPanel.tsx` — the built properties surface those windows mount; the page panel's starting point.
- `UIX/Windows/window-panel.tsx` L17-18, L42, L54 — window side-panel widths live in a module-level `Map`, in memory, never persisted.
- `Core/Nexus/watchPatch.ts` L125-144 — `classifyEvent`'s `.nexus` branch: six named arms, then `return { kind: 'full-refresh' }`. L187 — one `full-refresh` in a batch discards every other patch in it. L238 — `tiles-leaf` applies as `'ok'`, a no-op.
- `Core/Nexus/watchSettle.ts` L24-36 — `tileBodyUnder`, which drops tile bodies before the classifier sees them. L57-68 — `syncIgnoredUnder`, the watcher's ignore filter; it does not exclude the `.nexus` journals.
- `Desktop/FileWatch/watcher.ts` L44-47, L95-112 — arms chokidar with that filter; on `'refresh'` runs `refreshAssetMap` + `refreshAfterWrite`.
- `Core/Nexus/liveTree.ts` L31-34, L45-51 — `refreshAfterWrite` bumps the epoch and calls `refreshTree`, which is `readNexus(root)`: a complete re-walk.
- `Core/Paths/paths.ts` L58-77 — `HOMEPAGE_HOST_DIRNAME`, `tileHostDir`, `TILE_DOC_FILENAME`, and the `NEXUS_CONFIG_FILES` registry; the `.nexus/homepage/` precedent in full.
- `Core/Paths/exclusion.ts` — `manifestAdmits` and `neverWatched`; what the walk and the manifest admit under `.nexus`.
- `Core/Tiles/tiles.ts` L52-64 — `TileHostRef = { kind: 'homepage' } | { kind: 'space'; id }`, `tileHostKey`, `coerceTileHost`. The union a custom panel joins.
- `Core/Tiles/tilesFile.ts` L17-28 `hostDir`, L138-149 `listTileHosts` — the two site that resolve a host to a folder.
- `Core/Contract/bridge.ts` L170-191, L269 — the eleven `tiles:*` channels and the `tiles:changed` push.
- `Core/Tiles/TileHost.tsx` L105 — takes one prop, `host`; L319-336 `renderTile` passes no warm seam.
- `Core/Tiles/TileGrid.tsx` L194, L206-219 — width measured by a `ResizeObserver`, never assumed; the narrow-pane viability evidence.
- `Core/Tiles/tile-grid.css` L47-52 — the tile handle's 6-7px overhang outside the tile's left edge.
- `Core/Tiles/Surfaces/view-tile.css.ts` L117 — `listPane` minimum 150px, the one real narrow-width squeeze.
- `Core/Tiles/tileKinds.tsx` L18-28, L37-80 — `TileRenderContext` (no `warm` field) and the total `TILE_SURFACES` map over `TileType`.
- `Core/Tiles/tileDoc.ts` L8-16, L25-43 — `EMPTY_DOC`, the lenient coercion, the read-modify-write, and the `.bad-<id>` quarantine.
- `Core/Tiles/useTileDoc.ts` L94-133 — the reload path, its four drop conditions, and the busy gate that defers a push mid-gesture.
- `Core/Interface/Windows/WindowTabStrip.tsx` L26-38 — two props, everything else read from the store, hard-bound to `pageWindow`.
- `Core/Navigation/tabClose.ts` L16 and `Core/Navigation/tab-base.css` — the genuinely shared tab pieces, used by both existing strips.
- `Core/MarkdownPM/warmSeam.ts` L13-28 — `mapWarmSeam`, the existing warm seam; its consumers are the Glance pane and the floating windows, not `TileHost`.
- `Core/Files/writeEcho.ts` L12-38 — `recordWrite` / `isRecentWrite`, the two-second echo window.
- `Desktop/FileWatch/watcher.ts` L62 — where the app's own writes are dropped before the batch.
- `Core/Files/atomicWrite.ts` L26-36 — `landBytes`, the sync-arrival write that does *not* stamp, so a synced-in change reaches the classifier.
- `Core/Settings/settings.ts` L13-20 — `updateNexusConfig`, the single funnel every `.nexus` config write goes through; it does not mkdir.
- `Core/Nexus/migrateConfig.ts` L19-32 — `ensureConfigLayout`, which mkdirs the config folders on every Nexus open.
- `Core/Nexus/readNexus.ts` L41-46, L290-296, L366 — how `homepage.json` is read on the walk and lands on the tree.
- `Core/Nexus/tree.ts` — `NexusTree`; a field here is how a config reaches the renderer without a channel.
- `Core/Sync/Arrival/jsonMerge.ts` L10-27 — `isMergedJson` (every `.json` under `.nexus/`) and `mergeDepthFor` (four cases, then top-level granularity).
- `Core/Sync/Arrival/land.ts` L76-81, L95-117 — the arrival write path and `announceTile`'s second `tiles:changed` lane.
- `Core/Contract/serve.ts` L16-29 — where a new handler module would be spread in.
- [[TilesV2-Spec]] — the standing spec; its *The Inspector* section (L45-53) and *Sequenced Work* (L61) describe this arc's intended shape.
- [[InterfacePM]] — the surfaces document; L8 and L84 describe the pane and both go stale here.
- [[ContextPM]] L9 — names the standing spec and its `.nexus/inspector/<id>/` path.
- [[CorePM]] L154 — the device-preferences table, naming the Inspector width.
- [[PommoraUIX]] L10, L163, L166, L288, L392 — the vocabulary table and three token/material rows naming the inspector.
- [[InteractionPM]] L28, L34, L40, L42 — the `--io` progress, PaneSlide, and Resize Frame entries, all naming the inspector.
- [[PropertiesPM]] L111 — names "the page inspector" as a Value Picker surface.
- [[Codebase Audit — Report]] L149 — "The main window's inspector is a live empty pane, and the panel built for it already works."

---

### Decisions

#### A — Vocabulary

- **A-1:** [confirmed] *Inspector* is replaced by *SidePane* throughout application code and documentation. Nathan's ruling, set in stone.
- **A-2:** [confirmed] The rename covers **both** surfaces that carry the word today — the shell pane and the floating windows' frontmatter panel. Nathan confirmed when the collision was put to him.
- **A-3:** [open] The floating windows' panel needs a name that does not collide with `WindowBase`'s existing "side panel" slots. `PropertyPanel` already names the component it mounts, so the toggle and slot could simply take that word. Nathan's call.
- **A-4:** [confirmed] Scope: 109 hits across 17 non-generated code files, 55 across 11 documents. `Desktop/out/` and `.claude/scripts/comment-*.json` are generated and excluded.
- **A-5:** [confirmed] Four rename couplings escape the typechecker and must be swept by hand: the DOM query string `'.inspector-glass'` (`useNavThumbnails.ts` L14); the CSS custom properties `--inspector-width`, `--inspector-clearance`, `--z-inspector`, `--z-inspector-resize` across seven files; the persisted JSON key `devicePrefs.panes.inspector`; and the `windowId` string `'window-inspector'`.
- **A-6:** [confirmed] Renaming `devicePrefs.panes.inspector` drops each machine's stored width to the 300px default once, on the first open after the change. Accepted — a one-time reset of one number, and no migration is worth writing for it.
- **A-7:** [confirmed] `'window-inspector'` is free to rename: `window-panel.tsx` L17-18 holds side-panel widths in a module-level `Map`, so the string keys nothing on disk.

#### B — Placement and State

- **B-1:** [confirmed] The SidePane's configuration and its panel documents live under `.nexus/interface/`. Nathan's ruling, set in stone.
- **B-2:** [confirmed] Pane **width** stays per-machine in `devicePrefs.panes`. It does not move into `.nexus/interface/`. This holds the Cross-Platform ruling that per-machine rows stay home (d95fb11d7), and matches the sidebar's width sitting beside it.
- **B-3:** [assumed] Whether the pane is **open** is also per-machine, and becomes persistent rather than resetting each launch. Today it is React local state in `App.tsx` L54 and is lost on every quit. Needs Nathan's yes on both halves: per-machine, and persisted at all.
- **B-4:** [assumed] Which tab is **active** is per-machine too, by the same reasoning — it is where this display was left, not a fact about the Nexus.
- **B-5:** [open] The shape of `.nexus/interface/`. The `.nexus/homepage/` precedent is one folder holding a config file, a `_tiles.json`, and the tile bodies beside it. A SidePane with several custom tabs needs either a folder per tab or one folder holding several documents; `TileHost` resolves a host to a folder, which pushes toward folder-per-tab. Settles once the Tiles exploration reports.
- **B-6:** [confirmed] Three documents name three different homes for this configuration, all superseded by B-1 and all requiring removal: `.nexus/inspector/<id>/` ([[ContextPM]] L9), `.nexus/tiles/<tab>/` ([[TilesV2-Spec]] L35), and a reserved key inside `state.json` ([[TilesV2-Spec]] L41, [[InterfacePM]] L84).

#### C — The Watcher

- **C-1:** [confirmed] An unrecognized file under `.nexus/` causes a full re-walk of the entire Nexus. `classifyEvent` runs a six-arm allowlist over `.nexus` paths and falls through to `full-refresh` (`watchPatch.ts` L143); one such event discards every other patch in its batch (L187); the watcher then runs `refreshAfterWrite`, which is `readNexus(root)` (`liveTree.ts` L31-34, L45-51).
- **C-2:** [confirmed] **The app's own writes do not pay this cost.** `recordWrite` stamps every path the app writes, and the watcher drops an event on a path stamped within the last two seconds before it reaches the batch (`Desktop/FileWatch/watcher.ts` L62, `Core/Files/writeEcho.ts` L12-38). The full re-walk therefore falls on **foreign writes only**: a hand edit, and a change arriving from another device — which is precisely the traffic `.nexus/interface/` exists to carry, since sync arrivals write through `landBytes`, which does not stamp (`Core/Files/atomicWrite.ts` L26-36).
- **C-3:** [confirmed] The pessimistic default is correct for `.nexus/contexts/` and wrong as a rule for the rest of `.nexus/`. Contexts and Spaces are tree structure — a new Space folder, a rename, a deletion each genuinely restructure the tree, and only an existing Space's sidecar has a cheap patch (`space-meta`). Nothing else under `.nexus/` carries tree structure.
- **C-4:** [confirmed] **Built.** The default is inverted: allowlist the paths under `.nexus/` that genuinely bear tree structure — `.nexus/contexts/`, `nexus.json`, `properties.json` — and let everything else classify as inert rather than catastrophic. An unknown config file then costs nothing and `.nexus/interface/` needs no special pleading. The tradeoff, stated plainly: the failure mode flips from *slow* to *stale* — a tree-affecting file added later would go unnoticed rather than loudly re-walk. The set of tree-bearers is small and enumerable, which is what makes the trade defensible. Nathan signed this off and it is implemented in `watchPatch.ts`: `bearsStructure` names `.nexus/contexts/`, `nexus.json` and `properties.json`, and the branch's closing line returns `ignored` for everything else. The now-redundant explicit arm for the homepage host directory came out with it. **A named arm for `.nexus/interface/` is still required** (C-5) — inert means cheap, not heard.
- **C-5:** [assumed] The SidePane's own configuration gets a named arm that applies as `'ok'` and pushes to the renderer on its own channel, on the `tiles-leaf` precedent (`watchPatch.ts` L238): its state is renderer state, not tree state, so the tree needs no patch at all.
- **C-6:** [confirmed] `.nexus/interface/*` syncs by default. `manifestAdmits` admits everything under `.nexus/` except the two journals, thumbnails, and database files, and `syncIgnoredUnder` does not exclude it. This is the wanted behavior under B-1, and is recorded so it is not rediscovered as a surprise.
- **C-7:** [open] Whether custom panel tile **bodies** under `.nexus/interface/` should be filtered before the classifier the way `tileBodyUnder` filters the Homepage's. [[TilesV2-Spec]] L63 records that synced tile bodies are not watched and show stale text until a reload; inheriting that is a known cost. Note that `tileBodyUnder`'s homepage arm is a **depth-≥3 catch-all** over any extension (`watchSettle.ts` L27-30) — a config folder that wants its files classifiable should not be handed to it wholesale.
- **C-8:** [confirmed] The folder's own `addDir` / `unlinkDir` event needs its own `ignored` arm, on the precedent at `watchPatch.ts` L127, or the directory event itself falls through to `full-refresh`.

#### D — Tab Types

Part 1's deliverable is the **tab type system** itself, not any one panel. The system distinguishes **standard** tab types, which ship with the app and may carry their own pre-configured files and templates, from **custom** tabs, which the user creates and which are separated in storage where the distinction requires it. Nathan's ruling, and the reframe this section is built on.

- **D-1:** [confirmed] A tab carries a **type**. Types divide into **standard** — app-provided, reserved, named — and **custom** — user-created.
- **D-2:** [confirmed] Standard types named so far: **pages**, **CLI**, **search**, and a future **AI** panel. The list is open; the system must take a new standard type as one declaration.
- **D-3:** [confirmed] Standard types may ship **pre-configured files and templates**. A standard tab's contents can therefore be seeded from something the app provides rather than built entirely in code.
- **D-4:** [confirmed] Custom tabs are tile surfaces on the existing tile mechanism, mounted through `TileHost`.
- **D-5:** [open] **What a standard tab is mechanically** — the load-bearing call this section turns on. Three candidates, put to Nathan: a built React surface with no document; a tile document seeded from a shipped template and thereafter as editable as any custom tab; or a hybrid in which each standard type declares which of the two it is. The hybrid is the standing recommendation, since `pages` is tile-shaped while `CLI` and `search` plainly are not.
- **D-6:** [open] How storage **separates** standard from custom — reserved ids in one shared folder, or two folders. Follows from D-5.
- **D-7:** [assumed] The `pages` standard tab is built from `PropertyPanel`, which already renders a page's contexts and properties in the two floating windows, made to follow the content pane's selection rather than a passed page. Resolves [[Codebase Audit]] L149 against [[TilesV2-Spec]] L53's "stay distinct until a properties kind exists" — the two disagree, and reuse wins under the once-written-once-defined rule.
- **D-8:** [open] Which standard types Part 1 actually **builds**, versus declares and leaves empty. The system is the deliverable; `pages` is the natural proof since its surface exists. [[FrameworkPM]] L27 parks the AI panel and search in v0.8.0.
- **D-9:** [open] Whether custom tabs are capped, and at what number. [[TilesV2-Spec]] L41 records a cap of six, but the constant it claims to declare does not exist in any form.
- **D-10:** [open] Whether standard and custom tabs share one strip, or standard ones hold a fixed region the custom tabs sit beneath.

#### E — The Tile Seam

- **E-1:** [confirmed] `TileHost` takes one prop, `host: TileHostRef` (`TileHost.tsx` L105). No width, no layout, no selection. Everything else comes from the store and the document, so mounting one in a 240-420px pane needs no new plumbing.
- **E-2:** [confirmed] Nothing in `TileHost` or `TileGrid` assumes a wide grid. Width is measured by a `ResizeObserver`, never assumed (`TileGrid.tsx` L194, L206-219); the only grid-level floor is a height (`tile-grid.css` L1-5); `TILE_MIN_PX` is 64, so even a 240px pane fits a two-up row, and a narrower drag is simply refused rather than breaking (`Layout/ops.ts` L193). A vertical stack of full-width bands is the model's degenerate, fully-supported case.
- **E-3:** [confirmed] Two narrow-width issues are real and must be designed for. The tile handle hangs 6-7px *outside* the tile's left edge (`tile-grid.css` L47-52) and today borrows that gutter from `.detail-body`'s padding, so the pane must supply its own left inset. And `ViewTile`'s two-pane mode sets `listPane` to a 150px minimum (`Surfaces/view-tile.css.ts` L117), leaving under 90px of body in a 240px pane.
- **E-4:** [confirmed] A third `TileHostRef` kind touches **thirteen** named sites, not the seven [[TilesV2-Spec]] L33 claims: the union (`tiles.ts` L52), `tileHostKey` (L54-56), `coerceTileHost` (L58-64), `hostDir` (`tilesFile.ts` L17-29), `listTileHosts` (L138-148), `tileHostAt` (`watchPatch.ts` L96-103), the classify arm, `tileBodyUnder` (`watchSettle.ts` L22-35), `announceTile` (`Sync/Arrival/land.ts` L76-81), a path helper (`paths.ts` L57-68), the per-kind lock UI, the per-kind mount, and `tiles.test.ts` L153-157.
- **E-5:** [confirmed] Two of those thirteen fail **silently** rather than loudly, and are the traps to write down: `tileHostKey` is a ternary, so an unhandled kind keys as the string `space:undefined` and collides; and `coerceTileHost` is the IPC gate, so an unhandled kind returns `null` and every `tiles:*` ask fails with "Unknown tile host."
- **E-6:** [confirmed] `Core/Contract/bridge.ts` needs **no** change for a new host kind — it only references the type (L13, L170-192, L269). Nor do `handlers.ts`, `cacheSlice.ts`, `useTileDoc.ts`, `tileKinds.tsx`, `tileDoc.ts`, `TileGrid.tsx`, or `Layout/*`. The seam is cheaper than the spec implies in this respect and dearer in E-4's.
- **E-7:** [confirmed] `WindowTabStrip` is **not** reusable as-is. It takes two props and reads everything else straight from the store, hard-bound to `pageWindow` (`WindowTabStrip.tsx` L26-38). [[TilesV2-Spec]] L49's "on the `WindowTabStrip` precedent" is a pattern to copy, not a component to mount. What *is* genuinely shared is `useTabClose` (`Core/Navigation/tabClose.ts` L16) and the `tab-base.css` geometry, both already used by two strips.
- **E-8:** [confirmed] `Core/Tiles/tileCache.ts` does not exist. [[TilesV2-Spec]] L42 names it and calls per-tab warmth "the inspector arc's first task"; it is unbuilt. The material to build from is `mapWarmSeam` (`Core/MarkdownPM/warmSeam.ts` L13-28) and `capSet`, as the Glance pane and the floating windows already do.
- **E-9:** [confirmed] No per-host tile warmth exists at all. `TileRenderContext` has no `warm` field (`tileKinds.tsx` L18-28) and `TileHost`'s `renderTile` passes none (L319-336). `PageTile` *accepts* a `warm` prop (`Surfaces/PageTile.tsx` L47) that only the Glance pane supplies. A tile board re-fetches its document and every markdown body on each mount.
- **E-10:** [assumed] Per-tab warmth is a **Prospect, not Core**. A SidePane tab remounting cheaply is a comfort; the system working is not gated on it, and E-9 shows the seam needs a new field on `TileRenderContext` to carry it. Contradicts [[TilesV2-Spec]] L42's "first task" ordering, deliberately.
- **E-11:** [confirmed] `WebTile` lives in `Core/Tiles/Surfaces/` but is **not** a tile kind — it is a MarkdownPM embed surface, absent from `TileType`, `TILE_KINDS`, and `TILE_SURFACES`. Recorded so it is not mistaken for a fourth kind.
- **E-12:** [confirmed] The tile document is lenient by construction: unmodelled top-level keys ride through a write (`tileDoc.ts` L34), every entry schema is `z.looseObject`, and an absent key *is* the default. A corrupt document is renamed aside rather than failing, and the watcher ignores the renamed file. A standard type's template can therefore add fields without a migration.

#### F — The `.nexus/interface/` Plumbing

- **F-1:** [confirmed] `NEXUS_CONFIG_FILES` already takes a nested path as a slash-bearing value — `homepage: 'homepage/homepage.json'` and `crops: 'assets/crops.json'` (`paths.ts` L70-77). A new nested config is an entry in that map plus a dirname constant, not a new mechanism.
- **F-2:** [confirmed] `updateNexusConfig` (`Core/Settings/settings.ts` L13-20) is the single funnel every `.nexus` config writer goes through, and it **does not create its parent directory** — `write-file-atomic` writes its temp file in the target's own folder. `.nexus/interface/` therefore needs a `mkdir` in `ensureConfigLayout` (`Core/Nexus/migrateConfig.ts` L19-32, beside the `tileHostDir` line), or its writer must mkdir itself the way `writeNavigationState`, `writeStateOrder`, and `writeTileDocAt` each do.
- **F-3:** [confirmed] **Every `.json` under `.nexus/` is three-way merged on sync arrival**, not last-writer-wins: `isMergedJson` matches on the `.nexus/` prefix alone (`Core/Sync/Arrival/jsonMerge.ts` L10-12). `.nexus/interface/*.json` inherits this with no change to any file.
- **F-4:** [assumed] But `mergeDepthFor` (`jsonMerge.ts` L14-27) has a case only for `settings.json`, `state.json`, `properties.json`, and `crops.json`; anything else falls to `{}`, which merges at **top-level-key granularity**. A tab list is exactly the nested shape that suffers there — two devices each adding a tab would have one list overwrite the other rather than merging. The SidePane's config needs its own `mergeDepthFor` entry. This is the finding most easily missed and the one with the worst failure mode.
- **F-5:** [confirmed] A config reaches the renderer for free by becoming a field on `NexusTree` (`Core/Nexus/tree.ts`), read on the walk through `readConfig` (`readNexus.ts` L290-296) and patched by its watcher arm — that is the whole of how `homepage.json` works, and it has **no channel of its own**. A heavier, lazily-loaded surface takes the tiles route instead: its own asks, a handler module spread into `Core/Contract/serve.ts` L16-29, and a push.
- **F-6:** [open] Which of those two routes the SidePane config takes. The tab list is small and wanted at startup, which argues for the tree field; the custom tabs' tile documents are heavy and lazy, which is already the tiles route. A split — the tab list on the tree, the documents through `tiles:*` — is the standing recommendation and needs Nathan's yes.
- **F-7:** [confirmed] `homepage.json` is read with hand coercers rather than zod (`readNexus.ts` L41-46), while `crops.json` and the sidecars use zod schemas in `Core/Nexus/schemas.ts`. Either is precedented; the tab list's shape is structured enough to argue for zod.
- **F-8:** [confirmed] Naming caution: `Core/Interface/` already exists as a source folder and is unrelated to a `.nexus/interface/` config folder. The architecture graph guards (`Core/Contract/engineGraph.test.ts`, `Core/manifest.test.ts`, `Desktop/hostGraph.test.ts`) constrain who may import `Core/Paths` and `Core/Files`, so where the reader and writer live is a real decision rather than a filing one.
- **F-9:** [confirmed] Twelve test files sit on the paths this touches and will need updating or mirroring: `migrateConfig.test.ts`, `watchPatch.test.ts`, `watchSettle.test.ts`, `watcher.test.ts`, `exclusion.test.ts`, `jsonMerge.test.ts`, `land.test.ts`, `readNexus.test.ts`, `tiles.test.ts`, and the three graph guards.

#### G — Documentation Reconciliation

- **G-1:** [confirmed] [[InterfacePM]] L8 is false and must be rewritten: it states that the sidebar and the inspector are both `Core/Interface/SidePane/SidePane.tsx`, "a docked glass pane that takes its side, its width, and its resize floor and ceiling." The sidebar is built inline in `App.tsx` from `Surface` and `paneSlide`; `SidePane.tsx` takes only `open`. No shared side-pane component exists.
- **G-2:** [confirmed] [[InterfacePM]] L84 and [[TilesV2-Spec]] L41 claim `MAX_INSPECTOR_TABS` and `INSPECTOR_STATE_KEY` are declared in `shared/tiles.ts`. Neither constant exists, and neither does that file. Both passages need rewriting against whatever D-5 settles.
- **G-3:** [confirmed] [[TilesV2-Spec]] L53 names the floating windows' panel `PagePanel`. No such component exists; it is `PropertyPanel`.
- **G-4:** [confirmed] [[Codebase Audit — Report]] L149's finding is resolved by this arc and is deleted rather than amended, per the project's documentation standard.
- **G-5:** [confirmed] Eleven documents carry the word and need the vocabulary pass: [[ContextPM]], [[FrameworkPM]], [[HistoryPM]], [[InterfacePM]], [[CorePM]], [[InteractionPM]], [[PropertiesPM]], [[PommoraUIX]], [[TilesV2-Spec]], [[Codebase Audit — Report]], [[Development-Environment]].
- **G-6:** [open] Whether [[HistoryPM]]'s 17 hits are rewritten. History records what happened under the name it happened under; the other ten documents describe what is true now. Nathan's call.

#### H — Prior Art

Six shipping systems solve some part of this; the findings below are patterns to borrow, and each names the consequence its author lived with.

- **H-1:** [confirmed] **A tab entry and a tab's contents are separate things, and the strip should hold only pointers.** Obsidian Canvas is the cleanest instance: a freeform spatial surface is a *file* (`.canvas`, an open published spec holding nodes with x/y/width/height and edges), while the workspace leaf stores only `type: "canvas"` and the document's path. Applied here, a custom tab stops being a second family and becomes **one standard type whose implementation is "render the document at `ref`."** This is a better answer than D-5's three candidates and supersedes them.
- **H-2:** [confirmed] VS Code and Obsidian both resolve a panel by a **declared type key looked up in a registry**, with built-in and third-party members differing only in where the declaration lives — in code with a constructor, or in a manifest. Nothing downstream branches on provenance. "Standard versus custom" is a field on the entry, not a separate mechanism.
- **H-3:** [confirmed] **A persisted type key can never be renamed.** VS Code issue #90414: view-to-container assignments are cached per user forever, because a user's own dragging must outrank a shipped default, so relocating a view in an update silently no-ops for every existing user and the only escape is a new id. The standard type names are chosen once and are permanent.
- **H-4:** [confirmed] Reserved names are **a closed union in the contract, not a naming convention**. VS Code enforces only uniqueness and a charset; restricted surfaces are gated explicitly, never by id prefix.
- **H-5:** [confirmed] **Seed by overlay, not by copy.** Sublime, Zed, and VS Code settings all layer a shipped default under the user's file and merge per property, so shipped improvements reach every key the user did not override. Home Assistant's take-control copies the dashboard instead, and its own documentation states the copy "is no longer automatically updated" with no supported revert. Grafana's third path — editable but re-provisioned on a timer — silently destroys user edits. If a standard type must ship a concrete file, the shipped base is retained and version-stamped so both a real Reset to Default and a three-way merge stay possible; Debian's `ucf` is the reference, and its lesson is that three-way merge is only available to someone who deliberately kept the baseline.
- **H-6:** [confirmed] **Whole-file last-write-wins loses a tab.** Two devices each adding a tab is the canonical case: at file granularity one tab is destroyed (Obsidian's Workspaces plugin reportedly does exactly this), while per-property last-write-wins keyed by a stable id survives it. This is the concrete failure F-4's missing `mergeDepthFor` entry would produce, and it means the locked recency-first ruling holds **only if "section" means one tab entry rather than the whole file**.
- **H-7:** [assumed] Ordering wants **fractional indexing** — a position is a fraction between its neighbours, so two devices inserting at the same slot both survive in a consistent order with no coordination. Figma's choice, taken over a CRDT precisely because a central authority makes the extra machinery worthless. A plain integer index is the thing that forces a conflict.
- **H-8:** [confirmed] **Update beats delete on merge**, so a tab closed on one device returns if another device touched it concurrently. Automerge states this as a rule rather than a bug. Tombstones and a collection policy are required, not optional.
- **H-9:** [confirmed] **An unknown type must render blank and keep its entry.** A config synced from a newer build names types this build lacks; dropping the entry means the newer device loses the tab on the next write-back. Rendering blank already matches the project's placeholder rule.
- **H-10:** [confirmed] **Layout mostly does not sync, across every system examined.** VS Code syncs view layout but refuses to auto-merge it, handing the user a diff; JetBrains syncs no tool-window layout at all; Obsidian excludes `workspace.json` from vault sync and offers per-device config folder names as the deeper escape. The line each draws differently but draws: *the set of things that exist* may sync, *where they sit on this screen right now* does not. B-2's per-machine width is the same line, and B-3 and B-4 sit on the correct side of it.
- **H-11:** [confirmed] Obsidian hydrates a tab's view only once it becomes visible (`DeferredView`, since v1.7.2) rather than constructing every tab at startup. Worth copying for a strip whose tabs mount tile hosts.


---

### Core (must-have)

- The vocabulary rename, both surfaces, all four hand-swept coupling classes.
- The watcher fix, so `.nexus/interface/` writes cost nothing.
- `.nexus/interface/` declared, read, and written, with its watcher arm and its renderer push.
- The tab type system: the standard/custom split, a standard type as one declaration, and its template seeding.
- The tab strip, carrying both families.
- Custom tabs: create, remove, and one `TileHost` mounted per tab from its document.
- At least one standard type built end to end as the system's proof — `pages` is the candidate, since its surface already exists.
- The documentation reconciliation.

---

### Prospects

- **The AI panel** — named as a reserved default now, built later; [[FrameworkPM]] L27 parks it in v0.8.0. Don't-foreclose: the default-panel family is a union with more than one member from the start, so a second one is an entry rather than a refactor.
- **Panel kinds as tile kinds** — a backlinks panel, a list panel, a properties panel standing on a tile, per [[TilesV2-Spec]] L51. Don't-foreclose: custom panels mount real `TileHost`s, so a new kind reaches them for free.
- **Live body reload for synced panel bodies** — inherits the Homepage's known gap ([[TilesV2-Spec]] L63); rides that arc rather than this one.
- **Panels as docked windows** and **the shell as a WindowBase shape** — [[TilesV2-Spec]]'s two standing Prospects, both unblocked rather than advanced by this arc.

---

### Out of Scope

- Deriving the watcher's leaf arms from the `NEXUS_CONFIG_FILES` registry. It would make adding a config file automatically cheap, but the registry maps names to paths, not names to behavior, so the change is larger than the problem it solves here. C-4 fixes the actual cost.
- The sidebar. It shares the pane vocabulary and the `paneSlide` motion, and unifying the two is a named Prospect in [[TilesV2-Spec]], not this arc.

---

### Considered & Rejected

- **A named classifier arm for `.nexus/interface/` alone**, on the `.nexus/homepage/` precedent — about five lines, exactly matching how the Homepage does it. Rejected in favour of C-4's inversion: it papers the problem over for one folder and the next folder repeats it, which is the outcome Nathan explicitly asked to avoid. The arm is still wanted (C-5), but as the push channel rather than as the cost fix.
- **Keeping the two inspector surfaces distinct** ([[TilesV2-Spec]] L53) rather than building the page panel from `PropertyPanel` (D-3). Rejected because the panel already renders exactly this in two places, and a second properties surface would violate the once-written-once-defined rule.

---

### Lessons

- An allowlist with a pessimistic fallthrough is correct only while its scope matches the set it protects. `.nexus/`'s fallthrough was written for `.nexus/contexts/` and inherited by every config file added since, one of which states in its own comment that it must never cost a walk.
