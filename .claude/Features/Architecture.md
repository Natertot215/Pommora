### Architecture — Data Layer + Nexus

The dynamics of Pommora's data layer — the on-disk Nexus, the read + state layer, the SQLite index, the atomic-write contract, the adopter, and the external-edit watcher. PRD carries the high-altitude storage model.

---

#### Two load-bearing principles

Every architectural choice below traces back to one of these.

1. **Files are canonical (≠ everything is Markdown).** Only Pages are Markdown; Tasks, Events, sidecars, Contexts, Homepage, and Settings stay JSON. SQLite is regeneratable scaffolding, never source of truth — no user data is trapped in it.

2. **Agent legibility.** External agents (Claude via MCP, any filesystem tool, vim, Obsidian) read Pommora's entire structured graph — Pages, schemas, relations, properties — directly from plain text files. The bar is convention-aware, not stranger-instant: a file that abstracts a resolver, an id reference, or a path lookup still counts as legible once the agent has learned the convention. The firm line that never bends: no user data is trapped in a binary blob or held only in the regeneratable index.

---

#### Nexus layout

A Nexus is a single folder. Pommora opens it via picker and treats it as canonical content. The Nexus can sit in iCloud Drive / Dropbox / any synced folder for free device-to-device sync.

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

  <Tasks>/                              ← Tasks singleton (folder + _taskconfig.json)
    _taskconfig.json
    <title>.task.json

  <Events>/                             ← Events singleton (folder + _eventconfig.json)
    _eventconfig.json
    <title>.event.json

  .nexus/                               ← app-internal config + index
    nexus.json                          ← nexus ULID + createdAt + schema version
    state.json                          ← top-level ordering (Collections, per-Context Space order)
    settings.json                       ← per-Nexus UI labels + accent + excluded_folders + profile
    properties.json                     ← nexus-wide property registry (propId → definition)
    saved-config.json                   ← Saved-section entry labels
    homepage.json                       ← singleton Homepage entity (composed blocks)
    index.db                            ← SQLite index (regeneratable, schema-versioned)
    contexts.json                       ← the Context registry (order = display)
    contexts/<Context>/<Space>/_space.json ← one Space per folder

  .trash/                               ← deleted entities (nexus-local trash)
    <Collection>/<Set>/<stamp>__<Page>.md  ← the source chain, mirrored; stamped leaf

<app-support>/                          ← machine-specific; never syncs
  pommora.json                          ← last-opened path + recents + trash mode
```

Every sidecar's field shape is canonical in `src//shared//schemas.ts`.

**Classification by sidecar + folder position.** A root folder carrying a Pages sidecar IS a Page Collection — regardless of folder name; folders rename freely via Finder. The per-kind sidecar filenames (`_pagecollection.json` / `_taskconfig.json` / `_eventconfig.json`) are the kind discriminators at the root. Below the root, position alone decides: every non-excluded subfolder of a Collection or Set is itself a Set, to any depth, with no cap, and a Set carries its own saved views wherever it sits (→ `// Features//PageSets.md`).

**No wrapper folders.** Page Collections and the Tasks / Events singletons all live as siblings at the nexus root — there is no `Pages/` or `Agenda/` container folder.

**Agenda is discriminated by config sidecar, never by name.** A Tasks / Events singleton is *only* the folder carrying `_taskconfig.json` / `_eventconfig.json`; the folder names are renameable defaults. Every collection-discovery path skips a folder iff it carries an agenda config, so a Page Collection named "Tasks" is still a Collection. No name is ever reserved.

**An agenda item's own kind is its filename suffix.** `.task.json` and `.event.json` are the on-disk task-vs-event discriminator, deriving both the kind and the title, and load-bearing in the read walk and the index build.

> **Pending — per-file kind at adoption.** Adoption classifies at the folder level and skips agenda folders wholesale, so no individual file is scoped to a kind when a folder is adopted. Applying the existing suffix discriminator per file lands with the Agenda surfaces.

