### 2 — The Entry Points — Scout Report

**BASE:** `cd813afdd`

#### What's True

2-T1. A list glyph in a live editor carries `GLYPH_CLASS` (`md-list-glyph`): the bullet and checkbox are widgets (`GlyphWidget` subclasses with `ignoreEvent() → false`), and the number and arrow are a class mark over the marker's source text — `Core/MarkdownPM/Engine/intents.ts:35`, `Core/MarkdownPM/decorations.ts:85-89`, `decorations.ts:155-182`, `intents.ts:706-715`.
2-T2. The marker reveal is uneven across kinds: with a resting caret on the marker (`onMarker`), the bullet and checkbox drop their widget and draw source with no `GLYPH_CLASS`, while the number and arrow keep the class mark unconditionally — `intents.ts:630-634`, `intents.ts:658`, `intents.ts:688`, `intents.ts:706-715`.
2-T3. The glyph's only editor handlers are left-press ones: `listDrag` claims `mousedown`/`pointerdown` for `button === 0` on `.md-list-glyph`, with a tap toggling a checkbox or seating the caret. Nothing claims a right-press on a glyph — `Core/MarkdownPM/Gestures/listDrag.ts:81-92`, `listDrag.ts:66-74`.
2-T4. `gripMenu` is the editor's one block-menu handler. Its `mousedown` suppresses a right-press on a grip or heading gutter so the browser can't seat the caret, and its `contextmenu` pops the heading menu (even read-only), then returns early when `readOnly`, then pops the grip menu through `host.menus.grip`. The reply re-finds the block and stands down if its text changed while the native menu was open — `Core/MarkdownPM/Menus/gripMenu.ts:120-147`.
2-T5. The grip's list rows reply `listKind:<kind>` and are applied by a raw `view.dispatch` of `setListKind` over the whole block, while the heading rows in the same file go through `applyEdit` — `gripMenu.ts:152-166` against `gripMenu.ts:114`.
2-T6. `editorMenu` (lowest precedence) reads the format flags at the click: a click outside the selection reads `[at, at]`, one inside reads the selection. It returns `false` without `preventDefault`, so Desktop's `context-menu` event still fires, and the reply runs `applyEditorAction`, which reads the **live** selection — `Core/MarkdownPM/Menus/menu.ts:15-23`, `menu.ts:26-52`.
2-T7. The claim that the browser seats a word under the right-click rests on the comments at `menu.ts:32` and `Gestures/pointerPath.ts:48-49`. `editorMenu.test.tsx` runs in jsdom and never exercises it. **Unverified.**
2-T8. The `/` menu only opens on a line that reads exactly `/query`, so it never runs on an existing item. Its pick deletes the query outside history and then runs `applyEditorAction` on the resulting empty line — `Core/MarkdownPM/Menus/blockQuery.ts:17-18`, `Menus/useBlockMenu.ts:41-51`, `.claude/Features/MarkdownPM.md:142`.
2-T9. `blockGestures` gives `listDrag`, `gripMenu`, and the handles to the `page` and `cell` scopes and nothing to `text`, and `text` reads no lists — `Core/MarkdownPM/surface.ts:25-40`, `Engine/detect.ts:512-516`. A live cell mounts `editorBase` with `scope: 'cell'` — `Tables/CellEditor.tsx:164-166`. A page tile mounts a full `MarkdownEditor` — `Core/Tiles/Surfaces/PageTile.tsx:170`.
2-T10. `ReactWidget` leaves `ignoreEvent` at CodeMirror's default (`true`), so the page editor's `domEventHandlers` never see presses inside a table or tile widget. Each nested editor handles its own presses, and a resting cell is in no editor's event stream — `Core/MarkdownPM/reactWidget.ts:12` (no override). The default's meaning is CodeMirror library behavior.
2-T11. A resting cell draws its glyph as `md-list-checkbox-seat`, `md-list-bullet`, or `md-list-<glyph> md-control`, each with `data-src="<lineStart>,<contentStart>"`. That's the editor's markup minus `GLYPH_CLASS`, omitted on purpose so the non-draggable glyph keeps the text cursor — `Tables/cellStatic.tsx:240-270`, `Core/MarkdownPM/markdown-tables.css:198-200`, `markdown-pm.css:483-487`.
2-T12. A resting cell defaults away every right-press, so it never seats a word. Its `contextmenu` tries the link menu, returns when `readOnly()`, and otherwise asks `host.menus.format` with a click-time range from `restingRange`, applying the reply over that same range through `editFor` — `cellStatic.tsx:585-588`, `cellStatic.tsx:551-555`, `cellStatic.tsx:393-409`, `cellStatic.tsx:501-535`.
2-T13. A resting cell has no grip: `GRIP_LINE` is `.cm-line[data-grip]`, a CodeMirror line decoration — `intents.ts:37-38`, `Menus/blockHandles.ts:41`. In a live cell the grip's press band is the list's whole inset (`--grip-strip: var(--list-indent)`), which is where the first line's glyph sits — `markdown-tables.css:192-196`, `Core/MarkdownPM/lineDom.ts:30-43`.
2-T14. The table's sweep stands down on a `GLYPH_CLASS` target and on the grip band — `Tables/MarkdownTable.tsx:159-164`.
2-T15. Desktop builds the general menu only when `params.isEditable` or the request is a resting one, otherwise resolving `null` — `Desktop/Actions/editorMenu.ts:133-147` (line 136). Whether Chromium reports a `contenteditable=false` widget (the bullet or checkbox) as editable is **unverified**, so whether a right-click on a bullet shows any menu today is unverified too.
2-T16. "Current kind" has two readers. The grip uses `listKindOf` over the block's range (null when markers disagree), while Lists ▸'s check reads `readFormatState`'s `list`, the kind of the first line under the selection only — `Core/MarkdownPM/Input/format.ts:330-338`, `gripMenu.ts:69-70`, `Input/formatState.ts:20-22`, `formatState.ts:37`, `Core/Actions/editorMenu.ts:42`, `editorMenu.ts:119-120`.
2-T17. The list switch has two action vocabularies: `listKind:<kind>` (grip) and `list:<kind>` (Lists ▸, the `/` menu, `editFor`) — `Core/Actions/gripMenu.ts:20`, `Core/Actions/blockMenu.ts:10`, `Input/format.ts:174-175`.
2-T18. `gripMenuItems` appends a divided Delete to every context but a non-editable heading — `Actions/gripMenu.ts:99-102`.
2-T19. Read-only holds by construction: `changeFilter` refuses any doc change from a read-only state, and every menu funnel already gates its pop on `readOnly` — `Core/MarkdownPM/MarkdownEditor.tsx:140`, `gripMenu.ts:134`, `menu.ts:31`, `cellStatic.tsx:552`.
2-T20. A behavioral editor setting reaches every editor and the resting cell through `EDITOR_SETTING_KEYS` → `host.settings()`, whereas `outlinerLines` is CSS-only — `Core/MarkdownPM/api.ts:87-111`, `Core/Settings/applyPersonalization.ts:56`. The Outliner Lines row sits at `Core/Settings/frames.ts:718-723`, and its default at `Core/Settings/personalization.ts:147`.

