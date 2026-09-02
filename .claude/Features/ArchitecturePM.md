## Architecture

```
Architecture
├── The Shape of the App
├── The Nexus Layout
│   ├── II. Classification
│   ├── II. The Agenda Singletons
│   ├── II. Folder Exclusion
│   └── II. The Asset Directory
├── The Data Layer
│   ├── II. The Read + State Layer
│   ├── II. Mutations
│   ├── II. The Atomic-Write Contract
│   ├── II. The Device-Local Database
│   ├── II. The File Watcher
│   ├── II. Adoption
│   └── II. Persistence
├── The Process Boundary
├── The Renderer
├── What the Data Layer Leaves to the OS
├── Known Issues
└── Pending
```

The whole-app architecture guide: how the two processes divide the work, how data moves between them, and how each renderer domain sits on the same few seams. Per-domain depth lives in each domain's own document; this one is the map and the overview of how each part works in the codebase, and the home of the cross-cutting rules no single feature owns. The PRD carries the product-level storage model.[^1]

### The Shape of the App

Pommora is two programs sharing one window. The **main process** (`src/main/`) is the one that touches the computer: it reads and writes every file, owns the database, pops native menus, and creates windows. The **renderer** (`src/renderer/`) is the React app inside the window: it draws everything and holds the interface's working state, and it cannot touch a file directly. Between them sits a deliberately narrow **bridge** (`src/preload/`, typed by `src/shared/bridge.ts`): the renderer asks, main answers, and every ask is declared in one shared contract both sides compile against. Only main can act on the world, so every rule about files lives in exactly one process, and the renderer treats what main last confirmed as its cache — patching optimistically for responsiveness, with the confirmed state that follows agreeing with what was already drawn.

### The Nexus Layout

A Nexus is a single folder, opened through a picker and treated as canonical content. It can sit in iCloud Drive, Dropbox, or any synced folder for device-to-device sync.

```
// <Nexus>                               | • The picked folder — canonical content; syncs with the cloud
├── // .nexus                            | • App-internal config and the device-local database
│   ├── // assets                        | • The default asset directory — banners, files, thumbnails
│   ├── // contexts                      | • One folder per Context, one per Space beneath it
│   │   └── // <Context>
│   │       └── // <Space>
│   │           └── _space.json          | • The Space's identity, color, banner, and its own relation keys
│   ├── // homepage                      | • The Homepage's markdown-block bodies
│   ├── contexts.json                    | • The Context registry — order is display order
│   ├── crops.json                       | • Per-image framing, keyed by the image
│   ├── homepage.json                    | • The Homepage's banner and heading icon
│   ├── navigation.json                  | • Pins and favorites as ordered id arrays, plus the NavView banner
│   ├── nexus.db                         | • Device-local operational state and the content index
│   ├── nexus.json                       | • The Nexus id, creation stamp, and the Agenda registration
│   ├── properties.json                  | • The nexus-wide property registry
│   ├── settings.json                    | • Personalization, accent, excluded folders, the profile
│   └── state.json                       | • Top-level Collection order
├── // .trash                            | • Deleted entities, mirroring the chain they came from
│   └── // <Collection>
│       └── // <stamp>__<Page>           | • A deletion bundle — the artifact beside its record
│           ├── [<Page>.md]
│           └── _record.json
├── // <Collection>                      | • A Page Collection — identified by its sidecar, not its name
│   ├── // <Set>                         | • A Page Set, recursive to any depth
│   │   ├── // <SubSet>
│   │   │   ├── [<Page>.md]
│   │   │   └── _pageset.json
│   │   ├── [<Page>.md]
│   │   └── _pageset.json                | • Order and views
│   ├── [<Page>.md]                      | • A Page at the Collection root
│   └── _pagecollection.json             | • Schema assignment, order, views, open-in
├── // <Events>                          | • The Events singleton — registered by its sidecar's id
│   ├── [<Event>.md]                     | • EventID in frontmatter
│   └── _eventconfig.json
└── // <Tasks>                           | • The Tasks singleton — registered by its sidecar's id; flat
    ├── [<Task>.md]                      | • TaskID in frontmatter
    └── _taskconfig.json

// <app-support>                         | • Machine-specific; never syncs
└── pommora.json                         | • Last-opened Nexus, recent Nexuses, trash mode
```

