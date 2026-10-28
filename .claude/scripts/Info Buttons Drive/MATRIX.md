## Info Buttons Drive — Matrix

The drive's cases, from *Info Buttons — Decisions & Intention*, against the build at the head of Phase 3. A Select in Collection A seeds the format rows; the harness restores `~/Test` when the run ends. A recorded case prints its observation as RECORDED and never fails the run; a review case answers a question the Phase 3 review raised.

#### Group 1 — The Glyph and the Pane

| Case | Operation | Expected | Decisions |
| --- | --- | --- | --- |
| Placement | open the Select's settings | `button[aria-label="Label Format - Info"]` sits right after the title text, inside the title line; the row stands as tall as it did at the baseline; a shot | A-1, F-1 |
| The look | as above | the glyph wears `filled`, no outline, the `info` icon | A-2 |
| The pane | with Hover Previews set to Off, rest on the glyph 600 ms | the pane opens below the glyph, 285px wide, with no resize edges; a shot | B-1, B-2, C-4 |
| The gray band | as above, a shot with Label Format's pane closed and one with it open | what sits over the window's top is the same both ways, so the band is the view's, not the pane's | review |
| The pane's edges | as above | the text's insets read 12px top and bottom and 14px each side, the left matching the right | review |
| Beside a dropdown near the bottom | the window cut short under Label Format's row: open its format picker, then rest on its glyph | recorded: the side each opens on and where it places, `PickerMenu` staying as built | *§Planning Rulings* |
| The other rows | open Settings and rest on Date Format's glyph; open a page's settings and rest on Aliases' glyph | each glyph sits right after its title and opens its pane; a shot of each | A-1, F-1 |
| The entries | open each of the four panes and scroll each through | every construct in each entry draws (emphasis, strikethrough, highlights, lists, checklist, quote, callout, tables, code, links, divider); a shot of each pane, top and scrolled | C-2 |
| A frame switch | hold Date Format's pane open and switch Settings frames | record what the console logs | — |
| The entry | as above | bold, the list, and inline code draw, with no heading above them; Value Format's table, quote, code block, and link draw, and its body scrolls past 320px | C-2 |
| The long code line | open Value Format's pane, with Scroll Long Lines In Code Blocks off and then on | off, the long line wraps; on, it rests clipped at its ellipsis; it never scrolls sideways, and the body still wheels | C-2 |

#### Group 2 — The Disabled Row and the Variants

| Case | Operation | Expected | Decisions |
| --- | --- | --- | --- |
| A disabled row | the Iteration window's Disabled Row: rest, click | the glyph dims with the row and opens its pane; the row draws no hover wash | A-4 |
| The variants | on a fresh launch, before any Icon Picker opens, the Iteration window | all thirteen draw at once, every glyph, type, and border in its own ink; a shot | A-2 |
| The pane near the window's bottom | the window cut short under the last variant: rest on its glyph | recorded: the side the pane opens on, where it places, and the height `PickerMenu` first reads off it | *§Planning Rulings* |

#### Group 3 — The Pane's Text

| Case | Operation | Expected | Decisions |
| --- | --- | --- | --- |
| The crossing | rest on Label Format's glyph until the pane opens, move into the pane's body, and rest there past the grace | the pane stays open; leaving it closes it after the grace | B-1 |
| No hover | move across the body, its lists, its table, and its code block, and rest on Value Format's prose link beside its code block | nothing reveals or highlights, and the pointer stays the arrow but on a web link, which shows a link's hand | C-3 |
| No selection | drag across the body and across the table's cells; double-click and shift-click Value Format's prose link | nothing highlights, no selection draws, focus stays where it was, and `getSelection().toString()` is empty | C-3 |
| No copy | press in the body, ⌘A, ⌘C; click the code block's language tag | the clipboard holds what it held | C-3 |
| No focus | press the body, a bullet, a checkbox, and the left inset beside a line | nothing moves or toggles, and `document.activeElement` is where it was | C-3 |
| No menu | right-click the body and a table cell | nothing opens | C-3 |
| The web link | click Value Format's prose link | the link opens as a web link does, and focus stays where it was | C-2 |
| The cell's link | click the link in Value Format's table | nothing opens | C-2 |
| The scroll | wheel inside the body | the body scrolls; the settings behind don't | C-2 |

#### Group 4 — The Tags in Pommora

| Case | Operation | Expected | Decisions |
| --- | --- | --- | --- |
| HTML Formatting on | a page in `~/Test` holding the InfoIndex's text, opened with HTML Formatting on | the Markdown between the tags renders; a shot | *§Planning Rulings* |
| HTML Formatting off | as above, off | as above; a shot | *§Planning Rulings* |
