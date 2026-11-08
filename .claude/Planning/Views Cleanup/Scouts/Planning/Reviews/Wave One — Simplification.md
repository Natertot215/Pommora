### Wave One — Simplification

**DATE:** 11-08-2026
**RANGE:** `cae07c129..f8e96f1e2` on `vc-chain`, read at the head in the scratch worktree and against the base through `git show`; nothing run.
**COUNTS:** High 2 · Medium 3 · Low 10

#### Findings

**1. High — The Trash is said to wear the shell the stacking fold took it out of.**

- **Where:** `Core/Views/Table/table-view.css:1` ("TableView, ArchiveView, and TrashFrame wear … the latter two importing it from here") and `.claude/Features/ViewTypesPM.md:95` ("whose shell ArchiveView and the Trash wear too").
- **What's There:** Phase 4's fold kept the Trash on its own insets; `TrashFrame.tsx:9-11, 27-31` imports `nav-list.css` and `trash-frame.css` and wears `trash-frame table`, never `.table-shell`. The header was written before the fold, and Phase 11 carried the claim into the feature document.
- **Fix:** Name TableView and ArchiveView alone in both sentences. ±0.
- **Principle:** Reads as Designed; One Way, since the code and both of its descriptions disagree.
- **Verified:** Read and grepped; `table-view.css` is imported by `TableView.tsx` and `ArchiveView.tsx` alone.

**2. High — The tile's view-name rename is wired twice where the base wired it once.**

- **Where:** `Core/Tiles/Surfaces/ViewTile.tsx:419-433` (the pill's inline `RenamableLabel`) and `:525-530` (the dropdown's `rename={{ editing, onBegin: locked ? undefined : …, onEnd }}` with `onCommit`).
- **What's There:** At `cae07c129` one `viewLabel(v)` (`:488`) served the pill (`:574`) and the dropdown row (`:669`). Task 8-1 sent the row through `ViewListRow` and left the pill inline, so the editing test, the lock gate, the end, and the commit are each wired at both sites, the pill inline and the row through `ViewListRow`'s `onEnd()`-then-commit body (`ViewFrame.tsx:85-96`), the order `RenamableName` also carries.
- **Fix:** One `renameOf(v)` in the tile returning `{ editing, onBegin, onEnd }`, read by the dropdown row and spread into the pill's label. About −5, and it's most of what Phase 8's +54 can give back without undoing `ViewListRow`.
- **Principle:** One Way; Less to Carry.
- **Verified:** Read against the base file.

**3. Medium — The host keeps a set of in-flight ids to answer one question about one id.**

- **Where:** `Core/Views/Host/useViewHost.ts:35, 118-136`.
- **What's There:** `flights` collects every create in flight, but its one read is `flights.has(naming.id)` (`:121`); ids no longer being named are added and removed for nothing, with `NO_FLIGHTS` and a copy-on-write `Set` to carry them.
- **Fix:** Carry `landing: boolean` on `naming`, set with the flight and cleared by `flight.finally(() => setNaming((n) => (n?.id === id ? { ...n, landing: false } : n)))`, the guard the interactions' `held` already uses (`useViewInteractions.tsx:494`); the stranded test reads `!naming.landing`. The same rule holds (a refused or filtered-away create settles once its flight resolves), at about −8 with `NO_FLIGHTS` gone.
- **Principle:** Less to Carry; Real Purpose.
- **Verified:** Traced every read of `flights` and `naming`; the create-to-rename pin in `cellGestures.test.tsx` covers the fold.

**4. Medium — `commitGroupValue` stays on the host against B-2's own test.**

- **Where:** `useViewHost.ts:176-184, 222`; read at `useViewInteractions.tsx:148, 175, 322` and nowhere else.
- **What's There:** B-2 moves "behavior only the interactions read" into them. This is the one behavior member that qualifies and didn't move; `overrideValues` and `styleOf` wrap state the host holds, so they rightly stay.
- **Fix:** Define it in `useViewInteractions` over `rowById`, `ctx.schema`, `identity.contextIds`, and `commitValue`, all of which it already destructures. About −2; the host's return drops to 37 fields.
- **Principle:** Clearer Boundaries.
- **Verified:** Grepped every reader.

**5. Medium — `titleLabel(shown, noun)` arrived as a second shape beside four fixed-noun twins.**

