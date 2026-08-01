### Architecture — Data Layer + Nexus

The dynamics of Pommora's data layer — the on-disk Nexus, the read + state layer, the device-local database, the atomic-write contract, the adopter, and the external-edit watcher. PRD carries the high-altitude storage model.

---

#### Two load-bearing principles

Every architectural choice below traces back to one of these.

1. **Files are canonical (≠ everything is Markdown).** One `.md` grammar covers the operational layer — Pages, Tasks and Events alike, each naming its kind in its id key; JSON is for sidecars, configs and registries. The database is *reserved* for operational state rather than barred from content, and the line runs at assignment: a property definition may move into it, while the assignment on a container's sidecar and the value in a Page's frontmatter stay files. Structure and content stay readable without Pommora; the standing invariant is that nothing is trapped.

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

Every sidecar's field shape is canonical in `src//shared//schemas.ts`.

**Classification by sidecar + folder position.** A root folder carrying a Pages sidecar IS a Page Collection — regardless of folder name; folders rename freely via Finder. The per-kind sidecar filenames (`_pagecollection.json` / `_taskconfig.json` / `_eventconfig.json`) are the kind discriminators at the root. Below the root, position alone decides: every non-excluded subfolder of a Collection or Set is itself a Set, to any depth, with no cap, and a Set carries its own saved views wherever it sits (→ `// Features//PageSets.md`).

**No wrapper folders.** Page Collections and the Tasks / Events singletons all live as siblings at the nexus root — there is no `Pages/` or `Agenda/` container folder.

**Agenda is discriminated by config sidecar, never by name** — and only where the nexus RECORDS it. A Tasks / Events singleton is the folder whose config sidecar id matches the registration `nexus.json` holds; the folder names are renameable defaults, and a Page Collection named "Tasks" is still a Collection. No name is ever reserved.

**Registration is written once, at nexus creation, and never backfilled.** Seeding runs only when a nexus is first opened without an identity file; a nexus holding no registration record therefore holds none forever, and every agenda config in it is inert. Nothing repairs that on a later open — reopening a nexus must never recreate folders its owner deleted.

**Registration is the guard.** A hand-made agenda config carries an id the record doesn't name, so it matches nothing and is inert bytes — not a second singleton, not a Collection, not anything. That is what makes "one Tasks folder" true without a rule enforcing it.

**A copy is the case the record can't settle alone.** Every ordinary duplication — a Finder duplicate, a recursive copy, a restored backup, a sync conflict copy — reproduces the id the registration keys on, so the copy matches the record exactly as the original does. Two folders at the root answering to one record therefore register *nobody*: no arm may pick between them, and the real singleton goes inert alongside its copy deliberately, because nothing is written and deleting the stray config restores the nexus completely. A copy below the root is inert on depth alone and stays where its owner filed it.

**Carrying a nested singleton home applies only to a slot with no folder at the root.** The record names which folder is canonical, so a singleton genuinely dragged away can be returned. When the root still holds one, nothing was displaced and a nested folder claiming that record is a copy — moving it would take it out of wherever its owner put it, and leave the two contesting the slot on the next open.

**One resolver owns the answer, at any depth.** Classification is not a root-only question — a folder is placed by what it declares plus where it sits, so a nested agenda config resolves to nothing rather than reading as an ordinary Set.

**One predicate owns what a content file is,** and the extension matches case-insensitively — a file written by another editor is the same file to the person who wrote it. The read walk, the adoption pass and every nexus-wide sweep ask that one question, so a file the tree shows is a file the sweeps reach. Two passes disagreeing would leave a page that renders normally and quietly goes stale: its links surviving a rename, its property cells reading empty.

**Hidden + private.** `.nexus/` and `.trash/` are hidden from the sidebar and from non-Pommora tools by convention (matches `.obsidian/`).

**The trash mirrors the nexus.** A deleted entity keeps the folder chain it came from and takes a timestamp on its leaf, so the layout itself records where the item lived — restoring is dropping the stamp and moving it back up. Collisions within one folder de-collide on the leaf, so the same title deleted twice keeps both.

