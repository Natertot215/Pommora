**Re-grounded:** 10-07-2026 at `32d3fa62c`

### E — MarkdownPM Scopes

Slice: MarkdownPM's scopes, `CellEditor`, `inlineSurface`, the empty-editor placeholder, and what a standalone restricted editor would carry. Read-only; every claim cites the file it was read from.

#### Task 1: What `'cell'` Scope Actually Restricts

`MarkdownScope` is declared once at `Core/MarkdownPM/Engine/detect.ts:479-480` with a comment naming its contract ("a table cell reads the list vocabulary and nothing else"); `detect.ts` itself holds no scope reads. `inlineSurface` hands the scope to seven extensions (`surface.ts:28-32, 55-56`); the other fifteen members of the surface are scope-blind (`surface.ts:33-54`: block drag, grip menu, caret, selection, connection/citation/link clicks, paste link, pending title, alias-on-leave, link rest/typing, line wrapping, content attributes, wrap chords).

##### Scope-Read Census

| Site | Page | Cell |
| --- | --- | --- |
| `Engine/intents.ts:340-344` (`lineIntentsInto`) | Walks `pageChrome` (`intents.ts:160-326`): callout and quote boxes, fences and diff margins, display math, the citation row, citation marker ordinals | Skips all of it; the list grammar starts at column 0 |
| `Engine/intents.ts:587` | `#` lines draw as headings | `#` lines are literal |
| `Engine/intents.ts:663` | A lone `---` draws a rule widget | Literal |
| `Engine/intents.ts:445-449` (`stepLineIntents`) | Re-derives citation lines whose chrome moved | Skipped |
| `Engine/intents.ts:535-546` (`seatPastMarker`) | Seats past a visible glyph only | Also walks past any atomic or prefix span, since a replaced marker draws nothing to sit against |
| `decorations.ts:416` | HTML-block formatting honors the setting | Off; a leading tag reads inline |
| `decorations.ts:537` | `[[#Heading]]` checks the view's own heading keys | Checks the page editor found through `pageEditorAt(view.dom)` (`api.ts:32-35`) |
| `decorations.ts:629-756` (`caretSeat`) | Diff-margin seats, presses, paste and drop refusals, side assignment | All gated off by `page` (`:648`); the prefix and marker seat runs on `'cell'` intents (`:730-738`) |
| `decorations.ts:759-763`, `docCache.ts:79-87` | Per-version atomics and intents cached under `page` | Cached under `cell`; the cache record is the literal `{ page, cell }` (`docCache.ts:84`) |
| `Gestures/listDrag.ts:52` | Drop boundaries skip sealed lines (code, math, tables) | No sealed-line filter |
| `Input/listRenumber.ts:38-39` | Renumber skips sealed lines | Counts every marker |
| `Menus/blockHandles.ts:43` | Grips on paragraph, code, list, hr, math, embed, webpage (`:14-22`) | Grips on lists only (`:25`) |
| `Menus/blockHandles.ts:48` | Blockquote grip widget | None |
| `Menus/blockHandles.ts:173-183, 186-190` | Code-tag copy reveal; gutter-strip hover gate | No tag reveal; hover over any list line reveals |
| `Input/markdownInput.ts:228-247` (`typedInput`) | Diff-margin sign, citation seed on `]`, callout shorthand `\|` | None of the three |
| `Input/edits.ts:44-45` (`blockPrefix`) | Quote prefix carried by list keys | Empty; `>` is prose |
| `Input/edits.ts:55` (`listLineAt`) | Fenced lines refuse list keys | No fence check |
| `Input/edits.ts:180-185` (`markerEndOf`) | Backspace collapses a list, heading, or quote marker | List marker only |
| `Input/edits.ts:212-244` (`smartBackspace`) | Fence body join, code refusal, callout prefix protection | Skipped |
| `Input/edits.ts:258-263` (`canonicalizeCheckbox`) | Quote-prefixed shorthand | Unprefixed |
| `Menus/menu.ts:94-101` (`editorMenu`) | Sends `embedSeat`, `citeSeat` | Sends both `false`; the scope rides the request |
| `Core/Actions/editorMenu.ts:135-137` | Insert Link, Lists, Insert, Format, Embed, Heading | Insert Link, Lists, Format |
| `Engine/subfieldStats.ts:40, 65-66` | HTML-block tokens hide nothing | Hidden as ordinary tokens |
| `Tables/CellEditor.tsx:60, 82-85, 213` | — | Hardcodes `'cell'` for list keys, seat, Backspace |

