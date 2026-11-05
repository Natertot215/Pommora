### List Glyph Menu — Results

The Interaction Sweep drove the List Types Drive and headless probes through every gesture, surface, and list shape of the matrix on 11-04-2026, each case read against the decision it should prove; the results read at `e989eb865`, after the fixes for what the sweep found at `ecf5e75ee` and Phase 3's checkpoint folds.

**Coverage:** a drive item is `g<group>` in `.claude/scripts/List Types Drive/live-drive.mjs`; a probe ran the real handlers through jsdom (`editorMenu`, `gripMenu`, and the resting cell mounted as `editorMenu.test.tsx` and `cellRestingMenu.test.tsx` mount them) or the pure path (`setList` and `editFor` landed through `landEdit`, `dropChanges`, `blockAt`).

**Collapsed Surfaces:** a page tile, a callout, a quote, and the read-only reader mount the same `editorMenu(scope)` and `gripMenu(scope)` as a page, through `surface.ts` `inlineSurface` → `editorBase` → `MarkdownEditor` (`PageView`, `PageTile`, `PageReaderWindow`), so they differ only in shape or in `view.state.readOnly`; a tile is a `ReactWidget`, whose default `ignoreEvent` keeps the outer editor from also answering its glyph. A live cell mounts the same handlers through `CellEditor` with scope `'cell'`, where `readsFrom` is always true and `splitPrefix` reads no quote. The `'text'` scope draws no glyph and offers no **Lists ▸**, so it holds no case.

#### A — The Glyph Menu

- **A Page Glyph's Menu:** A-1 A-2 A-3 · g1 · B's glyph lists Bulleted ✓, Numbered, Alphabetical, Checklist, Arrowed, with no Delete · **Holds**
- **Every Glyph Kind on a Page:** A-1 · probe · a bullet, number, letter, arrow, `+`, checked box, quoted, and callout glyph each ask the glyph menu with their own type checked, prevent the default, and never ask the general menu · **Holds**
- **A Pick From Each Kind:** A-1 · probe · `1.`, `A.`, `→`, `+`, and `- [x] one / - [ ] two` → Numbered give `1. one\n2. two`; a quoted list gives `> 1. one\n> 2. two`; a callout's list numbers under its untouched head · **Holds**
- **Each Glyph Re-Picked:** A-1 B-8 B-12 B-13 · g1 · `1. one\n2. two`, `- [ ] open\n- [x] done`, `→ a\n→ b`, and `+ p` check their own type, and picking it leaves the text · **Holds**
- **A Right-Press Seats No Caret:** A-9 · g1 (number, arrow), probe (every kind) · the right mousedown is prevented and the caret stays where it was · **Holds**
- **A Ctrl-Click on a Glyph:** A-9 · probe (`listDragTap.test.tsx`) · a macOS Ctrl-click is a secondary click, so the glyph's press handler only suppresses the caret seat, a checkbox doesn't toggle, and the type menu's pick lands; a resting cell ignores the secondary click alike · **Holds**
- **A Revealed Marker:** A-9 C-2 · g1 · with the caret on A's marker, **Lists ▸** Numbered from the revealed `-` → `1. A … 2. F`, as A's glyph acts · **Holds**
- **An Item Drawing No Glyph:** A-9 · g1, probe (resting) · `- [] bare` → **Lists ▸** Task List from its text → `- [ ] bare`; a resting `- [] a` → `- [ ] a` · **Holds**
- **A Live Cell's Glyphs:** A-4 A-5 · g2, probe · the first glyph opens the type menu and the inset left of it the grip's; `- x<br>- y` → Checklist from y's glyph → `- [ ] x<br>- [ ] y` · **Holds**
- **A Live Cell's Pick, Then ⌘Z in the Cell:** A-7 · g2 · `- a<br>- b` → Numbered from b's glyph → `1. a<br>2. b`; ⌘Z inside the cell, forwarded to the page's history, restores `- a<br>- b` · **Holds**
- **A Live Cell's Pick, Then Escape and ⌘Z:** A-7 · g2, probe (`tableExit.test.tsx`) · Escape leaves the cell through the dismissal stack onto the line after the table, as arrowing out does, and a line it creates at the document's end stays out of history, so ⌘Z restores the pick; a layer above the cell, such as a glance, closes first, and an outside press leaves focus where it landed · **Holds**
- **Every Glyph a Resting Cell Draws:** A-4 A-8 · probe, g3 · a bullet, number, letter, unchecked and checked box (through its inner box), arrow, `+`, and gapped number are each caught by `.md-list-item > [data-src]`, ask the glyph menu with their type checked, and commit without entering the cell · **Holds**
- **A Resting Pick, Then ⌘Z:** A-7 A-8 · g3 · `A. a<br>B. b`, `- [x] a<br>- [ ] b`, `+ a<br>+ b`, and nested `- a<br>\t- b` → Numbered (`1. a<br>2. b`, nested `- a<br>\t1. b`), then one ⌘Z restores each; the page editor keeps focus because the resting cell prevents its right mousedown · **Holds**
- **A Resting Re-Pick:** A-8 B-12 · probe · `- [x] a\n- [ ] b` → Checklist commits nothing · **Holds**
- **A Resting Cell, Read-Only:** A-6 · probe · nothing is asked · **Holds**
- **A Page Tile at Rest:** A-4 A-6 · g1 · a tile is read-only until a click begins editing; neither its bullet nor its number glyph opens the type menu · **Holds**
- **A Page Tile While Editing:** A-1 A-4 A-7 · g1 · the tile's glyph opens the type menu; Numbered from b → `1. a\n2. b\n\nText.\n\n1. c\n2. d` in the embedded page while the host page stays `![[LT Embedded]]`; ⌘Z in the tile restores it · **Holds**
- **The Read-Only Reader:** A-6 · probe; collapsed onto the tile at rest through `view.state.readOnly` in `menu.ts` and `gripMenu.ts` · the glyph is drawn, nothing is asked, and the right-press is still suppressed · **Holds**
- **Quotes and Callouts:** A-10 B-11 · g1, probe · `> - q1\n> - q2\n>\n> - q3` from q2 → `> 1. q1\n> 2. q2\n>\n> - q3`; a quoted nesting follows the setting; a callout's head is never rewritten · **Holds**
- **⌘Z After a Page Pick:** A-7 · g1, probe · one ⌘Z restores the example · **Holds**
- **The Document Changed Under the Menu:** A-1 · probe · an edit landing while the glyph menu is up drops the pick · **Holds**
- **No Glyph Inside a Code Block:** A-4 C-7 · probe · a fenced list draws no glyph, so its list answers only **Lists ▸** · **Holds**

