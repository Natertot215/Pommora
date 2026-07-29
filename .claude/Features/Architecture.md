### Architecture — Data Layer + Nexus

The dynamics of Pommora's data layer — the on-disk Nexus, the read + state layer, the device-local database, the atomic-write contract, the adopter, and the external-edit watcher. PRD carries the high-altitude storage model.

---

#### Two load-bearing principles

Every architectural choice below traces back to one of these.

1. **Files are canonical (≠ everything is Markdown).** Only Pages are Markdown; Tasks, Events, sidecars, Contexts, Homepage, and Settings stay JSON. The database is *reserved* for operational state rather than barred from content, and the line runs at assignment: a property definition may move into it, while the assignment on a container's sidecar and the value in a Page's frontmatter stay files. Structure and content stay readable without Pommora; the standing invariant is that nothing is trapped.

2. **Agent legibility.** External agents (Claude via MCP, any filesystem tool, vim, Obsidian) read the content and understand the context of a user's Nexus — Pages, schemas, relations, properties — straight from plain files. The bar is convention-aware, not stranger-instant: a file that abstracts a resolver, an id reference, or a path lookup still counts as legible once the agent has learned the convention. The firm line holds: no user data is trapped in a binary blob. Legibility is a claim about content, not about every byte the app stores — which is why per-machine chrome belongs in the database rather than in a file an agent would have to learn to ignore.

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

  .nexus/                               ← app-internal config + the device-local database
    nexus.json                          ← nexus ULID + createdAt + schema version
    state.json                          ← top-level ordering (Collections, per-Context Space order)
    settings.json                       ← per-Nexus UI labels + accent + excluded_folders + profile
    properties.json                     ← nexus-wide property registry (propId → definition)
    homepage.json                       ← the Homepage's own identity + banner
    navview.json                        ← the NavView's banner
    navFavorites.json                   ← the favorites list (synced)
    pins/<kind>-<id>.json               ← one file per durable pin (synced)
    nexus.db                            ← device-local operational state (schema-versioned)
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

**An agenda item's own kind is its filename suffix.** `.task.json` and `.event.json` are the on-disk task-vs-event discriminator, deriving both the kind and the title, and load-bearing in the read walk.

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

#### The device-local database

`<nexus>/.nexus/nexus.db` travels with the Nexus so a moved or renamed one keeps it without re-pathing, and holds exactly one table of substance: `local_state`, keyed by `(scope, key)`. DDL is canonical in `src//main//db//schema.ts`; `node:sqlite` sits behind `driver.ts` as the swappable seam, so there is no native module to compile and no runtime ABI to match.

**What lives here.** Per-machine chrome, which is the whole of what it is currently reserved for — folded headings, the active view per container, manual row order under a sort, table heading columns, the fetched-title cache, the tab set, the preview sets, the recents stream, and every block host's document. None of it is authored content, and two machines interleaving any of it has no correct answer.

**What deliberately does not.** Favorites and pins stay files, because they are deliberate, rarely written, and the one part of Navigation worth following a user across machines. A markdown tile's body stays a file too — it is prose, it lives in the connections graph, and a rename cascade rewrites it. Everything canonical — the registry, Contexts, settings, schemas, and each host's own identity sidecar — stays a file, because that is where a Nexus's meaning has to survive without Pommora.

**What the line at assignment buys.** A Page's frontmatter names its own properties, so a files-only reader gets the entity's attributes in plain language with no lookup of any kind. Move the registry into the database and that reader loses the presentation config — type, options, colours, formats — but never the ability to read a value. A Collection's assignment list and its remove-cache stay id-keyed, which is what makes them immune to a rename and keeps the sweep to `.md` files alone.

**A Pommora-governed frontmatter key is recognized by its wrap alone** — `(Context)` for the organization layer, `<Property>` for the attribute layer. That partitions the keyspace with no reserved-name blocklist, keeps the walk's key retention registry-independent so a registry edit never busts the parse cache, and lets a root rewrite sweep governed keys by shape while every foreign key and comment survives. One module owns the pair, the key build and parse, the governed-key predicate, the reserved leading `$`, and every refusal message; changing a glyph is a one-line edit. Recognizing a key is not the same as resolving one: a key registers as a live value only on a registry title match.

**Every action is one statement.** A change is a single-row upsert; an emptied value deletes its key. Nothing coalesces and nothing locks, which is what retired the debounce engine and its drain contract. Favorites are the one operational write still going to disk, so they keep the before-quit gate that defers the app's exit until a write settles.

