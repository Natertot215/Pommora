### List View — Investigation

**DATE:** 11-09-2026
**HEAD:** `4b18149ac`, a clean tree apart from this planning folder.

This document reconciles five planning scouts — the row, values on the row, the settings panes and saved-view state, wrapping, and everything outside the renderer that knows about view kinds — against the code at `4b18149ac`, read against *List View — Brief* and *List View — Decisions & Intention*. It states how the code works today as fact and anything proposed as intent ("should"). *List View — Scout Findings* holds the cleaned reports and the record of what was corrected in them.

---

#### What's True

##### The Kind Record and Its Readers

**One Record per Kind:** `ViewKindRecord` holds `Renderer`, `nests`, and `layout: { leaf: 'visibility' | 'switches'; switches; rows? }` (`Core/Views/Host/viewKinds.ts:15-23`). `BUILT_KINDS` holds Table and Cards (`viewKinds.ts:25-28`), and `presentedKind` falls back to Table (`viewKinds.ts:30`), so a view saved as List draws as a Table today. `ViewHost` is the only place a renderer is chosen (`Core/Views/Host/ViewHost.tsx:14`).

**The Two Records:** Table states `nests: true`, `leaf: 'visibility'`, and Column Icons, Hide Borders, and Title Icons (`Core/Views/Table/tableKind.ts:4-15`). Cards state `nests: false`, `leaf: 'switches'`, four switches, and Card Image, Card Style, and Card Scale rows (`Core/Views/Cards/cardsKind.ts:20-60`). The Title Icons entry is written identically in both (`tableKind.ts:12`; `cardsKind.ts:28`).

**What `nests` Decides:** band nesting in the pipeline (`Core/Views/Pipeline/group.ts:150`), Sub-Group (`group.ts:219`; `Core/Views/Settings/GroupFrame.tsx:256`), the reserved Location sort (`Core/Views/Settings/SortFrame.tsx:71`; `group.ts:210`), the band-drop nest zone (`Core/Views/Bands/bandModel.ts:349`), and a None row under Group By, offered only to a kind that doesn't nest (`GroupFrame.tsx:169`). A kind with `nests: true` behaves exactly as Table in all five.

**What `leaf` Decides:** it has one reader, the editor door's Layout ternary (`Core/Views/Settings/ViewFrame.tsx:202`); the toolbar door's `LayoutFrame` ignores it (`Core/Views/Settings/LayoutFrame.tsx:70-82`).

**The Inert Tiles:** the type grid maps all six `VIEW_TYPES` and acts on a tile only when `t in BUILT_KINDS` (`LayoutFrame.tsx:27-33`), so registering a List record makes its tile live with no other change. An unknown type string decodes to `'table'` (`Core/Views/views.ts:166`), and new views mint as Table (`views.ts:395-409`).

##### The Table Row

**The Shell:** `TableView` roots at `div.table.table-shell` holding one `LineZone` over `div.table-grid` (`Core/Views/Table/TableView.tsx:162-175`). `.table-shell` pulls left by `--rail-inset − --content-inset`, pads by `--content-inset`, and scrolls sideways (`Core/Views/Table/table-view.css:3-14`); `--content-inset` is defined in Core (`Core/Interface/styles.css:57`), and no UIX file references it. ArchiveView imports Table's sheet across folders to wear the same shell (`Core/Archive/ArchiveView.tsx:14,60`).

**The Row Frame:** each row is a `LineRow` carrying `data-rid`, `data-reveal-host`, `.data-row`, `.selected`, `.row-lead`, and `rowHover` (`TableView.tsx:303-311`). `.data-row` is a grid over `--cols` with a top hairline that `.row-lead` drops, a hover wash, and a selected wash (`UIX/Table/table.css:4-9,110-125`); Hide Borders removes the hairlines (`table.css:127-129`).

**The Lead Cell:** column 0 renders through `RowLead`, which indents by `paddingLeft` and seats a `.row-rail` hover slot in the gutter (`UIX/Table/RowLead.tsx:5-25`). The grip is an inline span in `TableView` (`TableView.tsx:372-389`), positioned by shared CSS at `left: −var(--rail-inset)` and `top: 50%` (`table.css:183-194`). Column 0 is the first shown column, not necessarily Title: every header starts a column drag (`TableView.tsx:184`), the drag persists through `placeInShown` with Title included (`Core/Views/Table/useColumns.ts:225-237,299-308`), and the lead indents only when its column is left-aligned (`TableView.tsx:373`).

**The Title:** an icon and `RenamableName` inside an OverScroll `cell-title` (`TableView.tsx:318-331`). A click anywhere in the title's cell opens the page (`TableView.tsx:358-364`).

