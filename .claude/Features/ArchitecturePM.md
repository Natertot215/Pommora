## Architecture

```
Architecture
├── The Shape of the App
├── Principles
├── The Nexus Layout
│   ├── Classification
│   ├── The Agenda Singletons
│   ├── The Trash
│   └── Folder Exclusion
├── The Data Layer
│   ├── The Read + State Layer
│   ├── Mutations
│   ├── The Atomic-Write Contract
│   ├── The Device-Local Database
│   ├── The File Watcher
│   ├── Adoption
│   └── Migration
├── The Process Boundary
│   ├── The Bridge
│   ├── Native Menus
│   └── The Push Path
├── The Renderer
│   ├── The Store
│   ├── Tabs, Warmth, and Navigation
│   ├── The View Pipeline
│   ├── The Editor
│   ├── Embeds and Floating Windows
│   └── The Design System
├── What the Data Layer Leaves to the OS
├── Known Issues
└── Pending
```

The whole-app architecture guide — how the two processes divide the work, how data moves between them, and how each renderer domain sits on the same few seams. Per-domain depth lives in each domain's own document; this one is the map. The PRD carries the high-altitude storage model.

### The Shape of the App

Pommora is two programs sharing one window. The **main process** is the one that touches the computer — it reads and writes every file, owns the database, pops native menus, and creates windows. The **renderer** is the React app inside the window — it draws everything and holds the interface's working state, and it cannot touch a file directly. Between them sits a deliberately narrow **bridge**: the renderer asks, main answers, and every ask is declared in one shared contract both sides compile against.

The split is a security posture and an architecture at once. Because only main can act on the world, every rule about files — atomicity, locks, what may be written where — lives in exactly one process, and the renderer can be wrong without the Nexus paying for it. The renderer, in turn, treats what main last confirmed as its cache: it patches optimistically for responsiveness, and the confirmed state that follows agrees with what was already drawn.

### Principles

1.  **Files are canonical.** One `.md` grammar covers the operational layer — Pages, Tasks, and Events alike, each naming its kind in its id key — and JSON carries sidecars, configs, and registries. The database is reserved for operational state rather than for content, and the line runs at assignment — a property definition may move into it, while the assignment on a container's sidecar and the value in a Page's frontmatter stay as files. Structure and content remain readable without Pommora; nothing is trapped.
2.  **Agent legibility.** External agents — Claude via MCP, any filesystem tool, vim, Obsidian — read the content and understand the context of a user's Nexus straight from plain files. The bar is convention-aware rather than stranger-instant; a file that abstracts a resolver or an id reference still counts as legible once the convention is learned, and no user data lives in a binary blob. Legibility is a claim about content rather than about every byte the app stores, which is why per-machine chrome belongs in the database.
3. **Each fact has one home.** One corpus definition, one folder classifier, one path-safety funnel, one mention scanner, one order rule — and the same discipline in the renderer: one token source, one drag engine, one menu chassis, one view pipeline. Where two surfaces need the same behavior, the behavior is hoisted rather than restated.

### The Nexus Layout

A Nexus is a single folder, opened via picker and treated as canonical content. It can sit in iCloud Drive, Dropbox, or any synced folder for device-to-device sync.

```
<picked nexus folder>/                  ← canonical content; syncs with cloud
  <Collection>/                         ← Page Collection (top folder, identified by sidecar)
    _pagecollection.json                ← Collection sidecar (schema assignment + order + views)
    <Set>/                              ← Page Set
      _pageset.json                     ← Set sidecar (order + views)
      <SubSet>/                         ← Sub-Set (recursive — any depth)
        _pageset.json
        <Page>.md                       ← Page nested in a Sub-Set
      <Page>.md                         ← Page at the Set root
    <Page>.md                           ← Page directly in the Collection root

  <Tasks>/                              ← Tasks singleton (registered by _taskconfig.json's id)
    _taskconfig.json
    <title>.md                          ← Task — TaskID in frontmatter, flat (no subfolders)

  <Events>/                             ← Events singleton (registered by _eventconfig.json's id)
    _eventconfig.json
    <title>.md                          ← Event — EventID in frontmatter

  .nexus/                               ← app-internal config + the device-local database
    nexus.json                          ← nexus ULID + createdAt + the agenda singleton registration
    state.json                          ← top-level ordering (Collections, per-Context Space order)
    settings.json                       ← per-Nexus UI labels + accent + excluded_folders + profile
    properties.json                     ← nexus-wide property registry (propId → definition)
    homepage.json                       ← the Homepage's banner + heading icon
    navigation.json                     ← pinned + favorites (ordered ID-only arrays) + the NavView banner
    nexus.db                            ← device-local operational state (schema-versioned)
    contexts.json                       ← the Context registry (order = display)
    contexts/<Context>/<Space>/_space.json ← one Space per folder

  .trash/                               ← deleted entities (nexus-local trash)
    <Collection>/<Set>/<stamp>__<Page>.md  ← the source chain, mirrored; stamped leaf

<app-support>/                          ← machine-specific; never syncs
  pommora.json                          ← last-opened path + recents + trash mode
```

