### Scout 1 — Readers and Writers

**DATE:** 11-05-2026
**HEAD:** `b7f2f17a5` on `active`
**Method:** Read every site below, then the rationale at `5fede9307`. Probes ran the real modules through vitest from the session scratchpad. **Observed** marks a probe's output, **Traced** a path followed through the source, and **Inferred** a conclusion neither proved. Paths are relative to `Core/MarkdownPM/` unless they start with `Core/` or `Desktop/`.

**Rulings Applied:** The coordinator relayed Nathan's rulings during the scout, and *1-T6* is designed on the final set. No current behavior is a contract. A list in a Markdown code block gets Enter, Tab, Shift-Tab, Backspace, numbering, and the menu pick, and draws no glyph. A list in a code block is reachable only from inside it. Every other code block, including one with no language, is plain code to every gesture, and a diff stays a diff even when its language is Markdown. Every list type works through one design. `+` is a plain bullet, and `- [] x` is a bullet whose text is `[] x`, leaving one classification of a marker. Rails stay under bullets, checklists, and lettered lists only.

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

---

#### 1-T2 • Questions Answered More Than Once

##### 1-T2.1 • Is This Line an Item

| Answer | Site | Differs By |
|---|---|---|
| The parse | `scan.markers` | Holds fence, math, and table lines. **Observed:** `markers` is true inside a fence and inside `$$` where `itemAt` is false. |
| The reader's view | `itemAt` | Filters fences, math, and tables by reader. |
| The drawn line | `pushConstruct`, `listGlyphOf` | Reparses past `pageChrome`'s base. Sees a callout head, drops `- []`. |
| The block model | `blockContext.isMarker` | Raw `markers` through `openerOf`, with no table filter. |
| The table guard | `tableGuard.ts:39` | Raw `markers`, so a paste on a fenced `- x` line is refused (Traced). |
| The cell editor | `CellEditor.tsx:60,92` | Fresh parse plus `listGlyphOf`. |
| The resting cell | `cellStatic.tsx:287` | Fresh parse plus `listGlyphOf`. |
| Citations | `detect.ts:303` | Fresh parse. |
| The stats | `subfieldStats.ts:33` | Fresh parse after its own prefix read. |
| The checkbox | `checkboxToggleChange` | Fresh prefixed parse of a string. |

**Reason Given:** `itemAt`'s comment says a reader's view differs, and `listGlyphOf`'s says drawing differs. **Assessment:** The reader's view holds as a concept and the rest don't. Four defects come out of these answers disagreeing:

- **Drawn, With Nothing Behind It:** **Observed:** `> [!note] - foo` draws a bullet widget with level 0 while `scan.markers[0]` is null, `subBlockAt` returns null, `listKindOf` returns null, and `setList` returns no changes. `> [!note] - [ ] foo` draws a checkbox that `checkboxToggleChange` can't toggle. **Traced:** `listDrag.ts:81` defaults the press away, then `:92` returns false, so the glyph is dead to every gesture and the menu it opens does nothing. `setBlock('callout')` produces this state: **Observed:** `> - item` becomes `> [!callout] - item`, because `stripInnerMarkers(line)` at `format.ts:433` reads the whole line, where its prefix defeats the parse.
- **An Item, Drawn as Nothing:** **Observed:** `- [] foo` is a sibling to the walk (`items: [0,1,2]`), `blockAt` calls it a list, Enter writes `\n- `, and it draws no glyph at level -1. The comment at `CellEditor.tsx:59` says it's "prose on both surfaces"; a page's Enter disagrees.
- **A Hidden Box:** **Observed:** `2. [x] foo` parses with `contentStart` 7 and hides `[x] ` in the marker gap, and a switch to Bulleted writes `- foo`, deleting the text. `LIST_MARKER_RE` captures a box after any marker and only the bullet branch reads it.
- **A List Block Inside a Table:** **Observed:** `  text\n→ a | b\n--|--\n` gives a `list` block `{from:0,to:14}` reaching into the table's header row, because `isMarker` skips the table filter. **Observed:** `- x\n→ a | b\n--|--\n| 1 | 2 |` gives `blockAt` `{0,11}` and `blockDeleteSpan` `{0,12}`, so the grip's Delete would take the table's header, while the walk's `subBlockAt` says `{0,3}`.

##### 1-T2.2 • What Type Is This Marker

