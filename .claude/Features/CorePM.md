## Core

The Nexus on disk, the data layer that reads and writes it, and the rules that hold across every entity. Per-domain depth lives in each domain's own document; this one is the map. The PRD carries the product-level storage model, and [[DesktopPM]] what is true only of the desktop app.

### The Nexus Layout

A Nexus is a single folder, opened through a picker and treated as canonical content. It syncs through Pommora Sync ([[NexusSyncPM]]), never through a third-party folder transport.

```
// <Nexus>                               | • The picked folder — canonical content; travels through Pommora Sync
├── // .nexus                            | • App-internal config
│   ├── // assets                        | • The default asset directory — banners, files, thumbnails
│   │   └── crops.json                   | • Per-image framing, keyed by the image
│   ├── // contexts                      | • One folder per Context, one per Space beneath it
│   │   ├── contexts.json                | • The Context registry — order is display order
│   │   └── // <Context>
│   │       └── // <Space>
│   │           └── _space.json          | • The Space's identity, banner, links, property values, and row order
│   ├── // interface                     | • The nexus-wide files of the interface's own surfaces
│   │   ├── // homepage                  | • The Homepage's tile document and markdown-tile bodies
│   │   │   └── homepage.json            | • The Homepage's banner and heading icon
│   │   └── matrix.json                  | • The Matrix's group, filter, forces, and display
│   ├── // metadata                      | • Per-page metadata, one file per month of page creation
│   │   └── <MM-YYYY>.json               | • Entries for the pages created that month, keyed by page ID
│   ├── nexus.json                       | • The Nexus id, creation stamp, and the Agenda registration
│   ├── properties.json                  | • The nexus-wide property registry
│   ├── settings.json                    | • Personalization, accent, excluded folders, the profile
│   └── state.json                       | • Pins and the NavView banner; Collection, Space, and panel Context order
├── // .trash                            | • Deleted entities, mirroring the chain they came from
│   └── // <Collection>
│       └── // <stamp>__<Page>.deleted   | • A deletion bundle — the artifact beside its record
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
│   ├── [<Event>.md]                     | • An Event-marked ID in frontmatter
│   └── _eventconfig.json
└── // <Tasks>                           | • The Tasks singleton — registered by its sidecar's id; flat
    ├── [<Task>.md]                      | • A Task-marked ID in frontmatter
    └── _taskconfig.json

// <app-support>                         | • Machine-specific; never syncs
├── pommora.json                         | • Last-opened Nexus, recent Nexuses, trash mode, the device's public key, fingerprint, and name
└── secrets.json                         | • The device's private key, keychain-encrypted
```

A container's sidecar decodes through `Core/Nexus/containerFields.ts` and a Space's through `Core/Contexts/spaceSidecar.ts`; every on-disk name both processes speak is in `Core/Paths/nexusPaths.ts`, and every absolute path main builds comes from `Core/Paths/paths.ts`.

#### II. Classification

Folder kind is decided by one resolver, `Core/Nexus/folderKind.ts`. At the Nexus root the sidecar filename discriminates — `_pagecollection.json`, `_taskconfig.json`, `_eventconfig.json` — so a folder is a Collection because it carries the Collection sidecar regardless of its name, and folders rename freely. Below the root, position alone decides: every non-excluded subfolder of a Collection or Set is a Set, at any depth, storing views in its sidecar wherever it sits while only a depth-1 Set is offered them. Collections and the two Agenda singletons live as siblings at the root with no wrapper folder. `.nexus/` and `.trash/` are hidden from the sidebar and from other tools by the dotfile convention, matching `.obsidian/`.

#### II. The Agenda Singletons

A Tasks or Events singleton is the folder whose config sidecar id matches the registration `nexus.json` holds. The folder names are renameable defaults, a Collection named "Tasks" is still a Collection, and no name is reserved. Registration is written once, at Nexus creation, when the two folders are seeded; reopening a Nexus never recreates folders its owner deleted, and a hand-made agenda config carries an ID the record doesn't name and stays inert. A copy is the case the record can't settle alone — every ordinary duplication reproduces the registered ID — so two root folders answering to one record register neither, a copy below the root is inert on depth and stays where it was filed, and a registered singleton found nested with its root slot empty is carried home on the next open.

