### 9 — Blank Lines and Numbering

**DATE:** 11-05-2026
**COMMIT:** `b7f2f17a5`

This report designs how numbering and the list's edges work once B-5, B-6, B-10, D-4, and F-1 hold, from what can be removed. Both designs were built in a throwaway worktree, which is gone, and neither was committed. The app wasn't launched. File and line cites read against `b7f2f17a5`.

#### The Outcome

| Patch | Production Lines (No Comments Or Blanks) | Comment Lines | Applies To |
|---|---|---|---|
| `Scouts/Planning/Numbering and Edges.patch` | +209 / -276, net **-67** | +12 / -12 | `b7f2f17a5` |
| `Scouts/Planning/Paste Recount.patch` | +10 / -3, net **+7** | +1 / -1 | `b7f2f17a5` |

About 85 of the numbering patch's lines sit in both columns, since `rebuildMove` and its helpers moved to a new file. The comment count holds, though `renumberRuns`' comment now carries the start rule `renumberRun`'s inline comment held, which planning should weigh against *§Constraints*' rule on comments growing. The design in one breath: a blank line ends a list through one rule, numbering counts lists rather than tracking which run an item left, a run counts from its first item, and a drag hands its landing run the start it had.

- **Gates, Numbering:** 9,143 tests pass with 2 skipped. `tsc` is clean across `UIX`, `Core`, `Core/tsconfig.src.json`, both `Desktop` projects, and `Sync`. Biome and the wrapped-comments scan are clean. The dashboard's typecheck and the name-mentions hook don't resolve from a worktree and didn't run.
- **Gates, Paste:** 8,183 `Core` tests pass with 2 skipped. `tsc` on `Core` and Biome are clean.
- **Seeded Properties:** `Engine/docScan.test.ts` and `docCache.test.ts` pass on the numbering patch, which touches `railIntents` and the block context.

---

#### Where The Tree Contradicts The Log

- **9-T1 — Enter Counts (Observed):** *Editor-Internals* says a marker writer writes "without counting", while `Input/edits.ts:87-91` writes `ordinalOf(lm) + 1`. The number is redundant, since the filter rewrites it anyway.
- **9-T2 — F-1's Block Drag Isn't a Numbering Defect After B-5 (Observed):** the defect observed was `1. a`, blank, `2. b`, blank, `3. c` landing `3. c`, blank, `1. a`, blank, `2. b` (*Scouts/1*, *1-T2.6*). Under B-5 those are three lists, each keeping its number, so the cause leaves and what the user sees stays the same. `rebuildMove` also fences a block with a blank on each side (`listModel.ts:186-206`), so a block move can never join or split a run, and a recount in `moveRange` would change nothing. Scout 1's remedy (*1-T6.5*, The Move) is therefore dropped, and `moveRange` stays free of numbering. A new pin in `blockMove.test.ts` states this. See *§Questions for Nathan*, question 3.
- **9-T3 — The Swallowed Table Header Is One Case of a Wider Defect (Observed):** `- a`, `> - b`, `> - c` gives `blockAt` a list block over all three lines, so a grip's Delete on `- a` takes the quote too. The cause is the same line: `blockModel.ts:45` reads the raw `markers` array, which ignores quote depth and tables.
- **9-T4 — Two Other Reshaping Edits Skip The Filter (Observed):** `listRenumber.ts:12` says "every edit that reshapes a sequenced run", yet `editorKeymap` keeps CodeMirror's `Alt-ArrowUp` and `Alt-ArrowDown` (`markdownInput.ts:351`), whose `move.line` event the filter ignores, and text dragged inside the editor lands as `move.drop` or `input.drop`. Neither is in the log. See question 6.
- **9-T5 — `Slot.line` Stays (Observed):** *Scouts/4* (4-T15) listed it as leaving. The drop needs it to read the landing run's start, so its reader changes and the field stays.

---

#### A Blank Line Ends a List

