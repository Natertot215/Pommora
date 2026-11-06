### List Consolidation — Morning Report

**DATE:** 11-06-2026
**STATUS:** Ratified 11-06-2026 at `0cd4373ff`

The plan is ratified and committed, and no production code landed. It should take MarkdownPM's list handling down by **286 production lines** (+1465 / -1751), with the comment count at 3,508 against the cap of 3,511. Three review waves folded before ratification, and the final reader's verdict was: "A neutral before-and-after reader prefers the after."

The most useful thing to read below is *§What You'd Probably Overrule*, then the prompt at the end, which starts execution.

#### Overview

Twelve phases should leave MarkdownPM's list handling smaller, stated once, and easier to change. Phase 0 lands the rewritten drive's frame and records the baseline. Phase 1 makes each surface's scan hold what that surface reads, so a list reader asks the scan rather than taking a scope. Phase 2 opens Markdown code blocks to every list behavior and shuts every other block, through a scan whose markers hold only what a line truly has. Phase 3 ends a list at a blank line for every reader and counts a list rather than a run. Phase 4 lets a paste recount. Phase 5 gives a marker one classification, Phase 6 names the scope for what it reads and writes the list keys once, and Phase 7 gives each type one definition and one name. Phase 8 rides CodeMirror's own word characters. Phase 9 shrinks the right-click route and gives every read-only surface one short menu. Phase 10 lets a Text property's pane take lists on the reworked system, and Phase 11 makes the documents read true.

The order is what makes each step land once. The scan goes first, since every later step then writes its signatures once, and masking precedes the walks, since numbering reads a region rather than a reader. The grammar follows numbering because Enter's read of a bullet's character is gone by then, and the arrow folds into its one regex there, so the parser's groups are set once. Production ends 286 lines lighter (+1465 / -1751), with one file added (`Engine/blockMove.ts`), `scope` down from 223 sites to 65, `listModel.ts` from 323 lines to 179, `listRenumber.ts` from 89 to 51, `CellEditor.tsx` from 302 to 199, and the comment count at 3,508 against a cap of 3,511.

#### Process Overview

- [ ] `[Stop: ratified; no code changes before this]`
- [ ] **Phase 0** — Drives and Baseline
  - [ ] Task 0-1 · The List Types Drive's frame
  - [ ] Task 0-2 · The baseline drives
- [ ] **Phase 1** — One Scan Per Surface
  - [ ] Task 1-1 · One scan per surface
  - [ ] Task 1-2 · Drive group 1
  - [ ] Review Checkpoint
- [ ] **Phase 2** — Markdown Code Blocks and Masked Markers
  - [ ] Task 2-1 · Code blocks and masked markers
  - [ ] Task 2-2 · Pins and delimiters
  - [ ] Task 2-3 · Drive group 2
  - [ ] Review Checkpoint
- [ ] **Phase 3** — Blank Lines and Numbering
  - [ ] Task 3-1 · Block move's home
  - [ ] Task 3-2 · The stale drop
  - [ ] Task 3-3 · Blank lines and numbering
  - [ ] Task 3-4 · Drive group 3
  - [ ] Review Checkpoint
  - [ ] Compaction Checkpoint
- [ ] **Phase 4** — Paste
  - [ ] Task 4-1 · Paste
  - [ ] Task 4-2 · Drive group 4
- [ ] **Phase 5** — One Marker Grammar
  - [ ] Task 5-1 · One grammar
  - [ ] Task 5-2 · Drive group 5
  - [ ] Review Checkpoint
- [ ] **Phase 6** — One Set of List Keys, and the Scope's Name
  - [ ] Task 6-1 · The scope's name
  - [ ] Task 6-2 · `listKeys`
  - [ ] Task 6-3 · Drive group 6
  - [ ] Review Checkpoint
  - [ ] Compaction Checkpoint
- [ ] **Phase 7** — One Definition Per Type
  - [ ] Task 7-1 · The record
  - [ ] Task 7-2 · One name
  - [ ] Task 7-3 · The callout head
  - [ ] Task 7-4 · Rails read the scan
  - [ ] Task 7-5 · Drive group 7
  - [ ] Review Checkpoint
- [ ] **Phase 8** — The Word Rule
  - [ ] Task 8-1 · The word rule
  - [ ] Task 8-2 · Drive group 8
  - [ ] Review Checkpoint
