### Scout 3 — Right-Click and Word Rule

**DATE:** 11-05-2026
**HEAD:** `b7f2f17a5` on `active`
**EVIDENCE:** Unmarked statements are read directly from the tree at the cited line. **[Observed]** is output from a probe run against the real modules under jsdom, with the hit test mocked where a layout is needed. **[Inferred]** is reasoning that no run confirmed. The app wasn't launched, so anything about Chromium's own timing is a recorded claim or an inference.

---

#### 1. The Map

##### Right-Click

**3-T1 · Live Page:** The right press reaches `mousedown` handlers first, and only three default it away: a glyph (`Gestures/listDrag.ts:80-84`), a grip or heading band (`Menus/gripMenu.ts:140-144`), and a link with a follow target (`Gestures/pointerPath.ts:49`); CodeMirror itself runs no selection for a non-primary press. `contextmenu` then walks its handlers in order: `gripMenu.ts:145-201`, the link and citation pointers (`pointerPath.ts:94-106`), `citationRowMenu` (`Citations/citationPointer.ts:113`, page only), and `editorMenu` at `Prec.lowest` (`Menus/menu.ts:102-148`). `editorMenu` hit-tests with `posAndSideAtCoords`, and `routeRightClick` (`menu.ts:50-99`) seats the word or point through a bare `view.dispatch` (`:133`), reads `readFormatState` at the click, and asks `host.menus.format`, the `editor:menu` channel (`Core/Pages/editorHost.tsx:106-110`), parked in main until Chromium's `context-menu` event (`Desktop/Actions/editorMenu.ts:30-54`, `:134-147`). The reply runs `applyEditorAction` (`menu.ts:20-34`) over the word, or over the click's point for a `list:` row, once `view.state.doc === opened`.

**3-T2 · Live Cell:** The same path through `editorBase({ scope: 'cell' })` (`Tables/CellEditor.tsx:164`). The page's own editor drops the event at `eventBelongsToEditor`, since `TableWidget` inherits `ignoreEvent → true`, and `MarkdownTable.tsx:495` closes any glance in capture. A pick lands through the cell's `updateListener` into `onCommit` (`CellEditor.tsx:254-257`). A right press outside the table leaves the cell live, because the dismissal stack answers `button 0` alone (`UIX/Interactions/dismissalStack.ts:69`).

**3-T3 · Resting Cell:** `onMouseDown` defaults away a right press or Mac Ctrl-click (`Tables/cellStatic.tsx:639`), and `startSweep` ignores it (`MarkdownTable.tsx:160`). `onContextMenu` (`cellStatic.tsx:604-608`) tries the link door (`linkGestures.onContextMenu`, `:668-683`), returns silently when read-only, and otherwise calls `restingMenu` (`:551-588`): `caretPositionFromPoint` and `cellOffsetAt` give `at`, `restingSelection` (`:399-410`) reads the DOM selection back as source offsets, `sideOf` (`:412-424`) answers whether the pointer is on a character, and `wordAt` reads a throwaway `EditorState`. The same `routeRightClick` seats through `showSource` (`:439-443`), which writes the DOM selection, and asks with `resting: { selection }`. Main swaps the role rows for renderer-answered Cut, Copy, and Paste and drops Undo, Redo, and Select All (`Desktop/Actions/editorMenu.ts:77-97`); the reply runs `restingAction` (`cellStatic.tsx:532-549`) through `commitAtRest` (`:472-478`), `onCommit`, and `onSettled` (`MarkdownTable.tsx:422-426`), and a typing slot enters the cell through `onActivate`.

**3-T4 · Page Tile:** `PageTile.tsx:180` and `MarkdownTile.tsx:65` mount `MarkdownEditor` with `readOnly={!editing}`, so a tile nobody entered answers as 3-T5 and an entered one as a live page. A left click enters (`PageTile.tsx:160-168`), and a right-click doesn't. The host editor drops presses inside its tile by `ignoreEvent`, and the tile's own handle owns its menu (`Core/Tiles/TileGrid.tsx:243-246`).