- **Where:** `Core/Actions/toggleLabels.ts:7-23`; `viewMenus.ts:3` imports `iconLabel`, `titleLabel`, and `viewsLabel` side by side.
- **What's There:** `iconLabel`, `viewsLabel`, `footerLabel`, and `citationsLabel` each spell `${shown ? 'Hide' : 'Show'} <Noun>`. The work added the noun-taking form for "Titles" and kept them, so one wording rule now has two shapes in one file.
- **Fix:** One `shownLabel(shown, noun)` beside `lockLabel(locked, noun?)`, the file's existing noun-taking form; the four twins fold into it across seven call sites. About −8.
- **Principle:** One Way.
- **Verified:** Read; call sites counted by grep.

**6. Low — The disclosure shape stayed in a menu row's file after the chevron left on a rule that applies to it too.**

- **Where:** `UIX/Menus/DisclosureRow.tsx:9-48` (`Disclosure`, `useDisclosureSet`, `unfolded`).
- **What's There:** Task 7-1 moved the chevron to `UIX/Elements` because "every external importer sits outside Menus." Seven of the shape's eight importers sit outside Menus as well: the bands (`GroupBand.tsx:9`, `bandModel.ts:19`), the host (`useViewHost.ts:29`), `LocationField`, `OutlineMenu`, and the autocomplete. C-1's one shape is found under a menu component.
- **Fix:** File the three beside `DisclosureChevron` in `UIX/Elements`. ±0, but a placement, so Nathan's call; Task 7-1 keeps the hook in place, and this names the mechanism it applied to one half.
- **Principle:** Clearer Boundaries; Less to Understand.
- **Verified:** Grepped importers.

**7. Low — Remnants the work made dead.** `SetRef` (`bandModel.ts:37`), whose outside reader went with `bandRouter.ts`'s mirror types; `SwitchEntry` (`viewKinds.ts:8`), whose importer `switchRows.tsx` is deleted; `CreateFlight` (`useViewCreation.ts:46`), whose reader `standingFlight` left. Drop `export` from all three, ±0. **Principle:** Reads as Designed. **Verified:** Grepped Core, UIX, and Desktop with tests; no importer.

**8. Low — Test-only exports.** `reassignTarget` (`useViewInteractions.tsx:82`), `viewRowMenuItems` (`viewMenus.ts:101`), `formatBucketLabel` (`bandModel.ts:63`), `embedViewIds` (`viewTileEntry.ts:29`), `VALUE_KINDS`, and `ViewTileScopeValue` have no production importer outside their files. `viewRowMenuItems` is reachable through `runViewRowAction`'s `pop` seam, so its export can go, ±0; the others are pure functions whose tests read cleaner direct. **Principle:** Reads as Designed. **Verified:** Grepped.

**9. Low — The empty-order guard on `orderSetTree` is written at both callers.** `resolveView.ts:44-45` and `ViewPane.tsx:94-98` each spell `order?.length ? orderSetTree(tree, order) : tree`. Let `orderSetTree` (`group.ts:71`) take `order | undefined` and return the tree untouched when it's empty, so both callers pass `viewSetOrder(...)` straight. About −2. **Principle:** One Way. **Verified:** Read.

**10. Low — `type Handlers` is spelled twice.** `UIX/Utilities/stableApi.ts:3` holds it unexported and `useViewInteractions.tsx:49` repeats it; it also shares its name with the bridge's `Handlers` in `Contract/handlers.ts`. Export it from `stableApi.ts` under a name of its own, such as `StableHandlers`, and import it. ±0. **Principle:** One Way; Less to Understand. **Verified:** Read.

**11. Low — Two signals say whether the Titles row exists.** `runViewRowAction` shows the row on `ctx.titlesShown !== undefined` (`viewMenus.ts:107-109`) and runs `run.titles?.()` (`:139-140`); the tile sets both (`ViewTile.tsx:331-339`), the dropdown neither. `titles?: { shown: boolean; toggle: () => void }` on the run states it once. ±0. **Principle:** One Way. **Verified:** Read.

**12. Low — `useDisclosureSet`'s predicate default re-memos every render.** `DisclosureRow.tsx:17-35` memoizes on `defaultOpen`, and `LocationField.tsx:110` passes a fresh closure, so "identity-stable until the state flips" no longer holds for its one function caller. Take the memoized `tree.leads` set in place of a predicate. ±0. **Principle:** Reads as Designed. **Verified:** Read; nothing keys on that identity today.

**13. Low — `submitRename` clears the fence for callers that never claimed it.** `editSlice.ts:115` sets `RENAME_CLEARED` on every submit, so Table, Cards, tab, and window commits now clear state only the fence owns. Move the clear into the fence's own commit (`RenamableTitle.tsx:56`), leaving `submitRename` a write; its other callers (`SettingsFrame`, `Banner`, `PageHeader`, `PageMenu`) hold their own editing state and need no change. ±0. **Principle:** Clearer Boundaries. **Verified:** Traced; no gesture found that commits a surface-held name while a fence rename is pending, so no user-visible defect is claimed.

