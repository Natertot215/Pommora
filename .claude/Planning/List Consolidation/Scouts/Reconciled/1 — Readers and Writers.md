### Scout 1 — Readers and Writers

**DATE:** 11-06-2026
**READ AT:** `b7f2f17a5`
**RECONCILED FROM:** `Scouts/1 — Readers and Writers.md`

**Marks:** **Observed** is a probe re-run during reconciliation, on `b7f2f17a5` unless it names the stack. **Traced** is a path followed through the source. **Inferred** is a conclusion neither proved. **Unconfirmed** is carried from the source without being re-run. Paths are relative to `Core/MarkdownPM/` unless they start with `Core/` or `Desktop/`.

**The Stack:** the landing order in *Engine Reconciliation*, *§The Patch Stack*: the scan change, parity and masking, numbering, and paste. Each section says which step delivers it, or that it's unbuilt.

---

#### 1-T1 • The Inventory

Caller counts are production call sites found by whole-word search, excluding tests.

##### Grammar and Parsing

| Site | Function | Answers | Reads From | Scope | Called By |
|---|---|---|---|---|---|
| `Engine/detect.ts:552` | `LIST_MARKER_RE` | parses a marker | its own regex: `[-+]`, `\d+.`, `[A-Z].`, optional box on every kind | none | `parseListMarker` |
| `Engine/detect.ts:553` | `ARROW_MARKER_RE` | parses a marker | its own regex | none | `parseListMarker` |
| `Engine/detect.ts:572` | `parseListMarker` | parses a marker from a string | both regexes, `isThematicBreakLine` | none | 12 sites in 8 files, listed below |
| `Engine/detect.ts:631` | `parseListMarkerPrefixed` | parses past `quotePrefix` | fresh parse | none, always strips quotes | `docScan.ts:82`, `listModel.ts:33` |
| `Engine/docScan.ts:82` | `scanLines` → `markers` | stores every line's parse | fresh parse per scanned line | page-shaped always | read by `itemAt`, `blockContext`, `tablePasteGuard` |
| `Engine/detect.ts:523` | `indentLevel` | counts a level | indent string | none | `parseListMarker` only; exported for tests |
| `Engine/detect.ts:555-563` | `isSequenced`, `ordinalOf`, `ordinalText` | classifies; reads and writes an ordinal | the marker | none | 7, 2, 3 sites |
| `Engine/detect.ts:566` | `continuesList` | classifies a non-item line | raw line | none, the caller picks the depth | `listModel.ts:84`, `blockModel.ts:47`, `intents.ts:402` |
| `Engine/detect.ts:303` | `citationEntries` → `breaks` | is this line an item, to end a citation | `parseListMarker` on the raw line | none | `assembleCitations` |
| `Engine/docScan.ts:105` | `LIST_LINE` in `quietAt` | does the parser hold list state here | its own regex: `[-+*]`, `\d{1,9}[.)]` | none | `rescan`, `cutAt` |
| `Engine/docScan.ts:248` | `LIST_ITEM` in `cutAt` | does this line interrupt a paragraph | its own regex, flush and non-empty | none | `chunksOver` |
| `Engine/Tables/regions.ts:28` | `MAY_OPEN` | may this line end a table body | its own regex | none | `endsBody` |
| `Engine/Tables/codec.ts:17-25` | `BARE_MARKER`, `BARE_TASK`, `restoreTrailingItem` | restores an empty last item GFM trimmed | two regexes plus `parseListMarker(above)` | cell by construction | `cellToDisplay` |
| `codeHighlight.ts:55` | `TaskList` `parseBlock` leaf | colors a task marker inside a Markdown fence | its own regex, lezer tree | none | the code language |
| `Engine/subfieldStats.ts:33` | `proseStart` | where an item's prose begins, for counts | `parseListMarker(inner)` after its own prefix read | none | `rangeStats` |
| `Input/edits.ts:54` | `shorthandCheckboxRe` | parses `-[x]` typed shorthand | its own regex | `readsLists` | `canonicalizeCheckbox` |
| `Engine/tokens.ts:122` | `FLOW_CONTAINERS` | which mdast nodes hold HTML blocks | parser tree | none | `htmlBlockSpans` |

`parseListMarker`'s callers are `codec.ts:25`, `detect.ts:303`, `detect.ts:633`, `intents.ts:663`, `listModel.ts:60`, `subfieldStats.ts:33`, `format.ts:280`, `format.ts:434`, `format.ts:472`, `CellEditor.tsx:61`, `CellEditor.tsx:95`, and `cellStatic.tsx:287`.

##### Structure and Walks