#### What's Reusable

2-R1. **`gripMenu`'s gate and reply:** the right-press suppression and the `opened` snapshot plus re-find stale guard are what the glyph menu needs (D9 safety while a native menu stays open) — `gripMenu.ts:120-147`.
2-R2. **`view.posAtDOM(glyph)`:** already resolves a glyph element to its document position — `listDrag.ts:92`.
2-R3. **`LIST_KINDS` with its `short` names:** D7's flat menu is exactly the Type ▸ submenu's rows lifted one level — `Actions/gripMenu.ts:36-52`, `Actions/gripMenu.ts:68-78`.
2-R4. **`host.menus.grip` → `popMenu(gripMenuItems(ctx))`:** a native flat menu with checks, no Desktop change, and already stubbed by the harness — `Core/Pages/editorHost.tsx:102`, `Core/Testing/editorHarness.ts:124-129`, `Desktop/Actions/menu.ts:38-60`.
2-R5. **`restingAction` → `editFor` → `commitAtRest`:** a resting cell already applies any `list:<kind>` reply over a click-time range — `cellStatic.tsx:501-518`.
2-R6. **`data-src` on the resting glyph:** gives the item's line start without a hit test — `cellStatic.tsx:251`.
2-R7. **`listKindOf`:** the range reader D14's check needs, already used by the grip — `format.ts:330-338`.
2-R8. **`EDITOR_SETTING_KEYS`:** the new setting's single route to both surfaces — `api.ts:87-111`.
2-R9. **Click-time discrimination:** `editorMenu` already computes "inside your own selection or not" — `menu.ts:33-36`.

