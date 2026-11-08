### Wave Two — Executor

**DATE:** 11-08-2026
**SUBJECT:** *Views Cleanup — Implementation Plan* as it read at 5:51 AM (903 lines), its 27 patches, `Pins.md`, and both ledgers, replayed task by task from `cae07c129` the way an executor holding only the plan and the patches would. The plan changed twice under the replay (5:30 AM, then 5:51 AM); every finding below is checked against the 5:51 text, and two the 5:30 text carried (Behavior Change 8a's misattributed "More actions" and Task 5-3's field count) were already corrected by 5:51.

**Verdict:** the chain is sound and the plan, read as instructions, isn't quite. The replay reaches `a0740a60b` byte for byte, every gate is green at every task head, all twelve pins go red, and every ledger number reads as measured. But two VERIFY greps can't pass at their own task's head, and Phase 1's ledger check sits on the wrong task. 2 High, 1 Medium, 6 Low.

#### Replay

A detached worktree of `cae07c129` with `node_modules` linked as `editor-parity/worktree.sh` links them (the `@pommora/*` packages pointing at the worktree). Each patch went in with `git apply --index`, and all 27 applied cleanly. Every VERIFY line ran verbatim. "Gates" means typecheck, lint, and `npx vitest run --reporter=dot`, run at every task whose VERIFY says "Run the gates" and at each phase's last task. Actionable is `view-delta --exclude .claude` against `cae07c129`, measured at each phase's head. ✓ means it printed what the plan says.

| Task | VERIFY as printed, against as written | Pin | Gates · Tests | Actionable · Comments |
|---|---|---|---|---|
| 1-1 | Both greps empty ✓ | — | green · 9,269 | +9 (+139 / -130) · **3,518**, row 3,517 |
| 1-2 | One argument at both calls ✓ | — | green · 9,269 ✓ | +9 (+143 / -134) ✓ · 3,517 ✓ |
| 2-1 | Six "No such file" ✓; channel grep empty ✓ | — | green · 9,265; boundary tests 4/4 | · 3,514 |
| 2-2 | Boundary tests 4/4 ✓; import grep empty ✓; two "No such file" ✓ | — | green · 9,265 | · 3,514 |
| 2-3 | Four "No such file" ✓; the named `Host/liveView.test.ts` doesn't exist (`.tsx` does) | I-070 red | green · 9,256 ✓ | -84 ✓ · 3,514 ✓ |
| 3-1 | Both greps empty ✓ | 4 of 4 red | green · 9,261 (`matrixRuntime` red once, 44/44 alone) | · 3,514 |
| 3-2 | Grep empty; two "No such file" ✓ | — | green · 9,261 | · 3,514 |
| 3-3 | Grep empty; three "No such file" ✓; "Title Icons" prints the two kind records ✓ | — | green · 9,261 | · 3,515 |
| 3-4 | Grep empty ✓ | — | green · 9,261 ✓ | -189 ✓ · 3,515 ✓ |
| 4-1 | Both greps empty ✓ | — | green · 9,261 | · 3,513 |
| 4-2 | Two "No such file"; grep empty ✓ | — | green · 9,259 | · 3,510 |
| 4-3 | `ArchiveView.tsx:14` and `TableView.tsx:30`, both importing `table-view.css` ✓; second grep empty ✓ | — | green · 9,259 ✓ | -335 ✓ · 3,511 ✓ |
| 5-1 | **`CardsView.tsx:149`, `:289` (`pendingSeat`)**; `'detail'` empty ✓; `rename:` empty in creation, one hit in the interactions ✓ | create-to-rename red | green · 9,260 | · 3,508 |
| 5-2 | `ghostCreate.ts:160`, `:180`, `:185` alone ✓; `seatHost` empty ✓ | — | green · 9,260 | · 3,505 |
| 5-3 | Grep empty ✓; 37 fields, as the 5:51 text says ✓ | — | green · 9,259 ✓ | -416 ✓ · 3,498 ✓ |
| 6-1 | "No such file"; grep empty ✓ | E-2, E-3 red | green · 9,258 | · 3,495 |
| 6-2 | Grep empty; "No such file" ✓ | — | green · 9,258 ✓ | -468 ✓ · 3,495 ✓ |
| 7-1 | **`GroupBand.tsx:178`, `group-band.css:42`, `table-view.css:60` (`group-band-drop-outline`)**; host return 36 ✓ | — | green · 9,258 | · 3,495 |
| 7-2 | Grep empty ✓ | Tab-stop red | green · 9,259 | · 3,495 |
| 7-3 | Grep empty ✓ | — | green · 9,259 | · 3,494 |
| 7-4 | Both greps empty ✓ | — | green · 9,259 ✓ | -454 ✓ · 3,493 ✓ |
| 8-1 | `viewMenus.ts:100`, `:132` alone ✓ | — | green · 9,259 | · 3,493 |
| 8-2 | Grep empty ✓ | — | green · 9,259 | · 3,494 |
| 8-3 | Grep empty ✓ | — | green · 9,259 ✓ | -390 ✓ · 3,493 ✓ |
| 9-1 | Both greps empty ✓ | — | green · 9,259 ✓ | -390 ✓ · 3,493 ✓ |
| 10-1 | Grep empty ✓ | 3 of 3 red | green · 9,259 ✓ | -387 ✓ · 3,493 ✓ |
| 11-1 | Atlas 17 of 17 ✓; document grep empty ✓ | — | green · 9,259 ✓; `npm run build` printed `✓ built in` three times | -387 (+3324 / -3711) ✓ · 3,493 ✓ |

