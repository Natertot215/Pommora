### Wave One — Fold Ledger

**DATE:** 11-06-2026
**FOR:** the plan writer.
**CHAIN:** `lc-w1` in `lc/wt-fold`, head `148e79566`, 23 commits on `b7f2f17a5`, same order and same subjects as `lc-final`, which stands untouched at `3469266d1`.
**DOCS:** `lc-docs2` in `lc/wt-docs`, head `e74905159`, on `148e79566`.
**GATES AT THE HEAD:** typecheck 0, lint 0, 9,217 passed, 2 skipped (9,219), 550 files, a clean full run. Actionable -277 (+1446 / -1723). Comments 3,508, under the cap of 3,511.

**How to Read This:** each task lists what changed from its old patch, every plan sentence or name that's now false with its new wording, each pin with its red result, and its comment changes. A task with nothing to list says so. Plan lines cite *List Consolidation — Implementation Plan.md* as it stood before this fold.

#### Tree-Wide Plan Rows

##### *§Net Ledger*

| Phase | Measured Actionable | Own |
|---|---|---|
| 1 · One Scan Per Surface | -108 (+685 / -793) | -108 |
| 2 · Markdown Code Blocks and Masked Markers | -35 (+819 / -854) | +73 |
| 3 · Blank Lines and Numbering | -119 (+983 / -1102) | -84 |
| 4 · Paste | -117 (+985 / -1102) | +2 |
| 5 · One Marker Grammar | -166 (+1023 / -1189) | -49 |
| 6 · One Set of List Keys, and the Scope's Name | -194 (+1092 / -1286) | -28 |
| 7 · One Definition Per Type | -252 (+1138 / -1390) | -58 |
| 8 · The Word Rule | -299 (+1157 / -1456) | -47 |
| 9 · Right-Click | -299 (+1369 / -1668) | ±0 |
| 10 · Text Properties | -277 (+1446 / -1723) | +22 |
| 11 · Docs and Issues | -277 | ±0 |
| **Total** | **-277 (+1446 / -1723); one production file added, none removed** | |

##### *§Comment Ledger*

| Phase | Count | Own | Change From the Old Row |
|---|---|---|---|
| 1 | 3,512 | +1 | Also arrives: `tagReveal`'s comment, split from `pointerReveal`'s. Also leaves: `intents.ts`' "A cell holds no box" |
| 2 | 3,515 | +3 | None |
| 3 | 3,515 | 0 | Also arrives: `caretSeat`'s inverted-range line, so `listDrag.ts:11`'s departure nets 0 |
| 4 | 3,515 | 0 | None |
| 5 | 3,511 | -4 | None |
| 6 | 3,510 | -1 | None |
| 7 | 3,509 | -1 | None |
| 8 | 3,509 | 0 | None |
| 9 | 3,507 | -2 | None |
| 10 | 3,508 | +1 | Also arrives: `docText`'s comment in `ValueEditor.tsx` |
| 11 | 3,508 | 0 | Documents only |

##### *§Concepts*

- **Line 101:** `inlineLines` • Function becomes `literalLines` • Function. Its description stands.
- **Line 113:** "`levelAt` • Function | A line's level from the scan, holding the mask" becomes "A line's level from the scan, through `markerIn`".
- **Line 115:** the `Extent` • Type row leaves. Nothing replaces it, since `BlockSpan` already stands.
- **Rows That Arrive:** `markerIn` • Function, "The marker a line holds to a reader in one block, or outside every block" (`Engine/docScan.ts`); `sealedBlock` • Function, "The code, math, or table block sealing a line" (`Engine/docScan.ts`); `tagReveal` • Extension, "A page's code tags revealing their copy mark" (`Menus/blockHandles.ts`); `restingRows`, `shortRows` • Functions, "The resting and read-only menu's rows" (`Core/Actions/editorMenu.ts`).
- **REMOVED, Rows That Arrive:** `blockGestures`, `BlockScope`, `CELL_KINDS` ("What a surface mounts by scope, which `readsLists` answers", `surface.ts`, `Menus/blockHandles.ts`); `parseListMarkerPrefixed` ("Folded into `lineMarker`", `Engine/detect.ts`); `pageChrome`, renamed `lineChrome` (`Engine/intents.ts`).
- **`surfaceEditItems`:** the name no longer exists, and `restingEditItems` stays removed. Task 9-3 below holds line 934's wording.

##### *§Constraints · Placements* (Line 166)

