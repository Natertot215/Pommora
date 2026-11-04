### List Glyph Menu — Decisions & Intention

**DATE:** 11-03-2026
**STATUS:** RATIFIED 11-03-2026

### Context

MarkdownPM draws a list item's marker as a glyph — a bullet, a number, a letter, a checkbox, or an arrow — and the glyph is the item's drag handle, with a press on a checkbox ticking it (`Core/MarkdownPM/Gestures/listDrag.ts`). A list's first line carries the block's grip, whose menu's **Type ▸** switches every item in the block between the five kinds through `setListKind` (`Core/MarkdownPM/Input/format.ts`), which numbers each level with its own counter. The general right-click menu's **Lists ▸** converts the selected lines through `setList`, removing the marker when every selected line already has the picked kind and leaving the counting to the editor's renumber pass (`Core/MarkdownPM/Input/listRenumber.ts`). No handler is a glyph's own: a right-click on a bullet or checkbox shows no menu at all, since the platform reports the drawn glyph as uneditable (`Desktop/Actions/editorMenu.ts:136`), while a number, an arrow, or a `+` gets the general right-click menu with the press seating the caret inside the marker. In a focused table cell, the grip's press band ends where the first item's glyph begins.

A level is an item's indent depth, 0 to 3 (`indentLevel` in `Core/MarkdownPM/Engine/detect.ts`). Every edit the editor makes enters its undo history. Lists in table cells read the same vocabulary, and a resting cell draws its glyphs from its own DOM (`Core/MarkdownPM/Tables/cellStatic.tsx`) and answers its own right-clicks.

### Overview

Right-clicking any list glyph, at any level, should open a native menu of the five list types for that glyph's group, independent of the grip's **Type ▸**. A **Pages & Writing** setting, **Preserve List-Level Formatting**, on by default, should decide how far a pick reaches: on, it changes only the group's items sharing the clicked type; off, it sets the group and everything nested under it to the picked type. **Lists ▸** should follow the same rules from an item's text, a selection narrowing any pick to the items it touches, and every entry point should share one list-type switch.

#### Concepts

- **Glyph:** the drawn form of a list item's marker.
- **Level:** an item's indent depth, 0 to 3.
- **Group:** the items sharing one parent — in the example under *§Decisions*, B and E under A, or A and F at the top.
- **Grip Menu:** the block menu on a list's first line, holding **Type ▸** and Delete.
- **Lists ▸:** the general right-click menu's list submenu, which turns selected lines into items.
- **Preserve List-Level Formatting:** the setting deciding a pick's reach.

---

### Decisions

Example used throughout:

```
- A
	- B
		- C
		- D
	- E
- F
```

#### A - The Glyph Menu

- **A-1 [CONFIRMED]:** Right-clicking any list glyph at any level should open a native menu of list types for that glyph's group, independent of the grip menu's **Type ▸**.
- **A-2 [CONFIRMED]:** The menu should be a flat list of the five types, in the grip's order and short names (Bulleted, Numbered, Alphabetical, Checklist, Arrowed), with no Delete.
- **A-3 [INFERRED]:** The check should mark the type every item a pick reaches already shares, and no row where they differ.
- **A-4 [CONFIRMED]:** The menu should work wherever a list glyph is drawn, table cells included, by construction rather than by enumerating surfaces.
- **A-5 [CONFIRMED]:** In a table cell, a right-click on the first item's glyph should open the glyph's menu, and one in the list's margin the grip's. The grip's band ends where the glyph begins, so each keeps its own spot.
- **A-6 [INFERRED]:** Nothing should open where the document can't be edited, as the grip's list rows behave today.
- **A-7 [CONFIRMED]:** A list-type change should undo with ⌘Z. Every edit the editor makes already enters its undo history, so this should hold by construction.
- **A-8 [INFERRED]:** A resting table cell mounts no editor and answers each gesture in its own handlers, as it already does a checkbox tap, so its one right-click handler should recognize a glyph and apply the pick without entering the cell, as its other menu rows do.
- **A-9 [INFERRED]:** A revealed marker and an item drawing no glyph (`- []`) fall to **Lists ▸**, which gives the same result under C-2, and a right-press on a number or arrow glyph shouldn't seat the caret inside it.
- **A-10 [INFERRED]:** Quoted and callout lists are included, a blank line inside a quote ending the group as it ends numbering.

