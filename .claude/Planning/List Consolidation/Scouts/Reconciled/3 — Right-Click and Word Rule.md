### Scout 3 — Right-Click and Word Rule (Reconciled)

**DATE:** 11-06-2026
**HEAD:** `b7f2f17a5` on `active`
**EVIDENCE:** Unmarked statements were re-read at the cited line. **[Observed]** is a run against the real modules under jsdom in a throwaway worktree, with a hit test mocked where layout is needed. **[Live]** is Scout 5's reading from the running app, which wins wherever the two meet. **[Inferred]** is reasoning no run confirmed. **[Unconfirmed]** is a claim this pass couldn't verify and doesn't carry forward as fact.
**STANDS UNDER:** E-1 keeps the resting menu, so this report's Option 1 is declined and every cost it listed is the design rather than a tax. The one verified removal list lives in *Gestures Reconciliation*, *§Verified Removal List*, which replaces *§Remove First*.

---

#### 1. The Map

##### Right-Click

**3-T1 · Live Page:** The right press reaches `mousedown` handlers first, and only three default it away: a glyph (`Gestures/listDrag.ts:80-84`), a grip or heading band (`Menus/gripMenu.ts:140-144`), and a link with a follow target (`Gestures/pointerPath.ts:49`). CodeMirror starts no mouse selection for a non-primary press, though Chromium lands its own caret on the DOM (5-T1). `contextmenu` then walks its handlers in order: `gripMenu.ts:145-201`, the link and citation pointers (`pointerPath.ts:94-106`), `citationRowMenu` (page only), and `editorMenu` at `Prec.lowest` (`Menus/menu.ts:102-148`). `editorMenu` hit-tests with `posAndSideAtCoords`, and `routeRightClick` (`menu.ts:50-99`) seats the word or point through a bare `view.dispatch` (`:133`), reads `readFormatState` at the click, and asks `host.menus.format`, the `editor:menu` channel (`Core/Pages/editorHost.tsx:106-112`), parked in main until Chromium's `context-menu` event (`Desktop/Actions/editorMenu.ts:30-54`, `:134-147`). The reply runs `applyEditorAction` (`menu.ts:20-34`) over the word, or over the click's point for a `list:` row, once `view.state.doc === opened`.

**3-T2 · Live Cell:** The same path through `editorBase({ scope: 'cell' })` (`Tables/CellEditor.tsx:164`). The page's own editor drops the event, since `TableWidget` inherits `ignoreEvent → true`, and `MarkdownTable.tsx:495` closes any glance in capture. A pick lands through the cell's `updateListener` into `onCommit` (`CellEditor.tsx:254-257`). A right press outside the table leaves the cell live, because the dismissal stack answers `button 0` alone (`UIX/Interactions/dismissalStack.ts:69`).

**3-T3 · Resting Cell:** `onMouseDown` defaults away a right press or Mac Ctrl-click (`Tables/cellStatic.tsx:639`), and `startSweep` ignores it (`MarkdownTable.tsx:160`). `onContextMenu` (`cellStatic.tsx:604-608`) tries the link door (`linkGestures.onContextMenu`, `:668-683`), returns silently when read-only, and otherwise calls `restingMenu` (`:551-588`): `caretPositionFromPoint` and `cellOffsetAt` give `at`, `restingSelection` (`:399-410`) reads the DOM selection back as source offsets, `sideOf` (`:412-424`) answers whether the pointer is on a character, and `wordAt` reads a throwaway `EditorState`. The same `routeRightClick` seats through `showSource` (`:439-443`), which writes the DOM selection, and asks with `resting: { selection }`. Main swaps the role rows for renderer-answered Cut, Copy, and Paste and drops Undo, Redo, and Select All (`Desktop/Actions/editorMenu.ts:77-97`); the reply runs `restingAction` (`cellStatic.tsx:532-549`) through `commitAtRest` (`:472-478`), `onCommit`, and `onSettled` (`MarkdownTable.tsx:422-426`), and a typing slot enters the cell through `onActivate`.

