**Re-grounded:** 10-07-2026 at `32d3fa62c`

### C — Table & Cards

**Slice:** TableView and CardsView — cells, cards, layout, and how a value is shown at rest and edited in place.

---

#### Task 1: How a Link or Number Cell Edits Today

##### The Table Path

1. **Click:** `DataRow` puts `onClick={(e) => api.click(row, c, e)}` on every `.data-cell` (`Core/Views/Table/TableView.tsx:693`); `api.click` is `onCellClick` (`TableView.tsx:382`).
2. **Intent:** `onCellClick` returns early for the title (navigates, `TableView.tsx:164-168`), then calls `valueClickIntent(columnType(...), resolveFieldValue(...), colStyle(col.id).look, def)` (`TableView.tsx:170-175`).
3. **Per Kind:** `valueClickIntent` switches on `specOf(type).kind` (`Core/Properties/Pickers/valueClick.ts:30`). Number returns `{kind:'edit'}`, or `{kind:'numberPicker'}` when drawn as a bar (`valueClick.ts:43-44`). Link returns `{kind:'open'}` for a valid address, `null` for a whole-value page link (its anchor handles the click), and `{kind:'edit'}` only when empty or malformed (`valueClick.ts:45-50`).
4. **Handler:** `runIntent` maps `edit` to `editAs('editor')`, and `numberPicker` and `rename` to `editAs('popover')` (`TableView.tsx:150-154`), which sets `editing` state (`TableView.tsx:141-142`).
5. **Editor Seat:** `DataRow` swaps the cell's `<Cell>` for `api.overlay(row, c)` when `overlayCol` matches (`TableView.tsx:665-676`); `cellEditor` renders `PropertyValueInput` with no `popover` (`TableView.tsx:216-223`). The popover mode renders a second `PropertyValueInput` at the view root, anchored to the clicked cell (`TableView.tsx:247-263`).
6. **Field:** `PropertyValueInput` seeds `initial` from `editorText(current)` and validates through `parseEditorValue(def.type, text, current)` (`Core/Properties/Pickers/PropertyValueInput.tsx:37-41`); inline it renders `EditableInput` with `fillInput` (`PropertyValueInput.tsx:59-68`); as a popover it renders `NumberValuePicker` for Number (`:27-36`) or `TextPicker` for everything else (`:48-58`).
7. **Commit:** `EditableInput` commits on blur with `value.trim()`, Enter blurs, and Escape restores and cancels (`UIX/Fields/EditableInput.tsx:79-103`). `PropertyValueInput.commit` closes, skips an unchanged text, and drops an `undefined` parse (`PropertyValueInput.tsx:42-46`).
8. **Writer:** `onCommit` → `commitValue(row, col, next)` (`TableView.tsx:220`) → `assignValue` (`Core/Views/Host/useViewHost.ts:172-176`) → `write`, which patches frontmatter through `applyValueAtRoot` and sends `{op:'setProperty'}` (`Core/Properties/assignValue.ts:22-44`), then pushes the undo step (`assignValue.ts:69`).

##### The Card Path

1. **Click:** `CardValue`'s `.card-value` span owns `onClick` (`Core/Views/Cards/CardValue.tsx:138-144`), which stops propagation (the card is a drag handle) and calls `valueClickIntent(t, v, style.look, def)` (`CardValue.tsx:101-107`).
2. **Handler:** `edit` sets local `editing` (`CardValue.tsx:93`); `numberPicker`, `rename`, `picker`, and `dateTime` call `onOpenPicker` (`CardValue.tsx:81-92`), which lifts to the grid-level `valuePicker` (`Core/Views/Cards/CardsView.tsx:701-703`, `:175`).
3. **Editor Seat:** while `editing`, the span renders `PropertyValueInput` in place of `<Cell>` (`CardValue.tsx:145-151`); the popover seat is one grid-level `PropertyValueInput` (`CardsView.tsx:486-495`).
   The field already scrolls a long value horizontally: `EditableInput` wears `scroll-fade-x` when not `boxed` (`EditableInput.tsx:51-57`) and the native `<input>` scrolls its own text. The `OverScroll` cap (`UIX/Interactions/OverScroll.tsx:98-106`, `over-scroll.css:2-9`) is the resting-label mechanism and isn't applied to the field.
