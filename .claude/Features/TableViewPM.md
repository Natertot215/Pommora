## TableView

One of the built renderers behind the modeled view types (`ViewsPM.md`) — a Collection's or Set's Pages drawn as rows on a single CSS grid. It's presentation only: the pipeline hands it resolved groups and per-cell values, and TableView owns the layout, the column ergonomics, and the row and group chrome. The table's tunable dimensions are gathered in `table-tokens.css`, aliased to a design-system token wherever one exists.

### The Shared Grid

The header band and every data row are separate CSS grids that read **one shared track set**, set inline, so columns align across all bands without a `<colgroup>`. Each track is a resolved column width, and a trailing `1fr` **filler** absorbs any pane width past the summed columns so the grid always spans full-width; the filler is also the `:last-child` anchor that keeps the last real column's divider. Group sections are full-width bands *off* the column grid, so a disclosure row is independent of the columns and its members can wrap without breaking alignment.

**Every column — the title included — holds its resolved width** (the Apple table model). No column is ever compressed to absorb growth or a narrowing pane.

### Overflow & Scroll

While the columns' total width fits the pane, the table stays **capped** at the content inset and the filler eats the slack. The moment any mechanism pushes the sum past the pane — a resize, an added column, a narrowed window — the grid's `min-width` exceeds the pane and the **whole view h-scrolls**: heading and rows slide together, content passes under the edges, the left gutter stays the solid boundary. While overflowing, the right inset **flattens** to the glass edge, driven by one table-level ResizeObserver. The **inspector simply compresses the pane**; a table tighter than the compressed box h-scrolls within it like any other overflow.

### Full-Bleed Heading

The heading band's fill and bottom seam **bleed to both glass edges** while its column tracks stay locked to the body grid. Negative side margins widen the band's border box out to the glass; matching left **and** right padding then re-lands its tracks on the *exact* content width of a data row — an un-padded, wider header would resolve its tracks against a different box than the rows and drift every column. The band stays inside the grid, so it h-scrolls with the body.

### The Views Gutter

A strip carved from the content inset, left of the grid, where the row **drag grips** and group **disclosure chevrons** float — the same lane, and the same width knob, as MarkdownPM's fold gutter, so a table and a Page body read consistently. Inside the table the general gutter var is remapped to this narrower grip lane (see Non-Obvious). Group **disclosure headers are sticky-left** so the group label and its chevron hold the gutter and stay legible while the property columns scroll horizontally.

#### II. Groupings

Structural and property groups render as full-width disclosure bands. A header's chevron and folder glyph read as one cluster in the gutter, so the header itself is indented by nesting alone and the chevron lands in the grip lane. A headered group's members nest **one indent step inside** the header; a Set-within-a-Set steps in again, recursively. Under **sub-grouping**, each top-level set stays a band, its sub-sets flatten, and the descendant pages re-bucket by the property inside it — the bucket bands collapse per-set through composite set-and-bucket keys, and their headers sit at data-row rhythm, not section height. Select and Status bucket headings wear their chips; date buckets wear the property icon over a label following the column's applied date format.

Ungrouped and loose rows sit at the loose-inset, tucked a touch left of the column inset so they land near the Title column, and property grouping's **no-value rows get the identical treatment: no "None" band**, a header-less flattened tail (→ `ViewsPM.md`). Collapse rides a Reveal on the shared disclosure motion, and collapsed rows leave the DOM. Band seams follow the shared seam law (the band chrome's, cards alike): a section lead is twice the head-to-row clearance, state-free, so nothing above a band moves on toggle; a collapsed heading sheds only the clearance under it, folding in step with its rows, and a band that opens a disclosure leads by a single shoulder — the head's clearance supplies the other, so the seam still reads two and clearances never stack. The hover "+" renders on structural set headers only — a property bucket has no inferable create location. It's the affordance alone; the creation surface behind it is a Prospect.

**Band drag** — a group header drags by its **glyph**; the chevron and the hover "+" isolate on pointerdown, so they can never arm it. It rides the same insertion-line gesture as row drag, over a frozen snapshot of geometry AND the band list, which a mid-drag tree swap dirties together.

