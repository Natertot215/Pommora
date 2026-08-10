## TableView

```
TableView
├── The Shared Grid
├── Overflow & Scroll
├── Full-Bleed Heading
├── The Views Gutter
├── Groupings
├── Columns
├── Rows & Cells
├── Density
├── The Table Sheet
├── Known Issues
└── Prospects
```

One of the built renderers behind the modeled view types (→ [[ViewsPM]]) — a Collection's or Set's Pages drawn as rows on a single CSS grid. It's presentation only: the pipeline hands it resolved groups and per-cell values, and TableView owns the layout, the column ergonomics, and the row and group chrome.

### The Shared Grid

The header band and every data row are separate CSS grids that read one shared track set, set inline, so columns align across all bands without a `<colgroup>`. Each track is a resolved column width, and a trailing `1fr` filler absorbs any pane width past the summed columns so the grid always spans full-width; the filler is also the `:last-child` anchor that keeps the last real column's divider. Group sections are full-width bands off the column grid, so a disclosure row is independent of the columns and its members can wrap without breaking alignment.

**Every column — the title included — holds its resolved width** (the Apple table model). No column is compressed to absorb growth or a narrowing pane.

### Overflow & Scroll

While the columns' total width fits the pane, the table stays capped at the content inset and the filler eats the slack. The moment any mechanism pushes the sum past the pane — a resize, an added column, a narrowed window — the whole view h-scrolls: heading and rows slide together, content passes under the edges, and the left gutter stays the solid boundary. While overflowing, the right inset flattens to the glass edge, driven by one table-level ResizeObserver. The inspector simply compresses the pane; a table tighter than the compressed box h-scrolls within it like any other overflow.

### Full-Bleed Heading

The heading band's fill and bottom seam bleed to both glass edges while its column tracks stay locked to the body grid — negative side margins widen the band's border box out to the glass, and matching left and right padding re-lands its tracks on the exact content width of a data row. The band stays inside the grid, so it h-scrolls with the body.

### The Views Gutter

A strip carved from the content inset, left of the grid, where the row drag grips and group disclosure chevrons float — the same lane, and the same width knob, as MarkdownPM's fold gutter, so a table and a Page body read consistently. Group disclosure headers are sticky-left, holding the group label and its chevron in the gutter while the property columns scroll horizontally; a deeply-nested header pins at the gutter edge once scrolled far enough, giving up its nesting indent while pinned and reverting on scroll-back.

### Groupings

Structural and property groups render as full-width disclosure bands. A header's chevron and folder glyph read as one cluster in the gutter, so the header itself is indented by nesting alone and the chevron lands in the grip lane. A headered group's members nest one indent step inside the header; a Set-within-a-Set steps in again, recursively. Under sub-grouping, each top-level set stays a band, its sub-sets flatten, and the descendant pages re-bucket by the property inside it — the bucket bands collapse per-set through composite set-and-bucket keys, and their headers sit at data-row rhythm rather than section height. Select and Status bucket headings wear their chips; date buckets wear the property icon over a label following the column's applied date format.

Ungrouped and loose rows sit at the loose-inset, tucked a touch left of the column inset so they land near the Title column; no-value rows under property grouping get the identical treatment — a header-less flattened tail rather than a "None" band (→ [[ViewsPM]]). Collapse rides a Reveal on the shared disclosure motion, and collapsed rows leave the DOM. Band seams follow the shared seam law, cards alike: a section lead is twice the head-to-row clearance, state-free, so nothing above a band moves on toggle; a collapsed heading sheds only the clearance under it, and a band that opens a disclosure leads by a single shoulder — the head's clearance supplies the other. The hover "+" renders on structural set headers only, the affordance alone.

**Band drag** — a group header drags by its glyph; the chevron and the hover "+" isolate on pointerdown and never arm it. It rides the same insertion-line gesture as row drag, over a frozen snapshot of both the geometry and the band list, which a mid-drag tree swap dirties together.

