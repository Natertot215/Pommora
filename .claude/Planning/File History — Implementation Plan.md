## File History — Implementation Plan

> **Status:** ratified 09-02-2026 · executing · Spec: [[File History — Decision Log]] · Execute tasks in order.
> Citations name files and symbols at HEAD `bfa68847`, re-derived after the parallel session's confirm work landed at `605db15e` and `c3ca16ed` (`Windows/ConfirmationWindow.tsx`, `Windows/confirmations.ts`, `askConfirm` on `chromeSlice`).

**Goal**

A page accumulates snapshots while it is edited: the text on disk before an edit lands, the settled text after a burst goes quiet, one more each interval inside a long burst, and the text a foreign writer left whenever Pommora is about to overwrite it. Every page reachable by right-click carries **View History**, the page's Settings menu carries **History**, and both open one floating window on the Page Window's chassis listing the page's snapshots beside a read-only render of the checked one. **Restore** replaces the body alone, capturing the current text first; a trash glyph on a checked row deletes. Settings › Files & Links gains **File History**: an On/Off toggle, a timeframe (7–90 days, default 90), an interval (5–20 minutes, default 5), and a destructive Clear History for the device. Snapshots older than the timeframe are pruned at open. A page deleted to `.trash` keeps its history for its return.

The shape: one device-local SQLite file, `.nexus/versions.db`, behind the existing driver seam, holding whole-file text compressed with Node's `zlib`, keyed by page `ID` and timestamp; one capture function in main holding the whole rule and one body-write path both the autosave and restore take; a store module rather than a provider interface, so a later git provider is a second module. Rejected: files per snapshot (storage), a table in `nexus.db` (disposable by design), git first (a phone can't run it; NexusOS is the user's own repository). Settled by Nathan on 09-02-2026 in the decision log.

Bounded by: recovery is body-only by construction; pages only, filtered by the ULID kind mark; Homepage and Space blocks and tiles never reach the hook; system rewriters never capture; snapshots are frozen text; `nexus.db` untouched; no new dependency. Not this plan's: the in-app two-host lost update (recorded, mechanism seeded).

**Requirements**

1. `.nexus/versions.db` through `openDb`, an integrity check that quarantines a damaged file by renaming it and its `-wal`/`-shm` siblings, one table `snapshots(page_id, ts, source, blob)`, `CREATE TABLE IF NOT EXISTS` on open, no version row; add, latest, list, read, delete, clear, sweep. The watcher ignores it through one `.nexus`-scoped `.db*` clause in `ignoredUnder`.
2. `writePageFile` returns the text it overwrote and the text it wrote; a read failure other than a missing file refuses the write.
3. `captureIfDue(root, pageId, text, source)` holds the whole rule — toggle, interval gate on `Map<pageId, lastTs>`, foreign-overwrite exception on `Map<path, bodyHash>`, dedupe by body against the latest snapshot, 1 MB cap, config through `readLivePersonalization`, best-effort after the write's `Result`. `writeBody(root, abs, body, source)` is the one body-write path. Per-page quiet timers armed by the writer and the watcher, resolved through `livePathOf(root, id)` at fire time; maps and timers clear where the store closes; switch and root rename offer every armed page ungated first. The three `Personalization` keys land with the rule, clamped on read.
4. Retention is one age-bounded `DELETE` at open and when `historyDays` shrinks.
5. Channels `history:list`, `history:read`, `history:restore`, `history:delete`, `history:clear`, `history:menu`; push `open-history`. Restore is `writeBody(…, 'restore')` answering the page's resolved path; read, restore, and delete validate against the page id and resolve the page by id.
6. A **File History** section on Files & Links: toggle, two numeric typeable pickers on the `zoom` row kind with a unit, a destructive Clear History flipping to **Cleared** for 1500 ms; `ClearExclusionsRow` → `ClearActionRow`. Confirms ride the in-app `ask()` seam; copy comes from Nathan at execution.
7. **View History** as `opts.history` in the shared page menu, above Reveal Location with its own separator, riding the send block so every consumer offers it, routed once in `runPageSendAction`; **History** beside Properties in the page Settings menu.
8. `PageHistoryWindow` on `WindowBase`: the page's location trail as title, no band, the close × alone; a read-only `MarkdownEditor` of the checked snapshot (Current Version when none) with a two-deep ancestors chain; the list in an overlay right slot — Current Version first behind a divider, then Untitled Snapshot rows with a leading checkbox and a date · hairline · time caption; a click highlights, a check selects; a trash glyph trails a checked snapshot row and deletes every checked row; Restore at the foot-right, inactive for Current Version, dimmed for a multi-check; both actions confirmed; right-click pops the same two; the list refetches after every action.
9. Restore's renderer half: flush the page's pending save at its live path, call main, then one `replaceBody(path, body)` — drop every warm detail for the path (`dropCacheDetail`), refetch, patch the navigation slot, bump the path's epoch — which the watcher-driven reload will call later; the three warm seams share one fence comparing the cached doc against a fresh body handed in, keeping the entry when none is known.
10. Every falsified document rewritten in the falsifying commit; `FileHistoryPM.md` written; the two Known Issues in Context.

**Acceptance — the whole thing working:** Scratch Nexus, File History on at 5 minutes. Open a page, type a paragraph, wait past the interval, type a second, edit the file from an outside editor while the page stays open, type a third. Right-click the sidebar row › View History: Current Version first and at least three snapshots — the pre-edit text, the settled first paragraph, the outside editor's text — each rendering read-only when checked, embeds inert. Check the outside one, Restore, confirm: the open editor shows it, the file holds it with frontmatter untouched, one more snapshot holds the three-paragraph text. Check two rows, trash glyph, confirm: both gone from the list and the store. Settings › Files & Links › File History › Clear History: Cleared, and the window lists Current Version alone. Delete the page to `.trash`, restore it: history back. No `full-refresh` walk per capture in the main log.

**Forced By**

- `serializeOnFile` is non-reentrant and the capture must not delay the write → `updatePageBody` reads the outgoing text inside its lock and returns it; the caller offers it after the `Result` settles (Tasks 2, 4).
- The `zoom` row already clamps a typed number into its steps through `PickerControl.typeable` → the two numeric settings ride it with a unit (Tasks 4, 7).
- `PreviewTarget` is renderer-only; the wire carries `ContextTarget` → `open-history` pushes a `ContextTarget`, `App.tsx` adapts (Tasks 6, 9).

**Inherited Reasoning:** The log's Considered & Rejected, and three build-breaking rounds: a plain interval gate loses an external edit inside the interval (the foreign-overwrite exception); a key bump re-seeds nothing (the epoch seed); a dropped warm cache is refilled by the outgoing editor's cleanup (refresh and fence); no version row, no encoding column, no whole-page Clear in the window.

