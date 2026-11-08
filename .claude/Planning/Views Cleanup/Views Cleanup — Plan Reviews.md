### Views Cleanup — Plan Reviews

Each wave's findings, what folded into *Views Cleanup — Implementation Plan* and the patches in `Scouts/Planning/Phases/`, and what didn't, with the reason. Each wave's reports sit in `Scouts/Planning/Reviews/`, and each fold's ledger beside the patches.

#### Wave One · Outward (`opus-xhigh`)

**Simplification:** 15 findings (2 High, 3 Medium, 10 Low), about 25 further production lines. **Adversarial:** 6 findings (0 High, 0 Medium, 6 Low). The adversarial reviewer replayed the 27 patches onto a clean export of `cae07c129` and reached the chain's head byte for byte, ran the gates, the build, and both boundary tests there, reverted all fourteen pins red, compared the bundled CSS order of every moved stylesheet at the base and the head, wrote three throwaway tests over the naming path, swept every export of the changed and deleted files, and ran the Archive Drive whole on the head's build: 158 of 159, the one red a drive label Task 3-3 renamed. Each fold landed inside its task's commit through fixup commits and one autosquash rebase, so the chain stays one commit per task. *Scouts/Planning/Phases/Wave One — Fold Ledger* holds each change, its task, and its pin.

**Folded, Correctness and Truth:**

- **The Trash and the shell (S1, A4):** `table-view.css`'s header and `ViewTypesPM.md:95` said the Trash wears and imports the shell; the Phase 4 stacking fold had kept it on its own insets. Both name TableView and ArchiveView alone. Tasks 4-3 and 11-1.
- **The Archive Drive's label and matrix (A1, A2):** `live-drive.mjs:1067` and `MATRIX.md:120` expected `aria-label="More"` after Task 3-3 renamed the placeholder, the one red on the final head's drive; `MATRIX.md`'s rows 72, 78, 79, 175, and 176 named the `.trash-head*` classes Task 4-1 deleted. Tasks 3-3 and 4-1.
- **The band row's lead value (A3):** the Phase 8 fold gave every band row `data-view-lead="head"`, so the tile's Table-heading rules matched them too; the band row reads `"band"`, and the reveal treats any value but `row` as a zone. Task 8-3.

**Folded, Simplification:**

- **One tile rename (S2):** the pill and the dropdown row each spelled the editing test, the lock gate, and the end where the base's `viewLabel(v)` spelled them once; one `renameOf(v)` serves both. Task 8-1.
- **`naming.landing` (S3):** the host's set of every create in flight answered one question about one id; a `landing` flag on `naming`, cleared on the flight's settle, keeps the rule and loses the set. Task 5-1.
- **`commitGroupValue` (S4):** read only by the interactions, so B-2's own rule moves it there; the host's return reads 37 fields. Task 5-3.
- **`shownLabel(shown, noun)` (S5):** the four fixed-noun show/hide helpers and the noun-taking one `toggleLabels.ts` gained become one, across seven call sites. Task 3-2.
- **Dead exports (S7, A5):** `SwitchEntry`, `CreateFlight`, and `SetRef` lose `export`, having no importer; `viewRowMenuItems` loses it too, tested through `runViewRowAction`'s `pop` seam (S8). Tasks 1-1, 5-1, 6-2, 8-1.
- **`orderSetTree` takes an empty order (S9):** both callers spelled the same guard. Task 6-1.
- **`StableHandlers` (S10):** the handlers type spelled twice, once unexported in `stableApi.ts`, is exported there under its own name. Task 5-3.
- **One Titles signal (S11):** `runViewRowAction`'s run takes `titles?: { shown, toggle }` in place of `ctx.titlesShown` beside `run.titles`. Task 8-1.
- **`useDisclosureSet`'s default (S12):** takes the memoized leads set in place of a fresh predicate, so its identity holds until the state flips. Task 7-1.
- **`submitRename`'s clear (S13):** the fence's own commit clears the fence; a surface-held commit touches no fence state. Task 5-1.
- **One kind-row look (S14):** `ROOT_ROW_LOOK` in `UIX/Menus/frames.css.ts` beside `ICON`, read by the switches and the Cards rows; it couldn't sit in `viewKinds.ts`, which `cardsKind.ts` would then import back. Task 3-3.
- **Tests (S15):** `bandCommits.test.tsx`'s cases move to the suites that hold what they test and the file goes; `useColumns.test.ts`'s `placeInShown` block loses its two repeats and moves the rest to `columns.test.ts`; `MatrixMenu.test.tsx` restores the `presentMenu` stub. Tasks 6-2, 4-2, 3-3.

