### List Glyph Menu — Fresh-Eyes Read

**DATE:** 11-03-2026
**READ AT:** `cd813afdd`

My reading: today a list's type can be changed in two places that behave differently. The grip's **Type ▸** rewrites a whole block and counts the numbers itself, and **Lists ▸** turns selected lines into items (or back into plain lines) and leaves the counting to the editor's renumber pass. The idea adds a third entry point, a right-click on the glyph itself, which should switch the clicked item's sibling group, either only the siblings sharing its type (**Preserve List-Level Formatting** on) or the siblings plus everything beneath them (off). **Lists ▸** should then act the same way from an item's text, and all four entry points (glyph, **Lists ▸**, `/`, grip) should collapse into one switch that differs only in which items it's handed, with one numbering rule behind it. The consolidation half is the real prize: `setList` and `setListKind` (`Core/MarkdownPM/Input/format.ts:299-352`) and the grip's self-counting exception (`.claude/Guidelines/Editor-Internals.md:40`) would become one writer. Most of my questions are about where the code disagrees with the document, and about what a "group" is, since nothing in the code owns that idea yet.

Each question has a **Read:** line (what the code says, with `path:line`) and an **Ask:** or **Inferred:** line (the gap, my guess, or the call I need). Where the code contradicts a **[CONFIRMED]** item, the question opens with that.

---

#### Context Claims

1. **"Nothing handles a right-click on a glyph itself" isn't quite true today.** On a page, a right-click on a glyph opens the general right-click menu, and its **Lists ▸** acts on whatever word the browser selects. In a focused table cell, the first item's glyph sits inside the grip's press zone, so a right-click there already opens the grip menu.
   - **Read:** The general menu catches every right-click nothing else claimed (`Core/MarkdownPM/Menus/menu.ts:25-50`, lowest precedence). In a cell, the grip's zone is the list's own indent (`Core/MarkdownPM/markdown-tables.css:192-195`, `Core/MarkdownPM/lineDom.ts:30-43`), and the grip's handler claims a right-press anywhere in it (`Core/MarkdownPM/Menus/gripMenu.ts:122-137`).
   - **Inferred:** The first glyph sitting inside that zone comes from the CSS and A-5's own wording; I didn't launch the app to see it.
   - **Ask:** A-5 is therefore a change to how cells behave now (the glyph takes over a spot the grip menu answers today), rather than filling a gap. Is that understood and wanted?

2. **The "five kinds" are six drawn forms.** A `+` item is stored as a Bulleted item but drawn with an arrow, and the Lists feature doc lists `+` as its own form.
   - **Read:** `+` parses as kind `bullet` (`Core/MarkdownPM/Engine/detect.ts:602-623`) but draws as the arrow glyph (`Core/MarkdownPM/Engine/intents.ts:125-130`); `.claude/Features/MarkdownPM.md:24` lists "`+`" beside bullets and arrows. Picking Bulleted writes `- ` (`format.ts:231-232`), and the grip rewrites any marker that doesn't read exactly that (`format.ts:347-349`).
   - **Ask:** For a `+` item, which type does it "share" under Preserve, its stored type (Bulleted, alongside `-` items) or its drawn one (Arrowed, alongside `→` items)? Which row should the menu check, given the code would check Bulleted on something that looks Arrowed? And should picking Bulleted on a `+` item rewrite it to `-` (it would stop looking like an arrow)?

#### A - The Glyph Menu