#### B - Which Items Change

- **B-1 [CONFIRMED]:** With **Preserve List-Level Formatting** on, a pick should change only the items in the clicked item's group that share its type: right-clicking B changes B and E, and had E been numbered, B alone. Off, it should set the group and everything nested under it to the picked type: B, C, D, and E. A and F stay unchanged either way.
- **B-2 [CONFIRMED]:** Items at the same depth under another parent stay unchanged: had F held nested items, right-clicking B would leave them.
- **B-3 [CONFIRMED]:** Every glyph a pick would reach should give the same result: right-clicking E acts exactly as right-clicking B. With the setting on, that holds among the group's items of one type.
- **B-4 [INFERRED]:** With the setting on, same-type siblings should count past a differently-typed sibling between them: B and E change around a numbered sibling.
- **B-5 [INFERRED]:** Siblings should be the items a list draws at one depth under one parent, whatever mix of tabs and spaces indents them, and numbering and the drag should read the same rule, so two items that look like one list number as one. Nathan's direction was to fix the mismatch; numbering separates such items today.
- **B-13 [CONFIRMED]:** A `+` item is Arrowed, the type it's drawn as: it shares Arrowed's group under the setting, the menu checks Arrowed on it, and picking Bulleted rewrites it to `-`.
- **B-6 [CONFIRMED]:** A top-level group should span items a blank line apart, as numbering already does.
- **B-7 [CONFIRMED]:** A selection is the reach: a glyph right-clicked inside a prior selection, or **Lists ▸** picked over one, should change every item the selection touches and only those, whatever their type or the setting, and turn any plain line in it into an item. A selected word counts as its item, and a glyph outside the selection acts on its group.
- **B-8 [CONFIRMED]:** Picking the type already applied should change no item's type with the setting on, and with it off should set every differing item it reaches to that type.
- **B-9 [CONFIRMED]:** Numbering repair shouldn't regress: a pick that reaches items already numbered or lettered should recount their run from 1 or A, repairing a broken or gapped run as the grip's **Type ▸** does today, while a pick that only brings plain lines or other types into a numbered run should continue its count, so turning `b` into an item beneath `5. a` makes `6. b`, as it does now.
- **B-10 [INFERRED]:** The run an item leaves when it stops being numbered should recount by the editor's run rule: a nested run from 1, and a top-level run from its own lowest number, so bulleting the middle of `1. 2. 3.` leaves `1.`, a bullet, and `3.`.
- **B-11 [INFERRED]:** A group's edges follow numbering's: items a blank line apart stay together at any depth outside a quote, a paragraph or heading between items ends a group, and an indented list under a plain paragraph is a group of its own.
- **B-12 [INFERRED]:** Checked and unchecked items are one type, so no pick unchecks an item that's already a checklist item.
- **B-14 [INFERRED]:** A line indented beneath an item is that item's continuation, as the drag and the grip already read it, so a pick reaching it changes its item, and typing a marker is what makes it an item of its own.
- **B-15 [CONFIRMED]:** A quote or code block indented beneath an item belongs to that item: numbering continues past it, a drag carries it whole, and a pick reaches the items beyond it.
- **B-16 [CONFIRMED]:** The outliner's rails should follow the same line rule as the list itself, so a rail stops at a heading or paragraph between items and carries through an item's wrapped lines, closing what I-017 describes, provided the rail pass adds no measurable cost per keystroke.

#### C - Lists ▸