4. **Empty Glyph:** a blank value on a Standard card renders `EmptyValue` (an em-dash, `UIX/Elements/EmptyValue.tsx:5`) when `fillsBlank(t)` holds (`CardValue.tsx:159-163`); `fillsBlank` is true for every type but Checkbox and the stamped timestamps (`Core/Views/Cards/cardValueInput.ts:18-21`), so a `text` type gets the dash without an arm.
5. **Add-Picker:** a property revealed from the add-picker opens as `kind: 'popover'` unless it's Date or File (`CardsView.tsx:526`), which reaches `PropertyValueInput`'s `TextPicker` branch.
6. **Writer:** `commit` → `onCommit(column, v)` (`CardValue.tsx:70`) → `api.commitValue` (`CardsView.tsx:698`) → the same `assignValue`.

##### Reuse Versus a `text` Arm

| Piece | Reused Unchanged | Needs a `text` Arm or New Work |
| --- | --- | --- |
| Table click routing, `editing` state, overlay seat | `TableView.tsx:141-177`, `:181-224`, `:665` | — |
| Card click routing, local `editing`, inline seat | `CardValue.tsx:76-107`, `:145-151` | — |
| `runValueIntent` dispatch | `valueClick.ts:69-74` | — |
| Writer and undo | `assignValue.ts:22-75`, `useViewHost.ts:172` | `encodeValue` and `isBlankValue` are exhaustive over `PropertyValue['kind']` (`Core/Properties/propertyValue.ts:151-170`, `:178-195`) |
| Standard-card empty dash | `fillsBlank` (`cardValueInput.ts:18-21`) | — |
| `valueClickIntent` | — | `switch (spec.kind)` has no default (`valueClick.ts:30-51`); a new kind is a compile error until it returns an intent |
| `editorText` | — | Returns `''` for anything but Number and Link (`Core/Properties/parseEditorValue.ts:7-11`), so a Text field would open blank |
| `parseEditorValue` | — | Returns `undefined` for an unlisted type (`parseEditorValue.ts:30`), so every Text keystroke reads invalid (dimmed) and no commit lands |
| `Cell` resting render | — | `switch (v.kind)` (`Core/Properties/Cells/Cell.tsx:70-162`) |
| Column width and alignment | — | `WIDTHS` and `DEFAULT_ALIGN` are `Record<PropertyType \| 'title', …>` (`Core/Views/Table/useColumns.ts:32`, `:102`) |
| Type label and icon | — | `TYPE_META` is `Record<PropertyType \| 'title', …>` (`Core/Properties/Cells/PropertyTypes.tsx:21`) |
| Default column look | — | `defaultStyleFor` switch (`Core/Properties/columnStyles.ts:137-153`) |
| Style submenu | — | `styleMenuItems` switch (`Core/Actions/columnMenu.ts:65-92`) |
| Cell menu | — | `baseCellMenu` switch (`Core/Actions/cellMenu.ts:65-84`) |
| Sweep eligibility | — | `pickKindOf` switch (`Core/Properties/properties.ts:77-91`) |
| A pen glyph opening TextPane | — | A new `ValueIntent` kind; `ValueIntentHandlers` is a mapped type over every kind (`valueClick.ts:64-66`), so TableView (`:143-157`), CardValue (`:84-96`), and PropertyPanel (`Core/Properties/PropertyPanel.tsx:277`) each declare a handler |
| TextPane as the popover | — | `PropertyValueInput`'s popover branch is `NumberValuePicker` or `TextPicker` (`PropertyValueInput.tsx:27-58`); no third seat exists |

Text can't ride the Select value kind for its string: `encodeValue` writes a Select as a one-element list (`propertyValue.ts:152-154`). The Link kind shares the plain-string shape (`propertyValue.ts:24`, `:79`), but its click, render, menu, and parse arms are all link-specific.

A filled Link cell opens its address on click (`valueClick.ts:47-48`); only the empty or malformed Link enters the field. "Typed into directly like link cells" describes that empty case; a Text cell editing on every click is the Number behavior.

---

#### Task 2: Resting Render

##### Single-Line Layers

| Layer | Rule | Source |
| --- | --- | --- |
| Table cell | `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` | `UIX/Table/table.css:70-77` |
| OverScroll cap (title, text, chips, link, date) | `white-space: nowrap; overflow-x: hidden` | `UIX/Interactions/over-scroll.css:2-9` |
| Card value | `display: inline-flex; white-space: nowrap; overflow: hidden` | `Core/Views/Cards/cards-view.css:100-107` |
| Chips | `labelBase` `white-space: nowrap` and a fixed `height` | `UIX/Labels/label-base.css.ts:26-37`, `:39-42` |
| Bordered field | `whiteSpace: 'nowrap'` | `UIX/Fields/fields.css.ts:50` |