**3-T5 · Read-Only View:** `editorMenu` and the grip's block branch return false (`menu.ts:106`, `gripMenu.ts:152`), while the heading band, link, and citation menus still answer with `editable: false`. With nothing parked, main shows the system rows wherever `params.isEditable` holds, and `EditorState.readOnly` leaves `contenteditable="true"` and `spellcheck="true"` **[Observed]**, so a read-only page offers Undo, Redo, Cut, Paste, and Paste Without Formatting beside Copy (`Desktop/Actions/editorMenu.ts:82-97`). `editable={false}` (`Core/Info/InfoButton.tsx:87`) and a read-only resting cell report not editable, so they get no menu at all, Copy included (`:136`). Nothing refuses Chromium's own word on any of these.

**3-T6 · Text Value:** `Properties/Pickers/ValueEditor.tsx:93` mounts the same surface with `scope: 'text'`; a wrapper stops the event's bubble because the layer above cancels every right-click (`:194-199`). `editorContextItems` gives it Insert Link and Format only (`Core/Actions/editorMenu.ts:168-169`).

##### Word Gestures

**3-T7 · Double-Click:** `wordPress` (`Input/markdownInput.ts:312-318`) marks the view for one microtask, `MouseSelection` reads `atomicRanges` once in its constructor (`@codemirror/view` `index.js:4709`), `basicMouseSelection` finds CodeMirror's group, and `skipAtomsForSelection` stretches it across the joined word. A double-click on a resting cell is a promotion: the first click mounts the editor (`cellStatic.tsx:611-618`) and the second press lands on it. On a read-only resting cell it's Chromium's own word.

**3-T8 · Group Motions, Selections, and Deletions:** `editorKeymap` wraps each command in `byWords` (`markdownInput.ts:338-355`), which holds `grouping` around the call so `joinedWords` (`:319-328`) answers. All seven group bindings in `defaultKeymap` are covered: `Alt-ArrowLeft` and `Alt-ArrowRight` with their shifted forms, `Alt-Backspace`, `Alt-Delete`, and `Ctrl-Alt-h` **[Observed]**. A deletion over a selection skips the atoms (`:341-342`), since `deleteBy` runs `skipAtomic` on a range's ends.

**3-T9 · A Right-Click's Word:** `wordAt` directly, on a live surface at `menu.ts:118` and at rest at `cellStatic.tsx:574`, with no atoms involved.

**3-T10 · The Rule as It Reads [Observed]:** `don't`, `rock'n'roll`, `90's`, `don’t`, and `日本語'テスト` read whole; `'quoted'` reads `quoted`; `dogs'` reads `dogs`; `_it_` reads `_it_` with its markers; `snake_case` and `a'_b` read whole. Decomposed and astral text falls out: `e`+U+0301+`'s` reads the accented letter alone, `don`+U+0301+`'t` stops at the apostrophe, and `𝒶'b` reads `𝒶`, because `joins` tests one UTF-16 unit on each side.

---

#### 2. Where the Surfaces Differ

**What the Resting Constraint Forces:** With no `EditorView`, a resting cell has to map a DOM point to source (`cellOffsetAt`), hold its selection outside `EditorState`, answer Cut, Copy, and Paste itself, since a native role acts on whatever has focus and `params.selectionText` holds drawn text, and settle the table after a write. **What It Doesn't Force:** a second staleness rule, a second word-state construction, the `stopPropagation`, the synthetic `selectionchange`, or any of the two-range plumbing. The constraint also holds only while the cell stays resting through the press, which is a product choice (*§Approaches*).

**3-T11 · Selection Owner:** `EditorState` on a live surface, the DOM selection re-read through `restingSelection` at rest. **Reason:** no editor. **Holds:** yes, while the menu stays at rest.

**3-T12 · The Seat's Purpose at Rest:** The recorded reason is that "the highlight, Cut and Copy, Speech, and Share read one range." **Holds in outcome only:** Cut and Copy read the pick's `from, to` (`cellStatic.tsx:535-538`), Speech and Share read `resting.selection` (`Desktop/Actions/editorMenu.ts:138`), and the DOM selection `showSource` writes feeds the paint and the next click's `restingSelection`. `showSource` and `pointAt` (17 lines) exist so the highlight can paint, and `pointAt` skips any node whose drawn length differs from its source, so the paint is a clamp of the range.

**3-T13 · Staleness:** The page compares `Text` identity (`menu.ts:140`), a resting cell compares text (`cellStatic.tsx:473`), the grip compares the block's slice (`gripMenu.ts:164`), the heading its line (`:109`), the table its source (`Tables/widget.tsx:292-297`), and a link re-finds its token (`Links/linkEdit.ts:80-81`). **Reason given:** none for the difference. **Holds:** no, and identity carries a defect (3-T14).

