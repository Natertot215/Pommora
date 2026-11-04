### 9 — Folds — Planning Report

**BASE:** `cd813afdd` · **FINAL:** `Phases/Final.patch` (folded)

The phases were rebuilt from `cd813afdd` in a detached worktree (`~/The Studio/Projects/Pommora-LGM-G`, since removed): each original phase patch applied with `git apply --index`, its folds made on top, the three gates run, and the tree checkpointed with `git add -A && git write-tree`, with no commit. Every patch in `Phases/` is now `git diff -M <previous tree> <this tree>`, and `Final.patch` is `git diff -M <base> <final> -- Core Desktop UIX Sync ':!*.test.*'`, the same commands that reproduce the original seven byte for byte. The seven folded patches replay in a scratch index onto `cd813afdd` to the checkpoint trees `1a79b1d1`, `2352083b`, `922624b7`, `13efd55f`, `107f9370`, and `0fef1612` (final). **Production** means `Core`, `Desktop`, `UIX`, and `Sync` minus `*.test.*`; **excluding comments** drops changed lines matching the comment regex, as `view-delta`'s Actionable column does. Line effects below are against the original patch of the same phase.

#### Folds

F-1. **S-1 / A-1:** taken. Phase 2, `Input/format.ts` (`listReach`): the item owning the anchor is found once by a backward walk, and the range branch is one forward pass carrying the current item and its branch end (`[item, end] = [k, endOf(k)]`), with a blank line clearing it; `itemOf` is gone. A differential probe over 13 shapes (wrapped lines, quotes, fences, display math with a blank inside a branch, callouts, tables, loose lists), every `from`/`to` pair, both settings, both scopes, and two kinds compared `setList` before and after: 55,776 cases, 0 differ. The first draft didn't match the old walk on display math holding a blank line (682 cases), and the walk now mirrors `itemOf` exactly. About −1 line by reading; the timings are *§Measurements*.

F-2. **A-4:** taken. Phase 2, `format.ts`: `listReach`'s `sealed` also refuses a page line whose `FenceInfo.role` isn't `'content'`, beside the callout head, and the doc sentence is rewritten in place ("a code block's lines only by a pick wholly inside it, and math, tables, a callout's head and a fence's delimiters never are"). `readsFrom` is unchanged, so numbering and `rolesAgainst` still read a fence's delimiters as the block's own lines. About +2 (the closure wraps to four lines).

F-3. **A-5:** taken. Phase 2, `format.ts`: `upTo` is `lineIndexAt(scan, to)`, one line less when `to > from` sits at a line start; the range loop and A-8's reader both read it. +2.

F-4. **A-8:** taken. Phase 2, `format.ts`: `reader` is the anchor when both ends' lines share a block (`scan.fences[anchor]?.from === scan.fences[upTo]?.from`, which also covers a caret and two ends outside every block), and `'outside'` otherwise; `markerAt` and `sealed` read it. `itemAt`'s `from` widens to `number | 'outside'` in `Engine/listModel.ts`, a one-token rewrite that makes `listModel.ts` a Phase 2 file too. +1.

F-5. **S-2:** taken, all in Phase 3. One exported `glyphAt(e)` in `Core/MarkdownPM/lineDom.ts`, beside `gutterLineAt`, which now imports `GLYPH_CLASS` from `Engine/intents` (no cycle; typecheck and `engineGraph.test.ts` green). `Gestures/listDrag.ts` (two sites), `Tables/MarkdownTable.tsx`, `Menus/gripMenu.ts` (its private copy), and `Menus/menu.ts` call it, and their `GLYPH_CLASS` imports and `MarkdownTable`'s `target` local go. The two base sites land in Phase 3 rather than Phase 1b because the duplication the fold removes arrives there; `listDrag.ts` and `MarkdownTable.tsx` become Phase 3 files. Net −1 (+4 `lineDom.ts`, −2 `gripMenu.ts`, −1 `listDrag.ts`, −1 `MarkdownTable.tsx`, 0 `menu.ts`).

