#### Adversarial Review: List Consolidation, Wave One, Reading Outward

**DATE:** 11-06-2026
**SUBJECT:** the 23 production patches in `Scouts/Planning/Phases/`, final tree `3469266d1`, measured against `b7f2f17a5`, the rest of Pommora, and the log's decisions.
**METHOD:** every finding came from something run: a clean replay of the patches, property fuzzes, baseline-against-final differentials, jsdom tests against both trees, and a live drive of the built app. The scratch tests are gone, so each reproduction is written out here. A reproduction's snippets run from a test file in `Core/MarkdownPM/`.

**Verdict:** solid after the listed findings: the patch chain, the scan, and the engine held everything thrown at them, and the one defect the work owns sits at the edge of a code block an item carries. 0 High, 1 Medium, 4 Low. Five further cases are also wrong at `b7f2f17a5` and noted apart, one of them High, and its fix sits on a line Task 3-2 already edits.

#### Findings

##### Correctness

###### 1. Removing the Blank Below a Carried Code Block Merges Two Lists and Recounts Neither — `< MEDIUM — CONFIRMED >`

- **Input:** `1. a`, an indented ` ```js ` block under it, a blank line, `1. b`, `2. c`. Put the caret on the blank line and press Backspace.
- **Result:** the lines read `1. a`, the block, `1. b`, `2. c`, one list by every reader, numbered `1`, `1`, `2`, in a mounted editor. The same removal with no block reads `1.`, `2.`, `3.`. A carried table or math block recounts correctly, since neither sets `scan.fences`.
- **Breaks:** B-5, "removing one should merge the two and recount". `b7f2f17a5` lands the same text, where a blank line didn't yet end a list.
- **Mechanism:** the deletion's position sits on the fence's closer. `rolesAgainst` and `runsAround` read `scan.fences[i]` as "this edit is inside that block", so the walk stays in the block and the outer list never counts. An opener reads the same way: a change that removes exactly `2. b\n` above a carried block stops recounting, where `b7f2f17a5` wrote `2. c`. No gesture produces that exact change today, since a selection's head seats past the fence's hidden lead (finding 10), and Delete Line takes the newline ahead of the line, so it stands as a second reason for the fix rather than a route.
- **Reproduction:**

```ts
const del = (doc: string, from: number, to: number) =>
  EditorState.create({ doc, extensions: [listRenumber] })
    .update({ changes: { from, to }, userEvent: 'delete' }).state.doc.toString()
