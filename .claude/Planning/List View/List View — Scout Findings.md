### List View — Scout Findings

**DATE:** 11-09-2026
**HEAD:** `4b18149ac`

The five read-only scouts dispatched to ground *List View — Brief*, each report cleaned against the code at `4b18149ac`: wrong claims corrected in place or removed, and a finding two reports share kept once, in the report whose domain owns it. *List View — Investigation* holds the reconciled state and the assembled shape.

#### The Scouts

| Scout | Domain |
| --- | --- |
| A — The Row | What a List row is built from: Table's row, bands, the shell, indentation, and rails |
| B — Values on the Row | What draws, edits, adds, hides, and styles a value, and the separators and **+** between and after them |
| C — Settings and Saved State | How a kind declares its settings, what a saved view stores, and the two-sided layout's cost |
| D — Width and Wrapping | What a row does when it runs out of width, and what assumes a row's height |
| E — Outside the Renderer | Every reader of a view's kind, the tests and drives that pin kinds, and the documents |

#### What Changed

**Corrected:**

- **A, the shell's new home:** A would move `.table-shell` into `UIX/Table/table.css` because it "only uses UIX tokens". It reads `--content-inset`, which Core defines (`Core/Interface/styles.css:57`) and no UIX file references, so the shell needs a Core-side home.
- **A, the lead cell:** A described column 0 as the grip plus the title. Table's lead is the first shown column; Title moves by column drag (`Core/Views/Table/TableView.tsx:184`; `Core/Views/Table/useColumns.ts:225-237,299-308`), and the lead indents only when its column is left-aligned (`TableView.tsx:373`). The extraction keeps the lead slot and the title markup apart.
- **A, `Segments` serving as-is:** removed. Read from its CSS, the inline span blockifies inside a flex row with no height (`UIX/Elements/segment.css.ts:4-19`), so B's reading holds, measured in the app: 2×0px as a flex item.
- **A, drag slop:** A inferred List's values wouldn't need `data-drag-slop`. Every drag item begins with `'item'` activation (`UIX/Interactions/engine.tsx:1053`), which honors it (`UIX/Interactions/gesture.ts:7,29-37`), so it takes effect on a `LineRow` as on a card.
- **A, the test count:** 18 and 7 selector hits hold, but seven test files query the row classes, not two.
- **A, three rename classes:** `titleInput` composes `fillInput` (`UIX/Menus/menu-row.css.ts:212`), so two of the three are one class with a drag region added.
- **A, the right group's cap:** A capped the right group at `--row-value-reach`; under wrapping a capped group clips rather than wraps, and a percentage can't cap a content-sized seat (`Core/Views/Cards/cards-view.css:117`). The cap belongs on each value.
- **B, Link format:** B said a List link couldn't be formatted. The property-wide Link display is set in the property's editor (`Core/Properties/Schema/typeRows.tsx:196-198`) and is every column's default (`Core/Properties/columnStyles.ts:116-117`); only the per-view override is header-only.
- **B, "hiding remembers position, nothing to build":** the flag keeps the slot (`Core/Views/Pipeline/columns.ts:115`), but `placeInShown` sends hidden ids to the tail on the next reorder (`columns.ts:107-111`), and Visibility draws hidden rows in registry order. C's reading holds.
- **B, the option menu's path:** `Core/Actions/optionMenu.ts`, not `Core/Properties/Pickers/`.
- **B, the side defaults' home:** B would put them on the shared per-type registry. Table's per-type alignment is Table-owned (`useColumns.ts:34-48`) and the shared registries hold type facts and display metadata, so C's reading holds; recorded under C.
- **C, the cascades:** an `idMap` field inherits the property-delete cascade only; the gone cascade keeps it (`Core/Nexus/configReach.ts:163-173`).
- **D, the pen:** D said List needs the table cell's overlay form of the pen. Both forms add `--pen-room` to the text's box, as a margin outside a cell and as padding inside one (`Core/Properties/Cells/cells.css:38-41,47-50`); a table cell's fixed track hides the growth, and a content-sized List seat wouldn't: measured, it grows 24px on hover in both forms, so List holds the pen's room at rest.
- **E, ViewTypesPM's List section:** at `:159-161`, not `:164-168`.
- **E, the embed-zoom variables:** E offered collapsing them; they differ on purpose, normalizing table body text to the editor's (`Core/Settings/personalization.ts:65-67`), so a List on Table's sheet takes Table's.
- **E, real data:** E's sidecar search was shallow. No JSON file under `~/Test` or `~/NexusOS` holds `"type": "list"`.

**Dropped Inferences:** claims a scout marked inferred and nothing downstream rests on were removed rather than carried: `remint.ts` never touching property ids inside views (C), vanilla-extract's serializable exports blocking a `rowIndent` move (A), a scroll-state query being unable to replace Table's overflow test (D), and the PRD's pipeline wording (E).

**Left Unopened:** these citations were carried from the reports without being reopened, and nothing recommended rests on them: the sidebar's `Disclosure.tsx:159-194`, the drives' line numbers other than the Views Drive's size and matrix header, the unaffected-documents list, `.claude/Benchmarks/view-band-hide.md`, `.claude/Resources/PommoraUIX.md`, `Core/Views/Settings/layout-frame.css.ts:7-21`, `placement.ts:53-69`, and commit `4a77ab628`.

**Deduplicated:** "no `SegmentRun`", "Cards have no **+**", and the **+**'s mechanics are kept under B; "Item Icons is Title Icons" and the `data-view-lead` contract under E; wrapping, the grip's centering, and virtualization under D; `leaf`, the pane split, and side storage under C; the `ListView` path and the `.data-cell` text rule under A.

**Settled Between Reports:** where A and B send the seated value and `cardColumns.ts` to different homes, the shared home holds, and List's row line stays on its own sheet (*List View — Investigation §The Assembled Shape*).

---

#### A — The Row

**Short Answer:** neither `UIX/Menus` rows nor a new `ListRow`. A List row is Table's row with its cells taken off, and Archive and Trash already draw a one-line "title left, trail right" row this way (`Core/Bundles/BundleTable.tsx:262-318`; `Core/Bundles/bundle-table.css:9-27`). Table's row pieces should leave `TableView.tsx`, where they're private, for one place Table and List compose.

##### What's There

