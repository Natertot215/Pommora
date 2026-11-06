## List Types Drive — Matrix

The drive's cases, derived from *List Consolidation — Decisions & Intention*, whose A-6 asks for the drive rewritten to what the log intends with no phase gate, so a failing item fails the run. Group N lands with the plan's Phase N and holds at that phase's head and every later head, so an item exists only once its phase has landed and asserts only what's true from that phase onward. Every check prints as `[g<group> <decisions>] <name>`, so a run reads against the tables below line for line. Each group's case table arrives with the group.

#### Groups

| Group | Phase | Proves |
| --- | --- | --- |
| 1 | One Scan Per Surface | Each surface reads what it should (B-11): a page, a focused cell, and a resting cell draw each type's glyph, and in a cell fence-shaped lines are just lines, `$$` lines read as text, and a `[^1]: note` line binds nothing |
| 2 | Markdown Code Blocks | Section C: keys, picks, undo, the outside list stepping past, plain code, a no-language block, a diff line keeping its sign, a table header staying out of a list block |
| 3 | Blank Lines and Numbering | B-5, B-6, B-10, D-2, D-4: drags by a real pointer, rails read as measured DOM, renumbering live with one ⌘Z, the grip's reach |
| 4 | Paste | F-2 |
| 5 | One Marker Grammar | B-1 to B-4, B-9 |
| 6 | One Set of List Keys | G-9's keys on a page and a focused cell |
| 7 | One Definition Per Type | B-7, D-3, D-6, the callout head |
| 8 | The Word Rule | E-5, E-6, driven by real double-clicks |
| 9 | Right-Click | E-1 to E-4, E-7, D-5 |
| 10 | Text Properties | Section G, in this drive and the Text Property Drive |

#### Dimensions

| Dimension | Values | Crossed Where |
| --- | --- | --- |
| **Types** | Bulleted (`-`, and `+` as a bullet), Numbered, Alphabetical, Checklist, Arrowed | All five in group 1's drawing; `+` from group 5, once it reads as a bullet |
| **Surfaces** | A page, a quote, a callout, a focused cell, a resting cell, an editing tile, a Markdown code block | Each in the group whose decisions reach it |
| **Gestures** | Keys, picks, drags, right-clicks, paste, double-clicks | Keys in groups 2 and 6; picks in groups 2, 3, and 7; drags in group 3; right-clicks in group 9; paste in group 4; double-clicks in group 8 |
| **Settings** | Preserve List-Level Formatting, Outliner Lines | Group 3, beside the grip's reach and the rails |

#### Pruned

- **The word and Bold items of the earlier drive:** they prove nothing about lists, and the word rule's pins and group 8 hold what they read.
- **A Text value's one-line field:** it reads no list and stays plain (G-5), which the Text Property Drive proves.
- **A quote, a callout, and an editing tile in group 1:** a quote and a callout are blocks a page's scan reads, and a tile mounts the page's own editor, so B-11 gives none of them a scan of its own; the groups whose decisions reach them cross them.
- **Drags and rails in a Markdown block:** a block draws no glyph (C-1), so nothing presses, and its lines draw as code, so no rail reads them.
- **Preserve List-Level Formatting inside a block in group 2:** a pick reaches through the one `listReach` a page uses (*Scouts/8*, 8-T26), and group 3 crosses the setting on a page.
- **A paste in a Markdown block in group 2:** the recount arrives with paste, so group 4 holds it.
- **A table pasted onto a code line:** it needs a table's clipboard payload, and `tableGuard`'s test reads the marker the block no longer holds.
- **A cut at rest in group 3:** the resting menu's seat is Phase 9's rework, and a cut at rest lands through the `landEdit` a pick at rest takes; group 9 holds it.
- **A paste in group 3:** the saved tree holds paste already, and group 4 owns the row.
- **Rails through wraps and the nesting cap:** `railIntents` reads lines, so a wrap is one line, and the cap writes no deeper level to draw; the elbow and join ends are read as part of each rail's reach.

#### Group 1 — One Scan Per Surface