const b = '1. a\n   ```js\n   x\n   ```\n\n1. b\n2. c'
const at = b.indexOf('\n\n1. b')
del(b, at, at + 1) // '…```\n1. b\n2. c', wanted '…```\n2. b\n3. c'
const a = '1. a\n2. b\n   ```js\n   x\n   ```\n3. c'
del(a, 5, 10) // '…```\n3. c', wanted '…```\n2. c'
```

- **Fix:** read a delimiter from outside its block. In `renumberRuns`, +2 lines. Tried and reverted: both cases land right, and `listRenumber.test.ts` and `listModel.test.ts` stay green at 86 passed.

```ts
const k = lineIndexAt(scan, p)
const f = scan.fences[k]
const i = f && f.role !== 'content' ? Math.max(0, lineIndexAt(scan, f.from) - 1) : k
```

- **Who Would Notice:** nothing today. `listRenumber.test.ts` removes blanks and deletes inside fences, never at a fence's edge. The fix needs one pin.

**Swept:** gates on a clean replay of the final tree: typecheck 0, lint 0, 9,210 passed, 2 skipped, 550 files. Every name *§Concepts · REMOVED* lists is gone from production; the survivors of that search are unrelated words. A settled-count property ran 75,920 edits (Enter, Tab, Shift-Tab, Backspace, line and newline deletion, caret and selection picks) over well-formed lists, with quotes, nesting, carried fences, tables, and math: the only lists left unsettled were this finding's and edits that break a fence's own pairing.

##### Cohesiveness

None.

**Swept:** all surfaces read each of 17 spellings the same way, page, `lists`, a resting value, a Markdown block, and a quote, with `inline` and plain code reading none. Twins of the fence read: `runsAround`, `rolesAgainst`, `ownersOf`, `listReach`, and `collectBoundaries` each compare `fences[…].from`, which the Simplification report's item 3 covers.

##### Architecture

None.

**Swept:** the ask is smaller list handling stated once, and the shape answers it: the ledger reads exact at Phases 3, 5, 7, 9, and 10, -252 (+1226 / -1478), comments 3,506, and `Core/Sync` and `Sync` untouched.

##### Completion

###### 2. *§Reconciliation* Leaves Out the Alias Drive, Whose Group 3 Reverses at Phase 10 — `< LOW — CONFIRMED >`

- **Input:** `Alias Drive/live-drive.mjs:581-582` as `lc-drive` commits it: "a second Enter closes the pane".
- **Result:** G-10 makes that Enter break the line, so a mounted pane on `[[Drive Target|zzq]]` reads `[[Drive Target|zzq]]\n` with `onClose` uncalled. Another agent's uncommitted edit in `wt-drivesrc` already reads the item as G-10 does, and with that edit the drive read 122/122 live at the final tree. No plan line owns it: *§Reconciliation · Drives* names the Text Property, Path Links, and Metadata drives, and the Investigation never mentions this one.
- **Breaks:** *§Constraints · Live Drives*, which expects every existing drive green: the committed `lc-drive` reddens at Phase 10.
- **Reproduction:** `git diff --stat` in `wt-drivesrc` shows the edit; `POMMORA_DRIVE_REPO="$SP/lc/wt-adv1" node "Alias Drive/live-drive.mjs" 3` reads 122/122 with it.
- **Fix:** commit that edit into Task 10-4's patch, and add the drive to *§Reconciliation · Drives*.

###### 3. Two VERIFY Lines Die Before They Search, and One Then Reads as Passing — `< LOW — CONFIRMED >`

- **Input:** Task 1-1's `git grep -n "readsFrom\b" -P -- Core/MarkdownPM`, and Task 5-1's `git grep -n -E "listGlyphOf|…|\.bullet\b" -P -- Core/MarkdownPM ':!*.test.*'`, as written.
- **Result:** both exit 128 with `fatal: unable to resolve revision: -P`, since `git grep` stops reading options at its pattern. Task 5-1's line asks to print nothing, so stdout reads as a pass while the search never ran.
- **Breaks:** *§Constraints · Gates*, "A VERIFY grep that uses `\b` runs under `git grep -P`", and *Confirmation*, "every verification ran and its result was read".
- **Reproduction:** run either line in any checkout. Moved ahead of the pattern, Task 5-1's prints nothing at `3469266d1`, which is the true answer.
- **Fix:** `git grep -n -P "…" -- …`, and drop `-E` from Task 5-1. Task 1-1's companion count reads 72 at its head, against "about 80".

**Swept:** the patch chain replays exactly: 23 patches in plan order onto a clean `b7f2f17a5` export reach tree `3b98aff87`, `3469266d1`'s, with `git apply --check` clean at every step. All 24 commits typecheck under `Core`, `Core/tsconfig.src.json`, and `Desktop/tsconfig.web.json`, and full suites pass at the heads of Tasks 2-1 (9,129), 3-3 (9,166), 7-1 (9,180), 9-3 (9,195), and 10-1 (9,204). The comment ledger reads every row. Nine pin reverts read as written: 4-1 twice (3 red, then 1), 6-1, 6-2, 7-4, 9-4, 2-2, 8-1, and 1-1. The twelve drive and docs patches the plan names aren't on disk, which the Simplification report's item 2 holds, so this review replayed the 23 and took group contents from `lc-drive`.

##### Interaction

###### 4. A Value Holding `\r\n` Draws as Text at Rest and a List in the Pane — `< LOW — CONFIRMED >`

- **Input:** `Notes: "- a\r\n- b"` in a page's frontmatter. A block scalar normalizes its breaks, so this takes a quoted scalar a tool wrote.
- **Result:** `parseListMarker('- a\r')` returns null, so `TextCell` draws `- a` with no glyph, while the pane, whose document CodeMirror normalized, draws two items. Opening the pane and pressing Escape with no edit commits `- a\n- b`, since `committed` holds the `\r\n` form. `b7f2f17a5` rewrites the same way, and its rest draws the same text; only the pane's glyphs are new.
- **Breaks:** G-3, "a Text value's list should draw its glyph at rest". G-4's on-disk promise bends for a pane closed untouched.
- **Reproduction:** `parseListMarker('- a\r')` is null. Mount `ValueEditor` with `initial="- a\r\n- b"`, press Escape, and `onCommit` receives `'- a\n- b'`.
- **Fix:** end `LIST_MARKER_RE` at `([ \t]+)`. Its `(.*)$` is read by nothing, and dropping it reads `\r` and U+2028 lines as items, which also closes finding 8. Tried and reverted: 577 tests under `Engine/` and `cellLists.test.tsx` stay green. Comparing `committed` against the text as CodeMirror normalizes it closes the rewrite.

**Swept:** Enter, Tab, Shift-Tab, Backspace, picks, undo, and redo on a page, in `lists`, and in `inline`: 4,000 page documents and 1,600 `lists` and `inline` documents at 30 to 40 mixed steps each, with the scan, the line intents, the rails, and the atomic ranges compared to a full derivation at every step, reporting one throw, finding 6's. Pane values read right when empty, blank, holding a blank line, opening on a blank line, and pasted with `\r\n`; a list pasted into a field reads `- a - b`, as a field's break does; a YAML sequence, a nested sequence, a mapping member, `[]`, and `[[Page]]` each read as G-13 and the Calls state.

##### Implications

###### 5. Task 7-4's Rails Cost More Per Keystroke on a Document Holding No List — `< LOW — CONFIRMED >`

- **Input:** typing in a 20,000-line document, 400 samples each, stepping `docScan` and `docLineIntentsOf`.
- **Result:** median per keystroke, `b7f2f17a5` then `3469266d1`: 20,000 paragraph lines 1.63 ms then 2.09 ms, 5,000 tables 1.48 ms then 2.58 ms, 20,000 bullets 1.67 ms then 1.75 ms. `railIntents` now calls `ridesList` on each line that isn't an item, two binary searches and a regex, on every edit.
- **Breaks:** the Hard Rule on expensive work, and Task 7-4's sentence "An edit allocates less than before, so *Never Do Expensive Work On Every X* holds". The walk was already O(N), so this adds 0.5 to 1.1 ms rather than a new class of cost, and the sentence holds for allocation and fails for time.
- **Reproduction:** step 400 single-character inserts through `docScan.after(tr)` and `docLineIntentsOf.after(tr)` on each tree. Gating `ridesList` on `shown[i - 1] !== LIST_ENDS` brings the two list-free rows to 1.41 ms and 1.09 ms, which names the cost, though it fails *a wrapped line carries the rail, quoted or not*, so a real gate has to carry the quote case.
- **Fix:** gate the read on a list being open, keeping the quoted wrap, or restate Task 7-4's sentence with these figures.

**Swept:** 11 outside consumers traced: `tableGuard.ts`, `subfieldStats.ts`, `TextCell`, `LinkCell`, `Core/Index/indexSeed.ts`, `Core/Connections/rewrite.ts`, `Core/Pages/pageEditor.ts`, `Core/Pages/editorHost.tsx`, `Core/Actions/*`, `Desktop/Actions/editorMenu.ts`, and `Core/Testing/*`, each reading the masked scan or the new request correctly. Differentials over the block model (60,000 documents) and drawn intents (40,000 documents at both scopes) show only what the log and *§Behavior Changes* name: rows 1, 7, 9, 10, 11, and 42, and table rows losing marker intents nothing drew.

##### Oversight

None.

**Swept:** the obvious path: `- a`, Enter, Tab, a pick, a drag, and undo on each surface, through the fuzzes above. Numbering at 20,000 lines reads level with `b7f2f17a5`: Enter mid-list 19.4 ms then 17.6 ms, Enter at the end 4.7 ms then 5.9 ms, a joined line 1.5 ms then 1.7 ms. Lines of 2,000,000 characters stay linear: 14 ms in the grammar, 55 ms in a whole scan, and 64 ms in the word rule at their worst.

#### What Held

- **`rescan` Against a Full Scan:** 25,000 documents at 30 chained edits in each of the three scopes, with a soup of Markdown, plain, and diff fences, four-tick and tilde fences, quoted and indented fences, math, tables whose rows hold markers, and HTML. No mismatch in any field, `markers` among them. An edit opening or closing a fence, table, or math block moves masks on lines it doesn't touch, and they land right. A broken closer that pairs with a later fence carries the following list into the block, whose count then reads it, as C-1 reads a block's lines.
- **Numbering:** nested runs, quotes, Markdown blocks, undo and redo in one step, two `input.list` changes in one transaction, `mirrorBody` writing past the filter and past history. `allowMultipleSelections` isn't set anywhere, so multi-cursor has no route.
- **Picks:** 80,000 random picks, both Preserve settings: no list pick left its region, no plain-code pick passed its lines, no caret pick crossed a blank.
- **Drags:** 40,381 fuzzed `dropChanges`: no throw and no lost line.
- **Code Blocks:** keys and rows in a block inside a quote, inside an item, with tab and space leads, ` ````md `, diff, `md diff`, `.md` paths, `mdx`, and an unclosed fence, which the scan reads as no fence. Rows on delimiters refuse or insert as C-5 and C-7 state.
- **The Grammar:** `restoreTrailingItem` over each marker and `last + ' '` differs from `b7f2f17a5` only at `-[ ]`, as Task 7-1 intends. Every spelling reads the same on every surface that reads lists.
- **Right-Click:** eleven rows picked after the view was destroyed wrote nothing and threw nothing a person meets. Select All from a read-only table's cell selects the tile's document live. Stale picks stand on `doc === opened`, `current() !== text`, and the grip's own compare, each pinned in the repo's tests, and group 9 holds the live items for every read-only surface.
- **The Word Rule:** 30,000 strings against `b7f2f17a5`: every difference is `_`, a quote at a contraction's edge, or a neighbor across a quote, the departures rows 50 to 52 record.
- **The Decisions:** A through G walked. Beyond findings 1 and 4, each reads as stated, by a run above or by an item in `lc-drive`'s groups.

#### Additional Findings

Each of these is also wrong at `b7f2f17a5`, and no decision names it.

###### 6. A Drag Past a Selection Inverts It, and the Next Keystroke Deletes Lines Nobody Selected — `< HIGH — CONFIRMED >`

- **Input:** select `word` in `- beta word`, then drag `- alpha`'s glyph below `- gamma`. Or in a ` ```md ` block, right-click the `x` of `- [x] a` and pick Numbered.
- **Result:** driven live on the built app, the selection reads `from 26, to 2`, `from` past `to`, a state CodeMirror's API doesn't describe. Enter does nothing. Backspace, with four characters selected before the drag, takes 24 characters across three lines and leaves `- `, `a`, `- delta`. In the block, Enter does nothing, and a typed `Z` replaces the marker, leaving `Za`. In jsdom the same keys throw `RangeError: Invalid change range`, and in the browser the keymap's throw leaves the key to Chromium's own edit of the DOM selection.
- **Mechanism:** CodeMirror's `SelectionRange.map` maps `from` forward and `to` backward, so a replaced span that swallows a selection returns `from > to`. `dropChanges` and `moveRange` each land one replace through `diffAsSingleReplace`, and a pick replaces a marker holding the seated `x`.
- **Why It Sits Here:** the fix is one clause. Task 3-2 already edits this `onDrop`, and C-1 leaves a marker in a block open to a mouse, where a glyph owns the press on a page.
- **Reproduction:**

```ts
const doc = '- alpha\n- beta word\n- gamma\n- delta'
const w = doc.indexOf('word')
const st = EditorState.create({ doc, selection: { anchor: w, head: w + 4 }, extensions: [surfaceScope.of('page')] })
const scan = docScan(st)
const changes = dropChanges(scan, subBlockAt(scan, 0)!, { at: doc.indexOf('- delta'), indent: '', line: 3 })!
st.update({ changes }).state.selection.main // from 26, to 2, on both trees
```

- **Fix:** one clause in `caretSeat`'s filter, which every filtered transaction passes: `if (main.from > main.to) return [tr, { selection: { anchor: main.to }, sequential: true }]`. Tried and reverted: a mounted drop lands a caret at 2, and `decorations.test.tsx` and `prefixSeat.test.tsx` stay green.

###### 7. Typing or Enter Over a Selection Across Items Doesn't Recount — `< LOW — CONFIRMED >`

- **Input:** `1. a`, `2. b`, `3. c`, with `a` through `2. ` selected, then a typed `x`, or Enter.
- **Result:** `1. xb`, `3. c`, and `1. `, `b`, `3. c`. Delete and paste recount the same selection. The filter's gate names `input.list`, `delete`, and `input.paste` alone, and `input.type` runs on every keystroke, so opening the gate needs the reshape test ahead of the scan.

###### 8. A Line Holding U+2028 Reads as No Item — `< LOW — CONFIRMED >`

- **Input:** a line reading `- x`, a U+2028 line separator, then `y`, which a paste from another app can carry and CodeMirror keeps inside one line.
- **Result:** `parseListMarker` returns null, since `.` stops at the separator. `→` joined the rest in Phase 5, so this is now uniform. Standard Markdown reads an item. Finding 4's fix closes it.

###### 9. An Ordinal Past 15 Digits Loses Digits in a Recount — `< LOW — CONFIRMED >`

- **Input:** `123456789012345678901. a`, then Enter.
- **Result:** the head rewrites to `123456789012345680000.`, and each line added carries the same number. `LIST_MARKER_RE` takes `\d+` where `LIST_LINE` beside the scan takes `\d{1,9}`, as standard Markdown does. B-1 settles nothing wider, so this stays a note.

###### 10. A Selection Ending at a Carried Block's Line Takes the Block's Hidden Lead — `< LOW — CONFIRMED >`

- **Input:** select the line `2. b` through to the next line's start, as a triple-click does, with an indented ` ```js ` block on that next line, then press Backspace.
- **Result:** `caretSeat` moves the selection's head past the hidden lead, so the deletion takes the fence's three spaces too: `1. a`, ` ```js ` flush, its content still indented, `3. c`. The block stops riding, by B-6's rule, and `3. c` reads as its own list. It reads the same live on the final tree and mounted on both. The filter could leave a range's head where it stands, since seating answers a caret.

#### Unsure

- **`Desktop/Actions/editorMenu.ts:118`:** a live ask over a non-editable target now pops, where `b7f2f17a5` resolved null and popped nothing, and `editorMenu.test.ts` lost that pin to "when nothing asked". `ignoreEvent` false widgets reach it, a label or heading join among them, on an editable page, with every system row disabled. It needs the short menu's route, and *§Behavior Changes* doesn't list it. Ten-second check: right-click a nested quote's bar, a `LineWidget`, on an editable page, and read the rows.
- **`Tables/cellStatic.tsx`, Select All from a read-only cell:** driven live in an unentered tile, it selects the tile's whole document, 0 to 60, and paints three pills in the idle tint, with `view.hasFocus` false, since the resting press keeps focus where it was. So ⌘C after it likely reaches whatever holds focus rather than this selection. Ten-second check: Select All from a read-only table's cell, then ⌘C and paste.
- **`Tables/cellStatic.tsx`, `restingMenu`'s `.then`:** if a second right-click reaches a resting cell while the first menu's close reply is still in flight, the first `.then` clears the second word's highlight. macOS swallows a click outside an open menu, which would make this unreachable there, and the harness stubs the menu, so neither was run. Ten-second check on Windows: right-click a resting word, then another with the menu up.
- **`editor-parity/bodies/render.md:14`:** ` + plus bullet` draws differently from Phase 5. Task 0-2 records "0 differing lines" against `results/base`, and *§When Drives Run* is still a placeholder, so whether a later compare expects that line to differ can't be read. Check it when the table lands.

#### Killed

- **Stranded ask after `atClick` left:** every `contextmenu` handler in Core, UIX, and Desktop was read, and none cancels the event under an editor's ask once `MarkdownEditor`'s shell stops the bubble. Nobody reaches it.
- **`->` in a Markdown block ignoring Transform Arrows:** a page's line start ignores it too, through `opensLine`. The two agree.
- **Preserve skipping siblings of another type, against the log's *Group*:** `ConfigurationPM.md:152` states "other types unchanged", and `b7f2f17a5` filters the same way.
- **A pick after a destroyed view:** `view.dispatch` drops it, and only Footnote logs `No tile at position`, unhandled and unseen, through a state a native menu nearly never meets. A guard would cost more than the code it guards.
- **`linkSettle`'s `RangeError` in the fuzz:** a `setTimeout(0)` firing after a synchronous fuzz shrank the document, which no keystroke can outrun.
- **The `0 0` selection after a first pick in jsdom:** a `select` transaction from jsdom's DOM selection on first focus; it doesn't repeat.

#### Not Checked

- **Real native menus:** the harness stubs `Menu.popup`, so a menu's real open and close order on macOS and Windows was reasoned rather than run.
- **Drives:** the Alias Drive's group 3 and one short probe of findings 6 and 10 and Select All ran live, and findings 1, 4, and 5 ran in jsdom or against the engine. List Types, Text Property, Path Links, Metadata, Properties, and Editor Parity were left to the agent holding the lock.
- **Multi-pane mirroring by hand:** `mirrorBody` ran in jsdom against one view.
- **The twelve unsaved patches:** group contents were read on `lc-drive`, and the *Docs* patch doesn't exist yet.