**14. Low — The kind-row look is spelled twice.** `LayoutFrame.tsx:48` passes `{ iconSize: ICON.rootEntry }` inline to the switches; `cardsKind.ts:20` names the same look `CARD_ROW_LOOK` for the rows drawn beneath them. One look exported from `viewKinds.ts`, which both already import. ±0. **Principle:** One Way. **Verified:** Read.

**15. Low — Tests.** `Table/bandCommits.test.tsx` holds two column-width cases and one collapse-persist case under its old name, so it takes a name for what it holds or folds into `useColumns.test.ts`. `useColumns.test.ts:121-150` tests `placeInShown`, a `columns.ts` function, two of its four cases repeating `columns.test.ts:234-270`; the repeats go and the rest move. `MatrixMenu.test.tsx:117` stubs `presentMenu` beside the file's own `door` mock and doesn't restore it, so the following case runs under it. **Verified:** Read.

#### Unsure

- **The Lead Cell's Split:** `RowLead`'s lead-or-plain choice is spelled in `DataRow` (`TableView.tsx:361-396`) and `GhostRow` (`:245-258`); a `lead` flag on one cell would state it once at about −10, but gives the cell a mode. I'd leave it.
- **`OptionOrderList.tsx`'s Name:** it now exports the panes' shared rows (`SUB_LOOK`, `orderOptions`, `hideEye`, `HideableRow`) that Visibility and Sort import, so the name says less than it holds; Task 3-3's placement put them there, so it's Nathan's.
- **No-Op Line Specs:** the Bundle table's `lineList({ commit: () => {}, label: () => '', watch: [] })` (`BundleTable.tsx:187`) and the Matrix's `snap={() => null}` (`MatrixView.tsx:123`) are unreachable now that every row there is immovable; a navigation-only zone would remove them but changes the engine's API, which isn't clearly less.
- **`detailFor`:** `SettingsFrame.tsx:121` keeps a two-arm `detailFor` closure the plan's REMOVED table lists as gone; the code is fine, the plan row is stale.
- **Counterpart Names:** `viewTileEntry.ts`'s `deleteView` and `duplicateView` share names with `viewsFile.ts`'s async ops; deliberate, but a search lands in both.
- **Weighed and Holding:** `bandModel.test.ts`' `shownHeads` case pins the tail filter `unfolded`'s test doesn't. `holdsRows` and `isEmptyBand` answer different questions after E-3's empty option bands, so they aren't twins. The two `viewSetOrder` appliers hold on paint-ahead: GroupFrame and Cards order the painted Set index, while the Filter orders a plain tree that the Matrix and Preview Rules mount with no view. `renaming`/`setRenaming` on `ViewListRow` would lose the tile's lock gate on `onBegin`, and finding 2 is the cheaper fold. `insertDuplicate`'s splice is F-5's ruling. Phase 1's +9 is the placement's price for the runtime cycle.

#### Strengths to Keep

- `presentedKind` and `BUILT_KINDS`: the Table fallback is written once, and a kind is one record and one import.
- `VIEW_PANES` and the one `ViewPane` dispatcher handing each pane a bound `save`.
- `liveView.ts`'s single `useSaveView` with the lock gate inline, and `dropIO`'s I-070 arm.
- `interactions.item` with `policy.item` as each kind's only extension, `ghostRootProps`, and the one `held` create.
- `RowLead`: Phase 7's +29 buys a structural guarantee, since the ghost row lacked its gutter because the lead cell was hand-built three times.
- `pruneGroups` as one walk, `bucketBands` serving both levels, and `orderSetTree` ahead of the build.
- `immovable` read once by `measureLine`, reusing the engine's own null-snapshot refusal.
- `data-view-lead` and `data-view-embed`, so the tile names no renderer.
- `viewTileEntry.ts`'s `EntryOp`s behind `editViews`, and `pageValues.ts` holding the engine boundary.
- `switchRow` over `lookRow`, `NONE_OPTION`, and `hideEye`.

#### Verdict

A zero-context reader given `cae07c129` and `f8e96f1e2` prefers the after: one kind record, one pane route, one save, one item API, one prune walk, one row lock, and a tile that names no renderer are each easier to find and change than what they replaced, and they arrive 376 production lines lighter. What would tip a reader the other way is the work contradicting itself where it claims to have unified: a header and a feature document describing a Trash shell the fold undid, and a tile that spells one rename twice where it used to spell it once. Folding findings 1 through 5 (about −23 lines, the rest wording) leaves the after reading as designed throughout; Phases 7 and 8 stay net-positive, which `RowLead`'s guarantee justifies and finding 2 trims.
