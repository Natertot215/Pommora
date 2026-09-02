## File History — Implementation Plan

> **Status:** written, pending review · Spec: [[File History — Decision Log]] · Execute tasks in order.
> Citations name files and symbols at HEAD `af6f28a5`; re-derive before editing. The tree is shared with a parallel session — line numbers are landmarks, symbol names and the greps are the truth.

**Goal**

A page accumulates snapshots while it is edited, without the user doing anything: the text on disk before an edit lands, the settled text after a burst goes quiet, one more each interval inside a long burst, and the text a foreign writer left whenever Pommora is about to overwrite it. Every page reachable by right-click carries **View History**, and the page's Settings menu carries **History**; both open one floating window on the Page Window's chassis that lists the page's snapshots beside a read-only render of the checked one. **Restore** replaces the body alone, capturing the current text first so the act is reversible from the same list; a trash glyph on a checked row deletes. Settings › Files & Links gains a **File History** section: an On/Off toggle, a timeframe (7–90 days, default 90), an interval (5–20 minutes, default 5), and a destructive Clear History for the device. Snapshots older than the timeframe are pruned at open. A page deleted to `.trash` keeps its history for its return.

The shape: one device-local SQLite file, `.nexus/versions.db`, behind the existing driver seam, holding whole-file text compressed with Node's `zlib`, keyed by page `ID` and timestamp; one capture function in main holding the whole rule, offered by the body writer after its write, by a per-page quiet timer the writer and the watcher arm, on Nexus switch, and by restore; a store module rather than a provider interface, so a later git provider is a second module behind a switch. Files-per-snapshot was rejected on storage (a 1:100 history ratio over NexusOS is ~31,000 small files and ~290 MB against ~100 MB of compressed rows); a table in `nexus.db` was rejected because that file is disposable by design; git-first was rejected because a phone can't run it and NexusOS is already the user's own repository. Settled by Nathan on 09-02-2026 across the decision log's rulings.

Bounded by: recovery is body-only, by construction — the one restore path writes through the body writer; pages only, filtered by the ULID kind mark; Homepage and Space blocks and tiles never reach the hook; system rewriters (cascade, sweeps, adoption, remint) never capture; snapshots are frozen text; `nexus.db` is untouched; no new dependency; the window's visual pass follows Nathan's mock and stops for his eye. This plan does not fix the in-app two-host lost update (a page open in two Pommora surfaces overwriting each other) — it records it and seeds the mechanism.

**Requirements**

1. `.nexus/versions.db` opens through `openDb` with an integrity check that quarantines a damaged file by renaming it and its `-wal`/`-shm` siblings, never deleting; one table `snapshots(page_id, ts, source, blob)`, `CREATE TABLE IF NOT EXISTS` re-applied on open, no version row; the module exposes add, latest, list, read, delete, clear, sweep. The file ignores the watcher through one `.nexus`-scoped `.db*` clause in `ignoredUnder`.
2. `writePageFile` returns the text it overwrote; a read failure other than a missing file refuses the write rather than rewriting the page from empty frontmatter.
3. `captureIfDue(root, pageId, text, source)` holds the whole rule: the File History toggle, the interval gate on an in-memory `Map<pageId, lastTs>`, the foreign-overwrite exception on `Map<path, bodyHash>` fed by `updatePageBody` alone, dedupe by the body `splitEnvelope` returns against the latest snapshot, a 1 MB size cap, best-effort after the write returns. Per-page quiet timers armed by the writer and by the watcher's `page-upsert`, resolved to a path at fire time by inverting `pageIdIndex`, disarming an id the tree no longer holds or two paths claim; both maps and every timer clear where the store closes; a Nexus switch offers every armed page ungated first.
4. Retention is one age-bounded `DELETE`, run at open and from the settings write when `historyDays` shrinks.
5. Channels `history:list`, `history:read`, `history:restore`, `history:delete`, `history:clear`, `history:menu`, `history:confirm`, and the push `open-history`; restore captures the current text ungated (source `restore`), runs the body write's own tail, and answers with the page's resolved path; every read, restore, and delete validates the snapshot against the page id and resolves the page by id.
6. `Personalization` gains `fileHistory?: boolean`, `historyDays?: number`, `historyInterval?: number`, clamped on read; a **File History** section on Files & Links: toggle, two numeric typeable pickers on the `zoom` row kind given a unit, and a destructive Clear History whose label flips to **Cleared** for 1500 ms behind the same native confirm the exclusions clear uses; `ClearExclusionsRow` generalizes to `ClearActionRow`.
7. The shared page menu gains **View History** as `opts.history`, directly above Reveal Location with its own separator, riding the send block so every consumer that reaches a page — sidebar row, tab, nav row, card, title cell — offers it, routed once in `runPageSendAction`; the page Settings menu gains a **History** row beside Properties; both open the window.
8. `PageHistoryWindow` on `WindowBase` with the page's location trail as its title, no toolbar band, the close × alone; a read-only `MarkdownEditor` rendering the checked snapshot (Current Version when none is checked) with a two-deep ancestors chain so its embeds render inert; the list in an overlay right slot: **Current Version** first behind a divider, then **Untitled Snapshot** rows with a leading checkbox and a caption of the Nexus's date then a hairline then its time; a row click highlights only, a check selects the target; a trash glyph trails a checked snapshot row and deletes every checked row; **Restore** at the foot-right, inactive for Current Version, dimmed for a multi-check; both actions behind native confirms with the ratified copy; a right-click pops the same two actions; the list refetches after every action.
9. Restore's renderer half: flush the page's pending save, call main, then refresh the detail slot and the navigation slot's body with the restored text at the resolved path, and re-seed every host of that path — `PageView` by re-keying its editor, `PageTile` by an effect resetting its seed — through one `bodyReplaced(path)` signal; the three warm seams share one fence comparing the cached doc against a fresh body handed in, keeping the entry when none is known.
10. Every document the change falsifies is rewritten in the commit that falsifies it, carried by the Made False table; `FileHistoryPM.md` is written; the two Known Issues land in Context.

**Acceptance — the whole thing working:** In a scratch Nexus with File History on at a 5-minute interval, open a page, type a paragraph, wait past the interval without typing, type a second paragraph, then edit the same file from a text editor outside Pommora while the page stays open, then type a third paragraph in Pommora. Right-click the page's sidebar row › View History: the window opens with Current Version first and at least three snapshots beneath — the pre-edit text, the settled first paragraph, and the external editor's text captured before Pommora overwrote it — each rendering read-only when checked, embeds inert. Check the external one, Restore, confirm: the open editor shows the external text, the file on disk holds it with its frontmatter untouched, and the list now carries one more snapshot holding the three-paragraph text. Check two rows, the trash glyph, confirm: both gone from the list and from `versions.db`. Settings › Files & Links › File History › Clear History › Clear: the label reads Cleared and the window lists Current Version alone. Delete the page to `.trash` and restore it: its history is back. Throughout, `rg -c "full-refresh"` in the main log stays unmoved by captures.

**Forced By**

- `neverWatched` takes a bare segment and `adoptFile` shares it (`mutate.ts:135`) → the `.db*` ignore is a `segs[0] === NEXUS_DIR` clause in `ignoredUnder`, never a widening of `neverWatched`, or file properties refuse `.db` attachments (Task 3).
- `openDb` returns `null` for a file that won't open, and `PRAGMA quick_check` throws on interior corruption → the quarantine branch runs on both a null handle with an existing file and a thrown check, inside try/catch (Task 1).
- SQLite adopts and deletes an orphaned hot WAL on a fresh open (executed) → quarantine renames all three files under one stamp (Task 1).
- `serializeOnFile` is non-reentrant and the capture must not delay the write → `updatePageBody` reads the outgoing text inside its lock and returns it; the handler offers it after the `Result` is settled (Tasks 2, 5).
- `writePageFile` reads internally and returns `void`, and its catch treats every error as a new file → the return type becomes `string | null` and only `ENOENT` starts from empty (Task 2).
- `pageIdIndex` is path→id and `findPage` is private to `watchPatch.ts` → the timer map holds no path; fire-time inversion over `liveIdIndex(root)` is the only id→path main has (Task 4).
- Every autosave lands 400 ms apart → the interval gate reads memory, hashes only after it passes, and the SQLite read for dedupe happens at most once per interval per page (Task 4).
- Five relocation paths move page files → nothing re-keys on relocate; an id the inverted index no longer holds disarms (Task 4).
- The renderer's `beforeunload` flush is un-awaited → app-close capture is best-effort; the Nexus-switch offer runs after the renderer's `flushAllPageSaves`, which the adopt path already awaits (Task 5).
- `contextMenu.ts:111` switches on a cast expression → no exhaustiveness assert is writable there; `runPageSendAction` is the one router every renderer consumer calls first (Task 8).
- `pageMetaMenuSubset` hardcodes its opts and the tab and nav menus pass `pageSendActions(ctx)` → History rides the send block's arrays so every subset consumer gains it in one edit (Task 8).
- `PageTile` seeds `loaded` in a `useState` initializer and `MarkdownEditor` consumes `initialBody` at mount only (`index.tsx:459`) → a key bump on the inner editor re-seeds nothing; `PageTile` needs an effect resetting `loaded`, and `PageView` needs its editor re-keyed (Task 10).
- The outgoing editor's cleanup capture runs between the incoming subtree's render and its mount effects (executed under React 19) → restore refreshes caches with the restored text and every seam fences by doc-compare; a drop is refilled before it's read (Task 10).
- `writeThroughBody` updates only and nothing puts the main pane's page in `detailByPath`; `DETAIL_CAP = 40` evicts → the refresh calls `cachePageDetail`, and a fence with no fresh body keeps the entry (Task 10).
- `PickerControl` already carries `typeable` and the `zoom` row already clamps a typed number into its steps → the two numeric settings ride `zoom` with a unit; no new row kind, no type widening (Task 7).
- `ClearExclusionsRow` treats `null` as no-op → the generalized row flips on any non-null success (Task 7).
- No shared confirm helper exists; nine handlers inline `showMessageBox` → the two new dialogs share one small helper, and the nine are Sequenced After (Task 6).
- `PreviewTarget` is renderer-only; the wire carries `ContextTarget` → `open-history` pushes a `ContextTarget` and `App.tsx` adapts it as `open-in-preview` does (Task 9).