Under the default **Custom** order, vertical band order is view-owned: a structural drop merges into the view-level `group_order` over the full tree so collapsed siblings survive the write; a property drop writes `group.order` and flips its order mode to manual; a sub-group bucket drop writes the global bucket order, so a cross-set bucket drag is that same global reorder rather than a move. Under **Order = Location** a same-parent structural reorder instead writes the real filesystem, with `group_order` preserved-but-ignored for the flip back. A cross-tree drop — a Set band's nest highlight, or a between-slot whose implied parent differs from the dragged band's — touches the filesystem in every mode: the move carries the destination's current children with the moved id appended, while the visual slot persists only in the view order. A row dropped into a different Set's bucket under sub-grouping writes both dimensions — the property first, at the current path, then a real page move into that set.

Band headers carry the sidebar's interaction model: a single click on the glyph toggles the disclosure, a double-click opens an openable Set (sub-Sets stay expand-only), and a right-click pops the native set context menu, whose Rename swaps the band title to the shared inline input. The ungrouped tail never drags and is never a target; Esc aborts the drag.

### Columns

Widths are per-type `{min, default, max}` from one source keyed by the column's declared type, clamped on every resolve so a stale saved value can't squash a column below legibility or stretch it past its ceiling — a control-shaped column past a certain width only wastes pane. The Title, and an unrecognized type, are the two that resize without one. The min is per-style where a look needs the room; an unstyled column reads its default look's min. When a style change grows the min, the track slides to it rather than snapping, fired by one render-phase look-change detection covering both the column menu and the property pane.

- **Resize** — a right-edge hit-strip, the live track width the only feedback. The pointer delta is divided by the live density factor so a screen drag maps onto the pre-zoom track.
- **Reorder** — grabbing a header smooth-shifts the whole column as one opaque band carrying the selected highlight; neighbors slide to open the gap on the shift curve. Edge-based slot detection with a hysteresis zone holds up under wildly-varying widths.
- **Hide** — animates the track set shut on the disclosure token, then drops the column.
- **Alignment · Style · Icon · menu** — right-click a header for the OS-native column menu. Style is per-type — the looks a type can wear, plus the date and time format rows, whose labels are format-type names rather than rendered samples. The choice persists per-view in the SavedView's `column_styles`. Number's format is property-wide, set in the Number editor pane; only its look is per-view. Select and multi carry no Style — their chips wear the squared label shape, the pill being Status's alone. **Icon** toggles the per-view **Column Icons**, default off, rendering each header's property type glyph view-wide. The title is the primary column — not hideable, not alignable, not styleable — and pops an empty menu.

### Rows & Cells

A data cell's content is type-aware — a page icon, title text, chips, or a link — and its look and formats read the per-view column style: a status renders as a labeled pill, an icon-only capsule, or the checkbox square with the same group glyph; a checkbox as the square or the real Switch; files as one chip per attachment; dates through the date formatters; numbers through their property-wide format or, in the Bar look, a progress bar filling its accent over a muted track. Column dividers differ by band — the heading draws short, centered, fully-rounded segment bars between columns, while data rows draw full-height hairlines. The row divider is a top border spanning the filler too, and the first row of each group drops it, so a line only falls between two rows. Row height is driven by the vertical cell padding. Hover and selection are Finder-style fills. **Row drag** is the drop-line DnD (→ [[PommoraDND]]): a hover-revealed grip in the gutter lifts the row, which mutes in place while an accent line and dot mark the slot.

**Every cell owns its click** — the shared gesture matrix, portable to every other renderer. The title cell is the only navigate; status, select, and multi open the shared value dropdown, where multi toggles and stays open; a checkbox-look status cell cycles its group, writing each group's first-in-order option and skipping empty groups; a checkbox toggles; a Number-look number enters the inline editor, while a Bar-look one opens the text-value dropdown with a right-pinned out-of hint; a link opens externally through the sanctioned link IPC; each file chip opens its own file through the root-validated file IPC.

