## Info Buttons — Results

**DATE:** 10-28-2026
**SOURCE:** the Info Buttons Drive (`.claude/scripts/Info Buttons Drive/`, removed with the examples), its last run from a clean build at `6bce43f82`.

The drive watched, in the built app, what the unit tests cannot hold. Its last run held 25 of 26 checks and recorded 2; the one failure was the No Hover case reading a web link's hand cursor as a failure, and its Expected now names it. The near-bottom placement it recorded was ruled under the plan's *§Deviations* and fixed in `PickerMenu`: with 150px below its glyph, the 321px pane now opens upward inside the window, where the build before the fix opened it downward past the window's edge.

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

### The Last Run

| Group | Case | Result | Observed |
| --- | --- | --- | --- |
| 2 | The variants | Pass | All thirteen draw at once on a fresh launch, each glyph, type, and border in its own ink. |
| 2 | A disabled row | Pass | The row dims to 0.5 with its glyph; a rest opens the pane, a click holds it, a second click closes it; no hover wash. |
| 2 | The pane near the window's bottom | Recorded | With 224px below the glyph, the pane opens downward and runs out of view; `PickerMenu` first measured it at 1px, before the editor built. |
| 1 | Placement | Pass | The title line holds the title and the glyph 4px apart; the row is 22.99px tall with and without it. |
| 1 | The look | Pass | `filled`, no border, the `info` glyph. |
| 1 | The gray band | Pass | The band over the window's top is the Collection's banner image, the same element with the pane closed and open. |
| 1 | The pane | Pass | With Hover Previews off, a rest opens the pane 6px below the glyph, 285px wide, with no resize edges. |
| 1 | Beside a dropdown near the bottom | Recorded | In a 296px window, Label Format's own picker opens upward and the InfoPane downward; neither stays in view. |
| 1 | The pane's edges | Pass | The text sits 14.5px from each side and 12.6px from the top. |
| 1 | The entries | Pass | All four draw every construct but a heading, top and scrolled. |
| 1 | The long code line | Pass | With Scroll Long Lines off, the line wraps; on, it rests clipped at its ellipsis; it never scrolls sideways, and the body wheels. |
| 1 | The other rows | Pass | Date Format and Aliases each carry the glyph 4px after the title and open their panes. |
| 1 | A frame switch | Pass | A held pane leaves with its frame; the console logs nothing; the pane opens again after. |
| 1 | The entry | Pass | Date Format opens on bold, a list, and inline code; Value Format's body caps at 320px and scrolls through 1,895px. |
| 3 | The crossing | Pass | The pane stays open with the pointer in its body past the grace, and closes once it leaves. |
| 3 | No hover | Pass | Across 18 points nothing reveals and the pointer stays the arrow; a web link shows a link's hand, and the code block's copy mark beside it stays hidden. |
| 3 | No selection | Pass | Every selection stays empty; a double and a shifted press on a prose link leave focus where it was. |
| 3 | No copy | Pass | The clipboard is unchanged, ⌘A selects nothing, and the code tag never copies. |
| 3 | No focus | Pass | Presses on the body, a bullet, a checkbox, and the left inset leave focus on the glyph. |
| 3 | No menu | Pass | No native menu on the body or a table cell. |
| 3 | The web link | Pass | It opens `https://commonmark.org/help/` and focus stays where it was. |
| 3 | The cell's link | Pass | Nothing opens. |
| 3 | The scroll | Pass | The body scrolls; nothing behind it moves. |
| 4 | HTML Formatting on and off | Pass | The Markdown between the tags renders both ways, the tags drawing as tag text. |
