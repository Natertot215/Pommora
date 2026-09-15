## Local Data — Implementation Plan

### Context

`nexus.db` and `versions.db` open at `<root>/.nexus/`, so every copy of a Nexus folder (USB, backup, Finder duplicate) carries this machine's tabs, folds, index, sync binding and sync bases, while the binding's password and the device key stay behind in app storage. This plan moves both databases into Electron's app storage at `<userData>/Nexuses/<nexusId>/`, stamps the Nexus root inside `nexus.db` so a moved folder keeps its state and a copied folder drops its sync bases, and adds a read-only **View Local Data** window that shows `nexus.db` table by table. It touches `Desktop/Store/`, `Core/Nexus/identity.ts` and `handlers.ts`, `Core/Contract/` (`HostContext`, `bridge.ts`), `Core/Sync/Client/session.ts`, `Desktop/main.ts`, `Desktop/Capture/thumbnails.ts`, `Core/Session/layoutSlice.ts`, `Core/Settings/NexusRows.tsx`, a new `Core/Interface/Windows/DatabaseWindow.tsx`, and the documents that state the in-folder placement.

It leaves alone: the `.db` exclusion in `Core/Paths/exclusion.ts` (kept as the rule that a live SQLite file a user places in their Nexus never syncs or attaches), the thumbnails under `.nexus/assets/<id>/thumbnails`, orphaned databases in app storage (no cleanup), damaged-file handling for `nexus.db` (a file that won't open stays where it is, as today), migration code (Nathan's NexusOS databases are moved by hand in Task 1.5), and `versions.db` in the viewer.

### Summary

Pommora's two private database files leave the Nexus folder and live in Pommora's own storage on each device, filed under the Nexus's ID. Your folder then holds only your content and shared config. Moving or renaming the folder keeps tabs, folds and the sync connection. Opening a copy while the original still exists makes sync re-check itself safely instead of risking deletes. Because the copy and the original share one ID, they also share tabs and folds, and switching between them re-checks sync each time. A database schema change no longer wipes the file.

A new Settings > Nexus row, **View Local Data**, opens a window listing every table in `nexus.db` with its row count. It shows the selected table's rows in the app's table styling, loading more as you scroll. The Sync row loses its sub-label.

#### Constraints

- Gates, from the repo root: `npm run typecheck` (the only type gate) · `npm run test` (Vitest; read the summary line) · `npm run lint` (`biome check`; read the output, it exits 0 with warnings). Use `set -o pipefail` when piping.
- The engine graph from `Core/Contract/serve.ts` stays free of `.tsx` and of externals beyond `ulidx`, `yaml`, `zod` (`Core/Contract/engineGraph.test.ts`).
- Every bridge channel answers with the `Result` envelope and never throws.
- The `.db` exclusion rule (`STORE_FILE`, `neverWatched`, `manifestAdmits`) does not change.
- `openSessionDb` never throws; a missing or unopenable database degrades to null stores.
- New code carries section comments only (`// Section` in TypeScript, `/* Section */` in CSS). Existing comments on code a task doesn't rewrite stay as they are; a comment the task makes false is deleted or trimmed, never replaced with new rationale. Biome formats every write; never hand-align.
- Title-Case action labels ("View Local Data", "Open"); captions stay sentence case ("1,204 rows").
- Placeholders show nothing: no build-status or "empty" text.
- Nathan is present: no smoke launches or CDP driving. User checks live in each Review Checkpoint and are ticked only on Nathan's word.
- Commits use `git commit --only -m "…" -- <paths>` (`-m` before `--`), `git add` for new files first. Adjacent edits Nathan made are bundled, never reverted.
- Each phase closes with the `closeout` skill, handed that phase's Reconciliation entries; it reviews, rewrites those documents plus any other claim its sweep finds false, and commits.
- AFTER blocks show the resulting code as Biome will leave it, give or take line wrapping. `…` marks code the task leaves unchanged.

#### Baseline

- Gates: green at `d95fb11d7`.
- `grep -rn "nexusDir(" Desktop/Store --include='*.ts' | wc -l` → 2 — goes to 0
- `grep -rn "SCHEMA_VERSION\|removeDbFiles\|DB_SIBLINGS" Desktop --include='*.ts' | wc -l` → 12 — goes to 0
- `grep -rn "'no-db'" Core --include='*.ts' | wc -l` → 3 — goes to 0
- `grep -rn "syncCaption" Core | wc -l` → 2 — goes to 0
- `grep -rln "'.nexus'" Desktop/Store | wc -l` → 3 — goes to 0
- `npm run test` summary → 4846 tests in 398 files — moves by the tests each task names

**START:** 2026-09-15T01:30:31Z
**END:** 2026-09-15T02:16:08Z

#### Implementation Process

- [ ] **Phase 1** — Relocate the Stores
  - [x] Task 1.1
  - [x] Task 1.2
  - [x] Task 1.3
  - [x] Task 1.4
  - [x] Closeout (commit) — `/closeout` scoped to this phase, handed this phase's Reconciliation entries
  - [x] Task 1.5
  - [x] Review Checkpoint
- [x] `[Stop: Nathan checks NexusOS after the move before Phase 2]`
- [ ] **Phase 2** — Local Data Channels
  - [ ] Task 2.1
  - [ ] Task 2.2
  - [ ] Closeout (commit) — `/closeout` scoped to this phase, handed this phase's Reconciliation entries
- [ ] **Phase 3** — View Local Data Window
  - [ ] Task 3.1
  - [ ] Task 3.2
  - [ ] Task 3.3
  - [ ] Closeout (commit) — `/closeout` scoped to this phase, handed this phase's Reconciliation entries
  - [ ] Review Checkpoint
- [ ] `[Stop: Nathan checks the window and Settings before Final Verification]`

### Phase 1 — Relocate the Stores

**GOAL:** Both databases open from `<userData>/Nexuses/<nexusId>/` with the root stamp, the schema drop removed, and sync's no-base invariant made explicit. It's its own phase because it moves Nathan's live data, which he checks before anything builds on it.

#### Task 1.1

**TASK:** An unreadable `nexus.json` yields no id instead of a throwaway one, and the open sequence returns the id it resolved.

**FILES:** `Core/Nexus/identity.ts`, `Core/Nexus/identity.test.ts`, `Core/Nexus/handlers.ts`, `Desktop/Capture/thumbnails.ts`, `Desktop/Capture/thumbnails.test.ts`

**NOW**

```ts
// Core/Nexus/identity.ts
export async function ensureIdentity(root: string): Promise<{ id: string; created: boolean }> {
  const path = nexusConfig(root, NEXUS_CONFIG_FILES.identity)
  const read = await readJsonStrict(path)
  // A nexus.json that exists but can't be read must not be re-minted over — the id it holds keys the asset folders. The session runs on a throwaway id, nothing is written, and the next open reads the real one.
  if (!read.ok && read.error.code !== 'not-found') return { id: newId(), created: false }
  …

// Core/Nexus/handlers.ts
async function prepareOpenedNexus(path: string): Promise<void> {
  try {
    await ensureIdentity(path)
    await ensureConfigLayout(path)
    await ensureContextsRegistry(path)
  } catch (e) {
    console.error('ensure config-on-open failed:', e)
  }
  try {
    await stampAdopted(path)
  } catch (e) {
    console.error('Adopt/stamp pass failed:', e)
  }
}

// Desktop/Capture/thumbnails.ts, line 1
// Written under the SYNCED thumbnails tree so a second machine gets real previews. Full-page capturePage then crop sidesteps the HiDPI rect-crop bug; JPEG has no alpha, dodging the transparent→black resize bug.

// Desktop/Capture/thumbnails.ts, captureThumbnail and evictThumbnails
const { id: nexusId } = await ensureIdentity(root)

// Core/Nexus/identity.test.ts
it('runs the session on a throwaway id when nexus.json is unreadable — file untouched', async () => {
  await mkdir(nexusDir(root), { recursive: true })
  await writeFile(idPath(), '{ corrupt', 'utf8')
  const r = await ensureIdentity(root)
  expect(r.created).toBe(false)
  expect(isUlid(r.id)).toBe(true)
  expect(await readFile(idPath(), 'utf8')).toBe('{ corrupt')
})

// Desktop/Capture/thumbnails.test.ts
const { id } = await ensureIdentity(root)
const dir = join(root, '.nexus', 'assets', id, 'thumbnails')
```

**CHANGE**

- [ ] Rewrite the identity test first and watch it fail.
- [ ] `ensureIdentity` returns `id: null` for an unreadable file; delete the comment above that line, which the change makes false.
- [ ] `prepareOpenedNexus` returns the id.
- [ ] Both thumbnail functions stop on a `null` id before any work; trim the first sentence from `thumbnails.ts` line 1.
- [ ] `thumbnails.test.ts` narrows the id.

**AFTER**

