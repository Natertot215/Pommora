### Scout 5 — Right-Press Probe

**DATE:** 11-05-2026
**HEAD:** `b7f2f17a5` on `active`
**EVIDENCE:** **[Observed]** is a reading from the running app, driven over CDP with `Input.dispatchMouseEvent` from a worktree build on port 9493. **[Inferred]** is reasoning no run confirmed. Selection snapshots were taken synchronously inside each listener, with capture and bubble listeners on `window`, so a late `selectionchange` can't pass for a late seat.

**Limits of the Drive:**

- **Platform:** macOS only. Windows wasn't driven, and nothing here says when it seats.
- **Native Menu:** The harness records the menu and doesn't draw it, so `mouseReleased` reaches the page after `contextmenu`, which a real menu would swallow. Nothing that fires on release is a user path here.
- **Role Rows:** A live menu's Cut, Copy, Paste, and Select All are macOS native roles, and a recorded menu never runs them. Their real order against the menu's close couldn't be driven, because a drawn menu needs real input and takes focus. *§Entering on the Press* drives both orders by hand.
- **Focus:** The window is never key; DevTools focus emulation stands in for it.
- **Clipboard:** Stubbed in main for the drive. The system clipboard read the same before and after.

---

#### Event Order

Every target ran three times on the unmodified build, and each run matched the others. `contextmenu` arrives 0.1 to 1.9 ms after `mousedown`, inside the press, well before any release **[Observed]**. "CM" is `EditorState`'s selection and "DOM" is `getSelection()`. A star marks the synthetic `selectionchange` from `keepSeatedSelection`.

##### Page Text on a Word

| Step | DOM | CM |
| --- | --- | --- |
| `pointerdown`, `mousedown` | old caret | old caret |
| `selectstart`, trusted | old caret | old caret |
| `contextmenu`, capture | **caret at the click** | old caret |
| `selectionchange*`, inside the handler | word | word |
| `contextmenu`, bubble | word | word |
| `selectionchange`, trusted, about 3 ms later | word | word |

##### The Other Targets

| Target | `selectstart` Before / After `contextmenu` | At `contextmenu` Capture | What Stands After |
| --- | --- | --- | --- |
| Blank past a line's end | 1 / 1, the second refused | DOM caret at line end, CM old | Caret at line end |
| Caret already in the word | 1 / 0 | DOM caret at click, CM old caret | Word |
| Word beside a selection | 1 / 0 | DOM caret at click, **CM still the old selection** | New word |
| List glyph | 0 / 0 | Nothing moved | Nothing moved; type menu |
| Block grip | 0 / 0 | Nothing moved | Nothing moved; grip menu |
| Resting cell, word | 0 / 0 | Nothing moved | DOM word in the cell, page CM and focus untouched |
| Resting cell, blank | 0 / 0 | Nothing moved | DOM caret at the text's end |
| Resting cell, space between words | 0 / 1, refused | Nothing moved | DOM caret at the click |
| Page space, page period | 1 / 1, refused | DOM caret at click, CM old | Caret at the click |

- **5-T1 · Two Seats, Not One [Observed]:** Chromium seats twice. The **Press Seat** is a caret at the click, the default action of `mousedown`, announced by a trusted `selectstart` before `contextmenu` is dispatched. The **Menu Seat** is a word, the default action of `contextmenu`, announced by a second trusted `selectstart` after the event's bubble and its microtasks, and before `requestAnimationFrame` and `setTimeout(0)`.
- **5-T2 · CM Lags the Press [Observed]:** At `contextmenu` the DOM already holds the Press Seat, while `view.state.selection` is still the pre-press selection, since the trusted `selectionchange` lands afterward. `routeRightClick` reads that pre-press selection as `sel`, which is why a word beside a selection routes correctly.
- **5-T3 · The Window Never Sees a Resting Bubble [Observed]:** The resting handler's `stopPropagation` keeps `contextmenu` from a `window` bubble listener.
- **5-T4 · Mac Ctrl-Click Differs [Observed]:** It reaches `contextmenu` with no `selectstart`, and CM's own left-press path has already seated `cm=9-9`, so `sel` there is the press and not the prior selection. A Ctrl-click inside a selection keeps it through `contextmenu` and collapses on the release, which is the harness's release **[Inferred: a real menu would hold it]**. Whether a Ctrl-click arms a grip's drag (3-T16) wasn't driven.

---

