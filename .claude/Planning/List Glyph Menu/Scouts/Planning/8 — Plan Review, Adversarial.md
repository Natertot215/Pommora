### 8 — Plan Review · Adversarial

**BASE:** `cd813afdd`

The plan was executed in a detached worktree at `cd813afdd` (`Pommora-LGM-R2`), phase by phase with `git add -A && git write-tree` checkpoints and no commits, and the six patches were replayed separately in a second worktree (`Pommora-LGM-R2F`) for probing and the final build. Edge cases ran through `vite-node` against the real modules. Both trees were built, and the List Types Drive ran at `POMMORA_LGM_LANDED=3` against the final tree and at `0` against the base, one at a time on port 9413. `~/Test` hashed `e5a32a5d…` before and after both runs, and Nathan's instance on 9333 (PID 25538) was left alone.

#### Findings

A-1. **High · Executed · A selection's list reach is quadratic:** `listReach`'s range branch calls `itemOf(k)` for every line, and `itemOf` walks back through every non-blank line that isn't an item, so a run of lines with no blank line between them costs O(n²). `readFormatState` → `listKindOf` → `listReach` runs synchronously in `editorMenu`'s `contextmenu` handler before the menu pops, so ⌘A then right-click (to Copy, say) on a long note written without blank lines stalls the menu. I measured `readFormatState(scanDoc(prose), 0, prose.length, …)` at 220 ms for 2,000 lines, 469 ms for 5,000, 1,417 ms for 10,000, and 6,954 ms for 20,000, against 3–7 ms when the same lines sit in 10-line paragraphs. Base read one line's marker, so this is new cost, the Hard Rules' "expensive work on every X", and the plan's own benchmark pages run to 50,000 lines. The pick then pays the same cost again in `setList`. **Fix:** make the range branch a single forward pass that carries the current item: a marker line sets it and its branch end (one `subBlockAt`), a blank line clears it, and any other line maps to the current item while it's inside the branch, or else to itself. Only the first line needs one backward `itemOf`. That's roughly the same line count as now.

A-2. **High · Executed · Three drive items fail on the builds that own them, so Task 0-2's VERIFY and both later checkpoints can't pass:** on both builds, a CDP-dispatched right-press didn't seat the word under it, so every reply that acts on the live selection acted on the `Tail.` caret instead.
   - **P6-D22 (C-6, owned by Phase 0):** prints `FAIL` at base and at final, with the same result each time: `"plain word here\n\nTail.****"`.
   - **P6-D19 (C-1, owned by Phase 0):** fails at base with `"Plain.\n\n- Tail."`, and passes at final only because Phase 3 makes list rows act over the click-time range.
   - **P6-D9 (owned by Phase 2):** base gives `"- [] bare\n\n- [ ] Tail."`. Phase 2 still sends list rows to the live selection, so by the same mechanism it should fail at Phase 2's checkpoint ("Phases 0 to 2 items pass"). That build wasn't driven, so this one is inferred.

   Task 0-2 can't read "every Phase 0 item pass and no fail", and Phase 3's "every item pass" can't hold while D22 fails. The plan's selector-fix allowance names other items (D8, D16, D17, D26), so an executor reaching this will edit assertions inside the task without a rule for how. **Fix:** D22 should seed the word selection first (`select(cdp, 'word')`, then right-click inside it), which proves what C-6 states: other rows act on the live selection. D19 should move to Phase 3, or seed its selection the same way, and D9 should move to Phase 3. The plan should then name these three as known re-tags rather than selector misses.

A-3. **Medium · Executed · Task 0-2 can't see the selector misses it's told to fix, and P6-D8's selector does miss:** every item the PROCEDURE names as a selector risk (D8, D16, D17, D26) is owned by Phase 2 or 3, so at `LANDED=0` each prints `AWAIT` whether its selector hit or not, and the VERIFY reads only pass and fail. From the base run's `AWAIT` details:
   - **D16, D17, and D26 hit:** the general resting menu's rows, `> - a`, and the full switch order were printed.
   - **D8 missed:** the body came back unchanged, `"- A\n\t- B…"`. Base would have written `1. A` from Lists ▸ on the caret's line had the menu popped.

   D8 also fails at final with the same unchanged body, which points at `textAt(cdp, PAGE_TEXT, '- A', 1)`: the revealed marker and `A` don't seem to share a single text node. Logging that call before the pop settles it in seconds: `null` confirms the selector, and a coordinate points elsewhere. **Fix:** Task 0-2's VERIFY should require reading each named item's `AWAIT` detail for evidence that its target was hit (rows printed, or a body changed by base behavior), and D8's selector should be fixed before Phase 1 opens.