```ts
// Core/Nexus/identity.ts
export async function ensureIdentity(
  root: string,
): Promise<{ id: string | null; created: boolean }> {
  const path = nexusConfig(root, NEXUS_CONFIG_FILES.identity)
  const read = await readJsonStrict(path)
  if (!read.ok && read.error.code !== 'not-found') return { id: null, created: false }
  …

// Core/Nexus/handlers.ts
async function prepareOpenedNexus(path: string): Promise<string | null> {
  let nexusId: string | null = null
  try {
    nexusId = (await ensureIdentity(path)).id
    await ensureConfigLayout(path)
    await ensureContextsRegistry(path)
  } catch (e) {
    console.error('ensure config-on-open failed:', e)
  }
  try {
    await stampAdopted(path)
  } catch (e) {
    console.error('Adopt/stamp pass failed:', e)
  }
  return nexusId
}

// Desktop/Capture/thumbnails.ts, line 1
// Full-page capturePage then crop sidesteps the HiDPI rect-crop bug; JPEG has no alpha, dodging the transparent→black resize bug.

// Desktop/Capture/thumbnails.ts
export async function captureThumbnail(
  win: BrowserWindow,
  root: string,
  navKey: string,
  rect: ThumbRect,
  scaleFactor: number,
): Promise<string | null> {
  if (rect.width < 1 || rect.height < 1) return null
  const { id: nexusId } = await ensureIdentity(root)
  if (nexusId === null) return null
  const img = await win.webContents.capturePage()
  …
  const buf = masked.resize({ width: THUMB_WIDTH, quality: 'good' }).toJPEG(78)
  const key = thumbKey(navKey)
  const rel = thumbRel(nexusId, key)
  …
}

export async function evictThumbnails(root: string, liveKeys: string[]): Promise<void> {
  const { id: nexusId } = await ensureIdentity(root)
  if (nexusId === null) return
  const dir = thumbsDir(root, nexusId)
  …
}

// Core/Nexus/identity.test.ts
it('keys nothing when nexus.json is unreadable — file untouched', async () => {
  await mkdir(nexusDir(root), { recursive: true })
  await writeFile(idPath(), '{ corrupt', 'utf8')
  expect(await ensureIdentity(root)).toEqual({ id: null, created: false })
  expect(await readFile(idPath(), 'utf8')).toBe('{ corrupt')
})

// Desktop/Capture/thumbnails.test.ts
const { id } = await ensureIdentity(root)
if (id === null) throw new Error('the identity did not mint')
const dir = join(root, '.nexus', 'assets', id, 'thumbnails')
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes.
- [ ] `npm run typecheck` green; `npm run test -- Core/Nexus/identity.test.ts Desktop/Capture` passes, and the identity test fails with `newId()` restored.
- [ ] `grep -rn "ensureIdentity(" --include='*.ts' Core Desktop | grep -v test` → `handlers.ts` and both thumbnail functions, each handling `null`.

#### Task 1.2

**TASK:** Both openers take a store directory instead of a Nexus root. `openNexusDb` drops the schema-version drop-and-recreate and stamps the root, clearing sync bases only when the stamped root is a different folder that still exists.

**FILES:** `Desktop/Store/open.ts`, `Desktop/Store/ddl.ts`, `Desktop/Store/driver.ts`, `Desktop/Store/versionsDb.ts`, `Desktop/Store/open.test.ts`, `Desktop/Store/versionsDb.test.ts`

**DEPENDENCIES:** Shares Task 1.3's commit. `sessionDb.ts` still passes a root until 1.3, so only this task's own test files go green here.

**NOW**

```ts
// Desktop/Store/open.ts
import { rmSync, existsSync, mkdirSync } from 'node:fs'
import { join } from '@pommora/core/Paths/posix'
import { DB_SIBLINGS, openDb, type Db } from './driver'
import {
  applySchema,
  INDEX_GENERATION,
  readMeta,
  SCHEMA_VERSION,
  truncateIndex,
  writeMeta,
} from './ddl'
import { nexusDir } from '@pommora/core/Paths/paths'

export const DB_FILENAME = 'nexus.db'

function removeDbFiles(dbPath: string): void { … }

export function openNexusDb(nexusRoot: string): Db | null {
  const dir = nexusDir(nexusRoot)
  mkdirSync(dir, { recursive: true })
  const dbPath = join(dir, DB_FILENAME)
  if (existsSync(dbPath)) {
    const existing = openDb(dbPath).db
    // A file that failed to OPEN …
    if (!existing) { console.error(…); return null }
    if (readMeta(existing, 'schema_version') === String(SCHEMA_VERSION)) {
      // Additive DDL must reach databases that have already been opened — …
      try { applySchema(existing); /* index generation */ } catch (e) { console.error(…) }
      return existing
    }
    existing.close()
    removeDbFiles(dbPath)
  }
  const db = openDb(dbPath).db
  if (!db) return null
  applySchema(db)
  writeMeta(db, 'schema_version', String(SCHEMA_VERSION))
  writeMeta(db, 'index_generation', String(INDEX_GENERATION))
  return db
}

// Desktop/Store/ddl.ts
export const SCHEMA_VERSION = 1
export function readMeta(db: Db, key: string): string | null {
  const hasMeta = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='meta'").get()
  if (!hasMeta) return null
  …
}

// Desktop/Store/driver.ts
export const DB_SIBLINGS = ['', '-wal', '-shm'] as const

// Desktop/Store/versionsDb.ts
import { existsSync, mkdirSync, renameSync } from 'node:fs'
…
import { nexusDir } from '@pommora/core/Paths/paths'
/** A damaged store is set aside under a dated name that still ends in `.db`, so the watcher's store clause keeps covering it; nothing is deleted. */
function quarantine(dbPath: string): void { … }
export function openVersionsDb(nexusRoot: string): Db | null {
  const dir = nexusDir(nexusRoot)
  mkdirSync(dir, { recursive: true })
  const dbPath = join(dir, VERSIONS_FILENAME)
  …
}
```

`open.test.ts` and `versionsDb.test.ts` build every path as `join(root, '.nexus', …)` and assert `SCHEMA_VERSION`.

**CHANGE**

- [ ] Write the four root-stamp tests in `open.test.ts` first and watch them fail.
- [ ] Rewrite `open.ts` as below; delete `SCHEMA_VERSION` and the `sqlite_master` guard from `ddl.ts`, and `DB_SIBLINGS` from `driver.ts`.
- [ ] `versionsDb.ts`: take a directory, drop the `mkdirSync`/`nexusDir` imports and calls, and trim the `quarantine` comment's watcher clause.
- [ ] Rewrite both test files as below. `versionsDb.test.ts` drops its `syncIgnoredUnder` assertion and `watchSettle` import on purpose, because the set-aside file no longer sits in a watched tree.

**AFTER**

```ts
// Desktop/Store/open.ts
import { realpathSync } from 'node:fs'
import { join } from '@pommora/core/Paths/posix'
import { openDb, type Db } from './driver'
import { applySchema, INDEX_GENERATION, readMeta, truncateIndex, writeMeta } from './ddl'

export const DB_FILENAME = 'nexus.db'

// Root Stamp

const elsewhere = (stamped: string, root: string): boolean => {
  try {
    return realpathSync.native(stamped) !== realpathSync.native(root)
  } catch {
    return false
  }
}

// Open

export function openNexusDb(dir: string, root: string): Db | null {
  const db = openDb(join(dir, DB_FILENAME)).db
  if (!db) return null
  // Additive DDL must reach databases that have already been opened — the idempotent re-apply is how a pre-index file gains the index tables without a version bump. A throw (read-only media, a lock) costs only the new tables: the session keeps its folds and tabs, and the index queries answer null so their callers scan.
  try {
    applySchema(db)
    if (readMeta(db, 'index_generation') !== String(INDEX_GENERATION)) {
      truncateIndex(db)
      writeMeta(db, 'index_generation', String(INDEX_GENERATION))
    }
    const stamped = readMeta(db, 'root')
    if (stamped !== null && elsewhere(stamped, root)) db.exec('DELETE FROM sync')
    writeMeta(db, 'root', root)
  } catch (e) {
    console.error(
      'nexus.db: schema re-apply failed — the content index and root stamp are unavailable:',
      e,
    )
  }
  return db
}

// Desktop/Store/ddl.ts
import type { Db } from './driver'