No line clamp exists in `Core` or `UIX` (a search for `line-clamp` / `lineClamp` finds none outside built bundles), matching `PommoraUIX.md:406` ("no multi-line clamp").

##### Row Height

Table row height follows content: `.data-row` is a grid with `align-items: stretch` (`table.css:4-9`), `table-tokens.css` sets no row height, and `Core/Views` uses no virtualizer. On cards, `--card-row-h` (`cards-view.css:5`, `:15`) feeds only the body's reserved floor `--card-body-min` (`cards-view.css:8`, `:60-62`), and every card in a grid row matches its tallest sibling. The single-line assumption is the nowrap CSS above, rather than a fixed layout height.

##### Width Bounds

`WIDTHS` holds no `text` entry (`useColumns.ts:32-45`). `FALLBACK` (`{min 80, default 140, max ∞}`, `useColumns.ts:47`) applies only when `declaredType` is undefined (`useColumns.ts:67`), so a declared `text` type reaches the `Record` and needs its own bounds. The widest capped type is 350 (`useColumns.ts:34-42`); Title alone is uncapped.

##### Existing Multi-Line Renderers

The only multi-line value on either surface is the Cards title under **Wrap Titles**: `CardTitle mode='wrap'` renders a plain span instead of an OverScroll (`UIX/Cards/Card.tsx:72-77`), `.card-title.is-wrap { display: inline }` (`UIX/Cards/cards.css:143-145`), unclamped. Table cells, chips, and every card value are single-line.

##### A Text Value Through the Existing Plain Renderers

Assuming a Text arm drew the string as the Number and Date arms do (an OverScroll span, `Cell.tsx:127-132`, `:142`):

| Value | Shown |
| --- | --- |
| `Line one\nLine two` | `Line one Line two` — `nowrap` collapses the newline to a space |
| `**bold**` | `**bold**` literally |
| `- item` | `- item` literally |
| `==highlight==` | literally |
| `See [[Page]] here` | literally; `LinkCell` reads a connection only when the whole value is one (`Core/Properties/Cells/LinkCell.tsx:26`, `:36-37`) |

The inline editor shows the same flattening: `EditableInput` is an `<input>` (`EditableInput.tsx:49`), so a stored newline is dropped from the field's text and the trimmed single line commits on blur (`EditableInput.tsx:97-102`).

---

#### Task 3: Hover Accessories (Tension 6)

##### The Reveal Mechanism

A `data-reveal-host` sets `--reveal: 0` and `--reveal-hits: none`; `[data-reveal-host=""]` flips both on `:hover` or `:focus-visible`, and `"on"` forces them (`UIX/Interactions/hover-reveal.css.ts:12-13`). Under `(hover: none)` an empty-string host is shown at rest (`hover-reveal.css.ts:14`). A drag source hides its host (`:15`). `revealTarget` reads those variables (`:20-25`); `revealDim` holds the target at ghost opacity and lifts it to full on its own hover (`:27-35`). `Guidelines/Interface-Styling.md:8` makes this the one sanctioned reveal path. Every host resets the variables, so a nested host scopes its own targets.

##### Inventory Inside a Table Cell or Card Value

| Control | Where | Reveal | Source |
| --- | --- | --- | --- |
| Chip × (Select, Multi-Select, Context, File) | Inside the chip, over its tail | `HoverRemove reveal='self'`: the button is its own host, an absolute zone over the right 33% of the label | `Cell.tsx:80`, `:95`, `:115`, `:153` → `UIX/Labels/Label.tsx:49`, `:62-66` → `UIX/Interactions/HoverRemove.tsx:34-37`; zone in `UIX/Interactions/hover-remove.css.ts:20-30` (`removeZone`) |
| Row grip | In the lead cell, positioned into the left gutter | `revealTarget` against the row host | `TableView.tsx:653`, `:705-718`; `Core/Views/Table/table-view.css:49-65` |

The chip × is suppressed on Compact-look option chips (`Cell.tsx:68`) and on cards where inline remove is off (`CardValue.tsx:165`). `CardsView`, `CardValue`, and `UIX/Cards/Card.tsx` declare no reveal host; a view mounted in a View tile sits inside the tile's host (`Core/Tiles/Surfaces/ViewTile.tsx:589`, `:644`), so a card value's nearest host there is the whole tile, and on a container page it has none.

