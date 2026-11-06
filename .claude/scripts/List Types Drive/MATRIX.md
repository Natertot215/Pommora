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