#### What Contradicts the Decisions

2-C1. **Decision 11:** the `/` menu never runs on an existing item (2-T8), so "the `/` menu's list rows should follow the same rules on a line that's already an item" describes a path that doesn't exist; its pick always lands on an empty line, which becomes an item. Either the clause drops, or the pane should open on item lines, which is a separate feature.
2-C2. **Decision 10:** "by construction" holds for every editor surface (page, live cell, nested tile, file history) through `blockGestures`, but can't be literal for the resting cell, which sits in no editor's event stream (2-T10) and already duplicates the editor's gestures by hand. `claimCheckbox` is `clickAction`'s twin, with a comment saying so (`cellStatic.tsx:479-491` against `listDrag.ts:66-74`). The honest shape is one editor handler plus one call from the resting cell's existing `contextmenu`.
2-C3. **Decision 14** against Lists ▸ today: its check reads one line (2-T16), so a multi-line selection of mixed kinds still checks the first line's kind.
2-C4. **Decision 17** against `applyEditorAction`: the reply re-reads the live selection, which after the browser's seat (unverified, 2-T7) is a word whether or not the user owned a selection, so it can't tell the two cases apart. Only the click-time read (`menu.ts:33-36`) can, and today it feeds the flags but not the action. The resting cell already acts on the click-time range (2-T12), which leaves the live editor as the odd one out.
2-C5. **Context ("A right-click on a glyph… falls through to that general menu"):** in a live cell, a right-click on the first line's glyph lands in the grip band (2-T13) and gets the grip menu. On a bullet or checkbox widget, Desktop may show nothing at all (2-T15, unverified).
2-C6. **Decision 16:** "as the grip's list rows behave today" is right for the grip, but the heading menu opens read-only (`gripMenu.ts:128-133`). The glyph check must sit below the `readOnly` return, not beside the heading check.

#### What Could Be Removed or Consolidated

2-X1. **One list action vocabulary:** `listKind:<kind>` goes and the grip replies `list:<kind>`. `GripMenuAction`'s `listKind:` arm drops in favor of the `BlockMenuAction` form, and the `arg('listKind:')` branch merges into the one switch (the write scout decides how Type ▸'s whole-block addressing is expressed, per D13) — `Actions/gripMenu.ts:20`, `gripMenu.ts:152-166`; about −2/+1.
2-X2. **The grip's raw list dispatch goes through `applyEdit`,** as its heading rows already do — `gripMenu.ts:165-166`; −1.
2-X3. **One "current kind" reader:** `readFormatState`'s single-line `list` is replaced by the range reader (`listKindOf`, or the write scout's addressed-set reader), so Lists ▸, the glyph menu, and Type ▸ check by one rule (D14) — `formatState.ts:37`; ±0.
2-X4. **One five-kind row builder:** the Type ▸ rows become the flat glyph menu's rows and the grip's submenu from one expression, instead of a second copy for the glyph — `Actions/gripMenu.ts:68-78`; +1/−0 against a new copy's +6. `LIST_ROWS` stays separate: its long labels are what `/` search matches (`blockMenu.ts:27-29`), and D7 fixes the short names.

#### Approaches