> **Pending — trash restore surface.** No surface browses or restores the trash; the mirrored layout is the whole of the record, so putting an item back is a manual move.

**User folder exclusion.** Beyond the built-in skips, `excluded_folders` on `settings.json` takes anchored nexus-relative paths the read walk, the adoption pass and the watcher all ignore at any depth — never adopted, shown, indexed, or auto-tagged, and the property fan-outs inherit that for free by deriving their folder list from the tree. The title cascades are the deliberate exception: they rewrite every `.md` under the root so an excluded folder's `[[link]]`s and Context keys stay correct rather than rotting. The filter is subtractive and root-anchored, which is what keeps an ordinary exclusion from reaching the internal `.nexus/` reads that run through it too. Editing UI is deferred to Settings.

---

#### Read + state layer

There is no per-kind manager layer. The read side is **one eager, read-only walk** in main (`readNexus`) producing a pre-ordered `NexusTree` — the whole tree in a single pass, consumed by the renderer without re-sorting. The renderer holds it in a Zustand store; there is no per-entity cache and no dependency-injection graph.

Three seams keep that single walk cheap. A **mtime-gated parse cache** reuses decoded sidecars and frontmatter for files that haven't changed. **Self-write suppression** makes the watcher ignore the app's own writes, so a mutation costs exactly one walk instead of two. A **structural-sharing stabilize pass** in the renderer collapses an unchanged subtree back to its previous object identity, so a refetch re-renders only what actually moved.

**Every renderer lookup over the tree is a projection of one record set.** `treeIndex` walks the tree once per identity, producing a record per entity (kind, id, title, resolved icon, path, breadcrumbs), cached against the tree object itself — the same identity `stabilize` preserves, so an echo push invalidates nothing and a real push invalidates everything at once. The record *list* is the source and duplicate ids stay listed — a copied `.md` carries its id in frontmatter, and title resolution must still answer "ambiguous" — while the keyed projections collapse last-wins. The reconcile, resolve, search, connections, and thumbnail-key tables all derive from those records lazily and share the cache; no consumer walks the tree for a lookup, and a new lookup belongs there as another projection, never as its own walk. The reserved `context` selection kind reconciles dead by declaration — a Context group is a disclosure, not a destination, and no stored ref may outlive what no surface can render.

Mutations are separate by construction: the write path never runs inside a read, and every write is followed by one refetch.

---

#### The IPC bridge

Every channel between the renderer and main is declared exactly once, in `src/shared/bridge.ts` — its name, direction, argument tuple, and reply type — and both processes derive from that map. The preload builds its dialers from the declarations (a method is a channel key; the signature flows from the map), and main answers through one exhaustive handler object the compiler checks in both directions: a declared channel with no handler, a handler for no channel, a duplicate, or a mismatched signature is a compile error. Adding a channel is one map entry plus one handler; nothing else exists to drift.

Each handler entry declares its boundary policy beside its body. Enveloped channels — every data read and write — return the shared `Result` whole, so the structured error (`code` + `message` + optional `scope`) reaches the renderer instead of flattening to a sentence; a throw lands as a failure envelope, never a rejection. Bare channels (native menus resolving an action-or-null, pickers, the sentinel reads whose absence is a valid answer) keep their raw replies, with window injection and null-on-no-window handled by the entry's kind. The session refusals live as two shared constants with their own codes — one spelling each, everywhere — and the four per-machine scope pairs ride one generator that owns their guard ladder and the emptied-value-deletes-its-key rule. Pushes are typed on both halves: main sends through one helper the map types, the preload derives the subscribers.

The bridge is pure types plus nothing — the sandboxed preload's bundle may require only Electron, so anything it consumes from shared must carry zero runtime imports, and the map is built to that constraint.

---

#### The device-local database