F-6. **S-5:** taken. Phase 3, `Tables/cellStatic.tsx`: `restingRange(cell, at, length)` takes the resolved offset on one line; `restingMenu` reads `srcOf(glyph)![0]` for a glyph and the caret's `cellOffsetAt` otherwise, so the stand-in caret and the `Pick<CaretPosition, …>` parameter are gone. −4.

F-7. **S-6:** taken. Phase 1b, `Engine/listModel.ts`: `renumberRuns`' range guard is deleted. −1.

F-8. **S-7:** taken. Phase 1b, `listModel.ts`: `runAt` collects `Row = { k, lm: SequencedMarker }` in one forward pass over `siblingsAt`'s items through `itemAt`, narrowing with `isSequenced` (a differing sibling before the line resets the run, one after ends it), and `renumberRun` reads each row's `lm`, so `markerOf` and its cast are gone. 0 (`Row` +2, `markerOf` −1, the destructured `forEach` −1).

F-9. **S-8:** taken. Phase 3, `Core/Actions/gripMenu.ts`: `{ kind: 'list' | 'glyph'; current: ListKind | null }` as one member; the switch and `deletable` narrow under typecheck. −1.

F-10. **S-9:** taken. Phase 2, `format.ts`: `setList`'s doc reads "The one list-type switch. An item already drawn as the type is left alone, a numbered or lettered one is written over, and a plain line becomes an item." 0 lines, 0 comments.

F-11. **S-10:** taken in `Input/format.test.ts`, left out of the other two. One file-level `listed(doc, kind, from = 0, to = doc.length, settings = {})` replaces fourteen spelled-out `setList` calls, the whole-block describe's `set`, and the pick helper's body; the two calls that read the edit itself (`selection`, `changes`) stay. −14 test lines. `formatState.test.ts` was built with a `stateOf` helper and came out +3, since its sixteen calls fit one line each, so it was reverted. `listRenumber.test.ts` already holds its `listed`, with one other call left.

