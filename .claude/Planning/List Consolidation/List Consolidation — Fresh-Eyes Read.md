### List Consolidation — Fresh-Eyes Read

**DATE:** 11-05-2026
**STATUS:** ACTIVE
**READ AT:** `b7f2f17a5`

#### How This Was Read

This read works from *List Consolidation — Decisions & Intention* and the source alone, as the log's *Fresh Eyes* constraint asks.

- **Opened:** `Core`, `Desktop`, and `UIX`, plus the List Types Drive and Text Property Drive scripts and their `.claude/scripts/README.md` entries, since A-6 rests on a drive.
- **Left Closed:** everything else under `.claude/Planning/`, the Scouts and the Word Rule Prototype included, and the Issues index, Features, Guidelines, Context, and History. The issue numbers therefore come back as questions.
- **Run:** the app wasn't launched. Two throwaway scripts ran from the scratchpad against the repo's own `node_modules`, one reading sample lines through micromark with GFM and one trying CodeMirror's word characters. Both are gone, and each result below is marked **Probed**. Every other behavior here is read from the code rather than observed.

#### What the Tree Confirms

- The comment count reads 3,511 at `b7f2f17a5`, by the log's command.
- `9ce2d2b2b..89dba6b41` nets +476 production lines (+1,159 / -683).
- `detect.ts:552`, `intents.ts:133-143`, and `edits.ts:54` hold what *§Sources* says they hold, and `fc234155b` is the 06-25-2026 single-live-cell commit.
- `setList` is the one type switch, and `editFor` routes the glyph, Lists ▸, the grip, and the `/` menu into it.
- A code block's list is read by a pick and by no key: `listReach` reads from the anchor line, while `listLineAt` and `smartBackspace` read from `'outside'`.
- The block model ends a list at a blank line and the list model walks past one.
- A Text pane and a one-line field are the same `ValueEditor` at `scope: 'text'`, differing only by `oneLine`.
- A column's Style submenu does read Format ▸ for Date & Time and Link columns, by `styleLabel`.

#### Already Decided by the Tree

These follow from the decisions with one obvious direction, so they need an answer only if they're wrong.

- **B-5:** `blockModel.ts:46-47` already stops at a blank line, so two readers move to the answer a third already gives. `continuesList` drops from three answers to two, and B-6's carve-out already exists, since `rolesAgainst` reads a fence's blank line as its opener.
- **B-1:** `listGlyphOf`'s null, `drawnKind`, `format.ts`'s import from the drawing layer, and the glyph checks at `CellEditor.tsx:62` and `:96` and `cellStatic.tsx:288` all leave.
- **D-2:** `firstItemOf` leaves, and F-1's run past the document's end leaves with it.
- **D-4:** `repicked` and `rewritten` leave `renumberRuns` and `listRenumber`.
- **C-4:** the test already sits on every fenced line, as `FenceInfo.name === 'Markdown'` with no `tally` (`detect.ts:104-115`), so no new reading of the fence is needed.
- **C-3 (Inference):** plain code would behave as math and tables already do under `inSealedLine`, and only Markdown code blocks keep `readsFrom`'s read-from-inside rule.
- **E-6:** `joins`, `JOINED`, `joinedWords`, `wordPress`, `grouping`, and `byWords` all leave if the mechanism holds. Question 27 tests that.

#### What the Log Doesn't Mention

These need no decision, and planning should know them.