`kind`, `listGlyphOf`, `drawnKind`, `railTypeClass`, `listLineClass`, and the `md-list-${glyph}` class each classify the same marker. **Reason Given:** `intents.ts:128` says the drawn form and the type differ for `+`, and that `- []` draws nothing. **Assessment:** Both reasons leave with the ruling, so all of these become readings of `kind`. `drawnKind`, the type a pick compares, sits in the drawing module, so `Input/format.ts` imports `Engine/intents`.

##### 1-T2.3 • Which Lines Belong to This Item

`subBlockAt`, `siblingsAt.last`, `ownersOf`'s `end`, `railIntents`' `shown`, and `listRenumber.ts:33-34`'s own walk past nesting. **Reason Given:** The plan says rails read the walk's line rule. **Assessment:** Rails read `continuesList` on the raw line, while the walk reads a block as its opener. **Observed:** in `- a\n\t- b\n\t  ```\nflush\n\t  ```\n\t- c\n- d` the walk gives `b` the sibling `c`, and rails end `b` with an elbow and draw nothing from there down. A plain continuation in the same spot carries (`["0:cap"]` at `c`). **Observed:** in `- a\n\t- b\n- [] u\n\t- c\n- d` the walk holds `[0,2,4]` and rails end at the undrawn item.

##### 1-T2.4 • Where Does This List Block End

`blockAt` stops at a blank; `siblingsAt` crosses one; `atListEnd` asks if any item follows; `railIntents` has `LIST_ENDS`. **Observed:** `- a\n\n- b\n\n\t- c` is three blocks, and a pick at `b` rewrites `a` as well. **Reason Given:** Nathan reversed D-1 (*§Deviations*), so the grip reads as its first glyph does. **Assessment:** The reversal leaves the grip's Delete and the grip's Type addressing different extents, and under the new scope it's open again (*1-T7*). `blockAt`'s blank stop serves the grip's per-block drawing, and the block move's `blockStarts` relies on it too.

##### 1-T2.5 • Which Lines Does a Pick Reach

`listReach` is the single answer for a pick, and `routeRightClick:96-97` picks the range it's handed. `firstItemOf` is a second route into it. **Assessment:** Holds, apart from `firstItemOf`'s defect in *1-T4*.

##### 1-T2.6 • What Number Does This Item Get

| Answer | Site |
|---|---|
| The next ordinal | `continueListOnEnter` `ordinalOf(lm) + 1` |
| 1 or A | `listMarkerText` |
| The run's count | `renumberRun` |
| The run's base | `renumberRun`'s `settled`, with `arrived` and `repicked` |
| Nothing | `moveRange` |

**Reason Given:** Editor-Internals says numbering has one writer and that writers write "without counting". **Assessment:** Enter counts. **Observed:** the filter alone gets every case right from an uncounted write (`5. a` + `\n1. ` lands `6.`; `1. a\n2. b` + `\n1. ` lands `2.` then `3.`; `B.` lands `C.`, `D.`), so `edits.ts:88`'s count is redundant. **Observed:** the block drag doesn't count at all: `1. a\n\n2. b\n\n3. c\n` moved by its grip lands `3. c\n\n1. a\n\n2. b\n`, because `moveRange` discards the `sourceAt` and `destAt` that `rebuildMove` already returned. The drag's event is `'input'`, which the filter ignores.

##### 1-T2.7 • Where Is the Glyph Under the Pointer

`glyphAt` everywhere, plus `claimCheckbox`'s `.md-list-checkbox-seat` and `pointerReveal`'s `.md-list-item`. **Assessment:** The last two ask something narrower and can stay. A position is read as `view.posAtDOM(glyph)` on a live surface and `srcOf(glyph)[0]` at rest, which is correct, since a resting cell has no view.

##### 1-T2.8 • What Prefix Does This Line Carry

| Answer | Site | Reads |
|---|---|---|
| `blockPrefix` | `edits.ts:57` | `quotePrefix`, gated by scope |
| `splitPrefix` | `format.ts:247` | adds the callout head |
| `parseListMarkerPrefixed` | `detect.ts:631` | `quotePrefix`, ungated |
| `pageChrome`'s `base` | `intents.ts:191` | callout prefix, nested quote, blank-line width |
| `leadOf` | `listModel.ts:150` | quote plus indent |
| `proseStart` | `subfieldStats.ts:31` | callout head or quote |
| `fenceBodyStart` | `detect.ts:153` | fence quote and indent |
| `continuesList` | `detect.ts:567` | `quotePrefixWidth` by depth |