Every sidecar's field shape is canonical in `src/shared/schemas.ts`; every on-disk name both processes speak is in `src/shared/nexusPaths.ts`, and every absolute path main builds comes from `src/main/paths.ts`.

#### II. Classification

Folder kind is decided by one resolver, `src/main/folderKind.ts`. At the Nexus root the sidecar filename discriminates — `_pagecollection.json`, `_taskconfig.json`, `_eventconfig.json` — so a folder is a Collection because it carries the Collection sidecar regardless of its name, and folders rename freely. Below the root, position alone decides: every non-excluded subfolder of a Collection or Set is a Set, at any depth, storing views in its sidecar wherever it sits while only a depth-1 Set is offered them.[^2] Collections and the two Agenda singletons live as siblings at the root with no wrapper folder. `.nexus/` and `.trash/` are hidden from the sidebar and from other tools by the dotfile convention, matching `.obsidian/`.

#### II. The Agenda Singletons

A Tasks or Events singleton is the folder whose config sidecar id matches the registration `nexus.json` holds. The folder names are renameable defaults, a Collection named "Tasks" is still a Collection, and no name is reserved. Registration is written once, at Nexus creation, when the two folders are seeded; reopening a Nexus never recreates folders its owner deleted, and a hand-made agenda config carries an id the record doesn't name and stays inert. A copy is the case the record can't settle alone — every ordinary duplication reproduces the registered id — so two root folders answering to one record register neither, a copy below the root is inert on depth and stays where it was filed, and a registered singleton found nested with its root slot empty is carried home on the next open.

Agenda items carry no content model yet: no fields, no create path, no read surface, and `NavRef` admits `task` and `event` while the tab resolver, the pin target, and search refuse them so a stored ref resolves to nothing rather than to a broken destination. Four decisions are settled and bind the work that builds them: Tasks and Events are Markdown, with the body as the description, so they inherit the page writers, the link cascade, and the editor; they enter the tree walk as their own top-level branch, giving every item a record, a nav key, and a search entry, while Collection-scoped consumers stay page-only; both kinds carry a built-in, non-deletable Status property tracking engagement rather than the clock; and EventKit sync is an opt-in mirror to the system Reminders and Calendar, an API-only translation that constrains nothing stored on disk.

#### II. Folder Exclusion

`excluded_folders` in `settings.json` takes anchored Nexus-relative paths, and exclusion is total for reading. One predicate (`src/main/exclusion.ts`) is honored by the read walk, the adoption pass, the watcher, the content index's corpus, and every cascade, so nothing under an excluded folder is read, shown, indexed, swept, or rewritten, and no enumeration descends into one. The single deliberate reach past it is Clear Exclusion Cache (`src/main/exclusionScan.ts`), which enters an excluded folder to remove Pommora's own bookkeeping — container sidecars and each page's identity key and `<Context>` keys; every other key a page holds, property values included, stays — stepping around the asset root and skipping the Agenda layer whole. Un-adopted folders are a different case: they stay outside the tree but are fully indexed and cascade-reachable.

#### II. The Asset Directory

One directory holds the assets entities point at — used for banners, nexus icon, embedded files, ect... — configurable to any folder in the Nexus and defaulting to `.nexus/assets`.[^3] The configured directory is excluded from content-adoption but is otherwise managed by the watcher the same way. A file landing there patches an in-memory filename list that the renderer resolves `[[File.png]]` against; nothing about it is stored except its name, which is what makes a sync eviction and re-download a non-event. Assets are served to the renderer over the read-only `nexus-asset://` scheme.

### The Data Layer

#### II. The Read + State Layer

The read side is one eager, read-only walk in main — `readNexus` — producing a pre-ordered `NexusTree` in a single pass, consumed by the renderer without re-sorting and held in its Zustand store. There is no per-kind manager layer, no per-entity cache, and no dependency-injection graph. The walk runs at open and on Reload; between them main holds its result as the **live tree** (`src/main/liveTree.ts`), serving reads from memory and patching it in place as writes confirm and watcher events classify. An mtime-gated parse cache keeps a walk cheap by reusing decoded sidecars and frontmatter for unchanged files, and a structural-sharing pass in the renderer collapses an unchanged subtree back to its previous object identity so a push re-renders only what moved. Main reads its own settings from that tree — the labels a native menu shows, the zoom a window opens at, the exclusion list — with the disk read as the fallback before a walk has installed one.