A-4. **Medium · Executed · A pick anchored on a fence line dissolves the code block:** `readsFrom` counts a fence's opener and closer as inside the block, so `listReach` treats them as plain lines to turn into items.
   - **Caret on a delimiter:** Bulleted gives `\t- ```` for an indented opener, and Numbered gives `1. ```` for a column-0 opener or closer.
   - **Selection starting on the opener:** a selection running from the opener line through a list below it, Bulleted, gives `"Intro\n- ```\n- code one\n- code two\n- ```\n- a\n- b"`. Starting the same selection one line higher leaves the code untouched.

   Base did the same, since its `setList` read no fences. The plan, though, states one rule for what a code block lets a reader see, and C-7's intent is that a code sample isn't rewritten. **Fix:** in `listReach`'s `sealed`, also exclude `scope === 'page' && scan.fences[k] !== undefined && scan.fences[k]!.role !== 'content'`. It's one clause, since `FenceInfo.role` already distinguishes `'open' | 'content' | 'close'`.

A-5. **Medium · Executed · A triple-clicked line reaches the next item too:** CodeMirror's triple-click ends its range at the next line's start (`rangeForClick`, `to++` in `@codemirror/view`). `listReach` runs to `lineIndexAt(scan, to)`, so `setList` over `[0, 4]` in `- a\n- b\n- c` gives `1. a\n2. b\n- c`. The check over `[0, 4]` on `- a\n1. b` reads `null`, so Lists ▸ shows no check on a bullet the user selected alone. A drag that ends at column 0 of the next line does the same. This breaks B-7's "only those" and the Phase 4 sentence "a selection changes exactly the items it touches". It's inherited from base's `selectedLines` (`p <= to`), but `listReach` is now the reach's one owner. **Fix:** in the range branch, when `to > from` and `to` sits at a line start, stop at the line before. That's one line.

A-6. **Medium · Executed · Task 1-1's PROCEDURE fails on its first step:** `git mv` of both files and then applying the phase patch prints `error: Core/MarkdownPM/Engine/listDragModel.test.ts: No such file or directory` (and the same for `listDragModel.ts`), because the patch carries the renames itself, and `--exclude='Core/MarkdownPM/Engine/listDragModel*'` fails the same way. A plain `git apply` of the patch, with no `git mv`, lands the rename at 100% and 99%. **Fix:** "Apply the patch; it performs both renames," followed by `git add` of the two new paths.

A-7. **Medium · Read · Task 1-2's rail-pass VERIFY can't run as written:** "measures within 5% of base, read the way V-54 read it (median of interleaved warm runs, bundled)" names no script. V-53 says the K1 trials were removed, and no bench exists in `.claude/scripts/`. An executor has to write the esbuild-bundled, two-build, interleaved harness from V-54's prose, then delete it under the Cold-Machine rule, and the 5% bar depends on how they write it (V-54's own mixed-page figure is +5.4%). **Fix:** name the document shapes, the run count, and the command, or check a scratchpad bench into the plan's folder as the measurement's source.

A-8. **Low · Executed · A selection across a code block's edge reaches only the side its top line is on:** in `- p\n\t1. x\n\t```\n\t- y\n\t- y2\n\t```\n\t1. z`, a selection from `y` through `z`, Bulleted, leaves `1. z` (only the code lines are read), while one from `x` through `y` writes `\t- x` and leaves the code. C-7 rules out the second case reaching in. The first case drops B-7's "every item the selection touches" for the outside lines, and nothing ruled that. **Fix:** read a range from `'outside'` unless both of its ends sit in the same block, so code is reached only by a pick wholly inside it. That's one ternary on the anchor.

A-9. **Low · Executed · The Net Ledger's Measured column can't match its Estimates:**
   - **Different measures:** the Estimates (+76, +63, +21, total +160 (+631 / −471)) count every production line, but Measured is `view-delta`'s Actionable, which subtracts comment lines. Over cumulative trees, Actionable reads +75 / +139 / +160 / +160, so Phase 1 records +75 and Phase 2's own +64. Task 2-1 would then report Phase 2 "above its estimate" only because the comment ledger's +1 / −1 crosses the phase line.
   - **Inflated splits:** over `<BASELINE>..HEAD`, `git diff -M` reads `listModel.ts` as a delete plus an add, since similarity is under 50% once Phase 1b lands. Phase 1's split reads +328 / −253 rather than +171 / −95, and the total reads +606 / −446.

   **Fix:** restate the Estimates as Actionable (+75, +64, +21, total +160 (+606 / −446)) and note that the splits count the renamed file whole.

A-10. **Low · Executed · P6-T2's red run has no single revert to make:** the VERIFY says "reverts only each added test's own fix", but T2's fix is `readsFrom`'s predicate. Forced open literally (`return true`), it fails 8 tests: T2, the math pin, and six guard and seat sweeps that take 5–12 s each. That's not *6 — Phases*' record of T2 and the math pin. T1 (`sequenced = true` dropped), T3 (`repicked.add` stubbed), and T4 (`own !== depth`) each failed exactly their own pin, 1 of 1,988, as recorded. **Fix:** name T2's revert as the predicate with only its fence compare dropped (`!inSealedLine(scan, k)`), which is the floor with K2 alone.