- **A Third Reader of a List's End:** `railIntents` (`intents.ts:402`) answers separately from both models. It takes raw lines and no scan, so it can't see a fence, which is the direct cause of F-1's flush-line rail.
- **Loose Code Outlives Loose Lists:** `rebuildMove`'s `looseSource` and `looseSlot` also serve every non-list block drag, where `moveRange` passes both true (`blockDrag.ts:83`, `pageEditor.ts:52`). Only `dropChanges`' computing of them leaves. `moveRange` also lives in `listModel.ts` while serving no list.
- **List Keys Are Written Twice:** the page's sit in `markdownInput.ts`, a cell's in `CellEditor.tsx:186-215`, and the two disagree on whether a marker nothing draws is a list. G-1 would make a third unless they merge.
- **A Carried Fence's Indent Reads as Nesting:** `indentLevel` counts the whole leading indent, so a list in a fence under an item starts at level 1 or deeper. By the code it can't keep a start number today, since a nested run counts from 1. Once C-1 opens the block to keys, it would also reach `MAX_NESTING_LEVEL` early, and Shift+Tab and Backspace could eat the fence's own indent. C-1's "as any other list" needs levels measured from the fence's body.
- **The Menu Can't Tell the Two Code Blocks Apart:** `EditorMenuRequest` carries `block: 'code'` for both, so C-5 needs a new signal across the host boundary.
- **The Word Rule Has a Second Home:** `cellStatic.tsx:574` builds a bare `EditorState.create({ doc: text })` for a resting cell's word, and a rule carried by editor configuration won't reach it.
- **G-1 Touches More Than the Pane:** `editorMenuRequest.scope` crosses to Desktop, and `useConnectionAutocomplete`, `linkSettle`, and the scope-keyed cache in `docCache.ts:84` all take the scope.

---

#### Questions

##### A — Scope and Process

**1. What Does [INFERRED] Carry?** The log tags 10 decisions INFERRED and 30 CONFIRMED. Who inferred those 10, and may planning overturn one on evidence, or do they bind as the others do? Roughly a third of the questions below touch one.

**2. What's the Baseline for Net-Negative Lines?** Is it measured from `b7f2f17a5` across the whole work, G-1 through G-3 and E-4's new menu included, since those add behavior? Or is the aim to pay back some of the +476?

**3. Does the Comment Cap Mean Lines or Volume?** The command counts lines, and this codebase's comments are single long lines; `listRenumber.ts:12` runs a full paragraph as one count. A comment could double in length and leave 3,511 untouched. Is the line count the whole intent?

**4. Does the Text Property Drive Get Rewritten Too?** A-6 names only the List Types Drive, yet `Text Property Drive/live-drive.mjs:151` pins `- milk` as prose and `:532` pins "no list" in the pane, so section G can't be proven by the named drive. Separately, should the rewritten List Types Drive keep its phase gate (`POMMORA_LGM_LANDED`) under a new name, or lose it?

##### B — What a List Is

**5. What's the Actual Rule Behind "As Standard Markdown Reads It"?** Taken literally, B-1 reaches further than the log's examples. **Probed:** GFM reads `* x` and `1) x` as lists and a lone `-` as an empty item, and reads `A. x` and `→ x` as paragraphs. `detect.ts:551` keeps `*` as prose on purpose, and B-7 keeps `A.` and `→`. Does B-1 settle only what `+` and a box's spelling mean, or do `* x` and `1) x` become lists?

**6. B-3 Contradicts B-1. Which Wins?** **Probed:** GFM reads `1. [ ] a` as an unchecked task item with the text `a`, and `2. [x] foo` as a checked one, so GitHub and Obsidian draw a box where B-3 shows `[ ]` as text. The fence highlighter agrees with GFM (`codeHighlight.ts:55`), so inside a Markdown code block the coloring would contradict B-3. Is B-3 a deliberate departure from B-1?

**7. Which No-Space Spellings Go Plain?** B-2 names `-[]`. Today `-[ ] x` and `-[x] x` read as checkboxes and `1.[ ] a` as a numbered item, and all three are paragraphs in GFM (**Probed**). Do they all go plain? And `+[]` still triggers the shorthand and writes `+ [ ] ` (`edits.ts:54`), which B-4's "only `-`" would change. Does `+[]` stay as a shorthand, writing `- [ ] `, or leave?

