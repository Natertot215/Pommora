### Phase 3 — Notes

**Commits:** `dfce3c801` (3a), `fc852d3d7` (3b), `018cb5f4f` (3c), on `lc-w2`, on Phase 2's `c85eb6cd2`.
**Patches:** *Phase 3a — Block Move's Home.patch*, *Phase 3b — The Stale Drop.patch*, *Phase 3c — Blank Lines and Numbering.patch*, applied in that order.
**Delivers:** B-5, B-6, B-10, B-4's Enter half, D-2's grip reach and unchecked mixed block, D-4, and F-1's grip past the document's end, run past Z, flush-line rail, and block drag.

The phase split into three because each slice stays green alone. Nothing else split cleanly: Enter writing `listMarkerText`, the re-pick, the whole-list recount, and the block model's forward rule all rest on the same rewrite of the walk.

---

#### Task 3a: Block Move's Home

**In Plain Terms:** the code that moves a block of lines leaves the list model for a file of its own, unchanged. It's list-free, and `blockModel.ts` imports `listModel.ts`, so a new leaf is the only home without a cycle.

**What Leaves `Engine/listModel.ts`:** `Slot`, `leadOf`, `reindentBlock`, `MoveSeams`, `rebuildMove`, `moveRange`, and the imports only they used (`indentWidth`, `lineOffsetsOf`, `quotePrefix`).

**What Arrives:** `Engine/blockMove.ts` (97 lines) and `Engine/blockMove.test.ts`. The private `leadOf` takes the name `quoteAndIndent`, since `Input/edits.ts` exports a `leadOf` that means something else. It says what the function returns: a line's quote prefix and its indent.

```diff
--- a/Core/MarkdownPM/Engine/listModel.ts
+import { rebuildMove, type Slot } from './blockMove'
 import { type DocScan, scanDoc, spanAt } from './docScan'
```

```diff
--- a/Core/MarkdownPM/Gestures/blockDrag.ts
-import { moveRange } from '../Engine/listModel'
+import { moveRange } from '../Engine/blockMove'
```

**Per-File Summary:**

| File | Change |
|---|---|
| `Engine/blockMove.ts` | New, the moved code with `rebuildMove` exported and the rename |
| `Engine/listModel.ts` | The moved code leaves; `dropChanges` imports `rebuildMove` and `Slot` |
| `Gestures/blockDrag.ts`, `Core/Pages/pageEditor.ts` | Import path |

**Tests:** the 15 `moveRange` cases in `describe('moveRange (blank-separated block move)')` moved from `listModel.test.ts` to `blockMove.test.ts`, with `blockAt`, its `blockModel` import, and `moveRange`'s import leaving `listModel.test.ts`. Two titles shed the history they named, *(the reviewer-flagged case)* and *(blockAt feeds the range)*. No pin, so no red run.

**Comments:** none added or removed. Two lines moved with their code (`// The drop indent a block adopts…` and `/** Strips the head's lead by LENGTH…`).

**Measured:** typecheck 0, comments 3,515, Actionable ±0 (+98 / -98).

---

#### Task 3b: The Stale Drop

**In Plain Terms:** a drag holds offsets into the document it was pressed on. Another pane's mirrored edit can change that document under a drag (`mirrorBody`, `bodyMount.ts:44`). One compare at the drop refuses the drop, for both the list drag and the block drag, and the two guards in the move that caught the same state by accident leave. A drop or a pick that replaces the span holding a selection used to leave that selection inverted, so the seat filter now turns it into a caret, and a selection's forward head stops seating past a hidden lead, so a line selected through the next line's start leaves that line's lead standing.

**What Leaves:** `if (bStart < 0) return null` and `if (tLine < 0) return null` in `rebuildMove`; the comment at `Gestures/listDrag.ts:11`.

**What Arrives:** the compare, in `beginRelocateDrag`; one clause each in `caretSeat`'s filter for an inverted range and a forward head.

```diff
--- a/Core/MarkdownPM/Gestures/editorGesture.ts
   const host = view.scrollDOM
+  const doc = view.state.doc
   const overlay = new Overlay()
...
-  // Candidates are viewport-relative, so a scroll invalidates them.
+  // Candidates are viewport-relative, so a scroll invalidates them, and offsets into the document pressed, so another pane's mirrored edit voids the drop.
...
     onDrop: () => {
-      if (slot === null) return
+      if (slot === null || view.state.doc !== doc) return
```

