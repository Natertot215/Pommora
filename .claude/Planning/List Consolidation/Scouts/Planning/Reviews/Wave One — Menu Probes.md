#### Wave One — Menu Probes

**Date:** 11-06-2026
**Trees:** Final `3469266d1` and baseline `b7f2f17a5`, both built and driven live.
**Outcome:** Question 1 is correct as it stands. Question 2 is a real fault on the read-only cell route and closes with one `view.focus()` at `Core/MarkdownPM/Menus/menu.ts:33`.

##### Method

Each tree was built and launched through a scratch copy of `drive-harness.mjs` on `~/Test`, under the drive lock, with the harness's `Menu.popup` capture reading each menu's rows and enabled states. The copy added a main-process listener recording Chromium's `isEditable` and `editFlags` per click, and a log of which menu channel each click asked on. Presses were real right-clicks through `Input.dispatchMouseEvent`.

⌘C ran two ways: a CDP key event carrying the `copy` editing command, which passes through the page's keydown handling, and `webContents.copy()`, which is what the Edit ▸ Copy role runs. The two agreed in every case. No OS-level keystroke was sent, because the drive window never activates and the press could have landed in another app. The clipboard held a sentinel before each copy and was restored afterward.

`~/Test` hashed `e5a32a5d30d6a11310cd559ee2b1b84b261c3265` before and after.

##### Question 1: Non-Editable Targets at `Desktop/Actions/editorMenu.ts:118`

Four targets reach the ask with `isEditable` false. At the baseline each one asked, moved the caret, resolved null, and popped nothing. At the final tree each pops the live menu, and the caret lands in the same place.

| Target | When It Exists | Baseline | Final |
| --- | --- | --- | --- |
| Connection glyph | The caret is inside the link, in every link form | No menu | Live menu |
| Empty-label link's label | The caret is inside the link | No menu | Live menu |
| Code line number | Line counts are on | No menu | Live menu |
| Citation reference | The caret is inside the marker | No menu | Live menu |

**Rows:** Undo and Redo, Cut, Copy, Paste, Paste Without Formatting, Select All, Lists, Insert, Format, Embed, and Heading, with Paste As on prose. These are the rows a right-click on blank space past a line's text gets. Cut and Copy are disabled because nothing is selected, and everything else is enabled.

**The Feared Mismatch:** It doesn't occur. `canPaste` read true on all four, since `editFlags` follows the focused page editor rather than the pressed widget. Paste is enabled alongside Lists, so no row disagrees with its neighbors.

**What the Rows Do:** Row picks ran on the link targets, and each landed as it does from text beside them.

- **Lists ▸ Bulleted:** Writes `- ` at the line's start.
- **Format ▸ Bold:** Wraps the whole link.
- **Paste and Paste Without Formatting:** Insert at the seated caret.
- **Paste As ▸ Footnote:** Inserts its marker at the seated caret and its note at the document's end.
- **Select All:** Selects the page.

The seat for a `[text](target)` glyph sits at the target's start, so a paste there lands inside the link target. That's the revealed caret's own position, and the baseline's press seats the same caret, though its ⌘V wasn't driven. Rows weren't picked on the line number or the citation reference, which show the same row set.

**Targets Unchanged Between the Trees:**

- **Nested Quote Bar:** The press resolves to the line, so `isEditable` is true and the live menu pops at both trees. The bar never reaches this branch.
- **Label and Heading Join at Rest:** The link menu claims the label and the `§` after a page half. The flush `§` of `[[#Local]]` pops the live menu with `isEditable` true.
- **Code Tag, Diff Bar, and Tally:** All pop the live menu with `isEditable` true. The likely cause is the seat revealing source under the press, which wasn't isolated.
- **Rule:** No ask and no menu. The caret moves to the rule's line.
- **Table Chrome:** The wrap, resize zones, and add strips make no ask and pop no menu. Grips keep their own menus.
- **Citation Number and List Glyphs:** They keep their own menus.