**8. How Far Does "One Classification" Reach?** The log counts three. The tree also holds `LIST_LINE` and `LIST_ITEM` (`docScan.ts:105`, `:248`), `BARE_MARKER` and `BARE_TASK` (`Tables/codec.ts:17-18`), `shorthandCheckboxRe`, `railTypeClass`, `listLineClass`, and the highlighter's `TaskList`. The two in `docScan.ts` look like incremental-scan boundaries, and they disagree with the grammar on `*`, `1)`, `A.`, and `→`. Are they in scope, or do they stand as a different job?

**9. Has B-5's Cost Been Measured?** The ruling stands; this asks for its price. **Probed:** GFM reads `1. a`, blank, `2. b`, blank, an indented paragraph, blank, `3. c` as one three-item list, so Pommora would disagree with every other Markdown reader here, against the Legibility lock's spirit. The NexusOS count in *§Sources* measures marker types and says nothing of blank-separated items, the one pattern B-5 changes, and it covers "human-written" files only. How many files hold that pattern, agent-written ones included?

**10. What Happens the Moment a Blank Line Appears or Disappears?** Add a blank line inside `1. 2. 3. 4.` and the lower half keeps `3. 4.` under B-10, so Enter in the upper half then writes a second `3.`. Remove that blank line and the two lists merge, which today's filter recounts on a delete and on nothing else. Are both outcomes intended?

**11. What Does "Drags Stop There" Mean?** It could mean an item's drag carries nothing past a blank line, or that an item can't be dropped into a different list across one. `collectBoundaries` offers every item on the page as a slot today. Reading: only the first.

**12. Which Blocks Ride an Item?** B-6 excepts a blank line inside a code block, while `openerOf` treats math the same way. B-10 says "a block directly under an item", and `continuesList` calls any indented line nested: a heading, a quote, a table row. Which blocks ride, and does a blank line inside carried math count?

**13. What Parity Does B-7 Actually Add?** The log names no gap, and B-8 and B-9 keep two differences by decision, which sits oddly beside "no type carved out". The gaps visible in code are small: a lettered run past Z wraps to `A.`, so `Y. Z. A.` recounts from A, because the start is the smallest ordinal (`listModel.ts:282`), and neither `A.` nor `→` is in `LIST_LINE`. What was B-7 written against?

**14. Which Names Survive?** The log uses Lettered and Alphabetical for one type, and the code says `alphabetical`. `LIST_KINDS` gives each type two labels, so the `/` menu reads Bullet List and Task List where the glyph menu reads Bulleted and Checklist. Does "each list type one definition" reach the visible names?

##### C — Code Blocks

**15. Do the `/` Menu and the Grip Open Inside a Markdown Code Block?** C-1 says "every list behavior a key or menu offers". `blockQueryAt` refuses every fenced line, and a code block's grip offers only Delete. Reading: the `/` menu opens, and the grip stays as it is, since it sits on the fence and C-2 says reach comes from inside.

**16. How Much Markdown Does a Markdown Code Block Read?** Are lists the only thing read? Two cases need a ruling: a `` ```js `` fence nested inside a ```` ````md ```` block, whose list-shaped lines would read as list items under C-1, and a `> - item` line, which the marker scan reads through its quote prefix.

**17. Does "Every Gesture" in C-3 Cover Non-List Rows?** C-5 removes list rows, yet `setHeading` and `setBlock` read no fence, so by the code Heading ▸ writes `## ` into a plain code line and the quote pick writes `> `. Do those rows leave too? And which rows should a Markdown code block keep?

##### D — Picks and Menus

**18. D-3 Has Two Readings, and One Collides.** It calls the grip's Type ▸ "the one site that says otherwise", but the editor's right-click reads Lists ▸ (`editorMenu.ts:162`) on pages and cells, and *§Context* names it. That same menu already holds a Format ▸ for inline marks (`:147`), so renaming Lists ▸ gives two Format ▸ rows. Which is it?
- (a) Only the grip changes, and Lists ▸ stays.
- (b) List rows fold into the existing Format ▸.
- (c) The inline Format ▸ takes another name.