**Assessment:** `blockPrefix` and `splitPrefix` are one question split across two files, and `format.ts` imports `edits.ts` for it. A marker's offsets also mean three things: from the line in `scan.markers`, from `inner` in `pushConstruct`, and from `body` in `readLine`. The code-block ruling makes this load-bearing. **Observed:** a list in a fence indented 2 reads levels `[1,2]` where its author wrote levels 0 and 1, and `outdentListOnShiftTab`'s regex would remove the fence's own indent (Inferred).

##### 1-T2.9 • What Is This Line's Quote Depth

`quoteDepthOf` is called in `rolesAgainst` per line, in `ownersOf`, in `deriveLines` (carried as `quoteDepths`, with a stated measured reason), and in `cellStatic.tsx:299`. **Assessment:** The fact is carried in one place for speed and recomputed in the walk.

---

#### 1-T3 • Parallel Definitions and Protocols

- **The Relist Chain:** `Edit.relist` → `editEvent` → the `input.list` string → `tr.isUserEvent(RELIST)`, a three-hop signal for one boolean, with `FormatEdit.relist` repeating the field. I-073 already indexes the back half.
- **Geometry Read Back:** `listRenumber.ts:30` infers a re-pick from `whole`, and `:45` infers `arrived` from `fromB < ls + contentStart`. **Traced:** in a relist edit `whole` can only come from `setList`; Enter's change sits past `contentStart`, and Tab's and Shift-Tab's end before it. `setList` writes `1. ` over a sequenced marker it would otherwise leave alone, purely so the filter sees the shape (`format.ts:384`).
- **Write, Then Unwrite:** `listRenumber.ts:63` cancels with `{}` when the recount restores the old text. The pick wrote text it knew might be unchanged.
- **The Reader Union:** `Reader = number | 'outside'` threads `itemAt`, `readsFrom`, and `ownersOf`. **Traced:** a reader other than `'outside'` only differs from it when it sits in a fence, and fence lines draw no glyph, so `listDrag.ts:45`'s `first` is `'outside'` by another spelling.
- **Scope Threading:** `scope` appears on 28 lines of `listModel.ts`, 22 of `edits.ts`, 20 of `format.ts`, 19 of `intents.ts`, and 9 each of `listRenumber.ts`, `gripMenu.ts`, and `menu.ts`. Its source is one fact, stated in Editor-Internals: the scan is page-shaped while a cell is not.
- **Settings Threading:** `editFor`, `setList`, `listReach`, `listKindOf`, and `readFormatState` all take `Personalization`, for one flag read at `format.ts:323`. `editFor` uses it for no other action.
- **Silent Defaults:** `renumberRuns`' `arrived` and `repicked` default empty, so `dropChanges` passes neither. `blockPrefix` defaults to `'page'`, and `lineBodyBefore` and `opensLine` reach it from `typedInput` in a cell, so a `>` is read as a quote there (Traced). `applyEditorAction` defaults to `'page'` and `formatKeymap` mounts it in a cell, harmless only while chords are `format:*`; the Caution Check reverted the required scope on those grounds.
- **Five Parallel Arrays:** `railIntents` takes `lines`, `lineStarts`, `listLevels`, `listKinds`, and `quoteDepths`. Three of them are per-line projections of a marker or line, cached and carried by `stepLineIntents`.
- **Computed Twice:** `pushConstruct` reparses what `scan.markers` holds; `readLine` parses twice (`:280` and `stripInnerMarkers`); `itemAt` reparses per call in a cell.
- **`lineIntentsInto`'s Return Value:** The drawing pass returns the marker so `deriveLines` can derive rails from it, which makes drawing the source of `listLevels`.
- **Class Names as Data:** `seatPastMarker` reads `className.includes(GLYPH_CLASS)` and `className === 'md-list-gap'` back out of the intents it was handed.

---

#### 1-T4 • Caution Code

Each row is a guard whose producing state I couldn't reach, or one whose reachable cause isn't what it guards.