**The Band Walk:** `renderRows` recurses groups, places each run by `memberIndent`, inserts the ghost row after the hovered row, and wraps each run in `GroupBand` (`TableView.tsx:109-160`); nothing in it reads columns. The ghost row loops the columns it's handed (`TableView.tsx:217-262`). All three are private to `TableView.tsx`.

**Archive's Row:** Archive and Trash already draw a one-line "title left, trail right" row on the same vocabulary: a `LineRow.data-row` whose `RowLead` holds a check, the title with `margin-right: auto`, and a trail capped at 55% (`Core/Bundles/BundleTable.tsx:262-318`; `Core/Bundles/bundle-table.css:9-27`). Bundles imports Table's `COLUMN_LAYOUT` for its track widths (`BundleTable.tsx:33,123-129`).

**Menu Rows Aren't This Row:** `MenuItem` takes a closed prop list with no `data-*` (`UIX/Menus/MenuRows.tsx:68-92`), wears a rounded inset hover (`UIX/Menus/menu-row.css.ts:34-41`), and indents from an 8px base (`MenuRows.tsx:13-17`), where Table's rows bleed their wash and indent from the gutter. A `ListRow` type already exists (`UIX/Menus/useListEdit.ts:4`).

##### Bands, Indentation, and Rails

**Indentation:** a row's indent is `memberIndent(kind, depth)`, `rowIndent(depth+1)` under a headed band and `--loose-inset + rowIndent(depth)` in a headerless tail (`Core/Views/Bands/bandModel.ts:193-199`); `rowIndent` steps by `--disclosure-indent`, 14px (`UIX/Table/rowIndent.ts:2`; `UIX/Theme/theme-vars.css.ts:114`). A band head indents by an inline `paddingLeft` (`Core/Views/Bands/GroupBand.tsx:147`).

**`GroupBand`:** a tail is a bare `Reveal`; a headed band is a `LineRow` head with chevron, glyph, and, on Set bands only, a raw `Button size="button-inline" icon="plus" reveal` that creates a page in the Set (`GroupBand.tsx:95-102,149-208`; `Core/Views/Host/useViewCreation.ts:170-176`). Its color is a hand rule (`Core/Views/Bands/group-band.css:46-48`). Table scopes the band rhythm and the sticky head in its own sheet (`table-view.css:48-62`); Cards scope theirs (`Core/Views/Cards/cards-view.css:23-29,44-57`).

**`Reveal`'s `fill`:** without `fill` the implicit column is `max-content` (`UIX/Animations/Reveal.tsx:5,51`). Table's bands and ghost row omit it (`TableView.tsx:151-156,233`); Cards pass it (`Core/Views/Cards/CardsView.tsx:297,341`). The body box clips until the reveal settles (`Reveal.tsx:62`).

**The Indentation Rail:** `railRow` has one consumer, `DisclosureRow` (`UIX/Menus/DisclosureRow.tsx:7,114`). It pads its box by 18px and draws a `::before` line at 12px from the `--list-outline-*` tokens (`UIX/Elements/disclosure.css.ts:4-5,20-35`; `UIX/Menus/menu-row.css.ts:15`). MarkdownPM's outline rails read the same tokens (`Core/MarkdownPM/markdown-pm.css:418-440`). No view draws a rail, and no saved-view field toggles one (`views.ts:160-196`).

##### Values on an Item

**`Cell`:** one renderer draws every type on every surface (`Core/Properties/Cells/Cell.tsx:24-178`). A checkbox always draws (`Cell.tsx:51-58`); chips sit in an OverScroll run gapped by `--labels-gap`, 4px (`Core/Properties/Cells/cells.css:70-79`; `UIX/Labels/label-base.css.ts:127`), each chip's text capped at 85px (`label-base.css.ts:23,125`); two or more removable chips reorder on an x-axis `SortableZone` (`Cell.tsx:180-216`). A Text value's host and a bar are `width: 100%` and own no width (`cells.css:8-14,95-100`). `empty` is each surface's own: none in Table, `caption.emphasized` on Cards, `caption.standard` in the panel (`CardsView.tsx:549-553`; `Core/Properties/PropertyPanel.tsx:264`).

