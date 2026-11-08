### Wave Two — Simplification

**DATE:** 11-08-2026
**RANGE:** `cae07c129..a0740a60b` on `vc-chain`, read at the head in the scratch worktree and against the base through `git show`; nothing run beyond `git grep` and `git show`.
**PLAN:** read as it stood at 5:30 AM, after Wave One's folds reached its text; plan line numbers cite that copy.
**COUNTS:** High 1 · Medium 4 · Low 9

#### Findings

**1. High — `RenamableTitle` and `RenamableName` wire one label twice in one file.**

- **Where:** `Core/Interface/RenamableTitle.tsx:48-61` and `:93-109`.
- **What's There:** Both render `RenamableLabel` with the same `renames`, `value`, `className`, and `autoSize`, commit as "end, then `submitRename(path, kind, next, create)`", and cancel to the same end. Since Wave One's S13 the fence's commit is `cancelRename(); return submitRename(path, kind, next, renamingCreate)`, which is `RenamableName`'s body with `onEnd = cancelRename`. `HeldKind` sits inside `RenameKind` (`mutateRequest.ts:39`), and `RenamableLabel` reads `emptyInitial` only in its editing branch (`RenamableLabel.tsx:60-62`), so the fence's `owns && renamingCreate` is `renamingCreate` wherever it's read.
- **Fix:** The fence keeps its claim effect and returns `<RenamableName … rename={{ path, editing: owns, onBegin: doubleClick ? () => beginRename(path, false, host) : undefined, onEnd: cancelRename }} create={renamingCreate} />`; its `submitRename` selector goes. About −10. D-1's two patterns stay two, since the fence still picks the winner; only the label's wiring is written once.
- **Verified:** Read.

**2. Medium — Task 5-3's VERIFY counts the host's return at 36, which reads 37 at its own head.**

- **Where:** Plan `:696`.
- **What's There:** At `bbbb12ea0` the return still holds `collapsed` and `toggleCollapse`, which become one `disclosure` at Task 7-1; 36 is the final head's count. The return block counts 42 at `cae07c129`, 37 at `bbbb12ea0`, 36 at `a0740a60b`.
- **Fix:** "37 fields, from 42." ±0.
- **Verified:** Read the return block at all three heads through `git show`.

**3. Medium — "The count reads the Net Ledger's row" names no count.**

- **Where:** Plan `:467, 531, 594, 644, 697, 734, 796, 845, 868, 888`.
- **What's There:** The Net Ledger row holds an Estimate and a test count; the comment count lives in the Comment Ledger, which *§Constraints · Comments* says every phase's VERIFY checks, though no VERIFY line names it; view-delta's Actionable goes in Measured. An executor can't tell which number the clause asks for.
- **Fix:** *§Constraints · Gates* says once that a phase's closing VERIFY reads tests against the Net Ledger, comments against the Comment Ledger, and records Actionable in Measured; the ten clauses read "Run the gates; the phase's ledgers read true." ±0.
- **Verified:** Read.

**4. Medium — Concepts' file rows restate *§Placements*, and Concepts has already drifted from the code.**

- **Where:** Plan `:99-117` and `:202-220` (38 rows, 775 words); drift at `:125`, `:131`, `:229`, `:252`, `:332`, `:774`.
- **What's There:** Every `• file` row says what a Placements row says. Five rows read false at the head: `titleLabel(shown, noun)` (`:131`) is `shownLabel` since fold 5, and the four fixed-noun helpers it absorbed aren't in REMOVED; `BANNERS` and `FORMATS` (`:229`) are listed as removed but live in `cardsKind.ts:9-18`; `HideableRow` (`:125`) claims the Grouping, Visibility, and Properties lists, while Visibility draws its own `MenuRowView` row around `hideEye` (`VisibilityFrame.tsx:39-58`), no Properties list mounts it, and its readers are `OptionOrderList` (Group and Sort) and GroupFrame's sub-chip and date-bucket rows; `RowLead` "applies `rowIndent`" (`:332`) and is "absorbing … `rowIndent`" (`:774`, beside "`rowIndent` itself stays"), while it takes a finished `indent` string and its callers call `rowIndent` (`TableView` through `memberIndent`, `BundleTable.tsx:283`); `seatHost` (`:252`) is listed as a function and was an object. Tasks 2-1, 3-3, 5-1, 7-1, and 9-1 follow the same pattern in prose, as move inventories whose every move is already a Placements row; the plan's own rule makes the patch the AFTER.
- **Fix:** Cut the 38 file rows, Placements being the one file ledger; correct the five rows. About −38 lines.
- **Verified:** Read; each drift checked against the head file.

**5. Medium — `BandDrop` is the piece of the band model Task 6-2 left behind, so the model and the router still import each other.**