| Site | Function | Answers | Reads From | Scope | Called By |
|---|---|---|---|---|---|
| `Engine/listModel.ts:41` | `readsFrom` | may this reader see line `k` | `scan.fences`, `inSealedLine` | passed; `!== 'page'` opens everything | `itemAt`, `rolesAgainst`, `format.ts:311,341`, `listRenumber.ts:49` |
| `Engine/listModel.ts:48` | `openerOf` | which line stands for a block read from outside | `scan.fences`, `scan.maths` | none | `rolesAgainst`, `blockContext` ×2 |
| `Engine/listModel.ts:53` | `itemAt` | is this line an item to this reader | `scan.markers`, or a fresh parse off the page | passed; a cell reparses, Text answers null | 13 sites in 6 files |
| `Engine/listModel.ts:66` | `rolesAgainst` | sibling, nested, blank, or ends | `itemAt`, `quoteDepthOf`, `continuesList` | passed | `siblingsAt`, `subBlockAt`, `listRenumber.ts:32` |
| `Engine/listModel.ts:89` | `siblingsAt` | walks a group and its nesting end | `rolesAgainst` | passed | `runAt`, `dropChanges` ×2, `format.ts:321` |
| `Engine/listModel.ts:114` | `subBlockAt` | which lines ride an item | `rolesAgainst` | passed | `ownersOf`, `listDrag.ts:91`, `format.ts:313`, `listRenumber.ts:33` |
| `Engine/listModel.ts:127` | `ownersOf` | the items whose branch covers a line | `itemAt`, `subBlockAt` | passed | `format.ts:315`, `edits.ts:201` |
| `Engine/blockModel.ts:45-60` | `blockContext` → `listMember` | where a list block sits | raw `scan.markers` through `openerOf`, `continuesList` | none; page-shaped in a cell too | `kindAt`, `blockAt`, `blockStarts` |
| `Engine/blockModel.ts:140` | `blockAt` `'list'` | where a list block ends | `listMember` | none | `blockDrag`, `blockHandles`, `gripMenu`, `embedInsert`, `pageEditor` |
| `Engine/blockModel.ts:193` | `blockStarts` `'list'` | where a list block starts | `listMember` | none | `blockHandles.ts:47`, `blockDrag.ts:32` |
| `Guards/tableGuard.ts:39` | `tablePasteGuard` | is the paste line an item | raw `scan.markers`, ignoring fences and math | none | table widget extension |

##### Writers and Counters

| Site | Function | Answers | Reads From | Scope | Called By |
|---|---|---|---|---|---|
| `Engine/listModel.ts:31` | `checkboxToggleChange` | writes a box | fresh prefixed parse of a string | none | `listDrag.ts:66`, `cellStatic.tsx:517` |
| `Engine/listModel.ts:150-232` | `leadOf`, `reindentBlock`, `rebuildMove` | moves lines | its own split of the document | none | `dropChanges`, `moveRange` |
| `Engine/listModel.ts:235` | `renumberRuns` | counts runs | `runAt`, `scan` | passed; `arrived`, `repicked` default empty | `listRenumber.ts:56`, `dropChanges` |
| `Engine/listModel.ts:255-290` | `runAt`, `renumberRun` | writes ordinals | `itemAt`, `siblingsAt` | passed | `renumberRuns` |
| `Engine/listModel.ts:293` | `dropChanges` | moves and renumbers an item | `siblingsAt`, `rebuildMove`, a whole `scanDoc` of the result | passed | `listDrag.ts:103` |
| `Engine/listModel.ts:320` | `moveRange` | moves a block, with no renumber | `rebuildMove` | none | `blockDrag.ts:83`, `Core/Pages/pageEditor.ts:52` |
| `Input/listRenumber.ts:13` | `listRenumber` | decides what to recount | `RELIST` event, change geometry, both scans | factory argument | `surface.ts:36`, `landEdit` |
| `Input/listRenumber.ts:80` | `landEdit` | runs the filter on a string | a throwaway `EditorState` | passed | `cellStatic.tsx:474` |
| `Input/format.ts:232` | `listMarkerText` | writes a fresh marker | `kind` switch | none | `setList` |
| `Input/format.ts:247` | `splitPrefix` | a line's prefix and body | `blockPrefix`, `calloutHeadPrefixLen` | passed | `readLine`, `listReach`, `formatState.ts:25` |
| `Input/format.ts:277` | `readLine` | a line's prefix, pad, indent, inner | `splitPrefix`, two parses | passed | `selectedLines` (always `'page'`), `setList` |
| `Input/format.ts:302` | `listReach` | which lines a pick reaches | `ownersOf`, `siblingsAt`, `subBlockAt`, `itemAt`, `drawnKind` | passed | `listKindOf`, `setList` |
| `Input/format.ts:350` | `listKindOf` | the menu's check | `listReach` | passed | `formatState.ts:40`, `gripMenu.ts:86` |
| `Input/format.ts:364` | `setList` | writes markers | `listReach`, `readLine` | passed | `editFor` |
| `Input/format.ts:431-436` | `setBlock` `'callout'` | strips a marker for a callout | `stripInnerMarkers(line)`, `parseListMarker(line)` on the whole line | none | `editFor` |
| `Input/format.ts:471` | `stripInnerMarkers` | strips a marker | fresh parse | none | `readLine`, `setBlock` |
| `Input/edits.ts:60` | `listLineAt` | the caret's item | `itemAt` `'outside'`, `blockPrefix` | passed | Enter, Tab, Shift-Tab |
| `Input/edits.ts:74` | `continueListOnEnter` | writes the next marker and counts it | `listLineAt` | defaulted `'page'`; the cell passes it | `markdownInput.ts:105`, `CellEditor.tsx:55` |
| `Input/edits.ts:156,168` | `indentListOnTab`, `outdentListOnShiftTab` | move indent | `listLineAt`; outdent adds its own indent regex | defaulted | `markdownInput.ts:286-287`, `CellEditor.tsx:56-57` |
| `Input/edits.ts:189` | `takeMarker` | removes a marker | `ownersOf` | passed | `smartBackspace` |
| `Input/edits.ts:218` | `smartBackspace` | Backspace | `fences`, `inCodeAt`, `itemAt` `'outside'`, `blockPrefix` | defaulted; prod always passes | `markdownInput.ts:213` |
| `Input/edits.ts:261` | `canonicalizeCheckbox` | writes `- [x] ` | string regex, no scan, no code check | defaulted; prod always passes | `markdownInput.ts:267` |
| `Input/edits.ts:837` | `dashArrow` | writes `→`, which forms an arrow marker at a line's start | `opensLine`, `isLiteralAt` | none; `blockPrefix` default is `'page'` | `markdownInput.ts:269` |
| `Input/applyEdit.ts:26` | `applyEdit` | turns `relist` into the event | `editEvent` | none | many |
| `Input/formatState.ts:40` | `readFormatState` | `list` for menus | `listKindOf` | passed | `menu.ts:83` |