#### What Stops the Seat

Each row applied at the earliest listener on `window`, on page text. "App Off" also blocks the app's `contextmenu` handler, so Chromium's result shows bare.

| Applied | Press Seat | Menu Seat | Native Menu |
| --- | --- | --- | --- |
| Nothing, app off | Lands | Lands, the word | System rows |
| `preventDefault` at `mousedown`, app off | **Stopped** | **Lands, the word** | System rows |
| `preventDefault` at `selectstart`, app off | **Stopped** | **Stopped** | System rows |
| `preventDefault` at `contextmenu`, capture | Lands | **Stopped** | None |
| `preventDefault` at `contextmenu`, bubble | Lands | **Stopped** | None; the app's own seat stands |

- **5-T5 · What Stops Each [Observed]:** `mousedown`'s default stops only the Press Seat. `contextmenu`'s default stops only the Menu Seat, and takes the menu with it. `selectstart` stops whichever seat it fires for, and is the one lever that spares the menu.
- **5-T6 · The Menu Seat's Own Rule [Observed]:** It fires when the selection doesn't hold the click. A word the app seats holds it, so nothing fires on any word case. A caret doesn't, so blank space, a space, and a period all fire. Two cases sit outside that plain reading: with the app off, a caret already at the click drew no Menu Seat (3 of 3), while a caret the press itself moved there did; and a resting cell's blank space drew none with the app on, and one with the app off. **[Inferred]** A collapsed selection holds the click unless the press just placed it.
- **5-T7 · Is `keepSeatedSelection`'s Refusal What Stops It? [Observed]** Only for the Menu Seat, and only on a caret seat. Its listener installs inside `contextmenu`, after the Press Seat is done. Blocking it left word, caret-in-word, beside-a-selection, resting word, and resting blank unchanged, since nothing fired for it to refuse. On page blank space it decided the outcome: unrefused, the Menu Seat selected the line's newline (`cm=39-40`) and the menu grew from 15 to 18 rows with Speech and Share. The second `selectstart` also fires on a resting space and on page spaces and periods, where the refusal wasn't blocked and is **[Inferred]** to do the same work.
- **5-T8 · The Refusal's `setTimeout` Earns Its Place [Observed]:** The Menu Seat lands after the handler's microtasks and before `setTimeout(0)` (51.3, 51.6, and 55.1 ms in one run), so a microtask removal would come too early.
- **5-T9 · What Beats the Press Seat [Observed]:** Nothing refuses it on page text. The app's seat overwrites it inside the handler.

##### The Selection's Edges

Nothing reseats at an edge. Each case below held the selection with zero `selectstart` events, the refusal blocked or not, and Bold wrapped exactly the selection.

- **5-T10 · Page Edges [Observed]:** First character, last character, the neighbor one pixel past either end, the left quarter of the next letter and the right quarter of the previous one on a mid-word selection, and blank space past a selection that ends the line. A click on the right quarter of the next letter counted as outside: Chromium seated, and the word took over.
- **5-T11 · Resting Edges [Observed]:** A seated `apple` held through its first character, last character, and both neighbors, and a seated `pear` through blank space past it.
- **5-T12 · One Disagreement, the Other Way [Observed]:** A line selected through its newline, clicked on the empty line below: Chromium counts it inside and leaves it alone, while `reachEnd` routes it outside, seats a caret, and the refusal stops the Menu Seat. Bold there wrote `****` on the empty line.

---

#### Entering on the Press

**Baseline:** Every variant reads against today's build. The probe patch added 30 lines and removed 5 across `cellStatic.tsx`, `MarkdownTable.tsx`, `CellEditor.tsx`, and `menu.ts`, with each variant chosen at runtime, and `worktree.diff` holds it. The resting menu stays the default; this section reports what each variant does and advocates none.

| Variant | Press | After the Menu's Reply |
| --- | --- | --- |
| **Enter** | Mounts and focuses the cell | Stays live |
| **Demote** | Mounts and focuses the cell | Back to rest, focus left alone |
| **Demote + DOM Focus** | Same | Back to rest, `.focus()` on what held focus |
| **Demote + View Focus** | Same | Back to rest, the page's `view.focus()` |
| **Quiet** | Mounts, no focus | Stays live |
| **Quiet Demote** | Mounts, no focus | Back to rest, focus left alone |
| **Quiet Demote + View Focus** | Mounts, no focus | Back to rest, the page's `view.focus()` |

