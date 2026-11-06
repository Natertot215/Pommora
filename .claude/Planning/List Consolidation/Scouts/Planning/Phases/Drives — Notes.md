### Drives — Notes

The List Types Drive's rewrite, Phase 0's frame and its ten groups, with the baseline every later checkpoint compares against. The work was built on `lc-drive2`, one commit per group, group N landing at Phase N, each touching `.claude/scripts/` alone, and the patches beside this file hold it.

| Commit | Lands | Files |
|---|---|---|
| `6accd52b6` | Phase 0's frame, `MATRIX.md`, the README's paragraph | `List Types Drive/live-drive.mjs`, `List Types Drive/MATRIX.md`, `README.md` |
| `673e7b64d` | Group 1 and its case table | `List Types Drive/live-drive.mjs`, `List Types Drive/MATRIX.md` |
| `923edc46b` | Group 2, and `Delete` in `pressKey`'s table | The same, `drive-harness.mjs` |
| `f84fedc32` | Group 3, the stale drop, and the two grip finders folded | `List Types Drive/live-drive.mjs`, `List Types Drive/MATRIX.md` |
| `f7c4e8210` | Group 4 | The same |
| `e11ff3752` | Group 5 | The same |
| `4e9962dbd` | Group 6, and group 4's one-line paste pinned to its edge rule | The same |
| `3d96a45ea` | Group 7, with `listPath` and `gripPath` narrowed | The same |
| `611fb8d68` | Group 8, and `ALT` beside `SHIFT` and `META` | The same, `drive-harness.mjs` |
| `c4b0d4449` | Group 9, and `pressKey`'s `commands` | The same, `drive-harness.mjs` |
| `29b3a2feb` | Group 10, with group 6's key table hoisted to `typeKeys`, and the Text Property, Metadata, Path Links, and Alias drives to the log | The same, each drive's `live-drive.mjs`, `README.md` |

The List Types Drive's `live-drive.mjs` went from 380 lines to 223 at group 1 and reads 1512 at group 10. `drive-harness.mjs` gained `Delete` and `c` in `VK`, the `ALT` constant, and `pressKey`'s `commands`, the editing commands a chord's menu row would run.

#### The Frame

##### What Left

- **The Gate:** `phasedItem`, `POMMORA_LGM_LANDED`, and the `AWAIT` and `AHEAD` marks. The helper stays in the harness for the Path Links Drive. Items now call the harness's `item(group, decision, name, pass, detail)`, and `tally` takes its default marks, so a failing item fails the run.
- **The Five Groups:** all of them, whole, with the plan's old decision ids. Anything still wanted returns in the group that owns it.
- **Helpers Only Those Groups Used:** `bolded`, `pastEnd`, and `pop`'s `shown` and `chosen`. They served the word and Bold items. `shown` read a range that the Reconciliation List says Phase 9 changes, so group 9 writes what it needs.
- **The `V` Alias:** `PAGE_VIEW` is called by name, and `PAGE_TEXT` derives from it (`${PAGE_VIEW}.contentDOM`) in place of restating its query.

##### What Stayed

- **Page:** `TITLE`, `VIEW_ID`, `EXAMPLE`, `MIXED`, `docOf`, `setBody`, `body`, `select`, `caretAt`, `selection`, `setting`.
- **Reads and Presses:** `lineOf`, `glyphOf`, `PAGE_TEXT`, `textAt`, `flat`, `checked`, `typeRows`, `listsRows`, `hitAt`, `seen`, `pop`, `glyphPick`, `wordPick`, `gripPick`. `hitAt` and `seen` now serve a failed item's detail, since nothing prints `AWAIT`.
- **The Run:** the view seeding, `createPage`, `openCollection`, `openPage`, the `item(0, …)` line that catches a crash, `restore`, and `tally`.

Every helper the frame kept has a caller by group 5.

##### What Changed or Arrived