**End State:** `git diff a0740a60b` and `git diff --cached a0740a60b` printed nothing, and `git diff --stat cae07c129 -- Core/Sync Sync` printed nothing. Every Net Ledger Estimate and Tests cell, and every Comment Ledger Count and Change cell, reads as measured at its phase's head. The Change column also equals the phase's patches counted with the Constraints' comment pattern: 0, -3, +1, -4, -13, -3, -2, 0, 0, 0, 0.

**Pins:** each was reddened by reverting code, never the test. The test file was then run, and the file was restored from the index. All twelve went red. The 3-1 Layout-leaf pin went red under the Fold Ledger's `{ id: 'layout' }` revert, which reddens the Table and Cards cases together, and also under a Cards-only revert, which reddens the Cards case alone.

#### Findings

1. **High — Task 5-1's VERIFY can't pass at Task 5-1's head.**
   - **Where:** plan `:606`.
   - **What's there:** the grep `RenamablePageName|PageNameRename|pendingSeat|strandedEditId` "prints nothing". But `pendingSeat` lasts until 5-2, as the task's own prose says ("its `pendingSeat` goes with Task 5-2's held create"), and so does the Build Log. At 5-1's head the grep prints `Core/Views/Cards/CardsView.tsx:149` and `:289`. An executor working to "each task commits once its VERIFY passes" either stalls, or clears the line by pulling 5-2's held create forward into 5-1.
   - **Fix:** move `pendingSeat` from 5-1's grep into 5-2's, where it prints nothing.
   - **Verified:** ran, at the replay's 5-1 and 5-2 heads and again at `2631dfa33` and `e709bda07`.