**Hidden + private.** `.nexus/` and `.trash/` are hidden from the sidebar and from non-Pommora tools by convention (matches `.obsidian/`).

**The trash mirrors the nexus.** A deleted entity keeps the folder chain it came from and takes a timestamp on its leaf, so the layout itself records where the item lived — restoring is dropping the stamp and moving it back up. Collisions within one folder de-collide on the leaf, so the same title deleted twice keeps both.

> **Pending — trash restore surface.** Nothing browses or restores the trash yet; the path record it needs is on disk.

**User folder exclusion.** Beyond the built-in skips, `excluded_folders` on `settings.json` takes anchored nexus-relative paths Pommora ignores *completely* at any depth — never adopted, shown, indexed, walked, or auto-tagged. The filter is subtractive and root-anchored, which is what keeps an ordinary exclusion from reaching the internal `.nexus/` reads that run through it too. Editing UI is deferred to Settings.

---

#### Read + state layer

There is no per-kind manager layer. The read side is **one eager, read-only walk** in main (`readNexus`) producing a pre-ordered `NexusTree` — the whole tree in a single pass, consumed by the renderer without re-sorting. The renderer holds it in a Zustand store; there is no per-entity cache and no dependency-injection graph.

Three seams keep that single walk cheap. A **mtime-gated parse cache** reuses decoded sidecars and frontmatter for files that haven't changed. **Self-write suppression** makes the watcher ignore the app's own writes, so a mutation costs exactly one walk instead of two. A **structural-sharing stabilize pass** in the renderer collapses an unchanged subtree back to its previous object identity, so a refetch re-renders only what actually moved.

Mutations are separate by construction: the write path never runs inside a read, and every write is followed by one refetch.

---

#### SQLite index — regeneratable scaffolding

The index lives at `<nexus>/.nexus/index.db`, travelling with the Nexus so a moved or renamed one keeps it without re-pathing. DDL is canonical in `src//main//index//schema.ts`.

**Fully regeneratable.** A schema-version mismatch on open force-deletes and rebuilds the whole database rather than migrating it, and the version is stamped only after a rebuild succeeds, so a failed one retries next launch instead of locking in an empty index. Losing the file costs a rebuild, nothing more.

**No query consumer — the index is write-only.** Nothing reads it: there is no query facade, and the only statements outside the write layer are the version handshake. Everything the product needs is answered off the in-memory tree instead. Writing that facade is the open architectural task, and it gates the features with no other route — Linked-from, backlinks, and full-text search.

**Update path — full rebuild per mutation.** There is no incremental updater. Every successful `mutate` op drops the database and cold-rebuilds it, re-walking the nexus and re-reading every page body. The body-autosave channel sits outside that contract, so a page typed into after a rebuild stays unindexed until the next mutation. This is a known violation of the never-rebuild-the-whole-Y rule, currently paid for no benefit; it resolves either by writing the query consumer that justifies it or by suspending the refresh until one exists.

A burst of edits costs **one** rebuild. At most a single rebuild runs at a time with one more queued behind it, and that follow-up sees the settled files. The guard is correctness rather than tuning: the rebuild deletes the database before rewriting it, so two overlapping passes would unlink the file the first was still filling.

---

#### Atomic-write contract

Every file write goes through an atomic path — temp-file + rename, so a crash mid-write leaves either the whole old file or the whole new file, never a half-written one:

- **YAML+Markdown write** — Pages. The body follows the closing fence directly, with no separator blank line, so a note never opens with an empty line under Obsidian's properties panel. Only modeled keys are re-serialized; every foreign frontmatter key and comment survives by value. The preserving-merge mechanics are canonical in `// Features//Pages.md` § "Read + Write".

- **JSON write** — sidecars, Tasks / Events, Contexts, Settings, Homepage.

