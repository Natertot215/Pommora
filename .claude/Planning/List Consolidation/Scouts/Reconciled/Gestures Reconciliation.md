### Gestures Reconciliation

**DATE:** 11-06-2026
**HEAD:** `b7f2f17a5` on `active`
**COVERS:** Scouts 3, 5, and 6, and the Word Rule and Text Pane prototypes, read against *List Consolidation — Decisions & Intention*. The cleaned reports sit beside this file under their own names and finding numbers.
**EVIDENCE:** **[Probed]** ran this pass in a throwaway worktree, under jsdom with the real modules, a hit test mocked where layout is needed. **[Live]** is Scout 5's reading from the running app. **[Read]** is the code at the cited line. **[Inferred]** is reasoning no run confirmed. The app wasn't launched.

**Trials:** Three throwaway changes ran against the full Core suite and were removed with the worktree. Each is evidence for what it shows rather than a proposed diff.

- **One Range:** D-5's route and reach, `menu.ts` +17 / -20, `cellStatic.tsx` +5 / -2, `format.ts` +2 / -1. 8,181 tests pass and one falls (*§D-5*).
- **Section G:** the Text Pane Prototype with G-10's keys and G-13's `asText`. The pins that fall are named in *6-T22*, *6-T37*, and *6-T35*.
- **Word Rule:** the prototype as saved, then with two corrections, run through a differential of 4,440 gesture readings against today's tree.

---

#### Claims Corrected

| Claim | Was | Now | Why |
| --- | --- | --- | --- |
| 3-T43 | Both `stopPropagation`s protect nothing | `cellStatic.tsx:606` protects nothing; `:678` protects a Text value's row menu | `:678` sits in `linkGestures`, shared with `TextCell` under `TableView.tsx:474`, `CardsView.tsx:610`, and `PropertyPanel.tsx:250` **[Read]** |
| 3-T5 | The info pane gets no menu because it reports not editable | Its `PickerMenu` layer also cancels the event, so Chromium sends no `context-menu` | `PickerMenu.tsx:332`, `stopContextBubble` **[Read]**; E-4 has to answer this |
| 3-T15 | Rows write into `1.`, `- [ ]`, and `>`, and `select.pointer` cures it | The cure reaches markers drawn as text and the quote prefix; `-` and `- [ ]` were a mock landing inside an atomic range | The intents hold `atomic[0,2]` and `[0,6]` on a page **[Probed]** |
| *§Remove First*, 4 | "One reply rule read after the seat" fixes 3-T14 | It can't, since the settle runs after any read in the handler | `setTimeout(collapse, 0)`, `linkSettle.ts:167` **[Read]**; acting on the live selection fixes it **[Probed]** |
| *§Remove First*, 5 | Refuse on every routed click | Dropped | No reseat happens at an edge (5-T10, 5-T11) **[Live]** |
| 3-T13 | Six staleness rules, none holding | Five re-find different targets and stand; only the page's is defective | Each reads a different thing, so one rule isn't available |
| 3-T16 | A Ctrl-click may arm a grip's drag | It arms, and cancels itself on its first buttonless move | `gesture.ts:138-141` **[Read]** |
| 3-T32 | The end rule "needs its own look" | A shown defect: the act writes `` `abc[^1]` `` | **[Probed]** |
| 3-T38 | `pasteLink.ts:128` | `:129` | The comment sits at `:128` and the guard at `:129` |
| 3-T44 | `!!edge` is unreached | **Unconfirmed**, and it stays | A hit on a mark that draws nothing can't be ruled out by reading |
| 5-T20, 5-T21 | 10 and 7 rows | The counts include separators | Eight rows and two separators on a word, by `systemItems` **[Read]** |
| 6-T19 | The pane needs no change to its keymap | It does, under G-10 | *6-T36* |
| 6-T24 | Enter off a list saves and closes | Enter breaks the line; Escape and the × close | G-10 |
| 6-T11 | Escape saves and closes | Escape over a selection only collapses it unless the pane binds it | `simplifySelection` claims the key **[Probed]** |
| 6-T12 | A value's model stays page-shaped | B-11 closes it | The surface's scan holds what it reads |
| 6-T22 | A fourth failure in `Sync/handlers.test.ts`, and two flakes | Dropped | The full Core run here showed none of the three |
| 6, *§Where the Tree Contradicts the Log* | G-6, G-7, *§Concepts*, and *§Sources* need rewording | Dropped | The ratified log already reads correctly on all four |
| E-6 | One known departure, `'don't'` | Two unaccepted-so-far shapes beside it | *§The Word Rule* |