- [ ] **Phase 9** — Right-Click
  - [ ] Task 9-1 · Removal that stands alone
  - [ ] Task 9-2 · One range
  - [ ] Task 9-3 · The short menu
  - [ ] Task 9-4 · The resting seat
  - [ ] Task 9-5 · The marker seat
  - [ ] Task 9-6 · Drive group 9
  - [ ] Review Checkpoint
  - [ ] Compaction Checkpoint
- [ ] **Phase 10** — Text Properties
  - [ ] Task 10-1 · The pane
  - [ ] Task 10-2 · At rest
  - [ ] Task 10-3 · YAML lists
  - [ ] Task 10-4 · Drive group 10 and the drives that follow
  - [ ] Review Checkpoint
- [ ] **Phase 11** — Docs and Issues
  - [ ] Task 11-1 · Docs and issues
- [ ] *§Final Verification* over `<BASELINE>..HEAD`
- [ ] `[Stop: the final report, per §Final Verification]`

#### Net Lines

| Phase | Own | Cumulative | Comments |
|---|---|---|---|
| 1 · One Scan Per Surface | -108 | -108 (+687 / -795) | 3,512 |
| 2 · Markdown Code Blocks and Masked Markers | +69 | -39 (+838 / -877) | 3,515 |
| 3 · Blank Lines and Numbering | -87 | -126 (+1000 / -1126) | 3,515 |
| 4 · Paste | +2 | -124 (+1002 / -1126) | 3,515 |
| 5 · One Marker Grammar | -49 | -173 (+1040 / -1213) | 3,511 |
| 6 · One Set of List Keys, and the Scope's Name | -28 | -201 (+1108 / -1309) | 3,510 |
| 7 · One Definition Per Type | -59 | -260 (+1153 / -1413) | 3,509 |
| 8 · The Word Rule | -47 | -307 (+1172 / -1479) | 3,509 |
| 9 · Right-Click | -1 | -308 (+1386 / -1694) | 3,507 |
| 10 · Text Properties | +22 | -286 (+1465 / -1751) | 3,508 |
| 11 · Docs and Issues | ±0 | -286 | 3,508 |

The Investigation estimated about -190. The difference is the two review waves and the built phases coming in lighter than estimated. About 290 of the additions and removals are whitespace, code losing one level of nesting. Everything is measured from real patches: all 35 patches replayed in the plan's order onto a clean `b7f2f17a5`, each matching its commit, and the end tree matched exactly. Typecheck, lint, 9,219 tests, and the build passed there. Every drive read whole and green at the final head: List Types 619/619, Text Property 127/127, Alias 122/122, Path Links 722/722, Metadata 261/261, Properties 209/209, Option Picker 58/58, and Archive 159/159. Editor Parity differs from the baseline by one line, `+ plus bullet` drawing `•`, which is B-1, with all nine behaviors the same.

#### What You'd Probably Overrule

1. **`/task`, `/bullet list`, and `/numbered list` stop finding anything (row 62).** D-6 says one name everywhere, so a person who thinks "task list" gets an empty `/` menu. It's the one real loss in the plan. I followed the decision. A search alias would keep the name single and the search kind, for about 3 lines, if you want it.
2. **A keystroke can correct a number elsewhere in its own list (row 13), and a line added above a list at 5 restarts it at 1 (row 14).** Both follow from counting a whole list, and they're the changes a user would notice most.
3. **A pick over separated paragraphs lands `1.`, `1.`, `1.` (row 15).** That's B-5 read literally: each is its own one-item list.
4. **The setting's caption is false.** `Core/Settings/frames.ts:729` says Preserve leaves other types unchanged, and D-2 makes the grip change every item regardless. I didn't touch your copy, and `ConfigurationPM.md` states the exception. It wants a clause from you.
5. **Right-clicking a connection glyph, an empty label, a code line number, or a citation reference now opens the full menu (row 67),** where it moved the caret and opened nothing. I drove it on both trees: every row works, so bringing back the dead click looked worse. No decision named it.
6. **Dismissing a right-click on a read-only cell leaves nothing for ⌘C (row 68),** where Chromium's selected word used to stay selected. It follows E-3's "leaves no selection behind", and it's a small loss for a read-only table.
7. **Typing over a triple-clicked line above a quote lands `Z> quote`,** with the `> ` now literal, where it landed `Zquote`. It's a raw join either way, and the same fix stopped Bold, Heading, and picks from writing into the next line, so I kept it.
8. **A task's AFTER points at its patch rather than inlining code.** Plan-Creation asks for an AFTER as close to the result as possible, and the patch is the exact result, so Wave Two cut ten code blocks that were second copies. The plan went from 1,176 lines to 926. If you read AFTER sections as prose, you'd want some back.
9. **Two tables hold a list type, against a literal reading of B-7.** `LIST_TYPES` holds its marker and rail in the engine, and `LIST_KINDS` its wording and icon in Actions, since menu copy doesn't belong in the grammar the host embeds. The one-table version was weighed and declined.
10. **I-073's number was reused.** It closes, and the new issue for Option+Up, Option+Down, and dragged text takes the number, since the new issue is what's left of it. A fresh number is one line if you'd rather.