```diff
--- a/Core/MarkdownPM/decorations.ts, caretSeat's filter
-    const { anchor, head, empty, assoc } = tr.newSelection.main
+    const main = tr.newSelection.main
+    // A replace swallowing a range maps its two ends past each other, which only a caret can stand for.
+    const range = main.from > main.to ? EditorSelection.cursor(main.to) : main
+    const { anchor, head, empty, assoc } = range
...
-      (head < visible
+      (head < visible && head <= anchor
...
-    if (seat === head && side === assoc) return tr
+    if (range === main && seat === head && side === assoc) return tr
```

**The Inverted Selection:** CodeMirror's `SelectionRange.map` maps `from` forward and `to` backward, so a replaced span that swallows a selection returns `from > to`, a state its API doesn't describe. `dropChanges` and `moveRange` each land one replace through `diffAsSingleReplace`, and a pick replaces a marker holding the seated `x`. Driven live, Backspace took 24 characters where 4 were selected. The inverted range becomes a caret at `main.to` and runs through the rest of the filter, so a caret landing inside a hidden prefix still seats.

**The Forward Head:** a triple-click selects through the next line's start, and the seat moved that head past a carried block's hidden lead, so Backspace took the fence's three spaces and the block stopped riding. Leaving every range's head alone reddens *Shift+ArrowLeft and Shift+Home never select the hidden prefix alone*: Shift+Home on `> world` would select the hidden `> `, and that head is the range's leading end. So `head <= anchor` seats a caret and a backward head, and a forward head stands, which leaves the prefix outside the selection either way.

**Why the Two Guards Can Go:**

- **`Gestures/listDrag.ts` and `Gestures/blockDrag.ts`:** every slot and block came from the document pressed, and the compare holds that through the drop.
- **`Core/Pages/pageEditor.ts:52`, the outline's heading move:** the other caller of `moveRange`. `scan`, `heads`, `at`, and `blockAt(scan, drag.from)` all derive from one synchronous `view.state`, so `range.from` and `slot.at` are line starts in that document, or the citation tail's line start, or `doc.length`, which `slot.at >= doc.length` takes.

**Comments, Line by Line:** net 0 (+2 / -2).

| File | Change |
|---|---|
| `Gestures/listDrag.ts` | **-** `// Measured at drag start and re-measured only on scroll: the doc is static during a drag, so re-measuring per pointermove would be layout thrash.` Its second half is the false claim; the layout-thrash clause isn't carried anywhere, as the ledger expected |
| `Gestures/editorGesture.ts` | Extended, the line in the diff above, which is the file's existing comment on what voids a candidate |
| `decorations.ts` | **+** `// A replace swallowing a range maps its two ends past each other, which only a caret can stand for.` |

**Tests:** the stale compare takes no pin. See *§Concerns*: jsdom draws no slots, so it can't be pinned in that harness. A throwaway probe in `listDragTap.test.tsx`'s shape read `- a\n- b\n- c` unmoved after a fresh drag, with or without the compare, which is the reason. The test file was removed. Three pins arrive in `prefixSeat.test.tsx`, under *a selection a change or a keystroke has to answer for*:

| Pin | Mutation | Result |
|---|---|---|
| *a drop past a selection leaves a caret at the change, and typing lands there* | `range` reads `main` | Red: `SelectionRange{ from: 26, to: 2 }` against `{ from: 2, to: 2 }`, 2 failed of 31 with the next |
| *a pick replacing the marker a selection sits in leaves a caret, and typing lands there* | Same | Red: `SelectionRange{ from: 9, to: 6 }` against `{ from: 6, to: 6 }` |
| *a line selected through the start of a carried block keeps the block's lead* | `head <= anchor` leaves | Red: head 10 against 8, 1 failed of 31 |

**Measured:** typecheck 0, `Core/MarkdownPM` 2,019 passed, comments 3,515, Actionable +1 (+7 / -6).

---

#### Task 3c: Blank Lines and Numbering

**In Plain Terms:** a blank line now ends a list for every reader, and three facts each get one owner. `continuesList` says whether a line continues a list. `openerOf` says which line speaks for a line inside a block, through `sealedBlock`, the one answer to which block seals a line. `ridesList` joins them, and the walks, the block model, and the rails all read it, so where a list ends has one answer. Numbering counts a list rather than a run: an edit that reshapes a numbered part recounts that whole list, from its first item, with a nested run from 1. A re-pick writes nothing, Enter writes a plain marker and lets the filter count, and a grip's menu reaches its whole block. An edit resting on a fence's delimiter reads from outside the block, and typing or Enter over a selection crossing lines recounts, with that test ahead of any scan so a plain keystroke pays nothing.