Every sidecar's field shape is canonical in `src/shared/schemas.ts`.

#### Classification

A root folder containing a Pages sidecar is a Page Collection regardless of its folder name — folders can be renamed freely in Finder. The per-kind sidecar filenames (`_pagecollection.json` / `_taskconfig.json` / `_eventconfig.json`) discriminate kind at the root; below it, position alone decides — every non-excluded subfolder of a Collection or Set is itself a Set, at any depth, carrying its own saved views wherever it sits. Page Collections and the Tasks and Events singletons live as siblings at the nexus root, with no wrapper folder above them. `.nexus/` and `.trash/` are hidden from the sidebar and from non-Pommora tools by convention, matching `.obsidian/`.

#### The Agenda Singletons

A Tasks or Events singleton is the folder whose config sidecar id matches the registration `nexus.json` holds — folder names are renameable defaults, a Page Collection named "Tasks" is still a Collection, and no name is reserved. Registration is written once, at nexus creation, and never backfilled: seeding runs only when a nexus is first opened without an identity file, and reopening a nexus never recreates folders its owner deleted. A hand-made agenda config carries an id the record doesn't name and stays inert.

A copy is the case the record can't settle alone. Every ordinary duplication — a Finder duplicate, a restored backup, a sync-conflict copy — reproduces the registered ID, and two root folders answering to one record register nobody; deleting the stray config restores the nexus completely. A copy below the root is inert on depth alone and stays where its owner filed it. A registered singleton genuinely dragged away from the root is carried home on the next open; when the root still holds one, a nested claimant is treated as a copy and left in place.

#### The Trash

A deleted entity moves to `.trash/` under the folder chain it came from, where a bundle holding the artifact and a record of what departed is pruned. The record and restore model are the [[NexusRecordPM|Nexus Records]].

#### Folder Exclusion

`excluded_folders` on `settings.json` takes anchored nexus-relative paths, and exclusion is total: one predicate is honored by the read walk, the adoption pass, the watcher, the content index's corpus, and every cascade — query path and fallback scan alike. Nothing under an excluded folder is read, shown, indexed, swept, or rewritten, so a rename leaves an excluded note's `[[link]]`s as they were — and no enumeration descends into one, so the cost of excluding a folder is nothing rather than the price of listing it and discarding the result. Un-adopted folders are not excluded folders; they remain outside the tree but are fully indexed and cascade-reachable.

#### The Asset Directory

One directory holds the assets entities point at — used for banners, nexus icon, embedded files, ect... — configurable to any folder in the Nexus and defaulting to `.nexus/assets`. The configured directory is excluded from content-adoption but is otherwise managed by the watcher the same way. A file landing there patches an in-memory filename list that the renderer resolves `[[File.png]]` against; nothing about it is stored except its name, which is what makes a sync eviction and re-download a non-event.

### The Data Layer

#### The Read + State Layer

The read side is one eager, read-only walk in main (`readNexus`) producing a pre-ordered `NexusTree` — the whole tree in a single pass, consumed by the renderer without re-sorting and held in a Zustand store. There is no per-kind manager layer, no per-entity cache, and no dependency-injection graph.