**Not Taken:**

- **The disclosure shape's home (S6):** `Disclosure`, `useDisclosureSet`, and `unfolded` stay in `UIX/Menus/DisclosureRow.tsx` while seven of their eight importers sit outside Menus, the rule Task 7-1 applied to the chevron. A placement, so it goes to Nathan in the morning report rather than landing overnight.
- **A `lead` mode on `RowLead`:** states the lead-or-plain choice once at about −10 but gives the cell a mode; left as the reviewer left it.
- **`OptionOrderList.tsx`'s name:** it exports the panes' shared rows Visibility and Sort read; a rename is a placement, for the morning.
- **The no-op line specs** in `BundleTable` and `MatrixView`: unreachable now that every row there is immovable, but removing them changes the engine's API.
- **Pure functions exported for their tests** (`formatBucketLabel`, `embedViewIds`, `VALUE_KINDS`): their tests read cleaner direct, and the plan's 3.4 un-exported only the model's decoders, whose surface is `savedView.parse`.
- **Weighed and holding, per the reviewer:** `shownHeads`' test pins the tail filter; the two `viewSetOrder` appliers serve the painted Set index and the plain folder tree; `ViewListRow` taking `renaming`/`setRenaming` would lose the tile's lock gate; Phase 1's +9 is the price of the runtime cycle; `RowLead` earns Phase 7's +17 by making the ghost row's gutter structural.
- **Unsure items the adversarial reviewer left:** the Properties Drive's E and F groups weren't run at planning; execution runs them at Phase 3's checkpoint.

**Verdict, Quoted:** "A zero-context reader given `cae07c129` and `f8e96f1e2` prefers the after: one kind record, one pane route, one save, one item API, one prune walk, one row lock, and a tile that names no renderer are each easier to find and change than what they replaced, and they arrive 376 production lines lighter."

**Net Effect:** Actionable moves from -376 to -387 (+3324 / -3711), with the tile's one `renameOf` costing +4 where the review read -5 and the host's `landing` flag and `shownLabel` giving back -20 between them; tests read 9,259 (two duplicate `placeInShown` cases gone, `bandCommits.test.tsx` gone); comments hold at 3,493. Every task head from 3-2 on re-ran typecheck, lint, and the suite green in a replay worktree, and all twelve pins went red and back under the folded code.

#### Wave Two · Inward (`opus-xhigh`)

**Executor Read:** 9 findings (2 High, 1 Medium, 6 Low), each from a run: all 27 patches replayed in plan order onto a clean export of `cae07c129` with `git apply --index`, matching the chain's head byte for byte; every VERIFY line run as written at its task's head; all twelve pins reverted red and restored; typecheck, lint, and the suite green at every task that runs them; `npm run build` green at the end; five throwaway tests over `naming.landing` (two creates in flight, a refusal, a field closed mid-flight, a landed row later removed, a rename during a create) all green at Task 5-1's head. **Simplification:** 14 findings (1 High, 4 Medium, 9 Low), about 30 further production lines and about 70 plan lines. The executor's findings were all in the plan's own text; the chain itself needed no correctness fold. *Scouts/Planning/Phases/Wave Two — Fold Ledger* holds each code fold.

**Folded, the Plan Read as Instructions (Executor):**

- **Two VERIFY greps that couldn't pass at their own task's head:** Task 5-1's named `pendingSeat`, which the task's own prose leaves for 5-2, where the grep now sits; Task 7-1's `drop-outline` pattern matched the band's button Task 7-2 removes, so it reads `data-drop-outline|--drop-outline`.
- **Phase 1's ledger checks** sat on Task 1-1, where the comment count reads 3,518 (GroupFrame's reason arrives there, `ViewHost.tsx`'s line leaves at 1-2); they sit on Task 1-2, the phase's last.
- **Cells an executor can't run as written:** a pin named differently from its test, a pin written as a state rather than a code revert, a `.ts` for a `.tsx`, a `\b` under `-E`, and a VERIFY naming one pin where *Pins* lists three. Each corrected.
- **Ledger and list text:** the Comment Ledger's Phase 10 cell (no comment lines change); *§Reconciliation*'s drive rows under the four tasks the drives follow and its Documents list gaining the six the docs patch rewrites; *§Concepts*' `naming` row carrying `landing`, `data-view-lead` naming `GroupBand.tsx`, and rows for `ROOT_ROW_LOOK`, `memberIndent`, and `StableHandlers`; *§Placements* gaining the `FieldPicker` test split and the `schemas.viewButton.test.ts` rename; the Decision Map's D-1 row naming Task 8-1.