- **C-1 [CONFIRMED]:** **Lists ▸** should follow the glyph's rules on a line that's already an item, and a plain line should still become an item. The `/` menu opens only on an empty line, so its list rows keep turning that line into an item.
- **C-2 [INFERRED]:** A right-click on an item's text with no prior selection should act as right-clicking its glyph. The word the platform selects under a right-click isn't a prior selection. Nathan delegated this call: one rule for pointing at an item keeps the switch unaware of where it was asked from, and a single item stays one selection away (B-7).
- **C-3 [INFERRED]:** Picking the type every selected item already has should no longer remove their markers. On a page, **Heading ▸ Paragraph** still turns items back into plain lines at the left edge; in a table cell, which has no **Heading ▸**, Backspace on the marker does.
- **C-4 [INFERRED]:** **Lists ▸**'s check should follow A-3 rather than reading the clicked line alone.
- **C-5 [INFERRED]:** In a table cell, where `>` is literal text, **Lists ▸** should turn a line beginning `>` into an item holding that text, the switch reading lines by the surface's scope as I-037 proposes, with I-037's list of sites updated to match.
- **C-6 [CONFIRMED]:** The general right-click menu's other rows should keep how they act today; this work changes only what list types do.
- **C-7 [CONFIRMED]:** A list written inside a code block should switch and renumber within that block from **Lists ▸**, while changes from outside the block — the surrounding list's glyph, its grip, its numbering, or a drag — never reach in, so a code sample such as a diff isn't rewritten.

#### D - The Grip and the Switch

- **D-1 [CONFIRMED]:** The grip menu's **Type ▸** should keep switching its whole block, whatever the setting says, without reaching past a blank line into the next block.
- **D-2 [INFERRED]:** The glyph menu, **Lists ▸**, the `/` menu, and the grip's **Type ▸** should run through one list-type switch, differing only in which items they address, with one numbering rule behind it.
- **D-3 [INFERRED]:** A block that opens on an indented paragraph has its grip on that line, so the grip's **Type ▸** turns it into an item with the rest.

#### E - The Setting

- **E-1 [CONFIRMED]:** **Preserve List-Level Formatting** should be on by default, and its caption is Nathan's to write once execution begins.
- **E-2 [CONFIRMED]:** The setting should sit directly beneath **Outliner Lines** in the untitled first section of **Pages & Writing**.
- **E-3 [CONFIRMED]:** The setting earns its place over a fixed reach or a modifier key: a fixed reach drops the off behavior, and a modifier is invisible.
- **E-4 [CONFIRMED]:** The setting's stored key should be `preserveListLevels`.

---

#### Constraints

- **Approach:**
  - Any approaches being considered here must first assess what’s true *now* that would be able to be removed, deleted, changed, consolidated, or replaced. We’re not going to design based on what’s currently there and simply adjust course, we’re ensuring totality-first application, removal-first scoping, and residue-eliminating frameworks that provide a clean slate rather than building changes on top of what’s ultimately going to be replaced.
  - We’re approaching this through consolidation-first properties, ensuring the codebase ends up more understandable, less complex, more efficient in what it does, less conflicting in defining that, and an overall cleaner foundation to work within.
  - We shouldn’t adding anything new unless there’s evidence that it’s required. We’d approach this through the perspective of ending up with cumulatively “less stuff” in the codebase overall — less ways to do similar things, less complexity, fewer paths to go through, less tech debt waiting to surface, less things to maintain, and fewer headaches when approaching future work entirely — while the line-count *may* end up positive. Net-negative lines are the north star, but any net-positive gain *must* have its rationale for that outcome be genuinely backed through this framework and our <principles>.
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
- **Planning:**
  1. **Look Outward First:** before designing any piece, name every function, field, file, or rule it would add, and scout what already exists for each.
  2. **Verify Nathan's Claims:** check every architectural claim he makes against the tree and report what contradicts it, plainly; he wants it. Many previous plans had corrections that were  flagged against what went unnoticed during the brainstorming process, and each correction changed the design.
  3. **Ask, With a Read Attached:** where an answer reads more than one way, stop and ask, with what was found, what it implies, and the call put up for correction; Nathan isn't technical, so each question is explained in plain terms.
  4. **Disclose In-Flight Calls:** a judgment made during planning or execution is stated in chat when it's made, and recorded where it changes an outcome.
  5. **Write With Intent:** decisions and plans state intended behavior as intent ("should"), separate from statements of how the code works today, so a future reader never takes a decision for a fact or a fact for a decision.
