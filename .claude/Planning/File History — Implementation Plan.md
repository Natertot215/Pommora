## File History — Implementation Plan

> **Status:** written, pending review · Spec: [[File History — Decision Log]] · Execute tasks in order.
> Citations name files and symbols at HEAD `af6f28a5`; re-derive before editing. The tree is shared with a parallel session that is retiring the native confirms (uncommitted at writing: `Windows/ConfirmationWindow.tsx`, `Windows/confirmations.ts`, `askConfirm` on `chromeSlice`) — line numbers are landmarks, symbol names and the greps are the truth, and every Now count is re-derived after that work lands.

**Goal**

A page accumulates snapshots while it is edited, without the user doing anything: the text on disk before an edit lands, the settled text after a burst goes quiet, one more each interval inside a long burst, and the text a foreign writer left whenever Pommora is about to overwrite it. Every page reachable by right-click carries **View History**, and the page's Settings menu carries **History**; both open one floating window on the Page Window's chassis that lists the page's snapshots beside a read-only render of the checked one. **Restore** replaces the body alone, capturing the current text first so the act is reversible from the same list; a trash glyph on a checked row deletes. Settings › Files & Links gains a **File History** section: an On/Off toggle, a timeframe (7–90 days, default 90), an interval (5–20 minutes, default 5), and a destructive Clear History for the device. Snapshots older than the timeframe are pruned at open. A page deleted to `.trash` keeps its history for its return.

The shape: one device-local SQLite file, `.nexus/versions.db`, behind the existing driver seam, holding whole-file text compressed with Node's `zlib`, keyed by page `ID` and timestamp; one capture function in main holding the whole rule, offered by the body writer after its write, by a per-page quiet timer the writer and the watcher arm, on Nexus switch, and by restore; a store module rather than a provider interface, so a later git provider is a second module behind a switch. Files-per-snapshot was rejected on storage (a 1:100 history ratio over NexusOS is ~31,000 small files and ~290 MB against ~100 MB of compressed rows); a table in `nexus.db` was rejected because that file is disposable by design; git-first was rejected because a phone can't run it and NexusOS is already the user's own repository. Settled by Nathan on 09-02-2026 across the decision log's rulings.

Bounded by: recovery is body-only, by construction — the one restore path writes through the body writer; pages only, filtered by the ULID kind mark; Homepage and Space blocks and tiles never reach the hook; system rewriters (cascade, sweeps, adoption, remint) never capture; snapshots are frozen text; `nexus.db` is untouched; no new dependency; the window's visual pass follows Nathan's mock and stops for his eye. This plan does not fix the in-app two-host lost update (a page open in two Pommora surfaces overwriting each other) — it records it and seeds the mechanism.

**Requirements**

1. `.nexus/versions.db` opens through `openDb` with an integrity check that quarantines a damaged file by renaming it and its `-wal`/`-shm` siblings, never deleting; one table `snapshots(page_id, ts, source, blob)`, `CREATE TABLE IF NOT EXISTS` re-applied on open, no version row; the module exposes add, latest, list, read, delete, clear, sweep. The file ignores the watcher through one `.nexus`-scoped `.db*` clause in `ignoredUnder`.
2. `writePageFile` returns the text it overwrote; a read failure other than a missing file refuses the write rather than rewriting the page from empty frontmatter.
3. `captureIfDue(root, pageId, text, source)` holds the whole rule: the File History toggle, the interval gate on an in-memory `Map<pageId, lastTs>`, the foreign-overwrite exception on `Map<path, bodyHash>` fed by the one body-write path, dedupe by the body `splitEnvelope` returns against the latest snapshot, a 1 MB size cap, synchronous once the text is in hand, best-effort after the write's `Result` is settled. One `writeBody(root, abs, body, source)` is the body-write path both the autosave and restore take. Per-page quiet timers armed by the writer and by the watcher's `page-upsert`, resolved to a path at fire time through one memoized `livePathOf(root, id)`, disarming an id the tree no longer holds or two paths claim; both maps and every timer clear where the store closes; a Nexus switch or rename offers every armed page ungated first. The three `Personalization` keys land with the rule, clamped on read.
4. Retention is one age-bounded `DELETE`, run at open and from the settings write when `historyDays` shrinks.
5. Channels `history:list`, `history:read`, `history:restore`, `history:delete`, `history:clear`, `history:menu`, and the push `open-history`; restore is `writeBody` with source `restore` and answers with the page's resolved path; every read, restore, and delete validates the snapshot against the page id and resolves the page by id. **[pending Nathan's ruling]** the confirms are either the parallel session's in-app `ask(request)` seam or native dialogs behind a `history:confirm` channel.
6. A **File History** section on Files & Links: toggle, two numeric typeable pickers on the `zoom` row kind given a unit, and a destructive Clear History whose label flips to **Cleared** for 1500 ms behind the same confirm the exclusions clear uses; `ClearExclusionsRow` generalizes to `ClearActionRow` on whatever shape the parallel session leaves it.
7. The shared page menu gains **View History** as `opts.history`, directly above Reveal Location with its own separator, riding the send block so every consumer that reaches a page — sidebar row, tab, nav row, card, title cell — offers it, routed once in `runPageSendAction`; the page Settings menu gains a **History** row beside Properties; both open the window.
8. `PageHistoryWindow` on `WindowBase` with the page's location trail as its title, no toolbar band, the close × alone; a read-only `MarkdownEditor` rendering the checked snapshot (Current Version when none is checked) with a two-deep ancestors chain so its embeds render inert; the list in an overlay right slot: **Current Version** first behind a divider, then **Untitled Snapshot** rows with a leading checkbox and a caption of the Nexus's date then a hairline then its time; a row click highlights only, a check selects the target; a trash glyph trails a checked snapshot row and deletes every checked row; **Restore** at the foot-right, inactive for Current Version, dimmed for a multi-check; both actions behind native confirms with the ratified copy; a right-click pops the same two actions; the list refetches after every action.
9. Restore's renderer half: flush the page's pending save, call main, then refresh the detail slot and the navigation slot's body with the restored text at the resolved path, and re-seed every host of that path — `PageView` by re-keying its editor, `PageTile` by an effect resetting its seed — through one `bodyReplaced(path)` signal; the three warm seams share one fence comparing the cached doc against a fresh body handed in, keeping the entry when none is known.
10. Every document the change falsifies is rewritten in the commit that falsifies it, carried by the Made False table; `FileHistoryPM.md` is written; the two Known Issues land in Context.