- **9-T6 — The One Answer (Observed):** where a list ends is two facts, each with one owner. `continuesList` in `detect.ts` is the line rule, and it drops from three answers to a boolean: non-blank and indented past the list's prefix. `openerOf` in `listModel.ts` decides which line speaks for a line inside a block. They meet in `ridesList(scan, k, depth, scope)`, exported from `Engine/listModel.ts`, and that file owns the answer.
  - **List Model:** `rolesAgainst` reads through `openerOf` and `continuesList`, as it does today.
  - **Block Model:** `listMember[i]` is now an item at depth 0 read from outside, or the line above being a member and this line riding it. That one expression replaces the two-pass scan at `blockModel.ts:44-60`.
  - **Rails:** `railIntents` takes a `rides` callback in place of raw `lines`. A page passes `ridesList`, and a resting cell, which holds no scan, passes `continuesList` over its lines (`cellStatic.tsx:294`).
- **9-T7 — The Three Now Agree (Observed):** a throwaway fuzz ran 60,000 random documents drawn from items, riders, blanks, fences, math, tables, and quotes. On `b7f2f17a5` the block's end disagreed with the walk 11,171 times, a sub-block escaped its block 1,438 times, and a list block opened off an item 10,832 times. On the patch all three read zero, and renumbering twice equals renumbering once. It wasn't powerful enough to exercise rails through a carried block on either tree, so that behavior rests on the pinned test.
- **9-T8 — A Carried Table Joins `openerOf` (Observed):** `- a`, `  | h | i |`, `  |---|---|`, `| 1 | 2 |`, `- b` holds a flush row inside a table the item carries. Today `subBlockAt` stops at that row and a drag would tear it off, because `openerOf` knows fences and math only. One more `??` fixes it, and B-6's "any indented line directly under an item" covers it.
- **9-T9 — What Each Part Sheds (Observed):**

| Part | Outcome |
|---|---|
| `continuesList` | Changes. The `'blank'` answer and the `depth === 0` branch leave, and it returns a boolean. |
| `rolesAgainst` | Changes. `'blank'` leaves, it stops being exported, and it takes an optional `level` so a list can be read whole. |
| `siblingsAt` | Changes. `joins` leaves with `runAt`, and so does the blank branch. Its only caller is now `listReach`. |
| `subBlockAt` | Changes. The loop becomes one `while`. |
| `ownersOf` | Stays, unedited. Its answer narrows through `subBlockAt`, and `listReach` and `takeMarker` still need it. |
| `dropChanges` | Changes. `gapBefore`, both `siblingsAt` reads, `looseSource`, and `looseSlot` leave. It gains the landing run's start. |
| `listReach` | Stays, unedited. A line below a blank has no owner now, so it becomes an item of its own. |
| The rails | Change as *9-T6* says, which also fixes the flush line. |
| The filter | See *§Who Says What an Edit Meant*. |

- **9-T10 — What `rebuildMove` Keeps (Observed):** the two seams collapse to one boolean, `fenced`. A block stands apart, so it takes a blank at the slot and heals the hole it leaves, which every non-list drag and the outline's heading move need (`blockDrag.ts:83`, `pageEditor.ts:52`). An item drops straight into the lines at its slot. One real case survives from the loose code: an item that was its whole list leaves two blanks behind, or a leading blank at the document's top, so an item with a blank or the document's edge on both sides takes one blank with it. Dropping such an item directly below its own hole also needed `sep(heals && i !== tLine)`, since the heal would otherwise reinsert the blank and the move would read as no change.
- **9-T11 — `moveRange` Moves To `Engine/blockMove.ts` (Observed):** `rebuildMove`, `moveRange`, `Slot`, `leadOf`, and `reindentBlock` leave `listModel.ts` for a new leaf, and `blockDrag.ts` and `pageEditor.ts` import from it. `blockModel.ts` was the first choice, but it imports from `listModel.ts`, which needs `rebuildMove`, so that would be a cycle. The leaf imports only `detect` and `markdownCode`. Its 15 `moveRange` tests moved to `blockMove.test.ts` unchanged.

