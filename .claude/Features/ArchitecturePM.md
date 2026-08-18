## Architecture

```
Architecture
├── Principles
├── The Nexus Layout
│   ├── Classification
│   ├── The Agenda Singletons
│   ├── The Trash
│   └── Folder Exclusion
├── The Read + State Layer
├── The IPC Bridge
├── The Device-Local Database
├── The Atomic-Write Contract
├── The File Watcher
├── Adoption
├── Migration
├── What the Data Layer Leaves to the OS
├── Reference
├── Known Issues
└── Pending
```

The data layer — the on-disk Nexus, the read and state layer, the device-local database, the atomic-write contract, the adopter, and the external-edit watcher. The PRD carries the high-altitude storage model.

### Principles

1. **Files are canonical.** One `.md` grammar covers the operational layer — Pages, Tasks, and Events alike, each naming its kind in its id key — and JSON carries sidecars, configs, and registries. The database is reserved for operational state rather than barred from content, and the line runs at assignment — a property definition may move into it, while the assignment on a container's sidecar and the value in a Page's frontmatter stay files. Structure and content remain readable without Pommora; nothing is trapped.
2. **Agent legibility.** External agents — Claude via MCP, any filesystem tool, vim, Obsidian — read the content and understand the context of a user's Nexus straight from plain files. The bar is convention-aware rather than stranger-instant; a file that abstracts a resolver or an id reference still counts as legible once the convention is learned, and no user data lives in a binary blob. Legibility is a claim about content rather than about every byte the app stores, which is why per-machine chrome belongs in the database.

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

A root folder carrying a Pages sidecar is a Page Collection regardless of its folder name — folders rename freely in Finder. The per-kind sidecar filenames (`_pagecollection.json` / `_taskconfig.json` / `_eventconfig.json`) discriminate kind at the root; below it, position alone decides — every non-excluded subfolder of a Collection or Set is itself a Set, at any depth, carrying its own saved views wherever it sits. Page Collections and the Tasks and Events singletons live as siblings at the nexus root, with no wrapper folder above them. `.nexus/` and `.trash/` are hidden from the sidebar and from non-Pommora tools by convention, matching `.obsidian/`.

#### The Agenda Singletons

A Tasks or Events singleton is the folder whose config sidecar id matches the registration `nexus.json` holds — folder names are renameable defaults, a Page Collection named "Tasks" is still a Collection, and no name is reserved. Registration is written once, at nexus creation, and never backfilled: seeding runs only when a nexus is first opened without an identity file, and reopening a nexus never recreates folders its owner deleted. A hand-made agenda config carries an id the record doesn't name and stays inert.

A copy is the case the record can't settle alone. Every ordinary duplication — a Finder duplicate, a restored backup, a sync-conflict copy — reproduces the registered ID, and two root folders answering to one record register nobody; deleting the stray config restores the nexus completely. A copy below the root is inert on depth alone and stays where its owner filed it. A registered singleton genuinely dragged away from the root is carried home on the next open; when the root still holds one, a nested claimant is treated as a copy and left in place.

#### The Trash

A deleted entity moves to `.trash/` under the folder chain it came from, as a bundle holding the artifact and a record of what departed. Nothing in the trash is pruned. The record and restore model are the NexusRecords.

#### Folder Exclusion

`excluded_folders` on `settings.json` takes anchored nexus-relative paths, and exclusion is total: one predicate is honored by the read walk, the adoption pass, the watcher, the content index's corpus, and every cascade — query path and fallback scan alike. Nothing under an excluded folder is read, shown, indexed, swept, or rewritten, so a rename leaves an excluded note's `[[link]]`s as they were. Un-adopted folders are not excluded folders: they stay outside the tree but fully indexed and cascade-reachable.

### The Read + State Layer

The read side is one eager, read-only walk in main (`readNexus`) producing a pre-ordered `NexusTree` — the whole tree in a single pass, consumed by the renderer without re-sorting and held in a Zustand store. There is no per-kind manager layer, no per-entity cache, and no dependency-injection graph.

The walk runs at open and on Reload — the deliberate verification points — and main holds its result as the live tree, serving reads from memory and patching it in place as writes confirm and watcher events classify. The walk stays cheap through an mtime-gated parse cache that reuses decoded sidecars and frontmatter for unchanged files, and a structural-sharing stabilize pass in the renderer collapses an unchanged subtree back to its previous object identity so a push re-renders only what moved.

Renderer lookups over the tree derive from `treeIndex` — one record per entity (kind, id, title, resolved icon, path, breadcrumbs), cached against the tree object itself. The record list keeps duplicate ids so title resolution can still answer "ambiguous," while the keyed projections collapse last-wins; the reconcile, resolve, search, connections, and thumbnail tables all derive from the same records. The reserved `context` selection kind always reconciles to nothing — a Context group is a disclosure rather than a destination, so no stored selection may resolve to one.