"every new, moved, or deleted file is one of these" gains `Core/MarkdownPM/textScope.test.tsx`, moved to `Core/MarkdownPM/inlineScope.test.tsx`.

##### *§Reviews and §Completion*

Every *Net Ledger* and *Comment Ledger* figure a VERIFY or a checkpoint reads follows the tables above and the phase-head table below.

---

#### Task 1-1

**Changed From the Old Patch:**

- **S1:** `blockHandles` is a constant reading `docScan(state).scope`, and its blockquote branch drops the scope term. `TagReveal` leaves `pointerReveal` as `export const tagReveal` and mounts in `MarkdownEditor.tsx` after `codeScroll`. `pointerReveal()` takes no argument and stays a function, and `cheapMiss` reads `view.state.facet(surfaceScope)`. `blockGestures` and `BlockScope` leave for `readsLists(scope) ? [...] : []`.
- **S4:** `CELL_KINDS` leaves. The test reads `GRIP_KINDS.has(b.kind) && (page || b.kind === 'list')`, which is the report's `b.kind === 'list' || (page && GRIP_KINDS.has(b.kind))` with `list` stated once, since the set holds it. Its comment sits on that line.
- **S5:** the false comment leaves, and `pageChrome` becomes `lineChrome`.
- **S7:** `markdownDecorations`, `decorationPlugin`, `caretSeat`, and `acQuery` are constants. `caretSeat`'s helpers hoist to the module, where `run` and `shift` take the names `stepOut` and `extendOut`. `useState(acQuery)` leaves, and the hook reads `acQuery`. The rule is that a factory stays only where a mount needs its own closure state.
- **S16:** `tokenHidden` reads `tokenize(text, scope)`.
- **S20:** `decorationsFor` takes `scan` alone, defaulting to `scanDoc(text)`, and six callers pass `scanDoc(text, scope)`.

**Plan Sentences:**

- **Line 334:** "(43 production files," becomes "(45 production files,".
- **Line 339:** the `scope` Leaves list gains `blockHandles`, `pointerReveal`, and `decorationsFor`.
- **Line 340:** "**Factories Become Constants:** `listRenumber`, `listDragExtension`, `gripMenu`, `typedInput`, `smartDelete`, `commitAliasOnEnter`, `stepDocs`." gains "`markdownDecorations`, `decorationPlugin`, `caretSeat`, `blockHandles`, and `acQuery`. A factory stays only where a mount needs its own closure state, which keeps `linkPointer()`, `citationPointer()`, and `pointerReveal()`."
- **Line 343:** "**`surface.ts`:** `surfaceScope.of(scope)` beside `markdownDecorations()`." becomes "**`surface.ts`:** `surfaceScope.of(scope)` beside `markdownDecorations`, and `readsLists(scope) ? [...] : []` in place of `blockGestures`, with `tagReveal` mounting in `MarkdownEditor.tsx`."
- **New Bullet:** "**`Engine/intents.ts`:** `pageChrome` becomes `lineChrome`, since it reads on every surface, and its comment that a cell's lines aren't walked leaves."
- **Line 350:** "reads about 80, from 223" becomes "reads 64, from 223".

**Pins:** none added. `acQuery.test.ts`, `blockHandles.test.ts`, `codeDiff.test.tsx`, and `docCache.test.ts` follow the constants.

**Comments:**

- **-** `Engine/intents.ts`: `// A cell holds no box, no fence, no math and no citation row, and its own extension draws the footnote markers, so none of this is walked there.`
- **+** `Menus/blockHandles.ts`: `// Each code tag reveals its copy mark while the pointer is within reach, scaled with the editor's font; that listener is the content's own, so a move over a table or an embed, which the editor's handlers skip, still counts.`, split from `pointerReveal`'s, which keeps `// Grips can't self-hover, so a grippable block's first line is a script host, turned `on` whenever the pointer sits in the gutter strip of any of its lines.`
- **Moved:** `CELL_KINDS`' comment, onto the line reading the kinds.

#### Task 2-1

**Changed From the Old Patch:**

- **S3:** `markerIn(scan, k, region)` arrives beside `fenceDelimiter` with no doc line. `ownersOf`, `collectBoundaries`, and `listReach` read it here, and `markerAt` leaves. `inRegion` leaves with it, since `outOfReach`'s region arm is its one remaining reader.
- **S12:** `outOfReach` reads `scan.callouts[k]?.first || (region === undefined ? inSealedLine(scan, k) : scan.fences[k]?.from !== region || fenceDelimiter(scan, k))`.
- **S20:** *a Markdown code block's line gives its marker up on backspace* joins *takes every list key*, keeping its `- [ ] ` assertion.