---

#### Who Says What an Edit Meant

- **9-T12 — After D-4, No Inference of Meaning Is Left (Observed):** the filter's only reading of intent was the re-pick, and D-4 removes it. What remains is two plain facts. A writer states `input.list`, and otherwise the filter compares states: did this edit remove a line, or did the line at the edit become or stop being numbered? The second test replaces the `whole` marker geometry and needs no change to `smartBackspace`. The filter shrinks from 53 lines to 27 and stops walking the old document.
- **9-T13 — Writers Don't Need To State More (Inferred):** having Backspace state `relist` was considered. It would still leave a selection deletion to the comparison, so the flag would add a second route to the same answer. The filter keeps one event and one comparison.
- **9-T14 — Numbering Counts Lists, Not Runs (Observed):** this is the design's largest call. With B-5, a list is a bounded unit, so an edit that reshapes a numbered part of a list recounts that whole list. `below`, `runsBelow`, `mapAscending`, the sort, and the old-document walk all exist to find the run an item left, and all of them leave. `runsAround` sweeps a list once, a shallower item closing the runs beneath it and an item of another kind closing its own level's, which replaces `runAt` and the `joins` parameter.
  - **The Visible Change (Observed):** wrong numbers elsewhere in the same list get fixed by an edit that didn't touch them. `3. p`, `\t1. a`, `5. q` switched at `a` now lands `4. q`. The log doesn't name this, so it needs Nathan's answer (question 1).
  - **The Narrow Alternative (Observed):** I built it too. Keeping today's exact reach by walking the new document for the sibling below costs **+24 lines** (net -43 against -67), with `mapAscending` still gone. It turns the same 17 tests red, and the `5. q` pin holds.
  - **The Gate:** a marker-writing edit recounts only where the line is numbered before or after, so Enter on a bullet pays nothing, and `continuing a bullet leaves the numbered list below it alone` stays green.
- **9-T15 — Which Writers Become One Path (Observed):**
  - **Enter Joins The Picks:** it writes `listMarkerText(lm.kind)`, moved to `detect.ts`, and the filter counts. `ordinalOf` and `ordinalText` leave `edits.ts`, and the caret maps correctly when the marker grows (`9. a` lands `10. `, pinned). This also delivers B-4 for free, since Enter under `+` writes `-`.
  - **The Drag Stays Separate, For A Real Reason:** a move reorders a run, so the start can't be read from the result, and its single diffed replace hides both ends from the filter. Routing it through the filter would need an annotation carrying what `dropChanges` already holds. It shares `renumberRuns`, so there's one counter and two entrances, and that exception is written in `dropChanges`' comment and *Editor-Internals*.
- **9-T16 — I-073 (Inferred):** the half about inferring a re-pick closes. The half about the drag's own document stays as a stated exception, so the issue can close only if the planner accepts that exception as its resolution. `format.ts:363`'s reference to it goes.

---

#### Each Remaining Part

| Part | Verdict | Reason |
|---|---|---|
| `arrived` | Leaves | Only a pick or paste above a run's first item ever needed it, and a run now counts from that item. See question 4. |
| `settled` | Leaves | Same. |
| `repicked` | Leaves | D-4. |
| `rewritten` | Leaves | D-4. The `applyEdits` compare and `return {}` go with it, since a re-pick now writes nothing and an empty transaction adds no undo step. |
| `runsBelow` | Leaves | *9-T14*. |
| `mapAscending` | Leaves | The filter holds no old-document position to map, so the quadratic it guarded can't occur. |
| `Math.min(...)` | Leaves | The start is the first row's ordinal. *Scouts/1* observed this spread throwing at 130,000 rows. |
| `runAt` | Leaves | `runsAround` replaces it, and `Row` and `renumberRun` stay. |
| `landEdit` | Stays | `cellStatic.tsx:474` is a production caller. |
| `renumberRuns`' blank skip | Leaves | Nothing needs a run below a blank. |