**The Seat:** `useValueSeat` owns a value's click, right-click, editor, popover, picker, and Add list (`Core/Properties/Pickers/ValueSeat.tsx:93-319`), configured per surface through `SeatHost` (`ValueSeat.tsx:42-70`) and once for views in `useViewInteractions` (`Core/Views/Host/useViewInteractions.tsx:476-486`). A click's meaning comes from `valueClickIntent`: options and Date open a picker, Number, Text, and Link edit inline, Checkbox toggles, File opens a dialog, and a `filedata` type (Title, Created, Modified) does nothing (`Core/Properties/Pickers/valueClick.ts:19-45`; `Core/Properties/properties.ts:53-55`). A click with no intent returns false and isn't stopped (`ValueSeat.tsx:138,162-169`). `openAdd` does nothing when nothing is addable (`ValueSeat.tsx:194-199`), and `MetadataPicker` mounts only where a surface passes `add` (`ValueSeat.tsx:349`).

**Cards' Policy:** a committed non-blank value reveals its property, Remove hides it from the view, the option picker centers on the click, and Add lists `cardAddColumns(shownColumnsFor(row, columns, isCompact(view)))` (`CardsView.tsx:145-170`). `shownColumnsFor` drops blank values in Compact except a type whose blank draws (`Core/Views/Cards/cardColumns.ts:6-17`); `cardAddColumns` lists fillable entries ahead of show-only ones (`cardColumns.ts:19-34`). Table's policy has no `add` or `hide` (`TableView.tsx:80-88`). `shownColumnsFor` also drops Title from what it returns (`cardColumns.ts:13`), so a caller that orders Title among its values composes it separately.

**The Seated Value:** the click, menu, editor swap, and `Cell` wiring is hand-written on Cards as `span.card-value.value-seat[data-drag-slop]` (`CardsView.tsx:534-560`) and in the panel as `span.value-seat[data-property-row]` (`PropertyPanel.tsx:251-268`). `.value-seat` is already the shared class (`cells.css:58-69`); its box rules sit in Cards' sheet as `.card-value` (`cards-view.css:128-135`).

**Drag Slop:** every drag item begins with `'item'` activation (`UIX/Interactions/engine.tsx:1053`), which raises the threshold from 5px to 12px for a press inside `[data-drag-slop]` (`UIX/Interactions/gesture.ts:6-7,29-37`; `UIX/Interactions/shared.ts:12`). Table's value cells don't carry it, and its option cells take the press for the sweep instead (`TableView.tsx:73-78,355-357`).

**Compact Cards' Flow:** a wrapping flex row with a literal `gap: 4px 4px` marked KNOB (`cards-view.css:94-99`), where Text values and bars take a full line (`cards-view.css:136-139`) and no divider sits between properties (`CardsView.tsx:561-572`). Add opens from a click on empty card space, in both formats (`CardsView.tsx:531-533,677-683,771-777,835`); Cards have no **+**.

**Show and Hide:** `revealProperty` and `hideProperty` on the host call `unhide` and `hideShown` (`Core/Views/Host/useViewHost.ts:152-161`; `Core/Views/Pipeline/columns.ts:115-131`).

##### The Hover Plus

**Reveal:** a `[data-reveal-host]` sets `--reveal`, and a target fades with opacity, keeping its layout slot; `[data-reveal-held]` pins it shown (`UIX/Interactions/hover-reveal.css.ts:5-25`). A `.data-row` is already a reveal host (`TableView.tsx:308`).

**Two Spellings:** the band's raw `Button … reveal` (`GroupBand.tsx:191-203`) and `AccessoryButton`, which is that same `Button size="button-inline"` with `paddingX="0"`, tertiary color, `create`, `reveal`, and a stopped click (`MenuRows.tsx:285-330`; `menu-row.css.ts:278-281`). The panel's **+** is an `AccessoryButton create` gated on something being addable and toggled by className rather than `data-reveal-held` (`PropertyPanel.tsx:289-311`).

##### Separators

`Segments` draws an inline span before every part after the first, spaced by `marginInline: 6px` (`UIX/Elements/Segments.tsx:4-16`; `UIX/Elements/segment.css.ts:12-19`); the base `segment` sets a width but no height (`segment.css.ts:4-10`). `FieldRun` spaces by its gap and stretches its divider against the run (`UIX/Fields/field-run.css.ts:1,12-20,34`), with entries tied to `PlainLabel` (`UIX/Fields/FieldRun.tsx:6-31`). No `SegmentRun` exists. The `--segment-*` and `--list-outline-*` defaults resolve to the same 2px, `border.light`, full radius (`segment.css.ts:7-9`; `theme-vars.css.ts:129-131`).

##### Right-Click, Style, and Format

