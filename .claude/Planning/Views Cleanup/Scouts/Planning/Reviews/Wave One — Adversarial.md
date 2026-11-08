#### Adversarial Review: Views Cleanup, Wave One

**Verdict:** Solid after the listed findings: no regression a user reaches turned up along the paths the diff touches, and what's left is one drive case and its matrix that weren't re-pointed, one false sheet header, a handful of exports the moves stranded, and one fold whose attribute now does two jobs. 0 High, 0 Medium, 6 Low.

#### What Ran

- **Replay:** a detached worktree of `cae07c129` in the scratchpad, `node_modules` linked as `editor-parity/worktree.sh` does, the 27 patches applied in plan order with `git apply --index`. Every patch applied cleanly, and `git diff --cached f8e96f1e2` and `git diff f8e96f1e2` both printed nothing: **the replay matches the chain head byte for byte.**
- **Gates:** `npm run typecheck` clean; `npm run lint` clean (1,424 files, no fixes, both comment hooks silent); `npx vitest run --reporter=dot` 9,261 passed, 2 skipped, 546 files, no red and no load-flaky rerun needed; `Core/Contract/engineGraph.test.ts` and `Desktop/hostGraph.test.ts` 4 of 4; `npm run build` read `✓ built in` for all three bundles.
- **Boundaries:** `git diff --stat cae07c129` against the head's tree for `Core/Sync Sync` printed nothing. The production comment count reads 3,493 against the cap of 3,517 (3,517 at the base).
- **VERIFY greps:** every one ran as written and read as the plan says, with one wording slip in the plan itself. Task 5-1's `'detail'` grep includes `Core/Interface/Menus`, so it prints `connectionMenuActions.ts:36`, the `open: 'detail'` union the task's own parenthetical calls other words. The `'detail'` was there at the base, and it isn't a finding. `check-atlas.mjs` reported 17 of 17.
- **Pins:** each pin a phase's Notes names was reverted in code, not in the test, its file run, and the file restored from the index; all 14 went red (I-070; Phase 3's four; 5-1's create-to-rename; E-2; E-3, which also reddened the two sub-grouping cases that assert it; 7-2's band-head Tab stop; Phase 10's three engine pins and the two `HeadedBand` pins). None stayed green.
- **CSS order:** the base and the head built side by side, their bundled CSS parsed into rule sequences with hashed class names normalized, and the sequences aligned. Moved blocks were checked for same-specificity conflicts on shared elements. Details are under *§Holds*.
- **Throwaway tests (not kept):** three naming cases added into `useViewHost.test.tsx`'s create-ahead-of-reply suite, run by `-t`, and removed by `git checkout`. Details are under *§Holds*.
- **Archive Drive:** the worktree's own copy of the drive ran against the worktree's build, every group, with `POMMORA_DRIVE_REPO` at the replay. I used the worktree's copy, not the main checkout's: the main checkout's copy is the base version, whose `.table-view` and `.trash-head` selectors the patches rewrote, so it can't read the head. ~/Test was backed up and restored by the harness, and its hash matched Run Start before and after. Result: 158 of 159 held. The one red, `[g6B G-4]`, was reproduced against the base: group 6B on `cae07c129`'s own build and drive read 22 of 22, G-4 included, so the red is this work's (Finding 1).

#### Findings

##### 1. The Archive Drive's G-4 case asserts a "More" label the work renamed — `LOW — CONFIRMED`