**Folded, Code (Simplification):**

- **One label in `RenamableTitle.tsx` (High):** after Wave One's fence fold, the fence's label was `RenamableName`'s body with `onEnd = cancelRename`; the fence returns `RenamableName`, the fence still claiming the rename. Task 5-1.
- **`BandDrop` joins the band model:** the one type Task 6-2 left in the router, so the model and the router import one way. Task 6-2.
- **`popOptions`:** `PickerControl`'s non-toggle branch, read by the Filter's `RuleField` in place of its own spelling; `Choice` goes. Task 3-4.
- **`forms`, not `nexus`:** the locals holding a `DateForms` take the type's name, the host calls `useDateForms()` itself, and `useBandSource` returns its band faces alone. Tasks 2-2 and 6-2.
- **`patchSeedValues` goes:** `createPageIn` calls `overrideValues` straight. Task 5-1.
- **`BundleTable`'s doc** keeps the measuring clause the markup can't say and drops what it absorbed from `DateHeading`'s. Task 4-1.
- **Three leftovers:** one named pane-writer type for `SavePane` and the record's `write`; `HeadedBand` reads `open` straight; `ViewFrame`'s shadowed `editing` reads `renaming`. Tasks 1-1, 3-1, 7-1, 8-1.

**Folded, the Plan's Weight (Simplification):** *§Concepts* lost its 38 file rows, which restated *§Placements*, and 22 rows for private helpers, pane-local renderers, file-local types, and strings *§Behavior Changes* carries, and its five rows that read false at the head were corrected (`shownLabel` for `titleLabel`, `HideableRow`'s panes, `CARD_ROW_LOOK` alone as removed, `RowLead` taking a finished indent, `seatHost` an object); Task 5-3's VERIFY counts 37 fields at its own head and 36 after Task 7-1; "the ledger checks" are stated once under *§Constraints · Gates*; Behavior Change 12 (a re-render with nothing visible) left and 8a's label joined 5; the rules stated twice across *§Constraints*, *§Final Verification*, and *§Reconciliation* read once; *§Reconciliation*'s Comments line left for the Comment Ledger; *§Deviations* returned to empty with a pointer to the fold ledgers; the Net Ledger's Estimate took one form. The plan went from 969 lines to about 900.

**Not Taken:**

- **A shared view-name label** across `ViewListRow` and the tile's pill: Wave One's S2 and the D-1 reading stand; the reviewer named no mechanism they missed.
- **A `groupPlan`-with-presented-kind helper, a derived `ViewPaneId`, named predicates in `resolveView.ts`'s `drops`:** each names one expression at a cost the reviewer put at or above its saving.
- **Final Verification's wave names** sharing words with planning's waves: the sections are headed apart.

**Net Effect:** Actionable moves from -387 to -370 (+3392 / -3762): the code folds read -8 (`patchSeedValues`) and -1 (`RenamableTitle`) against +13 for `ViewWriter`, +6 for `popOptions`, +5 for `BandDrop`, and +1 for `forms`, almost all of it Biome wrapping import lines past the column limit once one more name joined them, with one `Result` type import. Each stands for One Way (one writer spelling, one menu-door spelling, one-way imports between the band model and its router) rather than for lines, and the report says so. Comments read 3,492; tests 9,259. Every task head re-ran typecheck under the rebase's `--exec`, and the full gates ran at all 27; all twelve pins went red and back; the replay matched the head byte for byte.

#### Wave Three · Both Ways (`fable-high`)

