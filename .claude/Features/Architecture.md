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

**Agenda is discriminated by config sidecar, never by name.** A Tasks / Events singleton is *only* the folder carrying `_taskconfig.json` / `_eventconfig.json`; folder names (`Tasks` / `Events`) are renameable defaults, not reserved. Every collection-discovery path — adoption, the read walk, on-creation — skips a folder *iff* it carries an agenda config sidecar, so a user could even name a Page Collection "Tasks" or "Events" and it's correctly a Collection. No name is ever reserved.

**An agenda item's own kind is its filename suffix.** `.task.json` and `.event.json` are the on-disk task-vs-event discriminator, deriving both the kind and the title, and load-bearing in the read walk and the index build.

> **Pending — per-file kind at adoption.** Adoption classifies at the folder level and skips agenda folders wholesale, so no individual file is scoped to a kind when a folder is adopted. Applying the existing suffix discriminator per file lands with the Agenda surfaces.

**Hidden + private.** `.nexus/` and `.trash/` are hidden from the sidebar and from non-Pommora tools by convention (matches `.obsidian/`).

**The trash mirrors the nexus.** A deleted entity keeps the folder chain it came from and takes a timestamp on its leaf, so the layout itself records where the item lived — restoring is dropping the stamp and moving it back up. Collisions within one folder de-collide on the leaf, so the same title deleted twice keeps both.

> **Pending — trash restore surface.** Nothing browses or restores the trash yet; the path record it needs is on disk.

**User folder exclusion.** Beyond the built-in skips (dot/underscore-prefixed + `node_modules`), the user can exclude arbitrary folders via `excluded_folders` on `settings.json` — anchored, nexus-relative paths Pommora ignores *completely* at any depth: never adopted, shown, indexed, walked, or auto-tagged. One subtractive filter (whole-segment, case-insensitive + NFC, root-anchored) loads directly from disk, so it works in the index-rebuild pass that runs before the per-Nexus environment exists. Internal `.nexus/` Context reads run the same filter; root-anchoring is what keeps an ordinary exclusion from reaching them. Editing UI is deferred to Settings.

---

#### Read + state layer

There is no per-kind manager layer. The read side is **one eager, read-only walk** in main (`readNexus`) producing a pre-ordered `NexusTree` — the whole tree in a single pass, consumed by the renderer without re-sorting. The renderer holds it in a Zustand store; there is no per-entity cache and no dependency-injection graph.

Three seams keep that single walk cheap. A **mtime-gated parse cache** reuses decoded sidecars and frontmatter for files that haven't changed. **Self-write suppression** makes the watcher ignore the app's own writes, so a mutation costs exactly one walk instead of two. A **structural-sharing stabilize pass** in the renderer collapses an unchanged subtree back to its previous object identity, so a refetch re-renders only what actually moved.

Mutations are separate by construction: the write path never runs inside a read, and every write is followed by one refetch.

---

#### SQLite index — regeneratable scaffolding

The index lives at `<nexus>/.nexus/index.db`, travelling with the Nexus so a moved or renamed Nexus keeps it without re-pathing. Context links live in the `context_links` table; `connections` carries body links from both page bodies and markdown blocks. DDL is canonical in `src//main//index//schema.ts`.

**Fully regeneratable.** The index is stamped with a `schema_version`; on open a mismatch force-deletes + rebuilds the whole DB — no per-user data migration. Losing the file just means a rebuild on next open.

**Launch-tail indexing contract.** On launch the index rebuilds **only** when the schema-version handshake flags it — there is no unconditional launch scan. The version is stamped only *after* a rebuild succeeds, so a failed rebuild retries next launch instead of locking in an empty index.

**No query consumer — the index is write-only.** Nothing in the app reads the index: there is no query facade, and the only statements issued against it outside the write layer are the schema-version handshake. Everything the product currently needs is answered off the in-memory tree instead — filter, sort, and group run renderer-side over frontmatter, Connections resolve against a title map built from the page tree, and Context links resolve at walk assembly. Writing the query facade is the open architectural task, and it gates the features that have no other route: Linked-from, backlinks, and full-text search (navigation search is title-and-kind only today).

