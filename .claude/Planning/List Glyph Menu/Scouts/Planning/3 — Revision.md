### 3 — Revision — Planning Report

**BASE:** `cd813afdd` · **PATCH:** `3 — The Revised Patch.patch` (supersedes `1 — The Patch.patch`)

Built in a detached worktree at `cd813afdd` (`~/The Studio/Projects/Pommora-LGM-C`, since removed) with the first patch applied, then revised. "Patched" cites name the hunk by its function. Every "→" in *§Edge Cases Verified* is observed through `vite-node` or a throwaway vitest file against the revised modules, and the throwaway was deleted before the gates ran their last time.

#### Changes From the First Build

P3-R1. **The `'count' | 'restart'` signal is gone; B-9 reads the old markers.** `Relist`, the `RELIST` record, and the `input.list.restart` event are removed, and `relist` goes back to the base `boolean` in `Edit` and `FormatEdit`. The 1-T10 loop in `listRenumber` already walks the changed lines' old markers (patched, `listRenumber`), and it now also records a line whose numbered or lettered marker the change wrote over whole (`fromA <= markerStart && toA >= contentStart`) as *re-picked*. `renumberRuns` takes those line starts where it took the `restart` flag, and a run holding one counts from 1 or A (patched, `renumberRun`'s `start`). Only a list-type pick writes over a whole marker. Tab and Shift+Tab move only the indent in front of it (`Core/MarkdownPM/Input/edits.ts:174`, `:186-194`), and Enter writes a new line (`edits.ts:102`). So `5. a` plus `b` stays `6. b`, and a re-pick still restarts its run. The restart is now per run rather than per edit, which is what B-9's "their run" says. The flag version restarted every run a pick touched once any of its items had been numbered. `edits.ts` reverts entirely, apart from the `export` in P3-R3, which takes back Biome's six-line wrap of Enter's return and the import. Line effect: `edits.ts` 0 (was +7), `listRenumber.ts` +10 (was +8), `listDragModel.ts` +21 (unchanged).

P3-R2. **The pinned test goes back to today's base.** `'a run that began past 1 keeps its base'` again pins `5. a\nb` → `5. a\n6. b` (P3-T5). The four `relist: 'count'` test literals go back to `relist: true`.