##### Precedents Outside Cells

- **OptionRow:** a trailing `square-pen` `Button` styled `optionEditButton = style([accessoryButton, revealDim])` in a `LineRow` host (`Core/Properties/Schema/OptionRow.tsx:35`, `:45-53`; `UIX/Menus/frames.css.ts:161`). It's the existing `square-pen` reveal precedent, in a menu row.
- **Button `reveal`:** `Button` wears `revealTarget` when `reveal` is set (`UIX/Buttons/Button.tsx:27`, `:64`).
- **BrowseButton:** an always-visible trailing `Button` in `InputField`'s `trailing` slot (`UIX/Fields/PathField.tsx:7-26`, `:50`; `UIX/Fields/InputField.tsx:96`), not hover-revealed; it stops propagation itself (`PathField.tsx:20-22`).
- **MarkdownPM tables:** per-row and per-column hosts set to `"on"` from hover state (`Core/MarkdownPM/Tables/MarkdownTable.tsx:593`, `:615`) — a per-cell-scope reveal inside a grid, on a different surface.

##### What a Hover `square-pen` Would Reuse and What's New

| Reused | New |
| --- | --- |
| `revealTarget` or `revealDim`, and `Button reveal` | A reveal host scoped to the cell or card value. The table's only host is the row (`TableView.tsx:653`), so a target inside a cell reveals on row hover, every Text cell in the row at once; a card value's nearest host is the View tile (`ViewTile.tsx:589`) or nothing, so a target there reveals on tile hover or never |
| `(hover: none)` pin (`hover-reveal.css.ts:14`) | On touch the pin shows every Text cell's glyph at rest |
| `square-pen` (`UIX/Symbols/index.tsx:148`) | A seat inside a box that clips: `.data-cell` and `.card-value` are `overflow: hidden` (`table.css:74`, `cards-view.css:106`), so the glyph sits in the cell's box and takes width from the text, or overlays the tail as `removeZone` does |
| Propagation guard pattern (`BrowseButton`, `HoverRemove.tsx:39-46`) | Stopping the cell's `onClick` (`TableView.tsx:693`) and the row drag handle (`TableView.tsx:656`), and on cards the whole-card drag (`CardValue.tsx:141`) |
| — | The intent the glyph fires (Task 1) |

No table cell has a trailing control: the title cell renders `OverScroll` of icon and text only (`Cell.tsx:43-49`), and its one accessory, the grip, leads into the gutter.

---

#### Task 4: Compact Card Row and Bordered Field

##### Two Meanings of Compact

The label-less flow is `isCompact(view)`, `format === 'compact'` (`Core/Views/views.ts:35-36`), rendering `.card-props.is-flow` (`CardsView.tsx:688`, `:707-713`). The `.cards-view.is-compact` class is a separate axis — Card Image **None** (`CardsView.tsx:171`) — and retunes `--card-row-h`, `--card-min-rows`, and the foot height, and drops the text block's top border (`cards-view.css:14-20`, `:63-65`). Nathan's "Compact cards" is the first.

##### How Compact Packs

`.card-props.is-flow` is a wrapping flex row (`cards-view.css:77-82`); each value is a `<span>` child made a centered flex container with `min-width: 0` (`cards-view.css:84-88`). Standard is a column of `.card-prop-row`s, label left and value pushed right by `justify-content: space-between` (`cards-view.css:89-95`; `CardsView.tsx:714-723`).

##### Full-Width Precedent

A full-width row exists today for one case: a Number drawn as a Bar. `.card-props.is-flow > span:has(.cell-bar) { flex-basis: 100% }` and `.card-value:has(.cell-bar) { flex: 1; width: 100%; overflow: visible }` (`cards-view.css:116-123`). A Text row would need the same kind of hook keyed to its own renderer class.

##### Blanks on Compact

`shownColumnsFor` drops every blank value on a Compact card except a Checkbox (`cardValueInput.ts:23-37`), and an open value picker on a blank Compact value is closed (`CardsView.tsx:211-218`). An empty Text can't appear on a Compact card; it enters through the add-picker (`CardsView.tsx:918-919`), whose reveal opens the `TextPicker` popover (`CardsView.tsx:526`). The bordered field would show only once a value exists.

##### Where `InputField` Bordered Is Used