Agenda items carry no content model yet: no fields, no create path, no read surface, and no navigation reference. Four decisions are settled and bind the work that builds them: Tasks and Events are Markdown, with the body as the description, so they inherit the page writers, the link cascade, and the editor; they enter the tree walk as their own top-level branch, giving every item a record, a nav key, and a search entry, while Collection-scoped consumers stay page-only; both kinds carry a built-in, non-deletable Status property tracking engagement rather than the clock; and EventKit sync is an opt-in mirror to the system Reminders and Calendar, an API-only translation that constrains nothing stored on disk.

#### II. Folder Exclusion

`excluded_folders` in `settings.json` takes anchored Nexus-relative paths, and exclusion is total for reading. A folder whose name starts with `.` or `_`, and any `node_modules`, is excluded the same way, the app's own `.nexus` and `.trash` aside. One predicate (`Core/Paths/exclusion.ts`) is honored by the read walk, the adoption pass, the watcher, the content index's corpus, and every cascade, so nothing under an excluded folder is read, shown, indexed, swept, or rewritten, and no enumeration descends into one. A second predicate in the same file, `manifestAdmits`, is defined from the first: it admits what the watcher would watch, adds `.trash`, and drops the navigation thumbnails and the two cascade journals, which is the rule deciding what a Nexus carries between devices. Two deliberate reaches pass it through one scope, `reachingExcluded` in the same file, which still keeps hidden folders and the asset root out. Clear Exclusion Cache (`Core/Settings/exclusionScan.ts`) enters an excluded folder to remove Pommora's own bookkeeping — container sidecars, each page's identity key and `<Context>` keys, and those pages' metadata entries; every other key a page holds, property values included, stays — and skips the Agenda layer whole. Moving the asset directory off `.nexus/assets` (`Core/Assets/assetMigrate.ts`) rewrites the asset links in excluded pages and sidecars along with every other store. A Collection or Set can't be created, renamed, or moved onto an excluded folder or the asset directory, and renaming or moving one carries every excluded entry at or under it to the new path. Trashing one takes those entries into its Trash record, and restoring it puts them back under wherever it lands. Un-adopted folders are a different case: they stay outside the tree but are indexed and cascade-reachable.

#### II. The Asset Directory

One directory holds the assets entities point at — used for banners, nexus icon, embedded files, ect... — configurable to any folder in the Nexus and defaulting to `.nexus/assets`. The configured directory is excluded from content-adoption but is otherwise managed by the watcher the same way. A file landing there patches an in-memory filename list that the renderer resolves `[[File.png]]` against; nothing about it is stored except its name, which is what makes a sync eviction and re-download a non-event. Assets are served to the renderer over the read-only `nexus-asset://` scheme.

### The Data Layer

#### II. The Read + State Layer

The read side is one eager, read-only walk — `readNexus` — producing a pre-ordered `NexusTree` in a single pass that parses each file once and writes into no record the parse cache shares, consumed by the interface without re-sorting and held in the session store. There is no per-kind manager layer and no dependency-injection graph. The walk runs at open; between opens Core holds its result as the **live tree** (`Core/Nexus/liveTree.ts`), serving reads from memory and patching it from the one file each event changed, and it walks again when an event can't be placed that way, on Try Again, or when no tree is held. An mtime-gated parse cache keeps a walk cheap by reusing decoded sidecars and frontmatter for unchanged files. The interface applies each push as a difference that leaves everything it doesn't name at its previous object identity, and passes a whole tree through a structural-sharing pass that collapses each unchanged subtree the same way, so a push re-renders only what moved. Core reads its own settings from that tree — the labels a native menu shows, the zoom a window opens at, the exclusion list — with the disk read as the fallback before a walk has installed one.