**Acceptance — the whole thing working:** In a scratch Nexus with File History on at a 5-minute interval, open a page, type a paragraph, wait past the interval without typing, type a second paragraph, then edit the same file from a text editor outside Pommora while the page stays open, then type a third paragraph in Pommora. Right-click the page's sidebar row › View History: the window opens with Current Version first and at least three snapshots beneath — the pre-edit text, the settled first paragraph, and the external editor's text captured before Pommora overwrote it — each rendering read-only when checked, embeds inert. Check the external one, Restore, confirm: the open editor shows the external text, the file on disk holds it with its frontmatter untouched, and the list now carries one more snapshot holding the three-paragraph text. Check two rows, the trash glyph, confirm: both gone from the list and from `versions.db`. Settings › Files & Links › File History › Clear History › Clear: the label reads Cleared and the window lists Current Version alone. Delete the page to `.trash` and restore it: its history is back. Throughout, `rg -c "full-refresh"` in the main log stays unmoved by captures.

**Forced By**

- `serializeOnFile` is non-reentrant and the capture must not delay the write → `updatePageBody` reads the outgoing text inside its lock and returns it; the caller offers it after the `Result` is settled (Tasks 2, 5, 6).
- `PickerControl` already carries `typeable` and the `zoom` row already clamps a typed number into its steps → the two numeric settings ride `zoom` with a unit; no new row kind, no type widening (Tasks 4, 7).
- `PreviewTarget` is renderer-only; the wire carries `ContextTarget` → `open-history` pushes a `ContextTarget` and `App.tsx` adapts it as `open-in-preview` does (Tasks 6, 9).
- The parallel session's confirm work is uncommitted and touches `index.ts`, `bridge.ts`, `preload`, `ClearExclusionsRow`, `PageMenu.tsx`'s footer → phase 3 does not open until it lands or is reverted, and Tasks 6 and 7 re-derive against it (Hazard Window).

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

