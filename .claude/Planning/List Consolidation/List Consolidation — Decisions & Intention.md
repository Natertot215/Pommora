### List Consolidation — Decisions & Intention

**DATE:** 11-05-2026
**STATUS:** RATIFIED 11-05-2026

### Context

MarkdownPM reads a list through a marker grammar (`Engine/detect.ts`), a per-line scan (`Engine/docScan.ts`), and a list model (`Engine/listModel.ts`) that walks siblings, nesting, and numbered runs. A list's type changes through one switch, `setList` in `Input/format.ts`, reached from a glyph's menu, the right-click's **Lists ▸**, the grip's **Type ▸**, and the `/` menu, with a setting, **Preserve List-Level Formatting**, deciding a caret pick's reach. Numbers count in a transaction filter, `Input/listRenumber.ts`, which works out what an edit meant from the edit's shape. The List Glyph Menu work landed most of this over `9ce2d2b2b..89dba6b41`, adding 476 production lines, among them a right-click route shared by a live editor and a resting table cell (`Menus/menu.ts`) and a word rule for apostrophes (`Input/markdownInput.ts`).

Today a marker is classified three ways, by what it parses as, what it draws as, and which type the menus call it. The block model and the list model answer differently where a list ends. Lists inside code blocks are read by a menu pick in any language and by no key in any language. A Text property's pane shares a mode with its one-line field that reads no lists, so a value starting `- milk` shows its dash as text.

### Overview

This work should leave MarkdownPM's list handling smaller, stated once, and easier to change, with fewer ways to do similar things and no code guarding states nothing produces. A marker should have one classification, each list type one definition, and a blank line should end a list for every reader. A list inside a Markdown code block should behave as any other list, and every other code block should be plain code. The right-click route and the word rule should shrink to what their surfaces genuinely need, with a resting cell keeping its deliberate behavior. Near the plan's end, on the cleaner system, a Text property's pane should take lists in full.

This is cleanup rather than a feature, though nothing about today's behavior binds it apart from the resting cell's right-click, so visible changes are in bounds wherever a decision below names them.

#### Concepts

- **Item:** a line a list reads as a member, holding a marker and its text.
- **Marker:** an item's written lead: `-`, `+`, `1.`, `A.`, `→`, or a checkbox.
- **Glyph:** the drawn form of a marker, and the item's drag handle.
- **Type:** one of the five kinds of list: Bulleted, Numbered, Alphabetical, Checklist, and Arrowed.
- **Group:** the items sharing one parent. With Preserve List-Level Formatting off, a pick also reaches what's nested under them.
- **Run:** consecutive numbered or alphabetical items that count together.
- **Pick:** choosing a list type from any menu.
- **Reach:** the items a pick changes.
- **Seat:** where a gesture places the selection the menu's rows act on.
- **Box:** a checkbox's `[ ]` or `[x]`.
- **Rail:** the vertical outliner line under a nested list.
- **Ride:** a block belonging to the item directly above it and moving with it.
- **Grip:** the handle on a block's first line, whose menu acts on that block.
- **Resting Cell:** a table cell drawn without an editor; only the focused cell mounts one.
- **Markdown Code Block:** a fenced block whose language reads as Markdown.
- **Plain Code:** every other code block.
- **Scope:** what a surface reads: a page reads every block, a table cell reads lists and inline marks, and a Text value's one-line field reads inline marks alone. What its pane reads is G-6's to settle.

---

### Decisions

Every decision below states intent: what should become true, which planning designs toward and may reach by a better route than any named here. Only *§Context* and a clause saying "today" describe the code as it stands. [CONFIRMED] marks what was stated outright. [INFERRED] marks Claude's reading of what follows from those statements and the investigation, which stands until evidence or a ruling overturns it.

#### A - Scope and Process