B-10's four behaviors are kept: the run an item leaves recounts, a list keeps its start, a block directly under an item rides it, and a selection's reach is untouched.

---

#### The Start of a Run

- **9-T17 — The Rule (Observed):** a nested run counts from 1, and any other run counts from its first item. That keeps `5.` at 5, and `Y. Z. A.` holds because the head is `Y`, and `ordinalText` already wraps. It removes every ordering assumption, which is what broke past Z, since the smallest of 25, 26, and 1 is 1.
- **9-T18 — The Drag (Observed):** a move is the one edit whose first item can't be trusted. `dropChanges` reads the first marker of the run at `slot.line` before the move and passes it as `held`, so that run counts from it. `5. a`, `6. b`, `7. c` keeps 5 with `c` dragged to the top or `a` dragged to the bottom, and `Y. Z. A.` keeps `Y`. An item of another kind ignores it, since `renumberRun` compares kinds. A nested landing counts from 1 anyway.
- **9-T19 — Alternatives Rejected (Inferred):** "the smallest with no predecessor" handles the wrap but fails on a full 26-letter cycle and needs a fallback. Extending past Z to `AA.` would read `OK.` as a marker. The start read from the old document everywhere would keep `was` walks the filter just lost.

---

#### F-1's Numbering and Edge Defects

| Defect | Cause | Fix | Evidence |
|---|---|---|---|
| A block drag's stale numbers | The loose reading | Leaves with B-5, see *9-T2* | Observed |
| A list block swallowing a table's header row | `isMarker` reading raw `markers` | The block model reads `itemAt` at depth 0, which also cures *9-T3* | Observed, pinned |
| A grip's pick past the document's end | `firstItemOf`'s unbounded loop (`gripMenu.ts:61-65`) | `firstItemOf` leaves. D-2 sends `block.from` and `block.to` to `editFor` and `listKindOf`, and a list block now always opens on an item, so the loop has no job. A mixed block checks no row, and Preserve doesn't reach a range | Observed, pinned |
| Rails ending at a flush line in a carried block | `railIntents` reading raw lines | `ridesList`, see *9-T6* | Observed, pinned |
| A run past Z recounting from A | The smallest ordinal | *9-T17* | Observed, pinned |

- **9-T20 — A List Block Opens On Its First Item (Observed):** `  para` above `- a` was one block, which is why `firstItemOf` existed. Reaching a range from there would have turned the paragraph into an item, so the forward rule in *9-T6* makes it a paragraph block of its own, as B-6 reads: only a line under an item rides it.
- **9-T21 — Stale Drops (Inferred):** the `Cannot read properties of null` throw *Scouts/1* observed came through `dropChanges`' `siblingsAt`, which has left. `beginRelocateDrag` still carries no document check.

---

#### Paste

Paste is its own patch. It applies to `b7f2f17a5` alone and touches only `Input/listRenumber.ts` and its test.

- **9-T22 — What It Needs (Observed):** one more event at the filter's gate, and a test for whether the paste changed the list's shape. A paste reshapes when it brings a newline, or writes an item onto a line that held none. Words pasted inside an item recount nothing, which keeps a link paste and a gapped run alone.
- **9-T23 — With The Filter (Observed):** a shaping paste takes the marker-writing branch, so its lines count as written, while it reads as a deletion does, from `'outside'`, so nothing inside a code block or math is counted. When C-3 lands that reader collapses, and a paste into a Markdown code block counts as C-1 wants.
- **9-T24 — Undo (Observed):** the recount rides the same transaction, so one undo takes both, pinned through CodeMirror's `history`.
- **9-T25 — Over a Selection (Observed):** the replaced items close up as a deletion's do. `1. a`, `2. b`, `3. c`, `4. d` with the middle two replaced by `2. x` lands `1. a`, `2. x`, `3. d`.
- **9-T26 — A Paste Holding Its Own Numbered List (Observed):** its numbers don't count, and its lines join the run where they land. `1. a`, `2. b`, `3. c` taking `9. x`, `9. y` lands 1 through 5. A flush plain line it brings ends the list, so the lower list keeps its numbers.
- **9-T27 — Landing Order (Observed):** the patch conflicts textually with the numbering patch in the filter. If numbering lands first, paste becomes four in-place line edits and a net of 0 lines, verified with 46 tests in the file:

```ts
if (!relist && !tr.isUserEvent('delete') && !tr.isUserEvent('input.paste')) return tr
tr.changes.iterChanges((fromA, toA, fromB, toB) => {
(`${was.text.slice(fromA, toA)}${scan.text.slice(fromB, toB)}`.includes('\n') &&
if (reshaped) at.push(fromB, toB)
```

The one difference between the orders is a list pasted above a run that starts past 1, which keeps the run's start on `b7f2f17a5` and takes the pasted start on the numbering patch. The base patch leaves that case unpinned so it holds either way.

---

#### Measurements

Medians over five runs in milliseconds, each timing state creation, the scan, and the edit. Nothing measured quadratic.

| Edit | `b7f2f17a5`, 20,000 Lines | Patch, 20,000 Lines | Patch, 40,000 Lines |
|---|---|---|---|
| Pick, range, Numbered to Bulleted | 53.5 | 42.8 | 81.9 |
| Pick, caret, Numbered to Bulleted | 49.8 | 40.8 | 77.7 |
| Pick, range, Bulleted to Numbered | 51.6 | 50.3 | 96.4 |
| Pick, range, Numbered to Alphabetical | 60.9 | 47.2 | 95.4 |
| Pick, range, mixed list to Numbered | 56.5 | 41.6 | 79.6 |
| Pick, range, nested list to Bulleted | 56.9 | 44.5 | 86.4 |
| Enter, numbered list | 17.2 | 18.6 | 35.5 |
| Enter, bulleted list | 9.6 | 9.8 | 19.3 |
| Enter, nested list | 10.5 | 15.5 | 29.8 |
| Delete a line, bulleted list | 9.8 | 13.9 | not recorded |

- **9-T28 — The Cost (Observed):** Enter in a nested list and a line deletion in a bullet list cost 4 to 5ms more at 20,000 lines, since the list is walked whole. `railIntents` already reads the whole document on every transaction, so this adds no new order of work. `docLineIntents` moved from 7.4ms to 7.6ms on a flat list and 4.2ms to 4.8ms on a fenced one.
- **9-T29 — Paste (Observed):** 20,000 numbered lines pasted into a 20,000-line run takes 161ms, and 40,000 into 40,000 takes 332ms.

---

#### The Tests That Turn Red

The numbering patch against the original test files turns 17 `Core` tests red, and none is a regression. 15 `moveRange` tests needed only their import path, and the patch updates or replaces every red below. `citationBreakage` and `embedAbsorb` timed out in one loaded run, which *Scouts/4* also saw, and passed in every later run.

| Test | Decision |
|---|---|
| `intents.test.ts:740`, a blank line carries the rail | B-5 |
| `listModel.test.ts:55`, a loose item's paragraph rides it | B-6 |
| `listModel.test.ts:75`, the loose drag cases | B-5 |
| `listModel.test.ts:94`, `:106`, loose runs renumbered by a drag | B-5 |
| `format.test.ts:304`, a loose paragraph answers for its item | B-6 |
| `format.test.ts:335`, a re-pick repairs a sequence | D-4 |
| `listRenumber.test.ts:54`, `:116`, `:149`, `:152`, loose runs | B-5 |
| `listRenumber.test.ts:143`, a pick restarts its run | D-4 |
| `listRenumber.test.ts:174`, a re-pick recounts past a code block | D-4 |
| `gripMenuFlow.test.tsx:94`, `:117`, the grip reaches by Preserve | D-2 |