A value's menu offers one style submenu for options, Date, Number, and Checkbox (`Core/Actions/cellMenu.ts:63-73,101-104`; `Core/Actions/columnMenu.ts:88-92`), labeled Format for Date, Link, and the stamps and Style otherwise (`Core/Properties/typeDisplay.ts:22,30,33-34`), with Clear and Remove after it (`cellMenu.ts:77-86`; `Core/Actions/connectionMenu.ts:70-79`). A Link value's menu carries no style (`cellMenu.ts:55-56`) and the connection menu suppresses Format on a value (`connectionMenu.ts:98`), so a Link's per-view display is reachable only from Table's header (`useColumns.ts:198-224`); the property-wide Link display is set in the property's own editor (`Core/Properties/Schema/typeRows.tsx:196-198`) and is a column's default (`Core/Properties/columnStyles.ts:111-119`). Looks and date formats live per view in `column_styles`, pruned to non-default picks (`columnStyles.ts:99-109,132-157`).

##### Order, Visibility, and Hidden Places

`property_order` is the one order every kind reads, and `hidden_properties` flags (`columns.ts:63-83`). `hideShown` flags without moving, its comment promising the slot is remembered (`columns.ts:115-122`), and `unhide` appends a never-ordered id (`columns.ts:124-131`). `placeInShown` rewrites the order as the shown list followed by everything else (`columns.ts:101-113`), pinned by its test (`Core/Views/Pipeline/columns.test.ts:234-241`), so the next column drag or Visibility reorder sends every hidden id to the tail; its callers are Table's column drop and Visibility's drop (`useColumns.ts:299-308`; `Core/Views/Settings/VisibilityFrame.tsx:97`). Visibility draws hidden rows in a separate bottom group in registry order (`VisibilityFrame.tsx:62-66`; `columns.ts:85-97`).

##### The Saved-View Schema

`savedView` is one flat loose decoder in which kind-specific fields sit beside shared ones (`views.ts:160-196`); `format` is stored on every view and read only by Cards (`views.ts:38-39,189`). Every boolean is a `ViewFlag` needing a `VIEW_DEFAULTS` entry (`views.ts:200-230`). Per-id maps are registered twice, in `ENTRY_KEYS` (`views.ts:249-253`) and in `mergeViewEdit`'s depth table (`views.ts:294`). `ROLES` must name every field at compile time, and an `idMap` or `idList` role inherits the property-delete cascade (`Core/Nexus/configReach.ts:46-81`). Table's alignment resolves as a stored override over a Table-owned per-type default (`useColumns.ts:34-48,70-71`).

##### The Settings Panes and Their Two Doors

**`VIEW_PANES`:** Visibility, Layout, Group, Filter, Sort (`Core/Views/Settings/ViewPane.tsx:27-33`), dispatched by `ViewPane` (`ViewPane.tsx:56-91`).

**The Toolbar Door:** SettingsFrame lists Properties and every `VIEW_PANES` row for every kind, over a View Scale footing outside a tile (`Core/Views/Settings/SettingsFrame.tsx:42-45,86-109,125`). Its Layout is the type grid, the kind's switches, and the kind's rows in the footer, with no property list (`LayoutFrame.tsx:70-82`).

**The Editor Door:** the per-view editor's root holds the name, the type grid, Layout, Group, Filter, and Sort, and the kind's rows in its footer (`ViewFrame.tsx:147,167-194`). Its Layout opens `VisibilityFrame` relabeled "Layout" with the switches below for Table, and the switches alone for Cards (`ViewFrame.tsx:199-220`); `VisibilityFrame`'s `footer` and `current` exist for that call (`VisibilityFrame.tsx:70-77`).

**History:** the Views Cleanup confirmed the two doors "keep their current split" (F-1) and rejected moving the type grid into Layout (`git show 4b18149ac^:".claude/Planning/Views Cleanup/Views Cleanup — Decisions & Intention.md"`, lines 69 and 102). Its scout found no stated reason for the Cards gap (`…/Scouts/5 — Settings Panes & Picker Menus.md`, line 81), and its final review flagged the Layout pane as composed two ways, with `leaf` read by one ternary (`…/Views Cleanup — Final Report.md`, lines 127 and 171).

##### Pane Drag Machinery

A zone is either displacement or a line, never both (`engine.tsx:125-127`), and a loose line drag can land only in a foreign displacement zone (`engine.tsx:310-315,574-581`), so two line zones can't trade rows. Line geometry measures each row's left and right (`engine.tsx:247-269`), but lanes are ordered and picked by y alone (`UIX/Interactions/reorderModel.ts:89-98`; `UIX/Interactions/lineList.ts:38-41`; `UIX/Menus/paneDrop.tsx:26-38`). A line zone steps by keyboard on Up and Down only (`engine.tsx:1018`) at a fixed `cursor.x` seeded at 0 (`engine.tsx:693,960-999`). Visibility already runs two vertically stacked lanes in one zone (`VisibilityFrame.tsx:62-66,107-118`; `paneDrop.tsx:16,50-83`).