- **A-1 [CONFIRMED]:** The right-click route and the word rule should sit inside this work alongside the list code.
- **A-2 [CONFIRMED]:** No behavioral contract applies: today's behavior, the List Glyph Menu's results matrix, the List Types Drive, and the pinned tests are a record of what exists rather than a baseline. Nothing the List Glyph Menu's log recorded binds this work. E-1 is the one exception.
- **A-3 [CONFIRMED]:** Filed issues should close only where the design solves them naturally. I-036, I-071, and I-073 aren't targets of their own.
- **A-4 [CONFIRMED]:** A test that contrasts or conflicts with the outcome should leave rather than be bent to pass.
- **A-5 [CONFIRMED]:** The Metadata Picker plan is the caliber and shape to match: an investigation, scout reports, a fresh-eyes read, and plan reviews.
- **A-6 [CONFIRMED]:** The outcome should be proven by rewriting the List Types Drive to what these decisions intend and running it, with no hand checks from Nathan. The Text Property Drive should be rewritten alongside it, since section G turns its pins around. Neither should keep a phase gate, so a failing item fails the run.

#### B - What a List Is

- **B-1 [CONFIRMED]:** A marker should read as standard Markdown reads it, so a `+` item is a plain bullet and `- [] x` is a bullet whose text is `[] x`, leaving one classification of a marker rather than three. This settles what `+` and a box's spelling mean and nothing wider: `*` and `1)` should stay outside the grammar, and `A.` and `→` inside it.
- **B-2 [CONFIRMED]:** `-[]` should read as plain text, and the typing shorthand should keep turning it into a checkbox. Every no-space spelling should read the same way, `-[ ] x`, `-[x] x`, and `1.[ ] a` included, and the shorthand should write `- [ ] ` whichever bullet it was typed with.
- **B-3 [CONFIRMED]:** A box should read only after a bullet, so `1. [ ] a` shows its `[ ]` as text, departing from GFM, since Pommora holds no numbered checkbox type. Switching such an item to Bulleted should write a real checkbox.
- **B-4 [INFERRED]:** Pommora should write only `-` for a bullet, so Enter under a `+` item should write `-`, and an existing `+` should stay until something rewrites it.
- **B-5 [CONFIRMED]:** A blank line should end a list for everything: numbering, picks, drags, the rails, and the grip all stop there, and the loose-list concept should leave. A blank line added inside a numbered list should split it, the lower list keeping its numbers, and removing one should merge the two and recount. An item's drag should carry nothing past a blank line, though an item should still drop into another list.
- **B-6 [INFERRED]:** Nothing below a blank line should ride an item, so an indented paragraph or block after one should stand on its own. Any indented line directly under an item should ride it, and a blank line inside a code or math block an item carries shouldn't count.
- **B-7 [CONFIRMED]:** Alphabetical and Arrowed lists should have full parity through the high-level infrastructure. Every list type should work through one design, with no type carved out. Each type should have one definition that the walks, keys, and menus read, with counting and checking the only behaviors that differ.
- **B-8 [CONFIRMED]:** Numbers and arrows should stay drawn as they are today, as real text.
- **B-9 [CONFIRMED]:** The outliner rails should keep drawing under bullets, checklists, and alphabetical lists alone, and a `+` item should take a bullet's rail by being a bullet.
- **B-10 [INFERRED]:** The recount of the run an item leaves, a list keeping its start number, a block directly under an item riding it, and a selection's reach should stay as behaviors, each rebuilt as simply as it allows.
- **B-11 [INFERRED]:** A surface's scan should hold what that surface reads, carried by a facet, so a list reader asks the scan rather than taking a scope, and a marker on a sealed line reads as none. A cell's scan keeps `html` and `fenceLines`, which its chunks and its parse rely on.

#### C - Code Blocks

- **C-1 [CONFIRMED]:** A list inside a Markdown code block should behave as any other list, through every list behavior a key or menu offers, and differ only in drawing no glyph. Lists should be the only Markdown such a block reads. The `/` menu should stay closed in code, and the block's grip should stay as it is today.
- **C-2 [CONFIRMED]:** A list in a Markdown code block should be reachable only from inside that block: the surrounding list's menus, its numbering, and a selection crossing the block's edge leave its lines alone.
- **C-3 [CONFIRMED]:** Every other code block should stay plain code: no list logic reads it, so no key, walk, count, or glyph treats a line there as an item.
- **C-4 [INFERRED]:** A block naming no language should read as plain code, and a diff should stay a diff even where its language is Markdown, since a leading `-` or `+` there is the line's change sign. Whatever the fence's one reading resolves to Markdown should count, so `md` and a `.md` path do.
- **C-5 [CONFIRMED]:** The right-click's rows should stay in every code block and simply write their text into the code, unaware of it: Bold writes `**word**`, Heading writes `## `, and in plain code a list pick writes its marker on the lines it touches, with no counting and no reach past them.
- **C-6 [CONFIRMED]:** `-[]` and `->` should work at a line's start in a Markdown code block, while other typing transforms stay off in code.
- **C-7 [INFERRED]:** Insert ▸ should keep working in code exactly as it does today, and on a diff line a row should write after the line's sign, so the sign survives.