**Embed:** A tile is its own editor, so it reaches `short`. It pops Copy and Select All at the final tree. The baseline popped the full system menu there, with Cut and Paste enabled on a read-only surface.

**Parked Asks:** No ask at the final tree went unanswered by a pop, so `pending` was never left waiting for a later click.

**Recommendation:** Correct as it stands, with no change. The baseline's null was a right-click that moved the caret and showed nothing. The final tree gives these glyphs the menu of the text around them, and restoring the carve-out would add a condition to bring back a dead click.

##### Question 2: Select All From a Read-Only Surface

| Route | View Selection | `hasFocus` | Tint | ⌘C | Copy Row, Pressed on Text | Copy Row, Pressed on a Cell |
| --- | --- | --- | --- | --- | --- | --- |
| Unentered tile, on text or blank space | Whole document | True | Focused | Whole Markdown source | Whole source | `cellword` |
| Tile's read-only cell | Whole document | False | Idle | Nothing copied | `word` | `cellword` |
| Same, with a page range held | Whole document | False | Not read | The page's `plain` | Not run | Not run |
| Reader text | Whole document | True | Not read | Whole Markdown source | Whole source | `cellword` |
| Reader's read-only cell | Whole document | False | Not read | Nothing copied | `word` | `cellword` |

**The Fault:** A press on a resting cell leaves focus outside the editor, so `selectAll(view)` writes a selection that never becomes a DOM selection. The surface paints a selection in the idle tint that ⌘C can't reach, and with a page range held, ⌘C silently copies that other range.

**The Prior Reading:** The earlier report of an unentered tile holding `hasFocus` false in the idle tint doesn't reproduce from a press on a tile. A real right-click focuses the tile, and only the cell route gives that reading.

**Baseline:** The tile popped the system menu with its Select All role, so it did have one. With the same press and the same selection written directly, ⌘C copied the whole source, as the final tile does. A read-only cell popped nothing. Chromium seated its own word there, so ⌘C copied `cellword`, and selecting the view directly left that word as what ⌘C copied.

**Side Effect at the Final Tree:** Right-clicking a read-only cell and dismissing the menu leaves nothing for ⌘C, where the baseline copied the word. The seat is a highlight that clears on close, and the Copy row covers this while the menu is open.

**Recommendation:** Change `Core/MarkdownPM/Menus/menu.ts:33` to focus the view, as `applyEditorAction`'s edit branch at line 36 already does.

```ts
else if (action === SURFACE_EDITS.selectAll) {
  selectAll(view)
  view.focus()
}
```

**Trial:** The change was tried in `wt-adv1` and reverted. The delta is `+3 (+4 / -1)`.

- **Cell Routes:** The cell and reader-cell routes now hold focus and a real DOM selection, and ⌘C copies the whole Markdown source.
- **Held Page Range:** ⌘C copies the tile's source rather than the page's range.
- **Tile and Reader Text:** Both are unchanged.
- **Read-Only State:** `readOnly` stays true on every route.
- **Tests:** The 114 tests in `Core/MarkdownPM/Menus` and `cellRestingMenu.test.tsx` pass. Typecheck and lint weren't run on the trial.

**Copy Row From a Cell:** After Select All, the row still copies the pressed cell's text alone, with or without the change. The press points at the cell, which is a document of its own, so this reads as correct. Closing it would take a second selection reader for one row.

##### Limits

- **Left Presses:** A left press on a tile or reader enters editing at both trees, with `readOnly` false afterward. The drag comparison therefore tested an entered surface, and it produced a caret rather than a range.
- **Worked Example:** `$SP/lc/adv1-probe/` wasn't on disk, so the probe was built from `live-drive.mjs` and the harness instead.
- **Native Roles:** On macOS a role row's click does nothing through the harness, so Select All, Copy, and Paste rows ran as their `webContents` calls after the menu closed.
- **Unprobed:** The final tree's cell screenshot shows a table's grip and add strips drawn on hover inside a read-only tile. Whether they respond there wasn't tested.