A displacement zone trades items with another of its family: `DisplaceSpec` carries `family`, `accepts`, and `receive` (`engine.tsx:91-99`), an admitting zone must be a displacement zone holding all three (`engine.tsx:310-315`), and Cards' bands and the tab rows trade this way today (`Core/Views/Cards/CardsView.tsx:297-308`; `Core/Navigation/tabRows.tsx:113,126`). A held displacement item steps by arrow keys within its own zone only (`engine.tsx:948-957`), and a move between zones is pointer-only (`.claude/Features/PommoraDND.md:60`). No settings pane holds a displacement zone today, and *PommoraDND* names the settings frames among the drop-line surfaces (`PommoraDND.md:38`).

##### Pane Sizing

A settings pane has a 225×245 floor and a 440px height ceiling and no width ceiling (`UIX/Menus/frames.css.ts:84-86`); each slot sizes to its content and the width animates on the slide (`UIX/Menus/FrameSlide.tsx:55-67,92-117`). FilterFrame grows to content up to 420px (`Core/Views/Settings/filter-frame.css.ts:11-20`; `UIX/Menus/frameGrowth.ts:2-8`). The middle region holds eight rows before scrolling (`frames.css.ts:88-102`).

##### Width, Wrapping, and Row Height

Every title, chip run, date, number, and link sits in an OverScroll cap, `nowrap` with its width cap left to the consumer (`UIX/Interactions/over-scroll.css:1-15`). A Text value shows its first line (`Core/Properties/Cells/TextCell.tsx:75-85`). Its pen is absolutely placed, but showing it adds `--pen-room` (24px) to the text's box, as a margin outside a table cell and as padding inside one (`cells.css:15-21,33-57`). The inline editor and the title's rename field size to their text (`UIX/Fields/fields.css.ts:144-148`; `Core/Properties/Pickers/PropertyValueInput.tsx:73`; `TableView.tsx:326`). A chip's × overlays its chip (`UIX/Interactions/hover-remove.css.ts:20-31`).

Rows take their content's height (`table.css:4-9`; `UIX/Table/table-tokens.css:2-27`). The row drag measures live rects (`engine.tsx:247-269`), and the glide to a new row reads its live height (`useViewCreation.ts:88-103`). The grip, check, and chevron center on the row's full height (`table.css:183-194`). The one virtualizer seam is fixed-height by contract (`UIX/Interactions/virtualRows.ts:4,31`), and no view virtualizes (`.claude/Features/ViewTypesPM.md:174`).

Table decides it overflows by summing clamped column widths against the shell, deliberately avoiding `scrollWidth` (`useColumns.ts:138-164`).

##### The Shell and Embed Readers

**Shell Selectors:** the gutter-reserving lead inset and zero top padding key on `.detail-body:has(.table-head)`, and Cards' lane on `:has(.cards-view)` (`Core/Interface/interface.css:58-66`); the banner divider's full bleed keys on `.detail-scroll:has(.table-shell)` (`Core/Interface/Header/content-banner.css:94-98`).

**Embed Zoom:** Table reads `--view-embed-zoom` and Cards `--embed-zoom` (`table-view.css:29-31`; `cards-view.css:14-15`); the first is the second times 15/13, normalizing table body text to the editor's on purpose (`Core/Settings/personalization.ts:65-67`).

**Undocumented Contracts:** creation's glide finds the newborn by `data-rid` (`useViewCreation.ts:97`), and the tile peek anchors on the first `[data-view-lead]`, counting a `row` lead's columns by `offsetTop` (`Core/Tiles/Surfaces/ViewTile.tsx:68-81`). Table puts it on its head (`TableView.tsx:177`), bands on their row (`GroupBand.tsx:144`), Cards on every card (`CardsView.tsx:808`). *ViewTypesPM §The View Host* names neither (`ViewTypesPM.md:71`).

##### Tests, Drives, and Documents

**Tests:** `ViewFrame.test.tsx:296-314` runs `it.each` over Table and Cards for the Layout leaf, and `useViewHost.test.tsx:588` names a "cards seam" that pins `nests`. No test pins the set of built kinds, the Table fallback, or an inert tile (only `ViewFrame.test.tsx` and `SettingsFrame.test.tsx` import `presentedKind` or `BUILT_KINDS`). Seven test files query the row classes: `cellGestures`, `useViewHost`, `rowDrops`, `bandDrops`, `ArchiveView`, `TrashFrame`, and `BundleTable`.