`<nexus>/.nexus/nexus.db` travels with the Nexus so a moved or renamed one keeps it without re-pathing, and holds exactly one table of substance: `local_state`, keyed by `(scope, key)`. DDL is canonical in `src//main//db//schema.ts`; `node:sqlite` sits behind `driver.ts` as the swappable seam, so there is no native module to compile and no runtime ABI to match.

**What lives here.** Per-machine chrome, which is the whole of what it is reserved for — folded headings, the active view per container, manual row order under a sort, table heading columns, the fetched-title cache, the tab set, the preview sets, the recents stream, and every block host's document. None of it is authored content, and two machines interleaving any of it has no correct answer.

**What deliberately does not.** Pinned and favorites live in `navigation.json`, because they are deliberate, rarely written, and the one part of Navigation worth following a user across machines — ordered arrays of bare `{kind, id}` refs beside the NavView's banner pointer, written as a serialized patch so no writer can drop another's key. A markdown tile's body stays a file too — it is prose, it lives in the connections graph, and a rename cascade rewrites it. Everything canonical — the registry, Contexts, settings, schemas, and each host's own sidecar — stays a file, because that is where a Nexus's meaning has to survive without Pommora.

**What the line at assignment buys.** A Page's frontmatter names its own properties, so a files-only reader gets the entity's attributes in plain language with no lookup of any kind. Move the registry into the database and that reader loses the presentation config — type, options, colours, formats — but never the ability to read a value. A Collection's assignment list and its remove-cache stay id-keyed, which is what makes them immune to a rename and keeps the sweep to `.md` files alone.

**A Pommora-governed frontmatter key is recognized by its wrap alone** — `(Context)` for the organization layer, `<Property>` for the attribute layer. That partitions the keyspace with no reserved-name blocklist, keeps the walk's key retention registry-independent so a registry edit never busts the parse cache, and lets a root rewrite sweep governed keys by shape while every foreign key and comment survives. One module owns the pair, the key build and parse, the governed-key predicate, the reserved leading `$`, and every refusal message; changing a glyph is a one-line edit. Recognizing a key is not the same as resolving one: a key registers as a live value only on a registry title match.

**Every action is one statement.** A change is a single-row upsert; an emptied value deletes its key. Nothing coalesces and nothing locks, so no write here needs a debounce or a drain contract. Navigation intent is the one operational write going to disk, so it keeps the before-quit gate that defers the app's exit until a write settles.

**Versioned, not migrated.** A schema mismatch on open deletes the file and starts clean. That costs a machine its chrome once — the same outcome a corrupt sidecar always had — and is why the schema stays small enough that the trade is obviously worth it. Only a healthy open reporting the wrong version earns that drop: a file that fails to open at all (locked, mid-sync) stays put, and the session just runs without persisted state until a later launch reads it.

---

#### Atomic-write contract

Every file write goes through an atomic path — temp-file + rename, so a crash mid-write leaves either the whole old file or the whole new file, never a half-written one:

- **YAML+Markdown write** — Pages. The body follows the closing fence directly, with no separator blank line, so a note never opens with an empty line under Obsidian's properties panel. Only modeled keys are re-serialized; every foreign frontmatter key and comment survives by value. The preserving-merge mechanics are canonical in `// Features//Pages.md` § "Read + Write".

- **JSON write** — sidecars, Contexts, Settings, Homepage.

- **Schema transaction** — multi-file commits that must succeed-or-fail as a unit: a Collection-scoped property delete or a lossy type change rewrites the sidecar *and* strips the property from every member page. Two-phase — stage every payload to a temp sibling, then rename each over its target, rolling the filesystem back on any failure. The nexus-wide property delete deliberately opts out: it snapshots every value to `.trash` first and runs per-file, so a partial run re-runs cleanly rather than rolling back.

**Page save contract.** The editor binds only to `body`, so it cannot destroy frontmatter — that's held as a typed struct and re-serialized on save. Autosave belongs to one **path-keyed flush registry** shared by every editor host: edits debounce per page path, any path flushes on demand, and everything flushes on teardown, nexus switch and window close. No host carries its own debounce, so a page can never race two savers. Write mechanics → `// Features//Pages.md` § "Read + Write".