##### Drawing

| Site | Function | Answers | Reads From | Scope | Called By |
|---|---|---|---|---|---|
| `Engine/intents.ts:105` | `railTypeClass` | classifies for rails | marker | none | `intents.ts:487`, `cellStatic.tsx:298` |
| `Engine/intents.ts:133` | `listGlyphOf` | classifies for drawing | marker | none | `drawnKind`, `pushConstruct`, `CellEditor.tsx:62,96`, `cellStatic.tsx:288` |
| `Engine/intents.ts:140` | `drawnKind` | classifies for picks | `listGlyphOf` | none | `format.ts:322,329,358,384` |
| `Engine/intents.ts:145` | `listLineClass` | classifies for CSS | marker | none | `intents.ts:64,723`, `cellStatic.tsx:313` |
| `Engine/intents.ts:191` | `pageChrome` | returns null on fence, math, and citation lines, so they never draw a list | scan | page only | `lineIntentsInto` |
| `Engine/intents.ts:360` | `lineIntentsInto` | returns the drawn marker | `pushConstruct` | passed | `deriveLines`, `assembleLineIntents` |
| `Engine/intents.ts:387` | `railIntents` | walks a list for rails | five parallel arrays, `continuesList` on the raw line | none | `withRails`, `cellStatic.tsx:294` |
| `Engine/intents.ts:475` | `deriveLines` | line facts | `lineIntentsInto`, `quoteDepthOf` | passed | `docLineIntents`, `stepLineIntents` |
| `Engine/intents.ts:617` | `seatPastMarker` | where a press seats | intents, by class name | defaulted; prod always passes; a cell branch | `decorations.ts:790`, `CellEditor.tsx:73` |
| `Engine/intents.ts:650` | `pushConstruct` | draws a marker | a fresh `parseListMarker(inner)` | passed | `lineIntentsInto` |
| `decorations.ts:155,167` | `BulletWidget`, `CheckboxWidget` | draws a glyph | spec | none | `widgetFor` |
| `decorations.ts:526` | rail branch | draws a rail | intent | none | the pass |
| `Tables/cellStatic.tsx:245` | `MarkerGlyph` | draws a glyph in React | marker | cell | `renderCellBody` |
| `Tables/cellStatic.tsx:278` | `renderCellBody` | draws a resting list | fresh parse, `listGlyphOf`, `railIntents`, `quoteDepthOf` | cell by construction | the cell |
| `Menus/blockHandles.ts:43` | `blockHandles` | which blocks get a grip | `blockStarts` | factory; `CELL_KINDS` | `surface.ts` |
| `Menus/blockHandles.ts:190` | `pointerReveal` | a hover over a list in a cell | DOM `.cm-line.md-list-item` | `scope === 'cell'` | `surface.ts` |
| `markdown-pm.css:370-378,495,540` | list zones | per-type padding | `--bullet-zone`, `--number-zone`, `--task-zone` | both surfaces | classes above |
| `markdown-pm.css:60-64,380-455` | rails | per-type rail x | `--md-outline-{bullet,alpha,task}-x` | both surfaces | classes above |
| `markdown-pm.css:459-558` | glyph rules | per-type glyph | `.md-list-bullet`, `-arrow`, `-number`, `-checkbox-seat` | both surfaces | classes above |
| `markdown-tables.css:199,208` | resting cell rules | checkbox cursor, cell tail | `:has(.md-list-item)` | resting | classes above |

##### Gestures and Menus