- **The Shell:** `div.table.table-shell` over one `LineZone` and `div.table-grid` (`TableView.tsx:162-175`). `.table` is the token scope (`UIX/Table/table-tokens.css:2-27`); `.table-shell` lays out the gutter lane and inset and scrolls sideways (`Core/Views/Table/table-view.css:3-14`), and the same sheet holds the band rhythm and sticky band head (`table-view.css:48-62`). ArchiveView imports that sheet across folders (`Core/Archive/ArchiveView.tsx:14`).
- **The Row Frame:** a `LineRow` with `id`, `open`, `immovable`, `data-rid`, `data-reveal-host`, `.selected`, `.row-lead`, and `rowHover` (`TableView.tsx:299-311`). `.data-row` is a grid with a top hairline `.row-lead` drops, a hover wash, and a selected wash (`UIX/Table/table.css:4-9,110-125`).
- **The Lead Cell:** column 0 through `RowLead`, which indents and seats the `.row-rail` hover slot (`UIX/Table/RowLead.tsx:5-25`); the grip is an inline span there (`TableView.tsx:372-389`) placed in the gutter by `table.css:183-194,202-213`.
- **The Title:** icon and `RenamableName` in an OverScroll `cell-title` (`TableView.tsx:318-331`); a click on its cell opens the page (`:358-364`); right-click opens the page menu anchored by `titleGlyph` (`:212-215,300-301,354`).
- **The Band Walk:** `renderRows` recurses groups, places each run by `memberIndent`, interleaves the ghost after the hovered row, tracks the run lead, and wraps runs in `GroupBand` (`TableView.tsx:109-160`); the standing ghost follows (`:198-200`). The ghost row loops its columns with `ghost-worn` (`:217-262`).
- **Table-Only Machinery:** `useColumns`, `useCellSweep`, the header, and the cell loop (`TableView.tsx:39-78,177-196,312-371`).
- **The Host Contract:** `useViewHost` returns the view, columns, groups, bands, row maps, disclosure, `dragDisabled`, styles, `revealProperty`, `hideProperty`, `commitValue`, `viewRootRef`, naming, and `nests` (`Core/Views/Host/useViewHost.ts:178-215`). `useViewInteractions` takes ghost timing, seat options, `newPages`, and own handlers (`Core/Views/Host/useViewInteractions.tsx:69-78`) and returns `item`, `bandView`, `listZone`, `seat`, and the ghost props (`:503-534`). `listZone` reads row boxes from the DOM, so any vertical list of `LineRow`s works (`:396-417`).
- **Bands:** a tail is a bare `Reveal`; a headed band is a `LineRow` head with chevron, glyph, the Set-only **+**, and a `Reveal` body (`Core/Views/Bands/GroupBand.tsx:95-102,137-210`). Cards' chevron sits inline (`Core/Views/Bands/group-band.css:42-45`), Table's in the gutter (`table.css:185-194`).
- **`UIX/Menus` Rows:** `MenuItem` has leading and trailing sides, an overlay seated in its own lead padding, rings, `role="button"`, and a flat `8px + rowIndent` indent (`UIX/Menus/MenuRows.tsx:13-17,94-173`), a rounded inset wash (`UIX/Menus/menu-row.css.ts:25,34-41`), and a closed prop list (`MenuRows.tsx:68-92`). The sidebar wraps it in a `LineRow` (`Core/Interface/Sidebar/Disclosure.tsx:159-194`).
- **The Rail:** `railRow`'s one consumer is `DisclosureRow` (`UIX/Menus/DisclosureRow.tsx:7,114`); it pads by 18px and draws its line at 12px (`UIX/Elements/disclosure.css.ts:4-5,20-35`) from the `--list-outline-*` tokens (`UIX/Theme/theme-vars.css.ts:129-132`), which MarkdownPM also reads (`Core/MarkdownPM/markdown-pm.css:418-440`).

##### Would Need to Change

1. **The Band Walk** should become one shared walk taking a row renderer and a ghost renderer. Cards' walk is flat and stays (`Core/Views/Cards/CardsView.tsx:296-350`).
2. **The Row Frame** should be shared as `PageRow`, whose children a kind supplies: Table's cells, or List's one lead cell holding the grip and the row line. `DataRow` is a memo of 16 props today (`TableView.tsx:264-298`). The lead stays "first column" and the title markup is its own piece, since Title moves in Table. Seven test files query the row classes (`cellGestures`, `useViewHost`, `rowDrops`, `bandDrops`, `ArchiveView`, `TrashFrame`, `BundleTable`), so class names should hold.
3. **The Ghost Row**'s shell should move into the shared band walk, and each kind should hand it the ghost's cells.
4. **The Shell CSS** should move to `Core/Views/Rows/table-shell.css`, which Table, List, and Archive import, with the band rhythm and the sticky band head. The `[data-view-embed]` zoom rule names a Core attribute (`table-view.css:29-31`) and moves with it.
5. **The `.data-cell` Text Rule:** `.data-cell .cell-text-host:has(> .cell-pen) .cell-text` matches any descendant and outranks the base pen rule (`Core/Properties/Cells/cells.css:38-57`), so text values inside List's lead cell take Table's in-cell treatment, and List's sheet holds the pen's room at rest, so the hover widening doesn't arise.
6. **Selectors on the Row Vocabulary** survive while class names hold: `useCellSweep.ts:30` and `Core/Testing/bundles.ts:158`; `content-banner.css:95`'s bleed should key on the heading (`.table-head`) rather than the shell.
7. **Outlines:** `railRow` can't be used as-is in a view: its padding would double the row's own indent, and its geometry fits menus. `GroupBand` should state its indent as a variable instead of inline padding (`GroupBand.tsx:147`), and List's body box draws the line at `calc(var(--band-indent) − var(--rail-inset) / 2)` from the outline tokens. The body box clips until the reveal settles (`UIX/Animations/Reveal.tsx:62`), so a depth-0 line in the gutter clips during disclosure. `railRow` should split into the line and the padding `DisclosureRow` keeps.

##### Removal Candidates

- ArchiveView's cross-folder import and `table-view.css:1`'s stale header go with the shell move.
- "Rail" means the gutter slot (`.row-rail`, `--rail-inset`) and the outline line (`railRow`).
- "Lead" means five things: `RowLead`, `.row-lead`, `data-view-lead`, `rowLead()`, and `ROW_LEAD` (`MenuRows.tsx:16`; `menu-row.css.ts:46`). Worth renaming only if the row work touches them anyway.
- The title markup appears three times (`TableView.tsx:319,244`; `BundleTable.tsx:294`); the shared frame absorbs two.
- Menus indent two ways: flat at 14px steps (`MenuRows.tsx:16-17`) and nested `railRow` at 18px (`disclosure.css.ts:24`). Outside List; a look change and Nathan's call.
- `rowIndent` lives in `UIX/Table/` and is imported by Menus, Bands, Host, and Bundles; `Disclosure` and `unfolded` live in `Menus/DisclosureRow.tsx` and are imported by Bands and Host. Low value; only if the row work is in those folders.
- `--list-outline-*` and `--segment-*` hold the same values (`theme-vars.css.ts:129-131`; `segment.css.ts:7-9`); merging them is Nathan's call.