Renderer lookups derive from `treeIndex`: one record per entity (kind, id, title, icon, path, parents), cached against the tree object. `ancestryOf` is the one ancestry every location trail is a slice of; the record list keeps duplicate ids so title resolution can answer "ambiguous," and the reconcile, resolve, search, connections, and thumbnail tables all derive from the same records.

#### II. Mutations

Every change funnels through one dispatcher, `mutate` in `src/main/mutate.ts`: it resolves and checks paths, refuses reserved targets, and routes each operation to its implementation. Cascade policy is stated beside it once — a page rename reverts if its link rewrite fails; a Context delete unlinks its Spaces before the folder moves to the trash.[^4] The write path never runs inside a read, and every write channel confirms itself: after a successful write, main applies the matching change to its live tree — a pure transform where the request carries the whole fact, a one-file re-read where the writer normalizes — and pushes the tree when it moved.

Several rules hold across every entity and are stated here rather than per feature:

- **Names.** Create under a taken name disambiguates with a numeric suffix (`createDisambiguated`); rename onto a taken name is refused; both reject a name the walk could never surface.
- **No empties.** An emptied value deletes its key — a property, a Context tag, a color, a banner — never writing a placeholder.
- **Foreign data survives.** Every rewrite of a page or sidecar edits the modeled keys in place and preserves every foreign key and YAML comment by value.
- **Governed keys.** A frontmatter key is a property's when it exactly matches a registered property name (`isRegisteredPropertyName`, `src/shared/properties.ts`), and a Context's when it is a registered title wrapped as `<Title>` (`src/shared/contexts.ts`); every other key is foreign and preserved by value. A property may not take a name Pommora's own keys use (`PageID`, `TaskID`, `EventID`, `icon`, `cover`, `created_at`, `modified_at`) or one starting with `<`.
- **Sweeps and journals.** Governed-key sweeps — the writes that touch many files because a property or Context changed — share one walk (enumerate, lock, admission-check, decide, write only what changed), open only the files the content index names as candidates, and confirm each under its own lock. A page a sweep rewrites keeps its modification time, and so its Last Modified — the sweep is not the user's edit of that page. Multi-file schema and Context operations serialize on one chain and write a crash journal first — intent to disk before action — so an interrupted rename is finished by the next open's replay rather than left half-applied.[^5]
- **Connections.** One mention scanner covers the three link syntaxes, code-masked, and one rewriter applies a rename.[^6]

#### II. The Atomic-Write Contract

Every file write goes through an atomic path — temp file plus rename (`src/main/IO/atomicWrite.ts`) — leaving either the whole old file or the whole new file after a crash. Pages write through the YAML-and-Markdown engine, which places the body directly after the closing fence and re-serializes only the modeled keys; sidecars, Contexts, Settings, and the Homepage write as JSON. Atomicity prevents a torn file; serialization prevents a lost update: every read-modify-write runs under a lock keyed on the file it rewrites (`src/main/IO/fileLock.ts`) and reads fresh inside that lock, so two writers to one file queue. A page's path key is shared by its body write, its property writes, and its rename or move; a container's sidecar key is taken by every writer of that file. The locks are process state, and the app holds a single-instance lock, so a relaunch raises the existing window.

Autosave belongs to one path-keyed flush registry shared by every editor host: edits debounce per page path, any path flushes on demand, and everything flushes on teardown, Nexus switch, and window close.

#### II. The Device-Local Database

**SOURCE:** `Pommora/src/main/Database/schema.ts` · `Pommora/src/main/Database/localState.ts` · `Pommora/src/main/indexSeed.ts`

`nexus.db` lives inside the Nexus, so a moved or renamed folder keeps it, but it never syncs: it holds what is true of this computer's session rather than of the content. It has two roles. **Operational state** is a keyed store (`local_state`) of per-machine chrome — folds, the active view and manual order per container, heading columns and the header icon, footnotes overrides, embed heights and zooms, aliases, fetched link titles, block documents, the tab set, the window tab sets, the recents stream, the record baseline, the hover pane size, and device preferences — each change a single-row upsert, an empty value deleting its key. **The content index** (`mentions`, `page_values`, `indexed_files`) records which pages mention which titles and which governed keys and values each page carries. It is derived state, disposable by construction: the open-time seed rebuilds it from the corpus, reading only files whose mtime or size moved since they were last indexed, over the same set of files the sweeps rewrite (`corpusFiles`), so "indexed" and "rewritable" name one set. A query answers null when there is no index and its caller falls back to a full scan.