#### Contradictions With the Log

I followed each decision where I could.

- **E-4's info pane can't be proven.** E-4 names it, and nothing in the app mounts it, so its menu rides `MarkdownEditor`'s shell and stands unproven until something does. A window tab and an embed mount the tile's editor, so they're pruned in `MATRIX.md` with that reason.
- **M2 against `GlancePane.tsx`'s own contract.** Select All has to focus the surface for ⌘C to work, and a glance promised never to take focus. The comment now says a row can ask for it, and a right press records where focus was, so closing the glance hands it back.
- **Row 33 and row 36 were wrong in the Investigation.** Delete at an item's end joins raw on every surface, so it isn't a code-block difference. A cell's `[^1]: note` line never drew a binding, so nothing a user sees changes. Both rows now hold real changes instead.
- **F-1's depth-one callout.** `> > - foo` to a callout keeps its second marker, so F-1's fix holds at depth one only (row 64). No dead glyph results.
- **The Investigation's *§Stands* list holds as written:** B-3 departing from GFM, `codeHighlight` coloring `1. [ ] a`, B-5 departing from other Markdown readers, and one mark serving clipped and continued.

#### Calls I Took

**Order and Shape:**

- **The Investigation's phase numbers stand, plus Phase 0.** The key merge stays at Phase 6: the end tree is identical either way, a cell's scan holds no fences after Phase 1, and Phase 2 changes shared transforms rather than either keymap. Scout 6's concern was churn rather than correctness.
- **The arrow folds into Phase 5,** so the parser's groups are set once. Docs land once, in Phase 11. The neutral gate runs at `fable-high`, as MetadataV3's did.
- **`§Adherence` left the plan,** since nothing acts on it and two of its bullets had gone false.
- **Group 10 and the Text Property Drive split the work.** Group 10 holds what a list does on the pane. The Text Property Drive holds a value's rest, disk, YAML shape, Escape, and ×.

**In the Code:**

- `Prec.high(contractions)`, since `markdown()` mounts first and `charCategorizer` reads the first answer.
- A paste's edge rule stays as `MarkdownPM.md` states it, so `1. x\n` is a one-line paste that joins as text and recounts nothing.
- Blockquote and Callout refuse a lone delimiter line, and a whole-block selection still quotes. `->  removed`'s double space is accepted.
- `editorMenu` became a plain extension. `resting` flattened to a nullable `selection`, and `RESTING_EDITS` became `SURFACE_EDITS` with `restingRows` and `shortRows`.
- `contextmenu`'s bubble stops at `MarkdownEditor`'s shell, since a glance sits under the same layer as the info pane.
- `.cell-text-line` folded into `.cell-text`. Phase 10's first two commits folded so the pane never gets worse between them.
- Rails read the scan, the optional step, for -15. They cost a list-free document 0.5 to 1.1 ms a keystroke until `ridesList` was gated on a list being open, which brought it level with the baseline.
- A pane's Backspace on an empty first line takes the break from Phase 6 rather than Phase 10.
- `::highlight()` paints in a resting cell, so no fallback was built.

**From the Reviews:**

- **Bugs also wrong at the baseline got fixed rather than noted:** a drag past a selection inverting it (High: Backspace took 24 characters after 4 were selected), typing over a selection across items not recounting, `\r\n` values, and ordinals past nine digits. Each fix is a line or two beside code the plan already touches.
- **The forward-head fix is narrower than the report asked,** since Shift+Home mustn't select a hidden prefix.
- **The two Wave Two reviewers disagreed on the rail gate's second term.** I took the removal, which also draws an indented quote's list as a flush quote's.
- `LIST_MARKER_RE` and `LIST_LINE` stay two regexes, since `LIST_LINE` reads `*` and `1)` as a parser does and B-1 keeps those out. They now spell the ordinal the same way.

**From the Drives and Close:**