##### Where the Brief Is Wrong

- **`Core/Views/ListView`:** kinds live in `Core/Views/Table/` and `Core/Views/Cards/`, each with `XView.tsx` and `xKind.ts`; the parallel is `Core/Views/List/`.
- **"Reuse the same drag-handles, content inset":** the grip is inline JSX in `TableView` and the inset is Table's own sheet; only indentation is shared (`Core/Views/Bands/bandModel.ts:193-199`).
- **"The exact same Bands as TableView and CardView":** Table and Cards already differ: Cards don't nest (`Core/Views/Cards/cardsKind.ts:22`), don't sub-group, and draw the chevron inline. List with `nests: true` matches Table.
- **"PageOutline menu":** it's `OutlineMenu` (`Core/Interface/Toolbar/OutlineMenu.tsx`), whose rails come from `railRow`.
- **A `ListRow` Component:** the name is taken (`UIX/Menus/useListEdit.ts:4`).

##### Approaches

- **A. Menu Rows:** fails A-1 on the grip, band alignment, look, and row attributes, and adds a second row look and keyboard model. Rejected.
- **B. A Standalone `ListRow`:** re-implements the grip, rail slot, selection, hairline, hover, ghost, rename, and both DOM contracts. Rejected.
- **C. A Table Mode:** cheapest in lines; `TableView` becomes two renderers behind one name, runs `useColumns` and `useCellSweep` for nothing, and makes every Table change a List question.
- **D. A Shared Page-Row Frame (Pick):** the band walk, row frame, lead, grip, title, and ghost row shared; Table is the frame plus cells, List the frame plus one line of two groups, wearing `.table` and `.data-row` on one track. Band heads align with rows at every depth by construction.

##### Anything Else

- **No Heading:** with grouping off, List's first element is a row, so its rows should carry `data-view-lead` or the tile peek has no anchor (`Core/Tiles/Surfaces/ViewTile.tsx:68-70`); harmless for Table, whose header comes first.
- **Undocumented Host Contracts:** *ViewTypesPM §The View Host* says a new renderer "writes presentation only" (`.claude/Features/ViewTypesPM.md:71`); at HEAD a second row renderer would duplicate the band walk and frame, and the `data-rid` and `data-view-lead` contracts are written nowhere.

---

#### B — Values on the Row

##### What's There

- **`Cell`:** one renderer for every type (`Core/Properties/Cells/Cell.tsx:24-178`) on Table, Cards, and the panel (`TableView.tsx:334-342`; `CardsView.tsx:544-557`; `Core/Properties/PropertyPanel.tsx:258-266`), reading a resolved `ColumnStyle`.
  - **Checkbox:** keyed by type, so it always draws (`Cell.tsx:51-58`).
  - **Select and Status:** one `OptionChip` in an OverScroll `.cell-chips` (`Cell.tsx:64-77`), whose hover × is off under the compact look (`Cell.tsx:60-61`).
  - **Multi-Select, Context, File:** `Chips`, an x-axis `SortableZone` with a writer and two or more values (`Cell.tsx:180-216`).
  - **Chip Spacing and Caps:** `--labels-gap`, 4px (`cells.css:70-75`; `UIX/Labels/label-base.css.ts:127`); each chip's text caps at 85px (`label-base.css.ts:23,125`).
  - **Text:** first line only with live connections, ellipsized, `…` when more follows (`Core/Properties/Cells/TextCell.tsx:75-85`; `cells.css:30-32`). Its pen appears only when the surface passes `onPane`, on hover of its own host, whether or not the text is cut off (`TextCell.tsx:61-100`). The host is `width: 100%` (`cells.css:8-14`).
  - **Date and Number:** OverScroll strings; a bar under the `bar` look fills its container (`Cell.tsx:129-158`; `cells.css:95-100`).
  - **Blank Values:** none in Table, `caption.emphasized` on Cards, `caption.standard` in the panel (`CardsView.tsx:549-553`; `PropertyPanel.tsx:264`).
- **The Seat:** `useValueSeat` owns click, right-click, editor, popover, picker, and Add (`Core/Properties/Pickers/ValueSeat.tsx:93-319`); `valueClickIntent` decides a click (`Core/Properties/Pickers/valueClick.ts:19-45`); surfaces configure `SeatHost` (`ValueSeat.tsx:42-70`), views once (`useViewInteractions.tsx:476-486`).

| Surface | Anchor | Centered | Add | Remove | Style | Source |
| --- | --- | --- | --- | --- | --- | --- |
| Table | `.data-cell` | No | None | None | Yes | `TableView.tsx:80-88` |
| Cards | `.value-seat` | Yes | `cardAddColumns` + reveal | Hides from the view | Yes | `CardsView.tsx:145-170` |
| Panel | Its row | No | Unshown rows, in place | Empties the row | None | `PropertyPanel.tsx:78-94` |