##### Does It Work

- **5-T13 · The Mount Lands in Time [Observed]:** 482 runs across the seven variants, and every one popped a menu. Outside the link scenes, which stay at rest by design, no `contextmenu` reached the resting path. It landed on the mounted editor every time, within 16 ms of `mousedown`, with a median near 9 ms across 201 logged runs. "Timing-dependent" (R-02) doesn't describe macOS: the press's React commit finishes before `contextmenu` is dispatched.
- **5-T14 · The Right Menu, the Right Text [Observed]:** The live cell's menu opened. Bold on a plain word, Bold off a bold word in a wrapped cell, a Lists pick, and a glyph's Numbered each acted on the right text. A word beside marks, inside bold, and inside code seated correctly, with no pick run on them. A link keeps its own menu at rest in every variant, as the patch excludes it.
- **5-T15 · Undo [Observed]:** One Cmd-Z restores the document and the page caret on Enter and both View Focus variants, across Bold, Lists, a glyph pick, and a scrolled page, and on Quiet and DOM Focus across Bold and a glyph pick. On plain Demote and Quiet Demote the pick lands but focus falls to `body`, so Cmd-Z does nothing.
- **5-T16 · Where Focus and the Page's Caret End [Observed]:** Plain Demote leaves focus on `body` after any pick, and typing lands nowhere. DOM `.focus()` restores focus but moves the page caret to 0 after a pick (5 of 5), so the next keystroke lands at the document's start. `view.focus()` restores focus and leaves the caret where it was, matching today on a pick. Quiet Demote keeps the page's focus on a dismissal, and loses it on a pick, because `applyEditorAction` focuses the cell.
- **5-T17 · Mounting Without Focus Is Reachable [Observed]:** The editor mounts and `activeElement` stays on the page through `contextmenu`. CM seats the word in its own state and writes no DOM selection, so the Menu Seat fires and the refusal stops it. Chromium doesn't pull focus in.

##### What a User Sees

- **5-T18 · Layout [Observed]:** On plain text, on a word beside marks, inside code, and in a cell with a link, no sampled frame moved the cell, the row, the table, or the first line's text. The table's wrap was never remounted. Inside bold, a focused mount reveals the `**` markers, and two things follow. A cell with no slack rewraps, growing the row from 33.1 to 57.1 px and pushing everything below the table down by 24 px until the menu closes (3 of 3 on Enter and on Demote + View Focus, the two focused variants run here), then dropping back on a demotion. A cell with slack keeps its height and moves words between lines: `soft` drops to the next line. Quiet mounts reveal nothing, so neither happens. My layout sampling read one cell's box and first text line, so a shift further into a cell shows only in the screenshots.
- **5-T19 · Flicker [Observed]:** The static cell's removal and the editor's mount carry one timestamp in both directions, which fits a single commit. Frames didn't sample for a gap between them, and screenshot bursts ran at about 50 ms, so a one-frame gap isn't ruled out.

##### Is Any Variant Indistinguishable From Today?

**No [Observed].** The two closest are Demote + View Focus and Quiet Demote + View Focus. Both match today on a word-and-Bold pick for the document, the Undo step, final focus, the page caret, and where the next keystroke lands. Everything below still differs.

| Difference | Today | Focused Variants | Quiet Variants |
| --- | --- | --- | --- |
| **5-T20 · Rows on a Word** | 10: Cut, Copy, Paste, Paste Without Formatting, Lists, Format, Speech, Share | 14: adds Undo, Redo, Select All | 11: adds those three, Cut and Copy off, Speech and Share gone |
| **5-T21 · Rows on Blank** | 7 | 11 | 11 |
| **5-T22 · Word During the Menu** | Nothing painted by default | Drawn pill and a blinking bar | Faint idle pill, no bar |
| **5-T23 · Blank During the Menu** | Nothing | Blinking bar in the cell | Nothing |
| **5-T24 · Markers Inside Bold** | Hidden | Shown, with 5-T18's movement | Hidden |
| **5-T25 · Page Caret During the Menu** | Keeps blinking | Gone until the reply | Keeps blinking |
| **5-T26 · Focus Events** | None | Page blurs and refocuses, on each right-click | None on a dismissal |
| **5-T27 · Add Strips** | Stay shown; after a pick they replay a fade-in | Fade out from the press over about 280 ms, and stay out until the pointer leaves the table | Same (one run of five came back) |
| **5-T28 · Row Grip** | Shown | Shown | Absent in some menu-state shots, not explained |
| **5-T29 · Table Rectangle** | Stays selected | Clears at the press, doesn't return | Same |
| **5-T30 · Another Live Cell** | Stays live | Closes; after a demotion nothing is live and focus is on `body` | Closes; the page takes a caret on the empty line above the table, and typing writes there |
| **5-T31 · Bold on Blank** | Enters the cell with `****`, typing fills it | Demoted: `****` stays at rest, typing goes to the page | Same |
| **5-T32 · Selection After a Dismissal** | DOM range stays on the word | Cleared | Never set |
| **5-T33 · Typing After a Dismissal** | Goes nowhere | Lands at the page caret | Lands at the page caret |
| **5-T34 · Cut** | Acts on the word | Depends on 5-T36 | Row is off |
| **5-T35 · Paste** | Acts on the word | Depends on 5-T36 | Lands at the page caret in either order |