**Grounding** *(re-open these; don't cite them)*

- `src/main/CRUD/page.ts:46-78` · `IO/pageFile.ts:25-33,176-191` · `IO/atomicWrite.ts` · `IO/fileLock.ts` · `Database/driver.ts:8-22` · `Database/open.ts:17,31-74` · `Database/schema.ts:41-61` · `Database/localState.ts:1-30` · `sessionDb.ts` · `index.ts:333-431,1097-1113,1553-1569,1571-1578,1883-1902,1994-2007` · `contextMenu.ts:106-165` · `rowMenu.ts:81` · `valuesChanged.ts:27-43` · `liveTree.ts:19-51` · `settings.ts:54-84` · `readNexus.ts:136-148` · `watcher.ts:54-81` · `watchPatch.ts:130-143,242-247` · `exclusion.ts:8-15` · `mutate.ts:125-135` · `ipc.ts:70-77`.
- `src/shared/bridge.ts:90-97,237-246,266-274,357-374` · `types.ts:90-180,225-232,524-530` · `pageMenu.ts` · `pageMenu.test.ts:1-40` · `tabMenu.ts` · `navRowMenu.ts` · `cellMenu.ts:128-138` · `cardMenu.ts:32-45` · `cropGeometry.ts:13` · `nexusPaths.ts:6-26` · `src/preload/index.ts:31-38,116-127,170-188`.
- `src/renderer/Store/tabState.ts` · `SurfacePM/tileCache.ts` · `Interface/PageView.tsx:51,100-185` · `Windows/useWindowWarm.ts` · `Windows/windowCache.ts` · `SurfacePM/PageTile.tsx:40-148` · `Windows/PageWindow.tsx` · `Windows/window-base.tsx:20-75,185-201` · `Interface/pageFlush.ts` · `Store/navigationSlice.ts:234-241,355-357,599,627` · `Store/previewSlice.ts:23-59,151-172,232-236,304-307` · `Store/configSlice.ts:34-50` · `App.tsx:113-138,284-291` · `Frames/PageMenu.tsx` · `Actions/pageMenuActions.ts` · `Settings/SettingsWindow.tsx:52-165,335-415,669-689,744-787` · `Settings/ClearExclusionsRow.tsx` · `Settings/TrashFrame.tsx:60-95,178-195,261-341` · `DesignSystem/Elements/PickerControl/PickerControl.tsx:1-60` · `DesignSystem/Menus/menu-row.tsx:52-101` · `DesignSystem/Buttons/Button.tsx:9-52` · `DesignSystem/Controls/Checkbox.tsx:6-31` · `DesignSystem/Elements/Segment/segment.css.ts` · `Properties/Assignment/formatValue.ts:47,57-102` · `Links/ConnectionPane.tsx:34,288,419-429` · `shared/connMenu.ts:9,93,164` · `Links/connectionMenu.ts:63` · `MarkdownPM/index.tsx:76-137,227-232,459` · `MarkdownPM/Editor/embedWidget.tsx:259,478` · `treeIndex.ts:200,240-262`.
- `.claude/Guidelines/Development-Environment.md`.

**Environment:** Plan directory `.claude/Planning`. Spec: [[File History — Decision Log]]. Explorer: `Explore`. Code reviewer: `feature-dev:code-reviewer`. Attack reviewer: `build-breaking-agent`. Simplification: `code-simplifier`, dual-briefed to report non-simplicity bugs. Comments: `comment-killer-agent`, "no sub-agents, no worktree." Neutral verifier: general-purpose. Rules: `.claude/Guidelines/`. Gates from `Pommora/`: `npm run typecheck && npm run test && npm run lint`, exit codes read directly; lint's warnings line must read zero.

**Shapes:** additive · fix (`writePageFile`; sibling sweep is its two callers) · refactor (`ClearActionRow`, the `zoom` unit) · additive on the warm seams (`useWindowWarm` gains a fence; `PageView` flushes its live-body timer) · user-visible · live data (the Declared Stop drives Nathan's Nexus over CDP on a throwaway page only; Nathan watches live, no screenshots).

**Declared Stops**

- **Gate 4** — the History window and the File History section on screen; Nathan compares against his mock before phase 5.

**Global Constraints (every task inherits these):**

- Gates from `Pommora/`: `npm run typecheck && npm run test && npm run lint`, exit codes read directly, never piped; lint warnings zero in the text.
- Biome formats through the hook; a shell-driven edit runs `npm run format`. Never hand-align.
- Comments only where the why can't be inferred; never restate a value; none in tests. `KNOB` markers survive.
- Stage explicit paths; check `git status` for foreign staged paths before every commit; commit as soon as a gate is green; no whole-tree git operations; one tree-touching writer at a time.
- `src/main` and `src/preload` don't HMR — restart the dev instance for a new channel.
- Before adding a save, debounce, flush, timer, writer, or store mechanism, search Grounding's existing one and reuse or extend it (Nathan, 09-02-2026).
- Dialog copy and confirmation wording come from Nathan at execution; write none ahead of him.
- Every phase gate runs simplification before review, on that phase's range.
- Out of scope everywhere: `nexus.db` and its schema; `blocks.ts` and every block or tile body; Tasks and Events; the watcher-driven editor reload; git; a diff view; per-snapshot titles beyond the row label.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| ArchitecturePM | "**Versioning, file history, backup** — Time Machine, `git` on the Nexus, filesystem snapshots." | File History exists | 11 |
| ArchitecturePM §Nexus Layout | `.nexus` lists `nexus.db` alone | `versions.db` | 11 |
| ArchitecturePM §Persistence | no history row in the device-local table | snapshots | 11 |
| NexusRecordPM §Pending | "Git as opt-in content history — … Pommora never auto-commits." | File History is the content history | 11 |
| ConfigurationPM §Files & Links | no File History section | four rows | 11 |
| InterfacePM §Floating Windows | "Four windows mount it" | five | 11 |
| InterfacePM page-menu table | Locate reads "Reveal Location" alone | View History above it | 11 |
| PagesPM | nothing on history | one pointer sentence | 11 |
| ContextPM §Known Issues | two entries | the two-host lost update; `versions.db` tracked by the repository | 11 |
| `shared/types.ts:93-95` | "a new toggle is a field here plus an apply-map row" | plus a `readPersonalization` row | 4 |

**Dead Vocabulary**

- `ClearExclusionsRow` → 0 · `clear-exclusions` → 0 · `percentChoice` → 0 · `PAGE_CLIPBOARD_ACTIONS` → 0 · `PageClipboardAction` → 0. Legitimate hits: none.
- Control: `ClearActionRow` → ≥ 3 · `PAGE_REACH_ACTIONS` → ≥ 2.

---

### Phase 1 — The store and the writer

#### Task 1: `versions.db` behind the driver seam

**Requirement:** 1

**Why:** Every later task reads and writes snapshots through one module whose health is decided at open.

**Now** — `rg -F "nexus.db: cannot open" src/main/Database/driver.ts` → 1:

```ts
// src/main/Database/driver.ts:8-22
export function openDb(path: string): Db | null
// src/main/sessionDb.ts:9-35
let db: Db | null = null
export function sessionDb(): Db | null
export function openSessionDb(root: string): void
export function closeSessionDb(): void
// src/main/Database/schema.ts:41-43
export function applySchema(db: Db): void
```

**Becomes**

```ts
// src/main/Database/driver.ts — the failure log names basename(path)
export function openDb(path: string): Db | null
```

```ts
// src/main/Database/versionsDb.ts (new) + versionsDb.test.ts
export const VERSIONS_FILENAME = 'versions.db'
export function openVersionsDb(nexusRoot: string): Db | null
// null handle or failed `PRAGMA quick_check` (try/catch) → rename .db, -wal, -shm to
// `versions.db.corrupt-<stamp>`, open fresh; never delete
// DDL: snapshots(page_id TEXT, ts INTEGER, source TEXT, blob BLOB, PRIMARY KEY(page_id, ts))
export function addSnapshot(db: Db, pageId: string, ts: number, source: SnapshotSource, text: string): void   // deflateSync; INSERT OR REPLACE
export function latestSnapshot(db: Db, pageId: string): { ts: number; text: string } | null
export function listSnapshots(db: Db, pageId: string): SnapshotRow[]   // newest first
export function readSnapshot(db: Db, pageId: string, ts: number): string | null
export function deleteSnapshots(db: Db, pageId: string, ts: readonly number[]): number
export function clearSnapshots(db: Db): number
export function sweepSnapshots(db: Db, cutoffMs: number): number
```

```ts
// src/main/sessionDb.ts — opened and closed beside nexus.db, each best-effort
export function sessionVersionsDb(): Db | null
```

`SnapshotSource` and `SnapshotRow` are declared in `src/shared/types.ts` here (Task 4 extends that file).

**Assumed by:** Tasks 4, 6.

**Verify — automated**

- [x] Red first, `versionsDb.test.ts`: round-trip through zlib; delete returns its count and leaves other pages; sweep removes only older rows; same-`ts` add replaces; garbage header → fresh handle, the original bytes under `versions.corrupt-<stamp>.db`, every set-aside file unwatched; interior corruption → same. Then green. (SQLite removes a `-wal`/`-shm` pair itself when the failed handle closes, so the triple is not observable; surviving siblings are renamed.)
- [x] `sessionDb.test.ts`: `openSessionDb` creates `versions.db`; `closeSessionDb` closes both.
- [x] Full gate green. `rg -F "nexus.db: cannot open" src/main` → 0; control `rg -F "openDb(" src/main` → 4.

**Verify — user**

- [ ] *(none.)*


#### Task 2: `writePageFile` returns the overwritten text and refuses on a failed read

**Requirement:** 2

**Why:** Capture needs the text a save overwrites, and a page whose file can't be read must never be rewritten without its frontmatter.

**Now** — `rg -F "writePageFile(" src/main --glob '!*.test.ts'` → 3 (definition, `createPage`, `updatePageBody`):

```ts
// src/main/IO/pageFile.ts:178-191 — any read error is treated as a new file
export async function writePageFile(absPath: string, modeled: Record<string, unknown>, modeledKeys: readonly string[], body: string): Promise<void>
// src/main/CRUD/page.ts:70-78
export async function updatePageBody(absFile: string, body: string): Promise<Result<null>>
```

**Becomes**

```ts
// src/main/IO/pageFile.ts — only ENOENT starts from empty frontmatter; any other read error throws
export interface PageWrite { previous: string | null; written: string }
export async function writePageFile(absPath: string, modeled: Record<string, unknown>, modeledKeys: readonly string[], body: string): Promise<PageWrite>
// src/main/CRUD/page.ts — a thrown read inside the lock → fail('operation-failed'); file untouched
export async function updatePageBody(absFile: string, body: string): Promise<Result<PageWrite>>
```

`createPage` ignores the return.

**Assumed by:** Task 4.

**Verify — automated**

- [x] Red first, `pageFile.test.ts`: returns the prior text and the written text; `previous` null on a missing file; EISDIR throws with no file written. Then green.
- [x] `page.test.ts`: `updatePageBody` answers `ok({ previous, written })`; on a read failure answers `fail` and the bytes are unchanged.
- [x] Existing tests green unmodified. Full gate green.

**Verify — user**

- [ ] *(none.)*


#### Task 3: The watcher ignores `.nexus/*.db*`

**Requirement:** 1

**Why:** An unexcluded `.nexus` entry classifies `full-refresh`; every capture would cost a walk.

**Now** — `rg -F "segs[0] === NEXUS_DIR" src/main/watcher.ts` → 3 (`:48` in another predicate; `ignoredUnder`'s two scoped clauses at `:71-77`). `neverWatched` (`exclusion.ts:8-15`) is shared with `adoptFile` and stays untouched.

**Becomes**

```ts
// src/main/watcher.ts — one more clause in ignoredUnder
const DB_FILE = /\.db(-wal|-shm)?$/
      (segs[0] === NEXUS_DIR && segs.length === 2 && DB_FILE.test(segs[1])) ||
```

**Verify — automated**

- [x] Red first, `watcher.test.ts`: ignores `.nexus/versions.db`, `-wal`, `-shm`; still watches `.nexus/settings.json`; does not ignore `Notes/report.db`. Then green.
- [x] `mutate.test.ts` `adoptFile` cases green unmodified. Full gate green.

**Verify — user**

- [ ] *(none.)*


#### Gate 1

- [x] Gates green, exit codes read directly. Every Verify ticked against a watched result. Now counts re-run.
- [x] Simplification, then review, against `<base>..HEAD` scoped to `src/main/Database`, `src/main/sessionDb.ts`, `src/main/IO/pageFile.ts`, `src/main/CRUD/page.ts`, `src/main/watcher.ts`; every concern fixed or ruled (simplifier: one opener, one counter, six flags folded or ruled; reviewer: the two silent null returns now log).
- [x] Progress hashes filled. Phase 2 opens.

---

### Phase 2 — Capture

#### Task 4: `captureIfDue`, `writeBody`, the quiet timers, the three keys

**Requirement:** 3, 4

**Why:** One rule for when a snapshot happens, one path for writing a body, and the keys the rule reads.

**Now** — `—` (new module). Read: `liveIdIndex(root)` (`valuesChanged.ts:29`) · `readLivePersonalization` (`settings.ts:63-65`; async, falls back to disk before a tree is installed — at `openSessionDb` time the live tree is null or the prior root's) · `splitEnvelope` · the kind mark (`identity.ts`) · `hoverPreviewLinger` as the numeric-key trail (`types.ts:151`, `readNexus.ts:143`) · `clamp` (`cropGeometry.ts:13`).

**Becomes**

```ts
// src/shared/types.ts
export type SnapshotSource = 'edit' | 'external' | 'restore'
export interface SnapshotRow { ts: number; source: SnapshotSource }
export const HISTORY_DAYS = { min: 7, max: 90, default: 90 } as const
export const HISTORY_INTERVAL = { min: 5, max: 20, default: 5 } as const
// Personalization:
  fileHistory?: boolean       // absent = on
  historyDays?: number        // 7–90, absent = 90
  historyInterval?: number    // minutes 5–20, absent = 5
export function clampInt(v: unknown, min: number, max: number): number | undefined
```

```ts
// src/main/readNexus.ts — readPersonalization
    fileHistory: p.fileHistory === false ? false : undefined,
    historyDays: clampInt(p.historyDays, HISTORY_DAYS.min, HISTORY_DAYS.max),
    historyInterval: clampInt(p.historyInterval, HISTORY_INTERVAL.min, HISTORY_INTERVAL.max),
```

```ts
// src/main/valuesChanged.ts — memoized per tree; null when absent or claimed by two paths
export function livePathOf(root: string, id: string): string | null
```

```ts
// src/main/CRUD/fileHistory.ts (new) + fileHistory.test.ts
export const SNAPSHOT_MAX_BYTES = 1_048_576
export async function captureIfDue(root: string, pageId: string, text: string, source: SnapshotSource): Promise<boolean>
// gate: source === 'restore' || lastTs absent || now - lastTs ≥ interval   (config: await readLivePersonalization(root))
// then: enabled · kind 'P' · size ≤ cap · body hash ≠ latest's body hash → addSnapshot; never throws
export async function writeBody(root: string, absPath: string, body: string, source: 'edit' | 'restore'): Promise<Result<null>>
// updatePageBody → indexWrittenPage → noteValueWrite → pushValueChanges → offer `previous`
// (ungated when hash(splitEnvelope(previous).body) ≠ lastWritten[absPath], or source 'restore')
// → lastWritten ← hash(splitEnvelope(written).body) → arm the quiet timer at the interval
export function noteExternalEdit(root: string, absPath: string): void   // arms the timer, source 'external'
export async function flushFileHistory(root: string): Promise<void>     // offer every armed page ungated
export function resetFileHistory(): void                                 // maps + timers
export async function sweepFileHistory(root: string): Promise<void>
// state: lastTs Map<pageId, number> · lastWritten Map<absPath, hash> · timers Map<pageId, {source, timer}>
// a timer fires: livePathOf → null disarms → read file → captureIfDue
```

**Assumed by:** Tasks 5, 6, 7.

**Verify — automated**

- [x] Red first, `fileHistory.test.ts` on a scratch root with a real store and a seeded tree: first offer captures; a body opening with a blank line or holding CRLF is not foreign on its second save; inside the interval doesn't; after it does; identical body never; over the cap never; a `T`-marked id never; a foreign outgoing body captures ungated; `writeBody(…, 'restore')` captures ungated then writes; the quiet timer fires once and resets on a new write (fake timers); `flushFileHistory` captures at once and `resetFileHistory` leaves no timer; a missing id disarms; a twice-claimed id disarms; `fileHistory: false` captures nothing; the sweep removes only older rows. Then green.
- [x] `readNexus.test.ts`: `historyDays: 200` → 90; `historyInterval: "5"` → absent; `fileHistory: 'no'` → absent.
- [x] Both halves of the gate: the refused case adds a row with source `'restore'`.
- [x] Full gate green.

**Verify — user**

- [ ] *(none.)*


#### Task 5: The callers

**Requirement:** 3, 4

**Why:** Capture happens where the app already knows a body changed.

**Now** — `rg -F "updatePageBody(" src/main/index.ts` → 1 (`:1105`) · `rg -F "case 'page-upsert'" src/main/watchPatch.ts` → 1 (`:246`) · `rg -F "await rename(root, newRoot)" src/main/index.ts` → 1 (`:1898`, before `adoptNexus(newRoot, false)`) · `openNexusSequence` (`index.ts:366-382`) · `'personalization:set'` (`:1553-1569`) · `app.on('before-quit'` (`:1994-2007`).

**Becomes**

```ts
// 'page:updateBody' — the handler's tail becomes one line
        return writeBody(root, resolved.value, body, 'edit')
// watchPatch.ts 'page-upsert', after indexWrittenPage
      noteExternalEdit(root, join(root, c.rel))
// openNexusSequence: before openSession(path) when priorRoot !== null → await flushFileHistory(priorRoot); resetFileHistory()
//                    after openSessionDb(root) when root !== priorRoot → sweepFileHistory(root)
// root rename: before `await rename(root, newRoot)` → await flushFileHistory(root); resetFileHistory()
// 'before-quit' (index.ts:1994-2007 — two branches today: a synchronous close, and a preventDefault + latch + flushNavigation + closeSessionDb + re-quit when a nav write is in flight):
//   one deferred branch for every quit — preventDefault, latch, await both flushes, closeSessionDb(), re-quit; the latch's early return lets the re-quit through.
//   flushFileHistory never rejects, as flushNavigation never does — a rejection would leave ⌘Q dead on the first press
// sweepFileHistory awaits readLivePersonalization, which reads the new root's settings.json from disk at that point
// 'personalization:set': key === 'historyDays' → sweepFileHistory(root)
```

**Verify — automated**

- [x] `watchPatch.test.ts`: a `page-upsert` arms a timer with source `external`. Red, then green.
- [x] A switch test: arm a page, switch roots; the old store holds the row, the new holds none.
- [x] The quit path: with a page armed and a nav write in flight, `before-quit` lands both flushes, closes both stores, and quits on one press; a rejected history flush still quits. (`index.ts` is not loadable under Vitest; driven on the restarted dev instance at Gate 2.)
- [x] Full gate green. `rg -F "writeBody(" src/main` → 2 now, 3 after Task 6; control `rg -F "noteValueWrite(" src/main` → ≥ 5.

**Verify — user**

- [ ] *(none.)*


#### Gate 2

- [x] Gates green. Every Verify ticked. Now counts re-run.
- [x] Simplification, then review, against `<base>..HEAD` scoped to `src/main/CRUD/fileHistory.ts`, `src/main/valuesChanged.ts`, `src/main/readNexus.ts`, `src/shared/types.ts`, `src/main/index.ts`, `src/main/watchPatch.ts`; every concern fixed or ruled.
- [x] A restarted dev instance on the live NexusOS (Nathan's ruling), a throwaway page driven over CDP: the pre-edit text landed as `edit`, a second save inside the interval was held, an outside edit landed as `external`, zero `nexus:changed` pushes across the saves, ⌘Q exited in 500 ms on one press and left a third row (the flush); the page, its trash bundle, and its rows were removed afterward.
- [x] Progress hashes filled. Phase 3 opens.

---

### Phase 3 — The contract and the settings

#### Task 6: The history channels, the push, the row menu

**Requirement:** 5

**Why:** The renderer reaches snapshots only through the bridge; restore and delete validate by id.

**Now** — `rg -F "'trash:list'" src/shared/bridge.ts src/preload/index.ts src/main/index.ts` → 3 (the template triple) · `'open-in-preview'` (`bridge.ts:371`, `preload:177`, `contextMenu.ts:100`) · `popModelMenu` (`rowMenu.ts:81`).

**Becomes**

```ts
// src/shared/fileHistoryMenu.ts (new)
export type FileHistoryMenuAction = 'restore' | 'delete'
export function fileHistoryMenuItems(batch: boolean): ActionItem<FileHistoryMenuAction>[]
// batch → Delete All · else Restore, separator, Delete
```

```ts
// src/shared/bridge.ts — Asks
  'history:list': { args: [pageId: string]; reply: Result<SnapshotRow[]> }
  'history:read': { args: [pageId: string, ts: number]; reply: Result<string> }            // the body
  'history:restore': { args: [pageId: string, ts: number]; reply: Result<{ path: string }> }
  'history:delete': { args: [pageId: string, ts: number[]]; reply: Result<number> }
  'history:clear': { args: []; reply: Result<number> }
  'history:menu': { args: [ctx: { batch: boolean }]; reply: FileHistoryMenuAction | null }
// Pushes
  'open-history': ContextTarget
```

```ts
// src/preload/index.ts
  listHistory · readSnapshot · restoreSnapshot · deleteSnapshots · clearHistory · historyMenu · onOpenHistory
// src/main/index.ts — handlers, each over sessionVersionsDb() ?? fail('operation-failed', …)
'history:list'    ok(listSnapshots(db, pageId))
'history:read'    splitEnvelope(readSnapshot(db, pageId, ts)).body · null → not-found
'history:restore' rel = livePathOf(root, pageId) → not-found · body as above · writeBody(root, abs, body, 'restore') → ok({ path: rel })
'history:delete'  ok(deleteSnapshots(db, pageId, ts))
'history:clear'   ok(clearSnapshots(db))
'history:menu'    popModelMenu(win, fileHistoryMenuItems(ctx.batch))
```

Confirms are the renderer's, on the parallel session's `ask()` seam (Tasks 7, 9); this task adds no dialog.

**Assumed by:** Tasks 7, 8, 9, 10.

**Verify — automated**

- [x] A scratch-root test of the channel bodies (`readHistoryBody`, `restoreSnapshot` in `fileHistory.test.ts`): `history:read` with another page's `ts` → `not-found`; `history:restore` on a renamed page answers the new path. Red, then green.
- [x] Full gate green. `rg -F "'open-history'" src` → 2 now, 3 after Task 8; control `rg -F "'open-in-preview'" src` → 3.

**Verify — user**

- [ ] *(none.)*


#### Task 7: The File History settings section

**Requirement:** 6

**Why:** The three knobs and the device-wide clear, on the roster every setting rides.

**Now** — `rg -F "kind: 'zoom'" src/renderer/Settings/SettingsWindow.tsx` → 5 (`:116` the row type; rows `:231,239,257,455`; `ZoomRow` `:750-776` bakes `percentChoice`, `'%'`, and `/100`) · `rg -F "ClearExclusionsRow" src/renderer` → 3 (the import, the `'clear-exclusions'` case at `:693`, the definition) · `rg -F "percentChoice" src` → 4 (`SettingsWindow.tsx:19,757`, `PickerControl/index.ts:5`, `PickerControl.tsx:18` — the definition leaves with its one consumer) · `ClearExclusionsRow.tsx` counts first through `countExclusions`, asks through `askClearExclusions(n)` with the count in the copy, and reads a null reply as an already-empty list that earns no Cleared · `confirmations.ts:17` keeps `ask` private behind named `ask*` wrappers.

**Becomes**

```tsx
// src/renderer/Settings/SettingsWindow.tsx
type NumberUnit = { scale: number; suffix: string; label: (shown: number) => string }
const PERCENT: NumberUnit · const DAYS: NumberUnit · const MINUTES: NumberUnit
  | (RowText & { kind: 'zoom'; key: KeyOf<number>; fallback: number; steps?: readonly number[]; unit?: NumberUnit })   // absent = PERCENT
  | (RowText & { kind: 'clear'; clear: () => Promise<boolean> })   // asks, acts, answers whether a clear ran
// Files & Links, section 'File History' after Deletion:
//   toggle fileHistory (defaultOn) · zoom historyDays steps [7,14,30,60,90] unit DAYS · zoom historyInterval steps [5,10,15,20] unit MINUTES
//   · clear { clear: clearHistory }  — askClearHistory() in confirmations.ts with Nathan's copy → window.nexus.clearHistory()
// the Exclusions clear row becomes the same kind; its count-first ask and null-reply reading move into its `clear`
```

```tsx
// src/renderer/Settings/ClearActionRow.tsx (renamed from ClearExclusionsRow.tsx)
export function ClearActionRow({ row }: { row: RowOf<'clear'> }): React.JSX.Element   // await row.clear() → true flips 'Cleared' 1500 ms
```

Labels, hints, and confirm copy: Nathan's, at execution.

**Verify — automated**

- [x] The exclusions clear had no test of its own; its count-first ask and null-reply reading moved verbatim into `clearExclusions`, and `ClearActionRow` flips Cleared only on a true reply.
- [x] Full gate green. `rg -F "ClearExclusionsRow" src` → 0 · `rg -F "clear-exclusions" src` → 0 · `rg -F "percentChoice" src` → 0; control `rg -F "ClearActionRow" src` → 3.

**Verify — user**

- [ ] *(carried to Gate 4.)*


#### Gate 3

- [x] Gates green. Every Verify ticked. Now counts re-run.
- [x] Simplification, then review, against `<base>..HEAD` scoped to `src/shared`, `src/preload`, `src/main/index.ts`, `src/main/readNexus.ts`, `src/renderer/Settings`; every concern fixed or ruled (simplifier: five edits folded, five flags fixed, three ruled; reviewer: clean).
- [x] Progress hashes filled. Phase 4 opens.

---

### Phase 4 — The surface

#### Task 9: `PageHistoryWindow`

**Requirement:** 8

**Why:** The one place snapshots are seen and acted on.

**Now** — `rg -F "<PageWindow />" src/renderer/App.tsx` → 1 (`:286`) · `rg -F "windowId: 'preview-inspector'" src/renderer` → 2 (`PageWindow.tsx:187`, `NavWindow.tsx:188` — the overlay right slot; `page-history-list` collides with neither) · `PER_NEXUS` (`previewSlice.ts:54-59`) · `TrashRowView` (`TrashFrame.tsx:290-341`, checkbox overlay + trailing caption + context menu) · `HOVER_ANCESTORS` (`ConnectionPane.tsx:34`) · `clockOf` private at `formatValue.ts:47`.

**Becomes**

```ts
// src/renderer/Store/previewSlice.ts — historyTarget in PER_NEXUS as null
  historyTarget: PreviewTarget | null
  openHistory: (target: PreviewTarget) => void
  closeHistory: () => void
// src/renderer/App.tsx
  window.nexus.onOpenHistory((t) => { if (t.id) openHistory({ id: t.id, path: t.path }) })
  {status === 'ready' && <PageHistoryWindow />}
// src/renderer/Properties/Assignment/formatValue.ts
export function clockOf(date: Date, timeFormat: TimeFormat): string
```

```ts
// src/renderer/Windows/pageHistoryModel.ts (new) + pageHistoryModel.test.ts
export function historyRowModel(rows: SnapshotRow[], checked: ReadonlySet<number>, lastChecked: number | null): {
  shown: number | null                     // null = Current Version; on uncheck, the most recently checked survivor, else null
  restoreEnabled: boolean                  // exactly one checked snapshot
  glyphOn: (ts: number) => boolean         // checked snapshot rows only
}
```

```tsx
// src/renderer/Windows/PageHistoryWindow.tsx (new) + page-history-window.css (new)
export function PageHistoryWindow(): React.JSX.Element | null
// useExitPresence over historyTarget · WindowBase id="page-history", title=<NavTrail segments={ancestryOf(tree, {kind:'page', id})} selected/>,
//   no onScan/actions/footer · right={{ windowId: 'page-history-list', bounds: WINDOW_BASE_INSPECTOR, mode: 'overlay', open: true }}
// state: rows · checked: Set<ts> · lastChecked · highlighted; refresh() on open and after every action
// body: <MarkdownEditor key={`${path}:${shown ?? 'current'}`} initialBody readOnly onChange={() => {}} connections={resolveOnly} embedAncestors={['page-history', path]} />
//   resolveOnly as ConnectionPane.tsx:288 builds it — without connections, embeds render as raw text
//   shown === null → the page's current body via fetchPageDetail
// rows: MenuItem — overlay Checkbox · label 'Current Version' | 'Untitled Snapshot' · subLabel date · segment hairline · clockOf
//   · trailing trash Button when glyphOn(ts) → deleteChecked · selected={highlighted === ts} · onClick highlights · onContextMenu → historyMenu({ batch })
//   Current Version first, MenuSeparator after it
// foot: Restore Button, disabled={!restoreEnabled} → ask(<Nathan's copy>) → restoreSnapshot(target, shown) [Task 10] → refresh()
// deleteChecked: ask(<Nathan's copy>) → deleteSnapshots(id, [...checked]) → refresh()
```

**Assumed by:** Tasks 8, 10.

**Verify — automated**

- [x] Red first, `pageHistoryModel.test.ts`: Current Version never carries the glyph; a checked snapshot does; Restore enabled only for exactly one checked snapshot; `shown` follows the last check, falls back to the surviving check on uncheck, and returns to Current Version when nothing is checked. Then green.
- [x] Full gate green. `rg -F 'id="page-history"' src/renderer` → 1; control `rg -F 'id="page-preview"' src/renderer` → 1.

**Verify — user**

- [ ] *(the Declared Stop.)*


#### Task 8: View History in every page menu, History in the page Settings menu

**Requirement:** 7

**Why:** The window is reachable from wherever a page is, through the shared model and the shared router.

**Now** — `rg -F "PAGE_CLIPBOARD_ACTIONS" src` → 5 (`pageMenu.ts:68,79,85`, `connMenu.ts:7,164`) · `rg -F "PageClipboardAction" src` → 5 (`pageMenu.ts:66,71,75`, `connMenu.ts:9,93` inside `ConnMenuAction` — the `[[link]]` menu, routed by `Links/connectionMenu.ts:63` with explicit cases and no default) · `rg -F "runPageSendAction(" src/renderer` → 5 · `rg -F "reveal: true" src` → 4 (`contextMenu.ts:144`, `pageMenu.ts:147`, two in `pageMenu.test.ts`) · `pageMenu.test.ts:15-26` asserts the full-menu order · `Frames/PageMenu.tsx:58-65` one Properties `MenuItem`.

**Becomes**

```ts
// src/shared/pageMenu.ts
export type PageMetaAction = … | 'title:history' | …                      // before 'title:reveal'
export type PageReachAction = Extract<PageMetaAction, 'title:copylink' | 'title:copypath' | 'title:history'>
export const PAGE_REACH_ACTIONS = ['title:copylink', 'title:copypath', 'title:history'] as const
export type PageSendAction = PageReachAction | typeof PAGE_MOVE_ROW       // PageClipboardAction / PAGE_CLIPBOARD_ACTIONS renamed away
// connMenu.ts keeps a literal ['title:copylink', 'title:copypath'] and its ConnMenuAction member becomes
// Extract<PageReachAction, 'title:copylink' | 'title:copypath'> — the link menu does not offer View History (Ruling)
// opts.history?: boolean → { label: 'View History', action: 'title:history', separatorBefore: true } above Reveal;
// Reveal's separatorBefore: !opts.history && !opts.clipboard && !opts.move; pageMetaMenuSubset passes history: true
// contextMenu.ts, cellMenu.ts:132, cardMenu.ts:34 pass history: true; contextMenu's switch: case 'title:history' → push(win, 'open-history', target)
```

```ts
// src/renderer/Actions/pageMenuActions.ts — runPageSendAction gains
  if (action === 'title:history') { const page = pagesOf(tree).find((p) => p.path === path); if (page) openHistory({ id: page.id, path }); return true }
// src/renderer/Frames/PageMenu.tsx — a second MenuItem beside Properties → openHistory({ id: pageDetail.id, path: pageDetail.path }); FOOTER_ACTIONS unchanged
```

**Verify — automated**

- [x] Red first, `pageMenu.test.ts`: the full order gains `'title:history'` before `'title:reveal'`; History's `separatorBefore` true; Reveal's false when History precedes; `pageSendActions({})` returns the three reach actions. Then green.
- [x] `connMenu.test.ts`: the link menu carries no `'title:history'`.
- [x] The cell and card model tests carry `'title:history'`; the tab and nav-row menus draw from `pageSendActions`, which `pageMenu.test.ts` now asserts carries it (neither has a model test of its own).
- [x] Full gate green. `rg -F "PAGE_CLIPBOARD_ACTIONS" src` → 0 · `rg -F "PageClipboardAction" src` → 0; control `rg -F "PAGE_REACH_ACTIONS" src` → 3.

**Verify — user**

- [ ] *(the Declared Stop.)*


#### Task 10: Restore's renderer half, the shared warm fence, the re-seed

**Requirement:** 9

**Why:** A restore has to reach every editor holding the page, or its next keystroke writes the old body back.

**Now** — `rg -F "readCache(" src/renderer --glob '!*.test.*'` → 4 (`PageView.tsx:169`, `navigationSlice.ts:599` — a select with no ready slot seeds `slot.body` from the warm `pageDetail`, outside every seam — `InterfaceScaffold.tsx:26`, `tabState.ts:40`) · `rg -F "tileWarmSeam(" src/renderer` → 2 · `rg -F "readWindowCache(" src/renderer` → 3:

```ts
// tileCache.ts:13-27 — restore() compares the cached doc with readPageDetail(path)?.body; skips when fresh is undefined
// PageView.tsx:51,103-104 — liveTimer debounces setPageBody 120 ms, no cleanup; :118 key={pageDetail.path}; :168-175 path-only fence
// useWindowWarm.ts:20-29 — no fence; activePath is a hook argument
// PageTile.tsx:61-66 — useState initializer seeds from the warm doc or readPageDetail; the inner editor has no key
// tabState.ts:64-78 fetchPageDetail caches on landing · :92 dropCacheDetail clears every tab's warm pageDetail for a path (setIcon/setBanner's helper) · navigationSlice.ts:357 setPageBody · :627 pruneSlots evicts a navigated-away slot · pageFlush.ts:23 flushPageSave
```

**Becomes**

```ts
// src/renderer/Store/tabState.ts
export function fenceWarm(entry: WarmEntry | undefined, fresh: string | undefined): WarmEntry | undefined   // fresh undefined, or an entry with no editorState (scroll only) → entry stands
export function bumpBodyEpoch(path: string): void
export function useBodyEpoch(path: string): number   // useSyncExternalStore
// tabState imports nothing from the store — a slice imports tabState, and the cycle is the guideline's forbidden edge
// tileCache.restore → fenceWarm(entry, readPageDetail(path)?.body)
// PageView.restore  → fenceWarm(path-fenced entry, slot.body)
// useWindowWarm.restore → fenceWarm(readWindowCache(id), readPageDetail(activePath)?.body); activePath joins the memo deps
```

```ts
// src/renderer/Store/navigationSlice.ts — beside setPageBody
  /** A body replaced from outside the editor — restore today, the watcher later. */
  replaceBody: (path: string) => Promise<void>
// dropCacheDetail(path) → fetchPageDetail(path) → setPageBody(path, detail.body) → bumpBodyEpoch(path)
```

```ts
// src/renderer/Interface/restoreSnapshot.ts (new)
export async function restoreSnapshot(target: PreviewTarget, ts: number): Promise<Result<null>>
// live = pagesByIdOf(tree).get(target.id)?.path ?? target.path → flushPageSave(live)
// → window.nexus.restoreSnapshot(id, ts) → useSession.getState().replaceBody(r.value.path)
```

```tsx
// PageView.tsx — epoch read above the early returns; liveTimer gains a pending-args ref so unmount can land setPageBody
  <MarkdownEditor key={`${pageDetail.path}:${bodyEpoch}`} …
// PageTile.tsx — seed and key move in one render; the fetch effect and EmbedBanner.onChanged write the same seed
  const epoch = useBodyEpoch(path)
  const [seed, setSeed] = useState(() => ({ epoch, entry: initialEntry(path, warm) }))
  if (seed.epoch !== epoch) { const d = readPageDetail(path); setSeed({ epoch, entry: d ? entryFrom(path, d) : null }) }
  <MarkdownEditor key={epoch} initialBody={body} …
```

**Verify — automated**

- [x] Red first, `tabState.test.ts`: `fenceWarm` four cases (match, differ, no fresh, scroll-only entry); `bumpBodyEpoch` advances `useBodyEpoch`. `navigationSlice` test: `replaceBody` clears every tab's warm `pageDetail` for the path. Then green.
- [x] The evicted-slot case (driven live at closeout, A8): open A, navigate to B, restore A, go back — the slot seeds the restored body, not the warm entry's.
- [x] `PageTile` (jsdom, `MarkdownEditor` stubbed): after `cachePageDetail({…body: 'RESTORED'})` + `bumpBodyEpoch`, the seeded body is `'RESTORED'` in the same commit as the key; the outgoing capture is fenced off.
- [x] `useWindowWarm`: a cached entry whose doc differs from the fresh detail is not restored.
- [x] `PageView`: a pending live-body timer lands `setPageBody` on unmount (red without the cleanup).
- [x] Existing warm-seam tests green unmodified. Full gate green.
- [x] Crossing test (driven live at closeout, A7): restore with the page open in the main pane, the Page Window, and an embed — all three show the restored body; a keystroke in the window saves restored text plus the keystroke.

**Verify — user**

- [ ] *(the Declared Stop.)*


#### Gate 4 — **Declared Stop**

- [x] Gates green. Every Verify ticked. Now counts re-run.
- [x] Simplification, then review, against `<base>..HEAD` scoped to `src/renderer`, `src/shared/pageMenu.ts`, `src/main/contextMenu.ts`; every concern fixed or ruled (simplifier: six edits folded, three flags fixed, three ruled; the review ran over the whole arc at closeout — two simplifiers, the reviewer, the attacker, the neutral verifier — and every finding folded at `c0f1b184` and `b1632f28`).
- [x] A restarted dev instance; the acceptance sequence driven on a throwaway page, then the sixteen-item closeout checklist with screenshots as the visual sign-off (Nathan's overnight ruling).
- [x] Progress hashes filled. Nathan's live rulings on the window, the unit, and the documents landed as they came; his own pass stands on the screenshots.

---

### Phase 5 — The record

#### Task 11: The documents

**Requirement:** 10

**Why:** Every falsified sentence rewritten where it stands; the feature has its own doc.

**Now** — the Made False table; `rg -F "FileHistoryPM" .claude` → 0.

**Becomes** — `.claude/Features/FileHistoryPM.md` (new): the capture rule, the store and its lifetime, the window and its actions, the settings, out of scope, Known Issues (pointer to Context), Pending (external-edit reload, diff view, per-device store files, a git provider, per-snapshot titles, reverse deltas). Each Made False row rewritten as currently true; ContextPM's Known Issues gain the two entries; CLAUDE.md's Codebase Map gains the line.

**Verify — automated**

- [x] `rg -F "Versioning, file history, backup" .claude/Features` → 0 · `rg -F "Git as opt-in content history" .claude/Features` → 0 · `rg -F "Four windows mount it" .claude/Features` → 0; the `FileHistoryPM` control is void by ruling (the feature is recorded under ArchitecturePM).

**Verify — user**

- [x] The docs read as the Studio's encyclopedic guide (Nathan, live: placed under ArchitecturePM as short paragraphs).


#### Gate 5 — closeout, through `/closeout`

- [x] The closeout over the whole range `b931ef59^..HEAD`, by hand (no `/closeout` skill exists): two simplifiers, the reviewer, the attacker; every finding fixed (`c0f1b184`, `b1632f28`) or ruled.
- [x] Delivery Claim (Closeout below); the neutral verifier at `f9f9a2c1`: Requirements 1–10 MET, every Core item MET, no contradictions; the attack folded.
- [x] Dead Vocabulary at zero against its control (five at 0; `ClearActionRow` 3, `PAGE_REACH_ACTIONS` 3).
- [ ] History entry **"PM-125 || Page File History"**; Context and Handoff current.
- [ ] Final +/- line count, comments and tests excluded.

---

## Implementation Log

### Progress

- [x] **Phase 1** — The store and the writer · base `b931ef59` · gate `1ef7370a` + the review's fold
  - [x] Task 1 · `ac153859`
  - [x] Task 2 · `12f6404f`
  - [x] Task 3 · `507232e8`
- [x] **Phase 2** — Capture · gate `266e85fc`
  - [x] Task 4 · `a4e33d6b`
  - [x] Task 5 · `3a0ce799`
- [x] **Phase 3** — The contract and the settings · gate `c2bf15f3`
  - [x] Task 6 · `d20c6324`
  - [x] Task 7 · `b1df9dfc`
- [x] **Phase 4** — The surface · gate `6b9f7bc2` … `3d10828b`, the scout `93fbcad5` / `c4cf76ff`, the closeout folds `47ebcd65`, `c0f1b184`, `b1632f28`
  - [x] Task 9 · `bc020d83`
  - [x] Task 8 · `085bfe51`
  - [x] Task 10 · `bc020d83`
- [x] **Phase 5** — The record
  - [x] Task 11 · `a5662871` (the documents), the History entry and Context with the closeout commit

### Rulings

- 09-03-2026, Nathan (secondary review, live): the history window's right-slot column reuses the Page Window's inspector class, `.page-window-insp`, as it stands — a byte-identical rule is reused, not hoisted or renamed; the editor-scale inline style stays spelled at each editor host as the Page Window spells it, and nothing is added to `store.ts` for it.
- 09-03-2026 (mine, secondary review): `NEEDS_SNAPSHOT_KEY` is hoisted because two channels share its sentence, while `history:list` and `history:delete` inline their own — the convention every hoisted `NEEDS_*` in `index.ts` follows; Current Version's gutter box reads `shown === null` beside the row's `selected` because Nathan's Gate 4 ruling makes that box mean shown while the snapshot boxes mean target — two meanings, one control shape, by spec.
- 09-03-2026 (mine, closeout attack): `runPageSendAction` answers true for `title:history` whether or not the tree still holds the page — the action is this router's, no other handler takes it, and a page gone from the tree between the menu and the click has nothing to open; the toggle's hint stands as written (Nathan, live: the history is device-local even though the toggle is a preference), the three keys riding `personalization` as Requirement 3 placed them; a store that opens healthy but refuses writes (a read-only file, a full disk) is one console line per capture, the best-effort contract Gate 1 set for the store, and the History window keeps listing what it holds.
- 09-03-2026, Nathan (closeout, live): the timeframe's unit reads `Days` as the interval reads `Min`; File History is documented as short paragraphs under ArchitecturePM's Persistence rather than as its own Features document — `FileHistoryPM.md` is not written, the Codebase Map gains no line, and Task 11's `FileHistoryPM` control is void.
- 09-03-2026 (mine, closeout sweep): the 1 MB cap does not refuse the text a restore is about to overwrite — that is the one act that destroys it, and the spec sets the cap for capture in general; a restore stores its `previous` at any size. The Gate 2 `STORE_FILE` ruling supersedes the decision log's W-2 placement: any `.db`, `-wal`, or `-shm` name is never watched or listed, so `adoptFile` refuses one as an attachment and a `[[name.db]]` link does not resolve — a SQLite file is not content. The first in-app save after a launch cannot tell a body changed while Pommora was closed from one it wrote itself; the text lands either way (the gate is empty after a reset), only the label reads `edit`. The history tail runs after the file lock, not inside it; with the bookkeeping moved before its first await the labels follow write order, and the remaining overlap (two captures of one page interleaving) can at most reorder two rows.
- 09-02-2026, Nathan (Gate 4, live): selecting a snapshot never auto-checks it — a row click selects the row and shows that snapshot in the body; the check is a separate action marking the restore and delete target.
- 09-02-2026, Nathan (closeout): his parallel-tree edits are his own comment pruning — at final closure they land as their own commit, separate from the feature's, and both are pushed to origin; the trailing trash glyph on a checked row reads in `label-secondary`; the closeout runs overnight and autonomously, with a progress artifact, screenshots as the visual sign-off for the gutter check and inset, four sweep agents (two on quality and cohesion, two on correctness and build-breaking), and the record written only after both lenses sign off.
- 09-02-2026, Nathan (Gate 4, live): Current Version carries the file's Last Modified as its date · time caption; the checkboxes sit in the gutter, always visible, and stay through a highlight; a click on a snapshot row shows that snapshot — the highlight drives the body, the check is the restore and delete target; the foot is a `MenuFooting` row; the date · time caption is a menu-layer primitive (`MenuSegments`) so any row can use it; his parallel session is his own — its in-flight edits fold into the commits rather than being stepped around.
- 09-02-2026 (mine, Gate 4): a keystroke landing between the pre-restore flush and main's write re-saves the old body — the same window as the recorded two-host lost update, carried into Context's Known Issues; the body epoch is keyed by path like every other renderer slot, and a host still holding a pre-rename path is stale for its saves too, not just its epoch; the delete confirm's singular sentence stands for a batch as Nathan wrote it.
- 09-02-2026 (mine, Gate 3): Clear History asks and clears without counting first — there is no count channel, and an empty store clearing to empty is not an error; a fractional typed day or minute rounds on every read through `clampInt`, so the rule never runs on a fraction; the twelve `showError(r.error.message)` sites across the renderer are outside this plan's paths and stay as they are.
- 09-02-2026, Nathan (Task 7 copy): toggle hint "Stores recoverable snapshots of device-local file history"; the interval's unit reads "Min"; Clear History's caption and its dialog both read "Permanently delete stored snapshots for all files; this cannot be undone." (his "Perminately" corrected); the two picker hints were not given and stay empty. Once the window lands: a one-time seeded History window — one Current Version and five differing snapshots — kept in front for his look.
- 09-02-2026, Nathan: the live NexusOS instance may be restarted and driven for the gates' live checks — a throwaway page only, reverted afterward.
- 09-02-2026 (mine, Gate 2): a body write still inside its lock when ⌘Q lands offers its text after the store closed and records nothing — quit does not wait on in-flight IPC, as it never has; `arm` awaits a config read that is microtask-only whenever the tree holds the root, so a flush cannot interleave with it today; the `values:changed` push, the id index, and the write echo stay three seams because they carry three facts.
- 09-02-2026 (mine, Task 4): the full suite's two editor stress suites (`embedAbsorb`, `citationBreakage`) timed out at 5 s under a load average of 22 during the gate and pass in isolation (49/49, 8 s); no timeout was raised, the gate is read as green with that noted.
- 09-02-2026 (mine, Gate 1): `PRAGMA quick_check` runs once per open — O(store) at startup on a file sized in megabytes, off every hot path; a same-millisecond `edit`/`external` pair replaces rather than doubles, which the interval gate makes unreachable in practice.
- 09-02-2026, Nathan: every consolidation a pass surfaces is folded, none ruled away.
- 09-02-2026 (mine): `versions.db` quarantines on a null handle as on a failed `quick_check` — `openDb` surfaces no errcode to tell garbage from busy, and a rename loses nothing.
- 09-02-2026 (mine): the `sessionVersionsDb` test lives in a new `sessionDb.test.ts`; `session.test.ts` tests `./session`, not the handles.

- 09-02-2026, Nathan: the deleted `Stamp Retirement — Implementation Plan.md` sitting in the index is committed at phase 1's start, by explicit path.
- 09-02-2026, Nathan: no screenshots during the plan — he is present, sees the progress, and drives tweaks.
- 09-02-2026, Nathan: the parallel confirm work lands before phase 3 opens — it landed at `605db15e` / `c3ca16ed`; Tasks 5–7 re-derive against HEAD.
- 09-02-2026 (mine, for Nathan to overturn): the `[[link]]` right-click menu keeps its two copy rows and does not gain View History — the plan's surfaces are the page surfaces.
- 09-02-2026, Nathan: pages only; the store stays tracked by NexusOS's repository; trash recovery keeps history; a row click highlights, a check selects; the trash glyph replaces a foot-left Delete; numeric settings ride the existing typeable picker; View History routed in `runPageSendAction`; confirms and their copy come from Nathan at execution, on the in-app seam his parallel session is landing.

### Open Against Later Tasks

### Deviations

- 09-03-2026, secondary review, pair 1 (cohesion and simplicity; every finding folded but the two ruled above): `runPageSendAction` takes the page `{ id, path }` its four callers already hold, so View History opens without a tree scan and `pagesOf` leaves the router; `reconcilePreview` closes the history window of a page the tree no longer holds, as it closes the preview tabs; `withStore`'s callback is `run`, since two of its consumers write; `writeBody` hashes each text once; the wire's `history:list` answers timestamps alone — `SnapshotRow` and `SnapshotSource` are the store's own types in `versionsDb.ts`, and `listSnapshots` answers its rows uncopied; `deleteSnapshots` is one statement, the chunking having guarded a limit no batch reaches; `isTimestamp` is gone — the channels call `isFiniteNumber`; `hint: ''` is dropped from the two picker rows, whose hint is absent rather than empty; the exit-animation latch the three floating windows spelled verbatim is `useHeldPresence` beside `useExitPresence`; `trailOf` in `treeIndex.ts` is the one never-null trail the Page Window, the history window, and the settings frame draw; `page-history-window.css` is gone — the two rules that were new live in `page-window.css`; the window's Last Modified read is its own effect keyed on the restore signal, so a delete no longer re-parses the page; `restore` has one exit; `PageTile`'s `setLoaded` takes a function alone.
- 09-03-2026, closeout attack (five verified breaks, every one folded): `replaceBody` cancels the path's pending save through `cancelPageSave` before the epoch remount, so a keystroke armed during a restore's two round trips can no longer write the old body back over the restored one; `livePagePath` in `treeIndex.ts` is the one resolver the restore and the history window share, so a renamed or moved page keeps its Current Version, its caption, and its embeds; the 1 MB cap binds `edit` offers alone — a foreign writer's text and a restore's outgoing text land at any size, since both are the act that destroys them; a Clear or a Delete frees the interval clock, so the text standing at that moment is captured on the next save; a write whose body equals what it overwrites offers nothing, so a repeated restore lands no second row; `arm` reads the toggle and arms nothing while history is off. Each carries a test.
- 09-03-2026, closeout sweep (the two simplifiers, every finding folded): the history window's Restore consumes only its own check and, on a failed restore, consumes nothing (the right-click path restores an unchecked row while others stay checked); the body re-reads only after a restore, not after every refresh; the restore-target rule is one expression in the window, so `pageHistoryModel.ts` and its test are gone (Task 9's Verify named that test — the three cases it held are the window's own live drive now); the body div reuses `.page-window-body`, and the two class names no stylesheet matched are dropped; a failed `history:list` reports through `showError`; `resolveOnlyConnections` in `treeIndex.ts` serves the hover pane and the history window; `NO_TRAIL` is exported from `NavTrail` for its five consumers; `clearCache` notifies the epoch listeners as `bumpBodyEpoch` does; `PageTile`'s editor stub mounts its body once so a missing `key` goes red; `HISTORY_DAYS.max` and `HISTORY_INTERVAL.max` read the last step by length; `STORE_FILE` and `hasPendingNavigation` lose their dead exports; `arm` reads its config before disarming so two overlapping arms cannot orphan a timer; `writeBody` records the written hash and reads the prior one before its first await, so overlapping saves to one page keep write order; `capture` refuses a Task or Event and an over-cap body before the settings read; `disarmAll` is one loop; `retireFileHistory` is the flush-then-reset pair the nexus open and the root rename share; `isFiniteNumber` serves `isTimestamp`, the card size, and the column heights; the two chmod-based read-failure tests skip under root.
- 09-02-2026, closeout fold: the check-set idioms the trash and the history window shared byte for byte — toggling a key, keeping only the checks that still name a listed row — live once in `DesignSystem/Util/checkSet.ts` (`toggled`, `retained`); a successful restore consumes its check (a second press on the same checked row would land a `restore` row duplicating the snapshot itself), so Restore goes quiet and Current Version shows; the Gate 4 reviewer was interrupted at compaction with no report, and Phase B's full-arc review over `b931ef59..HEAD` subsumes its range; no `/closeout` skill exists in any skills directory — the record is written by hand to `History-Format.md` and `Context-Format.md`.
- 09-02-2026, Gate 4 fold: `historyRowModel(rows, checked)` answers `checkedLive`, `restoreEnabled`, and `glyphOn` — the shown snapshot is the window's highlight, not a check; the window body re-reads after every action (a restore re-reads Current Version under the same highlight) and checks are pruned to the rows that survive a refresh; the body is keyed on `target.id` so a second page's window starts clean; the editor mounts on its body alone, with no key; `clearCache` clears the body epochs; `nexusDateFormat` in `formatValue.ts` serves the trash and the history window; `connMenu.ts` names its two copy actions locally.
- 09-02-2026, Tasks 9–10: the window's Restore calls the renderer half (`Interface/restoreSnapshot.ts`) from the start, so Tasks 9 and 10 land in one commit — the window cannot compile without `replaceBody`; a replaced body also clears PageView's pending live-body timer, so the outgoing editor's last keystroke cannot write over the restored slot; the restore confirm is `positive` (its own copy calls the overwritten text recoverable), the delete confirm `destructive`; both dialogs carry Nathan's sentence as the message with an empty detail, as Clear History does.
- 09-02-2026, Gate 3 fold: the four store channels answer `no-nexus` with no nexus open like every other data channel; a timestamp must be finite; the step arrays live in `types.ts` beside the ranges they bound, so min and max derive from the steps; a unit's suffix carries its own spacing (`' Days'`, `' Min'`), read the same in the picker's labels and the typed field; `ClearActionRow` clears its Cleared timer on unmount.
- 09-02-2026, Task 6: the channel bodies (`listHistory`, `readHistoryBody`, `restoreSnapshot`, `deleteHistory`, `clearHistory`) live in `CRUD/fileHistory.ts` over one `withStore` guard, and `index.ts`'s handlers only validate arguments — `index.ts` is not loadable under Vitest, so the plan's bridge-map test runs against the bodies; the restore handler pushes `values:changed` after the write, as the autosave handler does.
- 09-02-2026, Gate 2 (Nathan's consolidation ruling): one `STORE_FILE` predicate in `exclusion.ts` — any `.db`, `-wal`, or `-shm` segment is never watched or listed, wherever it sits, so Task 3's scoped clause is gone and `neverWatched`'s `nexus.db` prefix with it; `DB_SIBLINGS` in `driver.ts` serves both `open.ts`'s remove and the quarantine; `fileStamp` in `atomicWrite.ts` stamps the trash and the quarantine alike; `pageIdIndex` is memoized per tree object and is the one walk behind `liveIdIndex`, `liveIdOf`, and `livePathOf`.
- 09-02-2026, Gate 2 review: the foreign-overwrite memory is keyed by page id, not path, so a page recreated under a freed name inherits no stale hash; a restore arms no quiet timer — nothing was typed, so there is no settled text to capture.
- 09-02-2026, Gate 2 fold: the `historyDays` sweep runs after `confirmSettingsWrite` so it reads the value just written rather than the tree's stale copy; the watcher arms a page after `patchPageFromDisk`, so an externally created page is in the index when it is looked up; the gate clock moves only when a row lands; a flush keeps the source a timer was armed with; `before-quit` quits on rejection as on settlement; `valuesChanged` memoizes both directions of the id index per tree and offers `liveIdOf(root, abs)`.
- 09-02-2026, Task 4: `writeBody` leaves the `values:changed` push to its caller — `pushValueChanges` is private to `index.ts` and bound to the main window, so the handler's tail is `await writeBody(...)` then the push; the interval gate binds `edit` offers only — `external` and `restore` land at once — and the private `capture(…, gated)` serves both the gated offer and the ungated flush.
- 09-02-2026, Task 1 (Gate 1): the quarantine name is `versions.corrupt-<stamp>.db` (siblings `…db-wal`, `…db-shm`) rather than `versions.db.corrupt-<stamp>`, so the watcher's store clause covers the set-aside files and a quarantine costs no walk; a store whose rename failed is left where it is and the session runs without history rather than reopening a damaged file; `openDb` closes the handle it failed to configure; a failed `CREATE TABLE` closes and answers null; `deleteSnapshots` deletes in chunks of 500 ids.
- 09-02-2026, Task 7 (re-derived at HEAD): the clear row carries one `clear: () => Promise<boolean>` instead of `action` + a static `confirm` — the exclusions clear counts first, puts the count in its copy, and reads a null reply as nothing to clear, which a static `ConfirmRequest` can't express; `ask` stays private, so each clear's confirm is a named wrapper in `confirmations.ts`.

### Lessons

### Sequenced After

- The watcher's `page-upsert` driving the slice's `replaceBody` — the external-edit reload.
- Per-snapshot titles; a diff view on `@codemirror/merge`; per-device store files; a git provider as a second store module.

### Closeout

**Delivery Claim (09-03-2026, HEAD `a5662871`).** Requirement 1: `.nexus/versions.db` opens through `openDb` beside `nexus.db` (`sessionDb.ts`), `PRAGMA quick_check` and a null handle both quarantine to `versions.corrupt-<stamp>.db` with the journal siblings, one table `snapshots(page_id, ts, source, blob)` created on open with no version row, and `addSnapshot`/`latestSnapshot`/`listSnapshots`/`readSnapshot`/`deleteSnapshots`/`clearSnapshots`/`sweepSnapshots` in `versionsDb.ts`; the watcher and every lister skip any `.db`/`-wal`/`-shm` name through `STORE_FILE` in `exclusion.ts`. Requirement 2: `writePageFile` answers `{ previous, written }` and throws on any read error but ENOENT; `updatePageBody` turns the throw into `operation-failed` and leaves the bytes. Requirement 3: `captureIfDue` holds the whole rule (toggle, kind mark, interval gate keyed by the page's last landed row, foreign-overwrite exception keyed by page id, dedupe against the latest row, a 1 MB cap the restore is exempt from, config through `readLivePersonalization`); `writeBody` is the one body-write path; per-page quiet timers arm from the writer and the watcher and resolve through `livePathOf`; `retireFileHistory` flushes ungated then resets at a root switch and a rename, `before-quit` flushes; the three `Personalization` keys clamp on read. Requirement 4: `sweepFileHistory` at open and on a `historyDays` write. Requirement 5: `history:list/read/restore/delete/clear/menu` and the `open-history` push in `bridge.ts`, restore through `writeBody(…, 'restore')` answering the page's live path, read/restore/delete resolving the page by id. Requirement 6: the File History section — `fileHistory` toggle, `historyDays` and `historyInterval` on the typeable `zoom` row with `DAYS`/`MINUTES` units, Clear History on the `clear` row kind flipping to Cleared for 1500 ms, `ClearActionRow` replacing `ClearExclusionsRow`. Requirement 7: `opts.history` in `pageMenu.ts` above Reveal with its own separator, passed by every consumer, routed in `contextMenu.ts` and `runPageSendAction`; History beside Properties in `PageMenu.tsx`. Requirement 8: `PageHistoryWindow` on `WindowBase` — the trail as title, a read-only `MarkdownEditor` with a two-deep ancestor chain, the list in the overlay right slot with Current Version (Last Modified caption) above a divider and Untitled Snapshot rows with a gutter check and a `MenuSegments` date | time caption; a click highlights and shows, a check names the restore/delete target, a trash glyph trails each checked row and deletes every checked row, Restore is filled at a `MenuFooting` foot and live for exactly one check, right-click offers Restore and Delete or Delete All, both actions confirm, the list refetches after each. Requirement 9: `restoreSnapshot` flushes the page's pending save, calls main, then `replaceBody` drops every warm detail, refetches, patches the slot, and bumps the path's epoch; `fenceWarm` guards the tile, PageView, and window seams. Requirement 10: the falsified documents rewritten; File History recorded under ArchitecturePM's Persistence per Nathan's ruling; the two Known Issues in Context.

---

## Completion Criteria

**The directive**

```
Execute File History — Implementation Plan. Live.
Live-verify: the History window against the mock at Gate 4; restore landing in every open surface.
Screenshots: none — Nathan is watching live.
Pings: at the Gate 4 stop · at completion.
Record: History arc "PM-125 || Page File History", via /closeout.
Also: the tree is shared — stage explicit paths only; restart the dev instance for main/preload changes; confirm copy comes from Nathan.
Everything else is the standard below.
```

**The Standard**

- **The bar.** Not doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong.
- **Only the live confirmation may be pending.** No concerns carried, no deferrals when the fix is known.
- **Reusability first.** Search before writing. A second resolver, cache, or validator means the plan is wrong, or you are — log it.
- **Fix at the source.** Add code only where it repairs something flawed or makes things simpler.
- **Ambiguity:** simplest reading, recorded under Rulings or Deviations, continue. Execution stops only at the Declared Stop and for Nathan's copy.
- **Per phase:** implement → simplify → comment pass → gates → code review → attack review → every finding fixed or ruled → commit → ping. Simplification before review, never inverted.
- **Comments** only where the why can't be inferred. **Docs** rewritten, never amended. Unattributed doc or style edits belong to Nathan; fold them in.

**The deliverable**

- [ ] Every numbered requirement traces to a landed task.
- [ ] The acceptance criterion observed running, clause by clause.
- [ ] No SQLite read on the autosave path outside the interval; no `full-refresh` per snapshot.
- [ ] A refused `writePageFile` leaves the file byte-identical.

**The passes**

- [ ] Simplification and the comment pass over the whole range.
- [ ] Simplification → code review over the full implementation, in that order.
- [ ] Delivery Claim written, checked by a neutral verifier against the decision log; then attacked.
- [ ] Every finding fixed, or carrying a defensible ruling.

**The user's own pass**

- [ ] The History window against the mock; restore in the main pane, the Page Window, and an embed at once; both confirms; the settings section; View History in every menu.

**The record**

- [ ] Documents made false rewritten in the falsifying commits.
- [ ] The closing sweep at zero against its control.
- [ ] Context and Handoff current; the History entry "PM-125 || Page File History".
- [ ] Lessons routed; successors in Sequenced After.

**The report**, in plain English — what shipped and why it matters · what happened along the way · every gate's real output · in-flight decisions · what's left for the live pass · final +/- line count, comments and tests excluded.