**What Leaves:**

- `continuesList`'s `'blank'` answer and `depth === 0` branch; the exports of `rolesAgainst` and `openerOf`.
- `siblingsAt`'s `joins` and blank branch, `runAt`, `arrived`, `settled`, `repicked`, `rewritten`, `runsBelow`, `below`, `mapAscending`, `Math.min(...)`, `renumberRuns`' blank skip, the `{}` cancel and `applyEdits` in the filter, and `isSequenced(lm) ||` in `setList`, with its I-073 reference.
- `gapBefore`, `looseSource`, `looseSlot`, `MoveSeams`.
- `ordinalOf`, `ordinalText` from `edits.ts`; `firstItemOf`; `blockContext`'s two-pass scan; `lines` and `lineStarts` on `railIntents`.

**What Arrives:** `ridesList`, `runsAround`, `sealedBlock` (`Engine/docScan.ts`, with `inSealedLine` a one-line read of it), `held`, the `fenced` and `heals` flags, and the filter's `overLines`. `listMarkerText` moves from `format.ts` to `detect.ts`.

**Key Hunks:**

```diff
--- a/Core/MarkdownPM/Engine/detect.ts
-/** How a line at quote depth `depth` or deeper that isn't an item there reads to a list at that depth: …
-export function continuesList(line: string, depth: number): 'nested' | 'blank' | 'ends' {
-  const body = depth === 0 ? line : line.slice(quotePrefixWidth(line, depth))
-  if (!isBlank(body)) return /^[ \t]/.test(body) ? 'nested' : 'ends'
-  return depth === 0 ? 'blank' : 'ends'
-}
+/** Whether a line at quote depth `depth` or deeper that isn't an item there continues a list at that depth: a wrapped item's body, indented past the list's prefix, does, and a blank line ends the list. */
+export const continuesList = (line: string, depth: number): boolean =>
+  /^[ \t]+\S/.test(line.slice(quotePrefixWidth(line, depth)))
```

```diff
--- a/Core/MarkdownPM/Engine/listModel.ts
-export function openerOf(scan: DocScan, k: number): number {
-  const block = scan.fences[k] ?? spanAt(scan.maths, scan.lineStarts[k])
+function openerOf(scan: DocScan, k: number): number {
+  const block = sealedBlock(scan, k)
   return block === undefined ? k : lineIndexAt(scan, block.from)
 }
 
+/** Whether line `k`, read from outside any block it sits in, rides the item above it in a list at quote depth `depth`. */
+export const ridesList = (scan: DocScan, k: number, depth: number): boolean =>
+  continuesList(scan.lines[openerOf(scan, k)], depth)
```

```diff
--- a/Core/MarkdownPM/Engine/blockModel.ts
+  const listMember = new Array<boolean>(n)
+  for (let i = 0; i < n; i++)
+    listMember[i] =
+      (quoteDepthOf(lines[i]) === 0 && markerIn(scan, i, undefined) !== null) ||
+      (i > 0 && listMember[i - 1] && ridesList(scan, i, 0))
```

```diff
--- a/Core/MarkdownPM/Engine/listModel.ts, renumberRuns
-    const i = lineIndexAt(scan, p)
+    let i = lineIndexAt(scan, p)
+    while (fenceDelimiter(scan, i) && openerOf(scan, i) > 0) i = openerOf(scan, i) - 1
```

```ts
// Input/listRenumber.ts, the filter as it stands after 3c; Phase 4's four edits sit on these lines.
export const listRenumber: Extension = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged) return tr
  const relist = tr.isUserEvent(RELIST)
  const { from, to } = tr.startState.selection.main
  const overLines = tr.isUserEvent('input') && tr.startState.sliceDoc(from, to).includes('\n')
  if (!relist && !overLines && !tr.isUserEvent('delete')) return tr
  const was = docScan(tr.startState)
  const scan = docScan.after(tr)
  const numbered = (s: DocScan, pos: number): boolean => {
    const lm = s.markers[lineIndexAt(s, pos)]
    return lm !== null && isSequenced(lm)
  }
  const at: number[] = []
  tr.changes.iterChanges((fromA, toA, fromB) => {
    const left = numbered(was, fromA)
    const stands = numbered(scan, fromB)
    const reshaped = relist
      ? left || stands
      : left !== stands || was.text.slice(fromA, toA).includes('\n')
    if (reshaped) at.push(fromB)
  })
  const changes = renumberRuns(scan, at)
  return changes.length === 0 ? tr : [tr, { changes, sequential: true }]
})
```