| Site | Guard | Traced | Result |
|---|---|---|---|
| `listRenumber.ts:52` | `below < was.text.length` | `below` comes from a `'sibling'` line, which is an item and so non-empty, so its start is before the end | Unreachable |
| `blockModel.ts:73` | `i >= n` | `blockAt` and `blockStarts` guard the upward call; `i < 0` is reached, `i >= n` isn't | Unreachable half |
| `detect.ts:589` | `!idx`, `!ws` | the `d` flag and the mandatory group 6 | Type narrowing only |
| `detect.ts:595` | `m[5] ?? ''` | `b` exists only when group 5 took part | Unreachable |
| `format.ts:283` | `lm ?` in `readLine` on `setList`'s path | `setList` calls it only when `itemAt` is null, and the same parse follows, so the item side is reachable only from `setHeading` | One caller's branch |
| `listDrag.ts:50,52` | `cTop && cEnd`, `cMarker ?? cTop` | I found no null from `coordsAtPos` inside `visibleRanges` | Not reached |
| `lineDom.ts:42,47`, `cellStatic.tsx:516` | `.closest?.` | I found no non-Element target on these events | Not reached |
| `listModel.ts:180,185` | `bStart < 0`, `tLine < 0` | `from` and `at` are line starts unless the document moved during a gesture | Stale document only |
| `listModel.ts:72` | `itemAt(...)!` | See below | Reachable throw |

**The Stale Drop:** `listDrag.ts:104` reads a fresh scan at the drop, against `block` and `slot.line` captured at the press. `beginRelocateDrag` carries no document check, while `gripMenu.ts:164` guards the same race. `mirrorBody`, an external landing, is the producer that can move the document during a gesture (Inferred). **Observed:** a stale block or slot throws `Cannot read properties of null (reading 'level')` from `rolesAgainst`. The comment at `listDrag.ts:11` says the document is static during a drag, and the Wave Two fold reads it as if it weren't.

**`firstItemOf` Is a Defect, Not Caution:** `gripMenu.ts:63` loops until `itemAt` isn't null, and it stops only because `scan.markers[n]` is `undefined`. **Observed:** on `  text\n→ a | b\n--|--\n` the loop runs past the table to `k = 4` and a Type pick writes `1. ` at the document's end. On the same text without the trailing newline, `at` is `undefined`, and the pick writes `  1. ` on line 0 by accident.

---

#### 1-T5 • What's Carried for One Caller

| Item | Carried For |
|---|---|
| `siblingsAt`'s `joins` | only `runAt` passes it |
| `parseListMarker`'s `offset` | only `parseListMarkerPrefixed` passes it |
| `renumberRuns`' `arrived`, `repicked` | only `listRenumber` |
| `MoveSeams`, `rebuildMove`'s flags | only `dropChanges` varies them; `moveRange` always passes `true, true` |
| `Slot.indent`, `Slot & { line }` | only `listDrag` |
| `lineIntentsInto`'s `ranged` | only `assembleLineIntents` |
| `readLine`'s `scope` | `selectedLines` always passes `'page'` |
| `selectedLines`, `SelectedLine` | only `setHeading`, while the comment still says "every formatter" |
| `indentLevel` export | tests; production reads it in-file |
| `setList`, `setBlock`, `toggleInline` exports | `editFor`, in-file, plus tests |
| `rolesAgainst` export | `listRenumber.ts:32` |
| `openerOf` export | `blockModel` |
| `drawnKind` export | `format.ts` |
| `MAX_NESTING_LEVEL` export | `edits.ts:163` |
| `blockPrefix` export | `format.ts:248` |
| `splitPrefix` export | `formatState.ts:25` |
| `landEdit` | `cellStatic.tsx:474`, plus 6 test files |
| `firstItemOf` | `gripMenu.ts`, both ends of one menu |
| `seatPastMarker`'s `scope === 'cell'` branch | the cell only |
| `rolesAgainst:75-78`, `readsFrom`'s `own` | a fence reader, which only `listReach` and a relist in a code block produce |
| `railIntents`' `quoteDepths` in a cell | **Traced:** no cell item has depth above 0, so `depth` stays 0 and the array changes nothing there |
| `'text'` through `listReach` | `readFormatState` on a right-click, which computes a `list` value Text's menu never shows |
| Scope defaults where production always passes it | `docLineIntents`, `assembleLineIntents`, `seatPastMarker`, `smartBackspace`, `canonicalizeCheckbox`, `markdownDecorations`, `blockHandles`, `pointerReveal` |
| `continueListOnEnter`, `indentListOnTab`, `outdentListOnShiftTab` defaults | `markdownInput` alone, which only `MarkdownEditor.tsx:143` mounts |

---

#### 1-T6 • Approaches

Each entry says what leaves first, what arrives, and which behavior changes.

##### 1-T6.1 • One Marker, Classified Once