**Drives:** `Views Drive/live-drive.mjs` is 2,370 lines, and its matrix crosses each behavior with each surface and cites the deleted Views Cleanup plan (`.claude/scripts/Views Drive/MATRIX.md:3,9`). `List Types Drive` is MarkdownPM's list-types drive (`.claude/scripts/List Types Drive/MATRIX.md:1-3`).

**Sentences That Become False:** `ViewTypesPM.md:4`, `:8`, `:47`, `:62`, `:67`, `:79`, `:91`, `:95`, `:97`, `:159-161`, and `:174`; `PommoraDND.md:38`; `PropertiesPM.md:115`; `PommoraPRD.md:151`; `FrameworkPM.md:21`. `PommoraPRD.md:149` is already false: the active view is the sidecar's `active_view` (`Core/Nexus/containerFields.ts:55`; `views.ts:414-419`).

##### Real Data

No JSON file under `~/Test` or `~/NexusOS` holds `"type": "list"` (14 and 177 sidecars searched, plus every other JSON file, where the same search finds Table and Cards views), so no saved view changes look when List gains a renderer.

---

#### What Serves As It Is

- **The Host and Interactions:** `useViewHost`, `ViewHost`, and `useViewInteractions` with its `listZone`, which reads row boxes from the DOM and indents its line by `memberIndent` (`useViewInteractions.tsx:396-417`); row drops, band drops, the page menu, creation, the ghost lifecycle, search, and View Scale come with them.
- **Grouping, Sort, and Filter:** every pane adapts through `nests`, so `nests: true` gives List exactly Table's grouping, including no Group By: None (`GroupFrame.tsx:169`).
- **`RowLead`, `rowIndent`, `memberIndent`, and the `.table` vocabulary:** washes and gutter slots (`table.css:110-213`); List wears `.table-grid.no-borders`, so it draws no hairlines (B-5).
- **Values:** `Cell`, the seat, `MetadataPicker`, the cell menu with one Style or Format submenu, which a Link value's right-click gains in every view (C-4), Clear and Remove, `column_styles`, `revealProperty`, `hideProperty`, and ⌘Z.
- **`--labels-gap`** as the spacing between values of one property, inside the brief's 4–6px.
- **Title Icons** (`hide_page_icons`) and **View Scale**, which is every kind's already.
- **Persistence:** the pending-record fold, duplication, tile embeds, and the delete cascade for any field given a role (`configReach.ts:46-81`).
- **The fallback machinery** for Gallery, Calendar, and Timeline, which A-3 keeps.

---

#### What's Private and Would Need Sharing

| Piece | Where It Lives | Who Would Share It |
| --- | --- | --- |
| The band walk | `TableView.tsx:109-160,197-200` | Table and List |
| The row frame, lead, and grip | `TableView.tsx:299-311,372-389` | Table and List; the lead slot stays "first column" for Table |
| The title markup | `TableView.tsx:318-331`, `:243-247` | Table and List |
| The ghost row | `TableView.tsx:217-262` | Table and List |
| The shell geometry and band rhythm | `table-view.css:3-31,48-62` | Table, List, and Archive |
| The seated value | `CardsView.tsx:534-560`; `PropertyPanel.tsx:251-268` | Cards, the panel, and List |
| The Add, reveal, and hide policy | `CardsView.tsx:145-170`; `cardColumns.ts` | Cards and List |
| The inline seat's box | `cards-view.css:128-135` | Cards and List |

---

#### Removal and Consolidation Candidates

| Candidate | Evidence | Visible? |
| --- | --- | --- |
| ArchiveView's cross-folder import of Table's sheet | `ArchiveView.tsx:14`; `table-view.css:1` | No |
| Two hand-written seated values become one | `CardsView.tsx:534-560`; `PropertyPanel.tsx:251-268` | No |
| `.card-value`'s base box rule becomes `.value-inline` in `cells.css` | `cards-view.css:128-135`; `cells.css:58` | No |
| `cardColumns.ts` leaves Cards' folder | `cardColumns.ts:1-34` | No |
| The band's raw `Button` and `.group-band-add` become `AccessoryButton` | `GroupBand.tsx:191-203`; `group-band.css:46-48`; `MenuRows.tsx:285-330` | Slightly: `paddingX="0"` changes the hit box |
| The panel's **+** uses `data-reveal-held` | `PropertyPanel.tsx:308`; `hover-reveal.css.ts:23` | No |
| The Title Icons entry written once | `tableKind.ts:12`; `cardsKind.ts:28` | No |
| Per-id maps registered once: `ENTRY_KEYS` and the depth table become one `ENTRY_DEPTH` record | `views.ts:249-253,294` | No |
| `placeInShown` places through `fullOrderIndex`, so hidden ids keep their slots | `columns.ts:101-113,115`; `columns.test.ts:234-241` | Yes, in Table |