export const INDEX_GENERATION = 3
…
export function readMeta(db: Db, key: string): string | null {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

// Desktop/Store/driver.ts
import { DatabaseSync } from 'node:sqlite'
import { basename } from 'node:path'
import { errText } from '@pommora/core/Contract/result'

export type Db = DatabaseSync

const SQLITE_CORRUPT = 11
…

// Desktop/Store/versionsDb.ts
import { existsSync, renameSync } from 'node:fs'
import { join } from '@pommora/core/Paths/posix'
import { deflateSync, inflateSync } from 'node:zlib'
import { errText } from '@pommora/core/Contract/result'
import { damagedStore, openDb, type Db } from './driver'
import { fileStamp } from '@pommora/core/Trash/bundle'
import type { CaptureReason, SnapshotRow, SnapshotSource } from '@pommora/core/Platform/stores'
…
/** A damaged store is set aside under a dated name; nothing is deleted. */
function quarantine(dbPath: string): void { … }
…
export function openVersionsDb(dir: string): Db | null {
  const dbPath = join(dir, VERSIONS_FILENAME)
  if (existsSync(dbPath)) {
    const { db: existing, errcode } = openDb(dbPath)
    if (existing && healthy(existing)) return withTable(existing)
    // Locked, mid-sync, or unreadable is left intact for the next launch, as nexus.db is; only a damaged file, or one that fails its check, is set aside.
    if (!existing && !damagedStore(errcode)) return null
    existing?.close()
    quarantine(dbPath)
    if (existsSync(dbPath)) {
      console.error(
        `versions.db: damaged and could not be set aside — file history is off: ${dbPath}`,
      )
      return null
    }
  }
  return withTable(openDb(dbPath).db)
}
```

```ts
// Desktop/Store/open.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rm, readFile, rename, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from '@pommora/core/Paths/posix'
import { tempRoot } from '@pommora/core/Testing/hostFs'
import { openNexusDb, DB_FILENAME } from './open'
import { INDEX_GENERATION, INDEX_TABLES, readMeta } from './ddl'
import { openDb, type Db } from './driver'
import { closeSessionDb, openSessionDb } from './sessionDb'
import { readScope } from '@pommora/core/Platform/localState'
import { markIndexReady, queryMentions, upsertPageIndex } from '@pommora/core/Index/contentIndex'

// Fixtures

let root: string
let dir: string
beforeEach(() => {
  root = tempRoot('pom-db-open-')
  dir = tempRoot('pom-db-store-')
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
  await rm(dir, { recursive: true, force: true })
})

const caseSensitive = !existsSync(tmpdir().toUpperCase())

const opened = (at: string = root): Db => {
  const db = openNexusDb(dir, at)
  if (!db) throw new Error('the store did not open')
  return db
}
const seed = (db: Db, key: string): void => {
  db.prepare(
    "INSERT OR REPLACE INTO local_state (scope, key, value) VALUES ('folds', ?, '[]')",
  ).run(key)
}
const seedBase = (db: Db): void => {
  db.prepare(
    "INSERT INTO sync (path, mtime_ms, size, hash, blob_sha, version) VALUES ('a.md', 1, 1, 'h', 'b', 1)",
  ).run()
}
const keys = (db: Db): string[] =>
  (db.prepare('SELECT key FROM local_state').all() as { key: string }[]).map((r) => r.key)
const count = (db: Db, table: string): number =>
  (db.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n

// Open

describe('openNexusDb', () => {
  it('creates the file, applies the schema, and stamps the index generation and root', () => {
    const db = opened()
    expect(existsSync(join(dir, DB_FILENAME))).toBe(true)
    expect(readMeta(db, 'index_generation')).toBe(String(INDEX_GENERATION))
    expect(readMeta(db, 'root')).toBe(root)
    db.close()
  })

  it('reuses an existing file, data intact', () => {
    const first = opened()
    seed(first, 'p1')
    first.close()

    const second = opened()
    expect(keys(second)).toEqual(['p1'])
    second.close()
  })

  it('a stale index generation truncates the index tables and nothing else', () => {
    const first = opened()
    for (const scope of ['aliases', 'folds', 'tabs']) {
      first
        .prepare('INSERT INTO local_state (scope, key, value) VALUES (?, ?, ?)')
        .run(scope, 'k', '{}')
    }
    first
      .prepare("INSERT INTO page_values (path, key, value) VALUES ('a.md', 'Status', '\"x\"')")
      .run()
    first.prepare("INSERT INTO mentions (path, title) VALUES ('a.md', 'x')").run()
    first
      .prepare("INSERT INTO memberships (path, key, title) VALUES ('a.md', '<Areas>', 'x')")
      .run()
    first.prepare("INSERT INTO indexed_files (path, mtime_ms, size) VALUES ('a.md', 1, 1)").run()
    first.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('index_generation', '1')").run()
    first.close()

    const second = opened()
    expect(count(second, 'local_state')).toBe(3)
    for (const table of INDEX_TABLES) expect(count(second, table)).toBe(0)
    expect(readMeta(second, 'index_generation')).toBe(String(INDEX_GENERATION))
    second.close()
  })

  it('the current index generation keeps the index across a reopen', () => {
    const first = opened()
    first
      .prepare("INSERT INTO page_values (path, key, value) VALUES ('a.md', 'Status', '\"x\"')")
      .run()
    first.close()

    const second = opened()
    expect(count(second, 'page_values')).toBe(1)
    second.close()
  })

  it('leaves a file it could not open intact', async () => {
    const dbPath = join(dir, DB_FILENAME)
    await writeFile(dbPath, 'not a database', 'utf8')
    expect(openNexusDb(dir, root)).toBeNull()
    expect(await readFile(dbPath, 'utf8')).toBe('not a database')
  })
})

// Root Stamp

describe('the root stamp', () => {
  it('keeps every row at the same root, whatever schema_version a file carries', () => {
    const first = opened()
    seed(first, 'p1')
    seedBase(first)
    first.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '0')").run()
    first.close()

    const second = opened()
    expect(keys(second)).toEqual(['p1'])
    expect(count(second, 'sync')).toBe(1)
    second.close()
  })

  it('keeps every row when the stamped root is gone, and stamps the new one', async () => {
    const first = opened()
    seed(first, 'p1')
    seedBase(first)
    first.close()
    const moved = `${root}-moved`
    await rename(root, moved)
    try {
      const second = opened(moved)
      expect(keys(second)).toEqual(['p1'])
      expect(count(second, 'sync')).toBe(1)
      expect(readMeta(second, 'root')).toBe(moved)
      second.close()
    } finally {
      await rename(moved, root)
    }
  })

  it('empties the sync bases when the stamped root is another folder that still exists', async () => {
    const first = opened()
    seed(first, 'p1')
    seedBase(first)
    first.close()
    const copy = tempRoot('pom-db-copy-')
    try {
      const second = opened(copy)
      expect(keys(second)).toEqual(['p1'])
      expect(count(second, 'sync')).toBe(0)
      expect(readMeta(second, 'root')).toBe(copy)
      second.close()
    } finally {
      await rm(copy, { recursive: true, force: true })
    }
  })

  it.skipIf(caseSensitive)('keeps the sync bases when the same folder is reached through another case', () => {
    const first = opened()
    seedBase(first)
    first.close()

    const second = opened(root.toUpperCase())
    expect(count(second, 'sync')).toBe(1)
    second.close()
  })
})

// Upgrade

const STAT = { mtimeMs: 1000, size: 10 }

describe('upgrade in place', () => {
  it('a pre-index database gains the tables on open with its rows intact', () => {
    // A database as the pre-index schema wrote it: meta + local_state alone, stamped v1.
    const v1 = openDb(join(dir, DB_FILENAME)).db
    if (!v1) throw new Error('fixture db failed to open')
    v1.exec(`
      CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE local_state (scope TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL,
        PRIMARY KEY (scope, key));
      INSERT INTO meta (key, value) VALUES ('schema_version', '1');
      INSERT INTO local_state (scope, key, value) VALUES ('folds', 'p1', '["x"]');
    `)
    v1.close()

    openSessionDb(dir, root)
    markIndexReady()
    expect(readScope('folds')).toEqual({ p1: ['x'] })
    upsertPageIndex('Notes/A.md', { mentions: ['beta'], values: {}, memberships: [] }, STAT)
    expect(queryMentions('beta')).toEqual(['Notes/A.md'])
    expect(readScope('folds')).toEqual({ p1: ['x'] })
    closeSessionDb()
  })
})
```

```ts
// Desktop/Store/versionsDb.test.ts — through the openVersionsDb describe; the snapshots describe is unchanged
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rm, mkdir, readFile, writeFile, readdir, stat, truncate } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { join } from '@pommora/core/Paths/posix'
import { tempRoot } from '@pommora/core/Testing/hostFs'
import { DatabaseSync } from 'node:sqlite'
import {
  VERSIONS_FILENAME,
  openVersionsDb,
  addSnapshot,
  latestSnapshot,
  listSnapshots,
  readSnapshot,
  deleteSnapshots,
  clearSnapshots,
  sweepSnapshots,
} from './versionsDb'
import type { Db } from './driver'