**Plan Sentences:**

- **Line 401:** "`markers` reads `lineMarker`, null inside math and tables; `fenceDelimiter`." gains "and `markerIn`."
- **Line 404:** "`listReach` reads a region, with `inSealedLine` standing in its `outOfReach`." becomes "`listReach` reads `markerIn` at a region, and `outOfReach` gives each case one reading: `inSealedLine` outside a block, the region and `fenceDelimiter` inside one."
- **Line 406:** "Four pins arrive." becomes "Three pins arrive."

**Pins:** none added. **Comments:** none.

#### Task 2-2

**Changed From the Old Patch:** S20: *a list pick writes its marker before what the line holds* leaves, since *a list pick reaches no line past the ones it touches* asserts the same `1. - a`.

**Plan Sentences:** **Line 420:** "14 pins in" becomes "13 pins in".

**Pins:** none added. **Comments:** none.

#### Task 3-1

**Changed From the Old Patch:** S20: *(the reviewer-flagged case)* and *(blockAt feeds the range)* leave two titles in `blockMove.test.ts`.

**Plan Sentences:** none. **Pins:** none. **Comments:** none.

#### Task 3-2

**Changed From the Old Patch:**

- **A6:** `caretSeat`'s filter turns an inverted range into a caret at `main.to`, ahead of the seat, so a caret landing inside a hidden prefix still seats. The report's early return would have left that hole.
- **A10:** a forward range's head stands. See *§Folded and Not Taken* for the form.

```ts
const main = tr.newSelection.main
// A replace swallowing a range maps its two ends past each other, which only a caret can stand for.
const range = main.from > main.to ? EditorSelection.cursor(main.to) : main
const { anchor, head, empty, assoc } = range
...
(head < visible && head <= anchor
...
if (range === main && seat === head && side === assoc) return tr
```

**Plan Sentences:**

- **Lines 477 and 481, the Task's Sentence and AFTER:** gain "CodeMirror's `SelectionRange.map` maps `from` forward and `to` backward, so a replace swallowing a selection inverts it, reachable by a drop and by a pick. `caretSeat`'s filter turns that into a caret, and a forward range's head stands, so a line selected through the next line's start leaves that line's hidden lead. A caret and a backward head still seat, so Shift+Home can't select a hidden prefix."
- **Line 500:** "the comment count reads one less than Phase 2's row" becomes "the comment count reads Phase 2's row".

**Pins:** all in `prefixSeat.test.tsx`, *a selection a change or a keystroke has to answer for*.

| Pin | Reverted | Red |
|---|---|---|
| *a drop past a selection leaves a caret at the change, and typing lands there* | `range` reads `main` | `SelectionRange{ from: 26, to: 2 }` against `{ from: 2, to: 2 }`; 2 failed of 31 with the next |
| *a pick replacing the marker a selection sits in leaves a caret, and typing lands there* | `range` reads `main` | `SelectionRange{ from: 9, to: 6 }` against `{ from: 6, to: 6 }` |
| *a line selected through the start of a carried block keeps the block's lead* | `head <= anchor` removed | head 10 against 8; 1 failed of 31 |

**Comments:** **+** `decorations.ts`: `// A replace swallowing a range maps its two ends past each other, which only a caret can stand for.`

#### Task 3-3

**Changed From the Old Patch:**

- **S3:** `runsAround` and `blockModel.ts`' `listMember` read `markerIn`.
- **S11:** `sealedBlock(scan, k)` arrives in `Engine/docScan.ts`, `inSealedLine` reads it in one line, and `openerOf` takes its `from`. `spanAt` leaves `listModel.ts`' imports.
- **S19:** `collectBoundaries`' slot reads `line: k`.
- **A1:** `renumberRuns` reads a delimiter from outside its block. `Math.max` answers a fence on the document's first line.

```ts
const k = lineIndexAt(scan, p)
const i = fenceDelimiter(scan, k) ? Math.max(0, openerOf(scan, k) - 1) : k
```

- **A7:** typing or Enter over a selection crossing lines recounts, two lines and one changed gate. A plain keystroke slices an empty selection and pays no scan. The report's Enter example reads `1. `, `b`, `3. c` before and after, since the flush `b` ends the list and `3. c` keeps its start by B-10.

```ts
const { from, to } = tr.startState.selection.main
const overLines = tr.isUserEvent('input') && tr.startState.sliceDoc(from, to).includes('\n')
if (!relist && !overLines && !tr.isUserEvent('delete')) return tr
```

