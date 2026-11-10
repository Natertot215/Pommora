### List View — Live Checks

**DATE:** 11-09-2026
**READ AGAINST:** `4b18149ac`, in a scratch instance on its own userData and debug port over `~/Test`, driven by CDP. Each check's throwaway was removed, the scratch instance stopped, and `~/Test` restored from its backup.

These are the checks planning ran before leaning on them (*List View — Decisions & Intention §Open Items* 1 and 7). *List View — Implementation Plan* builds on each result.

#### E-7 — Two Displacement Lists in the Settings Pane

**Result:** holds, with no drag-kit change.

A throwaway pane of two `SortableZone`s sharing one family was mounted in place of the Visibility pane, inside the real SettingsFrame menu, `FrameSlide`, and `MenuScrollFrame`.

- **Reorder and Crossing:** a row reorders within its column and crosses Left to Right and Right to Left.
- **Title:** its `carry` answers null, so it reorders within Left and never lands in Right.
- **The Hidden Foot:** rendered outside the zone's box, it doesn't drag, and the slot above it lands last in the column.
- **Keyboard:** Space lifts, the arrows step within the column, and Space drops; Escape cancels.
- **The Menu:** a drop, a keyboard drop, and Escape mid-drag each leave the menu open.
- **A Scrolled Pane:** with 19 rows, 586px of content in a 409px body, the drag autoscrolls and commits.
- **Width:** the pane measured 408px, two 200px columns and an 8px gap.

Three things the pane needs, none in the engine: an empty column's zone has no height, so it reads `--drag-floor`, which the engine sets on an admitting empty zone; each zone fills its column's height, so the room under a short column's last row is its trailing slot beside a long, scrolled one; and the source zone states `release`, so the lifted row's gap closes in its home column while it's over the other.

#### H-2 — The Wrap Order in CSS

**Result:** holds; Wrap Rows is one declaration.

Measured on an injected mock: a row line that is `display: flex` with a 14px column gap, a left group at `flex: 1 1 min-content` with `min-width: 0` and hidden overflow, a title that shortens to a minimum, and a right group at `flex: none` pushed right. At a 120px minimum with 146px of left values and 146px on the right, the title shortened from its full width to 128px as the row narrowed to 440px; at 430px the right group dropped to a second line, flush right, and the title regained its room; narrower than the left group's minimum, that group overflowed for its scroll lane. With `flex-wrap: nowrap` the same markup shortened the title to 120px and then overflowed the left group.

#### The Title's Floor

**Result:** a short title keeps its own width; a long one stops at the minimum.

A title box at `min-width: min-content`, holding an unseen zero-height sizer capped at the minimum over text that may break anywhere under a one-line clamp, counts as the smaller of its text and the minimum. A long title shortened to 142px (120px of text beside its icon), the right group dropped below 340px, and past the floor the left group overflowed; a two-letter title held its 35px at every width, and its row wrapped at its own, smaller threshold. A fixed minimum would reserve 120px after a short title.

#### The Text Pen on a Content-Sized Value

**Result:** the value grows 24px on hover in both pen forms.

A value sized to its text grew from 60px to 84px on hover, with the pen's room as a margin outside a table cell and as padding inside one. In a flush-right group that growth moves the value out from under the pointer, so a List row holds the pen's room at rest.

#### `Segments` in a Flex Row

**Result:** it draws nothing without a height.

The segment's span measured 2×0px as a flex item and 2×15.6px inline; with a height of `1em` or `1lh` it measured 2×13px or 2×18.2px as a flex item. A height on the shared segment makes it draw in a flex row and changes nothing inline, where a height doesn't apply.

#### B-12 — The Compact Row Padding

**Result:** holds; a row loses twice the padding it gives up, and the band rhythm follows.

Measured on 11-10-2026 in a running development instance, on a grouped Table: a rule stating `--cell-padding-y: 3px` under a two-class selector on the `.table` element won over the token sheet's own statement, every row stood 6px shorter (the shortest from 32.15px to 26.15px), `--band-clearance` read 3px and `--band-gap` twice that, and the grip stayed on its row's center. The rule was removed and the heights returned.

#### Not Run

List's own rows, the two-column pane with real properties, the ghost row's height, the band **+**'s hit box, and the outline rail were read from the code or arithmetic alone; *List View — Implementation Plan* Task 6-3's VERIFY reads each in the app.