A file the walk can't place is listed on the tree's `unreadable` list with a reason: `missing` (no ID to file it under), `malformed` (an ID value that can't be an identity), `contradicting` (an ID whose kind mark disagrees with its folder), or `unparsed` (frontmatter or a sidecar that doesn't parse). Nexus-level configuration — settings, the Homepage and crops leaves, page metadata, the order record, and the property registry — sits under `tree.config`.

Interface lookups derive from `treeIndex`: one record per entity (kind, id, title, icon, path, parents), cached against the tree object. `ancestryOf` is the one ancestry every location trail is a slice of, and `trailOf` the never-null form a surface draws; the record list keeps duplicate ids so title resolution can answer "ambiguous," and the reconcile, resolve, search, connections, and thumbnail tables all derive from the same records.

#### II. Mutations

Content and Context changes funnel through one dispatcher, `mutate` in `Core/Nexus/mutate.ts`, which routes each operation to its implementation, while views, the property registry, tiles, settings, and page bodies write through channels of their own. A mutation, view edit, or schema edit that names an entity by path acts only on what the live tree holds at that path, as the kind the request names, so the Nexus root, `.nexus`, the trash, and excluded folders fall outside them. Cascade policy is stated beside it once — a page rename stands when its link rewrite can't reach every file, and reports how many kept the old link; a page, Set, or Collection delete strips the Link values naming its pages under the same rule; a Context delete unlinks its Spaces before the folder moves to the trash, and a Context or Space delete that can't write every member puts back what it changed and refuses; once a Space, Context, Set, or Collection has moved to the trash, or a Set has left a container, the saved views, View Tiles, and the Matrix filter drop what named it, and a file that can't be edited is reported beside the delete rather than refusing it. Every write notes itself as a file event as it lands, and the arms that apply an outside edit apply it to the live tree and the content index; the write's gate then settles what moved and pushes it before the reply leaves, so the reply finds the window current. The window is sent a versioned difference of the tree and asks for the whole tree when it holds any version but the one before. Every create the dispatcher takes carries an ID the window minted, so what the window stages for the newborn is keyed before the push lands it.

Several rules hold across every entity and are stated here rather than per feature:

- **Names.** Create, copy, and restore under a taken name step aside to `Name (2)`, `Name (3)`, and onward through one rule in `Core/Paths/names.ts`, where a name already ending in a counter keeps counting, so a taken `Ideas (2)` becomes `Ideas (3)` — `freeName` against the titles already held, `createDisambiguated` against a write that answers `exists`; rename onto a taken name is refused; and a create or rename rejects a name the walk could never surface.
- **No empties.** An emptied value deletes its key — a property, a Context tag, a color, a banner — never writing a placeholder.
- **Foreign data survives.** Every rewrite of a page or sidecar edits the modeled keys in place and preserves every foreign key and YAML comment by value; a second spelling of a governed key leaves when a rename, removal, or delete reaches every spelling, or when **Automatically Resolve Case Conflicts** joins it into the registered spelling.
- **Governed keys.** A frontmatter key is a property's when it matches a registered property name without regard to case, and a Context's when it is a registered title, in any casing, wrapped as `<Title>` (`Core/Contexts/contexts.ts`); every other key is foreign and preserved by value. A property may not take a name Pommora's own keys use (`ID`, `banner`) in any casing, or one starting with `<`.
- **Sweeps and journals.** Governed-key sweeps — the writes that touch many files because a property or Context changed — share one walk (enumerate, lock, admission-check, decide, write only what changed), open the files the content index names as candidates and every Space sidecar, and confirm each under its own lock. A page a sweep rewrites keeps its modification time, and so its Last Modified — the sweep is not the user's edit of that page. Multi-file schema operations queue on one lock on the `.nexus` folder and Context operations on one on the Contexts folder, and quitting waits for one in flight. A rename or schema cascade writes a crash journal first — intent to disk before action — so an interrupted rename is finished by the next open's replay rather than left half-applied; a Space or Context delete writes its record into its Trash bundle first instead.
- **Connections.** One mention scanner covers the three link syntaxes, code-masked, and one rewriter applies a rename.