- **The Add List:** `MetadataPicker` lists Contexts, then properties (`Core/Properties/Pickers/MetadataPicker.tsx:17-94`); `cardAddColumns` puts fillable entries first (`Core/Views/Cards/cardColumns.ts:19-34`); `shownColumnsFor` drops blanks in Compact except a type whose blank draws (`cardColumns.ts:6-17`); `openAdd` does nothing when the list would be empty (`ValueSeat.tsx:194-199`).
- **The Seated Value:** written by hand on Cards (`CardsView.tsx:534-560`) and in the panel (`PropertyPanel.tsx:251-268`); Table keeps a grid `.data-cell` with sweep and drag classes (`TableView.tsx:346-371`). `.value-seat` is the shared class (`cells.css:58-69`); its box rules sit in Cards' sheet (`cards-view.css:128-135`).
- **Compact Cards' Flow:** a wrapping flex row at a literal `gap: 4px 4px` KNOB (`cards-view.css:94-99`); Text and bars take a full line (`cards-view.css:136-139`), Text wearing `borderedField` (`CardsView.tsx:565-569`); no dividers; a click on empty card space opens Add in both formats (`CardsView.tsx:531-533,677-683,771-777`).
- **Right-Click and Style:** one style submenu for options, Date, Number, and Checkbox (`Core/Actions/cellMenu.ts:63-73,101-104`; `Core/Actions/columnMenu.ts:88-92`), labeled Format for Date, Link, and the stamps and Style otherwise (`Core/Properties/typeDisplay.ts:22,30,33-34`); Text gets Edit, File its file rows, Context only Clear (`cellMenu.ts:55-62,105-125`). A Link value's menu carries no style and the connection menu suppresses Format on a value (`cellMenu.ts:55-56`; `Core/Actions/connectionMenu.ts:98`), so the per-view Link display is header-only (`useColumns.ts:198-224`); the property-wide display lives in the property's editor (`typeRows.tsx:196-198`). Looks live per view in `column_styles` (`columnStyles.ts:8-34,132-157`); an option row's right-click inside the picker also sets the look (`Core/Actions/optionMenu.ts` → `Core/Properties/Schema/useOptionEdit.tsx:109-111`).
- **Show and Hide:** `revealProperty` and `hideProperty` call `unhide` and `hideShown` (`useViewHost.ts:152-161`; `columns.ts:115-131`). Cards reveal on Add's show and on any non-blank commit, and hide on Remove (`CardsView.tsx:145-149,160,168`); Table hides from its header (`useColumns.ts:193-197`).
- **The Hover Plus:** the band's is a raw `Button size="button-inline" icon="plus" reveal data-create` that creates a page (`GroupBand.tsx:191-203`; `useViewCreation.ts:170-176`). The panel's is `AccessoryButton icon="plus" create`, gated on something being addable (`PropertyPanel.tsx:289-311`). `AccessoryButton` is that same `Button` with `paddingX="0"`, tertiary color, and a stopped click (`MenuRows.tsx:285-330`; `menu-row.css.ts:278-281`); the band's color rule reproduces it by hand (`group-band.css:46-48`). A reveal host sets `--reveal`, a target fades by opacity, and `[data-reveal-held]` pins it (`UIX/Interactions/hover-reveal.css.ts:5-25`).
- **Separators:** `Segments` draws an inline bar spaced by `marginInline: 6px` (`UIX/Elements/Segments.tsx:4-16`; `segment.css.ts:12-19`), used by `ActionLabel` and `PageReaderWindow`. Inside a flex row the span blockifies, and the base `segment` sets no height (`segment.css.ts:4-10`), so it draws nothing there (measured: 2×0px as a flex item); a height on the shared segment makes it draw. `FieldRun` spaces by its gap and stretches its divider, for the reason its header states (`UIX/Fields/field-run.css.ts:1,12-20,34`), with entries tied to `PlainLabel` (`UIX/Fields/FieldRun.tsx:6-31`). No `SegmentRun` exists.

##### Serves As-Is

`Cell` for every type; the seat, `MetadataPicker`, and `PropertyPicker`; `column_styles`; `revealProperty` and `hideProperty`; `--labels-gap` for values of one property; the hover-reveal primitive.

##### Would Need to Change

1. **Text, Link, and Date Widths:** each fills its container (`cells.css:2-14`), and a bar has no width of its own (`cells.css:95-100`). A one-line run is the first surface needing an intrinsic cap for these and a set width for a bar: List's sheet caps every value at `--list-view-value-max` and sets a bar's width.
2. **The Seated Value** should be one component in `Core/Properties/Cells/`, with `.card-value`'s base box rule moved to `.value-inline` in `cells.css`. The panel can mount it: its label menu sits on the outer `MenuItem` (`PropertyPanel.tsx:248`) and its anchor reads `data-property-row`. Carrying `data-drag-slop` once raises the drag threshold on the panel's rows too.
3. **Cards' Policy** should be stated once for Cards and List, `cardColumns.ts`'s functions moving to `Core/Views/Pipeline/columns.ts`. Whether blanks drop should be the kind's argument, not `isCompact(view)` (`CardsView.tsx:166`).
4. **Bars Between Properties:** `Segments`, its segment given a height so it draws as a flex item.
5. **The Row's Plus:** `AccessoryButton icon="plus" create reveal`, held with `data-reveal-held` while its list is open, shown only when something is addable, anchoring its list on itself (`PropertyPanel.tsx:174-176`).
6. **Small Shared Pieces:** `AccessoryButton` forwards `tabIndex` and `data-reveal-held`; `Segments` keys a part by its own key; a Link's menus offer its view's Format (C-4).

##### Removal Candidates

- The two hand-written seated values become one (about −40/+30, estimated).
- `.card-value`'s base rule leaves Cards' sheet as `.value-inline` in `cells.css`.
- The band's raw `Button` and `.group-band-add` become `AccessoryButton`; `paddingX="0"` changes its hit box slightly (not checked visually).
- The panel's className toggle (`PropertyPanel.tsx:308`) becomes `data-reveal-held`.
- `cardColumns.ts` leaves Cards' folder once its functions live in the shared columns stage.

##### Where the Brief Is Wrong

- **"Like how CardView does it when Style = Compact":** Cards have no **+**; Add opens from empty card space in both formats, and the band's **+** creates a page.
- **"SegmentRun":** doesn't exist; the candidates are `Segments` and `FieldRun`'s divider.
- **"Reusing the ones given on Cards":** Cards' gap is a literal KNOB; the token is `--labels-gap`.
- **"Format > / Style >":** one submenu per type, already on every value; a Link's per-view display is header-only; Number's format is property-wide and only Number or Bar is per view.
- **"Max-widths before ellipsis … the TextPane glyph":** the ellipsis and pen exist; the max width doesn't.
- **"Single-click … opens its picker":** only options and Date open a picker.
- **"Visibility … like how cards work":** correct, and true of Standard Cards too.

---

#### C — Settings and Saved State

##### What's There