| Site | Function | Answers | Reads From | Scope | Called By |
|---|---|---|---|---|---|
| `lineDom.ts:46` | `glyphAt` | the glyph under the pointer | DOM `.md-list-glyph` | none | `listDrag` ×2, `menu.ts:107`, `MarkdownTable.tsx:162`, `cellStatic.tsx:553` |
| `Gestures/listDrag.ts:33` | `collectBoundaries` | drop slots | `itemAt` with reader `first`, coords | passed | `measure` |
| `Gestures/listDrag.ts:65` | `clickAction` | a tap toggles a box | `checkboxToggleChange` | none | `onTap` |
| `Gestures/listDrag.ts:75` | `listDragExtension` | routes a glyph press | `glyphAt`, `subBlockAt` | factory | `surface.ts:35` |
| `Gestures/blockDrag.ts:63` | `startBlockDrag` | routes a block press | `moveRange` | none | gesture, table widget |
| `Gestures/editorGesture.ts:92` | `beginRelocateDrag` | commits with `'input'` | `spec.commit` | none | both drags |
| `Menus/menu.ts:50` | `routeRightClick` | glyph menu or format menu; a list row acts at the click, others on the word | `readFormatState` | passed | `menu.ts:121`, `cellStatic.tsx:554` |
| `Menus/menu.ts:20` | `applyEditorAction` | runs a row or chord | `editFor` | defaulted `'page'` | `formatKeymap.ts:17` (mounted in cells), `useBlockMenu.ts:50` (page only), `menu.ts:141` |
| `Menus/gripMenu.ts:61` | `firstItemOf` | a list block's first item | `itemAt` `'outside'`, unbounded loop | passed | `contextFor`, the reply |
| `Menus/gripMenu.ts:180` | grip reply | routes a Type pick | `editFor` | passed | the menu |
| `Menus/useBlockMenu.ts:50` | `pick` | the `/` menu's list rows | `applyEditorAction` | default | `MarkdownEditor.tsx:130` |
| `Core/Actions/gripMenu.ts:35` | `LIST_KINDS` | per-type labels and icons | data | none | `listRows`, `blockMenu.ts:28`, `editorMenu.ts:43` |
| `Core/Actions/gripMenu.ts:58,74-77,99` | `listRows`, `ownRows`, `gripMenuItems` | the Type submenu and the glyph menu | `ctx.current` | none | `Core/Pages/editorHost.tsx:102` |
| `Core/Actions/blockMenu.ts:28` | `LIST_ROWS` | Lists ▸ and `/` rows | `LIST_KINDS` | none | menus |
| `Core/Actions/editorMenu.ts:120,163` | `checkedIn`, scope switch | row check; Lists ▸ hidden in Text | request | `s.scope` | `Desktop/Actions/editorMenu.ts:142` |
| `Tables/CellEditor.tsx:41-57` | `listEdit` | runs a transform at `'cell'` | `docScan` | fixed | keymap |
| `Tables/CellEditor.tsx:60` | `listLineAt` | the caret's item, by glyph | fresh parse, `listGlyphOf` | cell by construction | Tab, Shift-Tab, Enter, Shift-Enter |
| `Tables/CellEditor.tsx:92` | `atListEnd` | is any item below | fresh parse per line | cell by construction | Shift-Enter |
| `Tables/CellEditor.tsx:70` | `seatPastMarkerNow` | reseats a caret after an edit | `seatPastMarker` | fixed | Backspace, Delete, mount |
| `Tables/MarkdownTable.tsx:162` | `startSweep` | a glyph press skips the sweep | `glyphAt` | none | the table |
| `Tables/cellStatic.tsx:514` | `claimCheckbox` | a resting tap | `.md-list-checkbox-seat` selector, `checkboxToggleChange` | none | click, mousedown |
| `Tables/cellStatic.tsx:532` | `restingAction` | applies a resting pick | `scanDoc(text)`, `editFor`, `editEvent` | fixed | `routeRightClick` |
| `Core/Settings/personalization.ts:148`, `frames.ts:726`, `api.ts:111` | `preserveListLevels` | the setting | settings | none | `format.ts:323`, its only reader |

`Desktop/Actions/editorMenu.ts` holds nothing list-shaped beyond passing the menu request through; the glyph case its line 136 once blocked now arrives through `host.menus.grip`. `Core/Connections` touches no list marker. `Core/Properties/Cells/TextCell.tsx` mounts scope `'text'`, which `surface.ts:42` gives no block gestures.

The inventory records `b7f2f17a5`. A scripted pass checked 89 cited sites against that tree, and each points at the operative line of the function it names, some of them inside the function rather than at its signature.

---

#### 1-T2 • Questions Answered More Than Once

##### 1-T2.1 • Is This Line an Item

| Answer | Site | Differs By | On the Stack |
|---|---|---|---|
| The parse | `scan.markers` | Holds fence, math, and table lines. **Observed:** `markers` is non-null inside `$$` where `itemAt` is null. | Becomes the one answer: null on math, tables, and plain code, and parsed from the body in a Markdown block |
| The reader's view | `itemAt` | Filters fences, math, and tables by reader. | Leaves |
| The drawn line | `pushConstruct`, `listGlyphOf` | Reparses past `pageChrome`'s base. Sees a callout head, drops `- []`. | Unbuilt, see *1-T6.6* |
| The block model | `blockContext.isMarker` | Raw `markers` through `openerOf`, with no table filter. | Reads a depth-0 item outside any fence |
| The table guard | `tableGuard.ts:39` | Raw `markers`, so a paste on a fenced `- x` line is refused (Traced). | Correct with no edit |
| The cell editor | `CellEditor.tsx:60,92` | Fresh parse plus `listGlyphOf`. | Reads `scan.markers` |
| The resting cell | `cellStatic.tsx:287` | Fresh parse plus `listGlyphOf`. | Reads `scan.markers`, keeping its `items` projection for the glyph until B-1 |
| Citations | `detect.ts:303` | Fresh parse. | Stays |
| The stats | `subfieldStats.ts:33` | Fresh parse after its own prefix read. | Stays |
| The checkbox | `checkboxToggleChange` | Fresh prefixed parse of a string. | Stays, reached only by a glyph press |

These answers disagreeing produces four defects:

- **Drawn, With Nothing Behind It (Observed):** `> [!note] - foo` draws a bullet widget while `scan.markers[0]` is null and `listKindOf` returns null. **Traced:** `listDrag.ts:81` defaults the press away, then `:92` returns false, so the glyph is dead to every gesture. `setBlock('callout')` produces this state, turning `> - item` into `> [!callout] - item`, because `stripInnerMarkers(line)` at `format.ts:433` reads the whole line, where its prefix defeats the parse. F-1 removes the glyph, and no patch builds that yet.
- **An Item, Drawn as Nothing (Observed):** `- [] foo` is a sibling to the walk, and Enter writes `\n- `, while it draws at level -1. B-1 makes it a bullet whose text is `[] foo`. Unbuilt.
- **A Hidden Box (Observed):** `2. [x] foo` parses with `contentStart` 7 and hides `[x] ` in the marker gap, and a switch to Bulleted writes `- foo`, deleting the text. B-3 moves the box group to the bullet alternative. Unbuilt.
- **A List Block Inside a Table (Observed):** `  text\n→ a | b\n--|--\n` gives a `list` block `{0, 14}`, and `- x\n→ a | b\n--|--\n| 1 | 2 |` gives `blockAt` `{0, 11}` and `blockDeleteSpan` `{0, 12}`. **Observed on the Stack:** `{0, 6}` as a paragraph, and `{0, 3}` with a Delete of `{0, 4}`.