The walk runs at open and on Reload — the deliberate verification points — and main holds its result as the live tree, serving reads from memory and patching it in place as writes confirm and watcher events classify. The walk stays cheap through an mtime-gated parse cache that reuses decoded sidecars and frontmatter for unchanged files, and a structural-sharing stabilize pass in the renderer collapses an unchanged subtree back to its previous object identity so a push re-renders only what moved.

The held tree is also what main reads its own settings from. The labels a native menu names an entity with, the zoom a window opens at, what emptying the trash means, and the exclusion list are all leaves the walk already decoded and the watcher keeps current, so the daily callers — every mutation, every context-menu pop, every cascade scan — ask the tree rather than the file, and the disk read survives as the fallback for the moments before a walk has installed one. Registry writes patch it the same way: a re-read of `properties.json` lands the definition in both of its homes, the tree's registry and each Collection's resolved schema, reference-identically, so a Collection that does not carry the edited property keeps its identity. Those edits move no assignment list and cost no sidecar read at all; the four operations that do move one — assigning, unassigning, reordering, and the create that assigns — name their Collection, and only that sidecar is read.

Renderer lookups over the tree derive from `treeIndex` — one record per entity (kind, id, title, resolved icon, path, breadcrumbs), cached against the tree object itself. The record list keeps duplicate ids so title resolution can still answer "ambiguous," while the keyed projections collapse last-wins; the reconcile, resolve, search, connections, and thumbnail tables all derive from the same records. The reserved `context` selection kind always reconciles to nothing — a Context group is a disclosure rather than a destination, so no stored selection may resolve to one.

The write path never runs inside a read. Every write channel confirms itself: after a successful write, main applies the matching change to its live tree — a pure transform where the request carries the whole fact, a one-file re-read where the writer normalizes — and pushes the tree when it moved. A write with no patch degrades to one verification walk; a value-only write, which the tree cannot see, costs nothing at all.

#### Mutations

Every change funnels through one dispatcher (`mutate`) in main: it resolves and checks paths, refuses reserved targets, and routes each operation to its implementation. Cascade policy is stated beside it once — a page rename reverts if its link rewrite fails; a Context delete unlinks its Spaces before the folder moves to the trash. Governed-key sweeps — the writes that touch many files because a property or Context changed — share one walk (enumerate, lock, admission-check, decide, write only what changed) with scope and capture as parameters.

Multi-file schema and Context operations serialize on one chain and write a crash journal first — intent-to-disk before action — so an interrupted rename is finished by the next open's replay rather than left half-applied. Connections have one mention scanner (three syntaxes, code-masked) and one rewriter; a rename opens only the files the content index names as candidates and confirms each under that file's own lock, with a full scan as the fallback when no index exists.

#### The Atomic-Write Contract

Every file write goes through an atomic path — temp-file plus rename, leaving either the whole old file or the whole new file after a crash:

- **YAML + Markdown write** — Pages. The body follows the closing fence directly, with no separator blank line. Only modeled keys are re-serialized; every foreign frontmatter key and comment survives by value.
- **JSON write** — sidecars, Contexts, Settings, Homepage.
- **Schema transaction** — multi-file commits that succeed or fail as a unit, such as a Collection-scoped property delete or a lossy type change: stage every payload to a temp sibling, rename each over its target, and roll the filesystem back on any failure. The nexus-wide property delete runs per-file over a `.trash` snapshot instead.

Atomicity prevents a file from being torn; serialization prevents an update from being lost. Every read-modify-write runs under a lock keyed on the file it rewrites and reads fresh inside that lock, queueing two writers to one file. The JSON primitive takes the lock itself, deriving the key from the path it writes; a write needing a wider span — most often a schema-validated read — holds the lock at the caller over the read/write pair. A page's path key is shared by its body write, its property writes, and the relocate, rename, or move performed; a container's sidecar key is taken by every writer of that file.

The locks are process-state, and the app holds a single-instance lock — a relaunch raises the existing window, and a process may own many windows.

**Page save contract.** The editor binds only to `body`; frontmatter is held as a typed struct and re-serialized on save. Autosave belongs to one path-keyed flush registry shared by every editor host — edits debounce per page path, any path flushes on demand, and everything flushes on teardown, nexus switch, and window close.