```diff
--- a/Core/MarkdownPM/Engine/listModel.ts, dropChanges, the one line differing from a37d2d7b2
-  const post = scanDoc(moved.doc)
+  const post = scanDoc(moved.doc, scan.scope)
```

**Per-File Summary:**

| File | Lines | Change |
|---|---|---|
| `Engine/listModel.ts` | 150 changed | `ridesList`, `runsAround` on `markerIn`, `renumberRuns(scan, at, held)` reading a delimiter from outside its block, `renumberRun`'s first-item start, or `held`'s, `dropChanges` without its loose reads |
| `Engine/blockMove.ts` | 23 changed | `fenced` and `heals` replace `MoveSeams` |
| `Engine/blockModel.ts` | 29 changed | The forward rule replaces the two-pass scan, on `markerIn` |
| `Engine/docScan.ts` | 13 changed | `sealedBlock` replaces `inSealedLine`'s body |
| `Gestures/listDrag.ts` | 2 changed | `collectBoundaries`' slot reads `k` for `line.number - 1` |
| `Engine/detect.ts` | 21 changed | `continuesList` a boolean, `listMarkerText` arrives |
| `Engine/intents.ts` | 17 changed | `railIntents` takes `scan`, reads `ridesList` |
| `Input/listRenumber.ts` | 71 changed | The filter, above |
| `Input/edits.ts` | 11 changed | Enter writes `listMarkerText(lm.kind)` |
| `Input/format.ts` | 21 changed | `listMarkerText` leaves, `setList` skips an item of its own type |
| `Menus/gripMenu.ts` | 17 changed | `firstItemOf` leaves; the menu reads and picks `block.from` to `block.to` |
| `Tables/cellStatic.tsx` | 6 changed | Passes its scan to `railIntents` |

**Tests, All From `a37d2d7b2` Unless Stated:**

| File | Left or Rewritten | Arrived |
|---|---|---|
| `Engine/blockModel.test.ts` | | `a list block ends where the list model does`: five cases, the carried block's blank left to the walk's pin and the rail's |
| `Engine/intents.test.ts` | `a blank line inside a loose list carries the rail across…` | `a blank line ends the rail`; `a flush line or blank line inside a block an item carries keeps the rail running` |
| `Engine/listModel.test.ts` | The patch's rewrites of `:55`, `:75`, `:94`, `:106` | `a drag keeps the start of the run it lands in`: five cases; `a blank line ends a list`; two in `renumberRuns`, since `listRenumber.test.ts` holds a run past Z through the filter; **`a drag recounts on its own surface`, this pass** |
| `Input/format.test.ts` | `repairs a broken ordered sequence` | `leaves a run already of the type as it stands, and Bulleted then Numbered repairs it` |
| `Input/listRenumber.test.ts` | `closes the gap across a loose list`; `counts on through a loose list`; `a pick over a numbered item restarts its run from 1…`; `a line a blank apart joins the run as a loose item`; `paragraphs apart by blank lines become one loose list` | `a list below a blank line keeps its numbers`; `removing the blank line between two lists merges them and recounts`; `a marker taken by a selection recounts the run it broke`; `a flush line left by a taken marker ends the list…`; `stops at a blank line…`; `lands past a run that grew a digit…`; `a lettered run past Z keeps its letters…`; `a pick leaves an item already numbered alone…`; `a line picked above a run starts it…`; `a line a blank apart starts a list of its own`; `paragraphs apart by blank lines each become a list of their own`; **`a change resting on a carried block's delimiter`, four; `a keystroke over a selection across items`, one, this pass** |
| `Menus/gripMenuFlow.test.tsx` | `Checklist and Arrowed reach as a pick at the first item does…`; `a block opening on an indented paragraph reaches from its first item`; `the check reads what the pick reaches` | `reaches every item in its block…`; `an indented paragraph above a list is a block of its own`; `checks no row on a block holding more than one type` |
| `Engine/blockMove.test.ts` | | `joins no run and leaves each list its numbers…`, from the stack's `leaves each list its numbers…`, extended this pass |

**The Merge in `listRenumber.test.ts`:** the stack's `:174` ends `expect(listed(doc, doc.indexOf('y'), doc.length)).toBe(doc)`, since a re-pick writes nothing, and it keeps ` ```md `, from Phase 2. The carried-block pin stays. Paste's `describe` and its `history`, `undo`, and `Transaction` imports were held for Phase 4.