##### 1-T2.2 • What Type Is This Marker

`kind`, `listGlyphOf`, `drawnKind`, `railTypeClass`, `listLineClass`, and the `md-list-${glyph}` class each classify the same marker. `intents.ts:128` gives two reasons, that `+` draws differently and `- []` draws nothing, and B-1 retires both, so all of these become readings of `kind`. **Observed:** `+ a` checks Arrowed today. `drawnKind` sits in the drawing module, so `Input/format.ts` imports `Engine/intents`, and that import leaves with it. Unbuilt.

##### 1-T2.3 • Which Lines Belong to This Item

`subBlockAt`, `siblingsAt.last`, `ownersOf`'s `end`, and `railIntents`' `shown` each answer this today, and rails read `continuesList` on the raw line while the walk reads a block as its opener. **Observed:** in `- a\n\t- b\n\t  ```\nflush\n\t  ```\n\t- c\n- d` the walk gives `b` the sibling `c`, and rails stop at the flush line. **Observed on the Stack:** rails carry through to `c`, read through `ridesList`.

##### 1-T2.4 • Where Does This List Block End

**Observed:** `blockAt` stops at a blank while `siblingsAt` crosses one, so `- a\n\n- b\n\n\t- c` is three blocks and a pick at `b` rewrites `a` as well. B-5 settles this for every reader. On the stack the walks and the block model share `ridesList`, and 60,000 fuzzed documents read zero disagreements (*Engine Reconciliation*). `atListEnd` in `CellEditor.tsx` stays until G-9 merges the keys.

##### 1-T2.5 • Which Lines Does a Pick Reach

`listReach` is the single answer for a pick, and `routeRightClick:96-97` picks the range it's handed. `firstItemOf` is a second route into it, and it leaves under D-2.

##### 1-T2.6 • What Number Does This Item Get

| Answer | Site | On the Stack |
|---|---|---|
| The next ordinal | `continueListOnEnter` `ordinalOf(lm) + 1` | Leaves: Enter writes `listMarkerText(lm.kind)` |
| 1 or A | `listMarkerText` | Moves to `detect.ts` |
| The run's count | `renumberRun` | Stays |
| The run's base | `renumberRun`'s `settled`, with `arrived` and `repicked` | The first item's ordinal |
| Nothing | `moveRange` | Stays numbering-free |

**Observed:** the filter alone gets every case right from an uncounted write, and on the stack `9. a` lands `10. ` under Enter. `moveRange` takes `1. a\n\n2. b\n\n3. c\n` to `3. c\n\n1. a\n\n2. b\n`, which under B-5 is three lists each keeping its number. Nothing recounts, and *9-T2* holds the reasoning.

##### 1-T2.7 • Where Is the Glyph Under the Pointer

`glyphAt` everywhere, plus `claimCheckbox`'s `.md-list-checkbox-seat` and `pointerReveal`'s `.md-list-item`. The last two ask something narrower and stay. A position is read as `view.posAtDOM(glyph)` on a live surface and `srcOf(glyph)[0]` at rest, which is correct, since a resting cell has no view.

##### 1-T2.8 • What Prefix Does This Line Carry

| Answer | Site | Reads | On the Stack |
|---|---|---|---|
| `blockPrefix` | `edits.ts:57` | `quotePrefix`, gated by scope | Leaves |
| `leadOf` | arrives | the fence's lead on a fenced line, the quote's elsewhere | Sits in `Input/edits.ts` |
| `splitPrefix` | `format.ts:247` | adds the callout head | Stays, taking the lead |
| `parseListMarkerPrefixed` | `detect.ts:631` | `quotePrefix`, ungated | Stays |
| `pageChrome`'s `base` | `intents.ts:191` | callout prefix, nested quote, blank-line width | Stays |
| `leadOf` | `listModel.ts:150` | quote plus indent | Moves to `Engine/blockMove.ts`, under a new name |
| `proseStart` | `subfieldStats.ts:31` | callout head or quote | Stays |
| `fenceBodyStart` | `detect.ts:153` | fence quote and indent | Feeds `lineMarker` and `leadOf` |
| `continuesList` | `detect.ts:567` | `quotePrefixWidth` by depth | Stays, returning a boolean |

A marker's offsets mean three things today: from the line in `scan.markers`, from `inner` in `pushConstruct`, and from `body` in `readLine`. **Observed:** a list in a fence indented 2 reads level 1 where its author wrote level 0. **Observed on the Stack:** level is block-relative and `  5. a` under a two-space fence continues as `6.`.

##### 1-T2.9 • What Is This Line's Quote Depth

`quoteDepthOf` is called in `rolesAgainst` per line, in `ownersOf`, in `deriveLines` (carried as `quoteDepths`, with a stated measured reason), and in `cellStatic.tsx:299`. The fact is carried in one place for speed and recomputed in the walk. No patch changes this.

---

#### 1-T3 • Parallel Definitions and Protocols