#### B — Which Items Change

- **On, From B:** B-1 · g1, probe · `- A\n\t- B\n\t\t- C\n\t\t- D\n\t- E\n- F` → `\t1. B … \t2. E`, A, C, D, and F unchanged · **Holds**
- **Off, From E:** B-1 B-3 · g1, probe · → `\t1. B\n\t\t1. C\n\t\t2. D\n\t2. E` · **Holds**
- **A Quote Under an Item, Drawn and Not:** B-1 B-14 B-15 · probe (mounted editor, drawn glyphs read from the DOM) · `- a\n  > - q\n  > - r\n- b` draws `q` and `r` as a quoted list, so Numbered from a, off, numbers them and b continues past the quote, while on leaves them; with a tab or four spaces before `>`, the lines draw as text, read as a's continuation, ride a's drag, and no pick, Enter, Tab, or Backspace treats them as items · **Holds**
- **A Flat List:** B-1 · probe · `- a\n- b\n- c` from b → `1. a\n2. b\n3. c`, on and off · **Holds**
- **A Leaf Group:** B-1 · probe · from C → only C and D numbered, on and off · **Holds**
- **The Top Level:** B-1 B-6 · probe · from A → on `1. A … 2. F`; off every item numbered · **Holds**
- **Same Depth Under Another Parent:** B-2 · probe · `- A\n\t- B\n- F\n\t- G` from B → G unchanged, on and off · **Holds**
- **Mixed Types:** A-3 B-1 · g1, probe · from B in the mixed example → B and E numbered beside C and D; from C → Bulleted takes C and D; off checks nothing, on checks Bulleted · **Holds**
- **Past a Differently Typed Sibling:** B-4 · probe · `- a\n1. b\n- c` → Checklist from a → on `- [ ] a\n1. b\n- [ ] c`, off all three · **Holds**
- **A Re-Pick Across a Bullet:** B-4 B-9 · probe · `1. a\n- b\n2. c` → Numbered from a, on → `1. a\n- b\n1. c`: the pick reaches a and c, re-picked runs restart, and the bullet splits the run · **Holds**
- **A Loose List:** B-6 · probe · `- a\n\n- b\n\n- c` from b → `1. a\n\n2. b\n\n3. c` · **Holds**
- **A Bullet List a Blank Above a Numbered One:** B-6 B-9 · probe · `- a\n- b\n\n1. c\n2. d` from b → `1. a\n2. b\n\n3. c\n4. d`: blank-separated items are one group and, once numbered, one run, as CommonMark reads a loose ordered list · **Holds**
- **A Loose Item's Paragraph:** B-14 · probe · `- a\n\n  para\n\n- b` from b or from `para` → `1. a\n\n  para\n\n2. b` · **Holds**
- **A Wrapped Line:** B-14 · probe · `- a\n  wrapped\n- b` from `wrapped` → `1. a\n  wrapped\n2. b` · **Holds**
- **`+` Items:** B-13 · g1, probe · `+ a\n+ b` → Bulleted → `- a\n- b`; `+ a\n→ b\n- c` from a → the two Arrowed items become bullets; `+` checks Arrowed · **Holds**
- **`- []` Items:** A-9 B-1 · probe · `- [] x\n- [] y` → Checklist → `- [ ] x\n- [ ] y`; `- a\n- [] b\n- c` → Numbered from a, on → `1. a\n- [] b\n1. c`, since the undrawn item is its own type and splits the run · **Holds**
- **Checked Boxes:** B-12 · g1, probe · re-picking Checklist on `- [x] a\n- [ ] b` changes nothing; Bulleted → `- a\n- b` · **Holds**
- **Gapped and Past 1:** B-9 · probe · re-picking Numbered on `3. a\n5. b\n9. c` → `1. a\n2. b\n3. c`, on `5. a\n6. b` → `1. a\n2. b`, and Alphabetical on `A. a\nC. b` → `A. a\nB. b` · **Holds**
- **Continuing a Count:** B-9 · probe · `5. a\nb` → Numbered over b, by a range or a caret → `5. a\n6. b` · **Holds**
- **The Run an Item Leaves:** B-10 · probe · bulleting the middle of `1. a\n2. b\n3. c` → `1. a\n- b\n3. c`; of a nested run → `\t1. a\n\t- b\n\t1. c` · **Holds**
- **Mixed Indentation:** B-5 · probe · a tab and two spaces are one level (`\t1. b\n  2. c`); four spaces read as level 2 and draw there, so that item nests · **Holds**
- **Deeper Than Level 3:** B-5 · probe · a level-4 item caps at 3, numbering with its level-3 sibling as it draws beside it · **Holds**
- **A Quote, Code Block, or Display Math Under an Item:** B-15 C-7 · probe · `- a\n  > q\n- b`, a nested ` ``` ` block holding `- x`, and nested `$$` → Numbered from a numbers a and b around them, the block's own lines untouched, on and off · **Holds**
- **A Code Block Between Items:** B-11 · probe · `- p\n\n```\n- a\n```\n\n- q` from p → `1. p` alone: a top-level block ends the group as a paragraph does · **Holds**
- **A Glyph Inside a Selection:** B-7 · g1, probe · the selection over B to E → Checklist from C's glyph changes B, C, D, and E; a selection touching B and D numbers only B, C, and D · **Holds**
- **A Glyph on a Drag-Selection's First Line:** B-7 · probe (page and resting) · `- a\n- b\n- c\n- d` drag-selected from b's text to c, then Numbered from b's glyph → `- a\n1. b\n2. c\n- d`, as from c's: a glyph on any line the selection touches is inside it · **Holds**
- **A Selected Word:** B-7 · probe · a word selected in b → only b; in E, setting off → only E · **Holds**
- **A Click Outside the Selection:** B-7 · g1, probe · a glyph or text outside the selection acts on its own group · **Holds**
- **A Glyph Below a Triple-Clicked Line:** B-7 · g1, probe (page and resting) · `- a\n1. b\n2. c` with a triple-clicked → Checklist from b's glyph → `- a\n- [ ] b\n- [ ] c` · **Holds**
- **Lists ▸ Inside a Triple-Clicked Line:** B-7 · probe · `- a\n- b\n- c` with a's line selected to b's start → Numbered → `1. a\n- b\n- c` · **Holds**
- **A Drag-Selection Ending at a Line's Start:** B-7 · g4, probe · a real drag from `one` to `two`'s start, then **Lists ▸** Numbered → `1. one\ntwo two` · **Holds**
- **⌘A:** B-7 · probe; a glyph inside ⌘A is collapsed onto it, since `menu.ts`'s inside test hands the glyph the selection's range · every item and plain line becomes an item, while code, math, a table, and a callout head stay; `# H` → `- H` and `---` → `- ---`, still a rule, as at base · **Holds**
- **A Range Whose Top Line Is a Continuation:** B-14 · probe · from `cont` under b through c → Checklist → b and c, A and D unchanged · **Holds**
- **A Range Across a Fence's Edge:** C-7 · probe · a range from inside a fence to a list below it, or the reverse, numbers only the outside line · **Holds**
- **A Text Right-Click at the Next Line's Start After a Triple-Click:** B-7 C-6 · g4, probe · the drawn caret bar takes no press, and a text click outside the selection seats the live selection at the click before the menu opens, so after a triple-click on `one`, a right-click on the first pixel of `two` gives **Lists ▸** Bullet List → `one\n- two two` and **Format ▸** Bold → `one\n**two** two`, every row acting where the click points · **Holds**
- **The Check Over Items and a Plain Line:** A-3 C-4 · probe · `- a\nplain\n- b` selected checks no row, since a line the pick turns into an item doesn't yet share its type; a block opening on an indented paragraph checks none on the grip's Type ▸ alike · **Holds**