The parser's `kind` becomes the only classification, by moving the box group inside the bullet alternative, requiring its inner character, and reading `+` as `bullet`.

- **Leaves:** `listGlyphOf`, `drawnKind`, `ListGlyph`, the `box?` on bullets, `Box.inner`, the null branches at `CellEditor.tsx:62,96`, `cellStatic.tsx:288`, and `intents.ts:664`, and the comments that explain them.
- **Behavior:** `+ x` draws `•` and Bulleted is its check. `- [] x` draws a bullet with the text `[] x`. `2. [x] foo` shows its `[x]`, which fixes the hidden box. `-[] x` stays prose, since no whitespace follows `-` (Inferred).
- **Decide:** Enter under `+ a` either keeps writing `+` or writes `- `. Keeping it needs the `bullet` field. Writing `- ` lets `bullet` leave and makes Enter and a pick share one marker text. The two draw identically, so I'd write `- `. A file's existing `+` stays untouched either way.

##### 1-T6.2 • One Per-Type Definition

Every branch on a specific type, and what could replace it:

| Site | Branches On | Replaced By |
|---|---|---|
| `format.ts:232` `listMarkerText` | all five | `marker` |
| `edits.ts:87-91` Enter's `next` | sequenced, checkbox, other | `marker`, once the filter counts |
| `intents.ts:105` `railTypeClass` | checkbox, bullet, alphabetical | `rail`, absent on numbered and arrowed by ruling |
| `intents.ts:145` `listLineClass` | checkbox, sequenced | a class by `kind`, plus `checked` |
| `intents.ts:692,721,742` `pushConstruct` | three draw paths | one path, see below |
| `intents.ts:672` `bulletAbsorbs` | bullet | the same one path |
| `intents.ts:50` `pushMarkerGap`, `md-list-gap` | number, arrow | the same one path |
| `intents.ts:72` `WidgetSpec` | bullet, checkbox | one glyph spec |
| `decorations.ts:155,167` | bullet, checkbox | one widget |
| `cellStatic.tsx:245` `MarkerGlyph` | checkbox, bullet, text | the same glyph builder |
| `intents.ts:617` `seatPastMarker` | a replaced or a literal marker | one rule, since no marker is literal |
| `detect.ts:555-563` | ordered, alphabetical | `sequence`, a read and a write per type |
| `detect.ts:552-553` | arrow has its own regex | one regex, `→` in the marker alternation, which also folds the early return at `:574-585` (Inferred) |
| `format.ts:384` | sequenced | leaves with the numbering change in *1-T6.5* |
| `listModel.ts:257,261`, `listRenumber.ts:28` | sequenced | `sequence` present, one predicate |
| `listModel.ts:34`, `listDrag.ts:66`, `cellStatic.tsx:517` | checkbox | stays: a box is real state only one type holds |
| `edits.ts:54,261` | checkbox shorthand | stays: a typing gesture |
| `codec.ts:17-18` | task vs. others | `parseListMarker(last + ' ')`, with `kind === 'checkbox'` restoring anywhere |
| `markdown-pm.css:60-64,495,540`, `:459-507` | zones, rails, glyphs | one `--glyph-zone` per `md-list-<kind>`; alphabetical stops sharing `md-list-ordered` |
| `Core/Actions/gripMenu.ts:35` | labels | stays, as `Record<ListKind, …>`: wording belongs to Actions, and the engine shouldn't import it |

The record, in `Engine/detect.ts` beside `ListKind`:

```ts
const LIST_TYPES: Record<ListKind, {
  marker: string | ((n: number) => string)
  sequence?: { read(ordinal: string): number; write(n: number): string }
  rail?: string
}>
```

Genuine per-type data is the marker text, the sequence, and the rail. A box's checked state stays on the marker, and the ordinal codec stays the one behavioral split. Whether a `glyph` field is needed depends on the next point.

**The Draw Path:** Bullets and checkboxes are replaced by widgets, numbers and arrows are recolored source, and that split costs three branches, `pushMarkerGap`, `bulletAbsorbs`, and both halves of `seatPastMarker`. If every glyph became one replacing widget, as `MarkerGlyph` already draws them at rest, all of it goes. **Behavior:** a number stops being selectable as text and reveals only with a caret on it, as a bullet does today. **Unsure:** `intents.ts:741`'s reason, that typing after a literal marker can't hit an atomic range, and the spell-check reason at `:48`. The second leaves with the literal marker. The first needs a live test.