- **Where:** `Core/Views/Bands/bandModel.ts:22`, read at `:238, 265, 273, 307`; `bandRouter.ts:10-12`.
- **What's There:** Task 6-2 moved `SetRef`, `BucketRef`, `BandRef`, and `bucketValueAt` into `bandModel.ts` so the model owns its types, but the slot model's own `BandDrop` stays in the router, which now imports its values back from the model.
- **Fix:** The three-line union moves beside `BandRef`, and the router imports it. ±0.
- **Verified:** Read both files at the head and the base's import.

**6. Low — `RuleField` re-spells `PickerControl`'s menu door, under a type that restates `PickerOption`.**

- **Where:** `Core/Views/Settings/FilterFrame.tsx:62, 85-93`; `UIX/Menus/PickerControl.tsx:109-123`.
- **What's There:** Both map options to `{ label, action: value, checked: value === current, icon }`, pop compact through the same door (`mount.tsx:19` sets it to `popMenu`), and hand the value back. `Choice` is `PickerOption<string>` without `disabled`; `Icon`'s `name` is `string`, so the operator rows already fit `PickerOption`. The operator list keys by label because the two Checkbox rows share `op`.
- **Fix:** `PickerControl.tsx` exports its non-toggle branch as one `popOptions(options, current, trigger, solid?)` both read; `choices` takes `PickerOption<string>[]` and `Choice` goes. About −4.
- **Verified:** Read.

**7. Low — The `DateForms` rename stopped at the type, and the band source hands the host its date forms.**

- **Where:** `useBandSource.ts:18, 31`; `useViewHost.ts:62, 84, 143, 169`; `columnStyles.ts:127-153`; `FilterFrame.tsx:231`; `GroupFrame.tsx:118, 486`; `BundleTable.tsx:64`; `PropertyFrame.tsx:171`.
- **What's There:** The type and hook read `DateForms` and `useDateForms`, but every parameter and local holding them is still `nexus`; `useBandSource` returns `nexus` beside its band faces only because the host reads it from there.
- **Fix:** The host calls `useDateForms()` itself, `useBandSource` returns `{ painted, sets, heads }`, and the locals read `forms`. ±0.
- **Verified:** Read; grepped every `useDateForms` and `DateForms` reader.

**8. Low — Creation wraps the host's override wrapper.**

- **Where:** `useViewCreation.ts:89-96, 150-154`; `useViewHost.ts:166-167`.
- **What's There:** `patchSeedValues` has one caller and calls `overrideValues`, itself one line over `patchOverride`; its empty guard meets `req.seeds ?? {}` only when `seeds` is absent, since `pageRequest` (`:137`) sets it only when non-empty.
- **Fix:** `createPageIn` reads `if (req.seeds) c.overrideValues(req.id, req.seeds, flight.then((d) => d !== null))`, and `patchSeedValues` goes. About −8.
- **Verified:** Read.

**9. Low — `BundleTable`'s doc grew to carry `DateHeading`'s.**

- **Where:** `Core/Bundles/BundleTable.tsx:111`.
- **What's There:** *§Constraints · Comments* says no comment grows to carry what another held; the grid's doc now holds the deleted heading's doc in one 90-word line.
- **Fix:** Keep the measuring clause, the part the markup can't say, and drop "a right-click on it picking the date's style" and "then the rows the skin sets in it". ±0 lines.
- **Verified:** Read the diff.

**10. Low — Three small leftovers.**

- `SavePane` (`ViewPane.tsx:49`) and `ViewKindRecord.layout.rows`' `write` (`viewKinds.ts:20`) name the one pane writer twice, and `kindRows` hands the first to the second; one named writer beside `ViewPatch` in `views.ts` serves both. ±0.
- `HeadedBand` derives `collapsed = !bands.isOpen(key)` (`GroupBand.tsx:123`) and negates it back at three of its five reads; `open` reads straight. ±0.
- `ViewFrame` names the edited view `editing` (`:186`) and shadows it with a row's rename flag (`:267`); the inner one reads `renaming`. ±0.
- **Verified:** Read.

**11. Low — Behavior Changes carry a non-change and a misfiled sentence.**

- **Where:** Plan `:364`, `:368`.
- **What's There:** #12 ends "nothing visible changes", outside a list defined as every visible change. 8a's second sentence, "More actions", is the placeholder's `aria-label` from Task 3-3 rather than 3-4, and isn't visible. 8a, 12a, 16a, and 20a sit out of task order.
- **Fix:** Cut #12 and 8a's second sentence, fold the label into #5, and number the list in task order. About −1 line.
- **Verified:** Read.

**12. Low — Rules stated twice.**

- **Where:** Plan `:295, 297, 926`; `:354, 931`; `:346, 940`; `:347`.
- **What's There:** The Briefs bullet restates the Log's verbatim brief rule, and Final Verification's second paragraph restates Briefs; the neutral gate's inputs and answer are spelled in Constraints and again in Final Verification; the Documentation bullet and Reconciliation's first line both say documents change once in Phase 11; Sync opens by repeating the Log's sync sentence before its grep.
- **Fix:** Keep the Log's bullet, Briefs for its dispatch specifics, Constraints' Neutral Gate, and Documentation; cut Final Verification's brief sentence, its gate inputs (a pointer to *§Constraints · Neutral Gate* stays), Reconciliation's first line, and Sync's first clause. About −1 line, 150 words.
- **Verified:** Read.