F-12. **S-4:** taken (Nathan's approval). Phase 0, `.claude/scripts/drive-harness.mjs`: `phasedItem(landed)` returns the phase-aware `item` (+8), pushing `String(group)` like the harness's own `item`. The List Types Drive takes `const item = phasedItem(Number(process.env.POMMORA_LGM_LANDED ?? 0))`, and the Path Links Drive `phasedItem(LANDED)`; both local copies go. Path Links' `pending` now pushes `String(group)` and its `tally` maps its groups to strings, so its table still counts. Archive and Properties keep the harness's plain `item`. Scripts net −3 with the evidence lines of F-13 included; Path Links −8. The Path Links side was checked with `node --check` only, so Task 0-3's Path Links 9 run is its first live proof.

F-13. **A-2 / A-3:** taken. Phase 0, the List Types Drive:
   - **P6-D22:** `select(cdp, 'word')` seeds the selection before the right-click inside it, and the item stays Phase 0.
   - **P6-D19:** seeds `Plain.` the same way and stays Phase 0. It holds at base, since base list rows act on the live selection. Base no longer drives a right-click on an unselected plain line; the click-time case now rests with P6-D9 and P6-D18 at Phase 3.
   - **P6-D9:** moves to Phase 3.
   - **P6-D8:** the selector is `textAt(cdp, lineOf('A'), '-')`. A probe at base showed the revealed line as a `- ` text node beside `<span class="md-list-text">A</span>`, so `'- A'` never sat in one node, and that's why the old selector returned `null`.
   - **Evidence:** `pop` now records what sits under the press (`hitAt`, the element's class and text) beside the menu it popped. Every item a later phase owns prints `seen(...)`, the hit and the rows or `no menu`, before its body. The README's paragraph gains that clause.

F-14. **New issue:** taken. Phase 4, `.claude/IssuesPM.md`: I-073, "MarkdownPM's live coverage is split across five drives, so one editor change is driven five times over five launches." It's filed under A2 · MarkdownPM as Minimal, Medium (TBD), Parallel Build, at base `cd813afdd`, with its Description, a [TBD] Solution, and footnote `[^73]`. `index-issues.py` reconciled the index: totals 73 and Minimal 20. Phase 4 also re-cites the lines the folds moved: I-072's `restingRange` (393-404) and `restingMenu` (512-540), I-037's `listReach` compare (`format.ts:345`), I-013's five `MarkdownTable.tsx` spans past line 162 (each −1), and I-058's resting `onClick` (`~563-570`).

#### Phases

F-P1. **Phase 0:** typecheck exit 0; 549 files, 9,109 passed, 2 skipped; lint 1,433 files, no fixes, both scans pass. Production 0; excluding comments 0; tests 0; scripts +273 (+286 / −13), of which the drive is +261, Path Links −8, the harness +8, and the README +12. Comment count 3,511.

F-P2. **Phase 1a:** typecheck exit 0; 549 files, 9,109 passed, 2 skipped; lint clean. Production 0 (+6 / −6); excluding comments 0 (+6 / −6); tests 0 (+2 / −2). Comment count 3,511.

F-P3. **Phase 1b:** typecheck exit 0; 549 files, 9,113 passed, 2 skipped; lint clean. Production +75 (+169 / −94); excluding comments +74 (+163 / −89); tests +19 (+49 / −30). Comment count 3,512.

F-P4. **Phase 2:** typecheck exit 0; 549 files, 9,116 passed, 2 skipped; lint clean, after the forward pass's assignment moved out of an expression for `noAssignInExpressions`. Production +68 (+236 / −168); excluding comments +69 (+226 / −157); tests +25 (+103 / −78). Comment count 3,511. `git grep -n -E "setListKind|listMarkerLines|listKind:" -- Core` prints nothing.

F-P5. **Phase 3:** typecheck exit 0; 549 files, 9,116 passed, 2 skipped; lint clean. Production +16 (+79 / −63); excluding comments +16 (+74 / −58); tests +10 (+15 / −5). Comment count 3,511.

F-P6. **Phase 4:** typecheck exit 0; 549 files, 9,116 passed, 2 skipped; lint clean; `check-atlas.mjs` exit 0; the docs grep prints nothing. Production 0; docs +33 (+53 / −20). Comment count 3,511.

F-P7. **Total:** production +159 (+478 / −319), and excluding comments +159 (+458 / −299). The original read +160 (+631 / −471), and +160 (+606 / −446) excluding comments. The splits shrank because `git diff -M` now pairs `listDragModel.ts` with `listModel.ts` at exactly 50% similarity (`R050`) and counts its diff rather than the whole file. Tests +54 (+168 / −114), against +60 originally.

#### Pins

F-T1. **`'a pick wholly inside a code block switches its own list, and nothing else reaches the code or its fences'`, `Core/MarkdownPM/Input/listRenumber.test.ts`:** extended from P6-T7, which was `'a pick inside a code block switches its own list and leaves the list around it'`. It adds a range from the opener through `y2` (the code numbers, the opener stays), a caret on the opener (unchanged), and a range from `y` through the doc's end (the code stays, and `\t1. z` re-picks to `\t2. z`). **A-4's revert** (the fence-role clause dropped from `sealed`) fails 1 of 1,991 with `expected '- p\n\t1. x\n\t2. ```\n\t3. y\n\t4. y…' to be '- p\n\t1. x\n\t```\n\t1. y\n\t2. y2\n…'`: the opener becomes an item and joins `x`'s run. **A-8's revert** (`const reader = anchor`) fails 1 of 1,991 with `expected '- p\n\t1. x\n\t```\n\t1. y\n\t2. y2\n…' to be '- p\n\t1. x\n\t```\n\t- y\n\t- y2\n\t…'`: the code is numbered and `z` is never reached.

F-T2. **`'makes every selected line its own item, and none the selection ends at the start of'`, `Core/MarkdownPM/Input/format.test.ts`:** extended from `'makes every selected line its own item'` with `listed(three, 'bullet', 0, 4)` → `'- one\ntwo\nthree'`. **A-5's revert** (the `upTo--` line dropped) fails 1 of 1,991 with `expected '- one\n- two\nthree' to be '- one\ntwo\nthree'`.

F-T3. **Unpinned folds:** S-1, S-2, S-5, S-6, S-7, and S-8 change no behavior. S-1 is held by the differential probe in F-1, and the rest by the full suite, with P6-C11 covering the resting glyph's `srcOf` read after S-5. No test was added.

#### Measurements

F-M1. **`readFormatState(scan, 0, doc.length, {}, 'page')` over a select-all:** run through `vite-node` against the real modules, with the scan built once, one warm-up, and the median of five runs (three for 20,000 lines before).

| Document | Before (original final, `19b0a1d8`) | S-1 Alone | After (folded final) |
|---|---|---|---|
| 4,000 prose lines | 205.3 ms | 0.9 ms | 0.9 ms |
| 20,000 prose lines | 5,055.7 ms | 4.1 ms | 3.7 ms |
| 4,000-line fenced block | 166.7 ms | 0.7 ms | 0.7 ms |

The bench lived in the session scratchpad and wasn't added to the plan.

#### The Drive

F-D1. **Base (`1a79b1d1`, production identical to `cd813afdd`) at `POMMORA_LGM_LANDED=0`:** 33/33 held, with 6 `PASS`, 27 `AWAIT`, 0 `FAIL`, and 0 `AHEAD`. The passes are the cell inset's grip menu (P6-D14), a plain line becoming an item (P6-D19), Format ▸ Bold (P6-D22), the grip's Type ▸ stopping at a blank line and switching its whole block (P6-D23, D24), and `/bul` (P6-D25). Every `AWAIT` printed its hit:
   - **Bullets and checkboxes:** a bullet's press met `md-list-bullet md-list-glyph "•"` with `no menu`, and a checkbox met `checkbox`, also with `no menu`.
   - **Numbers, arrows, and `+`:** the press met the glyph and popped the general menu.
   - **P6-D8:** met `cm-line md-list-item … "- A"`, and base Lists ▸ wrote `1. A…`.
   - **P6-D9:** met `"- [] bare"`, and base acted on the tail.
   - **Resting glyphs:** met `md-list-bullet`, `md-list-number`, and `md-list-arrow`, and the general resting menu popped.
   - **P6-D17:** met `> a`, and base wrote `> - a`.
   - **P6-D26:** printed the switch order.

F-D2. **Final (`0fef1612`) at `POMMORA_LGM_LANDED=3`:** 33/33 `PASS`, with nothing left over. `npm run build` printed `✓ built in` for both trees. Both runs restored `~/Test`, which hashed `e5a32a5d…` before and after each. Neither left a `pommora-drive-*` folder, and nothing listened on 9413 afterward. Nathan's instance on 9333 (PID 25538) was left alone, and the worktree was removed with `git worktree remove --force`.

#### Open Calls

F-Q1. **The plan's text trails the folded patches:**
   - **Concepts:** `glyphAt` lives in `lineDom.ts`, and `itemAt` takes `number | 'outside'`.
   - **Task 3-1's AFTER:** it should name `lineDom.ts`, `Gestures/listDrag.ts`, and `Tables/MarkdownTable.tsx`.
   - **Task 2-1's AFTER:** it should name the reach's forward pass, the A-4, A-5, and A-8 rules, and `itemAt`'s widening.
   - **Task 0-2's PROCEDURE:** it should name the D8, D9, D19, and D22 changes as made rather than as selector misses to find.
   - **Report records:** *6 — Phases*' per-file and red-run records describe the unfolded patches.

F-Q2. **The Net Ledger should be restated in Actionable terms:** the phase deltas excluding comments are Phase 1 +74, Phase 2 +69, and Phase 3 +16, cumulative +74, +143, +159, and +159. Because `listModel.ts` now sits at exactly `R050`, `view-delta`'s split may count it either way; the net doesn't move.

F-Q3. **The Phase 2 checkpoint wasn't driven:** I drove base and final only. At `LANDED=2`, the Phase 2 items (P6-D17, D20, D21) should pass, and P6-D9 now awaits Phase 3.

F-Q4. **Two issue citations were already off at base:** I-018's `Menus/gripMenu.ts:90` and I-040's `Menus/gripMenu.ts:47-67,130-164` were off before this work, and Phase 4 still leaves them. I-040's action chain is code this work rewrites (`listKind:` folds into `list:`), so re-citing both in Phase 4 is the planner's call. I re-cited only the lines these folds moved.