##### 1-T6.3 • The Code-Block Rule, Stated Once in the Scan

One predicate decides, using fields the scan already holds. **Observed:** `name` is `'Markdown'` for `md`, `markdown`, `Markdown`, and `notes.md`, undefined for no language and for `mdx`, and `tally` is set on every diff, including `diff md` and `markdown diff`.

```ts
const holdsLists = (f: FenceInfo): boolean =>
  f.name === 'Markdown' && f.tally === undefined && f.role === 'content'
```

`scan.markers` then holds only what's an item to someone inside its own region: null on math, tables, and every fence line failing the predicate, and parsed past `fenceBodyStart` on Markdown fence lines.

- **Leaves:** `readsFrom`, `Reader`, `'outside'`, `inSealedLine` in the list model, `listRenumber.ts:49`'s check, and `relist ? i : 'outside'`. One comparison replaces them: two lines are in the same block when `scan.fences[a]?.from === scan.fences[b]?.from`. `rolesAgainst`, `ownersOf`, and `listDrag.ts:45` read that. `listReach` keeps a local crossing test, which drops every fence line when `anchor` and `upTo` aren't in the same block.
- **Stays:** `openerOf`. A block riding an item from outside is unchanged, so it survives, and it moves to `docScan.ts` since it reads only the scan.
- **Fixes:** `isMarker` stops reading table rows, which removes the list block inside a table. `tableGuard.ts:39` becomes correct. `firstItemOf`'s runaway loses its cause, since a list block now always holds an item.
- **Parity Work:** `smartBackspace` runs `takeMarker` ahead of the `inCodeAt` return at `edits.ts:236`, which is safe on prose because a marker holds no inline code (Inferred). `listLineAt` and `smartBackspace` read their own line. `pfx` becomes the fence body start, so Shift-Tab can't eat a fence's indent.
- **Behavior:** Enter, Tab, Shift-Tab, Backspace, and deletion's recount start working in a Markdown block. **Observed today:** all are null there, and a deleted line isn't recounted. A pick in a plain block stops writing. **Observed today:** `setList` writes `- ` into a ` ```js ` block. `outOfReach` gains the plain-fence case.
- **A Selection Crossing the Edge:** Already right from outside. **Observed:** a range from a Markdown block's opener through the line after it writes only the line after.
- **Plain Code:** `canonicalizeCheckbox` has no code check. **Observed:** `-[x]` plus a space in a ` ```js ` block rewrites to `- [x] `, which breaks "plain code to every gesture", so it takes the scan.
- **Open:** See *1-T7*: the typed shorthands in a Markdown block, Lists ▸ in plain code, and `notes.md`.

##### 1-T6.4 • One Scan Per Vocabulary

The largest removal and the least certain. If `scanDoc(text, scope)` built a cell's scan with no fences, quotes, math, tables, or citations, and a Text scan with no markers, then `itemAt` would be `scan.markers[k]` and `scope` would leave `rolesAgainst`, `siblingsAt`, `subBlockAt`, `ownersOf`, `renumberRuns`, `runAt`, `dropChanges`, `listReach`, `listKindOf`, `setList`, `splitPrefix`, `blockPrefix`, and the `listRenumber` factory.