**Update path — full rebuild per mutation.** There is no incremental updater and no per-entity delete. Every successful `mutate` op drops `index.db` and cold-rebuilds it from the files, which re-walks the nexus and re-reads every page body. The body-autosave channel is outside that contract — it lands on disk without touching the index — so a page Finder-dropped or typed into after a rebuild stays out of the index until the next mutation. This is a known violation of the never-rebuild-the-whole-Y rule, currently paid for no benefit; it resolves either by writing the query consumer that justifies it, or by suspending the refresh until one exists.

---

#### Atomic-write contract

Every file write goes through an atomic path — temp-file + rename, so a crash mid-write leaves either the whole old file or the whole new file, never a half-written one:

- **YAML+Markdown write** — Pages. The body follows the closing fence directly, with no separator blank line, so a note never opens with an empty line under Obsidian's properties panel. Only modeled keys are re-serialized; every foreign frontmatter key and comment survives by value. The preserving-merge mechanics are canonical in `// Features//Pages.md` § "Read + Write".

- **JSON write** — sidecars, Tasks / Events, Contexts, Settings, Homepage.

- **Schema transaction** — multi-file commits that must succeed-or-fail as a unit: a Collection-scoped property delete or a lossy type change rewrites the sidecar *and* strips the property from every member page. Two-phase — stage every payload to a temp sibling, then rename each over its target, rolling the filesystem back on any failure. The nexus-wide property delete deliberately opts out: it snapshots every value to `.trash` first and runs per-file, so a partial run re-runs cleanly rather than rolling back.

**Page save contract.** The editor binds only to `body`; frontmatter is held as a typed struct and re-serialized on save, so the editor can't destroy frontmatter. Autosave is owned by one **path-keyed flush registry** shared by every editor host (the page view, previews, embeds): edits schedule a debounced save per page path, any path can be flushed on demand, and everything flushes on host teardown, on a nexus switch, and on window close — so no host carries its own debounce and a page can never race two savers. Write mechanics → `// Features//Pages.md` § "Read + Write".

---

#### File-watcher

External + out-of-band on-disk changes (Obsidian / vim / Finder / cloud-sync) propagate to the sidebar without a restart, via a recursive watch on the Nexus root — the SQLite index, `.trash`, dotfile cruft, and the user's `excluded_folders` all ignored at intake so their churn never costs a reconcile. **The watcher exists for external changes — the app's own writes must not re-trigger it.** Every in-app write records itself (both endpoints of a rename/move/trash: an exact-path window, plus a shorter prefix window so a moved folder's descendants are covered), and the watcher skips recorded paths at intake. That suppression is what holds the mutation cost to **exactly one walk per op** — the store's confirming reload — instead of a second watcher-triggered one. Between writes, authority is recency: the newest on-disk state wins. Events that survive intake debounce to a settle, then main re-derives the tree with a **verification walk**: every directory is enumerated and every file statted — the walk *is* the truth pass, so tree-vs-disk drift is unrepresentable — while file reads and YAML/JSON parses run only for entries whose `(mtime, size)` moved (the walk cache; a racy-window rule re-parses hot files so coarse-mtime volumes can't serve a stale hit). The fresh tree pushes whole over IPC and the renderer's structural sharing collapses echoes to zero re-renders. Identity survives an external rename because the id rides in the file itself (frontmatter / sidecar), with the deterministic adopted-id fallback for unstamped files. A container-scoped surgical reconcile remains the designed escalation if measured scale ever outgrows the stat sweep — the verification walk then becomes its fallback + verify pass. Decision record → `History.md`.

---

#### Adoption — opening any folder as a Nexus

Opening a folder as a Nexus runs a stamp pass that gives every un-adopted entity a real ULID: a raw folder gets its sidecar, an externally-authored page gets a frontmatter `id`. Parents are stamped before children, so a Set's healed `parent_id` points at its parent's fresh id. Root folders holding content become Page Collections and everything nested becomes a Set; agenda singletons, excluded folders, hidden folders, and empty sidecar-less folders are left alone, and an unrecognized sidecar stays **inert on disk** beside the one Pommora writes. The pass runs silently and best-effort on every open, is idempotent, and is safe to re-run on partial state. Full per-shape detail → `// Features//Collections.md`.

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