**Plan Sentences:**

- **Line 460, GOAL:** "`openerOf` which line speaks for a line inside a block" stands; add "through `sealedBlock`".
- **Line 527, the Filter's Block:** the gate reads as above.
- **Line 548, New Clause:** "`renumberRuns` reads a fence's delimiter from outside its block."
- **New Bullet:** "**`Engine/docScan.ts`:** `sealedBlock` replaces `inSealedLine`'s body, which reads it."

**Pins:** all in `listRenumber.test.ts`.

| Pin | Reverted | Red |
|---|---|---|
| *removing the blank below the block merges the two lists and recounts them* (A1, the blank-line route) | `i` reads `k` | `1. b`, `2. c` against `2. b`, `3. c`; 2 failed of 43 with the next |
| *taking the item above the block counts past it from its opener* (A1, the opener's exact change) | `i` reads `k` | `3. c` against `2. c` |
| *typing recounts the run it joins* (A7) | `overLines` out of the gate | `1. xb`, `3. c` against `2. c`; 2 failed of 43 with the next |
| *Enter recounts the run it joins* (A7) | `overLines` out of the gate | `1. a`, `3. c` against `2. c` |

**Comments:** `renumberRuns`' doc gains "A position on a fence's delimiter reads from outside its block." Count unchanged.

#### Task 4-1

**Changed From the Old Patch:** the gate carries `overLines`.

```ts
if (!relist && !overLines && !tr.isUserEvent('delete') && !tr.isUserEvent('input.paste'))
  return tr
```

**Plan Sentences:**

- **Lines 601-602, the Diff:** the gate's lines read as above.
- **Line 618:** "`input.paste` out of the gate reads 3 red of 46" becomes "3 red of 50". Rerun at this commit.

**Pins:** none. **Comments:** none.

#### Task 5-1

**Changed From the Old Patch:**

- **S6:** `checkboxToggleChange(scan, pos)` reads `scan.markers`, and `parseListMarkerPrefixed` folds into `lineMarker`. `listModel.ts`' `lineStartAt`, `lineEndAt`, and parser imports leave, as does `listDrag.ts`' `docString`. `cellStatic.tsx` hands it `scanDoc(text, 'cell')` at the press. It landed here because `lineMarker` doesn't exist at Task 1-1.
- **A4:** `LIST_MARKER_RE` ends at `([ \t]+)`. Nothing read the dropped group, by a search for `m[6]` and `idx[6]`. This closes A8.
- **A9:** the ordinal reads `\d{1,9}`. The two regexes can't become one definition: `LIST_LINE` and `LIST_ITEM` read what a parser reads as a list's start, `*` and `1)` included, and B-1 keeps those out of the grammar.

**Plan Sentences:**

- **Line 648:** the regex reads `/^([ \t]*)(?:(\d{1,9}|[A-Z])\.|→|[-+](?:[ \t]+(\[([ xX])\]))?)([ \t]+)/d`.
- **Line 651:** "**`Engine/detect.ts`:** `ARROW_MARKER_RE`, ... and `Box.inner` leave" gains "the regex's `(.*)$` and `parseListMarkerPrefixed`, which folds into `lineMarker`, leave".
- **New Bullet:** "**`Engine/listModel.ts`, `Gestures/listDrag.ts`, `Tables/cellStatic.tsx`:** `checkboxToggleChange` takes a scan."
- **Task 2-1's Block at Lines 393-394:** stands, since `parseListMarkerPrefixed` lives through Phase 4.

**Pins:** both in `detect.test.ts`, under `parseListMarker (single marker source)`.

| Pin | Reverted | Red |
|---|---|---|
| *reads an item whatever ends its line, a carriage return or a line separator included* (A4, A8) | `(.*)$` restored | `undefined` against `'bullet'`; 1 failed of 68 |
| *reads up to nine digits as an ordinal, as standard Markdown does* (A9) | `\d+` restored | a marker against null; 1 failed of 68 |

`listModel.test.ts`' three toggles take a scan, and `detect.test.ts`' `describe` reads `lineMarker`.

**Comments:** none.

#### Task 6-1

**Changed From the Old Patch:**

- **S1, S4:** `blockHandles.ts`' rename shrinks to `cheapMiss`'s compare and the comment, and `surface.ts` takes none, since `blockGestures`, `BlockScope`, and `LIST_KINDS` aren't there to rename.
- **S8:** `inlineSurface` becomes `sharedSurface`, `inlineLines` becomes `literalLines`, and `textScope.test.tsx` becomes `inlineScope.test.tsx`.

**Plan Sentences:**

- **Line 692:** "`CELL_KINDS` becomes `LIST_KINDS`." becomes "`inlineSurface` becomes `sharedSurface`, `inlineLines` becomes `literalLines`, and `textScope.test.tsx` becomes `inlineScope.test.tsx`."

**Pins:** none. **Comments:** `blockHandles.ts`' comment rewords to "`lists` speaks the list vocabulary alone…", as before. Count unchanged.

#### Task 6-2

**Changed From the Old Patch:** S19: `takeMarker` takes `k`, and `typedInput`'s doc reads every surface.

**Plan Sentences:** none. **Pins:** none.

**Comments:** rewritten, `markdownInput.ts`: `/** Every typed character on every surface: only a page takes the callout shorthand and the citation seed, which write page constructs. */`, from `/** Every typed character on both surfaces: a cell skips the callout shorthand and the citation seed, which write page constructs. */`. Count unchanged.

#### Task 7-1

**Changed From the Old Patch:** `checkboxToggleChange`'s `lm.box` read follows into its Task 5-1 shape. Nothing else.

**Plan Sentences:** none. **Pins:** none. **Comments:** none.

#### Task 7-2

Clean pick, no change.

#### Task 7-3

**Changed From the Old Patch:**

- **S10:** `pushConstruct(intents, scan, i, base, selStart, ranged)` reads `line`, `ls`, and `lm` itself and pushes `md-list-text`, so `lineIntentsInto` drops its reads.
- **S15:** `subBlockAt` returns `BlockSpan`. Verified: `GLYPH_CLASS` draws only from a `pushConstruct` branch holding `lm`, or inside a table widget, and only `decorations.ts`' own glyphs override `ignoreEvent`, so an outer view never sees a table's or tile's glyph. The check, `listDrag`'s `if (!block)`, `ownersOf`'s and `listReach`'s `!`, and the glyph comment's last clause leave.

**Plan Sentences:**

- **Line 792:** "its return value, `lineIntentsInto`'s `li` and `base` offset, and `subfieldStats.ts`' second parse leave" gains "`pushConstruct`'s `lm`, `line`, and `ls` parameters and `subBlockAt`'s null leave too".

**Pins:** none added. *returns null off a list line* leaves, with `drop`'s throw and the test `!`s.

**Comments:** shortened, `Gestures/listDrag.ts`: ", which mousedown still starts when the pointerdown resolves no block" leaves. Count unchanged.

#### Task 7-4

**Changed From the Old Patch:**

- **S3:** `levelAt` reads `markerIn(scan, i, undefined)?.level ?? -1`.
- **A5:** the first loop gates `ridesList`.

```ts
for (let i = 0, depth = 0, open = false; i < n; i++) {
  ...
  else if ((open || level >= 0) && own >= depth && ridesList(scan, i, depth)) shown[i] = CARRIES
  ...
  open = level >= 0 || shown[i] === CARRIES
}
```

**Differential:** a throwaway of `railIntents` old against new over 240,000 strings at the page and `lists` scopes, 480,000 documents, half structured nested lists with quote prefixes, wraps, carried fences, tables, and math. 55,754 drew rails, and 0 differed. `open` alone differs on 5,661, since a marked line in an indented quote carries with no list open, so the gate keeps `level >= 0`. `open = shown[i] !== LIST_ENDS` differs too, on a quoted list's first wrap.

**Measured:** median ms per keystroke over 400 samples, after 60 warm, the middle of three rounds, through `docScan.after` and `docLineIntentsOf.after` in vitest.

| Row | `b7f2f17a5` | `3469266d1` | `148e79566`'s Tree |
|---|---|---|---|
| 20,000 lines, every other blank | 1.32 | 1.86 | 1.35 |
| 5,000 tables of 4 lines | 1.71 | 3.00 | 1.61 |
| 20,000 bullets | 1.62 | 1.73 | 1.95 |

The report's paragraph row reads 1.63 and 2.09, whose rise this shape reproduces. One unbroken 20,000-line paragraph reads about 11 ms on every tree, a separate walk that this work didn't move. The bullets row's rise is vitest's per-call import getter on `markerIn` rather than the code: with the binding hoisted to a local the three rows read 1.15, 1.41, and 1.75, and with `levelAt` spelled inline 1.17, 1.43, and 1.76. A bundled build has no such getter.

**Plan Sentences:**

- **Line 805:** "An edit allocates less than before, so *Never Do Expensive Work On Every X* holds." becomes "An edit allocates less than before, and `ridesList` runs only while a list is open, so a list-free document costs what it did at the baseline: 1.35 ms against 1.32 on 20,000 lines, 1.61 ms against 1.71 on 5,000 tables."
- **Line 805, the Same Paragraph:** "`levelAt` reads a line's level from the scan and holds the mask" becomes "`levelAt` reads a line's level from the scan through `markerIn`."

**Pins:** none added. *an item inside a Markdown code block takes no rail* reruns red with `levelAt` reading `scan.markers[i]` bare, 1 failed of 99.

**Comments:** none.

#### Task 8-1

Clean pick onto `inlineScope.test.tsx`, no change.

**Plan Sentences:** any citation of `textScope.test.tsx` reads `inlineScope.test.tsx`.

#### Task 9-1

Clean pick, no change.

#### Task 9-2

**Changed From the Old Patch:** S14: `Extent` leaves for `BlockSpan`, in `menu.ts`, at `applyEditorAction`, and in `pasteLink.ts`' two inline spellings.

**Plan Sentences:** **Line 904:** "`routeRightClick` carries one `Extent`" becomes "`routeRightClick` carries one `BlockSpan`".

**Pins:** none. **Comments:** none.

#### Task 9-3

**Changed From the Old Patch:**

- **S13:** `surfaceEditItems` becomes `restingRows(selected, canPaste)` and `shortRows(selected)`, sharing `copyRow`. The parameter, the `Exclude`, the default, and the switch leave.
- **M2:** the `SURFACE_EDITS.selectAll` branch calls `selectAll(view)` and then `view.focus()`.
- `export type Extent` doesn't arrive, and `restingSelection` returns `BlockSpan`.

**Plan Sentences:**

- **Lines 919-931, the Block:** reads the two lists.

```ts
const copyRow = (selected: boolean): ActionItem<string> => ({
  label: 'Copy',
  action: SURFACE_EDITS.copy,
  chord: 'cmd+c',
  disabled: !selected,
})

export const restingRows = (selected: boolean, canPaste: boolean): ActionItem<string>[] => [
  { label: 'Cut', action: SURFACE_EDITS.cut, chord: 'cmd+x', disabled: !selected },
  copyRow(selected),
  { label: 'Paste', action: SURFACE_EDITS.paste, chord: 'cmd+v', disabled: !canPaste },
]

export const shortRows = (selected: boolean): ActionItem<string>[] => [
  copyRow(selected),
  { label: 'Select All', action: SURFACE_EDITS.selectAll, chord: 'cmd+a' },
]
```

- **Line 934:** "`SURFACE_EDITS` and `surfaceEditItems` replace `RESTING_EDITS` and `restingEditItems`" becomes "`SURFACE_EDITS`, `restingRows`, and `shortRows` replace `RESTING_EDITS` and `restingEditItems`". "`applyEditorAction` takes Copy and Select All." gains "and Select All focuses the view, so ⌘C reads it from a read-only cell".

**Pins:**

| Pin | Reverted | Red |
|---|---|---|
| *selects and focuses the page from a read-only table's Select All, so ⌘C reads it* (M2), an assertion added to the existing pin | `view.focus()` removed | `document.activeElement` read `<body>`; 1 failed of 16 |

**Comments:** none.

#### Task 9-4

**Changed From the Old Patch:** S8: `showSource` becomes `paintSeat`.

**Plan Sentences:** none name it. **Pins:** none. **Comments:** none.

#### Task 9-5

**Changed From the Old Patch:**

- **S9:** one private `leadEnd(line, start, atomics)` serves `prefixEndAt` and `seatPastMarker`. `prefixEndAt`'s test moves from `it.from === end` to `end >= it.from && end < it.to`, proven by a throwaway over 150,000 documents: 2,244,876 line positions, 869,784 holding a prefix, 0 differences.
- **A10's Clause:** this task's rewrite of the seat carries it: `const visible = head > anchor ? head : Math.max(head, prefixEndAt(intents, scan, head))`.

**Plan Sentences:** **Line 978:** "`seatPastMarker`'s scope test leaves and its walk starts at the line's start" gains ", through the walk it shares with `prefixEndAt`".

**Pins:** none added. **Comments:** none.

#### Task 10-1

**Changed From the Old Patch:**

- **S1:** the surface's conflict resolves to `sharedSurface(scope, remembers)`, and `readsLists(scope)`'s arm stands, so a field still mounts nothing.
- **A4:** `blanked` becomes `docText`, reading `\r\n` as CodeMirror's document does. `committed` holds it at the ref, the commit, and the outside-write effect, where `next = docText(initial)` replaces both raw reads.

**Plan Sentences:**

- **Line 1016:** "`oneLine` leaves `editorBase` and `inlineSurface`" becomes "`oneLine` leaves `editorBase` and `sharedSurface`". "reach the pane through `blockGestures` and `editorBase`" becomes "reach the pane through the surface's `readsLists` arm and `editorBase`". New sentence: "`ValueEditor` compares against the text as the document holds it, so a pane closed untouched leaves a `\r\n` value on disk as it was."

**Pins:**

| Pin | Reverted | Red |
|---|---|---|
| `TextPane.test.tsx` *leaves a value a tool wrote with \r\n as it was when closed untouched, and saves it as written once edited* | `docText`'s replace removed | `onCommit` called once; 1 failed of 22 |

**Comments:** **+** `ValueEditor.tsx`: `// CodeMirror reads `\r\n` as one break, so a value a tool wrote that way compares as the document holds it, and a pane closed untouched leaves it as it was.`

#### Task 10-2

**Changed From the Old Patch:** S18: `--list-indent` and `--bullet-zone` join `:root`.

**Plan Sentences:** none. **Pins:** none.

**Comments:** rewritten, `markdown-pm.css`' KNOBS: "They sit above .md-list-item, on :root, so a resting value's glyph, a citation row, and a blank line a rail crosses, which sit in the same columns but aren't list lines, still get them." Count unchanged.

#### Task 10-3

**Changed From the Old Patch:** S17: `asText` reads `linkEntry(raw, 2) ?? (Array.isArray(raw) ? … : yamlInline(raw))`, with `inlineText` kept for a member.

**Plan Sentences:** none; line 1042 holds. **Pins:** none. **Comments:** none.

---

#### Docs

`lc-docs2` carries `c31314e25` with these corrections, nothing else.

- **`IssuesPM.md`, I-036:** 15 bare comparisons across ten files, read by `git grep` at the head, from 17, and 3 `= 'page'` defaults, from 6. "The only capability switch is `readsLists`." The `checkboxToggleChange` sentence and its citation leave, since it reads the scan.
- **`IssuesPM.md`, Citations:** footnotes 14, 15, 16, 17, 18, 20, 24, 36, 39, 51, 57, 72, and 73 shift to the folded lines.
- **`Editor-Internals.md`, *List Numbering Has One Writer*:** "A deletion, a paste (`input.paste`), or a keystroke over a selection crossing lines takes the same recount", since A7 made the old sentence incomplete. This is the one sentence changed for a behavior rather than a name or count.

---

#### Phase Heads

| Phase | Head | Comments | Actionable, Cumulative | Tests Cell | Full Suite |
|---|---|---|---|---|---|
| 1 | `0147e6f02` | 3,512 | -108 (+685 / -793) | +44 (+212 / -168) | 9,127 passed, 2 skipped (9,129), 549 files |
| 2 | `110f75059` | 3,515 | -35 (+819 / -854) | +176 (+399 / -223) | 9,141 passed, 2 skipped (9,143), 549 files |
| 3 | `6402c7f28` | 3,515 | -119 (+983 / -1102) | +405 (+788 / -383) | 9,171 passed, 2 skipped (9,173), 550 files |
| 4 | `d0e44d9b7` | 3,515 | -117 (+985 / -1102) | +455 (+839 / -384) | 9,178 passed, 2 skipped (9,180), 550 files |
| 5 | `d94f5649d` | 3,511 | -166 (+1023 / -1189) | +517 (+931 / -414) | 9,185 passed, 2 skipped (9,187), 550 files |
| 6 | `27f15781c` | 3,510 | -194 (+1092 / -1286) | +531 (+961 / -430) | 9,186 passed, 2 skipped (9,188), 550 files |
| 7 | `7618b2c8c` | 3,509 | -252 (+1138 / -1390) | +571 (+1021 / -450) | 9,192 passed, 2 skipped (9,194), 550 files |
| 8 | `7ea777ebb` | 3,509 | -299 (+1157 / -1456) | +625 (+1089 / -464) | 9,197 passed, 2 skipped (9,199), 550 files |
| 9 | `762b20b1f` | 3,507 | -299 (+1369 / -1668) | +716 (+1286 / -570) | 9,203 passed, 2 skipped (9,205), 550 files |
| 10 | `148e79566` | 3,508 | -277 (+1446 / -1723) | +864 (+1457 / -593) | 9,217 passed, 2 skipped (9,219), 550 files |

Every full run read clean, with no timeout to rerun. Typecheck read 0 at each of the 23 commits, and `biome format` reported nothing at each.

**Task Commits:** 1-1 `0147e6f02`; 2-1 `c92426287`; 2-2 `110f75059`; 3-1 `b1d108d97`; 3-2 `31f112c8a`; 3-3 `6402c7f28`; 4-1 `d0e44d9b7`; 5-1 `d94f5649d`; 6-1 `ee7258d5e`; 6-2 `27f15781c`; 7-1 `a0be11ce3`; 7-2 `6e2b664dc`; 7-3 `b84a95545`; 7-4 `7618b2c8c`; 8-1 `7ea777ebb`; 9-1 `2572fa574`; 9-2 `2f519465c`; 9-3 `6db044c13`; 9-4 `8b8714e5c`; 9-5 `762b20b1f`; 10-1 `58cf0324e`; 10-2 `8ac9f18ec`; 10-3 `148e79566`.

**Patches:** the 23 patches beside the *Notes* were re-saved from `lc-w1` by `lc/fold/save-patches-w1.sh`, since *§Plan Rules* reads a task's AFTER as its patch. `lc/save-patches.sh` still regenerates the old set from `lc-final`.

---

#### Concerns

- **M2 in a Glance:** `view.focus()` reaches a glance's tile from Select All on a read-only cell, against `GlancePane.tsx:38`'s contract that the pane never takes focus. It answers a menu pick rather than a press, and the close path restores `focusBefore`. The probes drove the tile and reader routes alone, so this route wasn't driven.
- **Five Inline `{ from, to }` Spellings Stand:** `citationEdits.ts:19`, `:22`, `intents.ts:519`, `markdownInput.ts:79`, and `MarkdownEditor.tsx:91` are outside S14's cite and were left. Each could read `BlockSpan`.
- **Not Driven Live:** no fold ran in the app, as the brief allows. The drives on `lc-drive` last read the old chain, so A6, A10, A7, and M2 want a pass on the rebuilt head.

---

#### Folded and Not Taken

##### Folded

- **S1:** Tasks 1-1, 6-1, and 10-1.
- **S3:** Tasks 2-1, 3-3, and 7-4.
- **S4:** Tasks 1-1 and 6-1, with `list` stated once.
- **S5:** Task 1-1.
- **S6:** Task 5-1.
- **S7:** Task 1-1.
- **S8:** Tasks 6-1 and 9-4.
- **S9:** Task 9-5.
- **S10:** Task 7-3.
- **S11:** Task 3-3.
- **S12:** Task 2-1.
- **S13:** Task 9-3.
- **S14:** Task 9-2.
- **S15:** Task 7-3.
- **S16:** Task 1-1.
- **S17:** Task 10-3.
- **S18:** Task 10-2.
- **S19:** Tasks 3-3 and 6-2.
- **S20:** Tasks 1-1, 2-1, 2-2, and 3-1.
- **A1:** Task 3-3, both routes pinned.
- **A4:** Tasks 5-1 and 10-1.
- **A5:** Task 7-4, the gate holding equivalence.
- **A6:** Task 3-2, through the seat rather than an early return.
- **A7:** Task 3-3, two lines and no scan on a plain keystroke.
- **A8:** Closed by A4's regex, and pinned there.
- **A9:** Task 5-1, the spelling; see below for the one definition.
- **M2:** Task 9-3.

##### Not Taken

- **A10's Literal Form, Taken Narrower:** leaving every range's head where it stands reddens *Shift+ArrowLeft and Shift+Home never select the hidden prefix alone*, 1 failed of 2,016 across `Core/MarkdownPM`, since Shift+Home on `> world` would select the hidden `> `. That's a reason a user meets, for a backward head. A forward head has none, and it's the case the finding names, so a forward range's head stands and a backward one seats. Dropping `head > anchor ? head :` at Task 9-5 and `&& head <= anchor` at Task 3-2 returns the old seat, leaving the finding open.
- **A9's One Definition:** `LIST_MARKER_RE` and `LIST_LINE` can't merge, since `LIST_LINE` reads `*` and `1)` as a parser does, and B-1 keeps both out of the grammar. One spelling of the ordinal stands.

##### Not for This Fold

- **S2, S21, A2, A3:** plan edits the coordinator makes.
- **M1:** no code; it stands as a behavior row.
