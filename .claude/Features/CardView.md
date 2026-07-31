## CardView

The Cards renderer draws a [Collection's](Collections.md) (or a depth-1 Set's) Pages as a resizable card grid, over the same pure pipeline that feeds the [Table](TableView.md) — columns → filter → group → sort. It's the first of the non-Table renderers; a Collection or Set switches to it from the ViewSettings type grid, and it draws the same inside a [view embed](SurfacePM.md), at the embed's zoom.

### Features

#### II. Card Anatomy & Sizing

A page card is an image band over a text area — title, then properties, then an optional location footing. The image band is a fixed height scaled by the card factor; the text extends below, and every card in a grid row matches its tallest sibling. The grid is an auto-fill track set off a column-width floor, so a partly-filled band keeps the same card size as a full one rather than ballooning. The card chassis — grid mechanics, borders, and the shared hover-pop lift — starts from the [Navigation](Navigation.md) gallery card's values; the inner title and property area is the cards renderer's own and free to diverge. Card and Set titles read one shared type source, and the location breadcrumb is always seated as a footing, pinned to the card's bottom under a divider whether or not properties sit above it.

**Scale** is a slider in the ViewSettings footing, drafting live while dragging and writing the view on release; the scrub is scoped per view so a sibling cards embed on the same surface isn't dragged along. The factor persists as `card_size`, a bare number.

#### II. Card Image

A per-view **Card Banner** control chooses the image source: **Cover** (the page's banner), **Preview** (the captured page thumbnail, on the nav gallery's pipeline), or **None** (imageless, compact cards). A page lacking an image under Cover or Preview shows the placeholder, so heights stay uniform within a view. Right-clicking the image band pops the native banner menu — Add when the page has no cover, Change / Remove when it does — worded for the view's source and editing the page's one banner image through the PageHeader flow, so the card refreshes live on the write. The Preview thumbnail rides the one shared, persistent thumbnail cache.

#### II. Layouts

Card layout is the view's `format`:

- **Standard** — the title, then one labeled row per visible property: label left, value right.
- **Compact** — the title, then label-less values packed in property order.

Imageless cards reserve a bottom area of the title plus two property-value rows, so they read as cards rather than flat rows; the location footing adds its own height below that reserve. Two switches shape them further: **Wrap Titles** — off keeps the title single-line on the shared overflow-scroll — and **Hide Icons**. A value never wraps in either layout: chips keep their hover-scroll mechanics, text-shaped values clamp.

#### II. Properties on Cards

Cards show every visible property, rendered through the shared chip and cell renderers. Each value is interactive on the same per-kind gesture matrix the table cells use — a click opens the value's picker, a checkbox toggles. A right-click opens the value's native menu off the shared cell-menu model: the per-kind items plus a trailing **Remove** that drops the property from the view, its order slot remembered; an empty cell that would otherwise have no menu still gets the bare Remove. The whole card is a drag handle, so a value's own click stops propagation before the card sees it, and a press beginning on a value takes a larger drag-activation threshold — a tap-wobble opens the picker instead of lifting the card. Only the title and the image band open the page.

The portal pickers mount at **one grid-level host** rather than inside the cards, so row churn can never tear an open picker out: values resolve live off the current row, a dead anchor freezes in place, and a value Compact drops mid-edit dismisses animated. Every picker Blooms in AND out, which PickerMenu enforces. A chip's remove-× is inert until its hover reveal — an un-hovered click falls through and opens the picker, so a short chip can never lose a value to a stray click; below the embed-zoom floor the multi-select × drops entirely.

Adding a value comes from the **two-stage add-picker**, whose list is everything NOT currently shown on the card: hidden properties and context columns, plus any revealed-but-blank property. A blank pane-bearing kind slides into its value pane, while the DEPENDENT dropdown kinds exit the add menu entirely and open their own picker at the same anchor, revealing the property on the first committed value — a dismissed, untouched picker reveals nothing. A checkbox, and any hidden-but-filled property, reveals on pick instead. Pane-bearing entries group to the top, reveal-only entries below, property order preserved within each group. The add-picker opens from empty space in a card's text area, from a card's location footing, or from the native card menu's **Add Property ▸** submenu.