**3-T4 · Page Tile:** `PageTile.tsx:180` and `MarkdownTile.tsx:65` mount `MarkdownEditor` with `readOnly={!editing}`, so a tile nobody entered answers as 3-T5 and an entered one as a live page. A left click enters (`PageTile.tsx:160-168`), and a right-click doesn't. The tile's own handle owns its menu (`Core/Tiles/TileGrid.tsx:243-246`).

**3-T5 · Read-Only View:** `editorMenu` and the grip's block branch return false (`menu.ts:106`, `gripMenu.ts:152`), while the heading band, link, and citation menus still answer with `editable: false`. With nothing parked, main shows the system rows wherever `params.isEditable` holds, and `EditorState.readOnly` leaves `contenteditable="true"`, so a read-only page offers Undo, Redo, Cut, Paste, and Paste Without Formatting beside Copy (`Desktop/Actions/editorMenu.ts:82-97`). A read-only resting cell reports not editable and gets no menu (`:136`). The info pane gets none for two reasons: `editable={false}` (`Core/Info/InfoButton.tsx:87`) reports not editable, and before that its `PickerMenu` layer cancels the event outright (`UIX/Pickers/PickerMenu.tsx:332`, `stopContextBubble`), so Chromium never sends `context-menu`. Nothing refuses Chromium's own word on any of these.

**3-T6 · Text Value:** `Properties/Pickers/ValueEditor.tsx:93` mounts the same surface with `scope: 'text'`; a wrapper stops the event's bubble because that same `PickerMenu` layer would cancel it (`:194-199`). `editorContextItems` gives it Insert Link and Format only (`Core/Actions/editorMenu.ts:168-169`).

##### Word Gestures

**3-T7 · Double-Click:** `wordPress` (`Input/markdownInput.ts:312-318`) marks the view for one microtask, `MouseSelection` reads `atomicRanges` once in its constructor, `basicMouseSelection` finds CodeMirror's group, and `skipAtomsForSelection` stretches it across the joined word. A double-click on a resting cell is a promotion: the first click mounts the editor (`cellStatic.tsx:611-618`) and the second press lands on it. On a read-only resting cell it's Chromium's own word.

**3-T8 · Group Motions, Selections, and Deletions:** `editorKeymap` wraps each command in `byWords` (`markdownInput.ts:338-355`), which holds `grouping` around the call so `joinedWords` (`:319-328`) answers. A deletion over a selection skips the atoms, since `deleteBy` runs `skipAtomic` on a range's ends.

**3-T9 · A Right-Click's Word:** `wordAt` directly, on a live surface at `menu.ts:118` and at rest at `cellStatic.tsx:574`, with no atoms involved.

**3-T10 · The Rule as It Reads [Observed]:** `don't`, `rock'n'roll`, `90's`, `don’t`, and `日本語'テスト` read whole; `'quoted'` reads `quoted`; `dogs'` reads `dogs`; `_it_` reads `_it_` with its markers; `snake_case` and `a'_b` read whole. Decomposed and astral text falls out: `don`+U+0301+`'t` stops at the apostrophe and `𝒶'b` reads `𝒶`, because `joins` tests one UTF-16 unit on each side.

---

#### 2. Where the Surfaces Differ

**What the Resting Constraint Forces:** With no `EditorView`, a resting cell has to map a DOM point to source (`cellOffsetAt`), hold its selection outside `EditorState`, answer Cut, Copy, and Paste itself, and settle the table after a write. These stay under E-1.

**3-T11 · Selection Owner:** `EditorState` on a live surface, the DOM selection re-read through `restingSelection` at rest. Stays.

**3-T12 · The Seat's Purpose at Rest:** Cut and Copy read the pick's `from, to` (`cellStatic.tsx:535-538`), Speech and Share read `resting.selection` (`Desktop/Actions/editorMenu.ts:138`), and the DOM selection `showSource` writes feeds only the paint and the next click's `restingSelection`. On the default setting that paint shows nothing (5-T38, 5-T47). `pointAt` skips any node whose drawn length differs from its source, so the paint is a clamp of the range.

**3-T13 · Staleness:** The page compares `Text` identity (`menu.ts:140`), a resting cell compares text (`cellStatic.tsx:473`), the grip the block's slice (`gripMenu.ts:164`), the heading its line (`:109`), the table its source (`Tables/widget.tsx:292-297`), and a link re-finds its token (`Links/linkEdit.ts:80-81`). Each re-finds a different target, so five of them stand. Only the page's carries a defect (3-T14).