The schema grows without migrations — additive tables reach existing files on open — and a version mismatch on an existing table's shape deletes the file and starts clean, costing a machine its chrome once. On the file side, nothing on disk carries a schema version: sidecars decode loosely, a version key an outside tool adds survives as a foreign key, and `settings.json` is written into existence by the first write that needs it, every read tolerating its absence.

#### II. The File Watcher

Out-of-band changes — Obsidian, vim, Finder, cloud sync — reach the app without a restart through a recursive watch on the Nexus root (`src/main/watcher.ts`). The database and its WAL siblings, `.trash`, `node_modules`, dotfile cruft, block-host content folders, and the user's excluded folders are ignored at intake; `.nexus/` itself stays watched, since Contexts, settings, and ordering live there, and so does the asset directory. Every in-app write records itself and the watcher skips recorded paths, since in-app changes confirm through their own channels; between writes, the newest on-disk state wins. Events accumulate through a debounced settle, then classify: a page created, edited, or deleted, a sidecar edited, and the settings and homepage leaves each patch the live tree at the cost of one file read, an asset event patches that folder's listing, and everything unclassifiable — directory changes, the registries, orderings, a sidecar appearing or vanishing — falls back to one verification walk that re-parses only entries whose mtime or size changed. The resulting tree pushes whole when it changed, where structural sharing collapses echoes to no re-renders. Identity survives an external rename because the id rides in the file itself.

#### II. Adoption

Opening a folder as a Nexus runs an idempotent, best-effort pass (`src/main/adopt.ts`) that stamps a real ULID into every entity still lacking one: a raw folder gets its sidecar, an externally authored page gets its kind's id key, and nothing stamped depends on a sibling having been stamped first. A page's adopted id encodes the file's age rather than the moment of adoption — the older of its birth time and modification time, or the modification time alone where the filesystem reports no birth time — so its Creation Time reads as the date the file was actually written, and the stamp restores the file's modification time afterward, so adoption never reads as an edit under Last Modified. Root folders holding content become Collections and everything nested becomes a Set; excluded and hidden folders, empty sidecar-less folders, and anything the resolver can't place are left alone. Every page and Set move passes one main-side check admitting only a Collection or a Set as its destination.

**Kind authority is the folder's sidecar, and the file must agree with it.** A content file stores its id under the key naming its kind — `PageID`, `TaskID`, `EventID` (`src/shared/identity.ts`) — and admission is the one place every key is checked. Its answers are: the key agrees (a member), no key at all (adoptable, stamped at open, and read throughout under a synthetic id hashed from its path until the stamp lands), or **Unknown** — a key contradicting the folder, a value that can't be an identity, or two keys at once. Unknown is invisible and untouched: absent from the tree, skipped by every nexus-wide write, left byte-identical on disk. A stray `.png` in a Collection gets the same treatment.

#### II. Persistence

What Pommora remembers, and for how long. Four tiers, told by where a thing is written: the Nexus's own files travel with it, its database stays on the machine that made it, the app's own preferences sit outside every Nexus, and everything else lasts the run.

**Travels with the Nexus.** Written into `.nexus/` files, so a synced or copied Nexus arrives with all of it, and a hand edit from outside is read back live.

| State | Where it lives | What clears it |
| --- | --- | --- |
| Every setting in the Settings window | `settings.json` | Changing it; a row at its default stores no key |
| Pins and Favorites | `navigation.json` | Unpinning or removing; an entry that stops resolving hides but is never dropped |
| Property definitions and their order | `properties.json` | Editing the registry |
| Top-level Collection order | `state.json` | Reordering |
| Saved views and what a container is | Each container's own sidecar | Editing the view; deleting the container |
| Page bodies, frontmatter, and their property values | The Markdown files themselves | Editing the page |

**Stays on this machine, inside the Nexus.** `nexus.db` sits beside those files and travels with a moved Nexus, but never syncs.