---

#### Disagreements and How Each Resolved

- **Does Chromium Reseat at a Selection's Edge?** 3-T34 inferred yes and 5-T43 observed no. Scout 5 wins, and `clickInside` stands.
- **Why Does `cellStatic.tsx:639` Exist?** 3-T17 said its reason was gone and 5-T46 found a real one. Scout 5 wins, and the line stays.
- **What Does the Seat Do at Rest?** 3-T12 said it feeds the highlight and 5-T47 saw nothing painted by default. Scout 5 wins, and E-3 is the fix.
- **Which of the Four Seating Models Holds?** 3-T59 couldn't choose. 5-T1 and 5-T39 to 5-T42 settle it: two seats, one at the press and one at the menu.
- **Is the Refusal Earned, and Is the Synthetic Event?** 3-T39 and 3-T40 doubted both. Scout 5 splits them: the refusal is earned (5-T44) and the event unreached (5-T45).
- **Does `stopPropagation` Matter?** 3-T43 said no and 5-T3 saw the window miss a bubble. They don't conflict: nothing listens there, so `:606` leaves, and neither report looked below the window, where `:678` matters.
- **Should the Cell Enter on a Right-Click?** 3 said yes and E-1 says no, on 5's evidence. E-1 stands.
- **Should Enter Off a List Close the Pane?** 6 said yes, and G-10 says no.
- **Do the Keys Need the Pane's Keymap Touched?** 6-T19 said no; G-10 makes it yes, in one place.

---

#### Verified Removal List

**Leaves** means no replacement. **Changes** means the behavior or site moves. **Stays** means the guard earns its line.

| # | Guard or Mechanism | Site | What Scout 5 Observed | Verdict | Under |
| --- | --- | --- | --- | --- | --- |
| 1 | `if (!ask) return`, the `click` thunk, `menus.format?`, `format: inert ? undefined` | `menu.ts:55,72-74`, `api.ts:191`, `editorHost.tsx:106` | Not driven; the harness alone stops there | **Leaves.** Every surface asks once E-4 lands, so `format` goes required and the harness gains one line | E-4, E-7 |
| 2 | `at === null` and `at: number \| null` | `menu.ts:56,75,111,127` | Not driven | **Leaves,** through `posAndSideAtCoords(event, false)` | E-7 |
| 3 | `view.dom.isConnected` | `menu.ts:140`, `pasteLink.ts:129` | Not driven | **Leaves.** A destroyed view takes the write into dead state **[Probed]** | E-7 |
| 4 | `doc === opened` | `menu.ts:108,140` | Not driven | **Changes.** Text rows act on the live selection, which CodeMirror maps through a settle, and 3-T14 closes **[Probed]**. It stays for a glyph, which seats nothing to map | E-7 |
| 5 | The seat's bare dispatch | `menu.ts:133` | Not driven | **Changes.** It seats with `select.pointer` and reads the selection back, so rows act on what's seated **[Probed]** | E-7, D-5 |
| 6 | The synthetic `selectionchange` | `menu.ts:43` | Unreached across 20 runs (5-T45) | **Leaves,** with its pin `editorMenu.test.tsx:235`, by A-4 | E-7 |
| 7 | The `selectstart` refusal | `menu.ts:44-46` | Earned on caret seats (5-T7, 5-T44) | **Stays,** unscoped (5-T50). Its doc narrows to the Menu Seat (5-T41) | E-7 |
| 8 | The refusal's `setTimeout` | `menu.ts:46` | Earned (5-T8) | **Stays** | E-7 |
| 9 | `atClick`, its slack, `x` and `y`, and `takeEditorMenu`'s compare | `Desktop/Actions/editorMenu.ts:37-54`, `Core/Actions/editorMenu.ts:27-28`, `menu.ts:90-91` | Reached only by injection (5-T48) | **Leaves,** with its pins in `Desktop/Actions/editorMenu.test.ts:45-59`. E-4's info pane has to stop its bubble first, or it would create this state **[Inferred]** | E-7 |
| 10 | `posAt`'s `try`/`catch` | `CellEditor.tsx:263-270` | Not driven | **Leaves.** `readMeasured` throws only during an update (`index.js:8260`) | E-7 |
| 11 | `!!edge` | `menu.ts:114` | Not driven | **Stays.** Unconfirmed, and the type asks for it | E-7 |
| 12 | `e.stopPropagation()` in the resting handler | `cellStatic.tsx:606` | The window misses a bubble nothing listens to (5-T3) | **Leaves** | E-7 |
| 13 | `e.stopPropagation()` in `linkGestures` | `cellStatic.tsx:678` | Not driven | **Stays.** It keeps a row's menu from opening beside a link's | E-7 |
| 14 | The table wrap's capture | `MarkdownTable.tsx:494-497` | Not driven | **Changes** to a plain `onContextMenu`, and its comment goes. Row 13's path runs `dismiss` itself | E-7 |
| 15 | The right press's default at rest | `cellStatic.tsx:639` | Earned (5-T46) | **Stays** | E-1 |
| 16 | `pointerPath.ts:49` | `:48-49` | The comment fails; the caret would end inside the link (5-T40) | **Stays,** its comment rewritten to that reason | E-7 |
| 17 | `gripMenu.ts:139`'s comment | `:139` | Holds, incomplete (5-T39) | **Stays** | E-7 |
| 18 | `clickInside` and `reachEnd` at a selection's edge | `menu.ts:36-39` | Agrees with Chromium, and differs once harmlessly (5-T10 to 5-T12) | **Stays** | E-7 |
| 19 | `readOnly` returns | `menu.ts:106`, `cellStatic.tsx:605` | Not driven | **Changes.** They stop deciding whether a menu exists and pick the short one | E-4 |
| 20 | `resting`'s presence meaning "not editable" | `Desktop/Actions/editorMenu.ts:77-81,97,136` | Not driven | **Changes.** One finite state on the request says which menu; `:136` reads `!params.isEditable && !editor` | E-4 |
| 21 | `showSource` and `pointAt` | `cellStatic.tsx:426-443` | They seat a range nothing paints by default (5-T47) | **Stays,** retargeted (*§E-2 and E-3*) | E-2, E-3 |
| 22 | `isSecondaryClick` absent from `blockDrag` | `blockDrag.ts:100-113` | Not driven | **Stays absent.** No defect (3-T16) | E-7 |
| 23 | `joins`, `JOINED`, `grouping`, `wordPress`, `joinedWords`, `wordGestures`, `DELETES`, `GROUPS`, `byWords`, and `wordAt`'s loops | `markdownInput.ts:295-355` | Not driven | **Leaves,** with the group commands' and `Decoration`'s imports, and the `isWordChar` import the patch forgets | E-6 |