- **The Relist Chain:** `Edit.relist` → `editEvent` → the `input.list` string → `tr.isUserEvent(RELIST)`, a three-hop signal for one boolean, with `FormatEdit.relist` repeating the field. Stays: it's how the filter learns an edit wrote a marker.
- **Geometry Read Back:** `listRenumber.ts:30` infers a re-pick from `whole`, and `:45` infers `arrived`. Both leave with D-4 and the first-item start, and the filter compares states instead (*9-T12*).
- **Write, Then Unwrite:** `listRenumber.ts:63` cancels with `{}` when the recount restores the old text. Leaves with D-4.
- **The Reader Union:** `Reader = number | 'outside'` threads `itemAt`, `readsFrom`, and `ownersOf`. It leaves with masking, and `ownersOf` takes `region: number | undefined`.
- **Scope Threading:** `scope` sits on most of the list engine's signatures, and its source is one fact, stated in Editor-Internals: the scan is page-shaped while a cell is not. It leaves with the scan change, and `listModel.ts` and `blockMove.ts` hold no mention on the stack.
- **Settings Threading:** `editFor`, `setList`, `listReach`, `listKindOf`, and `readFormatState` all take `Personalization`, for one flag read at `format.ts:323`. Stays under D-1.
- **Silent Defaults:** 15 `= 'page'` defaults today, 6 on the stack. `renumberRuns`' `arrived` and `repicked` defaults leave.
- **Five Parallel Arrays:** `railIntents` takes `lines`, `lineStarts`, `listLevels`, `listKinds`, and `quoteDepths`. On the stack it takes `scan` and the last three.
- **Computed Twice:** `pushConstruct` reparses what `scan.markers` holds, and `readLine` parses twice (`:280` and `stripInnerMarkers`). `itemAt`'s per-call reparse in a cell leaves with it.
- **`lineIntentsInto`'s Return Value:** The drawing pass returns the marker so `deriveLines` can derive rails from it, which makes drawing the source of `listLevels`. Stays until *1-T6.6*'s array removal, which is unbuilt.
- **Class Names as Data:** `seatPastMarker` reads `className.includes(GLYPH_CLASS)` and `className === 'md-list-gap'` back out of the intents it was handed. Stays, since B-8 keeps both drawing paths.

---

#### 1-T4 • Caution Code

Each row is a guard whose producing state wasn't reached, or one whose reachable cause isn't what it guards.

| Site | Guard | Traced | Result |
|---|---|---|---|
| `blockModel.ts:73` | `i >= n` | `blockAt` and `blockStarts` guard the upward call; `i < 0` is reached, `i >= n` isn't | Unreachable half (Unconfirmed) |
| `detect.ts:589` | `!idx`, `!ws` | the `d` flag and the mandatory group 6 | Type narrowing only |
| `detect.ts:595` | `m[5] ?? ''` | `b` exists only when group 5 took part | Unreachable, and it leaves with `Box.inner` under B-1 |
| `format.ts:283` | `lm ?` in `readLine` on `setList`'s path | `setList` calls it only when no marker stands there, so the item side is reachable only from `setHeading` | One caller's branch |
| `listDrag.ts:50,52` | `cTop && cEnd`, `cMarker ?? cTop` | no null found from `coordsAtPos` inside `visibleRanges` | Not reached (Unconfirmed) |
| `lineDom.ts:42,47`, `cellStatic.tsx:516` | `.closest?.` | no non-Element target found on these events | Not reached (Unconfirmed) |
| `listModel.ts:180,185` | `bStart < 0`, `tLine < 0` | `from` and `at` are line starts unless the document moved during a gesture | Stale document only, see below |

`listRenumber.ts:52`'s `below < was.text.length` and `listModel.ts:72`'s `itemAt(...)!` both leave on the stack with the code around them.

**The Stale Drop:** `listDrag.ts:104` reads a fresh scan at the drop, against `block` and `slot.line` captured at the press, and `beginRelocateDrag` carries no document check while `gripMenu.ts:164` guards the same race. **Traced:** `mirrorBody` dispatches another mount's body or an external write through `Core/Pages/bodyMount.ts:44` with no gesture check, so the document can move during a drag. **Observed on the Stack:** a stale block lands a harmless edit, and a stale slot past the document's end throws `Cannot read properties of undefined (reading 'level')` from `rolesAgainst`, as *Numbering and Edges* does on its own. One compare of `view.state.doc` against the press in `beginRelocateDrag`'s `onDrop` closes it for both drags at the cause, and `bStart < 0`, `tLine < 0`, and the comment at `listDrag.ts:11` leave with it (Inferred).

**`firstItemOf` Is a Defect:** `gripMenu.ts:63` loops until `itemAt` isn't null, and it stops only because `scan.markers[n]` is `undefined`, so on `  text\n→ a | b\n--|--\n` a Type pick lands past the table (Unconfirmed at the grip; the block it reads was Observed). It leaves under D-2.

---

#### 1-T5 • What's Carried for One Caller

| Item | Carried For | On the Stack |
|---|---|---|
| `parseListMarker`'s `offset` | `parseListMarkerPrefixed` | Gains `lineMarker` as a second reader |
| `Slot.indent`, `Slot & { line }` | `listDrag` | Stay: `line` reads the landing run's start |
| `lineIntentsInto`'s `ranged` | `assembleLineIntents` | Stays |
| `selectedLines`, `SelectedLine` | `setHeading`, while the comment says "every formatter" | Stays, and the comment needs rewriting |
| `indentLevel` export | tests; production reads it in-file | Stays |
| `setList`, `setBlock`, `toggleInline` exports | `editFor`, in-file, plus tests | Stay |
| `MAX_NESTING_LEVEL` export | `edits.ts:163` | Stays |
| `splitPrefix` export | `formatState.ts:25` | Stays |
| `landEdit` | `cellStatic.tsx:474`, plus 6 test files | Stays, and takes `surfaceScope.of(scope)` |
| `seatPastMarker`'s `scope === 'cell'` branch | the cell only | Stays |
| `railIntents`' `quoteDepths` in a cell | **Traced:** no cell item has depth above 0 | Stays |