- **`S`:** one selector table at the file's head, which every expression reads. It grows a line when a group needs one, `[data-grabbing]` with group 3 for instance. `.md-list-item > [data-src]` became `S.glyph`, since a resting glyph carries that class too.
- **`TYPES`:** each type's name, source, and drawn lines, replacing the five-name array. `typeRows` reads `.name`.
- **`table(...cells)`:** replaces `CELL`, taking a row per cell. `inCell` writes a source's newlines as `<br>`.
- **`enterCell`:** the click and wait the old groups inlined.
- **`GROUPS`:** one table at the foot, `{ 1: ['One Scan Per Surface', group1] }`. The usage line and the dispatch both derive from it, so landing a group is the function and one entry. With no entry at Phase 0 every run exits 2 at the usage line.
- **Arrived with Group 1:** `drawnIn`, `leaveCell`, `CELL_VIEW`, and `setBody`'s `tail` argument, which a page's citation needs, since the citation section must end the document.

##### Comments

`hitAt`'s comment was rewritten for a failed item's detail. Added: one on `TYPES`, one on `drawnIn`, one on the grip's submenu lookup, one on `literal`. Drive comments don't count toward the production cap.

#### Group 1

27 items, all at B-11. A run prints each as `[g1 B-11] <name>`, and `MATRIX.md` holds the case table.