**One Remaining Gap in E-7:** on a page, `seatPastMarker` answers null for a bullet or box at its line's start, so a press in the indent left of a glyph could seat there and Bold could write `****- item` **[Inferred]**. The replaced-marker arm at `intents.ts:625` already answers this for a cell. The rewritten List Types Drive should press there, and the arm widens to the seat only if the drive shows it, under *§Caution Code*.

---

#### D-5: What Leaves With the Second Range

The two ranges are `from, to`, the click's point, and `start, end`, the word. D-5 makes the word the only range, because a one-line selection then reaches as a caret does.

**Leaves:**

- `[start, end]` and the `word`-versus-point split (`menu.ts:76-78`), which become one line choosing the selection, the word, or the point.
- `request`'s four arguments, down to two (`menu.ts:63-68`, `:92`, `cellStatic.tsx:580`).
- `const list = action.startsWith('list:')` and `list ? from : start` (`menu.ts:96-97`).
- `embedSeatAt`'s and `citationSeatAt`'s `at` (`embedInsert.ts:34`, `citationActions.ts:36`), read at `menu.ts:135-136` alone, since the seat is now what they'd read by default.
- The doc at `menu.ts:49`, which explains the split.

**Moves:** `readFormatState` reads the seat rather than the click. Across 18 sample lines at every position, the flags differed only at `_it_`'s outer edges, where the seat reads `italic: true` and the click missed it, so the row now tells the truth **[Probed]**.

**Stays:**

- `surface.apply`'s one range. A resting cell has no live selection to read, and a glyph seats nothing.
- `applyEditorAction`'s range parameter, now for a glyph's point alone, which is 3-T45's last use.
- `listReach` takes the new rule in `format.ts`, a two-line change in the trial.

**A Fix This Forces:** with the seat read directly, `citationSeatAt` says true on a word ending an inline code span, and the act writes `` `abc[^1]` `` **[Probed]**. Today only the click's reading hides that row, and a standing selection already reaches it. `citationSeatAt` reads the selection's last character for a range, so the exclusive end stops mattering, and the docstring's "outside code" comes true.