- **Where:** `.claude/scripts/Archive Drive/live-drive.mjs:1067` (`footing.more === 'More'`) and `MATRIX.md:120` (`a disabled [aria-label="More"]`).
- **What happens:** Task 3-3 (F-9, Behavior Change 8a) redrew the views dropdown's disabled placeholder as `FooterIconButton` with `ariaLabel="More actions"` (`ViewFrame.tsx`'s list footer). The drive still reads `More`, so `[g6B G-4]` fails with `{"last":true,"divided":"true","reorder":false,"picked":false,"more":"More actions","disabled":true}`. Every other part of the assertion holds. This is a case that misreads a decision, not a code fault, but it turns the plan's required final-head drive red.
- **Fix:** read `'More actions'` at `:1067` and `[aria-label="More actions"]` in `MATRIX.md:120`.
- **Verified:** ran (the head drive red, and the base's group 6B green with its `ariaLabel="More"` `AccessoryButton`).

##### 2. The Archive Drive's matrix still names the Trash heading classes Task 4-1 deleted — `LOW — CONFIRMED`

- **Where:** `.claude/scripts/Archive Drive/MATRIX.md:72, 78, 79, 175, 176`, which name `.trash-head.table-head`, `.trash-head-name`, `.trash-head-date`, and `.trash-head`.
- **What happens:** Task 4-1 folded the Trash's hand-built heading into `BundleTable`'s `.table-head`, and the drive's script followed (`git grep` over `live-drive.mjs` finds none of these). The matrix that documents its cases didn't follow, so five rows describe selectors that no longer exist. The plan's rule is that drives change with their code.
- **Fix:** re-point the five rows to `.trash-frame .table-head` and its first and last `.col-header`, as the script now reads them.
- **Verified:** read (`git grep` over `.claude/scripts` at the head).

##### 3. `table-view.css`'s header says the Trash wears the shell and imports the sheet; it does neither — `LOW — CONFIRMED`

- **Where:** `Core/Views/Table/table-view.css:1`: "The table shell TableView, ArchiveView, and TrashFrame wear … the latter two importing it from here".
- **What happens:** the Phase 4 fold kept the Trash on its own insets, so `TrashFrame.tsx:27, 31` wear `trash-frame table` and `trash-table` with no `.table-shell` and no import of the sheet (Task 4-3's VERIFY grep lists only `ArchiveView.tsx` and `TableView.tsx` importing it). The header was written for the pre-fold 4-3 and survived the fold. The plan's *§Concepts* row for `.table-shell` names `TrashFrame.tsx` the same way.
- **Fix:** "The table shell TableView and ArchiveView wear, ArchiveView importing it from here: …", and drop `TrashFrame.tsx` from the Concepts row's Location.
- **Verified:** read.

##### 4. The moves stranded exports with no production importer — `LOW — CONFIRMED`

- **Where:** dead, no importer outside their file: `SetRef` (`Bands/bandModel.ts:37`), `CreateFlight` (`Host/useViewCreation.ts:46`), and `SwitchEntry` (`Host/viewKinds.ts:8`). Test-only now where the base had production importers: `viewRowMenuItems` (`Actions/viewMenus.ts:101`), `formatBucketLabel` (`Bands/bandModel.ts:63`), `embedViewIds` (`Tiles/viewTileEntry.ts:29`), `VALUE_KINDS` (`valueKinds.ts:325`), and `ViewTileScopeValue` (`ViewTileScope.ts:8`).
- **What happens:** each lost its outside importer when its consumer moved into its file or dissolved. `reassignTarget` is the same shape, but Phase 2's Notes already disclose it and it isn't raised here.
- **Fix:** un-export `SetRef`, `CreateFlight`, and `SwitchEntry`. For `viewRowMenuItems`, the one most worth it, test the menu through `runViewRowAction` with a stub `pop` and un-export it; leave the rest test-exported if Nathan prefers.
- **Verified:** ran (a script that lists every export in the changed production files and `git grep -w`s each one outside its file, at the head and again at the base).

##### 5. The band row's `data-view-lead="head"` also opts every band row into the tile's heading styles — `LOW — TRACED`

- **Where:** `Core/Views/Bands/GroupBand.tsx:144` and `Core/Tiles/Surfaces/view-tile.css.ts:139-146` (`headLead = ${body} [data-view-lead="head"]`, setting `--heading-fill`, `--heading-divider`, `> :first-child { overflow }`, and `::before { left }`).
- **What happens:** Phase 8 put the tile's Table-heading rules on `[data-view-lead="head"]`, and the stacking fold then had `GroupBand`'s `.group-band-row` declare `head` too, for the reveal. Every band row in a tile, Table and Cards alike, now matches the heading rules. It's inert today: the built CSS shows `--heading-fill` and `--heading-divider` read only by `.table-head` itself, `.group-band-head` has no `::before` content, and its overflow is already visible. The attribute does two jobs, though, so the next heading rule lands on band rows unseen. The fold came in blind.
- **Fix:** have the band row declare its own value, `data-view-lead="band"`. `resolvePeekAnchor` already treats any value other than `row` as a zone, so the reveal is unchanged, and the heading rules match the Table's heading alone. That's one line in `GroupBand.tsx`, since no test or other sheet keys on the value (a tree-wide `git grep` finds it only in `ViewTile.tsx`, `view-tile.css.ts`, `GroupBand.tsx`, `CardsView.tsx`, and `TableView.tsx`), plus *§Concepts*' `data-view-lead` row, which lists `head` and `row`.
- **Verified:** read (head source and the head build's CSS).

##### 6. `detailFor`, which *§Concepts* lists as removed, still exists by that name — `LOW — CONFIRMED`

- **Where:** `Core/Views/Settings/SettingsFrame.tsx:121`.
- **What happens:** the switch is gone, as Task 3-1 asked, but a two-arm `detailFor` (Properties, else `ViewPane`) remains under the name the REMOVED table says left. A reader checking the plan against the code finds the name and reads it as residue.
- **Fix:** inline the ternary into `FrameSlide`'s `detail`, or strike `detailFor` from the REMOVED table.
- **Verified:** read.

#### Unsure

- **The Properties Drive, groups E and F** (port 9403), weren't run here. Task 3-4 re-pointed MP-E-3 to the presenter's shield, and the plan wants both groups green at the final head. The check is to run them from a worktree of this head the way the Archive Drive ran.

#### Holds

- **Create-to-name:** naming is keyed at the gesture and held through the flight, a refused create clears it, a landed create keeps it after the reply (all three run in the throwaway tests), and two creates in flight leave the later one named. A reply landing before its push would clear the naming (also run), and the slice's contract, "the host pushed what this write changed before it replied", rules that order out. The Set band menu's New Page with a `null` trigger reaches `bandAdd`, opening the band first. `RenamableName` across page, set, collection, homepage, space, and context in the detail header matches the base's `submitRename` dispatch, and `fromCreate` is now explicit where the base read the fence.
- **The held ghost:** `held` clears in `flight.path.finally`, so a refused create frees the ghost. The Table's and Cards' stand-downs reduce to the seat or naming suppression plus the capture-phase press clear, and `seat.click` keeps the secondary-click bail that `onCellClick` held.
- **I-070's arm:** it skips a key whose prior order lacked the row and re-places only over a composed write. Leaving the remote-write case alone, as the Run Notes rule.
- **The pipeline:** `pruneGroups` equals the three base passes for hidden sub-buckets under every Set, Hide Empty Groups at both levels, a filter emptying a Set under a sub-grouping, and the property plan's live empty bands. Band keys, including `_ungrouped` and the scoped sub-tail, have the same shape as at the base, so `collapsed_groups` round-trips. `orderSetTree` gives `orderGroups`' band order exactly, since the base held non-Set slots and ignored an `_ungrouped` entry the same way, and it reorders nested pages only inside one band, as the log says.
- **Panes:** the Filter's lists through `popMenu` key operators by label, and the Checkbox pair stays distinct. `ViewPane` serves both doors, the locked-tile gate in `useSaveView` equals the base's `writeView` and still reports its refusal, and `FilterFrame`'s Matrix and Preview Rules mounts typecheck unchanged.
- **The tables:** `BundleTable`'s heading, the date column, and `SettingsWindow`'s drag selectors hold. The column resize persists only after a move (activation 0 activates on the first move, and a still click ends in `onTap`), Escape and blur abort, and one global `live` refuses a second pointer. A resize outliving its column throws into the gesture's catch and aborts. `.table-shell`'s two outside selectors were renamed.
- **Rows and disclosure:** `RowLead` sits in all three shells and the ghost, and the ghost's new rail swallows only clicks that missed the ghost at the base too. The Bundle chevron stops propagation, so a single click discloses once and a double-click opens and closes. `navigationTree` sits on the sidebar `<nav>`, the Grouping `LineZone`, and the Location frame alone, and the Outline, autocomplete, bands, Property frame, and Bundle table keep their chevrons. `immovable` matches each former lock, row for row.
- **CSS after the moves:** `menu-base.css.ts` is byte-equal in rules to the shell half of `picker-base.css.ts` and sits at the same place in the bundle. `cells.css` moved from last to mid-bundle with no same-specificity rule on its elements after it. `treePane`, `pillToday`, `view-frame.css.ts`, and `disclosure.css.ts` moved without a conflicting rule on a shared element.
- **Tiles and the rest:** the tile's reveal from `data-view-lead` resolves to the same anchor as the base's class queries for Table, grouped and flat Cards, and Set cards. `[data-view-embed]`'s zoom and padding equal the base's tile-body rules in value and specificity, and dropping the zoom fallbacks is safe, since `applyPersonalization` writes every `ROOT_VARS` key, `--view-embed-zoom` and `--embed-zoom` included, on the tree's install, before any tile can draw. `editViews` gates the pill, the row, the context menu (`rowMenu` returns when locked), New View, and reorder. `pageValues.ts` keeps both halves clean, so the engine graph reaches no `.tsx` or `.css.ts`. Every former export of each deleted, renamed, or moved production file is gone or has a live importer at the head (scripted over `git diff --name-status -M`).

#### Killed

- **Cards leaving the fence strands a sidebar create's field:** the declared `sidebar` host always seats its own field, because `Disclosure.tsx:87-91` opens a folder for a renaming child.
- **The per-row selection subscription is O(N) per store write:** Cards' cards and the sidebar's rows already subscribe per row at the base, so the Table now matches the established pattern (Decision 2.7).
- **The I-070 arm re-inserts a removed id:** nothing reaches it with ordinary actions, since `tieOrderWith` keeps the id in every live order, and a dead id in `manual_order` is inert.

#### Not Checked

- Interaction on screen beyond what the Archive Drive drives: the band head's Tab path, Hide Disclosure Chevrons on the three trees, the ghost row's gutter hover, and the Trash and Archive chevron double-click. Each was read, and the drive covers the Bundle table's.
- The Properties Drive (see *§Unsure*).

#### Teardown

Both worktrees I cut (`scratchpad/wt-review` for the replay and `scratchpad/wt-review-base` for the base build) were removed with `git worktree remove --force` and pruned, and `git worktree list` shows the main checkout and the chain's `wt-base` alone. My scratch folder (`scratchpad/review`: the pin and export scripts, logs, and both drives' screenshots) is deleted, and the throwaway tests left with the worktree, never having touched the chain. No drive Electron remains, and the only Electron running is the main checkout's dev instance on 9333, which this review didn't start. No `pommora-drive-*` folder remains in `$TMPDIR`. `~/Test` hashes `e5a32a5d30d6a11310cd559ee2b1b84b261c3265`, Run Start's. The main checkout's `git status --short` shows the untracked planning folder alone, this report included.