**3-T14 · A Settle Drops the Pick [Observed]:** `[[Page|x]] tail word` with `x` deleted, right-clicked on `word`, Bold picked: the document stayed `[[Page]] tail word`, while the control wrote `[[Page|x]] tail **word**`. The cause is `linkSettle`'s collapse, which runs on `setTimeout(0)` (`Links/linkSettle.ts:167`) after the seat moved the caret off the link, so `doc === opened` fails however late `opened` is read in the handler. Acting on the live selection, which CodeMirror maps through the collapse, wrote `[[Page]] tail **word**` **[Observed]**.

**3-T15 · The Seat's Filter:** A left press goes through `caretSeat`'s `select.pointer` branch (`decorations.ts:788-790`), and a right-click's seat dispatches with no user event, so `seatPastMarker` never runs, and rows then act on the pre-filter `start, end`. **[Observed]** At a numbered marker's end Bold writes `1.**** one`, and at a quote's prefix `>**** quote`; the second also shows the rows ignoring the seat, which the filter had already moved past the prefix. Seating with `select.pointer` and acting on what's seated wrote `1. ****one` and `> ****quote`. This reaches `1.`, `A.`, `→`, `+`, and `>`, the markers drawn as text. A bullet's and a box's marker is one atomic range on a page (`[0,2]`, `[0,6]`), so the `-**** item` and `- [ ]**** task` this report first recorded came from a mock landing inside it, which a pointer can't **[Observed: the intents]**. One case stays open: on a page `seatPastMarker` answers null for a bullet or box at its line's start, so a press left of the glyph could write `****- item` **[Inferred]**. A resting cell can't reach any of this, since its glyph span covers the gap, and a live cell's filter has the replaced-marker arm (`Engine/intents.ts:625`).

**3-T16 · Mac Ctrl-Click on a Grip:** `gripMenu.ts:141` reads `button === 2` alone and `blockDrag.ts:100-113` starts its gesture on a `button 0` press with no `isSecondaryClick` check. An armed gesture cancels itself on its first buttonless move (`UIX/Interactions/gesture.ts:138-141`), so a menu swallowing the release leaves nothing behind. No defect, and no guard is due.

**3-T17 · Right Press at Rest:** `cellStatic.tsx:639` is the sole text surface that defaults the press. The recorded reason is gone, and a real one stands: it keeps focus where it was and keeps the Press Seat out of the cell (5-T46).

**3-T18 · Word Reader's Input:** A throwaway `EditorState.create({ doc: text })` per click at rest (`cellStatic.tsx:574`), because `wordAt` takes a state. Harmless at this frequency. It's the second home the word rule has to reach (*§The Word Rule*).

**3-T19 · Row Set:** Undo, Redo, and Select All stay off a resting cell by E-1, and every read-only surface takes Copy and Select All by E-4.

**3-T21 · `wordAt`'s Doc** (`markdownInput.ts:300`): "A right-click's word on every surface is it" fails on every read-only surface, where Chromium's word stands, until E-4 routes them. "A letter or digit on both sides" also admits `_` **[Observed]**, which E-5 doesn't.

**3-T22 · "One Unicode Letter Test":** The word reads CodeMirror's categorizer and only the apostrophe reads `isWordChar`. The two differ on 884 BMP characters; it leaves with `joins`.

**3-T23 · The Closing Neutral Gate's Fold** (`89dba6b41`): `format` is absent only on `inert` hosts (`editorHost.tsx:106`), which are `PageReaderWindow` (`:90`) and `InfoButton` (`:85`), both read-only, so `menu.ts:106` returns before it matters. The `if (!ask)` line runs only for the harness, whose `format` is absent (`Core/Testing/editorHarness.ts:124-130`).

---

#### 3. Questions Answered More Than Once

**3-T24 · Is the Pointer on Text, and Which Side?** `menu.ts:112-118` and `cellStatic.tsx:412-424`. One works from a view, the other from a DOM caret, so both stay.

**3-T25 · What Is a Word Character?** CodeMirror's categorizer and `isWordChar` in `joins`. E-6 leaves one.

