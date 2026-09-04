## View Types

A view is a saved presentation of a Collection's or a depth-1 Set's Pages. It never modifies its source: filtering, grouping, and sorting are presentation only, computed by one pure pipeline that every renderer draws from. Six view types are registered in `src/shared/views.ts` — **Table**, **Cards**, **List**, **Gallery**, **Calendar**, and **Timeline** — of which Table and Cards have renderers; the other four appear in the type picker at full weight but don't switch. Views also render inside dashboard and page tiles as view embeds, through the same pipeline.

### The Saved-View Model

Each container's sidecar holds an ordered `views[]`, each entry modeled by `savedView` in `src/shared/views.ts`. A saved view records its `id` (a ULID), `name`, `icon`, an optional `color` (a ramp cell worn as the view's segment stroke), and its renderer `type`. Its column layout carries `property_order`, `hidden_properties`, per-column widths and alignments, and `column_styles` — the per-type look and the date, weekday, and time formats, which live per view here rather than on the property definition. Its query config carries the `sort` list, the `filter` group, the `group` config with the view-level band order, and the display options each renderer reads — the view's own scale (`view_scale`, 50%–150%, applied to the main pane's content and bands but never the heading or an embedded tile), card size, collapsed and hidden bands, the cards toggles.

The **active view** is tracked per machine and kept out of the synced sidecar. The ViewMenu in the toolbar — its glyph the active view's icon — opens the ViewFrame to switch it, and view CRUD (create as "Untitled", rename, duplicate, delete, reorder) persists to the sidecar. A per-container presentation setting rides the sidecar and syncs: **Show Title**. A container never presents an empty `views[]`: an app-created container is seeded with a default view on disk, and an empty view-bearing container mints one on first entry.

### Creation

Every renderer creates through one act (`useViewCreation.ts`): the page exists on disk as Untitled the moment a gesture fires, stamped with the values its birth context implies — the band's group value, and values on the active sort criteria that carry one (Select, Status, Checkbox, Number, Date) — with its order settled in the same act, and the renderer opens its own naming field over the row already real. A view's filter stamps the values its rules cleanly imply; metadata is never changed to satisfy a filter, so a page a non-derivable rule excludes creates and stays filtered out.

Every renderer also shares the **hover ghost** (`Interactions/ghostCreate.ts`): dwelling on a row or card extends a ghost "New Page" beneath it at the inactive dim, on that renderer's own chrome, and clicking it creates there. One dwell paces every surface; grace is per-surface, and a menu or editor owning the pointer stands the ghost down.

### The Pipeline

`resolveView` in `src/renderer/Views/Pipeline/` composes four pure stages — **columns → filter → group → sort** — over a view, its rows, its schema, and the container's set tree, knowing nothing about where they came from, so a full page and an embedded tile run the same code. Row frontmatter loads lazily per container over a batch IPC.

#### II. Filter