- **The Kind Record:** `Renderer`, `nests`, and `layout: { leaf, switches, rows? }` (`Core/Views/Host/viewKinds.ts:8-23`); `BUILT_KINDS` holds Table and Cards, and `presentedKind` falls back to Table (`viewKinds.ts:25-30`). `Renderer` has one reader (`Core/Views/Host/ViewHost.tsx:14`); `nests` four (`useViewHost.ts:48`; `Core/Views/Settings/GroupFrame.tsx:137`; `Core/Views/Settings/SortFrame.tsx:71`; `Core/Views/Settings/ViewPane.tsx:76`); `layout.rows` one (`Core/Views/Settings/LayoutFrame.tsx:61`); `layout.leaf` one (`Core/Views/Settings/ViewFrame.tsx:202`). An unbuilt tile is inert through `t in BUILT_KINDS` (`LayoutFrame.tsx:33`).
- **The Schema:** one flat loose decoder (`Core/Views/views.ts:160-196`); every boolean is a `ViewFlag` needing a `VIEW_DEFAULTS` entry (`views.ts:200-235`). Per-id maps are registered in `ENTRY_KEYS` (`views.ts:249-253`), read by `slotsOf` and `liveView.ts`, and again in `mergeViewEdit`'s depth table (`views.ts:294`); `mergeKeys` merges per key only where the table lists a field (`Core/Files/jsonMerge.ts:32-43`). `ROLES` must name every field, and an `idList` or `idMap` role inherits the property-delete cascade, while the gone cascade keeps both untouched (`Core/Nexus/configReach.ts:46-81,145-187`). Duplication, tile embeds, and the tile scope carry any field (`Core/Views/viewsFile.ts:95-109`; `Core/Tiles/viewTileEntry.ts:25-28,44-56`; `Core/Views/ViewTileScope.ts:8-15`).
- **Order and Visibility:** `property_order` is the one order, `hidden_properties` a flag list (`columns.ts:63-83`). `hiddenListIds` lists hidden ids in registry order (`columns.ts:85-97`). `hideShown` flags without moving (`columns.ts:115-122`), and `unhide` appends a never-ordered id (`columns.ts:124-131`). `placeInShown` rebuilds the order as the shown list followed by everything else (`columns.ts:101-113`), pinned by `columns.test.ts:234-241`, with two callers: Table's column drop and Visibility's drop (`useColumns.ts:299-308`; `Core/Views/Settings/VisibilityFrame.tsx:97`).
- **Table's Alignment:** a stored override over a Table-owned per-type default (`useColumns.ts:34-48,70-71`), written from the header (`useColumns.ts:219-222`); alignment stores every pick, where styles prune defaults (`columnStyles.ts:99-109`).
- **The Two Doors:** `VIEW_PANES` is Visibility, Layout, Group, Filter, Sort (`ViewPane.tsx:27-33`). SettingsFrame lists Properties and every pane, over a kind-agnostic View Scale footing (`Core/Views/Settings/SettingsFrame.tsx:42-45,86-109,125`); its Layout is the type grid, switches, and kind rows (`LayoutFrame.tsx:70-82`). The editor's root holds the grid, the panes minus Visibility, and the kind rows (`ViewFrame.tsx:147,167-194`); its Layout opens `VisibilityFrame` relabeled with the switches below for Table, the switches alone for Cards (`ViewFrame.tsx:199-220`).
- **`leaf`'s History:** the Views Cleanup's scout found no stated reason for the Cards gap and inferred it predates Cards showing properties, and F-1 kept the doors' split, allowing only consolidation that changes nothing visible (`git show 4b18149ac^:".claude/Planning/Views Cleanup/Scouts/5 — Settings Panes & Picker Menus.md"`, line 81; `…/Views Cleanup — Decisions & Intention.md`, line 69). Its final review flagged the Layout pane as composed two ways (`…/Views Cleanup — Final Report.md`, lines 127 and 171).
- **VisibilityFrame:** shown rows in a `members` group and hidden rows ghosted in a `rest` group below (`VisibilityFrame.tsx:62-66`); rest holds no order and Title is pinned (`VisibilityFrame.tsx:109-118`); `paneSpec` is shared with PropertyFrame (`UIX/Menus/paneDrop.tsx:50-83`).
- **Drag Machinery:** a zone is displacement or line, never both (`engine.tsx:125-127`); a loose line drag lands only in a foreign displacement zone (`engine.tsx:310-315,574-581`); line geometry is two-dimensional (`engine.tsx:247-269`), but lanes are ordered and picked by y alone (`UIX/Interactions/reorderModel.ts:89-98`; `UIX/Interactions/lineList.ts:38-41`). `menuDropLine` spans the pane (`MenuRows.tsx:19-29`); the lane-width form is `rowLine` (`lineList.ts:46-51`). A line zone steps on Up and Down only (`engine.tsx:1018`), probing at a fixed `cursor.x` seeded at 0 (`engine.tsx:693,966-967`), so once lanes are picked by x every keyboard step resolves into the leftmost lane. An inner scroller inside a zone isn't tracked, since `rescroll` re-origins only when the zone's host moves (`engine.tsx:615-637`).
- **Pane Sizing:** a 225×245 floor, a 440px height ceiling, no width ceiling (`UIX/Menus/frames.css.ts:84-86`); each slot sizes to its content (`UIX/Menus/FrameSlide.tsx:55-67,92-117`); FilterFrame grows to 420px (`Core/Views/Settings/filter-frame.css.ts:11-20`); a row label wears `overScrollEllipsis` (`MenuRows.tsx:125`); the middle region caps at eight rows (`frames.css.ts:88-102`).

##### Serves As-Is

View Scale; Title Icons; Group, Sort, and Filter through `nests: true`; `revealProperty` and `hideProperty`; `column_styles`; persistence through the pending record, duplication, tiles, the tile lock, and the cascades; `FrameSlide`'s content width, which widens the menu to the pane; `hideEye` (`Core/Views/Settings/OptionOrderList.tsx:54-98`).

##### Would Need to Change

- **`column_sides`:** `entriesOf(z.enum(SIDES))`, one `ENTRY_DEPTH` entry, and `ROLES` as `idMap`.
- **Two Flags:** `hide_outlines` and `wrap_rows`, each one schema line, one `VIEW_DEFAULTS` line, and one `ROLES` line of `none`; Outlines follows the `hide_*` with `invert` convention.
- **Side Resolution:** `sideFor`, `view.column_sides?.[id] ?? DEFAULT_SIDE[type]`, in `Core/Views/List/listSides.ts`, `alignFor`'s shape, read by the renderer and the pane. The per-type default should live with List, as `COLUMN_LAYOUT` lives with Table, rather than on `PROPERTY_TYPES` (`Core/Properties/properties.ts:33-56`) or `TYPE_META` (`typeDisplay.ts:17-35`), which hold type facts and display metadata.
- **One Placement Rule:** `placeInShown` should place the dragged id through `fullOrderIndex` (`UIX/Utilities/moveItem.ts:41-53`), so every other id, hidden ones included, keeps its place; Visibility, Table's column drag, and List's pane all write through it.
- **The Record and the Doors:** `listKind.ts` with `nests: true`, `Properties: SidesFrame`, `leaf: 'pane'`, and Title Icons, Outlines, and Wrap Rows; `'pane'` draws the property pane alone under the editor's Layout and the switches in the footing the kind's rows take.
- **The Sides Pane:** a hidden property, absent ones included (Contexts, new properties), should sit ghosted at the foot of its own column; shown, it lands last in Left or at the top of Right, where `unhide`'s append puts it.
- **Tests and Drives:** `ViewFrame.test.tsx:296-314`; `SettingsFrame.test.tsx`; the Views Drive rows that find the switches through the editor door (`.claude/scripts/Views Drive/MATRIX.md:84,89,92`).