#### D - Picks and Menus

- **D-1 [CONFIRMED]:** Preserve List-Level Formatting should stay as an option.
- **D-2 [CONFIRMED]:** The grip's menu should change every item in its block, whatever the setting reads, so a glyph acts on its group, a grip on its block, and a selection on what it touches. A caret should act as its glyph does. Where a block holds more than one type, the grip's menu should check no row.
- **D-3 [CONFIRMED]:** A list grip's submenu should read Format ▸, as a link's and a column's already do. Type ▸ is an error. The general right-click menu's Lists ▸ should stay as it is today, beside its own Format ▸.
- **D-4 [CONFIRMED]:** A re-pick should leave an item already of its type alone, so the restart should leave and repairing a broken list should take Bulleted then Numbered.
- **D-5 [CONFIRMED]:** A selection inside one line should act as a caret does, on the item's group, whether a right-click seated it or it stood beforehand, and a selection holding a whole line should narrow to that item. The right-click's second range should leave with this.
- **D-6 [CONFIRMED]:** Each list type should have one name everywhere: Bulleted, Numbered, Alphabetical, Checklist, and Arrowed.

#### E - Right-Click and Words

- **E-1 [CONFIRMED]:** A right-click on a resting table cell should act as if the cell were focused, with a live cell's format rows and reach, and leave no caret in the cell afterward. This outcome is long-standing and deliberate: the Links Cleanup, the plan that rebuilt how links read and click, ruled that everything in a table gets its right-click menu while the cell isn't focused, and that the right-click must not focus the cell. The resting menu should stay and consolidate: driven live in *Scouts/5 — Right-Press Probe*, no way of entering the cell for the menu's length came out indistinguishable to a user. Undo, Redo, and Select All should stay off it, since a resting cell holds no editor for them to act on.
- **E-2 [CONFIRMED]:** Typing after a dismissed resting menu should land at the page's caret, where today it goes nowhere. The seated word's highlight should clear when the menu closes, and a page selection should be replaced as typing always replaces one.
- **E-3 [CONFIRMED]:** A word seated in a resting cell should show a highlight whatever Use Native Highlighting reads, in the editor's selection color from the one place that color is defined. CodeMirror's pill can't draw outside an editor, so the color carries the likeness.
- **E-4 [CONFIRMED]:** Every read-only surface should offer the same short right-click menu, Copy and Select All. That should mean every editor surface that can't be edited: the page reader, a tile not being edited, a read-only table's cells, and the info pane. A link's or a heading's own menu should still answer first there.
- **E-5 [CONFIRMED]:** An apostrophe inside a word should read as a contraction, part of its word, for every word gesture, through the simplest mechanism that makes sense. Inside a word should mean a letter or digit on both sides, since `students'.` and `'quoted',` hold no space around the apostrophe and aren't contractions.
- **E-6 [INFERRED]:** The word rule should ride CodeMirror's own word characters, answered by position, in place of the joined-word atoms and the wrapped commands. *Scouts/Planning/Word Rule Prototype* passes every word test in place. CodeMirror takes one answer per gesture, so a quote touching a contraction's gesture can ride with it, as `'don't'` selecting its outer quotes does. Those departures are accepted at the smallest reach the mechanism allows, with tests pinning them.
- **E-7 [INFERRED]:** The right-click's rows should act on what the surface seats, so a right-click can't write into a marker, and guards whose state nothing reaches should leave, each judged against what the live probe observed. *Scouts/3 — Right-Click and Word Rule* holds the candidates, and *Scouts/5 — Right-Press Probe* what was observed.

#### F - Defects