P3-R3. **Scope is read once per reader.** `splitPrefix` reuses `blockPrefix` (`edits.ts:63-64`, now exported), the existing "a cell draws no quote" rule, in place of a second `scope !== 'page'` (patched, `splitPrefix`, three body lines against base's four). `listReach` reads `const page = scope === 'page'` once, for both the marker read and the sealed-line skip (patched, `listReach`). The bare comparisons this work adds go from three to one.

P3-R4. **No defaults on the pure functions.** `editFor`, `setList`, `listKindOf`, and `readFormatState` take `settings` and `scope` as required parameters. Their only default-relying callers were tests, so eight defaults (four `= 'page'`, four `= {}`) go, at no production line cost because each sat on its own signature line. `applyEditorAction` keeps `scope = 'page'` (P3-S2).

P3-R5. **The live glyph menu lives in `editorMenu`.** `menu.ts`'s `contextmenu` handler already held the scope, the click-time range, and the document-identity guard. A glyph target now swaps the format ask for `host.menus.grip({ kind: 'glyph', current })` and prevents the default. Its reply goes through the same list-row branch (patched, `editorMenu`). The extra cost is a glyph lookup, a `preventDefault`, and the menu ternary. `popGlyphMenu`, the glyph branch in `gripMenu`'s `contextmenu`, the exported `clickRange`, and `gripMenu`'s import of `./menu` are all removed. `gripMenu` keeps only the glyph's right-press suppression (A-9). Its handler comment drops the claim that a cell's first glyph sits in the grip's band (A-5), rewritten in place. `applyEditorAction`'s range parameter now destructures with the live selection as its default (`{ from, to } = view.state.selection.main`), which removes the `sel` and `range ?? …` lines. Line effect: `gripMenu.ts` +11 (was +29), `menu.ts` +17 (was +15).

P3-R6. **The resting cell has one menu flow.** The glyph branch and the general branch both computed a range, popped a menu, and handed the pick to `restingAction`. Now they share that path: a glyph supplies `{ offsetNode: glyph, offset: 0 }` (its marker's start, through `cellOffsetAt`) where the general menu supplies the caret position from the point, and `restingRange` takes that position in place of `x, y` (patched, `restingMenu`, `restingRange`). The `listKindOf` import goes, since `readFormatState(...).list` already is the check. Line effect: `cellStatic.tsx` +12 (unchanged), with one menu flow in place of two.

P3-R7. **The docs follow the build.** `.claude/Features/MarkdownPM.md:24`'s last sentence is rewritten as one sentence. The first build's `:105` clause is struck, and `:146` keeps its three-word "a list glyph" addition, so that's two touches. `Editor-Internals.md:40` is rewritten in place (P3-R8). I-037 reads 22 compares and 14 defaults (P3-Q2). `ConfigurationPM.md` keeps the first build's row, and `Core/Settings/frames.ts` carries a caption-less toggle.

P3-R8. **`Editor-Internals.md:40` now states the one rule:** every list-type pick says `input.list`. A line whose marker the edit wrote never sets a top-level run's start. A numbered or lettered marker written over whole is a re-pick, which restarts its run. Tab and Shift+Tab only move the indent, so a moved item keeps its base. Siblings are one walk, read by numbering, the drag, and the switch. The grip's self-counting clause goes.

#### Simplifications Weighed

P3-S1. **The restart read from the old markers instead of a signal:** taken (P3-R1). The check came out clean: with `repicked` stubbed to never restart, all 1,985 MarkdownPM tests (before P3-T8 existed) still passed. So the signal's one observable is a pick over numbered items that misses some of the run, and only P3-T8 pins it. A variant that left re-picked lines out of `arrived` would have let the writer's `1.` set the base with no new parameter, 3 lines shorter. It was declined because it couples the renumber to the writer's ordinal.

P3-S2. **Scope without the `= 'page'` defaults:** taken for the four pure functions, declined for `applyEditorAction`. Its other callers are the format chords (`Core/MarkdownPM/Input/formatKeymap.ts:22`, mounted on page, cell, and value editors through `useReconfigured`), the paste-literal command (`Core/Actions/commandRouter.ts:71`, on whatever editor holds focus), and the page's `/` menu (`Core/MarkdownPM/Menus/useBlockMenu.ts:50`). None of them knows its scope, and only the `/` menu sends a `list:` row. A required parameter would make two of them invent a scope, which is the same defect written as a literal. No facet holds the scope today (`linkSettle` takes it as a plugin argument, `Core/MarkdownPM/surface.ts:55`), so adding one would be I-037's own solution. Against base, I-037's counts move from 21 compares and 13 defaults to 22 and 14. The first build moved them to 24 and 18.

P3-S3. **`gripMenu` as a factory:** kept. The grip's Type ▸ rows and `contextFor`'s check run the switch over the block, and in a cell the page-shaped `blockAt` can sweep a `> - b` line into a list block (`Core/MarkdownPM/Engine/blockModel.ts:43-58`), where C-5 needs the cell's reading. `gripMenu(scope)` matches its siblings in `blockGestures` (`listDragExtension(scope)`, `listRenumber(scope)`, `blockHandles(scope)`, `pointerReveal(scope)`, `surface.ts:25-38`). The cost is 51 lines of whitespace-only re-indentation.

P3-S4. **The grip's Type ▸ rows through `applyEditorAction(view, action, scope, block)`:** declined. `applyEditorAction` focuses the view, and `'acting on a grip takes no focus for the editor'` (`Core/MarkdownPM/Menus/gripMenuFlow.test.tsx:187-193`) pins that it doesn't.

P3-S5. **A `preserve: boolean` parameter in place of `settings`:** declined. It would drop two `Personalization` imports, but it puts a list-only boolean flag on the generic `editFor` dispatcher.

P3-S6. **One glyph selector for both surfaces (`GLYPH_CLASS` on the resting `MarkerGlyph` spans):** declined. `MarkdownTable.tsx:163`'s sweep gate skips presses on `.md-list-glyph`, and `markdown-pm.css:483` gives it `cursor: grab` and `user-select: none`, so a resting glyph would change how the table's sweep and selection behave. The resting cell keeps `.md-list-item > [data-src]`.

P3-S7. **A separate `import type { MarkdownScope }` to dodge `gripMenu.ts`'s six-line import wrap:** tried and reverted. No other file imports `detect` twice, so it would be the odd one out.

P3-S8. **A shared helper for the identity guard (`opened` / `view.state.doc === opened`):** not needed. Moving the glyph into `editorMenu` leaves one copy on the live side. The grip re-finds its block and compares its text instead (P1-Q7, accepted), which is a different guard for a different target.

P3-S9. **`selectedLines`' literal `'page'` for `readLine` (patched, `selectedLines`):** kept. Its only caller is `setHeading`, which only the page's Heading ▸ and the heading gutter reach, and the literal states that. Threading a scope there would add a parameter to every heading writer for a surface that has no headings.

P3-S10. **`renumberRun`'s empty-rows guard, `renumberRuns`' position guard, and `itemOf`'s continuation walk:** each traced to a producer and kept. `runAt` returns `[]` for an unsequenced line, which would make `Math.min()` return `Infinity`. The renumber hands positions from deletions, and base's `renumberRun` carried the same guard. B-14's continuation needs the walk.

#### Gates

P3-G1. `npm run typecheck`: passes (UIX, Core, Core src, Desktop node and web, Sync, and the Studio dashboard), exit 0.
P3-G2. `npm run test`: 549 files, 9,111 passed, 2 skipped, exit 0. That's base's 9,109 plus P3-T7 and P3-T8.
P3-G3. `npm run lint`: 1,433 files checked, no fixes applied, and the comment-wrap and name-mention scans passed, exit 0.

#### Tests Changed

P3-T1. `'re-applying the same kind clears it'` → `'re-applying the kind an item already has changes nothing'` (C-3, carried from P1-T1) — `Core/MarkdownPM/Input/format.test.ts:165-167`
P3-T2. `'clears only where every line already reads that way'` → `'leaves the items already of the kind and makes the plain lines items'`; the mixed half keeps its expectation (C-3, B-7, carried from P1-T2) — `format.test.ts:186-191`
P3-T3. The `setListKind` describe becomes `'setList over a whole block'`, with all six expectations unchanged (D-2, B-9; carried from P1-T3) — `format.test.ts:234-264`
P3-T4. **Mechanical, signatures:** `setList`, `listKindOf`, `editFor`, and `readFormatState` calls take a scan where they took a string, and pass `{}, 'page'` now that those parameters are required (P3-R4). No expectation changes — `format.test.ts:72-73`, `:158-232`, `:242`, `:264`, `:485-490`; `Core/MarkdownPM/Input/formatState.test.ts:8-74`; `Core/MarkdownPM/Input/listRenumber.test.ts:95`; `Core/MarkdownPM/regressionPins.test.ts:175`. `renumberRuns` takes a scan — `regressionPins.test.ts:183`, `Core/MarkdownPM/Engine/listDragModel.test.ts:170`, `:174`
P3-T5. `'a run that began past 1 keeps its base'` (`5. a\nb` → `5. a\n6. b`): the first build had rewritten it to `1. a\n2. b`, and it's back to base under B-9 — `listRenumber.test.ts:105-107`
P3-T6. `'a nested line continues its own level'`: the input gains a blank line (`1. a\n  1. b\n\n  c`), because under B-14 an indented line directly under `  1. b` is its continuation. The pinned behavior, an indented plain line becoming an item at its level and joining that run, still holds (carried from P1-T6) — `listRenumber.test.ts:111-113`
P3-T7. **Added, 1-D8:** `'switching a numbered item out of its run recounts the run below'` (`- p\n\t1. a\n\t2. b\n\t3. c`, b → Bulleted → `\t1. c`), in the "run it left" describe — `listRenumber.test.ts:73-75` (patched, `listRenumber.test.ts:76`)
P3-T8. **Added, B-9:** `'a pick over numbered items restarts their run from 1, past the items it missed'` (`5. a\n6. b\n\n7. c`, first block → Numbered → `1. a\n2. b\n\n3. c`). It's the only observable the re-pick read produces: it goes red with the restart stubbed out, while every other test stays green (P3-S1). It sits beside the base-keeping pin inside `describe('Lists ▸ continues the run a line joins')`, whose name now covers it only in part, so it can move when that describe is next touched — `listRenumber.test.ts:105-107` (patched, `listRenumber.test.ts:114`)
P3-T9. `listKind:` → `list:` (D-2, carried from P1-T9) — `Core/MarkdownPM/Menus/gripMenuFlow.test.tsx:83`, `:91`, `:94`, `:189`; `Core/Actions/gripMenu.test.ts:54-58`
P3-T10. The bare view in the fenced-line chord test gains `editorHost.of(testHost())`, since `applyEditorAction` reads the host's settings (carried from P1-T10) — `Core/MarkdownPM/Input/formatKeymap.test.ts:38-44`
P3-T11. `'enters with the caret in the slot Bold writes at a point on a list glyph'` → `'answers a list glyph with its type menu and commits the pick at rest'` (`- ab`, Numbered → `1. ab`, still resting, default prevented). A-1 and A-8 replace the format menu on a glyph (carried from P1-T11) — `Core/MarkdownPM/Tables/cellRestingMenu.test.tsx:262-268`
P3-T12. **Reverted from the first build:** `relist: 'count'` → `relist: true`, back to base — `listRenumber.test.ts:130`, `:136`; `regressionPins.test.ts:133`, `:156`

#### Edge Cases Verified

P3-E1. `5. a\nb`, Numbered on b → `5. a\n6. b` (B-9, count).
P3-E2. `- B\n3. X\n- E`, B Numbered (on) → `3. B\n4. X\n5. E`. The first build gave `1. 2. 3.` (P1-E3), and B-9 now gives this. No test pinned the old result.
P3-E3. `5. a\n- b\n7. c`, selection on b → Numbered → `5. a\n6. b\n7. c` (count).
P3-E4. `1. a\n2. b\n\n3. c` and `5. a\n6. b\n\n7. c`, grip on either block → Numbered → `1. a\n2. b\n\n3. c` (B-9 restart past the blank line, P1-C1).
P3-E5. `3. a\n4. b\n7. c` by range or grip, and `1. a\n1. b\n1. c` by grip → `1. a\n2. b\n3. c` (repair).
P3-E6. `5. a\n6. b\n7. c`, selection on b → Numbered → `1. a\n2. b\n3. c`; a caret on a → Numbered (the group) → the same (re-pick restarts its run).
P3-E7. `5. a\n6. b`, grip → Alphabetical → `A. a\nB. b`.
P3-E8. `1. a\n2. b\n3. c`, b → Bulleted → `1. a\n- b\n3. c`; nested `- p\n\t1. a\n\t2. b\n\t3. c` → `\t1. a\n\t- b\n\t1. c` (B-10, 1-T10).
P3-E9. The *§Decisions* example, B Numbered (on) → `\t1. B … \t2. E` with C and D unchanged; E Numbered (off) → `\t1. B\n\t\t1. C\n\t\t2. D\n\t2. E` (B-1, B-3).
P3-E10. Cell scope, `> a` → Bulleted → `- > a`; page scope → `> - a` (C-5, now through `blockPrefix`).
P3-E11. `- a\n  wrapped\n- b`, caret on `wrapped` → Numbered → `1. a\n  wrapped\n2. b` (B-14).
P3-E12. **Live page glyph, through `editorMenu` in a mounted editor:** `Tail.\n- A\n\t- B\n\t\t- C\n\t- E\n- F`, a `contextmenu` on B's `.md-list-glyph` → the grip menu is asked `{ kind: 'glyph', current: 'bullet' }`, the format menu isn't asked, the default is prevented, and the pick `list:ordered` → `- A\n\t1. B\n\t\t- C\n\t2. E\n- F`.
P3-E13. **Behavior change from the first build:** a glyph pick on a live editor now focuses the view afterward, as every **Lists ▸** pick already does through `applyEditorAction` (`Core/MarkdownPM/Menus/menu.ts:22` at base). The first build's `popGlyphMenu` didn't focus. The glyph menu now also opens only where the host offers the format menu, which an `inert` host doesn't (`Core/Pages/editorHost.tsx:106`), so a read-only snapshot shows neither menu (A-6).
P3-E14. Shift+Tab on `5. a\n\t1. b\n6. c` → `5. a\n6. b\n7. c`, and Enter on `5. \n6. b` → `5. \n6. \n7. b`, both unchanged. Their existing pins (`listRenumber.test.ts:73-74`, `:82-84`) pass, since neither edit writes over a whole marker.

#### What Contradicts the Decisions

P3-C1. None. B-9's "reaches items already numbered or lettered" and the build's "wrote over a numbered or lettered marker whole" pick out the same items, because `setList` rewrites every numbered or lettered item it reaches, whatever the picked type (patched, `setList`'s `isSequenced(lm) ||`). A-5 holds with no handler ordering, since the glyph's handler runs at `editorMenu`'s lowest precedence, after the grip's band has had its chance.

#### Open Calls for Nathan

P3-Q1. **Should picking a type from a glyph's menu put the cursor back in the page?** **Lists ▸** already does. The glyph's menu now shares that path, so it does too, where the first build left focus where it was. **Recommended:** accept it; the two picks act the same, and the grip, which acts on a block, keeps taking no focus.

P3-Q2. **One new "assume it's the page" fallback stays.** The menu runner that the shortcut keys, the paste command, and the page's `/` menu share can't tell which surface it's on, so it assumes the page unless told otherwise. Only the `/` menu sends it list types, and that menu is the page's own. Removing the fallback needs I-037's fix, which gives every editor a way to know its own surface. The scope-count issue I-037 now reads 22 checks and 14 fallbacks, against 21 and 13 today and the first build's 24 and 18. **Recommended:** accept it and leave the rest to I-037.

P3-Q3. **Re-picking a type that's already correct takes an undo step with no visible change.** Picking Numbered over an already-correct `1. a\n2. b` rewrites the markers, and the renumber puts the same numbers back, so ⌘Z undoes nothing visible (P1-E10). The switch can't know the right number before the renumber does, so it can't skip those items. **Recommended:** accept it.

P3-Q4. **Carried from P1-Q8:** `Engine/listDragModel.ts` is now the list model as a whole: siblings, branches, runs, and moves. Renaming it to `listModel.ts` would make it easier to find. **Recommended:** approve the rename, as its own change.

#### Comment Ledger

P3-L1. Removed: `listMarkerLines`' doc — `Core/MarkdownPM/Input/format.ts:316`
P3-L2. Removed: `setListKind`'s doc — `format.ts:339`
P3-L3. Rewritten in place: `setList`'s doc states the write rule and B-9's split between restarting and counting on — `format.ts:298` (patched, `setList`)
P3-L4. Rewritten in place: the caret-placement note — `format.ts:310` (patched, `setList`)
P3-L5. Added: `listReach`'s doc, the addressing rule (patched, `listReach`)
P3-L6. Moved: the item-indent note into `readLine` — `format.ts:279` (patched, `readLine`)
P3-L7. Rewritten in place: the glyph comment names `drawnKind` and the `+` rule — `Core/MarkdownPM/Engine/intents.ts:121`
P3-L8. Added: `siblingsAt`'s doc, carrying the blank-line and quote rules split out of `renumberRun`'s comment (patched, `siblingsAt`)
P3-L9. Rewritten in place: `renumberRun`'s comment keeps only the base rule — `Core/MarkdownPM/Engine/listDragModel.ts:167`
P3-L10. Rewritten in place: `renumberRuns`' doc names `repicked` — `listDragModel.ts:147`
P3-L11. Moved: the continuation note into `rolesAgainst` — `listDragModel.ts:48`
P3-L12. Rewritten in place: the renumber header names the old-marker gate and the re-pick restart — `Core/MarkdownPM/Input/listRenumber.ts:13`
P3-L13. Rewritten in place: the right-press comment covers the glyph, and the first build's cell-band clause is gone — `Core/MarkdownPM/Menus/gripMenu.ts:121`
P3-L14. Re-indented, unchanged: the two action-chain comments — `gripMenu.ts:154`, `:168`
P3-L15. Rewritten in place: `applyEditorAction`'s doc — `Core/MarkdownPM/Menus/menu.ts:14`
P3-L16. Rewritten in place: `editorMenu`'s doc adds the glyph's type menu — `menu.ts:25`
P3-L17. Rewritten in place: the click-time comment carries the list-row exception — `menu.ts:32`
P3-L18. Rewritten in place: the heading-state comment — `Core/MarkdownPM/Input/formatState.ts:19`
P3-L19. Rewritten in place: the resting cell's toggle comment covers the type menu — `Core/MarkdownPM/Tables/cellStatic.tsx:479`

Against the first build, the `Relist` doc is gone (`listRenumber.ts:8` keeps base's `RELIST` doc untouched) and `editorMenu`'s doc is rewritten. Net: two removed (P3-L1, P3-L2) and two added (P3-L5, P3-L8), so the count is unchanged, with 18 comment lines out and 18 in.

#### Net

Production code **+116 (+390 / −274)**, against the first build's +139 (+406 / −267). Comment lines are flat, so code alone is also +116. Whitespace-only re-indentation is the gap between the two numstats: 67 lines on each side (+323 / −207 under `-w`), 51 in `gripMenu.ts`'s factory, 6 each in the menu ternaries of `menu.ts` and `cellStatic.tsx`, and 5 in `format.ts`, with `listDragModel.ts` one line the other way. Tests **+31 (+100 / −69)**, against the first build's +24: P3-T8's three lines and four lines of Biome wrapping P3-R4's required arguments in `format.test.ts`. Docs **+1 (+10 / −9)**.

- **Setting** (`api.ts` +1, `frames.ts` +1, `personalization.ts` +1): +3. The key, the row, and the editor's read of it.
- **Write side** (`format.ts` +37, `listDragModel.ts` +21, `listRenumber.ts` +10, `intents.ts` +6, `formatState.ts` +1, `edits.ts` 0, `detect.ts` −3): +72, against the first build's +79. It buys:
  - the one switch with its reach rule (B-1–B-8, B-12, C-1, C-3, D-1, D-2);
  - the one sibling walk shared by numbering, the drag, and the switch (B-5, B-6, B-11);
  - the re-pick read (B-9);
  - the old-marker gate (1-T10);
  - `drawnKind` (B-13);
  - continuation, sealed-line, and callout-head handling (B-14, A-10);
  - the cell's reading of `>` through the existing `blockPrefix` (C-5).
  It removes `setListKind` and its counters, `listMarkerLines`, the toggle-off, `nestedUnder`, the indent-text sibling walk, and `subBlockAt`'s private classification.
- **Entry side** (`menu.ts` +17, `cellStatic.tsx` +12, `gripMenu.ts` +11, `Actions/gripMenu.ts` +1, `surface.ts` 0): +41, against +57. It buys:
  - the glyph's type menu on a live editor and at rest, each folded into its surface's existing menu flow (A-1, A-8);
  - the click-time range and stale guard for list rows (C-2);
  - the grip's rows through the one switch (D-1);
  - the shared row builder and the `'glyph'` context (A-2).
  It removes the grip's raw undo-bypassing dispatch, the `listKind:` action name, and the second Type-row builder.

The growth beyond the +27 estimate is the switch's reach rule, which the estimate didn't price, and Biome's signature wraps.