3. **A-4's "by construction" doesn't reach a resting cell.** A cell you haven't clicked into draws its glyphs with its own code, deliberately without the mark the editor's glyphs carry, and sends right-clicks to its own menu.
   - **Read:** The resting glyphs come from `MarkerGlyph` (`Core/MarkdownPM/Tables/cellStatic.tsx:240-270`), without `GLYPH_CLASS`; `markdown-tables.css:197-200` says that's so they keep the text cursor and carry no drag. A right-click goes to `restingMenu` → the general menu (`cellStatic.tsx:520-535`, `:551-555`). The editor's glyphs carry `GLYPH_CLASS` (`Core/MarkdownPM/decorations.ts:161`, `:176`; `intents.ts:713`).
   - **Inferred:** Reaching the resting cell takes either marking its glyphs the same way (which also changes their cursor and invites the drag code's assumptions) or a resting-cell branch that recognizes a glyph. Both are enumeration in some form.
   - **Ask:** Which of the two is meant? And should a resting glyph's menu apply its pick without entering the cell, as the resting cell's other menu rows already do (`.claude/Features/MarkdownPM.md:104`)?

4. **A-5's "rest of the margin" may be very thin.** In a focused cell, the grip is centered in the same inset the first glyph occupies.
   - **Read:** The grip's zone is `--list-indent` wide and the grip is centered in it (`markdown-tables.css:194-195`). A left-press on the glyph already goes to the item drag before the block drag (`Core/MarkdownPM/surface.ts:30-34`, `Core/MarkdownPM/Gestures/listDrag.ts:88-109`).
   - **Inferred:** I couldn't measure how much of the inset the glyph leaves uncovered without launching the app, so this is unverified. Left-press already favors the glyph, so A-5 gives right-press the same priority.
   - **Ask:** If what's left is a sliver, is the grip menu fine reachable only from there, or should the cell's grip move or answer somewhere else?

5. **Not every item has a glyph to right-click.** When the caret sits on a bullet or checkbox marker, the editor shows the raw `- ` or `- [ ]` instead of the glyph, and an item written `- []` (empty brackets) draws no glyph at all.
   - **Read:** The bullet and checkbox glyphs are hidden while the caret is on the marker (`intents.ts:629-634`, `:688`); `- []` draws nothing (`intents.ts:121-122`). Numbers and arrows are always drawn as colored source text (`intents.ts:706-714`), so a right-press on them would place the caret in the number unless it's suppressed the way the grip suppresses its own (`.claude/Guidelines/Editor-Internals.md:26`).
   - **Inferred:** Under C-2, a right-click on a revealed marker falls to **Lists ▸** with the same result, so this may need no special handling.
   - **Ask:** Confirm revealed markers and `- []` fall through to **Lists ▸**, and that a number or arrow glyph's right-press should be suppressed like the grip's.

6. **A-3's check is automatic with the setting on.** If a pick only reaches items sharing the clicked item's type, those items always share a type, so the check always marks the clicked item's own type.
   - **Read:** The grip already checks a row only when every item in the block shares it (`format.ts:330-337`, `Core/Actions/gripMenu.ts:75`).
   - **Ask:** Confirm the check only carries information with the setting off or under a selection. Also, "the items a pick would change" depends on which row is picked; I'm reading it as "the items a pick reaches." Is that right?

7. **Lists in quotes and callouts would get their first type switch.** A quote's grip menu holds only Delete, so the glyph menu would be the only way to switch a quoted list's type besides **Lists ▸**.
   - **Read:** A quote gets its own grip widget (`Core/MarkdownPM/Menus/blockHandles.ts:49-50`), and anything that isn't a list, heading, or tile gets the plain grip menu (`Core/MarkdownPM/Menus/gripMenu.ts:71-72`, `Core/Actions/gripMenu.ts:94-95`).
   - **Ask:** Confirm "any list glyph" includes quoted and callout lists, with a blank line ending the group there as it ends numbering (`Core/MarkdownPM/Engine/listDragModel.ts:167-169`).

#### B - Which Items Change

8. **B-3 holds only when the group shares a type, or with the setting off.** B-1 says that if E were numbered, right-clicking B changes B alone; by the same rule, right-clicking E then changes E alone, which isn't "exactly as right-clicking B."
   - **Ask:** Is B-3 meant as "every glyph in the group gives the same result with the setting off, or when the group shares a type"? Or is something else intended under Preserve with mixed types?

9. **Nothing in the code defines a group, so its edges need settling.** The closest thing is the numbering walk, which steps over blank lines and deeper items and stops at anything else, including a sibling of a different type. A group needs a version that doesn't stop at a different-type sibling (B-4).
   - **Read:** `renumberRun` (`listDragModel.ts:159-196`) treats a blank line as part of the run at any depth (outside quotes) and stops at a heading, a paragraph, a shallower item, or a same-depth item of another type.
   - **Ask:** Confirm each of these: (a) nested groups span blank lines too, as top-level ones do under B-6 (`- A`, `\t- B`, blank line, `\t- E` keeps B and E together); (b) a paragraph or heading between two top-level items splits them into two groups; (c) an indented list under a plain paragraph is a group of its own, with the paragraph as its "parent."

10. **The level cap makes "nested" and "sibling" disagree with what's drawn.** Levels stop at 3, so an item indented four tabs under a three-tab item draws at the same depth as its parent.
    - **Read:** `indentLevel` caps at 3 (`detect.ts:522-529`), and lines are drawn at that capped level (`intents.ts:687`). The numbering walk compares the exact indent text (`listDragModel.ts:165`, `:176-178`), so there the four-tab item is a child; the drag's branch walk compares levels (`listDragModel.ts:49`), so there it's a sibling.
    - **Ask:** Which should the glyph menu follow: indent text (the four-tab item is nested, so with the setting off it changes, and with it on it doesn't, though it looks like a sibling) or drawn depth?

11. **B-5 produces two groups the user sees as one.** A tab-indented sibling and a two-space-indented sibling draw at identical depth, but under B-5 right-clicking one leaves the other untouched, with nothing on screen to explain why.
    - **Read:** Both read as level 1 (`detect.ts:524-529`); numbering already separates them (`listDragModel.ts:176-178`, `:191-192`), but the grip's counters don't (`format.ts:344-345`), so the grip numbers them as one sequence today.
    - **Ask:** Is the invisible split acceptable, or should a group follow drawn depth (which would also change how numbering treats mixed indentation)? Either answer should become the one rule for the switch, numbering, and the drag.

12. **The "Drag Branch Past Level 3" prospect has the same cause as question 10.** If the switch gets a "what's nested under this item" walk by indent text, the drag keeps its own walk by level, and the codebase has two descendant rules.
    - **Read:** `subBlockAt` stops at `lm.level <= head.level` (`listDragModel.ts:49`); the numbering walk uses `nestedUnder` on indent text (`detect.ts:564-565`, `listDragModel.ts:169`).
    - **Ask:** Should fixing the drag fold into this work as the one descendant walk, rather than being filed as its own issue?

13. **B-9's "as the grip's Type ▸ does today" and D-2's "one numbering rule" contradict each other.** The grip deliberately counts for itself, and it counts differently from the renumber pass in three ways.
    - **Read:** `.claude/Guidelines/Editor-Internals.md:40` names the grip "the one writer that counts for itself, because it rewrites a whole list and restarts it," and `.claude/Features/MarkdownPM.md:24` says it counts "from 1 or A." (a) The grip restarts a top-level list at 1 (`format.ts:341-345`), while the renumber pass keeps a top-level list's lowest number (`listDragModel.ts:197-201`), so `3.`, `4.`, `7.` re-picked as Numbered becomes 1-2-3 through the grip and 3-4-5 through the pass. (b) The grip counts by level, so tab and two-space siblings share a sequence (`format.ts:344-345`); the pass separates them. (c) The grip's edit carries `userEvent: 'input'` (`gripMenu.ts:166`), so the renumber pass never sees it (`Core/MarkdownPM/Input/listRenumber.ts:9`, `:17-18`).
    - **Ask:** Under one rule, the grip's behavior changes in (a) and (b). Is that understood, and which result is right for a list that begins at 3: restart at 1, or keep 3?

14. **Re-picking the current type may change nothing, and then nothing recounts.** The renumber pass only runs on an edit that changes text, and only from the lines it changed.
    - **Read:** `listRenumber.ts:16-18` returns early without a change; `:23-39` collects only changed lines. The grip skips any marker that already reads right (`format.ts:349`). A line whose marker the edit rewrote can't set a top-level list's starting number (`listRenumber.ts:36`, `listDragModel.ts:197-201`).
    - **Inferred:** With the setting on, re-picking Numbered over a gapped run changes no type (B-8), so B-9's recount needs one of two mechanisms: rewrite every reached marker (then every line counts as rewritten, and a top-level list restarts at 1) or have the switch run the recount itself (then it keeps its lowest number). The mechanism quietly answers question 13(a).
    - **Ask:** This is the fork to settle together with question 13.

15. **A run an item leaves may still keep its old numbers at the top level.** B-10 asks for the leftover run to recount, but even once the pass sees it, a top-level run keeps its lowest number.
    - **Read:** The pass decides whether to look below an edit by reading only the new marker (`listRenumber.ts:28-38`), so turning a numbered item into a bullet doesn't recount what's below. A top-level run starts at its lowest number (`listDragModel.ts:197-201`), while a nested one starts at 1 (`:199-200`).
    - **Ask:** With `1. a`, `2. b`, `3. c`, and only b turned into a bullet (through a selection, under B-7), is `1. a`, `- b`, `3. c` the intended top-level result, while the nested equivalent becomes `1.`, `-`, `1.`?

16. **B-4 renumbers siblings the pick didn't target.** With the setting on, B and E bulleted, and a numbered `1.` sibling between them, picking Numbered on B makes all three one numbered run: 1, 2, 3, so the middle sibling's number changes too. Picking Alphabetical instead gives `A.`, `1.`, `A.` as three separate runs.
    - **Ask:** Are both outcomes what you'd expect?

17. **Picking Checklist unchecks every checked item today.** The grip writes `- [ ] ` and rewrites any marker that isn't exactly that, including `- [x]`.
    - **Read:** `format.ts:227-228`, `:347-349`.
    - **Ask:** Are checked and unchecked one type? With the setting off (B-8 sets "every differing item it reaches") or through the grip (D-1), should a Checklist pick ever uncheck an item that's already a checklist item?

18. **B-7's selection rule reads two ways.** Take the example with B and E bulleted and C and D numbered, select B through E, and right-click C's text inside the selection.
    - **Ask:** Which is meant: (a) the selection narrows the usual reach, so only C and D change (C's group, filtered to its type, intersected with the selection); or (b) the selection is the reach, so all four change regardless of type or setting? Under (a), which item's group sets the reach for a **Lists ▸** pick over a selection, the item under the pointer?

19. **A selection mixing plain lines and items needs one rule.** C-1 keeps plain lines becoming items, while items follow the glyph's rules.
    - **Ask:** With the setting on, selecting a plain line, a bulleted item, and a numbered item and picking Checklist: do all three become checklist items, or does the numbered item stay because Preserve filters items (but not plain lines) by type?

20. **A glyph right-clicked outside an existing selection needs a stated result.**
    - **Read:** The general menu already treats a click outside the selection as a click with no selection (`menu.ts:33-36`).
    - **Ask:** Should a glyph outside the selection act on its group and ignore the selection, and should the selection survive the pick? And does a selection that covers an item's text but not its marker count as the glyph being "inside" it?

#### C - Lists ▸

21. **C-2 splits one menu's reply between two ranges.** The menu works out where the click landed but acts on the live selection when the pick returns, by which point the browser has selected the word under the pointer.
    - **Read:** The click-time range is computed at `menu.ts:32-36` and used only to set the checks; the pick runs on the live selection (`menu.ts:17`, `:22`). The Rejections keep Format rows acting on that selected word.
    - **Inferred:** After this work, list rows act where the click landed and Format rows act on the selected word, inside one reply function. That's an exception, and the constraints both say exceptions carry their reason where a reader meets them and say the comment count can't grow.
    - **Ask:** Is rewriting the existing comment at `menu.ts:32` to cover both the intended way to record it?

22. **C-3 removes the only menu path back to plain lines.** Today, picking the type every selected line already has removes the markers; after C-3, nothing in any menu turns items back into plain text. **Heading ▸** keeps a Paragraph row for exactly that.
    - **Read:** `format.ts:302`; Paragraph is `HEADING_LEVELS`' first row (`Core/Actions/gripMenu.ts:26-27`), offered in **Heading ▸** (`Core/Actions/editorMenu.ts:153-158`).
    - **Ask:** Is losing the way back accepted, with Backspace on the marker as the only route?

23. **C-5 overlaps an open issue.** In a cell, **Lists ▸** on a line starting `> ` keeps the `> ` in front, so the result `> - text` draws as plain text, and the menu then reports it as a list.
    - **Read:** `setList` splits off the quote prefix (`format.ts:275`, `:306`); the resting cell reads markers without prefixes (`cellStatic.tsx:282`); the menu's check reads them with prefixes (`Core/MarkdownPM/Input/formatState.ts:19-21`). The grip and the renumber pass also read the prefixed form in cells (`format.ts:316-327`, `listDragModel.ts:8`). `.claude/IssuesPM.md:394` (I-037) already names `format.ts`'s **Lists ▸** among the readers that should take the surface's scope, and I-037 waits for a fourth scope.
    - **Ask:** Should the one switch take the scope now, which settles part of I-037 early, or should C-5 wait with I-037? If it lands now, I-037's entry needs its list of sites updated.

24. **C-4's check would need the setting where the menu is asked for.** The general menu's check comes from the line at the click alone today.
    - **Read:** `formatState.ts:20-21`, `:37`.
    - **Inferred:** Computing it from the reach means the request reads the setting and walks the group, once per right-click, which is fine against the cost rules since it runs on demand.
    - **Ask:** None beyond confirming the check follows the same reach as the pick, including under a selection (question 18).

#### D - The Grip and the Switch

25. **Two action names exist for one pick.** The grip names a list-type pick `listKind:`, while **Lists ▸** and the `/` menu name it `list:`.
    - **Read:** `Core/Actions/gripMenu.ts:20`, `Core/Actions/blockMenu.ts:10`, `:27-29`.
    - **Ask:** Under D-2, should these become one name?

26. **The glyph menu could reuse the grip's menu plumbing.** The grip menu is built in Core and popped through a generic native-menu call, so the glyph menu needs no new host channel.
    - **Read:** `Core/Pages/editorHost.tsx:101-102` (`popMenu(gripMenuItems(ctx))`); the grip's Type ▸ rows are built at `Core/Actions/gripMenu.ts:68-78`. The test harness stubs `grip` (`Core/Testing/editorHarness.ts:125`).
    - **Ask:** Should the glyph menu be the grip's list context without Delete, built from the same rows as Type ▸, so the five rows are defined once? Or does it need to be its own menu?

27. **The `/` menu only ever hands the switch an empty line.** D-2 lists it, but it never runs on an existing item.
    - **Read:** It opens only on a line reading `/query` with the caret at its end (`Core/MarkdownPM/Menus/blockQuery.ts:14-20`), never behind list markers or in cells (`.claude/Features/MarkdownPM.md:142`), and clears the query before running the pick (`Core/MarkdownPM/Menus/useBlockMenu.ts:41-50`).
    - **Inferred:** D-2 holds for it trivially once **Lists ▸** goes through the switch, since they already share the dispatch (`useBlockMenu.ts:50`).
    - **Ask:** Confirm nothing more is expected of the `/` menu.

#### E - The Setting

28. **Is the setting earned?** It adds a stored key, a settings row, an editor-setting key, a documentation row, and a read in two places (the live editor and the resting cell).
    - **Read:** Defaults at `Core/Settings/personalization.ts:136-160`, the row at `Core/Settings/frames.ts:709-725`, editor keys at `Core/MarkdownPM/api.ts:87-111`, the doc table at `.claude/Features/ConfigurationPM.md:151`.
    - **Ask:** What tells you someone will turn it off? Were a fixed reach (just Preserve's behavior) or a modifier on the right-click (say, ⌥ for "with nested") weighed? Either would drop the setting and its plumbing.

29. **The setting's stored key needs a name.** The row's label is settled; the key the file stores isn't.
    - **Ask:** Something like `preserveListLevels`, or do you have a name in mind? Also, the label says "Level," but under B-5 a group follows indent text rather than the 0-to-3 level in *§Concepts*, so the two may describe different things.

#### Documentation

30. **The Guidelines sentence goes away entirely.** `.claude/Guidelines/Editor-Internals.md:40` states the grip's counting exception, which D-2 removes, and `.claude/Features/MarkdownPM.md:24`'s last sentence describes both the grip's and **Lists ▸**' current behavior.
    - **Ask:** Does the "one or two sentences" cap on documentation cover Guidelines, or only `Features/`? Rewriting both passages is likely more than two sentences combined.