A-11. **Low · Read · The plan's own folder is untracked:** `git status --short` at the head reads `?? ".claude/Planning/List Glyph Menu/"`, so Task 0-1 step 1 finds something the run touches. "The plan commits with its BASELINE filled" through `git commit --only` would also skip the file silently unless it's added first. *§Commits* covers new files in general, but neither Task 0-1 nor the plan says whether the whole folder lands, Scouts, about 500 KB of `.patch` files, and the *Fresh-Eyes Read* included. **Fix:** Task 0-1 should name the `git add` and its paths.

#### What Held

- **Replay:** the six phase patches apply in order onto `cd813afdd` with plain `git apply`, and the trees read `99a75ce5`, `b75d8ffe`, `12e0d0da`, `ad4cef76`, `9c7a3f8b`, and `19b0a1d87`, matching *6 — Phases*' final tree. `Final.patch` matches the replayed production diff line for line, at +631 / −471 and net +160.
- **Comment count:** the plan's command reads 3,511 at base and after 1a, 3,512 after 1b, and 3,511 after Phases 2, 3, and 4, matching *§Constraints · Comments* and the ledger.
- **Gates at each phase:**
  - **Phase 1a:** 549 files, 9,109 passed, 2 skipped.
  - **Phase 1b:** 9,113 passed, 2 skipped.
  - **Phase 2:** 9,116 passed, 2 skipped.
  - **Phase 3:** 9,116 passed, 2 skipped.
  - **Every phase:** typecheck exits 0, and lint checks 1,433 files with no fixes and both scans passing.
  - **Base count:** the 1a tree stands in for base (rename only). A base run I started overlapped my own `git mv` in the same worktree, so its 9,106 and one failed file are an artifact and not a base result.
- **Grep VERIFYs:** `git grep -n "listDragModel" -- Core`, `git grep -n "nestedUnder" -- Core`, `git grep -n -E "setListKind|listMarkerLines|listKind:" -- Core`, and Task 4-1's docs grep each print nothing. `node .claude/scripts/check-atlas.mjs` reports 17 tables agreeing and exits 0. The final diff's file list touches nothing under `Core/Sync` or `Sync`.
- **Red runs:** T1, T3, and T4 each go red alone, as recorded.
- **Probes on the final tree:**
  - **The decisions' examples:** B on gives B and E, E off gives B, C, D, and E, and C off gives C and D.
  - **Code blocks:** a pick inside a code block numbers `y` and `y2` and leaves `x` and `z`. The grip, a range from outside, and a glyph with the setting off leave code untouched, and a column-0 block numbers its own list.
  - **Quotes and callouts:** a blank line in a quote ends the group, an indented quote rides its item, the callout head is untouchable, and a callout's list numbers.
  - **Cells:** a cell's `> a` gives `- > a`.
  - **Re-picks and the renumber:** a re-pick on `1. 2.`, `A. B.`, or `- [x]` is a no-op at undo depth 0, a gapped `1. 3.` repairs at depth 1, `5. 6. 7.` restarts from 1, and `b` under `5. a` becomes `6. b`.
  - **`+` and `- []`:** `+` reads Arrowed and Bulleted rewrites it, and `- []` takes Checklist or Bulleted.
  - **Continuations:** a caret on a continuation numbers its group, and a range over it re-picks its item (B-14).
  - **Mixed indentation:** tab and space siblings number as one run.
- **Live drive:** at final (`LANDED=3`), 31 of 33 items passed, with every glyph, cell, resting, quote, selection, setting, undo, grip, and `/` item green. The two failures are D8 and D22 (A-2, A-3). At base (`LANDED=0`), every item that isn't owned by Phase 0 printed `AWAIT`, D14, D23, D24, and D25 passed, and D19 and D22 failed (A-2). Each run restored `~/Test`, left no `pommora-drive-*` folder, and left nothing listening on 9413.
- **Wiring checks:** every view that installs `formatKeymap` or the block menu does so through `editorBase`, which provides `editorHost`, so `applyEditorAction`'s unconditional `settings()` read is safe. The resting glyph selector `.md-list-item > [data-src]` matches only the glyph, since the item's text sits inside `.md-list-text`. `personalization:set`, `views:save`, and `mutate` exist in `bridge.ts`.

#### Noted Disagreements With Settled Calls

- **V-65 (`applyEditorAction`'s `'page'` fallback):** the `/` menu inside a live cell now runs `listReach` with page rules (fences sealed, `>` stripped), so the fallback reaches the one list switch rather than only the chords. It's still I-037's to fix, but it's no longer limited to format chords.
- **B-14 with a range:** selecting only an indented continuation and picking a type rewrites its item's marker (a numbered item restarts) and leaves the selected line as text. P6-C8 had to add a blank line to keep its old expectation. That's consistent with B-14, but it's the one place where a selection doesn't change the line it covers.
