### Phase 2 — Notes

**Commit:** `a8bc8985e` on `lc-w2`, on `98becb14b`.
**Patch:** *Phase 2 — Markdown Code Blocks and Masked Markers.patch* (`git diff 98becb14b a8bc8985e`).
**Delivers:** C-1 to C-7, and F-1's table header, diff sign, and `-[x]`.

#### Task: Markdown Code Blocks and Masked Markers

**In Plain Terms:** `scan.markers[k]` now holds the marker a line actually has where it stands. A line in a Markdown code block reads its marker from the fence's body, a line in any other code block has none, and a line inside math or a table has none. Everything that asked "who is reading this line?" through `itemAt` and `readsFrom` now reads the array, and `markerIn` states the one region compare where a reader must stay in its own block. A list inside ` ```md ` takes every key and pick, every other block is plain code, and the format rows write into code unaware of it, past a diff sign and never on a delimiter.

**What Leaves:** `Reader`, `'outside'`, `readsFrom`, `itemAt`, `blockPrefix`; `inSealedLine` from the list model (it stays in `listReach`'s `outOfReach`); `readsFrom`'s docblock; `toggleInline`'s fence refusal and `link:insert`'s; a repeated fence test in `readFormatState`; `listRenumber.ts`' `readsFrom` guard. `smartBackspace`'s `inCodeAt` return moves below `takeMarker`.

**What Arrives:** `lineMarker`, `readsListsIn` (`Engine/detect.ts`), `fenceDelimiter`, `markerIn` (`Engine/docScan.ts`), `leadOf`, `opensCodeList` (`Input/edits.ts`). `splitPrefix` takes `(scan, k)` and reads `leadOf` itself, and `lineBodyBefore` takes a scan and slices past `leadOf`, so `opensLine` leaves for `isBlank(lineBodyBefore(scan, pos))` and what stands past a line's lead has one spelling. `calloutShorthand` and `setHeading` take a scan in place of a string.

**Key Hunks:**

```diff
--- a/Core/MarkdownPM/Engine/detect.ts
+/** A code block that reads lists: Markdown, and no diff, whose leading `-` and `+` are change signs. */
+export const readsListsIn = (f: FenceInfo): boolean =>
+  f.name === 'Markdown' && f.tally === undefined
+
+/** The marker a line holds where it stands. A code block that reads lists reads them from its own body, so its fence's lead is no nesting and a quoted line is no item. */
+export function lineMarker(line: string, f: FenceInfo | undefined): ListMarker | null {
+  if (f === undefined) return parseListMarkerPrefixed(line)
+  if (!readsListsIn(f)) return null
+  const body = fenceBodyStart(line, f)
+  return parseListMarker(line.slice(body), body)
+}
```

```diff
--- a/Core/MarkdownPM/Engine/docScan.ts
-    markers: lines.map(parseListMarkerPrefixed),
+    markers: lines.map((l, i) =>
+      (spanAt(math.ranges, lineStarts[i]) ?? spanAt(tables, lineStarts[i]))
+        ? null
+        : lineMarker(l, fences[i]),
+    ),
```

```diff
--- a/Core/MarkdownPM/Engine/docScan.ts
+export const markerIn = (
+  scan: DocScan,
+  k: number,
+  region: number | undefined,
+): ListMarker | null => (scan.fences[k]?.from === region ? scan.markers[k] : null)
```

```diff
--- a/Core/MarkdownPM/Input/format.ts, listReach
-  const inRegion = (k: number): boolean => scan.fences[k]?.from === region
-  const markerAt = (k: number): ListMarker | null => (inRegion(k) ? scan.markers[k] : null)
...
   const outOfReach = (k: number): boolean =>
-    !inRegion(k) ||
     scan.callouts[k]?.first ||
-    fenceDelimiter(scan, k) ||
-    (region === undefined && inSealedLine(scan, k))
+    (region === undefined
+      ? inSealedLine(scan, k)
+      : scan.fences[k]?.from !== region || fenceDelimiter(scan, k))
```

```diff
--- a/Core/MarkdownPM/Input/edits.ts
-// A cell draws no quote, so a `>` there is prose and carries no prefix — otherwise the keys would nest inside a box the surface never shows.
-export const blockPrefix = (scan: DocScan, line: string): string =>
-  scan.scope === 'page' ? quotePrefix(line) : ''
+/** What stands before line `k`'s own text: inside a code block its fence's lead and any diff sign, elsewhere its quote. */
+export function leadOf(scan: DocScan, k: number): string {
+  const line = scan.lines[k]
+  const f = scan.fences[k]
+  return f ? line.slice(0, codeSeat(line, f)) : scan.quotes[k] ? quotePrefix(line) : ''
+}
```

```diff
--- a/Core/MarkdownPM/Input/format.ts
+  // A diff line's sign is its change, so a row writes past it.
+  const from = Math.max(selFrom, signSeatAt(scan, selFrom) ?? selFrom)
+  const to = Math.max(selTo, from)
```

**Per-File Summary:**

| File | Lines | Change |
|---|---|---|
| `Engine/detect.ts` | +12 / -0 | `readsListsIn`, `lineMarker` |
| `Engine/docScan.ts` | +15 / -2 | Masked `markers`, `fenceDelimiter`, `markerIn` |
| `Engine/listModel.ts` | +19 / -26 | `Reader`, `readsFrom`, `itemAt` leave; `rolesAgainst` reads a `block`; `ownersOf` takes a `region` |
| `Gestures/listDrag.ts` | +5 / -3 | `collectBoundaries` reads `markerIn` at a `region` hoisted out of its per-line callback |
| `Input/edits.ts` | +64 / -43 | `leadOf`, `opensCodeList`, `lineBodyBefore` on the scan, the two shorthands in a Markdown block, `calloutShorthand` off in code, `continueBlockquoteOnEnter` reads `scan.quotes`, and it and `smartBackspace` read `k` first |
| `Input/format.ts` | +86 / -51 | `readLine`'s fenced branch, `selectedLines` skips delimiters, `editFor` clears the sign, `setBlock`'s quote and callout write past it, `toggleWrap` takes `underSelection`'s tokens, `listReach` reads `region` through `markerIn`, and `outOfReach` gives each case one reading |
| `Input/formatState.ts` | +2 / -4 | `fenced` read from `underSelection`; no heading state in code; `splitPrefix` reads the line `underSelection` trimmed to |
| `Input/listRenumber.ts` | +4 / -8 | Reads `markers`; the deletion's guard leaves |
| `Input/markdownInput.ts` | +1 / -1 | `calloutShorthand(scan, …)` |
| `Menus/gripMenu.ts` | +2 / -3 | `firstItemOf` tests a fence itself until Phase 3 removes it; `setHeading` takes a scan |

**Tests:**

| Test | Disposition | Reason |
|---|---|---|
| `format.test.ts:98` *Insert Link stands down on a fenced line, as the wraps do* | **Left** | C-5, by A-4. Its plain-text half stays covered by `Links/linkEdit.test.tsx:463` and `Tables/cellRestingMenu.test.tsx:358` |
| `formatKeymap.test.ts:38` *claims its chord on a fenced line…* | **Left** | C-5, by A-4. `EditorView`, `editorHost`, and `testHost` imports left with it, and so did the file's `@vitest-environment jsdom` header, since nothing there needs a DOM now |
| `format.test.ts:147` | **Changed** | Now *stands down inside inline code for every mark but Code*: the fenced assertion left and the inline-code half stands |
| `listRenumber.test.ts:168` | **Changed** | Re-aimed at ` ```md `, offsets moved by 2 |
| `listRenumber.test.ts:174` | **Changed** | Re-aimed at ` ```md `, every assertion unchanged in meaning |
| `docScan.test.ts` generator | **Changed, saved tree** | The alphabet holds ` ```md `, ` ```markdown diff `, ` ```notes.md `, ` ```md diff `, `  ```md `, `> ```md `, `  - in`, `> - in`, across Phases 1 and 2 |
| `edits.test.ts`, `format.test.ts`, `regressionPins.test.ts` signature migrations | **Changed, saved tree** | `calloutShorthand` and `setHeading` take a scan |
| `format.test.ts` `heads` helper | **Changed** | The saved tree wrote `setHeading(scanDoc(scan.text), …)` inside a helper holding `scan`; it now reads `setHeading(scan, …)` |

**Pins Added:**

| Pin | Counterpart Of | Red Run: `readsListsIn` Answers False | Red Run: `rolesAgainst` Reads the Line, Not Its Opener |
|---|---|---|---|
| `edits.test.ts` *takes every list key on a list-shaped line inside a Markdown code block*, its Backspace on a box included | `edits.test.ts:82-99`, `:172` | Red | Not run |
| `listRenumber.test.ts` *a line deletion inside a Markdown code block closes the gap* | `listRenumber.test.ts:46` | Red | Not run |
| `listRenumber.test.ts` *a carried Markdown block counts its own run, and the list around it counts past the block* | The carried block | Red | Red |

The re-aimed `:168` and `:174` also went red under the first mutation, and `:174` under the second. Both mutations were restored, and the two suites read 5 failed of 190, then 2 failed of 33, against 0 clean.

#### Comment Changes

Net +3 (+7 / -4), reaching 3,515.

| File | Change |
|---|---|
| `Engine/detect.ts` | **+** `/** A code block that reads lists: Markdown, and no diff, whose leading `-` and `+` are change signs. */` |
| `Engine/detect.ts` | **+** `/** The marker a line holds where it stands. A code block that reads lists reads them from its own body, so its fence's lead is no nesting and a quoted line is no item. */` |
| `Engine/listModel.ts` | **-** `readsFrom`'s docblock |
| `Input/edits.ts` | **-** `// A cell draws no quote, so a `>` there is prose…` |
| `Input/edits.ts` | **+** `/** What stands before line `k`'s own text: inside a code block its fence's lead and any diff sign, elsewhere its quote. */` |
| `Input/edits.ts` | Rewritten: `// A fence holds literal text past its own list, so collapsing a prefix there would eat characters the author typed as content.` |
| `Input/format.ts` | Extended, `underSelection`'s doc: ", so a row there only ever writes" |
| `Input/format.ts` | **+** `// A diff line's sign is its change, so a row writes past it.` |
| `Input/format.ts` | **+** `// A code line reads as written: a row's lead joins it past its own indent, and nothing there is stripped.` |

#### Measured

- **Gates at Phase 2's head, `c85eb6cd2`:** typecheck 0, lint 0. Tests 9,142 total, 2 skipped, 549 files, 9,140 passed, a clean full run. `citationBreakage` and `embedAbsorb` time out at 5,000 ms under load at every commit: back to back at a load average near 25, untouched `b7f2f17a5` read 10 and 3 failed of the 49 in those two files, so no slowdown came from this work.
- **Comments:** 3,515, matching the ledger.
- **Actionable:** cumulative **-42 (+834 / -876)** at `a8bc8985e`, this step **+66 (+203 / -137)**, and **-39 (+838 / -877)** at Phase 2's head.

#### Differences From the Investigation

- **Actionable:** this step reads +66 by `view-delta`, against the scouts' +63, with the same counting gap as Phase 1. Production files at this head equal `f0d5f60c5`'s, apart from Phase 1's two changes (`detect.ts:508`'s closing sentence and `pastedCellText`'s scan).
- **Behavior:** none from `f0d5f60c5`.

#### Calls Taken

- **`format.test.ts:98` Leaves Whole:** its second assertion doesn't conflict with C-5, and A-4 reads the test as a unit, while the plain path has two other tests. Keeping a half would have left a test named for something else.
- **The `heads` Helper:** a redundant rescan in the saved tree's test, fixed while reading the diff.
- **A Selection Starting at a Line's End:** `readFormatState` reads the line `underSelection` trimmed to, so `splitPrefix` takes that line's `k`, read from `ls`. Pairing it with `leadOf` of the untrimmed `selFrom` lost the Heading row's check on `plain\n> # h` over 5 to 11. Pinned in `formatState.test.ts`, red with `lineIndexAt(scan, selFrom)`: `expected +0 to be 1`, 1 failed of 10.
- **`> ` Off a Page:** `lineBodyBefore` reads `leadOf`, and a `lists` or `inline` scan holds no quote, so a line opening `> ` there isn't a blank lead: `> ##` writes `§`, as `x ##` does. A page reads the same, since a quote's prefix is `leadOf` there and every caller returns on `isLiteralAt` in code first. `edits.test.ts` and `cellLists.test.tsx` hold.
- **`markerIn`:** one line of its own, beside `fenceDelimiter`, stating C-2's whole rule. `regionOf` stays a field read, since a field read isn't a rule. `inRegion` leaves too once `markerAt` does, since `outOfReach`'s region arm is its one remaining reader.
- **The Carried Block's Pin:** written against `landEdit` rather than `renumberRuns`, so it states the user's edit and survives Phase 3's rewrite of the walk. Phase 3 reruns it against `runsAround`'s region compare.

#### Facts for the Docs Rewrite

- `leadOf` is a line's lead: the fence's lead and diff sign in code, the quote elsewhere, and nothing in a cell, since a cell's `quotes` read false.
- A row refuses on a delimiter line through `selectedLines` and `toggleInline`.
- `markers` depends on `fences`, `maths`, and `tables`, and `rescan`'s window computes all of them from one pass.

#### Concerns

- **C-5 to C-7's Rows:** their pins stand in *§Pins Added Later*.

#### For the Executor

Nothing by hand.

#### Pins Added Later

**Commit:** `c85eb6cd2` on `lc-w2`, on `a8bc8985e`, Task 2-2, touching `Core/MarkdownPM/Input/format.test.ts`, `Core/MarkdownPM/Input/edits.test.ts`, and `Input/format.ts`' two refusals.

**Already Pinned:** none of the brief's behaviors. No test in the tree held a row writing into code, a delimiter refusing, a sign surviving, or either shorthand in a block. Phase 2's own pins cover the keys and the numbering, and `format.test.ts`' inline-code half covers prose only.

**Pins:** twelve. The seven in `format.test.ts` sit in one new `describe`, *the rows in a code block*, and the five in `edits.test.ts` sit in the `describe`s of their transforms.

| # | Pin | Behavior | Red Against |
|---|---|---|---|
| 1 | *Bold writes its marks around the selection* | C-5 | R1 |
| 2 | *Heading writes past the line's own indent and strips nothing* | C-5 | R2 |
| 3 | *a list pick counts nothing, and reaches no line past the ones it touches* | C-5, `1. - a` | R2, R3 |
| 4 | *a row picked twice writes again* | C-5, `1. 1. - foo`, `## ## - foo`, `****word****` | R1, R2, R3 |
| 5 | *refuses on a delimiter line* | Row 27: Bold, Heading, and a list pick, on opener and closer | R4, R5, R6, R10 |
| 6 | *writes after a diff line's sign, whatever the language, so the sign survives* | C-7, in `diff` and `md diff` | R1, R2, R3, R7, R8, R9, R15, R16 |
| 7 | *a selection from prose through the block: list picks leave the code, Heading and Bold write* | Row 26 | R1, R2, R4, R10 |
| 8 | *-[] writes a box at a line's start in a Markdown code block, past the block's lead* | C-6 | R11 |
| 9 | *stays literal everywhere else in code* (checkbox) | C-6, `-[x]` included | R12 |
| 10 | *-> writes an arrow at a line's start in a Markdown code block, and nowhere else in code* | C-6 | R13, R14, R17, R16 |
| 11 | *a third mark stays literal in code* | C-6, `‼!` | R18 |
| 12 | *stays literal in code* (callout) | C-6, `\|\|` | R19 |

**Red Runs:** each is one line changed in production at Task 2-1's head, run against both test files (R10 against `format.test.ts` alone), then restored. Only pins went red, apart from the two older tests R3 names.

| Run | The One-Line Revert | File |
|---|---|---|
| R1 | `spanned` reads `inCodeAt(scan, at)`, so `toggleInline` refuses in a fence again | `Input/format.ts` |
| R2 | `readLine`'s `if (scan.fences[k] !== undefined)` answers false, so a code line is stripped as Markdown | `Input/format.ts` |
| R3 | `lineMarker`'s `if (!readsListsIn(f)) return null` leaves, so plain code reads lists. *leaves list-shaped lines…* and *a fence line keeps its marker…* also went red | `Engine/detect.ts` |
| R4 | `selectedLines`' `fenceDelimiter` filter leaves | `Input/format.ts` |
| R5 | `toggleInline`'s `fenceDelimiter` return leaves | `Input/format.ts` |
| R6 | `outOfReach`'s `fenceDelimiter` arm leaves | `Input/format.ts` |
| R7 | `editFor`'s `from` reads `selFrom` | `Input/format.ts` |
| R8 | The quote's `ls` reads `l.ls` | `Input/format.ts` |
| R9 | The callout's `at` reads `ls` | `Input/format.ts` |
| R10 | `listReach`'s `.filter((k) => !outOfReach(k))` leaves | `Input/format.ts` |
| R11 | `canonicalizeCheckbox` returns on any fence | `Input/edits.ts` |
| R12 | `canonicalizeCheckbox`'s `readsListsIn` return leaves | `Input/edits.ts` |
| R13 | `dashArrow`'s code arm answers null | `Input/edits.ts` |
| R14 | `opensCodeList` drops `readsListsIn(f)` | `Input/edits.ts` |
| R15 | `leadOf` stops at `fenceBodyStart` rather than `codeSeat` | `Input/edits.ts` |
| R16 | `readsListsIn` drops `f.tally === undefined` | `Engine/detect.ts` |
| R17 | `opensCodeList` drops its `isBlank` | `Input/edits.ts` |
| R18 | `punctuation`'s third-mark arm drops `isLiteralAt` | `Input/edits.ts` |
| R19 | `calloutShorthand`'s `inFenceAt` return leaves | `Input/edits.ts` |

**Measured:** typecheck 0, lint 0, 9,142 tests, 2 skipped, 9,140 passed, a clean full run. Comments read 3,515.

**Calls Taken:**

- **One `describe` for the Rows:** the delimiter, sign, and Row 26 pins each span several rows, so they had no one `describe` to join, and the shared `row` closure would otherwise repeat. Pins 1 to 4 sit beside them to read as one statement of C-5.
- **The Rows Go Through `editFor`:** that's what a menu pick calls, and the sign's clamp lives there. `list:ordered` stays through Phase 8; the renames so far touch wording, not this key.
- **Pins Past the Brief's Letter:** `||` and `‼!` also run in a ` ```md ` block, since C-6 reads "in code". `md diff` joins `diff` in pin 6 and the shorthands' negatives, since a diff stays a diff there by C-4. Blockquote and Callout join pin 6, because C-7 names rows generally and each has its own sign read.
- **Row 26's Bold Asserts Only That It Writes:** a selection across a block wraps `**` at its two ends, spanning the fence. Nothing states that shape, so the pin holds it to writing, and it runs twice since only a selection ending in code separates it from the older refusal.
- **Row 26's Numbered Half Isn't Used:** the pin picks Bulleted, because `1.` counting past a flush block is Phase 3's ground.
- **Insert Link Isn't Pinned:** it isn't in the brief, and on a plain word `isValidLink` refuses it rather than the fence.

**Concerns:**

- **Row 27 Reads Wider Than the Code:** Blockquote and Callout still write on a delimiter, landing `> ```js` and `> [!callout] ```js` from a caret on the opener, and `> ``` ` on the closer, which breaks the block as Heading would have. C-7 keeps Insert ▸ as it was, so this may be intended, while *§Settled*'s "Rows on a block's delimiter lines refuse" reads as covering them. It's unpinned either way; the decision wants a reader.
- **`- removed` Under Blockquote and Callout:** the sign survives, as `->  removed` and `-> [!callout]  removed`, with the text's space kept behind the mark. List and Heading step over that space and these two don't. Pin 6 runs them on `+added` so the double space isn't asserted.
- **"Picked Twice" Holds for Three Rows:** Bold, Heading, and a list pick write again. Blockquote toggles off, Callout changes nothing, and Text Color refuses from where its first pick left the caret. Bold's `****word****` needs a selection over the word: its first pick leaves a caret past `word`, so picking again untouched writes `**word******`, which *§Settled* doesn't mention.