Not removable: the fallback machinery (A-3), Table's overflow arithmetic (`useColumns.ts:138-164`), `column_alignments` (D-1), and the two embed-zoom variables (`personalization.ts:65-67`).

---

#### The Approach

- **The Row:** Table's row pieces should leave `TableView.tsx` for `Core/Views/Rows/RowFrame.tsx`, which Table and List compose. A List row should be one lead cell under `.table` and `.table-grid.no-borders` on one track, holding the grip and a line of two groups, with Title an item of the left group.
- **Values:** one `SeatedValue` in `Core/Properties/Cells/` should serve Cards, the panel, and List, with `data-drag-slop` once and `.value-inline` as the box of a seat on a line. The bar should be `Segments`, its segment given a height. One maximum, `--list-view-value-max`, should cap every value on List's sheet.
- **The Plus:** `AccessoryButton icon="plus" create reveal`, held through `data-reveal-held`, should serve the band, the panel, and the row, and should keep its slot at rest.
- **Width:** the title should shorten to a floor and then the left group scroll as one OverScroll lane. **Wrap Rows** should add `flex-wrap`, so the right group drops to a second line, flush right. A Text value should hold its pen's room at rest.
- **Sides:** `column_sides`, a per-view map over List's per-type default (`sideFor`), with `property_order` the only order. D-2's defaults depart from Table's alignment: Table centers dates (`useColumns.ts:45`) where List puts them right.
- **The Property Pane:** each kind's record should name its property pane. List's should be two side-by-side columns, each a displacement zone of one family, which trade rows with no engine change.
- **Outlines:** a headed band should state its indent as `--band-indent`, and List's sheet should draw one rail per nested band at its chevron from the `--list-outline-*` tokens.

---

#### The Assembled Shape

The scouts' recommendations compose into one shape once four collisions are settled.

**One Piece, Two Homes:** the seated value goes to a shared row file in Views (row scout) or to `Core/Properties/Cells/` (values scout); only the second reaches the panel, and `.value-seat`'s styles already live in `cells.css`. `cardColumns.ts` goes to a kind-neutral Views home (row scout) or `Pipeline/columns.ts` (values scout), beside `ItemColumns` and `itemColumns` (`columns.ts:44-61`), with the settings scout naming a List file after it. The shared homes hold for the seated value and `cardColumns.ts`; List's row line stays on its own sheet.

**The Shell Moves to UIX:** the row scout would move `.table-shell` into `UIX/Table/table.css` as "UIX tokens only", but it reads `--content-inset`, which Core defines (`styles.css:57`) and UIX never references. The shell should move to a Core-side sheet that Table, List, and Archive import.

**The Shell Brings What List Doesn't Want:** `.table-shell` scrolls sideways (`table-view.css:10`), which a wrapping row never needs, and the shell selectors key the wrong way for a headless shell: List would get the banner bleed meant for a heading's fill and miss the gutter lead inset (`interface.css:58-61`; `content-banner.css:94-98`). The inset should key on the gutter-bearing shell and the bleed on the heading.

**A Click With No Action Opens the Page:** a value whose click has no intent, such as Created or Modified, isn't stopped (`ValueSeat.tsx:138,162-169`), and in Table a click on the title's cell opens the page (`TableView.tsx:358-364`). With List's values inside that same lead cell, a click on a stamp or on the empty stretch would open the page, so the page-open should move to the title alone (B-3), as on Cards (`CardsView.tsx:810-815`).

**One Band Walk, Two Width Rules:** `GroupBand` already takes `fill` and hands it to its `Reveal` (`Core/Views/Bands/GroupBand.tsx:92,98,206`); Table's walk omits it and Cards pass it (`TableView.tsx:151-156`; `CardsView.tsx:297`). A shared band walk serving Table and a wrapping List should take `fill` from its renderer and pass it through.

**A Cap Against the Wrap:** the row scout caps the right group at `--row-value-reach`; under Wrap Rows a capped right group clips instead of wrapping. The cap should be per value, not per group.

**Estimates Don't Sum:** the row scout's +150–220 for List already contains the values scout's +30–40 and the wrapping scout's +40–60, and both the row and values scouts count the seated-value hoist. Unpriced: the side field and its defaults, the sides pane, any lane or keyboard change, the outlines rail, tests, the drive's List cases, and documentation. The work nets positive, about +1,120 / −505 as the plan measured it; the gain buys the third renderer itself, while the shared row frame, the single seated value, the one statement of the add, show, and hide rules, and the single **+** each leave one implementation where Table, Cards, and the panel hold two or three today, so the next row-shaped kind adds presentation alone.