- **5-T36 · Native Roles Against the Demotion [Observed by Hand-Ordered Calls]:** Today's rows are answered by the renderer and carry their range. A live menu's rows act on whatever holds focus when they fire. If the role fires before the menu's close, Cut and Paste land on the word. If the close fires first, the cell is already gone: Cut does nothing, and Paste writes `PASTED` at the page's caret under View Focus or nowhere under plain Demote. Which order a real menu takes wasn't driven, so this stays open.
- **5-T37 · Select All [Observed by Hand-Ordered Calls]:** `webContents.selectAll()` from a live cell selected the whole page (`cm=0-220`) and moved focus to the page. Today's menu has no such row. **[Inferred]** A live cell entered by a left click does the same; that wasn't run.
- **5-T38 · Selection Paint Depends on a Setting [Observed]:** 5-T22's "nothing painted" holds with `Use Native Highlighting` off, its default. Turned on, today's word paints in the native blue, so a user with that setting sees a highlight today and a differently styled one on the focused variants.

**Not Driven on Every Variant:** The rectangle, a blurred page, and another live cell ran under DOM Focus and not View Focus, and 5-T30's focused result reads from that run. A resting cell's Ctrl-click, checkbox, and citation never ran under any variant. Neither did a selection dragged inside a resting cell and then right-clicked, which today's menu acts on through `restingSelection`; **[Inferred]** a mount at the press drops that range, which would be one more difference.

##### What Each Would Still Remove

A count, for the planner's record. If non-link content never reached the resting path, 93 lines in `cellStatic.tsx` would have no caller: `restingMenu`, `restingAction`, `pasteAtRest`, `sideOf`, `pointAt`, and `showSource`. So would `RESTING_EDITS`, `restingEditItems`, the `resting` request field, and main's resting arms. Against that, the patch added about 25 lines of unrefined plumbing, which **[Inferred]** puts the demoting variants somewhere near −80 before any cost of matching 5-T20 to 5-T37. Matching those would add code, and some of it, such as keeping the word selected after a dismissal (5-T32), would need `showSource`'s job back. `restingSelection` and `cellOffsetAt` are called only along the resting menu's path, so they'd go too, unless a selection dragged at rest has to survive the right press.

---

#### Which Written Claims Fail

##### The Four Models (3-T59)

- **5-T39 · `gripMenu.ts:139`, Editor-Internals' Grip Entry — Holds, Incomplete [Observed]:** The Press Seat lands before `contextmenu`, and preventing `contextmenu` leaves it. Preventing it does stop the Menu Seat, which this model omits.
- **5-T40 · `pointerPath.ts:48`'s LOAD-BEARING Comment — Fails as Written [Observed]:** With the app's `mousedown` blocked on a link, the Press Seat reached the DOM, CM still held the old caret at `contextmenu`, and the link's full 10-row menu opened, in both positions tried. The comment's "the menu never appears" didn't happen. What the claim does protect is smaller: the caret ended inside the link (`cm=52-52`). Only a page link with a follow target was run.
- **5-T41 · `menu.ts:41` — Holds, Narrower Than It Reads [Observed]:** The word comes after the handler and is refusable through `selectstart`, and it applies only when the seat doesn't hold the click (5-T6).
- **5-T42 · The Links Plan's Belief — Stays Disproved [Observed]:** Defaulting the press leaves the Menu Seat, on page text and on a resting cell (`selectstart` 0 / 1, `apple` seated).

