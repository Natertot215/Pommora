### Wave Three — Both Ways

**DATE:** 11-08-2026
**RANGE:** `cae07c129..099c236ee` on `vc-chain`, 27 commits, read at the head in the chain worktree and at the base through `git show`.
**RAN:** every VERIFY grep of every task at the head (all print what the plan says); the Phase 11 `check-atlas` (exit 0); the comment count (3,492); `git diff --stat -- Core/Sync Sync` (empty); 14 suites over the fold-touched files, both boundary tests among them (308 tests, green); `git diff --name-status -M` against *§Placements*. No edits, no reverts, no mutation sweeps.

#### Fold Trace

| Fold | Holds | What's Left |
|---|---|---|
| W1-1 S1/A4 · Trash and the shell | Yes | `table-view.css:1` names TableView and ArchiveView; `ViewTypesPM.md:95` matches. See finding 7 for the file's name |
| W1-2 S2 · one `renameOf` | Yes | `ViewTile.tsx:329` is the one spelling; the pill (`:420`) and the list row (`:536`) both read it, the lock gate inside it |
| W1-3 S3 · `naming.landing` | Yes | `useViewHost.ts:117-126`; no flights set, no `NO_FLIGHTS` |
| W1-4 S4 · `commitGroupValue` | Yes | Lives in `useViewInteractions.tsx:151` alone; host return holds 36 keys at the head, 37 at 5-3's head, as VERIFY 5-3 says |
| W1-5 S5 · `shownLabel` | Yes | One helper, 12 call sites; none of the five fixed-noun names survive |
| W1-6 S7/A5 · dead exports | Yes | `SwitchEntry`, `CreateFlight`, `SetRef` declared without `export` |
| W1-7 S8/A5 · `viewRowMenuItems` | Yes | Private at `viewMenus.ts:100`; the test reads rows through `runViewRowAction`'s `pop` |
| W1-8 S9 · `orderSetTree` takes an empty order | Yes | `group.ts:71-77`; `resolveView.ts:44` and `ViewPane.tsx:95` pass `viewSetOrder(...)` straight |
| W1-9 S10 · `StableHandlers` | Yes | Exported from `stableApi.ts:3`, imported once |
| W1-10 S11 · one Titles signal | Yes | `ViewRowRun.titles?` at `viewMenus.ts:122`; no `titlesShown` on the context |
| W1-11 S12 · `useDisclosureSet`'s default | Yes | `DisclosureRow.tsx:17-20`; `LocationField.tsx:110` passes `tree.leads` |
| W1-12 S13 · `submitRename` clears nothing | Yes | `editSlice.ts:114-141` touches no fence state; `RenamableTitle.tsx` hands `cancelRename` as `onEnd` |
| W1-13 S14 · `ROOT_ROW_LOOK` | Yes | `frames.css.ts:28`; `cardsKind.ts` and `LayoutFrame.tsx` read it; no `CARD_ROW_LOOK` |
| W1-14 S15 · tests | Yes, one part superseded | `bandCommits.test.tsx` gone; `placeInShown` cases in `columns.test.ts`; the `MatrixMenu.test.tsx` `presentMenu` stub this fold restored was removed by W2-3, which the Wave Two ledger records |
| W1-15 A1 · drive label | Yes | `live-drive.mjs:1067` and `MATRIX.md:120` read "More actions" |
| W1-16 A2 · MATRIX rows | Yes | No `trash-head` under `.claude/scripts` |
| W1-17 A3 · band lead value | Yes | `GroupBand.tsx:144` reads `"band"`; the tile's `headLead` keys on `"head"` alone |
| W2-1 S1 · one label | Yes | `RenamableTitle` returns `RenamableName`; one `RenamableLabel` in the file |
| W2-2 S5 · `BandDrop` | Yes | `bandModel.ts:46`; the router and `bandZone.test.tsx` import it from the model |
| W2-3 S6 · `popOptions` | Yes | `PickerControl.tsx:42`, read at `:130` and `FilterFrame.tsx:88`; no `Choice`; `MatrixMenu.test.tsx` answers through `door.mockImplementationOnce` |
| W2-4 S7 · `forms` | Yes | Every `DateForms` local reads `forms`; `useViewHost.ts:63` calls `useDateForms()`; `useBandSource.ts:31` returns `{ painted, sets, heads }` |
| W2-5 S8 · `patchSeedValues` | Yes | No hit in Core |
| W2-6 S9 · `BundleTable` doc | Yes | `BundleTable.tsx:111` keeps the measuring clause |
| W2-7 S10 · `ViewWriter`, `open`, `renaming` | Yes | `views.ts:247`, five readers; `GroupBand.tsx:123` reads `open` with no `collapsed` local; `ViewFrame.tsx:274` reads `renaming` under an outer `editing` that means the open editor |

No fold left an old name beside the new, a caller unmoved, a test on the old shape, or a comment on the old shape; no later task re-spells one. Every *§Concepts* row I checked declares where it says, and no REMOVED name survives in production code, tests, documents, or drives.

#### Findings