**Versioned, not migrated.** A schema mismatch on open deletes the file and starts clean. That costs a machine its chrome once — the same outcome a corrupt sidecar always had — and is why the schema stays small enough that the trade is obviously worth it. Only a healthy open reporting the wrong version earns that drop: a file that fails to open at all (locked, mid-sync) stays put, and the session just runs without persisted state until a later launch reads it.

---

#### Atomic-write contract

Every file write goes through an atomic path — temp-file + rename, so a crash mid-write leaves either the whole old file or the whole new file, never a half-written one:

- **YAML+Markdown write** — Pages. The body follows the closing fence directly, with no separator blank line, so a note never opens with an empty line under Obsidian's properties panel. Only modeled keys are re-serialized; every foreign frontmatter key and comment survives by value. The preserving-merge mechanics are canonical in `// Features//Pages.md` § "Read + Write".

- **JSON write** — sidecars, Tasks / Events, Contexts, Settings, Homepage.

- **Schema transaction** — multi-file commits that must succeed-or-fail as a unit: a Collection-scoped property delete or a lossy type change rewrites the sidecar *and* strips the property from every member page. Two-phase — stage every payload to a temp sibling, then rename each over its target, rolling the filesystem back on any failure. The nexus-wide property delete deliberately opts out: it snapshots every value to `.trash` first and runs per-file, so a partial run re-runs cleanly rather than rolling back.

**Page save contract.** The editor binds only to `body`, so it cannot destroy frontmatter — that's held as a typed struct and re-serialized on save. Autosave belongs to one **path-keyed flush registry** shared by every editor host: edits debounce per page path, any path flushes on demand, and everything flushes on teardown, nexus switch and window close. No host carries its own debounce, so a page can never race two savers. Write mechanics → `// Features//Pages.md` § "Read + Write".

---

#### File-watcher

Out-of-band changes — Obsidian, vim, Finder, cloud-sync — reach the sidebar without a restart, through a recursive watch on the Nexus root. The database and its WAL siblings, `.trash`, dotfile cruft and the user's `excluded_folders` are ignored at intake so their churn never costs a reconcile.

**The watcher exists for external changes; the app's own writes must not re-trigger it.** Every in-app write records itself and the watcher skips recorded paths, which is what holds a mutation to exactly one walk — the store's confirming reload — instead of a second watcher-triggered one. Between writes, authority is recency: the newest on-disk state wins.

Surviving events debounce to a settle, then main re-derives the tree with a **verification walk** — every directory enumerated, every file statted. The walk *is* the truth pass, so tree-vs-disk drift is unrepresentable; reads and parses run only for entries whose mtime or size moved. The fresh tree pushes whole over IPC, where structural sharing collapses echoes to zero re-renders. Identity survives an external rename because the id rides in the file itself.

---

#### Adoption — opening any folder as a Nexus

Opening a folder as a Nexus stamps every un-adopted entity with a real ULID: a raw folder gets its sidecar, an externally-authored page gets a frontmatter `id`. Parents are stamped before children, so a Set's healed `parent_id` points at its parent's fresh id. Root folders holding content become Page Collections and everything nested becomes a Set; agenda singletons, excluded and hidden folders, and empty sidecar-less folders are left alone, and an unrecognized sidecar stays inert beside the one Pommora writes. The pass is silent, best-effort, idempotent, and safe to re-run on partial state. Full per-shape detail → `// Features//Collections.md`.

**Kind authority = the folder sidecar, not the extension.** A `.md` file's kind comes from its parent folder's sidecar (`_pagecollection.json` / `_pageset.json` → Page), never from frontmatter. Any kind-like frontmatter key is treated as preserved foreign frontmatter — carried by value, never written by Pommora. The one extension-borne kind is an agenda item's task-vs-event suffix.

---

#### Migration — schema versioning

**Database-side** — covered above: a version mismatch deletes the file and starts clean, no per-user data migration.

**File-side** — `nexus.json` carries the nexus schema version; folder sidecars accept an optional `schema_version` Pommora doesn't write. The file side runs no schema migration. Property values are name-keyed at the frontmatter root, so a rename rewrites them in place through its own sweep rather than through a versioned pass. A frontmatter key naming nothing the registry knows rides through as an ordinary foreign key — preserved by value, read by nothing.

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
