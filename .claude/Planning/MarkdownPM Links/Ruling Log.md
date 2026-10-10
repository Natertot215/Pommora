## MarkdownPM Links — Ruling Log

Every question put to Nathan during the investigation, with his answer as it stands. Where a question was asked again to settle a detail, the follow-up appears as its own entry beside the first, and the answers agree. *Links Cleanup — Continuation.md* §5 states the same rulings as one current design; this log keeps the questions that produced them.

---

### Process

**Q:** Should the broader links cleanup absorb the in-flight Link Gestures work, or build on it?
**A:** Let Link Gestures land first and plan against its commit (`75c3bcb9c`).

**Q:** Does the 200-400 line reduction count Link Gestures' lines?
**A:** No. It's measured on top of Link Gestures. "Net-negative" is the simplicity philosophy, not a number to chase.

**Q:** Which surfaces are in scope beyond MarkdownPM's link code?
**A:** All of them (the Connections layer, the `[[` picker, Paste As and the clipboard, opening, embeds, and citations) wherever leaving one out would leave odd-ones-out behavior.

**Q:** What does each neutral reviewer get?
**A:** The plan-stage neutral reviewer gets the plan, its intent, and the whole codebase, and runs on Opus at xhigh effort. The post-implementation neutral reviewer gets only the before and after of the changed files, with no docs, plan, or statement of intent.

**Q:** Does `writing-plans-v3` change to match?
**A:** No. The skill stays as it is; this effort adapts how it's used.

**Q:** What does the blind reviewer judge against?
**A:** Broad principles rather than a confirmation checklist: simplicity, cohesion, direct purpose, legibility, ownership, honest weight, and settledness, closing with one question: is the change genuinely better, or does it pass the ball forward?

**Q:** May the planner veto a plan-stage neutral suggestion?
**A:** Yes, with an open mind, and every veto is shown when the plan is presented.

**Q:** When does Nathan see the approach?
**A:** Twice. The first time is after the search and assessment, before planning begins. The second is after the plan is drafted, before any reviewer sees it.

**Q:** Are additions acceptable when the target is a net reduction?
**A:** Yes, when they're surgical and collapse drift. The overall line count still goes down, and "less stuff, fewer ways, less confusion, less complexity" stays the core emphasis.

---

### Vocabulary

**Q:** What do "connection" and "link" mean?
**A:** A connection is any link to a page or heading, whichever syntax wrote it. "Weblink" is the code's name for a link to a URL, which the docs call a "link".

**Q:** Are a MarkdownPM table cell and a property value cell the same thing?
**A:** No. A MarkdownPM table cell is a table inside a page body. A property value cell is a Link or Text value in a Table view, a Card, or the Panel. They're never conflated.

---

### The `[[` Picker

**Q:** Should `[[` open the picker when Pair Brackets is off?
**A:** Yes. It opens either way. Enter or picking a page completes it to `[[Page]]` and writes the closer.

**Q:** And `[label](`?
**A:** The same rule: it opens either way, and Enter or a pick writes the closing `)`.

**Q:** Should the picker's heading list and the missing-heading mark read the same source?
**A:** Yes, both read the index. The lag (a heading typed in another page moments ago) isn't reachable in practice.

---

### MarkdownPM Table Cells

**Q:** What does right-clicking a link in a table cell that isn't focused offer?
**A:** The link's full menu, Format included, like anywhere else. Everything in a table gets its right-click menu while the cell isn't focused, and the right-click itself must not focus the cell.

**Q:** Is "everything within a table" part of this plan?
**A:** Yes. Otherwise the plan wouldn't be complete.

**Q:** Does "everything" include the system rows?
**A:** Yes: Cut, Copy, Paste, Paste As, and Paste Without Formatting. Undo and Redo stay out.

**Q:** When a chosen row writes a change, does the cell open?
**A:** No. The change is written without placing the caret in the cell. The planner collapses the duplicate paste logic this path would otherwise need, while keeping that behavior.

**Q:** Do Rename and Edit Title / Edit Link still open the cell?
**A:** Yes. They need typing, so they enter the cell with the text selected, as they do today.

---

### Link Property Values

**Q:** Should a Link property naming a page behave like every other link to a page?
**A:** Yes. Everything about the link itself is shared; only what's genuinely specific to the data layer, the cascade, property handling, or a destructive action differs.

**Q:** Do Link properties allow an alias?
**A:** Yes.