1. **Medium — Comment Ledger, Phase 9 cell (plan line 43).** It says "`schema.css.ts`'s header arrives where `picker-base.css.ts`'s leaves." Neither file has a header: `picker-base.css.ts` opened on imports at the base, and `schema.css.ts` opens on imports at the head, its first comment at `:75` being `frames.css.ts:187`'s "A type editor's rows" doc, moved with its styles. The count's 0 is right; the words send an executor doing the ledger checks looking for two lines that never existed. **Fix:** "`frames.css.ts`'s type-editor doc moves to `schema.css.ts` with its styles; `frames.css.ts`'s header and `menu-base.css.ts`'s back-bar comment rewritten in place." **Verified:** read both files at base and head.
2. **Low — *§Placements*' test rule (plan line 286).** "A test file follows the file it tests" doesn't cover two moves `--name-status` shows: `Core/Tiles/Surfaces/ViewTile.test.ts → Core/Tiles/viewTileEntry.test.ts` while `ViewTile.tsx` stands, and `Core/Views/handlers.test.ts` deleted while `handlers.ts` stands (its one `describe` was `container:configure`). Both outcomes are right; the rule as written doesn't say so. **Fix:** "follows the code it tests" in place of "the file it tests." **Verified:** ran the diff; read the base test.
3. **Low — where the pins live (plan lines 237, 287, 830).** Plan Rules and *§Tests* send the executor to "a phase's *Notes*"; Task 10-1's VERIFY sends them to *Pins*, which is the one consolidated list with every revert spelled. **Fix:** cite *Pins* in all three. **Verified:** read.
4. **Low — *§Behavior Changes* numbering (plan lines 299-323).** 8a, 12a, 16a, and 20a sit beside whole numbers, 12 is missing, and 8a and 16a describe earlier tasks than the numbers around them: the list reads as edited rather than written. **Fix:** renumber 1-N in task order. **Verified:** read.
5. **Low — bare citations (throughout).** "(1.1, Task 3-1)", "(5.2)", "(6.6)" cite *Investigation* finding numbers, which the plan never says; Nathan meets them in the first behavior change. **Fix:** one clause in SOURCE or at the list's head. **Verified:** read.
6. **Low — *§Concepts · REMOVED*, the tile readers row (plan line 203).** `coerceEmbeddedView`, `configIdOf`, `rawViews`, and `rawActive` are listed as removed; they stand at `viewTileEntry.ts:21-41`, moved. The row's description says so, the heading doesn't. **Fix:** drop the row; the *§Placements* `viewTileEntry.ts` row already says what moved. **Verified:** read.
7. **Low — `Core/Views/Table/table-view.css`.** The file is named for TableView, its header (`:1`) calls the whole file "the table shell TableView and ArchiveView wear," its one block class is `.table-shell`, `ArchiveView.tsx:14` imports it, and lines 33-47 (`.table-grid.col-hiding`, `.data-cell.cell-sweep`) are TableView's alone. A reader finds a shell under a view's name with a view's rules under a shell's header. **Fix:** the header reads "TableView's layer over the Tables chrome, whose `.table-shell` ArchiveView imports," or the shell rules take `table-shell.css` beside it, a placement for Nathan. **Verified:** read.
8. **Low — Phase 9 has no Review Checkpoint (plan lines 372-373).** It's the one production phase without one and the widest-touching (44 files); Phase 10's one task has one. **Fix:** add the checkpoint, or the GOAL says why a rename phase skips it. **Verified:** read.

Nothing High: every fold landed, nothing undid another, and no plan line stalls an executor.

#### Strengths to Keep

- `Host/viewKinds.ts` as the one kind table with `presentedKind` and the cycle reason in *§Placements*; adding a kind is one record and one import, and the type grid reads liveness from the same table.
- `VIEW_PANES` and `ViewPane` as the one route both doors take, with `ViewWriter` the one spelling of a bound save from the record's rows to every pane.
- `Host/liveView.ts` as the one save, with the I-070 arm pinned, and `paintAhead.ts` apart from it.
- `naming` with `landing`: one rule settles a refused create and a filtered newborn, read by both renderers through one `RenamableName`.
- `ItemApi` extended through `policy.item`; the host's return at 36 keys from 42, with no passthrough.
- `pruneGroups`, `bucketBands`, and `orderSetTree` taking an empty order: one walk per job, two of them pinned.
- `DisclosureChevron` in `UIX/Elements` with `data-chevron`, and `useDisclosureSet` serving every folding list; `RowLead` making the ghost row's gutter structural.
- `immovable` as the one lock, pinned three ways.
- `viewTileEntry.ts` behind `editViews`, and a tile that names no renderer.
- `MenuBase` in `UIX/Menus` importing nothing from `UIX/Pickers`.
- `shownLabel`, `ROOT_ROW_LOOK`, `StableHandlers`, `popOptions`, `BandDrop` in the model: each a second spelling that no longer exists.

#### Verdict

Yes: a reader inheriting `099c236ee` with no context prefers it to `cae07c129`. They find a kind in one file instead of three tables, reach every pane through one dispatcher, save a view in one file, rename a page through one component, prune and bucket bands in one walk each, fold any list through one chevron and one shape, lock a row with one flag, and meet eleven fewer production files under `Core/Views` (69 to 58, seven of them at its root) and four fewer in `UIX/Pickers`, 370 production lines lighter, with nothing kept for compatibility and no old name beside a new one anywhere I looked. It would be a firmer yes with `table-view.css` named for what it holds (finding 7), and with the two placements Run Notes 12 and 13 already queue for the morning ruled (the disclosure shape's home and `OptionOrderList.tsx`'s name), since each is a file whose name or folder still says something other than what's inside. The plan's own residue (findings 1-6, 8) is wording; none of it reaches the code.