The write path never runs inside a read. Every write channel confirms itself: after a successful write, main applies the matching change to its live tree — a pure transform where the request carries the whole fact, a one-file re-read where the writer normalizes — and pushes the tree when it moved. A write with no patch degrades to one verification walk; a value-only write, which the tree cannot see, costs nothing at all.

### The IPC Bridge

Every channel between the renderer and main is declared once in `src/shared/bridge.ts` — name, direction, argument tuple, and reply type — and both processes derive from that map. Adding a channel is one map entry plus one handler.

Each handler declares its boundary policy beside its body. Enveloped channels — every data read and write — return the shared `Result` whole, carrying the structured error (`code` + `message` + optional `scope`) to the renderer; a throw lands as a failure envelope rather than a rejection. Bare channels — native menus resolving an action-or-null, pickers, and the sentinel reads whose absence is a valid answer — keep their raw replies. Pushes are typed on both halves. The bridge stays pure types; the sandboxed preload may require only Electron, and everything it consumes from shared carries zero runtime imports.

### The Device-Local Database

`<nexus>/.nexus/nexus.db` travels with the Nexus, keeping a moved or renamed one intact without re-pathing. Two stores live inside: `local_state`, the operational store keyed by `(scope, key)`, and the content index — `mentions` and `page_values`, rows keyed by nexus-relative POSIX path (so a nexus rename invalidates nothing) and gated by `indexed_files`'s `(mtime, size)` stamps. DDL is canonical in `src/main/db/schema.ts`; `node:sqlite` sits behind `driver.ts` as the swappable seam. Additive tables ride `CREATE … IF NOT EXISTS` with no version bump — the opener re-applies the schema to an existing database on every open, so a file created before a table existed gains it with every row intact, and a re-apply that fails (read-only media) costs only the new tables while the session keeps its state.

**The content index** records which pages mention which titles and which property-wrapped frontmatter keys and values each page carries. It is derived state, disposable by construction: deleting `nexus.db` costs it nothing — the open-time seed rebuilds it from the corpus, reading only files whose `(mtime, size)` moved since they were last indexed and pruning paths the corpus no longer yields, so the full-corpus read happens once per database, ever. The corpus is the sweeps' own — every markdown file outside `.nexus`, `.trash`, and the user's excluded folders, un-adopted folders included — enumerated through one helper (`corpusFiles`), so "indexed" and "rewritable" name the same set of files, and mention extraction shares the cascade prefilter's parse, so a title the index recorded is exactly one the prefilter affirms. A query answers null when there is no index — no database handle, or tables that never landed — and its caller falls back to a full scan; an empty answer is a real one.

**What lives here** is per-machine chrome — folded headings, the active view per container, manual row order under a sort, table heading columns, the fetched-title cache, the aliases each Page has been given, the tab set, the preview sets, the recents stream, and every block host's document; none of it is authored content, and two machines interleaving any of it has no correct answer. The alias record is the clearest statement of the boundary: the alias itself is written on-page in universal syntax, and what the database keeps is the accelerator that offers it back.

**What doesn't:** pinned and favorites live in `navigation.json` — rarely written, and the one part of Navigation worth following a user across machines — as ordered arrays of bare `{kind, id}` refs written as a serialized patch. A markdown tile's body stays a file; it is prose and lives in the connections graph. Everything canonical — the registry, Contexts, settings, schemas, and each host's sidecar — stays a file, where a Nexus's meaning survives without Pommora.

A Pommora-governed frontmatter key is recognized by its wrap alone — `(Context)` for the organization layer, `<Property>` for the attribute layer — partitioning the keyspace with no reserved-name blocklist while every foreign key and comment survives a rewrite. Recognizing a key is not resolving one; a key registers as a live value only on a registry match. 

Every operational-state action is one statement — a change is a single-row upsert, and an emptied value deletes its key. Navigation intent is the one operational write going to disk, and it keeps the before-quit gate deferring exit until the write settles.

**Versioned, not migrated.** A schema mismatch on open deletes the file and starts clean, costing a machine its chrome once — the schema stays small enough that the trade is worth it.

### The Atomic-Write Contract

Every file write goes through an atomic path — temp-file plus rename, leaving either the whole old file or the whole new file after a crash:

- **YAML + Markdown write** — Pages. The body follows the closing fence directly, with no separator blank line. Only modeled keys are re-serialized; every foreign frontmatter key and comment survives by value. 
- **JSON write** — sidecars, Contexts, Settings, Homepage.
- **Schema transaction** — multi-file commits that succeed or fail as a unit, such as a Collection-scoped property delete or a lossy type change: stage every payload to a temp sibling, rename each over its target, and roll the filesystem back on any failure. The nexus-wide property delete runs per-file over a `.trash` snapshot instead 