**Pins, With Red Runs:**

| Pin | Mutation | Result |
|---|---|---|
| `blockMove.test.ts` *joins no run and leaves each list its numbers…* | `moveRange` passes `fenced: false` | Red, among 13 of 16 |
| `listModel.test.ts` *reads fence-shaped lines in a cell as lines, moved text included* | `post` reads `scanDoc(moved.doc)`, as `a37d2d7b2` did | Red |
| `listRenumber.test.ts` *a carried Markdown block counts its own run…* (Phase 2's) | `runsAround` reads `scan.markers[k]` with no region compare | Red, the only red of 39 |
| `listRenumber.test.ts` *removing the blank below the block merges the two lists and recounts them* | `renumberRuns`' `i` stands at the delimiter | Red: `1. b`, `2. c` where `2. b`, `3. c` was wanted |
| `listRenumber.test.ts` *taking the item above the block counts past it from its opener* | Same | Red: `3. c` against `2. c` |
| `listRenumber.test.ts` *taking the item between two blocks counts past both* | `while` reads `if`, one step out | Red: `3. c` against `2. c`, 2 failed of 44 with the next |
| `listRenumber.test.ts` *removing the blank below two blocks merges the lists and recounts them* | Same | Red: `1. b`, `2. c` against `2. b`, `3. c` |
| `listRenumber.test.ts` *typing or Enter recounts the run it joins* | `overLines` leaves the gate | Red: `1. xb`, `3. c` against `2. c`, and `1. a`, `3. c` against `2. c` |

**Comments, Line by Line:** net 0 (+9 / -9).

| File | Change |
|---|---|
| `Engine/blockModel.ts` | **-** `// Only where a run actually holds a marker, so a bare indented paragraph isn't swept in.` |
| `Engine/blockMove.ts` | **+** `/** A block stands apart, `fenced`, so a blank line seats it at the slot and heals the hole it leaves. An item drops straight into the lines at its slot, and only an item that was its whole list takes a blank with it. */` |
| `Engine/detect.ts` | Rewritten, `continuesList`'s doc, as in the hunk above |
| `Engine/listModel.ts` | **+** `ridesList`'s doc, as in the hunk above |
| `Engine/listModel.ts` | Rewritten, `siblingsAt`'s doc: the `joins` clause leaves |
| `Engine/listModel.ts` | **+** `/** The runs of the list line `i` belongs to, read from `i`, each line of that list marked in `seen`. A shallower item closes the runs beneath it, and an item of another kind closes its own level's. */` |
| `Engine/listModel.ts` | Rewritten, `renumberRuns`' doc: `/** Recounts every run of each list holding a position in `at`: a nested run from 1, and any other from its first item, or, for the run holding `held`, from the marker it began with before a move. A position on a fence's delimiter reads from outside its block. */` |
| `Engine/listModel.ts` | **-** `// A nested run counts from 1. A top-level run counts from its SMALLEST present ordinal…` |
| `Engine/listModel.ts` | Rewritten, `dropChanges`' doc: `/** A move permutes its run, so the run it lands in can't be read for its start afterward: the start comes from the document before it, and both recounts run against the post-move doc so the offsets are correct, then diff back onto the original as one replace. */` |
| `Input/format.ts` | Rewritten, `setList`'s doc: the restart and I-073 leave |
| `Input/listRenumber.ts` | Rewritten: `// An edit that reshapes a numbered list recounts that list, riding the same transaction so one undo takes both.` |
| `Menus/gripMenu.ts` | **-** `firstItemOf`'s doc |

---

#### Measured

- **Gates at `018cb5f4f`:** typecheck 0, lint 0, tests 9,170 passed, 2 skipped (9,172), 550 files, a clean full run. 3a and 3b each read typecheck 0 and comments 3,515.
- **Comments:** 3,515.
- **Actionable:** cumulative **-126 (+1,000 / -1,126)**. The steps read ±0 (3a), +1 (3b), -88 (3c). All-Inclusive cumulative +288 (+1,829 / -1,541), Tests +410 (+793 / -383), Files +2.
- **Residue:** `firstItemOf`, `mapAscending`, `repicked`, `arrived`, `runsBelow`, `runAt`, `MoveSeams`, `looseSource`, `gapBefore`, and `'blank'` read 0 in production `Core/MarkdownPM`. `leadOf` reads only as `edits.ts`' export and its callers.

#### Differences From the Investigation

- **Behavior Against `a37d2d7b2`:** `dropChanges` rescans the moved text with `scan.scope`. The stack wrote `scanDoc(moved.doc)`, dropping what Phase 1 carried (*7-T3*: "`scan.scope` is what lets `dropChanges` rescan its moved text for the right surface"), so a drag in a cell recounted on a page's reading. **Shown Against the Tree:** in a cell, `2. b` dragged above `1. a` between ` ``` ` lines stayed `2. b`, `1. a` on the stack, and lands `1. b`, `2. a` here. This is a defect in the saved tree, fixed rather than kept, and pinned.
- **Production Diff Against `a37d2d7b2` at This Head:** `quoteAndIndent`, the two guards, the compare and its comment, `listDrag.ts:11`, `detect.ts:508`'s closing sentence, `post`'s scope, `pastedCellText`'s scope (*Phase 1 — Notes*), and the four held paste lines. Nothing else.
- **The Join Pin:** the Investigation lists it to add, and the stack already held *9-T2*'s form of it, which goes red with `fenced` off. It moves a block above a run, so this pass added the other reach, a block dropped onto the line under a run, as a second assertion in that test, and renamed it. A second test would have restated the first.
- **Actionable:** -87 across the phase by `view-delta`, where the scouts' grep read -83 plus the stale drop's -1 before the inverted selection, the delimiter read, and the selection's recount arrived.

#### Calls Taken

- **`quoteAndIndent`:** the name states what the function returns, where `lead` is the word `Input/edits.ts` took.
- **The Rename in 3a:** it landed with the move, so the name is right from the file's first commit.
- **The Stale Drop as Its Own Task:** it stands independent of the walk, and it's green alone.
- **`editorGesture.ts`' Comment:** `// Candidates are viewport-relative…` is the file's existing line on what voids a candidate, so the reason joined it. The file's head comment is about unmounting.
- **The Delimiter Read:** a position on a fence's opener or closer reads from the line above the opener, since the edit landed outside the block, and it keeps walking while that line is another block's delimiter, so two adjacent carried blocks read as one. `openerOf(scan, i) > 0` stops a fence opening at the document's first line.
- **`overLines` Over a Change Walk:** a keystroke over a selection replaces that selection, so the selection's own text answers, and an empty one slices nothing, ahead of both scans: two lines where `iterChangedRanges` took six. The report's Enter example, `1. `, `b`, `3. c`, stands unchanged, since the flush `b` ends the list and `3. c` keeps its start by B-10; the pin holds Enter where it does join two runs.
- **The Inverted Range Runs Through the Seat:** an early return would have left a caret free to rest inside a hidden prefix. Running through the filter keeps *the caret never rests in a hidden line prefix*.
- **Left as the Stack Wrote It:** `rolesAgainst`'s body read, a two-branch expression; an offset to `continuesList` would save one line at most and add a parameter.

#### Facts for the Docs Rewrite

- The *Editor-Internals* entry in *Engine Stack.patch* still needs the stale compare's location: `beginRelocateDrag`'s `onDrop`, for both drags.
- `ridesList` lives in `Engine/listModel.ts`; `openerOf` is private behind it and reads `sealedBlock`, which takes `scan.tables`.
- `dropChanges` is the second entrance to `renumberRuns`, since a move's start can't be read from its result.
- `Engine/blockMove.ts` imports only `detect` and `markdownCode`.

#### Concerns

- **The Stale Drop Has No Pin:** jsdom measures every rect as zero, so a list drag finds no slot and a fresh drag moves nothing, with or without the compare. The rewritten drive is the place: a list drag with a mirrored edit landing before the release. *§Phases* lists no pin for it.
- **Load:** `citationBreakage`, `embedAbsorb`, and twice `Matrix/matrixRuntime.test.ts`'s timing test went red in full runs at a load average near 25, with other builders running. All were 5,000 ms timeouts or passed alone, and untouched `b7f2f17a5` read more of them than this head did, back to back. `matrixRuntime` is new to the Investigation's flaky list.
- **Later Builders:** branches stacked on `a37d2d7b2` hold the tree's five known reds and its `blockMove.ts` names. On rebase, they meet `quoteAndIndent`, the removed guards, `post`'s scope, and the tests Phases 1 and 2 changed in `cellLists.test.tsx`, `listRenumber.test.ts`, `format.test.ts`, `edits.test.ts`, and `formatKeymap.test.ts`.

#### For the Executor

Apply 3a, 3b, and 3c in order. Nothing by hand.