- **Conflicting With The Log:** the 15 tests above, all removed or rewritten as A-4 asks.
- **Following From A Decision But Not Named By One:** 2 tests. `listRenumber.test.ts:83` fails first on a loose assertion, which is B-5, and its last assertion (`:105`, the `5. q` pin) is *9-T14*'s visible change. `gripMenuFlow.test.tsx:109`, a block opening on an indented paragraph, follows B-6 through *9-T20*.
- **Real Regressions:** none.

New pins cover the start through a drag, a run past Z, the merge on a removed blank, the caret past a grown marker, a carried quote's own list, the block's edges, and the rails through a carried block. The patch also rewrites *Editor-Internals*' numbering entry. `.claude/Features/MarkdownPM.md:24` and the List Types Drive still describe the old behavior, which planning owns.

#### Beside Other Work

- **Section C:** `relist ? k : 'outside'` and the `readsFrom` clause in the filter leave once plain code reads no list. A list in a carried Markdown block has its level counted from the page, so `head.level > 0` restarts it at 1 (Inferred, as the Fresh-Eyes Read found), which the level fix C-1 needs would cure.
- **B-1:** the `drawnKind` call stays in `setList` here and folds into that work.
- **A List Tree (Inferred):** `runsAround` is the slice of the prospect this work needs. The other walks are now bounded by blank lines and nothing hot reads them, so this work alone doesn't call for a full tree. `Scouts/Planning/List Tree.patch` and `Blank-Line Walks.patch` appeared from a parallel scout during this run and weren't read, and both touch the same functions, so planning needs to reconcile them with this patch.

---

#### Questions for Nathan

1. **Should fixing a list's numbers fix the whole list?** When you press Enter or Tab on a numbered line today, the app only renumbers the part you touched. In this design, it tidies every numbered part of that same list, so a sublist reading `3. 4.` further down becomes `1. 2.`, and a gap you didn't touch closes. A blank line still protects whatever's below it. **My Call:** yes. It's 24 fewer lines and one rule anyone can state. The cost is that a keystroke can change a number somewhere you're not looking.
2. **Is `1. 1. 1.` right when you turn separated paragraphs into a numbered list?** Select three paragraphs with blank lines between them, pick Numbered, and you get three one-item lists, each starting at 1, because a blank line ends a list. **My Call:** accept it. Anything else means special counting for one case, and the fix is simply removing the blank lines.
3. **Is it fine that a dragged block keeps its own number?** With `1. a`, `2. b`, `3. c` separated by blank lines, dragging `3. c` to the top by its grip shows `3.`, `1.`, `2.`. The log called this a defect, but once blank lines end lists these are three separate lists, so nothing's actually wrong and nothing changes on screen. **My Call:** accept it. A drag by the glyph into another list still renumbers.
4. **If a line joins the top of a list starting at 5, should the list keep 5?** Pick Numbered on a line directly above `5. a`, and today you get `5.`, `6.`. In this design you get `1.`, `2.`, because a list counts from its first item. Lists starting at 5 still stay at 5 through Enter, Tab, deleting, and dragging. **My Call:** accept it. It's rare, and it removes the machinery that tracked which lines were just written.
5. **If you delete a list's first item, should the rest renumber from 1?** Today `1. 2. 3.` with the first item deleted stays `2. 3.`, and this design keeps that. **My Call:** keep it for now, since it's the same one rule and fixing it needs a few lines plus a matching change for dragging an item out. If that reads wrong to you, say so, and it's a small add.
6. **Should Option+Up and Option+Down renumber too?** They move a line up or down, and in a numbered list they leave the numbers out of order, as dragging selected text does. Neither is in the log. **My Call:** leave them out of this work and file an issue, since doing it right needs the same care a drag takes.