**The Pin:** `listRenumber.test.ts:83`, "switching a numbered item out of its run recounts the run below", selects inside one line to reach one item. D-5 overturns its setup, and it selects the whole line instead.

---

#### E-2 and E-3

**The Definition (E-3):** `--text-selection` at `UIX/Theme/caret.css:12`, the accent mixed at `--tint-secondary`. The pills (`markdown-pm.css:1166`), a table's rectangle (`markdown-tables.css:139`), and two Views surfaces already read it. `--text-selection-idle` (`:13`) is the unfocused pill, which E-3 doesn't ask for.

**E-3's Cause:** `markdown-pm.css:1168-1171` sets `::selection` transparent everywhere under `.cm-content`, and a resting cell draws inside the page's `.cm-content`, so the range `showSource` writes paints nothing (5-T22). With Use Native Highlighting on, that rule stands down and the native blue shows (5-T38). Neither branch paints the one color.

**E-2's Cause:** `showSource` (`cellStatic.tsx:439-443`) moves the document's real selection into the cell, and nothing takes it back: `routeRightClick`'s reply returns on a null action (`menu.ts:95`). The range stays (5-T32) while the page keeps focus, inside a widget whose `ignoreEvent` keeps CodeMirror from reading or restoring it, so keystrokes go nowhere (5-T33, 5-T51).

**E-2 Reaches Further Than a Dismissal [Inferred]:** the same state follows any reply that leaves the cell undrawn: Copy (`cellStatic.tsx:535`), a re-pick D-4 leaves alone, and an empty paste. So the seat has to clear on the reply, whatever it says. `pick.then` is that one signal, since main resolves on a row and on the popup's close.

**The Route:** the seat stops being the document's selection. `showSource` hands its range to a `CSS.highlights` entry, one `::highlight()` rule paints `--text-selection`, and the reply clears it.

- **Why:** this removes E-2's cause rather than restoring after it, so the page's caret, its selection, and any live cell's focus were never touched, and typing behaves as it always does. Restoring instead needs the page's `view.focus()` (5-T16), which is wrong when a live cell holds focus (5-T30) or the page was blurred (5-T46).
- **What Follows:** Chromium's Menu Seat then fires on a resting word, since nothing holds the click, and the refusal already installed stops it (5-T5). The setting stops mattering, and row 6's last reason goes.
- **Status:** **[Inferred]**, since this pass couldn't launch. jsdom lacks the API, so the harness needs a stub, and only a screenshot proves paint (5-T54).
- **Fallback:** if the drive refuses it, keep the DOM seat, add one `::selection` rule under `.mdpm-tbl-cell-static` reading `--text-selection`, and on the reply return the selection to whichever editor holds focus.

**The Drive:** `List Types Drive/live-drive.mjs:58-62`'s `shown` reads `getSelection().toString()`, which can pass with nothing painted (5-T53). It reads the seated range instead, with a screenshot for paint, and items at `:248`, `:255`, and `:315` follow.

---

#### E-4: The Surfaces

Every `EditorView` in the tree mounts through `MarkdownEditor`, `CellEditor`, or `ValueEditor`, and only `MarkdownEditor` goes read-only **[Read]**.

| Surface | Mount | Today |
| --- | --- | --- |
| Page reader: current, history, and archive | `PageReaderWindow.tsx:113`, inert host | System rows, Undo through Paste beside Copy |
| Glance | `GlancePane.tsx:289`, `PageTile` with `editing={false}` | System rows |
| Board tile, page or Markdown, not entered | `tileKinds.tsx:45,55` | System rows |
| Window tab, not entered | `WindowTabBody.tsx:91` | System rows |
| Page embed, not entered | `editorHost.tsx:116` | System rows |
| Any of those, a resting cell in its table | `widget.tsx:346`, `cellStatic.tsx:605` | No menu |
| Info pane | `InfoButton.tsx:87`, inert host, inside `PickerMenu` | No menu, cancelled at `PickerMenu.tsx:332` |

The log's four names cover these, a glance being a tile not edited. A live page and an entered tile aren't read-only.

**What It Takes:**