- **F-1 [INFERRED]:** Each defect the investigation observed should leave at its cause rather than be guarded: a block drag leaving stale numbers; a list block swallowing a table's header row, which a grip's Delete would take; a grip's pick running past the document's end; a callout head drawing a glyph that does nothing, which should stop drawing one; a switch deleting the box in `2. [x] foo`; an alphabetical run past Z recounting from A; a pick overwriting a diff block's signs; a typed `-[x]` rewriting text in a plain code block; and the rails ending at a flush line inside a block an item carries.
- **F-2 [CONFIRMED]:** Pasting into a numbered list should recount in principle, approached as its own piece of work rather than riding on the rest of the numbering.

#### G - Text Properties

- **G-1 [CONFIRMED]:** A Text property's pane must allow lists with full regard, reversing the Text Properties plan's reading that a Text value holds no lists, with the mechanisms keeping them out removed so that reads as always intended. This should land near the plan's end, on the reworked list system.
- **G-2 [CONFIRMED]:** `- item` on a value's first line should create a list.
- **G-3 [CONFIRMED]:** A Text value's list should draw its glyph at rest in tables and cards.
- **G-4 [CONFIRMED]:** A Text value's on-disk format should stay as it is. Only the MarkdownPM surfaces a Text property uses should change.
- **G-5 [INFERRED]:** The one-line field should stay plain, since it holds one line and also serves Link values.
- **G-6 [CONFIRMED]:** How the pane takes lists should be identified during planning. The pane should share what a cell reads rather than become a table cell, whose grid navigation and `<br>` handling belong to the table alone.
- **G-7 [CONFIRMED]:** Only a value's first line should show at rest, so a list shows one glyph and its first item, and an ellipsis at the end of that line should mark that the value runs onto another line, which today's ellipsis doesn't do, as in `• text text…`, with the pane showing the rest.
- **G-8 [CONFIRMED]:** A checkbox in a Text value at rest shouldn't be clickable, since that would take a write path of its own.
- **G-9 [INFERRED]:** The pane and a page's table cell should read lists through one shared scope, which should be named for what it reads rather than for a table, with list keys merged into one answer that each surface adds only its exit to.
- **G-10 [CONFIRMED]:** In the pane, Enter should make the next line, continuing an item on a list line and breaking a plain line elsewhere, while Escape and the × save and close. A table cell's Enter stays its own. Tab and Shift-Tab should nest and outdent, and the `/` menu should stay out [INFERRED]. The grip, glyph menu, drag, rails, and Preserve List-Level Formatting should all reach it [INFERRED].
- **G-11 [CONFIRMED]:** A Text list staying a string on disk is fine, since it's quoted or formatted through text-based YAML, and every list-shaped value already round-trips unchanged today. Things should work without being forced: nothing should be stored or flagged to mark a value as a list, and the marker grammar should read its text as it reads any other [INFERRED].
- **G-12 [INFERRED]:** A click on a resting list should open the plain one-line field showing its dash.
- **G-13 [INFERRED]:** A real YAML list under a Text key should read as its items' lines rather than today's `[item, two]`, so it draws as a list, keeping its shape on disk until the first edit, as a foreign value does today.

---

#### Constraints

- **Approach:**
  - Any approaches being considered here must first assess what’s true *now* that would be able to be removed, deleted, changed, consolidated, or replaced. We’re not going to design based on what’s currently there and simply adjust course, we’re ensuring totality-first application, removal-first scoping, and residue-eliminating frameworks that provide a clean slate rather than building changes on top of what’s ultimately going to be replaced.
  - We’re approaching this through consolidation-first properties, ensuring the codebase ends up more understandable, less complex, more efficient in what it does, less conflicting in defining that, and an overall cleaner foundation to work within.
  - We shouldn’t adding anything new unless there’s evidence that it’s required. We’d approach this through the perspective of ending up with cumulatively “less stuff” in the codebase overall — less ways to do similar things, less complexity, fewer paths to go through, less tech debt waiting to surface, less things to maintain, and fewer headaches when approaching future work entirely — while the line-count *may* end up positive. Net-negative lines are the north star, but any net-positive gain *must* have its rationale for that outcome be genuinely backed through this framework and our principles.
  - Anything within our surface area should be left reading as always-intentional, without any odd-ones-out designs, and be reflective across the broader codebases' resulting shape — not just maintaining remnants or adherence to what’s true *now* that’s ultimately going to change. The approach should reflect the outcome and shouldn’t be bound to constraints that were only relevant before.
  - Ensure we're looking *outward* for cross-file opportunities and shared design, avoiding hand-rolling or duplicating what's already there or can be adjusted accordingly. Pommora is an established codebase and we’re not starting from scratch.
  - The complex data-level mechanics of the codebase are what least reflect *Nathan’s* intentions and are primarily reflective of what’s determined appropriate via past session agents. Treat it with care and respect, but don’t assume it’s beyond changing within reason, where simply presenting the approach to Nathan may be all that’s required to genuinely change the codebase for the betterment of everything within it and future iterations.
