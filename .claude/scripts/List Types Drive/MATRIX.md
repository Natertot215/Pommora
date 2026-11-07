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
- **A cut at rest in group 3:** the resting menu's seat is Phase 9's rework, so group 9 holds it.
- **A paste in group 3:** the saved tree holds paste already, and group 4 owns the row.
- **Rails through wraps and the nesting cap:** `railIntents` reads lines, so a wrap is one line, and the cap writes no deeper level to draw; the elbow and join ends are read as part of each rail's reach.
- **A paste at rest in group 4:** the resting menu is Phase 9's rework, so group 9 holds it.
- **A table pasted into a list:** a table's clipboard payload reaches `tableGuard`, not the recount, and no decision names it.
- **Enter, Tab, and Shift-Tab off an item in a cell:** they're the cell's navigation rather than a list's key, which `cellLists.test.tsx` pins; group 6 reads the keys a list claims.
- **⌘Z after every cell key:** a cell forwards undo to the page's history, one path whatever the key, so one recount proves it.
- **Each key in a quote or a callout:** a page's Enter, Backspace, and Delete come from its own chain while `listKeys` holds its Tab and Shift-Tab, and groups 3 and 7 hold what's particular to those blocks.
- **A callout head's type menu:** a head draws no glyph (F-1), so nothing opens one, and `format.test.ts` pins what a pick writes there.
- **Word gestures in a Text value:** a value's editor mounts the same `editorBase`, and `inlineScope.test.tsx` reads the rule at that scope.
- **The word rule's character classes past those a user types:** `𝒶'b` stays with `inlineScope.test.tsx`; a press can't land one half of an astral letter reliably.
- **The info pane in group 9:** nothing mounts `InfoButton` today, so no surface draws one to press; `editorMenu.test.tsx` holds the bubble stop.
- **A window tab and an embed in group 9:** both mount the unentered tile's read-only editor; the tile, the reader, and a glance cover the short menu's three routes in.
- **A Text value's resting draw, its disk, Escape, and the × in group 10:** a Text value owns them, so the Text Property Drive holds G-3, G-4, G-7, G-8, G-11, G-12, G-13, and G-10's closes, and group 10 holds what a list does on the pane and that the field stays plain.

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

#### Group 4 — Paste

Every paste goes through the app's paste event with `text/plain`, and every item asserts one ⌘Z back to the seed.

| Case | Surface | Paste | Expected | Decisions |
| --- | --- | --- | --- | --- |
| `1.`, `2.`, `3.` | A page | `9. x`, `9. y` under `2.` | 1 through 5 | F-2 |
| A list at 5 | A page | two lines at `6.`'s start | they join and count on from 5 | F-2 |
| A list at 5 | A page | one line with its newline, at `6.`'s start | it joins that line as text, its edge whitespace left out, and nothing recounts | F-2 |
| Two lists a blank apart | A page | `2. b` on the blank | they join and recount | F-2 |
| A run at 5 | A page | `9. x`, `9. y` above it | takes the pasted start | F-2 |
| `1. a`, `3. b` | A page | a word inside an item | nothing recounts | F-2 |
| `1.`, `2.`, `3.` | A page | a flush line | the list ends, the lower keeps its number | F-2 |
| A quoted list | A quote | quoted items | recounts | F-2 |
| Two lines, or an end across two items | A page | over a selection | the gap closes | F-2 |
| ` ```md ` | A Markdown block | an item | recounts | C-1, F-2 |
| ` ```js `, a no-language block, display math | Each | an item | counts nothing | C-3, F-2 |
| `1.`, `2.` | A focused cell | two items | recounts | F-2 |

#### Group 5 — One Marker Grammar

| Case | Surface | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| `+ x`, `+ [x] a`, `+ [ ] a` | A page, a resting and a focused cell | read | `•`, `☑`, `☐` beside the text | B-1 |
| `- [] x` | The same | read | `•` beside `[] x` | B-1 |
| `1. [ ] a`, `2. [x] foo` | The same | read | the number, with the box as text | B-3 |
| `-[] x`, `-[ ] x`, `-[x] x`, `1.[ ] a` | The same | read | plain text | B-2 |
| `* a`, `1) a` | The same | read | plain text | B-1 |
| `+ p` | A page, a resting cell | the glyph, Lists ▸ | Bulleted checked | B-1 |
| `- [] p` | A page | the glyph | Bulleted checked | B-1 |
| `+ a`, `+ [ ] a` | A page | Enter | `- `, `- [ ] ` | B-4 |
| `- [] x`, `9. a` | A page | Enter | `- `, `10. ` | B-1 |
| `-[]`, `+[]`, `-[x]`, `  +[x]` | A page | a space | `- [ ] `, `- [ ] `, `- [x] `, `  - [x] ` | B-2 |
| `+[]` | A focused cell | a space | `- [ ] ` | B-2 |
| `2. [x] foo`, `1. [ ] a` | A page | Bulleted | a real box | B-3, F-1 |
| `+ a` | A page | Bulleted | stays `+ a` | B-4 |
| `- [] x` | A page | Checklist | `- [ ] [] x` | B-1 |
| A nested `+` list | A page, a resting cell | Outliner Lines on, measured | a rail | B-9 |
| A caret on a `+` marker, and on its text | A page | seat | reveals, and keeps its glyph, as a dash does | B-1 |
| The arrow keys through a `+` marker | A page | Right and Left | the same seats as a dash | B-1 |

#### Group 6 — One Set of List Keys

Every row runs for all five types on a page and in a focused cell, asserted against the text, with ⌘Z back to the seed on a page.

| Case | Key | Expected | Decisions |
| --- | --- | --- | --- |
| At an item's end, mid-item, at the start of its text | Enter | the next marker writes and the run recounts | G-9 |
| An empty item | Enter | continues | G-9 |
| A second item | Tab | nests, numbers and letters restarting | G-9 |
| At the cap | Tab | holds | G-9 |
| A nested item; a top-level one | Shift-Tab | outdents; holds | G-9 |
| At a marker's end; inside a marker | Backspace | the marker leaves | G-9 |
| At an item's end | Delete | joins raw | G-9 |
| Inside the text | Delete | one character | G-9 |
| Above the last item | Shift-Enter | a plain break | G-9 |
| A whole line | select, Backspace | the run closes up | G-9 |
| A checked box | Enter | an open box | G-9 |
| A middle number | Tab | the run it leaves recounts | G-9 |

| Case | Surface | Key | Expected | Decisions |
| --- | --- | --- | --- | --- |
| The last item | A page | Shift-Enter | a plain break | G-9 |
| The last item | A focused cell | Shift-Enter | leaves the cell, writing nothing | G-9, G-10 |
| A numbered item | A focused cell | Enter, ⌘Z | stays in the cell and recounts; one ⌘Z takes both | G-9 |

#### Group 7 — One Definition Per Type

| Case | Surface | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| `/` | A page | type | the five names, none ending in List | D-6 |
| `/` and each type's name | A page | type, Enter, ⌘Z | its row, its marker, and one ⌘Z back | B-7, D-6 |
| A word in a list | A page, a resting and a focused cell | right-click | Lists ▸ reads the five names with Bulleted checked, beside Format ▸ | D-3, D-6 |
| A list's grip | A page, a focused cell | right-click | Format ▸ and Delete, no Type ▸, the five names under it | D-3, D-6 |
| A glyph | A page | right-click | the five names | D-6 |
| Each type | A page | a glyph's pick to each other type | that type's own markers | B-7 |
| `- `, `+ `, `1. `, `A. `, `- [ ] `, `→ ` in a head | A callout | read, caret away and on the line | no glyph, no item, the marker as text | F-1 |
| A head over a body item | A callout | read | the body keeps its glyph | F-1 |
| A caret past a head's `- ` | A callout | seat, type | it stands at the text, and typing lands there | F-1 |
| A press on a head's text | A callout | click | the caret seats in that text | F-1 |

#### Group 8 — The Word Rule

| Case | Surface | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| `don't`, `don’t`, `rock'n'roll`, `8'9` | A page | double-click | the whole word | E-5 |
| `students'.`, `'quoted',`, `a'_b` | A page | double-click | the word, its quote or tail left out | E-5 |
| `'don't'`, `'I don't'` | A page | double-click | the quote rides, the accepted departure | E-6 |
| `don't stop` | A page | Option-Right, Option-Left | crosses it whole both ways | E-5 |
| `students' don't`, `don't 'quoted'` | A page | Option-arrow across the gap | runs on, the accepted departure | E-6 |
| `'don't'` from 0 | A page | Option-Right | stops past the quote | E-6 |
| `don't` | A page | Option-Backspace, Format ▸ Bold | takes and wraps it whole | E-5 |
| `don't` | A focused cell | double-click, Option-arrow | the whole word, both ways | E-5 |
| `don't`, `'quoted'` | A resting cell | right-click, Bold | wraps the word, a quote left out | E-5 |
| `'don't'` | A resting cell | right-click, Bold | the quotes ride, the accepted departure | E-6 |
| `// don't stop` | ` ```js ` | double-click, Option-arrow | the whole word, both ways | E-5 |
| `// $a's` | ` ```js ` | double-click | `a's`, the language's `$` dropped for that gesture | E-6 |