Under the default **Custom** order, vertical band order is **view-owned**: a structural drop merges into the view-level `group_order`, merged over the FULL tree so collapsed siblings survive the write; a property drop writes `group.order` and flips its order mode to manual; a sub-group bucket drop writes the GLOBAL bucket order, so a cross-set bucket drag is still that same global reorder, never a move. Under **Order = Location** a same-parent structural reorder instead writes the real filesystem, with `group_order` preserved-but-ignored for the flip back; otherwise the sidebar's order never mirrors in. A **cross-tree drop** — a Set band's nest highlight, or a between-slot whose implied parent differs from the dragged band's — touches the filesystem in EVERY mode: the move carries the destination's *current* children with the moved id appended, while the visual slot persists only in the view order. A row dropped into a different SET's bucket under sub-grouping writes both dimensions: the property first, at the current path, then a real page move into that set.

Band headers carry the SIDEBAR'S interaction model: a single click on the glyph toggles the disclosure, a double-click OPENS an openable Set — sub-Sets stay expand-only — and a right-click pops the native set context menu, whose Rename swaps the band title to the shared inline input. The ungrouped tail never drags and is never a target; Esc aborts the drag, like every drag surface. → `History.md`.

### Columns

Widths are per-type `{min, default, max}` from one source keyed by the column's declared type, clamped on every resolve so a stale saved value can't squash a column below legibility or stretch it past its ceiling. **The per-type ceiling is deliberate** — a control-shaped column past a certain width only wastes pane. The Title, and an unrecognized type, are the two that resize without one. The **min is per-style** where a look needs the room, resolved from the look; an unstyled column reads its default look's min. When a style change grows the min, the track **slides** to it rather than snapping, fired by one render-phase look-change detection so it covers both the column menu and the property pane. Ergonomics:

- **Resize** — a right-edge hit-strip, the live track width being the only feedback. The pointer delta is divided by the live density factor so a screen drag maps onto the pre-zoom track.

- **Reorder** — grabbing a header smooth-shifts the whole column as one opaque band carrying the selected highlight; neighbours slide to open the gap on the shift curve. Edge-based slot detection with a hysteresis zone, correct for wildly-varying widths.

- **Hide** — animates the track set shut on the disclosure token, then drops the column.

- **Alignment · Style · Icon · menu** — right-click a header for the OS-native column menu. Style is per-type — the looks a type can wear, plus the date and time format rows, whose labels are format-type *names* and never rendered samples; one source knows which types are style-addressable at all. The choice persists per-view in the SavedView's `column_styles`. Number's *format* is property-wide, set in the Number editor pane, not here; only its look is per-view. Select and multi carry no Style: their chips wear the squared label shape, the pill being Status's alone. **Icon** toggles the per-view **Column Icons**, which default **off** — enabling it renders each header's property type glyph. The toggle is view-wide, not per-column. The title is the primary column — not hideable, not alignable, not styleable, and pops an empty menu.

### Rows & Cells

A data cell's content is type-aware — a page icon, title text, chips, or a link — and its **look and formats read the per-view column style**: a status renders as a labeled pill, an icon-only capsule, or the checkbox square with the same group glyph; a checkbox as the square or the real Switch; files as one chip per attachment; dates through the date formatters; numbers through their property-wide format, or, in the **Bar** look, a progress bar filling its accent over a muted track. Column dividers differ by band: the heading draws short, centered, fully-rounded **segment bars** between columns, while data rows draw full-height **hairlines**. The row divider is a top border on the row, spanning the filler too, and the first row of each group drops it, so a line only ever falls *between* two rows. Row height is driven by the vertical cell padding. Hover and selection are Finder-style fills. **Row drag** is the drop-line DnD (`PommoraDND.md`): a hover-revealed grip in the gutter lifts the row, which mutes in place while an accent line and dot mark the slot — nothing displaces.