#### II. The Atomic-Write Contract

Every file write goes through an atomic path — temp file plus rename in the host (`Desktop/Platform/nodeMachine.ts`), behind the machine seam Core writes through — leaving either the whole old file or the whole new file after a crash. Pages write through the YAML-and-Markdown engine, which places the body directly after the closing fence and re-serializes only the modeled keys; sidecars, Contexts, Settings, and the Homepage write as JSON. Atomicity prevents a torn file; serialization prevents a lost update: every read-modify-write runs under a lock keyed on the file it rewrites (`Desktop/Platform/fileLock.ts`) and reads fresh inside that lock, so two writers to one file queue. A page's path key is shared by its body write, its property writes, and its rename or move; a container's sidecar key is taken by every writer of that file. The locks are process state, and the app holds a single-instance lock, so a relaunch raises the existing window.

Autosave belongs to one path-keyed flush registry shared by every editor host: edits debounce per page path, any path flushes on demand, everything flushes on teardown, Nexus switch, quit, and window close, a save that falls due while a switch is in flight waits for it and then lands or is cancelled with the old Nexus, a page holds one save in flight at a time, and a save the host refuses is dropped and reported once. Every open editor of a page — the content pane, a Page Window tab, an embed, a glance — shares one text: the others take the typing editor's text as each save is taken, and a keystroke typed before then merges onto it.

#### II. The Device-Local Database

**SOURCE:** `Core/Properties/schema.ts` · `Core/Platform/localState.ts` · `Core/Index/indexSeed.ts`

`nexus.db` lives in the app's userData directory under `Nexuses/<nexusId>/` and records the Nexus root it last opened, so a Nexus opened from any other folder, whether moved, renamed, or copied, starts with an empty base record and keeps every other row. It holds what is true of this computer's session, and what this computer has indexed of the content, rather than the content itself. It has three roles. **Operational state** is a keyed store (`local_state`) of per-machine chrome — folds, heading columns, footnotes overrides, embed heights and zooms, fetched link titles, block documents, the tab set, the window tab sets, the recents stream, the record baseline, the Matrix's layout and lens, device preferences, and the hub binding with its pin and pull cursor — each write an upsert of its rows in one transaction, an empty value deleting its key. **The content index** (`relations`, `headings`, `page_values`, `indexed_files`) records which pages relate to which titles — through a body link, a footnote citation, a frontmatter Link value, an embed, or a Space tag — and how often, the titles normalized as resolution matches them; the heading outline of each page; and which governed keys and values each page carries. It is derived state, disposable by construction: the seed run at open and once each watcher start is listening rebuilds it from the corpus, reading only files whose mtime or size moved since they were last indexed, over the same set of files the sweeps rewrite (`corpusFiles`), so "indexed" and "rewritable" name one set. A query answers null when there is no index, and a sweep then takes every page as a candidate. **The sync base record** (`sync_base`) holds one row per item the hub has accepted from or delivered to this device — the relative path, the mtime, the size, the plaintext hash, the blob hash, the hub version, and, for the JSON files that land through the key-level merge, the last synced bytes. It is derived the same way the index is: a session that opens with it empty reconciles against the hub's whole log and rebuilds it.

The schema grows without migrations — additive tables reach existing files on open — and the index carries its own generation, so a change to what it records drops the index alone. On the file side, nothing on disk carries a schema version: sidecars decode loosely, a version key an outside tool adds survives as a foreign key, and `settings.json` is written into existence by the first write that needs it, every read tolerating its absence.

#### II. File History

**SOURCE:** `Core/Pages/fileHistory.ts` · `Desktop/Store/versionsDb.ts` · `Core/Interface/Windows/PageHistoryWindow.tsx`