#### C — Lists ▸

- **From an Item's Text:** C-1 C-2 · g4, probe · **Lists ▸** Numbered from E's word acts as E's glyph; the check reads the group · **Holds**
- **A Plain Line:** C-1 · g4 · `Plain.` → `- Plain.` · **Holds**
- **A Re-Pick Over a Selection:** C-3 B-7 · g4, probe · Bulleted over the bulleted example, and Numbered picked twice over two numbered lines, remove no marker · **Holds**
- **The Check Follows the Reach:** C-4 · g4, probe · none with the setting off over a mixed reach, Bullet List with it on · **Holds**
- **A Cell's `>`:** C-5 · g3, probe · a resting cell's `> a` → `- > a` · **Holds**
- **A Cell's Fence Text:** C-5 · probe · in a cell, ```` ``` ```` lines are text, so Numbered over them numbers all three · **Holds**
- **Other Rows Act on the Live Selection:** C-6 · g4 · Format ▸ Bold over a selected word → `plain **word** here` · **Holds**
- **An Unselected Word at Rest:** C-6 · g3, probe · in a resting cell, a right-click on `word` in `plain word here`, then Bold → `plain **word** here` without entering the cell, Cut and Copy enabled, and the highlight while the menu is up is `word`; a right-click on blank space past the text acts at the point · **Holds**
- **A Right-Click at the Caret:** C-6 · g4, probe · with the caret inside `don't`, a right-click at the same spot seats `don't`, and Bold → `**don't** stop`; past a short line's end it acts at the point → `ab****` · **Holds**
- **An Apostrophe Between Letters:** C-6 · probe (`textScope.test.tsx`), g3, g4 · a double-click, ⌥+Arrow, Shift+⌥+Arrow, ⌥+Backspace, and a right-click read `don't`, `it’s`, and `Ada's` whole, `'quoted'` and `‘quoted’` as `quoted`, and `students'` as `students`, on a page and at rest; a plain arrow still steps through · **Holds**
- **A Word Deletion Over a Selection:** C-6 · probe (`textScope.test.tsx`) · with `n't` or `don` of `don't stop` selected, ⌥⌫ deletes exactly the selection (`do stop`, `'t stop`); from a caret it takes the whole joined word · **Holds**
- **Speech and Share at Rest:** C-6 · probe (Desktop) · Speech and Share read the selection the rows act on, so a cell with no selection offers neither · **Holds**
- **Format Rows Inside Inline Code:** C-6 · probe · Bold, Link, Highlight, and Text Color stand down inside `` `code` ``, and Code still takes itself off · **Holds**
- **The Table Redrawing Under a Resting Menu:** C-6 · probe (`editorMenu.test.tsx`) · a hover redraw while the menu is up keeps the cell's highlight and leaves the page caret where it was · **Holds**
- **A Code Block's Own List:** C-7 · probe · from inside ```` ``` ````, `- a\n- b` → Numbered → `1. a\n2. b` within the fence; the check reads Bulleted · **Holds**
- **Nothing Outside Reaches In:** C-7 · probe · the surrounding list's glyph, its grip, and its numbering leave a nested or sibling code block's `- x` lines as written · **Holds**
- **A Diff Block From Inside:** C-7 · probe · in ```` ```diff ````, `- old` checks Bulleted; Numbered from it rewrites the block's other `- ` lines on, and its `+ ` lines too off; a bare `-old` line becomes `1. -old`. Only a deliberate **Lists ▸** pick from inside reaches the block, which is what C-7 rules, and one ⌘Z restores it · **Holds**
- **`*` Lines:** C-1 · probe · `* a` isn't a marker in MarkdownPM, so Checklist writes `- [ ] * a`, as for any plain line · **Holds**
- **The `/` Menu:** C-1 D-2 · g4 · `/bul` + Enter on an empty line → `- ` · **Holds**
- **The `/` Menu on a Blank Line Inside a Loose Item:** C-1 · probe (`format.test.ts`) · `- a\n\n  para` with the caret on the blank → Numbered → `- a\n1. \n  para`: a caret on a blank line reaches that line, never the item above · **Holds**
- **⌘Z After a `/` Pick:** A-7 · g4 · one ⌘Z takes the item back to the empty line, since the query's deletion stays out of history · **Holds**

#### D — The Grip and the Switch

- **The Grip Follows the Setting:** D-1 (reversed by direction) D-2 · g4, probe (`gripMenuFlow.test.tsx`) · Type ▸ acts as a right-click on the block's first glyph: Numbered on the example with the setting on numbers A and F alone, and off numbers every level (`1. A\n\t1. B\n\t\t1. C\n\t\t2. D\n\t2. E\n2. F`); its check reads what its pick reaches, as the glyph's does · **Holds**
- **A Loose List From the Grip:** D-1 B-6 · probe · the grip reaches a blank-separated list's items as the first glyph's pick does, so they switch and number as one group · **Holds**
- **Never Into Code:** C-7 D-1 · probe · a nested code block's `- x` stays · **Holds**
- **Gapped Numbers:** B-9 · probe · `3. a\n5. b\n\t7. c` → Type ▸ Numbered with the setting off → `1. a\n2. b\n\t1. c` · **Holds**
- **An Indented Paragraph Head:** D-3 · probe (`gripMenuFlow.test.tsx`) · a block opening on `  para` above `- a` acts from `- a`, its first item, and the paragraph stays as written · **Holds**
- **Quoted and Callout Lists:** D-1 · probe · they read as blockquote and callout blocks, whose grip holds no Type ▸, so their glyphs carry the type menu · **Holds**
- **One Switch:** D-2 · read · the glyph and **Lists ▸** (`menu.ts:29`), the grip (`gripMenu.ts:171`), the `/` menu (`useBlockMenu.ts:50`), and the resting cell (`cellStatic.tsx:504`) all reach `setList` through `editFor` · **Holds**
- **One Undo Step:** A-7 D-2 · probe · a pick and its renumber land in one transaction, and ⌘Z after Backspace, Tab, and Shift-Tab restores each in one step · **Holds**

#### E — The Setting

- **The Row:** E-1 E-2 · g5 · Preserve List-Level Formatting sits directly under Outliner Lines, on · **Holds**
- **Off Without a Reload:** E-1 · g5 · turned off in Settings, Numbered from E reaches the nesting · **Holds**
- **The Key:** E-4 · read · `preserveListLevels`, `flag(true)` (`personalization.ts:148`), an editor key (`api.ts:111`) · **Holds**
- **The Setting in a Resting Cell:** B-1 E-1 · probe · off, Numbered from a reaches b; on, Numbered from nested b changes b alone · **Holds**

#### Fold Cases

- **Backspace on a Marker, Tight and Loose:** B-10 · probe · at b's text in `1. a\n2. b\n3. c` → `1. a\nb\n3. c`, loose alike: the top-level line has no indent to keep, so the paragraph ends the group and c keeps its run's own start · **Holds**
- **Backspace on a Nested Marker:** B-10 B-14 · probe · `- p\n\t1. x\n\t2. y\n\t3. z` at y → `- p\n\t1. x\n\ty\n\t2. z`: the marker goes and the indent stays, since x owns the line, so y reads as x's continuation and the run below recounts; an indented item no item owns, `para\n\n\t- b`, loses its indent with its marker → `para\n\nb`, and a callout's items follow the same rule · **Holds**
- **Backspace on a Quoted Marker:** B-10 · probe (`edits.test.ts`) · `> - item` and `> 1. item` with the caret inside the marker → `> item`, as a callout's item does; at the quote prefix's end → `- item`; a callout's item at its prefix end stays as it is · **Holds**
- **Backspace Inside Display Math:** B-15 · probe (`edits.test.ts`) · on a `- x` line inside `$$`, top-level or under an item, Backspace deletes one character and takes no marker, since no list reads inside math, as Enter and Tab treat it · **Holds**
- **A Whole-Line Deletion:** B-10 · probe · `2. b` out of `1. a\n2. b\n3. c` → `1. a\n2. c`; loose, with or without its gap → `2. c`; a nested line → `\t1. y` · **Holds**
- **Tab Out of a Run, Tight and Loose:** B-10 · probe · Tab on b → `1. a\n\t1. b\n2. c`, loose alike · **Holds**
- **Shift-Tab Into a Run:** B-10 · probe · `1. a\n\t1. x\n\t2. y\n2. b` at x → `1. a\n2. x\n\t1. y\n3. b` · **Holds**
- **A Drag in a Tight List:** B-10 B-15 · probe · b to the end → `1. a\n2. c\n3. b`; a nested item out to the top level → `3. x` with its old run recounted · **Holds**
- **A Drag in a Loose List:** B-6 B-10 · probe · `1. a\n\n2. b\n\n3. c` with b dropped at the end → `1. a\n\n2. c\n\n3. b`, a below c → `1. b\n\n2. c\n\n3. a`, and c above a → `1. c\n\n2. a\n\n3. b`: the separator stays with the list; a loose item dropped into a tight list lands tight · **Holds**
- **Enter Inside Display Math:** B-15 · probe · at the end of `- x` inside `$$` → a plain new line, with no marker, and under an item it keeps only the item's indent · **Holds**
- **Tab Inside Display Math:** B-15 · probe · Tab on `- x` inside `$$` changes nothing, as on any line that isn't an item · **Holds**
- **Enter Inside a Code Block:** C-7 · probe · at the end of `- x` inside ```` ``` ```` → a plain new line · **Holds**
- **Heading ▸ Picked Twice:** C-6 · probe · a triple-click → `## one`, then `### one`; a partial two-line selection keeps both lines → `## one\n## two`, then `### one\n### two` · **Holds**
- **Quote Picked Twice:** C-6 · probe · a triple-click → `> one`, then back to `one`; a partial two-line selection → both quoted, then both back · **Holds**
- **Code Block Picked Twice:** C-6 · probe · a triple-click → ```` ```\none\n``` ````, then a second pick from inside the fence, where the row now reads checked, takes its two fence lines off → `one`; a partial two-line selection fences both lines and comes back alike · **Holds**
- **Lists Picked Twice:** C-3 · probe · Numbered over a triple-click or a partial two-line selection, picked twice, keeps `1. one` or `1. one\n2. two` · **Holds**
