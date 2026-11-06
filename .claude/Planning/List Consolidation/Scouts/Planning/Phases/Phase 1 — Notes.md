### Phase 1 — Notes

**Commit:** `98becb14b` on `lc-w2`, on `b7f2f17a5`.
**Patch:** *Phase 1 — One Scan Per Surface.patch* (`git diff b7f2f17a5 98becb14b`).
**Delivers:** B-11, and the pins *7-T7* said were missing (Investigation *§Behavior Changes* rows 34 and 35).

#### Task: One Scan Per Surface

**In Plain Terms:** a surface now states what it reads once, through a CodeMirror facet, and its scan holds exactly that. A list reader asks the scan instead of being handed a `scope` at every call. A table cell's scan holds no fences, math, tables, headings, quotes, or citations, so a line spelled like one of those is an ordinary line in a cell.

**What Leaves:**

- `scope` on `rolesAgainst`, `siblingsAt`, `subBlockAt`, `ownersOf`, `renumberRuns`, `dropChanges`, `listReach`, `listKindOf`, `setList`, `editFor`, `readFormatState`, `applyEditorAction`, `continueListOnEnter`, `indentListOnTab`, `outdentListOnShiftTab`, `smartBackspace`, `canonicalizeCheckbox`, `lineIntentsInto`, `stepLineIntents`, `docLineIntents`, `assembleLineIntents`, `seatPastMarker`, `shownEnd`, `inRawHtml`, `useConnectionAutocomplete`, `blockHandles`, `pointerReveal`, and `Core/Testing/markdownEngine.ts`' `decorationsFor`.
- Factories that became constants: `listRenumber`, `listDragExtension`, `gripMenu`, `typedInput`, `smartDelete`, `commitAliasOnEnter`, `stepDocs`, `markdownDecorations`, `decorationPlugin`, `caretSeat`, `blockHandles`, and `acQuery`, with `useConnectionAutocomplete`'s `useState(acQuery)`. A factory stays only where a mount needs its own closure state, which keeps `linkPointer()`, `citationPointer()`, and `pointerReveal()`.
- `blockGestures`, `BlockScope`, and `CELL_KINDS`: the surface reads `readsLists(scope)`, and `blockHandles` reads `docScan(state).scope`.
- `intents.ts`' comment that a cell's lines aren't walked, which Phase 1's own gate removal made false.
- `page` gates in `caretSeat` and its five readers, `lineIntentsInto`, `stepLineIntents`, `smartBackspace`: `signSeatAt` and `lineChrome` answer null and 0 on a scan with no fences, so the gate has nothing to do.
- Second parses in `Tables/CellEditor.tsx` and `Tables/cellStatic.tsx`, which read `scan.markers`.
- `readLine`'s and `splitPrefix`'s `scope` (a lead string arrives in its place; Phase 2 removes that too).
- `linkSettle`'s config object, which takes `remembers` bare once its `scope` field leaves.
- The `export`s on `cellTokens` and `citationTailVerdict`, which nothing outside their files reads.

**What Arrives:** `surfaceScope` (facet, `docCache.ts`), `literalLines` (`Engine/docScan.ts`), `scope` on `DocScan`, `.of(doc, scope)` on `PerScopedDoc`, `scope` argument on `tokenize` and `tokenizeChunk`, a `view` argument to `drawnLast`'s derive, and `tagReveal` (`Menus/blockHandles.ts`), which mounts in `MarkdownEditor.tsx` beside `codeHighlight` and `codeScroll`, the page's own list, since `.codeblock-language` exists nowhere else. `pageChrome` takes the name `lineChrome`, since it reads on every surface, and `caretSeat`'s helpers hoist to the module, its `run` and `shift` taking the names `stepOut` and `extendOut`.

**Key Hunks:**