- **A real defect, fixed:** a glance's close left focus nowhere after a right press, so typing landed nowhere. It predates this work, read red on the Wave One chain, and Task 9-3 fixes it. Row 77 records it.
- **A glance holding a right-clicked word takes two Escapes to close:** the first clears the word. I left that as it stands.
- **BASELINE's Head is the morning report's commit,** written as production at `b7f2f17a5`, as List Glyph Menu's was. The neutral gate reads `<BASELINE>..HEAD`, so that range now holds none of the planning folder beyond the plan's own ticks.

*Investigation · §Calls Taken* holds about a hundred earlier calls from the reconciliations, none of which waits on you. *Plan Reviews* holds every fold and Not Taken.

#### Flagged Behavior Changes

Every row *§Behavior Changes* flags, numbered as it does, with its decision. Rows 61 onward came out of the build and the reviews.

- **9 (B-6):** A paragraph indented directly above a list is its own block, where it opened the list block
- **13 (B-5, B-10):** **A keystroke can correct a number elsewhere in its own list:** `3. p`, a nested `1. a`, `5. q` switched at `a` lands `4. q`. A blank line still protects what's below it
- **14 (B-10):** **A line added above a list at 5 restarts it at 1:** `b` above `5. a` picked Numbered lands `1.`, `2.`. A list at 5 keeps 5 through Enter, Tab, deletion, and a drag
- **15 (B-5):** **A pick over separated paragraphs lands `1.`, `1.`, `1.`,** since each is its own one-item list
- **19 (B-5):** Dragging blocks a blank line apart leaves `3.`, `1.`, `2.` as drawn. That's what a user sees today, and it now reads as three lists rather than a defect
- **25 (C-5):** Bold, Heading, Insert Link, and the other rows write into code, where several refused: `**word**`, `## `, `[[foo]]`. ⌘B follows its row
- **26 (C-2, C-5):** A selection running from prose through a code block: list picks leave the code alone, while Heading and Bold keep writing
- **27 (C-5):** Rows refuse on a block's delimiter lines, so Heading can't write `## ```js` and destroy the block
- **32 (C-1):** Inside a ` ````md ` block, a nested ` ```js ` sample's dash lines read as items
- **33 (C-2, F-1):** Nothing reads a marker inside a math block or a table: a dash in math counts in the footer's stats, and a pipe-less table row like `- a \| b` takes no list intents or rail
- **34 (B-11):** In a cell, fence-shaped lines are just lines: `(` pairs, a list between ` ``` ` lines takes a grip, and `*a*` there reads italic
- **35 (B-11):** `$$` lines in a live cell read as text, matching how a resting cell draws them
- **36 (G-9, B-2):** A cell's list keys scroll the caret into view as a page's do, and `-[ ]` in a cell stops gaining a trailing space
- **40 (D-2):** A glyph right-clicked inside a selection acts on its group, where it acted on the selection
- **41 (D-5):** A selection inside one line acts as a caret does, on the item's group, and a selection holding a whole line narrows to that item. A word filling its item counts as inside the line
- **44 (E-7):** Bold on a word no longer drops silently after a link settles on the same line
- **45 (E-7):** A selection ending in an inline code span stops offering a footnote, which wrote `` `abc[^1]` `` into the code
- **46 (D-5):** A right-click on `_it_`'s outer edge checks Italic, which the row missed before
- **50 (E-6):** A word gesture touching a contraction takes a quote it touches: double-clicking inside `'don't'` selects both quotes, and `'I don't'` reads `don't'`
- **51 (E-6):** **Wider than the log wrote:** a contraction's neighbor across one gap can carry its own quote. A group left from `students' don't`'s gap runs to the word's start. A group right from `don't`'s end runs past `'quoted'`. Double-clicking `'quoted'`'s opening quote after a contraction selects `'quoted'` whole, and pressing `s`'s right half in `'tis don't` reads `'tis`
- **55 (G-10):** Tab and Shift-Tab nest and outdent in the pane, and Shift-Enter stays a plain break, even on a list's last item
- **57 (G-7):** That `…` also marks a plain value running onto a second line, which showed no sign before. One mark serves both clipped and continued, and a hover's scroll tells them apart
- **58 (G-7):** A link on a value's later line no longer renders at rest, since only the first line draws
- **61 (E-7):** A left press left of a bullet or box seats at the item's content, where it seated at the line's start, and at `****- item` a Bold no longer lands ahead of the marker
- **62 (D-6):** Typing `/task`, `/bullet list`, or `/numbered list` in the `/` menu finds nothing, since each type carries one name
- **63 (E-5):** In a language fence, a word gesture reaching a contraction drops that language's word characters: `$a's` in JS reads `a's`
- **64 (F-1):** Callouts: `# > a` picked Callout writes `> [!callout] > a`, `> # a` writes `> [!callout] a`, a depth-two quote keeps its second marker, and a wide gap between quote markers in a callout body shows text, where it drew a dead glyph
- **65 (G-3):** A right-aligned surface draws a value's box at the seat's start, so `☑ bought…` reads whole on Standard cards and the Properties panel
- **66 (G-3):** A Standard card holding a box or a list draws its row a few pixels taller than one holding plain text
- **67 (E-1):** A right-click on a connection glyph, an empty label, a code line number, or a citation reference, with the caret inside it, pops the live menu, where it moved the caret and popped nothing
- **68 (E-4):** A right-click on a read-only cell, dismissed, leaves nothing for ⌘C, where Chromium's seated word stayed selected
- **69 (E-4):** Select All from a read-only cell focuses its surface, so ⌘C copies the whole document, and a glance takes focus for it, against its rule of never taking focus
- **70 (B-10, C-1):** Dragging a glyph past a selection leaves a caret, where the selection turned inside out and Backspace took lines nobody selected. A pick replacing a marker a selection sits in does the same
- **71 (F-1):** A forward selection reaching a carried block's line stops at that line's start, so a triple-click and Backspace keeps the block riding
- **72 (B-10):** Typing or Enter over a selection across items recounts the list, as Delete and paste do
- **73 (B-1):** An ordinal past nine digits reads as text, as standard Markdown reads it, where a recount rounded its digits
- **74 (G-3, G-4):** A value a tool wrote with `\r\n` draws its glyph at rest and stays as written through an untouched close, and an outside write lands as the document holds it
- **75 (B-11):** On a cell or a Text pane, a line opening `> ` no longer counts as a blank lead, so `> ##` writes `§` there as `x ##` does
- **76 (B-9):** A list behind an indented quote draws a flush quote's rails, where it drew none
- **77 (E-4):** A right press in a glance records where focus was, so Select All from a read-only cell hands focus back when the glance closes

