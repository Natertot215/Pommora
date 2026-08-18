## Views

```
Views
├── The Saved-View Model
├── The Pipeline
│   ├── II. Filter
│   ├── II. Group
│   ├── II. Sort
│   └── II. Columns
├── Surfaces
│   ├── II. The ViewPane
│   ├── II. ViewSettings
│   ├── II. The SettingsPane
│   ├── II. The Grouping Pane
│   ├── II. The Sorting Pane
│   ├── II. The Filtering Pane
│   └── II. The Visibility Pane
├── Pending
└── Prospects
```

A view is a saved presentation of a [[CollectionsPM|Collection's]] (or a depth-1 Set's) [[PagesPM|Pages]]. It never modifies its source — filtering, grouping, and sorting are presentation only. A container carries an ordered list of saved views, and one pure pipeline drives every renderer. Six view types are modeled — **Table**, **Cards**, **List**, **Gallery**, **Calendar**, and **Timeline** — in an extensible registry.

### The Saved-View Model

Each container's sidecar holds an ordered `views[]`. A saved view records its `id` (a ULID), `name`, `icon`, an optional `color` (an open chip-palette key validated through the chip map at render, worn as the view's segment stroke at a tint — absent = the neutral hairline), and its renderer `type`. Its column layout carries `property_order`, `hidden_properties`, per-column widths, alignments, and `column_styles` — the per-type look plus the date, weekday, and time format choices, which live per-view here rather than on the definition. Its query config carries the `sort` (a multi-key list), the `filter` (a nested group), the `group` config with the view-level band-order keys, and the display options — card scale, collapsed-band state, and the cards toggles.

The **active view is tracked per-machine** in `nexus.db`, kept out of the synced sidecar. The per-container **ViewDropdown** (a toolbar button left of the trio, its glyph the active view's icon) opens the **ViewPane** to switch it; view CRUD — create (title-only "Untitled"), rename, duplicate, delete, reorder — persists to the sidecar. Two per-container presentation settings ride the sidecar and sync: `view_button` (the button's Show/Hide Title) and `view_style` (Dropdown / Toolbar). A container never presents an empty `views[]` — an app-created container is seeded with its default view on disk, and an empty view-bearing container mints its default on first entry.

### The Pipeline

One pure pipeline feeds the renderer — **columns → filter → group → sort** — reading each Page's frontmatter, loaded lazily per container over a batch IPC.

In-view creation is likewise one engine worn per-renderer: a shared creation act (the page exists on disk as Untitled the moment a gesture fires, born with what its context implies, its order settled in the same act) and a shared hover-ghost mechanism (dwell, grace, suppression, travel-hold) that each surface dresses in its own chrome.
#### II. Filter

A recursive group of rules under a match mode, evaluated at every depth: All (AND) and Any (OR). Negation lives on the per-rule operators — Isn't, Isn't Empty, Doesn't Contain and their kin — so "none of these" is spelled as an All of negated rules. A filter the schema cannot read drops alone on read and the view survives unfiltered. Whether the filter runs at all is a separate axis, `filter_enabled`, so parking a filter costs it neither its rules nor its mode.