```diff
--- a/Core/MarkdownPM/docCache.ts
+/** What a surface reads, stated once where the surface is built, so every derivation below answers for that vocabulary. */
+export const surfaceScope = Facet.define<MarkdownScope, MarkdownScope>({
+  combine: (values) => values[0] ?? 'page',
+})
 
 interface PerScopedDoc<T> {
-  (doc: Text, scope: MarkdownScope): T
-  after(tr: Transaction, scope: MarkdownScope): T
+  (state: EditorState): T
+  after(tr: Transaction): T
+  of(doc: Text, scope: MarkdownScope): T
 }
```

```diff
--- a/Core/MarkdownPM/Engine/docScan.ts
-function scanLines(d: DocLines): LineScan {
+/** A surface reading only inline marks and, in a cell, lists: every block its text could spell is literal there. */
+function literalLines(d: DocLines, scope: MarkdownScope): LineScan {
+  ...
+    markers: lines.map((l) => (readsLists(scope) ? parseListMarker(l) : null)),
+    html: htmlBlocks(d, fences),
+    fenceLines: lines.flatMap((l, i) => (fenceAt(l) ? [i] : [])),
+}
+
+function scanLines(d: DocLines, scope: MarkdownScope): LineScan {
+  if (scope !== 'page') return literalLines(d, scope)
```

```diff
--- a/Core/MarkdownPM/surface.ts
 ): Extension => [
-  markdownDecorations(scope),
+  surfaceScope.of(scope),
+  markdownDecorations,
-  blockGestures(scope),
+  readsLists(scope)
+    ? [listDragExtension, listRenumber, blockHandles, pointerReveal(), blockDragExtension, gripMenu]
+    : [],
```

```diff
--- a/Core/MarkdownPM/Menus/blockHandles.ts
-export function blockHandles(scope: BlockScope = 'page'): Extension {
-  const kinds = scope === 'cell' ? CELL_KINDS : GRIP_KINDS
-  return EditorView.decorations.compute(['doc'], (state) => {
+export const blockHandles: Extension = EditorView.decorations.compute(['doc'], (state) => {
+  const scan = docScan(state)
+  const page = scan.scope === 'page'
...
-      if (kinds.has(b.kind)) ranges.push(handleLine.range(b.from))
-      else if (scope === 'page' && b.kind === 'blockquote')
+    // A cell speaks the list vocabulary alone, so a list is the only block there with anything for a grip to move or a menu to offer.
+    if (GRIP_KINDS.has(b.kind) && (page || b.kind === 'list')) ranges.push(handleLine.range(b.from))
+    else if (b.kind === 'blockquote')
```

**Per-File Summary:** production churn is mechanical at most sites: `docScan(view.state.doc)` becomes `docScan(view.state)`, and five sites keyed on a `Text` take `docScan.of(doc, 'page')`.

| File | Lines | Change |
|---|---|---|
| `docCache.ts` | +23 / -20 | The facet, `docScan` moved onto `perScopedDoc`, `.of`, with the local building each scope's cache named `perScope` beside it |
| `Engine/docScan.ts` | +41 / -5 | `literalLines`, `scope` carried through `rescan` and `splice`, citations excluded off a page |
| `Engine/intents.ts` | +20 / -36 | `scope` leaves; `pushConstruct` reads `scan.scope`; `pageChrome` becomes `lineChrome`, and its false comment leaves |
| `Engine/listModel.ts` | +23 / -47 | `scope` leaves; `dropChanges` rescans with `scan.scope` |
| `Engine/tokens.ts` | +8 / -3 | `tokenize(text, scope)` |
| `decorations.ts` | +164 / -173 | `chunkTokens` reads the facet; `page` gates leave; `markdownDecorations`, `decorationPlugin`, and `caretSeat` become constants, and the reindent is most of the count |
| `Menus/blockHandles.ts` | +26 / -33 | `blockHandles` a constant, `CELL_KINDS` and `BlockScope` leave, `tagReveal` exported, `pointerReveal()` takes no argument and its `cheapMiss` reads `view.state.facet(surfaceScope)` |
| `Autocomplete/acQuery.ts` | +27 / -29 | A constant; the reindent is the count |
| `Input/edits.ts` | +30 / -52 | `scope` leaves; `blockPrefix(scan, line)` stands for one phase |
| `Input/format.ts` | +22 / -25 | `scope` leaves |
| `Input/listRenumber.ts` | +49 / -52 | Constant; reindent is most of the count |
| `Input/markdownInput.ts` | +53 / -60 | `smartDelete`, `typedInput` constants |
| `Menus/gripMenu.ts` | +70 / -77 | Constant; reindent is most of the count |
| `Tables/CellEditor.tsx`, `Tables/cellStatic.tsx` | +11 / -21, +7 / -10 | Read `scan.markers` |
| `surface.ts` | +11 / -24 | `surfaceScope.of(scope)` stated once; `blockGestures` leaves for `readsLists(scope) ? [...] : []` |
| 29 others | Small | `.doc` deleted at each `docScan` call, or a `scope` argument dropped |

