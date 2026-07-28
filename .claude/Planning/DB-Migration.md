## DB Migration — Operational State Into `nexus.db`

Operational chrome (folds, active views, tabs, previews, recents) lives in hand-editable JSON under `.nexus/`. Every change is a whole-file read-modify-write behind a temp-file + fsync + rename, and the machinery compensating for that cost — a debounce engine, a drain contract, a quit gate, per-file locks — is larger than the state it protects. Typed rows in the app-owned database remove the cost and the compensation together.

### Findings That Set the Scope

**The database has never run.** `better-sqlite3` is a native module compiled for Node's ABI; Electron requires a different one. `openDb` catches the load failure and returns `null` by design, so the index silently never opened and `index.db` exists in no nexus. Its tests pass because Vitest runs under plain Node. `node:sqlite` ships inside Electron's bundled Node and both runtimes load it, which removes the native dependency and the failure class.

**Nothing queries the index.** `sessionDb()` has no production caller; the only `SELECT`s in the tree are the schema handshake's own. Every successful mutation deletes the file and cold-rebuilds it from a full nexus walk.

**Two kinds of defensive code look alike.** Format defence — validating a parsed shape, tolerating corrupt JSON, repairing internal inconsistency — exists because a file is hand-editable, and typed rows delete it. Reference reconciliation — a saved id pointing at a page that is no longer on disk — exists because files are canonical, and no storage change touches it. Foreign keys cannot reach the filesystem; only format defence is in scope.

**Search stays in memory.** The nav palette ranks a fuzzy subsequence over an array built once per tree change. SQL has no fuzzy operator, so the same match becomes an unindexable scan plus an IPC round-trip. Full-text over page bodies is a separate future capability, not this migration.

### Decisions

- **Block layout is chrome.** Column ratios, tile heights, and split structure are a saved arrangement, not content; the repair-not-reject decode that keeps a hand-edited layout renderable retires with them.
- **Favorites and pins stay files.** Deliberate, small, rarely written, and the only genuinely sync-worthy members of the set. Their per-file tombstone design and the watcher's nav channel stay with them.
- **Recents, tabs, and previews become device-local.** High-churn ambient state whose cross-device merge has no correct answer.
- **The content mirror goes; the plumbing stays.** Opening the file, the version handshake, and the generic row writer serve the operational store. The nine entity tables and the full-pass builder that fills them have no consumer, and the builder cannot satisfy the cheap-and-scoped rule at any size.
- **Sidebar sections are unbuilt, not migrated.** React reads an always-empty Swift-era file and never writes it. The scaffold's removal is its own task — `userSections` threads through twenty files and a live Sidebar render.

### Rules

- Every DB action is a single scoped statement. No full-pass rebuild, no read-merge-write.
- The expensive part was the file, not the value. A store always read and written whole stays one row holding one value; per-row schemas are only for what is queried per row.
- An emptied value deletes its key, matching the properties map and contexts.
- The database is regeneratable and device-local. It never holds content, and it is excluded from the watcher.

### Phases

**P0 — Make the database real.** Swap the driver behind `db.ts`, drop the native dependency and the rebuild scripts, rename the file to `nexus.db`, and make a null handle loud instead of silent.

**P1 — Delete the content mirror.** Remove the builder, the entity DDL, the typed upserts, and their tests. Drop the per-mutation refresh so no mutation triggers a walk.

**P2 — The device-local stores.** One `local_state` table keyed by scope and key. Folds, active views, view orders, table heading columns, and link titles collapse into it; their modules, tests, and files retire.

**P3 — Recents, tabs, previews.** One row each. The debounce engine, the drain contract, the quit gate, and the nexus-switch flush retire with them; the favorites and pins paths keep their file machinery.

**P4 — Block layout as chrome.** Retire the layout repair pass.

Gates run green after every phase. A code review and a simplification pass follow the last one.