#### II. Grouping, Location & Sorting

Cards never indent: structural grouping renders a flat disclosure band per top-level Set, its whole subtree's pages gathered into that one band. A property group replaces the location bands with bucket bands. Ungrouped and root pages band under the container's own heading rather than a header-less tail. Band chrome is a persisted collapse plus a hover **"+"** on structural bands only — a visual stub until the creation-affordance design lands. No sub-grouping and no heading columns apply. Band seams are state-free: every band wears the band-to-card gap on both sides, so bands sit off each other — and off the Set-cards row — by twice that gap, expanded or collapsed, in every layout alike; a collapsed heading sheds only its heading-to-cards clearance, folding on the disclosure beat in step with its cards.

**Flattening** is **Group By: None** — the `flat` grouping, rendered as one headerless list. **Sort By: Location** is a Sort By entry rather than a rankable criterion; the sorter has no set tree, so it's ordered at the resolve level. Its Order picker is **Location / Custom**, never Ascending/Descending: Location is filesystem order with drag off, Custom the view's manual order with drag on. That mode carries its own per-view key, so grouping structurally on the same view can't shadow it. The flat, filesystem-ordered list is Group By: None over Sort By: Location, and it shows each card's full location footing.

Each card's **location footing** is a Set / sub-Set breadcrumb governed by a standing **Hide Location** switch, independent of grouping mode. Under structural grouping the band header already names the top-level Set, so the footing drops that leading crumb; a flat or property list has no location band header, so it shows the full chain.

#### II. Set Cards

A **Set Cards** switch adds a leading row of larger cards, one per Set (or per depth-1 sub-Set in a Set view) — banner (placeholder when unset) + icon + title. Clicking a Set Card navigates to the Set; the row is reorderable by drag (writing the container's set order). A container with no Sets shows no row; an empty Set still gets its card.

#### II. Card Drag & Menus

Cards reorder within their band by displacement (the nav gallery's drag), writing the per-machine manual order the pipeline reads as its lowest-priority sort tiebreaker. Two effective sort criteria retire that reorder, as does Sort By: Location on its computed Location order.

A card's **right-click** opens a native menu: the **Add Property ▸** submenu over the page-meta block — Open · **Move To ▸** the Collection/Set tree · Rename · Change Icon · Delete. Rename mounts the shared text picker, Change Icon the icon picker. A value's own right-click menu takes precedence over the card menu.

#### II. Surfaces & Insets

Cards live in the ViewSettings type grid and carry their options in the Layout leaf, with Style and Scale pinned in the footing; the grouping and sorting leaves reuse the shared panes. A view switched to a type inherits the new type's default glyph only when it still wore the old default. Cards ride the block-surface inset regime: in a full-page pane a pane-body rule supplies the surface inset so the view itself never pads, while an embedded cards view runs the tight inter-tile lane directly on its grid — the whole-page inset composes that same lane onto a floating-sidebar clearance a tile has already gotten, so a tile needs only the bare lane rather than sitting flush to the edge. An embedded view also keeps its own tail seam — the last card row sits off the tile's bottom edge on the card rhythm, matching the view's top seam.

### Pending

- **Heading "+" creation** — the structural-band "+" is a visual stub until the page-creation affordance is designed.

### Prospects

- **Cross-band card drag** — a card dropped into another location or property band as a real move or property write; the card stays draggable across bands, and settling that drop's design is the next focus here.
- **Set-Card view previews** — a Set Card opening a preview of the Set's view; v1 navigates.
- **File-property covers** — any File property declaring itself the card's image; the Card Banner mode set is extensible for a fourth "Property" mode.
- **Fit Image / Reposition** — contain-vs-fill and hover-reposition on covers; v1 is fill-crop.
- **Fuller band chrome** — band drag, a native band-header menu, and inline band rename (table territory today).