#### The Device-Local Database

**SOURCE:** `Pommora/src/main/db/schema.ts` · `Pommora/src/main/db/driver.ts` · `Pommora/src/main/indexSeed.ts`

A database file lives inside the Nexus itself, so moving or renaming the folder leaves it intact and travelling with its content. It holds two things: the state that belongs to this machine, and an index of what the Nexus's pages say.

Its structure grows without migrations. A database made before a feature existed gains that feature's storage the next time the app opens it, with every existing row untouched. Where the file cannot be written to at all — read-only media — the session simply carries on without the newest additions.

**The content index** records which pages mention which titles and which property-wrapped frontmatter keys and values each page carries. It is derived state, disposable by construction: deleting `nexus.db` costs it nothing — the open-time seed rebuilds it from the corpus, reading only files whose `(mtime, size)` moved since they were last indexed and pruning paths the corpus no longer yields, so the full-corpus read happens once per database, ever. The corpus is the sweeps' own — every markdown file outside `.nexus`, `.trash`, and the user's excluded folders, un-adopted folders included — enumerated through one helper (`corpusFiles`), so "indexed" and "rewritable" name the same set of files, and mention extraction shares the cascade prefilter's parse, so a title the index recorded is exactly one the prefilter affirms. A query answers null when there is no index — no database handle, or tables that never landed — and its caller falls back to a full scan; an empty answer is a real one.

**What lives here** is per-machine chrome — folded headings, the active view per container, manual row order under a sort, table heading columns, the fetched-title cache, the aliases each Page has been given, the tab set, the preview sets, the recents stream, and every block host's document; none of it is authored content, and two machines interleaving any of it has no correct answer. The alias record is the clearest statement of the boundary: the alias itself is written on-page in universal syntax, and what the database keeps is the accelerator that returns it.

**What doesn't:** pinned and favorites live in `navigation.json` — rarely written, and the one part of Navigation worth following a user across machines — as ordered arrays of bare `{kind, id}` refs written as a serialized patch. A markdown tile's body stays a file; it is prose and lives in the connections graph. Everything canonical — the registry, Contexts, settings, schemas, and each host's sidecar — stays a file, where a Nexus's meaning survives without Pommora.

A Pommora-governed frontmatter key is recognized by its wrap alone — `(Context)` for the organization layer, `<Property>` for the attribute layer — partitioning the keyspace with no reserved-name blocklist while every foreign key and comment survives a rewrite. Recognizing a key is not resolving one; a key registers as a live value only on a registry match.

Every operational-state action is a single statement — a change is a single-row upsert, and an empty value deletes its key. Navigation intent is the one operational write that goes to disk, and it keeps the before-quit gate deferred, delaying exit until the write settles.

**Versioned, not migrated.** A schema mismatch on open deletes the file and starts clean, costing a machine its chrome once — the schema stays small enough that the trade is worth it.

#### The File Watcher

Out-of-band changes — Obsidian, vim, Finder, cloud sync — reach the sidebar without a restart through a recursive watch on the Nexus root. The database and its WAL siblings, `.trash`, `node_modules`, dotfile cruft, block-host tile bodies, and the user's `excluded_folders` are ignored at intake; `.nexus/` itself stays watched, since Contexts, settings, and ordering live there, and so is the asset directory, which is tested ahead of every other skip so a folder named in `excluded_folders` still delivers its files.

Every in-app write records itself, and the watcher skips recorded paths — in-app changes confirm through their own channels. Between writes, authority is recency: the newest on-disk state wins. Surviving events accumulate through a debounced settle, then classify: a page created, edited, or deleted, a container or Space sidecar edited, and the settings and homepage leaves each patch the live tree at the cost of one file read, while a note in an unadopted folder updates only its index rows. An asset event patches that folder's listing alone. Everything unclassifiable — directory changes, the registries, orderings, a sidecar appearing or vanishing, a scope change — falls back to one verification walk: every directory enumerated, every file statted, reads and parses run only for entries whose mtime or size has changed. A folder appearing under a name the walk hides is the one directory event that does not, since nothing the tree can hold could have arrived under it. The index reconciles on top of that walk only when the batch could have moved the corpus, so a walk forced by a registry edit leaves the index exactly as it already was. The resulting tree pushes whole over IPC when it changed, where structural sharing collapses echoes to zero re-renders. Identity survives an external rename because the id rides in the file itself.