**Tests:**

- **Migrated, from the saved tree:** 17 files, signature-only: a trailing `'page'` dropped, `'cell'` moved into `scanDoc`, `surfaceScope.of(scope)` added to a hand-built state. `docScan.test.ts` also gains the cell's own `rescan` property, and three Markdown fence lines in the generator's alphabet.
- **Followed the Constants:** `Autocomplete/acQuery.test.ts`' `stateOf` returns the state and reads `.field(acQuery)`, `Menus/blockHandles.test.ts` mounts `blockHandles`, `pointerReveal()`, and `tagReveal`, and `codeDiff.test.tsx` and `docCache.test.ts` mount `markdownDecorations`.
- **`decorationsFor`:** `Core/Testing/markdownEngine.ts` takes `scan` alone, defaulting to `scanDoc(text)`, since a scan carries its scope. `cellLists.test.tsx`'s three callers and `textScope.test.tsx`'s three pass `scanDoc(text, scope)`.
- **Arrived, in `Links/pasteLink.test.tsx`:** *links an address between fence-shaped lines, which a cell reads as lines*, for `pastedCellText`'s scan below. Red with `scanDoc(doc)`, 1 of 60.
- **Arrived, in `Tables/cellLists.test.tsx`, *a block construct spelled in a cell, which reads as its text*:** five pins, each named for a row of *§Behavior Changes*.

| Pin | Row | Red Run |
|---|---|---|
| `pairs a bracket and paints a mark between fence-shaped lines` | 34 | Red |
| `writes a format row between fence-shaped lines` | 34 (*7-T5*, the `inCodeAt` readers) | Red |
| `gives a list between fence-shaped or `$$` lines a block, and so a grip, of its own` | 34 | Red |
| `draws `$$` lines as text in a live cell, as a resting cell does` | 35 | Red |
| `binds no `[^1]:` note, since a cell has no citation tail` | B-11 | Red |

**How the Red Run Went:** `scanLines`' `literalLines` branch and `withCitations`' `s.scope !== 'page'` were removed, so a cell's scan was page-shaped again, and `cellLists.test.tsx` ran 6 failed of 31: the five pins, plus the existing `draws a bullet and its level, and leaves a heading, a rule and a quote as prose`. Restored and green afterward.

#### Comment Changes

Net +1 (+11 / -10). Six of the pairs are reindents.

| File | Change |
|---|---|
| `Engine/docScan.ts` | **+** `/** A surface reading only inline marks and, in a cell, lists: every block its text could spell is literal there. */` |
| `docCache.ts` | **+** `/** What a surface reads, stated once where the surface is built, so every derivation below answers for that vocabulary. */` |
| `Engine/listModel.ts` | Rewritten, `readsFrom`'s doc: "on a page" and the cell clause leave |
| `Input/edits.ts` | **-** `// A cell draws neither, so neither question applies there — and the scan, which is always page-shaped, would answer both wrongly.` |
| `Engine/intents.ts` | **-** `// A cell holds no box, no fence, no math and no citation row, and its own extension draws the footnote markers, so none of this is walked there.` |
| `Menus/blockHandles.ts` | **+** `// Each code tag reveals its copy mark while the pointer is within reach, scaled with the editor's font; that listener is the content's own, so a move over a table or an embed, which the editor's handlers skip, still counts.`, split from `pointerReveal`'s, which keeps its first sentence |
| `Menus/blockHandles.ts` | Moved, `CELL_KINDS`' comment, onto the line that reads it |
| `Input/edits.ts` | Reindent, `A fence holds literal text…` |
| `Engine/detect.ts` | Shortened, `MarkdownScope`'s comment: the closing sentence, "Every reader that walks a line takes the scope it is walking for", leaves, since it stopped being true here (*§The Reconciliation List*, *Comments*, `detect.ts:508`). The line count doesn't change |
| `Input/markdownInput.ts` | Reindent, two comments |
| `Menus/gripMenu.ts` | Reindent, three comments |