##### Guards From Scout 3

- **5-T43 · 3-T34, Edge Clicks — Fails [Observed]:** The inferred reseat at a selection's edges didn't happen in any case driven (5-T10, 5-T11). The rows and what's selected agreed each time.
- **5-T44 · 3-T40, The Refusal — Earned [Observed]:** It's reachable and it changes the outcome on caret seats (5-T7).
- **5-T45 · 3-T39, The Synthetic `selectionchange` — Still Unreached [Observed]:** Blocking it changed nothing across 10 runs, page and resting, focused and blurred. Ten more runs with the pointer moved just before the press saw no table mutation between `contextmenu` and Chromium's own event. The state it guards was never forced, so the mechanism itself stands untested.
- **5-T46 · 3-T17, `cellStatic.tsx:639` — Still Earns Its Line [Observed]:** The recorded reason is gone, and a real one remains. With the page blurred, letting the press through moved focus to the page, and CM's selection overwrote the seated word (`apple` lost, caret back at the tail). With it, focus stayed on `body` and the word held. It's also what keeps the Press Seat out of a resting cell, where it would otherwise land at the click.
- **5-T47 · 3-T12, The Seat's Purpose at Rest — Partly Fails [Observed]:** "The highlight" paints nothing on the default setting (5-T38). The seated range still feeds Speech, Share, and the next click's `restingSelection`, and the rows act on `from, to` regardless.
- **5-T48 · 3-T41, A Stale `pending` — State Reached Only by Injection [Observed]:** A `preventDefault` at the bubble parks an ask with no `context-menu` behind it, and no menu appears. No production path was driven there.
- **5-T49 · 3-T56's Option 1 "Must Prove First" — Proven, on macOS [Observed]:** `contextmenu` lands on an editor mounted during `mousedown` (5-T13). That's the mechanics alone; 5-T20 to 5-T37 are what it changes.

**Not Settled Here:** 3-T16's drag arming, 3-T60's cell surviving a right-click on page text, and everything in Scout 3's sections 4 and 5 not named above.

---

#### Insights

- **5-T50 · The Refusal Could Be Scoped by Cause [Inferred]:** It runs on every `!inside` click and only has work on a caret seat, since a word seat already holds the click.
- **5-T51 · A Resting Dismissal Swallows Typing Today [Observed]:** After a dismissed resting menu, the DOM range stays in the cell and keystrokes go nowhere, though the page reports focus (5 of 5 across two batches). It's independent of every variant here and may be a defect in its own right.
- **5-T52 · A Plain-Text Fixture Hides the Main Layout Cost [Observed]:** All 300-plus plain-text runs showed no movement. Only the marked-up pass found 5-T18, so any later drive of this gesture needs a cell with marks and no slack.
- **5-T53 · The List Types Drive's `shown` Reads a Range, Not Paint [Observed]:** `getSelection().toString()` returned `apple` while nothing was drawn, so that assertion can pass with no visible highlight.
- **5-T54 · `getComputedStyle` Can't Answer for `::selection` [Observed]:** It read transparent with the blue highlight on screen, so only a screenshot settles paint.

**Probes:** Scripts, logs, and data are in `/private/tmp/claude-501/-Users-nathantaichman-The-Studio-Projects-Project-Pommora/b9acbf3f-61e5-430d-a220-01c2bcac283a/scratchpad/press-probe/`: `part1.mjs`, `part2.mjs`, `paint.mjs`, `common.mjs`, `worktree.diff`, and the `part*.json` records. Comparisons there are `compare-zoom.png` (menu and after states), `compare-marks.png` (markers and rewrap), `compare-paint.png` (the setting), and `compare-menu.png`, with every state shot in `shots-p2/`. The before, menu, and after sets are `01`–`03-today-word-bold-*`, `19`–`21-enter-word-bold-*`, and `55`–`57-demoteRestore-word-bold-*`. The markers and rewrap are `14-enter-inside-bold-2-menu.png`, `38-quietDemoteView-inside-bold-2-menu.png`, and `35-demoteView-wrapped-strong-2-menu.png`, and the setting is `01-paint-default-menu.png` and `02-paint-native-highlight-menu.png`. Today's burst sheets hold some frames from an aborted first run, so read those by the other variants' pattern and not on their own. The titles missing from later shots come from scene order, not any variant. The worktree is removed, `~/Test` is restored, and every process I started is stopped.
