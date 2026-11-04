### List Glyph Menu — Plan Reviews

The review round's findings, what folded into *List Glyph Menu — Implementation Plan*, and what didn't, with the reason. Code folds were built into the phase patches and proven by *Scouts/Planning/9 — Folds*; plan-text folds were made in place.

#### The Round · Simplification and Adversarial (`opus-high`)

**Simplification** (*7 — Plan Review, Simplification*): 14 findings (1 High, 2 Medium, 11 Low), with the six patches replayed and probed. **Adversarial** (*8 — Plan Review, Adversarial*): 11 findings (2 High, 5 Medium, 4 Low), with the plan executed task by task in a scratch worktree, every VERIFY command run as written, and the List Types Drive driven against base and the final tree.

**Folded Into the Code:**

- **The Reach's Forward Pass (S-1, A-1):** a selection's reach walked back once per line, so ⌘A then right-click on a 20,000-line note stalled 7 seconds. One forward pass carrying the current item brings select-all to 0.9 ms at 4,000 lines and 3.7 ms at 20,000; a differential probe over 55,776 cases found the old and new reach equal. Task 2-1.
- **A Fence's Delimiters (A-4):** a pick on a code block's ``` line turned the fence into an item and dissolved the block; a fence's delimiters are never reached now. Task 2-1, with P6-T7 extended.
- **A Range Ending at a Line's Start (A-5):** a triple-click or a drag ending at column 0 reached the next item; the range stops at the line before. Task 2-1, with the selection pin extended.
- **A Range Across a Code Block's Edge (A-8):** such a range reached only the side its top line sat on; code is reached only by a pick wholly inside it, and `itemAt`'s reader widens to `number | 'outside'`. Task 2-1.
- **One Glyph Lookup (S-2):** `glyphAt(e)` in `lineDom.ts` replaces three base copies and the two the plan would have added. Task 3-1, which now names `listDrag.ts` and `MarkdownTable.tsx`.
- **One Read of a Resting Glyph's Line (S-5):** the stand-in caret and the widened `restingRange` parameter go. Task 3-1.
- **Smaller Folds:** `renumberRuns`' unreachable guard (S-6); `renumberRun` reading markers through `runAt` (S-7); the `'glyph'` context sharing the list member (S-8); `setList`'s doc leaving the restart to the renumber (S-9); `format.test.ts`'s call helper, −14 lines (S-10).
- **One Phase-Aware Drive Item (S-4):** `phasedItem(landed)` in the harness, shared by the List Types and Path Links drives, approved by Nathan. Task 0-2.
- **The Drive's Three Cases (A-2, A-3):** a scripted right-click seats no word, so P6-D22 and P6-D19 seed their selection first, P6-D9 moves to Phase 3, P6-D8's selector finds the revealed marker, and every awaiting item prints what its press hit. Base reads 6 pass, 27 `AWAIT`, 0 fail; final reads 33 of 33. Task 0-2.
- **A New Issue:** I-073, unifying MarkdownPM's live coverage under one drive, directed by Nathan. Task 4-1.

**Folded Into the Plan:**

- **Task 1-1 (A-6):** the patch performs the renames itself, so `git mv` leaves the procedure.
- **Task 1-2's Rail Check (A-7, S-12):** it confirms `railIntents` matches the measured hunk rather than naming a benchmark no script runs.
- **The Net Ledger (A-9):** restated in the Actionable measure the run records, +74, +143, +159 cumulative, with the 50%-similarity rename noted.
- **P6-T2's Red Run (A-10):** named as `readsFrom` with only its fence compare dropped.
- **The Planning Folder (A-11):** ratification commits it whole.
- **The Drive Schedule (S-3, S-11):** Phase 3's checkpoint runs all five drives after its folds, Task 4-2 leaves, and *§When Drives Run* is the one schedule each checkpoint reads.
- **Wave Three (S-13):** removed; the neutral gate already re-runs after a fold.
- **Text Against Base (S-14):** the Concepts and Adherence rows describe base rather than a planning patch, and the guard claim names what the glyph menu and **Lists ▸** share.
- **I-018 and I-040 (F-Q4):** their `gripMenu.ts` cites, already off at base, are re-cited in Task 4-1, since this work rewrites the file.

**Not Taken:**

- **S-10 in `formatState.test.ts`:** its helper came out +3 lines, since every call already fits one line.

**Noted Disagreements With Settled Calls:**

- **V-60's `'outside'` Reader (Simplification):** the union arm served one call before A-8 widened `itemAt`; it now serves two, which settles it.
- **V-65's `'page'` Default (Adversarial):** the `/` menu never opens in a cell (V-17), so the default reaches no list pick there; it stays I-037's.
- **B-14 With a Range (Adversarial):** selecting only an item's continuation re-picks its item; that's B-14 as decided.