| Case | Surface | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| Each type's glyphs and text (5) | A page | read | `•`, `1.`, `A.`, `☐` and `☑`, and `→` draw beside the item's text | B-11 |
| Each type's glyphs and text (5) | A resting cell | read | the same | B-11 |
| Each type's glyphs and text (5) | A focused cell | click in, read | the same, with the caret on the line | B-11 |
| The list between ` ``` ` lines, and between `$$` lines | A resting cell | read | both items draw | B-11 |
| The same | A focused cell | click in, read | both items draw | B-11 |
| The same | A focused cell | the grip's Numbered | the list numbers, and the edge lines stay as written | B-11 |
| `(` between ` ``` ` lines | A focused cell | type a space and `(` | `pp ()`, since the line holds no code | B-11 |
| `*it*` between ` ``` ` lines | A resting and a focused cell | read | italic on both | B-11 |
| `$$`, `xq`, `$$` | A resting and a focused cell | read | the lines show as written, with no math mark | B-11 |
| `[^1] zz`, `[^1]: note` | A resting and a focused cell | read | the lines show as written, with no citation row or marker | B-11 |
| The same lines as blocks | A page | read | no item in a code block or math, and the math marks its line | B-11 |
| `See [^1] now.` over a `[^1]: note` tail | A page | read | one citation row and one marker | B-11 |

#### Group 2 — Markdown Code Blocks

Every key and typed row is one stroke at a caret, asserted against the text it writes, with ⌘Z asserted back to the seed where the stroke wrote.

| Case | Surface | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| All five types | ` ```md ` | read | no glyph | C-1 |
| Enter at an item's end, per type | ` ```md ` | Enter | the next marker writes, numbers and letters recount, a checkbox continues unchecked | C-1 |
| Enter inside an item, on an empty item | ` ```md ` | Enter | the item splits; an empty item continues, as on a page | C-1 |
| `> x` | ` ```md ` | Enter | a plain line | C-1 |
| `- a` | ` ```md ` | Shift-Enter | a plain line | C-1 |
| Bullets and numbers | ` ```md ` | Tab, Shift-Tab | nest and outdent, numbers recounting; the cap holds | C-1 |
| An empty item, a nested one, `12\|. a` | ` ```md ` | Backspace | clears; keeps its indent; takes the marker | C-1 |
| `- a\|` over `- b` | ` ```md ` | Delete | joins raw | C-1 |
| A whole line | ` ```md ` | select, Backspace | the run closes up | C-1 |
| `- a`, `- b` | ` ```md ` | each other type by Lists ▸ | the list switches, Bulleted checked, ⌘Z back | C-1 |
| `-[]` and a space, `->` | ` ```md ` | type | `- [ ] `, `→` | C-6 |
| `x ->`, `(`, `\|\|` | ` ```md ` | type | literal | C-6 |
| `-[]`, `-[x]`, `->`, `\|\|`, `‼!` | ` ```js `, a no-language block | type | literal | C-6 |
| `- foo` | The same | read | no glyph | C-3 |
| Enter, Enter on `> x`, Tab, Backspace past a dash | The same | key | a plain line; nothing; one character | C-3 |
| A whole line in `1.`, `2.`, `3.` | The same | select, Backspace | no recount | C-3 |
| `- foo` | The same | Numbered twice | `1. - foo`, `1. 1. - foo`, no row checked | C-5 |
| `foo`, `bar` | The same | select both, Numbered | `1. foo`, `1. bar` | C-5 |
| A word | The same | Format ▸ Bold, ⌘B, Heading, Insert ▸ Blockquote | each writes into the code | C-5, C-7 |
| An empty line | The same, ` ```md ` | type `/bul` | no menu, where a page opens one | C-1 |
| `- removed`, `+foo` | ` ```diff `, ` ```md diff ` | Numbered, Bold, Heading | each writes after the sign, and nothing draws as a list | C-4, C-7 |
| `- a` | ` ```markdown `, ` ```notes/a.md ` | Enter | continues | C-4 |
| A ` ```js ` sample's `- a` | ` ````md ` | Enter | continues | C-1 |
| `1. a`, a carried block, `2. c` | A page | the glyph, a crossing selection, Enter | the block's lines stay | C-2 |
| The same | ` ```md ` | Enter on `1. x` | its own run counts, the outer list stays | C-2 |
| Prose, a block, prose | A page | select through, Bulleted | the block stays | C-2 |
| Prose into ` ```js ` | A page | select into, Heading | both lines write, the delimiter stays | C-5 |
| The block's grip | ` ```md `, ` ```js ` | press | the same rows | C-1 |
| A list over a table | A page | the grip's Delete | the table stays whole | F-1 |

#### Group 3 — Blank Lines and Numbering

Every drag is a real press on a glyph, or a grip, carried to a line's edge, asserted against the text, with one ⌘Z back to the seed. Every key is one stroke, asserted the same way.

| Case | Surface | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| Flat, up and down | A page | drag | the item moves | B-10 |
| An item with children; a nested item with children | A page | drag | children travel; the item re-nests at the level it lands on | B-10 |
| An item with a rider; a carried block with a flush line | A page | drag | both ride whole | B-10, B-6, F-1 |
| An item over a blank and an indented paragraph | A page | drag | the paragraph stays | B-5, B-6 |
| Into another list across a blank | A page | drag | it lands in that list, and that list counts it | B-5, B-10 |
| A list's first item, dragged out | A page | drag | the rest keep their numbers | B-10 |
| A quoted item, a callout's item, an item in a live cell | Each | drag | it moves inside its own surface | B-10 |
| Numbered, at 5, past Z | A page | drag | the recount rides the stroke, and the head holds | B-10, F-1 |
| An item's own edge | A page | drag | nothing moves | B-10 |
| A box | A page | tap, then a carried press | the tap checks it; the carried press moves it unchecked | B-10 |
| `1.`, `2.`, `3.` a blank apart | A page | the grip's drag | `3.`, `1.`, `2.` | B-5 |
| An edit under a held drag, by a dispatch on the view | A page | a glyph's drag, a grip's drag | the drop lands nothing | B-5 |
| Enter, Tab, Shift-Tab, a whole line, a pick | A page | stroke | the recount rides it, one ⌘Z takes both | B-10 |
| A list at 5, a run past Z | A page | Enter, Tab, deletion | the head holds | B-10, F-1 |
| A list's first item | A page | deletion | the rest keep their numbers | B-10 |
| A blank added, removed, and a marker cleared | A page | Enter, Backspace | splits with the lower numbers kept; merges and recounts | B-5 |
| Enter above a split | A page | Enter | its own list counts alone | B-5 |
| A blank below a block an item carries | A page | Backspace | the lists merge, recounting past the block | B-5, B-6 |
| A selection across items | A page | type over it | the run recounts, one ⌘Z takes both | B-10 |
| A word selected, a glyph dragged past it | A page | double-click, drag, Enter or Backspace | a caret stands at the change, and the key acts there | B-10 |
| The item above a carried block | A page | triple-click, Backspace | the block keeps its lead | B-6 |
| `3. p`, nested `1. a`, `5. q` | A page | Bulleted at `a` | `4. q` | B-5, B-10 |
| A pick above a blank, and on an item over an indented paragraph | A page | glyph | stops at the blank | B-5, B-6 |
| `b` above `5. a` | A page | Numbered | `1.`, `2.` | B-10 |
| Separated paragraphs | A page | select all, Numbered | `1.`, `1.`, `1.` | B-5 |
| Each type | A page | re-pick | nothing writes | D-4 |
| `1. a`, `3. b` | A page | Bulleted, then Numbered | the list repairs | D-4 |
| The example | A page, a focused cell | the grip, Preserve on and off | every item in the block | D-2 |
| A mixed block, a uniform one | A page | the grip | no row checked; its type's row checked | D-2 |
| The example | A page | a glyph and a caret, Preserve on; a glyph, off | the group; the group and what nests under it | D-2 |
| A blank, a quote, an indented paragraph above | A page | the grip's pick and Delete | each stops short of the other block | B-5, B-6, F-1 |
| Bulleted, Checklist, Alphabetical | A page, a resting cell | Outliner Lines on, measured | one unbroken rail from under the parent into the last child, on its glyph's axis | B-9 |
| Numbered, Arrowed | A page, a resting cell | Outliner Lines on, measured | no rail | B-9 |
| Outliner Lines off | A page, a resting cell | measured | no rail draws | B-9 |
| A blank under a nested list | A page, a resting cell | measured | the rail ends at the blank | B-5 |
| A code block, a flush line in one, a rider | A page, a resting cell | measured | the rail carries through | B-5, B-6, F-1 |