#### Group 9 — Right-Click

The menu stays up between a press and its choice, so a seat's highlight is read from `CSS.highlights` and a screenshot while it's up. The clipboard is read first and written back.

| Case | Surface | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| A word | A resting cell | right-click | Cut, Copy, Paste, Paste Without Formatting, Lists ▸, Format ▸, Speech ▸, Share ▸, and Format ▸'s rows as a live cell's | E-1 |
| A word | A resting cell | Format ▸ Bold, Lists ▸ | writes in the cell; no editor, the page's caret and focus unmoved | E-1 |
| Bullets, numbers, arrows | A resting cell | the glyph's Checklist, ⌘Z | commits without entering, and reverts | E-1 |
| `> a`, blank past `ab` | A resting cell | Bulleted, Bold | `- > a`, `ab****` | E-1 |
| A dismissal, Copy, an empty paste, a pick changing nothing | A resting cell | close, type | typing lands at the page's caret | E-2 |
| A page selection | A resting cell | dismiss, type | it stands, and typing replaces it | E-2 |
| A closed menu | A resting cell | click | one click enters | E-2 |
| Cut, ⌘Z; Paste; lines pasted; a cut across lines | A resting cell | row | writes without entering, reverts, and recounts | E-1, F-2, B-10 |
| Use Native Highlighting on and off | A resting cell | hold the menu, read, close | the word registered in the selection color, nothing in Chromium's selection; cleared on close | E-2, E-3 |
| Text, a glyph, a read-only cell | An unentered tile | right-click | Copy and Select All alone, Copy off on a glyph | E-4 |
| Copy, Select All | An unentered tile | row | the seated word; the tile's document | E-4 |
| A link, a heading's band | An unentered tile | right-click | their own menus | E-4 |
| A glyph | An editing tile | Numbered, ⌘Z | the type menu, its own group, undone | E-4 |
| Text, a glyph | The page reader | right-click | Copy and Select All alone | E-4 |
| Text | A glance | right-click | Copy and Select All alone | E-4 |
| A read-only table's cell | An unentered tile, a glance | Select All, ⌘C by a key event carrying `copy` | the clipboard holds that surface's document | E-4 |
| Select All in a glance | A glance | Escape until it closes | the page holds the focus again | E-4 |
| `- `, nested, box, nested box, number | A page | a press left of the glyph and at the line's edge, Bold | writes past the marker | E-7 |
| `> quote` | A page | a press on the prefix, Bold | writes past it | E-7 |
| A bullet | A page | a left press left of it, type | seats at the content | E-7 |
| A link settling on the line | A page | Bold on a word | lands | E-7 |
| A word ending an inline code span | A page | Insert ▸ | no Footnote, where prose offers it | E-7 |
| `_it_`'s revealed `_` | A page | right-click | Italic checked | D-5 |
| Inside a line; a word filling its item | A page | Lists ▸ | the item's group | D-5 |
| A whole line, a triple-click | A page | Lists ▸ | narrows to that item | D-5 |
| A triple-click or a drag ending at the next line's start | A page | a row from the next line, or Lists ▸ | acts on the line it means | D-5 |
| A glyph inside and outside a selection | A page | pick | its group | D-2 |
| A glyph, a revealed marker, blank past a line | A page | press | the caret stays; the glyph's reach; acts at the point | E-7 |
| The Settings row | Settings | read, turn off | sits under Outliner Lines, and a pick follows without a reload | D-1 |