| State | What it remembers | What clears it |
| --- | --- | --- |
| Tabs | The open set, which was active, and each tab's Back/Forward history as bare refs | Closing a tab; a schema-version change |
| Folds | Which headings and lists are collapsed, per page | Unfolding; emptying the list deletes the row |
| Embed heights · heading columns · header glyph · footnotes | Per-page editor chrome — a tile's dragged height and Scale, a table's heading column, whether the page shows its icon or its footnotes | Changing it back |
| Active view and manual page order | Which saved view a container opens on, and the hand order inside it | Picking another view; reordering |
| Preview and NavWindow tab sets | The floating window's tabs per origin page, and which preview was open | Closing the last tab of a set |
| Recents | The navigation trail, most recent first, capped by roll-off | Roll-off |
| Hover pane size | The one universal hover pane size | Resizing it |
| Fetched link titles | A URL's page title, so the same link never refetches | Nothing — a cached title is kept |
| Dashboard blocks | Each block surface's layout and its blocks | Editing the surface |
| Aliases | The names each page has been given, for the picker | Forgetting one from the picker |
| The record baseline | What the last open saw, for the deletion record | The next open |
| Use Native Menus | The one machine-level preference | Toggling it |

**Stays on this computer, outside every Nexus.** Belongs to the app rather than to any Nexus, so it holds no matter which one is open.

| State | What it remembers | What clears it |
| --- | --- | --- |
| The last Nexus opened, the recent Nexus list, and the trash mode | Where to reopen, and what deleting means | Opening another Nexus; the list rolls off at ten |
| Sidebar and Inspector widths, and which sidebar sections are open | The shell's own proportions | Dragging them; an out-of-range value self-corrects on read |
| Web sessions | Cookies, logins, and site storage for every embedded page, browser tab, and hover preview — one shared session | Nothing in the app clears it today |

**Lasts the run.** Held in memory, gone when Pommora closes — the difference between returning to a page and rebuilding it.

| State | What it remembers | What ends it |
| --- | --- | --- |
| Parked page surfaces | The two most recent page tabs stay built, held off screen, so a flip resumes them | A third tab taking the slot; closing the tab |
| Warm tab state | Serialized editor state — text, caret, undo history — plus scroll, for every tab beyond the parked ones | Twenty entries per tab, then the oldest goes; closing the tab; an outside edit to that page |
| Retained web guests | A scrolled-out or parked site stays alive, paused, keeping its scroll, typed input, and playing media | Five hidden guests, then the least recent is torn down |
| Embed tile and Page Window warmth | The same editor state for tiles inside a page and for window tabs | The page's body changing since capture; closing the Page Window |
| Pending page saves | A typed body waiting on its debounce, flushed on unmount, Nexus switch, and window close | The write landing |

Deliberately never kept: the window opens at one size every launch, and floating windows re-center rather than reopening where they were left, since a remembered position strands chrome off screen when the display changes.

### The Process Boundary

**The Bridge.** Every channel between the window and main is declared once, in a types-only map (`src/shared/bridge.ts`): its direction, what it carries, and what it answers with. The preload derives its entire API from that map with one dialer per declared name, and main registers every handler through one loop that demands a handler per channel, so a channel on only one side or a drifted signature is a build error. Requests that read or write data always answer with the `Result` envelope — the value, or a structured refusal naming what went wrong — and never throw across the boundary; a few channels answer more plainly, such as a menu resolving to the action chosen or to nothing, and each declares that beside itself.

**Native Menus.** Right-click menus are native and pop from main; click-driven menus are in-house and drawn by the renderer. The native family is one chassis in three layers — a row shape every menu model emits, a pop-and-resolve primitive, and a model-to-template converter — with each menu a thin adapter over it, and the labels and gating living in shared, tested models under `src/shared/*Menu.ts`, so the renderer and main can't disagree about what a menu says.

**The Push Path.** Change flows one way. The renderer asks; main writes, confirms against its live tree, and when the tree moved pushes it whole to the window on one channel — the write-confirmation path and the watcher share that funnel. The renderer's structural-sharing pass then collapses unchanged subtrees to their previous identities, so an echoed push re-renders nothing and a real change re-renders only what moved.

### The Renderer

**The Store.** One Zustand store, `useSession`, is the renderer's shared room: the tree, the shown selection, the tabs and their histories, every open page, the nav layer, the floating windows, and personalization live together, so features react to each other without private channels. It is composed from seven slice files under `src/renderer/Store/` — `NexusSlice` (the tree, the mutation gateway, opening and closing), `NavigationSlice` (tabs, pages, selection, history, pins, recents, favorites — one slice because `select`, the pin gestures, and the restore each write across all of it), `PreviewSlice` (the page and nav windows, the browser), `ChromeSlice` (pane widths, the footer, the settings window), `ConfigSlice` (personalization, device preferences, footnote answers), `RenameSlice` (the naming fences), and `CacheSlice` (the id-keyed maps) — with `store.ts` composing them and holding the React hooks. The store is per-window working state: main owns the data, and the store caches what main last confirmed.