let dir: string
let dbPath: string
beforeEach(async () => {
  dir = tempRoot('pom-versions-')
  dbPath = join(dir, VERSIONS_FILENAME)
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

const opened = (): Db => {
  const db = openVersionsDb(dir)
  if (!db) throw new Error('the store did not open')
  return db
}
const corruptFiles = async (): Promise<string[]> =>
  (await readdir(dir)).filter((f) => f.includes('.corrupt-')).sort()

describe('openVersionsDb', () => {
  it('creates the file and the table', () => { … })

  it('reopens with rows intact', () => { … })

  it('quarantines a garbage header and starts fresh', async () => {
    await writeFile(dbPath, 'not a database', 'utf8')
    await writeFile(`${dbPath}-wal`, 'w', 'utf8')
    await writeFile(`${dbPath}-shm`, 's', 'utf8')
    const db = opened()
    expect(listSnapshots(db, 'P1')).toEqual([])
    db.close()
    const [original, ...others] = await corruptFiles()
    expect(others).toEqual([])
    expect(original).toMatch(/^versions\.corrupt-.*\.db$/)
    expect(await readFile(join(dir, original), 'utf8')).toBe('not a database')
    expect(existsSync(`${dbPath}-wal`)).toBe(false)
    expect(existsSync(`${dbPath}-shm`)).toBe(false)
  })

  it('quarantines a truncated store and starts fresh', async () => { … })

  it('leaves a store it cannot open where it is', async () => {
    await mkdir(dbPath, { recursive: true })
    expect(openVersionsDb(dir)).toBeNull()
    expect(existsSync(dbPath)).toBe(true)
    expect(await corruptFiles()).toEqual([])
  })

  it('quarantines interior corruption the header does not show', async () => { … })
})
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes.
- [ ] `npm run test -- Desktop/Store/open.test.ts Desktop/Store/versionsDb.test.ts` passes; the copy test fails with the `DELETE FROM sync` line removed.
- [ ] `grep -rn "SCHEMA_VERSION\|removeDbFiles\|DB_SIBLINGS" Desktop --include='*.ts'` → no hits.

#### Task 1.3

**TASK:** Thread the store directory through the host. `HostContext.openStores` takes the id, Desktop builds `<userData>/Nexuses/<id>` for a ULID id, and the open sequence opens stores before the pending-rename replay.

**FILES:** `Core/Contract/handlers.ts`, `Core/Nexus/handlers.ts`, `Core/Nexus/handlers.test.ts`, `Desktop/Store/sessionDb.ts`, `Desktop/Store/sessionDb.test.ts`, `Desktop/Store/stores.test.ts`, `Desktop/main.ts`

**DEPENDENCIES:** Tasks 1.1 and 1.2. The gates go green once this lands.

**NOW**

```ts
// Core/Contract/handlers.ts
openStores(root: string): void

// Core/Nexus/handlers.ts, openNexusSequence
await prepareOpenedNexus(root)
await replayPendingRename(root)
ctx.openStores(root)

// Desktop/Store/sessionDb.ts
/** Never throws: opening a nexus on read-only media must leave it browsable, not fail the adopt half-way through. */
export function openSessionDb(root: string): void {
  closeSessionDb()
  db = openQuietly(
    () => openNexusDb(root),
    'nexus.db: unavailable — operational state will not persist:',
  )
  versionsDb = openQuietly(
    () => openVersionsDb(root),
    'versions.db: unavailable — file history will not record:',
  )
  installStores({ … })
}

// Desktop/main.ts
import { closeSessionDb, openSessionDb } from './Store/sessionDb'
…
    openStores: openSessionDb,
```

`sessionDb.test.ts` asserts both files under `root/.nexus/`. `stores.test.ts` opens `openNexusDb(root)` and `openVersionsDb(root)`. Both `openStores` fakes in `handlers.test.ts` take `(at: string)` or nothing, so they stay assignable to the widened signature. "drains an in-flight push before the stores swap" builds its second Nexus inline.

**CHANGE**

- [ ] Hoist that second-Nexus setup into a `secondNexus` helper, use it in the swap test, and write the replay-order test on it first; it fails on the current order.
- [ ] Widen `HostContext.openStores`, reorder `openNexusSequence`, and rewrite `openSessionDb`, `main.ts`'s `openStores`, and both Desktop tests as below.

**AFTER**

```ts
// Core/Contract/handlers.ts
  openStores(root: string, nexusId: string | null): void

// Core/Nexus/handlers.ts, openNexusSequence
  const root = sessionRoot() ?? path
  const nexusId = await prepareOpenedNexus(root)
  ctx.openStores(root, nexusId)
  await replayPendingRename(root)
  if (root !== priorRoot) {
  …

// Desktop/Store/sessionDb.ts
import { mkdirSync } from 'node:fs'
import { errText } from '@pommora/core/Contract/result'
…
/** Never throws: opening a nexus on read-only media must leave it browsable, not fail the adopt half-way through. */
export function openSessionDb(dir: string | null, root: string): void {
  closeSessionDb()
  if (dir === null) return
  db = openQuietly(() => {
    mkdirSync(dir, { recursive: true })
    return openNexusDb(dir, root)
  }, 'nexus.db: unavailable — operational state will not persist:')
  versionsDb = openQuietly(
    () => openVersionsDb(dir),
    'versions.db: unavailable — file history will not record:',
  )
  installStores({
    keyValue: db && keyValueStore(db),
    contentIndex: db && contentIndexStore(db),
    snapshots: versionsDb && snapshotStore(versionsDb),
    sync: db && syncStore(db),
    captures: versionsDb && captureStore(versionsDb),
  })
}

// Desktop/main.ts
import { isUlid } from '@pommora/core/Nexus/ids'
…
    openStores: (root, nexusId) =>
      openSessionDb(
        nexusId !== null && isUlid(nexusId) ? `${userData()}/Nexuses/${nexusId}` : null,
        root,
      ),
```

```ts
// Core/Nexus/handlers.test.ts — new imports, the shared helper, and both tests that use it
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { writeJournal } from '../Contexts/contextJournal'
import { contextsDir, contextsRegistryFile } from '../Paths/paths'
…
const THIRD_PAGE = '01KVGMT8BFP350FZZXAMG1QDRY'
…
async function secondNexus(
  prefix: string,
): Promise<{ second: string; later: ReturnType<typeof memoryStores> }> {
  const second = tempRoot(prefix)
  const tag = second.slice(second.lastIndexOf('/') + 1)
  const later = memoryStores()
  await mkdir(join(second, '.nexus'), { recursive: true })
  await writeFile(
    join(second, '.nexus', 'nexus.json'),
    JSON.stringify({ id: OTHER, createdAt: '2026-09-01T12:00:00.000Z' }),
  )
  ctx.openStores = (at: string) => installStores(at.includes(tag) ? later.stores : stores.stores)
  return { second, later }
}
…
  it('drains an in-flight push before the stores swap', async () => {
    const { second, later } = await secondNexus('pom-open-swap-')

    let release!: () => void
    …
  })

  it('replays a pending context rename against the Nexus being opened', async () => {
    const { second } = await secondNexus('pom-open-replay-')
    await mkdir(contextsDir(second), { recursive: true })
    await writeFile(
      contextsRegistryFile(second),
      JSON.stringify({ contexts: [{ id: 'ctx_projects', title: 'Projects', singular: 'Project' }] }),
    )
    await mkdir(join(second, 'Notes'))
    await writeFile(
      join(second, 'Notes', 'A.md'),
      `---\nID: ${THIRD_PAGE}\n<Projects>:\n  - Pommora\n---\nbody`,
    )
    await writeJournal(second, {
      contextId: 'ctx_projects',
      oldTitle: 'Projects',
      newTitle: 'Ventures',
      skipped: [],
    })

    try {
      await openNexusSequence(ctx, root, false)
      await openNexusSequence(ctx, second, false)

      expect(await readFile(join(second, 'Notes', 'A.md'), 'utf8')).toContain('<Ventures>:')
    } finally {
      await rm(second, { recursive: true, force: true })
    }
  })
```

```ts
// Desktop/Store/sessionDb.test.ts
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { chmodSync, existsSync, readdirSync, rmSync } from 'node:fs'
import { join } from '@pommora/core/Paths/posix'
import { tempRoot, noModeBits } from '@pommora/core/Testing/hostFs'
import { keyValueStore } from '@pommora/core/Platform/stores'
import { closeSessionDb, openSessionDb, sessionDb, sessionVersionsDb } from './sessionDb'
import { VERSIONS_FILENAME } from './versionsDb'
import { DB_FILENAME } from './open'

describe('sessionDb', () => {
  let root: string
  let storage: string
  let dir: string
  beforeEach(() => {
    root = tempRoot('pom-sessdb-')
    storage = tempRoot('pom-sessdb-storage-')
    dir = join(storage, 'Nexuses', 'nx')
  })
  afterEach(() => {
    closeSessionDb()
    rmSync(root, { recursive: true, force: true })
    rmSync(storage, { recursive: true, force: true })
  })

  it('opens both stores in the store directory and closes both', () => {
    openSessionDb(dir, root)
    expect(sessionDb()).not.toBeNull()
    expect(sessionVersionsDb()).not.toBeNull()
    expect(existsSync(join(dir, DB_FILENAME))).toBe(true)
    expect(existsSync(join(dir, VERSIONS_FILENAME))).toBe(true)
    closeSessionDb()
    expect(sessionDb()).toBeNull()
    expect(sessionVersionsDb()).toBeNull()
  })

  it('opens nothing without a store directory', () => {
    openSessionDb(null, root)
    expect(sessionDb()).toBeNull()
    expect(keyValueStore()).toBeNull()
    expect(readdirSync(root)).toEqual([])
  })

  it.skipIf(noModeBits)('never throws on read-only storage, opening without persistence', () => {
    chmodSync(storage, 0o555)
    try {
      expect(() => openSessionDb(dir, root)).not.toThrow()
      expect(sessionDb()).toBeNull()
      expect(keyValueStore()).toBeNull()
    } finally {
      chmodSync(storage, 0o755)
    }
  })
})

// Desktop/Store/stores.test.ts
let root: string
let dir: string
let db: Db
let versionsDb: Db

beforeEach(async () => {
  root = tempRoot('pom-stores-')
  dir = tempRoot('pom-stores-store-')
  db = openNexusDb(dir, root)!
  versionsDb = openVersionsDb(dir)!
})
afterEach(async () => {
  installStores(NO_STORES)
  db?.close()
  versionsDb?.close()
  await rm(root, { recursive: true, force: true })
  await rm(dir, { recursive: true, force: true })
})
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes.
- [ ] Run the gates; all green.
- [ ] `grep -rln "'.nexus'" Desktop/Store` → no hits; `grep -rn "nexusDir(" Desktop/Store` → no hits.
- [ ] The replay test fails with the `openStores` and `replayPendingRename` lines swapped back.

#### Task 1.4

**TASK:** Make sync's no-base invariant explicit, so an empty base table always starts from cursor 0 (as `sync:connect` already does when it clears bases), and delete the unreachable "database unavailable" status.

**FILES:** `Core/Sync/Client/session.ts`, `Core/Sync/Client/session.test.ts`, `Core/Sync/Contract/wire.ts`

**NOW**

```ts
// Core/Sync/Client/session.ts
import { syncStore } from '../../Platform/stores'
…
import { applyPull, LONG_POLL_MS, type PullOutcome, pullOnce, pullWait } from './pull'
…
  if (readAllBases().length === 0) await working(self, () => reconcile(self))
  else
    await working(self, async () =>
      pushDirty(
        self,
        [...new Set([...(await admittedPaths(self)), ...readAllBases().map((row) => row.path)])],
        true,
      ),
    )
  void pulling(self)
…
  const binding = readValue<SyncScope>('sync')
  if (binding === null) return
  if (syncStore() === null) {
    setStatus(ctx, {
      state: 'off',
      reason: 'no-db',
      why: "This nexus's database is unavailable; sync is off for this session.",
    })
    return
  }
  await withKeys(ctx, host, root, nexusId, binding, FIRST_RETRY_MS, token)

// Core/Sync/Contract/wire.ts
  reason?: 'password' | 'pending' | 'revoked' | 'no-db' | 'server'

// Core/Sync/Client/session.test.ts
  it('reports off with the database reason when no store is installed', async () => { … })
```

Base rows can go missing while the binding's cursor stays at N (the Task 1.2 copy clear). If `reconcile` then returns early (hub log unanswered, blob missing), `pulling` resumes from N, lands later changes as bases, and the next start skips `reconcile`.

**CHANGE**

- [ ] Replace the no-db test with the cursor test below and watch it fail.
- [ ] Apply the `begin` and `startSession` edits; drop `'no-db'` from the union and the unused `syncStore` import.

**AFTER**

```ts
// Core/Sync/Client/session.ts
import { applyPull, LONG_POLL_MS, type PullOutcome, pullOnce, pullWait, setCursor } from './pull'
…
  if (readAllBases().length === 0) {
    setCursor(self, 0)
    await working(self, () => reconcile(self))
  } else {
    await working(self, async () =>
      pushDirty(
        self,
        [...new Set([...(await admittedPaths(self)), ...readAllBases().map((row) => row.path)])],
        true,
      ),
    )
  }
  void pulling(self)
…
  const binding = readValue<SyncScope>('sync')
  if (binding === null) return
  await withKeys(ctx, host, root, nexusId, binding, FIRST_RETRY_MS, token)

// Core/Sync/Contract/wire.ts
  reason?: 'password' | 'pending' | 'revoked' | 'server'

// Core/Sync/Client/session.test.ts, first test in describe('startSession')
  it('starts an empty base table from cursor zero even when the hub log goes unanswered', async () => {
    writeValue('sync', { address: ADDRESS, pin: null, cursor: 7 })
    hub.intercept = (req) => (req.url.endsWith('/pull') ? { status: 500, body: '' } : null)

    await startSession(ctx, root, NEXUS)

    expect(readValue<{ cursor: number }>('sync')?.cursor).toBe(0)
  })
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes.
- [ ] `grep -rn "'no-db'" Core --include='*.ts'` → no hits; the gates are green; the new test fails with the `setCursor(self, 0)` line removed.

#### Task 1.5

**TASK:** Move NexusOS's databases into app storage by hand, after the Phase 1 commit, with Pommora quit.

**FILES:** `~/NexusOS/.nexus/nexus.db*`, `~/NexusOS/.nexus/versions.db*`, `~/Library/Application Support/Pommora/Nexuses/01KS5VNGTE7NX7E0KHMF0TF7CT/`

**DEPENDENCIES:** Phase 1 closeout committed.

**NOW**

- `~/NexusOS/.nexus/` holds `nexus.db`, `nexus.db-wal`, `nexus.db-shm`, `versions.db`, `versions.db-wal` and `versions.db-shm`.
- NexusOS's id is `01KS5VNGTE7NX7E0KHMF0TF7CT`.

**CHANGE**

1. Quit Pommora (`osascript -e 'quit app "Electron"'`) and stop the dev process. `pgrep -fl Electron` shows nothing left.
2. Run `sqlite3 <file> "PRAGMA wal_checkpoint(TRUNCATE);"` on each database, then `sqlite3 <file> "PRAGMA integrity_check;"` → `ok`.
3. Record the counts:
   - `sqlite3 ~/NexusOS/.nexus/nexus.db "SELECT (SELECT COUNT(*) FROM local_state), (SELECT COUNT(*) FROM sync);"`
   - `sqlite3 ~/NexusOS/.nexus/versions.db "SELECT COUNT(*) FROM snapshots;"`
4. `mkdir -p` the target directory. If it already holds databases (a launch on the new build before this step), delete them with their `-wal`/`-shm`. Copy both `.db` files in.
5. Re-run the step 3 counts against the copies. Only when they match, delete the six originals from `~/NexusOS/.nexus/`.
6. Relaunch with `env -u ELECTRON_RUN_AS_NODE POMMORA_DEBUG_PORT=9333 npm run dev`.

**AFTER**

- `ls ~/NexusOS/.nexus/*.db*` → no matches.
- The target directory holds `nexus.db` and `versions.db`.
- After launch, `sqlite3 <target>/nexus.db "SELECT value FROM meta WHERE key='root'"` → `/Users/nathantaichman/NexusOS`.

**VERIFY**

- [x] Step 5 counts match step 3.
- [x] The root stamp reads NexusOS's path after launch.

#### Review Checkpoint

- [x] User confirms: NexusOS reopened with its tabs and heading folds as they were.
- [x] User confirms: Settings > Nexus shows the hub connection, and Sync Now runs.
- [x] User confirms: a page's File History still lists its earlier versions.
- [x] `ls ~/NexusOS/.nexus` shows no `.db` file after a few minutes of use.

### Phase 2 — Local Data Channels

**GOAL:** Two read-only channels list `nexus.db`'s tables with row counts and page through one table's rows. It's its own phase because the Phase 3 window is built on the shape it fixes.

#### Task 2.1

**TASK:** Desktop reads `nexus.db` generically: every table with its row count, and one 200-row page of a table's rows with binary and 64-bit cells made displayable.

**FILES:** `Core/Interface/localData.ts` (new), `Desktop/Store/localData.ts` (new), `Desktop/Store/localData.test.ts` (new)

**NOW**

Nothing reads `nexus.db` generically. `sessionDb()` in `Desktop/Store/sessionDb.ts` returns the open handle and has no production caller. A plain `SELECT *` over an integer above 2^53 throws in `node:sqlite`, and BLOBs come back as `Uint8Array`.

**CHANGE**

- [ ] Write `localData.test.ts` first against a stub that returns `[]` and `null`, and watch it fail.
- [ ] Write both source files as below.

**AFTER**

```ts
// Core/Interface/localData.ts

// Shapes

export type LocalCell = string | number | null | { bytes: number }

export interface LocalTable {
  name: string
  rows: number
}

export interface LocalRows {
  columns: string[]
  rows: LocalCell[][]
}
```

```ts
// Desktop/Store/localData.ts
import type { LocalCell, LocalRows, LocalTable } from '@pommora/core/Interface/localData'
import type { Db } from './driver'

const PAGE = 200

// Tables

const tableNames = (db: Db): string[] =>
  (
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as { name: string }[]
  ).map((row) => row.name)

export function localTables(db: Db | null): LocalTable[] {
  if (!db) return []
  return tableNames(db).map((name) => ({
    name,
    rows: (db.prepare(`SELECT COUNT(*) AS n FROM "${name}"`).get() as { n: number }).n,
  }))
}

// Rows

const cellOf = (value: unknown): LocalCell => {
  if (typeof value === 'bigint') {
    const n = Number(value)
    return Number.isSafeInteger(n) ? n : value.toString()
  }
  if (value instanceof Uint8Array) return { bytes: value.byteLength }
  return value as LocalCell
}

export function localRows(db: Db | null, table: string, offset: number): LocalRows | null {
  if (!db || !tableNames(db).includes(table)) return null
  const page = db.prepare(`SELECT * FROM "${table}" ORDER BY rowid LIMIT ? OFFSET ?`)
  page.setReadBigInts(true)
  page.setReturnArrays(true)
  const columns = page.columns().map((column) => column.name)
  const rows = (page.all(PAGE, offset) as unknown as unknown[][]).map((row) => row.map(cellOf))
  return { columns, rows }
}
```

```ts
// Desktop/Store/localData.test.ts
import { rm } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { tempRoot } from '@pommora/core/Testing/hostFs'
import type { Db } from './driver'
import { localRows, localTables } from './localData'
import { openNexusDb } from './open'

// Fixtures

let dir: string
let db: Db

beforeEach(() => {
  dir = tempRoot('pom-local-')
  const opened = openNexusDb(dir, dir)
  if (!opened) throw new Error('the store did not open')
  db = opened
})
afterEach(async () => {
  db.close()
  await rm(dir, { recursive: true, force: true })
})

const seedFolds = (count: number): void => {
  const insert = db.prepare(
    "INSERT INTO local_state (scope, key, value) VALUES ('folds', ?, '[]')",
  )
  for (let i = 0; i < count; i++) insert.run(`k${String(i).padStart(3, '0')}`)
}

// Tables

describe('localTables', () => {
  it('lists every schema table by name with its row count', () => {
    seedFolds(3)
    const tables = localTables(db)
    expect(tables.map((table) => table.name)).toEqual([
      'indexed_files',
      'local_state',
      'memberships',
      'mentions',
      'meta',
      'page_values',
      'sync',
    ])
    expect(tables.find((table) => table.name === 'local_state')?.rows).toBe(3)
  })

  it('answers nothing without a database', () => {
    expect(localTables(null)).toEqual([])
  })
})

// Rows

describe('localRows', () => {
  it('pages rows in rowid order with columns in schema order', () => {
    seedFolds(250)
    const first = localRows(db, 'local_state', 0)
    expect(first?.columns).toEqual(['scope', 'key', 'value'])
    expect(first?.rows).toHaveLength(200)
    expect(first?.rows[0]).toEqual(['folds', 'k000', '[]'])
    expect(localRows(db, 'local_state', 200)?.rows).toHaveLength(50)
  })

  it('reports a blob by its size and an integer beyond the safe range as text', () => {
    db.prepare(
      "INSERT INTO sync (path, mtime_ms, size, hash, blob_sha, version, base_bytes) VALUES ('a.json', 1, 2, 'h', 'b', ?, ?)",
    ).run(9007199254740993n, new Uint8Array(5))
    expect(localRows(db, 'sync', 0)?.rows).toEqual([
      ['a.json', 1, 2, 'h', 'b', '9007199254740993', { bytes: 5 }],
    ])
  })

  it('refuses a table the database does not hold', () => {
    expect(localRows(db, 'nope', 0)).toBeNull()
    expect(localRows(db, 'sync" --', 0)).toBeNull()
    expect(localRows(null, 'sync', 0)).toBeNull()
  })
})
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes.
- [ ] `npm run test -- Desktop/Store/localData.test.ts` passes, and each test failed against the stub.

#### Task 2.2

**TASK:** Expose the reader through the host and the bridge as `localData:tables` and `localData:rows`.

**FILES:** `Core/Contract/handlers.ts`, `Core/Contract/bridge.ts`, `Core/Interface/handlers.ts`, `Desktop/main.ts`

**DEPENDENCIES:** Task 2.1.

**NOW**

```ts
// Core/Contract/handlers.ts, HostContext
  transport(req: TransportRequest): Promise<TransportReply>
  openStores(root: string, nexusId: string | null): void

// Core/Contract/bridge.ts, Asks
  'devicePrefs:load': { args: []; reply: Result<DevicePrefs | null> }
  'devicePrefs:save': { args: [prefs: DevicePrefs]; reply: Result<null> }
  'sync:state': { args: []; reply: Result<SyncState> }

// Core/Interface/handlers.ts
import type { Handlers } from '../Contract/handlers'
…
  'devicePrefs:save': async (ctx, prefs: unknown) => { … },

  'folds:get': scopeGet<string[]>('folds'),

// Desktop/main.ts
import { closeSessionDb, openSessionDb } from './Store/sessionDb'
…
    openStores: (root, nexusId) => …,
    adopted(root, path) { … },
```

**CHANGE**

- [ ] Apply the edits below.

**AFTER**

```ts
// Core/Contract/handlers.ts
import type { LocalRows, LocalTable } from '../Interface/localData'
…
  transport(req: TransportRequest): Promise<TransportReply>
  openStores(root: string, nexusId: string | null): void
  localData: {
    tables(): LocalTable[]
    rows(table: string, offset: number): LocalRows | null
  }

// Core/Contract/bridge.ts
import type { LocalRows, LocalTable } from '../Interface/localData'
…
  'devicePrefs:load': { args: []; reply: Result<DevicePrefs | null> }
  'devicePrefs:save': { args: [prefs: DevicePrefs]; reply: Result<null> }
  'localData:tables': { args: []; reply: Result<LocalTable[]> }
  'localData:rows': { args: [table: string, offset: number]; reply: Result<LocalRows> }
  'sync:state': { args: []; reply: Result<SyncState> }

// Core/Interface/handlers.ts
import { type Handlers, withRoot } from '../Contract/handlers'
…
  'devicePrefs:save': async (ctx, prefs: unknown) => { … },

  'localData:tables': withRoot((_root, ctx) => ok(ctx.localData.tables())),
  'localData:rows': withRoot((_root, ctx, table: unknown, offset: unknown) => {
    if (
      typeof table !== 'string' ||
      typeof offset !== 'number' ||
      !Number.isInteger(offset) ||
      offset < 0
    )
      return fail('operation-failed', 'A table name and a non-negative row offset are required.')
    const rows = ctx.localData.rows(table, offset)
    return rows ? ok(rows) : fail('operation-failed', 'That table doesn’t exist.')
  }),

  'folds:get': scopeGet<string[]>('folds'),

// Desktop/main.ts
import { closeSessionDb, openSessionDb, sessionDb } from './Store/sessionDb'
import { localRows, localTables } from './Store/localData'
…
    openStores: (root, nexusId) => …,
    localData: {
      tables: () => localTables(sessionDb()),
      rows: (table, offset) => localRows(sessionDb(), table, offset),
    },
    adopted(root, path) { … },
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes.
- [ ] Run the gates; `Core/Contract/engineGraph.test.ts` is green with its externals unchanged.

### Phase 3 — View Local Data Window

**GOAL:** The window, its Settings entry, and the Sync hint removal. It's its own phase because it's the surface Nathan redirects.

#### Task 3.1

**TASK:** Add the session flag that opens and closes the window, beside `iterationOpen`.

**FILES:** `Core/Session/layoutSlice.ts`

**NOW**

```ts
  iterationOpen: boolean
  closeIteration: () => void
  toggleIteration: () => void
  hostPlatform: HostPlatform
…
    iterationOpen: false,
    closeIteration: () => set({ iterationOpen: false }),
    toggleIteration: () => set((s) => ({ iterationOpen: !s.iterationOpen })),

    hostPlatform: 'posix',
```

**CHANGE**

- [ ] Apply the edit below.

**AFTER**

```ts
  iterationOpen: boolean
  closeIteration: () => void
  toggleIteration: () => void
  localDataOpen: boolean
  openLocalData: () => void
  closeLocalData: () => void
  hostPlatform: HostPlatform
…
    iterationOpen: false,
    closeIteration: () => set({ iterationOpen: false }),
    toggleIteration: () => set((s) => ({ iterationOpen: !s.iterationOpen })),

    localDataOpen: false,
    openLocalData: () => set({ localDataOpen: true }),
    closeLocalData: () => set({ localDataOpen: false }),

    hostPlatform: 'posix',
```

**VERIFY**

- [ ] `npm run typecheck` green.

#### Task 3.2

**TASK:** Build `DatabaseWindow`: a left rail listing `nexus.db`'s tables with row counts, and a virtualized read-only grid of the selected table in the app's table styling.

**FILES:** `Core/Interface/Windows/DatabaseWindow.tsx` (new), `Core/Interface/Windows/database-window.css` (new), `Core/Interface/App.tsx`, `Core/package.json`, `package-lock.json`

**DEPENDENCIES:** Tasks 2.2 and 3.1.

**NOW**

- `SettingsWindow.tsx` passes `left={{ windowId, bounds: SETTINGS_RAIL, mode: 'inflow', … }}` holding a `Menu` of `<MenuItem selected … onClick>{label}</MenuItem>`. `MenuItem` takes its title as `children` and a secondary line as `subLabel`.
- `UIX/Windows/window-base.css`:
  - `.window-body` is `flex: 1; min-height: 0; padding-top: var(--window-toolbar-h); overflow-y: auto; scrollbar-width: none`;
  - `.window-pane-scroll` is `flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: none`.
- `UIX/Table/table.css` and `table-tokens.css` (global): `.table` scopes the tokens; `.table-head` and `.data-row` lay a grid on `var(--cols)`; `.col-header` and `.data-cell` pad, truncate and divide. `.table-head` full-bleeds with `margin`/`padding` on `--content-inset` and `--table-right-inset`, which `trash-frame.css` zeroes for its own surface.
- `UIX/Pickers/IconPicker.tsx` virtualizes with `useVirtualizer` from `@tanstack/react-virtual`. `UIX/package.json` declares `"@tanstack/react-virtual": "^3.14.2"`; `Core/package.json` doesn't.

```tsx
// Core/Interface/App.tsx
import { SettingsWindow } from '../Settings/SettingsWindow'
import { IterationWindow } from './Windows/IterationWindow'
…
        {status === 'ready' && <SettingsWindow />}
        {status === 'ready' && <IterationWindow />}
```

**CHANGE**

- [ ] Add the dependency to `Core/package.json` between `@lezer/highlight` and `@vanilla-extract/css`, and run `npm install` so the lockfile records it.
- [ ] Write both new files and the `App.tsx` mount as below.

**AFTER**

```json
// Core/package.json, dependencies
    "@lezer/highlight": "^1.2.3",
    "@tanstack/react-virtual": "^3.14.2",
    "@vanilla-extract/css": "^1.20.1",
```

```tsx
// Core/Interface/Windows/DatabaseWindow.tsx
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useRef, useState } from 'react'
import { useExitPresence } from '@pommora/uix/Animations/useExitPresence'
import { Menu, MenuItem } from '@pommora/uix/Menus'
import { text } from '@pommora/uix/Theme'
import { cx } from '@pommora/uix/Utilities/cx'
import { WindowBase } from '@pommora/uix/Windows/window-base'
import { SETTINGS_RAIL } from '@pommora/uix/Windows/windowBounds'
import type { LocalCell, LocalTable } from '../localData'
import { host } from '../../Platform/dialer'
import { useSession } from '../../Session/store'
import { useWindowGeometry } from './useWindowGeometry'
import './database-window.css'

// Constants

const ROW_HEIGHT = 30
const COLUMN_MIN = 120
const KB = 1024
const MB = KB * KB

// Cells

const sizeOf = (bytes: number): string =>
  bytes < KB
    ? `${bytes} B`
    : bytes < MB
      ? `${(bytes / KB).toFixed(1)} KB`
      : `${(bytes / MB).toFixed(1)} MB`

const shown = (cell: LocalCell): string =>
  cell === null ? '' : typeof cell === 'object' ? `BLOB · ${sizeOf(cell.bytes)}` : String(cell)

// Window

export function DatabaseWindow(): React.JSX.Element | null {
  const open = useSession((s) => s.localDataOpen)
  const { mounted, closing } = useExitPresence(open)
  if (!mounted) return null
  return <DatabaseBody closing={closing} />
}

function DatabaseBody({ closing }: { closing: boolean }): React.JSX.Element {
  const closeLocalData = useSession((s) => s.closeLocalData)
  const geometry = useWindowGeometry('local-data')
  const [tables, setTables] = useState<LocalTable[]>([])
  const [current, setCurrent] = useState<LocalTable | null>(null)

  useEffect(() => {
    void host()
      .ask('localData:tables')
      .then((reply) => {
        if (!reply.ok) return void host().ask('error:show', reply.error.message)
        setTables(reply.value)
        setCurrent(reply.value[0] ?? null)
      })
  }, [])

  return (
    <WindowBase
      {...geometry}
      closing={closing}
      onClose={closeLocalData}
      onEscape={closeLocalData}
      ariaLabel="Local Data"
      title="Local Data"
      left={{
        windowId: 'local-data-rail',
        bounds: SETTINGS_RAIL,
        mode: 'inflow',
        open: true,
        children: (
          <Menu className="window-pane-scroll">
            {tables.map((entry) => (
              <MenuItem
                key={entry.name}
                selected={entry === current}
                subLabel={`${entry.rows.toLocaleString()} rows`}
                onClick={() => setCurrent(entry)}
              >
                {entry.name}
              </MenuItem>
            ))}
          </Menu>
        ),
      }}
    >
      {current && <TableRows key={current.name} table={current} />}
    </WindowBase>
  )
}

// Grid

function TableRows({ table }: { table: LocalTable }): React.JSX.Element {
  const scroller = useRef<HTMLDivElement>(null)
  const asked = useRef(-1)
  const [columns, setColumns] = useState<string[]>([])
  const [rows, setRows] = useState<LocalCell[][]>([])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  })
  const items = virtualizer.getVirtualItems()
  const last = items[items.length - 1]?.index ?? -1

  useEffect(() => {
    const offset = rows.length
    const due = offset === 0 || (offset < table.rows && last >= offset - 50)
    if (!due || asked.current >= offset) return
    asked.current = offset
    void host()
      .ask('localData:rows', table.name, offset)
      .then((reply) => {
        if (!reply.ok) return void host().ask('error:show', reply.error.message)
        if (offset === 0) setColumns(reply.value.columns)
        setRows((held) => [...held, ...reply.value.rows])
      })
  }, [last, rows.length, table.rows, table.name])

  const grid = {
    '--cols': `repeat(${columns.length}, minmax(${COLUMN_MIN}px, 1fr))`,
    minWidth: columns.length * COLUMN_MIN,
  } as React.CSSProperties

  return (
    <div ref={scroller} className="window-body database-body">
      <div className={cx('table database-table', text.body.standard)} style={grid}>
        <div className="table-head database-head">
          {columns.map((column) => (
            <span key={column} className="col-header">
              {column}
            </span>
          ))}
        </div>
        <div className="database-rows" style={{ height: virtualizer.getTotalSize() }}>
          {items.map((item) => (
            <div
              key={item.key}
              className="data-row database-row"
              style={{ height: ROW_HEIGHT, transform: `translateY(${item.start}px)` }}
            >
              {rows[item.index].map((cell, i) => (
                <span key={columns[i]} className="data-cell">
                  {shown(cell)}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

```css
/* Core/Interface/Windows/database-window.css */

/* Body */

.database-body {
  overflow: auto;
}

/* Head */

.table-head.database-head {
  position: sticky;
  top: 0;
  z-index: 1;
  margin: 0;
  padding: 0;
}

/* Rows */

.database-rows {
  position: relative;
}
.database-row {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}
```

```tsx
// Core/Interface/App.tsx
import { SettingsWindow } from '../Settings/SettingsWindow'
import { IterationWindow } from './Windows/IterationWindow'
import { DatabaseWindow } from './Windows/DatabaseWindow'
…
        {status === 'ready' && <SettingsWindow />}
        {status === 'ready' && <DatabaseWindow />}
        {status === 'ready' && <IterationWindow />}
```

**VERIFY**

- [ ] Check the work for unnecessary code, styling an existing class or token already covers, and obvious mistakes.
- [ ] Run the gates; all green.
- [ ] `grep -rn "useVirtualizer" Core` → only `DatabaseWindow.tsx`.

#### Task 3.3

**TASK:** Add the View Local Data row to Settings > Nexus and remove the Sync row's hint.

**FILES:** `Core/Settings/NexusRows.tsx`, `Core/Settings/NexusRows.test.tsx`

**DEPENDENCIES:** Task 3.1.

**NOW**

```tsx
// Core/Settings/NexusRows.tsx
import type { SyncBinding, SyncState, SyncStatus } from '@pommora/core/Sync/Contract/wire'
import type { TimeFormat } from '@pommora/core/Properties/columnStyles'
import { DEFAULT_TIME_FORMAT } from '@pommora/core/Settings/personalization'
import { clockOf } from '../Properties/formatValue'
…
const syncCaption = (status: SyncStatus, clock: TimeFormat): string => { … }
…
  const inFlight = useRef(false)
  const clock = useSession((s) => s.personalization.timeFormat ?? DEFAULT_TIME_FORMAT)
  const [syncLabel, markSynced] = useTimedLabel('Sync Now', 'Synced')
…
      <SettingsFieldRow label="Sync" hint={syncCaption(state.status, clock)}>
…
      {devices.map((device) => { … })}
    </>

// Core/Settings/NexusRows.test.tsx
  it('captions each of the four sync states', async () => { … })
```

**CHANGE**

- [ ] Replace the caption test with the open test below and watch it fail.
- [ ] Apply the `NexusRows.tsx` edits below.

**AFTER**

```tsx
// Core/Settings/NexusRows.tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@pommora/uix/Buttons/Button'
import { InputField } from '@pommora/uix/Fields/InputField'
import { placeholder } from '@pommora/uix/Fields/fields.css'
import { MenuRowView } from '@pommora/uix/Menus'
import type { Result } from '@pommora/core/Contract/result'
import type { SyncBinding, SyncState } from '@pommora/core/Sync/Contract/wire'
import { SettingsFieldRow } from './SettingsFieldRow'
import { useTimedLabel } from './ClearActionRow'
import { useSession } from '../Session/store'
import * as x from './exclusion-rows.css'
import { host } from '../Platform/dialer'
…
  const inFlight = useRef(false)
  const openLocalData = useSession((s) => s.openLocalData)
  const [syncLabel, markSynced] = useTimedLabel('Sync Now', 'Synced')
…
      <SettingsFieldRow label="Sync">
        <Button
          type="filled"
          label={syncLabel}
          …
        />
      </SettingsFieldRow>
      {devices.map((device) => { … })}
      <SettingsFieldRow label="View Local Data">
        <Button label="Open" onClick={openLocalData} />
      </SettingsFieldRow>
    </>

// Core/Settings/NexusRows.test.tsx
  it('opens the Local Data window from its row', async () => {
    useSession.setState({ localDataOpen: false })
    await render({ 'sync:state': reply(unbound) })
    await act(async () => button('Open')?.click())
    expect(useSession.getState().localDataOpen).toBe(true)
  })
```

**VERIFY**

- [ ] Check the work for unnecessary code or obvious mistakes.
- [ ] `grep -rn "syncCaption" Core` → no hits; the gates are green.

#### Review Checkpoint

- [ ] User confirms: Settings > Nexus shows View Local Data, and Open brings up the window over Settings.
- [ ] User confirms: the rail lists `nexus.db`'s tables, each with its row count, and the first is selected.
- [ ] User confirms: the grid uses the app's table styling with a header that stays put, and scrolling `mentions` or `page_values` to the bottom loads every row without stalling.
- [ ] User confirms: `sync` shows `base_bytes` as a BLOB size, and `local_state` values read as text.
- [ ] User confirms: the Sync row has no sub-label.

### Completion Criteria

**Conformance**

- [ ] No new store interface: `git diff <baseline>..HEAD -- Core/Platform/stores.ts Core/Testing/memoryStores.ts Core/Testing/storesContract.ts` → empty.
- [ ] Nothing changed outside what the plan named: `git diff --name-only <baseline>..HEAD` matches the tasks' FILES plus the Reconciliation documents.
- [ ] New files carry section comments only: `grep -n "//\|/\*" Core/Interface/localData.ts Desktop/Store/localData.ts Core/Interface/Windows/DatabaseWindow.tsx Core/Interface/Windows/database-window.css` → section headers only.

**Correctness**

- [ ] Both databases for an opened Nexus sit at `<userData>/Nexuses/<nexusId>/`, and the Nexus folder gains no `.db`.
- [ ] A Nexus opened from any folder other than its stamped root, moved or copied, keeps `local_state` and empties `sync` (`open.test.ts`).
- [ ] An empty base table starts sync from cursor 0 (`session.test.ts`).
- [ ] A `null` store directory opens nothing (`sessionDb.test.ts`); a non-ULID id never reaches a path (`main.ts`).
- [ ] A pending rename replays against its own Nexus (`handlers.test.ts`).
- [ ] The Local Data window lists tables with counts and pages every row of the largest table (Nathan's check).

**Completeness**

- [ ] Every task ticked; no scaffolding, debug output or unauthorized TODO in `<baseline>..HEAD`.

**Confirmation**

- [ ] Every verification result read; every new test goes red with its change reverted.
- [ ] User: the Phase 1 and Phase 3 Review Checkpoint items, in Nathan's own words.

**Continuity**

- [ ] Reconciliation complete; `ContextPM.md` and `FrameworkPM.md` read true; Deviations each fixed or ruled on.

**Confidence**

- [ ] Gates green from clean on `<baseline>..HEAD`; Baseline counts moved as planned.
- [ ] Diff size roughly Phase 1 +40/−60, Phase 2 +80, Phase 3 +190/−25, comments and tests excluded. A larger diff is reported.

### Final Verification

**THE STANDARD:** The work is finished when a later review of it finds nothing to correct. Not just doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. Nothing is carried as a concern, nothing is deferred where the fix is known, and nothing is declared that wasn't watched happen. Where something genuinely couldn't get there, the report names which and why, and everything else is still finished. Ambiguity met during execution took the simplest reading and was recorded; it didn't stop the run. Edits found in adjacent files that no task made belong to the user — folded into the commit at hand, not reverted.

- [ ] Phase review dispatched: Phase 1 · Phase 2 · Phase 3
- [ ] All findings fixed or ruled on
- [ ] Neutral verification passed on `<baseline commit>..HEAD`
- [ ] Final pass: gates · baseline · diff · deviations · criteria
- [ ] Reconciliation walked; living documents read
- [ ] Report delivered

#### Reconciliation

Each entry is rewritten by its phase's closeout, in that phase's commit.

**Phase 1**

- `.claude/Features/CorePM.md`:
  - the tree placing both databases under `.nexus`;
  - "`nexus.db` lives inside the Nexus, so a moved or renamed folder keeps it";
  - a version mismatch deletes the file;
  - `versions.db` "travels with a moved Nexus";
  - "Stays on this machine, inside the Nexus".
- `.claude/Features/DesktopPM.md` — "`sessionDb.ts` opens `nexus.db` beside the Nexus… Both sit inside the Nexus and travel with a moved one"
- `.claude/Features/NexusSyncPM.md` — "`nexus.db` and `versions.db` are excluded by content"; the rule stays, but the databases are no longer in the folder it covers.
- `.claude/Features/ConfigurationPM.md` — "the machine-and-Nexus preferences in the Nexus's own database"; "A second class of machine-local state lives in the Nexus's own database"
- `.claude/Planning/Cross-Device Mutation Checklist.md`:
  - the `nexus.db` row's "excluded by name… and discardable on a schema bump";
  - the `versions.db` row;
  - the Two Instances copy recipe.
- `.claude/Planning/Sync-Scaffolding-V2 — Decision Log.md`:
  - B-3 "the `nexus.db` and `versions.db` already inside it";
  - G-5 "a later session rebuilds the base".
- `.claude/PommoraPRD.md` — "App-internal config and the device-local database live under a hidden `.nexus/` folder that travels with the Nexus"
- `.claude/Guidelines/Development-Environment.md` — "copying the Nexus folder then deleting its six database files"
- `.claude/ContextPM.md` — the Open Calls "Database" item
- Any other placement claim closeout's sweep of `.claude` finds. `HistoryPM.md` is excepted, and `Codebase Audit — Report.md`, `TilesV2-Spec.md` and the Sync-Scaffolding-V2 plan are left alone where they describe their own time.

**Phase 3**

- `.claude/Features/ConfigurationPM.md`:
  - the Nexus paragraph's "a Sync row whose hint reports what sync is doing";
  - "The Sync row's hint follows the client's own four states…", keeping its clause about the `sync:changed` push refetching the binding;
  - add the View Local Data row.
- `.claude/Features/InterfacePM.md` — "Five windows mount it"; add a `#### The Local Data Window` subsection

#### Report & Closure

Written per the skill's report shape once the chain above is confirmed.

### Deviations

- **D-1 — The Root Stamp Clears Sync on Any Other Folder:** Task 1.2 kept `sync` when the stamped root no longer existed. The Phase 1 review found that a synced copy, opened and then trashed or ejected, reads as a move: the original reopened with the copy's bases, and its first push sent the copy's missing pages as deletes and its stale files as writes. Ruled by Nathan: `elsewhere` treats an unresolvable stamp as another folder, so a move or rename also empties `sync` and runs one full reconcile, while `local_state` and the binding stay. `open.test.ts`'s moved-root test expects no `sync` rows.
- **D-2 — The Plan Closes After Phase 1:** Ruled by Nathan during Phase 2: the viewer is left for later, so Phases 2 and 3 didn't run, and the Phase 2 work in progress was discarded, since its channels have no consumer without the window. When the window is built, its component is `DatabaseWindow` in `DatabaseWindow.tsx`, and it doesn't get a stylesheet of its own. ContextPM's Next-Feature Candidates carries it.