A page accumulates snapshots of its whole file while it is edited, in `versions.db`, the second device-local file. The store holds two tables. `snapshots(page_id, ts, source, blob)` carries a page's entire text, frontmatter included, compressed with zlib in its wrapped form, keyed by the page's `ID` and the moment it was taken, and marked `edit`, `external`, or `restore` by what produced it. `captures(path, ts, reason, blob)` carries the bytes a sync conflict or a refused tile save left behind, keyed by relative path, for every kind of file rather than pages alone. It opens and closes beside `nexus.db` in the same folder. Either store, locked or unreadable, is left in place for the next launch; a damaged one, reported by SQLite as not a database or as a malformed image, is set aside as `<name>.corrupt-<stamp>.db` for a fresh store, and nothing is ever deleted. `versions.db` also sets aside a file that opens but fails its integrity check. Any `.db` file and its `-wal` and `-shm` journals are neither watched nor listed anywhere in the Nexus, and a SQLite file is refused as an attachment: it is not content.

Every body write passes through one path, `writeBody`, which offers the text it is about to overwrite to one rule, `captureIfDue`. Pages alone qualify, by the `ID`'s kind mark, and the toggle governs whether a snapshot lands. The `captures` table sits outside that toggle: a conflict's losing bytes are recorded whatever the setting says, and a page's losing text also lands as an `external` snapshot when File History is on. An `edit` lands only when the page's last row is older than the Snapshot Interval and the text is under 1 MB; text a foreign writer left, recognized because its hash differs from the last text Pommora wrote, and the text a restore overwrites both land at once and at any size, since the write is the act that destroys them. A body identical to the latest row never lands twice. A burst of typing ends with one more row from a per-page quiet timer at the interval; a watcher-noticed outside edit arms the same timer under its own label, a restore disarms it, and a quit, a root switch, or a root rename offers every armed page before it leaves. Rows older than the History Timeframe are deleted at open and whenever the timeframe shrinks, a deleted row or a cleared store frees the page's interval clock, and Clear History gives the file's bytes back rather than holding its high-water mark.

A restore replaces the body alone. The interface flushes the page's pending save, Core captures the outgoing text as a `restore` row and writes the snapshot's body under the page's own frontmatter, and the interface then drops the path's pending save before anything else, drops every warm copy of the page, refetches, and re-seeds each open editor — content pane, Page Window, and embed — through a per-path body epoch; a restore whose refetch failed reports as such rather than as done. The wire carries a page's snapshots as timestamps alone. The Page History window (`Core/Interface/Windows/PageHistoryWindow.tsx`, reached by **View History** in the page menu and in the page's Settings menu), the page-menu placement, and the Files & Links › File History settings are recorded in [[InterfacePM]] and [[ConfigurationPM]].

#### II. Adoption

Opening a folder as a Nexus runs an idempotent, best-effort pass (`Core/Nexus/adopt.ts`) that stamps a real ULID into every entity still lacking one, then reads the Nexus, stamps what the read lists as missing an ID, and reads again while a stamp lands. Later, a raw folder gets its sidecar once an event shows it, and an externally authored page gets its kind's id key from its own event, which the watcher reports once the file stops changing, or from a listing that finds it under a folder newly in reach: one Try Again names, or one a change of Excluded Folders admits. A folder's read leaves any other page missing its ID out of the tree until its own event or the next full read, unless the tree had listed that folder's sidecar as unparsable; a full read, or the read of such a folder, lists it as `missing` under one notice offering Try Again, which stamps it; a file that can't be read or stamped stays listed under that notice. Nothing stamped depends on a sibling having been stamped first. A page the tree holds whose file is saved without its ID is stamped back with the ID the tree held, so its tabs, pins, recents, and metadata still find it. A page's adopted id encodes the file's age rather than the moment of adoption — the older of its birth time and modification time, or the modification time alone where the filesystem reports no birth time — so its Creation Time reads as the date the file was actually written, and the stamp restores the file's modification time afterward, so adoption never reads as an edit under Last Modified. Root folders holding content become Collections and everything nested becomes a Set; excluded and hidden folders, empty sidecar-less folders, and anything the resolver can't place are left alone. Every page and Set move passes one admission check allowing only a Collection or a Set as its destination.