**Q:** What does a resting property value cell offer on right-click?
**A:** Today's menu. The only change a resting Link value may take is the column's Format ▸, matching Number, Select, and Date cells, and only if the planner finds it cheap and unconstrained.

**Q:** What about a resting Text value?
**A:** Its non-link content keeps today's right-click. The links inside it get whatever the shared link menu provides naturally, with no added wiring.

**Q:** Does a Link value's menu show the link menu's Format?
**A:** No. Format is hidden on Link values, because the property's own Format decides how they look.

**Q:** Should a cell's right-click offer its column's Format?
**A:** That's an app-wide quality-of-life question for a later pass and an open item for the plan. Link cells match the other typed cells in the meantime, as above.

**Q:** What does Remove mean in the Panel's value menu?
**A:** What the row's Remove already does: it clears this page's value and hides the row on this page. It never removes the property from other pages.

**Q:** What does a click on an address value's blank space do?
**A:** It edits the value. Clicking the text follows the link. Both work the same for page and address values.

---

### Looks

**Q:** Should a link to a page look the same whichever syntax wrote it?
**A:** Yes. All unresolved links get one treatment.

**Q:** Where does Display Unresolved Links As Plain Syntax apply?
**A:** Across the board.

**Q:** Should a `§Heading` run, a pasted link over several cells, and a dropped address behave as they do elsewhere?
**A:** Yes, by riding shared behavior rather than adding lines.

---

### Menus

**Q:** Do `[[Page]]` and `[x](Page)` get the same editing rows?
**A:** Yes. `[x](Page)` being read-only today is drift.

**Q:** What are the editing rows' labels?
**A:** One rule, without exception: **Rename** edits the shown text, adding one if there's none. The second row reads **Edit Title** on a connection and **Edit Link** on a weblink. There is no "Add Title", and no label depends on an alias. This applies everywhere: page bodies, MarkdownPM table cells, Text values, and Link values in frontmatter.

**Q:** Should the copy change for "Preview" (the in-app browser) and "Page Title" (a website's title)?
**A:** No, both stay.

**Q:** Do unresolved and held `[[#Heading]]` links get a menu?
**A:** The planner decides. Nathan leans that it shouldn't add weight.

---

### Paste, Paste As, and Retargeting

**Q:** What happens when a link is pasted while the caret is inside another link?
**A:** The link it's pasted into takes the new target, wherever the caret sits in it, and keeps its own syntax. This is one rule shared across every link behavior.

**Q:** What happens to the shown text, and what about a weblink pasted into `[[…]]`?
**A:** The pasted link's alias wins if it has one. Otherwise the link keeps its own, unless Remove Title On Link Change is on. A weblink pasted into `[[…]]` becomes `[…](url)`. When nothing supplies shown text, it takes the Default Link Format.

**Q:** Should Edit Title / Edit Link follow the same alias rule as paste and the picker?
**A:** Nathan delegated this to the most coherent choice: one rule, kept easy to carve out later. All three go through the same retarget, and retyping the same target keeps the alias.

**Q:** Is it intended that Edit Link followed by pasting a URL drops the old label when Remove Title On Link Change is on?
**A:** Yes. Dropping the old label lets the website's own title be written once it resolves.

**Q:** Does Remove Title On Link Change apply to markdown links in the picker too?
**A:** Yes, to every link syntax.

**Q:** Does Paste As keep a copied link's title and heading?
**A:** Yes.

**Q:** Does Paste As ▸ Plain Text stay?
**A:** Yes. It's more literal than Paste Without Formatting, and the two share one system.

---

### Embeds

**Q:** When is `![[…]]` or `![](…)` an embed?
**A:** Only when it stands alone on its own line in a page body. Anywhere else it gets no special treatment: it's a literal `!` followed by an ordinary link. Table cells and Text values never show tiles.

**Q:** What about a second embed of an already-tiled page, a page embedding itself, or `![[Page#Heading]]` alone on a line?
**A:** Each is a link, not a tile.

**Q:** Do tiled embeds appear in the Matrix graph?
**A:** No, the Matrix stays out.

---

### Seams

**Q:** Should the page index reach the editor through the editor host now (audit F-094), rather than waiting for the side-pane editor?
**A:** Yes, now. If it needs a roster, the plan gives it a table.

---

### Working Practice

**Q:** Should the next session keep stopping to ask when an answer has two readings?
**A:** Yes. When an answer can be read two ways, contradicts an earlier ruling, or leaves a case unnamed, stop and ask. Lay out the readings side by side with a recommendation. Nathan values this pushback.