#### Measured

- **Gates at `98becb14b`:** typecheck 0, lint 0. Tests 9,129 total, 2 skipped, 549 files, 9,127 passed, a clean full run.
- **Comments:** 3,512, matching the ledger.
- **Actionable:** `delta.sh` reads **-108 (+687 / -795)**. All-Inclusive -63 (+917 / -980), Tests +44 (+212 / -168).

#### Differences From the Investigation

- **Actionable:** -108 by `view-delta`, where the scouts' grep read -87 before the surface's factories and `blockGestures` were taken here. The two tools count differently by about two lines. No behavior follows from it.
- **Behavior Against `68aa474bc` and `a37d2d7b2`:** `Links/pasteLink.ts`' `pastedCellText` reads `scanDoc(doc, 'cell')`, where both trees read `scanDoc(doc)`. It's a resting cell's paste, so a page-shaped scan was a surface reading the wrong scan: an address pasted between fence-shaped lines landed as text in a resting cell and as a link in a live one. This is row 34's defect, at the one site the saved tree missed.
- **Comment Against `a37d2d7b2`:** that tree keeps `detect.ts:508`'s closing sentence.

#### Calls Taken

- **Pin Placement:** all five pins sit in `Tables/cellLists.test.tsx`, beside the cell's other behavior, and go through a real mounted cell where the behavior is a key or a paint. An engine-level read would not have caught `chunkTokens` missing its facet.
- **The `inCodeAt` Readers:** *7-T5* lists four (`autocomplete.ts:58`, `pasteLink.ts:46`, `format.ts:114`, `isLiteralAt`) from one cause. Pinned two (`isLiteralAt`, through the bracket pair, and `format.ts:114`) rather than four, since they share the cause.
- **`pastedCellText`:** the saved tree's sweep moved every cell-side reader onto a cell scan but this one, whose name says what it reads. One word, and B-11 reads it in. Pinned above.
- **Zero-Argument Factories:** the rule is that a factory stays only where a mount needs its own closure state. `pointerHandlers` holds `editingOnPress` and `actedOnLink` per mount, and `pointerReveal` holds `hotLine`, `cachedFrom`, and `textLeft`, so `linkPointer()`, `citationPointer()`, and `pointerReveal()` stay functions. `markdownDecorations`, `decorationPlugin`, `caretSeat`, `blockHandles`, and `acQuery` hold nothing and read as constants, a `StateField`'s value already being per state.
- **`GRIP_KINDS.has(b.kind) && (page || b.kind === 'list')`:** the set holds `list`, so this states it once where `b.kind === 'list' || (page && GRIP_KINDS.has(b.kind))` states it twice. A non-page scan's `callouts`, `quotes`, `headings`, `breaks`, and spans are empty, so `blockStarts` yields only `list` and `paragraph` there and the blockquote branch needs no scope term.
- **`scope` Left Standing:** `editorMenu(scope)` still takes a parameter, since it's Phase 9's to touch.
- **`checkboxToggleChange` Waits for Phase 5:** `lineMarker` doesn't exist here, so moving it onto the scan lands with `parseListMarkerPrefixed`'s fold.

#### Facts for the Docs Rewrite

- *Editor-Internals* line 18, "A cell's document model is page-shaped", leaves whole.

#### For the Executor

Nothing by hand. The patch applies to `b7f2f17a5` as it stands.