Atomicity keeps a file from tearing; serialization keeps an update from being lost. Every read-modify-write runs under a lock keyed on the file it rewrites and reads fresh inside that lock, queueing two writers to one file. The JSON primitive takes the lock itself, deriving the key from the path it writes; a write needing a wider span — most often a schema-validated read — holds the lock at the caller over the read/write pair. A page's path key is shared by its body write, its property writes, and the relocate a rename or move performs; a container's sidecar key is taken by every writer of that file.

The locks are process state, and the app holds a single-instance lock — a relaunch raises the window that already exists, and one process may own many windows.

**Page save contract.** The editor binds only to `body`; frontmatter is held as a typed struct and re-serialized on save. Autosave belongs to one path-keyed flush registry shared by every editor host — edits debounce per page path, any path flushes on demand, and everything flushes on teardown, nexus switch, and window close.

### The File Watcher

Out-of-band changes — Obsidian, vim, Finder, cloud sync — reach the sidebar without a restart through a recursive watch on the Nexus root. The database and its WAL siblings, `.trash`, dotfile cruft, block-host tile bodies, and the user's `excluded_folders` are ignored at intake; `.nexus/` itself stays watched, since Contexts, settings, and ordering live there.

Every in-app write records itself, and the watcher skips recorded paths — in-app changes confirm through their own channels. Between writes, authority is recency: the newest on-disk state wins. Surviving events accumulate through a debounced settle, then classify: a page created, edited, or deleted, a container or Space sidecar edited, and the settings and homepage leaves each patch the live tree at the cost of one file read, while a note in an un-adopted folder updates only its index rows. Everything unclassifiable — directory changes, the registries, orderings, a sidecar appearing or vanishing, an exclusions change — falls back to one verification walk: every directory enumerated, every file statted, reads and parses running only for entries whose mtime or size moved. The resulting tree pushes whole over IPC when it changed, where structural sharing collapses echoes to zero re-renders. Identity survives an external rename because the id rides in the file itself.

### Adoption

Opening a folder as a Nexus stamps every un-adopted entity with a real ULID — a raw folder gets its sidecar, an externally-authored page gets its kind's id key, and nothing stamped depends on a sibling having been stamped first. Root folders holding content become Page Collections and everything nested becomes a Set; excluded and hidden folders, empty sidecar-less folders, and anything the resolver can't place are left alone, and an unrecognized sidecar stays inert beside the one Pommora writes. A registered agenda singleton stamps its own direct `.md` members under the agenda kind and never recurses. The pass is silent, best-effort, idempotent, and safe to re-run on partial state. 

**A move is refused unless its destination holds pages.** Every page and Set move passes one main-side check admitting only a Collection or a Set — not the nexus root, not an agenda singleton, not a folder the resolver can't place.

**Kind authority is the folder's sidecar, and the file must agree with it.** A content file stores its id under the key naming its kind — `PageID`, `TaskID`, `EventID`. Admission is the one place every key is checked, since telling a mismatched file from a missing one is a multi-key question. Its answers are: the key agrees (a member), no key at all (adoptable, stamped at open), or **Unknown** — a key contradicting the folder, a value that can't be an identity, or two keys at once.

**Unknown is invisible and untouched** — not an error, not surfaced, not indexed, never stamped over: absent from the tree, skipped by every nexus-wide write, left byte-identical on disk. A stray `.png` in a Collection gets the same treatment. A file with no key is the opposite case and is admitted throughout — identity decides whether a value can be handed back, never whether it may be cleared.

### Migration

The database side is covered above — a version mismatch deletes the file and starts clean. On the file side, nothing on disk carries a schema version and no migration runs: sidecars decode loosely, a version key an outside tool adds survives as an ordinary foreign key, and property values are name-keyed at the frontmatter root, rewritten in place by the rename sweep rather than by a versioned pass. `settings.json` is written into existence by the first write that needs it and holds only what was written; every read tolerates its absence and falls back per field.

### What the Data Layer Leaves to the OS

- **Versioning, file history, backup** — Time Machine, `git` on the Nexus, filesystem snapshots. In-session undo comes from the editor.
- **Cross-device sync** — placing the Nexus in a synced folder gives device-to-device sync; real cloud sync is a long-term Prospect.

### Reference

- [[PommoraPRD]] — the high-altitude product spec and storage model.
- [[StructurePM]] — the two-layer model, PARA mapping, and linking model.
- [[PropertiesPM]] — the property catalog, registry, and assignment model.
- [[MarkdownPM]] — editor architecture and the save pipeline.

### Known Issues

- **A locked or mid-sync database file runs the session without persisted state.** Only a healthy, open report of the wrong schema version earns the delete-and-restart; a file that fails to open at all stays put until a later launch reads it.

### Pending

- **Folder-exclusion editing UI** — `excluded_folders` is hand-edited; its Settings surface is deferred.
- **Index consumers** — Linked-From, backlinks, ContextView membership, and full-text search each ride the content index as their own arcs; the FTS table is the one piece of schema still unwritten.