##### Removal Candidates

1. `placeInShown`'s hidden-to-tail rewrite, which contradicts `hideShown`'s promise. Visible in Table; E-6 makes the change in every kind.
2. The double registration of per-id maps: `ENTRY_KEYS` and the depth table become one `ENTRY_DEPTH` record, so a new map registers once; `ROLES` records a different fact and stays.

Not removable: `column_alignments` and `COLUMN_LAYOUT.align` (D-1), and the flat schema, since namespacing per kind would block shared fields.

##### Where the Brief Is Wrong

- **"The MaxWidth of the LayoutPane would be increased":** panes have no width ceiling; content sets it, as FilterFrame's does.
- **"This LayoutFrame would replace VisibilityFrame":** the mock is headed `< Settings … Layout`, the toolbar door's back bar (`SettingsFrame.tsx:83`), whose Layout has never held properties. The only Layout holding a list is the editor's, for Table only. The two menus already disagree on what Layout holds.
- **"Hiding views here would remember their position":** the flag does; the next reorder doesn't.
- **"TableView's Borderless":** the switch is Hide Borders (`Core/Views/Table/tableKind.ts:11`).
- **"The same Scale options":** View Scale belongs to every view (`SettingsFrame.tsx:86-109`); Card Scale is Cards' own (`cardsKind.ts:48-57`).

##### Approaches