**Findings:** 8 (0 High, 1 Medium, 7 Low), every one in the plan's text. The reviewer traced all 24 fold-ledger rows (17 from Wave One, 7 from Wave Two) into the code at `099c236ee` and found each in place as described, with no old name beside a new one, no missed caller, no test or comment on an old shape, and no later task re-spelling a fold (Wave One's `MatrixMenu.test.tsx` stub restore was superseded by Wave Two's `popOptions`, which the second ledger records); ran every task's VERIFY grep at the head, the atlas check, the comment count, the Sync diff, `git diff --name-status -M` against *§Placements*, and 14 suites over the fold-touched files with both boundary tests (308 tests, green). Measured for the verdict: `Core/Views` production files 69 to 58 (its root 19 to 12), `UIX/Pickers` 14 to 10.

**Folded:**

- **The Comment Ledger's Phase 9 cell (Medium):** named headers neither file has; it names the one doc that moved, `frames.css.ts`'s "A type editor's rows" into `schema.css.ts`.
- **The Placements test rule:** "follows the code it tests", since `ViewTile.test.ts` became `viewTileEntry.test.ts` while `ViewTile.tsx` stands and `Views/handlers.test.ts` left while `handlers.ts` stands.
- **Pins cited three ways:** *Pins* in all three places.
- **Behavior Changes:** renumbered 1 to 25 in task order, the lettered rows gone.
- **The Investigation's finding numbers**, cited bare in task prose, are introduced in SOURCE.
- **A Concepts REMOVED row** for functions that moved to `viewTileEntry.ts` rather than leaving.
- **Phase 9 takes a Review Checkpoint**, the one production phase that lacked one while touching 44 files.

**Not Taken:**

- **`table-view.css`'s name:** named for TableView, headed as the shell TableView and ArchiveView wear, holding `.table-shell` and TableView-only rules, and imported by ArchiveView. A rename to `table-shell.css`, or a header saying it's TableView's layer whose `.table-shell` ArchiveView imports, is a placement, so it goes to Nathan in the morning report beside the two placements the Run Notes already queue.

**Verdict, Quoted:** "Yes: a reader inheriting `099c236ee` with no context prefers it to `cae07c129`."

#### Closing Proof

All 27 patches replayed in the plan's order onto a clean export of `cae07c129` with `git apply --index`, each applying, and the result matched the chain's head `099c236ee` exactly: `git diff` and `git diff --cached` against it printed nothing. There: typecheck clean, lint clean (1,423 files), 9,259 passed and 2 skipped across 545 files, `npm run build` printing `✓ built in` for all three bundles, the repo's `.claude/hooks/pre-commit` exiting 0 over the replayed tree (the chain's own commits skipped it), the atlas check at 17 of 17, the comment count 3,492 against the cap of 3,517, and `git diff --cached --stat cae07c129 -- Core/Sync Sync` printing nothing. Wave One's adversarial reviewer had run the Archive Drive whole on the chain's build at 158 of 159, the one red the drive label Wave One then folded; the Properties Drive's E and F groups wait for execution's Phase 3 checkpoint. `~/Test` hashed to Run Start's `e5a32a5d30d6a11310cd559ee2b1b84b261c3265` after every run that touched it.

#### Ratification Folds

At the morning review (11-08-2026) Nathan ruled the report's first two overrule items, and both folded into the chain: the Filter's Location tree keeps its chevrons whatever Hide Disclosure Chevrons says (Task 7-4: `LocationTree` dropped `navigationTree`; the caption and `ConfigurationPM.md:30` name the sidebar and the Grouping pane), and a Cards view's editor Layout leaf stays its switches alone (Task 3-1: `ViewKindRecord.layout.leaf` declares each kind's leaf, `ViewEditor` reads it, and the pin became a Table case and a Cards case). The chain's head moved from `099c236ee` to `70f5e1071`; the difference between the two is ten files, +18 production lines, so Wave Three's verdict was read at the earlier head and these two folds are Nathan's own. The closing proof re-ran: all 27 re-exported patches replayed in order onto a clean `cae07c129` with `git apply --index` to a tree equal to `70f5e1071`, with `npm run build` (three bundles), `.claude/hooks/pre-commit`, and the atlas check (17 of 17) green there, the comment count 3,492, and the Sync diff empty; typecheck, lint, and 9,259 tests green at the head, and typecheck, lint, and the Settings suites green at the four task heads the folds or their conflict resolutions touched (3-1, 3-3, 7-4, 9).