**3-T26 · Is the Reply Still Valid?** See 3-T13.

**3-T27 · Is This a Secondary Press?** `listDrag.ts:81,86`, `gripMenu.ts:141`, `pointerPath.ts:49-50`, `blockDrag.ts:101,106`, `cellStatic.tsx:612,639`, and `MarkdownTable.tsx:160`, in three spellings. No behavior rides on the difference (3-T16).

**3-T28 · May This Surface Edit?** `view.state.readOnly` (`menu.ts:106`, `gripMenu.ts:152`), `readOnly()` (`cellStatic.tsx:515,605,616,622`), `host.menus.format` being absent (`menu.ts:73`), the `changeFilter` (`MarkdownEditor.tsx:140`), and main's `params.isEditable` (`Desktop/Actions/editorMenu.ts:136`). E-4 takes three of these: `menu.ts:106`, `:73`, and `cellStatic.tsx:605` stop deciding whether a menu exists.

**3-T29 · Does a Right-Click Close the Glance?** `MarkdownTable.tsx:495-497`, `linkGestures.dismiss` (`cellStatic.tsx:661-663`), and `pointerPath.ts:103`, on a link hit only. `dismiss` also serves `TextCell`, so it stays.

**3-T30 · Which Range Does a Pick Act On?** D-5 answers this: one.

**3-T31 · Who Calls `editFor`?** `applyEditorAction` (`menu.ts:32`), `gripMenu.ts:183`, and `restingAction` (`cellStatic.tsx:543`). All three stay.

**3-T32 · Can a Citation or an Embed Go Here?** At the click through `citationSeatAt(view.state, to)` and `embedSeatAt(view.state, from)` (`menu.ts:135-136`), and again at the act over the seated selection. **[Observed]** On `` `abc` `` the click says false and the seated `to` says true, and the act then writes `` `abc[^1]` ``, a marker inside the code. A selection standing on those three letters reaches that today; the right-click's seat doesn't, only because the row reads the click. `inCodeAt`'s end is exclusive, so a range's `to` reads the character after it.

**3-T33 · What's the List Kind Under a Glyph?** `readFormatState` builds every flag for `.list` alone (`menu.ts:83-86`), where `gripMenu.ts:86` calls `listKindOf` directly. Small and harmless, since the route reads the flags for every other case.

**3-T34 · Is the Click Inside the Selection?** `clickInside` is one rule for both surfaces. Chromium doesn't reseat at a selection's edges (5-T10, 5-T11), so the edge worry this report raised is gone and the rule stands.

**3-T35 · Where Does a Press Seat the Caret?** CodeMirror's mouse path with `caretSeat`, `surface.seat` (3-T15), `seatPastMarkerNow` (`CellEditor.tsx:70-80`), and `listDrag.ts:71`.

---

#### 4. Caution Code

Verdicts for all of these sit in *Gestures Reconciliation*, *§Verified Removal List*. What each one is:

**3-T36 · `at === null`** (`menu.ts:56,75,111,127`): `posAndSideAtCoords` returns null only under `precise` for a block outside the viewport (`@codemirror/view` `index.js:3795-3797`), and `posAndSideAtCoords(event, false)` returns non-null, as CodeMirror's own mouse path passes it (`:4981`). **Unreached.**

**3-T37 · `if (!ask) return` and the `click` Thunk** (`menu.ts:72-74`, `:55`): reachable only from the harness (3-T23).

**3-T38 · `view.dom.isConnected`** (`menu.ts:140`, `pasteLink.ts:129`): the state is reachable and the guard buys nothing. `update` on a destroyed view only assigns the state (`index.js:7910-7913`), and `applyEditorAction` on one threw nothing, its `**abc**` living in dead state **[Observed]**.

**3-T39 · The Synthetic `selectionchange`** (`menu.ts:43`): its state needs a table mutation before Chromium's own `selectionchange` lands. Blocking it changed nothing across 20 live runs (5-T45). Its pin fires `pointerover` in the same tick (`editorMenu.test.tsx:254-257`), which a real pointer doesn't.

**3-T40 · The `selectstart` Refusal and Its `setTimeout`** (`menu.ts:44-46`): reachable and earned (5-T7, 5-T8, 5-T44).