A filter is a recursive group of rules under a match mode — **All** (and) or **Any** (or) — evaluated at every depth. Negation lives on the per-rule operators (Isn't, Isn't Empty, Doesn't Contain), so "none of these" is spelled as an All of negated rules. Whether the filter runs at all is a separate axis, `filter_enabled`, so parking a filter keeps its rules and its mode. A rule the schema can't read — an unknown operator, a deleted property or Set, an operand not yet supplied — abstains rather than voting, and a filter that abstains in whole filters nothing; a row holding no value matches no positive comparison.

The operator families are type-aware, defined in `src/renderer/Frames/filterModel.ts`:

| Type | Operators |
| --- | --- |
| Text (Title) | Is · Isn't · Starts With · Contains · Doesn't Contain |
| Number | Is · Isn't · Greater Than · At Least · Less Than · At Most · Is Empty · Isn't Empty |
| Date | Is (calendar day) · Before · After (both inclusive) · Is Empty · Isn't Empty |
| Checkbox | Is (true / false) |
| Select · Status | Is · Isn't (chips read as any-of / none-of) · Is Empty · Isn't Empty |
| Multi-select · Context | Is Any · Is All · Isn't · Is Empty · Isn't Empty |
| File | Is Empty · Isn't Empty |
| Location | Is · Isn't (immediate parent Set) · Contains · Doesn't Contain (any depth) |

#### II. Group

Grouping is structural (by Set and Sub-Set disclosure), flat, or by a property — Select, Status, Checkbox, or Date, the last bucketing by day, week, month, or year. Options order by the schema until a band drag snapshots a manual order the view owns, and a non-groupable or deleted property falls back to structural, which every consumer then follows. Structural grouping adds two companions: `structural_order_mode`, mirroring filesystem order under its `location` value, and `sub_group`, a property bucketing inside each top-level Set band.

Per-group disclosure bands(`GroupBand.tsx`) are shown in both renderers: glyph, label, and chevron over a persisted collapse on the shared disclosure motion, Select and Status headings wearing their chips and date buckets the property icon over the column's date format. A section lead is twice the head-to-row clearance and state-free, so nothing above a band moves on toggle, and the hover **+** appears on structural Set headers alone, since a property bucket can't infer a location. 

Ungrouped pages under a property-grouped configuration use a style-specific "none" label as their heading unless the **Hide Empty Groups** option takes it; `hidden_groups` drops them outright. Ungrouped pages in location-based grouping aren't placed under a disclosure label, and are instead placed as root-level rows with their order defined via the view's `ungrouped_order` option. 

Bands drag by that same glyph on the shared insertion-line gesture over a frozen snapshot of the geometry: under Custom order, a structural drop merges into the view-level `group_order`, a property drop writes `group.order` and flips its mode to manual, and a sub-group drop writes the global bucket order, while **Order = Location** sends a same-parent reorder to the filesystem instead. A cross-tree drop — nesting one Set into another, or landing under a different parent — moves the folder in every mode.

#### II. Sort

A multi-key list applied in priority order, stable on ties, with per-type comparators: Select and Status by option order or a criterion's own Custom order, dates chronological, checkbox by rank, text case-insensitive. The Sorting pane authors the first two slots (primary and sub-sort) and owns the `sort` slot; a deeper hand-authored array is honored until the pane's first write replaces it. Two effective criteria retire row drag-reorder, since manual order is meaningless under a multi-key sort; a criterion whose property was deleted sorts by nothing and doesn't count.

### Surfaces

The view's configuration is edited through a handful of panes, each reachable from the toolbar.

- **ViewFrame** — the menu the ViewMenu opens: a row per saved view (click switches, the chevron opens that view's settings, right-click offers Rename, Edit Icon, Edit Color, Delete) over a New View footer. Right-clicking the ViewMenu itself toggles Show Title.
- **LayoutFrame** — the per-view editor, reached from a ViewFrame row's chevron (with the ⋮ Duplicate and Delete and the four frame rows) or from the SettingsFrame's Layout entry (the flat door). It holds the click-to-rename name, the 3×2 type picker, and the type's options: the Layout frame is the visibility list for a Table, and the cards options for Cards with Style, Card Banner, and Size pinned in its footing. Deleting a view — here or from a ViewFrame row — asks first.
- **SettingsFrame** — the toolbar's sliders button: **Configuration** (the Collection's Open In), **Properties**, **Visibility**, and the Layout, Group, Filter, and Sort frames, over a footing holding the view's **Scale** — a factor picker (`1.00x`) whose right press opens the value for typing.
- **Grouping** — Group By (Location, or a Select, Status, or Date property), a Date By granularity, per-kind Order pickers (Location: Custom or Location; Select and Status: Default, Reversed, Custom; Date: Ascending or Descending), and a Sub-Group picker with its own Order. The middle shows the set hierarchy or the option list, each row carrying the hide eye; the footing holds Hide Empty Groups, Ungrouped Top or Bottom, and the date Separation. A cards view drops Sub-Group and gains a None row.
- **Sorting** — Sort By (None, Title, Creation Time, Last Modified, and the sortable properties), a per-type Order picker (Custom snapshots the current sequence into a draggable list), and a Sub-Sort with its own Order. A cards view adds **Location** as a reserved sort with its own Location or Custom order.
- **Filtering** — the filter as a flat row list, `(connector)(what)(operator)(value)(×)`, serialized to the nested group: a run of Ands is one group and an Or starts the next. The footing carries the All/Any toggle and the on/off axis. Location's picker is the Set tree. A shape the pane can't represent renders locked behind a Reset rather than being flattened.
- **Visibility** — the shown/hidden split as one flat list: shown rows in column order, then hidden rows ghosted after them. Dragging into the shown zone reorders or unhides at the slot; dragging into the hidden zone hides; each row's eye toggles it. Title is a draggable anchor that never hides.

### The View Host

Every renderer mounts through one seat, `ViewHost` (`src/renderer/Views/ViewHost.tsx`), which resolves the container's active view type, seats a renderer, and hands it a single `host` object from `useViewHost` (`src/renderer/Views/useViewHost.ts`). The hook owns everything a renderer needs before it can draw and each piece exists once: the container's values and their optimistic override layer, the schema and the active view, the per-machine manual order, the optimistic `property_order` / `hidden_properties` / `column_styles` layers and the band-order layer, collapse state, the pipeline invocation and its derived maps (columns, groups, the set tree, row and band lookups), the value and context writers, view persistence, and the creation engine. A renderer contributes presentation plus a five-field seam: a fold that adds its local layers to every persist at fire time (Table folds column widths and alignments), whether structural grouping flattens (Cards), the band-key-to-bucket resolver the creation engine seeds from, its scroll root, and the naming surface a create opens. Four of the five come up from the renderer through refs it assigns while rendering and the host reads when a write fires; the flattening flag is the exception, decided by the seat before the host runs — a renderer names its own structural shape without the host ever switching on a view's type. `liveView` is the saved view with the host's layers folded in, and it is what the pipeline, the gates, the creation engine, and every persist read; the saved view is what the catch-up drops compare against, so an override retires the moment the canonical view carries it. Host layers reset when the container id or the view id changes, the manual order drops on any fresh tree (canon has caught up), and the value override clears only on a real container switch. Loading and empty are decided at the seat: "Loading…" until the resolve context exists, "No pages here" when the pipeline yields no groups — except a Cards view over a container with Sets, whose Set Cards row renders independently of the pipeline, so it always mounts. A new renderer mounts the host and writes presentation only.

### Table

The Table renderer (`src/renderer/Views/TableView/`) draws a container's Pages as rows on a single CSS grid, wearing the shared Tables chrome ([[DesignSystemPM]]) — the column-header band, its segment bars, the hairlines, the borderless regime, and the cell renderers live in `src/renderer/Tables/`. It is presentation only: the pipeline hands it resolved groups and per-cell values, and the view owns the shell, the grid density, the grip gutter, and the band rhythm. The table's three creation triggers ride the shared act: the structural header's **+** creates at that Set's end and glides to the row; **New Page Above / Below** on the grip and title menus creates beside its anchor; and the hover ghost row creates below. 

#### II. The Grid

The header band and every data row are separate CSS grids reading one shared track set, so columns align across bands without a `<colgroup>`; a trailing filler track absorbs any pane width past the summed columns. Every column, including the title, maintains its resolved width. While the columns fit the pane, the table stays capped at the content inset; once anything pushes the sum past it, the whole view scrolls horizontally, heading and rows together, with the left gutter as the fixed boundary. The heading band's fill bleeds to both glass edges while its tracks stay locked to the body grid. A gutter left of the grid — the same lane and width as the editor's fold gutter — holds the row grips and the band chevrons; band headers stick left while columns scroll.

#### II. Columns

Widths are per-type `{min, default, max}` from one source (`columnWidths.ts`), clamped on every resolve so a stale saved value can't squash a column below legibility or stretch it past its ceiling; Title alone is uncapped. Resize is a right-edge strip; reorder drags the header as one band while neighbors slide to open the gap; Hide animates the track shut. Right-clicking a header opens the native column menu: alignment, the per-type **Style** submenu (**Format** for Link and Number, whose rows are one), **Icon** toggling the view-wide column icons, and Hide. Status, Select, and Multi-select share the Standard and Compact styles; a Link column's rows are the three link forms and a column naming none reads the property's; Number's format is property-wide and only its Number or Bar look is per view. The title column is the primary column and is neither hideable, alignable, nor styleable.

#### II. Rows & Cells

A cell's content is type-aware — a page icon and title, chips, a checkbox or switch, a link, file chips, a formatted date or number, or a progress bar — reading the per-view column style. Every cell owns its click through the shared gesture rules in `Properties/Assignment/valueClick.ts`: the title navigates, option cells open the shared value dropdown, a checkbox toggles, a number enters its inline editor, a link opens, and a file chip opens the file dialog. Right-click always opens a menu: the title gets the page menu with New Page Above and Below, a link cell the link menu, a file cell its Add, Replace, and Remove rows, and style-bearing types their column's style radios. Chip values carry the hover × that removes one value without opening the picker. Inline edits follow Enter to confirm, click-out to save, and Esc to revert. Dragging down an option column's cells sweeps a contiguous cross-group range instead of lifting the row, and the release opens the shared dropdown over every swept row at once — picks fan out per row against each row's own value, and ⌘Z walks the most recent value edit back. A hover-revealed grip in the gutter lifts the row for drag-reorder and carries its own menu (Open Preview, Open New Tab, Rename, Edit Icon, New Page Above and Below, Delete).

#### II. The Table Sheet

The table's design vocabulary is a whole-file token sheet scoped to `.table`, the class every tabular surface wears ([[DesignSystemPM]] · Tables). A host rebinds what it needs in its own scope — the heading fill and divider, the cell padding — and states `is-clear` for a heading with no fill and no seam; the body hairline stays one width. TableView adds its own layer over it. Atlas convention per [[DesignSystemPM]].

**SOURCE:** `Pommora/src/renderer/Tables/table-tokens.css` · `Pommora/src/renderer/Tables/Table.css` · `Pommora/src/renderer/Views/TableView/table-view.css`

| Title | Token | Value |
| --- | --- | --- |
| Density | `--zoom` | `1` (the Compact knob's target) |
| Cell Padding | `--cell-padding-x` / `--cell-padding-y` | `12px` / `6px` |
| Cell Icon Gap / Label Run Gap | `--cell-icon-gap` / `--labels-gap` | `6px` / `4px` |
| Nesting Indent | `--row-indent` | → `var(--disclosure-indent)` |
| Loose-Row Inset | `--loose-inset` | `8px` |
| Hairline | `--table-border-width` / `--table-border` | → `var(--width-125)` / composed on `--border-base` |
| Active Cell Radius | `--cell-active-radius` | `4px` |
| Heading | `--heading-fill` / `--heading-divider` | → fill-quinary / `width-175` on `border-base` (host-bound); heading text is `callout` · emphasized at `label-secondary`, set on `.table-head` |
| Heading Segment | `--heading-segment` / `-height` / `-width` / `--segment-tone` | → border-light / `16px` / `width-150` / a `.table-segment`'s own tone |
| Heading Padding | `--heading-padding-y` | `8px` |
| Band Clearance | `--band-clearance` | → `var(--cell-padding-y)` (the seam rule's input) |
| Resizer Strip | `--resizer-width` | `8px` |
| Column Drag | `--col-highlight` / `--col-drag-band` / `--col-shift-ease` | → state-selected / bg-window / fast+standard |
| Right Inset | `--table-right-inset` | → `--content-inset`; `0px` once overflowing (TableView's own) |

#### II. Known Issues

- **Row grips scroll with their row on horizontal scroll.** Freezing them cleanly means freezing the whole title column, which is an open decision.
- **A mid-drag column hide or watcher view-push is reverted by the column drop's persist**, since the drop reads grab-time state. Reachable only by changing columns while holding a drag.

### Cards

The Cards renderer (`src/renderer/Views/CardView/`) draws Pages as a resizable card grid over the same pipeline, and draws the same inside a view embed at the embed's zoom. A card is an image band over a text area — title, then properties, then an optional location footing — with the image band a fixed height scaled by the card factor and every card in a row matching its tallest sibling. The grid is the shared card grid in its fill regime, and every card is the `src/Cards` chassis ([[DesignSystemPM]]): page cards reflow below a fixed image band, Set Cards are locked to the card aspect. **Size** is a slider in LayoutFrame's footing, persisted as `card_size`. A per-view **Card Banner** chooses the image: **Image** (the page's banner), **Preview** (the captured thumbnail), or **None** (imageless, compact cards); right-clicking the image band edits the page's banner through the page header's own flow. The layout is the view's `format` — **Standard** (title, then one labeled row per property) or **Compact** (label-less values packed in order) — shaped further by **Wrap Titles** and **Hide Icons**.

#### II. Properties on Cards

Cards show every visible property through the shared chip and cell renderers, and each value is interactive on the same gesture rules the table cells use — a click opens the value's picker, a checkbox toggles. Right-clicking a value opens the cell menu with a trailing **Remove** that drops the property from the view; a live link opens the link menu instead. The whole card is a drag handle, so a value's click stops before the card sees it, and only the title and the image band open the page. Pickers mount at one grid-level host so an open picker survives row churn. A two-stage **add-picker** — from empty space in the text area, the location footing, or the card menu's **Add Property ▸** — lists everything not shown on the card and reveals a property on its first committed value.

#### II. Grouping, Location & Set Cards

Cards never indent: structural grouping renders one flat band per top-level Set with its whole subtree gathered inside, a property grouping replaces those with bucket bands, and ungrouped pages band under the container's own heading. No sub-grouping applies. **Group By: None** renders one headerless list, and **Sort By: Location** orders at the resolve level with a Location (filesystem, drag off) or Custom (manual, drag on) order; the two together are the flat, filesystem-ordered list. Each card's **location footing** is a NavTrail of its Set ancestry, governed by **Hide Location**; under structural grouping it drops the leading crumb the band already names. A **Set Cards** switch adds a leading row of larger cards, one per Set, each navigating to it and reorderable by drag, which writes the container's set order.

#### II. Drag & Menus

Cards reorder within their band by displacement, writing the per-machine manual order the pipeline reads as its lowest-priority tiebreaker; two effective sort criteria or a Location sort retire it. A card dropped across location bands moves the page into that band's Set at its landing slot. Band drag is the shared insertion-line gesture without a nest zone — every drop is a reorder, writing the view's band order, or the container's Set order under Sort By: Location. A card's right-click menu holds **Add Property ▸** over the page menu: Edit Image when a banner is set, Open, Rename, Edit Icon, New Page, Move To ▸, Copy Link, Copy Path, Delete. New Page creates after the anchor, and the hover ghost grows a skeleton card at the next flow slot with neighbors making room.

#### II. Card Tokens

The chassis tokens — the floor, gaps, thumb height and share, and preview zoom — live with the chassis in `src/Cards/cards.css` ([[DesignSystemPM]]); the renderer's own scope rescales the floors by the Size factor and adds what only the collection layer needs. Atlas convention per [[DesignSystemPM]].

**SOURCE:** `Pommora/src/renderer/Cards/cards.css` · `Pommora/src/renderer/Views/CardView/cards-view.css`

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
| Body Minimum | `--card-body-min` | `calc(var(--card-thumb-h) * 0.54)`; compact recomputes from its row stack |
| Band Clearance | `--band-clearance` | → `var(--card-gap-v)` (the seam rule's input) |
| Compact Rows | `--card-row-h` / `--card-foot-h` | `17px` / composed |
| Label Retunes | `--label-pad-x` | `4px` |

#### II. Prospects

- **A Set-Card ghost** — dwelling on a Set Card growing a ghost that creates a Set.
- **Set-Card previews** — a Set Card opening a preview of the Set's view; today it navigates.
- **File-property covers** — any File property declaring itself the card's image, a fourth Card Banner mode.
- **Fit Image** — contain versus fill on covers. Repositioning ships through the ImagePicker.

### List · Gallery · Calendar · Timeline

Registered in the type union and present as picker tiles, with no renderer behind them; a view of any of these types falls through to the table.

---

#### Pending

- **Table Flatten and Location subtitle** — the table's no-grouping mode, with a page's location as a subtitle in its title cell under its own Flatten and Hide Location toggles. Cards already carry both.
- **The property-bucket +** — a property or ungrouped band offers no create, since a bucket can't infer a location.