`joins`, `renumberRuns`' `arrived` and `repicked`, `MoveSeams`, `readLine`'s `scope`, the `rolesAgainst`, `openerOf`, and `blockPrefix` exports, `firstItemOf`, `rolesAgainst:75-78`, `readsFrom`'s `own`, and `'text'` through `listReach` all leave on the stack. `drawnKind`'s export leaves with B-1.

---

#### 1-T6 • Approaches

##### 1-T6.1 • One Marker, Classified Once

B-1, B-2, and B-3 make the parser's `kind` the only classification: the box group moves inside the bullet alternative, requires its inner character and a space after the bullet, and `+` reads as `bullet`.

- **Leaves:** `listGlyphOf`, `drawnKind`, `ListGlyph`, the `box?` on bullets, `Box.inner`, the `bullet` field, the null branches at `CellEditor.tsx:62,96`, `cellStatic.tsx:288`, and `intents.ts:664`, and the comments that explain them.
- **Behavior:** `+ x` draws `•` and checks Bulleted. `- [] x` draws a bullet with the text `[] x`. `2. [x] foo` shows its `[x]`. `-[] x`, `-[ ] x`, `-[x] x`, and `1.[ ] a` read as plain text, and the shorthand writes `- [ ] ` whichever bullet typed it. **Observed:** all four read as items today.
- **Status:** Enter writing `-` lands with the numbering step, and the grammar itself is unbuilt. *Scouts/4*'s cut (*4-T2*) is the one price.

##### 1-T6.2 • One Per-Type Definition

B-7 asks for one definition each type's walks, keys, and menus read. B-8 keeps numbers and arrows drawn as text, so the draw path stays as it is and the record needs no glyph field. The branches a record can replace:

| Site | Branches On | Replaced By |
|---|---|---|
| `format.ts:232` `listMarkerText` | all five | `marker` |
| `intents.ts:105` `railTypeClass` | checkbox, bullet, alphabetical | `rail`, absent on numbered and arrowed by B-9 |
| `intents.ts:145` `listLineClass` | checkbox, sequenced | a class by `kind`, plus `checked` |
| `detect.ts:555-563` | ordered, alphabetical | `sequence`, a read and a write per type |
| `detect.ts:552-553` | arrow has its own regex | one regex, `→` in the marker alternation, which also folds the early return at `:574-585` (Inferred) |
| `listModel.ts:257,261`, `listRenumber.ts:28` | sequenced | `sequence` present, one predicate |
| `codec.ts:17-18` | task against others | `parseListMarker(last + ' ')`, with `kind === 'checkbox'` restoring anywhere |
| `markdown-pm.css:60-64,495,540`, `:459-507` | zones, rails, glyphs | one `--glyph-zone` per `md-list-<kind>`, with alphabetical no longer sharing `md-list-ordered` |

These stay: `listModel.ts:34`, `listDrag.ts:66`, and `cellStatic.tsx:517`, since a box is real state one type holds; `edits.ts:54,261`, a typing gesture; and `Core/Actions/gripMenu.ts:35`, as `Record<ListKind, …>`, since wording belongs to Actions. The record sits in `Engine/detect.ts` beside `ListKind`:

```ts
const LIST_TYPES: Record<ListKind, {
  marker: string | ((n: number) => string)
  sequence?: { read(ordinal: string): number; write(n: number): string }
  rail?: string
}>
```

Unbuilt, apart from `listMarkerText`'s move to `detect.ts`.

##### 1-T6.3 • The Code-Block Rule, Stated Once in the Scan

Delivered by the stack's second step. **Observed:** `name` is `'Markdown'` for `md`, `markdown`, `Markdown`, and `notes.md`, and undefined for no language and for `mdx`, while `tally` is set on `diff md`, `markdown diff`, and `md diff`. `readsListsIn` states the test, and `lineMarker` feeds `scan.markers` from it: null on math, tables, and every fence line failing it, and parsed past `fenceBodyStart` on a Markdown block's lines.

- **Leaves:** `readsFrom`, `Reader`, `'outside'`, `itemAt`, `listRenumber.ts:49`'s check, and `relist ? i : 'outside'`. One comparison replaces them: two lines share a block when `scan.fences[a]?.from === scan.fences[b]?.from`.
- **Stays:** `openerOf`, private to `listModel.ts` behind `ridesList`, and `inSealedLine` in `listReach`'s `outOfReach`. A null marker there means either writable plain code or sealed math and tables, and C-5 needs the two told apart. `outOfReach` takes no plain-fence case.
- **Fixes:** `isMarker`'s table read, `tableGuard.ts:39`, and `firstItemOf`'s cause.
- **Parity Work:** `smartBackspace` runs `takeMarker` ahead of its `inCodeAt` return, `listLineAt` and `smartBackspace` read their own line, and `pfx` becomes the fence's lead, so Shift-Tab can't eat a fence's indent.
- **Behavior:** Enter, Tab, Shift-Tab, Backspace, and deletion's recount work in a Markdown block. **Observed:** all are null there today. In plain code a pick writes its marker on the line it touches, and `-[x]` plus a space stays literal (**Observed on the Stack:** `1. - a`, and null).

##### 1-T6.4 • One Scan Per Vocabulary

Delivered by the stack's first step, as B-11 asks: `docScan(view.state)` reads a `surfaceScope` facet, and `scope` leaves `rolesAgainst`, `siblingsAt`, `subBlockAt`, `ownersOf`, `renumberRuns`, `dropChanges`, `listReach`, `listKindOf`, `setList`, and the `listRenumber` factory. **Observed on the Stack:** a cell's ` ```\n- a\n``` ` and `$$\n- a\n$$` read `paragraph`, `list`, `paragraph` in `blockStarts`, and a cell binds no citation. *Scouts/7* holds the consumer table.