#### Group 10 — Text Properties

Group 10 holds a list on a Text value's surfaces. The value itself, at rest and on disk, is the Text Property Drive's.

| Case | Surface | Operation | Expected | Decisions |
| --- | --- | --- | --- | --- |
| `- item` typed on the first line | The pane | type | a list | G-2 |
| Each type | The pane | read | its glyphs and text | G-1 |
| Group 6's whole table | The pane | key | as on a page | G-10 |
| A plain line | The pane | Enter at its end and middle, Tab | breaks; holds | G-10 |
| The last item | The pane | Shift-Enter | a plain break | G-10 |
| Every key | The pane | read | it stays open | G-10 |
| A number | The pane | Enter, ⌘Z | recounts; one ⌘Z takes both | G-10 |
| An empty line | The pane | type `/bul` | no menu | G-10 |
| A glyph | The pane | right-click, pick | the type menu, its group | G-10 |
| A word in a list | The pane | right-click, Lists ▸ | Lists ▸ beside Format ▸, Bulleted checked, the pick writes | G-1 |
| The example | The pane | a glyph, Preserve on and off | the group; the group and what nests | G-10 |
| The grip | The pane | right-click, Format ▸, Delete | every item in its block; the block | G-10 |
| Glyph drags, flat and numbered | The pane | drag | the item moves and recounts, and the pane stays | G-10 |
| A grip drag | The pane | drag | the block moves over `moveRange`'s blank | G-10 |
| A nested list | The pane | Outliner Lines off and on | no rail; a rail | G-10 |
| `- milk`, `- eggs` | The one-line field | open | its dash, no item, glyph, or grip | G-5 |