**Kind authority is the folder's sidecar, and the file must agree with it.** A content file stores its id under one `ID` key, and the kind lives in the id itself: the eleventh character — the first of the ULID's random block — is `P`, `T`, or `E` (`Core/Nexus/identityMark.ts`). Admission checks it. Its answers are: the mark agrees (a member), no key at all (adoptable, stamped as above), or **Unknown** — a mark contradicting the folder, or a value that can't be an identity. Unknown is absent from the tree and listed as unreadable, skipped by every nexus-wide write, and left byte-identical on disk, except that Try Again over a value that can't be an identity stamps a new ID over it. A stray `.png` in a Collection is left out of the tree and untouched.

#### II. Persistence

What Pommora remembers, and for how long. Four tiers, told by where a thing is written: the Nexus's own files travel with it, its database stays on the machine that made it, the app's own preferences sit outside every Nexus, and everything else lasts the run.

**Travels with the Nexus.** Written into `.nexus/` files, so a synced or copied Nexus arrives with all of it, and a hand edit from outside is read back live. A file only Pommora writes — the order and pins, the Homepage, crops, the Matrix, and a tile layout — that stops parsing reads as the copy last read, and the next change rebuilds it from that copy, or from the last synced one, setting the damaged bytes aside under a hidden name. The hand-authored `settings.json`, `nexus.json`, and `properties.json` also read as the copy last read once the session has read one, while a change that writes to one refuses until it parses again. An open that finds one damaged before the session has read it waits on a screen naming the file, and the Nexus opens once it parses.

| State                                                         | Where it lives                                                               | What clears it                                                                  |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Every setting in the Settings window                          | `settings.json`                                                              | Changing it; a row at its default stores no key                                 |
| Pins                                                          | `state.json`                                                                 | Unpinning; an entry that stops resolving hides but is never dropped |
| Property definitions and their order                          | `properties.json`                                                            | Editing the registry                                                            |
| Top-level Collection order                                    | `state.json`                                                                 | Reordering                                                                      |
| Saved views and what a container is                           | Each container's own sidecar                                                 | Editing the view; deleting the container                                        |
| Which view a container opens on, and the hand order inside it | Each container's own sidecar, as `active_view` and the view's `manual_order` | Picking another view; reordering                                                |
| Page bodies, frontmatter, and their property values           | The Markdown files themselves                                                | Editing the page                                                                |
| A page's icon, aliases, title-icon override, and lock         | `metadata/MM-YYYY.json`, by the month the page was created                   | Clearing the field, emptying the page from the Trash, or deleting it to the system trash; an entry left with nothing set is deleted |
| The Matrix's group, filter, forces, and display               | `interface/matrix.json`                                                      | Changing a row; sections merge one at a time, and forces by value per grouping  |

**Stays on this machine, filed under the Nexus's id.** `nexus.db` sits in the app's userData directory and holds this machine's chrome and the index it derived from the content. `versions.db` sits beside it on the same terms and holds this machine's page file history and the bytes its sync conflicts left behind.