**Every cell owns its click** — the ratified gesture matrix, portable to every other renderer. The title cell is the *only* navigate; status, select, and multi open the shared value dropdown, where multi toggles and stays open; a checkbox-look status cell instead cycles its group, writing each group's first-in-order option and skipping empty groups; a checkbox toggles; a Number-look number enters the inline editor, while a Bar-look one opens the text-value dropdown with a right-pinned out-of hint; a link opens externally through the sanctioned link IPC, since raw anchor navigation is denied by main's hardening; each file chip opens its own file through the root-validated file IPC.

**Right-click always opens a menu, never acts**: the title gets the shared page-meta block; style-bearing types get their *column's* Style radios, with file adding Edit; a link carries no Style at all, since its look is per-property — Edit alone when empty, Edit · Rename · Clear once filled; picker-based cells add Clear.

**Chip-look values carry a hover ×**, the shared chip-level remove: hovering the chip's RIGHT THIRD — the ×'s own zone, so a left or middle hover does nothing — reveals an × at the right edge in the chip's text color while the label's tail *blurs into the fill* beneath it, a true progressive text blur touching only the text and never the fill. Clicking removes THAT chip's value — one option off a multi, one Space off a context value, the whole value off a single — without opening the picker or arming the row drag. Removable-chip labels are pointer-inert, load-bearing against a Chromium repaint bug (Build-Gotchas § Chip Melt); non-removable chips keep the label hover-scroll. Capsule and checkbox looks carry no ×; their Clear lives in the menu. Both × and Clear obey the no-empties rule (→ `PropertiesPM.md`): the cleared property's key leaves the frontmatter entirely.

Inline edits follow Enter = confirm · click-out = save · Esc = revert; the number input filters invalid keystrokes at the source, and an empty commit clears the value. The row background is a no-op, and every cell still arms the row drag past the activation threshold, so cell gestures own only the sub-threshold press-release. The editing surfaces live view-agnostic in `PropertyEditing/`, shared with every other renderer that edits a value.

### Density

A single density token scales text, chips, padding, and widths together, compounding with a SurfacePM tile's own Scale so an embedded table scales as one unit. The grid resolves percentage widths zoom-aware, so a full-width grid still fills the pane at any density.

### Non-Obvious

- **The gutter var is shadowed inside the table.** The global content-to-glass gutter is remapped to the narrower fold-gutter grip lane within the table scope, so the grips and chevrons sit in the strip. Full-bleed surfaces therefore can't read the shadowed var for the true content-to-glass distance — they read a dedicated un-shadowed alias. Mixing the two is the classic source of heading misalignment.

- **The heading's both-sides padding and the grid's summed `min-width` are one mechanism.** The padding re-lands the heading's tracks on the rows' content width; the `min-width` is what makes overflow scroll instead of clip — change either and re-check the other against a heading-vs-row column drift.

- **The column-reorder density factor is read, not back-solved.** The drag reads the grid's *resolved* zoom, so a scaled embed's drag still maps 1:1. A back-solve off the header and track widths instead bakes in whatever layout slack the grid has.

- **A sticky group header pins at the gutter edge, losing its nesting indent while pinned.** A deeply-nested group's chevron clamps to the same x as a top-level one once scrolled far enough — a legibility-preserving pin that reverts on scroll-back, never clipping content.

- **The lead cell's indent is a left-read treatment, gated to left-aligned first columns.** The Title's loose-inset and group-nesting padding ride the first column; on a *center*-aligned first column it would shrink the cell and clip the control off-centre, so it's skipped there and the control centres in the full cell instead.

### Prospects

- **The group-header "+":** the creation surface behind the affordance is the open piece. A property bucket can't infer a create location, so a bucket-header "+" would have to create in a chosen location with the bucket's value pre-filled.

- **Compact density:** a view's Standard / Compact format persists per-view and its toggle ships in the view editor, but the table's density token doesn't read it — the table draws at Standard either way.

### Known Issues

- **Row grips scroll with their row on horizontal scroll.** The disclosure headers + chevrons stay pinned, but the hover-only drag grips ride their row's cell off to the left. Freezing them cleanly means freezing the whole title column (a frozen first column), which is an open decision.