- **Briefs:** every agent brief on this topic — scouts, executors, and reviewers — carries the Approach and Principles above in full.
- **Placements:** every new, moved, or renamed file comes to Nathan for approval before it lands. Approved: `.claude/scripts/List Types Drive/live-drive.mjs`, with its paragraph in `.claude/scripts/README.md` and the edit to `.claude/scripts/drive-harness.mjs` that records a menu row's check and exports the phase-aware drive item the List Types and Path Links drives share; `Core/MarkdownPM/Engine/listDragModel.ts` renamed `listModel.ts`, with its test, once it holds the whole list model.
- **Tests:** a test is added only where what it pins is clearly defined and genuinely needs to exist.
- **Comments:** the codebase's comment count doesn't grow.
- **Documentation:** feature documentation changes stay to one or two sentences; deleting a sentence the work makes false, and the setting's row in the settings table, don't count against it.
- **Live Drives:** the existing MarkdownPM interaction drives run during execution.

#### Rejections

- **A Second Setting for Type Matching:** preserving other types and staying on one level are one switch, not two.
- **Same-Depth Items Under Other Parents:** a group is one parent's items, not every item at that depth in the list.
- **A Text-Only Rule for Lists ▸:** an item's text changing only itself with the setting on and its whole level off would give one item two rules depending on where it's clicked.
- **Every Right-Click Row Acting Where It Lands:** right-click → Bold on an unselected word would insert an empty pair instead of bolding it.
- **The Grip Reaching Across Blank Lines:** the grip is drawn per block, and B-6 already reaches a whole loose list from a top-level glyph with the setting off.
- **Outside Changes Reaching Into Code:** switching the list around a code block would rewrite a diff's `- old` and `+ new` lines as items.
- **Siblings by Indent Text:** two items drawn at one depth would split into two groups, and number as two lists, with nothing on screen showing why.

#### Open Items

#### Prospects

- **One Right-Click Rule Across Surfaces:** a resting table cell acts where a right-click lands, while a live editor acts on the word the platform selects under it, and a resting cell's general menu offers Speech ▸ and Share ▸ beside a disabled Cut and Copy for a selection its own range doesn't hold; it should be recorded as its own issue.

---

#### Sources

- *Scouts/1 — The Switch* and *Scouts/2 — The Entry Points*, read at `cd813afdd`.
- `Core/MarkdownPM/Input/format.ts:299-352` — `setList` and `setListKind`, the two list-type writers.
- `Core/MarkdownPM/Input/listRenumber.ts:28-38` — the renumber's gate, which reads only the new marker.
- `Core/MarkdownPM/Engine/listDragModel.ts:159-209` — `renumberRun`, the one sibling walk.
- `Core/MarkdownPM/Menus/gripMenu.ts:120-185` — the grip's right-press suppression and its list dispatch.
- `Core/MarkdownPM/Menus/menu.ts:15-52` — the click-time range and the live selection the reply acts on.
- `Core/MarkdownPM/Menus/blockQuery.ts:14-21` — the `/` menu opens only on a line reading `/query`.
- `Core/MarkdownPM/Tables/cellStatic.tsx:393-409`, `:501-555` — the resting cell's click-time range and reply.
- `Core/Actions/gripMenu.ts:7-102` — `ListKind`, `LIST_KINDS`, `GripMenuContext`, `gripMenuItems`.
- `Core/Settings/frames.ts:710-724`, `Core/Settings/personalization.ts:147`, `Core/MarkdownPM/api.ts:87-111` — the setting's row, default, and editor key.
- `.claude/Features/MarkdownPM.md:24`, `:105`, `:138`; `.claude/Features/ConfigurationPM.md:151`.
