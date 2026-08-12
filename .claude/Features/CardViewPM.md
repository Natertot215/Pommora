## CardView
```
CardView
├── Card Anatomy & Sizing
├── Card Image
├── Layouts
├── Properties on Cards
├── Grouping, Location & Sorting
├── Set Cards
├── Card Drag & Menus
├── Creating in the Grid
├── Surfaces & Insets
├── Card Tokens
├── Pending
└── Prospects
```

The Cards renderer draws a [[CollectionsPM|Collection's]] (or a depth-1 Set's) Pages as a resizable card grid, over the same pure pipeline that feeds the [[TableViewPM|Table]] — columns → filter → group → sort. A Collection or Set switches to it from the ViewSettings type grid, and it draws the same inside a [[SurfacePM|view embed]], at the embed's zoom.

### Card Anatomy & Sizing

A page card is an image band over a text area — title, then properties, then an optional location footing. The image band is a fixed height scaled by the card factor; the text extends below, and every card in a grid row matches its tallest sibling. The grid is an auto-fill track set off a column-width floor, so a partly-filled band keeps the same card size as a full one. The card chassis — grid mechanics, borders, and the shared hover-pop lift — shares the [[NavigationPM|Navigation]] gallery card's values; the inner title and property area is the cards renderer's own. The location breadcrumb is always seated as a footing, pinned to the card's bottom under a divider whether or not properties sit above it.

**Scale** is a slider in the ViewSettings footing, drafting live while dragging and writing the view on release; the scrub is scoped per view, leaving a sibling cards embed on the same surface unmoved. The factor persists as `card_size`, a bare number.

### Card Image

A per-view **Card Banner** control chooses the image source: **Cover** (the page's banner), **Preview** (the captured page thumbnail, on the nav gallery's pipeline and the shared thumbnail cache), or **None** (imageless, compact cards). A page lacking an image under Cover or Preview shows the placeholder, keeping heights uniform within a view. Right-clicking the image band pops the native banner menu — Add when the page has no cover, Change / Remove when it does — worded for the view's source and editing the page's one banner image through the PageHeader flow, so the card refreshes live on the write.

### Layouts

Card layout is the view's `format`:

- **Standard** — the title, then one labeled row per visible property: label left, value right.
- **Compact** — the title, then label-less values packed in property order.

Imageless cards reserve a bottom area of the title plus two property-value rows, reading as cards rather than flat rows; the location footing adds its own height below that reserve. Two switches shape them further: **Wrap Titles** — off keeps the title single-line on the shared overflow-scroll — and **Hide Icons**. A value never wraps in either layout; chips keep their hover-scroll mechanics, text-shaped values clamp.

### Properties on Cards

Cards show every visible property, rendered through the shared chip and cell renderers. Each value is interactive on the same per-kind gesture matrix the table cells use — a click opens the value's picker, a checkbox toggles. A right-click opens the value's native menu off the shared cell-menu model: the per-kind items plus a trailing **Remove** that drops the property from the view, its order slot remembered; an empty cell that would otherwise have no menu still gets the bare Remove. The whole card is a drag handle — a value's own click stops propagation before the card sees it, and a press beginning on a value takes a larger drag-activation threshold, so a tap-wobble opens the picker instead of lifting the card. Only the title and the image band open the page.

The portal pickers mount at one grid-level host rather than inside the cards, keeping an open picker alive through row churn — values resolve live off the current row, a dead anchor freezes in place, and a picker whose value leaves the layout mid-edit dismisses animated. Every picker Blooms in and out. A chip's remove-× is inert until its hover reveal; an un-hovered click falls through and opens the picker. At small embed zooms the multi-select × drops entirely.

Adding a value comes from the **two-stage add-picker**, whose list is everything not shown on the card: hidden properties and context columns, plus any revealed-but-blank property. A blank pane-bearing kind slides into its value pane, while the dependent dropdown kinds exit the add menu entirely and open their own picker at the same anchor, revealing the property on the first committed value — a dismissed, untouched picker reveals nothing. A checkbox, and any hidden-but-filled property, reveals on pick instead. Pane-bearing entries group to the top, reveal-only entries below, property order preserved within each group. The add-picker opens from empty space in a card's text area, from a card's location footing, or from the native card menu's **Add Property ▸** submenu.

### Grouping, Location & Sorting

Cards never indent: structural grouping renders a flat disclosure band per top-level Set, its whole subtree's pages gathered into that one band. A property group replaces the location bands with bucket bands. Ungrouped and root pages band under the container's own heading rather than a header-less tail. Band chrome is a persisted collapse plus a **"+"** on structural bands only, creating in that Set (→ §Creating in the Grid). No sub-grouping and no heading columns apply. Band seams follow the shared seam law, state-free: every band wears the band-to-card gap on both sides, sitting off its neighbors — and off the Set-cards row — by twice that gap, expanded or collapsed, in every layout alike; a collapsed heading sheds only its heading-to-cards clearance, folding on the disclosure beat in step with its cards.

**Flattening** is **Group By: None** — the `flat` grouping, rendered as one headerless list. **Sort By: Location** orders at the resolve level, with its Order picker offering Location (filesystem order, drag off) or Custom (the view's manual order, drag on) — the full semantics are the pipeline's (→ [[ViewsPM]] §II. The Sorting Pane). The flat, filesystem-ordered list is Group By: None over Sort By: Location, and it shows each card's full location footing.

Each card's **location footing** is a Set / sub-Set breadcrumb governed by a standing **Hide Location** switch, independent of grouping mode. Under structural grouping the band header already names the top-level Set, so the footing drops that leading crumb; a flat or property list shows the full chain.

### Set Cards

A **Set Cards** switch adds a leading row of larger cards, one per Set (or per depth-1 sub-Set in a Set view) — banner (placeholder when unset) + icon + title. Clicking a Set Card navigates to the Set; the row is reorderable by drag, writing the container's set order. A container with no Sets shows no row; an empty Set still gets its card.

### Card Drag & Menus

Cards reorder within their band by displacement (the nav gallery's drag), writing the per-machine manual order the pipeline reads as its lowest-priority sort tiebreaker. Two effective sort criteria retire that reorder, as does Sort By: Location on its computed Location order (→ [[ViewsPM]]). A card dropped **across location bands** moves the page into that band's Set carrying its landing slot — the destination's full-membership order writes with the drop spliced before the card it landed on, and the live orders splice in the same act so the landing paints immediately.

A card's **right-click** opens a native menu: the **Add Property ▸** submenu over the page-meta block — Open · **Move To ▸** the Collection/Set tree · Rename · Change Icon · **New Page** · Delete. New Page creates flow-after (a grid has no above); Rename opens the same inline naming field creation uses, in the title's own seat. Change Icon mounts the icon picker. A value's own right-click menu takes precedence over the card menu, and every card-level native menu stands the hover ghost down until it closes.

### Creating in the Grid

Creating a page never leaves the grid, on the table's own creation act (→ [[TableViewPM]]): the page is created immediately — Untitled on disk, stamped with what its birth context implies — and the card's title swaps for an inline naming field, empty with the glyph staying put, outside the title's scroll clip. Confirming names the page (a colliding name lands with the create rule's numeric suffix); leaving any other way keeps Untitled. The band "+" creates at its Set's end — the tiebreaker order settles with the newborn ranked last in its band — and the menu's New Page inherits its anchor's group value and seedable sort values, landing beside it.

**The ghost card** — dwelling on a card grows a ghost card at the next flow slot: an empty bordered slot at the group's card size (its border heavier than a card's own so it reads), the page-icon placeholder centered, the whole slot at the inactive dim. Neighbors make room on the cards' own move motion — the displacement measured before the ghost enters or leaves and released on the drag shift's feel — and clicking it creates flow-after, the real card taking the ghost's seat with the naming field open. Any pointer press outside the ghost stands it down before a drag can measure; naming sessions, open pickers, and native menus suppress it. The dwell is the ghost mechanism's shared value; the grace is Cards' own, long enough to cross the grid gap.

### Surfaces & Insets

Cards live in the ViewSettings type grid and carry their options in the Layout leaf, with Style and Scale pinned in the footing; the grouping and sorting leaves reuse the shared panes. A view switched to a type inherits the new type's default glyph only when it still wore the old default. Cards ride the block-surface inset regime: in a full-page pane a pane-body rule supplies the surface inset so the view itself never pads, while an embedded cards view runs the tight inter-tile lane directly on its grid. An embedded view also keeps its own tail seam — the last card row sits off the tile's bottom edge on the card rhythm, matching the view's top seam.

### Card Tokens

The card grid's design vocabulary. The geometry the two card families agreed on — the floor, gaps, thumb share, and cover zoom — lives once in `design-system/card-tokens.css`, shared with the NavWindow / NavView gallery; the Cards renderer's own scope (`.cards-view`) overrides only what genuinely differs. Atlas convention per [[DesignSystemPM]].

**SOURCE:** `Pommora/src/renderer/src/design-system/card-tokens.css` · `Pommora/src/renderer/src/Detail/Views/Cards/CardsView.css`

| Title | Token | Value |
| --- | --- | --- |
| Column Floor | `--card-min-base` | `180px` (shared; the unscaled floor) |
| Scaled Floor | `--card-min` | `calc(var(--card-min-base) * var(--card-scale, 1))` in `.cards-view` |
| Gaps | `--card-gap-h` / `--card-gap-v` | `10px` / `10px` (shared) |
| Cover Zoom | `--cover-zoom` | `1` (shared) |
| Thumb Share | `--thumb-share` | `65%` (shared) |
| Set-Card Floor | `--set-card-min` | `calc(var(--card-min) * 1.5)` |
| Thumb Height | `--thumb-h` | `calc(104px * var(--card-scale, 1))` |
| Body Minimum | `--card-body-min` | `calc(var(--thumb-h) * 0.54)`; compact recomputes from its row stack |
| Band Clearance | `--band-clearance` | → `var(--card-gap-v)` (the seam law's input) |
| Compact Rows | `--card-row-h` / `--card-foot-h` | `17px` / composed |
| Chip Retunes | `--chip-zoom` / `--chip-pad-x` / `--switch-zoom` | `0.85` / `4px` / `0.75` |

### Pending

### Prospects

- **The set-card ghost** — dwelling on a Set Card growing a ghost that creates a Set; waits on the container creation contract (positional order, the create-origin naming law, a set-card rename entry).
- **Set-Card view previews** — a Set Card opening a preview of the Set's view; v1 navigates.
- **File-property covers** — any File property declaring itself the card's image; the Card Banner mode set is extensible for a fourth "Property" mode.
- **Fit Image / Reposition** — contain-vs-fill and hover-reposition on covers; v1 is fill-crop.
- **Fuller band chrome** — band drag, a native band-header menu, and inline band rename (table territory).