**19. What Does a Caret Pick Reach?** D-2's triad covers a glyph, a grip, and a selection, and leaves out a caret: Lists ▸ on text, and the `/` menu. Reading: a caret acts as its glyph does. Also, with Preserve off a glyph's reach includes everything nested, which is wider than *§Concepts*' Group. Should Group or D-2 be reworded?

**20. Whose "Selected Word" Is D-5?** It could mean the word a right-click seats, a word selected beforehand, or both. Today they differ: the first right-click on a word acts as a caret and reaches the group, while a second right-click on that same seated word lands inside a selection and reaches one item. "Count as its item" reads as one item, "keep acting at the click" reads as the group, and D-2 says a selection acts on what it touches. Which reach is wanted, and does a two-word selection inside one item count?

**21. What Does the Grip's Check Show on a Mixed Block?** `contextFor` reads one item's type through the setting. Under D-2 the pick reaches the whole block. Reading: no row is checked when the block holds more than one type.

##### E — Right-Click and Words

**22. How Literal Is "The Same Menu" in E-1?** A live cell's menu holds Undo, Redo, and Select All, while a resting cell's holds only Cut, Copy, and Paste (`Desktop/Actions/editorMenu.ts:80-97`). Do those rows join a resting cell's menu? With no editor mounted, what would Undo undo, and what would Select All select?

**23. What Happens to a Seated Word When the Menu Closes?** E-2 sends typing to the page's caret. Does the word's highlight clear on dismissal? And if the page held a selection rather than a caret, does typing replace it?

**24. Which "Same Selection Look" Does E-3 Mean?** The editor's look is a pill drawn by a layer inside CodeMirror, which can't draw for a non-editor element, and `selectionPills` skips one too. A resting cell's highlight is invisible because `markdown-pm.css:1168` clears `::selection` under `.cm-content`. Does E-3 want the pill's shape, or is the same color enough? With the setting on, a resting cell already shows the native look.

**25. Which Surfaces Count as Read-Only for E-4?** Hosts found: `InfoButton`, `PageReaderWindow`, `MarkdownTile` and `PageTile` while not editing, and a read-only table's cells. Today some get no menu (`Desktop/Actions/editorMenu.ts:136` returns on a non-editable target) and some get the full system menu. Do resting Text and Link values count? Do the Speech and Share rows go? Is Copy disabled with nothing selected? Do a link's and a heading's own menus still win on those surfaces?

**26. Is E-5's Rule "No Space" or "A Letter on Both Sides"?** The code uses letters or digits on both sides; the log says "no space around it". They differ on `students'.`, `'quoted',`, and `a'(b)`, where the literal reading would join punctuation into the word. And does the rule hold inside plain code, where `joins` applies today?

**27. Does the Prototype Handle `'don't'`?** Today that reads `don't`. **Probed**, on a stand-in rather than the prototype itself: a position-answered `wordChars` read `'don't'` with both quote marks, in `'don't'` and in `say 'don't' now`, because CodeMirror applies one answer to the whole scan. `textScope.test.tsx:150` holds no quoted contraction, so "passes every word test" wouldn't catch it. Has the prototype been tried on this, and should the case be pinned?

**28. What Is E-7 Pointing At?** Which right-click can write into a marker today, and which guards are candidates? Reading from the code: `clickInside`'s glyph arm, `keepSeatedSelection`, and the `isConnected` and `doc === opened` checks, though the log's test is a probe this read can't see.

##### F — Defects

**29. Is `2. [x] foo` Fixed by B-3 or Moved?** Under B-3 it's a numbered item whose text is `[x] foo`. A Bulleted pick then writes `- [x] foo`, which reads as a checkbox, so Bulleted lands a Checklist item. Is that accepted?

**30. Which Way Does the Callout Head's Glyph Go?** Either the head stops reading a marker and draws none, or the glyph starts working. F-1 says "at its cause" and both qualify. Reading: it stops drawing.