- **Stored State:** S1, a sparse side map plus the one order (pick); S2, two orders (rejected, two sources of truth); S3, a membership list (opaque, shifts meaning with the defaults); S4, side inside `column_styles` (mislabels placement as look); S5, a sentinel in `property_order` (can't express per-type defaults; rejected). Under S1 a Table view switched to List shows type-default sides with no write, and the sides' interleaving shows only as Table's column order.
- **The Pane:** each record names its property pane (`layout.Properties`): `VisibilityFrame` for Table and Cards, `SidesFrame` for List, which SettingsFrame's Visibility and the editor's Layout both open; List's `leaf` is `'pane'`, drawing its switches in the footing.
- **Drag:** each column one `SortableZone`, the two sharing a family, trading rows by displacement as cards cross bands, with no engine change; the pane is the stated exception to the settings frames' drop line. Crossing sides by keyboard is given up; a right-click's Move to Left or Move to Right does it.

##### Anything Else

- **Keyboard Parity:** pane rows lift and step by keyboard within a column; crossing sides by keyboard is given up, and a right-click's Move to Left or Move to Right does it (E-7).
- **The Pinned Test:** `columns.test.ts:234-241` encodes the hidden-to-tail behavior; changing it is a Table behavior change shipping with List and should be named, not folded in.

---

#### D — Width and Wrapping

##### The Short Answer

The basic form of wrapping is cheap: when the right group drops to a second line, the browser lays it out from one flex rule, and Nathan's 12–16px maps onto that rule's gap with no script and no measuring. Everything that cares about a row's height measures live rects. The expensive forms need to know *that* a row wrapped, or wrap chip runs internally. Sideways scrolling is worse for List than for Table.

##### Single-Line Layers

- **OverScroll:** `nowrap`, `overflow-x: hidden`, scrolling on hover, its width cap left to the consumer (`UIX/Interactions/over-scroll.css:1-15`); an overflowing lane keeps the wheel through a scroll-state container query (`over-scroll.css:16-26`; `UIX/Interactions/scroll-fade.css:67-68`).
- **Table Cells:** `.data-cell` is `nowrap` with an ellipsis (`table.css:64-71`); the lead cell is `overflow: visible` (`table.css:73-76`).
- **Chips:** `nowrap` (`label-base.css.ts:37`), capped at 85px (`label-base.css.ts:23,125`; `UIX/Labels/Label.tsx:69`); every chip already has a width ceiling. Chip runs are `inline-flex` at `max-width: 100%` with chips at `flex: none` (`cells.css:70-79`).
- **Text:** first line only at `white-space: pre` (`cells.css:22-29`), reading overflow once on `pointerenter` (`TextCell.tsx:69-73`).
- **The Title:** `.cell-title`, `inline-block` at `max-width: 100%` (`TableView.tsx:319`; `table.css:165-170`), in the one uncapped column (`useColumns.ts:35`).
- **Cards' Wrap Precedents:** Wrap Titles drops the OverScroll and sets `display: inline` (`UIX/Cards/Card.tsx:64-84`; `UIX/Cards/cards.css:143-149`), read at `CardsView.tsx:634`. Compact flow wraps whole values, each one line (`cards-view.css:94-105,128-139`).
- **A Cap for a Value With No Column:** `--row-value-reach`, 75% (`UIX/Menus/menu-row.css.ts:21`), on Cards' Standard rows (`cards-view.css:117-123`), against the row rather than a content-sized span.

##### What Assumes or Measures a Row's Height

| Mechanism | How It Treats Height | Wrap-Safe? |
| --- | --- | --- |
| Row grid | `.data-row` stretches its cells (`table.css:4-9`); no token holds a row height (`table-tokens.css:2-27`) | Yes |
| Grip, check, chevron | Centered at `top: 50%` of the lead cell (`table.css:183-194`) | No: on a two-line row the grip sits between the lines |
| Row drag | Measures live rects, re-measuring on scroll and disclosure (`engine.tsx:247-269,639-650`) | Yes |
| Chip-run reorder | Frozen rects; `axis: 'x'` places along one line (`UIX/Interactions/placement.ts:53-102,138-146`) | No, for a run wrapping internally |
| Band disclosure | `Reveal` animates `grid-template-rows` (`Reveal.tsx:47-52`) | Yes |
| `Reveal`'s `fill` | Without it the column is `max-content` (`Reveal.tsx:5,51`); Table omits it (`TableView.tsx:151-156,233`), Cards pass it (`CardsView.tsx:297`) | List passes it, bounding its width as Cards do |
| Hover ghost | One line, revealed through `Reveal` (`TableView.tsx:233`) | Yes |
| Cell sweep | Measures live rows on activation and scroll (`Core/Views/Table/useCellSweep.ts:27-38,79-81`), settles by column index (`TableView.tsx:63-70`) | Table's only |
| Glide to a new row | Reads `offsetHeight` live (`useViewCreation.ts:97-100`) | Yes |
| Virtualization | The one seam is fixed-height by contract (`UIX/Interactions/virtualRows.ts:4,31`); views don't virtualize | Fine today; a virtualized wrapping List needs measured heights |

**Table's Overflow Test:** the arithmetic sum of clamped widths against the shell (`useColumns.ts:138-164`), deliberately not `scrollWidth`, which "floors at clientWidth" and latches (`useColumns.ts:139`). A List row has no widths to sum.

##### The Options

The crowded row: `(icon) A Long Page Title | [chip] [chip] | [Status]` on the left and `[Date] [Number] [Link] +` on the right, too narrow for all of it.

**The Choice:** the title shortens to a floor and the left group scrolls within one line, and the per-view **Wrap Rows** switch, off for a new view, drops the right group to a second line, flush right: one declaration, `flex-wrap`, measured on a mock. Growing sideways and hiding what doesn't fit are rejected; values wrapping within a side, wrapped titles, and wrapped chip runs are Prospects.

| Thing | Behavior | Verdict |
| --- | --- | --- |
| Chip × | An absolute overlay (`UIX/Interactions/hover-remove.css.ts:20-31`) | Holds its slot |
| The **+** | Opacity only (`hover-reveal.css.ts:19-24`; `UIX/Buttons/Button.tsx:64`) | Counts toward the wrap at rest |
| The Text pen | Adds `--pen-room` to the text's box on hover, as a margin outside a table cell and as padding inside one (`cells.css:33-57`) | Grows a content-sized seat by 24px on hover in either form; List holds its room at rest |
| Inline editor | `fillInput`, `field-sizing: content` (`Core/Properties/Pickers/PropertyValueInput.tsx:73`; `UIX/Fields/fields.css.ts:144-148`) | Typing can flip the wrap |
| Title rename | The same field (`TableView.tsx:326`) | Natural reflow; visible |

##### Shared With Wrapped Table Cells

- **Shared:** the grip's first-line anchor, `--row-first-line` in `table.css`.
- **List's Own:** wrapping between groups with no columns; dividers at line edges; the **+** counting toward the wrap.
- **Table's Own:** wrapped chip runs and their reorder; the sweep's stale rects on reflow; column widths against wrapping.
- Dropping the right group to a second line neither moves nor hinders Table's hard part.

##### Removal Candidates

- **`wrap_titles` cross-kind** rather than a List twin.
- **Not removable:** Table's overflow arithmetic.

##### Where the Brief Is Wrong

- **"Build wrapping now, or have the view expand like tables do":** a false either-or; truncation is a third option, and "expand like tables" grows List to its widest row.
- **The 12–16px threshold:** right; it's a flex `column-gap`.
- **The TextPane glyph:** fine as design, but showing it widens a content-sized value.
- **The parked *Wrapped Table Cells — Brainstorm Brief*'s stale citations:** `.data-cell` is at `table.css:64-71`, not `:76-83`; chip `nowrap` at `label-base.css.ts:37`, not `:35`; `WIDTHS` is `COLUMN_LAYOUT` at `useColumns.ts:34-48`; `Cell.tsx:74-82, 187-206` are `:64-76` and `:180-216`; `cellSweep.ts` is `useCellSweep.ts`; `wrap_titles` lives in `cardsKind.ts:27`, not `LayoutFrame.tsx:58`; `TABLE_LAYOUT` no longer exists, switches living on each record (`tableKind.ts:9-13`); `VIEW_DEFAULTS` is at `views.ts:215-230`; and `ROLES` *is* compiler-enforced (`configReach.ts:81`). Its "a taller row costs no fixed-height assumption" leaves out the grip's centering and the virtualizer seam.

##### Anything Else

- **Scroll Jumps:** with Wrap Rows on a row's height depends on the pane's width, so content below can shift during a sidebar slide; normal for text, new for views.
- **Future Virtualization:** a wrapping List needs `useVirtualRows` extended to measured heights; TanStack Virtual supports them (inferred), so a seam change rather than a rewrite.

---

#### E — Outside the Renderer

**Headline:** the Views Cleanup made a kind one record, so a List renderer touches little outside itself; the fallback machinery survives because Gallery, Calendar, and Timeline stay unbuilt (A-3). Most outside work is documents, the drive, two shell stylesheets, and any new saved-view fields.

##### Readers of a View's Kind

| Reader | Per Kind |
| --- | --- |
| `views.ts:17-33` | `VIEW_TYPES` and `VIEW_KINDS`; List is `{ label: 'List', icon: 'list-rounded' }` (`views.ts:29`) |
| `views.ts:166` | An unknown type decodes to `'table'`, pinned by `views.test.ts:307-309` |
| `views.ts:395-409`; `viewTileEntry.ts:62` | New views and tile views mint as Table |
| `viewKinds.ts:8-30` | The record, `BUILT_KINDS`, and the Table fallback |
| `ViewHost.tsx:14` | The only renderer choice |
| `useViewHost.ts:48,54`; `group.ts:140-165,206-228` | `nests` feeds `groupPlan` and `setBands` |
| `bandModel.ts:214-220,349-357`; `GroupBand.tsx:46-59` | `nests` decides band nesting during a drag |
| `GroupFrame.tsx:137,169,256,464` | Sub-Group only when nesting; None only when not; the pane's own tree nests with its reason |
| `SortFrame.tsx:71` | The reserved Location sort when not nesting |
| `ViewPane.tsx:76` | The Filter pane's folder order |
| `LayoutFrame.tsx:19-68` | The type grid, the inert-tile guard, switches, rows |
| `ViewFrame.tsx:147,192,199-220` | The editor's panes, grid, and Layout ternary |
| `SettingsFrame.tsx:42-45,116` | Every pane for every kind |
| `Core/Views/viewIcon.ts:6-12` and its callers | Kind-generic |
| `configReach.ts:46-81` | `ROLES`, compile-enforced |

**Per-Kind Data on `SavedView`:** `card_size`, `card_banner`, `hide_location`, `wrap_titles`, `set_cards`, and `format` (Cards); `hide_column_icons`, `hide_borders` (Table); `hide_page_icons` (both); the `column_*` maps (`views.ts:169-196`). Switching kinds keeps every field on the view (`useViewHost.test.tsx:588-602`), so a Cards `format: 'compact'` survives into a List.

**Shell and Embed Readers Keyed on Class Names:**

- `interface.css:58-66`: `.detail-body:has(.table-head)` zeroes top padding and reserves the gutter through `--interface-inset-lead`; `:has(.cards-view)` sets Cards' lane. A renderer with neither gets the 16px default and no gutter.
- `content-banner.css:94-98`: the banner divider bleeds under `.detail-scroll:has(.table-shell)`, for a heading's full-bleed fill.
- `table-view.css:29-31` and `cards-view.css:14-15`: the two embed-zoom variables, different on purpose (`personalization.ts:65-67`); a List on Table's sheet takes Table's.
- `ViewTile.tsx:68-81`: the peek anchors on the first `[data-view-lead]`; `row` counts columns by `offsetTop`. Table marks its head (`TableView.tsx:177`), bands their row (`GroupBand.tsx:144`), Cards every card (`CardsView.tsx:808`). A one-column List row resolves to one column.

##### Tests and Drives That Pin Kinds

- `viewIcon.test.ts:4-24` names two kinds and stays true with three.
- `ViewFrame.test.tsx:296-314` runs the Layout leaf over Table and Cards; List's case is the new fact.
- `SettingsFrame.test.tsx` uses a Cards view.
- `useViewHost.test.tsx:588-626`, "the cards seam", pins `nests`; List with `nests: true` keeps Table's half.
- `views.test.ts:307-309` pins the decode to `'table'`.
- No test pins the built kinds, the fallback, or an inert tile.
- `Views Drive/live-drive.mjs` (2,370 lines) loops Table and Cards and selects `.cards-view` throughout; its matrix crosses every behavior with every surface and cites the deleted Views Cleanup plan (`MATRIX.md:3,9`). The Option Picker, Text Property, Properties, Archive, and Alias drives and `make-benchmark-nexus.mjs` seed type strings and don't break on a third kind.
- `List Types Drive` is MarkdownPM's list-types drive.

##### Documents

The documentation reference asks for surgical replacement of only the sentence made false, removal of finished to-dos, and no new member added to an enumeration that doesn't claim totality (`~/The Studio/.claude/references/studio-documentation.md`).

- **`ViewTypesPM.md`:** `:4` "Table and Cards have renderers"; `:8` the column layout without sides; `:47` "both renderers"; `:62` describes the editor's Layout as Table's leaf; `:67` Visibility as one flat list; `:79`, `:95`, and `:97` the shell's owner; `:91` a link's menu without its Format; `:159-161` the List · Gallery · Calendar · Timeline section, whose heading and body lose List while a brief `### List` section follows the Table and Cards pattern; `:174` "Neither renderer virtualizes". `:64-65` stay true for a nesting List.
- **`PommoraPRD.md`:** `:151` "Table and Cards carry renderers" becomes false; `:118` stays. `:149` is already false, the active view being the sidecar's `active_view` (`Core/Nexus/containerFields.ts:55`; `views.ts:414-419`).
- **`FrameworkPM.md`:** `:21` becomes false; `:13` is history.
- **`SymbolsPM.md:48-57`:** true.
- **`PommoraDND.md:38`:** names the settings frames among the drop-line surfaces, which List's displacing property pane makes false; `:30` is non-exhaustive.
- **`PropertiesPM.md:115`:** names "the Cards and Table views" among every surface that seats a value, which List makes false; `:144` is non-exhaustive.
- **`.claude/Resources/PommoraUIX.md`'s Tables section:** changes if List wears the `UIX/Table/` vocabulary.
- **`.claude/Benchmarks/view-band-hide.md:21,51`:** the anchor rule is per renderer by `data-view-lead`.
- **Unaffected:** `CollectionsPM.md`, `InteractionPM.md`, `InterfacePM.md:52`, `SurfacePM.md:18,24`, `NavigationPM.md:38`, `IssuesPM.md`, `ContextPM.md`, `HandoffPM.md`; `HistoryPM.md` gains entries only on request.

##### Removal Candidates

1. **The fallback machinery** stays with three kinds unbuilt (A-3).
2. **"A view saved as List draws as a Table"** stops being true; no saved view holds that type.
3. **`layout.leaf`** gains a third member, `'pane'`, and the record names its property pane through `layout.Properties` (*§C — Settings and Saved State*).
4. **The Title Icons entry** is written in both records (`tableKind.ts:12`; `cardsKind.ts:28`); a List record would be the third copy, so it should be one shared entry.
5. **Stale per-kind fields** ride a type switch with no cleanup; a third kind adds to that tail.

##### Rules Written for Two Kinds

- **`nests`** gates five things (see the reader table); List with `nests: true` is Table's behavior in all of them, and a kind wanting some but not all would split the boolean.
- **`leaf`** is binary.
- **Shell insets** key on `.table-head` and `.cards-view`, and the banner bleed on `.table-shell`; the Cleanup moved the tile's equivalent onto `data-view-lead` and `data-view-embed` (commit `4a77ab628`) but left these two stylesheets.
- **`format`** is stored on every view and read only by Cards (`views.ts:38-39`).
- **`ROLES`** must name any field List adds; check whether `column_alignments` already carries the brief's left and right before adding one (D-1 settles that it doesn't).
- **Tests and drives** name kinds in pairs.