**Tabs, Warmth, and Navigation.** Tabs are a pure, tested model — unpinned tabs are the persisted row, pinned tabs derive live from their pin references through one writer, and each tab owns its history stack. Every page open in any tab has a slot in the store, keyed by page id — its detail and its live editing body — so a parked surface reads its own page and the shown one reads the selection's; `selection` is what the pane shows, and during a cold page open it lags the active tab's target until the fetch lands or the deadline passes, which is the pause-on-change. Warmth lives outside React as per-tab history snapshots plus a path-keyed detail slot with a single shared fetch, captured when a surface unmounts, so revisiting a page resumes instead of reloading, and the most recent page tabs keep their whole surface mounted off screen. Recents, pins, and favorites are bare references resolved against the live tree at render time, which is what makes them rename-proof.[^7]

**The View Pipeline.** A Collection renders through one pure pipeline — columns, filter, group, sort — that takes its view, rows, and schema as inputs and knows nothing about where they came from, so a full page and an embedded tile run the same code. Table and Cards are the two shipped renderers over it, sharing the band chrome, creation engine, and ordering machinery. Value edits are optimistic: the renderer patches a local override immediately, the mutation confirms through main, and the confirmed tree agrees with what was drawn.[^8]

**The Editor.** MarkdownPM is a CodeMirror 6 editor whose central law is a single cached document model: everything the editor knows about a document's structure derives once per version, every feature reads the same answers, and line chrome, widgets, and the spans a caret must skip are emitted from one intent stream. Tables and embeds render as live widgets over canonical Markdown source, with transaction guards refusing or repairing edits that would corrupt a construct.[^9]

**Embeds and Floating Windows.** One `PageTile` renders a real page inside any foreign surface — the Page Window, the NavWindow, the hover pane, dashboard tiles, and the editor's `![[Title]]` widget are the same component — and an edit made anywhere routes through the page's own save path. Floating windows share one chassis, `WindowBase`, mounted by the Page Window, the NavWindow, the Web Window, and Settings; the hover pane rides the lighter PickerMenu chassis instead. Live websites are webview guests governed by one main-side owner and one renderer adjudicator deciding where every external link opens.[^10]

**The Design System.** Every color, size, weight, and duration is a token defined once in TypeScript and republished as CSS variables, so stylesheets and components read one source. Glass is one frost recipe in three semantic tiers; floating panes share one anchored shell; menu rows share one primitive. PommoraDND is the in-house drag engine, and the deployed showcase renders the system from the same sources.[^11]

### What the Data Layer Leaves to the OS

- **Versioning, file history, backup** — Time Machine, `git` on the Nexus, filesystem snapshots. In-session undo comes from the editor.
- **Cross-device sync** — placing the Nexus in a synced folder gives device-to-device sync; real cloud sync is a long-term prospect.

---

#### Known Issues

- **A locked or mid-sync database file runs the session without persisted state.** Only a healthy, open report of the wrong schema version earns the delete-and-restart; a file that fails to open at all stays put until a later launch reads it.

#### Pending

- **Index consumers** — Linked-From, backlinks, ContextView membership, and full-text search each ride the content index as their own arcs; the FTS table is the one piece of schema still unwritten.
- **Agenda** — the item format, the field vocabulary, ordering, and every surface, under the four decisions in §The Agenda Singletons.

[^1]: [[PommoraPRD]] §Storage Philosophy
[^2]: [[CollectionsPM]] §Page Sets
[^3]: [[ConfigurationPM]] §Files & Links
[^4]: [[ContextsPM]] §Writes · [[NexusRecordPM]]
[^5]: [[PropertiesPM]] §Shared Mechanisms
[^6]: [[ConnectionsPM]] §The Rename Cascade
[^7]: [[NavigationPM]]
[^8]: [[ViewTypesPM]]
[^9]: [[MarkdownPM]]
[^10]: [[SurfacePM]] §The Embed Framework · [[InterfacePM]] §Floating Windows · [[WebviewPM]]
[^11]: [[DesignSystemPM]] · [[PommoraDND]]