- `menu.ts:106` and `cellStatic.tsx:605` route rather than return, so a read-only surface seats its word through the same path and the Menu Seat is refused, replacing Chromium's word. Rows 1, 19, and 20 are this.
- A glyph on a read-only surface reads as text, since a type menu would offer a write.
- `gripMenu.ts:152` and every link, heading, and citation menu sit above at higher precedence and answer first, unchanged.
- Copy reuses `RESTING_EDITS.copy`. Select All is a renderer-answered row running CodeMirror's `selectAll` on the view, since a native Select All acts on focus rather than the surface (5-T37), and in a read-only table it selects the page.
- `InfoButton`'s `Entry` wraps its editor in the same bubble stop `ValueEditor.tsx:196-200` uses, or the layer cancels the menu and strands the ask.
- **The Pin:** `cellRestingMenu.test.tsx:221`, "asks nothing of a read-only cell", is overturned.

---

#### The Word Rule

**Verdict:** `'don't'` isn't the only departure. The mechanism stands, with its departures stated in full and three corrections.

**Re-Read Against D-5:** no interaction. `wordAt` keeps its contract, and D-5 changes what the word is used for.

**The Resting Call Site:** correct. `cellStatic.tsx:574` has no view, so it needs `extensions: contractions`, and it stays under E-1. A resting right-click then reads what a live one reads, since both answer through the same provider **[Read]**.

**Every Gesture:** double-click, right-click at either side, group motion and selection in both directions, and group deletion in both directions, run at every position of 50 lines against today's tree **[Probed]**. All 49 tests in the word and menu files pass, and the prototype changes 472 of 4,440 readings, every one in the shapes below.

| Shape | Example | Today | Prototype | Reading |
| --- | --- | --- | --- | --- |
| **A · A Quote Touching a Contraction** | `'don't'`, `'don't`, `don't'`, `a'b'`, `x don't' y` | `don't` | Takes the quote too | E-6's accepted case and its halves. The half that matters is a closing quote: `'I don't'` reads `don't'` |
| **B · A Neighbor's Quote, Across a Gap** | `students' don't`, caret in the gap, group left | Stops before `'` | Runs to the word's start | New. The window crosses whitespace, so a motion or deletion starting there takes the neighbor's quote as a word character |
| | `don't 'quoted'`, group right from `don't`'s end | Stops after `'` | Runs past `'quoted'` | |
| | `don't 'quoted'`, double-click or right-click on the opening `'` | `'` alone, or nothing | `'quoted'` | |
| | `'tis don't`, press on `s`'s right half | `tis` | `'tis` | The one case on a word's own letter |
| **C · Astral Letters** | `𝒶'b` | `𝒶` | `𝒶'b` | An improvement: E-5's rule, which `joins` missed by reading one UTF-16 unit |

**Why B Exists:** `charCategorizer` takes one answer for a whole scan and no direction (`state.charCategorizer(at)`), so a caret in a gap can't say "off to the left, on to the right". The window has to cross whitespace, or a plain group-right into `don't` stops at the apostrophe. A and B are the same limit, and neither can be narrowed without the atoms and wrappers E-6 removes.

**Settled:** keep E-6. Every departure is a quote mark joining a real word at a contraction's edge, and no word breaks wrongly inside. What this buys is 50 lines, one mechanism in place of three, and every future group command for free. E-5 asks for "the simplest mechanism that makes sense", and E-6 stands as [INFERRED] until evidence overturns it, so this goes in the morning report as a wider acceptance than the log wrote.

**Corrections the Patch Needs:**