---

#### File-watcher

Out-of-band changes — Obsidian, vim, Finder, cloud-sync — reach the sidebar without a restart, through a recursive watch on the Nexus root. The database and its WAL siblings, `.trash`, dotfile cruft, every block host's tile bodies, and the user's `excluded_folders` are ignored at intake so their churn never costs a reconcile. `.nexus/` itself stays watched, because Contexts, settings and ordering live there and an outside edit to them must refresh live.

**The watcher exists for external changes; the app's own writes must not re-trigger it.** Every in-app write records itself and the watcher skips recorded paths, which is what holds a mutation to exactly one walk — the store's confirming reload — instead of a second watcher-triggered one. Between writes, authority is recency: the newest on-disk state wins.

Surviving events debounce to a settle, then main re-derives the tree with a **verification walk** — every directory enumerated, every file statted. The walk *is* the truth pass, so tree-vs-disk drift is unrepresentable; reads and parses run only for entries whose mtime or size moved. The fresh tree pushes whole over IPC, where structural sharing collapses echoes to zero re-renders. Identity survives an external rename because the id rides in the file itself.

---

#### Adoption — opening any folder as a Nexus

Opening a folder as a Nexus stamps every un-adopted entity with a real ULID: a raw folder gets its sidecar, an externally-authored page gets its kind's id key. Each entity's id is its own — nothing stamped depends on a sibling or a parent having been stamped first. Root folders holding content become Page Collections and everything nested becomes a Set; excluded and hidden folders, empty sidecar-less folders, and anything the resolver can't place are left alone, and an unrecognized sidecar stays inert beside the one Pommora writes. A **registered** agenda singleton stamps its own direct `.md` members under the agenda kind, never container-stamps itself — its id already lives in its config sidecar — and never recurses, because agenda is flat. The pass is silent, best-effort, idempotent, and safe to re-run on partial state. Full per-shape detail → `// Features//Collections.md`.

**A move is refused unless its destination holds pages.** Every page and Set move passes one main-side check that resolves the destination's kind and admits only a Collection or a Set — not the nexus root, not an agenda singleton, not a folder the resolver can't place. No surface can offer such a move, so this guards the programmatic accident rather than the user.

**Kind authority is the folder's sidecar, and the file must agree with it.** The law is kind-first — *what is this* (the folder declares it) before *what is its id* — so a content file stores its id under the key naming its kind: `PageID`, `TaskID`, `EventID`. No extension carries a kind; no reader consults more than the one key its context names.

**The exception that proves it: one predicate reads all three keys.** Telling a *mismatched* file from a *missing* one is definitionally a multi-key question, so admission — and only admission — checks every key. Its answers are: the key agrees (a member), no key at all (adoptable, stamped at open), or **Unknown** — a key contradicting the folder, a value that can't be an identity, or two keys at once.

**Unknown is invisible and untouched.** Not an error, not surfaced, not indexed, and never stamped over: it is absent from the tree and skipped by every nexus-wide write, left byte-identical on disk. A stray `.png` in a Collection gets the same treatment, and for the same reason — Pommora renders what it can place and leaves the rest exactly as written. A file with no key is the opposite case and is admitted throughout: identity decides whether a value can be handed *back*, never whether it may be cleared.

---

#### Migration — schema versioning

**Database-side** — covered above: a version mismatch deletes the file and starts clean, no per-user data migration.

**File-side** — nothing on disk carries a schema version and the file side runs no migration. Sidecars decode loosely, so a version key an outside tool adds survives as an ordinary foreign key and is read by nothing. Property values are name-keyed at the frontmatter root, so a rename rewrites them in place through its own sweep rather than through a versioned pass. A frontmatter key naming nothing the registry knows rides through the same way — preserved by value, read by nothing.

**Settings** — `settings.json` is written into existence by the first write that needs it and holds only what was written. Every read tolerates its absence and falls back per field, so there is nothing to backfill and no settings migration to run.

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