**The Shape:**

- **Adds:** `ListView`, `listKind`, `listSides`, and `list-view.css`; `SidesFrame` and its sheet; `RowFrame.tsx` and `table-shell.css`; `SeatedValue`; `column_sides`, `hide_outlines`, and `wrap_rows`; `layout.Properties` and `leaf: 'pane'`; `TITLE_ICONS`.
- **Changes:** the shell selectors re-keyed; a hidden property keeps its place in every kind; the grip and check read `--row-first-line`; a Link's per-view Format on right-click; the documents' false sentences replaced.
- **Removes:** `cardColumns.ts` and its test; Table's private frame; Cards' policy and `commitOnCard`; two hand-written seats; `VisibilityGroups`; `.card-value`'s base rule; `.group-band-add`; `ENTRY_KEYS`; `SwitchEntry`; ArchiveView's import of Table's sheet.
- **Overruled Scouts:** the shell can't go to UIX; the right group takes no percentage cap; side defaults stay with List; the embed variables stay two; the pen's table form doesn't fix List's hover width; `Segments` serves only once its segment takes a height.

---

#### Where the Brief and Decisions Meet the Code

##### The Brief

- **`Core/Views/ListView`:** kinds live in kind-named folders with `XView.tsx` and `xKind.ts` (`Core/Views/Table/`, `Core/Views/Cards/`); the parallel path is `Core/Views/List/`.
- **"Reuse the same drag-handles, content inset":** both are private to `TableView.tsx` and Table's sheet; only indentation is shared (`bandModel.ts:193-199`).
- **`UIX/Menus` or a `ListRow`:** neither; the row is Table's frame (I-1).
- **"Like how CardView does it when Style = Compact":** Cards have no **+** in either format; Add opens from empty card space, and the band's **+** creates a page.
- **"SegmentRun":** doesn't exist, and `Segments`, read from its CSS, draws nothing in a flex row as written (measured: 2×0px as a flex item).
- **"Reusing the [spacing] on Cards":** Cards' gap is a literal KNOB; the token is `--labels-gap`.
- **"Single-click … opens its picker":** only options and Date open a picker.
- **"Text … max-widths … prompting the TextPane glyph":** the pen exists and shows on hover whether or not the text is cut off (`TextCell.tsx:61-100`); the max width doesn't.
- **"Format > / Style >":** one submenu per type, already on every value; a Link's per-view display is header-only.
- **"Hiding … would remember their position":** the flag keeps the slot; the next reorder loses it.
- **"Increase the LayoutPane's MaxWidth":** panes have no width ceiling; content sets it.
- **"This LayoutFrame would replace VisibilityFrame":** SettingsFrame's Layout has never held properties; the only Layout holding a list is the editor's, and only for Table.
- **"The same Scale options":** View Scale is every kind's already; Card Scale is Cards' own.
- **"Grow like tables do":** Table grows by summing fixed widths; List has none to sum.
- **"Grouping … identical to Table":** it is, including no Group By: None.

---

#### What Can't Be Known Without Running the App

- Whether List's wrapping rows hold with `fill` on their bands, read from `Reveal.tsx:5,51`.
- How wrapped rows reflow during a sidebar slide or pane resize, and whether content below shifts.
- Whether typing in the inline editor or a rename flips a row's wrap.
- The band **+**'s hit box after the move to `AccessoryButton`.
- List's top padding and gutter under re-keyed shell selectors, and the banner divider over a headless shell.
- Whether the tile peek resolves on a List row's `data-view-lead`.

---

#### Where Files Go

- **List:** `Core/Views/List/` — `ListView.tsx`, `listKind.ts`, `listSides.ts`, `list-view.css` (J-1).
- **The Row Frame and Shell:** `Core/Views/Rows/` — `RowFrame.tsx`, `table-shell.css` (J-2).
- **The Seated Value:** `Core/Properties/Cells/SeatedValue.tsx` (J-3).
- **Cards' Column Helpers:** `Core/Views/Pipeline/columns.ts`, as `drawnColumns` and `addColumns`; the add, show, and hide rules are built on the host in `useViewInteractions.tsx` (J-4).
- **The Two-Column Pane:** `Core/Views/Settings/SidesFrame.tsx` and `sides-frame.css.ts`, reading `propertyPane` from `VisibilityFrame.tsx` (J-5).
- **The Saved View's Fields:** `Core/Views/views.ts` (J-6).