2. **High — Task 7-1's VERIFY can't pass at Task 7-1's head.**
   - **Where:** plan `:693`.
   - **What's there:** the `drop-outline` alternative also matches `group-band-drop-outline`, the band head's button class that Task 7-2 removes (7-2's own VERIFY at `:706` greps for exactly that). At 7-1's head the grep prints `GroupBand.tsx:178`, `group-band.css:42`, and `table-view.css:60`. An executor either stalls or pulls 7-2's button removal forward into 7-1.
   - **Fix:** use the pattern `DropOutline|openHeadingRows|listed-outline|data-drop-outline|--drop-outline`. It prints nothing at `860ae0f7d` and still hits all six base occurrences across the two drives.
   - **Verified:** ran, at the replay's 7-1 head and at `860ae0f7d` and `cae07c129`.

3. **Medium — Phase 1's ledger checks sit on Task 1-1, and the phase's last task runs no gate.**
   - **Where:** plan `:404`, `:286`, and `:414`.
   - **What's there:** `:404` puts "Run the gates; the ledger checks read their rows" on 1-1, but `:286` defines the ledger checks as belonging to "a phase's last VERIFY", and 1-2 (`:414`) carries only its grep. At 1-1's head the comment count reads 3,518 against the Comment Ledger's 3,517: GroupFrame's reason arrives at 1-1, and `ViewHost.tsx`'s line leaves only at 1-2. The Actionable also reads +9 (+139 / -130), not the row's +143 / -134. An executor applying "a phase over its row corrects before it closes" may cut the reason the log asked for. Meanwhile 1-2 commits ungated.
   - **Fix:** 1-1 keeps "Run the gates."; the ledger-check line moves to 1-2.
   - **Verified:** ran. The count is 3,518 at 1-1 and at `4e97c8e74`, and 3,517 at 1-2.

4. **Low — Five VERIFY and pin cells an executor can't run as written.**
   - (a) `Pins.md`'s second 10-1 pin is named "an immovable row's Space runs its own action in place of a lift". The test is actually named "runs an immovable row's own Space in place of a lift, and its opener on Enter" (`UIX/Interactions/engine.test.tsx:1086`), so a `-t` run by the listed name selects nothing.
   - (b) The first 3-1 pin's revert describes a state ("The Cards leaf shows switches alone, as at the parent head"), not a code revert. Changing `ViewEditor`'s Layout routing to `pane === 'layout' && view.type === 'cards' ? { id: 'layout' } : …` reddens the Cards case alone.
   - (c) Task 2-3's VERIFY (`:467`) names `Host/liveView.test.ts`, but the file is `liveView.test.tsx`. Vitest's filter still matches it; a path lookup doesn't.
   - (d) Task 3-1's VERIFY (`:490`) writes `\b` under `-E`, where `:286` says a `\b` grep runs under `-P`. It printed nothing either way.
   - (e) Task 10-1's VERIFY names one pin, "the pin for a locked row's missing description", but `Pins.md` lists three for the task.
   - **Fix:** rename (a); write (b) as code; correct (c)'s extension, (d)'s flag, and (e)'s count.
   - **Verified:** ran (all reverts, the name greps, and both grep forms).

5. **Low — The Comment Ledger's Phase 10 cell names comment rewrites the patch doesn't make.**
   - **Where:** plan `:44`.
   - **What's there:** "Rewrites in place: `measureLine`'s and `useLineRow`'s lines". Phase 10's patch adds and removes no comment line: 0 and 0 under the Constraints' pattern, and no `*` continuation line either.
   - **Fix:** change the cell to "None".
   - **Verified:** ran.

6. **Low — *§Reconciliation* files drive lines under the wrong tasks and misses six documents the docs patch rewrites.**
   - **Where:** plan `:891`, and the Documents list under `:877`.
   - **Drive lines:** `:891` reads "`live-drive.mjs:591, 631-640, 1222, 1248, 1722` — with Tasks 3-4 and 4-3". All of those land in 4-1 except `:1248`, which lands in 4-3. The Archive Drive also changes in other tasks:
     - 3-3: the hunk at `:1064` and `MATRIX.md`'s at `:117`.
     - 4-1: the hunk at `:1737` and `MATRIX.md`'s at `:69` and `:172`.
     - 7-1: hunks at `:81`, `:1384`, and `:2253`, and `MATRIX.md`'s at `:147` and `:210`.

     The Properties Drive changes in 3-4 (`MATRIX.md` at `:220`) and in 7-1 (`live-drive.mjs` at `:905`).
   - **Documents:** the list omits six files that Phase 11's patch rewrites: `ConfigurationPM.md` (the Hide Disclosure Chevrons caption), `InterfacePM.md`, `MarkdownPM.md`, and `Guidelines/Development-Environment.md`, `Editor-Internals.md`, and `Web-Guests.md`.
   - **Fix:** name the four tasks the drives follow, and list the six documents.
   - **Verified:** read the patches' hunk headers.

7. **Low — Five *§Concepts* rows the head contradicts or lacks.**
   - `naming` (`:126`) says "the row being named and whether it is a create", while the head and Task 5-1's prose carry `{ id, create, landing }`.
   - `data-view-lead`'s Location (`:153`) omits `Core/Views/Bands/GroupBand.tsx`, where `"band"` is set.
   - `CARD_ROW_LOOK`'s REMOVED row (`:174`) names `ROOT_ROW_LOOK` as its replacement, but `ROOT_ROW_LOOK` (`UIX/Menus/frames.css.ts:28`) has no ADDED row.
   - `memberIndent(kind, depth)` (Task 6-2, decision 6.6) and the newly exported `StableHandlers` (Task 5-3's prose) have no ADDED row either.
   - *Plan Reviews*' S14 line still says the look is "exported from `viewKinds.ts`", while the Fold Ledger and the head put it in the frames sheet, for the cycle reason.
   - **Fix:** amend the two rows, add the three, and correct the S14 line.
   - **Verified:** ran (diffed the base's exports against the head's, and swept every Concepts row against `a0740a60b`).

8. **Low — The Placements table misses two test files that follow no moved file.**
   - **What's there:** `UIX/Pickers/FieldPicker.test.tsx` is split out of the shell's test at 9-1, and *Run Notes* call it "a placement to approve". `Core/Nexus/schemas.containerConfig.test.ts` becomes `schemas.viewButton.test.ts` at 2-1. Neither sits in a row, while `:281` exempts only tests that follow the file they test, and says "no other is created".
   - **Fix:** add both rows so the morning approval sees them.
   - **Verified:** ran `git diff --name-status -M cae07c129 a0740a60b`; every other addition, deletion, and rename matches a row, and every row has its file.

9. **Low — The Decision Map's D-1 row omits Task 8-1.**
   - **Where:** plan `:70`.
   - **What's there:** D-1 maps to 5-1 alone. But the dropdown's and the tile's view-name renames adopt the surface-held shape at 8-1 (`ViewListRow` takes `rename: Omit<NameRename, 'path'>`), as 5-1's own prose says they will.
   - **Fix:** change the cell to "Task 5-1; Task 8-1 for the view-name renames".
   - **Verified:** read.

#### Unsure

- **The Properties Drive's E and F groups** are still unrun, since this brief rules out launching the app, so Wave One's Unsure stands. Task 3-4 changes its `MATRIX.md`, and Task 7-1 its `live-drive.mjs`. The check is the plan's own: run both groups from a worktree of the head.
- **On-screen behavior** wasn't driven: the held ghost, Hide Disclosure Chevrons on the Location tree, and the band head's Tab path. Each was read, and its pin or test ran.
- **The Wave Two Fold Ledger** that the 5:51 *§Deviations* cites doesn't exist yet; presumably the fold writes it.

#### Holds

- **`naming.landing` (S3):** five throwaway cases ran on the 5-1 head, appended to `useViewHost.test.tsx`, run by `-t`, with the file then restored from the index. All five passed:
  - With two creates in flight, the first refused keeps the second named and landing.
  - If the first lands and settles mid-flight, the second is untouched, and the second's own refusal clears it.
  - A field ended mid-flight stays closed when its row lands.
  - A landed newborn that a later push removes clears its naming.
  - Renaming an existing row mid-create survives the create's settle.

  The settle checks `n?.id === id`, so no flight's end touches another's naming.
- **`submitRename` (S13):** `RenamableTitle`'s commit calls `cancelRename()` and passes `renamingCreate`, which is what the base's in-slice read and clear did. The other two callers, `PageMenu` and `SettingsFrame`'s header, hold local state, so their commits no longer clear an unrelated fence. The view's page-menu Rename routes to `host.beginNaming`.
- **`shownLabel` (S5):** all twelve call sites print the base's exact words. As at the base, the main dropdown offers no Titles row and both of the tile's menus do.
- **`commitGroupValue` (S4)** reads the same `rowById`, `resolveColumn`, and `groupKeyToValue` it read in the host, and both of its callers sit in the interactions.
- **`renameOf` (S2):** with `onBegin` undefined, `RenamableLabel` draws no double-click entry, and `rowMenu` returns when the tile is locked. A lock that arrives mid-rename drops the commit in `editViews`, as ruled.
- **`useDisclosureSet` (S12):** the leads set flips exactly as the base's hand-rolled `narrow` did, and resets on the query.
- **`orderSetTree` (S9):** `order?.length` covers both `undefined` and `[]` at both callers.
- **`StableHandlers` (S10) and `ROOT_ROW_LOOK` (S14):** typecheck is clean. `ROOT_ROW_LOOK` is a plain object, and the final head's build passed, so the `.css.ts` export Wave One's pre-fold build never saw holds.
- **`data-view-lead="band"` (A3):** `resolvePeekAnchor` treats any value but `row` as a zone, and `headLead` matches `"head"` alone.
- **The pipeline:** `pruneGroups`' `drops` equals the base's three passes under a filter, under Hide Empty Groups, and under hidden sub-buckets, including a Set that's empty before any filter applies.
- **`rowLead`:** the menu trees' indent went from `8 + 14·depth` px to `calc(8px + var(--disclosure-indent) * depth)`, and that variable is set on `:root` at 14px, so it reaches portals too. The Rejections' picker spacing holds.
- **The I-070 arm, the held ghost, and the Bundle chevron:** each pin or suite ran green at its head and red under its revert.
- **Decision Map and Behavior Changes:** every other Decision Map row matches the task that delivers it, and so does each Behavior Change that a pin, a drive edit, or a patch hunk I read covers: 5, 8a, 16, 16a, 17, 20, 20a, and 22. I didn't trace the rest against their patches.

#### Teardown

The replay worktree (`scratchpad/wt-exec`) was removed with `git worktree remove --force` and `git worktree prune`. The scratch folder (`scratchpad/w2x`: harness, logs, delta saves, throwaway test text, and plan snapshots) is deleted. `git worktree list` shows the main checkout and the chain's `wt-base` alone; `wt-base` is still at `a0740a60b` and clean. No vitest or build process remains. The main checkout's `git status --short` shows only the untracked planning folder, this report included, and nothing under the Studio's `.claude/dashboard` changed.