**13. Low — Concepts rows for what isn't a concept.**

- **Where:** Plan Concepts, ADDED and REMOVED.
- **What's There:** Private helpers (`lookRow`, `shownIn`, neither exported), pane-local renderers (`typeGrid`, `kindSwitches`, `kindRows`, `chevronRows`, `hideEye`, `searchKeysOf`), file-local types (`Choice`, `Heading`), constants their records already name (`TABLE_KIND`, `CARDS_KIND`, `EDITOR_PANES`), and string rows Behavior Changes carry. 22 rows, 378 words.
- **Fix:** Cut them; Concepts keeps records, lookups, shared types, and renamed public names. About −22 lines.
- **Verified:** Read; export status grepped.

**14. Low — Planning history an executor doesn't run.**

- **Where:** Plan `:959`, `:969`, `:19-29`.
- **What's There:** Reconciliation's "Comments, With Their Task" restates the Comment Ledger's Arrives and Leaves at base line numbers the patches carry; Deviations opens with planning's fold history, which the Fold Ledger holds; the Net Ledger's Estimate column takes two forms since the fold (rows 1, 2, and 11 carry `+a / −r`, rows 3 through 10 don't).
- **Fix:** Cut the Comments line, return Deviations to its empty state with a pointer to the Fold Ledger, and give Estimate one form. About −2 lines, 300 words.
- **Verified:** Read.

#### Unsure

- **The View-Name Field:** `ViewListRow` (`ViewFrame.tsx:85-96`) and the tile's pill (`ViewTile.tsx:431-442`) each spell `RenamableLabel` with end-then-commit, the residue of S2's `renameOf` fold; a shared view-name label would save about 8 lines, but S2 and the D-1 reading in Run Notes chose this shape, and I have no mechanism they missed.
- **`groupPlan` With the Presented Kind's `nests`:** spelled at `useViewHost.ts:54`, `GroupFrame.tsx:137-138`, and `ViewPane.tsx:94`, the third arriving with Task 7-4; a helper would name one expression.
- **`ViewPaneId`:** restates `VIEW_PANES`' ids (`ViewPane.tsx:19`); deriving it takes `as const satisfies`, and the switch's exhaustiveness rides the union either way.
- **`drops` in `resolveView.ts:59-63`:** nests a ternary inside an `&&`; two named predicates read cleaner at +2.
- **`resolveColumns`' Predicate:** `shown(id)`'s `ordered.has` half can't be false inside its own `property_order` loop; that's the price of one predicate, and it holds.
- **The Tile's Lock Checks:** `patchEntry`, `editViews`, and `useSaveView`'s scope gate answer three rules (identity keys pass, every list edit is refused, state-only writes pass), so they aren't twins.
- **Wave Names:** Final Verification's Wave One and Two (`:928-929`) share names with Plan Reviews' planning waves, and "given the Not Taken list" could be read as Plan Reviews'.

#### Strengths to Keep

- `presentedKind` over `BUILT_KINDS`: a kind is one record and one import, with the Table fallback written once.
- `ViewPane`'s one switch handing each pane a bound save, and `SettingsFrame`'s one root.
- `liveView.ts`'s single `useSaveView` and `dropIO`'s I-070 arm.
- `interactions.item` extended only through `policy.item`, `ghostRootProps`, the one `held` create, and `naming.landing` in place of a set of flights.
- `pruneGroups` as one walk, `bucketBands` at both levels, `orderSetTree` ahead of the build, and `draggable` and `shownHeads` each shrunk to a line over shared pieces.
- `immovable`, read once by `measureLine` through the engine's existing refusal.
- `viewTileEntry.ts`'s `EntryOp`s behind `editViews`, and `pageValues.ts` holding the engine boundary.
- The Comment Ledger, which matches every phase head exactly by the plan's own command (3,517, 3,514, 3,515, 3,511, 3,498, 3,495, then 3,493 through Phase 11), and the export sweep: of the 146 names the range exports, only Wave One's three test-read functions lack a production importer outside their file.

#### Verdict

A zero-context reader given `cae07c129` and `a0740a60b` prefers the after: one kind record, one pane route, one save, one item API, one prune walk, and one row lock each have one obvious home, and Wave One's folds left little in the code beyond the rename label written twice in `RenamableTitle.tsx`, a band type stranded in the router, and a few half-finished renames and wrappers, about −30 lines in all. The plan's weight sits in its Concepts table, where 60 of its 170 rows restate Placements or name file-local helpers and five already read false, and in two VERIFY clauses an executor would misread: the host's field count at Task 5-3 and the unnamed "count". Folding findings 1 through 5 and cutting Concepts to its concepts would take the plan from 969 lines to about 900 and 16,000 words to about 14,500, and leave nothing in it an executor could follow into a red VERIFY.