**Shapes:** additive (the store, the capture, the channels, the settings, the window) · fix (`writePageFile`'s read failure; the sibling sweep is its two callers in `CRUD/page.ts`) · refactor (`ClearExclusionsRow` → `ClearActionRow`; the `zoom` row's unit — behavior preserved, proven by the existing tests) · additive on the warm seams (`useWindowWarm` gains a fence it never had; `PageView` flushes a live-body timer it never flushed) · user-visible (the window, the menu rows, the section) · live data (the Declared Stop runs against Nathan's Nexus over CDP, read-only screenshots and a throwaway page only).

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

**Hazard Window:** Opened by the parallel session's uncommitted confirm work; while open, no task of this plan edits `src/main/index.ts`, `src/shared/bridge.ts`, `src/preload/index.ts`, `src/renderer/Settings/ClearExclusionsRow.tsx`, or `src/renderer/Frames/PageMenu.tsx`. Closed when that work is committed (or reverted) and Tasks 6 and 7 are re-derived against HEAD. Phases 1 and 2 touch none of those files except `index.ts` (Task 5), which therefore also waits.

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
// SnapshotSource and SnapshotRow are declared once, in src/shared/types.ts (the wire needs them)

/** Open `.nexus/versions.db`. A file that won't open, or fails `PRAGMA quick_check`, is renamed
 *  with its -wal and -shm siblings to `versions.db.corrupt-<ISO stamp>` and a fresh one opened.
 *  Never deletes. null ⇒ no history this session. */
export function openVersionsDb(nexusRoot: string): Db | null
// DDL: CREATE TABLE IF NOT EXISTS snapshots (page_id TEXT NOT NULL, ts INTEGER NOT NULL,
//   source TEXT NOT NULL, blob BLOB NOT NULL, PRIMARY KEY (page_id, ts))

export function addSnapshot(db: Db, pageId: string, ts: number, source: SnapshotSource, text: string): void
// text → zlib deflateSync → blob; INSERT OR REPLACE — a same-millisecond capture supersedes
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

- [ ] Red first, `versionsDb.test.ts` on a scratch dir: add/latest/list/read round-trip through zlib; dedupe is the caller's, so two adds with equal text are two rows; `deleteSnapshots` returns the count and leaves other pages alone; `sweepSnapshots` removes only rows older than the cutoff; a same-`ts` add replaces; a garbage header → `openVersionsDb` returns a live handle on a fresh file and the `.corrupt-` triple exists; interior corruption past 4096 bytes → same; a file with a hot `-wal` quarantines all three names. Expect 8 failures, module not found; then green.
- [ ] `openSessionDb` on a root with no `.nexus/versions.db` creates it; `closeSessionDb` closes both handles (`session.test.ts` gains one case).
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

#### Task 4: `captureIfDue`, `writeBody`, and the quiet timers

**Requirement:** 3, 4

**Why:** The whole rule lives in one function, and the one body-write path every save and every restore take lives beside it, so "when does a snapshot happen" and "who writes a body" each have one answer; retention is one statement beside them.

**Now** — `—` (new module). The pieces it reads, and the keys it adds:

```ts
// src/main/valuesChanged.ts:27-43 — path→id over the live tree; flushValueWrites already rebuilds it per save
export function liveIdIndex(root: string): Map<string, string>
// src/main/settings.ts:54-65 — liveLeaves serves the tree's personalization synchronously when a tree is installed
// src/main/IO/pageFile.ts:27 — splitEnvelope; src/shared/identity.ts — the kind mark; only 'P' captures
// src/shared/types.ts:151-152 — hoverPreviewLinger?: number, the numeric-key precedent
// src/main/readNexus.ts:143 — hoverPreviewLinger: coerceHoverLinger(p.hoverPreviewLinger)
// src/shared/cropGeometry.ts:13 — clamp(v, min, max)
```

**Becomes**

```ts
// src/shared/types.ts
export type SnapshotSource = 'edit' | 'external' | 'restore'
export interface SnapshotRow { ts: number; source: SnapshotSource }
export const HISTORY_DAYS = { min: 7, max: 90, default: 90 } as const
export const HISTORY_INTERVAL = { min: 5, max: 20, default: 5 } as const   // minutes
// Personalization gains:
  /** Absent = on. Off stops capture; the store and the History window stay readable. */
  fileHistory?: boolean
  /** Days a snapshot is kept, 7–90. Absent = 90. */
  historyDays?: number
  /** Minutes between snapshots of one page, 5–20. Absent = 5. */
  historyInterval?: number
// the interface's header comment reads: a new key is a field here, a readPersonalization row, and an
// apply-map row where it has a DOM effect
export function clampInt(v: unknown, min: number, max: number): number | undefined
// non-finite → undefined · else clamp(Math.round(v), min, max) through cropGeometry's clamp
```

```ts
// src/main/readNexus.ts — readPersonalization
    fileHistory: p.fileHistory === false ? false : undefined,
    historyDays: clampInt(p.historyDays, HISTORY_DAYS.min, HISTORY_DAYS.max),
    historyInterval: clampInt(p.historyInterval, HISTORY_INTERVAL.min, HISTORY_INTERVAL.max),
```

```ts
// src/main/valuesChanged.ts
/** The one path an id holds in the live tree; null when absent or claimed twice (a Finder copy
 *  shares its twin's ID until the next open's remint). Memoized per tree object. */
export function livePathOf(root: string, id: string): string | null
```

```ts
// src/main/CRUD/fileHistory.ts (new) + fileHistory.test.ts
export const SNAPSHOT_MAX_BYTES = 1_048_576

/** The one rule. Offered text is whole-file; the body it splits to is what dedupes. Synchronous
 *  once the text is in hand. Never throws — a failed insert logs and answers false. */
export function captureIfDue(root: string, pageId: string, text: string, source: SnapshotSource): boolean
// gate: source === 'restore' || lastTs(pageId) === undefined || now - lastTs ≥ intervalMs
// then: enabled · kindOf(pageId) === 'page' · text.length ≤ SNAPSHOT_MAX_BYTES ·
//       hash(splitEnvelope(text).body) ≠ hash(latestSnapshot(pageId).body) → addSnapshot
// config read synchronously off the live tree's personalization (liveLeaves), defaults when absent

/** THE body write. Locks, reads the outgoing text, writes, re-indexes, notes and pushes the value
 *  change, then offers the outgoing text — ungated when it is not what Pommora last wrote here
 *  (a foreign writer landed) or when `source` is 'restore' — records the written body's hash, and
 *  arms the quiet timer. The autosave and restore are its two callers. */
export async function writeBody(root: string, absPath: string, body: string, source: 'edit' | 'restore'): Promise<Result<null>>

/** The watcher's report of a foreign edit: arms the quiet timer with source 'external'. */
export function noteExternalEdit(root: string, absPath: string): void

/** Nexus switch, rename, and quit: offer every armed page ungated, then forget everything. */
export async function flushFileHistory(root: string): Promise<void>
export function resetFileHistory(): void   // both maps, every timer

export function sweepFileHistory(root: string): void   // sweepSnapshots(db, Date.now() - days * DAY)
```

```ts
// module state — the gate map, the last-written map, the timers; all cleared by resetFileHistory
const lastTs = new Map<string, number>()          // pageId → ts of the latest row, seeded lazily
const lastWritten = new Map<string, string>()     // absPath → hash of the body writeBody wrote
const timers = new Map<string, { source: SnapshotSource; timer: NodeJS.Timeout }>()   // pageId
// a timer fires: livePathOf(root, id) → null disarms → read the file (fail → nothing) →
//   captureIfDue(root, id, text, source)
```

**Assumed by:** Task 5 (the callers), Task 6 (restore is `writeBody(…, 'restore')`), Task 7 (the section's keys).

**Verify — automated**

- [ ] Red first, `fileHistory.test.ts` against a scratch root with a real `versions.db` and a seeded live tree: first offer on a page captures; a second inside the interval doesn't; one after it does; identical body never adds; a text over the cap never adds; a Task id (`T` mark) never adds; `writeBody` whose outgoing body hash ≠ `lastWritten` captures ungated; with a matching hash and inside the interval, doesn't; `writeBody(…, 'restore')` captures ungated and then writes; a quiet timer fires once after the interval with the file's current text, and a second `writeBody` inside the interval resets it (fake timers); `flushFileHistory` captures an armed page at once and `resetFileHistory` leaves no timer; an id the tree no longer holds disarms; an id two paths claim disarms (`livePathOf` → null); `fileHistory: false` captures nothing; `sweepFileHistory` removes rows older than `days`. Expect ~15 failures, module not found; then green.
- [ ] `readNexus.test.ts`: `historyDays: 200` reads 90, `historyInterval: "5"` reads absent, `fileHistory: false` reads false and `fileHistory: 'no'` reads absent. Red, then green.
- [ ] Both halves of the gate: the "inside the interval" case is asserted to add a row with source `'restore'`, so the gate is proven to be what refuses.
- [ ] Full gate green.

**Verify — user**

- [ ] *(none.)*


#### Task 5: The callers — the body handler, the watcher, the open path, the switch and rename

**Requirement:** 3, 4

**Why:** Capture happens where the app already knows a body changed; nothing new observes the file system, and the autosave handler shrinks to a call.

**Now** — `rg -F "updatePageBody(" src/main/index.ts` → 1 · `rg -F "case 'page-upsert'" src/main/watchPatch.ts` → 1 · `rg -F "await rename(root, newRoot)" src/main/index.ts` → 1 (re-derive after the hazard window closes):

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
// src/main/index.ts:364-378 — openNexusSequence: openSession → prepareOpenedNexus → replayPendingRename → openSessionDb → …
// src/main/index.ts:1885-1888 — the nexus root rename: await rename(root, newRoot); … await adoptNexus(newRoot, false)
// src/main/index.ts:1584-1600 — 'personalization:set' writes then reacts per key
```

**Becomes**

```ts
// src/main/index.ts — 'page:updateBody'
        return writeBody(root, resolved.value, body, 'edit')
```

```ts
// src/main/watchPatch.ts
    case 'page-upsert':
      await indexWrittenPage(root, join(root, c.rel))
      noteExternalEdit(root, join(root, c.rel))
      return patchPageFromDisk(root, c.rel)
```

```ts
// src/main/index.ts
// openNexusSequence, before openSession(path) when priorRoot !== null:  await flushFileHistory(priorRoot); resetFileHistory()
// openNexusSequence, after openSessionDb(root) when root !== priorRoot:  sweepFileHistory(root)
// the nexus root rename, before `await rename(root, newRoot)`:          await flushFileHistory(root); resetFileHistory()
// app 'before-quit', beside the existing close:                          await flushFileHistory(root)   // best-effort
// 'personalization:set':                                                  if (key === 'historyDays') sweepFileHistory(root)
```

**Verify — automated**

- [ ] `fileHistory.test.ts` already proves the write path; this task's proof is wiring: the watcher test (`watchPatch.test.ts`) asserts a `page-upsert` arms a timer with source `external` (red, then green), and a Nexus-switch test arms a page, switches roots, and finds the old root's store holding the row and the new root's holding none.
- [ ] Full gate green.
- [ ] `rg -F "writeBody(" src/main` → 3 (definition, the handler, restore's handler after Task 6 — at this task, 2). Control: `rg -F "noteValueWrite(" src/main` → ≥ 5.

**Verify — user**

- [ ] *(none — the Declared Stop at Gate 4 is where capture is seen through the window.)*


#### Gate 2 — snapshots land without anyone asking

- [ ] Gate commands green, exit codes read directly.
- [ ] Every task's **Verify — automated** list ticked.
- [ ] Every Now count re-run against its control.
- [ ] Every task that diverged had its dependents rewritten.
- [ ] Simplification and review dispatched against `<base>..HEAD` scoped to `src/main/CRUD/fileHistory.ts`, `src/main/valuesChanged.ts`, `src/main/readNexus.ts`, `src/shared/types.ts`, `src/main/index.ts`, `src/main/watchPatch.ts`; the reports cite files inside it.
- [ ] Every concern fixed, or carrying a ruling in the Log.
- [ ] A dev instance restarted against a scratch Nexus: type in a page, wait, `sqlite3 .nexus/versions.db 'select page_id, ts, source from snapshots'` shows rows; the main log shows no `full-refresh` walk per save.
- [ ] Progress hashes filled in.
- [ ] Not a declared stop — phase 3 opens.

---

### Phase 3 — The contract and the settings

#### Task 6: The history channels, the push, the row menu, the confirms

**Requirement:** 5

**Why:** The renderer reaches snapshots only through the bridge; restore and delete are main-side acts that validate by id, and both confirms are native.

**Now** — `rg -F "'trash:list'" src/shared/bridge.ts src/preload/index.ts src/main/index.ts` → 3 (the template triple) · `rg -F "showMessageBox(" src/main` → 9 at `af6f28a5`, 1 in the parallel session's working copy (re-derive after the hazard window closes):

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
// src/main/rowMenu.ts:81 — popModelMenu<A extends string>(win, items): the one native popper for a flat model
```

**Becomes**

```ts
// src/shared/types.ts
export type SnapshotSource = 'edit' | 'external' | 'restore'   // moved here from versionsDb.ts
export interface SnapshotRow { ts: number; source: SnapshotSource }
```

```ts
// src/shared/fileHistoryMenu.ts (new)
export type FileHistoryMenuAction = 'restore' | 'delete'
/** More than one row is checked — Delete acts on the set and Restore is withheld. */
export function fileHistoryMenuItems(batch: boolean): ActionItem<FileHistoryMenuAction>[]
// batch → [{ label: 'Delete All', action: 'delete' }]
// else  → [{ label: 'Restore', action: 'restore' }, { label: 'Delete', action: 'delete', separatorBefore: true }]
```

```ts
// src/main/index.ts — 'history:menu' is one line over the existing model popper (main/rowMenu.ts:81)
'history:menu'     menu · popModelMenu(win, fileHistoryMenuItems(ctx.batch))
```

**Confirms — pending Nathan's ruling (the parallel session is retiring native confirms):**

- *In-app (recommended, if that work lands):* two entries in `src/renderer/Windows/confirmations.ts` — `restoreSnapshot: ConfirmRequest` and `deleteSnapshots(count): ConfirmRequest` with the ratified copy, plus `clearHistory: ConfirmRequest` — called through its `ask()`; `history:clear` is a plain `envelope` answering `Result<number>`; no `history:confirm`, no `confirm.ts`.
- *Native (if that work is reverted):* `src/main/confirm.ts` with `confirmDialog(win, verb, message, detail)`, a `history:confirm` channel `{ args: [kind: 'restore' | 'delete', count: number]; reply: boolean }`, and `history:clear` as a self-wrapped `window` handler answering `Result<number | null>`.

```ts
// src/shared/bridge.ts — Asks
  'history:list': { args: [pageId: string]; reply: Result<SnapshotRow[]> }
  'history:read': { args: [pageId: string, ts: number]; reply: Result<string> }        // the body
  // Captures the current text first (source 'restore'), then runs the body write's own tail.
  // Answers the page's resolved path — the renderer's target path may be stale across a rename.
  'history:restore': { args: [pageId: string, ts: number]; reply: Result<{ path: string }> }
  'history:delete': { args: [pageId: string, ts: number[]]; reply: Result<number> }
  'history:clear': { args: []; reply: Result<number> }      // shape per the confirm ruling above
  'history:menu': { args: [ctx: { batch: boolean }]; reply: FileHistoryMenuAction | null }
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
  onOpenHistory: on('open-history'),
```

```ts
// src/main/index.ts — handlers
'history:list'     envelope · sessionVersionsDb() ?? fail('operation-failed', 'File History is unavailable.')
'history:read'     envelope · readSnapshot(db, pageId, ts) → splitEnvelope(text).body; null → not-found
'history:restore'  envelope · rel = livePathOf(root, pageId) → not-found when null;
                   body = splitEnvelope(readSnapshot(db, pageId, ts)).body → not-found when null;
                   r = await writeBody(root, abs, body, 'restore'); r.ok ? ok({ path: rel }) : r
'history:delete'   envelope · ok(deleteSnapshots(db, pageId, ts))
'history:clear'    per the confirm ruling · ok(clearSnapshots(db))
```

The ratified copy, wherever the confirm lives: restore — "Restore this snapshot?" / "Restoring this snapshot will replace the current version of this file. The overwritten version will remain recoverable as a snapshot." · delete, one — "Delete this snapshot?" / "Deleting this snapshot will permanently delete it from history. This cannot be undone." · delete, n — "Delete n snapshots?" / "Deleting these snapshots will permanently delete them from history. This cannot be undone." · clear — "Clear File History?" / "Every snapshot on this device will be deleted. This cannot be undone."

The `SnapshotRow` type and the `HISTORY_*` constants already sit in `shared/types.ts` from Task 4.

**Assumed by:** Task 7 (`history:clear` behind the clear row), Task 8 (the push), Task 9 (list/read/menu and the confirms), Task 10 (restore's answer).

**Verify — automated**

- [ ] The handler logic that isn't a one-liner is `writeBody` (Task 4, tested there) and `readSnapshot` (Task 1, tested there); this task's proof is the wiring: a scratch-root test through the preload-less `serveBridge` map asserts `history:read` on a `ts` belonging to another page answers `not-found`, and `history:restore` on a renamed page (target path stale, id live) answers the new path. Red, then green.
- [ ] Full gate green.
- [ ] `rg -F "'open-history'" src` → 3 (bridge, preload, contextMenu after Task 8 — at this task, 2). Control: `rg -F "'open-in-preview'" src` → 3.

**Verify — user**

- [ ] *(none — Gate 4 shows the confirms.)*


#### Task 7: The File History settings section

**Requirement:** 6

**Why:** The three knobs Nathan named, on the roster every other setting rides, with the device-wide clear beside them.

**Now** — `rg -F "ClearExclusionsRow" src/renderer` → 3 at `af6f28a5` (re-derive: the parallel session reshaped it around `ask(clearExclusions(n))`) · `rg -F "kind: 'zoom'" src/renderer/Settings/SettingsWindow.tsx` → 3:

```tsx
// src/renderer/Settings/SettingsWindow.tsx:115-120 — the numeric typeable picker, percent-only today
  | (RowText & { kind: 'zoom'; key: KeyOf<number>; fallback: number; steps?: readonly number[] })
// :744-770 — ZoomRow: choices = stepsWith(steps, stored).map(percentChoice); typeable text = String(Math.round(stored * 100)),
//   suffix '%', commit clamps parseFloat(written)/100 into [steps[0], steps[last]]
// :104-106, :685-686 — kind 'clear-exclusions' → <ClearExclusionsRow label hint />
```

**Becomes**

```tsx
// src/renderer/Settings/SettingsWindow.tsx — the zoom row gains a unit; percent stays the default
/** How a numeric row shows and reads its value: the stored number times `scale` is what the
 *  field shows and the suffix follows it. Percent: scale 100, '%'. Days: scale 1, 'days'. */
type NumberUnit = { scale: number; suffix: string; label: (shown: number) => string }
const PERCENT: NumberUnit = { scale: 100, suffix: '%', label: (n) => `${n}%` }
const DAYS: NumberUnit = { scale: 1, suffix: 'days', label: (n) => `${n} Days` }
const MINUTES: NumberUnit = { scale: 1, suffix: 'min', label: (n) => `${n} Min` }
  | (RowText & { kind: 'zoom'; key: KeyOf<number>; fallback: number; steps?: readonly number[]; unit?: NumberUnit })
  | (RowText & { kind: 'clear'; action: () => Promise<Result<unknown>>; confirm: ConfirmRequest })   // shape per the confirm ruling
// ZoomRow: the unit replaces percentChoice, the '%' literal, and the /100 — one row, no percent branch
```

```tsx
// src/renderer/Settings/SettingsWindow.tsx — Files & Links, a new section after Deletion
      {
        title: 'File History',
        rows: [
          { kind: 'toggle', key: 'fileHistory', label: 'File History', hint: 'Keeps snapshots of every page as it is edited, on this device.', defaultOn: true },
          { kind: 'zoom', key: 'historyDays', label: 'History Timeframe', hint: 'How long a snapshot is kept before it is pruned.', fallback: HISTORY_DAYS.default, steps: [7, 14, 30, 60, 90], unit: DAYS },
          { kind: 'zoom', key: 'historyInterval', label: 'Snapshot Interval', hint: 'The least time between two snapshots of one page.', fallback: HISTORY_INTERVAL.default, steps: [5, 10, 15, 20], unit: MINUTES },
          { kind: 'clear', label: 'Clear History', hint: 'Deletes every snapshot on this device.', action: () => window.nexus.clearHistory(), confirm: clearHistory },
        ],
      },
// the Exclusions section's row becomes the same kind, carrying the exclusions' action and confirm
```

```tsx
// src/renderer/Settings/ClearActionRow.tsx (renamed from ClearExclusionsRow.tsx)
export function ClearActionRow(props: RowOf<'clear'>): React.JSX.Element
// the landed body, generalized: ask(confirm) → action() → 'Clear' → 'Cleared' for 1500 ms on ok
```

**Verify — automated**

- [ ] `ExclusionRows.test.tsx` (or its successor after the parallel work) keeps the exclusions clear's behavior: a declined confirm → no action, no flip; ok → Cleared for 1500 ms. Red on the rename, then green.
- [ ] Full gate green.
- [ ] `rg -F "ClearExclusionsRow" src` → 0 · `rg -F "clear-exclusions" src` → 0 · `rg -F "percentChoice" src` → 0. Control: `rg -F "ClearActionRow" src` → ≥ 3.

**Verify — user**

- [ ] *(carried to Gate 4: the section reads as the mock's fourth block of Files & Links; a typed `45` in the timeframe reads `45 Days`.)*


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

`openHistory` is Task 9's; Task 9 commits first.

**Assumed by:** Task 9 (`openHistory`, the push subscription).

**Verify — automated**

- [ ] Red first, `pageMenu.test.ts`: the full-menu order gains `'title:history'` between `'title:copypath'` and `'title:reveal'`; History opens its own group (`separatorBefore: true`); Reveal's separator is false when History precedes it; a subset of `['title:history']` alone drops the leading separator; `pageSendActions({})` returns the three reach actions. Expect 5 failures (the first as an inverted existing assertion); then green.
- [ ] `cellMenu.test.ts` / `cardMenu.test.ts` / `tabMenu` / `navRowMenu` model tests: each menu carries `'title:history'`. Red, then green.
- [ ] Full gate green.
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

Dates: `formatDate(new Date(ts).toISOString(), dateFormat, 'none')` for the date and `clockOf(date, nexusClock)` for the time — `clockOf` (`formatValue.ts:47`) becomes an export; the hairline between them is the `segment` style from `DesignSystem/Elements/Segment`. The row model — which rows show the glyph, whether Restore is enabled, what is shown — is a pure function `historyRowModel(rows, checked, shown)` in `Windows/pageHistoryModel.ts`, the way `trashFrame.test.ts` tests `filterRows`.

**Assumed by:** Task 8 (`openHistory`), Task 10 (`restoreSnapshot` is the renderer half this window calls).

**Verify — automated**

- [ ] Red first, `pageHistoryModel.test.ts`: Current Version never shows the trash glyph; a checked snapshot does; Restore is enabled only for exactly one checked snapshot; the shown target follows the last check and returns to Current Version when nothing is checked. Expect 4 failures; then green.
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
// src/renderer/Interface/PageView.tsx:51,103-104 — liveTimer debounces setPageBody 120 ms and has no cleanup: slot.body can lag the doc at unmount
// src/renderer/Interface/PageView.tsx:118,168-175 — key={pageDetail.path}; restore() fences by path only; capture writes pageDetail with now.body
// src/renderer/Windows/useWindowWarm.ts:20-29 — restore() has no fence; activePath is a hook argument
// src/renderer/SurfacePM/PageTile.tsx:61-66 — useState initializer seeds from the warm doc or readPageDetail; the inner MarkdownEditor has no key
// src/renderer/Store/tabState.ts:64-78 — fetchPageDetail caches on landing; :85 dropPageDetail
// src/renderer/Store/navigationSlice.ts:357 — setPageBody; src/renderer/Interface/pageFlush.ts:23 — flushPageSave
```

**Becomes**

```ts
// src/renderer/Store/tabState.ts
/** One fence for every warm seam: an entry whose doc no longer matches the page's fresh body is
 *  dead. With no fresh body known the entry stands — a cold-detail embed keeps its warmth. */
export function fenceWarm(entry: WarmEntry | undefined, fresh: string | undefined): WarmEntry | undefined
// WarmEntry is warmSeam.ts's restore() return type
// tileCache.restore     → fenceWarm(entry, readPageDetail(path)?.body) (its delete stays)
// PageView.restore      → fenceWarm(entry?.pageDetail?.path === path ? entry : undefined, slot.body)
// useWindowWarm.restore → fenceWarm(readWindowCache(id), readPageDetail(activePath)?.body)   // activePath joins the memo deps

/** A body replaced from outside the editor — restore today, the watcher later. Every host of the
 *  path re-seeds from the detail slot in its next render. */
export function bumpBodyEpoch(path: string): void
export function useBodyEpoch(path: string): number   // useSyncExternalStore over a per-path counter
```

```ts
// src/renderer/Interface/restoreSnapshot.ts (new)
/** The renderer half of a restore: land the page's pending save, ask main, then re-seed every
 *  host at the path main answers with. */
export async function restoreSnapshot(target: PreviewTarget, ts: number): Promise<Result<null>>
// await flushPageSave(target.path)
// const r = await window.nexus.restoreSnapshot(target.id, ts); if (!r.ok) return r
// dropPageDetail(r.value.path); const detail = await fetchPageDetail(r.value.path)   // caches on landing
// if (detail) useSession.getState().setPageBody(r.value.path, detail.body)
// bumpBodyEpoch(r.value.path); return ok(null)
```

```tsx
// src/renderer/Interface/PageView.tsx — the epoch is read above the early returns; the live-body timer flushes on unmount
  const bodyEpoch = useBodyEpoch(slot?.status === 'ready' ? slot.detail.path : '')
  useEffect(() => () => { if (liveTimer.current) { clearTimeout(liveTimer.current); /* flush */ } }, [])
      <MarkdownEditor key={`${pageDetail.path}:${bodyEpoch}`} …
```

```tsx
// src/renderer/SurfacePM/PageTile.tsx — seed and key move together, in one render
  const epoch = useBodyEpoch(path)
  const [seed, setSeed] = useState(() => ({ epoch, entry: initialEntry(path, warm) }))
  if (seed.epoch !== epoch) setSeed({ epoch, entry: entryFrom(path, readPageDetail(path)) })   // adjust-during-render
  const entry = seed.entry?.path === path ? seed.entry : null
      <MarkdownEditor key={epoch} initialBody={body} …
```

**Verify — automated**

- [ ] Red first, `tabState.test.ts`: `fenceWarm` returns the entry when docs match, `undefined` when they differ, the entry when `fresh` is undefined; `bumpBodyEpoch` advances what `useBodyEpoch` reads. Expect 4 failures; then green.
- [ ] A React test on `PageTile` (jsdom, the real component with `MarkdownEditor` stubbed): after `cachePageDetail({…, body: 'RESTORED'})` and `bumpBodyEpoch(path)`, the tile's seeded body is `'RESTORED'` in the same commit as the key change; the warm entry captured by the outgoing editor is fenced off. Red, then green.
- [ ] `useWindowWarm`: a cached entry whose doc differs from the fresh detail is not restored. Red, then green.
- [ ] `PageView`: a pending live-body timer lands `setPageBody` on unmount (red without the cleanup).
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
  - [ ] Task 4 — `captureIfDue`, `writeBody`, the quiet timers, the three keys · `<commit>`
  - [ ] Task 5 — the callers, the switch, the rename · `<commit>`
- [ ] **Phase 3** — The contract and the settings
  - [ ] Task 6 — the history channels, the push, the row menu · `<commit>`
  - [ ] Task 7 — the File History settings section (UI) · `<commit>`
- [ ] **Phase 4** — The surface *(Declared Stop)*
  - [ ] Task 9 — `PageHistoryWindow` · `<commit>`
  - [ ] Task 8 — View History and History · `<commit>`
  - [ ] Task 10 — restore's renderer half, the fence, the re-seed · `<commit>`
- [ ] **Phase 5** — The record
  - [ ] Task 11 — the documents · `<commit>`

### Rulings

- 09-02-2026, Nathan: pages only; the store stays tracked by NexusOS's repository, no `.gitignore`; trash recovery keeps history; a row click highlights only, a check selects; the trash glyph replaces a foot-left Delete; the numeric settings ride the existing typeable picker; View History routed in `runPageSendAction`.
- **Open:** which confirm world phase 3 executes in — the parallel session's in-app `ask()` or native dialogs — and whether that work lands before phase 3 opens (Hazard Window).

### Open Against Later Tasks

### Deviations

### Lessons

### Sequenced After

- The watcher's `page-upsert` driving `replaceBody` — the external-edit reload that closes the lost-update Known Issue.
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