| State | What it remembers | What clears it |
| --- | --- | --- |
| Tabs | The open set, which was active, and each tab's Back/Forward history as bare refs | Closing a tab |
| Folds | Which headings are collapsed, per page, in every editor showing it | Unfolding; emptying the list deletes the row |
| Embed heights · heading columns · footnotes | Per-page editor chrome, in every editor showing the page — a tile's dragged height and Scale, a table's heading column, whether the page shows its footnotes | Changing it back |
| Window tab sets | One tab set per tabbed window kind | Closing the last tab of a set |
| Recents | The navigation trail, most recent first, capped by roll-off | Roll-off |
| Content index | Every relationship each page carries, keyed by kind and target, the governed values it carries under the keys the file spells, each findable by its folded key, and the mtime and size it was read at | The next open re-indexes any file whose mtime or size moved, and a file that can't be read keeps the rows it was last read at; an index-generation change drops it whole |
| Matrix layout and lens | Every node's dragged place, keyed by id, and the world rectangle the picture shows | A node's row leaves with its entity |
| Fetched link titles | A URL's page title, so the same link never refetches | Nothing — a cached title is kept |
| Page snapshots (`versions.db`) | The text each page held before an edit, after a burst settled, or before a restore | The History Timeframe sweep at open; deleting a row from the History window; Clear History, which also gives the file's bytes back |
| The record baseline | What the last open saw, for the deletion record | The next open |
| Device preferences | Use Native Menus, Interface Scale, Brightness, the Sidebar and SidePane widths, which sidebar sections are open, whether the main pane's and each floating window's footer is folded, the NavWindow's and NavView's list or gallery layout, and the size each floating window and the glance pane was left at | Toggling, choosing, or dragging them; an out-of-range width self-corrects on read |

**Stays on this computer, outside every Nexus.** Belongs to the app rather than to any Nexus, so it holds no matter which one is open.

| State | What it remembers | What clears it |
| --- | --- | --- |
| The last Nexus opened, the recent Nexus list, and the trash mode | Where to reopen, and what deleting means | Opening another Nexus; the list rolls off at ten |
| Web sessions | Cookies, logins, and site storage for every embedded page, browser tab, and glance — one shared session | Nothing in the app clears it today |

**Lasts the run.** Held in memory, gone when Pommora closes — the difference between returning to a page and rebuilding it.

| State | What it remembers | What ends it |
| --- | --- | --- |
| Parked page surfaces | The two most recent page tabs stay built, held off screen, so a flip resumes them | A third tab taking the slot; closing the tab |
| Warm tab state | Serialized editor state — text, caret, undo history — plus scroll, for every tab beyond the parked ones | Fifty entries per tab, then the oldest goes; closing the tab; an outside edit to that page |
| Retained web guests | A scrolled-out or parked site stays alive, keeping its scroll and typed input, with a parked tab's media paused | Five hidden guests, then the least recent is torn down |
| Embed, glance, and Page Window warmth | The same editor state for tiles inside a page, the glance, and window tabs | The page's body changing since capture, or no body known to check it against; a Nexus switch or a link-rewriting rename; closing the Page Window |
| Pending page saves | A typed body waiting on its debounce, flushed on unmount, Nexus switch, quit, and window close | The write landing |

Deliberately never kept: the window opens at one size every launch, and floating windows re-center rather than reopening where they were left, since a remembered position strands chrome off screen when the display changes.

### The Host Boundary

The app reaches the machine — the filesystem, the database handles, native menus, the system's web links — through the interfaces in `Core/Platform`, which the host implements. Every channel between the interface and the host is declared once in `Core/Contract/bridge.ts`, both sides derive from that declaration, a handler receives what the window sent as unknowns and narrows them before it acts, and every channel answers with the `Result` envelope rather than throwing across the boundary. A host's implementation of the `Machine` and store interfaces is held to the contract suites in `Core/Testing`, which Core runs over its own test implementations and any host runs over its real ones.

### What the Data Layer Leaves to the OS

- **Backup and versioning beyond the body** — Time Machine, `git` on the Nexus, filesystem snapshots. Page file history is Pommora's own, in `versions.db`; in-session undo comes from the editor.

---

#### Known Issues

- **A locked or unreadable database file runs the session without persisted state.** The file is left in place for the next launch.

#### Pending

- **Index consumers** — Linked-From, backlinks, ContextView membership, and the Matrix each have their substrate in the content index: the relationship rows carry kind and count, so each surface is a read over them, the Matrix being the first to read the rows themselves rather than the paths they resolve to. Full-text search waits on the FTS table, which remains unwritten.
- **Agenda** — the item format, the field vocabulary, ordering, and every surface, under the four decisions in §The Agenda Singletons.