##### 1-T6.5 • Numbering

Delivered by the stack's third step. Enter writes its type's marker, a run's start is its first row's ordinal, and a drag hands its landing run the start it had. `arrived`, `settled`, `whole`, `rewritten`, `format.ts:384`'s rewrite of unchanged markers, `listRenumber.ts:63`'s compare, and `Math.min(...)` all leave. **Observed:** `Math.min(...)` throws `Maximum call stack size exceeded` at 130,000 rows. `b\n5. a` picked Numbered lands `1.`, `2.`, and `5,6,7` keeps 5 with the last dragged to the top or the first to the bottom (**Observed on the Stack**). The filter stays for Enter, Tab, Shift-Tab, deletion, and paste.

##### 1-T6.6 • Rails Read the Scan

The stack delivers the fix: `railIntents(scan, levels, kinds, depths)` reads a line through `ridesList`, on a page and in a resting cell, which now holds a scan. Unbuilt beyond that:

- **Array Removal:** `listLevels` and `listKinds` from `CachedLineIntents`, `lineIntentsInto`'s return value, and `railTypeClass` can read `scan.markers` once B-1 lands. `quoteDepths` stays unless a scan array replaces it, since reading depth per line doubled the rail pass at 20,000 lines (Unconfirmed).
- **Callout Head:** `pushConstruct` reading `scan.markers` means a callout head draws no glyph and its `- foo` shows as text, and `setBlock` stripping through the prefix fixes the producer. *7-T13* notes the route, and F-1 requires it.
- **Harness:** `Core/Testing/markdownEngine.ts` walks `lineIntentsInto` itself, so the array removal changes it.

##### 1-T6.8 • Smaller Removals

- **Prefix:** `blockPrefix` leaves on the stack, while `leadOf` keeps `format.ts`' import of `edits.ts`.
- **`readLine`:** `setList` needs the prefix and the indent alone, and `setHeading` the rest. Unbuilt.
- **CellEditor:** `listLineAt` and `atListEnd` read the scan on the stack. `listClaims` stays.
- **`moveRange` and `rebuildMove`:** Move to `Engine/blockMove.ts`, a leaf, since `blockModel.ts` imports `listModel.ts` (*9-T11*).
- **`firstItemOf`:** Leaves under D-2.

##### 1-T6.9 • What Stays

- **`LIST_LINE`, `LIST_ITEM`, `MAY_OPEN`:** They ask what micromark's parser holds, where `*` and `)` are real items and `→` and `A.` aren't. Editor-Internals records the cost of crossing them: letting arrow items resync broke table headers.
- **`codeHighlight.ts:55`:** A language's own grammar, which colors `1. [ ] a` as GFM does inside a Markdown block where B-3 reads it as text.
- **`scan.markers` as the one parse site, `continuesList`, `rolesAgainst`'s role vocabulary, and `openerOf`.**
- **`renderCellBody` Separate from `pushConstruct`:** A resting cell has no view. It shares the glyph, the classes, and the rails.
- **`CellEditor`'s Key Routing:** Leaving the cell is a real difference from a page, and G-9 merges the keys beneath it.
- **`landEdit`:** It reuses the filter rather than restating it.
- **`LIST_KINDS` in Actions.**

---

#### 1-T7 • Statements and Concerns

##### Statements That Don't Hold Against the Tree

Each needs rewriting with the change that retires it.

| Claim | Where | Finding |
|---|---|---|
| Writers write "each marker without counting" | Editor-Internals | Enter counts, `edits.ts:88` |
| "A new list-writing edit takes the flag" | Editor-Internals | `canonicalizeCheckbox` and `dashArrow` write markers without it; harmless to counts today |
| "Siblings are the items drawn" | Editor-Internals | `- []` is undrawn and a sibling |
| Rails read the walk's line rule, and a code block rides | Editor-Internals | *1-T2.3* |
| "A code block is read only from inside it… switches and counts on its own" | Editor-Internals | Only a pick does; Enter, Tab, Backspace, and deletion don't |
| `- []` is "prose on both surfaces" | `CellEditor.tsx:59`, `intents.ts:130` | True at rest and in a cell; a page's Enter continues it |
| "The doc is static during a drag" | `listDrag.ts:11` | *1-T4*, The Stale Drop |
| "Read by every formatter" | `format.ts:267` | Two callers |

##### Concerns

- **`rescan` and Masked Markers:** `docScan.test.ts`' generator takes Markdown fence lines in the stack's second step, and `rescan` equals `scanDoc` under the seeded properties in the full suite.
- **Test Weight:** `continueListOnEnter` is named in 6 test files, `editEvent` in 7, and `listRenumber` in 9 (Unconfirmed).

---

#### Dropped Findings

| Finding | Why |
|---|---|
| 1-T6.2's draw path | B-8 and *§Rejections* keep numbers and arrows as text |
| 1-T6.5's restart, stated by the pick | D-4 removes the restart |
| 1-T6.5's recount in `moveRange` | B-5, *9-T2* |
| 1-T6.7 | *§Rejections*, A List Tree; *Scouts/7* measured it |
| 1-T6.10 | *Engine Reconciliation*, *§The Patch Stack* |
| 1-T7's questions | Answered by D-2, C-6, C-5, C-4, and D-1 |
| 1-T7's plan-citing statements and *§Where the Rationale Holds* | They cite the List Glyph Menu plan, which A-2 sets aside |
| 1-T7's concern on the +476 | *The Number* measures from `b7f2f17a5` |