| Consumer | Source |
| --- | --- |
| `PathField` (Settings asset and excluded directories, the File editor, the Value Picker's file pane) | `UIX/Fields/PathField.tsx:45-46`; `Core/Settings/AssetDirectoryRow.tsx:19`, `Core/Settings/ExcludedDirectoriesRow.tsx:68`, `Core/Properties/Schema/FileEditor.tsx:30`, `Core/Properties/Pickers/PropertyPicker.tsx:149` |
| ImagePicker path field | `Core/Assets/ImagePicker.tsx:267-268` |
| Filter-frame cells (the style, without `InputField`) | `Core/Views/Settings/filter-frame.css.ts:41`, `:91` |
| Dashboard showcase | `Dashboard/Leaves/FieldsLeaf.tsx:20`, `:27-28` |

Neither surface uses `InputField` today. The inline value editor is a bare `EditableInput` in `fillInput` (`PropertyValueInput.tsx:59-68`; `fields.css.ts:110-120`), transparent with no chrome, and `PropertyValueInput` takes no chrome prop. `InputField` has two chromes, `boxed` (default) and `bordered` (`InputField.tsx:34`, `:65`); no "clear" chrome exists. `field` sets `minHeight: 28px` (`fields.css.ts:26`), which `borderedField` inherits (`fields.css.ts:39-53`), against card rows of 20px Standard and 16px imageless (`cards-view.css:5`, `:15`). `InputField`'s edit mode is `RenamableLabel` → `EditableInput` (`InputField.tsx:75-92`; `UIX/Fields/RenamableLabel.tsx:1`, `:47`), an `<input>`, so the bordered position inherits tension 5.

##### What "Text Takes a Full-Width Row" Would Need

- A `flex-basis: 100%` rule on the Compact flow child, as the Bar has (`cards-view.css:116-118`), and the matching `.card-value` widening (`:119-123`), since `.card-value` is `nowrap` and `overflow: hidden` (`:100-107`).
- A seat for a bordered `InputField` inside `CardValue`, which today renders only `PropertyValueInput` or `Cell` (`CardValue.tsx:145-167`).
- A path for a blank Text on Compact, or the row appears only once filled (`cardValueInput.ts:30-36`).

---

#### Task 5: Wrap

##### The `wrap_titles` Chain

| Step | Source |
| --- | --- |
| Schema: optional boolean | `Core/Views/views.ts:261` |
| Default `false` | `views.ts:299` |
| Switch row, Cards only | `Core/Views/Settings/LayoutFrame.tsx:58`; Table's switches are Column Icons, Hide Borders, and Page Icons (`LayoutFrame.tsx:43-51`) |
| Read | `CardsView.tsx:776`: `mode={viewOption(view, 'wrap_titles') ? 'wrap' : 'scroll'}` |
| Render | `UIX/Cards/Card.tsx:72-77`: `wrap` drops the OverScroll and adds `is-wrap` |
| CSS | `UIX/Cards/cards.css:143-149`: `display: inline`, the icon set inline beside the text |

`TABLE_LAYOUT` is also the fallback for any view type without its own entry (`LayoutFrame.tsx:140`), so a switch added there reaches those types too.

##### Table Wrap Mechanisms

None. Every table value passes through a `nowrap` layer (Task 2): `.data-cell` (`table.css:76`), the OverScroll cap the title, text, link, date, and chip runs wear (`Cell.tsx:45`, `:74`, `:129`, `:142`, `:187`; `LinkCell.tsx:40`, `:71`), `.cell-chips` as a non-wrapping inline-flex (`table.css:194-203`), and the chip itself (`label-base.css.ts:35`). The HoverRemove melt twins are `nowrap` as well (`hover-remove.css.ts:62-74`, `labelMelt`).

##### What a "Wrap Cells" Toggle Would Touch

- A boolean in `savedView` (`views.ts:241-278`), which joins `ViewFlag` automatically (`views.ts:281-283`), and its default (`views.ts:296-310`).
- A `TABLE_LAYOUT` switch entry (`LayoutFrame.tsx:44-48`).
- A `.table-grid` class beside `no-borders` (`TableView.tsx:502-511`).
- Overrides at each `nowrap` layer for titles, links, and text; chips additionally need `flex-wrap` on `.cell-chips` (`table.css:194-200`), since each chip has a fixed height.
- The title cell's icon-in-scroller arrangement (`table.css:175-185`), which assumes one line.
- The sweep measures live row rects (`Core/Views/Table/cellSweep.ts:27-31`), so variable row heights need nothing there.

---

#### Tensions

| # | Tension | Verdict | Evidence |
| --- | --- | --- | --- |
| 1 | Sort | Can't speak | Outside this slice |
| 2 | Filters | Can't speak | Outside this slice |
| 3 | Cascade | Can't speak | Outside this slice |
| 4 | Validation | Partly in slice: confirmed for the edit path | `parseEditorValue` returns `undefined` for a type it doesn't list (`parseEditorValue.ts:30`), so a Text field reads invalid on every keystroke and commits nothing until it has an arm |
| 5 | Newline loss in `<input>` | Confirmed on every in-place path | Table and card inline: `EditableInput` `<input>` with `.trim()` on blur (`EditableInput.tsx:49`, `:97`); popover and add-picker: `TextPicker` → `EditableInput` (`UIX/Pickers/TextPicker.tsx:30`); bordered `InputField`: `RenamableLabel` → `EditableInput` (`RenamableLabel.tsx:47`). No `<textarea>` or `contentEditable` exists in `Core/Views`, `Core/Properties`, or `UIX/Fields`. The resting render collapses newlines too (Task 2) |
| 6 | No cell hover accessory | Confirmed, refined | Cells carry the chip × (`HoverRemove`), so hover accessories exist inside cells; what's absent is a cell-level trailing control and a cell-scoped reveal host — the table's host is the row (`TableView.tsx:653`), and a card value's nearest host is the View tile (`ViewTile.tsx:589`) or none |
| 7 | Native menu | Confirmed: an arm is required | `baseCellMenu` is exhaustive over value kinds with no default (`cellMenu.ts:65-84`), so a Text kind won't compile without one; an "Edit in TextPane" row would also need a `CellMenuAction` and a `MENU_INTENTS` entry (`valueClick.ts:54-59`). The card menu appends Remove via `hideable` (`cellMenu.ts:49-52`, `:90-92`) |
| 8 | Non-string adoption | Can't speak | `decodeValue`'s string kinds accept only `typeof raw === 'string'` (`propertyValue.ts:77-79`); the adoption question sits outside this slice |
| 9 | Foreign recognition | Can't speak | Outside this slice |

**Sweep:** `startSweep` returns false when `pickKindOf` is `null` (`TableView.tsx:326-327`), so a Text column would never sweep, as Number and Link don't.

---

#### Missing

- A multi-line editor on any value surface: no `<textarea>`, `contentEditable`, or MarkdownPM seat in `Core/Views`, `Core/Properties`, or `UIX/Fields`.
- A `text` arm in `editorText` and `parseEditorValue` (`parseEditorValue.ts:7-31`).
- A `text` arm in the compile-forced maps and switches listed in Task 1.
- A `ValueIntent` for opening a panel editor, and a popover seat in `PropertyValueInput` for anything but `NumberValuePicker` and `TextPicker`.
- A multi-line resting renderer for a cell or card value, and any line clamp.
- Inline-Markdown rendering at rest; `[[connections]]` read only as a whole value (`LinkCell.tsx:36-37`).
- A cell-scoped reveal host in the table, and a card- or value-scoped reveal host on cards.
- A trailing control in any table cell.
- A Compact full-width row for anything but the Number Bar.
- A blank-value path on Compact cards besides the add-picker.
- A "clear" `InputField` chrome; and any `InputField` on cards or in cells.
- A table wrap option; `wrap_titles` is Cards-only.
- `WIDTHS` and `DEFAULT_ALIGN` entries for `text`.

---

#### For Figma

- **Resting Cell:** one line with an ellipsis or the OverScroll lane, a first-line excerpt, or a wrapped block; what a newline and Markdown markers look like when flattened.
- **Glyph Seat:** whether the `square-pen` takes width from the text or overlays its tail as the chip × does, and its look at rest on touch where `(hover: none)` pins it.
- **Glyph Scope:** revealing per cell or per row.
- **Column Bounds:** Text's `min`, `default`, and `max` width, and its default alignment.
- **Standard Card Row:** a multi-line value beside a left label in a `space-between` row.
- **Compact Card Row:** the full-width Text row's look, and the bordered field's 28px minimum against 16–20px rows.
- **Bordered Versus Clear:** the bordered field appearing only on Compact cards while every other in-place editor is chromeless.
- **Wrap Cells:** wrapped rows' rhythm, wrapped chip runs, and the title icon on a multi-line title.
- **Editing State:** the in-place field's look for a value longer than the cell, and TextPane's anchor relative to the cell or card.
