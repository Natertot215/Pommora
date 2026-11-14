## View Types


A view is a saved presentation of a Collection's or a Set's Pages. It never modifies its source: filtering, grouping, and sorting are presentation only, computed by one pure pipeline that every renderer draws from. Six view kinds — **Table**, **Cards**, **List**, **Gallery**, **Calendar**, and **Timeline** — form one registry, `VIEW_KINDS` in `Core/Views/views.ts`, each entry carrying the kind's label and icon; Table, Cards, and List have renderers, and the other three appear in the type picker at full weight but don't switch. Views also render inside dashboard and Space tiles as view embeds, through the same pipeline.

### The Saved-View Model

Each container's sidecar holds an ordered `views[]`, each entry modeled by `savedView` in `Core/Views/views.ts`. A saved view records its `id` (a ULID), `name`, `icon` (a view without an icon of its own draws its kind's glyph), an optional `color` (a ramp cell used as the view's pill stroke), and its renderer `type`. Its column layout carries `property_order`, `hidden_properties`, per-column widths, alignments, and sides, and `column_styles` — the per-type look and the date, weekday, and time formats, which live per view here rather than on the property definition. Its query config carries the `sort` list, the `filter` group, the `group` config with the view-level band order, and the display options each renderer reads — the view's own scale (`view_scale`, 50%–150%, applied to the main pane's content and bands but never the heading or an embedded tile), card size, collapsed bands, hidden bands (a hidden property band keyed by its property and grouping level), each kind's switches.

The **active view** is the container sidecar's `active_view` field, so the view a container opens on travels with the Nexus. The ViewMenu in the toolbar — its glyph the active view's icon — opens the ViewFrame to switch it, and view CRUD (create as "Untitled", rename, duplicate, delete, reorder) persists to the sidecar. One more per-container presentation setting rides it: **Show Title**. A container never presents an empty `views[]`: an app-created container is seeded with a default view on disk, and an empty one shows the default view until its first change writes it as the container's first view.

### Creation

Every renderer creates through one act (`useViewCreation.ts`): the page exists on disk as Untitled the moment a gesture fires, stamped with the values its birth context implies — the band's group value, and values on the active sort criteria that carry one (Select, Status, Checkbox, Number, Date) — with its order settled in the same act, and its name field opens with its row. A page created in a filtered view takes the value each rule names when the rule holds one value: an Is rule on a Select, Status, or Checkbox, or an Is Any or Is All rule on a Multi-Select or a Context, where a Context's value places the page in that Space. An Any group seeds nothing when the new page, with the values its birth context implies, already meets it, and otherwise seeds from its first rule or group that seeding meets. Two such rules on one Multi-Select or Context give the page both values, a rule naming a Space the Nexus no longer holds refuses the create, and a page the other rules exclude is created outside the view. 

Every renderer shares the **hover ghost** (`UIX/Interactions/ghostCreate.ts`) with the sidebar, the option lists, and tile boards: dwelling on a row or card extends a ghost "New Page" beneath it at the inactive dim, on that renderer's own chrome, with click-to-create actions. A dwell begins only on a real pointer move, so content scrolled or drawn under a resting pointer raises none. A view with no pages shows a standing ghost that offers creation. 

### The Pipeline

`resolveView` in `Core/Views/Pipeline/` composes pure stages — **columns → filter → group → sort** — over a view, its rows, its schema, and the container's set tree, knowing nothing about where they came from, so a full page and an embedded tile run the same code, and the Matrix runs its filter stage alone over the whole Nexus. Row frontmatter loads lazily per container over a batch IPC.

#### II. Filter

A filter is a recursive group of rules under a match mode — **All** (and) or **Any** (or), **Any** by default — evaluated at every depth. Negation lives on the per-rule operators (Isn't, Isn't Empty, Doesn't Contain), so "none of these" is spelled as an All of negated rules. Whether the filter runs at all is a separate axis, `filter_enabled`, so parking a filter keeps its rules and its mode. Deleting a property, Space, Context, Set, or Collection removes it from every filter that picked it, dropping a rule it leaves with nothing to test; a folder name typed into a filter stays. A rule the schema can't read — an unknown operator, a property it doesn't hold, an operand not yet supplied — abstains rather than voting, and a filter that abstains in whole filters nothing; a row holding no value matches no positive comparison.

The operator families are type-aware:

| Type | Operators |
| --- | --- |
| Title | Is · Isn't · Starts With · Contains · Doesn't Contain |
| Text · Link | Is · Isn't · Starts With · Contains · Doesn't Contain · Is Empty · Isn't Empty |
| Number | Is · Isn't · Greater Than · At Least · Less Than · At Most · Is Empty · Isn't Empty |
| Date & Time | Is (a calendar day the value spans) · Starts Before · Starts After · Ends Before · Ends After (all inclusive; a single date starts and ends on itself) · Is Empty · Isn't Empty |
| Checkbox | Checked · Unchecked |
| Select · Status | Is · Isn't (chips read as any-of / none-of) · Is Empty · Isn't Empty |
| Multi-select | Is Any · Is All · Isn't · Is Empty · Isn't Empty |
| Context | Is Any · Is All · Isn't · Is Empty · Isn't Empty |
| File | Is Empty · Isn't Empty |
| Location | Is · Isn't (immediate parent Set) · Contains · Doesn't Contain (any depth) |

Text comparisons ignore case on Title, Text, and Link, and an option rule keeps its option through a rename. Location's Contains and Doesn't Contain also take a typed folder name, which matches every folder of that whole name regardless of case; a name matching no folder matches nothing.

#### II. Group

Grouping is structural (by Set and Sub-Set disclosure), flat, or by a property — Select, Status, or Date, the last bucketing by day, week, month, or year. Options order by the schema until a band or pane drag snapshots a manual order the view owns, and a non-groupable or deleted property falls back to structural, which every consumer then follows. Structural grouping adds two companions: `structural_order_mode`, mirroring filesystem order under its `location` value, and `sub_group`, a property bucketing inside each top-level Set band.

Per-group disclosure bands (`GroupBand.tsx`) are shown in every renderer: glyph, label, and chevron over a persisted collapse on the shared disclosure motion, Select and Status headings wearing their chips and date buckets the property icon over the column's date format. A section lead is twice the head-to-row clearance and state-free, so nothing above a band moves on toggle; an empty band is head-only at rest, and in Cards each band's grid reaches into the gap below it, the last band's by the lifted card's height, shifting nothing. A Set band renames in place and carries the Set's menu, and a top-level Set band in a Collection view, or any Set band while **Open Folders In Main View On Title Click** is on, opens its Set on a double-click of its title, and its chevron and Enter toggle it; every other band's title toggles on a click. The hover **+** appears on structural Set headers alone, since a property bucket can't infer a location. 

Ungrouped pages — those holding no value under a property grouping, and the root-level pages under location-based grouping — have no header in any view: they sit as a headerless run placed by the view's `ungrouped_placement` option, which neither **Hide Empty Groups** nor `hidden_groups` drops. 

Bands drag by their head as one line zone ([[PommoraDND]]), and stay draggable under a two-key page sort; an active search alone locks them. Under Custom order a structural drop merges into the view-level `group_order`, while **Order = Location** sends a same-parent reorder to the filesystem instead. A Select or Status band drop writes `group.order`, or the global bucket order for a sub-group, and one made under Default or Reversed switches that order to Custom with a "Switched to custom {Property} order" notice and its Undo; Date bands stay chronological and don't drag. A cross-tree drop — nesting one Set into another, or landing under a different parent — moves the folder in every mode: a nest lands first in the Set, and under Location a reparent writes its slot into the destination folder's order with no view order.

#### II. Sort

A multi-key list applied in priority order, stable on ties, with per-type comparators: Select and Status by option order or a criterion's own Custom order, dates chronological, checkbox by rank, text — Title, Text, Link, Multi-Select, and File — case-insensitive. The Sort pane authors the first two slots (primary and sub-sort) and owns the `sort` slot; a deeper hand-authored array is honored until the pane's first write replaces it. Two effective criteria retire row drag-reorder, since manual order is meaningless under a multi-key sort; a criterion whose property was deleted sorts by nothing and doesn't count.

### Surfaces

The view's configuration is edited through a handful of panes, each reachable from the toolbar.

- **ViewFrame** — the menu the ViewMenu opens: a row per saved view (click switches, the chevron opens that view's settings, right-click offers Rename, Edit Icon, Edit Color, Duplicate, Delete), closed by an **Archive** row below the last view that opens the Collection's or top-level Set's ArchiveView and reads as picked while it shows, over a New View footer. Right-clicking the ViewMenu itself toggles Show Title.
- **Layout** — the 3×2 type picker and the kind's switches, with Cards' Card Image, Card Style, and Card Scale, or List's Title Icons, Outlines, Wrap Rows, and Markers, pinned below. A ViewFrame row's chevron opens that view's own editor: the click-to-rename name, the ⋮ Duplicate and Delete, the type picker, and the four frame rows over those same pinned rows, whose Layout lists the kind's properties, its switches, or both. Deleting a view — from the ⋮ or a ViewFrame row — asks first, and its Undo returns the view to its place, selected again when it was the active one.
- **SettingsFrame** — the toolbar's sliders button: **Properties**, **Visibility**, and the Layout, Group, Filter, and Sort frames, over a footing holding the view's **Scale** — a factor picker (`1.00x`) whose right press opens the value for typing. Opened against a View Tile's own scope, that footing leads with the configuration lock and trails with the source's trail.
- **Group** — Group By (Location, or a Select, Status, or Date property), a Date By granularity, per-kind Order pickers (Location: Custom or Location; Select and Status: Default, Reversed, Custom; Date: Ascending or Descending), and a Sub-Group picker with its own Order. The middle shows the set hierarchy or the option list, each row carrying the hide eye (*§Visibility*); a Select or Status option list drags under every Order and switches the grouping's Order to Custom; the footing holds Hide Empty Groups, a List's Colored Outlines, Ungrouped Top or Bottom, and the date Separation. A kind whose bands don't nest drops Sub-Group and gains a None row.
- **Sort** — Sort By (None, Title, Creation Time, Last Modified, and the sortable properties), a per-type Order picker (Custom snapshots the current sequence), a Select or Status sort's option list, which drags under every Order and switches Sort to Custom, and a Sub-Sort with its own Order. A kind whose bands don't nest adds **Location** as a reserved sort with its own Location or Custom order.
- **Filter** — the filter as a flat row list, `(what)(operator)(value)(×)`, saved as one group under the footing's All/Any toggle, the only combinator, beside the on/off axis. Location's value field is a `TokenField` over the Set tree, rooted at the Collections when the Matrix or the Open In Preview rules filter across the Nexus: typing narrows the picker, a matched folder keeping its subtree, and under Contains and Doesn't Contain, Enter adds the typed folder name. A shape the pane can't represent renders locked behind a Reset rather than being flattened.
- **Visibility** — the shown/hidden split as one flat list: shown rows in column order, then hidden rows ghosted after them. Dragging into the shown zone reorders or unhides at the slot; dragging into the hidden zone hides; each row's eye toggles it, and a release outside the pane writes nothing. Every hide eye in these panes, Group's included, appears while its row is hovered or holds keyboard focus, while a hidden row's crossed-out eye is always drawn. Title is a draggable anchor that never hides and carries no eye. A hidden property keeps its place through a reorder, and its eye returns it there. A List view's Visibility is its two columns (*§List*).

### The View Host

Every renderer mounts through one seat, `ViewHost` (`Core/Views/Host/`), which seats the active view's renderer and hands it a single `host` object from `useViewHost`. The hook owns everything a renderer needs before it can draw and each piece exists once: the container's values and their optimistic override layer from `useContainerValues`, the schema and the active view, the manual order, collapse state, the pipeline invocation, the view search over its groups, and the derived maps (columns, groups, the band model and the Set index, row lookups), the value writer, and view persistence. A renderer contributes presentation and one policy. It mounts `useViewInteractions` beside the host, stating its ghost timing, where its value editor anchors, its New Page rows, and, where its items add, show, and hide properties themselves, what an item draws — and receives every pointer behavior in return, with an item's Add list and Remove: band drops, row drops routed from one `(activeId, toZone, beforeId)` to a reorder, a relocate at that slot, or a reassign, page creation, page opening, the page menu, and the ghost lifecycle. A row drop writes the landing folder's page order under a Location order and the view's `manual_order` at the slot under Custom, where a page moving folders joins its new folder unlisted. The renderer assigns only its view root; whether bands nest comes from the kind through the host's `nests`, so a renderer never switches on a view's type. The host's view is the saved view with its pending writes folded in, and every surface editing that view — the host and each settings pane — reads and extends the same pending record, so each save carries every edit made before it; a view write is a patch of the fields it changes. Each pending field settles against the saved view, dropping once the saved view carries the last save or another writer changes that field; the record lasts while anything shows the view, and the value override clears only on a real container switch. A new renderer mounts the host and the interactions hook, supplies its policy, and writes presentation only.

### View Search

A container's in-line title in the main pane also carries a search over its view, as ArchiveView's title does over its rows. Resting on the title slides a "Search" hint out beside it, after a divider; the hint is the search field itself, and clicking it slides the title away so the field takes its place, while clicking the title, choosing Search from the title's or banner's menu, or the **Search** command (⌘F) puts the field in the title's place at once. Ending the search slides the title back. The query narrows the rows the view already resolves, in the view's own filter, grouping, and order, to those the one search rule matches by title or by the path below the container, while a page created during a search stays shown until you leave for another view, tab, or page: a group left empty hides, every shown group opens without changing the saved collapse, rows and group bands hold still until it ends, and the Subfield's count matches the search's results. The query belongs to its tab for the session — it holds across a tab switch and clears when the tab shows something else — and Escape outside the field, the X at the view's right edge, or leaving the field empty ends it; Escape inside the field leaves it with the query kept.

### Table

The Table renderer (`Core/Views/Table/`) draws a container's Pages as rows on a single CSS grid, wearing the shared Tables chrome ([[PommoraUIX]]) — the column-header band, its segment bars, the hairlines, and the borderless regime live in `UIX/Table/`. It is presentation only: the pipeline hands it resolved groups and per-cell values. The table's three creation triggers ride the shared act: the structural header's **+** creates at that Set's end and glides to the row; **New Page Above / Below** on the grip and title menus creates beside its anchor; and the hover ghost row creates below. 

#### II. The Grid

The header band and every data row are separate CSS grids reading one shared track set, so columns align across bands without a `<colgroup>`; the title column absorbs any pane width past the summed columns. While the columns fit the pane, the table stays capped at the content inset; once anything pushes the sum past it, the whole view scrolls horizontally, heading and rows together, with the left gutter as the fixed boundary. The heading band's fill bleeds to both glass edges while its tracks stay locked to the body grid. A gutter left of the grid — the same lane and width as the editor's fold gutter — holds the row grips and the band chevrons; band headers stick left while columns scroll.

#### II. Columns

Widths are per-type `{min, default, max}` from one source (`useColumns.ts`, which also holds the alignment default and the column layer the Table keeps out of the host's view), clamped on every resolve so a stale saved value can't squash a column below legibility or stretch it past its ceiling; Title alone is uncapped. Resize is a right-edge strip; reorder drags the header as one band while neighbors slide to open the gap; Hide animates the track shut. Right-clicking a header opens the native column menu: alignment, the per-type **Style** submenu (**Format** for Link and the date types, whose choices set how the value is written), **Icon** toggling the view-wide column icons, and Hide. Status, Select, and Multi-select share the Standard and Compact styles; a Link column's rows are the three link forms and a column naming none reads the property's; Number's format is property-wide and only its Number or Bar look is per view. The title column is the primary column and is neither hideable, alignable, nor styleable.

#### II. Rows & Cells

A cell's content is type-aware — a page icon and title, chips, a checkbox or switch, a link, file chips, a formatted date or number, a progress bar, or a Text value's first line with its connections live — reading the per-view column style. Every cell owns its click through the shared gesture rules in `Core/Properties/Pickers/valueClick.ts`, which every view and the Properties panel read: the title navigates, or opens a new tab under ⌘, option cells open the shared value dropdown, a checkbox toggles, a number enters its inline editor or, drawn as a bar, the number picker, a Text value enters its inline field over its first line or, from the pen beside it, TextPane, a link opens its address, or its inline field when empty or malformed, and a file chip opens the file dialog. A link's menu offers Edit Title as the alias popover and Edit Link as the inline field on every surface, and in a view the view's Format. Right-click opens the cell's menu: the title gets the page menu with New Page Above and Below, a link cell the link menu, a file cell its Add, Replace, and Remove rows, and style-bearing types their column's style radios, with Clear beside them on a filled Select, Multi-Select, Status, or Date cell. Chip values carry the hover × that removes one value without opening the picker. Inline edits follow Enter to confirm, click-out to save, and Esc to revert; a number that won't parse reads dimmed and isn't saved. Dragging down an option column's cells from outside a multi-value chip sweeps a contiguous cross-group range instead of lifting the row, and the release opens the shared dropdown over every swept row at once — picks fan out per row against each row's own value. ⌘Z walks the most recent value edit back on any value surface, and a sweep's fan-out is one step. A hover-revealed grip in the gutter lifts the row for drag-reorder and carries its own menu (Preview, New Tab, Rename, Edit Icon, New Page Above and Below, Delete).

#### II. The Table Sheet

The table's design vocabulary is a whole-file token sheet scoped to `.table`, the class every tabular surface wears ([[PommoraUIX]] · Tables). A host rebinds what it needs in its own scope — the heading fill, divider, and padding; the body hairline stays one width. Table, List, and ArchiveView wear one shell over it, `Core/Views/Rows/table-shell.css`, and Table adds its own layer, `table-view.css`. Atlas convention per [[PommoraUIX]].

**SOURCE:** `UIX/Table/table-tokens.css` · `UIX/Table/table.css` · `Core/Views/Rows/table-shell.css` · `Core/Views/Table/table-view.css`

| Title | Token | Value |
| --- | --- | --- |
| Density | `--zoom` | `1` (the Compact knob's target) |
| Cell Padding | `--cell-padding-x` / `--cell-padding-y` | `12px` / `6px` |
| Cell Icon Gap | `--cell-icon-gap` | `6px` |
| Loose-Row Inset | `--loose-inset` | `8px` |
| Hairline | `--table-border-width` / `--table-border` | → `var(--width-125)` / composed on `--border-base` |
| Active Cell Radius | `--cell-active-radius` | `4px` |
| Heading | `--heading-fill` / `--heading-divider` | → fill-quinary / `width-175` on `border-base` (host-bound); heading text is `callout` · emphasized at `label-secondary`, set on `.table-head` |
| Heading Segment | `--heading-segment` / `-height` / `-width` | → border-base / `16px` / `width-200` |
| Heading Padding | `--heading-padding-y` | `8px` |
| Band Clearance | `--band-clearance` | → `var(--cell-padding-y)` (the seam rule's input) |
| Resizer Strip | `--resizer-width` | `8px` |
| Column Drag | `--col-highlight` / `--col-drag-band` / `--col-shift-ease` | → state-selected / bg-window / fast+standard |
| Right Inset | `--table-right-inset` | → `--content-inset` (the shell's); `0px` once overflowing (TableView's own) |

### Cards

The Cards renderer (`Core/Views/Cards/`) draws Pages as a resizable card grid over the same pipeline, and draws the same inside a view embed at the embed's zoom. A card is an image band over a text area — title, then properties, then an optional location footing — with the image band a fixed height scaled by the card factor and every card in a row matching its tallest sibling. The grid is the shared card grid in its fill regime, and every card is the `UIX/Cards` chassis ([[PommoraUIX]]): page cards reflow below a fixed image band, Set Cards are locked to the card aspect. **Card Scale** is a factor picker in LayoutFrame, persisted as `card_size`. A per-view **Card Image** chooses the image: **Preview** (the captured thumbnail), **Banner** (the page's banner), or **None** (imageless, compact cards); right-clicking the image band edits the page's banner through the page header's own flow. The layout is the view's `format` — **Standard** (title, then one labeled row per property) or **Compact** (label-less values packed in order) — shaped further by **Wrap Titles** and **Title Icons**.

#### II. Properties on Cards

Cards show every visible property, a Compact card leaving off one its page holds no value for, through the shared chip and cell renderers, and each value is interactive on the same gesture rules the table cells use — a click opens the value's picker, a checkbox toggles. Right-clicking a value opens the cell menu with a trailing **Remove** that drops the property from the view; a live link opens the link menu instead. The whole card except its multi-value chips is a drag handle, so a value's click stops before the card sees it, and only the title and the image band open the page. The value, add, and image pickers mount at the grid level, so an open picker survives row churn and a card carries no picker of its own. An **Add** list — from empty space in the text area or the location footing — lists the Contexts and properties not shown on the card, with rows that only show a held value last, since picking one shows it rather than sets it, and reveals a property on its first committed value.

#### II. Grouping, Location & Set Cards

Cards never indent: structural grouping renders one flat band per top-level Set with its whole subtree gathered inside, a property grouping replaces those with bucket bands. No sub-grouping applies. **Group By: None** renders one headerless list, and **Sort By: Location** orders at the resolve level with a Location (filesystem) or Custom (manual) order, a card drag writing the folder order or the view's order to match; the two together are the flat, filesystem-ordered list. Each card's **location footing** is a NavTrail of its Set ancestry, governed by **Hide Location**; under structural grouping it drops the leading crumb the band already names. A **Set Cards** switch adds a leading row of larger cards, one per Set, each navigating to it and reorderable by drag, which writes the folder order under Location and the view's `group_order` under Custom, as a Set band does.

#### II. Drag & Menus

Cards reorder within their band by displacement; the drag engine reports the landing slot as a `beforeId`, and the view routes it as the shared `(activeId, toZone, beforeId)` drop, which writes the folder's page order under a Location order and the view's `manual_order`, the pipeline's lowest-priority tiebreaker, otherwise. Two effective sort criteria retire it: a card still lifts to carry to the tab bar, but previews no slot and crosses no band. A card dropped across location bands moves the page into that band's Set at its landing slot through the same route. Band drag is the shared line zone without a nest zone — every drop is a reorder, writing the view's band order, or the container's Set order under the Group pane's Order: Location. A card's right-click menu is the page menu, led by Edit Image when a banner is set, and its one New Page creates after the anchor; the hover ghost grows a skeleton card at the next flow slot with neighbors making room.

#### II. Card Tokens

The chassis tokens — the floor, gaps, thumb height and share, and preview zoom — live with the chassis in `UIX/Cards/cards.css` ([[PommoraUIX]]); the renderer's own scope rescales the floors by the Size factor and adds what only the collection layer needs. Atlas convention per [[PommoraUIX]].

**SOURCE:** `UIX/Cards/cards.css` · `Core/Views/Cards/cards-view.css`

| Title | Token | Value |
| --- | --- | --- |
| Column Floor | `--card-min-base` / `--card-min` | `180px` (chassis; the unscaled floor and its live alias) |
| Gaps | `--card-gap-h` / `--card-gap-v` | `10px` / `10px` (chassis) |
| Thumb Height | `--card-thumb-h-base` / `--card-thumb-h` | `100px` (chassis; the reflow band and its live alias) |
| Thumb Share | `--thumb-share` | `65%` (chassis; a locked card's image share) |
| Preview Zoom | `--card-preview-zoom` | `1.25` (chassis; captured previews only) |
| Scaled Floor | `--card-min` | `calc(var(--card-min-base) * var(--card-scale, 1))` |
| Scaled Thumb | `--card-thumb-h` | `calc(var(--card-thumb-h-base) * var(--card-scale, 1))` |
| Set-Card Floor | `--set-card-min` | `calc(var(--card-min) * 1.5)` |
| Body Minimum | `--card-body-min` | `calc(16px + 18px + var(--card-min-rows) * (var(--card-row-h) + 4px))`; one row reserved, two in compact |
| Band Clearance | `--band-clearance` | → `var(--card-gap-v)` (the seam rule's input) |
| Compact Rows | `--card-row-h` / `--card-foot-h` | `16px` / composed |
| Label Retunes | `--label-pad-x` | `4px` |

#### II. Prospects

- **A Set-Card ghost** — dwelling on a Set Card growing a ghost that creates a Set.
- **Set-Card previews** — a Set Card opening a preview of the Set's view; today it navigates.
- **File-property covers** — any File property declaring itself the card's image, a fourth Card Image mode.
- **Fit Image** — contain versus fill on covers. Repositioning ships through the ImagePicker.

### List

The List renderer (`Core/Views/List/`) draws each Page as one row without columns: its title and its property values side by side, in a left group that holds the title and a right group at the row's edge. Its rows are a Table's drawn compact and without lines between them, with the title in a card's emphasized text and the Table's grip, indentation, nesting, creation, and row drag. A row draws no fill while its page is the selection, where a Table's row does.

Each property sits on a side, set per view over a default for its type: option properties and Contexts on the left, everything else on the right. A thin bar separates the title and each property's values from their neighbors, and a property a page holds no value for is left off its row, as on Compact cards, except a Checkbox, whose unchecked box is its toggle. Only the title opens the page. A hover **+** after the row's last group opens the row's **Add** list, and a value's **Remove** hides its property from the view, as on a card.

A long value stops at a maximum width and scrolls on hover. On a crowded row the title shortens first, down to a minimum, and then both groups shrink, each fading and scrolling on hover; with **Wrap Rows** on, the right group drops to a second line instead. **Outlines** draws a rail beside the rows of each band, which **Colored Outlines** draws in a Select or Status band's option color. **Markers** hangs a bullet beside each page row, which a root-level row gives up for its drag handle on hover.

A List view's Visibility pane shows the two sides as two columns, **Left** and **Right**. Left reads as the left group does, with Title held among its rows, and Right reads from the row's edge inward. A property drags within its column or across to the other, a right-click moves it to either side, and its eye alone hides it, to the foot of its column.

### Gallery · Calendar · Timeline

Registered in `VIEW_KINDS` with no renderer behind them. A view carrying one of these kinds seats the default kind's renderer, Table.

---

#### II. Pending

- **Table Flatten and Location subtitle** — the table's no-grouping mode, with a page's location as a subtitle in its title cell under its own Flatten and Hide Location toggles. Cards already carry both.
- **The property-bucket +** — a property or ungrouped band offers no create, since a bucket can't infer a location.

#### II. Known Issues

- **Row grips scroll with their row on horizontal scroll.** Freezing them cleanly means freezing the whole title column, which is an open decision.
- **A mid-drag column hide or watcher view-push is reverted by the column drop's persist**, since the drop reads grab-time state. Reachable only by changing columns while holding a drag.
- **No renderer virtualizes.** Every row or card in a container is mounted; a very large Collection feels it. The gap is known and waits its turn.