##### Against the Wish List

| Construct | `'cell'` Renders | Still in the Document Model | Evidence |
| --- | --- | --- | --- |
| Lists, checkboxes | Live | Yes | `intents.ts:602-662` |
| Bold, italic, strike, highlights, inline code | Live | — | `tokenIntents` is scope-blind, `intents.ts:119-154` |
| Connections | Live, with autocomplete and menu | — | `decorations.ts:535-609`; `CellEditor.tsx:145, 263` |
| Headings | Literal | Yes — the heading scan feeds `docOutline` and `docSectionHeadings` | `intents.ts:587`; `useConnectionAutocomplete.ts:59-62` |
| Fences | Literal | Yes — `scan.fences`, and `inCodeAt` reads it | `intents.ts:213-278` page-only |
| Quotes, callouts | Literal | Yes | `intents.ts:174-211`; `edits.ts:44-45` |
| Tables | Literal pipes; the widget is page-only | Yes — `scan.tables` | `MarkdownEditor.tsx:201` |
| Embeds | No tile; the token draws as styled title text with markers hidden, and stands down where the embed claim holds | Yes — `scan.embeds` | `MarkdownEditor.tsx:202-207`; `intents.ts:125`; `decorations.ts:420-429` |
| Display math | Literal `$$` lines; inline `$…$` styled as source | Yes — `scan.maths` | `intents.ts:281-284`, `:126-127` |
| Citations | Markers literal unless `cellCitations` supplies ordinals; rows literal; no seed on `]` | Yes — `scan.citations` | `intents.ts:287-323`; `cellCitations.ts:1, 16-26`; `markdownInput.ts:241` |
| Horizontal rules | Literal | Yes (as a block kind) | `intents.ts:663` |
| `/` block menu | Absent; it lives in `MarkdownEditor` alone | — | `MarkdownEditor.tsx:155, 216` |
| `§` section runs | The `##`→`§` transform runs and runs paint under Automatic, against the editor's own document; the `§` autocomplete arm is page-only | — | `markdownInput.ts:253`; `decorations.ts:610-620`; `MarkdownEditor.tsx:247` vs `CellEditor.tsx:263` |
| Grip menu | List grip: Type ▸ list kinds and Delete; no heading grip (the heading line class is folding's, page-only) | — | `Core/Actions/gripMenu.ts:68-77, 99-101`; `Menus/gripMenu.ts:111-126` |

`'cell'` renders the wish list as stated: lists, marks, highlights, and connections live; headings, fences, quotes, callouts, tables, embeds, display math, citation rows, rules, and the block menu absent or literal. Rendering forces no third scope.

The break sits under the rendering. `docScan` takes no scope, so the model stays page-shaped (`Guidelines/Editor-Internals.md`, "A cell's document model is page-shaped"), and every reader of the code mask is ungated: `autocompleteQuery` refuses inside code (`Autocomplete/autocomplete.ts:56`), as do auto-pair, color-mark pairing, selection wrapping, pair deletion, construct closing on Enter, and — through `isLiteralAt` — ellipses, section sign, bullet, punctuation, equations, and arrows (`edits.ts:331, 334, 369, 429, 449, 486, 622-625, 657, 674, 690, 719, 750, 765`) and `headingHash` (`Links/headingHash.ts:20`). In a Text value, a pair of ` ``` ` lines renders as two literal lines while silently disabling `[[` autocomplete and every typing transform between them; `# ` lines join the outline that `[[#` lists and `§` runs resolve against. A table cell carries the same defect, made rare by the cell's single-line origin; a multi-line pane makes it reachable by typing.

A third scope value would touch `detect.ts:480`, the `{ page, cell }` record at `docCache.ts:84`, `subfieldStats.ts:65-66`, the zod enum the host validates the request against at `Core/Actions/editorMenu.ts:19` (`Core/Actions/handlers.ts:12`) and its row split at `:135`, and every census site. Most sites test `=== 'page'` while six in `Core/MarkdownPM` test `=== 'cell'` (`decorations.ts:537`, `edits.ts:183`, `intents.ts:535`, `blockHandles.ts:43, 173, 188`), so a new value would fall to cell behavior at the first and page behavior at the second unless each is revisited.

#### Task 2: CellEditor's Table-Specific Parts

`CellEditor.tsx` splits as follows.

##### Table Plumbing

- **`consume` (`:37-43`):** Every claimed key returns `true` because the cell sits inside the table widget's `ignoreEvent` host.
- **Navigation fallbacks:** Tab and Shift-Tab off a list call `onNavigate('next' | 'prev')` (`:172-186`); Enter on a non-list line calls `onNavigate('down')` (`:192`); Shift-Enter on a list's final item calls `onNavigate('down')` (`:201`).
- **Table paste filter (`:157-168`):** A table-shaped clipboard routes to `onTablePaste`.
- **Citation ordinals:** `cellCitations(() => ordinalOfRef.current)` (`:156`), the live `ordinalOf` ref (`:142-143`), and the `redrawNudge` on its change (`:297-300`).
- **History forwarding:** No `history()` extension is mounted; Mod-Z and Mod-Shift-Z (`:35, 232-236`) and native `historyUndo`/`historyRedo` input (`:246-258`) forward to the page.
- **Content sync (`:302-312`):** `silentEdit` (`:45-46`) tags an external rewrite, compared as GFM source through `cellToSource(...).trim()`.
- **Entry seat (`:269-289`):** `caretCoords`, `initialSelect`, and `sweepFrom` seat the caret where the resting cell was pressed.

##### Reusable Parts

- `inlineSurface(() => connections?.(), 'cell')` (`:155`).
- `useConnectionAutocomplete` plus `<AutocompletePane>` and `paneKeys([acCtl])` (`:145, 196, 317`), with `detectConnectionQuery` on doc or selection change (`:263`) and the blur close (`:242-245`).
- `formatKeymap` through `useReconfigured` (`:146, 239`) and `editorKeymap` (`:240`). `formatKeymap` binds only the `format:*` chords (`Input/formatKeymap.ts:8-24`; `Core/Actions/commands.ts:24-30`), so no chord writes a heading or block.
- List keys: `listEdit` over `continueListOnEnter`, `indentListOnTab`, `outdentListOnShiftTab` (`:49-65`), `listLineAt`/`listClaims` (`:68-75`), `atListEnd` (`:100-107`), `seatPastMarkerNow` (`:78-88`), Backspace through `smartBackspace(..., 'cell') ?? autoDelete` then `joinEmptyHead` (`:91-97, 205-223`), and Delete (`:224-231`).

The cell's key layer lives inside `CellEditor.tsx`, interleaved with the navigation fallbacks in the same bindings. The page's key layer, `markdownInput` (`markdownInput.ts:258-275`), isn't scope-parameterized: its Backspace calls `smartBackspace` at the page default (`:195`), forward-delete reads `'page'` intents (`:177`), and Enter chains blockquote continuation, `closeBlockOnEnter`, and `tableBoundaryEnter` (`:86-98`). Neither layer is importable as a `'cell'`-scope keymap today.

##### The Three Paths, as Carried Weight

- **CellEditor minus table plumbing:** Carries `inlineSurface('cell')`, autocomplete, the format keymap, and the list keys. It lacks a `history()` and `historyKeymap`, a placeholder, a non-navigating Enter and Tab policy, and a submit path. Sharing the list keys with `CellEditor` without duplicating them requires lifting them out of the component's bindings.
- **`MarkdownEditor` with a scope prop:** The extension array mounts unconditionally (`MarkdownEditor.tsx:170-253`): `markdownInput`, `htmlShortcuts`, `markdown()` with `pageCode`, `codeHighlight`, citation row pointer and menu, `tableWidgetExtension`, `embedTiles`, `embedGuard`, `calloutGuard`, `headingRenameSettle`, `citationGuard`, `citationHost`, `citationOrder`, the block menu, `markdownFolding`, plus the warm seam, prefs load, header zone, and `Scrollbar` (`:254-369`). A scope prop changes only `:198`; every other page construct stays mounted, and the page's own key layer stays page-shaped.
- **A third component:** Carries whatever it mounts. The surface needs no `markdown()` language: lezer is read only by `MarkdownEditor.tsx`, `codeHighlight.ts`, and `markdownInput.ts`, and `CellEditor` runs without it today.

##### Host Requirements

`EditorHost` (`api.ts:140-184`) requires `settings`, `aliases`, `linkTitles`, `citations`, `clipboard`, `menus.{grip, table, citation}`, `renderTile`, `pickTree`, `openLink`, `warmBody`, `fetchBody`, and `pageTitle`; `menus.format`, `glance`, `pageSurface`, `prefs`, and `paneGeometry` are optional. `useEditorHost({ connections })` already builds a complete off-page host: `MarkdownTile.tsx:27` mounts one with no `pageId`, which leaves `prefs` undefined (`Core/Pages/editorHost.tsx:89-97`), `citations.set` inert (`:84-86`), and `pageTitle` null (`:151-154`). `inert: true` drops `menus.format` and `glance` (`:109-118`).

The members a `'cell'`-scope surface reaches are `settings` (`decorations.ts:413`, `markdownInput.ts:54`), `aliases` (`useConnectionAutocomplete.ts:86, 94, 137`), `linkTitles` and `clipboard` (`Links/pasteLink.ts:37, 93, 107, 133`), `menus.grip` (`Menus/gripMenu.ts:131`), `menus.citation` for a marker (`Citations/citationPointer.ts:69`; the row menu at `:124` is page-only), `menus.format` (`menu.ts:87`), `glance` (`Links/linkClicks.ts:60, 74-83`), `openLink` (`linkClicks.ts:67`), `warmBody` and `fetchBody` for `[[Page#` (`Autocomplete/headingTarget.ts:18, 23`), and `paneGeometry` (`useConnectionAutocomplete.ts:198`). `renderTile`, `pickTree`, `prefs`, and `citations` are page-path only. The connections object comes from `useConnections(tree, mode)` (`Core/Session/pageConnections.ts:10-40`), which every surface already shares.

Bare-fragment targets fall back to the editor's own document wherever no table widget surrounds it: `pageEditorAt` returns `editorAt(view.dom)` (`api.ts:32-35`), so `[[#Heading]]` coloring (`decorations.ts:537`), the `[[#` outline (`useConnectionAutocomplete.ts:61`), and a click's `self` travel (`linkClicks.ts:62-63`) all answer against the pane's own text rather than the page that owns the property.

#### Task 3: Placeholder and Commit Semantics

##### Placeholder

The placeholder is CodeMirror's own `placeholder()` extension (`MarkdownEditor.tsx:4, 178`), drawn as `.cm-placeholder` while the document is empty. Its copy is the module constant `EMPTY_PAGE_TEXT = 'Click to type or press / for actions'` (`:42`), which `emptyPage.test.tsx:11, 31, 37` pins; it isn't a prop, and the extension accepts any string. The "press / for actions" half names the block menu, which a restricted scope doesn't mount. Styling is scoped to `.mdpm-editor .cm-content .cm-placeholder` (tertiary label color, fade-in; `markdown-pm.css:58-66`) and hidden on locked tiles, inert tiles, history, and glances (`:67-69`). `CellEditor` mounts no placeholder.

##### Commit Semantics

- **Page:** `onChange` fires on every doc change that isn't `mirrored` (`MarkdownEditor.tsx:228-232`). `PageView` pushes it to the debounced settle and to `seat.save` (`PageView.tsx:97-100`), which merges against the shared head and calls `scheduleBodySave` (`bodyMount.ts:59-72`) at a 400 ms debounce (`saveScheduler.ts:18, 58`). Nothing is tied to blur.
- **Tile:** The same `seat.save`, plus a flush when editing ends (`MarkdownTile.tsx:45, 62`).
- **Cell:** `onCommit` on every non-silent doc change (`CellEditor.tsx:260-262`) becomes `onCellCommit` into the page document (`MarkdownTable.tsx:454-457`), whose own `onChange` path then saves.

Both editors' blur handlers only close panes (`MarkdownEditor.tsx:217-223`, `CellEditor.tsx:241-245`); neither has a submit or a cancel. A submit-on-close pane differs from both: it reads `view.state.doc` once at dismissal instead of sinking every change, needs its own `history()` since nothing forwards undo, and has to read the doc before the view is destroyed — `PickerMenu` holds children mounted through its exit (`PickerMenu.tsx:115`; Editor-Internals, "A pane held through its exit animation keeps the closed render's handlers"). While the pane is open, a change to the same value from elsewhere has no path in: `CellEditor`'s `initial` sync and the page's `mirrorBody` (`api.ts:44-52`) are the two existing precedents.

#### Task 4: Connections Inside a Pane

`useConnectionAutocomplete(viewRef, host, getConn)` (`useConnectionAutocomplete.ts:38-42`) needs a `ConnectionsApi` (`resolve` and `candidates` from `PageIndex`, plus `open`, and optionally `menu`, `bypass`, `headingsOf`, `location`; `Links/connectionsApi.ts:38-44`) and the host members listed under *§Host Requirements*. The `[[` pane is `CaretPane` → `PickerMenu` with `glass="window"`, `focus="keep"`, and no `onDismiss` (`Menus/caretPane.tsx:49-78`).

- **Presses inside the `[[` pane:** Every `PickerMenu` registers with the dismissal stack while mounted, modal by default (`PickerMenu.tsx:118-123`). The `[[` pane registers above the TextPane, so a pointerdown on its rows finds it first and keeps everything beneath it (`UIX/Interactions/dismissalStack.ts:60-75`). A CaretPane is never itself dismissable (`:38`).
- **Focus:** `focus="keep"` prevents mousedown's focus move (`PickerMenu.tsx:38, 329`), so the editor never blurs and the blur handler's `setAc(null)` doesn't fire.
- **Escape:** `paneKeys` binds Escape at `Prec.highest` while the `[[` pane is open (`caretPane.tsx:139-145`); CodeMirror prevents default on a handled key, and the stack skips a prevented Escape (`dismissalStack.ts:77-87`), so the first Escape closes the `[[` pane and the next reaches the TextPane. `defaultKeymap` binds Escape to `simplifySelection`, which consumes it while a range is selected, so with a selection the first Escape collapses it.
- **Trap Focus:** `useFocusScope`'s tab-stop selector excludes `contenteditable` (`UIX/Interactions/focusScope.ts:3-6`), so a `focus="trap"` TextPane focuses its first button or its root (`:34`) unless the editor has already focused itself, as `CellEditor` does at mount (`CellEditor.tsx:270`).
- **Placement:** `caretGeometry` measures against the editor's nearest scrolling ancestor and skips `scrollDOM` by design (`caretPane.tsx:23-46`); bounds are horizontal only. Both panes portal to `document.body` (`PickerMenu.tsx:310-348`), and the later-mounted `[[` pane sits above.
- **Right-Click Format Menu (unverified):** `editorMenu` parks its request and returns `false` without preventing default (`menu.ts:83-108`); Desktop builds the menu only when Chromium's `context-menu` event arrives after the renderer's handler (`Desktop/Actions/editorMenu.ts:25-31, 125-137`). The `PickerMenu` layer calls `preventDefault()` on every `contextmenu` inside it (`PickerMenu.tsx:31-37, 330`). Under Chromium's rule that a canceled `contextmenu` shows no menu, the Format menu, and the system spelling and edit items with it, would never open inside a TextPane, and the parked request would resolve `null` on the next ask. This follows from Chromium's behavior and hasn't been driven live; no editable MarkdownPM surface sits in a `PickerMenu` today (the glance's tile is locked and read-only, `GlancePane.tsx:281-296`). The list grip's menu is unaffected: it prevents default itself and pops through the `menu` channel (`gripMenu.ts:115-131`; `Desktop/main.ts:293`).

#### Task 5: Line Breaks and Serialization

The cell's live document already holds real newlines: `cellToDisplay` turns `<br>` into `\n` on the way in, and `cellToSource` turns `\n` back into `<br>` (escaping pipes) on the way out (`Engine/Tables/codec.ts:31-35`). Nothing in `inlineSurface`, `Engine/`, or the `'cell'` branches of `edits.ts` assumes one line; list continuation, nesting, renumbering, rails, and drag all walk lines.

The single-line assumptions are table plumbing:

- **Enter:** On a non-list line, Enter leaves the cell (`CellEditor.tsx:192`), and Shift-Enter writes the in-cell break (`:197-203`). On a list line, Enter continues the list or writes `\n` where it can't (`:193`).
- **Sync compare:** `useLayoutEffect` compares `cellToSource(...).trim()` (`:306`), absorbing what GFM can't hold — edge spaces, a trailing empty item (`codec.ts:18-29`).
- **Trim:** GFM trims a cell on both edges (`Features/MarkdownPM.md:57`).

Enter-as-newline in a TextPane conflicts with nothing in the scope or the surface. It conflicts only with an Enter-submits rule, and specifically with Enter continuing a list, which both editors do (`edits.ts:75-83`); `CellEditor` resolves the same contention by giving the break to Shift-Enter and the exit to Enter.

#### Tensions

- **5 — Single vs Multi-Line:** Confirmed, as no conflict on the editor side. `'cell'` and `inlineSurface` are multi-line already; the single-line constraint is the GFM codec (`codec.ts:31-35`) and `CellEditor`'s navigation keys. What remains open is Enter's meaning: newline and list continuation versus submit.
- **7 — Native Menu:** Touched. The editor's Format menu depends on Chromium's `context-menu` event (`Desktop/Actions/editorMenu.ts:25, 126`), and `PickerMenu` cancels `contextmenu` inside its layer (`PickerMenu.tsx:31-37, 330`); this is inferred, not driven live. The scope already narrows the menu to Insert Link, Lists, and Format (`Core/Actions/editorMenu.ts:135-136`), which matches the wish list.
- **6 — Table Glyph:** Can't speak to the property glyph. For a resting Text value, `StaticCell` (`Tables/cellStatic.tsx:264-286, 459`) already renders cell-scope Markdown as spans with no `EditorView`, though `MarkdownTable.tsx:12` is its only non-test importer today.
- **1 — Sort, 2 — Filters, 3 — Cascade, 4 — Validation, 8 — Non-String Adoption, 9 — Foreign Recognition:** Can't speak; outside this slice.

#### Missing

- A `'cell'`-scope key layer outside `CellEditor.tsx`: list keys, Backspace, and Delete are bound inline alongside table navigation (`CellEditor.tsx:169-238`), and `markdownInput` is page-shaped (`markdownInput.ts:177, 195, 258-275`).
- A placeholder in any `'cell'`-scope editor, and a placeholder parameter: the copy is a constant (`MarkdownEditor.tsx:42, 178`).
- Undo history in a `'cell'`-scope editor: `CellEditor` forwards to the page and mounts no `history()` (`CellEditor.tsx:35, 232-236, 246-258`).
- A submit or cancel path in either editor; both sink every change (`MarkdownEditor.tsx:228-232`, `CellEditor.tsx:260-262`).
- A scope-gated code mask: `docScan` is page-shaped and `inCodeAt` readers are ungated, so invisible fences disable autocomplete and typing transforms in `'cell'` scope (`autocomplete.ts:56`; `edits.ts:331-765`; `headingHash.ts:20`).
- Pane-side CSS: list geometry is scoped to `.mdpm-editor` (`markdown-pm.css:357, 437`) and `--glyph-scale` to `.mdpm-shell` (`:15-17`), which `CellEditor` inherits by sitting inside the page editor. `.mdpm-tbl-cell-editor` only resets height, background, outline, scroller, and padding (`markdown-tables.css:151-177`) and seats the list grip (`:193-196`); `.mdpm-editor .cm-content` carries page padding (`markdown-pm.css:55`). `CellEditor` imports no stylesheet; `markdown-pm.css` is imported only by `MarkdownEditor.tsx:39`, and `markdown-tables.css` by `MarkdownTable.tsx:2`.
- An owner-page notion for bare fragments: `[[#Heading]]`, the `[[#` outline, and `§` runs resolve against the editor's own document off a table (`api.ts:32-35`; `decorations.ts:537, 610-620`).
- A path for the editor's Format menu inside a `PickerMenu` (Task 4, unverified).