- **Principles:**
  - **Less to Carry:** No more functions, helpers, wrappers, types, layers, and call sites than necessary, and no logic stated twice. New code earns its place by removing more than it adds, fixing incorrect behavior, or delivering required behavior in its minimal form.
  - **Less to Understand:** A reader finds what exists, where it lives, what owns it, and what calls it with less searching and tracing than before, whether a developer reading code or Nathan reading file names and headers. A blind-eye review of the surface areas impacted by this implementation should find less confusion, less conflict about intent, and an unambiguously more approachable, maintainable ecosystem to iterate on.
  - **Clearer Boundaries:** Each responsibility has one owner, and the next change of a kind has one obvious place to go, with no choice between layers, helpers, or modules — nothing that exists somewhere where it shouldn't; nothing implemented where something else already does it or adjusting it accordingly would be the more appropriate approach; nothing that increases the risk of misassumption when working here in the future.
  - **Reads as Designed:** Nothing temporary, transitional, kept for compatibility, unreachable, needlessly indirect, or left over from the work remains. Nothing designed around codebase shapes that will ultimately be changed for the better.
  - **One Way:** Each thing has one implementation, one pattern, and one source of truth. No part contradicts another. Exceptions carry their reason where a reader meets them, in code or feature documentation.
  - **Real Purpose:** Anything added to the codebase should have its purpose clearly stated from the perspective of its value in enhancing what's already there — complexity, duplications, divergences, multiple ways to do the same thing — and anything "new" added should be assessed using that. Line-count increases shouldn't translate into maintenance cost or complexity.
  - Anything introduced should have independent justification behind its existence that isn't simply self-induced requirements.
  - Anything changed or implemented should be reflected across the board — nothing that's done this way here, while something else works differently elsewhere, unless that's *genuinely* correct.
  - Zero data-level spaghetti, complexity, or additional 'stuff' should be added without reason. Rewiring things to become more understandable, more efficient, more appropriate, and more effective is preferred when the alternative is just adding more to something that's inherently unfit to suit the long-term mandate of what's actually being offered.
- **Removal First:** every phase, task, and candidate is assessed for what leaves before what arrives; nothing is added unless its absence would leave a real gap, and in-scope cleanup that's obvious to take is taken rather than deferred.
- **Caution Code:** none without a named, reachable cause. A suspected bug is shown to exist against the tree before anything reconciles it, and the reconciliation follows the Approach and Principles rather than guarding the symptom.
- **The Number:** net lines are measured from `b7f2f17a5` across the whole work, section G and the new menu included.
- **Comments:** the production comment count reads 3,511 at `b7f2f17a5`, by `git grep -c -E '^[[:space:]]*(//|/\*\*|/\*)' -- 'Core' 'Desktop' 'UIX' 'Sync' ':!*.test.*'` summed, and doesn't exceed it at the end, and no comment grows to carry what another held.
- **Briefs:** every agent brief on this topic — scouts, executors, reviewers, and the fresh-eyes read — carries the Approach and Principles above in full.
- **Reviews:** the plan takes the waves recent plans ran, each folded before the next: Wave One reading outward and Wave Two reading inward, each a simplification reviewer and an executing adversarial reviewer, then a both-ways read closing on a neutral verdict. After implementation, Wave One runs under `code-simplification` and Wave Two under `adversarial-review`, each one reviewer inward and one outward, with a third wave only where the folds were structural, then a neutral gate given only the before, the after, the Approach and Principles, and a plain statement of intent.
- **Notifications:** planning and execution mark every checkpoint and every update to Nathan with a push notification, in plain language: what landed, what was found, and what's next.
- **Unattended:** planning and execution each run overnight with no one to answer. Every stop in a plan's *§Process Overview* is the orchestrator's to handle, an ambiguity takes its simplest reading and is recorded, and the run carries on. Planning ends overnight at a ratified, committed plan with a morning report of anything Nathan needs to know, and execution starts from its own prompt.
- **Fresh Eyes:** before planning begins, an agent with no context beyond this log and the codebase reads it and brings its own questions; what it finds already decided is the point.