**Right-click always opens a menu.** The title gets the shared page-meta block; style-bearing types get their column's Style radios, with file adding Edit; a link carries no Style, since its look is per-property — Edit alone when empty, Edit · Rename · Clear once filled; picker-based cells add Clear.

**Chip-look values carry a hover ×**, the shared chip-level remove: hovering the chip's right third reveals an × at the right edge in the chip's text color while the label's tail blurs into the fill beneath it — a progressive text blur touching only the text. Clicking removes that chip's value — one option off a multi, one Space off a context value, the whole value off a single — without opening the picker or arming the row drag. Removable-chip labels are pointer-inert, guarding a Chromium repaint bug ([[Build-Gotchas]]); non-removable chips keep the label hover-scroll. Capsule and checkbox looks carry no ×; their Clear lives in the menu. Both × and Clear obey the no-empties rule (→ [[PropertiesPM]]) — the cleared property's key leaves the frontmatter entirely.

Inline edits follow Enter = confirm · click-out = save · Esc = revert; the number input filters invalid keystrokes at the source, and an empty commit clears the value. The row background is a no-op, and every cell still arms the row drag past the activation threshold, so cell gestures own the sub-threshold press-release. The editing surfaces live view-agnostic in `PropertyEditing/`, shared with every renderer that edits a value.

### Density

A single density token scales text, chips, padding, and widths together, compounding with a SurfacePM tile's own Scale so an embedded table scales as one unit. The grid resolves percentage widths zoom-aware, so a full-width grid still fills the pane at any density.

### The Table Sheet

The table's design vocabulary is a whole-file token sheet scoped to `.table-view, .table-empty`; a value set outside that scope does nothing. Atlas convention per [[DesignSystemPM]].

**SOURCE:** `Pommora/src/renderer/src/Detail/Views/Table/table-tokens.css` · `Pommora/src/renderer/src/Detail/Views/Table/Table.css`

| Title | Token | Value |
| --- | --- | --- |
| Density | `--zoom` | `1` (the Compact knob's target) |
| Cell Padding | `--cell-padding-x` / `--cell-padding-y` | `12px` / `6px` |
| Cell Icon Gap / Chip Run Gap | `--cell-icon-gap` / `--chips-gap` | `6px` / `4px` |
| Nesting Indent | `--row-indent` | → `var(--disclosure-indent)` |
| Loose-Row Inset | `--loose-inset` | `8px` |
| Grip Gutter | `--gutter` | → `var(--fold-gutter)` (remapped mid-tree — table descendants wanting the content gutter read `--content-gutter`) |
| Hairline | `--table-border-width` / `--table-border` | `1.25px` / composed on `--separator-border` |
| Active Cell Radius | `--cell-active-radius` | `4px` |
| Heading | `--heading-fill` / `--heading-text` / `--heading-divider` | → fill-quinary / label-control / border-heading |
| Heading Segment | `--heading-segment` / `-height` / `-width` | → label-tertiary / `16px` / `1.5px` |
| Heading Padding | `--heading-padding-y` | `8px` |
| Band Clearance | `--band-clearance` | → `var(--cell-padding-y)` (the seam law's input) |
| Resizer Strip | `--resizer-width` | `8px` |
| Column Drag | `--col-highlight` / `--col-drag-band` / `--col-shift-ease` | → state-selected / bg-window / fast+standard |
| Empty Pad | `--empty-pad-y` | `24px` |
| Right Inset | `--table-right-inset` | → content gutter; `0px` once overflowing (declared in `Table.css`) |

### Known Issues

- **Row grips scroll with their row on horizontal scroll.** The disclosure headers and chevrons stay pinned, but the hover-only drag grips ride their row's cell off to the left. Freezing them cleanly means freezing the whole title column, which is an open decision.
### Prospects

- **The group-header "+"** — the creation surface behind the affordance is the open piece. A property bucket can't infer a create location, so a bucket-header "+" would have to create in a chosen location with the bucket's value pre-filled.