**31. Does Numbering Get More Than F-1's Block Drag?** *§Context* points at `listRenumber` working out meaning "from the edit's shape", yet no decision changes that design. Should writers state their intent, or does the inference stay? Also, the filter runs only for `input.list` and `delete`, so a paste into a numbered run leaves stale numbers, though `listRenumber.ts:12` says "every edit that reshapes a sequenced run". Is paste in scope?

##### G — Text Properties

**32. What Do Enter, Shift+Enter, and Tab Do in the Pane?** Today Enter saves and closes the pane, Shift+Enter breaks a line, and Tab does nothing (`ValueEditor.tsx:126-135`). A cell already settled the same conflict (`CellEditor.tsx:186-215`): Enter continues on a list line and leaves off one, Tab nests only in a list, and Shift+Enter exits from the list's last item. Reading: the pane takes the cell's keys, with "leave" meaning close. Is that right? On a page, Shift+Enter is the exit from any item.

**33. What Else Is "Full Regard"?** Does the pane take Lists ▸ and the glyph menu, drag, the grip and its Delete, rails, the `/` menu, and Preserve List-Level Formatting? A cell holds most of these, the `/` menu aside, and it's a small floating surface.

**34. Is the Pane Simply a Cell?** *§Concepts* gives a cell "lists and inline marks", which is what G-1 wants, and it leaves `#`, `>`, and fences as literal text. Does the pane adopt cell scope, with `'text'` left for the one-line field, or is it a surface of its own? Reading: it adopts it, since a fourth scope adds a case everywhere `MarkdownScope` is switched on. *§Concepts*' Scope line needs rewording either way.

**35. Why "On a Value's First Line" in G-2?** Is the point that a typed `- item` in the plain inline field makes a list at rest? That field shows and edits the first line alone, trimmed, with the lines behind it riding through (`parseEditorValue.ts:14`, `:18-25`). So a three-item list shows as a plain `- milk` while editing and a glyph at rest, and G-5 accepts that. Is that the intent, and does a nested first line losing its indent to the trim matter?

**36. How Does G-3 Draw With One Line Showing?** `table.css:251` hides every line after the first, on every surface, so a list at rest shows one glyph and its first item. Is that the outcome, or should lists show whole in cards? Also, does the Properties panel count, since it shares `TextCell`, and is a box at rest clickable, as a resting table cell's is?

##### Vocabulary an Outsider Lacks

**37. What Are I-036, I-071, and I-073?** Only I-073 appears in code, at `format.ts:363`, as the restart D-4 removes. What does A-3 decline to target?

**38. What Are the Results Matrix and the Log A-2 Sets Aside?** Does the List Glyph Menu's log hold anything that was a real ruling rather than an agent's record, and so worth keeping?

**39. What Is the Metadata Picker Plan's Shape?** A-5 uses it as the standard. *§Sources* lists five Scouts and no investigation, yet F-1 cites "the investigation". Are those the same work?

**40. Is "The Live Probe" Scout 5?** E-1, E-7, and *§Rejections* lean on it, and "seven ways" is unexplained.

**41. Where Does *Scouts/Planning/Word Rule Prototype* Point?** It reads as a path but doesn't match *§Sources*' `Scouts/` files, and "in place" doesn't say against which tree.

**42. What Was the Links Cleanup?** It carries E-1, the one binding behavior, but the log gives the ruling's wording and not what it was deciding.

**43. Are These Readings of Undefined Terms Right?**
- **Pick:** choosing a list type from any menu.
- **Seat:** placing a selection without focusing an editor.
- **Box:** a checkbox's `[ ]`.
- **Rail:** the vertical outliner line under a nested list.
- **Ride and Carry:** a block belonging to the item above it.
- **Flush Line:** a line with no indent.
- **Fold:** merging a review's findings into the plan.
- **Neutral Reviewer:** an agent given no planning context.
- **Drive:** a script running the real app over CDP.