2-A1. **Glyph Arm on the Grip Path:** `gripMenu.ts`'s `mousedown` and `contextmenu` also catch `.closest(.md-list-glyph)`, checked before the grip band so a cell's first-line glyph gets its own menu (2-T13). They resolve the item by `posAtDOM`, pop `host.menus.grip` with the list context reshaped to say whether it's the block's Type ▸ or the item's flat menu (`{ kind: 'list'; current; item: boolean }`, no Delete when `item`), and apply `list:<kind>` through the shared switch under the existing stale guard. The glyph branch calls `preventDefault` as the grip does (`gripMenu.ts:141`), or a number or arrow mark, being editable text, would also get Desktop's general menu. The resting cell's `onContextMenu` adds one glyph branch that pops the same context and hands the reply to `restingAction`. Adds about +4 in `gripMenu.ts`, +3 in `Actions/gripMenu.ts`, and +5 in `cellStatic.tsx`; removes 2-X1, 2-X2, and 2-X4's duplicate (about −3). Estimated net about **+9** (entry side, setting excluded). Trade-offs: no Desktop or contract change and one menu model for both list menus, at the cost of one explicit resting-cell branch.
2-A2. **Glyph as a Shape of the Format Request:** `EditorMenuRequest` gains `glyph: boolean`, both existing funnels (`editorMenu`, `restingMenu`) set it from the target, and Desktop builds a five-row menu instead of the general one, so both surfaces reply `list:<kind>` through the paths they already apply. Adds about +1 in the schema, +2 at the funnels, and +4 in Desktop; removes the same as 2-A1. Estimated net about **+5**. Trade-offs: the resting cell needs no new ask, but a menu shape moves into main, Desktop's `isEditable` gate must be bypassed for widget glyphs (2-T15, unverified), the reply loses `gripMenu`'s stale guard, and the renderer must *not* `preventDefault`, unlike every other surface that answers a press itself (`MarkdownPM.md:146`).
2-A3. **Promote the Cell on a Glyph Right-Press:** the resting cell activates its editor on a right-press over a glyph, so the editor handler alone serves it. Adds about +3. Trade-offs: it contradicts the documented rule that a resting cell answers a right-click without taking focus (`MarkdownPM.md:104`) and depends on React and CodeMirror mounting before `contextmenu` dispatches (unverified timing). Rejected.

**Recommendation:** 2-A1. It keeps one menu model and one channel for every list-type menu, leaves Desktop and the contract untouched, reuses the stale guard D9 needs, and keeps the resting cell's cost to the one branch its no-editor design already implies for every gesture. 2-A2 is smaller by about four lines, but it splits one menu across two processes and adds a fourth way a renderer surface answers a right-click.

#### Edge Cases

2-E1. **Caret on a bullet or checkbox marker (source drawn):** there's no glyph to catch, so the right-click is a text right-click and goes to the general menu, where D17 makes Lists ▸ act as the glyph would. Number and arrow keep the glyph class (2-T2) and get the glyph menu. The outcome is the same; the menu's shape differs by kind.
2-E2. **Right-press on a glyph without suppression:** the browser would seat a caret on the marker, flipping a bullet to source under the open menu (inferred from 2-T2 and 2-T7). The glyph must join `gripMenu`'s right-press suppression.
2-E3. **Glyph right-clicked inside the user's own multi-item selection:** D2 says the glyph addresses its group, while D11 and D17 say a selection narrows. The code would do whatever the handler reads; see 2-Q2.
2-E4. **A cell's first-line glyph:** it sits in both the grip band and the glyph, and whichever check runs first wins (2-T13); the order is 2-Q5's.
2-E5. **Document changes while the native menu is open:** the grip path's re-find stands down (2-R1). `editorMenu`'s reply has no such guard (`menu.ts:47`), which matters only if a click-time range is carried into it (2-Q1).
2-E6. **Read-only editors and cells:** gated at every funnel, and refused by `changeFilter` regardless (2-T19).
2-E7. **Nested page tile:** its own editor catches its own glyph (2-T9, 2-T10), with no outer double-handling.
2-E8. **A plain line or a `text`-scope value:** no glyph is drawn there, so no glyph menu appears (2-T9).