- **`_` Leaves the Test:** `/[\p{L}\p{N}_]['’][\p{L}\p{N}_]/u` reads `a'_b` as a contraction, where E-5 says a letter or digit. Dropping `_` from this test alone, and keeping it in the window's run, changes only `a'_b`, which reads `a` **[Probed]**, and no pin holds it.
- **The Window Is Quadratic:** `/[…]*\s*$/u` is unanchored, so each start in a run rescans it. A 100,000-character run ending in `)` froze a gesture for 21 s, and 10,000 took 119 ms **[Probed]**. A lookbehind `(?<![…])` takes that to 1 ms, and the same shape over 100,000 spaces still takes 11 s, so the plan's form has to be linear in the line. It runs on gestures only, since Core mounts nothing else that calls `languageDataAt` **[Read]**, which is why this is a freeze on a strange line rather than a lag source.
- **An Unused Import:** the patch leaves `isWordChar` imported in `markdownInput.ts`, which lint refuses.

**The Pins,** in `describe('a word')` at `textScope.test.tsx:148`:

- **`'don't'`:** on `say 'don't' now`, `wordAt(state, 5, 1)` and a double-click at 5 both read `'don't'`, from 4 to 11.
- **The Gap:** on `students' don't`, a group left from 10 lands at 0, and on `don't 'quoted'`, a group right from 5 lands at 14.
- **The Rule's Edge:** `a'_b` reads `a`.

---

#### Section G

The rewrite is in *Scouts/Reconciled/6 — Text Pane*: the keys at *6-T24*, `ValueEditor.tsx` at *6-T36*, the pins at *6-T37*, and G-13 at *6-T35*.

**Shared Scope and Key Merge:** both stand, and G-9 ratified them. The merge lands early and the pane's flip near the end (6-T20).

**One Addition to G-10:** the pane binds `Escape` to `leave`, because CodeMirror's default otherwise spends the first press collapsing a selection **[Probed]**.

---

#### What's Settled

Each was open in a report, or surfaced here, and needs no person.

| Question | Answer | Reason |
| --- | --- | --- |
| Should a right-click enter the cell? (3, *§The Lead Question*) | No | E-1 |
| Should Chromium's word stand in place of a seat? (3, *§A Third Option*) | No | E-5 needs one rule on every surface, and 5-T6's Menu Seat doesn't fire on a held selection |
| Does a Ctrl-click's armed drag need a guard? (3-T16) | No | It self-cancels |
| Should a right-click elsewhere demote a live cell? (3-T60) | Leave it | No decision names it, and nothing writes wrongly |
| Does E-1's "no caret" forbid Bold's typing slot? (5-T31) | No, the slot stays | "As if the cell were focused" comes first, and `****` left at rest is a broken outcome. "No caret" describes a pick with nothing left to type. `cellRestingMenu.test.tsx:240`, `:257`, and `:335` hold |
| Does a word filling an item count as "a whole line" for D-5? | No. A whole line includes its marker | D-5 says a seated word acts as a caret, and `- apple`'s word would otherwise narrow where `- red apple`'s doesn't. Run in the trial |
| What does a glyph's pick act on after D-5? | Its point, or the selection touching it | It seats nothing, and 5's table shows nothing moves |
| Is the citation row's end rule a defect or a preference? (3-T32) | A defect, fixed at `citationSeatAt` | It writes into code against its own doc |
| Do resting Text and Link values count for E-4? (Fresh-Eyes 25) | No | E-4 says editor surfaces, and they answer with their row's menu |
| Do Speech and Share stay on read-only surfaces? (Fresh-Eyes 25) | No | E-4 names Copy and Select All |
| Is Copy off with nothing selected? (Fresh-Eyes 25) | Yes | `restingEditItems` already does that |
| Does the apostrophe rule hold in code? (Fresh-Eyes 26) | Yes, as today | C-3 concerns lists, and the prototype answers by position everywhere |
| Which cell was meant? (6, Question 1) | Moot | G-6 was rewritten |
| Is sharing a cell's reading rules acceptable? (Question 2) | Yes | G-6, G-9 |
| Should Enter off a list close the pane? (Question 3) | No | G-10 |
| What does Shift-Enter do on the last item? (Question 4) | A plain line | G-10 makes Enter the next line, and the pane has its own exits |
| Is a list being Pommora's alone fine? (Question 5) | Yes | G-4, G-11 |
| Is `- milk` in the field fine? (Question 6) | Yes | G-12 |
| Does the `/` menu open in the pane? (Question 7) | No | G-10 |
| Is one `…` for clipped and continued fine? (Question 8) | Yes | G-7 asks for an ellipsis, and the hover scroll tells them apart |
| How does a nested or multi-line YAML member read? | One flow line, or its own lines if it holds a break | The simplest reading of "its items' lines", and the compare keeps the file whole |
| Should the refusal be scoped to caret seats? (5-T50) | No | A condition to save a listener that fires nothing |
| Does Windows change any of this? | Nothing here depends on it | Every lever is a DOM event, and a missing Menu Seat just leaves the refusal idle |

---

#### What's Left for a Person

**One Notice, Nothing Blocking:** E-6's accepted departure is wider than the log wrote (*§The Word Rule*). The run proceeds on the prototype, and a person's word is needed only to prefer the atoms.

**Two Items for the Rewritten Drives,** since this pass couldn't launch: whether a press left of a glyph reaches a bullet's line start, and whether `::highlight()` paints `--text-selection` in a resting cell.