#### Adoption

Opening a folder as a Nexus stamps every un-adopted entity with a real ULID — a raw folder gets its sidecar, an externally-authored page gets its kind's id key, and nothing stamped depends on a sibling having been stamped first. Root folders holding content become Page Collections and everything nested becomes a Set; excluded and hidden folders, empty sidecar-less folders, and anything the resolver can't place are left alone, and an unrecognized sidecar stays inert beside the one Pommora writes. A registered agenda singleton stamps its own direct `.md` members under the agenda kind and never recurses. The pass is silent, best-effort, idempotent, and safe to re-run on partial state.

**A move is refused unless its destination holds pages.** Every page and Set move passes one main-side check admitting only a Collection or a Set — not the nexus root, not an agenda singleton, not a folder the resolver can't place.

**Kind authority is the folder's sidecar, and the file must agree with it.** A content file stores its id under the key naming its kind — `PageID`, `TaskID`, `EventID`. Admission is the one place every key is checked, since telling a mismatched file from a missing one is a multi-key question. Its answers are: the key agrees (a member), no key at all (adoptable, stamped at open), or **Unknown** — a key contradicting the folder, a value that can't be an identity, or two keys at once.

**Unknown is invisible and untouched** — not an error, not surfaced, not indexed, never stamped over: absent from the tree, skipped by every nexus-wide write, left byte-identical on disk. A stray `.png` in a Collection gets the same treatment. A file with no key is the opposite case and is admitted throughout — identity decides whether a value can be handed back, never whether it may be cleared.

#### Migration

The database side is covered above — a version mismatch deletes the file and starts clean. On the file side, nothing on disk carries a schema version and no migration runs: sidecars decode loosely, a version key an outside tool adds survives as an ordinary foreign key, and property values are name-keyed at the frontmatter root, rewritten in place by the rename sweep rather than by a versioned pass. `settings.json` is written into existence by the first write that needs it and holds only what was written; every read tolerates its absence and falls back per field.

### The Process Boundary

#### The Bridge

**SOURCE:** `Pommora/src/shared/bridge.ts` · `Pommora/src/shared/result.ts` · `Pommora/src/main/ipc.ts` · `Pommora/src/preload`

Every channel between the window and main is declared once, in a types-only map: its direction, what it carries, and what it answers with. The preload derives its entire API from that map with one dialer per declared name, and main registers every handler through one loop that demands a handler per channel — a channel that exists on only one side, or a handler whose signature drifts, is a build error rather than a failure at runtime.

Requests that read or write data always answer, never fail outright. An answer carries either the value or a structured refusal naming what went wrong and where, so a surface can report a refusal in its own terms instead of the window falling over. A few channels answer more plainly — a menu resolving to the action a person chose or to nothing at all, a lookup whose absence is itself the answer — and each handler declares that boundary policy beside itself.

The declaration holds types alone and no running code, which is what lets the sandboxed layer between the two processes stay as thin as it is.

#### Native Menus

Right-click menus are native and pop from main; click-driven menus are in-house and drawn by the renderer — that selector, not preference, decides which family a menu belongs to. The native family is one chassis in three layers: a row shape every menu model emits, a pop-and-resolve primitive stated once, and a model-to-template converter. Each individual menu is a thin adapter over that chassis, and the labels and gating live in shared, tested models — so the renderer and main cannot disagree about what a menu says or when a row is offered.

#### The Push Path

Change flows one way. The renderer asks; main writes, confirms against its live tree, and when the tree moved, pushes it whole to the window on one channel — the write-confirmation path and the watcher share that single funnel. The renderer's structural-sharing pass then collapses unchanged subtrees to their previous identities, so an echoed push re-renders nothing and a real change re-renders only what moved.

### The Renderer

#### The Store