#### Rejections

- **Entering a Resting Cell for the Menu:** the live probe ran seven ways of doing it, and none matched today's outcome; in a cell holding bold text the row can grow and push the page down until the menu closes.
- **Drawing Numbers and Arrows as Widgets:** arrows staying as text leaves both drawing paths standing, so the change would save no code.
- **Rails Under Every Type:** out of this work, and left as it is.
- **One List and One Grip Across a Blank Line:** a blank line ends a list instead.
- **A Real YAML List for a Text Value:** only flat bullets fit it, so a value would hold two storage formats.
- **Lists in Every Code Block:** a code sample's dashes and numbers belong to its language.
- **Removing Preserve List-Level Formatting:** it stays as an option.
- **A List Tree:** once a blank line ends a list the walks shrink on their own, and a tree would add lines and cost each list edit about 2 ms at 20,000 lines.

#### Open Items

#### Prospects

---

#### Sources

- `Scouts/7 — Scans and Structure.md` and `Scouts/9 — Blank Lines and Numbering.md`, with their patches in `Scouts/Planning/`, at `b7f2f17a5`.
- Round trip through `parsePage`, `decodeValue`, and `mergeFrontmatter` on 11-05-2026: `- item`, `- item\n- two`, `1. a\n2. b`, and a checklist each read back equal, and a YAML sequence under a Text key reads as `[item, two]`.
- `Scouts/6 — Text Pane.md` and `Scouts/8 — Code-Block Parity.md`, with their prototypes in `Scouts/Planning/`, at `b7f2f17a5`.
- `.claude/Planning/Text Properties — Implementation Plan.md`, *§Deviations* — the 10-08-2026 reading that a Text value holds no lists, which G-1 reverses.
- *List Consolidation — Fresh-Eyes Read* — the zero-context read of this log, and the questions it raised.
- `.claude/Planning/List Consolidation/Scouts/Planning/Word Rule Prototype.patch` — E-6's mechanism, against `b7f2f17a5`.
- *List Glyph Menu — Decisions & Intention* and its *Results*, in history at `5fede9307` under `.claude/Planning/List Glyph Menu/`.
- `.claude/Planning/Completed/Metadata Picker/` — the shape A-5 matches.
- `.claude/IssuesPM.md` — I-036, scope read through bare string compares; I-071, MarkdownPM's coverage split across five drives; I-073, numbering recounting through two patterns.
- NexusOS, counted outside fences and frontmatter on 11-05-2026: items separated by a blank line appear in 24 files, with 9 numbered cases. Other Markdown readers read those as one list.
- `Scouts/1 — Readers and Writers.md`, `Scouts/2 — Tests, Docs, Issues, and Drives.md`, `Scouts/3 — Right-Click and Word Rule.md`, `Scouts/4 — What Each Behavior Costs.md`, and `Scouts/5 — Right-Press Probe.md`, read or driven at `b7f2f17a5`.
- `.claude/Planning/MarkdownPM Links/Ruling Log.md` at `1f55ea5a0`, lines 63-64 — the ruling behind the resting cell's right-click, from the Links Cleanup, 10-09-2026.
- `fc234155b` — single-live-cell tables, 06-25-2026, the reason a resting cell mounts no editor.
- `Core/MarkdownPM/Engine/detect.ts:552` — the marker grammar, whose box group also matches after an ordinal.
- `Core/MarkdownPM/Engine/intents.ts:133-143` — `listGlyphOf` and `drawnKind`, the classifications apart from the parsed kind.
- `Core/MarkdownPM/Input/edits.ts:54` — the typing shorthand, which matches `-[]` with no space.
- NexusOS, 626 files, counted outside fences and frontmatter on 11-05-2026: 270 human-written files hold bullets, checklists, and numbered lists, with no alphabetical, arrowed, `+`, empty-box, or quoted items.