#### Questions for Nathan

2-Q1. **What should an unselected right-click act on?** Today the live editor lets the browser select the word under a right-click and acts on that word, while a resting table cell blocks that and acts at the click point. Decision 17 needs to know whether you had your own selection, and only the click-time read knows. **Option One:** make the editor behave like the resting cell, acting at the click. That's One Way, but right-click → Bold on an unselected word would insert an empty pair instead of bolding the word, and spelling suggestions may depend on the word being selected (unverified). **Option Two:** carry the click-time answer only into list rows, an exception that needs a reason stated where it lives. **Recommended:** Option Two now, with the inline-format divergence recorded as its own issue.
2-Q2. **Right-clicking a glyph inside your own selection:** should it still change the glyph's group (Decision 2), or only the selected items (Decision 11)? **Recommended:** the glyph always addresses its group, since the glyph is the item's handle.
2-Q3. **The `/` menu clause in Decision 11:** `/` only opens on an empty line, so it can never change an existing item. Drop the clause? **Recommended:** drop it.
2-Q4. **Should a resting cell's glyph share the editor's glyph class?** It would let both surfaces use one selector, but it brings the grab cursor and the table-sweep exemption onto a glyph you can't drag at rest. **Recommended:** no; the resting branch matches on its own `data-src` glyph.

2-Q5. **In a table cell, the block's grip and the first item's glyph share the same spot:** the grip's handle is centered in the list's indent (`markdown-tables.css:195`), right where the first glyph sits. Should a right-click there open the glyph's menu or the grip's Type ▸ and Delete? **Recommended:** the glyph's, since it's what's drawn under the pointer when the row isn't hovered; the grip's menu stays reachable from the rest of the indent band.

#### Tests and Docs Touched

2-D1. Pins `listKind:` rows and Delete on the list context — `Core/Actions/gripMenu.test.ts:51-60`.
2-D2. Picks `listKind:` replies — `Core/MarkdownPM/Menus/gripMenuFlow.test.tsx:83`, `:91`, `:94`, `:189`.
2-D3. Grip right-press suppression; a glyph twin only if 2-E2 is judged worth pinning — `gripMenuFlow.test.tsx:172-185`.
2-D4. Applies the reply over the live selection, which changes under 2-Q1 Option One — `Core/MarkdownPM/Menus/editorMenu.test.tsx:52-61`, `:63-68`.
2-D5. Cell grip presence and resting checkbox behavior, unchanged but adjacent — `Core/MarkdownPM/Tables/cellLists.test.tsx:295-316`.
2-D6. Unchanged; the left-press contract — `Core/MarkdownPM/Gestures/listDragTap.test.tsx:31-44`.
2-D7. Lists paragraph (Type ▸ and Lists ▸ semantics) — `.claude/Features/MarkdownPM.md:24`.
2-D8. Lists in cells (grip menu offering type and Delete) — `MarkdownPM.md:105`.
2-D9. Grip table, List row — `MarkdownPM.md:138`.
2-D10. Surfaces that answer a press themselves — `MarkdownPM.md:146`.
2-D11. New row beneath Outliner Lines — `.claude/Features/ConfigurationPM.md:151`.
2-D12. Settings row and default — `Core/Settings/frames.ts:718-723`, `Core/Settings/personalization.ts:147`, `Core/MarkdownPM/api.ts:87-111`.
2-D13. Unchanged; the table structure grips — `Core/MarkdownPM/Tables/tableGripMenu.test.tsx:53-160`.

#### Comment Ledger

2-L1. Reworded, not added: the suppression comment widens from "A grip acts on its block" to cover the glyph — `Core/MarkdownPM/Menus/gripMenu.ts:121`.
2-L2. Reworded, not added: "The grip addresses one block" may need adjusting if the list switch shares the heading rows' `applyEdit` call site — `gripMenu.ts:112`.
2-L3. No comment added in `cellStatic.tsx`; the existing one at `Tables/cellStatic.tsx:479` ("A resting cell has no editor, so the toggle… has to be offered here too") widens to the glyph menu.