**3-T14 · A Settle Drops the Pick [Observed]:** The page's `opened` is captured before its own seat, so a seat that moves the caret off a link whose alias was emptied lets `linkSettle`'s deferred collapse (`Links/linkSettle.ts:153-167`) change the document, and the reply dies at `doc === opened`. `[[Page|x]] tail word` with `x` deleted, right-clicked on `word`, Bold picked: the document stayed `[[Page]] tail word`, while the control without the emptied alias wrote `[[Page|x]] tail **word**`. The pick fails silently.

**3-T15 · The Seat's Filter:** A left press goes through `caretSeat`'s `select.pointer` branch (`decorations.ts:788-790`), and a right-click's seat dispatches with no user event, so `seatPastMarker` never runs. **Reason given:** none. **[Observed]** A plain dispatch at a numbered marker's `1.` stays at 25 and at its end at 27, where `select.pointer` seats 28. Rows then act on the pre-filter `start, end` regardless: with a mocked hit on the marker's edge, Bold wrote `1.**** one`, `- [ ]**** task`, and `>**** quote`. **[Inferred]** The pointer reaches that position, since `seatPastMarker`'s own doc says a pointer lands there one seat short, and a resting cell can't, since its glyph span covers the gap (`cellStatic.tsx:256`).

**3-T16 · Mac Ctrl-Click on a Grip:** `gripMenu.ts:141` reads `button === 2` alone, and `blockDrag.ts:100-113` starts its gesture on a `button 0` press with no `isSecondaryClick` check, where `listDrag.ts:86` and `cellStatic.tsx:612,639` both ask. **Recorded reason:** "no evidenced defect" (Wave One's Not Taken). **[Inferred]** A Ctrl-click on a grip arms a drag beside its menu; this wasn't run.

**3-T17 · Right Press at Rest:** `cellStatic.tsx:639` is the sole text surface that defaults the press. **Recorded reason:** "claiming every right press is what stops the browser seating the word" (Links plan, Task 9-1), which the Right-Click Rule deviation says a probe disproved. **Holds:** the reason is gone and the line stayed with no comment. **[Inferred]** It still keeps focus where it was, which is what ruling 5.6 asks.

**3-T18 · Word Reader's Input:** A throwaway `EditorState.create({ doc: text })` per click at rest (`cellStatic.tsx:574`), because `wordAt` takes a state. Harmless at this frequency, and a live cell carries no language either, so the two answers agree **[Inferred]**.

**3-T19 · Row Set:** Undo, Redo, and Select All stay out at rest by ruling 5.6, though the table's `onUndo` and `onRedo` could answer the first two. A read-only page shows edit rows that can't edit while a read-only resting cell shows nothing, including Copy. **Reason given:** none for the read-only pair.

**3-T20 · Two Surfaces Not Yet Entered:** A resting cell answers a right-click with the full menu without entering; an unentered tile, equally a surface nobody has clicked into, gives system rows and no Format or Lists. Neither has a recorded reason against the other.

**Recorded Claims That Don't Hold:**

- **3-T21 · `wordAt`'s Doc** (`markdownInput.ts:300`): "A right-click's word on every surface is it" fails on every read-only surface and an unentered tile, where Chromium's word stands. "A letter or digit on both sides" also admits `_` **[Observed]**.
- **3-T22 · "One Unicode Letter Test"** (Right-Click Rule deviation): the word itself reads CodeMirror's categorizer and only the apostrophe reads `isWordChar`. 884 BMP characters are word characters to CodeMirror and not to `isWordChar`, the first being U+0345, and none the other way, so `wordAt`'s `!` can't throw **[Observed]**.
- **3-T23 · The Closing Neutral Gate's Fold** (`89dba6b41`): "where a host has no format menu" describes the test harness. `format` is absent only on `inert` hosts (`editorHost.tsx:106`), which are `PageReaderWindow` and `InfoButton`, both read-only, so `readOnly()` returns at `cellStatic.tsx:605` and `menu.ts:106` returns before it matters. The throw was jsdom lacking `caretPositionFromPoint` in `cellStatic.test.tsx:113`, whose harness omits `format` (`Core/Testing/editorHarness.ts:124-130`). Ruling 5.6's "a glance" as an inert host also no longer matches the tree.

---

#### 3. Questions Answered More Than Once

**3-T24 · Is the Pointer on Text, and Which Side?** `menu.ts:112-118` (`coordsAtPos` against the pointer) and `cellStatic.tsx:412-424` (`sideOf`).

**3-T25 · What Is a Word Character?** CodeMirror's categorizer in `state.wordAt` and `isWordChar` in `joins` (`markdownInput.ts:295-298`); see 3-T22.

**3-T26 · Is the Reply Still Valid?** Six rules at six sites (3-T13), plus `pasteLink.ts:128`.

**3-T27 · Is This a Secondary Press?** `listDrag.ts:81,86`, `gripMenu.ts:141`, `pointerPath.ts:49-50`, `blockDrag.ts:101,106`, `cellStatic.tsx:612,639`, and `MarkdownTable.tsx:160`, with three spellings between them.

**3-T28 · May This Surface Edit?** `view.state.readOnly` (`menu.ts:106`, `gripMenu.ts:152`), `readOnly()` (`cellStatic.tsx:515,605,616,622`), `host.menus.format` being absent (`menu.ts:73`), the `changeFilter` (`MarkdownEditor.tsx:140`), and main's `params.isEditable` (`Desktop/Actions/editorMenu.ts:136`).

**3-T29 · Does a Right-Click Close the Glance?** `MarkdownTable.tsx:495-497`, `linkGestures.dismiss` (`cellStatic.tsx:661-663`, the same condition, which a table has already run in capture), and `pointerPath.ts:103`, on a link hit only. Page text leaves an open glance standing and a table closes it.

**3-T30 · Which Range Does a Pick Act On?** `menu.ts:96-97` splits list rows from the rest; `applyEditorAction` then uses the range for `editFor` and ignores it for `block:*` and paste, which read the seated selection (`menu.ts:28-31`); `restingAction` honors it for everything.

**3-T31 · Who Calls `editFor`?** `applyEditorAction` (`menu.ts:32`), `gripMenu.ts:183`, and `restingAction` (`cellStatic.tsx:543`), the second without the focus the first gives.

**3-T32 · Can a Citation or an Embed Go Here?** At the click through `citationSeatAt(view.state, to)` and `embedSeatAt(view.state, from)` (`menu.ts:135-136`), and again at the act over the seated selection (`citationActions.ts:80`, `embedInsert.ts:41-44`). `from, to` are the click's point while the seat holds the word, so the two can disagree: on `` `abc` `` the click says false and the seated `to` says true **[Observed]**, because a span's end is exclusive.

**3-T33 · What's the List Kind Under a Glyph?** `readFormatState` builds every flag for `.list` alone (`menu.ts:83-86`), where `gripMenu.ts:86` calls `listKindOf` directly.

**3-T34 · Is the Click Inside the Selection?** `clickInside` is one rule for both surfaces, and Chromium applies its own to decide whether to reseat. They differ at the edges: `at === to` and `at === from` route as inside with the pointer on the neighboring character or on blank space past the line **[Observed]**. Refusal runs only on the `!inside` branch (`menu.ts:79-82`), so **[Inferred]** Chromium can reseat in exactly the cases our rule calls inside, leaving rows acting on a range the highlight no longer shows.

**3-T35 · Where Does a Press Seat the Caret?** CodeMirror's mouse path with `caretSeat`, `surface.seat` (3-T15), `seatPastMarkerNow` (`CellEditor.tsx:70-80`), and `listDrag.ts:71`.

---

#### 4. Caution Code

Guards whose cause I found are left out: the staleness compares, the glyph's `preventDefault`, the group deletion's bypass, `wordPress`'s microtask, and `cell.contains(found.offsetNode)`.

**3-T36 · `at === null`** (`menu.ts:56,75,111,127`): `posAndSideAtCoords` returns null only for a block outside the viewport under `precise`, and a pointer on rendered content sits inside it after `readMeasured`. **Unreached.** `posAndSideAtCoords(event, false)` returns non-null by type (`index.d.ts:1032-1038`), which is what CodeMirror's own mouse path passes (`index.js:4981`).

**3-T37 · `if (!ask) return` and the `click` Thunk** (`menu.ts:72-74`, `:55`): reachable only from the harness (3-T23). No production path stops here, so the thunk is production code serving a test fixture.

**3-T38 · `view.dom.isConnected`** (`menu.ts:140`, `pasteLink.ts:128`): the state is reachable, since a landing can remount a table under an open menu, and the guard buys nothing there. `update` on a destroyed view only assigns the state (`index.js:7910-7913`); `applyEditorAction` on a destroyed view threw nothing and drew nothing, and the `**abc**` it reached lived in dead state **[Observed]**.

**3-T39 · The Synthetic `selectionchange`** (`menu.ts:43`): the mechanism holds against CodeMirror 6.43.1, where a flush reads a local selection as new (`index.js:7385-7395`) while `onSelectionChange` honors `ignoreEvent` (`:7183-7195`). The state needs a table mutation before Chromium's own `selectionchange` task. **Not reached:** I found no writer in the contextmenu task, and the pin fires `pointerover` in the same tick (`editorMenu.test.tsx:254-257`), which a real pointer doesn't. **[Inferred]** A hover render already queued is the only path I could construct. With the page unfocused the page caret held at 3 through a same-tick and a later redraw **[Observed]**. It runs on every surface, and only a resting cell can need it.

**3-T40 · The `selectstart` Refusal and Its `setTimeout`** (`menu.ts:44-46`): the state is Chromium's reseat, known from a recorded probe and unverifiable in this pass. It conflicts with the other recorded models (3-T59).

**3-T41 · `atClick` and a Stale `pending`** (`Desktop/Actions/editorMenu.ts:38-54`): the state is an ask with no `context-menu` behind it. **Not reached:** the one ancestor that cancels a right-click is stopped first (`ValueEditor.tsx:194-199`), and a glyph never asks. The slack and `x`, `y` exist for this alone, and `c008797c7` introduced the match with no named cause. **[Inferred]** Its value is an IPC ordering race the comment rules out.

**3-T42 · `posAt`'s `try`/`catch`** (`CellEditor.tsx:263-270`): "can throw before the view has measured." The only throw is `readMeasured` during this view's own update (`index.js:8260-8262`), and this runs after construction. Neither `posAtCoords` nor `posAndSideAtCoords` threw on a fresh view **[Observed]**. **Unreached.**

**3-T43 · `e.stopPropagation()` at Rest** (`cellStatic.tsx:606`, `:678`): I found no bubbling listener it protects. The window listeners are capture (`glanceAction.ts:96`, `hoverReveal.ts:155`), the page editor drops the event, and none of the `onContextMenu` sites a repo-wide search lists wraps a `MarkdownEditor` body. **Unreached**, and it's why `MarkdownTable.tsx:494-495` had to become a capture handler.

**3-T44 · `!!edge`** (`menu.ts:114`): `coordsAtPos` returns null only for an unrendered position, and `hit` came from a rendered one. Type-driven; **unreached**.

---

#### 5. What's Carried for One Caller

**3-T45 · `applyEditorAction`'s `scope` and Range** (`menu.ts:23-24`): only `menu.ts:141` passes them. `formatKeymap.ts:17` and `useBlockMenu.ts:50` default both, a live cell's chord defaulting to `'page'` harmlessly since `toggleInline` reads no scope. `scope` matters for `list:` alone, and so does the range, since `start, end` equal the seated selection on every other row by construction.

**3-T46 · `surface.request`'s Four Arguments** (`menu.ts:63-68`): the page reads the first two, the cell the last two.

**3-T47 · `embedSeatAt`'s and `citationSeatAt`'s `at`** (`embedInsert.ts:34`, `citationActions.ts:36`): `menu.ts:135-136` is the only caller that passes one.

**3-T48 · `at: number | null`:** one producer of null (3-T36).

**3-T49 · `click: () => …` and `word: () => …`:** the outer thunk serves the fixture (3-T37), and the page computes `hit` eagerly before either.

**3-T50 · `menus.format?`:** optional for two read-only hosts and a harness that omits it.

**3-T51 · `resting: { selection }`:** a one-field object whose presence doubles as "this surface isn't editable" in main (`Desktop/Actions/editorMenu.ts:77-81,97,136`).

**3-T52 · `x`, `y` on the Request:** read by `atClick` alone (3-T41).

**3-T53 · `cellOffsetAt`'s `side`:** exists for `restingSelection` alone, and `data-at` and `data-base` exist for `cellOffsetAt` alone, which has no caller outside the resting menu.

**3-T54 · `StaticCell`'s `onFill`:** one consumer, `pasteAtRest`.

**3-T55 · `linkGestures`' `held` and `authoring`:** one caller each, `TextCell` and `StaticCell`. Sharing the rest is still correct.

---

#### 6. Approaches

**The Lead Question:** Whether a right-click on a resting cell should enter it. Everything else on this surface is small next to that, and it isn't a code question: ruling 5.6 of the Links work says "the right-click itself never focuses the cell," so it needs Nathan's call.

**How It Got Here:** Before `f6df420ba`, a non-link right-click called `onActivate` at `contextmenu` (R-02), which mounted an editor after the event had passed, so no menu appeared. That failure is what the ruling answered. Mounting at the press was never tried: the event order was "timing-dependent and unprobed" in R-02 and stayed that way. The resting menu arrived at about +189 lines; since then the four files around it grew by a net 354 (`f6df420ba~1` to the head, list work included), and most of this report's differences are its parity tax.

**Option 1 — Enter on the Right Press:** `onMouseDown` for a right press on anything but a link calls `onActivate({ kind: 'point', x, y })`, and the `contextmenu` that follows lands on a live editor, which already does all of this correctly.

- **Removes:** `restingMenu`, `restingAction`, `pasteAtRest`, `sideOf`, `pointAt`, and `showSource` (93 lines); `routeRightClick`'s `surface` and thunks, folding it into `editorMenu` with one caller; `RESTING_EDITS`, `restingEditItems`, the `resting` field, `pasteModeOf`'s branch, and main's resting arms; the synthetic `selectionchange`; `onFill` on `StaticCell`. If a drag inside a resting cell also enters on release, `restingSelection`, `cellOffsetAt`, `isFiller`, and the `data-at` and `data-base` attributes go too, making 162 lines in `cellStatic.tsx`. **[Inferred]** About −200 production lines in total, and `cellRestingMenu.test.tsx` and `cellOffsets.test.tsx` (646 lines) leave.
- **Changes:** A right-click focuses the cell and leaves it live, a table rectangle clears, the add strips hide, and the menu gains Undo, Redo, and Select All. A link's menu at rest stays as it is.
- **Stays:** `commitAtRest` for the checkbox and link actions, `linkGestures`, and read-only behavior.
- **Must Prove First:** That Chromium's `contextmenu` hit test lands on an editor mounted during `mousedown`. **[Inferred]** It should, since it hit-tests after the press and React flushes a discrete update and its effects before the next event. If it doesn't, this option dies and Option 2 stands.

**Option 2 — Keep the Resting Menu, Consolidate:** Everything in *§Remove First*, with `routeRightClick` staying as the one route for two surfaces. **[Inferred]** The surface shrinks by about 30 lines and keeps its parity tax.

**My Stance:** Option 1, gated on one drive and Nathan reversing 5.6 with the costs in front of him. It's the only move that removes a *kind* of thing, where every other item here removes instances of it, and it lets the two unentered surfaces (3-T20) answer the same way. The honest counterargument is that Nathan ruled on this deliberately, and a menu that leaves focus alone has real value for a Bold or a Cut across several cells.

**Remove First (Either Option):**

1. `format` becomes required, an inert host answering `async () => null` and the harness supplying one line, so `if (!ask)` and the `click` thunk go (3-T37). `at` goes non-null through `posAndSideAtCoords(event, false)` (3-T36). No behavior changes.
2. `view.dom.isConnected` at both sites (3-T38), `posAt`'s `try`/`catch` (3-T42), `!!edge` (3-T44), the two `stopPropagation`s, and the wrap's capture (3-T43). No behavior changes.
3. The seat is fixed at its origin: it seats with `userEvent: 'select.pointer'`, reads `view.state.selection.main` back, and every non-list row acts on what's seated, so `applyEditorAction`'s range collapses to list rows (3-T15, 3-T30, 3-T45). **Changes:** a click at a marker's edge stops writing into the marker. The seat is then the single source, so the highlight, the rows, and `embedSeatAt` and `citationSeatAt` without `at` agree (3-T32, 3-T47); the `` `abc` `` case then offers Footnote at the span's closing edge, so `citationSeatAt`'s end rule needs its own look.
4. `doc === opened` gives way to one reply rule read after the seat (3-T13, 3-T14). **Changes:** the dropped pick goes, and the landing case keeps standing down.
5. Chromium's reseat is refused on every routed click rather than `!inside` alone, and the synthetic `selectionchange` stays only if the drive reaches its state (3-T34, 3-T39, 3-T40).
6. One read-only answer for the native menu across all three surfaces: Copy and Select All, or nothing (3-T19).

**The Two Ranges:** `from, to` versus `start, end` survives for one reason: `listReach` treats `from === to` as the item's group and a range as the items it touches (`Input/format.ts:318`). If a range inside one line reached as a caret does, list rows act on the seated word like every other row, and `list ? from : start` and `request`'s four arguments leave. **Changes:** a double-clicked word followed by a Lists pick would reach the group. That rule belongs to the list-model scout, and its answer decides this.

**The Word Rule:** The atoms cost 41 lines (`markdownInput.ts:310-350`) to keep `'quoted'` and `dogs'` free of their quotes. The one-line alternative already existed: `048fdb1e0`'s `EditorState.languageData.of(() => [{ wordChars: "'’" }])` gave every gesture the apostrophe through CodeMirror's own commands, and `9fe6e7316` replaced it after Nathan ruled "only between letters." I'd keep the ruling, since `'quoted'` selecting its quotes is a real wart on a real gesture and the mechanism is compact and correct; the price is worth stating to him once.

**A Third Option Worth One Drive:** Stop seating and let Chromium's word stand. **[Inferred]** ICU word breaking already gives `don't` whole and `'quoted'` as `quoted`, and it reads rendered text, so it may also answer I-072's word split by marks. Rows would read the selection at the reply, deleting `wordUnder`, `seat`, the refusal, and the highlight plumbing. **Against:** the blank-space and at-the-caret rulings need a refusal anyway, and from memory Chromium seats a word on a right-click on macOS alone, so the Windows PC would act at the caret.

**Keep as Correct Separation:** `clickInside` as one rule; `wordAt` as the one reader; `editorMenu` at `Prec.lowest` beneath claimed presses; main parking the ask until `context-menu`, since only main can see `params`; `linkGestures` shared with `TextCell`; `commitAtRest`; `editFor` as the pure action table.

---

#### 7. Insights and Disagreements

**3-T56 · One Drive Decides Five Findings:** A CDP probe logging `mousedown`, `selectstart`, `selectionchange`, and `contextmenu` on a right-click over page text, a grip, and a resting cell, with and without `preventDefault` at each stage, plus the mount-at-press test, settles Option 1, 3-T34, 3-T39, 3-T40, and 3-T59. It should run before planning fixes a shape, since this pass couldn't launch the app.

**3-T57 · The Pin Exercises None of the Menu:** `cellStatic.test.tsx:113` ("a right-click leaves the cell resting") returns at `if (!ask)` because its harness has no `format`, so it pins the ruling while running nothing the ruling describes.

**3-T58 · `joinedWords` Reads Against a Written Rule:** Editor-Internals says `atomicRanges` "must stay whole-document," and this provider is viewport-only by design. **[Inferred]** It's harmless, since a group motion starts at a caret the viewport holds, but the rule as written needs its exception named.

**3-T59 · Four Models of When Chromium Seats:** `gripMenu.ts:139` and Editor-Internals' grip entry say the seat happens at the press and preventing `contextmenu` is too late; `pointerPath.ts:48` says a fallthrough seats a caret that `contextmenu` then reads, which needs `selectionchange` to have landed by then; `menu.ts:41` says it comes after the handler and is refusable through `selectstart`; and the Links plan's belief that defaulting the press stops it was disproved. These can't all be the full picture, and four guards rest on them.

**3-T60 · A Live Cell Survives a Right-Click Elsewhere:** With `dismissalStack.ts:69` answering only a primary press, a right-click on page text moves focus and leaves the cell mounted until the next left press. **[Inferred]** It shows as a live cell with no caret.

**3-T61 · Disagreement With the Mandate's Framing:** "No current behavior is a contract" is Decision 4, and ruling 5.6 is Nathan's own words on exactly this gesture. I'm treating it as open, and it still needs his explicit reversal.

**3-T62 · Disagreement With "Not Taken":** The Wave One record declined `applyEditorAction`'s range because "list rows need the click-time point." That's true and it's the whole justification: the parameter serves one action family, and the place to answer it is the list rule (*§The Two Ranges*).

**Probes:** Run from a scratch vitest config against `Core/`. None touched the project, and the scratch files were removed.