The operator matrices are type-aware: text (Is / Isn't / Starts With / Contains / Doesn't Contain — Title filters as text), number (Is / Isn't / Greater Than / At Least / Less Than / At Most), date (Is at calendar-day granularity, plus the inclusive Before / After), checkbox (Is with an implied true/false operand), single-valued options (Is / Isn't reading `values[]` as any-of / none-of), array-valued membership (Is Any / Is All / Isn't over `values[]` — multi-select and context values alike), file presence, and **Location** (Is / Isn't for the immediate parent Set, Contains / Doesn't Contain for any-depth membership via a descendant set precomputed once per operand). A rule carries `value` (single operand) or `values` (chip set).

A rule that cannot be applied — an unknown op, a dead property or set, an operand not yet supplied — abstains rather than voting, and so does a group whose rules all abstain; a filter that abstains in whole filters nothing. A row holding no value matches no positive comparison — an unauthored operand abstains, but an absent value is an answer. The negatives keep the opposite reading: Isn't and Doesn't Contain hold a blank row.

#### II. Group

Structural (by Set / Sub-Set disclosure), flat, or by a property. Groupable types are Select, Status, Checkbox, and Date; a date groups by day, week, month, or year. Option order follows the schema until a band drag snapshots a manual one, which the view owns. A non-groupable or deleted property falls back to structural, and consumers follow that effective mode rather than the raw config kind.

Structural grouping carries two view-level companions — `structural_order_mode`, whose `location` value mirrors the filesystem order while preserving `group_order` for the flip back, and `sub_group`, a property bucketing inside each top-level set band. Both live beside `group_order` and survive a Group By switch.

An option with no rows renders as an empty band, and **Hide Empty Groups** drops those — a view-level knob covering every grouping kind, empty Sets included. Value-less rows render as a header-less tail rather than a "None" band, placed by `ungrouped_placement`; the tail holds rows, so Hide Empty Groups never touches it. A filter that excludes something prunes the structural bands it emptied, sub-folders included, bottom-up — an empty Set still renders while nothing is being filtered.

Any group can be hidden outright via `hidden_groups` — a view-level key list sharing the collapse vocabulary (option values, set ids, date bucket keys, and a prefixed form for sub-group buckets). Hiding resolves in the pipeline, so a hidden band, its rows, and its chrome never exist for any renderer: a hidden Set leaves the tree before resolution with its whole subtree, a hidden sub-group bucket hides globally by value under every parent set, and a stale key under a different grouping hides nothing. The Grouping pane is the authoring surface, and every hidden group stays reachable there.

#### II. Sort

A multi-key list applied in priority order, stable on ties, with per-type comparators — Select and Status by option order (or a criterion's own Custom order, unknown values last), dates chronological, checkbox by rank, text case-insensitive. The Sorting pane authors the first two slots (primary + sub-sort; Custom order is pane-authorable on the primary only, though the sorter honors a hand-authored `order` on any criterion) and owns the `sort` slot wholesale — a deeper hand-authored array is honored by the pipeline until the pane's first write replaces the slot. Two effective criteria retire row drag-reorder, since manual order is meaningless under a multi-key sort; a criterion whose property was deleted sorts by nothing and doesn't count toward that gate.

#### II. Columns

An allowlist, never an auto-append: a schema property or a Context column renders only when the view's `property_order` lists it and `hidden_properties` doesn't, so a property or Context created after a view stays off until the user reveals it. Context columns are default-off by that same rule. Title is always guaranteed.

### Surfaces

#### II. The ViewPane

A navigation dropdown opened by the ViewDropdown — a row per saved view (click switches the active view and leaves the pane open; the row's chevron opens that view's ViewSettings; right-click opens its Rename · Edit Icon · Edit Color · Delete menu, where a view's glyph and its color are picked — the same menu the view embed's own switcher pops, which adds only the titles toggle belonging to that tile's chrome) over a footer carrying New View. Right-clicking the ViewDropdown itself opens a native menu for its two presentation settings (Show/Hide Title · Style).

#### II. ViewSettings

The shared per-view editor, reachable two ways — the ViewPane row's chevron (the full door, carrying the ⋮ Duplicate/Delete and the leaf rows) or the SettingsPane's Layout entry (the flat door, for the active view, minus the ⋮ and leafs). It holds the view's click-to-rename name, a 3×2 type-picker grid (the four unbuilt types render at full weight but don't switch), and the type's options — four leaf rows, Layout · Group · Filter · Sort. For [[TableViewPM|Tables]], the Layout leaf is the visibility list over the table's layout switches. For [[CardViewPM|Cards]] it carries the cards options (Card Banner · Hide Location · Wrap Titles · Hide Icons · Set Cards) with Style + Scale pinned in the footing.

#### II. The SettingsPane

The toolbar sliders button, carrying the container's identity and config: **Configuration** (the collection's Open In — full-page vs page-preview, Collection-owned), **Properties**Visibility**, and the Layout / Group / Filter / Sort leafs.

#### II. The Grouping Pane

The Group leaf, both doors, shared by Table and Cards — a cards view drops the Sub-Group tier and gains a **None** row on Group By, the flat kind cards render as one headerless band. It authors the group config: **Group By** as an in-pane vertical disclosure (Location + the schema's Select/Status/Date properties), a **Date By** granularity row for date grouping, per-kind **Order** pickers (Location: Custom / Location — Location makes drags on the pane hierarchy and the table bands write the real filesystem; Select/Status: Default / Reversed / Custom; Date: Ascending / Descending), and a **Sub-Group** picker with its own Order.

The middle region shows the set hierarchy (each set disclosing its sub-group — sub-sets, or the property's chip run, draggable for the global sub-order — behind the sidebar's disclosure motion and the shared list-outline rail), the read-only option preview under Default/Reversed, the flat draggable "Options" list under Custom, or — under date grouping — the buckets the container's values actually produce, labeled through the band's own date formatting. Every group row carries the hide eye (the Visibility pane's toggle, hoisted): option chips, sub-chips, and date buckets wear it always at the rest ghost, folder rows reveal it on hover, and a hidden row pins its eye and ghosts. Footings: **Hide Empty Groups** (a Switch, every grouping kind), **Ungrouped** Top/Bottom, and **Separation** Dash/Slash (numeric date formats) — footing-styled rows on the same PickerControl the Order rows use.

#### II. The Sorting Pane

The Sort leaf, both doors, on the Grouping pane's chassis: **Sort By** as the in-pane vertical disclosure (None + Title + Modified + the schema's sortable properties — only types the sorter genuinely ranks, so Context and File are absent), a per-type **Order** picker (Select/Status: Default / Reversed / Custom — Custom snapshots the current sequence onto the criterion and turns the middle into the draggable Options list; dates, numbers, checkbox: Ascending / Descending; text: A → Z / Z → A), a **Sub-Sort** picker with its own Order, and the read-only example order — the primary property's chips in effective order, shown for finite-ordered types.

On a cards view the Sort By list adds a **Location** entry — a reserved sort, ordered at the resolve level — whose Order picker is Location / Custom. It keeps its own `location_order_mode`, independent of the Grouping pane's structural Order, so a cards view can group structurally and sort by Location without either control retargeting the other. Paired with Group By: None it renders one headerless, filesystem-ordered list.

#### II. The Filtering Pane

The Filter leaf, both doors, authoring the filter as a flat row list — `(connector)(what)(operator)(value)(×)` — serialized to the nested group by the pane's codec. Connectors carry the structure: a run of Ands is one group, an Or starts the next, so `A and B or C` reads as written. Every cell sizes to its own row's content with no cross-row column geometry — the operator hugs tightest and never takes spare width, the value absorbs it, and an operator that takes no operand paints no value field at all, holding only the row's width so the × stays at the trailing edge. An unauthored filter opens on one blank lead row (placeholder `Where`). Every row clears, the last one included — clearing it empties the rules and the pane re-renders its blank lead row. Authoring a rule never flips the on/off axis.

What and Operator hold their content whole, so only the value cell absorbs a squeeze — a clipped value scrolls under the pointer on the same box the chips and menu rows use. The footing carries two independent axes: the match mode (**All / Any**, a label-less in-place toggle) and whether the filter runs at all. A shape the pane can't represent renders locked behind an explicit Reset, never silently flattened.

**Location** is the one target with a tree — its picker is the Grouping pane's set list, a row per Set wearing that Set's own icon, children disclosed on the shared rail behind a twisty, at a fixed width and height cap so disclosing a Set scrolls rather than moving rows out from under the cursor. Picked Sets read as titles divided by the house segment hairline rather than as chips, since a Set carries no color of its own; each carries a hover-revealed remove, and the trailing one takes the field's slack.

#### II. The Visibility Pane

The active view's shown/hidden split, shared by the SettingsPane's Visibility entry and the table's Layout leaf. It renders as one flat list with no heading — the shown rows in the view's column order (Title, context columns, and properties together), then the hidden rows ghosted after them in collection order (Modified trailing), the ghost itself the boundary. Title rides the list as a draggable anchor but never hides (its eye is inert); it's listed so a column can be dragged before it.

Drags carry the shared drag language. A drop into the shown zone is positional — a shown row reorders and a hidden row unhides at the slot, both under the drop line — and rewrites the view's `property_order`, the shown zone acting as a window into the full column order. A shown row dropped into the hidden zone is a membership drop — it hides, shown as the area highlight with no line, since the hidden order is derived rather than authored. Every row carries a trailing eye toggle: open at rest on shown rows, slashed on hidden ones, hover swapping both the glyph and the color to preview the flip. Hiding only flags `hidden_properties` — `property_order` keeps the slot, so an eye-unhide restores the property where it was; only a drag-in chooses a new position.

### Pending

- **List, Gallery, Calendar, and Timeline renderers** — modeled in the type registry and present as picker tiles, with no renderer behind them; a view of any other type falls through to the table.
- **Table Flatten + Location Subtitle** — the table's no-grouping mode: bands flatten away and a page's location renders as a subtitle in its title cell, governed by its own Flatten and Hide Location toggles. Cards already carry both halves.
- **The property-bucket "+"** — the renderers' structural bands create; property and ungrouped bands offer no affordance, since a bucket can't infer a create location. One waits on a location ruling.
- **Grouping for the other view types** — calendar, gallery, timeline, and list group mechanically differently; each gets its own surface with its renderer.
- **ViewBar** — the `view_style` Toolbar option, an inline view-switcher bar as an alternative to the dropdown. The setting persists; Toolbar mode reuses the dropdown button until the surface builds. View embeds mirror the same duality in their header switcher (→ [[SurfacePM]]).

### Prospects

- [ ] In-line View Embeddings