**Inherited Reasoning:** The decision log's Considered & Rejected: git first in any form (whole-tree, no retention, path-keyed, a phone can't run it); files per snapshot (storage); a table in `nexus.db` (disposability); persisting CM6 undo history; a renderer-side timer (identity-blind); riding the Page Window (one-at-a-time, editable, tab-bound). Three build-breaking rounds settled: a plain interval gate loses an external edit landing inside the interval (hence the foreign-overwrite exception); a `bodyReplaced` key bump re-seeds nothing (hence the effect and the re-key); dropping a warm cache is refilled by the outgoing editor's cleanup (hence refresh-and-fence); a version row and an encoding column earn nothing today; `Clear History` in the window is covered by multi-check plus the glyph. Nathan: pages only for now; the store stays tracked by his repository; trash recovery must keep history; every plan step searches for the existing save, debounce, writer, watcher, and store mechanism before adding one.

**Grounding** *(re-open these; don't cite them)*

- `src/main/CRUD/page.ts:46-78` (`relocatePage`, `updatePageBody`) · `IO/pageFile.ts:25-33,176-191` (`splitEnvelope`, `writePageFile`) · `IO/atomicWrite.ts` · `IO/fileLock.ts` · `IO/writeEcho.ts`.
- `src/main/Database/driver.ts:8-22` · `Database/open.ts:17,31-74` · `Database/schema.ts:8-9,41-61` · `Database/localState.ts:1-30` · `sessionDb.ts` (whole) · `index.ts:333-431` (the open sequence) · `index.ts:957-982,1094-1110,1584-1600,1602-1609,1883-1894` · `contextMenu.ts:84-165` · `trashMenu.ts` · `valuesChanged.ts:27-43` · `liveTree.ts:19-51` · `settings.ts:63-84` · `readNexus.ts:136-148` · `watcher.ts:54-81` · `watchPatch.ts:130-143,242-247` · `exclusion.ts:8-15` · `mutate.ts:125-135` · `ipc.ts:70-77`.
- `src/shared/bridge.ts:90-97,237-246,266-274,357-374` · `types.ts:67-81,90-180,225-232,524-530` · `pageMenu.ts` (whole) · `pageMenu.test.ts:1-40` · `tabMenu.ts` · `navRowMenu.ts` · `cellMenu.ts:128-138` · `cardMenu.ts:32-45` · `trashMenu.ts` · `nexusPaths.ts:6-26`.
- `src/preload/index.ts:31-38,116-127,155-158,170-188`.
- `src/renderer/Store/tabState.ts` (whole) · `SurfacePM/tileCache.ts` (whole) · `Interface/PageView.tsx:100-185` · `Windows/useWindowWarm.ts` (whole) · `Windows/windowCache.ts` · `SurfacePM/PageTile.tsx:40-148` · `Windows/PageWindow.tsx` (whole) · `Windows/window-base.tsx:20-75,185-201` · `Windows/WindowInspector.tsx:33-69` · `Interface/pageFlush.ts` (whole) · `Store/navigationSlice.ts:234-241,355-357` · `Store/previewSlice.ts:23-59,151-172,232-236,304-307` · `Store/configSlice.ts:6-12,34-50` · `App.tsx:113-138,284-291` · `Frames/PageMenu.tsx` (whole) · `Actions/pageMenuActions.ts` (whole) · `Settings/SettingsWindow.tsx:52-165,335-415,669-689,712-727,744-787` · `Settings/ClearExclusionsRow.tsx` · `Settings/TrashFrame.tsx:60-95,178-195,261-341` · `DesignSystem/Elements/PickerControl/PickerControl.tsx:1-60` · `DesignSystem/Menus/menu-row.tsx:52-101` · `DesignSystem/Buttons/Button.tsx:9-52` · `DesignSystem/Controls/Checkbox.tsx:6-31` · `DesignSystem/Elements/Segment/segment.css.ts` · `Properties/Assignment/formatValue.ts:57-102` · `Links/ConnectionPane.tsx:34,419-429` · `MarkdownPM/index.tsx:76-137,227-232,459` · `MarkdownPM/Editor/embedWidget.tsx:259,478` · `treeIndex.ts:200,240-262` · `Actions/nativeMenus.ts`.
- `.claude/Guidelines/Development-Environment.md` — gates, pipefail, main/preload don't HMR, no whole-tree git ops, stage explicit paths, the `window` handler try/catch rule.
- NexusOS at grounding: 315 pages, 2.9 MB, 196 under 4 KB; `.nexus/nexus.db` tracked by its repository.

**Environment:** Plan directory `.claude/Planning`. Spec: [[File History — Decision Log]]. Explorer: `Explore`. Research: general-purpose. Code reviewer: `feature-dev:code-reviewer`. Attack reviewer: `build-breaking-agent`. Simplification: `code-simplifier`, dual-briefed to also report non-simplicity bugs. Comments: `comment-killer-agent`, briefed "no sub-agents, no worktree." Neutral verifier: general-purpose. Rules: `.claude/Guidelines/`. Gates from `Pommora/`: `npm run typecheck && npm run test && npm run lint`, exit codes read directly; `npm run lint` must report zero warnings in its text.

**Shapes:** additive (the store, the capture, the channels, the settings, the window) · fix (`writePageFile`'s read failure; the sibling sweep is its two callers in `CRUD/page.ts`) · refactor (`ClearExclusionsRow` → `ClearActionRow`; the `zoom` row's unit; the shared warm fence — behavior preserved, proven by the existing tests) · user-visible (the window, the menu rows, the section) · live data (the Declared Stop runs against Nathan's Nexus over CDP, read-only screenshots and a throwaway page only).

**Declared Stops**

- **Gate 4** — the History window and the File History section are on screen. Nathan compares the window against his mock (the trail title, the list, the checkbox rows, the caption, the trash glyph, Restore's states, both confirms) before phase 5 restates the docs around it.

**Global Constraints (every task inherits these):**

- Gates from `Pommora/`: `npm run typecheck && npm run test && npm run lint` — each exit code read directly, never piped; lint's `Found N warnings` line must read zero.
- Formatting is Biome's through the PostToolUse hook; a shell-driven edit runs `npm run format` afterward. Single quotes, no semicolons, never hand-align.
- Comments only where the why can't be inferred; never restate a value a declaration holds; none in tests. `KNOB` markers survive.
- Stage explicit paths, never a directory; check `git status` for foreign staged paths before every commit; commit as soon as a gate is green. No whole-tree git operations.
- One tree-touching writer at a time; agents are told the tree is shared and not clean.
- `src/main` and `src/preload` don't HMR — a dev instance must restart to see a new channel.
- Before any step introduces a save, debounce, flush, timer, writer, or store mechanism, it searches for the existing one named in Grounding and reuses or extends it. A second writer or debounce for something that has one is a defect (Nathan, 09-02-2026).
- Out of scope everywhere: `nexus.db` and its schema; `blocks.ts` and every block or tile body; Tasks and Events; the watcher-driven editor reload; git; a diff view; per-snapshot titles beyond the row label; the nine existing inline confirms.

**Made False**

| Doc | The specific claim | What makes it false | Task |
| --- | --- | --- | --- |
| ArchitecturePM | "**Versioning, file history, backup** — Time Machine, `git` on the Nexus, filesystem snapshots. In-session undo comes from the editor." | File History exists | 11 |
| ArchitecturePM §Nexus Layout | the `.nexus` tree lists `nexus.db` alone | `versions.db` beside it | 11 |
| ArchitecturePM §Persistence | "Stays on this machine, inside the Nexus" table has no history row | snapshots are a fourth kind of device-local state | 11 |
| NexusRecordPM §Pending | "**Git as opt-in content history** — complementary to the record; Pommora never auto-commits." | File History is the content history; git is a provider it admits | 11 |
| ConfigurationPM §Files & Links | no File History section | four rows | 11 |
| InterfacePM §Floating Windows | "Four windows mount it" | five | 11 |
| InterfacePM page-menu table | Locate row reads "Reveal Location" alone | View History above it | 11 |
| PagesPM §Opening Behavior | says nothing of history | one sentence pointing at FileHistoryPM | 11 |
| ContextPM §Known Issues | two entries | the two-host lost update; `versions.db` tracked by the repository as accepted | 11 |
| `shared/types.ts:93-95` comment | "a new toggle is a field here plus an apply-map row" | it is also a `readPersonalization` row | 7 |

**Dead Vocabulary**

- `ClearExclusionsRow` → expect 0. Legitimate hits: none.
- `clear-exclusions` (the row kind) → expect 0. Legitimate hits: none.
- Control: `ClearActionRow` → ≥ 3 (the file, its import, the `RowControl` case). Zero here means the sweep never ran.

---

### Phase 1 — The store and the writer

#### Task 1: `versions.db` behind the driver seam

**Requirement:** 1

**Why:** Every later task reads or writes snapshots through one module that opens safely, and the file's health is decided once at open rather than discovered on the first throwing read.

**Now** — `rg -F "nexus.db" src/main/Database/driver.ts` → 1 (the failure log names the other file):

```ts
// src/main/Database/driver.ts:8-22
export function openDb(path: string): Db | null {
  try {
    const db = new DatabaseSync(path)
    db.exec('PRAGMA journal_mode = WAL')
    db.exec('PRAGMA foreign_keys = ON')
    return db
  } catch (e) {
    console.error(`nexus.db: cannot open ${path} — operational state will not persist:`, errText(e))
    return null
  }
}
```

```ts
// src/main/sessionDb.ts:9-35 — one handle, opened on nexus open, closed on switch or quit
let db: Db | null = null
export function sessionDb(): Db | null
export function openSessionDb(root: string): void
export function closeSessionDb(): void
```

```ts
// src/main/Database/schema.ts:41-43 — the idempotent DDL apply the store copies the shape of
export function applySchema(db: Db): void {
  db.exec(DDL)
}
```

**Becomes** — one new module, the session holding a second handle beside the first, the driver's log naming the file it failed on:

```ts
// src/main/Database/driver.ts
export function openDb(path: string): Db | null
// the failure log reads `${basename(path)}: cannot open ${path} — …`
```

```ts
// src/main/Database/versionsDb.ts (new) + versionsDb.test.ts
export const VERSIONS_FILENAME = 'versions.db'
export type SnapshotSource = 'edit' | 'external' | 'restore'
export interface SnapshotRow {
  ts: number
  source: SnapshotSource
}

/** Open `.nexus/versions.db`. A file that won't open, or fails `PRAGMA quick_check`, is renamed
 *  with its -wal and -shm siblings to `versions.db.corrupt-<ISO stamp>` and a fresh one opened.
 *  Never deletes. null ⇒ no history this session. */
export function openVersionsDb(nexusRoot: string): Db | null
// DDL: CREATE TABLE IF NOT EXISTS snapshots (page_id TEXT NOT NULL, ts INTEGER NOT NULL,
//   source TEXT NOT NULL, blob BLOB NOT NULL, PRIMARY KEY (page_id, ts))
//   + INDEX snapshots_by_ts (ts)

export function addSnapshot(db: Db, pageId: string, ts: number, source: SnapshotSource, text: string): void
// text → zlib deflateSync → blob; a (page_id, ts) collision takes ts + 1 until free
export function latestSnapshot(db: Db, pageId: string): { ts: number; text: string } | null
export function listSnapshots(db: Db, pageId: string): SnapshotRow[]   // newest first
export function readSnapshot(db: Db, pageId: string, ts: number): string | null   // inflated text
export function deleteSnapshots(db: Db, pageId: string, ts: readonly number[]): number   // rows removed
export function clearSnapshots(db: Db): number
export function sweepSnapshots(db: Db, cutoffMs: number): number   // DELETE … WHERE ts < cutoff
```

```ts
// src/main/sessionDb.ts
export function sessionVersionsDb(): Db | null
// openSessionDb(root) opens both; closeSessionDb() closes both; each best-effort and independent
```

**Assumed by:** Task 4 (capture reads `sessionVersionsDb()`), Task 5 (sweep at open), Task 6 (the channels).

**Verify — automated**

- [ ] Red first, `versionsDb.test.ts` on a scratch dir: add/latest/list/read round-trip through zlib; dedupe is the caller's, so two adds with equal text are two rows; `deleteSnapshots` returns the count and leaves other pages alone; `sweepSnapshots` removes only rows older than the cutoff; a collision on `(page_id, ts)` lands at `ts + 1`; a garbage header → `openVersionsDb` returns a live handle on a fresh file and the `.corrupt-` triple exists; interior corruption past 4096 bytes → same; a file with a hot `-wal` quarantines all three names. Expect 8 failures, module not found; then green.
- [ ] `openSessionDb` on a root with no `.nexus/versions.db` creates it; `closeSessionDb` closes both handles (the existing `sessionDb` test file gains one case).
- [ ] Full gate green, exit codes read directly.
- [ ] `rg -F "nexus.db: cannot open" src/main` → 0. Control: `rg -F "openDb(" src/main` → ≥ 2.

**Verify — user**

- [ ] *(none — nothing user-visible ships here.)*


#### Task 2: `writePageFile` returns the overwritten text and refuses on a failed read

**Requirement:** 2

**Why:** The capture needs the text a save is about to overwrite, and a page whose file can't be read mid-save must never be rewritten without the frontmatter it couldn't read — Nathan's "absolutely unacceptable."

**Now** — `rg -F "writePageFile(" src/main --glob '!*.test.ts'` → 3 (the definition, `createPage`, `updatePageBody`):

```ts
// src/main/IO/pageFile.ts:178-191
export async function writePageFile(
  absPath: string,
  modeled: Record<string, unknown>,
  modeledKeys: readonly string[],
  body: string,
): Promise<void> {
  let existing = ''
  try {
    existing = await readFile(absPath, 'utf8')
  } catch {
    /* new file — start from empty frontmatter */
  }
  await atomicWriteFile(absPath, mergeFrontmatter(existing, modeled, modeledKeys, body))
}
```

```ts
// src/main/CRUD/page.ts:70-78
export async function updatePageBody(absFile: string, body: string): Promise<Result<null>> {
  return serializeOnFile(absFile, async () => {
    if (!(await pathExists(absFile))) return fail('not-found', 'Page not found.')
    await writePageFile(absFile, {}, [], body)
    return ok(null)
  })
}
```

**Becomes** — the read failure is a refusal, the previous text is the return, and the body writer hands it up:

```ts
// src/main/IO/pageFile.ts
/** Returns the text the write replaced; null for a file that did not exist. Only ENOENT starts
 *  from empty frontmatter — any other read failure throws, since a write built on a failed read
 *  would drop the page's frontmatter and its ID. */
export async function writePageFile(
  absPath: string,
  modeled: Record<string, unknown>,
  modeledKeys: readonly string[],
  body: string,
): Promise<string | null>
```

```ts
// src/main/CRUD/page.ts
/** The text the save overwrote rides the Result so the caller can offer it to File History. */
export async function updatePageBody(absFile: string, body: string): Promise<Result<string | null>>
// a thrown read inside the lock → fail('operation-failed', …); the file is untouched
```

`createPage` keeps ignoring the return.

**Assumed by:** Task 5 (the handler offers `r.value`).

**Verify — automated**

- [ ] Red first, `pageFile.test.ts`: `writePageFile` returns the prior text on an existing file and `null` on a missing one; a directory at the path (EISDIR) throws and leaves no file written — expect 3 failures; then green.
- [ ] `page.test.ts`: `updatePageBody` answers `ok(previousText)`; on a read failure answers `fail` and the file's bytes are unchanged. Red, then green.
- [ ] The existing `writePageFile` and `updatePageBody` tests stay green unmodified.
- [ ] Full gate green.

**Verify — user**

- [ ] *(none.)*


#### Task 3: The watcher ignores `.nexus/*.db*`

**Requirement:** 1

**Why:** Every capture writes SQLite pages and a WAL beside `nexus.db`, and an unexcluded `.nexus` entry classifies `full-refresh` — one verification walk per snapshot on the autosave path.

**Now** — `rg -F "segs[0] === NEXUS_DIR" src/main/watcher.ts` → 2:

```ts
// src/main/watcher.ts:68-79
    return (
      segs.some(neverWatched) ||
      (segs[0] === NEXUS_DIR && segs[1] === HOMEPAGE_HOST_DIRNAME) ||
      (segs[0] === NEXUS_DIR &&
        segs[1] === CONTEXTS_DIRNAME &&
        segs.length >= 5 &&
        isMarkdownFile(segs[segs.length - 1])) ||
      isExcluded(segs)
    )
// src/main/exclusion.ts:8-15 — unchanged; `neverWatched` still matches `nexus.db*` by name and
// adoptFile shares it
```

**Becomes** — one more scoped clause:

```ts
// src/main/watcher.ts
const DB_FILE = /\.db(-wal|-shm)?$/
      (segs[0] === NEXUS_DIR && segs.length === 2 && DB_FILE.test(segs[1])) ||
```

**Verify — automated**

- [ ] Red first, `watcher.test.ts`: `ignoredUnder` ignores `.nexus/versions.db`, `.nexus/versions.db-wal`, `.nexus/versions.db-shm`, still ignores `.nexus/nexus.db`, still watches `.nexus/settings.json` and `.nexus/contexts.json`, and does not ignore `Notes/report.db` (a file property). Expect 3 failures; then green.
- [ ] `mutate.test.ts`'s `adoptFile` cases stay green unmodified — the shared predicate didn't move.
- [ ] Full gate green.

**Verify — user**

- [ ] *(none.)*


#### Gate 1 — the store opens, the writer tells the truth

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked, each against a result just watched.
- [ ] Every Now count re-run against its control; counts matched, or the divergence rewrote the plan.
- [ ] Every task that diverged had its dependents re-derived and rewritten.
- [ ] Simplification and review dispatched against `<base>..HEAD` scoped to `src/main/Database`, `src/main/sessionDb.ts`, `src/main/IO/pageFile.ts`, `src/main/CRUD/page.ts`, `src/main/watcher.ts`; the reports cite files inside it.
- [ ] Every concern fixed, or carrying an explicit user ruling recorded in the Log.
- [ ] Progress hashes filled in; lessons written into the later tasks they change.
- [ ] Not a declared stop — phase 2 opens.

---

### Phase 2 — Capture

#### Task 4: `captureIfDue` and the quiet timers

**Requirement:** 3, 4

**Why:** The whole rule lives in one function with three callers, so "when does a snapshot happen" has one answer; retention is one statement beside it.

**Now** — `—` (new module). The pieces it reads:

```ts
// src/main/valuesChanged.ts:27-43 — path→id over the live tree; inverted here at fire time
export function liveIdIndex(root: string): Map<string, string>
// src/main/settings.ts:63-65 — the live personalization the readers below narrow
export const readLivePersonalization = async (root: string): Promise<Personalization>
// src/main/IO/pageFile.ts:27 — the body the dedupe hashes
export function splitEnvelope(content: string): PageEnvelope
// src/shared/identity.ts — the kind mark; only 'P' captures
```

**Becomes** — one module, one exported rule, four entry points:

```ts
// src/main/CRUD/fileHistory.ts (new) + fileHistory.test.ts
export const HISTORY_DAYS = { min: 7, max: 90, default: 90 } as const
export const HISTORY_INTERVAL = { min: 5, max: 20, default: 5 } as const   // minutes
export const SNAPSHOT_MAX_BYTES = 1_048_576

export interface FileHistoryConfig {
  enabled: boolean
  intervalMs: number
  days: number
}
export async function readFileHistory(root: string): Promise<FileHistoryConfig>
// fileHistory !== false → enabled; historyDays / historyInterval clamped into their ranges

/** The one rule. Offered text is whole-file; the body it splits to is what dedupes. Returns
 *  whether a row landed. Never throws — a failed insert logs and answers false. */
export function captureIfDue(
  root: string,
  pageId: string,
  text: string,
  source: SnapshotSource,
  opts?: { ungated?: boolean },
): Promise<boolean>
// gate: source === 'restore' || opts.ungated || lastTs(pageId) === undefined || now - lastTs ≥ intervalMs
// then: enabled · kindOf(pageId) === 'page' · text.length ≤ SNAPSHOT_MAX_BYTES ·
//       hash(splitEnvelope(text).body) ≠ hash(latestSnapshot(pageId).body) → addSnapshot

/** The body writer's report: the text it overwrote and the text it wrote. Offers the outgoing
 *  text — ungated when it isn't what Pommora last wrote here — records the written body's hash,
 *  and arms the quiet timer. */
export function noteBodyWritten(root: string, absPath: string, previous: string | null, written: string): void

/** The watcher's report of a foreign edit: arms the quiet timer with source 'external'. */
export function noteExternalEdit(root: string, absPath: string): void

/** Nexus switch and quit: offer every armed page ungated, then forget everything. */
export async function flushFileHistory(root: string): Promise<void>
export function resetFileHistory(): void   // both maps, every timer

export async function sweepFileHistory(root: string): Promise<void>
// sweepSnapshots(db, Date.now() - days * DAY)
```

```ts
// module state — the gate map, the last-written map, the timers; all cleared by resetFileHistory
const lastTs = new Map<string, number>()          // pageId → ts of the latest row, seeded lazily
const lastWritten = new Map<string, string>()     // absPath → hash of the body updatePageBody wrote
const timers = new Map<string, { source: SnapshotSource; timer: NodeJS.Timeout }>()   // pageId
// a timer fires: invert liveIdIndex(root) → the id's one path (two paths, or none → disarm) →
//   read the file (fail → nothing) → captureIfDue(root, id, text, source)
```

**Assumed by:** Task 5 (the callers), Task 6 (restore's ungated capture).

**Verify — automated**

- [ ] Red first, `fileHistory.test.ts` against a scratch root with a real `versions.db` and a seeded live tree: first offer on a page captures; a second inside the interval doesn't; one after it does; identical body never adds; a text over the cap never adds; a Task id (`T` mark) never adds; `noteBodyWritten` with a `previous` whose body hash ≠ `lastWritten` captures ungated; with a matching hash and inside the interval, doesn't; a quiet timer fires once after the interval with the file's current text, and a second `noteBodyWritten` inside the interval resets it (fake timers); `flushFileHistory` captures an armed page at once and `resetFileHistory` leaves no timer; an id the tree no longer holds disarms; an id two paths claim disarms; `readFileHistory` clamps `historyDays: 200` to 90 and `historyInterval: "5"` to the default; `sweepFileHistory` removes rows older than `days`. Expect ~14 failures, module not found; then green.
- [ ] Both halves of the gate: the "inside the interval" case is asserted red with the gate bypassed (`ungated: true` adds a row), so the guard is proven to be what refuses.
- [ ] Full gate green.

**Verify — user**

- [ ] *(none.)*


#### Task 5: The callers — the body handler, the watcher, the open path, the switch

**Requirement:** 3, 4

**Why:** Capture happens where the app already knows a body changed; nothing new observes the file system.

**Now** — `rg -F "updatePageBody(" src/main/index.ts` → 1 · `rg -F "case 'page-upsert'" src/main/watchPatch.ts` → 1 · `rg -F "closeSessionDb()" src/main` → 2 (re-derive):

```ts
// src/main/index.ts:1102-1108
        const r = await updatePageBody(resolved.value, body)
        if (!r.ok) return r
        await indexWrittenPage(root, resolved.value)
        noteValueWrite(root, resolved.value)
        pushValueChanges(root)
        return ok(null)
```

```ts
// src/main/watchPatch.ts:245-247
    case 'page-upsert':
      await indexWrittenPage(root, join(root, c.rel))
      return patchPageFromDisk(root, c.rel)
```

```ts
// src/main/index.ts:364-378 — the open sequence: openSession → prepareOpenedNexus →
//   replayPendingRename → openSessionDb → (root changed) dropLiveTree → runOpenRecord/refreshTree
//   → seedContentIndex → …
// src/main/index.ts:1584-1600 — 'personalization:set' writes then reacts per key
```

**Becomes**

```ts
// src/main/index.ts — 'page:updateBody'
        const r = await updatePageBody(resolved.value, body)
        if (!r.ok) return r
        await indexWrittenPage(root, resolved.value)
        noteValueWrite(root, resolved.value)
        pushValueChanges(root)
        noteBodyWritten(root, resolved.value, r.value, body)   // after the Result is settled
        return ok(null)
```

```ts
// src/main/watchPatch.ts
    case 'page-upsert':
      await indexWrittenPage(root, join(root, c.rel))
      noteExternalEdit(root, join(root, c.rel))
      return patchPageFromDisk(root, c.rel)
```

```ts
// src/main/index.ts — openNexusSequence, after openSessionDb(root) when root !== priorRoot
      void sweepFileHistory(root)
// before openSession(path) when priorRoot !== null:
      await flushFileHistory(priorRoot); resetFileHistory()
// app 'before-quit' beside the existing close: await flushFileHistory(root) best-effort
// 'personalization:set': if (key === 'historyDays') void sweepFileHistory(root)
```

**Verify — automated**

- [ ] Red first, `index`-level integration in `fileHistory.test.ts` (or the existing IPC harness if one covers `page:updateBody`): a `page:updateBody` on a page with no history lands one row holding the pre-edit text; a second save 400 ms later lands none; the watcher's `page-upsert` on that page arms a timer that fires with source `external`. Expect 3 failures; then green.
- [ ] A Nexus switch test: arm a page, switch roots, the old root's store holds the row and the new root's holds none.
- [ ] Full gate green.
- [ ] `rg -F "noteBodyWritten(" src/main` → 2 (definition + handler). Control: `rg -F "noteValueWrite(" src/main` → ≥ 5.

**Verify — user**

- [ ] *(none — the Declared Stop at Gate 4 is where capture is seen through the window.)*


#### Gate 2 — snapshots land without anyone asking

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked.
- [ ] Every Now count re-run against its control.
- [ ] Every task that diverged had its dependents rewritten.
- [ ] Simplification and review dispatched against `<base>..HEAD` scoped to `src/main/CRUD/fileHistory.ts`, `src/main/index.ts`, `src/main/watchPatch.ts`; the reports cite files inside it.
- [ ] Every concern fixed, or carrying a ruling in the Log.
- [ ] A dev instance restarted against a scratch Nexus: type in a page, wait, `sqlite3 .nexus/versions.db 'select page_id, ts, source from snapshots'` shows rows; the main log shows no `full-refresh` walk per save.
- [ ] Progress hashes filled in.
- [ ] Not a declared stop — phase 3 opens.

---

### Phase 3 — The contract and the settings

#### Task 6: The history channels, the push, the row menu, the confirms

**Requirement:** 5

**Why:** The renderer reaches snapshots only through the bridge; restore and delete are main-side acts that validate by id, and both confirms are native.

**Now** — `rg -F "'trash:list'" src/shared/bridge.ts src/preload/index.ts src/main/index.ts` → 3 (the template triple) · `rg -F "showMessageBox(" src/main` → 9:

```ts
// src/shared/bridge.ts:268-269
  'trash:list': { args: []; reply: Result<TrashRow[]> }
  'trash:menu': { args: [ctx: TrashMenuContext]; reply: TrashMenuAction | null }
// src/shared/bridge.ts:366
  'open-in-preview': ContextTarget
// src/preload/index.ts:123-124
  listTrash: ask('trash:list'),
  trashMenu: ask('trash:menu'),
// src/preload/index.ts:177
  onOpenInPreview: on('open-in-preview'),
// src/main/index.ts:967-973 — the exclusions confirm, one of nine inline showMessageBox sites
          const { response } = await dialog.showMessageBox(win, {
            type: 'warning',
            buttons: ['Clear', 'Cancel'],
            defaultId: 1,
            cancelId: 1,
            ...clearConfirmCopy(excluded.length),
          })
          if (response !== 0) return ok(null)
```

**Becomes**

```ts
// src/shared/types.ts
export type SnapshotSource = 'edit' | 'external' | 'restore'   // moved here from versionsDb.ts
export interface SnapshotRow { ts: number; source: SnapshotSource }
```

```ts
// src/shared/fileHistoryMenu.ts (new) + fileHistoryMenu.test.ts
export type FileHistoryMenuAction = { kind: 'restore' } | { kind: 'delete' }
export interface FileHistoryMenuContext {
  /** More than one row is checked — Delete acts on the set and Restore is withheld. */
  batch: boolean
}
export function fileHistoryMenuLabels(batch: boolean): { restore: string; delete: string }
// { restore: 'Restore', delete: batch ? 'Delete All' : 'Delete' }
```

```ts
// src/main/fileHistoryMenu.ts (new) — on popTrashMenu's shape
export function popFileHistoryMenu(win: BrowserWindow, ctx: FileHistoryMenuContext): Promise<FileHistoryMenuAction | null>
// batch → Delete All only; else Restore, separator, Delete
```

```ts
// src/main/confirm.ts (new)
/** One native confirm: the affirmative verb is button 0, Cancel is the default and the escape. */
export async function confirmDialog(
  win: BrowserWindow,
  verb: string,
  message: string,
  detail: string,
): Promise<boolean>
```

```ts
// src/shared/bridge.ts — Asks
  'history:list': { args: [pageId: string]; reply: Result<SnapshotRow[]> }
  'history:read': { args: [pageId: string, ts: number]; reply: Result<string> }        // the body
  // Captures the current text first (source 'restore'), then runs the body write's own tail.
  // Answers the page's resolved path — the renderer's target path may be stale across a rename.
  'history:restore': { args: [pageId: string, ts: number]; reply: Result<{ path: string }> }
  'history:delete': { args: [pageId: string, ts: number[]]; reply: Result<number> }
  // `null` is a cancelled dialog; a count is a clear that ran.
  'history:clear': { args: []; reply: Result<number | null> }
  'history:menu': { args: [ctx: FileHistoryMenuContext]; reply: FileHistoryMenuAction | null }
  'history:confirm': { args: [kind: 'restore' | 'delete', count: number]; reply: boolean }
// Pushes
  'open-history': ContextTarget
```

```ts
// src/preload/index.ts
  listHistory: ask('history:list'),
  readSnapshot: ask('history:read'),
  restoreSnapshot: ask('history:restore'),
  deleteSnapshots: ask('history:delete'),
  clearHistory: ask('history:clear'),
  historyMenu: ask('history:menu'),
  confirmHistory: ask('history:confirm'),
  onOpenHistory: on('open-history'),
```

```ts
// src/main/index.ts — handlers
'history:list'     envelope · sessionVersionsDb() ?? fail('operation-failed', 'File History is unavailable.')
'history:read'     envelope · readSnapshot(db, pageId, ts) → splitEnvelope(text).body; null → not-found
'history:restore'  envelope · path = inverted liveIdIndex(root).get(pageId) → not-found when absent;
                   current = readFile(abs); captureIfDue(root, pageId, current, 'restore');
                   body = splitEnvelope(readSnapshot(...)).body; updatePageBody(abs, body);
                   indexWrittenPage; noteValueWrite; pushValueChanges; lastWritten[abs] = hash(body);
                   ok({ path: rel })
'history:delete'   envelope · ok(deleteSnapshots(db, pageId, ts))
'history:clear'    window, self-wrapped try/catch · confirmDialog(win, 'Clear', 'Clear File History?',
                   'Every snapshot on this device will be deleted. This cannot be undone.') → ok(clearSnapshots(db)) | ok(null)
'history:menu'     menu · popFileHistoryMenu
'history:confirm'  window · confirmDialog with the ratified copy:
   restore → ('Restore', 'Restore this snapshot?', 'Restoring this snapshot will replace the current version of this file. The overwritten version will remain recoverable as a snapshot.')
   delete, count 1 → ('Delete', 'Delete this snapshot?', 'Deleting this snapshot will permanently delete it from history. This cannot be undone.')
   delete, count n → ('Delete', `Delete ${n} snapshots?`, 'Deleting these snapshots will permanently delete them from history. This cannot be undone.')
```

The exclusions confirm stays inline; sweeping the nine onto `confirmDialog` is Sequenced After.

**Assumed by:** Task 7 (`history:clear` behind the clear row), Task 8 (the push), Task 9 (list/read/menu/confirm), Task 10 (restore's answer).

**Verify — automated**

- [ ] Red first, `fileHistoryMenu.test.ts`: labels for batch and single; the shared model has no third action. Expect 2 failures; then green.
- [ ] Handler tests against a scratch root: `history:read` on a `ts` belonging to another page answers `not-found`; `history:restore` on a renamed page (target path stale, id live) restores and answers the new path; `history:restore` writes a `restore` row holding the pre-restore text before the body changes; `history:delete` answers the count. Red, then green.
- [ ] `serveBridge` compiles — a declared channel without a handler is a type error, and the reverse.
- [ ] Full gate green.
- [ ] `rg -F "'open-history'" src` → 3 (bridge, preload, contextMenu after Task 8 — at this task, 2). Control: `rg -F "'open-in-preview'" src` → 3.

**Verify — user**

- [ ] *(none — Gate 4 shows the confirms.)*


#### Task 7: The File History settings section

**Requirement:** 6

**Why:** The three knobs Nathan named, on the roster every other setting rides, with the device-wide clear beside them.

**Now** — `rg -F "hoverPreviewLinger" src/shared/types.ts src/main/readNexus.ts src/renderer/Settings/SettingsWindow.tsx` → 4 (the numeric-key trail) · `rg -F "ClearExclusionsRow" src/renderer` → 3 · `rg -F "kind: 'zoom'" src/renderer/Settings/SettingsWindow.tsx` → 3 (the row type + two rosters; re-derive):

```ts
// src/shared/types.ts:151-152
  /** Whole seconds (1–30). Absent = None: only the short pointer-travel grace. */
  hoverPreviewLinger?: number
// src/main/readNexus.ts:143
    hoverPreviewLinger: coerceHoverLinger(p.hoverPreviewLinger),
```

```tsx
// src/renderer/Settings/SettingsWindow.tsx:115-120 — the numeric typeable picker, percent-only today
  | (RowText & {
      kind: 'zoom'
      key: KeyOf<number>
      fallback: number
      steps?: readonly number[]
    })
// :744-770 — ZoomRow: stepsWith(steps, stored).map(percentChoice); typeable text/suffix '%';
//   a typed value clamps into [steps[0], steps[last]]
// :104-106
  | (RowText & { kind: 'clear-exclusions' })
// :685-686
    case 'clear-exclusions':
      return <ClearExclusionsRow label={row.label} hint={row.hint} />
```

```tsx
// src/renderer/Settings/ClearExclusionsRow.tsx:14-24 — the label flip, skipped on a null reply
    void window.nexus.clearExclusions().then((r) => {
      if (!r.ok) { void window.nexus.showError(r.error.message); return }
      if (r.value === null) return
      setDone(true)
      window.setTimeout(() => setDone(false), 1500)
    })
```

**Becomes**

```ts
// src/shared/types.ts — Personalization
  /** Absent = on. Off stops capture; the store and the History window stay readable. */
  fileHistory?: boolean
  /** Days a snapshot is kept, 7–90. Absent = 90. */
  historyDays?: number
  /** Minutes between snapshots of one page, 5–20. Absent = 5. */
  historyInterval?: number
// the interface's header comment: "a new toggle is a field here, a readPersonalization row, and
// an apply-map row where it has a DOM effect"
```

```ts
// src/shared/types.ts — beside coerceHoverLinger
export function clampInt(v: unknown, min: number, max: number): number | undefined
// non-number → undefined (the default) · else Math.round clamped into [min, max]
// src/main/readNexus.ts
    fileHistory: p.fileHistory === false ? false : undefined,
    historyDays: clampInt(p.historyDays, HISTORY_DAYS.min, HISTORY_DAYS.max),
    historyInterval: clampInt(p.historyInterval, HISTORY_INTERVAL.min, HISTORY_INTERVAL.max),
// HISTORY_DAYS / HISTORY_INTERVAL move to src/shared/types.ts so both processes read one source
```

```tsx
// src/renderer/Settings/SettingsWindow.tsx — the zoom row gains a unit; percent is the default
type NumberUnit = { label: (n: number) => string; suffix: string; parse: (typed: string) => number }
const PERCENT: NumberUnit   // the current ZoomRow behavior, verbatim
const DAYS: NumberUnit      // label `${n} Days`, suffix 'days', parse = Number.parseInt
const MINUTES: NumberUnit   // label `${n} Min`, suffix 'min', parse = Number.parseInt
  | (RowText & {
      kind: 'zoom'
      key: KeyOf<number>
      fallback: number
      steps?: readonly number[]
      unit?: NumberUnit       // absent = PERCENT
    })
  | (RowText & {
      kind: 'clear'
      action: () => Promise<Result<unknown | null>>   // null = nothing ran; the label flips otherwise
    })
```

```tsx
// src/renderer/Settings/SettingsWindow.tsx — Files & Links, a new section after Deletion
      {
        title: 'File History',
        rows: [
          { kind: 'toggle', key: 'fileHistory', label: 'File History', hint: 'Keeps snapshots of every page as it is edited, on this device.', defaultOn: true },
          { kind: 'zoom', key: 'historyDays', label: 'History Timeframe', hint: 'How long a snapshot is kept before it is pruned.', fallback: HISTORY_DAYS.default, steps: [7, 14, 30, 60, 90], unit: DAYS },
          { kind: 'zoom', key: 'historyInterval', label: 'Snapshot Interval', hint: 'The least time between two snapshots of one page.', fallback: HISTORY_INTERVAL.default, steps: [5, 10, 15, 20], unit: MINUTES },
          { kind: 'clear', label: 'Clear History', hint: 'Deletes every snapshot on this device.', action: () => window.nexus.clearHistory() },
        ],
      },
// the Exclusions section's row becomes
          { kind: 'clear', label: 'Clear Exclusion Cache', hint: '…unchanged…', action: () => window.nexus.clearExclusions() },
```

```tsx
// src/renderer/Settings/ClearActionRow.tsx (renamed from ClearExclusionsRow.tsx)
export function ClearActionRow({ label, hint, action }: { label: string; hint: string; action: () => Promise<Result<unknown | null>> }): React.JSX.Element
// same body: a destructive Button, 'Clear' → 'Cleared' for 1500 ms on a non-null ok
```

**Assumed by:** Task 4 reads the keys through `readFileHistory` (already written against these names).

**Verify — automated**

- [ ] Red first, `readNexus.test.ts`: `historyDays: 200` reads 90, `historyInterval: "5"` reads absent, `fileHistory: false` reads false and `fileHistory: 'no'` reads absent. Expect 3 failures; then green.
- [ ] `ExclusionRows.test.tsx` (or its successor) keeps the exclusions clear's behavior: null → no flip; a report → Cleared for 1500 ms.
- [ ] Full gate green; the `RowControl` switch compiles with the new kind and without the old.
- [ ] `rg -F "ClearExclusionsRow" src` → 0 · `rg -F "clear-exclusions" src` → 0. Control: `rg -F "ClearActionRow" src` → ≥ 3.

**Verify — user**

- [ ] *(carried to Gate 4: the section reads as the mock's fourth block of Files & Links.)*


#### Gate 3 — the contract holds, the knobs write

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked.
- [ ] Every Now count re-run against its control.
- [ ] Every task that diverged had its dependents rewritten.
- [ ] Simplification and review dispatched against `<base>..HEAD` scoped to `src/shared`, `src/preload`, `src/main/index.ts`, `src/main/confirm.ts`, `src/main/fileHistoryMenu.ts`, `src/main/readNexus.ts`, `src/renderer/Settings`; the reports cite files inside it.
- [ ] Every concern fixed, or carrying a ruling in the Log.
- [ ] Progress hashes filled in.
- [ ] Not a declared stop — phase 4 opens.

---

### Phase 4 — The surface

#### Task 8: View History in every page menu, History in the page Settings menu

**Requirement:** 7

**Why:** The window is reachable from wherever a page is, through the one shared menu model and the one shared router, so no surface can drift.

**Now** — `rg -F "PAGE_CLIPBOARD_ACTIONS" src/shared/pageMenu.ts` → 3 · `rg -F "runPageSendAction(" src/renderer` → 5 (definition + 4 callers) · `rg -F "reveal: true" src` → 3 (`contextMenu.ts`, `pageMetaMenuSubset`, and re-derive):

```ts
// src/shared/pageMenu.ts:24-35 — PageMetaAction has no history member
// :70-84
export const PAGE_CLIPBOARD_ACTIONS = ['title:copylink', 'title:copypath'] as const satisfies readonly PageClipboardAction[]
export type PageSendAction = PageClipboardAction | typeof PAGE_MOVE_ROW
const PAGE_SEND_ACTIONS = [PAGE_MOVE_ROW, ...PAGE_CLIPBOARD_ACTIONS] as const satisfies readonly PageSendAction[]
// :90-96 — opts: { preview?, newPages?, move?, clipboard?, reveal? }
// :120-127 — Reveal Location, separatorBefore: !opts.clipboard && !opts.move
// :140-148 — pageMetaMenuSubset passes { preview, newPages: 'pair', move, clipboard, reveal }
```

```ts
// src/main/contextMenu.ts:148-154 — the sidebar's opts; :112-113 the push case
// src/renderer/Actions/pageMenuActions.ts:22-36 — runPageSendAction routes move/copylink/copypath
// src/renderer/Frames/PageMenu.tsx:58-65 — one MenuItem, Properties
// src/shared/pageMenu.test.ts:15-26 — the full-menu order asserted verbatim
```

**Becomes**

```ts
// src/shared/pageMenu.ts
export type PageMetaAction = … | 'title:history' | …   // inserted before 'title:reveal'
/** What a surface that only points at a page can offer: its link, its path, its history. */
export type PageReachAction = Extract<PageMetaAction, 'title:copylink' | 'title:copypath' | 'title:history'>
export const PAGE_REACH_ACTIONS = ['title:copylink', 'title:copypath', 'title:history'] as const satisfies readonly PageReachAction[]
export type PageSendAction = PageReachAction | typeof PAGE_MOVE_ROW
// PAGE_SEND_ACTIONS = [PAGE_MOVE_ROW, ...PAGE_REACH_ACTIONS]; pageSendActions() returns the reach
// block where nothing is offered to send to. PageClipboardAction / PAGE_CLIPBOARD_ACTIONS are
// renamed, not kept beside.
// opts gains history?: boolean; the row, above Reveal, its own group:
    ...(opts.history ? [{ label: 'View History', action: 'title:history' as const, separatorBefore: true }] : []),
    ...(opts.reveal ? [{ label: 'Reveal Location', action: 'title:reveal' as const, separatorBefore: !opts.history && !opts.clipboard && !opts.move }] : []),
// pageMetaMenuSubset passes history: true
```

```ts
// src/main/contextMenu.ts — opts gain history: true; the switch gains
      case 'title:history':
        return push(win, 'open-history', target)
// src/shared/cellMenu.ts:132 and cardMenu.ts:34 — opts gain history: true
```

```ts
// src/renderer/Actions/pageMenuActions.ts
export function runPageSendAction(action: string, path: string): boolean
  if (action === 'title:history') {
    const page = pagesOf(useSession.getState().tree!).find((p) => p.path === path)
    if (page) useSession.getState().openHistory({ id: page.id, path })
    return true
  }
```

```tsx
// src/renderer/Frames/PageMenu.tsx — a second MenuItem beside Properties; no FrameSlide pane
      <MenuItem leading={<Icon name="history" size={ICON.rootEntry} />} onClick={() => openHistory({ id: pageDetail.id, path: pageDetail.path })}>
        History
      </MenuItem>
// FOOTER_ACTIONS unchanged
```

`openHistory` is Task 9's; this task lands after it in the commit order (Task 9 first, then 8), or the two commit together.

**Assumed by:** Task 9 (`openHistory`, the push subscription).

**Verify — automated**

- [ ] Red first, `pageMenu.test.ts`: the full-menu order gains `'title:history'` between `'title:copypath'` and `'title:reveal'`; History opens its own group (`separatorBefore: true`); Reveal's separator is false when History precedes it; a subset of `['title:history']` alone drops the leading separator; `pageSendActions({})` returns the three reach actions. Expect 5 failures (the first as an inverted existing assertion); then green.
- [ ] `cellMenu.test.ts` / `cardMenu.test.ts` / `tabMenu` / `navRowMenu` model tests: each menu carries `'title:history'`. Red, then green.
- [ ] Full gate green — `TabMenuAction` and `NavRowMenuAction` widen through `PageSendAction`, and `runPageSendAction`'s four callers compile unchanged.
- [ ] `rg -F "PAGE_CLIPBOARD_ACTIONS" src` → 0 · `rg -F "PageClipboardAction" src` → 0. Control: `rg -F "PAGE_REACH_ACTIONS" src` → ≥ 2.

**Verify — user**

- [ ] *(carried to Gate 4: View History above Reveal Location on a sidebar row, a table title cell, a card, a tab, a nav row; History beside Properties in the page Settings menu.)*


#### Task 9: `PageHistoryWindow`

**Requirement:** 8

**Why:** The one place snapshots are seen and acted on, on the chassis the Page Window already uses, shaped by Nathan's mock.

**Now** — `rg -F "<PageWindow />" src/renderer/App.tsx` → 1 · `rg -F "windowId: 'preview-inspector'" src/renderer` → 1:

```ts
// src/renderer/Store/previewSlice.ts:23-59 — PreviewTarget; PER_NEXUS = { navOpen, preview, previewsFile, previewSlide }
// src/renderer/Windows/PageWindow.tsx:162-213 — WindowBase id="page-preview", title=<WindowTabStrip … <NavTrail segments={trail} selected/>>,
//   right={{ windowId: 'preview-inspector', bounds: WINDOW_BASE_INSPECTOR, mode: 'overlay', open, children }}
// src/renderer/App.tsx:126-130 — onOpenInPreview → openPreview({ id, path }); :286 — <PageWindow />
// src/renderer/Settings/TrashFrame.tsx:290-341 — TrashRowView: MenuItem with a Checkbox overlay, a trailing caption, onContextMenu → menu
// src/renderer/Links/ConnectionPane.tsx:34 — HOVER_ANCESTORS = ['hover-card']; a two-deep chain renders embeds inert
// src/renderer/MarkdownPM/index.tsx:103 — readOnly; :459 — initialBody is the seed
```

**Becomes**

```ts
// src/renderer/Store/previewSlice.ts
  historyTarget: PreviewTarget | null      // in PER_NEXUS as null
  openHistory: (target: PreviewTarget) => void
  closeHistory: () => void
```

```tsx
// src/renderer/App.tsx
  useEffect(() => window.nexus.onOpenHistory((t) => { if (t.id) openHistory({ id: t.id, path: t.path }) }), [openHistory])
      {status === 'ready' && <PageHistoryWindow />}
```

```tsx
// src/renderer/Windows/PageHistoryWindow.tsx (new) + page-history-window.css (new)
export function PageHistoryWindow(): React.JSX.Element | null
// useExitPresence over historyTarget, as PageWindow does over preview
// WindowBase id="page-history" · ariaLabel="Page History" · title={<NavTrail segments={ancestryOf(tree, {kind:'page', id})} selected />}
//   · no onScan, no actions, no footer · right={{ windowId: 'page-history-list', bounds: WINDOW_BASE_INSPECTOR, mode: 'overlay', open: true, children: <HistoryList …/> }}
// state: rows: SnapshotRow[] | null · checked: ReadonlySet<number> (ts) · shown: number | null (the last-checked ts; null = Current Version) · highlighted: number | null
// refresh(): window.nexus.listHistory(id) → rows; prune checked to live ts; run at open and after every action
// body: readSnapshot(id, shown) (or the current page body through fetchPageDetail when shown === null) →
//   <MarkdownEditor key={`${target.path}:${shown ?? 'current'}`} initialBody={text} readOnly onChange={() => {}} embedAncestors={['page-history', target.path]} />
// rows: <HistoryRowView> — MenuItem, overlay <Checkbox size="compact" state={checked.has(ts)} onChange={toggle}/>,
//   label 'Current Version' | 'Untitled Snapshot', subLabel <span>{date}</span><span className={segment}/><span>{time}</span>,
//   trailing: checked && ts !== null ? <Button size="button-inline" icon="trash" type="destructive" title="Delete" onClick={deleteChecked}/> : undefined,
//   selected={highlighted === ts}, onClick → highlight only, onContextMenu → menu
//   the Current Version row first, <MenuSeparator/> after it
// foot: <Button label="Restore" type="tinted" disabled={shown === null || checked.size !== 1} onClick={restore}/>
// restore(): if (!(await window.nexus.confirmHistory('restore', 1))) return; await restoreSnapshot(target, shown) [Task 10]; refresh()
// deleteChecked(): confirmHistory('delete', checked.size) → deleteSnapshots(id, [...checked]) → refresh()
// menu(row): window.nexus.historyMenu({ batch: checked.size > 1 && checked.has(row.ts) }) → 'restore' → restore with shown = row.ts · 'delete' → the checked set or the row
```

Dates: `formatDate(new Date(ts).toISOString(), dateFormat, 'none')` and `formatDate(…, dateFormat, nexusClock)`'s clock half, split the way TrashFrame formats its `when`; the hairline between them is the `segment` style from `DesignSystem/Elements/Segment`.

**Assumed by:** Task 8 (`openHistory`), Task 10 (`restoreSnapshot` is the renderer half this window calls).

**Verify — automated**

- [ ] Red first, a `pageHistoryWindow.test.tsx` on the row model: Current Version never shows the trash glyph; a checked snapshot does; Restore is disabled for Current Version and for two checks; the shown body follows the last check and returns to Current Version when nothing is checked; a row click changes only the highlight. Expect 5 failures; then green.
- [ ] Full gate green.
- [ ] `rg -F "id=\"page-history\"" src/renderer` → 1. Control: `rg -F "id=\"page-preview\"" src/renderer` → 1.

**Verify — user**

- [ ] *(the Declared Stop: the window against the mock.)*


#### Task 10: Restore's renderer half, the shared warm fence, the re-seed

**Requirement:** 9

**Why:** A restore has to reach every editor holding the page, or the next keystroke in a stale one writes the old body back over the file the restore just wrote.

**Now** — `rg -F "readCache(" src/renderer` → 2 · `rg -F "tileWarmSeam(" src/renderer` → 2 · `rg -F "readWindowCache(" src/renderer` → 3 (re-derive):

```ts
// src/renderer/SurfacePM/tileCache.ts:13-27 — restore() compares entry.editorState.doc with readPageDetail(path)?.body; skips when fresh is undefined
// src/renderer/Interface/PageView.tsx:118,168-175 — key={pageDetail.path}; restore() fences by path only; capture writes pageDetail with now.body
// src/renderer/Windows/useWindowWarm.ts:20-29 — restore() has no fence
// src/renderer/SurfacePM/PageTile.tsx:61-66 — useState initializer seeds from warm doc or readPageDetail
// src/renderer/Store/tabState.ts:49-53 — cachePageDetail creates-or-updates; :80-83 writeThroughBody updates only
// src/renderer/Store/navigationSlice.ts:234-241 — patchReadyAt by detail.path; :357 setPageBody
// src/renderer/Interface/pageFlush.ts:23-26 — flushPageSave(path)
```

**Becomes**

```ts
// src/renderer/Store/tabState.ts
/** One fence for every warm seam: an entry whose doc no longer matches the page's fresh body is
 *  dead. With no fresh body known the entry stands — a cold-detail embed keeps its warmth. */
export function fenceWarm<E extends { editorState?: unknown }>(entry: E | undefined, fresh: string | undefined): E | undefined
// tileCache.restore → fenceWarm(entry, readPageDetail(path)?.body) (its delete stays)
// PageView.restore   → fenceWarm(entry?.pageDetail?.path === path ? entry : undefined, slot.body)
// useWindowWarm.restore → fenceWarm(readWindowCache(id), readPageDetail(activePath)?.body)

/** A body replaced from outside the editor — restore today, the watcher later. Refreshes the
 *  detail slot and tells every host of `path` to re-seed. */
export function replaceBody(path: string, body: string): void
// cachePageDetail({ ...(readPageDetail(path) ?? await-free minimal), body }) — the caller passes the
// detail it holds; then bump epoch(path) and notify
export function useBodyEpoch(path: string): number   // useSyncExternalStore over a per-path counter
```

```ts
// src/renderer/Interface/restoreSnapshot.ts (new)
/** The renderer half of a restore: land the page's pending save, ask main, then re-seed every
 *  host at the path main answers with. */
export async function restoreSnapshot(target: PreviewTarget, ts: number): Promise<Result<null>>
// await flushPageSave(target.path)
// const r = await window.nexus.restoreSnapshot(target.id, ts); if (!r.ok) return r
// const detail = await fetchPageDetail(r.value.path)   // dropPageDetail first so it refetches
// useSession.getState().setPageBody(r.value.path, detail.body)
// replaceBody(r.value.path, detail.body)
```

```tsx
// src/renderer/Interface/PageView.tsx
      <MarkdownEditor key={`${pageDetail.path}:${useBodyEpoch(pageDetail.path)}`} …
// src/renderer/SurfacePM/PageTile.tsx
  const epoch = useBodyEpoch(path)
  useEffect(() => { if (epoch === 0) return; const d = readPageDetail(path); if (d) setLoaded(entryFrom(path, d)) }, [epoch, path])
```

**Verify — automated**

- [ ] Red first, `tabState.test.ts`: `fenceWarm` returns the entry when docs match, `undefined` when they differ, the entry when `fresh` is undefined; `replaceBody` bumps the path's epoch and `useBodyEpoch` observes it. Expect 4 failures; then green.
- [ ] A React test on `PageTile` (jsdom, the real component with `MarkdownEditor` stubbed): after `replaceBody(path, 'RESTORED')`, the tile's seeded body is `'RESTORED'`; the warm entry captured by the outgoing editor is fenced off. Red, then green.
- [ ] `useWindowWarm`: a cached entry whose doc differs from the fresh detail is not restored. Red, then green.
- [ ] The existing warm-seam tests (`TabState.test.ts`, `TileCache.test.ts`, `windowTabs.test.ts`) stay green unmodified.
- [ ] Full gate green.
- [ ] Crossing test: restore on a page open in the main pane *and* the Page Window at once — both show the restored body and a keystroke in the window saves the restored text plus the keystroke, never the pre-restore body (drive over CDP at the Declared Stop against a throwaway page).

**Verify — user**

- [ ] *(the Declared Stop: restore lands in every open surface.)*


#### Gate 4 — the surface, on screen — **Declared Stop**

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked.
- [ ] Every Now count re-run against its control.
- [ ] Every task that diverged had its dependents rewritten.
- [ ] Simplification and review dispatched against `<base>..HEAD` scoped to `src/renderer` and `src/shared/pageMenu.ts`, `src/main/contextMenu.ts`; the reports cite files inside it.
- [ ] Every concern fixed, or carrying a ruling in the Log.
- [ ] A dev instance restarted; the acceptance sequence driven over CDP against a throwaway page in Nathan's Nexus, read-only screenshots of: the sidebar menu with View History, the page Settings menu with History, the window with three snapshots and the current version, a checked row with its trash glyph, the restore confirm, the delete confirm, the File History section.
- [ ] Progress hashes filled in.
- [ ] **Execution halts here.** Nathan closes:
  - [ ] The window matches the mock: the trail title, the close × alone, the list in the right slot, Current Version behind its divider, the checkbox rows, the date-hairline-time caption, the trash glyph on a checked row, Restore's two inactive states.
  - [ ] Both confirms read as ratified.
  - [ ] The File History section reads right, the pickers accept a typed value, Clear History flips to Cleared.
  - [ ] View History sits above Reveal Location in every right-click menu; History beside Properties.

---

### Phase 5 — The record

#### Task 11: The documents

**Requirement:** 10

**Why:** Every sentence the feature made false is rewritten where it stands, and the feature has its own doc.

**Now** — the Made False table; `rg -F "FileHistoryPM" .claude` → 0.

**Becomes** — `.claude/Features/FileHistoryPM.md` (new): the capture rule in prose, the store and its lifetime, the window and its actions, the settings, what is out of scope, Known Issues (the two-host lost update as a pointer to Context) and Pending (external-edit reload, diff view, per-device store files, a git provider, per-snapshot titles, reverse deltas). Each Made False row rewritten as currently true; ContextPM's Known Issues gain the two-host lost update and the accepted repository tracking of `versions.db`; CLAUDE.md's Codebase Map gains the `FileHistoryPM.md` line.

**Verify — automated**

- [ ] `rg -F "Versioning, file history, backup" .claude/Features` → 0 · `rg -F "Git as opt-in content history" .claude/Features` → 0 · `rg -F "Four windows mount it" .claude/Features` → 0. Control: `rg -F "FileHistoryPM" .claude` → ≥ 3.
- [ ] Every Made False row's replacement sentence present in its doc.

**Verify — user**

- [ ] The docs read as the encyclopedic guide the Studio wants, not as notes.


#### Gate 5 — closeout

- [ ] Simplification, then the comment pass, then code review over the whole range `<phase-1 base>..HEAD`.
- [ ] Delivery Claim written; the neutral verifier run against the spec and the range; then the build-breaking agent against the range.
- [ ] Every finding fixed or carrying a ruling.
- [ ] Dead Vocabulary sweep at zero against its control.
- [ ] Context and Handoff current; the History entry written to its format.
- [ ] The final +/- line count, comments and tests excluded, in the report.

---

## Implementation Log

### Progress

- [ ] **Phase 1** — The store and the writer · base `<commit>`
  - [ ] Task 1 — `versions.db` behind the driver seam · `<commit>`
  - [ ] Task 2 — `writePageFile` returns and refuses · `<commit>`
  - [ ] Task 3 — the watcher ignores `.nexus/*.db*` · `<commit>`
- [ ] **Phase 2** — Capture
  - [ ] Task 4 — `captureIfDue` and the quiet timers · `<commit>`
  - [ ] Task 5 — the callers · `<commit>`
- [ ] **Phase 3** — The contract and the settings
  - [ ] Task 6 — the history channels, the push, the row menu, the confirms · `<commit>`
  - [ ] Task 7 — the File History settings section · `<commit>`
- [ ] **Phase 4** — The surface *(Declared Stop)*
  - [ ] Task 9 — `PageHistoryWindow` · `<commit>`
  - [ ] Task 8 — View History and History · `<commit>`
  - [ ] Task 10 — restore's renderer half, the fence, the re-seed · `<commit>`
- [ ] **Phase 5** — The record
  - [ ] Task 11 — the documents · `<commit>`

### Rulings

- 09-02-2026, Nathan: pages only; the store stays tracked by NexusOS's repository, no `.gitignore`; trash recovery keeps history; a row click highlights only, a check selects; the trash glyph replaces a foot-left Delete; the numeric settings ride the existing typeable picker; a small shared confirm helper for the two new dialogs; View History routed in `runPageSendAction`.

### Open Against Later Tasks

### Deviations

### Lessons

### Sequenced After

- The watcher's `page-upsert` driving `replaceBody` — the external-edit reload that closes the lost-update Known Issue.
- The nine inline `showMessageBox` sites onto `confirmDialog`.
- Per-snapshot titles (an additive column; the row label already leaves the room).
- A diff view on `@codemirror/merge`, serving the trash compare view too.
- Per-device store files with union reads; a git provider as a second store module.

### Closeout

---

## Completion Criteria

**The directive**

```
Execute File History — Implementation Plan. Live.
Live-verify: the History window against the mock at Gate 4 (Declared Stop); restore landing in every open surface.
Screenshots: Gate 4 — the sidebar menu, the page Settings menu, the window with snapshots, a checked row with its glyph, both confirms, the settings section.
Pings: at the Gate 4 stop · at completion.
Record: History arc "PM-124 || File History".
Also: the tree is shared with a parallel session — stage explicit paths only; a dev instance must restart for main and preload changes.
Everything else is the standard below.
```

**The Standard**

- **The bar.** Not doing the chores — doing the laundry, folding it, picking up what fell out of the hamper, emptying the lint trap, leaving no trace that anything went wrong. A future review of this arc finds nothing to correct.
- **Only the live confirmation may be pending.** No concerns carried, no "for a later session," no deferrals when the fix is known and could be done now. Where an item genuinely can't get there, the Log names which and why, and everything else is still finished.
- **Reusability first.** Search before writing. A second resolver, cache, or validator means the plan is wrong, or you are — log it before proceeding. Duplication is debt.
- **Fix at the source**, never down-river; leave a unified thing rather than stitched pieces. Add code only where it repairs something flawed or makes things simpler.
- **Ambiguity:** take the simplest reading, record it under Rulings or Deviations, continue. Execution does not stop for input except at the Declared Stop.
- **Per phase:** implement → simplify → comment pass → gates, exit codes read directly and never piped → code review → attack review → every finding fixed or carrying a defensible ruling → commit → ping. Simplification before review, never inverted. "Done with concerns" is unfinished work, and a result nobody watched happen is not a result.
- **Comments** only where the why can't be inferred. **Docs** stay clean and non-bloated; what went false gets rewritten, not amended. Unattributed doc or style edits mid-run belong to the user — fold them into the commit at hand, never revert them.

**Then tick these.**

**The deliverable**

- [ ] Every numbered requirement traces to a landed task.
- [ ] The acceptance criterion observed running, clause by clause.
- [ ] No capture on the autosave path costs a SQLite read outside the interval; no `full-refresh` walk per snapshot.
- [ ] A refused `writePageFile` leaves the file byte-identical.

**The passes**

- [ ] Simplification and the comment pass over the whole range, not only per phase.
- [ ] Simplification → code review over the full implementation in that order.
- [ ] Delivery Claim written, then checked by a neutral verifier against the decision log.
- [ ] Every finding from every pass fixed, or carrying a defensible ruling.

**The user's own pass** *(the only thing allowed to be outstanding)*

- [ ] The History window on the Mac against the mock; restore in the main pane, the Page Window, and an embed at once; both confirms; the settings section; View History in every menu.

**The record**

- [ ] Documents made false rewritten in the commits that falsified them.
- [ ] The closing sweep at zero against its control.
- [ ] Context and Handoff current; the History entry written to its format.
- [ ] Lessons routed; successor work named in Sequenced After.

**The report**, in plain English — what shipped and why it matters · what happened along the way worth knowing · what any screenshot showed and what changed because of it · every gate's real output · in-flight decisions, a sentence or two each · what's left for the live pass · final +/- line count, comments and tests excluded. Honest about what didn't work.