**3-T41 · `atClick` and a Stale `pending`** (`Desktop/Actions/editorMenu.ts:38-54`): the state is an ask with no `context-menu` behind it, reached only by injection (5-T48). The one ancestor that cancels a right-click is `PickerMenu`, stopped first by `ValueEditor.tsx:194-199`, and a glyph never asks. `c008797c7` introduced the match with no named cause.

**3-T42 · `posAt`'s `try`/`catch`** (`CellEditor.tsx:263-270`): `readMeasured` throws only during this view's own update (`index.js:8260-8262`), and this runs after construction, outside any update. **Unreached.**

**3-T43 · `e.stopPropagation()` at Rest:** `cellStatic.tsx:606` protects nothing, since the page editor drops the event and no ancestor of a page body holds a bubbling handler. `:678` is a different case: it sits in `linkGestures`, shared with `TextCell`, under `TableView.tsx:474`, `CardsView.tsx:610`, and `PropertyPanel.tsx:250`, whose row menus would otherwise open beside the link's. That one earns its line.

**3-T44 · `!!edge`** (`menu.ts:114`): `coordsAtPos` answers null for an unrendered position. This pass couldn't show a hit can never be one, since a mark can draw nothing. **[Unconfirmed]**

---

#### 5. What's Carried for One Caller

**3-T45 · `applyEditorAction`'s `scope` and Range** (`menu.ts:23-24`): only `menu.ts:141` passes them. After D-5 the range serves a glyph's point alone, since text rows act on what's seated. `scope` serves `list:` alone, and B-11 decides whether it stays.

**3-T46 · `surface.request`'s Four Arguments** (`menu.ts:63-68`): leave with D-5.

**3-T47 · `embedSeatAt`'s and `citationSeatAt`'s `at`** (`embedInsert.ts:34`, `citationActions.ts:36`): `menu.ts:135-136` is the only caller passing one. Leave with D-5.

**3-T48 · `at: number | null`:** one producer of null (3-T36).

**3-T49 · `click: () => …`:** the outer thunk serves the fixture (3-T37).

**3-T50 · `menus.format?`:** optional for two read-only hosts and a harness. E-4 gives those hosts an ask.

**3-T51 · `resting: { selection }`:** a one-field object whose presence doubles as "this surface isn't editable" in main (`Desktop/Actions/editorMenu.ts:77-81,97,136`). E-4 needs that answer stated rather than implied.

**3-T52 · `x`, `y` on the Request:** read by `atClick` alone.

**3-T53 to 3-T55:** `cellOffsetAt`'s `side`, `data-at`, `data-base`, `onFill`, and `linkGestures`' `held` and `authoring` each have one consumer and a job E-1 keeps.

---

#### 6. The Word Rule

The atoms and wrappers cost 41 lines (`markdownInput.ts:310-350`), and E-6 replaces them. What the prototype actually does, gesture by gesture, is in *Gestures Reconciliation*, *§The Word Rule*: it passes every word test and departs in more shapes than `'don't'`.

**Keep as Correct Separation:** `clickInside` as one rule; `wordAt` as the one reader; `editorMenu` at `Prec.lowest` beneath claimed presses; main parking the ask until `context-menu`, since only main can see `params`; `linkGestures` shared with `TextCell`; `commitAtRest`; `editFor` as the pure action table.

---

#### 7. Insights

**3-T57 · The Pin Exercises None of the Menu:** `cellStatic.test.tsx:113` ("a right-click leaves the cell resting") returns at `if (!ask)` because its harness has no `format`, so it pins the ruling while running nothing the ruling describes. Making `format` required fixes that.

**3-T60 · A Live Cell Survives a Right-Click Elsewhere:** With `dismissalStack.ts:69` answering only a primary press, a right-click on page text moves focus and leaves the cell mounted until the next left press. **[Inferred]** No decision names it, and nothing writes wrongly because of it.

**Retired Findings:** 3-T20 (E-4 answers the unentered tile), 3-T56 (Scout 5 ran that drive), 3-T58 (`joinedWords` leaves with E-6), 3-T59 (5-T39 to 5-T42 settle the four models), 3-T61 (E-1), and 3-T62 (D-5).