#### Not Run

- **Real native menus:** the harness stubs `Menu.popup`, so a menu's open and close order on macOS and Windows was reasoned rather than run. A second right-click while the first reply is in flight could clear a highlight early on Windows; macOS swallows that click.
- **Execution itself:** none of this ran on `active`. Patches replay onto `b7f2f17a5` from a clean export.
- **Phases 1 to 9 on the final chain:** those rows ran on the Wave One chain, before Wave Two's folds. On the final chain, List Types 1 to 9 (522/522) and Phase 10's whole row ran. Execution runs every row anyway, so this is a disclosure rather than a gap.
- **Editor Parity's second baseline:** `base` ran once. Task 0-2's `base2` waits for execution.

#### The Prompt That Starts Execution

```
Execute List Consolidation now, unattended and overnight, through `c/plan-execution`, from `.claude/Planning/List Consolidation/List Consolidation — Implementation Plan.md`, on `active`. Don't stop until its *§Final Verification* report is written; I'll read it in the morning, and nothing here needs me.

Nathan's Approach and Principles, verbatim in the plan's *§Constraints*, govern every phase and task, and every agent brief — executors, checkpoint reviewers, the final waves, and any continuation or handoff — carries both sections in full, with an explicit model and effort. The neutral gate's brief carries those and its intention, and nothing else from the plan.

**Read first, from the files themselves:** the plan's *§Context*, *§Overview*, *§Concepts*, *§Constraints*, *§Process Overview*, *§Completion Criteria*, and *§Final Verification*, then `~/The Studio/.claude/skills/agent-orchestration/SKILL.md` before dispatching anything.

**Rules:**
- A task's AFTER is its patch in `Scouts/Planning/Phases/`. Apply it, run its VERIFY as written, and commit. Every patch replays in order onto the BASELINE.
- Every stop is yours to handle. The plan's Compaction Checkpoint replaces the command's, so nothing waits. An ambiguity takes its simplest reading, gets recorded under *§Deviations*, and the run carries on.
- This run will compact. The plan file holds all state, so after any compaction re-read *§Constraints* and *§Process Overview* from the file rather than from a summary, and resume from what's ticked.
- Send a PushNotification at each checkpoint, in plain language: what landed, what the drives and reviewers found, and what's next.
- Never launch the app from the main checkout, and never stop an instance you didn't start.
- A Bash command carrying `git` can't contain a personal name, and that includes heredocs.
- Remove every worktree and scratch fixture before the report, and prove it with *§Final Verification · The Cold-Machine Check*.
```