- **Schema transaction** — multi-file commits that must succeed-or-fail as a unit: a Collection-scoped property delete or a lossy type change rewrites the sidecar *and* strips the property from every member page. Two-phase — stage every payload to a temp sibling, then rename each over its target, rolling the filesystem back on any failure. The nexus-wide property delete deliberately opts out: it snapshots every value to `.trash` first and runs per-file, so a partial run re-runs cleanly rather than rolling back.

**Page save contract.** The editor binds only to `body`, so it cannot destroy frontmatter — that's held as a typed struct and re-serialized on save. Autosave belongs to one **path-keyed flush registry** shared by every editor host: edits debounce per page path, any path flushes on demand, and everything flushes on teardown, nexus switch and window close. No host carries its own debounce, so a page can never race two savers. Write mechanics → `// Features//Pages.md` § "Read + Write".

---

#### File-watcher

Out-of-band changes — Obsidian, vim, Finder, cloud-sync — reach the sidebar without a restart, through a recursive watch on the Nexus root. The index, `.trash`, dotfile cruft and the user's `excluded_folders` are ignored at intake so their churn never costs a reconcile.

**The watcher exists for external changes; the app's own writes must not re-trigger it.** Every in-app write records itself and the watcher skips recorded paths, which is what holds a mutation to exactly one walk — the store's confirming reload — instead of a second watcher-triggered one. Between writes, authority is recency: the newest on-disk state wins.

Surviving events debounce to a settle, then main re-derives the tree with a **verification walk** — every directory enumerated, every file statted. The walk *is* the truth pass, so tree-vs-disk drift is unrepresentable; reads and parses run only for entries whose mtime or size moved. The fresh tree pushes whole over IPC, where structural sharing collapses echoes to zero re-renders. Identity survives an external rename because the id rides in the file itself.

---

#### Adoption — opening any folder as a Nexus

Opening a folder as a Nexus stamps every un-adopted entity with a real ULID: a raw folder gets its sidecar, an externally-authored page gets a frontmatter `id`. Parents are stamped before children, so a Set's healed `parent_id` points at its parent's fresh id. Root folders holding content become Page Collections and everything nested becomes a Set; agenda singletons, excluded and hidden folders, and empty sidecar-less folders are left alone, and an unrecognized sidecar stays inert beside the one Pommora writes. The pass is silent, best-effort, idempotent, and safe to re-run on partial state. Full per-shape detail → `// Features//Collections.md`.

**Kind authority = the folder sidecar, not the extension.** A `.md` file's kind comes from its parent folder's sidecar (`_pagecollection.json` / `_pageset.json` → Page), never from frontmatter. Any kind-like frontmatter key is treated as preserved foreign frontmatter — carried by value, never written by Pommora. The one extension-borne kind is an agenda item's task-vs-event suffix.

---

#### Migration — schema versioning

**Index-side** — covered above: a version mismatch deletes + rebuilds the index, no per-user data migration.

**File-side** — `nexus.json` carries the nexus schema version; folder sidecars accept an optional `schema_version` Pommora doesn't write. There is no property-ID migration pass: the build is ID-first — values are `prop_<ulid>`-keyed from creation and definitions live in the nexus-wide registry — so entity files never need rewriting.

**Settings** — `settings.json` carries a `defaults_version`, and the open-time ensure backfills only the keys a decoder requires, leaving a complete file byte-identical. Pommora runs no settings migration of its own.

---

#### What this data layer leaves to the OS

Deliberately *not* built:

- **Versioning / file history / backup** — left to Time Machine, `git` on the Nexus, filesystem snapshots. No internal version store; in-session undo is free from the editor.

- **Cross-device sync (v1)** — placing the Nexus in a synced folder gives device-to-device sync. Real cloud sync is a long-term Prospect.

---

#### Reference

- `PommoraPRD.md` — high-altitude product spec; storage model.
- `// Features//Structure.md` — 2-layer model + PARA mapping + linking model.
- `// Features//Properties.md` — property catalog; the synthesized context properties; the nexus-wide registry + assignment model.
- `// Features//MarkdownPM.md` — editor architecture + save pipeline.