- **Fixes:** `blockStarts` becomes right in a cell without a parameter. **Observed:** a cell's ` ```\n- a\n``` ` and `$$\n- a\n$$` draw a list with `blockStarts` reporting `code` and `math`, so no grip appears.
- **Mechanism:** `perScopedDoc` already exists for the intents. `docScan(doc)` is keyed on `Text`, which knows no scope, and 93 production lines call it, so either they pass a scope or they read a facet from the state.
- **Unsure:** Whether every cell-side consumer wants the narrower scan (`autoPair`'s `inCodeAt`, `cellCitations`, and the property tests, which gain a scope axis). It overlaps I-036, whose capability predicates would mostly stop being needed in this surface, so the planner should weigh the two together.
- **Fallback:** Without it, `itemAt(scan, k, scope)` stays as one line.

##### 1-T6.5 • Numbering, Stated by the Writer

- **Leaves First:** `edits.ts:88`'s count (see *1-T2.6*). Enter writes its type's marker.
- **The Pick:** Take I-073's direction. A pick states its restart, so `whole`, `rewritten`, `format.ts:384`'s rewrite of unchanged markers, and `listRenumber.ts:63`'s compare all leave. Whether it recounts in place or says so through the event (`input.list.restart`, which `isUserEvent` matches hierarchically) is a planner's call. I prefer the event, because it keeps one writer and needs no second whole-document scan.
- **The Base:** A run's start is its first row's ordinal, which removes `arrived`, `settled`, and `:45`'s geometry. **Observed today:** `5. a\n\t1. b` outdented lands `5.`, `6.`, which this keeps. **Behavior:** `b\n5. a` picked Numbered lands `1.`, `2.`, in place of `5.`, `6.`. A drag needs one thing stated: it passes the run's old start, so `5,6,7` stays `5,6,7` when the last moves up.
- **The Move:** `moveRange` runs the same recount from the `sourceAt` and `destAt` it now discards, which fixes the block drag's stale numbers and leaves one move function with the seams as arguments.
- **`Math.min(...)`** goes with `settled`. **Observed:** it throws a `RangeError` at 130,000 rows in one run, inside a transaction filter, where `decorations.ts` already forbids a spread for this reason.
- **Keep:** The filter for Enter, Tab, Shift-Tab, and deletion. I-073 is right that a drag through the filter adds inference.

##### 1-T6.6 • Rails Read the Scan

`railIntents(scan, …)` reads `scan.markers` and one new per-line depth array, and reads a fence or math line through `openerOf`, which fixes *1-T2.3*.

- **Leaves:** `listLevels`, `listKinds`, and `quoteDepths` from `CachedLineIntents` and the step, `lineIntentsInto`'s return value, `railTypeClass`, and the `quoteDepthOf` recomputes in the walk.
- **Behavior:** Rails carry through a block under an item. `pushConstruct` reading `scan.markers` means a callout head draws no glyph, and its `- foo` shows as text. `setBlock` should strip through the prefix, which fixes the producer.
- **Cost:** The stated reason for carrying depth was that reading it per line doubled the rail pass at 20,000 lines. A scan array keeps that win, and `splice` gains one `perLine`.
- **Cell:** `renderCellBody` passes a cell scan, and its `items` map leaves if *1-T6.4* lands. Otherwise it keeps its own projection.

##### 1-T6.7 • A Tree Rather Than Walks

**Inferred, and the riskiest idea here.** One `perScan` pass with a stack could hold each item's parent and end, making `subBlockAt`, `ownersOf`, `siblingsAt`, and `listRenumber.ts:32-36`'s walk into lookups, with rails reading it too. It removes `rolesAgainst`'s per-call closures and answers *1-T2.3* outright. **Unsure:** The walk's asymmetry around orphaned deep items (`\t- a\n- b` reads as `nested` upward and `ends` downward), and the stepped-derivation rule, since a whole-document pass per version is only free while rails already pay it. *1-T6.3* and *1-T6.6* are worth landing without it.

##### 1-T6.8 • Smaller Removals

- **Prefix:** Fold `blockPrefix` and `splitPrefix` into one in `Engine/`, which ends `format.ts`' import of `edits.ts`, and carry the prefix end on the marker, using `parseListMarker`'s existing `offset`.
- **`readLine`:** `setList` needs the prefix and the indent alone, and `setHeading` the rest.
- **CellEditor:** `listLineAt` and `atListEnd` read the scan. `listClaims` stays.
- **`moveRange` and `rebuildMove`** aren't list logic. They'd sit with the block model once `openerOf` moves, which avoids an import cycle (Inferred).
- **`firstItemOf`:** Bounded by construction under *1-T6.3*. Passing `block.from, block.to` as a range would remove it, which is the question in *1-T7*.

##### 1-T6.9 • What I'd Keep

- **`LIST_LINE`, `LIST_ITEM`, `MAY_OPEN`:** They ask what micromark's parser holds, where `*` and `)` are real items and `→` and `A.` aren't. Editor-Internals records the cost of crossing them: letting arrow items resync broke table headers. One grammar across these would be a defect.
- **`codeHighlight.ts:55`:** A language's own grammar.
- **`scan.markers` as the one parse site, `continuesList`, `rolesAgainst`'s role vocabulary, and `openerOf`.**
- **`renderCellBody` Separate from `pushConstruct`:** A resting cell has no view. It should share the glyph, the classes, and the rails, and it can't share the decoration pass.
- **`CellEditor`'s Key Routing:** Leaving the cell is a real difference from a page.
- **`landEdit`:** It reuses the filter rather than restating it.
- **`LIST_KINDS` in Actions.**

##### 1-T6.10 • Order

Removal first: *1-T6.1*, then *1-T6.3*, then *1-T6.5* and *1-T6.6*, with *1-T6.2*'s record landing as each branch leaves. *1-T6.4* is a separate decision, and the draw path in *1-T6.2* needs a live test before commitment.

---

#### 1-T7 • Insights, Concerns, and Disagreements

##### Questions for Nathan

- **The Grip's Type ▸ Extent:** It can reach its block, as D-1 first said, or its first item's group, as Nathan's later reversal has it. The block removes `firstItemOf` outright and makes Type and Delete address one extent, and the group keeps Preserve List-Level Formatting deciding its reach.
- **Typed Shorthands in a Markdown Block:** `dashArrow` stands down through `isLiteralAt`, so `->` won't form an arrow item in one, while `-[x]` plus a space would. The ruling names Enter, Tab, Shift-Tab, Backspace, numbering, and the pick, so these need a call.
- **Lists ▸ in Plain Code:** Under the ruling a pick does nothing there. The rows could stay inert or hide. `readFormatState` already computes `fenced`.
- **`notes.md`:** A path-only fence reads as Markdown, so it would hold lists. That reads as right, and it's a consequence nobody ruled on.
- **`preserveListLevels`:** One reader and five signatures. Nothing in the rulings touches it, and it's worth asking if it still earns its row.

##### Statements That Don't Hold Against the Tree

| Claim | Where | Finding |
|---|---|---|
| Writers write "each marker without counting" | Editor-Internals | Enter counts, `edits.ts:88` |
| Numbering "has one writer" | Editor-Internals | Block drag leaves stale numbers, *1-T2.6* |
| "A new list-writing edit takes the flag" | Editor-Internals | `canonicalizeCheckbox` and `dashArrow` write markers without it; harmless to counts today |
| "Siblings are the items drawn" | Editor-Internals | `- []` is undrawn and a sibling |
| Rails read the walk's line rule, and a code block rides | Editor-Internals, B-16 | *1-T2.3* |
| "A code block is read only from inside it… switches and counts on its own" | Editor-Internals | Only a pick does; Enter, Tab, Backspace, and deletion don't |
| `itemAt` is how "the list model's walk" reads, and "two sealed-line copies fold into" it | Editor-Internals, plan | `blockContext` reads raw `markers`, *1-T2.1* |
| "Which items belong together has one" answer | Plan, Less to Understand | Three, with block and rails |
| "The renumber owns counting" | Plan, Clearer Boundaries | Enter and the drag count |
| "One rule for what a code block lets a reader see" | Plan, One Way | Also `blockContext`, `tableGuard`, rails, `canonicalizeCheckbox` |
| The glyph menu reaches every glyph, callout included | Plan, Reflected Everywhere | A callout head's glyph has a dead menu |
| `- []` is "prose on both surfaces" | `CellEditor.tsx:59`, `intents.ts:130` | True at rest and in a cell; a page's Enter continues it |
| "The doc is static during a drag" | `listDrag.ts:11` | Contradicted by the fresh read at `:104` |
| "Read by every formatter" | `format.ts:267` | Two callers |

##### Where the Rationale Holds

The sibling walk by quote depth and level is a real consolidation, the list-type switch is one, and `mapAscending`'s measured reason stands. The code-block read and the D-1 reversal were Nathan's calls, and the new rulings reopen both.

##### Concerns

- **The Plan's +476:** The plan's *§Concepts* added `readsFrom`, `itemAt`, `drawnKind`, `listReach`, and `repicked`, so much of what *1-T6* removes arrived there, as the cost of carrying rules the new rulings retire (Inferred).
- **`rescan` and Masked Markers:** Masking `markers` by math and tables moves that read into `scanLines`, which sees a window. The windows are quiet-bounded and math is paired before splicing, so it should equal `scanDoc`, but the seeded properties in `Engine/docScan.test.ts` have to pin it, and the generator's alphabet needs a Markdown fence holding items (Inferred).
- **`Core/Testing/markdownEngine.ts`:** It defaults scope and walks `lineIntentsInto` itself, so *1-T6.6* changes the harness.
- **Test Weight:** `continueListOnEnter` is named in 6 test files, `editEvent` in 7, and `listRenumber` in 9. Enter's uncounted write and the base rule will rewrite pins, so those should assert the rulings rather than today's shape.