##### Where the Brief Is Wrong

- **"Item Icons":** the switch is **Title Icons** (`hide_page_icons`, inverted; `tableKind.ts:12`); F-1 settles it.
- **The ViewFrame Mock:** the editor's rows run Layout, Group, Filter, Sort (`ViewPane.tsx:27-33`), and its switches sit inside its Layout leaf (`ViewFrame.tsx:202-220`), while Cards' rows are its root's footer (`ViewFrame.tsx:182`).
- **"Outlines":** nothing like it exists as a setting; the nearest are Hide Borders and the menus' rail.
- **"SettingsFrame can keep the Visibility leaf":** true as it stands; the Settings door lists Visibility for every kind (`SettingsFrame.tsx:42-45`), and only the editor omits it (`ViewFrame.tsx:147`).
- **"Grouping and filtering … identical to Table":** holds with `nests: true`.

##### Anything Else

- **What a Third Kind Exercises First:** a second nesting kind, a `leaf` other than the two, `data-view-lead="row"` with one column, embed zoom for a third renderer, and which per-kind fields a type switch should carry.
- **The Drive's Cost:** a third kind multiplies the Views Drive matrix's "crossed with each surface" groups; List's cases should cover the behaviors List alone introduces plus the regressions it shares with Table, and cite nothing deleted with this planning folder.
- **Doc Size:** `ViewTypesPM.md` is 174 lines with a full section per renderer; List's should stay overview-level.