| Items | Proves | At `68aa474bc` | At `b7f2f17a5` |
|---|---|---|---|
| A page draws each type's glyphs and text (5) | Glyphs read on a page | Pass | Pass |
| A resting cell draws each type's glyphs and text (5) | Glyphs read at rest | Pass | Pass |
| A focused cell draws each type's glyphs and text (5) | Glyphs read in a live cell, with the caret on the line | Pass | Pass |
| A resting cell draws the list between ` ``` ` lines, and between `$$` lines (2) | Those lines hold nothing | Pass | Pass |
| A focused cell draws the same (2) | The same | Pass | Pass |
| The list between ` ``` ` lines takes a grip, and its Numbered numbers the list alone | Fence-shaped lines are lines | Pass | **Fail:** no grip |
| The list between `$$` lines takes a grip, and its Numbered numbers the list alone | `$$` lines are lines | Pass | **Fail:** no grip |
| A `(` typed between ` ``` ` lines pairs | Fence-shaped lines hold no code | Pass | **Fail:** `pp (` |
| `*it*` between ` ``` ` lines reads italic, at rest and focused | The same | Pass | **Fail:** neither surface paints it |
| `$$` lines read as text, at rest and focused | Math isn't read | Pass | **Fail:** marked, and a resting cell loses its `$$` |
| A cell's `[^1]: note` line binds nothing, at rest and focused | Citations aren't read | Pass | Pass, see below |
| On a page the same lines read as their blocks | A page keeps its blocks, and `.md-latex` is a live selector | Pass | Pass |
| On a page a `[^1]: note` tail binds its marker | The selectors the cell's negative reads are live | Pass | Pass |

**Results:** 27/27 at `68aa474bc`, twice, and 27/27 at both later saved trees, `f0d5f60c5` and `a37d2d7b2`. 22/27 at `b7f2f17a5`, the five reds above, which shows those items read Phase 1's change. No app defect turned up, and no item needed fixing after the first green run.

**Time:** the group itself takes 21 seconds, measured from its first to its last screenshot. A whole run takes 35 to 44 seconds, 18 of them the build.

**Screenshots Read:** the page, the resting table, a focused checklist cell, the list between ` ``` ` lines, and the page's blocks all show what the items assert. The ` ``` ` lines draw as text in a cell, and on a page they draw as a code block.

##### What Keeps It True at Every Later Head

- It seeds only the five canonical spellings, so no `+`, no `- []`, and no box after an ordinal.
- It reads a glyph by its text or its `.checkbox`, never by `md-list-number` or `md-list-arrow`, which Phase 7 may rename.
- It finds the grip's submenu by the `Numbered` row it holds, leaving the label to group 7.
- It reads no checked rows and no reach, and its numbered seeds count correctly, so no recount touches them.

#### Group 2

83 items at C-1 to C-7 and F-1, with the case table in `MATRIX.md`. Each key and typed row is one stroke, asserted against the text and then ⌘Z back to the seed through the frame's `stroke`.

**Results:** 83/83 at Phase 2's finished `e238998dd`, and at `f0d5f60c5`, `a37d2d7b2`, and `ee21a3d4f`. 38/83 at `68aa474bc`, which is Phase 2's work: the keys, the picks, the shorthands, the rows, and the diff signs all go red, while the no-glyph, plain-Enter, and `/` items hold as floors.

**Time:** about 135 seconds of a 160-second run.

**Corrected in the Drive:** Enter on an empty item continues, as `continueListOnEnter` says it always does on a page. Enter in `js` indents as JavaScript continues an expression, so that one expected value carries two spaces, with its reason in a comment.

#### Group 3

82 items at B-5, B-6, B-9, B-10, D-2, D-4, and F-1. Every drag is a real press carried to a line's edge by `dragTo`. Rails read as boxes, with a rail asserted to run unbroken from under its parent into the last child, on the parent glyph's axis on a page.

**Results:** 82/82 at Phase 3's head `6402c7f28` and at every head after it. At `3469266d1`, 77/82, the five reds being the items under *The Selection and the Block* below. At `a37d2d7b2` the two stale-drop items go red, since that tree lacks the compare. At `f0d5f60c5`, 22 of the 75 items that don't read a stale drop or a selection go red: drops across blanks, the run past Z, re-picks, the grip's reach, the block's edges, and the rails at a blank and a flush line.

**Time:** about 120 seconds of a 146-second run.

**Corrected in the Drive:**

- A list's first item dragged out leaves the rest their numbers, by the same first-item rule *§Settled* gives a deletion. The item now says so, and a second item drags a middle item to show the recount.
- Backspace clearing a marker makes a blank line, which splits the list with the lower numbers kept.
- A rail ends at its last child's midline in an elbow, so a rail is asserted to reach into that line rather than to its foot.
- The grip's drag lands at a line's top edge, as a glyph's does.

**Observed:** a code block an item carries draws flush with the page, so its rail crosses the block's box, with a 2-pixel jog where the widget's axis changes. No decision names it.

**The Stale Drop:** the drive is the compare's only proof, since jsdom draws no slots. While a press is held, a dispatch on the page's view appends to the tail, standing in for another pane's mirrored body, and the release lands nothing, for a glyph's drag and a grip's. At `a37d2d7b2` both drops land: `- b`, `- c`, `- a`, and `1. b`, `1. a`. The dispatch is the nearest path the harness reaches, and it changes the same `view.state.doc` that `mirrorBody` would.

**The Selection and the Block:** five items take Wave One's folds through real gestures, the double-click, the drop, and the keys that a unit pin dispatches past.

| Item | At the Head | At `3469266d1` |
|---|---|---|
| Backspace on the blank below a block an item carries (A1) | `2. b`, `3. c` | `1. b`, `2. c` |
| `x` typed over `a` through `2. ` (A7) | `1. xb`, `2. c` | `1. xb`, `3. c` |
| Enter after a glyph dragged past a selected word (A6) | a caret at 2, and `- ` above `- beta word` | the range `[26, 2]`, and Enter writes nothing |
| Backspace after the same drag (A6, the High finding) | a caret at 2, and `beta word` | the range `[26, 2]`, and `- `, `a`, `- delta`, the lines between deleted |
| A triple-click and Backspace on `- b` above a carried block (A10) | the block keeps its lead | `` ```js `` loses its tab |

A real double-click and a real press on the glyph reach the same inverted range the pin dispatches, so the press doesn't collapse the selection first.

**Pruned:** a cut at rest (group 9), and rails through wraps and the cap, each with its reason in `MATRIX.md`.

#### Group 4

15 items at F-2, each through the app's `paste` event, asserting one ⌘Z back to the seed. A focused cell's undo reads after the cell leaves, since its document doesn't show the undo while it's live.

**Results:** 15/15 from `25f901832` on, where the item below takes its ruled form. Before that ruling the group read 14/15 at `cb1619ba7`, `a37d2d7b2`, and `ee21a3d4f`. At `f0d5f60c5`, 9 of 15 go red, the paste recount itself.

**Time:** about 30 seconds of a 58-second run.

##### A One-Line Paste

`1. x\n` pasted at the start of `6. b` in `5. a`, `6. b` lands `5. a`, `1. x6. b`. That's the rule at `.claude/Features/MarkdownPM.md:32`, "A paste lands without the whitespace at its own edges", which `pasteLink.test.tsx`'s *the edges a paste leaves out* pins, so it's by design. The item pins it, and two or more lines reach CodeMirror's paste whole, so those items hold the recount.

#### Group 5

44 items at B-1 to B-4, B-9, and F-1, on a page, a resting cell, and a focused cell. This is Phase 5's first live run.

**Results:** 44/44 at Phase 5's finished `e332c47fb`, and at `ee21a3d4f`. At `a37d2d7b2`, 16 of the first 25 go red before the run stops on `- [] p`, which draws no glyph there to press.

**Time:** about 70 seconds of a 97-second run.

**Live Check Phase 5 Asked For:** a caret on a `+` marker reveals it and a caret on its text keeps the glyph, exactly as a dash does. The arrow keys seat `3, 4, 5` going right and `3, 2, 1` coming back on both spellings.

#### Group 6

147 items at G-9: every key for every type on a page and in a focused cell, plus the last item's Shift-Enter on each and a cell's Enter with its ⌘Z.

**Results:** 147/147 at `25f901832`. Also 147/147 at `e332c47fb`, before the merge, which is what a refactor should read: the whole group is a floor, and no item can go red against Phase 6's own change. The live cell's keys, which Phase 6 didn't run, hold.

**Time:** about 145 seconds of a 169-second run.

**Corrected in the Drive:** a caret seat by `indexOf` found the first line's marker, so the marker cases seat past `ab\n`. Delete at an item's end was first written to join by visible text, which holds for quotes alone.

**Pruned:** keys off an item in a cell, ⌘Z after every cell key, and each key in a quote or a callout, with their reasons in `MATRIX.md`.

#### Group 7

29 items at B-7, D-3, D-6, and F-1. `listPath` and `gripPath` now name their final labels, so `pop`'s function path, `gripTypes`, and the place-based row lookup left. Those groups replay against their own phases' patches, so this narrowing lands at Phase 7 alone.

**Results:** 29/29 at `ef34ef64f`, and in the whole run at `c0da89b74`. 11/29 at `25f901832`, the eighteen reds being every name, the grip's Type ▸, and the callout head.

**Time:** about 50 seconds of a 74-second run.

**The Live Check Phase 7 Asked For:** a caret past a head's `- ` stands within 3 pixels of the `f`, typing lands there, and a press on the head's text seats inside it. The screenshot agrees.

**Corrected in the Drive:** `leaveCell` takes a second Escape, since the first clears a selection a right-click left behind.

#### Group 8

25 items at E-5 and E-6, driven by real double-clicks and Option-arrows.

**Results:** 25/25 at `c0da89b74`. 18/25 at `ef34ef64f`, the seven reds being `a'_b`, the accepted departures, and the JS fence's `$`. The eighteen that hold there are what the old atoms and the new rule agree on.

**Time:** about 20 seconds of a 42-second run.

#### Group 9

70 items at D-1, D-2, D-5, E-1 to E-4, E-7, F-2, and B-10, with what the old groups held for menus, the tile, and the setting's row returning here.

**Results:** 70/70 at `18b7ea4cc`. 69/70 at `762b20b1f` and `148e79566`, the red being the glance's focus, described under *M2, Read by ⌘C*. 68/70 at `3469266d1`, the reds being both ⌘C items. At `c0da89b74`, 32 of the 67 items that don't read M2 go red: every E-2 typing item, the highlight, the short menu, all ten marker presses, the left press, D-5's group, D-2's glyph, and Italic. What holds there is E-1's rows and picks, the highlight clearing, and what didn't change.

**Time:** about 85 seconds of a 107-second run.

**`shown`, Afresh:** the seat isn't the document's selection any more, so `seatRead` reads the registered `mdpm-seat` ranges as text. It runs between `popNative` and `pickNative`, since the harness holds the menu up until a row is chosen.

**E-3, Read Both Ways:** `getComputedStyle(cell, '::highlight(mdpm-seat)').backgroundColor` equals a probe element painted `var(--text-selection)`, and `getSelection()` reads empty while it's up. The screenshots show `apple` on that tint with the setting on and off, and nothing once the menu closes.

**Surfaces Reached for E-4:** an unentered tile, its read-only table cell, the page reader through a tab's Preview, and a glance. The info pane has no caller, so nothing draws it, and a window tab and an embed mount the tile's editor, each pruned with its reason in `MATRIX.md`.

**Corrected in the Drive:**

- A Bold at rest moves the page's caret by the four characters it wrote, since the caret maps through the edit, so the item reads the caret at the document's end rather than at its old offset.
- `_it_`'s outer edge is a zero-width hidden mark at rest, so a press there read a subpixel coin toss. The caret now reveals the `_` and the press lands on it.

**M2, Read by ⌘C:** `pressKey` carries `copy` in the key event's `commands`, standing in for the Edit menu's row, and the item reads the system clipboard. Select All from a read-only table's cell in an unentered tile, then ⌘C, copies the tile's whole document; at `3469266d1` the clipboard stays `held`. The same in a glance copies the glance's document; at `3469266d1` it copies the page's line, `Tail.`. `copiedAll` focuses the page first, since a right press on a read-only editor's text takes the focus by itself, which would hand that editor the key without M2.

The glance's close is the third item. `view.focus()` moves the focus into the glance, against the pane's contract as `lc-w1` words it, the first Escape then clears the glance's selection, and the second closes the pane. On `lc-w1` the focus falls to `<body>` and typing lands nowhere, since `GlancePane.tsx`'s `onPointerDownCapture` records `focusBefore` for a left press alone. A left press in any earlier glance leaves a value there, and then the close restores the page, which is how a probe confirmed the cause. A right press on a glance's text reaches the same state with no M2 at all, at Phase 8's head `7ea777ebb` and at `3469266d1`, so the cell's route is what M2 added. `lc-w3` records the focus for every button, and the item reads green at `18b7ea4cc`.

**Clipboard:** the group reads the system clipboard first and writes it back in a `finally`. An empty paste is staged by emptying the clipboard between the press and the choice, since `canPaste` reads it when the menu opens.

#### Group 10

97 items at G-1, G-2, G-5, and G-10, 97/97 at `148e79566` and `18b7ea4cc`, in 69 seconds with the build. The pane runs group 6's whole key table through `typeKeys`, so a key that changes changes in one place.

**Who Holds What:** a Text value owns its resting draw and its disk, so those live in the Text Property Drive. This group holds what a list does on the pane, plus the one-line field staying plain.

| Decision | Holder |
|---|---|
| G-1, G-2, G-10's keys, glyph, grip, drags, rails, Preserve, and `/` | List Types group 10 |
| G-5, the field staying plain | List Types group 10 |
| G-10's Escape and ×, and Enter breaking a plain value | Text Property group 4 |
| G-3, G-7, G-8, G-12, at rest on a table, cards, and the panel | Text Property group 1 |
| G-4, G-11, nothing flagged on disk | Text Property group 4 |
| G-13, a YAML list's shape and its first edit | Text Property groups 1 and 4 |

**Corrected in the Drive:** a caret at the first line's start reveals its marker, so the type reads seat at the end. A view's columns take `views:save`'s update argument, not its view.

#### The Text Property Drive

127/127 at `148e79566` and `18b7ea4cc` across all four groups, in 184 seconds with the build. It has no gate.

**Flipped, by Phase 10's Table:** `inline` reads a list as its lines; `cellText` reads `.cell-text`; `oneLine` keeps its height check; `Drive List`, `Drive Prose`, and `Drive Items` read their first lines and marks; the hover scroll measures a range plus the mark's width; the pane's list half, Tab's name, its menu, Escape over a selection, Enter's break, and the reopened lines all read the log.

**Arrived:** `Drive Numbered`, `Drive Checked`, and `Drive Open`, for a written number, a plain value's mark, a checked box muted, a box taking no press, and an open box; a list on both card formats and the panel; a click on the panel's list opening the field on its dash; a YAML list's pane and untouched close; its first edit landing a string; and no key beside a list value.

**A `\r\n` Value (A4):** a seed can carry one, since YAML's double quotes keep `\r\n` through a parse where a block scalar folds it away, so `Drive Returns` is written as `"- tea\r\n- oats"` by `writeFrontLine`. Its cell draws one glyph and `tea`, marked, and its pane opens as two lines and closes untouched with disk as it was. At `3469266d1` the cell draws `- tea` with no glyph and the close rewrites the key as a `|-` block. The resting text holds the `\r` behind `tea`, which draws as nothing, so the item trims it.

**Corrected in the Drive:** a checked item mutes only under Mute Checked Items, so the item turns that setting on.

**Read From the Screenshots:** `☑ bought…`, `• milk…`, `3. first`, `☐ open`, and `see Drive Target…` in the table and on Standard cards. A Standard card holding a box or a list draws its row a few pixels taller than one holding plain text, which no decision names.

#### The Drives That Followed

- **Metadata Drive:** `ROWS_ON_SCREEN` reads `.cell-text`, and group 2's `[a, b]` Text case reads `•a` and takes `- a\n- b` as its unchanged write, keeping `[a, b]` on disk (G-13). Neither Phase 10's table nor the Reconciliation List names that second change.
- **Path Links Drive:** each case in the resting loop goes on line one in turn, as the `c02` panel read does, and the value goes back whole before the pane opens. Group 1 reads 224/224, with the run's two group 0 items beside it.
- **Alias Drive:** a second Enter in the pane breaks the line and Escape closes it (G-10), which no list named. It takes group 3 from 121 to 122 items.

#### The Whole Drive

Groups 1 to 10 at `18b7ea4cc`: 619/619 in 791 seconds with the build. The drive reads no scope string, so Phase 6's rename to `'lists'` and `'inline'` touched nothing.

#### Baseline

Each ran once at `b7f2f17a5`, from the script worktree, with the target built there. Times are wall clock including the build, and all held.

| Drive | Command | Result | Time |
|---|---|---|---|
| Text Property Drive | `node live-drive.mjs 4` (9353) | 37/37 | 66 s |
| Alias Drive | `node live-drive.mjs 3` (9373) | 121/121 | 111 s |
| Path Links Drive | `POMMORA_PL_LANDED=9 node live-drive.mjs 9` (9383) | 498/498, 496 in group 9 and 2 in group 0 | 212 s |
| Editor Parity | `./twice.sh before before2 <target>` (9444) | 0 lines and 0 of 9 behaviors differ, 4 pages | 101 s for both runs |

Editor Parity's one picture difference is 29 pixels on `Page-A-1.png`, within its 200-pixel allowance. `worktree.sh` wasn't used, since the target worktree was already built at the commit and `twice.sh` takes it as its app argument.

#### The Whole Set at `18b7ea4cc`

One at a time, under the drive lock, with the drives at `lc-drive2`'s head and the build in each time but Parity's.

| Drive | Run | Result | Time |
|---|---|---|---|
| List Types | Groups 1 to 10 | 619/619 | 791 s |
| Text Property | Groups 1 to 4 | 127/127 | 184 s |
| Alias | Group 3 | 122/122 | 112 s |
| Path Links | `POMMORA_PL_LANDED=9`, groups 1 and 9 | 722/722 | 293 s |
| Editor Parity | `base` at `b7f2f17a5` against the head | 1 of 112 lines, 0 of 9 behaviors differ | 45 s |
| Metadata | Groups 1 to 9 | 261/261 | 224 s |
| Properties | Groups 1 to 19 | 209/209 | 1,079 s |
| Option Picker | Whole | 58/58 | 94 s |
| Archive | Every group | 159/159 | 372 s |

**Editor Parity's One Line:** `+ plus bullet` draws a `•`, which is B-1, and its 1,353 pixels on `Page-A-0.png` are that line. Its latency reads 1.6 and 24.7 ms against 1.7 and 27.2.

#### Every Run

One row of *§When Drives Run* at a time, each drive from its folder with the drives at that phase's group commit, the target worktree moved to that head and built by the drive, under the drive lock, with `~/Test` hashing `e5a32a5d30d6a11310cd559ee2b1b84b261c3265` before and after every run. Phases 1 to 9 ran at `lc-w1`'s heads, and Phase 10's row at `lc-w1`'s `148e79566` and `lc-w3`'s `18b7ea4cc`. Path Links read group 9 alone at `148e79566` and groups 1 and 9 at `18b7ea4cc`, each as the schedule then named it. Parity's `base` ran once, first, and every compare reads it. No run needed a rerun. The closing replay read List Types 1 to 9 at 522/522 at `lc-w3`'s Phase 9 head, `f6a937fe5`.

| Phase Head | Drive | Result | Time |
|---|---|---|---|
| `b7f2f17a5` | Editor Parity `base` | 4 pages, 9 behaviors recorded | 62 s |
| Phase 1 `0147e6f02` | List Types 1 | 27/27 | 35 s |
| Phase 1 `0147e6f02` | Text Property 4 | 37/37 | 78 s |
| Phase 1 `0147e6f02` | Editor Parity | 0 of 112 lines, 0 of 9 behaviors differ | 48 s |
| Phase 2 `110f75059` | List Types 1 to 2 | 110/110 | 169 s |
| Phase 2 `110f75059` | Alias 3 | 121/121 | 124 s |
| Phase 3 `6402c7f28` | List Types 1 to 3 | 192/192 | 306 s |
| Phase 3 `6402c7f28` | Text Property 4 | 37/37 | 69 s |
| Phase 3 `6402c7f28` | Path Links 9 | 498/498 | 218 s |
| Phase 4 `d0e44d9b7` | List Types 1 to 4 | 207/207 | 334 s |
| Phase 5 `d94f5649d` | List Types 1 to 5 | 251/251 | 395 s |
| Phase 5 `d94f5649d` | Editor Parity | 1 of 112 lines, 0 of 9 behaviors differ | 45 s |
| Phase 6 `27f15781c` | List Types 1 to 6 | 398/398 | 544 s |
| Phase 6 `27f15781c` | Text Property 4 | 37/37 | 66 s |
| Phase 6 `27f15781c` | Alias 3 | 121/121 | 120 s |
| Phase 7 `7618b2c8c` | List Types 1 to 7 | 427/427 | 602 s |
| Phase 7 `7618b2c8c` | Path Links 9 | 498/498 | 204 s |
| Phase 8 `7ea777ebb` | List Types 1 to 8 | 452/452 | 645 s |
| Phase 8 `7ea777ebb` | Editor Parity | 1 of 112 lines, 0 of 9 behaviors differ | 46 s |
| Phase 9 `762b20b1f` | List Types 1 to 9 | 521/522 | 733 s |
| Phase 9 `762b20b1f` | Text Property 4 | 37/37 | 66 s |
| Phase 9 `762b20b1f` | Alias 3 | 121/121 | 112 s |
| Phase 9 `762b20b1f` | Path Links 9 | 498/498 | 203 s |
| Phase 10 `148e79566` | List Types 1 to 10 | 618/619 | 791 s |
| Phase 10 `148e79566` | Text Property 1 to 4 | 127/127 | 184 s |
| Phase 10 `148e79566` | Alias 3 | 122/122 | 112 s |
| Phase 10 `148e79566` | Path Links 9 | 498/498 | 203 s |
| Phase 10 `148e79566` | Metadata | 261/261 | 225 s |
| Phase 10 `148e79566` | Properties | 209/209 | 1,078 s |
| Phase 10 `148e79566` | Option Picker | 58/58 | 95 s |
| Phase 10 `148e79566` | Archive | 159/159 | 371 s |
| Phase 10 `148e79566` | Editor Parity | 1 of 112 lines, 0 of 9 behaviors differ | 45 s |
| Phase 10 `18b7ea4cc` | List Types 1 to 10 | 619/619 | 791 s |
| Phase 10 `18b7ea4cc` | Text Property 1 to 4 | 127/127 | 184 s |
| Phase 10 `18b7ea4cc` | Alias 3 | 122/122 | 112 s |
| Phase 10 `18b7ea4cc` | Path Links 1 and 9 | 722/722 | 293 s |
| Phase 10 `18b7ea4cc` | Metadata | 261/261 | 224 s |
| Phase 10 `18b7ea4cc` | Properties | 209/209 | 1,079 s |
| Phase 10 `18b7ea4cc` | Option Picker | 58/58 | 94 s |
| Phase 10 `18b7ea4cc` | Archive | 159/159 | 372 s |
| Phase 10 `18b7ea4cc` | Editor Parity | 1 of 112 lines, 0 of 9 behaviors differ | 45 s |

Both reds, 521/522 and 618/619, are the glance's focus under group 9's *M2, Read by ⌘C*, an app defect `lc-w3` closed.

#### What an Executor Must Know

- **The Run:** `POMMORA_DRIVE_REPO=<target> node live-drive.mjs <group…>` from the drive's folder, under the drive lock. Debug port 9413, with the main process's inspector on 9414. `POMMORA_DRIVE_SHOTS` puts the screenshots somewhere findable.
- **The Lock:** it's load-bearing, since `launch` sweeps every earlier drive's Electron. A foreground `sleep` is blocked in the agent shell, so wrap the wait and the run in one background script.
- **Occlusion and Focus:** neither troubled a run. The harness's Chromium flags and focus emulation keep a covered window painting, and shots come back at 2560 by 1664.
- **`~/Test`:** the drive needs only `Collection A/Set Alpha`, and it makes its own view and `LT Lists` page. By `find ~/Test -type f -not -path '*/.DS_Store' -print0 | sort -z | xargs -0 shasum | shasum`, the hash read `e5a32a5d30d6a11310cd559ee2b1b84b261c3265` before and after every held run.
- **Timing:** `setBody` costs 700 ms and waits for no state. `leaveCell` waits for the cell to rest. A menu is read and chosen through the main process, so no native menu appears.
- **Pastes:** a one-line paste goes through `pasteEdit`, and two or more lines reach CodeMirror's own paste, so a list case needs two lines to reach the recount with its newlines intact.
- **Labels:** groups 2 to 6's patches read Lists ▸ by a row's place and the grip's submenu by the rows it holds, and group 7's patch narrows both to their final labels, so the patches replay in order, each at its own phase.
- **Typing:** `typeText` is one `Input.insertText`, and a transform reads one inserted character, so a pair needs its character typed alone. `autoPair` needs a non-word character before `(` and an edge after it, hence `pp ()` from a space and then `(`.
- **Cell Reads:** a resting cell holding no list is one block of text, not one element per line, so `innerText` is what agrees across both surfaces.
- **Editor Parity's Output:** `run/` and `results/` land in the drive's own `editor-parity` folder, ignored, so a checkout between group commits leaves `results/base` in place. They come out when the schedule ends.
- **Editor Parity's Target:** `launch.sh` builds nothing, so `base` needs `npm run build` at `b7f2f17a5` first, and a head's run follows the row's List Types run, which built it.
- **A Drive Worktree With No Install:** `drive-harness.mjs` imports `ulidx` and `yaml`, and a worktree's scripts resolve those upward from their own path, so a worktree with no `node_modules` needs a link to one.
- **Reading a Glance:** a right press on a glance's text moves the focus into it and seats a word, so its first Escape clears that selection and the second closes the pane.
- **⌘C:** `pressKey(cdp, 'c', META, ['copy'])`, since a key event alone runs no Edit menu row.

#### Concerns

- **The `[^1]: note` Item Can't Go Red:** it passes at `b7f2f17a5` too. A cell's binding at the base lived in the scan and never drew: a live probe at `b7f2f17a5` drew `[^1] zz` over a note line as plain lines at rest and focused, tight and with a blank line between, `citationOrder` and the Backspace cascade are page-only, and Delete at the cell's marker, the one cascade a cell reaches, removes one character at both `b7f2f17a5` and `68aa474bc`. The Investigation's row 36 is therefore true of the scan with no change a user would see, so the morning report shouldn't count it as one, and 7-T7's unit pin on `scanDoc(text, 'cell').citations` is what can hold it. The item stays as the floor the brief asks for, with the page's item proving its selectors are live.
- **Fifteen Glyph Items Pass at the Base:** by design, since B-11 changes no glyph. They guard Phase 1's churn and every later phase.
- **Later Heads:** every drive ran whole at `18b7ea4cc`, every phase in.
- **The Matrix's Scope:** the Reconciled Scout's matrix crosses every type with a quote, a callout, and a tile. Group 1 prunes those with its reason in `MATRIX.md`, verified against `editorBase`'s three call sites. Group 3 drags in a quote and a callout, and tiles arrive with group 7's or group 9's brief.
- **F-2's Own Pins Bypass the Paste Path:** `listRenumber.test.ts` dispatches `input.paste` with `1. x\n` directly, so it never meets `pasteLink`'s edge rule. The test's input can't arrive that way in the app.
- **Delete at an Item's End Joins Raw Everywhere:** `- ab- cd` on a page and in a cell, for every type, since a list marker isn't a `prefix` intent. *Scouts/8*'s 8-T10 and *§Behavior Changes* row 33 read that as what sets a Markdown block apart from a page, and it isn't. No decision names the join, so group 6 pins it as it stands, and the morning report shouldn't list row 33 as a difference.
- **A Reseed Group 7 No Longer Needs:** group 7 reseeds before entering a cell because at its tree a dismissed resting menu left the word selected and a click only cleared it. Phase 9 ended that, and group 9 pins one click entering. The reseed still reads correctly at both trees, so it stays.
- **A Row *§Behavior Changes* Lacks:** a left press left of a bullet or box now seats at the content, which Phase 9's notes flag and group 9 pins.