One Zustand store is the renderer's shared room: the tree, the selection, tabs and their histories, the open page, navigation state, the floating preview, and personalization live together, so features react to each other without private channels — the shape that retired a whole class of two-copies bugs. Surfaces subscribe field-by-field, never wholesale, so a change repaints its readers alone. The store is per-window working state: main owns the data, and the store caches what main last confirmed, patched optimistically ahead of the round trip.

#### Tabs, Warmth, and Navigation

Tabs are a pure, tested model: unpinned tabs are the persisted row, pinned tabs derive live from their pin references against the tree, and each tab owns its history stack. Warmth lives outside React — per-tab snapshots plus a path-keyed detail slot with a single shared fetch — so revisiting a page resumes instead of reloading, and the most recent page tabs keep their whole surface mounted off-screen, which is what lets an embedded website survive a tab flip. Recents, pins, and favorites are bare `{kind, id}` references resolved against the live tree at render time, which is what makes them rename-proof: the reference never stored the title it displays.

#### The View Pipeline

A Collection renders through one pure pipeline — columns, filter, group, sort — that takes its view, rows, and schema as inputs and knows nothing about where they came from, so a full page and an embedded tile run the same code. The pipeline's output is a row model a renderer draws; Table and Cards are the two shipped renderers over it, sharing the band chrome, creation engine, and ordering machinery. View definitions save on the container's sidecar; the active choice and manual tiebreak order are per-machine. Value edits are optimistic: the renderer patches a local override immediately, the mutation confirms through main, and the confirmed tree agrees with what was already drawn.

#### The Editor

MarkdownPM is a CodeMirror 6 editor whose central law is a single cached document model: everything the editor knows about a document's structure — code fences, tables, callouts, math, embeds, the citations section — derives once per document version, and every feature reads the same answers, with construct exclusion ("a `$$` inside a fence is code") assembled in exactly one place. Line chrome, widgets, and the spans a caret must skip are emitted from one intent stream, so what is drawn and what the caret respects are one fact. Tables and embeds render as live widgets over canonical Markdown source, with transaction-layer guards refusing or repairing edits that would corrupt a construct. The bytes on disk stay plain CommonMark/GFM throughout — every widget is presentation over source, never a second format.

#### Embeds and Floating Windows

One `PageEmbed` renders a real page inside any foreign surface — the floating preview, the navigation window, hover cards, dashboard tiles, and the editor's `![[Title]]` widget are the same component — and an edit made anywhere routes through the page's own save path. Floating windows share one chassis (`PreviewPane`: glass, per-window geometry, side panes, footer) mounted by the page preview, the navigation window, the in-app browser, and Settings; hover cards ride the lighter menu chassis instead, because a hover affordance must never steal a click or take focus. Live websites are webview guests governed by one main-side owner (attach validation, popup routing, zoom sync) and one renderer adjudicator deciding where every external link opens; all guests share one persistent session partition per machine.

#### The Design System

Every color, size, weight, and duration is a token defined once in TypeScript and republished as CSS variables, so stylesheets and components read the same source; feature CSS consumes tokens rather than values. Glass is one frost recipe in three semantic tiers; floating panes share one anchored shell with collision handling and dismissal; menu rows share one primitive. PommoraDND is the in-house drag engine — a gesture layer that tells clicks from drags, displacement engines for lists and boards, and composable primitives (frozen geometry snapshots, one app-wide autoscroll, shared drop-line and ghost chrome) that insertion-style drags assemble with their own drop math. The deployed showcase renders the system from the same sources, so it cannot drift from the app.

### What the Data Layer Leaves to the OS

- **Versioning, file history, backup** — Time Machine, `git` on the Nexus, filesystem snapshots. In-session undo comes from the editor.
- **Cross-device sync** — placing the Nexus in a synced folder gives device-to-device sync; real cloud sync is a long-term Prospect.

### Known Issues

- **A locked or mid-sync database file runs the session without persisted state.** Only a healthy, open report of the wrong schema version earns the delete-and-restart; a file that fails to open at all stays put until a later launch reads it.

### Pending

- **Folder-exclusion editing UI** — `excluded_folders` is hand-edited; its Settings surface is deferred.
- **Index consumers** — Linked-From, backlinks, ContextView membership, and full-text search each ride the content index as their own arcs; the FTS table is the one piece of schema still unwritten.
